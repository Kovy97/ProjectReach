// claude:2026-10-25T10:30:00+02:00 — Raid-Kampf-HUD (1.4.0 Welle 4, R1/R4): Bossleiste mit Phasenmarken an den atHpPct-Schwellen
// und kurze Phasen-Ansage. Rein lesend: Phase aus combatBossPhase (HP-abgeleitet), Werte aus der skalierten Instanz.
import { useEffect, useRef, useState } from "react";
import { combatBossPhase } from "@hearthforge/engine";
import { content } from "@hearthforge/content";
import type { GameState, MonsterDef } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import "../styles/raid.css";

const ANNOUNCE_MS = 4200;

export function RaidBossBar({ state, monster }: { state: GameState; monster: MonsterDef }): JSX.Element {
  const { t, tr } = useI18n();
  const cs = state.combat;
  const sorted = [...(monster.phases ?? [])].sort((a, b) => b.atHpPct - a.atHpPct);
  const bp = combatBossPhase(state, content, monster);
  const phaseIdx = bp?.index ?? 0;
  const pct = Math.max(0, Math.min(100, (cs.enemyHp / monster.maxHp) * 100));
  const wardPct = monster.wardCapacity ? Math.max(0, Math.min(100, ((cs.enemyWard ?? 0) / monster.wardCapacity) * 100)) : 0;

  // Ansage bei steigender Phase (nicht beim ersten Anzeigen mitten in einer Phase).
  const [announce, setAnnounce] = useState<{ n: number; name: string; text: string } | null>(null);
  const prevRef = useRef<number>(phaseIdx);
  useEffect(() => {
    if (phaseIdx > prevRef.current) {
      const ph = sorted[phaseIdx - 1];
      setAnnounce({ n: phaseIdx, name: ph?.name ? tr(ph.name) : t("raid.hud.phase").replace("{n}", String(phaseIdx)), text: ph?.announce ? tr(ph.announce) : "" });
      const timer = window.setTimeout(() => setAnnounce(null), ANNOUNCE_MS);
      prevRef.current = phaseIdx;
      return () => window.clearTimeout(timer);
    }
    prevRef.current = phaseIdx;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIdx, monster.id]);

  return (
    <div className="raid-bossbar" data-phase={phaseIdx}>
      <div className="raid-bossbar-head">
        <span className="raid-bossbar-name">{tr(monster.name)}</span>
        <span className="raid-bossbar-phase">
          {phaseIdx > 0 && sorted[phaseIdx - 1]?.name ? tr(sorted[phaseIdx - 1]!.name!) : t("raid.hud.phase").replace("{n}", String(phaseIdx + 1))}
        </span>
        <span className="raid-bossbar-hp">
          {formatNum(Math.ceil(cs.enemyHp))} / {formatNum(monster.maxHp)}
        </span>
      </div>
      <div className="raid-bossbar-track">
        <div className="raid-bossbar-fill" style={{ width: `${pct}%` }} />
        {wardPct > 0 && <div className="raid-bossbar-ward" style={{ width: `${wardPct}%` }} />}
        {sorted.map((ph, i) => (
          <span
            key={ph.logKey}
            className={`raid-bossbar-mark${i < phaseIdx ? " passed" : ""}`}
            style={{ left: `${ph.atHpPct * 100}%` }} // claude:2026-10-26T01:05:00+02:00 — atHpPct ist ein Anteil 0..1 (QA-Raid #1)
            title={t("raid.hud.phaseMark").replace("{pct}", String(Math.round(ph.atHpPct * 100)))}
          />
        ))}
      </div>
      {announce && (
        <div key={announce.n} className="raid-phase-announce" role="status" aria-live="polite">
          <strong>{announce.name}</strong>
          {announce.text && <span>{announce.text}</span>}
        </div>
      )}
    </div>
  );
}
