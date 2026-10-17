import { content } from "@hearthforge/content";
import {
  buyTalent,
  canBuyTalent,
  findTalentTree,
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

// claude:2026-10-18T00:30:00+02:00 — Wiederverwendbarer Talentbaum (1.3.0 Säule 0, Chef 17.10.:
// „richtiges Talentbaum-System, das wir später erweitern“). Äste = Spalten, Knoten = Karten mit Rang,
// Wirkung und Kauf-Knopf; Verbindungslinie zur Voraussetzung im selben Ast. Rein lesend gegen die
// Engine (canBuyTalent/buyTalent), keine zweite Kosten- oder Gate-Logik.

const LOCKED_ICON_URL = getUiIcon("icon_locked");

type TFn = (key: string) => string;

/** Formatiert einen Rangwert je Wirkungsart (TALENT_EFFECT_FORMAT). */
export function formatTalentValue(kind: TalentEffectKind, value: number, t: TFn): string {
  switch (TALENT_EFFECT_FORMAT[kind]) {
    case "pct":
      return t("talent.fmt.pct").replace("{n}", formatPct1(value));
    case "mult":
      return t("talent.fmt.mult").replace("{n}", formatNum(value));
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

export interface TalentTreeProps {
  treeId: string;
  /** Hinweis, solange der Baum gesperrt ist (z. B. „Ab Slayer-Stufe 85 …“). */
  lockedHint: string;
  /** Symbol der Baum-Währung vor den Kosten. */
  currencyIcon?: JSX.Element;
}

export function TalentTree({ treeId, lockedHint, currencyIcon }: TalentTreeProps): JSX.Element | null {
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

  function renderNode(node: TalentNodeDef, prev: TalentNodeDef | undefined): JSX.Element {
    const rank = talentRank(state, tree!.id, node.id);
    const check = canBuyTalent(state, content, tree!.id, node.id);
    const st = nodeState(check.reason, check.ok);
    const cost = talentNextCost(state, tree!, node);
    const shownValue = talentValueAtRank(node, Math.max(1, rank));
    const description = tr(node.description).replace("{value}", formatTalentValue(node.effect.kind, shownValue, t));
    const nextValue = rank > 0 && rank < node.maxRank ? talentValueAtRank(node, rank + 1) : null;
    const nextText = nextValue !== null && TALENT_EFFECT_FORMAT[node.effect.kind] !== "flag"
      ? t("talent.next").replace("{value}", formatTalentValue(node.effect.kind, nextValue, t))
      : null;
    // Verbindung nach oben nur, wenn dieser Knoten den direkt darüberliegenden voraussetzt.
    const linkedUp = !!prev && (node.requires ?? []).some((r) => r.node === prev.id);
    const linkMet = linkedUp && (node.requires ?? []).every((r) => talentRank(state, tree!.id, r.node) >= r.rank);
    const blockedText = st === "locked" || st === "unaffordable" ? reasonText(node, check.reason) : undefined;

    return (
      <div key={node.id} className="talent-node-wrap">
        {linkedUp && <span className={`talent-link${linkMet ? " is-met" : ""}`} aria-hidden="true" />}
        <article className={`talent-node is-${st}`}>
          <header className="talent-node-head">
            <span className="talent-node-name">{tr(node.name)}</span>
            {st === "locked" && LOCKED_ICON_URL && (
              <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="talent-node-lock" />
            )}
          </header>
          <div className="talent-node-rank" aria-label={t("talent.rank").replace("{n}", String(rank)).replace("{max}", String(node.maxRank))}>
            <span className="talent-pips" aria-hidden="true">
              {Array.from({ length: node.maxRank }, (_, i) => (
                <span key={i} className={`talent-pip${i < rank ? " is-on" : ""}`} />
              ))}
            </span>
            <span className="talent-node-rank-text">
              {t("talent.rank").replace("{n}", String(rank)).replace("{max}", String(node.maxRank))}
            </span>
          </div>
          <p className="talent-node-desc">{description}</p>
          {nextText && <p className="talent-node-next">{nextText}</p>}
          <footer className="talent-node-foot">
            {st === "maxed" ? (
              <span className="talent-node-maxed">{t("talent.maxed")}</span>
            ) : (
              <>
                {blockedText ? <span className="talent-node-reason">{blockedText}</span> : <span />}
                <button
                  type="button"
                  className={`btn-iron btn-iron--sm talent-buy-btn${st === "unaffordable" ? " is-short" : ""}`}
                  disabled={!check.ok}
                  title={check.ok ? t("talent.learn") : blockedText}
                  onClick={() => buyTalent(state, content, tree!.id, node.id)}
                >
                  {currencyIcon} {cost !== null ? formatNum(cost) : "–"}
                </button>
              </>
            )}
          </footer>
        </article>
      </div>
    );
  }

  return (
    <div className={`talent-tree${unlocked ? "" : " is-locked"}`}>
      {tree.description && <p className="talent-tree-intro muted">{tr(tree.description)}</p>}
      {!unlocked && (
        <p className="talent-tree-lock-hint">
          {LOCKED_ICON_URL && <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="talent-node-lock" />}
          {lockedHint}
        </p>
      )}
      <div className="talent-branches" style={{ ["--talent-cols" as string]: String(tree.branches.length) }}>
        {tree.branches.map((branch) => {
          const nodes = tree.nodes.filter((n) => n.branch === branch.id).sort((a, b) => a.row - b.row);
          return (
            <section key={branch.id} className="talent-branch">
              <h4 className="talent-branch-title">{tr(branch.name)}</h4>
              {nodes.map((n, i) => renderNode(n, nodes[i - 1]))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
