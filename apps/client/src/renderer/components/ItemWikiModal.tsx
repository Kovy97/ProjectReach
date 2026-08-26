import { useEffect, useSyncExternalStore } from "react";
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
import { jumpToMonster } from "../util/monsterJump";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
// Chef-Redesign 26.08.2026 ("Emojis durch unsere neuen Achievement-Icons ersetzen"): die kleinen
// Kennzeichnungs-Icons je Quelle-/Verwendungs-Zeilenart (Laden/Slayer-Turm/Belohnungsladen/Monster/
// Dungeon) wechseln von rohen Emoji-Zeichen (teils ganz ohne Fallback-Kette) auf dieselbe gemalte
// Embleme-Familie wie AchievementsPage.tsx' Kategorie-Icons (assets/icons/icon_ach_*.webp),
// dieselbe Zuordnung: Laden/Wert = Münzsack, Kampf/Slayer = Klingen, Belohnungsladen = Siegelrolle,
// Kiste/Dungeon = Truhe. Wo bereits ein echtes Skill-Icon existiert (`WikiSkillIcon` unten), bleibt
// das unangetastet — nur dessen allerletzter Notfall-Fallback (kein Skill-/Sidebar-Icon gefunden)
// zeigt jetzt ebenfalls ein gemaltes Emblem statt eines Text-Emoji.
const SHOP_ICON_URL = getUiIcon("icon_ach_gold");
const COMBAT_ICON_URL = getUiIcon("icon_ach_combat");
const SCROLL_ICON_URL = getUiIcon("icon_ach_scroll");
const CHEST_ICON_URL = getUiIcon("icon_ach_gift");
const GENERIC_ICON_URL = getUiIcon("icon_ach_star");
// Story-Zonen-Gate (Task #350, Chef-Fund "Wiki-Links führen in gesperrte Zonen"): dasselbe
// Schloss-Icon wie die Zonen-/Dungeon-Karten in CombatPage.tsx (`LOCK_ICON_URL`-Muster dort).
const LOCK_ICON_URL = getUiIcon("icon_locked");

/** Skill-Icon für eine Quelle-/Verwendungs-Zeile: Kampf-PNG → Sidebar-PNG → generisches Emblem
 *  (dieselbe 3-stufige Kette wie SkillsOverviewPage's `SkillIconImg`; letzte Stufe seit dem
 *  Chef-Redesign 26.08.2026 ein gemaltes Icon statt eines Text-Emoji — reine Sicherheitsnetz-Stufe,
 *  jede aktuell im Wiki vorkommende Skill-ID hat bereits ein echtes Bild über eine der ersten
 *  beiden Stufen). */
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
 * immer % sein" — die Bruch-Schreibweise 1/2500 ist raus). Delegiert an `formatDropPct` (Welle KK,
 * Grete-Retest #8b: Karte zeigte „0,10 %" — lokalisiert mit Komma —, das Wiki daneben „0.1%" mit
 * fest verdrahtetem Punkt; dieselbe Quelle wie die Dungeon-Beute-Vorschau/Bestiarium behebt beide
 * Symptome auf einen Schlag: gleiche Rundung UND locale-bewusstes Trennzeichen). Die „—"-Sonderrolle
 * für eine echte 0 bleibt lokal (Content-Bug-Signal, kein Fall für die geteilte Funktion).
 */
function pct(chance: number): string {
  if (chance <= 0) return "—"; // echte 0 wäre ein Content-Bug; ehrlich als „—" statt „0%"
  return formatDropPct(chance);
}

/**
 * Typ-Zeile im Wiki-Kopf ("Zweihand-Schwert" / "Kopf" / "Verzehrbar" …), Redesign Chef-Auftrag
 * (großer Kopfblock statt kompaktem "?"-Tooltip-Ableger). Bewusst eine eigene schlanke Kopie von
 * ItemTooltip.tsx' `buildItemTypeLine` statt eines Re-Imports von dort: ItemTooltip.tsx importiert
 * bereits `openItemWikiModal` VON HIER (Wiki-„?"-Button) — ein Re-Import in die Gegenrichtung würde
 * einen Zirkelbezug zwischen den beiden Modulen öffnen. Die Funktion ist klein/stabil genug, um sie
 * hier eigenständig zu halten statt dieses Risiko einzugehen.
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
 * Rendern über `locationLabel` in einen Anzeigetext aufgelöst (Sprachwechsel-sicher, dieselbe Regel
 * wie die `LocalizedString`-Namen in itemWiki.ts). Drei Fundort-Arten: reine Zonen-Begegnung,
 * Dungeon-Welle (`MonsterDef.dungeonOnly`, gefunden über `DungeonDef.encounters`) und Slayer-Turm-
 * Etage (`MonsterDef.slayerFloor`).
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

/** Sortier-Rang für die Fundort-Aufschlüsselung EINER Karte: Zone vor Dungeon vor Turm (die
 *  "ursprünglichste" Fundstelle zuerst) statt der zufälligen Content-Deklarationsreihenfolge. */
const LOCATION_RANK: Record<MonsterLocation["type"], number> = { zone: 0, dungeon: 1, tower: 2, unknown: 3 };

/** Löst einen `MonsterLocation` in seinen Anzeigetext auf — Turm-Etage exakt im Muster von
 *  SlayerPage.tsx' `towerFloorLabel` (`slayer.location.tower` + `{n}`-Platzhalter), Zone/Dungeon
 *  über die jeweilige Content-Definition + `tr()`. Nie hartkodiert. */
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
 * für den WARUM. Ersetzt `ItemWikiSource`'s `kind: "monster"` auf der Anzeige-Seite vollständig
 * (jede rohe "monster"-Quelle landet in genau einer Gruppe, auch wenn sie nur einen Fundort hat).
 */
interface MonsterGroupSource {
  kind: "monsterGroup";
  name: LocalizedString;
  /** Klick-/Zonen-Gate-Ziel: die reine Zonen-Variante, falls vorhanden (nach `LOCATION_RANK`-Sortierung
   *  steht sie an erster Stelle) — sonst best-effort die erste bekannte Fundstelle (`jumpToMonster`
   *  selbst bleibt für Dungeon-/Turm-Ids ein reiner Seitenwechsel ohne Karten-Highlight, s. dortiges
   *  JSDoc + CombatPage.tsx — kein Absturz, nur kein Highlight). */
  primaryMonsterId: string;
  locations: MonsterLocationEntry[];
  /** true, wenn jede Fundstelle dieselbe Chance trägt — dann genügt EIN Prozentwert auf der Karte
   *  statt der Fundort-Aufschlüsselung (Chef-Vorgabe 2026-08-25). Bei nur einem Fundort immer true. */
  sameChance: boolean;
}

type DisplaySource = ItemWikiSource | MonsterGroupSource;

/**
 * Führt "monster"-Quellen mit identischem Anzeige-Namen zu EINER Karte zusammen (Chef-Befund
 * 2026-08-25: „Skelettkrieger 90% erscheint zweimal in QUELLE", ebenso Skelett-Bogenschütze/
 * -Schlächter/-Eismagier/Nekromantenfürst). Ursache: dieselbe Kreatur lebt im Content oft als
 * mehrere unabhängige `MonsterDef`-Einträge mit GLEICHEM `name`, aber eigener MonsterId — z.B.
 * `skeleton_warrior` (Zone Krypta) + `dg_skeleton_warrior` (Dungeon-Welle crypt_depths,
 * `dungeonOnly: true`) + `tower_skeleton_warrior` (Slayer-Turm Etage 2, `slayerFloor: 2`), s.
 * packages/content/src/index.ts. `buildIndices()` (util/itemWiki.ts) indiziert strikt über die
 * MonsterId — für sie sind das drei unabhängige Quellen. Die Zusammenführung passiert bewusst NUR
 * hier auf der Anzeige-Seite (util/itemWiki.ts bleibt unverändert — dortiger Index wird auch von
 * evtl. anderen Aufrufern konsumiert). Gruppierschlüssel ist `name.en`, die einzige garantiert
 * vorhandene, sprachunabhängige Identität einer `LocalizedString` — ein Sprachwechsel darf den
 * Schlüssel nicht auseinanderreißen. Alle anderen Quellen-Arten (shop/action/dungeon/crop/…) laufen
 * unverändert durch.
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

/**
 * Trägt die einzige `useGameState()`-Abhängigkeit der Quelle-Liste (Task #350 Zonen-Gate-Check
 * je Monster-Zeile, s. `SourceRow`). Bewusst ALS EIGENE KOMPONENTE statt `useGameState()` direkt
 * in `ItemWikiModalOverlay` (die app-weit gemountet ist, s. App.tsx) — `useGameState()`/
 * LiveContext re-rendert bei JEDEM 10-Hz-Tick (GameContext.tsx-JSDoc); die Overlay-Komponente
 * selbst bliebe sonst dauerhaft im 10-Hz-Takt, auch wenn kein Wiki-Modal offen ist. Diese
 * Komponente existiert nur, SOLANGE das Modal offen ist (Aufrufer rendert sie innerhalb des
 * `if (!payload) return null`-Zweigs) — der 10-Hz-Re-Render läuft also nur während der Spieler
 * das Wiki tatsächlich ansieht, exakt wie die Perf-Welle-Konvention andernorts (s. z.B.
 * EliteMiniWindow's `activeEliteSelector`).
 */
function SourceList({ sources }: { sources: DisplaySource[] }): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  // Legende NUR einblenden, wenn dieses Item tatsächlich eine noch gesperrte Monster-Quelle hat
  // (Chef-Befund 2026-08-25: Grau/Weiß-Abstufung ohne Erklärung war „unklar" — die Abstufung IST
  // das Story-Zonen-Gate, Task #350, s. `MonsterGroupRow`; bei den meisten Items gibt es aber gar
  // keine gesperrte Quelle, dort bliebe eine dauerhafte Legende reine Platzverschwendung).
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
      <ul className="iwk-list">
        {sources.map((s, i) => (
          <SourceRow key={i} entry={s} state={state} />
        ))}
      </ul>
    </>
  );
}

/**
 * Eine zusammengeführte Monster-Quelle-Karte (`kind: "monsterGroup"`, s. `groupMonsterSources`).
 * Eigene Komponente statt eines weiteren `SourceRow`-Zweigs, weil der Zonen-Gate-Tooltip jetzt
 * `useCitadelTip` braucht (Chef-Auftrag „HoverTip/CitadelTip statt natives `title`" — `<li>` liegt
 * außerhalb von `HoverTip`s Tag-Liste (nur span/div), also der direkte Weg wie CombatPage.tsx'
 * `DiffNameLabel` ihn schon vormacht) — ein Hook darf nicht bedingt in `SourceRow`s großem If/Else
 * hängen, deshalb hier unbedingt an der Komponentenwurzel.
 */
function MonsterGroupRow({ entry, state }: { entry: MonsterGroupSource; state: GameState }): JSX.Element {
  const { t, tr } = useI18n();
  const { tip, open, close } = useCitadelTip<true>();
  const monster = content.monsters[entry.primaryMonsterId];
  const zoneLocked = !!monster?.zone && !isZoneUnlocked(state, content, monster.zone);
  // Aufschlüsselung je Fundort NUR, wenn die Chance tatsächlich variiert (Chef-Vorgabe) — bei
  // gleicher Chance an jedem Fundort (der Regelfall im bestehenden Content) bleibt die Karte eine
  // einzeilige Standard-Zeile mit einem Prozentwert.
  const breakdown = !entry.sameChance;

  const body = (
    <>
      <div className="iwk-row-main">
        {COMBAT_ICON_URL
          ? <img loading="lazy" decoding="async" src={COMBAT_ICON_URL} alt="" className="iwk-row-icon-img" />
          : <span className="iwk-row-icon-emoji" aria-hidden="true" />}
        <span className="iwk-row-name">{tr(entry.name)}</span>
        {zoneLocked && (
          <span className="iwk-row-lock-badge" aria-hidden="true">
            {LOCK_ICON_URL && <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" />}
          </span>
        )}
        {!breakdown && <span className="iwk-row-val">{pct(entry.locations[0]!.chance)}</span>}
      </div>
      {breakdown && (
        <div className="iwk-row-sublocations">
          {entry.locations.map((loc, i) => (
            <span key={loc.monsterId}>
              {i > 0 && " · "}
              {locationLabel(loc.location, t, tr)} {pct(loc.chance)}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (zoneLocked) {
    // Story-Zonen-Gate (Task #350, Chef-Fund "Über Wiki-Links können wir in Gebiete rein, wo wir
    // noch nicht rein sollten"): der Eintrag bleibt SICHTBAR (keine Spoiler-Politik-Änderung —
    // Bestiarium/Wiki zeigen weiter alle Quellen), aber für eine gesperrte Zone ist die Karte nicht
    // klickbar: gedimmt + Schloss-Icon + Tooltip, exakt das Muster der Zonen-/Dungeon-Karten
    // (`zone-card-story-locked`, s. CombatPage.tsx) und des Bestiarium-„Kämpfen"-Buttons
    // (BestiaryPage.tsx `zoneLocked`). Tooltip jetzt als `CitadelTip` (Chef-Auftrag, s. Komponenten-
    // JSDoc oben) statt eines nativen `title` — konsistent mit dem Rest des Repos UND lesbar, statt
    // nur bei zufälligem Hover als Browser-Standard-Tooltip aufzupoppen.
    const zoneDef = content.zones.find((z) => z.id === monster!.zone);
    const gateQuest = zoneDef?.requiresQuest
      ? content.quests.find((q) => q.id === zoneDef.requiresQuest)
      : undefined;
    const gateHint = t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"));
    return (
      <li
        className={`iwk-row iwk-row-locked${breakdown ? " iwk-row-stacked" : ""}`}
        tabIndex={0}
        onMouseEnter={(e) => open(true, e.currentTarget)}
        onMouseLeave={close}
        onFocus={(e) => open(true, e.currentTarget)}
        onBlur={close}
      >
        {body}
        {tip && <CitadelTip rect={tip.rect}>{gateHint}</CitadelTip>}
      </li>
    );
  }
  return (
    <li
      className={`iwk-row iwk-row-clickable${breakdown ? " iwk-row-stacked" : ""}`}
      role="button"
      tabIndex={0}
      title={t("itemwiki.jumpToMonster")}
      onClick={() => {
        closeItemWikiModal();
        jumpToMonster(entry.primaryMonsterId);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        closeItemWikiModal();
        jumpToMonster(entry.primaryMonsterId);
      }}
    >
      {body}
    </li>
  );
}

function SourceRow({ entry, state }: { entry: DisplaySource; state: GameState }): JSX.Element {
  const { t, tr } = useI18n();
  if (entry.kind === "shop") {
    return (
      <li className="iwk-row iwk-row-shop">
        {SHOP_ICON_URL && <img loading="lazy" decoding="async" src={SHOP_ICON_URL} alt="" className="iwk-row-icon-img" />}
        <span className="iwk-row-name">{t("itip.sourceShop")}</span>
        <span className="iwk-row-val">
          {formatNum(entry.cost)}
          {GOLD_ICON_URL && <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />}
        </span>
      </li>
    );
  }
  if (entry.kind === "slayerShop") {
    return (
      <li className="iwk-row iwk-row-shop">
        {COMBAT_ICON_URL && <img loading="lazy" decoding="async" src={COMBAT_ICON_URL} alt="" className="iwk-row-icon-img" />}
        <span className="iwk-row-name">{t("nav.slayer")}</span>
        <span className="iwk-row-val">{formatNum(entry.cost)} {t("slayer.points")}</span>
      </li>
    );
  }
  if (entry.kind === "tokenShop") {
    return (
      <li className="iwk-row iwk-row-shop">
        {SCROLL_ICON_URL && <img loading="lazy" decoding="async" src={SCROLL_ICON_URL} alt="" className="iwk-row-icon-img" />}
        <span className="iwk-row-name">{t("quests.shop.title")}</span>
        <span className="iwk-row-val">
          {formatNum(entry.tokenCost)}
          {SCROLL_ICON_URL && <img loading="lazy" decoding="async" src={SCROLL_ICON_URL} alt="" className="ui-icon" />}
        </span>
      </li>
    );
  }
  if (entry.kind === "crop") {
    // Ernte-Ertrag: Farming-Skill-Icon + Beet-Name; garantierter Ertrag → 100 %.
    return (
      <li className="iwk-row">
        <WikiSkillIcon skillId="farming" />
        <span className="iwk-row-name">{tr(entry.name)}</span>
        <span className="iwk-row-val">100%</span>
      </li>
    );
  }
  if (entry.kind === "action") {
    // Wiki→Rezept-Sprung (Chef-Auftrag, Beispiel "Sinew Bowstring" → Quelle "Twist Bowstring"):
    // die erzeugende Aktion ist klickbar — schließt das Modal, springt zur Skill-Seite, klappt
    // die Kategorie auf und hebt die Rezeptkarte kurz hervor (s. util/skillJump.ts + SkillPage.tsx).
    return (
      <li
        className="iwk-row iwk-row-clickable"
        role="button"
        tabIndex={0}
        title={t("itemwiki.jumpToRecipe")}
        onClick={() => {
          closeItemWikiModal();
          jumpToAction(entry.actionId);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          closeItemWikiModal();
          jumpToAction(entry.actionId);
        }}
      >
        <WikiSkillIcon skillId={entry.skillId} />
        <span className="iwk-row-name">{tr(entry.name)}</span>
        <span className="iwk-row-val">{pct(entry.chance)}</span>
        {/* Chef 25.08.2026: der Sprung war nur als Hover-Titel sichtbar; jetzt ein Knopf in der Zeile,
            auf eigener Zeile (Umbruch-Element), damit der Aktionsname in der schmalen Karte nicht
            buchstabenweise bricht. */}
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
      </li>
    );
  }
  if (entry.kind === "monsterGroup") {
    // Wiki→Kampfgebiet-Sprung + Story-Zonen-Gate: ausgelagert nach `MonsterGroupRow` (s. dortiges
    // JSDoc) — die Karte kann jetzt mehrere Fundorte EINER Kreatur zusammenfassen (Chef-Befund
    // 2026-08-25 "Skelettkrieger doppelt", s. `groupMonsterSources`) und braucht dafür einen Hook
    // (`useCitadelTip`) an fester Komponentenwurzel statt in diesem If/Else.
    return <MonsterGroupRow entry={entry} state={state} />;
  }
  // dungeon — dieselbe Zeilenform, nicht klickbar (Chef-Scope, s. Kommentar oben).
  return (
    <li className="iwk-row">
      {CHEST_ICON_URL && <img loading="lazy" decoding="async" src={CHEST_ICON_URL} alt="" className="iwk-row-icon-img" />}
      <span className="iwk-row-name">{tr(entry.name)}</span>
      <span className="iwk-row-val">{pct(entry.chance)}</span>
    </li>
  );
}

function UseRow({ entry, onOpenOutput }: { entry: ItemWikiUse; onOpenOutput: (itemId: string) => void }): JSX.Element {
  const { tr, t } = useI18n();
  const outputImg = getItemImage(entry.outputItemId);
  const outputItem = content.items[entry.outputItemId];
  // Wiki→Rezept-Sprung: nur für ECHTE Aktionen klickbar — Farming-Ernte-Einträge tragen eine
  // synthetische `crop:<id>`-ID ohne content.actions-Gegenstück (s. util/itemWiki.ts buildIndices)
  // und haben keine Rezeptkarte auf einer SkillPage; dort bleibt dieser Teil reiner Text.
  const isRealAction = !!content.actions[entry.actionId];
  const jump = (): void => {
    closeItemWikiModal();
    jumpToAction(entry.actionId);
  };
  return (
    <li className="iwk-row iwk-row-use">
      {isRealAction ? (
        <span
          className="iwk-use-source iwk-row-clickable"
          role="button"
          tabIndex={0}
          title={t("itemwiki.jumpToRecipe")}
          onClick={jump}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") jump();
          }}
        >
          <WikiSkillIcon skillId={entry.skillId} />
          <span className="iwk-row-name">{tr(entry.actionName)}</span>
        </span>
      ) : (
        <>
          <WikiSkillIcon skillId={entry.skillId} />
          <span className="iwk-row-name">{tr(entry.actionName)}</span>
        </>
      )}
      <span className="iwk-use-arrow" aria-hidden="true">&#9658;</span>
      <button
        type="button"
        className={`iwk-use-output ${rarityClass(outputItem?.rarity)}`}
        onClick={() => onOpenOutput(entry.outputItemId)}
        title={t("itemwiki.openAria")}
      >
        {outputImg ? (
          <img loading="lazy" decoding="async" src={outputImg} alt="" className="pixelart iwk-use-output-img" />
        ) : outputItem?.icon ? (
          <span className="iwk-row-icon-emoji">{outputItem.icon}</span>
        ) : null}
        {tr(entry.outputName)}
      </button>
    </li>
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

/** Öffnet das Item-Wiki-Modal (aus dem "?"-Button im Tooltip ODER dem Klick auf einen Verwendungs-
 *  Zielitem in einem bereits offenen Wiki-Modal — s. `UseRow`). Ersetzt einen evtl. bereits offenen
 *  Wiki-Eintrag direkt (kein Stack), spiegelbildlich zu `useItemTooltip().pin`. */
/**
 * Verlauf (Chef 25.08.2026, aus dem Spieler-Vorschlag "Wiki wie ein Browser"): wer sich von Item zu
 * Item klickt (Verwendungs-Ziel, Zutat), bekommt oben links "Zurück". Der Stapel lebt nur, solange
 * das Modal offen ist; Schließen leert ihn. Kein State im Save, kein Portal-Problem.
 */
let history: Array<{ itemId: string; instance?: ItemInstance }> = [];

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
 * `openItemWikiModal` aufgerufen wurde. Citadel-Modal-Grundgerüst (`.modal-overlay`/`.modal`, wie
 * `PortraitPickerModal`) + eigener `iwk-*`-Namespace für den Inhalt (styles/item-wiki.css).
 */
export function ItemWikiModalOverlay(): JSX.Element | null {
  const payload = useSyncExternalStore(store.subscribe, store.get);
  const { t, tr, locale } = useI18n();

  // Escape schließt über die zentrale Prioritäts-Registry (util/escStack.ts, Priorität "modal" —
  // ein gepinntes ItemTooltip darunter schließt zuerst, s. dortiges JSDoc), NICHT über einen
  // eigenen keydown-Listener.
  useEffect(() => {
    if (!payload) return;
    return registerEscCloser("modal", closeItemWikiModal);
  }, [payload]);

  if (!payload) return null;
  const item = content.items[payload.itemId];
  if (!item) return null;

  const img = getItemImage(item.id);
  const rarity = getItemRarity(item);
  const displayName =
    payload.instance && (payload.instance.affixes.length > 0 || payload.instance.suffix)
      ? instanceDisplayName(payload.instance, content, locale)
      : tr(item.name);

  // Rohe Quellen erst zu Anzeige-Karten gruppieren (dieselbe Kreatur taucht im Content oft mehrfach
  // mit eigener MonsterId auf — Zone/Dungeon-Welle/Turm-Etage, s. `groupMonsterSources`-JSDoc).
  const sources = groupMonsterSources(ITEM_SOURCE_INDEX.get(item.id) ?? []);
  const uses = ITEM_USED_FOR_INDEX.get(item.id) ?? [];

  return (
    <div className="modal-overlay iwk-overlay" onClick={closeItemWikiModal}>
      <div className="modal iwk-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={closeItemWikiModal} aria-label={t("common.close")} />
        {history.length > 0 && (
          <button type="button" className="btn-iron btn-iron--sm iwk-back" onClick={backItemWikiModal}>
            {t("itemwiki.back")}
          </button>
        )}

        <div className="iwk-kicker">{t("itemwiki.kicker")}</div>

        <div className="iwk-head">
          <div className={`iwk-head-icon ${rarityClass(item.rarity)}`}>
            {img ? (
              <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" />
            ) : item.icon ? (
              <span className="iwk-head-emoji">{item.icon}</span>
            ) : (
              <span className="iwk-head-emoji">?</span>
            )}
          </div>
          <div className="iwk-head-text">
            <div className={`iwk-head-name ${rarityClass(item.rarity)}`}>{displayName}</div>
            <div className={`iwk-head-typeline ${rarityClass(item.rarity)}`}>
              {wikiTypeLine(item, t, tr)} · {tr(RARITY_LABEL[rarity])}
            </div>
            {item.description && <div className="iwk-head-flavor">{tr(item.description)}</div>}

            {/* Kernwerte-Zeile (Chef-Redesign): rohe Item-Felder als Chips — bewusst KEINE
                Neuberechnung der effektiven Kampfwerte (computeStats/Delta-Vergleich bleibt
                ItemTooltip.tsx vorbehalten, dort inkl. Ausrüstungs-/Instanz-Kontext). Das Wiki
                ist eine Nachschlage-Ansicht, keine Ersatz-Statuskarte. */}
            <div className="iwk-head-facts">
              {item.requirements &&
                Object.entries(item.requirements).map(([skillId, lvl]) => {
                  const skill = content.skills[skillId];
                  return (
                    <span className="iwk-head-fact" key={`req-${skillId}`}>
                      {t("itip.requires")} {skill ? tr(skill.name) : skillId}: {lvl}
                    </span>
                  );
                })}
              {item.damageMin !== undefined && item.damageMax !== undefined && (
                <span className="iwk-head-fact">
                  {t("itip.weaponDamage")}: {formatDamage(item.damageMin)}–{formatDamage(item.damageMax)}
                </span>
              )}
              {item.damageMin !== undefined && item.attackIntervalMs !== undefined && (
                <span className="iwk-head-fact">
                  {t("itip.tempo")}: {formatSeconds1(item.attackIntervalMs / 1000)}s
                </span>
              )}
              {!!item.armorRating && (
                <span className="iwk-head-fact">{t("stat.armorRating")}: {formatStat(item.armorRating)}</span>
              )}
              {!!item.evasionRating && (
                <span className="iwk-head-fact">{t("stat.evasionRating")}: {formatStat(item.evasionRating)}</span>
              )}
              {!!item.wardCapacity && (
                <span className="iwk-head-fact">{t("stat.wardCapacity")}: +{formatStat(item.wardCapacity)}</span>
              )}
              {!!item.blockChance && (
                <span className="iwk-head-fact">{t("stat.blockChance")}: {Math.round(item.blockChance * 100)}%</span>
              )}
              {item.value !== undefined && (
                <span className="iwk-head-fact">
                  {t("char.itemValue")}: {formatNum(item.value)}
                  {GOLD_ICON_URL && <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />}
                </span>
              )}
              <span className="iwk-head-fact">
                {t("itemwiki.stackable")}: {item.stackable ? t("itemwiki.yes") : t("itemwiki.no")}
              </span>
            </div>
          </div>
        </div>

        <div className="iwk-body">
          {/* Zwei klar getrennte Blöcke Herkunft/Verwendung (Chef-Redesign) als eigenes Grid,
              das bei knapper Fensterbreite (1366×768) auf eine Spalte fällt — s. item-wiki.css. */}
          <div className="iwk-columns">
            <section className="iwk-section">
              <h3 className="iwk-section-title">{t("itip.source")}</h3>
              {sources.length === 0 ? (
                <div className="iwk-empty">{t("itemwiki.noSource")}</div>
              ) : (
                <SourceList sources={sources} />
              )}
            </section>

            <section className="iwk-section">
              <h3 className="iwk-section-title">{t("itip.usedFor")}</h3>
              {uses.length === 0 ? (
                <div className="iwk-empty">{t("itemwiki.noUsedFor")}</div>
              ) : (
                <ul className="iwk-list">
                  {uses.map((u, i) => (
                    <UseRow key={i} entry={u} onOpenOutput={(id) => openItemWikiModal(id)} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
