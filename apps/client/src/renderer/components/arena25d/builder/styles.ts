import { SCENE_BUILDER_SUPPORTED } from "./flag";

/**
 * Scene-Builder-Styles — als JS-String injiziert statt eines statischen `import "./x.css"`, EXAKT
 * dasselbe Muster/derselbe Grund wie `../styles.ts` (s. dortiges JSDoc "Bundle-Beweis-Anforderung")
 * — ein CSS-Side-Effect-Import würde von Rollup/Vite unbedingt eingesammelt und würde IMMER im
 * finalen CSS-Bundle landen, unabhängig davon, ob das zugehörige JS als toter Code erkannt wird. Als
 * gated JS-String hinter `SCENE_BUILDER_SUPPORTED` verschwindet auch dieser Screen vollständig aus
 * Produktions-Builds.
 *
 * Nutzt ausschließlich die bestehenden globalen `--panel`/`--border`/`--gold`/`--accent`/`--text`-
 * Variablen aus `styles/base.css` (Ashen-Iron-Palette) — die stehen dem Builder ohnehin zur
 * Verfügung, weil `main.tsx` `./styles/index.css` UNBEDINGT importiert (gilt für Spiel UND
 * Builder-Screen gleichermaßen, s. main.tsx "SCENE BUILDER MOUNT SWITCH").
 */
const SCENE_BUILDER_CSS = `
.sb-root {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  background: var(--bg-deep);
  color: var(--text);
  font-family: var(--font-info), sans-serif;
  font-size: 13px;
}
.sb-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.sb-toolbar h1 {
  font-family: var(--font-head);
  font-size: 16px;
  color: var(--gold);
  margin: 0 12px 0 0;
  white-space: nowrap;
}
.sb-toolbar select,
.sb-toolbar input[type="text"] {
  background: var(--slot);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px 8px;
  font-size: 12px;
}
.sb-btn {
  background: var(--panel-hover);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.sb-btn:hover:not(:disabled) {
  border-color: var(--border-bright);
  background: var(--accent-dim);
}
.sb-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.sb-btn.sb-btn-primary {
  border-color: var(--gold);
  color: var(--gold);
}
.sb-toolbar-spacer {
  flex: 1;
}
.sb-toolbar-sep {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  margin: 0 2px;
}
.sb-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.sb-palette {
  width: 232px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.sb-palette-head {
  padding: 8px;
  border-bottom: 1px solid var(--border);
}
.sb-palette-head input {
  width: 100%;
  box-sizing: border-box;
  background: var(--slot);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 8px;
  font-size: 12px;
  margin-bottom: 6px;
}
.sb-palette-head select {
  width: 100%;
  box-sizing: border-box;
  background: var(--slot);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px 6px;
  font-size: 12px;
}
.sb-palette-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 8px;
  align-content: start;
}
.sb-palette-item {
  background: var(--slot);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--muted);
}
.sb-palette-item:hover {
  border-color: var(--border-bright);
}
.sb-palette-item.sb-active {
  border-color: var(--gold);
  color: var(--gold);
}
.sb-palette-thumb {
  width: 100%;
  height: 64px;
  object-fit: contain;
  image-rendering: pixelated;
}
.sb-palette-thumb-placeholder {
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: var(--bg);
  border-radius: 2px;
}
.sb-palette-label {
  font-size: 10px;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
}
.sb-canvas-wrap {
  flex: 1;
  position: relative;
  min-width: 0;
  background: #000;
}
.sb-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
}
.sb-canvas-wrap.sb-placing .sb-canvas {
  cursor: crosshair;
}
.sb-hint {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background: rgba(14, 12, 8, 0.82);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
  pointer-events: none;
  max-width: 420px;
}
.sb-hint b {
  color: var(--text);
}
.sb-perf-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(14, 12, 8, 0.82);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px 8px;
  font-size: 11px;
  color: var(--muted);
  pointer-events: none;
}
.sb-inspector {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  background: var(--panel);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.sb-panel {
  border-bottom: 1px solid var(--border);
  padding: 10px 12px;
}
.sb-panel h2 {
  font-family: var(--font-head);
  font-size: 13px;
  color: var(--gold);
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}
.sb-panel h2 .sb-chevron {
  font-size: 10px;
  color: var(--muted);
}
.sb-empty {
  color: var(--muted);
  font-size: 12px;
  padding: 4px 0;
}
.sb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}
.sb-row label {
  color: var(--muted);
  font-size: 11px;
  flex-shrink: 0;
}
.sb-row input[type="range"] {
  flex: 1;
  accent-color: var(--gold);
}
.sb-row input[type="number"] {
  width: 62px;
  background: var(--slot);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 3px 5px;
  font-size: 11px;
}
.sb-row input[type="color"] {
  width: 40px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border);
  background: none;
  border-radius: var(--radius);
}
.sb-row-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.sb-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text);
  cursor: pointer;
}
.sb-element-list {
  flex: 1;
  overflow-y: auto;
  min-height: 80px;
}
.sb-element-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 11px;
}
.sb-element-row:hover {
  background: var(--panel-hover);
}
.sb-element-row.sb-active {
  background: var(--accent-dim);
  color: var(--gold);
}
.sb-element-row .sb-layer-chip {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--border);
  color: var(--muted);
  flex-shrink: 0;
}
.sb-element-row .sb-el-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sb-element-row .sb-el-del {
  color: var(--danger);
  cursor: pointer;
  padding: 0 3px;
  flex-shrink: 0;
}
.sb-status {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--muted);
  border-top: 1px solid var(--border);
  min-height: 16px;
}
`;

let injected = false;

/** Hängt die Scene-Builder-Styles genau einmal als `<style>`-Tag an `<head>` — no-op außerhalb von
 *  Dev-Builds (s. Modul-JSDoc) und beim zweiten Aufruf (Guard gegen doppeltes Mounting/HMR). */
export function injectSceneBuilderStyles(): void {
  if (!SCENE_BUILDER_SUPPORTED || injected || typeof document === "undefined") return;
  injected = true;
  const style = document.createElement("style");
  style.setAttribute("data-scene-builder-styles", "");
  style.textContent = SCENE_BUILDER_CSS;
  document.head.appendChild(style);
}
