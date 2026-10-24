// claude:2026-10-24T10:45:00+02:00 — Testszene A „Erster Schlag“ = Storyboard-Shots 09–11 (Musik 22,13–27,32 s).
// τ 0,00–1,87  Shot 09: Nahaufnahme, Kamera fährt am Schwert hoch zum Gesicht, Hintergrund unscharf.
// τ 1,87–2,59  Shot 10: Schwarz im Aussetzer, Funkenregen von unten, Weißblitz auf den Crash.
// τ 2,59–5,19  Shot 11: Treffer exakt auf dem Crash (24,72 s) in Zeitlupe, Rampe auf Echtzeit, zweiter Hieb auf Schlag 3.
import * as THREE from "three";
import { easeInOutCubic, easeOutCubic, pulse, ramp, smooth, timeRemap, track, wobble, type Vec3 } from "../anim";
import { Atmosphere, blurredTexture, buildBackdrop } from "../env";
import { Burst, DamageNumber, Glow, Ring, SlashArc, TEX } from "../fx";
import { Puppet } from "../puppet";
import type { Grade, Stage, TrailerScene } from "../stage";
import { asset, loadImage } from "../assets";

const SHOT10 = 1.87;
const CRASH = 2.59; // = 24,72 s im Track
const HIT2 = 3.89; // Schlag 3 des Takts = 26,02 s

// Musikzeit → Handlungszeit ab dem Crash (0 = erster Treffer)
const SEGS = [
  { from: CRASH, rate: 0.15 },
  { from: 3.25, rate: 0.5 },
  { from: 3.45, rate: 1 },
  { from: HIT2, rate: 0 },
  { from: HIT2 + 0.06, rate: 1 },
];
const act = (tau: number): number => timeRemap(SEGS, tau);
const A2 = act(HIT2);

export function firstStrike(): TrailerScene {
  let hero!: Puppet;
  let gob!: Puppet;
  let backdrop!: THREE.Mesh;
  let sharpTex!: THREE.Texture;
  let softTex!: THREE.Texture;
  let atmo!: Atmosphere;
  let riser!: Burst;
  let sparks1!: Burst;
  let sparks2!: Burst;
  let dust!: Burst;
  let glow1!: Glow;
  let glow2!: Glow;
  let ring1!: Ring;
  let ring2!: Ring;
  let arc1!: SlashArc;
  let arc2!: SlashArc;
  let dmg1!: DamageNumber;
  let dmg2!: DamageNumber;
  const world = new THREE.Group();
  const hit1 = new THREE.Vector3(0.42, 1.2, 0.28);

  return {
    id: "firstStrike",
    duration: 5.19,
    audioStart: 22.13,
    async setup(stage: Stage) {
      const bdImg = await loadImage(asset("battlescreens/borderlands.webp"));
      sharpTex = await stage.texture(asset("battlescreens/borderlands.webp"));
      softTex = blurredTexture(bdImg, 7);
      backdrop = buildBackdrop(sharpTex, bdImg.width / bdImg.height, { eye: 1.6, z: 10, horizon: 0.41, nearDist: 4, wallDist: 26 });
      stage.scene.add(backdrop);
      stage.scene.add(world);

      const heroImg = await loadImage(asset("portraits/human_warrior_m.webp"));
      hero = new Puppet({ url: "", height: 2.25, mirror: false, capeC: [0.62, 0.38], capeR: [0.2, 0.3], chest: 0.7, hip: 0.46 }, await stage.texture(asset("portraits/human_warrior_m.webp")), heroImg);
      const gobImg = await loadImage(asset("monsters/goblin_reaver.webp"));
      gob = new Puppet({ url: "", height: 2.05, chest: 0.58, hip: 0.36 }, await stage.texture(asset("monsters/goblin_reaver.webp")), gobImg);
      world.add(hero.group, gob.group);

      atmo = new Atmosphere({ x: [-6, 6], y: [0, 5], z: [-5, 6] }, 650, 120, 11);
      world.add(atmo.ash.points, atmo.embers.points);

      const hot = new THREE.Color(5, 3.6, 1.8);
      const cold = new THREE.Color(1.7, 0.4, 0.08);
      riser = new Burst({ seed: 3, count: 220, origin: new THREE.Vector3(0, -0.6, 0), originSpread: new THREE.Vector3(5, 0, 2), dir: new THREE.Vector3(0, 1, 0), spread: 0.25, speed: [4, 10], life: [0.5, 1.2], gravity: -1.5, drag: 0.3, stretch: 0.05, width: 0.02, colors: [hot, cold], emitOver: 0.42 });
      sparks1 = new Burst({ seed: 5, count: 130, origin: hit1, dir: new THREE.Vector3(1, 0.45, 0.35), spread: 0.8, speed: [3, 11], life: [0.4, 1.2], gravity: -9, drag: 1.3, stretch: 0.03, width: 0.022, colors: [hot, cold] });
      sparks2 = new Burst({ seed: 9, count: 80, origin: new THREE.Vector3(0.95, 1.05, 0.25), dir: new THREE.Vector3(1, 0.2, 0.2), spread: 0.75, speed: [3, 9], life: [0.3, 0.9], gravity: -9, drag: 1.4, stretch: 0.03, width: 0.02, colors: [hot, cold] });
      dust = new Burst({ seed: 12, count: 46, origin: new THREE.Vector3(-0.15, 0.06, 0.15), originSpread: new THREE.Vector3(0.5, 0, 0.3), dir: new THREE.Vector3(0, 0.3, 0), spread: 0.95, speed: [0.4, 1.6], life: [0.6, 1.3], gravity: 0.25, drag: 2.5, stretch: 0.0, width: 0.32, colors: [new THREE.Color(0.32, 0.27, 0.21), new THREE.Color(0.18, 0.15, 0.12)], additive: false, tex: TEX.soft() });
      glow1 = new Glow(new THREE.Color(2.0, 1.5, 0.9));
      glow2 = new Glow(new THREE.Color(1.8, 1.3, 0.8));
      ring1 = new Ring(new THREE.Color(1.3, 1.05, 0.8), false);
      ring2 = new Ring(new THREE.Color(1.1, 0.9, 0.7), false);
      arc1 = new SlashArc(0.95, 2.5, -0.85, 0.32, new THREE.Color(3.2, 2.9, 2.4), new THREE.Color(1.6, 0.7, 0.2));
      arc2 = new SlashArc(0.85, 3.0, 0.2, 0.26, new THREE.Color(3.0, 2.7, 2.2), new THREE.Color(1.5, 0.6, 0.18));
      dmg1 = new DamageNumber("1 284", { crit: true });
      dmg2 = new DamageNumber("642");
      for (const o of [riser.mesh, sparks1.mesh, sparks2.mesh, dust.mesh, glow1.sprite, glow2.sprite, ring1.mesh, ring2.mesh, arc1.mesh, arc2.mesh, dmg1.sprite, dmg2.sprite]) world.add(o);
    },

    update(tau, stage) {
      const cam = stage.camera;
      const shot = tau < SHOT10 ? 9 : tau < CRASH ? 10 : 11;
      const a = act(tau);

      // ── Kamera ──
      let pos: Vec3;
      let look: Vec3;
      let fov = 30;
      if (shot === 9) {
        const k = tau / SHOT10;
        // Original blickt nach rechts (zum Gegner); das Schwert hängt links am Körper
        pos = track<Vec3>([{ t: 0, v: [-1.62, 0.5, 1.45] }, { t: 1, v: [-1.0, 1.74, 1.75], ease: easeInOutCubic }], k);
        look = track<Vec3>([{ t: 0, v: [-1.95, 0.42, 0] }, { t: 1, v: [-1.32, 1.88, 0], ease: easeInOutCubic }], k);
        fov = 28;
      } else if (shot === 10) {
        pos = [0, 1.0, 4];
        look = [0, 1.6, 0];
      } else {
        const k = (tau - CRASH) / (5.19 - CRASH);
        pos = track<Vec3>([
          { t: 0, v: [0.15, 1.12, 3.4] },
          { t: 0.3, v: [0.85, 1.28, 3.25] },
          { t: 1, v: [1.05, 1.5, 4.7] },
        ], k);
        look = track<Vec3>([
          { t: 0, v: [0.35, 1.18, 0.1] },
          { t: 0.3, v: [0.55, 1.15, 0.1] },
          { t: 1, v: [0.75, 1.05, 0] },
        ], k);
        fov = 34 - 4 * pulse(tau, CRASH, 0.001, 0.5);
        // Kamerastöße (in Handlungszeit, damit sie in der Zeitlupe mitverlangsamen)
        const s1 = shot === 11 ? 0.07 * Math.exp(-Math.max(0, a) * 7) : 0;
        const s2 = a >= A2 ? 0.05 * Math.exp(-(a - A2) * 9) : 0;
        const sh = s1 + s2;
        pos = [pos[0] + wobble(a * 3, 1) * sh, pos[1] + wobble(a * 3, 2) * sh, pos[2]];
      }
      cam.fov = fov;
      cam.updateProjectionMatrix();
      cam.position.set(...pos);
      cam.lookAt(new THREE.Vector3(...look));
      const cp = cam.position;

      // ── Sichtbarkeit je Shot ──
      const blackout = shot === 10;
      backdrop.visible = !blackout;
      world.visible = true;
      hero.group.visible = !blackout;
      gob.group.visible = shot === 11;
      (backdrop.material as THREE.MeshBasicMaterial).map = shot === 9 ? softTex : sharpTex;

      // ── Held ──
      const breathe = Math.sin(tau * 2.6) * 0.012;
      let hx = -1.3;
      let bend = 0;
      let lean = 0;
      let sq: [number, number] = [1, 1];
      if (shot === 11) {
        // erster Hieb: ausgefallen, Nachzug, Rückkehr; zweiter Hieb: Ausholen und Ausfall
        hx = -0.3 + 0.1 * easeOutCubic(a / 0.2) - 0.45 * ramp(a, 0.2, 0.45);
        bend = 0.11 * (1 - ramp(a, 0.15, 0.45));
        sq = [1 + 0.05 * (1 - ramp(a, 0, 0.3)), 1 - 0.04 * (1 - ramp(a, 0, 0.3))];
        // Ausholen
        lean = -0.09 * ramp(a, 0.45, 0.6) * (1 - ramp(a, 0.6, A2));
        hx -= 0.12 * ramp(a, 0.45, 0.6);
        // Ausfall
        const lunge2 = ramp(a, A2 - 0.03, A2, easeOutCubic);
        hx += 0.95 * lunge2 - 0.35 * ramp(a, A2 + 0.25, A2 + 0.8);
        bend += 0.12 * lunge2 * (1 - ramp(a, A2 + 0.15, A2 + 0.6));
      }
      hero.group.position.set(hx, 0, 0);
      hero.u("uBend").value = bend;
      hero.u("uLean").value = lean;
      hero.u("uBreath").value = breathe;
      hero.u("uSway").value = Math.sin(tau * 1.7) * 0.5 + (shot === 11 ? -1.2 * (1 - ramp(a, 0, 0.6)) : 0);
      (hero.u("uScale").value as THREE.Vector2).set(sq[0], sq[1]);
      hero.u("uRim").value = shot === 9 ? 0.22 : 0.25;
      hero.u("uTint").value.set(0.92, 0.88, 0.84);
      hero.face(cp);

      // ── Goblin ──
      if (shot === 11) {
        const back1 = 0.55 * easeOutCubic(a / 0.35);
        const back2 = a >= A2 ? 0.8 * easeOutCubic((a - A2) / 0.3) : 0;
        gob.group.position.set(1.0 + back1 + back2, 0, 0.15);
        gob.u("uFlash").value = Math.max(0.6 * pulse(tau, CRASH, 0.0001, 0.12), 0.5 * pulse(tau, HIT2, 0.0001, 0.1));
        gob.u("uLean").value = 0.13 * (1 - ramp(a, 0, 0.45)) + (a >= A2 ? 0.28 * ramp(a, A2, A2 + 0.5) : 0);
        (gob.u("uScale").value as THREE.Vector2).set(1 - 0.06 * pulse(a, 0, 0.0001, 0.25), 1 + 0.04 * pulse(a, 0, 0.0001, 0.25));
        gob.u("uOpacity").value = 1 - ramp(a, A2 + 0.55, A2 + 1.1);
        gob.group.position.y = -0.15 * ramp(a, A2 + 0.4, A2 + 1.1);
        gob.u("uBreath").value = Math.sin(tau * 3.4) * 0.015;
        gob.u("uRim").value = 0.3;
        gob.u("uRimDir").value.set(-1, 0.3);
        gob.u("uTint").value.set(0.95, 0.92, 0.88);
        gob.face(cp);
      }

      // ── Atmosphäre ──
      atmo.ash.setCamera(cam);
      atmo.embers.setCamera(cam);
      atmo.update(shot === 11 ? 2.59 + a : tau, cp.z, blackout ? 0 : 1);

      // ── Effekte ──
      riser.mesh.visible = shot === 10;
      if (shot === 10) riser.update(tau - (SHOT10 + 0.22), cp);
      const s11 = shot === 11;
      sparks1.mesh.visible = s11;
      sparks2.mesh.visible = s11;
      dust.mesh.visible = s11;
      if (s11) {
        sparks1.update(a, cp);
        sparks2.update(a - A2, cp);
        dust.update(a + 0.05, cp);
        glow1.set(hit1, 0.95, 0.9 * pulse(tau, CRASH, 0.0001, 0.22));
        glow2.set(new THREE.Vector3(0.95, 1.05, 0.25), 0.7, 0.8 * pulse(tau, HIT2, 0.0001, 0.12));
        ring1.update(a, 0.3, 1.3, hit1, cp, 0.55);
        ring2.update(a - A2, 0.26, 0.9, new THREE.Vector3(0.95, 1.05, 0.25), cp, 0.45);
        arc1.mesh.position.copy(hit1).add(new THREE.Vector3(-0.1, 0.05, 0.05));
        arc1.mesh.lookAt(cp);
        arc1.update(a + 0.05, 0.09, 0.3);
        arc2.mesh.position.set(0.85, 1.05, 0.3);
        arc2.mesh.lookAt(cp);
        arc2.update(a - A2 + 0.04, 0.07, 0.22);
        dmg1.update(a, new THREE.Vector3(0.8, 1.45, 0.55), 1.05, 1.3);
        dmg2.update(a - A2, new THREE.Vector3(1.35, 1.35, 0.55), 0.75, 0.9);
      } else {
        for (const o of [glow1.sprite, glow2.sprite, ring1.mesh, ring2.mesh, arc1.mesh, arc2.mesh, dmg1.sprite, dmg2.sprite]) o.visible = false;
      }
    },

    grade(tau): Partial<Grade> {
      if (tau < SHOT10) {
        return { exposure: 0.82 + 0.1 * smooth(tau / SHOT10), saturation: 0.84, vignette: 0.75, bloom: 0.5, fade: 1 - smooth(tau / 0.35) };
      }
      if (tau < CRASH) {
        const flash = 1.1 * ramp(tau, 2.42, CRASH, (k) => k * k * k);
        return { exposure: 1, flash, vignette: 0.4, bloom: 0.45 };
      }
      const a = act(tau);
      const flash = Math.max(0.7 * pulse(tau, CRASH, 0.0001, 0.12), 0.2 * pulse(tau, HIT2, 0.0001, 0.1));
      const aberration = 8 * pulse(tau, CRASH, 0.0001, 0.45) + 4 * pulse(tau, HIT2, 0.0001, 0.2);
      void a;
      return { exposure: 0.96, saturation: 0.86, contrast: 1.1, flash, aberration, bloom: 0.4 + 0.25 * pulse(tau, CRASH, 0.0001, 0.6), vignette: 0.55 };
    },
  };
}
