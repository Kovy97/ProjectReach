// claude:2026-10-25T10:42:00+01:00 — 1.4.1 A1 „Im Hintergrund stumm“: Fokus-Wächter + Musik-Pause/-Fortsetzen ohne
// Browser. window/document/localStorage/Audio sind schlanke Attrappen (Node-EventTarget), die Module werden je Test
// frisch geladen, weil sie ihren Zustand auf Modulebene halten (wie im Renderer).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeAudio {
  static all: FakeAudio[] = [];
  paused = true;
  loop = false;
  preload = "";
  volume = 1;
  currentTime = 0;
  constructor(public src: string) {
    FakeAudio.all.push(this);
  }
  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
}

type FakeDoc = EventTarget & { visibilityState: "visible" | "hidden"; hasFocus: () => boolean };
let win: EventTarget;
let doc: FakeDoc;
let focused = true;

function stubGlobals(): void {
  const store = new Map<string, string>();
  win = new EventTarget();
  doc = Object.assign(new EventTarget(), { visibilityState: "visible" as const, hasFocus: () => focused }) as FakeDoc;
  focused = true;
  FakeAudio.all = [];
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
}

const blur = (): void => {
  focused = false;
  win.dispatchEvent(new Event("blur"));
};
const focus = (): void => {
  focused = true;
  win.dispatchEvent(new Event("focus"));
};

describe("backgroundAudio (1.4.1 A1)", () => {
  beforeEach(() => {
    vi.resetModules();
    stubGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Vorgabe aus: Fokusverlust lässt alles laufen", async () => {
    const bg = await import("./backgroundAudio");
    bg.initBackgroundAudio();
    blur();
    expect(bg.isMuteInBackground()).toBe(false);
    expect(bg.isBackgroundSilenced()).toBe(false);
  });

  it("Option an: Alt-Tab pausiert die Musik, Rückkehr setzt sie fort", async () => {
    const bg = await import("./backgroundAudio");
    const music = await import("./music");
    bg.initBackgroundAudio();
    bg.setMuteInBackground(true);
    music.startMusic();
    const track = FakeAudio.all[0]!;
    expect(track.paused).toBe(false);
    blur();
    expect(bg.isBackgroundSilenced()).toBe(true);
    expect(track.paused).toBe(true);
    focus();
    expect(track.paused).toBe(false);
  });

  it("minimiert (visibilitychange hidden) zählt ebenfalls als Hintergrund", async () => {
    const bg = await import("./backgroundAudio");
    const music = await import("./music");
    bg.initBackgroundAudio();
    bg.setMuteInBackground(true);
    music.startMusic();
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(FakeAudio.all[0]!.paused).toBe(true);
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(FakeAudio.all[0]!.paused).toBe(false);
  });

  it("vom Spieler ausgeschaltete oder gestoppte Musik bleibt bei der Rückkehr aus", async () => {
    const bg = await import("./backgroundAudio");
    const music = await import("./music");
    bg.initBackgroundAudio();
    bg.setMuteInBackground(true);
    music.startMusic();
    blur();
    music.setMusicEnabled(false);
    focus();
    expect(FakeAudio.all[0]!.paused).toBe(true);
    music.setMusicEnabled(true); // im Vordergrund wieder an → spielt
    expect(FakeAudio.all[0]!.paused).toBe(false);
    blur();
    music.stopMusic(); // z. B. Hauptmenü verlassen
    focus();
    expect(FakeAudio.all[0]!.paused).toBe(true);
  });

  it("Start im Hintergrund wird vorgemerkt und erst bei der Rückkehr gespielt", async () => {
    const bg = await import("./backgroundAudio");
    const music = await import("./music");
    bg.initBackgroundAudio();
    bg.setMuteInBackground(true);
    blur();
    music.startMusic();
    expect(FakeAudio.all.every((a) => a.paused)).toBe(true);
    focus();
    expect(FakeAudio.all[0]!.paused).toBe(false);
  });

  it("Effekte schweigen im Hintergrund und klingen nach der Rückkehr wieder", async () => {
    const bg = await import("./backgroundAudio");
    const audio = await import("./audio");
    bg.initBackgroundAudio();
    bg.setMuteInBackground(true);
    blur();
    audio.playSfx("click");
    expect(FakeAudio.all.some((a) => !a.paused)).toBe(false);
    focus();
    audio.playSfx("click");
    expect(FakeAudio.all.some((a) => !a.paused)).toBe(true);
    blur(); // laufende Einmal-Töne werden beim Wechsel in den Hintergrund beendet
    expect(FakeAudio.all.some((a) => !a.paused)).toBe(false);
  });
});
