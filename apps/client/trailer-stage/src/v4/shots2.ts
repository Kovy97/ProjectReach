// claude:2026-10-24T12:14:00+02:00 — Trailer v4 „Inventar“: übrige Tableaus (Intro, Berufe, Rezepte, göttlicher Fund, Welt,
// Kampfstile/Rüstung, Verzauberungen, Raid, Schwierigkeiten, Erfolge, Begleiter/Talente, Offline, Völker). Wechsel im Takt,
// Gemälde aus der Malerposition (wie v3 abgenommen), Tableaus frontal auf Stein.
import { V4_LANG, fontCss, nm, upper } from "./lang";
import * as THREE from "three";
import { easeInOutCubic, easeOutCubic, pulse, ramp, smooth } from "../anim";
import type { Atmosphere } from "../env";
import { Burst, Glow, TEX } from "../fx";
import { atmosphere, backdrop, CAM0, figure, HitFx, load, lungeBend, lungeX, recoil, runAtmo, setCam, shake, type Shot } from "../kit";
import type { Puppet } from "../puppet";
import { RAID_CAST } from "../shots/raid";
import type { Stage } from "../stage";
import data from "./data.json";
import { frontCam, lighten, plateTexture, RARITY } from "./shots";
import { Batch, buildAtlas, label, stone } from "./ui";

const BEAT = 0.6486;
const HALF = BEAT / 2;
const BAR = 4 * BEAT;
const g = () => new THREE.Group();
const C = (r: number, gg: number, b: number) => new THREE.Color(r, gg, b);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const skillName = (id: string): string => { const x = data.skills.find((s) => s.id === id); return x ? nm(x) : id; };
const itemName = (id: string): string => { const x = data.items.find((i) => i.id === id); return x ? nm(x) : id; };

/** Bild als flache Fläche (Höhe h), Ursprung Mitte */
async function flat(stage: Stage, path: string, h: number, extra: Partial<THREE.MeshBasicMaterialParameters> = {}): Promise<THREE.Mesh> {
  const { tex, img } = await load(stage, path);
  return new THREE.Mesh(new THREE.PlaneGeometry((h * img.width) / img.height, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, ...extra }));
}
const mat = (m: THREE.Mesh): THREE.MeshBasicMaterial => m.material as THREE.MeshBasicMaterial;
/** Kamera an der Malerposition (wie v3), sanfter Push */
function painter(stage: Stage, push = 0, x = 0): void {
  setCam(stage, [CAM0[0] + x, CAM0[1], CAM0[2] - push], [x * 0.3, 1.5, 0], 40);
}

// ── 01 Intro: Glutfunke im Schwarz, das Hauptmenü-Gemälde tritt hervor ────────────────────────────────
export function v4s01(): Shot {
  const group = g();
  const ember = new Glow(C(3.2, 1.5, 0.45));
  const halo = new Glow(C(1.2, 0.5, 0.15));
  let atmo!: Atmosphere;
  return {
    id: "v4-01", t0: 0, t1: 3.97, group,
    async setup(stage) {
      group.add(await backdrop(stage, "ui/mainmenu.webp", { horizon: 0.42 }));
      atmo = atmosphere(group, 401, [0.5, 0.48, 0.46], [2.4, 1.0, 0.3], 400, 80);
      group.add(ember.sprite, halo.sprite);
    },
    update(t, stage) {
      painter(stage, 0.5 * (t / 3.97));
      const p = V(Math.sin(t * 1.3) * 0.1, 0.4 + 2.2 * smooth(t / 3.9), 2.2);
      const k = 1 - ramp(t, 2.6, 3.6);
      ember.set(p, 0.08 + 0.02 * Math.sin(t * 9), k);
      halo.set(p, 0.5, (0.3 + 0.08 * Math.sin(t * 7)) * k);
      runAtmo(atmo, stage, t, ramp(t, 0.8, 2.5));
    },
    grade: (t) => ({ exposure: 1.1, fade: 1 - ramp(t, 0.15, 1.6), vignette: 0.6, bloom: 0.5 }),
  };
}

// ── 03 Berufe: je Schlag ein Gemälde mit Figur und Fund, Skill-Name unten links ────────────────────────
const PROF: [string, string, string, string][] = [
  ["woodcutting", "skill-backgrounds/woodcutting.webp", "portraits/human_woodcutter_m.webp", "items/oak_log.webp"],
  ["mining", "skill-backgrounds/mining.webp", "portraits/orc_miner_m.webp", "items/copper_ore.webp"],
  ["fishing", "skill-backgrounds/fishing.webp", "portraits/elf_fisher_f.webp", "items/raw_trout.webp"],
  ["farming", "skill-backgrounds/farming.webp", "portraits/goblin_farmer_f.webp", "items/grimwheat.webp"],
  ["foraging", "skill-backgrounds/foraging.webp", "portraits/human_forager_f.webp", "items/herb_marshroot.webp"],
  ["thieving", "skill-backgrounds/thieving.webp", "portraits/goblin_thief_m.webp", "items/stolen_coinpurse.webp"],
  ["smithing", "skill-backgrounds/smithing.webp", "portraits/orc_blacksmith_m.webp", "items/copper_bar.webp"],
  ["cooking", "skill-backgrounds/cooking.webp", "portraits/human_cook_f.webp", "items/cooked_trout.webp"],
];
export function v4s03(): Shot {
  const group = g();
  const parts: { grp: THREE.Group; who: Puppet; item: THREE.Mesh; name: THREE.Mesh }[] = [];
  return {
    id: "v4-03", t0: 9.16, t1: 9.16 + 2 * BAR, group,
    async setup(stage) {
      for (const [id, bg, por, it] of PROF) {
        const grp = g();
        grp.add(await backdrop(stage, bg, { horizon: 0.42 }));
        const who = await figure(stage, por, { height: id.startsWith("goblin") || por.includes("goblin") ? 1.85 : 2.2, chest: 0.7, hip: 0.46 });
        who.group.position.set(-0.7, 0, 0.4);
        const item = await flat(stage, it, 0.75);
        const name = label(upper(skillName(id)), { px: 72, height: 0.2, spacing: 8 });
        grp.add(who.group, item, name);
        grp.visible = false;
        group.add(grp);
        parts.push({ grp, who, item, name });
      }
    },
    update(t, stage) {
      const i = Math.min(PROF.length - 1, Math.floor(t / BEAT));
      const lt = t - i * BEAT;
      parts.forEach((p, k) => { p.grp.visible = k === i; });
      const p = parts[i]!;
      painter(stage, 0.35 * easeOutCubic(lt / BEAT), 0.2);
      p.who.u("uBend").value = 0.07 * pulse(lt, 0.12, 0.08, 0.25);
      p.who.u("uBreath").value = Math.sin(t * 3) * 0.012;
      p.who.face(stage.camera.position);
      const k = ramp(lt, 0.1, 0.3, easeOutCubic);
      p.item.position.set(0.75, 1.0 + 0.35 * k, 1.8);
      p.item.scale.setScalar(0.6 + 0.4 * k);
      mat(p.item).opacity = k;
      p.name.position.set(-1.3, 0.55, 2.5);
      mat(p.name).opacity = ramp(lt, 0, 0.12);
    },
    grade: (t) => ({ exposure: 1.0, vignette: 0.55, bloom: 0.3, flash: 0.1 * pulse(t % BEAT, 0, 0.0001, 0.05) }),
  };
}

// ── 05 Rezepte: Ketten als Fluss, je Schlag eine Zeile ────────────────────────────────────────────────
const CHAINS: string[][] = [
  ["copper_ore", "copper_bar", "copper_sword", "rune_flame_i"],
  ["raw_trout", "cooked_trout"],
  ["herb_marshroot", "salve_of_mending"],
  ["raw_hide", "hardened_leather", "hardened_leather_body"],
];
function arrowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const gg = c.getContext("2d")!;
  gg.strokeStyle = "#c9b996";
  gg.lineWidth = 6;
  gg.lineCap = "round";
  gg.beginPath();
  gg.moveTo(14, 32);
  gg.lineTo(106, 32);
  gg.moveTo(86, 14);
  gg.lineTo(110, 32);
  gg.lineTo(86, 50);
  gg.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function v4s05(): Shot {
  const group = g();
  const rows: { items: THREE.Mesh[]; arrows: THREE.Mesh[] }[] = [];
  return {
    id: "v4-05", t0: 19.53, t1: 22.13, group,
    async setup(stage) {
      group.add(await stone(stage));
      const atex = arrowTexture();
      for (const chain of CHAINS) {
        const items: THREE.Mesh[] = [];
        const arrows: THREE.Mesh[] = [];
        for (let k = 0; k < chain.length; k++) {
          const m = await flat(stage, `items/${chain[k]}.webp`, 0.85);
          items.push(m);
          group.add(m);
          if (k > 0) {
            const a = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: atex, transparent: true, depthWrite: false, toneMapped: false }));
            arrows.push(a);
            group.add(a);
          }
        }
        rows.push({ items, arrows });
      }
    },
    update(t, stage) {
      frontCam(stage, 10, 0, -0.2);
      rows.forEach((row, r) => {
        const y = 1.0 - r * 1.05;
        const n = row.items.length;
        const step = 1.55;
        const x0 = -((n - 1) * step) / 2;
        row.items.forEach((m, k) => {
          const a = ramp(t, r * BEAT + k * 0.07 - 0.02, r * BEAT + k * 0.07 + 0.14, easeOutCubic);
          m.position.set(x0 + k * step, y, 0);
          m.scale.setScalar(0.8 + 0.2 * a);
          mat(m).opacity = a;
        });
        row.arrows.forEach((ar, k) => {
          const a = ramp(t, r * BEAT + (k + 1) * 0.07 - 0.04, r * BEAT + (k + 1) * 0.07 + 0.1);
          ar.position.set(x0 + (k + 0.5) * step, y, 0);
          mat(ar).opacity = a;
        });
      });
    },
    grade: () => ({ exposure: 1.0, vignette: 0.7, bloom: 0.2 }),
  };
}

// ── 06 Atemloch: ein göttlicher Fund tritt aus dem Dunkel ──────────────────────────────────────────────
export function v4s06(): Shot {
  const group = g();
  const ID = "idol_aegis";
  let item!: THREE.Mesh;
  let name!: THREE.Mesh;
  let tier!: THREE.Mesh;
  let floor!: THREE.Mesh;
  let pool!: THREE.Mesh;
  return {
    id: "v4-06", t0: 22.13, t1: 24.72, group,
    async setup(stage) {
      floor = await stone(stage);
      (floor.material as THREE.MeshBasicMaterial).color.setRGB(0.18, 0.17, 0.16);
      // Lichtkegel auf dem Stein hinter dem Fund: weiches warmes Oval, normal überblendet
      const pc = document.createElement("canvas");
      pc.width = pc.height = 256;
      const pg = pc.getContext("2d")!;
      const rg = pg.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, "rgba(120,98,70,0.55)");
      rg.addColorStop(0.6, "rgba(70,56,40,0.25)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      pg.fillStyle = rg;
      pg.fillRect(0, 0, 256, 256);
      const ptx = new THREE.CanvasTexture(pc);
      ptx.colorSpace = THREE.SRGBColorSpace;
      pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.6), new THREE.MeshBasicMaterial({ map: ptx, transparent: true, depthWrite: false, toneMapped: false }));
      item = await flat(stage, `items/${ID}.webp`, 2.5);
      name = label(itemName(ID), { px: 80, height: 0.32, color: lighten(RARITY.godly!.color, 0.25), spacing: 6 });
      tier = label("GODLY", { px: 56, height: 0.16, color: "#d8cdb6", spacing: 12 });
      group.add(floor, pool, item, name, tier);
    },
    update(t, stage) {
      frontCam(stage, 9.2 - 0.6 * (t / 2.59), 0, 0.1);
      const k = ramp(t, 0.05, 1.1, easeOutCubic);
      item.position.set(0, 0.25 + 0.15 * k, 0.5);
      item.rotation.z = 0.12 * (1 - k);
      item.scale.setScalar(0.9 + 0.1 * k);
      mat(item).color.setScalar(0.15 + 0.85 * k);
      pool.position.set(0, 0.2, 0.2);
      mat(pool).opacity = k;
      const nk = ramp(t, 0.9, 1.3, easeOutCubic);
      name.position.set(0, -1.55, 0.6);
      tier.position.set(0, -1.95, 0.6);
      mat(name).opacity = nk;
      mat(tier).opacity = nk;
    },
    // Aussetzer der Musik 24,0–24,3: kurz fast schwarz
    grade: (t) => ({ exposure: 1.0, vignette: 0.8, bloom: 0.25, fade: 0.85 * pulse(t, 1.95, 0.05, 0.25) }),
  };
}

// ── 08 Welt: Zonen im Halbschlag, dann die eigenständigen Dungeons ─────────────────────────────────────
export function v4s08(): Shot {
  const group = g();
  const zones: { m: THREE.Mesh; n: THREE.Mesh }[] = [];
  const dungeons: { m: THREE.Mesh; n: THREE.Mesh }[] = [];
  const zoneGrp = g();
  const dunGrp = g();
  return {
    id: "v4-08", t0: 29.91, t1: 29.91 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage), zoneGrp, dunGrp);
      for (const z of data.zones.filter((z) => z.img).slice(0, 8)) {
        const m = await flat(stage, z.img!, 3.05);
        const n = label(upper(nm(z)), { px: 72, height: 0.22, spacing: 8 });
        zones.push({ m, n });
        zoneGrp.add(m, n);
      }
      for (const d of data.dungeons.filter((d) => d.img && !d.id.startsWith("gk_"))) {
        const m = await flat(stage, d.img!, 1.17);
        const n = label(nm(d), { px: 56, height: 0.14 });
        dungeons.push({ m, n });
        dunGrp.add(m, n);
      }
    },
    update(t, stage) {
      frontCam(stage, 10, 0, -0.2);
      const second = t >= BAR;
      zoneGrp.visible = !second;
      dunGrp.visible = second;
      if (!second) {
        const i = Math.min(zones.length - 1, Math.floor(t / HALF));
        zones.forEach((z, k) => {
          const on = k === i;
          z.m.visible = z.n.visible = on;
          const lt = t - k * HALF;
          z.m.position.set(0.15 * (1 - easeOutCubic(lt / HALF)), -0.35, 0);
          z.n.position.set(0, -2.2, 0.01);
        });
        return;
      }
      const lt = t - BAR;
      dungeons.forEach((d, k) => {
        const row = k < 5 ? 0 : 1;
        const col = row === 0 ? k : k - 5;
        const perRow = row === 0 ? 5 : dungeons.length - 5;
        const x = (col - (perRow - 1) / 2) * 1.85;
        const y = 0.55 - row * 1.65;
        const a = ramp(lt, Math.floor(k / 3) * BEAT - 0.02, Math.floor(k / 3) * BEAT + 0.16, easeOutCubic);
        d.m.position.set(x, y, 0);
        d.m.scale.setScalar(0.85 + 0.15 * a);
        d.n.position.set(x, y - 0.75, 0.01);
        mat(d.m).opacity = a;
        mat(d.n).opacity = a;
      });
    },
    grade: () => ({ exposure: 1.0, vignette: 0.6, bloom: 0.2 }),
  };
}

// ── 09 Drei Kampfstile (Triptychon mit Treffer im Takt), dann Rüstungs-Trinität ────────────────────────
const STYLES: [string, string, [number, number, number]][] = [
  ["portraits/human_warrior_m.webp", "battlescreens/borderlands.webp", [5, 3.4, 1.6]],
  ["portraits/elf_ranger_f.webp", "battlescreens/wildwood.webp", [4.5, 3.2, 1.6]],
  ["portraits/human_frost_mage_f.webp", "battlescreens/crypt.webp", [1.6, 2.3, 3.4]],
];
const ARMOR: [string, string, string][] = [
  ["titanium_platebody", "PLATE", "MITIGATION"],
  ["voidhide_body", "LEATHER", "EVASION"],
  ["starweave_vestment", "CLOTH", "WARD"],
];
function frameTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 300;
  c.height = 430;
  const gg = c.getContext("2d")!;
  gg.strokeStyle = "#5a524a";
  gg.lineWidth = 10;
  gg.strokeRect(5, 5, 290, 420);
  gg.strokeStyle = "#141210";
  gg.lineWidth = 3;
  gg.strokeRect(12, 12, 276, 406);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function v4s09(): Shot {
  const group = g();
  const tri = g();
  const arm = g();
  const panels: { who: THREE.Mesh; fx: Burst; x: number }[] = [];
  const armor: { plate: THREE.Mesh; item: THREE.Mesh; name: THREE.Mesh; stat: THREE.Mesh }[] = [];
  const W = 3.0;
  const H = 4.3;
  return {
    id: "v4-09", t0: 35.1, t1: 35.1 + 2 * BAR, group,
    async setup(stage) {
      stage.renderer.localClippingEnabled = true;
      group.add(await stone(stage), tri, arm);
      const ftex = frameTexture();
      for (let k = 0; k < STYLES.length; k++) {
        const [por, bg, col] = STYLES[k]!;
        const x = (k - 1) * 3.15;
        const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -(x - W / 2)), new THREE.Plane(new THREE.Vector3(-1, 0, 0), x + W / 2)];
        // Kulisse: mittiger Ausschnitt im Seitenverhältnis der Tafel
        const { tex, img } = await load(stage, bg);
        const geo = new THREE.PlaneGeometry(W, H);
        const fu = W / H / (img.width / img.height);
        const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
        for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + (uv.getX(i) - 0.5) * fu);
        const bgm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
        bgm.position.set(x, -0.45, 0);
        const who = await flat(stage, por, 3.1, { clippingPlanes: clip });
        const fx = new Burst({ seed: 900 + k, count: 70, origin: V(x + 0.7, -0.4, 0.2), dir: V(1, 0.3, 0.2), spread: 0.7, speed: [2, 6], life: [0.25, 0.6], gravity: -6, drag: 1.4, stretch: 0.03, width: 0.022, colors: [C(...col), C(col[0] * 0.3, col[1] * 0.3, col[2] * 0.3)], birthFade: 0.05, tex: k === 2 ? TEX.shard() : undefined });
        (fx.mesh.material as THREE.MeshBasicMaterial).clippingPlanes = clip;
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.06, H + 0.06), new THREE.MeshBasicMaterial({ map: ftex, transparent: true, depthWrite: false, toneMapped: false }));
        frame.position.set(x, -0.45, 0.3);
        tri.add(bgm, who, fx.mesh, frame);
        panels.push({ who, fx, x });
      }
      const ptex = plateTexture("#8a8070");
      for (const [id, n, s] of ARMOR) {
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ map: ptex, transparent: true, depthWrite: false, toneMapped: false }));
        const item = await flat(stage, `items/${id}.webp`, 1.7);
        const name = label(n, { px: 80, height: 0.3, spacing: 10, color: "#efe6d2" });
        const stat = label(s, { px: 64, height: 0.21, spacing: 10, color: "#d8ccb2" });
        arm.add(plate, item, name, stat);
        armor.push({ plate, item, name, stat });
      }
    },
    update(t, stage) {
      frontCam(stage, 10, 0, -0.2);
      const second = t >= BAR;
      tri.visible = !second;
      arm.visible = second;
      if (!second) {
        panels.forEach((p, k) => {
          const hit = k * BEAT + 0.15;
          const all = 3 * BEAT + 0.15;
          const lunge = 0.25 * (ramp(t, hit - 0.06, hit, easeOutCubic) * (1 - ramp(t, hit + 0.15, hit + 0.5))) + 0.15 * pulse(t, all, 0.05, 0.3);
          p.who.position.set(p.x - 0.45 + lunge, -0.55, 0.1);
          mat(p.who).color.setScalar(t < k * BEAT - 0.05 ? 0.45 : 1);
          p.fx.update(t >= all ? t - all : t - hit, stage.camera.position);
        });
        return;
      }
      const lt = t - BAR;
      armor.forEach((a, k) => {
        const x = (k - 1) * 3.0;
        const ap = ramp(lt, k * BEAT - 0.02, k * BEAT + 0.18, easeOutCubic);
        a.plate.position.set(x, 0.05, -0.01);
        a.item.position.set(x, 0.05, 0);
        a.item.scale.setScalar(0.85 + 0.15 * ap);
        a.name.position.set(x, -1.3, 0.01);
        a.stat.position.set(x, -1.72, 0.01);
        for (const m of [a.plate, a.item, a.name, a.stat]) mat(m).opacity = ap;
      });
    },
    grade: (t) => ({ exposure: 1.0, vignette: 0.6, bloom: 0.3, flash: t < BAR ? 0.12 * pulse(t % BEAT, 0.15, 0.0001, 0.06) : 0 }),
  };
}

// ── 10 Verzauberungen und Zufalls-Suffixe: Namen erscheinen links und rechts der Klinge ─────────────────
export function v4s10(): Shot {
  const group = g();
  const ID = "skybreaker_greatsword";
  let blade!: THREE.Mesh;
  const pre: THREE.Mesh[] = [];
  const suf: THREE.Mesh[] = [];
  return {
    id: "v4-10", t0: 40.29, t1: 40.29 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage));
      blade = await flat(stage, `items/${ID}.webp`, 3.0);
      group.add(blade);
      for (const n of (V4_LANG === "zh" ? data.affixesZh : data.affixes).slice(0, 8)) {
        const m = label(n, { px: 72, height: 0.29, spacing: 6, color: "#efe6d2" });
        pre.push(m);
        group.add(m);
      }
      for (const n of (V4_LANG === "zh" ? data.suffixesZh : data.suffixes).slice(0, 8)) {
        const m = label(n, { px: 72, height: 0.29, spacing: 6, color: "#efe6d2" });
        suf.push(m);
        group.add(m);
      }
    },
    update(t, stage) {
      frontCam(stage, 10 - 0.3 * (t / (2 * BAR)), 0, -0.25);
      blade.position.set(0, -0.45, 0);
      blade.rotation.z = -0.35;
      pre.forEach((m, k) => {
        const a = ramp(t, k * HALF - 0.02, k * HALF + 0.14, easeOutCubic);
        m.position.set(-3.15 + 0.15 * (1 - a), 1.1 - k * 0.5, 0.01);
        mat(m).opacity = a;
      });
      suf.forEach((m, k) => {
        const a = ramp(t, BAR + k * HALF - 0.02, BAR + k * HALF + 0.14, easeOutCubic);
        m.position.set(3.15 - 0.15 * (1 - a), 1.1 - k * 0.5, 0.01);
        mat(m).opacity = a;
      });
    },
    grade: () => ({ exposure: 1.0, vignette: 0.65, bloom: 0.2 }),
  };
}

// ── 11 Raid-Tor: nur Bass, langsamer Push in den Zolltor-Saal ──────────────────────────────────────────
export function v4s11(): Shot {
  const group = g();
  let atmo!: Atmosphere;
  return {
    id: "v4-11", t0: 45.47, t1: 48.07, group,
    async setup(stage) {
      group.add(await backdrop(stage, "battlescreens/gk_room_1.webp", { horizon: 0.42 }));
      atmo = atmosphere(group, 411, [0.55, 0.5, 0.46], [2.6, 1.0, 0.3], 500, 90);
    },
    update(t, stage) {
      painter(stage, 0.8 * (t / 2.6));
      runAtmo(atmo, stage, 45 + t * 0.4);
    },
    grade: (t) => ({ exposure: 0.95, vignette: 0.7, bloom: 0.4, fade: 1 - smooth(t / 0.3) + 0.6 * ramp(t, 1.93, 2.43) }),
  };
}

// ── 12 Raid: vier Säle, je zwei Schläge, ein Treffer pro Saal ──────────────────────────────────────────
const HALLS: [string, string][] = [
  ["battlescreens/gk_room_1.webp", RAID_CAST.tally],
  ["battlescreens/gk_room_2.webp", RAID_CAST.quarter],
  ["battlescreens/gk_room_3.webp", RAID_CAST.pit],
  ["battlescreens/gk_room_5.webp", RAID_CAST.king],
];
export function v4s12(): Shot {
  const group = g();
  const halls: { grp: THREE.Group; hero: Puppet; boss: Puppet; hit: HitFx }[] = [];
  const DMG = ["1 284", "2 760", "1 932", "3 905"];
  return {
    id: "v4-12", t0: 48.07, t1: 48.07 + 2 * BAR, group,
    async setup(stage) {
      for (let k = 0; k < HALLS.length; k++) {
        const [bg, mon] = HALLS[k]!;
        const grp = g();
        grp.add(await backdrop(stage, bg, { horizon: 0.42 }));
        const hero = await figure(stage, "portraits/human_warrior_m.webp", { height: 2.25, capeC: [0.62, 0.38], capeR: [0.2, 0.3], chest: 0.7, hip: 0.46 });
        const boss = await figure(stage, mon, { height: 2.4, chest: 0.58, hip: 0.36 });
        const hit = new HitFx({ at: 0.3, tau: 0.3, point: V(0.35, 1.25, 0.3), dmg: DMG[k], crit: k % 2 === 1, seed: 920 + k, sparks: 70 }, grp);
        grp.add(hero.group, boss.group);
        grp.visible = false;
        group.add(grp);
        halls.push({ grp, hero, boss, hit });
      }
    },
    update(t, stage) {
      const i = Math.min(halls.length - 1, Math.floor(t / (2 * BEAT)));
      const lt = t - i * 2 * BEAT;
      halls.forEach((h, k) => { h.grp.visible = k === i; });
      const h = halls[i]!;
      setCam(stage, shake([0.1, 1.6, 5.8], 0.05 * pulse(lt, 0.3, 0.0001, 0.3), lt, 12 + i), [0.1, 1.45, 0], 38);
      const cam = stage.camera.position;
      h.hero.group.position.set(lungeX(lt, 0.3, -1.5, -0.6), 0, 0.2);
      h.hero.u("uBend").value = lungeBend(lt, 0.3);
      h.hero.face(cam);
      h.boss.group.position.set(1.3 + recoil(lt, 0.3, 0.35), 0, 0);
      h.boss.u("uFlash").value = 0.15 * pulse(lt, 0.3, 0.0001, 0.1);
      h.boss.u("uFlashColor").value.setRGB(0.95, 0.8, 0.62);
      h.boss.u("uBreath").value = Math.sin(t * 3) * 0.015;
      h.boss.face(cam);
      h.hit.update(lt, lt, cam);
    },
    grade: (t) => {
      const lt = t % (2 * BEAT);
      return { exposure: 1.0, vignette: 0.55, bloom: 0.45, flash: 0.08 * pulse(lt, 0.3, 0.0001, 0.07) + 0.1 * pulse(lt, 0, 0.0001, 0.05) };
    },
  };
}

// ── 13 Normal · Heroisch · Mythisch, dann die drei Raid-Sets ───────────────────────────────────────────
const DIFF: [string, string][] = [
  ["NORMAL", "#e9e0cc"],
  ["HEROIC", "#3fd6c8"],
  ["MYTHIC", "#ff5fb4"],
];
export function v4s13(): Shot {
  const group = g();
  const cols: { closed: THREE.Mesh; open: THREE.Mesh; name: THREE.Mesh }[] = [];
  const setRows: { name: THREE.Mesh; plates: THREE.Mesh[]; items: THREE.Mesh[] }[] = [];
  const chestGrp = g();
  const setGrp = g();
  return {
    id: "v4-13", t0: 53.26, t1: 53.26 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage), chestGrp, setGrp);
      for (const [n, c] of DIFF) {
        const closed = await flat(stage, "ui/raid/raid_chest_closed.webp", 2.0);
        const open = await flat(stage, "ui/raid/raid_chest_open.webp", 2.0);
        const name = label(n, { px: 80, height: 0.3, spacing: 12, color: lighten(c, 0.2) });
        chestGrp.add(closed, open, name);
        cols.push({ closed, open, name });
      }
      const ptex = plateTexture(RARITY.godly!.color);
      for (const s of data.sets.filter((s) => s.pieces.some((p) => p.includes("gk_")))) {
        const name = label(nm(s), { px: 60, height: 0.2, spacing: 4, color: "#e6dcc6" });
        const plates: THREE.Mesh[] = [];
        const items: THREE.Mesh[] = [];
        for (const p of s.pieces) {
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: ptex, transparent: true, depthWrite: false, toneMapped: false }));
          const it = await flat(stage, p, 0.82);
          plates.push(pl);
          items.push(it);
          setGrp.add(pl, it);
        }
        setGrp.add(name);
        setRows.push({ name, plates, items });
      }
    },
    update(t, stage) {
      frontCam(stage, 10, 0, -0.2);
      const second = t >= BAR;
      chestGrp.visible = !second;
      setGrp.visible = second;
      if (!second) {
        cols.forEach((c, k) => {
          const x = (k - 1) * 3.1;
          const lit = t >= k * BEAT || t >= 3 * BEAT;
          const b = lit ? 1 : 0.3;
          c.closed.visible = !lit;
          c.open.visible = lit;
          c.closed.position.set(x, -0.15, 0);
          c.open.position.set(x, -0.15, 0);
          mat(c.closed).color.setScalar(b);
          mat(c.open).color.setScalar(1);
          c.name.position.set(x, -1.6, 0.01);
          mat(c.name).opacity = lit ? 1 : 0.35;
        });
        return;
      }
      const lt = t - BAR;
      setRows.forEach((r, k) => {
        const y = 0.85 - k * 1.25;
        const a = ramp(lt, k * BEAT - 0.02, k * BEAT + 0.18, easeOutCubic);
        r.name.position.set(-2.55, y, 0.01);
        mat(r.name).opacity = a;
        r.items.forEach((it, i) => {
          const x = -0.3 + i * 1.05;
          r.plates[i]!.position.set(x + 0.15 * (1 - a), y, -0.01);
          it.position.set(x + 0.15 * (1 - a), y, 0);
          mat(r.plates[i]!).opacity = a;
          mat(it).opacity = a;
        });
      });
    },
    grade: () => ({ exposure: 1.0, vignette: 0.6, bloom: 0.2 }),
  };
}

// ── 14 Erfolge: Wand aus allen Erfolgsnamen, scrollt langsam nach oben ──────────────────────────────────
export function v4s14(): Shot {
  const group = g();
  let wall!: THREE.Mesh;
  const COLS = 5;
  const CW = 384;
  const RH = 58;
  const rows = Math.ceil(data.achievements.length / COLS);
  const W = 9.4;
  let H = 0;
  return {
    id: "v4-14", t0: 58.44, t1: 58.44 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage));
      const c = document.createElement("canvas");
      c.width = COLS * CW;
      c.height = rows * RH;
      const gg = c.getContext("2d")!;
      gg.font = fontCss(26);
      gg.textAlign = "center";
      gg.textBaseline = "middle";
      (V4_LANG === "zh" ? data.achievementsZh : data.achievements).forEach((n, i) => {
        const x = (i % COLS) * CW;
        const y = Math.floor(i / COLS) * RH;
        gg.fillStyle = "rgba(20,18,16,0.88)";
        gg.fillRect(x + 6, y + 5, CW - 12, RH - 10);
        gg.strokeStyle = "rgba(110,100,88,0.9)";
        gg.lineWidth = 2;
        gg.strokeRect(x + 6, y + 5, CW - 12, RH - 10);
        gg.fillStyle = "#e3d8c2";
        let s = n;
        while (gg.measureText(s).width > CW - 34 && s.length > 4) s = s.slice(0, -2);
        gg.fillText(s === n ? n : `${s.trimEnd()}…`, x + CW / 2, y + RH / 2 + 1);
      });
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      H = (W * c.height) / c.width;
      wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
      group.add(wall);
    },
    update(t, stage) {
      frontCam(stage, 10, 0, -0.2);
      // Start: oberer Rand knapp unter der Einblendung, dann gleichmäßig nach oben
      const top = 1.25 + 0.9 * t;
      wall.position.set(0, top - H / 2, 0);
      mat(wall).opacity = ramp(t, 0, 0.2);
    },
    grade: () => ({ exposure: 1.0, vignette: 0.75, bloom: 0.2 }),
  };
}

// ── 15 Begleiter (je Schlag sechs), dann Talentbäume vor dem Prestige-Altar, Spitze bei 68,5 ──────────────
export function v4s15(): Shot {
  const group = g();
  const petGrp = g();
  const talGrp = g();
  let pets!: Batch;
  let rects: { u0: number; v0: number; u1: number; v1: number }[] = [];
  let altar!: THREE.Mesh;
  const icons: THREE.Mesh[] = [];
  const PEAK = 68.5 - 63.63;
  const TAL = [
    ...["chronicleRecall", "damage", "dungeonRecall", "earlyXp", "goldFind", "keepBankStacks", "keepEquipment", "keepTools", "masteredXp", "maxHp", "pointsBoost", "startingGold"].map((n) => `ui/talents/prestige/${n}.webp`),
    ...["collar", "lore", "pace", "spoils", "tracking", "trail"].map((n) => `ui/talents/slayer/${n}.webp`),
  ];
  return {
    id: "v4-15", t0: 63.63, t1: 63.63 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage), petGrp, talGrp);
      const atlas = await buildAtlas(data.pets.map((p) => p.img), 256, 8, true);
      rects = atlas.rects;
      pets = new Batch(data.pets.length, atlas.tex);
      petGrp.add(pets.mesh);
      altar = await flat(stage, "ui/prestige/altar_scene.webp", 3.2, { transparent: false });
      talGrp.add(altar);
      for (const p of TAL) {
        const m = await flat(stage, p, 0.62);
        icons.push(m);
        talGrp.add(m);
      }
    },
    update(t, stage) {
      frontCam(stage, 10, 0, -0.2);
      const second = t >= BAR;
      petGrp.visible = !second;
      talGrp.visible = second;
      if (!second) {
        data.pets.forEach((_, i) => {
          const c = i % 8;
          const r = Math.floor(i / 8);
          const perRow = r < 2 ? 8 : data.pets.length - 16;
          const a = ramp(t, Math.floor(i / 6) * BEAT - 0.02, Math.floor(i / 6) * BEAT + 0.18, easeOutCubic);
          const x = (c - (perRow - 1) / 2) * 1.12;
          const y = 0.75 - r * 1.25;
          pets.set(i, x, y - 0.15 * (1 - a), 0, 1.08, 1.08, rects[i]!, 1, a);
        });
        pets.commit();
        return;
      }
      const lt = t - BAR;
      altar.position.set(0, -0.95, -0.1);
      mat(altar).color.setScalar(0.55);
      const peak = pulse(t, PEAK, 0.05, 0.4);
      icons.forEach((m, k) => {
        // zwei Bögen: Prestige (12) oben, Slayer (6) darunter
        const top = k < 12;
        const n = top ? 12 : 6;
        const j = top ? k : k - 12;
        const ang = Math.PI * (0.12 + (0.76 * j) / (n - 1));
        const rx = top ? 4.2 : 2.6;
        const ry = top ? 1.35 : 0.75;
        const x = -Math.cos(ang) * rx;
        const y = (top ? -0.25 : -0.6) + Math.sin(ang) * ry;
        const a = ramp(lt, Math.floor(k / 5) * BEAT - 0.02, Math.floor(k / 5) * BEAT + 0.16, easeOutCubic);
        m.position.set(x, y, 0.1);
        m.scale.setScalar((0.8 + 0.2 * a) * (1 + 0.12 * peak));
        mat(m).opacity = a;
      });
    },
    grade: (t) => ({ exposure: 1.0, vignette: 0.6, bloom: 0.3, flash: 0.35 * pulse(t, PEAK, 0.0001, 0.18) }),
  };
}

// ── 16 Offline: ruhiges Lagerfeuer, Glut steigt ──────────────────────────────────────────────────────
export function v4s16(): Shot {
  const group = g();
  let atmo!: Atmosphere;
  let sparks!: Burst;
  return {
    id: "v4-16", t0: 68.82, t1: 71.41, group,
    async setup(stage) {
      group.add(await backdrop(stage, "ui/mainmenu_hero.webp", { horizon: 0.5, nearDist: 3.6 }));
      atmo = atmosphere(group, 416, [0.5, 0.48, 0.46], [2.8, 1.1, 0.3], 250, 60);
      sparks = new Burst({ seed: 416, count: 120, origin: V(0.1, 0.1, 2.4), originSpread: V(0.5, 0, 0.3), dir: V(0, 1, 0), spread: 0.18, speed: [0.5, 1.3], life: [1.2, 2.4], gravity: 0.15, drag: 0.4, stretch: 0.05, width: 0.012, colors: [C(3.2, 1.5, 0.5), C(0.8, 0.2, 0.05)], emitOver: 2.6 });
      group.add(sparks.mesh);
    },
    update(t, stage) {
      setCam(stage, [0, 1.65, 6.2 - 0.5 * (t / 2.59)], [0, 1.2, 0], 38);
      sparks.update(t + 1.0, stage.camera.position);
      runAtmo(atmo, stage, 69 + t * 0.5);
    },
    grade: () => ({ exposure: 1.0, vignette: 0.65, bloom: 0.45 }),
  };
}

// ── 17 Vier Völker: Krieger treten im Takt nebeneinander ───────────────────────────────────────────────
export function v4s17(): Shot {
  const group = g();
  const races: Puppet[] = [];
  return {
    id: "v4-17", t0: 71.41, t1: 74.5, group,
    async setup(stage) {
      group.add(await backdrop(stage, "ui/ember_reliquary_bg.webp", { horizon: 0.43 }));
      for (const r of data.races) {
        const f = await figure(stage, `portraits/${r}_warrior_m.webp`, { height: r === "goblin" ? 1.85 : r === "orc" ? 2.4 : 2.25, chest: 0.7, hip: 0.46 });
        races.push(f);
        group.add(f.group);
      }
    },
    update(t, stage) {
      setCam(stage, [0, 1.55, 6.0 - 0.3 * (t / 3.09)], [0, 1.4, 0], 40);
      races.forEach((f, k) => {
        const at = k * BEAT;
        f.group.position.set((k - (races.length - 1) / 2) * 1.55, 0, 0.3);
        f.u("uDissolve").value = 1.05 * (1 - ramp(t, at - 0.08, at + 0.25));
        f.u("uBreath").value = Math.sin(t * 2.6 + k) * 0.012;
        f.face(stage.camera.position);
      });
    },
    grade: () => ({ exposure: 1.05, vignette: 0.6, bloom: 0.4 }),
  };
}
