import { useState } from "react";
import { content } from "@hearthforge/content";
import { isZoneUnlocked, levelFromXp, xpForLevel } from "@hearthforge/engine";
import {
  BAIT_ITEM_ID,
  DUNGEON_VARIANT_PREFIX,
  HUNT_SLOT_LEVELS,
  HUNT_TRAPPABLE_FAMILIES,
  HUNT_TRAP_SLOTS,
} from "@hearthforge/shared";
import type { GameState, HuntTrap, HuntZoneDef } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import { getItemImage, rarityClass } from "../items";
import { getMonsterSrc } from "../monsters";
import { getUiIcon } from "../uiIcons";
import { getSidebarIcon } from "../sidebarIcons";
import { SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getZoneBackgroundCard } from "../zoneBackgrounds";
import { getHuntingTrapArt } from "../huntingArt";
import { getHuntBookCollapsed, setHuntBookCollapsed } from "../util/uiPrefs";
import { openItemWikiModal } from "../components/ItemWikiModal";
import {
  clearHuntTrap,
  huntBaitCount,
  huntCatchChance,
  huntSetReason,
  huntTrapSlots,
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

// Boss-Erkennung (Muster/Parität zur PRIVATEN gleichnamigen Hilfsfunktion in
// packages/engine/src/hunting.ts `huntableMonsters` — Bosse bleiben dort dauerhaft ausgeschlossen,
// auch nach dem ersten Kill, erkannt an ihrem `ach_boss_*`-Erfolg). Nicht exportiert → hier einmalig
// aus demselben Content-Signal nachgebaut, rein lesend, damit das Jagdbuch keine Kandidaten zeigt,
// die `huntableMonsters` nie freigeben würde (z.B. `bull_boss` in "pastures").
const BOSS_ACHIEVEMENT_PREFIX = "ach_boss_";
const BOSS_MONSTER_IDS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
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
      !m.dungeonOnly &&
      !m.id.startsWith(DUNGEON_VARIANT_PREFIX) &&
      !BOSS_MONSTER_IDS.has(m.id) &&
      !!m.family &&
      HUNT_TRAPPABLE_FAMILIES.includes(m.family),
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

/** Letzter Fang eines Platzes: Beute-Chips + Gold, oder „leer ausgegangen", oder nichts (noch nie
 *  geworfen). Bleibt auch sichtbar, wenn die Falle inzwischen wieder leer ist (Auto-Rebait ohne
 *  Köder) — `HuntTrap.lastCatch`/`lastMissed` sind bewusst unabhängig vom aktuellen `zoneId`.
 *  Höchstens `LAST_CATCH_CHIP_CAP` Beute-Chips (Layout-Vorgabe), Rest als „+n"-Hinweis. */
function LastCatchRow({ trap }: { trap: HuntTrap }): JSX.Element | null {
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
                <ItemChip key={it.id} itemId={it.id} />
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
  return null;
}

/**
 * Kopfzeile der Jagen-Seite (Stahl-Panel, Layout-Vorgabe #1): links Skill-Name + Stufe + XP-Leiste
 * — dieselbe Rechnung wie die globale Titelzeilen-Leiste (App.tsx `LevelXpBar`), hier aber als
 * eigenständiges Markup, da `LevelXpBar` selbst nicht exportiert ist und ihre `.tb-bar`-Klassen eng
 * an die Topbar-Skalierung (`--tb-scale`) gekoppelt sind. Die frühere eigenständige Skill-Seiten-
 * Kopfzeile (`.skill-head`, skills.css) ist seit ihrer Entfernung toter Code — dieselbe Balken-
 * Sprache (`.bar`/`.bar-fill`/`.bar.tall`, skills.css) lebt aber in JEDER Skill-Karte weiter und
 * wird hier wiederverwendet, statt neue Balken-CSS zu erfinden. Rechts: Köder-Vorrat (Inventar +
 * Lager) + Sekundär-Knopf „Köder graben" (Muster NewHavenPage „Betreten": `onNavigate` zur
 * Zielseite). */
function HuntHeader({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const skill = content.skills["hunting"];
  const xp = state.skills["hunting"]?.xp ?? 0;
  const level = levelFromXp(xp);
  const xpStart = xpForLevel(level);
  const xpEnd = xpForLevel(level + 1);
  const pct = xpEnd > xpStart ? Math.min(100, Math.max(0, ((xp - xpStart) / (xpEnd - xpStart)) * 100)) : 100;
  const baitCount = huntBaitCount(state);
  const baitImg = getItemImage(BAIT_ITEM_ID);

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

      <div className="hunt-head-bait">
        <span className="hunt-bait-count" title={t("hunting.baitHint")}>
          {baitImg ? (
            <img loading="lazy" decoding="async" src={baitImg} alt="" className="pixelart" />
          ) : (
            <span aria-hidden="true">{BAIT_FALLBACK_ICON}</span>
          )}
          {t("hunting.baitCount").replace("{n}", String(baitCount))}
        </span>
        <button type="button" className="shop-citadel-btn" onClick={() => onNavigate("fishing")}>
          {t("hunting.digBait")}
        </button>
      </div>
    </div>
  );
}

/**
 * Gebietswahl-Modal (Layout-Vorgabe #3): kein natives `<select>` mehr — Klick auf „Falle stellen"
 * eines leeren Platzes öffnet dieses kleine Modal (Muster QueueAmountModal: Stahlrahmen, Basalt,
 * klein), listet ALLE `content.huntingZones`, gesperrte Gebiete ausgegraut mit dem Grund aus
 * `huntSetReason`. Auswahl stellt die Falle sofort (zieht 1 Köder, Engine-Pfad `setHuntTrap`).
 */
function HuntZonePicker({ slot, onClose }: { slot: number; onClose: () => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const trap = state.huntTraps[slot] as HuntTrap | undefined;
  const allZones = [...(content.huntingZones ?? [])].sort((a, b) => a.levelRequired - b.levelRequired);

  function pick(zoneId: string): void {
    setHuntTrap(state, content, slot, zoneId, trap?.autoRebait ?? true);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hunt-zone-modal">
        <div className="hunt-zone-modal-head">
          <span className="hunt-zone-modal-title">{t("hunting.pickZone.title")}</span>
          <button type="button" className="hunt-zone-modal-close" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </div>
        {allZones.length === 0 ? (
          <p className="muted">{t("hunting.inert")}</p>
        ) : (
          <div className="hunt-zone-list">
            {allZones.map((z) => {
              const zoneMeta = content.zones.find((zz) => zz.id === z.zoneId);
              const name = zoneMeta ? tr(zoneMeta.name) : z.zoneId;
              const bg = getZoneBackgroundCard(z.zoneId);
              const chance = huntCatchChance(state, content, z.zoneId);
              const progress = huntZoneProgress(state, content, z.zoneId);
              const reason = huntSetReason(state, content, slot, z.zoneId);
              const ok = reason === "ok";
              return (
                <button
                  key={z.zoneId}
                  type="button"
                  className={`hunt-zone-tile${ok ? "" : " locked"}`}
                  style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
                  disabled={!ok}
                  title={ok ? undefined : reasonText(t, reason, z.levelRequired)}
                  onClick={() => pick(z.zoneId)}
                >
                  <span className="hunt-zone-tile-name">{name}</span>
                  <span className="hunt-zone-tile-meta">
                    <span>{t("skill.levelShort").replace("{n}", String(z.levelRequired))}</span>
                    <span>{t("hunting.trapTime").replace("{time}", formatMs(z.trapMs))}</span>
                    <span>{t("hunting.catchChance").replace("{pct}", String(Math.round(chance * 100)))}</span>
                    <span>
                      {t("hunting.beatenCount")
                        .replace("{n}", String(progress.defeated))
                        .replace("{total}", String(progress.total))}
                    </span>
                  </span>
                  {!ok && <span className="hunt-zone-tile-reason">{reasonText(t, reason, z.levelRequired)}</span>}
                </button>
              );
            })}
          </div>
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

  let cardCls = "hunt-trap-card";
  if (!unlocked) cardCls += " locked";
  else if (active) cardCls += " active";

  return (
    <div className={cardCls}>
      <div className="hunt-trap-header">
        <span className="hunt-trap-label">{t("hunting.trap").replace("{n}", String(slot + 1))}</span>
        {!unlocked && (
          <span className="hunt-trap-lv-badge muted">{t("skill.levelShort").replace("{n}", String(unlockLevel))}</span>
        )}
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
        <div className="hunt-trap-body">
          {/* Visuelles Zentrum der Karte: die Fallen-Illustration (empty/set/caught). */}
          <div className="hunt-trap-art">
            {trapArtUrl ? (
              <img loading="lazy" decoding="async" src={trapArtUrl} alt="" className="pixelart" />
            ) : (
              <span aria-hidden="true">🪤</span>
            )}
          </div>

          {/* Zonen-Band: Kulisse + Name, oder „Kein Gebiet" wenn leer. */}
          <div
            className={`hunt-trap-zoneband${bg ? " has-bg" : ""}`}
            style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
          >
            <span className="hunt-trap-zoneband-name">
              {trap.zoneId ? zoneName : t("hunting.noZoneSet")}
            </span>
          </div>

          {/* Restzeit + Fangchance in einer Zeile — nur wenn eine Falle tatsächlich gestellt ist. */}
          {active && zoneDef ? (
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
          ) : (
            <div className="hunt-trap-progress-row hunt-trap-progress-row--empty" />
          )}

          <LastCatchRow trap={trap} />

          <div className="hunt-trap-footer">
            {active ? (
              <button className="btn-iron btn-iron--sm" onClick={() => clearHuntTrap(state, slot)}>
                {t("hunting.clear")}
              </button>
            ) : (
              <button
                className="btn-iron btn-iron--sm"
                disabled={!hasAnyZone}
                title={hasAnyZone ? undefined : t("hunting.inert")}
                onClick={() => onRequestPick(slot)}
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
      )}
    </div>
  );
}

/** Ein Beute-Chip im Jagdbuch: bekannte Items (im Collection-Log, `state.seenDrops[monsterId]`)
 *  sind ein echtes Item-Icon, Klick öffnet das Item-Wiki (Muster BestiaryPage `LootRow`); unbekannte
 *  bleiben eine „???"-Maskierung wie im Bestiarium — kein Spoiler auf noch nie erhaltene Beute. */
function HuntLootChip({ itemId, discovered }: { itemId: string; discovered: boolean }): JSX.Element {
  const { tr } = useI18n();
  const item = content.items[itemId];
  const img = getItemImage(itemId);

  if (!discovered) {
    return (
      <span className="hunt-loot-chip unknown" title="???" aria-hidden="true">
        {img && (
          <img loading="lazy" decoding="async" src={img} alt="" className="hunt-loot-chip-img hunt-loot-chip-silhouette pixelart" />
        )}
        <span className="hunt-loot-chip-mark">?</span>
      </span>
    );
  }

  const name = item ? tr(item.name) : itemId;
  return (
    <button
      type="button"
      className={`hunt-loot-chip ${rarityClass(item?.rarity)}`}
      title={name}
      onClick={() => openItemWikiModal(itemId)}
    >
      {img ? (
        <img loading="lazy" decoding="async" src={img} alt="" className="hunt-loot-chip-img pixelart" />
      ) : (
        <span className="hunt-loot-chip-emoji">{item?.icon ?? "▪"}</span>
      )}
    </button>
  );
}

/** Eine Gebiets-Zeile im Jagdbuch-Akkordeon — startet zugeklappt (Layout-Vorgabe #4). */
function HuntBookZoneRow({ zone, open, onToggle }: { zone: HuntZoneDef; open: boolean; onToggle: () => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const zoneMeta = content.zones.find((zz) => zz.id === zone.zoneId);
  const name = zoneMeta ? tr(zoneMeta.name) : zone.zoneId;
  const chance = huntCatchChance(state, content, zone.zoneId);
  const progress = huntZoneProgress(state, content, zone.zoneId);
  const candidates = huntCandidatesForZone(content, zone.zoneId);

  return (
    <div className="hunt-book-zone">
      <button type="button" className="hunt-book-zone-head" onClick={onToggle} aria-expanded={open}>
        <span className="hunt-book-zone-caret">{open ? "▾" : "▸"}</span>
        <span className="hunt-book-zone-name">{name}</span>
        <span className="hunt-book-zone-meta muted">
          {t("skill.levelShort").replace("{n}", String(zone.levelRequired))}
          {" · "}
          {t("hunting.trapTime").replace("{time}", formatMs(zone.trapMs))}
          {" · "}
          {t("hunting.catchChance").replace("{pct}", String(Math.round(chance * 100)))}
          {" · "}
          {t("hunting.beatenCount").replace("{n}", String(progress.defeated)).replace("{total}", String(progress.total))}
        </span>
      </button>

      {open && (
        candidates.length === 0 ? (
          <p className="muted hunt-book-empty-zone">{t("hunting.book.noneHere")}</p>
        ) : (
          <div className="hunt-book-monsters">
            {candidates.map((m) => {
              const defeated = (state.monsterKills[m.id] ?? 0) >= 1;
              const src = getMonsterSrc(m.id);
              const seen = state.seenDrops[m.id] ?? [];
              const lootSorted = [...m.loot].sort((a, b) => b.chance - a.chance);
              return (
                <div key={m.id} className={`hunt-book-monster${defeated ? " is-defeated" : ""}`}>
                  <div className="hunt-book-monster-img">
                    {src ? (
                      <img loading="lazy" decoding="async" src={src} alt="" className="pixelart" />
                    ) : (
                      <span aria-hidden="true">🐾</span>
                    )}
                  </div>
                  <div className="hunt-book-monster-info">
                    <span className="hunt-book-monster-name">
                      <span className={`hunt-book-check${defeated ? " checked" : ""}`} aria-hidden="true">
                        {defeated ? "✓" : "○"}
                      </span>
                      {tr(m.name)}
                      <span className="hunt-book-monster-status muted">
                        {t(defeated ? "bestiary.seal.defeated" : "hunting.book.undefeated")}
                      </span>
                    </span>
                    {lootSorted.length > 0 && (
                      <div className="hunt-book-monster-loot">
                        {lootSorted.map((roll) => (
                          <HuntLootChip key={roll.itemId} itemId={roll.itemId} discovered={seen.includes(roll.itemId)} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

/** Jagdbuch (Layout-Vorgabe #4): Akkordeon unter dem Fallen-Raster. Die äußere Kopfzeile merkt
 *  ihren Auf-/Zugeklappt-Zustand in localStorage (Muster getQueuePanelCollapsed); die einzelnen
 *  Gebiets-Zeilen darunter starten IMMER zugeklappt (reiner Component-State, nicht persistiert). */
function HuntBook({ zones }: { zones: HuntZoneDef[] }): JSX.Element {
  const { t } = useI18n();
  const [open, setOpen] = useState<boolean>(() => !getHuntBookCollapsed());
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set());

  function toggleRow(zoneId: string): void {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  }

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
      </button>

      {open && (
        zones.length === 0 ? (
          <p className="muted hunt-book-empty">{t("hunting.book.empty")}</p>
        ) : (
          <div className="hunt-book">
            {zones.map((z) => (
              <HuntBookZoneRow key={z.zoneId} zone={z} open={openRows.has(z.zoneId)} onToggle={() => toggleRow(z.zoneId)} />
            ))}
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

      <div className="hunt-section-title">
        <span className="category-name">{t("hunting.section.traps")}</span>
        <span className="category-count muted">
          {unlockedSlots}/{HUNT_TRAP_SLOTS}
        </span>
      </div>

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
