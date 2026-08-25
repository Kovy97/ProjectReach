// Warteschlangen-Level-Projektion (Chef 25.08.2026): "Level 30 → 33" unter jeder Warteschlangen-
// Zeile mit endlichem Ziel — beantwortet "auf welchem Skill-Level bin ich, wenn diese Aktion
// durchgelaufen ist". Reine, NICHT mutierende Berechnung wie util/queueTiming.ts (dasselbe
// Vorbild): liest nur `state`/`content`, verändert nichts, lebt bewusst im Client (ui-dev fasst
// packages/** nicht an, Rollen-Grenze).
//
// XP-QUELLE (wichtig für die Genauigkeits-Einordnung im Bericht): die Engine bucht Skill-XP NICHT
// über eine exportierte `effectiveActionXp`/`actionXpGain`-Funktion — packages/engine/src/tick.ts
// `completeAction` rechnet sie INLINE (private Funktion, nicht exportiert):
//   skill.xp += action.xp * buffGatherXpMult(...) * rewardMult * shrineAmplifiedMult(blessingMult(...), campShrineBonus(...))
// `effectiveActionXpGain` unten repliziert GENAU diese vier Faktoren, aber AUSSCHLIESSLICH aus
// bereits exportierten Engine-/Shared-Bausteinen (buffGatherXpMult, shrineAmplifiedMult,
// blessingMult, campShrineBonus, thievingRiskMods) — keine Formel-KOPIE aus einer privaten
// Funktion, genau das Muster, das `queueTiming.ts` bereits für `effectiveActionDurationMs`
// etabliert. EXAKT bis auf einen bewussten Punkt: die Erfolgschance (`action.successBase`, nur
// Thieving) wird NICHT abgezogen — ein Fehlschlag gibt 0 XP, aber wie viele der `target`
// Wiederholungen fehlschlagen, ist vorab nicht ehrlich bekannt (dieselbe "keine erfundene
// Präzision"-Haltung wie queueTiming.ts). Für alle Skills OHNE Erfolgschance (alles außer
// Thieving) ist das Ergebnis exakt.
import type { ActionDef, ActionId, ContentDB, GameState, SkillId } from "@hearthforge/shared";
import { isFightQueueEntry, thievingRiskMods } from "@hearthforge/shared";
import { blessingMult, buffGatherXpMult, campShrineBonus, levelFromXp, shrineAmplifiedMult } from "@hearthforge/engine";

/** Eine Level-Anzeige-Zeile: "von" → "bis" desselben Skills. Wird NUR erzeugt, wenn sich das
 *  Level durch die Ausführung(en) tatsächlich ändert (Chef-Vorgabe: unveränderte Level sind
 *  Rauschen) — deckt nebenbei den 99er-Cap ab: von 99 aus bleibt jedes weitere XP auf 99, also
 *  fromLevel === toLevel === 99 ⇒ keine Zeile, ganz ohne Sonderfall. */
export interface QueueLevelEntry {
  skillId: SkillId;
  fromLevel: number;
  toLevel: number;
}

export interface QueueLevels {
  /** Level-Zeile der AKTIV laufenden Aktion (Rest-Ziel `state.actionTarget`) — `null` ohne
   *  aktive Aktion, ohne endliches Ziel, bei Content-Drift oder unverändertem Level. RAW/ungefaltet
   *  (nur `state.actionTarget`, NICHT die combinedTarget-Faltung der 4er-Grid-Anzeige im Panel) —
   *  s. `projectActionLevel`-JSDoc für die gefaltete Variante. */
  active: QueueLevelEntry | null;
  /** 1:1 zu `state.actionQueue` — gleicher Index, gleiche Länge (Muster `QueueTiming.queue`).
   *  Kampf-Einträge, ∞-Ziele, Content-Drift und unverändertes Level liefern `null` statt einer Zeile. */
  queue: (QueueLevelEntry | null)[];
}

/**
 * XP-Zuwachs EINER Ausführung dieser Aktion — s. Datei-Kopfkommentar für die Herleitung/
 * Genauigkeits-Einordnung. `nowMs` wie bei `effectiveActionDurationMs` (queueTiming.ts): das
 * reale Kalender-"jetzt" für die Segens-Multiplikatoren (Blessings of the Reach); ohne `nowMs`
 * neutral (Faktor 1), matcht die bestehenden Test-/Sim-Aufrufer.
 */
export function effectiveActionXpGain(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  nowMs?: number,
): number {
  // Thieving-Risiko (careful/bold) skaliert die Belohnung — wie in completeAction, für alle
  // anderen Skills ist rewardMult exakt 1.
  const risk = action.skill === "thieving" ? thievingRiskMods(state.thievingRisk) : null;
  const rewardMult = risk?.rewardMult ?? 1;
  return (
    action.xp
    * buffGatherXpMult(state, content)
    * rewardMult
    * shrineAmplifiedMult(blessingMult(nowMs, "xp"), campShrineBonus(state, content))
  );
}

/**
 * Kernprojektion: XP-Endstand + Anzeige-Eintrag (oder `null`) nach `executions` Ausführungen von
 * `actionId`, ausgehend von `startXp` (expliziter Anfangswert — der Aufrufer entscheidet, ob das
 * der ECHTE State-Wert ist oder ein bereits fortgeschriebener Kumulativ-Wert, s.
 * `computeQueueLevels`). `endXp` ist IMMER gesetzt, auch wenn `display` null ist (unverändertes
 * Level) — nachfolgende Einträge DESSELBEN Skills müssen trotzdem korrekt weiterzählen.
 * `executions === null` (∞-Ziel) liefert bewusst `endXp === startXp` (keine erfundene Zahl,
 * dieselbe Regel wie `computeQueueTiming` bei ∞-Einträgen) — ein nachfolgender Eintrag desselben
 * Skills rechnet dann so, als hätte der ∞-Lauf noch nichts beigetragen.
 */
function projectLevel(
  state: GameState,
  content: ContentDB,
  actionId: ActionId,
  executions: number | null,
  startXp: number,
  nowMs: number | undefined,
): { endXp: number; display: QueueLevelEntry | null } {
  if (executions === null || executions <= 0) return { endXp: startXp, display: null };
  const action = content.actions[actionId];
  if (!action) return { endXp: startXp, display: null }; // Content-Drift: Skill unbekannt, keine Zeile.
  const endXp = startXp + effectiveActionXpGain(state, content, action, nowMs) * executions;
  const fromLevel = levelFromXp(startXp);
  const toLevel = levelFromXp(endXp);
  return { endXp, display: fromLevel === toLevel ? null : { skillId: action.skill, fromLevel, toLevel } };
}

/**
 * Level-Projektion EINER Aktion über `executions` Ausführungen, ausgehend vom AKTUELLEN
 * State-Level ihres Skills (kein Kumulativ-Tracker) — für die "läuft"-Zeile im Panel, DIE IMMER
 * ZUERST abgearbeitet wird (kein Vorlauf nötig), UND für deren combinedTarget-Faltung: das Panel
 * faltet mehrere führende Warteschlangen-Einträge DERSELBEN Aktion optisch in die "läuft"-Zeile
 * (s. ActionQueuePanel.tsx `combineQueueTimingEntries`) — die Level-Zeile muss dieselbe
 * Gesamt-Ausführungszahl zeigen, sonst widerspricht sich die Anzeige selbst. Ruft der Aufrufer das
 * hier NICHT mit `state.actionTarget`, sondern mit dem gefalteten `combinedTarget` auf, bekommt er
 * exakt diese konsistente Zeile.
 */
export function projectActionLevel(
  state: GameState,
  content: ContentDB,
  actionId: ActionId,
  executions: number | null,
  nowMs?: number,
): QueueLevelEntry | null {
  const action = content.actions[actionId];
  const startXp = action ? (state.skills[action.skill]?.xp ?? 0) : 0;
  return projectLevel(state, content, actionId, executions, startXp, nowMs).display;
}

/**
 * Level-Projektion der GESAMTEN Warteschlange (Anzeige, ActionQueuePanel.tsx) — analog zu
 * `computeQueueTiming`. Läuft die Einträge in der REALEN Abarbeitungs-Reihenfolge durch (aktive
 * Aktivität zuerst, danach `state.actionQueue` von vorn nach hinten) und führt dabei einen
 * KUMULATIVEN XP-Stand PRO SKILL mit: Eintrag N startet auf dem Level, das die aktive Aktion
 * (Rest) plus alle vorherigen Einträge DESSELBEN Skills hinterlassen — verschiedene Skills laufen
 * getrennt (eigener Zähler je `skillId`, unbeteiligte Skills bleiben unangetastet).
 *
 * Kampf-Einträge (`kind: "fight"`) bleiben bewusst außen vor: Kampf-XP hängt am Kampfstil
 * (STR/DEX/INT) und der tatsächlichen Kill-Anzahl, nicht an `action.xp` — eine ehrliche
 * Projektion bräuchte eine eigene Kampf-XP-Quelle (combat.ts), die diese Warteschlangen-Projektion
 * nicht anfasst. Spätere Folgearbeit, kein Teil dieses Tasks.
 *
 * PERF: dieses Panel hat KEIN eigenes Selector-Gate — es liest `useGameState()` direkt und
 * rendert bereits ohne Zutun ~10×/s mit dem laufenden Game-Loop mit (s. ActionQueuePanel.tsx
 * Klassen-JSDoc). Diese Funktion fügt also KEINE neue Re-Render-Quelle hinzu, nur zusätzliche
 * Rechenarbeit in einem Render, der ohnehin schon passiert — gleiches Bild wie
 * `computeQueueTiming` (reine Berechnung, kein State, O(Warteschlangenlänge) mit billigen
 * Multiplikationen + einer binärsuchenden `levelFromXp`-Auflösung pro Eintrag).
 */
export function computeQueueLevels(state: GameState, content: ContentDB, nowMs?: number): QueueLevels {
  // 1) Aktuell laufende Aktivität zuerst — RAW (state.actionTarget), s. `QueueLevels.active`-JSDoc.
  const active = state.activeActionId !== null
    ? projectActionLevel(state, content, state.activeActionId, state.actionTarget, nowMs)
    : null;

  // Kumulativer XP-Tracker je Skill: startet lazy bei den ECHTEN State-Werten, wird durch die
  // aktive Aktion (Rest) und jeden Warteschlangen-Eintrag fortgeschrieben — GENAU EINMAL pro
  // Skill initialisiert (nicht bei jedem Zugriff neu aus dem State gelesen), sonst würde ein
  // zweiter Eintrag desselben Skills wieder beim ECHTEN Ist-Stand starten statt beim Stand NACH
  // dem ersten Eintrag.
  const xpBySkill = new Map<SkillId, number>();
  const currentXp = (skillId: SkillId): number => {
    let v = xpBySkill.get(skillId);
    if (v === undefined) {
      v = state.skills[skillId]?.xp ?? 0;
      xpBySkill.set(skillId, v);
    }
    return v;
  };

  // Die aktive Aktion (Rest-Ziel) bucht als ERSTES in den Tracker ein — reale
  // Abarbeitungsreihenfolge, wie in `computeQueueTiming` ("1) Aktuell laufende Aktivität").
  if (state.activeActionId !== null) {
    const action = content.actions[state.activeActionId];
    if (action) {
      const proj = projectLevel(state, content, state.activeActionId, state.actionTarget, currentXp(action.skill), nowMs);
      xpBySkill.set(action.skill, proj.endXp);
    }
  }

  // 2) Warteschlange in roher Reihenfolge, 1:1 zu `state.actionQueue` (Index-Parität, Muster
  // `computeQueueTiming`) — jeder Eintrag schreibt den Tracker SEINES Skills fort, ob er selbst
  // eine sichtbare Zeile bekommt oder nicht (Content-Drift/∞/unverändertes Level).
  const queue: (QueueLevelEntry | null)[] = state.actionQueue.map((entry) => {
    if (isFightQueueEntry(entry)) return null; // Kampf-XP bewusst außen vor, s. Funktions-JSDoc.
    const action = content.actions[entry.actionId];
    if (!action) return null; // Content-Drift: Skill unbekannt.
    const proj = projectLevel(state, content, entry.actionId, entry.target, currentXp(action.skill), nowMs);
    xpBySkill.set(action.skill, proj.endXp);
    return proj.display;
  });

  return { active, queue };
}
