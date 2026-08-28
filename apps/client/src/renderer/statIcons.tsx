import { getUiIcon } from "./uiIcons";

/**
 * Geteilte Icon-Helfer für Status-Effekte (burn/frost/shock/poison/bleed) und Kampf-Stats
 * (hp/atk/def/acc/eva/spd/gold). Rendert echte PNGs wo vorhanden, fällt sonst auf Emoji zurück.
 * Ursprünglich nur in CombatPage.tsx — jetzt geteilt (u.a. BestiaryPage), damit Bestiarium und
 * Kampfbildschirm dieselben Icons zeigen statt reiner Emoji-Duplikate.
 */

// Elementar-Effekte (28.08.2026): "void" (Entzug/Leere) ist als sechster StatusType dazugekommen.
// Kein bemaltes icon_status_void.webp im Bestand (die fünf Nachbarn sind alle Mira-Gemälde) —
// Dev-Rückfall auf ein thematisch passendes Emoji (Drain-Wirbel) statt des generischen "✦"
// (s. renderEffectIcon-Default unten), bis Mira ein echtes Icon im Stil der Nachbarn liefert.
const EFFECT_ICON: Record<string, string> = { burn: "🔥", frost: "❄️", shock: "⚡", poison: "🟢", bleed: "🩸", void: "🌀" };

// PNG-URLs für Status-Effekt-Icons (null → Emoji-Fallback aus EFFECT_ICON)
const EFFECT_ICON_URLS: Record<string, string | null> = {
  burn:   getUiIcon("icon_status_burn"),
  frost:  getUiIcon("icon_status_frost"),
  shock:  getUiIcon("icon_status_shock"),
  poison: getUiIcon("icon_status_poison"),
  bleed:  getUiIcon("icon_status_bleed"),
  // Noch kein PNG unter assets/icons/ (Auto-Discovery greift automatisch, sobald Mira
  // icon_status_void.webp liefert) — bis dahin liefert getUiIcon hier null.
  void:   getUiIcon("icon_status_void"),
};

export function renderEffectIcon(type: string): JSX.Element | string {
  const url = EFFECT_ICON_URLS[type];
  return url
    ? <img loading="lazy" decoding="async" src={url} alt="" className="ui-icon" />
    : (EFFECT_ICON[type] ?? "✦");
}

// Stat-Icon-Helfer: gibt <img loading="lazy" decoding="async" class="ui-icon"> zurück, fällt auf Emoji zurück wenn kein PNG.
// Icons ohne Entsprechung (⭐ XP, ♻ Regen, 😡 Enrage, ☠ Kills) bleiben Emoji.
const STAT_ICON_KEYS: Record<string, string> = {
  hp:   "icon_attribute_hp",
  atk:  "icon_attribute_meeledamage",
  def:  "icon_attribute_defense",
  acc:  "icon_attribute_accuracy",
  eva:  "icon_attribute_evasion",
  spd:  "icon_attribute_attack_speed",
  gold: "icon_goldcoin",
  // Rüstungs-Trinität (Stoff-Ward, Spec §8): eigenes Icon-Key, fällt bis content-dev ein PNG
  // liefert auf ein arkanes Kristall-Emoji zurück (bewusst NICHT 🛡, das ist schon "def").
  ward: "icon_attribute_ward",
};
const STAT_ICON_FALLBACK: Record<string, string> = {
  hp: "❤", atk: "⚔", def: "🛡", acc: "🎯", eva: "💨", spd: "⏱", gold: "🪙", ward: "🔷",
};
export function statIcon(key: string): JSX.Element | string {
  const iconName = STAT_ICON_KEYS[key];
  if (iconName) {
    const url = getUiIcon(iconName);
    if (url) return <img loading="lazy" decoding="async" src={url} alt="" className="ui-icon" />;
  }
  return STAT_ICON_FALLBACK[key] ?? "·";
}
