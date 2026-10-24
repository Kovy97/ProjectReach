// claude:2026-10-24T10:24:00+02:00 — Trailer v3, Shots 19–29 (Raid Gobkha'raz, Musik 45,47–71,41 s). Die Raid-Gegner (monsters/gk_*)
// liefert Codex noch; bis dahin stehen Bestandsgoblins in den echten Raid-Räumen gk_room_1–4. Tausch = nur RAID_CAST ändern.
// claude:2026-10-24T10:24:00+02:00 — Kameras an die Malerposition, kein Orbit, keine Fahrt dicht am Pfeil (Chef 24.10.: zu nah, zu unscharf).
import * as THREE from "three";
import { easeInOutCubic, easeOutCubic, pulse, ramp, rng, smooth, timeRemap, track, type Vec3 } from "../anim";
import { PointCloud, tintBackdrop, type Atmosphere } from "../env";
import { Burst, DamageNumber, Glow, Ring, TEX } from "../fx";
import { atmosphere, backdrop, card, figure, HitFx, lungeBend, lungeX, recoil, runAtmo, setCam, shake, type Shot } from "../kit";
import type { Puppet } from "../puppet";
import { frostMoment } from "../scenes/frostMoment";
import type { TrailerScene } from "../stage";

const BEAT = 0.6486;
const HALF = BEAT / 2;
const g = () => new THREE.Group();
const C = (r: number, gg: number, b: number) => new THREE.Color(r, gg, b);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Besetzung: Platzhalter → spätere Raid-ID (Kommentar). Sobald monsters/gk_*.webp da sind, hier umstellen. */
export const RAID_CAST = {
  tally: "monsters/goblin_warlock.webp", // gk_tallymistress (Vrikka, die Zählerin)
  quarter: "monsters/goblin_siegebrute.webp", // gk_quartermaster (Krogg)
  fel: "monsters/goblin_felmagician.webp", // gk_felmagus (Zil'gath)
  king: "monsters/goblin_warchief.webp", // gk_warking (Rakkzul)
  wave: ["monsters/goblin_reaver.webp", "monsters/goblin_spearman.webp", "monsters/goblin_pikeman.webp", "monsters/goblin_butcher.webp", "monsters/goblin_rogue.webp"], // gk_gate_pikeman, gk_toll_thug, gk_bannerman …
  sentry: "monsters/goblin_spearman.webp", // gk_gate_pikeman
};
const HERO = "portraits/human_warrior_m.webp";
const heroOpts = { height: 2.25, capeC: [0.62, 0.38] as [number, number], capeR: [0.2, 0.3] as [number, number], chest: 0.7, hip: 0.46 };
const mobOpts = (h: number) => ({ height: h, chest: 0.58, hip: 0.36 });

/** Schutzschild (Ward) als Blase: weiche Füllung + Rand, flackert unter Treffern. */
class Ward {
  readonly fill = new Glow(C(0.35, 0.5, 0.8));
  readonly rim = new Glow(C(0.6, 0.8, 1.25), TEX.ring());
  constructor(group: THREE.Group) {
    group.add(this.fill.sprite, this.rim.sprite);
  }
  set(pos: THREE.Vector3, r: number, op: number): void {
    this.fill.set(pos, r * 2.2, 0.22 * op);
    this.rim.set(pos, r / 0.45, 0.3 * op);
  }
}

/** Glutspur hinter einem Geschoss: Punkte werden entlang der Bahn ausgestoßen und verglimmen (rein zeitabhängig). */
class Trail {
  readonly cloud: PointCloud;
  private seed: { off: THREE.Vector3; s: number }[] = [];
  constructor(readonly n: number, private color: [number, number, number], seedN: number) {
    this.cloud = new PointCloud(n, true, 0.0);
    const r = rng(seedN);
    for (let i = 0; i < n; i++) this.seed.push({ off: V((r() - 0.5) * 0.4, (r() - 0.2) * 0.5, (r() - 0.5) * 0.4), s: 0.5 + r() });
  }
  /** path(u) = Ort zur Zeit u; Ausstoß zwischen u0 und u1; t = jetzt */
  update(path: (u: number) => THREE.Vector3, u0: number, u1: number, t: number, cam: THREE.PerspectiveCamera): void {
    this.cloud.setCamera(cam);
    for (let i = 0; i < this.n; i++) {
      const te = u0 + ((u1 - u0) * i) / this.n;
      const age = t - te;
      const q = this.seed[i]!;
      if (age < 0) {
        this.cloud.col.set([0, 0, 0, 0], i * 4);
        continue;
      }
      const p = path(te).addScaledVector(q.off, Math.min(age, 1.2));
      p.y += 0.25 * age;
      this.cloud.pos.set([p.x, p.y, p.z], i * 3);
      // claude:2026-10-24T10:24:00+02:00 — nahe der Kamera ausblenden, sonst legen sich riesige Bokeh-Punkte über das Bild
      const near = smooth((p.distanceTo(cam.position) - 0.8) / 1.2);
      const a = Math.max(0, 1 - age / 0.45) * near * 0.7;
      this.cloud.col.set([this.color[0], this.color[1], this.color[2], a], i * 4);
      this.cloud.size[i] = q.s * 0.025 * (1 - age * 0.5);
    }
    this.cloud.commit();
  }
}

// ── 19 Das Tor von Gobkha'raz: nur Bass, langsamer Push, Asche in Zeitlupe ───────────────────────────
function s19(): Shot {
  const group = g();
  const sentries: Puppet[] = [];
  let atmo!: Atmosphere;
  return {
    id: "19", t0: 45.47, t1: 47.4, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_1.webp", { horizon: 0.42 }));
      for (const x of [-1.9, 1.9]) {
        const s = await figure(stage, RAID_CAST.sentry, mobOpts(2.0));
        s.group.position.set(x, 0, -1.4);
        sentries.push(s);
        group.add(s.group);
      }
      atmo = atmosphere(group, 191, [0.55, 0.5, 0.46], [2.6, 1.0, 0.3], 700, 90);
    },
    update(t, stage) {
      setCam(stage, track<Vec3>([{ t: 0, v: [0, 1.6, 6.2] }, { t: 1.93, v: [0, 1.6, 5.4], ease: (k) => k }], t), [0, 1.6, 0], 38);
      sentries.forEach((s, i) => {
        s.u("uDark").value = 0.72;
        s.u("uRim").value = 0.5;
        s.u("uRimDir").value.set(i === 0 ? 1 : -1, 0.4);
        s.u("uBreath").value = Math.sin(t * 2 + i) * 0.01;
        s.face(stage.camera.position);
      });
      runAtmo(atmo, stage, 40 + t * 0.3);
    },
    grade: (t) => ({ exposure: 0.98, saturation: 0.85, vignette: 0.72, bloom: 0.45, split: 0.7, fade: 1 - smooth(t / 0.3) }),
  };
}

// ── 20 Fast-Stille: die Krone des Kriegskönigs im Gegenlicht, Lichtspalt bei 47,9 ───────────────────────
function s20(): Shot {
  const group = g();
  let king!: Puppet;
  let slit!: Glow;
  let back!: Glow;
  return {
    id: "20", t0: 47.4, t1: 48.07, group,
    async setup(stage) {
      // claude:2026-10-24T10:24:00+02:00 — abgedunkelte Halle als Gegenlicht, sonst blieben nur Randlinien im Schwarz
      const bd = await backdrop(stage, "battlescreens/gk_room_4.webp", { horizon: 0.42 });
      tintBackdrop(bd, 0.3, 0.27, 0.24);
      group.add(bd);
      king = await figure(stage, RAID_CAST.king, mobOpts(3.0));
      king.group.position.set(0, 0, 0);
      king.shadow.visible = false;
      back = new Glow(C(1.6, 0.8, 0.35));
      slit = new Glow(C(2.4, 2.0, 1.6));
      group.add(back.sprite, king.group, slit.sprite);
    },
    update(t, stage) {
      setCam(stage, [0.2, 1.9, 4.6 - 0.15 * t], [0.05, 2.05, 0], 32);
      king.u("uDark").value = 0.93;
      king.u("uRim").value = 1.3;
      king.u("uRimColor").value.setRGB(1.0, 0.7, 0.4);
      king.u("uRimDir").value.set(0.2, 1);
      king.face(stage.camera.position);
      back.set(V(0.1, 2.3, -1.6), 4.2, 0.16 + 0.03 * Math.sin(t * 4));
      // Lichtspalt: senkrechter Streifen, der sich ab 0,5 s öffnet
      const k = ramp(t, 0.5, 0.67, easeOutCubic);
      slit.sprite.position.set(-0.9, 2.3, -0.6);
      slit.sprite.scale.set(0.04 + 0.14 * k, 4.5 * Math.max(0.05, k), 1);
      (slit.sprite.material as THREE.SpriteMaterial).opacity = k;
      slit.sprite.visible = k > 0.001;
    },
    grade: (t) => ({ exposure: 0.9, saturation: 0.8, vignette: 0.85, bloom: 0.6, grain: 0.06, flash: 0.15 * ramp(t, 0.55, 0.67) }),
  };
}

// ── 21 EPIC SWITCH: Peitschenschwenk in die Halle, der Held schlägt in die Welle ein ────────────────────
// Einschlag bei τ 0 (48,07 s) in 0,2×, Rampe auf 1,5×; Treffer auf den Schlägen 49,37 / 50,02 und dem Halbschlag 50,34.
const S21_SEGS = [
  { from: 0, rate: 0.2 },
  { from: 0.6, rate: 0.6 },
  { from: 0.9, rate: 1.5 },
];
const a21 = (t: number): number => timeRemap(S21_SEGS, t);
const S21_HITS = [2 * BEAT, 3 * BEAT, 3.5 * BEAT];
function s21(): Shot {
  const group = g();
  let hero!: Puppet;
  const mobs: { p: Puppet; x: number; z: number; hit: number }[] = [];
  const fx: HitFx[] = [];
  let shock!: Ring;
  let dust!: Burst;
  let slam!: Burst;
  let atmo!: Atmosphere;
  const heroX = (a: number): number => {
    // Landung bei 0, dann Vorstoß von Gegner zu Gegner
    const h = S21_HITS.map(a21);
    return -0.4 + 1.2 * ramp(a, h[0]! - 0.35, h[0]! - 0.05, easeOutCubic) + 1.1 * ramp(a, h[1]! - 0.3, h[1]! - 0.04, easeOutCubic) + 0.9 * ramp(a, h[2]! - 0.22, h[2]! - 0.03, easeOutCubic);
  };
  return {
    id: "21", t0: 48.07, t1: 50.66, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_2.webp", { horizon: 0.45 }));
      hero = await figure(stage, HERO, heroOpts);
      group.add(hero.group);
      const place: [number, number, number][] = [[1.5, 0.2, 0], [2.6, -0.3, 1], [3.4, 0.35, 2], [-2.0, -0.8, -1], [4.4, -0.6, -1]];
      for (let i = 0; i < place.length; i++) {
        const [x, z, hit] = place[i]!;
        const p = await figure(stage, RAID_CAST.wave[i]!, mobOpts(2.0 + (i % 2) * 0.15));
        mobs.push({ p, x, z, hit });
        group.add(p.group);
      }
      S21_HITS.forEach((tau, i) => {
        const m = mobs.find((q) => q.hit === i)!;
        fx.push(new HitFx({ at: a21(tau), tau, point: V(m.x - 0.5, 1.2, m.z + 0.3), dmg: ["1 120", "1 476", "3 905"][i], crit: i === 2, seed: 210 + i, sparks: 90 }, group));
      });
      shock = new Ring(C(1.4, 1.1, 0.8), true);
      dust = new Burst({ seed: 215, count: 70, origin: V(-0.4, 0.05, 0.1), originSpread: V(0.6, 0, 0.4), dir: V(0, 0.25, 0), spread: 1.0, speed: [1.5, 4], life: [0.6, 1.4], gravity: 0.2, drag: 2.2, stretch: 0, width: 0.4, colors: [C(0.34, 0.28, 0.22), C(0.16, 0.13, 0.1)], additive: false, tex: TEX.soft() });
      slam = new Burst({ seed: 216, count: 160, origin: V(-0.4, 0.1, 0.1), dir: V(0, 1, 0), spread: 0.95, speed: [3, 9], life: [0.4, 1.0], gravity: -9, drag: 1.2, stretch: 0.03, width: 0.022, colors: [C(3.2, 2.3, 1.2), C(1.4, 0.35, 0.08)], birthFade: 0.05 });
      group.add(shock.mesh, dust.mesh, slam.mesh);
      atmo = atmosphere(group, 211, [0.55, 0.5, 0.46], [2.6, 1.0, 0.3], 600, 160);
    },
    update(t, stage) {
      const a = a21(t);
      const hx = heroX(a);
      // Peitschenschwenk: in den ersten 0,12 s schwingt der Blick von rechts in die Szene
      const whip = 2.5 * (1 - easeOutCubic(t / 0.12));
      const camX = 0.4 + 0.5 * (hx + 0.4);
      const shakeAmt = 0.12 * pulse(t, 0, 0.0001, 0.6) + S21_HITS.reduce((s, h) => s + 0.05 * pulse(t, h, 0.0001, 0.25), 0);
      setCam(stage, shake([camX - 0.2, 1.55, 5.6 + 0.4 * ramp(t, 0.9, 2.59)], shakeAmt, t, 21), [camX + whip, 1.4, 0], 38 - 3 * pulse(t, 0, 0.001, 0.6));
      const cam = stage.camera.position;
      // Held: Landung aus dem Sprung (vor τ 0 in der Luft), danach Vorstöße
      const land = a < 0 ? 0 : 1;
      hero.group.position.set(hx, 0.6 * (1 - land), 0.1);
      hero.u("uScale").value.set(1 + 0.06 * pulse(a, 0, 0.0001, 0.12), 1 - 0.08 * pulse(a, 0, 0.0001, 0.12));
      hero.u("uBend").value = S21_HITS.reduce((s, h) => s + lungeBend(a, a21(h)), 0);
      hero.u("uSway").value = Math.sin(a * 6) * 0.5;
      hero.u("uRim").value = 0.3;
      hero.face(cam);
      mobs.forEach((m, i) => {
        // Druckwelle stößt alle leicht weg, Getroffene fliegen und zerfallen in Glut
        const away = Math.sign(m.x - (-0.4));
        const push = 0.35 * easeOutCubic(ramp(a, 0, 0.35, (k) => k)) / Math.max(1, Math.abs(m.x + 0.4) * 0.5);
        const ah = m.hit >= 0 ? a21(S21_HITS[m.hit]!) : 99;
        m.p.group.position.set(m.x + away * push + recoil(a, ah, 0.9), 0, m.z);
        m.p.u("uFlash").value = 0.15 * pulse(a, ah, 0.0001, 0.1) + 0.15 * pulse(a, 0, 0.0001, 0.15);
        m.p.u("uFlashColor").value.setRGB(0.95, 0.8, 0.62);
        m.p.u("uDissolve").value = 1.05 * ramp(a, ah + 0.25, ah + 0.75);
        m.p.u("uLean").value = 0.08 * pulse(a, 0, 0.0001, 0.5) * away;
        m.p.u("uBreath").value = Math.sin(t * 3 + i) * 0.012;
        m.p.face(cam);
      });
      fx.forEach((f) => f.update(a, t, cam));
      shock.update(a, 0.45, 3.4, V(-0.4, 0.04, 0.1), undefined, 0.9);
      dust.update(a, cam);
      slam.update(a, cam);
      runAtmo(atmo, stage, 50 + a);
    },
    grade: (t) => {
      let flash = 0.35 * pulse(t, 0, 0.0001, 0.15);
      let aberration = 9 * pulse(t, 0, 0.0001, 0.5);
      S21_HITS.forEach((h, i) => {
        flash = Math.max(flash, (i === 2 ? 0.28 : 0.12) * pulse(t, h, 0.0001, 0.07));
        aberration = Math.max(aberration, 5 * pulse(t, h, 0.0001, 0.3));
      });
      return { exposure: 1.05, saturation: 0.95, vignette: 0.55, bloom: 0.55, flash, aberration, split: 0.65 };
    },
  };
}

// ── 22 Vrikka, die Zählerin: Ward-Blase, ein Krit zerschlägt sie, Schuldplaketten fliegen ──────────────
function s22(): Shot {
  const group = g();
  let hero!: Puppet;
  let boss!: Puppet;
  let ward!: Ward;
  let ripple!: Ring;
  let shards!: Burst;
  let plaques!: Burst;
  let hit1!: HitFx;
  let hit2!: HitFx;
  let atmo!: Atmosphere;
  const H1 = BEAT;
  const H2 = 2 * BEAT;
  const center = V(0.9, 1.25, 0);
  return {
    id: "22", t0: 50.66, t1: 53.26, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_1.webp", { horizon: 0.42 }));
      hero = await figure(stage, HERO, heroOpts);
      boss = await figure(stage, RAID_CAST.tally, mobOpts(2.3));
      boss.group.position.set(center.x, 0, 0);
      group.add(hero.group, boss.group);
      ward = new Ward(group);
      ripple = new Ring(C(1.0, 1.3, 1.8), false);
      shards = new Burst({ seed: 221, count: 140, origin: center, originSpread: V(1.6, 2.0, 0.6), dir: V(0.6, 0.4, 0.4), spread: 1.0, speed: [2, 7], life: [0.6, 1.4], gravity: -5, drag: 1.4, stretch: 0.025, width: 0.04, colors: [C(1.1, 1.4, 1.9), C(0.3, 0.45, 0.8)], tex: TEX.shard(), birthFade: 0.06 });
      plaques = new Burst({ seed: 222, count: 40, origin: V(0.9, 1.3, 0.1), originSpread: V(0.6, 0.6, 0.3), dir: V(0.5, 1, 0.5), spread: 0.9, speed: [2, 5], life: [0.9, 1.6], gravity: -6, drag: 0.6, stretch: 0, width: 0.09, colors: [C(1.0, 0.75, 0.35), C(0.55, 0.38, 0.15)], additive: false, tex: TEX.soft() });
      group.add(ripple.mesh, shards.mesh, plaques.mesh);
      hit1 = new HitFx({ at: H1, tau: H1, point: V(-0.05, 1.3, 0.6), seed: 223, sparks: 40 }, group, [C(1.6, 2.0, 2.6), C(0.4, 0.6, 1.0)]);
      hit2 = new HitFx({ at: H2, tau: H2, point: V(0.2, 1.25, 0.5), dmg: "2 760", crit: true, seed: 224 }, group);
      atmo = atmosphere(group, 221, [0.55, 0.5, 0.46], [2.6, 1.0, 0.3], 500, 120);
    },
    update(t, stage) {
      // Orbit um die Zählerin, ca. 80°
      const k = easeInOutCubic(t / 2.59);
      const cx = -0.6 + 1.3 * k;
      setCam(stage, shake([cx, 1.55, 5.6 - 0.3 * k], 0.06 * pulse(t, H2, 0.0001, 0.3), t, 22), [cx * 0.7 + 0.05, 1.4, 0], 36);
      const cam = stage.camera.position;
      hero.group.position.set(lungeX(t, H1, -1.3, -0.75) + lungeX(t, H2, 0, 0.35), 0, 0.25);
      hero.u("uBend").value = lungeBend(t, H1) + lungeBend(t, H2, 0.13);
      hero.u("uRim").value = 0.3;
      hero.face(cam);
      boss.group.position.set(center.x + recoil(t, H2, 0.5), 0, 0);
      boss.u("uFlash").value = 0.15 * pulse(t, H2, 0.0001, 0.12);
      boss.u("uFlashColor").value.setRGB(0.8, 0.88, 1.0);
      boss.u("uBreath").value = Math.sin(t * 3) * 0.015;
      boss.u("uRim").value = 0.4;
      boss.u("uRimColor").value.setRGB(0.6, 0.75, 1.0);
      boss.face(cam);
      // Ward hält beim ersten Hieb (Flackern), bricht beim Krit
      const alive = t < H2 ? 1 : 0;
      const pop = 1 + 0.12 * pulse(t, H2 - 0.02, 0.02, 0.0001);
      const flick = 1 + 0.6 * pulse(t, H1, 0.0001, 0.2) + 0.08 * Math.sin(t * 17);
      ward.set(center, 1.35 * pop, alive * flick * smooth(t / 0.2));
      ripple.update(t - H1, 0.35, 1.0, V(0.0, 1.3, 0.5), cam, 0.8);
      shards.update(t - H2, cam);
      plaques.update(t - H2 - 0.03, cam);
      hit1.update(t, t, cam);
      hit2.update(t, t, cam);
      runAtmo(atmo, stage, 53 + t);
    },
    grade: (t) => {
      const h = hit2.grade(t);
      return { exposure: 1.0, saturation: 0.92, vignette: 0.6, bloom: 0.55, split: 0.6, flash: Math.max(h.flash, 0.1 * pulse(t, H1, 0.0001, 0.06)), aberration: h.aberration };
    },
  };
}

// ── 23 Fernkampf: Feuerpfeil in Bullet-Time, Kamera am Pfeil, Einschlag bei Krogg auf Schlag 3 ─────────
function s23(): Shot {
  const group = g();
  let ranger!: Puppet;
  let brute!: Puppet;
  let arrow!: Puppet;
  let tip!: Glow;
  let streak!: Glow;
  let trail!: Trail;
  let fire!: Burst;
  let burst!: Burst;
  let dmg!: DamageNumber;
  let atmo!: Atmosphere;
  const LOOSE = 0.3;
  const IMPACT = 2 * BEAT; // 54,56 s
  const A = V(-1.8, 1.55, 0.3);
  const B = V(2.0, 1.45, -0.6);
  const at = (u: number): THREE.Vector3 => {
    const k = Math.max(0, Math.min(1, (u - LOOSE) / (IMPACT - LOOSE)));
    return A.clone().lerp(B, k).add(V(0, 0.12 * Math.sin(k * Math.PI), 0));
  };
  return {
    id: "23", t0: 53.26, t1: 55.53, group,
    async setup(stage) {
      const bd = await backdrop(stage, "battlescreens/gk_room_2.webp", { horizon: 0.45 });
      group.add(bd);
      ranger = await figure(stage, "portraits/elf_ranger_f.webp", { height: 2.25 });
      ranger.group.position.set(-2.4, 0, 0.3);
      brute = await figure(stage, RAID_CAST.quarter, mobOpts(2.7));
      brute.group.position.set(2.5, 0, -0.7);
      arrow = await card(stage, "items/copper_arrow.webp", 0.5);
      tip = new Glow(C(2.4, 1.3, 0.45));
      streak = new Glow(C(1.8, 0.8, 0.25));
      trail = new Trail(260, [2.6, 1.1, 0.3], 231);
      fire = new Burst({ seed: 232, count: 170, origin: V(2.3, 1.3, -0.5), originSpread: V(0.9, 1.6, 0.4), dir: V(0, 1, 0.1), spread: 0.5, speed: [0.8, 2.6], life: [0.4, 0.9], gravity: 2, drag: 0.8, stretch: 0.05, width: 0.03, colors: [C(4.5, 2.4, 0.7), C(1.3, 0.3, 0.05)], emitOver: 1.0 });
      burst = new Burst({ seed: 233, count: 120, origin: B, dir: V(1, 0.4, 0.3), spread: 0.85, speed: [3, 9], life: [0.4, 1.0], gravity: -8, drag: 1.3, stretch: 0.03, width: 0.022, colors: [C(3.2, 2.0, 0.9), C(1.4, 0.35, 0.06)], birthFade: 0.06 });
      dmg = new DamageNumber("1 932", { crit: true });
      group.add(ranger.group, brute.group, arrow.group, tip.sprite, streak.sprite, trail.cloud.points, fire.mesh, burst.mesh, dmg.sprite);
      atmo = atmosphere(group, 231, [0.55, 0.5, 0.46], [2.6, 1.0, 0.3], 500, 140);
    },
    update(t, stage) {
      const p = at(t);
      const flying = t > LOOSE && t < IMPACT;
      if (t < LOOSE) {
        setCam(stage, [-1.5, 1.6, 4.9], [-1.9, 1.5, 0], 34);
      } else if (t < IMPACT) {
        // Kamera reitet neben dem Pfeil, leicht zurückhängend
        const f = (t - LOOSE) / (IMPACT - LOOSE);
        setCam(stage, [-1.5 + 2.6 * easeInOutCubic(f), 1.6, 4.9 + 0.5 * Math.sin(f * Math.PI)], [p.x * 0.85, 1.5, p.z * 0.5], 34, 0.02 * Math.sin(t * 3));
      } else {
        const k = ramp(t, IMPACT, 2.27, easeOutCubic);
        setCam(stage, shake([1.1 + 0.2 * k, 1.6, 4.9 + 0.6 * k], 0.08 * pulse(t, IMPACT, 0.0001, 0.35), t, 23), [B.x - 0.2, 1.5, -0.3], 34);
      }
      const cam = stage.camera.position;
      ranger.u("uLean").value = -0.05 * ramp(t, 0, LOOSE) + 0.07 * pulse(t, LOOSE, 0.0001, 0.3);
      ranger.u("uBreath").value = Math.sin(t * 2.4) * 0.01;
      ranger.face(cam);
      brute.group.position.set(2.5 + recoil(t, IMPACT, 0.35), 0, -0.7);
      brute.u("uFlash").value = 0.14 * pulse(t, IMPACT, 0.0001, 0.12);
      brute.u("uFlashColor").value.setRGB(0.95, 0.75, 0.55);
      const burn = ramp(t, IMPACT, IMPACT + 0.2);
      const flick = 0.5 + 0.5 * Math.sin(t * 31);
      brute.u("uTint").value.setRGB(1 + 0.3 * burn * flick, 1 - 0.05 * burn, 1 - 0.25 * burn * flick);
      brute.u("uBreath").value = Math.sin(t * 3) * 0.015;
      brute.face(cam);
      arrow.group.visible = flying;
      arrow.group.position.copy(p);
      arrow.mesh.rotation.z = -Math.PI / 4;
      arrow.face(cam);
      tip.set(V(p.x + 0.22, p.y, p.z), 0.13, flying ? 0.5 : 0);
      streak.sprite.visible = flying;
      streak.sprite.position.set(p.x - 0.35, p.y, p.z);
      streak.sprite.scale.set(0.8, 0.06, 1);
      (streak.sprite.material as THREE.SpriteMaterial).opacity = 0.3;
      trail.update(at, LOOSE, Math.min(t, IMPACT), t, stage.camera);
      fire.update(t - IMPACT, cam);
      burst.update(t - IMPACT, cam);
      dmg.update(t - IMPACT, V(B.x + 0.2, B.y + 0.5, B.z + 0.4), 1.0, 1.0);
      runAtmo(atmo, stage, 56 + t);
    },
    grade: (t) => ({ exposure: 1.0, saturation: 0.95, vignette: 0.6, bloom: 0.55, split: 0.65, flash: 0.06 * pulse(t, LOOSE, 0.0001, 0.08) + 0.22 * pulse(t, IMPACT, 0.0001, 0.08), aberration: 6 * pulse(t, IMPACT, 0.0001, 0.3) }),
  };
}

/** 24 Magie-Moment: die bestehende Frost-Szene, jetzt in den Gruben (gk_room_3). */
function s24(): Shot {
  const group = g();
  const scene: TrailerScene = frostMoment("battlescreens/gk_room_3.webp");
  return {
    id: "24", t0: 55.53, t1: 58.44, group,
    setup: (stage) => scene.setup(stage, group),
    update: (t, stage) => scene.update(t, stage),
    grade: (t) => scene.grade(t),
  };
}

// ── 25 Beute: Raid-Truhe springt auf, Set-Teile wirbeln heraus, Halbschlag-Präsentation ─────────────────
const LOOT = [
  "items/gk_fire_chest.webp",
  "items/gk_king_greatsword.webp",
  "items/gk_bleed_head.webp",
  "items/gk_pit_longbow.webp",
  "items/gk_poison_chest.webp",
  "items/gk_fel_staff.webp",
  "items/gk_quarter_shield.webp",
  "items/gk_tally_ring.webp",
  "items/gk_king_cape.webp",
  "items/gk_fire_head.webp",
];
function s25(): Shot {
  const group = g();
  let closed!: Puppet;
  let open!: Puppet;
  const items: Puppet[] = [];
  let coins!: Burst;
  let glow!: Glow;
  let atmo!: Atmosphere;
  const OPEN = BEAT;
  const chestPos = V(0, 0, 2.0);
  return {
    id: "25", t0: 58.44, t1: 61.04, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_1.webp", { horizon: 0.42 }));
      closed = await figure(stage, "ui/raid/raid_chest_closed.webp", { height: 1.5 });
      open = await figure(stage, "ui/raid/raid_chest_open.webp", { height: 1.5 });
      closed.group.position.copy(chestPos);
      open.group.position.copy(chestPos);
      group.add(closed.group, open.group);
      for (const id of LOOT) {
        const c = await card(stage, id, 0.75);
        items.push(c);
        group.add(c.group);
      }
      coins = new Burst({ seed: 251, count: 140, origin: V(0, 0.9, 2.1), originSpread: V(0.8, 0.1, 0.3), dir: V(0, 1, 0.2), spread: 0.6, speed: [3, 7], life: [0.8, 1.6], gravity: -7, drag: 0.5, stretch: 0.01, width: 0.05, colors: [C(2.0, 1.5, 0.7), C(1.0, 0.6, 0.15)], tex: TEX.soft(), birthFade: 0.08 });
      glow = new Glow(C(1.8, 1.3, 0.6));
      group.add(coins.mesh, glow.sprite);
      atmo = atmosphere(group, 251, [0.6, 0.55, 0.5], [2.8, 1.6, 0.5], 300, 220);
    },
    update(t, stage) {
      // claude:2026-10-24T10:24:00+02:00 — Kamera beginnt tief an der Truhe und steigt mit dem Wirbel
      const up = ramp(t, OPEN - 0.1, OPEN + 0.9, easeInOutCubic);
      const th = 0.22 * Math.sin(t * 0.9);
      setCam(stage, shake([Math.sin(th) * 1.2, 1.35 + 0.45 * up, 5.8 - 0.2 * up], 0.05 * pulse(t, OPEN, 0.0001, 0.4) + 0.012 * (1 - ramp(t, 0, OPEN)), t * 4, 25), [0, 1.05 + 0.7 * up, 2.0], 36);
      const cam = stage.camera.position;
      const isOpen = t >= OPEN;
      closed.group.visible = !isOpen;
      open.group.visible = isOpen;
      closed.u("uLean").value = 0.02 * Math.sin(t * 40) * ramp(t, 0.2, OPEN);
      for (const p of [closed, open]) {
        p.u("uFlash").value = 0.125 * pulse(t, OPEN, 0.0001, 0.12);
        p.face(cam);
      }
      coins.update(t - OPEN, cam);
      glow.set(V(0, 0.95, 2.15), 1.0, isOpen ? 0.16 * (1 - 0.6 * ramp(t, OPEN, 2.59)) : 0.06 * ramp(t, 0.2, OPEN));
      // Wirbel: Teile steigen spiralförmig auf; auf jedem Halbschlag wird eines nach vorn gedreht
      const shown = Math.floor((t - OPEN - 0.3) / HALF);
      items.forEach((c, i) => {
        const te = OPEN + 0.04 + i * 0.07;
        const age = t - te;
        c.group.visible = age > 0;
        if (age <= 0) return;
        const ang = (i / items.length) * Math.PI * 2 + age * 2.0;
        const r = 0.2 + 1.15 * easeOutCubic(age / 0.8);
        const y = 0.9 + 1.1 * easeOutCubic(age / 1.0) + 0.2 * Math.sin(age * 2 + i);
        const base = V(Math.cos(ang) * r, y, 2.0 + Math.sin(ang) * r * 0.7);
        const k = i === shown ? pulse(t - OPEN - 0.3 - shown * HALF, 0.12, 0.12, 0.2) : 0;
        const front = V(cam.x * 0.4, 1.65, cam.z - 2.2);
        c.group.position.copy(base.lerp(front, k));
        c.group.scale.setScalar(Math.min(1, age / 0.25) * (1 + 0.3 * k));
        c.mesh.rotation.z = 0.3 * Math.sin(age * 3 + i) * (1 - k);
        c.face(cam);
        c.mesh.rotation.y += Math.PI * 2 * ramp(t - OPEN - 0.3 - shown * HALF, 0, 0.2) * (i === shown ? 1 : 0);
        c.u("uDark").value = 0.25 * (1 - k);
      });
      runAtmo(atmo, stage, 59 + t);
    },
    grade: (t) => ({ exposure: 1.05, saturation: 0.95, vignette: 0.6, bloom: 0.5, split: 0.7, flash: 0.2 * pulse(t, OPEN, 0.0001, 0.12), aberration: 4 * pulse(t, OPEN, 0.0001, 0.3) }),
  };
}

// ── 26 Das geliehene Feuer: Zil'gaths bleiches Feuer frisst am Ward des Helden ──────────────────────────
function s26(): Shot {
  const group = g();
  let hero!: Puppet;
  let mage!: Puppet;
  let ward!: Ward;
  let stream!: Burst;
  let splash!: Burst;
  let hand!: Glow;
  const ripples: Ring[] = [];
  let atmo!: Atmosphere;
  const heroPos = V(-1.4, 0, 0.3);
  const wardC = V(-1.4, 1.2, 0.35);
  return {
    id: "26", t0: 61.04, t1: 63.63, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_4.webp", { horizon: 0.42 }));
      hero = await figure(stage, HERO, heroOpts);
      hero.group.position.copy(heroPos);
      mage = await figure(stage, RAID_CAST.fel, mobOpts(2.2));
      mage.group.position.set(1.6, 0, -0.2);
      group.add(hero.group, mage.group);
      ward = new Ward(group);
      ward.rim.sprite.material.color.setRGB(0.95, 0.88, 0.62);
      ward.fill.sprite.material.color.setRGB(0.5, 0.45, 0.3);
      const pale: [THREE.Color, THREE.Color] = [C(1.5, 1.7, 1.45), C(0.35, 0.45, 0.35)];
      stream = new Burst({ seed: 261, count: 420, origin: V(1.05, 1.35, 0.1), originSpread: V(0.1, 0.15, 0.1), dir: V(-1, 0.05, 0.05), spread: 0.25, speed: [3, 4.2], life: [0.5, 0.75], gravity: 0.6, drag: 2.0, stretch: 0.06, width: 0.05, colors: pale, emitOver: 2.6, tex: TEX.soft() });
      splash = new Burst({ seed: 262, count: 260, origin: V(-0.15, 1.3, 0.4), originSpread: V(0.1, 0.8, 0.5), dir: V(0.2, 0.6, 0.4), spread: 0.9, speed: [0.6, 2], life: [0.25, 0.6], gravity: 0.8, drag: 1.5, stretch: 0.04, width: 0.03, colors: pale, emitOver: 2.2 });
      hand = new Glow(C(1.3, 1.5, 1.2));
      group.add(stream.mesh, splash.mesh, hand.sprite);
      for (let i = 0; i < 4; i++) {
        const r = new Ring(C(1.0, 0.95, 0.7), false);
        ripples.push(r);
        group.add(r.mesh);
      }
      atmo = atmosphere(group, 261, [0.6, 0.62, 0.6], [1.3, 1.5, 1.2], 500, 80);
    },
    update(t, stage) {
      const k = easeInOutCubic(t / 2.59);
      setCam(stage, [0.6 - 1.2 * k, 1.55, 5.8 - 0.2 * k], [0.4 - 1.1 * k, 1.45, 0], 38);
      const cam = stage.camera.position;
      hero.u("uLean").value = -0.03 - 0.02 * Math.sin(t * 7);
      hero.u("uRim").value = 0.5;
      hero.u("uRimColor").value.setRGB(0.9, 0.95, 0.85);
      hero.u("uSway").value = 0.35 * Math.sin(t * 5);
      hero.face(cam);
      mage.u("uLean").value = -0.06;
      mage.u("uBreath").value = Math.sin(t * 3) * 0.015;
      mage.u("uRim").value = 0.5;
      mage.u("uRimColor").value.setRGB(0.9, 1.0, 0.85);
      mage.face(cam);
      stream.update(t, cam);
      splash.update(t - 0.35, cam);
      hand.set(V(1.05, 1.35, 0.15), 0.9, 0.7 + 0.15 * Math.sin(t * 23));
      // Ward hält: Rand pulsiert auf den Schlägen
      let hitPulse = 0;
      ripples.forEach((r, i) => {
        r.update(t - i * BEAT, 0.4, 1.2, V(-0.2, 1.3, 0.45), cam, 0.7);
        hitPulse = Math.max(hitPulse, pulse(t, i * BEAT, 0.0001, 0.2));
      });
      ward.set(wardC, 1.25, (0.9 + 0.5 * hitPulse + 0.1 * Math.sin(t * 19)) * smooth(t / 0.15));
      runAtmo(atmo, stage, 61 + t);
    },
    grade: () => ({ exposure: 0.95, saturation: 0.55, vignette: 0.65, bloom: 0.5, split: 0.35, tint: [0.97, 1.0, 0.98] }),
  };
}

// ── 27 Kriegskönig Rakkzul in Untersicht, Kran nach oben, vier Phasen auf den Schlägen ─────────────────
const PHASE_TINT: [number, number, number][] = [
  [1.1, 0.98, 0.82], // Schuldbuch (Gold)
  [0.92, 0.98, 1.1], // Zeughaus (Stahl)
  [1.12, 0.9, 0.88], // Gruben (Blut)
  [1.12, 0.95, 0.82], // Erbe des Krieges (Glut)
];
const PHASE_BG = ["gk_room_1", "gk_room_2", "gk_room_3", "gk_room_4"];
function s27(): Shot {
  const group = g();
  const rooms: THREE.Mesh[] = [];
  let king!: Puppet;
  let embers!: Burst;
  let atmo!: Atmosphere;
  return {
    id: "27", t0: 63.63, t1: 66.23, group,
    async setup(stage) {
      for (const r of PHASE_BG) {
        const bd = await backdrop(stage, `battlescreens/${r}.webp`, { horizon: 0.42 });
        rooms.push(bd);
        group.add(bd);
      }
      king = await figure(stage, RAID_CAST.king, mobOpts(3.4));
      king.group.position.set(0.3, 0, 0);
      embers = new Burst({ seed: 271, count: 260, origin: V(0.3, 0.2, 0.2), originSpread: V(3, 0.2, 1.5), dir: V(0, 1, 0), spread: 0.3, speed: [1, 3], life: [0.8, 1.8], gravity: 0.4, drag: 0.6, stretch: 0.04, width: 0.02, colors: [C(4, 2, 0.6), C(1.2, 0.25, 0.05)], emitOver: 2.6 });
      group.add(king.group, embers.mesh);
      atmo = atmosphere(group, 271, [0.55, 0.5, 0.46], [2.6, 1.0, 0.3], 500, 160);
    },
    update(t, stage) {
      const i = Math.min(3, Math.floor(t / BEAT));
      rooms.forEach((r, k) => { r.visible = k === i; });
      const k = easeInOutCubic(t / 2.59);
      setCam(stage, shake([0.3 * k, 0.7 + 0.9 * k, 5.4 + 0.4 * k], 0.04 * pulse(t % BEAT, 0, 0.0001, 0.25), t, 27), [0.3, 1.95 - 0.2 * k, 0], 34);
      const cam = stage.camera.position;
      const lt = t - i * BEAT;
      king.u("uFlash").value = 0.11 * pulse(lt, 0, 0.0001, 0.12);
      king.u("uFlashColor").value.setRGB(...PHASE_TINT[i]!.map((v) => Math.min(1, v * 0.9)) as [number, number, number]);
      king.u("uBreath").value = Math.sin(t * 2.2) * 0.02;
      king.u("uRim").value = 0.4;
      king.u("uRimDir").value.set(-0.6, 0.8);
      king.face(cam);
      embers.update(t, cam);
      runAtmo(atmo, stage, 64 + t);
    },
    grade: (t) => {
      const i = Math.min(3, Math.floor(t / BEAT));
      const lt = t - i * BEAT;
      return { exposure: 1.0, saturation: 0.9, vignette: 0.65, bloom: 0.5, tint: PHASE_TINT[i], flash: 0.16 * pulse(lt, 0, 0.0001, 0.08), aberration: 5 * pulse(lt, 0, 0.0001, 0.25) };
    },
  };
}

// ── 28 Höhepunkt: Held gegen König, drei Hiebe; der letzte bei 68,5 s in 0,1× mit Treffer-Stopp ───────
const T28 = [BEAT, 2 * BEAT, 68.5 - 66.23];
const S28_SEGS = [
  { from: 0, rate: 1 },
  { from: T28[2]! - 0.12, rate: 0.12 },
  { from: T28[2]!, rate: 0 },
  { from: T28[2]! + 0.07, rate: 0.1 },
  { from: T28[2]! + 0.2, rate: 0.35 },
];
const a28 = (t: number): number => timeRemap(S28_SEGS, t);
function s28(): Shot {
  const group = g();
  let hero!: Puppet;
  let king!: Puppet;
  const hits: HitFx[] = [];
  let mega!: Burst;
  let ring!: Ring;
  let big!: DamageNumber;
  let atmo!: Atmosphere;
  return {
    id: "28", t0: 66.23, t1: 68.82, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_4.webp", { horizon: 0.42 }));
      hero = await figure(stage, HERO, heroOpts);
      king = await figure(stage, RAID_CAST.king, mobOpts(3.3));
      king.group.position.set(1.35, 0, -0.1);
      group.add(hero.group, king.group);
      T28.slice(0, 2).forEach((tau, i) => hits.push(new HitFx({ at: a28(tau), tau, point: V(0.75, 1.45 + i * 0.25, 0.3), dmg: i ? "6 140" : "4 388", arc: i ? [3.0, 0.2] : undefined, seed: 281 + i }, group)));
      const A3 = a28(T28[2]!);
      mega = new Burst({ seed: 284, count: 200, origin: V(0.8, 1.6, 0.35), dir: V(1, 0.4, 0.3), spread: 0.95, speed: [3, 13], life: [0.6, 1.6], gravity: -6, drag: 1.0, stretch: 0.035, width: 0.026, colors: [C(2.6, 1.9, 1.0), C(1.5, 0.38, 0.08)], birthFade: 0.04 });
      ring = new Ring(C(1.4, 1.1, 0.8), false);
      big = new DamageNumber("48 210", { crit: true });
      hits.push(new HitFx({ at: A3, tau: T28[2]!, point: V(0.8, 1.6, 0.35), seed: 286, sparks: 30 }, group));
      group.add(mega.mesh, ring.mesh, big.sprite);
      atmo = atmosphere(group, 281, [0.55, 0.5, 0.46], [2.6, 1.0, 0.3], 600, 180);
    },
    update(t, stage) {
      const a = a28(t);
      const A3 = a28(T28[2]!);
      // Dolly ins Gesicht des Helden, beim letzten Hieb Stillstand
      const k = easeInOutCubic(Math.min(1, t / T28[2]!));
      // claude:2026-10-24T10:24:00+02:00 — Dolly auf den Zusammenprall (Held links, König rechts), damit der letzte Hieb im Bild liegt
      const pos: Vec3 = [0.5 - 0.35 * k, 1.55 + 0.1 * k, 5.8 - 1.2 * k];
      const shakeAmt = T28.reduce((s, h, i) => s + (i === 2 ? 0.1 : 0.05) * pulse(t, h, 0.0001, i === 2 ? 0.5 : 0.25), 0);
      setCam(stage, shake(pos, shakeAmt, a, 28), [0.15 + 0.1 * k, 1.45 + 0.15 * k, 0], 38 - 3 * k);
      const cam = stage.camera.position;
      const hs = T28.map(a28);
      hero.group.position.set(-1.2 + hs.reduce((s, h, i) => s + lungeX(a, h, 0, i === 2 ? 0.75 : 0.45), 0), 0, 0.3);
      hero.u("uBend").value = hs.reduce((s, h, i) => s + lungeBend(a, h, i === 2 ? 0.15 : 0.11), 0);
      hero.u("uSway").value = Math.sin(a * 5) * 0.4;
      hero.u("uRim").value = 0.35;
      hero.face(cam);
      king.group.position.set(1.35 + hs.reduce((s, h) => s + recoil(a, h, 0.25), 0), 0, -0.1);
      king.u("uFlash").value = hs.reduce((s, h, i) => Math.max(s, (i === 2 ? 0.25 : 0.14) * pulse(a, h, 0.0001, i === 2 ? 0.08 : 0.1)), 0);
      king.u("uFlashColor").value.setRGB(0.95, 0.8, 0.62);
      king.u("uBreath").value = Math.sin(t * 2.2) * 0.02;
      king.u("uLean").value = 0.1 * ramp(a, A3, A3 + 0.12);
      king.face(cam);
      hits.forEach((h) => h.update(a, t, cam));
      mega.update(a - A3 + 0.1, cam);
      ring.update(a - A3, 0.25, 2.4, V(0.8, 1.6, 0.35), cam, 1);
      big.update((a - A3) * 3.2, V(0.3, 2.0, 0.7), 1.15, 1.6);
      runAtmo(atmo, stage, 66 + a);
    },
    grade: (t) => {
      let flash = 0;
      let aberration = 0;
      T28.forEach((h, i) => {
        flash = Math.max(flash, (i === 2 ? 0.6 : 0.14) * pulse(t, h, 0.0001, i === 2 ? 0.14 : 0.07));
        aberration = Math.max(aberration, (i === 2 ? 12 : 5) * pulse(t, h, 0.0001, 0.35));
      });
      return { exposure: 1.05, saturation: 0.95, vignette: 0.6, bloom: 0.6, split: 0.65, flash, aberration };
    },
  };
}

// ── 29 Einbruch: der König zerfällt zu Asche, das Zepter fällt in Zeitlupe, die Farbe weicht ───────────
function s29(): Shot {
  const group = g();
  let hero!: Puppet;
  let king!: Puppet;
  let scepter!: Puppet;
  let ash!: Burst;
  let puff!: Burst;
  let atmo!: Atmosphere;
  const LAND = 2.15;
  return {
    id: "29", t0: 68.82, t1: 71.41, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_4.webp", { horizon: 0.42 }));
      hero = await figure(stage, HERO, heroOpts);
      hero.group.position.set(-1.1, 0, 0.3);
      king = await figure(stage, RAID_CAST.king, mobOpts(3.3));
      king.group.position.set(1.6, 0, -0.1);
      scepter = await card(stage, "items/gk_king_scepter.webp", 1.3);
      ash = new Burst({ seed: 291, count: 320, origin: V(1.6, 1.6, -0.1), originSpread: V(1.4, 3.0, 0.4), dir: V(0.3, 1, 0), spread: 0.6, speed: [0.3, 1.2], life: [1.0, 2.2], gravity: 0.3, drag: 0.6, stretch: 0.03, width: 0.022, colors: [C(3.2, 1.5, 0.45), C(0.4, 0.36, 0.33)], emitOver: 1.4 });
      puff = new Burst({ seed: 292, count: 40, origin: V(0.5, 0.05, 1.3), originSpread: V(0.4, 0, 0.3), dir: V(0, 0.4, 0), spread: 1.0, speed: [0.4, 1.4], life: [0.8, 1.4], gravity: 0.15, drag: 2.0, stretch: 0, width: 0.32, colors: [C(0.36, 0.33, 0.3), C(0.2, 0.18, 0.16)], additive: false, tex: TEX.soft() });
      group.add(hero.group, king.group, scepter.group, ash.mesh, puff.mesh);
      atmo = atmosphere(group, 291, [0.6, 0.58, 0.56], [2.0, 0.9, 0.3], 700, 60);
    },
    update(t, stage) {
      setCam(stage, [0.3 + 0.1 * t / 2.59, 1.55, 6.0 - 0.3 * t / 2.59], [0.2, 1.45, 0], 38);
      const cam = stage.camera.position;
      hero.u("uSway").value = 0.25 * Math.sin(t * 1.4);
      hero.u("uBreath").value = Math.sin(t * 1.8) * 0.02;
      hero.face(cam);
      king.u("uDissolve").value = 1.05 * ramp(t, 0.1, 1.7);
      king.u("uDark").value = 0.3 * ramp(t, 0, 0.6);
      king.face(cam);
      ash.update(t - 0.1, cam);
      // Zepter fällt langsam, dreht sich, schlägt bei LAND in die Asche
      const f = Math.min(1, t / LAND);
      scepter.group.position.set(1.0 - 0.5 * f, 2.6 - 2.0 * f * f, 1.3);
      scepter.mesh.rotation.z = 0.4 + 2.2 * f;
      scepter.face(cam);
      puff.update(t - LAND, cam);
      runAtmo(atmo, stage, 69 + t * 0.35);
    },
    grade: (t) => ({ exposure: 0.95, saturation: 0.9 - 0.62 * ramp(t, 0.1, 1.8), vignette: 0.7, bloom: 0.45, split: 0.55, contrast: 1.1 }),
  };
}

export const raidShots = (): Shot[] => [s19(), s20(), s21(), s22(), s23(), s24(), s25(), s26(), s27(), s28(), s29()];
