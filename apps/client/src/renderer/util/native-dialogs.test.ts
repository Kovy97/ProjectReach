import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Dauer-Wache gegen native Browser-Dialoge in der SPIEL-UI (1.0.1).
 *
 * Vorgeschichte: Grim Reach startet default im echten Vollbild. Ein nativer `window.confirm()`
 * über einem exklusiv-fullscreen Electron-Fenster kommt nicht zuverlässig durch — für den Spieler
 * sieht der Knopf dann einfach kaputt aus. Genau das kam als Report zur 1.0.0 herein („Unable to
 * overwrite character with new one"), und dieselbe Ursache steckte hinter „Spiel verlassen tut
 * nichts". Beide Stellen laufen jetzt über `components/ConfirmModal.tsx`.
 *
 * Der Test existiert, weil der Rückfall billig ist: `if (window.confirm(...))` ist eine Zeile und
 * liest sich harmlos. Er soll NICHT „Stil" erzwingen, sondern verhindern, dass ein Spieler wieder
 * vor einem tot wirkenden Knopf sitzt.
 *
 * AUSNAHME `components/arena25d/builder/**`: der Szenen-Editor ist ein Devtool, läuft als eigene
 * EXE im Fenstermodus und wird nie ausgeliefert — dort ist der native Dialog in Ordnung.
 */
const RENDERER = join(__dirname, "..");
const ALLOWED = [join("components", "arena25d", "builder")];
const FORBIDDEN = /\bwindow\.(confirm|alert|prompt)\s*\(/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("Native Dialoge in der Spiel-UI", () => {
  it("kein window.confirm/alert/prompt außerhalb des Szenen-Editors", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(RENDERER)) {
      const rel = file.slice(RENDERER.length + 1);
      if (ALLOWED.some((a) => rel.startsWith(a))) continue;
      const raw = readFileSync(file, "utf8");
      // Kommentare dürfen den Namen nennen — die Doku bei ConfirmModal erklärt ja genau warum.
      // Blockkommentare werden durch gleich viele Zeilenumbrüche ersetzt, damit die gemeldete
      // Zeilennummer weiterhin auf die echte Stelle in der Datei zeigt.
      const stripped = raw
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .split(/\r?\n/)
        .map((line) => line.replace(/\/\/.*$/, ""));
      const lines = raw.split(/\r?\n/);
      stripped.forEach((code, i) => {
        if (FORBIDDEN.test(code)) offenders.push(`${rel}:${i + 1} — ${lines[i]?.trim() ?? ""}`);
      });
    }
    expect(offenders, `Bitte ConfirmModal benutzen statt nativer Dialoge:\n${offenders.join("\n")}`).toEqual([]);
  });
});
