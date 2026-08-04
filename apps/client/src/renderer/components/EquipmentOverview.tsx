import { type CSSProperties } from "react";
import { content } from "@hearthforge/content";
import { activeSets, computeStats, equipItem, equipTool, unequipItem } from "@hearthforge/engine";
import type { EquipSlot, LocalizedString, SetDef } from "@hearthforge/shared";
import {
  ATTRIBUTES,
  CRIT_CHANCE_CAP,
  DEFENSE_MITIGATION_K,
  DEFENSE_MITIGATION_MAX,
  DODGE_CAP,
  EQUIP_SLOT_LABELS,
  TEMPO_REDUCTION_CAP,
} from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getUiIcon } from "../uiIcons";
import { playSfx } from "../util/audio";
import { equipSucceeded, reportEquipFailure } from "../util/equipFeedback";
import { formatSeconds1, formatStat } from "../util/format";
import { CitadelTip, HoverTip, useCitadelTip } from "./CitadelTip";
import { ItemCell } from "./ItemCell";

/**
 * Ausrüstungs-/Attribut-/Kampfwerte-Anzeige — extrahiert aus CharacterPage.tsx (Chef-Fix
 * 2026-07-05): der Combat-Log „Equipment"-Tab braucht dieselbe Übersicht, read-only. CharacterPage
 * importiert dieselben Bausteine + Konstanten (kein zweiter Datensatz), damit Icon-Zuordnung/
 * Slot-Reihenfolge/Formeln an EINER Stelle gepflegt werden.
 */

type TFn = (key: string) => string;

const STYLE_KEY: Record<string, string> = {
  melee: "style.melee",
  ranged: "style.ranged",
  magic: "style.magic",
};

export function styleLabel(t: TFn, style: string): string {
  const key = STYLE_KEY[style];
  return key ? t(key) : style;
}

/** Aktiver Stil → passendes COMBAT_STAT_ICON-Key für die „Schaden"-Zeile (Waffen 2.0 §7.1). */
export const STYLE_DAMAGE_ICON: Record<string, string> = {
  melee: "meleeDamage",
  ranged: "rangedDamage",
  magic: "magicDamage",
};

/**
 * Kompakte Set-Boni-Zusammenfassung (Itemization 2.0 §4.5): liest `set.modifiers` (ganzzahlige
 * Attribute) + `set.skillBoost` (die eine Stil-Boost-Krönung, §4.4).
 */
export function formatSetModifiers(set: SetDef, t: TFn, tr: (v: LocalizedString) => string): string {
  const p: string[] = [];
  if (set.modifiers) {
    for (const attr of ATTRIBUTES) {
      const v = set.modifiers[attr.id];
      if (v) p.push(`+${v} ${tr(attr.name)}`);
    }
  }
  if (set.skillBoost) {
    for (const [id, v] of Object.entries(set.skillBoost)) {
      if (!v) continue;
      const skill = content.skills[id];
      p.push(`+${v} ${skill ? tr(skill.name) : id}`);
    }
  }
  return p.join(", ");
}

/** Ornamentaler Sektions-Titel: ── TITLE ── */
export function SectionHeading({ title }: { title: string }): JSX.Element {
  return (
    <div className="cs-section-heading">
      <span className="cs-section-line" />
      <span className="cs-section-title">{title}</span>
      <span className="cs-section-line" />
    </div>
  );
}

// ── attribute card icons/colors/urls (one per attribute id, dark-fantasy theme) ──────────────
const ATTR_COLORS: Record<string, string> = {
  str: "#d65a3a",   // warm red-orange — strength, melee damage
  dex: "#5ec46e",   // vivid green — dexterity, speed, precision
  con: "#d39a4e",   // earthy amber — constitution, endurance
  int: "#5b8fd6",   // steel blue — intelligence, magic
  wis: "#a875d8",   // arcane purple — wisdom, mana mastery
  lck: "#e0c060",   // burnished gold — luck, fortune
};
const ATTR_ICON_URLS: Record<string, string | null> = {
  str: getUiIcon("icon_attribute_strength"),
  dex: getUiIcon("icon_attribute_dexterity"),
  con: getUiIcon("icon_attribute_constitution"),
  int: getUiIcon("icon_attribute_intelligence"),
  wis: getUiIcon("icon_attribute_wisdom"),
  lck: getUiIcon("icon_attribute_luck"),
};

// ── UI-Icon-URLs für Kampf-Stats ─────────────────────────────────────────────
export const COMBAT_STAT_ICON: Record<string, string | null> = {
  meleeDamage:      getUiIcon("icon_attribute_meeledamage"),
  rangedDamage:     getUiIcon("icon_attribute_rangedamage"),
  magicDamage:      getUiIcon("icon_attribute_magicdamage"),
  critChance:       getUiIcon("icon_attribute_crit_chance"),
  critDamage:       getUiIcon("icon_attribute_critdamage"),
  speed:            getUiIcon("icon_attribute_attack_speed"),
  defense:          getUiIcon("icon_attribute_defense"),
  accuracy:         getUiIcon("icon_attribute_accuracy"),
  evasion:          getUiIcon("icon_attribute_evasion"),
  mitigation:       getUiIcon("icon_attribute_defense"),
  dodge:            getUiIcon("icon_attribute_evasion"),
  block:            getUiIcon("icon_attribute_block"),
  wardPool:         getUiIcon("icon_attribute_ward"),
  wardRegen:        getUiIcon("icon_attribute_ward"),
  armorPen:         getUiIcon("icon_attribute_armorpen"),
  precision:        getUiIcon("icon_attribute_precision"),
  wardBreak:        getUiIcon("icon_attribute_wardbreak"),
};

/** Paperdoll-Slot-Reihenfolge (matcht das CSS-Grid `.cs-slot.<slot>` in character.css). */
export const DOLL_SLOTS: EquipSlot[] = [
  "tool2", // links neben dem Helm
  "helmet",
  "tool1", // rechts neben dem Helm
  "tool3", // dritter Werkzeug-Slot (Spieler-Feedback, Chef-GO 0.2.0): unter tool1, freie Grid-Zelle
  "amulet",
  "offhand",
  "body",
  "mainhand",
  "legs",
  "gloves",
  "boots",
  "cape",
  "ring1",
  "ring2",
];

type AttrMeta = (typeof ATTRIBUTES)[number];

/** Reines 3×2-Attribut-Kartenraster (STR/DEX/CON/INT/WIS/LCK). Hover/Fokus zeigt ein
 *  Erklär-Tooltip (Chef 2026-07-20: Spieler wusste nicht, was Attribute tun) — glowloses `.ct-tip`
 *  aus components/CitadelTip.tsx MIT dem `glow`-Modifier: der Glow-Ring bleibt exklusiv den
 *  Attribut-Karten vorbehalten (Tooltip-Vereinheitlichung, Chef-Auftrag 2026-07-23). */
export function AttributesGrid(): JSX.Element {
  const { t, tr } = useI18n();
  const state = useGameState();
  const stats = computeStats(state, content);
  const { tip, open, close } = useCitadelTip<AttrMeta>();
  return (
    <div className="cs-attr-section">
      <SectionHeading title={t("char.attributes")} />
      <div className="cs-attr-grid">
        {ATTRIBUTES.map((attr) => {
          const val = stats.attributes[attr.id];
          return (
            <div
              key={attr.id}
              className="cs-attr-card"
              tabIndex={0}
              role="button"
              aria-label={`${tr(attr.name)}: ${tr(attr.description)}`}
              onMouseEnter={(e) => open(attr, e.currentTarget)}
              onMouseLeave={close}
              onFocus={(e) => open(attr, e.currentTarget)}
              onBlur={close}
              style={{
                "--attr-color": ATTR_COLORS[attr.id] ?? "var(--gold)",
                ...(ATTR_ICON_URLS[attr.id]
                  ? { "--attr-symbol": `url("${ATTR_ICON_URLS[attr.id]}")` }
                  : {}),
              } as CSSProperties}
            >
              <span className="cs-attr-card-name">{tr(attr.name)}</span>
              <span className="cs-attr-card-val">{formatStat(val)}</span>
            </div>
          );
        })}
      </div>
      {tip && (
        <CitadelTip rect={tip.rect} glow glowColor={ATTR_COLORS[tip.data.id]}>
          <span className="ct-tip-title">{tr(tip.data.name)}</span>
          <span className="ct-tip-desc">{tr(tip.data.description)}</span>
        </CitadelTip>
      )}
    </div>
  );
}

interface EquipmentDollProps {
  /** Erlaubt Drag&Drop-Equip aus dem Inventar + Klick-Unequip wie auf der vollen Character-Seite.
   *  Default false → reine Lese-Ansicht (Combat-Log-Tab, "read-only Übersicht reicht" — Chef). */
  interactive?: boolean;
  /** Nur bei interactive=true nötig: geteilter Drag-State aus CharacterPage (Inventar-Drag). */
  dragItem?: string | null;
  onDragItem?: (itemId: string | null) => void;
}

/** Paperdoll-Ausrüstungsgitter. Nicht-interaktiv (Default) zeigt nur, was angelegt ist. */
export function EquipmentDoll({ interactive = false, dragItem = null, onDragItem }: EquipmentDollProps): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const c = state.character;
  // codex:2026-07-31T00:32:37+02:00 — Die Paperdoll zeigt ausschließlich Equipment.
  // Der frühere computeStats-Aufruf war unbenutzt und lief trotzdem bei jedem 10-Hz-Render.

  return (
    <>
      <div className="cs-doll-wrap">
        {/* Silhouette-Hintergrund ist optional (asset noch nicht geliefert, s. CharacterPage) —
            hier bewusst nur der neutrale Platzhalter-Kreis, kein zweiter import.meta.glob-Hook. */}
        <div className="cs-doll-silhouette-ph" aria-hidden="true" />
        <div className="cs-doll">
          {DOLL_SLOTS.map((slot) => {
            const itemId = c.equipment[slot];
            const draggedItem = interactive && dragItem ? content.items[dragItem] : null;
            const isToolSlot = slot === "tool1" || slot === "tool2" || slot === "tool3";
            const isRingSlot = slot === "ring1" || slot === "ring2";
            // Chef-Fund 19.07.: Ringe deklarieren kanonisch slot "ring1", dürfen aber BEIDE
            // Ring-Slots belegen (equipItem leitet intern auf ring2 um). Der Drop-Gültigkeits-
            // Check verglich aber slot-Namen exakt → ein Ring war auf dem ring2-Slot nie ein
            // gültiges Drop-Ziel. Ring-Slots teilen daher dieselbe Item-Familie wie Werkzeug-Slots.
            // Werkzeug-Slot akzeptiert reine Werkzeuge UND dual-use-Items mit `tool`-Feld (z.B. Äxte:
            // Waffe in Mainhand ODER Holzfäll-Werkzeug im Slot — Chef 2026-07-21).
            const valid = interactive && !!draggedItem &&
              (isToolSlot ? (draggedItem.type === "tool" || !!draggedItem.tool)
               : isRingSlot ? draggedItem.slot === "ring1"
               : draggedItem.slot === slot);

            return (
              <div
                key={slot}
                className={`cs-slot ${slot}${itemId ? " filled" : ""}${valid ? " slot-valid" : ""}`}
                data-rarity={itemId ? (content.items[itemId]?.rarity ?? "common") : undefined}
                onDragOver={valid ? (e) => e.preventDefault() : undefined}
                onDrop={
                  valid
                    ? (e) => {
                        e.preventDefault();
                        // Werkzeug-Slot: gezielt equipTool (nimmt auch dual-use-Items mit tool-Feld,
                        // z.B. Äxte); sonst der generische equipItem (Axt → Mainhand per item.slot).
                        if (dragItem) {
                          const res = isToolSlot
                            ? equipTool(state, content, dragItem)
                            : equipItem(state, content, dragItem);
                          if (equipSucceeded(res)) playSfx("equip");
                          else reportEquipFailure(state, content);
                        }
                        onDragItem?.(null);
                      }
                    : undefined
                }
              >
                {itemId ? (
                  <ItemCell
                    itemId={itemId}
                    className="slot-item"
                    instance={c.equippedInstances[slot]}
                    actions={
                      interactive
                        ? [
                            { key: "unequip", label: t("item.unequip"), onClick: () => { if (unequipItem(state, content, slot)) playSfx("equip"); } },
                          ]
                        : []
                    }
                  />
                ) : (
                  <span className="cs-slot-empty-label">{tr(EQUIP_SLOT_LABELS[slot])}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** Kampfwerte-Panel (linke+rechte Stat-Spalte + Set-Boni). Reiner Display-Block. */
export function CombatStatsPanel(): JSX.Element {
  const { t, tr } = useI18n();
  const state = useGameState();
  const stats = computeStats(state, content);
  const sets = activeSets(state, content);

  // 4-Tupel: [label, value, desc, iconKey?] — iconKey fehlt → kein Icon-Element
  type StatRow = [label: string, value: string, desc: string, iconKey?: string];
  const leftCombat: StatRow[] = [
    [t("stat.meleeDamage"), formatStat(stats.meleeDamage), t("statdesc.meleeDamage"), "meleeDamage"],
    [t("stat.rangedDamage"), formatStat(stats.rangedDamage), t("statdesc.rangedDamage"), "rangedDamage"],
    [t("stat.magicDamage"), formatStat(stats.magicDamage), t("statdesc.magicDamage"), "magicDamage"],
    [
      t("stat.critChance"),
      `${formatStat(stats.critChance * 100)}%${stats.critChance >= CRIT_CHANCE_CAP ? ` ${t("stat.atCap")}` : ""}`,
      t("statdesc.critChance"),
      "critChance",
    ],
    [t("stat.critDamage"), `${Math.round(stats.critDamage * 100)}%`, t("statdesc.critDamage"), "critDamage"],
  ];
  const mitigationPct = Math.min(
    DEFENSE_MITIGATION_MAX,
    stats.armorRating / (stats.armorRating + DEFENSE_MITIGATION_K),
  );
  // #304: dieselbe relative T1-Boden-Näherung wie ItemTooltip's neue "Effektiv"-Tempo-Zeile —
  // s. dortigen Kommentar zur bekannten Ranged-/Stance-Ungenauigkeit.
  const mainhandItem = state.character.equipment.mainhand ? content.items[state.character.equipment.mainhand] : undefined;
  const weaponBaseMs =
    mainhandItem && typeof mainhandItem.damageMin === "number" ? (mainhandItem.attackIntervalMs ?? 3000) : 3000;
  const speedAtCap = stats.attackIntervalMs <= weaponBaseMs * (1 - TEMPO_REDUCTION_CAP) + 0.5;
  const rightCombat: StatRow[] = [
    [
      t("stat.speed"),
      `${formatSeconds1(stats.attackIntervalMs / 1000)}s${speedAtCap ? ` ${t("stat.atCap")}` : ""}`,
      t("statdesc.speed"),
      "speed",
    ],
    [t("stat.mitigation"), `${Math.round(mitigationPct * 100)}%`, t("statdesc.mitigation"), "mitigation"],
    [t("stat.accuracy"), formatStat(stats.accuracy), t("statdesc.accuracy"), "accuracy"],
    [
      t("stat.dodge"),
      `${Math.round(stats.dodgeChance * 100)}%${stats.dodgeChance >= DODGE_CAP ? ` ${t("stat.atCap")}` : ""}`,
      t("statdesc.dodge"),
      "dodge",
    ],
    [
      t("stat.attackDamage"),
      `${formatStat(stats.attackDamageMin)} – ${formatStat(stats.attackDamageMax)}`,
      t("statdesc.attackDamage"),
      STYLE_DAMAGE_ICON[stats.style] ?? "meleeDamage",
    ],
  ];
  if (stats.blockChance > 0) {
    rightCombat.push([t("stat.block"), `${Math.round(stats.blockChance * 100)}%`, t("statdesc.block"), "block"]);
  }
  if (stats.maxWard > 0) {
    rightCombat.push([t("stat.wardPool"), formatStat(stats.maxWard), t("statdesc.wardPool"), "wardPool"]);
    const wardRegenPct = (stats.wardRegenPerSec / stats.maxWard) * 100;
    rightCombat.push([t("stat.wardRegen"), `${formatStat(wardRegenPct)}%/s`, t("statdesc.wardRegen"), "wardRegen"]);
  }
  if (stats.armorPen > 0) {
    rightCombat.push([t("stat.armorPen"), `+${Math.round(stats.armorPen * 100)}%`, t("statdesc.armorPen"), "armorPen"]);
  }
  if (stats.precision > 0) {
    rightCombat.push([t("stat.precision"), `+${Math.round(stats.precision * 100)}%`, t("statdesc.precision"), "precision"]);
  }
  if (stats.wardBreak > 0) {
    rightCombat.push([t("stat.wardBreak"), `+${Math.round(stats.wardBreak * 100)}%`, t("statdesc.wardBreak"), "wardBreak"]);
  }

  return (
    <div className="cs-stats-scroll">
      <div className="cs-combat-grid">
        <div className="cs-combat-col">
          {leftCombat.map(([label, value, desc, iconKey]) => {
            const iconUrl = iconKey ? COMBAT_STAT_ICON[iconKey] : null;
            return (
              <div key={label} className="cs-stat-row" title={desc}>
                {iconUrl && <img loading="lazy" decoding="async" src={iconUrl} alt="" className="cs-stat-icon" />}
                <span className="cs-stat-label">{label}</span>
                <span className="cs-stat-val">{value}</span>
              </div>
            );
          })}
        </div>
        <div className="cs-combat-col">
          {rightCombat.map(([label, value, desc, iconKey]) => {
            const iconUrl = iconKey ? COMBAT_STAT_ICON[iconKey] : null;
            return (
              <div key={label} className="cs-stat-row" title={desc}>
                {iconUrl && <img loading="lazy" decoding="async" src={iconUrl} alt="" className="cs-stat-icon" />}
                <span className="cs-stat-label">{label}</span>
                <span className="cs-stat-val">{value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {sets.length > 0 && (
        <>
          <SectionHeading title={t("char.setBonus")} />
          {sets.map((set) => (
            <div key={set.id} className="set-row">
              <span className="set-name">✦ {tr(set.name)}</span>
              <span className="set-bonus muted">{formatSetModifiers(set, t, tr)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Task #340: gruppierte Kampfwerte-Übersicht (Character-Screen „Stats"-Tab) ───────────────
// Neuer, EIGENSTÄNDIGER Baustein — bewusst KEIN Umbau von CombatStatsPanel oben: der Combat-Log
// „Equipment"-Tab (EquipmentOverview → CombatStatsPanel) bleibt dadurch byte-identisch, während
// der Character-Screen jetzt die volle Panelhöhe für eine besser lesbare, gruppierte Anordnung
// derselben Werte bekommt (Chef-Auftrag „besser angeordnet, besser lesbar" — keine neuen Stats).

/** Eine einzelne Kampfwert-Zeile — dieselben Klassen wie in CombatStatsPanel (.cs-stat-row/-label/
 *  -val/-icon), damit etwaige (parallel kalibrierte) Sizing-Regeln in character.css automatisch
 *  weitergelten (Koordinations-Vorgabe Task #340: Zeilen-Klassen wiederverwenden, nicht anfassen).
 *  Chef-Nachtrag Task #343: natives `title` ersetzt durch `HoverTip` (Citadel-Standard, s.
 *  CharacterPage.tsx Inventar-Kapazitätshinweis für dasselbe `as="div"`+`content`-Muster) — der
 *  Browser-Tooltip klebte an der Maus und überlappte den Cursor; HoverTip portalt gegen
 *  `document.body` mit Flip-Positionierung (nie unter dem Zeiger). Nur DIESE Komponente (Stats-
 *  Tab) migriert — CombatStatsPanel (Combat-Log „Ausrüstung"-Tab) bleibt bewusst byte-identisch
 *  mit seinem eigenen `title=`, s. Klassenkommentar dort. */
function StatLine({
  label,
  value,
  desc,
  iconKey,
}: {
  label: string;
  value: string;
  desc: string;
  iconKey?: string;
}): JSX.Element {
  const iconUrl = iconKey ? COMBAT_STAT_ICON[iconKey] : null;
  return (
    <HoverTip as="div" className="cs-stat-row" content={<span className="ct-tip-desc">{desc}</span>}>
      {iconUrl && <img loading="lazy" decoding="async" src={iconUrl} alt="" className="cs-stat-icon" />}
      <span className="cs-stat-label">{label}</span>
      <span className="cs-stat-val">{value}</span>
    </HoverTip>
  );
}

type StatRow = [label: string, value: string, desc: string, iconKey?: string];

/** Eine Stat-Sektion des „Stats"-Tabs: Zwischenüberschrift + EIN Zeilenraster über die volle
 *  Panelbreite (reuse `.cs-combat-grid`/`.cs-combat-col`/`.cs-stat-row`, dieselben Klassen wie
 *  CombatStatsPanel). `.cs-tab-stat-group` ist selbst ein Flex-Kind von `.cs-stats-scroll`
 *  (flex-direction:column, unverändert) — die Zeilenzahl kommt als `.cs-tab-w<n>`-KLASSE (nicht
 *  Inline-Style!) rein, damit Gruppen mit vielen Zeilen (Offensive) nicht dieselbe Höhe wie kurze
 *  Gruppen (Tempo & Krit) bekommen. Bewusst KEIN Inline-`style`: Inline-Styles schlagen jede
 *  externe Regel unabhängig von Media Query/Spezifität — der @600px-Schmalfenster-Fallback in
 *  character.css (`.cs-tab-stat-group { flex: none }`) müsste sonst gegen ihn ankämpfen (Mess-
 *  Befund: tat es nicht, Zeilen blieben bei ~500px unlesbar winzig). Als Klasse gewinnt die
 *  später deklarierte @600px-Regel ganz normal per Kaskade.
 *  Task #343 (Chef: Stats-Tab „wirkt willkürlich" — Zeilen fluchteten nicht): die VORHERIGE
 *  Version hatte hier eine `cols=2`-Option (naive Halbierung der Zeilenliste in zwei unabhängige
 *  Flex-Spalten) — GENAU DAS war der gemeldete Versatz: bei ungleicher Zeilenzahl je Spalte (z.B.
 *  3 links/2 rechts) teilte sich jede Spalte dieselbe Gruppenhöhe unter einer ANDEREN Zeilenzahl
 *  auf, wodurch Zeile 1 links/rechts nie dieselbe Höhe hatte und die Reihen driften. Screenshot-
 *  Vergleich (ui-audit/stats-tab-343-A-pairedgrid-*.png vs. stats-tab-343-B-singlecol-*.png, beide
 *  Auflösungen + Fixtures): ein ECHTES 2-Spalten-Grid mit bewusst gesetzten Paaren (Variante A)
 *  fluchtete zwar jetzt auch sauber, wirkte durch die zwangsläufigen Leerzellen (z.B. neben
 *  "Magie", "Ausweichchance") aber unruhiger als die 1-spaltige Variante — EIN durchgehendes
 *  Zeilenraster ohne Lücken liest sich über den ganzen Tab (alle 3 Gruppen + Set-Bonus) als EIN
 *  ruhiger Fluss. Gewählt: 1-spaltig, volle Breite — kein `cols`-Parameter mehr nötig. */
function StatGroup({ title, rows }: { title: string; rows: StatRow[] }): JSX.Element {
  const rowCount = Math.min(Math.max(rows.length, 1), 6);
  return (
    <div className={`cs-tab-stat-group cs-tab-w${rowCount}`}>
      <SectionHeading title={title} />
      <div className="cs-combat-grid cs-tab-stat-grid-1col">
        <div className="cs-combat-col">
          {rows.map(([label, value, desc, iconKey]) => (
            <StatLine key={label} label={label} value={value} desc={desc} iconKey={iconKey} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Gruppierte Kampfwerte-Übersicht für den Character-Screen „Stats"-Tab (Task #340): dieselben
 * Werte wie CombatStatsPanel, aber in vier überschriebene Abschnitte sortiert (Offensive/
 * Defensive/Tempo&Krit/Set-Bonus) statt zwei roher Spalten — der Tab hat jetzt die volle
 * Panelhöhe statt sich mit dem Equipment-Container zu teilen (vorher zwei gestapelte Container).
 */
export function CombatStatsPanelGrouped(): JSX.Element {
  const { t, tr } = useI18n();
  const state = useGameState();
  const stats = computeStats(state, content);
  const sets = activeSets(state, content);

  const mitigationPct = Math.min(
    DEFENSE_MITIGATION_MAX,
    stats.armorRating / (stats.armorRating + DEFENSE_MITIGATION_K),
  );
  // #304: dieselbe relative T1-Boden-Näherung wie CombatStatsPanel oben (s. dortigen Kommentar).
  const mainhandItem = state.character.equipment.mainhand ? content.items[state.character.equipment.mainhand] : undefined;
  const weaponBaseMs =
    mainhandItem && typeof mainhandItem.damageMin === "number" ? (mainhandItem.attackIntervalMs ?? 3000) : 3000;
  const speedAtCap = stats.attackIntervalMs <= weaponBaseMs * (1 - TEMPO_REDUCTION_CAP) + 0.5;

  const offensive: StatRow[] = [
    [t("stat.meleeDamage"), formatStat(stats.meleeDamage), t("statdesc.meleeDamage"), "meleeDamage"],
    [t("stat.rangedDamage"), formatStat(stats.rangedDamage), t("statdesc.rangedDamage"), "rangedDamage"],
    [t("stat.magicDamage"), formatStat(stats.magicDamage), t("statdesc.magicDamage"), "magicDamage"],
    [
      t("stat.attackDamage"),
      `${formatStat(stats.attackDamageMin)} – ${formatStat(stats.attackDamageMax)}`,
      t("statdesc.attackDamage"),
      STYLE_DAMAGE_ICON[stats.style] ?? "meleeDamage",
    ],
    [t("stat.accuracy"), formatStat(stats.accuracy), t("statdesc.accuracy"), "accuracy"],
  ];
  if (stats.armorPen > 0) offensive.push([t("stat.armorPen"), `+${Math.round(stats.armorPen * 100)}%`, t("statdesc.armorPen"), "armorPen"]);
  if (stats.precision > 0) offensive.push([t("stat.precision"), `+${Math.round(stats.precision * 100)}%`, t("statdesc.precision"), "precision"]);
  if (stats.wardBreak > 0) offensive.push([t("stat.wardBreak"), `+${Math.round(stats.wardBreak * 100)}%`, t("statdesc.wardBreak"), "wardBreak"]);

  const defensive: StatRow[] = [
    [t("stat.mitigation"), `${Math.round(mitigationPct * 100)}%`, t("statdesc.mitigation"), "mitigation"],
    [
      t("stat.dodge"),
      `${Math.round(stats.dodgeChance * 100)}%${stats.dodgeChance >= DODGE_CAP ? ` ${t("stat.atCap")}` : ""}`,
      t("statdesc.dodge"),
      "dodge",
    ],
  ];
  if (stats.blockChance > 0) defensive.push([t("stat.block"), `${Math.round(stats.blockChance * 100)}%`, t("statdesc.block"), "block"]);
  if (stats.maxWard > 0) {
    defensive.push([t("stat.wardPool"), formatStat(stats.maxWard), t("statdesc.wardPool"), "wardPool"]);
    const wardRegenPct = (stats.wardRegenPerSec / stats.maxWard) * 100;
    defensive.push([t("stat.wardRegen"), `${formatStat(wardRegenPct)}%/s`, t("statdesc.wardRegen"), "wardRegen"]);
  }

  const tempoCrit: StatRow[] = [
    [
      t("stat.speed"),
      `${formatSeconds1(stats.attackIntervalMs / 1000)}s${speedAtCap ? ` ${t("stat.atCap")}` : ""}`,
      t("statdesc.speed"),
      "speed",
    ],
    [
      t("stat.critChance"),
      `${formatStat(stats.critChance * 100)}%${stats.critChance >= CRIT_CHANCE_CAP ? ` ${t("stat.atCap")}` : ""}`,
      t("statdesc.critChance"),
      "critChance",
    ],
    [t("stat.critDamage"), `${Math.round(stats.critDamage * 100)}%`, t("statdesc.critDamage"), "critDamage"],
  ];

  return (
    <div className="cs-stats-scroll cs-tab-stats-scroll">
      <StatGroup title={t("char.statGroup.offensive")} rows={offensive} />
      <StatGroup title={t("char.statGroup.defensive")} rows={defensive} />
      <StatGroup title={t("char.statGroup.tempoCrit")} rows={tempoCrit} />

      {sets.length > 0 && (
        // Bewusst OHNE flex-grow (anders als .cs-tab-stat-group oben) — bleibt wie im
        // ursprünglichen CombatStatsPanel content-hoch am unteren Rand, statt sich künstlich zu
        // strecken (eine variable Liste aktiver Sets soll nicht "atmen" wie die festen Stat-Reihen).
        <div className="cs-tab-setbonus-group">
          <SectionHeading title={t("char.setBonus")} />
          {sets.map((set) => (
            <div key={set.id} className="set-row">
              <span className="set-name">✦ {tr(set.name)}</span>
              <span className="set-bonus muted">{formatSetModifiers(set, t, tr)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Kombinierte Lese-Übersicht für den Combat-Log „Equipment"-Tab (Chef-Fix 2026-07-05): Attribute +
 * Ausrüstung + Kampfwerte gestapelt, ohne die Character-Page-Rahmen (der Tab hat seinen eigenen).
 * Non-interaktiv — Drag&Drop/Unequip bleiben der vollen Character-Seite vorbehalten.
 */
export function EquipmentOverview(): JSX.Element {
  return (
    <div className="equip-overview">
      <AttributesGrid />
      <div className="equip-overview-doll">
        <EquipmentDoll />
      </div>
      <CombatStatsPanel />
    </div>
  );
}
