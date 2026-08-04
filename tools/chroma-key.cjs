#!/usr/bin/env node
/**
 * Grim Reach — Chroma-Key + Despill für Item-Bilder.
 *
 * Schneidet das grelle Chroma-Grün (#00FF00 ± Toleranz) sauber frei: jeder Pixel wird
 * einzeln geprüft (KEIN Flood-Fill ab dem Rand) → auch EINGESCHLOSSENE Grünflächen
 * (z.B. innerhalb einer Halskette) verschwinden. Zusätzlich "Despill": der grüne
 * Rand-Schimmer an den Kanten wird neutralisiert und weich ausgeblendet.
 *
 * Nutzung:
 *   node tools/chroma-key.cjs <datei|ordner> [zielordner]
 *     <datei|ordner>  Eine PNG ODER ein Ordner (dann werden ALLE *.png darin verarbeitet).
 *     [zielordner]    Optional. Default: <ordner>/cut  bzw. neben der Datei als *-cut.png.
 *
 * Feintuning per Umgebungsvariablen (Defaults in Klammern):
 *   KEY=0,255,0   Chroma-Farbe (nur als Referenz; gekeyt wird über Grün-Überschuss).
 *   HARD=40       Grün-Überschuss (G − max(R,B)) ab dem ein Pixel VOLL transparent wird.
 *   SOFT=10       Ab diesem Grün-Überschuss wird despillt (Saum neutralisieren).
 *   FEATHER=0.7   0..1 — wie stark der grüne Saum zusätzlich ausgeblendet wird.
 *   DESPILL=1     0 = Despill aus (nur hartes Keying).
 *
 * Beispiele:
 *   node tools/chroma-key.cjs C:\Users\MSchu\Downloads\gen-items
 *   HARD=55 node tools/chroma-key.cjs ein_bild.png assets-out
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const KEY = (process.env.KEY || "0,255,0").split(",").map((n) => Number(n));
const HARD = Number(process.env.HARD ?? 40);
const SOFT = Number(process.env.SOFT ?? 10);
const FEATHER = Math.max(0, Math.min(1, Number(process.env.FEATHER ?? 0.7)));
const DESPILL = process.env.DESPILL !== "0";

async function processFile(inFile, outFile) {
  const { data, info } = await sharp(inFile)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels; // 4 (RGBA)
  let keyed = 0;
  let despilled = 0;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxRB = Math.max(r, b);
    const greenExcess = g - maxRB; // wie "grün-dominant" der Pixel ist

    if (greenExcess > HARD && g > 60) {
      // Klares Chroma-Grün (BG, eingeschlossene Flächen, heller Halo) → komplett weg.
      data[i + 3] = 0;
      keyed++;
    } else if (DESPILL && greenExcess > SOFT) {
      // Rand-Schimmer: Grün auf das Niveau von max(R,B) ziehen → neutral, kein grüner Saum.
      data[i + 1] = maxRB + SOFT;
      // Je grüner der Saum, desto stärker ausblenden (weiche Kante).
      const t = Math.min(1, (greenExcess - SOFT) / Math.max(1, HARD - SOFT));
      data[i + 3] = Math.round(data[i + 3] * (1 - FEATHER * t));
      despilled++;
    }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toFile(outFile);
  return { keyed, despilled, total: (data.length / ch) | 0 };
}

async function main() {
  const inArg = process.argv[2];
  const outArg = process.argv[3];
  if (!inArg) {
    console.error("Usage: node tools/chroma-key.cjs <datei|ordner> [zielordner]");
    process.exit(1);
  }
  const stat = fs.statSync(inArg);
  const files = [];
  let outDir;

  if (stat.isDirectory()) {
    outDir = outArg || path.join(inArg, "cut");
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of fs.readdirSync(inArg)) {
      if (/\.png$/i.test(f)) files.push({ in: path.join(inArg, f), out: path.join(outDir, f) });
    }
  } else {
    if (outArg) {
      // outArg als Ordner behandeln, wenn er existiert/keine .png-Endung hat
      if (/\.png$/i.test(outArg)) {
        files.push({ in: inArg, out: outArg });
      } else {
        fs.mkdirSync(outArg, { recursive: true });
        files.push({ in: inArg, out: path.join(outArg, path.basename(inArg)) });
      }
    } else {
      const dir = path.dirname(inArg);
      const base = path.basename(inArg).replace(/\.png$/i, "");
      files.push({ in: inArg, out: path.join(dir, `${base}-cut.png`) });
    }
  }

  if (files.length === 0) {
    console.error("Keine .png-Dateien gefunden.");
    process.exit(1);
  }

  console.log(`Chroma-Key  KEY=${KEY.join(",")}  HARD=${HARD}  SOFT=${SOFT}  FEATHER=${FEATHER}  DESPILL=${DESPILL ? "an" : "aus"}`);
  for (const f of files) {
    try {
      const s = await processFile(f.in, f.out);
      const pct = ((s.keyed / s.total) * 100).toFixed(0);
      console.log(`✓ ${path.basename(f.in)} → ${f.out}  (${pct}% transparent, ${s.despilled} Saum-Pixel entgrünt)`);
    } catch (e) {
      console.error(`✗ ${path.basename(f.in)}: ${e.message}`);
    }
  }
  console.log(`Fertig: ${files.length} Datei(en).`);
}

main();
