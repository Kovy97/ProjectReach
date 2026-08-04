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

  return (
    <div className="modal-overlay" onClick={dismissOffline}>
      <div className="offline-stage" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="offline-stage-shine" aria-hidden="true" />

        <header className="offline-stage-header">
          <h2 className="offline-stage-title">{t("offline.title")}</h2>
          <p className="offline-stage-subtitle">{t("offline.stage.subtitle")}</p>
          <p className="offline-stage-duration">
            {t("offline.duration").replace("{time}", formatPlaytime(o.ms))}
          </p>
          {isCapped && (
            <p className="offline-stage-cap-note">
              {t("offline.duration.cappedNote")
                .replace("{cap}", formatPlaytime(o.ms))
                .replace("{time}", formatPlaytime(realMs))}
              {campOfflineBonus > 0 && (
                <>
                  {" "}
                  <CampBoostNote kind="offlineCapMs" value={campOfflineBonus} t={t} />
                </>
              )}
            </p>
          )}
        </header>

        {/* Wächter-Bericht (Persönlichkeits-Paket „Das Reach führt Buch", §A) — Erzähler-Block,
            klar vom tabellarischen Teil abgesetzt (Pergament-Ton, dezenter Cinzel-Akzent auf der
            Kopfzeile). `frame` immer, darunter höchstens zwei Ereigniszeilen (pickWardenLines). */}
        <section className="ofs-warden">
          <p className="ofs-warden-frame">
            {t("offline.warden.frame").replace("{time}", formatPlaytime(o.ms))}
          </p>
          {wardenLines.length > 0 && (
            <div className="ofs-warden-lines">
              {wardenLines.map((line) => (
                <p key={line.key} className="ofs-warden-line">
                  {applyWardenVars(t(line.key), line.vars)}
                </p>
              ))}
            </div>
          )}
        </section>

        {/* codex:2026-08-03T00:02:00+02:00 — Der variable Berichtskern liegt in einem eigenen
            Fit-Bereich. Header, Wächterbericht und Einsammeln bleiben feste Anker; die Ergebnis-
            gruppen können sich dazwischen mehrspaltig an die verfügbare Fensterhöhe anpassen. */}
        <div className="offline-stage-body">

        {/* Welle EE (Fenn F1-Offline, "der Drop ist komplett stumm"): Pet-Drops während der
            Abwesenheit sind der seltenste Fund im ganzen Spiel (1/60.000 bis 1/120.000) — bekommen
            deshalb die prominenteste Karte der ganzen Bühne, direkt unter dem Header, vor Tod/Gold/
            XP. `o.petDrops` fehlt/leer, wenn nichts droppte (Welle DD, kein Feld-Zwang). */}
        {o.petDrops && o.petDrops.length > 0 && (
          <section className="ofs-pets-section">
            <h3 className="ofs-pets-title">{t("offline.stage.petsTitle")}</h3>
            <div className="ofs-pets-grid">
              {o.petDrops.map((petId, i) => {
                const pet = content.pets[petId];
                const src = getPetSrc(petId);
                return (
                  <div key={`${petId}-${i}`} className="ofs-pet-cell">
                    <span className="ofs-pet-icon">
                      {src ? (
                        <img loading="lazy" decoding="async" src={src} alt="" className="pixelart" />
                      ) : (
                        <span className="ofs-pet-emoji">{pet?.icon ?? "🐾"}</span>
                      )}
                    </span>
                    <span className="ofs-pet-name">{pet ? tr(pet.name) : petId}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {deaths > 0 && (
          <div className="ofs-death">
            <div className="ofs-death-icon">
              <img
                loading="lazy"
                decoding="async"
                src={diedMonsterArt ?? emblSkull}
                alt=""
                className="pixelart"
              />
            </div>
            <div className="ofs-death-text">
              <h3 className="ofs-death-title">{t("offline.died.title")}</h3>
              <p className="ofs-death-body">
                {t("offline.died.body").replace("{monster}", diedMonsterName)}
              </p>
              {deaths > 1 && (
                <p className="ofs-death-count">
                  {t("offline.died.count").replace("{count}", String(deaths))}
                </p>
              )}
            </div>
          </div>
        )}

        {showStopHint && combatStopReason && (
          <div className="ofs-callout">
            <span className="ofs-callout-icon" aria-hidden="true">
              {WARNING_ICON_URL ? <img loading="lazy" decoding="async" src={WARNING_ICON_URL} alt="" className="ui-icon" /> : "⚠"}
            </span>
            <span>{t(`offline.combatStopped.${combatStopReason}`)}</span>
          </div>
        )}

        {lastStop && (
          <div className="ofs-callout">
            <span className="ofs-callout-icon" aria-hidden="true">
              {WARNING_ICON_URL ? <img loading="lazy" decoding="async" src={WARNING_ICON_URL} alt="" className="ui-icon" /> : "⚠"}
            </span>
            <span>
              {lastStopAction ? `${tr(lastStopAction.name)}: ` : ""}
              {t(
                lastStop.reason === "inventory_full"
                  ? "skill.stoppedInventoryFull"
                  : "skill.stoppedNoMaterials",
              )}
            </span>
          </div>
        )}

        {(o.gold > 0 || o.xp > 0 || (o.kills ?? 0) > 0 || (o.achievementsEarned ?? 0) > 0) && (
          <div className="ofs-medallions">
            {o.gold > 0 && (
              <div className="ofs-medallion">
                <span className="ofs-medallion-icon">
                  {GOLD_ICON_URL
                    ? <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />
                    : "🪙"}
                </span>
                <span className="ofs-medallion-value">+{formatNum(Math.round(animatedGold))}</span>
                <span className="ofs-medallion-label">{t("stats.gold")}</span>
              </div>
            )}
            {o.xp > 0 && (
              <div className="ofs-medallion">
                <span className="ofs-medallion-icon">
                  {XP_ICON_URL
                    ? <img loading="lazy" decoding="async" src={XP_ICON_URL} alt="" className="ui-icon" />
                    : "⭐"}
                </span>
                <span className="ofs-medallion-value">+{formatNum(Math.round(animatedXp))}</span>
                <span className="ofs-medallion-label">{t("offline.stage.totalXp")}</span>
              </div>
            )}
            {(o.kills ?? 0) > 0 && (
              <div className="ofs-medallion">
                <span className="ofs-medallion-icon">
                  {getSidebarIcon("combat")
                    ? <img loading="lazy" decoding="async" src={getSidebarIcon("combat")!} alt="" className="ui-icon" />
                    : "⚔️"}
                </span>
                <span className="ofs-medallion-value">{formatNum(Math.round(animatedKills))}</span>
                {/* killsShort = nacktes Wort („Kills") — combat.kills ist ein „{n}"-Template! */}
                <span className="ofs-medallion-label">{t("combat.session.killsShort")}</span>
              </div>
            )}
            {/* Welle KK (Fenn-Retest, "Offline verdiente Achievements sind lautlos"): Welle LL liefert
                `OfflineSummary.achievementsEarned` (fehlt/0, wenn nichts verdient wurde) — dieselbe
                Medaillon-Optik wie Gold/XP/Kills daneben. */}
            {(o.achievementsEarned ?? 0) > 0 && (
              <div className="ofs-medallion">
                <span className="ofs-medallion-icon">
                  {ACHIEVEMENT_ICON_URL
                    ? <img loading="lazy" decoding="async" src={ACHIEVEMENT_ICON_URL} alt="" className="ui-icon" />
                    : "🏆"}
                </span>
                <span className="ofs-medallion-value">{formatNum(Math.round(animatedAchievements))}</span>
                <span className="ofs-medallion-label">{t("offline.stage.achievementsLabel")}</span>
              </div>
            )}
          </div>
        )}

        {/* Welle MM (Fenn+Pip R3-Fund, "Medaillon nennt nur die Zahl"): `OfflineSummary.achievementIds`
            liegt bereits seit Welle LL bereit, wurde bisher aber nirgends gelesen — die ersten 3
            Namen + „und N weitere", dieselbe Quelle wie der Toasts.tsx-Sammel-Toast
            (content.achievements.find). Eigene Zeile UNTER den Medaillons statt im engen
            Medaillon-Layout selbst (das ist auf kurze Werte ausgelegt, s. ofs-medallion-Geschwister). */}
        {(o.achievementIds?.length ?? 0) > 0 && (
          <p className="ofs-achievement-names muted">
            {(() => {
              const ids = o.achievementIds!;
              const shown = ids.slice(0, 3).map((id) => {
                const ach = content.achievements.find((a) => a.id === id);
                return ach ? tr(ach.name) : id;
              });
              const extra = ids.length - shown.length;
              return extra > 0
                ? `${shown.join(", ")} ${t("offline.stage.achievementsAndMore").replace("{n}", String(extra))}`
                : shown.join(", ");
            })()}
          </p>
        )}

        <div className="offline-stage-results">
        {skillXp.length > 0 && (
          <section className="ofs-section ofs-section--skills">
            <h3 className="ofs-section-title">{t("offline.stage.skillsTitle")}</h3>
            <div className="ofs-skills">
              {skillXp.map(([id, g]) => {
                const skill = content.skills[id];
                // Kampf-Skills (Vitality/Defence/Attack …) haben ihr Icon in getSkillIcon,
                // Sammel-/Verarbeitungs-Skills in getSidebarIcon → beide Quellen versuchen.
                const icon = getSkillIcon(id) ?? getSidebarIcon(id);
                return (
                  <div key={id} className="ofs-skill-row">
                    <span className="ofs-skill-icon">
                      {icon && <img loading="lazy" decoding="async" src={icon} alt="" className="ui-icon" />}
                    </span>
                    <span className="ofs-skill-name">{skill ? tr(skill.name) : id}</span>
                    <span className="ofs-skill-gain">
                      <span className="ofs-skill-xp">+{formatNum(Math.floor(g.xp))} {t("offline.xpShort")}</span>
                      {g.levels > 0 && (
                        <span className="ofs-skill-lvl">+{g.levels} {t("offline.lvlShort")}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Das Lager (0.3.0, Task #361): was New Haven während der Abwesenheit erledigt hat.
            Zwei Quellen aus `OfflineSummary`, beide fehlen ganz, wenn nichts passiert ist —
            `campBuilds` (fertiggestellte Ausbaustufen) und `campRefined` (Ausstoß der
            Veredelungs-Anlagen, `qty` = Stück). Gebäudenamen ausschließlich über den Katalog
            (`content.campBuildings.find`), nie über ID-Literale. Bewusst im bestehenden
            `.ofs-section`-Kachel-Layout, keine eigene Bühnen-Optik. */}
        {(o.campBuilds?.length ?? 0) > 0 && (
          <section className="ofs-section ofs-section--builds">
            <h3 className="ofs-section-title">{t("offline.camp.buildsTitle")}</h3>
            <div className="ofs-skills">
              {o.campBuilds!.map((b, i) => {
                const def = (content.campBuildings ?? []).find((d) => d.id === b.buildingId);
                return (
                  <div key={`${b.buildingId}-${b.level}-${i}`} className="ofs-skill-row">
                    <span className="ofs-skill-name">{def ? tr(def.name) : b.buildingId}</span>
                    <span className="ofs-skill-gain">
                      <span className="ofs-skill-lvl">
                        {t("offline.camp.buildLevel").replace("{n}", romanLevel(b.level))}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(o.campRefined?.length ?? 0) > 0 && (
          <section className="ofs-section ofs-section--refined">
            <h3 className="ofs-section-title">{t("offline.camp.refinedTitle")}</h3>
            <div className="ofs-loot-grid">
              {o.campRefined!.map((r, i) => (
                <div key={`${r.buildingId}-${r.itemId}-${i}`} className="ofs-loot-cell">
                  <ItemCell itemId={r.itemId} qty={r.qty} className="ofs-loot-item" />
                </div>
              ))}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section className="ofs-section ofs-section--loot">
            <h3 className="ofs-section-title">{t("offline.items")}</h3>
            <div className="ofs-loot-grid">
              {items.map(([id, qty]) => {
                const isRare = rarityRank(id) >= RARE_RANK;
                const item = content.items[id];
                return (
                  <div key={id} className={`ofs-loot-cell${isRare ? " is-rare" : ""}`}>
                    <ItemCell itemId={id} qty={qty} className="ofs-loot-item" />
                    {isRare && (
                      <>
                        <span className="ofs-loot-rare-tag">{t("offline.stage.rare")}</span>
                        <span className="ofs-loot-rare-name">{item ? tr(item.name) : id}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        </div>

        {emptyReturn && (
          <div className="ofs-empty">
            <span className="ofs-empty-icon" aria-hidden="true">
              {IDLE_ICON_URL ? <img loading="lazy" decoding="async" src={IDLE_ICON_URL} alt="" className="ui-icon" /> : "💤"}
            </span>
            <p className="ofs-empty-text">{t("offline.empty.body")}</p>
            <button
              type="button"
              className="combat-btn ofs-empty-btn"
              onClick={() => {
                dismissOffline();
                onNavigate?.(lastStopSkillId ?? "skills-overview");
              }}
            >
              {t("offline.empty.jumpBtn")}
            </button>
          </div>
        )}
        </div>

        <button className="combat-btn ofs-collect" onClick={dismissOffline}>
          {t("offline.collect")}
        </button>
      </div>
    </div>
  );
}
