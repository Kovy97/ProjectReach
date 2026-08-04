import { getPortrait } from "../portraits";

interface PortraitProps {
  portraitId: string | null;
  size?: number;
}

/** Zeigt das gewählte Charakterbild oder einen leeren Platzhalter. */
export function Portrait({ portraitId, size = 96 }: PortraitProps): JSX.Element {
  const src = getPortrait(portraitId);
  return (
    <div className="portrait" style={{ width: size, height: size }}>
      {src ? (
        <img loading="lazy" decoding="async" src={src} alt="Charakterportrait" />
      ) : (
        <span className="portrait-empty">?</span>
      )}
    </div>
  );
}
