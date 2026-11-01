/**
 * ASSET-WERKSTATT, Bedienelemente: Regler (Range) und der Bereich „Layout“ (Box-Modell, Layout, Kind-Eigenschaften,
 * Position, Text, Sichtbarkeit). NUR Deutsch, bewusst ohne i18n (Dev-Werkzeug). Schreibt ausschließlich über `set({ lay: … })`
 * in das Override des gewählten Elements (gleiche Mechanik und gleicher Geltungsbereich wie alle anderen Regler).
 *
 * claude:2026-10-31T10:41:00+01:00
 */
import { useState } from "react";
import type { Ov, OvPatch } from "./assetLabCore";

interface RangeProps {
  label: string;
  value: number | undefined;
  def: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl: Werte der gewählten Elemente weichen ab (Zahlenfeld leer, „gem.“). */
  mixed?: boolean;
  onChange: (v: number | undefined) => void;
}
export function Range({ label, value, def, min, max, step = 1, unit = "", mixed = false, onChange }: RangeProps): JSX.Element {
  const v = value ?? def;
  return (
    <div className="row">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} />
      <input type="number" step={step} value={mixed ? "" : Number.isFinite(v) ? v : 0} placeholder={mixed ? "gem." : ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
      <span className="dim">{unit}</span>
      <button title="Zurücksetzen" onClick={() => onChange(undefined)}>x</button>
    </div>
  );
}

type SetFn = (patch: OvPatch) => void;
interface Ctx {
  lay: Record<string, string>;
  cs: CSSStyleDeclaration | null;
  set: SetFn;
}
const setP = (c: Ctx, prop: string, v: string | undefined): void => c.set({ lay: { [prop]: v } });
const eff = (c: Ctx, prop: string): string => c.lay[prop] ?? c.cs?.getPropertyValue(prop).trim() ?? "";

const LENGTH_UNITS = ["px", "%", "vw", "vh", "em", "rem"];
const MAXOF: Record<string, number> = { px: 1200, "%": 200, vw: 200, vh: 200, em: 40, rem: 40 };

function parseDim(s: string): { n: number; unit: string } | null {
  const m = /^(-?\d*\.?\d+)([a-z%]*)$/.exec(s.trim());
  return m ? { n: Number(m[1]), unit: m[2] ?? "" } : null;
}

interface DimProps {
  c: Ctx;
  label: string;
  prop: string;
  min?: number;
  max?: number;
  /** Stichwörter statt Zahl (auto, none, normal). */
  kw?: string[];
  units?: string[];
  /** Schreibt statt der einen Eigenschaft (z. B. alle vier Seiten bei „alle gleich“). */
  write?: (v: string | undefined) => void;
}
/** Zahl + Einheit (+ Stichwort): Regler, Zahlenfeld, Einheiten-Auswahl, Zurücksetzen. */
function Dim({ c, label, prop, min = 0, max, kw = [], units = LENGTH_UNITS, write }: DimProps): JSX.Element {
  const raw = c.lay[prop];
  const shown = raw ?? eff(c, prop);
  const p = parseDim(shown);
  const unit = p ? p.unit : (kw.find((k) => k === shown.trim()) ?? kw[0] ?? "px");
  const isKw = !p;
  const num = p?.n ?? 0;
  const out = (v: string | undefined): void => (write ? write(v) : setP(c, prop, v));
  const hi = max ?? MAXOF[unit] ?? 1200;
  const step = unit === "em" || unit === "rem" || unit === "" ? 0.05 : 1;
  const commit = (n: number, u: string): void => out(`${n}${u}`);
  return (
    <div className="row">
      <label title={prop}>{label}</label>
      <input type="range" min={min} max={hi} step={step} value={Math.min(Math.max(num, min), hi)} disabled={isKw} onChange={(e) => commit(Number(e.target.value), unit)} />
      <input type="number" step={step} value={isKw ? "" : Math.round(num * 100) / 100} placeholder={isKw ? unit : ""} onChange={(e) => (e.target.value === "" ? out(undefined) : commit(Number(e.target.value), unit))} />
      <select className="unit" value={unit} onChange={(e) => (kw.includes(e.target.value) ? out(e.target.value) : commit(isKw ? 0 : num, e.target.value))}>
        {units.map((u) => <option key={u} value={u}>{u || "×"}</option>)}
        {kw.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <button title="Zurücksetzen" onClick={() => out(undefined)}>x</button>
    </div>
  );
}

function Sel({ c, label, prop, opts }: { c: Ctx; label: string; prop: string; opts: string[] }): JSX.Element {
  return (
    <div className="row">
      <label title={prop}>{label}</label>
      <select value={c.lay[prop] ?? ""} onChange={(e) => setP(c, prop, e.target.value || undefined)}>
        <option value="">{`(Stand: ${eff(c, prop) || "-"})`}</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Txt({ c, label, prop, ph }: { c: Ctx; label: string; prop: string; ph?: string }): JSX.Element {
  return (
    <div className="row">
      <label title={prop}>{label}</label>
      <input type="text" value={c.lay[prop] ?? ""} placeholder={ph ?? eff(c, prop)} spellCheck={false} onChange={(e) => setP(c, prop, e.target.value || undefined)} />
      <button title="Zurücksetzen" onClick={() => setP(c, prop, undefined)}>x</button>
    </div>
  );
}
function rgbToHex(s: string): string {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s);
  if (!m) return "#000000";
  return "#" + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("");
}
function Col({ c, label, prop }: { c: Ctx; label: string; prop: string }): JSX.Element {
  return (
    <div className="row">
      <label title={prop}>{label}</label>
      <input type="color" value={c.lay[prop]?.startsWith("#") ? c.lay[prop] : rgbToHex(eff(c, prop))} onChange={(e) => setP(c, prop, e.target.value)} />
      <span className="dim">{c.lay[prop] ?? "(Stand)"}</span>
      <button title="Zurücksetzen" onClick={() => setP(c, prop, undefined)}>x</button>
    </div>
  );
}

const SIDES = ["top", "right", "bottom", "left"] as const;
function Sides({ c, kind, min }: { c: Ctx; kind: "padding" | "margin"; min: number }): JSX.Element {
  const [linked, setLinked] = useState(false);
  const writeAll = (v: string | undefined): void => c.set({ lay: Object.fromEntries(SIDES.map((s) => [`${kind}-${s}`, v])) });
  return (
    <>
      <div className="row">
        <label>{kind === "padding" ? "padding" : "margin"}</label>
        <label className="chk"><input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} /> alle gleich</label>
      </div>
      {SIDES.map((s) => (
        <Dim key={s} c={c} label={`  ${s}`} prop={`${kind}-${s}`} min={min} max={400} units={["px", "%", "em", "rem"]} write={linked ? writeAll : undefined} />
      ))}
    </>
  );
}

function FontSize({ c }: { c: Ctx }): JSX.Element {
  const raw = c.lay["font-size"];
  const m = raw ? /^calc\(\s*(-?[\d.]+)px\s*\*\s*var\(--text-scale\)\s*\)$/.exec(raw) : null;
  const ts = raw ? !!m : true; // ungesetzt: Voreinstellung = mit --text-scale (so ist die Spiel-Schrift gebaut)
  const px = m ? Number(m[1]) : (parseDim(raw ?? "")?.n ?? (parseFloat(eff(c, "font-size")) || 14));
  const write = (n: number, withScale: boolean): void => setP(c, "font-size", withScale ? `calc(${n}px * var(--text-scale))` : `${n}px`);
  return (
    <>
      <Range label="font-size" value={Math.round(px * 10) / 10} def={14} min={6} max={96} unit="px" onChange={(v) => (v === undefined ? setP(c, "font-size", undefined) : write(v, ts))} />
      <div className="row">
        <label />
        <label className="chk"><input type="checkbox" checked={ts} onChange={(e) => write(px, e.target.checked)} /> mit --text-scale</label>
      </div>
      <div className="hint">Die Spiel-Schrift skaliert über --text-scale (Option „Textgröße“). Feste px umgehen das; für den Einbau besser mit Haken.</div>
    </>
  );
}

function parseTranslate(s: string | undefined): [number, number] {
  const m = (s ?? "").match(/-?\d+(?:\.\d+)?/g);
  return [Number(m?.[0] ?? 0), Number(m?.[1] ?? 0)];
}

/** Bereich „Layout“. cur = aktuelles Override (oder leer), cs = berechneter Stil des gewählten Elements. */
export function LayoutSection({ cur, cs, set }: { cur: Partial<Ov>; cs: CSSStyleDeclaration | null; set: SetFn }): JSX.Element {
  const c: Ctx = { lay: cur.lay ?? {}, cs, set };
  const disp = eff(c, "display");
  const isFlex = /flex/.test(disp);
  const isGrid = /grid/.test(disp);
  const [tx, ty] = parseTranslate(c.lay.translate);
  const scaleParts = (c.lay.scale ?? "").split(/\s+/).filter(Boolean).map(Number);
  const scl = Math.abs(scaleParts[scaleParts.length - 1] ?? 1) || 1;
  const flip = (scaleParts[0] ?? 1) < 0;
  const setTr = (x: number, y: number): void => setP(c, "translate", x === 0 && y === 0 ? undefined : `${x}px ${y}px`);
  const setScale = (s: number | undefined, f: boolean): void => setP(c, "scale", s === undefined || (s === 1 && !f) ? undefined : f ? `-${s} ${s}` : `${s}`);
  const [cols, setCols] = useState(3);

  // claude:2026-11-01T11:46:53+01:00 — Chef 01.11. (Titelbild-Porträt nach Ziehen kaputt): ein Klick nimmt nur Größe und
  // Position zurück (Ziehgriffe, Box-Maße, Verschieben, Skalieren). Rahmen, Hintergrund und alles andere bleibt.
  const SIZE_POS = ["width", "height", "min-width", "max-width", "min-height", "max-height", "translate", "scale", "left", "top", "right", "bottom"];
  const hasSizePos = SIZE_POS.some((p) => c.lay[p] !== undefined);
  const resetSizePos = (): void => set({ lay: Object.fromEntries(SIZE_POS.map((p) => [p, undefined])) as Record<string, string | undefined> });

  return (
    <>
      <div className="row">
        <button disabled={!hasSizePos} onClick={resetSizePos} title="Setzt nur Breite, Höhe, Verschieben, Skalieren und Position zurück. Rahmen und Hintergrund bleiben.">Größe &amp; Position zurücksetzen</button>
      </div>
      <div className="sub">Box-Modell</div>
      <Dim c={c} label="width" prop="width" kw={["auto"]} />
      <Dim c={c} label="height" prop="height" kw={["auto"]} />
      <Dim c={c} label="min-width" prop="min-width" kw={["auto"]} />
      <Dim c={c} label="max-width" prop="max-width" kw={["none"]} />
      <Dim c={c} label="min-height" prop="min-height" kw={["auto"]} />
      <Dim c={c} label="max-height" prop="max-height" kw={["none"]} />
      <Sides c={c} kind="padding" min={0} />
      <Sides c={c} kind="margin" min={-200} />
      <Dim c={c} label="radius" prop="border-radius" max={200} units={["px", "%"]} />
      <Sel c={c} label="box-sizing" prop="box-sizing" opts={["border-box", "content-box"]} />
      <Col c={c} label="Hintergrund" prop="background-color" />

      <div className="sub">Layout</div>
      <Sel c={c} label="display" prop="display" opts={["block", "flex", "grid", "inline-flex", "inline-block", "none"]} />
      {isFlex && (
        <>
          <Sel c={c} label="direction" prop="flex-direction" opts={["row", "column", "row-reverse", "column-reverse"]} />
          <Sel c={c} label="wrap" prop="flex-wrap" opts={["nowrap", "wrap", "wrap-reverse"]} />
          <Sel c={c} label="justify" prop="justify-content" opts={["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]} />
          <Sel c={c} label="align-items" prop="align-items" opts={["stretch", "flex-start", "center", "flex-end", "baseline"]} />
          <Dim c={c} label="gap" prop="gap" max={200} units={["px", "em", "rem"]} kw={["normal"]} />
        </>
      )}
      {isGrid && (
        <>
          <Txt c={c} label="columns" prop="grid-template-columns" ph="z. B. 1fr 2fr / repeat(3, 1fr)" />
          <div className="row">
            <label />
            <input type="number" min={1} max={12} value={cols} onChange={(e) => setCols(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
            <button onClick={() => setP(c, "grid-template-columns", `repeat(${cols}, 1fr)`)}>{cols} gleiche Spalten</button>
          </div>
          <Txt c={c} label="rows" prop="grid-template-rows" ph="z. B. auto 1fr" />
          <Dim c={c} label="gap" prop="gap" max={200} units={["px", "em", "rem"]} kw={["normal"]} />
          <Sel c={c} label="justify-items" prop="justify-items" opts={["stretch", "start", "center", "end"]} />
          <Sel c={c} label="align-items" prop="align-items" opts={["stretch", "start", "center", "end"]} />
        </>
      )}

      <div className="sub">Als Kind (in seinem Eltern)</div>
      <Range label="flex-grow" value={c.lay["flex-grow"] === undefined ? undefined : Number(c.lay["flex-grow"])} def={Number(eff(c, "flex-grow")) || 0} min={0} max={10} onChange={(v) => setP(c, "flex-grow", v === undefined ? undefined : String(v))} />
      <Range label="flex-shrink" value={c.lay["flex-shrink"] === undefined ? undefined : Number(c.lay["flex-shrink"])} def={Number(eff(c, "flex-shrink")) || 0} min={0} max={10} onChange={(v) => setP(c, "flex-shrink", v === undefined ? undefined : String(v))} />
      <Dim c={c} label="flex-basis" prop="flex-basis" kw={["auto", "content"]} />
      <Sel c={c} label="align-self" prop="align-self" opts={["auto", "stretch", "flex-start", "center", "flex-end", "baseline"]} />
      <Range label="order" value={c.lay.order === undefined ? undefined : Number(c.lay.order)} def={Number(eff(c, "order")) || 0} min={-10} max={10} onChange={(v) => setP(c, "order", v === undefined ? undefined : String(v))} />
      <Txt c={c} label="grid-column" prop="grid-column" ph="span 2 / 1 / -1" />
      <Txt c={c} label="grid-row" prop="grid-row" ph="span 2" />
      <div className="row">
        <label />
        {[2, 3, 4].map((n) => <button key={n} title="grid-column: span n" onClick={() => setP(c, "grid-column", `span ${n}`)}>Sp. {n}</button>)}
        {[2, 3].map((n) => <button key={"r" + n} title="grid-row: span n" onClick={() => setP(c, "grid-row", `span ${n}`)}>Zl. {n}</button>)}
      </div>

      <div className="sub">Position</div>
      <Sel c={c} label="position" prop="position" opts={["static", "relative", "absolute"]} />
      {(["top", "right", "bottom", "left"] as const).map((s) => <Dim key={s} c={c} label={s} prop={s} min={-800} kw={["auto"]} />)}
      <Range label="z-index" value={c.lay["z-index"] === undefined ? undefined : Number(c.lay["z-index"])} def={Number(eff(c, "z-index")) || 0} min={-10} max={100} onChange={(v) => setP(c, "z-index", v === undefined ? undefined : String(v))} />
      <Range label="verschieben X" value={c.lay.translate ? tx : undefined} def={0} min={-600} max={600} unit="px" onChange={(v) => setTr(v ?? 0, ty)} />
      <Range label="verschieben Y" value={c.lay.translate ? ty : undefined} def={0} min={-600} max={600} unit="px" onChange={(v) => setTr(tx, v ?? 0)} />
      <Range label="scale" value={c.lay.scale ? scl : undefined} def={1} min={0.1} max={3} step={0.01} onChange={(v) => setScale(v, flip)} />
      <div className="row"><label>spiegeln</label><input type="checkbox" checked={flip} onChange={(e) => setScale(scl, e.target.checked)} /> <span className="dim">waagerecht</span></div>
      <Range label="rotate" value={c.lay.rotate ? parseFloat(c.lay.rotate) : undefined} def={0} min={-180} max={180} unit="deg" onChange={(v) => setP(c, "rotate", v === undefined || v === 0 ? undefined : `${v}deg`)} />

      <div className="sub">Text</div>
      <FontSize c={c} />
      <Sel c={c} label="font-weight" prop="font-weight" opts={["300", "400", "500", "600", "700", "800", "900"]} />
      <Dim c={c} label="line-height" prop="line-height" max={8} units={["", "px", "em"]} kw={["normal"]} />
      <Dim c={c} label="letter-spacing" prop="letter-spacing" min={-5} max={30} units={["px", "em"]} kw={["normal"]} />
      <Sel c={c} label="text-align" prop="text-align" opts={["left", "center", "right", "justify"]} />
      <Col c={c} label="Textfarbe" prop="color" />
      <Sel c={c} label="text-transform" prop="text-transform" opts={["none", "uppercase", "lowercase", "capitalize"]} />

      <div className="sub">Sichtbarkeit</div>
      <div className="row"><label>ausblenden</label><input type="checkbox" checked={!!cur.hide} onChange={(e) => set({ hide: e.target.checked ? true : undefined })} /> <span className="dim">display: none (A/B oben schaltet zurück)</span></div>
      <Range label="opacity" value={cur.opacity} def={Number(cs?.opacity ?? 1)} min={0} max={1} step={0.01} onChange={(v) => set({ opacity: v })} />
      <Sel c={c} label="overflow" prop="overflow" opts={["visible", "hidden", "auto", "scroll", "clip"]} />
      <div className="row"><label>Klicks durch</label><input type="checkbox" checked={c.lay["pointer-events"] === "none"} onChange={(e) => setP(c, "pointer-events", e.target.checked ? "none" : undefined)} /> <span className="dim">pointer-events: none</span></div>
    </>
  );
}
