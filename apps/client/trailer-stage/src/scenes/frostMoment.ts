// claude:2026-10-24T09:00:00+02:00 — Testszene B „Frost-Moment“ (Technik von Storyboard-Shot 24 mit Bestandsfiguren, Musik 55,53–58,44 s).
// τ 0,00–0,32  Zwei Dornwölfe springen auf die Frostmagierin zu, sie reißt die Hände hoch, die Frostwelle läuft los.
// τ 0,32       Taktschlag (55,85 s): Die Wölfe frieren im Sprung ein, alles andere läuft in Zeitlupe weiter.
// τ 0,40–2,91  Kamerafahrt durch die erstarrten Wölfe; Schock-Kette auf Schlag 3 (57,15 s) und Schlag 4 (57,80 s).
import * as THREE from "three";
import { easeOutCubic, pulse, ramp, smooth, timeRemap, track, wobble, type Vec3 } from "../anim";
import { Atmosphere, buildBackdrop, PointCloud } from "../env";
import { Bolt, Burst, Glow, Ring, TEX } from "../fx";
import { Puppet } from "../puppet";
import type { Grade, Stage, TrailerScene } from "../stage";
import { asset, loadImage } from "../assets";
import { rng } from "../anim";

const NOVA = 0.2;
const FREEZE = 0.32;
const SHOCK1 = 1.62;
const SHOCK2 = 2.27;
const END = 2.91;
const slow = (tau: number): number => timeRemap([{ from: 0, rate: 1 }, { from: FREEZE, rate: 0.22 }], tau);

// claude:2026-10-24T10:24:00+02:00 — Kulisse wählbar: im Gesamt-Trailer steht die Szene in den Raid-Gruben (gk_room_3).
export function frostMoment(bg = "battlescreens/blackthorn.webp"): TrailerScene {
  let mage!: Puppet;
  let wolf1!: Puppet;
  let wolf2!: Puppet;
  let atmo!: Atmosphere;
  let shards!: Burst;
  let shards2!: Burst;
  let mist!: PointCloud;
  let mistSeed: { d: THREE.Vector3; s: number; sp: number }[] = [];
  let ring!: Ring;
  let ringV!: Ring;
  let glowCore!: Glow;
  let bolt1!: Bolt;
  let bolt2!: Bolt;
  let g1a!: Glow;
  let g1b!: Glow;
  let g2!: Glow;
  const world = new THREE.Group();
  const core = new THREE.Vector3(-1.05, 1.35, 0.35);
  const w1Center = new THREE.Vector3(0.9, 1.2, 0.5);
  const w2Center = new THREE.Vector3(2.1, 1.25, -0.55);

  return {
    id: "frostMoment",
    duration: END,
    audioStart: 55.53,
    async setup(stage: Stage, root?: THREE.Object3D) {
      const parent = root ?? stage.scene;
      const bdImg = await loadImage(asset(bg));
      // claude:2026-10-24T10:24:00+02:00 — Malerposition wie im Gesamt-Trailer
      const bd = buildBackdrop(await stage.texture(asset(bg)), bdImg.width / bdImg.height, { eye: 1.6, z: 6.2, horizon: 0.4, nearDist: 4, wallDist: 24 });
      parent.add(bd, world);
      const mImg = await loadImage(asset("portraits/human_frost_mage_f.webp"));
      mage = new Puppet({ url: "", height: 2.2, mirror: false, capeC: [0.45, 0.3], capeR: [0.25, 0.3], chest: 0.7, hip: 0.47 }, await stage.texture(asset("portraits/human_frost_mage_f.webp")), mImg);
      // claude:2026-10-24T16:28:00+02:00 — Ushkas Grubenhunde aus der Codex-Lieferung statt Dornwölfen
      const wImg = await loadImage(asset("monsters/gk_pit_hound.webp"));
      const wTex = await stage.texture(asset("monsters/gk_pit_hound.webp"));
      wolf1 = new Puppet({ url: "", height: 2.4, chest: 0.45, hip: 0.3 }, wTex, wImg);
      wolf2 = new Puppet({ url: "", height: 2.2, chest: 0.45, hip: 0.3 }, wTex, wImg);
      world.add(mage.group, wolf1.group, wolf2.group);

      atmo = new Atmosphere({ x: [-6, 6], y: [0, 5], z: [-5, 6] }, 700, 160, 21, [0.78, 0.86, 0.95], [0.9, 1.4, 2.6]);
      world.add(atmo.ash.points, atmo.embers.points);

      const iceHot = new THREE.Color(2.4, 3.0, 3.8);
      const iceCold = new THREE.Color(0.35, 0.6, 1.0);
      shards = new Burst({ seed: 31, count: 160, origin: core, dir: new THREE.Vector3(1, 0.15, 0.1), spread: 0.85, speed: [4, 13], life: [2.5, 4], gravity: -0.8, drag: 2.2, stretch: 0.03, width: 0.035, colors: [iceHot, iceCold], tex: TEX.shard() });
      shards2 = new Burst({ seed: 37, count: 120, origin: new THREE.Vector3(-1.2, 0.1, 0.3), originSpread: new THREE.Vector3(0.4, 0, 0.4), dir: new THREE.Vector3(1, 0.05, 0), spread: 1.0, speed: [3, 9], life: [2, 3.5], gravity: -0.3, drag: 2.6, stretch: 0.02, width: 0.03, colors: [iceHot, iceCold], tex: TEX.shard() });
      mist = new PointCloud(90, false, 0.0);
      const r = rng(41);
      for (let i = 0; i < 90; i++) {
        const ang = r() * Math.PI * 2;
        mistSeed.push({ d: new THREE.Vector3(Math.cos(ang) * (0.6 + r()), 0.05 + r() * 0.35, Math.sin(ang) * (0.6 + r()) * 0.6), s: 0.4 + r() * 0.9, sp: 1.5 + r() * 3 });
      }
      ring = new Ring(new THREE.Color(1.6, 2.2, 3.0), true);
      ringV = new Ring(new THREE.Color(1.4, 1.9, 2.8), false);
      glowCore = new Glow(new THREE.Color(1.8, 2.4, 3.6));
      const elec = new THREE.Color(1.0, 1.35, 2.2);
      bolt1 = new Bolt(elec);
      bolt2 = new Bolt(elec);
      g1a = new Glow(elec.clone());
      g1b = new Glow(elec.clone());
      g2 = new Glow(elec.clone());
      for (const o of [shards.mesh, shards2.mesh, mist.points, ring.mesh, ringV.mesh, glowCore.sprite, bolt1.mesh, bolt2.mesh, g1a.sprite, g1b.sprite, g2.sprite]) world.add(o);
    },

    update(tau, stage) {
      const cam = stage.camera;
      const s = slow(tau);
      const frozenT = Math.min(tau, FREEZE);

      // ── Kamera ──
      // nah durch die erstarrten Wölfe, dann vor dem ersten Schock in die halbnahe Seitenansicht (alle drei im Bild)
      let pos = track<Vec3>([
        { t: 0, v: [0.2, 1.05, 6.0] },
        { t: FREEZE, v: [0.2, 1.1, 5.6] },
        { t: 1.15, v: [0.9, 1.3, 4.5] },
        { t: 1.55, v: [1.2, 1.45, 5.2] },
        { t: END, v: [1.4, 1.55, 5.6] },
      ], tau);
      const look = track<Vec3>([
        { t: 0, v: [0.4, 1.15, 0] },
        { t: FREEZE, v: [0.5, 1.2, 0.1] },
        { t: 1.15, v: [0.75, 1.25, 0.2] },
        { t: 1.55, v: [0.45, 1.3, 0.1] },
        { t: END, v: [0.35, 1.35, 0.0] },
      ], tau);
      const shake = 0.06 * pulse(tau, FREEZE, 0.0001, 0.35) + 0.035 * pulse(tau, SHOCK1, 0.0001, 0.25) + 0.03 * pulse(tau, SHOCK2, 0.0001, 0.25);
      pos = [pos[0] + wobble(tau * 2, 3) * shake, pos[1] + wobble(tau * 2, 4) * shake, pos[2]];
      cam.fov = 38 - 3 * ramp(tau, FREEZE - 0.02, FREEZE + 0.06, easeOutCubic) + 3 * ramp(tau, 1.15, 1.55);
      cam.updateProjectionMatrix();
      cam.position.set(...pos);
      cam.lookAt(new THREE.Vector3(...look));
      const cp = cam.position;

      // ── Magierin ──
      mage.group.position.set(-1.5, 0, 0.2);
      mage.u("uLean").value = -0.06 * ramp(tau, 0, NOVA) + 0.1 * ramp(tau, NOVA, NOVA + 0.08, easeOutCubic);
      mage.u("uBreath").value = Math.sin(s * 2.4) * 0.012;
      mage.u("uSway").value = Math.sin(s * 1.6) * 0.5 - 1.4 * ramp(tau, NOVA, NOVA + 0.1) * (1 - ramp(s, 0.5, 1.4));
      mage.u("uRim").value = 0.9 + 1.4 * pulse(tau, NOVA + 0.05, 0.05, 0.6);
      mage.u("uRimColor").value.setRGB(0.7, 1.0, 1.6);
      mage.u("uRimDir").value.set(1, 0.2);
      mage.u("uTint").value.setRGB(0.86, 0.9, 1.0);
      mage.face(cp);

      // ── Wölfe: Sprung, dann eingefroren ──
      const leap = (t: number, x0: number, x1: number, y0: number, yPeak: number, z: number): THREE.Vector3 => {
        const k = t / 0.55; // Sprungdauer bis zur Landung
        const x = x0 + (x1 - x0) * k;
        const y = y0 + (yPeak - y0) * Math.sin(Math.min(1, k) * Math.PI);
        return new THREE.Vector3(x, y, z);
      };
      const p1 = leap(frozenT + 0.18, 3.0, 0.1, 0.0, 1.05, 0.55);
      const p2 = leap(frozenT + 0.05, 4.4, 1.2, 0.0, 0.9, -0.7);
      wolf1.group.position.copy(p1);
      wolf2.group.position.copy(p2);
      // Sprung: Nase hoch beim Absprung, waagrecht im Scheitel (Rolle in der Bildebene)
      wolf1.mesh.rotation.z = -0.22 + 0.25 * Math.min(1, (frozenT + 0.18) / 0.55);
      wolf2.mesh.rotation.z = -0.22 + 0.25 * Math.min(1, (frozenT + 0.05) / 0.55);
      for (const [w, k] of [[wolf1, 0], [wolf2, 1]] as const) {
        w.u("uLean").value = 0.1;
        (w.u("uScale").value as THREE.Vector2).set(1.08, 0.96);
        w.u("uSway").value = 0;
        w.u("uFrost").value = 0.72 * ramp(tau, FREEZE, FREEZE + 0.12);
        w.u("uTime").value = tau;
        w.u("uFlash").value = k === 0 ? 0.5 * pulse(tau, SHOCK1, 0.0001, 0.2) : 0.5 * pulse(tau, SHOCK2, 0.0001, 0.2);
        w.u("uFlashColor").value.setRGB(0.75, 0.9, 1.1);
        w.u("uRim").value = 0.3 + 0.4 * ramp(tau, FREEZE, FREEZE + 0.2);
        w.u("uRimColor").value.setRGB(0.6, 0.9, 1.5);
        w.u("uRimDir").value.set(-1, 0.4);
        w.u("uTint").value.setRGB(0.85, 0.88, 0.95);
        w.shadow.visible = true;
        w.shadow.position.y = 0.005 - w.group.position.y;
        (w.shadow.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.max(0, 1 - w.group.position.y);
        w.face(cp);
      }
      w1Center.set(p1.x + 0.15, p1.y + 0.35, 0.5);
      w2Center.set(p2.x + 0.1, p2.y + 0.35, -0.55);

      // ── Atmosphäre in Zeitlupe ──
      atmo.ash.setCamera(cam);
      atmo.embers.setCamera(cam);
      atmo.update(s, cp.z, 1);

      // ── Frostnova ──
      const na = Math.max(0, tau - NOVA) < FREEZE - NOVA ? tau - NOVA : FREEZE - NOVA + (s - FREEZE);
      shards.mesh.visible = tau >= NOVA;
      shards2.mesh.visible = tau >= NOVA;
      shards.update(na, cp);
      shards2.update(na, cp);
      ring.update(na, 0.55, 4.2, new THREE.Vector3(-1.5, 0.03, 0.2), undefined, 1.0);
      ringV.update(na, 0.4, 1.6, core, cp, 0.45);
      glowCore.set(core, 1.1, 0.9 * pulse(tau, NOVA + 0.04, 0.03, 0.3));
      mist.setCamera(cam);
      mistSeed.forEach((m, i) => {
        const k = Math.max(0, na);
        const reach = (1 - Math.exp(-k * m.sp)) * 2.2;
        const p = new THREE.Vector3(-1.5, 0, 0.2).addScaledVector(m.d, reach);
        mist.pos.set([p.x, p.y, p.z], i * 3);
        const a = tau < NOVA ? 0 : 0.06 * smooth(k / 0.15) * (1 - smooth((k - 0.8) / 1.0));
        mist.col.set([0.62, 0.74, 0.9, a], i * 4);
        mist.size[i] = m.s * (0.25 + reach * 0.25);
      });
      mist.commit();

      // ── Schock-Kette ──
      const b1 = pulse(tau, SHOCK1, 0.0001, 0.33);
      const b2 = pulse(tau, SHOCK2, 0.0001, 0.33);
      bolt1.update(core, w1Center, tau, cp, Math.min(1, b1 * 1.5), 0.028, 7);
      bolt2.update(w1Center, w2Center, tau, cp, Math.min(1, b2 * 1.5), 0.028, 13);
      g1a.set(core, 0.45, 0.8 * b1);
      g1b.set(w1Center, 0.6, 0.8 * b1 + 0.5 * b2);
      g2.set(w2Center, 0.6, 0.8 * b2);
    },

    grade(tau): Partial<Grade> {
      const flash = 0.32 * pulse(tau, FREEZE, 0.0001, 0.14) + 0.16 * pulse(tau, SHOCK1, 0.0001, 0.12) + 0.14 * pulse(tau, SHOCK2, 0.0001, 0.12);
      const aberration = 7 * pulse(tau, FREEZE, 0.0001, 0.4) + 4 * pulse(tau, SHOCK1, 0.0001, 0.2) + 4 * pulse(tau, SHOCK2, 0.0001, 0.2);
      return {
        exposure: 1.05,
        saturation: 0.82,
        contrast: 1.1,
        tint: [0.9 + 0.1 * (1 - ramp(tau, FREEZE, FREEZE + 0.3)), 0.97, 1.1],
        flash,
        aberration,
        bloom: 0.45 + 0.25 * pulse(tau, FREEZE, 0.0001, 0.5),
        vignette: 0.55,
        fade: 1 - smooth(tau / 0.12),
      };
    },
  };
}
