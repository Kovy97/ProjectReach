import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import {
  type CombatFxLevel,
  getCombatFxLevel,
  isTooltipImagePopupEnabled,
  setCombatFxLevel,
  setTooltipImagePopupEnabled,
} from "../util/uiPrefs";
import {
  getVignette,
  isAmbientEnabled,
  isReducedMotionPreferred,
  setAmbientEnabled,
  setVignette,
} from "../util/ambientPrefs";
import {
  getAchievementVolume,
  getVolume,
  isMuted,
  setAchievementVolume,
  setMuted,
  setVolume,
} from "../util/audio";
import { getMusicVolume, isMusicEnabled, setMusicEnabled, setMusicVolume } from "../util/music";
// codex:2026-08-01T13:30:36+02:00 — Kleine Options-Glyphen sind eigene transparente SVGs statt
// betriebssystemabhängiger Emoji-Renderings; dadurch bleiben sie bei 16–28 px scharf und stiltreu.
import iconAmbient from "../assets/ui/system-icons/ambient.svg";
import iconAudio from "../assets/ui/system-icons/audio.svg";
import iconDisplay from "../assets/ui/system-icons/display.svg";
import iconMusic from "../assets/ui/system-icons/music.svg";
import {
  getFullscreen,
  getWindowMode,
  isFullscreenPref,
  setFullscreen,
  setWindowMode,
  windowModePref,
} from "../util/display";
import "../styles/options.css";

// ─────────────────────────────────────────────────────────────────────────────
// Geteilte Options-Bausteine + die „fundamentalen" Anzeige-/Audio-Einstellungen.
// Bewusst herausgezogen, damit die In-Game-Options (OptionsPage) UND das Hauptmenü-Panel
// (MainMenu → MenuOptionsPanel) EXAKT dieselben Regler zeigen — kein Divergenz-Risiko wie
// früher bei .lang-btn/toLocaleString. Alle hier gesteuerten Prefs sind localStorage- bzw.
// fenster-basiert (kein GameState), funktionieren also auch VOR dem Spielstart im Hauptmenü.
// ─────────────────────────────────────────────────────────────────────────────

/** Eine Options-Sektion: Holzrahmen-Panel mit Icon-Medaillon + Titel-Zeile. */
export function OptSection({
  icon,
  title,
  wide,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className={`opz-section${wide ? " opz-section--wide" : ""}`}>
      <div className="opz-section-head">
        <span className="opz-section-icon" aria-hidden="true">{icon}</span>
        <h3 className="opz-section-title">{title}</h3>
      </div>
      {children}
    </section>
  );
}

/** Eine beschriftete Einstellungs-Zeile (Label links, Steuerelement(e) rechts). */
export function OptRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="opz-row">
      <div className="opz-row-text">
        <span className="opz-row-label">{label}</span>
        {hint && <span className="opz-row-hint">{hint}</span>}
      </div>
      <div className="opz-row-control">{children}</div>
    </div>
  );
}

/** Lautstärke-Regler 0–100 % (Citadel-Slider) mit live mitlaufender Prozentanzeige. */
export function VolumeSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}): JSX.Element {
  const pct = Math.round(value * 100);
  return (
    <div className="opz-slider">
      <input
        type="range"
        className="opz-range"
        min={0}
        max={100}
        step={1}
        value={pct}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <span className="opz-slider-val">{pct}%</span>
    </div>
  );
}

/** 0–100-Regler (Citadel-Slider) OHNE 0..1-Normierung — für die Ambient-Cockpit-Slider (Task #311:
 *  Vignette, Bloom-Stärke/-Schwelle), deren Werte bereits 0–100 sind und direkt in
 *  ambientPrefs.ts persistiert werden. */
export function PctSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <div className="opz-slider">
      <input
        type="range"
        className="opz-range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="opz-slider-val">{value}%</span>
    </div>
  );
}

/**
 * Anzeige- + Audio-Sektionen (Vollbild/Fenster, Tooltip-Popup, Kampf-Effekte, Ton + Lautstärke,
 * Musik + Lautstärke, Achievement-Lautstärke). Gibt zwei `<OptSection>` als Fragment zurück —
 * in der In-Game-OptionsPage bleiben sie so direkte Kinder von `.opz-grid` (2-Spalten-Layout),
 * im Hauptmenü stehen sie in einer eigenen Spalte. Keine Props: der Zustand lebt lokal und
 * synchronisiert die geteilten localStorage-/Fenster-Prefs.
 */
export function DisplayAudioPrefs(): JSX.Element {
  const { t } = useI18n();
  const [muted, setMutedState] = useState(isMuted());
  const [volume, setVolumeState] = useState(getVolume());
  const [music, setMusicState] = useState(isMusicEnabled());
  const [musicVol, setMusicVolState] = useState(getMusicVolume());
  const [achievementVol, setAchievementVolState] = useState(getAchievementVolume());
  const [tooltipPopup, setTooltipPopupState] = useState(isTooltipImagePopupEnabled());
  const [combatFx, setCombatFxState] = useState<CombatFxLevel>(getCombatFxLevel());
  const [fullscreen, setFullscreenState] = useState(isFullscreenPref());
  // Start-Fenstermodus (Chef-Auftrag 2026-07-23): eigenständig vom Live-Vollbild-Toggle oben —
  // bestimmt das Fenster beim NÄCHSTEN Programmstart (s. util/display.ts-Doku).
  const [windowMode, setWindowModeState] = useState<WindowMode>(windowModePref());

  // Tatsächlichen Fensterzustand beim Öffnen abgleichen + live aktualisieren (z. B. nach F11).
  useEffect(() => {
    void getFullscreen().then(setFullscreenState);
    return window.hearthforge?.win?.onFullscreenChanged(setFullscreenState);
  }, []);

  useEffect(() => {
    void getWindowMode().then(setWindowModeState);
  }, []);

  const changeFullscreen = async (flag: boolean): Promise<void> => {
    const now = await setFullscreen(flag);
    setFullscreenState(now);
  };
  const changeWindowMode = async (mode: WindowMode): Promise<void> => {
    await setWindowMode(mode);
    setWindowModeState(mode);
  };
  const toggleMute = (): void => { const next = !muted; setMuted(next); setMutedState(next); };
  const changeVolume = (v: number): void => { setMuted(false); setMutedState(false); setVolume(v); setVolumeState(v); };
  const toggleMusic = (): void => { const next = !music; setMusicEnabled(next); setMusicState(next); };
  const changeMusicVol = (v: number): void => { setMusicVolume(v); setMusicVolState(v); };
  const changeAchievementVol = (v: number): void => { setAchievementVolume(v); setAchievementVolState(v); };
  const toggleTooltipPopup = (): void => { const next = !tooltipPopup; setTooltipImagePopupEnabled(next); setTooltipPopupState(next); };
  const changeCombatFx = (level: CombatFxLevel): void => { setCombatFxLevel(level); setCombatFxState(level); };

  return (
    <>
      {/* ─── Anzeige: Startmodus + Vollbild + Tooltip-Popup + Kampf-Effekte ─── */}
      <OptSection icon={<img src={iconDisplay} alt="" className="opz-system-icon" />} title={t("options.display")}>
        {/* Start-Fenstermodus (Chef-Auftrag 2026-07-23): eigene Zeile, eigenständig vom
            Live-Vollbild-Toggle direkt darunter — bestimmt das Fenster beim NÄCHSTEN Start. */}
        <OptRow label={t("options.windowMode")} hint={t("options.windowModeHint")}>
          <div className="opz-segment">
            <button className={windowMode === "fullscreen" ? "combat-btn active" : "combat-btn"} onClick={() => void changeWindowMode("fullscreen")}>
              {t("options.fullscreen")}
            </button>
            <button className={windowMode === "borderless" ? "combat-btn active" : "combat-btn"} onClick={() => void changeWindowMode("borderless")}>
              {t("options.windowModeBorderless")}
            </button>
            <button className={windowMode === "windowed" ? "combat-btn active" : "combat-btn"} onClick={() => void changeWindowMode("windowed")}>
              {t("options.windowed")}
            </button>
          </div>
        </OptRow>
        <OptRow label={t("options.fullscreen")} hint={t("options.fullscreenHint")}>
          <div className="opz-segment">
            <button className={!fullscreen ? "combat-btn active" : "combat-btn"} onClick={() => void changeFullscreen(false)}>
              {t("options.windowed")}
            </button>
            <button className={fullscreen ? "combat-btn active" : "combat-btn"} onClick={() => void changeFullscreen(true)}>
              {t("options.fullscreen")}
            </button>
          </div>
        </OptRow>
        <OptRow label={t("options.tooltipImagePopup")} hint={t("options.tooltipImagePopupHint")}>
          <button className={tooltipPopup ? "combat-btn active" : "combat-btn"} onClick={toggleTooltipPopup}>
            {tooltipPopup ? "☑" : "☐"} {tooltipPopup ? t("options.on") : t("options.off")}
          </button>
        </OptRow>
        <OptRow label={t("options.combatFx")} hint={t("options.combatFxHint")}>
          <div className="opz-segment">
            <button className={combatFx === "full" ? "combat-btn active" : "combat-btn"} onClick={() => changeCombatFx("full")}>
              {t("options.combatFxFull")}
            </button>
            <button className={combatFx === "reduced" ? "combat-btn active" : "combat-btn"} onClick={() => changeCombatFx("reduced")}>
              {t("options.combatFxReduced")}
            </button>
            <button className={combatFx === "off" ? "combat-btn active" : "combat-btn"} onClick={() => changeCombatFx("off")}>
              {t("options.combatFxOff")}
            </button>
          </div>
        </OptRow>
      </OptSection>

      {/* ─── Audio ─── */}
      <OptSection icon={<img src={iconAudio} alt="" className="opz-system-icon" />} title={t("options.audio")}>
        <OptRow label={t("options.soundOn")}>
          <button className={muted ? "combat-btn active" : "combat-btn"} onClick={toggleMute}>
            <img src={iconAudio} alt="" className={`opz-inline-icon${muted ? " is-muted" : ""}`} />
            {muted ? t("options.muted") : t("options.soundOn")}
          </button>
        </OptRow>
        <OptRow label={t("options.volume")}>
          <VolumeSlider value={muted ? 0 : volume} onChange={changeVolume} />
        </OptRow>
        <OptRow label={t("options.music")}>
          <button className={music ? "combat-btn active" : "combat-btn"} onClick={toggleMusic}>
            <img src={iconMusic} alt="" className={`opz-inline-icon${music ? "" : " is-muted"}`} />
            {music ? t("options.musicOn") : t("options.musicOff")}
          </button>
        </OptRow>
        <OptRow label={t("options.musicVolume")}>
          <VolumeSlider value={musicVol} onChange={changeMusicVol} />
        </OptRow>
        <OptRow label={t("options.achievementVolume")} hint={t("options.achievementVolumeHint")}>
          <VolumeSlider value={achievementVol} onChange={changeAchievementVol} />
        </OptRow>
      </OptSection>
    </>
  );
}

/**
 * Ambient-Cockpit (Task #311, Chef-GO "Effekt-Cockpit"; Wetter-Rückbau 2026-07-24 → Chef-Korrektur
 * Task #317, selber Tag: "wo ist das Bloom hin? Eigentlich brauchen wir nur das Vignette").
 * Master-Schalter + 3 Slider für den app-weiten Ambient-Layer: Vignette (reines CSS,
 * components/AmbientEffects.tsx) sowie Bloom-Stärke/-Schwelle (three.js-Licht-Wash mit echtem
 * Bloom, components/AmbientCanvas.tsx). Film-Korn/Nebel-Drift/Fackellicht (Blessing-Wetter-Ära)
 * und die alte Partikel-Dichte/-Tempo samt Blessing-Vorschau bleiben entfernt. Geteilte
 * Komponente wie `DisplayAudioPrefs` (dieselbe Begründung: reine localStorage-Vorlieben, kein
 * GameState nötig — funktioniert schon im Hauptmenü, bevor überhaupt ein Spielstand geladen ist).
 * Jeder Regler schreibt sofort in ambientPrefs.ts (persistiert + `subscribeAmbientPrefs`-Emit, s.
 * dortige Doku) — AmbientEffects/AmbientCanvas übernehmen Änderungen dadurch live, ohne Remount.
 */
export function AmbientEffectsPrefs(): JSX.Element {
  const { t } = useI18n();
  const [enabled, setEnabledState] = useState(isAmbientEnabled());
  const [vignette, setVignetteState] = useState(getVignette());

  const toggleEnabled = (): void => { const next = !enabled; setAmbientEnabled(next); setEnabledState(next); };
  const changeVignette = (v: number): void => { setVignette(v); setVignetteState(v); };

  return (
    <OptSection icon={<img src={iconAmbient} alt="" className="opz-system-icon" />} title={t("options.ambient.title")} wide>
      <OptRow
        label={t("options.ambient.master")}
        hint={isReducedMotionPreferred() ? t("options.ambient.reducedMotionHint") : t("options.ambient.masterHint")}
      >
        <button className={enabled ? "combat-btn active" : "combat-btn"} onClick={toggleEnabled}>
          {enabled ? "☑" : "☐"} {enabled ? t("options.on") : t("options.off")}
        </button>
      </OptRow>
      <OptRow label={t("options.ambient.vignette")} hint={t("options.ambient.vignetteHint")}>
        <PctSlider value={vignette} onChange={changeVignette} disabled={!enabled} />
      </OptRow>
    </OptSection>
  );
}
