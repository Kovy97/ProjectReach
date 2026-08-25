import { useState } from "react";
import { content } from "@hearthforge/content";
import {
  bankCount,
  campBoost,
  collectPlot,
  itemCount,
  levelFromXp,
  plantCrop,
  plotProgress,
  setAutoReplant,
  setNextCrop,
  switchToNextCrop,
  uprootPlot,
} from "@hearthforge/engine";
import type { FarmPlot, GameState } from "@hearthforge/shared";
import { MAX_FARM_PLOTS, PLOT_UNLOCK, plotsUnlocked } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getUiIcon } from "../uiIcons";
import { getItemImage } from "../items";
import { ItemChip } from "../components/ItemChip";
import { HoverTip } from "../components/CitadelTip";
import { CampBoostNote } from "../components/CampBoostNote";

// ─── Crop icon mapping ────────────────────────────────────────────────────────
// Maps crop IDs to farming icon asset names (assets/icons/icon_farming_*.png).
// Crops not listed here fall back to the plant emoji.
const CROP_ICON_MAP: Record<string, string> = {
  gravetato:          "icon_farming_gravetato",
  reed_pale:          "icon_farming_palereed",
  herb_marshroot:     "icon_farming_marshroot",
  pigment_umber:      "icon_farming_umberleaf",
  bloodgrain:         "icon_farming_bloodwheat",
  herb_bloodthistle:  "icon_farming_bloodthistle",
  mandrake:           "icon_farming_mandrake",
  soulgourd:          "icon_farming_soulgourd",
  pigment_verdant:    "icon_farming_verdantcap",
  herb_gravemoss:     "icon_farming_gravemoss",
  reed_iron:          "icon_farming_ironreed",
  gallows_apple:      "icon_farming_gallowsapple",
  wither_leek:        "icon_farming_witherleek",
  pigment_violet:     "icon_farming_violetbloom",
  herb_nightbloom:    "icon_farming_nightbloom",
  corpse_lily:        "icon_farming_corpselily",
  pigment_radiant:    "icon_farming_radiantbloom",
  reed_void:          "icon_farming_voidreed",
  ambergrain:         "icon_farming_ambergrain",
  herb_godsbreath:    "icon_farming_godsbreath",
};

function getCropIconUrl(cropId: string): string | null {
  const name = CROP_ICON_MAP[cropId];
  return name ? getUiIcon(name) : null;
}

// ─── Locked icon (replaces 🔒 emoji) ─────────────────────────────────────────
const LOCKED_ICON_URL = getUiIcon("icon_locked");
// Mira-Set 2026-08-03 (Gap-Sweep Priorität A) — löst den unbedingten 🌱-Platzhalter des LEEREN
// Beets ab (kein dediziertes Farm-Icon im Set; "nature" ist die nächstliegende Wahl aus dem
// Achievement-Kategorien-Set, kein neues Asset erfunden). Die übrigen 🌱-Stellen in dieser Datei
// sind PFLANZEN-ART-Bild-Fallbacks (fehlendes iconUrl je Sorte) und bleiben bewusst unangetastet.
const NATURE_ICON_URL = getUiIcon("icon_ach_nature");

// ─── Module-level sink map ────────────────────────────────────────────────────
// Maps yieldItem IDs → arrays of skill IDs whose actions consume that item.
// Computed once from the static content catalog at module load time.
const SINK_MAP: Map<string, string[]> = (() => {
  const raw = new Map<string, Set<string>>();
  for (const action of Object.values(content.actions)) {
    if (!action.inputs) continue;
    for (const inp of action.inputs) {
      if (!raw.has(inp.itemId)) raw.set(inp.itemId, new Set());
      raw.get(inp.itemId)!.add(action.skill);
    }
  }
  const out = new Map<string, string[]>();
  for (const [k, v] of raw) out.set(k, [...v]);
  return out;
})();

// ─── Seed Source Index ────────────────────────────────────────────────────────
// Maps seed item IDs to their most-accessible acquisition source. Built once.
// Priority: Shop (easiest) > Foraging > other action drops > Monster loot.

type SeedSource =
  | { kind: "shop" }
  | { kind: "foraging" }
  | { kind: "action"; skillName: string }
  | { kind: "drop"; monsterName: string };

const SEED_SOURCE_INDEX: Map<string, SeedSource> = (() => {
  const idx = new Map<string, SeedSource>();

  // Pass 1 — Shop
  for (const entry of content.shop) {
    idx.set(entry.itemId, { kind: "shop" });
  }

  // Pass 2 — Foraging action loot
  for (const action of Object.values(content.actions)) {
    if (action.skill !== "foraging") continue;
    for (const roll of action.loot) {
      if (!idx.has(roll.itemId)) idx.set(roll.itemId, { kind: "foraging" });
    }
  }

  // Pass 3 — Other skill action loot
  for (const action of Object.values(content.actions)) {
    if (action.skill === "foraging") continue;
    const skillDef = content.skills[action.skill];
    const skillName = skillDef
      ? typeof skillDef.name === "string"
        ? skillDef.name
        : skillDef.name.en
      : action.skill;
    for (const roll of action.loot) {
      if (!idx.has(roll.itemId)) {
        idx.set(roll.itemId, { kind: "action", skillName });
      }
    }
  }

  // Pass 4 — Monster loot (lowest priority)
  for (const monster of Object.values(content.monsters)) {
    const mName =
      typeof monster.name === "string" ? monster.name : monster.name.en;
    for (const roll of monster.loot) {
      if (!idx.has(roll.itemId)) {
        idx.set(roll.itemId, { kind: "drop", monsterName: mName });
      }
    }
  }

  return idx;
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format milliseconds compactly: "Xh Ym", "Xm Ys", or "Xs". */
function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Minimum farming level required to unlock the plot at the given index. */
function plotUnlockLevel(plotIndex: number): number {
  for (const [lv, n] of PLOT_UNLOCK) {
    if (plotIndex < n) return lv;
  }
  return 99;
}

/** Total seeds available across inventory and bank. */
function seedCount(state: GameState, seedItem: string): number {
  return itemCount(state.inventory, seedItem) + bankCount(state, seedItem);
}

// ─── Crop Overview ────────────────────────────────────────────────────────────

function CropOverview(): JSX.Element {
  const { t, tr } = useI18n();

  /** Render a localised seed-source label using closed-over `t`. */
  function getSeedLine(src: SeedSource): string {
    switch (src.kind) {
      case "shop":
        return t("farm.seed.shop");
      case "foraging":
        return t("farm.seed.foraging");
      case "action":
        return t("farm.seed.action").replace("{skill}", src.skillName);
      case "drop":
        return t("farm.seed.drop").replace("{name}", src.monsterName);
    }
  }

  const crops = Object.values(content.crops ?? {}).sort(
    (a, b) => a.levelRequired - b.levelRequired,
  );

  return (
    <div className="farm-overview-grid">
      {crops.map((c) => {
        // Icon resolution: (a) CROP_ICON_MAP farming icon → (b) yield item image
        // → (c) seed item image → null (falls back to emoji).
        const cropIconUrl = getCropIconUrl(c.id);
        const yieldImgUrl = getItemImage(c.yieldItem);
        const seedImgUrl  = getItemImage(c.seedItem);
        const bannerImg   = cropIconUrl ?? yieldImgUrl ?? seedImgUrl;

        const sinks   = SINK_MAP.get(c.yieldItem) ?? [];
        const seedSrc = SEED_SOURCE_INDEX.get(c.seedItem);

        return (
          <div key={c.id} className="farm-catalogue-card">
            {/* ── Name + Level on top ── */}
            <div className="farm-cat-header">
              <span className="farm-cat-name">{tr(c.name)}</span>
              <span className="farm-cat-lvl muted">
                {t("skill.levelShort").replace("{n}", String(c.levelRequired))}
              </span>
            </div>

            {/* ── Large crop image ── */}
            <div className="farm-cat-img-area">
              {bannerImg ? (
                <img loading="lazy" decoding="async" src={bannerImg} alt="" className="farm-cat-img pixelart" />
              ) : (
                <span className="farm-cat-emoji" aria-hidden="true">🌱</span>
              )}
            </div>

            {/* ── Info: grow time · XP, yield chip, seed source, sinks ── */}
            <div className="farm-cat-body">
              <span className="farm-catalogue-meta muted">
                {t("farm.grow").replace("{time}", formatMs(c.growMs))}
                {" · "}
                {t("farm.xpGain").replace("{n}", String(c.xp))}
              </span>

              <div className="farm-catalogue-yield">
                <ItemChip itemId={c.yieldItem} />
                <span className="muted">
                  {t("farm.yield")
                    .replace("{min}", String(c.yieldMin))
                    .replace("{max}", String(c.yieldMax))}
                </span>
              </div>

              {seedSrc !== undefined && (
                <span className="farm-catalogue-seed muted">
                  {getSeedLine(seedSrc)}
                </span>
              )}

              {sinks.length > 0 && (
                <span className="farm-catalogue-sink muted">
                  {"→ "}
                  {sinks
                    .map((skillId) => {
                      const s = content.skills[skillId];
                      return s ? tr(s.name) : skillId;
                    })
                    .join(", ")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Crop Picker Modal ────────────────────────────────────────────────────────

type PickerMode = "plant" | "next";

function CropPicker({
  plotIndex,
  farmingLevel,
  mode = "plant",
  onClose,
}: {
  /** Plot-Index zum Bepflanzen, oder null = alle leeren freigeschalteten Plots. */
  plotIndex: number | null;
  farmingLevel: number;
  /**
   * "plant" = sofort pflanzen (leeres Beet / alle leeren Beete). "next" = Folgesorte planen
   * (Chef-GO 25.08.2026 (1.1.0), design/rezension-patch-2026-08-25.html #p12): dieselben Karten,
   * dieselbe Saat-Zaehlung — aber die Saat wird erst zur REIFE abgezogen, deshalb sind die Karten
   * auch OHNE Saat waehlbar (die Beet-Karte warnt dann „Saat fehlt", Chef-Entscheid #12.2).
   * plotIndex null = alle wachsenden Beete (#12.4).
   */
  mode?: PickerMode;
  onClose: () => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const next = mode === "next";

  const crops = content.crops ?? {};
  const eligible = Object.values(crops)
    .filter((c) => c.levelRequired <= farmingLevel)
    .sort((a, b) => a.levelRequired - b.levelRequired);

  const unlockedCount = Math.min(plotsUnlocked(farmingLevel), MAX_FARM_PLOTS);
  // Wie viele Beete wuerde "alle bepflanzen" tatsaechlich treffen? Dieselbe Bedingung wie
  // `plantCrop` in der Engine: freigeschaltet, leer, keine abholbare Ernte darauf. Ohne diese
  // Zahl bleibt "Alle bepflanzen" ein Knopf, dessen Wirkung man erst hinterher sieht.
  // Modus "next": alle freigeschalteten BEPFLANZTEN Beete (die Bedingung von `setNextCrop`).
  const freieBeete = (() => {
    if (plotIndex !== null) return 1;
    let n = 0;
    for (let i = 0; i < unlockedCount; i++) {
      const p = state.farmPlots[i];
      if (!p) continue;
      if (next ? p.cropId !== null : p.cropId === null && p.readyYield === 0) n++;
    }
    return n;
  })();
  /** Modus "next", Einzel-Beet: die gerade wachsende Sorte (ausgegraut — waere nur Auto-Nachpflanzen). */
  const currentCropId = next && plotIndex !== null ? (state.farmPlots[plotIndex]?.cropId ?? null) : null;
  /** Modus "next": wie viele Beete wuerden DIESE Sorte als Plan annehmen (nicht schon dieselbe)? */
  function planbarFuer(cropId: string): number {
    if (plotIndex !== null) return cropId === currentCropId ? 0 : 1;
    let n = 0;
    for (let i = 0; i < unlockedCount; i++) {
      const p = state.farmPlots[i];
      if (p && p.cropId !== null && p.cropId !== cropId) n++;
    }
    return n;
  }

  function handlePick(cropId: string): void {
    if (next) {
      if (plotIndex === null) {
        // Alle wachsenden Beete: die Engine lehnt leere Beete und Plan == Sorte selbst ab.
        for (let i = 0; i < unlockedCount; i++) setNextCrop(state, content, i, cropId);
      } else {
        setNextCrop(state, content, plotIndex, cropId);
      }
    } else if (plotIndex === null) {
      // Alle leeren freigeschalteten Plots bepflanzen
      for (let i = 0; i < unlockedCount; i++) {
        plantCrop(state, content, i, cropId); // intern: Noop wenn Slot belegt/pending
      }
    } else {
      plantCrop(state, content, plotIndex, cropId);
    }
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal farm-picker-modal">
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <h3 className="farm-picker-title">
          {next
            ? plotIndex === null ? t("farm.nextAllTitle") : t("farm.next.title")
            : plotIndex === null ? t("farm.plantAllTitle") : t("farm.cropPicker.title")}
        </h3>
        {(plotIndex === null || next) && (
          /* Die Ausgangslage EINMAL oben statt auf jeder Karte — die Karten sagen dann nur noch,
             was diese Saat daraus macht. Modus "next" am Einzel-Beet: die Regel in einem Satz
             (einmalig, Saat erst zur Reife). */
          <p className="farm-picker-lead">
            {next && plotIndex !== null
              ? t("farm.next.lead")
              : freieBeete > 0
                ? t(next ? "farm.nextAll.free" : "farm.plantAll.free").replace("{n}", String(freieBeete))
                : t(next ? "farm.nextAll.none" : "farm.plantAll.none")}
          </p>
        )}
        {eligible.length === 0 ? (
          <p className="muted">{t("farm.cropPicker.empty")}</p>
        ) : (
          <div className="farm-picker-list">
            {eligible.map((c) => {
              const seeds = seedCount(state, c.seedItem);
              // Icon resolution (matches CropOverview): CROP_ICON_MAP farming icon
              // → yield item image → seed item image → null (emoji fallback).
              const iconUrl =
                getCropIconUrl(c.id) ?? getItemImage(c.yieldItem) ?? getItemImage(c.seedItem);
              const hasSeeds = seeds > 0;
              const isCurrent = c.id === currentCropId;
              // Was dieser Klick WIRKLICH tut: so viele Beete, wie frei sind — begrenzt durch die
              // Saat im Beutel und Lager. Genau die Zahl steht auf dem Knopf.
              // Modus "next": geplant wird OHNE Saat-Grenze (die Saat wird erst zur Reife
              // abgezogen); die Zeile nennt, wie viel Saat dann noetig ist, und warnt, wenn sie
              // heute fehlt (#12.2: Management-Sache des Spielers, kein stilles Verfallen).
              const planbar = next ? planbarFuer(c.id) : 0;
              const wirdGepflanzt = next ? planbar : Math.min(freieBeete, seeds);
              const reichtNicht =
                plotIndex === null && (next ? seeds < planbar : seeds > 0 && seeds < freieBeete);
              const disabled = next ? wirdGepflanzt === 0 : !hasSeeds || wirdGepflanzt === 0;
              return (
                <button
                  key={c.id}
                  // Modus "next" ohne Saat: waehlbar (Saat wird erst zur Reife gebraucht), deshalb
                  // nur leicht gedimmt statt „not-allowed".
                  className={`farm-picker-card${!hasSeeds ? (next ? " no-seed-plan" : " no-seed") : ""}${isCurrent ? " current" : ""}`}
                  disabled={disabled}
                  onClick={() => handlePick(c.id)}
                >
                  <div className="farm-picker-icon">
                    {iconUrl ? (
                      <img loading="lazy" decoding="async" src={iconUrl} alt="" className="pixelart" />
                    ) : (
                      <span className="farm-crop-fallback" aria-hidden="true">
                        🌱
                      </span>
                    )}
                  </div>
                  <div className="farm-picker-info">
                    {/* Kopfzeile: Name links, Stufe rechts. Der Badge stand vorher als eigenes
                        Flex-Kind NEBEN der Infospalte und nahm ihr die Breite, die Fakten brachen
                        auf vier Zeilen (Chef 25.08.2026: "macht die Anzeige kaputt"). */}
                    <span className="farm-picker-head">
                      <span className="farm-picker-name">{tr(c.name)}</span>
                      <span className="farm-picker-lv muted">
                        {t("skill.levelShort").replace("{n}", String(c.levelRequired))}
                      </span>
                    </span>
                    {/* Drei kurze Fakten als Chips statt eines Satzes mit Doppelpunkten. */}
                    <span className="farm-picker-meta muted">
                      <span className="farm-picker-fact" title={t("farm.grow").replace("{time}", formatMs(c.growMs))}>
                        ⏱ {formatMs(c.growMs)}
                      </span>
                      <span className="farm-picker-fact" title={t("farm.yield").replace("{min}", String(c.yieldMin)).replace("{max}", String(c.yieldMax))}>
                        ×{c.yieldMin}–{c.yieldMax}
                      </span>
                      <span className="farm-picker-fact">
                        {t("farm.xpGain").replace("{n}", String(c.xp))}
                      </span>
                    </span>
                    <span className={`farm-picker-seeds${!hasSeeds ? " none" : ""}`}>
                      {hasSeeds
                        ? t("farm.seedCount").replace("{n}", String(seeds))
                        : t("farm.noSeed")}
                    </span>
                    {isCurrent && (
                      <span className="farm-picker-current">{t("farm.next.current")}</span>
                    )}
                    {plotIndex === null && (next ? planbar > 0 : hasSeeds) && (
                      /* Die Rechnung offen hinschreiben: X von Y Beeten, Z Saat wird verbraucht.
                         Reicht die Saat nicht fuer alle Beete, sagt die Zeile das — statt still
                         nur einen Teil zu bepflanzen. Modus "next": „n von m Beeten, k Saat
                         noetig" (#12.4), warnend, wenn die Saat heute nicht reicht. */
                      <span className={`farm-picker-plan${reichtNicht ? " short" : ""}`}>
                        {next
                          ? t("farm.nextAll.plan")
                              .replace("{n}", String(planbar))
                              .replace("{total}", String(freieBeete))
                              .replace("{k}", String(planbar))
                          : t("farm.plantAll.plan")
                              .replace("{n}", String(wirdGepflanzt))
                              .replace("{total}", String(freieBeete))}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Folgesorte je Beet (#p12) ────────────────────────────────────────────────

/**
 * Die Folgesorten-Zeile einer Beet-Karte (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p12). Drei Zustaende:
 *  - Plan gesetzt: Chip „→ Sorte" mit Icon und × (Plan entfernen). Fehlt die Saat, faerbt sich
 *    der Chip warnend und darunter steht „Saat fehlt: Sorte" (Chef-Entscheid #12.2: der Plan
 *    bleibt stehen, der Tick saet ein, sobald Saat da ist). Waechst noch etwas UND die Saat ist
 *    da: „Jetzt wechseln" (#12.3 = roden + sofort saeen).
 *  - Kein Plan, Beet waechst (`allowPick`): kleiner Knopf „Danach saeen …" → CropPicker "next".
 *  - Kein Plan, Beet leer/reif: nichts (dort pflanzt man direkt bzw. erntet erst).
 * Texte brechen um (min-width 0 + overflow-wrap), nie abgeschnitten — auch bei „Grabkartoffel".
 */
function PlotNextRow({
  plotIndex,
  plot,
  nextSeedMissing,
  allowPick,
  onPick,
}: {
  plotIndex: number;
  plot: FarmPlot;
  nextSeedMissing: boolean;
  /** Darf hier ein NEUER Plan gesetzt werden (nur auf einem wachsenden Beet)? */
  allowPick: boolean;
  onPick: () => void;
}): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  const nextId = plot.nextCropId;
  if (nextId === null) {
    if (!allowPick) return null;
    return (
      <div className="plot-next-row">
        <button className="plot-next-btn" onClick={onPick}>
          {t("farm.next.button")}
        </button>
      </div>
    );
  }
  const def = (content.crops ?? {})[nextId];
  const name = def ? tr(def.name) : nextId;
  const iconUrl =
    getCropIconUrl(nextId) ?? (def ? (getItemImage(def.yieldItem) ?? getItemImage(def.seedItem)) : null);
  const canSwitch = plot.cropId !== null && !nextSeedMissing;
  return (
    <div className="plot-next-row">
      <div
        className={`plot-next-chip${nextSeedMissing ? " missing" : ""}`}
        title={t("farm.next.chipTip").replace("{crop}", name)}
      >
        {iconUrl ? (
          <img loading="lazy" decoding="async" src={iconUrl} alt="" className="plot-next-icon pixelart" />
        ) : (
          <span className="plot-next-icon" aria-hidden="true">🌱</span>
        )}
        <span className="plot-next-text">{t("farm.next.chip").replace("{crop}", name)}</span>
        <button
          className="plot-next-clear"
          aria-label={t("farm.next.clear")}
          title={t("farm.next.clear")}
          onClick={() => setNextCrop(state, content, plotIndex, null)}
        >
          ×
        </button>
      </div>
      {nextSeedMissing && (
        <span className="plot-next-warn">{t("farm.next.noSeed").replace("{crop}", name)}</span>
      )}
      {canSwitch && (
        <button
          className="skillcard-cta plot-next-switch"
          title={t("farm.next.switchNowTip").replace("{crop}", name)}
          onClick={() => switchToNextCrop(state, content, plotIndex)}
        >
          {t("farm.next.switchNow")}
        </button>
      )}
    </div>
  );
}

// ─── FarmPage ─────────────────────────────────────────────────────────────────

export function FarmPage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const [plantAllOpen, setPlantAllOpen] = useState(false);
  // Folgesorte (#p12): Picker im Modus "next" fuer EIN wachsendes Beet bzw. fuer alle (#12.4).
  const [nextIdx, setNextIdx] = useState<number | null>(null);
  const [nextAllOpen, setNextAllOpen] = useState(false);
  const [uprootIdx, setUprootIdx] = useState<number | null>(null);
  const [plotsOpen, setPlotsOpen] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(true);

  // Skill head data
  const xp = state.skills.farming?.xp ?? 0;
  const level = levelFromXp(xp);

  // Task #334 (UI-Welle 2 "Boosts sichtbar"): der Feldgarten kürzt die Reifezeit ALLER Beete
  // (`farmingSpeed`, engine/farming.ts `effectiveGrowMs` — dieselbe Wirkungs-Art beschleunigt
  // zusätzlich Foraging, s. SkillPage.tsx) — bisher stand die verkürzte `prog.remainingMs` da,
  // ohne dass sichtbar war, dass New Haven daran beteiligt ist. Einmal pro Render gelesen (nicht
  // pro Plot), derselbe Engine-Wert, den `plotProgress`/`effectiveGrowMs` intern verrechnen.
  const farmCampBonus = Math.max(0, campBoost(state, content, "farmingSpeed"));

  const unlocked = plotsUnlocked(level);
  const skill = content.skills["farming"];
  const cropCount = Object.keys(content.crops ?? {}).length;

  return (
    <div className="farm-page">
      {/* Kopfbox entfernt (Chef): Name + Level stehen bereits oben in der Title-Bar (content-header). */}

      {/* ── Two collapsible sections ─────────────────────────────────── */}
      <div className="action-categories">

        {/* ── Section 1: Plots ──────────────────────────────────────── */}
        <section>
          <button
            className="category-header"
            onClick={() => setPlotsOpen((o) => !o)}
            aria-expanded={plotsOpen}
          >
            <span className="category-caret">{plotsOpen ? "▾" : "▸"}</span>
            <span className="category-name">{t("farm.section.plots")}</span>
            <span className="category-count muted">{unlocked}</span>
          </button>

          {plotsOpen && (
            <div className="farm-section-content">
              {/* Farm status bar */}
              <div className="farm-info-bar">
                <span className="muted">
                  {t("farm.plotsInfo")
                    .replace("{unlocked}", String(unlocked))
                    .replace("{total}", String(MAX_FARM_PLOTS))}
                </span>
                <span className="muted">{t("farm.offlineHint")}</span>
                {/* Chef 25.08.2026: "Einen Knopf oben haben fuer Plant on all Plots". Er war
                    schon da, aber als 13-px-Anhaengsel am Ende der Infozeile — leicht zu
                    uebersehen. Jetzt ein regulaerer Knopf mit eigener Groesse. */}
                <div className="farm-info-actions">
                  <button
                    className="skillcard-cta farm-plant-all-btn"
                    onClick={() => setPlantAllOpen(true)}
                  >
                    {t("farm.plantAll")}
                  </button>
                  {/* Gegenstueck fuer die 9-Beete-Spieler (#12.4): Folgesorte fuer alle
                      wachsenden Beete in einem Rutsch, mit Vorrechnung im Picker. */}
                  <button
                    className="skillcard-cta farm-plant-all-btn farm-next-all-btn"
                    onClick={() => setNextAllOpen(true)}
                  >
                    {t("farm.nextAll")}
                  </button>
                </div>
              </div>
              {/* Light onboarding hint for new farmers */}
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 6px" }}>
                {t("farm.hint.plots")}
              </p>

              {/* Plot grid (max 3 columns) */}
              <div className="farm-plots">
                {Array.from({ length: MAX_FARM_PLOTS }, (_, i) => {
                  const prog = plotProgress(state, content, i);
                  const plot = state.farmPlots[i] as
                    | (typeof state.farmPlots)[number]
                    | undefined;
                  const cropDef =
                    plot?.cropId != null
                      ? (content.crops ?? {})[plot.cropId]
                      : undefined;
                  const iconUrl =
                    plot?.cropId != null ? getCropIconUrl(plot.cropId) : null;
                  const confirming = uprootIdx === i;

                  let cardCls = "plot-card";
                  if (prog.locked) cardCls += " locked";
                  else if (prog.ready) cardCls += " ready";
                  else if (prog.growing) cardCls += " growing";

                  return (
                    <div key={i} className={cardCls}>
                      {/* ── Card header ──────────────────────────────── */}
                      <div className="plot-header">
                        <span className="plot-label">
                          {t("farm.plot").replace("{n}", String(i + 1))}
                        </span>
                        {prog.locked ? (
                          <span className="plot-lv-badge muted">
                            {t("skill.levelShort").replace(
                              "{n}",
                              String(plotUnlockLevel(i)),
                            )}
                          </span>
                        ) : cropDef ? (
                          <span className="plot-lv-badge muted">
                            {t("skill.levelShort").replace(
                              "{n}",
                              String(cropDef.levelRequired),
                            )}
                          </span>
                        ) : null}
                      </div>

                      {/* ── Card body ────────────────────────────────── */}
                      <div className="plot-body">
                        {prog.locked ? (
                          /* LOCKED */
                          <div className="plot-state-center">
                            <span className="plot-state-icon" aria-hidden="true">
                              {LOCKED_ICON_URL
                                ? <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="locked-icon-img" />
                                : "🔒"}
                            </span>
                            <span className="plot-state-text muted">
                              {t("farm.lockedHint").replace(
                                "{n}",
                                String(plotUnlockLevel(i)),
                              )}
                            </span>
                          </div>
                        ) : prog.ready ? (
                          /* READY / RIPE */
                          <div className="plot-state-body">
                            <div className="plot-crop-visual">
                              {iconUrl ? (
                                <img loading="lazy" decoding="async"
                                  src={iconUrl}
                                  alt=""
                                  className="plot-crop-img plot-crop-img--ready pixelart"
                                />
                              ) : (
                                <span
                                  className="plot-crop-fallback plot-crop-fallback--ready"
                                  aria-hidden="true"
                                >
                                  🌱
                                </span>
                              )}
                            </div>
                            {cropDef && (
                              <span className="plot-crop-name">
                                {tr(cropDef.name)}
                              </span>
                            )}
                            <span className="plot-ready-badge">
                              {t("farm.ready")}
                            </span>
                            {plot && plot.readyYield > 0 && (
                              <span className="plot-ready-yield muted">
                                {t("farm.readyYield").replace(
                                  "{n}",
                                  String(plot.readyYield),
                                )}
                              </span>
                            )}
                            <button
                              className="skillcard-cta"
                              onClick={() => collectPlot(state, content, i)}
                            >
                              {t("farm.harvest")}
                            </button>
                            {plot && (
                              <label className="plot-autoreplant">
                                <input
                                  type="checkbox"
                                  checked={plot.autoReplant}
                                  onChange={(e) =>
                                    setAutoReplant(state, i, e.target.checked)
                                  }
                                />
                                <span>{t("farm.autoReplant")}</span>
                              </label>
                            )}
                            {/* Reif/abholbar: nichts NEU planen (#p12), aber ein bestehender Plan
                                bleibt sichtbar und loeschbar — nie still verstecken. */}
                            {plot && (
                              <PlotNextRow
                                plotIndex={i}
                                plot={plot}
                                nextSeedMissing={prog.nextSeedMissing}
                                allowPick={false}
                                onPick={() => undefined}
                              />
                            )}
                          </div>
                        ) : prog.growing && cropDef ? (
                          /* GROWING */
                          <div className="plot-state-body">
                            <div className="plot-crop-visual">
                              {iconUrl ? (
                                <div className="plot-crop-grow-wrap">
                                  <img loading="lazy" decoding="async"
                                    src={iconUrl}
                                    alt=""
                                    className="plot-crop-img plot-crop-base pixelart"
                                  />
                                  <div
                                    className="plot-crop-color-layer"
                                    aria-hidden="true"
                                    style={{ clipPath: `inset(${Math.round((1 - Math.min(1, Math.max(0, prog.pct))) * 100)}% 0 0 0)` }}
                                  >
                                    <img loading="lazy" decoding="async" src={iconUrl} alt="" className="plot-crop-img pixelart" />
                                  </div>
                                </div>
                              ) : (
                                <div className="plot-crop-grow-wrap">
                                  <span className="plot-crop-fallback plot-crop-base" aria-hidden="true">🌱</span>
                                  <div
                                    className="plot-crop-color-layer"
                                    aria-hidden="true"
                                    style={{ clipPath: `inset(${Math.round((1 - Math.min(1, Math.max(0, prog.pct))) * 100)}% 0 0 0)` }}
                                  >
                                    <span className="plot-crop-fallback" aria-hidden="true">🌱</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className="plot-crop-name">
                              {tr(cropDef.name)}
                            </span>
                            {/* Growth progress */}
                            <div className="plot-progress-wrap">
                              <div className="bar plot-bar">
                                <div
                                  className="bar-fill"
                                  style={{
                                    // Textur-Fill (xp_bar_fill.webp) — clip-path statt scaleX,
                                    // sonst würde die Kachel-Textur horizontal gestaucht (skills.css
                                    // .plot-bar .bar-fill).
                                    clipPath: `inset(0 ${100 - Math.min(100, prog.pct * 100)}% 0 0)`,
                                  }}
                                />
                              </div>
                              {farmCampBonus > 0 ? (
                                <HoverTip
                                  as="span"
                                  className="plot-remaining muted"
                                  content={<div className="ct-tip-desc"><CampBoostNote kind="farmingSpeed" value={farmCampBonus} t={t} /></div>}
                                >
                                  {t("farm.remaining").replace(
                                    "{time}",
                                    formatMs(prog.remainingMs),
                                  )}
                                </HoverTip>
                              ) : (
                                <span className="plot-remaining muted">
                                  {t("farm.remaining").replace(
                                    "{time}",
                                    formatMs(prog.remainingMs),
                                  )}
                                </span>
                              )}
                            </div>
                            <span className="plot-yield-info muted">
                              {t("farm.yield")
                                .replace("{min}", String(cropDef.yieldMin))
                                .replace("{max}", String(cropDef.yieldMax))}
                              {" · "}
                              {t("farm.xpGain").replace("{n}", String(cropDef.xp))}
                            </span>
                            {plot && (
                              <label className="plot-autoreplant">
                                <input
                                  type="checkbox"
                                  checked={plot.autoReplant}
                                  onChange={(e) =>
                                    setAutoReplant(state, i, e.target.checked)
                                  }
                                />
                                <span>{t("farm.autoReplant")}</span>
                              </label>
                            )}
                            {/* Folgesorte (#p12): „Danach saeen …" bzw. Chip „→ Sorte" + Warnung */}
                            {plot && (
                              <PlotNextRow
                                plotIndex={i}
                                plot={plot}
                                nextSeedMissing={prog.nextSeedMissing}
                                allowPick
                                onPick={() => {
                                  setUprootIdx(null);
                                  setNextIdx(i);
                                }}
                              />
                            )}
                            {/* Uproot — requires confirmation */}
                            {confirming ? (
                              <div className="plot-uproot-confirm">
                                <span className="plot-uproot-warn muted">
                                  {t("farm.uprootConfirm")}
                                </span>
                                <div className="plot-uproot-btns">
                                  <button
                                    className="skillcard-cta stop"
                                    onClick={() => {
                                      uprootPlot(state, i);
                                      setUprootIdx(null);
                                    }}
                                  >
                                    {t("farm.uprootYes")}
                                  </button>
                                  <button
                                    className="skillcard-cta"
                                    onClick={() => setUprootIdx(null)}
                                  >
                                    {t("farm.uprootNo")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                className="skillcard-cta stop"
                                onClick={() => setUprootIdx(i)}
                              >
                                {t("farm.uproot")}
                              </button>
                            )}
                          </div>
                        ) : (
                          /* EMPTY */
                          <div className="plot-state-center">
                            <span className="plot-state-icon" aria-hidden="true">
                              {NATURE_ICON_URL
                                ? <img loading="lazy" decoding="async" src={NATURE_ICON_URL} alt="" className="ui-icon" />
                                : "🌱"}
                            </span>
                            <span className="plot-state-text muted">
                              {t("farm.empty")}
                            </span>
                            <button
                              className="skillcard-cta"
                              onClick={() => {
                                setUprootIdx(null);
                                setPickerIdx(i);
                              }}
                            >
                              {t("farm.plant")}
                            </button>
                            {/* Leer MIT Plan (Saat fehlte zur Reife, Chef-Entscheid #12.2): der Plan
                                steht sichtbar mit Warnung; sobald Saat da ist, saet der Tick von
                                selbst. Loeschbar per ×. Ohne Plan: unveraendert. */}
                            {plot && plot.nextCropId !== null && (
                              <PlotNextRow
                                plotIndex={i}
                                plot={plot}
                                nextSeedMissing={prog.nextSeedMissing}
                                allowPick={false}
                                onPick={() => undefined}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Section 2: Crop Catalogue ─────────────────────────────── */}
        <section>
          <button
            className="category-header"
            onClick={() => setOverviewOpen((o) => !o)}
            aria-expanded={overviewOpen}
          >
            <span className="category-caret">{overviewOpen ? "▾" : "▸"}</span>
            <span className="category-name">{t("farm.section.overview")}</span>
            <span className="category-count muted">{cropCount}</span>
          </button>

          {overviewOpen && <CropOverview />}
        </section>

      </div>

      {/* ── Crop picker modal ────────────────────────────────── */}
      {pickerIdx !== null && (
        <CropPicker
          plotIndex={pickerIdx}
          farmingLevel={level}
          onClose={() => setPickerIdx(null)}
        />
      )}

      {/* ── Plant All modal ──────────────────────────────────── */}
      {plantAllOpen && (
        <CropPicker
          plotIndex={null}
          farmingLevel={level}
          onClose={() => setPlantAllOpen(false)}
        />
      )}

      {/* ── Folgesorte (#p12): ein Beet / alle wachsenden Beete ── */}
      {nextIdx !== null && (
        <CropPicker
          plotIndex={nextIdx}
          farmingLevel={level}
          mode="next"
          onClose={() => setNextIdx(null)}
        />
      )}
      {nextAllOpen && (
        <CropPicker
          plotIndex={null}
          farmingLevel={level}
          mode="next"
          onClose={() => setNextAllOpen(false)}
        />
      )}
    </div>
  );
}
