import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import {
  buyTokenShopOffer,
  canClaimQuest,
  claimQuest,
  isDailyClaimed,
  isShelfOpen,
  objectiveProgress,
  questStatus,
  questTokenBalance,
  refreshDailyQuests,
} from "@hearthforge/engine";
import type { QuestStatus } from "@hearthforge/engine";
import type { GameState, ItemDef, LocalizedString, QuestDef, QuestObjective, TokenShopOffer, TokenShopShelf } from "@hearthforge/shared";
import { QUEST_DIFFICULTIES } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
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

/** Objective label — describes what the counter tracks. */
export function objectiveLabel(
  obj: QuestObjective,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string {
  switch (obj.type) {
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
  return (
    <div className="quest-obj">
      <div className="quest-obj-head">
        <span
          className={`quest-obj-label${done ? " quest-obj-label--done" : ""}`}
          title={objectiveFullTargets(obj, tr)}
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
 * Eine Offer-Karte im Belohnungs-Shop: Item-Bild (getItemImage, Emoji-Fallback), Bündelgröße,
 * Token-Preis und Kauf-Button. Bei zu wenig Tokens: Button disabled + Begründung als Hint-Zeile.
 */
function TokenShopOfferCard({
  offer,
  balance,
  shelfLocked,
  onBuy,
  t,
  tr,
}: {
  offer: TokenShopOffer;
  balance: number;
  /** Regal-Gate (#p13) noch nicht erfüllt — Kauf-Button bleibt disabled, egal wie viele Tokens da sind. */
  shelfLocked: boolean;
  onBuy: () => void;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const item: ItemDef | undefined = content.items[offer.itemId];
  const img = getItemImage(offer.itemId);
  const tokenSrc = TICKET_ICON_URL;
  const affordable = balance >= offer.tokenCost && !shelfLocked;
  // Chef (2026-07-08): Items im Token-Shop anklickbar — Klick auf Bild/Name pinnt das große
  // Item-Tooltip zur Inspektion (gleiches Muster wie ItemChip/PouchRow; Kauf bleibt beim Button).
  const tooltip = useItemTooltip();
  const inspect = (e: React.MouseEvent): void => {
    e.stopPropagation();
    tooltip.pin(offer.itemId, e.clientX, e.clientY, []);
  };
  const inspectByKey = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    tooltip.pin(offer.itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, []);
  };
  return (
    <div className={`quest-shop-offer${affordable ? "" : " quest-shop-offer--locked"}`}>
      <div
        className="quest-shop-offer-imgwrap quest-shop-offer-inspect"
        role="button"
        tabIndex={0}
        onClick={inspect}
        onKeyDown={inspectByKey}
      >
        {img ? (
          <img loading="lazy" decoding="async" src={img} alt="" className="quest-shop-offer-img" />
        ) : (
          <span className="quest-shop-offer-emoji" aria-hidden="true">{item?.icon ?? "❔"}</span>
        )}
        <span className="quest-shop-offer-qty">{offer.qty}×</span>
      </div>
      <span
        className="quest-shop-offer-name quest-shop-offer-inspect"
        role="button"
        tabIndex={0}
        onClick={inspect}
        onKeyDown={inspectByKey}
      >
        {item ? tr(item.name) : offer.itemId}
      </span>
      <div className="quest-shop-offer-cost" title={t("quests.tokens.label")}>
        {tokenSrc ? (
          <img loading="lazy" decoding="async" src={tokenSrc} alt="" className="quest-reward-icon" />
        ) : (
          <span aria-hidden="true">🎟️</span>
        )}
        <span className="quest-shop-offer-cost-num">{offer.tokenCost}</span>
      </div>
      <button
        className="quest-claim-btn quest-shop-buy-btn"
        disabled={!affordable}
        onClick={onBuy}
        title={shelfLocked ? t("quests.shop.shelfLocked") : affordable ? undefined : t("quests.shop.notEnough")}
      >
        {t("quests.shop.buy")}
      </button>
      {/* Regal-Gate hat schon einen eigenen Hinweis im Shelf-Kopf (#p13) — hier nur der
          Tokens-Hinweis, sonst doppelt sich die Aussage auf jeder einzelnen Karte. */}
      {!affordable && !shelfLocked && (
        <span className="quest-shop-offer-hint muted">{t("quests.shop.notEnough")}</span>
      )}
    </div>
  );
}

/**
 * Ein Regal-Abschnitt im Belohnungs-Shop (#p13): Kopfzeile mit Regal-Name + Angebots-Zahl,
 * gesperrte Regale zusätzlich mit Schloss-Icon + Gate-Hinweis (dieselbe Formulierung wie am
 * Zonen-Gate, `combat.zoneGate.requires`). Offene Regale sind einklappbar (Muster
 * `quest-strand-head`/-caret weiter oben in dieser Datei); ein gesperrtes Regal bleibt IMMER
 * mit allen Angebots-Karten sichtbar (nie verstecken) — nur eingefärbt/disabled, kein Toggle.
 */
function TokenShopShelfSection({
  shelf,
  offers,
  balance,
  open,
  expanded,
  onToggle,
  onBuy,
  t,
  tr,
}: {
  shelf: TokenShopShelf;
  offers: TokenShopOffer[];
  balance: number;
  open: boolean;
  expanded: boolean;
  onToggle: () => void;
  onBuy: (offerId: string) => void;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const gateQuest = shelf.requiresQuest ? content.quests.find((q) => q.id === shelf.requiresQuest) : undefined;
  const gateHint = t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"));
  // Gesperrte Regale sind nie einklappbar (Angebots-Karten bleiben immer sichtbar) — nur offene
  // Regale bekommen den Klapp-Header; der Show-State ist dafür schlicht `open ? expanded : true`.
  const showOffers = open ? expanded : true;
  return (
    <div className={`quest-shelf${open ? "" : " quest-shelf--locked"}`}>
      {open ? (
        <button type="button" className="quest-shelf-head" onClick={onToggle} aria-expanded={expanded}>
          <span className="quest-shelf-caret" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
          <span className="quest-shelf-name">{tr(shelf.name)}</span>
          <span className="quest-shelf-count muted">{offers.length}</span>
        </button>
      ) : (
        <div className="quest-shelf-head quest-shelf-head--static">
          <span className="quest-shelf-lock" aria-hidden="true">🔒</span>
          <span className="quest-shelf-name">{tr(shelf.name)}</span>
          <span className="quest-shelf-count muted">{offers.length}</span>
        </div>
      )}
      {!open && <p className="quest-shelf-gate-hint muted">{gateHint}</p>}
      {showOffers && (
        <div className="quest-shop-grid">
          {offers.map((offer) => (
            <TokenShopOfferCard
              key={offer.id}
              offer={offer}
              balance={balance}
              shelfLocked={!open}
              onBuy={() => onBuy(offer.id)}
              t={t}
              tr={tr}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Belohnungs-Shop-Tab (Task #284, Regale seit #p13): Citadel-Panel mit Token-Bestand + Angeboten
 * aus `content.tokenShop`, gruppiert nach `content.tokenShopShelves` (sortiert nach sortOrder;
 * Angebote ohne Treffer landen defensiv im ersten offenen Regal — Content-Vertrag „Angebote ohne
 * shelfId fallen ins offene Regal"). Kauf läuft über die Engine (`buyTokenShopOffer`: prüft zuerst
 * das Regal-Gate über `isShelfOpen`, dann Tokens, liefert das Bündel via addItemOrBank, kein
 * Teil-Verlust). Schlägt ein Kauf trotz offenem Regal + genug Tokens fehl, ist das ein
 * Platz-Problem (Inventar voll + Auto-Bank aus/Bank voll) → Inline-Hinweis statt Toast (es gibt
 * kein Toast-System). Regale: gesperrte bleiben sichtbar mit Gate-Hinweis (nie verstecken),
 * offene sind einklappbar — das zuletzt erreichte (höchste sortOrder unter den offenen) startet
 * aufgeklappt, ältere starten eingeklappt (bleiben aber jederzeit erreichbar). Der „Bald
 * verfügbar"-Platzhalter bleibt nur bei komplett leerem Content.
 */
function RewardsShopPanel({
  t,
  tr,
}: {
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const state = useGameState();
  const [, setBump] = useState(0);
  const [spaceNotice, setSpaceNotice] = useState(false);
  const balance = questTokenBalance(state);

  const shelves = [...(content.tokenShopShelves ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const allOffers = [...(content.tokenShop ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const fallbackShelfId = shelves.find((s) => !s.requiresQuest)?.id ?? shelves[0]?.id;
  const offersByShelf = new Map<string, TokenShopOffer[]>();
  for (const offer of allOffers) {
    const key = (offer.shelfId && shelves.some((s) => s.id === offer.shelfId)) ? offer.shelfId : fallbackShelfId;
    if (!key) continue;
    (offersByShelf.get(key) ?? offersByShelf.set(key, []).get(key)!).push(offer);
  }

  const openShelfIds = shelves.filter((s) => isShelfOpen(state, content, s.id)).map((s) => s.id);
  // Höchste sortOrder unter den offenen Regalen = "aktuelles" Regal (shelves ist bereits aufsteigend
  // sortiert, also einfach das letzte offene Element in dieser Reihenfolge).
  const currentShelfId = openShelfIds[openShelfIds.length - 1];
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(currentShelfId ? [currentShelfId] : []));
  const toggleShelf = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buy = (offerId: string): void => {
    const res = buyTokenShopOffer(state, content, offerId);
    // Regal-Gate/zu-wenig-Tokens blockieren den Button schon vorher (disabled) — schlägt der Kauf
    // trotzdem fehl, ist es praktisch immer „kein Platz" (no_space); andere Reasons zeigen defensiv
    // keinen Hinweis (State bleibt ohnehin unverändert, s. buyTokenShopOffer-Doku).
    setSpaceNotice(res.reason === "no_space");
    setBump((b) => b + 1);
  };

  const hasOffers = allOffers.length > 0;

  return (
    <div className="quest-shop-panel">
      <div className="quest-shop-panel-head">
        <span className="quest-shop-panel-title">{t("quests.shop.title")}</span>
        <QuestTokenBadge t={t} balance={balance} />
      </div>
      <p className="quest-shop-panel-desc muted">{t("quests.shop.subtitle")}</p>
      {spaceNotice && (
        <p className="quest-shop-notice" role="alert">{t("quests.shop.noSpace")}</p>
      )}
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
        <div className="quest-shelf-list">
          {/* Chef 25.08.2026 (Test 1.1.0): gesperrte Regale sind GAR NICHT einsehbar. Der erste
              Entwurf zeigte sie ausgegraut mit "Erfordert Kapitel" — der Chef will die Ware erst
              sehen, wenn sie erreichbar ist. Ein Satz unten sagt nur, DASS mehr kommt. */}
          {shelves.map((shelf) => {
            const offers = offersByShelf.get(shelf.id) ?? [];
            if (offers.length === 0) return null;
            if (!openShelfIds.includes(shelf.id)) return null;
            return (
              <TokenShopShelfSection
                key={shelf.id}
                shelf={shelf}
                offers={offers}
                balance={balance}
                open={openShelfIds.includes(shelf.id)}
                expanded={expanded.has(shelf.id)}
                onToggle={() => toggleShelf(shelf.id)}
                onBuy={buy}
                t={t}
                tr={tr}
              />
            );
          })}
          {shelves.some((sh) => !openShelfIds.includes(sh.id) && (offersByShelf.get(sh.id)?.length ?? 0) > 0) && (
            <p className="quest-shelf-more muted">{t("quests.shop.moreShelves")}</p>
          )}
        </div>
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
 *  (z. B. chronicle_11 → skeleton_nekro, bewusst offene Zweitquelle in der Krypta) bleiben
 *  unverändert bei der Zonen-Anzeige. */
function objectiveLocation(
  obj: QuestObjective,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string | null {
  if (obj.type === "reach_paragon_floor") return t("paragon.sectionTitle");
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
  return (
    <div className={`chronicle-obj${done ? " chronicle-obj--done" : ""}`}>
      <div className="chronicle-obj-head">
        <span className="chronicle-obj-check" aria-hidden="true">{done ? "✓" : ""}</span>
        <span className="chronicle-obj-label" title={objectiveFullTargets(obj, tr)}>{objectiveLabel(obj, t, tr)}</span>
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
        <span className="chronicle-tab-counter">
          {t("chronicle.chapterOf")
            .replace("{n}", String(active ? active.chapter : claimedChapters.length))
            .replace("{total}", String(chapters.length))}
        </span>
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
                progress={objectiveProgress(state, content, obj)}
                t={t}
                tr={tr}
              />
            ))}
          </div>

          <RewardLine quest={active.quest} t={t} tr={tr} />
          <ChronicleUnlocksLine questId={active.quest.id} t={t} tr={tr} />

          {active.status === "completed" && (
            <button className="quest-claim-btn chronicle-stage-claim" onClick={() => onClaim(active.quest.id)}>
              {t("chronicle.stage.claim")}
            </button>
          )}
        </section>
      ) : (
        <section className="chronicle-stage chronicle-stage-complete">
          <p className="muted">{t("chronicle.allClaimed")}</p>
        </section>
      )}

      {claimedChapters.length > 0 && (
        <section className="chronicle-history">
          <button
            type="button"
            className="chronicle-history-toggle"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-expanded={historyOpen}
          >
            <span className="chronicle-history-caret">{historyOpen ? "▾" : "▸"}</span>
            {t("chronicle.history")} ({claimedChapters.length})
          </button>
          {historyOpen && (
            <div className="chronicle-history-list">
              {claimedChapters.map((q) => {
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
                      <span className="chronicle-history-caret">{open ? "▾" : "▸"}</span>
                      <span className="chronicle-history-num">{String(num).padStart(2, "0")}</span>
                      <span className="chronicle-history-name">{tr(q.name)}</span>
                    </button>
                    {open && q.loreText && (
                      <p className="chronicle-history-text">{tr(q.loreText)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
              progress={objectiveProgress(state, content, obj)}
              t={t}
              tr={tr}
            />
          ))}
        </div>
      )}

      <RewardLine quest={quest} t={t} tr={tr} />
      <ChronicleUnlocksLine questId={quest.id} t={t} tr={tr} />

      {claimable && (
        <button className="quest-claim-btn chronicle-stage-claim" onClick={onClaim}>
          {t("quests.claim")}
        </button>
      )}

      {status === "claimed" && (
        <div className="quest-claimed-mark">{t("quests.claimed")}</div>
      )}
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

function DailyQuestCard({
  quest,
  onClaim,
  bump,
  t,
  tr,
}: {
  quest: QuestDef;
  onClaim: () => void;
  bump: number;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const state = useGameState();
  // Re-read claim/canClaim on every render (bump forces re-render after claim).
  void bump;
  const claimed = isDailyClaimed(state, quest.id);
  const claimable = canClaimQuest(state, content, quest.id);
  const diff = quest.difficulty ?? "medium";
  const baseline = state.quests.repeatBaseline[quest.id] ?? {};

  const cardClass = claimed
    ? "quest-card quest-card--claimed"
    : claimable
      ? "quest-card quest-card--completed"
      : "quest-card quest-card--active";

  return (
    <div className={cardClass}>
      <div className="quest-card-head">
        <span className="quest-card-name">{tr(quest.name)}</span>
        <span className={`daily-diff-badge ${DIFFICULTY_CLASS[diff] ?? ""}`}>
          {t(`quests.difficulty.${diff}`)}
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

      {/* Rewards */}
      <RewardLine quest={quest} t={t} tr={tr} />

      {/* Claim button */}
      {claimable && !claimed && (
        <button className="quest-claim-btn" onClick={onClaim}>
          {t("quests.claim")}
        </button>
      )}

      {/* Claimed mark */}
      {claimed && (
        <div className="quest-claimed-mark">{t("quests.daily.claimed")}</div>
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
type QuestTab = "chronicle" | "contracts" | "daily" | "shop";

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
          className={`quests-tab-btn${tab === "shop" ? " quests-tab-btn--active" : ""}`}
          onClick={() => setTab("shop")}
        >
          {t("quests.daily.tab.shop")}
        </button>
        {tab === "daily" && <DailyResetCountdown t={t} />}
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
                    t={t}
                    tr={tr}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Rewards Shop tab (Task #274/#284) — Offer-Karten, Kauf via buyTokenShopOffer. */}
        {tab === "shop" && <RewardsShopPanel t={t} tr={tr} />}
      </div>
    </div>
  );
}
