/* KONZEPT 5 — Archiv der Asche: Render-Logik. Nutzt window.BESTIARY (data.js). Zonen sind
   Schubladen (klickbar, Default: Schubladen ohne Funde geschlossen), Inhalt = Karteikarten-Raster. */
(function () {
  const B = window.BESTIARY;
  const app = document.getElementById("app");

  let stateKey = "early";
  let view = "monsters";
  let onlyUndefeated = false;
  let collapsed = new Set();

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function recomputeCollapsedDefaults() {
    const st = B.STATES[stateKey];
    collapsed = new Set();
    for (const z of B.ZONES) {
      const anyDiscovered = B.MONSTERS.some((m) => m.zone === z.id && (st.kills[m.id] || 0) > 0);
      if (!anyDiscovered) collapsed.add(z.id);
    }
  }

  function indexCardHtml(mv) {
    const art = mv.known ? `<img src="${mv.img}" alt="${esc(mv.name)}" />` : `<span class="qmark">?</span>`;
    const sigil = mv.known ? `<div class="ic-sigil" title="Verzeichnet">✓</div>` : "";
    const statsRow = mv.known ? `<div class="ic-stats"><span>HP <b>${B.fmtNum(mv.hp)}</b></span><span>DMG <b>${B.fmtNum(mv.atk)}</b></span><span>DEF <b>${B.fmtNum(mv.def)}</b></span></div>` : "";
    const statusRow = mv.known && (mv.resist.length || mv.inflict) ? `<div class="ic-status">${mv.resist.map((r) => `<span title="Immun: ${esc(B.STATUS_META[r].name)}">${B.STATUS_META[r].emoji}</span>`).join("")}${mv.inflict ? `<span title="Verursacht: ${esc(B.STATUS_META[mv.inflict].name)}">${B.STATUS_META[mv.inflict].emoji}</span>` : ""}</div>` : "";
    const ladder = mv.known && mv.ladder.length ? `<div class="ic-ladder">${mv.ladder.map((l) => `<span class="${l.reached ? "reached" : ""}">${l.reached ? "✓" : "○"}${B.fmtNum(l.threshold)}</span>`).join("")}</div>` : "";
    const drops = mv.known && mv.loot.length ? `<div class="ic-drops">${mv.loot.map((d) => `<span class="ic-drop ${d.discovered ? "" : "undiscovered"}" title="${d.discovered ? esc(d.name) + " — " + d.pct : "Unentdeckt"}"><img src="${d.img}" alt="" /></span>`).join("")}</div>` : "";
    const body = mv.known
      ? `${statsRow}${statusRow}${ladder}${drops}
         <button class="ic-btn" ${mv.fight.disabled ? "disabled" : ""}>${mv.fight.disabled ? "Gesperrt" : "Kämpfen"}</button>
         ${mv.fight.disabled ? `<div class="ic-note">${esc(mv.fight.reason)}</div>` : ""}`
      : `<div class="ic-hint">Noch nicht verzeichnet.</div>`;

    return `<div class="index-card">
      <span class="ic-tab-lvl">Lv ${mv.level}</span>
      ${sigil}
      <div class="ic-head">
        <div class="ic-portrait">${art}</div>
        <div class="ic-head-text">
          <div class="ic-name">${mv.known ? esc(mv.name) : "???"}</div>
          <div class="ic-defense dt-${mv.defenseType}" title="${esc(mv.defenseDesc)}">${esc(mv.defenseName)}</div>
          <div class="ic-kills">Kills: <b>${mv.killsLabel}</b></div>
        </div>
      </div>
      ${body}
    </div>`;
  }

  function championCardHtml(cv) {
    const art = cv.known ? `<img src="${cv.img}" alt="${esc(cv.name)}" />` : `<span class="qmark">?</span>`;
    return `<div class="index-card honor">
      <span class="ic-tab-lvl">Lv ${cv.baseLevel ?? "?"}</span>
      ${cv.known ? `<div class="ic-sigil" title="Gesichtet">✓</div>` : ""}
      <div class="ic-head">
        <div class="ic-portrait">${art}</div>
        <div class="ic-head-text">
          <div class="ic-name">${cv.known ? esc(cv.name) : "???"}</div>
          <div class="ic-kills">${cv.known ? `Sichtungen: <b>${B.fmtNum(cv.sightings)}</b>` : `In ${esc(cv.zoneName)}`}</div>
        </div>
      </div>
      ${cv.known
        ? `<div class="ic-stats"><span>Kills <b>${B.fmtNum(cv.kills)}</b></span><span>Unikate <b>${B.fmtNum(cv.uniques)}</b></span><span>Bester <b>${cv.fastestLabel}</b></span></div>`
        : `<div class="ic-hint">Noch nicht gesichtet.</div>`}
    </div>`;
  }

  function drawerHtml(zone, items, kind) {
    const total = items.length;
    const known = kind === "monsters" ? items.filter((mv) => mv.known).length : items.filter((cv) => cv.known).length;
    const pct = total ? Math.round((known / total) * 100) : 0;
    const locked = kind === "monsters" && items.every((mv) => mv.zoneLocked);
    const isCollapsed = collapsed.has(zone.id);
    const cards = kind === "monsters" ? items.map(indexCardHtml).join("") : items.map(championCardHtml).join("");

    return `<div class="drawer-unit">
      <div class="drawer-front ${locked ? "locked" : ""}" data-zone="${zone.id}">
        <span class="df-caret">${isCollapsed ? "▸" : "▾"}</span>
        <span class="df-handle"></span>
        <span class="df-label">${esc(zone.name)}</span>
        <span class="df-levels">Lv ${zone.levelMin}–${zone.levelMax}</span>
        ${locked ? `<span class="df-lock" title="Erfordert: ${esc(zone.gate)}">🔒</span>` : ""}
        <div class="df-seal" style="--pct:${pct}"><span>${known}/${total}</span></div>
      </div>
      ${isCollapsed ? "" : `<div class="drawer-contents">
        ${locked ? `<div class="drawer-locked-note">Diese Schublade bleibt versiegelt, bis „${esc(zone.gate)}" abgeschlossen ist.</div>` : ""}
        <div class="card-grid">${cards}</div>
      </div>`}
    </div>`;
  }

  function render() {
    const st = B.STATES[stateKey];
    const monsters = B.MONSTERS.filter((m) => !onlyUndefeated || (st.kills[m.id] || 0) === 0);
    const defeatedCount = B.MONSTERS.filter((m) => (st.kills[m.id] || 0) > 0).length;
    const itemsCount = Object.keys(st.discovered).length;

    let cabinetHtml;
    if (view === "monsters") {
      const byZone = B.ZONES.map((z) => ({ zone: z, items: monsters.filter((m) => m.zone === z.id).map((m) => B.computeMonsterView(m, stateKey)) })).filter((g) => g.items.length > 0);
      cabinetHtml = byZone.map((g) => drawerHtml(g.zone, g.items, "monsters")).join("");
    } else {
      const byZone = B.ZONES.map((z) => ({ zone: z, items: B.CHAMPIONS.filter((c) => c.zone === z.id).map((c) => B.computeChampionView(c, stateKey)) })).filter((g) => g.items.length > 0);
      cabinetHtml = byZone.map((g) => drawerHtml(g.zone, g.items, "champions")).join("");
    }

    app.innerHTML = `
      <div class="archive-head">
        <div>
          <h1>Archiv der Asche</h1>
          <div class="subtitle">Karteikatalog des Reach — ${esc(B.STATE_LABELS[stateKey])}</div>
        </div>
        <div class="archive-stamps">
          <div class="a-stamp"><strong>${itemsCount}</strong><span>/${B.TOTAL_ITEM_CATALOG} Funde</span></div>
          <div class="a-stamp"><strong>${defeatedCount}</strong><span>/${B.MONSTERS.length} verzeichnet</span></div>
        </div>
      </div>
      <div class="archive-toolbar">
        <button class="a-tab ${view === "monsters" ? "active" : ""}" data-view="monsters">Bestiarium</button>
        <button class="a-tab ${view === "champions" ? "active" : ""}" data-view="champions">Champion-Kodex</button>
        <button class="a-filter ${onlyUndefeated ? "active" : ""}" id="btn-filter">Nur Unbesiegte</button>
        ${view === "monsters" ? `<div class="a-legend">${Object.entries(B.STATUS_META).map(([k, meta]) => `<span title="${esc(meta.desc)}">${meta.emoji} <b>${esc(meta.name)}</b></span>`).join("")}</div>` : ""}
      </div>
      <div class="cabinet">${cabinetHtml}</div>
    `;

    app.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => { view = btn.dataset.view; render(); }));
    const filterBtn = document.getElementById("btn-filter");
    if (filterBtn) filterBtn.addEventListener("click", () => { onlyUndefeated = !onlyUndefeated; render(); });
    app.querySelectorAll(".drawer-front[data-zone]").forEach((el) => el.addEventListener("click", () => {
      const id = el.dataset.zone;
      if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id);
      render();
    }));
  }

  stateKey = window.StudioChrome.init({
    title: "Konzept 5 — Archiv der Asche",
    subtitle: "Zonen als Karteikatalog-Schubladen",
    onState: (key) => { stateKey = key; recomputeCollapsedDefaults(); render(); },
  });
})();
