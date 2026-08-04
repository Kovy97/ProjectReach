import type { CampBoostKind } from "@hearthforge/shared";
import { campBoostNote } from "../util/campBoostText";
import iconNewhaven from "../assets/ui/icon_newhaven.webp";

interface CampBoostNoteProps {
  kind: CampBoostKind;
  value: number;
  t: (key: string) => string;
}

/**
 * „Aus New Haven: {Wirkung}"-Zeile MIT dem New-Haven-Emblem davor (Asset von Codex/Mira,
 * 03.08. — Wachfeuer-Motiv, bei 14px lesbar). Reiner Präsentations-Wrapper um
 * `campBoostNote` (util/campBoostText.ts) für die Emblem-Attribution: die Wirkung stammt
 * sichtbar aus dem Lager, nicht anonym aus dem Nichts. Gleiche Signatur wie die Util-
 * Funktion (kind/value/t), damit der Tausch an jeder Aufrufstelle mechanisch bleibt.
 */
export function CampBoostNote({ kind, value, t }: CampBoostNoteProps): JSX.Element {
  return (
    <span className="camp-boost-note">
      <img src={iconNewhaven} alt="" className="camp-boost-note-ico" />
      {campBoostNote(kind, value, t)}
    </span>
  );
}
