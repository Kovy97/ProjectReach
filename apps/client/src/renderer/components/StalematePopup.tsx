import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getMonsterSrc } from "../monsters";
import { registerEscCloser } from "../util/escStack";
import emblSwords from "../assets/ui/emblem_crossed_swords.svg";

/**
 * Patt-Popup (Sweep-Fix-Welle B, Fix 1 — Dungeon-Bot ERNST 1): `combat.stopReason === "stalemate"`
 * beendete Kämpfe/Dungeon-Läufe/Paragon-Aufstiege bisher KOMPLETT STUMM — kein Toast, kein Popup
 * (Beleg: ui-audit/bot-runs/db-stalemate/41-stop-a.png, Spieler steht grundlos in der Zonenauswahl).
 * Seit dem Wegfall der Dungeon-Level-Locks (25.07., s. combat-is-fundamental) ist ein Patt der
 * STANDARDWEG eines mutigen Unterlevel-Spielers, kein Rand-Fall mehr.
 *
 * Erkennung exakt wie DeathPopup (Snapshot-Vergleich pro Tick), aber am `stopReason`-Feld statt an
 * `stats.deaths` — es gibt keinen Patt-Zähler im State. `startCombat`/`startDungeon` setzen bei
 * jedem neuen Kampf ein FRISCHES `state.combat`-Objekt ohne `stopReason` (also `undefined`);
 * `stopCombat` räumt es beim manuellen Stopp explizit. Der Übergang zu `"stalemate"` (von irgendwas
 * anderem, meist `undefined`) feuert also GENAU EINMAL pro Patt — dieselbe Ein-Schuss-Garantie wie
 * der `deaths`-Zähler beim Tod. Gegner/Dungeon/Turm-Kontext kommt aus dem Vor-Tick-Snapshot
 * (`trackStalemate` in combat.ts nullt `monsterId`/`dungeonId`/`paragonFloor` im SELBEN Tick wie
 * den Stopp selbst — exakt dasselbe Muster wie `onPlayerDefeated`).
 *
 * `stopReason`-Inventar (Typ ist `"stalemate" | "defeated"`, shared/index.ts): `"defeated"` hat
 * bereits ein vorbildliches Popup (DeathPopup, feuert auf den `deaths`-Zähler statt auf
 * `stopReason` direkt — dieselbe Wirkung, da ein Tod IMMER `stopReason = "defeated"` setzt). Ein
 * drittes Literal (`"outOfAmmo"`) ist laut combat.ts-Kommentar (~Z.1812) tot: die Engine setzt es
 * nie mehr, nur das Typ-Literal lebt als Renderer-Brücke. `"stalemate"` war also der einzige
 * WIRKLICH stumme Fall.
 *
 * Turm-Sonderfall: anders als beim Tod (resetParagonOnDeath nullt den Checkpoint auf 0) bricht ein
 * Patt im Turm OHNE Checkpoint-Verlust ab (combat.ts trackStalemate-Kommentar: „wie Verlassen" —
 * nur `cs.paragonFloor` wird geräumt, `state.paragon.checkpoint` bleibt stehen). Die Zusatzzeile
 * ist daher bewusst ein ANDERER Key als beim Tod (`paragon.stalemate.reset`, NICHT
 * `paragon.death.reset`) — sonst würde das Popup einen Etagenverlust behaupten, der nicht passiert.
 * Dungeon-Läufe verlieren dagegen wie beim Tod nichts Stoffliches (keine Schlüssel-Items mehr seit
 * Welle J, dungeon.ts `startDungeon`-JSDoc) — die bestehende Zeile `dungeon.death.reset` beschreibt
 * nur den Run-Abbruch selbst (ihr Wortlaut ist ursachen-neutral), wird hier bewusst mitgenutzt statt
 * eines Duplikat-Keys.
 */
export function StalematePopup(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [monsterId, setMonsterId] = useState<string | null>(null);
  const [inDungeon, setInDungeon] = useState(false);
  const [inParagon, setInParagon] = useState(false);
  const [visible, setVisible] = useState(false);
  const snap = useRef<{
    stopReason: "stalemate" | "defeated" | undefined;
    monsterId: string | null;
    dungeonId: string | null;
    paragonFloor: number | null;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stopReason = state.combat.stopReason;
    const curMonsterId = state.combat.monsterId;
    const curDungeonId = state.combat.dungeonId;
    const curParagonFloor = state.combat.paragonFloor ?? null;
    const prev = snap.current;
    if (prev && prev.stopReason !== "stalemate" && stopReason === "stalemate") {
      setMonsterId(prev.monsterId ?? curMonsterId);
      setInDungeon(!!prev.dungeonId);
      setInParagon(!!prev.paragonFloor);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 7000);
    }
    snap.current = { stopReason, monsterId: curMonsterId, dungeonId: curDungeonId, paragonFloor: curParagonFloor };
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Chef-GO Hotkeys (wie DeathPopup): solange sichtbar, bei der zentralen Escape-Registry anmelden.
  useEffect(() => {
    if (!visible) return;
    return registerEscCloser("modal", () => {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    });
  }, [visible]);

  if (!visible) return <></>;

  const monster = monsterId ? content.monsters[monsterId] : undefined;
  const monsterName = monster ? tr(monster.name) : undefined;
  const art = monsterId ? getMonsterSrc(monsterId) : null;

  const dismiss = (): void => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className="modal-overlay" onClick={dismiss} role="dialog" aria-modal="true">
      <div className="modal death-modal stalemate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="death-modal-icon">
          <img loading="lazy" decoding="async" src={art ?? emblSwords} alt="" title={monsterName} className="pixelart" />
        </div>
        <h2 className="death-modal-title">{t("stalemate.title")}</h2>
        <p className="death-modal-body">{t("offline.combatStopped.stalemate")}</p>
        <p className="death-modal-reassurance">{t("stalemate.reassurance")}</p>
        {inParagon && (
          <p className="death-modal-paragon-hint">🗼 {t("paragon.stalemate.reset")}</p>
        )}
        {inDungeon && (
          <p className="death-modal-paragon-hint">🚪 {t("dungeon.death.reset")}</p>
        )}
        <button className="combat-btn" onClick={dismiss}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
