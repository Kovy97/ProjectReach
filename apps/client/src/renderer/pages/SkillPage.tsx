import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { content } from "@hearthforge/content";
import {
  actionLevelMet,
  bankCount,
  bestToolSpeed,
  campBoostCached,
  enqueueAction,
  enqueueActionAtFront,
  hasActionDropSeen,
  itemCount,
  levelFromXp,
  masteryLevel,
  masteryProgress,
  masterySpeedFor,
  setActiveAction,
  setThievingRisk,
} from "@hearthforge/engine";
import type { ActionDef, GameState, LocalizedString, SkillId, ThievingRisk } from "@hearthforge/shared";
import { CAMP_SKILL_SPEED_KIND, CAMP_SPEED_CUT_CAP, CRAFT_TARGET_PRESETS } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { getUiIcon } from "../uiIcons";
import { getActionSrc } from "../actionIcons";
import { getForagingCard } from "../foragingCards";
import { getSkillBackgroundCard } from "../skillBackgrounds";
import { getPetSrc } from "../pets";
import { HoverTip } from "../components/CitadelTip";
import { ItemChip } from "../components/ItemChip";
import { useItemTooltip } from "../components/ItemTooltip";
import { formatCompactK, formatPct1, formatSeconds1 } from "../util/format";
import { CampBoostNote } from "../components/CampBoostNote";
import { computeActionRate, type ActionRate } from "../util/actionRate";
import { masteryRankTier } from "../util/masteryRank";
import { type CombatFxLevel, getCombatFxLevel } from "../util/uiPrefs";
import { consumeSkillJumpTarget, getSkillJumpNav, subscribeSkillJump } from "../util/skillJump";
// Direkt importiert statt über styles/index.css eingehängt — Kollisions-Schutz, gleiches Muster
// wie components/ItemFilterBar.tsx selbst (index.css ist eine gemeinsame Datei, an der parallel
// andere Agenten arbeiten können). Liefert nur `.invf-search`, hier ohne die Typ-Filter-Chips der
// vollen ItemFilterBar (Rezepte haben keine Item-Kategorien) — reine Such-Eingabe im selben Look.
import "../styles/inv-filter.css";

const LOCKED_ICON_URL = getUiIcon("icon_locked");
const INV_ICON_URL = getUiIcon("icon_inventory");

/** Stabiler 0..999-Hash einer Aktions-ID — reine Entzerrung des 1-Hz-Raten-Caches (s.
 *  rateCacheRef in SkillPage), kein Spielwert, keine Zufallszahl (deterministisch je ID). */
function hashActionIdMs(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 1000;
}

// ─── Welle OO (Chef-GO "UI-Juice Stufe 1: Der Kern-Loop klickt") ─────────────────────────────
// Vier Momente an der Aktionskarte: (1) Tick-Abschluss-Puls + Funken + Icon-Pop, (2) ein
// aggregierender XP-Floater, (3) ein Level-Up-Kartenpuls + Mastery-Bar-„Überschwapp" statt
// Hard-Reset, (4) ein dezenter „fast geschafft"-Schimmer auf der Mastery-Bar (<5 % bis zum
// nächsten Mastery-Level). Alles ereignisgetrieben (State-Diff, s. ActionCard unten) und mit
// fester, endlicher Dauer (WAAPI ohne `fill:"forwards"`/Endlos-Iteration) — nach Ablauf bleibt
// KEINE Animation aktiv (Perf-Vorgabe: das Spiel idlet stundenlang, CPU muss dabei still stehen).

/**
 * Effektive FX-Stufe für die neuen Skill-Karten-Momente — derselbe Options-Toggle wie die
 * Kampf-/Belohnungs-Effekte (Toasts.tsx `effectiveFxLevel`, App.tsx `effectiveRewardFxLevel`).
 * Hier bewusst dupliziert statt geteilt (gleiches Vorbild-Muster: jeder Aufrufer lebt unabhängig
 * vom selben Battle-/Reward-Mount). `prefers-reduced-motion` übersteuert IMMER zusätzlich auf
 * "off". Bei "off" bleiben NUR die nüchternen Zustandswechsel (Zahlen/Balken aktualisieren sich
 * weiterhin sofort, nur ohne Puls/Funken/Floater/Überschwapp-Choreografie).
 */
function effectiveFxLevel(): CombatFxLevel {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }
  return getCombatFxLevel();
}

/**
 * Kurzer Gold-Glanz-Puls (box-shadow, WAAPI) — Basis für den Karten- UND den Mastery-Bar-Puls.
 * `strong` = Level-Up-Variante (kräftiger/länger), sonst der routinemäßige Tick-Abschluss-Puls.
 * Bleibt bei BEIDEN FX-Stufen "reduced"/"full" erhalten (reines Flash/Farbe, keine Bewegung —
 * dieselbe Einstufung wie die Kampf-Effekte, s. uiPrefs.ts `CombatFxLevel`-Doku). Rein additiv
 * (kein `fill:"forwards"`) — räumt sich nach Ablauf selbst weg, keine Animation im Ruhezustand.
 */
function flashGlow(el: HTMLElement | null, strong: boolean): void {
  if (!el?.animate) return;
  const peak = strong
    ? "0 0 22px 4px rgba(240, 210, 140, 0.85)"
    : "0 0 14px 3px rgba(216, 179, 90, 0.55)";
  el.animate(
    [
      { boxShadow: "0 0 0 rgba(216, 179, 90, 0)" },
      { boxShadow: peak, offset: 0.3 },
      { boxShadow: "0 0 0 rgba(216, 179, 90, 0)" },
    ],
    { duration: strong ? 550 : 400, easing: "ease-out" },
  );
}

/** Kurzer Scale-Pop (WAAPI) auf dem Ertrags-Icon — nur bei fxLevel "full" (Bewegung, s.o.). */
function popScale(el: HTMLElement | null): void {
  if (!el?.animate) return;
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.22)", offset: 0.35 },
      { transform: "scale(1)" },
    ],
    { duration: 380, easing: "ease-out" },
  );
}

/** 2–3 kleine Funken, die vom Zentrum radial auseinanderfliegen und dabei ausblenden (WAAPI) —
 *  nur bei fxLevel "full". Jeder Funke ist ein eigenes `<span>` (s. ActionCard `sparkRefs`). */
function burstSparks(refs: Array<HTMLSpanElement | null>): void {
  const n = refs.length;
  refs.forEach((el, i) => {
    if (!el?.animate) return;
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = 18 + (i % 2) * 8;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    el.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`, opacity: 0 },
      ],
      { duration: 420, easing: "ease-out", delay: i * 25 },
    );
  });
}

// Kanonische Smithing-Reihenfolge je Kategorie (Chef-Wunsch, in ALLEN Tiers gleich):
// (1) Barren schmelzen → (2) Waffen Dolch…letzte Waffe → (3) Rüstungsteile → (4) sonstige Materialien.
const SMITHING_WEAPON_ORDER = [
  "dagger", "sword", "mace", "axe", "scimitar", "battleaxe", "spear", "greataxe", "greatsword", "maul",
];
const SMITHING_ARMOR_ORDER = ["helmet", "body", "legs", "gloves", "boots", "offhand"];

/** Verarbeitungs-/Veredelungsaktion (Barren schmelzen, Häute gerben/härten): soll je Kategorie
 * an Position 0 stehen. Für Smithing bereits über smithingOrderKey gelöst (Barren-Suffix → 0);
 * Leatherworking hat dieselbe Sorte Aktion (Präfix tan_ bzw. cure_) — generisch über die
 * Action-ID, damit kein weiterer Skill-Sonderfall nötig ist. */
function isProcessingAction(a: ActionDef): boolean {
  return /^(tan_|cure_)/.test(a.id);
}

/** Sortier-Schlüssel für eine Smithing-Aktion anhand ihres Output-Items (kleiner = weiter oben). */
function smithingOrderKey(a: ActionDef): number {
  const out = a.loot[0]?.itemId;
  const item = out ? content.items[out] : undefined;
  if (!item || item.type === "material") {
    return /_bar$/.test(out ?? "") ? 0 : 900; // Barren ganz vorne, sonst. Materialien (Pfeilköpfe, Ward) ans Ende
  }
  if (item.type === "equipment" && item.weaponType) {
    const i = SMITHING_WEAPON_ORDER.indexOf(item.weaponType);
    return 100 + (i < 0 ? SMITHING_WEAPON_ORDER.length : i);
  }
  if (item.type === "equipment" && item.slot) {
    const i = SMITHING_ARMOR_ORDER.indexOf(item.slot);
    return 200 + (i < 0 ? SMITHING_ARMOR_ORDER.length : i);
  }
  return 800;
}

/**
 * Welle EE (Fenn F2, "Mein Skilling-Pet ist in der Mine ein Tabelleneintrag"): dezenter
 * Mini-Sprite-Streifen oben auf der Skill-Seite, NUR wenn das ausgerüstete Begleiter-Passiv
 * tatsächlich zu DIESER Aktivität gehört (`pet.skillEffect.skill === skillId` — die mechanische
 * Wirkung, nicht die Drop-Herkunft, s. shared/index.ts `PetSkillEffect.skill`-JSDoc). Pulsiert
 * kurz, wenn die aktive Aktion dieses Skills gerade Mastery-XP gutschreibt (= ein Ertrags-Tick),
 * erkannt über einen simplen Vorher/Nachher-Ref-Diff auf `state.mastery[actionId].xp` — kein
 * neues Engine-Event nötig (Auftrag: "aus State ableitbar").
 */
function ActivePetSprite({ skillId }: { skillId: SkillId }): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  const equippedId = state.character.companionPetId;
  const pet = equippedId ? content.pets[equippedId] : null;
  const relevant = !!pet && pet.skillEffect.skill === skillId;

  const lastXpRef = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!relevant) {
      lastXpRef.current = null;
      return;
    }
    const activeId = state.activeActionId;
    const action = activeId ? content.actions[activeId] : null;
    if (!action || action.skill !== skillId) {
      lastXpRef.current = null;
      return;
    }
    const xp = state.mastery[action.id]?.xp ?? 0;
    if (lastXpRef.current !== null && xp > lastXpRef.current) {
      setPulse(true);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulse(false), 550);
    }
    lastXpRef.current = xp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks, relevant, skillId]);

  useEffect(() => () => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
  }, []);

  if (!relevant || !pet) return null;
  const src = getPetSrc(pet.id);
  return (
    <div
      className={`skill-active-pet${pulse ? " pulse" : ""}`}
      title={t("skill.activePet.tooltip").replace("{pet}", tr(pet.name))}
    >
      {src ? (
        <img loading="lazy" decoding="async" src={src} alt="" className="skill-active-pet-img pixelart" />
      ) : (
        <span className="skill-active-pet-emoji">{pet.icon ?? "🐾"}</span>
      )}
    </div>
  );
}

export function SkillPage({ skillId }: { skillId: SkillId }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const tooltip = useItemTooltip();
  const skill = content.skills[skillId];
  // Perf (Chef-Befund "Menüs müssen flüssiger sein"): computeActionRate komponiert mehrere
  // Engine-Bausteine (Mastery-Pool, Pet-Boni, Buffs, Werkzeug-Tempo, effektive Dauer) — bei ~80
  // Smithing-Karten × 10 Renders/s (GameContext-Tick-Throttle) lief das >1000×/s. Die angezeigten
  // Raten/ETAs brauchen keine 100-ms-Genauigkeit (nur die Zahl selbst muss ≤1s nachziehen) — ein
  // per-Aktion 1-Hz-Cache spart >90% der Aufrufe, ohne dass die Anzeige spürbar hinterherhinkt.
  // Ref statt useMemo, da der Cache über Renders hinweg (nicht nur pro Commit) weiterleben muss.
  const rateCacheRef = useRef<Map<string, { rate: ActionRate; at: number }>>(new Map());
  const nowMs = Date.now();
  const getCachedRate = (action: ActionDef): ActionRate => {
    const cache = rateCacheRef.current;
    const hit = cache.get(action.id);
    if (hit && nowMs - hit.at < 1000) return hit.rate;
    const rate = computeActionRate(state, content, action);
    // Jitter NUR bei der Erstbefüllung (kein hit): ohne das würden alle ~80 Karten beim
    // Seiten-Mount im selben Render befüllt UND exakt 1000ms später wieder alle im selben
    // Render neu berechnet — ein periodischer Long-Task-Spitzenwert (in der Messung sichtbar:
    // p95 deutlich über dem Mittel). Der Hash von action.id verteilt die Erst-Fälligkeit über
    // die folgende Sekunde; jede Aktion refresht danach zu ihrer eigenen, entzerrten Zeit weiter.
    const at = hit ? nowMs : nowMs - hashActionIdMs(action.id);
    cache.set(action.id, { rate, at });
    return rate;
  };
  // Regression-Fix (Chef, 2026-07-02): der Perf-Pass (#206/P3) hatte diesen Hintergrund auf eine
  // EINZELNE Ebene hinter der ganzen Seite gehoisted (Karten selbst blieben leer) — optisch
  // falsch herum, jede Aktionskarte muss ihr eigenes Banner-Bild zeigen (wie vor dem Perf-Pass).
  // skillPageBg wird jetzt NUR NOCH pro Karte als skillcard-banner-bg verwendet (s.u.), keine
  // Seiten-Backdrop mehr — visuelle Treue schlägt die Blur-Mikrooptimierung.
  const skillPageBg = getSkillBackgroundCard(skillId);
  // Perf (Chef-Befund "Menüs müssen flüssiger sein", Smithing v.a. wegen ~80 Aktions-Karten):
  // diese Liste hängt NUR von content (statischer Import) + skillId ab, nie von state — wurde
  // vorher aber bei JEDEM Game-Tick (10 Hz) komplett neu gefiltert+sortiert. useMemo([skillId])
  // berechnet sie einmal pro Skill-Seiten-Mount neu (SkillPage remountet ohnehin pro Skill-Wechsel,
  // s. App.tsx `key={page.skillId}`) statt bei jedem Re-Render.
  const actions = useMemo(
    () =>
      Object.values(content.actions)
        .filter((a) => a.skill === skillId)
        .sort((a, b) => {
          // STARRE Reihenfolge (Chef): nur nach Level-Anforderung, dann ID — KEINE
          // dynamischen Kriterien (z.B. Mastery-XP), sonst springen die Karten beim Spielen um.
          const lvlDiff = (a.levelRequired ?? 1) - (b.levelRequired ?? 1);
          if (lvlDiff !== 0) return lvlDiff;
          return a.id.localeCompare(b.id);
        }),
    [skillId],
  );

  // Kategorie-Gruppen (in content.categories-Reihenfolge), nur falls Aktionen Kategorien haben.
  // Perf: hängt nur an `actions` (bereits memoized, s.o.) + skillId — ebenfalls statisch, ebenfalls
  // vorher bei jedem Tick neu gebaut (map/filter/sort über alle Kategorien × Aktionen). Hook-Reihen-
  // folge: MUSS vor dem `if (!skill) return` unten stehen (Rules of Hooks — kein bedingter Hook-Aufruf).
  const grouped = useMemo(
    () =>
      actions.some((a) => a.category)
        ? content.categories
            .map((cat) => {
              let catActions = actions.filter((a) => a.category === cat.id);
              // Smithing: feste, in allen Tiers identische Reihenfolge (Barren → Waffen → Rüstung → Rest).
              if (skillId === "smithing") {
                catActions = [...catActions].sort((a, b) => {
                  const d = smithingOrderKey(a) - smithingOrderKey(b);
                  if (d !== 0) return d;
                  const lvl = (a.levelRequired ?? 1) - (b.levelRequired ?? 1);
                  return lvl !== 0 ? lvl : a.id.localeCompare(b.id);
                });
              }
              // Generisch (alle Skills, z.B. Leatherworking): Verarbeitungsaktionen (tan_*/cure_*)
              // an Position 0 der Kategorie ziehen — analog Smelt bei Smithing. Stabile Partition,
              // sonstige Reihenfolge (Level/ID bzw. die Smithing-Sortierung oben) bleibt unverändert.
              const processing = catActions.filter(isProcessingAction);
              if (processing.length > 0) {
                catActions = [...processing, ...catActions.filter((a) => !isProcessingAction(a))];
              }
              return { cat, actions: catActions };
            })
            .filter((g) => g.actions.length > 0)
        : [],
    [actions, skillId],
  );
  // Lückenfüller-Flavor-Hinweis ENTFERNT (Chef 2026-07-12, Bild #68: „wir haben nirgendwo
  // Flavor-Texte" — der automatische „A humble spot…"-Satz auf XP/h-Dellen ist raus).

  // Einklappbare Kategorien: ALLE Kategorien starten zugeklappt (Chef-Vorgabe "Alle Tabs immer
  // eingeklappt", Pacing-Diskussion) — vorher nur die voll gesperrten Tiers. Der Header (Name +
  // Level-Range + Anzahl) bleibt für JEDE Kategorie immer sichtbar, auch eingeklappt (s. JSX
  // unten) — der Spieler sieht so weiterhin, wie viel Content noch vor ihm liegt.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const init = new Set<string>();
    for (const cat of content.categories) {
      const catActions = actions.filter((a) => a.category === cat.id);
      if (catActions.length > 0) init.add(cat.id);
    }
    return init;
  });

  // Rezept-Suche (Chef-Auftrag): filtert über ALLE Aktionsnamen dieses Skills, Kategorien MIT
  // Treffern klappen automatisch auf (rein visuell — der `collapsed`-Set oben bleibt unangetastet,
  // s. isCollapsed-Herleitung im JSX; ein gelöschter Suchtext springt dadurch sauber auf den
  // eingeklappten Default zurück, ohne dass hier extra aufgeräumt werden muss).
  const [search, setSearch] = useState("");
  const searchNorm = search.trim().toLowerCase();
  const isSearching = searchNorm.length > 0;
  const matchesSearch = (a: ActionDef): boolean => tr(a.name).toLowerCase().includes(searchNorm);
  const anyMatch = !isSearching || actions.some(matchesSearch);

  // Wiki→Rezept-Sprung (util/skillJump.ts): eine Ziel-Aktion, die ItemWikiModal für DIESE
  // Skill-Seite hinterlassen hat (Klick auf eine Quelle-/Verwendungs-Zeile).
  //
  // Root-Cause-Fix (Chef-Bugreport "Sprung von der eigenen Skill-Seite aus tut nichts"): der
  // frühere `jumpConsumedRef` + `useEffect(…, [])` konsumierte NUR beim Mount. Ein Sprung auf
  // eine ANDERE Skill-Seite funktionierte (die Seite mountet frisch, s. App.tsx
  // `key={page.skillId}`) — ein Sprung, während man SCHON auf der Ziel-Skill-Seite steht (der
  // übliche Fall: das Item-Wiki öffnet man meist genau von der Skill-Seite aus), ist ein
  // `setActivePageId`-No-op für MainLayout → SkillPage remountet nicht → der Mount-Effect feuert
  // nie erneut → nichts passiert. Jetzt abonniert diese Seite den Store direkt
  // (`useSyncExternalStore`) und reagiert auf JEDEN neuen Sprung (steigende `nonce`, auch auf
  // dieselbe Seite), nicht nur auf den allerersten Mount.
  const jumpNav = useSyncExternalStore(subscribeSkillJump, getSkillJumpNav);
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  useEffect(() => {
    // Nicht für DIESE Seite bestimmt (kein Sprung bisher, oder ein anderer Skill — z.B.
    // Farming/Slayer haben eigene Seiten) — nichts tun. `consumeSkillJumpTarget` bleibt dadurch
    // für den eigentlich gemeinten Seiten-Mount unangetastet (s. util/skillJump.ts JSDoc zum
    // Farming-/Slayer-Sonderfall). Der Store ist modulglobal-einmalig-konsumierbar (`pendingActionId`
    // wird beim ersten erfolgreichen Read genullt) — ein zweiter Effect-Lauf mit demselben `nonce`
    // (React 18 StrictMode-Dev-Doppelaufruf) liest hier einfach `null` und bricht harmlos ab.
    if (!jumpNav || jumpNav.pageId !== skillId) return;
    const targetId = consumeSkillJumpTarget();
    if (!targetId) return;
    const targetAction = content.actions[targetId];
    if (!targetAction || targetAction.skill !== skillId) return;
    const catId = targetAction.category;
    if (catId) {
      setCollapsed((prev) => {
        if (!prev.has(catId)) return prev;
        const next = new Set(prev);
        next.delete(catId);
        return next;
      });
    }
    setJumpTargetId(targetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpNav?.nonce, skillId]);

  // Scrollt zur Zielkarte + kurzer Hervorhebungs-Puls, sobald sie im DOM sichtbar ist (die
  // Kategorie wurde ggf. gerade erst aufgeklappt, s. Effect oben — zwei rAF-Schritte wie
  // overflowMasteryBar weiter unten, damit Layout/Paint sicher abgeschlossen sind, bevor
  // gescrollt wird). `jumpTargetId` wird danach zurückgesetzt (einmaliger Sprung, kein Re-Trigger
  // bei späteren Re-Renders derselben Seite).
  useEffect(() => {
    if (!jumpTargetId) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = document.getElementById(`skillcard-${jumpTargetId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("skillcard-jump-highlight");
          setTimeout(() => el.classList.remove("skillcard-jump-highlight"), 1800);
        }
        setJumpTargetId(null);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTargetId]);

  if (!skill) {
    return <p className="muted">{t("skill.unknown").replace("{id}", skillId)}</p>;
  }

  // Material zählt aus Inventar UND Bank (Crafting darf aus der Bank ziehen — Engine-seitig).
  // Perf-Welle (2026-07-22): useCallback mit `[state]` als einzigem Dep — `state` ist eine über
  // die gesamte Spielsitzung stabile Objekt-Referenz (Engine mutiert in-place, s. GameContext
  // stateRef), daher bleibt AUCH diese Callback-Referenz über alle Ticks hinweg stabil, statt wie
  // vorher bei jedem SkillPage-Render (10 Hz) neu erzeugt zu werden. Das ist Voraussetzung dafür,
  // dass `memo(ActionCard)` unten tatsächlich greift (ein neuer Funktions-Prop pro Render hätte
  // die Memoisierung sonst bei JEDER der ~80 Smithing-Karten pro Tick unwirksam gemacht).
  const matCount = useCallback(
    (itemId: string): number => itemCount(state.inventory, itemId) + bankCount(state, itemId),
    [state],
  );
  const hasInputs = useCallback(
    (action: ActionDef): boolean =>
      !action.inputs || action.inputs.every((i) => matCount(i.itemId) >= i.qty),
    [matCount],
  );

  const activeAction = actions.find((a) => a.id === state.activeActionId) ?? null;
  // Werkzeug-Tempo (z.B. Spitzhacke beschleunigt Bergbau). 1 = kein Werkzeug.
  const toolSpeed = bestToolSpeed(state, content, skillId);

  // Endete die zuletzt gestoppte Aktion in genau dieser Fertigkeit? (Material leer / Inventar voll)
  const stoppedHere =
    !activeAction && !!state.lastStop && actions.some((a) => a.id === state.lastStop?.actionId);
  const stopKey =
    state.lastStop?.reason === "inventory_full"
      ? "skill.stoppedInventoryFull"
      : "skill.stoppedNoMaterials";

  return (
    <div className="skill-page">
      {/* Kopfbox entfernt (Chef): Fertigkeitsname + Level stehen bereits oben in der Title-Bar
          (content-header: Titelbild + LevelXpBar der betrachteten Fertigkeit). Die Skill-Seiten-
          Kopfbox war eine redundante, volle-Breite-leere „Leiste". */}

      {/* Welle EE (Fenn F2): aktives Begleiter-Passiv dieser Aktivität — dezent, pulsiert beim
          Ertrags-Tick. Rendert nichts, wenn kein Pet ausgerüstet ist oder es nicht zu diesem
          Skill passt. */}
      <ActivePetSprite skillId={skillId} />

      {/* Thieving: Risiko-Modus (careful/bold) — nur auf der Diebeskunst-Seite */}
      {skillId === "thieving" && (
        <div className="thieving-risk">
          <span className="thieving-risk-label muted">{t("thieving.risk.label")}</span>
          <div className="thieving-risk-toggle">
            {(["careful", "bold"] as ThievingRisk[]).map((mode) => (
              <button
                key={mode}
                className={`risk-option${state.thievingRisk === mode ? " active" : ""}`}
                onClick={() => setThievingRisk(state, mode)}
              >
                {t(`thieving.risk.${mode}`)}
              </button>
            ))}
          </div>
          <span className="thieving-risk-hint muted">{t(`thieving.risk.${state.thievingRisk}.hint`)}</span>
        </div>
      )}

      {/* Was tue ich gerade? Das „IN PROGRESS · <Aktion>"-Panel wurde entfernt (Chef-Feedback #239):
          der Fortschritt einer laufenden Aktion ist bereits in der Title-Bar sichtbar
          (content-header, gelbe Aktions-Leiste, s. App.tsx ActionProgressBar) — diese Seite zeigt
          nur noch einen Hinweis, wenn NICHTS läuft (idle/zuletzt gestoppt). Läuft eine Aktion,
          wird hier bewusst nichts gerendert. */}
      {/* codex:2026-08-01T13:30:36+02:00 — Der alte Idle-Hinweis ist entfernt: Aktivitätszustand
          und Fortschritt gehören künftig ausschließlich in die globale Info-Bar. Echte Stop-/
          Stun-Ursachen bleiben hier als handlungsrelevante Warnung sichtbar. */}
      {!activeAction ? (
        stoppedHere ? <div className="skill-stopped">⚠ {t(stopKey)}</div> : null
      ) : (
        // Betäubung (z.B. nach fehlgeschlagenem Diebstahl) pausiert die Aktion — kein Fortschritt,
        // daher kein Konflikt mit der entfernten IN-PROGRESS-Anzeige, aber ohne Hinweis würde der
        // Spieler nicht sehen, warum gerade nichts passiert.
        state.stunMs > 0 && (
          <div className="skill-stopped">
            ⚠ {t("skill.stunned").replace("{s}", String(Math.ceil(state.stunMs / 1000)))}
          </div>
        )
      )}

      {/* Rezept-Suche (Chef-Auftrag): oben auf der Seite, filtert live über alle Aktionsnamen
          dieses Skills — leer lässt den eingeklappten Default (s. `collapsed` oben) unangetastet. */}
      {actions.length > 0 && (
        <div className="invf-bar skill-search-bar">
          <input
            className="invf-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("skill.search.placeholder")}
            aria-label={t("skill.search.placeholder")}
          />
        </div>
      )}
      {isSearching && !anyMatch && (
        <p className="muted skill-search-empty">{t("skill.search.noResults")}</p>
      )}

      {/* Aktionen — flach oder nach Kategorien gruppiert + einklappbar */}
      {actions.length === 0 ? (
        <p className="muted">{t("skill.noActions")}</p>
      ) : grouped.length > 0 ? (
        <div className="action-categories">
          {grouped.map((g) => {
            const matchedActions = isSearching ? g.actions.filter(matchesSearch) : g.actions;
            // Während der Suche entscheidet allein die Trefferzahl (Kategorien MIT Treffern klappen
            // automatisch auf, ohne den persistenten `collapsed`-Set zu verändern — s. Kommentar
            // dort); ohne Suche gilt weiterhin der manuell gesetzte Ein-/Ausklapp-Zustand.
            const isCollapsed = isSearching ? matchedActions.length === 0 : collapsed.has(g.cat.id);
            // Level-Spanne der Aktionen → zeigt auf einen Blick, was in der (eingeklappten) Kategorie steckt.
            const lvls = g.actions.map((a) => a.levelRequired ?? 1);
            const lo = Math.min(...lvls);
            const hi = Math.max(...lvls);
            const rangeLabel = t("skill.levelShort").replace(
              "{n}",
              lo === hi ? String(lo) : `${lo}–${hi}`,
            );
            return (
              <section key={g.cat.id} className="action-category">
                <button
                  className="category-header"
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.cat.id)) next.delete(g.cat.id);
                      else next.add(g.cat.id);
                      return next;
                    })
                  }
                >
                  <span className="category-caret">{isCollapsed ? "▸" : "▾"}</span>
                  <span className="category-name">{tr(g.cat.name)}</span>
                  <span className="category-range muted">{rangeLabel}</span>
                  <span className="category-count muted">
                    {isSearching ? `${matchedActions.length}/${g.actions.length}` : g.actions.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <>
                    {g.cat.id === "fence" && !isSearching && (
                      <p className="category-hint muted">{t("thieving.fenceHint")}</p>
                    )}
                    <div className="actions">{matchedActions.map(renderCard)}</div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="actions">
          {(isSearching ? actions.filter(matchesSearch) : actions).map(renderCard)}
        </div>
      )}
    </div>
  );

  // Welle OO: die Karte ist jetzt ein eigenständiges Kind-Component (ActionCard, unten) statt
  // einer plain Closure-Funktion — die neuen Juice-Momente brauchen eigene Hooks (Refs/Effects
  // pro Karte), was Rules-of-Hooks in einer per-map-aufgerufenen Nicht-Component-Funktion
  // verletzt hätte. `renderCard` bleibt als dünner Adapter erhalten, damit die beiden
  // `.map(renderCard)`-Aufrufe oben unverändert bleiben.
  // Perf-Welle (2026-07-22): isActive/ready/levelOk/rate/mLvl/mProg/craftable werden HIER (im
  // Parent, läuft ohnehin jeden Tick) berechnet und als Primitive/stabile Objekt-Referenz an
  // ActionCard gereicht, statt sie dort aus dem (referenz-stabilen, aber intern mutierten) `state`
  // neu abzuleiten. `memo(ActionCard)` unten vergleicht Props flach — ohne diese Primitive würde
  // ein reiner `state`-Prop-Vergleich NIE eine Änderung erkennen (gleiche Objekt-Referenz jeden
  // Tick) und die Karte könnte veraltet hängen bleiben; MIT ihnen rendert memo() genau dann neu,
  // wenn sich für DIESE Karte wirklich etwas ändert — die übrigen ~79 Karten einer Smithing-Seite
  // überspringen Reconciliation/Paint komplett. `rate` bleibt bewusst ein Objekt (kein weiteres
  // Aufsplitten in Einzel-Felder): der 1-Hz-Cache (getCachedRate oben) liefert innerhalb seines
  // Fensters dieselbe Objekt-Referenz zurück, ist also für den flachen Props-Vergleich genauso
  // "primitiv" wie eine Zahl.
  function renderCard(action: ActionDef): JSX.Element {
    const isActive = state.activeActionId === action.id;
    const ready = hasInputs(action);
    const levelOk = actionLevelMet(state, content, action.id);
    const rate = getCachedRate(action);
    const mLvl = masteryLevel(state, action.id);
    const mProg = masteryProgress(state, action.id);
    const craftable = action.inputs
      ? Math.min(...action.inputs.map((i) => Math.floor(matCount(i.itemId) / i.qty)))
      : 0;
    return (
      <ActionCard
        key={action.id}
        action={action}
        skillId={skillId}
        state={state}
        t={t}
        tr={tr}
        toolSpeed={toolSpeed}
        skillPageBg={skillPageBg}
        matCount={matCount}
        isActive={isActive}
        ready={ready}
        levelOk={levelOk}
        rate={rate}
        mLvl={mLvl}
        mProg={mProg}
        craftable={craftable}
      />
    );
  }
}

interface ActionCardProps {
  action: ActionDef;
  skillId: SkillId;
  /** Live-State-Objekt (dieselbe Referenz wie `useGameState()` — die Engine mutiert in-place,
   *  s. GameContext.tsx), als Prop statt eines erneuten Context-Reads je Karte (~80 bei Smithing).
   *  Wird NUR noch für Klick-Handler (enqueueAction/setActiveAction) und ein paar Detail-Reads
   *  gebraucht — die render-entscheidenden Werte kommen als eigene Primitiv-Props (s.u.). */
  state: GameState;
  t: (key: string) => string;
  tr: (value: LocalizedString) => string;
  toolSpeed: number;
  skillPageBg: string | null;
  /** Stabile (useCallback, dep [state]) Referenz — sicher als memo()-Prop nutzbar. */
  matCount: (itemId: string) => number;
  isActive: boolean;
  ready: boolean;
  levelOk: boolean;
  /** Objekt-Referenz aus dem 1-Hz-Rate-Cache (s. getCachedRate) — bleibt innerhalb des
   *  Cache-Fensters stabil, zählt für memo()s flachen Vergleich also wie ein Primitiv. */
  rate: ActionRate;
  mLvl: number;
  mProg: number;
  craftable: number;
}

/**
 * Eine Aktionskarte (Welle OO, Chef-GO "UI-Juice Stufe 1: Der Kern-Loop klickt"). War bis hierhin
 * eine plain Closure-Funktion (`renderCard`), die die 80+ Karten einer Smithing-Seite ohne eigene
 * Identität durchlief — für die neuen Juice-Momente (Tick-Puls, XP-Floater, Level-Up-Kartenpuls,
 * Mastery-Bar-Überschwapp/Schimmer) braucht jede Karte aber eigene Hooks (Refs/Effects), was
 * Rules-of-Hooks in einer per-`.map()`-aufgerufenen Nicht-Component-Funktion verletzt hätte —
 * daher jetzt ein eigenständiges, per `action.id` geschlüsseltes Component.
 *
 * Perf: die Diff-Erkennung (mastery-/skill-xp-Vergleich zum Vorrender) läuft NUR für die AKTUELL
 * aktive Karte (`isActive`) — auf einer Smithing-Seite mit ~80 Karten macht das genau EINE Karte
 * pro Tick "teuer", alle anderen brechen im Effect sofort ab (nur Ref-Reset).
 */
const ActionCard = memo(function ActionCard({
  action,
  skillId,
  state,
  t,
  tr,
  toolSpeed,
  skillPageBg,
  matCount,
  isActive,
  ready,
  levelOk,
  rate,
  mLvl,
  mProg,
  craftable,
}: ActionCardProps): JSX.Element {
  const tooltip = useItemTooltip();
  const fx = effectiveFxLevel();

  // isActive/ready/levelOk/rate/mLvl/mProg/craftable kommen jetzt bereits fertig berechnet vom
  // Parent (renderCard oben) — Primitive/eine stabile Objekt-Referenz statt hier neu aus `state`
  // abgeleitet zu werden (s. JSDoc-Perf-Absatz + ActionCardProps-Kommentare).
  // Effektive Dauer = exakt das, womit die Engine die Aktion abschließt (für die
  // Zeit-Kachel unten — die per-Karten-Fortschrittsleiste selbst wurde entfernt,
  // Chef #239: der Fortschritt steht bereits in der Title-Bar). Für Nicht-Thieving-Aktionen
  // ist das exakt rate.avgDurationMs (s. util/actionRate.ts) — kein zweiter, teurer
  // effectiveActionDurationMs-Aufruf nötig (der vorher dieselbe Engine-Komposition
  // NOCHMAL durchlief, obwohl computeActionRate sie intern schon berechnet).
  const effDur = rate.avgDurationMs;
  const out = rate.primaryItemPerHour;
  const outItem = out ? content.items[out.itemId] : null;
  const img = getActionSrc(action.id) ?? (out ? getItemImage(out.itemId) : null);
  const isThief = action.successBase !== undefined;
  // Ersteller-/Crafting-Karte = Verarbeitung mit Materialbedarf. Nur diese bekommen die
  // Mengen-Buttons (1/5/10/Alle); Gather-/Thieving-Karten behalten Start/Stop.
  const isCraft = !!action.inputs && action.inputs.length > 0;
  // codex:2026-07-31T19:32:00+02:00 — Layout 01 reserviert exakt vier Ressourcenplätze;
  // Rezepte belegen sie mit bis zu vier realen Inputs, alle übrigen Plätze bleiben ruhige Leerzellen.
  const resourceInputs = (action.inputs ?? []).slice(0, 4);
  const req = action.levelRequired ?? 1;
  // Mastery (Langzeit-Progression dieser Aktion). mLvl/mProg kommen als Props vom Parent (s.o.).
  // Die Doppelertrag-Chance (mBonus) kommt jetzt aus derselben Rate-Formel wie oben
  // (Mastery-Aktion + Pool + Pet + Buff — vorher fehlten Pet-/Buff-Anteile im Badge).
  const mBonus = rate.bonusChance;
  const mSpeed = masterySpeedFor(state, action.id);
  // Welle EE (Mona M3): Rang-Stern an der Aktionskarte — reine CSS-Farbabstufung des
  // bestehenden "★"-Labels (s. util/masteryRank.ts), kein neuer Bonus.
  const mRankTier = masteryRankTier(mLvl);
  // codex:2026-07-31T20:21:01+02:00 — Suffix-Chancen bleiben reine Loot-/Craft-Engine-Logik.
  // Skillkarten projizieren weder Basis- noch Live-Chance; der unerwünschte Overlay-Chip entfällt.
  // Effektives Tempo aus der effektiven Dauer (Werkzeug × Mastery × Mastery-Pool) — eine Quelle
  // mit der Engine; so stimmen Zeit-Kachel UND die Fortschrittsleiste exakt.
  const effSpeed = effDur / action.durationMs;
  // craftable (wie viele Stück lassen sich mit dem aktuellen Material herstellen?) kommt als Prop
  // vom Parent (s.o.) — braucht dort ohnehin schon `matCount` für den `ready`-Primitiv.

  // Task #331: LIVE-Erfolgschance-Tooltip (Basis + Level + Boni + Risiko-Modus/Cap) — nur bei
  // Thieving-Karten gesetzt (rate.successBreakdown ist sonst null, s. actionRate.ts).
  const successTip = rate.successBreakdown
    ? successChanceTip(t, rate.successBreakdown, t(`thieving.risk.${state.thievingRisk}`))
    : null;

  // Task #334 (UI-Welle 2 „Boosts sichtbar"): das New-Haven-Tempo DIESES Skills separat auslesen
  // — derselbe Engine-Hook, den `effectiveActionDurationMs` intern schon verrechnet hat
  // (`CAMP_SKILL_SPEED_KIND`/`campBoostCached`, s. engine/tick.ts `campSpeedMult`) — NUR für die
  // Aufschlüsselungs-Zeile im Zeit-Tooltip unten, keine zweite Dauer-Formel. Kampf-Skills/Slayer
  // haben keinen Eintrag in `CAMP_SKILL_SPEED_KIND` ⇒ `campSpeedKind` bleibt dort `null`.
  const campSpeedKind = CAMP_SKILL_SPEED_KIND[action.skill] ?? null;
  const campSpeedCut = campSpeedKind
    ? Math.max(0, Math.min(CAMP_SPEED_CUT_CAP, campBoostCached(state, content, campSpeedKind)))
    : 0;
  const timeTip = campSpeedKind && campSpeedCut > 0
    ? <div className="ct-tip-desc"><CampBoostNote kind={campSpeedKind} value={campSpeedCut} t={t} /></div>
    : null;

  // Stat-Kacheln je nach Aktionsart.
  const tiles: Array<{ label: string; value: string; cls?: string; tooltip?: JSX.Element }> = isThief
    ? [
        { label: t("skill.t.success"), value: `${Math.round(rate.successChance * 100)}%`, cls: "acc", tooltip: successTip ?? undefined },
        { label: t("skill.t.gold"), value: action.gold ? `${Math.round(action.gold.min * rate.rewardMult)}–${Math.round(action.gold.max * rate.rewardMult)}` : "—", cls: "gold" },
        { label: t("skill.t.xp"), value: `+${Math.round(action.xp * rate.rewardMult)}` },
        // codex:2026-08-03T15:00:00+02:00 (Task #334) — KEIN New-Haven-Tooltip hier: die Thieving-
        // Zeit-Kachel zeigt bewusst die ROHE `action.durationMs` (kein Werkzeug-/Mastery-/Lager-
        // Tempo eingerechnet, anders als der Gather/Craft-Zweig unten über `effSpeed`) — ein Hinweis
        // auf einen Bonus, den die angezeigte Zahl gar nicht trägt, wäre irreführend. Die
        // Fence-Tent-Beschleunigung (`thievingSpeed`) wirkt real (s. `rate.avgDurationMs`), nur
        // eben nicht auf DIESE Anzeige — an den CEO gemeldet (Zeit-Kachel-Inkonsistenz Thieving vs.
        // Gather/Craft ist ein Bestandsproblem, keine Regression dieses Tasks).
        { label: t("skill.t.time"), value: `${formatSeconds1(action.durationMs / 1000)}s` },
      ]
    : [
        { label: t("skill.t.xp"), value: `+${action.xp}`, cls: "acc" },
        { label: t("skill.t.rate"), value: formatCompactK(Math.round(rate.xpPerHour)) },
        {
          label: t("skill.t.time"),
          value: `${formatSeconds1((action.durationMs / 1000) * effSpeed)}s${toolSpeed < 1 ? " ⛏" : ""}${mSpeed < 1 ? " ★" : ""}`,
          cls: effSpeed < 1 ? "acc" : undefined,
          tooltip: timeTip ?? undefined,
        },
        // Release-Fix-Welle 0.3.0 Fix 6: „~" sah in der Serifenschrift der Statkacheln wie ein
        // Minus aus (liest sich als negativer Ertrag). „≈" ("ungefähr") ist eindeutig — Screenshot-
        // Urteil folgt, Fallback wäre der Präfix ganz weg.
        { label: t("skill.t.yield"), value: out ? `≈${formatCompactK(out.perHour)}` : "—" },
      ];

  const cardCls = [
    "skillcard",
    isActive ? "active" : "",
    !levelOk ? "locked" : levelOk && !ready ? "blocked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Regression-Fix (Chef, 2026-07-02): jede Karte zeigt wieder ihr eigenes Banner-Bild
  // (wie vor Perf #206/P3) — Foraging hat ein einzigartiges Bild pro Aktion (forageBg),
  // alle anderen Skills teilen sich das eine Skill-Hintergrundbild (skillPageBg), wie
  // vorher; nur die (billige) 1px-Blur-Ebene ist geteilt-CSS, keine echte Duplizier-Last.
  const forageBg = getForagingCard(action.id);
  const bgUrl = forageBg ?? skillPageBg;

  // ─── Welle OO: Juice-Refs + State ─────────────────────────────────────────────────────
  const cardRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLElement | null>(null);
  const sparkRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const masteryFillRef = useRef<HTMLDivElement | null>(null);

  const prevMasteryXpRef = useRef<number | null>(null);
  const prevSkillXpRef = useRef<number | null>(null);
  const prevMasteryLvlRef = useRef<number | null>(null);
  const prevSkillLvlRef = useRef<number | null>(null);
  const lastPulseAtRef = useRef(0);

  const [floater, setFloater] = useState<{ skillAmt: number; masteryAmt: number; key: number } | null>(null);
  const floaterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floaterKeyRef = useRef(0);

  const [barOverridePct, setBarOverridePct] = useState<number | null>(null);
  const [barOverflowActive, setBarOverflowActive] = useState(false);
  /** Ausstehende Timeouts/rAF-IDs der Bar-Überschwapp-Sequenz — beim Unmount ODER einem erneuten
   *  Level-Up MITTEN in der Sequenz eingesammelt abgeräumt (keine Zombie-Timer). */
  const pendingRef = useRef<Array<() => void>>([]);

  /** Kurzer Gold-Puls auf der ganzen Karte — Tick-Abschluss (`strong=false`) ODER Level-Up
   *  (`strong=true`, s. flashGlow). Bleibt bei fxLevel "reduced" erhalten (reines Flash/Farbe). */
  function pulseCard(strong: boolean): void {
    if (fx === "off") return;
    flashGlow(cardRef.current, strong);
  }

  /** Moment 1 (Tick-Befriedigung): Puls + ggf. Funken/Icon-Pop, gedrosselt auf max. ~1×/Sekunde
   *  (Chef-Vorgabe gegen Spam bei sehr schnellen Aktionen, <1,5s Zyklus). */
  function maybePulseTick(): void {
    if (fx === "off") return;
    const now = performance.now();
    if (now - lastPulseAtRef.current < 1000) return;
    lastPulseAtRef.current = now;
    flashGlow(cardRef.current, false);
    // Moment 5 ("fast geschafft"): war die Mastery VOR diesem Abschluss schon <5% vom nächsten
    // Level entfernt, bekommt die Bar zusätzlich einen kräftigeren Glanz-Puls genau JETZT (am
    // Ertrags-Ereignis) — endlich, kein Dauer-Loop. Die statische wärmere Grundfarbe kommt
    // unabhängig davon über die CSS-Klasse "near-complete" (s. JSX unten, IMMER sichtbar ab 95%,
    // auch auf inaktiven Karten — reiner Zustand, kein Effekt, daher nicht fx-gated).
    if (mProg >= 0.95) flashGlow(masteryFillRef.current, true);
    if (fx === "full") {
      popScale(iconRef.current);
      burstSparks(sparkRefs.current);
    }
  }

  /** Moment 2 (XP-Floater): summiert mehrere Abschlüsse im selben Zeitfenster in EINEM Element
   *  (Text wird aktualisiert, kein zweiter Floater gestapelt) statt Spam-Regen. */
  function pushFloater(skillDelta: number, masteryDelta: number): void {
    if (fx === "off") return;
    if (skillDelta <= 0 && masteryDelta <= 0) return;
    setFloater((cur) =>
      cur
        ? { skillAmt: cur.skillAmt + skillDelta, masteryAmt: cur.masteryAmt + masteryDelta, key: cur.key }
        : { skillAmt: skillDelta, masteryAmt: masteryDelta, key: ++floaterKeyRef.current },
    );
    if (floaterTimerRef.current !== null) clearTimeout(floaterTimerRef.current);
    floaterTimerRef.current = setTimeout(() => setFloater(null), 750);
  }

  /** Moment 3 (Mastery-Bar-Überschwapp): Bar füllt sich sichtbar auf 100%, blitzt kurz auf und
   *  „schwappt" per langsamerer CSS-Transition in den neuen (niedrigeren) Fortschritt über —
   *  statt des harten Sprungs auf den rohen `mProg` des neuen Levels. Zwei rAF-Schritte sorgen
   *  dafür, dass der Browser die 100%-Breite tatsächlich EINMAL committed/gemalt hat, bevor die
   *  Freigabe auf den echten Wert (mit aktivem `bar-overflow`-Transition) folgt — sonst würden
   *  beide Style-Updates in denselben Frame gebatcht und der Sprung wäre unsichtbar. */
  function overflowMasteryBar(): void {
    if (fx === "off") return; // off: Bar springt einfach nüchtern auf den neuen Wert (kein Trara).
    // Eine evtl. noch laufende vorige Sequenz (sehr schneller Doppel-Level-up) sauber abräumen,
    // bevor die neue startet — sonst könnte ihr verspäteter "Deaktivieren"-Timer die neue
    // Sequenz vorzeitig aus der langsamen Transition zurückholen.
    pendingRef.current.forEach((fn) => fn());
    pendingRef.current = [];
    setBarOverflowActive(true);
    setBarOverridePct(100);
    flashGlow(masteryFillRef.current, true);
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setBarOverridePct(null);
        const id = setTimeout(() => setBarOverflowActive(false), 650);
        pendingRef.current.push(() => clearTimeout(id));
      });
      pendingRef.current.push(() => cancelAnimationFrame(raf2));
    });
    pendingRef.current.push(() => cancelAnimationFrame(raf1));
  }

  // Diff-Erkennung: läuft jeden Render-Tick (state.totalTicks), aber NUR für die aktive Karte —
  // alle anderen brechen sofort ab (nur Ref-Reset, s. Component-JSDoc oben zur Perf-Begründung).
  useEffect(() => {
    if (!isActive) {
      // Referenzwerte zurücksetzen: wird diese Aktion SPÄTER erneut aktiv, soll das nicht die
      // Zeit dazwischen (evtl. viel XP durch eine ANDERE Aktion) als "einen Zyklus" dieser Karte
      // fehlinterpretieren.
      prevMasteryXpRef.current = null;
      prevSkillXpRef.current = null;
      prevMasteryLvlRef.current = null;
      prevSkillLvlRef.current = null;
      return;
    }
    const nowMasteryXp = state.mastery[action.id]?.xp ?? 0;
    const nowSkillXp = state.skills[skillId]?.xp ?? 0;
    const nowMasteryLvl = levelFromXp(nowMasteryXp);
    const nowSkillLvl = levelFromXp(nowSkillXp);

    const prevMasteryXp = prevMasteryXpRef.current;
    const prevSkillXp = prevSkillXpRef.current;
    const prevMasteryLvl = prevMasteryLvlRef.current;
    const prevSkillLvl = prevSkillLvlRef.current;

    if (prevMasteryXp !== null && nowMasteryXp > prevMasteryXp) {
      // Mindestens ein Zyklus ist seit dem letzten Render fertig geworden — mastery.xp steigt in
      // der Engine NUR bei einem tatsächlich ERFOLGREICHEN Abschluss (tick.ts completeAction);
      // ein Thieving-Fehlschlag lässt sie unverändert, feuert hier also korrekt NICHTS.
      const skillDelta = prevSkillXp !== null ? Math.max(0, nowSkillXp - prevSkillXp) : 0;
      const masteryDelta = nowMasteryXp - prevMasteryXp;
      pushFloater(skillDelta, masteryDelta);
      maybePulseTick();
    }

    if (prevMasteryLvl !== null && nowMasteryLvl > prevMasteryLvl) {
      pulseCard(true);
      overflowMasteryBar();
    } else if (prevSkillLvl !== null && nowSkillLvl > prevSkillLvl) {
      // Skill-Level-up ohne gleichzeitigen Mastery-Level-up (der übliche Fall) — die Karte pulst
      // trotzdem einmal (Monas Karten-Puls-Wunsch gilt jedem Level-Up-Moment dieser Aktion).
      pulseCard(true);
    }

    prevMasteryXpRef.current = nowMasteryXp;
    prevSkillXpRef.current = nowSkillXp;
    prevMasteryLvlRef.current = nowMasteryLvl;
    prevSkillLvlRef.current = nowSkillLvl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks, isActive]);

  // Aufräumen beim Unmount (Skill-Wechsel remountet die ganze Seite, s. App.tsx `key={page.skillId}`
  // — trotzdem defensiv, falls eine Karte je aus anderem Grund unmountet, während ein Floater/eine
  // Überschwapp-Sequenz noch läuft).
  useEffect(() => {
    return () => {
      if (floaterTimerRef.current !== null) clearTimeout(floaterTimerRef.current);
      pendingRef.current.forEach((fn) => fn());
      pendingRef.current = [];
    };
  }, []);

  return (
    // Wiki→Rezept-Sprung (util/skillJump.ts): stabile, per Aktion eindeutige ID, damit SkillPage
    // nach dem Aufklappen der Kategorie per document.getElementById herscrollen + kurz pulsen kann.
    <div ref={cardRef} id={`skillcard-${action.id}`} className={cardCls}>
      <div
        className={`skillcard-banner ${rarityClass(outItem?.rarity)}${bgUrl ? " has-bg" : ""}`}
      >
        {bgUrl && (
          <div
            className="skillcard-banner-bg"
            style={{ backgroundImage: `url("${bgUrl}")` }}
          />
        )}
        {skillId !== "foraging" &&
          (img ? (
            <img
              loading="lazy"
              decoding="async"
              src={img}
              alt=""
              className="skillcard-img pixelart"
              ref={(el) => { iconRef.current = el; }}
            />
          ) : (
            <span className="skillcard-emoji" ref={(el) => { iconRef.current = el; }}>
              {outItem?.icon ?? "▪"}
            </span>
          ))}
        {/* Welle OO Moment 1: 2–3 Tick-Abschluss-Funken — unsichtbar im Ruhezustand (Opacity 0 per
            CSS), WAAPI blendet sie nur kurz beim Ertrags-Ereignis ein (nur fxLevel "full"). */}
        <div className="skillcard-sparks" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} ref={(el) => { sparkRefs.current[i] = el; }} className="skillcard-spark" />
          ))}
        </div>
        {/* Welle OO Moment 2: XP-Floater — mehrere Abschlüsse im selben Zeitfenster summieren sich
            in DIESEM einen Element statt mehrerer gestapelter Floater. */}
        {floater && (
          <div key={floater.key} className="skillcard-xp-floater" aria-hidden="true">
            +{floater.skillAmt} {t("skill.t.xp")}
            {floater.masteryAmt > 0 && (
              <span className="skillcard-xp-floater-mastery">+{floater.masteryAmt} ★</span>
            )}
          </div>
        )}
        {/* Inventar-Zähler oben links: wie oft man das Output-Item schon besitzt */}
        {out && (
          <span
            className="skillcard-invcount"
            title={outItem ? `${tr(outItem.name)} im Inventar: ${itemCount(state.inventory, out.itemId)}` : undefined}
          >
            {INV_ICON_URL ? <img loading="lazy" decoding="async" src={INV_ICON_URL} alt="" className="skillcard-invcount-icon" /> : "📦"}
            {" "}{itemCount(state.inventory, out.itemId)}×
          </span>
        )}
        <div className="skillcard-topright">
          <span className={levelOk ? "skillcard-lvl" : "skillcard-lvl locked"}>
            {levelOk
              ? t("skill.levelShort").replace("{n}", String(req))
              : <>{LOCKED_ICON_URL ? <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="locked-icon-img" /> : "🔒"} {req}</>}
          </span>
        </div>
        <div className="skillcard-title">{tr(action.name)}</div>
      </div>

      {/* 1.0.2 (Spieler-Report): Braucht eine Aktion GAR KEINE Zutaten (Stehlen, Sammeln,
          Holzfaellen), stand hier trotzdem ein 2x2-Rack aus vier leeren Reservekaesten —
          112 px, waehrend die Beute-Box darueber auf 52 px scrollte. Die Klasse gibt der
          Beute diesen Platz. Karten MIT Zutaten bleiben unveraendert. */}
      <div className={`skillcard-body${resourceInputs.length === 0 ? " skillcard-body--no-inputs" : ""}`}>
        <div className="skillcard-grid">
          {tiles.map((tile) =>
            tile.tooltip ? (
              <HoverTip key={tile.label} as="div" className="skillcard-tile" content={tile.tooltip}>
                <small>{tile.label}</small>
                <b className={tile.cls}>{tile.value}</b>
              </HoverTip>
            ) : (
              <div key={tile.label} className="skillcard-tile">
                <small>{tile.label}</small>
                <b className={tile.cls}>{tile.value}</b>
              </div>
            ),
          )}
        </div>

        {/* codex:2026-07-31T20:21:01+02:00 — Output und Loot teilen eine feste gerahmte Zone;
            bedingte Inhalte dürfen die Card-Höhe nicht verschieben. Keine Suffix-Projektion. */}
        <div className="skillcard-output-zone">
        {/* Beute / Ertrag */}
        {skillId === "foraging" ? (
          // Foraging (Chef-Wunsch #237): ALLE möglichen Loots einer Node auflisten wie bei
          // Monster-Drops, aber unentdeckte (noch nie erhaltene) maskiert als „???" — erst
          // Foragen enthüllt, was eine Node überhaupt droppt (Collection-Log-Stil, s.
          // CombatPage DropIcon). Andere Gather-Skills (Mining/Woodcutting/Fishing) haben
          // einen offensichtlichen Einzel-Output und bleiben unmaskiert (produces-Zweig unten).
          action.loot.length > 0 && (
            <div className="skillcard-loot muted">
              <span>
                {t("skill.loot")}{" "}
                <span className="skillcard-loot-count">
                  (
                  {action.loot.filter((r) => hasActionDropSeen(state, action.id, r.itemId)).length}
                  /{action.loot.length})
                </span>
              </span>
              {action.loot.map((roll) => (
                <LootChip key={roll.itemId} actionId={action.id} roll={roll} />
              ))}
            </div>
          )
        ) : isThief ? (
          // Task #331: die Chips zeigen die REINE (bedingte) Loot-Chance — die vorgelagerte
          // Erfolgschance (Kachel oben) ist NICHT eingerechnet. "(bei Erfolg)" macht das auf der
          // Karte selbst lesbar (ohne Hover); die Tooltip listet zusätzlich die EFFEKTIVE Chance je
          // Versuch (Erfolg × Loot) — zu viele Zahlen für einen dauerhaft sichtbaren Zusatz je Chip,
          // aber genau die Rechnung, die den Chef-/Spieler-Report auslöste ("50 % Loot, aber nur 3
          // von 20 Versuchen").
          action.loot.length > 0 && (
            <div className="skillcard-loot muted">
              <HoverTip
                as="span"
                content={
                  <div className="ct-tip-desc">
                    <div>{t("skill.loot.onSuccessTip")}</div>
                    {action.loot.map((roll) => {
                      const rollItem = content.items[roll.itemId];
                      const effective = rate.successChance * roll.chance;
                      return (
                        <div key={roll.itemId}>
                          {rollItem ? tr(rollItem.name) : roll.itemId}: {formatPct1(effective)}%
                        </div>
                      );
                    })}
                  </div>
                }
              >
                {t("skill.loot.onSuccess")}
              </HoverTip>
              {action.loot.map((roll) => (
                <LootChip key={roll.itemId} actionId={action.id} roll={roll} neverMask />
              ))}
            </div>
          )
        ) : (
          out &&
          outItem && (
            <div className="skillcard-produces muted">
              {/* codex:2026-08-01T12:18:00+02:00 — Feste Zweizeilen-Hierarchie: Label oben,
                  Ergebnis darunter. Damit bleibt die Ausgabe auch bei langen Übersetzungen lesbar. */}
              <span className="skillcard-produces-label">{t("skill.produces")}:</span>
              <span className="skillcard-produces-item"><ItemChip itemId={out.itemId} showName /></span>
            </div>
          )
        )}

        </div>

        {/* codex:2026-07-31T19:32:00+02:00 — Vier feste Resource-Slots für 0–4 Inputs.
            Gathering und kurze Rezepte behalten neutrale Reserven statt ihre Geometrie zu ändern. */}
        {resourceInputs.length > 0 && (
        <div className="skillcard-resource-rack">
          {Array.from({ length: 4 }, (_, slotIndex) => {
            const inp = resourceInputs[slotIndex];
            if (!inp) {
              return <span key={`empty-${slotIndex}`} className="skillcard-resource-empty" aria-hidden="true" />;
            }
                const have = matCount(inp.itemId); // Inventar + Bank
                const enough = have >= inp.qty;
                const inpItem = content.items[inp.itemId];
                const matImg = getItemImage(inp.itemId);
                return (
                  <span
                    key={inp.itemId}
                    className={enough ? "mat-chip" : "mat-chip lacking"}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={(e) => tooltip.show(inp.itemId, e.clientX, e.clientY, [])}
                    onMouseLeave={() => tooltip.hide()}
                    onClick={(e) => {
                      e.stopPropagation();
                      tooltip.pin(inp.itemId, e.clientX, e.clientY, []);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      tooltip.pin(inp.itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, []);
                    }}
                  >
                    {matImg ? (
                      <img loading="lazy" decoding="async" src={matImg} alt="" className="mat-img pixelart" />
                    ) : (
                      <span className="mat-emoji">{inpItem?.icon ?? "▪"}</span>
                    )}
                    {/* Hotfix 2026-08-04 (Discord-Bugreport): rohe 3+-stellige Bestände ("978/1",
                        "309/1") sprengten die Chip-Breite und wurden vom `overflow:hidden` des Chips
                        unsichtbar abgeschnitten (Label da, Wert weg) — genau wie die Nachbar-Kacheln
                        XP/h und Ertrag/h weiter oben nutzt der Bestand jetzt formatCompactK (ab 1000
                        → „4,2k" statt „4230"); die CSS-Seite bekommt zusätzlich einen Stapel-Fallback
                        (s. gravewood-actioncards.css @container 300px), falls selbst das noch zu eng wird. */}
                    <span className="mat-count">
                      <b>{formatCompactK(have)}</b>/{formatCompactK(inp.qty)}
                    </span>
                  </span>
                );
          })}
        </div>
        )}

        {/* codex:2026-07-31T19:32:00+02:00 — STOP, Craftable, Locked und neutraler Zustand
            ersetzen dieselbe reservierte Platte; kein Zustand fügt eine neue Zeile hinzu. */}
        <div className={`skillcard-state-slot${isActive ? " active" : ""}${!levelOk || !ready ? " blocked" : ""}`}>
          {isActive ? (
            <button
              className="skillcard-cta stop"
              onClick={() => setActiveAction(state, content, null)}
            >
              {state.actionTarget !== null
                ? `${t("skill.stop")} · ${t("skill.remaining").replace("{n}", String(state.actionTarget))}`
                : t("skill.stop")}
            </button>
          ) : !levelOk ? (
            <span className="skillcard-state-label muted">{t("skill.lockedCta")}</span>
          ) : isCraft ? (
            <span className={`craftable${craftable > 0 ? "" : " none"}`}>
              🔨 {t("skill.craftable").replace("{n}", String(craftable))}
            </span>
          ) : (
            <span className="skillcard-state-label" aria-hidden="true">&nbsp;</span>
          )}
        </div>

        {/* codex:2026-08-01T13:02:00+02:00 — Sichtbare Presets verzichten auf das redundante ×;
            die Queue-Semantik und übergebenen numerischen Ziele bleiben vollständig unverändert.
            Einheitliches 4er-Queue-Grid (Chef-Rework): 1 / 25 / 50 / ∞ — für ALLE Skill-
            Aktionen (Crafting UND Sammeln/Abbau), nicht mehr nur Crafting. Jeder Klick reiht per
            enqueueAction in state.actionQueue ein (STAPELT bei gleicher, unmittelbar
            vorangehender Aktion — s. Engine-JSDoc) statt sie über setActiveAction sofort zu
            ersetzen; die Engine startet die Queue von selbst, sobald nichts läuft. Kein
            separater „Start"-Button mehr nötig, kein Umschalt-Klick-Sonderfall mehr (JEDER Klick
            queued jetzt) — das gestapelte Gesamtvolumen zeigt das Warteschlangen-Panel
            (ActionQueuePanel) zusammengefasst an ("Tin Vein ×250" statt einzelner Zeilen).
            Task #327 (Priority-UI): Shift-Klick reiht stattdessen über `enqueueActionAtFront` ein
            — sofort losstarten, die laufende Aktivität rückt mit Rest-Ziel an die Queue-Front
            (Engine-JSDoc `insertQueueEntryAtFront`). Reines Event-Flag (`e.shiftKey`), kein neues
            Tick-Abo. Hinweis dazu im Karten-Tooltip — eigene HoverTip statt natives `title` (bleibt
            damit auch headless/Playwright-screenshotbar statt vom OS-Tooltip-Timing abzuhängen,
            s. MonsterCard `.mc-shift-hint`-Pendant in CombatPage.tsx). `focusable={false}`: die
            Buttons darin sind schon selbst fokussierbar, kein doppelter Tab-Stopp auf dem Wrapper. */}
        <HoverTip
              as="div"
              className="skillcard-craft-cta"
              focusable={false}
              content={
                <span className="ct-tip-desc">
                  {t("skill.queue.hint")} · {t("queue.shiftStartHint")}
                </span>
              }
            >
              {CRAFT_TARGET_PRESETS.map((n) => (
                <button
                  key={n}
                  className="skillcard-cta qty"
                  disabled={!levelOk || !ready}
                  onClick={(e) =>
                    (e.shiftKey ? enqueueActionAtFront : enqueueAction)(state, content, action.id, n)
                  }
                >
                  {n}
                </button>
              ))}
              <button
                className="skillcard-cta qty all"
                disabled={!levelOk || !ready}
                onClick={(e) =>
                  (e.shiftKey ? enqueueActionAtFront : enqueueAction)(state, content, action.id, null)
                }
              >
                ∞
              </button>
        </HoverTip>

        {/* Aktions-Fortschrittsleiste hier entfernt (Chef #239): redundant zur Title-Bar
            (content-header, gelbe Aktions-Leiste). STOP-Button oben + Mastery-Bar unten
            bleiben. */}

        {/* Mastery: Level + Fortschritt + aktueller Doppel-Ertrag-Bonus */}
        <div
          className="skillcard-mastery"
          // Welle MM (Mona R3-Fund, "Skill-Karte rundet Mastery-Chancen auf Ganzzahl auf"):
          // Chip UND Tooltip nutzen jetzt dasselbe formatPct1-Muster wie die MasteryPage
          // (der KK-Fix hatte nur DIESE zweite Stelle vergessen) — ★2 zeigte hier "+1%" bei
          // real 0,5%, während die MasteryPage schon korrekt "+0,5%" auswies.
          title={t("skill.masteryTip")
            .replace("{pct}", formatPct1(mBonus))
            .replace("{spd}", formatPct1(1 - mSpeed))}
        >
          <span className={`mastery-label${mRankTier ? ` mastery-label--${mRankTier}` : ""}`}>
            ★ {t("skill.mastery")} {mLvl}
          </span>
          {/* Welle OO Moment 3+5: "near-complete" ist ein reiner Zustand (<5% bis zum nächsten
              Mastery-Level, s. mProg-Check) — IMMER sichtbar, nicht fx-gated (wie die Rang-Farben
              oben). "bar-overflow" ist nur während der kurzen Überschwapp-Sequenz aktiv (langsamere
              Transition, s. overflowMasteryBar) und wird danach wieder entfernt. */}
          <div
            className={`bar mastery-bar${mProg >= 0.95 ? " near-complete" : ""}${barOverflowActive ? " bar-overflow" : ""}`}
          >
            <div
              ref={masteryFillRef}
              className="bar-fill"
              style={{ transform: `scaleX(${(barOverridePct ?? Math.min(100, mProg * 100)) / 100})` }}
            />
          </div>
          {mBonus > 0 && <span className="mastery-bonus">+{formatPct1(mBonus)}% ×2</span>}
        </div>
      </div>
    </div>
  );
});

/**
 * Tooltip-Inhalt der Thieving-Erfolgschance-Kachel (Task #331 — Chef-/Spieler-Verwirrung: "Beggar
 * zeigt 50 % Loot, aber nur 3 Beutel nach 20 Versuchen", weil die Erfolgschance eine SEPARATE,
 * VORGELAGERTE Chance ist, die die Loot-Chips oben nirgends beziffern). Zerlegt `rate.successBreakdown`
 * (s. util/actionRate.ts — dieselbe Formel wie tick.ts `completeAction`) in ihre Bestandteile, statt
 * nur die Endzahl zu zeigen. Nullwertige Zeilen (kein Pet-/Ring-Bonus, was für die meisten Spieler
 * der Normalfall ist) werden weggelassen, damit die Tooltip nicht mit "+0 %"-Zeilen zumüllt.
 */
function successChanceTip(
  t: (key: string) => string,
  b: NonNullable<ActionRate["successBreakdown"]>,
  riskLabel: string,
): JSX.Element {
  if (b.alwaysSucceed) {
    return <div className="ct-tip-desc">{t("skill.t.success.tip.always")}</div>;
  }
  const otherBonus = b.petBonus + b.capeBonus;
  return (
    <div className="ct-tip-desc">
      <div>
        {t("skill.t.success.tip.base")
          .replace("{base}", formatPct1(b.base))
          .replace("{lvl}", formatPct1(b.levelBonus))}
      </div>
      {b.riskBonus !== 0 && (
        <div>
          {t("skill.t.success.tip.risk")
            .replace("{mode}", riskLabel)
            .replace("{sign}", b.riskBonus > 0 ? "+" : "")
            .replace("{pct}", formatPct1(b.riskBonus))}
        </div>
      )}
      {otherBonus !== 0 && (
        <div>{t("skill.t.success.tip.otherBonus").replace("{pct}", formatPct1(otherBonus))}</div>
      )}
      <div>{t("skill.t.success.tip.cap").replace("{cap}", formatPct1(b.cap))}</div>
    </div>
  );
}

/**
 * Beute-Chip einer Foraging-Aktion (Task #237): „???" bis der Drop tatsächlich erhalten wurde
 * (Collection-Log-Stil, gespiegelt von CombatPage's `DropIcon`/`hasDropSeen`), danach normales
 * Icon + Name + Chance wie beim bestehenden Thieving-Loot-Chip.
 */
function LootChip({
  actionId,
  roll,
  neverMask = false,
}: {
  actionId: string;
  roll: { itemId: string; chance: number; min: number; max: number };
  /** Thieving u.ä.: nie maskieren (kein Discovery). Foraging: maskiert bis erhalten. */
  neverMask?: boolean;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const tooltip = useItemTooltip();
  const seen = neverMask || hasActionDropSeen(state, actionId, roll.itemId);
  if (!seen) {
    // Task #248: schwarze Silhouette des echten Items statt „???"-Text (brightness(0) auf
    // getItemImage, gleiche Größe wie der entdeckte ItemChip). Nicht klickbar, kein Tooltip.
    // Fallback auf „???" nur wenn kein Bild existiert.
    const mysteryImg = getItemImage(roll.itemId);
    return (
      <span className="skillcard-drop undiscovered" title={t("skill.undiscovered")}>
        {mysteryImg ? (
          <img
            loading="lazy"
            decoding="async"
            src={mysteryImg}
            alt=""
            className="item-chip-img skillcard-drop-silhouette pixelart"
          />
        ) : (
          "???"
        )}
      </span>
    );
  }
  const item = content.items[roll.itemId];
  // Chef: der GANZE Chip (Icon + % + Name) ist klickbar → pinnt den Item-Tooltip. Vorher war nur das Icon klickbar.
  return (
    <span
      className="skillcard-drop clickable"
      title={item ? tr(item.name) : roll.itemId}
      onClick={(e) => {
        e.stopPropagation();
        tooltip.pin(roll.itemId, e.clientX, e.clientY, []);
      }}
    >
      <ItemChip itemId={roll.itemId} />
      {" "}{Math.round(roll.chance * 100)}%
      {item && <span className="item-chip-name" style={{ fontSize: "0.85em", marginLeft: 3 }}>{tr(item.name)}</span>}
    </span>
  );
}

// ActivePanel (das große „IN PROGRESS · <Aktion>"-Panel) wurde entfernt (Chef-Feedback #239):
// der Fortschritt läuft bereits in der Title-Bar (content-header, gelbe Aktions-Leiste, s.
// App.tsx ActionProgressBar) — eine zweite volle-Breite-Fortschrittsanzeige auf der Skill-Seite
// war redundant. Der Betäubungs-Hinweis lebt jetzt direkt oben in SkillPage (s. dort).
