import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { content } from "@hearthforge/content";
import { isDungeonUnlocked, isItemDiscovered, isZoneUnlocked, monsterKills, slayerRequirementMet, startCombat } from "@hearthforge/engine";
import type { DungeonDef, EliteVariantDef, GameState, ItemDef, LocalizedString, MonsterDef, QuestDef } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { getEliteMonsterSrc, getMonsterSrc } from "../monsters";
import { getItemImage } from "../items";
import { getBattleScreen } from "../battleScreens";
import { getZoneBackground } from "../zoneBackgrounds";
import { useI18n } from "../i18n";
import { inflictHintFor } from "../util/inflictHint";
import { monsterHomeDungeon } from "../util/chronicle";
import { openItemWikiModal } from "../components/ItemWikiModal";
import { DefenseTypeBadge } from "../components/DefenseTypeBadge";
import { FlipReveal } from "../components/FlipReveal";
import { StatLine, StatLineImmune, type StatLineEntry } from "../components/StatLine";
import { renderEffectIcon, statIcon } from "../statIcons";
import { getUiIcon } from "../uiIcons";
import { effectiveFxLevel } from "../util/fxLevel";
import { formatDropPct, formatMmSs, formatNum } from "../util/format";
import "../styles/bestiary.css";

/**
 * Bestiarium-Umbau „Reise durch den Reach" (Konzept 4, Chef-Wahl 2026-08-03, bindende Vorlage
 * `design/mockups/bestiary-2026-08-03/concept-4-reise.{html,css,js}`): Zonen als vertikale
 * Kulissen-Bänder mit den echten Kampf-Backdrops großformatig; Monster/Champions als Wegpunkt-
 * Karten entlang eines gestrichelten Pfads durchs Band. Der komplette Funktionsvertrag der
 * vorherigen Grid-Fassung bleibt erhalten (nur unten im JSX neu verpackt): Zonen-Gruppierung inkl.
 * Sperren mit echten Quest-Namen, Monster mit Art/Level/Kill-Zähler, DefenseType-Badge IMMER
 * sichtbar, Stats/Resists/Kill-Leiter/Drops/Fight-Button NUR bei bekannten Monstern, Drop-
 * Silhouetten, Champion-Kodex-Tab, „Nur Unbesiegte"-Filter, Status-Legende, Fight-Button-Sprung in
 * den Kampf. Die frühere einklappbare Zonen-Sektion entfällt bewusst (das Konzept ist eine
 * durchgehende Wanderung, kein Akkordeon — der Mockup zeigt konsequent ALLE Bänder offen, auch
 * komplett unentdeckte).
 */

const LOCK_ICON_URL = getUiIcon("icon_locked");
/** Generisches Emblem für Drop-Chips ohne Bild UND ohne eigenes Item-Icon (Muster ItemWikiModal
 *  GENERIC_ICON_URL) — ersetzt den alten "▪"-Platzhalter-Charakter. */
const GENERIC_DROP_ICON_URL = getUiIcon("icon_ach_star");

/**
 * Champion-Kodex-Index (Jagd-Paket Task 3, Chef-GO): `content.elites` einmal beim Modul-Laden nach
 * Zone gruppiert (Katalog ändert sich nie zur Laufzeit) — Muster `KILL_LADDER_INDEX`/
 * `BESTIARY_LOOT_ITEM_IDS` unten. `EliteVariantDef.zone` ist die Gruppierungs-Achse.
 */
const CHAMPIONS_BY_ZONE_INDEX: Record<string, EliteVariantDef[]> = (() => {
  const idx: Record<string, EliteVariantDef[]> = {};
  for (const v of Object.values(content.elites ?? {}) as EliteVariantDef[]) {
    (idx[v.zone] ??= []).push(v);
  }
  return idx;
})();

const STATUS_LEGEND = ["burn", "frost", "shock", "poison", "bleed"] as const;

/**
 * Kill-Meilenstein-Leiter je Monster (Fun-Sweep FF, Pip P3b — collection-pip.md: "die 10/100/
 * 1000-Kill-Leiter als Mini-Häkchen direkt auf der Monsterkarte, die 258 Kill-Achievements sind
 * unsichtbar, solange sie nur in der Achievements-Wand liegen"). Wahrheit = die echten
 * `monster_kills`-Achievements (content.achievements), NICHT erfunden — nicht jedes Monster hat
 * eine volle Leiter (58 von ~105, s. Content-Kommentar "58 x 3 = 174"); fehlende Einträge liefern
 * eine leere Liste, die Karte zeigt dann einfach keine Leiter. Einmal beim Modul-Laden gebaut
 * (Katalog ändert sich nie zur Laufzeit) — Muster ZONE_PROGRESS_INDEX in CombatPage.tsx.
 */
const KILL_LADDER_INDEX: Record<string, number[]> = (() => {
  const idx: Record<string, number[]> = {};
  for (const a of content.achievements) {
    if (a.condition.type !== "monster_kills" || !a.condition.target || !a.condition.count) continue;
    (idx[a.condition.target] ??= []).push(a.condition.count);
  }
  for (const list of Object.values(idx)) list.sort((x, y) => x - y);
  return idx;
})();

/**
 * Welle PP (Erstfund-Flip, Antizipation-Moment 4): alle Item-IDs, die auf DIESER Seite überhaupt
 * als Silhouette auftauchen können (irgendein Monster-Loot-Eintrag) — der Live-Diff unten prüft
 * NUR diese Teilmenge statt des vollen Item-Katalogs (mehrere hundert Einträge), sowohl günstiger
 * als auch korrekter (ein Item, das z.B. nur über Crafting entdeckt wird, hat hier gar keine
 * Silhouette zum Aufflippen). Einmal beim Modul-Laden gebaut, Katalog ändert sich nie zur Laufzeit
 * — Muster KILL_LADDER_INDEX oben.
 */
const BESTIARY_LOOT_ITEM_IDS: Set<string> = (() => {
  const ids = new Set<string>();
  for (const m of Object.values(content.monsters) as MonsterDef[]) {
    if (m.id.startsWith("dg_")) continue;
    for (const roll of m.loot) ids.add(roll.itemId);
  }
  return ids;
})();

export function BestiaryPage({ onNavigate }: { onNavigate?: (id: string) => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  // Champion-Kodex-Tab (Jagd-Paket Task 3, Chef-GO): rein lokaler UI-Zustand, Muster
  // `onlyUndefeated` weiter unten — kein Persistenz-Bedarf.
  const [view, setView] = useState<"monsters" | "champions">("monsters");

  // Perf-Welle (2026-07-22): useCallback (dep [state, onNavigate]) statt einer bei jedem
  // BestiaryPage-Render (10 Hz, s. useGameState-Tick) frisch erzeugten Closure — die memoisierte
  // BestiaryMonsterCard unten bekommt `fight` als Prop, ein neuer Funktions-Prop pro Render hätte
  // memo() für JEDE Zeile unwirksam gemacht. `state` ist die über die Sitzung stabile Objekt-
  // Referenz (Engine mutiert in-place), ändert sich also faktisch nie.
  const fight = useCallback(
    (id: string): void => {
      startCombat(state, content, id);
      onNavigate?.("combat");
    },
    [state, onNavigate],
  );

  // ── Erstfund-Flip (Welle PP, Antizipation-Moment 4) ──────────────────────────────────────
  // Erkennt LIVE, während diese Seite offen ist, den Übergang "Kills 0 → >0" (Monster-Karte) bzw.
  // "unentdeckt → entdeckt" (Beute-Chip) und lässt genau die betroffene Karte einmalig sichtbar
  // aufflippen (~600ms Fenster, danach normale Darstellung — kein nachträgliches Abspulen beim
  // Seitenwechsel, da `prevRef` beim MOUNT bereits den AKTUELLEN Stand als Baseline nimmt, s.
  // Toasts.tsx-Musterkommentar zum selben Snapshot-Diff-Prinzip). Bei `fxLevel: "off"`/
  // `prefers-reduced-motion` bleibt es beim reinen State-Wechsel ohne Flip-Animation.
  const [flippingMonsters, setFlippingMonsters] = useState<Set<string>>(new Set());
  const [flippingItems, setFlippingItems] = useState<Set<string>>(new Set());
  const flipSnap = useRef<{ kills: Record<string, number>; discovered: Set<string> } | null>(null);

  useEffect(() => {
    const kills: Record<string, number> = {};
    for (const m of Object.values(content.monsters) as MonsterDef[]) {
      if (m.id.startsWith("dg_")) continue;
      kills[m.id] = monsterKills(state, m.id);
    }
    const discovered = new Set<string>();
    for (const id of BESTIARY_LOOT_ITEM_IDS) if (isItemDiscovered(state, id)) discovered.add(id);

    const prev = flipSnap.current;
    if (prev && effectiveFxLevel() !== "off") {
      const newMonsters: string[] = [];
      for (const [id, k] of Object.entries(kills)) {
        if (k > 0 && (prev.kills[id] ?? 0) === 0) newMonsters.push(id);
      }
      const newItems: string[] = [];
      for (const id of discovered) {
        if (!prev.discovered.has(id)) newItems.push(id);
      }
      if (newMonsters.length > 0) {
        setFlippingMonsters((s) => new Set([...s, ...newMonsters]));
        window.setTimeout(() => {
          setFlippingMonsters((s) => {
            const next = new Set(s);
            for (const id of newMonsters) next.delete(id);
            return next;
          });
        }, 650);
      }
      if (newItems.length > 0) {
        setFlippingItems((s) => new Set([...s, ...newItems]));
        window.setTimeout(() => {
          setFlippingItems((s) => {
            const next = new Set(s);
            for (const id of newItems) next.delete(id);
            return next;
          });
        }, 650);
      }
    }
    flipSnap.current = { kills, discovered };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Dungeon-Rework-Spec §5.4/§5.6: dg_<x>-Varianten (Dungeon-Aufschlag warband/crypt) teilen die
  // Zone ihrer Basis und schreiben ihren Kill-Credit auf die Basis-Id (killCreditMonsterId,
  // combat.ts) — ohne Filter erschienen sie als ewig "unbezwungene" Zweit-Einträge derselben Art.
  const monsters = (Object.values(content.monsters) as MonsterDef[])
    .filter((m) => !m.id.startsWith("dg_"))
    .slice()
    .sort((a, b) => a.level - b.level);

  const defeatedCount = monsters.filter((m) => monsterKills(state, m.id) > 0).length;

  // Sammel-Fortschritt (Item-Wiki-Fundament SAVE 58): Item-Entdeckung ist GLOBAL
  // (isItemDiscovered), nicht pro Monster — dieselbe Quelle wie das Item-Wiki-Modal.
  const allItemIds = Object.keys(content.items);
  const itemsDiscoveredCount = allItemIds.filter((id) => isItemDiscovered(state, id)).length;

  // Bestiarium-Jagdliste (Fun-Sweep FF, Pip P3a — collection-pip.md: "'Nur Unbesiegte'-Filter
  // analog zum Locked-Filter der Achievements"). Rein lokaler UI-Zustand (kein State-Feld nötig,
  // monsterKills() ist schon die Wahrheit) — wirkt NUR auf die Bänder unten; die Kopf-Zähler
  // (defeatedCount/itemsDiscoveredCount) bleiben immer die ECHTEN Gesamtzahlen.
  const [onlyUndefeated, setOnlyUndefeated] = useState(false);
  const visibleMonsters = onlyUndefeated
    ? monsters.filter((m) => monsterKills(state, m.id) === 0)
    : monsters;

  // Nach Zone gruppieren (Reihenfolge aus content.zones; Rest → "Unbekannt").
  const zoneOrder = [...content.zones, { id: "__other", name: { en: "Other", de: "Sonstige" } }];
  const byZone = zoneOrder
    .map((z) => ({
      zone: z,
      monsters: visibleMonsters.filter((m) =>
        z.id === "__other" ? !m.zone || !content.zones.some((cz) => cz.id === m.zone) : m.zone === z.id,
      ),
    }))
    .filter((g) => g.monsters.length > 0);

  return (
    <div className="bestiary-page">
      <header className="bjw-head">
        <div className="bjw-head-row">
          <div>
            <h1 className="bjw-head-title">{t("bestiary.journeyTitle")}</h1>
            <div className="bjw-head-subtitle">{t("bestiary.journeySubtitle")}</div>
          </div>
          <div className="bjw-seals">
            <div className="bjw-seal">
              <strong>{itemsDiscoveredCount}</strong>/{allItemIds.length} {t("bestiary.discovered")}
            </div>
            <div className="bjw-seal">
              <strong>{defeatedCount}</strong>/{monsters.length} {t("bestiary.seal.defeated")}
            </div>
          </div>
        </div>

        {/* Bestiarium / Champion-Kodex (Jagd-Paket Task 3, Chef-GO) — Tab-Leiste im MasteryPage-
            Stil (`.ms2-tab*`, global via skills.css, hier nur zweitverwendet). */}
        <div className="bjw-controls">
          <button
            type="button"
            className={`ms2-tab${view === "monsters" ? " ms2-tab--active" : ""}`}
            onClick={() => setView("monsters")}
          >
            {t("bestiary.tab.monsters")}
          </button>
          <button
            type="button"
            className={`ms2-tab${view === "champions" ? " ms2-tab--active" : ""}`}
            onClick={() => setView("champions")}
          >
            {t("bestiary.tab.champions")}
          </button>

          {view === "monsters" && (
            <button
              type="button"
              className={`bestiary-filter-chip${onlyUndefeated ? " active" : ""}`}
              aria-pressed={onlyUndefeated}
              onClick={() => setOnlyUndefeated((v) => !v)}
            >
              {t("bestiary.filter.onlyUndefeated")}
            </button>
          )}

          {view === "monsters" && (
            <div className="status-legend">
              <span className="status-legend-title muted">{t("bestiary.legend")}</span>
              {STATUS_LEGEND.map((s) => (
                <span key={s} className="status-legend-item" title={t(`status.${s}.desc`)}>
                  <span className="status-legend-icon">{renderEffectIcon(s)}</span>
                  <span className="status-legend-name">{t(`status.${s}`)}</span>
                  <span className="status-legend-desc muted">{t(`status.${s}.desc`)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {view === "champions" && <ChampionCodex />}

      {view === "monsters" && byZone.map((group, zoneIndex) => {
        const zoneId = group.zone.id;
        const zoneBg = getBattleScreen(zoneId) ?? getZoneBackground(zoneId);
        // Story-Zonen-Gate (Aschechronik, ceo-run-2026-07-13 Welle E): die Bestiary bietet keinen
        // Direkt-Kampfstart für Monster gesperrter Zonen an — canFightMonster/startCombat blocken
        // das engine-seitig ohnehin (kein Throw, no-op), aber der "Kämpfen"-Button soll das gar
        // nicht erst anbieten (s. isZoneUnlocked, engine/zones.ts). EINMAL pro Band berechnet (der
        // Gate ist zonenweit uniform) statt wie in der alten Grid-Fassung pro Monster — dieselbe
        // Wahrheit, weniger redundante Aufrufe.
        const zoneLocked = zoneId !== "__other" && !isZoneUnlocked(state, content, zoneId);
        const gateQuest = zoneLocked
          ? content.quests.find((q) => q.id === content.zones.find((z) => z.id === zoneId)?.requiresQuest)
          : undefined;
        const levels = group.monsters.map((m) => m.level);
        const lvlMin = Math.min(...levels);
        const lvlMax = Math.max(...levels);
        const zoneDiscovered = group.monsters.filter((m) => monsterKills(state, m.id) > 0).length;

        return (
          <ZoneBandShell
            key={zoneId}
            bg={zoneBg}
            // Erstes Band ist beim Seitenaufruf IMMER sofort sichtbar (kein Scroll nötig) — `eager`
            // umgeht dafür das `loading="lazy"`-Standardverhalten (s. ZoneBandShell), sonst kann der
            // native Lazy-Load-Scheduler den allerersten Screenshot/Frame noch mit unentschiedenem
            // Bild erwischen (Ladewettlauf, im Bot-Screenshot-Review aufgefallen). Alle FOLGENDEN
            // Bänder bleiben lazy — das ist der eigentliche Fill-Rate-Spargewinn (9 von 10 Bändern
            // sind beim Laden typischerweise off-screen).
            eager={zoneIndex === 0}
            locked={zoneLocked}
            lockedNote={
              zoneLocked
                ? t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"))
                : null
            }
            zoneName={tr(group.zone.name)}
            lvlMin={lvlMin}
            lvlMax={lvlMax}
            discovered={zoneDiscovered}
            total={group.monsters.length}
            t={t}
          >
            {group.monsters.map((m) => {
              const kills = monsterKills(state, m.id);
              const known = kills > 0;
              const reqItem = m.slayerRequirement ? content.items[m.slayerRequirement] : undefined;
              const reqMet = slayerRequirementMet(state, content, m.id);
              // Dungeon-Rework Welle L (ceo-run-2026-07-13, "Gebiet für Gebiet, Dungeon um
              // Dungeon"): dungeonOnly-Monster (Idol-Halle-Bosse, Drazhan) können NIE direkt
              // gestartet werden — startCombat blockt `monster.dungeonOnly` unbedingt (engine/
              // combat.ts), unabhängig vom Dungeon-Unlock-Status. Der "Kämpfen"-Button bleibt für
              // sie deshalb IMMER deaktiviert; der Hinweistext unterscheidet trotzdem zwei Fälle:
              // der zugehörige Dungeon ist noch quest-/zonen-gesperrt (isDungeonUnlocked, s.
              // engine/dungeon.ts, dieselbe Sperr-Ursachen-Priorität wie die Dungeon-Karten in
              // CombatPage) → derselbe "Erfordert Chronik-Kapitel"-Hinweis; ist der Dungeon bereits
              // offen, erklärt ein eigener Hinweis, dass das Monster nur als Dungeon-Welle vorkommt.
              // Fix-Welle S: geteilter Helfer (util/chronicle.ts `monsterHomeDungeon`) statt
              // eigener Inline-Auflösung — dieselbe dg_-Alias- + Mehrfach-Dungeon-Logik wie die
              // WO-Zeile im Story-Tab (QuestsPage.tsx `objectiveLocation`).
              const owningDungeon = m.dungeonOnly ? monsterHomeDungeon(content, m.id) : undefined;
              const dungeonUnlocked = owningDungeon ? isDungeonUnlocked(state, content, owningDungeon.id) : true;
              const dungeonZoneLocked = owningDungeon?.zone
                ? !isZoneUnlocked(state, content, owningDungeon.zone)
                : false;
              const dungeonGateQuestId = dungeonZoneLocked
                ? content.zones.find((z) => z.id === owningDungeon?.zone)?.requiresQuest
                : owningDungeon?.requiresQuest;
              const dungeonGateQuest = dungeonGateQuestId
                ? content.quests.find((q) => q.id === dungeonGateQuestId)
                : undefined;
              // Perf-Welle (2026-07-22): Beute-Entdeckungs-Summe als billiger primitiver
              // Re-Render-Trigger für die memoisierte Zeile (s. BestiaryMonsterCard) — m.loot
              // ist winzig (meist 1-5 Einträge); die Summe ändert sich GENAU dann, wenn
              // irgendein Drop dieses Monsters neu entdeckt wurde (auch über eine andere Quelle
              // als diesen Kampf), unabhängig von `kills`.
              const lootDiscoveredCount = m.loot.reduce(
                (n, roll) => n + (isItemDiscovered(state, roll.itemId) ? 1 : 0),
                0,
              );
              return (
                <BestiaryMonsterCard
                  key={m.id}
                  m={m}
                  state={state}
                  t={t}
                  tr={tr}
                  kills={kills}
                  known={known}
                  flipping={flippingMonsters.has(m.id)}
                  flippingItems={flippingItems}
                  lootDiscoveredCount={lootDiscoveredCount}
                  reqItem={reqItem}
                  reqMet={reqMet}
                  zoneLocked={zoneLocked}
                  gateQuest={gateQuest}
                  dungeonUnlocked={dungeonUnlocked}
                  dungeonGateQuest={dungeonGateQuest}
                  owningDungeon={owningDungeon}
                  fight={fight}
                  showFightButton={!!onNavigate}
                />
              );
            })}
          </ZoneBandShell>
        );
      })}
    </div>
  );
}

/**
 * Ein Zonen-Band der Reise (Konzept 4): Vollbild-Backdrop (echtes `<img loading="lazy">`, dieselbe
 * Asset-Quelle wie der Kampf-Zonen-Hintergrund) + Verlaufs-Scrim + Kopfzeile (Name/Level-Spanne/
 * Fortschritt) + optionaler Sperr-Hinweis + horizontal scrollende Wegpunkt-Reihe. Geteilt zwischen
 * Bestiarium- und Champion-Kodex-Ansicht (nur die Kinder unterscheiden sich).
 */
function ZoneBandShell({
  bg,
  eager = false,
  locked,
  lockedNote,
  zoneName,
  lvlMin,
  lvlMax,
  discovered,
  total,
  t,
  children,
}: {
  bg: string | null;
  /** True nur fürs allererste Band (immer sofort sichtbar, kein Scroll nötig) — umgeht dort
   *  `loading="lazy"`, s. Aufrufer-Kommentar. */
  eager?: boolean;
  locked: boolean;
  lockedNote: string | null;
  zoneName: string;
  lvlMin: number;
  lvlMax: number;
  discovered: number;
  total: number;
  t: (key: string) => string;
  children: ReactNode;
}): JSX.Element {
  const pct = total > 0 ? (discovered / total) * 100 : 0;
  return (
    <section className={`bjw-band${locked ? " locked" : ""}`}>
      {bg && (
        <img
          className="bjw-band-bg"
          src={bg}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          // React 18.3 kennt nur das kleingeschriebene DOM-Attribut (fetchPriority camelCase warnt
          // und landet nie im DOM); die 18er-Typen kennen es gar nicht → als Spread durchreichen.
          {...(eager ? { fetchpriority: "high" } : {})}
        />
      )}
      <div className="bjw-band-scrim" aria-hidden="true" />
      <div className="bjw-band-content">
        <div className="bjw-band-header">
          <h2>{zoneName}</h2>
          <div className="bjw-band-meta">
            <span>{t("combat.zoneLevels").replace("{min}", String(lvlMin)).replace("{max}", String(lvlMax))}</span>
            <span>{t("bestiary.zoneDiscovered").replace("{n}", String(discovered)).replace("{total}", String(total))}</span>
            <span className="bar bjw-band-bar">
              <span className="bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
            </span>
          </div>
        </div>

        {locked && lockedNote && (
          <div className="bjw-band-locked-note">
            <span aria-hidden="true">
              {LOCK_ICON_URL ? <img src={LOCK_ICON_URL} alt="" className="ui-icon" loading="lazy" decoding="async" /> : "🔒"}
            </span>
            {lockedNote}
          </div>
        )}

        <div className="bjw-track-wrap">
          <div className="bjw-track">{children}</div>
          <div className="bjw-scroll-hint" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

interface BestiaryMonsterCardProps {
  m: MonsterDef;
  /** Live-State-Objekt (dieselbe Referenz wie `useGameState()` — Engine mutiert in-place), nur
   *  noch für die Beute-Detailauflösung (isItemDiscovered je Drop) gebraucht — der eigentliche
   *  Re-Render-Trigger dafür ist `lootDiscoveredCount` (s.u.), nicht `state` selbst. */
  state: GameState;
  t: (key: string) => string;
  tr: (value: LocalizedString) => string;
  kills: number;
  known: boolean;
  flipping: boolean;
  /** Änderungshäufigkeit sehr niedrig (nur bei einem frischen Erstfund gesetzt) — als Objekt-Prop
   *  unproblematisch für memo(). */
  flippingItems: Set<string>;
  lootDiscoveredCount: number;
  reqItem: ItemDef | undefined;
  reqMet: boolean;
  zoneLocked: boolean;
  gateQuest: QuestDef | undefined;
  dungeonUnlocked: boolean;
  dungeonGateQuest: QuestDef | undefined;
  owningDungeon: DungeonDef | undefined;
  /** useCallback-stabilisiert im Parent (dep [state, onNavigate]) — sicher als memo()-Prop. */
  fight: (id: string) => void;
  showFightButton: boolean;
}

/**
 * Eine Monster-Wegpunkt-Karte des Bestiariums (Perf-Welle 2026-07-22, weiterhin gültig nach dem
 * Reise-Umbau). `memo()` + primitive Props (kills/known/reqMet/zoneLocked/dungeonUnlocked/
 * lootDiscoveredCount/…) lassen memo()s flachen Props-Vergleich echte Änderungen erkennen (state
 * selbst ist eine über die Sitzung stabile, intern mutierte Objekt-Referenz und daher ALLEIN kein
 * tauglicher Vergleichswert, s. ActionCardProps-Kommentar in SkillPage.tsx für dasselbe Muster) —
 * nur Zeilen mit echter Änderung rendern/diffen neu, auch bei bis zu ~15 Karten je Band.
 */
const BestiaryMonsterCard = memo(function BestiaryMonsterCard({
  m,
  state,
  t,
  tr,
  kills,
  known,
  flipping,
  flippingItems,
  reqItem,
  reqMet,
  zoneLocked,
  gateQuest,
  dungeonUnlocked,
  dungeonGateQuest,
  owningDungeon,
  fight,
  showFightButton,
}: BestiaryMonsterCardProps): JSX.Element {
  const art = known ? getMonsterSrc(m.id) : null;
  return (
    <div className={`bjw-card${known ? "" : " unknown"}`}>
      <div className="bjw-art">
        <FlipReveal
          className="bjw-art-flip"
          flipping={flipping}
          frontContent={<span className="bestiary-portrait-ph">?</span>}
          backContent={
            art ? (
              <img
                loading="lazy"
                decoding="async"
                src={art}
                alt={tr(m.name)}
                className="bestiary-card-portrait"
              />
            ) : (
              <span className="bestiary-portrait-ph">⚔</span>
            )
          }
        />
        <span className="bestiary-card-level-badge">
          {t("bestiary.level").replace("{n}", String(m.level))}
        </span>
        {known && m.enrage ? (
          <span className="bestiary-enrage-badge" title={t("combat.enrageHint")} aria-hidden="true">
            {getUiIcon("icon_enrage")
              ? <img src={getUiIcon("icon_enrage")!} alt="" className="bestiary-enrage-img" loading="lazy" decoding="async" />
              : "😡"}
          </span>
        ) : null}
      </div>

      <div className="bjw-body">
        <div className="bjw-name" title={known ? tr(m.name) : undefined}>
          {known ? tr(m.name) : "???"}
        </div>

        {/* Verteidigungs-Trinität-Badge — dasselbe Badge wie die Zonen-Auswahlkarte (MonsterCard),
            hier sogar VOR jedem Kill sichtbar (Defense-Typ ist Kampfmechanik, kein Spoiler wie
            Name/Art/Drops). */}
        <DefenseTypeBadge type={m.defenseType} />

        {/* Kill-Zähler: dezent, IMMER sichtbar (auch bei unbekannten Monstern) —
            monsterKills()-Selektor statt Roh-Feld (SAVE 58). 0 Kills zeigt gedimmt
            „—" statt die Zeile ganz zu verstecken. */}
        <div
          className={`bjw-kills${kills > 0 ? "" : " dim"}`}
          title={t("combat.kills").replace("{n}", String(kills))}
        >
          <span aria-hidden="true">⚔</span> {kills > 0 ? formatNum(kills) : "—"}
        </div>

        {/* Kill-Leiter-Häkchen (Fun-Sweep FF, Pip P3b): die echten 10/100/1000-
            Kill-Achievements (KILL_LADDER_INDEX, s.o.) als Mini-Häkchen-Reihe —
            nur für Monster, die überhaupt eine Leiter haben (58 von ~105), und
            nur sobald mindestens 1 Kill vorliegt (sonst identisch zu jeder anderen
            unbekannten Karte, keine Extra-Zeile nötig). */}
        {known && (KILL_LADDER_INDEX[m.id]?.length ?? 0) > 0 && (
          <div className="bjw-kill-ladder">
            {KILL_LADDER_INDEX[m.id]!.map((threshold) => {
              const reached = kills >= threshold;
              return (
                <span
                  key={threshold}
                  className={`bjw-kill-ladder-step${reached ? " reached" : ""}`}
                  title={t("bestiary.killLadder.title")
                    .replace("{cur}", formatNum(Math.min(kills, threshold)))
                    .replace("{n}", formatNum(threshold))}
                >
                  {reached ? "✓" : "○"} {formatNum(threshold)}
                </span>
              );
            })}
          </div>
        )}

        {known ? (
          <>
            {/* Dieselbe geteilte StatLine/StatLineImmune-Komponente wie Fight-Screen + Monster-
                Auswahlkarte (statt eigenem Markup) — volle Konsistenz. */}
            <StatLine
              className="bjw-stats"
              entries={[
                { key: "hp", icon: statIcon("hp"), label: t("combat.hp"), value: formatNum(m.maxHp) },
                { key: "atk", icon: statIcon("atk"), label: t("combat.dmg"), value: formatNum(m.damage) },
                { key: "def", icon: statIcon("def"), label: t("stat.defense"), value: formatNum(m.defense) },
                ...(m.regen
                  ? [{ key: "regen", icon: "♻", label: t("combat.regenHint"), value: `${formatNum(m.regen)}/s` } as StatLineEntry]
                  : []),
              ]}
            />

            {m.resist && m.resist.length > 0 && (
              <StatLineImmune label={t("combat.immune")} title={t("combat.immuneHint")} className="bjw-resist">
                {m.resist.map((r) => (
                  <span key={r}>{renderEffectIcon(r)}</span>
                ))}
              </StatLineImmune>
            )}

            {m.inflict && (
              <StatLineImmune label={t("combat.inflicts")} warn title={inflictHintFor(t, m.inflict.type)} className="bjw-resist">
                {renderEffectIcon(m.inflict.type)}
              </StatLineImmune>
            )}

            {reqItem && (
              <div className={`bjw-slayer-req${reqMet ? "" : " warn"}`}>
                {t("combat.slayerRequires").replace("{item}", tr(reqItem.name))}
              </div>
            )}

            {m.loot.length > 0 && (
              <div className="bjw-drops">
                {m.loot.map((roll) => {
                  // Item-Wiki-Sweep (SAVE 58): die Drop-Maskierung folgt jetzt dem
                  // GLOBALEN Item-Entdeckungsstatus (isItemDiscovered) statt dem
                  // pro-Monster-Collection-Log (hasDropSeen) — ein Item gilt hier als
                  // bekannt, sobald der Spieler es JEMALS besessen hat (egal welche
                  // Quelle: Drop, Craft, Shop, Quest, …), dieselbe Quelle wie das
                  // Item-Wiki-Modal.
                  const discovered = isItemDiscovered(state, roll.itemId);
                  if (!discovered) {
                    // Task #248: schwarze Silhouette des echten Items statt „???"-Text
                    // (gleiche Bild-Slot-Größe wie ItemChip, brightness(0) verbirgt
                    // Details) + „?"-Overlay obendrauf. KEIN Name im Tooltip — nur
                    // „Unentdeckt" (kein Info-Leak über unentdeckte Items).
                    const mysteryImg = getItemImage(roll.itemId);
                    return (
                      <div
                        key={roll.itemId}
                        className="bjw-drop undiscovered"
                        title={t("combat.undiscovered")}
                      >
                        {mysteryImg ? (
                          <span className="bjw-drop-chip bjw-drop-mystery-wrap">
                            <img
                              loading="lazy"
                              decoding="async"
                              src={mysteryImg}
                              alt=""
                              className="item-chip-img bjw-drop-silhouette pixelart"
                            />
                            <span className="bjw-drop-mystery-mark" aria-hidden="true">?</span>
                          </span>
                        ) : (
                          <span className="bjw-drop-mystery">???</span>
                        )}
                      </div>
                    );
                  }
                  // Fun-Sweep FF (Grete G1): gestaffelte %-Rundung jetzt aus util/format
                  // (formatDropPct) — dieselbe Quelle wie die Dungeon-Beute-Vorschau
                  // (CombatPage.tsx), statt einer zweiten Kopie der Formel.
                  const pct = formatDropPct(roll.chance);
                  // Entdeckte Drops öffnen direkt das Item-Wiki-Modal (statt nur den
                  // Tooltip zu pinnen wie der generische ItemChip) — überall nutzbar,
                  // s. openItemWikiModal-JSDoc (ItemWikiModal.tsx).
                  const dropItem = content.items[roll.itemId];
                  const dropImg = getItemImage(roll.itemId);
                  // Welle PP (Erstfund-Flip): war dieses Item bis eben unentdeckt und
                  // ist GERADE (während diese Seite offen ist) entdeckt worden, flippt
                  // der Chip einmalig von Silhouette auf enthüllt — s. `flippingItems`.
                  const dropFlipping = flippingItems.has(roll.itemId);
                  const revealedFace = (
                    <span className="bjw-drop-chip">
                      {dropImg ? (
                        <img loading="lazy" decoding="async" src={dropImg} alt="" className="item-chip-img pixelart" />
                      ) : dropItem?.icon ? (
                        <span className="item-chip-emoji">{dropItem.icon}</span>
                      ) : GENERIC_DROP_ICON_URL ? (
                        <img loading="lazy" decoding="async" src={GENERIC_DROP_ICON_URL} alt="" className="item-chip-img" />
                      ) : (
                        <span className="item-chip-emoji">▪</span>
                      )}
                      {/* Item-Checkliste (Fun-Sweep FF, Pip P3c): explizites ✓ auf
                          gefundenen Drops — bislang unterschied sich "gefunden" nur
                          implizit durchs volle Icon vs. die Silhouette oben. */}
                      <span className="bjw-drop-check" aria-hidden="true">✓</span>
                    </span>
                  );
                  return (
                    <div
                      key={roll.itemId}
                      className="bjw-drop"
                      title={dropItem ? tr(dropItem.name) : roll.itemId}
                      role="button"
                      tabIndex={0}
                      onClick={() => openItemWikiModal(roll.itemId)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        openItemWikiModal(roll.itemId);
                      }}
                    >
                      {dropFlipping ? (
                        <FlipReveal
                          className="bjw-drop-flip"
                          flipping
                          frontContent={
                            dropImg ? (
                              <span className="bjw-drop-chip bjw-drop-mystery-wrap">
                                <img
                                  loading="lazy"
                                  decoding="async"
                                  src={dropImg}
                                  alt=""
                                  className="item-chip-img bjw-drop-silhouette pixelart"
                                />
                                <span className="bjw-drop-mystery-mark" aria-hidden="true">?</span>
                              </span>
                            ) : (
                              <span className="bjw-drop-mystery">???</span>
                            )
                          }
                          backContent={revealedFace}
                        />
                      ) : (
                        revealedFace
                      )}
                      <span className="bjw-drop-pct muted">{pct}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {showFightButton && (
              <button
                className="bestiary-fight-btn bjw-fight-btn"
                disabled={!reqMet || zoneLocked || !!m.dungeonOnly}
                title={
                  zoneLocked
                    ? t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"))
                    : m.dungeonOnly
                      ? (!dungeonUnlocked
                          ? t("combat.zoneGate.requires").replace("{name}", dungeonGateQuest ? tr(dungeonGateQuest.name) : t("app.unknown"))
                          : t("bestiary.dungeonOnlyHint").replace("{name}", owningDungeon ? tr(owningDungeon.name) : ""))
                      : !reqMet && reqItem
                        ? t("combat.slayerRequires").replace("{item}", tr(reqItem.name))
                        : undefined
                }
                onClick={() => fight(m.id)}
              >
                ⚔ {t("combat.fight")}
              </button>
            )}
          </>
        ) : (
          <div className="bjw-unknown-hint bestiary-unknown-hint">{t("bestiary.undiscovered")}</div>
        )}
      </div>
    </div>
  );
});

/**
 * Champion-Kodex (Jagd-Paket Task 3, Chef-GO): je Champion aus `content.elites` (gruppiert nach
 * Zone, s. CHAMPIONS_BY_ZONE_INDEX oben) eine Codex-Wegpunkt-Karte in derselben Band-Optik wie das
 * normale Bestiarium (ZoneBandShell) — Discovery-Muster übernommen (unentdeckt = "???"-Silhouette),
 * aber OHNE dessen Kill-Leiter/Loot-Grid (kein Sinn für einen Champion: er droppt sein Unique über
 * den normalen Kampf-Loot-Pfad, den zeigt bereits die Elite-Kampfkarte auf CombatPage). Champion-
 * Bänder sind nie "locked" (kein eigener Zonen-Sperr-Zustand im Kodex, s. Konzept-4-Vorlage).
 * `state.eliteCodex[variantId]` ist der Fortschritts-Speicher (logic-dev, Jagd-Paket-Fundament):
 * `{ sightings, kills, uniques, fastestKillMs }` — "entdeckt" heißt hier "mindestens 1x gesichtet",
 * nicht "mindestens 1x besiegt" (ein Champion kann fliehen/enttarnt werden, ohne dass der Spieler
 * ihn je erlegt hat — das Sichten allein lüftet schon Name + Art, Muster `monsterKills`-Discovery
 * dort aber "kills>0"; hier ist der frühere, sanftere Schwellwert bewusst richtig).
 */
function ChampionCodex(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  const byZone = content.zones
    .map((zone) => ({ zone, champions: CHAMPIONS_BY_ZONE_INDEX[zone.id] ?? [] }))
    .filter((g) => g.champions.length > 0);

  if (byZone.length === 0) {
    return (
      <section className="panel">
        <p className="muted">{t("bestiary.champions.empty")}</p>
      </section>
    );
  }

  return (
    <>
      {byZone.map((group, zoneIndex) => {
        const zoneBg = getBattleScreen(group.zone.id) ?? getZoneBackground(group.zone.id);
        const baseLevels = group.champions
          .map((v) => content.monsters[v.baseMonsterId]?.level)
          .filter((lvl): lvl is number => typeof lvl === "number");
        const lvlMin = baseLevels.length > 0 ? Math.min(...baseLevels) : 0;
        const lvlMax = baseLevels.length > 0 ? Math.max(...baseLevels) : 0;
        const discovered = group.champions.filter((v) => (state.eliteCodex?.[v.id]?.sightings ?? 0) > 0).length;

        return (
          <ZoneBandShell
            key={group.zone.id}
            bg={zoneBg}
            eager={zoneIndex === 0}
            locked={false}
            lockedNote={null}
            zoneName={tr(group.zone.name)}
            lvlMin={lvlMin}
            lvlMax={lvlMax}
            discovered={discovered}
            total={group.champions.length}
            t={t}
          >
            {group.champions.map((variant) => {
              const entry = state.eliteCodex?.[variant.id];
              const known = (entry?.sightings ?? 0) > 0;
              const art = known ? getEliteMonsterSrc(variant.id, variant.baseMonsterId) : null;
              const baseLevel = content.monsters[variant.baseMonsterId]?.level;
              return (
                <div key={variant.id} className={`bjw-card${known ? "" : " unknown"}`}>
                  <div className="bjw-art">
                    {art ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={art}
                        alt={tr(variant.name)}
                        className="bestiary-card-portrait"
                      />
                    ) : (
                      <span className="bestiary-portrait-ph" aria-hidden="true">{known ? "⚔" : "?"}</span>
                    )}
                    {typeof baseLevel === "number" && (
                      <span className="bestiary-card-level-badge">
                        {t("bestiary.level").replace("{n}", String(baseLevel))}
                      </span>
                    )}
                  </div>
                  <div className="bjw-body">
                    <div className="bjw-name" title={known ? tr(variant.name) : undefined}>
                      {known ? tr(variant.name) : "???"}
                    </div>
                    {known ? (
                      <div className="codex-stat-row">
                        <div className="codex-stat">
                          <span className="codex-stat-label">{t("bestiary.champion.sightings")}</span>
                          <span className="codex-stat-val">{formatNum(entry?.sightings ?? 0)}</span>
                        </div>
                        <div className="codex-stat">
                          <span className="codex-stat-label">{t("bestiary.champion.kills")}</span>
                          <span className="codex-stat-val">{formatNum(entry?.kills ?? 0)}</span>
                        </div>
                        <div className="codex-stat">
                          <span className="codex-stat-label">{t("bestiary.champion.uniques")}</span>
                          <span className="codex-stat-val">{formatNum(entry?.uniques ?? 0)}</span>
                        </div>
                        <div className="codex-stat">
                          <span className="codex-stat-label">{t("bestiary.champion.fastest")}</span>
                          <span className="codex-stat-val">
                            {entry?.fastestKillMs != null ? formatMmSs(entry.fastestKillMs) : "—"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="codex-card-zonehint muted">
                        {t("bestiary.champion.zoneHint").replace("{zone}", tr(group.zone.name))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </ZoneBandShell>
        );
      })}
    </>
  );
}
