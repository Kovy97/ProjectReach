#!/usr/bin/env node
// claude:2026-10-24T13:10:54+02:00 — Asset-Katalog: Index-Erstellung (nur lesend auf allen Quellen).
// Sammelt Laufzeit-Assets, Bildmetriken/QA (Python), Content-Zuordnung (tsx), Git-Verlauf,
// Kandidaten aus den Arbeitsordnern und Prompts. Ergebnis: .cache/index.json + .cache/details.json.
// Inkrementell: Hashes, Bildmetriken, Vorschaubilder und Kandidaten-Kopfdaten werden über
// Größe + Änderungszeit zwischengespeichert. Aufruf: node tools/asset-katalog/build-index.mjs [--rebuild]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "..", "..");
export const CACHE = path.join(HERE, ".cache");
const ASSETS_REPO_PREFIX = "apps/client/src/renderer/assets/";

// claude:2026-10-24T13:10:54+02:00 — freigegebene Wurzeln; der Server liefert nur Dateien unterhalb dieser Ordner aus
export const ROOTS = {
  rt: { label: "Laufzeit", dir: path.join(REPO, "apps", "client", "src", "renderer", "assets") },
  dl: { label: "Downloads/ASSETS", dir: process.env.ASSET_KATALOG_DOWNLOADS || path.join(os.homedir(), "Downloads", "ASSETS") },
  cxa: { label: "CODEX/assets", dir: path.join(REPO, "CODEX", "assets") },
  cxw: { label: "CODEX/work", dir: path.join(REPO, "CODEX", "work") },
  cxc: { label: "CODEX/AssetControl", dir: path.join(REPO, "CODEX", "AssetControl") },
};
const CAND_ROOTS = ["dl", "cxa", "cxw", "cxc"];
const PROMPT_ROOTS = ["cxa", "cxw", "cxc"];
const IMG_RE = /\.(png|webp|jpe?g|svg|gif)$/i;
const RASTER_RE = /\.(png|webp|jpe?g|gif)$/i;
const SKIP_DIRS = new Set(["node_modules", ".git", "__pycache__", ".venv", ".cache"]);

// claude:2026-10-24T13:10:54+02:00 — Ordner, deren Bilder freigestellt sein sollen (echtes Alpha); nur dort gelten
// „kein Alpha“, „deckende Ränder“, „Schleier“ und „Schachbrett“. Szenen/Hintergründe sind bewusst deckend.
export const FREISTELLER = new Set(["items", "monsters", "pets", "icons", "sidebar", "skills", "portraits", "actions", "camp"]);

// claude:2026-10-24T13:10:54+02:00 — Schwellen der QA-Markierungen (Rohwerte kommen aus metrics.py)
export const QA = {
  veilFrac: 0.01, // größte fast weiße, glatte Fläche ≥ 1 % der Objektfläche …
  veilCon: 90, // … und ≥ 90 Helligkeitsstufen heller als der Objekt-Median
  checkerPeak: 1.15, // Schachbrett: Gipfel des Versatzverhältnisses …
  checkerProm: 1.35, // … und deutlich über den Nachbarwerten (s ± 4) …
  checkerDiag: 1.25, // … und Gegenprobe: Feld (s, s) gleichfarbig (claude:2026-10-24T13:15:11+02:00)
  edgeOpaque: 0.5, // Anteil deckender Randpixel (Büsten/Portraits sind unten bewusst angeschnitten, daher > 0.4)
  cornersOpaque: 3, // Anzahl deckender Ecken (2 untere Ecken sind bei Portraits normal)
};
// claude:2026-10-24T13:15:11+02:00 — bewusst deckende Bilder in Freisteller-Ordnern (Karten, Hintergründe, Szenen)
const OPAQUE_OK = /(^|_)(map|maps|bg|background|scene)(_|$)/;
// Version der Rohmetriken; bei Änderungen an metrics.py erhöhen, dann wird neu gemessen
const METRICS_VERSION = 2;
// Mindestgröße (lange Seite) je Ordner; .card-Varianten haben eigene Untergrenze
function minSize(group, rel) {
  if (/\.card\.[a-z]+$/i.test(rel)) return 880;
  switch (group) {
    case "items":
      return 384; // claude:2026-10-24T13:15:11+02:00 — 384er Altbestand ist im Spiel noch scharf, 320er nicht
    case "monsters":
    case "pets":
    case "portraits":
      return 768;
    case "icons":
      return 128;
    case "sidebar":
    case "skills":
    case "actions":
      return 256;
    case "battlescreens":
    case "zones":
    case "dungeons":
    case "skill-backgrounds":
    case "events":
    case "blessings":
    case "foraging-cards":
      return 1280;
    default:
      return 0; // ui/fx/… haben bewusst kleine Teile
  }
}

const log = (...a) => console.log(...a);

// ───────────────────────── Hilfen ─────────────────────────
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}
function walk(dir, filter, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, filter, out);
    } else if (e.isFile() && filter(e.name)) out.push(p);
  }
  return out;
}
const toPosix = (p) => p.split(path.sep).join("/");
const stemOf = (name) => name.replace(/\.[^.]+$/, "");
export const idOf = (name) => stemOf(name).replace(/\.card$/i, "").toLowerCase();
function gitBlobSha(buf) {
  const h = crypto.createHash("sha1");
  h.update(`blob ${buf.length}\0`);
  h.update(buf);
  return h.digest("hex");
}

// Bildmaße aus dem Dateikopf (wie tools/asset-browser/generate.mjs, ohne Abhängigkeiten)
function readHead(file, bytes) {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const n = fs.readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
}
function pngSize(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function webpSize(b) {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const f = b.toString("ascii", 12, 16);
  if (f === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (f === "VP8L") {
    const v = b.readUInt32LE(21);
    return { w: (v & 0x3fff) + 1, h: ((v >>> 14) & 0x3fff) + 1 };
  }
  if (f === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  return null;
}
function jpegSize(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o < b.length - 9) {
    if (b[o] !== 0xff) {
      o++;
      continue;
    }
    const m = b[o + 1];
    if (m === 0xff) {
      o++;
      continue;
    }
    if ((m >= 0xd0 && m <= 0xd9) || m === 0x01) {
      o += 2;
      continue;
    }
    const len = b.readUInt16BE(o + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(o + 7), h: b.readUInt16BE(o + 5) };
    o += 2 + len;
  }
  return null;
}
function svgSize(b) {
  const s = b.toString("utf8");
  const w = s.match(/<svg[^>]*\swidth="([\d.]+)/i);
  const h = s.match(/<svg[^>]*\sheight="([\d.]+)/i);
  if (w && h) return { w: Math.round(+w[1]), h: Math.round(+h[1]) };
  const vb = s.match(/viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/i);
  return vb ? { w: Math.round(+vb[1]), h: Math.round(+vb[2]) } : null;
}
export function imageSize(file) {
  const ext = path.extname(file).toLowerCase();
  try {
    if (ext === ".png") return pngSize(readHead(file, 64));
    if (ext === ".webp") return webpSize(readHead(file, 64));
    if (ext === ".svg") return svgSize(readHead(file, 4096));
    if (ext === ".jpg" || ext === ".jpeg") return jpegSize(readHead(file, 262144));
  } catch {
    /* unlesbar → keine Maße */
  }
  return null;
}

// ───────────────────────── 1. Laufzeit-Assets ─────────────────────────
function scanRuntime(state, force) {
  const dir = ROOTS.rt.dir;
  const files = walk(dir, (n) => IMG_RE.test(n));
  const assets = [];
  const shaCache = force ? {} : state.sha || {};
  const newSha = {};
  for (const abs of files) {
    const rel = toPosix(path.relative(dir, abs));
    const st = fs.statSync(abs);
    const parts = rel.split("/");
    const group = parts.length > 1 ? parts[0] : "(wurzel)";
    const sub = parts.length > 2 ? parts.slice(1, -1).join("/") : "";
    const name = parts[parts.length - 1];
    let c = shaCache[rel];
    if (!c || c.size !== st.size || c.mtime !== st.mtimeMs) {
      c = { size: st.size, mtime: st.mtimeMs, sha: gitBlobSha(fs.readFileSync(abs)) };
    }
    newSha[rel] = c;
    assets.push({
      rel,
      abs,
      group,
      sub,
      name,
      id: idOf(name),
      ext: path.extname(name).slice(1).toLowerCase(),
      bytes: st.size,
      mtime: Math.round(st.mtimeMs),
      sha: c.sha,
    });
  }
  state.sha = newSha;
  return assets;
}

// ───────────────────────── 2. Bildmetriken + Vorschaubilder (Python) ─────────────────────────
function runMetrics(assets, state, force) {
  const cache = force ? {} : state.metrics || {};
  const jobs = [];
  const thumbDir = path.join(CACHE, "thumbs");
  for (const a of assets) {
    if (!RASTER_RE.test(a.name)) continue;
    const c = cache[a.rel];
    const thumb = path.join(thumbDir, a.rel + ".webp");
    if (c && c.sha === a.sha && c.v === METRICS_VERSION && !c.m.error && (!c.m.thumb || fs.existsSync(thumb))) continue;
    jobs.push({ key: a.rel, src: a.abs, thumb });
  }
  if (jobs.length) {
    log(`  ${jobs.length} Bilder messen (Python) …`);
    const jobFile = path.join(CACHE, "metrics-jobs.json");
    const outFile = path.join(CACHE, "metrics-out.json");
    writeJson(jobFile, jobs);
    const py = process.env.ASSET_KATALOG_PYTHON || "python";
    const r = spawnSync(py, [path.join(HERE, "metrics.py"), jobFile, outFile], { stdio: "inherit", windowsHide: true });
    if (r.status !== 0) {
      log(`  WARNUNG: Python-Bildmetriken fehlgeschlagen (Status ${r.status}${r.error ? ", " + r.error.message : ""}). QA-Markierungen fehlen für diese Bilder.`);
    } else {
      const res = readJson(outFile, {});
      const bySha = Object.fromEntries(assets.map((a) => [a.rel, a.sha]));
      for (const [k, m] of Object.entries(res)) cache[k] = { sha: bySha[k], v: METRICS_VERSION, m };
    }
    fs.rmSync(jobFile, { force: true });
    fs.rmSync(outFile, { force: true });
  }
  const live = new Set(assets.map((a) => a.rel));
  for (const k of Object.keys(cache)) if (!live.has(k)) delete cache[k];
  state.metrics = cache;
  return jobs.length;
}

// ───────────────────────── 3. Content (tsx) ─────────────────────────
function loadContent() {
  const out = path.join(CACHE, "content.json");
  const client = path.join(REPO, "apps", "client");
  const cli = path.join(client, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(HERE, "content-export.ts");
  let r;
  if (fs.existsSync(cli)) r = spawnSync(process.execPath, [cli, script, out], { cwd: client, encoding: "utf8", windowsHide: true });
  else r = spawnSync("npx", ["tsx", script, out], { cwd: client, encoding: "utf8", shell: true, windowsHide: true });
  if (r.status !== 0) log(`  WARNUNG: Content-Export fehlgeschlagen, nutze letzten Stand. ${(r.stderr || "").slice(0, 400)}`);
  return readJson(out, { items: [], monsters: [], elites: [], pets: [], zones: [], dungeons: [], skills: [], sets: [] });
}
function readItemAliases() {
  // claude:2026-10-24T13:10:54+02:00 — Bild-Aliase aus dem Client (items.ts) lesen, damit die Lückenliste
  // dieselben Ersatzbilder kennt wie das Spiel; gelesen, nicht importiert (Vite-Glob im Modul).
  try {
    const src = fs.readFileSync(path.join(REPO, "apps", "client", "src", "renderer", "items.ts"), "utf8");
    const block = src.match(/ITEM_IMAGE_ALIASES[^{]*\{([\s\S]*?)\};/);
    const out = {};
    if (block) for (const m of block[1].matchAll(/^\s*([a-z0-9_]+)\s*:\s*"([a-z0-9_]+)"/gim)) out[m[1]] = m[2];
    return out;
  } catch {
    return {};
  }
}

// ───────────────────────── 4. Git-Verlauf ─────────────────────────
function gitHistory(assets) {
  const r = spawnSync(
    "git",
    ["-c", "core.quotePath=false", "log", "--raw", "--no-abbrev", "--no-renames", "--format=@@%H%x09%aI%x09%an%x09%s", "--", "*.webp", "*.png", "*.jpg", "*.jpeg", "*.svg", "*.gif"],
    { cwd: REPO, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, windowsHide: true },
  );
  if (r.status !== 0) {
    log(`  WARNUNG: git log fehlgeschlagen: ${(r.stderr || "").slice(0, 300)}`);
    return { byRel: {}, blobs: new Set(), commits: 0 };
  }
  const commits = [];
  const byPath = new Map(); // repoPath → [{ci, blob, status}]
  let cur = null;
  for (const line of r.stdout.split("\n")) {
    if (line.startsWith("@@")) {
      const [hash, date, author, ...subj] = line.slice(2).split("\t");
      cur = { hash, date, author, subject: subj.join("\t") };
      commits.push(cur);
    } else if (line.startsWith(":") && cur) {
      const tab = line.indexOf("\t");
      const meta = line.slice(1, tab).split(" ");
      const p = line.slice(tab + 1);
      const status = meta[4][0];
      const ev = { ci: commits.length - 1, blob: meta[3], status };
      if (!byPath.has(p)) byPath.set(p, []);
      byPath.get(p).push(ev);
    }
  }
  // gleiche Datei mit anderer Endung (z. B. früher .png, heute .webp) gehört zum selben Asset
  const byStem = new Map();
  for (const p of byPath.keys()) {
    if (!p.startsWith(ASSETS_REPO_PREFIX)) continue;
    const k = p.replace(/\.[^./]+$/, "").toLowerCase();
    if (!byStem.has(k)) byStem.set(k, []);
    byStem.get(k).push(p);
  }
  const byRel = {};
  const blobs = new Set();
  for (const a of assets) {
    const repoPath = ASSETS_REPO_PREFIX + a.rel;
    const stemKey = repoPath.replace(/\.[^./]+$/, "").toLowerCase();
    const paths = new Set([repoPath, ...(byStem.get(stemKey) || [])]);
    // .card-Bilder nicht mit dem Vollbild vermischen
    for (const p of [...paths]) if (/\.card\.[a-z]+$/i.test(p) !== /\.card\.[a-z]+$/i.test(repoPath)) paths.delete(p);
    const evs = [];
    for (const p of paths) for (const e of byPath.get(p) || []) if (e.status !== "D") evs.push({ ...e, path: p });
    evs.sort((x, y) => x.ci - y.ci); // neueste zuerst
    const seen = new Map();
    const versions = [];
    for (const e of evs) {
      if (seen.has(e.blob)) {
        seen.get(e.blob).commits++;
        continue;
      }
      const c = commits[e.ci];
      const v = { blob: e.blob, rev: c.hash, date: c.date, author: c.author, subject: c.subject, path: e.path, status: e.status, commits: 1, current: e.blob === a.sha };
      seen.set(e.blob, v);
      versions.push(v);
      blobs.add(e.blob);
    }
    byRel[a.rel] = versions;
  }
  return { byRel, blobs, commits: commits.length };
}
function gitBlobSizes(blobs) {
  if (!blobs.size) return {};
  const r = spawnSync("git", ["cat-file", "--batch-check=%(objectname) %(objectsize)"], {
    cwd: REPO,
    input: [...blobs].join("\n") + "\n",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  const out = {};
  for (const line of (r.stdout || "").split("\n")) {
    const [sha, size] = line.trim().split(" ");
    if (sha && /^\d+$/.test(size || "")) out[sha] = +size;
  }
  return out;
}

// ───────────────────────── 5. Kandidaten ─────────────────────────
const VARIANT_US = /^_(v\d+|r\d+|\d+|alt\d*|old|new|neu|final|orig\w*|backup|bak|vor_\w+|fix\w*|keyed|alpha|raw|native\w*)$/;
function matchCandidate(abs, rootDir, idSet, normMap) {
  const name = path.basename(abs);
  const stem = stemOf(name).toLowerCase();
  const sid = stem.replace(/\.card$/, "");
  const parent = path.basename(path.dirname(abs)).toLowerCase();
  if (idSet.has(sid)) return { id: sid, kind: "exakt" };
  const fp = sid.match(/^[a-z0-9-]+__(.+)$/);
  if (fp && idSet.has(fp[1])) return { id: fp[1], kind: "exakt" };
  if (idSet.has(parent) && path.resolve(path.dirname(abs)) !== path.resolve(rootDir)) return { id: parent, kind: "ordner" };
  for (let i = sid.length - 1; i > 2; i--) {
    const ch = sid[i];
    if (ch !== "-" && ch !== "." && ch !== "_") continue;
    const head = sid.slice(0, i);
    if (!idSet.has(head)) continue;
    if (ch === "_" && !VARIANT_US.test(sid.slice(i))) continue;
    return { id: head, kind: "variante" };
  }
  const norm = sid.replace(/^(item|icon|monster|pet)[_-]/, "").replace(/[^a-z0-9]/g, "");
  const hit = normMap.get(norm);
  if (hit && hit.length === 1) return { id: hit[0], kind: "aehnlich" };
  return null;
}
function scanCandidates(idSet, state, force, sizeHints) {
  const normMap = new Map();
  for (const id of idSet) {
    const n = id.replace(/[^a-z0-9]/g, "");
    if (!normMap.has(n)) normMap.set(n, []);
    normMap.get(n).push(id);
  }
  const cache = force ? {} : state.cand || {};
  const next = {};
  const byId = {};
  const counts = {};
  let total = 0;
  for (const r of CAND_ROOTS) {
    const rootDir = ROOTS[r].dir;
    const files = walk(rootDir, (n) => IMG_RE.test(n));
    counts[r] = files.length;
    total += files.length;
    for (const abs of files) {
      const m = matchCandidate(abs, rootDir, idSet, normMap);
      if (!m) continue;
      let st;
      try {
        st = fs.statSync(abs);
      } catch {
        continue;
      }
      let c = cache[abs];
      if (!c || c.size !== st.size || c.mtime !== st.mtimeMs) {
        const d = imageSize(abs);
        c = { size: st.size, mtime: st.mtimeMs, w: d?.w ?? null, h: d?.h ?? null };
      }
      // Identität nur prüfen, wenn die Größe zu einer aktuellen oder früheren Fassung passt
      const hints = sizeHints.get(m.id);
      if (hints && hints.has(st.size) && !c.sha) c.sha = gitBlobSha(fs.readFileSync(abs));
      next[abs] = c;
      (byId[m.id] ||= []).push({
        r,
        p: toPosix(path.relative(rootDir, abs)),
        b: st.size,
        m: Math.round(st.mtimeMs),
        w: c.w,
        h: c.h,
        k: m.kind,
        sha: c.sha || null,
      });
    }
  }
  state.cand = next;
  const rank = { exakt: 0, ordner: 1, variante: 2, aehnlich: 3 };
  for (const list of Object.values(byId)) list.sort((a, b) => rank[a.k] - rank[b.k] || b.m - a.m);
  return { byId, counts, total };
}

// ───────────────────────── 6. Prompts ─────────────────────────
const PROMPT_MAX = 12000;
function isPromptFile(abs) {
  const n = path.basename(abs).toLowerCase();
  if (!/\.(md|txt|json)$/.test(n)) return false;
  if (n.endsWith(".json")) return n === "generated-prompts.json";
  if (/prompt/.test(n)) return true;
  return toPosix(abs).toLowerCase().split("/").slice(-4, -1).includes("prompts");
}
function scanPrompts(idSet) {
  const byId = {};
  let files = 0;
  const add = (id, e) => {
    (byId[id] ||= []).push(e);
  };
  for (const r of PROMPT_ROOTS) {
    const rootDir = ROOTS[r].dir;
    for (const abs of walk(rootDir, () => true)) {
      if (!isPromptFile(abs)) continue;
      files++;
      let text;
      let st;
      try {
        st = fs.statSync(abs);
        if (st.size > 4 * 1024 * 1024) continue;
        text = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      const rel = toPosix(path.relative(rootDir, abs));
      const base = { r, p: rel, m: Math.round(st.mtimeMs) };
      const name = path.basename(abs).toLowerCase();
      const stem = stemOf(name);
      const parent = path.basename(path.dirname(abs)).toLowerCase();
      if (name === "generated-prompts.json") {
        let obj = {};
        try {
          obj = JSON.parse(text);
        } catch {
          /* ungültig */
        }
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === "string" && idSet.has(k.toLowerCase())) add(k.toLowerCase(), { ...base, q: "exakt", h: k, t: v.slice(0, PROMPT_MAX) });
        }
        continue;
      }
      const att = stem.match(/^attempt-(\d+)-prompt$/);
      if (att && idSet.has(parent)) {
        add(parent, { ...base, q: "exakt", h: `${parent} · Versuch ${att[1]}`, t: text.slice(0, PROMPT_MAX) });
        continue;
      }
      if (/^prompt(-and-qa)?$/.test(stem) && idSet.has(parent)) {
        add(parent, { ...base, q: "exakt", h: `${parent} · ${name}`, t: text.slice(0, PROMPT_MAX) });
        continue;
      }
      if (idSet.has(stem)) {
        add(stem, { ...base, q: "exakt", h: stem, t: text.slice(0, PROMPT_MAX) });
        continue;
      }
      let prefixHit = null;
      for (let i = stem.length - 1; i > 2; i--) {
        if (stem[i] === "-" && idSet.has(stem.slice(0, i))) {
          prefixHit = stem.slice(0, i);
          break;
        }
      }
      if (prefixHit) {
        add(prefixHit, { ...base, q: "exakt", h: `${prefixHit} · ${stem.slice(prefixHit.length + 1)}`, t: text.slice(0, PROMPT_MAX) });
        continue;
      }
      if (name.endsWith(".md") || name.endsWith(".txt")) sectionPrompts(text, base, idSet, add);
    }
  }
  const rank = { exakt: 0, ungenau: 1, erwaehnt: 2 };
  for (const [id, list] of Object.entries(byId)) {
    list.sort((a, b) => rank[a.q] - rank[b.q] || b.m - a.m);
    byId[id] = list.slice(0, 30);
  }
  return { byId, files };
}
function sectionPrompts(text, base, idSet, add) {
  // claude:2026-10-24T13:10:54+02:00 — Markdown in Abschnitte teilen; eine Überschrift mit der ID ordnet den
  // Abschnitt zu (exakt, wenn die Überschrift nur die ID nennt). Bloße Erwähnungen im Text gelten als „erwähnt“.
  const lines = text.split(/\r?\n/);
  const heads = [];
  lines.forEach((l, i) => {
    const m = l.match(/^(#{1,4})\s+(.*)$/);
    if (m) heads.push({ i, lvl: m[1].length, text: m[2].trim() });
  });
  const used = new Set();
  for (let k = 0; k < heads.length; k++) {
    const h = heads[k];
    let end = lines.length;
    for (let j = k + 1; j < heads.length; j++)
      if (heads[j].lvl <= h.lvl) {
        end = heads[j].i;
        break;
      }
    const ht = h.text.toLowerCase();
    const tokens = ht.match(/[a-z0-9_]+/g) || [];
    const hits = tokens.filter((t) => idSet.has(t) && t.length >= 3);
    for (const id of new Set(hits)) {
      const clean = ht.replace(/[`*~]/g, "").replace(/^[\d.)\s-]+/, "").trim().replace(/\.(webp|png|jpe?g|svg)$/, "");
      const exact = clean === id || clean.endsWith("/" + id) || ht.includes("`" + id + "`") || clean.split(/\s+[—–-]\s+|\s*:\s*/)[0] === id;
      const body = lines.slice(h.i, end).join("\n");
      add(id, { ...base, q: exact ? "exakt" : "ungenau", h: h.text, t: body.slice(0, PROMPT_MAX) });
      used.add(id);
    }
  }
  // Erwähnungen im Fließtext (nur markante IDs mit Unterstrich, je Datei einmal)
  const mentioned = new Set();
  for (const t of text.toLowerCase().match(/[a-z0-9_]+/g) || []) {
    if (t.length >= 6 && t.includes("_") && idSet.has(t) && !used.has(t)) mentioned.add(t);
  }
  if (mentioned.size > 40) return; // Sammellisten ohne Aussagekraft überspringen
  for (const id of mentioned) {
    const idx = text.toLowerCase().indexOf(id);
    const from = Math.max(0, text.lastIndexOf("\n\n", idx));
    const to = text.indexOf("\n\n", idx + id.length);
    add(id, { ...base, q: "erwaehnt", h: `Erwähnung in ${path.basename(base.p)}`, t: text.slice(from, to < 0 ? undefined : to).trim().slice(0, 3000) });
  }
}

// ───────────────────────── 7. Zusammenbau ─────────────────────────
function contentMaps(content) {
  const by = (list) => new Map(list.map((x) => [x.id.toLowerCase(), x]));
  return {
    items: by(content.items),
    monsters: by(content.monsters),
    elites: by(content.elites),
    pets: by(content.pets),
    zones: by(content.zones),
    dungeons: by(content.dungeons),
    skills: by(content.skills),
    setOf: new Map(content.sets.flatMap((s) => s.pieces.map((p) => [p.toLowerCase(), s]))),
  };
}
function contentFor(a, cm) {
  const id = a.id;
  const pick = (kind, x, extra = {}) => (x ? { kind, id: x.id, en: x.name.en, de: x.name.de, ...extra } : null);
  switch (a.group) {
    case "items": {
      const it = cm.items.get(id);
      if (!it) return null;
      const set = cm.setOf.get(id);
      return pick("Item", it, { rarity: it.rarity, slot: it.slot, type: it.type, variantOf: it.variantOf, set: set ? set.name.en : null });
    }
    case "monsters":
      return cm.elites.has(id)
        ? pick("Elite", cm.elites.get(id), { zone: cm.elites.get(id).zone, base: cm.elites.get(id).baseMonsterId })
        : pick("Monster", cm.monsters.get(id), { zone: cm.monsters.get(id)?.zone, level: cm.monsters.get(id)?.level });
    case "pets":
      return pick("Begleiter", cm.pets.get(id));
    case "zones":
      return pick("Zone", cm.zones.get(id));
    case "dungeons":
      return pick("Dungeon", cm.dungeons.get(id));
    case "battlescreens":
      return pick("Zone", cm.zones.get(id)) || pick("Dungeon", cm.dungeons.get(id));
    case "skills":
    case "skill-backgrounds":
      return pick("Skill", cm.skills.get(id));
    case "sidebar":
      return pick("Skill", cm.skills.get(id.replace(/^sidebaricon_/, "")));
    default:
      return null;
  }
}
function computeFlags(a, m) {
  const flags = [];
  if (!m) return flags;
  if (m.error) return ["fehler"];
  const frei = FREISTELLER.has(a.group) && !OPAQUE_OK.test(a.id);
  if (frei && !m.alphaUsed) flags.push("kein-alpha");
  if (frei && m.alphaUsed && m.alpha && (m.alpha.edgeOpaque >= QA.edgeOpaque || m.alpha.cornersOpaque >= QA.cornersOpaque)) flags.push("deckende-raender");
  if (frei && m.veil && m.veil.frac >= QA.veilFrac && m.veil.con >= QA.veilCon) flags.push("schleier");
  if (frei && m.checker && m.checker.peak >= QA.checkerPeak && m.checker.prom >= QA.checkerProm && (m.checker.diag ?? 0) >= QA.checkerDiag)
    flags.push("schachbrett");
  const min = minSize(a.group, a.rel);
  if (min && Math.max(m.w || 0, m.h || 0) < min) flags.push("klein");
  return flags;
}
function computeGaps(content, assets, aliases, candById, promptById) {
  const have = new Set(assets.map((a) => `${a.group}/${a.id}`));
  const has = (g, id) => have.has(`${g}/${id.toLowerCase()}`);
  const gaps = [];
  const push = (kind, x, expected, fallback) =>
    gaps.push({
      kind,
      id: x.id,
      en: x.name.en,
      de: x.name.de,
      expected,
      fallback: fallback || null,
      cands: (candById[x.id.toLowerCase()] || []).length,
      prompts: (promptById[x.id.toLowerCase()] || []).length,
      rarity: x.rarity || null,
    });
  const RV = /_(heroic|mythic)$/;
  for (const it of content.items) {
    if (has("items", it.id)) continue;
    let fb = null;
    if (aliases[it.id] && has("items", aliases[it.id])) fb = `items/${aliases[it.id]} (Alias)`;
    else if (RV.test(it.id) && has("items", it.id.replace(RV, ""))) fb = `items/${it.id.replace(RV, "")} (Raid-Normalbild)`;
    push("Item", it, `items/${it.id}.webp`, fb);
  }
  for (const m of content.monsters) {
    if (has("monsters", m.id)) continue;
    const b = m.id.replace(/^tower_/, "").replace(/^dg_/, "");
    push("Monster", m, `monsters/${m.id}.webp`, b !== m.id && has("monsters", b) ? `monsters/${b} (Basis)` : null);
  }
  for (const e of content.elites) {
    if (has("monsters", e.id)) continue;
    push("Elite", e, `monsters/${e.id}.webp`, e.baseMonsterId && has("monsters", e.baseMonsterId) ? `monsters/${e.baseMonsterId} (Basis-Monster)` : null);
  }
  for (const p of content.pets) if (!has("pets", p.id)) push("Begleiter", p, `pets/${p.id}.webp`, null);
  for (const z of content.zones) {
    if (!has("zones", z.id)) push("Zone", z, `zones/${z.id}.webp`, null);
    if (!has("battlescreens", z.id)) push("Kampfszene", z, `battlescreens/${z.id}.webp`, null);
  }
  for (const d of content.dungeons) {
    if (!has("dungeons", d.id) && !has("battlescreens", d.id)) push("Dungeon", d, `dungeons/${d.id}.webp`, null);
  }
  for (const s of content.skills) {
    if (!has("skills", s.id) && !has("sidebar", "sidebaricon_" + s.id)) push("Skill", s, `skills/${s.id}.webp`, null);
  }
  return gaps;
}

export async function buildIndex({ force = false } = {}) {
  const t0 = Date.now();
  const times = {};
  const step = (name, t) => (times[name] = Date.now() - t);
  fs.mkdirSync(CACHE, { recursive: true });
  const stateFile = path.join(CACHE, "state.json");
  const state = force ? {} : readJson(stateFile, {});

  let t = Date.now();
  log("Asset-Katalog: Index wird erstellt …");
  const assets = scanRuntime(state, force);
  step("laufzeit", t);
  log(`  Laufzeit-Assets: ${assets.length}`);

  t = Date.now();
  const measured = runMetrics(assets, state, force);
  step("metriken", t);

  t = Date.now();
  const content = loadContent();
  const aliases = readItemAliases();
  const cm = contentMaps(content);
  step("content", t);

  t = Date.now();
  const git = gitHistory(assets);
  const blobSizes = gitBlobSizes(git.blobs);
  step("git", t);
  log(`  Git: ${git.commits} Commits mit Bilddateien, ${git.blobs.size} Fassungen`);

  const idSet = new Set(assets.map((a) => a.id));
  for (const list of [content.items, content.monsters, content.elites, content.pets, content.zones, content.dungeons, content.skills])
    for (const x of list) idSet.add(x.id.toLowerCase());
  const sizeHints = new Map();
  for (const a of assets) {
    if (!sizeHints.has(a.id)) sizeHints.set(a.id, new Set());
    sizeHints.get(a.id).add(a.bytes);
    for (const v of git.byRel[a.rel] || []) if (blobSizes[v.blob]) sizeHints.get(a.id).add(blobSizes[v.blob]);
  }

  t = Date.now();
  const cands = scanCandidates(idSet, state, force, sizeHints);
  step("kandidaten", t);
  log(`  Kandidaten-Dateien: ${cands.total} (${Object.entries(cands.counts).map(([k, v]) => `${ROOTS[k].label} ${v}`).join(", ")})`);

  t = Date.now();
  const prompts = scanPrompts(idSet);
  step("prompts", t);
  log(`  Prompt-Dateien: ${prompts.files}, IDs mit Prompt: ${Object.keys(prompts.byId).length}`);

  t = Date.now();
  const gitShaToVersion = {};
  const entries = assets.map((a) => {
    const m = state.metrics?.[a.rel]?.m || null;
    const versions = git.byRel[a.rel] || [];
    const old = versions.filter((v) => !v.current);
    const cl = cands.byId[a.id] || [];
    const distinct = cl.filter((c) => c.sha !== a.sha).length;
    // claude:2026-10-24T13:15:11+02:00 — Kandidaten, die jünger als das Laufzeitbild und nicht identisch sind (mögliche wartende Ersatzbilder)
    const newer = cl.filter((c) => c.sha !== a.sha && c.m > a.mtime).length;
    for (const v of versions) gitShaToVersion[v.blob] = v;
    const dims = m && !m.error ? { w: m.w, h: m.h } : imageSize(a.abs) || { w: null, h: null };
    return {
      rel: a.rel,
      group: a.group,
      sub: a.sub,
      id: a.id,
      ext: a.ext,
      w: dims.w,
      h: dims.h,
      bytes: a.bytes,
      mtime: a.mtime,
      sha: a.sha,
      thumb: !!(m && m.thumb),
      flags: computeFlags(a, m),
      qa: m && !m.error ? { alpha: m.alphaChannel ? (m.alphaUsed ? "genutzt" : "ungenutzt") : "fehlt", ...(m.alpha || {}), veil: m.veil || null, checker: m.checker || null } : m?.error ? { error: m.error } : null,
      content: contentFor(a, cm),
      git: versions.length,
      gitOld: old.length,
      committed: versions.some((v) => v.current),
      cands: cl.length,
      candsDistinct: distinct,
      candsNewer: newer,
      prompts: (prompts.byId[a.id] || []).length,
    };
  });
  const gaps = computeGaps(content, assets, aliases, cands.byId, prompts.byId);
  const flagCounts = {};
  for (const e of entries) for (const f of e.flags) flagCounts[f] = (flagCounts[f] || 0) + 1;
  step("zusammenbau", t);

  const index = {
    builtAt: new Date().toISOString(),
    repo: REPO,
    roots: Object.fromEntries(Object.entries(ROOTS).map(([k, v]) => [k, { label: v.label, dir: v.dir }])),
    qa: QA,
    rarities: content.rarities || [],
    counts: {
      assets: entries.length,
      measured,
      candidateFiles: cands.total,
      candidateFilesByRoot: cands.counts,
      candidatesMatched: Object.values(cands.byId).reduce((s, l) => s + l.length, 0),
      idsWithCandidates: Object.keys(cands.byId).length,
      assetsWithDistinctCandidates: entries.filter((e) => e.candsDistinct > 0).length,
      gitCommits: git.commits,
      gitVersions: git.blobs.size,
      assetsWithOldVersions: entries.filter((e) => e.gitOld > 0).length,
      promptFiles: prompts.files,
      idsWithPrompts: Object.keys(prompts.byId).length,
      flags: flagCounts,
      gaps: gaps.length,
      gapsWithoutFallback: gaps.filter((g) => !g.fallback).length,
    },
    assets: entries,
    gaps,
  };
  const details = { git: git.byRel, cands: cands.byId, prompts: prompts.byId, blobSizes };
  writeJson(path.join(CACHE, "index.json"), index);
  writeJson(path.join(CACHE, "details.json"), details);
  writeJson(stateFile, state);
  times.gesamt = Date.now() - t0;
  index.times = times;
  writeJson(path.join(CACHE, "index.json"), index);
  log(`  fertig in ${(times.gesamt / 1000).toFixed(1)} s (${Object.entries(times).map(([k, v]) => `${k} ${(v / 1000).toFixed(1)}s`).join(", ")})`);
  log(`  QA: ${Object.entries(flagCounts).map(([k, v]) => `${k} ${v}`).join(", ") || "keine"}; Content-Lücken ${gaps.length} (ohne Ersatzbild ${index.counts.gapsWithoutFallback})`);
  return { index, details };
}

export function loadIndex() {
  const index = readJson(path.join(CACHE, "index.json"), null);
  const details = readJson(path.join(CACHE, "details.json"), null);
  return index && details ? { index, details } : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildIndex({ force: process.argv.includes("--rebuild") }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
