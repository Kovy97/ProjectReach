// codex:2026-08-31T00:20:00+02:00 — rein statische PNG-/Lieferprüfung der fünf Designstudien.
const fs = require("node:fs");
const path = require("node:path");

const files = [
  "01-waechterchronik.png",
  "02-beutetisch.png",
  "03-spuren-der-nacht.png",
  "04-quartiermeister-akte.png",
  "05-aschewaage.png",
];

for (const file of files) {
  const full = path.join(__dirname, file);
  const data = fs.readFileSync(full);
  if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${file}: keine gültige PNG-Signatur`);
  }
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width < 1400 || height < 800 || Math.abs(width / height - 16 / 9) > 0.02) {
    throw new Error(`${file}: unerwartetes Mockup-Format ${width}x${height}`);
  }
  console.log(`${file}: ${width}x${height}, ${Math.round(data.length / 1024)} KiB`);
}

console.log(`QA OK: ${files.length}/5 PNG-Mockups vollständig und im 16:9-Desktopformat.`);
