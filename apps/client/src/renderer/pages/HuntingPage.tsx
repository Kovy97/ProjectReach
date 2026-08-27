import { useState } from "react";
import { content } from "@hearthforge/content";
import { isZoneUnlocked } from "@hearthforge/engine";
import {
  BAIT_ITEM_ID,
  DUNGEON_VARIANT_PREFIX,
  HUNT_SLOT_LEVELS,
  HUNT_TRAPPABLE_FAMILIES,
  HUNT_TRAP_SLOTS,
} from "@hearthforge/shared";
import type { HuntTrap, HuntZoneDef } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import { getItemImage } from "../items";
import { getMonsterSrc } from "../monsters";
import { getUiIcon } from "../uiIcons";
import { getZoneBackgroundCard } from "../zoneBackgrounds";
import { getHuntingTrapArt } from "../huntingArt";
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

function reasonText(t: (key: string) => string, reason: HuntSetReason, levelRequired: number): string {
  if (reason === "level") return t("hunting.reason.level").replace("{n}", String(levelRequired));
  return t(`hunting.reason.${reason}`);
}

/** Letzter Fang eines Platzes: Beute-Chips + Gold, oder „leer ausgegangen", oder nichts (noch nie
 *  geworfen). Bleibt auch sichtbar, wenn die Falle inzwischen wieder leer ist (Auto-Rebait ohne
 *  Köder) — `HuntTrap.lastCatch`/`lastMissed` sind bewusst unabhängig vom aktuellen `zoneId`. */
function LastCatchRow({ trap }: { trap: HuntTrap }): JSX.Element | null {
  const { t, tr } = useI18n();
  if (trap.lastCatch) {
    const c = trap.lastCatch;
    const monster = content.monsters[c.monsterId];
    const src = getMonsterSrc(c.monsterId);
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
          {(c.items.length > 0 || c.gold > 0) && (
            <div className="trap-lastcatch-loot">
              {c.items.map((it) => (
                <ItemChip key={it.id} itemId={it.id} />
              ))}
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

function TrapCard({
  slot,
  unlockLevel,
  unlocked,
  eligibleZones,
}: {
  slot: number;
  unlockLevel: number;
  unlocked: boolean;
  eligibleZones: HuntZoneDef[];
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const trap = state.huntTraps[slot] as HuntTrap | undefined;
  const active = !!trap && trap.zoneId !== null;

  // Leere Karte: lokale Vorauswahl, welches Gebiet als Nächstes bestückt würde — Default das
  // erste zulässige Gebiet. `key={slot}` im Eltern-Grid (HuntingPage) sorgt für frischen State
  // pro Platz, kein Leck zwischen Slots.
  const [pickZone, setPickZone] = useState<string>(() => eligibleZones[0]?.zoneId ?? "");

  if (!trap) {
    // Defensiv (sollte durch `defaultHuntTraps()`/Sanitize nie vorkommen) — kein Absturz auf
    // einem Alt-Save mitten in der Migration.
    return <div className="trap-card locked" />;
  }

  const shownZoneId = active ? trap.zoneId : pickZone || null;
  const zoneDef = shownZoneId ? huntZoneDef(content, shownZoneId) : null;
  const zoneMeta = shownZoneId ? content.zones.find((z) => z.id === shownZoneId) : undefined;
  const zoneName = zoneMeta ? tr(zoneMeta.name) : (shownZoneId ?? "");
  const bg = shownZoneId ? getZoneBackgroundCard(shownZoneId) : null;

  const pct =
    active && zoneDef && zoneDef.trapMs > 0
      ? Math.min(1, Math.max(0, 1 - trap.remainingMs / zoneDef.trapMs))
      : 0;
  const chance = shownZoneId ? huntCatchChance(state, content, shownZoneId) : 0;

  const setReason: HuntSetReason | null =
    !active && shownZoneId ? huntSetReason(state, content, slot, shownZoneId) : null;
  const canSet = setReason === "ok";

  function handleSet(): void {
    if (!shownZoneId) return;
    setHuntTrap(state, content, slot, shownZoneId, true);
  }

  const trapArtState = active ? "set" : trap.lastCatch ? "caught" : "empty";
  const trapArtUrl = getHuntingTrapArt(trapArtState);

  let cardCls = "trap-card";
  if (!unlocked) cardCls += " locked";
  else if (active) cardCls += " active";

  return (
    <div className={cardCls}>
      <div className="trap-header">
        <span className="trap-label">{t("hunting.trap").replace("{n}", String(slot + 1))}</span>
        {!unlocked && (
          <span className="trap-lv-badge muted">{t("skill.levelShort").replace("{n}", String(unlockLevel))}</span>
        )}
      </div>

      <div className="trap-body">
        {!unlocked ? (
          <div className="trap-state-center">
            <span className="trap-state-icon" aria-hidden="true">
              {LOCKED_ICON_URL ? (
                <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="locked-icon-img" />
              ) : (
                "🔒"
              )}
            </span>
            <span className="trap-state-text muted">{t("hunting.lockedHint").replace("{n}", String(unlockLevel))}</span>
          </div>
        ) : (
          <>
            <div
              className={`trap-zone-banner${bg ? " has-bg" : ""}`}
              style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
            >
              {!bg && (
                <span className="trap-banner-art" aria-hidden="true">
                  {trapArtUrl ? (
                    <img loading="lazy" decoding="async" src={trapArtUrl} alt="" className="pixelart" />
                  ) : (
                    "🪤"
                  )}
                </span>
              )}
              {shownZoneId && <span className="trap-banner-name">{zoneName}</span>}
            </div>

            {!active &&
              (eligibleZones.length === 0 ? (
                <p className="muted trap-no-zones">{t("hunting.noZones")}</p>
              ) : (
                <select
                  className="trap-zone-select"
                  value={pickZone}
                  onChange={(e) => setPickZone(e.target.value)}
                >
                  {eligibleZones.map((z) => {
                    const zm = content.zones.find((zz) => zz.id === z.zoneId);
                    return (
                      <option key={z.zoneId} value={z.zoneId}>
                        {(zm ? tr(zm.name) : z.zoneId)} · {t("skill.levelShort").replace("{n}", String(z.levelRequired))}
                      </option>
                    );
                  })}
                </select>
              ))}

            {shownZoneId && zoneDef && (
              <span className="trap-meta muted">
                {t("hunting.trapTime").replace("{time}", formatMs(zoneDef.trapMs))}
                {" · "}
                {t("hunting.catchChance").replace("{pct}", String(Math.round(chance * 100)))}
              </span>
            )}

            {active && (
              <div className="trap-progress-wrap">
                <div className="bar tall">
                  <div className="bar-fill" style={{ transform: `scaleX(${pct})` }} />
                </div>
                <span className="trap-remaining muted">
                  {t("hunting.remaining").replace("{time}", formatMs(trap.remainingMs))}
                </span>
              </div>
            )}

            {active && (
              <label className="trap-autorebait">
                <input
                  type="checkbox"
                  checked={trap.autoRebait}
                  onChange={(e) => setHuntAutoRebait(state, slot, e.target.checked)}
                />
                <span>{t("hunting.autoRebait")}</span>
              </label>
            )}

            <LastCatchRow trap={trap} />

            <div className="trap-actions">
              {active ? (
                <button className="btn-iron" onClick={() => clearHuntTrap(state, slot)}>
                  {t("hunting.clear")}
                </button>
              ) : (
                <button
                  className="btn-iron"
                  disabled={!canSet}
                  title={setReason && setReason !== "ok" ? reasonText(t, setReason, zoneDef?.levelRequired ?? 0) : undefined}
                  onClick={handleSet}
                >
                  {t("hunting.setTrap")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Jagdbuch: je Gebiet Stufe/Fallenzeit/Fangchance + fangbare Monster mit Häkchen „besiegt"
 *  (`monsterKills ≥ 1`) und ihren Beutezeilen (Klick auf einen Beute-Chip öffnet das Item-Wiki
 *  wie überall, `ItemChip` erledigt das bereits). */
function HuntBook({ zones }: { zones: HuntZoneDef[] }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  if (zones.length === 0) {
    return <p className="muted hunt-book-empty">{t("hunting.book.empty")}</p>;
  }

  return (
    <div className="hunt-book">
      {zones.map((z) => {
        const zoneMeta = content.zones.find((zz) => zz.id === z.zoneId);
        const name = zoneMeta ? tr(zoneMeta.name) : z.zoneId;
        const chance = huntCatchChance(state, content, z.zoneId);
        const candidates = huntCandidatesForZone(content, z.zoneId);

        return (
          <div key={z.zoneId} className="hunt-book-zone">
            <div className="hunt-book-zone-head">
              <span className="hunt-book-zone-name">{name}</span>
              <span className="hunt-book-zone-meta muted">
                {t("skill.levelShort").replace("{n}", String(z.levelRequired))}
                {" · "}
                {t("hunting.trapTime").replace("{time}", formatMs(z.trapMs))}
                {" · "}
                {t("hunting.catchChance").replace("{pct}", String(Math.round(chance * 100)))}
              </span>
            </div>

            {candidates.length === 0 ? (
              <p className="muted hunt-book-empty-zone">{t("hunting.book.noneHere")}</p>
            ) : (
              <div className="hunt-book-monsters">
                {candidates.map((m) => {
                  const defeated = (state.monsterKills[m.id] ?? 0) >= 1;
                  const src = getMonsterSrc(m.id);
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
                        </span>
                        {lootSorted.length > 0 && (
                          <div className="hunt-book-monster-loot">
                            {lootSorted.map((roll) => (
                              <ItemChip key={roll.itemId} itemId={roll.itemId} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HuntingPage(): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  const [trapsOpen, setTrapsOpen] = useState(true);
  const [bookOpen, setBookOpen] = useState(true);

  const unlockedSlots = huntTrapSlots(state);
  const baitCount = huntBaitCount(state);
  const baitImg = getItemImage(BAIT_ITEM_ID);

  const allZones = [...(content.huntingZones ?? [])].sort((a, b) => a.levelRequired - b.levelRequired);
  const eligibleZones = allZones.filter(
    (z) => isZoneUnlocked(state, content, z.zoneId) && huntableMonsters(state, content, z.zoneId).length > 0,
  );

  return (
    <div className="hunt-page">
      {/* Kopfbox entfernt (Muster FarmPage/SlayerPage): Name + Level stehen bereits oben in der
          Title-Bar (content-header). */}
      <div className="action-categories">
        {/* ── Section 1: Fallen ─────────────────────────────────────── */}
        <section>
          <button className="category-header" onClick={() => setTrapsOpen((o) => !o)} aria-expanded={trapsOpen}>
            <span className="category-caret">{trapsOpen ? "▾" : "▸"}</span>
            <span className="category-name">{t("hunting.section.traps")}</span>
            <span className="category-count muted">
              {unlockedSlots}/{HUNT_TRAP_SLOTS}
            </span>
          </button>

          {trapsOpen && (
            <div className="farm-section-content">
              <div className="hunt-info-bar">
                <span className="hunt-bait-count">
                  {baitImg ? (
                    <img loading="lazy" decoding="async" src={baitImg} alt="" className="pixelart" />
                  ) : (
                    <span aria-hidden="true">{BAIT_FALLBACK_ICON}</span>
                  )}
                  {t("hunting.baitCount").replace("{n}", String(baitCount))}
                </span>
                <span className="muted">{t("hunting.baitHint")}</span>
              </div>

              {allZones.length === 0 && (
                <p className="muted">{t("hunting.inert")}</p>
              )}

              <div className="hunt-traps">
                {Array.from({ length: HUNT_TRAP_SLOTS }, (_, i) => (
                  <TrapCard
                    key={i}
                    slot={i}
                    unlockLevel={HUNT_SLOT_LEVELS[i] ?? 99}
                    unlocked={i < unlockedSlots}
                    eligibleZones={eligibleZones}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Section 2: Jagdbuch ───────────────────────────────────── */}
        <section>
          <button className="category-header" onClick={() => setBookOpen((o) => !o)} aria-expanded={bookOpen}>
            <span className="category-caret">{bookOpen ? "▾" : "▸"}</span>
            <span className="category-name">{t("hunting.section.book")}</span>
            <span className="category-count muted">{allZones.length}</span>
          </button>

          {bookOpen && <HuntBook zones={allZones} />}
        </section>
      </div>
    </div>
  );
}
