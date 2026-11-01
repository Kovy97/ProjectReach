import type { ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { openWorkCrate } from "./orders"; // claude:2026-10-24T23:45:00+02:00
import { consumableHeal } from "@hearthforge/shared";
import { computeStats } from "./character";
import { itemCount, removeItem } from "./inventory";
import { stockCount, takeFromBank } from "./bank"; // claude:2026-10-31T16:08:21+01:00 — Auto-Trank/Auto-Essen aus der Bank (1.4.2)
import { masterBuffDurationMult } from "./capes";
import { consumeBlocked, isHealPotion, noteConsumeCooldown } from "./consume-gate";
import { petFoodHealMult } from "./pets";
import { rerollTask } from "./slayer";
import { openBlackMarketCrate } from "./tavern";

/**
 * Aufladen von Dauer-Tonika (Chef 27.08.2026, Spieler-Feedback „Sammler-Tonikum hält nur 5 Minuten, erneutes
 * Trinken setzt nur zurück“): dasselbe Item ADDIERT seine Dauer auf die Restzeit statt sie zu ersetzen —
 * zehn Tonika auf einmal = 50 Minuten. Deckel je Buff, damit ein versehentlicher Stapel-Klick nicht den ganzen
 * Vorrat schluckt (Übernacht-Bedarf deckt der Auto-Rebuff). Ein ANDERES Item derselben Kategorie verdrängt
 * weiterhin (Exklusiv-Slot, s. applyConsumableBuff) und startet mit seiner eigenen Dauer.
 */
export const BUFF_STACK_CAP_MS = 3 * 3_600_000;

export { consumeBlocked, consumeCooldownKind, noteConsumeCooldown } from "./consume-gate";
export type { ConsumeCooldownKind } from "./consume-gate";

/**
 * Wer stößt den Verzehr an? Steuert AUSSCHLIESSLICH, ob die Konsum-Abklingzeit greift
 * (consume-gate.ts) — der Effekt selbst ist in jedem Fall identisch.
 *
 * - "player" (DEFAULT): jeder spieler-ausgelöste Verzehr — Charakterblatt/Inventar ebenso wie der
 *   Auto-Trank des Kampf-Ticks. Voll gegatet. Der Default ist bewusst der STRENGE Fall: ein neuer
 *   Aufrufer, der den Parameter vergisst, bekommt automatisch die Regel (fail-safe).
 * - "rebuff": EINZIGE Ausnahme — der automatische Nachschlag eines ABGELAUFENEN Dauer-Tonikums
 *   (`tickBuffs` unten). Er feuert höchstens einmal pro Buff-Dauer (90-300 s), ist also kein
 *   Chugging-Vektor; würde er am Heil-Takt scheitern, ginge der Tonikum-Buff eines Combo-Foods
 *   (heilt UND bufft) mitten im Kampf ersatzlos verloren, weil der abgelaufene Eintrag bereits aus
 *   `character.buffs` entfernt ist und niemand es erneut versucht. Er setzt konsequenterweise auch
 *   KEINEN Takt (Verhalten wie vor dem Gate, bit-identisch).
 *
 * Guard: consume-cooldown.test.ts scannt alle Aufrufstellen im Repo — nur consumable.ts selbst
 * darf diesen Parameter überhaupt übergeben.
 */
export type ConsumeSource = "player" | "rebuff";

/**
 * Registriert bzw. erneuert den Buff eines Consumables (Glyphe/Trank/Combo-Food). Idempotent:
 * ein bereits aktiver Buff desselben Items wird auf die volle Dauer zurückgesetzt statt gestapelt.
 * Geteilt von `useConsumable` (manuell) und dem Auto-Eat-Pfad im Kampf (combat.ts), damit
 * Buff-Food in beiden Wegen IDENTISCH wirkt.
 *
 * Kategorie-Verdrängung (red-team 2026-07-09 L3): trägt der Buff eine `category` (BuffCategory,
 * shared), werden beim Anlegen ALLE aktiven Buffs DERSELBEN Kategorie anderer Items verdrängt
 * (ersetzt, nicht addiert) — pro Kategorie ist max. 1 Buff aktiv. Dasselbe Item erneut bleibt ein
 * reiner Dauer-Refresh. Buffs OHNE Kategorie (Alt-/Sonderfälle: die 2–4-s-HoT-Heiltränke) stapeln
 * wie bisher frei. Alt-Saves mit bereits gestapelten Buffs derselben Kategorie bleiben unberührt
 * geladen (keine Säuberung beim Load) und laufen natürlich aus — erst der NÄCHSTE kategorisierte
 * Apply räumt seine Kategorie.
 */
export function applyConsumableBuff(state: GameState, content: ContentDB, itemId: ItemId): void {
  const buff = content.items[itemId]?.buff;
  if (!buff) return;
  if (buff.category) {
    // Verdrängung: aktive Buffs derselben Kategorie ANDERER Items entfernen (auch Alt-Save-
    // Mehrfachbelegungen — filter räumt alle). Das eigene Item bleibt für den Refresh unten stehen.
    state.character.buffs = state.character.buffs.filter(
      (b) => b.itemId === itemId || content.items[b.itemId]?.buff?.category !== buff.category,
    );
  }
  // Meisterweihe (masterPerk `buffDuration`, capes.ts — Venombrewer-Cape, Konzept: Tonika/Tränke
  // wirken 10 % länger): Multiplikator auf die Dauer BEIM ANLEGEN. Bereits laufende Buffs bleiben
  // unberührt (kein rückwirkendes Strecken); ein Refresh desselben Items bekommt die neue Dauer.
  // Ohne Träger Faktor EXAKT 1 → durationMs unverändert (bewusst keine Rundung im 1-Fall,
  // bestehende Fixtures bit-identisch). Wirkt in BEIDEN Verzehr-Pfaden (manuell + Auto-Rebuff),
  // weil beide durch diese eine Anlege-Stelle laufen.
  const durMult = masterBuffDurationMult(state, content);
  const durationMs = durMult === 1 ? buff.durationMs : Math.round(buff.durationMs * durMult);
  const existing = state.character.buffs.find((b) => b.itemId === itemId);
  // Aufladen statt Zurücksetzen (BUFF_STACK_CAP_MS): Restzeit + Dauer, gedeckelt. Der Auto-Rebuff trifft nie
  // einen laufenden Eintrag (er feuert erst nach dem Ablauf), für ihn ist das bit-identisch zu vorher.
  if (existing) existing.remainingMs = Math.min(BUFF_STACK_CAP_MS, Math.max(0, existing.remainingMs) + durationMs);
  else state.character.buffs.push({ itemId, remainingMs: durationMs });
}

/**
 * Ladezustand eines Dauer-Tonikums für die UI: Restzeit des laufenden Buffs DIESES Items, Dauer je Stück,
 * Deckel und wie viele Stücke bis zum Deckel noch sinnvoll sind (0 = voll). Rein lesend.
 */
export function buffChargeInfo(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): { remainingMs: number; perUseMs: number; capMs: number; usesToCap: number } | null {
  const buff = content.items[itemId]?.buff;
  if (!buff) return null;
  const durMult = masterBuffDurationMult(state, content);
  const perUseMs = durMult === 1 ? buff.durationMs : Math.round(buff.durationMs * durMult);
  const remainingMs = Math.max(0, state.character.buffs.find((b) => b.itemId === itemId)?.remainingMs ?? 0);
  const usesToCap = perUseMs > 0 ? Math.max(0, Math.ceil((BUFF_STACK_CAP_MS - remainingMs) / perUseMs)) : 0;
  return { remainingMs, perUseMs, capMs: BUFF_STACK_CAP_MS, usesToCap };
}

/**
 * Benutzt ein Consumable aus dem Inventar. Wendet ALLE vorhandenen Effekte zugleich an:
 * Sofort-Heilung (`healAmount`), Gift-Heilung (`curesPoison`) UND Buff (`buff`). Combo-/Effekt-Food
 * heilt also sofort UND registriert seinen (über die Dauer wirkenden, ggf. `hpRegenPerSec`-tragenden)
 * Buff in EINEM Verzehr. Reine Heil- bzw. reine Buff-Items verhalten sich unverändert. Gibt zurück,
 * ob etwas passiert ist.
 *
 * KONSUM-ABKLINGZEIT (Exploit-Fix 1.0.1): dies ist der EINZIGE Verzehr-Einstieg der Engine, also
 * sitzt die Regel hier — nicht in einer Ansicht. Im laufenden Kampf prüft `consumeBlocked`
 * (consume-gate.ts) den Takt der jeweiligen Kategorie und `noteConsumeCooldown` startet ihn nach
 * Erfolg; damit teilen sich Charakterblatt, Auto-Trank und jeder künftige Pfad denselben Cooldown.
 * Außerhalb des Kampfes ist das Gate ein No-op. Fehlschlag ⇒ `false` UND unangetastetes Inventar
 * (die UI meldet es dem Spieler). Zieht kein RNG — AUSSER über eine Sonder-Wirkung:
 *
 * SONDER-WIRKUNG (`item.consumable`, shared `ConsumableEffect`; Chef-GO 26.08.2026 Auftragsmarke
 * `chronicle_task_token` = `{ kind: "slayerReroll" }`): wird VOR dem Verbrauch ausgeführt und
 * verbraucht das Item nur bei Erfolg (`slayerReroll` ⇒ slayer.ts `rerollTask`: gratis neuer
 * Auftrag beim selben Meister, Punkte/Streak/Tages-Gratis-Skip unberührt; ohne aktiven Auftrag
 * false ohne Verbrauch — Grund für die UI via `consumeFailReason`). Sonder-Wirkungen zählen als
 * Wirkung (ein Item NUR damit ist benutzbar), takten nicht (consume-gate: kind "none", sofern das
 * Item nicht zusätzlich heilt) und feuern NIE über den Auto-Rebuff.
 */
export function useConsumable(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
  source: ConsumeSource = "player",
): boolean {
  return consumeInternal(state, content, itemId, source, 1);
}

/**
 * Aufladen (Chef 27.08.2026): bis zu `qty` Stücke eines reinen Dauer-Tonikums auf einmal trinken (spieler-
 * ausgelöst, gleicher Takt-/Sperr-Pfad wie useConsumable). Heil-/Antidot-/Sonder-Items bleiben Einzelschlucke.
 */
export function useConsumableMany(state: GameState, content: ContentDB, itemId: ItemId, qty: number): boolean {
  return consumeInternal(state, content, itemId, "player", qty);
}

function consumeInternal(state: GameState, content: ContentDB, itemId: ItemId, source: ConsumeSource, qty: number): boolean {
  const item = content.items[itemId];
  if (!item || item.type !== "consumable") return false;
  // claude:2026-10-26T01:25:00+02:00 — Kisten (Werkstatt, Schwarzmarkt) öffnen auch direkt aus der Bank; sie verbrauchen sich selbst „Inventar, sonst Lager“ (QA-Aufträge P3-1).
  const crate = item.consumable?.kind === "workCrate" || item.consumable?.kind === "blackMarketCrate";
  if (itemCount(state.inventory, itemId) < 1 && !(crate && (state.bank[itemId] ?? 0) > 0)) return false;

  // Combat-Feel v2 #0a: healPct-only-Items (ohne flachen healAmount) heilen ebenfalls.
  const heals = (item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0;
  const cures = !!item.curesPoison;
  const buffs = !!item.buff;
  // Sonder-Wirkung (shared `ConsumableEffect`, z.B. Auftragsmarke `slayerReroll`): NUR beim
  // spieler-ausgelösten Verzehr. Der Auto-Rebuff (source "rebuff") fasst Items mit Sonder-Wirkung
  // GAR NICHT an (kein Verbrauch, kein Effekt) — sonst würfelte ein Combo-Item (Buff + Sonder-
  // Wirkung) beim Ablauf seines Buffs still den Slayer-Auftrag neu bzw. verbrennte Marken für einen
  // bloßen Buff-Refresh ohne Spielerentscheidung. Solche Items sind bewusste Einzel-Entscheidungen.
  const special = item.consumable;
  if (special && source === "rebuff") return false;
  // claude:2026-10-30T22:28:00+01:00 — Gebührenschein (1.4.2 L4): kein „Benutzen“, er wird nur beim Raid-Start verbraucht (raid.ts `startRaid`).
  if (special?.kind === "raidFeeWrit") return false;
  if (!heals && !cures && !buffs && !special) return false;

  // Abklingzeit VOR dem Verbrauch prüfen: ein geblockter Versuch darf weder Item noch HP anfassen.
  if (source !== "rebuff" && consumeBlocked(state, content, itemId)) return false;

  // Sonder-Wirkung VOR dem Verbrauch ausführen: schlägt sie fehl (slayerReroll: kein aktiver
  // Auftrag bzw. kein neuer Auftrag vergebbar — rerollTask lässt den State dann unverändert),
  // bleibt das Item im Inventar und die UI meldet den Grund (`consumeFailReason`).
  if (special?.kind === "slayerReroll" && !rerollTask(state, content)) return false;

  if (special?.kind === "blackMarketCrate") {
    // Schwarzmarktbehälter (Taverne, SAVE 84 — taverne-spec-technik.md §7): `openBlackMarketCrate`
    // würfelt den Inhalt per reinem Hash, legt ihn ab UND verbraucht das Stück SELBST (Inventar
    // zuerst, sonst Lager) — deshalb hier KEIN zweites removeItem. Schlägt es fehl (kein Behälter/
    // leerer Inhalt), bleibt das Stück liegen. Wer den Inhalt für die Zeremonie braucht, ruft
    // `openBlackMarketCrate` direkt (liefert das `CrateResult`); dieser Pfad ist der generische
    // „Benutzen"-Knopf des Inventars.
    if (!openBlackMarketCrate(state, content, itemId)) return false;
  } else if (special?.kind === "workCrate") {
    // claude:2026-10-24T23:45:00+02:00 — Werkstattkiste (1.4.0 AU): öffnet und verbraucht selbst (Inventar, sonst Lager), wie der Behälter oben.
    if (!openWorkCrate(state, content, itemId)) return false;
  } else if (buffs && !heals && !cures && !special && source !== "rebuff" && qty > 1) {
    // Aufladen (Chef 27.08.2026): reine Dauer-Tonika dürfen MEHRERE Stücke auf einmal trinken — so viele wie
    // gewünscht, vorrätig und bis zum Deckel sinnvoll (mindestens eins). Heil-/Antidot-/Sonder-Items bleiben
    // Einzelschlucke (Heilung stapelt nicht, Sonder-Wirkung ist eine bewusste Einzel-Entscheidung).
    const info = buffChargeInfo(state, content, itemId);
    const n = Math.max(1, Math.min(Math.floor(qty), itemCount(state.inventory, itemId), info?.usesToCap ?? 1));
    removeItem(state.inventory, itemId, n);
    for (let i = 1; i < n; i++) applyConsumableBuff(state, content, itemId);
  } else {
    removeItem(state.inventory, itemId, 1);
  }

  applyEatEffects(state, content, itemId);
  // Takt starten (nur im Kampf, nur für heilende Items) — dieselben Felder/Werte, die
  // tryAutoEat/tryAutoPotion setzen. Der Rebuff bleibt bewusst taktfrei (s. ConsumeSource).
  if (source !== "rebuff") noteConsumeCooldown(state, content, itemId);
  return true;
}

/**
 * Wirkung eines Verzehrs (Heilung, Gift-Heilung, Buff) OHNE Verbrauch und ohne Takt. Gemeinsamer
 * Kern von `consumeInternal` und „Mahlzeit halten“ (`tickMealKeep`), damit beide Wege identisch wirken.
 * claude:2026-10-23T16:30:00+02:00 — aus consumeInternal herausgelöst (1.4.0), Verhalten unverändert.
 */
function applyEatEffects(state: GameState, content: ContentDB, itemId: ItemId): void {
  const item = content.items[itemId];
  if (!item) return;
  const heals = (item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0;
  if (heals) {
    const max = computeStats(state, content).maxHp;
    // Zentraler Heilbetrag (Hybrid, Balance-Kette Schritt 4): max(healAmount, round(maxHp·healPct))
    // — flat = Früh-/Mid-Boden & Tier-Leiter, pct = End-Game-Floor. EINE Quelle: consumableHeal (shared).
    // claude:2026-10-18T02:00:00+02:00 — Aschbauch „Feinschmecker" (foodHealBonus, 1.3.0): ESSEN heilt × (1 + Anteil),
    // Tränke nicht. Ohne Begleiter Faktor 1 ⇒ exakt der Alt-Wert.
    const foodMult = isHealPotion(content, itemId) ? 1 : petFoodHealMult(state, content);
    const baseHeal = consumableHeal(item, max);
    const heal = foodMult !== 1 ? Math.round(baseHeal * foodMult) : baseHeal;
    state.character.hp = Math.min(max, state.character.hp + heal);
  }
  if (item.curesPoison) {
    state.combat.playerEffects = state.combat.playerEffects.filter((e) => e.type !== "poison");
  }
  if (item.buff) {
    applyConsumableBuff(state, content, itemId);
  }
}

/** Ist das Item eine Mahlzeit (Buff der Kategorie "food")? claude:2026-10-23T16:30:00+02:00 */
export function isMealItem(content: ContentDB, itemId: ItemId | null | undefined): boolean {
  return !!itemId && content.items[itemId]?.type === "consumable" && content.items[itemId]?.buff?.category === "food";
}

/** Vorrat einer Mahlzeit über Inventar und Bank (inkl. Lager). claude:2026-10-23T16:30:00+02:00 */
export function mealStock(state: GameState, itemId: ItemId): number {
  return stockCount(state, itemId); // claude:2026-10-31T16:08:21+01:00 — gemeinsame Quelle (bank.ts), Wert unverändert
}

/**
 * claude:2026-10-31T16:08:21+01:00 — 1.4.2 (Sweep-Idee, Chef-GO 31.10.2026: „Auto-Trank zieht aus der Bank nach“): Verzehr „Inventar,
 * sonst Lager“ für den Auto-Trank. Liegt das Item im Inventar, läuft exakt `useConsumable` (unverändert). Sonst ein Stück direkt aus der
 * Bank, mit derselben Wirkung (`applyEatEffects`), demselben Takt-Gate (`consumeBlocked` vorher, `noteConsumeCooldown` nachher) und ohne
 * Inventarplatz. Items mit Sonder-Wirkung (`item.consumable`) nimmt dieser Weg nie aus der Bank: das sind bewusste Einzel-Entscheidungen
 * aus dem Inventar. Deterministisch, kein RNG. Rückgabe: ob getrunken/gegessen wurde.
 */
export function useConsumableFromStock(state: GameState, content: ContentDB, itemId: ItemId): boolean {
  if (itemCount(state.inventory, itemId) > 0) return useConsumable(state, content, itemId);
  const item = content.items[itemId];
  if (!item || item.type !== "consumable" || item.consumable) return false;
  const heals = (item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0;
  if (!heals && !item.curesPoison && !item.buff) return false;
  if ((state.bank[itemId] ?? 0) < 1) return false;
  if (consumeBlocked(state, content, itemId)) return false;
  if (takeFromBank(state, content, itemId, 1) < 1) return false;
  applyEatEffects(state, content, itemId);
  noteConsumeCooldown(state, content, itemId);
  return true;
}

/**
 * „Mahlzeit halten“ (1.4.0, Chef 23.10.: nur in Kampf, Dungeon und Raid, kostenlos).
 * claude:2026-10-23T16:30:00+02:00
 *
 * Läuft einmal pro Kampf-Tick (combat.ts `combatStep`). Isst die gewählte Mahlzeit `character.meal`,
 * wenn KEIN Mahlzeit-Buff (Kategorie "food") aktiv ist — so überschreibt sie nie eine Mahlzeit, die der
 * Spieler gerade selbst gegessen hat, sondern übernimmt erst, wenn diese ausläuft. Vorrat: zuerst
 * Inventar (über `useConsumable`, Quelle "rebuff" = ohne Konsum-Takt), sonst die Bank (= Lager).
 * Deterministisch, kein RNG. Gibt zurück, ob gegessen wurde.
 */
export function tickMealKeep(state: GameState, content: ContentDB): boolean {
  const ch = state.character;
  const meal = ch.meal;
  if (!meal || ch.mealKeep === false) return false;
  if (state.combat.monsterId === null) return false;
  if (!isMealItem(content, meal)) return false;
  if (ch.buffs.some((b) => content.items[b.itemId]?.buff?.category === "food")) return false;
  if (itemCount(state.inventory, meal) > 0) return useConsumable(state, content, meal, "rebuff");
  // claude:2026-10-31T16:08:21+01:00 — Bank-Entnahme über den gemeinsamen Helfer (bank.ts `takeFromBank`, wie Auto-Essen/Auto-Trank).
  if (takeFromBank(state, content, meal, 1) < 1) return false;
  applyEatEffects(state, content, meal);
  return true;
}

/**
 * Stabile Fehlschlag-Codes für die UI (Muster SlayerShopReason, slayer.ts): sprachneutral,
 * deterministisch testbar; die UI rendert daraus ihre Meldung statt eines pauschalen „Cooldown".
 *  - `cooldown`         Konsum-Abklingzeit/Kill-Verschnaufpause im Kampf (`consumeBlocked`).
 *  - `no_slayer_task`   Sonder-Wirkung `slayerReroll`, aber kein aktiver Slayer-Auftrag.
 *  - `raid_only`        claude:2026-10-30T22:28:00+01:00 — Gebührenschein (`raidFeeWrit`): wird nur beim Raid-Start eingesetzt.
 */
export type ConsumeFailReason = "cooldown" | "no_slayer_task" | "raid_only";

/**
 * Warum würde `useConsumable` (spieler-ausgelöst) für `itemId` JETZT scheitern? `null` = benutzbar
 * (bzw. kein Consumable/kein Bestand — dafür zeigt die UI ohnehin keinen Knopf). Rein lesend, kein
 * RNG, keine Mutation. Prüfreihenfolge = die von `useConsumable` (Takt vor Sonder-Wirkung), damit
 * Meldung und Verhalten nie auseinanderlaufen. NICHT geprüft: ob `rerollTask` trotz aktivem Auftrag
 * keinen neuen vergeben könnte (leerer Pool — praktisch unerreichbar, dann bleibt der alte Auftrag).
 */
export function consumeFailReason(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): ConsumeFailReason | null {
  const item = content.items[itemId];
  if (!item || item.type !== "consumable") return null;
  if (item.consumable?.kind === "raidFeeWrit") return "raid_only"; // claude:2026-10-30T22:28:00+01:00 — vor dem Takt: nie benutzbar
  if (consumeBlocked(state, content, itemId)) return "cooldown";
  if (item.consumable?.kind === "slayerReroll" && !state.slayerTask) return "no_slayer_task";
  return null;
}

/**
 * Skilling-XP-Multiplikator aus allen aktiven Buffs (Sammel-/Verarbeitungs-Tonika).
 * Mehrere aktive `gatherXpMult`-Buffs MULTIPLIZIEREN sich (1.10 × 1.08 …). 1 = kein Bonus.
 * Wird im Skilling-Tick auf die gewährte Skill-XP angewandt (analog zu Kampf-Buffs in
 * computeStats), Mastery-XP bleibt unberührt.
 */
export function buffGatherXpMult(state: GameState, content: ContentDB): number {
  let mult = 1;
  for (const b of state.character.buffs) {
    const g = content.items[b.itemId]?.buff?.bonus?.gatherXpMult;
    if (g && g > 0) mult *= g;
  }
  return mult;
}

/**
 * Additive Skilling-Extra-Ertrag-Chance aus allen aktiven Buffs (`gatherYieldMult`).
 * Mehrere Buffs ADDIEREN sich. 0 = kein Bonus. Fließt im Skilling-Tick in die
 * Doppelertrag-Chance ein (neben Mastery/Pool/Pet).
 */
export function buffGatherYieldBonus(state: GameState, content: ContentDB): number {
  let bonus = 0;
  for (const b of state.character.buffs) {
    const g = content.items[b.itemId]?.buff?.bonus?.gatherYieldMult;
    if (g && g > 0) bonus += g;
  }
  return bonus;
}

/**
 * Tickt aktive Buffs herunter und entfernt abgelaufene. Läuft seit dem Auto-Trank-System PRO TICK
 * in `step()` (tick.ts) statt einmal pro `advance` — so behandeln Live-Loop und Offline-Catch-up
 * Buffs BIT-IDENTISCH (vorher blieb ein Tonikum im Offline-Catch-up faktisch die GESAMTE Fenster-
 * dauer aktiv, weil erst nach der Step-Schleife dekrementiert wurde) und der Auto-Rebuff ist
 * offline==online deterministisch.
 *
 * Auto-Rebuff (Chef-Feature, `character.autoPotion.autoRebuffTonics`): läuft ein Buff-Tonikum ab
 * und liegt DASSELBE Item noch im Inventar, wird es automatisch nachgetrunken — über die echte
 * Consumable-Logik (`useConsumable`), also identisch zum manuellen Verzehr (inkl. healAmount/
 * curesPoison eines Combo-Items). Wirkt im Kampf UND beim Skilling: dies ist die EINZIGE Stelle,
 * an der Buffs ablaufen. Deterministisch, kein RNG (useConsumable zieht keinen).
 */
export function tickBuffs(state: GameState, content: ContentDB, deltaMs: number): void {
  if (state.character.buffs.length === 0) return;
  for (const b of state.character.buffs) b.remainingMs -= deltaMs;
  const expired = state.character.buffs.filter((b) => b.remainingMs <= 0);
  state.character.buffs = state.character.buffs.filter((b) => b.remainingMs > 0);
  if (expired.length === 0) return;
  // codex:2026-08-02T16:20:00+02:00 — Defense-in-depth: Auch ein manipuliertes In-Memory-Flag
  // darf die 50.000-Gold-Freischaltung nicht umgehen.
  if (!state.character.autoPotion?.autoRebuffUnlocked || !state.character.autoPotion.autoRebuffTonics) return;
  for (const b of expired) {
    // Nur echte Buff-Träger nachtrinken (defensiv: der Buff-Eintrag könnte auf ein inzwischen
    // umdefiniertes Item zeigen). Bestand prüft useConsumable selbst (fehlt das Item ⇒ no-op).
    const def = content.items[b.itemId]?.buff;
    if (!def) continue;
    // Nur DAUER-Tonika (buff.category) nachtrinken. Kategorielose Kurzzeit-Buffs sind Heil-MECHANIK
    // (HoT-Draughts, im Content „BEWUSST OHNE category"): sie hier nachzutrinken hieße, bei vollen
    // HP endlos Heiltränke zu verbrennen — der Rebuff feuerte bei jedem HoT-Ablauf ohne jede
    // HP-/Schwellen-Prüfung (Spieler-Report 2026-07-22: „trinkt bei 100 % einfach weiter", ein
    // 2-s-Draught verbrannte alle 2 Sekunden einen Trank). Heil-Nachschub ist allein Sache von
    // tryAutoPotion (Schwelle + Cooldown + HoT-Guard).
    if (!def.category) continue;
    // claude:2026-10-23T16:30:00+02:00 — Mahlzeiten (Kategorie "food") erneuert nur noch „Mahlzeit halten“
    // (tickMealKeep, nur im Kampf). Die Tonika-Erneuerung betrifft ab 1.4.0 wirklich nur Tonika (Chef 23.10.).
    if (def.category === "food") continue;
    // Kategorie-Verdrängung respektieren (L3): ist inzwischen ein ANDERER Buff derselben Kategorie
    // aktiv (Alt-Save-Mehrfachbelegung bzw. mehrere Abläufe im selben Tick), NICHT nachtrinken —
    // sonst würde der Rebuff den aktiven Buff verdrängen (Trank-Verbrauch ohne Nutzen, Kategorie-
    // Ping-Pong). Nach der Übergangsphase (max. 1 Buff je Kategorie) rebufft jedes Tonikum normal.
    if (
      def.category &&
      state.character.buffs.some((a) => content.items[a.itemId]?.buff?.category === def.category)
    ) {
      continue;
    }
    // "rebuff": EINZIGE Ausnahme von der Konsum-Abklingzeit (s. ConsumeSource). Feuert nur beim
    // ABLAUF eines Dauer-Tonikums (höchstens 1× pro Buff-Dauer, 90-300 s) — kein Chugging-Vektor.
    // Ohne die Ausnahme verlöre ein Combo-Food (heilt UND bufft) seinen Buff mitten im Kampf
    // ersatzlos, sobald zufällig der Ess-Takt lief: der abgelaufene Eintrag ist bereits aus
    // `character.buffs` entfernt, ein zweiter Versuch findet nie statt.
    useConsumable(state, content, b.itemId, "rebuff");
  }
}
