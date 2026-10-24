import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import { content } from "@hearthforge/content";
import { computeStats, countSetPieces, meetsRequirements, spellFocusMult, itemTier } from "@hearthforge/engine";
import type { AffixDef, ContentDB, EquipBonus, EquipSlot, ItemDef, ItemInstance, LocalizedString, SetDef, SetEffectDef, SetTierDef } from "@hearthforge/shared";
import { ARROW_TIER_RANGED_LEVEL, ATTRIBUTES, EQUIP_SLOT_LABELS, TOOL_SLOTS, WEAPON_TYPE_SPECIALTY, effectiveWeaponEffects, isStatusEffectType, enchantSlotsFor, getItemRarity, RARITY_LABEL, instanceDisplayName, instanceBonusDelta, DEFENSE_MITIGATION_K, DEFENSE_MITIGATION_MAX, consumableHeal, TEMPO_REDUCTION_CAP } from "@hearthforge/shared";
import { isEnchantable, runeFitsHint, runeTargetLabel } from "../runeTargets";
import { useGameStateMaybe } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { getSkillIcon, SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getUiIcon } from "../uiIcons";
import { openItemWikiModal } from "./ItemWikiModal";
import { AreaTourGuide } from "./AreaTourGuide";
import { ITEM_CARD_TOUR_STEPS } from "../areaTourSteps";
import { registerEscCloser } from "../util/escStack";
import { formatDamage, formatNum, formatPct2, formatSeconds1, formatStat } from "../util/format";
import { isTooltipImagePopupEnabled } from "../util/uiPrefs";

/**
 * Item-Bild mit Fake-3D-Karten-Effekt (Chef): Hover über das Bild → es wächst und kippt nach der
 * Mausposition (Parallaxe), damit man es betrachten kann; verlässt die Maus die Bild-Hitbox,
 * schrumpft es weich zurück in den Rahmen. Direkte Ref-Style-Manipulation (kein Re-Render pro
 * mousemove); der weiche Übergang kommt aus der CSS-`transition` auf `.itip-img`.
 *
 * SCHÄRFE (Chef Bild #67, „Bildqualität beim Hover so schlecht"): `transform: scale(2.1)` auf einem
 * klein GELAYOUTETEN img vergrößerte nur dessen Compositing-Rasterung (will-change pinnt sie auf
 * die Layout-Größe) — die 640px-Quelle wurde beim Zoom nie ausgeschöpft. Deshalb der Downscale-
 * Trick: das img wird in der ZIELGRÖSSE gelayoutet (210% der Ruhe-Box, Rasterung entsprechend
 * scharf) und im Ruhezustand per CSS `scale(0.476)` verkleinert gezeigt; der Hover hebt den Scale
 * nur auf (0.476 × 2.1 = 1.0) — gleiche Optik wie vorher, aber der Zoom zeigt die volle Auflösung.
 * Der Wrapper (.itip-tilt-wrap) übernimmt die alte Layout-Rolle des Bildes in der Bühne.
 */
const TILT_BASE = "translate(-50%, -50%)"; // Zentrierung im .itip-tilt-wrap (s. components.css)

function TiltImage({ src, className }: { src: string; className?: string }): JSX.Element {
  const ref = useRef<HTMLImageElement>(null);
  // Chef-Option (Optionsmenü, Default an): ist der Tooltip-Bild-Popup deaktiviert, zeigen wir das Bild
  // statisch — ohne Tilt/Scale/Overflow-Effekt (kein Hover-Handler nötig).
  if (!isTooltipImagePopupEnabled()) {
    return <img loading="lazy" decoding="async" src={src} alt="" className={className} />;
  }
  return (
    <span className="itip-tilt-wrap">
      <img
        ref={ref}
        loading="lazy"
        decoding="async"
        src={src}
        alt=""
        className={`${className ?? ""} itip-tilt-img`}
        onMouseMove={(e) => {
          const el = ref.current;
          const wrap = el?.parentElement;
          if (!el || !wrap) return;
          // Chef Bild #68b (2026-07-11): der frühere `panel.style.overflow = "visible"`-Hack
          // (Chef #44, damit das Bild herauswachsen kann) machte den Tooltip unscrollbar und ließ
          // langen Inhalt unten überlaufen. Jetzt wird das BILD selbst beim Hover per
          // position:fixed aus dem Clip-/Scroll-Kontext des Panels gehoben — der Panel behält
          // overflow-y:auto, nur das Bild schwebt frei darüber. Der Wechsel absolute→fixed ist
          // visuell nahtlos (identische Box), die scale-Transition (0.476→1) animiert wie zuvor.
          if (el.style.position !== "fixed") {
            const wr = wrap.getBoundingClientRect();
            el.style.position = "fixed";
            el.style.width = `${wr.width * 2.1}px`;
            el.style.height = `${wr.height * 2.1}px`;
            el.style.left = `${wr.left + wr.width / 2}px`;
            el.style.top = `${wr.top + wr.height / 2}px`;
            el.style.zIndex = "10000";
            // Ein transform-Ahne würde fixed zu seinem containing block machen → einmal messen
            // und die Abweichung herauskorrigieren (deckt Reveal-Animationen etc. ab).
            const check = el.getBoundingClientRect();
            const dx = check.left + check.width / 2 - (wr.left + wr.width / 2);
            const dy = check.top + check.height / 2 - (wr.top + wr.height / 2);
            if (dx !== 0 || dy !== 0) {
              el.style.left = `${wr.left + wr.width / 2 - dx}px`;
              el.style.top = `${wr.top + wr.height / 2 - dy}px`;
            }
          }
          const r = el.getBoundingClientRect(); // post-transform → entspricht der SICHTBAREN Box
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          // Kippwinkel nach Cursor-Offset (±26°, Chef: stärker); scale(1) ⇒ volle Layout-Größe
          // = 2.1× der Ruhe-Darstellung (Chef: sichtbar aus dem Rahmen heraustreten).
          el.style.transform = `${TILT_BASE} perspective(700px) rotateY(${(px * 26).toFixed(2)}deg) rotateX(${(-py * 26).toFixed(2)}deg) scale(1)`;
        }}
        onMouseLeave={() => {
          const el = ref.current;
          if (!el) return;
          // Alle Hover-Inline-Styles räumen → CSS-Basiszustand (absolute im Wrapper, scale 0.476).
          el.style.position = "";
          el.style.width = "";
          el.style.height = "";
          el.style.left = "";
          el.style.top = "";
          el.style.zIndex = "";
          el.style.transform = "";
        }}
      />
    </span>
  );
}
import { masterPerkText } from "../util/masterPerkProse";
import { weaponEffectProse } from "../util/weaponEffectProse";
import { formatSetModifiers } from "./EquipmentOverview";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
// claude:2026-10-26T08:00:00+02:00 — Raritäts-Symbole Heroisch/Mythisch (1.4.0 Raid) vor dem Raritätsnamen; null, bis die Datei im Spiel liegt.
const RAID_RARITY_ICON: Partial<Record<string, string | null>> = {
  heroic: getUiIcon("icon_rarity_heroic"),
  mythic: getUiIcon("icon_rarity_mythic"),
};

/** attr-id → neues UI-Icon (PNG) für Attribut-Modifier-Zeilen. */
const ATTR_UI: Record<string, string> = {
  str: "icon_attribute_strength",
  dex: "icon_attribute_dexterity",
  con: "icon_attribute_constitution",
  int: "icon_attribute_intelligence",
  wis: "icon_attribute_wisdom",
  lck: "icon_attribute_luck",
};

/** status-effect-type → neues UI-Icon (PNG). */
const STATUS_UI: Record<string, string> = {
  burn: "icon_status_burn",
  frost: "icon_status_frost",
  shock: "icon_status_shock",
  poison: "icon_status_poison",
  bleed: "icon_status_bleed",
  // Elementar-Effekte (28.08.2026): kein Mira-PNG im Bestand — Auto-Discovery greift, sobald
  // icon_status_void.webp geliefert wird (statIcons.tsx EFFECT_ICON_URLS-Kommentar).
  void: "icon_status_void",
};

/** Stat-Icon: neues PNG (falls vorhanden), sonst Emoji-Fallback. */
function statIcon(uiName: string, emoji: string): string | JSX.Element {
  const url = uiName ? getUiIcon(uiName) : null;
  return url ? <img loading="lazy" decoding="async" src={url} alt="" className="ui-icon" /> : emoji;
}

/** Icon für eine Skill-Boost-Zeile (§4): das Kampf-Skill-PNG (assets/skills/<id>.png) oder Emoji
 *  (zentraler Fallback aus skillIcons.ts — vorher eigene Teilmenge `SKILL_BOOST_EMOJI` hier). */
function skillBoostIcon(skillId: string): string | JSX.Element {
  const url = getSkillIcon(skillId);
  return url
    ? <img loading="lazy" decoding="async" src={url} alt="" className="ui-icon" />
    : (SKILL_EMOJI_FALLBACK[skillId] ?? "⇑");
}

/** Eine Aktion im Tooltip-Footer (z.B. Ausrüsten/Benutzen/Verkaufen). */
export interface ItemAction {
  key: string;
  label: string;
  onClick: () => void;
}

interface TooltipPayload {
  itemId: string;
  /** Optional instance — shows instance display name and affix list. */
  instance?: ItemInstance;
  x: number;
  y: number;
  pinned: boolean;
  actions: ItemAction[];
}

// ── Modul-globaler Mini-Store (kein Context → Hover rendert nicht die ganze App) ──
let current: TooltipPayload | null = null;
const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
const store = {
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: (): TooltipPayload | null => current,
  show(p: TooltipPayload): void {
    current = p;
    emit();
  },
  hide(): void {
    if (current) {
      current = null;
      emit();
    }
  },
  isPinnedFor(itemId: string): boolean {
    return !!current?.pinned && current.itemId === itemId;
  },
};

/** Handlers für eine Item-Zelle: Hover ≥1s zeigt, Linksklick pinnt das Tooltip. */
export function useItemTooltip(): {
  show: (itemId: string, x: number, y: number, actions: ItemAction[], instance?: ItemInstance) => void;
  pin: (itemId: string, x: number, y: number, actions: ItemAction[], instance?: ItemInstance) => void;
  hide: () => void;
} {
  return {
    show: (itemId, x, y, actions, instance) => store.show({ itemId, instance, x, y, pinned: false, actions }),
    pin: (itemId, x, y, actions, instance) => {
      if (store.isPinnedFor(itemId)) store.hide();
      else store.show({ itemId, instance, x, y, pinned: true, actions });
    },
    hide: () => {
      if (!current?.pinned) store.hide();
    },
  };
}

/**
 * Hard-Reset des Tooltip-Stores — schließt unbedingt, auch ein GEPINNTES Tooltip (anders als
 * `useItemTooltip().hide`, das gepinnte Tooltips bewusst offen lässt). Für App-weite Screen-
 * Wechsel gedacht (Kosmetik-Sweep T1: nach dem Laden eines Spielstands blieb gelegentlich ein
 * Item-Detail-Popup aus der vorherigen Ansicht — Menü-Slot-Karten sind ebenfalls Item-Zellen —
 * hängen, weil der Store modul-global ist und den Screen-Wechsel selbst nicht mitbekommt).
 * Aufgerufen einmal beim Mount von MainLayout (App.tsx).
 */
export function closeItemTooltip(): void {
  store.hide();
}

// ── Module-level helpers ───────────────────────────────────────────────────────

/** ATTRIBUTE id → LocalizedString name lookup */
const ATTR_NAME: Record<string, LocalizedString> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.id, a.name]),
);

// claude:2026-10-23T17:40:00+02:00 — buildItemTypeLine wohnt jetzt in util/itemTypeLine.ts (testbar ohne DOM).
import { buildItemTypeLine } from "../util/itemTypeLine";
import { TierStars, tierRoman } from "./TierStars";
import { SHOW_ITEM_TIERS } from "../featureFlags";
export { buildItemTypeLine };

/** Icon per status-effect type. */
export function statusEffectIcon(type: string): string {
  const m: Record<string, string> = {
    burn: "🔥",
    frost: "❄️",
    shock: "⚡",
    poison: "☠️",
    bleed: "🩸",
    void: "🌀",
  };
  return m[type] ?? "✶";
}

/** Icon per attribute id. */
export function attributeIcon(attr: string): string {
  const m: Record<string, string> = {
    str: "💪",
    dex: "🏃",
    con: "🏋️",
    int: "🧠",
    wis: "📖",
    lck: "🍀",
  };
  return m[attr] ?? "✶";
}

/**
 * Formats a numeric bonus with sign, rounded to a whole number (formatStat, Chef #239: no more
 * decimal crumbs like "+7.8" on stat/tooltip displays). After the ÷10 stat squish, raw item/
 * affix/suffix bonuses can be non-round floats (e.g. 0.4, 1.4) or float noise like
 * "0.4000000001" (Sweep 5, Squish-Follow-up) — formatStat's rounding absorbs both. Does NOT
 * change the underlying value, only the display.
 */
export function fmtBonus(v: number): string {
  const s = formatStat(v);
  return v >= 0 ? `+${s}` : s;
}

/**
 * Kompakte Wert-Zusammenfassung eines Affix bei gegebenem Tier: flache Boni + Attribut-Mods +
 * optionaler Waffeneffekt-Proc, als Einzel-Einträge. Der Proc-Eintrag ("15% Brand · 4/s") ist EIN
 * zusammenhängendes Element — wer diese Liste zeilenweise darstellt (statt sie nur zu joinen),
 * darf ihn nicht an seinem inneren " · " weiter aufsplitten.
 */
export function affixEffectParts(
  def: AffixDef,
  tier: number,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string[] {
  const parts: string[] = [];
  const b = def.bonusByTier?.[tier - 1];
  if (b) {
    if (b.meleeDamage) parts.push(`${fmtBonus(b.meleeDamage)} ${t("stat.meleeDamage")}`);
    if (b.rangedDamage) parts.push(`${fmtBonus(b.rangedDamage)} ${t("stat.rangedDamage")}`);
    if (b.magicDamage) parts.push(`${fmtBonus(b.magicDamage)} ${t("stat.magicDamage")}`);
    if (b.defense) parts.push(`${fmtBonus(b.defense)} ${t("stat.defense")}`);
    if (b.accuracy) parts.push(`${fmtBonus(b.accuracy)} ${t("stat.accuracy")}`);
    if (b.evasion) parts.push(`${fmtBonus(b.evasion)} ${t("stat.evasion")}`);
    if (b.maxHp) parts.push(`${fmtBonus(b.maxHp)} ${t("stat.hp")}`);
    // #304: hpRegenPerSec-Werte leben seit dem Regen-Rollback (#302) wieder im 0.1–0.5/s-Band —
    // formatStat rundet 0 Dezimalen, verschluckte also fast jeden Wert zu "+0/s" (Wurzel des
    // alten L1-Contentunfalls: der Content wurde zehnfach hochgepumpt, um sichtbar zu bleiben).
    // formatDamage (≤1 Dezimale) statt formatStat, überall wo hpRegenPerSec angezeigt wird.
    if (b.hpRegenPerSec) parts.push(`+${formatDamage(b.hpRegenPerSec)}/s ${t("stat.hpRegen")}`);
    if (b.critChance) parts.push(`+${Math.round(b.critChance * 100)}% ${t("stat.critChance")}`);
    if (b.critDamage) parts.push(`+${Math.round(b.critDamage * 100)}% ${t("stat.critDamage")}`);
    if (b.attackIntervalMs) {
      const v = b.attackIntervalMs;
      parts.push(`${v > 0 ? "+" : ""}${formatSeconds1(v / 1000)}s ${t("itip.attackSpeed")}`);
    }
  }
  const mods = def.modifiersByTier?.[tier - 1];
  if (mods) {
    for (const [attr, v] of Object.entries(mods)) {
      if (v) {
        const ls = ATTR_NAME[attr];
        parts.push(`${fmtBonus(v)} ${ls ? tr(ls) : attr.toUpperCase()}`);
      }
    }
  }
  // Rüstungs-Trinität (Itemization 2.5 §6.2): Klassen-Schicht-Runen (Ägide/Ausweichen/Abwehr/
  // Bollwerk) tragen ihren Bonus NICHT in `bonusByTier`, sondern in `trinityByTier` — ohne diesen
  // Zweig zeigten Trinity-Runen HIER (und in der EnchantingPage-Vorschau, die dieselbe Funktion
  // nutzt) gar keine Effektzeile (stiller Bug, gefixt für #219). Eigene Roh-Feld-Labels
  // (stat.armorRating/…), getrennt von den aggregierten %-Labels (stat.armor/dodge/block/wardPool),
  // weil diese Zeile den flachen Item-EIGENEN Beitrag zeigt statt den aggregierten Char-Wert.
  const tri = def.trinityByTier?.[tier - 1];
  if (tri) {
    if (tri.armorRating) parts.push(`${fmtBonus(tri.armorRating)} ${t("stat.armorRating")}`);
    if (tri.evasionRating) parts.push(`${fmtBonus(tri.evasionRating)} ${t("stat.evasionRating")}`);
    if (tri.wardCapacity) parts.push(`${fmtBonus(tri.wardCapacity)} ${t("stat.wardCapacity")}`);
    if (tri.blockChance) parts.push(`+${Math.round(tri.blockChance * 100)}% ${t("stat.blockChance")}`);
  }
  // Waffeneffekt-Proc: WoW-Stil-Fließtext (Waffen 2.0 §7.2), mit Runen-Präfix „[Flammend] {Template}"
  // — dieselbe Vorlage wie die Basis-Waffeneffekte im Tooltip UND die EnchantingPage-Vorschau.
  const eff = def.weaponEffectByTier?.[tier - 1];
  if (eff) {
    parts.push(`[${tr(def.prefix)}] ${weaponEffectProse(eff, t)}`);
  }
  return parts;
}

/**
 * Kompakte Wert-Zusammenfassung des SUFFIX-Anteils einer Instanz (WoW-Stil-Roll, „des Tigers" o.ä.)
 * — Pendant zu `affixEffectParts`, aber für `inst.suffix` statt einen Affix. Isoliert den Suffix-
 * Beitrag über eine temporäre suffix-only-Instanz (derselbe Trick wie `SuffixGroup`s `fakeInst`),
 * damit Affix-Boni NICHT versehentlich mit hineingerechnet werden. Welle VV (Varianten-Pouch-
 * Redesign): Grundlage der Stat-Chips je Zeile, damit man den Suffix-Beitrag sieht, ohne den vollen
 * Tooltip zu öffnen.
 */
export function suffixEffectParts(
  inst: ItemInstance,
  contentDb: ContentDB,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string[] {
  const sfx = inst.suffix;
  if (!sfx) return [];
  const fakeInst: ItemInstance = { instanceId: "", baseItemId: inst.baseItemId, affixes: [], suffix: sfx };
  const { bonus, modifiers, skillBoost } = instanceBonusDelta(fakeInst, contentDb);
  const parts: string[] = [];
  if (bonus.meleeDamage) parts.push(`${fmtBonus(bonus.meleeDamage)} ${t("stat.meleeDamage")}`);
  if (bonus.rangedDamage) parts.push(`${fmtBonus(bonus.rangedDamage)} ${t("stat.rangedDamage")}`);
  if (bonus.magicDamage) parts.push(`${fmtBonus(bonus.magicDamage)} ${t("stat.magicDamage")}`);
  if (bonus.defense) parts.push(`${fmtBonus(bonus.defense)} ${t("stat.defense")}`);
  if (bonus.accuracy) parts.push(`${fmtBonus(bonus.accuracy)} ${t("stat.accuracy")}`);
  if (bonus.evasion) parts.push(`${fmtBonus(bonus.evasion)} ${t("stat.evasion")}`);
  if (bonus.maxHp) parts.push(`${fmtBonus(bonus.maxHp)} ${t("stat.hp")}`);
  if (bonus.hpRegenPerSec) parts.push(`+${formatDamage(bonus.hpRegenPerSec)}/s ${t("stat.hpRegen")}`);
  if (bonus.maxMana) parts.push(`${fmtBonus(bonus.maxMana)} ${t("stat.maxMana")}`);
  if (bonus.critChance) parts.push(`+${Math.round(bonus.critChance * 100)}% ${t("stat.critChance")}`);
  if (bonus.critDamage) parts.push(`+${Math.round(bonus.critDamage * 100)}% ${t("stat.critDamage")}`);
  if (bonus.lifesteal) parts.push(`+${Math.round(bonus.lifesteal * 100)}% ${t("stat.lifesteal")}`);
  if (bonus.attackIntervalMs) {
    const v = bonus.attackIntervalMs;
    parts.push(`${v > 0 ? "+" : ""}${formatSeconds1(v / 1000)}s ${t("itip.attackSpeed")}`);
  }
  for (const [attr, v] of Object.entries(modifiers)) {
    if (v) {
      const ls = ATTR_NAME[attr];
      parts.push(`${fmtBonus(v)} ${ls ? tr(ls) : attr.toUpperCase()}`);
    }
  }
  for (const [id, v] of Object.entries(skillBoost)) {
    if (v) {
      const skill = contentDb.skills[id];
      const label = skill ? tr(skill.name) : id;
      parts.push(`${fmtBonus(v)} ${label}`);
    }
  }
  return parts;
}

// ── Shared sub-components ──────────────────────────────────────────────────────

/** A single stat row: icon | label ............ value (+ optionales ▲/▼-Delta). */
export function StatRow({
  icon,
  label,
  value,
  unmet = false,
  tone,
  delta,
}: {
  icon: string | JSX.Element;
  label: string;
  value: string;
  unmet?: boolean;
  tone?: string;
  /** ▲/▼-Vergleichs-Delta (Chef-GO) — ständig sichtbar (kein Shift nötig), s. `DeltaTag`. */
  delta?: JSX.Element | null;
}): JSX.Element {
  const toneStyle = tone ? { color: tone } : undefined;
  return (
    <div className={`itip-stat-row${unmet ? " itip-stat-unmet" : ""}`}>
      <span className="itip-stat-icon" aria-hidden="true">{icon}</span>
      <span className="itip-stat-label" style={toneStyle}>{label}</span>
      <span className="itip-stat-value" style={toneStyle}>{value}</span>
      {delta}
    </div>
  );
}

/** Stat-Gruppen-Wrapper (Design #3 „Path of Exile", Task #210): Kapitälchen-Label + Zeilen,
 *  Haarlinien-Trenner zum nächsten Block via CSS (.itip-group + border-bottom). Rendert nur,
 *  wenn der Aufrufer bereits geprüft hat, dass es etwas zu zeigen gibt (jede *Group-Komponente
 *  gibt selbst null zurück, wenn ihre Zeilenliste leer ist). */
// codex:2026-08-01T10:55:00+02:00 — Semantische Modifier erlauben eine lesbare, gruppenspezifische
// Präsentation, ohne Werteberechnung oder Lokalisierung zu duplizieren.
function StatGroupWrapper({ title, children, className }: { title: string; children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`itip-group${className ? ` ${className}` : ""}`}>
      <div className="itip-group-title">{title}</div>
      {children}
    </div>
  );
}

// ── Shift-Compare-Pfeile (Chef-Feature) ─────────────────────────────────────────
// Pro Stat-Zeile (Attribute, Skill-Boosts, Waffen-/Rüstungs-Stats) im WoW-Stil-Vergleichs-Tooltip:
// grün-hoch wenn DIESE Seite bei diesem Stat besser ist als die verglichene Seite, rot-runter wenn
// schlechter. Fehlende Stats zählen als 0 (Chef-Vorgabe).

/** EquipBonus-Felder, die im Vergleich berücksichtigt werden (Waffen-/Rüstungs-Stats). */
const BONUS_COMPARE_KEYS: (keyof EquipBonus)[] = [
  "meleeDamage",
  "rangedDamage",
  "magicDamage",
  "defense",
  "accuracy",
  "evasion",
  "maxHp",
  "hpRegenPerSec",
  "maxMana",
  "critChance",
  "critDamage",
  "attackIntervalMs",
  // Spieler-Report 30.08.2026 (L1GR): fehlte hier, darum trug die Lebensraub-Zeile kein Vergleichs-Delta.
  "lifesteal",
];

/** Attribut-Modifier-Keys werden als `mod:<attr>` geführt, Skill-Boosts als `boost:<skillId>`. */
function modKey(attr: string): string {
  return `mod:${attr}`;
}
function boostKey(skillId: string): string {
  return `boost:${skillId}`;
}

/** `attackIntervalMs`: NIEDRIGER ist besser (schnellerer Angriff) — alle anderen Keys: höher = besser. */

/**
 * Aggregierte Vergleichswerte eines Items + seiner Instanz (Affixe + Suffix via
 * `instanceBonusDelta`) für den Shift-Compare: Basis-`bonus`/`modifiers`/`skillBoost` plus
 * Instanz-Deltas, summiert je Key. Reine Funktion, kein Rendering.
 */
function buildCompareMap(item: ItemDef, inst: ItemInstance | undefined): Record<string, number> {
  const map: Record<string, number> = {};
  const addBonus = (b: EquipBonus | undefined): void => {
    if (!b) return;
    for (const k of BONUS_COMPARE_KEYS) if (b[k]) map[k] = (map[k] ?? 0) + (b[k] ?? 0);
  };
  addBonus(item.bonus);
  // Rüstungs-Trinität (Itemization 2.5): armorRating/evasionRating/wardCapacity/blockChance leben
  // direkt auf ItemDef (NICHT in EquipBonus, nie auf Affixen/Suffixen — s. shared/index.ts JSDoc),
  // also separat aus dem Item selbst statt über addBonus/instanceBonusDelta aggregiert.
  if (item.armorRating) map.armorRating = (map.armorRating ?? 0) + item.armorRating;
  if (item.evasionRating) map.evasionRating = (map.evasionRating ?? 0) + item.evasionRating;
  if (item.wardCapacity) map.wardCapacity = (map.wardCapacity ?? 0) + item.wardCapacity;
  if (item.blockChance) map.blockChance = (map.blockChance ?? 0) + item.blockChance;
  // Combat-Depth Konter-Play-Signaturen (§3.3): dieselbe Behandlung wie die Trinity-Felder oben —
  // leben direkt auf ItemDef, nicht in `bonus`.
  if (item.armorPen) map.armorPen = (map.armorPen ?? 0) + item.armorPen;
  if (item.precision) map.precision = (map.precision ?? 0) + item.precision;
  if (item.wardBreak) map.wardBreak = (map.wardBreak ?? 0) + item.wardBreak;
  if (item.modifiers) {
    for (const [attr, v] of Object.entries(item.modifiers)) {
      if (v) map[modKey(attr)] = (map[modKey(attr)] ?? 0) + v;
    }
  }
  if (item.skillBoost) {
    for (const [id, v] of Object.entries(item.skillBoost)) {
      if (v) map[boostKey(id)] = (map[boostKey(id)] ?? 0) + v;
    }
  }
  if (inst) {
    const delta = instanceBonusDelta(inst, content);
    addBonus(delta.bonus);
    for (const [attr, v] of Object.entries(delta.modifiers)) {
      if (v) map[modKey(attr)] = (map[modKey(attr)] ?? 0) + v;
    }
    for (const [id, v] of Object.entries(delta.skillBoost)) {
      if (v) map[boostKey(id)] = (map[boostKey(id)] ?? 0) + v;
    }
  }
  return map;
}

// codex:2026-08-01T12:18:00+02:00 — Das alte Bildpfeil-System ist vollständig aus den
// Stat-Zeilen entfernt; Vergleichskommunikation läuft nur noch über diese kompakten ▲/▼-Deltas.
// ── ▲/▼-Vergleichs-Deltas (Chef-GO) ─────────────────────────────────────────────
// Diese STÄNDIG sichtbaren, farbigen Zahlen-Tags beantworten die
// meistgetroffene Spieler-Entscheidung „ist das besser als mein angelegtes Item" auf einen Blick —
// direkt an der einfachen (gehoverten/gepinnten) Karte, ohne Shift. Nur die Karte, die NICHT das
// angelegte Item ist, bekommt sie (s. `isEquipped`-Gate in ItemTooltipCard/ItemTooltipOverlay).

/** Grün (besser) / Rot (schlechter) / gedimmt (±0) — `format` bekommt bereits `Math.abs(delta)`. */
function DeltaTag({
  delta,
  format,
  eps = 0.05,
}: {
  delta: number;
  format: (v: number) => string;
  eps?: number;
}): JSX.Element {
  if (Math.abs(delta) < eps) return <span className="itip-delta itip-delta-zero">±0</span>;
  const better = delta > 0;
  return (
    <span className={`itip-delta ${better ? "itip-delta-up" : "itip-delta-down"}`}>
      {better ? "▲+" : "▼-"}
      {format(Math.abs(delta))}
    </span>
  );
}

/** Flat-Stat-Delta (Schaden, Rüstung, Attribute, HP-Regen …) — formatDamage (≤1 Dezimale, Chef-
 *  Vorgabe: „Dezimal-Formatter formatDamage wiederverwenden"). */
const fmtFlatDelta = (v: number): string => formatDamage(v);
/** Prozent-Stat-Delta (critChance, blockChance, …) — `v` ist ein BRUCH (0.05 = 5 %), gerundet auf
 *  ganze Prozentpunkte wie die Basis-Zeilen selbst. */
const fmtPctDelta = (v: number): string => `${Math.round(v * 100)}%`;

/** Delta-Tag für einen bekannten `buildCompareMap`-Key, oder null ohne Vergleichsziel. */
function deltaTagFor(
  deltaMap: Record<string, number> | null | undefined,
  key: string,
  mine: number,
  opts?: { percent?: boolean },
): JSX.Element | null {
  if (!deltaMap) return null;
  const d = mine - (deltaMap[key] ?? 0);
  return opts?.percent
    ? <DeltaTag delta={d} format={fmtPctDelta} eps={0.005} />
    : <DeltaTag delta={d} format={fmtFlatDelta} eps={0.05} />;
}

/**
 * Effektive Schadensspanne + Tempo + DPS einer Range-Form-Waffe (Basis-Item + Instanz-Affix/Suffix-
 * Delta) — dieselbe Formel wie OffenseGroups Kopfblock (unten), hier als reine Funktion ausgelagert,
 * damit die ▲/▼-Deltas dieselbe Rechnung für das VERGLICHENE Item (Baseline) nutzen können, ohne sie
 * zu duplizieren. `null` für Nicht-Range-Form-Waffen (kein damageMin/damageMax) — dann bleibt die
 * Schaden-/DPS-Zeile ohne Delta (kein sinnvoller Vergleich, z.B. Legacy-Flat-Waffe gegen Range-Form).
 */
function weaponRangeStats(
  item: ItemDef,
  inst: ItemInstance | undefined,
): { min: number; max: number; dps: number } | null {
  if (item.damageMin === undefined || item.damageMax === undefined) return null;
  const delta = inst ? instanceBonusDelta(inst, content).bonus : undefined;
  const styleKey: keyof EquipBonus =
    item.weaponStyle === "ranged" ? "rangedDamage" : item.weaponStyle === "magic" ? "magicDamage" : "meleeDamage";
  const dmgDelta = delta?.[styleKey] ?? 0;
  const spdDelta = delta?.attackIntervalMs ?? 0;
  const min = Math.max(0, item.damageMin + dmgDelta);
  const max = Math.max(min, item.damageMax + dmgDelta);
  const baseTempoMs = item.attackIntervalMs ?? 3000;
  const tempoMs = Math.max(100, baseTempoMs + spdDelta);
  const dps = (min + max) / 2 / (tempoMs / 1000);
  return { min, max, dps };
}

/**
 * Grobe Summen-Heuristik NUR zur Auswahl „welcher der beiden Ring-Slots ist schlechter" (Chef-GO
 * Regel 2, „dahin würde man wechseln") — mischt bewusst unterschiedliche Einheiten (Flat-Boni,
 * %-Werte als Bruch); das ist hier okay, es geht nur um eine grobe Rangfolge zwischen zwei RINGEN
 * für die Baseline-Wahl, NICHT um eine echte Power-Formel (die bleibt computeStats vorbehalten,
 * s. `packages/engine` — hier werden bewusst keine Formeln von dort dupliziert).
 */
function dualSlotWeight(map: Record<string, number>): number {
  let sum = 0;
  for (const v of Object.values(map)) sum += v;
  return sum;
}

// ── Stat groups (Design #3 „Path of Exile", Task #210) ─────────────────────────
// Jede Gruppe berechnet ihre eigenen Zeilen aus denselben ItemDef-Feldern wie zuvor (BESTAND
// ERHALTEN — nur die Präsentation wandert von einer flachen Liste in gelabelte, durch Haarlinien
// getrennte Blöcke). Jede Gruppe liefert `null`, wenn sie nichts beizutragen hat.

/**
 * OFFENSE: Waffen-2.0-Kopfblock (Spanne·Tempo·DPS, §7.1) + Flat-Offensiv-Boni.
 *
 * Task #247 (Chef-Bugreport „Blacksteel Maul of the Wolf"): der Suffix „of the Wolf" gibt
 * -0,1s Tempo, aber diese Gruppe zeigte weiterhin den UNVERÄNDERTEN Item-Rohwert („Speed 3.7s"
 * statt 3.6s) — der SUFFIX-Block darunter zeigte die Delta-Zeile zwar separat korrekt, aber die
 * OFFENSE-Basis-Zeile blieb falsch. Fix: `instanceBonusDelta(inst, content)` liefert denselben
 * Delta, den computeStats tatsächlich anwendet (character.ts addBonus-Pass) — jede Basis-Zeile
 * hier zeigt jetzt Basis+Delta („effektiv") und färbt sich in `modTone` (die Rarity-Farbe des
 * Items, dieselbe Quelle wie SuffixGroups `tone`), wenn eine Instanz den Wert tatsächlich
 * verändert hat. Ohne `instance`-Prop (oder ohne Affixe/Suffix) ist der Delta 0 für jeden Key,
 * also unverändertes Verhalten wie zuvor.
 */
function OffenseGroup({
  item,
  instance: inst,
  modTone,
  compareMap,
  isEquipped,
  deltaMap,
  deltaTarget,
}: {
  item: ItemDef;
  instance?: ItemInstance;
  /** Farbe für Basis-Zeilen, die durch Affix/Suffix der Instanz verändert wurden. */
  modTone?: string;
  compareMap?: Record<string, number> | null;
  /**
   * #304: true, wenn DIESES Item exakt das ist, was der Charakter gerade im Slot trägt (s.
   * ItemTooltipOverlay) — nur dann darf die „Effektiv"-Tempo-Zeile unten `computeStats` befragen,
   * sonst würde ein bloß gehovertes (nicht angelegtes) Item fälschlich die AKTUELLEN Charakterwerte
   * (DEX-Kurve, aktive Tonika, Stance) als seine eigenen ausgeben.
   */
  isEquipped?: boolean;
  /** Chef-GO ▲/▼-Deltas: aggregierte Werte des angelegten Vergleichsziels (`buildCompareMap`),
   *  für die Flat-Bonus-Zeilen (meleeDamage/critChance/…). `null`/undefined = kein Vergleichsziel. */
  deltaMap?: Record<string, number> | null;
  /** Dasselbe Vergleichsziel als rohes Item+Instanz — nur für die Range-Form-Kopfzeile
   *  (Schaden/DPS) nötig, die `weaponRangeStats` statt der aggregierten Map braucht. */
  deltaTarget?: { item: ItemDef; instance?: ItemInstance } | null;
}): JSX.Element | null {
  const { t } = useI18n();
  const state = useGameStateMaybe();
  const rows: JSX.Element[] = [];

  // Instanz-Delta (Affixe + Suffix) einmal berechnen — dieselbe Quelle wie SuffixGroup/EnchantGroup/
  // buildCompareMap, damit „effektiv" hier exakt das ist, was computeStats tatsächlich anwendet.
  const delta = inst ? instanceBonusDelta(inst, content).bonus : undefined;

  // Range-Form-Waffen (damageMin/damageMax): prominente Schadensspanne + absolutes Tempo +
  // kursive DPS-Zeile, jetzt als drei Zeilen der Offense-Gruppe statt eines eigenen zentrierten
  // Blocks.
  if (item.damageMin !== undefined && item.damageMax !== undefined) {
    // Stil-passender Schaden-Key: dieselbe Instanz-Delta-Größe, die character.ts in charDamage
    // faltet (meleeDamage/rangedDamage/magicDamage je nach aktivem Stil).
    const styleKey: keyof EquipBonus =
      item.weaponStyle === "ranged" ? "rangedDamage" : item.weaponStyle === "magic" ? "magicDamage" : "meleeDamage";
    const dmgDelta = delta?.[styleKey] ?? 0;
    const spdDelta = delta?.attackIntervalMs ?? 0;
    const effDamageMin = Math.max(0, item.damageMin + dmgDelta);
    const effDamageMax = Math.max(effDamageMin, item.damageMax + dmgDelta);
    const baseTempoMs = item.attackIntervalMs ?? 3000;
    const effTempoMs = Math.max(100, baseTempoMs + spdDelta);
    const tempoS = effTempoMs / 1000;
    const dps = (effDamageMin + effDamageMax) / 2 / tempoS;
    const dmgModified = dmgDelta !== 0;
    const spdModified = spdDelta !== 0;
    const dmgIcon =
      item.weaponStyle === "ranged"
        ? statIcon("icon_attribute_rangedamage", "🏹")
        : item.weaponStyle === "magic"
          ? statIcon("icon_attribute_magicdamage", "✨")
          : statIcon("icon_attribute_meeledamage", "⚔️");
    // Chef-GO ▲/▼-Deltas: nur falls das Vergleichsziel SELBST eine Range-Form-Waffe ist (sonst kein
    // sinnvoller Schaden/DPS-Vergleich, z.B. gegen eine Legacy-Flat-Waffe) — dieselbe Formel wie oben,
    // über `weaponRangeStats` statt dupliziert.
    const baseRs = deltaTarget ? weaponRangeStats(deltaTarget.item, deltaTarget.instance) : null;
    rows.push(
      <StatRow
        key="whdmg"
        icon={dmgIcon}
        label={t("itip.weaponDamage")}
        value={`${formatDamage(effDamageMin)}–${formatDamage(effDamageMax)}`}
        tone={dmgModified ? modTone : undefined}
        delta={baseRs ? <DeltaTag delta={(effDamageMin + effDamageMax) / 2 - (baseRs.min + baseRs.max) / 2} format={fmtFlatDelta} /> : undefined}
      />,
    );
    rows.push(
      <StatRow key="whspd" icon={statIcon("icon_attribute_attack_speed", "⚡")} label={t("itip.tempo")} value={`${formatSeconds1(tempoS)}s`} tone={spdModified ? modTone : undefined} />,
    );
    // #304 (Chef-Bugreport: "2,8s angezeigt, real 3,65s Basis → 2,92s effektiv"): die Zeile oben
    // zeigt nur Basis+Affix/Suffix-Delta — der DEX-Tempo-Term (T1-Sättigungskurve) und Stance-/
    // Stil-Multiplikatoren aus computeStats blieben unsichtbar. Nur für das TATSÄCHLICH angelegte
    // Item zeigen wir zusätzlich das echte `computeStats`-Intervall — s. isEquipped-JSDoc oben.
    // "(max)" (stat.atCap, dasselbe Suffix wie bei Crit) wenn das Intervall am relativen T1-Boden
    // `weaponBaseMs·(1−TEMPO_REDUCTION_CAP)` klebt (Näherung: Ranged-/Stance-Multiplikatoren
    // wirken NACH diesem Boden und können das Intervall auch ohne vollen Flat-Stack darunter
    // drücken — bekannte Ungenauigkeit bei Ranged/Fast-Stance, s. Bericht).
    if (isEquipped && state) {
      const liveIntervalMs = computeStats(state, content).attackIntervalMs;
      const capMs = baseTempoMs * (1 - TEMPO_REDUCTION_CAP);
      const atCap = liveIntervalMs <= capMs + 0.5;
      rows.push(
        <StatRow
          key="whspdeff"
          icon={statIcon("icon_attribute_attack_speed", "⚡")}
          label={t("itip.tempoEffective")}
          value={`${formatSeconds1(liveIntervalMs / 1000)}s${atCap ? ` ${t("stat.atCap")}` : ""}`}
        />,
      );
    }
    rows.push(
      <StatRow
        key="whdps"
        icon={dmgIcon}
        label={t("itip.dps")}
        value={formatDamage(dps)}
        tone={dmgModified || spdModified ? modTone : undefined}
        delta={baseRs ? <DeltaTag delta={dps - baseRs.dps} format={fmtFlatDelta} /> : undefined}
      />,
    );
  }

  const b = item.bonus;
  if (b) {
    if (b.meleeDamage) {
      const d = delta?.meleeDamage ?? 0;
      const mine = b.meleeDamage + d;
      rows.push(<StatRow key="md" icon={statIcon("icon_attribute_meeledamage", "⚔️")} label={t("stat.meleeDamage")} value={fmtBonus(mine)} tone={d !== 0 ? modTone : undefined} delta={deltaTagFor(deltaMap, "meleeDamage", mine)} />);
    }
    if (b.rangedDamage) {
      const d = delta?.rangedDamage ?? 0;
      const mine = b.rangedDamage + d;
      rows.push(<StatRow key="rd" icon={statIcon("icon_attribute_rangedamage", "🏹")} label={t("stat.rangedDamage")} value={fmtBonus(mine)} tone={d !== 0 ? modTone : undefined} delta={deltaTagFor(deltaMap, "rangedDamage", mine)} />);
    }
    if (b.magicDamage) {
      const d = delta?.magicDamage ?? 0;
      const mine = b.magicDamage + d;
      rows.push(<StatRow key="mgd" icon={statIcon("icon_attribute_magicdamage", "✨")} label={t("stat.magicDamage")} value={fmtBonus(mine)} tone={d !== 0 ? modTone : undefined} delta={deltaTagFor(deltaMap, "magicDamage", mine)} />);
    }
    if (b.critChance) {
      const d = delta?.critChance ?? 0;
      const mine = b.critChance + d;
      rows.push(<StatRow key="cc" icon={statIcon("icon_attribute_crit_chance", "🎲")} label={t("stat.critChance")} value={`+${Math.round(mine * 100)}%`} tone={d !== 0 ? modTone : undefined} delta={deltaTagFor(deltaMap, "critChance", mine, { percent: true })} />);
    }
    if (b.critDamage) {
      const d = delta?.critDamage ?? 0;
      const mine = b.critDamage + d;
      rows.push(<StatRow key="cd" icon={statIcon("icon_attribute_critdamage", "💥")} label={t("stat.critDamage")} value={`+${Math.round(mine * 100)}%`} tone={d !== 0 ? modTone : undefined} delta={deltaTagFor(deltaMap, "critDamage", mine, { percent: true })} />);
    }
    // Spieler-Report 30.08.2026 (L1GR, "legendary signature effect not displayed"): `bonus.lifesteal`
    // war das EINZIGE der 15 EquipBonus-Felder, das nur die SuffixGroup rendern konnte — der
    // Signatur-Effekt des Grundgegenstands stand nirgends. Beim Grauzahn-Mantel ist Lebensraub der
    // alleinige Wert (maxHp verbietet der Ruestungs-Guard), darum wirkte die Karte voellig leer.
    if (b.lifesteal) {
      const d = delta?.lifesteal ?? 0;
      const mine = b.lifesteal + d;
      rows.push(<StatRow key="ls" icon={statIcon("icon_attribute_hp", "🩸")} label={t("stat.lifesteal")} value={`+${Math.round(mine * 100)}%`} tone={d !== 0 ? modTone : undefined} delta={deltaTagFor(deltaMap, "lifesteal", mine, { percent: true })} />);
    }
    if (b.attackIntervalMs) {
      const d = delta?.attackIntervalMs ?? 0;
      const base = b.attackIntervalMs;
      const eff = base + d;
      const sign = eff > 0 ? "+" : "";
      rows.push(
        // Kein Delta-Tag hier bewusst: attackIntervalMs ist "kleiner = besser" (umgekehrtes
        // Vorzeichen), Chef-Liste nennt Tempo nicht explizit — s. Bericht.
        <StatRow key="spd" icon={statIcon("icon_attribute_attack_speed", "⚡")} label={t("itip.attackSpeed")} value={`${sign}${formatSeconds1(eff / 1000)}s`} tone={d !== 0 ? modTone : undefined} />,
      );
    }
  }

  // Combat-Depth Konter-Play-Signaturen (design/combat-depth-spec.md §2.4/§2.5/§3.3): Waffen-
  // Signatur-Felder, nur gezeigt wenn > 0 (Guard: content-dev setzt sie nur auf Waffen).
  if (item.armorPen) {
    rows.push(<StatRow key="apen" icon={statIcon("icon_attribute_armorpen", "🗡")} label={t("stat.armorPen")} value={`+${Math.round(item.armorPen * 100)}%`} delta={deltaTagFor(deltaMap, "armorPen", item.armorPen, { percent: true })} />);
  }
  if (item.precision) {
    rows.push(<StatRow key="prec" icon={statIcon("icon_attribute_precision", "🎯")} label={t("stat.precision")} value={`+${Math.round(item.precision * 100)}%`} delta={deltaTagFor(deltaMap, "precision", item.precision, { percent: true })} />);
  }
  if (item.wardBreak) {
    rows.push(<StatRow key="wbrk" icon={statIcon("icon_attribute_wardbreak", "🔯")} label={t("stat.wardBreak")} value={`+${Math.round(item.wardBreak * 100)}%`} delta={deltaTagFor(deltaMap, "wardBreak", item.wardBreak, { percent: true })} />);
  }

  // Chef-GO Regel 3 (2H-Waffe vs. 1H+Schild): trägt der Charakter gerade etwas in der Offhand
  // (Schild), verdrängt diese 2H-Waffe es beim Anlegen mit (equipItem, displacesOffhand) — dezenter
  // Hinweis. Das Delta selbst bleibt bewusst NUR gegen die Mainhand (kein Extra-Vergleich gegen die
  // Offhand, s. Auftrag „nicht überkomplizieren"). Zeigt sich naturgemäß nie am angelegten Item
  // selbst (dessen Offhand ist beim Tragen einer 2H-Waffe immer leer).
  // Chef 30.08.2026: Der Satz "Ersetzt auch deine Nebenhand (Schild)" ist raus - die Kopfzeile
  // sagt bereits "Zweihaendig", der Hinweis kostete nur eine Zeile und Kartenbreite.

  // Zauberfokus (Chef-GO 28.08.2026, bewusster Magier-Buff): Magiewaffen wachsen mit INT. Zeile 1
  // „+0,3 % Schaden je INT" (Item-Feld `spellFocus`), Zeile 2 nur mit geladenem Charakter: die
  // Waffenspanne bei SEINEM aktuellen INT — exakt die computeStats-Rechnung (`spellFocusMult` ×
  // Spanne inkl. Affix-/Suffix-Delta), damit Tooltip und Kampf nie auseinanderlaufen. Bewusst
  // NICHT in die Schaden-/DPS-Kopfzeilen eingerechnet: die bleiben der reine Item-Wert (vergleichbar
  // über Charaktere hinweg), die INT-Zeile zeigt, was dieser Spieler daraus macht.
  const spellFocus = item.spellFocus ?? 0;
  if (item.weaponStyle === "magic" && spellFocus > 0 && item.damageMin !== undefined && item.damageMax !== undefined) {
    rows.push(
      <StatRow
        key="sf"
        icon={statIcon("icon_attribute_magicdamage", "✨")}
        label={t("itip.spellFocus")}
        value={t("itip.spellFocus.perInt").replace("{pct}", formatPct2(spellFocus))}
      />,
    );
    if (state) {
      const int = computeStats(state, content).attributes.int;
      const mult = spellFocusMult(item, int);
      const dmgDelta = delta?.magicDamage ?? 0;
      const min = Math.max(0, item.damageMin + dmgDelta) * mult;
      const max = Math.max(min, (item.damageMax + dmgDelta) * mult);
      rows.push(
        <StatRow
          key="sfint"
          icon={statIcon("icon_attribute_magicdamage", "✨")}
          label={t("itip.spellFocus.withInt").replace("{int}", String(int))}
          value={`${formatDamage(min)}–${formatDamage(max)}`}
        />,
      );
    }
  }

  if (rows.length === 0) return null;
  return <StatGroupWrapper title={t("itip.group.offense")} className="itip-offense-group">{rows}</StatGroupWrapper>;
}

/**
 * Item-eigene Mitigations-Vorschau aus rohem `armorRating`: dieselbe `def/(def+K)`-Formel
 * (auf `DEFENSE_MITIGATION_MAX` gedeckelt) wie CharacterPage aus der AGGREGIERTEN
 * `DerivedStats.armorRating` errechnet — hier nur auf den Roh-Wert DIESES EINEN Items
 * angewandt, als grobe „was bringt mir das allein"-Orientierung im Tooltip (Chef-Vorgabe).
 */
function armorMitigationPreview(armorRating: number): number {
  return Math.min(DEFENSE_MITIGATION_MAX, armorRating / (armorRating + DEFENSE_MITIGATION_K));
}

/**
 * DEFENSE: Verteidigungs-/Überlebens-Boni (Rüstung, Ringe, …) PLUS die vier Rüstungs-Trinität-
 * Klassen-Schicht-Felder (Itemization 2.5 §2.1: armorRating/blockChance/evasionRating/
 * wardCapacity — leben direkt auf ItemDef, NICHT in `bonus`). Rendert weiterhin die alten
 * `bonus.*`-Flats (Legacy-/Schmuck-Items), aber bailt NICHT mehr früh bei `!item.bonus` — sonst
 * verschwinden reine Trinity-Items (z.B. iron_platelegs: nur `armorRating`, kein `bonus`) spurlos
 * aus dem Tooltip (Chef-Bugreport: "iron_platelegs armorRating 1.11 aber kein Defensiv-Wert").
 */
function DefenseGroup({
  item,
  compareMap,
  deltaMap,
}: {
  item: ItemDef;
  compareMap?: Record<string, number> | null;
  /** Chef-GO ▲/▼-Deltas: aggregierte Werte des angelegten Vergleichsziels, s. OffenseGroup-JSDoc. */
  deltaMap?: Record<string, number> | null;
}): JSX.Element | null {
  const { t } = useI18n();
  const b = item.bonus;
  const rows: JSX.Element[] = [];
  if (b?.defense)
    rows.push(<StatRow key="def" icon={statIcon("icon_attribute_defense", "🛡️")} label={t("stat.defense")} value={fmtBonus(b.defense)} delta={deltaTagFor(deltaMap, "defense", b.defense)} />);
  if (b?.accuracy)
    rows.push(<StatRow key="acc" icon={statIcon("icon_attribute_accuracy", "🎯")} label={t("stat.accuracy")} value={fmtBonus(b.accuracy)} delta={deltaTagFor(deltaMap, "accuracy", b.accuracy)} />);
  if (b?.evasion)
    rows.push(<StatRow key="eva" icon={statIcon("icon_attribute_evasion", "💨")} label={t("stat.evasion")} value={fmtBonus(b.evasion)} delta={deltaTagFor(deltaMap, "evasion", b.evasion)} />);
  if (b?.maxHp)
    rows.push(<StatRow key="hp" icon={statIcon("icon_attribute_hp", "❤️")} label={t("stat.hp")} value={fmtBonus(b.maxHp)} delta={deltaTagFor(deltaMap, "maxHp", b.maxHp)} />);
  if (b?.hpRegenPerSec)
    // #304: formatDamage (≤1 Dezimale) statt formatStat (0 Dezimalen) — s. affixEffectParts oben.
    rows.push(<StatRow key="hregen" icon={statIcon("icon_attribute_hp", "💚")} label={t("stat.hpRegen")} value={`+${formatDamage(b.hpRegenPerSec)}/s`} delta={deltaTagFor(deltaMap, "hpRegenPerSec", b.hpRegenPerSec)} />);
  if (b?.maxMana)
    rows.push(<StatRow key="mana" icon={statIcon("icon_attribute_mana", "✦")} label={t("stat.maxMana")} value={fmtBonus(b.maxMana)} delta={deltaTagFor(deltaMap, "maxMana", b.maxMana)} />);

  // ── Rüstungs-Trinität: je Klassen-Schicht NUR zeigen, wenn das Feld > 0 (Chef-Vorgabe) ──
  if (item.armorRating) {
    rows.push(
      <StatRow key="ar" icon={statIcon("icon_attribute_defense", "🛡️")} label={t("stat.armor")} value={formatStat(item.armorRating)} delta={deltaTagFor(deltaMap, "armorRating", item.armorRating)} />,
    );
    // Mitigations-Vorschau teilt sich bewusst dasselbe Defense-Icon (dieselbe visuelle Familie,
    // wie CharacterPage's COMBAT_STAT_ICON: mitigation reused icon_attribute_defense).
    rows.push(
      <StatRow key="armit" icon={statIcon("icon_attribute_defense", "🛡️")} label={t("stat.mitigation")} value={`${Math.round(armorMitigationPreview(item.armorRating) * 100)}%`} />,
    );
    // 2H-Melee-Waffen tragen ihren eigenen armorRating-Bonus (Spec §5) — kleiner Hinweis, warum
    // eine Waffe hier einen Rüstungswert zeigt.
    if (item.weaponStyle === "melee" && item.twoHanded) {
      rows.push(<div key="ar2h" className="itip-tag itip-tool-hint">{t("itip.armor2hHint")}</div>);
    }
  }
  if (item.blockChance) {
    rows.push(
      <StatRow key="blk" icon={statIcon("icon_attribute_block", "🔰")} label={t("stat.block")} value={`${Math.round(item.blockChance * 100)}%`} delta={deltaTagFor(deltaMap, "blockChance", item.blockChance, { percent: true })} />,
    );
  }
  if (item.evasionRating) {
    // #304: die alte "+X%"-Anzeige unterstellte eine LINEARE Umrechnung (evr/100), die seit der
    // Evasion-Tempo-Zähmung (#301) nicht mehr stimmt — dodgeChance ist jetzt eine Sättigungskurve
    // `min(DODGE_CAP, DODGE_EFF_MAX·Σevr/(Σevr+K_DODGE))` mit abnehmendem Ertrag. Item zeigt darum
    // den rohen Rating-Wert (wie armorRating oben, kein "+", keine falsche %-Behauptung) plus einen
    // kurzen Hinweis auf die Kurvenform.
    rows.push(
      <StatRow key="evr" icon={statIcon("icon_attribute_evasion", "💨")} label={t("stat.evasionRating")} value={formatStat(item.evasionRating)} delta={deltaTagFor(deltaMap, "evasionRating", item.evasionRating)} />,
    );
    rows.push(<div key="evrhint" className="itip-tag itip-tool-hint">{t("itip.evasionRatingHint")}</div>);
  }
  if (item.wardCapacity) {
    rows.push(
      <StatRow key="ward" icon={statIcon("icon_attribute_ward", "🔮")} label={t("stat.wardPool")} value={`+${formatStat(item.wardCapacity)}`} delta={deltaTagFor(deltaMap, "wardCapacity", item.wardCapacity)} />,
    );
  }

  if (rows.length === 0) return null;
  // codex:2026-08-01T13:36:00+02:00 — Explizite Rasterklasse hält Defense in seinem
  // festen Warbanner-Slot, unabhängig davon, welche anderen Itemgruppen vorhanden sind.
  return <StatGroupWrapper title={t("itip.group.defense")} className="itip-defense-group">{rows}</StatGroupWrapper>;
}

// claude:2026-10-25T11:30:00+02:00 — Stil der Haupthand → Hauptattribut / Hauptkampf-Skill (Spiegel von character.ts, Spec §10.5).
const PRIMARY_ATTR_BY_STYLE: Record<string, string> = { melee: "str", ranged: "dex", magic: "int" };
const PRIMARY_SKILL_BY_STYLE: Record<string, string> = { melee: "power", ranged: "ranged", magic: "magic" };

/** ATTRIBUTES: ganzzahlige Attribut-Modifier (Itemization 2.0 §1). */
function AttributesGroup({
  item,
  compareMap,
  deltaMap,
}: {
  item: ItemDef;
  compareMap?: Record<string, number> | null;
  /** Chef-GO ▲/▼-Deltas: aggregierte Werte des angelegten Vergleichsziels, s. OffenseGroup-JSDoc. */
  deltaMap?: Record<string, number> | null;
}): JSX.Element | null {
  const { t, tr } = useI18n();
  const gstate = useGameStateMaybe();
  if (!item.modifiers && !item.primaryAttribute) return null;
  const rows: JSX.Element[] = [];
  // claude:2026-10-25T11:30:00+02:00 — Hauptattribut (1.4.0 Raid, Spec §10.5): zählt als Stärke/Geschick/Intelligenz je nach Stil der getragenen Haupthand.
  if (item.primaryAttribute) {
    const main = gstate ? content.items[gstate.character.equipment.mainhand ?? ""] : undefined;
    const attrId = PRIMARY_ATTR_BY_STYLE[main?.weaponStyle ?? "melee"] ?? "str";
    const nameLS = ATTR_NAME[attrId];
    rows.push(
      <StatRow
        key="primary"
        icon={statIcon(ATTR_UI[attrId] ?? "", attributeIcon(attrId))}
        label={t("itip.primaryAttr").replace("{attr}", nameLS ? tr(nameLS) : attrId.toUpperCase())}
        value={fmtBonus(item.primaryAttribute)}
      />,
    );
  }
  for (const [attr, v] of Object.entries(item.modifiers ?? {})) {
    if (v) {
      const attrNameLS = ATTR_NAME[attr];
      const attrLabel = attrNameLS ? tr(attrNameLS) : attr.toUpperCase();
      rows.push(
        <StatRow
          key={`m${attr}`}
          icon={statIcon(ATTR_UI[attr] ?? "", attributeIcon(attr))}
          label={attrLabel}
          value={fmtBonus(v)}
         
          delta={deltaTagFor(deltaMap, modKey(attr), v)}
        />,
      );
    }
  }
  if (rows.length === 0) return null;
  // codex:2026-08-01T13:36:00+02:00 — Attribute besitzen einen festen Datenplatz.
  return <StatGroupWrapper title={t("itip.group.attributes")} className="itip-attributes-group">{rows}</StatGroupWrapper>;
}

/** SKILL (Boosts): OSRS-Stil Skill-Level-Boosts aus Schmuck/Signaturen/Sets (Itemization 2.0 §4). */
function SkillGroup({ item, compareMap }: { item: ItemDef; compareMap?: Record<string, number> | null }): JSX.Element | null {
  const { t, tr } = useI18n();
  const gstate = useGameStateMaybe();
  if (!item.skillBoost && !item.primarySkillBoost) return null;
  const rows: JSX.Element[] = [];
  if (item.primarySkillBoost) {
    const main = gstate ? content.items[gstate.character.equipment.mainhand ?? ""] : undefined;
    const sid = PRIMARY_SKILL_BY_STYLE[main?.weaponStyle ?? "melee"] ?? "power";
    const sk = content.skills[sid];
    rows.push(
      <StatRow
        key="primarySkill"
        icon={skillBoostIcon(sid)}
        label={t("itip.primarySkill").replace("{skill}", sk ? tr(sk.name) : sid)}
        value={fmtBonus(item.primarySkillBoost)}
        tone="var(--boost)"
      />,
    );
  }
  for (const [id, v] of Object.entries(item.skillBoost ?? {})) {
    if (v) {
      const skill = content.skills[id];
      const label = skill ? tr(skill.name) : id;
      rows.push(
        <StatRow
          key={`sb${id}`}
          icon={skillBoostIcon(id)}
          label={label}
          value={fmtBonus(v)}
          tone="var(--boost)"
         
        />,
      );
    }
  }
  if (rows.length === 0) return null;
  // codex:2026-08-01T13:36:00+02:00 — Skillwerte besitzen einen festen Datenplatz.
  return <StatGroupWrapper title={t("itip.group.skill")} className="itip-skill-group">{rows}</StatGroupWrapper>;
}

/**
 * Sonderfälle ohne eigene benannte Gruppe (Werkzeuge, Tränke, Taschen, Zeit-Buffs, Legacy-2H-
 * Badge) — bleiben als ungruppierte Zeilen/Chips, wie zuvor, da sie außerhalb der Chef-Gruppen-
 * Taxonomie (Offense/Defense/Attributes/Skill/Suffix/Enchantment) liegen.
 */
function MiscRows({
  item,
  deltaTarget,
}: {
  item: ItemDef;
  /** Chef-GO ▲/▼-Deltas: rohes Vergleichsziel — nur für die Werkzeug-Tempo-Zeile gebraucht
   *  (speedMult ist kein `buildCompareMap`-Key), s. OffenseGroup-JSDoc für `deltaTarget`. */
  deltaTarget?: { item: ItemDef; instance?: ItemInstance } | null;
}): JSX.Element | null {
  const { t, tr } = useI18n();
  const state = useGameStateMaybe();
  const rows: JSX.Element[] = [];

  // Two-handed badge — suppressed when weaponType is set because the type line in the header
  // already reads "Two-Handed · <type>" (buildItemTypeLine, 1.4.0).
  if (item.twoHanded && !item.weaponType) {
    rows.push(<div key="2h" className="itip-badge">{t("item.twoHanded")}</div>);
  }

  // Tool (skill speed bonus)
  if (item.tool) {
    const skill = content.skills[item.tool.skill];
    const skillName = skill ? tr(skill.name) : item.tool.skill;
    const pct = Math.round((1 - item.tool.speedMult) * 100);
    // Chef-GO ▲/▼-Delta (Regel 2, Tool1/Tool2): nur wenn das Vergleichsziel ein Werkzeug DESSELBEN
    // Skills ist (ein Fischerstab vergleicht nie gegen eine angelegte Axt) — sonst kein Delta.
    const baseTool = deltaTarget?.item.tool;
    const basePct = baseTool && baseTool.skill === item.tool.skill ? Math.round((1 - baseTool.speedMult) * 100) : null;
    rows.push(
      <StatRow
        key="tool"
        icon={statIcon("icon_attribute_woodcutting_speed", "🔨")}
        label={t("item.toolSpeed").replace("{skill}", skillName)}
        value={`+${pct}%`}
        delta={basePct != null ? <DeltaTag delta={pct - basePct} format={(v) => `${Math.round(v)}%`} eps={0.5} /> : undefined}
      />,
    );
    rows.push(<div key="toolhint" className="itip-tag itip-tool-hint">{t("item.toolHint")}</div>);
  }

  // Heal amount — realer Wert via consumableHeal(item, maxHp); Fallback ohne State ist der flache
  // healAmount. Balance-Kette Schritt 4 (Hybrid-Heilung max(flat, round(maxHp·pct)), logic-dev,
  // dokumentierte Renderer-Ausnahme): der „(x %)"-Zusatz erscheint nur noch, wenn der %-Anteil den
  // effektiven Wert TATSÄCHLICH stellt (round(maxHp·pct) ≥ flat) — sonst suggeriert „+13 (9%)" eine
  // %-Heilung, obwohl der flache Boden greift.
  if (item.healPct != null || item.healAmount) {
    const maxHp = state ? computeStats(state, content).maxHp : 0;
    const heal = maxHp > 0 ? consumableHeal(item, maxHp) : (item.healAmount ?? 0);
    const pctDominates =
      item.healPct != null && maxHp > 0 && Math.round(maxHp * item.healPct) >= (item.healAmount ?? 0);
    const value = pctDominates
      ? `+${heal} (${Math.round((item.healPct ?? 0) * 100)}%)`
      : `+${heal}`;
    rows.push(<StatRow key="heal" icon={statIcon("icon_attribute_hp", "💚")} label={t("stat.hp")} value={value} />);
  }

  // Cures poison
  if (item.curesPoison) {
    rows.push(<div key="cure" className="itip-tag">{t("item.curesPoison")}</div>);
  }
  // Auftragsmarke (Chef-GO 02, 26.08.2026): Sonder-Verbrauchsgüter ohne Heilung tragen ihre Wirkung als Satz.
  if (item.consumable) {
    rows.push(<div key="consumable" className="itip-tag">{t(`item.consumable.${item.consumable.kind}`)}</div>);
  }

  // Timed buff (consumable/rune)
  if (item.buff) {
    const bb = item.buff.bonus;
    const durationS = (item.buff.durationMs / 1000).toFixed(0);
    rows.push(<div key="buffflag" className="itip-tag">{t("itip.buff")} ({durationS}s)</div>);
    // Buff-Kategorien (#303): pro Kategorie ist max. 1 Buff aktiv — ein neues Tonikum/Essen
    // derselben Kategorie VERDRÄNGT das laufende (applyConsumableBuff, engine/consumable.ts),
    // statt zu stapeln. Kurzer Hinweis, damit das niemanden überrascht (#304).
    if (item.buff.category) {
      rows.push(
        <div key="buffcat" className="itip-tag itip-tool-hint">{t(`itip.buffReplace.${item.buff.category}`)}</div>,
      );
    }
    if (bb.meleeDamage) rows.push(<StatRow key="bmd" icon={statIcon("icon_attribute_meeledamage", "⚔️")} label={t("stat.meleeDamage")} value={fmtBonus(bb.meleeDamage)} />);
    if (bb.rangedDamage) rows.push(<StatRow key="brd" icon={statIcon("icon_attribute_rangedamage", "🏹")} label={t("stat.rangedDamage")} value={fmtBonus(bb.rangedDamage)} />);
    if (bb.magicDamage) rows.push(<StatRow key="bmg" icon={statIcon("icon_attribute_magicdamage", "✨")} label={t("stat.magicDamage")} value={fmtBonus(bb.magicDamage)} />);
    if (bb.defense) rows.push(<StatRow key="bde" icon={statIcon("icon_attribute_defense", "🛡️")} label={t("stat.defense")} value={fmtBonus(bb.defense)} />);
    if (bb.accuracy) rows.push(<StatRow key="bac" icon={statIcon("icon_attribute_accuracy", "🎯")} label={t("stat.accuracy")} value={fmtBonus(bb.accuracy)} />);
    if (bb.evasion) rows.push(<StatRow key="bev" icon={statIcon("icon_attribute_evasion", "💨")} label={t("stat.evasion")} value={fmtBonus(bb.evasion)} />);
    if (bb.maxHp) rows.push(<StatRow key="bhp" icon={statIcon("icon_attribute_hp", "❤️")} label={t("stat.hp")} value={fmtBonus(bb.maxHp)} />);
    // #304: formatDamage (≤1 Dezimale) statt formatStat — die HoT-Zeile der Tränke/Tonika litt
    // unter demselben Rundungsfehler wie die Gear-/Suffix-Zeilen (s. affixEffectParts oben).
    if (bb.hpRegenPerSec) rows.push(<StatRow key="bhregen" icon={statIcon("icon_attribute_hp", "💚")} label={t("stat.hpRegen")} value={`+${formatDamage(bb.hpRegenPerSec)}/s`} />);
    if (bb.critChance) rows.push(<StatRow key="bcc" icon={statIcon("icon_attribute_crit_chance", "🎲")} label={t("stat.critChance")} value={`+${Math.round(bb.critChance * 100)}%`} />);
    if (bb.critDamage) rows.push(<StatRow key="bcd" icon={statIcon("icon_attribute_critdamage", "💥")} label={t("stat.critDamage")} value={`+${Math.round(bb.critDamage * 100)}%`} />);
    if (bb.maxMana) rows.push(<StatRow key="bmana" icon={statIcon("icon_attribute_mana", "✦")} label={t("stat.maxMana")} value={fmtBonus(bb.maxMana)} />);
    if (bb.attackIntervalMs) {
      const v = bb.attackIntervalMs;
      const sign = v > 0 ? "+" : "";
      rows.push(<StatRow key="bspd" icon={statIcon("icon_attribute_attack_speed", "⚡")} label={t("itip.attackSpeed")} value={`${sign}${formatSeconds1(v / 1000)}s`} />);
    }
    // Attribut-Boni (Itemization 2.5 §10.1): item.buff.modifiers — gespiegelt von AttributesGroup.
    // Ohne diesen Zweig zeigten Attribut-Tonika (falls je welche kommen) hier gar nichts.
    if (item.buff.modifiers) {
      for (const [attr, v] of Object.entries(item.buff.modifiers)) {
        if (v) {
          const attrNameLS = ATTR_NAME[attr];
          const attrLabel = attrNameLS ? tr(attrNameLS) : attr.toUpperCase();
          rows.push(
            <StatRow
              key={`bmod${attr}`}
              icon={statIcon(ATTR_UI[attr] ?? "", attributeIcon(attr))}
              label={attrLabel}
              value={fmtBonus(v)}
            />,
          );
        }
      }
    }
    // Rüstungs-Trinität (Itemization 2.5 §10.1): item.buff.trinity — gespiegelt von affixEffectParts'
    // Roh-Feld-Labels (stat.armorRating/…, wie Runen-Trinity-Boni), NICHT die aggregierten %-Labels
    // aus DefenseGroup. Bugfix (Chef #239): Tränke wie Elixir of Warding (nur trinity.wardCapacity)
    // oder Stoneskin (nur trinity.armorRating) zeigten bisher NUR „Timed Buff (120s)" ohne jeden
    // Effekt, weil dieser Zweig fehlte.
    const btri = item.buff.trinity;
    if (btri) {
      if (btri.armorRating)
        rows.push(<StatRow key="btar" icon={statIcon("icon_attribute_defense", "🛡️")} label={t("stat.armorRating")} value={fmtBonus(btri.armorRating)} />);
      if (btri.evasionRating)
        rows.push(<StatRow key="btev" icon={statIcon("icon_attribute_evasion", "💨")} label={t("stat.evasionRating")} value={fmtBonus(btri.evasionRating)} />);
      if (btri.wardCapacity)
        rows.push(<StatRow key="btwd" icon={statIcon("icon_attribute_ward", "🔮")} label={t("stat.wardCapacity")} value={fmtBonus(btri.wardCapacity)} />);
      if (btri.blockChance)
        rows.push(<StatRow key="btbl" icon={statIcon("icon_attribute_block", "🔰")} label={t("stat.blockChance")} value={`+${Math.round(btri.blockChance * 100)}%`} />);
    }
    if (bb.gatherXpMult && bb.gatherXpMult !== 1) {
      const pct = Math.round((bb.gatherXpMult - 1) * 100);
      rows.push(<StatRow key="bgxp" icon="✨" label={t("stat.gatherXpMult")} value={`+${pct}%`} />);
    }
    if (bb.gatherYieldMult) {
      rows.push(<StatRow key="bgyield" icon="🎁" label={t("stat.gatherYieldMult")} value={`+${Math.round(bb.gatherYieldMult * 100)}%`} />);
    }
  }

  if (rows.length === 0) return null;
  // codex:2026-08-01T13:36:00+02:00 — Misc-Werte bleiben im vorgesehenen Rasterplatz.
  return <div className="itip-group itip-misc itip-misc-group">{rows}</div>;
}

/** SUFFIX: Zufalls-Roll (WoW-Stil, z.B. "of the Fox") — Gruppentitel trägt bereits den Suffix-Namen. */
function SuffixGroup({
  inst,
  tone,
  compareMap,
}: {
  inst: ItemInstance;
  tone: string;
  compareMap?: Record<string, number> | null;
}): JSX.Element | null {
  const { t, tr } = useI18n();
  const sfx = inst.suffix;
  if (!sfx) return null;
  const sdef = content.suffixes?.[sfx.suffixId];
  if (!sdef) return null;

  // Compute suffix-only bonus: temporary instance with no affixes
  const fakeInst: ItemInstance = { instanceId: "", baseItemId: inst.baseItemId, affixes: [], suffix: sfx };
  const { bonus, modifiers, skillBoost } = instanceBonusDelta(fakeInst, content);

  const rows: JSX.Element[] = [];
  if (bonus.meleeDamage)
    rows.push(<StatRow key="sm" tone={tone} icon={statIcon("icon_attribute_meeledamage", "⚔️")} label={t("stat.meleeDamage")} value={fmtBonus(bonus.meleeDamage)} />);
  if (bonus.rangedDamage)
    rows.push(<StatRow key="sr" tone={tone} icon={statIcon("icon_attribute_rangedamage", "🏹")} label={t("stat.rangedDamage")} value={fmtBonus(bonus.rangedDamage)} />);
  if (bonus.magicDamage)
    rows.push(<StatRow key="smg" tone={tone} icon={statIcon("icon_attribute_magicdamage", "✨")} label={t("stat.magicDamage")} value={fmtBonus(bonus.magicDamage)} />);
  if (bonus.defense)
    rows.push(<StatRow key="sd" tone={tone} icon={statIcon("icon_attribute_defense", "🛡️")} label={t("stat.defense")} value={fmtBonus(bonus.defense)} />);
  if (bonus.accuracy)
    rows.push(<StatRow key="sa" tone={tone} icon={statIcon("icon_attribute_accuracy", "🎯")} label={t("stat.accuracy")} value={fmtBonus(bonus.accuracy)} />);
  if (bonus.evasion)
    rows.push(<StatRow key="se" tone={tone} icon={statIcon("icon_attribute_evasion", "💨")} label={t("stat.evasion")} value={fmtBonus(bonus.evasion)} />);
  if (bonus.maxHp)
    rows.push(<StatRow key="shp" tone={tone} icon={statIcon("icon_attribute_hp", "❤️")} label={t("stat.hp")} value={fmtBonus(bonus.maxHp)} />);
  if (bonus.hpRegenPerSec)
    // #304: formatDamage (≤1 Dezimale) statt formatStat — s. affixEffectParts oben.
    rows.push(<StatRow key="shregen" tone={tone} icon={statIcon("icon_attribute_hp", "💚")} label={t("stat.hpRegen")} value={`+${formatDamage(bonus.hpRegenPerSec)}/s`} />);
  if (bonus.maxMana)
    rows.push(<StatRow key="smana" tone={tone} icon={statIcon("icon_attribute_mana", "✦")} label={t("stat.maxMana")} value={fmtBonus(bonus.maxMana)} />);
  if (bonus.critChance)
    rows.push(<StatRow key="scc" tone={tone} icon={statIcon("icon_attribute_crit_chance", "🎲")} label={t("stat.critChance")} value={`+${Math.round(bonus.critChance * 100)}%`} />);
  if (bonus.critDamage)
    rows.push(<StatRow key="scd" tone={tone} icon={statIcon("icon_attribute_critdamage", "💥")} label={t("stat.critDamage")} value={`+${Math.round(bonus.critDamage * 100)}%`} />);
  // Spieler-Report 28.08.2026 („Legendary cape without attributes"): Signatur-Effekte wie Lebensraub (Grauzahn-Mantel)
  // und die Skilling-Boni standen nirgends auf der Karte — die Karte wirkte leer, obwohl der Effekt aktiv ist.
  if (bonus.lifesteal)
    rows.push(<StatRow key="sls" tone={tone} icon={statIcon("icon_attribute_hp", "🩸")} label={t("stat.lifesteal")} value={`+${Math.round(bonus.lifesteal * 100)}%`} />);
  if (bonus.gatherXpMult && bonus.gatherXpMult !== 1)
    rows.push(<StatRow key="sgx" tone={tone} icon={statIcon("icon_attribute_lck", "✨")} label={t("stat.gatherXpMult")} value={`+${Math.round((bonus.gatherXpMult - 1) * 100)}%`} />);
  if (bonus.gatherYieldMult)
    rows.push(<StatRow key="sgy" tone={tone} icon={statIcon("icon_attribute_lck", "✨")} label={t("stat.gatherYieldMult")} value={`+${Math.round(bonus.gatherYieldMult * 100)}%`} />);
  if (bonus.attackIntervalMs) {
    const v = bonus.attackIntervalMs;
    const sign = v > 0 ? "+" : "";
    rows.push(<StatRow key="sspd" tone={tone} icon={statIcon("icon_attribute_attack_speed", "⚡")} label={t("itip.attackSpeed")} value={`${sign}${formatSeconds1(v / 1000)}s`} />);
  }
  for (const [attr, v] of Object.entries(modifiers)) {
    if (v) {
      const attrNameLS = ATTR_NAME[attr];
      const attrLabel = attrNameLS ? tr(attrNameLS) : attr.toUpperCase();
      rows.push(
        <StatRow key={`sm${attr}`} tone={tone} icon={statIcon(ATTR_UI[attr] ?? "", attributeIcon(attr))} label={attrLabel} value={fmtBonus(v)} />,
      );
    }
  }
  // Skill-Level-Boosts aus Schmuck-Suffix-Rolls (§7, nur Schmuck-Pool via boostPerIlvl).
  for (const [id, v] of Object.entries(skillBoost)) {
    if (v) {
      const skill = content.skills[id];
      const label = skill ? tr(skill.name) : id;
      rows.push(
        <StatRow key={`sb${id}`} tone={tone} icon={skillBoostIcon(id)} label={label} value={fmtBonus(v)} />,
      );
    }
  }

  if (rows.length === 0) return null;
  // codex:2026-08-01T10:55:00+02:00 — Der Record nennt nur den eigentlichen Suffixnamen;
  // Kategorie und Roll-Prozent waren redundantes Metawissen. Die konkreten Boni bleiben darunter.
  return <StatGroupWrapper title={`… ${tr(sdef.suffix)}`} className="itip-suffix-group">{rows}</StatGroupWrapper>;
}

/**
 * ENCHANTMENT: die Verzauberungs-Plaetze eines Ausruestungsteils — belegte mit Name/Tier/Effekt,
 * freie als leere Steine, dazu ein Satz, wozu sie da sind.
 *
 * Steht bewusst auf JEDEM Ausruestungsteil, auch auf einem unverzauberten (Chef 25.08.2026,
 * "visual learning"): vorher verschwand die Gruppe ohne Affixe komplett, und ein Spieler konnte
 * nirgends sehen, dass sein Item ueberhaupt Plaetze hat. Die Anzahl haengt allein an der Rarity
 * (`enchantSlotsFor`) — dieselbe Quelle, die auch der Verzauberungstisch liest.
 */
function EnchantGroup({ item, inst }: { item: ItemDef; inst?: ItemInstance | null }): JSX.Element | null {
  const { t, tr } = useI18n();
  const affixes = inst?.affixes ?? [];
  const slots = enchantSlotsFor(getItemRarity(item));
  // Alt-Saves koennen mehr Affixe tragen, als die heutige Rarity-Regel erlaubt (die Slot-Zahlen
  // wurden schon einmal angepasst) — der Zaehler zeigt dann die echte Belegung, nicht "4/3".
  const gesamt = Math.max(slots, affixes.length);
  if (gesamt === 0) return null;
  return (
    <StatGroupWrapper
      title={`${t("itip.group.enchantment")} ${affixes.length}/${gesamt}`}
      className="itip-special-effect itip-enchant-group"
    >
      {affixes.map((a, i) => {
        const def = content.affixes?.[a.affixId];
        const prefixName = def ? tr(def.prefix) : a.affixId;
        // Eine Zeile je Teil (Flat-Boni/Attribut-Mods/Proc-Prosa) statt einer gejointen
        // Ein-Zeilen-Zusammenfassung — der Proc-Satz (z.B. „[Flammend] Bei Treffern …") braucht
        // die volle Breite (Waffen 2.0 §7.2), s. `affixEffectParts`.
        const parts = def ? affixEffectParts(def, a.tier, t, tr) : [];
        return (
          <div key={i} className="itip-inst-affix-entry">
            <div className="itip-inst-affix-row">
              <span className="itip-inst-affix-gem">✦</span>
              <span className="itip-inst-affix-name">{prefixName}</span>
              <span className="itip-inst-affix-tier muted">T{a.tier}</span>
            </div>
            {parts.map((line, li) => (
              <div key={li} className="itip-inst-affix-val">{line}</div>
            ))}
          </div>
        );
      })}
      {gesamt > affixes.length && (
        <div className="itip-enchant-slots">
          {Array.from({ length: gesamt - affixes.length }, (_, i) => (
            <span key={i} className="itip-enchant-slot-empty" aria-hidden>
              ◇
            </span>
          ))}
          <span className="itip-enchant-slot-hint">{t("itip.enchantSlots.hint")}</span>
        </div>
      )}
    </StatGroupWrapper>
  );
}

/**
 * RUNE-EFFECT: für Runen-Items selbst (`item.rune`, Enchant-Arch-B) — zeigt klar, welchen Affix
 * +Tier diese Rune am Verzauberungstisch anbringt (#219 Bugreport: bislang zeigte der Tooltip
 * eines Runen-Items GAR KEINEN Effekttext, weil `item.rune` in keiner Stat-Gruppe gelesen wurde).
 * Nutzt dieselbe `affixEffectParts`-Quelle wie EnchantGroup/EnchantingPage-Vorschau — eine Zeile
 * je Teil (Flat-Boni/Attribut-Mods/Trinity/Proc-Prosa), damit nichts verschwiegen wird.
 */
function RuneEffectGroup({ item }: { item: ItemDef }): JSX.Element | null {
  const { t, tr } = useI18n();
  if (!item.rune) return null;
  const def = content.affixes?.[item.rune.affixId];
  if (!def) return null;
  const parts = affixEffectParts(def, item.rune.tier, t, tr);
  const hint = runeFitsHint(def, item.rune.tier, t);
  return (
    // codex:2026-08-01T13:36:00+02:00 — Runeffekte spannen ihren festen unteren Datenplatz.
    <StatGroupWrapper title={t("itip.group.runeEffect")} className="itip-rune-group">
      <div className="itip-inst-affix-entry">
        <div className="itip-inst-affix-row">
          <span className="itip-inst-affix-gem">✦</span>
          <span className="itip-inst-affix-name">{tr(def.prefix)}</span>
          <span className="itip-inst-affix-tier muted">T{item.rune.tier}</span>
        </div>
        {parts.map((line, li) => (
          <div key={li} className="itip-inst-affix-val">{line}</div>
        ))}
        {/* Spieler-Report 1.0.2: "why does the crafting not display what the enchantment rune is
            for: Weapon, Armor, Jewelry, etc." Berechtigt — wofuer eine Rune taugt, stand bisher
            nur in den Daten. Das Label nennt das ECHTE Ziel inkl. Ruestungsklasse, der Hinweis
            darunter das unsichtbare Trinity-Gate (s. runeTargets.ts). */}
        <div className="itip-rune-target">
          <span className="itip-rune-target-label">{t("rune.target.label")}</span>
          <span className="itip-rune-target-value">{runeTargetLabel(def, item.rune.tier, t)}</span>
        </div>
        {hint && <div className="itip-rune-target-hint">{hint}</div>}
      </div>
    </StatGroupWrapper>
  );
}

/**
 * EFFECT-Block (Waffen 2.0 §7.2 + Meisterweihe-Perk): Basis-Waffeneffekte (Status ODER Spezial-
 * Kind) UND der Meister-Perk eines Meisterumhangs (`item.masterPerk`) als kursive, goldene
 * Fließtext-Zeilen — in einem eigenen, klar hervorgehobenen Box-Block (rarity-farbene Border-
 * Left-Kante + leicht getönter Grund), statt lose in die Stat-Liste zu fallen (Chef-Vorgabe Task
 * #210: "das Auge soll sofort dort landen"). Dieselbe Prosa-Vorlage nutzt auch die
 * EnchantingPage-Vorschau (Enchant-Procs), s. `affixEffectParts`.
 *
 * Meister-Perk-Zeile (Chef-Bugreport „Voidangler's Cape: die Double-Fish-Chance sollte oben stehen
 * wie ein Waffen-Effekt, nicht unten in grauem Flavor-Text"): der Perk stand bisher NUR beiläufig
 * in `item.description` (grauer Flavor-Text ganz unten) — dieselbe prominente goldene Zeile wie ein
 * Waffeneffekt macht ihn sichtbar, OHNE die Flavor-Description zu ändern (Doppelnennung ist okay,
 * die Beschreibung darf den Perk weiter erwähnen). Zeigt sich VOR den Waffeneffekten (praktisch
 * überschneidungsfrei — die 13 Ökonomie-Capes tragen nie `weaponEffect`, die 7 Kampf-Capes nie
 * `masterPerk`), gemeinsame Textquelle `masterPerkText` (auch MasteryCeremony nutzt sie).
 */
// claude:2026-10-17T20:00:00+02:00 — K2: diese drei Kinds summieren sich über Quellen, daher kein Hinweis
// claude:2026-10-24T19:40:00+02:00 — ammoSaver summiert Haupthand + Köcher (1.4.0 FK, Deckel 50 %).
const NON_STACK_EXEMPT: ReadonlySet<string> = new Set(["healOnKill", "wardOnKill", "cooldownOnKill", "ammoSaver"]);

/** claude:2026-10-24T19:40:00+02:00 — Pfeil-Block der Itemkarte (1.4.0 FK): Bonus je Schuss, Effekt, Fernkampf-Level zum Einlegen. */
function ArrowBlock({ item }: { item: ItemDef }): JSX.Element | null {
  const { t } = useI18n();
  const a = item.arrow;
  if (!a) return null;
  const level = ARROW_TIER_RANGED_LEVEL[Math.max(0, Math.min(ARROW_TIER_RANGED_LEVEL.length - 1, a.tier - 1))] ?? 1;
  return (
    <div className="itip-effect-block itip-special-effect">
      <div className="itip-effect-line">
        <span className="itip-effect-icon" aria-hidden="true">➶</span>
        <span>{t("itip.arrow.bonus").replace("{min}", formatDamage(a.bonusMin)).replace("{max}", formatDamage(a.bonusMax))}</span>
      </div>
      {a.effect && isStatusEffectType(a.effect.type) && (
        <div className="itip-effect-line">
          <span className="itip-effect-icon" aria-hidden="true">{statIcon(STATUS_UI[a.effect.type] ?? "", statusEffectIcon(a.effect.type))}</span>
          <span>{weaponEffectProse(a.effect, t)}</span>
        </div>
      )}
      <div className="itip-effect-line">
        <span className="itip-effect-icon" aria-hidden="true">✦</span>
        <span>{t("itip.arrow.use").replace("{n}", String(level))}</span>
      </div>
    </div>
  );
}

function EffectBlock({ item }: { item: ItemDef }): JSX.Element | null {
  const { t, tr } = useI18n();
  const effects = effectiveWeaponEffects(item);
  const perk = item.masterPerk;
  if (effects.length === 0 && !perk) return null;
  return (
    <div className="itip-effect-block itip-special-effect itip-onhit-special">
      {perk && (
        <div className="itip-effect-line">
          <span className="itip-effect-icon" aria-hidden="true">✦</span>
          <span>{masterPerkText(perk, t, tr)}</span>
        </div>
      )}
      {effects.map((e, i) => (
        <div key={`wep${i}`} className="itip-effect-line">
          <span className="itip-effect-icon" aria-hidden="true">
            {isStatusEffectType(e.type) ? statIcon(STATUS_UI[e.type] ?? "", statusEffectIcon(e.type)) : "✦"}
          </span>
          <span>
            {weaponEffectProse(e, t)}
            {/* claude:2026-10-17T20:00:00+02:00 — K2: Spezialeffekte stapeln nicht (Regel combat.ts collectSpecialEffects), Kill-Flats summieren sich */}
            {!isStatusEffectType(e.type) && !NON_STACK_EXEMPT.has(e.type) && (
              <span className="itip-effect-nostack">{t("itip.effectNoStack")}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Set-Bonus (WoW-Stil, Chef Bild #68) ─────────────────────────────────────────
// „Set-Bonusse sollten auch wie in WoW beim Item dran stehen, so 0/X, dann Effekt bei vollem
// Set X/X": Set-Name mit Getragen-Zähler (n/Gesamtteile) + die Bonus-Zeile mit der nötigen
// Teile-Zahl in Klammern — gold sobald der Bonus aktiv ist (n ≥ minPieces), sonst gedimmt.

function SetBonusSection({ item }: { item: ItemDef }): JSX.Element | null {
  const state = useGameStateMaybe();
  const { t, tr } = useI18n();
  const set = content.sets.find((s) => s.pieces.includes(item.variantOf ?? item.id));
  if (!set) return null;
  // claude:2026-10-25T11:30:00+02:00 — Stufen-Sets (Raid R7): alle Stufen mit Attributen und Effekttexten, Zähler über Varianten.
  if (set.tiers && set.tiers.length > 0) return <SetTiersSection set={set} />;
  const equipped = state
    ? new Set(Object.values(state.character.equipment).filter((id): id is string => !!id))
    : new Set<string>();
  const worn = set.pieces.reduce((n, p) => n + (equipped.has(p) ? 1 : 0), 0);
  const active = worn >= set.minPieces;
  const fx = formatSetModifiers(set, t, tr);
  if (!fx) return null; // Set ohne formulierbare Boni → keine leere Sektion
  return (
    <div className={`itip-set${active ? " active" : ""}`}>
      <div className="itip-set-name">
        {tr(set.name)} <span className="itip-set-count">({worn}/{set.pieces.length})</span>
      </div>
      {/* Chef 2026-07-11 („3/5 und trotzdem aktiv?"): viele Sets aktivieren BEWUSST unterhalb
          der Vollzahl (minPieces 2/3 bei 5–9 Teilen) — die Schwelle steht deshalb ausgeschrieben
          („Ab 3 Teilen:") statt als kryptisches „(3)". */}
      <div className="itip-set-bonus">
        {t("itip.set.threshold").replace("{n}", String(set.minPieces))} {fx}
      </div>
    </div>
  );
}

/** Zahl ohne Nachkomma-Rauschen (1.5, 20, 0.25). */
function fxNum(x: number): string {
  return String(Number(x.toFixed(1)));
}

/** Ein Satz je Set-Effekt (7 Sprachen über itip.setfx.<kind>). */
function setEffectText(e: SetEffectDef, t: (k: string) => string): string {
  const pct = (v: number | undefined): string => fxNum((v ?? 0) * 100);
  return t(`itip.setfx.${e.kind}`)
    .replace("{pct}", pct(e.value))
    .replace("{value}", e.kind === "bloodToll" ? fxNum(e.value ?? 0) : pct(e.value))
    .replace("{s}", fxNum((e.kind === "burnDurationMs" ? (e.value ?? 0) : (e.cooldownMs ?? 0)) / 1000))
    .replace("{perStack}", pct(e.perStack))
    .replace("{max}", String(e.maxStacks ?? 0))
    .replace("{every}", String(e.every ?? 0))
    .replace("{wardPct}", pct(e.wardPct))
    .replace("{healPct}", pct(e.healPct));
}

function tierBonusText(tier: SetTierDef, tr: (v: LocalizedString) => string): string {
  const p: string[] = [];
  for (const [attr, v] of Object.entries(tier.modifiers ?? {})) {
    if (!v) continue;
    const nameLS = ATTR_NAME[attr];
    p.push(`+${v} ${nameLS ? tr(nameLS) : attr.toUpperCase()}`);
  }
  for (const [id, v] of Object.entries(tier.skillBoost ?? {})) {
    if (!v) continue;
    const sk = content.skills[id];
    p.push(`+${v} ${sk ? tr(sk.name) : id}`);
  }
  return p.join(", ");
}

function SetTiersSection({ set }: { set: SetDef }): JSX.Element {
  const state = useGameStateMaybe();
  const { t, tr } = useI18n();
  const worn = state ? countSetPieces(state, content, set) : 0;
  return (
    <div className={`itip-set${worn >= (set.tiers?.[0]?.pieces ?? 99) ? " active" : ""}`}>
      <div className="itip-set-name">
        {tr(set.name)} <span className="itip-set-count">({worn}/{set.pieces.length})</span>
      </div>
      <div className="itip-set-tiers">
        {set.tiers!.map((tier) => {
          const on = worn >= tier.pieces;
          const nameKey = `raid.setTier.${set.id}.${tier.pieces}`;
          const nm = t(nameKey);
          return (
            <div key={tier.pieces} className={`itip-set-tier${on ? " on" : ""}`}>
              <div className="itip-set-tier-head">
                {t("itip.set.tier").replace("{n}", String(tier.pieces))}
                {nm !== nameKey ? ` · ${nm}` : ""}
              </div>
              {tierBonusText(tier, tr) && <div className="itip-set-tier-fx">{tierBonusText(tier, tr)}</div>}
              {(tier.effects ?? []).map((e, i) => (
                <div key={i} className="itip-set-tier-fx">{setEffectText(e, t)}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Requirements section ───────────────────────────────────────────────────────

function RequirementsSection({ item }: { item: ItemDef }): JSX.Element | null {
  // useGameStateMaybe returns null when no game is active (menu/character-creation
  // screens). In that case we still show the requirements list, but skip the
  // met/unmet colouring — the tooltip must never crash the app.
  const state = useGameStateMaybe();
  const { t, tr } = useI18n();

  if (!item.requirements) return null;
  const entries = Object.entries(item.requirements);
  if (entries.length === 0) return null;

  // Only compute met/unmet when there is an active game state.
  const ok = state != null ? meetsRequirements(state, item) : null;

  return (
    <>
      {entries.map(([k, v]) => {
        const skill = content.skills[k];
        const skillName = skill ? tr(skill.name) : k;
        // When ok is null (no active game), render neutrally without unmet styling.
        const unmet = ok === false;
        return (
          <div key={k} className={`itip-req-row${unmet ? " itip-req-unmet" : ""}`}>
            <span className="itip-req-label">
              {t("itip.requires")} <span className="itip-req-skill">{skillName}</span>
            </span>
            <span className="itip-req-val">
              {v}
              {unmet && <span className="itip-req-x"> ✗</span>}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Main overlay ───────────────────────────────────────────────────────────────

/** Fallback flavor text per item type, shown when item.description is missing.
 *  Sweep-Fund T6 (2026-07-11): alle 7 Sprachen — der Fallback stach in Nicht-EN/DE hervor. */
const FLAVOR_MATERIAL: LocalizedString = {
  en: "A crafting material.", de: "Ein Handwerksmaterial.", es: "Un material de artesanía.",
  fr: "Un matériau d'artisanat.", "pt-BR": "Um material de artesanato.", ru: "Ремесленный материал.", zh: "一种制作材料。",
};
const FLAVOR_EQUIPMENT: LocalizedString = {
  en: "A piece of equipment.", de: "Ein Ausrüstungsstück.", es: "Una pieza de equipo.",
  fr: "Une pièce d'équipement.", "pt-BR": "Uma peça de equipamento.", ru: "Предмет снаряжения.", zh: "一件装备。",
};
const FLAVOR_FALLBACK: Partial<Record<string, LocalizedString>> = {
  material: FLAVOR_MATERIAL,
  consumable: {
    en: "Looks edible.", de: "Sieht essbar aus.", es: "Parece comestible.",
    fr: "Ça a l'air comestible.", "pt-BR": "Parece comestível.", ru: "Выглядит съедобным.", zh: "看起来可以吃。",
  },
  equipment: FLAVOR_EQUIPMENT,
  bag: FLAVOR_EQUIPMENT,
  tool: FLAVOR_MATERIAL,
};
const FLAVOR_DEFAULT: LocalizedString = {
  en: "An item.", de: "Ein Gegenstand.", es: "Un objeto.", fr: "Un objet.",
  "pt-BR": "Um item.", ru: "Предмет.", zh: "一件物品。",
};

/** Einmalig in App montiert: rendert das schwebende Tooltip-Fenster am Cursor. */
/** Verfolgt, ob Shift gerade gehalten wird (für den WoW-Stil-Vergleichs-Tooltip). */
function useShiftHeld(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent): void => { if (e.key === "Shift") setHeld(true); };
    const up = (e: KeyboardEvent): void => { if (e.key === "Shift") setHeld(false); };
    const reset = (): void => setHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);
  return held;
}

/**
 * Eine einzelne Item-Tooltip-Karte (das Panel). Wird einfach (normal) oder doppelt
 * (WoW-Stil-Vergleich: gehovertes Item links + angelegtes Item rechts) gerendert.
 *
 * Layout (Task #210, Chef-Entscheidung: Design #3 „Path of Exile", breiter/höher, größeres
 * Bild, hervorgehobener Effekt-Block): Doppelzeilen-Rarity-Header → volle-Breite Hero-Bühne
 * (dunkle Textur + Rarity-Glow, keine Slot-Box) → Stat-Gruppen mit Kapitälchen-Labels und
 * Haarlinien-Trennern (Offense/Defense/Attributes/Skill/Suffix/Enchantment) → hervorgehobener
 * Effekt-Block → Requires/Value-Fußzeile → Flavor → Aktions-Buttons.
 */
function ItemTooltipCard({
  item,
  instance: inst,
  actions,
  showCompareHint,
  badge,
  compareMap,
  isEquipped,
  deltaAgainst,
  slotFreeHint,
  wikiBtnPulse,
}: {
  item: ItemDef;
  instance?: ItemInstance;
  actions: ItemAction[];
  showCompareHint?: boolean;
  badge?: string;
  /** Shift-Compare (Chef-Feature): aggregierte Stat-Werte der VERGLICHENEN Seite, oder null/undefined
   *  außerhalb des Vergleichsmodus (dann werden keine Pfeile gerendert). */
  compareMap?: Record<string, number> | null;
  /** #304: durchgereicht an OffenseGroup — true, wenn diese Karte das AKTUELL angelegte Item zeigt. */
  isEquipped?: boolean;
  /**
   * Chef-GO ▲/▼-Deltas: das angelegte Vergleichsziel dieser Karte (rohes Item+Instanz) — STÄNDIG
   * gesetzt (kein Shift nötig), außer bei `isEquipped`-Karten (Regel 4: keine Deltas gegen sich
   * selbst) oder ohne Vergleichsziel. Die Stat-Gruppen leiten daraus selbst ihre aggregierte
   * `buildCompareMap`/`weaponRangeStats`-Baseline ab.
   */
  deltaAgainst?: { item: ItemDef; instance?: ItemInstance } | null;
  /** Chef-GO Regel 2: Ring1/Ring2 bzw. Tool1/Tool2 — einer der beiden Zwillings-Slots ist frei, es
   *  gibt also nichts zu verdrängen (kein Delta möglich/nötig), stattdessen dieser Hinweis. */
  slotFreeHint?: boolean;
  /**
   * Item-Karten-Guide (Chef-Auftrag 2026-08-27, s. `areaTourSteps.ts` ITEM_CARD_TOUR_STEPS-JSDoc):
   * true, solange `state.onboarding.toursSeen.itemCardGuideV1` noch fehlt — der „?"-Wiki-Knopf
   * pulsiert dezent, um überhaupt erst Aufmerksamkeit zu wecken (Reddit-Befund: Spieler finden ihn
   * nie). Sobald die Tour einmal gesehen/übersprungen wurde, bleibt der Knopf für immer ruhig.
   */
  wikiBtnPulse?: boolean;
}): JSX.Element {
  const { t, tr, locale } = useI18n();

  const img = getItemImage(item.id);
  const typeLine = buildItemTypeLine(item, t, tr);
  const tierOfItem = itemTier(content, item.id);
  const rarity = getItemRarity(item);
  // Sourced from the --rar-* CSS custom properties (components.css :root) instead of the
  // shared RARITY_COLORS hex map — keeps the tooltip's rarity accent (name/glow/effect-block)
  // in sync with the same single palette the item-cell/inv-slot/etc. rarity classes use, so a
  // palette tweak (e.g. Chef 2026-07-02 rare mint→forest-green) never needs a second edit.
  const rarityCol = `var(--rar-${rarity})`;
  const flavor: LocalizedString = item.description ?? FLAVOR_FALLBACK[item.type] ?? FLAVOR_DEFAULT;
  const displayName = inst && (inst.affixes.length > 0 || inst.suffix)
    ? instanceDisplayName(inst, content, locale)
    : tr(item.name);

  const hasStats =
    item.bonus ||
    item.modifiers ||
    item.skillBoost ||
    item.primaryAttribute || // claude:2026-10-25T11:30:00+02:00 — Hauptattribut (1.4.0 Raid)
    item.primarySkillBoost ||
    item.healAmount ||
    item.healPct != null ||
    item.curesPoison ||
    !!item.consumable ||
    item.weaponEffect ||
    item.weaponEffects?.length ||
    item.weaponStyle === "magic" ||
    item.tool ||
    item.buff ||
    item.twoHanded ||
    // Waffen 2.0 Range-Form (§7.1): der Kopfblock zählt als „Stats", auch falls die Waffe sonst
    // keine bonus.*/modifiers trägt (theoretischer Rand­fall, defensiv).
    item.damageMin !== undefined ||
    // Rüstungs-Trinität (Itemization 2.5): reine Trinity-Items ohne `bonus`/`modifiers` (z.B. ein
    // Schild mit nur armorRating+blockChance) müssen die Stat-Gruppen trotzdem rendern.
    item.armorRating ||
    item.evasionRating ||
    item.wardCapacity ||
    item.blockChance ||
    // Combat-Depth Konter-Play-Signaturen (§3.3): eigene Zeilen in OffenseGroup, s.u.
    item.armorPen ||
    item.precision ||
    item.wardBreak ||
    // Runen-Item (#219): zeigt seinen eigenen Verzauberungs-Effekt statt gar nichts.
    item.rune;

  const hasStatExtras = !!inst?.suffix;

  const weight = (item as ItemDef & { weight?: number }).weight;
  const hasRequirements = !!item.requirements && Object.keys(item.requirements).length > 0;
  const hasValue = typeof item.value === "number" && item.value > 0;

  // codex:2026-08-01T13:28:00+02:00 — Reine Materialien und sonstige wertbasierte Gegenstände
  // erhalten eine eigene vertikale Einspaltenkarte. So bleibt keine leere Record-Hälfte neben
  // einem großen Itembild stehen; Ausrüstung behält den breiten Warbanner-Datenvertrag.
  const isSimpleCard =
    !hasStats &&
    !hasStatExtras &&
    !(inst && inst.affixes.length > 0) &&
    !hasRequirements;

  // codex:2026-08-01T13:30:36+02:00 — Nahrung/Tränke erhalten einen eigenen kompakten
  // Effektvertrag. Ihr Heil-/Buffwert bleibt vollständig sichtbar, wird aber nicht länger in das
  // starre Ausrüstungsraster mit leeren Offense-/Defense-Plätzen gezwungen.
  const isConsumableCard =
    item.type === "consumable" &&
    (item.healPct != null || !!item.healAmount || !!item.curesPoison || !!item.buff || !!item.consumable);

  // Chef-GO ▲/▼-Deltas: EINMAL pro Karte aggregieren (buildCompareMap ist derselbe Helper wie das
  // bestehende Shift-Compare, inkl. effektiver Instanz-Boni via instanceBonusDelta — kein
  // Formel-Duplikat) und an die Stat-Gruppen durchreichen, die Flat-Werte zeigen.
  const deltaMap = deltaAgainst ? buildCompareMap(deltaAgainst.item, deltaAgainst.instance) : null;

  return (
    <div
      className={`item-tooltip itip-panel itip-card${isSimpleCard ? " itip-card--simple" : ""}${isConsumableCard ? " itip-card--consumable" : ""} ${rarityClass(item.rarity)}`}
      style={{ "--rarity-col": rarityCol } as CSSProperties}
      role="dialog"
    >
      {/* Ecken-Cluster oben rechts (Task #308): optionales „Angelegt"-Tag + Wiki-„?"-Button, der
          `ItemWikiModal` mit Quelle/Verwendung DIESES Items öffnet — funktioniert zuverlässig nur
          auf gepinnten Karten (s. .itip-wiki-btn-JSDoc in components.css). Schließt die Tooltip-
          Karte dabei (`store.hide()`, dasselbe unbedingte Muster wie die `.it-action-btn`-
          Aktionsknöpfe unten), statt sie gepinnt HINTER dem Modal liegen zu lassen — sonst würde
          ein Escape-Druck zuerst nur den (noch registrierten) Tooltip schließen, bevor ein zweiter
          Druck das Modal schließt (escStack.ts-Priorität: Tooltip schlägt Modal). Mit dem Hide hier
          gibt es beim Öffnen des Wikis nur noch EIN offenes Overlay, ein Escape genügt.
          codex:2026-07-31T00:32:37+02:00 — Jede Item-Card erhält daneben einen expliziten Schließen-Knopf. */}
      <div className="itip-card-corner">
        {badge && <span className="itip-equipped-badge">{badge}</span>}
        <button
          type="button"
          className={`itip-wiki-btn${wikiBtnPulse ? " itip-wiki-btn--pulse" : ""}`}
          aria-label={t("itemwiki.openAria")}
          title={t("itemwiki.openAria")}
          data-guide-id={badge ? undefined : "itemCard.wikiBtn"}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openItemWikiModal(item.id, inst);
            store.hide();
          }}
        >
          ?
        </button>
        <button
          type="button"
          className="itip-close-btn"
          aria-label={t("common.close")}
          title={t("common.close")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            store.hide();
          }}
        >
          ×
        </button>
      </div>

      {/* Doppelzeilen-Rarity-Header: Name groß (Zeile 1) + Typ · Seltenheit (Zeile 2), beide
          Header-Bänder rarity-getönt via --rarity-col. Ungestylte Gruppen-Hülle NUR für den
          Item-Karten-Guide-Spotlight (data-guide-id, s. ITEM_CARD_TOUR_STEPS) — kein CSS daran,
          verändert das bestehende Layout nicht. `badge` markiert die sekundäre „Angelegt"-
          Vergleichskarte (s. ItemTooltipOverlay unten): die bekommt keine Guide-Ziele, sonst gäbe
          es zwei DOM-Knoten mit derselben `data-guide-id` gleichzeitig. */}
      <div data-guide-id={badge ? undefined : "itemCard.identity"}>
        <div className="itip-header-band-1">
          <div className="itip-name">{displayName}</div>
        </div>
        <div className="itip-header-band-2">
          <div className="itip-type-line">
            {typeLine} · {RAID_RARITY_ICON[rarity] && <img loading="lazy" decoding="async" src={RAID_RARITY_ICON[rarity]!} alt="" className="ui-icon itip-rarity-icon" />}{tr(RARITY_LABEL[rarity])}
          </div>
          {/* claude:2026-10-23T18:20:00+02:00 — 1.4.0 ST: Stufe als Sterne plus „Stufe VII“ (Chef 23.10.). */}
          {/* claude:2026-10-24T17:47:00+02:00 — Stufen-Zeile vorläufig aus (Chef 24.10.), Schalter in featureFlags.ts */}
          {SHOW_ITEM_TIERS && tierOfItem !== null && (
            <div className="itip-tier-line">
              <TierStars tier={tierOfItem} color={tierOfItem >= 13 ? rarityCol : undefined} />
              <span className="itip-tier-label">{t("item.tier").replace("{n}", tierRoman(tierOfItem))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Weapon specialty line — role description per weapon type */}
      {item.weaponType && (
        <div className="itip-specialty">{tr(WEAPON_TYPE_SPECIALTY[item.weaponType])}</div>
      )}

      {/* Chef-GO Regel 2 (Ring1/Ring2, Tool1/Tool2): einer der beiden Zwillings-Slots ist frei —
          nichts zu verdrängen, also kein Delta, stattdessen dieser dezente Hinweis. */}
      {slotFreeHint && (
        <div className="itip-slot-free-hint itip-tool-hint">{t("itip.delta.slotFree")}</div>
      )}

      {/* codex:2026-08-01T10:20:00+02:00 — Warbanner Record: Bild/Lore links, alle Fakten rechts;
          dieselben Daten bleiben erhalten, aber die Karte nutzt Breite statt eines internen Scrollwegs. */}
      <div className="itip-warbanner-main">
        <div className="itip-warbanner-visual">
          {/* Hero-Bühne: großes Item-Bild, dunkle Textur + Rarity-Glow, keine Slot-Box. */}
          <div className="itip-stage">
            {img ? (
              <TiltImage src={img} className="pixelart itip-img" />
            ) : item.icon ? (
              <span className="itip-emoji">{item.icon}</span>
            ) : (
              <span className="itip-placeholder">?</span>
            )}
          </div>

          {/* Flavor / Lore gehört als Bannertext zur visuellen Hälfte. */}
          <div className="itip-flavor">{tr(flavor)}</div>
        </div>

        <div className="itip-warbanner-record" data-guide-id={badge ? undefined : "itemCard.stats"}>
          {/* Stat-Gruppen: auf breiten Karten zweispaltig, damit Informationen nicht gestapelt wachsen. */}
          {(hasStats || hasStatExtras) && (
            <div className="itip-body">
              <OffenseGroup item={item} instance={inst} modTone={rarityCol} compareMap={compareMap} isEquipped={isEquipped} deltaMap={deltaMap} deltaTarget={deltaAgainst} />
              <DefenseGroup item={item} compareMap={compareMap} deltaMap={deltaMap} />
              <AttributesGroup item={item} compareMap={compareMap} deltaMap={deltaMap} />
              <SkillGroup item={item} compareMap={compareMap} />
              <MiscRows item={item} deltaTarget={deltaAgainst} />
              <RuneEffectGroup item={item} />
              {inst && inst.suffix && <SuffixGroup inst={inst} tone={rarityCol} compareMap={compareMap} />}
            </div>
          )}

          {/* codex:2026-08-01T12:47:00+02:00 — Verzauberung und On-Hit sind besondere
              Kampfmerkmale, keine normalen Tabellenwerte. Beide stehen als orange Effektplatten
              unter dem Faktenraster; reine Affix-Items erzeugen dadurch keinen leeren Statblock. */}
          {isEnchantable(item) && <EnchantGroup item={item} inst={inst} />}
          <EffectBlock item={item} />
          <ArrowBlock item={item} />
          <SetBonusSection item={item} />

          {(hasRequirements || hasValue) && (
            <div className="itip-footer-block">
              <RequirementsSection item={item} />
              {hasValue && (
                <div className="itip-value-row">
                  <span className="itip-value-weight">{weight !== undefined ? `${t("itip.weight")} ${weight}` : ""}</span>
                  <span className="itip-value-amount">
                    {formatNum(item.value ?? 0)}
                    {GOLD_ICON_URL
                      ? <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />
                      : <span className="itip-coin" aria-hidden="true"> &#9752;</span>}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="it-actions">
          {actions.map((a) => (
            <button
              key={a.key}
              className="it-action-btn"
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={() => {
                a.onClick();
                store.hide();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {showCompareHint && (
        <div className="it-hint muted">{t("item.compareHint")}</div>
      )}
    </div>
  );
}

export function ItemTooltipOverlay(): JSX.Element | null {
  const payload = useSyncExternalStore(store.subscribe, store.get);
  const { t } = useI18n();
  const state = useGameStateMaybe();
  const shift = useShiftHeld();
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  // Item-Karten-Guide (Chef-Auftrag 2026-08-27): hält die Payload-REFERENZ, für die `pos` zuletzt
  // korrekt berechnet wurde — NICHT einfach ein Bool, weil `ItemTooltipOverlay` app-weit EINMAL
  // gemountet ist (nie erneut). Ein simples Bool bliebe ab dem ALLERERSTEN Hover für immer `true`
  // und würde beim ERSTEN echten Pin (der Guide-Auslöser) wieder die STALE Position eines früheren
  // Hovers durchlassen. Gate NUR für den `AreaTourGuide`-Mount weiter unten (Bugfund im eigenen
  // Testlauf, s. dortiger JSDoc), sonst überall unbenutzt.
  const [positionedFor, setPositionedFor] = useState<TooltipPayload | null>(null);
  // claude:2026-10-17T13:35:00+02:00 — Nachmessen, wenn sich Fenster oder Karte nach dem Öffnen
  // ändern (gepinnte Karte + Fenster verkleinert, nachladendes Bild, Shift-Vergleich klappt um).
  // Vorher wurde nur bei neuer Payload/Shift geklammert — die Karte konnte aus dem Fenster ragen.
  const [measureTick, setMeasureTick] = useState(0);
  useEffect(() => {
    if (!payload) return;
    const bump = (): void => setMeasureTick((n) => n + 1);
    window.addEventListener("resize", bump);
    const el = ref.current;
    const ro = el && typeof ResizeObserver !== "undefined" ? new ResizeObserver(bump) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener("resize", bump);
      ro?.disconnect();
    };
  }, [payload]);

  // Position am Viewport-Rand clampen, sobald die echte Größe bekannt ist (inkl. Vergleichskarte).
  useLayoutEffect(() => {
    if (!payload || !ref.current) return;
    const el = ref.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const margin = 12;
    const offset = 18; // Abstand Cursor-Spitze ↔ Tooltip (Standardfall: oberhalb)
    // 1.0.1-Fix (Spieler-Bugreport „Tooltips unter dem Handcursor, erste Zeile unlesbar"): der
    // custom Cursor (base.css `cursor: url(cusor_default.webp) 0 0`) ist 39×38px groß mit dem
    // Hotspot OBEN-LINKS — die Grafik selbst ragt vom eigentlichen Mauszeiger-Punkt nach UNTEN-
    // RECHTS heraus. Ein knapper Versatz von 18px unter/rechts des Punkts (der bisherige Default)
    // landet damit MITTEN im Cursor-Bild und verdeckt die erste Tooltip-Zeile. Neuer Standard:
    // OBERHALB der Cursor-Spitze (dort kann die Cursor-Grafik nie hineinragen, ganz gleich wie
    // groß sie ist). Passt das mangels Platz nicht, weicht das Tooltip nach UNTEN aus — dort
    // braucht es einen deutlich größeren Versatz (über die 38px Cursor-Höhe hinaus), damit die
    // Cursor-Grafik den Tooltip-Kopf auch dann nicht überdeckt.
    const offsetBelowFallback = 46;
    let left = payload.x + offset;
    if (left + w > window.innerWidth - margin) left = payload.x - offset - w;
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
    let top = payload.y - offset - h;
    if (top < margin) top = payload.y + offsetBelowFallback;
    top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));

    // Letzte Sicherheit: bei sehr hohem Karteninhalt (Item-Karten hier gehen bis 97vh, s.
    // components.css .item-tooltip.itip-panel) auf kleinerem Viewport kann die Viewport-
    // Klammerung oben das Tooltip trotzdem zurück in den Cursor-Fußabdruck (39×38px, s. base.css
    // `cusor_default.webp` Hotspot oben-links) drücken. Echter Rechteck-Test statt Annahme —
    // greift nur in diesem Rand-Fall, verschiebt dann minimal (bevorzugt nach unten weg, sonst
    // zur Seite) bis der Cursor wieder frei liegt.
    const cursorW = 39;
    const cursorH = 38;
    const overlapsCursor =
      left < payload.x + cursorW && left + w > payload.x && top < payload.y + cursorH && top + h > payload.y;
    if (overlapsCursor) {
      const pushedDown = payload.y + cursorH + 4;
      if (pushedDown + h <= window.innerHeight - margin) top = pushedDown;
      else left = Math.min(window.innerWidth - w - margin, payload.x + cursorW + 4);
    }

    setPos((prev) => (prev.left === left && prev.top === top ? prev : { left, top }));
    setPositionedFor(payload);
  }, [payload, shift, measureTick]);

  // Gepinntes Tooltip via Esc / Klick außerhalb schließen. Escape läuft über die zentrale
  // Prioritäts-Registry (util/escStack.ts, Chef-GO Hotkeys) statt eines eigenen `keydown`-
  // Listeners — so entscheidet der EINE globale Handler in App.tsx, welches Overlay bei Escape
  // drankommt (Priorität "tooltip" schlägt Modals), statt dass zwei Listener dieselbe Taste
  // unabhängig voneinander auswerten.
  useEffect(() => {
    if (!payload?.pinned) return;
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) store.hide();
    };
    const unregisterEsc = registerEscCloser("tooltip", () => store.hide());
    // im nächsten Tick registrieren, damit der öffnende Klick nicht sofort schließt
    const id = window.setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => {
      unregisterEsc();
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onClick);
    };
  }, [payload?.pinned, payload?.itemId]);

  if (!payload) return null;
  const item = content.items[payload.itemId];
  if (!item) return null;

  // WoW-Stil-Vergleich: equippbares Item + im selben Slot ist etwas (anderes) angelegt.
  // Vergleichsziel UNABHÄNGIG von Shift bestimmen → so wissen wir, ob der „Shift"-Hinweis Sinn ergibt,
  // UND die neuen ▲/▼-Deltas (Chef-GO, ständig sichtbar) nutzen dasselbe Ziel.
  let compareItem: ItemDef | undefined;
  let compareInst: ItemInstance | undefined;
  let hasCompareTarget = false;
  // #304: true, wenn die gehoverte/gepinnte Karte exakt das Item+Instanz ist, das der Charakter
  // gerade im Slot trägt — nur dann darf OffenseGroup die „Effektiv"-Tempo-Zeile aus dem echten
  // `computeStats` zeigen (s. isEquipped-JSDoc dort) UND es gibt (Regel 4) keine Deltas.
  let mainIsEquipped = false;
  // Chef-GO Regel 2: Ring1/Ring2 bzw. Tool1/Tool2/Tool3 — einer der Geschwister-Slots ist frei
  // (nichts zu verdrängen) → kein Delta, stattdessen ein dezenter Hinweis.
  let slotFreeHint = false;

  if (state) {
    const eq = state.character.equipment;
    const insts = state.character.equippedInstances;
    const isSameAsHovered = (id: string | null | undefined, eqInst: ItemInstance | undefined): boolean =>
      (!!eqInst && eqInst === payload.instance) || (!eqInst && !payload.instance && !!id && id === payload.itemId);

    if (item.type === "tool" && item.tool) {
      // Werkzeuge (kein `item.slot`, `equipTool` fuellt die Werkzeug-Slots unabhaengig vom Skill)
      // SKILL-GEFILTERT vergleichen: ein neuer Fischerstab vergleicht nur gegen einen bereits
      // angelegten ANGELN-Stab, nie gegen eine Axt im anderen Werkzeug-Slot. Die Slot-Liste kommt
      // aus shared (seit SAVE 87 vier Stueck) — hier stand sie frueher als eigenes Literal, das
      // beim Anbau des vierten Slots stillschweigend veraltet waere.
      const candidates = (TOOL_SLOTS as readonly EquipSlot[])
        .map((slot) => ({ slot, id: eq[slot], inst: insts?.[slot] }))
        .filter((c): c is { slot: EquipSlot; id: string; inst: ItemInstance | undefined } =>
          !!c.id && content.items[c.id]?.tool?.skill === item.tool!.skill,
        );
      mainIsEquipped = candidates.some((c) => isSameAsHovered(c.id, c.inst));
      if (!mainIsEquipped) {
        if (candidates.length > 0) {
          // Schlechtestes (höchster speedMult = kleinster Zeit-Rabatt) der (meist nur einen)
          // gleich-skilligen Kandidaten — „dahin würde man wechseln".
          const worst = candidates.reduce((a, b) =>
            content.items[a.id]!.tool!.speedMult >= content.items[b.id]!.tool!.speedMult ? a : b,
          );
          hasCompareTarget = true;
          compareItem = content.items[worst.id];
          compareInst = worst.inst;
        } else if ((TOOL_SLOTS as readonly EquipSlot[]).some((slot) => !eq[slot])) {
          // Kein Werkzeug dieses Skills angelegt, aber mindestens ein Werkzeug-Slot ist frei.
          slotFreeHint = true;
        }
      }
    } else if (item.slot) {
      if (item.slot === "ring1" || item.slot === "ring2") {
        const idA = eq.ring1;
        const idB = eq.ring2;
        const instA = insts?.ring1;
        const instB = insts?.ring2;
        mainIsEquipped = isSameAsHovered(idA, instA) || isSameAsHovered(idB, instB);
        if (!mainIsEquipped) {
          if (idA && idB) {
            // Beide Ring-Slots belegt → gegen den SCHLECHTEREN vergleichen (dahin würde man
            // wechseln) — grobe Summen-Heuristik, s. `dualSlotWeight`-JSDoc.
            const weightA = dualSlotWeight(buildCompareMap(content.items[idA]!, instA));
            const weightB = dualSlotWeight(buildCompareMap(content.items[idB]!, instB));
            hasCompareTarget = true;
            const worse = weightA <= weightB ? "A" : "B";
            compareItem = worse === "A" ? content.items[idA] : content.items[idB];
            compareInst = worse === "A" ? instA : instB;
          } else if (idA || idB) {
            // Ein Ring-Slot ist frei — nichts zu verdrängen.
            slotFreeHint = true;
          }
        }
      } else {
        const eqId = eq[item.slot];
        const eqInst = insts?.[item.slot];
        mainIsEquipped = isSameAsHovered(eqId, eqInst);
        if (eqId && !mainIsEquipped) {
          hasCompareTarget = true;
          compareItem = content.items[eqId];
          compareInst = eqInst;
        }
      }
    }
  }
  const showCompare = shift && hasCompareTarget;
  // Chef-GO ▲/▼-Deltas: STÄNDIG sichtbar (kein Shift), nur an der Karte, die NICHT das angelegte
  // Item ist (Regel 4) — der sekundären "Angelegt"-Karte (unten) wird das nie mitgegeben.
  const deltaAgainst = !mainIsEquipped && hasCompareTarget && compareItem ? { item: compareItem, instance: compareInst } : null;

  // Shift-Compare-Pfeile (Chef-Feature): spiegelbildlich — die gehoverte Karte vergleicht gegen
  // die aggregierten Werte der ANGELEGTEN Karte und umgekehrt. Nur berechnet, wenn beide Karten
  // tatsächlich sichtbar sind (sonst bleiben die Maps null → StatRows rendert keine Pfeile).
  const hoveredCompareMap = showCompare ? buildCompareMap(item, payload.instance) : null;
  const equippedCompareMap = showCompare && compareItem ? buildCompareMap(compareItem, compareInst) : null;

  // Item-Karten-Guide (Chef-Auftrag 2026-08-27): dezenter Puls auf dem „?"-Knopf, solange die Tour
  // (unten) noch nie gesehen/übersprungen wurde — auf JEDER Karte (auch der Vergleichskarte und
  // reinen Hover-Vorschauen), nicht nur der gepinnten, damit der Knopf überhaupt erst auffällt.
  const wikiBtnPulse = !state?.onboarding.toursSeen.itemCardGuideV1;

  return (
    <div ref={ref} className="itip-compare-wrap" style={{ left: pos.left, top: pos.top }}>
      <ItemTooltipCard
        item={item}
        instance={payload.instance}
        actions={payload.actions}
        showCompareHint={hasCompareTarget && !shift}
        compareMap={equippedCompareMap}
        isEquipped={mainIsEquipped}
        deltaAgainst={deltaAgainst}
        slotFreeHint={slotFreeHint}
        wikiBtnPulse={wikiBtnPulse}
      />
      {showCompare && compareItem && (
        <ItemTooltipCard
          item={compareItem}
          instance={compareInst}
          actions={[]}
          badge={t("itip.equipped")}
          compareMap={hoveredCompareMap}
          // Diese Karte ist per Definition das Item, das der Charakter GERADE trägt (aus
          // state.character.equipment gelesen) — immer isEquipped, unabhängig von mainIsEquipped.
          isEquipped
          wikiBtnPulse={wikiBtnPulse}
        />
      )}
      {/*
       * Item-Karten-Guide (Chef-Auftrag „Wiki unauffindbar" 2026-08-27): Reddit-Spieler kennen den
       * „?"-Knopf nicht — kurzer Spotlight-Rundgang, sobald zum ERSTEN MAL auf diesem Save eine
       * Karte GEPINNT (angeklickt, nicht nur gehovert) wird. `AreaTourGuide` unverändert wieder-
       * verwendet, nur anders GEMOUNTET als bei Kampf/Shop/Bank: dort ist "die Seite ist offen" das
       * Gate (seiten-lokaler Mount), hier ist "eine Karte ist gepinnt" das Gate — exakt dasselbe
       * Prinzip (der Bereich IST hier die Karte). Schließt der Spieler die Karte vor dem Ende, un-
       * mountet die Tour einfach (kein Fortschritt gespeichert) und beginnt beim nächsten Pin von
       * vorn — identisches Verhalten zu einem Seitenwechsel mitten in COMBAT_TOUR_STEPS.
       *
       * `positionedFor`-Gate (Bugfund im eigenen Testlauf, Screenshot zeigte den Spotlight-Ring
       * oben links statt um die Karte): `.itip-compare-wrap` startet JEDEN neuen Payload bei
       * `pos={0,0}` und korrigiert sich erst im `useLayoutEffect` oben auf die echte Bildschirm-
       * position — Kind-Layout-Effekte (SpotlightGuide misst `data-guide-id`-Rects) feuern
       * INNERHALB DESSELBEN Commits VOR diesem Eltern-Effekt und würden die Karte sonst noch bei
       * {0,0} vermessen. Erst wenn `positionedFor === payload` (im SELBEN Effect-Batch wie die
       * echte `pos` gesetzt, s. dortiger JSDoc) steht die Karte an ihrer finalen Stelle.
       */}
      {payload.pinned && state && positionedFor === payload && (
        <AreaTourGuide tourKey="itemCardGuideV1" steps={ITEM_CARD_TOUR_STEPS} />
      )}
    </div>
  );
}
