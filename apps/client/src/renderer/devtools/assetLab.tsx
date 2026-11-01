/**
 * ASSET-WERKSTATT (Dev-Overlay) — Chef-Auftrag 30.10.2026 „Fläche/Element/Rahmen anklicken und live das
 * Asset wechseln, um Texturen etc. zu probieren“; erweitert am 31.10.2026 um Layout (Box, Layout, Position, Text,
 * Sichtbarkeit), Ziehen am Element, Einfügen von Bild/Container, Notiz, Bauauftrag-Export, Rückgängig/Wiederholen.
 *
 * NUR DEUTSCH, bewusst OHNE i18n: reines Entwickler-Werkzeug für den Chef, kein Spielerfeature.
 *
 * Aufbau
 *  - Wird von assetLabHotkey.ts (Strg+Umschalt+Alt+A) erst beim ersten Öffnen per import() geladen.
 *  - Datenmodell, Speicher, CSS-Erzeugung, Export: assetLabCore.ts. Regler/Layout-Bereich: assetLabLayout.tsx. Hier: Panel.
 *  - Panel + Umrandungen leben in einem eigenen Shadow-DOM (Spiel-CSS wirkt nicht hinein, Overrides nicht heraus)
 *    und in einer EIGENEN React-Wurzel — kein GameContext, kein GameState, keine Engine, kein Save-Kontakt.
 *  - Overrides = ein `<style id="asset-lab-overrides">` mit !important-Regeln. „Nur dieses Element“ nutzt das
 *    Attribut data-asset-lab-id, „alle mit Selektor“ den frei editierbaren Selektor.
 *  - Persistenz: localStorage `hearthforge:assetLab` (Format v2, v1 wird unverändert geladen).
 *  - Esc beendet den Auswahlmodus: ein Capture-Listener vor dem App-Handler schluckt das Esc (stopImmediatePropagation),
 *    damit escStack/App kein darunterliegendes Overlay mitschließt.
 *  - Bekannte Grenzen: Pseudo-Elemente (::before/::after) sind nicht anklickbar; Pfade können bei Layoutwechsel ins Leere laufen.
 *
 * claude:2026-10-31T10:41:00+01:00
 * claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl (Strg+Klick, „Weitere/Gleichartige hinzufügen“): Regler wirken auf alle, je Element ein Override.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import css from "./assetLab.css?inline";
import {
  ASSETS, CATEGORIES, HEAVY, ID_ATTR, INS_ATTR, batch, bootCore, categoryOf, categoryRank, framePreset, mergeCur, newId, beginGesture, buildBrief, buildExportCss, buildPath, classesOf, cloneOntoElement, copyText, countMatches,
  customs, defaultSelector, describe, elText, duplicateIns, emit, endGesture, exportPath, firstNum, flags, historyDepth, inheritFrame, insPresent, insertElement,
  listeners, ovKey, ovs, pctOf, pxOf, redo, removeOv, resetAll, resolveUrl, saveFile, saveJson, undo, upsert,
} from "./assetLabCore";
import type { Asset, Category, Ov, OvMeta, OvPatch } from "./assetLabCore";
import { LayoutSection, Range } from "./assetLabLayout";

const SIZES = ["", "cover", "contain", "auto", "100% 100%", "100% auto", "auto 100%", "64px", "128px", "256px", "304px 304px"];
const POSITIONS = ["", "0% 0%", "center", "top", "bottom", "left", "right", "center bottom", "107px 125px"];

// claude:2026-11-01T10:53:58+01:00 — showDir: Sammelordner zeigen die Herkunft im Tooltip und markieren neue Werkstatt-Motive.
function Group({ title, items, open, onToggle, picked, onPick, cap, showDir }: { title: string; items: Asset[]; open: boolean; onToggle: () => void; picked?: string; onPick: (a: Asset) => void; cap: number; showDir?: boolean }): JSX.Element {
  const [more, setMore] = useState(false);
  const shown = open ? (more ? items : items.slice(0, cap)) : [];
  return (
    <details className={"group" + (showDir ? " cat" : "")} open={open} onToggle={(e) => (e.currentTarget.open !== open ? onToggle() : undefined)}>
      <summary>
        {title} <small>({items.length})</small>
      </summary>
      {open && (
        <>
          <div className="grid">
            {shown.map((a) => (
              <button key={a.key} className={"thumb" + (picked === a.key ? " picked" : "")} title={showDir ? `${a.name}\n${a.dir}` : a.name} onClick={() => onPick(a)}>
                <img loading="lazy" decoding="async" src={a.url} alt={a.name} />
                {showDir && a.dir.startsWith("ui/werkstatt/") && <span className="new">neu</span>}
              </button>
            ))}
          </div>
          {!more && items.length > cap && <button onClick={() => setMore(true)}>alle {items.length} zeigen</button>}
        </>
      )}
    </details>
  );
}

// ───────────────────────── Panel ─────────────────────────

let hostEl: HTMLElement | null = null;
let hoverBox: HTMLElement | null = null;
let selBox: HTMLElement | null = null;
let panelVisible = true;
let setVisibleExternal: ((v: boolean) => void) | null = null;

function placeBox(box: HTMLElement | null, el: Element | null, text?: string): void {
  if (!box) return;
  if (!el || !el.isConnected) {
    box.style.display = "none";
    return;
  }
  const r = el.getBoundingClientRect();
  Object.assign(box.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  const i = box.firstElementChild as HTMLElement | null;
  if (i) {
    i.textContent = text ?? describe(el);
    i.style.top = r.top < 24 ? "auto" : "-20px";
    if (r.top < 24) i.style.bottom = "-20px";
  }
}

// claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl: Zusatzrahmen (ein Kasten je weiterem Element) in einer eigenen Ebene.
let extraLayer: HTMLElement | null = null;
function syncExtraBoxes(els: Element[]): void {
  if (!extraLayer) return;
  while (extraLayer.children.length > els.length) extraLayer.lastElementChild?.remove();
  while (extraLayer.children.length < els.length) {
    const b = document.createElement("div");
    b.className = "box extra";
    extraLayer.appendChild(b);
  }
  els.forEach((el, i) => placeBox(extraLayer!.children[i] as HTMLElement, el));
}

interface Rect4 {
  l: number;
  t: number;
  w: number;
  h: number;
}
const rectOf = (el: Element): Rect4 => {
  const r = el.getBoundingClientRect();
  return { l: r.left, t: r.top, w: r.width, h: r.height };
};
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

interface DragState {
  mode: string;
  sx: number;
  sy: number;
  k: number;
  w0: number;
  h0: number;
  x0: number;
  y0: number;
  useLT: boolean;
}

function Panel(): JSX.Element {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [visible, setVisible] = useState(true);
  const [picking, setPicking] = useState(true);
  const [allowTips, setAllowTips] = useState(false); // Tooltips im Auswahlmodus (Standard: aus)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [sel, setSel] = useState<Element | null>(null);
  // claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl: sel = primäres Element, extra = weitere. Refs, weil die Auswahl-Listener nicht neu gebunden werden.
  const [extra, setExtra] = useState<Element[]>([]);
  const [addMode, setAddMode] = useState(false);
  const selRef = useRef<Element | null>(null);
  const extraRef = useRef<Element[]>([]);
  const addModeRef = useRef(false);
  selRef.current = sel;
  extraRef.current = extra;
  addModeRef.current = addMode;
  const [scope, setScope] = useState<"el" | "sel">("el");
  const [selector, setSelector] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | undefined>();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(["cat:Hintergründe", "cat:Rahmen", "cat:Deko"])); // claude:2026-11-01T10:53:58+01:00
  const [restOpen, setRestOpen] = useState(false); // claude:2026-11-01T10:53:58+01:00 — „Weitere Ordner“ startet eingeklappt
  const [dropOver, setDropOver] = useState(false);
  const childStack = useRef<Element[]>([]);
  const [showCss, setShowCss] = useState("");
  const [rect, setRect] = useState<Rect4 | null>(null);
  const [msg, setMsg] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const flash = useCallback((m: string): void => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? "" : cur)), 4000);
  }, []);

  useEffect(() => {
    setVisibleExternal = setVisible;
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
      setVisibleExternal = null;
    };
  }, []);

  // Elemente selektieren / markieren
  const select = useCallback((el: Element) => {
    selRef.current = el;
    extraRef.current = [];
    setSel(el);
    setExtra([]); // Einzelauswahl ersetzt auch die Mehrfachauswahl
    setSelector(defaultSelector(el));
    childStack.current = [];
    placeBox(selBox, el);
    setRect(rectOf(el));
  }, []);
  // claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl: Element hinzufügen bzw. (ist es schon gewählt) entfernen. Entfernt man das primäre, rückt das nächste nach.
  const toggleMulti = useCallback((el: Element) => {
    const s0 = selRef.current;
    const ex = extraRef.current;
    if (!s0) return select(el);
    if (el === s0) {
      if (!ex.length) {
        selRef.current = null;
        setSel(null);
        return;
      }
      const [first, ...rest] = ex;
      selRef.current = first!;
      extraRef.current = rest;
      setSel(first!);
      setExtra(rest);
      setSelector(defaultSelector(first!));
      childStack.current = [];
      setRect(rectOf(first!));
    } else if (ex.includes(el)) {
      extraRef.current = ex.filter((x) => x !== el);
      setExtra(extraRef.current);
    } else {
      extraRef.current = [...ex, el];
      setExtra(extraRef.current);
      setScope("el"); // Mehrfachauswahl = je Element ein eigenes Override
    }
  }, [select]);
  const makePrimary = (el: Element): void => {
    if (!sel || el === sel) return;
    const rest = [sel, ...extra.filter((x) => x !== el)];
    selRef.current = el;
    extraRef.current = rest;
    setSel(el);
    setExtra(rest);
    setSelector(defaultSelector(el));
    setRect(rectOf(el));
  };
  const clearAll = (): void => {
    selRef.current = null;
    extraRef.current = [];
    setSel(null);
    setExtra([]);
  };
  const addSimilar = (): void => {
    if (!sel) return;
    let hits: Element[] = [];
    try {
      hits = [...document.querySelectorAll(selector.trim() || defaultSelector(sel))];
    } catch {
      return flash("Selektor ungültig.");
    }
    hits = hits.filter((e) => e !== sel && !extra.includes(e) && !e.closest("#asset-lab-host") && !e.closest(`[${INS_ATTR}]`));
    if (!hits.length) return flash("Keine weiteren gleichartigen Elemente gefunden.");
    const room = Math.max(0, 300 - extra.length - 1);
    const take = hits.slice(0, room);
    extraRef.current = [...extra, ...take];
    setExtra(extraRef.current);
    setScope("el");
    flash(`${take.length} gleichartige Elemente hinzugefügt${take.length < hits.length ? ` (Grenze 300, ${hits.length - take.length} übrig)` : ""}.`);
  };

  // Der Selektor-Pfad und die Id des Einzelelements
  const path = useMemo(() => (sel ? buildPath(sel) : ""), [sel]);
  const xs = extra.filter((e) => e.isConnected);
  const multi = xs.length > 0;
  const effScope = multi ? "el" : scope; // claude:2026-10-31T12:30:17+01:00 — Mehrfachauswahl wirkt immer je Element
  const labId = sel?.getAttribute(ID_ATTR) ?? undefined;
  const base = useMemo((): Pick<Ov, OvMeta> | null => {
    if (!sel) return null;
    if (effScope === "sel") return { scope: "sel", selector: selector.trim() || "*", label: selector.trim() };
    const id = labId ?? "a" + Date.now().toString(36);
    return { scope: "el", selector: `[${ID_ATTR}="${id}"]`, path, labId: id, label: describe(sel) };
  }, [sel, effScope, selector, path, labId]);
  const ov: Ov | undefined = base ? ovs.get(ovKey(base)) : undefined;

  // claude:2026-10-31T12:30:17+01:00 — Anwenden auf mehrere Elemente: je Element ein eigenes Override (eigener Selektor), insgesamt EIN Rückgängig-Schritt.
  // mk bekommt Element und dessen bisheriges Override (für das Rahmen-Erbe je Element). only = nur diese Elemente (Ziehgriffe: nur das primäre).
  const applyAll = (mk: (el: Element, o: Ov | undefined) => OvPatch, only?: Element[]): void => {
    if (!base || !sel) return;
    const list = only ?? [sel, ...xs];
    batch(() => {
      for (const el of list) {
        let b: Pick<Ov, OvMeta>;
        if (el === sel) b = base;
        else {
          const id = el.getAttribute(ID_ATTR) ?? newId();
          b = { scope: "el", selector: `[${ID_ATTR}="${id}"]`, path: buildPath(el), labId: id, label: describe(el) };
        }
        if (b.scope === "el" && b.labId && !el.hasAttribute(ID_ATTR)) el.setAttribute(ID_ATTR, b.labId);
        upsert(b, mk(el, ovs.get(ovKey(b))), el);
      }
    });
  };
  const set = (patch: OvPatch): void => applyAll(() => patch);
  // Anzeige: bei Mehrfachauswahl nur gemeinsame Werte, abweichende sind „gemischt“.
  const multiView = multi ? mergeCur([ov, ...xs.map((e) => ovs.get(`el:${e.getAttribute(ID_ATTR) ?? ""}`))]) : null;
  const mixed = new Set(multiView?.mixed ?? []);

  // Hover-/Selektionsrahmen aktuell halten (Scroll, Layoutänderung); alle 1,5 s die Override-Liste auffrischen
  useEffect(() => {
    if (!visible) {
      placeBox(selBox, null);
      syncExtraBoxes([]);
      return;
    }
    let n = 0;
    selBox?.classList.toggle("multi", multi);
    const t = window.setInterval(() => {
      placeBox(selBox, sel);
      syncExtraBoxes(extra);
      if (sel && sel.isConnected) {
        const r = rectOf(sel);
        setRect((p) => (p && p.l === r.l && p.t === r.t && p.w === r.w && p.h === r.h ? p : r));
      }
      if (++n % 6 === 0) bump();
    }, 250);
    placeBox(selBox, sel);
    syncExtraBoxes(extra);
    return () => window.clearInterval(t);
  }, [sel, visible, extra, multi]);

  // claude:2026-10-31T12:30:17+01:00 — Esc leert die Zusatzauswahl (zurück zur Einzelauswahl), bevor das Spiel das Esc bekommt (escStack/App).
  useEffect(() => {
    if (!visible || picking || !multi) return;
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      extraRef.current = [];
      setExtra([]);
    };
    window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [visible, picking, multi]);

  useEffect(() => {
    if (!picking) setAddMode(false);
  }, [picking]);

  // Auswahlmodus
  useEffect(() => {
    if (!picking || !visible) return;
    let cur: Element | null = null;
    let deep: Element | null = null;
    const isLab = (e: Event): boolean => e.target === hostEl;
    const stop = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    const up = (): void => {
      const p = cur?.parentElement;
      if (p && p !== document.documentElement) cur = p;
    };
    const down = (): void => {
      if (!cur || !deep || cur === deep) return;
      let n: Element | null = deep;
      while (n && n.parentElement !== cur) n = n.parentElement;
      if (n) cur = n;
    };
    const onMove = (e: Event): void => {
      if (isLab(e)) return placeBox(hoverBox, null);
      if (!allowTips) stop(e); // das Spiel sieht die Bewegung nicht, also öffnet es keine Tooltips
      const t = e.target as Element;
      if (!(t instanceof Element)) return;
      if (t !== deep) {
        deep = t;
        cur = t;
      }
      placeBox(hoverBox, cur);
    };
    const onBlock = (e: Event): void => {
      if (!isLab(e)) stop(e);
    };
    const onClick = (e: Event): void => {
      if (isLab(e)) return;
      stop(e);
      if (cur) {
        // Strg/Cmd+Klick (oder Modus „Weitere hinzufügen“): zur Auswahl hinzufügen bzw. entfernen, Auswahlmodus bleibt an.
        if ((e as MouseEvent).ctrlKey || (e as MouseEvent).metaKey || addModeRef.current) toggleMulti(cur);
        else {
          select(cur);
          setPicking(false);
        }
      }
    };
    const onWheel = (e: WheelEvent): void => {
      if (isLab(e)) return;
      stop(e);
      if (e.deltaY < 0) up();
      else down();
      placeBox(hoverBox, cur);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        stop(e);
        setPicking(false);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        stop(e);
        if (e.key === "ArrowUp") up();
        else down();
        placeBox(hoverBox, cur);
      } else if (e.key === "Enter" && cur) {
        stop(e);
        if (e.ctrlKey || e.metaKey || addModeRef.current) toggleMulti(cur);
        else {
          select(cur);
          setPicking(false);
        }
      }
    };
    const crosshair = document.createElement("style");
    // Im Auswahlmodus sind alle Tooltips (Citadel-Tips, Titel-Tips, Item-Karte) ausgeblendet und klickdurchlässig,
    // und Hover-Ereignisse erreichen das Spiel nicht. Schalter „Tooltips zulassen“ hebt das auf (um Tooltips selbst zu wählen).
    // Eingefügte Elemente sind im Auswahlmodus immer treffbar, auch wenn sie „Klicks durch“ eingestellt haben.
    crosshair.textContent =
      "* { cursor: crosshair !important; } " + `[${INS_ATTR}] { pointer-events: auto !important; }` +
      (allowTips ? "" : ' .ct-tip, .item-tooltip, [role="tooltip"] { display: none !important; pointer-events: none !important; }');
    document.head.appendChild(crosshair);
    const blockTypes = ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick", "contextmenu", "auxclick"];
    if (!allowTips) blockTypes.push("pointermove", "pointerover", "pointerout", "pointerenter", "pointerleave", "mouseover", "mouseout", "mouseenter", "mouseleave", "focusin");
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("keydown", onKey, true);
    blockTypes.forEach((t) => window.addEventListener(t, onBlock, true));
    return () => {
      crosshair.remove();
      placeBox(hoverBox, null);
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("keydown", onKey, true);
      blockTypes.forEach((t) => window.removeEventListener(t, onBlock, true));
    };
  }, [picking, visible, select, toggleMulti, allowTips]);

  // Panel verschieben
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const onHeadDown = (e: React.PointerEvent): void => {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHeadMove = (e: React.PointerEvent): void => {
    if (drag.current) setPos({ x: Math.max(0, e.clientX - drag.current.dx), y: Math.max(0, e.clientY - drag.current.dy) });
  };

  // ── Ziehen am Element (Griffe im Auswahlrahmen) ──
  const onHandleDown = (mode: string) => (e: React.PointerEvent): void => {
    if (!sel || !base) return;
    e.preventDefault();
    e.stopPropagation();
    rootRef.current?.focus();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const cs0 = getComputedStyle(sel);
    const r0 = sel.getBoundingClientRect();
    const k = sel instanceof HTMLElement && sel.offsetWidth > 0 && r0.width > 0 ? Math.min(10, Math.max(0.1, r0.width / sel.offsetWidth)) : 1;
    const lay = ov?.lay ?? {};
    const abs = cs0.position === "absolute" || cs0.position === "fixed";
    const useLT = abs && (lay.left !== undefined || lay.top !== undefined);
    let x0 = 0;
    let y0 = 0;
    if (useLT) {
      x0 = parseFloat(lay.left ?? cs0.left) || 0;
      y0 = parseFloat(lay.top ?? cs0.top) || 0;
    } else {
      const m = cs0.translate.match(/-?\d+(?:\.\d+)?/g);
      x0 = Number(m?.[0] ?? 0);
      y0 = Number(m?.[1] ?? 0);
    }
    dragRef.current = {
      mode, sx: e.clientX, sy: e.clientY, k, useLT, x0, y0,
      w0: parseFloat(cs0.width) || r0.width / k,
      h0: parseFloat(cs0.height) || r0.height / k,
    };
    beginGesture(); // ein Zug = ein Rückgängig-Schritt
  };
  const onHandleMove = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    if (!d || !sel) return;
    const sn = (v: number): number => (e.shiftKey ? Math.round(v / 4) * 4 : Math.round(v));
    const dx = (e.clientX - d.sx) / d.k;
    const dy = (e.clientY - d.sy) / d.k;
    const lay: Record<string, string | undefined> = {};
    let nx = d.x0;
    let ny = d.y0;
    let moved = false;
    if (d.mode === "mv") {
      nx = sn(d.x0 + dx);
      ny = sn(d.y0 + dy);
      moved = true;
    } else {
      if (d.mode.includes("e")) lay.width = `${Math.max(4, sn(d.w0 + dx))}px`;
      if (d.mode.includes("w")) {
        const w = Math.max(4, sn(d.w0 - dx));
        lay.width = `${w}px`;
        nx = d.x0 + (d.w0 - w);
        moved = true;
      }
      if (d.mode.includes("s")) lay.height = `${Math.max(4, sn(d.h0 + dy))}px`;
      if (d.mode.includes("n")) {
        const h = Math.max(4, sn(d.h0 - dy));
        lay.height = `${h}px`;
        ny = d.y0 + (d.h0 - h);
        moved = true;
      }
    }
    if (moved) {
      if (d.useLT) {
        lay.left = `${nx}px`;
        lay.top = `${ny}px`;
      } else lay.translate = nx === 0 && ny === 0 ? undefined : `${nx}px ${ny}px`;
    }
    applyAll(() => ({ lay }), [sel]); // Ziehgriffe wirken nur auf das primäre Element
    placeBox(selBox, sel);
    setRect(rectOf(sel));
  };
  const onHandleUp = (): void => {
    if (!dragRef.current) return;
    dragRef.current = null;
    endGesture();
  };

  // Strg+Z / Strg+Y nur, solange das Panel den Fokus hat (nicht in Textfeldern: dort gilt das Rückgängig des Textes)
  const onRootKey = (e: React.KeyboardEvent): void => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const t = e.target as HTMLElement;
    if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && ["text", "search"].includes((t as HTMLInputElement).type))) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) undo();
    else if (k === "y" || (k === "z" && e.shiftKey)) redo();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  // Eigene Dateien
  // data:-URL statt Object-URL: die CSP (img-src 'self' data:) erlaubt kein blob:.
  const addFiles = (files: FileList | null): void => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!/^image\//.test(f.type)) continue;
      const rd = new FileReader();
      rd.onload = (): void => {
        customs.set(f.name, String(rd.result));
        setPicked("custom:" + f.name);
        emit();
      };
      rd.readAsDataURL(f);
    }
  };

  // Asset-Gruppen
  // claude:2026-11-01T10:53:58+01:00 — Chef 01.11.: drei Sammelordner (Hintergründe/Rahmen/Deko) oben, alle übrigen
  // Bestandsordner eingeklappt unter „Weitere Ordner“; jedes Asset steht genau einmal.
  const { cats, groups } = useMemo(() => {
    const s = search.trim().toLowerCase();
    const c = new Map<Category, Asset[]>(CATEGORIES.map((k) => [k, []]));
    const m = new Map<string, Asset[]>();
    for (const a of ASSETS) {
      if (s && !a.key.toLowerCase().includes(s)) continue;
      const cat = categoryOf(a);
      if (cat) {
        c.get(cat)!.push(a);
        continue;
      }
      const k = HEAVY.has(a.dir.split("/")[0] ?? "") ? "[Inhalt] " + a.dir : a.dir;
      (m.get(k) ?? m.set(k, []).get(k)!).push(a);
    }
    for (const list of c.values()) list.sort((x, y) => categoryRank(x) - categoryRank(y) || x.name.localeCompare(y.name));
    const rest = [...m.entries()].sort(([a], [b]) => {
      const rank = (k: string): number => (k.startsWith("[Inhalt]") ? 1000 : 100);
      return rank(a) - rank(b) || a.localeCompare(b);
    });
    return { cats: [...c.entries()], groups: rest };
  }, [search]);
  const restCount = groups.reduce((n, [, items]) => n + items.length, 0);
  const searching = search.trim().length > 1;
  const restIsOpen = restOpen || searching;
  const customAssets: Asset[] = [...customs.entries()].map(([name, url]) => ({ key: "custom:" + name, name, dir: "Eigene Dateien", url }));
  const pickedUrl = picked ? resolveUrl(picked) : undefined;

  // ── Einfügen ──
  const doInsert = (kind: "img" | "box", mode: "child" | "after"): void => {
    if (!sel) return flash("Erst ein Ziel-Element wählen.");
    if (mode === "child" && (sel instanceof HTMLImageElement || sel instanceof HTMLInputElement || sel instanceof HTMLBRElement)) return flash("Dieses Element kann keine Kinder haben: „danach“ nehmen.");
    if (mode === "after" && (!sel.parentElement || sel === document.body)) return flash("Dieses Element hat keinen Eltern-Knoten.");
    const run = (w?: number, h?: number): void => {
      const id = insertElement({ kind, mode, target: sel, asset: picked, w, h });
      const el = document.querySelector(`[${INS_ATTR}="${id}"]`);
      if (!el) return flash("Eingefügt, aber das Element ließ sich nicht anlegen (Ziel nicht gefunden).");
      setScope("el");
      select(el);
      setPicking(false);
      flash("Eingefügt. Mit den Griffen ziehen, Werte unter Layout.");
    };
    if (kind === "box") return run();
    if (!picked || !pickedUrl) return flash("Erst unter Texturen ein Bild wählen (oder eigene Datei hineinziehen).");
    const im = new Image();
    im.onload = (): void => {
      const f = Math.min(1, 512 / Math.max(im.naturalWidth, im.naturalHeight, 1));
      run(Math.round(im.naturalWidth * f) || 128, Math.round(im.naturalHeight * f) || 128);
    };
    im.onerror = (): void => run();
    im.src = pickedUrl;
  };
  const pickOv = (o: Ov): void => {
    const el = document.querySelector(o.scope === "el" ? `[${ID_ATTR}="${o.labId ?? ""}"]` : o.selector);
    if (!el) return flash("Element ist auf dieser Seite nicht zu finden.");
    select(el);
    setScope(o.scope);
    if (o.scope === "sel") setSelector(o.selector);
    setPicking(false);
  };
  const dupOv = (o: Ov): void => {
    if (o.ins) {
      const id = duplicateIns(o);
      const el = id ? document.querySelector(`[${INS_ATTR}="${id}"]`) : null;
      if (el) {
        setScope("el");
        select(el);
        setPicking(false);
      } else flash("Kopie angelegt, aber Ziel nicht gefunden.");
      return;
    }
    if (!sel) return flash("Zum Duplizieren erst das Ziel-Element wählen: die Einstellungen werden darauf kopiert.");
    if (o.scope === "el" && sel.getAttribute(ID_ATTR) === o.labId) return flash("Das ist schon dieses Element: anderes Element wählen.");
    cloneOntoElement(o, sel);
    setScope("el");
    flash("Einstellungen auf das gewählte Element kopiert.");
  };

  const cs = sel && sel.isConnected ? getComputedStyle(sel) : null;
  const imgSrc = sel instanceof HTMLImageElement ? sel.currentSrc || sel.src : "";
  const matches = scope === "sel" ? countMatches(selector) : sel ? 1 : 0;
  const style: React.CSSProperties = pos ? { left: pos.x, top: pos.y, right: "auto" } : {};
  const cur = multiView ? multiView.cur : (ov ?? ({} as Partial<Ov>));
  const mx = (k: string): boolean => mixed.has(k);
  const showHandles = visible && !picking && !!sel && sel.isConnected && !!rect && !cur.hide && rect.w > 0;
  const hist = historyDepth();

  return (
    <div className="root" ref={rootRef} tabIndex={-1} onKeyDown={onRootKey}>
      {showHandles && rect && (
        <div className="handles" style={{ left: rect.l, top: rect.t, width: rect.w, height: rect.h }}>
          {HANDLES.map((h) => (
            <div key={h} className={"hd " + h} onPointerDown={onHandleDown(h)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} title="Größe ziehen (Umschalt = 4-px-Raster)" />
          ))}
          <div className="hd mv" onPointerDown={onHandleDown("mv")} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} title="Verschieben (Umschalt = 4-px-Raster)">+</div>
        </div>
      )}
      <div className={"panel" + (visible ? "" : " hidden")} style={style}>
        <div className="head" onPointerDown={onHeadDown} onPointerMove={onHeadMove} onPointerUp={() => (drag.current = null)}>
          <b>ASSET-WERKSTATT</b>
          <button disabled={!hist.undo} onClick={() => undo()} title="Rückgängig (Strg+Z)">Zurück</button>
          <button disabled={!hist.redo} onClick={() => redo()} title="Wiederholen (Strg+Y)">Vor</button>
          <button className={picking ? "on" : ""} onClick={() => { setAddMode(false); setPicking((p) => !p); }} title="Auswahlmodus (Esc beendet)">Auswählen</button>
          <button className={flags.enabled ? "" : "on"} onClick={() => { flags.enabled = !flags.enabled; emit(); }} title="A/B: alle Overrides aus/an">{flags.enabled ? "A/B aus" : "A/B an"}</button>
          <button onClick={() => { panelVisible = false; setVisible(false); }} title="Schließen (Overrides bleiben aktiv)">x</button>
        </div>
        <div className="body">
          {msg && <div className="hint msg">{msg}</div>}
          {/* claude:2026-11-01T11:08:37+01:00 — Chef 01.11.: alte Auswahl wurde unbemerkt mitgeändert. Mehrfachauswahl und
              Hinzufügen-Modus stehen deshalb immer sichtbar oben, mit einem Klick zurück auf ein Element. */}
          {picking && addMode && <div className="multi-warn">Hinzufügen-Modus: jeder Klick fügt zur Auswahl hinzu. Esc oder „Auswählen“ beendet ihn.</div>}
          {sel && multi && (
            <div className="multi-warn">
              <span>Achtung: {xs.length + 1} Elemente gewählt. Jede Änderung wirkt auf alle.</span>
              <button onClick={() => { extraRef.current = []; setExtra([]); }} title="Nur das primäre Element (★) bleibt gewählt">nur ★ behalten</button>
            </div>
          )}
          <details open>
            <summary>Auswahl</summary>
            {picking && <div className="hint">Auswahlmodus: Zeiger bewegen, Mausrad/Pfeile = Eltern/Kind, Klick/Enter wählt, Esc beendet. Strg+Klick fügt zur Auswahl hinzu bzw. entfernt (Modus bleibt an).</div>}
            {/* Tooltips stören beim Wählen; nur einschalten, um einen Tooltip selbst zu gestalten */}
            <div className="row"><label className="chk"><input type="checkbox" checked={allowTips} onChange={(e) => setAllowTips(e.target.checked)} /> Tooltips im Auswahlmodus zulassen</label></div>
            {!sel && !picking && <div className="dim">Nichts gewählt. „Auswählen“ drücken.</div>}
            {sel && (
              <>
                <div className="path">{path}</div>
                <div className="dim">Klassen: {classesOf(sel).join(" ") || "(keine)"}</div>
                <div className="row">
                  <button onClick={() => { const p = sel.parentElement; if (p && p !== document.body) { const st = [...childStack.current, sel]; select(p); childStack.current = st; } }}>Eltern</button>
                  <button onClick={() => { const st = [...childStack.current]; const c = st.pop() ?? sel.firstElementChild; if (c) { select(c); childStack.current = st; } }}>Kind</button>
                  <button onClick={() => { setAddMode(false); setPicking(true); }}>neu wählen</button>
                </div>
                {/* TS — Mehrfachauswahl */}
                <div className="row">
                  <button className={addMode ? "on" : ""} title="Auswahlmodus, in dem jeder Klick hinzufügt/entfernt (Strg+Klick geht auch im normalen Modus)" onClick={() => { setAddMode(true); setPicking(true); }}>Weitere hinzufügen</button>
                  <button title="Alle Elemente mit dem Selektor des primären Elements (unten editierbar bei „alle mit Selektor“), je als Einzelelement" onClick={addSimilar}>Gleichartige hinzufügen</button>
                  {multi && <button className="warn" onClick={clearAll}>Auswahl leeren</button>}
                </div>
                {multi && (
                  <div className="msel">
                    <div className="hint">{xs.length + 1} Elemente gewählt. Regler wirken auf alle; Ziehgriffe nur am primären (★); Layout-Regler auf alle. Esc = nur das primäre behalten.</div>
                    {[sel, ...xs].map((el, i) => (
                      <div className={"ovl" + (i === 0 ? " prim" : "")} key={i}>
                        <span title={buildPath(el)}>{i === 0 ? "★ " : ""}{describe(el)}{elText(el) ? <small className="dim">{" · " + elText(el).slice(0, 24)}</small> : null}</span>
                        {i > 0 && <button onClick={() => makePrimary(el)} title="Zum primären Element machen (Griffe, Berechnete Werte)">primär</button>}
                        <button className="warn" onClick={() => toggleMulti(el)} title="Aus der Auswahl entfernen">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="row">
                  <button className={effScope === "el" ? "on" : ""} onClick={() => setScope("el")}>nur dieses Element</button>
                  <button className={effScope === "sel" ? "on" : ""} disabled={multi} title={multi ? "Bei Mehrfachauswahl wirkt jedes Element einzeln" : undefined} onClick={() => setScope("sel")}>alle mit Selektor</button>
                </div>
                {effScope === "sel" && (
                  <>
                    <input type="text" value={selector} onChange={(e) => setSelector(e.target.value)} spellCheck={false} />
                    <div className={matches < 0 ? "hint" : "dim"}>{matches < 0 ? "Selektor ungültig" : `${matches} Treffer`}</div>
                  </>
                )}
              </>
            )}
          </details>

          {cs && sel && (
            <details>
              <summary>Berechnete Werte</summary>
              <div className="kv">
                {([
                  ["background-image", cs.backgroundImage], ["background-size", cs.backgroundSize], ["background-position", cs.backgroundPosition],
                  ["background-repeat", cs.backgroundRepeat], ["background-color", cs.backgroundColor],
                  ["border-image-source", cs.borderImageSource], ["border-image-slice", cs.borderImageSlice], ["border-image-width", cs.borderImageWidth],
                  ["border-image-outset", cs.borderImageOutset], ["border-image-repeat", cs.borderImageRepeat], ["border-width", cs.borderWidth],
                  ["box-shadow", cs.boxShadow], ["filter", cs.filter], ["opacity", cs.opacity], ...(imgSrc ? [["img src", imgSrc]] : []),
                ] as [string, string][]).map(([k, v]) => (
                  <Fragment2 key={k} k={k} v={v} />
                ))}
              </div>
            </details>
          )}

          <details open>
            <summary>Texturen / Assets</summary>
            <input type="search" placeholder="Suchen (Pfad, Name)…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div
              className={"drop" + (dropOver ? " over" : "")}
              onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
              onDragLeave={() => setDropOver(false)}
              onDrop={(e) => { e.preventDefault(); setDropOver(false); addFiles(e.dataTransfer.files); }}
            >
              Eigene Datei hierher ziehen oder <label style={{ textDecoration: "underline", cursor: "pointer" }}>wählen<input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /></label>
            </div>
            {picked && (
              <div className="picked-box">
                {pickedUrl ? <img src={pickedUrl} alt="" /> : <div className="dim">fehlt</div>}
                <div style={{ flex: 1 }}>
                  <div className="path">{exportPath(picked)}</div>
                  <div className="row">
                    <button disabled={!sel} onClick={() => set({ bg: picked })}>als Hintergrund</button>
                    {/* erster Tausch übernimmt Slice/Breite/Outset/Wiederholung des bisherigen Rahmens */}
                    {/* claude:2026-11-01T10:53:58+01:00 — Painterly-Rahmen aus „Rahmen“ bringen ihre gemessenen Slices/Breiten mit (Regler danach frei). */}
                    <button disabled={!sel} onClick={() => applyAll((el, o) => {
                      const pre = framePreset(picked);
                      if (pre) return { border: picked, inh: pre, slice: undefined, fill: undefined, bw: undefined, outset: undefined, brepeat: undefined };
                      return { border: picked, ...(o?.border || o?.inh ? {} : inheritFrame(el)) };
                    })}>als Rahmen</button>
                    <button disabled={!sel || !(sel instanceof HTMLImageElement)} title="nur bei img-Elementen" onClick={() => set({ img: picked })}>als Bild</button>
                  </div>
                </div>
              </div>
            )}
            {customAssets.length > 0 && <Group title="Eigene Dateien (bis ca. 3 MB lokal gemerkt)" items={customAssets} open onToggle={() => undefined} picked={picked} onPick={(a) => setPicked(a.key)} cap={100} />}
            {cats.map(([k, items]) => (searching && items.length === 0 ? null : (
              <Group
                key={"cat:" + k}
                title={k}
                items={items}
                open={openGroups.has("cat:" + k) || searching}
                onToggle={() => setOpenGroups((s) => { const n = new Set(s); if (n.has("cat:" + k)) n.delete("cat:" + k); else n.add("cat:" + k); return n; })}
                picked={picked}
                onPick={(a) => setPicked(a.key)}
                cap={100}
                showDir
              />
            )))}
            {groups.length > 0 && (
              <details className="group rest" open={restIsOpen} onToggle={(e) => (e.currentTarget.open !== restIsOpen ? setRestOpen((v) => !v) : undefined)}>
                <summary>Weitere Ordner <small>({groups.length} Ordner, {restCount} Dateien)</small></summary>
                {restIsOpen && groups.map(([k, items]) => (
                  <Group
                    key={k}
                    title={k}
                    items={items}
                    open={openGroups.has(k) || (searching && !k.startsWith("[Inhalt]"))}
                    onToggle={() => setOpenGroups((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                    picked={picked}
                    onPick={(a) => setPicked(a.key)}
                    cap={60}
                  />
                ))}
              </details>
            )}
          </details>

          {sel && base && (
            <details open>
              <summary>Regler{multi ? ` (alle ${xs.length + 1})` : ""}</summary>
              {multi && mixed.size > 0 && <div className="hint">Unterschiedlich bei den Gewählten (leer/„gem.“, eine Änderung setzt alle gleich): {[...mixed].join(", ")}</div>}
              <div className="dim">Hintergrund {mx("bg") ? "gemischt" : cur.bg ? exportPath(cur.bg) : "-"}{(cur.bg || mx("bg")) && <> <button onClick={() => set({ bg: undefined })}>x</button></>}</div>
              {/* Größe über Modus-Knöpfe und einen Kachel-Regler (px Breite, Höhe proportional), Position über X/Y-Regler in %. Freitext bleibt für Sonderfälle. */}
              <div className="row"><label>size</label>
                {(["auto", "cover", "contain", "100% 100%"] as const).map((m) => (
                  <button key={m} className={cur.bgSize === m ? "on" : ""} onClick={() => set({ bgSize: m })}>{m === "100% 100%" ? "strecken" : m}</button>
                ))}
                <button title="Zurücksetzen" onClick={() => set({ bgSize: undefined })}>x</button>
              </div>
              <Range label="Kachel" mixed={mx("bgSize")} value={pxOf(cur.bgSize)} def={pxOf(cs?.backgroundSize) ?? 256} min={16} max={2048} unit="px" onChange={(v) => set({ bgSize: v === undefined ? undefined : `${v}px auto` })} />
              <div className="row"><label>frei</label><input type="text" list="al-size" value={cur.bgSize ?? ""} placeholder={mx("bgSize") ? "gemischt" : "z. B. 304px 304px"} onChange={(e) => set({ bgSize: e.target.value || undefined })} /></div>
              <datalist id="al-size">{SIZES.map((s) => <option key={s} value={s} />)}</datalist>
              <div className="row"><label>repeat</label>
                <select value={cur.bgRepeat ?? ""} onChange={(e) => set({ bgRepeat: e.target.value || undefined })}>
                  {["", "repeat", "no-repeat", "repeat-x", "repeat-y", "space", "round"].map((s) => <option key={s} value={s}>{s || "(Standard)"}</option>)}
                </select></div>
              <Range label="pos X" mixed={mx("bgPos")} value={pctOf(cur.bgPos, 0)} def={50} min={0} max={100} unit="%" onChange={(v) => set({ bgPos: v === undefined && pctOf(cur.bgPos, 1) === undefined ? undefined : `${v ?? 50}% ${pctOf(cur.bgPos, 1) ?? 50}%` })} />
              <Range label="pos Y" mixed={mx("bgPos")} value={pctOf(cur.bgPos, 1)} def={50} min={0} max={100} unit="%" onChange={(v) => set({ bgPos: v === undefined && pctOf(cur.bgPos, 0) === undefined ? undefined : `${pctOf(cur.bgPos, 0) ?? 50}% ${v ?? 50}%` })} />
              <div className="row"><label>position</label><input type="text" list="al-pos" value={cur.bgPos ?? ""} placeholder={mx("bgPos") ? "gemischt" : "center / 107px 125px"} onChange={(e) => set({ bgPos: e.target.value || undefined })} /></div>
              <datalist id="al-pos">{POSITIONS.map((s) => <option key={s} value={s} />)}</datalist>
              <div className="row"><label>Tönung</label>
                <input type="color" value={cur.tintColor ?? "#000000"} onChange={(e) => set({ tintColor: e.target.value, tintAlpha: cur.tintAlpha ?? 0.3 })} />
                <input type="range" min={0} max={1} step={0.01} value={cur.tintAlpha ?? 0} onChange={(e) => set({ tintAlpha: Number(e.target.value) || undefined, tintColor: cur.tintColor ?? "#000000" })} />
                <span className="dim">{mx("tintAlpha") || mx("tintColor") ? "gemischt" : Math.round((cur.tintAlpha ?? 0) * 100) + "%"}</span>
              </div>

              <div className="dim" style={{ marginTop: 6 }}>Rahmen {mx("border") ? "gemischt" : cur.border ? exportPath(cur.border) : "-"}{(cur.border || mx("border")) && <> <button onClick={() => set({ border: undefined })}>x</button></>}</div>
              {cur.inh && (
                <div className="dim">
                  übernommen: slice {cur.inh.slice} · width {cur.inh.width} · outset {cur.inh.outset} · {cur.inh.repeat}{" "}
                  <button title="Übernommene Werte verwerfen (Standardwerte)" onClick={() => set({ inh: undefined })}>x</button>
                </div>
              )}
              <Range label="slice" mixed={mx("slice")} value={cur.slice} def={firstNum(cur.inh?.slice) ?? 30} min={0} max={200} unit="px" onChange={(v) => set({ slice: v })} />
              <div className="row"><label>fill</label><input type="checkbox" checked={cur.fill ?? /\bfill\b/.test(cur.inh?.slice ?? "")} onChange={(e) => set({ fill: e.target.checked })} /></div>
              <Range label="width" mixed={mx("bw")} value={cur.bw} def={cur.slice ?? firstNum(cur.inh?.slice) ?? 30} min={0} max={200} unit="px" onChange={(v) => set({ bw: v })} />
              <Range label="outset" mixed={mx("outset")} value={cur.outset} def={0} min={0} max={60} unit="px" onChange={(v) => set({ outset: v })} />
              <div className="row"><label>repeat</label>
                <select value={cur.brepeat ?? ""} onChange={(e) => set({ brepeat: e.target.value || undefined })}>
                  {["", "stretch", "round", "repeat", "space"].map((s) => <option key={s} value={s}>{s || "(stretch)"}</option>)}
                </select></div>
              <Range label="border-width" mixed={mx("borderWidth")} value={cur.borderWidth} def={0} min={0} max={60} unit="px" onChange={(v) => set({ borderWidth: v })} />

              <div className="dim" style={{ marginTop: 6 }}>Bild (img) {mx("img") ? "gemischt" : cur.img ? exportPath(cur.img) : "-"}{(cur.img || mx("img")) && <> <button onClick={() => set({ img: undefined })}>x</button></>}</div>
              <div className="dim" style={{ marginTop: 6 }}>Filter</div>
              <Range label="brightness" mixed={mx("brightness")} value={cur.brightness} def={100} min={0} max={300} unit="%" onChange={(v) => set({ brightness: v })} />
              <Range label="contrast" mixed={mx("contrast")} value={cur.contrast} def={100} min={0} max={300} unit="%" onChange={(v) => set({ contrast: v })} />
              <Range label="saturate" mixed={mx("saturate")} value={cur.saturate} def={100} min={0} max={400} unit="%" onChange={(v) => set({ saturate: v })} />
              <Range label="hue-rotate" mixed={mx("hue")} value={cur.hue} def={0} min={0} max={360} unit="deg" onChange={(v) => set({ hue: v })} />
            </details>
          )}

          {sel && base && (
            <details open>
              <summary>Layout</summary>
              <div className="hint">Griffe am gelben Rahmen: Größe ziehen, „+“ verschiebt, Umschalt = 4-px-Raster. Werte erscheinen hier sofort.{multi ? " Mehrfachauswahl: Regler hier wirken auf alle Gewählten, die Griffe nur auf das primäre Element." : ""}</div>
              <LayoutSection cur={cur} cs={cs} set={set} />
            </details>
          )}

          {sel && base && (
            <details>
              <summary>Einfügen</summary>
              <div className="dim">Ziel: gewähltes Element ({describe(sel)}). Das Eingefügte ist nur Darstellung und wird gespeichert.</div>
              <div className="dim">Bild: {picked ? exportPath(picked) : "erst unter Texturen eines wählen"}</div>
              <div className="row">
                <button onClick={() => doInsert("img", "child")} title="absolut positioniert im gewählten Element">Bild als Kind</button>
                <button onClick={() => doInsert("img", "after")} title="direkt hinter dem gewählten Element">Bild danach</button>
              </div>
              <div className="row">
                <button onClick={() => doInsert("box", "child")}>Container als Kind</button>
                <button onClick={() => doInsert("box", "after")}>Container danach</button>
              </div>
              <div className="dim">Container: leeres Element, Fläche/Rahmen wie bei jedem Override (Texturen oben, Regler, Layout).</div>
            </details>
          )}

          {sel && base && (
            <details open>
              <summary>Notiz zu diesem Override</summary>
              <textarea className="note" rows={3} value={cur.note ?? ""} placeholder={mx("note") ? "gemischt (je Element verschieden)" : "Was soll das bewirken? (für die Umsetzung)"} onChange={(e) => set({ note: e.target.value || undefined })} />
            </details>
          )}

          <details open>
            <summary>Aktive Overrides ({ovs.size})</summary>
            {[...ovs.entries()].map(([k, o]) => {
              const fileMissing = [o.bg, o.border, o.img].some((x) => x && !resolveUrl(x));
              const targetMissing = o.ins ? !insPresent(o) : false;
              const offPage = !o.ins && o.scope === "el" && !!o.labId && !document.querySelector(`[${ID_ATTR}="${o.labId}"]`);
              return (
                <div className="ovl" key={k}>
                  <span title={(o.scope === "el" ? o.path : o.selector) + (o.note ? "\n" + o.note : "")}>
                    {o.ins ? "[+] " : o.scope === "el" ? "[1] " : "[*] "}{o.label}
                    {o.note ? " ✎" : ""}
                    {fileMissing ? "  (Datei nicht gespeichert)" : ""}
                    {targetMissing ? "  (Ziel nicht gefunden)" : ""}
                    {offPage ? "  (nicht auf dieser Seite)" : ""}
                    {o.page ? <small className="dim">{"  · " + o.page}</small> : null}
                  </span>
                  <button onClick={() => pickOv(o)} title="Element wählen">wählen</button>
                  <button onClick={() => dupOv(o)} title={o.ins ? "Eingefügtes Element kopieren" : "Einstellungen auf das gewählte Element kopieren"}>dupl.</button>
                  <button className="warn" onClick={() => removeOv(k)}>x</button>
                </div>
              );
            })}
            <div className="row">
              <button className="warn" onClick={() => resetAll()}>Alles zurücksetzen</button>
            </div>
            <div className="row">
              <button onClick={() => { void copyText(buildExportCss()); setShowCss(buildExportCss()); }}>CSS kopieren</button>
              <button onClick={() => saveJson()}>JSON speichern</button>
            </div>
            <div className="row">
              <button title="Markdown für die Umsetzung durch Claude: Seite, Selektor, alt → neu, Assets, Notizen" onClick={() => { const b = buildBrief(); void copyText(b); setShowCss(b); flash("Bauauftrag kopiert."); }}>Bauauftrag kopieren</button>
              <button onClick={() => saveFile("asset-werkstatt-bauauftrag.md", buildBrief(), "text/markdown")}>Bauauftrag speichern</button>
            </div>
            {showCss && <textarea readOnly value={showCss} onFocus={(e) => e.currentTarget.select()} />}
          </details>
        </div>
      </div>
    </div>
  );
}

function Fragment2({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <>
      <span>{k}</span>
      <span title={v}>{v}</span>
    </>
  );
}

// ───────────────────────── Start / Umschalter ─────────────────────────

let mounted = false;
// Gespeicherte Overrides laden und anwenden (auch ohne Panel).
export function bootAssetLab(): void {
  bootCore();
}

export function toggleAssetLab(): void {
  if (mounted) {
    // Panel ein-/ausblenden; ausgeblendet gibt es keinen Auswahlmodus mehr.
    panelVisible = !panelVisible;
    setVisibleExternal?.(panelVisible);
    return;
  }
  mounted = true;
  bootAssetLab();
  hostEl = document.createElement("div");
  hostEl.id = "asset-lab-host";
  const shadow = hostEl.attachShadow({ mode: "open" });
  const st = document.createElement("style");
  st.textContent = css;
  shadow.appendChild(st);
  hoverBox = document.createElement("div");
  hoverBox.className = "box";
  hoverBox.appendChild(document.createElement("i"));
  selBox = document.createElement("div");
  selBox.className = "box sel";
  selBox.appendChild(document.createElement("i"));
  const mount = document.createElement("div");
  extraLayer = document.createElement("div");
  shadow.append(hoverBox, extraLayer, selBox, mount);
  document.body.appendChild(hostEl);
  createRoot(mount).render(<Panel />);
}
