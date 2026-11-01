import { WorkOrdersTab } from "../components/WorkOrdersTab"; // claude:2026-10-25T01:30:00+02:00
import { objectiveJump } from "../util/objectiveJump"; // claude:2026-10-31T16:34:28+01:00 — Ziele anklickbar
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom"; // claude:2026-10-30T23:10:00+01:00
import { content } from "@hearthforge/content";
import {
  buyTokenService,
  buyTokenShopOffer,
  canClaimQuest,
  claimQuest,
  dailyQueuePlan,
  enqueueAllDailyQuests,
  enqueueDailyQuest,
  isDailyClaimed,
  isShelfOpen,
  objectiveProgress,
  questObjectiveProgress,
  questStatus,
  questTokenBalance,
  refreshDailyQuests,
  tokenServiceDefs,
  tokenServicePreview,
  tokenServiceStatus,
  tokenServiceTargets,
  tokenShopOfferStatus,
} from "@hearthforge/engine";
import type { TokenServiceStatus, TokenServiceTarget } from "@hearthforge/engine"; // claude:2026-10-30T23:10:00+01:00
import type { DailyQueuePlan, QuestStatus } from "@hearthforge/engine";
import type { GameState, ItemDef, LocalizedString, QuestDef, QuestObjective, TokenServiceDef, TokenShopOffer } from "@hearthforge/shared";
import { ORDER_MAX_OPEN, QUEST_DIFFICULTIES } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { registerEscCloser } from "../util/escStack"; // claude:2026-10-31T14:55:00+01:00
import { notePurchasedItem } from "../util/toastBus"; // claude:2026-10-31T15:30:00+01:00
import { formatNum } from "../util/format"; // claude:2026-10-31T14:55:00+01:00
import { formatEta } from "../util/actionRate"; // claude:2026-10-31T14:55:00+01:00
import { useI18n } from "../i18n";
import { getItemImage } from "../items";
import { getUiIcon } from "../uiIcons";
import { useItemTooltip } from "../components/ItemTooltip";
import { NpcGreeting, NpcSpeechBubble } from "../components/NpcGreeting";
import { activeEliteZoneName, resolveNpcVoiceKey } from "../util/npcVoice";
import { getPortrait } from "../portraits";
import {
  activeChronicleChapter,
  CHRONICLE_ID_PREFIX,
  chronicleChapterNumber,
  chronicleChapters,
  monsterHomeDungeon,
  unlocksForQuest,
} from "../util/chronicle";
import { deriveQuestStrands, questSpeaker } from "../util/questStrands";
import { msUntilMidnight, todayStamp } from "../util/dayStamp";
import { consumeRequestedQuestsTab } from "../navigation";
import { PrestigeRecallBar } from "../components/PrestigeRecallBar"; // claude:2026-10-18T14:00:00+02:00
import "../styles/quests.css";
import "../styles/chronicle.css";

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

const QUESTS_ICON_URL = getUiIcon("icon_quests");
// Mira-Set 2026-08-03 (Gap-Sweep Priorität A) — geschlossenes Quest-Semantik-Set, löst die
// direkten Unicode-Platzhalter (Münze/Ticket/Pin/Sprechblase/Kalender/Buch) unten ab.
const COIN_ICON_URL = getUiIcon("icon_quest_coin");
const TICKET_ICON_URL = getUiIcon("icon_quest_ticket");
const PIN_ICON_URL = getUiIcon("icon_quest_pin");
const DIALOG_ICON_URL = getUiIcon("icon_quest_dialog");
const CALENDAR_ICON_URL = getUiIcon("icon_quest_calendar");
const JOURNAL_ICON_URL = getUiIcon("icon_quest_journal");

/** Format ms as HH:MM:SS countdown. */
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Ist mindestens eine Quest (Story oder heutige Daily) gerade claimbar? Treibt den dezenten
 * Gold-Punkt am Quests-Button in der Top Bar (Task #274). Dieselbe Regel wie `questStatus ===
 * "completed"`/`canClaimQuest`, hier einmal zentral über ALLE `content.quests` gebündelt, damit
 * TopBar.tsx keine eigene Kopie der Claimbar-Logik pflegen muss.
 */
export function hasClaimableQuest(state: GameState): boolean {
  return content.quests.some((q) => canClaimQuest(state, content, q.id));
}

/** CSS class for each difficulty tier. */
const DIFFICULTY_CLASS: Record<string, string> = {
  very_easy: "daily-diff--very-easy",
  easy: "daily-diff--easy",
  medium: "daily-diff--medium",
  hard: "daily-diff--hard",
  master: "daily-diff--master",
};

/** claude:2026-10-31T16:34:28+01:00 — Klick-/Tastatur-Props für ein anklickbares Ziel (leer, wenn es keinen Sprung gibt). */
function jumpProps(jump: (() => void) | null): { role?: "link"; tabIndex?: number; onClick?: () => void; onKeyDown?: (e: ReactKeyboardEvent) => void } {
  if (!jump) return {};
  return {
    role: "link",
    tabIndex: 0,
    onClick: jump,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        jump();
      }
    },
  };
}

/** Objective label — describes what the counter tracks. */
export function objectiveLabel(
  obj: QuestObjective,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string {
  switch (obj.type) {
    case "dungeons_cleared": {
      // Boss-Kapitel, deren Endgegner keine eigene Id hat (Krypta) — gezaehlt wird der geraeumte
      // Dungeon, nicht der Kill. Name aus dem Katalog, damit die Vertragswand den Ort nennt.
      const dungeon = obj.target ? content.dungeons.find((d) => d.id === obj.target) : undefined;
      return t("quests.obj.clearDungeon").replace("{name}", dungeon ? tr(dungeon.name) : (obj.target ?? ""));
    }
    case "reach_paragon_floor":
      // Aschechronik Kapitel 21 (ceo-run-2026-07-13 Welle E): count = die zu erreichende Etage
      // (state.paragon.best, gelesen von objectiveProgress). Kein separates target-Feld.
      return t("quests.obj.reachParagonFloor").replace("{n}", String(obj.count));
    case "kill_monster": {
      // codex:2026-08-02T01:15:48+02:00 — Varianten-Unions werden auf der Vertragswand vollständig
      // ausgeschrieben. Die frühere Ellipse versteckte gültige Questziele und machte den Auftrag
      // ohne Hover unverständlich; der reine Namens-Join bleibt sprachneutral und i18n-sicher.
      if (obj.targets && obj.targets.length > 1) {
        const names = obj.targets.map((id) => {
          const m = content.monsters[id];
          return m ? tr(m.name) : id;
        });
        return names.join(", ");
      }
      if (obj.target) {
        const m = content.monsters[obj.target];
        return m ? tr(m.name) : obj.target;
      }
      return t("quests.obj.killMonster");
    }
    case "kill_total":
      return t("quests.obj.killTotal");
    case "reach_skill_level": {
      if (obj.target) {
        const sk = content.skills[obj.target];
        return sk
          ? t("quests.obj.reachSkillLevel").replace("{skill}", tr(sk.name))
          : t("quests.obj.reachSkillLevel").replace("{skill}", obj.target);
      }
      return t("quests.obj.reachSkillLevel").replace("{skill}", "?");
    }
    case "reach_total_level":
      return t("quests.obj.reachTotalLevel");
    case "gather_items":
      return t("quests.obj.gatherItems");
    case "craft_items": {
      if (obj.target) {
        const item = content.items[obj.target];
        return item ? tr(item.name) : obj.target;
      }
      return t("quests.obj.craftItems");
    }
    default:
      // Sweep 5, Finding 3: fing bisher rohe interne Enum-Werte (z.B. "CRAFT_ITEMS") auf jeder
      // Quest-Karte ab, weil ein neuer QuestObjectiveType hier nie verdrahtet wurde. Fallback
      // ist jetzt IMMER lokalisiert; ein Dev-Warnlog macht künftige Lücken sofort sichtbar
      // statt sie erst im Review zu entdecken.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(`[QuestsPage] objectiveLabel: unhandled QuestObjective type "${obj.type}" — add a case in objectiveLabel().`);
      }
      return t("app.unknown");
  }
}

/**
 * Vollständige Varianten-Namensliste als zusätzlicher title-Tooltip. Seit dem Contract-Wall-Pass
 * ist dieselbe Liste auch sichtbar ausgeschrieben; der Tooltip bleibt als kompakte Hover-/
 * Assistenzhilfe erhalten. `undefined` bei ≤2 Zielen, weil dort kein Zusatznutzen entsteht.
 */
export function objectiveFullTargets(
  obj: QuestObjective,
  tr: (v: LocalizedString) => string,
): string | undefined {
  if (obj.type !== "kill_monster" || !obj.targets || obj.targets.length <= 2) return undefined;
  return obj.targets
    .map((id) => {
      const m = content.monsters[id];
      return m ? tr(m.name) : id;
    })
    .join(", ");
}

// ── sub-components ────────────────────────────────────────────────────────────

export function ObjectiveBar({
  obj,
  progress,
  t,
  tr,
}: {
  obj: QuestObjective;
  progress: number;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const pct = clamp(obj.count > 0 ? (progress / obj.count) * 100 : 0, 0, 100);
  const done = progress >= obj.count;
  const jump = objectiveJump(obj);
  return (
    <div className="quest-obj">
      <div className="quest-obj-head">
        <span
          className={`quest-obj-label${done ? " quest-obj-label--done" : ""}${jump ? " obj-jumpable" : ""}`}
          title={jump ? (objectiveFullTargets(obj, tr) ?? t("quests.obj.jumpHint")) : objectiveFullTargets(obj, tr)}
          {...jumpProps(jump)}
        >
          {objectiveLabel(obj, t, tr)}
        </span>
        <span className="quest-obj-count">
          {Math.min(progress, obj.count)} / {obj.count}
        </span>
      </div>
      <div className="bar quest-obj-bar">
        <div
          className={`bar-fill${done ? " bar-fill--done" : ""}`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}

function RewardLine({
  quest,
  t,
  tr,
}: {
  quest: QuestDef;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const r = quest.rewards;
  const parts: JSX.Element[] = [];

  if (r.gold && r.gold > 0) {
    const goldSrc = COIN_ICON_URL;
    parts.push(
      <span key="gold" className="quest-reward-chip quest-reward-chip--gold">
        {goldSrc ? (
          <img loading="lazy" decoding="async" src={goldSrc} alt="" className="quest-reward-icon" />
        ) : (
          <span>🪙</span>
        )}
        {r.gold}
      </span>,
    );
  }
  if (r.items) {
    for (const { id, qty } of r.items) {
      const item: ItemDef | undefined = content.items[id];
      const img = getItemImage(id);
      parts.push(
        <span key={id} className="quest-reward-chip quest-reward-chip--item">
          {img ? (
            <img loading="lazy" decoding="async" src={img} alt={item ? tr(item.name) : id} className="quest-reward-img" />
          ) : (
            <span>{item?.icon ?? "?"}</span>
          )}
          {qty > 1 && <span className="quest-reward-qty">{qty}×</span>}
          <span>{item ? tr(item.name) : id}</span>
        </span>,
      );
    }
  }
  // Quest-Tokens (Task #274/#271): eigenes Feld auf QuestDef, NICHT Teil von `quest.rewards` —
  // content-dev verteilt die Werte parallel; leer/0/ungültig ⇒ kein Chip (RewardLine bleibt für
  // Quests ohne tokenReward unverändert).
  if (typeof quest.tokenReward === "number" && quest.tokenReward > 0) {
    const tokenSrc = TICKET_ICON_URL;
    parts.push(
      <span
        key="tokens"
        className="quest-reward-chip quest-reward-chip--tokens"
        title={t("quests.tokens.label")}
      >
        {tokenSrc ? (
          <img loading="lazy" decoding="async" src={tokenSrc} alt="" className="quest-reward-icon" />
        ) : (
          <span aria-hidden="true">🎟️</span>
        )}
        {quest.tokenReward}
      </span>,
    );
  }

  if (parts.length === 0) return <></>;
  return (
    <div className="quest-rewards">
      <span className="quest-rewards-label muted">{t("quests.rewards")}:</span>
      {parts}
    </div>
  );
}

// ── Quest-Token balance (Task #274/#271) ────────────────────────────────────

/**
 * Zweitwährungs-Anzeige (Icon + Bestand + Label). `size="lg"` für den prominenten Seiten-Kopf
 * (immer sichtbar, alle 3 Tabs), `size="md"` (Default) für den kleineren Beleg innerhalb des
 * Belohnungs-Shop-Panels. Icon via `TICKET_ICON_URL` (Mira-Set, s.o.); Emoji-Fallback bleibt als
 * Sicherheitsnetz, falls das Asset je fehlt.
 */
function QuestTokenBadge({
  t,
  balance,
  size = "md",
}: {
  t: (k: string) => string;
  balance: number;
  size?: "md" | "lg";
}): JSX.Element {
  const tokenSrc = TICKET_ICON_URL;
  return (
    <div className={`quest-token-badge quest-token-badge--${size}`}>
      <span className="quest-token-badge-icon" aria-hidden="true">
        {tokenSrc ? (
          <img loading="lazy" decoding="async" src={tokenSrc} alt="" className="quest-token-badge-icon-img" />
        ) : (
          <span>🎟️</span>
        )}
      </span>
      <span className="quest-token-badge-count">{balance}</span>
      <span className="quest-token-badge-label">{t("quests.tokens.label")}</span>
    </div>
  );
}

// ── Rewards Shop (Task #274/#284) — Offer-Karten + Kauf über buyTokenShopOffer ────────

/**
 * claude:2026-10-30T22:05:00+01:00 — Angebotskarte des Belohnungsladens als Hochkant-Karte (Bildband oben, Name, optionaler Text/Limit, Fuß mit Preis
 * und Kaufen). Die Karte kennt nur Darstellungsdaten, damit spätere Angebotsarten ohne Item-Bild (Symbol), mit
 * Tages-/Wochenlimit oder mit Beschreibung dieselbe Karte nutzen. Alle Zusatzfelder sind optional.
 */
interface ShopCardProps {
  name: string;
  /** Item-Bild; fehlt es, steht `symbol` (Emoji/Zeichen) im Bildband. */
  img?: string | null;
  symbol?: string;
  /** Bündelgröße als Badge am Bild (nur bei Items sinnvoll). */
  qty?: number;
  cost: number;
  /** Kurzer Erklärtext (z. B. bei Nicht-Item-Angeboten). */
  description?: string;
  /** Limit-Anzeige „2/3 diese Woche“. */
  limit?: { used: number; max: number; period: "day" | "week" };
  affordable: boolean;
  /** Limit erreicht: Knopf gesperrt, Hinweis „Ausverkauft“. */
  soldOut?: boolean;
  /** claude:2026-10-30T23:10:00+01:00 — Restgrenze als fertiger Text („noch 2 heute“); ersetzt `limit`, wenn gesetzt. */
  limitText?: string;
  /** Eigener Hinweis bei erreichter Grenze („Morgen wieder“), sonst „Ausverkauft“. */
  soldOutText?: string;
  /** Gesperrt (Kapitel/Talent fehlt): Karte grau, Bedingung als Text, Knopf aus. */
  lockedNote?: string;
  /** Zusatzzeile unter dem Text (z. B. Preisstaffel). */
  extra?: React.ReactNode;
  /** Dezente Herkunftsmarke (Kapitelnummer des Regals), nur im Laden. */
  origin?: string;
  onBuy: () => void;
  /** Klick auf Bild/Name (Item-Tooltip pinnen); ohne Handler nicht klickbar. */
  onInspect?: (e: React.MouseEvent) => void;
  onInspectKey?: (e: ReactKeyboardEvent<HTMLElement>) => void;
  t: (k: string) => string;
}

function ShopOfferCard({
  name, img, symbol, qty, cost, description, limit, limitText, soldOutText, lockedNote, extra, origin, affordable, soldOut, onBuy, onInspect, onInspectKey, t,
}: ShopCardProps): JSX.Element {
  const tokenSrc = TICKET_ICON_URL;
  const buyable = affordable && !soldOut && !lockedNote;
  const inspectProps = onInspect
    ? { role: "button" as const, tabIndex: 0, onClick: onInspect, onKeyDown: onInspectKey }
    : {};
  return (
    <div className={`quest-shop-offer${buyable ? "" : " quest-shop-offer--locked"}${soldOut ? " quest-shop-offer--soldout" : ""}${lockedNote ? " quest-shop-offer--gated" : ""}`}>
      <div className={`quest-shop-offer-imgwrap${onInspect ? " quest-shop-offer-inspect" : ""}`} {...inspectProps}>
        {img ? (
          <img loading="lazy" decoding="async" src={img} alt="" className="quest-shop-offer-img" />
        ) : (
          <span className="quest-shop-offer-emoji" aria-hidden="true">{symbol ?? "❔"}</span>
        )}
        {qty !== undefined && <span className="quest-shop-offer-qty">{qty}×</span>}
        {origin && <span className="quest-shop-offer-origin">{origin}</span>}{/* claude:2026-10-31T10:39:00+01:00 */}
      </div>
      <div className="quest-shop-offer-body">
        <span className={`quest-shop-offer-name${onInspect ? " quest-shop-offer-inspect" : ""}`} {...inspectProps}>{name}</span>
        {description && <p className="quest-shop-offer-desc">{description}</p>}
        {extra}
        {limitText ? (
          <span className="quest-shop-offer-limit">{limitText}</span>
        ) : limit ? (
          <span className="quest-shop-offer-limit">
            {t(`quests.shop.limit.${limit.period}`).replace("{used}", String(limit.used)).replace("{max}", String(limit.max))}
          </span>
        ) : null}
      </div>
      <div className="quest-shop-offer-foot">
        <span className="quest-shop-offer-cost" title={t("quests.tokens.label")}>
          {tokenSrc ? (
            <img loading="lazy" decoding="async" src={tokenSrc} alt="" className="quest-reward-icon" />
          ) : (
            <span aria-hidden="true">🎟️</span>
          )}
          <span className="quest-shop-offer-cost-num">{cost}</span>
        </span>
        <button
          className="btn-iron btn-iron--sm quest-shop-buy-btn"
          disabled={!buyable}
          onClick={onBuy}
          title={lockedNote ?? (soldOut ? soldOutText ?? t("quests.shop.soldOut") : affordable ? undefined : t("quests.shop.notEnough"))}
        >
          {t("quests.shop.buy")}
        </button>
        {lockedNote ? (
          <span className="quest-shop-offer-hint quest-shop-offer-gate">{lockedNote}</span>
        ) : (!affordable || soldOut) && (
          <span className="quest-shop-offer-hint">{soldOut ? soldOutText ?? t("quests.shop.soldOut") : t("quests.shop.notEnough")}</span>
        )}
      </div>
    </div>
  );
}

// claude:2026-10-30T23:10:00+01:00 — Belohnungsladen 1.4.2: Hilfen für Dienste und Regal-Angebote (Texte, Sperren, Grenzen).
type TFn = (k: string) => string;
type TrFn = (v: LocalizedString) => string;

/** Symbol je Dienstart (Bildband der Karte; Emoji-Rückfall wie bei Angeboten ohne Item-Bild). */
const SERVICE_SYMBOL: Record<string, string> = {
  dailyReroll: "🎲",
  orderCall: "📜",
  skillLesson: "📖",
  masteryLesson: "🎓",
  petTrail: "🐾",
};

/** „noch 2 heute“ / „noch 5 diese Woche“ aus Restgrenze und Zeitraum; ohne Grenze null. */
function remainingText(
  t: TFn,
  s: { remainingToday: number | null; remainingWeek: number | null },
): string | null {
  // Die engere Grenze führt: Tag vor Woche (gleiche Staffel-Regel wie die Engine).
  if (s.remainingToday !== null) return t("quests.svc.left.day").replace("{n}", String(s.remainingToday));
  if (s.remainingWeek !== null) return t("quests.svc.left.week").replace("{n}", String(s.remainingWeek));
  return null;
}

/** Bedingungstext eines Kapitel-Gates („Öffnet mit Kapitel 4: Aschefelder“). */
function chapterGateText(t: TFn, tr: TrFn, questId: string | undefined): string {
  const quest = questId ? content.quests.find((q) => q.id === questId) : undefined;
  if (!quest) return t("quests.svc.lock.chapterUnknown");
  const n = questId!.startsWith(CHRONICLE_ID_PREFIX) ? chronicleChapterNumber(questId!) : 0;
  return n > 0
    ? t("quests.svc.lock.chapter").replace("{n}", String(n)).replace("{name}", tr(quest.name))
    : t("quests.svc.lock.quest").replace("{name}", tr(quest.name));
}

/** Bedingungstext einer Sperre des Dienstes (Kapitel oder Talent mit Namen aus dem Content). */
function serviceLockText(t: TFn, tr: TrFn, lock: NonNullable<TokenServiceStatus["lock"]>): string {
  if (lock.kind === "shelf") return chapterGateText(t, tr, lock.questId);
  const node = lock.treeId && lock.nodeId
    ? content.talentTrees?.find((tt) => tt.id === lock.treeId)?.nodes.find((n) => n.id === lock.nodeId)
    : undefined;
  return node ? t("quests.svc.lock.talent").replace("{name}", tr(node.name)) : t("quests.svc.lock.talentUnknown");
}

/** Name eines Dienst-Ziels (Fertigkeit, Aktion, Begleiter, Tagesaufgabe). */
function serviceTargetName(def: TokenServiceDef, target: string, tr: TrFn): string {
  switch (def.kind) {
    case "skillLesson": return tr(content.skills[target]?.name ?? { en: target, de: target });
    case "masteryLesson": return tr(content.actions[target]?.name ?? { en: target, de: target });
    case "petTrail": return tr(content.pets?.[target]?.name ?? { en: target, de: target });
    case "dailyReroll": return tr(content.quests.find((q) => q.id === target)?.name ?? { en: target, de: target });
    default: return target;
  }
}

/** Mengen-Text einer Vorschau je Dienstart („+640 XP“, „+120 Meisterschafts-XP“, „2.400 Fehlwürfe gutgeschrieben“). */
function serviceAmountText(t: TFn, def: TokenServiceDef, amount: number): string {
  const n = formatNum(amount); // claude:2026-10-31T14:55:00+01:00 — Spielsprache statt Systemsprache (E5)
  switch (def.kind) {
    case "skillLesson": return t("quests.svc.amount.xp").replace("{n}", n);
    case "masteryLesson": return t("quests.svc.amount.mastery").replace("{n}", n);
    case "petTrail": return t("quests.svc.amount.pity").replace("{n}", n);
    case "dailyReroll": return t("quests.svc.amount.reroll");
    default: return t("quests.svc.amount.orderCall");
  }
}

/** Fehlertext eines Dienst-Kaufs oder einer Vorschau (alle Gründe der Engine). */
function serviceReasonText(t: TFn, reason: string | undefined): string {
  return t(`quests.svc.err.${reason ?? "unknown"}`);
}

/** Fehlertext eines Regal-Kaufs (`buyTokenShopOffer`), inkl. Grenze. */
function shopReasonText(t: TFn, reason: string | undefined): string {
  switch (reason) {
    case "no_space": return t("quests.shop.noSpace");
    case "limit": return t("quests.shop.err.limit");
    case "shelf_locked": return t("quests.shop.err.shelf_locked");
    case "not_enough_tokens": return t("quests.shop.notEnough");
    default: return t("quests.shop.err.unknown");
  }
}

/**
 * claude:2026-10-30T23:10:00+01:00 — Kauf-Dialog eines Dienstes: Ziel wählen (Fertigkeit, Aktion mit Fertigkeitsfilter, Begleiter, Tagesaufgabe),
 * Vorschau der Menge aus `tokenServicePreview`, Bestätigen über `buyTokenService`. Dienste ohne Ziel (Auftrag rufen) zeigen nur die Vorschau.
 * Die Zielliste wird je Dienst einmal gebildet (Marken/Grenzen ändern die Ziele nicht), die Vorschau liest jeden Render neu.
 */
function ServiceDialog({
  def,
  onClose,
  onDone,
  t,
  tr,
}: {
  def: TokenServiceDef;
  onClose: () => void;
  onDone: (text: string, ok: boolean) => void;
  t: TFn;
  tr: TrFn;
}): JSX.Element {
  const state = useGameState();
  const status = tokenServiceStatus(state, content, def.id);
  const [target, setTarget] = useState<string | undefined>(undefined);
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const all = useMemo<TokenServiceTarget[]>(() => {
    const list = tokenServiceTargets(state, content, def.id);
    // Meisterlehre: Aktionen ohne Wirkung (Meisterschaft am Deckel) sind keine Wahl, nur Rauschen.
    return def.kind === "masteryLesson" ? list.filter((x) => x.ok) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);
  const skillOfAction = (id: string): string => content.actions[id]?.skill ?? "";
  const filterSkills = def.kind === "masteryLesson" ? [...new Set(all.map((x) => skillOfAction(x.target)))].filter(Boolean) : [];
  const rows = def.kind === "masteryLesson" && skillFilter ? all.filter((x) => skillOfAction(x.target) === skillFilter) : all;
  const preview = tokenServicePreview(state, content, def.id, target);
  const needsTarget = status.needsTarget;
  const canConfirm = preview.ok && (!needsTarget || !!target);
  // claude:2026-10-31T14:55:00+01:00 — C2: Esc schließt den Dienst-Dialog (zentrale Esc-Registry).
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  // claude:2026-10-31T14:55:00+01:00 — B3: „Auftrag rufen“ zeigt die Restzeit der jeweiligen Stufen-Uhr.
  const orderClockMs = def.kind === "orderCall" ? (state.workOrders?.tierMs?.[(def.tier ?? 2) as 1 | 2 | 3] ?? 0) : 0;

  const confirm = (): void => {
    const res = buyTokenService(state, content, def.id, target);
    if (!res.ok) {
      setErr(serviceReasonText(t, res.reason));
      return;
    }
    const name = target ? serviceTargetName(def, target, tr) : "";
    const text =
      def.kind === "dailyReroll"
        ? t("quests.svc.done.dailyReroll").replace("{name}", res.questId ? serviceTargetName(def, res.questId, tr) : "")
        : t(`quests.svc.done.${def.kind}`).replace("{name}", name).replace("{n}", formatNum(res.amount));
    onDone(text, true);
    onClose();
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal quest-svc-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <h2 className="quest-svc-modal-title">{tr(def.name)}</h2>
        <p className="quest-svc-modal-desc">{tr(def.description)}</p>
        {needsTarget && (
          <>
            <div className="quest-svc-modal-label">{t(`quests.svc.pick.${def.kind}`)}</div>
            {filterSkills.length > 1 && (
              <div className="quest-svc-filter" role="tablist">
                <button type="button" className={`quest-shelf-tab${skillFilter === "" ? " is-active" : ""}`} onClick={() => setSkillFilter("")}>
                  {t("quests.svc.filterAll")}
                </button>
                {filterSkills.map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    className={`quest-shelf-tab${skillFilter === sk ? " is-active" : ""}`}
                    onClick={() => setSkillFilter(sk)}
                  >
                    {tr(content.skills[sk]?.name ?? { en: sk, de: sk })}
                  </button>
                ))}
              </div>
            )}
            <div className="quest-svc-targets" role="listbox">
              {rows.length === 0 && <p className="muted">{t("quests.svc.noTargets")}</p>}
              {rows.map((row) => (
                <button
                  key={row.target}
                  type="button"
                  role="option"
                  aria-selected={target === row.target}
                  disabled={!row.ok}
                  className={`quest-svc-target${target === row.target ? " is-active" : ""}`}
                  onClick={() => { setTarget(row.target); setErr(null); }}
                >
                  <span className="quest-svc-target-name">
                    {serviceTargetName(def, row.target, tr)}
                    {def.kind === "masteryLesson" && (
                      <span className="quest-svc-target-sub muted"> {tr(content.skills[skillOfAction(row.target)]?.name ?? { en: "", de: "" })}</span>
                    )}
                  </span>
                  <span className="quest-svc-target-amount">
                    {row.ok
                      ? serviceAmountText(t, def, row.amount)
                      : t(def.kind === "dailyReroll" ? `quests.svc.tgt.reroll.${row.reason}` : `quests.svc.tgt.${row.reason ?? "invalid_target"}`)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {def.kind === "orderCall" && (
          <p className="quest-svc-modal-desc muted">
            {orderClockMs > 0 ? t("quests.svc.orderClock").replace("{time}", formatEta(orderClockMs, t)) : t("quests.svc.orderClockReady")}
          </p>
        )}
        {def.kind === "dailyReroll" && <p className="quest-svc-modal-desc muted">{t("quests.svc.rerollQueueNote")}</p>}
        <div className={`quest-svc-preview${preview.ok ? "" : " is-bad"}`} role="status">
          {preview.ok
            ? t("quests.svc.previewOk").replace("{what}", serviceAmountText(t, def, preview.amount)).replace("{price}", String(preview.price))
            : needsTarget && !target && preview.reason === "invalid_target"
              ? t("quests.svc.pickFirst")
              : serviceReasonText(t, preview.reason)}
        </div>
        {err && <p className="quest-shop-notice" role="alert">{err}</p>}
        <div className="quit-confirm-actions">
          <button className="hf-btn" onClick={onClose}>{t("sidebar.quitCancel")}</button>
          <button className="hf-btn hf-btn--primary" disabled={!canConfirm} onClick={confirm}>
            {t("quests.svc.confirm").replace("{price}", String(status.price))}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Dienst-Karte: Name, Beschreibung, Staffelpreis, Restgrenze, Sperre mit Bedingung (L10). */
function TokenServiceCard({
  def,
  onOpen,
  t,
  tr,
}: {
  def: TokenServiceDef;
  onOpen: () => void;
  t: TFn;
  tr: TrFn;
}): JSX.Element {
  const state = useGameState();
  const s = tokenServiceStatus(state, content, def.id);
  const left = remainingText(t, s);
  const steps = def.tokenCostSteps;
  const period = s.limitPerDay !== null ? "day" : "week";
  return (
    <ShopOfferCard
      name={tr(def.name)}
      symbol={SERVICE_SYMBOL[def.kind]}
      cost={s.price}
      description={tr(def.description)}
      extra={
        steps && steps.length > 1 ? (
          <span className="quest-svc-steps">{t("quests.svc.steps").replace("{steps}", steps.join(" / "))}</span>
        ) : undefined
      }
      limitText={left ?? undefined}
      soldOut={s.remaining === 0}
      soldOutText={t(`quests.svc.back.${period}`)}
      lockedNote={s.lock ? serviceLockText(t, tr, s.lock) : undefined}
      affordable={s.affordable}
      onBuy={onOpen}
      t={t}
    />
  );
}

/**
 * Eine Item-Angebotszeile (Katalogangebot -> Karte): Bild/Name anklickbar (Item-Tooltip pinnen, Chef 2026-07-08),
 * Kauf bleibt beim Knopf. Bei zu wenig Tokens: Knopf gesperrt + Hinweis.
 * claude:2026-10-30T23:10:00+01:00 — Grenze (Gebührenschein 1/Woche) und Sperre des Regals (L10) kommen aus `tokenShopOfferStatus`.
 */
function TokenShopOfferCard({
  offer,
  origin,
  onBuy,
  t,
  tr,
}: {
  offer: TokenShopOffer;
  origin?: string;
  onBuy: () => void;
  t: TFn;
  tr: TrFn;
}): JSX.Element {
  const state = useGameState();
  const st = tokenShopOfferStatus(state, content, offer.id);
  const item: ItemDef | undefined = content.items[offer.itemId];
  const tooltip = useItemTooltip();
  const inspect = (e: React.MouseEvent): void => {
    e.stopPropagation();
    tooltip.pin(offer.itemId, e.clientX, e.clientY, []);
  };
  const inspectByKey = (e: ReactKeyboardEvent<HTMLElement>): void => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    tooltip.pin(offer.itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, []);
  };
  const left = remainingText(t, {
    remainingToday: st.limitPerDay !== null ? Math.max(0, st.limitPerDay - st.usedToday) : null,
    remainingWeek: st.limitPerDay === null && st.limitPerWeek !== null ? Math.max(0, st.limitPerWeek - st.usedThisWeek) : null,
  });
  return (
    <ShopOfferCard
      name={item ? tr(item.name) : offer.itemId}
      img={getItemImage(offer.itemId)}
      symbol={item?.icon}
      qty={offer.qty}
      origin={origin}
      cost={offer.tokenCost}
      affordable={st.affordable}
      limitText={left ?? undefined}
      soldOut={st.remaining === 0}
      soldOutText={t(`quests.svc.back.${st.limitPerDay !== null ? "day" : "week"}`)}
      lockedNote={st.locked ? chapterGateText(t, tr, st.lockQuestId) : undefined}
      onBuy={onBuy}
      onInspect={inspect}
      onInspectKey={inspectByKey}
      t={t}
    />
  );
}

/**
 * Belohnungs-Shop-Tab (Task #284, Regale seit #p13): Angebote aus `content.tokenShop`, gruppiert nach
 * `content.tokenShopShelves` (sortiert nach sortOrder; Angebote ohne Treffer landen defensiv im ersten
 * offenen Regal — Content-Vertrag „Angebote ohne shelfId fallen ins offene Regal"). Kauf läuft über
 * die Engine (`buyTokenShopOffer`: prüft Regal-Gate, Grenze, dann Tokens, liefert via addItemOrBank).
 * claude:2026-10-30T23:10:00+01:00 — 1.4.2: oben die Dienstleiste (`tokenServiceDefs`, Sofortwirkung mit Zielwahl im Dialog); zwei Spalten (links Laden als ein Raster, rechts Dienste);
 * gesperrte Regale erscheinen nur als Vorschau-Karte (31.10.). Jeder Fehlgrund der Engine hat eine Meldung.
 * claude:2026-10-17T20:10:00+02:00 — Regale als Reiterleiste statt Akkordeon: das zuletzt erreichte
 * Regal ist vorgewählt und steht damit sofort im Bild.
 */
function RewardsShopPanel({
  t,
  tr,
  onChanged,
}: {
  t: TFn;
  tr: TrFn;
  /** Seite neu zeichnen (Tagesbrett/Marken können sich geändert haben). */
  onChanged: () => void;
}): JSX.Element {
  const state = useGameState();
  const [, setBump] = useState(0);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [dialogId, setDialogId] = useState<string | null>(null);

  const shelves = [...(content.tokenShopShelves ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const allOffers = [...(content.tokenShop ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const services = tokenServiceDefs(content);
  const fallbackShelfId = shelves.find((s) => !s.requiresQuest)?.id ?? shelves[0]?.id;
  const offersByShelf = new Map<string, TokenShopOffer[]>();
  for (const offer of allOffers) {
    const key = (offer.shelfId && shelves.some((s) => s.id === offer.shelfId)) ? offer.shelfId : fallbackShelfId;
    if (!key) continue;
    (offersByShelf.get(key) ?? offersByShelf.set(key, []).get(key)!).push(offer);
  }

  // claude:2026-10-31T10:39:00+01:00 — EIN Raster: Waren aller offenen Regale (Startregal zuerst, dann Kapitelreihenfolge), je gesperrtem Regal nur EINE Vorschau-Karte.
  const listed = shelves.filter((s) => (offersByShelf.get(s.id)?.length ?? 0) > 0);
  const openShelves = listed.filter((s) => isShelfOpen(state, content, s.id));
  const lockedShelves = listed.filter((s) => !isShelfOpen(state, content, s.id));
  const shownOffers = openShelves.flatMap((sh) => (offersByShelf.get(sh.id) ?? []).map((offer) => ({ offer, shelf: sh })));

  const buy = (offer: TokenShopOffer): void => {
    const bankBefore = state.bank[offer.itemId] ?? 0;
    const res = buyTokenShopOffer(state, content, offer.id);
    if (res.ok) {
      const item = content.items[offer.itemId];
      // claude:2026-10-31T14:55:00+01:00 — D13: bei vollem Inventar liefert die Engine in die Bank; die Meldung sagt es.
      const toBank = (state.bank[offer.itemId] ?? 0) > bankBefore;
      notePurchasedItem(offer.itemId, offer.qty ?? 1); // claude:2026-10-31T15:30:00+01:00 — E10: kein „Seltener Fund!“ für Ladenware
      setNotice({ text: t(toBank ? "quests.shop.boughtBank" : "quests.shop.bought").replace("{name}", item ? tr(item.name) : offer.itemId), ok: true });
    } else {
      setNotice({ text: shopReasonText(t, res.reason), ok: false });
    }
    setBump((b) => b + 1);
    onChanged();
  };

  const hasOffers = allOffers.length > 0;
  const dialogDef = dialogId ? services.find((d) => d.id === dialogId) : undefined;

  return (
    <div className="quest-shop-panel">{/* claude:2026-10-31T10:39:00+01:00 */}
      <div className="quest-shop-top">
        <p className="quest-shop-panel-desc muted">{t("quests.shop.subtitle")}</p>
      </div>
      {notice && (
        <p className={`quest-shop-notice${notice.ok ? " quest-shop-notice--ok" : ""}`} role={notice.ok ? "status" : "alert"}>{notice.text}</p>
      )}
      <div className="quest-shop-cols">
        <section className="quest-shop-col quest-shop-col--wares">
          <div className="quest-shelf-head">
            <h3 className="quest-shelf-title">{t("quests.shop.title")}</h3>
            <span className="quest-shelf-head-count muted">{shownOffers.length}</span>
          </div>
          {!hasOffers ? (
            <div className="quest-shop-grid quest-shop-grid--empty">
              <div className="placeholder quest-shop-empty">
                <div className="placeholder-icon">
                  {TICKET_ICON_URL ? <img loading="lazy" decoding="async" src={TICKET_ICON_URL} alt="" className="ui-icon" /> : "🎟️"}
                </div>
                <p className="muted">{t("quests.shop.comingSoon")}</p>
              </div>
            </div>
          ) : (
            <div className="quest-shop-grid">
              {shownOffers.map(({ offer, shelf }) => {
                const n = shelf.requiresQuest?.startsWith(CHRONICLE_ID_PREFIX) ? chronicleChapterNumber(shelf.requiresQuest) : 0;
                return (
                  <TokenShopOfferCard
                    key={offer.id}
                    offer={offer}
                    origin={n > 0 ? t("quests.shop.origin").replace("{n}", String(n)) : undefined}
                    onBuy={() => buy(offer)}
                    t={t}
                    tr={tr}
                  />
                );
              })}
            </div>
          )}
          {lockedShelves.length > 0 && (
            <div className="quest-shop-previews">
              {lockedShelves.map((shelf) => (
                <div key={shelf.id} className="quest-shop-preview" title={tr(shelf.name)}>
                  <span className="quest-shop-preview-lock" aria-hidden="true">🔒</span>
                  <span className="quest-shop-preview-count">{t("quests.shop.previewMore").replace("{count}", String(offersByShelf.get(shelf.id)?.length ?? 0))}</span>
                  <span className="quest-shop-preview-gate">{chapterGateText(t, tr, shelf.requiresQuest)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        {services.length > 0 && (
          <section className="quest-shop-col quest-shop-col--svc">
            <div className="quest-shelf-head">
              <h3 className="quest-shelf-title">{t("quests.svc.title")}</h3>
            </div>
            <p className="quest-svc-note muted">{t("quests.svc.subtitle")}</p>
            <div className="quest-svc-list">
              {services.map((def) => (
                <TokenServiceCard key={def.id} def={def} onOpen={() => { setNotice(null); setDialogId(def.id); }} t={t} tr={tr} />
              ))}
            </div>
          </section>
        )}
      </div>
      {dialogDef && (
        <ServiceDialog
          def={dialogDef}
          onClose={() => { setDialogId(null); setBump((b) => b + 1); onChanged(); }}
          onDone={(text, ok) => setNotice({ text, ok })}
          t={t}
          tr={tr}
        />
      )}
    </div>
  );
}

// ── Aschechronik — Story-Tab (ceo-run-2026-07-13 Welle H) ───────────────────────
//
// Chef-Feedback: die Kapitel-Übersicht war "stuck in der Sidebar" und zu klein (Kompass-Pin,
// s. altes components/ChronicleCompass.tsx — komplett entfernt) bzw. nur ein schmales Band über
// der normalen Quest-Liste (altes ChronicleBand). Beides ersetzt durch einen eigenen, prominenten
// Tab ("quests.daily.tab.chronicle") ganz links auf der QuestsPage, der die volle Content-Fläche
// nutzt. Zusatz-Feedback (frisch): "was ist zu tun, wann ist man fertig" — glasklare Ziel-Zeilen
// (WAS+WO+Fortschritt), ein unübersehbarer Fertig-Zustand und eine "Schaltet frei"-Vorschau.

/** Wo ein Objective erfüllt wird (Zonen-Name des Ziel-Monsters bzw. der Paragonturm) — Chef-
 *  Zusatz Welle H: "glasklare Ziel-Zeilen" auf der aktiven Kapitel-Bühne. `null` für Objective-
 *  Typen ohne sinnvollen Ort (Skill-Level/Sammel-/Handwerks-/Gesamt-Kill-Ziele gelten überall).
 *  Fix-Welle S (Sela-Bug): `dungeonOnly`-Ziel-Monster (Boss-Kapitel wie chronicle_05/_13/_17/_18/
 *  _19/_20) sind in ihrer `monster.zone` gar nicht kämpfbar — sie leben ausschließlich als
 *  Dungeon-Welle. Für die zeigt diese Zeile jetzt den DUNGEON-Namen (`monsterHomeDungeon`,
 *  util/chronicle.ts, geteilt mit der analogen Auflösung in BestiaryPage). Nicht-dungeonOnly-Ziele
 *  bleiben unverändert bei der Zonen-Anzeige.
 *  Richtigstellung 31.08.2026: Hier stand, chronicle_11 ziele „bewusst" auf die offene
 *  Zweitquelle `skeleton_nekro` in der Krypta. Das war keine Absicht, sondern der Grund, warum
 *  sich das Boss-Kapitel von selbst erledigte (Chef-Report). Es zählt jetzt geräumte Durchgänge
 *  des Dungeons (`dungeons_cleared`), s. content chronicle_11. */
function objectiveLocation(
  obj: QuestObjective,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string | null {
  if (obj.type === "reach_paragon_floor") return t("paragon.sectionTitle");
  if (obj.type === "dungeons_cleared") {
    const dungeon = obj.target ? content.dungeons.find((d) => d.id === obj.target) : undefined;
    return dungeon ? tr(dungeon.name) : null;
  }
  if (obj.type === "kill_monster") {
    const id = obj.targets?.[0] ?? obj.target;
    const monster = id ? content.monsters[id] : undefined;
    if (!monster) return null;
    if (monster.dungeonOnly) {
      const dungeon = monsterHomeDungeon(content, monster.id);
      if (dungeon) return tr(dungeon.name);
      // Fallback: dungeonOnly ohne auffindbaren encounters-Eintrag sollte laut Content-Konvention
      // nie vorkommen, aber ein stummer null ist sicherer als eine irreführende Zonen-Anzeige.
      return null;
    }
    const zone = monster.zone ? content.zones.find((z) => z.id === monster.zone) : undefined;
    return zone ? tr(zone.name) : null;
  }
  return null;
}

/** Große, gut lesbare Ziel-Zeile für die aktive Kapitel-Bühne: WAS (`objectiveLabel`), WO
 *  (`objectiveLocation`), Fortschritt groß + Balken + Häkchen bei Erfüllung. Ersetzt hier bewusst
 *  die kompakte `ObjectiveBar` (die bleibt unverändert für Quest-/Daily-Karten) — der Chef wollte
 *  explizit unübersehbare Ziel-Zeilen auf der Bühne, nicht nur einen schmalen Balken. */
function ChronicleObjectiveRow({
  obj,
  progress,
  t,
  tr,
}: {
  obj: QuestObjective;
  progress: number;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const pct = clamp(obj.count > 0 ? (progress / obj.count) * 100 : 0, 0, 100);
  const done = progress >= obj.count;
  const where = objectiveLocation(obj, t, tr);
  const jump = objectiveJump(obj); // claude:2026-10-31T16:34:28+01:00 — Ziel anklickbar (Ideen-Welle 1.4.2)
  return (
    <div className={`chronicle-obj${done ? " chronicle-obj--done" : ""}`}>
      <div className="chronicle-obj-head">
        <span className="chronicle-obj-check" aria-hidden="true">{done ? "✓" : ""}</span>
        <span
          className={`chronicle-obj-label${jump ? " obj-jumpable" : ""}`}
          title={jump ? (objectiveFullTargets(obj, tr) ?? t("quests.obj.jumpHint")) : objectiveFullTargets(obj, tr)}
          {...jumpProps(jump)}
        >{objectiveLabel(obj, t, tr)}</span>
        {where && (
          <span className="chronicle-obj-where" title={t("chronicle.obj.where")}>
            <span aria-hidden="true">
              {PIN_ICON_URL ? <img loading="lazy" decoding="async" src={PIN_ICON_URL} alt="" className="ui-icon" /> : "📍"}
            </span>{" "}
            {where}
          </span>
        )}
        <span className="chronicle-obj-count">{Math.min(progress, obj.count)} / {obj.count}</span>
      </div>
      <div className="bar chronicle-obj-bar">
        <div className={`bar-fill${done ? " bar-fill--done" : ""}`} style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  );
}

/** "Schaltet frei:"-Zeile (Chef-Zusatz Welle H, Dungeons ergänzt Welle L): Zonen UND Dungeons,
 *  die der Abschluss DIESER Quest öffnet (`util/chronicle.ts` `unlocksForQuest`). Rendert nichts,
 *  wenn diese Quest kein Kampfgebiet gate't (die meisten Kapitel). Dungeon-Unlocks bekommen einen
 *  eigenen Chip-Akzent + „Dungeon"-Label (`chronicle.unlockKind.dungeon`) statt optisch mit
 *  Zonen-Chips zu verschmelzen — Chef-Direktive „Gebiet für Gebiet, Dungeon um Dungeon": der
 *  Spieler soll auf einen Blick sehen, WELCHE Art Kampfgebiet dieses Kapitel öffnet. */
function ChronicleUnlocksLine({
  questId,
  t,
  tr,
}: {
  questId: string;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element | null {
  const unlocks = unlocksForQuest(content, questId);
  if (unlocks.length === 0) return null;
  return (
    <div className="quest-rewards">
      <span className="quest-rewards-label muted">{t("chronicle.unlocks")}:</span>
      {unlocks.map((u) => (
        <span
          key={u.id}
          className={`quest-reward-chip quest-reward-chip--unlock${u.kind === "dungeon" ? " quest-reward-chip--unlock-dungeon" : ""}`}
        >
          {u.kind === "dungeon" && (
            <span className="quest-reward-chip-kind" aria-hidden="true">
              {t("chronicle.unlockKind.dungeon")}
            </span>
          )}
          {tr(u.name)}
        </span>
      ))}
    </div>
  );
}

/** Wächter-Kopf-Medaillon für die Chronik-Bühne — extrahiert, weil ceo-run-2026-07-14 Welle Y
 *  (Anti-Spoiler-Umbau) denselben Medaillon-Rahmen jetzt an ZWEI Stellen braucht (Anweisung im
 *  Status "active", Payoff im Status "completed"), s. ChronicleStoryTab unten. */
function GuideMedallion(): JSX.Element {
  // Welle QQ (2026-07-17): echtes Wächter-Porträt statt des Brenna-Platzhalters.
  const src = getPortrait("npc_warden");
  return (
    <div className="npc-greeting-head" aria-hidden="true">
      {src ? (
        <img loading="lazy" decoding="async" src={src} alt="" className="npc-greeting-img" />
      ) : DIALOG_ICON_URL ? (
        <img loading="lazy" decoding="async" src={DIALOG_ICON_URL} alt="" className="ui-icon npc-greeting-fallback" />
      ) : (
        <span className="npc-greeting-fallback">🗨</span>
      )}
    </div>
  );
}

/**
 * Story-Tab-Inhalt: das aktive Kapitel als große Bühne (Kapitel-Zähler, großer Titel, Wächter-
 * Medaillon + Sprechblase, Ziel-Zeilen, "Schaltet frei", prominenter Claim-Button) — abgeschlossene
 * Kapitel darunter als aufklappbare Historie. Kommende (gesperrte) Kapitel werden bewusst NICHT
 * gelistet. Zeigt einen dezenten Leerzustand statt `null`, sobald der Content keine chronicle_*-
 * Quests definiert — der Tab ist jetzt eigenständig, kein optionaler Zusatz mehr wie zuvor der
 * Kompass-Pin/das Band (die beide bei fehlendem Content einfach unsichtbar blieben).
 *
 * Anti-Spoiler-Umbau (ceo-run-2026-07-14 Welle Y, Corvin-Befund 1): der `loreText` ist im
 * Präteritum geschrieben ("Du hast ihn zurückgeschlagen") — die volle Enthüllung DARF also erst
 * erscheinen, NACHDEM das Kapitel tatsächlich erfüllt ist. Solange das Kapitel noch läuft
 * (`status === "active"`), spricht die Sprechblase stattdessen die funktionale `description`
 * (inkl. der Warnsätze, z.B. Kap. 13/16/19) — das war vorher die separate, kursive
 * `.chronicle-stage-directive`-Zeile UNTER der (spoilernden) loreText-Blase; die Zeile wandert
 * jetzt schlicht IN die Blase. Erst wenn `status === "completed"` wird die Blase zum frisch
 * geschriebenen Chronik-Eintrag (`loreText`, der eigentliche Payoff direkt am pulsierenden
 * Claim-Button) — ein kurzes Einblenden markiert den Wechsel (`.chronicle-payoff`,
 * prefers-reduced-motion-safe, s. chronicle.css). Die Historie (claimed) bleibt unverändert beim
 * loreText — dort ist er ja längst kein Spoiler mehr.
 */
function ChronicleStoryTab({
  t,
  tr,
  onClaim,
}: {
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
  onClaim: (questId: string) => void;
}): JSX.Element {
  const state = useGameState();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const chapters = chronicleChapters(content);

  if (chapters.length === 0) {
    return (
      <div className="placeholder">
        <div className="placeholder-icon">
          {JOURNAL_ICON_URL ? <img loading="lazy" decoding="async" src={JOURNAL_ICON_URL} alt="" className="ui-icon" /> : "📖"}
        </div>
        <p className="muted">{t("chronicle.empty")}</p>
      </div>
    );
  }

  const active = activeChronicleChapter(state, content);
  const claimedChapters = chapters.filter((q) => questStatus(state, content, q) === "claimed");

  const toggleExpand = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="chronicle-tab">
      <header className="chronicle-tab-head">
        <span className="chronicle-tab-kicker">{t("chronicle.title")}</span>
        {/* claude:2026-10-30T22:05:00+01:00 — Kapitelleiste: ein Segment je Kapitel (geschrieben, laufend, offen), nur Nummern, keine Vorschau. */}
        <span
          className="chronicle-strip"
          role="img"
          aria-label={t("chronicle.chapterOf")
            .replace("{n}", String(active ? active.chapter : claimedChapters.length))
            .replace("{total}", String(chapters.length))}
        >
          {chapters.map((q) => {
            const st = questStatus(state, content, q);
            const cls = st === "claimed" ? "is-written" : q.id === active?.quest.id ? "is-current" : "";
            return <i key={q.id} className={cls} title={String(chronicleChapterNumber(q.id)).padStart(2, "0")} />;
          })}
        </span>
        <span className="chronicle-tab-counter">
          {t("chronicle.chapterOf")
            .replace("{n}", String(active ? active.chapter : claimedChapters.length))
            .replace("{total}", String(chapters.length))}
        </span>
        {/* claude:2026-10-18T14:00:00+02:00 — Erinnerung (Narbenbuch „Bekannte Seiten"), nur mit gekauftem Knoten. In der
            Kopfzeile statt als eigenes Kind: die Contract-Wall-Variante legt .chronicle-tab als Raster mit festen Zeilen an. */}
        <PrestigeRecallBar />
      </header>

      {active ? (
        <section className={`chronicle-stage${active.status === "completed" ? " chronicle-stage--done" : ""}`}>
          <div className="chronicle-stage-headrow">
            <span className="chronicle-stage-chapnum">{String(active.chapter).padStart(2, "0")}</span>
            <h2 className="chronicle-stage-title">{tr(active.quest.name)}</h2>
            <span className={`quest-status-badge quest-status-badge--${active.status}`}>
              {t(`quests.status.${active.status}`)}
            </span>
          </div>

          {/* Wächter-Sprechblase: solange das Kapitel läuft, spricht sie die funktionale
              Anweisung (description, inkl. Warnsätze) — die volle Enthüllung (loreText) käme
              hier ihrem eigenen Klimax zuvor. Fehlt description (sollte laut Content-Konvention
              nie vorkommen), zeigt die Bühne NUR die Ziele, kein leerer/kaputter Bereich. */}
          {active.status === "active" && active.quest.description && (
            <div className="npc-greeting chronicle-stage-npc">
              <GuideMedallion />
              <NpcSpeechBubble name={t("npc.guide.name")}>{tr(active.quest.description)}</NpcSpeechBubble>
            </div>
          )}

          {/* Payoff-Moment: Ziele erfüllt, noch nicht eingelöst — jetzt darf der Wächter den
              Klimax schreiben. `key` erzwingt einen echten Remount beim Statuswechsel, damit die
              Einblend-Animation (.chronicle-payoff, CSS) zuverlässig genau EINMAL abspielt, statt
              beim nächsten Tick-Re-Render stumm zu bleiben (React würde den bestehenden DOM-Knoten
              sonst nur patchen statt neu einzufügen). */}
          {active.status === "completed" && active.quest.loreText && (
            <div className="npc-greeting chronicle-stage-npc chronicle-payoff" key={`payoff-${active.quest.id}`}>
              <GuideMedallion />
              <NpcSpeechBubble name={t("npc.guide.name")}>{tr(active.quest.loreText)}</NpcSpeechBubble>
            </div>
          )}

          {/* Erledigte Anweisung als kleine, dezente Zeile darunter — kein Warnhinweis mehr,
              nur der Nachhall dessen, was verlangt war (kleiner/gedämpfter als die aktive
              Direktiven-Zeile, s. chronicle.css `.chronicle-stage-directive--done`). */}
          {active.status === "completed" && active.quest.description && (
            <p className="chronicle-stage-directive chronicle-stage-directive--done">
              {tr(active.quest.description)}
            </p>
          )}

          <div className="chronicle-stage-objectives">
            {active.quest.objectives.map((obj, i) => (
              <ChronicleObjectiveRow
                key={i}
                obj={obj}
                /* claude:2026-10-18T14:00:00+02:00 — nach einem Aufstieg zählt der Laufanker (Lebenszeit-Summen bleiben). */
                progress={questObjectiveProgress(state, content, active.quest, i)}
                t={t}
                tr={tr}
              />
            ))}
          </div>

          <div className="quest-stage-foot">{/* claude:2026-10-30T22:05:00+01:00 */}
            <div className="quest-stage-foot-info">
              <RewardLine quest={active.quest} t={t} tr={tr} />
              <ChronicleUnlocksLine questId={active.quest.id} t={t} tr={tr} />
            </div>
            {active.status === "completed" && (
              <button className="quest-claim-btn chronicle-stage-claim" onClick={() => onClaim(active.quest.id)}>
                {t("chronicle.stage.claim")}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="chronicle-stage chronicle-stage-complete">
          <p className="muted">{t("chronicle.allClaimed")}</p>
        </section>
      )}

      {(active || claimedChapters.length > 0) && (
        <section className="chronicle-history">{/* claude:2026-10-30T23:20:00+01:00 — Kapitelliste: laufendes Kapitel hervorgehoben oben, geschriebene darunter (neueste zuerst), Chroniktext klappt auf */}
          <h3 className="chronicle-history-title">
            {t("chronicle.chapters")} <span className="muted">{claimedChapters.length}/{chapters.length}</span>
          </h3>
          <div className="chronicle-history-list">
            {active && (
              <div className="chronicle-history-row chronicle-history-row--current">
                <div className="chronicle-history-row-head">
                  <span className="chronicle-history-num">{String(active.chapter).padStart(2, "0")}</span>
                  <span className="chronicle-history-name">{tr(active.quest.name)}</span>
                  <span className={`quest-status-badge quest-status-badge--${active.status}`}>{t(`quests.status.${active.status}`)}</span>
                </div>
              </div>
            )}
            {[...claimedChapters].reverse().map((q) => {
              const num = chronicleChapterNumber(q.id);
              const open = expanded.has(q.id);
              return (
                <div key={q.id} className="chronicle-history-row">
                  <button
                    type="button"
                    className="chronicle-history-row-head"
                    onClick={() => toggleExpand(q.id)}
                    aria-expanded={open}
                  >
                    <span className="chronicle-history-num">{String(num).padStart(2, "0")}</span>
                    <span className="chronicle-history-name">{tr(q.name)}</span>
                    <span className="chronicle-history-caret">{open ? "▾" : "▸"}</span>
                  </button>
                  {open && q.loreText && (
                    <p className="chronicle-history-text">{tr(q.loreText)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Contracts tab — Master-Detail (Chef-Auftrag Welle X, 2026-07-16) ───────────────────────
//
// Vorher: eine flache `quests-list` aus `QuestCard`-Karten, sortiert nach Status. Chef-Feedback:
// "keine einfache Liste. Komplexeres und interessanteres Layout, Platz für Quest-NPCs mit Kopf
// und Sprechblase einplanen." Jetzt: Master (links, nach Strängen gruppierte Kurzliste — s.
// util/questStrands.ts `deriveQuestStrands`, Ableitung dort dokumentiert) + eine Detail-Bühne
// (rechts), die im Muster der Aschechronik-Bühne aufgebaut ist (`ChronicleStoryTab` oben):
// NPC-Kopf-Medaillon + Sprechblase, große Ziel-Zeilen (`ChronicleObjectiveRow`, inkl. WO-Zeile),
// Rewards, Claim-Button. Der `QuestCard`-Baustein (Karten-Liste) entfällt hier ersatzlos — der
// Daily-Tab hat weiterhin seine eigene, unveränderte `DailyQuestCard`.

interface ContractFlatItem {
  quest: QuestDef;
  status: QuestStatus;
  rootId: string;
}

/** Detail-Bühne einer einzelnen Auftrags-Quest — reuses `.chronicle-stage`/`.chronicle-obj`/
 *  `.npc-greeting` (chronicle.css/npc-greeting.css, beide bereits von QuestsPage importiert) statt
 *  eigener Karten-Optik, wie vom Chef verlangt ("im Muster der Chronik-Bühne"). */
function ContractDetailStage({
  quest,
  status,
  strandRootId,
  onClaim,
  t,
  tr,
}: {
  quest: QuestDef;
  status: QuestStatus;
  strandRootId: string;
  onClaim: () => void;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const state = useGameState();
  const speaker = questSpeaker(strandRootId);
  const speakerPortrait = getPortrait(speaker.portraitId);
  const claimable = status === "completed";
  const locked = status === "locked";

  return (
    <section
      className={`chronicle-stage quest-detail-stage${status === "completed" ? " chronicle-stage--done" : ""}${locked ? " quest-detail-stage--locked" : ""}`}
    >
      <div className="chronicle-stage-headrow">
        <h2 className="chronicle-stage-title">{tr(quest.name)}</h2>
        <span className={`quest-status-badge quest-status-badge--${status}`}>
          {t(`quests.status.${status}`)}
        </span>
      </div>

      {/* Questgeber — Sprechblase trägt hier die knappe Ziel-`description` (nicht `loreText`,
          das gibt es nur bei Aschechronik-Kapiteln), s. questSpeaker()-Mapping in util/questStrands.ts. */}
      <div className="npc-greeting chronicle-stage-npc">
        <div className="npc-greeting-head" aria-hidden="true">
          {speakerPortrait ? (
            <img loading="lazy" decoding="async" src={speakerPortrait} alt="" className="npc-greeting-img" />
          ) : DIALOG_ICON_URL ? (
            <img loading="lazy" decoding="async" src={DIALOG_ICON_URL} alt="" className="ui-icon npc-greeting-fallback" />
          ) : (
            <span className="npc-greeting-fallback">🗨</span>
          )}
        </div>
        <NpcSpeechBubble name={t(speaker.nameKey)}>{tr(quest.description)}</NpcSpeechBubble>
      </div>

      {locked ? (
        quest.requires &&
        quest.requires.length > 0 && (
          <div className="quest-locked-hint muted">
            {t("quests.requires")}:{" "}
            {quest.requires.map((reqId, i) => {
              const req = content.quests.find((q) => q.id === reqId);
              return (
                <span key={reqId}>
                  {i > 0 && ", "}
                  {req ? tr(req.name) : reqId}
                </span>
              );
            })}
          </div>
        )
      ) : (
        <div className="chronicle-stage-objectives">
          {quest.objectives.map((obj, i) => (
            <ChronicleObjectiveRow
              key={i}
              obj={obj}
              /* claude:2026-10-18T14:00:00+02:00 — Laufanker nach einem Aufstieg (questObjectiveProgress). */
              progress={questObjectiveProgress(state, content, quest, i)}
              t={t}
              tr={tr}
            />
          ))}
        </div>
      )}

      <div className="quest-stage-foot">{/* claude:2026-10-30T22:05:00+01:00 */}
        <div className="quest-stage-foot-info">
          <RewardLine quest={quest} t={t} tr={tr} />
          <ChronicleUnlocksLine questId={quest.id} t={t} tr={tr} />
        </div>
        {claimable && (
          <button className="quest-claim-btn chronicle-stage-claim" onClick={onClaim}>
            {t("quests.claim")}
          </button>
        )}
        {status === "claimed" && (
          <div className="quest-claimed-mark">{t("quests.claimed")}</div>
        )}
      </div>
    </section>
  );
}

/** Contracts-Tab-Inhalt: Master (Strang-Liste, links) + Detail-Bühne (rechts). Bricht ≤1100px auf
 *  gestapelt um (CSS, s. quests.css `.quest-contracts`); der Master wird dort zur aufklappbaren
 *  Sektion (`.quest-master-toggle`, nur dort sichtbar). */
function ContractsTab({
  t,
  tr,
  onClaim,
}: {
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
  onClaim: (questId: string) => void;
}): JSX.Element {
  const state = useGameState();
  const strands = deriveQuestStrands(content);

  const strandInfo = strands.map((strand) => {
    const items: ContractFlatItem[] = strand.quests.map((quest) => ({
      quest,
      status: questStatus(state, content, quest),
      rootId: strand.rootId,
    }));
    const claimedCount = items.filter((i) => i.status === "claimed").length;
    // "Aktive/claimbare Stränge oben" (Chef-Vorgabe) — niedrigster STATUS_ORDER-Index gewinnt
    // (["completed","active","locked","claimed"], dieselbe Reihenfolge wie in der alten Flat-List).
    const rank = Math.min(...items.map((i) => STATUS_ORDER.indexOf(i.status)));
    return { strand, items, claimedCount, rank };
  });
  // Aktive/claimbare Stränge oben (Chef-Vorgabe), Rest danach — stabile Sortierung, Ursprungs-
  // Reihenfolge (= Content-Array-Reihenfolge) bleibt bei Rang-Gleichstand erhalten.
  const sortedStrandInfo = [...strandInfo].sort((a, b) => a.rank - b.rank);

  // Alle Hooks laufen unconditional VOR dem "leerer Content"-Guard weiter unten (Rules of Hooks) —
  // strandInfo ist bei leerem Content einfach [], die Lazy-Initializer ergeben dann ein leeres Set.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Ganze Master-Sektion aufgeklappt/eingeklappt — wirkt nur ≤1100px (s. CSS); Default offen,
  // damit der neue Strang-Master beim ersten Besuch nicht "unsichtbar" bleibt.
  const [masterOpen, setMasterOpen] = useState(true);
  // Default-Einklapp-Zustand EINMAL beim ersten Rendern berechnen (Lazy-Initializer): Stränge mit
  // einer claimbaren/aktiven Quest starten aufgeklappt, rein gesperrte oder komplett eingelöste
  // Stränge starten eingeklappt (brauchen gerade keine Aufmerksamkeit).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const info of strandInfo) {
      if (info.rank >= 2) initial.add(info.strand.rootId);
    }
    return initial;
  });

  if (strands.length === 0) {
    return (
      <div className="placeholder">
        <div className="placeholder-icon">
          {QUESTS_ICON_URL ? <img loading="lazy" decoding="async" src={QUESTS_ICON_URL} alt="" className="ui-icon" /> : "📜"}
        </div>
        <p className="muted">{t("quests.comingSoon")}</p>
      </div>
    );
  }

  const toggleStrand = (rootId: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  const flatItems: ContractFlatItem[] = sortedStrandInfo.flatMap((info) => info.items);
  // Ohne manuelle Auswahl: oberste claimbare Quest, sonst oberste aktive Quest (Reihenfolge dank
  // sortedStrandInfo bereits "claimbare/aktive Stränge zuerst"). "Nie leer" — außer wirklich ALLES
  // ist eingelöst, dann bleibt defaultItem undefined und die Bühne zeigt den Leerzustand unten.
  const defaultItem =
    flatItems.find((i) => i.status === "completed") ?? flatItems.find((i) => i.status === "active") ?? null;
  const activeId = selectedId ?? defaultItem?.quest.id ?? null;
  const selectedItem = activeId ? flatItems.find((i) => i.quest.id === activeId) ?? null : null;

  return (
    <div className="quest-contracts">
      <aside className={`quest-master${masterOpen ? " quest-master--open" : ""}`}>
        <div className="quest-master-heading">{t("quests.contracts.lines")}</div>
        <button
          type="button"
          className="quest-master-toggle"
          onClick={() => setMasterOpen((o) => !o)}
          aria-expanded={masterOpen}
        >
          <span className="quest-master-toggle-caret" aria-hidden="true">{masterOpen ? "▾" : "▸"}</span>
          {t("quests.contracts.lines")}
        </button>
        <div className="quest-strand-list">
          {sortedStrandInfo.map(({ strand, items, claimedCount }) => {
            const isCollapsed = collapsed.has(strand.rootId);
            return (
              <div className="quest-strand" key={strand.rootId}>
                <button
                  type="button"
                  className="quest-strand-head"
                  onClick={() => toggleStrand(strand.rootId)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="quest-strand-caret" aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
                  <span className="quest-strand-name">{tr(strand.rootName)}</span>
                  {/* Kompakte "x/y" im Kopf (Platz ist eng, s. Chef-Kritik-Muster "nichts
                      Gequetschtes") — die volle, lokalisierte Phrase ("x / y completed") bleibt
                      als title-Tooltip erhalten, reuses weiterhin denselben quests.progress-Key. */}
                  <span
                    className="quest-strand-progress muted"
                    title={t("quests.progress")
                      .replace("{done}", String(claimedCount))
                      .replace("{total}", String(items.length))}
                  >
                    {claimedCount}/{items.length}
                  </span>
                  {/* claude:2026-10-30T22:05:00+01:00 — schmaler Strangfortschritt unter dem Kopf */}
                  <span className="quest-strand-bar" aria-hidden="true">
                    <i style={{ transform: `scaleX(${items.length > 0 ? claimedCount / items.length : 0})` }} />
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="quest-strand-rows">
                    {items.map(({ quest, status }) => (
                      <button
                        type="button"
                        key={quest.id}
                        className={`quest-strand-row quest-strand-row--${status}${quest.id === activeId ? " quest-strand-row--selected" : ""}`}
                        onClick={() => setSelectedId(quest.id)}
                        aria-current={quest.id === activeId}
                      >
                        <span className={`quest-strand-dot quest-strand-dot--${status}`} aria-hidden="true" />
                        <span className="quest-strand-row-name">{tr(quest.name)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <div className="quest-detail">
        {selectedItem ? (
          <ContractDetailStage
            quest={selectedItem.quest}
            status={selectedItem.status}
            strandRootId={selectedItem.rootId}
            onClaim={() => onClaim(selectedItem.quest.id)}
            t={t}
            tr={tr}
          />
        ) : (
          <section className="chronicle-stage chronicle-stage-complete quest-detail-empty">
            <p className="muted">{t("quests.contracts.allClaimed")}</p>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Daily Quest Card ──────────────────────────────────────────────────────────

/**
 * claude:2026-10-30T19:05:00+01:00 — Klartext des geplanten Warteschlangen-Eintrags einer Tagesaufgabe
 * („40 × Kupferbarren schmelzen“, „25 × Huhn“, „3 × Gruft“). Namen aus Content, Format aus i18n.
 */
function dailyPlanText(plan: DailyQueuePlan, t: (k: string) => string, tr: (v: LocalizedString) => string): string {
  // claude:2026-10-30T19:11:00+01:00 — ganze Kette inkl. Zulieferung („60 × Eisenerz abbauen → 25 × Stahl schmelzen“).
  return (plan.entries ?? (plan.entry ? [plan.entry] : []))
    .map((e) => {
      const name =
        e.kind === "fight" && e.monsterId ? tr(content.monsters[e.monsterId]?.name ?? { en: e.monsterId, de: e.monsterId })
        : e.kind === "dungeon" && e.dungeonId ? tr(content.dungeons.find((d) => d.id === e.dungeonId)?.name ?? { en: e.dungeonId, de: e.dungeonId })
        : tr(content.actions[e.actionId]?.name ?? { en: e.actionId, de: e.actionId });
      return t("quests.daily.queueWhat").replace("{n}", String(e.target ?? plan.runs)).replace("{name}", name);
    })
    .join(" → ");
}

/** claude:2026-10-30T19:11:00+01:00 — Grund, warum eine Tagesaufgabe nicht eingereiht wird (fehlendes Material mit Namen). */
function dailyReasonText(plan: DailyQueuePlan, t: (k: string) => string, tr: (v: LocalizedString) => string): string {
  const text = t(`quests.daily.queueReason.${plan.reason ?? "unsupported"}`);
  if (plan.reason !== "no_materials" || !plan.missingItemId) return text;
  const item = content.items[plan.missingItemId];
  return text.replace("{item}", item ? tr(item.name) : plan.missingItemId);
}

function DailyQuestCard({
  quest,
  onClaim,
  onQueue,
  onReroll,
  bump,
  t,
  tr,
}: {
  quest: QuestDef;
  onClaim: () => void;
  /** claude:2026-10-30T23:10:00+01:00 — Tagesaufgabe neu würfeln (Dienst `svc_daily_reroll`). */
  onReroll: () => void;
  /** claude:2026-10-30T19:05:00+01:00 — Tagesaufgabe einreihen (Spieler-Wunsch). */
  onQueue: () => void;
  bump: number;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const state = useGameState();
  // Re-read claim/canClaim on every render (bump forces re-render after claim).
  void bump;
  const claimed = isDailyClaimed(state, quest.id);
  const claimable = canClaimQuest(state, content, quest.id);
  // claude:2026-10-30T19:05:00+01:00 — was der Knopf einreihen würde (oder warum nicht); erfüllt/eingelöst ⇒ nichts zeigen.
  const plan = !claimed && !claimable ? dailyQueuePlan(state, content, quest.id) : null;
  const diff = quest.difficulty ?? "medium";
  const baseline = state.quests.repeatBaseline[quest.id] ?? {};
  // claude:2026-10-30T23:10:00+01:00 — Würfel-Knopf nur auf offenen, nicht erfüllten Karten; Preis/Restgrenze aus dem Dienst-Status, Sperrgrund aus der Vorschau.
  const rerollSvc = !claimed && !claimable && content.tokenServices?.some((d) => d.id === "svc_daily_reroll")
    ? { status: tokenServiceStatus(state, content, "svc_daily_reroll"), preview: tokenServicePreview(state, content, "svc_daily_reroll", quest.id) }
    : null;

  const cardClass = claimed
    ? "quest-card quest-card--claimed"
    : claimable
      ? "quest-card quest-card--completed"
      : "quest-card quest-card--active";

  return (
    <div className={cardClass}>
      <div className="quest-card-head">
        <span className="quest-card-name">{tr(quest.name)}</span>
        {/* claude:2026-10-30T22:05:00+01:00 — Schwierigkeit und Zustand als Chipgruppe */}
        <span className="quest-card-badges">
          <span className={`daily-diff-badge ${DIFFICULTY_CLASS[diff] ?? ""}`}>
            {t(`quests.difficulty.${diff}`)}
          </span>
          {!claimed && (
            <span className={`quest-status-badge quest-status-badge--${claimable ? "completed" : "active"}`}>
              {t(`quests.status.${claimable ? "completed" : "active"}`)}
            </span>
          )}
        </span>
      </div>

      <p className="quest-card-desc muted">{tr(quest.description)}</p>

      {/* Objectives with daily baseline */}
      <div className="quest-objectives">
        {quest.objectives.map((obj, i) => {
          const base = baseline[i] ?? 0;
          const prog = objectiveProgress(state, content, obj, base);
          return (
            <ObjectiveBar key={i} obj={obj} progress={prog} t={t} tr={tr} />
          );
        })}
      </div>

      {/* Rewards + Einlösen im Kartenfuß (claude:2026-10-30T22:05:00+01:00) */}
      <div className="quest-card-foot">
        <RewardLine quest={quest} t={t} tr={tr} />
        {claimable && !claimed && (
          <button className="quest-claim-btn" onClick={onClaim}>
            {t("quests.claim")}
          </button>
        )}
        {claimed && (
          <div className="quest-claimed-mark">{t("quests.daily.claimed")}</div>
        )}
        {rerollSvc && rerollSvc.status.found && (
          <div className="daily-reroll">
            <button
              type="button"
              className="shop-citadel-btn daily-reroll-btn"
              disabled={!rerollSvc.preview.ok}
              title={rerollSvc.preview.ok ? t("quests.daily.rerollHint") : t(`quests.daily.rerollWhy.${rerollSvc.preview.reason}`)}
              onClick={onReroll}
            >
              <span aria-hidden="true">🎲</span> {t("quests.daily.reroll").replace("{n}", String(rerollSvc.status.price))}
            </button>
            <span className="daily-reroll-left muted">
              {rerollSvc.status.remainingToday === 0 ? t("quests.svc.back.day") : t("quests.svc.left.day").replace("{n}", String(rerollSvc.status.remainingToday ?? 0))}
            </span>
          </div>
        )}
      </div>

      {/* claude:2026-10-30T19:05:00+01:00 — In die Warteschlange: Plan sichtbar, Grund bei Ablehnung, Materialhinweis beim Herstellen. */}
      {plan && (
        <div className="daily-queue-row">
          {plan.ok ? (
            <>
              <span className="daily-queue-plan">{t("quests.daily.queuePlan").replace("{what}", dailyPlanText(plan, t, tr))}</span>
              <button type="button" className="shop-citadel-btn daily-queue-btn" onClick={onQueue}>
                {t("quests.daily.queueOne")}
              </button>
            </>
          ) : (
            <span className={`daily-queue-plan${plan.reason === "no_materials" ? " daily-queue-warn" : " muted"}`}>{dailyReasonText(plan, t, tr)}</span>
          )}
        </div>
      )}

    </div>
  );
}

// ── Reset Countdown ───────────────────────────────────────────────────────────

function DailyResetCountdown({ t }: { t: (k: string) => string }): JSX.Element {
  const [remaining, setRemaining] = useState(() => msUntilMidnight());

  // Perf-Welle (2026-07-22): war ein rAF-Loop mit setState JEDEN Frame (~60×/s) — die Anzeige
  // (formatCountdown) rundet ohnehin auf ganze Sekunden, ein 1s-Interval reicht für ein optisch
  // identisches Ticken und spart 59 unnötige Re-Renders/s. Neuberechnung aus msUntilMidnight()
  // statt Delta-Akkumulation vermeidet zusätzlich jeglichen Drift.
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(msUntilMidnight());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="daily-reset-countdown">
      {t("quests.daily.resetIn").replace("{time}", formatCountdown(remaining))}
    </span>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const STATUS_ORDER: QuestStatus[] = ["completed", "active", "locked", "claimed"];

// ceo-run-2026-07-13 Welle H: "chronicle" ist der neue, prominente Story-Tab (Aschechronik, s.
// ChronicleStoryTab oben) — er übernimmt den Namen "Story", darum heißt der frühere "story"-Tab
// (die normale, nicht-tägliche Auftragsliste — z.B. "Goblin-Blut", "In den Wald") jetzt intern
// "contracts" und zeigt sich als "quests.daily.tab.story" == "Contracts"/"Aufträge" (Wert
// angepasst, Key unverändert, um den Diff klein zu halten).
type QuestTab = "chronicle" | "contracts" | "daily" | "shop" | "orders"; // claude:2026-10-25T01:30:00+02:00 — + Arbeitsaufträge (1.4.0 AU)

export function QuestsPage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  // Öffnet auf dem Story-Tab, solange ein Aschechronik-Kapitel aktiv ist (Chef-Vorgabe: die
  // Chronik soll "die Bühne bekommen") — sonst wie bisher auf "Daily". Lazy-Initializer läuft
  // nur beim ersten Render; ein späteres Claim/Fortschreiten wechselt den Tab NICHT von selbst
  // zurück (der Spieler bleibt, wo er hingeklickt hat).
  // Taverne (1.2.0, taverne-spec-technik.md §6): die Anschlagtafel springt gezielt auf den
  // Daily-Reiter — `consumeRequestedQuestsTab` ist ein einmaliger Bus-Wert (Muster util/toastBus.ts),
  // gesetzt vom Klick-Handler VOR dem Navigieren hierher. Hat Vorrang vor der Chronik-Vorauswahl,
  // sonst würde ein aktives Kapitel den gewünschten Sprung sofort wieder überschreiben.
  const [tab, setTab] = useState<QuestTab>(() => {
    const requested = consumeRequestedQuestsTab();
    if (requested) return requested;
    return activeChronicleChapter(state, content) ? "chronicle" : "daily";
  });
  // Local bump counter: incremented on every claim → forces immediate re-render.
  const [bump, setBump] = useState(0);
  const [queueMsg, setQueueMsg] = useState<string | null>(null); // claude:2026-10-30T19:05:00+01:00 — Ergebnis „Alle einreihen“

  // Call refreshDailyQuests on mount and whenever the day changes.
  // This is idempotent: same day → no-op.
  useEffect(() => {
    const day = todayStamp();
    refreshDailyQuests(state, content, day);
    // Also schedule a re-check at midnight to pull the next day's quests.
    const delay = msUntilMidnight() + 1000; // +1s buffer
    const timer = setTimeout(() => {
      refreshDailyQuests(state, content, todayStamp());
      setBump((b) => b + 1);
    }, delay);
    return () => clearTimeout(timer);
    // We intentionally omit `state` from deps: state is mutable (ref-based),
    // and we only want this to run once on mount + on explicit day-boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allQuests = content.quests;
  // Aschechronik-Kapitel (chronicle_01…21) leben jetzt komplett im eigenen "chronicle"-Tab
  // (ChronicleStoryTab, s.o.) — sie fliegen hier aus der Auftragsliste/dem "contracts"-Tab-Zähler
  // raus, damit sie nicht doppelt auftauchen. Erkennung ausschließlich über das ID-Präfix
  // (Chef-Vorgabe).
  const storyQuests = allQuests.filter((q) => !q.daily && !q.id.startsWith(CHRONICLE_ID_PREFIX));
  const chronicleChaptersList = chronicleChapters(content);
  const chronicleClaimedCount = chronicleChaptersList.filter(
    (q) => questStatus(state, content, q) === "claimed",
  ).length;

  // Daily entries from state (after refresh).
  const dailyEntries = state.quests.daily.quests;
  const dailyQuests = dailyEntries
    .map((entry) => content.quests.find((q) => q.id === entry.questId))
    .filter((q): q is QuestDef => q !== undefined);

  const storyClaimedCount = storyQuests.filter(
    (q) => questStatus(state, content, q) === "claimed",
  ).length;

  const dailyClaimedCount = dailyQuests.filter((q) =>
    isDailyClaimed(state, q.id),
  ).length;

  // Persönlichkeits-Paket §C.4 (design/lore/waechter-stimme-pack.md): Weltzustand-Vorrangs-Zeile
  // für den Wächter — Elite > Spielerzustand (Todeszahl) > Segen (ashenstorm/mistvigil). Die
  // "chapter"-Zeile des Pakets ist NICHT verdrahtet (kein sauberes vorhandenes Frisch-Signal,
  // s. util/npcVoice.ts-Kopfkommentar).
  const questsVoiceKey = resolveNpcVoiceKey("quests", state);

  return (
    <div className="quests-page quests-contract-wall">
      {/* codex:2026-08-02T00:42:00+02:00 — Contract-Wall-Kopf: Wächter und Tokenbestand teilen
          eine stabile, Gravewood-gerahmte Kommandozeile statt zwei lose vertikale Blöcke. */}
      <div className="quests-command-header">
        {/* NPC-Begrüßung („Speaking Head", Chef-GO 2026-07-13). Welle QQ (2026-07-17): echtes
            Wächter-Porträt (npc_warden) — der Brenna-Platzhalter ist raus. */}
        <NpcGreeting
          portraitSrc={getPortrait("npc_warden")}
          name={t("npc.quests.name")}
          lines={[t("npc.quests.greet1"), t("npc.quests.greet2"), t("npc.quests.greet3")]}
          priorityLine={
            questsVoiceKey
              ? t(questsVoiceKey).replace("{zone}", activeEliteZoneName(state, tr) ?? "")
              : null
          }
        />
        {/* Prominenter Token-Bestand — Kopfbereich, über allen 4 Tabs sichtbar (Task #274). */}
        <div className="quests-header">
          <QuestTokenBadge t={t} balance={questTokenBalance(state)} size="lg" />
        </div>
      </div>

      {/* Tab bar — Story (Aschechronik) zuerst: Chef-Vorgabe, die Chronik bekommt "die Bühne". */}
      <div className="quests-tabs">
        <button
          className={`quests-tab-btn${tab === "chronicle" ? " quests-tab-btn--active" : ""}`}
          onClick={() => setTab("chronicle")}
        >
          {t("quests.daily.tab.chronicle")}
          {chronicleChaptersList.length > 0 && (
            <span className="quests-tab-count muted">
              {" "}{chronicleClaimedCount}/{chronicleChaptersList.length}
            </span>
          )}
        </button>
        <button
          className={`quests-tab-btn${tab === "contracts" ? " quests-tab-btn--active" : ""}`}
          onClick={() => setTab("contracts")}
        >
          {t("quests.daily.tab.story")}
          {storyQuests.length > 0 && (
            <span className="quests-tab-count muted">
              {" "}{storyClaimedCount}/{storyQuests.length}
            </span>
          )}
        </button>
        <button
          className={`quests-tab-btn${tab === "daily" ? " quests-tab-btn--active" : ""}`}
          onClick={() => setTab("daily")}
        >
          {t("quests.daily.tab.daily")}
          {dailyQuests.length > 0 && (
            <span className="quests-tab-count muted">
              {" "}{dailyClaimedCount}/{dailyQuests.length}
            </span>
          )}
        </button>
        <button
          className={`quests-tab-btn${tab === "orders" ? " quests-tab-btn--active" : ""}`}
          onClick={() => setTab("orders")}
        >
          {t("orders.tab")}
          {(state.workOrders?.open.length ?? 0) + (state.workOrders?.offer ? 1 : 0) > 0 && (
            <span className="quests-tab-count muted">
              {" "}{state.workOrders?.open.length ?? 0}/{ORDER_MAX_OPEN}{/* claude:2026-10-26T05:00:00+02:00 — Konstante statt fester 3 */}
            </span>
          )}
        </button>
        <button
          className={`quests-tab-btn${tab === "shop" ? " quests-tab-btn--active" : ""}`}
          onClick={() => setTab("shop")}
        >
          {t("quests.daily.tab.shop")}
        </button>
      </div>

      {/* codex:2026-08-02T00:42:00+02:00 — Feste Contract-Wall-Arbeitsfläche. Nur der aktive
          Tab-Inhalt scrollt intern; Kopf, Navigation und Tokenbilanz bleiben im Blick. */}
      <div className={`quests-content quests-content--${tab}`}>
        {/* Story tab (Aschechronik) — eigener, prominenter Tab (Chef-Feedback: raus aus der
            Sidebar, volle Content-Fläche statt schmalem Band). */}
        {tab === "chronicle" && (
          <ChronicleStoryTab
            t={t}
            tr={tr}
            onClaim={(questId) => {
              claimQuest(state, content, questId);
              setBump((b) => b + 1);
            }}
          />
        )}

      {/* Contracts tab (die frühere "Story"-Liste, ohne die jetzt ausgelagerten chronicle_*-
          Kapitel) — Master-Detail statt flacher Karten-Liste, s. ContractsTab oben. */}
        {tab === "contracts" && (
          <ContractsTab
            t={t}
            tr={tr}
            onClaim={(questId) => {
              claimQuest(state, content, questId);
              setBump((b) => b + 1);
            }}
          />
        )}

      {/* Daily tab */}
        {tab === "daily" && (
          <>
            {dailyQuests.length === 0 ? (
              <div className="placeholder">
                <div className="placeholder-icon">
                  {CALENDAR_ICON_URL ? <img loading="lazy" decoding="async" src={CALENDAR_ICON_URL} alt="" className="ui-icon" /> : "📅"}
                </div>
                <p className="muted">{t("quests.daily.empty")}</p>
              </div>
            ) : (
              // claude:2026-10-30T19:20:00+01:00 — EIN Kind für `.quests-content > *` (height 100 %): Knopfzeile fest, Kartenwand scrollt.
              <div className="daily-wall">
                {/* claude:2026-10-30T19:05:00+01:00 — Spieler-Wunsch: alle offenen Tagesaufgaben auf einen Klick einreihen. */}
                <div className="daily-queue-all">{/* claude:2026-10-30T22:05:00+01:00 — Werkzeugleiste: Sammelknopf links, Tages-Reset rechts */}
                  <button
                    type="button"
                    className="btn-iron"
                    onClick={() => {
                      const plans = enqueueAllDailyQuests(state, content);
                      const queued = plans.filter((p) => p.ok).length;
                      const skipped = plans.filter((p) => !p.ok && p.reason !== "claimed" && p.reason !== "done").length;
                      setQueueMsg(
                        queued + skipped === 0
                          ? t("quests.daily.queueAllNone")
                          : t("quests.daily.queueAllResult").replace("{n}", String(queued)).replace("{m}", String(skipped)),
                      );
                      setBump((b) => b + 1);
                    }}
                  >
                    {t("quests.daily.queueAll")}
                  </button>
                  {queueMsg && <span className="daily-queue-msg muted" role="status">{queueMsg}</span>}
                  <DailyResetCountdown t={t} />
                </div>
                <div className="daily-scroll">{/* claude:2026-10-30T23:00:00+01:00 — Scroll-Hülle, damit alle Kartenzeilen gleich hoch bleiben */}
                <div className="quests-list">
                  {dailyQuests.map((quest) => (
                    <DailyQuestCard
                      key={quest.id}
                      quest={quest}
                      bump={bump}
                      onClaim={() => {
                        claimQuest(state, content, quest.id);
                        setBump((b) => b + 1);
                      }}
                      onQueue={() => {
                        enqueueDailyQuest(state, content, quest.id);
                        setQueueMsg(null);
                        setBump((b) => b + 1);
                      }}
                      onReroll={() => {
                        // claude:2026-10-30T23:10:00+01:00 — gleiche Engine-Funktion wie im Laden; Ergebnis als Zeile in der Werkzeugleiste.
                        const res = buyTokenService(state, content, "svc_daily_reroll", quest.id);
                        setQueueMsg(
                          res.ok
                            ? t("quests.svc.done.dailyReroll").replace("{name}", res.questId ? tr(content.quests.find((q) => q.id === res.questId)?.name ?? { en: res.questId, de: res.questId }) : "")
                            : t(`quests.svc.err.${res.reason ?? "unknown"}`),
                        );
                        setBump((b) => b + 1);
                      }}
                      t={t}
                      tr={tr}
                    />
                  ))}
                </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Rewards Shop tab (Task #274/#284) — Offer-Karten, Kauf via buyTokenShopOffer. */}
        {tab === "shop" && <RewardsShopPanel t={t} tr={tr} onChanged={() => setBump((b) => b + 1)} />}
        {/* claude:2026-10-25T01:30:00+02:00 — Arbeitsaufträge (1.4.0 AU) */}
        {tab === "orders" && <WorkOrdersTab />}
      </div>
    </div>
  );
}
