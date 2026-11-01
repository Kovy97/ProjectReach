import { useEffect, useRef, useState } from "react";
import { LOCALES } from "@hearthforge/shared";
import { restartGuide } from "@hearthforge/engine";
import { useI18n } from "../i18n";
import { useGameControl, useGameState } from "../game/GameContext";
import { openBackupsFolder } from "../saves";
import { AmbientEffectsPrefs, DisplayAudioPrefs, OptRow, OptSection, optBtnCls } from "../components/OptionControls";
import { BugReportDialog } from "../components/BugReportDialog";
import { isDesktopNotifyEnabled, isUpgradeMarkerEnabled, setDesktopNotifyEnabled, setUpgradeMarkerEnabled } from "../util/uiPrefs"; // claude:2026-10-31T16:34:28+01:00
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
  // claude:2026-10-31T16:34:28+01:00 — Aufwertungs-Marker und Desktop-Benachrichtigungen (uiPrefs, Browser-Speicher).
  const [upgradeMarkerOn, setUpgradeMarkerOn] = useState(isUpgradeMarkerEnabled);
  const [desktopNotifyOn, setDesktopNotifyOn] = useState(isDesktopNotifyEnabled);

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
      {/* claude:2026-10-17T13:35:00+02:00 — Kopf und Fehler-melden-Banner teilen sich eine Zeile, wenn Platz ist. */}
      <div className="opz-top">
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
        {/* Chef-Befund 25.08.2026: kein goldener Pergament-Chip mehr — derselbe Eisenrahmen wie
            jeder andere Standard-Knopf (design-system.css `.btn-iron`). */}
        <span className="btn-iron bugreport-entry-cta" aria-hidden="true">{t("bugReport.entryCta")}</span>
      </button>
      </div>

      <div className="opz-grid">
        {/* Anzeige + Audio: geteilt mit dem Hauptmenü-Panel (components/OptionControls). */}
        <DisplayAudioPrefs />

        {/* ─── Spiel & Tutorial ─── */}
        <OptSection icon={<img src={iconGameplay} alt="" className="opz-system-icon" />} title={t("options.gameplay")}>
          <OptRow label={t("options.autoBank")} hint={t("options.autoBankHint")}>
            <button
              className={optBtnCls(state.settings.autoBank)}
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
          {/* claude:2026-10-23T22:20:00+02:00 — Materiallager (1.4.0 ML, Chef 23.10.: „Direkt ins Lager, in den Optionen abschaltbar“). */}
          <OptRow label={t("options.materialsToStorage")} hint={t("options.materialsToStorageHint")}>
            <button
              className={optBtnCls(state.settings.materialsToStorage !== false)}
              onClick={() => { state.settings.materialsToStorage = state.settings.materialsToStorage === false; }}
            >
              <img
                src={state.settings.materialsToStorage !== false ? iconCheckboxOn : iconCheckboxOff}
                alt=""
                className="ui-icon"
              />{" "}
              {state.settings.materialsToStorage !== false ? t("options.on") : t("options.off")}
            </button>
          </OptRow>
          {/* claude:2026-10-24T19:40:00+02:00 — Köcher automatisch nachfüllen (1.4.0 FK, A2, Standard an). */}
          <OptRow label={t("options.quiverAutoRefill")} hint={t("options.quiverAutoRefillHint")}>
            <button
              className={optBtnCls(state.settings.quiverAutoRefill !== false)}
              onClick={() => { state.settings.quiverAutoRefill = state.settings.quiverAutoRefill === false; }}
            >
              <img
                src={state.settings.quiverAutoRefill !== false ? iconCheckboxOn : iconCheckboxOff}
                alt=""
                className="ui-icon"
              />{" "}
              {state.settings.quiverAutoRefill !== false ? t("options.on") : t("options.off")}
            </button>
          </OptRow>
          {/* claude:2026-10-23T20:10:00+02:00 — Ländereien-Meldungen (1.4.0 LA, Chef 23.10.: in den Optionen schaltbar). */}
          <OptRow label={t("options.estateNotifications")} hint={t("options.estateNotificationsHint")}>
            <button
              className={optBtnCls(state.settings.estateNotifications !== false)}
              onClick={() => { state.settings.estateNotifications = state.settings.estateNotifications === false; }}
            >
              <img
                src={state.settings.estateNotifications !== false ? iconCheckboxOn : iconCheckboxOff}
                alt=""
                className="ui-icon"
              />{" "}
              {state.settings.estateNotifications !== false ? t("options.on") : t("options.off")}
            </button>
          </OptRow>
          {/* claude:2026-10-25T11:40:00+02:00 — Raid-Schalter (1.4.0 Welle 4, Standard aus). */}
          <OptRow label={t("options.raidAutoContinue")} hint={t("options.raidAutoContinueHint")}>
            <button
              className={optBtnCls(state.settings.raidAutoContinue === true)}
              onClick={() => { state.settings.raidAutoContinue = state.settings.raidAutoContinue !== true; }}
            >
              <img
                src={state.settings.raidAutoContinue === true ? iconCheckboxOn : iconCheckboxOff}
                alt=""
                className="ui-icon"
              />{" "}
              {state.settings.raidAutoContinue === true ? t("options.on") : t("options.off")}
            </button>
          </OptRow>
          <OptRow label={t("options.raidAutoBuyRestart")} hint={t("options.raidAutoBuyRestartHint")}>
            <button
              className={optBtnCls(state.settings.raidAutoBuyRestart === true)}
              onClick={() => { state.settings.raidAutoBuyRestart = state.settings.raidAutoBuyRestart !== true; }}
            >
              <img
                src={state.settings.raidAutoBuyRestart === true ? iconCheckboxOn : iconCheckboxOff}
                alt=""
                className="ui-icon"
              />{" "}
              {state.settings.raidAutoBuyRestart === true ? t("options.on") : t("options.off")}
            </button>
          </OptRow>
          {/* claude:2026-10-31T16:34:28+01:00 — Aufwertungs-Marker ▲ (1.4.2, Standard an). */}
          <OptRow label={t("options.upgradeMarker")} hint={t("options.upgradeMarkerHint")}>
            <button
              className={optBtnCls(upgradeMarkerOn)}
              onClick={() => { setUpgradeMarkerEnabled(!upgradeMarkerOn); setUpgradeMarkerOn(!upgradeMarkerOn); }}
            >
              <img src={upgradeMarkerOn ? iconCheckboxOn : iconCheckboxOff} alt="" className="ui-icon" />{" "}
              {upgradeMarkerOn ? t("options.on") : t("options.off")}
            </button>
          </OptRow>
          {/* claude:2026-10-31T16:34:28+01:00 — Desktop-Benachrichtigungen (1.4.2, Opt-in, nur im Desktop-Spiel). */}
          {!!window.hearthforge?.notify && (
            <OptRow label={t("options.desktopNotify")} hint={t("options.desktopNotifyHint")}>
              <button
                className={optBtnCls(desktopNotifyOn)}
                onClick={() => { setDesktopNotifyEnabled(!desktopNotifyOn); setDesktopNotifyOn(!desktopNotifyOn); }}
              >
                <img src={desktopNotifyOn ? iconCheckboxOn : iconCheckboxOff} alt="" className="ui-icon" />{" "}
                {desktopNotifyOn ? t("options.on") : t("options.off")}
              </button>
            </OptRow>
          )}
          <OptRow label={t("options.help")}>
            {/* Startet den Spotlight-Guide (OnboardingGuide.tsx) komplett neu von Schritt 0 —
                löst den alten, event-basierten reopenOnboarding()-Aufruf ab (das 21-Schritt-Modal
                wird nicht mehr gerendert, siehe App.tsx). */}
            <button className={optBtnCls(false)} onClick={() => restartGuide(state)}>
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
                className={optBtnCls(l === locale)}
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
            <button className={optBtnCls(false)} onClick={download}>
              {t("options.exportDownload")}
            </button>
            <button className={optBtnCls(false)} onClick={copy}>
              {t("options.exportCopy")}
            </button>
            <button className={optBtnCls(false)} onClick={() => fileRef.current?.click()}>
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
            <button className="btn-iron btn-iron--danger" disabled={!importText.trim()} onClick={() => void doImport()}>
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
              <button className={optBtnCls(false)} onClick={() => void openBackupsFolder()}>
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
            <button className={optBtnCls(false)} onClick={() => setShowBugReport(true)}>
              {t("about.bugReport")}
            </button>
            {/* Discord-Knopf entfernt (Chef 28.08.2026): es gibt keinen Discord-Server, ein toter Knopf verwirrt nur. */}
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
