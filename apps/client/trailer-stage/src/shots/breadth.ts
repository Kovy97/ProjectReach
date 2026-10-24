// claude:2026-10-24T10:24:00+02:00 — Trailer v3, Shots 12–18 (Aufbau 2, Musik 27,32–45,47 s): Berufe, Handwerkskette, Leben im
// Handwerk, Zonenflug, drei Kampfstile, Bestiarium mit Elementen, Dungeon und Champion.
// claude:2026-10-24T10:24:00+02:00 — Kameras an die Malerposition; Gegenstände kommen zur Kamera statt Zoom in die Kulisse (Chef 24.10.).
import * as THREE from "three";
import { easeInOutCubic, easeOutCubic, pulse, ramp, smooth, track, type Vec3 } from "../anim";
import type { Atmosphere } from "../env";
import { Bolt, Burst, Glow, TEX } from "../fx";
import { atmosphere, backdrop, card, figure, HitFx, lungeBend, lungeX, recoil, runAtmo, setCam, shake, type Shot } from "../kit";
import type { Puppet } from "../puppet";

const BEAT = 0.6486;
const HALF = BEAT / 2;
const g = () => new THREE.Group();
const C = (r: number, gg: number, b: number) => new THREE.Color(r, gg, b);

// ── 12 Berufe in acht Halbschlägen ──────────────────────────────────────────────────────────────────
interface Vig { bg: string; fig: string; h: number; item: string; horizon?: number; fx?: "sparks" | "drops" | "gold" }
const TRADES: Vig[] = [
  { bg: "skill-backgrounds/fishing.webp", fig: "portraits/elf_fisher_f.webp", h: 2.2, item: "items/raw_trout.webp", fx: "drops" },
  { bg: "skill-backgrounds/foraging.webp", fig: "portraits/human_forager_f.webp", h: 2.2, item: "items/herb_marshroot.webp" },
  { bg: "skill-backgrounds/thieving.webp", fig: "portraits/goblin_thief_m.webp", h: 1.8, item: "items/stolen_coinpurse.webp", fx: "gold" },
  { bg: "skill-backgrounds/cooking.webp", fig: "portraits/orc_cook_m.webp", h: 2.35, item: "items/cooked_trout.webp" },
  { bg: "skill-backgrounds/herblore.webp", fig: "portraits/elf_herbalist_f.webp", h: 2.2, item: "items/salve_of_mending.webp" },
  { bg: "skill-backgrounds/leatherworking.webp", fig: "portraits/human_leatherworker_m.webp", h: 2.25, item: "items/hardened_leather.webp" },
  { bg: "skill-backgrounds/jewelcrafting.webp", fig: "portraits/goblin_jeweler_m.webp", h: 1.8, item: "items/emberglass_loop.webp", fx: "gold" },
  { bg: "skill-backgrounds/runecrafting.webp", fig: "", h: 0, item: "items/ring_master_smithing.webp", fx: "gold" },
];

function s12(): Shot {
  const group = g();
  const parts: { grp: THREE.Group; who: Puppet | null; item: Puppet; burst: Burst }[] = [];
  return {
    id: "12", t0: 27.32, t1: 29.91, group,
    async setup(stage) {
      for (let i = 0; i < TRADES.length; i++) {
        const v = TRADES[i]!;
        const grp = g();
        grp.add(await backdrop(stage, v.bg, { horizon: v.horizon ?? 0.42 }));
        let who: Puppet | null = null;
        if (v.fig) {
          who = await figure(stage, v.fig, { height: v.h, chest: 0.7, hip: 0.46 });
          who.group.position.set(-0.7, 0, 0);
          grp.add(who.group);
        }
        const item = await card(stage, v.item, v.fig ? 0.75 : 1.05);
        grp.add(item.group);
        const col: [THREE.Color, THREE.Color] = v.fx === "drops" ? [C(1.2, 1.5, 1.8), C(0.3, 0.45, 0.6)] : v.fx === "gold" ? [C(4, 3, 1.2), C(1.4, 0.7, 0.1)] : [C(3, 2.2, 1.2), C(0.9, 0.4, 0.1)];
        const burst = new Burst({ seed: 120 + i, count: 50, origin: new THREE.Vector3(0.4, 1.2, 0.5), dir: new THREE.Vector3(0.6, 1, 0.4), spread: 0.9, speed: [1.5, 5], life: [0.3, 0.7], gravity: -6, drag: 1.5, stretch: 0.025, width: 0.02, colors: col });
        grp.add(burst.mesh);
        grp.visible = false;
        group.add(grp);
        parts.push({ grp, who, item, burst });
      }
    },
    update(t, stage) {
      const i = Math.min(TRADES.length - 1, Math.floor(t / HALF));
      const lt = t - i * HALF;
      parts.forEach((p, k) => { p.grp.visible = k === i; });
      const p = parts[i]!;
      const last = i === TRADES.length - 1;
      // Zoom-Punch je Vignette
      const push = 0.5 * easeOutCubic(lt / HALF);
      setCam(stage, last ? [0, 1.5, 5.8 - push] : [0.3, 1.55, 6.0 - push], last ? [0, 1.45, 2.2] : [-0.2, 1.4, 0], 36);
      if (p.who) {
        p.who.u("uBend").value = 0.09 * pulse(lt, 0.1, 0.08, 0.2);
        p.who.u("uBreath").value = Math.sin(t * 3) * 0.012;
        p.who.u("uRim").value = 0.25;
        p.who.face(stage.camera.position);
      }
      const k = easeOutCubic(ramp(lt, 0.06, HALF));
      p.item.group.position.set(last ? 0 : 0.55, last ? 1.45 + 0.1 * k : 1.0 + 0.5 * k, last ? 2.2 + 0.6 * k : 0.6 + 1.2 * k);
      p.item.mesh.rotation.z = last ? 0.25 * Math.sin(t * 6) * (1 - k) : 0.5 * (1 - k);
      p.item.face(stage.camera.position);
      p.burst.update(lt - 0.08, stage.camera.position);
    },
    grade: (t) => {
      const i = Math.min(7, Math.floor(t / HALF));
      return { exposure: i === 7 ? 1.05 : 1.0, saturation: 0.95, vignette: 0.6, bloom: i === 7 ? 0.75 : 0.45, flash: 0.1 * pulse(t % HALF, 0.0, 0.0001, 0.06) };
    },
  };
}

// ── 13 Handwerkskette: Erz → Barren → Klinge → Rune, ein Pfeil fliegt vorbei ──────────────────────────
function s13(): Shot {
  const group = g();
  const chain: Puppet[] = [];
  let rune!: Puppet;
  let arrow!: Puppet;
  let sparks: Burst[] = [];
  let atmo!: Atmosphere;
  const ids = ["items/copper_ore.webp", "items/copper_bar.webp", "items/copper_sword.webp"];
  return {
    id: "13", t0: 29.91, t1: 32.5, group,
    async setup(stage) {
      group.add(await backdrop(stage, "skill-backgrounds/smithing.webp", { horizon: 0.42 }));
      for (const id of ids) {
        const c = await card(stage, id, 1.1);
        c.group.position.set(0, 1.35, 3.0);
        chain.push(c);
        group.add(c.group);
      }
      rune = await card(stage, "items/rune_flame_i.webp", 0.5);
      arrow = await card(stage, "items/copper_arrow.webp", 0.7);
      group.add(rune.group, arrow.group);
      for (let i = 0; i < 4; i++) {
        const b = new Burst({ seed: 140 + i, count: 80, origin: new THREE.Vector3(0, 1.05, 3.1), dir: new THREE.Vector3(0, 1, 0.3), spread: 0.9, speed: [2, 7], life: [0.3, 0.9], gravity: -8, drag: 1.3, stretch: 0.03, width: 0.02, colors: [C(3.4, 2.4, 1.2), C(1.6, 0.4, 0.08)], birthFade: 0.06 });
        sparks.push(b);
        group.add(b.mesh);
      }
      atmo = atmosphere(group, 113, [0.6, 0.55, 0.5], [2.8, 1.1, 0.35], 200, 140);
    },
    update(t, stage) {
      setCam(stage, track<Vec3>([{ t: 0, v: [0.15, 1.55, 6.0] }, { t: 2.59, v: [-0.1, 1.5, 5.5], ease: (k) => k }], t), [0, 1.4, 3.0], 36);
      const cam = stage.camera.position;
      chain.forEach((c, i) => {
        const a = i * BEAT;
        const b = i === 2 ? 99 : a + BEAT;
        c.group.visible = t >= a - 0.1 && t < b + 0.05;
        const inK = i === 0 ? 0 : 1 - ramp(t, a - 0.1, a + 0.1);
        const outK = ramp(t, b - 0.14, b + 0.04);
        c.u("uDissolve").value = Math.max(inK, outK) * 1.05;
        c.mesh.rotation.z = 0.12 * Math.sin(t * 2 + i);
        c.face(cam);
      });
      // Rune fliegt auf Schlag 3 in die Klinge
      const rk = ramp(t, 3 * BEAT - 0.25, 3 * BEAT, easeInOutCubic);
      rune.group.visible = t > 3 * BEAT - 0.3 && t < 3 * BEAT + 0.05;
      rune.group.position.set(-1.2 + 1.2 * rk, 2.1 - 0.75 * rk, 3.5 - 0.5 * rk);
      rune.face(cam);
      const sword = chain[2]!;
      sword.u("uFlash").value = 0.225 * pulse(t, 3 * BEAT, 0.0001, 0.25);
      sword.mesh.rotation.y = 0.5 * ramp(t, 3 * BEAT, 2.59, easeOutCubic);
      // Pfeil: zieht auf Schlag 2 von rechts nach links durchs Bild (Vorgriff auf den Fernkampf)
      const ak = ramp(t, 2 * BEAT - 0.1, 2 * BEAT + 0.35, (k) => k);
      arrow.group.visible = ak > 0 && ak < 1;
      arrow.group.position.set(2.6 - 5.2 * ak, 1.95, 2.6);
      arrow.mesh.rotation.z = Math.PI * 0.75;
      arrow.face(cam);
      sparks.forEach((s, i) => s.update(t - i * BEAT - 0.02, cam));
      runAtmo(atmo, stage, t + 30);
    },
    grade: (t) => ({ exposure: 1.0, saturation: 0.95, vignette: 0.65, bloom: 0.55, flash: 0.15 * pulse(t % BEAT, 0.02, 0.0001, 0.08) }),
  };
}

// ── 14 Leben im Handwerk: vier Ereignis-Gemälde, je ein Schlag, als begehbare Kulisse ────────────────
// claude:2026-10-24T10:24:00+02:00 — statt fallender Karten (wirkten flach) Kamerafahrten in die Ereignisbilder selbst.
function s14(): Shot {
  const group = g();
  const sets: THREE.Group[] = [];
  const ids = ["events/rich_vein.webp", "events/fish_shoal.webp", "events/bountiful_harvest.webp", "events/masterpiece.webp"];
  // nah an der Malerposition (z 10), damit Boden und Wand nicht verzerren; enges Objektiv wegen 3:2-Bildern
  const drift: [Vec3, Vec3][] = [
    [[-0.3, 1.6, 6.2], [0.3, 1.55, 5.3]],
    [[0.3, 1.65, 6.1], [-0.25, 1.55, 5.3]],
    [[0, 1.75, 6.2], [0, 1.5, 5.2]],
    [[-0.25, 1.5, 5.3], [0.25, 1.6, 6.2]],
  ];
  return {
    id: "14", t0: 32.5, t1: 35.1, group,
    async setup(stage) {
      for (const id of ids) {
        const grp = g();
        grp.add(await backdrop(stage, id, { horizon: 0.5, nearDist: 3.5, wallDist: 20 }));
        grp.visible = false;
        sets.push(grp);
        group.add(grp);
      }
    },
    update(t, stage) {
      const i = Math.min(ids.length - 1, Math.floor(t / BEAT));
      const lt = t - i * BEAT;
      sets.forEach((s, k) => { s.visible = k === i; });
      const [a, b] = drift[i]!;
      const k = easeOutCubic(lt / BEAT);
      const pos: Vec3 = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      setCam(stage, pos, [pos[0] * 0.3, 1.5, 0], 38);
    },
    grade: (t) => ({ exposure: 1.05, saturation: 0.95, vignette: 0.6, bloom: 0.4, split: 0.65, flash: 0.22 * pulse(t % BEAT, 0, 0.0001, 0.1) }),
  };
}

// ── 15 Zonenflug: sechs Zonen-Gemälde, die Kamera hält kurz und stößt dann durch ins nächste ───────────
// claude:2026-10-24T10:24:00+02:00 — Stufenflug statt Dauerfahrt: jede Zone steht kurz bildfüllend, Ende auf den Highlands.
function s15(): Shot {
  const group = g();
  const planes: Puppet[] = [];
  const ids = ["pastures", "borderlands", "ashfields", "blackthorn", "crypt", "highlands"];
  const GAP = 7;
  const L = 2.59 / ids.length;
  return {
    id: "15", t0: 35.1, t1: 37.69, group,
    async setup(stage) {
      for (let i = 0; i < ids.length; i++) {
        const c = await card(stage, `zones/${ids[i]}.webp`, 4.2);
        c.group.position.set(0, 1.5, -i * GAP);
        planes.push(c);
        group.add(c.group);
      }
    },
    update(t, stage) {
      const i = Math.min(ids.length - 1, Math.floor(t / L));
      const lt = t - i * L;
      const step = i + (i < ids.length - 1 ? ramp(lt, L - 0.2, L, easeInOutCubic) : 0);
      const z = 5.6 - GAP * step - 0.1 * (t / L);
      setCam(stage, [Math.sin(t * 1.4) * 0.15, 1.5, z], [0, 1.5, z - 5], 40, Math.sin(t * 1.1) * 0.03);
      planes.forEach((p) => {
        const d = z - p.group.position.z;
        p.u("uOpacity").value = smooth((d - 0.3) / 1.2) * (1 - smooth((d - 9) / 4));
        p.group.visible = d > 0.3;
        p.mesh.rotation.y = 0;
      });
    },
    grade: (t) => {
      const lt = t % L;
      const k = t < L ? 0.55 : 0.25;
      return { exposure: 1.05, saturation: 1.0, vignette: 0.5, bloom: 0.4, flash: k * pulse(lt, 0, 0.0001, 0.14), aberration: 4 * pulse(lt, 0, 0.0001, 0.25) };
    },
  };
}

// ── 16 Drei Wege zu kämpfen (je ein Schlag), dann alle drei zusammen ───────────────────────────────
function s16(): Shot {
  const group = g();
  const melee = g();
  const ranged = g();
  const magic = g();
  const lineup = g();
  let war!: Puppet;
  let gob!: Puppet;
  let ranger!: Puppet;
  let wolf!: Puppet;
  let arrow!: Puppet;
  let mage!: Puppet;
  let skel!: Puppet;
  const trio: Puppet[] = [];
  let hit!: HitFx;
  let arrowHit!: Burst;
  let arcane!: Burst;
  let arcaneGlow!: Glow;
  return {
    id: "16", t0: 37.69, t1: 40.29, group,
    async setup(stage) {
      melee.add(await backdrop(stage, "battlescreens/borderlands.webp"));
      war = await figure(stage, "portraits/human_warrior_m.webp", { height: 2.25, capeC: [0.62, 0.38], capeR: [0.2, 0.3] });
      gob = await figure(stage, "monsters/goblin_reaver.webp", { height: 2.05, chest: 0.58, hip: 0.36 });
      melee.add(war.group, gob.group);
      hit = new HitFx({ at: 0.32, tau: 0.32, point: new THREE.Vector3(0.45, 1.2, 0.28), dmg: "987", crit: true, seed: 161 }, melee);

      ranged.add(await backdrop(stage, "battlescreens/wildwood.webp"));
      ranger = await figure(stage, "portraits/elf_ranger_f.webp", { height: 2.25 });
      wolf = await figure(stage, "monsters/thorn_wolf.webp", { height: 2.3, chest: 0.45, hip: 0.3 });
      arrow = await card(stage, "items/copper_arrow.webp", 0.55);
      arrowHit = new Burst({ seed: 162, count: 50, origin: new THREE.Vector3(1.3, 1.15, 0.25), dir: new THREE.Vector3(1, 0.4, 0.2), spread: 0.8, speed: [2, 7], life: [0.3, 0.8], gravity: -8, drag: 1.4, stretch: 0.03, width: 0.02, colors: [C(2.4, 1.8, 1.0), C(1.2, 0.35, 0.1)], emitOver: 0.08, birthFade: 0.05 });
      ranged.add(ranger.group, wolf.group, arrow.group, arrowHit.mesh);

      magic.add(await backdrop(stage, "battlescreens/crypt.webp"));
      mage = await figure(stage, "portraits/human_frost_mage_f.webp", { height: 2.2 });
      skel = await figure(stage, "monsters/skeleton_warrior.webp", { height: 2.3, chest: 0.6, hip: 0.4 });
      arcane = new Burst({ seed: 163, count: 90, origin: new THREE.Vector3(-0.9, 1.35, 0.35), dir: new THREE.Vector3(1, 0.05, 0.1), spread: 0.18, speed: [7, 12], life: [0.25, 0.5], gravity: 0, drag: 0.8, stretch: 0.03, width: 0.02, colors: [C(1.2, 1.8, 2.6), C(0.25, 0.5, 1.0)], tex: TEX.shard(), emitOver: 0.14 });
      arcaneGlow = new Glow(C(1.4, 2.0, 3.0));
      magic.add(mage.group, skel.group, arcane.mesh, arcaneGlow.sprite);

      lineup.add(await backdrop(stage, "battlescreens/highlands.webp"));
      for (const [p, h, x] of [["portraits/elf_ranger_f.webp", 2.25, -1.6], ["portraits/human_warrior_m.webp", 2.25, 0], ["portraits/human_frost_mage_f.webp", 2.2, 1.6]] as const) {
        const f = await figure(stage, p, { height: h });
        f.group.position.set(x, 0, x === 0 ? 0.3 : 0);
        trio.push(f);
        lineup.add(f.group);
      }
      group.add(melee, ranged, magic, lineup);
    },
    update(t, stage) {
      const i = Math.min(3, Math.floor(t / BEAT));
      [melee, ranged, magic, lineup].forEach((gr, k) => { gr.visible = k === i; });
      const lt = t - i * BEAT;
      const cam = stage.camera.position;
      if (i === 0) {
        setCam(stage, shake([0.2, 1.55, 5.6], 0.06 * pulse(lt, 0.32, 0.0001, 0.3), lt), [0.2, 1.4, 0], 38);
        war.group.position.set(lungeX(lt, 0.32, -1.3, -0.3), 0, 0);
        war.u("uBend").value = lungeBend(lt, 0.32);
        gob.group.position.set(1.0 + recoil(lt, 0.32), 0, 0.15);
        gob.u("uFlash").value = 0.15 * pulse(lt, 0.32, 0.0001, 0.1);
        war.face(cam);
        gob.face(cam);
        hit.update(lt, lt, cam);
      } else if (i === 1) {
        setCam(stage, [-0.1, 1.55, 5.8], [0, 1.4, 0], 38);
        ranger.group.position.set(-1.25, 0, 0);
        ranger.u("uLean").value = -0.06 * ramp(lt, 0, 0.18) * (1 - ramp(lt, 0.2, 0.3));
        wolf.group.position.set(1.5 + recoil(lt, 0.36, 0.3), 0, 0);
        wolf.u("uFlash").value = 0.15 * pulse(lt, 0.36, 0.0001, 0.1);
        wolf.u("uFlashColor").value.setRGB(0.8, 0.7, 0.6);
        const ak = ramp(lt, 0.2, 0.36, (k) => k);
        arrow.group.visible = ak > 0 && ak < 1;
        arrow.group.position.set(-0.75 + 1.85 * ak, 1.35 - 0.2 * ak, 0.2);
        arrow.mesh.rotation.z = -Math.PI / 4 - 0.1;
        arrowHit.update(lt - 0.36, cam);
        ranger.face(cam);
        wolf.face(cam);
        arrow.face(cam);
      } else if (i === 2) {
        setCam(stage, [0.1, 1.55, 5.8], [0.15, 1.4, 0], 38);
        mage.group.position.set(-1.5, 0, 0.2);
        mage.u("uLean").value = -0.05 * ramp(lt, 0, 0.18) + 0.1 * ramp(lt, 0.2, 0.28, easeOutCubic);
        mage.u("uRim").value = 0.3 + 1.0 * pulse(lt, 0.25, 0.05, 0.3);
        mage.u("uRimColor").value.setRGB(0.6, 0.85, 1.3);
        skel.group.position.set(1.6 + recoil(lt, 0.36, 0.35), 0, 0);
        skel.u("uFlash").value = 0.25 * pulse(lt, 0.36, 0.0001, 0.12);
        skel.u("uFlashColor").value.setRGB(0.75, 0.9, 1.1);
        arcane.update(lt - 0.22, cam);
        arcaneGlow.set(new THREE.Vector3(-0.9, 1.35, 0.35), 0.8, 0.9 * pulse(lt, 0.24, 0.04, 0.25));
        mage.face(cam);
        skel.face(cam);
      } else {
        const k = lt / (2.59 - 3 * BEAT);
        setCam(stage, [0, 1.55, 5.0 + 1.2 * easeOutCubic(k)], [0, 1.4, 0], 38);
        trio.forEach((f, n) => {
          f.u("uBreath").value = Math.sin(t * 2.6 + n) * 0.012;
          f.u("uRim").value = 0.3;
          f.face(cam);
        });
      }
    },
    grade: (t) => {
      const i = Math.min(3, Math.floor(t / BEAT));
      const lt = t - i * BEAT;
      const flash = i < 3 ? 0.16 * pulse(lt, 0.34, 0.0001, 0.1) + 0.2 * pulse(lt, 0, 0.0001, 0.06) : 0.3 * pulse(lt, 0, 0.0001, 0.12);
      return { exposure: 1.0, saturation: 0.95, vignette: 0.55, bloom: 0.5, flash, aberration: 4 * pulse(lt, 0.34, 0.0001, 0.25) };
    },
  };
}

// ── 17 Bestiarium mit Element-Signaturen (je ein Schlag) ────────────────────────────────────────────
function s17(): Shot {
  const group = g();
  const beasts: { grp: THREE.Group; m: Puppet; fx: Burst; extra?: Bolt[] }[] = [];
  const spec: [string, string, number, "frost" | "bleed" | "burn" | "shock"][] = [
    ["battlescreens/crypt.webp", "monsters/skeleton_icemage.webp", 2.3, "frost"],
    ["battlescreens/blackthorn.webp", "monsters/thorn_wolf.webp", 2.3, "bleed"],
    ["battlescreens/ashfields.webp", "monsters/ash_tyrant.webp", 2.8, "burn"],
    ["battlescreens/goblin_warband.webp", "monsters/goblin_warchief.webp", 2.5, "shock"],
  ];
  return {
    id: "17", t0: 40.29, t1: 42.88, group,
    async setup(stage) {
      for (let i = 0; i < spec.length; i++) {
        const [bg, mon, h, el] = spec[i]!;
        const grp = g();
        grp.add(await backdrop(stage, bg));
        const m = await figure(stage, mon, { height: h, chest: 0.55, hip: 0.35 });
        m.group.position.set(0.2, 0, 0);
        grp.add(m.group);
        const colors: Record<string, [THREE.Color, THREE.Color]> = {
          frost: [C(2.2, 2.8, 3.6), C(0.4, 0.6, 1.0)],
          bleed: [C(0.9, 0.08, 0.06), C(0.35, 0.02, 0.02)],
          burn: [C(5, 2.6, 0.8), C(1.4, 0.3, 0.05)],
          shock: [C(1.8, 2.3, 4.0), C(0.5, 0.7, 1.4)],
        };
        const fx = new Burst({ seed: 170 + i, count: el === "burn" ? 160 : 110, origin: new THREE.Vector3(0.2, 1.2, 0.4), originSpread: new THREE.Vector3(0.8, 1.2, 0.3), dir: new THREE.Vector3(0, el === "bleed" ? 0.3 : 1, 0.3), spread: 0.9, speed: el === "burn" ? [1, 3.5] : [2, 6], life: [0.4, 1.0], gravity: el === "bleed" ? -9 : el === "burn" ? 1.5 : -2, drag: 1.2, stretch: el === "frost" ? 0.02 : 0.03, width: el === "bleed" ? 0.04 : 0.025, colors: colors[el]!, additive: el !== "bleed", tex: el === "frost" ? TEX.shard() : el === "bleed" ? TEX.soft() : undefined, emitOver: el === "burn" ? 0.4 : 0.05 });
        grp.add(fx.mesh);
        let extra: Bolt[] | undefined;
        if (el === "shock") {
          extra = [new Bolt(C(1.0, 1.35, 2.2)), new Bolt(C(1.0, 1.35, 2.2)), new Bolt(C(1.0, 1.35, 2.2))];
          extra.forEach((b) => grp.add(b.mesh));
        }
        grp.visible = false;
        group.add(grp);
        beasts.push({ grp, m, fx, extra });
      }
    },
    update(t, stage) {
      const i = Math.min(3, Math.floor(t / BEAT));
      const lt = t - i * BEAT;
      beasts.forEach((b, k) => { b.grp.visible = k === i; });
      const b = beasts[i]!;
      const el = spec[i]![3];
      setCam(stage, shake([0.3, 1.55, 6.0 - 0.7 * easeOutCubic(lt / BEAT)], 0.04 * pulse(lt, 0.05, 0.0001, 0.3), lt, i), [0.2, 1.45, 0], 38);
      const m = b.m;
      m.u("uFrost").value = el === "frost" ? 0.7 * ramp(lt, 0.05, 0.2) : 0;
      m.u("uTime").value = t;
      m.u("uFlash").value = el === "shock" ? 0.4 * pulse(lt, 0.08, 0.0001, 0.12) : el === "bleed" ? 0.0 : 0;
      const burnFlick = el === "burn" ? 0.25 * (0.5 + 0.5 * Math.sin(t * 30)) * ramp(lt, 0.05, 0.15) : 0;
      m.u("uTint").value.setRGB(1 + burnFlick, 1 - (el === "bleed" ? 0.15 * pulse(lt, 0.08, 0.0001, 0.3) : 0), 1 - burnFlick * 0.6);
      m.u("uBreath").value = Math.sin(t * 3) * 0.015;
      m.u("uLean").value = 0.06 * pulse(lt, 0.08, 0.0001, 0.35);
      m.face(stage.camera.position);
      b.fx.update(lt - 0.05, stage.camera.position);
      b.extra?.forEach((bolt, n) => {
        const a = new THREE.Vector3(0.2 + (n - 1) * 0.6, 2.4, 0.4);
        const z = new THREE.Vector3(0.2 + (n - 1) * 0.3, 1.0, 0.4);
        bolt.update(a, z, t + n, stage.camera.position, pulse(lt, 0.08 + n * 0.05, 0.0001, 0.3), 0.025, 300 + n);
      });
    },
    grade: (t) => {
      const i = Math.min(3, Math.floor(t / BEAT));
      const lt = t - i * BEAT;
      const el = spec[i]![3];
      const tint: [number, number, number] = el === "frost" ? [0.9, 0.97, 1.1] : el === "burn" ? [1.08, 0.98, 0.9] : el === "bleed" ? [1.05, 0.95, 0.95] : [0.95, 0.98, 1.08];
      return { exposure: 1.0, saturation: 0.95, vignette: 0.6, bloom: 0.5, tint, flash: 0.25 * pulse(lt, 0.06, 0.0001, 0.1), aberration: 4 * pulse(lt, 0.06, 0.0001, 0.25) };
    },
  };
}

// ── 18 Dungeons und Champions: Champion tritt aus der Glut, Begleiter springt dazwischen ─────────────
function s18(): Shot {
  const group = g();
  let champ!: Puppet;
  let pet!: Puppet;
  let hero!: Puppet;
  let burst!: Burst;
  let atmo!: Atmosphere;
  return {
    id: "18", t0: 42.88, t1: 45.47, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/crypt_depths.webp"));
      champ = await figure(stage, "monsters/elite_crypt_pyroclasp.webp", { height: 2.9, chest: 0.6, hip: 0.4 });
      pet = await figure(stage, "pets/gorehound.webp", { height: 1.3, chest: 0.5, hip: 0.3 });
      hero = await figure(stage, "portraits/human_warrior_m.webp", { height: 2.25, capeC: [0.62, 0.38], capeR: [0.2, 0.3] });
      champ.group.position.set(1.5, 0, -0.4);
      hero.group.position.set(-1.6, 0, 0.3);
      burst = new Burst({ seed: 181, count: 220, origin: new THREE.Vector3(1.5, 1.4, -0.3), originSpread: new THREE.Vector3(1.4, 2.2, 0.6), dir: new THREE.Vector3(0, 1, 0), spread: 0.6, speed: [0.8, 3], life: [0.6, 1.6], gravity: 0.8, drag: 0.8, stretch: 0.04, width: 0.022, colors: [C(4.5, 2.2, 0.7), C(1.2, 0.25, 0.05)], emitOver: 0.8 });
      group.add(champ.group, pet.group, hero.group, burst.mesh);
      atmo = atmosphere(group, 118, [0.5, 0.45, 0.42], [2.8, 1.1, 0.3], 500, 160);
    },
    update(t, stage) {
      const cam = stage.camera.position;
      // bis 1,3 s: Champion erscheint; danach Halbschlag-Schnitte (Champion nah, Begleiter, Held, Champion)
      const cutIdx = t < 1.3 ? -1 : Math.min(3, Math.floor((t - 1.3) / HALF));
      if (cutIdx < 0) {
        setCam(stage, track<Vec3>([{ t: 0, v: [0, 1.6, 6.2] }, { t: 1.3, v: [0.2, 1.55, 5.3], ease: (k) => k }], t), [0.3, 1.5, 0], 38);
      } else {
        const views: [Vec3, Vec3, number][] = [
          [[1.1, 1.95, 4.4], [1.5, 2.0, -0.4], 34],
          [[-0.1, 1.1, 4.4], [0.1, 0.75, 0.6], 36],
          [[-1.2, 1.85, 4.4], [-1.6, 1.8, 0.3], 34],
          [[0.9, 1.75, 4.8], [1.4, 1.8, -0.4], 36],
        ];
        const [p, l, f] = views[cutIdx]!;
        setCam(stage, shake(p, 0.03, t, cutIdx), l, f);
      }
      const rise = ramp(t, 0.1, 0.9, easeOutCubic);
      champ.u("uDark").value = 0.75 * (1 - rise);
      champ.u("uDissolve").value = 1.05 * (1 - ramp(t, 0.05, 0.75));
      champ.u("uRim").value = 0.12;
      champ.u("uRimColor").value.setRGB(1.0, 0.55, 0.2);
      champ.u("uBreath").value = Math.sin(t * 3) * 0.015;
      champ.face(cam);
      // Begleiter springt von links in die Mitte
      const pk = ramp(t, 0.7, 1.35, easeOutCubic);
      pet.group.position.set(-3 + 3.1 * pk, 0.6 * Math.sin(pk * Math.PI), 0.9);
      pet.u("uBreath").value = Math.sin(t * 5) * 0.02;
      pet.face(cam);
      hero.u("uBreath").value = Math.sin(t * 2.6) * 0.012;
      hero.u("uRim").value = 0.3;
      hero.face(cam);
      burst.update(t - 0.05, cam);
      runAtmo(atmo, stage, t + 43);
    },
    grade: (t) => {
      let flash = 0;
      for (let k = 0; k < 4; k++) flash = Math.max(flash, 0.2 * pulse(t, 1.3 + k * HALF, 0.0001, 0.06));
      return { exposure: 1.0, saturation: 0.9, vignette: 0.65, bloom: 0.55, flash, split: 0.7 };
    },
  };
}

export const breadthShots = (): Shot[] => [s12(), s13(), s14(), s15(), s16(), s17(), s18()];
