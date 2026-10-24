// claude:2026-10-24T13:21:53+02:00 — Asset-Katalog Grim Reach: Oberfläche (Raster, Filter, Detail, Vergleich,
// Lücken, Anfragen). Liest nur über den lokalen Server; Anfragen werden gespeichert, nie ausgeführt.
"use strict";

// ───────────────────────── Hilfen ─────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const enc = (rel) => rel.split("/").map(encodeURIComponent).join("/");
const PREFIX = "apps/client/src/renderer/assets/";
const fileUrl = (root, rel) => `/f/${root}/${enc(rel)}`;
const thumbUrl = (a) => (a.thumb ? `/f/thumb/${enc(a.rel)}.webp?v=${a.sha.slice(0, 8)}` : fileUrl("rt", a.rel));
const gitUrl = (v) => `/git/${v.blob}?name=${encodeURIComponent(v.path.split("/").pop())}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtBytes = (n) => (n == null ? "" : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "");
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem("ak:" + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("ak:" + k, JSON.stringify(v));
    } catch {
      /* Speicher nicht verfügbar: nur Komfort */
    }
  },
};
async function api(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) } });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data?.error || `${res.status} ${res.statusText}`);
  return data;
}
function toast(msg, err = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast" + (err ? " err" : "");
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 3200);
}

// ───────────────────────── Bezeichnungen ─────────────────────────
const FLAG = {
  schleier: { label: "Schleier", why: "Große, fast weiße, glatte Fläche im Objekt (z. B. milchiger Freistellungsrest). Helle Materialien wie Stahl oder Kristall können Fehlalarm sein." },
  schachbrett: { label: "Schachbrett", why: "Regelmäßiges Hell-Grau-Muster in hellen Flächen: vermutlich eingebackenes Transparenz-Schachbrett." },
  "kein-alpha": { label: "Kein Alpha", why: "Kein genutzter Alpha-Kanal, obwohl dieser Ordner freigestellte Bilder erwartet." },
  "deckende-raender": { label: "Deckende Ränder", why: "Bildrand oder Ecken sind deckend: Hintergrund vermutlich nicht freigestellt." },
  klein: { label: "Geringe Auflösung", why: "Lange Seite unter der Mindestgröße für diesen Ordner." },
  fehler: { label: "Lesefehler", why: "Bild konnte nicht gelesen werden." },
};
const HAS = {
  old: { label: "alte Git-Fassungen", test: (a) => a.gitOld > 0 },
  cand: { label: "abweichende Kandidaten", test: (a) => a.candsDistinct > 0 },
  newer: { label: "neuere Kandidaten", test: (a) => a.candsNewer > 0, why: "Kandidat ist jünger als das Laufzeitbild und nicht identisch" },
  prompt: { label: "Prompt gefunden", test: (a) => a.prompts > 0 },
  req: { label: "mit offener Anfrage", test: (a) => (S.reqByTarget.get(PREFIX + a.rel) || 0) > 0 },
  orphan: { label: "ohne Content-Zuordnung", test: (a) => !a.content && ["items", "monsters", "pets"].includes(a.group), why: "Bild in items/monsters/pets ohne passende Content-ID" },
  uncommitted: { label: "nicht committet", test: (a) => !a.committed, why: "Arbeitsstand weicht vom letzten Commit ab oder ist neu" },
};
const GROUP_ORDER = ["items", "monsters", "pets", "portraits", "icons", "skills", "sidebar", "actions", "camp", "battlescreens", "zones", "dungeons", "skill-backgrounds", "events", "blessings", "foraging-cards", "fx", "zonemaps", "tavern", "arena", "arena25d", "ui", "classic", "(wurzel)"];
// Spielgrößen für die Vorschau (px, lange Seite)
const GAME_SIZES = {
  items: [46, 96],
  monsters: [120, 260],
  pets: [64, 128],
  portraits: [96, 220],
  icons: [24, 48],
  skills: [32, 64],
  sidebar: [32, 64],
  actions: [96, 192],
  camp: [128, 256],
  battlescreens: [440, 880],
  zones: [440, 880],
  dungeons: [440, 880],
  "skill-backgrounds": [440, 880],
};
const MATCH_LABEL = { exakt: "exakt", ordner: "Ordnername", variante: "Namensvariante", aehnlich: "ähnlicher Name (ungenau)" };
const PROMPT_Q = { exakt: "exakt", ungenau: "ungenau", erwaehnt: "nur erwähnt" };
const TYP_LABEL = { tauschen: "Tauschen", "neu-generieren": "Neu generieren", notiz: "Notiz" };

// ───────────────────────── Zustand ─────────────────────────
const S = {
  index: null,
  assets: [],
  byRel: new Map(),
  rarityName: {},
  rarityOrder: [],
  requests: [],
  reqByTarget: new Map(),
  view: "raster",
  q: "",
  groups: new Set(),
  rar: new Set(),
  flags: new Set(),
  has: new Set(),
  sort: store.get("sort", "id"),
  bg: store.get("bg", "dark"),
  tile: store.get("tile", 150),
  filtered: [],
  detail: null,
  dbg: store.get("dbg", "dark"),
  gapKinds: new Set(),
  gapNoFb: false,
  gapWithCand: false,
  reqFilter: "offen",
  building: false,
};

// ───────────────────────── Start + Index ─────────────────────────
async function boot() {
  bindTop();
  for (;;) {
    let st;
    try {
      st = await api("/api/status");
    } catch {
      $("#boot").textContent = "Server nicht erreichbar. Läuft „node tools/asset-katalog/server.mjs“?";
      await sleep(2000);
      continue;
    }
    if (st.ready) break;
    $("#overlay").hidden = false;
    $("#overlay-log").textContent = (st.log || []).join("\n") || "Starte …";
    if (st.error) $("#overlay-log").textContent += `\n\nFEHLER: ${st.error}`;
    await sleep(1200);
  }
  $("#overlay").hidden = true;
  await loadIndex();
  await loadRequests();
  window.addEventListener("hashchange", () => route(false));
  route(true);
  pollBuild();
}
async function loadIndex() {
  const ix = await api("/api/index");
  S.index = ix;
  S.rarityOrder = (ix.rarities || []).map((r) => r.id);
  S.rarityName = Object.fromEntries((ix.rarities || []).map((r) => [r.id, r.name.de || r.name.en || r.id]));
  S.assets = ix.assets;
  for (const a of S.assets) {
    const c = a.content;
    a._hay = [a.rel, a.id, a.group, a.sub, c?.en, c?.de, c?.kind, c?.rarity, c ? S.rarityName[c.rarity] : "", c?.set, ...a.flags.map((f) => FLAG[f]?.label)].filter(Boolean).join(" ").toLowerCase();
  }
  S.byRel = new Map(S.assets.map((a) => [a.rel, a]));
  $("#count-raster").textContent = S.assets.length;
  $("#count-luecken").textContent = ix.gaps.length;
  setBuildInfo();
}
async function loadRequests() {
  S.requests = await api("/api/requests");
  S.reqByTarget = new Map();
  for (const r of S.requests) if (r.status === "offen") S.reqByTarget.set(r.ziel, (S.reqByTarget.get(r.ziel) || 0) + 1);
  const open = S.requests.filter((r) => r.status === "offen").length;
  $("#count-anfragen").textContent = open || "";
}
function setBuildInfo() {
  const el = $("#build-state");
  if (S.building) el.textContent = "Index wird aktualisiert …";
  else if (S.index) el.textContent = `Stand ${new Date(S.index.builtAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}`;
}
async function pollBuild() {
  // claude:2026-10-24T13:21:53+02:00 — läuft im Hintergrund eine Aktualisierung, danach Index neu laden
  for (;;) {
    try {
      const st = await api("/api/status");
      const was = S.building;
      S.building = st.building;
      if (was && !st.building) {
        if (st.error) toast(st.error, true);
        await loadIndex();
        toast("Index aktualisiert");
        route(true);
      }
      setBuildInfo();
    } catch {
      /* Server kurz weg */
    }
    await sleep(S.building ? 1500 : 6000);
  }
}
function bindTop() {
  $$(".tab").forEach((b) => b.addEventListener("click", () => (location.hash = "#/" + b.dataset.view)));
  const q = $("#q");
  q.addEventListener("input", () => {
    S.q = q.value.trim();
    if (S.view === "raster") renderMain();
    else if (S.view === "luecken") renderGaps();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && !$("#dlg").open) {
      e.preventDefault();
      q.focus();
    }
    if (!$("#detail").hidden && !$("#dlg").open && document.activeElement?.tagName !== "TEXTAREA") {
      if (e.key === "Escape") closeDetail();
      if (e.key === "ArrowRight") stepDetail(1);
      if (e.key === "ArrowLeft") stepDetail(-1);
    }
  });
  $("#btn-reindex").addEventListener("click", async () => {
    try {
      await api("/api/reindex", { method: "POST", body: "{}" });
      S.building = true;
      setBuildInfo();
      toast("Index-Aktualisierung gestartet");
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("#main").addEventListener("click", onMainClick);
  $("#sidebar").addEventListener("click", onSideClick);
  $("#sidebar").addEventListener("change", onSideChange);
}

// ───────────────────────── Routing ─────────────────────────
function route(refresh = false) {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [view, ...rest] = h.split("/");
  const arg = rest.join("/");
  if (view === "a" && arg) {
    if (S.view === "luecken" || S.view === "anfragen") {
      /* Hintergrundansicht bleibt */
    } else setView("raster", refresh);
    openDetail({ rel: arg });
    return;
  }
  if (view === "l" && arg) {
    if (S.view !== "anfragen") setView("luecken", refresh);
    openDetail({ id: arg });
    return;
  }
  closeDetail(true);
  setView(["raster", "luecken", "anfragen"].includes(view) ? view : "raster", refresh);
}
function setView(v, force) {
  if (S.view === v && !force && $("#main").dataset.view === v) return;
  S.view = v;
  $("#main").dataset.view = v;
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  renderSidebar();
  if (v === "raster") renderMain();
  else if (v === "luecken") renderGaps();
  else renderRequests();
}

// ───────────────────────── Seitenleiste ─────────────────────────
function countBy(list, fn) {
  const m = new Map();
  for (const x of list) for (const k of [].concat(fn(x))) if (k != null) m.set(k, (m.get(k) || 0) + 1);
  return m;
}
function sortGroups(keys) {
  return [...keys].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
}
function renderSidebar() {
  const side = $("#sidebar");
  if (S.view === "raster") {
    const g = countBy(S.assets, (a) => a.group);
    const r = countBy(S.assets, (a) => a.content?.rarity);
    const f = countBy(S.assets, (a) => a.flags);
    const anyFlag = S.assets.filter((a) => a.flags.length).length;
    side.innerHTML = `
      <div class="side-sec"><div class="side-title">Ordner</div>
        <button class="fopt ${S.groups.size ? "" : "on"}" data-act="group-all"><span>Alle Ordner</span><span class="n">${S.assets.length}</span></button>
        ${sortGroups(g.keys()).map((k) => `<button class="fopt ${S.groups.has(k) ? "on" : ""}" data-act="group" data-k="${esc(k)}"><span>${esc(k)}</span><span class="n">${g.get(k)}</span></button>`).join("")}
      </div>
      <div class="side-sec"><div class="side-title">QA-Markierungen</div>
        <button class="fopt ${S.flags.has("*") ? "on" : ""}" data-act="flag" data-k="*" title="Bilder mit mindestens einer Markierung"><span>irgendeine</span><span class="n">${anyFlag}</span></button>
        ${Object.keys(FLAG).filter((k) => f.get(k)).map((k) => `<button class="fopt ${S.flags.has(k) ? "on" : ""}" data-act="flag" data-k="${k}" title="${esc(FLAG[k].why)}"><span><span class="flag flag-${k}">${FLAG[k].label}</span></span><span class="n">${f.get(k)}</span></button>`).join("")}
        ${Object.keys(FLAG).filter((k) => !f.get(k) && k !== "fehler").map((k) => `<div class="fopt faint" title="${esc(FLAG[k].why)}"><span>${FLAG[k].label}</span><span class="n">0</span></div>`).join("")}
      </div>
      <div class="side-sec"><div class="side-title">Seltenheit</div><div class="chips">
        ${S.rarityOrder.filter((k) => r.get(k)).map((k) => `<button class="chip ${S.rar.has(k) ? "on" : ""}" data-act="rar" data-k="${k}"><span class="rar" style="background:var(--rar-${k})"></span>${esc(S.rarityName[k] || k)} <span class="faint">${r.get(k)}</span></button>`).join("")}
      </div></div>
      <div class="side-sec"><div class="side-title">Verlauf und Quellen</div>
        ${Object.entries(HAS).map(([k, h]) => `<div class="fopt" title="${esc(h.why || "")}"><label><input type="checkbox" data-act="has" data-k="${k}" ${S.has.has(k) ? "checked" : ""}>${h.label}</label><span class="n">${S.assets.filter(h.test).length}</span></div>`).join("")}
      </div>
      <div class="side-sec"><div class="side-title">Ansicht</div>
        <div class="side-row">Sortierung <select data-act="sort">
          ${[["id", "Ordner, dann ID"], ["datum", "zuletzt geändert"], ["groesse", "Dateigröße"], ["aufloesung", "Auflösung (klein zuerst)"], ["qa", "QA-Markierungen"], ["kandidaten", "Kandidaten (viele zuerst)"]].map(([v, l]) => `<option value="${v}" ${S.sort === v ? "selected" : ""}>${l}</option>`).join("")}
        </select></div>
        <div class="side-row">Kachel <input type="range" min="96" max="260" step="8" value="${S.tile}" data-act="tile"></div>
        <div class="side-row">Hintergrund <span class="seg">${bgSeg(S.bg, "bg")}</span></div>
        <div class="side-row"><button class="link-btn" data-act="reset">Alle Filter zurücksetzen</button></div>
      </div>
      <div class="side-sec faint" style="font-size:12px">Index: ${S.index.counts.assets} Laufzeit-Assets, ${S.index.counts.candidateFiles} Kandidaten-Dateien, ${S.index.counts.gitVersions} Git-Fassungen, ${S.index.counts.promptFiles} Prompt-Dateien.</div>`;
    document.body.classList.toggle("bg-light", S.bg === "light");
    document.body.classList.toggle("bg-checker", S.bg === "checker");
    document.documentElement.style.setProperty("--tile", S.tile + "px");
  } else if (S.view === "luecken") {
    const k = countBy(S.index.gaps, (g) => g.kind);
    side.innerHTML = `
      <div class="side-sec"><div class="side-title">Art</div><div class="chips">
        ${[...k.keys()].map((x) => `<button class="chip ${S.gapKinds.has(x) ? "on" : ""}" data-act="gapkind" data-k="${esc(x)}">${esc(x)} <span class="faint">${k.get(x)}</span></button>`).join("")}
      </div></div>
      <div class="side-sec"><div class="side-title">Filter</div>
        <div class="fopt"><label><input type="checkbox" data-act="gapnofb" ${S.gapNoFb ? "checked" : ""}>nur ohne Ersatzbild</label><span class="n">${S.index.gaps.filter((g) => !g.fallback).length}</span></div>
        <div class="fopt"><label><input type="checkbox" data-act="gapcand" ${S.gapWithCand ? "checked" : ""}>mit Kandidaten</label><span class="n">${S.index.gaps.filter((g) => g.cands).length}</span></div>
      </div>
      <div class="side-sec faint" style="font-size:12px">Content-IDs ohne eigene Bilddatei. „Ersatzbild“ heißt: das Spiel zeigt über einen Alias, die Raid-Normalfassung oder das Basis-Monster trotzdem ein Bild.</div>`;
  } else {
    side.innerHTML = `
      <div class="side-sec"><div class="side-title">Anzeigen</div>
        <span class="seg"><button data-act="reqf" data-k="offen" class="${S.reqFilter === "offen" ? "on" : ""}">Offen</button><button data-act="reqf" data-k="alle" class="${S.reqFilter === "alle" ? "on" : ""}">Alle</button></span>
      </div>
      <div class="side-sec faint" style="font-size:12px">Anfragen liegen in <code>tools/asset-katalog/requests.json</code>, lesbar in <code>ANFRAGEN.md</code>. Der Katalog führt nichts aus: Claude arbeitet die Liste im Hauptchat ab und setzt danach den Status.</div>`;
  }
}
function bgSeg(cur, act) {
  return [["dark", "Dunkel"], ["light", "Hell"], ["checker", "Schachbrett"]].map(([v, l]) => `<button data-act="${act}" data-k="${v}" class="${cur === v ? "on" : ""}">${l}</button>`).join("");
}
function onSideClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "INPUT" || b.tagName === "SELECT") return;
  const k = b.dataset.k;
  const toggle = (set) => (set.has(k) ? set.delete(k) : set.add(k));
  switch (b.dataset.act) {
    case "group-all":
      S.groups.clear();
      break;
    case "group":
      toggle(S.groups);
      break;
    case "flag":
      toggle(S.flags);
      break;
    case "rar":
      toggle(S.rar);
      break;
    case "bg":
      S.bg = k;
      store.set("bg", k);
      break;
    case "reset":
      S.groups.clear();
      S.flags.clear();
      S.rar.clear();
      S.has.clear();
      S.q = "";
      $("#q").value = "";
      break;
    case "gapkind":
      toggle(S.gapKinds);
      renderSidebar();
      return renderGaps();
    case "reqf":
      S.reqFilter = k;
      renderSidebar();
      return renderRequests();
    default:
      return;
  }
  renderSidebar();
  renderMain();
}
function onSideChange(e) {
  const t = e.target;
  switch (t.dataset.act) {
    case "has":
      t.checked ? S.has.add(t.dataset.k) : S.has.delete(t.dataset.k);
      return renderMain();
    case "sort":
      S.sort = t.value;
      store.set("sort", S.sort);
      return renderMain();
    case "tile":
      S.tile = +t.value;
      store.set("tile", S.tile);
      document.documentElement.style.setProperty("--tile", S.tile + "px");
      return;
    case "gapnofb":
      S.gapNoFb = t.checked;
      return renderGaps();
    case "gapcand":
      S.gapWithCand = t.checked;
      return renderGaps();
  }
}

// ───────────────────────── Raster ─────────────────────────
function applyFilters() {
  const toks = S.q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = S.assets.filter(
    (a) =>
      (!S.groups.size || S.groups.has(a.group)) &&
      (!S.rar.size || S.rar.has(a.content?.rarity)) &&
      (!S.flags.size || a.flags.some((f) => S.flags.has(f)) || (S.flags.has("*") && a.flags.length > 0)) &&
      [...S.has].every((k) => HAS[k].test(a)) &&
      toks.every((t) => a._hay.includes(t)),
  );
  const by = {
    id: (a, b) => a.rel.localeCompare(b.rel),
    datum: (a, b) => b.mtime - a.mtime,
    groesse: (a, b) => b.bytes - a.bytes,
    aufloesung: (a, b) => (a.w || 0) * (a.h || 0) - (b.w || 0) * (b.h || 0),
    qa: (a, b) => b.flags.length - a.flags.length || a.rel.localeCompare(b.rel),
    kandidaten: (a, b) => b.candsDistinct - a.candsDistinct || a.rel.localeCompare(b.rel),
  }[S.sort] || ((a, b) => a.rel.localeCompare(b.rel));
  list.sort(by);
  const groups = new Map();
  for (const a of list) {
    if (!groups.has(a.group)) groups.set(a.group, []);
    groups.get(a.group).push(a);
  }
  S.groupsShown = sortGroups(groups.keys()).map((k) => [k, groups.get(k)]);
  S.filtered = S.groupsShown.flatMap(([, l]) => l);
}
function tileHtml(a) {
  const c = a.content;
  const rar = c?.rarity ? `<span class="rar" style="background:var(--rar-${esc(c.rarity)})" title="${esc(S.rarityName[c.rarity] || c.rarity)}"></span>` : "";
  const flags = a.flags.map((f) => `<span class="flag flag-${f}" title="${esc(FLAG[f]?.why)}">${esc(FLAG[f]?.label || f)}</span>`).join("");
  const reqs = S.reqByTarget.get(PREFIX + a.rel) || 0;
  const inds = [
    a.gitOld ? `<span class="ind" title="${a.gitOld} alte Git-Fassung(en)">V${a.gitOld}</span>` : "",
    a.candsDistinct ? `<span class="ind ${a.candsNewer ? "ind-new" : ""}" title="${a.candsDistinct} abweichende Kandidaten${a.candsNewer ? `, davon ${a.candsNewer} jünger als das Laufzeitbild` : ""}">K${a.candsDistinct}</span>` : "",
    a.prompts ? `<span class="ind" title="${a.prompts} Prompt-Treffer">P</span>` : "",
    reqs ? `<span class="ind ind-req" title="${reqs} offene Anfrage(n)">A${reqs}</span>` : "",
  ].join("");
  const label = a.sub ? `${a.sub}/${a.id}` : a.id;
  return `<button class="tile" data-rel="${esc(a.rel)}" title="${esc(a.rel)}">
    <div class="tile-img"><img loading="lazy" decoding="async" src="${thumbUrl(a)}" alt=""><div class="tile-flags">${flags}</div><div class="tile-ind">${inds}</div></div>
    <div class="tile-id">${esc(label)}${a.ext !== "webp" ? ` <span class="faint">.${esc(a.ext)}</span>` : ""}</div>
    <div class="tile-name">${rar}${esc(c?.en || "")}</div>
    <div class="tile-meta"><span>${a.w ?? "?"}×${a.h ?? "?"}</span><span>${fmtBytes(a.bytes)}</span></div>
  </button>`;
}
function renderMain() {
  if (S.view !== "raster") return;
  applyFilters();
  const main = $("#main");
  const active = [...S.groups, ...S.flags, ...S.rar, ...S.has].length + (S.q ? 1 : 0);
  if (!S.filtered.length) {
    main.innerHTML = `<div class="empty-state">Keine Treffer. ${active ? `<button class="link-btn" data-act="reset-main">Filter zurücksetzen</button>` : ""}</div>`;
    return;
  }
  main.innerHTML =
    `<div class="result-bar"><span><b>${S.filtered.length}</b> von ${S.assets.length} Bildern</span>${active ? `<button class="link-btn" data-act="reset-main">Filter zurücksetzen</button>` : ""}</div>` +
    S.groupsShown.map(([g, list]) => `<section class="group"><div class="group-head"><h2>${esc(g)}</h2><span class="n">${list.length}</span></div><div class="grid">${list.map(tileHtml).join("")}</div></section>`).join("");
}
function onMainClick(e) {
  const t = e.target.closest(".tile");
  if (t) {
    location.hash = "#/a/" + encodeURIComponent(t.dataset.rel);
    return;
  }
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "reset-main") {
    S.groups.clear();
    S.flags.clear();
    S.rar.clear();
    S.has.clear();
    S.q = "";
    $("#q").value = "";
    renderSidebar();
    renderMain();
  } else if (act === "open-gap") location.hash = "#/l/" + encodeURIComponent(b.dataset.k);
  else if (act === "open-asset") location.hash = "#/a/" + encodeURIComponent(b.dataset.k);
  else if (act === "req-edit") editRequest(b.dataset.k);
  else if (act === "req-del") deleteRequest(b.dataset.k);
}

// ───────────────────────── Lücken ─────────────────────────
function renderGaps() {
  if (S.view !== "luecken") return;
  const toks = S.q.toLowerCase().split(/\s+/).filter(Boolean);
  const gaps = S.index.gaps.filter(
    (g) =>
      (!S.gapKinds.size || S.gapKinds.has(g.kind)) &&
      (!S.gapNoFb || !g.fallback) &&
      (!S.gapWithCand || g.cands > 0) &&
      toks.every((t) => `${g.id} ${g.en} ${g.de} ${g.kind} ${g.expected}`.toLowerCase().includes(t)),
  );
  const kinds = countBy(S.index.gaps, (g) => g.kind);
  const noFb = countBy(S.index.gaps.filter((g) => !g.fallback), (g) => g.kind);
  $("#main").innerHTML = `
    <div class="summary">
      <div class="stat"><b>${S.index.gaps.length}</b><span>Content-IDs ohne Bild</span></div>
      <div class="stat"><b>${S.index.counts.gapsWithoutFallback}</b><span>davon ohne Ersatzbild</span></div>
      ${[...kinds.keys()].map((k) => `<div class="stat"><b>${kinds.get(k)}</b><span>${esc(k)} (ohne Ersatz: ${noFb.get(k) || 0})</span></div>`).join("")}
    </div>
    <div class="result-bar"><span><b>${gaps.length}</b> Einträge</span></div>
    <table class="table"><thead><tr><th>Art</th><th>ID</th><th>Name</th><th>Erwartete Datei</th><th>Ersatzbild</th><th>Kandidaten</th><th>Prompts</th><th></th></tr></thead><tbody>
    ${gaps
      .map(
        (g) => `<tr>
        <td>${esc(g.kind)}</td>
        <td class="mono">${g.rarity ? `<span class="rar" style="background:var(--rar-${esc(g.rarity)})"></span>` : ""}${esc(g.id)}</td>
        <td>${esc(g.en)}<div class="faint">${esc(g.de)}</div></td>
        <td class="mono faint">${esc(g.expected)}</td>
        <td>${g.fallback ? esc(g.fallback) : `<span class="faint">keins</span>`}</td>
        <td>${g.cands || `<span class="faint">0</span>`}</td>
        <td>${g.prompts || `<span class="faint">0</span>`}</td>
        <td><button class="btn btn-quiet btn-sm" data-act="open-gap" data-k="${esc(g.id)}">Ansehen</button></td>
      </tr>`,
      )
      .join("")}
    </tbody></table>`;
}

// ───────────────────────── Detailansicht ─────────────────────────
async function openDetail({ rel, id }) {
  const det = $("#detail");
  det.hidden = false;
  document.body.style.overflow = "hidden";
  det.innerHTML = `<div class="empty-state">Lade …</div>`;
  try {
    const d = await api(rel ? `/api/detail?rel=${encodeURIComponent(rel)}` : `/api/detail?id=${encodeURIComponent(id)}`);
    S.detail = { ...d, cmp: null, showSame: false, onlyExact: false, fit: true };
    S.detail.items = compareItems(d);
    renderDetail();
    det.scrollTop = 0;
  } catch (e) {
    det.innerHTML = `<div class="d-top"><button class="btn btn-quiet" data-act="close">Zurück</button></div><div class="empty-state">${esc(e.message)}</div>`;
    det.onclick = (ev) => ev.target.closest("[data-act=close]") && closeDetail();
  }
}
function closeDetail(silent) {
  const det = $("#detail");
  if (det.hidden) return;
  det.hidden = true;
  det.innerHTML = "";
  document.body.style.overflow = "";
  S.detail = null;
  if (!silent) history.replaceState(null, "", "#/" + S.view);
}
function stepDetail(dir) {
  const d = S.detail;
  if (!d?.asset || !S.filtered.length) return;
  const i = S.filtered.findIndex((a) => a.rel === d.asset.rel);
  const next = S.filtered[(i + dir + S.filtered.length) % S.filtered.length];
  if (next) location.hash = "#/a/" + encodeURIComponent(next.rel);
}
function rootLabel(r) {
  return S.index.roots[r]?.label || r;
}
function compareItems(d) {
  // claude:2026-10-24T13:21:53+02:00 — eine Liste für Vergleich und Tauschquelle: aktuell, Git-Fassungen, Kandidaten;
  // offensichtlich gleiche Kandidaten (Größe + Maße) werden zusammengefasst
  const items = [];
  const a = d.asset;
  if (a) items.push({ key: "cur", kind: "aktuell", url: fileUrl("rt", a.rel), label: "Aktuell (Laufzeit)", sub: a.rel, meta: `${a.w}×${a.h} · ${fmtBytes(a.bytes)} · ${fmtDate(a.mtime)}`, current: true });
  for (const v of d.git) {
    items.push({
      key: "g:" + v.blob,
      kind: "git",
      url: gitUrl(v),
      label: `Git · ${v.date.slice(0, 10)}`,
      sub: v.subject,
      meta: `${v.rev.slice(0, 8)} · ${v.path.replace(PREFIX, "")}${v.commits > 1 ? ` · in ${v.commits} Commits` : ""}`,
      same: !!v.current,
      src: { art: "git", rev: v.rev, blob: v.blob, pfad: v.path, datum: v.date.slice(0, 10), commit: v.subject },
    });
  }
  const seen = new Map();
  for (const c of d.cands) {
    const dupKey = c.sha ? "s:" + c.sha : `${c.b}|${c.w}|${c.h}`;
    if (seen.has(dupKey)) {
      seen.get(dupKey).dups.push(`${rootLabel(c.r)}/${c.p}`);
      continue;
    }
    const it = {
      key: `c:${c.r}:${c.p}`,
      kind: "cand",
      url: fileUrl(c.r, c.p),
      label: rootLabel(c.r),
      sub: c.p,
      meta: `${c.w ?? "?"}×${c.h ?? "?"} · ${fmtBytes(c.b)} · ${fmtDate(c.m)}`,
      match: c.k,
      same: !!(a && c.sha && c.sha === a.sha),
      newer: !!(a && c.m > a.mtime && !(c.sha && c.sha === a.sha)),
      dups: [],
      src: { art: "datei", root: c.r, rel: c.p, w: c.w, h: c.h },
    };
    seen.set(dupKey, it);
    items.push(it);
  }
  return items;
}
function sizesHtml(url, group, label) {
  const sizes = GAME_SIZES[group] || [64, 128];
  return `<div class="sizes">${label ? `<span class="faint" style="align-self:center;min-width:90px">${esc(label)}</span>` : ""}${sizes
    .map(
      (s) => `<div class="size-item"><div class="size-pair">
        <div class="size-box" title="dunkel"><img src="${url}" style="max-width:${s}px;max-height:${s}px" alt=""></div>
        <div class="size-box light" title="hell"><img src="${url}" style="max-width:${s}px;max-height:${s}px" alt=""></div>
      </div>${s} px</div>`,
    )
    .join("")}</div>`;
}
function renderDetail() {
  const d = S.detail;
  if (!d) return;
  const a = d.asset;
  const g = d.gap;
  const c = a?.content || (g ? { kind: g.kind, en: g.en, de: g.de, rarity: g.rarity } : null);
  const group = a ? a.group : g.expected.split("/")[0];
  const ziel = PREFIX + (a ? a.rel : g.expected);
  const idx = a ? S.filtered.findIndex((x) => x.rel === a.rel) : -1;
  const cmp = d.cmp ? d.items.find((x) => x.key === d.cmp) : null;
  const visible = d.items.filter((x) => x.kind !== "cand" || ((d.showSame || !x.same) && (!d.onlyExact || x.match === "exakt")));
  const hiddenSame = d.items.filter((x) => x.kind === "cand" && x.same).length;
  const candN = d.items.filter((x) => x.kind === "cand").length;
  const gitN = d.items.filter((x) => x.kind === "git").length;
  const title = a ? a.id : g.id;

  $("#detail").innerHTML = `
  <div class="d-top">
    <button class="btn btn-quiet" data-act="close" title="Esc">Zurück</button>
    <div class="d-title"><h1>${esc(c?.en || title)}</h1><div class="sub mono">${esc(a ? a.rel : g.expected + " (fehlt)")}</div></div>
    ${a && idx >= 0 ? `<span class="faint">${idx + 1} / ${S.filtered.length}</span><button class="btn btn-quiet btn-sm" data-act="prev" title="Pfeil links">‹</button><button class="btn btn-quiet btn-sm" data-act="next" title="Pfeil rechts">›</button>` : ""}
    <button class="btn btn-quiet btn-sm" data-act="copy" data-k="${esc(ziel)}">Pfad kopieren</button>
  </div>
  <div class="d-body">
    <div class="stage-wrap stage-bg-${S.dbg}">
      <div class="stage-tools">
        Hintergrund <span class="seg">${bgSeg(S.dbg, "dbg")}</span>
        Größe <span class="seg"><button data-act="fit" data-k="1" class="${d.fit ? "on" : ""}">Einpassen</button><button data-act="fit" data-k="0" class="${d.fit ? "" : "on"}">100 %</button></span>
        ${cmp ? `<button class="btn btn-quiet btn-sm" data-act="cmp-close">Vergleich schließen</button>` : `<span class="faint">Zum Vergleichen unten eine Fassung anklicken.</span>`}
      </div>
      <div class="stage ${cmp ? "split" : ""}">
        <div class="pane">
          <div class="pane-label"><b>${a ? "Aktuell" : "Kein Bild vorhanden"}</b><span>${a ? `${a.w}×${a.h} · ${fmtBytes(a.bytes)}` : ""}</span></div>
          <div class="pane-img ${d.fit ? "" : "actual"} ${a ? "" : "empty"}">${a ? `<img src="${fileUrl("rt", a.rel)}" alt="">` : "Content-Lücke"}</div>
        </div>
        ${cmp ? `<div class="pane"><div class="pane-label"><b>${esc(cmp.label)}</b><span>${esc(cmp.meta)}</span></div><div class="pane-img ${d.fit ? "" : "actual"}"><img src="${cmp.url}" alt=""></div><div class="faint mono" style="font-size:11.5px;overflow-wrap:anywhere">${esc(cmp.sub || "")}</div></div>` : ""}
      </div>
      ${a ? sizesHtml(fileUrl("rt", a.rel), group, cmp ? "Aktuell" : "") : ""}
      ${cmp ? sizesHtml(cmp.url, group, "Vergleich") : ""}
    </div>
    <div class="info">
      <div class="card"><h3>Anfragen</h3>
        <div class="actions">
          <button class="btn" data-act="req-new" data-k="tauschen" ${d.items.some((x) => x.src && !x.same) ? "" : "disabled title='Keine alternative Fassung gefunden'"}>${a ? "Tauschen gegen …" : "Einbinden aus …"}</button>
          <button class="btn" data-act="req-new" data-k="neu-generieren">Neu generieren</button>
          <button class="btn btn-quiet" data-act="req-new" data-k="notiz">Notiz</button>
        </div>
        ${d.requests.length ? `<div style="margin-top:10px">${d.requests.map(reqMiniHtml).join("")}</div>` : `<div class="faint" style="margin-top:8px;font-size:12.5px">Noch keine Anfrage zu diesem Bild.</div>`}
      </div>
      <div class="card"><h3>Datei</h3><dl class="kv">
        <dt>Ziel</dt><dd class="mono">${esc(ziel)}</dd>
        ${a ? `<dt>Maße</dt><dd>${a.w}×${a.h} px</dd><dt>Größe</dt><dd>${fmtBytes(a.bytes)}</dd><dt>Geändert</dt><dd>${fmtDate(a.mtime)}</dd><dt>Alpha</dt><dd>${esc(a.qa?.alpha || "-")}</dd><dt>Git</dt><dd>${a.committed ? "entspricht einem Commit" : "nicht committet / weicht ab"}${a.gitOld ? ` · ${a.gitOld} alte Fassung(en)` : ""}</dd>` : `<dt>Status</dt><dd>fehlt${g.fallback ? ` · Spiel zeigt ${esc(g.fallback)}` : ""}</dd>`}
      </dl></div>
      ${c ? `<div class="card"><h3>Content</h3><dl class="kv">
        <dt>Art</dt><dd>${esc(c.kind)}</dd>
        <dt>Name EN</dt><dd>${esc(c.en)}</dd>
        <dt>Name DE</dt><dd>${esc(c.de)}</dd>
        ${c.rarity ? `<dt>Seltenheit</dt><dd><span class="rar" style="background:var(--rar-${esc(c.rarity)})"></span>${esc(S.rarityName[c.rarity] || c.rarity)}</dd>` : ""}
        ${c.slot ? `<dt>Slot</dt><dd>${esc(c.slot)}</dd>` : ""}
        ${c.type ? `<dt>Typ</dt><dd>${esc(c.type)}</dd>` : ""}
        ${c.set ? `<dt>Set</dt><dd>${esc(c.set)}</dd>` : ""}
        ${c.variantOf ? `<dt>Variante von</dt><dd class="mono">${esc(c.variantOf)}</dd>` : ""}
        ${c.zone ? `<dt>Zone</dt><dd class="mono">${esc(c.zone)}</dd>` : ""}
        ${c.base ? `<dt>Basis-Monster</dt><dd class="mono">${esc(c.base)}</dd>` : ""}
      </dl></div>` : a ? `<div class="card"><h3>Content</h3><div class="faint">Keine Content-Zuordnung für diesen Ordner/Namen.</div></div>` : ""}
      ${a ? qaHtml(a) : ""}
    </div>
  </div>
  <div class="section">
    <div class="section-head"><h2>Vergleich</h2>
      <span class="hint">${gitN} Git-Fassung(en) · ${candN} Kandidat(en)${d.candsTotal > d.cands.length ? ` (erste ${d.cands.length} von ${d.candsTotal})` : ""}</span>
      ${hiddenSame ? `<label class="hint"><input type="checkbox" data-act="showsame" ${d.showSame ? "checked" : ""}> identische zeigen (${hiddenSame})</label>` : ""}
      <label class="hint"><input type="checkbox" data-act="onlyexact" ${d.onlyExact ? "checked" : ""}> nur exakte Namenstreffer</label>
    </div>
    <div class="cmp-grid stage-bg-${S.dbg}">${visible.map(cmpHtml).join("") || `<div class="faint">Keine Fassungen gefunden.</div>`}</div>
  </div>
  <div class="section">
    <div class="section-head"><h2>Prompts</h2><span class="hint">${d.prompts.length ? `${d.prompts.length} Treffer in CODEX` : "Kein Prompt gefunden"}</span></div>
    ${d.prompts.map((p, i) => promptHtml(p, i)).join("")}
  </div>`;
  $("#detail").onclick = onDetailClick;
  $("#detail").onchange = onDetailChange;
}
function qaHtml(a) {
  const q = a.qa;
  if (!q) return `<div class="card"><h3>QA</h3><div class="faint">${a.ext === "svg" ? "Vektorgrafik, keine Bildmetriken." : "Keine Messwerte."}</div></div>`;
  const items = a.flags.map((f) => `<div class="qa-item"><span class="flag flag-${f}">${esc(FLAG[f]?.label || f)}</span><span class="why">${esc(FLAG[f]?.why || "")}</span></div>`).join("");
  const raw = [
    q.error ? `Fehler: ${q.error}` : "",
    q.alpha ? `Alpha: ${q.alpha}` : "",
    q.transparent != null ? `transparent ${(q.transparent * 100).toFixed(1)} %, Rand deckend ${(q.edgeOpaque * 100).toFixed(1)} %, Ecken deckend ${q.cornersOpaque}/4` : "",
    q.veil ? `Schleier: Fläche ${(q.veil.frac * 100).toFixed(2)} % (ab ${(S.index.qa.veilFrac * 100).toFixed(1)} %), Kontrast ${q.veil.con} (ab ${S.index.qa.veilCon})` : "",
    q.checker ? `Schachbrett: Gipfel ${q.checker.peak} (ab ${S.index.qa.checkerPeak}), Abstand ${q.checker.prom} (ab ${S.index.qa.checkerProm}), Diagonale ${q.checker.diag ?? "-"} (ab ${S.index.qa.checkerDiag}), Feld ${q.checker.s} px` : "",
  ]
    .filter(Boolean)
    .join("<br>");
  return `<div class="card"><h3>QA-Markierungen</h3>${items || `<div class="faint">Keine Markierung.</div>`}<div class="qa-raw">${raw}</div></div>`;
}
function cmpHtml(x) {
  const d = S.detail;
  const tags = [
    x.kind === "git" ? `<span class="tag tag-git">Git</span>` : "",
    x.kind === "aktuell" ? `<span class="tag tag-same">aktuell</span>` : "",
    x.match ? `<span class="tag tag-${x.match}">${MATCH_LABEL[x.match]}</span>` : "",
    x.same ? `<span class="tag tag-same">= aktuell</span>` : "",
    x.newer ? `<span class="tag tag-new">neuer</span>` : "",
  ].join("");
  const dups = x.dups?.length ? `<div class="cmp-meta" title="${esc(x.dups.join("\n"))}">+ ${x.dups.length} gleiche Datei(en) an anderem Ort</div>` : "";
  return `<div class="cmp ${d.cmp === x.key ? "sel" : ""} ${x.current ? "current" : ""}">
    <button class="cmp-img" data-act="cmp" data-k="${esc(x.key)}" title="Groß vergleichen"><img loading="lazy" decoding="async" src="${x.url}" alt=""></button>
    <div>${tags}</div>
    <div class="cmp-label">${esc(x.label)}</div>
    <div class="cmp-meta mono" title="${esc(x.sub || "")}">${esc(x.sub || "")}</div>
    <div class="cmp-meta">${esc(x.meta)}</div>${dups}
    <div class="cmp-btns">
      ${!x.current ? `<button class="btn btn-quiet btn-sm" data-act="cmp" data-k="${esc(x.key)}">Vergleichen</button>` : ""}
      ${x.src && !x.same ? `<button class="btn btn-sm" data-act="swap-from" data-k="${esc(x.key)}">Als Tauschquelle</button>` : ""}
    </div>
  </div>`;
}
function promptHtml(p, i) {
  return `<details class="prompt" ${i === 0 && p.q === "exakt" ? "open" : ""}>
    <summary><span class="tag tag-${p.q}">${PROMPT_Q[p.q] || p.q}</span><b>${esc(p.h)}</b><span class="path">${esc(rootLabel(p.r))}/${esc(p.p)}</span></summary>
    <pre>${esc(p.t)}</pre>
    <div class="p-actions"><button class="btn btn-quiet btn-sm" data-act="prompt-use" data-k="${i}">Für „Neu generieren“ übernehmen</button> <a href="${fileUrl(p.r, p.p)}" target="_blank" rel="noopener">Datei öffnen</a></div>
  </details>`;
}
function reqMiniHtml(r) {
  return `<div class="req-mini"><span class="badge badge-${r.typ}">${TYP_LABEL[r.typ] || r.typ}</span><span class="badge ${r.status === "offen" ? "badge-offen" : ""}">${esc(r.status)}</span>
    <span class="faint">${esc(r.zeitstempel.slice(0, 16).replace("T", " "))}</span>
    ${r.notiz ? `<div style="white-space:pre-wrap;margin-top:4px">${esc(r.notiz)}</div>` : ""}
    ${r.quelle ? `<div class="faint mono" style="font-size:11.5px;overflow-wrap:anywhere">Quelle: ${esc(r.quelle.art === "git" ? `Git ${r.quelle.rev.slice(0, 8)} · ${r.quelle.pfad}` : r.quelle.pfad)}</div>` : ""}
    ${r.status === "offen" ? `<div style="margin-top:6px;display:flex;gap:6px"><button class="btn btn-quiet btn-sm" data-act="req-edit" data-k="${esc(r.id)}">Bearbeiten</button><button class="btn btn-danger btn-sm" data-act="req-del" data-k="${esc(r.id)}">Löschen</button></div>` : ""}
  </div>`;
}
function onDetailClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const d = S.detail;
  const k = b.dataset.k;
  switch (b.dataset.act) {
    case "close":
      return closeDetail();
    case "prev":
      return stepDetail(-1);
    case "next":
      return stepDetail(1);
    case "copy":
      navigator.clipboard?.writeText(k).then(() => toast("Pfad kopiert"), () => toast(k));
      return;
    case "dbg":
      S.dbg = k;
      store.set("dbg", k);
      return renderDetail();
    case "fit":
      d.fit = k === "1";
      return renderDetail();
    case "cmp":
      d.cmp = d.cmp === k || k === "cur" ? null : k;
      renderDetail();
      $("#detail").scrollTo({ top: 0, behavior: "smooth" });
      return;
    case "cmp-close":
      d.cmp = null;
      return renderDetail();
    case "swap-from":
      return requestDialog("tauschen", { preselect: k });
    case "req-new":
      return requestDialog(k, {});
    case "prompt-use":
      return requestDialog("neu-generieren", { promptIndex: +k });
    case "req-edit":
      return editRequest(k);
    case "req-del":
      return deleteRequest(k);
  }
}
function onDetailChange(e) {
  const t = e.target;
  if (t.dataset.act === "showsame") S.detail.showSame = t.checked;
  else if (t.dataset.act === "onlyexact") S.detail.onlyExact = t.checked;
  else return;
  renderDetail();
}

// ───────────────────────── Anfragen: Dialoge ─────────────────────────
function requestDialog(typ, { preselect = null, promptIndex = null, existing = null } = {}) {
  // claude:2026-10-24T13:21:53+02:00 — Anfrage anlegen/bearbeiten; gespeichert wird nur der Wunsch, nichts wird getauscht
  const d = S.detail;
  if (!d) return;
  const ziel = PREFIX + (d.asset ? d.asset.rel : d.gap.expected);
  const dlg = $("#dlg");
  const sources = d.items.filter((x) => x.src && !x.same);
  let selKey = preselect;
  if (existing?.quelle) {
    const q = existing.quelle;
    selKey = q.art === "git" ? "g:" + q.blob : `c:${q.root}:${q.rel}`;
  }
  const head = `${existing ? "Anfrage bearbeiten" : "Neue Anfrage"} · ${TYP_LABEL[typ]}`;
  let body = `<div class="target-line">Ziel: ${esc(ziel)}${d.asset ? "" : " (fehlt noch)"}</div>`;
  if (typ === "tauschen") {
    body += `<div><label class="lbl">Quelle wählen (${sources.length})</label><div class="pick-grid stage-bg-${S.dbg}">
      ${sources.map((x) => `<button type="button" class="pick ${selKey === x.key ? "sel" : ""}" data-key="${esc(x.key)}" title="${esc((x.sub || "") + "\n" + x.meta)}"><div class="cmp-img"><img loading="lazy" src="${x.url}" alt=""></div><div class="cmp-label">${esc(x.label)}</div><div class="cmp-meta">${esc(x.meta)}</div>${x.match ? `<div><span class="tag tag-${x.match}">${MATCH_LABEL[x.match]}</span></div>` : ""}</button>`).join("")}
    </div></div>
    <div><label class="lbl" for="f-notiz">Notiz (optional)</label><textarea id="f-notiz" placeholder="z. B. Original von Juni ist schärfer, bitte freistellen und als WebP einbinden">${esc(existing?.notiz || "")}</textarea></div>`;
  } else if (typ === "neu-generieren") {
    const pi = promptIndex ?? (existing ? -1 : d.prompts.findIndex((p) => p.q === "exakt"));
    const ptext = existing?.prompt?.text ?? (pi >= 0 ? d.prompts[pi].t : "");
    body += `<div><label class="lbl" for="f-notiz">Was soll anders werden?</label><textarea id="f-notiz" placeholder="z. B. milchigen Schleier im Ring entfernen, sonst gleiche Form und Farben">${esc(existing?.notiz || "")}</textarea></div>
    <div><label class="lbl" for="f-psel">Vorhandener Prompt</label><select id="f-psel"><option value="-1">— ohne vorhandenen Prompt —</option>
      ${d.prompts.map((p, i) => `<option value="${i}" ${i === pi ? "selected" : ""}>[${PROMPT_Q[p.q]}] ${esc(p.h)} · ${esc(rootLabel(p.r))}/${esc(p.p)}</option>`).join("")}
    </select></div>
    <div><label class="lbl" for="f-ptext">Prompt-Text (wird mitgespeichert, darf angepasst werden)</label><textarea id="f-ptext" class="prompt-text">${esc(ptext)}</textarea></div>`;
  } else {
    body += `<div><label class="lbl" for="f-notiz">Notiz</label><textarea id="f-notiz" placeholder="Beobachtung oder Wunsch zu diesem Bild">${esc(existing?.notiz || "")}</textarea></div>`;
  }
  dlg.innerHTML = `<form method="dialog"><div class="dlg-head">${esc(head)}</div><div class="dlg-body">${body}</div>
    <div class="dlg-foot"><span class="err" id="f-err"></span><button type="button" class="btn btn-quiet" data-act="cancel">Abbrechen</button><button type="submit" class="btn" id="f-save">Anfrage speichern</button></div></form>`;
  dlg.showModal();
  const promptOrig = { i: null, text: null };
  if (typ === "neu-generieren") {
    const sel = $("#f-psel", dlg);
    const ta = $("#f-ptext", dlg);
    promptOrig.i = +sel.value;
    promptOrig.text = ta.value;
    sel.addEventListener("change", () => {
      const i = +sel.value;
      ta.value = i >= 0 ? d.prompts[i].t : "";
      promptOrig.i = i;
      promptOrig.text = ta.value;
    });
  }
  dlg.onclick = (e) => {
    const p = e.target.closest(".pick");
    if (p) {
      selKey = p.dataset.key;
      $$(".pick", dlg).forEach((x) => x.classList.toggle("sel", x === p));
    }
    if (e.target.closest("[data-act=cancel]")) dlg.close();
  };
  $("form", dlg).onsubmit = async (e) => {
    e.preventDefault();
    const payload = { typ, ziel, notiz: $("#f-notiz", dlg)?.value ?? "" };
    if (typ === "tauschen") {
      const src = sources.find((x) => x.key === selKey);
      if (!src) return ($("#f-err", dlg).textContent = "Bitte eine Quelle auswählen.");
      payload.quelle = src.src;
    } else if (typ === "neu-generieren") {
      const text = $("#f-ptext", dlg).value.trim();
      const i = +$("#f-psel", dlg).value;
      if (text) {
        const p = i >= 0 ? d.prompts[i] : null;
        payload.prompt = {
          text,
          datei: p ? `${rootLabel(p.r)}/${p.p}` : existing?.prompt?.datei || null,
          zuordnung: p ? PROMPT_Q[p.q] + (text !== promptOrig.text.trim() ? ", angepasst" : "") : existing?.prompt?.zuordnung || "frei",
        };
      } else payload.prompt = null;
    }
    try {
      $("#f-save", dlg).disabled = true;
      if (existing) await api(`/api/requests/${existing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/requests", { method: "POST", body: JSON.stringify(payload) });
      dlg.close();
      toast(existing ? "Anfrage geändert" : "Anfrage gespeichert");
      await afterRequestChange();
    } catch (err) {
      $("#f-err", dlg).textContent = err.message;
      $("#f-save", dlg).disabled = false;
    }
  };
}
async function afterRequestChange() {
  await loadRequests();
  if (S.detail) {
    const ziel = PREFIX + (S.detail.asset ? S.detail.asset.rel : S.detail.gap.expected);
    S.detail.requests = S.requests.filter((r) => r.ziel === ziel);
    renderDetail();
  }
  if (S.view === "anfragen") renderRequests();
  else if (S.view === "raster") renderMain();
}
async function editRequest(id) {
  const r = S.requests.find((x) => x.id === id);
  if (!r) return;
  const rel = r.ziel.replace(PREFIX, "");
  if (!S.detail || (S.detail.asset ? S.detail.asset.rel : S.detail.gap.expected) !== rel) {
    if (S.byRel.has(rel)) await openDetail({ rel });
    else await openDetail({ id: r.zielId });
  }
  requestDialog(r.typ, { existing: r });
}
async function deleteRequest(id) {
  const r = S.requests.find((x) => x.id === id);
  if (!r || !confirm(`Anfrage „${TYP_LABEL[r.typ]}“ für ${r.ziel.replace(PREFIX, "")} löschen?`)) return;
  try {
    await api(`/api/requests/${id}`, { method: "DELETE" });
    toast("Anfrage gelöscht");
    await afterRequestChange();
  } catch (e) {
    toast(e.message, true);
  }
}

// ───────────────────────── Anfragenliste ─────────────────────────
function renderRequests() {
  if (S.view !== "anfragen") return;
  const list = S.requests.filter((r) => S.reqFilter === "alle" || r.status === "offen").slice().reverse();
  const open = S.requests.filter((r) => r.status === "offen").length;
  $("#main").innerHTML = `
    <div class="summary"><div class="stat"><b>${open}</b><span>offen</span></div><div class="stat"><b>${S.requests.length - open}</b><span>erledigt / abgelehnt</span></div></div>
    ${list.length ? list.map(reqHtml).join("") : `<div class="empty-state">${S.reqFilter === "offen" ? "Keine offenen Anfragen. In der Detailansicht eines Bildes lassen sich Tausch, Neuguss oder Notizen anlegen." : "Noch keine Anfragen."}</div>`}`;
}
function reqHtml(r) {
  const rel = r.ziel.replace(PREFIX, "");
  const a = S.byRel.get(rel);
  const q = r.quelle;
  const srcUrl = q ? (q.art === "git" ? `/git/${q.blob}?name=${encodeURIComponent(q.pfad.split("/").pop())}` : q.root && q.rel ? fileUrl(q.root, q.rel) : null) : null;
  const openAct = a ? `data-act="open-asset" data-k="${esc(rel)}"` : `data-act="open-gap" data-k="${esc(r.zielId)}"`;
  return `<div class="req ${r.status === "offen" ? "" : "done"}">
    <div class="req-thumbs"><div class="req-thumb">${a ? `<img src="${thumbUrl(a)}" alt="">` : `<span class="faint">fehlt</span>`}</div>${srcUrl ? `<div class="req-thumb src" title="Quelle"><img loading="lazy" src="${srcUrl}" alt=""></div>` : ""}</div>
    <div>
      <h4><span class="badge badge-${r.typ}">${TYP_LABEL[r.typ] || r.typ}</span>${esc(rel)}</h4>
      <div class="line faint">${esc(r.id)} · angelegt ${esc(r.zeitstempel)}${r.geaendert && r.geaendert !== r.zeitstempel ? ` · geändert ${esc(r.geaendert)}` : ""} · Status <b>${esc(r.status)}</b></div>
      ${q ? `<div class="line">Quelle: <span class="mono">${esc(q.art === "git" ? `Git ${q.rev.slice(0, 10)} (${q.datum}) ${q.pfad}` : q.pfad)}</span>${q.masse ? ` <span class="faint">${esc(q.masse)}</span>` : ""}</div>` : ""}
      ${r.notiz ? `<div class="note">${esc(r.notiz)}</div>` : ""}
      ${r.prompt?.text ? `<details class="prompt"><summary><span class="tag">${esc(r.prompt.zuordnung || "frei")}</span>Prompt${r.prompt.datei ? ` <span class="path">${esc(r.prompt.datei)}</span>` : ""}</summary><pre>${esc(r.prompt.text)}</pre></details>` : ""}
    </div>
    <div class="req-btns">
      <button class="btn btn-quiet btn-sm" ${openAct}>Öffnen</button>
      ${r.status === "offen" ? `<button class="btn btn-quiet btn-sm" data-act="req-edit" data-k="${esc(r.id)}">Bearbeiten</button><button class="btn btn-danger btn-sm" data-act="req-del" data-k="${esc(r.id)}">Löschen</button>` : ""}
    </div>
  </div>`;
}

boot();
