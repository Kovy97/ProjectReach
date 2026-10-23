import type { CombatState, GameState } from "@hearthforge/shared";

/**
 * claude:2026-10-26T02:45:00+02:00 — Kampf-Stopp als eigenes Modul (aus combat.ts gezogen): raid.ts braucht ihn beim Aufgeben
 * (QA-Raid #6), ein Import aus combat.ts wäre ein Kreis raid ↔ combat. combat.ts re-exportiert beide Symbole, die öffentliche
 * Engine-API bleibt gleich.
 */

/** Bossphasen-Felder räumen (Kampfende oder neuer Gegner ohne Phasen). */
export function clearBossPhase(cs: CombatState): void {
  if (cs.bossPhase !== undefined || cs.bossPhaseMs !== undefined || cs.bossAttackCount !== undefined) {
    cs.bossPhase = undefined;
    cs.bossPhaseMs = undefined;
    cs.bossAttackCount = undefined;
  }
}

export function stopCombat(state: GameState): void {
  state.combat.monsterId = null;
  // Dungeon-Run-Zustand mit aufräumen (konsistent zu endDungeon/onPlayerDefeated) —
  // sonst bleibt ein Geister-Run (dungeonId/encounterIndex) zurück, der sogar persistiert wird.
  state.combat.dungeonId = null;
  state.combat.encounterIndex = 0;
  // Paragonturm (§7): freiwilliges Verlassen = PAUSE, kein Verlust — nur die aktive Etage
  // schließen; der Checkpoint (state.paragon) bleibt unangetastet („Weiter ab Etage N").
  state.combat.paragonFloor = undefined;
  // Elite-/World-Spawns: freiwilliges Verlassen räumt NUR den Kampf-Zeiger. Kein Belohnungs-/
  // Despawn-Sonderfall hier — die Zone bleibt „Aktiv" (der Elite ist ja nicht besiegt) und läuft im
  // nächsten Tick regulär weiter (Fenster tickt herunter/despawnt bei Ablauf wie ohne den Besuch).
  state.combat.eliteVariantId = undefined;
  state.combat.stopReason = undefined; // manueller Stopp = kein Auto-Grund
  state.combat.encounterXp = undefined; // Begegnung vorbei → XP-Akkumulator verfällt
  state.combat.effectCounters = undefined; // Spezial-Effekt-Zähler resetten bei Kampfende (§2.3.4)
  state.combat.elemental = undefined; // Elementar-Zähler (Frost/Schock/Gift) verfallen bei Kampfende
  clearBossPhase(state.combat); // claude:2026-10-25T05:50:00+02:00 — Bossphasen-Zustand verfällt bei Kampfende
  // BEWUSST NICHT geleert: cooldownRemainingMs + lastKill. Der Kill-Cooldown gilt IMMER — Stop+Start
  // darf ihn nicht überspringen (startCombat übernimmt den Rest). Außerhalb des Kampfs ruht er
  // eingefroren (combatStep läuft nicht) und läuft beim nächsten Kampfstart zu Ende. Seit Sweep6
  // T7-F1 gilt das auch über Save/Load: cooldownRemainingMs wird persistiert (nur die lastKill-
  // Summary ist transient) — vorher war der Reload die einzige Cooldown-Skip-Lücke.
}
