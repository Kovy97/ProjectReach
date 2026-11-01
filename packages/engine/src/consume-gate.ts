import type { ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { AUTO_EAT_COOLDOWN_MS, AUTO_POTION_COOLDOWN_MS } from "@hearthforge/shared";

/**
 * Konsum-Abklingzeit — die EINE Stelle, an der die Heil-Konsum-Regel des Kampfes lebt.
 *
 * Hintergrund (Spieler-Exploit-Report Steam-Forum, 1.0.0): die Abklingzeit war bis dahin
 * ausschliesslich in den AUTO-Pfaden des Kampf-Ticks verdrahtet (combat.ts `tryAutoEat`/
 * `tryAutoPotion` prüften und setzten `combat.autoEatCooldownMs` bzw. `combat.autoPotionCooldownMs`).
 * Der manuelle Verzehr (`useConsumable`, Charakterblatt/Inventar) kannte die Felder gar nicht —
 * wer mitten im Kampf aufs Charakterblatt wechselte, konnte beliebig viele Bissen/Schlucke im selben
 * Moment einwerfen und sich damit aus jeder Attrition heraus-heilen.
 *
 * Konsequenz: die Regel gehört in die ENGINE, nicht in eine Ansicht. Dieses Modul ist die
 * gemeinsame Quelle für JEDEN Konsumpfad (manuell wie automatisch); `useConsumable` (consumable.ts)
 * fragt es unkonditional ab, die Auto-Pfade in combat.ts fahren dieselben Felder.
 *
 * BEWUSSTE ENTSCHEIDUNGEN
 * - KEIN neues Save-Feld: `autoEatCooldownMs`/`autoPotionCooldownMs` sind rein transienter
 *   Kampfzustand (CombatState, "transient pro Kampf"; die Persistenz-Whitelist in
 *   packages/persistence baut `combat` ohne sie neu auf). Damit kein SAVE_VERSION-Bump, keine
 *   Migration, kein Vault-Ritual. Ein Zeitstempel (Date.now) käme ohnehin nicht in Frage —
 *   die Engine ist rein & deterministisch und rechnet ausschliesslich in Ticks.
 * - Trennung Food/Trank bleibt exakt wie im Kampf: zwei Felder, zwei Konstanten
 *   (AUTO_EAT_COOLDOWN_MS < AUTO_POTION_COOLDOWN_MS). Keine Balance-Änderung, nur dieselbe
 *   Regel auf allen Wegen.
 * - Nur HEILENDE Consumables takten. Reine Buff-Tonika/Antidote ohne Heilwert sind keine
 *   Überlebensressource, sie liefen noch nie über einen Cooldown und bleiben frei.
 * - Außerhalb des Kampfes gilt gar kein Takt (`monsterId === null`) — Vorbereitung/Aufheilen
 *   zwischen den Kämpfen bleibt unverändert.
 *
 * Rein lesend/rechnend, kein RNG, keine I/O.
 */

/** Welchen Takt bedient ein Consumable? "none" = heilt nicht ⇒ kein Heil-Cooldown. */
export type ConsumeCooldownKind = "food" | "potion" | "none";

const herbloreProductCache = new WeakMap<ContentDB, Set<ItemId>>();
function herbloreProducts(content: ContentDB): Set<ItemId> {
  let set = herbloreProductCache.get(content);
  if (set) return set;
  set = new Set<ItemId>();
  for (const action of Object.values(content.actions)) {
    if (action.skill !== "herblore") continue;
    for (const roll of action.loot) set.add(roll.itemId);
  }
  herbloreProductCache.set(content, set);
  return set;
}

/**
 * Ist `itemId` ein HEILTRANK (Auto-Trank-fähig)? Trank-Erkennung ohne eigenes Katalog-Feld:
 * Consumable mit `healAmount` > 0, das (a) von einer HERBLORE-Aktion gebraut wird (alle Tränke/
 * Tinkturen/Salben/Elixiere entstehen dort — Cooking-Produkte = Food = Auto-Eat-Domäne) ODER
 * (b) "potion" in der ID trägt (Alt-/Shop-Tränke ohne Rezept).
 *
 * Wohnt seit dem Konsum-Gate hier (statt in combat.ts), damit consumable.ts die Klassifikation
 * ohne Zyklus (combat.ts ↔ consumable.ts) nutzen kann. combat.ts re-exportiert das Symbol —
 * die öffentliche Engine-API ist unverändert.
 */
export function isHealPotion(content: ContentDB, itemId: ItemId): boolean {
  const item = content.items[itemId];
  // Combat-Feel v2 #0a: ein reines-`healPct`-Item (ohne flachen `healAmount`) zählt ebenfalls als Heiltrank.
  if (item?.type !== "consumable" || ((item.healAmount ?? 0) <= 0 && (item.healPct ?? 0) <= 0)) return false;
  return herbloreProducts(content).has(itemId) || itemId.includes("potion");
}

/**
 * claude:2026-10-31T16:08:21+01:00 — 1.4.2: Darf Auto-Essen dieses Item als ERSATZ greifen (combat.ts `findNextFood`)? Reine Heilnahrung:
 * heilendes Consumable ohne Buff (keine Mahlzeit, kein Combo-Food), kein Heiltrank. Eine Quelle für findNextFood und den Essens-Check
 * des Slayer-Neuversuchs (slayer.ts), ohne Zyklus combat.ts ↔ slayer.ts.
 */
export function isAutoEatFallbackFood(content: ContentDB, itemId: ItemId): boolean {
  const item = content.items[itemId];
  if (item?.type !== "consumable" || item.buff) return false;
  if ((item.healAmount ?? 0) <= 0 && (item.healPct ?? 0) <= 0) return false;
  return !isHealPotion(content, itemId);
}

/**
 * claude:2026-10-31T16:08:21+01:00 — 1.4.2: Liegt irgendwo (Inventar oder Lager) Essen, das Auto-Essen als Ersatz greifen würde? Genau
 * dann liefert `findNextFood` einen Treffer. Rein lesend.
 */
export function hasAutoEatFallbackFood(state: GameState, content: ContentDB): boolean {
  for (const slot of state.inventory.slots) {
    if (slot && slot.qty > 0 && isAutoEatFallbackFood(content, slot.itemId)) return true;
  }
  for (const id of Object.keys(state.bank)) {
    if ((state.bank[id] ?? 0) > 0 && isAutoEatFallbackFood(content, id)) return true;
  }
  return false;
}

/**
 * Klassifiziert ein Item für den Konsum-Takt. Deckungsgleich mit der Kampf-Domänen-Trennung:
 * Heiltrank ⇒ Trank-Takt, sonstiges heilendes Consumable (Cooking-Food, Combo-Food) ⇒ Ess-Takt,
 * alles ohne Heilwert ⇒ kein Takt.
 */
export function consumeCooldownKind(content: ContentDB, itemId: ItemId): ConsumeCooldownKind {
  const item = content.items[itemId];
  if (item?.type !== "consumable") return "none";
  const heals = (item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0;
  if (!heals) return "none";
  return isHealPotion(content, itemId) ? "potion" : "food";
}

/**
 * Darf `itemId` GERADE NICHT konsumiert werden? Prüft (nur im laufenden Kampf):
 *  1. Kill-Cooldown-Verschnaufpause — dort feuern Auto-Eat und Auto-Trank bewusst NICHT
 *     (Combat-Feel v2 #0: "kein Gratis-Refill zwischen den Mobs, die Pause heilt nur passiv").
 *     Ohne diese Zeile wäre das Fenster von Hand weiterhin offen und die Regel wertlos.
 *  2. den laufenden Takt der jeweiligen Kategorie (Food bzw. Trank).
 *
 * Auch für die UI gedacht (Aktion ausgrauen/Hinweis) — rein lesend.
 */
export function consumeBlocked(state: GameState, content: ContentDB, itemId: ItemId): boolean {
  const cs = state.combat;
  if (cs.monsterId === null) return false; // außerhalb des Kampfes gilt kein Takt
  const kind = consumeCooldownKind(content, itemId);
  if (kind === "none") return false; // reiner Buff/Antidot ohne Heilung — nie getaktet
  if ((cs.cooldownRemainingMs ?? 0) > 0) return true; // Kill-Cooldown: kein Heil-Konsum, s.o.
  return kind === "potion"
    ? (cs.autoPotionCooldownMs ?? 0) > 0
    : (cs.autoEatCooldownMs ?? 0) > 0;
}

/**
 * Startet nach einem ERFOLGREICHEN Konsum den passenden Takt. Setzt exakt dieselben Felder/Werte
 * wie `tryAutoEat`/`tryAutoPotion` — Hand und Automatik teilen sich damit EINEN Cooldown je
 * Kategorie (sonst liesse sich zwischen beiden hin- und herwechseln). Außerhalb des Kampfes
 * bleibt der State unberührt (kein Takt, der in den nächsten Kampf hineinragt).
 */
export function noteConsumeCooldown(state: GameState, content: ContentDB, itemId: ItemId): void {
  const cs = state.combat;
  if (cs.monsterId === null) return;
  const kind = consumeCooldownKind(content, itemId);
  if (kind === "potion") cs.autoPotionCooldownMs = AUTO_POTION_COOLDOWN_MS;
  else if (kind === "food") cs.autoEatCooldownMs = AUTO_EAT_COOLDOWN_MS;
}
