#!/usr/bin/env node
/**
 * Asset-Browser-Generator für Grim Reach.
 *
 * Scannt apps/client/src/renderer/assets/** (png/webp/jpg/svg) und erzeugt
 * tools/asset-browser/index.html — eine statische Galerie mit Suche,
 * Kategorien (= Ordnerstruktur), Lightbox und "Pfad kopieren".
 *
 * Keine Dependencies: Bild-Maße werden direkt aus den Datei-Headern gelesen.
 *
 * Aufruf:  node tools/asset-browser/generate.mjs   (oder: pnpm asset-browser)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_REL = 'apps/client/src/renderer/assets';
const ASSETS_DIR = path.join(REPO_ROOT, ...ASSETS_REL.split('/'));
const OUT_FILE = path.join(__dirname, 'index.html');
// index.html liegt in tools/asset-browser/ → zwei Ebenen hoch bis zum Repo-Root
const REL_PREFIX = '../../' + ASSETS_REL + '/';

const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg']);

// ---------------------------------------------------------------------------
// Bild-Maße aus Datei-Headern lesen (kein sharp nötig)
// ---------------------------------------------------------------------------

function readHead(file, bytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const n = fs.readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
}

function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function webpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8 ') {
    if (buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
      return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    return null;
  }
  if (fourcc === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >>> 14) & 0x3fff) + 1 };
  }
  if (fourcc === 'VP8X') {
    const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { w, h };
  }
  return null;
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off < buf.length - 9) {
    if (buf[off] !== 0xff) { off++; continue; }
    const marker = buf[off + 1];
    if (marker === 0xff) { off++; continue; }
    if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) { off += 2; continue; }
    const len = buf.readUInt16BE(off + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
    off += 2 + len;
  }
  return null;
}

function svgSize(text) {
  const openTag = (text.match(/<svg[^>]*>/i) || [null])[0];
  if (!openTag) return null;
  const num = (m) => (m ? Math.round(parseFloat(m[1])) : null);
  const w = num(openTag.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i));
  const h = num(openTag.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i));
  if (w && h) return { w, h };
  const vb = openTag.match(/viewBox\s*=\s*["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i);
  if (vb) return { w: Math.round(parseFloat(vb[1])), h: Math.round(parseFloat(vb[2])) };
  return null;
}

function imageSize(file, ext) {
  try {
    if (ext === '.png') return pngSize(readHead(file, 32));
    if (ext === '.webp') return webpSize(readHead(file, 40));
    if (ext === '.jpg' || ext === '.jpeg') return jpegSize(fs.readFileSync(file));
    if (ext === '.svg') return svgSize(fs.readFileSync(file, 'utf8').slice(0, 4096));
  } catch {
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Assets scannen
// ---------------------------------------------------------------------------

function scan(dir, relDir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = relDir ? relDir + '/' + e.name : e.name;
    if (e.isDirectory()) {
      scan(abs, rel, out);
    } else if (IMAGE_EXT.has(path.extname(e.name).toLowerCase())) {
      const ext = path.extname(e.name).toLowerCase();
      const stat = fs.statSync(abs);
      out.push({
        rel,                                   // Pfad relativ zum Assets-Root
        dir: relDir || '(root)',               // Kategorie = Ordner
        name: e.name,
        bytes: stat.size,
        size: imageSize(abs, ext),
        ext,
      });
    }
  }
}

if (!fs.existsSync(ASSETS_DIR)) {
  console.error('Assets-Ordner nicht gefunden: ' + ASSETS_DIR);
  process.exit(1);
}

const files = [];
scan(ASSETS_DIR, '', files);

// Kategorien gruppieren, nach Dateizahl absteigend sortieren
const catMap = new Map();
for (const f of files) {
  if (!catMap.has(f.dir)) catMap.set(f.dir, []);
  catMap.get(f.dir).push(f);
}
const categories = [...catMap.entries()]
  .map(([dir, list]) => ({
    dir,
    list: list.sort((a, b) => a.name.localeCompare(b.name)),
    bytes: list.reduce((s, f) => s + f.bytes, 0),
  }))
  .sort((a, b) => b.list.length - a.list.length || a.dir.localeCompare(b.dir));

const totalBytes = files.reduce((s, f) => s + f.bytes, 0);

// ---------------------------------------------------------------------------
// HTML erzeugen
// ---------------------------------------------------------------------------

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const encRel = (rel) => rel.split('/').map(encodeURIComponent).join('/');
const kb = (bytes) => (bytes / 1024).toFixed(1) + ' KB';
const mb = (bytes) => (bytes / 1048576).toFixed(2) + ' MB';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'root';
const dims = (f) => (f.size ? f.size.w + '×' + f.size.h : (f.ext === '.svg' ? 'SVG' : '?'));

const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

let tilesHtml = '';
for (let ci = 0; ci < categories.length; ci++) {
  const cat = categories[ci];
  const open = ci === 0 ? ' open' : '';
  tilesHtml += '<details class="cat"' + open + ' id="cat-' + slug(cat.dir) + '" data-default-open="' + (ci === 0 ? '1' : '0') + '">\n';
  tilesHtml += '<summary><span class="cat-name">' + esc(cat.dir) + '</span> <span class="cat-count" data-total="' + cat.list.length + '">' + cat.list.length + ' Dateien</span> <span class="cat-mb">' + mb(cat.bytes) + '</span></summary>\n';
  tilesHtml += '<div class="grid">\n';
  for (const f of cat.list) {
    const src = REL_PREFIX + encRel(f.rel);
    const repoPath = ASSETS_REL + '/' + f.rel;
    tilesHtml +=
      '<div class="tile" data-name="' + esc(f.name.toLowerCase()) + '">' +
      '<div class="thumb"><img src="' + esc(src) + '" loading="lazy" decoding="async" alt="' + esc(f.name) + '"' +
      ' data-path="' + esc(repoPath) + '" data-dims="' + dims(f) + '" data-kb="' + kb(f.bytes) + '"></div>' +
      '<div class="fname" title="' + esc(f.rel) + '">' + esc(f.name) + '</div>' +
      '<div class="finfo">' + dims(f) + ' · ' + kb(f.bytes) + '</div>' +
      '<button class="copy" data-path="' + esc(repoPath) + '" title="' + esc(repoPath) + '">Pfad kopieren</button>' +
      '</div>\n';
  }
  tilesHtml += '</div>\n</details>\n';
}

let navHtml = '';
for (const cat of categories) {
  navHtml += '<a class="chip" href="#cat-' + slug(cat.dir) + '">' + esc(cat.dir) + ' <b>' + cat.list.length + '</b> <i>' + mb(cat.bytes) + '</i></a>\n';
}

const clientJs = `
(function () {
  'use strict';
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.tile'));
  var index = tiles.map(function (el) {
    return { el: el, name: el.getAttribute('data-name'), cat: el.closest('details.cat') };
  });
  var cats = Array.prototype.slice.call(document.querySelectorAll('details.cat'));

  // --- Suche -----------------------------------------------------------
  var search = document.getElementById('search');
  var countInfo = document.getElementById('search-count');
  var timer = null;
  search.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(applyFilter, 90);
  });
  function applyFilter() {
    var q = search.value.trim().toLowerCase();
    var perCat = new Map();
    var total = 0;
    for (var i = 0; i < index.length; i++) {
      var hit = !q || index[i].name.indexOf(q) !== -1;
      index[i].el.classList.toggle('hidden', !hit);
      if (hit) {
        total++;
        perCat.set(index[i].cat, (perCat.get(index[i].cat) || 0) + 1);
      }
    }
    for (var c = 0; c < cats.length; c++) {
      var cat = cats[c];
      var n = perCat.get(cat) || 0;
      var counter = cat.querySelector('.cat-count');
      if (q) {
        cat.classList.toggle('hidden', n === 0);
        cat.open = n > 0;
        counter.textContent = n + ' / ' + counter.getAttribute('data-total') + ' Dateien';
      } else {
        cat.classList.remove('hidden');
        cat.open = cat.getAttribute('data-default-open') === '1';
        counter.textContent = counter.getAttribute('data-total') + ' Dateien';
      }
    }
    countInfo.textContent = q ? total + ' Treffer' : '';
  }

  // --- Kachel-Hintergrund umschalten ------------------------------------
  var bgBtn = document.getElementById('bg-toggle');
  bgBtn.addEventListener('click', function () {
    document.body.classList.toggle('light-tiles');
    bgBtn.textContent = document.body.classList.contains('light-tiles')
      ? 'Kachel-Hintergrund: Hell' : 'Kachel-Hintergrund: Dunkel';
  });

  // --- Alle auf/zu -------------------------------------------------------
  document.getElementById('expand-all').addEventListener('click', function () {
    cats.forEach(function (c) { if (!c.classList.contains('hidden')) c.open = true; });
  });
  document.getElementById('collapse-all').addEventListener('click', function () {
    cats.forEach(function (c) { c.open = false; });
  });

  // --- Pfad kopieren ------------------------------------------------------
  function copyText(text, btn) {
    function done() {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = 'Kopiert \\u2713';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('copied'); }, 1100);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // --- Lightbox ------------------------------------------------------------
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  var lbName = document.getElementById('lb-name');
  var lbInfo = document.getElementById('lb-info');
  var lbCopy = document.getElementById('lb-copy');
  function openLightbox(img) {
    lbImg.src = img.getAttribute('src');
    lbName.textContent = img.getAttribute('alt');
    lbInfo.textContent = img.getAttribute('data-dims') + ' \\u00b7 ' + img.getAttribute('data-kb') + ' \\u00b7 ' + img.getAttribute('data-path');
    lbCopy.setAttribute('data-path', img.getAttribute('data-path'));
    lb.classList.add('show');
  }
  function closeLightbox() {
    lb.classList.remove('show');
    lbImg.src = '';
  }
  lb.addEventListener('click', function (ev) {
    if (ev.target === lb || ev.target === lbImg) closeLightbox();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeLightbox();
  });

  // --- Ein Klick-Handler fuer alles (Delegation, 2000+ Kacheln) -----------
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button.copy, #lb-copy');
    if (btn) {
      copyText(btn.getAttribute('data-path'), btn);
      ev.stopPropagation();
      return;
    }
    var img = ev.target.closest('.thumb img');
    if (img) openLightbox(img);
  });
})();
`;

const html = `<!-- GENERIERTE DATEI - nicht von Hand editieren. Neu erzeugen: pnpm asset-browser -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Grim Reach — Asset-Browser</title>
<style>
  :root {
    --bg: #16181d; --panel: #1e2128; --panel2: #262a33; --border: #343947;
    --text: #d6d9e0; --muted: #8b91a0; --accent: #d8a24a;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
         font: 14px/1.45 system-ui, 'Segoe UI', sans-serif; }
  a { color: inherit; text-decoration: none; }

  header { position: sticky; top: 0; z-index: 20; background: var(--panel);
           border-bottom: 1px solid var(--border); padding: 10px 16px;
           display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  header h1 { font-size: 17px; margin: 0 12px 0 0; color: var(--accent); white-space: nowrap; }
  header .total { color: var(--muted); font-size: 12.5px; white-space: nowrap; }
  #search { flex: 1 1 220px; min-width: 180px; max-width: 420px; padding: 7px 11px;
            background: var(--bg); color: var(--text); border: 1px solid var(--border);
            border-radius: 6px; font-size: 14px; outline: none; }
  #search:focus { border-color: var(--accent); }
  #search-count { color: var(--accent); font-size: 12.5px; min-width: 70px; }
  header button { padding: 7px 11px; background: var(--panel2); color: var(--text);
                  border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 12.5px; }
  header button:hover { border-color: var(--accent); }

  nav.chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px;
              border-bottom: 1px solid var(--border); background: #191c22; }
  .chip { background: var(--panel2); border: 1px solid var(--border); border-radius: 20px;
          padding: 3px 11px; font-size: 12px; color: var(--muted); white-space: nowrap; }
  .chip:hover { border-color: var(--accent); color: var(--text); }
  .chip b { color: var(--text); font-weight: 600; }
  .chip i { font-style: normal; opacity: .7; }

  main { padding: 8px 16px 60px; }
  details.cat { margin: 10px 0; border: 1px solid var(--border); border-radius: 8px;
                background: var(--panel); }
  details.cat > summary { cursor: pointer; padding: 10px 14px; user-select: none;
                          display: flex; gap: 12px; align-items: baseline; }
  details.cat > summary:hover { color: #fff; }
  .cat-name { font-weight: 600; font-size: 15px; color: var(--accent); }
  .cat-count { color: var(--muted); font-size: 12.5px; }
  .cat-mb { color: var(--muted); font-size: 12.5px; margin-left: auto; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px; padding: 12px; }
  .tile { background: var(--panel2); border: 1px solid var(--border); border-radius: 8px;
          padding: 8px; display: flex; flex-direction: column; gap: 5px;
          content-visibility: auto; contain-intrinsic-size: 150px 210px; }
  .tile.hidden, details.cat.hidden { display: none; }
  .thumb { height: 116px; display: flex; align-items: center; justify-content: center;
           border-radius: 5px; overflow: hidden; cursor: zoom-in;
           background: repeating-conic-gradient(#2e323c 0% 25%, #22252d 0% 50%) 0 0 / 18px 18px; }
  body.light-tiles .thumb {
    background: repeating-conic-gradient(#ffffff 0% 25%, #d4d4d4 0% 50%) 0 0 / 18px 18px; }
  .thumb img { max-width: 100%; max-height: 108px; object-fit: contain; }
  .fname { font-size: 11.5px; word-break: break-all; line-height: 1.3; }
  .finfo { font-size: 11px; color: var(--muted); }
  button.copy { margin-top: auto; padding: 4px 6px; font-size: 11px; cursor: pointer;
                background: transparent; color: var(--muted); border: 1px solid var(--border);
                border-radius: 5px; }
  button.copy:hover { color: var(--text); border-color: var(--accent); }
  button.copy.copied, #lb-copy.copied { color: #7fce7f; border-color: #7fce7f; }

  #lightbox { display: none; position: fixed; inset: 0; z-index: 50;
              background: rgba(8, 9, 12, .92); flex-direction: column;
              align-items: center; justify-content: center; gap: 12px; padding: 24px; }
  #lightbox.show { display: flex; }
  #lb-img { max-width: 92vw; max-height: 78vh; object-fit: contain; cursor: zoom-out;
            background: repeating-conic-gradient(#2e323c 0% 25%, #22252d 0% 50%) 0 0 / 22px 22px;
            border-radius: 6px; }
  body.light-tiles #lb-img {
    background: repeating-conic-gradient(#ffffff 0% 25%, #d4d4d4 0% 50%) 0 0 / 22px 22px; }
  #lb-name { font-size: 15px; font-weight: 600; }
  #lb-info { font-size: 12.5px; color: var(--muted); word-break: break-all; text-align: center; }
  #lb-copy { padding: 6px 14px; background: var(--panel2); color: var(--text);
             border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
  #lb-copy:hover { border-color: var(--accent); }
</style>

<header>
  <h1>Grim Reach — Asset-Browser</h1>
  <span class="total">${files.length} Dateien · ${mb(totalBytes)} · ${categories.length} Kategorien · Stand: ${generatedAt}</span>
  <input id="search" type="search" placeholder="Dateiname suchen …" autocomplete="off">
  <span id="search-count"></span>
  <button id="bg-toggle" type="button">Kachel-Hintergrund: Dunkel</button>
  <button id="expand-all" type="button">Alle aufklappen</button>
  <button id="collapse-all" type="button">Alle zuklappen</button>
</header>

<nav class="chips">
${navHtml}</nav>

<main>
${tilesHtml}</main>

<div id="lightbox">
  <img id="lb-img" alt="">
  <div id="lb-name"></div>
  <div id="lb-info"></div>
  <button id="lb-copy" type="button">Pfad kopieren</button>
</div>

<script>
${clientJs}
</script>
`;

fs.writeFileSync(OUT_FILE, html, 'utf8');

// ---------------------------------------------------------------------------
// Konsolen-Zusammenfassung
// ---------------------------------------------------------------------------

console.log('Asset-Browser generiert: ' + OUT_FILE);
console.log(files.length + ' Dateien, ' + mb(totalBytes) + ', ' + categories.length + ' Kategorien\n');
const pad = Math.max(...categories.map((c) => c.dir.length));
for (const cat of categories) {
  console.log(
    cat.dir.padEnd(pad + 2) +
    String(cat.list.length).padStart(5) + ' Dateien  ' +
    mb(cat.bytes).padStart(10)
  );
}
const noDims = files.filter((f) => !f.size && f.ext !== '.svg');
if (noDims.length) {
  console.log('\nWarnung: Maße nicht lesbar bei ' + noDims.length + ' Datei(en):');
  for (const f of noDims.slice(0, 20)) console.log('  - ' + f.rel);
}
