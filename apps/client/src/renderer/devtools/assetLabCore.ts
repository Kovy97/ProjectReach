/**
 * ASSET-WERKSTATT, Kern (ohne React): Datenmodell, Speicher (v2), Rückgängig/Wiederholen, CSS-Erzeugung,
 * eingefügte Elemente, Export (CSS / Bauauftrag als Markdown). NUR Deutsch, bewusst ohne i18n (Dev-Werkzeug).
 * Kein GameState, keine Engine, kein Save-Kontakt. Wird nur über assetLab.tsx (lazy per import()) geladen.
 *
 * claude:2026-10-31T10:41:00+01:00 — Auftrag Chef 31.10.: Layout live gestalten (Box, Layout, Position, Text,
 * Sichtbarkeit, Ziehen, Einfügen, Notiz, Bauauftrag, Undo/Redo). Speicherformat v2 ist ABWÄRTSKOMPATIBEL:
 * v1-Einträge laden unverändert, alle neuen Felder (lay, hide, note, page, txt, orig, ins) sind optional.
 */

import FRAME_SLICES from "../assets/ui/werkstatt/rahmen/slices.json"; // claude:2026-11-01T10:53:58+01:00 — Painterly-Rahmen-Slices
import { CSS_CACHE_KEY, elText, matchesStoredText } from "./assetLabEarly"; // claude:2026-11-01T11:59:23+01:00 — Frühstart teilt Text-Prüfung + CSS-Cache
export { elText };

// ───────────────────────── Typen & Speicher ─────────────────────────

export const LS_KEY = "hearthforge:assetLab";
const LS_FILES = "hearthforge:assetLab:files";
export const STYLE_ID = "asset-lab-overrides";
export const ID_ATTR = "data-asset-lab-id";
export const INS_ATTR = "data-asset-lab-ins";
/** Tag der eingefügten Elemente: eigener Tag-Name, damit :nth-of-type der Spiel-Elemente (und gespeicherte Pfade) unverändert bleibt. */
export const INS_TAG = "al-ins";

export interface Ins {
  id: string;
  kind: "img" | "box";
  /** child: als letztes Kind des Ziels; after: direkt hinter dem Ziel. */
  mode: "child" | "after";
  /** Pfad/Selektor des Ziel-Elements (Eltern bei child, Vorgänger bei after). */
  target: string;
  targetLabel: string;
}

export interface Ov {
  scope: "el" | "sel";
  /** Selektor, mit dem die Regel greift (el: [data-asset-lab-id], sel: frei editierbar). */
  selector: string;
  /** el: lesbarer Strukturpfad (Export + Wiederfinden nach Neustart). */
  path?: string;
  labId?: string;
  label: string;
  bg?: string;
  border?: string;
  img?: string;
  bgSize?: string;
  bgRepeat?: string;
  bgPos?: string;
  tintColor?: string;
  tintAlpha?: number;
  slice?: number;
  fill?: boolean;
  bw?: number;
  outset?: number;
  brepeat?: string;
  /** Ein getauschter Rahmen übernimmt die Rahmenwerte des alten (roh, wie berechnet). */
  inh?: { slice: string; width: string; outset: string; repeat: string };
  borderWidth?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hue?: number;
  opacity?: number;
  // ── v2 ──
  /** Beliebige CSS-Eigenschaften (kebab-case) für Box/Layout/Position/Text/Sichtbarkeit. */
  lay?: Record<string, string>;
  /** display:none (A/B-fähig über den globalen Schalter). */
  hide?: boolean;
  /** Notiz „Was soll das bewirken?“ für die Umsetzung. */
  note?: string;
  /** Seite des Spiels beim ersten Ändern (Titel der Statusleiste). */
  page?: string;
  /** Textausschnitt des Elements zur Wiedererkennung. */
  txt?: string;
  /** Spielsprache, in der `txt` aufgenommen wurde (<html lang>). claude:2026-11-01T11:08:37+01:00 */
  lang?: string;
  /** Ursprungswerte (getComputedStyle) beim ersten Ändern, je CSS-Eigenschaft. */
  orig?: Record<string, string>;
  /** Gesetzt = dieses Override beschreibt ein eingefügtes Element. */
  ins?: Ins;
}
export type OvMeta = "scope" | "selector" | "path" | "labId" | "label";
export type OvProps = Omit<Ov, OvMeta>;
/** Patch: lay ist eine TEILWEISE Map (undefined = Eigenschaft entfernen), wird eingemischt. */
export type OvPatch = Omit<{ [K in keyof OvProps]?: OvProps[K] | undefined }, "lay"> & { lay?: Record<string, string | undefined> };

/** Felder, die ein Override allein nicht am Leben halten. */
const META_KEYS = new Set(["scope", "selector", "path", "labId", "label", "page", "txt", "lang", "orig"]);

export const ovs = new Map<string, Ov>();
export const customs = new Map<string, string>(); // Dateiname -> data:-URL
export const flags = { enabled: true };
export const listeners = new Set<() => void>();

export function ovKey(o: Pick<Ov, "scope" | "selector" | "labId">): string {
  return o.scope === "el" ? `el:${o.labId ?? ""}` : `sel:${o.selector}`;
}
function hasProps(o: Ov): boolean {
  return Object.keys(o).some((k) => !META_KEYS.has(k) && (o as unknown as Record<string, unknown>)[k] !== undefined);
}

// ───────────────────────── Assets ─────────────────────────

// claude:2026-10-30T18:07:00+01:00 — Nur URL-Strings (eager im lazy geladenen Chunk). Die Bilder selbst laden erst,
// wenn eine Vorschau sichtbar wird. Lazy-Glob würde pro Datei einen Mini-Chunk erzeugen (3000+ Dateien in out/).
// claude:2026-10-30T20:20:00+01:00 — nur UI-relevante Ordner (ui, icons, sidebar, skills, Root-bg_*); Inhalts-Ordner bewusst nicht enthalten.
const RAW = import.meta.glob([
  "../assets/ui/**/*.{png,webp,jpg,jpeg,gif,svg}",
  "../assets/icons/**/*.{png,webp,jpg,jpeg,gif,svg}",
  "../assets/sidebar/**/*.{png,webp,jpg,jpeg,gif,svg}",
  "../assets/skills/**/*.{png,webp,jpg,jpeg,gif,svg}",
  "../assets/bg_*.{png,webp,jpg,jpeg}",
], {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface Asset {
  key: string;
  name: string;
  dir: string;
  url: string;
}
export const HEAVY = new Set(["items", "monsters", "portraits", "pets", "battlescreens", "camp", "zones", "events", "dungeons"]);
export const ASSETS: Asset[] = Object.entries(RAW)
  .map(([key, url]) => {
    const rel = key.replace("../assets/", "");
    const i = rel.lastIndexOf("/");
    return { key, name: rel.slice(i + 1), dir: i < 0 ? "(Wurzel)" : rel.slice(0, i), url };
  })
  .sort((a, b) => a.key.localeCompare(b.key));
const BY_KEY = new Map(ASSETS.map((a) => [a.key, a]));

// claude:2026-11-01T10:53:58+01:00 — Chef 01.11.: „3 globale Folder“ statt vieler Unterordner. Drei Sammelordner
// (Hintergründe / Rahmen / Deko) bündeln alle passenden Bestandsordner; neue Painterly-Lieferungen liegen dev-only unter
// assets/ui/werkstatt/** (kein Spiel-Glob greift dort; ins Spiel kommen nur Dateien, die styles/painterly-142.css per url() nutzt,
// claude:2026-11-01T12:25:08+01:00). Jedes Asset steht
// genau einmal: entweder in einem Sammelordner oder unter „Weitere Ordner“.
export const CATEGORIES = ["Hintergründe", "Rahmen", "Deko"] as const;
export type Category = (typeof CATEGORIES)[number];
const CAT_DIRS: Record<Category, string[]> = {
  Hintergründe: ["ui/werkstatt/hintergruende", "ui/gravewood/textures", "ui/gravewood/v3/textures", "(Wurzel)"],
  Rahmen: ["ui/werkstatt/rahmen", "ui/gravewood/v4/frames", "ui/gravewood/v3/frames", "ui/gravewood/frames"],
  Deko: ["ui/werkstatt/deko", "ui/gravewood/misc"],
};
export function categoryOf(a: Asset): Category | undefined {
  for (const c of CATEGORIES) if (CAT_DIRS[c].includes(a.dir)) return c;
  if (a.dir === "ui" && /^(emblem_.*|parchment)\.svg$/.test(a.name)) return "Deko";
  return undefined;
}
/** Reihenfolge im Sammelordner: Ordner wie in CAT_DIRS (neue Werkstatt-Motive zuerst), darin nach Name. */
export function categoryRank(a: Asset): number {
  const c = categoryOf(a);
  const i = c ? CAT_DIRS[c].indexOf(a.dir) : -1;
  return i < 0 ? 99 : i;
}

// claude:2026-11-01T10:53:58+01:00 — Gemessene Slices der Painterly-Rahmen (Codex-Lieferung 31.10., slices.json
// unverändert kopiert). „als Rahmen“ nimmt bei diesen Rahmen die gemessenen Werte statt die des alten Rahmens.
type Sides = { top: number; right: number; bottom: number; left: number };
type SliceEntry = { slice?: Sides; runtimeBorder?: Sides | { normal?: Sides }; borderImageRepeat?: string; fill?: boolean };
const FRAME_PRESETS = new Map<string, NonNullable<Ov["inh"]>>();
for (const [k, raw] of Object.entries(FRAME_SLICES as Record<string, unknown>)) {
  const e = raw as SliceEntry;
  if (!k.startsWith("frames/") || typeof e !== "object" || !e?.slice) continue;
  const rb = e.runtimeBorder && "normal" in e.runtimeBorder ? e.runtimeBorder.normal : (e.runtimeBorder as Sides | undefined);
  const s = e.slice;
  FRAME_PRESETS.set(`../assets/ui/werkstatt/rahmen/${k.slice(7)}.webp`, {
    slice: `${s.top} ${s.right} ${s.bottom} ${s.left}${e.fill ? " fill" : ""}`,
    width: rb ? `${rb.top}px ${rb.right}px ${rb.bottom}px ${rb.left}px` : `${Math.round(s.top / 12)}px`,
    outset: "0px",
    repeat: e.borderImageRepeat || "stretch",
  });
}
export function framePreset(key: string | undefined): Ov["inh"] | undefined {
  return key ? FRAME_PRESETS.get(key) : undefined;
}

export function resolveUrl(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.startsWith("custom:")) return customs.get(key.slice(7));
  return BY_KEY.get(key)?.url;
}
export function exportPath(key: string): string {
  return key.startsWith("custom:") ? key : key.replace("../", "");
}
/** url()-Argument immer gequotet (Installpfade mit Klammern, s. Memory css-url-must-be-quoted). */
const q = (s: string): string => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
/** Freitext-Werte dürfen die Regel nicht verlassen. */
export function cleanVal(v: string): string {
  return v.replace(/[;{}<>]/g, "").replace(/!important/gi, "").trim();
}

// ───────────────────────── CSS-Erzeugung ─────────────────────────

export function firstNum(s: string | undefined): number | undefined {
  const m = s?.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
}
export function pxOf(s: string | undefined): number | undefined {
  const m = s?.match(/^\s*(\d+(?:\.\d+)?)px/);
  return m ? Math.round(Number(m[1])) : undefined;
}
export function pctOf(s: string | undefined, i: 0 | 1): number | undefined {
  const m = s?.match(/^\s*(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%\s*$/);
  return m ? Number(m[i + 1]) : undefined;
}
export function inheritFrame(el: Element): Pick<Ov, "inh"> {
  const c = getComputedStyle(el);
  if (!c.borderImageSource || c.borderImageSource === "none") return {};
  return { inh: { slice: c.borderImageSlice, width: c.borderImageWidth, outset: c.borderImageOutset, repeat: c.borderImageRepeat } };
}
function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16) || 0;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

type Pair = [prop: string, value: string];

/** Deklarationen eines Override als [Eigenschaft, Wert]. live: aufgelöste URLs; export: Quellpfade, lesbar. */
export function declPairs(o: Ov, mode: "live" | "export"): Pair[] {
  const d: Pair[] = [];
  const urlOf = (k: string): string | undefined => (mode === "live" ? resolveUrl(k) : exportPath(k));
  const add = (p: string, v: string): number => d.push([p, v]);

  const layers: string[] = [];
  const bgu = o.bg ? urlOf(o.bg) : undefined;
  const tint = (o.tintAlpha ?? 0) > 0;
  if (tint) layers.push(`linear-gradient(${rgba(o.tintColor ?? "#000000", o.tintAlpha ?? 0)}, ${rgba(o.tintColor ?? "#000000", o.tintAlpha ?? 0)})`);
  if (bgu) layers.push(`url(${q(bgu)})`);
  if (layers.length) {
    const sizes: string[] = [];
    const reps: string[] = [];
    const poss: string[] = [];
    if (tint) {
      sizes.push("100% 100%");
      reps.push("no-repeat");
      poss.push("0 0");
    }
    if (bgu) {
      sizes.push(o.bgSize || "auto");
      reps.push(o.bgRepeat || "repeat");
      poss.push(o.bgPos || "0% 0%");
    }
    add("background-image", layers.join(", "));
    add("background-size", sizes.join(", "));
    add("background-repeat", reps.join(", "));
    add("background-position", poss.join(", "));
  }

  const bu = o.border ? urlOf(o.border) : undefined;
  if (bu) {
    // Reihenfolge je Eigenschaft: Regler-Wert > übernommener Wert des alten Rahmens > Standard.
    const inh = o.inh;
    const inhFill = /\bfill\b/.test(inh?.slice ?? "");
    const sl = o.slice ?? firstNum(inh?.slice) ?? 30;
    add("border-image-source", `url(${q(bu)})`);
    if (o.slice === undefined && o.fill === undefined && inh) add("border-image-slice", inh.slice);
    else add("border-image-slice", `${sl}${(o.fill ?? inhFill) ? " fill" : ""}`);
    add("border-image-width", o.bw !== undefined ? `${o.bw}px` : inh ? inh.width : `${sl}px`);
    add("border-image-outset", o.outset !== undefined ? `${o.outset}px` : inh ? inh.outset : "0px");
    add("border-image-repeat", o.brepeat || inh?.repeat || "stretch");
    add("border-style", "solid");
  }
  if (o.borderWidth !== undefined) add("border-width", `${o.borderWidth}px`);

  const f: string[] = [];
  if (o.brightness !== undefined) f.push(`brightness(${o.brightness}%)`);
  if (o.contrast !== undefined) f.push(`contrast(${o.contrast}%)`);
  if (o.saturate !== undefined) f.push(`saturate(${o.saturate}%)`);
  if (o.hue !== undefined) f.push(`hue-rotate(${o.hue}deg)`);
  if (f.length) add("filter", f.join(" "));
  if (o.opacity !== undefined) add("opacity", String(o.opacity));

  const iu = o.img ? urlOf(o.img) : undefined;
  if (iu) add("content", `url(${q(iu)})`); // ersetzt das Bild eines <img> rein per CSS (exportierbar)

  // v2: freie Eigenschaften (Box, Layout, Position, Text, Sichtbarkeit)
  for (const [k, v] of Object.entries(o.lay ?? {})) {
    const cv = cleanVal(v);
    if (/^[a-z-]+$/.test(k) && cv) add(k, cv);
  }
  if (o.hide) add("display", "none");
  return d;
}

function buildLiveCss(): string {
  const out: string[] = [];
  for (const o of ovs.values()) {
    const d = declPairs(o, "live").map(([p, v]) => `${p}: ${v} !important;`);
    // Spezifität: Spiel-Regeln wie `#root .layout--reforged .sidebar .sb-skill-btn {… !important}` hängen an einer Id.
    // :is(#id, html) zählt immer mit Id-Spezifität (höchste Alternative) und schlägt so jede Spiel-Regel mit einer Id.
    // claude:2026-11-01T11:08:37+01:00 — Chef 01.11. (Hauptmenü-Karten): „nur dieses Element“ muss „alle mit Selektor“
    // schlagen. [data-asset-lab-id] (0,1,0) verlor gegen z. B. div.hub-card (0,1,1); die nie treffende Alternative
    // #asset-lab-el#asset-lab-boost hebt Einzelelement-Regeln um zwei Ids an.
    const target = o.scope === "el" ? `:is(${o.selector}, #asset-lab-el#asset-lab-boost)` : `:is(${o.selector})`;
    if (d.length) out.push(`:is(#asset-lab-host, html) :is(#asset-lab-host, body) ${target} {\n  ${d.join("\n  ")}\n}`);
  }
  return out.join("\n");
}

export function buildExportCss(): string {
  const head = `/* Asset-Werkstatt Export. Asset-Pfade relativ zu apps/client/src/renderer/ (url() ggf. relativ zur Ziel-CSS anpassen).\n   Ohne !important; Spezifität beim Einbauen prüfen. Eigene Dateien (custom:...) sind NICHT im Spiel. */\n`;
  const blocks: string[] = [];
  for (const o of ovs.values()) {
    const d = declPairs(o, "export").map(([p, v]) => `${p}: ${v};`);
    if (!d.length) continue;
    const sel = o.scope === "el" ? (o.path ?? o.selector) : o.selector;
    const refs = [o.bg, o.border, o.img].filter((k): k is string => !!k).map((k) => `/* ${exportPath(k)} */`);
    const kind = o.ins ? `Eingefügt (${o.ins.kind === "img" ? "Bild" : "Container"})` : o.scope === "el" ? "Einzelelement" : "Alle mit Selektor";
    const note = o.note ? `\n/* Notiz: ${o.note.replace(/\*\//g, "* /").replace(/\s+/g, " ")} */` : "";
    blocks.push(`/* ${kind}: ${o.label} */${note}${refs.length ? "\n" + refs.join("\n") : ""}\n${sel} {\n  ${d.join("\n  ")}\n}`);
  }
  return blocks.length ? head + blocks.join("\n\n") + "\n" : head + "/* (keine aktiven Overrides) */\n";
}

// ───────────────────────── DOM-Helfer ─────────────────────────

const STATE_CLASS = /^(active|selected|hover|disabled|focus|is-|has-|open|locked|new|flash)/;
export function classesOf(el: Element): string[] {
  return [...el.classList].filter((c) => !c.startsWith("asset-lab"));
}
export function defaultSelector(el: Element): string {
  const cls = classesOf(el).filter((c) => !STATE_CLASS.test(c));
  return el.tagName.toLowerCase() + cls.map((c) => "." + CSS.escape(c)).join("");
}
export function describe(el: Element): string {
  const c = classesOf(el);
  return el.tagName.toLowerCase() + (c.length ? "." + c.join(".") : "");
}
/** Kürzester eindeutiger Pfad (von unten nach oben um Segmente erweitert, bis genau 1 Treffer). */
export function buildPath(el: Element): string {
  const segs: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    const insId = cur.getAttribute(INS_ATTR);
    if (insId) {
      segs.unshift(`[${INS_ATTR}="${insId}"]`);
      break;
    }
    let seg = cur.tagName.toLowerCase();
    if (cur.id && !/\d{3,}/.test(cur.id)) {
      segs.unshift("#" + CSS.escape(cur.id));
      break;
    }
    seg += classesOf(cur)
      .filter((c) => !STATE_CLASS.test(c))
      .slice(0, 3)
      .map((c) => "." + CSS.escape(c))
      .join("");
    const par: Element | null = cur.parentElement;
    if (par) {
      const same = [...par.children].filter((c) => c.tagName === cur!.tagName);
      if (same.length > 1) seg += `:nth-of-type(${same.indexOf(cur) + 1})`;
    }
    segs.unshift(seg);
    try {
      if (document.querySelectorAll(segs.join(" > ")).length === 1) break;
    } catch {
      /* weiter */
    }
    cur = par;
  }
  return segs.join(" > ");
}
export function countMatches(sel: string): number {
  try {
    return document.querySelectorAll(sel).length;
  } catch {
    return -1;
  }
}
/** Aktuelle Seite des Spiels: Seitenname der Statusleiste (versteckte h1 .hs-page-title), sonst Fenstertitel. */
export function currentPage(): string {
  const t = document.querySelector(".hs-page-title")?.textContent?.trim();
  return t || document.title || "(unbekannt)";
}
function readComputed(el: Element, prop: string): string {
  return getComputedStyle(el).getPropertyValue(prop).trim();
}
/** Ursprungswerte der klassischen (v1-)Eigenschaften, einmal beim ersten Ändern. */
const LEGACY_PROPS = [
  "background-image", "background-size", "background-position", "background-repeat",
  "border-image-source", "border-image-slice", "border-image-width", "border-image-outset", "border-image-repeat",
  "border-width", "filter", "opacity",
];
function snapshotLegacy(el: Element): Record<string, string> {
  const o: Record<string, string> = {};
  for (const p of LEGACY_PROPS) o[p] = readComputed(el, p);
  return o;
}

// ───────────────────────── Rückgängig / Wiederholen ─────────────────────────

const undoStack: string[] = [];
const redoStack: string[] = [];
let lastPush = 0;
let gesture = false;
const snap = (): string => JSON.stringify([...ovs.values()]);

/** Vor jeder Änderung aufrufen. Schnelle Folgeänderungen (Regler, Ziehen) werden zu EINEM Schritt zusammengefasst. */
function pushHistory(force = false): void {
  const now = performance.now();
  if (!gesture && !force && undoStack.length > 0 && now - lastPush < 700) {
    lastPush = now;
    return;
  }
  if (gesture && !force) return;
  undoStack.push(snap());
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
  lastPush = now;
}
export function beginGesture(): void {
  pushHistory(true);
  gesture = true;
}
export function endGesture(): void {
  gesture = false;
  lastPush = 0;
}
function restore(json: string): void {
  ovs.clear();
  try {
    for (const o of JSON.parse(json) as Ov[]) ovs.set(ovKey(o), o);
  } catch {
    /* Snapshot kaputt: ignorieren */
  }
  lastPush = 0;
  emit();
}
export function undo(): boolean {
  const s = undoStack.pop();
  if (s === undefined) return false;
  redoStack.push(snap());
  restore(s);
  return true;
}
export function redo(): boolean {
  const s = redoStack.pop();
  if (s === undefined) return false;
  undoStack.push(snap());
  restore(s);
  return true;
}
export const historyDepth = (): { undo: number; redo: number } => ({ undo: undoStack.length, redo: redoStack.length });

// ───────────────────────── Store ─────────────────────────

function styleEl(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  return el;
}

// Gebündelt (300 ms): Regler feuern je Pixel, das Speichern soll das Ziehen nicht bremsen.
let persistTimer: number | undefined;
function persist(): void {
  if (persistTimer !== undefined) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = undefined;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ v: 2, enabled: flags.enabled, overrides: [...ovs.values()] }));
      localStorage.setItem(CSS_CACHE_KEY, flags.enabled ? buildLiveCss() : ""); // claude:2026-11-01T11:59:23+01:00 — für den Frühstart (kein Stein-Flackern)
    } catch {
      /* gesperrt/voll: Werkstatt läuft ohne Speicherung weiter */
    }
    try {
      // Eigene Dateien nur, solange sie klein genug sind (localStorage ~5 MB); sonst bleiben sie flüchtig.
      const files = Object.fromEntries(customs);
      const raw = JSON.stringify(files);
      if (customs.size && raw.length < 3_000_000) localStorage.setItem(LS_FILES, raw);
      else localStorage.removeItem(LS_FILES);
    } catch {
      /* ignorieren */
    }
  }, 300);
}
function apply(): void {
  const el = styleEl();
  el.textContent = buildLiveCss();
  el.disabled = !flags.enabled;
}
// claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl: während batch() wird nur einmal am Ende angewendet/gespeichert.
let deferEmit = false;
let emitDirty = false;
let noHist = false;
export function emit(): void {
  if (deferEmit) {
    emitDirty = true;
    return;
  }
  apply();
  persist();
  syncObserver();
  listeners.forEach((l) => l());
}

/** Teilweise Änderung eines Override. el: Element für Ursprungswerte/Seite/Text (beim ersten Ändern). */
export function upsert(base: Pick<Ov, "scope" | "selector" | "path" | "labId" | "label">, patch: OvPatch, el?: Element | null): void {
  if (!noHist) pushHistory(); // claude:2026-10-31T12:30:17+01:00 (in batch() zählt nur der eine Schritt davor)
  const key = ovKey(base);
  const prior = ovs.get(key);
  const cur: Ov = prior ? { ...prior } : { ...base };
  if (!prior && el) {
    cur.page = currentPage();
    cur.txt = elText(el);
    cur.lang = document.documentElement.lang || undefined; // claude:2026-11-01T11:08:37+01:00
    cur.orig = snapshotLegacy(el);
  }
  const { lay: layPatch, ...rest } = patch;
  const next = { ...cur, ...rest } as Ov;
  const orig: Record<string, string> = { ...cur.orig };
  const lay: Record<string, string> = { ...cur.lay };
  if (layPatch) {
    for (const [k, v] of Object.entries(layPatch)) {
      if (v === undefined || v === "") {
        delete lay[k];
        delete orig[k];
      } else {
        if (el && lay[k] === undefined && orig[k] === undefined) orig[k] = readComputed(el, k);
        lay[k] = v;
      }
    }
  }
  if (el && patch.hide && orig.display === undefined && lay.display === undefined) orig.display = readComputed(el, "display");
  next.lay = Object.keys(lay).length ? lay : undefined;
  next.orig = Object.keys(orig).length ? orig : undefined;
  if (next.hide === false) next.hide = undefined;
  if (next.note === "") next.note = undefined;
  const bag = next as unknown as Record<string, unknown>;
  for (const k of Object.keys(bag)) if (bag[k] === undefined) delete bag[k];
  if (hasProps(next)) ovs.set(key, next);
  else ovs.delete(key);
  emit();
}
/** claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl: mehrere upsert()-Aufrufe = EIN Rückgängig-Schritt, ein CSS-Aufbau, ein Speichern. */
export function batch(fn: () => void): void {
  if (deferEmit) return fn();
  pushHistory();
  noHist = true;
  deferEmit = true;
  try {
    fn();
  } finally {
    noHist = false;
    deferEmit = false;
    if (emitDirty) {
      emitDirty = false;
      emit();
    }
  }
}

/** claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl: Anzeigewert für mehrere Overrides. Gleiche Werte bleiben, abweichende landen in `mixed` (und fehlen in `cur`). */
export function mergeCur(list: (Ov | undefined)[]): { cur: Partial<Ov>; mixed: string[] } {
  const cur: Record<string, unknown> = {};
  const mixed: string[] = [];
  const skip = new Set([...META_KEYS, "lay", "ins", "scope"]);
  const keys = new Set<string>();
  for (const o of list) for (const k of Object.keys(o ?? {})) if (!skip.has(k)) keys.add(k);
  const same = (vals: unknown[]): boolean => vals.every((v) => JSON.stringify(v) === JSON.stringify(vals[0]));
  for (const k of keys) {
    const vals = list.map((o) => (o as unknown as Record<string, unknown> | undefined)?.[k]);
    if (same(vals)) cur[k] = vals[0];
    else mixed.push(k);
  }
  const lay: Record<string, string> = {};
  const lkeys = new Set<string>();
  for (const o of list) for (const k of Object.keys(o?.lay ?? {})) lkeys.add(k);
  for (const k of lkeys) {
    const vals = list.map((o) => o?.lay?.[k]);
    if (same(vals)) {
      if (vals[0] !== undefined) lay[k] = vals[0];
    } else mixed.push(k);
  }
  if (Object.keys(lay).length) cur.lay = lay;
  return { cur: cur as Partial<Ov>, mixed };
}

export function removeOv(key: string): void {
  const o = ovs.get(key);
  if (!o) return;
  pushHistory(true);
  if (o.labId && !o.ins) document.querySelector(`[${ID_ATTR}="${o.labId}"]`)?.removeAttribute(ID_ATTR);
  ovs.delete(key);
  emit();
}
export function resetAll(): void {
  pushHistory(true);
  for (const o of ovs.values()) if (o.labId && !o.ins) document.querySelector(`[${ID_ATTR}="${o.labId}"]`)?.removeAttribute(ID_ATTR);
  ovs.clear();
  emit();
}

// ───────────────────────── Wiederfinden & Einfügen ─────────────────────────

let observer: MutationObserver | null = null;

/** Ziel eines eingefügten Elements finden (erster Treffer; null = Ziel nicht gefunden). */
function findTarget(ins: Ins): Element | null {
  try {
    return document.querySelector(ins.target);
  } catch {
    return null;
  }
}
export function insPresent(o: Ov): boolean {
  return !!o.ins && !!document.querySelector(`[${INS_ATTR}="${o.ins.id}"]`);
}
/** Eingefügtes Element anlegen/zurückholen. Fehlt das Ziel: nichts tun (kein Crash). */
function ensureIns(o: Ov): void {
  const ins = o.ins;
  if (!ins || !o.labId) return;
  const target = findTarget(ins);
  if (!target) return;
  let el = document.querySelector(`[${INS_ATTR}="${ins.id}"]`);
  const parent = ins.mode === "child" ? target : target.parentElement;
  if (!parent) return;
  if (!el) {
    el = document.createElement(INS_TAG);
    el.setAttribute(INS_ATTR, ins.id);
    el.setAttribute(ID_ATTR, o.labId);
  }
  if (!el.isConnected || el.parentElement !== parent) {
    if (ins.mode === "child") target.appendChild(el);
    else target.after(el);
  }
}
/** Markierung (data-asset-lab-id) nach Neustart/Remount per Pfad wieder setzen; eingefügte Elemente herstellen; Verwaiste entfernen. */
function retag(): void {
  const insIds = new Set<string>();
  for (const o of ovs.values()) if (o.ins) insIds.add(o.ins.id);
  document.querySelectorAll(`[${INS_ATTR}]`).forEach((e) => {
    if (!insIds.has(e.getAttribute(INS_ATTR) ?? "")) e.remove();
  });
  const elOvs = [...ovs.values()].filter((x) => x.scope === "el" && !x.ins); // claude:2026-11-01T12:02:51+01:00 — Veto-Liste für die Textprüfung
  // Ziele zuerst (Eltern vor Kindern: Ovs liegen in Einfüge-Reihenfolge), dann Pfad-Markierungen.
  for (const o of ovs.values()) {
    if (o.ins) {
      ensureIns(o);
      continue;
    }
    if (o.scope !== "el" || !o.labId || !o.path) continue;
    if (document.querySelector(`[${ID_ATTR}="${o.labId}"]`)) continue;
    try {
      const hits = document.querySelectorAll(o.path);
      const hit = hits.length === 1 ? hits[0] : undefined;
      if (hit && !hit.hasAttribute(ID_ATTR) && sameElement(o, hit, elOvs)) hit.setAttribute(ID_ATTR, o.labId);
    } catch {
      /* ungültiger Pfad */
    }
  }
}

// claude:2026-11-01T11:08:37+01:00 — Chef 01.11.: Pfade mit :nth-of-type hängen an der Position. Wechselt das Layout
// (Hauptmenü-Karten erscheinen/verschwinden, Popups an derselben Stelle), traf der Pfad ein ANDERES Element: das bekam die
// fremde Gestaltung samt Id, und neue Änderungen landeten im alten Override. Positionspfade werden deshalb nur noch
// angeheftet, wenn der Textanfang zum gespeicherten passt (in derselben Sprache; Zahlen zählen nicht). Ein Element, das
// schon eine Id trägt, wird nie umgehängt.
function sameElement(o: Ov, el: Element, others: readonly Ov[]): boolean {
  const ok = matchesStoredText(o, el, others);
  const lang = document.documentElement.lang || undefined;
  if (ok && o.path?.includes(":nth-of-type(") && o.txt && !o.lang && lang) o.lang = lang; // alte Overrides lernen ihre Sprache beim ersten Treffer
  return ok;
}
function syncObserver(): void {
  const need = [...ovs.values()].some((o) => o.scope === "el");
  if (need && !observer) {
    // claude:2026-11-01T12:02:51+01:00 — Chef 01.11.: beim Seitenwechsel zeigten neue Elemente 400 ms lang das Spiel-CSS (Stein statt Holz,
    // sichtbar während der Einblend-Animation). Jetzt sofort im Beobachter-Rückruf (läuft vor dem nächsten Bild), aber nur,
    // wenn wirklich Elemente dazukamen; reine Text-Updates des Ticks lösen nichts aus.
    observer = new MutationObserver((muts) => {
      if (muts.some((m) => Array.from(m.addedNodes).some((n) => n.nodeType === 1))) retag();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else if (!need && observer) {
    observer.disconnect();
    observer = null;
  }
  retag();
}

// claude:2026-10-31T12:30:17+01:00 — Zähler, damit viele Ids im selben Millisekunden-Takt (Mehrfachauswahl) eindeutig bleiben.
let idSeq = 0;
export const newId = (): string => "a" + Date.now().toString(36) + (idSeq++).toString(36) + Math.floor(Math.random() * 1296).toString(36);

export interface InsertOpts {
  kind: "img" | "box";
  mode: "child" | "after";
  target: Element;
  /** Bild: Asset-Schlüssel (auch custom:…). */
  asset?: string;
  w?: number;
  h?: number;
}
/** Eingefügtes Element als Override anlegen. Gibt die Id zurück (Element via [data-asset-lab-ins=id]). */
export function insertElement(opts: InsertOpts): string {
  const { kind, mode, target } = opts;
  beginGesture();
  try {
    const id = newId();
    // Absolut positionierte Kinder brauchen ein positioniertes Ziel: ggf. position:relative am Ziel setzen (als normales Override, damit es im Bauauftrag steht).
    if (mode === "child" && kind === "img" && getComputedStyle(target).position === "static") {
      const tid = target.getAttribute(ID_ATTR) ?? newId();
      target.setAttribute(ID_ATTR, tid);
      upsert({ scope: "el", selector: `[${ID_ATTR}="${tid}"]`, path: buildPath(target), labId: tid, label: describe(target) }, { lay: { position: "relative" } }, target);
    }
    const name = opts.asset ? exportPath(opts.asset).split("/").pop() ?? "Bild" : "Container";
    const lay: Record<string, string> =
      kind === "img"
        ? { position: "absolute", left: "0px", top: "0px", width: `${opts.w ?? 128}px`, height: `${opts.h ?? 128}px`, display: "block", "z-index": "5", "pointer-events": "none" }
        : { display: "block", width: "120px", height: "80px", "background-color": "rgba(25, 211, 218, 0.25)" };
    const patch: OvPatch = {
      lay,
      ins: { id, kind, mode, target: buildPath(target), targetLabel: describe(target) },
      page: currentPage(),
      txt: kind === "img" ? name : "",
      ...(kind === "img" ? { bg: opts.asset, bgSize: "contain", bgRepeat: "no-repeat", bgPos: "center" } : {}),
    };
    upsert({ scope: "el", selector: `[${ID_ATTR}="${id}"]`, path: `[${INS_ATTR}="${id}"]`, labId: id, label: `Eingefügt: ${kind === "img" ? "Bild " + name : "Container"}` }, patch, null);
    return id;
  } finally {
    endGesture();
  }
}
/** Eingefügtes Element kopieren (leicht versetzt). */
export function duplicateIns(src: Ov): string | null {
  if (!src.ins) return null;
  const id = newId();
  pushHistory(true);
  const copy: Ov = JSON.parse(JSON.stringify(src)) as Ov;
  copy.labId = id;
  copy.selector = `[${ID_ATTR}="${id}"]`;
  copy.path = `[${INS_ATTR}="${id}"]`;
  copy.ins = { ...src.ins, id };
  const nudge = (k: string): void => {
    const v = parseFloat(copy.lay?.[k] ?? "");
    if (copy.lay && Number.isFinite(v)) copy.lay[k] = `${v + 16}px`;
  };
  nudge("left");
  nudge("top");
  ovs.set(ovKey(copy), copy);
  emit();
  return id;
}
/** Die Einstellungen eines Override auf ein anderes Element kopieren (neues Einzelelement-Override). */
export function cloneOntoElement(src: Ov, el: Element): void {
  pushHistory(true);
  const id = newId();
  el.setAttribute(ID_ATTR, id);
  const { scope: _s, selector: _se, path: _p, labId: _l, label: _la, page: _pg, txt: _t, lang: _lg, orig: _o, ins: _i, ...props } = src;
  const copy = JSON.parse(JSON.stringify(props)) as OvProps;
  const orig = snapshotLegacy(el);
  for (const k of Object.keys(copy.lay ?? {})) orig[k] = readComputed(el, k);
  if (copy.hide) orig.display = readComputed(el, "display");
  ovs.set(`el:${id}`, { scope: "el", selector: `[${ID_ATTR}="${id}"]`, path: buildPath(el), labId: id, label: describe(el), page: currentPage(), txt: elText(el), lang: document.documentElement.lang || undefined, orig, ...copy }); // claude:2026-11-01T11:08:37+01:00 lang
  emit();
}

// ───────────────────────── Laden / Migration ─────────────────────────

function strMap(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === "string") out[k] = x;
  return Object.keys(out).length ? out : undefined;
}
/** v1 und v2 -> aktuelles Modell. v1-Einträge haben keine der neuen Felder und laufen unverändert weiter. */
function sanitizeOv(raw: unknown): Ov | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Ov;
  if (typeof o.selector !== "string" || !o.selector) return null;
  if (o.scope !== "el" && o.scope !== "sel") return null;
  const out: Ov = { ...o, label: typeof o.label === "string" ? o.label : o.selector };
  const lay = strMap(o.lay);
  const orig = strMap(o.orig);
  if (lay) out.lay = lay;
  else delete out.lay;
  if (orig) out.orig = orig;
  else delete out.orig;
  if (typeof o.note !== "string") delete out.note;
  if (o.hide !== true) delete out.hide;
  const i = o.ins;
  if (i && typeof i === "object" && typeof i.id === "string" && typeof i.target === "string" && (i.kind === "img" || i.kind === "box") && (i.mode === "child" || i.mode === "after")) {
    out.ins = { id: i.id, kind: i.kind, mode: i.mode, target: i.target, targetLabel: typeof i.targetLabel === "string" ? i.targetLabel : i.target };
  } else delete out.ins;
  return out;
}
export function loadStored(): void {
  if (ovs.size !== 0) return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const j = JSON.parse(raw) as { v?: number; enabled?: boolean; overrides?: unknown[] };
      flags.enabled = j.enabled !== false;
      for (const r of j.overrides ?? []) {
        const o = sanitizeOv(r);
        if (o) ovs.set(ovKey(o), o);
      }
    }
  } catch {
    /* kaputter Speicher: ignorieren */
  }
  try {
    const f = localStorage.getItem(LS_FILES);
    if (f) for (const [k, v] of Object.entries(JSON.parse(f) as Record<string, unknown>)) if (typeof v === "string" && v.startsWith("data:image/")) customs.set(k, v);
  } catch {
    /* ignorieren */
  }
}
export function bootCore(): void {
  loadStored();
  emit();
}

// ───────────────────────── Export: Bauauftrag (Markdown) ─────────────────────────

const short = (s: string, n = 140): string => (s.length > n ? s.slice(0, n - 1) + "…" : s);
/** Dev-Server-/Hash-URLs in computed-Werten auf den Dateinamen kürzen (lesbar). */
function lessUrl(v: string): string {
  return v.replace(/url\(["']?[^)"']*\/([^/)"']+?)["']?\)/g, (_m, f: string) => `url(…/${f})`);
}
export function buildBrief(): string {
  const list = [...ovs.values()];
  const L: string[] = [];
  L.push("# Bauauftrag aus der Asset-Werkstatt", "");
  L.push(`Erstellt: ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${list.length} Override(s)`);
  L.push("Hinweise zur Umsetzung:");
  L.push("- Reine Darstellung, nie Spielzustand. Asset-Pfade sind relativ zu `apps/client/src/renderer/`.");
  L.push("- Werte in der Spalte „neu“ stehen ohne `!important`; die Werkstatt erzwingt sie live mit erhöhter Spezifität. Beim Einbau die Spezifität gegen die Spiel-CSS prüfen.");
  L.push("- „alt“ = berechneter Wert (getComputedStyle) beim ersten Ändern, also der damalige Ist-Zustand.");
  L.push("- Schriftgrößen im Spiel laufen über `--text-scale`; `calc(Npx * var(--text-scale))` beibehalten.");
  L.push("- Eingefügte Elemente tragen in der Werkstatt den Tag `<al-ins>`; im Code als normales `div` umsetzen.", "");
  const order = list.map((o, i) => ({ o, i })).sort((a, b) => (a.o.page ?? "").localeCompare(b.o.page ?? "") || a.i - b.i);
  let n = 0;
  let lastPage: string | undefined;
  for (const { o } of order) {
    const page = o.page ?? "(unbekannt)";
    if (page !== lastPage) {
      L.push(`# Seite: ${page}`, "");
      lastPage = page;
    }
    n++;
    const pairs = declPairs(o, "export");
    L.push(`## ${n}. ${o.label}`);
    if (o.ins) {
      L.push(`- **Neu einzufügen:** ${o.ins.kind === "img" ? "Bild (Hintergrundbild eines leeren Elements)" : "leerer Container"}, ${o.ins.mode === "child" ? "als letztes Kind von" : "direkt hinter"} \`${o.ins.targetLabel}\``);
      L.push(`- Ziel-Pfad: \`${o.ins.target}\`${document.querySelector(`[${INS_ATTR}="${o.ins.id}"]`) ? "" : " (derzeit nicht gefunden, Ziel auf dieser Seite?)"}`);
    } else if (o.scope === "el") {
      L.push("- Gilt für: ein einzelnes Element");
      L.push(`- Pfad: \`${o.path ?? o.selector}\``);
    } else {
      const c = countMatches(o.selector);
      L.push(`- Gilt für: alle Elemente mit Selektor${c >= 0 ? ` (aktuell ${c} Treffer auf dieser Seite)` : ""}`);
      L.push(`- Selektor: \`${o.selector}\``);
    }
    if (o.txt) L.push(`- Erkennung (Text/Bild): „${o.txt}“`);
    if (o.note) L.push(`- **Notiz:** ${o.note.replace(/\n+/g, " ")}`);
    const assets = [o.bg, o.border, o.img].filter((k): k is string => !!k).map((k) => `\`${exportPath(k)}\``);
    if (assets.length) L.push(`- Assets: ${[...new Set(assets)].join(", ")}`);
    if (pairs.length) {
      L.push("- Änderungen:");
      for (const [p, v] of pairs) {
        const before = o.orig?.[p];
        const nv = p === "display" && o.hide ? "none (ausgeblendet)" : v;
        L.push(`  - \`${p}\`: ${before !== undefined && !o.ins ? `\`${short(lessUrl(before))}\` → ` : ""}\`${short(nv, 200)}\``);
      }
    } else L.push("- Änderungen: (keine Stil-Eigenschaften)");
    L.push("");
  }
  if (!list.length) L.push("(keine aktiven Overrides)");
  return L.join("\n") + "\n";
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* Fallback unten */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* Textfeld im Panel bleibt zum manuellen Kopieren */
  }
  ta.remove();
}
export function saveFile(name: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const saveJson = (): void => saveFile("asset-werkstatt.json", JSON.stringify({ v: 2, overrides: [...ovs.values()] }, null, 2), "application/json");
