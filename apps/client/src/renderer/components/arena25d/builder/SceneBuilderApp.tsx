import { useEffect, useMemo, useRef, useState } from "react";
import { getZoneManifest, listZoneManifestIds, type PropPlaceholderKind } from "../manifest";
import { resolveArenaAssetUrl } from "../assets";
import { ARENA_ASSET_PALETTE, filterPalette, PLACEHOLDER_PALETTE } from "./assetPalette";
import { BuilderScene, type BuilderSnapshot } from "./BuilderScene";
import { injectSceneBuilderStyles } from "./styles";

injectSceneBuilderStyles();

const PLACEHOLDER_EMOJI: Record<PropPlaceholderKind, string> = { tree: "🌳", bush: "🌿", rock: "🪨" };

/**
 * Scene-Builder — WYSIWYG-Vollbild-Screen (Chef-Auftrag "Arena-Scene-Builder"). Reines UI-Wiring:
 * die gesamte three.js-Logik/der Zustand (Elemente/Auswahl/Undo/Licht) lebt in `BuilderScene`
 * (`sceneRef.current`), dieser Komponente obliegt nur Layout + Event-Weiterleitung. Jede Änderung
 * an `BuilderScene` ruft `onChange` → `bump()` → Re-Render; JSX liest den frischen Stand direkt über
 * `sceneRef.current.getSnapshot()` (kein doppelter React-State, der mit der three.js-Welt
 * synchronisiert werden müsste, s. `BuilderScene.ts` Modul-JSDoc).
 *
 * Mountet als EIGENER Vollbild-Screen außerhalb von `<App/>`/`<GameProvider/>`/`<I18nProvider/>`
 * (s. `../../../main.tsx` "SCENE BUILDER MOUNT SWITCH") — kein GameState-/Engine-Kontakt, UI-Texte
 * bewusst direkt Deutsch (Chef-Werkzeug, nie an Spieler ausgeliefert, s. `flag.ts` Modul-JSDoc).
 */
export function SceneBuilderApp({ initialZoneId }: { initialZoneId: string }): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sceneRef = useRef<BuilderScene | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const [, setRev] = useState(0);
  const bump = (): void => setRev((r) => r + 1);
  const [zoneId, setZoneId] = useState(initialZoneId);
  const [initError, setInitError] = useState<string | null>(null);
  const [paletteSearch, setPaletteSearch] = useState("");
  const [onlyThisZone, setOnlyThisZone] = useState(true);
  const [status, setStatus] = useState("");

  const zoneIds = useMemo(() => listZoneManifestIds(), []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    let scene: BuilderScene;
    try {
      scene = new BuilderScene(container, canvas, bump);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[scene-builder] Aufbau fehlgeschlagen (WebGL nicht verfügbar?):", err);
      setInitError("3D-Kontext konnte nicht erstellt werden (WebGL?). Details in der Konsole (F12).");
      return;
    }
    sceneRef.current = scene;
    const startZoneId = zoneIds.includes(initialZoneId) ? initialZoneId : (zoneIds[0] ?? null);
    const manifest = getZoneManifest(startZoneId);
    if (manifest) {
      scene.loadZone(manifest);
      setZoneId(manifest.zoneId);
    } else {
      setInitError(
        "Kein gültiges Zonen-Manifest gefunden (manifests/*.json) — nichts zum Bearbeiten. Prüfe die Browser-Konsole auf Validierungsfehler.",
      );
    }
    bump();
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // Nur einmal beim Mount — Zonenwechsel läuft danach ausschließlich über `handleZoneChange`
    // (ruft `scene.loadZone` direkt auf derselben Instanz, s. BuilderScene.ts Modul-JSDoc "EIN
    // WebGL-Kontext über die gesamte Session").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap: BuilderSnapshot | null = sceneRef.current?.getSnapshot() ?? null;

  function showStatus(msg: string): void {
    setStatus(msg);
    if (statusTimerRef.current != null) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatus(""), 3400);
  }

  function handleZoneChange(id: string): void {
    const scene = sceneRef.current;
    const manifest = getZoneManifest(id);
    if (!scene || !manifest) return;
    if (scene.hasUnsavedElements() && id !== zoneId) {
      const ok = window.confirm("Zone wechseln? Nicht exportierte Änderungen an der aktuellen Zone gehen dabei verloren.");
      if (!ok) return;
    }
    scene.loadZone(manifest);
    setZoneId(id);
  }

  function handleCopyProps(): void {
    const scene = sceneRef.current;
    if (!scene) return;
    const json = scene.exportPropsBlock();
    navigator.clipboard
      .writeText(json)
      .then(() => showStatus(`Props-Block kopiert (${snap?.elementCount ?? 0} Elemente).`))
      .catch(() => showStatus("Kopieren fehlgeschlagen — Zwischenablage nicht erreichbar."));
  }

  function handleDownload(): void {
    const scene = sceneRef.current;
    if (!scene || !snap) return;
    const json = scene.exportFullManifest();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${snap.zoneId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus(`${snap.zoneId}.json heruntergeladen.`);
  }

  function handleImportClick(): void {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = ""; // erneuter Import derselben Datei muss wieder ein onChange auslösen
    if (!file || !sceneRef.current) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const ok = sceneRef.current?.importManifest(raw) ?? false;
      if (ok) {
        const importedZoneId = sceneRef.current?.getSnapshot().zoneId ?? "";
        setZoneId(importedZoneId);
        showStatus(`Importiert: ${file.name}`);
      } else {
        showStatus("Import fehlgeschlagen — ungültiges Manifest, Details in der Konsole (F12).");
      }
    };
    reader.readAsText(file);
  }

  if (initError) {
    return (
      <div className="sb-root">
        <div className="sb-toolbar">
          <h1>Arena Scene-Builder</h1>
        </div>
        <div className="sb-empty" style={{ padding: 24 }}>
          {initError}
        </div>
      </div>
    );
  }

  const scene = sceneRef.current;
  const selectedLive = snap?.elements.find((e) => e.id === snap.selectedId) ?? null;

  const paletteAssets = filterPalette(ARENA_ASSET_PALETTE, paletteSearch, onlyThisZone ? zoneId : null);
  const palettePlaceholders = PLACEHOLDER_PALETTE.filter(
    (p) => !paletteSearch.trim() || p.label.toLowerCase().includes(paletteSearch.trim().toLowerCase()),
  );

  return (
    <div className="sb-root">
      <div className="sb-toolbar">
        <h1>Arena Scene-Builder</h1>
        <select value={zoneId} onChange={(e) => handleZoneChange(e.target.value)}>
          {zoneIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <div className="sb-toolbar-sep" />
        <button className="sb-btn" disabled={!snap?.canUndo} onClick={() => scene?.undo()} title="Strg+Z">
          ↶ Rückgängig
        </button>
        <button className="sb-btn" disabled={!snap?.canRedo} onClick={() => scene?.redo()} title="Strg+Y">
          ↷ Wiederholen
        </button>
        <div className="sb-toolbar-sep" />
        <label className="sb-toggle">
          <input type="checkbox" checked={snap?.showOverlay ?? true} onChange={(e) => scene?.toggleOverlay(e.target.checked)} />
          Referenz-Overlay
        </label>
        <div className="sb-toolbar-spacer" />
        <button className="sb-btn" onClick={handleCopyProps}>
          📋 Manifest kopieren (props)
        </button>
        <button className="sb-btn sb-btn-primary" onClick={handleDownload}>
          ⬇ {zoneId || "zone"}.json
        </button>
        <button className="sb-btn" onClick={handleImportClick}>
          ⬆ Importieren
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} />
      </div>

      <div className="sb-body">
        <div className="sb-palette">
          <div className="sb-palette-head">
            <input type="text" placeholder="Suchen…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} />
            <label className="sb-toggle" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={onlyThisZone} onChange={(e) => setOnlyThisZone(e.target.checked)} />
              Nur "{zoneId}"
            </label>
          </div>
          <div className="sb-palette-grid">
            {palettePlaceholders.map((p) => (
              <div
                key={`ph-${p.kind}`}
                className={`sb-palette-item${snap?.placingKind === p.kind && !snap.placingFile?.startsWith("arena_") ? " sb-active" : ""}`}
                onClick={() => scene?.startPlacing(null, p.kind)}
                title="Prozedurale Platzhalter-Silhouette (kein echtes Asset) — verschwindet automatisch, sobald eine echte Datei mit passendem Namen unter assets/arena/ liegt."
              >
                <div className="sb-palette-thumb-placeholder">{PLACEHOLDER_EMOJI[p.kind]}</div>
                <div className="sb-palette-label">{p.label}</div>
              </div>
            ))}
            {paletteAssets.map((entry) => (
              <div
                key={entry.file}
                className={`sb-palette-item${snap?.placingFile === entry.file ? " sb-active" : ""}`}
                onClick={() => scene?.startPlacing(entry.file, null)}
                title={entry.file}
              >
                <img className="sb-palette-thumb" src={entry.url} alt="" loading="lazy" />
                <div className="sb-palette-label">{entry.label}</div>
              </div>
            ))}
            {paletteAssets.length === 0 && palettePlaceholders.length === 0 && <div className="sb-empty">Keine Treffer.</div>}
          </div>
        </div>

        <div className={`sb-canvas-wrap${snap?.placingFile || snap?.placingKind ? " sb-placing" : ""}`} ref={containerRef}>
          <canvas className="sb-canvas" ref={canvasRef} />
          <div className="sb-hint">
            {snap?.placingFile || snap?.placingKind ? (
              <>
                <b>Platzieren:</b> Klick auf den Boden setzt das Element — <b>Esc</b> bricht ab.
              </>
            ) : (
              <>
                Klick = auswählen/ziehen · Mausrad = skalieren · <b>Q/E</b> = rotieren · <b>F</b> = flach · <b>M</b> = spiegeln ·{" "}
                <b>Pfeiltasten</b> = verschieben (+Shift größer) · <b>Entf</b> = löschen · <b>Strg+D</b> = duplizieren · <b>Strg+Z/Y</b> = Undo/Redo
              </>
            )}
          </div>
          <div className="sb-perf-badge">{snap?.elementCount ?? 0} Props</div>
        </div>

        <div className="sb-inspector">
          <div className="sb-panel">
            <h2>Element</h2>
            {selectedLive ? (
              <SelectedElementPanel def={selectedLive.def} scene={scene} />
            ) : (
              <div className="sb-empty">Kein Element ausgewählt — klicke ein platziertes Prop an oder wähle eins aus der Liste.</div>
            )}
          </div>

          <div className="sb-panel" style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", minHeight: 120 }}>
            <h2>
              Elemente <span style={{ color: "var(--muted)", fontWeight: "normal" }}>({snap?.elements.length ?? 0})</span>
            </h2>
            <div className="sb-element-list">
              {(snap?.elements ?? []).map((el) => (
                <div
                  key={el.id}
                  className={`sb-element-row${el.id === snap?.selectedId ? " sb-active" : ""}`}
                  onClick={() => scene?.selectElement(el.id)}
                >
                  <span className="sb-layer-chip">{el.def.layer}</span>
                  <span className="sb-el-name">{el.def.file}</span>
                  <span
                    className="sb-el-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      scene?.deleteElement(el.id);
                    }}
                    title="Löschen"
                  >
                    ✕
                  </span>
                </div>
              ))}
              {(snap?.elements.length ?? 0) === 0 && <div className="sb-empty" style={{ padding: 8 }}>Noch keine Props platziert.</div>}
            </div>
          </div>

          {snap && <LightingPanel snap={snap} scene={scene} />}
          {snap && <BackdropPanel snap={snap} scene={scene} />}

          <div className="sb-status">{status}</div>
        </div>
      </div>
    </div>
  );
}

function SelectedElementPanel({ def, scene }: { def: import("../manifest").ZoneManifestProp; scene: BuilderScene | null }): JSX.Element {
  const resolvedUrl = resolveArenaAssetUrl(def.file);
  return (
    <>
      <div className="sb-empty" style={{ wordBreak: "break-all", marginBottom: 6 }}>
        {def.file}
        {!resolvedUrl && <div style={{ color: "var(--danger)" }}>⚠ Datei noch nicht unter assets/arena/ — Platzhalter aktiv.</div>}
      </div>
      <NumberRow label="X" value={def.x} min={-9.5} max={9.5} step={0.05} onEdit={(v) => scene?.patchSelectedLive({ x: v })} onBegin={() => scene?.beginElementEdit()} />
      <NumberRow label="Z" value={def.z} min={1.2} max={11.5} step={0.05} onEdit={(v) => scene?.patchSelectedLive({ z: v })} onBegin={() => scene?.beginElementEdit()} />
      <NumberRow label="Skalierung" value={def.scale} min={0.15} max={6} step={0.05} onEdit={(v) => scene?.patchSelectedLive({ scale: v })} onBegin={() => scene?.beginElementEdit()} />
      <NumberRow
        label="Neigung °"
        value={def.rotDeg ?? 0}
        min={-180}
        max={180}
        step={1}
        onEdit={(v) => scene?.patchSelectedLive({ rotDeg: v })}
        onBegin={() => scene?.beginElementEdit()}
      />
      <div className="sb-row-btns">
        <button className={`sb-btn${def.layer === "back" ? " sb-btn-primary" : ""}`} onClick={() => scene?.setSelectedLayer("back")}>
          Ebene: back
        </button>
        <button className={`sb-btn${def.layer === "mid" ? " sb-btn-primary" : ""}`} onClick={() => scene?.setSelectedLayer("mid")}>
          Ebene: mid
        </button>
      </div>
      <div className="sb-row-btns">
        <label className="sb-toggle">
          <input type="checkbox" checked={!!def.flat} onChange={() => scene?.toggleFlatSelected()} />
          Flach auf Boden (F)
        </label>
      </div>
      <div className="sb-row-btns">
        <label className="sb-toggle">
          <input type="checkbox" checked={!!def.flip} onChange={() => scene?.toggleFlipSelected()} />
          Gespiegelt (M)
        </label>
      </div>
      <div className="sb-row-btns">
        <button className="sb-btn" onClick={() => scene?.duplicateSelected()} title="Strg+D">
          ⎘ Duplizieren
        </button>
        <button className="sb-btn" onClick={() => scene?.deleteSelected()} title="Entf">
          ✕ Löschen
        </button>
      </div>
    </>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step,
  onEdit,
  onBegin,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onEdit: (v: number) => void;
  onBegin: () => void;
}): JSX.Element {
  const beganRef = useRef(false);
  return (
    <div className="sb-row">
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => {
          beganRef.current = true;
          onBegin();
        }}
        onPointerUp={() => {
          beganRef.current = false;
        }}
        onChange={(e) => {
          if (!beganRef.current) onBegin(); // Tastatur-gesteuerte Slider-Änderung ohne vorheriges pointerdown
          onEdit(Number(e.target.value));
        }}
      />
      <input
        type="number"
        step={step}
        value={Math.round(value * 1000) / 1000}
        onFocus={() => onBegin()}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onEdit(v);
        }}
      />
    </div>
  );
}

function LightingPanel({ snap, scene }: { snap: BuilderSnapshot; scene: BuilderScene | null }): JSX.Element {
  const l = snap.lighting;
  return (
    <div className="sb-panel">
      <h2>Licht</h2>
      <div className="sb-row">
        <label>Sonnenfarbe</label>
        <input type="color" value={l.sunColor} onChange={(e) => scene?.setLighting({ sunColor: e.target.value })} />
      </div>
      <SliderRow label="Sonne Stärke" value={l.sunIntensity} min={0} max={6} step={0.1} onChange={(v) => scene?.setLighting({ sunIntensity: v })} />
      <SliderRow label="Sonne Höhe °" value={l.sunAngleDeg} min={0} max={90} step={1} onChange={(v) => scene?.setLighting({ sunAngleDeg: v })} />
      <SliderRow label="Sonne Azimut °" value={l.sunAzimuthDeg} min={-180} max={180} step={1} onChange={(v) => scene?.setLighting({ sunAzimuthDeg: v })} />
      <div className="sb-row">
        <label>Fülllicht</label>
        <input type="color" value={l.ambientColor} onChange={(e) => scene?.setLighting({ ambientColor: e.target.value })} />
      </div>
      <SliderRow label="Füll-Stärke" value={l.ambientIntensity} min={0} max={2} step={0.05} onChange={(v) => scene?.setLighting({ ambientIntensity: v })} />
      <div className="sb-row">
        <label>Nebelfarbe</label>
        <input type="color" value={l.fogColor} onChange={(e) => scene?.setLighting({ fogColor: e.target.value })} />
      </div>
      <SliderRow label="Nebeldichte" value={l.fogDensity} min={0} max={0.08} step={0.001} onChange={(v) => scene?.setLighting({ fogDensity: v })} />
      <SliderRow label="Sättigung" value={l.grade.saturation} min={0} max={2} step={0.05} onChange={(v) => scene?.setGrade({ saturation: v })} />
      <SliderRow label="Temperatur" value={l.grade.temperature} min={-1} max={1} step={0.05} onChange={(v) => scene?.setGrade({ temperature: v })} />
      <SliderRow label="Aufhellung" value={l.grade.lift ?? 0} min={-1} max={1} step={0.05} onChange={(v) => scene?.setGrade({ lift: v })} />
    </div>
  );
}

function BackdropPanel({ snap, scene }: { snap: BuilderSnapshot; scene: BuilderScene | null }): JSX.Element {
  return (
    <div className="sb-panel">
      <h2>Kulisse (experimentell)</h2>
      <div className="sb-empty" style={{ marginBottom: 6 }}>
        BACKDROP_Z/HEIGHT sind heute Code-Konstanten (sceneEnvironment.ts), kein Manifest-Feld — Export vermerkt Anpassungen nur als Kommentarfeld, Aufnahme ins Schema entscheidet der Chef.
      </div>
      <SliderRow
        label="Abstand (Z)"
        value={snap.backdropZ}
        min={-8}
        max={4}
        step={0.1}
        onChange={(v) => scene?.setBackdropParams(v, snap.backdropHeight)}
      />
      <SliderRow
        label="Höhe"
        value={snap.backdropHeight}
        min={4}
        max={24}
        step={0.1}
        onChange={(v) => scene?.setBackdropParams(snap.backdropZ, v)}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}): JSX.Element {
  return (
    <div className="sb-row">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <input type="number" step={step} value={Math.round(value * 1000) / 1000} onChange={(e) => Number.isFinite(Number(e.target.value)) && onChange(Number(e.target.value))} />
    </div>
  );
}
