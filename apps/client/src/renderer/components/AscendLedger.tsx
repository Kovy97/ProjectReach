import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import type { PrestigeRunSummary } from "@hearthforge/engine";
import { PRESTIGE_SKILL_LEVEL } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import { getSidebarIcon } from "../sidebarIcons";
import { getSkillIcon, SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { ScarGlyph } from "../pages/PrestigePage";
import { formatNum, formatPlaytime } from "../util/format";
import { buildLedgerRows } from "../util/prestigeLedger";
import "../styles/prestige.css";

/**
 * claude:2026-10-18T20:30:00+02:00 — Bilanz-Fenster des Aufstiegs (Prestige „Der Aschesturz", Welle E2, Chef-Wunsch 18.10.):
 * Phase 1 des Aufstiegs-Fensters (Phase 2 = Erwachens-Text, AscendAwakening). Alles läuft über EINE Zeitachse
 * (`now` in ms, rAF): jedes Element hat einen Startzeitpunkt, Zähler und Balken ergeben sich aus `now`. Überspringen
 * (Klick, Taste, Escape) setzt `now` ans Ende; `prefers-reduced-motion` startet dort. Kein Leuchten: die 99er sind
 * mit einer Kerbe markiert, die Asche besteht aus matten Flocken.
 */

/** Vorlauf: die Asche-Überblendung (ScreenFade) hellt noch auf, wenn das Fenster mountet. */
const LEAD_MS = -500;
const TILE_START = 350;
const TILE_STEP = 190;
const COUNT_MS = 650;
const BAR_START = 1500;
const BAR_STEP = 55;
const BAR_MS = 600;
const LEDGER_START = 2900;
const ROW_STEP = 470;
const TOTAL_COUNT_MS = 1000;
const TAIL_MS = 300;

type TileKey = "totalLevel" | "skills99" | "chronicle" | "paragon" | "kills" | "dungeons" | "achievements" | "pets";

function easeOut(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return 1 - Math.pow(1 - c, 3);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

// claude:2026-11-01T11:14:09+01:00 — Chef 01.11.: „coolere Karten, die stolz das Erreichte zeigen, statt lebloser Leisten“.
// Taten als Trophäen-Karten mit Symbol, Level als Medaillen-Karten (Ring statt Balken, 99er zuerst und in Gold gefasst),
// Narbenquellen als Siegel-Karten. Zeitachse, Überspringen und Texte unverändert.
const DEED_ICON: Record<TileKey, string> = {
  totalLevel: "overall",
  skills99: "mastery",
  chronicle: "quests",
  paragon: "combat",
  kills: "slayer",
  dungeons: "city",
  achievements: "achievements",
  pets: "companions",
};

function skillIcon(id: string): JSX.Element {
  const png = getSkillIcon(id) ?? getSidebarIcon(id);
  if (png) return <img loading="lazy" decoding="async" src={png} alt="" className="alg-skill-icon pixelart" />;
  return <span className="alg-skill-icon alg-skill-emoji" aria-hidden="true">{SKILL_EMOJI_FALLBACK[id] ?? "•"}</span>;
}

export function AscendLedger({ summary, onContinue }: { summary: PrestigeRunSummary; onContinue: () => void }): JSX.Element {
  const { t, tr } = useI18n();
  const rows = buildLedgerRows(summary.points, t);
  const tiles: Array<{ key: TileKey; value: number }> = [
    { key: "totalLevel", value: summary.totalLevel },
    { key: "skills99", value: summary.skills99.length },
    { key: "chronicle", value: summary.chronicleChapter },
    { key: "paragon", value: summary.paragonBest },
    { key: "kills", value: summary.kills },
    { key: "dungeons", value: summary.dungeons },
    { key: "achievements", value: summary.achievements },
    { key: "pets", value: summary.petsFound },
  ];
  // Zeitplan: Kacheln, Balken, dann die Narben-Zeilen; die Summe zuletzt.
  const rowStart = (i: number): number => LEDGER_START + i * ROW_STEP;
  const lastRow = rows.length - 1;
  const totalStart = rowStart(lastRow) + 150;
  const endMs = totalStart + TOTAL_COUNT_MS + TAIL_MS;

  const reduced = useRef(prefersReducedMotion()).current;
  const [now, setNow] = useState(reduced ? endMs : LEAD_MS);
  const done = now >= endMs;
  const skippedRef = useRef(reduced);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (ts: number): void => {
      if (skippedRef.current) return; // übersprungen: Zeitachse steht am Ende
      const elapsed = ts - t0 + LEAD_MS;
      if (elapsed >= endMs) {
        setNow(endMs);
        return;
      }
      setNow(elapsed);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, endMs]);

  // Klick/Taste überspringt, solange es läuft; danach geht Enter/Escape weiter zum Erwachen.
  const doneRef = useRef(done);
  doneRef.current = done;
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;
  useEffect(() => {
    const skip = (): void => {
      skippedRef.current = true;
      setNow(Number.MAX_SAFE_INTEGER);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      if (!doneRef.current) {
        e.preventDefault();
        e.stopPropagation();
        skip();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const eff = Math.min(now, endMs);
  const count_ = (start: number, value: number, dur: number): number => Math.round(value * easeOut((eff - start) / dur));
  const cls = (start: number, extra = ""): string => `alg-in${eff >= start ? " is-in" : ""}${extra ? ` ${extra}` : ""}`;

  const burstOn = !reduced && !skippedRef.current && eff >= totalStart;

  return (
    <div
      className={`alg${done ? " is-done" : ""}${skippedRef.current ? " is-skipped" : ""}`}
      onClick={() => { if (!done) { skippedRef.current = true; setNow(Number.MAX_SAFE_INTEGER); } }}
    >
      {!reduced && (
        <div className="alg-ash" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="alg-flake"
              style={{ left: `${(i * 7.3 + 3) % 100}%`, animationDelay: `${-((i * 1.7) % 9)}s`, animationDuration: `${8 + ((i * 5) % 6)}s`, width: 2 + (i % 3), height: 2 + (i % 3) }}
            />
          ))}
        </div>
      )}

      <header className={cls(0, "alg-head")}>
        <div className="alg-eyebrow">{t("prestige.bilanz.run").replace("{n}", String(summary.run))}</div>
        <h2 id="prestige-awakening-title" className="alg-title">{t("prestige.bilanz.title")}</h2>
        <div className="alg-played">{t("prestige.bilanz.played").replace("{time}", formatPlaytime(summary.playMs, t))}</div>
      </header>

      <div className="alg-body">
        <div className="alg-col alg-col--left">
          <h3 className={cls(TILE_START, "alg-sub")}>{t("prestige.bilanz.deeds")}</h3>
          <div className="alg-tiles">
            {tiles.map((tile, i) => {
              const start = TILE_START + i * TILE_STEP;
              const zero = tile.value <= 0;
              const landed = eff >= start + COUNT_MS;
              const icon = getSidebarIcon(DEED_ICON[tile.key]);
              return (
                <div key={tile.key} className={cls(start, `alg-tile alg-tile--${tile.key}${zero ? " is-zero" : ""}${landed ? " is-landed" : ""}`)}>
                  {icon && <img loading="lazy" decoding="async" src={icon} alt="" className="alg-tile-art" />}
                  <span className="alg-tile-text">
                    <span className="alg-tile-value">{formatNum(zero ? 0 : count_(start, tile.value, COUNT_MS))}</span>
                    <span className="alg-tile-label">{t(`prestige.bilanz.tile.${tile.key}`)}</span>
                  </span>
                  {tile.key === "skills99" && summary.skills99.length > 0 && (
                    <span className="alg-tile-icons">
                      {summary.skills99.map((id) => (
                        <span key={id} className="alg-tile-icon" title={tr(content.skills[id]?.name ?? { en: id, de: id })}>{skillIcon(id)}</span>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <h3 className={cls(BAR_START - 200, "alg-sub")}>{t("prestige.bilanz.levels")}</h3>
          <div className="alg-skills">
            {/* Höchste Stufen zuerst (stabil in Content-Reihenfolge), damit die 99er vorn stehen. */}
            {[...summary.skills].sort((a, b) => b.level - a.level).map((sk, i) => {
              const start = BAR_START + i * BAR_STEP;
              const at99 = sk.level >= PRESTIGE_SKILL_LEVEL;
              const fill = easeOut((eff - start) / BAR_MS) * Math.min(1, sk.level / PRESTIGE_SKILL_LEVEL);
              const name = tr(content.skills[sk.id]?.name ?? { en: sk.id, de: sk.id });
              const low = sk.level <= 1;
              return (
                <div key={sk.id} className={cls(start, `alg-skill${at99 ? " is-99" : ""}${low ? " is-low" : ""}`)} title={name}>
                  <span className="alg-skill-medal" style={{ ["--fill" as string]: `${Math.round(fill * 360)}deg` }}>
                    {skillIcon(sk.id)}
                  </span>
                  <span className="alg-skill-level">{Math.max(1, count_(start, sk.level, BAR_MS))}</span>
                  <span className="alg-skill-name">{name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="alg-col alg-col--right">
          <h3 className={cls(LEDGER_START - 250, "alg-sub")}>{t("prestige.bilanz.scars")}</h3>
          <div className="alg-rows">
            {rows.map((row, i) => {
              if (row.kind === "total") return null;
              const start = rowStart(i);
              return (
                <div key={row.key} className={cls(start, `alg-row alg-row--${row.kind}`)}>
                  <span className="alg-row-label">{row.label}</span>
                  <span className="alg-row-value">
                    {row.kind === "line" && <ScarGlyph size={14} />}
                    {row.kind === "subtotal" ? "" : "+"}
                    {formatNum(count_(start, row.value, 450))}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={cls(totalStart, "alg-total")} aria-live="polite">
            {burstOn && (
              <span className="alg-burst" aria-hidden="true">
                {Array.from({ length: 18 }, (_, i) => (
                  <span
                    key={i}
                    className="alg-burst-flake"
                    style={{ ["--bx" as string]: `${Math.round(Math.cos(i * 0.35 + 3.4) * (60 + (i % 4) * 22))}px`, ["--by" as string]: `${-Math.round(30 + (i * 13) % 70)}px`, animationDelay: `${(i % 5) * 25}ms` }}
                  />
                ))}
              </span>
            )}
            <ScarGlyph size={28} />
            <span className="alg-total-value">
              {t("prestige.awakening.gain").replace("{n}", formatNum(count_(totalStart, summary.points.total, TOTAL_COUNT_MS)))}
            </span>
          </div>
          <p className={cls(endMs - TAIL_MS, "alg-note")}>
            <span className="alg-note-who">{t("npc.guide.name")}</span> {t("prestige.bilanz.note")}
          </p>
        </div>
      </div>

      <footer className="alg-foot">
        {done ? (
          <button type="button" className="btn-iron alg-continue" onClick={onContinue} autoFocus>
            {t("prestige.awakening.button")}
          </button>
        ) : (
          <span className="alg-skip muted">{t("prestige.bilanz.skip")}</span>
        )}
      </footer>
    </div>
  );
}
