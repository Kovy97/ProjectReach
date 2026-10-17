import type { ActionId, ContentDB, GameState, ItemId } from "@hearthforge/shared";
import {
  syncBankOrder, effectiveBankCapacity, CAMP_SKILL_SPEED_KIND, CAMP_SPEED_CUT_CAP, DEFAULT_CRAFT_SUFFIX_CHANCE, DEFAULT_STUN_MS, OUT_OF_COMBAT_HP_REGEN_PCT, TICK_MS, actionSuccessChance, masteryDoubleChance, masteryPreserveChance, masterySpeedMult, thievingRiskMods } from "@hearthforge/shared";

const OUT_OF_COMBAT_WARD_REGEN_PCT = 0.05;
import type { ActionDef } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { advanceActionQueue, setQueueSkip, onQueuedDungeonCleared, requeueDungeonFront, requeueFightFront } from "./actions";
import { nextFloat, nextInt } from "./rng";
import { blessingMult, setShrineChanceBonus, shrineAmplifiedMult } from "./blessing";
import { computeStats, syncProgression } from "./character";
import { masteryPoolBonus } from "./mastery";
import { combatStep, killCreditMonsterId, stopCombat, tickPlayerRegen } from "./combat";
import { tickEliteSpawns } from "./elites";
import { buffGatherXpMult, buffGatherYieldBonus, tickBuffs } from "./consumable";
import { campBoostCached, campShrineBonus, tickCampCrew } from "./camp";
import { tickCampRefine } from "./refine";
import { checkAchievements } from "./achievements";
import { itemCount, removeItem } from "./inventory";
import { grantLoot } from "./mail";
import { bestToolSpeed } from "./tools";
import { bankCount } from "./bank";
import { evaluateQuests } from "./quests";
import { tickFarmPlots } from "./farming";
import { tickHuntTraps, type HuntCatchTally } from "./hunting";
import { tryCraftSuffix } from "./suffix";
import { markActionDropSeen } from "./drops";
import {
  petBonusFind,
  petCraftSuffixBonus,
  petDoubleYieldBonus,
  petInstantActionChance,
  petPrepSpeed,
  petPreserveBonus,
  petThievingBonus,
  petThievingStunMult,
  petTierUp,
  petTierUpTarget,
  rollPetBonusFind,
  tryPetDrop,
} from "./pets";
import {
  checkMasteryCapes,
  masterAlwaysSucceeds,
  masterDoubleYieldBonus,
  masterPreserveBonus,
  masterStunReduction,
  masterSuccessBonus,
} from "./capes";

/**
 * Prüft, ob alle Eingangsmaterialien einer Verarbeitungs-Aktion vorhanden sind — gezählt werden
 * Inventar UND Bank (Chef: Crafting darf Materialien aus der Bank ziehen).
 */
function hasInputs(state: GameState, action: ActionDef): boolean {
  if (!action.inputs) return true;
  for (const input of action.inputs) {
    if (itemCount(state.inventory, input.itemId) + bankCount(state, input.itemId) < input.qty) {
      return false;
    }
  }
  return true;
}

/**
 * Verbraucht `qty` eines Inputs: ZUERST aus dem Inventar, der Rest aus der Bank. So muss man Erze/
 * Barren vor dem Schmieden nicht erst manuell abheben (Chef-Wunsch „wichtig"). Inventar-Priorität,
 * damit lose Stacks zuerst aufgebraucht werden.
 */
function consumeInput(state: GameState, itemId: ItemId, qty: number): void {
  const fromInv = Math.min(qty, itemCount(state.inventory, itemId));
  if (fromInv > 0) removeItem(state.inventory, itemId, fromInv);
  const rest = qty - fromInv;
  if (rest > 0) {
    const inBank = state.bank[itemId] ?? 0;
    const take = Math.min(rest, inBank);
    if (take > 0) {
      state.bank[itemId] = inBank - take;
      if (state.bank[itemId]! <= 0) delete state.bank[itemId];
    }
  }
}

// canHoldAnywhere/canHoldOutputs (der frühere `inventory_full`-Vorab-Check): ENTFERNT mit dem
// Postfach/Mailbox-System (SAVE_VERSION 71). Loot kann jetzt nirgends mehr „verloren gehen" — was
// weder ins Inventar noch (bei Auto-Bank) ins Lager passt, fängt `grantLoot` im Überlauf-Postfach
// auf. Damit ist der Ertrag beim Crafting auch bei vollem Inventar/Lager sicher untergebracht
// (kein stiller Material-Verlust mehr) und die Aktion muss nicht stoppen — der `inventory_full`-Stopp
// entfällt komplett (nur `no_materials` bleibt Abbruchgrund fürs Skilling).

function completeAction(state: GameState, content: ContentDB, action: ActionDef, nowMs?: number): void {
  // Skillweite Mastery-Pool-Boni (Checkpoint-System). Bei frischem State exakt 0 (Pool < 5 % =
  // 1. Checkpoint, s. MASTERY_POOL_CHECKPOINTS), daher keine zusätzlichen nextFloat-Würfe →
  // Determinismus bleibt bit-identisch.
  const pb = masteryPoolBonus(state, content, action.skill);

  if (action.inputs) {
    // Mastery-Preservation: Chance, die Materialien NICHT zu verbrauchen (Melvor-artig).
    // nextFloat wird nur gezogen, wenn die Chance > 0 ist (Mastery ≥ Lvl 2) → Determinismus
    // bei frischem State bleibt erhalten.
    // Meisterweihe (masterPerk `inputSaver`, capes.ts): der 5-%-Input-Sparer der Handwerks-Capes —
    // ADDITIV zum Pet-Passiv (Präzedenz petPreserveBonus) und zur Mastery-/Pool-Schiene. 0 ohne
    // ausgerüsteten Träger → der Preserve-nextFloat fällt weiterhin nur bei Chance > 0 (bit-identisch).
    const preserveChance =
      masteryPreserveChance(levelFromXp(state.mastery[action.id]?.xp ?? 0))
      + pb.preserve
      + petPreserveBonus(state, content, action.skill)
      + masterPreserveBonus(state, content, action.skill);
    const preserved = preserveChance > 0 && nextFloat(state.rng) <= preserveChance;
    if (!preserved) {
      for (const input of action.inputs) consumeInput(state, input.itemId, input.qty);
    }
  }

  // Thieving-Risiko-Modus (careful/bold): wirkt NUR auf Thieving-Aktionen. Modifiziert
  // Erfolgschance (successBonus), Betäubungsdauer (stunMult) und Erfolgsbelohnung (rewardMult).
  // Für alle anderen Skills neutral (1× Belohnung, kein Bonus) → RNG-Sequenz unverändert.
  const risk = action.skill === "thieving" ? thievingRiskMods(state.thievingRisk) : null;
  const rewardMult = risk?.rewardMult ?? 1;

  // Erfolgs-/Fehlschlag-Mechanik (z.B. Thieving). Ohne successBase ist die Chance 1.
  if (action.successBase !== undefined) {
    const level = levelFromXp(state.skills[action.skill]?.xp ?? 0);
    // Pet (thievingSuccess, ≤3 %): additiver Bonus auf die Erfolgschance (Cap 0.95 bleibt).
    // Risiko-Modus: careful +5 Pp (sicherer), bold −5 Pp (riskanter), additiv on top.
    // Meisterweihe (masterPerk `successBoost`, capes.ts): +3-Pp-Erfolgs-Bonus des Shadowgrasp-
    // Capes — ADDITIV zum Pet-Passiv (Präzedenz petThievingBonus); der 0.95-Cap bleibt bindend.
    const successBonus =
      petThievingBonus(state, content, action.skill)
      + (risk?.successBonus ?? 0)
      + masterSuccessBonus(state, content, action.skill);
    // Meisterweihe (masterPerk `alwaysSucceed`, capes.ts — die Soulchef-Hommage): Aktionen des
    // Perk-Skills misslingen NIE (Chance exakt 1, bewusst am 0.95-Cap von actionSuccessChance
    // vorbei). Der Erfolgs-nextFloat wird TROTZDEM gezogen (nextFloat < 1 immer ⇒ nie Fehlschlag)
    // → die RNG-Sequenz bleibt mit/ohne Cape gleich lang (Determinismus-Disziplin, Muster rewardMult).
    const successChance = masterAlwaysSucceeds(state, content, action.skill)
      ? 1
      : actionSuccessChance(action, level, successBonus);
    if (nextFloat(state.rng) > successChance) {
      // Fehlschlag: keine XP/kein Loot/kein Gold, Spieler wird betäubt. careful kürzt, bold verlängert.
      // Meisterweihe (masterPerk `stunReduction`, capes.ts): −20 % Betäubung des Shadowgrasp-Capes —
      // multiplikativ auf die risiko-modifizierte Stun-Dauer. Faktor exakt 1 ohne Träger (das
      // bestehende Math.round bleibt die einzige Rundung → Alt-Verhalten bit-identisch).
      // claude:2026-10-18T02:00:00+02:00 — Düsterratte „Leise Pfoten" (thievingFinesse): Betäubung × stunMult
      // (Echo: × 0.875). Exakt 1 ohne passenden Begleiter ⇒ bit-identisch.
      state.stunMs = Math.round(
        (action.stunMs ?? DEFAULT_STUN_MS)
          * (risk?.stunMult ?? 1)
          * (1 - masterStunReduction(state, content, action.skill))
          * petThievingStunMult(state, content, action.skill),
      );
      return;
    }
  }

  // Taverne (SAVE 84, taverne-spec-technik.md §2): jeder ERFOLGREICH abgeschlossene Durchlauf zählt —
  // Baseline-Zähler der "run"-Aufgaben (Pims Griffe). Steht NACH dem Erfolgs-Wurf (ein Thieving-
  // Fehlschlag zählt nicht) und VOR jeder Belohnung. Online == offline (derselbe Pfad). Kein RNG.
  // Defensiv gegen handgebaute Alt-States ohne das v84-Feld.
  (state.stats.actionRunsById ??= {})[action.id] = (state.stats.actionRunsById[action.id] ?? 0) + 1;

  const skill = (state.skills[action.skill] ??= { xp: 0 });
  // Skilling-Buffs (Sammel-Tonika, `gatherXpMult`): aktive Buffs multiplizieren die Skill-XP
  // (z.B. 1.10 = +10 %). Ohne aktiven Buff ist der Faktor 1 → bit-identisch zu vorher
  // (keine zusätzlichen RNG-Würfe). Wirkt nur auf Skill-XP, nicht auf Mastery.
  // `rewardMult` (Thieving-Risiko) skaliert die Skill-XP des Erfolgs (bold mehr, careful weniger).
  // Für Nicht-Thieving ist rewardMult exakt 1 → bit-identisch zu vorher.
  // Pet-XP-Multiplikator ENTFERNT (#276): Pets dürfen keine XP-Wirkung mehr haben (Chef-Verbot).
  // Blessings of the Reach ("mistvigil", §xp): +% XP an JEDER Skilling-XP-Vergabe. `blessingMult`
  // liefert 1 ohne `nowMs` (alle Alt-Aufrufer/Tests/Sim-Läufe bleiben bit-identisch).
  // Schrein der Stillen (Task #359): verstärkt den Bonus-Anteil des mistvigil-XP-Segens
  // (1.10 → 1.13 bei Stufe III). Ohne Schrein/ohne aktiven XP-Segen exakt der Alt-Wert.
  skill.xp +=
    action.xp
    * buffGatherXpMult(state, content)
    * rewardMult
    * shrineAmplifiedMult(blessingMult(nowMs, "xp"), campShrineBonus(state, content));

  // Sammel-Aktionen (Mining/Woodcutting/Fishing/Foraging-Adern) haben KEINE `inputs` → für sie hat
  // die Preservation-Achse nichts zu sparen: der oben stehende `if (action.inputs)`-Zweig läuft nie,
  // und der 50 %-Pool-Checkpoint (`{preserve:0.05}`) wäre eine tote Belohnung (Sweep 4, 02-mining/
  // 07-foraging/15-mastery — ~¼ des Mastery-Reward-Raums lief für 4 Skills leer). FIX: Für input-lose
  // Sammel-Aktionen wird der SKILLWEITE Pool-Preserve-Anteil auf einen wirksamen Doppelertrag umgewidmet
  // (Melvor-artiger Ersatznutzen), sodass der 50 %-Checkpoint auch beim Sammeln spürbar ist. Bewusst NUR
  // der Pool-Preserve (nicht die per-Aktion-Preserve bis 40 %) → minimal-invasiv, keine Verzerrung der
  // gemessenen monotonen Ertragskurven. Verarbeitungs-Skills (mit inputs) bleiben unverändert: dort
  // bleibt `pb.preserve` reine Material-Ersparnis und dieser Term ist 0.
  // Determinismus: greift erst ab 50 % Pool; dort ist `pb.double` bereits ≥ 0.03 (5 %-Checkpoint) → der
  // Doppelertrag-nextFloat wurde ohnehin schon gezogen. Dieser Term ändert nur die Schwelle, NIE die
  // Anzahl der RNG-Würfe → bit-identisch bei frischem State und für Verarbeitungs-Skills.
  const gatherPoolPreserveAsDouble = action.inputs ? 0 : pb.preserve;

  // Mastery: Langzeit-Progression je Aktion. Chance auf doppelten Ertrag steigt mit dem Level.
  // Das Level VOR diesem Abschluss bestimmt den Bonus dieses Abschlusses.
  // Pet (Zwei-Effekt-Modell): die Skill-Effekt-Familien doubleDrop/gatherYield/
  // flawlessGem/bonusRunes (über petDoubleYieldBonus aggregiert; bonusAmmo ist seit #286 No-op)
  // UND instantAction erhöhen additiv die Doppelertrag-Chance (alle ≤5 %, additiv neben Mastery/Pool).
  // Skilling-Buffs (`gatherYieldMult`): aktive Ertrag-Tonika erhöhen die Doppelertrag-Chance
  // additiv (analog Mastery/Pool/Pet). Ohne solchen Buff ist der Beitrag 0 → die RNG-Sequenz
  // bleibt bit-identisch (der Doppelertrag-nextFloat wird weiterhin nur bei bonusChance > 0 gezogen).
  // Meisterweihe (masterPerk `doubleYield`, capes.ts): der +5-%-Doppelertrag der Sammler-Capes —
  // ADDITIV zum Pet-Passiv (Präzedenz petDoubleYieldBonus) und allen übrigen Quellen dieser Kette.
  // 0 ohne ausgerüsteten Träger → Anzahl der RNG-Würfe unverändert (bit-identisch).
  const bonusChance =
    masteryDoubleChance(levelFromXp(state.mastery[action.id]?.xp ?? 0))
    + pb.double
    + petDoubleYieldBonus(state, content, action.skill)
    + petInstantActionChance(state, content, action.skill)
    + buffGatherYieldBonus(state, content)
    + masterDoubleYieldBonus(state, content, action.skill)
    + gatherPoolPreserveAsDouble;
  const mastery = (state.mastery[action.id] ??= { xp: 0 });
  mastery.xp += action.xp;

  if (action.gold) {
    // Gold-Beute zuerst würfeln (RNG-stabil), dann mit dem Risiko-Multiplikator skalieren.
    // Blessings of the Reach ("greed", §gold): +% an JEDER Gold-Vergabe — reine Arithmetik auf dem
    // bereits gewürfelten Betrag, kein zusätzlicher RNG-Draw (Determinismus/offline==online).
    // Schrein der Stillen (Task #359): verstärkt den Bonus-Anteil des greed-Gold-Segens
    // (1.20 → 1.26 bei Stufe III) — reine Arithmetik auf dem bereits gewürfelten Betrag.
    state.character.gold += Math.round(
      nextInt(state.rng, action.gold.min, action.gold.max)
        * rewardMult
        * shrineAmplifiedMult(blessingMult(nowMs, "gold"), campShrineBonus(state, content)),
    );
  }

  // Eine Aktion mit Materialien (`inputs`) ist Crafting/Verarbeitung (Smithing/Forge/Fletching/…).
  // Ihr Output zählt zusätzlich als „geschmiedet" → speist craft_items-Quests. Gather-Aktionen
  // (mine/chop, ohne inputs) zählen nur als itemsGathered.
  const isCraft = !!action.inputs && action.inputs.length > 0;

  // Blessings of the Reach ("rotmist", §rareDrop): +% auf die Drop-CHANCE selbst — angewandt auf den
  // Vergleichswert, NICHT als zusätzlicher RNG-Draw (derselbe nextFloat entscheidet weiterhin genau
  // EINEN Wurf je Roll → Determinismus/offline==online unberührt). Gecappt auf 1 (Garantie-Drops
  // bleiben Garantie-Drops).
  // Schrein der Stillen (Task #359): verstärkt den Bonus-Anteil des rotmist-Segens (1.10 → 1.13).
  // Die bestehende Cap-auf-1-Klemme unten bleibt die Garantie-Drop-Sicherung.
  const rareDropMult = shrineAmplifiedMult(
    blessingMult(nowMs, "rareDrop"),
    campShrineBonus(state, content),
  );
  // Blessings of the Reach ("ashenstorm", §gather): war ursprünglich ein MENGEN-Bonus, aber bei den
  // üblichen 1er-Drops (z.B. cut_normal_tree = 1 Log) ist `round(1·1.15)=1` unsichtbar (Chef-Fix
  // 2026-07-21). Jetzt ein TEMPO-Bonus auf Sammel-Aktionen (mehr Abschlüsse/Zeit statt mehr Menge/
  // Abschluss) — s. `effectiveActionDurationMs` unten. Hier bleibt daher NUR noch rareDrop übrig.

  // claude:2026-10-18T02:00:00+02:00 — Begleiter-Stufensprung `tierUp` (1.3.0): gilt nur dem Haupt-Output (loot[0]).
  // Der Wurf fällt VOR dem Doppelertrag-Wurf und NUR, wenn ein Begleiter wirkt UND ein freigeschaltetes
  // Ziel existiert (pet-lose States und oberste Stufen ziehen keinen RNG). Doppelertrag verdoppelt danach
  // das ersetzte Item.
  const tierUp = petTierUp(state, content, action.skill);
  const skillLevelNow = tierUp ? levelFromXp(state.skills[action.skill]?.xp ?? 0) : 0;
  let isMainRoll = true;
  for (const roll of action.loot) {
    const mainRoll = isMainRoll;
    isMainRoll = false;
    if (nextFloat(state.rng) <= Math.min(1, roll.chance * rareDropMult)) {
      let qty = nextInt(state.rng, roll.min, roll.max);
      let itemId = roll.itemId;
      if (mainRoll && tierUp) {
        const target = petTierUpTarget(content, action.skill, tierUp.ladder, itemId, skillLevelNow);
        if (target && nextFloat(state.rng) < tierUp.chance) itemId = target;
      }
      if (bonusChance > 0 && nextFloat(state.rng) <= bonusChance) qty *= 2; // Mastery-Doppelertrag
      // Thieving-Risiko skaliert die Beute-Menge; nie unter 1, wenn der Roll überhaupt traf.
      if (rewardMult !== 1) qty = Math.max(1, Math.round(qty * rewardMult));
      // Suffix-Roll (Phase 2, WoW-Stil Random Rolls): jeder Crafting-Equipment-Output ist scharf-
      // geschaltet. Chance-Priorität: `LootRoll.suffixChance` › `ActionDef.suffixChance` ›
      // globaler `DEFAULT_CRAFT_SUFFIX_CHANCE` (spec §5, ~20 %). `tryCraftSuffix` zieht ZUERST keinen
      // RNG, wenn kein Suffix möglich ist (kein content.suffixes / Output ist kein Equipment / kein
      // passender Pool) → Gather-/Nicht-Equipment-Crafts bleiben RNG-bit-identisch. Fällt ein Suffix,
      // wird EIN Exemplar zur Instanz (über intakeInstance ins Inventar, Auto-Salvage-fähig) → es
      // zählt nicht zusätzlich als Stack.
      let instanceMade = 0;
      let suffixChance = roll.suffixChance ?? action.suffixChance ?? DEFAULT_CRAFT_SUFFIX_CHANCE;
      // claude:2026-10-18T02:00:00+02:00 — Schlackenscheusal „Glutsegen" (craftSuffixChance): +Pp auf eine bereits
      // scharfe Suffix-Chance (> 0), Deckel 1. Ändert nur die Schwelle, nie die Zahl der Würfe.
      if (isCraft && suffixChance > 0) {
        const petSuffix = petCraftSuffixBonus(state, content, action.skill);
        if (petSuffix > 0) suffixChance = Math.min(1, suffixChance + petSuffix);
      }
      if (isCraft && qty > 0 && suffixChance > 0) {
        const ilvl = levelFromXp(state.skills[action.skill]?.xp ?? 0);
        const res = tryCraftSuffix(state, content, itemId, ilvl, suffixChance);
        if (res) {
          qty -= 1;
          instanceMade = 1;
        }
      }
      // Überlauf-Pfad (SAVE 71): grantLoot legt in Inventar → (Auto-Bank) Lager → Postfach ab —
      // NICHTS geht verloren, die Aktion muss nicht stoppen. Da grantLoot die gesamte `qty` unterbringt,
      // ist der Zugewinn genau `qty` (+ eine ggf. erzeugte Suffix-Instanz).
      grantLoot(state, content, itemId, qty);
      const gained = qty + instanceMade;
      // Aktions-Collection-Log: jeden tatsächlich erhaltenen Drop als entdeckt markieren (Spiegel
      // des Monster-Kill-Pfads). Für ALLE Aktionen aufzeichnen — die „???"-Maskierung ist reine
      // UI-Sache (später foraging-spezifisch). Idempotent; verbraucht kein RNG.
      // claude:2026-10-18T02:00:00+02:00 — ein Stufensprung-Fund gehört nicht in die Drop-Liste DIESER Aktion.
      if (gained > 0 && itemId === roll.itemId) markActionDropSeen(state, action.id, roll.itemId);
      state.stats.itemsGathered += gained;
      // Taverne (SAVE 84): jedes frisch ERZEUGTE Stück je Item-ID — Baseline-Zähler der "produce"-
      // Aufgaben (neben itemsGathered, das auch Loot/Belohnungen zählt). Kein RNG, online == offline.
      if (gained > 0) {
        (state.stats.producedById ??= {})[itemId] = (state.stats.producedById[itemId] ?? 0) + gained;
      }
      if (isCraft && gained > 0) {
        state.stats.itemsCrafted += gained;
        state.stats.craftedById[itemId] = (state.stats.craftedById[itemId] ?? 0) + gained;
      }
    }
  }

  // Pet-Drop-Wurf (unabhängig vom normalen Loot, KEIN Pity). NACH allen Loot-/Mastery-
  // Würfen platziert. `tryPetDrop` zieht NUR dann einen nextFloat, wenn für diesen Skill
  // ein noch nicht besessenes Pet existiert → für Content ohne passendes Pet bleibt die
  // RNG-Sequenz bit-identisch (bestehende Determinismus-Fixtures unberührt).
  tryPetDrop(state, content, { kind: "skill", skill: action.skill });

  // claude:2026-10-18T02:00:00+02:00 — Begleiter-Fund `bonusFind` (1.3.0, Faulrinde „Wurzelgespür", Felsschlund
  // „Ader-Witterung"): ans ENDE der Wurf-Reihenfolge gehängt. RNG nur, wenn ein Begleiter wirkt UND der
  // Fund-Pool für diese Aktion nicht leer ist ⇒ pet-lose States bleiben bit-identisch. Menge 1, über den
  // Überlauf-Pfad (grantLoot) — nichts geht verloren.
  const find = petBonusFind(state, content, action);
  if (find) {
    const found = rollPetBonusFind(state, find);
    if (found) {
      grantLoot(state, content, found, 1);
      state.stats.itemsGathered += 1;
      (state.stats.producedById ??= {})[found] = (state.stats.producedById[found] ?? 0) + 1;
    }
  }
}

/**
 * Lager-Tempo-Faktor einer Aktion (Das Lager, Task #359 — encampment-balance.md §3): der zum Skill
 * gehörende Gebäude-Boost als DAUER-Multiplikator `1 − Anteil`. `CAMP_SKILL_SPEED_KIND` ist die
 * EINE Zuordnung Skill → boostKind; Kampf-Skills und `slayer` haben dort BEWUSST keinen Eintrag
 * (Eiserne Regel 3: Kampf unberührt) ⇒ dieser Faktor ist für sie strukturell exakt 1.
 *
 * Klemme `CAMP_SPEED_CUT_CAP` (0.15) hält den B2-Boden 0.60 aus balance.md §3 ein, auch wenn der
 * Katalog je fehlerhaft mehr liefern sollte. Gelesen über `campBoostCached` (memo auf
 * `camp.buildSeq`) — diese Funktion läuft PRO TICK je laufender Aktion.
 *
 * OHNE gebautes Lager exakt 1 (campBoost 0) ⇒ Sim-/Determinismus-Fixtures bit-identisch.
 */
function campSpeedMult(state: GameState, content: ContentDB, action: ActionDef): number {
  const kind = CAMP_SKILL_SPEED_KIND[action.skill];
  if (!kind) return 1;
  const cut = campBoostCached(state, content, kind);
  if (!(cut > 0)) return 1; // exakt 1 (kein 1-0-Ausdruck) → keine Float-Drift ohne Lager
  return 1 - Math.min(CAMP_SPEED_CUT_CAP, cut);
}

/**
 * Effektive Dauer einer Aktion in ms: Basis × bestes Werkzeug × Aktions-Mastery × Mastery-Pool
 * × Lager (jeder Faktor < 1 = schneller) ÷ Segen. EINE Quelle der Wahrheit — die Engine schließt
 * die Aktion hierbei ab UND die UI-Fortschrittsleiste teilt hierdurch. Sonst resettet die Bar vor
 * 100 %, sobald ein Speed-Bonus aktiv ist (sie teilte fälschlich durch die Basis-`durationMs`).
 * Mindestens 1 ms.
 */
export function effectiveActionDurationMs(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  nowMs?: number,
): number {
  const masterySpeed = masterySpeedMult(levelFromXp(state.mastery[action.id]?.xp ?? 0));
  const poolSpeed = 1 - masteryPoolBonus(state, content, action.skill).speed;
  // Blessings of the Reach (Chef-Fix 2026-07-21): BEIDE Segens-Arten wirken jetzt als Tempo-Divisor,
  // je nach Aktionstyp — Verarbeitung (`action.inputs` vorhanden, Muster `isCraft`) bekommt
  // "silence"/§craftSpeed, Sammel-Aktionen (kein `inputs`) bekommen "ashenstorm"/§gather. `gather`
  // war ursprünglich ein Mengen-Bonus auf den Loot-Wurf (completeAction) — bei den üblichen 1er-Drops
  // (z.B. cut_normal_tree = 1 Log) war `round(1·1.15)=1` unsichtbar. Als Tempo-Bonus wirkt er IMMER
  // (mehr Abschlüsse/Zeit → mehr Ertrag), unabhängig von der gewürfelten Menge. Ohne `nowMs` (Alt-
  // Aufrufer/UI/Tests) ist der Faktor 1 → bit-identisch zum Vorher-Zustand. Wird JEDEN Tick frisch
  // neu bestimmt (skillingStep ruft diese Funktion pro Tick auf, wie Mastery/Werkzeug auch) — ein
  // Segenswechsel zur lokalen Mitternacht greift also SOFORT im nächsten Tick, kein Einfrieren der
  // beim Aktionsstart geltenden Dauer (wichtig für offline==online über eine Tagesgrenze hinweg).
  const isCraft = !!action.inputs && action.inputs.length > 0;
  // Schrein der Stillen (Task #359): verstärkt den BONUS-Anteil des Tempo-Segens (1.15 → 1.195 bei
  // Stufe III). Nicht-Kampf-Callsite ⇒ erlaubt (wildhunt ist ein Kampf-Segen und kommt hier nie an:
  // `blessingMult` liefert für "gather"/"craftSpeed" an einem wildhunt-Tag 1, und
  // `shrineAmplifiedMult` lässt Basis 1 unverändert). Ohne Schrein exakt der Alt-Wert.
  const speedMult = shrineAmplifiedMult(
    isCraft ? blessingMult(nowMs, "craftSpeed") : blessingMult(nowMs, "gather"),
    campShrineBonus(state, content),
  );
  // claude:2026-10-18T02:00:00+02:00 — Schindling „Gerberhand" (prepSpeed, 1.3.0): Vorstufen-Aktionen (Haupt-Output
  // = Material) laufen schneller. Exakt 1 ohne passenden Begleiter ⇒ bit-identisch.
  const prepCut = petPrepSpeed(state, content, action);
  const prepMult = prepCut > 0 ? 1 - prepCut : 1;
  return Math.max(
    1,
    Math.round(
      (action.durationMs *
        bestToolSpeed(state, content, action.skill) *
        masterySpeed *
        poolSpeed *
        campSpeedMult(state, content, action) *
        prepMult) /
        speedMult,
    ),
  );
}

/**
 * Rückt die Simulation um genau einen festen Tick (TICK_MS) vor.
 * `offline` = true beim Offline-Catch-up (Laden): dann zählt zwar `elapsedMs` (Sim-/Farming-Uhr)
 * weiter, aber NICHT `activePlayMs` (angezeigte Spielzeit) — Offline-Zeit ist keine Spielzeit.
 */
export function step(state: GameState, content: ContentDB, offline = false, nowMs?: number): void {
  state.totalTicks++;
  state.elapsedMs += TICK_MS;
  // Aktive Spielzeit nur im Live-Loop (nicht offline) mitzählen.
  if (!offline) state.activePlayMs += TICK_MS;

  // Aktive Buffs PRO TICK ablaufen lassen (+ Auto-Rebuff abgelaufener Tonika, s. tickBuffs).
  // Bewusst hier statt einmal pro advance: so laufen Buffs im Offline-Catch-up und im Live-Loop
  // bit-identisch ab (Determinismus offline==online) und der Rebuff greift im Kampf UND beim
  // Skilling im selben Tick, in dem der Buff ausläuft (keine Wirkungslücke). Kein RNG.
  tickBuffs(state, content, TICK_MS);

  // Lager-Bautrupp (Encampment, SAVE 76): der EINE Bau-Auftrag zählt PRO TICK herunter — bewusst
  // VOR dem Kampf-Zweig und ohne `offline`-Guard: der Bautrupp arbeitet weiter, egal ob der Held
  // kämpft, betäubt ist oder offline war (Offline-Catch-up läuft über denselben Pfad ⇒
  // offline==online bit-identisch). Rein arithmetisch, KEIN RNG — alle bestehenden
  // Determinismus-Fixtures bleiben bit-identisch (ohne Bau-Auftrag ein No-op).
  // Seit SAVE_VERSION 81 laeuft nach einem Abschluss der naechste GEPLANTE Bau an
  // (Bauwarteschlange, Spieler-Report 1.0.2) — deshalb tickCampCrew statt tickCampBuild.
  // Ebenfalls rein deterministisch: der Start bucht Kosten und setzt remainingMs, kein RNG.
  tickCampCrew(state, content);

  // Schrein der Stillen — CHANCE-Segen (Task #359): der einzige `blessingChance`-Konsument ist der
  // Kill-Pfad in combat.ts (Sperrzone dieses Tasks). Statt dessen Signatur anzufassen, setzt der
  // Tick den Verstärkungs-Anteil deterministisch aus (state, content) — HIER, also nach
  // `tickCampBuild` (ein in DIESEM Tick fertiggestellter Schrein wirkt sofort) und VOR dem
  // Kampf-Zweig unten. Reine Funktion des getickten States: kein I/O, kein RNG, offline==online.
  // Ohne gebauten Schrein exakt 0 ⇒ combat.ts sieht die unveränderte Basis-Chance.
  setShrineChanceBonus(campShrineBonus(state, content));

  // Elite-/World-Spawns (design/elite-spawns-concept.md, SAVE 72): der Zonen-Zyklus tickt NUR bei
  // aktivem Spiel (`!offline`) — der Offline-Catch-up ist für dieses Feature ein kompletter No-op
  // (Konzept §1.3, Chef-Entscheid „Online-/Aktiv-Feature"). Läuft VOR dem Kampf-/Skilling-Zweig
  // unten, damit die Zonen-Rotation auch während eines laufenden (Nicht-Elite-)Kampfs weiterläuft.
  // Zieht ausschließlich `state.eliteRng` — NIE `state.rng` (Determinismus-/offline==online-Gesetz
  // für die normale Skilling-/Kampf-Sequenz bleibt dadurch beim De-/Aktivieren des Features unberührt).
  // `nowMs` durchgereicht (Blessings of the Reach „Jagd-Paket" S1, s. advance()) — treibt AUSSCHLIESSLICH
  // die wildhunt-Cooldown-Beschleunigung (elites.ts `tickEliteSpawns`); ohne `nowMs` neutral.
  if (!offline) tickEliteSpawns(state, content, nowMs);

  // Kampf hat Vorrang und schließt Sammeln aus (combatStep regeneriert selbst via tickPlayerRegen).
  // `nowMs` (Blessings of the Reach, s. advance()) durchgereicht — combatStep leitet daraus die
  // aktive Segens-Art für Kampf-XP/-Gold/-Loot/-Angriffstempo dieses TICKS ab.
  if (state.combat.monsterId !== null) {
    // Kampf-Queue (Task #312) — Fremd-Kampf-Erkennung: läuft ein Queue-Kampf-Eintrag, aber der
    // Spieler kämpft inzwischen etwas ANDERES (manueller startCombat/Dungeon-Welle/Elite mit
    // anderem Monster) → Eintrag mit Rest-Ziel zurück an die Queue-Front (nichts wird still
    // übersprungen), die Zählung endet. Reines Feld-Shuffling, kein RNG.
    if (state.queueFight !== null && state.combat.monsterId !== state.queueFight.monsterId) {
      requeueFightFront(state);
    }
    // Dungeon-Queue (SAVE 83) — dieselbe Fremd-Erkennung: läuft ein Queue-Dungeon-Lauf, aber der
    // Spieler kämpft inzwischen etwas ANDERES (manueller startCombat/anderer Dungeon/Elite/Turm)
    // → Rest-Läufe zurück an die Queue-Front, der angefangene Lauf zählt nicht. Kein RNG.
    if (state.queueDungeon !== null && state.combat.dungeonId !== state.queueDungeon.dungeonId) {
      requeueDungeonFront(state);
    }
    // Kill-Zählung des Queue-Kampfs über den KILL-CREDIT-Zähler (Chef-GO #312: nur Kills des
    // Ziel-Monsters; `monsterKills` wird für dg_-Dungeon-Varianten auf die BASIS-Id geschrieben —
    // killCreditMonsterId ist die EINE Quelle dieser Semantik): Delta vor/nach combatStep = Kills
    // dieses Ticks. Reine Lesezugriffe — die RNG-Sequenz von combatStep bleibt unberührt.
    const fight = state.queueFight;
    const creditId = fight !== null ? killCreditMonsterId(content, fight.monsterId) : null;
    const killsBefore = creditId !== null ? (state.monsterKills[creditId] ?? 0) : 0;
    // Lauf-Zählung des Queue-Dungeon-Laufs (SAVE 83) über den CLEAR-Zähler: `dungeonsCleared[id]`
    // steigt genau beim Endboss-Kill (grantDungeonRewards) — Delta vor/nach combatStep = Clears
    // dieses Ticks (0 oder 1). Tod/Patt/Flucht erhöhen den Zähler nie → zählen nie.
    const run = state.queueDungeon;
    const clearsBefore = run !== null ? (state.dungeonsCleared[run.dungeonId] ?? 0) : 0;
    combatStep(state, content, nowMs);
    if (fight !== null && state.queueFight === fight && creditId !== null) {
      const delta = (state.monsterKills[creditId] ?? 0) - killsBefore;
      if (delta > 0 && fight.remaining !== null) {
        fight.remaining -= delta;
        if (fight.remaining <= 0) {
          // Kill-Ziel erreicht → Kampf SAUBER beenden (stopCombat: räumt Kampf-Zeiger, erhält den
          // Kill-Cooldown-Vertrag — der Rest-Cooldown wandert in den nächsten Kampfstart). Die
          // Queue schaltet direkt unten weiter (auch auf Nicht-Kampf-Einträge). Kein RNG.
          state.queueFight = null;
          if (state.combat.monsterId !== null) stopCombat(state);
        }
      }
    }
    if (run !== null && state.queueDungeon === run) {
      const clears = (state.dungeonsCleared[run.dungeonId] ?? 0) - clearsBefore;
      // Endboss gefallen (endDungeon hat den Kampf bereits geräumt): Lauf zählen und — solange das
      // Ziel nicht erreicht ist — im SELBEN Tick von vorn (Welle 1) starten; Ziel erreicht ⇒
      // Laufzeit leer, die Queue schaltet unten regulär weiter. Chef-Auftrag 26.08.2026: „nach dem
      // Endboss wieder von neu anfangen". Kein RNG (actions.ts onQueuedDungeonCleared).
      if (clears > 0) onQueuedDungeonCleared(state, content, clears);
    }
    // Endete der Kampf in DIESEM Tick (monsterId jetzt null)?
    if (state.combat.monsterId === null) {
      const reason = state.combat.stopReason;
      // Chef 29.08.2026 („20 Eber, Tod beim fünften: die Queue soll zum nächsten Eintrag springen"):
      // Tod/Patt überspringt den laufenden Eintrag — sein Rest verfällt, `lastQueueSkip` meldet es
      // dem Queue-Panel, und die Queue schaltet unten regulär auf den nächsten Eintrag (online wie
      // offline). Damit ist Chef-GO #312 („Tod pausiert die Queue") aufgehoben; `queuePaused`
      // bleibt als manuelle Pause (resumeActionQueue/enqueue*) und für Alt-Saves bestehen.
      const skipReason = reason === "defeated" ? "defeated" : reason === "stalemate" ? "stalemate" : null;
      if (state.queueFight !== null) {
        if (skipReason !== null) {
          setQueueSkip(state, { monsterId: state.queueFight.monsterId, reason: skipReason });
          state.queueFight = null;
        } else {
          // Kampf endete OHNE Fail-stopReason und ohne erreichtes Ziel (z.B. ein Elite-Kampf
          // desselben Monsters endet nach dem Kill ohne Respawn): Eintrag mit Rest-Ziel zurück an
          // die Front, er startet im nächsten Leerlauf-Tick regulär erneut.
          requeueFightFront(state);
        }
      } else if (state.queueDungeon !== null) {
        if (skipReason !== null) {
          // Dungeon-Lauf endete durch Tod/Patt (ein Clear hätte oben sofort neu gestartet oder die
          // Laufzeit geleert): der abgebrochene Lauf zählt nicht, die Rest-Läufe verfallen.
          setQueueSkip(state, {
            monsterId: "",
            dungeonId: state.queueDungeon.dungeonId,
            reason: skipReason === "defeated" ? "dungeon_defeated" : "dungeon_stalemate",
          });
          state.queueDungeon = null;
        } else {
          requeueDungeonFront(state);
        }
      }
      // Queue-Weiterschaltung (Action-Queue §4): es läuft keine Aktion, die Queue wartet und ist
      // nicht pausiert → nächsten Eintrag starten (Kampf → Kampf UND Kampf → Sammeln), damit der
      // Held nahtlos weitermacht. RNG-frei; No-op bei leerer Queue → Kampf-Determinismus-Fixtures
      // bleiben bit-identisch. Der neue Fortschritt beginnt ab dem nächsten Tick bei 0.
      if (
        !state.queuePaused &&
        state.activeActionId === null &&
        Array.isArray(state.actionQueue) &&
        state.actionQueue.length > 0
      ) {
        advanceActionQueue(state, content);
      }
    }
    return;
  }

  skillingStep(state, content, nowMs);

  // Mana-/HP-Regeneration außerhalb des Kampfes — PRO TICK mit den Stats DIESES Ticks
  // (Sweep6 T7-F2): vorher lief der Regen 1× pro advance NACH der Tick-Schleife mit den
  // END-Stats; ein im Offline-Fenster ablaufender Regen-Buff (z.B. emberroot_tonic) brachte
  // dann 0 Heilung für seine gesamte Restlaufzeit (offline ≠ online). Jetzt teilen Kampf- und
  // Idle-Tick dieselbe Funktion → Offline-Catch-up und Live-Chunks sind bit-identisch.
  // Kampf-Queue (Task #312): skillingStep kann jetzt selbst einen KAMPF starten (Queue-Eintrag
  // kind "fight" nach Aktions-Ende/Leerlauf) — dann gehört der Rest dieses Ticks bereits dem
  // Kampf-Regime (combatStep regelt Regen ab dem nächsten Tick selbst), der Idle-Regen unten
  // entfällt. Für alle bestehenden Pfade (kein Kampfstart im Skilling-Tick) unverändert.
  if (state.combat.monsterId !== null) return;
  const stats = computeStats(state, content);
  tickPlayerRegen(state, stats);
  // Natürliche HP-Regeneration NUR außerhalb des Kampfes (Chef 2026-07-13): 1 % Max-HP/s —
  // nach dem Kampf füllt sich der Held von selbst auf. Der Kampf-Entscheid vom 2026-07-02
  // (keine natürliche Regen IM Kampf) bleibt unberührt: combatStep ruft nur tickPlayerRegen,
  // dieser Block liegt ausschließlich im Idle-Pfad. Deterministisch, kein RNG.
  if (state.character.hp < stats.maxHp) {
    state.character.hp = Math.min(
      stats.maxHp,
      state.character.hp + stats.maxHp * OUT_OF_COMBAT_HP_REGEN_PCT * (TICK_MS / 1000),
    );
  }
  // Chef 28.08.2026 ("Warum startet mein Ward-Pool immer bei 0?"): Ward regenerierte ausserhalb des Kampfes gar nicht
  // (im Kampf nur ueber den Abwehr-Skill), blieb also nach dem letzten Kampf auf dem Restwert stehen. Jetzt fuellt
  // er sich im Leerlauf wie das Leben von selbst auf, nur schneller (5 % des Maximums je Sekunde, voll nach 20 s).
  if (Number.isFinite(stats.maxWard) && state.character.ward < stats.maxWard) {
    state.character.ward = Math.min(
      stats.maxWard,
      state.character.ward + stats.maxWard * OUT_OF_COMBAT_WARD_REGEN_PCT * (TICK_MS / 1000),
    );
  }
}

/**
 * Endpunkt einer aktiven Aktion, der die Action-Queue KONSUMIEREN darf (Ziel erreicht ODER kein
 * Material mehr): versucht, den nächsten Queue-Eintrag zu starten (advanceActionQueue).
 *  • Läuft eine neue Aktion an → true. Der Fortschritt ist genullt (setActiveAction), die neue
 *    Aktion beginnt ab dem NÄCHSTEN Tick bei 0 — kein Rest-Progress wird übertragen (einfachste
 *    korrekte, deterministische Lösung: Offline-Catch-up == Live-Loop bit-identisch).
 *  • Queue leer/erschöpft → false: die Aktion wird regulär beendet (activeActionId = null,
 *    actionTarget = null). `stopReason` gesetzt ⇒ `lastStop`-Breadcrumb (no_materials); bei
 *    sauberem Ziel-Abschluss (`stopReason === null`) KEIN Hinweis (planmäßig fertig, Muster
 *    actionTarget).
 */
function endActionOrAdvanceQueue(
  state: GameState,
  content: ContentDB,
  finishedActionId: ActionId,
  stopReason: "no_materials" | null,
): boolean {
  state.actionProgressMs = 0;
  // advanceActionQueue setzt bei Erfolg über setActiveAction bereits progress=0 UND lastStop=null.
  if (advanceActionQueue(state, content)) return true;
  state.activeActionId = null;
  state.actionTarget = null;
  state.lastStop = stopReason === null ? null : { actionId: finishedActionId, reason: stopReason };
  return false;
}

/** Sammel-/Verarbeitungs-Anteil eines Ticks (kein Kampf): Stun, Aktions-Fortschritt, Abschlüsse. */
function skillingStep(state: GameState, content: ContentDB, nowMs?: number): void {
  // Betäubung (z.B. nach Thieving-Fehlschlag) läuft ab und pausiert die Aktion.
  if (state.stunMs > 0) {
    state.stunMs = Math.max(0, state.stunMs - TICK_MS);
    return;
  }

  const actionId = state.activeActionId;
  if (actionId === null) {
    // Kampf-Queue (Task #312) — Manual-Stop-Konsum: steht hier (Leerlauf, KEIN Kampf — sonst wäre
    // step() im Kampf-Zweig geblieben) noch ein `queueFight`, hat der Spieler den Queue-Kampf
    // MANUELL gestoppt (stopCombat zwischen zwei Ticks). Der Eintrag gilt damit als BEENDET —
    // ∞-Einträge (`remaining` null) enden GENAU so (Chef-GO: „läuft bis manueller Stopp"), ein
    // endliches Rest-Ziel verfällt bewusst mit (expliziter Spieler-Stopp ist kein stilles
    // Überspringen). Die Queue läuft ohne Pause mit dem nächsten Eintrag weiter.
    if (state.queueFight !== null) state.queueFight = null;
    // Dungeon-Queue (SAVE 83) — dieselbe Flucht-Semantik: manueller stopCombat mitten im Queue-
    // Dungeon-Lauf ⇒ der Eintrag gilt als beendet (∞ endet genau so, ein endlicher Rest verfällt
    // bewusst — expliziter Spieler-Stopp), die Queue läuft ohne Pause mit dem nächsten Eintrag.
    if (state.queueDungeon !== null) state.queueDungeon = null;
    // Leerlauf: den nächsten Queue-Eintrag anlaufen lassen (sofern nicht Tod/Patt-pausiert, #312).
    // Seit die UI-Aktions-Karten nur noch enqueuen (4er-Grid [1×][25×][50×][∞], kein direktes
    // setActiveAction mehr), ist das der EINZIGE Weg, wie der erste eingereihte Eintrag aus dem
    // Stillstand startet. advanceActionQueue setzt activeActionId + progress 0 (bzw. startet den
    // Queue-Kampf); es geht ab dem nächsten Tick weiter (deterministisch, Offline == Live-Loop).
    if (!state.queuePaused && state.actionQueue.length > 0) advanceActionQueue(state, content);
    return;
  }

  const action = content.actions[actionId];
  if (!action) return;

  // Verarbeitung ohne Materialien → Aktion endet. Die Action-Queue darf hier weiterschalten: ein
  // no_materials-Stop zählt als natürlicher Abschluss (s. QueuedAction). Startet ein Queue-Eintrag,
  // läuft die Sim ab dem nächsten Tick mit ihm weiter (kein Komplett-Stopp).
  if (!hasInputs(state, action)) {
    endActionOrAdvanceQueue(state, content, actionId, "no_materials");
    return;
  }

  // Kein `inventory_full`-Vorab-Stopp mehr (SAVE 71): Überlauf fängt das Postfach auf (grantLoot),
  // die Sammel-/Craft-Aktion läuft weiter. Die Action-Queue hält damit hier nicht mehr an (gewollt).

  // Effektive Dauer (Werkzeug × Aktions-Mastery × Mastery-Pool) — gemeinsame Quelle mit der UI-Leiste.
  const dur = effectiveActionDurationMs(state, content, action, nowMs);

  state.actionProgressMs += TICK_MS;
  // while statt if: bei sehr kurzen Aktionen können pro Tick mehrere fertig werden.
  while (state.actionProgressMs >= dur) {
    state.actionProgressMs -= dur;
    if (!hasInputs(state, action)) {
      // Kein Material mehr → Queue weiterschalten (oder sauber beenden). Bei Anlauf einer neuen
      // Aktion endet dieser Tick; sie startet ab dem nächsten Tick bei Fortschritt 0.
      endActionOrAdvanceQueue(state, content, actionId, "no_materials");
      return;
    }
    // Kein `inventory_full`-Stopp mehr (SAVE 71): Überlauf → Postfach (grantLoot), die Aktion läuft weiter.
    completeAction(state, content, action, nowMs);
    // Mengen-Craft-Ziel (1/5/10): jeder abgeschlossene Durchlauf zählt herunter. Erreicht das Ziel 0,
    // ist die Aktion PLANMÄSSIG fertig → Queue weiterschalten (oder sauber beenden, KEIN lastStop —
    // es ist kein Abbruch). `null` = unbegrenzt → Schleife läuft wie bisher bis Material/Platz leer.
    if (state.actionTarget !== null) {
      state.actionTarget -= 1;
      if (state.actionTarget <= 0) {
        endActionOrAdvanceQueue(state, content, actionId, null);
        return;
      }
    }
  }
}

/**
 * Rückt die Simulation um `dtMs` vor – mit fester Schrittweite (Akkumulator).
 * Dieselbe Funktion treibt Live-Loop UND Offline-Fortschritt an.
 * `opts.offline` (Default false) markiert den Offline-Catch-up beim Laden: die Ticks laufen identisch,
 * aber `activePlayMs` wird NICHT hochgezählt (Offline-Zeit ist keine aktive Spielzeit). Der Live-Loop
 * (kleine dt pro Frame) ruft ohne Flag → `offline:false`.
 *
 * `opts.nowMs` (Blessings of the Reach, 2026-07-21): das reale Kalender-„jetzt" (Epoch-ms) am ENDE
 * dieses advance()-Fensters — der Live-Loop übergibt `Date.now()` des aktuellen Frames, der Offline-
 * Catch-up (persistence deserialize) übergibt sein bereits vorhandenes `now`. Daraus wird der
 * Fenster-START `nowMs - dtMs` abgeleitet; JEDER ausgeführte Tick rückt diesen Anker um genau
 * TICK_MS vor, bevor er an `step()` gereicht wird — ein einzelner großer Offline-Sprung (bis zu
 * MAX_OFFLINE_MS) bekommt so pro Tick den korrekt fortschreitenden Zeitstempel und segmentiert
 * automatisch an einer evtl. dazwischenliegenden lokalen Mitternacht (statt EINEN Segens-Wert fürs
 * gesamte Fenster zu verwenden). Reine Arithmetik, kein RNG-Draw, kein `Date.now()`/I/O INNERHALB
 * der Engine (Determinismus-Regel) — der Zeitpunkt kommt immer als expliziter Parameter herein.
 * OHNE `opts.nowMs` (alle bestehenden Aufrufer: Tests, Sim-Läufe, UI vor dem ui-dev-Wiring) bleibt
 * `wallClockMs` `undefined` → `blessingMult` liefert überall 1 → bit-identisch zum Vorher-Zustand.
 * Gibt die Anzahl ausgeführter Ticks zurück.
 */
export function advance(
  state: GameState,
  content: ContentDB,
  dtMs: number,
  opts: { offline?: boolean; nowMs?: number; huntTally?: HuntCatchTally } = {},
): number {
  const offline = opts.offline ?? false;
  // Nicht-endliches/nicht-positives dt wie ein No-op behandeln: ein NaN würde `accumulatorMs`
  // dauerhaft vergiften (jeder folgende `advance` wäre tot), negatives dt würde die Uhr
  // rückwärts drehen (spiegelt SimPlayer.advanceTime).
  if (!Number.isFinite(dtMs) || dtMs <= 0) return 0;
  state.accumulatorMs += dtMs;
  let wallClockMs = opts.nowMs !== undefined ? opts.nowMs - dtMs : undefined;
  let steps = 0;
  while (state.accumulatorMs >= TICK_MS) {
    state.accumulatorMs -= TICK_MS;
    if (wallClockMs !== undefined) wallClockMs += TICK_MS;
    step(state, content, offline, wallClockMs);
    // Offline-Veredelung (Schmelzofen/Räucherhaus, Task #359 — encampment-balance.md §4): PRO TICK,
    // direkt NACH step() — die Anlage sieht also den Bestand inkl. des Skilling-/Kampf-Ertrags
    // DIESES Ticks, exakt wie der bisherige Live-Loop (1 advance ≈ 1 Tick). Bewusst NICHT mehr
    // einmal pro advance mit dem Gesamtfenster (Stand bis Task #335): die Akkumulator-Arithmetik
    // ist zwar chunk-invariant, solange Input/Platz KONSTANT sind — entsteht der Input aber erst
    // IM Fenster (z.B. Bergbau ab 0 Erz bei aufgeladenem accMs), verrechnete der Catch-up das
    // ganze Fenster gegen den END-Bestand, während der Live-Loop die Aufladung beim ERSTEN Erz
    // verbrauchte → `camp.refine[*].accMs` lief auseinander (Audit-Befund 334x-1, Guard
    // camp-audit-334x.test.ts Test 3). Per Tick sehen beide Pfade dieselbe Abfolge ⇒
    // offline==online bit-identisch. KEIN RNG, KEIN XP; ohne Rezept-Slot ein sofortiger No-op.
    tickCampRefine(state, content, TICK_MS);
    steps++;
  }
  if (steps > 0) {
    // Passive Farming-Plots reifen gegen die Sim-Uhr — EINMAL pro advance (nicht pro Tick), nach
    // dem Step-Loop. Vor syncProgression/Quests/Achievements, damit frische Farming-XP + Ernten in
    // DERSELBEN advance-Runde ins Gesamtlevel und in die Zähler einfließen. Zieht RNG nur, wenn
    // tatsächlich geerntet wird → ohne Crop-Katalog/ohne reife Plots bit-identisch zu vorher.
    // Fensterlänge mitgeben (#p12, SAVE_VERSION 82): ein leeres Beet mit geplanter Folgesorte
    // wird zum FENSTERBEGINN eingesät, sobald Saat da ist — der einzige Zeitpunkt, den Live-Loop
    // und Offline-Catch-up gleich sehen (offline == online). Ohne Plan wirkungslos.
    tickFarmPlots(state, content, steps * TICK_MS);

    // Jagen (1.2.0, SAVE 85, spec-technik §3): Fallen ticken direkt NACH den Beeten, ebenfalls EINMAL
    // pro advance gegen das Fenster (offline == online, Rest-Übertrag in der Falle). Zieht RNG nur,
    // wenn eine gestellte Falle wirklich wirft; ohne `content.huntingZones`/ohne gestellte Fallen ein
    // No-op → bestehende RNG-Sequenzen bleiben bit-identisch. `huntTally` (optional) sammelt die
    // Fänge je Monster dieses Fensters für die OfflineSummary (persistence deserialize).
    tickHuntTraps(state, content, steps * TICK_MS, opts.huntTally);

    // Offline-Veredelung: tickt seit Task #335 PRO TICK in der Schleife oben (nach step()) —
    // nicht mehr einmal pro advance. Ihr Output fließt weiterhin VOR syncProgression/Quests/
    // Achievements in dieselbe advance-Runde ein.

    // Gesamtlevel kann sich nur durch XP-Gewinn ändern → einmal pro advance prüfen.
    syncProgression(state, content);

    // Meisterweihe (Level-99-Belohnung, capes.ts): EIN Chokepoint hinter ALLEN XP-Quellen —
    // Skilling, Combat, Slayer, Farming und Quest-Rewards laufen alle durch advance. Vermerkt
    // frische Weihen (Level ≥ 99, einmalig) und verleiht das Cape-Item, sobald es im Content
    // existiert (Nachreich-Pfad grantPendingCapes). Zieht KEIN RNG; ohne frischen 99er / ohne
    // Cape-Content ein reiner No-op → Determinismus-Fixtures bleiben bit-identisch. Läuft VOR
    // checkAchievements/evaluateQuests, damit ein frisch verliehenes Cape in DERSELBEN Runde in
    // Entdeckung/Zähler einfließt.
    checkMasteryCapes(state, content);

    // Mana-/HP-Regeneration läuft NICHT mehr hier: sie tickt in `step` (Idle) bzw. combatStep
    // (Kampf) PRO TICK über tickPlayerRegen — Sweep6 T7-F2 (der frühere 1×-pro-advance-Pfad mit
    // END-Stats unterschlug die Heilung von Buffs, die im Offline-Fenster abliefen).

    // Bank-Platzierung nachziehen (SAVE 87). `bank.ts` ruft das beim Ein-/Auslagern selbst, aber
    // mehrere andere Pfade schreiben DIREKT in `state.bank` — Auto-Einlagern bei vollem Inventar
    // (`addItemOrBank`), der Lager-Verbrauch, die Meisterweihe. Ein so entstandenes Item haette
    // sonst kein Fach und waere im neuen Fach-Raster der Bankseite unsichtbar, obwohl es da ist.
    // Selbstheilend und idempotent; hier am selben Choke-Point wie die Erfolge, also einmal pro
    // advance-Runde statt pro Tick.
    syncBankOrder(state, effectiveBankCapacity(state, content)); // claude:2026-10-17T21:00:00+02:00

    // Meilensteine prüfen (Gesamtlevel, Kills, gesammelte Items, Gold).
    checkAchievements(state, content);

    // Quests gegen die State-Zähler auswerten → erfüllte als claimbar markieren (günstig, lesend).
    evaluateQuests(state, content);
  }
  return steps;
}
