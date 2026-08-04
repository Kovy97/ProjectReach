/**
 * SIM-Agent-Toolkit — Deklarative ZIELE (Multi-Goal) für Sim-Agenten.
 *
 * Ein `SimGoal` beschreibt EIN messbares Spieler-Ziel als reines Datenobjekt; `checkGoal` liest den
 * Fortschritt direkt aus dem echten `GameState` (vorhandene Zähler, kein Event-Hooking). MEHRERE
 * Ziele gleichzeitig verfolgt `RealisticPlayer.pursue(goals, { budgetMs })` (sim-realistic.ts) —
 * dieses Modul liefert die Datentypen, die Checks und den Bericht.
 *
 * ── API (für Sweep-Agenten) ──────────────────────────────────────────────────────────────────
 *   import { combatLevel, skillLevel, gold, killMonster, completeQuest, obtainItem,
 *            reachTotalLevel, checkGoal, describeGoal, formatMultiGoalMarkdown } from "./sim-goals";
 *
 *   const goals = [combatLevel(25), skillLevel("fishing", 30), gold(10_000)];
 *   const rp = new RealisticPlayer(content, { seed: 7, style: "melee" });
 *   const res = rp.pursue(goals, { budgetMs: 12 * 60 * 60 * 1000 }); // 12 Sim-STUNDEN Spielzeit
 *   formatMultiGoalMarkdown(res)      // ✅/◐ %/❌ je Ziel — direkt in den Sweep-Bericht übernehmen
 *
 *   checkGoal(state, content, goal)   // { done, progress 0..1, detail } — Einzel-Check (read-only)
 *   describeGoal(goal)                // menschlicher Kurzname des Ziels
 *
 * ── Ziel-Arten ───────────────────────────────────────────────────────────────────────────────
 *   combatLevel(n)           Kampf-Niveau n erreichen (Formel aus dungeon.ts).
 *   skillLevel(skillId, n)   Fertigkeit auf Level n (Fortschritt XP-genau, nicht Level-grob).
 *   gold(n)                  n Gold BESITZEN (Kontostand). Latcht: einmal erreicht bleibt erreicht,
 *                            auch wenn danach Gold ausgegeben wird.
 *   killMonster(id, n)       n Lebenszeit-Kills am Monster id (state.monsterKills, monoton).
 *   completeQuest(id)        Quest id erfüllen (Status completed ODER claimed). Voll engine-seitig
 *                            treibbar: der Tick ruft evaluateQuests, der Scheduler leitet aus dem
 *                            ersten unerfüllten Objective einen Teil-Task ab und claimt erfüllte
 *                            Quests (Belohnung = Synergie für Gold-/Item-Ziele).
 *   obtainItem(id, qty)      qty Stück von id besitzen (Inventar + Lager + angelegt).
 *                            [Sweep6 T4-#6] progress zeigt UNTERWEGS auch die Trainings-Route:
 *                            XP-Fortschritt zum niedrigsten Rezept-Gate zählt anteilig (gekappt
 *                            bei 50 % — die zweite Hälfte bleibt dem Besitz), statt „◐ 0 %"
 *                            trotz aktiv laufender Route.
 *   reachTotalLevel(n)       Gesamtlevel n (Summe aller Skill-Level; Fortschritt ab der Basis
 *                            „alle Skills Level 1" gemessen, nicht ab 0).
 *
 * ── Semantik (WICHTIG für Berichte) ──────────────────────────────────────────────────────────
 *   - Ziele LATCHEN: einmal erreicht = erreicht, auch wenn der Rohwert später fällt (Gold
 *     ausgegeben, Ziel-Food gegessen). `GoalOutcome.progress` ist die Hochwassermarke und damit
 *     MONOTON steigend über den Lauf (`progressSamples` belegen das).
 *   - ALLE Zeitangaben (`simTimeMs`, `totalSimMs`) sind SPIELZEIT, KEINE Echtzeit. Die Sim läuft
 *     ~4.000–17.000× schneller als Echtzeit. Pacing-Urteile IMMER über Spielzeit-Raten treffen
 *     („Fishing 30 nach 6 h Spielzeit ist ok/zäh"), NIE über das Echtzeit-Gefühl des Sim-Laufs.
 *
 * Rein deterministisch/headless: kein RNG, kein Date.now, kein I/O — nur Lesen von State/Content
 * (einzige Ausnahme: der Scheduler in sim-realistic.ts handelt, dieses Modul misst nur).
 */
import type {
  ContentDB,
  GameState,
  ItemId,
  MonsterId,
  SkillId,
} from "@hearthforge/shared";
import { levelFromXp, xpForLevel } from "./leveling";
import { combatLevel as combatLevelOf } from "./dungeon";
import { totalLevel as totalLevelOf } from "./character";
import { itemCount } from "./inventory";
import { bankCount } from "./bank";
import { objectiveProgress, questStatus } from "./quests";
import type { SimSnapshot } from "./sim-player";
import type { FrictionEvent } from "./sim-report";

// ── Ziel-Datentyp + Fabriken ──────────────────────────────────────────────────────────────────

export type SimGoal =
  | { kind: "combatLevel"; level: number }
  | { kind: "skillLevel"; skillId: SkillId; level: number }
  | { kind: "gold"; amount: number }
  | { kind: "killMonster"; monsterId: MonsterId; count: number }
  | { kind: "completeQuest"; questId: string }
  | { kind: "obtainItem"; itemId: ItemId; qty: number }
  | { kind: "reachTotalLevel"; level: number };

export function combatLevel(level: number): SimGoal {
  return { kind: "combatLevel", level };
}
export function skillLevel(skillId: SkillId, level: number): SimGoal {
  return { kind: "skillLevel", skillId, level };
}
export function gold(amount: number): SimGoal {
  return { kind: "gold", amount };
}
export function killMonster(monsterId: MonsterId, count: number): SimGoal {
  return { kind: "killMonster", monsterId, count };
}
export function completeQuest(questId: string): SimGoal {
  return { kind: "completeQuest", questId };
}
export function obtainItem(itemId: ItemId, qty = 1): SimGoal {
  return { kind: "obtainItem", itemId, qty };
}
export function reachTotalLevel(level: number): SimGoal {
  return { kind: "reachTotalLevel", level };
}

/** Menschlicher Kurzname eines Ziels (für Berichte/Logs; ids bewusst roh, kein i18n nötig). */
export function describeGoal(goal: SimGoal): string {
  switch (goal.kind) {
    case "combatLevel":
      return `Kampf-Niveau ${goal.level} erreichen`;
    case "skillLevel":
      return `${goal.skillId} auf Level ${goal.level}`;
    case "gold":
      return `${goal.amount} Gold besitzen`;
    case "killMonster":
      return `${goal.count}× ${goal.monsterId} erlegen`;
    case "completeQuest":
      return `Quest ${goal.questId} abschließen`;
    case "obtainItem":
      return `${goal.qty}× ${goal.itemId} beschaffen`;
    case "reachTotalLevel":
      return `Gesamtlevel ${goal.level} erreichen`;
  }
}

// ── Check: done / progress / detail ───────────────────────────────────────────────────────────

export interface GoalCheck {
  done: boolean;
  /** 0..1 (roh, NICHT gelatcht — das Latching macht der Scheduler-Tracker). */
  progress: number;
  /** Menschlicher Ist-Stand für Berichte (z.B. "fishing Lv 21/30"). */
  detail: string;
}

/**
 * Anzahl von `itemId` im Besitz des Spielers: Inventar + Lager + angelegte Ausrüstungs-Slots
 * (je Slot 1). (Der frühere Köcher-Sonderfall ist mit dem Ammo-Removal #286 gestorben.)
 */
export function ownedItemCount(state: GameState, itemId: ItemId): number {
  let owned = itemCount(state.inventory, itemId) + bankCount(state, itemId);
  for (const equipped of Object.values(state.character.equipment)) {
    if (equipped === itemId) owned += 1;
  }
  return owned;
}

/** Liest Erfüllung + Fortschritt eines Ziels aus dem echten State (read-only, deterministisch). */
export function checkGoal(state: GameState, content: ContentDB, goal: SimGoal): GoalCheck {
  switch (goal.kind) {
    case "combatLevel": {
      const cl = combatLevelOf(state);
      return {
        done: cl >= goal.level,
        progress: ratio(cl, goal.level),
        detail: `Kampf-Niveau ${cl}/${goal.level}`,
      };
    }
    case "skillLevel": {
      const xp = state.skills[goal.skillId]?.xp ?? 0;
      const lvl = levelFromXp(xp);
      const done = goal.level <= 1 || lvl >= goal.level;
      // XP-genauer Fortschritt: bewegt sich mit JEDER Trainings-Einheit, nicht nur bei Level-ups.
      const need = xpForLevel(goal.level);
      return {
        done,
        progress: done ? 1 : ratio(xp, need),
        detail: `${goal.skillId} Lv ${lvl}/${goal.level}`,
      };
    }
    case "gold": {
      const have = state.character.gold;
      return {
        done: have >= goal.amount,
        progress: ratio(have, goal.amount),
        detail: `${have}/${goal.amount} Gold`,
      };
    }
    case "killMonster": {
      const kills = state.monsterKills[goal.monsterId] ?? 0;
      const known = !!content.monsters[goal.monsterId];
      return {
        done: kills >= goal.count,
        progress: ratio(kills, goal.count),
        detail: `${kills}/${goal.count} ${goal.monsterId}${known ? "" : " (unbekanntes Monster!)"}`,
      };
    }
    case "completeQuest": {
      const quest = content.quests.find((q) => q.id === goal.questId);
      if (!quest) {
        return { done: false, progress: 0, detail: `Quest ${goal.questId} existiert nicht im Content` };
      }
      const status = questStatus(state, content, quest);
      if (status === "completed" || status === "claimed") {
        return { done: true, progress: 1, detail: `Quest ${goal.questId}: ${status}` };
      }
      // Fortschritt = Mittel der Objective-Erfüllungen (Baseline-bereinigt wie im Quest-System).
      let sum = 0;
      let met = 0;
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i]!;
        const baseline = state.quests.repeatBaseline[quest.id]?.[i] ?? 0;
        const p = ratio(objectiveProgress(state, content, obj, baseline), obj.count);
        sum += p;
        if (p >= 1) met++;
      }
      const n = Math.max(1, quest.objectives.length);
      return {
        done: false,
        progress: sum / n,
        detail: `Quest ${goal.questId}: ${status}, ${met}/${quest.objectives.length} Ziele erfüllt`,
      };
    }
    case "obtainItem": {
      const owned = ownedItemCount(state, goal.itemId);
      const known = !!content.items[goal.itemId];
      const done = owned >= goal.qty;
      let progress = ratio(owned, goal.qty);
      let detail = `${owned}/${goal.qty} ${goal.itemId}${known ? "" : " (unbekanntes Item!)"}`;
      // [Sweep6 T4-#6] Unterwegs-Fortschritt der Trainings-Route: solange das NIEDRIGSTE Rezept
      // noch LEVEL-GESPERRT ist, zählt der XP-Fortschritt dorthin anteilig (× OBTAIN_ROUTE_SHARE,
      // Besitz bleibt die zweite Hälfte) — vorher stand ein Ziel mit aktiv laufender Route
      // („runecrafting trainieren für rune_arcane_ii") im Bericht bei „◐ 0 %" und las sich
      // fälschlich wie eine Wall. Freigeschaltete Rezepte brauchen den Proxy nicht (dort bewegt
      // sich der Besitz selbst, sobald gecraftet wird).
      if (!done) {
        const route = craftRoute(state, content, goal.itemId);
        if (route && route.level < route.need && route.progress * OBTAIN_ROUTE_SHARE > progress) {
          progress = route.progress * OBTAIN_ROUTE_SHARE;
          detail += ` · Route: ${route.skill} Lv ${route.level}/${route.need}`;
        }
      }
      return { done, progress, detail };
    }
    case "reachTotalLevel": {
      const tl = totalLevelOf(state, content);
      // Basis = alle Skills auf 1 (frischer Held) — sonst startet jeder Lauf bei geschenkten ~20 %.
      const base = Object.keys(content.skills).length;
      const done = tl >= goal.level;
      return {
        done,
        progress: done ? 1 : goal.level <= base ? 1 : ratio(tl - base, goal.level - base),
        detail: `Gesamtlevel ${tl}/${goal.level}`,
      };
    }
  }
}

/** [Sweep6 T4-#6] Anteil der Trainings-Route am obtainItem-progress (Besitz = die andere Hälfte). */
const OBTAIN_ROUTE_SHARE = 0.5;

/**
 * [Sweep6 T4-#6] Herstell-Route eines Items: die am NIEDRIGSTEN gegatete Aktion, die es lootet
 * (freigeschaltet oder nicht), plus der XP-genaue Fortschritt des Herstell-Skills Richtung
 * Rezept-Level (1 = Rezept frei). null, wenn keine Aktion das Item ausgibt (reines Drop-/Shop-Gut).
 */
function craftRoute(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): { skill: string; level: number; need: number; progress: number } | null {
  let best: { skill: string; need: number } | null = null;
  for (const a of Object.values(content.actions)) {
    if (!a.loot.some((l) => l.itemId === itemId)) continue;
    const need = a.levelRequired ?? 1;
    if (!best || need < best.need) best = { skill: a.skill, need };
  }
  if (!best) return null;
  const xp = state.skills[best.skill]?.xp ?? 0;
  return {
    skill: best.skill,
    level: levelFromXp(xp),
    need: best.need,
    progress: Math.max(0, Math.min(1, ratio(xp, xpForLevel(best.need)))),
  };
}

/**
 * Monotoner FORTSCHRITTS-PROXY eines Ziels für die Blockade-Erkennung des Schedulers: steigt,
 * sobald ECHTE Arbeit Richtung Ziel passiert — auch wenn der grobe `progress` (z.B. Kampf-Niveau,
 * nur bei Level-ups) sich noch nicht bewegt. Ohne Proxy würde der Scheduler langsame, aber
 * gesunde Ziele fälschlich als „Wall" rotieren.
 */
export function goalProxy(state: GameState, content: ContentDB, goal: SimGoal): number {
  const xp = (id: string): number => state.skills[id]?.xp ?? 0;
  switch (goal.kind) {
    case "combatLevel":
      // Alle Skills, die in die Kampf-Niveau-Formel (dungeon.ts) einfließen.
      return xp("attack") + xp("power") + xp("defence") + xp("vitality") + xp("ranged") + xp("magic");
    case "skillLevel":
      return xp(goal.skillId);
    case "gold":
      // Lebenszeit-EINNAHMEN (Kontostand + je ausgegebenes Gold) — Ausgaben maskieren keinen Fortschritt.
      return state.character.gold + state.stats.goldSpent;
    case "killMonster":
      return state.monsterKills[goal.monsterId] ?? 0;
    case "completeQuest": {
      const quest = content.quests.find((q) => q.id === goal.questId);
      if (!quest) return 0;
      if (state.quests.claimed.includes(quest.id) || state.quests.completed.includes(quest.id)) return Number.MAX_SAFE_INTEGER;
      let sum = 0;
      for (let i = 0; i < quest.objectives.length; i++) {
        const baseline = state.quests.repeatBaseline[quest.id]?.[i] ?? 0;
        sum += objectiveProgress(state, content, quest.objectives[i]!, baseline);
      }
      return sum;
    }
    case "obtainItem": {
      // Besitz dominiert (×1e9). Dahinter zählen ZWISCHENSCHRITTE als echte Arbeit Richtung Ziel:
      // XP der Herstell-Skills (auch wenn das Rezept noch level-gegatet ist — [Sweep5 T6] „Skill
      // Richtung Rezept-Level trainieren" ist eine gültige Route) und der Objective-Fortschritt
      // un-geclaimter Quests, die das Item als Belohnung vergeben. Ohne diese Terme rotiert der
      // Scheduler eine gesunde Trainings-/Quest-Route fälschlich als „Wall".
      let proxy = ownedItemCount(state, goal.itemId) * 1e9;
      const countedSkills = new Set<string>();
      for (const a of Object.values(content.actions)) {
        if (countedSkills.has(a.skill)) continue;
        if (!a.loot.some((l) => l.itemId === goal.itemId)) continue;
        countedSkills.add(a.skill);
        proxy += state.skills[a.skill]?.xp ?? 0;
      }
      // [Sweep6 T2-F1] PLUS beschaffte Zwischen-Materialien der Rezept-Kette, je Input GEDECKELT
      // auf qty×3 (die ensureInputs-Schwelle): Knochen jagen/Kohle holen IST Fortschritt Richtung
      // Klinge — und ein 32k-Erz-Berg ÜBER der Schwelle ist keiner mehr (der tote Ore-Grind wird
      // für die Stall-Buchhaltung sichtbar, statt den Lauf „fälschlich sauber" zu halten).
      proxy += chainInputProgress(state, content, goal.itemId, new Set([goal.itemId]));
      for (const q of content.quests) {
        if (state.quests.claimed.includes(q.id)) continue;
        if (!q.rewards.items?.some((it) => it.id === goal.itemId)) continue;
        for (let i = 0; i < q.objectives.length; i++) {
          const baseline = state.quests.repeatBaseline[q.id]?.[i] ?? 0;
          proxy += objectiveProgress(state, content, q.objectives[i]!, baseline);
        }
      }
      return proxy;
    }
    case "reachTotalLevel": {
      let sum = 0;
      for (const id of Object.keys(content.skills)) sum += xp(id);
      return sum;
    }
  }
}

/**
 * [Sweep6 T2-F1] Beschaffungs-Fortschritt der REZEPT-KETTE eines Items: über alle Aktionen, die
 * `itemId` looten, zählt jeder Input mit `min(Bestand, qty×3)` (Inventar + Lager; Deckel =
 * ensureInputs-Schwelle) — rekursiv auch die Inputs der Zwischenprodukte (Erz/Kohle hinter dem
 * Barren). Der Deckel macht Horten ÜBER den Bedarf hinaus unsichtbar: genau so unterscheidet der
 * Stall-Detektor „Kohle holen" (Fortschritt) von „32k Erz stapeln" (Stillstand).
 */
function chainInputProgress(state: GameState, content: ContentDB, itemId: ItemId, seen: Set<ItemId>): number {
  let sum = 0;
  for (const a of Object.values(content.actions)) {
    if (!a.inputs || a.inputs.length === 0) continue;
    if (!a.loot.some((l) => l.itemId === itemId)) continue;
    for (const inp of a.inputs) {
      if (seen.has(inp.itemId)) continue;
      seen.add(inp.itemId);
      const have = itemCount(state.inventory, inp.itemId) + bankCount(state, inp.itemId);
      sum += Math.min(have, inp.qty * 3);
      sum += chainInputProgress(state, content, inp.itemId, seen);
    }
  }
  return sum;
}

// ── Multi-Goal-Ergebnis + Bericht ─────────────────────────────────────────────────────────────

/** Ergebnis EINES Ziels nach einem `pursue`-Lauf. */
export interface GoalOutcome {
  goal: SimGoal;
  /** describeGoal(goal) — für Berichte. */
  description: string;
  achieved: boolean;
  /** 0..1 — Hochwassermarke (monoton; achieved ⇒ 1). */
  progress: number;
  /**
   * SPIELZEIT in ms relativ zum pursue-Start: Zeitpunkt des Erreichens (achieved) bzw. die
   * gesamte verfolgte Laufzeit (nicht erreicht). KEINE Echtzeit — siehe Header-Regel.
   */
  simTimeMs: number;
  /** Strukturell blockiert (kein gangbarer Weg / Wall) — der Scheduler hat rotiert statt zu klemmen. */
  blocked: boolean;
  /** Warum blockiert/aufgegeben (für Berichte; nur bei blocked/nicht erreicht aussagekräftig). */
  note?: string;
  /** Letzter Ist-Stand (checkGoal-detail) — das „warum ◐" für den Bericht. */
  detail: string;
  /** Fortschritts-Stichproben (Hochwassermarke) nach jedem aktiven Fenster/Idle-Chunk — monoton. */
  progressSamples: number[];
}

/** Gesamtergebnis eines `RealisticPlayer.pursue`-Laufs. */
export interface MultiGoalResult {
  name: string;
  goals: GoalOutcome[];
  /** Verbrauchte SPIELZEIT dieses Laufs in ms (endet früher, wenn alle Ziele erreicht sind). */
  totalSimMs: number;
  allAchieved: boolean;
  frictions: FrictionEvent[];
  snapshot: SimSnapshot;
  /** Chronologisches Entscheidungs-Protokoll (deterministisch, für Debug/Bericht). */
  log: string[];
}

/** Formatiert SPIELZEIT-ms menschenlesbar ("2 h 10 min" / "45 min"). */
export function formatSimDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/**
 * Multi-Goal-Bericht als Markdown — pro Ziel Status ✅ (erreicht) / ◐ % (unterwegs) / ❌ (blockiert)
 * plus WARUM. Sweep-Agenten übernehmen den Block direkt in ihre Berichte. Alle Zeiten = SPIELZEIT.
 */
export function formatMultiGoalMarkdown(result: MultiGoalResult, title?: string): string {
  const out: string[] = [];
  const achieved = result.goals.filter((g) => g.achieved).length;
  out.push(`# ${title ?? `Multi-Goal-Report — ${result.name}`}`);
  out.push("");
  out.push(
    `**Spielzeit:** ${formatSimDuration(result.totalSimMs)} · **Ziele:** ${achieved}/${result.goals.length} erreicht · **Frictions:** ${result.frictions.length}`,
  );
  out.push("");
  out.push("| Ziel | Status | Stand | Spielzeit |");
  out.push("| --- | --- | --- | --- |");
  for (const g of result.goals) {
    const status = g.achieved ? "✅" : g.blocked ? "❌ blockiert" : `◐ ${Math.round(g.progress * 100)} %`;
    const when = g.achieved ? formatSimDuration(g.simTimeMs) : "—";
    out.push(`| ${g.description} | ${status} | ${g.detail} | ${when} |`);
  }
  const open = result.goals.filter((g) => !g.achieved);
  if (open.length > 0) {
    out.push("");
    out.push("**Nicht erreicht — warum:**");
    for (const g of open) {
      const why = g.blocked ? (g.note ?? "kein gangbarer Weg") : (g.note ?? `bei ${g.detail} nach ${formatSimDuration(g.simTimeMs)} Spielzeit`);
      out.push(`- ${g.blocked ? "❌" : `◐ ${Math.round(g.progress * 100)} %`} ${g.description}: ${why}`);
    }
  }
  out.push("");
  out.push(
    "> Hinweis: Alle Zeitangaben sind SPIELZEIT (die Sim läuft ~4.000–17.000× Echtzeit). Pacing-Urteile über Spielzeit-Raten treffen, nie über das Echtzeit-Gefühl des Laufs.",
  );
  return out.join("\n").trimEnd();
}

// ── Kleinkram ─────────────────────────────────────────────────────────────────────────────────

function ratio(have: number, need: number): number {
  if (!Number.isFinite(need) || need <= 0) return 1;
  if (!Number.isFinite(have)) return 0;
  return Math.max(0, Math.min(1, have / need));
}
