import type { ContentDB, CropDef, FarmPlot, GameState, ItemId } from "@hearthforge/shared";
import { CAMP_SPEED_CUT_CAP, plotsUnlocked } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { nextInt } from "./rng";
import { addItemOrBank, itemCount } from "./inventory";
import { bankCount } from "./bank";
import { buffGatherXpMult } from "./consumable";
import { tryPetDrop } from "./pets";
import { masterCropSpeedBonus } from "./capes";
import { campBoost } from "./camp";

// ───────────────────────────────────────────────────────────────────────────
// Passives Plot-/Farming-System (design/skills/farming-plots-plan.md).
//
// Plots reifen gegen die deterministische Sim-Uhr `state.elapsedMs` (Anti-Abuse: strikt monoton,
// bewegt sich nur über `advance`). `tickFarmPlots` läuft EINMAL pro `advance` (nicht pro 100-ms-Tick)
// im `steps>0`-Block von tick.ts — rein arithmetisch (`floor(elapsed/growMs)`), O(MAX_FARM_PLOTS).
// Es zieht RNG (nextInt für den Ertrag) NUR, wenn tatsächlich geerntet wird → ohne Crop-Katalog /
// ohne reife Plots bleibt die bestehende RNG-Sequenz bit-identisch (Determinismus-Fixtures unberührt).
// ───────────────────────────────────────────────────────────────────────────

/** Aktuelles Farming-Level aus der gesammelten XP. */
function farmingLevel(state: GameState): number {
  return levelFromXp(state.skills.farming?.xp ?? 0);
}

/** Crop-Katalog (kann fehlen, solange content-dev ihn noch nicht gefüllt hat). */
function crop(content: ContentDB, cropId: ItemId | null): CropDef | undefined {
  if (!cropId) return undefined;
  return content.crops?.[cropId];
}

/** Gesamt-Saatbestand im Inventar UND Lager (Saat darf aus beidem gezogen werden). */
function seedAvailable(state: GameState, seedItem: ItemId): number {
  return itemCount(state.inventory, seedItem) + bankCount(state, seedItem);
}

/** Verbraucht GENAU eine Saat (zuerst aus dem Inventar, dann aus dem Lager). Gibt true bei Erfolg. */
function consumeSeed(state: GameState, seedItem: ItemId): boolean {
  if (itemCount(state.inventory, seedItem) > 0) {
    // direkt aus dem Inventar
    for (let i = 0; i < state.inventory.slots.length; i++) {
      const s = state.inventory.slots[i];
      if (s && s.itemId === seedItem) {
        s.qty -= 1;
        if (s.qty <= 0) state.inventory.slots[i] = null;
        return true;
      }
    }
  }
  if ((state.bank[seedItem] ?? 0) > 0) {
    state.bank[seedItem]! -= 1;
    if (state.bank[seedItem]! <= 0) delete state.bank[seedItem];
    return true;
  }
  return false;
}

/** Setzt einen Plot auf „leer" zurück (behält die Auto-Replant-Einstellung + wartende Ernte). */
function clearPlot(plot: FarmPlot): void {
  plot.cropId = null;
  plot.plantedAtMs = 0;
}

/**
 * Versucht, eine bereits geparkte (abholbare) Ernte ins Inventar/Lager zu schieben.
 * Greift, sobald wieder Platz da ist. Gibt die tatsächlich eingelagerte Menge zurück.
 */
function flushReadyYield(state: GameState, content: ContentDB, plot: FarmPlot): number {
  if (plot.readyYield <= 0 || !plot.readyItem) {
    plot.readyYield = 0;
    plot.readyItem = null;
    return 0;
  }
  const { toInventory, toBank } = addItemOrBank(state, content, plot.readyItem, plot.readyYield);
  const placed = toInventory + toBank;
  if (placed > 0) {
    state.stats.itemsGathered += placed;
    plot.readyYield -= placed;
    if (plot.readyYield <= 0) {
      plot.readyYield = 0;
      plot.readyItem = null;
    }
  }
  return placed;
}

/**
 * Gewährt EINE Ernte: Farming-XP (passiv, Skilling-Buffs multiplizieren) + Ertrag (nextInt min..max).
 * Was nicht ins Inventar/Lager passt (Inventar voll + autoBank=off), parkt als `readyYield` auf dem
 * Plot („abholbar") statt verloren zu gehen. Spiegelt die Loot-/XP-Logik aus `completeAction`.
 */
function grantHarvest(state: GameState, content: ContentDB, c: CropDef, plot: FarmPlot): void {
  const skill = (state.skills.farming ??= { xp: 0 });
  // Passive Skilling-XP. Aktive Sammel-Tonika (gatherXpMult) multiplizieren wie bei Aktionen.
  // buffGatherXpMult zieht KEIN RNG → ohne Buff bit-identisch (Faktor 1).
  skill.xp += c.xp * buffGatherXpMult(state, content);

  // Ertrag: ein nextInt-Zug pro Ernte (Plots speisen KEINE Mastery → kein Doppelertrag-Wurf, CEO #4).
  const qty = nextInt(state.rng, c.yieldMin, c.yieldMax);
  if (qty > 0) {
    const { toInventory, toBank } = addItemOrBank(state, content, c.yieldItem, qty);
    const placed = toInventory + toBank;
    state.stats.itemsGathered += placed;
    const leftover = qty - placed;
    if (leftover > 0) {
      plot.readyItem = c.yieldItem;
      plot.readyYield += leftover;
    }
  }

  // Pet-Drop-Wurf pro Ernte-Zyklus (analog tick.ts:193 im Aktions-Abschluss). Farming hat keine
  // ActionDef → ohne diesen Hook könnte das Farming-Pet (witherling) NIE droppen (ach_pets_all
  // unerreichbar). Determinismus-Disziplin: `tryPetDrop` zieht NUR dann einen nextFloat, wenn es für
  // Farming ein noch nicht besessenes Pet gibt → für Content ohne Farming-Pet bit-identisch, und ohne
  // Ernte (kein grantHarvest-Aufruf) wird gar nicht gezogen (Determinismus-Guards unberührt).
  tryPetDrop(state, content, { kind: "skill", skill: "farming" });
}

/**
 * Effektive Reifezeit einer Crop in ms: Basis × (1 − cropSpeed-Perk). EINE Quelle der Wahrheit —
 * `tickFarmPlots` (Ernte-Zyklen/Restübertrag) UND `plotProgress` (UI-Balken/Restzeit) teilen sie,
 * sonst liefe die Anzeige gegen eine andere Uhr als die Engine (Muster effectiveActionDurationMs).
 *
 * Meisterweihe (masterPerk `cropSpeed`, capes.ts — Gravetender-Cape, Konzept: Beete reifen 8 %
 * schneller): additiv aggregiert über alle ausgerüsteten Träger, an derselben Stelle wie die
 * Pet-Passiva-Präzedenz wirken würde (Farming hat kein Reife-Pet — der Perk ist hier die einzige
 * Beschleunigungs-Quelle). Ohne Träger EXAKT `c.growMs` (bewusst KEINE Rundung im 0-Fall) →
 * bestehende Saves/Determinismus-Fixtures bleiben bit-identisch. Mindestens 1 ms (Schutz gegen
 * Endlos-Zyklen bei degeneriertem Content).
 *
 * Saatgarten (Das Lager, `farmingSpeed` ≤ 0.12 — encampment-balance.md §3/§7.9): MULTIPLIKATIV zum
 * Cape-Perk (0.88 × 0.92 = 0.8096 im Maximum, exakt die im Balance-Doc gerechnete „×0.81"-Zeile).
 * Dasselbe Gebäude beschleunigt über `CAMP_SKILL_SPEED_KIND` zusätzlich den Foraging-AKTIONS-Pfad
 * (tick.ts) — Farming selbst hat keine ActionDef, deshalb diese zweite Anwendungsstelle.
 * Ohne gebauten Saatgarten exakt 1 ⇒ der 0-Fall unten bleibt der unveränderte Alt-Pfad.
 */
export function effectiveGrowMs(state: GameState, content: ContentDB, c: CropDef): number {
  const bonus = masterCropSpeedBonus(state, content);
  const campCut = Math.min(CAMP_SPEED_CUT_CAP, Math.max(0, campBoost(state, content, "farmingSpeed")));
  if (bonus <= 0 && campCut <= 0) return c.growMs;
  return Math.max(1, Math.round(c.growMs * (1 - bonus) * (1 - campCut)));
}

/**
 * Ein Plot-Tick pro `advance`. Reift alle freigeschalteten, bepflanzten Plots gegen `elapsedMs`,
 * erntet automatisch, sät bei aktivem Auto-Replant (seed-begrenzt) neu und übernimmt den
 * Rest-Fortschritt verlustfrei. Offline werden mehrere Zyklen rein arithmetisch verrechnet.
 */
export function tickFarmPlots(state: GameState, content: ContentDB): void {
  const plots = state.farmPlots;
  if (!Array.isArray(plots) || plots.length === 0) return;

  const unlocked = plotsUnlocked(farmingLevel(state));

  for (let i = 0; i < plots.length; i++) {
    const plot = plots[i];
    if (!plot) continue;

    // Wartende Ernte zuerst einzulagern versuchen (Inventar könnte frei geworden sein).
    flushReadyYield(state, content, plot);

    if (i >= unlocked) continue; // gesperrt (Tick überspringt, reift NICHT)
    if (plot.cropId === null) continue; // leer

    const c = crop(content, plot.cropId);
    if (!c) {
      // Crop aus dem Content entfernt → defensiv leeren (kein Crash, kein RNG-Zug).
      clearPlot(plot);
      continue;
    }

    // Reifezeit inkl. cropSpeed-Perk (Meisterweihe) — gemeinsame Quelle mit plotProgress.
    const growMs = effectiveGrowMs(state, content, c);
    const elapsed = state.elapsedMs - plot.plantedAtMs;
    if (elapsed < growMs) continue; // wächst noch

    const cycles = Math.floor(elapsed / growMs); // >= 1; offline evtl. mehrere
    let harvested = 0;
    let stillPlanted = true;

    for (let cyc = 0; cyc < cycles; cyc++) {
      grantHarvest(state, content, c, plot);
      harvested++;
      // Nächste Runde nur, wenn Auto-Replant AN UND Saat (Inventar/Lager) vorhanden.
      if (plot.autoReplant && seedAvailable(state, c.seedItem) > 0) {
        consumeSeed(state, c.seedItem);
      } else {
        stillPlanted = false;
        break;
      }
    }

    if (stillPlanted && harvested === cycles) {
      // Alle Zyklen verrechnet, neu ausgesät → Rest-Fortschritt verlustfrei übernehmen.
      plot.plantedAtMs += cycles * growMs;
    } else {
      // Auto-Replant aus oder Saat erschöpft → Plot ist jetzt leer (manuell neu bepflanzen).
      clearPlot(plot);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Plot-API (UI-Lese-/Schreib-Funktionen — Mutationen NICHT in der UI rechnen)
// ───────────────────────────────────────────────────────────────────────────

/** Gültiger, vorhandener Plot oder null. */
function plotAt(state: GameState, plotIndex: number): FarmPlot | null {
  const plots = state.farmPlots;
  if (!Array.isArray(plots) || plotIndex < 0 || plotIndex >= plots.length) return null;
  return plots[plotIndex] ?? null;
}

/**
 * Pflanzt eine Crop in einen leeren, freigeschalteten Plot. Prüft Level + Saatbesitz, zieht
 * SOFORT eine Saat ab (anti-abuse: kein „pflanzen ohne Kosten"), snapshotet `elapsedMs`.
 * Gibt true bei Erfolg.
 */
export function plantCrop(
  state: GameState,
  content: ContentDB,
  plotIndex: number,
  cropId: ItemId,
): boolean {
  const plot = plotAt(state, plotIndex);
  if (!plot) return false;
  if (plotIndex >= plotsUnlocked(farmingLevel(state))) return false; // gesperrt
  if (plot.cropId !== null) return false; // belegt
  if (plot.readyYield > 0) return false; // erst abholbare Ernte einsammeln
  const c = crop(content, cropId);
  if (!c) return false;
  if (farmingLevel(state) < c.levelRequired) return false;
  if (seedAvailable(state, c.seedItem) <= 0) return false;
  if (!consumeSeed(state, c.seedItem)) return false;
  plot.cropId = cropId;
  plot.plantedAtMs = state.elapsedMs;
  return true;
}

/**
 * Rodet einen Plot (entfernt die wachsende Crop — die Saat verfällt). Eine bereits abholbare
 * Ernte (`readyYield`) bleibt erhalten. Gibt true, wenn etwas gerodet wurde.
 */
export function uprootPlot(state: GameState, plotIndex: number): boolean {
  const plot = plotAt(state, plotIndex);
  if (!plot || plot.cropId === null) return false;
  clearPlot(plot);
  return true;
}

/**
 * Sammelt die abholbare Ernte eines Plots manuell ein (Fallback, falls Auto-Einlagern blockiert war).
 * Gibt die eingelagerte Menge zurück.
 */
export function collectPlot(state: GameState, content: ContentDB, plotIndex: number): number {
  const plot = plotAt(state, plotIndex);
  if (!plot) return 0;
  return flushReadyYield(state, content, plot);
}

/** Schaltet Auto-Replant für einen Plot um. Gibt true bei Erfolg. */
export function setAutoReplant(state: GameState, plotIndex: number, value: boolean): boolean {
  const plot = plotAt(state, plotIndex);
  if (!plot) return false;
  plot.autoReplant = !!value;
  return true;
}

/** Reine Lese-Sicht eines Plots für die UI (Progress-Bar / Restzeit / Zustände). */
export interface PlotProgress {
  /** Plot-Index ≥ freigeschaltete Anzahl (Padlock-Anzeige). */
  locked: boolean;
  /** Wächst gerade eine Crop (cropId gesetzt UND noch nicht reif)? */
  growing: boolean;
  /** Wachstumsfortschritt 0..1. */
  pct: number;
  /** Restzeit bis zur (nächsten) Reife in ms. */
  remainingMs: number;
  /** Reif/abholbar (reif geworden ODER `readyYield > 0` wartet)? */
  ready: boolean;
}

/** Berechnet die Anzeige-Werte eines Plots (rein, kein State-Mutieren). */
export function plotProgress(state: GameState, content: ContentDB, plotIndex: number): PlotProgress {
  const plot = plotAt(state, plotIndex);
  const locked = plotIndex >= plotsUnlocked(farmingLevel(state));
  if (!plot) {
    return { locked, growing: false, pct: 0, remainingMs: 0, ready: false };
  }
  const c = crop(content, plot.cropId);
  if (plot.cropId === null || !c) {
    return { locked, growing: false, pct: 0, remainingMs: 0, ready: plot.readyYield > 0 };
  }
  // Reifezeit inkl. cropSpeed-Perk (Meisterweihe) — dieselbe Quelle wie tickFarmPlots, damit
  // Balken/Restzeit exakt mit der Engine-Ernte zusammenfallen.
  const growMs = effectiveGrowMs(state, content, c);
  const elapsed = Math.max(0, state.elapsedMs - plot.plantedAtMs);
  const pct = growMs > 0 ? Math.min(1, elapsed / growMs) : 1;
  const remainingMs = Math.max(0, growMs - elapsed);
  const ripe = remainingMs <= 0;
  return {
    locked,
    growing: !locked && !ripe,
    pct,
    remainingMs,
    ready: ripe || plot.readyYield > 0,
  };
}
