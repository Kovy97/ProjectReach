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
    : <span style={{ fontSize: 13 }}>★</span>;
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

  const selectedMaster = activeMasterId
    ? (allMasters.find((m) => m.id === activeMasterId) ?? null)
    : null;

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

  // ── Speech bubble text ────────────────────────────────────────────
  const playerName = state.character.name;
  let speechText: string;
  if (!task) {
    speechText = t("slayer.speech.noTask").replace("{name}", playerName);
  } else if (task.progress >= task.required) {
    speechText = t("slayer.speech.taskDone").replace("{name}", playerName);
  } else {
    speechText = t("slayer.speech.taskActive").replace("{name}", playerName);
  }

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

  return (
    <div className="slayer-page">
      {/* Kopfbox entfernt (Chef): Name + Level stehen bereits oben in der Title-Bar (content-header). */}

      {/* NPC-Begrüßung („Speaking Head", Chef-GO 2026-07-13) — hier ECHT: Brenna Aschenweide,
          Porträt + Name sind final (kein Platzhalter wie auf Bank/Shop/Quests). */}
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

      {/* ── Master tabs (DS wooden-frame buttons) ───────────────────── */}
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

      {/* ── Dialog row: Portrait (left) + Task (right) ─────────────── */}
      <div className="slayer-dialog-row">
        {/* ── Left: Master portrait + speech (wooden-frame panel) ──── */}
        <div className="slayer-dialog-col shop-panel">
          {/* Portrait frame — full width, bottom-aligned image */}
          <div className="slayer-portrait-area">
            {selectedMaster ? (() => {
              const url = getPortrait("slayermaster_" + selectedMaster.id);
              return url ? (
                <img loading="lazy" decoding="async" src={url} alt="" className="pixelart slayer-portrait-img" />
              ) : SLAYER_FALLBACK_ICON_URL ? (
                <img loading="lazy" decoding="async" src={SLAYER_FALLBACK_ICON_URL} alt="" className="slayer-portrait-fallback-img" />
              ) : (
                <span className="slayer-portrait-fallback" aria-hidden="true">💀</span>
              );
            })() : SLAYER_FALLBACK_ICON_URL ? (
              <img loading="lazy" decoding="async" src={SLAYER_FALLBACK_ICON_URL} alt="" className="slayer-portrait-fallback-img" />
            ) : (
              <span className="slayer-portrait-fallback" aria-hidden="true">💀</span>
            )}
          </div>

          {/* Nameplate: name + role below portrait */}
          {selectedMaster && (
            <div className="slayer-nameplate">
              <div className="slayer-master-name">{tr(selectedMaster.name)}</div>
              <div className="slayer-master-title muted">{t("slayer.master.title")}</div>
            </div>
          )}

          {/* Speech box — parchment-style, fills remaining height */}
          <div className="slayer-speech-box">{speechText}</div>
        </div>

        {/* ── Right: Points balance + Task panel ───────────────────── */}
        <div className="slayer-task-col">
          {/* Slayer Points — prominent full-width counter at top */}
          <div className="slayer-balance">
            <span className="slayer-balance-icon">
              {SLAYER_POINTS_ICON_URL
                ? <img loading="lazy" decoding="async" src={SLAYER_POINTS_ICON_URL} alt="" className="ui-icon" />
                : "★"}
            </span>
            <span className="slayer-balance-amount">{state.slayerPoints}</span>
            <span className="slayer-balance-label">{t("slayer.points")}</span>
          </div>

          {task ? (
            <div className="slayer-task-panel shop-panel">
              {/* Monster info row */}
              <div className="slayer-task-monster">
                <div className="slayer-task-monster-img">
                  {(() => {
                    const src = getMonsterSrc(task.monsterId);
                    if (src) return <img loading="lazy" decoding="async" src={src} alt="" className="pixelart" />;
                    return SLAYER_FALLBACK_ICON_URL ? (
                      <img loading="lazy" decoding="async" src={SLAYER_FALLBACK_ICON_URL} alt="" className="slayer-portrait-fallback-img" />
                    ) : (
                      <span aria-hidden="true">💀</span>
                    );
                  })()}
                </div>
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
                  </span>
                  {onNavigate && (
                    <button
                      className="slayer-locate-btn muted"
                      onClick={() => onNavigate("combat")}
                    >
                      {t("slayer.task.goToMonster")}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar — Chef-Fund 26.08.2026: gehört visuell zum "Zielmonster"-Block
                  (Bild+Name+Fortschritt) direkt über den Kampf-Knöpfen, nicht mehr danach. */}
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

              {/* Spieler-Report 1.0.2: beide Wege direkt vom Zettel, mit der Restmenge als Ziel.
                  Vorher blieb nur der Sprung auf die Kampfseite — dort das Monster wiederfinden
                  und die Restzahl selbst abzaehlen. Chef-Fund 26.08.2026 ("gehen unter"): eigene
                  volle-Breite-Zeile direkt unter Fortschritt/VOR den Belohnungs-Chips, Primäraktion
                  deutlich größer (slayer.css `.slayer-task-fight-row`). */}
              {taskRest > 0 && (
                <div className="slayer-task-fight-row">
                  {/* Chef-Fund 25.08. (1.1.0 live): "sehen aus wie Windows-Buttons" — `.btn` war
                      nirgends in der CSS definiert, lief also auf dem nackten Browser-Default.
                      Knopf-Vereinheitlichung 26.08.2026: Primaer (Sofort kaempfen) = `.btn-iron`,
                      Sekundaer (Einreihen) = `.shop-citadel-btn`. */}
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

              {/* Kopfgeld auf dem Zettel (Fun-Sweep FF, Vesna V1-Anzeige — slayer-vesna.md
                  Befund 2: "Auf dem Auftragszettel selbst steht KEINE Belohnung"). xpReward/
                  pointReward stehen schon im Task-Objekt (beim Assign deterministisch fixiert,
                  s. SlayerTask-JSDoc) — hier nur anzeigen, kein neuer State. Die Punkte-
                  Skalierungsformel ändert parallel Welle GG in der Engine; diese Zeile liest nur
                  die fertig berechneten Felder, bleibt also kompatibel. */}
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
                    <SlayerPtIcon /> {t("slayer.task.rewardPoints").replace("{n}", formatNum(task.pointReward))}
                  </HoverTip>
                ) : (
                  <span className="slayer-task-reward-chip slayer-task-reward-chip--pts">
                    <SlayerPtIcon /> {t("slayer.task.rewardPoints").replace("{n}", formatNum(task.pointReward))}
                  </span>
                )}
                {/* Task-Streak sichtbar (Welle GG → UI, Fun-Sweep Programm Welle II §2): nur ab
                    dem ersten abgeschlossenen Task dieser Serie — vorher gibt es nichts zu zeigen.
                    Welle KK (Vesna-Retest, "Serien-Takt unsichtbar"): Countdown zum nächsten Bonus
                    ergänzt — nächster Vielfacher von SLAYER_STREAK_TOKEN_INTERVAL (der Punkte-Bonus
                    landet immer AUF einem Token-Intervall, s. shared/index.ts), aus der geteilten
                    Konstante berechnet statt hartkodiert. */}
                {state.slayerStreak > 0 && (
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
                )}
              </div>

              {/* Requirement warning */}
              {!reqMet && reqItemName && (
                <div className="slayer-req-warning">
                  {t("slayer.req.missing").replace("{item}", reqItemName)}
                </div>
              )}

              {/* Gratis-Skip der Trophäenwand III (Das Lager, Task #361) — siehe hasFreeSkipSource. */}
              {hasFreeSkipSource && (
                <div className={`slayer-freeskip${freeSkipToday ? " is-available" : ""}`}>
                  {t(freeSkipToday ? "slayer.freeSkip.available" : "slayer.freeSkip.used")}
                </div>
              )}

              {/* Action buttons — EIN Pfad (Skip Task, mit Confirm-Schritt bei Kosten > 0);
                  s. handleSkipClick-Kommentar für die Konsolidierungs-Begründung. */}
              {confirmCancel ? (
                <div className="slayer-cancel-confirm">
                  <p className="slayer-cancel-confirm-text muted">
                    {skipCost > 0
                      ? t("slayer.task.cancelConfirm").replace("{n}", String(skipCost))
                      : t("slayer.task.cancelConfirmFree")}
                  </p>
                  {/* Streak-Bruch-Hinweis (Welle GG → UI, Fun-Sweep Programm Welle II §2): nur wenn
                      es überhaupt eine Serie gibt UND dieser Skip bezahlt ist (die Gratis-Gnade
                      unter SLAYER_SKIP_FREE_BELOW_LEVEL bricht die Serie nicht, s. skipTask). */}
                  {state.slayerStreak > 0 && skipCost > 0 && (
                    <p className="slayer-cancel-streak-warning muted">
                      {t("slayer.task.streakSkipWarning")}
                    </p>
                  )}
                  <div className="slayer-task-actions">
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
                <div className="slayer-task-actions">
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
                </div>
              )}
            </div>
          ) : (
            /* Empty task panel */
            <div className="slayer-task-panel shop-panel empty">
              {SLAYER_FALLBACK_ICON_URL ? (
                <img loading="lazy" decoding="async" src={SLAYER_FALLBACK_ICON_URL} alt="" className="slayer-task-empty-icon-img" />
              ) : (
                <span className="slayer-task-empty-icon" aria-hidden="true">💀</span>
              )}
              <span className="slayer-task-empty-label">{t("slayer.task.none")}</span>
              <p className="muted">{t("slayer.task.noneHint")}</p>
              <button
                className="shop-citadel-btn slayer-get-task-btn"
                onClick={handleGetTask}
                disabled={availableMasters.length === 0}
              >
                {t("slayer.task.getTask")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Kopfgeld-Brett (Jagd-Paket Task 1) lebt seit Spieler-Feedback 0.2.2 Punkt 3 nicht mehr
          hier fest verankert — ersetzt durch das schwebende Elite-Mini-Fenster
          (components/EliteMiniWindow.tsx, app-weit in App.tsx gemountet), damit es keinen
          Platz mehr im Hauptinterface belegt. BountyBoard.tsx entfernt. */}

      {/* ── Reward Shop ───────────────────────────────────────────── */}
      {/* Chef-Fund 26.08.2026: eigene Basalt-Fläche (slayer-shop-panel, s. slayer.css) statt der
          Holz-Textur von `.shop-panel` — klare Trennung zur Leder-Fläche der Karten darunter. */}
      <div className="shop-panel slayer-shop-panel">
        <SectionHead title={t("slayer.tab.shop")} />
        {(!content.slayerShop || content.slayerShop.length === 0) ? (
          <p className="muted slayer-rewards-empty">{t("slayer.shop.empty")}</p>
        ) : (
          <div className="shop-items-grid slayer-shop-grid">
            {slayerShopSorted.map((entry) => {
              const item = content.items[entry.itemId];
              if (!item) return null;
              const levelRequired = entry.slayerLevelRequired ?? 1;
              const levelOk = level >= levelRequired;
              const pointsOk = state.slayerPoints >= entry.cost;
              // Kein invOk/canHold-Vorab-Check mehr (Alt-Bug): buySlayerShopItem lagert bei vollem
              // Inventar automatisch ins Lager um (addItemOrBank) und erstattet die Punkte NUR, wenn
              // wirklich beide Töpfe voll sind (no_space) — der seltene Fall landet als Fehlermeldung
              // nach dem Klick statt den Button vorschnell zu sperren.
              const canBuy = levelOk && pointsOk;
              // "Preis rot" (Chef) nur für den leistbaren-aber-noch-gesperrten Fall gibt es nicht —
              // rot markiert gezielt "freigeschaltet, aber (noch) nicht leistbar"; das Level-Lock
              // dimmt bereits die ganze Karte (`slayer-card-locked`), braucht keine zweite Farbe.
              const tooExpensive = levelOk && !pointsOk;

              let disabledTitle: string | undefined;
              if (!levelOk) {
                disabledTitle = t("slayer.shop.reason.level_locked").replace("{n}", String(levelRequired));
              } else if (!pointsOk) {
                disabledTitle = t("slayer.shop.reason.not_enough_points");
              }

              const buyError = shopError?.itemId === entry.itemId ? shopError : null;

              return (
                // Chef-Fund 26.08.2026 ("Karten uneinheitlich, komische Ränder für Rarity, Bild nutzt
                // nur einen kleinen Teilbereich"): eigene `slayer-shop-*`-Kartenfamilie (slayer.css)
                // statt der pages.css `shop-item-card`-Familie — deren Kartenhöhe wuchs mit der
                // Namenslänge. Seltenheit zeigt sich NUR noch am Rahmen der Item-Zelle selbst
                // (ItemCell setzt rarityClass(item.rarity) intern, s. components.css
                // `body .item-cell.rarity-*`) — keine zweite, eigens gemalte Rarity-Kontur mehr auf
                // der Karte.
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
                  <div className="slayer-shop-card-body">
                    <span className="slayer-shop-card-name">{tr(item.name)}</span>
                    {/* Feste Fußzeile: Stufe links, Preis/Kaufen rechts — immer beide, ob gesperrt
                        oder nicht (Chef: "Preis und Stufe in einer festen Fußzeile"). */}
                    <div className="slayer-shop-card-footer">
                      <span className="slayer-shop-card-level muted">
                        {t("skill.levelShort").replace("{n}", String(levelRequired))}
                      </span>
                      <button
                        className={`btn-iron btn-iron--sm slayer-shop-buy-btn${tooExpensive ? " slayer-shop-buy-btn--tooExpensive" : ""}`}
                        disabled={!canBuy}
                        title={disabledTitle}
                        onClick={() => handleBuyShopItem(entry.itemId)}
                      >
                        <SlayerPtIcon /> {entry.cost}
                      </button>
                    </div>
                    {/* Reservierte Fehlerzeile (immer gerendert, leer ohne Fehler) — ein Kauf-Fehler
                        darf die Kartenhöhe nicht kurzzeitig verschieben. */}
                    <span className="slayer-shop-card-error-slot" role="alert">
                      {buyError ? t(`slayer.shop.reason.${buyError.reason}`) : ""}
                    </span>
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
