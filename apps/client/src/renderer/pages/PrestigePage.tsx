import { useState } from "react";
import { content } from "@hearthforge/content";
import { findTalentTree, levelFromXp, prestigeAscendPreview } from "@hearthforge/engine";
import type { PrestigeAscendPreview, PrestigeHeirloomCandidate, PrestigeItemRef } from "@hearthforge/engine";
import { PRESTIGE_SKILL_LEVEL, PRESTIGE_TALENT_TREE_ID, PRESTIGE_UNLOCK_QUEST_ID } from "@hearthforge/shared";
import type { GameState, ItemId } from "@hearthforge/shared";
import { useGameControl, useGameState } from "../game/GameContext";
import type { AscendRunResult } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { getAltarScene, getBookOfScarsArt } from "../prestigeArt";
import { formatNum, formatPlaytime } from "../util/format";
import { runWithScreenFade } from "../util/screenFade";
import { NpcSpeechBubble } from "../components/NpcGreeting";
import { TalentTree } from "../components/TalentTree";
import { AshNotch } from "../components/AshNotch";
import { SectionHead } from "./SlayerPage";
import "../styles/prestige.css";

// claude:2026-10-18T14:00:00+02:00 — Scherbenaltar (Prestige „Der Aschesturz", 1.3 Welle D). Reiter Altar | Narbenbuch im
// Muster der Slayer-Seite (Belohnungs-Shop | Jägerkodex): dieselbe Basalt-Fläche, dieselben Reiter-Knöpfe, der
// Baum ist die vorhandene TalentTree-Komponente. Alle Zahlen und Regeln liefert die Engine
// (`prestigeAscendPreview`, `prestigeUnlock`); hier wird nur gewählt und angezeigt. Der Ablauf des Aufstiegs
// (Speichern, Sicherung, ascend, Speichern, Remount) lebt in GameContext `ascendRun`.

/** Kleines Narben-Zeichen (zwei gekreuzte Kerben) als Währungs-Symbol; reines SVG, keine Bilddatei nötig. */
export function ScarGlyph({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg className="prestige-scar-glyph" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 13 L13 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M5.4 5.4 L8 8 M8.4 8.4 L10.6 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

/** Stabiler Schlüssel eines Erbstück-Kandidaten (Basis-Item plus optionale Instanz). */
function heirloomKey(ref: PrestigeItemRef): string {
  return `${ref.itemId}#${ref.instanceId ?? ""}`;
}

/** Erbstück-Auswahl als Zählung je Schlüssel (einfache Items dürfen mehrfach gewählt werden). */
function refsToCounts(refs: readonly PrestigeItemRef[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of refs) out[heirloomKey(r)] = (out[heirloomKey(r)] ?? 0) + 1;
  return out;
}

function skillsAt99(state: GameState): string[] {
  return Object.keys(content.skills).filter((id) => levelFromXp(state.skills[id]?.xp ?? 0) >= PRESTIGE_SKILL_LEVEL);
}

type PickProps = {
  itemId: ItemId;
  label: string;
  sub?: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

/** Auswahlkarte für ein Erbstück oder einen Truhen-Stapel (Bild, Name, Zusatzzeile, Häkchen). */
function PickCard({ itemId, label, sub, selected, disabled, onClick }: PickProps): JSX.Element {
  const item = content.items[itemId];
  const img = getItemImage(itemId);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={`prestige-pick ${rarityClass(item?.rarity)}${selected ? " is-selected" : ""}`}
      disabled={disabled && !selected}
      onClick={onClick}
      title={label}
    >
      <span className="prestige-pick-img">
        {img ? <img loading="lazy" decoding="async" src={img} alt="" /> : <span aria-hidden="true">{item?.icon ?? "▪"}</span>}
      </span>
      <span className="prestige-pick-text">
        <span className="prestige-pick-name">{label}</span>
        {sub && <span className="prestige-pick-sub muted">{sub}</span>}
      </span>
      <span className="prestige-pick-check" aria-hidden="true">{selected ? "✓" : ""}</span>
    </button>
  );
}

function BreakdownRow({ label, value, strong }: { label: string; value: number; strong?: boolean }): JSX.Element {
  return (
    <div className={`prestige-row${strong ? " prestige-row--total" : ""}`}>
      <span className="prestige-row-label">{label}</span>
      <span className="prestige-row-value">{strong ? <ScarGlyph size={18} /> : "+"} {formatNum(value)}</span>
    </div>
  );
}

function AltarTab({ preview }: { preview: PrestigeAscendPreview }): JSX.Element {
  const state = useGameState();
  const { ascendRun } = useGameControl();
  const { t, tr } = useI18n();
  const c = state.character;
  const { unlock, points } = preview;

  // Auswahl: null = Vorgabe der Vorschau (deterministisch, vorausgewählt); erst die erste Berührung legt sie fest.
  const [heirSel, setHeirSel] = useState<Record<string, number> | null>(null);
  const [stashSel, setStashSel] = useState<ItemId[] | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidatesByKey = new Map<string, PrestigeHeirloomCandidate>(
    preview.heirloomCandidates.map((cand) => [heirloomKey(cand), cand] as const),
  );
  // Nur noch gültige Kandidaten zählen (Beute oder Verkauf zwischen zwei Ticks ändert die Liste).
  const heirCounts: Record<string, number> = {};
  for (const [key, n] of Object.entries(heirSel ?? refsToCounts(preview.heirloomDefault))) {
    const cand = candidatesByKey.get(key);
    if (cand && n > 0) heirCounts[key] = Math.min(n, cand.count);
  }
  const heirTotal = Object.values(heirCounts).reduce((a, b) => a + b, 0);
  const heirFull = heirTotal >= preview.heirloomSlots;

  const stashValid = new Set(preview.stashCandidates.map((s) => s.itemId));
  const stashChosen = (stashSel ?? preview.stashDefault).filter((id) => stashValid.has(id));
  const stashFull = stashChosen.length >= preview.stashSlots;

  function changeHeirloom(key: string, delta: number): void {
    const cand = candidatesByKey.get(key);
    if (!cand) return;
    const next = { ...heirCounts };
    const now = (next[key] ?? 0) + delta;
    if (now <= 0) delete next[key];
    else if (now <= cand.count && (delta < 0 || !heirFull)) next[key] = now;
    setHeirSel(next);
  }

  function toggleStash(itemId: ItemId): void {
    if (stashChosen.includes(itemId)) setStashSel(stashChosen.filter((id) => id !== itemId));
    else if (!stashFull) setStashSel([...stashChosen, itemId]);
  }

  const chapterQuest = content.quests.find((q) => q.id === PRESTIGE_UNLOCK_QUEST_ID);
  const at99 = skillsAt99(state);
  const history = state.prestige?.history ?? [];
  const nameOk = typed.trim() === c.name.trim() && c.name.trim().length > 0;

  async function onAscend(): Promise<void> {
    if (!nameOk || busy) return;
    setBusy(true);
    setError(null);
    const heirlooms: PrestigeItemRef[] = [];
    for (const cand of preview.heirloomCandidates) {
      const n = heirCounts[heirloomKey(cand)] ?? 0;
      for (let i = 0; i < n; i++) heirlooms.push(cand.instanceId !== undefined ? { itemId: cand.itemId, instanceId: cand.instanceId } : { itemId: cand.itemId });
    }
    let result: AscendRunResult = { ok: false, reason: "busy" };
    // Asche-Überblendung: schwarz/aschgrau, währenddessen läuft der ganze Ablauf (Speichern, Sicherung, Aufstieg).
    await runWithScreenFade(async () => {
      result = await ascendRun({ heirlooms, stash: stashChosen });
    }, { tone: "ash" });
    if (!result.ok) {
      setBusy(false);
      setError(t(`prestige.reason.${result.reason}`));
    }
    // Bei Erfolg wurde der Spielbaum neu aufgebaut (sessionEpoch); diese Komponente ist dann schon weg.
  }

  return (
    <div className="prestige-altar">
      {/* ── Voraussetzungen ─────────────────────────────────────────── */}
      <section className="prestige-block">
        <SectionHead title={t("prestige.req.title")} />
        <ul className="prestige-reqs">
          <li className={`prestige-req${unlock.skills99 >= unlock.required ? " is-done" : ""}`}>
            <span className="prestige-req-mark" aria-hidden="true">{unlock.skills99 >= unlock.required ? "✓" : "○"}</span>
            <span className="prestige-req-text">
              {t("prestige.req.skills")
                .replace("{n}", String(Math.min(unlock.skills99, unlock.required)))
                .replace("{need}", String(unlock.required))
                .replace("{level}", String(PRESTIGE_SKILL_LEVEL))}
            </span>
          </li>
          <li className="prestige-req-chips" aria-label={t("prestige.req.skillsList")}>
            {at99.length === 0 ? (
              <span className="muted">{t("prestige.req.noSkills")}</span>
            ) : (
              at99.map((id) => (
                <span key={id} className="prestige-chip">{tr(content.skills[id]!.name)}</span>
              ))
            )}
          </li>
          <li className={`prestige-req${unlock.chronicleDone ? " is-done" : ""}`}>
            <span className="prestige-req-mark" aria-hidden="true">{unlock.chronicleDone ? "✓" : "○"}</span>
            <span className="prestige-req-text">
              {t("prestige.req.chapter").replace("{name}", chapterQuest ? tr(chapterQuest.name) : PRESTIGE_UNLOCK_QUEST_ID)}
            </span>
          </li>
        </ul>
      </section>

      {unlock.ok && (
        <>
          {/* ── Narben-Vorschau ───────────────────────────────────────── */}
          <section className="prestige-block">
            <SectionHead title={t("prestige.preview.title")} />
            <div className="prestige-rows">
              <BreakdownRow label={t("prestige.preview.base")} value={points.fromBase} />
              <BreakdownRow label={t("prestige.preview.skills").replace("{n}", String(points.skills99))} value={points.fromSkills} />
              {points.fromTotalLevel > 0 && (
                <BreakdownRow label={t("prestige.preview.totalLevel").replace("{n}", formatNum(points.totalLevel))} value={points.fromTotalLevel} />
              )}
              {points.fromChronicle > 0 && (
                <BreakdownRow label={t("prestige.preview.chapters").replace("{n}", String(points.lateChapters))} value={points.fromChronicle} />
              )}
              {points.fromParagon > 0 && (
                <BreakdownRow label={t("prestige.preview.paragon").replace("{n}", String(points.paragonBest))} value={points.fromParagon} />
              )}
              {points.fromMult > 0 && <BreakdownRow label={t("prestige.preview.mult")} value={points.fromMult} />}
              <BreakdownRow label={t("prestige.preview.total")} value={points.total} strong />
            </div>
          </section>

          {/* ── Auswahl: Erbstücke und Vergrabene Truhe ────────────────── */}
          <section className="prestige-block">
            <SectionHead title={t("prestige.carry.title")} />
            <p className="muted prestige-note">{t("prestige.carry.intro")}</p>

            <h4 className="prestige-sub-title">
              {t("prestige.carry.heirloom").replace("{n}", String(heirTotal)).replace("{max}", String(preview.heirloomSlots))}
            </h4>
            {preview.heirloomSlots === 0 ? (
              <p className="muted prestige-note">{t("prestige.carry.noSlots")}</p>
            ) : preview.heirloomCandidates.length === 0 ? (
              <p className="muted prestige-note">{t("prestige.carry.heirloomEmpty")}</p>
            ) : (
              <>
                <p className="muted prestige-note">{t("prestige.carry.heirloomHint")}</p>
                <div className="prestige-picks">
                  {preview.heirloomCandidates.map((cand) => {
                    const key = heirloomKey(cand);
                    const n = heirCounts[key] ?? 0;
                    const item = content.items[cand.itemId];
                    const where = t(`prestige.loc.${cand.location}`);
                    const name = item ? tr(item.name) : cand.itemId;
                    return (
                      <div key={key} className="prestige-pick-wrap">
                        <PickCard
                          itemId={cand.itemId}
                          label={cand.instanceId !== undefined ? `${name} ✦` : name}
                          sub={`${t("prestige.carry.requirement").replace("{n}", String(cand.requirement))} · ${where}`}
                          selected={n > 0}
                          disabled={heirFull}
                          onClick={() => changeHeirloom(key, n > 0 && cand.count === 1 ? -1 : n > 0 ? -n : 1)}
                        />
                        {cand.count > 1 && (
                          <span className="prestige-stepper">
                            <button type="button" className="shop-citadel-btn shop-citadel-btn--sm" disabled={n <= 0} onClick={() => changeHeirloom(key, -1)} aria-label={t("prestige.carry.less")}>−</button>
                            <span className="prestige-stepper-n">{n} / {cand.count}</span>
                            <button type="button" className="shop-citadel-btn shop-citadel-btn--sm" disabled={n >= cand.count || heirFull} onClick={() => changeHeirloom(key, 1)} aria-label={t("prestige.carry.more")}>+</button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <h4 className="prestige-sub-title">
              {t("prestige.carry.stash").replace("{n}", String(stashChosen.length)).replace("{max}", String(preview.stashSlots))}
            </h4>
            {preview.stashSlots === 0 ? (
              <p className="muted prestige-note">{t("prestige.carry.noSlots")}</p>
            ) : preview.stashCandidates.length === 0 ? (
              <p className="muted prestige-note">{t("prestige.carry.stashEmpty")}</p>
            ) : (
              <>
                <p className="muted prestige-note">{t("prestige.carry.stashHint").replace("{cap}", formatNum(preview.stashStackCap))}</p>
                <div className="prestige-picks prestige-picks--scroll">
                  {preview.stashCandidates.map((cand) => {
                    const item = content.items[cand.itemId];
                    return (
                      <PickCard
                        key={cand.itemId}
                        itemId={cand.itemId}
                        label={item ? tr(item.name) : cand.itemId}
                        sub={t("prestige.carry.stashQty").replace("{keep}", formatNum(cand.keep)).replace("{owned}", formatNum(cand.owned))}
                        selected={stashChosen.includes(cand.itemId)}
                        disabled={stashFull}
                        onClick={() => toggleStash(cand.itemId)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── Geht / Bleibt ────────────────────────────────────────── */}
          <section className="prestige-block">
            <div className="prestige-split">
              <div className="prestige-split-col prestige-split-col--goes">
                <h4 className="prestige-sub-title">{t("prestige.goes.title")}</h4>
                <ul className="prestige-list">
                  <li>{t("prestige.goes.levels").replace("{n}", formatNum(preview.summary.goes.totalLevel))}</li>
                  <li>{t("prestige.goes.gold").replace("{n}", formatNum(preview.summary.goes.gold))}</li>
                  {preview.summary.goes.questTokens > 0 && <li>{t("prestige.goes.tokens").replace("{n}", formatNum(preview.summary.goes.questTokens))}</li>}
                  {preview.summary.goes.slayerPoints > 0 && <li>{t("prestige.goes.slayer").replace("{n}", formatNum(preview.summary.goes.slayerPoints))}</li>}
                  <li>
                    {t("prestige.goes.gear")
                      .replace("{eq}", String(preview.summary.goes.equippedPieces))
                      .replace("{kinds}", String(preview.summary.goes.itemKinds))}
                  </li>
                  {preview.summary.goes.instances > 0 && <li>{t("prestige.goes.instances").replace("{n}", String(preview.summary.goes.instances))}</li>}
                  <li>{t("prestige.goes.quests").replace("{n}", String(preview.summary.goes.questsClaimed))}</li>
                  <li>{t("prestige.goes.world")}</li>
                </ul>
              </div>
              <div className="prestige-split-col prestige-split-col--stays">
                <h4 className="prestige-sub-title">{t("prestige.stays.title")}</h4>
                <ul className="prestige-list">
                  <li>{t("prestige.stays.pets").replace("{n}", String(preview.summary.stays.pets))}</li>
                  <li>{t("prestige.stays.mastery").replace("{n}", formatNum(preview.summary.stays.masteryActions))}</li>
                  <li>{t("prestige.stays.achievements").replace("{n}", formatNum(preview.summary.stays.achievements))}</li>
                  {preview.summary.stays.talentRanks > 0 && <li>{t("prestige.stays.talents").replace("{n}", String(preview.summary.stays.talentRanks))}</li>}
                  <li>{t("prestige.stays.records")}</li>
                  <li>{t("prestige.stays.identity")}</li>
                  {preview.summary.stays.heldMail > 0 && <li>{t("prestige.stays.mail").replace("{n}", String(preview.summary.stays.heldMail))}</li>}
                  {preview.startingGold > 0 && <li>{t("prestige.stays.startGold").replace("{n}", formatNum(preview.startingGold))}</li>}
                  {preview.keepTools && <li>{t("prestige.stays.tools").replace("{n}", String(preview.tools.reduce((a, x) => a + x.qty, 0)))}</li>}
                  {heirTotal > 0 && <li>{t("prestige.stays.heirlooms").replace("{n}", String(heirTotal))}</li>}
                  {stashChosen.length > 0 && <li>{t("prestige.stays.stash").replace("{n}", String(stashChosen.length))}</li>}
                </ul>
              </div>
            </div>
          </section>

          {/* ── Bestätigung (doppelt: Name eintippen, dann Knopf) ────── */}
          <section className="prestige-block prestige-confirm">
            <SectionHead title={t("prestige.confirm.title")} />
            <NpcSpeechBubble name={t("npc.guide.name")} tail="none">{t("prestige.confirm.text")}</NpcSpeechBubble>
            <label className="prestige-confirm-field">
              <span className="prestige-confirm-prompt">{t("prestige.confirm.prompt").replace("{name}", c.name)}</span>
              <input
                type="text"
                className="prestige-confirm-input"
                value={typed}
                placeholder={c.name}
                maxLength={64}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                onChange={(e) => { setTyped(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") void onAscend(); }}
              />
            </label>
            {error && <p className="prestige-error" role="alert">{error}</p>}
            <div className="prestige-confirm-actions">
              <button type="button" className="btn-iron prestige-ascend-btn" disabled={!nameOk || busy} onClick={() => void onAscend()}>
                {busy ? t("prestige.confirm.busy") : t("prestige.confirm.button")}
              </button>
              <span className="muted prestige-confirm-gain">
                {t("prestige.confirm.gain").replace("{n}", formatNum(points.total))}
              </span>
            </div>
          </section>
        </>
      )}

      {history.length > 0 && (
        <section className="prestige-block">
          <SectionHead title={t("prestige.history.title")} />
          <ul className="prestige-list prestige-history">
            {history.map((rec, i) => (
              <li key={i}>
                {t("prestige.history.row")
                  .replace("{n}", String(i + 1))
                  .replace("{points}", formatNum(rec.points))
                  .replace("{level}", formatNum(rec.totalLevel))
                  .replace("{skills}", String(rec.skills99))
                  .replace("{time}", formatPlaytime(rec.activePlayMs))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function PrestigePage(): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  const [tab, setTab] = useState<"altar" | "book">("altar");
  const preview = prestigeAscendPreview(state, content);
  const count = state.prestige?.count ?? 0;
  const book = findTalentTree(content, PRESTIGE_TALENT_TREE_ID);
  const scene = getAltarScene();
  const bookArt = getBookOfScarsArt();

  return (
    <div className="prestige-page">
      {/* Altar-Szene: Banner mit der Stimme des Wächters (Begrüßung oder Sperrtext) und dem Narben-Stand. Bild
          `assets/ui/prestige/altar_scene.webp`; fehlt es, dient die Hallen-Kulisse als Hintergrund. */}
      <section
        className="prestige-scene"
        style={scene ? { backgroundImage: `url("${scene}")` } : undefined}
      >
        <div className="prestige-scene-veil" aria-hidden="true" />
        <div className="prestige-scene-body">
          <NpcSpeechBubble name={t("npc.guide.name")} tail="none">
            {preview.unlock.ok ? t("prestige.greeting") : t("prestige.lockedText")}
          </NpcSpeechBubble>
          <div className="prestige-balance" aria-label={t("prestige.scars")}>
            <ScarGlyph size={22} />
            <span className="prestige-balance-amount">{formatNum(state.prestige?.points ?? 0)}</span>
            <span className="prestige-balance-label">{t("prestige.scars")}</span>
            {count > 0 && (
              <span className="prestige-balance-count">
                <AshNotch count={count} />
                <span className="muted">{t("prestige.count").replace("{n}", String(count))}</span>
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="shop-panel slayer-shop-panel prestige-panel">
        <div className="slayer-lower-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "altar"}
            className={`slayer-lower-tab${tab === "altar" ? " is-active" : ""}`}
            onClick={() => setTab("altar")}
          >
            {t("prestige.tab.altar")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "book"}
            className={`slayer-lower-tab${tab === "book" ? " is-active" : ""}`}
            onClick={() => setTab("book")}
          >
            {bookArt && <img loading="lazy" decoding="async" src={bookArt} alt="" className="prestige-tab-art" />}
            {t("prestige.tab.book")}
          </button>
        </div>
        {tab === "altar" ? (
          <AltarTab preview={preview} />
        ) : (
          <>
            <p className="muted prestige-note">{t("prestige.book.explain")}</p>
            <TalentTree
              treeId={PRESTIGE_TALENT_TREE_ID}
              lockedHint={t("prestige.book.locked")}
              currencyIcon={<ScarGlyph size={16} />}
            />
          </>
        )}
      </div>
    </div>
  );
}
