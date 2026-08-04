import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { content } from "@hearthforge/content";
import { blessingForTime, campShrineBonus, shrineAmplifiedMult } from "@hearthforge/engine";
import type { BlessingEffectKind } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getBlessingImage } from "../blessings";
import { formatEta } from "../util/actionRate";
import { campBoostNote } from "../util/campBoostText";
import { CampBoostNote } from "./CampBoostNote";
import { CitadelTip } from "./CitadelTip";

// Jede Minute neu auswerten — reicht, um den Mitternachts-Wechsel (Engine-Contract: lokaler
// Wochentag, s. blessingForTime) ohne Reload sichtbar zu machen, ohne einen eigenen Sekunden-Timer
// zu unterhalten (das Panel ist reine Anzeige, kein Save-State/keine Migration nötig).
const CHECK_INTERVAL_MS = 60_000;

const EFFECT_KEY: Record<BlessingEffectKind, string> = {
  doubleLootChance: "blessing.effect.doubleLootChance",
  gather: "blessing.effect.gather",
  craftSpeed: "blessing.effect.craftSpeed",
  rareDrop: "blessing.effect.rareDrop",
  xp: "blessing.effect.xp",
  gold: "blessing.effect.gold",
  attackSpeed: "blessing.effect.attackSpeed",
};

/** ms bis zur nächsten LOKALEN Mitternacht — identisches Wechsel-Signal wie die Engine
 *  (blessingForTime leitet den aktiven Segen aus `new Date(nowMs).getDay()` in lokaler Zeitzone ab). */
function msUntilLocalMidnight(nowMs: number): number {
  const d = new Date(nowMs);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - nowMs);
}

interface BlessingTooltipProps {
  name: string;
  flavor: string;
  effect: string;
  countdown: string;
  rect: DOMRect;
  /** Task #334 (UI-Welle 2 "Boosts sichtbar"): nur gesetzt, wenn der Schrein der Stillen diesen
   *  Segen gerade wirklich verstärkt (K2-Ausnahme wildhunt/attackSpeed ausgenommen). */
  shrineNote: string | null;
  /** Roher Lager-Bonus für die `CampBoostNote`-Zeile (Emblem-Attribution) — nur ausgewertet,
   *  wenn `shrineNote` gesetzt ist. */
  shrineBonus: number;
  t: (key: string) => string;
}

/** Glowloses `.ct-tip` (components/CitadelTip.tsx, Tooltip-Vereinheitlichung Chef-Auftrag
 *  2026-07-23) — rechts neben der Karte verankert (die Karte sitzt ganz oben in der Sidebar — für
 *  "über der Karte" ist dort selten Platz), mit Flip nach links falls dort mal kein Platz mehr ist. */
function BlessingTooltip({ name, flavor, effect, countdown, rect, shrineNote, shrineBonus, t }: BlessingTooltipProps): JSX.Element {
  return (
    <CitadelTip rect={rect} placement="right" className="blessing-tip">
      <span className="ct-tip-title">{name}</span>
      <span className="ct-tip-desc">{flavor}</span>
      <span className="ct-tip-desc blessing-tip-effect">{effect}</span>
      {shrineNote && (
        <span className="ct-tip-desc blessing-tip-shrine">
          <CampBoostNote kind="blessing" value={shrineBonus} t={t} />
        </span>
      )}
      <span className="ct-tip-desc blessing-tip-countdown">{countdown}</span>
    </CitadelTip>
  );
}

/**
 * Sidebar-Kopfpanel „Blessings of the Reach" (Chef-Feature 2026-07-21, ersetzt das frühere reine
 * Logo-Kästchen `.sb-brand-logo`): zeigt den heute aktiven Welt-Segen als Kartengrafik + Name +
 * Effekt-Zeile. `blessingForTime` (Engine) ist eine reine Funktion des lokalen Kalendertags — kein
 * Save-State, keine Migration. Ein Minuten-Intervall wertet neu aus, damit der Wechsel zur lokalen
 * Mitternacht ohne Reload sichtbar wird (Karte/Name/Effekt tauschen automatisch).
 *
 * Effekt-Zeile: NICHT hart aus einer Tabelle abgeleitet — `{pct}` kommt aus dem Engine-Wert
 * (Multiplikator-Arten: Math.round((mult-1)*100); Chance-Art doubleLootChance: Math.round(mult*100)),
 * das i18n-Template ist pro `kind` (EFFECT_KEY), damit UI und Engine nie auseinanderlaufen, falls
 * die Balance-Zahlen sich mal ändern.
 *
 * Hover/Fokus/Klick öffnet ein Erklär-Tooltip mit Flavor-Text, exakter Effekt-Beschreibung und
 * Countdown bis zum nächsten Wechsel.
 */
export function BlessingPanel(): JSX.Element {
  const { t } = useI18n();
  const state = useGameState();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const blessing = blessingForTime(nowMs);
  const img = getBlessingImage(blessing.id);
  const name = t(`blessing.name.${blessing.id}`);
  const flavor = t(`blessing.flavor.${blessing.id}`);
  // Task #334 (UI-Welle 2 "Boosts sichtbar"): der Schrein der Stillen verstärkt den BONUS-Anteil
  // von sechs der sieben Segen (tick.ts xp/gold/rareDrop/gather/craftSpeed via
  // `shrineAmplifiedMult`, die Chance-Art doubleLootChance separat über `blessingChance`) — NUR
  // wildhunt/attackSpeed bleibt ausgenommen (Chef-Entscheid K2, Kampf-Segen; der Ersatz dafür ist
  // der Elite-Ruhe-Cooldown in elites.ts). Die Panel-Prozentzahl nutzte bislang den rohen, nicht
  // verstärkten `blessing.mult` — mit Schrein war sie an fünf von sieben Wochentagen zu niedrig.
  // `shrineAmplifiedMult` ist derselbe exportierte Engine-Helfer, den tick.ts selbst aufruft; für
  // die Chance-Art bleibt die Basis-Prozentzahl stehen (ihre exakte Verstärkungsformel lebt
  // ausschließlich im tickenden `blessingChance`-Pfad) — die Tooltip-Zeile weist den New-Haven-
  // Anteil trotzdem qualitativ aus.
  const shrineBonus = campShrineBonus(state, content);
  const shrineAmplifiable = blessing.kind !== "attackSpeed";
  const displayMult =
    blessing.kind === "doubleLootChance" || !shrineAmplifiable
      ? blessing.mult
      : shrineAmplifiedMult(blessing.mult, shrineBonus);
  // `mult`-Semantik je kind (shared `Blessing.mult`): Multiplikator-Arten = Faktor (1.15 → 15 %),
  // die Chance-Art `doubleLootChance` = Wahrscheinlichkeit (0.15 → 15 %) — sonst zeigte die
  // (mult−1)-Formel für den Blutmond „−85 %".
  const pct =
    blessing.kind === "doubleLootChance"
      ? Math.round(blessing.mult * 100)
      : Math.round((displayMult - 1) * 100);
  const effect = t(EFFECT_KEY[blessing.kind]).replace("{pct}", String(pct));
  const countdown = t("blessing.changesIn").replace("{time}", formatEta(msUntilLocalMidnight(nowMs), t));
  const shrineNote = shrineAmplifiable && shrineBonus > 0 ? campBoostNote("blessing", shrineBonus, t) : null;

  const openTip = (): void => {
    const el = wrapRef.current;
    if (el) setTipRect(el.getBoundingClientRect());
  };
  const closeTip = (): void => setTipRect(null);

  return (
    <div
      ref={wrapRef}
      className="sb-brand sb-blessing"
      role="button"
      tabIndex={0}
      aria-label={`${t("blessing.panelTitle")}: ${name}. ${effect}.${shrineNote ? ` ${shrineNote}.` : ""} ${flavor} ${countdown}`}
      onMouseEnter={openTip}
      onMouseLeave={closeTip}
      onFocus={openTip}
      onBlur={closeTip}
      onClick={openTip}
    >
      <div
        className="sb-blessing-card"
        style={
          img
            ? ({
                backgroundImage:
                  `linear-gradient(to bottom, rgba(6,5,4,0) 52%, rgba(6,5,4,0.55) 75%, rgba(6,5,4,0.85) 100%), ` +
                  `url("${img}")`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="sb-blessing-textbox">
          <span className="sb-blessing-name">{name}</span>
          <span className="sb-blessing-effect">{effect}</span>
        </div>
      </div>
      {tipRect && (
        <BlessingTooltip
          name={name}
          flavor={flavor}
          effect={effect}
          countdown={countdown}
          rect={tipRect}
          shrineNote={shrineNote}
          shrineBonus={shrineBonus}
          t={t}
        />
      )}
    </div>
  );
}
