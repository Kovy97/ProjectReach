import { useEffect, useMemo, useState } from "react";
import type { SaveSlot } from "@hearthforge/shared";
import { LOCALES } from "@hearthforge/shared";
import { useGameControl } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPortraitSrc } from "../portraits";
import { formatDate, formatPlaytime } from "../util/format";
import { AmbientEffectsPrefs, DisplayAudioPrefs, OptRow, OptSection, optBtnCls } from "../components/OptionControls";
import { BugReportDialog } from "../components/BugReportDialog";
// codex:2026-08-01T13:30:36+02:00 — Hauptmenü-Optionsglyphen teilen dieselben transparenten
// Systemassets wie die In-Game-Optionsseite.
import iconBug from "../assets/ui/system-icons/bug.svg";
import iconFont from "../assets/ui/system-icons/font.svg";
import { FontPreview } from "./FontPreview";
// War-Table-Rework (Chef-Auftrag 26.08.2026, Vorlage Mira "Main Menu 02 War Table"): die volle
// Kulisse ersetzt das frühere Hero-Panorama — Welt + physischer Kartentisch in einer Komposition.
import warTableBg from "../assets/ui/mainmenu_war_table.webp";
import menuLogo from "../assets/ui/mainmenu_logo.webp";
import emblCompass from "../assets/ui/emblem_compass.svg";
import emblWaxseal from "../assets/ui/emblem_waxseal.svg";
import emblGear from "../assets/ui/emblem_gear.svg";
import emblSkull from "../assets/ui/emblem_skull.svg";
import { ConfirmModal } from "../components/ConfirmModal";
import type { ConfirmRequest } from "../components/ConfirmModal";
// Chef-Kurswechsel 26.08.2026: FORTSETZEN/Laden geht jetzt durch die neue App-weite
// Schwarzblende (s. util/screenFade.ts-JSDoc) statt direkt `loadGame` aufzurufen.
import { runWithScreenFade } from "../util/screenFade";

type Panel = "new" | "load" | "options" | "credits";

/** Gleiche Embleme wie Sidebar/CharacterPage/DeathPopup — konsistente Bildsprache statt neuer
 *  Icons: Kompass = Aufbruch (Neues Spiel), Wachssiegel = archivierter Spielstand (Laden),
 *  Zahnrad = Optionen, Totenschädel = destruktiv (Beenden, wie schon bei .hf-btn--danger).
 *  „Credits" hat kein eigenes Emblem-Asset — MenuPanelTitle/MenuActionButton fallen dafür auf
 *  dieselbe dekorative Raute (▣) zurück, die Miras Mockup an derselben Stelle zeigt. */
const PANEL_ICON: Record<Panel, string | null> = {
  new: emblCompass,
  load: emblWaxseal,
  options: emblGear,
  credits: null,
};

/**
 * Hauptmenü — War-Table-Rework (Chef-Auftrag 26.08.2026, Vorlage: Miras HTML-Mockup „Main Menu 02
 * War Table"). Feste linke Befehlsspalte (fünf Knöpfe, IMMER sichtbar) + rechts EIN Rahmen fester
 * Größe/Position: standardmäßig das Spielstand-Dossier des zuletzt gespielten Slots samt CONTINUE-
 * Karte, per Klick auf einen Nav-Eintrag tauscht darin das jeweilige Panel (New/Load/Options/
 * Credits) — der Rahmen selbst bleibt stehen (kein Sprung), Inhalt scrollt intern.
 *
 * Chef-Nachtrag 26.08.2026: Mira liefert für Laden/Neues-Spiel/Charaktererstellung noch eigene
 * Mockups. Die INHALTE dieser beiden Panels (Slot-Karten, Löschen/Überschreiben — `SlotRow`) sind
 * daher bewusst UNVERÄNDERT übernommen, nur in den neuen Rahmen gehängt.
 *
 * `revealed` (Studio-Intro-Sequenz, pages/IntroSequence.tsx): steuert NUR die Sichtbarkeit von
 * Hero-Art/Logo/Sprachwahl/Nav+Panel/Fußzeile (CSS `.menu--intro-pending`, styles/intro.css) — die
 * Ambient-Funken (`<AmbientEmbers/>`) bleiben davon unberührt und steigen immer sofort auf, damit
 * sie schon VOR dem Rest sichtbar sind. Default `true` = exaktes Ist-Verhalten (jeder Aufrufer
 * außer der Intro-Sequenz selbst, inkl. jeder Rückkehr zum Menü innerhalb derselben Session).
 */
export function MainMenu({ revealed = true }: { revealed?: boolean } = {}): JSX.Element {
  const { slots, startNewGame, loadGame, deleteSlot } = useGameControl();
  const { t, locale, setLocale } = useI18n();
  const [showFonts, setShowFonts] = useState(false);
  // Kein Panel offen = das Spielstand-Dossier steht rechts (Chef-Vorgabe 26.08.: das ist jetzt der
  // STANDARD-Zustand, nicht mehr "nichts offen"). Ein Nav-Klick tauscht das Dossier gegen das Panel.
  const [panel, setPanel] = useState<Panel | null>(null);

  // Spieler-Report 1.0.0 ("Unable to overwrite character with new one"): Überschreiben/Löschen
  // hingen bisher an `window.confirm()` — einem NATIVEN OS-Dialog außerhalb des Spielfensters.
  // Das Spiel startet standardmäßig im echten Vollbild (main/index.ts, "Vollbild-Start als
  // Default"); ein natives JS-Dialog-Fenster über einem exklusiv-fullscreen Electron-Fenster ist
  // ein bekanntes Electron-Stolperfeld (Fokus-/Reihenfolge-Probleme, Bugfund #281 hatte bereits
  // einen strukturell verwandten Fall bei „Spiel verlassen" — dort ebenfalls durch ein In-Page-
  // Modal ersetzt, s. Sidebar.tsx quit-confirm-modal). Gleiches Rezept hier: ein eigenes,
  // themenkonsistentes Bestätigungs-Modal (reuses `.quit-confirm-modal`-Optik) statt des nativen
  // Dialogs — funktioniert garantiert innerhalb des Spielfensters, unabhängig von Fenstermodus/OS.
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(null);

  const askDelete = (slot: SaveSlot): void => {
    setPendingConfirm({
      title: t("menu.delete"),
      body: t("menu.deleteConfirm").replace("{name}", slot.summary?.name ?? ""),
      confirmLabel: t("menu.delete"),
      danger: true,
      onConfirm: () => void deleteSlot(slot.id),
    });
  };

  const askOverwrite = (slot: SaveSlot): void => {
    setPendingConfirm({
      title: t("menu.overwrite"),
      body: t("menu.overwriteConfirm").replace("{name}", slot.summary?.name ?? ""),
      confirmLabel: t("menu.overwrite"),
      danger: true,
      onConfirm: () => startNewGame(slot.id),
    });
  };

  // codex:2026-07-31T23:42:00+02:00 — War-Table-Navigation: Ein aktiver Ledger-Eintrag lässt
  // sich erneut anklicken und klappt dadurch genauso kontrolliert zu wie über das Schließen-X
  // (zurück zum Dossier).
  const togglePanel = (next: Panel): void => {
    setPanel((current) => (current === next ? null : next));
  };

  // codex:2026-07-31T23:58:00+02:00 — Unterseiten sind echte Menüfenster. Escape entspricht
  // ihrem sichtbaren Zurück-Knopf und führt immer auf das Dossier zurück.
  // Bugfix 1.0.1: liegt zusätzlich das neue Bestätigungs-Modal offen, schließt EIN Escape-Druck
  // erst DAS (oberste Ebene zuerst) — genau ein Overlay pro Druck, wie überall sonst im Spiel.
  useEffect(() => {
    if (panel === null && pendingConfirm === null) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (pendingConfirm !== null) {
        setPendingConfirm(null);
        return;
      }
      setPanel(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel, pendingConfirm]);

  if (showFonts) return <FontPreview onClose={() => setShowFonts(false)} />;

  const filled = slots.filter((s) => s.summary);
  // Chef-Vorgabe 26.08.: das Dossier zeigt den ZULETZT gespielten Spielstand (nicht zwingend
  // Slot 0) — "savedAt" ist dafür der verlässliche Zeitstempel jedes Speicherns.
  const selectedSave =
    filled.length > 0
      ? filled.reduce((newest, s) => ((s.summary?.savedAt ?? 0) > (newest.summary?.savedAt ?? 0) ? s : newest))
      : null;

  return (
    <div className={`menu menu--war-table${panel !== null ? ` menu--panel-${panel}` : ""}${revealed ? "" : " menu--intro-pending"}`}>
      {/* Hero-Artwork als eigene Ebene (statt Inline-Background direkt auf .menu) — so kann sie
          unabhängig von Vignette/FX/Content unabhängig behandelt werden. */}
      <div className="menu-bg" style={{ backgroundImage: `url("${warTableBg}")` }} />
      <AmbientEmbers />

      {/* Spiel-Logo — oben mittig, GLEICHE Position/Größe in jedem Zustand (Dossier oder Panel
          offen): das war der Kern des alten Sprung-Problems (Logo schrumpfte + wanderte beim
          Öffnen eines Panels). Jetzt konstant. */}
      <img className="menu-logo" src={menuLogo} alt="Grim Reach" />

      {/* Sprach-Buttons — dezent oben rechts (Schnellzugriff; volle Optionen im Options-Panel) */}
      <div className="menu-lang">
        {LOCALES.map((l) => (
          <button
            key={l}
            className={optBtnCls(l === locale)}
            onClick={() => setLocale(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* War-Table-Layout: links die feste Befehlsspalte, rechts EIN Rahmen fester Größe/Position
          (`.menu-stage`), der entweder das Dossier oder das gewählte Panel trägt — nie beides,
          nie eine andere Größe. */}
      <div className="menu-main">
        <nav className="menu-nav" aria-label={t("common.topNav")}>
          <MenuActionButton icon={emblCompass} active={panel === "new"} onClick={() => togglePanel("new")}>
            {t("menu.new")}
          </MenuActionButton>
          <MenuActionButton icon={emblWaxseal} active={panel === "load"} onClick={() => togglePanel("load")}>
            {t("menu.loadGame")}
          </MenuActionButton>
          <MenuActionButton icon={emblGear} active={panel === "options"} onClick={() => togglePanel("options")}>
            {t("options.title")}
          </MenuActionButton>
          <MenuActionButton glyph="▣" active={panel === "credits"} onClick={() => togglePanel("credits")}>
            {t("menu.credits")}
          </MenuActionButton>
          <MenuActionButton icon={emblSkull} variant="danger" onClick={() => void window.hearthforge?.app?.quit()}>
            {t("sidebar.quitGame")}
          </MenuActionButton>
        </nav>

        <div className="menu-stage">
          {panel === null ? (
            <SaveDossier
              slot={selectedSave}
              onContinue={() => selectedSave && void runWithScreenFade(() => loadGame(selectedSave.id))}
              onStartNew={() => togglePanel("new")}
            />
          ) : (
            // `key={panel}` erzwingt bei jedem Panel-Wechsel ein Remount, wodurch die CSS-Reveal-
            // Animation (menu-panel-reveal) jedes Mal neu abspielt.
            <div className="menu-panel" key={panel}>
              {panel === "load" && (
                <>
                  <MenuPanelTitle icon={PANEL_ICON.load} onClose={() => setPanel(null)}>
                    {t("menu.loadGame")}
                  </MenuPanelTitle>
                  {filled.length === 0 ? (
                    <div className="menu-empty-note">{t("menu.noSaves")}</div>
                  ) : (
                    <div className="menu-slots">
                      {filled.map((slot) => (
                        <SlotRow
                          key={slot.id}
                          slot={slot}
                          mode="load"
                          onNew={() => startNewGame(slot.id)}
                          onLoad={() => void runWithScreenFade(() => loadGame(slot.id))}
                          onDelete={() => askDelete(slot)}
                          onOverwrite={() => startNewGame(slot.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {panel === "new" && (
                <>
                  <MenuPanelTitle icon={PANEL_ICON.new} onClose={() => setPanel(null)}>
                    {t("menu.new")}
                  </MenuPanelTitle>
                  <div className="menu-slots">
                    {slots.map((slot) => (
                      <SlotRow
                        key={slot.id}
                        slot={slot}
                        mode="new"
                        onNew={() => startNewGame(slot.id)}
                        onLoad={() => void runWithScreenFade(() => loadGame(slot.id))}
                        onDelete={() => askDelete(slot)}
                        onOverwrite={() => askOverwrite(slot)}
                      />
                    ))}
                  </div>
                </>
              )}

              {panel === "options" && (
                <>
                  <MenuPanelTitle icon={PANEL_ICON.options} onClose={() => setPanel(null)}>
                    {t("options.title")}
                  </MenuPanelTitle>
                  <MenuOptionsPanel onOpenFonts={() => setShowFonts(true)} />
                </>
              )}

              {panel === "credits" && (
                <>
                  <MenuPanelTitle icon={PANEL_ICON.credits} onClose={() => setPanel(null)}>
                    {t("menu.credits")}
                  </MenuPanelTitle>
                  <MenuCreditsPanel />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dezente Fußzeile — Version + Studio, kein Blickfang. Nutzt die bereits vorhandenen
          about.*-Keys (Options-Seite) statt neuer Strings. */}
      <div className="menu-footer">
        {t("about.version").replace("{version}", __APP_VERSION__)} · {t("about.copyright")}
      </div>

      {/* Bugfix 1.0.1 ("Unable to overwrite character with new one"): In-Page-Bestaetigung statt
          `window.confirm()` — s. Doku am `pendingConfirm`-State oben. Seit der Shop-Runde teilen
          sich alle Spiel-Bestaetigungen dieselbe Komponente (`ConfirmModal`), die sich per Portal
          an den Body haengt und damit von keinem Panel mehr geschluckt werden kann. */}
      <ConfirmModal request={pendingConfirm} onClose={() => setPendingConfirm(null)} />
    </div>
  );
}

/**
 * Relative Zuletzt-gespielt-Angabe fürs Dossier ("Today"/"Yesterday"/"N days ago"), fällt für
 * älteres auf das volle Datum zurück (`formatDate`, folgt bereits der Spielsprache). Kalendertag-
 * Vergleich statt reiner 24h-Differenz, damit "Gestern" auch kurz nach Mitternacht stimmt; ein
 * (theoretisch) in der Zukunft liegender Zeitstempel fällt defensiv auf "Today" statt auf eine
 * negative Tageszahl.
 */
function formatLastPlayed(savedAt: number, t: (key: string) => string): string {
  const startOfDay = (ms: number): number => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const dayDiff = Math.round((startOfDay(Date.now()) - startOfDay(savedAt)) / 86_400_000);
  if (dayDiff <= 0) return t("menu.today");
  if (dayDiff === 1) return t("menu.yesterday");
  if (dayDiff < 7) return t("menu.daysAgo").replace("{n}", String(dayDiff));
  return formatDate(savedAt);
}

interface SaveDossierProps {
  slot: SaveSlot | null;
  onContinue: () => void;
  onStartNew: () => void;
}

/**
 * Rechter Standard-Inhalt des Rahmens: das Dossier des zuletzt gespielten Spielstands (Porträt,
 * Name, Gesamtlevel/Zuletzt gespielt/Spielzeit, CONTINUE-Karte) — 1:1 Miras `.save-dossier`-
 * Rezept, jetzt mit echten Daten statt Platzhaltertext. Ohne Spielstand zeigt es ein leeres
 * Porträt-Feld und einen Hinweis; die CONTINUE-Karte wird dann zur NEW-GAME-Karte.
 */
function SaveDossier({ slot, onContinue, onStartNew }: SaveDossierProps): JSX.Element {
  const { t } = useI18n();

  if (!slot?.summary) {
    return (
      <section className="save-dossier save-dossier--empty">
        <div className="save-portrait save-portrait--empty">
          <div className="menu-slot-empty-mark" aria-hidden="true">✦</div>
        </div>
        <div className="save-copy">
          <p className="eyebrow">{t("menu.selectedSave")}</p>
          <p className="save-empty-note">{t("menu.noSaveYet")}</p>
          <button type="button" className="btn-iron continue-card" onClick={onStartNew}>
            <strong>{t("menu.new")}</strong>
            <span>
              <i>{t("menu.noSaveYetHint")}</i>
            </span>
          </button>
        </div>
      </section>
    );
  }

  const { summary } = slot;
  const portraitSrc = getPortraitSrc(summary.portraitId ?? null);

  return (
    <section className="save-dossier">
      <div className="save-portrait">
        {portraitSrc ? <img src={portraitSrc} alt="" /> : <div className="menu-slot-portrait-blank" />}
      </div>
      <div className="save-copy">
        <p className="eyebrow">{t("menu.selectedSave")}</p>
        <h1>{summary.name}</h1>
        <dl>
          <div>
            <dt>{t("menu.totalLevel")}</dt>
            <dd>{summary.totalLevel}</dd>
          </div>
          <div>
            <dt>{t("menu.lastPlayed")}</dt>
            <dd>{formatLastPlayed(summary.savedAt, t)}</dd>
          </div>
          <div>
            <dt>{t("menu.playtime")}</dt>
            <dd>{formatPlaytime(summary.activePlayMs ?? summary.elapsedMs)}</dd>
          </div>
        </dl>
        <button type="button" className="btn-iron continue-card" onClick={onContinue}>
          <strong>{t("menu.continue")}</strong>
          <span>
            {/* Aktuelle Zone/Aktion ist (noch) kein Summary-Feld (nur der leichtgewichtige
                SaveSummary steht dem Menü ohne vollen State zur Verfügung) — statt sie zu
                erfinden, ein ehrlicher Flavor-Satz + die echte Slot-Nummer. */}
            <i>{t("menu.continueHint")}</i>
            <i>{t("menu.slotN").replace("{n}", String(slot.id + 1))}</i>
          </span>
        </button>
      </div>
    </section>
  );
}

/** Minimaler Credits-Bildschirm — reused bewusst dieselben about.*-Texte wie die In-Game-
 *  Optionsseite (kein Duplikat-Content), ohne deren interaktive Discord-/Bug-Report-Knöpfe (Bug-
 *  Report bleibt im Options-Panel erreichbar). */
function MenuCreditsPanel(): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="menu-credits">
      <p className="menu-credits-version">{t("about.version").replace("{version}", __APP_VERSION__)}</p>
      <p>{t("about.credits")}</p>
      <p>{t("about.buildNote")}</p>
      <p className="menu-credits-copyright">{t("about.copyright")}</p>
    </div>
  );
}

interface MenuPanelTitleProps {
  icon: string | null;
  onClose: () => void;
  children: React.ReactNode;
}

// codex:2026-07-31T23:42:00+02:00 — Gemeinsamer Ledger-Kopf für New Game, Load Game, Options und
// Credits; alle vier Fenster besitzen dadurch dieselbe Hierarchie und dieselbe eindeutige
// Rücknavigation. `icon: null` (Credits, kein eigenes Emblem-Asset) fällt auf dieselbe Raute
// zurück, die der Credits-Nav-Knopf zeigt.
function MenuPanelTitle({ icon, onClose, children }: MenuPanelTitleProps): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="menu-panel-title">
      {icon ? (
        <img className="menu-panel-title-icon" src={icon} alt="" />
      ) : (
        <span className="menu-panel-title-icon menu-panel-title-glyph" aria-hidden="true">▣</span>
      )}
      <span className="menu-panel-title-text">{children}</span>
      <button type="button" className={`${optBtnCls(false)} menu-panel-back`} onClick={onClose} aria-label={t("creation.back")}>
        {t("creation.back")}
      </button>
    </div>
  );
}

/** Rein dekorative Glut-Partikel + Nebelschwaden (self-contained CSS-Animation, kein Asset).
 *  Deterministisch „zufällig" per Sinus-Hash statt Math.random(), damit die Parameter über
 *  Re-Renders stabil bleiben (useMemo greift ohnehin nur einmal, da das Hauptmenü außerhalb
 *  eines laufenden Spiels nicht pro Tick neu rendert). */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// codex:2026-07-31T00:32:37+02:00 — Zehn Funken erhalten die Atmosphäre, halbieren aber
// nahezu die Zahl der dauerhaft animierten DOM-Layer im besonders großen Hauptmenü.
const EMBER_COUNT = 10;

function AmbientEmbers(): JSX.Element {
  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => {
        const dur = 11 + seeded(i * 3.1 + 1) * 9; // 11–20s Aufstiegsdauer
        // Perf-Welle (2026-07-22): statt eines individuellen `--sway`-Custom-Properties (zwang
        // Chromium, das transform jeden Frame neu über Style-Resolution aufzulösen statt rein auf
        // dem Compositor-Thread zu laufen) wird jedem Partikel deterministisch einer von 6 festen
        // Sway-Buckets zugewiesen (menu.css `.menu-ember--sway-0` … `-5`, je eine eigene @keyframes
        // ohne var()). Bandbreite bleibt gleich (±35px), nur auf 6 Stufen gerastert statt stufenlos.
        const swayBucket = Math.floor(seeded(i * 5.3 + 1) * 6) % 6;
        return {
          left: seeded(i * 1.7 + 1) * 100,
          size: 3 + seeded(i * 2.3 + 1) * 5,
          dur,
          // Negativer Delay startet die Animation „schon in Bewegung" — ohne Aufwärm-Moment,
          // in dem alle Partikel gleichzeitig unten am Bildschirmrand starten.
          delay: -seeded(i * 4.7 + 1) * dur,
          swayBucket,
        };
      }),
    [],
  );

  return (
    <div className="menu-fx" aria-hidden="true">
      {embers.map((e, i) => (
        <span
          key={i}
          className={`menu-ember menu-ember--sway-${e.swayBucket}`}
          style={{
            left: `${e.left}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            animationDuration: `${e.dur}s`,
            animationDelay: `${e.delay}s`,
          }}
        />
      ))}
      <div className="menu-fog menu-fog--1" />
      <div className="menu-fog menu-fog--2" />
    </div>
  );
}

interface SlotRowProps {
  slot: SaveSlot;
  /** „load" → belegte Slots mit Laden/Löschen; „new" → belegte Slots mit „Überschreiben", leere mit „Neu". */
  mode: "load" | "new";
  onNew: () => void;
  onLoad: () => void;
  onDelete: () => void;
  onOverwrite: () => void;
}

/**
 * Charakter-Karte im MMO-Auswahl-Stil (Chef 2026-07-11, „man sieht den Charakter kaum"):
 * hochformatige Karte, das Porträt füllt sie randlos bis zum Holzrahmen, der Name liegt als
 * Gradient-Plakette ÜBER dem Bild — der Charakter ist der Held der Karte, nicht ein 44px-Daumen.
 * Laden per Klick auf die ganze Karte (Buttons bleiben für Löschen/Überschreiben explizit).
 *
 * Chef-Nachtrag 26.08.2026 (War-Table-Rework): UNVERÄNDERT — Mira liefert für Laden/Neues-Spiel
 * noch ein eigenes Mockup; diese Karte hängt bis dahin nur in einem neuen Rahmen.
 */
function SlotRow({ slot, mode, onNew, onLoad, onDelete, onOverwrite }: SlotRowProps): JSX.Element {
  const { t } = useI18n();
  const portraitSrc = slot.summary ? getPortraitSrc(slot.summary.portraitId ?? null) : null;

  if (slot.summary) {
    const cardClick = mode === "load" ? onLoad : undefined;
    return (
      <div
        className={`menu-slot filled${cardClick ? " clickable" : ""}`}
        onClick={cardClick}
        role={cardClick ? "button" : undefined}
        tabIndex={cardClick ? 0 : undefined}
        onKeyDown={cardClick ? (e) => { if (e.key === "Enter") cardClick(); } : undefined}
      >
        <div className="menu-slot-portrait">
          {portraitSrc ? <img src={portraitSrc} alt="" /> : <div className="menu-slot-portrait-blank" />}
          <div className="menu-slot-index">{slot.id + 1}</div>
          <div className="menu-slot-nameplate">
            <div className="menu-slot-name">{slot.summary.name}</div>
            <div className="menu-slot-meta">
              {t("menu.totalLevel")} {slot.summary.totalLevel}
            </div>
          </div>
        </div>
        <div className="menu-slot-info">
          <div className="menu-slot-meta">
            {formatPlaytime(slot.summary.activePlayMs ?? slot.summary.elapsedMs)} {t("menu.played")}
          </div>
          {/* 1.0.1: Die Zeile darf umbrechen (vorher schnitt sie die Uhrzeit ab, auf Englisch
              sogar das „M" von „PM"), aber Datum und Uhrzeit sollen als Einheit zusammenbleiben —
              sonst steht das „PM" allein in der zweiten Zeile. Geschütztes Leerzeichen statt
              eines starren `nowrap`, das wieder abschneiden würde. */}
          <div className="menu-slot-sub">
            {t("menu.last")} {formatDate(slot.summary.savedAt).replace(/[\s  ]+(AM|PM)$/i, " $1")}
          </div>
        </div>
        <div className="menu-slot-actions" onClick={(e) => e.stopPropagation()}>
          {mode === "load" ? (
            <>
              <HfButton variant="primary" onClick={onLoad}>
                {t("menu.load")}
              </HfButton>
              <HfButton variant="danger" onClick={onDelete}>
                {t("menu.delete")}
              </HfButton>
            </>
          ) : (
            <HfButton variant="danger" onClick={onOverwrite}>
              {t("menu.overwrite")}
            </HfButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="menu-slot menu-slot--empty">
      <div className="menu-slot-portrait">
        <div className="menu-slot-empty-mark" aria-hidden="true">✦</div>
        <div className="menu-slot-index">{slot.id + 1}</div>
      </div>
      <div className="menu-slot-info">
        <div className="menu-slot-meta muted">{t("menu.empty")}</div>
      </div>
      <div className="menu-slot-actions">
        <HfButton variant="primary" onClick={onNew}>
          {t("menu.new")}
        </HfButton>
      </div>
    </div>
  );
}

/** Kompaktes Options-Panel fürs Hauptmenü — nur die client-seitigen Anzeige-Prefs (kein Spielstand
 *  nötig): UI-Skalierung, Sound, Musik, Tooltip-Bild-Popup, Schrift. */
function MenuOptionsPanel({ onOpenFonts }: { onOpenFonts: () => void }): JSX.Element {
  const { t } = useI18n();
  // Report-Bug-Feature (Chef-Auftrag 2026-07-18): eigene, lokale Dialog-Instanz — das Hauptmenü hat
  // keinen aktiven Spielstand, `BugReportDialog` liest das selbst (useGameStateMaybe) und lässt den
  // Spielstand-Teil des Auto-Blocks einfach weg.
  const [showBugReport, setShowBugReport] = useState(false);
  // Dieselben fundamentalen Regler wie im Spiel (Vollbild/Fenster, Ton + Lautstärke, Musik,
  // Kampf-Effekte, Tooltip …) — geteilte Komponente, damit Hauptmenü und In-Game-Optionen nie
  // auseinanderlaufen (Chef 2026-07-13). Spielstand-gebundene Optionen (Auto-Bank, Tutorial neu
  // starten, Speicherdaten-Export/Import) bleiben bewusst der In-Game-Seite vorbehalten.
  return (
    <div className="menu-options">
      {/* Report-Bug-Feature (Chef-Auftrag 2026-07-18, "ganz oben"): dasselbe Muster wie die
          In-Game-OptionsPage — eigener Banner vor allen übrigen Reglern. */}
      <button type="button" className="bugreport-entry-banner" onClick={() => setShowBugReport(true)}>
        <span className="bugreport-entry-icon" aria-hidden="true"><img src={iconBug} alt="" className="opz-system-icon" /></span>
        <span className="bugreport-entry-text">
          <span className="bugreport-entry-title">{t("about.bugReport")}</span>
          <span className="bugreport-entry-hint">{t("bugReport.entryHint")}</span>
        </span>
        {/* Chef-Befund 25.08.2026: kein goldener Pergament-Chip mehr — derselbe Eisenrahmen wie
            jeder andere Standard-Knopf (design-system.css `.btn-iron`). */}
        <span className="btn-iron bugreport-entry-cta" aria-hidden="true">{t("bugReport.entryCta")}</span>
      </button>
      {showBugReport && (
        <BugReportDialog onClose={() => setShowBugReport(false)} screenLabel={t("bugReport.screen.mainMenu")} />
      )}
      <DisplayAudioPrefs />
      {/* Ambient-Cockpit (Task #311): funktioniert schon hier vor Spielstart — reine localStorage-
          Vorlieben wie DisplayAudioPrefs, s. dortige Doku. */}
      <AmbientEffectsPrefs />
      {/* Schrift-Vorschau: Hauptmenü-exklusiv (die In-Game-Seite hat keinen Font-Umschalter). */}
      <OptSection icon={<img src={iconFont} alt="" className="opz-system-icon" />} title={t("menu.fontBtn")}>
        <OptRow label={t("menu.fontBtn")}>
          <button className={optBtnCls(false)} onClick={onOpenFonts}>
            <img src={iconFont} alt="" className="opz-inline-icon" /> {t("menu.fontBtn")}
          </button>
        </OptRow>
      </OptSection>
    </div>
  );
}

interface MenuActionButtonProps {
  /** Emblem-SVG-Pfad — fehlt es (Credits), zeigt der Knopf stattdessen `glyph`. */
  icon?: string | null;
  glyph?: string;
  active?: boolean;
  variant?: "danger";
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Einer der fünf festen Befehlsknöpfe links — Chef-Entscheid 26.08.2026 Runde 2: "Frame bitte
 * unseren Standard-Button-Frame, den Eisen-Frame, hernehmen." Trägt jetzt `.btn-iron` (dieselbe
 * Klasse wie jeder andere Standard-Knopf im Spiel); `.menu-nav-btn` liefert nur noch die
 * größenbezogenen Overrides (größer, linksbündig, volle Spaltenbreite — s. menu.css). Danger
 * (QUIT) und der aktive Zustand (offenes Panel) nutzen dieselben geteilten Modifier wie überall
 * sonst (`.btn-iron--danger`, `.btn-iron.is-active`) — ersetzt Miras eigenständiges
 * Gravewood-„menu-action"-Rezept vollständig.
 */
function MenuActionButton({ icon, glyph, active, variant, onClick, children }: MenuActionButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={`btn-iron menu-nav-btn${variant ? ` btn-iron--${variant}` : ""}${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      {icon ? (
        <img className="menu-action-icon" src={icon} alt="" />
      ) : (
        <span className="menu-action-icon menu-action-glyph" aria-hidden="true">{glyph}</span>
      )}
      <span className="menu-action-label">{children}</span>
    </button>
  );
}

interface HfButtonProps {
  variant: "primary" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}

function HfButton({ variant, onClick, children }: HfButtonProps): JSX.Element {
  return (
    <button className={`hf-btn hf-btn--${variant}`} onClick={onClick}>
      <span className="hf-btn__face">{children}</span>
    </button>
  );
}
