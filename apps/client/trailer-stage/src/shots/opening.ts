// claude:2026-10-24T10:24:00+02:00 — Trailer v3, Shots 01–08 (Kaltstart und Aufbau 1, Musik 0,00–22,13 s).
// claude:2026-10-24T10:24:00+02:00 — Kameras an die Malerposition (z ≤ 6,2, 34–40°), Gemälde unvergrößert und scharf (Chef 24.10.).
import * as THREE from "three";
import { easeInOutCubic, easeOutCubic, pulse, ramp, smooth, track, wobble, type Vec3 } from "../anim";
import type { Atmosphere } from "../env";
import { Burst, Glow, TEX } from "../fx";
import { atmosphere, backdrop, card, figure, runAtmo, setCam, type Shot } from "../kit";
import type { Puppet } from "../puppet";
import type { Stage } from "../stage";

const BEAT = 0.6486;
const g = () => new THREE.Group();

/** 01 Kaltstart: Schwarz, ein Glutfunke steigt, mit dem ersten Bass zeichnet sich die verlorene Welt ab. */
function s01(): Shot {
  const group = g();
  let atmo!: Atmosphere;
  const ember = new Glow(new THREE.Color(3.2, 1.5, 0.45));
  const halo = new Glow(new THREE.Color(1.2, 0.5, 0.15));
  let trail!: Burst;
  return {
    id: "01", t0: 0, t1: 3.97, group,
    async setup(stage) {
      group.add(await backdrop(stage, "ui/ember_reliquary_bg.webp", { horizon: 0.43 }));
      atmo = atmosphere(group, 101, [0.5, 0.48, 0.46], [2.2, 0.9, 0.3], 400, 60);
      trail = new Burst({ seed: 5, count: 60, origin: new THREE.Vector3(0, 0.2, 2.2), dir: new THREE.Vector3(0, -1, 0), spread: 0.3, speed: [0.05, 0.25], life: [0.6, 1.4], gravity: 0.2, drag: 2, stretch: 0, width: 0.03, colors: [new THREE.Color(2.5, 1.0, 0.3), new THREE.Color(0.6, 0.15, 0.03)], emitOver: 3.5, tex: TEX.soft() });
      group.add(ember.sprite, halo.sprite, trail.mesh);
    },
    update(t, stage) {
      const y = -0.3 + 2.9 * smooth(t / 3.9) + Math.sin(t * 2.1) * 0.05;
      const x = Math.sin(t * 1.3) * 0.12;
      const p = new THREE.Vector3(x, y, 2.2);
      ember.set(p, 0.09 + 0.02 * Math.sin(t * 9), 1);
      halo.set(p, 0.55, 0.35 + 0.1 * Math.sin(t * 7));
      trail.update(t, stage.camera.position);
      trail.mesh.position.set(x, y - 0.2, 0);
      setCam(stage, track<Vec3>([{ t: 0, v: [0, 1.2, 6.2] }, { t: 3.97, v: [0, 1.85, 5.7] }], t), [x * 0.5, y * 0.6 + 0.9, 0], 36);
      runAtmo(atmo, stage, t, ramp(t, 1.3, 3.5));
    },
    grade: (t) => ({ exposure: 0.15 + 0.45 * ramp(t, 1.35, 3.8), fade: 1 - ramp(t, 0.15, 0.9), vignette: 0.85, saturation: 0.8, bloom: 0.6 }),
  };
}

/** 02 Die verlorene Welt: die Festung des Widersachers, Kran abwärts. */
function s02(): Shot {
  const group = g();
  let atmo!: Atmosphere;
  return {
    id: "02", t0: 3.97, t1: 6.56, group,
    async setup(stage) {
      group.add(await backdrop(stage, "ui/mainmenu.webp", { horizon: 0.42 }));
      atmo = atmosphere(group, 102, [0.45, 0.42, 0.4], [2.6, 1.0, 0.3], 500, 160);
    },
    update(t, stage) {
      const k = t / 2.59;
      setCam(stage, track<Vec3>([{ t: 0, v: [-0.3, 2.3, 6.2] }, { t: 1, v: [0.2, 1.65, 5.5], ease: easeInOutCubic }], k), track<Vec3>([{ t: 0, v: [-0.15, 2.3, -6] }, { t: 1, v: [0.15, 1.6, -6], ease: easeInOutCubic }], k), 38);
      runAtmo(atmo, stage, t + 4);
    },
    grade: () => ({ exposure: 1.2, saturation: 0.95, vignette: 0.6, bloom: 0.45 }),
  };
}

/** 03 Die Diener: Silhouetten im Nebel, jeder Schlag erhellt eine Gestalt mit einem Blitz. */
function s03(): Shot {
  const group = g();
  const cast: Puppet[] = [];
  let atmo!: Atmosphere;
  const spec: [string, number, number, number][] = [
    ["monsters/goblin_warchief.webp", -3.0, 0.3, 2.2],
    ["monsters/skeleton_warrior.webp", -1.0, -0.6, 2.3],
    ["monsters/thorn_wolf.webp", 1.1, 0.2, 2.2],
    ["monsters/highland_wyvern.webp", 3.3, -1.2, 3.2],
  ];
  return {
    id: "03", t0: 6.56, t1: 9.16, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/ashfields.webp", { horizon: 0.42 }));
      for (const [p, x, z, h] of spec) {
        const f = await figure(stage, p, { height: h, chest: 0.55, hip: 0.35 });
        f.group.position.set(x, 0, z);
        cast.push(f);
        group.add(f.group);
      }
      atmo = atmosphere(group, 103, [0.4, 0.4, 0.42], [1.4, 0.6, 0.2], 600, 30);
    },
    update(t, stage) {
      setCam(stage, track<Vec3>([{ t: 0, v: [-1.8, 1.5, 6.0] }, { t: 2.59, v: [1.8, 1.55, 5.8], ease: (k) => k }], t), track<Vec3>([{ t: 0, v: [-1.6, 1.4, 0] }, { t: 2.59, v: [1.6, 1.45, 0], ease: (k) => k }], t), 38);
      cast.forEach((f, i) => {
        const lit = pulse(t, i * BEAT + 0.02, 0.0001, 0.42);
        f.u("uDark").value = 0.82 - 0.7 * lit;
        f.u("uRim").value = 0.25 + 0.6 * lit;
        f.u("uRimColor").value.setRGB(0.8, 0.9, 1.1);
        f.u("uBreath").value = Math.sin(t * 3 + i) * 0.012;
        f.face(stage.camera.position);
      });
      runAtmo(atmo, stage, t + 7);
    },
    grade: (t) => {
      let flash = 0;
      for (let i = 0; i < 4; i++) flash = Math.max(flash, 0.22 * pulse(t, i * BEAT, 0.0001, 0.09));
      return { exposure: 0.8, saturation: 0.8, tint: [0.94, 0.97, 1.05], flash, vignette: 0.75, bloom: 0.4 };
    },
  };
}

/** 04 Die Glutfeste: Fahrt auf das Lagerfeuer zu, Glut steigt. */
function s04(): Shot {
  const group = g();
  let atmo!: Atmosphere;
  let sparks!: Burst;
  return {
    id: "04", t0: 9.16, t1: 11.75, group,
    async setup(stage) {
      group.add(await backdrop(stage, "ui/mainmenu_hero.webp", { horizon: 0.5, nearDist: 3.6 }));
      atmo = atmosphere(group, 104, [0.5, 0.48, 0.46], [2.8, 1.1, 0.3], 300, 50);
      sparks = new Burst({ seed: 44, count: 140, origin: new THREE.Vector3(0.1, 0.1, 2.4), originSpread: new THREE.Vector3(0.5, 0, 0.3), dir: new THREE.Vector3(0, 1, 0), spread: 0.18, speed: [0.5, 1.4], life: [1.2, 2.6], gravity: 0.15, drag: 0.4, stretch: 0.05, width: 0.012, colors: [new THREE.Color(3.2, 1.5, 0.5), new THREE.Color(0.8, 0.2, 0.05)], emitOver: 2.6 });
      group.add(sparks.mesh);
    },
    update(t, stage) {
      const k = t / 2.59;
      setCam(stage, track<Vec3>([{ t: 0, v: [0, 1.75, 6.2] }, { t: 1, v: [0.05, 1.45, 5.3], ease: easeInOutCubic }], k), track<Vec3>([{ t: 0, v: [0, 1.6, 0] }, { t: 1, v: [0.05, 1.15, 0], ease: easeInOutCubic }], k), 38);
      sparks.update(t + 1.0, stage.camera.position);
      runAtmo(atmo, stage, t + 11);
    },
    grade: () => ({ exposure: 1.0, saturation: 0.9, vignette: 0.7, bloom: 0.55, split: 0.7 }),
  };
}

/** 05 Gesichter der Glutfeste: Urga, Voss, Mux, Shairi, je ein Schlag, Kaminlicht. */
function s05(): Shot {
  const group = g();
  const faces: Puppet[] = [];
  let atmo!: Atmosphere;
  const ids = ["npc_urga", "npc_voss", "npc_mux", "npc_shairi"];
  return {
    id: "05", t0: 11.75, t1: 14.35, group,
    async setup(stage) {
      group.add(await backdrop(stage, "tavern/tavern_interior.webp", { horizon: 0.45 }));
      for (let i = 0; i < ids.length; i++) {
        const f = await figure(stage, `portraits/${ids[i]}.webp`, { height: 1.8, chest: 0.4, hip: 0.1 });
        f.group.position.set(-2.25 + i * 1.5, -0.2, 2.2);
        f.shadow.visible = false;
        faces.push(f);
        group.add(f.group);
      }
      atmo = atmosphere(group, 105, [0.6, 0.55, 0.5], [2.6, 1.1, 0.35], 200, 40);
    },
    update(t, stage) {
      const x = -2.25 + 1.5 * (t / BEAT) - 0.1;
      setCam(stage, [x + 0.3, 1.3, 6.0], [x, 1.2, 2.2], 34);
      faces.forEach((f, i) => {
        f.u("uBreath").value = Math.sin(t * 2.4 + i) * 0.01;
        const flick = 0.92 + 0.08 * wobble(t * 2, i);
        f.u("uTint").value.setRGB(1.0 * flick, 0.86 * flick, 0.7 * flick);
        f.u("uRim").value = 0.3;
        f.u("uRimColor").value.setRGB(1.0, 0.6, 0.3);
        f.face(stage.camera.position);
      });
      runAtmo(atmo, stage, t + 13);
    },
    grade: () => ({ exposure: 1.05, saturation: 0.92, vignette: 0.65, bloom: 0.4, split: 0.75 }),
  };
}

/** 06 Der Namenlose: Mensch → Elf → Goblin → Ork, je ein Schlag, Glut-Auflösung dazwischen. */
function s06(): Shot {
  const group = g();
  const races: Puppet[] = [];
  let atmo!: Atmosphere;
  const spec: [string, number][] = [
    ["portraits/human_warrior_m.webp", 2.25],
    ["portraits/elf_warrior_m.webp", 2.3],
    ["portraits/goblin_warrior_m.webp", 1.85],
    ["portraits/orc_warrior_m.webp", 2.45],
  ];
  return {
    id: "06", t0: 14.35, t1: 16.94, group,
    async setup(stage) {
      group.add(await backdrop(stage, "ui/ember_reliquary_bg.webp", { horizon: 0.43 }));
      for (const [p, h] of spec) {
        const f = await figure(stage, p, { height: h, chest: 0.7, hip: 0.46 });
        f.group.position.set(0, 0, 0);
        races.push(f);
        group.add(f.group);
      }
      atmo = atmosphere(group, 106, [0.5, 0.48, 0.46], [2.6, 1.1, 0.35], 300, 80);
    },
    update(t, stage) {
      setCam(stage, track<Vec3>([{ t: 0, v: [-0.4, 1.5, 6.0] }, { t: 2.59, v: [0.3, 1.5, 5.4], ease: (k) => k }], t), [0, 1.3, 0], 36);
      races.forEach((f, i) => {
        const a = i * BEAT;
        const b = a + BEAT;
        const vis = t >= a - 0.12 && t < b + 0.05;
        f.group.visible = vis;
        // einblenden: Auflösung rückwärts; ausblenden: vorwärts
        const inK = i === 0 ? 0 : 1 - ramp(t, a - 0.12, a + 0.08);
        const outK = i === 3 ? 0 : ramp(t, b - 0.16, b + 0.04);
        f.u("uDissolve").value = Math.max(inK, outK) * 1.05;
        f.u("uBreath").value = Math.sin(t * 2.6) * 0.012;
        f.u("uRim").value = 0.3;
        f.face(stage.camera.position);
      });
      runAtmo(atmo, stage, t + 15);
    },
    grade: () => ({ exposure: 1.1, saturation: 0.95, vignette: 0.7, bloom: 0.5 }),
  };
}

/** 07 Der Held: Kreisfahrt um den Krieger, Atmen, Mantel. */
function s07(): Shot {
  const group = g();
  let hero!: Puppet;
  let atmo!: Atmosphere;
  return {
    id: "07", t0: 16.94, t1: 19.53, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/borderlands.webp"));
      hero = await figure(stage, "portraits/human_warrior_m.webp", { height: 2.25, capeC: [0.62, 0.38], capeR: [0.2, 0.3], chest: 0.7, hip: 0.46 });
      hero.group.position.set(0, 0, 0);
      group.add(hero.group);
      atmo = atmosphere(group, 107, [0.6, 0.58, 0.55], [2.6, 1.1, 0.35], 600, 120);
    },
    update(t, stage) {
      const cx = -0.8 + 1.6 * easeInOutCubic(t / 2.59);
      setCam(stage, [cx, 1.55, 6.0 - 0.5 * smooth(t / 2.59)], [cx * 0.35, 1.35, 0], 34);
      hero.u("uBreath").value = Math.sin(t * 2.6) * 0.014;
      hero.u("uSway").value = Math.sin(t * 1.7) * 0.6;
      hero.u("uRim").value = 0.3;
      hero.face(stage.camera.position);
      runAtmo(atmo, stage, t + 17);
    },
    grade: () => ({ exposure: 0.98, saturation: 0.88, vignette: 0.6, bloom: 0.4 }),
  };
}

/** 08 Erste Arbeit: Holzfällen und Bergbau, je zwei Schläge; die Funde springen zur Kamera. */
function s08(): Shot {
  const group = g();
  const wood = g();
  const mine = g();
  let cutter!: Puppet;
  let miner!: Puppet;
  let log!: Puppet;
  let ore!: Puppet;
  let chips!: Burst;
  let sparks!: Burst;
  const HIT1 = BEAT;
  const HIT2 = 2 * BEAT + BEAT;
  return {
    id: "08", t0: 19.53, t1: 22.13, group,
    async setup(stage) {
      wood.add(await backdrop(stage, "skill-backgrounds/woodcutting.webp", { horizon: 0.4 }));
      mine.add(await backdrop(stage, "skill-backgrounds/mining.webp", { horizon: 0.42 }));
      cutter = await figure(stage, "portraits/human_woodcutter_m.webp", { height: 2.2, chest: 0.7, hip: 0.46 });
      miner = await figure(stage, "portraits/orc_miner_m.webp", { height: 2.35, chest: 0.7, hip: 0.46 });
      cutter.group.position.set(-0.6, 0, 0);
      miner.group.position.set(-0.6, 0, 0);
      log = await card(stage, "items/oak_log.webp", 0.9);
      ore = await card(stage, "items/copper_ore.webp", 0.8);
      chips = new Burst({ seed: 81, count: 60, origin: new THREE.Vector3(0.3, 1.0, 0.3), dir: new THREE.Vector3(1, 0.6, 0.4), spread: 0.7, speed: [2, 6], life: [0.5, 1.0], gravity: -8, drag: 1.2, stretch: 0.0, width: 0.05, colors: [new THREE.Color(0.55, 0.38, 0.2), new THREE.Color(0.35, 0.24, 0.12)], additive: false, tex: TEX.shard() });
      sparks = new Burst({ seed: 82, count: 90, origin: new THREE.Vector3(0.4, 0.9, 0.3), dir: new THREE.Vector3(1, 0.5, 0.3), spread: 0.8, speed: [3, 9], life: [0.3, 0.9], gravity: -9, drag: 1.4, stretch: 0.03, width: 0.02, colors: [new THREE.Color(3.4, 2.4, 1.2), new THREE.Color(1.6, 0.4, 0.08)], birthFade: 0.06 });
      wood.add(cutter.group, log.group, chips.mesh);
      mine.add(miner.group, ore.group, sparks.mesh);
      group.add(wood, mine);
    },
    update(t, stage) {
      const first = t < 2 * BEAT;
      wood.visible = first;
      mine.visible = !first;
      const who = first ? cutter : miner;
      const hit = first ? HIT1 : HIT2;
      setCam(stage, first ? [0.3, 1.55, 5.8] : [0.4, 1.55, 5.6], first ? [-0.15, 1.35, 0] : [-0.05, 1.35, 0], 38);
      // Ausholen und Schlag (Biegen), Fundstück springt danach zur Kamera und fliegt nach oben rechts weg
      who.u("uBend").value = -0.08 * ramp(t, hit - 0.45, hit - 0.08) * (1 - ramp(t, hit - 0.08, hit)) + 0.12 * ramp(t, hit - 0.06, hit, easeOutCubic) * (1 - ramp(t, hit + 0.1, hit + 0.45));
      who.u("uBreath").value = Math.sin(t * 2.8) * 0.012;
      who.u("uRim").value = 0.25;
      who.face(stage.camera.position);
      const item = first ? log : ore;
      const k = ramp(t, hit + 0.05, hit + 0.55, easeOutCubic);
      item.group.visible = t > hit + 0.04;
      item.group.position.set(0.5 + 1.3 * k, 1.0 + 1.1 * k, 0.4 + 1.6 * k);
      item.mesh.rotation.z = 0.6 * (1 - k);
      item.u("uOpacity").value = 1 - ramp(t, hit + 0.45, hit + 0.62);
      item.face(stage.camera.position);
      const fx = first ? chips : sparks;
      fx.update(t - hit, stage.camera.position);
      // Tag → Abend im Zeitraffer über beide Vignetten
      const dusk = ramp(t, 0, 2.59);
      for (const p of [cutter, miner]) p.u("uTint").value.setRGB(1 - 0.15 * dusk, 0.95 - 0.12 * dusk, 0.88);
    },
    grade: (t) => ({ exposure: 1.02 - 0.12 * ramp(t, 0, 2.59), saturation: 0.95, vignette: 0.55, bloom: 0.45, tint: [1, 1 - 0.03 * ramp(t, 0, 2.59), 1 + 0.06 * ramp(t, 0, 2.59)], flash: 0.12 * pulse(t, HIT1, 0.0001, 0.08) + 0.12 * pulse(t, HIT2, 0.0001, 0.08) }),
  };
}

export const openingShots = (): Shot[] => [s01(), s02(), s03(), s04(), s05(), s06(), s07(), s08()];
export type { Stage };
