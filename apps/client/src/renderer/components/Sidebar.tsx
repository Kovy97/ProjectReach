import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSidebarPages } from "../navigation";
import { prestigeNavVisible } from "../util/prestigeNav";
import { getSidebarIcon } from "../sidebarIcons";
import { getSkillIcon } from "../skillIcons";
import { useGameControl, useGameSelector, useGameState, tupleEquals } from "../game/GameContext";
import { useI18n } from "../i18n";
import { computeStats, levelFromXp, xpForLevel, combatLevel } from "@hearthforge/engine";
import { activeStanceMods, COMBAT_SKILL_IDS } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { BlessingPanel } from "./BlessingPanel";
import { skillBoostFor, SkillLevelText } from "./SkillLevel";
import {
  getSidebarWidth,
  openCombatDockTab,
  setSidebarWidth,
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from "../util/uiPrefs";
import { registerEscCloser } from "../util/escStack";
import { mailItemCount } from "@hearthforge/engine";
import { HoverTip } from "./CitadelTip";

// Deko-SVGs — Vite bündelt sie als URL-Strings (identisch zu PNG-Imports).
// Tint ist im SVG eingebacken; kein CSS-Filter nötig.
import emblWaxseal from "../assets/ui/emblem_waxseal.svg";
import emblCompass from "../assets/ui/emblem_compass.svg";
import emblGear    from "../assets/ui/emblem_gear.svg";
import emblSkull   from "../assets/ui/emblem_skull.svg";
// Mail-Emblem: aus Miras Micro-Icon-Set (2026-08-03) — ersetzt den letzten Emoji-Fallback im Footer.
import iconSysMail from "../assets/icons/icon_sys_mail.webp";
// Kein eigenes Postfach-Emblem-Asset vorhanden (Chef-Vorgabe erlaubt Emoji-Fallback) —
// .sb-footer-emblem-emoji (sidebar.css) trägt dieselbe 28×28-Box wie die SVG-Embleme oben.
// parchment.svg: CSS background-image in .sb-combat-subskills (sidebar.css).

interface SidebarProps {
  activePageId: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ activePageId, onNavigate }: SidebarProps): JSX.Element {
  const { t } = useI18n();
  // claude:2026-10-18T14:00:00+02:00 — Scherbenaltar-Eintrag erst sichtbar, wenn das Ziel erreichbar ist
  // (Kapitel 21 eingelöst oder schon ein Aufstieg); Frühspieler sehen ihn nicht.
  const showPrestige = useGameSelector(prestigeNavVisible);
  const pages = getSidebarPages().filter((p) => p.id !== "prestige" || showPrestige);

  // Local collapse state for combat sub-skills
  const [combatOpen, setCombatOpen] = useState(false);

  // Perf-Welle Block A (2026-07-22): Sidebar rendert auf JEDER Seite — die Level-Zahlen ändern
  // sich nur bei einem XP-Sprung über eine Levelgrenze, nicht bei jedem 10-Hz-Tick. Gate-Tupel:
  // [combatLvl, ...ein Level pro `pages`-Eintrag (skillId-lose Einträge → -1, ungenutzt)].
  // `tupleEquals` verhindert einen Re-Render, solange sich kein einziges Level ändert. Die
  // (vergleichsweise teure) Kampf-Subskill-Berechnung (computeStats/skillBoosts) lebt jetzt
  // komplett in `CombatSubskillsPanel` unten — die MOUNTET nur, während `combatOpen` true ist,
  // ihre eigene `useGameState()`-Abo läuft also wirklich nur "hinter combatOpen" (vorher war nur
  // die computeStats-Berechnung gegated, das umgebende Sidebar-Re-Render aber nicht).
  const skillLevelGate = useGameSelector(
    (s) => [
      combatLevel(s),
      ...pages.map((p) => (p.skillId !== undefined ? levelFromXp(s.skills[p.skillId]?.xp ?? 0) : -1)),
    ],
    tupleEquals,
  );
  const combatLvl = skillLevelGate[0];

  // ── Spieler-Feedback 0.2.2 Punkt 1: laufende Aktivität markieren ────────────────────────
  // Chef-Feedback: "If I'm in the Forging section, the Forging tab should be highlighted so
  // it's immediately clear which section is currently running" — gemeint ist die LAUFENDE
  // Aktion (aktive Action bzw. laufender Kampf), NICHT die angesehene Seite (die existiert
  // bereits als `.active`/`isActive` oben — beide Zustände müssen gleichzeitig lesbar bleiben,
  // s. `.sb-skill-btn--running` in sidebar.css, das UNABHÄNGIG von `.active` einen dezenten
  // Glut-Punkt zeigt). Primitiver `string | null`-Selector (Perf-Welle Block A-Muster): Kampf
  // hat Vorrang (läuft nie über `activeActionId`, s. `startCombat`/`setActiveAction`, die sich
  // gegenseitig ausschließen), sonst die Skill-ID der laufenden Sammel-/Handwerks-Aktion (`page.id`
  // entspricht bei Skill-Seiten exakt der `skillId`, bei "combat" exakt "combat" — ein einziger
  // `page.id === activeSkillId`-Vergleich reicht unten für BEIDE Fälle).
  const activeSkillId = useGameSelector((s) => {
    if (s.combat.monsterId !== null) return "combat";
    if (s.activeActionId) return content.actions[s.activeActionId]?.skill ?? null;
    return null;
  });

  // ── Task #291 (Chef-Feature): Sidebar stufenlos per Rand-Handle skalierbar ──────────────
  // Perf-Vorgabe: kein React-Re-Render pro mousemove — direkte Style-Mutation aufs DOM-Element
  // (gleiches Muster wie TiltImage in ItemTooltip.tsx). widthRef hält den aktuellen Wert
  // zwischen Renders, ohne einen davon auszulösen; erst beim mouseup wird in localStorage
  // persistiert (setSidebarWidth). --sb-scale (= Breite / 240px Referenz) treibt die
  // proportionale Skalierung von Button-Höhe/Font-/Icon-Größen/Paddings/Logo in sidebar.css.
  const asideRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const widthRef = useRef(getSidebarWidth());

  // Steam-Rezension 25.08.2026 (Befund B): bei knapper Fensterhöhe (1366×768) muss `.sb-nav`
  // weiterscrollen (s. sidebar.css-Kommentar an `--sb-vscale`/`.sb-nav--scrollable`) — der
  // Holzrahmen-Overlay verdeckt aber den nativen Scrollbalken, also braucht es einen eigenen,
  // sichtbaren Hinweis (Verlaufskante am unteren Rand). `--sb-nav--scrollable` wird NUR gesetzt,
  // wenn tatsächlich mehr Inhalt folgt (scrollHeight > clientHeight) — bei 1920×1080/1017 bleibt
  // die Liste unverändert, weil dort nichts überläuft.
  const [navScrollable, setNavScrollable] = useState(false);
  // claude:2026-10-17T13:00:00+02:00 — Gegenstück oben: Einträge, die unter das Segensbanner
  // gescrollt sind, blenden aus statt hart angeschnitten zu werden (chrome-sidebar.css).
  const [navScrolled, setNavScrolled] = useState(false);
  const checkNavScrollable = (): void => {
    const el = navRef.current;
    if (!el) return;
    // Nur solange unten wirklich noch etwas folgt: am Ende der Liste verschwindet der Verlauf
    // (Chef 25.08.2026: er blieb sonst dauerhaft stehen).
    const rest = el.scrollHeight - el.clientHeight - el.scrollTop;
    setNavScrollable(rest > 2);
    setNavScrolled(el.scrollTop > 2);
  };
  useLayoutEffect(checkNavScrollable);
  useEffect(() => {
    const el = navRef.current;
    window.addEventListener("resize", checkNavScrollable);
    el?.addEventListener("scroll", checkNavScrollable, { passive: true });
    return () => {
      window.removeEventListener("resize", checkNavScrollable);
      el?.removeEventListener("scroll", checkNavScrollable);
    };
  }, []);

  // codex:2026-09-10T11:18:00+02:00 — Zentrierte Spielbeschriftung: 19px Ziel.
  // claude:2026-10-17T13:00:00+02:00 — UI-Fundament: Namen brechen NUR an Wortgrenzen um (CSS),
  // gemessen wird darum das LÄNGSTE WORT je Name statt der ganzen Zeile. Eine gemeinsame Größe für
  // alle Einträge, so groß, dass jedes Einzelwort in seinen Slot passt — Boden 15 px (--fs-md).
  // Vorher: ganze Zeile gemessen, unter 14 px auf `overflow-wrap: anywhere` umgeschaltet — daher
  // „Собирательст/во". Passt ein einzelnes Wort selbst bei 15 px nicht, gibt nur dieser Knopf
  // seine Levelspalte ab (Level in die Ecke, `data-wide-name` — ein Attribut, das React beim
  // Neuzeichnen nicht überschreibt, anders als className); erst wenn auch das nicht
  // reicht (sehr schmal gezogene Leiste), wird nur dieser Name kleiner (bis 12 px).
  const fitFrame = useRef(0);
  const fitNames = (): void => {
    const el = asideRef.current;
    if (!el) return;
    cancelAnimationFrame(fitFrame.current);
    fitFrame.current = requestAnimationFrame(() => {
      const TARGET = 19;
      const FLOOR = 15;
      const MIN_SINGLE = 12;
      el.style.setProperty("--chrome-sidebar-name-size", `${TARGET}px`);
      const names = Array.from(el.querySelectorAll<HTMLElement>(".sb-skill-name"));
      for (const name of names) {
        name.style.removeProperty("font-size");
        delete name.parentElement?.dataset.wideName;
      }
      const range = document.createRange();
      // Benötigte Größe: aktuelle Größe × Slotbreite / Breite des längsten Wortes.
      const need = (name: HTMLElement): number | null => {
        const slot = name.clientWidth;
        const text = name.firstChild;
        if (slot <= 0 || !text || text.nodeType !== Node.TEXT_NODE) return null;
        let widest = 0;
        for (const m of (text.nodeValue ?? "").matchAll(/\S+/g)) {
          range.setStart(text, m.index ?? 0);
          range.setEnd(text, (m.index ?? 0) + m[0].length);
          widest = Math.max(widest, range.getBoundingClientRect().width);
        }
        const size = parseFloat(getComputedStyle(name).fontSize) || TARGET;
        return widest > 0 ? size * Math.max(0, slot - 1) / widest : null;
      };
      const needs: { name: HTMLElement; size: number }[] = [];
      for (const name of names) {
        const size = need(name);
        if (size !== null) needs.push({ name, size });
      }
      // Gemeinsame Größe nur aus Namen, die bei >= 15 px in ihre Spalte passen — die übrigen
      // bekommen gleich die breitere Spalte und ziehen nicht alle anderen mit herunter.
      const shared = Math.max(FLOOR, Math.min(TARGET, ...needs.filter((n) => n.size >= FLOOR).map((n) => n.size)));
      el.style.setProperty("--chrome-sidebar-name-size", `${Math.floor(shared * 10) / 10}px`);
      for (const n of needs) {
        if (n.size >= shared) continue;
        const btn = n.name.parentElement;
        if (btn?.querySelector(".sb-skill-level")) {
          btn.dataset.wideName = "1";
          n.size = need(n.name) ?? n.size; // in der neuen, breiteren Spalte nachmessen
        }
        if (n.size < shared) n.name.style.fontSize = `${Math.max(MIN_SINGLE, Math.floor(n.size * 10) / 10)}px`;
      }
      range.detach();
      checkNavScrollable();
    });
  };

  // codex:2026-09-10T10:23:09+02:00 — Width, font loading/player font choice and drawer
  // height changes invalidate geometry even without a React render. Cancel pending work on exit.
  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const resize = new ResizeObserver(fitNames);
    resize.observe(el);
    if (navRef.current) resize.observe(navRef.current);
    const fonts = new MutationObserver(fitNames);
    fonts.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "lang", "data-font"] });
    document.fonts.addEventListener("loadingdone", fitNames);
    fitNames();
    return () => {
      resize.disconnect();
      fonts.disconnect();
      document.fonts.removeEventListener("loadingdone", fitNames);
      cancelAnimationFrame(fitFrame.current);
    };
  }, []);

  const applySidebarWidth = (px: number): void => {
    const el = asideRef.current;
    if (!el) return;
    el.style.width = `${px}px`;
    el.style.setProperty("--sb-scale", String(px / SIDEBAR_WIDTH_DEFAULT));
    // codex:2026-09-10T10:23:09+02:00 — Keep the keyboard separator value in sync without
    // rerendering the whole navigation during pointer dragging.
    handleRef.current?.setAttribute("aria-valuenow", String(px));
    fitNames();
  };

  // Nach JEDEM Render nachmessen: das deckt den Sprachwechsel ab (andere Woerter, andere Laenge)
  // und das Ein-/Ausklappen der Kampf-Unterliste, ohne dafuer je einen eigenen Beobachter zu
  // brauchen. Die rAF-Buendelung oben macht daraus hoechstens eine Messung je Bild.
  useLayoutEffect(fitNames);

  // Persistierte Breite VOR dem ersten Paint anwenden (useLayoutEffect statt useEffect) —
  // sonst blitzt die Sidebar kurz in der 240px-CSS-Default-Breite auf.
  useLayoutEffect(() => {
    applySidebarWidth(widthRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    handleRef.current?.classList.add("dragging");
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent): void => {
      const next = Math.min(
        SIDEBAR_WIDTH_MAX,
        Math.max(SIDEBAR_WIDTH_MIN, startWidth + (ev.clientX - startX)),
      );
      widthRef.current = next;
      applySidebarWidth(next);
    };
    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      handleRef.current?.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSidebarWidth(widthRef.current); // erst hier persistieren, nicht pro mousemove
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Doppelklick auf den Handle = Reset auf den Default (240px).
  const handleResizeReset = (): void => {
    widthRef.current = SIDEBAR_WIDTH_DEFAULT;
    applySidebarWidth(SIDEBAR_WIDTH_DEFAULT);
    setSidebarWidth(SIDEBAR_WIDTH_DEFAULT);
  };

  // codex:2026-09-10T10:23:09+02:00 — Arrow keys resize, Home/End select the supported bounds.
  const handleResizeKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const widths: Record<string, number> = {
      ArrowLeft: widthRef.current - (e.shiftKey ? 32 : 8),
      ArrowRight: widthRef.current + (e.shiftKey ? 32 : 8),
      Home: SIDEBAR_WIDTH_MIN,
      End: SIDEBAR_WIDTH_MAX,
    };
    if (!(e.key in widths)) return;
    e.preventDefault();
    const next = Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, widths[e.key] ?? widthRef.current));
    widthRef.current = next;
    applySidebarWidth(next);
    setSidebarWidth(next);
  };

  return (
    <aside className="sidebar" ref={asideRef}>

      {/* ── 1. Blessing Panel — "Blessings of the Reach" (Chef-Feature 2026-07-21) ──
         Ersetzt das frühere reine Logo-Kästchen: zeigt den heute aktiven Welt-Segen als
         Kartengrafik + Name + Effekt-Zeile (BlessingPanel.tsx). Reiner Kalendertag aus der
         Engine (blessingForTime) — kein Save-State, keine Migration. */}
      <BlessingPanel />

      {/* ── 2. Skill Buttons (Combat inlined first, then Gathering/Crafting) ──
         Chef #215: Charakter-Karte (Name/Level/Gold) entfernt — lebt jetzt
         kompakt links in der content-header-Kopfzeile (App.tsx). Der Platz
         hier geht an die Button-Liste (mehr sichtbare Buttons ohne Scrollen).
         7-Sprachen-Fundament (Task #252): der Titel-Schriftzug war ein PNG
         (title_<id>.png, s. titleImages.ts) — nicht übersetzbar. Jetzt
         lokalisierbarer Text (.sb-skill-name), per CSS auf dieselbe Optik
         getrimmt (Cinzel, uppercase, Gold). */}
      <nav className={`sb-nav${navScrollable ? " sb-nav--scrollable" : ""}${navScrolled ? " sb-nav--scrolled" : ""}`} ref={navRef}>
        {pages.map((page, pageIdx) => {
          const iconSrc = getSidebarIcon(page.id);
          const isActive = page.id === activePageId;
          const isRunning = page.id === activeSkillId;

          // Combat: main nav button + chevron toggle + collapsible sub-skills
          if (page.id === "combat") {
            return (
              <div key={page.id} className="sb-combat-section">
                <div className="sb-combat-btn-row">
                  <button
                    /* codex:2026-09-10T10:23:09+02:00 — Grid level column and accessible
                       selection/running labels also survive icon-only navigation. */
                    className={`sb-skill-btn sb-skill-btn--has-level ds-button${isActive ? " active" : ""}${isRunning ? " sb-skill-btn--running" : ""}`}
                    // claude:2026-10-17T18:10:00+02:00 — Chef 17.10.: Klick auf Kampf klappt die
                    // Kampf-Fertigkeiten (samt Kampfstil-Zeile) automatisch auf; der Pfeil daneben
                    // bleibt der Schalter zum Zuklappen.
                    onClick={() => { onNavigate(page.id); setCombatOpen(true); }}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={`${t(page.label)}. ${t("sidebar.combatLevel")} ${combatLvl}${isRunning ? `. ${t("sidebar.activityRunning").replace("{skill}", t(page.label))}` : ""}`}
                    data-guide-id={`sidebar.${page.id}`}
                    /* codex:2026-09-10T10:23:09+02:00 — Compact-mode hover retains the
                       full destination and level without reserving another visual column. */
                    title={`${t(page.label)} · ${t("sidebar.combatLevel")} ${combatLvl}`}
                  >
                    {isRunning && <RunningPip label={t("sidebar.activityRunning").replace("{skill}", t(page.label))} />}
                    <span className="sb-skill-icon-wrap">
                      {iconSrc
                        ? <img loading="lazy" decoding="async" src={iconSrc} alt="" className="sb-skill-icon-img" />
                        : <span className="sb-skill-icon-fallback" aria-hidden="true">{page.icon}</span>
                      }
                    </span>
                    <span className="sb-skill-name">{t(page.label)}</span>
                    <span className="sb-skill-level sb-combat-lvl-badge">{combatLvl}</span>
                  </button>
                  <button
                    className={`sb-combat-toggle ds-button${combatOpen ? " open" : ""}`}
                    onClick={() => setCombatOpen((o) => !o)}
                    /* codex:2026-09-10T10:23:09+02:00 — Localized expansion remains a
                       separate keyboard/pointer target, including the compact rail. */
                    aria-label={t(combatOpen ? "sidebar.collapseCombatSkills" : "sidebar.expandCombatSkills")}
                    title={t(combatOpen ? "sidebar.collapseCombatSkills" : "sidebar.expandCombatSkills")}
                    aria-expanded={combatOpen}
                    aria-controls={combatOpen ? "sidebar-combat-skills" : undefined}
                  >
                    <span className="sb-combat-toggle-chevron" aria-hidden="true">
                      {combatOpen ? "▾" : "▸"}
                    </span>
                  </button>
                </div>
                {/* Perf-Welle Block A: `CombatSubskillsPanel` mountet NUR während `combatOpen` —
                    ihre `useGameState()`-Abo (und die darin gerechnete `computeStats`) lebt damit
                    wirklich "hinter combatOpen" (nicht nur die Berechnung wie zuvor, s. Komponente
                    unten). */}
                {combatOpen && <CombatSubskillsPanel onNavigate={onNavigate} />}
              </div>
            );
          }

          // All other sidebar pages: standard skill button
          const skillLevel = page.skillId !== undefined ? skillLevelGate[1 + pageIdx] ?? null : null;

          return (
            <button
              key={page.id}
              /* codex:2026-09-10T10:23:09+02:00 — Level-less destinations reclaim their
                 entire name slot; accessible labels retain levels/activity in compact mode. */
              className={`sb-skill-btn ds-button${skillLevel !== null ? " sb-skill-btn--has-level" : ""}${isActive ? " active" : ""}${isRunning ? " sb-skill-btn--running" : ""}`}
              onClick={() => onNavigate(page.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${t(page.label)}${skillLevel !== null ? `. ${t("sidebar.level")} ${skillLevel}/99` : ""}${isRunning ? `. ${t("sidebar.activityRunning").replace("{skill}", t(page.label))}` : ""}`}
              data-guide-id={`sidebar.${page.id}`}
              /* codex:2026-09-10T10:23:09+02:00 — Levels stay available on hover below 200px. */
              title={`${t(page.label)}${skillLevel !== null ? ` · ${t("sidebar.level")} ${skillLevel}/99` : ""}`}
            >
              {isRunning && <RunningPip label={t("sidebar.activityRunning").replace("{skill}", t(page.label))} />}

              {/* Rundes, gerahmtes Skill-Icon */}
              <span className="sb-skill-icon-wrap">
                {iconSrc
                  ? <img loading="lazy" decoding="async" src={iconSrc} alt="" className="sb-skill-icon-img" />
                  : <span className="sb-skill-icon-fallback" aria-hidden="true">{page.icon}</span>
                }
              </span>

              <span className="sb-skill-name">{t(page.label)}</span>

              {skillLevel !== null && (
                // Meisterweihe (design/master-capes-konzept.md §3): dezente Gold-Behandlung der
                // "99/99"-Anzeige, sobald der Skill die Weihe erreicht hat — kein Glow-Halo, nur Farbe.
                <span className={`sb-skill-level${skillLevel >= 99 ? " sb-skill-mastered" : ""}`}>
                  {skillLevel}/99
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Postfach-Badge (SAVE_VERSION 71): wartende Einheiten über alle Mails — dezenter Zähler
          am Footer-Button, s. SidebarFooter unten. Perf-Welle Block A: `mailItemCount` liefert
          bereits ein Primitive (number) — SidebarFooter holt sich das jetzt selbst per
          `useGameSelector` statt es hier (bei jedem Sidebar-Render) vorzuberechnen. */}
      {/* codex:2026-09-10T10:23:09+02:00 — Footer page destinations share aria-current. */}
      <SidebarFooter onNavigate={onNavigate} activePageId={activePageId} />

      {/* Task #291 (Chef-Feature): Drag-Handle am rechten Rand — Ziehen ändert die Breite
          stufenlos (64–420px), Doppelklick resettet auf den Default (240px). */}
      <div
        ref={handleRef}
        className="sb-resize-handle"
        onMouseDown={handleResizeStart}
        onDoubleClick={handleResizeReset}
        /* codex:2026-09-10T10:23:09+02:00 — Expose the existing resize range to keyboard/AT. */
        onKeyDown={handleResizeKey}
        tabIndex={0}
        role="separator"
        aria-orientation="vertical"
        aria-label={t("sidebar.resizeLabel")}
        aria-valuemin={SIDEBAR_WIDTH_MIN}
        aria-valuemax={SIDEBAR_WIDTH_MAX}
        aria-valuenow={widthRef.current}
        title={t("combat.resizeHint")}
        /* Versions-Tour-Ziel (Chef-Auftrag 2026-07-21, FeatureTourGuide.tsx): eigener
           "feature." Namespace, kollidiert nicht mit dem Haupt-Guide (topbar./sidebar.). */
        data-guide-id="feature.sidebarResize"
      />
    </aside>
  );
}

/**
 * Kampf-Subskill-Liste — nur gerendert, wenn die Sidebar-Kampfsektion aufgeklappt ist (s.
 * `combatOpen` im Aufrufer). Eigene Komponente statt Inline-Block, damit ihre `useGameState()`-
 * Subskription (voller 10-Hz-Tick, inkl. der vergleichsweise teuren `computeStats`-Berechnung für
 * die Skill-Boosts) wirklich NUR läuft, solange sie gemountet ist (Perf-Welle Block A). Vorher war
 * nur `computeStats` selbst gegated (`combatOpen ? computeStats(...) : null`), die umgebende
 * Sidebar re-renderte trotzdem bei jedem Tick — jetzt hängt gar keine Subskription mehr dran,
 * solange der Block eingeklappt ist.
 */
function CombatSubskillsPanel({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const stats = computeStats(state, content);
  // claude:2026-10-17T18:10:00+02:00 — Chef 17.10.: „Es muss besser ersichtlich werden, wo man den
  // Kampfstil ändert.“ Die Haltung der getragenen Waffe steht jetzt oben in der Liste und führt per
  // Klick direkt zum Kampfstil-Reiter; die Fertigkeit, die sie trainiert, ist in der Liste markiert.
  // Gleiche Quellen wie der Reiter selbst (CombatPage, Stance-Leiste) und die Engine-XP-Vergabe.
  const c = state.character;
  const stance =
    stats.style === "ranged" ? c.rangedStance
    : stats.style === "magic" ? c.magicStance
    : c.combatStyle;
  const stanceLabel = stats.style === "magic" && stance === "defensive" ? t("style.magicDefensive") : t(`style.${stance}`);
  const trainingId = activeStanceMods(stats.style, c).xpSkill;
  const trainingIcon = getSkillIcon(trainingId);
  return (
    // codex:2026-09-10T10:23:09+02:00 — Stable control target for the combat expander.
    <div className="sb-combat-subskills" id="sidebar-combat-skills">
      <button
        type="button"
        className="sb-combat-style"
        onClick={() => { openCombatDockTab("style"); onNavigate("combat"); }}
        title={t("sidebar.combatStyleHint")}
        aria-label={`${t("sidebar.combatStyle")}: ${stanceLabel}. ${t("sidebar.combatStyleHint")}`}
        data-guide-id="sidebar.combatStyle"
      >
        <span className="sb-combat-style-icon" aria-hidden="true">
          {trainingIcon ? <img loading="lazy" decoding="async" src={trainingIcon} alt="" /> : "⚔"}
        </span>
        <span className="sb-combat-style-text">
          <span className="sb-combat-style-label">{t("sidebar.combatStyle")}</span>
          <span className="sb-combat-style-value">{stanceLabel}</span>
        </span>
        <span className="sb-combat-style-chevron" aria-hidden="true">›</span>
      </button>
      {COMBAT_SKILL_IDS.map((id) => {
        const skill = content.skills[id];
        const xp = state.skills[id]?.xp ?? 0;
        const lvl = levelFromXp(xp);
        const boost = skillBoostFor(stats.skillBoosts, id);
        const icon = getSkillIcon(id);
        const xpThis = xpForLevel(lvl);
        const xpNext = xpForLevel(lvl + 1);
        const pct = xpNext > xpThis
          ? ((xp - xpThis) / (xpNext - xpThis)) * 100
          : 100;
        return (
          // codex:2026-09-10T10:23:09+02:00 — Compact rows retain translated names/levels
          // on focus/hover, including the existing equipment boost distinction.
          <div
            key={id}
            className={`sb-combat-row${id === trainingId ? " sb-combat-row--training" : ""}`}
            tabIndex={0}
            title={`${skill ? tr(skill.name) : id}: ${lvl}/99${boost > 0 ? ` (${lvl + boost})` : ""}${id === trainingId ? ` · ${t("sidebar.combatTraining")}` : ""}`}
            aria-label={`${skill ? tr(skill.name) : id}: ${lvl}/99${boost > 0 ? ` (${lvl + boost})` : ""}${id === trainingId ? `. ${t("sidebar.combatTraining")}` : ""}`}
          >
            <div className="sb-combat-icon-wrap">
              {icon
                ? <img loading="lazy" decoding="async" src={icon} alt="" className="sb-combat-icon-img" />
                : <span className="sb-combat-icon-fallback" aria-hidden="true">⚔</span>
              }
            </div>
            <span className="sb-combat-name">
              {skill ? tr(skill.name) : id}
            </span>
            <div className="sb-combat-bar" aria-hidden="true">
              <div
                className="sb-combat-bar-fill"
                style={{ transform: `scaleX(${Math.min(100, Math.max(0, pct)) / 100})` }}
              />
            </div>
            {/* Meisterweihe (design/master-capes-konzept.md §3): dezente Gold-Behandlung ab
                BASIS-Level 99 (nicht das evtl. geboostete Anzeige-Level — die Insignie markiert
                die echte Weihe, kein Itemization-Boost). */}
            <span className={`sb-combat-level${lvl >= 99 ? " sb-skill-mastered" : ""}`}>
              <SkillLevelText base={lvl} boost={boost} max={99} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * codex:2026-09-10T10:23:09+02:00 — Static play marker for the running activity; the label
 * comes from the caller and also appears in the parent button's accessible name. `focusable=false`
 * (Muster `zone-card-elite-badge`, CombatPage.tsx): sitzt bereits INNERHALB eines fokussierbaren
 * `<button>`, ein eigener Tab-Stopp wäre doppelt gemoppelt.
 */
function RunningPip({ label }: { label: string }): JSX.Element {
  return (
    <HoverTip as="span" focusable={false} className="sb-running-pip" content={<span className="ct-tip-desc">{label}</span>}>
      {/* codex:2026-09-10T10:23:09+02:00 — A static play shape distinguishes activity from
          the selected-page edge without a permanent glowing/pulsing decoration. */}
      <span aria-hidden="true">▶</span>
    </HoverTip>
  );
}

interface SidebarFooterProps {
  onNavigate: (id: string) => void;
  // codex:2026-09-10T10:23:09+02:00 — Match footer destinations to the current page.
  activePageId: string;
}

// codex:2026-09-10T10:23:09+02:00 — Current-page information is presentation only.
function SidebarFooter({ onNavigate, activePageId }: SidebarFooterProps): JSX.Element {
  const { saveGame, returnToMenu, saveTick } = useGameControl();
  const { t } = useI18n();
  // Wartende Einheiten im Postfach (Item-qty + Instanzen) — treibt den dezenten Zahlen-Badge am
  // Mail-Button, nur sichtbar wenn > 0 (s. `.sb-footer-badge`). Perf-Welle Block A: `mailItemCount`
  // ist bereits ein Primitive, direkt als `useGameSelector`-Rückgabewert — SidebarFooter re-rendert
  // also nur, wenn sich die Zahl tatsächlich ändert.
  const mailCount = useGameSelector((s) => mailItemCount(s));
  const [saved, setSaved] = useState(false);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  // codex:2026-09-10T10:23:09+02:00 — Only activating the tab toggles the system drawer;
  // hover/focus alone never exposes destructive actions.
  const [drawerPinned, setDrawerPinned] = useState(false);

  // Autosave-Vertrauens-Häkchen (Chef-GO): `saveTick` steigt sowohl beim periodischen Autosave
  // (GameContext-Intervall) als auch beim manuellen Klick unten (beide rufen denselben
  // `saveGame`-Callback) — hier nur diffen und kurz "Gespeichert ✓" einblenden. Erster Render
  // (Mount) darf NICHT feuern, sonst blitzt die Bestätigung schon beim Laden der Sidebar auf.
  const prevSaveTickRef = useRef(saveTick);
  useEffect(() => {
    if (saveTick === prevSaveTickRef.current) return;
    prevSaveTickRef.current = saveTick;
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1500);
    return () => window.clearTimeout(timer);
  }, [saveTick]);

  // Chef-GO Hotkeys: Escape schließt den Quit-Dialog wie "Abbrechen" (util/escStack.ts,
  // Priorität "modal") — derselbe Registry-Anschluss wie die anderen Modals (Death/PetCelebration/
  // Offline/PortraitPicker).
  useEffect(() => {
    if (!quitConfirmOpen) return;
    return registerEscCloser("modal", () => setQuitConfirmOpen(false));
  }, [quitConfirmOpen]);

  return (
    <div className={`sb-footer${drawerPinned ? " is-open" : ""}`}>
      {/* codex:2026-08-01T10:42:00+02:00 — Kompakte, lokalisierte Lasche statt dauerhaft fünf
          Höhenplätze zu belegen. Die vorhandenen Aktionen und Guide-IDs bleiben unverändert. */}
      <button
        type="button"
        className="sb-footer-drawer-tab"
        aria-expanded={drawerPinned}
        aria-controls="sidebar-system-actions"
        /* codex:2026-09-10T10:23:09+02:00 — The rail hides text, never its accessible name. */
        aria-label={t("sidebar.drawerMenu")}
        title={t("sidebar.drawerMenu")}
        onClick={() => setDrawerPinned((open) => !open)}
      >
        <span className="sb-footer-drawer-label">{t("sidebar.drawerMenu")}</span>
        <span className="sb-footer-drawer-chevron" aria-hidden="true">▴</span>
      </button>

      <div id="sidebar-system-actions" className="sb-footer-actions">
      {/* emblem_waxseal.svg (28×28 px, transparent, rot)
          Task #291: Label in einem eigenen Span (.sb-footer-label) — der Icon-Rail-Kollaps
          blendet nur den Text aus, title-Tooltip (bestehender String) übernimmt dann.
          Chef-GO Autosave-Häkchen: ".just-saved" spielt einen kurzen Fade-out der Label-Farbe/
          -Opazität ab (sidebar.css), synchron zum 1,5s-Fenster oben — sowohl beim manuellen Klick
          als auch beim periodischen Autosave (beide teilen sich `saveTick`, s. useEffect oben). */}
      {/* codex:2026-09-10T10:23:09+02:00 — All icon-only system actions retain their labels. */}
      <button className={`sb-footer-save${saved ? " just-saved" : ""}`} onClick={() => void saveGame()} title={saved ? t("sidebar.saved") : t("sidebar.save")} aria-label={saved ? t("sidebar.saved") : t("sidebar.save")}>
        <img loading="lazy" decoding="async" src={emblWaxseal} alt="" className="sb-footer-emblem-img" />
        <span className="sb-footer-label">{saved ? t("sidebar.saved") : t("sidebar.save")}</span>
      </button>
      {/* emblem_compass.svg (28×28 px, transparent, gold) */}
      {/* codex:2026-09-10T10:23:09+02:00 — Accessible label in the narrow rail. */}
      <button className="sb-footer-menu" onClick={() => void returnToMenu()} title={t("sidebar.mainMenu")} aria-label={t("sidebar.mainMenu")}>
        <img loading="lazy" decoding="async" src={emblCompass} alt="" className="sb-footer-emblem-img" />
        <span className="sb-footer-label">{t("sidebar.mainMenu")}</span>
      </button>
      {/* Postfach (SAVE_VERSION 71, WoW-artiger Überlauf-Puffer): Chef-Vorgabe — eigener
          Footer-Button ZWISCHEN Main Menu und Options (Save · Main Menu · Mail · Options · Quit).
          Seit 2026-08-03 echtes Icon aus Miras Micro-Set statt des ✉-Emoji-Fallbacks — gleiche
          28×28-Emblem-Box wie die Nachbarn. Der dezente Zahlen-Badge zeigt `mailItemCount` nur,
          wenn Post wartet (> 0) — wie ungelesene Post im Postfach. */}
      {/* codex:2026-09-10T10:23:09+02:00 — Keep selection/mail count available to assistive tech. */}
      <button className="sb-footer-mail" onClick={() => onNavigate("mail")} data-guide-id="sidebar.mail" title={t("nav.mail")} aria-label={`${t("nav.mail")}${mailCount > 0 ? ` (${mailCount})` : ""}`} aria-current={activePageId === "mail" ? "page" : undefined}>
        <img loading="lazy" decoding="async" src={iconSysMail} alt="" className="sb-footer-emblem-img" />
        <span className="sb-footer-label">{t("nav.mail")}</span>
        {mailCount > 0 && (
          <span className="sb-footer-badge">{mailCount > 99 ? "99+" : mailCount}</span>
        )}
      </button>
      {/* Chef-Wunsch: Options raus aus der Sidebar-Nav-Liste, stattdessen hier als eigener
          Footer-Button (Save · Main Menu · Mail · Options · Quit). Gleicher guideId wie zuvor der
          Sidebar-Nav-Eintrag ("sidebar.options") — der Onboarding-Guide-Schritt findet sein
          Ziel unverändert, ohne onboarding-steps.ts anzufassen. */}
      <button
        className="sb-footer-options"
        onClick={() => onNavigate("options")}
        data-guide-id="sidebar.options"
        title={t("nav.options")}
        /* codex:2026-09-10T10:23:09+02:00 — Accessible rail label and selected destination. */
        aria-label={t("nav.options")}
        aria-current={activePageId === "options" ? "page" : undefined}
      >
        <img loading="lazy" decoding="async" src={emblGear} alt="" className="sb-footer-emblem-img" />
        <span className="sb-footer-label">{t("nav.options")}</span>
      </button>
      {/* Chef-Wunsch: „Spiel verlassen" — beendet die App komplett (Electron-IPC via preload). */}
      {/* codex:2026-09-10T10:23:09+02:00 — Accessible label in the narrow rail. */}
      <button className="sb-footer-quit" onClick={() => setQuitConfirmOpen(true)} title={t("sidebar.quitGame")} aria-label={t("sidebar.quitGame")}>
        <img loading="lazy" decoding="async" src={emblSkull} alt="" className="sb-footer-emblem-img" />
        <span className="sb-footer-label">{t("sidebar.quitGame")}</span>
      </button>
      </div>

      {/* Bugfix (Spieler-Report 1.0.0, "quit game not working, popup unklickbar"): der Dialog lag
          bisher als DOM-Kind von `.sb-footer` — dieser Container trägt (seit dem Klick-Drawer-Umbau,
          codex 2026-08-01) `pointer-events: none` und gibt es nur an einzelne Kind-Selektoren
          (Lasche/offener Drawer) frei; `.modal-overlay`/`.modal` bekamen KEIN eigenes
          `pointer-events: auto` und erbten also `none` — der Dialog war sichtbar (eigener
          Stacking-Context via `isolation: isolate` malt ihn optisch oben), aber jeder Klick fiel
          durch auf den darunterliegenden Content (Playwright bestätigte das: "<img> from
          <main class=\"content\"> subtree intercepts pointer events"). Portal an document.body
          (gleiches Muster wie CitadelTip.tsx — "entkommt jedem overflow:hidden/pointer-events
          seines Panels") löst den Dialog komplett aus dem Footer-Baum heraus. */}
      {quitConfirmOpen && createPortal(
        <div
          className="modal-overlay"
          onClick={() => setQuitConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal quit-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quit-confirm-icon">
              <img loading="lazy" decoding="async" src={emblSkull} alt="" className="pixelart" />
            </div>
            <h2 className="quit-confirm-title">{t("sidebar.quitTitle")}</h2>
            <p className="quit-confirm-body">{t("sidebar.quitConfirm")}</p>
            <div className="quit-confirm-actions">
              <button
                className="shop-citadel-btn"
                onClick={() => setQuitConfirmOpen(false)}
              >
                {t("sidebar.quitCancel")}
              </button>
              <button
                className="btn-iron btn-iron--danger"
                onClick={() => {
                  // Bugfund aus dem Backup-Plan (#281): quit() ohne Speichern verlor bis zu
                  // AUTOSAVE-Intervall an Fortschritt. Erst speichern, DANN beenden — und auch
                  // beenden, falls das Speichern wirft (der Spieler will raus, nicht festhängen).
                  void (async () => {
                    try { await saveGame(); } catch { /* Quit hat Vorrang */ }
                    void window.hearthforge?.app?.quit();
                  })();
                }}
              >
                {t("sidebar.quitGame")}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
