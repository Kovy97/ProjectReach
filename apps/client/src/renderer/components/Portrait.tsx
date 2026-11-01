import { getPortrait } from "../portraits";
import { useI18n } from "../i18n"; // claude:2026-10-31T15:45:00+01:00 — alt-Text über i18n

interface PortraitProps {
  portraitId: string | null;
  size?: number;
}

/** Zeigt das gewählte Charakterbild oder einen leeren Platzhalter. */
export function Portrait({ portraitId, size = 96 }: PortraitProps): JSX.Element {
  const { t } = useI18n();
  const src = getPortrait(portraitId);
  return (
    <div className="portrait" style={{ width: size, height: size }}>
      {src ? (
        <img loading="lazy" decoding="async" src={src} alt={t("character.portraitAlt")} />
      ) : (
        <span className="portrait-empty">?</span>
      )}
    </div>
  );
}
