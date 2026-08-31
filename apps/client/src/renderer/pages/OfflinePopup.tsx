import { useEffect } from "react";
import { content } from "@hearthforge/content";
import { campBoost } from "@hearthforge/engine";
import { ITEM_RARITIES, MAX_OFFLINE_MS } from "@hearthforge/shared";
import type { OfflineSummaryUI } from "../game/GameContext";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum, formatPlaytime, romanLevel } from "../util/format";
import { CampBoostNote } from "../components/CampBoostNote";
import { ItemCell } from "../components/ItemCell";
import { getSidebarIcon } from "../sidebarIcons";
import { getSkillIcon } from "../skillIcons";
import { getUiIcon } from "../uiIcons";
import { getMonsterSrc } from "../monsters";
import { getPetSrc } from "../pets";
import { getCampImage } from "../campArt";
import { registerEscCloser } from "../util/escStack";
import { playSfx } from "../util/audio";
import { useAnimatedNumber } from "../util/useAnimatedNumber";
import emblSkull from "../assets/ui/emblem_skull.svg";
import "../styles/offline-stage.css";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
const ACHIEVEMENT_ICON_URL = getUiIcon("icon_achievement_unlocked");
// Chef-Fund 19.07.: Stern-Emoji im XP-Medaillon obwohl icon_xp längst gebunden ist — die
// QQ-Icon-Welle hatte nur den Kampf-Floater bedient, dieses Popup nicht. Kills analog
// (Schwert-Emoji → Combat-Sidebar-Icon, gleiche Quelle wie die Sidebar).
const XP_ICON_URL = getUiIcon("icon_xp");
// Mira-Set 2026-08-03 (Gap-Sweep Priorität A) — löst die direkten Warn-/Leerlauf-Glyphen unten ab.
const WARNING_ICON_URL = getUiIcon("icon_sys_warning");
const IDLE_ICON_URL = getUiIcon("icon_sys_idle");

/** Erste Stufe ab der ein Fund golden gerahmt wird (>= "rare"). */
const RARE_RANK = ITEM_RARITIES.indexOf("rare");

function rarityRank(itemId: string): number {
  const rarity = content.items[itemId]?.rarity;
  const idx = ITEM_RARITIES.indexOf(rarity ?? "common");
  return idx < 0 ? 0 : idx;
}

// ─── Wächter-Bericht (Persönlichkeits-Paket „Das Reach führt Buch", §A, v2) ─────────────────
// Narrativer Block über dem bestehenden tabellarischen Popup-Teil (der bleibt unverändert): der
// Wächter kommentiert knapp, was während der Abwesenheit geschah. Bausteine + Wahl-Bedingungen
// aus `design/lore/waechter-stimme-pack.md` §A (gesprochenes Register); Reihenfolge nach der
// dortigen Empfehlung §D.4: Tod > Pet > Beute/Gold/Kills > Dauer/Ruhe. `offline.warden.frame`
// ist immer die Kopfzeile, darunter höchstens ZWEI Ereigniszeilen — die Bühne soll ein Blick
// bleiben, kein zweiter Report.
//
// Schwellwerte (Lore-Paket beziffert bewusst nichts, s. §D.5 — UI/Balance-Entscheidung, hier an
// einer Stelle dokumentiert und nachjustierbar):
/** Ab dieser Kill-Zahl gilt eine Abwesenheit als „viele Kills" (kills1/kills2-Variante). */
const WARDEN_KILLS_MANY = 50;
/** Ab dieser Gold-Summe gilt ein Ertrag als „hoher Gold-Ertrag". */
const WARDEN_GOLD_HIGH = 5000;
/** Ab dieser Summe aller Item-Stückzahlen (nicht Sorten) gilt ein Fund als „große Beute". */
const WARDEN_LOOT_MANY = 20;
/** Unterhalb dieser Dauer gilt eine Abwesenheit als „sehr kurz" — die Bühne öffnet ohnehin erst
 *  ab > 60s (s. GameContext.tsx), der Bereich 1–5 Minuten ist die „kaum fort"-Zone. */
const WARDEN_SHORT_MS = 5 * 60 * 1000;
/** „Sehr lang" = der 8h-Offline-Cap wurde erreicht — an die bestehende Engine-Konstante gebunden
 *  statt an eine neue Zahl (dasselbe Kriterium, das `isCapped` weiter unten prüft). */
const WARDEN_LONG_MS = MAX_OFFLINE_MS;

interface WardenLine {
  key: string;
  vars?: Record<string, string>;
}

/**
 * Wählt die Wächter-Bericht-Zeilen unterhalb der `frame`-Kopfzeile (max. 2). Reiner, hookfreier
 * Selektor — kein `t()`/`tr()` hier, die Platzhalter werden erst im Render aufgelöst — damit die
 * Auswahl bei gleichem Summary-Input immer gleich ausfällt (keine `Math.random()`-Varianz).
 */
function pickWardenLines(o: OfflineSummaryUI, diedMonsterName: string | null): WardenLine[] {
  const candidates: WardenLine[] = [];

  // Tier 1 — Tod (höchste Priorität). Nur wenn ein konkreter Gegner bekannt ist; ein Tod ohne
  // bekannten Gegner hat bereits den generischen `ofs-death`-Block im tabellarischen Teil.
  if ((o.deaths ?? 0) > 0 && diedMonsterName) {
    candidates.push({ key: "offline.warden.death", vars: { monster: diedMonsterName } });
  }

  // Tier 2 — Pet (der seltenste Fund im Spiel, s. ofs-pets-section).
  if ((o.petDrops?.length ?? 0) > 0) {
    candidates.push({ key: "offline.warden.pet" });
  }

  // Tier 3 — Beute / Gold / Kills / Patt, in dieser Rangfolge, jeweils nur bei Schwelle.
  const lootQty = Object.values(o.items).reduce((sum, q) => sum + q, 0);
  if (lootQty >= WARDEN_LOOT_MANY) {
    candidates.push({ key: "offline.warden.loot" });
  }
  if (o.gold >= WARDEN_GOLD_HIGH) {
    candidates.push({ key: "offline.warden.gold", vars: { gold: formatNum(o.gold) } });
  }
  if ((o.kills ?? 0) >= WARDEN_KILLS_MANY) {
    // Deterministische Variantenwahl (kein Math.random() pro Render): Kill-Zahl-Parität.
    const variant = (o.kills ?? 0) % 2 === 0 ? "offline.warden.kills1" : "offline.warden.kills2";
    candidates.push({ key: variant, vars: { kills: formatNum(o.kills ?? 0) } });
  }
  if (o.combatStopped && o.combatStopReason === "stalemate") {
    candidates.push({ key: "offline.warden.stalemate" });
  }

  // Tier 4 — Dauer/Ruhe, NUR als Fallback, wenn keine Ereigniszeile oben gegriffen hat.
  if (candidates.length === 0) {
    if (o.ms <= WARDEN_SHORT_MS) {
      candidates.push({ key: "offline.warden.short" });
    } else if (o.ms >= WARDEN_LONG_MS) {
      candidates.push({ key: "offline.warden.long", vars: { time: formatPlaytime(o.ms) } });
    } else {
      // Deterministische Variantenwahl aus der Sekunden-Parität der Abwesenheit.
      const variant = Math.floor(o.ms / 1000) % 2 === 0 ? "offline.warden.quiet1" : "offline.warden.quiet2";
      candidates.push({ key: variant });
    }
  }

  return candidates.slice(0, 2);
}

/** `{key}`-Platzhalter einer aufgelösten `t()`-Zeile ersetzen (dieselbe Konvention wie die
 *  bestehenden `.replace("{...}", …)`-Aufrufe im Rest der Datei, nur für mehrere Platzhalter). */
function applyWardenVars(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), text);
}

/**
 * Beute-Bühne für den Offline-Fortschritt ("was habe ich verpasst?!") — der meistgesehene
 * Einzel-Screen des Spiels, deshalb Citadel-Inszenierung statt Formular-Zettel (Chef-Auftrag).
 * Inhalt ist überwiegend das, was `OfflineSummary` (shared) liefert, PLUS zwei renderer-lokale
 * Zusätze (Welle AA, Welcome-Back-Polish, kein Engine-Eingriff): `realMs`/`emptyReturn` sind
 * UI-only Felder von `OfflineSummaryUI` (GameContext.tsx), und der Stopp-Grund-Hinweis liest
 * `state.lastStop` direkt vom Live-State (persistentes Engine-Feld, aber nicht Teil der Summary).
 * Ein `kills`-Delta wäre thematisch stimmig für die Medaillon-Reihe, ist aber (noch) nicht Teil
 * der Summary (die Engine sammelt `killsBefore` in persistence/index.ts schon für den Todes-
 * Gegner, gibt das Delta aber nicht weiter) — an den CEO für eine Engine-Erweiterung gemeldet,
 * hier bewusst NICHT erfunden. Bis dahin füllen Gold + Gesamt-XP die Medaillon-Reihe.
 */
export function OfflinePopup({
  onNavigate,
}: {
  /** Für den "Zur letzten Fertigkeit"-Sprungbutton der leeren-Rückkehr-Mini-Karte (Task AA-4). */
  onNavigate?: (id: string) => void;
}): JSX.Element | null {
  const { offlineSummary, dismissOffline } = useGameControl();
  const { t, tr } = useI18n();
  // Live-State NUR für die zwei neuen, rein lokalen Ableitungen unten (`lastStop`-Hinweis +
  // Sprung-Ziel der leeren Rückkehr) — beide lesen `state.lastStop`, das NICHT Teil von
  // `OfflineSummary` ist (das transiente `packages/shared`-Feld erfasst nur das Kampf-Pendant
  // `combatStopReason`). Abonniert damit den Pro-Tick-Live-Context, solange die Bühne offen ist —
  // unkritisch, ein einzelnes Modal, kein Hot-Path.
  const state = useGameState();

  // Chef-GO Hotkeys: Escape = "Weiter" (dieselbe Aktion wie der Collect-Button/Backdrop-Klick),
  // solange die Bühne offen ist — Anmeldung bei der zentralen Registry (util/escStack.ts).
  useEffect(() => {
    if (!offlineSummary) return;
    return registerEscCloser("modal", dismissOffline);
  }, [offlineSummary, dismissOffline]);

  // Chef-Sound 2026-07-11: pop_1.wav, wenn sich die Welcome-Back-Bühne öffnet.
  useEffect(() => {
    if (offlineSummary) playSfx("pop");
  }, [offlineSummary]);

  // Welle OO (Chef-GO "UI-Juice Stufe 1", Moment 4 "Odometer" — "Ernte einfahren"-Moment): die
  // Gold-/XP-Summen-Kacheln zählen beim Aufklappen der Bühne sichtbar von 0 hoch statt sofort zu
  // stehen. VOR dem `if (!offlineSummary) return null` unten aufgerufen (Rules of Hooks — die
  // Hooks müssen jeden Render laufen) mit `?? 0` als Ziel, solange keine Summary aktiv ist; sobald
  // eine neue Bühne öffnet, tweent der Wert vom liegengebliebenen 0-Rest auf den echten Betrag.
  // Kills/Achievements bewusst mit (billig, dieselbe Technik) — der Auftrag nennt XP/Gold explizit,
  // die zwei übrigen Medaillons ziehen aus Konsistenzgründen mit.
  const animatedGold = useAnimatedNumber(offlineSummary?.gold ?? 0, 500);
  const animatedXp = useAnimatedNumber(Math.floor(offlineSummary?.xp ?? 0), 500);
  const animatedKills = useAnimatedNumber(offlineSummary?.kills ?? 0, 500);
  const animatedAchievements = useAnimatedNumber(offlineSummary?.achievementsEarned ?? 0, 500);

  if (!offlineSummary) return null;

  const o = offlineSummary;
  // Beute zuerst nach Seltenheit (hoch → niedrig), damit die goldenen Rahmen sofort ins Auge fallen.
  const items = Object.entries(o.items).sort((a, b) => rarityRank(b[0]) - rarityRank(a[0]));
  // codex:2026-08-31T01:18:00+02:00 — Variante 02 „Der Beutetisch“ trennt seltene Funde von
  // der Alltagsbeute. Die bestehende zentrale Seltenheitsrangfolge bleibt dabei maßgeblich.
  const rareItems = items.filter(([id]) => rarityRank(id) >= RARE_RANK);
  const commonItems = items.filter(([id]) => rarityRank(id) < RARE_RANK);
  // XP-Aufschlüsselung je Skill (meiste XP zuerst).
  const skillXp = Object.entries(o.skillXp ?? {}).sort((a, b) => b[1].xp - a[1].xp);

  // Offline-Tod (Chef-Bug-Fix): der Kampf kann während der Abwesenheit an einem Gegner
  // gescheitert und abgebrochen worden sein (z.B. Food alle → kein Auto-Neustart wie im
  // Live-Tick, s. DeathPopup) — ohne diesen Block bekam der Spieler das nie mitgeteilt.
  const deaths = o.deaths ?? 0;
  const diedAgainstId = o.diedAgainst ?? null;
  const diedMonster = diedAgainstId ? content.monsters[diedAgainstId] : null;
  const diedMonsterName = diedMonster ? tr(diedMonster.name) : t("offline.died.unknownFoe");
  const diedMonsterArt = diedAgainstId ? getMonsterSrc(diedAgainstId) : null;
  const combatStopped = o.combatStopped ?? false;
  const combatStopReason = o.combatStopReason ?? null;
  // Dezenter Hinweis nur, wenn der Kampf OHNE Tod endete (Patt-Erkennung) — ein Tod bekommt
  // den prominenten Block oben, keine Doppelmeldung.
  const showStopHint =
    deaths === 0 &&
    combatStopped &&
    combatStopReason === "stalemate";

  // Wächter-Bericht (§A) — nur bei bekanntem Gegner in die Tod-Priorität einspeisen (die
  // "unbekannter Gegner"-Fallback-Phrase von oben passt nicht in die Chronik-Zeile).
  const wardenLines = pickWardenLines(o, diedAgainstId ? diedMonsterName : null);

  // Offline-Cap ehrlich machen (Task AA-1): `o.ms` ist bei langer Abwesenheit auf den 8h-Cap
  // gedeckelt — `realMs` (renderer-seitig aus dem Save-Zeitstempel abgeleitet, s. GameContext.tsx
  // `loadGame`) trägt die tatsächliche Lücke. Nur > `o.ms` heißt "der Cap hat wirklich gegriffen".
  const realMs = o.realMs;
  const isCapped = realMs !== undefined && realMs > o.ms;
  // Task #334 (UI-Welle 2 "Boosts sichtbar"): der Wachturm-Anteil am Offline-Cap war bisher nirgends
  // ausgewiesen — der Cap-Hinweis nannte nur die gedeckelte Dauer, nie WARUM sie höher ist als die
  // Basis 8 h. Derselbe Engine-Lesehook wie `effectiveMaxOfflineMs` (shared), keine zweite Summe.
  const campOfflineBonus = Math.max(0, campBoost(state, content, "offlineCapMs"));

  // Stopp-Grund ausweisen (Task AA-3): `state.lastStop` ist das Skilling-Pendant zu
  // `combatStopReason` oben (Material leer/Inventar voll statt Kampf-Patt) — lebt in der Engine
  // als eigenständiges, PERSISTENTES State-Feld (nicht Teil von `OfflineSummary`), gilt aber
  // genauso als "warum ist gerade nichts passiert"-Auskunft. Per Engine-Invariante (setActiveAction/
  // combat.ts nullen `lastStop` bei jedem Neustart) gilt: gesetzt ⇒ aktuell läuft weder Aktion noch
  // Kampf, exklusiv zu `showStopHint` oben.
  const lastStop = state.lastStop;
  const lastStopAction = lastStop ? content.actions[lastStop.actionId] : null;
  const lastStopSkillId = lastStopAction?.skill ?? null;

  // Leere Rückkehr abfedern (Task AA-4): das Öffnungs-Gate in GameContext.tsx entscheidet bereits,
  // ob dies ein "leere Rückkehr"-Aufruf ist (kein doppeltes Herleiten hier).
  const emptyReturn = o.emptyReturn ?? false;

  // codex:2026-08-31T01:18:00+02:00 — Layoutmerkmale werden ausschließlich aus vorhandenen
  // Summary-Daten abgeleitet. So verschwinden leere Spalten ohne künstliche Platzhalter.
  const achievementIds = o.achievementIds ?? [];
  const hasProgress = skillXp.length > 0 || achievementIds.length > 0;
  const hasCampResults =
    (o.campBuilds?.length ?? 0) > 0 ||
    (o.campRefined?.length ?? 0) > 0 ||
    (o.huntCatches?.length ?? 0) > 0;
  const hasIncident =
    (o.petDrops?.length ?? 0) > 0 || deaths > 0 || showStopHint || Boolean(lastStop);

  return (
    <div className="modal-overlay" onClick={dismissOffline}>
      {/* codex:2026-08-31T01:18:00+02:00 — Produktive Umsetzung des vom Chef gewählten
          Mockups 02: feste Bilanz oben, Ereignisband, dreigeteilter Beutetisch und feste CTA. */}
      <div
        className="offline-stage"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-stage-title"
      >
        <div className="offline-stage-shine" aria-hidden="true" />

        <header className="ofs-summary-bar">
          <div className="ofs-summary-heading">
            <h2 id="offline-stage-title" className="offline-stage-title">{t("offline.title")}</h2>
            <p className="offline-stage-subtitle">{t("offline.stage.subtitle")}</p>
          </div>
          <div className="ofs-summary-stat ofs-summary-stat--duration">
            <strong>{formatPlaytime(o.ms)}</strong>
            <span>{t("offline.stage.awayLabel")}</span>
          </div>
          {o.gold > 0 && (
            <div className="ofs-summary-stat">
              {GOLD_ICON_URL && <img src={GOLD_ICON_URL} alt="" className="ui-icon" />}
              <strong>+{formatNum(Math.round(animatedGold))}</strong>
              <span>{t("stats.gold")}</span>
            </div>
          )}
          {o.xp > 0 && (
            <div className="ofs-summary-stat">
              {XP_ICON_URL && <img src={XP_ICON_URL} alt="" className="ui-icon" />}
              <strong>+{formatNum(Math.round(animatedXp))}</strong>
              <span>{t("offline.stage.totalXp")}</span>
            </div>
          )}
          {(o.kills ?? 0) > 0 && (
            <div className="ofs-summary-stat">
              {getSidebarIcon("combat") && <img src={getSidebarIcon("combat")!} alt="" className="ui-icon" />}
              <strong>{formatNum(Math.round(animatedKills))}</strong>
              <span>{t("combat.session.killsShort")}</span>
            </div>
          )}
          {(o.achievementsEarned ?? 0) > 0 && (
            <div className="ofs-summary-stat">
              {ACHIEVEMENT_ICON_URL && <img src={ACHIEVEMENT_ICON_URL} alt="" className="ui-icon" />}
              <strong>{formatNum(Math.round(animatedAchievements))}</strong>
              <span>{t("offline.stage.achievementsLabel")}</span>
            </div>
          )}
        </header>

        <section className={`ofs-event-ribbon${hasIncident ? " has-incident" : ""}`}>
          <div className="ofs-warden">
            <span className="ofs-warden-mark" aria-hidden="true">✥</span>
            <div>
              <p className="ofs-warden-frame">
                {t("offline.warden.frame").replace("{time}", formatPlaytime(o.ms))}
              </p>
              <div className="ofs-warden-lines">
                {wardenLines.map((line) => (
                  <p key={line.key} className="ofs-warden-line">
                    {applyWardenVars(t(line.key), line.vars)}
                  </p>
                ))}
              </div>
              {isCapped && (
                <p className="offline-stage-cap-note">
                  {t("offline.duration.cappedNote")
                    .replace("{cap}", formatPlaytime(o.ms))
                    .replace("{time}", formatPlaytime(realMs))}
                  {campOfflineBonus > 0 && <><br /><CampBoostNote kind="offlineCapMs" value={campOfflineBonus} t={t} /></>}
                </p>
              )}
            </div>
          </div>

          {hasIncident && (
            <div className="ofs-incidents">
              {o.petDrops?.map((petId, i) => {
                const pet = content.pets[petId];
                const src = getPetSrc(petId);
                return (
                  <div key={`${petId}-${i}`} className="ofs-incident ofs-incident--pet">
                    <span className="ofs-incident-art">
                      {src ? <img loading="lazy" decoding="async" src={src} alt="" /> : <span>{pet?.icon ?? "🐾"}</span>}
                    </span>
                    <span><strong>{t("offline.stage.petsTitle")}</strong><small>{pet ? tr(pet.name) : petId}</small></span>
                  </div>
                );
              })}
              {deaths > 0 && (
                <div className="ofs-incident ofs-incident--danger">
                  <span className="ofs-incident-art"><img src={diedMonsterArt ?? emblSkull} alt="" /></span>
                  <span>
                    <strong>{t("offline.died.title")}</strong>
                    <small>{t("offline.died.body").replace("{monster}", diedMonsterName)}</small>
                    {deaths > 1 && <small>{t("offline.died.count").replace("{count}", String(deaths))}</small>}
                  </span>
                </div>
              )}
              {showStopHint && combatStopReason && (
                <div className="ofs-incident ofs-incident--warning">
                  <span className="ofs-incident-art">{WARNING_ICON_URL && <img src={WARNING_ICON_URL} alt="" />}</span>
                  <small>{t(`offline.combatStopped.${combatStopReason}`)}</small>
                </div>
              )}
              {lastStop && (
                <div className="ofs-incident ofs-incident--warning">
                  <span className="ofs-incident-art">{WARNING_ICON_URL && <img src={WARNING_ICON_URL} alt="" />}</span>
                  <small>
                    {lastStopAction ? `${tr(lastStopAction.name)}: ` : ""}
                    {t(lastStop.reason === "inventory_full" ? "skill.stoppedInventoryFull" : "skill.stoppedNoMaterials")}
                  </small>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="offline-stage-body">
          {emptyReturn ? (
          <div className="ofs-empty">
            <span className="ofs-empty-icon" aria-hidden="true">
              {IDLE_ICON_URL && <img loading="lazy" decoding="async" src={IDLE_ICON_URL} alt="" className="ui-icon" />}
            </span>
            <p className="ofs-empty-text">{t("offline.empty.body")}</p>
            <button
              type="button"
              className="btn-iron ofs-empty-btn"
              onClick={() => {
                dismissOffline();
                onNavigate?.(lastStopSkillId ?? "skills-overview");
              }}
            >
              {t("offline.empty.jumpBtn")}
            </button>
          </div>
          ) : (
            <div className={`ofs-report-grid${hasProgress ? " has-progress" : ""}${items.length > 0 ? " has-loot" : ""}${hasCampResults ? " has-camp" : ""}`}>
              {hasProgress && (
                <aside className="ofs-report-column ofs-report-column--progress">
                  {skillXp.length > 0 && (
                    <section className="ofs-section">
                      <h3 className="ofs-section-title">{t("offline.stage.skillsTitle")}</h3>
                      <div className="ofs-skills">
                        {skillXp.map(([id, g]) => {
                          const skill = content.skills[id];
                          const icon = getSkillIcon(id) ?? getSidebarIcon(id);
                          return (
                            <div key={id} className="ofs-skill-row">
                              <span className="ofs-skill-icon">{icon && <img src={icon} alt="" />}</span>
                              <span className="ofs-skill-name">{skill ? tr(skill.name) : id}</span>
                              <span className="ofs-skill-gain">
                                <span className="ofs-skill-xp">+{formatNum(Math.floor(g.xp))} {t("offline.xpShort")}</span>
                                {g.levels > 0 && <span className="ofs-skill-lvl">+{g.levels} {t("offline.lvlShort")}</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                  {achievementIds.length > 0 && (
                    <section className="ofs-section ofs-achievements">
                      <h3 className="ofs-section-title">{t("offline.stage.achievementsLabel")}</h3>
                      {achievementIds.slice(0, 3).map((id) => {
                        const achievement = content.achievements.find((entry) => entry.id === id);
                        return (
                          <div key={id} className="ofs-achievement-row">
                            {ACHIEVEMENT_ICON_URL && <img src={ACHIEVEMENT_ICON_URL} alt="" />}
                            <strong>{achievement ? tr(achievement.name) : id}</strong>
                          </div>
                        );
                      })}
                      {achievementIds.length > 3 && (
                        <p className="ofs-achievement-more">
                          {t("offline.stage.achievementsAndMore").replace("{n}", String(achievementIds.length - 3))}
                        </p>
                      )}
                    </section>
                  )}
                </aside>
              )}

              {items.length > 0 && (
                <section className="ofs-report-column ofs-report-column--loot">
                  <h3 className="ofs-column-title">{t("offline.items")}</h3>
                  {commonItems.length > 0 && (
                    <div className="ofs-loot-grid">
                      {commonItems.map(([id, qty]) => (
                        <div key={id} className="ofs-loot-cell">
                          <ItemCell itemId={id} qty={qty} className="ofs-loot-item" />
                        </div>
                      ))}
                    </div>
                  )}
                  {rareItems.length > 0 && (
                    <section className="ofs-rare-block">
                      <h4>{t("offline.stage.rare")}</h4>
                      <div className="ofs-loot-grid ofs-loot-grid--rare">
                        {rareItems.map(([id, qty]) => {
                          const item = content.items[id];
                          return (
                            <div key={id} className="ofs-loot-cell is-rare">
                              <ItemCell itemId={id} qty={qty} className="ofs-loot-item" />
                              <span className="ofs-loot-rare-name">{item ? tr(item.name) : id}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </section>
              )}

              {hasCampResults && (
                <aside className="ofs-report-column ofs-report-column--camp">
                  {(o.campBuilds?.length ?? 0) > 0 && (
                    <section className="ofs-section">
                      <h3 className="ofs-section-title">{t("offline.camp.buildsTitle")}</h3>
                      <div className="ofs-skills">
                        {o.campBuilds!.map((b, i) => {
                          const def = (content.campBuildings ?? []).find((d) => d.id === b.buildingId);
                          const art = getCampImage(b.buildingId, b.level);
                          return (
                            <div key={`${b.buildingId}-${b.level}-${i}`} className="ofs-skill-row ofs-camp-row">
                              <span className="ofs-camp-art">{art && <img src={art} alt="" />}</span>
                              <span className="ofs-skill-name">{def ? tr(def.name) : b.buildingId}</span>
                              <span className="ofs-skill-lvl">{t("offline.camp.buildLevel").replace("{n}", romanLevel(b.level))}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                  {(o.campRefined?.length ?? 0) > 0 && (
                    <section className="ofs-section">
                      <h3 className="ofs-section-title">{t("offline.camp.refinedTitle")}</h3>
                      <div className="ofs-loot-grid ofs-loot-grid--small">
                        {o.campRefined!.map((r, i) => (
                          <div key={`${r.buildingId}-${r.itemId}-${i}`} className="ofs-loot-cell">
                            <ItemCell itemId={r.itemId} qty={r.qty} className="ofs-loot-item" />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {(o.huntCatches?.length ?? 0) > 0 && (
                    <section className="ofs-section">
                      <h3 className="ofs-section-title">{t("offline.hunt.title")}</h3>
                      <div className="ofs-skills">
                        {o.huntCatches!.map((h, i) => {
                          const monster = content.monsters[h.monsterId];
                          const icon = getMonsterSrc(h.monsterId);
                          return (
                            <div key={`${h.monsterId}-${i}`} className="ofs-skill-row">
                              <span className="ofs-skill-icon">{icon && <img src={icon} alt="" />}</span>
                              <span className="ofs-skill-name">{monster ? tr(monster.name) : h.monsterId}</span>
                              <span className="ofs-skill-lvl">×{h.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </aside>
              )}
            </div>
          )}
        </div>

        <button type="button" className="btn-iron ofs-collect" onClick={dismissOffline}>
          {t("offline.collect")}
        </button>
      </div>
    </div>
  );
}
