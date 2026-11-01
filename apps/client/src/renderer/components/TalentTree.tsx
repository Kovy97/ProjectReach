import type { ReactNode } from "react";
import { content } from "@hearthforge/content";
import {
  buyTalent,
  canBuyTalent,
  findTalentTree,
  talentCurrencyBalance,
  talentNextCost,
  talentRank,
  talentTreeUnlocked,
  talentValueAtRank,
} from "@hearthforge/engine";
import type { TalentBuyReason } from "@hearthforge/engine";
import { TALENT_EFFECT_FORMAT } from "@hearthforge/shared";
import type { TalentEffectKind, TalentNodeDef, TalentTreeDef } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum, formatPct1 } from "../util/format";
import { getUiIcon } from "../uiIcons";
import { HoverTip } from "./CitadelTip";

// claude:2026-10-18T00:30:00+02:00 — Wiederverwendbarer Talentbaum (1.3.0 Säule 0, Chef 17.10.:
// „richtiges Talentbaum-System, das wir später erweitern“). Äste = Spalten, Knoten = Karten mit Rang,
// Wirkung und Kauf-Knopf; Verbindungslinie zur Voraussetzung im selben Ast. Rein lesend gegen die
// Engine (canBuyTalent/buyTalent), keine zweite Kosten- oder Gate-Logik.
// claude:2026-10-30T19:34:00+01:00 — 1.4.2 Optik neu (Chef 30.10.: Karten unterschiedlich groß, schlechter Kontrast):
// strenges Raster (Ast = Spalte, row = Zeile, alle Karten gleich groß), dunkle Basaltfläche, drei klare Zustände,
// Erzählsatz (`flavor`) nur im Hover-/Fokus-Tooltip, Kopfleiste mit Guthaben/Ausgegeben, Baum scrollt waagerecht.

const LOCKED_ICON_URL = getUiIcon("icon_locked");

// claude:2026-10-18T14:00:00+02:00 — Knotensymbole per Auto-Discovery: `assets/ui/talents/<baumId>/<knotenId>.webp`
// (z. B. `talents/prestige/startingGold.webp`). Fehlt die Datei, bleibt der Knoten ohne Symbol (kein Fehler).
const NODE_ICONS = import.meta.glob<string>("../assets/ui/talents/*/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const NODE_ICON_BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(NODE_ICONS)) {
  const parts = path.split("/");
  const file = parts.pop()?.replace(/\.(png|webp)$/, "");
  const tree = parts.pop();
  if (file && tree) NODE_ICON_BY_KEY[`${tree}/${file}`] = url;
}

type TFn = (key: string) => string;

/** Formatiert einen Rangwert je Wirkungsart (TALENT_EFFECT_FORMAT). */
export function formatTalentValue(kind: TalentEffectKind, value: number, t: TFn): string {
  switch (TALENT_EFFECT_FORMAT[kind]) {
    case "pct":
      return t("talent.fmt.pct").replace("{n}", formatPct1(value));
    case "mult":
      return t("talent.fmt.mult").replace("{n}", formatNum(value));
    // claude:2026-10-18T14:00:00+02:00 — Ganzzahlen (Gold, Stapel, Teile) im Narbenbuch.
    case "int":
      return formatNum(value);
    default:
      return "";
  }
}

type NodeState = "maxed" | "available" | "unaffordable" | "locked";

function nodeState(reason: TalentBuyReason | undefined, ok: boolean): NodeState {
  if (ok) return "available";
  if (reason === "maxed") return "maxed";
  if (reason === "not_enough_currency") return "unaffordable";
  return "locked";
}

/** claude:2026-10-30T19:34:00+01:00 — Wirkungstext mit hervorgehobener Zahl (`{value}` → <strong>). */
function EffectText({ text, value }: { text: string; value: string }): JSX.Element {
  const at = text.indexOf("{value}");
  if (at < 0 || !value) return <>{text.replace("{value}", value)}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="talent-val">{value}</strong>
      {text.slice(at + "{value}".length)}
    </>
  );
}

export interface TalentTreeProps {
  treeId: string;
  /** Hinweis, solange der Baum gesperrt ist (z. B. „Ab Slayer-Stufe 85 …“). */
  lockedHint: string;
  /** Symbol der Baum-Währung vor den Kosten. */
  currencyIcon?: JSX.Element;
  /** claude:2026-10-30T19:34:00+01:00 — zusätzlicher Eintrag in der Kopfleiste (Narbenbuch: „Nächster Aschesturz bringt“). */
  headerExtra?: ReactNode;
}

export function TalentTree({ treeId, lockedHint, currencyIcon, headerExtra }: TalentTreeProps): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  const tree: TalentTreeDef | undefined = findTalentTree(content, treeId);
  if (!tree) return null;
  const unlocked = talentTreeUnlocked(state, tree);
  const nodeName = (id: string): string => {
    const n = tree.nodes.find((x) => x.id === id);
    return n ? tr(n.name) : id;
  };

  function reasonText(node: TalentNodeDef, reason: TalentBuyReason | undefined): string | undefined {
    switch (reason) {
      case "locked":
        return lockedHint;
      case "requires": {
        const missing = (node.requires ?? []).find((r) => talentRank(state, tree!.id, r.node) < r.rank);
        return missing
          ? t("talent.reason.requires").replace("{node}", nodeName(missing.node)).replace("{n}", String(missing.rank))
          : undefined;
      }
      case undefined:
        return undefined;
      default:
        return t(`talent.reason.${reason}`);
    }
  }

  // claude:2026-10-30T19:34:00+01:00 — Ausgegeben = Summe der Kosten aller gekauften Ränge (nur Anzeige).
  // claude:2026-10-30T20:20:00+01:00 — K6: Narbenbuch zeigt die tatsächlich ausgegebenen Narben (`prestige.pointsSpent`, Lebenszeit-Summe), nicht den
  // Wert zu heutigen Kosten. Der Jägerkodex hat kein solches Feld (Slayer-Punkte werden nicht mitgezählt): dort bleibt die
  // Rechnung über die heutigen Rangkosten, das ist der „Wert der Ränge“ und bei unveränderten Kosten identisch.
  const spent = tree.currency === "prestigePoints"
    ? (state.prestige?.pointsSpent ?? 0)
    : tree.nodes.reduce((sum, n) => {
        const r = talentRank(state, tree.id, n.id);
        return sum + n.costPerRank.slice(0, r).reduce((a, b) => a + b, 0);
      }, 0);
  const balance = talentCurrencyBalance(state, tree.currency);

  const branchIndex = new Map(tree.branches.map((b, i) => [b.id, i] as const));
  const maxRow = tree.nodes.reduce((m, n) => Math.max(m, n.row), 0);

  // claude:2026-10-30T19:34:00+01:00 — Verbindungen je Ast: direkt darüberliegende Voraussetzung = kurzer Steg in der
  // Zeilenlücke; weiter entfernte Voraussetzung = Schiene im linken Spaltenrand (Start / Mitte / Ende je Zelle).
  type Rail = { kind: "up" | "start" | "mid" | "end"; met: boolean; lane: number };
  const railsByNode = new Map<string, Rail[]>();
  const addRail = (nodeId: string, rail: Rail): void => {
    const list = railsByNode.get(nodeId) ?? [];
    list.push(rail);
    railsByNode.set(nodeId, list);
  };
  let lane = 0;
  for (const node of tree.nodes) {
    for (const req of node.requires ?? []) {
      const from = tree.nodes.find((x) => x.id === req.node);
      if (!from || from.branch !== node.branch || from.row >= node.row) continue;
      const met = talentRank(state, tree.id, from.id) >= req.rank;
      if (from.row === node.row - 1) {
        addRail(node.id, { kind: "up", met, lane: 0 });
        continue;
      }
      const l = lane++ % 2;
      addRail(from.id, { kind: "start", met, lane: l });
      addRail(node.id, { kind: "end", met, lane: l });
      for (const mid of tree.nodes) {
        if (mid.branch === node.branch && mid.row > from.row && mid.row < node.row) addRail(mid.id, { kind: "mid", met, lane: l });
      }
    }
  }

  function renderNode(node: TalentNodeDef): JSX.Element {
    const rank = talentRank(state, tree!.id, node.id);
    const check = canBuyTalent(state, content, tree!.id, node.id);
    const st = nodeState(check.reason, check.ok);
    const cost = talentNextCost(state, tree!, node);
    const shownValue = talentValueAtRank(node, Math.max(1, rank));
    const fmt = (v: number): string => formatTalentValue(node.effect.kind, v, t);
    // claude:2026-10-31T14:25:00+01:00 — E3: ist der ganze Baum gesperrt, steht der lange Hinweis einmal oben; auf den Karten nur „Gesperrt“.
    const blockedText = st === "locked" ? (check.reason === "locked" ? t("talent.cardLocked") : reasonText(node, check.reason)) : undefined;
    const iconUrl = NODE_ICON_BY_KEY[`${tree!.id}/${node.id}`];
    const rankLabel = t("talent.rank").replace("{n}", String(rank)).replace("{max}", String(node.maxRank));
    const rails = railsByNode.get(node.id) ?? [];
    const isFlag = TALENT_EFFECT_FORMAT[node.effect.kind] === "flag";

    // Detailansicht (Hover/Fokus): Erzählsatz plus Wert und Kosten je Rang.
    const tip = (
      <div className="talent-tip">
        <div className="talent-tip-name">{tr(node.name)}</div>
        <p className="talent-tip-desc">
          <EffectText text={tr(node.description)} value={fmt(shownValue)} />
        </p>
        {node.flavor && <p className="talent-tip-flavor">{tr(node.flavor)}</p>}
        <ul className="talent-tip-ranks">
          {node.costPerRank.map((c, i) => (
            <li key={i} className={i < rank ? "is-owned" : undefined}>
              <span>
                {isFlag
                  ? t("talent.rank").replace("{n}", String(i + 1)).replace("{max}", String(node.maxRank))
                  : t("talent.tip.rank").replace("{n}", String(i + 1)).replace("{value}", fmt(talentValueAtRank(node, i + 1)))}
              </span>
              <span>{t("talent.tip.cost").replace("{n}", formatNum(c))}</span>
            </li>
          ))}
        </ul>
      </div>
    );

    return (
      <div
        key={node.id}
        className="talent-cell"
        style={{ gridColumn: (branchIndex.get(node.branch) ?? 0) + 1, gridRow: node.row + 2 }}
      >
        {rails.map((r, i) => (
          <span
            key={i}
            className={`talent-rail is-${r.kind}${r.met ? " is-met" : ""}${r.lane === 1 ? " is-lane-b" : ""}`}
            aria-hidden="true"
          />
        ))}
        <HoverTip as="div" className="talent-card-tip" content={tip} focusable={false}>
          <article className={`talent-node is-${st}`} aria-label={tr(node.name)}>
            <header className="talent-node-head">
              {iconUrl ? (
                <img loading="lazy" decoding="async" src={iconUrl} alt="" className="talent-node-icon" />
              ) : (
                <span className="talent-node-icon talent-node-icon--blank" aria-hidden="true" />
              )}
              <span className="talent-node-name">{tr(node.name)}</span>
              {st === "locked" && LOCKED_ICON_URL && (
                <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="talent-node-lock" />
              )}
            </header>
            <span className="talent-pips" aria-hidden="true">
              {Array.from({ length: node.maxRank }, (_, i) => (
                <span key={i} className={`talent-pip${i < rank ? " is-on" : ""}`} />
              ))}
            </span>
            <p className="talent-node-desc">
              <EffectText text={tr(node.description)} value={fmt(shownValue)} />
            </p>
            <footer className="talent-node-foot">
              <span className="talent-node-rank-text">{rankLabel}</span>
              {st === "maxed" ? (
                <span className="talent-node-maxed">{t("talent.maxed")}</span>
              ) : st === "locked" ? (
                <span className="talent-node-reason">{blockedText}</span>
              ) : (
                <button
                  type="button"
                  className={`btn-iron btn-iron--sm talent-buy-btn${st === "unaffordable" ? " is-short" : ""}`}
                  disabled={!check.ok}
                  title={check.ok ? t("talent.learn") : reasonText(node, check.reason)}
                  onClick={() => buyTalent(state, content, tree!.id, node.id)}
                >
                  <span className="talent-buy-label">{t("talent.buy")}</span>
                  <span className="talent-buy-cost">
                    {currencyIcon} {cost !== null ? formatNum(cost) : "–"}
                  </span>
                </button>
              )}
            </footer>
          </article>
        </HoverTip>
      </div>
    );
  }

  return (
    <div className={`talent-tree${unlocked ? "" : " is-locked"}`}>
      {tree.description && <p className="talent-tree-intro muted">{tr(tree.description)}</p>}
      <div className="talent-bar">
        <span className="talent-bar-item">
          <span className="talent-bar-label">{t("talent.bal")}</span>
          <span className="talent-bar-value">{currencyIcon} {formatNum(balance)}</span>
        </span>
        <span className="talent-bar-item">
          <span className="talent-bar-label">{t("talent.spent")}</span>
          <span className="talent-bar-value">{currencyIcon} {formatNum(spent)}</span>
        </span>
        {headerExtra && <span className="talent-bar-item talent-bar-extra">{headerExtra}</span>}
      </div>
      {!unlocked && (
        <p className="talent-tree-lock-hint">
          {LOCKED_ICON_URL && <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="talent-node-lock" />}
          {lockedHint}
        </p>
      )}
      <div className="talent-scroll">
        <div
          className="talent-grid"
          style={{ ["--talent-cols" as string]: String(tree.branches.length), ["--talent-rows" as string]: String(maxRow + 1) }}
        >
          {tree.branches.map((branch, i) => (
            <h4 key={branch.id} className="talent-branch-title" style={{ gridColumn: i + 1, gridRow: 1 }}>
              {tr(branch.name)}
            </h4>
          ))}
          {tree.nodes.map((n) => renderNode(n))}
        </div>
      </div>
    </div>
  );
}
