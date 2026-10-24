// claude:2026-10-24T16:10:00+02:00 — Text-Schlüssel je Stoppgrund einer Aktion (inkl. level_too_low), eine Quelle für Kopfzeile, Warteschlange, Toast, Offline-Popup, Skill-Seite.
export function stopReasonKey(reason: string | null | undefined): string {
  if (reason === "inventory_full") return "skill.stoppedInventoryFull";
  if (reason === "level_too_low") return "skill.stoppedLevelTooLow";
  return "skill.stoppedNoMaterials";
}
