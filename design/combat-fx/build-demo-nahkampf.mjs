// claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: bündelt die ECHTEN Spiel-Dateien (fxParticles.ts +
// fxParticleLibrary.ts inkl. fxParticleMelee.ts) und setzt das Bündel INLINE in demo-nahkampf.html ein
// (Block zwischen /*BUNDLE:START*/ und /*BUNDLE:END*/), damit die Seite eine einzige Datei bleibt und
// exakt die Rezepte zeigt, die im Kampf laufen (keine Nachbau-Kopie wie bei den älteren Demos).
// Aufruf (nach jeder Änderung an den fxParticle*-Dateien): node design/combat-fx/build-demo-nahkampf.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
const requireFromClient = createRequire("G:/GameDev/apps/client/package.json");
const requireFromVite = createRequire(requireFromClient.resolve("vite/package.json"));
const esbuild = requireFromVite("esbuild");
const SRC = "G:/GameDev/apps/client/src/renderer";
const HTML = "G:/GameDev/design/combat-fx/demo-nahkampf.html";
const result = await esbuild.build({
  stdin: {
    contents: [
      `export { ParticleStage, hasRecipe, THEMES } from "${SRC}/fxParticles.ts";`,
      `import "${SRC}/fxParticleLibrary.ts";`,
      `export { MELEE_WEAPON_TYPES, MELEE_MOTION_KEYFRAMES, meleeMotionFor, meleeRecipeKeyFor, meleeElementsFor } from "${SRC}/fxParticleMelee.ts";`,
    ].join("\n"),
    resolveDir: SRC,
    sourcefile: "demo-nahkampf-entry.ts",
    loader: "ts",
  },
  bundle: true,
  format: "iife",
  globalName: "HFX",
  target: "es2020",
  write: false,
  logLevel: "warning",
});
const code = result.outputFiles[0].text;
if (/<\/script/i.test(code)) throw new Error("Bündel enthält </script — Inline-Einbettung unmöglich");
const html = fs.readFileSync(HTML, "utf8");
const re = /\/\*BUNDLE:START\*\/[\s\S]*?\/\*BUNDLE:END\*\//;
if (!re.test(html)) throw new Error("Marker /*BUNDLE:START*/…/*BUNDLE:END*/ fehlen in demo-nahkampf.html");
const stamp = "// Generiert von build-demo-nahkampf.mjs aus apps/client/src/renderer/fxParticle*.ts. Nicht von Hand ändern.";
fs.writeFileSync(HTML, html.replace(re, () => `/*BUNDLE:START*/\n${stamp}\n${code}/*BUNDLE:END*/`));
console.log(`demo-nahkampf.html: Bündel eingesetzt (${(code.length / 1024).toFixed(1)} KB)`);
