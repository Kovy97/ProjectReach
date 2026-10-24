// claude:2026-10-24T10:24:00+02:00 — Trailer v3, Shots 30–32 (Finale + Logo, Musik 71,41–81,41 s): Halbschlag-Montage der
// Langzeitziele, Held als Silhouette vor der Glut, dann formt sich das Logo aus aufsteigender Glut. Versionslos, kein Text außer dem Logo.
import * as THREE from "three";
import { easeInOutCubic, easeOutCubic, pulse, ramp, rng, smooth } from "../anim";
import { PointCloud, type Atmosphere } from "../env";
import { Glow } from "../fx";
import { atmosphere, backdrop, card, figure, load, runAtmo, setCam, type Shot } from "../kit";
import type { Puppet } from "../puppet";

const BEAT = 0.6486;
const HALF = BEAT / 2;
const g = () => new THREE.Group();

// ── 30 Finale in Halbschlägen ───────────────────────────────────────────────────────────────────────
type Vig = { kind: "room"; bg: string } | { kind: "item"; ids: string[] } | { kind: "hero" };
const MONTAGE: Vig[] = [
  { kind: "room", bg: "ui/prestige/altar_scene.webp" }, // Aschegang (Neubeginn)
  { kind: "room", bg: "battlescreens/paragon_tower.webp" },
  { kind: "room", bg: "battlescreens/slayer_tower.webp" }, // Jägerkodex
  { kind: "room", bg: "battlescreens/idolhall.webp" }, // Götzenhalle
  { kind: "item", ids: ["items/ring_master_completion.webp"] },
  { kind: "item", ids: ["items/gk_fire_hands.webp", "items/gk_fire_head.webp", "items/gk_fire_chest.webp", "items/gk_fire_legs.webp", "items/gk_fire_feet.webp"] },
  { kind: "hero" },
];
const SILHOUETTE = MONTAGE.length * HALF; // ab hier steht der Held vor der Glut bis 74,50

function s30(): Shot {
  const group = g();
  const sets: THREE.Group[] = [];
  const items: Puppet[][] = [];
  let hero!: Puppet;
  let silBg!: THREE.Group;
  let sil!: Puppet;
  let silGlow!: Glow;
  let atmo!: Atmosphere;
  return {
    id: "30", t0: 71.41, t1: 74.5, group,
    async setup(stage) {
      for (const v of MONTAGE) {
        const grp = g();
        const list: Puppet[] = [];
        if (v.kind === "room") {
          grp.add(await backdrop(stage, v.bg, { horizon: 0.45 }));
        } else if (v.kind === "item") {
          grp.add(await backdrop(stage, "ui/ember_reliquary_bg.webp", { horizon: 0.45 }));
          for (const id of v.ids) {
            const c = await card(stage, id, v.ids.length > 1 ? 0.72 : 1.3);
            list.push(c);
            grp.add(c.group);
          }
        } else {
          grp.add(await backdrop(stage, "battlescreens/highlands.webp"));
          hero = await figure(stage, "portraits/human_warrior_m.webp", { height: 2.25, capeC: [0.62, 0.38], capeR: [0.2, 0.3], chest: 0.7, hip: 0.46 });
          grp.add(hero.group);
        }
        grp.visible = false;
        sets.push(grp);
        items.push(list);
        group.add(grp);
      }
      // Endbild: Silhouette vor der Glut
      silBg = g();
      silBg.add(await backdrop(stage, "ui/ember_reliquary_bg.webp", { horizon: 0.45 }));
      sil = await figure(stage, "portraits/human_warrior_m.webp", { height: 2.25, capeC: [0.62, 0.38], capeR: [0.2, 0.3], chest: 0.7, hip: 0.46 });
      silGlow = new Glow(new THREE.Color(1.6, 0.75, 0.3));
      silBg.add(silGlow.sprite, sil.group);
      atmo = atmosphere(silBg, 301, [0.5, 0.45, 0.42], [2.8, 1.1, 0.3], 400, 220);
      group.add(silBg);
    },
    update(t, stage) {
      const i = Math.floor(t / HALF);
      const inMontage = t < SILHOUETTE;
      sets.forEach((s, k) => { s.visible = inMontage && k === i; });
      silBg.visible = !inMontage;
      const cam = stage.camera.position;
      if (inMontage) {
        const v = MONTAGE[i]!;
        const lt = t - i * HALF;
        // Zoom-Punch: schneller Stoß nach vorn, dann Ausrollen
        const punch = 0.9 * easeOutCubic(lt / HALF);
        if (v.kind === "room") {
          // claude:2026-10-24T10:24:00+02:00 — Altar steht im Panorama rechts; Blick dorthin drehen
          // claude:2026-10-24T10:24:00+02:00 — Malerposition, kurzer Stoß statt Zoom
          const lookX = v.bg.includes("altar") ? 2.2 : 0;
          setCam(stage, [0, 1.6, 6.2 - punch * 0.7], [lookX, 1.5, 0], 38);
        } else if (v.kind === "item") {
          setCam(stage, [0, 1.5, 6.0 - punch * 0.5], [0, 1.45, 2.4], 38);
          const list = items[i]!;
          list.forEach((c, n) => {
            const m = list.length;
            const ang = m > 1 ? (n - (m - 1) / 2) * 0.38 : 0;
            const spread = easeOutCubic(ramp(lt, 0, 0.18, (k) => k));
            c.group.position.set(Math.sin(ang) * 1.8 * spread, 1.55 + (Math.cos(ang) - 1) * 1.8 * spread, 2.4 + n * 0.01);
            c.mesh.rotation.z = -ang * spread * 0.8;
            c.face(stage.camera.position);
          });
        } else {
          setCam(stage, [0.15, 1.55, 6.0 - punch * 0.6], [-0.1, 1.45, 0], 38);
          hero.group.position.set(-0.1, 0, 0.3);
          hero.u("uRim").value = 0.4;
          hero.u("uSway").value = 0.3 * Math.sin(t * 3);
          hero.face(stage.camera.position);
        }
      } else {
        const lt = t - SILHOUETTE;
        setCam(stage, [0.1, 1.5, 6.0 - 0.2 * lt], [0, 1.45, 0], 36);
        sil.group.position.set(0, 0, 0.4);
        sil.u("uDark").value = 0.94;
        sil.u("uRim").value = 2.6;
        sil.u("uRimColor").value.setRGB(1.0, 0.6, 0.3);
        sil.u("uRimDir").value.set(-0.3, 1);
        sil.u("uSway").value = 0.35 * Math.sin(t * 1.6);
        sil.u("uBreath").value = Math.sin(t * 1.8) * 0.015;
        sil.face(cam);
        silGlow.set(new THREE.Vector3(0, 1.5, -1.0), 3.4, 0.3);
        runAtmo(atmo, stage, 72 + t);
      }
    },
    grade: (t) => {
      const inMontage = t < SILHOUETTE;
      const lt = t % HALF;
      return {
        exposure: inMontage ? (MONTAGE[Math.floor(t / HALF)]!.kind === "room" ? 1.55 : 1.05) : 0.95,
        saturation: inMontage ? 0.95 : 0.85,
        vignette: inMontage ? 0.55 : 0.75,
        bloom: 0.5,
        split: 0.7,
        flash: inMontage ? 0.18 * pulse(lt, 0, 0.0001, 0.08) : 0.12 * pulse(t, SILHOUETTE, 0.0001, 0.2),
        aberration: inMontage ? 4 * pulse(lt, 0, 0.0001, 0.2) : 0,
      };
    },
  };
}

// ── 31–32 Logo aus Glut, stehen lassen, Abblende bis 81,41 ─────────────────────────────────────────────
function s31(): Shot {
  const group = g();
  let logo!: Puppet;
  let embers!: PointCloud;
  let under!: Glow;
  let atmo!: Atmosphere;
  const N = 1400;
  const pts: { from: THREE.Vector3; to: THREE.Vector3; ts: number; d: number; s: number; ph: number }[] = [];
  const H = 1.7;
  const LOGO_Y = 1.45;
  return {
    id: "31-32", t0: 74.5, t1: 81.41, group,
    async setup(stage) {
      logo = await card(stage, "ui/logo.webp", H);
      logo.group.position.set(0, LOGO_Y, 0);
      under = new Glow(new THREE.Color(1.4, 0.6, 0.22));
      embers = new PointCloud(N, true, 0.0);
      group.add(under.sprite, logo.group, embers.points);
      atmo = atmosphere(group, 311, [0.5, 0.46, 0.44], [2.4, 1.0, 0.3], 350, 140);
      // Zielpunkte aus den deckenden Pixeln des Logos
      const { img } = await load(stage, "ui/logo.webp");
      const c = document.createElement("canvas");
      const w = 420;
      const h = Math.round((w * img.height) / img.width);
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const cand: [number, number][] = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3]! > 150) cand.push([x, y]);
      const W = (H * img.width) / img.height;
      const r = rng(312);
      for (let i = 0; i < N; i++) {
        const [px, py] = cand[Math.floor(r() * cand.length)]!;
        const to = new THREE.Vector3((px / w - 0.5) * W, LOGO_Y + (0.5 - py / h) * H, 0.05);
        const from = new THREE.Vector3((r() - 0.5) * 7, -1.2 - r() * 1.5, (r() - 0.5) * 2.5);
        pts.push({ from, to, ts: 0.05 + r() * 1.2, d: 0.9 + r() * 0.7, s: 0.5 + r() * 0.9, ph: r() * 6.28 });
      }
    },
    update(t, stage) {
      setCam(stage, [0, LOGO_Y, 6.2 - 0.5 * easeInOutCubic(t / 6.9)], [0, LOGO_Y, 0], 32);
      logo.u("uDissolve").value = 1.05 * (1 - ramp(t, 0.9, 2.7, (k) => k));
      logo.u("uRim").value = 0;
      logo.mesh.rotation.y = 0;
      under.set(new THREE.Vector3(0, LOGO_Y - 0.75, -0.6), 5, 0.07 * ramp(t, 0.6, 2.4) * (0.85 + 0.15 * Math.sin(t * 2.3)));
      under.sprite.scale.set(8, 2.6, 1);
      embers.setCamera(stage.camera);
      pts.forEach((p, i) => {
        const k = (t - p.ts) / p.d;
        if (k < 0) {
          embers.col.set([0, 0, 0, 0], i * 4);
          return;
        }
        const e = easeInOutCubic(k);
        const swirl = (1 - e) * 0.5;
        const x = p.from.x + (p.to.x - p.from.x) * e + Math.sin(t * 2.2 + p.ph) * swirl;
        const y = p.from.y + (p.to.y - p.from.y) * e + Math.cos(t * 1.7 + p.ph) * swirl * 0.4;
        const z = p.from.z + (p.to.z - p.from.z) * e;
        embers.pos.set([x, y, z], i * 3);
        const arrive = k >= 1 ? 1 - smooth((t - p.ts - p.d) / 0.7) : 1;
        const flick = 0.7 + 0.3 * Math.sin(t * 11 + p.ph * 3);
        embers.col.set([2.6, 1.1 + 0.4 * e, 0.35, Math.max(0, arrive) * flick * smooth(k * 4)], i * 4);
        embers.size[i] = p.s * 0.03;
      });
      embers.commit();
      runAtmo(atmo, stage, 75 + t * 0.6, 0.8);
    },
    grade: (t) => ({ exposure: 1.0, saturation: 0.9, vignette: 0.7, bloom: 0.5, split: 0.6, fade: ramp(t, 5.1, 6.85) }),
  };
}

export const finaleShots = (): Shot[] => [s30(), s31()];
