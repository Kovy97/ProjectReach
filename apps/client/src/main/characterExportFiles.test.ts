import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportFolderName, exportTimestamp, sanitizeExportName, writeExportFiles } from "./characterExportFiles";

/** 1×1 rotes PNG-Pixel, base64 (kleinstes gültiges PNG — reicht, um Decode/Schreib-Pfad zu prüfen). */
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("sanitizeExportName", () => {
  it("erlaubt nur [A-Za-z0-9_-]", () => {
    expect(sanitizeExportName("Aldric Vane")).toBe("Aldric_Vane");
    expect(sanitizeExportName("Ösel/Träger:42")).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("führende/folgende Unterstriche fallen weg", () => {
    expect(sanitizeExportName("!!!Grim!!!")).toBe("Grim");
  });

  it("leerer/reiner Sonderzeichen-Name fällt auf 'Charakter' zurück", () => {
    expect(sanitizeExportName("")).toBe("Charakter");
    expect(sanitizeExportName("???")).toBe("Charakter");
  });

  it("kappt auf 60 Zeichen", () => {
    const long = "a".repeat(200);
    expect(sanitizeExportName(long).length).toBe(60);
  });

  it("Pfad-Traversal-Versuch wird entschärft (keine Slashes/Punkte übrig)", () => {
    const cleaned = sanitizeExportName("../../etc/passwd");
    expect(cleaned).not.toContain("/");
    expect(cleaned).not.toContain("..");
  });
});

describe("exportTimestamp / exportFolderName", () => {
  it("formatiert yyyy-mm-dd-hhmm", () => {
    const d = new Date(2026, 7, 28, 9, 5); // 28.08.2026 09:05 lokal (Monat 0-indiziert)
    expect(exportTimestamp(d)).toBe("2026-08-28-0905");
  });

  it("Ordnername kombiniert bereinigten Namen + Zeitstempel", () => {
    const d = new Date(2026, 0, 3, 14, 30);
    expect(exportFolderName("Aldric Vane", d)).toBe("Aldric_Vane-2026-01-03-1430");
  });
});

describe("writeExportFiles", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "grim-char-export-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("schreibt Text- und PNG-Dateien, legt den Ordner an", async () => {
    const target = join(dir, "sub", "Aldric_Vane-2026-08-28-0905");
    const written = await writeExportFiles(target, [
      { name: "kit.png", dataUrl: TINY_PNG },
      { name: "portrait.png", dataUrl: TINY_PNG },
      { name: "prompt.txt", text: "hello prompt" },
    ]);
    expect(written).toBe(3);
    expect((await readdir(target)).sort()).toEqual(["kit.png", "portrait.png", "prompt.txt"]);
    expect(await readFile(join(target, "prompt.txt"), "utf8")).toBe("hello prompt");
    const png = await readFile(join(target, "kit.png"));
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); // PNG-Magic-Bytes
  });

  it("überspringt eine kaputte Daten-URL, schreibt den Rest trotzdem", async () => {
    const written = await writeExportFiles(dir, [
      { name: "kit.png", dataUrl: "data:image/png;base64,not-valid!!" },
      { name: "prompt.txt", text: "still here" },
    ]);
    expect(written).toBe(1);
    expect(await readdir(dir)).toEqual(["prompt.txt"]);
  });

  it("leere Datei-Liste schreibt nichts, wirft aber nicht", async () => {
    const written = await writeExportFiles(dir, []);
    expect(written).toBe(0);
  });
});
