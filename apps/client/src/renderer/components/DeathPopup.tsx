import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getMonsterSrc } from "../monsters";
import { registerEscCloser } from "../util/escStack";
import emblSkull from "../assets/ui/emblem_skull.svg";

/**
 * Todes-Popup (Chef-Wunsch): die Engine heilt nach einer Niederlage still und startet den Kampf
 * automatisch neu (kein Fortschrittsverlust, s. combat.ts onPlayerDefeated) — dadurch merkt man
 * einen Tod im Spiel sonst gar nicht. Rein clientseitig erkannt: Snapshot-Vergleich von
 * `state.stats.deaths` pro Tick (wie Toasts.tsx), KEINE Engine-/Save-Änderung nötig.
 *
 * Gegner-Ermittlung: `state.combat.monsterId` bleibt bei einem NORMALEN Kampf nach dem
 * Auto-Neustart gesetzt (derselbe Gegner) — bei einem Dungeon-Tod wird es dagegen im selben
 * Tick auf null geräumt (Run-Abbruch). Daher wird der Gegner aus dem Snapshot VOR dem
 * Tod-Tick gelesen (`prev.monsterId`), nicht aus dem aktuellen State — das deckt beide Fälle ab.
 *
 * Paragonturm (§7, Welle P2): derselbe Vor-Tick-Snapshot-Trick liefert `prev.paragonFloor`
 * (die Etage, die gerade lief) — `resetParagonOnDeath` räumt `cs.paragonFloor` im selben Tick wie
 * den Tod selbst. War es ein Turm-Tod, blendet das Popup eine ehrliche Zusatzzeile ein
 * ("Zurück auf Etage 1" — die Chef-Leitplanke verlangt explizite Tod-Kommunikation, kein
 * stillschweigendes Zurücksetzen).
 *
 * Dungeon-Runs (Kosmetik-Sweep, T4): exakt derselbe Trick, gespiegelt auf `prev.dungeonId` —
 * `onPlayerDefeated` nullt `cs.dungeonId` im selben Tick wie den Tod (Run-Abbruch, Schlüssel
 * verbraucht), also liest die Zusatzzeile aus dem Vor-Tick-Snapshot. `dungeonId`/`paragonFloor`
 * sind laut shared/index.ts (GameState.combat) nie gleichzeitig gesetzt, daher schließen sich
 * `diedInDungeon`/`diedInParagon` gegenseitig aus — keine Engine-Änderung nötig.
 *
 * Todes-Chronik (Persönlichkeits-Paket „Das Reach führt Buch", §B — design/lore/
 * waechter-stimme-pack.md): der Killer ist HIER bereits zuverlässig bekannt — `deadMonsterId`
 * oben deckt sowohl den Normalfall (Gegner bleibt nach Auto-Neustart gesetzt) als auch Dungeon-/
 * Turm-Tode (Vor-Tick-Snapshot) ab, dieselbe Quelle wie Icon/Name. `content.monsters[id].family`
 * ist aber OPTIONAL im Content-Katalog (~92 von ~118 Monstern getaggt, Stand 2026-07-22) — fehlt
 * sie, greift der dokumentierte `death.chronicle.generic`-Fallback (genau dafür vorgesehen, kein
 * Bug). Kein Engine-/Content-Eingriff nötig, keine Lücke zu melden.
 */
/** Gesamt-Todeszahl, ab der die "many"-Eskalationszeile statt "several" greift (Schwellwerte laut
 *  Lore-Paket bewusst unbeziffert — UI/Balance-Entscheidung, hier dokumentiert). `first` deckt
 *  exakt Tod #1 ab, `several` die Spanne 2–9, `many` ab #10. Exportiert: util/npcVoice.ts (§C
 *  „hohe Todeszahl") nutzt DENSELBEN Schwellwert für die NPC-Weltkommentare — EINE Wahrheit statt
 *  eines zweiten Magic-Number-10 an anderer Stelle. */
export const DEATH_ESCALATION_MANY = 10;

/** Eskalations-Key nach Gesamt-Todeszahl (`state.stats.deaths`), oder `null` unterhalb von 2
 *  Toden UND nicht dem allerersten (kann bei `deaths === 0` z.B. während des Snapshot-Delays
 *  vorkommen — dann zeigt das Popup ohnehin nicht, s. `visible`-Gate unten). */
function deathEscalationKey(totalDeaths: number): string | null {
  if (totalDeaths <= 0) return null;
  if (totalDeaths === 1) return "death.chronicle.first";
  return totalDeaths >= DEATH_ESCALATION_MANY ? "death.chronicle.many" : "death.chronicle.several";
}

export function DeathPopup(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [deadMonsterId, setDeadMonsterId] = useState<string | null>(null);
  const [diedInParagon, setDiedInParagon] = useState(false);
  const [diedInDungeon, setDiedInDungeon] = useState(false);
  const [deathTotal, setDeathTotal] = useState(0);
  const [visible, setVisible] = useState(false);
  const snap = useRef<{
    deaths: number;
    monsterId: string | null;
    paragonFloor: number | null;
    dungeonId: string | null;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const deaths = state.stats.deaths;
    const monsterId = state.combat.monsterId;
    const paragonFloor = state.combat.paragonFloor ?? null;
    const dungeonId = state.combat.dungeonId;
    const prev = snap.current;
    if (prev && deaths > prev.deaths) {
      const fought = prev.monsterId ?? monsterId;
      setDeadMonsterId(fought);
      setDiedInParagon(!!prev.paragonFloor);
      setDiedInDungeon(!!prev.dungeonId);
      setDeathTotal(deaths);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 7000);
    }
    snap.current = { deaths, monsterId, paragonFloor, dungeonId };
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Chef-GO Hotkeys: solange das Popup sichtbar ist, bei der zentralen Escape-Registry anmelden
  // (util/escStack.ts) — Priorität "modal", schließt wie ein Klick auf den Weiter-Button.
  useEffect(() => {
    if (!visible || !deadMonsterId) return;
    return registerEscCloser("modal", () => {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    });
  }, [visible, deadMonsterId]);

  if (!visible || !deadMonsterId) return <></>;

  const monster = content.monsters[deadMonsterId];
  const monsterName = monster ? tr(monster.name) : deadMonsterId;
  const art = getMonsterSrc(deadMonsterId);
  // Todes-Chronik (§B): Familie des Killers → `death.chronicle.<family>`, sonst der generische
  // Fallback (fehlende `family`-Tags im Content-Katalog sind erwartet, s. Datei-Kopfkommentar).
  const chronicleKey = monster?.family ? `death.chronicle.${monster.family}` : "death.chronicle.generic";
  const escalationKey = deathEscalationKey(deathTotal);
  // Fix-Welle CC (Aldric, Befund 2): die generische Beruhigungszeile ("Kein Verlust: Du behältst
  // alles") widersprach sich im Turm mit der "Zurück auf Etage 1"-Zeile darunter — im Turm GEHT
  // tatsächlich etwas verloren (der Etagen-Fortschritt dieses Aufstiegs, resetParagonOnDeath in
  // engine/paragon.ts setzt checkpoint → 0). Wahrheitsgemäß: Ausrüstung/Gold sind so oder so nie
  // betroffen (kein Death-Penalty im Spiel), UND der Prestige-Rekord `best` bleibt unangetastet
  // (Tod senkt ihn nie) — DAS ist die ehrliche Zusicherung. Nur wenn bereits ein Rekord existiert
  // (best > 0) wird er benannt; beim allerersten Versuch (best === 0, noch keine Etage bezwungen)
  // gibt es keinen Rekord zu benennen — dort bleibt die generische Zeile stehen (immer noch wahr,
  // widerspricht dann auch nichts, da kein "das bleibt bestehen" behauptet wird).
  const paragonBest = state.paragon?.best ?? 0;

  const dismiss = (): void => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className="modal-overlay" onClick={dismiss} role="dialog" aria-modal="true">
      <div className="modal death-modal" onClick={(e) => e.stopPropagation()}>
        <div className="death-modal-icon">
          <img loading="lazy" decoding="async" src={art ?? emblSkull} alt="" title={monsterName} className="pixelart" />
        </div>
        <h2 className="death-modal-title">{t("death.title")}</h2>
        {/* Todes-Chronik (Persönlichkeits-Paket „Das Reach führt Buch", §B, v2): ersetzt den
            früheren generischen `death.body`-Satz ("Oh no, you died against: {monster}") durch
            die familien-spezifische Wächter-Zeile — der Killer ist über das Icon (title-Attribut
            oben) weiter identifizierbar, die Chronik-Zeile trägt jetzt den ganzen Ton. */}
        <p className="death-modal-body death-modal-chronicle">{t(chronicleKey)}</p>
        {escalationKey && (
          <p className="death-modal-escalation">{t(escalationKey)}</p>
        )}
        {/* Jorin-Fund (Welle Y): der Popup ordnete den Tod bisher nirgends ein — kapitel-frische
            Charaktere lasen "die Story schickt mich in den Tod" statt der gewollten Lektion
            (stirb → koche/rüste um → komm wieder). Eine ruhige Zeile: kein Fortschrittsverlust,
            konkreter nächster Schritt. */}
        <p className="death-modal-reassurance">
          {diedInParagon && paragonBest > 0
            ? t("paragon.death.reassurance").replace("{best}", String(paragonBest))
            : t("death.reassurance")}
        </p>
        {diedInParagon && (
          <p className="death-modal-paragon-hint">🗼 {t("paragon.death.reset")}</p>
        )}
        {diedInDungeon && (
          <p className="death-modal-paragon-hint">🚪 {t("dungeon.death.reset")}</p>
        )}
        <button className="combat-btn" onClick={dismiss}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
