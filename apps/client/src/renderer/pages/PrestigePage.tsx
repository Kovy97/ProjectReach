import { useState } from "react";
import { content } from "@hearthforge/content";
import { acknowledgePrestigeRespec, findTalentTree, levelFromXp, prestigeAscendPreview, prestigeRespecPending } from "@hearthforge/engine"; // claude:2026-10-31T14:58:54+01:00 — + Narben-Rückgabe 1.4.2
import type { PrestigeAscendPreview, PrestigeHeirloomCandidate, PrestigeItemRef, PrestigePointsBreakdown, PrestigePointsSource } from "@hearthforge/engine";
import { PRESTIGE_RESPEC_RETRO_KEYS, PRESTIGE_SKILL_LEVEL, PRESTIGE_TALENT_TREE_ID, PRESTIGE_UNLOCK_QUEST_ID, prestigeAshSignXp } from "@hearthforge/shared"; // claude:2026-10-31T14:58:54+01:00 — + PRESTIGE_RESPEC_RETRO_KEYS
import type { GameState, ItemId, PrestigeRespec142 } from "@hearthforge/shared"; // claude:2026-10-31T14:58:54+01:00 — + PrestigeRespec142
import { useGameControl, useGameState } from "../game/GameContext";
import type { AscendRunResult } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { getAltarScene, getBookOfScarsArt, getScarCurrencyArt } from "../prestigeArt";
import { getSidebarIcon } from "../sidebarIcons"; // claude:2026-11-01T11:42:05+01:00 — Symbole der Quellen-Karten
import { raidChestArt } from "../raidArt";
import { formatNum, formatPct1, formatPlaytime } from "../util/format";
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
  // claude:2026-10-18T19:00:00+02:00 — liegt `scar_currency.webp` vor, zeigt das Symbol das gemalte Bild (gleiche Größe).
  const art = getScarCurrencyArt();
  if (art) return <img className="prestige-scar-glyph prestige-scar-art" src={art} width={size} height={size} alt="" aria-hidden="true" />;
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

// claude:2026-10-30T19:40:00+01:00 — 1.4.2 Aschesturz 2.0 (Chef 30.10.: „Erklärung jeder Quelle, damit jeder Spieler transparent weiß, was wie viel
// Punkte gibt“). Ersetzt die frühere Punkte-Aufschlüsselung des Altars: je Quelle Name, Regel in Klartext, aktueller Stand,
// Narben, Rest bis zur nächsten Narbe und Deckel; alle Zahlen kommen aus `prestigePointsPreview().sources` der Engine.
// claude:2026-11-01T11:42:05+01:00 — Chef 01.11.: „coolere Karten, die stolz das Erreichte zeigen, statt lebloser Leisten“.
// Jede Quelle ist eine Karte: Symbol + Name, Narben-Siegel oben rechts, der erreichte Stand groß in der Mitte (Zahl aus der
// {n}-Vorlage herausgelöst), darunter Rest/Deckel und die Regel klein. Zahlende Quellen im Eisenrahmen, leere gedämpft.
const SOURCE_ICON: Record<string, string> = {
  base: "prestige",
  skills99: "mastery",
  totalLevel: "overall",
  chronicle: "quests",
  paragon: "combat",
  gold: "bank",
  dungeons: "city",
  slayer: "slayer",
  pets: "companions",
  bestiary: "bestiary",
  achievements: "achievements",
};
function sourceArt(id: string): string | null {
  if (id === "raid") return raidChestArt(false);
  if (id === "raidFirst") return raidChestArt(true);
  const key = SOURCE_ICON[id];
  return key ? getSidebarIcon(key) : null;
}

function SourceRow({ src }: { src: PrestigePointsSource }): JSX.Element {
  const { t } = useI18n();
  const once = src.kind === "once";
  const capHit = src.cap !== null && src.scars >= src.cap && src.id !== "base";
  const tpl = t(`prestige.src.now.${src.id}`);
  const [pre, post] = tpl.includes("{n}") ? (tpl.split("{n}") as [string, string]) : [tpl, ""];
  const art = sourceArt(src.id);
  return (
    <li className={`prestige-src${capHit ? " is-capped" : ""}${src.scars > 0 ? " is-paying" : " is-idle"}`}>
      <div className="prestige-src-head">
        {art && <img loading="lazy" decoding="async" src={art} alt="" className="prestige-src-art" />}
        <span className="prestige-src-name">{t(`prestige.src.name.${src.id}`)}</span>
        <span className="prestige-src-scars">
          <ScarGlyph size={16} />
          <span>+{formatNum(src.scars)}</span>
        </span>
      </div>
      <div className="prestige-src-now">
        {tpl.includes("{n}") ? (
          <>
            {pre.trim() && <span className="prestige-src-unit">{pre.trim()}</span>}
            <strong className="prestige-src-amount">{formatNum(src.amount)}</strong>
            {post.trim() && <span className="prestige-src-unit">{post.trim()}</span>}
          </>
        ) : (
          <strong className="prestige-src-amount prestige-src-amount--text">{tpl}</strong>
        )}
      </div>
      <div className="prestige-src-stand">
        {capHit && <span className="prestige-src-stamp">{t("prestige.src.capHit")}</span>}
        {once && src.paid !== undefined && src.total !== undefined && (
          <span className="prestige-src-meta">
            {t("prestige.src.paid").replace("{paid}", formatNum(src.paid)).replace("{total}", formatNum(src.total))}
          </span>
        )}
        {src.id !== "base" && !capHit && (src.next !== null || (once && src.amount === 0)) && (
          <span className="prestige-src-meta prestige-src-next">
            {src.next !== null ? t("prestige.src.next").replace("{n}", formatNum(src.next)) : t("prestige.src.nothingNew")}
          </span>
        )}
        {src.cap !== null && src.id !== "base" && (
          <span className="prestige-src-meta">
            {t(once ? "prestige.src.capOnce" : "prestige.src.cap").replace("{n}", formatNum(src.cap))}
          </span>
        )}
      </div>
      <p className="prestige-src-rule">{t(`prestige.src.rule.${src.id}`)}</p>
    </li>
  );
}

function SourcesBlock({ points }: { points: PrestigePointsBreakdown }): JSX.Element {
  const { t } = useI18n();
  const state = useGameState();
  const runSources = points.sources.filter((s) => s.kind === "run");
  const onceSources = points.sources.filter((s) => s.kind === "once");
  const signPct = prestigeAshSignXp(state.prestige?.count ?? 0);
  return (
    <section className="prestige-block prestige-sources">
      <SectionHead title={t("prestige.src.title")} />
      <p className="muted prestige-note">{t("prestige.src.intro")}</p>

      <h4 className="prestige-sub-title">{t("prestige.src.group.run")}</h4>
      <ul className="prestige-src-list">
        {runSources.map((s) => <SourceRow key={s.id} src={s} />)}
      </ul>

      <h4 className="prestige-sub-title">{t("prestige.src.group.once")}</h4>
      <p className="muted prestige-note">{t("prestige.src.group.onceNote")}</p>
      <ul className="prestige-src-list">
        {onceSources.map((s) => <SourceRow key={s.id} src={s} />)}
      </ul>

      <div className="prestige-src-sums">
        <div className="prestige-row prestige-row--sub">
          <span className="prestige-row-label">{t("prestige.src.runSubtotal")}</span>
          <span className="prestige-row-value">{formatNum(points.runSubtotal)}</span>
        </div>
        {points.pointsMult > 0 && (
          <div className="prestige-row">
            <span className="prestige-row-label">{t("prestige.points.mult").replace("{mult}", formatNum(1 + points.pointsMult))}</span>
            <span className="prestige-row-value">+ {formatNum(points.runTotal - points.runSubtotal)}</span>
          </div>
        )}
        <div className="prestige-row">
          <span className="prestige-row-label">{t("prestige.src.runTotal")}</span>
          <span className="prestige-row-value">{formatNum(points.runTotal)}</span>
        </div>
        <div className="prestige-row">
          <span className="prestige-row-label">{t("prestige.src.onceTotal")}</span>
          <span className="prestige-row-value">+ {formatNum(points.onceTotal)}</span>
        </div>
        <div className="prestige-row prestige-row--total">
          <span className="prestige-row-label">{t("prestige.points.total")}</span>
          <span className="prestige-row-value"><ScarGlyph size={18} /> {formatNum(points.total)}</span>
        </div>
        <p className="muted prestige-note">{t("prestige.src.factorNote")}</p>
      </div>

      <div className="prestige-src-ash">
        <span className="prestige-src-name">{t("prestige.src.ash.name")}</span>
        <span className="prestige-src-rule">{t("prestige.src.ash.rule")}</span>
        <span className="prestige-src-ash-now">{t("prestige.src.ash.now").replace("{n}", formatPct1(signPct))}</span>
      </div>
    </section>
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

      {/* ── Narbenquellen (claude:2026-10-30T19:50:00+01:00, 1.4.2): ersetzt die alte Vorschau-Aufschlüsselung; auch vor der Freischaltung sichtbar, damit Spieler planen können ── */}
      <SourcesBlock points={points} />

      {unlock.ok && (
        <>
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
                  {/* claude:2026-10-30T20:20:00+01:00 — K2: was der Sturz durch Knoten behält (Bezahlte Rechnung / Ungebrochene Fährte) */}
                  {preview.kept.keepPurchases && <li>{t("prestige.stays.keepPurchases")}</li>}
                  {preview.kept.slayerShare > 0 && (preview.kept.slayerPoints > 0 || preview.kept.questTokens > 0) && (
                    <li>{t("prestige.stays.keepSlayer").replace("{n}", formatNum(preview.kept.slayerPoints)).replace("{m}", formatNum(preview.kept.questTokens))}</li>
                  )}
                  {preview.summary.stays.talentRanks > 0 && <li>{t("prestige.stays.talents").replace("{n}", String(preview.summary.stays.talentRanks))}</li>}
                  <li>{t("prestige.stays.records")}</li>
                  <li>{t("prestige.stays.camp")}</li>{/* claude:2026-10-30T18:32:00+01:00 — 1.4.2: New Haven bleibt */}
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
                  .replace("{time}", formatPlaytime(rec.activePlayMs, t))}
                {/* claude:2026-10-18T20:30:00+02:00 — Bilanz des Durchgangs, falls gespeichert (Einträge ohne `tally` bleiben wie bisher). */}
                {rec.tally && (
                  <span className="muted prestige-history-tally">
                    {t("prestige.history.tally")
                      .replace("{kills}", formatNum(rec.tally.kills))
                      .replace("{dungeons}", formatNum(rec.tally.dungeons))
                      .replace("{achievements}", formatNum(rec.tally.achievements))
                      .replace("{pets}", formatNum(rec.tally.petsFound))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// claude:2026-10-31T14:58:54+01:00 — 1.4.2 Narben-Rückgabe und Nachzahlung (SAVE 102, Chef 31.10.2026): Kasten ganz oben auf der Altar-Seite, solange
// `prestigeRespecPending`. Zeigt die zurückgegebenen Narben und, falls vorhanden, die Nachzahlung je Quelle (Namen aus den
// vorhandenen Quellen-Schlüsseln, zwei Gruppen: frühere Stürze / Sammlung). „Zum Narbenbuch“ wechselt den Reiter,
// „Verstanden“ setzt engine `acknowledgePrestigeRespec`; danach verschwinden Kasten, Band und Hub-Hervorhebung.
const RESPEC_RUN_PARTS = ["gold", "dungeons", "slayer"] as const;
function RespecNotice({ respec, onOpenBook, onAcknowledge }: { respec: PrestigeRespec142; onOpenBook: () => void; onAcknowledge: () => void }): JSX.Element {
  const { t } = useI18n();
  const runParts = PRESTIGE_RESPEC_RETRO_KEYS.filter((k) => (RESPEC_RUN_PARTS as readonly string[]).includes(k) && respec.retro[k] > 0);
  const onceParts = PRESTIGE_RESPEC_RETRO_KEYS.filter((k) => !(RESPEC_RUN_PARTS as readonly string[]).includes(k) && respec.retro[k] > 0);
  const row = (k: (typeof PRESTIGE_RESPEC_RETRO_KEYS)[number]): JSX.Element => (
    <li key={k}>
      <span>{t(`prestige.src.name.${k}`)}</span>
      <b><ScarGlyph size={14} /> +{formatNum(respec.retro[k])}</b>
    </li>
  );
  return (
    <section className="prestige-respec" role="status" aria-live="polite">
      <h3 className="prestige-respec-title">{t("prestige.respec.title")}</h3>
      <p className="prestige-respec-text">
        {respec.refunded > 0 ? t("prestige.respec.refund").replace("{n}", formatNum(respec.refunded)) : t("prestige.respec.noRefund")}
      </p>
      {respec.retro.total > 0 && (
        <>
          <p className="prestige-respec-text prestige-respec-retro">{t("prestige.respec.retro").replace("{n}", formatNum(respec.retro.total))}</p>
          <div className="prestige-respec-groups">
            {runParts.length > 0 && (
              <div className="prestige-respec-group">
                <h4>{t("prestige.respec.groupRuns")}</h4>
                <ul>{runParts.map(row)}</ul>
              </div>
            )}
            {onceParts.length > 0 && (
              <div className="prestige-respec-group">
                <h4>{t("prestige.respec.groupOnce")}</h4>
                <ul>{onceParts.map(row)}</ul>
              </div>
            )}
          </div>
        </>
      )}
      <div className="prestige-respec-actions">
        <button type="button" className="btn-iron" onClick={onOpenBook}>{t("prestige.respec.toBook")}</button>
        <button type="button" className="shop-citadel-btn" onClick={onAcknowledge}>{t("prestige.respec.ok")}</button>
      </div>
    </section>
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
  const respec = prestigeRespecPending(state) ? state.prestige.respec142 : null; // claude:2026-10-31T14:58:54+01:00 — 1.4.2 Narben-Rückgabe

  return (
    <div className="prestige-page">
      {respec && (
        <RespecNotice respec={respec} onOpenBook={() => setTab("book")} onAcknowledge={() => acknowledgePrestigeRespec(state)} />
      )}
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
              headerExtra={
                <>
                  {t("talent.nextFall").replace("{n}", "")}
                  <strong><ScarGlyph size={16} /> {formatNum(preview.points.total)}</strong>
                </>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
