import { useEffect, useRef, useState, type CSSProperties } from "react";
import { content } from "@hearthforge/content";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getDungeonBackground } from "../dungeonBackgrounds";
import { ItemCell } from "./ItemCell";
import { rarityRank } from "../items";
import { registerEscCloser } from "../util/escStack";
import { formatNum } from "../util/format";
import { effectiveFxLevel } from "../util/fxLevel";
import "../styles/dungeon-clear-ceremony.css";

interface ClearData {
  dungeonId: string;
  firstClear: boolean;
  gold: number;
  xp: number;
  loot: Array<{ itemId: string; qty: number }>;
  /** Welle PP (Truhen-Enthüllung): monoton je Ceremony-Instanz — als React `key` auf die Beute-
   *  Enthüllung gesetzt, damit ein (seltener) direkter Ceremony→Ceremony-Übergang OHNE
   *  zwischenzeitliches `dismiss()` (kein DOM-Unmount der äußeren Karte, s. JSDoc unten am
   *  `ceremonySeqRef`) den Chest-Pop + Stagger + Skip-Zustand trotzdem sauber zurücksetzt. */
  seq: number;
}

/**
 * Truhen-Enthüllung (Welle PP, Antizipation-Moment 2): Beute erscheint NICHT mehr instant —
 * ein Truhen-Symbol "klappt auf" (Chest-Pop, ~500ms), danach erscheinen die Items gestaffelt
 * (~100ms versetzt, scale-in), aufsteigend nach Seltenheit sortiert (Dramaturgie: Häufiges
 * zuerst, der seltenste Fund als Finale). Ein Klick auf die Beute-Fläche zeigt sofort alles
 * (Vielfahrer-Respekt) — bei `fxLevel: "off"`/`prefers-reduced-motion` startet die Enthüllung
 * direkt im "alles sichtbar"-Zustand (identisch zum alten instant-Verhalten vor dieser Welle).
 */
function DungeonLootReveal({
  loot,
  t,
}: {
  loot: Array<{ itemId: string; qty: number }>;
  t: (key: string) => string;
}): JSX.Element {
  // Aufsteigend nach Seltenheit (common zuerst, Jackpot zuletzt) — dieselbe Rang-Quelle wie die
  // Inventar-/Bank-Sortierung (items.ts `rarityRank`), keine zweite Tabelle.
  const sorted = [...loot].sort(
    (a, b) => rarityRank(content.items[a.itemId]?.rarity) - rarityRank(content.items[b.itemId]?.rarity),
  );
  const [skip, setSkip] = useState(() => effectiveFxLevel() === "off");

  return (
    <div className="dcc-loot">
      <div className="dcc-loot-title">{t("dungeon.clear.lootTitle")}</div>
      {/* Sweep-Fix-Welle B, Fix 2d (Dungeon-Bot KLEIN 6): war das 🧰-Emoji (per CSS ::before-content)
          als Truhen-Symbol gedacht — rendert unter der Windows-Emoji-Schrift knallpink statt als
          Werkzeugkasten/Truhe (kein passendes Chest-Icon in getUiIcon-Bestand, s. uiIcons.ts —
          geprüft, keins vorhanden). Dezentes Inline-SVG statt Emoji, wie von der Sperrzonen-Regel
          "kein Rarity-Glow, aber auch kein Emoji-Roulette" gefordert. */}
      {!skip && (
        <div className="dcc-chest" aria-hidden="true">
          <svg className="dcc-chest-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 30 Q8 14 32 14 Q56 14 56 30 L56 32 L8 32 Z" fill="#a5703a" stroke="#3a2412" strokeWidth="2" />
            <rect x="8" y="30" width="48" height="24" rx="3" fill="#8a5a2b" stroke="#3a2412" strokeWidth="2" />
            <rect x="6" y="28" width="52" height="7" fill="#d8c06a" stroke="#3a2412" strokeWidth="1.5" />
            <rect x="29" y="33" width="6" height="9" rx="1.5" fill="#3a2412" />
          </svg>
        </div>
      )}
      <div
        className={`dcc-loot-grid${skip ? " dcc-loot-grid--skip" : ""}`}
        onClick={() => setSkip(true)}
      >
        {sorted.map((l, i) => (
          <span key={l.itemId} className="dcc-loot-item" style={{ "--i": i } as CSSProperties}>
            <ItemCell itemId={l.itemId} qty={l.qty} />
          </span>
        ))}
      </div>
      {!skip && sorted.length > 1 && (
        <div className="dcc-loot-skiphint muted">{t("dungeon.clear.skipHint")}</div>
      )}
    </div>
  );
}

/**
 * Clear-Zeremonie (Dungeon-Rework-Spec §5.6.4, GO'd): würdiger Abschluss-Moment beim Dungeon-Clear —
 * Dungeon-Name, "BEZWUNGEN", Beute-Showcase, Erst-Clear-Badge. Mirrors das MasteryCeremony-/
 * PetCelebration-Muster (Snapshot-Vergleich pro Tick, KEIN Engine-/Save-Eingriff).
 *
 * Erkennung: `combat.ts onEnemyDefeated` nullt `dungeonId`+`monsterId` IM SELBEN Tick, in dem
 * `grantDungeonRewards` die Belohnungen vergibt (`endDungeon` danach) — CombatPage schaltet also
 * synchron von <Battle> auf <MonsterSelect> um, eine lokale Battle-State-Lösung würde den Moment
 * verpassen. Diese Komponente lebt deshalb auf App-Ebene (wie DeathPopup/PetCelebration) und
 * erkennt den Übergang "dungeonId war gesetzt → ist jetzt null" + `dungeonsCleared[id]` gestiegen
 * (unterscheidet Clear von Tod/Abbruch/Stalemate, die denselben Übergang auslösen, aber den Zähler
 * NICHT erhöhen). Das Belohnungs-Bundle wird aus `combat.log` rekonstruiert: `grantDungeonRewards`
 * pusht selbst einen zweiten `kind:"kill"`-Marker (combat.ts ~Z.1098) BEVOR es Gold/XP/Loot loggt —
 * alles NACH diesem letzten "kill"-Eintrag ist die Abschluss-Belohnung (robust, kein hartcodierter
 * Event-Zähler). Das Log lebt unverändert weiter, bis der nächste Kampf es leert (startCombat/
 * startDungeon) — dieser Effekt läuft VOR jedem möglichen Re-Start, da er an denselben Tick bindet.
 */
export function DungeonClearCeremony(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [ceremony, setCeremony] = useState<ClearData | null>(null);
  const [exiting, setExiting] = useState(false);
  const snap = useRef<{ dungeonId: string | null; cleared: Record<string, number> } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Welle PP: monotone Ceremony-Instanz-Nummer, s. `ClearData.seq`-JSDoc.
  const ceremonySeqRef = useRef(0);

  useEffect(() => {
    const cs = state.combat;
    const prev = snap.current;
    if (prev && prev.dungeonId && !cs.dungeonId) {
      const id = prev.dungeonId;
      const prevCount = prev.cleared[id] ?? 0;
      const curCount = state.dungeonsCleared[id] ?? 0;
      if (curCount > prevCount) {
        let markerSeq = -1;
        for (const e of cs.log) if (e.kind === "kill") markerSeq = e.seq;
        let gold = 0;
        let xp = 0;
        const loot: Array<{ itemId: string; qty: number }> = [];
        for (const e of cs.log) {
          if (e.seq <= markerSeq) continue;
          if (e.kind === "gold") gold += e.amount;
          else if (e.kind === "xp") xp += e.amount;
          else if (e.kind === "loot" && e.itemId) {
            const existing = loot.find((l) => l.itemId === e.itemId);
            if (existing) existing.qty += e.amount;
            else loot.push({ itemId: e.itemId, qty: e.amount });
          }
        }
        ceremonySeqRef.current += 1;
        setCeremony({ dungeonId: id, firstClear: curCount === 1, gold, xp, loot, seq: ceremonySeqRef.current });
        setExiting(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    }
    snap.current = { dungeonId: cs.dungeonId, cleared: { ...state.dungeonsCleared } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  function dismiss(): void {
    setExiting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCeremony(null);
      setExiting(false);
    }, 500);
  }

  useEffect(() => {
    if (!ceremony) return;
    return registerEscCloser("modal", dismiss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony]);

  if (!ceremony) return <></>;

  const dungeon = content.dungeons.find((d) => d.id === ceremony.dungeonId);
  const dungeonName = dungeon ? tr(dungeon.name) : ceremony.dungeonId;
  const bg = getDungeonBackground(ceremony.dungeonId);

  return (
    <div
      className={`dcc-backdrop${exiting ? " dcc-exit" : ""}`}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={t("dungeon.clear.ariaLabel")}
    >
      <div
        className={`dcc-card${bg ? " has-bg" : ""}`}
        style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dcc-shine" aria-hidden="true" />
        <div className="dcc-tag">{t("dungeon.clear.eyebrow")}</div>

        <h2 className="dcc-title">{t("dungeon.clear.title").replace("{name}", dungeonName)}</h2>

        {ceremony.firstClear && <div className="dcc-first-badge">✦ {t("dungeon.firstClear")}</div>}

        {(ceremony.gold > 0 || ceremony.xp > 0) && (
          <div className="dcc-rewards">
            <div className="dcc-rewards-title">{t("dungeon.clear.rewardsTitle")}</div>
            <div className="dcc-rewards-row">
              {ceremony.gold > 0 && <span className="dcc-reward-chip">🪙 +{formatNum(ceremony.gold)}</span>}
              {ceremony.xp > 0 && (
                <span className="dcc-reward-chip">✦ +{formatNum(ceremony.xp)} {t("skill.t.xp")}</span>
              )}
            </div>
          </div>
        )}

        {ceremony.loot.length > 0 && (
          <DungeonLootReveal key={ceremony.seq} loot={ceremony.loot} t={t} />
        )}

        <div className="dcc-footer">
          <button className="dcc-next-btn ds-button" onClick={dismiss}>
            {t("dungeon.clear.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
