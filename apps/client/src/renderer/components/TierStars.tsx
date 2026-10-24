// claude:2026-10-23T18:20:00+02:00 — Stufen-Anzeige (1.4.0 „Feder und Stahl“ ST, Chef 23.10.2026: „Sterne, bis sechs
// mit halben Sternen“). Stufe ÷ 2 Sterne: VII = 3½. Nur verdiente Sterne werden gezeichnet (keine leeren Plätze),
// damit die Zeile in kleinen Item-Feldern schmal bleibt. Stufe XIII (Raid) = sechs volle Sterne in Raritätsfarbe
// plus Krone. Inline-SVG statt Schriftzeichen: scharf bei 6 px und ohne Font-Abdeckung.
import { RAID_ITEM_TIER } from "@hearthforge/engine";
import { SHOW_ITEM_TIERS } from "../featureFlags";
import { getUiIcon } from "../uiIcons";

// claude:2026-10-25T12:50:00+02:00 — gemalte Krone (Asset-Liste Gruppe E `icon_tier_crown`) gewinnt, sobald geliefert; bis dahin die SVG-Krone.
const CROWN_ICON_URL = getUiIcon("icon_tier_crown");

const STAR = "M5 0.4 6.35 3.6 9.8 3.9 7.2 6.15 7.95 9.55 5 7.75 2.05 9.55 2.8 6.15 0.2 3.9 3.65 3.6Z";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];
/** Römische Stufenzahl (für Texte „Stufe VII“). */
export function tierRoman(tier: number): string {
  return ROMAN[tier] ?? String(tier);
}

export function TierStars({ tier, className = "", color }: { tier: number; className?: string; color?: string }): JSX.Element | null {
  if (!SHOW_ITEM_TIERS) return null; // claude:2026-10-24T17:47:00+02:00 — Stufen vorläufig aus (Chef 24.10.)
  if (!tier || tier < 1) return null;
  const raid = tier >= RAID_ITEM_TIER;
  const full = raid ? 6 : Math.floor(tier / 2);
  const half = !raid && tier % 2 === 1;
  const stars: JSX.Element[] = [];
  for (let i = 0; i < full; i++) {
    stars.push(
      <svg key={i} className="tier-star" viewBox="0 0 10 10" aria-hidden="true">
        <path d={STAR} fill="currentColor" />
      </svg>,
    );
  }
  if (half) {
    stars.push(
      <svg key="h" className="tier-star tier-star--half" viewBox="0 0 10 10" aria-hidden="true">
        <path d={STAR} fill="currentColor" opacity="0.28" />
        <path d={STAR} fill="currentColor" clipPath="inset(0 50% 0 0)" style={{ clipPath: "inset(0 50% 0 0)" }} />
      </svg>,
    );
  }
  return (
    <span className={`tier-stars${raid ? " tier-stars--raid" : ""} ${className}`.trim()} style={color ? { color } : undefined}>
      {stars}
      {raid && CROWN_ICON_URL && <img src={CROWN_ICON_URL} alt="" className="tier-crown tier-crown--img" />}
      {raid && !CROWN_ICON_URL && (
        <svg className="tier-crown" viewBox="0 0 12 10" aria-hidden="true">
          <path d="M1 8.5 0.4 2.2 3.4 4.6 6 0.6 8.6 4.6 11.6 2.2 11 8.5Z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}
