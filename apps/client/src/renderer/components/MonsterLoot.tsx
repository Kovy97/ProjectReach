import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { content } from "@hearthforge/content";
import { isItemDiscovered } from "@hearthforge/engine";
import { EQUIP_SLOT_LABELS, ELITE_UNIQUE_DROP_CHANCE_DEFAULT } from "@hearthforge/shared";
import type { EliteVariantDef, GameState, ItemDef, LocalizedString, LootRoll, MonsterDef } from "@hearthforge/shared";
import { useGameSelector, useGameState } from "../game/GameContext";
import { getItemImage, rarityClass } from "../items";
import { useI18n } from "../i18n";
import { getUiIcon } from "../uiIcons";
import { formatDropPct, formatNum } from "../util/format";
import { registerEscCloser } from "../util/escStack";
import { FlipReveal } from "./FlipReveal";
import { openItemWikiModal } from "./ItemWikiModal";
import "../styles/monster-loot.css";

/**
 * claude:2026-10-25T10:32:00+01:00 — K5 (1.4.1, Steam-Rezension „Ein Teil der Beute wird vom Interface
 * verdeckt"): die Beute-Liste des Bestiariums (Gruppen Ausrüstung/Materialien/Sonstiges, Zeile mit
 * Bild · Name · Chance) ist hierher herausgelöst, damit Monsterkarte, Champion-Karte und Kampf-Kopfzeile
 * dieselbe volle Liste in einem Fenster zeigen. Die Aufdeck-Regel ist exakt die des Bestiariums:
 * `isItemDiscovered` (einmal besessen = sichtbar), sonst schwarze Silhouette + „???" und nur die Chance.
 */

/** Generisches Emblem für Beute ohne Bild UND ohne eigenes Item-Icon (Muster ItemWikiModal). */
const GENERIC_DROP_ICON_URL = getUiIcon("icon_ach_star");

export interface LootGroups {
  equipment: LootRoll[];
  material: LootRoll[];
  other: LootRoll[];
}

/** Sortiert eine Loot-Tabelle in Ausrüstung / Materialien / Sonstiges, je absteigend nach Chance
 *  (Chef-Glowup 26.08.2026 „Loot zu ungeordnet"; unbekannte Katalog-Einträge landen sicher bei den
 *  Materialien). */
export function groupLootRolls(rolls: readonly LootRoll[]): LootGroups {
  const byChanceDesc = (a: LootRoll, b: LootRoll) => b.chance - a.chance;
  const equipment: LootRoll[] = [];
  const material: LootRoll[] = [];
  const other: LootRoll[] = [];
  for (const roll of rolls) {
    const item = content.items[roll.itemId];
    if (item?.type === "equipment") equipment.push(roll);
    else if (!item || item.type === "material") material.push(roll);
    else other.push(roll);
  }
  equipment.sort(byChanceDesc);
  material.sort(byChanceDesc);
  other.sort(byChanceDesc);
  return { equipment, material, other };
}

/** Gruppierte Loot-Tabelle je Monster-ID, einmal beim Modul-Laden gebaut (Katalog ändert sich zur
 *  Laufzeit nie). Skalierte Instanzen (Champion/Paragon) tragen die Basis-ID und dieselbe Tabelle. */
const MONSTER_LOOT_GROUPS_INDEX: Record<string, LootGroups> = (() => {
  const idx: Record<string, LootGroups> = {};
  for (const m of Object.values(content.monsters) as MonsterDef[]) idx[m.id] = groupLootRolls(m.loot);
  return idx;
})();

const EMPTY_GROUPS: LootGroups = { equipment: [], material: [], other: [] };

export function monsterLootGroups(monsterId: string): LootGroups {
  return MONSTER_LOOT_GROUPS_INDEX[monsterId] ?? EMPTY_GROUPS;
}

/** claude:2026-10-25T11:01:00+01:00 — Gruppen für eine konkrete Kampf-Instanz: skalierte Kopien mit
 *  derselben Tabelle (Champion: `...base`) nutzen den Index, Instanzen mit eigener Tabelle (Paragon/Raid
 *  tragen `loot: []` unter der Basis-ID) werden aus ihrer eigenen Tabelle gruppiert, sonst zeigte das
 *  Fenster dort Beute, die gar nicht fällt. */
function lootGroupsFor(monster: MonsterDef): LootGroups {
  if (content.monsters[monster.id]?.loot === monster.loot) return monsterLootGroups(monster.id);
  return monster.loot.length > 0 ? groupLootRolls(monster.loot) : EMPTY_GROUPS;
}

/** claude:2026-10-25T10:32:00+01:00 — Champion-Zusatzbeute: Unikat (Chance aus der Variante, sonst der
 *  Engine-Standard) + `extraLoot`. Die Zonen-Tabelle des Grundmonsters fällt beim Champion-Sieg
 *  zusätzlich (combat.ts: Basis-Kill-Pfad, danach onEliteKilled), steht im Fenster deshalb darunter. */
export function championLootRolls(variant: EliteVariantDef): LootRoll[] {
  const rolls: LootRoll[] = [];
  if (content.items[variant.uniqueItemId]) {
    rolls.push({
      itemId: variant.uniqueItemId,
      chance: variant.uniqueDropChance ?? ELITE_UNIQUE_DROP_CHANCE_DEFAULT,
      min: 1,
      max: 1,
    });
  }
  for (const roll of variant.extraLoot ?? []) rolls.push(roll);
  return rolls;
}

/** Item-Typ als Kurztext am Beute-Eintrag (Waffenart, sonst Ausrüstungs-Slot) — Format der
 *  Dungeon-Karte (CombatPage.tsx `dropTypeLabel`). */
function dropTypeLabel(item: ItemDef | undefined, t: (k: string) => string, tr: (v: LocalizedString) => string): string {
  if (!item || item.type !== "equipment") return "";
  if (item.weaponType) return t(`item.weaponType.${item.weaponType}`);
  if (item.slot && EQUIP_SLOT_LABELS[item.slot]) return tr(EQUIP_SLOT_LABELS[item.slot]);
  return "";
}

/** claude:2026-10-25T10:32:00+01:00 — Menge je Fund („×1", „×2–5"); Zahlen, kein Übersetzungstext. */
function qtyLabel(roll: LootRoll): string {
  return roll.min === roll.max ? `×${formatNum(roll.min)}` : `×${formatNum(roll.min)}–${formatNum(roll.max)}`;
}

/**
 * Eine Beute-Gruppe ("Ausrüstung", "Materialien", "Sonstiges", im Fenster zusätzlich „Champion-
 * Beute") — rendert nichts, wenn die Gruppe leer ist.
 */
export function LootGroup({
  titleKey,
  rolls,
  state,
  t,
  tr,
  flippingItems,
  showQty = false,
}: {
  titleKey: string;
  rolls: LootRoll[];
  state: GameState;
  t: (key: string) => string;
  tr: (value: LocalizedString) => string;
  flippingItems?: Set<string>;
  /** claude:2026-10-25T10:32:00+01:00 — Menge je Fund unter der Chance (Beute-Fenster); das Bestiarium lässt sie aus. */
  showQty?: boolean;
}): JSX.Element | null {
  if (rolls.length === 0) return null;
  return (
    <div className="bjw-loot-group">
      <div className="bjw-loot-group-title muted">{t(titleKey)}</div>
      <div className="bjw-loot-list">
        {/* Index mit im Key (statt nur `roll.itemId`): manche Monster droppen dieselbe Item-ID über
            zwei getrennte Loot-Rollen (z.B. Basis- + Bonus-Rate). */}
        {rolls.map((roll, idx) => (
          <LootRow
            key={`${roll.itemId}-${idx}`}
            roll={roll}
            state={state}
            t={t}
            tr={tr}
            flipping={flippingItems?.has(roll.itemId) ?? false}
            showQty={showQty}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Eine Beute-Zeile: Bild · Name (2-Zeilen-Umbruch, nie Clip) · Chance rechts, Rarity als Streifen
 * links (`rarityClass`). Unentdeckt bleibt die Silhouette+„?"-Maskierung; Klick auf eine entdeckte
 * Zeile öffnet das Item-Wiki-Modal (`openItemWikiModal`).
 */
export function LootRow({
  roll,
  state,
  t,
  tr,
  flipping,
  showQty = false,
}: {
  roll: LootRoll;
  state: GameState;
  t: (key: string) => string;
  tr: (value: LocalizedString) => string;
  flipping: boolean;
  showQty?: boolean;
}): JSX.Element {
  const discovered = isItemDiscovered(state, roll.itemId);
  const item = content.items[roll.itemId];
  const img = getItemImage(roll.itemId);
  const pct = formatDropPct(roll.chance);
  // claude:2026-10-25T10:32:00+01:00 — rechte Spalte: Chance, im Fenster darunter die Menge.
  const figures = showQty ? (
    <span className="bjw-loot-figures">
      <span className={`bjw-loot-pct${discovered ? "" : " muted"}`}>{pct}</span>
      <span className="bjw-loot-qty muted">{qtyLabel(roll)}</span>
    </span>
  ) : (
    <span className={`bjw-loot-pct${discovered ? "" : " muted"}`}>{pct}</span>
  );

  const mysteryFace = img ? (
    <span className="bjw-loot-icon bjw-loot-mystery-wrap">
      <img loading="lazy" decoding="async" src={img} alt="" className="item-chip-img bjw-loot-silhouette pixelart" />
      <span className="bjw-loot-mystery-mark" aria-hidden="true">?</span>
    </span>
  ) : (
    <span className="bjw-loot-icon bjw-loot-mystery" aria-hidden="true">?</span>
  );

  if (!discovered) {
    return (
      <div className="bjw-loot-row undiscovered" title={t("combat.undiscovered")}>
        {mysteryFace}
        <span className="bjw-loot-text">
          <span className="bjw-loot-name muted">???</span>
        </span>
        {figures}
      </div>
    );
  }

  const typ = dropTypeLabel(item, t, tr);
  const revealedFace = (
    <span className="bjw-loot-icon">
      {img ? (
        <img loading="lazy" decoding="async" src={img} alt="" className="item-chip-img pixelart" />
      ) : item?.icon ? (
        <span className="item-chip-emoji">{item.icon}</span>
      ) : GENERIC_DROP_ICON_URL ? (
        <img loading="lazy" decoding="async" src={GENERIC_DROP_ICON_URL} alt="" className="item-chip-img" />
      ) : (
        <span className="item-chip-emoji">▪</span>
      )}
      <span className="bjw-loot-check" aria-hidden="true">✓</span>
    </span>
  );

  return (
    <div
      className={`bjw-loot-row ${rarityClass(item?.rarity)}`}
      title={item ? tr(item.name) : roll.itemId}
      role="button"
      tabIndex={0}
      onClick={() => openItemWikiModal(roll.itemId)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        openItemWikiModal(roll.itemId);
      }}
    >
      {flipping ? (
        <FlipReveal className="bjw-loot-icon-flip" flipping frontContent={mysteryFace} backContent={revealedFace} />
      ) : (
        revealedFace
      )}
      <span className="bjw-loot-text">
        <span className="bjw-loot-name">{item ? tr(item.name) : roll.itemId}</span>
        {typ && <span className="bjw-loot-type muted">{typ}</span>}
      </span>
      {figures}
    </div>
  );
}

/** Kleines Vorschau-Symbol im Karten-Knopf: rein dekorativ (sitzt IN einem <button>, daher nicht
 *  selbst klickbar). Gleiche Aufdeck-Regel wie die Zeile oben. */
function LootPreviewIcon({ itemId, discovered }: { itemId: string; discovered: boolean }): JSX.Element {
  const img = getItemImage(itemId);
  const item = content.items[itemId];
  if (!discovered) {
    return (
      <span className="mc-loot-preview-icon undiscovered">
        {img ? <img loading="lazy" decoding="async" src={img} alt="" className="pixelart bjw-loot-silhouette" /> : "?"}
      </span>
    );
  }
  return (
    <span className="mc-loot-preview-icon">
      {img ? (
        <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" />
      ) : (
        item?.icon ?? "▪"
      )}
    </span>
  );
}

/** Höchstzahl Vorschau-Symbole im Karten-Knopf; der Rest steht als „+N" daneben. */
const PREVIEW_MAX = 4;

/**
 * claude:2026-10-25T10:32:00+01:00 — K5: „Beute x/y" als klar erkennbarer Knopf (Monsterkarte,
 * Champion-Karte, Kampf-Kopfzeile). Öffnet das Beute-Fenster mit der vollen Liste. Der Zähler folgt
 * derselben Regel wie das Fenster (`isItemDiscovered`), damit Knopf und Liste nie auseinanderlaufen.
 * Abo über einen schmalen String-Selector (eine Ziffer je Eintrag) statt `useGameState()`: die Karte
 * rendert dadurch nur neu, wenn sich die Entdeckung wirklich ändert, nicht mit jedem Tick.
 */
export function MonsterLootButton({
  monster,
  champion,
  displayName,
  look,
}: {
  /** Monster, dessen Loot-Tabelle gilt (bei Champions die skalierte Instanz mit Basis-ID). */
  monster: MonsterDef;
  /** Gesetzt auf der Champion-Karte und im Champion-Kampf: Unikat + extraLoot stehen zusätzlich oben. */
  champion?: EliteVariantDef;
  /** Fenstertitel (Champion-Titel statt Basisname). */
  displayName: string;
  look: "card" | "hud";
}): JSX.Element | null {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // Stabil, damit das Fenster sich nur EINMAL im escStack anmeldet: eine Neuanmeldung je Tick (die
  // Kampf-Kopfzeile rendert im Takt) würde es vor ein später geöffnetes Item-Wiki schieben.
  const close = useCallback(() => setOpen(false), []);
  const championRolls = useMemo(() => (champion ? championLootRolls(champion) : []), [champion]);
  const groups = useMemo(() => lootGroupsFor(monster), [monster.id, monster.loot]);
  const allRolls = useMemo(
    () => [...championRolls, ...groups.equipment, ...groups.material, ...groups.other],
    [championRolls, groups],
  );
  const mask = useGameSelector((s) => allRolls.map((r) => (isItemDiscovered(s, r.itemId) ? "1" : "0")).join(""));
  if (allRolls.length === 0) return null;
  const seen = [...mask].filter((c) => c === "1").length;
  const label = `${t("combat.drops")} ${seen}/${allRolls.length}`;

  const modal = open ? (
    <MonsterLootModal
      groups={groups}
      championRolls={championRolls}
      displayName={displayName}
      onClose={close}
    />
  ) : null;

  if (look === "hud") {
    return (
      <>
        <button
          type="button"
          className="battle-hud-ribbon-toggle battle-hud-loot-btn"
          title={t("combat.loot.showAll")}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {label}
        </button>
        {modal}
      </>
    );
  }

  const preview = allRolls.slice(0, PREVIEW_MAX);
  const rest = allRolls.length - preview.length;
  return (
    <>
      <button
        type="button"
        className="shop-citadel-btn mc-loot-btn"
        title={t("combat.loot.showAll")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="mc-loot-btn-label">{label}</span>
        <span className="mc-loot-preview" aria-hidden="true">
          {preview.map((roll, idx) => (
            <LootPreviewIcon key={`${roll.itemId}-${idx}`} itemId={roll.itemId} discovered={mask[idx] === "1"} />
          ))}
          {rest > 0 && <span className="mc-loot-preview-more">+{rest}</span>}
        </span>
        <span className="mc-loot-btn-chevron" aria-hidden="true">›</span>
      </button>
      {modal}
    </>
  );
}

/**
 * claude:2026-10-25T10:32:00+01:00 — Beute-Fenster: Basis-Modal (`.modal-overlay`/`.modal`, Holzrahmen
 * + Basalt), Portal an document.body (die Kampfseite ist Container-Query-Wurzel, ein fixed-Overlay
 * darin richtete sich sonst an der Seite aus). Esc schließt über die zentrale escStack-Registry
 * („modal", LIFO: ein darüber geöffnetes Item-Wiki schließt zuerst). Rahmen fest, nur die Liste
 * scrollt — passt damit auch bei 1366×768 vollständig auf den Schirm.
 */
function MonsterLootModal({
  groups,
  championRolls,
  displayName,
  onClose,
}: {
  groups: LootGroups;
  championRolls: LootRoll[];
  displayName: string;
  onClose: () => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  const allRolls = [...championRolls, ...groups.equipment, ...groups.material, ...groups.other];
  const seen = allRolls.filter((r) => isItemDiscovered(state, r.itemId)).length;

  return createPortal(
    <div className="modal-overlay loot-modal-overlay" onClick={onClose}>
      <div
        className="modal loot-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${t("combat.killSummary.loot")} · ${displayName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="loot-modal-head">
          <div className="loot-modal-titles">
            <span className="loot-modal-kicker">{t("combat.killSummary.loot")}</span>
            <h2 className="loot-modal-name">{displayName}</h2>
            <span className="loot-modal-meta muted">
              {t("bestiary.zoneDiscovered").replace("{n}", String(seen)).replace("{total}", String(allRolls.length))}
              {" · "}
              {t("combat.loot.hint")}
            </span>
          </div>
          <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        </header>
        <div className="loot-modal-body bjw-loot">
          <LootGroup titleKey="combat.loot.championGroup" rolls={championRolls} state={state} t={t} tr={tr} showQty />
          <LootGroup titleKey="item.type.equipment" rolls={groups.equipment} state={state} t={t} tr={tr} showQty />
          <LootGroup titleKey="shop.cat.materials" rolls={groups.material} state={state} t={t} tr={tr} showQty />
          <LootGroup titleKey="nav.section.other" rolls={groups.other} state={state} t={t} tr={tr} showQty />
        </div>
      </div>
    </div>,
    document.body,
  );
}
