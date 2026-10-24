// claude:2026-10-24T12:14:00+02:00 — Trailer v4 „Inventar“: Tableaus. Flache Komposition auf Stein, Kamera frontal (z 10, 30°),
// Wechsel im Takt; Zahlen kommen aus data.json (gen-v4-data.ts), nie von Hand.
import * as THREE from "three";
import { easeInOutCubic, easeOutCubic, ramp, smooth } from "../anim";
import { load, setCam, type Shot } from "../kit";
import data from "./data.json";
import { Batch, buildAtlas, label, stone } from "./ui";

const BEAT = 0.6486;
const BAR = 4 * BEAT;
const g = () => new THREE.Group();
/** Item-Platte wie im Inventar: dunkler Grund, Rand in Seltenheitsfarbe (Farbe nur am Rahmen, nie am Item) */
export function plateTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#26221e");
  grad.addColorStop(1, "#121010");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = color;
  g.globalAlpha = 0.85;
  g.lineWidth = 4;
  g.strokeRect(3, 3, 122, 122);
  g.globalAlpha = 1;
  g.strokeStyle = "#0c0b0a";
  g.lineWidth = 2;
  g.strokeRect(7, 7, 114, 114);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Farbe zu Weiß hin aufhellen (Lesbarkeit kleiner Schrift) */
export function lighten(hex: string, k: number): string {
  const c = new THREE.Color(hex).lerp(new THREE.Color(1, 1, 1), k);
  return `#${c.getHexString()}`;
}

/** Seltenheitsfarben und -namen wie im Spiel (styles/components.css --rar-*, toast.rareFind.*) */
export const RARITY: Record<string, { name: string; color: string; rank: number }> = {
  godly: { name: "Godly", color: "#ffd700", rank: 0 },
  legendary: { name: "Legendary", color: "#e0902a", rank: 1 },
  epic: { name: "Epic", color: "#b07fd8", rank: 2 },
  superRare: { name: "Super Rare", color: "#5b8fd6", rank: 3 },
  rare: { name: "Rare", color: "#3cb043", rank: 4 },
  common: { name: "Common", color: "#c8c8c8", rank: 5 },
  poor: { name: "Poor", color: "#555555", rank: 6 },
  none: { name: "", color: "#888888", rank: 7 },
};

export function frontCam(stage: Parameters<Shot["update"]>[1], d = 10, x = 0, y = 0): void {
  setCam(stage, [x, y, d], [x, y, 0], 30);
}

// ── 02 23 Skills: Raster, Reihe für Reihe im Takt, dann Sortierung in Sammeln · Handwerk · Kampf ──────
export function s02(): Shot {
  const group = g();
  const ORDER = ["gathering", "crafting", "combat"];
  const skills = [...data.skills].sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group));
  const tiles: { icon: THREE.Mesh; name: THREE.Mesh; grp: number; j: number }[] = [];
  const heads: THREE.Mesh[] = [];
  return {
    id: "v4-02", t0: 3.97, t1: 3.97 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage));
      const count = [0, 0, 0];
      for (const s of skills) {
        const { tex } = await load(stage, s.icon);
        const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
        const name = label(s.name, { px: 64, height: 0.19 });
        const grp = ORDER.indexOf(s.group);
        tiles.push({ icon, name, grp, j: count[grp]!++ });
        group.add(icon, name);
      }
      for (const h of ["GATHERING", "CRAFTING", "COMBAT"]) {
        const m = label(h, { px: 72, height: 0.24, color: "#efe6d2", spacing: 9 });
        heads.push(m);
        group.add(m);
      }
    },
    update(t, stage) {
      frontCam(stage, 10 - 0.35 * (t / (2 * BAR)), 0, -0.15);
      const sortK = ramp(t, BAR - 0.05, BAR + 0.45, easeInOutCubic);
      tiles.forEach((tile, i) => {
        // A: 6 × 4, Reihe r erscheint auf Schlag r
        const ax = ((i % 6) - 2.5) * 1.22;
        const ay = 1.0 - Math.floor(i / 6) * 1.08;
        const appear = ramp(t, Math.floor(i / 6) * BEAT - 0.02, Math.floor(i / 6) * BEAT + 0.16, easeOutCubic);
        // B: drei Blöcke à 2 Spalten
        const bx = (tile.grp - 1) * 3.0 + ((tile.j % 2) - 0.5) * 1.22;
        const by = 0.62 - Math.floor(tile.j / 2) * 0.9;
        const x = ax + (bx - ax) * sortK;
        const y = ay + (by - ay) * sortK;
        const sc = 0.75 + 0.25 * appear;
        tile.icon.position.set(x, y + 0.1, 0);
        tile.icon.scale.setScalar(sc);
        tile.name.position.set(x, y - 0.42, 0.01);
        (tile.icon.material as THREE.MeshBasicMaterial).opacity = appear;
        (tile.name.material as THREE.MeshBasicMaterial).opacity = appear;
      });
      const headK = ramp(t, BAR + 0.3, BAR + 0.6, easeOutCubic);
      heads.forEach((h, k) => {
        h.position.set((k - 1) * 3.0, 1.3 + 0.08 * (1 - headK), 0.01);
        (h.material as THREE.MeshBasicMaterial).opacity = headK;
      });
    },
    grade: () => ({ exposure: 1.0, vignette: 0.7, bloom: 0.2 }),
  };
}

// ── 04 1,300+ Items: Wand aus allen Item-Bildern zoomt heraus; dann Seltenheitsreihen im Takt ──────────
export function s04(): Shot {
  const group = g();
  const wallGrp = g();
  const rowsGrp = g();
  const COLS = 48;
  const items = [...data.items].sort((a, b) => (RARITY[a.rarity]?.rank ?? 9) - (RARITY[b.rarity]?.rank ?? 9));
  const ROWS = Math.ceil(items.length / COLS);
  const CELL = 0.5;
  let wall!: Batch;
  const tierRows: { label: THREE.Mesh; batch: Batch; plates: Batch; n: number; rects: { u0: number; v0: number; u1: number; v1: number }[] }[] = [];
  const TIERS = ["rare", "epic", "legendary", "godly"];
  // Zellen nach Abstand zur Mitte sortiert: die seltensten Stücke liegen in der Mitte
  const cells: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push([c, r]);
  cells.sort((a, b) => Math.hypot((a[0] - (COLS - 1) / 2) * 0.62, a[1] - (ROWS - 1) / 2) - Math.hypot((b[0] - (COLS - 1) / 2) * 0.62, b[1] - (ROWS - 1) / 2));
  return {
    id: "v4-04", t0: 14.35, t1: 14.35 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage, 70, 40, -0.6));
      const atlas = await buildAtlas(items.map((i) => i.img), 128, COLS, true);
      wall = new Batch(items.length, atlas.tex);
      items.forEach((_, i) => {
        const [c, r] = cells[i]!;
        wall.set(i, (c - (COLS - 1) / 2) * CELL, ((ROWS - 1) / 2 - r) * CELL, 0, CELL * 0.92, CELL * 0.92, atlas.rects[i]!, 1, 1);
      });
      wall.commit();
      wallGrp.add(wall.mesh);
      group.add(wallGrp, rowsGrp);
      // Reihen: je Seltenheit sieben Stücke (Ausrüstung bevorzugt)
      for (const tier of TIERS) {
        const pick = items.filter((i) => i.rarity === tier && i.slot).slice(0, 7);
        const idx = pick.map((p) => items.indexOf(p));
        const batch = new Batch(pick.length, atlas.tex);
        const plates = new Batch(pick.length, plateTexture(RARITY[tier]!.color));
        const lab = label(RARITY[tier]!.name.toUpperCase(), { px: 72, height: 0.26, color: lighten(RARITY[tier]!.color, 0.55), spacing: 8 });
        tierRows.push({ label: lab, batch, plates, n: pick.length, rects: idx.map((k) => atlas.rects[k]!) });
        rowsGrp.add(plates.mesh, batch.mesh, lab);
      }
    },
    update(t, stage) {
      const rows = t >= BAR;
      wallGrp.visible = true;
      rowsGrp.visible = rows;
      if (!rows) {
        const k = easeInOutCubic(ramp(t, 0.05, BAR - 0.2, (x) => x));
        frontCam(stage, 6.5 + 20.5 * k, 0, 0);
        wallGrp.position.z = 0;
        wall.brightness(1);
        return;
      }
      // Wand tritt zurück und wird dunkel, davor die Reihen
      const lt = t - BAR;
      frontCam(stage, 10, 0, 0);
      wallGrp.position.z = -6;
      wall.brightness(0.22);
      tierRows.forEach((row, k) => {
        const appear = ramp(lt, k * BEAT - 0.02, k * BEAT + 0.18, easeOutCubic);
        const y = 1.0 - k * 0.98;
        for (let i = 0; i < row.n; i++) {
          const x = -1.55 + i * 0.95;
          row.plates.set(i, x + 0.2 * (1 - appear), y, -0.01, 0.9, 0.9, { u0: 0, v0: 0, u1: 1, v1: 1 }, 1, appear);
          row.batch.set(i, x + 0.2 * (1 - appear), y, 0, 0.76, 0.76, row.rects[i]!, 1, appear);
        }
        row.plates.commit();
        row.batch.commit();
        row.label.position.set(-3.1, y, 0.01);
        (row.label.material as THREE.MeshBasicMaterial).opacity = appear;
      });
    },
    grade: (t) => ({ exposure: t >= BAR ? 0.95 : 1.0, vignette: 0.7, bloom: 0.2 }),
  };
}

// ── 07 140+ Monster: Bestiarium-Raster klappt im Takt auf; dann treten drei Champions vor ────────────────
export function s07(): Shot {
  const group = g();
  const COLS = 15;
  const mons = data.monsters;
  const ROWS = Math.ceil(mons.length / COLS);
  const CELL = 0.62;
  let cards!: Batch;
  let plates!: Batch;
  const champs: { m: THREE.Mesh; name: THREE.Mesh }[] = [];
  let rects: { u0: number; v0: number; u1: number; v1: number }[] = [];
  return {
    id: "v4-07", t0: 24.72, t1: 24.72 + 2 * BAR, group,
    async setup(stage) {
      group.add(await stone(stage));
      const atlas = await buildAtlas(mons.map((m) => m.img), 256, COLS, true);
      cards = new Batch(mons.length, atlas.tex);
      // Kartengrund: dunkle Platte mit Eisenrand
      const pc = document.createElement("canvas");
      pc.width = pc.height = 128;
      const pg = pc.getContext("2d")!;
      const grad = pg.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, "#2a2622");
      grad.addColorStop(1, "#141210");
      pg.fillStyle = grad;
      pg.fillRect(0, 0, 128, 128);
      pg.strokeStyle = "#5a524a";
      pg.lineWidth = 6;
      pg.strokeRect(3, 3, 122, 122);
      pg.strokeStyle = "#1a1715";
      pg.lineWidth = 2;
      pg.strokeRect(8, 8, 112, 112);
      const ptex = new THREE.CanvasTexture(pc);
      ptex.colorSpace = THREE.SRGBColorSpace;
      plates = new Batch(mons.length, ptex);
      group.add(plates.mesh, cards.mesh);
      // drei Champions groß davor
      const pick = ["elite_crypt_pyroclasp", "elite_pastures_boar", data.elites[5]?.id ?? ""].map((id) => data.elites.find((e) => e.id === id) ?? data.elites[0]!);
      for (const e of pick) {
        const { tex, img } = await load(stage, e.img);
        const h = 2.6;
        const m = new THREE.Mesh(new THREE.PlaneGeometry((h * img.width) / img.height, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
        const name = label(e.name, { px: 56, height: 0.17 });
        champs.push({ m, name });
        group.add(m, name);
      }
      rects = atlas.rects;
    },
    update(t, stage) {
      frontCam(stage, 10 - 0.3 * (t / (2 * BAR)), 0, -0.25);
      const champK = ramp(t, BAR - 0.05, BAR + 0.35, easeOutCubic);
      const dim = 1 - 0.7 * champK;
      for (let i = 0; i < mons.length; i++) {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        // zwei Reihen je Schlag, Karte klappt von schmal zu voll
        const appear = ramp(t, Math.floor(r / 2) * BEAT - 0.02, Math.floor(r / 2) * BEAT + 0.2, easeOutCubic);
        const x = (c - (COLS - 1) / 2) * CELL;
        const y = ((ROWS - 1) / 2 - r) * CELL - 0.35;
        plates.set(i, x, y, 0, CELL * 0.94 * appear, CELL * 0.94, { u0: 0, v0: 0, u1: 1, v1: 1 }, dim, appear);
        cards.set(i, x, y + 0.01, 0.01, CELL * 0.86 * appear, CELL * 0.86, rects[i]!, dim, appear);
      }
      plates.commit();
      cards.commit();
      champs.forEach((ch, k) => {
        const x = (k - 1) * 3.0;
        const lift = 0.4 * (1 - champK);
        ch.m.position.set(x, -0.25 - lift, 1.0);
        ch.name.position.set(x, -1.75 - lift, 1.01);
        const o = ramp(t, BAR - 0.05 + k * 0.12, BAR + 0.3 + k * 0.12, smooth);
        (ch.m.material as THREE.MeshBasicMaterial).opacity = o;
        (ch.name.material as THREE.MeshBasicMaterial).opacity = o;
      });
    },
    grade: () => ({ exposure: 1.0, vignette: 0.7, bloom: 0.2 }),
  };
}
