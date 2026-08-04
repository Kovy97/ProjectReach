import type { ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { consumableHeal } from "@hearthforge/shared";
import { computeStats } from "./character";
import { itemCount, removeItem } from "./inventory";
import { masterBuffDurationMult } from "./capes";

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
  if (existing) existing.remainingMs = durationMs;
  else state.character.buffs.push({ itemId, remainingMs: durationMs });
}

/**
 * Benutzt ein Consumable aus dem Inventar. Wendet ALLE vorhandenen Effekte zugleich an:
 * Sofort-Heilung (`healAmount`), Gift-Heilung (`curesPoison`) UND Buff (`buff`). Combo-/Effekt-Food
 * heilt also sofort UND registriert seinen (über die Dauer wirkenden, ggf. `hpRegenPerSec`-tragenden)
 * Buff in EINEM Verzehr. Reine Heil- bzw. reine Buff-Items verhalten sich unverändert. Gibt zurück,
 * ob etwas passiert ist.
 */
export function useConsumable(state: GameState, content: ContentDB, itemId: ItemId): boolean {
  const item = content.items[itemId];
  if (!item || item.type !== "consumable") return false;
  if (itemCount(state.inventory, itemId) < 1) return false;

  // Combat-Feel v2 #0a: healPct-only-Items (ohne flachen healAmount) heilen ebenfalls.
  const heals = (item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0;
  const cures = !!item.curesPoison;
  const buffs = !!item.buff;
  if (!heals && !cures && !buffs) return false;

  removeItem(state.inventory, itemId, 1);

  if (heals) {
    const max = computeStats(state, content).maxHp;
    // Zentraler Heilbetrag (Hybrid, Balance-Kette Schritt 4): max(healAmount, round(maxHp·healPct))
    // — flat = Früh-/Mid-Boden & Tier-Leiter, pct = End-Game-Floor. EINE Quelle: consumableHeal (shared).
    state.character.hp = Math.min(max, state.character.hp + consumableHeal(item, max));
  }
  if (cures) {
    state.combat.playerEffects = state.combat.playerEffects.filter((e) => e.type !== "poison");
  }
  if (buffs) {
    applyConsumableBuff(state, content, itemId);
  }
  return true;
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
    useConsumable(state, content, b.itemId);
  }
}
