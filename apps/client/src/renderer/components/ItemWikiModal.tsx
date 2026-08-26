import { useEffect, useState, useSyncExternalStore } from "react";
import { content } from "@hearthforge/content";
import { isZoneUnlocked } from "@hearthforge/engine";
import type { GameState, ItemDef, ItemInstance, LocalizedString } from "@hearthforge/shared";
import { EQUIP_SLOT_LABELS, getItemRarity, instanceDisplayName, RARITY_LABEL } from "@hearthforge/shared";
import { CitadelTip, useCitadelTip } from "./CitadelTip";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { getSidebarIcon } from "../sidebarIcons";
import { getSkillIcon } from "../skillIcons";
import { getUiIcon } from "../uiIcons";
import { registerEscCloser } from "../util/escStack";
import { formatDamage, formatDropPct, formatNum, formatSeconds1, formatStat } from "../util/format";
import { ITEM_SOURCE_INDEX, ITEM_USED_FOR_INDEX, type ItemWikiSource, type ItemWikiUse } from "../util/itemWiki";
import { jumpToAction } from "../util/skillJump";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
// Chef-Redesign 26.08.2026 ("Emojis durch unsere neuen Achievement-Icons ersetzen"): die kleinen
// Kennzeichnungs-Icons je Quelle-Zeilenart (Laden/Slayer-Turm/Belohnungsladen/Monster/Dungeon/
// Rezept) wechseln von rohen Emoji-Zeichen auf dieselbe gemalte Embleme-Familie wie
// AchievementsPage.tsx' Kategorie-Icons (assets/icons/icon_ach_*.webp). Zuordnung (Mira-Mockup
// "02 Forge Flow", Chef-Auftrag 26.08.2026): Rezept = Amboss/Forge, Monster/Slayer = Klingen,
// Belohnungsladen = Siegelrolle, Truhe/Dungeon/Laden = Kiste bzw. Münzsack.
const SHOP_ICON_URL = getUiIcon("icon_ach_gold");
const COMBAT_ICON_URL = getUiIcon("icon_ach_combat");
const SCROLL_ICON_URL = getUiIcon("icon_ach_scroll");
const CHEST_ICON_URL = getUiIcon("icon_ach_gift");
const FORGE_ICON_URL = getUiIcon("icon_ach_forge");
const GENERIC_ICON_URL = getUiIcon("icon_ach_star");
// Story-Zonen-Gate (Task #350, Chef-Fund "Wiki-Links führen in gesperrte Zonen"): dasselbe
// Schloss-Icon wie die Zonen-/Dungeon-Karten in CombatPage.tsx (`LOCK_ICON_URL`-Muster dort).
const LOCK_ICON_URL = getUiIcon("icon_locked");

/** Skill-Icon-Fallback-Kette (Kampf-PNG → Sidebar-PNG → generisches Emblem) — nur noch für die
 *  Ernte-Quelle (Farming) gebraucht, seit Rezept-Quellen ein festes Amboss-Icon tragen (s.o.) und
 *  Verwendungs-Knoten das Bild des erzeugten Items zeigen statt eines Skill-Icons. */
function WikiSkillIcon({ skillId }: { skillId: string }): JSX.Element {
  const url = getSkillIcon(skillId) ?? getSidebarIcon(skillId) ?? GENERIC_ICON_URL;
  return url ? (
    <img loading="lazy" decoding="async" src={url} alt="" className="iwk-row-icon-img" />
  ) : (
    <span className="iwk-row-icon-emoji" aria-hidden="true" />
  );
}

/**
 * Formatiert eine Drop-/Erfolgschance IMMER als Prozent (Chef-Entscheid 2026-07-09: „Das sollte
 * immer % sein"). Delegiert an `formatDropPct` (gleiche Quelle wie Karte/Bestiarium). Die „—"-
 * Sonderrolle für eine echte 0 bleibt lokal (Content-Bug-Signal, kein Fall für die geteilte Funktion).
 */
function pct(chance: number): string {
  if (chance <= 0) return "—"; // echte 0 wäre ein Content-Bug; ehrlich als „—" statt „0%"
  return formatDropPct(chance);
}

/**
 * Typ-Zeile im Wiki-Kopf ("Zweihand-Schwert" / "Kopf" / "Verzehrbar" …). Bewusst eine eigene
 * schlanke Kopie von ItemTooltip.tsx' `buildItemTypeLine` statt eines Re-Imports von dort:
 * ItemTooltip.tsx importiert bereits `openItemWikiModal` VON HIER — ein Re-Import in die
 * Gegenrichtung würde einen Zirkelbezug öffnen.
 */
function wikiTypeLine(item: ItemDef, t: (k: string) => string, tr: (v: LocalizedString) => string): string {
  if (item.weaponType) return t(`item.weaponType.${item.weaponType}`);
  if (item.weaponStyle) {
    const hand = item.twoHanded ? t("itip.twoHandedPrefix") : t("itip.oneHandedPrefix");
    const style = t(`itip.weaponStyle.${item.weaponStyle}`);
    return `${hand} ${style}`;
  }
  if (item.slot) return tr(EQUIP_SLOT_LABELS[item.slot]);
  return t(`item.type.${item.type}`);
}

/**
 * Fundort einer Monster-Quelle, roh (Content-Ableitung, kein `t()`/`tr()` nötig) — wird erst beim
 * Rendern über `locationLabel` in einen Anzeigetext aufgelöst. Drei Fundort-Arten: reine Zonen-
 * Begegnung, Dungeon-Welle (`MonsterDef.dungeonOnly`) und Slayer-Turm-Etage (`MonsterDef.slayerFloor`).
 */
type MonsterLocation =
  | { type: "zone"; zoneId: string }
  | { type: "dungeon"; dungeonId: string }
  | { type: "tower"; floor: number }
  | { type: "unknown" };

function resolveMonsterLocation(monsterId: string): MonsterLocation {
  const monster = content.monsters[monsterId];
  if (!monster) return { type: "unknown" };
  if (monster.slayerFloor !== undefined) return { type: "tower", floor: monster.slayerFloor };
  if (monster.dungeonOnly) {
    const dungeon = content.dungeons.find((d) => d.encounters.includes(monsterId));
    if (dungeon) return { type: "dungeon", dungeonId: dungeon.id };
  }
  if (monster.zone) return { type: "zone", zoneId: monster.zone };
  return { type: "unknown" };
}

/** Sortier-Rang für die Fundort-Aufschlüsselung EINER Karte: Zone vor Dungeon vor Turm. */
const LOCATION_RANK: Record<MonsterLocation["type"], number> = { zone: 0, dungeon: 1, tower: 2, unknown: 3 };

/** Löst einen `MonsterLocation` in seinen Anzeigetext auf (Zone/Dungeon/Turm-Etage). Nie hartkodiert. */
function locationLabel(loc: MonsterLocation, t: (k: string) => string, tr: (v: LocalizedString) => string): string {
  switch (loc.type) {
    case "zone": {
      const zone = content.zones.find((z) => z.id === loc.zoneId);
      return zone ? tr(zone.name) : t("app.unknown");
    }
    case "dungeon": {
      const dungeon = content.dungeons.find((d) => d.id === loc.dungeonId);
      return dungeon ? tr(dungeon.name) : t("app.unknown");
    }
    case "tower":
      return t("slayer.location.tower").replace("{n}", String(loc.floor));
    default:
      return t("app.unknown");
  }
}

interface MonsterLocationEntry {
  monsterId: string;
  chance: number;
  location: MonsterLocation;
}

/**
 * Eine (ggf. über mehrere Fundorte) zusammengeführte Monster-Quelle-Karte — s. `groupMonsterSources`
 * für den WARUM. Ersetzt `ItemWikiSource`'s `kind: "monster"` auf der Anzeige-Seite vollständig.
 */
interface MonsterGroupSource {
  kind: "monsterGroup";
  name: LocalizedString;
  /** Klick-Ziel bei einem evtl. künftigen Zonen-Sprung — aktuell nur für den Sperr-Status genutzt:
   *  die reine Zonen-Variante, falls vorhanden (nach `LOCATION_RANK`-Sortierung steht sie an erster
   *  Stelle) — sonst best-effort die erste bekannte Fundstelle. */
  primaryMonsterId: string;
  locations: MonsterLocationEntry[];
  /** true, wenn jede Fundstelle dieselbe Chance trägt — dann genügt EIN Prozentwert auf der Karte
   *  statt der Fundort-Aufschlüsselung. Bei nur einem Fundort immer true. */
  sameChance: boolean;
}

type DisplaySource = ItemWikiSource | MonsterGroupSource;

/**
 * Führt "monster"-Quellen mit identischem Anzeige-Namen zu EINER Karte zusammen (Chef-Befund
 * 2026-08-25: „Skelettkrieger 90% erscheint zweimal in QUELLE"). Ursache: dieselbe Kreatur lebt im
 * Content oft als mehrere unabhängige `MonsterDef`-Einträge mit GLEICHEM `name`, aber eigener
 * MonsterId (Zone/Dungeon-Welle/Turm-Etage, s. packages/content/src/index.ts). Die Zusammenführung
 * passiert bewusst NUR hier auf der Anzeige-Seite. Gruppierschlüssel ist `name.en`, die einzige
 * garantiert vorhandene, sprachunabhängige Identität einer `LocalizedString`. Alle anderen Quellen-
 * Arten (shop/action/dungeon/crop/…) laufen unverändert durch.
 */
function groupMonsterSources(sources: ItemWikiSource[]): DisplaySource[] {
  const result: DisplaySource[] = [];
  const groups = new Map<string, MonsterGroupSource>();
  for (const s of sources) {
    if (s.kind !== "monster") {
      result.push(s);
      continue;
    }
    const key = typeof s.name === "string" ? s.name : s.name.en;
    let group = groups.get(key);
    if (!group) {
      group = { kind: "monsterGroup", name: s.name, primaryMonsterId: s.monsterId, locations: [], sameChance: true };
      groups.set(key, group);
      result.push(group);
    }
    group.locations.push({ monsterId: s.monsterId, chance: s.chance, location: resolveMonsterLocation(s.monsterId) });
  }
  for (const group of groups.values()) {
    group.locations.sort((a, b) => LOCATION_RANK[a.location.type] - LOCATION_RANK[b.location.type]);
    // `!`: jede Gruppe wurde nur beim ersten Push angelegt (s.o.) — `locations` hat also immer
    // mindestens einen Eintrag (`noUncheckedIndexedAccess` kennt das logisch garantierte Minimum
    // nicht, deshalb die Assertion statt eines toten `if`-Zweigs).
    group.primaryMonsterId = group.locations[0]!.monsterId;
    const first = group.locations[0]!.chance;
    group.sameChance = group.locations.every((l) => l.chance === first);
  }
  return result;
}

/** Icon je Quelle-Art (Chef-Auftrag "02 Forge Flow" 26.08.2026: "jede Quelle bekommt ein Icon nach
 *  Art — Rezept=forge, Monster=combat, Truhe/Dungeon=gift/chest, Shop=bestehendes Shop-Icon,
 *  Slayer=combat, Quest-Laden=scroll"). Ernte bleibt beim echten Farming-Skill-Icon. */
function sourceIconNode(entry: DisplaySource): JSX.Element {
  const img = (url: string | null): JSX.Element =>
    url ? <img loading="lazy" decoding="async" src={url} alt="" /> : <span className="iwk-row-icon-emoji" aria-hidden="true" />;
  switch (entry.kind) {
    case "monsterGroup":
    case "slayerShop":
      return img(COMBAT_ICON_URL);
    case "action":
      return img(FORGE_ICON_URL);
    case "dungeon":
      return img(CHEST_ICON_URL);
    case "shop":
      return img(SHOP_ICON_URL);
    case "tokenShop":
      return img(SCROLL_ICON_URL);
    case "crop":
      return <WikiSkillIcon skillId="farming" />;
    default:
      return img(GENERIC_ICON_URL);
  }
}

interface SourceMeta {
  name: string;
  subline: string;
  value: JSX.Element;
}

/**
 * Anzeige-Inhalt (Name/Unterzeile/Wert) EINER Quelle-Karte — von der Zeile im QUELLEN-Panel UND
 * vom Fußband für die "Ausgewählte Quelle" gemeinsam genutzt (Chef-Auftrag: "Fußband zeigt Name,
 * Unterzeile (Ort/Skill/Laden) und Chance"). Reine Text-/JSX-Ableitung, kein Hook — darf aus jeder
 * Komponente heraus aufgerufen werden.
 */
function sourceMeta(entry: DisplaySource, t: (k: string) => string, tr: (v: LocalizedString) => string): SourceMeta {
  switch (entry.kind) {
    case "monsterGroup": {
      const name = tr(entry.name);
      if (entry.sameChance) {
        const loc = entry.locations[0]!;
        return { name, subline: locationLabel(loc.location, t, tr), value: <>{pct(loc.chance)}</> };
      }
      // Mehrere Fundorte mit UNTERSCHIEDLICHER Chance: Chef-Vorgabe "Aufschlüsselung wie bisher in
      // der Unterzeile" — dieselbe Fundort+Chance-Liste, die vorher unter der aktiven Zeile stand.
      const subline = entry.locations.map((l) => `${locationLabel(l.location, t, tr)} ${pct(l.chance)}`).join(" · ");
      return { name, subline, value: <>{pct(entry.locations[0]!.chance)}</> };
    }
    case "action": {
      const skill = content.skills[entry.skillId];
      return { name: tr(entry.name), subline: skill ? tr(skill.name) : entry.skillId, value: <>{pct(entry.chance)}</> };
    }
    case "dungeon":
      return { name: tr(entry.name), subline: t("itemwiki.sourceKind.dungeon"), value: <>{pct(entry.chance)}</> };
    case "crop":
      return { name: tr(entry.name), subline: "", value: <>100%</> };
    case "shop":
      return {
        name: t("itip.sourceShop"),
        subline: "",
        value: (
          <>
            {formatNum(entry.cost)}
            {GOLD_ICON_URL && <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />}
          </>
        ),
      };
    case "slayerShop":
      return { name: t("nav.slayer"), subline: "", value: <>{formatNum(entry.cost)} {t("slayer.points")}</> };
    case "tokenShop":
      return {
        name: t("quests.shop.title"),
        subline: "",
        value: (
          <>
            {formatNum(entry.tokenCost)}
            {SCROLL_ICON_URL && <img loading="lazy" decoding="async" src={SCROLL_ICON_URL} alt="" className="ui-icon" />}
          </>
        ),
      };
    default:
      return { name: "", subline: "", value: <></> };
  }
}

/**
 * Trägt die einzige `useGameState()`-Abhängigkeit der Quelle-Liste (Task #350 Zonen-Gate-Check je
 * Monster-Zeile). Bewusst ALS EIGENE KOMPONENTE statt `useGameState()` direkt in
 * `ItemWikiModalOverlay` — `useGameState()`/LiveContext re-rendert bei JEDEM 10-Hz-Tick, die
 * Overlay-Komponente selbst bliebe sonst dauerhaft im 10-Hz-Takt, auch wenn kein Wiki offen ist.
 * Existiert nur, SOLANGE das Modal offen ist.
 */
function SourceList({
  sources,
  selectedIndex,
  onSelect,
}: {
  sources: DisplaySource[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  // Legende NUR einblenden, wenn dieses Item tatsächlich eine noch gesperrte Monster-Quelle hat.
  const hasLockedMonster = sources.some((s) => {
    if (s.kind !== "monsterGroup") return false;
    const monster = content.monsters[s.primaryMonsterId];
    return !!monster?.zone && !isZoneUnlocked(state, content, monster.zone);
  });
  return (
    <>
      {hasLockedMonster && (
        <div className="iwk-source-legend">
          <span className="iwk-row-lock-badge" aria-hidden="true">
            {LOCK_ICON_URL && <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" />}
          </span>
          {t("itemwiki.sourceLockedLegend")}
        </div>
      )}
      <ul className="iwk-source-list">
        {sources.map((s, i) => (
          <SourceRowItem key={i} entry={s} index={i} isActive={i === selectedIndex} onSelect={onSelect} state={state} />
        ))}
      </ul>
    </>
  );
}

/**
 * Eine Zeile im QUELLEN-Panel (Mira-Mockup "02 Forge Flow"). Chef-Redesign 26.08.2026: der Klick
 * auf die Zeile WÄHLT sie nur noch aus (Fußband zeigt Details) — er springt NICHT mehr direkt weg.
 * Springende Navigation bleibt auf genau zwei Stellen beschränkt (Chef-Regel "nur die zwei"): der
 * "Rezept öffnen"-Knopf hier IN der Rezept-Zeile (`.iwk-open-recipe`, Datenlogik bleibt unverändert)
 * und der gleichnamige Knopf im Fußband für die ausgewählte Verwendung. Der frühere direkte
 * Zeilen-Klick-Sprung zum Kampfgebiet (Monster-Quelle) entfällt damit — die Zone-Sperr-Anzeige
 * (Badge + Tooltip) bleibt als reine Information stehen, blockiert aber nichts mehr.
 */
function SourceRowItem({
  entry,
  index,
  isActive,
  onSelect,
  state,
}: {
  entry: DisplaySource;
  index: number;
  isActive: boolean;
  onSelect: (i: number) => void;
  state: GameState;
}): JSX.Element {
  const { t, tr } = useI18n();
  const { tip, open, close } = useCitadelTip<true>();
  const meta = sourceMeta(entry, t, tr);
  const monster = entry.kind === "monsterGroup" ? content.monsters[entry.primaryMonsterId] : undefined;
  const zoneLocked = entry.kind === "monsterGroup" && !!monster?.zone && !isZoneUnlocked(state, content, monster.zone);
  const select = (): void => onSelect(index);

  let gateHint: string | null = null;
  if (zoneLocked && monster?.zone) {
    const zoneDef = content.zones.find((z) => z.id === monster.zone);
    const gateQuest = zoneDef?.requiresQuest ? content.quests.find((q) => q.id === zoneDef.requiresQuest) : undefined;
    gateHint = t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"));
  }

  return (
    <li
      className={`iwk-source-node${isActive ? " is-active" : ""}${zoneLocked ? " iwk-source-node-locked" : ""}`}
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") select();
      }}
      onMouseEnter={zoneLocked ? (e) => open(true, e.currentTarget) : undefined}
      onMouseLeave={zoneLocked ? close : undefined}
      onFocus={zoneLocked ? (e) => open(true, e.currentTarget) : undefined}
      onBlur={zoneLocked ? close : undefined}
    >
      <span className="iwk-source-icon" aria-hidden="true">
        {sourceIconNode(entry)}
      </span>
      <span className="iwk-source-text">
        <strong className="iwk-source-name">
          {meta.name}
          {zoneLocked && (
            <span className="iwk-row-lock-badge" aria-hidden="true">
              {LOCK_ICON_URL && <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" />}
            </span>
          )}
        </strong>
        {meta.subline && <small className="iwk-source-subline">{meta.subline}</small>}
      </span>
      <b className="iwk-source-value">{meta.value}</b>
      {entry.kind === "action" && (
        <>
          <span className="iwk-row-break" aria-hidden="true" />
          <button
            type="button"
            className="btn-iron btn-iron--sm iwk-open-recipe"
            onClick={(e) => {
              e.stopPropagation();
              closeItemWikiModal();
              jumpToAction(entry.actionId);
            }}
          >
            {t("itemwiki.openRecipe")}
          </button>
        </>
      )}
      {zoneLocked && tip && gateHint && <CitadelTip rect={tip.rect}>{gateHint}</CitadelTip>}
    </li>
  );
}

/** Grob-Kategorie einer Verwendung nach dem AUSGABE-Item (für die Filter-Chips im VERWENDET-FÜR-
 *  Panel — Chef-Auftrag: nur einblenden, wenn ≥2 Arten vorkommen). */
type UseCategory = "weapons" | "armor" | "consumables" | "other";

function categorizeItem(item: ItemDef | undefined): UseCategory {
  if (!item) return "other";
  if (item.type === "equipment" && item.weaponStyle) return "weapons";
  if (item.type === "equipment") return "armor";
  if (item.type === "consumable") return "consumables";
  return "other";
}

interface UseMeta {
  use: ItemWikiUse;
  outputItem: ItemDef | undefined;
  category: UseCategory;
  /** Menge DIESES Items, die ein Durchlauf des Rezepts verbraucht (Chef-Mockup: "2×"-Abzeichen). */
  qty: number;
  levelRequired: number | undefined;
  /** false bei synthetischen Farming-Erträgen (`crop:<id>`, kein echtes `ActionDef`) — dafür gibt
   *  es keine Rezeptkarte zum Aufspringen (s. util/itemWiki.ts buildIndices). */
  isRealAction: boolean;
}

function buildUsesMeta(uses: ItemWikiUse[], currentItemId: string): UseMeta[] {
  return uses.map((u) => {
    const outputItem = content.items[u.outputItemId];
    const action = content.actions[u.actionId];
    const isRealAction = !!action;
    const qty = action?.inputs?.find((i) => i.itemId === currentItemId)?.qty ?? 1;
    let levelRequired = action?.levelRequired;
    if (!isRealAction && u.actionId.startsWith("crop:")) {
      const crop = content.crops?.[u.actionId.slice(5)];
      levelRequired = crop?.levelRequired;
    }
    return { use: u, outputItem, category: categorizeItem(outputItem), qty, levelRequired, isRealAction };
  });
}

/**
 * Ein Knoten im VERWENDET-FÜR-Raster (Mira-Mockup "02 Forge Flow"): zeigt das ERZEUGTE Item (Bild +
 * Name + Menge), nicht mehr die erzeugende Aktion selbst — die Rezept-Details (Skill/Stufe/Menge)
 * wandern ins Fußband, sobald der Knoten ausgewählt ist. Chef-Vorgabe "Verhalten": ein Klick auf
 * einen noch nicht aktiven Knoten wählt ihn nur aus; ein weiterer Klick auf den BEREITS aktiven
 * Knoten (= "Doppelklick/zweiter Klick", ohne separaten `dblclick`-Listener — zwei normale Klicks
 * hintereinander liefern exakt dasselbe Ergebnis) springt weiter ins Wiki des erzeugten Items
 * (bestehende `openItemWikiModal`-Verlaufslogik, unverändert).
 */
function UseNode({
  meta,
  isActive,
  onSelect,
  onOpenOutput,
}: {
  meta: UseMeta;
  isActive: boolean;
  onSelect: () => void;
  onOpenOutput: () => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const outputImg = meta.outputItem ? getItemImage(meta.outputItem.id) : null;
  return (
    <button
      type="button"
      className={`iwk-use-node ${rarityClass(meta.outputItem?.rarity)}${isActive ? " is-active" : ""}`}
      title={isActive ? t("itemwiki.openAria") : undefined}
      onClick={() => {
        if (isActive) {
          onOpenOutput();
          return;
        }
        onSelect();
      }}
    >
      {outputImg ? (
        <img loading="lazy" decoding="async" src={outputImg} alt="" className="pixelart iwk-use-node-img" />
      ) : meta.outputItem?.icon ? (
        <span className="iwk-row-icon-emoji">{meta.outputItem.icon}</span>
      ) : null}
      <span className="iwk-use-node-name">{tr(meta.use.outputName)}</span>
      <em className="iwk-use-node-qty">{meta.qty}×</em>
    </button>
  );
}

// ── Modul-globaler Mini-Store (kein Context nötig — wie ItemTooltip's `store`, s. dortiges JSDoc):
// der "?"-Button lebt tief im ItemTooltip-Baum, das Modal muss aber von ÜBERALL (Inventar/Bank/Shop/
// Loadout/Token-Shop) aus öffenbar sein. `openItemWikiModal` ist die einzige Kontaktfläche.
interface WikiPayload {
  itemId: string;
  instance?: ItemInstance;
}

let current: WikiPayload | null = null;
const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
const store = {
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: (): WikiPayload | null => current,
};

/**
 * Verlauf (Chef 25.08.2026, aus dem Spieler-Vorschlag "Wiki wie ein Browser"): wer sich von Item zu
 * Item klickt (Verwendungs-Ziel, Zutat), bekommt oben links "Zurück". Der Stapel lebt nur, solange
 * das Modal offen ist; Schließen leert ihn. Kein State im Save, kein Portal-Problem.
 */
let history: Array<{ itemId: string; instance?: ItemInstance }> = [];

/** Öffnet das Item-Wiki-Modal (aus dem "?"-Button im Tooltip ODER dem Klick auf einen Verwendungs-
 *  Zielitem in einem bereits offenen Wiki-Modal — s. `UseNode`). Ersetzt einen evtl. bereits offenen
 *  Wiki-Eintrag direkt (kein Stack), spiegelbildlich zu `useItemTooltip().pin`. */
export function openItemWikiModal(itemId: string, instance?: ItemInstance): void {
  if (current && current.itemId !== itemId) history.push(current);
  current = { itemId, instance };
  emit();
}

export function backItemWikiModal(): void {
  const prev = history.pop();
  if (!prev) return;
  current = prev;
  emit();
}

export function closeItemWikiModal(): void {
  history = [];
  if (current) {
    current = null;
    emit();
  }
}

/**
 * Einmalig in App montiert (neben `ItemTooltipOverlay`): rendert das Item-Wiki-Modal, sobald
 * `openItemWikiModal` aufgerufen wurde.
 *
 * Layout (Redesign nach Mira-Mockup "02 Forge Flow", Chef-Auftrag 26.08.2026): Titelleiste (Zurück ·
 * ITEM WIKI · Schließen) → drei Panels nebeneinander (Quellen · Item-Held · Verwendet für) → Fußband
 * mit der ausgewählten Quelle/Verwendung + "Rezept öffnen". Quellen/Verwendungen sind jetzt AUSWAHL-
 * Listen (erster Eintrag vorausgewählt) statt Sofort-Sprung-Listen — s. `SourceRowItem`/`UseNode`.
 */
export function ItemWikiModalOverlay(): JSX.Element | null {
  const payload = useSyncExternalStore(store.subscribe, store.get);
  const { t, tr, locale } = useI18n();
  const item = payload ? content.items[payload.itemId] : undefined;

  // Escape schließt über die zentrale Prioritäts-Registry (util/escStack.ts, Priorität "modal" —
  // ein gepinntes ItemTooltip darunter schließt zuerst, s. dortiges JSDoc), NICHT über einen
  // eigenen keydown-Listener.
  useEffect(() => {
    if (!payload) return;
    return registerEscCloser("modal", closeItemWikiModal);
  }, [payload]);

  // Rohe Quellen/Verwendungen erst zu Anzeige-Karten aufbereiten (dieselbe Kreatur taucht im
  // Content oft mehrfach mit eigener MonsterId auf, s. `groupMonsterSources`-JSDoc). Leere Arrays
  // ohne Item, DAMIT alle Hooks unten unabhängig vom frühen `return null` unten aufgerufen werden
  // (Rules of Hooks — der eigentliche Null-Guard steht bewusst erst NACH allen Hooks).
  const sources = item ? groupMonsterSources(ITEM_SOURCE_INDEX.get(item.id) ?? []) : [];
  const uses = item ? ITEM_USED_FOR_INDEX.get(item.id) ?? [] : [];
  const usesMeta = item ? buildUsesMeta(uses, item.id) : [];

  const [selSrcIdx, setSelSrcIdx] = useState(0);
  const [selUseIdx, setSelUseIdx] = useState(0);
  const [filter, setFilter] = useState<UseCategory | "all">("all");

  // Chef-Vorgabe "Verhalten": beim Wechsel des angezeigten Items (Öffnen, Zurück, Sprung auf ein
  // Verwendungs-Ziel) ist wieder der ERSTE Eintrag je Panel vorausgewählt, nicht der zuletzt
  // gewählte Index des vorherigen Items.
  useEffect(() => {
    setSelSrcIdx(0);
    setSelUseIdx(0);
    setFilter("all");
  }, [payload?.itemId]);

  // Wechselt der Filter auf eine Kategorie, die den aktuell ausgewählten Knoten ausblendet, springt
  // die Auswahl auf den ersten sichtbaren Knoten dieser Kategorie — das Fußband zeigt sonst einen
  // Knoten, der im Raster gar nicht mehr zu sehen ist.
  useEffect(() => {
    if (filter === "all") return;
    setSelUseIdx((cur) => {
      if (usesMeta[cur]?.category === filter) return cur;
      const idx = usesMeta.findIndex((m) => m.category === filter);
      return idx >= 0 ? idx : cur;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur auf explizite Filter-Klicks reagieren
  }, [filter]);

  if (!payload || !item) return null;

  const img = getItemImage(item.id);
  const rarity = getItemRarity(item);
  const displayName =
    payload.instance && (payload.instance.affixes.length > 0 || payload.instance.suffix)
      ? instanceDisplayName(payload.instance, content, locale)
      : tr(item.name);

  const clampedSrcIdx = sources.length > 0 ? Math.min(selSrcIdx, sources.length - 1) : 0;
  const clampedUseIdx = usesMeta.length > 0 ? Math.min(selUseIdx, usesMeta.length - 1) : 0;

  const presentCategories = (["weapons", "armor", "consumables", "other"] as const).filter((c) =>
    usesMeta.some((m) => m.category === c),
  );
  const showFilters = presentCategories.length >= 2;

  // ── Fußband-Inhalt: ausgewählte Quelle + ausgewählte Verwendung (Chef-Auftrag "02 Forge Flow") ──
  const selectedSource = sources.length > 0 ? sources[clampedSrcIdx]! : null;
  const selectedSourceMeta = selectedSource ? sourceMeta(selectedSource, t, tr) : null;
  const selectedUse = usesMeta.length > 0 ? usesMeta[clampedUseIdx]! : null;
  let selectedUseName = "";
  let selectedUseSubline = "";
  if (selectedUse) {
    selectedUseName = tr(selectedUse.use.outputName);
    const skill = content.skills[selectedUse.use.skillId];
    const skillName = skill ? tr(skill.name) : selectedUse.use.skillId;
    const levelLabel = t("skill.levelShort").replace("{n}", String(selectedUse.levelRequired ?? 1));
    const qtyLabel = t("itemwiki.requiresQty").replace("{n}", String(selectedUse.qty));
    selectedUseSubline = `${skillName} · ${levelLabel} · ${qtyLabel}`;
  }

  return (
    <div className="modal-overlay iwk-overlay" onClick={closeItemWikiModal}>
      <div className="modal iwk-modal" onClick={(e) => e.stopPropagation()}>
        <header className="iwk-titlebar">
          <div className="iwk-titlebar-side iwk-titlebar-side--start">
            {history.length > 0 && (
              <button type="button" className="btn-iron btn-iron--sm iwk-back" onClick={backItemWikiModal}>
                {t("itemwiki.back")}
              </button>
            )}
          </div>
          <div className="iwk-titlebar-kicker">{t("itemwiki.kicker")}</div>
          <div className="iwk-titlebar-side iwk-titlebar-side--end">
            <button className="modal-close ds-close-button" onClick={closeItemWikiModal} aria-label={t("common.close")} />
          </div>
        </header>

        <div className="iwk-stage">
          <aside className="iwk-panel iwk-source-panel">
            <div className="iwk-panel-head">
              <span>{t("itemwiki.sources")}</span>
              <span>{t("itemwiki.sourcesCount").replace("{n}", String(sources.length))}</span>
            </div>
            {sources.length === 0 ? (
              <div className="iwk-empty">{t("itemwiki.noSource")}</div>
            ) : (
              <SourceList sources={sources} selectedIndex={clampedSrcIdx} onSelect={setSelSrcIdx} />
            )}
          </aside>

          <article className="iwk-panel iwk-item-panel">
            <div className={`iwk-item-kicker ${rarityClass(item.rarity)}`}>
              {wikiTypeLine(item, t, tr)} · {tr(RARITY_LABEL[rarity])}
            </div>
            <h2 className={`iwk-item-name ${rarityClass(item.rarity)}`}>{displayName}</h2>
            <div className="iwk-item-hero">
              {img ? (
                <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" />
              ) : item.icon ? (
                <span className="iwk-item-hero-emoji">{item.icon}</span>
              ) : (
                <span className="iwk-item-hero-emoji">?</span>
              )}
            </div>

            {/* Kernwerte-Zeile als Fakten-Kacheln (Chef-Redesign): rohe Item-Felder — bewusst KEINE
                Neuberechnung der effektiven Kampfwerte (bleibt ItemTooltip.tsx vorbehalten). */}
            <div className="iwk-facts">
              {item.requirements &&
                Object.entries(item.requirements).map(([skillId, lvl]) => {
                  const skill = content.skills[skillId];
                  return (
                    <span className="iwk-fact-tile" key={`req-${skillId}`}>
                      <span className="iwk-fact-label">
                        {t("itip.requires")} {skill ? tr(skill.name) : skillId}
                      </span>
                      <span className="iwk-fact-value">{lvl}</span>
                    </span>
                  );
                })}
              {item.damageMin !== undefined && item.damageMax !== undefined && (
                <span className="iwk-fact-tile">
                  <span className="iwk-fact-label">{t("itip.weaponDamage")}</span>
                  <span className="iwk-fact-value">
                    {formatDamage(item.damageMin)}–{formatDamage(item.damageMax)}
                  </span>
                </span>
              )}
              {item.damageMin !== undefined && item.attackIntervalMs !== undefined && (
                <span className="iwk-fact-tile">
                  <span className="iwk-fact-label">{t("itip.tempo")}</span>
                  <span className="iwk-fact-value">{formatSeconds1(item.attackIntervalMs / 1000)}s</span>
                </span>
              )}
              {!!item.armorRating && (
                <span className="iwk-fact-tile">
                  <span className="iwk-fact-label">{t("stat.armorRating")}</span>
                  <span className="iwk-fact-value">{formatStat(item.armorRating)}</span>
                </span>
              )}
              {!!item.evasionRating && (
                <span className="iwk-fact-tile">
                  <span className="iwk-fact-label">{t("stat.evasionRating")}</span>
                  <span className="iwk-fact-value">{formatStat(item.evasionRating)}</span>
                </span>
              )}
              {!!item.wardCapacity && (
                <span className="iwk-fact-tile">
                  <span className="iwk-fact-label">{t("stat.wardCapacity")}</span>
                  <span className="iwk-fact-value">+{formatStat(item.wardCapacity)}</span>
                </span>
              )}
              {!!item.blockChance && (
                <span className="iwk-fact-tile">
                  <span className="iwk-fact-label">{t("stat.blockChance")}</span>
                  <span className="iwk-fact-value">{Math.round(item.blockChance * 100)}%</span>
                </span>
              )}
              {item.value !== undefined && (
                <span className="iwk-fact-tile">
                  <span className="iwk-fact-label">{t("char.itemValue")}</span>
                  <span className="iwk-fact-value">
                    {formatNum(item.value)}
                    {GOLD_ICON_URL && <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />}
                  </span>
                </span>
              )}
              <span className="iwk-fact-tile">
                <span className="iwk-fact-label">{t("itemwiki.stackable")}</span>
                <span className="iwk-fact-value">{item.stackable ? t("itemwiki.yes") : t("itemwiki.no")}</span>
              </span>
            </div>

            {item.description && <p className="iwk-item-flavor">{tr(item.description)}</p>}
          </article>

          <section className="iwk-panel iwk-uses-panel">
            <div className="iwk-panel-head">
              <span>{t("itip.usedFor")}</span>
              <span>{t("itemwiki.usedForCount").replace("{n}", String(uses.length))}</span>
            </div>
            {uses.length === 0 ? (
              <div className="iwk-empty">{t("itemwiki.noUsedFor")}</div>
            ) : (
              <>
                {showFilters && (
                  <div className="iwk-filter-row">
                    <button
                      type="button"
                      className={`btn-iron btn-iron--sm iwk-filter-chip${filter === "all" ? " is-active" : ""}`}
                      onClick={() => setFilter("all")}
                    >
                      {t("itemwiki.filter.all")}
                    </button>
                    {presentCategories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`btn-iron btn-iron--sm iwk-filter-chip${filter === c ? " is-active" : ""}`}
                        onClick={() => setFilter(c)}
                      >
                        {t(`itemwiki.filter.${c}`)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="iwk-output-grid">
                  {usesMeta.map((meta, i) => {
                    if (filter !== "all" && meta.category !== filter) return null;
                    return (
                      <UseNode
                        key={i}
                        meta={meta}
                        isActive={i === clampedUseIdx}
                        onSelect={() => setSelUseIdx(i)}
                        onOpenOutput={() => openItemWikiModal(meta.use.outputItemId)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {(selectedSourceMeta || selectedUse) && (
          <footer className="iwk-ribbon">
            {selectedSourceMeta && (
              <div className="iwk-ribbon-block">
                <div className="iwk-ribbon-text">
                  <span className="iwk-ribbon-label">{t("itemwiki.selectedSource")}</span>
                  <strong className="iwk-ribbon-name">{selectedSourceMeta.name}</strong>
                  {selectedSourceMeta.subline && <small className="iwk-ribbon-sub">{selectedSourceMeta.subline}</small>}
                </div>
                <b className="iwk-ribbon-badge">{selectedSourceMeta.value}</b>
              </div>
            )}
            {selectedSourceMeta && selectedUse && <span className="iwk-ribbon-divider" aria-hidden="true" />}
            {selectedUse && (
              <>
                <div className="iwk-ribbon-block">
                  <div className="iwk-ribbon-text">
                    <span className="iwk-ribbon-label">{t("itemwiki.selectedUse")}</span>
                    <strong className="iwk-ribbon-name">{selectedUseName}</strong>
                    <small className="iwk-ribbon-sub">{selectedUseSubline}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-iron iwk-ribbon-open"
                  disabled={!selectedUse.isRealAction}
                  onClick={() => {
                    closeItemWikiModal();
                    jumpToAction(selectedUse.use.actionId);
                  }}
                >
                  {t("itemwiki.openRecipe")}
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
