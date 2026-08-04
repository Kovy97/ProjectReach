/**
 * SFX: prozedurale Web-Audio-Töne (Rest-Platzhalter) + echte Dateien für UI-Klick, Achievement
 * und die Chef-Sound-Lieferungen (2026-07-11: Level-Up, Equip/Unequip, Seitenwechsel,
 * Welcome-Back-Pop + Kampf-Waffen-Sets). Lautstärke & Mute persistent in localStorage.
 *
 * KAMPF-WAFFEN-SETS (Chef-Schema): je Waffengattung ein Attack-Sound beim Schwung, gefolgt vom
 * ERGEBNIS — Impact (Treffer) oder Blocked (Miss/Block) — mit kurzem Delay; je 3 Variationen,
 * zufällig gewählt. AUTO-DISCOVERY: lege `assets/audio/combat/<gruppe>_<n>.wav` ab (z. B.
 * sword_attack_1..3, sword_impact_1..3, sword_blocked_1..3, bow_attack_1..3, …) — die Gruppe
 * wird automatisch erkannt, kein Code-Eintrag nötig (playCombatSfx unten).
 */
import clickUrl from "../assets/audio/click.mp3?url";
import achievementUrl from "../assets/audio/achievement.mp3?url";
import popUrl from "../assets/audio/pop_1.wav?url";
import pageOpenUrl from "../assets/audio/page_open.wav?url";
import levelUpUrl from "../assets/audio/level_up.wav?url";
import equipUrl from "../assets/audio/equip_unequip.wav?url";

// Jagd-Paket Task 5 (Chef-GO, "Spawn-Fanfare"): Elite-Spawn-Horn — Datei liegt beim Auftrag noch
// NICHT vor (der Chef liefert `assets/audio/elite_horn.mp3` nach). Ein statischer `import … from
// "…/elite_horn.mp3?url"` würde den Build brechen, solange die Datei fehlt — deshalb Auto-Discovery
// per `import.meta.glob` (Muster COMBAT_FILES unten): ein leeres Match-Objekt ist KEIN Fehler, nur
// ein leerer Katalog. `playSfx("eliteHorn")` bleibt dadurch bis zur Lieferung ein stiller No-op und
// fängt automatisch an zu tönen, sobald die Datei am erwarteten Pfad liegt — kein Code-Redeploy nötig.
const ELITE_HORN_FILES = import.meta.glob<string>("../assets/audio/elite_horn.mp3", {
  eager: true,
  query: "?url",
  import: "default",
});
const eliteHornUrl: string | null = Object.values(ELITE_HORN_FILES)[0] ?? null;

// Task #325 (Chef-Feedback „sollte länger sein mit Fanfare und Loot-Übersicht"): Sieg-Fanfare der
// neuen ChampionDefeatCeremony — exakt dasselbe graceful Auto-Discovery-Muster wie eliteHornUrl
// oben (Datei liegt beim Auftrag noch NICHT vor, der Chef liefert `assets/audio/elite_victory.mp3`
// nach). `playSfx("eliteVictory")` bleibt bis dahin ein stiller No-op.
const ELITE_VICTORY_FILES = import.meta.glob<string>("../assets/audio/elite_victory.mp3", {
  eager: true,
  query: "?url",
  import: "default",
});
const eliteVictoryUrl: string | null = Object.values(ELITE_VICTORY_FILES)[0] ?? null;

export type Sfx =
  | "hit"
  | "crit"
  | "death"
  | "heal"
  | "levelup"
  | "cast"
  | "castWeak"
  | "click"
  | "achievement"
  // Datei-Sounds (Chef-Lieferung 2026-07-11):
  | "pop" // Welcome-Back-/Offline-Modal öffnet sich
  | "pageOpen" // Seitenwechsel im Spiel
  | "equip" // Ausrüsten UND Ablegen (eine Datei für beides, Chef-Vorgabe)
  | "eliteHorn" // Jagd-Paket Task 5: Champion-Spawn-Fanfare (graceful, s. eliteHornUrl oben)
  | "eliteVictory"; // Task #325: Champion-Sieg-Fanfare (graceful, s. eliteVictoryUrl oben)

// ─── Kampf-Waffen-Sets: Auto-Discovery der Variationen ──────────────────────
// `<gruppe>_<n>.wav` → COMBAT_SETS["<gruppe>"] = [url, url, …] (n nur zur Eindeutigkeit,
// Reihenfolge egal — gewählt wird gleichverteilt zufällig, nie zweimal dieselbe hintereinander).
const COMBAT_FILES = import.meta.glob<string>("../assets/audio/combat/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
});
const COMBAT_SETS: Record<string, string[]> = {};
for (const [path, url] of Object.entries(COMBAT_FILES)) {
  const base = path.split("/").pop()?.replace(/\.wav$/i, "") ?? "";
  const group = base.replace(/_\d+$/, "");
  if (!group) continue;
  (COMBAT_SETS[group] ??= []).push(url);
}
const lastVariant: Record<string, number> = {};

const MUTE_KEY = "hf.audio.muted";
const VOL_KEY = "hf.audio.volume";
const ACHIEVEMENT_VOL_KEY = "hf.audio.achievementVolume";

let ctx: AudioContext | null = null;
let muted = localStorage.getItem(MUTE_KEY) === "1";
let volume = readVolume();
/** Eigene Lautstärke für den Achievement-Sound, unabhängig vom allgemeinen SFX-Regler. */
let achievementVolume = readAchievementVolume();
/** Drossel pro Sound, damit schnelle Treffer nicht übersteuern. */
const lastPlay: Record<string, number> = {};

function readVolume(): number {
  // Sweep2-T7 KRITISCH (2026-07-13): fehlender Key MUSS den Default liefern — Number(null)
  // ist 0 (nicht NaN) und passierte den Range-Check, wodurch JEDE Neuinstallation mit
  // stummgeschalteten SFX startete, bis der Spieler den Slider anfasste.
  const stored = localStorage.getItem(VOL_KEY);
  if (stored === null) return 0.5;
  const raw = Number(stored);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5;
}

function readAchievementVolume(): number {
  const stored = localStorage.getItem(ACHIEVEMENT_VOL_KEY);
  if (stored === null) return 1; // Default 100 % — s. readVolume zur Number(null)-Falle
  const raw = Number(stored);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 1;
}

// ─── UI-Klick aus click.mp3 ──────────────────────────────────────────────────
// +50 % Abspielgeschwindigkeit (Chef-Wunsch) ⇒ knackiger. Kleiner Pool, damit schnelle
// Klicks sich überlappen können statt sich gegenseitig abzuschneiden.
const CLICK_RATE = 1.5;
let clickPool: HTMLAudioElement[] = [];
let clickIdx = 0;

function playClickFile(): void {
  if (muted || volume <= 0) return;
  if (clickPool.length === 0) {
    clickPool = Array.from({ length: 4 }, () => {
      const a = new Audio(clickUrl);
      a.preload = "auto";
      return a;
    });
  }
  const a = clickPool[clickIdx]!;
  clickIdx = (clickIdx + 1) % clickPool.length;
  a.volume = Math.min(1, volume);
  a.playbackRate = CLICK_RATE;
  try {
    a.currentTime = 0;
  } catch {
    /* noch nicht geladen — egal */
  }
  void a.play().catch(() => undefined);
}

// ─── Achievement-Sound aus achievement.mp3 ───────────────────────────────────
// 3-Sekunden-Cooldown: schalten mehrere Erfolge gleichzeitig frei, kommt trotzdem nur EIN Sound.
const ACHIEVEMENT_COOLDOWN_MS = 3000;
let achievementAudio: HTMLAudioElement | null = null;
let lastAchievement = 0;

function playAchievementFile(): void {
  if (muted || achievementVolume <= 0) return;
  const now = performance.now();
  if (now - lastAchievement < ACHIEVEMENT_COOLDOWN_MS) return; // Cooldown
  lastAchievement = now;
  if (!achievementAudio) {
    achievementAudio = new Audio(achievementUrl);
    achievementAudio.preload = "auto";
  }
  achievementAudio.volume = Math.min(1, achievementVolume);
  try {
    achievementAudio.currentTime = 0;
  } catch {
    /* noch nicht geladen — egal */
  }
  void achievementAudio.play().catch(() => undefined);
}

// ─── Generischer Datei-Player mit kleinem Pool je URL (Muster clickPool) ─────
const filePools = new Map<string, { pool: HTMLAudioElement[]; idx: number }>();

function playFile(url: string, vol = volume, poolSize = 3): void {
  if (muted || vol <= 0) return;
  let entry = filePools.get(url);
  if (!entry) {
    entry = {
      pool: Array.from({ length: poolSize }, () => {
        const a = new Audio(url);
        a.preload = "auto";
        return a;
      }),
      idx: 0,
    };
    filePools.set(url, entry);
  }
  const a = entry.pool[entry.idx]!;
  entry.idx = (entry.idx + 1) % entry.pool.length;
  a.volume = Math.min(1, vol);
  try {
    a.currentTime = 0;
  } catch {
    /* noch nicht geladen — egal */
  }
  void a.play().catch(() => undefined);
}

/**
 * Spielt eine ZUFÄLLIGE Variation einer Kampf-Sound-Gruppe (s. Auto-Discovery oben) — optional
 * verzögert (der Impact/Blocked-Sound folgt dem Attack-Schwung mit ~140 ms, Chef-Schema).
 * No-op, wenn die Gruppe (noch) keine Dateien hat → Aufrufer brauchen keinen Existenz-Check,
 * fehlende Lieferungen degradieren stumm statt zu brechen. Nie zweimal dieselbe Variation direkt
 * hintereinander (bei ≥ 2 Dateien).
 */
export function playCombatSfx(group: string, delayMs = 0): boolean {
  const set = COMBAT_SETS[group];
  if (!set || set.length === 0) return false;
  if (muted || volume <= 0) return true; // Gruppe existiert — Aufrufer soll NICHT auf Synth zurückfallen
  let i = Math.floor(Math.random() * set.length);
  if (set.length > 1 && i === lastVariant[group]) i = (i + 1) % set.length;
  lastVariant[group] = i;
  const url = set[i]!;
  if (delayMs > 0) window.setTimeout(() => playFile(url), delayMs);
  else playFile(url);
  return true;
}

function getCtx(): AudioContext | null {
  type Win = typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? (window as Win).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Ein einzelner Ton mit exponentieller Attack/Release-Hüllkurve. */
function blip(
  c: AudioContext,
  freq: number,
  freqEnd: number,
  type: OscillatorType,
  dur: number,
  peak: number,
  delay = 0,
): void {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  }
  const amp = Math.max(0.0001, peak * volume);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(amp, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export function playSfx(sfx: Sfx): void {
  if (muted || volume <= 0) return;
  const now = performance.now();
  if (now - (lastPlay[sfx] ?? 0) < 45) return; // Drossel
  lastPlay[sfx] = now;

  // UI-Klick & Achievement: echte Dateien, kein AudioContext nötig.
  if (sfx === "click") {
    playClickFile();
    return;
  }
  if (sfx === "achievement") {
    playAchievementFile();
    return;
  }
  // Datei-Sounds der Chef-Lieferung 2026-07-11 — echte Aufnahmen statt Synth.
  if (sfx === "pop") {
    playFile(popUrl);
    return;
  }
  if (sfx === "pageOpen") {
    playFile(pageOpenUrl);
    return;
  }
  if (sfx === "equip") {
    playFile(equipUrl);
    return;
  }
  if (sfx === "levelup") {
    playFile(levelUpUrl); // ersetzt die Synth-Fanfare (Wunschliste B „levelup")
    return;
  }
  if (sfx === "eliteHorn") {
    if (eliteHornUrl) playFile(eliteHornUrl); // No-op, solange die Datei fehlt (s. oben)
    return;
  }
  if (sfx === "eliteVictory") {
    if (eliteVictoryUrl) playFile(eliteVictoryUrl); // No-op, solange die Datei fehlt (s. oben)
    return;
  }

  const c = getCtx();
  if (!c) return;

  switch (sfx) {
    case "hit":
      blip(c, 180, 90, "triangle", 0.1, 0.45);
      break;
    case "crit":
      blip(c, 200, 95, "triangle", 0.11, 0.5);
      blip(c, 720, 1020, "square", 0.13, 0.28);
      break;
    case "death":
      blip(c, 300, 70, "sawtooth", 0.3, 0.4);
      break;
    case "heal":
      blip(c, 520, 760, "sine", 0.18, 0.32);
      break;
    // "levelup" wird oben als echte Datei (level_up.wav) bedient — Synth-Case entfernt.
    // Arcaner Zauber-Cast: Sinus-Sweep nach oben (mystisch, anders als Melee-Triangle-Blip).
    case "cast":
      blip(c, 340, 820, "sine", 0.14, 0.38);
      blip(c, 680, 1240, "sine", 0.1, 0.22, 0.06);
      break;
    // Schwacher Stab-Nahkampf bei leerem Mana: gedämpfter, abwärts-Sweep.
    case "castWeak":
      blip(c, 220, 110, "sine", 0.12, 0.22);
      break;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem(MUTE_KEY, value ? "1" : "0");
}

export function getVolume(): number {
  return volume;
}

export function setVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
  localStorage.setItem(VOL_KEY, String(volume));
  // Kein eigener Bestätigungston mehr: der globale Klick-Listener spielt bereits click.mp3 beim
  // Drücken eines Lautstärke-Buttons (sonst Doppelton). Die neue Lautstärke ist daran hörbar.
}

/** Eigene Lautstärke des Achievement-Unlock-Sounds (0..1), unabhängig vom SFX-Regler oben. */
export function getAchievementVolume(): number {
  return achievementVolume;
}

export function setAchievementVolume(value: number): void {
  achievementVolume = Math.max(0, Math.min(1, value));
  localStorage.setItem(ACHIEVEMENT_VOL_KEY, String(achievementVolume));
}
