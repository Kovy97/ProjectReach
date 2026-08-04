import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import type { EliteKillSummary } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getEliteMonsterSrc } from "../monsters";
import { getUiIcon } from "../uiIcons";
import { ItemCell } from "./ItemCell";
import { registerEscCloser } from "../util/escStack";
import { playSfx } from "../util/audio";
import { formatNum } from "../util/format";
import { effectiveFxLevel } from "../util/fxLevel";
import "../styles/champion-defeat.css";

/** Wie lange die Karte ohne Interaktion stehen bleibt, bevor sie sich selbst schließt. */
const AUTO_DISMISS_MS = 6000;

interface CeremonyData extends EliteKillSummary {
  /** Eigene, monoton steigende Ceremony-Instanz-Nummer (React `key`) — trennt einen direkten
   *  Champion→Champion-Übergang (zweiter Kill während die Karte noch steht) sauber: Sparkle/
   *  Einflug-Animation starten dann garantiert neu statt an der laufenden Instanz zu kleben. */
  ceremonySeq: number;
}

/**
 * Champion-Sieg-Zeremonie (Task #325, Chef-Feedback „Nach Elite-Fight komme ich instant zurück zur
 * Zonen-Übersicht — sollte länger sein mit Fanfare und Loot-Übersicht"): löst den kurzen 1,8s-
 * Flourish-Banner ab (Task #318 §1) — jetzt eine echte Beute-Karte mit Champion-Art, Material-
 * Drops, groß hervorgehobenem Unique (+ Suffix-Funkel-Akzent) und der Kopfgeld-Zeile.
 *
 * ── Erkennung (Task #324, Engine-Bericht SAVE_VERSION 74) ─────────────────────────────────────
 * Reiner Primitiv-Selector auf `state.eliteKillSeq` (monotoner Lebenszeit-Zähler, Muster
 * `eliteSpawnSeq`/`lastEliteSpawn`, s. Toasts.tsx): steigt er über den zuletzt gesehenen Wert,
 * liegt in `state.lastEliteKill` die frische Beute-Übersicht des jüngsten Elite-Kills. Baseline-
 * Init NIE aus dem nullbaren Breadcrumb selbst (Pip-P2-Lehre, s. Toasts.tsx JSDoc `seenEliteSpawnSeq`)
 * — `lastEliteKill.seq - 1`, falls beim Mount schon ein (bereits gesehener) Kill im State steht,
 * sonst direkt `eliteKillSeq`. Verhindert, dass ein alter Kill beim Laden eines Spielstands erneut
 * die Zeremonie auslöst. Quittiert wird durch `state.lastEliteKill = null` (DIREKTE Mutation des
 * LiveContext-Objekts — exakt das etablierte Muster von `state.lastEliteSpawn = null` in
 * Toasts.tsx; `eliteKillSeq` selbst bleibt unangetastet, der Zähler ist NIE UI-Schreibziel).
 *
 * NUR die elite-EIGENEN Belohnungen (`drops`/`uniqueItemId`/`bountyTokens`, s. `EliteKillSummary`-
 * JSDoc shared/index.ts) — die Basis-Zonen-Loot-Tabelle des skalierten Monsters (XP/Gold/reguläre
 * Drops) läuft über den normalen Kill-Pfad (`combat.ts`) und wird hier BEWUSST NICHT gezeigt (kein
 * Elite-Kill-Cooldown/`lastKill` im Elite-Pfad, s. `eliteDisplayMonster`-JSDoc in CombatPage.tsx).
 *
 * ── Verhalten (Chef-Spec) ──────────────────────────────────────────────────────────────────────
 * NICHT-blockierend: `.chdef-overlay` selbst ist `pointer-events: none` (deckt den Viewport nur
 * als Flex-Anker ab) — EINZIG `.chdef-card` fängt Klicks. Die Zonen-/Monster-Auswahl bzw. eine
 * bereits nachfolgende Queue-Kampfhandlung bleibt dahinter voll bedienbar, auch während die Karte
 * noch steht (kein Backdrop-Scrim wie bei Dungeon-/Mastery-Zeremonie). Auto-Dismiss nach
 * `AUTO_DISMISS_MS` ODER Klick auf die Karte/Esc (`registerEscCloser("modal", …)`) schließt sofort.
 * `effectiveFxLevel()` (⊗ `prefers-reduced-motion`) gated die Einflug-Animation der Karte, den
 * Impact-Flash UND den Suffix-Funkel-Akzent.
 *
 * ── Content-Drift ──────────────────────────────────────────────────────────────────────────────
 * `content.elites[variantId]` kann fehlen (Content nach dem Kill entfernt/umbenannt) — Name fällt
 * defensiv auf die rohe `variantId` zurück, die Art auf den generischen Platzhalter (kein Absturz).
 *
 * ── Fanfaren-Hook ──────────────────────────────────────────────────────────────────────────────
 * `playSfx("eliteVictory")` (util/audio.ts) — graceful Auto-Discovery analog zum stummen
 * `elite_horn.mp3`-Spawn-Hook: die Datei `assets/audio/elite_victory.mp3` liegt bei diesem Auftrag
 * noch NICHT vor (der Chef liefert sie nach), bis dahin bleibt der Aufruf ein stiller No-op.
 */
export function ChampionDefeatCeremony(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [ceremony, setCeremony] = useState<CeremonyData | null>(null);
  const seenSeqRef = useRef(state.lastEliteKill ? state.lastEliteKill.seq - 1 : state.eliteKillSeq);
  const ceremonySeqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const kill = state.lastEliteKill;
    if (!kill || kill.seq <= seenSeqRef.current) return;
    seenSeqRef.current = kill.seq;
    ceremonySeqRef.current += 1;
    setCeremony({ ...kill, ceremonySeq: ceremonySeqRef.current });
    playSfx("eliteVictory");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCeremony(null), AUTO_DISMISS_MS);
    // Quittieren erlaubt (s. JSDoc oben) — eliteKillSeq selbst bleibt unangetastet.
    state.lastEliteKill = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  function dismiss(): void {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCeremony(null);
  }

  // Esc schließt sofort (Chef-Spec) — "modal"-Priorität wie die übrigen Ceremony-Overlays.
  useEffect(() => {
    if (!ceremony) return;
    return registerEscCloser("modal", dismiss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony]);

  // Ausstehenden Auto-Dismiss-Timer beim (theoretischen) Unmount aufräumen — kein setState nach Unmount.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!ceremony) return <></>;

  const variant = content.elites?.[ceremony.variantId];
  const championName = variant ? tr(variant.name) : ceremony.variantId;
  const championArt = getEliteMonsterSrc(ceremony.variantId, variant?.baseMonsterId ?? null);
  const uniqueItem = ceremony.uniqueItemId ? content.items[ceremony.uniqueItemId] : undefined;
  const tokenIcon = getUiIcon("icon_quest_token");
  const fxLevel = effectiveFxLevel();

  return (
    <div className="chdef-overlay" aria-live="polite">
      {fxLevel === "full" && <div key={`flash-${ceremony.ceremonySeq}`} className="chdef-flash" aria-hidden="true" />}
      <div
        key={ceremony.ceremonySeq}
        className={`chdef-card${fxLevel === "full" ? "" : " fx-no-motion"}`}
        onClick={dismiss}
      >
        <button
          type="button"
          className="chdef-close ds-close-button"
          aria-label={t("combat.close")}
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
        />

        <span className="chdef-eyebrow">{t("combat.championDefeat.eyebrow")}</span>
        <span className="chdef-name">{championName}</span>

        <div className="chdef-portrait-frame" aria-hidden="true">
          {championArt
            ? <img loading="lazy" decoding="async" src={championArt} alt="" className="chdef-portrait pixelart" />
            : <span className="chdef-portrait-ph">⚔</span>}
        </div>

        {uniqueItem && ceremony.uniqueItemId && (
          <div className="chdef-unique">
            <span className="chdef-unique-tag">{t("combat.elite.uniqueLabel")}</span>
            <div className="chdef-unique-frame">
              {ceremony.suffixRolled && (
                <span key={`spark-${ceremony.ceremonySeq}`} className="chdef-unique-spark" aria-hidden="true" />
              )}
              <ItemCell itemId={ceremony.uniqueItemId} />
            </div>
            <span className="chdef-unique-name">{tr(uniqueItem.name)}</span>
          </div>
        )}

        {ceremony.drops.length > 0 && (
          <div className="chdef-materials">
            <span className="chdef-section-label">{t("combat.killSummary.loot")}</span>
            <div className="chdef-materials-grid">
              {ceremony.drops.map((d) => (
                <span key={d.itemId} className="chdef-material-item">
                  <ItemCell itemId={d.itemId} qty={d.qty} />
                </span>
              ))}
            </div>
          </div>
        )}

        {ceremony.bountyTokens > 0 && (
          <div className="chdef-bounty">
            <span className="chdef-bounty-label">{t("combat.championDefeat.bountyPaid")}</span>
            <span className="chdef-bounty-amount">
              {tokenIcon
                ? <img loading="lazy" decoding="async" src={tokenIcon} alt="" className="chdef-bounty-icon" />
                : <span aria-hidden="true">🎟️</span>}
              +{formatNum(ceremony.bountyTokens)}
            </span>
          </div>
        )}

        <span className="chdef-hint">{t("combat.championDefeat.dismissHint")}</span>
      </div>
    </div>
  );
}
