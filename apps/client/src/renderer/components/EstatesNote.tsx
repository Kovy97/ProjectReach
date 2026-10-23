// claude:2026-10-23T19:10:00+02:00 — Ländereien in der Kopfzeile (1.4.0 „Feder und Stahl“ LA, Chef 23.10.2026):
// Solange Felder oder Fallen arbeiten, steht nie „Untätig“ im Kopf, sondern „Nebenbei: 6 Felder, 4 Fallen“ — auch
// als Zusatz während einer Hauptaktion. Primitiv-Selektor (Zahlen-String), damit der Kopf nur bei Änderungen rendert.
import { content } from "@hearthforge/content";
import { estateStatus } from "@hearthforge/engine";
import { useGameSelector } from "../game/GameContext";
import { useI18n } from "../i18n";

/** Kurztext „Nebenbei: 6 Felder, 4 Fallen“ oder null, wenn keine Ländereien arbeiten. */
export function useEstatesNote(): string | null {
  const { t } = useI18n();
  const key = useGameSelector((s) => {
    const e = estateStatus(s, content);
    return `${e.plotsGrowing}|${e.trapsRunning}`;
  });
  const [plots = 0, traps = 0] = key.split("|").map(Number);
  if (plots === 0 && traps === 0) return null;
  const parts: string[] = [];
  if (plots > 0) parts.push(t(plots === 1 ? "estates.note.plot" : "estates.note.plots").replace("{n}", String(plots)));
  if (traps > 0) parts.push(t(traps === 1 ? "estates.note.trap" : "estates.note.traps").replace("{n}", String(traps)));
  return t("estates.note").replace("{list}", parts.join(", "));
}

/** Zusatz hinter der laufenden Aktivität (rendert nichts, wenn keine Ländereien arbeiten). */
export function EstatesNote({ className = "" }: { className?: string }): JSX.Element | null {
  const note = useEstatesNote();
  if (!note) return null;
  return <span className={`estates-note ${className}`.trim()}>{" · "}{note}</span>;
}

/** Ersatz für „Untätig“: zeigt die Ländereien, sonst den übergebenen Leerlauf-Text. */
export function IdleOrEstates({ idleText, className }: { idleText: string; className: string }): JSX.Element {
  const note = useEstatesNote();
  return <span className={`${className}${note ? " estates-note-active" : ""}`}>{note ?? idleText}</span>;
}
