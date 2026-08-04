/**
 * Zone Map Editor — Dev Tool
 *
 * Platziert Monster-Tokens per Drag auf einer Zone-Hintergrundkarte und
 * schreibt das Ergebnis als JSON nach src/renderer/assets/zonemaps/<zoneId>.json
 * via Electron-IPC (zonemaps:write). Dev-only.
 *
 * Das Stage-Koordinatensystem ist identisch mit ZoneMapView in CombatPage:
 *   position: absolute; left: x%; top: y%; transform: translate(-50%, -50%)
 *   Stage: aspect-ratio 16/9, width 100%
 */

import { useCallback, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import type { MonsterDef } from "@hearthforge/shared";
import { getMonsterSrc } from "../monsters";
import { getZoneBackground } from "../zoneBackgrounds";
import { getZoneMap } from "../zoneMaps";
import type { ZoneHotspot } from "../zoneMaps";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditorHotspot extends ZoneHotspot {
  /** Client-unique key to drive React list rendering. */
  key: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Converts a mouse event position to % coordinates within a stage element. */
function toPct(
  clientX: number,
  clientY: number,
  stageEl: HTMLElement,
): { x: number; y: number } {
  const rect = stageEl.getBoundingClientRect();
  const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
  return { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) };
}

// ── Stage component (shared coordinate system with ZoneMapView) ───────────────

const SIZE_MIN = 0.4;
const SIZE_MAX = 3.0;
const SIZE_STEP = 0.1;
const SIZE_DEFAULT = 1.0;

interface StageProps {
  zoneId: string;
  hotspots: EditorHotspot[];
  selectedKey: string | null;
  hudPos: { x: number; y: number } | null;
  stageRef: React.MutableRefObject<HTMLDivElement | null>;
  onStageMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onStageMouseLeave: () => void;
  onStageMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTokenMouseDown: (key: string, e: React.MouseEvent<HTMLDivElement>) => void;
  onTokenContextMenu: (key: string, e: React.MouseEvent<HTMLDivElement>) => void;
  onTokenClick: (key: string) => void;
  monsters: Record<string, MonsterDef>;
}

function EditorStage({
  zoneId,
  hotspots,
  selectedKey,
  hudPos,
  stageRef,
  onStageMouseMove,
  onStageMouseLeave,
  onStageMouseUp,
  onTokenMouseDown,
  onTokenContextMenu,
  onTokenClick,
  monsters,
}: StageProps): JSX.Element {
  const bg = getZoneBackground(zoneId);

  return (
    <div
      ref={stageRef}
      className="zonemap-editor-stage"
      style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
      onMouseMove={onStageMouseMove}
      onMouseLeave={onStageMouseLeave}
      onMouseUp={onStageMouseUp}
    >
      {hotspots.map((spot) => {
        const monster = monsters[spot.monsterId];
        if (!monster) return null;
        const src = getMonsterSrc(spot.monsterId);
        const isSelected = spot.key === selectedKey;
        const scale = spot.size ?? SIZE_DEFAULT;

        return (
          <div
            key={spot.key}
            className={`zonemap-editor-token${isSelected ? " selected" : ""}`}
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
            onMouseDown={(e) => onTokenMouseDown(spot.key, e)}
            onContextMenu={(e) => onTokenContextMenu(spot.key, e)}
            onClick={() => onTokenClick(spot.key)}
          >
            <div className="zonemap-token-ring">
              {src ? (
                <img loading="lazy" decoding="async" src={src} alt={typeof monster.name === "string" ? monster.name : monster.name.en} />
              ) : (
                <span className="zonemap-token-emoji">⚔</span>
              )}
            </div>
            <span className="zonemap-token-label">
              {typeof monster.name === "string" ? monster.name : monster.name.en}
            </span>
          </div>
        );
      })}

      {/* Cross-hair cursor overlay label */}
      {hudPos && (
        <div
          className="zonemap-editor-hud"
          style={{
            left: `${hudPos.x}%`,
            top: `${hudPos.y}%`,
          }}
        >
          {hudPos.x.toFixed(1)}%, {hudPos.y.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ZoneMapEditorPage(): JSX.Element {
  const zones = content.zones;
  const allMonsters = content.monsters as Record<string, MonsterDef>;

  const [zoneId, setZoneId] = useState<string>(zones[0]?.id ?? "");
  const [hotspots, setHotspots] = useState<EditorHotspot[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hudPos, setHudPos] = useState<{ x: number; y: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState(false);
  /** Skalierungsfaktor für neu platzierte Tokens (gilt als Default beim nächsten Place). */
  const [defaultSize, setDefaultSize] = useState<number>(SIZE_DEFAULT);

  // Drag state (ref so no re-render during drag)
  const dragRef = useRef<{
    key: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);

  // Monsters belonging to the selected zone
  const zoneMonsters = Object.values(allMonsters).filter(
    (m) => m.zone === zoneId,
  );
  const placedIds = new Set(hotspots.map((h) => h.monsterId));
  const unplacedMonsters = zoneMonsters.filter((m) => !placedIds.has(m.id));
  const placedMonsters = zoneMonsters.filter((m) => placedIds.has(m.id));

  // ── Zone switch: load existing hotspots ──────────────────────────────────
  function handleZoneChange(newZoneId: string): void {
    setZoneId(newZoneId);
    setSelectedKey(null);
    setSaveStatus(null);

    const existing = getZoneMap(newZoneId);
    if (existing) {
      setHotspots(
        existing.hotspots.map((h) => ({ ...h, key: `${h.monsterId}-${Math.random()}` })),
      );
    } else {
      setHotspots([]);
    }
  }

  // ── Palette: place a monster in the center ───────────────────────────────
  function placeMonster(monsterId: string): void {
    const newSpot: EditorHotspot = {
      key: `${monsterId}-${Date.now()}`,
      monsterId,
      x: 50,
      y: 50,
      size: defaultSize,
    };
    setHotspots((prev) => [...prev, newSpot]);
    setSelectedKey(newSpot.key);
  }

  // ── Palette: remove a placed monster ─────────────────────────────────────
  function removeMonster(monsterId: string): void {
    setHotspots((prev) => prev.filter((h) => h.monsterId !== monsterId));
    setSelectedKey((prev) => {
      const hotspot = hotspots.find((h) => h.monsterId === monsterId);
      return hotspot && prev === hotspot.key ? null : prev;
    });
  }

  // ── Token interactions ────────────────────────────────────────────────────
  const handleTokenMouseDown = useCallback(
    (key: string, e: React.MouseEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedKey(key);

      const stageEl = stageRef.current;
      if (!stageEl) return;
      const rect = stageEl.getBoundingClientRect();
      const spot = hotspots.find((h) => h.key === key);
      if (!spot) return;

      // Compute pixel offset of cursor from token center to maintain grab point
      const tokenCenterX = rect.left + (spot.x / 100) * rect.width;
      const tokenCenterY = rect.top + (spot.y / 100) * rect.height;

      dragRef.current = {
        key,
        offsetX: e.clientX - tokenCenterX,
        offsetY: e.clientY - tokenCenterY,
      };
    },
    [hotspots],
  );

  const handleTokenContextMenu = useCallback(
    (key: string, e: React.MouseEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setHotspots((prev) => prev.filter((h) => h.key !== key));
      if (selectedKey === key) setSelectedKey(null);
    },
    [selectedKey],
  );

  const handleTokenClick = useCallback((key: string): void => {
    setSelectedKey(key);
  }, []);

  const handleStageMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      const stageEl = stageRef.current;
      if (!stageEl) return;

      const pos = toPct(e.clientX, e.clientY, stageEl);
      setHudPos(pos);

      if (!dragRef.current) return;

      const drag = dragRef.current;
      const stageRect = stageEl.getBoundingClientRect();
      const correctedX = e.clientX - drag.offsetX;
      const correctedY = e.clientY - drag.offsetY;
      const x = clamp(
        ((correctedX - stageRect.left) / stageRect.width) * 100,
        0,
        100,
      );
      const y = clamp(
        ((correctedY - stageRect.top) / stageRect.height) * 100,
        0,
        100,
      );

      setHotspots((prev) =>
        prev.map((h) =>
          h.key === drag.key
            ? { ...h, x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) }
            : h,
        ),
      );
    },
    [],
  );

  const handleStageMouseLeave = useCallback((): void => {
    dragRef.current = null;
    setHudPos(null);
  }, []);

  const handleStageMouseUp = useCallback((): void => {
    dragRef.current = null;
  }, []);

  // ── Selected token coordinate inputs ─────────────────────────────────────
  const selectedSpot = hotspots.find((h) => h.key === selectedKey) ?? null;

  function updateSelectedCoord(axis: "x" | "y", value: number): void {
    if (!selectedKey) return;
    setHotspots((prev) =>
      prev.map((h) =>
        h.key === selectedKey
          ? { ...h, [axis]: clamp(parseFloat(value.toFixed(2)), 0, 100) }
          : h,
      ),
    );
  }

  function updateSelectedSize(value: number): void {
    if (!selectedKey) return;
    const clamped = parseFloat(clamp(value, SIZE_MIN, SIZE_MAX).toFixed(2));
    setHotspots((prev) =>
      prev.map((h) => (h.key === selectedKey ? { ...h, size: clamped } : h)),
    );
  }

  // ── Shared JSON builder (includes size if != default, omits if 1.0 for clean output) ───
  function buildPayloadJson(): string {
    const payload = {
      zoneId,
      hotspots: hotspots.map(({ monsterId, x, y, size }) => {
        const entry: { monsterId: string; x: number; y: number; size?: number } = { monsterId, x, y };
        if (size !== undefined && size !== SIZE_DEFAULT) entry.size = size;
        return entry;
      }),
    };
    return JSON.stringify(payload, null, 2);
  }

  // ── Save via IPC ──────────────────────────────────────────────────────────
  async function handleSave(): Promise<void> {
    setSaveStatus("Saving...");
    const json = buildPayloadJson();

    if (window.hearthforge?.zonemaps) {
      try {
        const result = await window.hearthforge.zonemaps.write(zoneId, json);
        if (result.ok) {
          setSaveStatus(`Saved to: ${result.path ?? "?"}`);
        } else {
          setSaveStatus(`Error: ${result.error ?? "unknown"}`);
        }
      } catch (err) {
        setSaveStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      // Häufigster Fall: veraltetes Preload nach HMR — Fenster komplett neu starten.
      void navigator.clipboard.writeText(json).then(() => {
        setSaveStatus(
          "Speichern nicht möglich: Electron-Bridge nicht geladen. Bitte `pnpm dev` komplett neu starten (Preload-Änderungen werden per HMR nicht übernommen). JSON wurde in die Zwischenablage kopiert — manuell in die .json-Datei einfügen.",
        );
      }).catch(() => {
        setSaveStatus(
          "Speichern nicht möglich: Electron-Bridge nicht geladen. Bitte `pnpm dev` komplett neu starten (Preload-Änderungen werden per HMR nicht übernommen). JSON-Kopieren via Schaltfläche unten.",
        );
      });
    }
  }

  // ── Copy JSON to clipboard ────────────────────────────────────────────────
  function handleCopyJson(): void {
    const json = buildPayloadJson();
    void navigator.clipboard.writeText(json).then(() => {
      setCopyStatus(true);
      window.setTimeout(() => setCopyStatus(false), 2000);
    });
  }

  const selectedZone = zones.find((z) => z.id === zoneId);
  const zoneName = selectedZone
    ? typeof selectedZone.name === "string"
      ? selectedZone.name
      : selectedZone.name.en
    : zoneId;

  return (
    <div className="zonemap-editor-root">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="zonemap-editor-topbar panel">
        <span className="ib-badge">Dev Tool — Zone Map Editor</span>

        <label className="zonemap-editor-label" htmlFor="zme-zone-select">
          Zone:
        </label>
        <select
          id="zme-zone-select"
          className="ib-select"
          value={zoneId}
          onChange={(e) => handleZoneChange(e.target.value)}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {typeof z.name === "string" ? z.name : z.name.en} ({z.id})
            </option>
          ))}
        </select>

        <span className="muted zonemap-editor-hint">
          Drag tokens on the map · Right-click to remove · Hotspots: {hotspots.length}
        </span>

        <button className="zonemap-editor-btn" onClick={() => void handleSave()}>
          Save JSON
        </button>
        <button
          className={`zonemap-editor-btn secondary${copyStatus ? " ok" : ""}`}
          onClick={handleCopyJson}
        >
          {copyStatus ? "Copied!" : "Copy JSON"}
        </button>
      </div>

      {/* ── Save status ────────────────────────────────────────────────────── */}
      {saveStatus && (
        <div
          className={`zonemap-editor-status${saveStatus.startsWith("Error") ? " error" : " ok"}`}
        >
          {saveStatus}
          <button
            className="zonemap-editor-status-close"
            onClick={() => setSaveStatus(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main layout: stage + sidebar ───────────────────────────────────── */}
      <div className="zonemap-editor-body">
        {/* Stage */}
        <div className="zonemap-editor-stage-wrap">
          <EditorStage
            zoneId={zoneId}
            hotspots={hotspots}
            selectedKey={selectedKey}
            hudPos={hudPos}
            stageRef={stageRef}
            onStageMouseMove={handleStageMouseMove}
            onStageMouseLeave={handleStageMouseLeave}
            onStageMouseUp={handleStageMouseUp}
            onTokenMouseDown={handleTokenMouseDown}
            onTokenContextMenu={handleTokenContextMenu}
            onTokenClick={handleTokenClick}
            monsters={allMonsters}
          />
        </div>

        {/* Sidebar */}
        <div className="zonemap-editor-sidebar panel">
          <div className="zonemap-editor-sidebar-title">{zoneName}</div>

          {/* Selected token inspector: coords + size */}
          {selectedSpot && (
            <div className="zonemap-editor-inspector">
              <div className="zonemap-editor-inspector-title">
                Selected: {
                  (() => {
                    const m = allMonsters[selectedSpot.monsterId];
                    return m ? (typeof m.name === "string" ? m.name : m.name.en) : selectedSpot.monsterId;
                  })()
                }
              </div>
              <div className="zonemap-editor-coord-row">
                <label className="zonemap-editor-coord-label">X %</label>
                <input
                  type="number"
                  className="zonemap-editor-coord-input"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selectedSpot.x}
                  onChange={(e) => updateSelectedCoord("x", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="zonemap-editor-coord-row">
                <label className="zonemap-editor-coord-label">Y %</label>
                <input
                  type="number"
                  className="zonemap-editor-coord-input"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selectedSpot.y}
                  onChange={(e) => updateSelectedCoord("y", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="zonemap-editor-size-row">
                <label className="zonemap-editor-size-label">Size</label>
                <input
                  type="range"
                  className="zonemap-editor-size-slider"
                  min={SIZE_MIN}
                  max={SIZE_MAX}
                  step={SIZE_STEP}
                  value={selectedSpot.size ?? SIZE_DEFAULT}
                  onChange={(e) => updateSelectedSize(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  className="zonemap-editor-size-input"
                  min={SIZE_MIN}
                  max={SIZE_MAX}
                  step={SIZE_STEP}
                  value={selectedSpot.size ?? SIZE_DEFAULT}
                  onChange={(e) => updateSelectedSize(parseFloat(e.target.value) || SIZE_DEFAULT)}
                />
              </div>
              <button
                className="zonemap-editor-btn danger"
                onClick={() => {
                  setHotspots((prev) => prev.filter((h) => h.key !== selectedSpot.key));
                  setSelectedKey(null);
                }}
              >
                Remove token
              </button>
            </div>
          )}

          {/* Default size for newly placed tokens */}
          <div className="zonemap-editor-default-size">
            <div className="zonemap-editor-default-size-title">Default size (new tokens)</div>
            <div className="zonemap-editor-size-row">
              <input
                type="range"
                className="zonemap-editor-size-slider"
                min={SIZE_MIN}
                max={SIZE_MAX}
                step={SIZE_STEP}
                value={defaultSize}
                onChange={(e) => setDefaultSize(parseFloat(e.target.value))}
              />
              <input
                type="number"
                className="zonemap-editor-size-input"
                min={SIZE_MIN}
                max={SIZE_MAX}
                step={SIZE_STEP}
                value={defaultSize}
                onChange={(e) => setDefaultSize(parseFloat(e.target.value) || SIZE_DEFAULT)}
              />
            </div>
          </div>

          {/* Mob palette — placed monsters */}
          {placedMonsters.length > 0 && (
            <div className="zonemap-editor-palette-section">
              <div className="zonemap-editor-palette-heading">Placed</div>
              {placedMonsters.map((m) => {
                const name = typeof m.name === "string" ? m.name : m.name.en;
                const src = getMonsterSrc(m.id);
                const spot = hotspots.find((h) => h.monsterId === m.id);
                const isSelected = spot?.key === selectedKey;
                return (
                  <div
                    key={m.id}
                    className={`zonemap-editor-mob-row placed${isSelected ? " selected" : ""}`}
                    onClick={() => spot && setSelectedKey(spot.key)}
                  >
                    <span className="zonemap-editor-mob-thumb">
                      {src ? (
                        <img loading="lazy" decoding="async" src={src} alt={name} />
                      ) : (
                        <span>⚔</span>
                      )}
                    </span>
                    <span className="zonemap-editor-mob-name">{name}</span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {spot ? `${spot.x.toFixed(1)},${spot.y.toFixed(1)}` : ""}
                    </span>
                    <button
                      className="zonemap-editor-mob-remove"
                      onClick={(e) => { e.stopPropagation(); removeMonster(m.id); }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mob palette — unplaced monsters */}
          {unplacedMonsters.length > 0 && (
            <div className="zonemap-editor-palette-section">
              <div className="zonemap-editor-palette-heading">Not placed</div>
              {unplacedMonsters.map((m) => {
                const name = typeof m.name === "string" ? m.name : m.name.en;
                const src = getMonsterSrc(m.id);
                return (
                  <div key={m.id} className="zonemap-editor-mob-row">
                    <span className="zonemap-editor-mob-thumb">
                      {src ? (
                        <img loading="lazy" decoding="async" src={src} alt={name} />
                      ) : (
                        <span>⚔</span>
                      )}
                    </span>
                    <span className="zonemap-editor-mob-name">{name}</span>
                    <button
                      className="zonemap-editor-mob-place"
                      onClick={() => placeMonster(m.id)}
                      title="Place on map"
                    >
                      Place
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {zoneMonsters.length === 0 && (
            <div className="muted" style={{ padding: "12px 0", fontSize: 15 }}>
              No monsters assigned to this zone.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
