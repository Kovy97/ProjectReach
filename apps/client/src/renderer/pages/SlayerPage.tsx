import { useState } from "react";
import { content } from "@hearthforge/content";
import {
  assignTask,
  buySlayerShopItem,
  campBoost,
  campFreeSkipAvailable,
  campKindAtMaxLevel,
  consumeFailReason,
  effectiveSkipCost,
  enqueueFight,
  enqueueFightAtFront,
  getActiveTask,
  getAvailableMasters,
  slayerTaskPointsPayout,
  itemCount,
  levelFromXp,
  skipTask,
  slayerRequirementMet,
  useConsumable,
} from "@hearthforge/engine";
import type { SlayerShopReason } from "@hearthforge/engine";
import { SLAYER_STREAK_TOKEN_INTERVAL } from "@hearthforge/shared";
import type { SlayerMasterId } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import { CampBoostNote } from "../components/CampBoostNote";
import { gameAlert } from "../components/GameAlert";
import { getMonsterSrc } from "../monsters";
import { getPortrait } from "../portraits";
import { getSidebarIcon } from "../sidebarIcons";
import { getUiIcon } from "../uiIcons";
import { ItemCell } from "../components/ItemCell";
import { HoverTip } from "../components/CitadelTip";
import { NpcGreeting } from "../components/NpcGreeting";
import { TalentTree } from "../components/TalentTree";
import { activeEliteZoneName, resolveNpcVoiceKey } from "../util/npcVoice";

const LOCKED_ICON_URL = getUiIcon("icon_locked");
const SLAYER_POINTS_ICON_URL = getUiIcon("icon_slayerpoints");
// Welle QQ (2026-07-17): echtes Buff-/Streak-Icon statt 🔥-Emoji auf dem Serien-Chip.
const STREAK_ICON_URL = getUiIcon("icon_buff");
// Sweep 5, Finding 6: 💀-Emoji-Fallback (Master-Portrait/Monster-Bild fehlt, Task leer) durch
// das echte Slayer-Skull-Sidebar-Art ersetzt — passt zum Citadel-Stil statt Emoji-Bruch.
const SLAYER_FALLBACK_ICON_URL = getSidebarIcon("slayer");

/** Slayer-Punkte-Icon (PNG oder ★ Fallback). */
function SlayerPtIcon(): JSX.Element {
  return SLAYER_POINTS_ICON_URL
    ? <img loading="lazy" decoding="async" src={SLAYER_POINTS_ICON_URL} alt="" className="shop-price-icon" style={{ width: 16, height: 16, verticalAlign: "middle" }} />
    : <span style={{ fontSize: "var(--fs-2xs)" }}>★</span>;
}

/** Sections-Kopfzeile im Shop-Stil (Ornament + Titel + Linie). Exportiert (Jagd-Paket, Chef-GO):
 *  BountyBoard.tsx (Kopfgeld-Brett, Task 1) teilt sich denselben Kopfzeilen-Stil. */
export function SectionHead({ title }: { title: string }): JSX.Element {
  return (
    <div className="shop-section-head">
      <span className="shop-section-orn" aria-hidden="true">◆</span>
      <span className="shop-section-title">{title}</span>
      <span className="shop-section-line" aria-hidden="true" />
    </div>
  );
}

/** Heutiger lokaler Kalendertag als YYYYMMDD (Muster QuestsPage `todayStamp`) — Quelle des
 *  Tages-Gratis-Skips der Trophäenwand III (engine/slayer.ts `campFreeSkipAvailable`). */
function todayStamp(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function SlayerPage({ onNavigate }: { onNavigate?: (id: string) => void } = {}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  // ── Skill head ───────────────────────────────────────────────────
  const xp = state.skills["slayer"]?.xp ?? 0;
  const level = levelFromXp(xp);
  const skill = content.skills["slayer"];

  // Task #334 (UI-Welle 2 "Boosts sichtbar"): die Trophäenwand hebt den Punkte-Ertrag jedes
  // ABGESCHLOSSENEN Tasks an (engine/slayer.ts `recordKillForSlayer`, additiv zum Meisterring,
  // gemeinsam auf `SLAYER_POINTS_TOTAL_BONUS_CAP` geklemmt) — bisher stand auf dem Zettel nur die
  // rohe `task.pointReward`, ohne dass der New-Haven-Anteil irgendwo auftauchte. Derselbe
  // Engine-Lesehook wie der tatsächliche Auszahlungs-Pfad, keine zweite Bonus-Mathe.
  const slayerCampBonus = Math.max(0, campBoost(state, content, "slayerPoints"));
  // claude:2026-10-17T20:30:00+02:00 — Zettel zeigt die echte Gutschrift (Meisterring, Trophäenwand, Jagdbuch
  // „Jagdtempo“) aus derselben Engine-Funktion wie der Abschluss, nicht den rohen pointReward.
  const taskPointsPayout = state.slayerTask ? slayerTaskPointsPayout(state, content, state.slayerTask.pointReward) : 0;

  // ── Masters ──────────────────────────────────────────────────────
  const allMasters = content.slayerMasters ?? [];
  const availableMasters = getAvailableMasters(state, content);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [activeMasterId, setActiveMasterId] = useState<SlayerMasterId | null>(
    () => (availableMasters.length > 0 ? availableMasters[availableMasters.length - 1]!.id : null),
  );

  // Fehler-Feedback für fehlgeschlagene Shop-Käufe (buySlayerShopItem-Reason-Codes, s. slayer.ts
  // JSDoc). Inline statt globaler Toast — Toasts.tsx ist ein reiner Snapshot-Diff-Beobachter ohne
  // Fire-and-forget-API für Einzel-Events von hier aus. Auto-Clear nach 4s (Muster Toasts.tsx
  // TOAST_MS), oder sofort beim nächsten Kauf-Versuch desselben Items.
  // claude:2026-10-18T11:30:00+02:00 — Belohnungs-Shop und Jagdbuch als Reiter einer Fläche statt zwei langer Panels untereinander.
  const [lowerTab, setLowerTab] = useState<"shop" | "book">("shop");
  const [shopError, setShopError] = useState<{ itemId: string; reason: SlayerShopReason } | null>(null);

  function handleBuyShopItem(itemId: string): void {
    const result = buySlayerShopItem(state, content, itemId);
    if (result.ok) {
      setShopError(null);
      return;
    }
    const reason = result.reason ?? "not_found";
    setShopError({ itemId, reason });
    window.setTimeout(() => {
      setShopError((cur) => (cur && cur.itemId === itemId && cur.reason === reason ? null : cur));
    }, 4000);
  }

  // ── Active task ──────────────────────────────────────────────────
  const task = getActiveTask(state);
  const taskMonster = task ? (content.monsters[task.monsterId] ?? null) : null;
  const reqMet = task ? slayerRequirementMet(state, content, task.monsterId) : true;
  const reqItemId = task ? (content.monsters[task.monsterId]?.slayerRequirement ?? null) : null;
  const reqItemName = reqItemId
    ? (content.items[reqItemId] ? tr(content.items[reqItemId]!.name) : reqItemId)
    : null;

  // Fix-Welle CC (Vesna, fun-review/slayer.md Befund 1): die frühe Skip-Gnade (gratis unter
  // Slayer-Level SLAYER_SKIP_FREE_BELOW_LEVEL) lebt in `effectiveSkipCost` — vorher las die UI
  // `master.skipCost` roh, zeigte also z.B. "30 Pkt." an und sperrte den Button trotz vollem
  // Guthaben, während die Engine (skipTask) den Skip längst gratis erlaubt hätte.
  const taskMaster = task
    ? (content.slayerMasters ?? []).find((m) => m.id === task.masterId)
    : undefined;
  // Welle MM (Vesna R3-Fund, toter Fallback): `skipCost` ist ein reiner Content-Wert je Master
  // (10/15/30 je nach Master, keine sinnvolle globale Konstante) — der `taskMaster`-Ast greift
  // nur, wenn `taskMaster` fehlt (kein aktiver Task oder Master nicht im Katalog gefunden); in
  // beiden Fällen liest KEIN Konsument von `skipCost` weiter unten den Wert (alle Stellen sind
  // `{task && …}`-guarded). 0 statt einer erfundenen Zahl wie 30 macht das explizit als "kein
  // Preis" sichtbar, ohne einen zweiten falschen Anschein von Bedeutung zu erzeugen.
  // Das Lager, Trophäenwand III (Task #359): der TAGES-Gratis-Skip ist die zweite Gratis-Quelle
  // neben der Früh-Gnade. Der lokale Kalendertag kommt wie bei den Dailies (QuestsPage
  // `todayStamp`) vom Client — die Engine erzeugt selbst keine Zeit.
  const skipCost = taskMaster ? effectiveSkipCost(state, content, taskMaster, todayStamp()) : 0;

  // Anzeige des Tages-Gratis-Skips (Task #361): `effectiveSkipCost` oben verrechnet ihn längst,
  // sichtbar war er bisher nicht — der Spieler sah nur eine Null im Button und wusste nicht, WOHER
  // sie kommt (bzw. dass sie morgen wieder da ist). Zwei Zustände, klar getrennt: die Anlage steht
  // (Trophäenwand III) und heute ist der Skip frei — oder sie steht, aber heute ist er verbraucht.
  // Ohne voll ausgebaute Trophäenwand bleibt die Zeile ganz weg (nichts zu versprechen).
  const hasFreeSkipSource = campKindAtMaxLevel(state, content, "slayerPoints");
  const freeSkipToday = campFreeSkipAvailable(state, content, todayStamp());

  // claude:2026-10-18T00:30:00+02:00 — Jagdbuch-Baum (Content `talentTrees`, Id "slayer").
  const slayerBook = (content.talentTrees ?? []).find((tree) => tree.id === "slayer") ?? null;

  // ── Tower floors (für Task-Standort-Label) ────────────────────────
  const allFloors = content.slayerTower ?? [];

  // Chef-Nachtrag 25.08. (Shop-Präsentation): Angebote aufsteigend nach Stufen-Anforderung
  // sortiert, statt in roher Katalog-Reihenfolge — der Spieler soll seinen Fortschritt lesen
  // können ("was wird als Nächstes frei"), nicht raten. Reine Anzeige-Reihenfolge, keine
  // Content-Änderung (derselbe Katalog wie zuvor, nur kopiert+sortiert).
  const slayerShopSorted = content.slayerShop
    ? [...content.slayerShop].sort(
        (a, b) => (a.slayerLevelRequired ?? 1) - (b.slayerLevelRequired ?? 1),
      )
    : [];

  // claude:2026-10-17T19:40:00+02:00 — Zweite Brenna-Sprechbox (slayer.speech.*) entfällt: Brenna
  // spricht nur noch in der Begrüßung oben (Chef 17.10.), der Auftragszettel zeigt den Zustand selbst.

  function handleGetTask(): void {
    const masterId = activeMasterId ?? availableMasters[0]?.id;
    if (masterId) assignTask(state, content, masterId);
  }

  // Fix-Welle CC (Vesna, Befund 1): "Skip Task" (sofort, kein Confirm) und "Cancel task" (mit
  // Confirm) taten technisch dasselbe (Task = null zu effectiveSkipCost, nie ein neuer Auftrag
  // automatisch) — zwei Buttons für eine Aktion. Konsolidiert auf EINEN Pfad mit Confirm-Schritt
  // (Punkte-Ausgabe verdient eine Rückfrage, s. Chef-GO-Muster bei Shop-Käufen); der reqMet===false
  // Kurzschluss bleibt: ein Auftrag, dessen Voraussetzung fehlt, lässt sich weiter sofort+gratis
  // fallen lassen (kein sinnvoller Grund, dafür extra zu bezahlen oder rückzufragen).
  function handleSkipClick(): void {
    if (!reqMet) {
      state.slayerTask = null;
      return;
    }
    setConfirmCancel(true);
  }

  function executeSkipTask(): void {
    // Ruft die echte Engine-Funktion (statt den Kosten-Pfad hier zu duplizieren) — hält UI und
    // Engine auf genau einer Quelle für "was kostet ein Skip wirklich" (effectiveSkipCost).
    skipTask(state, content, todayStamp());
    setConfirmCancel(false);
  }

  // Spieler-Report 1.0.2: Restmenge des Auftrags als vorbelegtes Kampfziel. `required - progress`
  // ist genau die Zahl, die der Spieler sonst selbst abgezaehlt und auf der Kampfseite eingetippt
  // haette. Der Gegner muss dafuer regulaer bekaempfbar sein — dieselben zwei Gruende, aus denen
  // `enqueueFight` sonst still `false` liefert (fehlende Slayer-Anforderung, Dungeon-Gegner).
  const taskRest = task ? Math.max(0, task.required - task.progress) : 0;
  const taskKaempfbar =
    task !== null && taskRest > 0 && reqMet && !content.monsters[task.monsterId]?.dungeonOnly;

  function handleTaskFightNow(): void {
    if (!task || !taskKaempfbar) return;
    enqueueFightAtFront(state, content, task.monsterId, taskRest);
    onNavigate?.("combat");
  }

  function handleTaskEnqueue(): void {
    if (!task || !taskKaempfbar) return;
    enqueueFight(state, content, task.monsterId, taskRest);
  }

  // Chef-GO 26.08.2026: "Marke einlösen" neben "Überspringen" — Auftragsmarke (Sonder-Wirkung
  // `slayerReroll`, engine/consumable.ts) würfelt den aktiven Auftrag gratis neu, ohne Punkte/
  // Serie zu kosten. Sichtbar nur mit Bestand > 0; die Menge kommt bewusst aus DEMSELBEN Topf,
  // den `useConsumable` tatsächlich verbraucht (state.inventory) — nicht zusätzlich aus dem Lager
  // (state.bank), sonst könnte der Knopf aktiv/beleuchtet erscheinen, obwohl der eigentliche
  // Verzehr (nur Inventar) mangels Bestand dort scheitern würde.
  const taskTokenCount = itemCount(state.inventory, "chronicle_task_token");

  function handleUseToken(): void {
    if (!useConsumable(state, content, "chronicle_task_token")) {
      const reason = consumeFailReason(state, content, "chronicle_task_token");
      gameAlert(reason === "no_slayer_task" ? "alert.consumeNoSlayerTask" : "alert.consumeCooldown");
    }
  }

  function towerFloorLabel(monsterId: string): string {
    const floor = allFloors.find((f) => f.monsters.includes(monsterId));
    if (floor) return t("slayer.location.tower").replace("{n}", String(floor.floor));
    return t("slayer.tab.tower");
  }

  // Persönlichkeits-Paket §C.3 (design/lore/waechter-stimme-pack.md): Weltzustand-Vorrangs-Zeile
  // für Brenna — Elite > Spielerzustand (Todeszahl vor Serie) > Segen (bloodmoon/wildhunt).
  const slayerVoiceKey = resolveNpcVoiceKey("slayer", state);

  // claude:2026-10-17T19:40:00+02:00 — Serien-Chip als eigener Baustein: steht jetzt auf dem
  // Auftragszettel UND im leeren Zustand (dort motiviert er zum nächsten Auftrag).
  const streakChip = state.slayerStreak > 0 ? (
    <span className="slayer-task-reward-chip slayer-task-reward-chip--streak">
      {STREAK_ICON_URL ? <img loading="lazy" decoding="async" src={STREAK_ICON_URL} alt="" className="ui-icon slayer-streak-icon" /> : "🔥"} {t("slayer.streak.chip")
        .replace("{n}", String(state.slayerStreak))
        .replace(
          "{next}",
          String(
            Math.ceil((state.slayerStreak + 1) / SLAYER_STREAK_TOKEN_INTERVAL)
              * SLAYER_STREAK_TOKEN_INTERVAL,
          ),
        )}
    </span>
  ) : null;

  return (
    <div className="slayer-page">
      {/* claude:2026-10-17T19:40:00+02:00 — Kopfzeile wie im Laden: Begrüßung | Punkte | Meister-
          Reiter. Ersetzt die eigene Punkte-Zeile und die Porträt-Spalte (Brenna stand dort ein
          drittes und viertes Mal, mit zweiter Sprechbox). */}
      <div className="slayer-head">
        {/* NPC-Begrüßung („Speaking Head", Chef-GO 2026-07-13; bleibt laut Chef 17.10.) — hier ECHT:
            Brenna Aschenweide, Porträt + Name sind final. */}
        <NpcGreeting
          portraitSrc={getPortrait("slayermaster_brenna_ashwick")}
          name={t("npc.slayer.name")}
          lines={[t("npc.slayer.greet1"), t("npc.slayer.greet2"), t("npc.slayer.greet3")]}
          priorityLine={
            slayerVoiceKey
              ? t(slayerVoiceKey)
                  .replace("{zone}", activeEliteZoneName(state, tr) ?? "")
                  .replace("{streak}", String(state.slayerStreak))
              : null
          }
        />

        <div className="slayer-head-side">
          {/* Slayer-Punkte: einzige Anzeige der Seite (Skip-Kosten und Shop-Preise beziehen sich darauf). */}
          <div className="slayer-balance">
            <span className="slayer-balance-icon">
              {SLAYER_POINTS_ICON_URL
                ? <img loading="lazy" decoding="async" src={SLAYER_POINTS_ICON_URL} alt="" className="ui-icon" />
                : "★"}
            </span>
            <span className="slayer-balance-amount">{state.slayerPoints}</span>
            <span className="slayer-balance-label">{t("slayer.points")}</span>
          </div>

          {/* ── Master tabs (DS wooden-frame buttons; bleiben laut Chef 17.10.) ── */}
          {allMasters.length > 0 && (
            <div className="slayer-master-tabs">
              {allMasters.map((master) => {
                const isAvailable = availableMasters.some((m) => m.id === master.id);
                const isActive = activeMasterId === master.id;
                const cls = [
                  "slayer-master-tab",
                  isActive ? "active" : "",
                  !isAvailable ? "locked" : "",
                ].filter(Boolean).join(" ");
                return (
                  <button
                    key={master.id}
                    className={cls}
                    onClick={() => { if (isAvailable) setActiveMasterId(master.id); }}
                    disabled={!isAvailable}
                    title={
                      !isAvailable
                        ? t("slayer.master.locked").replace("{n}", String(master.unlock.slayerLevel))
                        : undefined
                    }
                  >
                    {!isAvailable && (
                      <span aria-hidden="true">
                        {LOCKED_ICON_URL
                          ? <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="locked-icon-img" />
                          : "🔒"}{" "}
                      </span>
                    )}
                    {tr(master.name)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Auftragszettel ──────────────────────────────────────────────
          claude:2026-10-17T19:40:00+02:00 — EINE Karte, drei Zonen: Zielbild | Ziel, Fortschritt,
          Belohnung | Aktionen. Der leere Zustand nutzt dieselben Zonen (Totenkopf | Hinweis |
          „Neuen Auftrag holen") statt einer 400-px-Leerbox. Zonen-Umbruch per @container (slayer.css). */}
      <div className={`slayer-task-panel shop-panel${task ? "" : " empty"}`}>
        <div className="slayer-task-art">
          {(() => {
            const src = task ? getMonsterSrc(task.monsterId) : null;
            if (src) return <img loading="lazy" decoding="async" src={src} alt="" className="pixelart slayer-task-art-img" />;
            return SLAYER_FALLBACK_ICON_URL ? (
              <img loading="lazy" decoding="async" src={SLAYER_FALLBACK_ICON_URL} alt="" className="slayer-task-empty-icon-img" />
            ) : (
              <span className="slayer-task-empty-icon" aria-hidden="true">💀</span>
            );
          })()}
        </div>

        {task ? (
          <>
            <div className="slayer-task-body">
              <div className="slayer-task-monster-info">
                <span className="slayer-task-monster-name">
                  {taskMonster ? tr(taskMonster.name) : task.monsterId}
                </span>
                <span className="slayer-task-location muted">
                  {(() => {
                    const towerFl = allFloors.find((f) => f.monsters.includes(task.monsterId));
                    if (towerFl) return towerFloorLabel(task.monsterId);
                    if (taskMonster?.zone) {
                      const zone = content.zones.find((z) => z.id === taskMonster.zone);
                      if (zone) return tr(zone.name);
                    }
                    return t("slayer.location.world");
                  })()}
                  {onNavigate && (
                    <button
                      className="slayer-locate-btn muted"
                      onClick={() => onNavigate("combat")}
                    >
                      {t("slayer.task.goToMonster")}
                    </button>
                  )}
                </span>
              </div>

              {/* Fortschritt gehört zum Zielblock (Chef-Fund 26.08.2026). */}
              <div className="slayer-task-progress">
                <div className="slayer-task-progress-label">
                  <span>
                    {t("slayer.task.progress")
                      .replace("{done}", String(task.progress))
                      .replace("{total}", String(task.required))}
                  </span>
                  <span className="muted">
                    {Math.floor((task.progress / Math.max(1, task.required)) * 100)}%
                  </span>
                </div>
                <div className="bar tall">
                  <div
                    className="bar-fill"
                    style={{
                      transform: `scaleX(${Math.min(100, (task.progress / Math.max(1, task.required)) * 100) / 100})`,
                    }}
                  />
                </div>
              </div>

              {/* Kopfgeld auf dem Zettel (Fun-Sweep FF, Vesna V1-Anzeige): xpReward/pointReward sind beim
                  Assign fixiert — hier nur anzeigen. Serie (Welle GG/KK) mit Countdown zum Bonus. */}
              <div className="slayer-task-reward-row">
                <span className="slayer-task-reward-label muted">{t("quests.rewards")}</span>
                <span className="slayer-task-reward-chip slayer-task-reward-chip--xp">
                  ✦ +{formatNum(task.xpReward)} {t("skill.t.xp")}
                </span>
                {slayerCampBonus > 0 ? (
                  <HoverTip
                    as="span"
                    className="slayer-task-reward-chip slayer-task-reward-chip--pts"
                    content={<div className="ct-tip-desc"><CampBoostNote kind="slayerPoints" value={slayerCampBonus} t={t} /></div>}
                  >
                    <SlayerPtIcon /> {t("slayer.task.rewardPoints").replace("{n}", formatNum(taskPointsPayout))}
                  </HoverTip>
                ) : (
                  <span className="slayer-task-reward-chip slayer-task-reward-chip--pts">
                    <SlayerPtIcon /> {t("slayer.task.rewardPoints").replace("{n}", formatNum(taskPointsPayout))}
                  </span>
                )}
                {streakChip}
              </div>
            </div>

            <div className="slayer-task-side">
              {/* Requirement warning — direkt über den gesperrten Kampf-Knöpfen, die er erklärt. */}
              {!reqMet && reqItemName && (
                <div className="slayer-req-warning">
                  {t("slayer.req.missing").replace("{item}", reqItemName)}
                </div>
              )}

              {/* Spieler-Report 1.0.2: beide Kampf-Wege direkt vom Zettel, Restmenge als Ziel.
                  Primär „Sofort kämpfen" = .btn-iron (größer), Sekundär „Einreihen" = .shop-citadel-btn. */}
              {taskRest > 0 && (
                <div className="slayer-task-fight-row">
                  <button
                    className="btn-iron slayer-task-fight-btn"
                    onClick={handleTaskFightNow}
                    disabled={!taskKaempfbar}
                    title={taskKaempfbar ? undefined : t("slayer.task.fightBlocked")}
                  >
                    {t("slayer.task.fightNow").replace("{n}", formatNum(taskRest))}
                  </button>
                  <button
                    className="shop-citadel-btn slayer-task-queue-btn"
                    onClick={handleTaskEnqueue}
                    disabled={!taskKaempfbar}
                    title={taskKaempfbar ? undefined : t("slayer.task.fightBlocked")}
                  >
                    {t("slayer.task.addToQueue").replace("{n}", formatNum(taskRest))}
                  </button>
                </div>
              )}

              {/* Gratis-Skip der Trophäenwand III (Das Lager, Task #361) — siehe hasFreeSkipSource. */}
              {hasFreeSkipSource && (
                <div className={`slayer-freeskip${freeSkipToday ? " is-available" : ""}`}>
                  {t(freeSkipToday ? "slayer.freeSkip.available" : "slayer.freeSkip.used")}
                </div>
              )}

              {/* EIN Skip-Pfad mit Confirm-Schritt (s. handleSkipClick). */}
              {confirmCancel ? (
                <div className="slayer-cancel-confirm">
                  <p className="slayer-cancel-confirm-text muted">
                    {skipCost > 0
                      ? t("slayer.task.cancelConfirm").replace("{n}", String(skipCost))
                      : t("slayer.task.cancelConfirmFree")}
                  </p>
                  {/* Streak-Bruch-Hinweis: nur mit Serie UND bezahltem Skip (s. skipTask). */}
                  {state.slayerStreak > 0 && skipCost > 0 && (
                    <p className="slayer-cancel-streak-warning muted">
                      {t("slayer.task.streakSkipWarning")}
                    </p>
                  )}
                  <div className="slayer-task-actions-row">
                    <button
                      className="shop-citadel-btn"
                      onClick={executeSkipTask}
                      disabled={state.slayerPoints < skipCost}
                      title={state.slayerPoints < skipCost ? t("slayer.shop.notEnough") : undefined}
                    >
                      {skipCost > 0
                        ? t("slayer.task.cancelYes").replace("{n}", String(skipCost))
                        : t("slayer.task.cancelYesFree")}
                    </button>
                    <button className="slayer-cancel-btn muted" onClick={() => setConfirmCancel(false)}>
                      {t("slayer.task.cancelNo")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="slayer-task-actions-row">
                  <button
                    className="shop-citadel-btn"
                    onClick={handleSkipClick}
                    disabled={state.slayerPoints < skipCost}
                    title={state.slayerPoints < skipCost ? t("slayer.shop.notEnough") : undefined}
                  >
                    {skipCost > 0
                      ? t("slayer.task.skipCost").replace("{n}", String(skipCost))
                      : t("slayer.task.skipFree")}
                  </button>
                  {/* Chef-GO 26.08.2026: nur sichtbar mit Bestand — s. taskTokenCount-Kommentar. */}
                  {taskTokenCount > 0 && (
                    <button
                      className="btn-iron btn-iron--sm"
                      onClick={handleUseToken}
                    >
                      {t("slayer.task.useToken").replace("{n}", String(taskTokenCount))}
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="slayer-task-body">
              <span className="slayer-task-empty-label">{t("slayer.task.none")}</span>
              <p className="muted slayer-task-empty-hint">{t("slayer.task.noneHint")}</p>
              {streakChip && <div className="slayer-task-reward-row">{streakChip}</div>}
            </div>
            <div className="slayer-task-side">
              {/* Primäraktion des leeren Zettels = Standard-Knopf (.btn-iron), ohne !important-Größen. */}
              <button
                className="btn-iron slayer-get-task-btn"
                onClick={handleGetTask}
                disabled={availableMasters.length === 0}
              >
                {t("slayer.task.getTask")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Kopfgeld-Brett (Jagd-Paket Task 1) lebt seit Spieler-Feedback 0.2.2 Punkt 3 im schwebenden
          Elite-Mini-Fenster (components/EliteMiniWindow.tsx, app-weit in App.tsx gemountet). */}

      {/* ── Reward Shop + Jagdbuch ────────────────────────────────────
          claude:2026-10-18T11:30:00+02:00 — Eine Basalt-Fläche mit Reiterleiste (R2/R3): Karten Gravewood,
          Knöpfe Eisen. Jagdbuch (Talentbaum, 1.3.0 Säule 0) nur als Reiter, wenn es existiert. */}
      <div className="shop-panel slayer-shop-panel">
        {slayerBook ? (
          <div className="slayer-lower-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={lowerTab === "shop"}
              className={`slayer-lower-tab${lowerTab === "shop" ? " is-active" : ""}`}
              onClick={() => setLowerTab("shop")}
            >
              {t("slayer.tab.shop")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lowerTab === "book"}
              className={`slayer-lower-tab${lowerTab === "book" ? " is-active" : ""}`}
              onClick={() => setLowerTab("book")}
            >
              {tr(slayerBook.name)}
            </button>
          </div>
        ) : (
          <SectionHead title={t("slayer.tab.shop")} />
        )}
        {slayerBook && lowerTab === "book" ? (
          <TalentTree
            treeId={slayerBook.id}
            lockedHint={t("slayer.book.locked").replace("{n}", String(slayerBook.unlock.level))}
            currencyIcon={<SlayerPtIcon />}
          />
        ) : (!content.slayerShop || content.slayerShop.length === 0) ? (
          <p className="muted slayer-rewards-empty">{t("slayer.shop.empty")}</p>
        ) : (
          // claude:2026-10-17T19:40:00+02:00 — Kompakte Angebotszeilen (Bild | Name, Stufe | Preis)
          // statt 360-px-Bildkarten; Spaltenzahl folgt der Panelbreite.
          <div className="slayer-shop-grid">
            {slayerShopSorted.map((entry) => {
              const item = content.items[entry.itemId];
              if (!item) return null;
              const levelRequired = entry.slayerLevelRequired ?? 1;
              const levelOk = level >= levelRequired;
              const pointsOk = state.slayerPoints >= entry.cost;
              // Kein invOk/canHold-Vorab-Check (Alt-Bug): buySlayerShopItem lagert bei vollem Inventar
              // ins Lager um und meldet no_space erst, wenn beide Töpfe voll sind.
              const canBuy = levelOk && pointsOk;
              // Rot nur für „freigeschaltet, aber (noch) nicht leistbar"; das Level-Lock dimmt die Karte.
              const tooExpensive = levelOk && !pointsOk;

              let disabledTitle: string | undefined;
              if (!levelOk) {
                disabledTitle = t("slayer.shop.reason.level_locked").replace("{n}", String(levelRequired));
              } else if (!pointsOk) {
                disabledTitle = t("slayer.shop.reason.not_enough_points");
              }

              const buyError = shopError?.itemId === entry.itemId ? shopError : null;

              return (
                // Seltenheit zeigt sich nur an der Farbwolke der Item-Zelle (Chef-Test 26.08.2026).
                <div
                  key={entry.itemId}
                  className={`slayer-shop-card${!levelOk ? " slayer-card-locked" : ""}`}
                >
                  <ItemCell
                    itemId={entry.itemId}
                    className="slayer-shop-cell"
                    overlay={
                      !levelOk ? (
                        <span className="slayer-shop-lockbadge" aria-hidden="true">
                          {LOCKED_ICON_URL
                            ? <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="locked-icon-img" />
                            : "🔒"}
                        </span>
                      ) : undefined
                    }
                  />
                  <span className="slayer-shop-card-name">{tr(item.name)}</span>
                  {/* Feste Fußzeile: Stufe links, Preis/Kaufen rechts (Chef-Nachtrag). Ein Kauf-Fehler
                      ersetzt für 4 s die Stufen-Angabe, damit die Zeilenhöhe nicht springt. */}
                  <div className="slayer-shop-card-footer">
                    {buyError ? (
                      <span className="slayer-shop-card-error" role="alert">
                        {t(`slayer.shop.reason.${buyError.reason}`)}
                      </span>
                    ) : (
                      <span className="slayer-shop-card-level muted">
                        {t("skill.levelShort").replace("{n}", String(levelRequired))}
                      </span>
                    )}
                    <button
                      className={`btn-iron btn-iron--sm slayer-shop-buy-btn${tooExpensive ? " slayer-shop-buy-btn--tooExpensive" : ""}`}
                      disabled={!canBuy}
                      title={disabledTitle}
                      onClick={() => handleBuyShopItem(entry.itemId)}
                    >
                      <SlayerPtIcon /> {entry.cost}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
