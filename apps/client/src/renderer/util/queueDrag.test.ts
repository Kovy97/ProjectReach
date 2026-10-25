import { describe, expect, it } from "vitest";
import { queueDropIndex, queueDropTop } from "./queueDrag";

// codex:2026-09-10T10:35:24+02:00 — Pure regression cases; no DOM, save, timer, or engine.
describe("queueDropTop", () => {
  it("lands after a taller target when moving down", () => {
    expect(queueDropTop({ fromVi: 0, overVi: 1, rowTops: [300, 380], rowHeights: [80, 140] })).toBe(440);
  });

  it("lands after a shorter target without leaving a gap", () => {
    expect(queueDropTop({ fromVi: 0, overVi: 1, rowTops: [300, 440], rowHeights: [140, 80] })).toBe(380);
  });

  it("supports non-adjacent down moves and equal-height rows", () => {
    expect(queueDropTop({ fromVi: 0, overVi: 2, rowTops: [100, 180, 300], rowHeights: [80, 120, 60] })).toBe(280);
    expect(queueDropTop({ fromVi: 0, overVi: 2, rowTops: [100, 180, 260], rowHeights: [80, 80, 80] })).toBe(260);
  });

  it("keeps the old target top for upward moves and no-ops", () => {
    expect(queueDropTop({ fromVi: 2, overVi: 0, rowTops: [100, 180, 300], rowHeights: [80, 120, 60] })).toBe(100);
    expect(queueDropTop({ fromVi: 1, overVi: 1, rowTops: [100, 180], rowHeights: [80, 120] })).toBe(180);
  });

  it("uses the body offset exactly once", () => {
    const geometry = { fromVi: 0, overVi: 1, rowTops: [0, 80], rowHeights: [80, 140] };
    expect(queueDropTop({ ...geometry, rowTops: geometry.rowTops.map((top) => top + 350) })).toBe(queueDropTop(geometry) + 350);
  });

  it("clamps edge targets and safely handles empty/singleton geometry", () => {
    expect(queueDropTop({ fromVi: 0, overVi: 99, rowTops: [300, 380], rowHeights: [80, 140] })).toBe(440);
    expect(queueDropTop({ fromVi: 1, overVi: -8, rowTops: [300, 380], rowHeights: [80, 140] })).toBe(300);
    expect(queueDropTop({ fromVi: 0, overVi: 99, rowTops: [300], rowHeights: [80] })).toBe(300);
    expect(queueDropTop({ fromVi: 0, overVi: 0, rowTops: [], rowHeights: [] })).toBe(0);
  });
});

// claude:2026-10-25T16:48:00+01:00 — Spieler-Report 25.10.: Zielplatz aus der Zeilenmitte, symmetrisch in beide Richtungen.
describe("queueDropIndex", () => {
  const rowTops = [0, 100, 200, 300, 400];
  const rowHeights = [100, 100, 100, 100, 100];
  it("bleibt am Platz, solange die Mitte die Nachbarmitte nicht überschreitet (beide Richtungen)", () => {
    expect(queueDropIndex({ fromVi: 2, rowTops, rowHeights, deltaY: 0 })).toBe(2);
    expect(queueDropIndex({ fromVi: 2, rowTops, rowHeights, deltaY: -49 })).toBe(2);
    expect(queueDropIndex({ fromVi: 2, rowTops, rowHeights, deltaY: 49 })).toBe(2);
    expect(queueDropIndex({ fromVi: 2, rowTops, rowHeights, deltaY: -50 })).toBe(2); // genau auf der Grenze: bleibt
  });
  it("Hochziehen: ein Platz erst, wenn die Mitte über die Mitte der Zeile darüber geht", () => {
    expect(queueDropIndex({ fromVi: 2, rowTops, rowHeights, deltaY: -101 })).toBe(1);
    expect(queueDropIndex({ fromVi: 4, rowTops, rowHeights, deltaY: -250 })).toBe(2); // zwischen Zeile 1 und 2 → Platz 2
    expect(queueDropIndex({ fromVi: 4, rowTops, rowHeights, deltaY: -9999 })).toBe(0);
  });
  it("Runterziehen: spiegelbildlich", () => {
    expect(queueDropIndex({ fromVi: 2, rowTops, rowHeights, deltaY: 101 })).toBe(3);
    expect(queueDropIndex({ fromVi: 0, rowTops, rowHeights, deltaY: 250 })).toBe(2); // zwischen Zeile 2 und 3 → Platz 2
    expect(queueDropIndex({ fromVi: 0, rowTops, rowHeights, deltaY: 9999 })).toBe(4);
  });
  it("unterschiedliche Zeilenhöhen und leere Eingaben", () => {
    expect(queueDropIndex({ fromVi: 0, rowTops: [0, 80, 220], rowHeights: [80, 140, 60], deltaY: 111 })).toBe(1); // Mitte 151 > Mitte 150
    expect(queueDropIndex({ fromVi: 0, rowTops: [], rowHeights: [], deltaY: 50 })).toBe(0);
    expect(queueDropIndex({ fromVi: 0, rowTops: [0], rowHeights: [80], deltaY: NaN })).toBe(0);
  });
});
