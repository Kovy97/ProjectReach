// claude:2026-10-24T12:14:00+02:00 — Trailer v4 „Inventar“: Zeitstrahl (81,41 s, Musik wie v3) und Zahlen-Einblendungen.
// Alle Zahlen kommen aus data.json (gen-v4-data.ts).
import type * as THREE from "three";
import type { Shot } from "../kit";
import { finaleShots } from "../shots/finale";
import { DEFAULT_GRADE, type Grade, type Stage, type TrailerScene } from "../stage";
import data from "./data.json";
import { s02, s04, s07 } from "./shots";
import { v4s01, v4s03, v4s05, v4s06, v4s08, v4s09, v4s10, v4s11, v4s12, v4s13, v4s14, v4s15, v4s16, v4s17 } from "./shots2";
import { CaptionTrack, plus, type CaptionSpec } from "./ui";

export const V4_DURATION = 81.41;
const n = data.counts;

/** Einblendungen nach Storyboard design/trailer-v4/storyboard.md (englisch, Chef 24.10.) */
export const CAPTIONS: CaptionSpec[] = [
  { t0: 1.8, t1: 3.97, word: "A DARK FANTASY IDLE RPG", pos: "center" },
  { t0: 3.97, t1: 9.16, value: n.skills, word: "SKILLS" },
  { t0: 14.35, t1: 16.94, value: n.items, word: "ITEMS" },
  { t0: 16.94, t1: 19.53, value: n.gear, word: "PIECES OF GEAR", sub: `${plus(n.sets)} SETS` },
  { t0: 19.53, t1: 22.13, value: n.recipes, word: "RECIPES" },
  { t0: 24.72, t1: 29.91, value: n.monsters, word: "MONSTERS", sub: `${plus(n.champions)} CHAMPIONS`, subAt: 27.32 },
  { t0: 29.91, t1: 32.5, value: n.zones, word: "ZONES" },
  { t0: 32.5, t1: 35.1, value: n.dungeons, word: "DUNGEONS" },
  { t0: 35.1, t1: 37.69, value: 3, exact: true, word: "COMBAT STYLES", sub: "MELEE · RANGED · MAGIC" },
  { t0: 37.69, t1: 40.29, value: 3, exact: true, word: "ARMOR TYPES" },
  { t0: 40.29, t1: 45.47, value: n.enchantments, word: "ENCHANTMENTS", sub: `${plus(n.suffixes)} RANDOM SUFFIXES`, subAt: 42.88 },
  { t0: 48.07, t1: 53.26, value: 1, exact: true, word: "RAID", sub: `${n.raidHalls} HALLS` },
  { t0: 53.26, t1: 58.44, word: "NORMAL · HEROIC · MYTHIC" },
  { t0: 58.44, t1: 63.63, value: n.achievements, word: "ACHIEVEMENTS", sub: `${plus(n.quests)} QUESTS`, subAt: 61.04 },
  { t0: 63.63, t1: 66.23, value: n.companions, word: "COMPANIONS" },
  { t0: 66.23, t1: 68.82, value: n.talentTrees, exact: true, word: "TALENT TREES", sub: "& PRESTIGE" },
  { t0: 68.82, t1: 71.41, word: "PROGRESS WHILE YOU'RE AWAY" },
  { t0: 71.41, t1: 74.5, value: n.races, exact: true, word: "RACES", sub: `${n.languages} LANGUAGES` },
];

export function buildV4Shots(): Shot[] {
  return [
    v4s01(),
    s02(),
    v4s03(),
    s04(),
    v4s05(),
    v4s06(),
    s07(),
    v4s08(),
    v4s09(),
    v4s10(),
    v4s11(),
    v4s12(),
    v4s13(),
    v4s14(),
    v4s15(),
    v4s16(),
    v4s17(),
    // 18: Logo aus Glut wie in „Gehalten“ (aktuelles gemaltes Logo, nur das Logo)
    finaleShots()[1]!,
  ];
}

export function trailerV4(shots: Shot[] = buildV4Shots()): TrailerScene {
  const active = (tau: number): Shot | undefined => shots.find((s) => tau >= s.t0 && tau < s.t1) ?? shots[shots.length - 1];
  const captions = new CaptionTrack(CAPTIONS);
  return {
    id: "v4",
    duration: V4_DURATION,
    audioStart: 0,
    async setup(stage: Stage, root?: THREE.Object3D) {
      for (const s of shots) {
        await s.setup(stage);
        s.group.visible = false;
        (root ?? stage.scene).add(s.group);
      }
      captions.attach(stage);
    },
    update(tau, stage) {
      const cur = active(tau);
      for (const s of shots) s.group.visible = s === cur;
      cur?.update(tau - cur.t0, stage, tau);
      captions.update(tau, stage);
    },
    grade(tau): Partial<Grade> {
      const cur = active(tau);
      const g = cur?.grade ? cur.grade(tau - cur.t0) : DEFAULT_GRADE;
      // Bildblitz wie in v3 quadriert (wird linear addiert und wirkt sonst rund dreimal so hell)
      return g.flash ? { ...g, flash: g.flash * g.flash } : g;
    },
  };
}
