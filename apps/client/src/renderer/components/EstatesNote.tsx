// claude:2026-10-23T19:10:00+02:00 — Ländereien in der Kopfzeile (1.4.0 „Feder und Stahl“ LA, Chef 23.10.2026):
// Solange Felder oder Fallen arbeiten, steht nie „Untätig“ im Kopf, sondern „Nebenbei: 6 Felder, 4 Fallen“ — auch
// als Zusatz während einer Hauptaktion. Primitiv-Selektor (Zahlen-String), damit der Kopf nur bei Änderungen rendert.
import { content } from "@hearthforge/content";
import { estateStatus } from "@hearthforge/engine";
import { useGameSelector } from "../game/GameContext";
import { useI18n } from "../i18n";

/** Kurztext „Nebenbei: 6 Felder, 4 Fallen“ oder null, wenn keine Ländereien arbeiten. */
export function useEstatesNote(): string | null {
  const { t, locale } = useI18n();
  const key = useGameSelector((s) => {
    const e = estateStatus(s, content);
    return `${e.plotsGrowing}|${e.trapsRunning}`;
  });
  const [plots = 0, traps = 0] = key.split("|").map(Number);
  if (plots === 0 && traps === 0) return null;
  // claude:2026-10-24T15:30:00+02:00 — Einzahl/Mehrzahl nach Sprachregel (ru: 1 / 2-4 / 5+), sonst 1 gegen den Rest (QA2 UI N5)
  const form = (n: number, base: "plot" | "trap"): string => {
    if (locale === "ru") {
      const cat = new Intl.PluralRules("ru").select(n);
      if (cat === "one") return `estates.note.${base}`;
      if (cat === "few") return `estates.note.${base}s.few`;
      return `estates.note.${base}s`;
    }
    return n === 1 ? `estates.note.${base}` : `estates.note.${base}s`;
  };
  const parts: string[] = [];
  if (plots > 0) parts.push(t(form(plots, "plot")).replace("{n}", String(plots)));
  if (traps > 0) parts.push(t(form(traps, "trap")).replace("{n}", String(traps)));
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
