/**
 * Scene-Builder-Standalone-EXE bauen (Chef-Auftrag 2026-08-05, s. src/renderer/components/arena25d/
 * README.md "Standalone-EXE"): setzt SCENE_BUILDER_BUILD=1 (⇒ electron.vite.config.ts baut mit
 * `__SCENE_BUILDER_BUILD__ = true` in den SEPARATEN Ausgabe-Root `out-scenebuilder/` — `out/` und
 * damit das Spieler-Packaging bleiben zu 100% unberührt) und packt das Ergebnis anschließend per
 * electron-builder (eigene Config electron-builder-scenebuilder.json, Portable-EXE, Ausgabe
 * `release-scenebuilder/`). Cross-platform via spawnSync + shell (Windows-.cmd-Shims).
 *
 * Aufruf: `pnpm --filter @hearthforge/client package:scenebuilder`
 * Danach liegt die fertige EXE zusätzlich als `<repo>/SceneBuilder.exe` (Chef-Doppelklick-Startpunkt).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(clientDir, "..", "..");
const env = { ...process.env, SCENE_BUILDER_BUILD: "1" };

function run(bin, args) {
  console.log(`\n[package-scenebuilder] ${bin} ${args.join(" ")}`);
  const result = spawnSync(bin, args, {
    cwd: clientDir,
    env,
    stdio: "inherit",
    // Windows: node_modules/.bin enthält .cmd-Shims, die nur eine Shell starten kann.
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`[package-scenebuilder] ${bin} konnte nicht gestartet werden:`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[package-scenebuilder] ${bin} endete mit Exit-Code ${result.status} — Abbruch.`);
    process.exit(result.status ?? 1);
  }
}

run("electron-vite", ["build"]);
run("electron-builder", ["--win", "--config", "electron-builder-scenebuilder.json"]);

// Fertige Portable-EXE an den Chef-Doppelklick-Startpunkt im Repo-Root kopieren (in .gitignore).
// Best effort: läuft die EXE dort gerade (Datei gesperrt), bleibt die frische Fassung trotzdem
// unter release-scenebuilder/ liegen — nur die Kopie schlägt fehl, der Build selbst ist gültig.
const builtExe = join(clientDir, "release-scenebuilder", "GrimReach-SceneBuilder.exe");
const targetExe = join(repoRoot, "SceneBuilder.exe");
if (!existsSync(builtExe)) {
  console.error(`[package-scenebuilder] Erwartete Portable-EXE fehlt: ${builtExe}`);
  process.exit(1);
}
try {
  copyFileSync(builtExe, targetExe);
  console.log(`[package-scenebuilder] Fertig: ${targetExe}`);
} catch (err) {
  console.warn(
    `[package-scenebuilder] Kopie nach ${targetExe} fehlgeschlagen (EXE läuft dort gerade?). ` +
      `Frischer Build liegt unter: ${builtExe}`,
    err,
  );
}
