#!/usr/bin/env node
// claude:2026-10-24T13:17:39+02:00 — Asset-Katalog: lokaler Server (nur eingebaute Node-Module).
// Liefert die Oberfläche, den Index, Dateien aus den freigegebenen Wurzeln (nur lesend), Git-Fassungen
// und verwaltet die Anfragen in requests.json (+ ANFRAGEN.md). Verändert nie ein Asset.
//
//   node tools/asset-katalog/server.mjs               Index aktualisieren (inkrementell) und Server starten
//   node tools/asset-katalog/server.mjs --open        … und Browser öffnen
//   node tools/asset-katalog/server.mjs --rebuild     Index komplett neu messen
//   node tools/asset-katalog/server.mjs --no-update   vorhandenen Index ohne Aktualisierung nutzen
//   node tools/asset-katalog/server.mjs --anfragen-md nur ANFRAGEN.md aus requests.json neu schreiben
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOTS, CACHE, REPO, loadIndex } from "./build-index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const PORT = Number(argVal("--port", 5430));
const HOST = "127.0.0.1";
const PUBLIC = path.join(HERE, "public");
const REQ_FILE = path.join(HERE, "requests.json");
const MD_FILE = path.join(HERE, "ANFRAGEN.md");
const ASSETS_REPO_PREFIX = "apps/client/src/renderer/assets/";

// claude:2026-10-24T13:17:39+02:00 — ausgelieferte Dateitypen (alles andere wird abgewiesen)
const MIME = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
const SERVE_ROOTS = {
  ...Object.fromEntries(Object.entries(ROOTS).map(([k, v]) => [k, v.dir])),
  thumb: path.join(CACHE, "thumbs"),
};

// ───────────────────────── Zeit + Anfragen ─────────────────────────
function isoLocal(d = new Date()) {
  // claude:2026-10-24T13:17:39+02:00 — ISO-8601 mit Zeitzonenversatz der lokalen Uhr (z. B. +02:00)
  const pad = (n) => String(Math.abs(n)).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`;
}
function readRequests() {
  try {
    const data = JSON.parse(fs.readFileSync(REQ_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeRequests(list) {
  const tmp = REQ_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + "\n");
  fs.renameSync(tmp, REQ_FILE);
  writeAnfragenMd(list);
}
const TYP_LABEL = { tauschen: "Tauschen", "neu-generieren": "Neu generieren", notiz: "Notiz" };
function fmtBytes(n) {
  if (!n && n !== 0) return "";
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
function writeAnfragenMd(list = readRequests()) {
  // claude:2026-10-24T13:17:39+02:00 — lesbare Fassung für Claude; Quelle der Wahrheit bleibt requests.json
  const open = list.filter((r) => r.status === "offen");
  const done = list.filter((r) => r.status !== "offen");
  const L = [];
  L.push("# Asset-Anfragen (Grim Reach)", "");
  L.push(`Erzeugt vom Asset-Katalog am ${isoLocal()}. Quelle der Wahrheit ist \`tools/asset-katalog/requests.json\`; diese Datei wird bei jedem Speichern neu geschrieben.`, "");
  L.push("Hinweise für die Abarbeitung im Hauptchat:");
  L.push("- Der Katalog hat nichts verändert. Tausch oder Neuguss erst nach den Projektregeln (natives Alpha, Dateiname = Content-ID, Bestandsnachbarn prüfen, alte Assets nie löschen, Original archivieren).");
  L.push("- Git-Fassungen holen: `git show <rev>:<pfad> > <ziel>` (nur lesend aus dem Verlauf).");
  L.push("- Erledigt: in requests.json `status` auf `erledigt` (oder `abgelehnt`) setzen und `node tools/asset-katalog/server.mjs --anfragen-md` ausführen.", "");
  L.push(`Offen: ${open.length} · Erledigt/abgelehnt: ${done.length}`, "");
  const block = (r, i) => {
    const short = (r.ziel || "").replace(ASSETS_REPO_PREFIX, "");
    L.push(`### ${i + 1}. ${TYP_LABEL[r.typ] || r.typ} · ${short}`);
    L.push(`- ID: \`${r.id}\` · Status: **${r.status}**`);
    L.push(`- Angelegt: ${r.zeitstempel}${r.geaendert && r.geaendert !== r.zeitstempel ? ` · geändert: ${r.geaendert}` : ""}`);
    L.push(`- Ziel: \`${r.ziel}\`${r.zielFehlt ? " (Datei existiert noch nicht, Content-Lücke)" : ""}`);
    const q = r.quelle;
    if (q?.art === "datei") L.push(`- Quelle: Datei \`${q.pfad}\` (${q.wurzel}${q.masse ? `, ${q.masse}` : ""}${q.bytes ? `, ${fmtBytes(q.bytes)}` : ""})`);
    else if (q?.art === "git")
      L.push(`- Quelle: Git-Fassung \`${q.rev.slice(0, 10)}\` vom ${q.datum || "?"} („${q.commit || ""}“), Pfad \`${q.pfad}\` → \`git show ${q.rev}:${q.pfad}\``);
    if (r.notiz) {
      L.push("- Notiz:");
      for (const line of String(r.notiz).split(/\r?\n/)) L.push(`  > ${line}`);
    }
    if (r.prompt?.text) {
      L.push(`- Prompt (${r.prompt.zuordnung || "frei"}${r.prompt.datei ? `, \`${r.prompt.datei}\`` : ""}):`);
      L.push("", "```text", r.prompt.text.replace(/```/g, "ˋˋˋ"), "```");
    }
    L.push("");
  };
  L.push("## Offen", "");
  if (!open.length) L.push("_Keine offenen Anfragen._", "");
  open.forEach(block);
  if (done.length) {
    L.push("## Erledigt / abgelehnt", "");
    done.forEach(block);
  }
  fs.writeFileSync(MD_FILE, L.join("\n"));
}

if (args.includes("--anfragen-md")) {
  writeAnfragenMd();
  console.log(`ANFRAGEN.md geschrieben (${readRequests().length} Einträge).`);
  process.exit(0);
}

// ───────────────────────── Index-Zustand ─────────────────────────
const S = { index: null, details: null, indexJson: null, blobs: new Set(), building: false, buildLog: [], buildError: null };
function adoptIndex() {
  const loaded = loadIndex();
  if (!loaded) return false;
  S.index = loaded.index;
  S.details = loaded.details;
  S.indexJson = JSON.stringify(loaded.index);
  S.blobs = new Set();
  for (const list of Object.values(loaded.details.git || {})) for (const v of list) S.blobs.add(v.blob);
  S.byRel = new Map(loaded.index.assets.map((a) => [a.rel, a]));
  S.gapById = new Map(loaded.index.gaps.map((g) => [g.id.toLowerCase(), g]));
  return true;
}
function startBuild(force = false) {
  if (S.building) return false;
  S.building = true;
  S.buildError = null;
  S.buildLog = [];
  const child = spawn(process.execPath, [path.join(HERE, "build-index.mjs"), ...(force ? ["--rebuild"] : [])], { cwd: REPO, windowsHide: true });
  const onData = (d) => {
    const text = d.toString();
    process.stdout.write(text);
    S.buildLog.push(...text.split(/\r?\n/).filter(Boolean));
    if (S.buildLog.length > 200) S.buildLog = S.buildLog.slice(-200);
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("close", (code) => {
    S.building = false;
    if (code !== 0) S.buildError = `Index-Erstellung beendet mit Status ${code}`;
    if (!adoptIndex() && !S.buildError) S.buildError = "Index konnte nicht geladen werden";
  });
  return true;
}

// ───────────────────────── HTTP-Hilfen ─────────────────────────
function send(res, code, body, type = "text/plain; charset=utf-8", extra = {}) {
  res.writeHead(code, { "Content-Type": type, "X-Content-Type-Options": "nosniff", ...extra });
  res.end(body);
}
const json = (res, code, data) => send(res, code, typeof data === "string" ? data : JSON.stringify(data), "application/json; charset=utf-8", { "Cache-Control": "no-store" });
function resolveInRoot(rootId, relPath) {
  // claude:2026-10-24T13:17:39+02:00 — Pfad-Traversal abfangen: nur Segmente ohne „..“, Laufwerk oder Backslash,
  // danach real aufgelöst und erneut gegen die Wurzel geprüft (auch gegen Verknüpfungen nach außen).
  const rootDir = SERVE_ROOTS[rootId];
  if (!rootDir || typeof relPath !== "string" || !relPath) return null;
  const segs = relPath.split("/");
  for (const s of segs) if (!s || s === "." || s === ".." || /[\\:\0]/.test(s)) return null;
  const rootAbs = path.resolve(rootDir);
  const abs = path.resolve(rootAbs, ...segs);
  if (!abs.startsWith(rootAbs + path.sep)) return null;
  try {
    const real = fs.realpathSync(abs);
    const realRoot = fs.realpathSync(rootAbs);
    if (!real.startsWith(realRoot + path.sep)) return null;
    if (!fs.statSync(real).isFile()) return null;
    return real;
  } catch {
    return null;
  }
}
function serveFile(req, res, abs, cache = "no-cache") {
  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext];
  if (!type) return send(res, 403, "Dateityp nicht freigegeben");
  const st = fs.statSync(abs);
  const etag = `"${st.size.toString(16)}-${Math.round(st.mtimeMs).toString(16)}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { ETag: etag });
    return res.end();
  }
  const headers = { "Content-Type": type, "Content-Length": st.size, ETag: etag, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" };
  // SVG aus Fremdquellen nicht als Dokument mit Skripten ausführen
  if (ext === ".svg") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'";
  res.writeHead(200, headers);
  fs.createReadStream(abs).pipe(res);
}
function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("zu groß"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ───────────────────────── Anfragen: Prüfen + Normalisieren ─────────────────────────
function normalizeSource(q) {
  if (!q) return null;
  if (q.art === "datei") {
    if (!["rt", "dl", "cxa", "cxw", "cxc"].includes(q.root)) throw new Error("Unbekannte Quellwurzel");
    const abs = resolveInRoot(q.root, q.rel);
    if (!abs) throw new Error("Quelldatei nicht gefunden oder nicht freigegeben");
    const st = fs.statSync(abs);
    return {
      art: "datei",
      pfad: abs,
      wurzel: ROOTS[q.root].label,
      root: q.root,
      rel: q.rel,
      masse: q.w && q.h ? `${q.w}x${q.h}` : null,
      bytes: st.size,
    };
  }
  if (q.art === "git") {
    if (!/^[0-9a-f]{40}$/.test(q.blob || "") || !S.blobs.has(q.blob)) throw new Error("Unbekannte Git-Fassung");
    if (!/^[0-9a-f]{40}$/.test(q.rev || "")) throw new Error("Ungültige Revision");
    if (typeof q.pfad !== "string" || !q.pfad.startsWith(ASSETS_REPO_PREFIX) || q.pfad.includes("..")) throw new Error("Ungültiger Git-Pfad");
    return { art: "git", rev: q.rev, pfad: q.pfad, blob: q.blob, datum: String(q.datum || "").slice(0, 40), commit: String(q.commit || "").slice(0, 200) };
  }
  throw new Error("Unbekannte Quellart");
}
function normalizePrompt(p) {
  if (!p || !p.text) return null;
  return {
    text: String(p.text).slice(0, 20000),
    datei: p.datei ? String(p.datei).slice(0, 500) : null,
    zuordnung: p.zuordnung ? String(p.zuordnung).slice(0, 40) : "frei",
  };
}
function validateTarget(ziel) {
  if (typeof ziel !== "string" || !ziel.startsWith(ASSETS_REPO_PREFIX) || ziel.includes("..")) throw new Error("Ungültiges Ziel");
  const rel = ziel.slice(ASSETS_REPO_PREFIX.length);
  if (S.byRel?.has(rel)) return { rel, fehlt: false, id: S.byRel.get(rel).id };
  const gap = S.index?.gaps.find((g) => g.expected === rel);
  if (gap) return { rel, fehlt: true, id: gap.id };
  throw new Error("Ziel ist weder ein Laufzeit-Asset noch eine Content-Lücke");
}
function buildEntry(body, prev) {
  const typ = body.typ ?? prev?.typ;
  if (!TYP_LABEL[typ]) throw new Error("Unbekannter Typ");
  const t = validateTarget(body.ziel ?? prev?.ziel);
  const quelle = body.quelle !== undefined ? normalizeSource(body.quelle) : prev?.quelle ?? null;
  const prompt = body.prompt !== undefined ? normalizePrompt(body.prompt) : prev?.prompt ?? null;
  const notiz = String(body.notiz ?? prev?.notiz ?? "").slice(0, 8000);
  if (typ === "tauschen" && !quelle) throw new Error("Tauschen braucht eine Quelle");
  if (typ === "notiz" && !notiz.trim()) throw new Error("Notiz ist leer");
  if (typ === "neu-generieren" && !notiz.trim() && !prompt) throw new Error("Bitte beschreiben, was neu generiert werden soll");
  const now = isoLocal();
  return {
    id: prev?.id ?? `anf-${now.slice(0, 19).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1-")}-${crypto.randomBytes(2).toString("hex")}`,
    zeitstempel: prev?.zeitstempel ?? now,
    geaendert: now,
    typ,
    ziel: ASSETS_REPO_PREFIX + t.rel,
    zielId: t.id,
    ...(t.fehlt ? { zielFehlt: true } : {}),
    quelle,
    prompt,
    notiz,
    status: prev?.status ?? "offen",
  };
}

// ───────────────────────── Routen ─────────────────────────
async function handle(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const p = url.pathname;

  // claude:2026-10-24T13:17:39+02:00 — nur lokale Aufrufe: Host prüfen (DNS-Rebinding), bei Schreibzugriffen Herkunft + JSON
  const host = (req.headers.host || "").toLowerCase();
  if (host !== `127.0.0.1:${PORT}` && host !== `localhost:${PORT}`) return send(res, 403, "Nur lokal erreichbar");
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.origin;
    if (origin && origin !== `http://127.0.0.1:${PORT}` && origin !== `http://localhost:${PORT}`) return send(res, 403, "Fremde Herkunft");
    if (req.method !== "DELETE" && !(req.headers["content-type"] || "").includes("application/json")) return send(res, 415, "JSON erwartet");
  }

  // Oberfläche
  if (req.method === "GET" && (p === "/" || p === "/index.html")) return serveFile(req, res, path.join(PUBLIC, "index.html"));
  if (req.method === "GET" && (p === "/app.js" || p === "/style.css")) return serveFile(req, res, path.join(PUBLIC, p.slice(1)));

  if (p === "/api/status" && req.method === "GET")
    return json(res, 200, { building: S.building, ready: !!S.index, builtAt: S.index?.builtAt ?? null, error: S.buildError, log: S.buildLog.slice(-12) });
  if (p === "/api/index" && req.method === "GET") return S.index ? json(res, 200, S.indexJson) : json(res, 503, { error: "Index wird erstellt", building: S.building });
  if (p === "/api/reindex" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    return json(res, 202, { started: startBuild(!!body.full), building: true });
  }

  if (p === "/api/detail" && req.method === "GET") {
    if (!S.index) return json(res, 503, { error: "Index wird erstellt" });
    const rel = url.searchParams.get("rel");
    const gid = (url.searchParams.get("id") || "").toLowerCase();
    const asset = rel ? S.byRel.get(rel) : null;
    const gap = !asset && gid ? S.gapById.get(gid) : null;
    if (!asset && !gap) return json(res, 404, { error: "Nicht gefunden" });
    const id = asset ? asset.id : gap.id.toLowerCase();
    const ziel = ASSETS_REPO_PREFIX + (asset ? asset.rel : gap.expected);
    return json(res, 200, {
      asset,
      gap,
      git: asset ? S.details.git[asset.rel] || [] : [],
      cands: (S.details.cands[id] || []).slice(0, 300),
      candsTotal: (S.details.cands[id] || []).length,
      prompts: S.details.prompts[id] || [],
      requests: readRequests().filter((r) => r.ziel === ziel),
    });
  }

  // Dateien aus den freigegebenen Wurzeln: /f/<wurzel>/<pfad>
  if (p.startsWith("/f/") && (req.method === "GET" || req.method === "HEAD")) {
    const rest = p.slice(3);
    const slash = rest.indexOf("/");
    if (slash < 0) return send(res, 400, "Pfad fehlt");
    let rel;
    try {
      rel = rest
        .slice(slash + 1)
        .split("/")
        .map((s) => decodeURIComponent(s))
        .join("/");
    } catch {
      return send(res, 400, "Ungültige Kodierung");
    }
    const abs = resolveInRoot(rest.slice(0, slash), rel);
    if (!abs) return send(res, 404, "Nicht gefunden oder außerhalb der freigegebenen Ordner");
    return serveFile(req, res, abs, rest.startsWith("thumb/") ? "max-age=86400" : "no-cache");
  }

  // Git-Fassung: /git/<blob>?name=<datei> — nur Fassungen aus dem Index
  if (p.startsWith("/git/") && req.method === "GET") {
    const sha = p.slice(5);
    if (!/^[0-9a-f]{40}$/.test(sha) || !S.blobs.has(sha)) return send(res, 404, "Unbekannte Fassung");
    const ext = path.extname(url.searchParams.get("name") || "").toLowerCase();
    const type = MIME[ext] && ext !== ".html" ? MIME[ext] : "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", ...(ext === ".svg" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}) });
    const child = spawn("git", ["cat-file", "blob", sha], { cwd: REPO, windowsHide: true });
    child.stdout.pipe(res);
    child.on("error", () => res.end());
    return;
  }

  // Anfragen
  if (p === "/api/requests" && req.method === "GET") return json(res, 200, readRequests());
  if (p === "/api/requests" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      const entry = buildEntry(body, null);
      const list = readRequests();
      list.push(entry);
      writeRequests(list);
      return json(res, 201, entry);
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }
  const m = p.match(/^\/api\/requests\/([a-z0-9-]+)$/);
  if (m && (req.method === "PUT" || req.method === "DELETE")) {
    const list = readRequests();
    const i = list.findIndex((r) => r.id === m[1]);
    if (i < 0) return json(res, 404, { error: "Anfrage nicht gefunden" });
    if (list[i].status !== "offen") return json(res, 409, { error: "Nur offene Anfragen dürfen geändert oder gelöscht werden" });
    if (req.method === "DELETE") {
      const [gone] = list.splice(i, 1);
      writeRequests(list);
      return json(res, 200, { deleted: gone.id });
    }
    try {
      const body = JSON.parse(await readBody(req));
      delete body.status;
      delete body.id;
      list[i] = buildEntry(body, list[i]);
      writeRequests(list);
      return json(res, 200, list[i]);
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  return send(res, 404, "Nicht gefunden");
}

// ───────────────────────── Start ─────────────────────────
const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) send(res, 500, "Interner Fehler");
    else res.end();
  });
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\nFEHLER: Port ${PORT} auf ${HOST} ist belegt. Läuft der Asset-Katalog schon? Dann einfach http://${HOST}:${PORT}/ öffnen.`);
    console.error("Sonst den anderen Prozess beenden oder mit --port <nummer> einen freien Port wählen (nicht 5420).");
  } else console.error(`FEHLER beim Start: ${e.message}`);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  console.log(`Asset-Katalog läuft auf ${url}  (beenden mit Strg+C)`);
  const had = adoptIndex();
  if (!had || !args.includes("--no-update")) startBuild(args.includes("--rebuild"));
  if (!fs.existsSync(MD_FILE)) writeAnfragenMd();
  if (args.includes("--open")) {
    const opener = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    spawn(opener[0], opener[1], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  }
});
