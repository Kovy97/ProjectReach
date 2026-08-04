import { useEffect, useRef, useState } from "react";
import { LOCALES } from "@hearthforge/shared";
import { restartGuide } from "@hearthforge/engine";
import { useI18n } from "../i18n";
import { useGameControl, useGameState } from "../game/GameContext";
import { openBackupsFolder } from "../saves";
import { AmbientEffectsPrefs, DisplayAudioPrefs, OptRow, OptSection } from "../components/OptionControls";
import { BugReportDialog } from "../components/BugReportDialog";
// codex:2026-08-01T13:30:36+02:00 — Options-Kategorien verwenden die skalierbare Ashen-Iron-
// Iconfamilie; keine plattformabhängigen Emoji-Platzhalter mehr in dieser Seite.
import iconBug from "../assets/ui/system-icons/bug.svg";
import iconGameplay from "../assets/ui/system-icons/gameplay.svg";
import iconGear from "../assets/ui/system-icons/gear.svg";
import iconInfo from "../assets/ui/system-icons/info.svg";
import iconKeyboard from "../assets/ui/system-icons/keyboard.svg";
import iconLanguage from "../assets/ui/system-icons/language.svg";
import iconSave from "../assets/ui/system-icons/save.svg";
// Mira-Set 2026-08-03 (Gap-Sweep Priorität A) — löst die letzten direkten Unicode-Glyphen dieser
// Seite ab (Checkbox-Zustand + Ordner-Button). Direkter Modul-Import wie die anderen System-Icons
// oben, statt getUiIcon-Auto-Discovery — folgt dem Bestandsmuster dieser Datei.
import iconCheckboxOn from "../assets/icons/icon_sys_checkbox_on.webp";
import iconCheckboxOff from "../assets/icons/icon_sys_checkbox_off.webp";
import iconFolder from "../assets/icons/icon_sys_folder.webp";
import "../styles/options.css";

// 7-Sprachen-Fundament (Task #252, Chef-Vorgabe): Eigennamen je Sprache, nicht übersetzt.
const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  zh: "简体中文",
  ru: "Русский",
  es: "Español",
  "pt-BR": "Português (BR)",
  fr: "Français",
};

type ImportStatus = "idle" | "ok" | "error";

/** Ein Tasten-Badge für die Steuerungs-Übersicht (z.B. "Esc", "1", "◂"). */
function KeyBadge({ children }: { children: React.ReactNode }): JSX.Element {
  return <span className="opz-key">{children}</span>;
}

export function OptionsPage(): JSX.Element {
  const { t, locale, setLocale } = useI18n();
  const { exportSave, importSave } = useGameControl();
  const state = useGameState();
  const [importText, setImportText] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  // Report-Bug-Feature (Chef-Auftrag 2026-07-18, "ganz oben"-Button + wiederbelebter About-Button
  // teilen sich diese eine Dialog-Instanz — beide öffnen denselben Dialog).
  const [showBugReport, setShowBugReport] = useState(false);

  const download = (): void => {
    const json = exportSave();
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grim-reach-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = (): void => {
    const json = exportSave();
    if (json) void navigator.clipboard.writeText(json);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const doImport = async (): Promise<void> => {
    const ok = await importSave(importText.trim());
    setStatus(ok ? "ok" : "error");
    if (ok) setImportText("");
  };

  return (
    <div className="opz-page">
      <header className="opz-header">
        <span className="opz-header-icon" aria-hidden="true"><img src={iconGear} alt="" className="opz-system-icon" /></span>
        <div className="opz-header-text">
          <h2>{t("options.title")}</h2>
          <p>{t("options.subtitle")}</p>
        </div>
      </header>

      {/* Report-Bug-Feature (Chef-Auftrag 2026-07-18, wörtlich "ganz oben"): prominenter, eigener
          Banner-Button vor der Grid — kein OptSection-Eintrag unter anderen, damit er als klar
          erster Eintrag der Seite liest. */}
      <button type="button" className="bugreport-entry-banner" onClick={() => setShowBugReport(true)}>
        <span className="bugreport-entry-icon" aria-hidden="true"><img src={iconBug} alt="" className="opz-system-icon" /></span>
        <span className="bugreport-entry-text">
          <span className="bugreport-entry-title">{t("about.bugReport")}</span>
          <span className="bugreport-entry-hint">{t("bugReport.entryHint")}</span>
        </span>
      </button>

      <div className="opz-grid">
        {/* Anzeige + Audio: geteilt mit dem Hauptmenü-Panel (components/OptionControls). */}
        <DisplayAudioPrefs />

        {/* ─── Spiel & Tutorial ─── */}
        <OptSection icon={<img src={iconGameplay} alt="" className="opz-system-icon" />} title={t("options.gameplay")}>
          <OptRow label={t("options.autoBank")} hint={t("options.autoBankHint")}>
            <button
              className={state.settings.autoBank ? "combat-btn active" : "combat-btn"}
              onClick={() => { state.settings.autoBank = !state.settings.autoBank; }}
            >
              <img
                src={state.settings.autoBank ? iconCheckboxOn : iconCheckboxOff}
                alt=""
                className="ui-icon"
              />{" "}
              {state.settings.autoBank ? t("options.on") : t("options.off")}
            </button>
          </OptRow>
          <OptRow label={t("options.help")}>
            {/* Startet den Spotlight-Guide (OnboardingGuide.tsx) komplett neu von Schritt 0 —
                löst den alten, event-basierten reopenOnboarding()-Aufruf ab (das 21-Schritt-Modal
                wird nicht mehr gerendert, siehe App.tsx). */}
            <button className="combat-btn" onClick={() => restartGuide(state)}>
              {t("options.showTutorial")}
            </button>
          </OptRow>
        </OptSection>

        {/* ─── Sprache ─── */}
        <OptSection icon={<img src={iconLanguage} alt="" className="opz-system-icon" />} title={t("options.language")}>
          <div className="opz-lang-grid">
            {LOCALES.map((l) => (
              <button
                key={l}
                className={l === locale ? "combat-btn active" : "combat-btn"}
                onClick={() => setLocale(l)}
              >
                {LOCALE_NAMES[l] ?? l.toUpperCase()}
              </button>
            ))}
          </div>
        </OptSection>

        {/* ─── Ambiente & Effekte (Task #311, Chef-GO "Effekt-Cockpit") ─── */}
        <AmbientEffectsPrefs />

        {/* ─── Steuerung (Chef-GO Hotkeys, 2026-07-09) ───
            Rein informativ, keine Rebind-Option (Chef-Vorgabe: unsichtbar für Casuals, Auffindbar-
            keit für Power-User) — `wide`, damit sie sich nahtlos neben Save-Data/About einreiht,
            statt eine einzelne Grid-Zelle in der Display/Audio/Gameplay/Language-Reihe frei zu lassen. */}
        <OptSection icon={<img src={iconKeyboard} alt="" className="opz-system-icon" />} title={t("options.hotkeys.title")} wide>
          <p className="opz-hint">{t("options.hotkeys.hint")}</p>
          <OptRow label={t("options.hotkeys.escLabel")}>
            <span className="opz-keys"><KeyBadge>Esc</KeyBadge></span>
          </OptRow>
          <OptRow label={t("options.hotkeys.digitsLabel")}>
            <span className="opz-keys">
              <KeyBadge>1</KeyBadge>
              <span className="opz-key-dash">–</span>
              <KeyBadge>9</KeyBadge>
            </span>
          </OptRow>
          <OptRow label={t("options.hotkeys.shopTabLabel")}>
            <span className="opz-keys">
              <KeyBadge>◂</KeyBadge>
              <KeyBadge>▸</KeyBadge>
              <span className="opz-key-or">{t("options.hotkeys.or")}</span>
              <KeyBadge>Q</KeyBadge>
              <KeyBadge>E</KeyBadge>
            </span>
          </OptRow>
          <OptRow label={t("options.hotkeys.fullscreenLabel")}>
            <span className="opz-keys"><KeyBadge>F11</KeyBadge></span>
          </OptRow>
        </OptSection>

        {/* ─── Spielstand-Daten ─── */}
        <OptSection icon={<img src={iconSave} alt="" className="opz-system-icon" />} title={t("options.saveData")} wide>
          <p className="opz-hint">{t("options.saveHint")}</p>
          <div className="opz-segment" style={{ justifyContent: "flex-start" }}>
            <button className="combat-btn" onClick={download}>
              {t("options.exportDownload")}
            </button>
            <button className="combat-btn" onClick={copy}>
              {t("options.exportCopy")}
            </button>
            <button className="combat-btn" onClick={() => fileRef.current?.click()}>
              {t("options.importFile")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={onFile}
            />
          </div>
          <textarea
            className="opz-textarea"
            placeholder={t("options.importPlaceholder")}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setStatus("idle");
            }}
          />
          <div className="opz-import-row">
            {/* Rote Aktion (wie die Quit-Bestätigung, Sidebar.tsx): überschreibt den aktuellen
                Spielstand unwiderruflich — die einzige "primäre" (destruktive) Aktion dieser Seite. */}
            <button className="combat-btn flee" disabled={!importText.trim()} onClick={() => void doImport()}>
              {t("options.importApply")}
            </button>
            {status === "ok" && <span className="opz-status-ok">✓ {t("options.importOk")}</span>}
            {status === "error" && <span className="opz-status-error">✕ {t("options.importError")}</span>}
          </div>
          {/* Task #288 E: lokale Auto-Backups (rolling/daily/pre-delete/…) liegen in
              %APPDATA%\Grim Reach\backups\ — dieser Button öffnet den Ordner im Explorer.
              Nur im Electron-Build sichtbar (Web-Build hat keine Backups, Plan §3.5). */}
          {!!window.hearthforge?.saves && (
            <OptRow label={t("options.openBackups")} hint={t("options.openBackupsHint")}>
              <button className="combat-btn" onClick={() => void openBackupsFolder()}>
                <img src={iconFolder} alt="" className="ui-icon" /> {t("options.openBackups")}
              </button>
            </OptRow>
          )}
        </OptSection>

        {/* ─── Über ─── */}
        <OptSection icon={<img src={iconInfo} alt="" className="opz-system-icon" />} title={t("about.title")} wide>
          <p className="opz-about-version">{t("about.version").replace("{version}", __APP_VERSION__)}</p>
          <p className="opz-about-line">{t("about.buildNote")}</p>
          <p className="opz-about-line">{t("about.credits")}</p>
          <div className="opz-about-actions">
            {/* Report-Bug-Feature (Chef-Auftrag 2026-07-18): war ein deaktivierter Platzhalter,
                öffnet jetzt denselben Dialog wie der prominente Banner oben. */}
            <button className="combat-btn" onClick={() => setShowBugReport(true)}>
              {t("about.bugReport")}
            </button>
            {/* TODO(urls): replace with real Discord URL before release. `.combat-btn[disabled]`
                dimmt bereits automatisch (kein zusätzlicher Inline-Opacity-Hack mehr nötig). */}
            <button className="combat-btn" disabled title={t("about.comingSoon")}>
              {t("about.discord")}
            </button>
          </div>
          <p className="opz-about-copyright">{t("about.copyright")}</p>
        </OptSection>
      </div>

      {showBugReport && (
        <BugReportDialog onClose={() => setShowBugReport(false)} screenLabel={t("options.title")} />
      )}
    </div>
  );
}
