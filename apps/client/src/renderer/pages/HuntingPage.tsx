import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { isZoneUnlocked, levelFromXp, xpForLevel } from "@hearthforge/engine";
import {
  BAIT_ITEM_ID,
  DUNGEON_VARIANT_PREFIX,
  HUNT_BAIT_TIERS,
  HUNT_LOOT_ROLLS,
  HUNT_SLOT_LEVELS,
  HUNT_TRAP_SLOTS,
  huntCatchXp,
} from "@hearthforge/shared";
import type { GameState, HuntTrap, HuntZoneDef, LocalizedString, MonsterDef } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatDropPct, formatNum } from "../util/format";
import { getItemImage, rarityClass } from "../items";
import { getMonsterSrc } from "../monsters";
import { getUiIcon } from "../uiIcons";
import { getSidebarIcon } from "../sidebarIcons";
import { SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getZoneBackgroundCard } from "../zoneBackgrounds";
import { getHuntingTrapArt } from "../huntingArt";
import { getHuntBookCollapsed, setHuntBookCollapsed } from "../util/uiPrefs";
import { registerEscCloser } from "../util/escStack";
import { openItemWikiModal } from "../components/ItemWikiModal";
import {
  clearHuntTrap,
  huntBaitCount,
  huntCatchChance,
  huntSetReason,
  huntTrapSlots,
  huntZoneBaitId,
  huntZoneDef,
  huntableMonsters,
  setHuntAutoRebait,
  setHuntTrap,
} from "../huntingApi";
import type { HuntSetReason } from "../huntingApi";
import { ItemChip } from "../components/ItemChip";
import "../styles/hunting.css";

const LOCKED_ICON_URL = getUiIcon("icon_locked");
const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
const BAIT_FALLBACK_ICON = "🪱";
const HUNT_SIDEBAR_ICON_URL = getSidebarIcon("hunting");
const HUNT_SKILL_EMOJI = SKILL_EMOJI_FALLBACK.hunting ?? "🪤";
/** Höchstens 4 Beute-Chips im „Letzter Fang" der Fallen-Karte (Layout-Vorgabe) — der Rest zählt
 *  als „+n" statt die Karte in die Breite zu ziehen. */
const LAST_CATCH_CHIP_CAP = 4;

/** Köder-Stufen (Chef-Nachtrag 28.08.2026, Symbiose Angeln ↔ Jagen): welche Angel-Aktion welche
 *  Köder-Sorte liefert — für den „Kein <Köder>, Angeln ab Stufe X: <Aktion>"-Hinweis am
 *  deaktivierten „Falle stellen"-Knopf. Dieselben fünf Sorten wie `HUNT_BAIT_TIERS` (shared). */
const BAIT_ACTION_ID: Record<string, string> = {
  bait_worm: "dig_bait",
  bait_maggot: "gather_maggots",
  bait_crab: "trap_crabs",
  bait_squid: "net_squid",
  bait_glow: "gather_glowworms",
};

/** Format milliseconds compactly: "Xh Ym", "Xm Ys", or "Xs" (Muster FarmPage.tsx `formatMs`). */
function formatMs(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Boss-Erkennung (Parität zur PRIVATEN gleichnamigen Hilfsfunktion in
// packages/engine/src/hunting.ts `bossMonsterIds`, dort intern von `huntableMonsters` genutzt —
// Bosse bleiben dauerhaft ausgeschlossen, auch nach dem ersten Kill). Nicht exportiert → hier
// einmalig aus denselben drei Content-Signalen nachgebaut, rein lesend, damit das Gebiet-Modal und
// das Jagdbuch keine Kandidaten zeigen, die `huntableMonsters` nie freigeben würde:
//  (a) `enrage` — De-facto-Boss-Marker im Content (z. B. Hochland-Wyvern, Leerenroc);
//  (b) Endgegner eines Dungeons (letzter Eintrag von `encounters`, z. B. Voidhusk-Crusher);
//  (c) Ziel eines `ach_boss_*`-Erfolgs (monster_kills) — deckt Zonen-Bosse ohne enrage ab.
const BOSS_ACHIEVEMENT_PREFIX = "ach_boss_";
const BOSS_MONSTER_IDS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (const m of Object.values(content.monsters)) if (m?.enrage) out.add(m.id);
  for (const d of content.dungeons ?? []) {
    const last = d.encounters[d.encounters.length - 1];
    if (last) out.add(last);
  }
  for (const a of content.achievements ?? []) {
    if (!a.id.startsWith(BOSS_ACHIEVEMENT_PREFIX)) continue;
    const cond = a.condition as { type?: string; target?: string };
    if (cond.type === "monster_kills" && typeof cond.target === "string") out.add(cond.target);
  }
  return out;
})();

/** Alle familien-/zonenpassenden Kandidaten eines Gebiets — OHNE die `monsterKills ≥ 1`-Hürde
 *  von `huntableMonsters` (die Engine-Funktion entscheidet, was aktuell WIRKLICH gefangen werden
 *  kann; das Jagdbuch will zusätzlich zeigen, was es dort überhaupt zu entdecken gibt — Muster
 *  Bestiarium: unbesiegte Einträge bleiben sichtbar, nur ohne Häkchen). Rein UI-seitige Ableitung
 *  aus dem Content-Katalog, keine neue Spielregel; Boss-/Dungeon-Varianten-Ausschluss hält sich an
 *  dieselbe Regel wie `huntableMonsters`, sonst würde das Buch Kandidaten versprechen, die nie
 *  fangbar werden. */
function huntCandidatesForZone(c: typeof content, zoneId: string) {
  return Object.values(c.monsters).filter(
    (m) =>
      m.zone === zoneId &&
      !m.id.startsWith(DUNGEON_VARIANT_PREFIX) &&
      !BOSS_MONSTER_IDS.has(m.id),
  );
}

/** „x/y besiegt" eines Gebiets — Nenner = alle familien-/zonenpassenden Kandidaten (s.o.), Zähler
 *  = davon mind. einmal im Kampf besiegt (dieselbe Hürde, die `huntableMonsters` fürs Fangen selbst
 *  verlangt). Verwendet sowohl im Gebietswahl-Modal als auch im Jagdbuch-Zeilenkopf. */
function huntZoneProgress(state: GameState, c: typeof content, zoneId: string): { defeated: number; total: number } {
  const candidates = huntCandidatesForZone(c, zoneId);
  const defeated = candidates.filter((m) => (state.monsterKills[m.id] ?? 0) >= 1).length;
  return { defeated, total: candidates.length };
}

function reasonText(t: (key: string) => string, reason: HuntSetReason, levelRequired: number): string {
  if (reason === "level") return t("hunting.reason.level").replace("{n}", String(levelRequired));
  return t(`hunting.reason.${reason}`);
}

/** Deaktiviert-Hinweis „Kein <Köder>, Angeln ab Stufe X: <Aktion>" (Köder-Stufen 28.08.2026,
 *  Chef-Nachtrag) — nennt genau die Sorte, die die gewählte Zone verlangt (`huntZoneBaitId`),
 *  statt der alten pauschalen „Kein Köder mehr."-Meldung. */
function noBaitText(t: (key: string) => string, tr: (v: LocalizedString) => string, baitId: string): string {
  const item = content.items[baitId];
  const baitName = item ? tr(item.name) : baitId;
  const tier = HUNT_BAIT_TIERS.find((x) => x.itemId === baitId);
  const actionId = BAIT_ACTION_ID[baitId];
  const action = actionId ? content.actions[actionId] : undefined;
  const actionName = action ? tr(action.name) : (actionId ?? "");
  return t("hunting.reason.no_bait_named")
    .replace("{bait}", baitName)
    .replace("{n}", String(tier?.fishingLevel ?? 1))
    .replace("{action}", actionName);
}

/** Grund, warum ein Gebiet im Gebiet-Modal (Layout-Vorgabe #3, Chef-Auftrag 28.08.2026) abgedunkelt
 *  ist — bewusst OHNE Platz-/Köder-Achse (die prüft erst der „Falle stellen"-Knopf unten über das
 *  volle `huntSetReason`): Browsen soll nicht wegen leerem Köder-Vorrat jedes Gebiet ausgrauen. */
type ZoneGateReason = "zone_locked" | "level" | "nothing_huntable";
function zoneGateReason(state: GameState, c: typeof content, huntLevel: number, zoneId: string): ZoneGateReason | null {
  const zone = huntZoneDef(c, zoneId);
  if (!zone || !isZoneUnlocked(state, c, zoneId)) return "zone_locked";
  if (huntLevel < zone.levelRequired) return "level";
  if (huntableMonsters(state, c, zoneId).length === 0) return "nothing_huntable";
  return null;
}

/** „Offen" fürs Jagdbuch-Zusammenfassungs-Kopfzeile (Layout-Vorgabe #4, Redesign Runde 2): Gebiet +
 *  Jagen-Stufe erreicht — bewusst OHNE die `nothing_huntable`-Achse (ein Gebiet ohne aktuell
 *  fangbaren Bestand ist trotzdem „offen", der Spieler kann dort einfach noch nichts Neues fangen). */
function huntZoneIsOpen(state: GameState, c: typeof content, huntLevel: number, zoneId: string): boolean {
  const zone = huntZoneDef(c, zoneId);
  if (!zone || !isZoneUnlocked(state, c, zoneId)) return false;
  return huntLevel >= zone.levelRequired;
}

/** Gegenstück zu `huntCandidatesForZone`: Zonenmonster, die NIE fangbar werden (Struktur, nicht
 *  „noch nicht besiegt") — alle Zonenmonster minus deren Kandidaten. Für den „Nicht fangbar"-
 *  Abschnitt des Gebiet-Modals, damit der Spieler den Grund sieht statt eine Lücke zu raten. */
function huntNonTrappableForZone(c: typeof content, zoneId: string): MonsterDef[] {
  const candidateIds = new Set(huntCandidatesForZone(c, zoneId).map((m) => m.id));
  return Object.values(c.monsters).filter((m) => m.zone === zoneId && !candidateIds.has(m.id));
}

/** i18n-Key des Grunds aus `huntNonTrappableForZone` — dieselben drei Signale wie die private
 *  `bossMonsterIds`/Familien-Prüfung der Engine (`packages/engine/src/hunting.ts`): Dungeon-
 *  gebunden → sonst (jede Familie ist fangbar, Chef 28.08.2026) → Boss
 *  (einzig verbleibender Ausschlussgrund für ein zonen-/familienpassendes, nicht dungeongebundenes
 *  Monster). */
function nonTrappableReasonKey(m: MonsterDef): string {
  if (m.dungeonOnly || m.id.startsWith(DUNGEON_VARIANT_PREFIX)) return "hunting.picker.reason.dungeon";
  return "hunting.picker.reason.boss";
}

/** Status-Badge einer gestellten/leeren Falle (Layout-Vorgabe #2, Redesign Runde 2): "running" =
 *  Falle läuft (Gebiet gesetzt), "waiting" = kein Gebiet mehr, aber ein frischer Fang liegt vor
 *  (Auto-Erneuern lief ohne Köder/Auto aus), "empty" = kein Gebiet und nichts zu zeigen. Gesperrte
 *  Plätze haben keinen dieser drei Zustände (eigener Zweig in `TrapCard`). */
type TrapBadgeState = "running" | "waiting" | "empty";
function trapBadgeState(trap: HuntTrap): TrapBadgeState {
  // CEO 28.08.2026: ohne Gebiet wartet nichts (Beute liegt bereits im Inventar), also "Leer" — der letzte Fang
  // steht weiter in der Zeile "Letzter Fang". "Fang wartet" nur fuer eine faellige, noch nicht getickte Falle.
  if (trap.zoneId === null) return "empty";
  return trap.remainingMs > 0 ? "running" : "waiting";
}

/** Letzter Fang eines Platzes: Beute-Chips + Gold, „leer ausgegangen", oder „Noch kein Fang"
 *  (Chef-Kritik Runde 2: JEDE Karte zeigt diese Zeile, nicht nur die mit Historie). Bleibt auch
 *  sichtbar, wenn die Falle inzwischen wieder leer ist (Auto-Rebait ohne Köder) —
 *  `HuntTrap.lastCatch`/`lastMissed` sind bewusst unabhängig vom aktuellen `zoneId`. Höchstens
 *  `LAST_CATCH_CHIP_CAP` Beute-Chips (Layout-Vorgabe), Rest als „+n"-Hinweis, Menge als Zahlen-
 *  Badge auf jedem Chip. */
function LastCatchRow({ trap }: { trap: HuntTrap }): JSX.Element {
  const { t, tr } = useI18n();
  if (trap.lastCatch) {
    const c = trap.lastCatch;
    const monster = content.monsters[c.monsterId];
    const src = getMonsterSrc(c.monsterId);
    const shownItems = c.items.slice(0, LAST_CATCH_CHIP_CAP);
    const overflow = c.items.length - shownItems.length;
    return (
      <div className="trap-lastcatch">
        <span className="trap-lastcatch-label muted">{t("hunting.lastCatch")}</span>
        <div className="trap-lastcatch-row">
          <span className="trap-lastcatch-monster">
            {src ? (
              <img loading="lazy" decoding="async" src={src} alt="" className="pixelart trap-lastcatch-img" />
            ) : (
              <span aria-hidden="true">🐾</span>
            )}
            <span>{monster ? tr(monster.name) : c.monsterId}</span>
          </span>
          {(shownItems.length > 0 || c.gold > 0) && (
            <div className="trap-lastcatch-loot">
              {shownItems.map((it) => (
                <span key={it.id} className="trap-lastcatch-chip">
                  <ItemChip itemId={it.id} />
                  {it.qty > 1 && <span className="trap-lastcatch-chip-qty">×{it.qty}</span>}
                </span>
              ))}
              {overflow > 0 && <span className="trap-lastcatch-more muted">+{overflow}</span>}
              {c.gold > 0 && (
                <span className="trap-lastcatch-gold">
                  {GOLD_ICON_URL ? (
                    <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />
                  ) : (
                    "🪙"
                  )}{" "}
                  {formatNum(c.gold)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (trap.lastMissed) {
    return <p className="trap-lastcatch trap-lastcatch--missed muted">{t("hunting.missed")}</p>;
  }
  return <p className="trap-lastcatch trap-lastcatch--empty muted">{t("hunting.noCatchYet")}</p>;
}

/**
 * Kopfzeile der Jagen-Seite (Stahl-Panel, Layout-Vorgabe #1, Redesign Runde 2 28.08.2026 — Chef-
 * Kritik „zwei Drittel sind leer"): links Skill-Name + Stufe + XP-Leiste (unverändert), rechts eine
 * Reihe kleiner Stahl-Kacheln statt der vorherigen Leerfläche: Köder (Sorten, die die GESTELLTEN
 * Fallen gerade verlangen — Köder-Stufen 28.08.2026, `huntZoneBaitId` je aktiver Falle; ohne
 * gestellte Falle default Wurmköder) + Knopf „Köder graben", Fallen x/y, nächster Fallenplatz,
 * Fänge gesamt (`state.stats.huntCatches`).
 */
function HuntHeader({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const skill = content.skills["hunting"];
  const xp = state.skills["hunting"]?.xp ?? 0;
  const level = levelFromXp(xp);
  const xpStart = xpForLevel(level);
  const xpEnd = xpForLevel(level + 1);
  const pct = xpEnd > xpStart ? Math.min(100, Math.max(0, ((xp - xpStart) / (xpEnd - xpStart)) * 100)) : 100;
  const unlockedSlots = huntTrapSlots(state);
  const nextSlotLevel = unlockedSlots < HUNT_TRAP_SLOTS ? HUNT_SLOT_LEVELS[unlockedSlots] : null;

  // Köder-Stufen (Chef-Nachtrag 28.08.2026): welche Sorten die GESTELLTEN Fallen gerade verlangen,
  // eindeutig gemacht (mehrere Fallen können dieselbe Sorte teilen). Keine gestellte Falle ⇒ die
  // Basis-Sorte (Wurmköder) als vertrauter Default, damit die Kachel nie leer wirkt.
  const activeZoneIds = state.huntTraps.map((trp) => trp.zoneId).filter((id): id is string => id !== null);
  const activeBaitIds = Array.from(
    new Set(
      activeZoneIds
        .map((id) => huntZoneDef(content, id))
        .filter((z): z is HuntZoneDef => !!z)
        .map((z) => huntZoneBaitId(z)),
    ),
  );
  const baitIds = activeBaitIds.length > 0 ? activeBaitIds : [BAIT_ITEM_ID];
  const baitEntries = baitIds.map((id) => {
    const item = content.items[id];
    return {
      id,
      count: huntBaitCount(state, id),
      img: getItemImage(id),
      icon: item?.icon ?? BAIT_FALLBACK_ICON,
      name: item ? tr(item.name) : id,
    };
  });

  return (
    <div className="hunt-head">
      <div className="hunt-head-skill">
        <span className="hunt-head-icon" aria-hidden="true">
          {HUNT_SIDEBAR_ICON_URL ? (
            <img loading="lazy" decoding="async" src={HUNT_SIDEBAR_ICON_URL} alt="" className="pixelart" />
          ) : (
            HUNT_SKILL_EMOJI
          )}
        </span>
        <div className="hunt-head-skill-info">
          <div className="hunt-head-title-row">
            <span className="hunt-head-name">{skill ? tr(skill.name) : "Hunting"}</span>
            <span className="hunt-head-lvl">{t("skill.level").replace("{n}", String(level))}</span>
          </div>
          <div className="bar tall hunt-head-bar">
            <div className="bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          <span className="hunt-head-xp muted">
            {Math.floor(pct)}% · {formatNum(xp - xpStart)} / {formatNum(xpEnd - xpStart)}
          </span>
        </div>
      </div>

      <div className="hunt-head-stats">
        <div className="hunt-head-stat hunt-head-stat--bait" title={t("hunting.baitHint")}>
          <span className="hunt-head-stat-label muted">{t("hunting.picker.statBait")}</span>
          <div className="hunt-head-bait-row">
            <span className="hunt-head-stat-value hunt-head-baits">
              {baitEntries.map((b) => (
                <span key={b.id} className="hunt-head-bait-entry" title={b.name}>
                  {b.img ? (
                    <img loading="lazy" decoding="async" src={b.img} alt="" className="pixelart" />
                  ) : (
                    <span aria-hidden="true">{b.icon}</span>
                  )}
                  {formatNum(b.count)}
                </span>
              ))}
            </span>
            <button type="button" className="shop-citadel-btn shop-citadel-btn--sm hunt-head-stat-btn" onClick={() => onNavigate("fishing")}>
              {t("hunting.digBait")}
            </button>
          </div>
        </div>

        <div className="hunt-head-stat">
          <span className="hunt-head-stat-label muted">{t("hunting.section.traps")}</span>
          <span className="hunt-head-stat-value">
            {unlockedSlots}/{HUNT_TRAP_SLOTS}
          </span>
        </div>

        <div className="hunt-head-stat">
          <span className="hunt-head-stat-label muted">{t("hunting.head.nextSlotLabel")}</span>
          <span className="hunt-head-stat-value">
            {nextSlotLevel !== null
              ? t("hunting.head.nextSlotValue").replace("{n}", String(nextSlotLevel))
              : t("hunting.head.nextSlotAll")}
          </span>
        </div>

        <div className="hunt-head-stat">
          <span className="hunt-head-stat-label muted">{t("hunting.head.catchesLabel")}</span>
          <span className="hunt-head-stat-value">{formatNum(state.stats.huntCatches)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Gebietswahl-Modal (Layout-Vorgabe #3, Chef-Auftrag 28.08.2026 — großes zweispaltiges Fenster mit
 * vollen Zonen-Details statt der alten schmalen Klick-sofort-Liste, Redesign Runde 2 (Chef-Kritik
 * „das Modal ist immer noch zu klein"): links eine scrollbare Liste ALLER `content.huntingZones`
 * (nur Auswahl, stellt noch NICHTS), rechts das Detail des gewählten Gebiets (Kulissen-Banner, vier
 * Kennzahl-Kacheln, „Fangbar"-Karten-Raster mit Beute-Chips inkl. Chance-%, aufklappbarer „Nicht
 * fangbar"-Abschnitt). Erst der Fußzeilen-Knopf „Falle stellen" committet (zieht 1 Köder DER
 * ZONEN-SORTE, Engine-Pfad `setHuntTrap`, wie zuvor).
 */
function HuntZonePicker({ slot, onClose }: { slot: number; onClose: () => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const trap = state.huntTraps[slot] as HuntTrap | undefined;
  const allZones = [...(content.huntingZones ?? [])].sort((a, b) => a.levelRequired - b.levelRequired);
  const huntLevel = levelFromXp(state.skills["hunting"]?.xp ?? 0);

  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  // Vorauswahl (Layout-Vorgabe): die Falle hat bereits eine Zone → diese; sonst die höchste
  // WIRKLICH stellbare Zone (volles `huntSetReason` inkl. Köder) → sonst zumindest die höchste
  // freigeschaltete (Gate ohne Köder-Achse, s. `zoneGateReason`) → sonst die erste der Liste. Nur
  // beim ersten Öffnen berechnet (`useState`-Initializer) — danach steuert allein der Klick.
  const [selected, setSelected] = useState<string | null>(() => {
    if (trap?.zoneId) return trap.zoneId;
    const byFull = [...allZones].reverse().find((z) => huntSetReason(state, content, slot, z.zoneId) === "ok");
    if (byFull) return byFull.zoneId;
    const byGate = [...allZones].reverse().find((z) => zoneGateReason(state, content, huntLevel, z.zoneId) === null);
    if (byGate) return byGate.zoneId;
    return allZones[0]?.zoneId ?? null;
  });
  // „Nicht fangbar" startet zugeklappt (Layout-Vorgabe) — je Zone gemerkt, damit ein Zonenwechsel
  // einen einmal aufgeklappten Zustand nicht wegwirft (Muster HuntBook `openRows`).
  const [ntOpenZones, setNtOpenZones] = useState<Set<string>>(() => new Set());

  function confirm(): void {
    if (!selected) return;
    setHuntTrap(state, content, slot, selected, trap?.autoRebait ?? true);
    onClose();
  }

  const selZone = selected ? (allZones.find((z) => z.zoneId === selected) ?? null) : null;
  const selZoneMeta = selZone ? content.zones.find((zz) => zz.id === selZone.zoneId) : undefined;
  const selName = selZoneMeta ? tr(selZoneMeta.name) : (selZone?.zoneId ?? "");
  const selBg = selZone ? getZoneBackgroundCard(selZone.zoneId) : null;
  const selChance = selZone ? huntCatchChance(state, content, selZone.zoneId) : 0;
  const setReason: HuntSetReason = selZone ? huntSetReason(state, content, slot, selZone.zoneId) : "no_slot";
  const canSet = setReason === "ok";
  const candidates = selZone ? huntCandidatesForZone(content, selZone.zoneId) : [];
  const selProgress = selZone ? huntZoneProgress(state, content, selZone.zoneId) : { defeated: 0, total: 0 };
  const nonTrappable = selZone ? huntNonTrappableForZone(content, selZone.zoneId) : [];
  const ntOpen = selZone ? ntOpenZones.has(selZone.zoneId) : false;

  // Köder-Stufen (Chef-Nachtrag 28.08.2026): die konkrete Sorte, die das GEWÄHLTE Gebiet verlangt —
  // Kachel, Bestätigungsknopf und Deaktiviert-Hinweis nennen alle dieselbe Sorte.
  const zoneBaitId = selZone ? huntZoneBaitId(selZone) : BAIT_ITEM_ID;
  const zoneBaitItem = content.items[zoneBaitId];
  const zoneBaitName = zoneBaitItem ? tr(zoneBaitItem.name) : zoneBaitId;
  const zoneBaitImg = getItemImage(zoneBaitId);
  const zoneBaitCount = huntBaitCount(state, zoneBaitId);

  function toggleNt(): void {
    if (!selZone) return;
    const zoneId = selZone.zoneId;
    setNtOpenZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="hzp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hzp-head">
          <span className="hzp-title">{t("hunting.picker.title").replace("{n}", String(slot + 1))}</span>
          <button type="button" className="hzp-close" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </div>

        {allZones.length === 0 ? (
          <p className="muted">{t("hunting.inert")}</p>
        ) : (
          <>
            <div className="hzp-body">
              <div className="hzp-col-list">
                {allZones.map((z) => {
                  const zoneMeta = content.zones.find((zz) => zz.id === z.zoneId);
                  const name = zoneMeta ? tr(zoneMeta.name) : z.zoneId;
                  const bg = getZoneBackgroundCard(z.zoneId);
                  const chance = huntCatchChance(state, content, z.zoneId);
                  const progress = huntZoneProgress(state, content, z.zoneId);
                  const gate = zoneGateReason(state, content, huntLevel, z.zoneId);
                  const isSel = z.zoneId === selected;
                  const zBaitId = huntZoneBaitId(z);
                  const zBaitItem = content.items[zBaitId];
                  const zBaitName = zBaitItem ? tr(zBaitItem.name) : zBaitId;
                  const zBaitCount = huntBaitCount(state, zBaitId);
                  return (
                    <button
                      key={z.zoneId}
                      type="button"
                      className={`hzp-zone-tile${gate ? " locked" : ""}${isSel ? " is-active" : ""}`}
                      style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
                      title={gate ? reasonText(t, gate, z.levelRequired) : undefined}
                      onClick={() => setSelected(z.zoneId)}
                    >
                      <span className="hzp-zone-tile-name">{name}</span>
                      <span className="hzp-zone-tile-meta">
                        {t("skill.levelShort").replace("{n}", String(z.levelRequired))}
                        {" · "}
                        {t("hunting.trapTime").replace("{time}", formatMs(z.trapMs))}
                        {" · "}
                        {t("hunting.catchChance").replace("{pct}", String(Math.round(chance * 100)))}
                      </span>
                      <span className="hzp-zone-tile-meta">
                        {t("hunting.beatenCount")
                          .replace("{n}", String(progress.defeated))
                          .replace("{total}", String(progress.total))}
                      </span>
                      <span className="hzp-zone-tile-meta">
                        {t("hunting.zone.bait")
                          .replace("{bait}", zBaitName)
                          .replace("{n}", String(zBaitCount))}
                      </span>
                      {gate && <span className="hzp-zone-tile-reason">{reasonText(t, gate, z.levelRequired)}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="hzp-col-detail">
                {selZone ? (
                  <>
                    <div
                      className={`hzp-banner${selBg ? " has-bg" : ""}`}
                      style={selBg ? { backgroundImage: `url("${selBg}")` } : undefined}
                    >
                      <span className="hzp-banner-name">{selName}</span>
                    </div>

                    <div className="hzp-stats">
                      <div className="hzp-stat">
                        <span className="hzp-stat-label muted">{t("hunting.picker.statLevel")}</span>
                        <span className="hzp-stat-value">
                          {t("skill.levelShort").replace("{n}", String(selZone.levelRequired))}
                        </span>
                      </div>
                      <div className="hzp-stat">
                        <span className="hzp-stat-label muted">{t("hunting.picker.statTrapTime")}</span>
                        <span className="hzp-stat-value">{formatMs(selZone.trapMs)}</span>
                      </div>
                      <div className="hzp-stat">
                        <span className="hzp-stat-label muted">{t("hunting.picker.statChance")}</span>
                        <span className="hzp-stat-value">{Math.round(selChance * 100)}%</span>
                      </div>
                      <div className="hzp-stat">
                        <span className="hzp-stat-label muted">{t("hunting.picker.statBait")}</span>
                        <span className="hzp-stat-value hzp-stat-value--bait">
                          {zoneBaitImg ? (
                            <img loading="lazy" decoding="async" src={zoneBaitImg} alt="" className="pixelart" />
                          ) : (
                            <span aria-hidden="true">{zoneBaitItem?.icon ?? BAIT_FALLBACK_ICON}</span>
                          )}
                          {t("hunting.zone.baitValue")
                            .replace("{bait}", zoneBaitName)
                            .replace("{n}", String(zoneBaitCount))}
                        </span>
                      </div>
                    </div>

                    <div className="hzp-section">
                      <div className="hzp-section-head">
                        <span className="hzp-section-name">{t("hunting.picker.trappable")}</span>
                        <span className="hzp-section-count muted">
                          {t("hunting.beatenCount")
                            .replace("{n}", String(selProgress.defeated))
                            .replace("{total}", String(selProgress.total))}
                        </span>
                      </div>
                      {candidates.length === 0 ? (
                        <p className="muted hzp-empty">{t("hunting.book.noneHere")}</p>
                      ) : (
                        <div className="hzp-mon-grid">
                          {candidates.map((m) => {
                            const defeated = (state.monsterKills[m.id] ?? 0) >= 1;
                            const src = getMonsterSrc(m.id);
                            const seen = state.seenDrops[m.id] ?? [];
                            const lootSorted = [...m.loot].sort((a, b) => b.chance - a.chance);
                            return (
                              <div key={m.id} className={`hzp-mon-card${defeated ? " is-defeated" : ""}`}>
                                <div className="hzp-mon-card-top">
                                  <div className="hzp-mon-card-img">
                                    {src ? (
                                      <img loading="lazy" decoding="async" src={src} alt="" className="pixelart" />
                                    ) : (
                                      <span aria-hidden="true">🐾</span>
                                    )}
                                  </div>
                                  <div className="hzp-mon-card-info">
                                    <div className="hzp-mon-card-name-row">
                                      <span className={`hunt-book-check${defeated ? " checked" : ""}`} aria-hidden="true">
                                        {defeated ? "✓" : "○"}
                                      </span>
                                      <span className="hzp-mon-card-name">{tr(m.name)}</span>
                                      <span className="hzp-mon-card-lvl muted">
                                        {t("skill.levelShort").replace("{n}", String(m.level))}
                                      </span>
                                    </div>
                                    <span className={`hzp-mon-card-status${defeated ? " defeated" : ""}`}>
                                      {defeated ? t("bestiary.seal.defeated") : t("hunting.picker.undefeatedHint")}
                                    </span>
                                  </div>
                                </div>
                                {(lootSorted.length > 0 || m.gold > 0) && (
                                  <div className="hzp-mon-card-loot">
                                    {lootSorted.map((roll) => (
                                      <HzpLootChip
                                        key={roll.itemId}
                                        itemId={roll.itemId}
                                        discovered={seen.includes(roll.itemId)}
                                        chance={roll.chance}
                                      />
                                    ))}
                                    <HuntGoldRangeChip monster={m} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {nonTrappable.length > 0 && (
                      <div className="hzp-section">
                        <button type="button" className="hzp-nt-head" onClick={toggleNt} aria-expanded={ntOpen}>
                          <span className="hzp-nt-caret">{ntOpen ? "▾" : "▸"}</span>
                          <span className="hzp-section-name">{t("hunting.picker.notTrappable")}</span>
                          <span className="hzp-section-count muted">{nonTrappable.length}</span>
                        </button>
                        {ntOpen && (
                          <div className="hzp-mon-grid">
                            {nonTrappable.map((m) => {
                              const src = getMonsterSrc(m.id);
                              return (
                                <div key={m.id} className="hzp-mon-card hzp-mon-card--nt">
                                  <div className="hzp-mon-card-top">
                                    <div className="hzp-mon-card-img">
                                      {src ? (
                                        <img loading="lazy" decoding="async" src={src} alt="" className="pixelart" />
                                      ) : (
                                        <span aria-hidden="true">🐾</span>
                                      )}
                                    </div>
                                    <div className="hzp-mon-card-info">
                                      <div className="hzp-mon-card-name-row">
                                        <span className="hzp-mon-card-name">{tr(m.name)}</span>
                                        <span className="hzp-mon-card-lvl muted">
                                          {t("skill.levelShort").replace("{n}", String(m.level))}
                                        </span>
                                      </div>
                                      <span className="hzp-mon-card-reason">{t(nonTrappableReasonKey(m))}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="muted">{t("hunting.inert")}</p>
                )}
              </div>
            </div>

            <div className="hzp-footer">
              <span className="hzp-footer-hint muted">{t("hunting.picker.footerHint")}</span>
              <div className="hzp-footer-actions">
                <button
                  type="button"
                  className="btn-iron"
                  disabled={!canSet}
                  title={
                    canSet
                      ? undefined
                      : setReason === "no_bait"
                        ? noBaitText(t, tr, zoneBaitId)
                        : reasonText(t, setReason, selZone?.levelRequired ?? 0)
                  }
                  onClick={confirm}
                >
                  {t("hunting.picker.confirm").replace("{bait}", zoneBaitName)}
                </button>
                <button type="button" className="btn-iron" onClick={onClose}>
                  {t("hunting.picker.cancel")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TrapCard({
  slot,
  unlockLevel,
  unlocked,
  hasAnyZone,
  onRequestPick,
}: {
  slot: number;
  unlockLevel: number;
  unlocked: boolean;
  /** `content.huntingZones` enthält überhaupt mind. ein Gebiet — sonst bleibt „Falle stellen" tot. */
  hasAnyZone: boolean;
  onRequestPick: (slot: number) => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const trap = state.huntTraps[slot] as HuntTrap | undefined;
  const active = !!trap && trap.zoneId !== null;

  if (!trap) {
    // Defensiv (sollte durch `defaultHuntTraps()`/Sanitize nie vorkommen) — kein Absturz auf
    // einem Alt-Save mitten in der Migration.
    return <div className="hunt-trap-card locked" />;
  }

  const zoneDef = trap.zoneId ? huntZoneDef(content, trap.zoneId) : null;
  const zoneMeta = trap.zoneId ? content.zones.find((z) => z.id === trap.zoneId) : undefined;
  const zoneName = zoneMeta ? tr(zoneMeta.name) : (trap.zoneId ?? "");
  const bg = trap.zoneId ? getZoneBackgroundCard(trap.zoneId) : null;

  const pct =
    active && zoneDef && zoneDef.trapMs > 0
      ? Math.min(1, Math.max(0, 1 - trap.remainingMs / zoneDef.trapMs))
      : 0;
  const chance = trap.zoneId ? huntCatchChance(state, content, trap.zoneId) : 0;

  const trapArtState = active ? "set" : trap.lastCatch ? "caught" : "empty";
  const trapArtUrl = getHuntingTrapArt(trapArtState);

  // Köder-Stufen (Chef-Nachtrag 28.08.2026): die Sorte, die DIESE Falle gerade verbraucht — nur
  // relevant, solange ein Gebiet gesetzt ist (sonst gibt es keine Zone, die eine Sorte verlangt).
  const cardBaitId = zoneDef ? huntZoneBaitId(zoneDef) : null;
  const cardBaitItem = cardBaitId ? content.items[cardBaitId] : undefined;
  const cardBaitImg = cardBaitId ? getItemImage(cardBaitId) : null;
  const cardBaitCount = cardBaitId ? huntBaitCount(state, cardBaitId) : 0;
  const cardBaitName = cardBaitItem ? tr(cardBaitItem.name) : (cardBaitId ?? "");

  const badge = unlocked ? trapBadgeState(trap) : null;
  const needsZone = unlocked && !active;

  function openPicker(): void {
    if (hasAnyZone) onRequestPick(slot);
  }

  let cardCls = "hunt-trap-card";
  if (!unlocked) {
    cardCls += " locked";
  } else if (active) {
    cardCls += " active";
    if (bg) cardCls += " has-bg";
  } else {
    cardCls += " needs-zone";
    if (hasAnyZone) cardCls += " clickable";
  }

  const cardStyle = active && bg ? { backgroundImage: `url("${bg}")` } : undefined;

  return (
    <div
      className={cardCls}
      style={cardStyle}
      onClick={needsZone && hasAnyZone ? openPicker : undefined}
      role={needsZone && hasAnyZone ? "button" : undefined}
      tabIndex={needsZone && hasAnyZone ? 0 : undefined}
      onKeyDown={
        needsZone && hasAnyZone
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
              }
            }
          : undefined
      }
    >
      <div className="hunt-trap-topband">
        <span className="hunt-trap-topband-name">
          {t("hunting.trap").replace("{n}", String(slot + 1))}
          {unlocked && active ? ` · ${zoneName}` : ""}
        </span>
        <div className="hunt-trap-topband-right">
          {!unlocked ? (
            <span className="hunt-trap-badge hunt-trap-badge--locked">
              {t("hunting.head.nextSlotValue").replace("{n}", String(unlockLevel))}
            </span>
          ) : (
            <span className={`hunt-trap-badge hunt-trap-badge--${badge}`}>{t(`hunting.badge.${badge}`)}</span>
          )}
          {active && cardBaitId && (
            <span
              className={`hunt-trap-bait-chip${cardBaitCount <= 0 ? " out" : ""}`}
              title={`${cardBaitName}: ${formatNum(cardBaitCount)}`}
            >
              {cardBaitImg ? (
                <img loading="lazy" decoding="async" src={cardBaitImg} alt="" className="hunt-trap-bait-icon pixelart" />
              ) : (
                <span aria-hidden="true">{cardBaitItem?.icon ?? BAIT_FALLBACK_ICON}</span>
              )}
              {formatNum(cardBaitCount)}
            </span>
          )}
        </div>
      </div>

      {!unlocked ? (
        <div className="hunt-trap-state-center">
          <span className="hunt-trap-state-icon" aria-hidden="true">
            {LOCKED_ICON_URL ? (
              <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="locked-icon-img" />
            ) : (
              "🔒"
            )}
          </span>
          <span className="hunt-trap-state-text muted">{t("hunting.lockedHint").replace("{n}", String(unlockLevel))}</span>
        </div>
      ) : (
        <>
          {/* Visuelles Zentrum der Karte: die Fallen-Illustration (empty/set/caught). */}
          <div className="hunt-trap-art">
            {trapArtUrl ? (
              <img loading="lazy" decoding="async" src={trapArtUrl} alt="" className="pixelart" />
            ) : (
              <span aria-hidden="true">🪤</span>
            )}
            {needsZone && <span className="hunt-trap-art-hint">{t("hunting.card.pickZone")}</span>}
          </div>

          <div className="hunt-trap-lower">
            {/* Restzeit + Fangchance in einer Zeile — nur wenn eine Falle tatsächlich gestellt ist. */}
            {active && zoneDef && (
              <div className="hunt-trap-progress-row">
                <div className="hunt-trap-progress-wrap">
                  <div className="bar tall">
                    <div className="bar-fill" style={{ transform: `scaleX(${pct})` }} />
                  </div>
                  <span className="hunt-trap-remaining muted">
                    {t("hunting.remaining").replace("{time}", formatMs(trap.remainingMs))}
                  </span>
                </div>
                <span className="hunt-trap-chance">
                  {t("hunting.catchChance").replace("{pct}", String(Math.round(chance * 100)))}
                </span>
              </div>
            )}

            <LastCatchRow trap={trap} />

            <div className="hunt-trap-footer" onClick={(e) => e.stopPropagation()}>
              {active ? (
                <button className="btn-iron btn-iron--sm" onClick={() => clearHuntTrap(state, slot)}>
                  {t("hunting.clear")}
                </button>
              ) : (
                <button
                  className="btn-iron btn-iron--sm"
                  disabled={!hasAnyZone}
                  title={hasAnyZone ? undefined : t("hunting.inert")}
                  onClick={openPicker}
                >
                  {t("hunting.setTrap")}
                </button>
              )}
              <button
                type="button"
                className={`btn-iron btn-iron--sm hunt-trap-auto${trap.autoRebait ? " is-active" : ""}`}
                title={t("hunting.autoRebait")}
                onClick={() => setHuntAutoRebait(state, slot, !trap.autoRebait)}
              >
                {t("hunting.autoChip")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Beute-Chip im Gebiet-Modal UND im Jagdbuch (Redesign 28.08.2026 Runde 3 — Chef-Kritik „Jagdbuch
 *  sehr simpel und langweilig"): Icon + sichtbare Fangchance (`formatDropPct`, Muster Bestiarium/
 *  Item-Wiki — dieselbe Prozent-Formatierung, unabhängig vom Entdeckt-Status), „???"-Maskierung bis
 *  zum ersten Fund (Muster Bestiarium). Beide Stellen teilen denselben Chip statt zweier Kopien. */
function HzpLootChip({ itemId, discovered, chance }: { itemId: string; discovered: boolean; chance: number }): JSX.Element {
  const { tr } = useI18n();
  const item = content.items[itemId];
  const img = getItemImage(itemId);
  const pct = formatDropPct(chance);

  if (!discovered) {
    return (
      <span className="hzp-loot-chip">
        <span className={`hzp-loot-chip-icon unknown ${rarityClass(item?.rarity)}`} title="???" aria-hidden="true">
          {img && (
            <img loading="lazy" decoding="async" src={img} alt="" className="hzp-loot-chip-img hzp-loot-chip-silhouette pixelart" />
          )}
          <span className="hzp-loot-chip-mark">?</span>
        </span>
        <span className="hzp-loot-chip-pct">{pct}</span>
      </span>
    );
  }

  const name = item ? tr(item.name) : itemId;
  return (
    <span className="hzp-loot-chip">
      <button type="button" className={`hzp-loot-chip-icon ${rarityClass(item?.rarity)}`} title={name} onClick={() => openItemWikiModal(itemId)}>
        {img ? (
          <img loading="lazy" decoding="async" src={img} alt="" className="hzp-loot-chip-img pixelart" />
        ) : (
          <span className="hunt-loot-chip-emoji">{item?.icon ?? "▪"}</span>
        )}
      </button>
      <span className="hzp-loot-chip-pct">{pct}</span>
    </span>
  );
}

/** Gold-Spanne eines Fangs als letzter Beute-Chip (Gebiet-Modal, Chef-Auftrag 28.08.2026): exakt
 *  dieselbe Rechnung wie `grantCatch` (engine/hunting.ts) — Streuungswurf `gold + [0..ceil(gold·0,4)]`,
 *  dann ×`HUNT_LOOT_ROLLS` (fünf Würfe je Fang). Kein Chip, wenn das Monster gar kein Gold trägt
 *  (Muster `LastCatchRow`: `c.gold > 0 &&`) — die meisten Frühzonen-Monster tragen 0. */
function HuntGoldRangeChip({ monster }: { monster: MonsterDef }): JSX.Element | null {
  if (monster.gold <= 0) return null;
  const perCatchMax = monster.gold + Math.ceil(monster.gold * 0.4);
  const min = monster.gold * HUNT_LOOT_ROLLS;
  const max = perCatchMax * HUNT_LOOT_ROLLS;
  return (
    <span className="hzp-gold-chip">
      {GOLD_ICON_URL ? (
        <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />
      ) : (
        "🪙"
      )}
      {min === max ? formatNum(min) : `${formatNum(min)}–${formatNum(max)}`}
    </span>
  );
}

/** Sammelalbum-Karte einer Art im Jagdbuch (Redesign 28.08.2026 Runde 3, Chef-Kritik „sehr simpel
 *  und langweilig") — drei Zustände nach Kampf-/Fang-Historie:
 *  - nie besiegt (`monsterKills` 0): Porträt gesperrt (Schloss-Overlay + Abdunklung), nur Name/
 *    Stufe/Hinweis „Erst im Kampf besiegen" — keine Fangdaten, die es noch nicht geben kann.
 *  - besiegt, aber nie gefangen: Porträt gedämpft (Graustufen), Abzeichen „Noch nie gefangen ·
 *    Erstfang zählt doppelt" statt Fangzähler, XP je Fang informativ sichtbar, Beute-Chips mit
 *    Chance-% + „?"-Maske (Muster `HzpLootChip`, geteilt mit dem Gebiet-Modal).
 *  - mind. 1 Fang: volles Porträt, Fangzähler „×N", XP je Fang, Beute-Chips (teils schon entdeckt). */
function HuntBookMonsterCard({ monster }: { monster: MonsterDef }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const kills = state.monsterKills[monster.id] ?? 0;
  const defeated = kills > 0;
  const catches = state.stats.huntCatchesById?.[monster.id] ?? 0;
  const src = getMonsterSrc(monster.id);
  const seen = state.seenDrops[monster.id] ?? [];
  const lootSorted = [...monster.loot].sort((a, b) => b.chance - a.chance);
  const xpPerCatch = huntCatchXp(monster.xp);

  const stateCls = !defeated ? " hbk-mon-card--locked" : catches === 0 ? " hbk-mon-card--uncaught" : " hbk-mon-card--caught";

  return (
    <div className={`hbk-mon-card${stateCls}`}>
      <div className="hbk-mon-card-top">
        <div className="hbk-mon-portrait">
          {src ? (
            <img loading="lazy" decoding="async" src={src} alt="" className="pixelart hbk-mon-portrait-img" />
          ) : (
            <span aria-hidden="true">🐾</span>
          )}
          {!defeated && (
            <span className="hbk-mon-portrait-lock" aria-hidden="true">
              {LOCKED_ICON_URL ? (
                <img src={LOCKED_ICON_URL} alt="" className="hbk-mon-portrait-lock-img" />
              ) : (
                "🔒"
              )}
            </span>
          )}
        </div>
        <div className="hbk-mon-info">
          <div className="hbk-mon-name-row">
            <span className="hbk-mon-name">{tr(monster.name)}</span>
            <span className="hbk-mon-lvl muted">{t("skill.levelShort").replace("{n}", String(monster.level))}</span>
          </div>
          {!defeated ? (
            <span className="hbk-mon-status hbk-mon-status--locked">{t("hunting.book.needsKill")}</span>
          ) : (
            <div className="hbk-mon-catchrow">
              {catches > 0 ? (
                <span className="hbk-mon-catchcount">×{formatNum(catches)}</span>
              ) : (
                <span className="hbk-mon-firstbadge">{t("hunting.book.neverCaught")}</span>
              )}
              <span className="hbk-mon-xp muted">{t("hunting.book.xpPerCatch").replace("{n}", formatNum(xpPerCatch))}</span>
            </div>
          )}
        </div>
      </div>

      {defeated && (lootSorted.length > 0 || monster.gold > 0) && (
        <div className="hbk-mon-loot">
          {lootSorted.map((roll) => (
            <HzpLootChip key={roll.itemId} itemId={roll.itemId} discovered={seen.includes(roll.itemId)} chance={roll.chance} />
          ))}
          <HuntGoldRangeChip monster={monster} />
        </div>
      )}
    </div>
  );
}

/** Ein Gebiets-Band im Jagdbuch (Redesign Runde 3) — Zonen-Kulisse als Hintergrund (Muster
 *  Fallen-Karte/`.has-bg`), Name/Stufe/Köder/„x/y Arten gefangen" + kleiner Fortschrittsbalken im
 *  Banner, darunter das Karten-Raster der Arten (`HuntBookMonsterCard`, Stufe aufsteigend). Bänder
 *  bleiben IMMER offen (kein zweites Akkordeon-Level mehr — Chef-Kritik „langweilige Tabelle"; ein
 *  echtes Sammelalbum blättert nicht doppelt) — gesperrte Gebiete bleiben trotzdem als Vorschau
 *  sichtbar (Muster BestiaryPage `ZoneBandShell.locked`: gedämpft + Grund-Hinweis), die Arten selbst
 *  tragen ihren eigenen Sperr-/Fang-Zustand unabhängig vom Gebiets-Lock (ein Jagen-stufengesperrtes
 *  Gebiet kann trotzdem längst im Kampf bereiste Arten zeigen). `candidates` = ungefiltert (für die
 *  Band-Kennzahlen), `visible` = nach Filter/Suche (für das Karten-Raster) — leer heißt: nichts
 *  passt, der Elternteil blendet das ganze Band dann aus (s. `HuntBook`). */
function HuntBookZoneBand({
  zone,
  candidates,
  visible,
}: {
  zone: HuntZoneDef;
  candidates: MonsterDef[];
  visible: MonsterDef[];
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const huntLevel = levelFromXp(state.skills["hunting"]?.xp ?? 0);
  const zoneMeta = content.zones.find((zz) => zz.id === zone.zoneId);
  const name = zoneMeta ? tr(zoneMeta.name) : zone.zoneId;
  const bg = getZoneBackgroundCard(zone.zoneId);
  const isOpen = huntZoneIsOpen(state, content, huntLevel, zone.zoneId);
  const gate = zoneGateReason(state, content, huntLevel, zone.zoneId);
  const lockedNote = !isOpen && (gate === "zone_locked" || gate === "level") ? reasonText(t, gate, zone.levelRequired) : null;
  const baitId = huntZoneBaitId(zone);
  const baitItem = content.items[baitId];
  const baitName = baitItem ? tr(baitItem.name) : baitId;
  const caught = candidates.filter((m) => (state.stats.huntCatchesById?.[m.id] ?? 0) > 0).length;
  const total = candidates.length;
  const pct = total > 0 ? (caught / total) * 100 : 0;

  return (
    <section className={`hbk-zone${isOpen ? "" : " locked"}`}>
      <div className="hbk-zone-banner" style={bg ? { backgroundImage: `url("${bg}")` } : undefined}>
        <div className="hbk-zone-banner-row">
          <span className="hbk-zone-name">{name}</span>
          <div className="hbk-zone-meta">
            <span>{t("skill.levelShort").replace("{n}", String(zone.levelRequired))}</span>
            <span>{t("hunting.zone.bait").replace("{bait}", baitName).replace("{n}", String(huntBaitCount(state, baitId)))}</span>
            <span>{t("hunting.book.speciesCount").replace("{n}", String(caught)).replace("{total}", String(total))}</span>
            <span className="bar tall hbk-zone-bar">
              <span className="bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
            </span>
          </div>
        </div>
      </div>

      {lockedNote && (
        <div className="hbk-zone-locked-note">
          <span aria-hidden="true">
            {LOCKED_ICON_URL ? <img src={LOCKED_ICON_URL} alt="" className="ui-icon" loading="lazy" decoding="async" /> : "🔒"}
          </span>
          {lockedNote}
        </div>
      )}

      <div className="hbk-mon-grid">
        {visible.map((m) => (
          <HuntBookMonsterCard key={m.id} monster={m} />
        ))}
      </div>
    </section>
  );
}

/** Jagdbuch (Redesign 28.08.2026 Runde 3, Chef-Kritik „aktuell sehr simpel und langweilig"): kein
 *  Tabellen-Akkordeon mehr, sondern ein Sammelalbum. Die äußere Kopfzeile merkt weiterhin ihren
 *  Auf-/Zugeklappt-Zustand in localStorage (Muster getQueuePanelCollapsed) und zeigt zugeklappt die
 *  bestehende Zusammenfassung („4 Gebiete offen · 12/38 Arten gefangen"). Aufgeklappt: Kopf-
 *  Fortschrittsbalken + vier Stahl-Kacheln (Fänge gesamt/Gebiete offen/seltenster Fund/
 *  Lieblingsfang, Muster `.hunt-head-stat`), ein Alle/Gefangen/Offen-Filter + Namenssuche, dann je
 *  Gebiet ein Kulissen-Band mit seinen Arten-Karten (`HuntBookZoneBand`). Ein einziger Durchlauf
 *  über alle Zonen-Kandidaten berechnet Kopf-Kennzahlen UND Filter-Ergebnis in einem Zug. */
function HuntBook({ zones }: { zones: HuntZoneDef[] }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [open, setOpen] = useState<boolean>(() => !getHuntBookCollapsed());
  const [filter, setFilter] = useState<"all" | "caught" | "open">("all");
  const [search, setSearch] = useState("");
  const huntLevel = levelFromXp(state.skills["hunting"]?.xp ?? 0);

  const openZoneCount = zones.filter((z) => huntZoneIsOpen(state, content, huntLevel, z.zoneId)).length;

  // Ein Durchlauf über alle Zonen/Arten: Kopf-Kennzahlen (Arten gefangen, seltenster Fund via
  // `state.seenDrops`, Lieblingsfang via `state.stats.huntCatchesById`) UND je Zone die sortierte
  // Kandidatenliste (Stufe aufsteigend, Layout-Vorgabe) für die Bänder unten. Bewusst als
  // EXPLIZITE `for`-Schleife statt `.map()`/`.filter()`-Ketten: TS verliert bei Zuweisungen an
  // äußere `let`-Variablen INNERHALB verschachtelter Callback-Funktionen die Verfeinerung des
  // Werts an dieser Stelle (`favorite`/`rarest` würden nach der Kette als "never" statt ihres
  // deklarierten Union-Typs gelesen) — derselbe Rechenweg in einer geteilten Funktionsebene bleibt
  // dagegen sauber typisiert.
  let speciesCaught = 0;
  let speciesTotal = 0;
  let favorite: { monsterId: string; count: number } | null = null;
  let rarest: { itemId: string; chance: number } | null = null;
  const searchTerm = search.trim().toLowerCase();
  const zoneRows: { zone: HuntZoneDef; candidates: MonsterDef[]; visible: MonsterDef[] }[] = [];
  for (const z of zones) {
    const candidates = huntCandidatesForZone(content, z.zoneId).slice().sort((a, b) => a.level - b.level);
    speciesTotal += candidates.length;
    const visible: MonsterDef[] = [];
    for (const m of candidates) {
      const catches = state.stats.huntCatchesById?.[m.id] ?? 0;
      if (catches > 0) {
        speciesCaught++;
        if (!favorite || catches > favorite.count) favorite = { monsterId: m.id, count: catches };
      }
      const seen = state.seenDrops[m.id] ?? [];
      for (const roll of m.loot) {
        if (!seen.includes(roll.itemId)) continue;
        if (!rarest || roll.chance < rarest.chance) rarest = { itemId: roll.itemId, chance: roll.chance };
      }
      if (filter === "caught" && catches === 0) continue;
      if (filter === "open" && catches > 0) continue;
      if (searchTerm && !tr(m.name).toLowerCase().includes(searchTerm)) continue;
      visible.push(m);
    }
    if (visible.length > 0) zoneRows.push({ zone: z, candidates, visible });
  }

  const favMonster = favorite ? content.monsters[favorite.monsterId] : undefined;
  const favSrc = favorite ? getMonsterSrc(favorite.monsterId) : null;

  return (
    <section className="hunt-book-section">
      <button
        type="button"
        className="category-header"
        onClick={() => {
          const next = !open;
          setOpen(next);
          setHuntBookCollapsed(!next);
        }}
        aria-expanded={open}
      >
        <span className="category-caret">{open ? "▾" : "▸"}</span>
        <span className="category-name">{t("hunting.section.book")}</span>
        <span className="category-count muted">{zones.length}</span>
        {!open && zones.length > 0 && (
          <span className="hunt-book-summary muted">
            {" · "}
            {t("hunting.book.summaryZones").replace("{n}", String(openZoneCount))}
            {" · "}
            {t("hunting.book.summarySpecies")
              .replace("{n}", String(speciesCaught))
              .replace("{total}", String(speciesTotal))}
          </span>
        )}
      </button>

      {open && (
        zones.length === 0 ? (
          <p className="muted hunt-book-empty">{t("hunting.book.empty")}</p>
        ) : (
          <div className="hbk-body">
            <div className="hbk-summary">
              <div className="hbk-summary-progress">
                <span>
                  {t("hunting.book.summarySpecies")
                    .replace("{n}", String(speciesCaught))
                    .replace("{total}", String(speciesTotal))}
                </span>
                <div className="bar tall hbk-summary-bar">
                  <div
                    className="bar-fill"
                    style={{ transform: `scaleX(${speciesTotal > 0 ? speciesCaught / speciesTotal : 0})` }}
                  />
                </div>
              </div>

              <div className="hbk-summary-tiles">
                <div className="hunt-head-stat">
                  <span className="hunt-head-stat-label muted">{t("hunting.book.tile.catches")}</span>
                  <span className="hunt-head-stat-value">{formatNum(state.stats.huntCatches)}</span>
                </div>
                <div className="hunt-head-stat">
                  <span className="hunt-head-stat-label muted">{t("hunting.book.tile.zones")}</span>
                  <span className="hunt-head-stat-value">
                    {openZoneCount}/{zones.length}
                  </span>
                </div>
                <div className="hunt-head-stat hbk-tile-wide">
                  <span className="hunt-head-stat-label muted">{t("hunting.book.tile.rarest")}</span>
                  {rarest ? (
                    <span className="hunt-head-stat-value hbk-tile-wrap">
                      <ItemChip itemId={rarest.itemId} showName />
                      <span className="muted">{formatDropPct(rarest.chance)}</span>
                    </span>
                  ) : (
                    <span className="hunt-head-stat-value muted">—</span>
                  )}
                </div>
                <div className="hunt-head-stat hbk-tile-wide">
                  <span className="hunt-head-stat-label muted">{t("hunting.book.tile.favorite")}</span>
                  {favorite ? (
                    <span className="hunt-head-stat-value hbk-tile-wrap">
                      {favSrc ? (
                        <img loading="lazy" decoding="async" src={favSrc} alt="" className="pixelart" />
                      ) : (
                        <span aria-hidden="true">🐾</span>
                      )}
                      {favMonster ? tr(favMonster.name) : favorite.monsterId}
                      <span className="muted">×{formatNum(favorite.count)}</span>
                    </span>
                  ) : (
                    <span className="hunt-head-stat-value muted">—</span>
                  )}
                </div>
              </div>
            </div>

            <div className="hbk-controls">
              <div className="hbk-filter-btns">
                <button
                  type="button"
                  className={`btn-iron btn-iron--sm${filter === "all" ? " is-active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  {t("hunting.book.filter.all")}
                </button>
                <button
                  type="button"
                  className={`btn-iron btn-iron--sm${filter === "caught" ? " is-active" : ""}`}
                  onClick={() => setFilter("caught")}
                >
                  {t("hunting.book.filter.caught")}
                </button>
                <button
                  type="button"
                  className={`btn-iron btn-iron--sm${filter === "open" ? " is-active" : ""}`}
                  onClick={() => setFilter("open")}
                >
                  {t("hunting.book.filter.open")}
                </button>
              </div>
              <input
                type="search"
                className="hbk-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("hunting.book.searchPlaceholder")}
                aria-label={t("hunting.book.searchPlaceholder")}
              />
            </div>

            {zoneRows.length === 0 ? (
              <p className="muted hunt-book-empty">{t("hunting.book.noMatches")}</p>
            ) : (
              <div className="hbk-zones">
                {zoneRows.map((row) => (
                  <HuntBookZoneBand key={row.zone.zoneId} zone={row.zone} candidates={row.candidates} visible={row.visible} />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </section>
  );
}

export function HuntingPage({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  const [pickSlot, setPickSlot] = useState<number | null>(null);

  const unlockedSlots = huntTrapSlots(state);
  const allZones = [...(content.huntingZones ?? [])].sort((a, b) => a.levelRequired - b.levelRequired);
  const hasAnyZone = allZones.length > 0;

  return (
    <div className="hunt-page">
      <HuntHeader onNavigate={onNavigate} />

      {allZones.length === 0 && <p className="muted">{t("hunting.inert")}</p>}

      <div className="hunt-traps">
        {Array.from({ length: HUNT_TRAP_SLOTS }, (_, i) => (
          <TrapCard
            key={i}
            slot={i}
            unlockLevel={HUNT_SLOT_LEVELS[i] ?? 99}
            unlocked={i < unlockedSlots}
            hasAnyZone={hasAnyZone}
            onRequestPick={setPickSlot}
          />
        ))}
      </div>

      <HuntBook zones={allZones} />

      {pickSlot !== null && <HuntZonePicker slot={pickSlot} onClose={() => setPickSlot(null)} />}
    </div>
  );
}
