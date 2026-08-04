/* KONZEPT 2 — Trophäenwand: Render-Logik. Nutzt window.BESTIARY (data.js). Zonen-Köpfe sind
   klickbar und klappen wie im echten Bestiarium ein/aus (Default: Zonen ohne Funde zugeklappt). */
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

  function legendHtml() {
    return Object.entries(B.STATUS_META).map(([k, meta]) =>
      `<span class="lp-item" title="${esc(meta.desc)}">${meta.emoji} <b>${esc(meta.name)}</b></span>`
    ).join("");
  }

  function trophyHtml(mv) {
    const art = mv.known ? `<img src="${mv.img}" alt="${esc(mv.name)}" />` : `<span class="qmark">?</span>`;
    const statPlate = mv.known
      ? `<div class="stat-plate"><span>HP <b>${B.fmtNum(mv.hp)}</b></span><span>DMG <b>${B.fmtNum(mv.atk)}</b></span><span>DEF <b>${B.fmtNum(mv.def)}</b></span>${mv.regen ? `<span>Rgn <b>${B.fmtNum(mv.regen)}/s</b></span>` : ""}</div>`
      : "";
    const statusPlate = mv.known && (mv.resist.length || mv.inflict)
      ? `<div class="status-plate">${mv.resist.map((r) => `<span title="Immun: ${esc(B.STATUS_META[r].name)}">${B.STATUS_META[r].emoji}</span>`).join("")}${mv.inflict ? `<span title="Verursacht: ${esc(B.STATUS_META[mv.inflict].name)}">${B.STATUS_META[mv.inflict].emoji}</span>` : ""}</div>`
      : "";
    const gravures = mv.known && mv.ladder.length
      ? `<div class="gravure-row">${mv.ladder.map((l) => `<span class="${l.reached ? "reached" : ""}" title="${B.fmtNum(Math.min(mv.kills, l.threshold))}/${B.fmtNum(l.threshold)}">${l.reached ? "✓" : "○"}${B.fmtNum(l.threshold)}</span>`).join("")}</div>`
      : "";
    const pendants = mv.known && mv.loot.length
      ? `<div class="pendant-row">${mv.loot.map((d) => `<span class="pendant ${d.discovered ? "" : "undiscovered"}" title="${d.discovered ? esc(d.name) + " — " + d.pct : "Unentdeckt"}"><span class="chain"></span><img src="${d.img}" alt="" /></span>`).join("")}</div>`
      : "";
    // Defense-Badge ist kein Spoiler — steht immer da (s. echtes DefenseTypeBadge-JSDoc).
    const defenseBadge = `<div class="trophy-defense dt-${mv.defenseType}" title="${esc(mv.defenseDesc)}">${esc(mv.defenseName)}</div>`;
    // Jagd-Button + Stats/Anhänger nur bei bekannten Trophäen — Unbekanntes bietet real keinen
    // Direktstart (der läuft über die Kampf-Zonenauswahl, nicht übers Bestiarium).
    const body = mv.known
      ? `${statPlate}${statusPlate}${gravures}${pendants}
         <button class="hunt-btn" ${mv.fight.disabled ? "disabled" : ""}>${mv.fight.disabled ? "Gesperrt" : "Auf die Jagd ➤"}</button>
         ${mv.fight.disabled ? `<div class="hunt-note">${esc(mv.fight.reason)}</div>` : ""}`
      : `<div class="unknown-caption">Noch nicht erlegt.<br>Besiege dieses Wild, um<br>seine Trophäe aufzuhängen.</div>`;

    return `<div class="trophy ${mv.known ? "" : "unknown"}">
      <span class="nail"></span>
      <div class="trophy-medallion">
        ${art}
        <span class="lvl-tag">Lv ${mv.level}</span>
        ${mv.known && mv.enrage ? `<span class="enrage-tag" title="Wird wütend">😡</span>` : ""}
      </div>
      <div class="trophy-name">${mv.known ? esc(mv.name) : "???"}</div>
      ${defenseBadge}
      <div class="trophy-kills${mv.kills > 0 ? "" : " dim"}" title="Kills: ${mv.kills}">${mv.kills > 0 ? "⚔ × " + mv.killsLabel : "— unerlegt —"}</div>
      ${body}
    </div>`;
  }

  function zoneSectionHtml(zone, monsters) {
    const zoneMv = monsters.map((m) => B.computeMonsterView(m, stateKey));
    const discovered = zoneMv.filter((mv) => mv.known).length;
    const pct = Math.round((discovered / zoneMv.length) * 100);
    const locked = zoneMv.every((mv) => mv.zoneLocked);
    const isCollapsed = collapsed.has(zone.id);

    return `<section class="wall-section ${locked ? "locked" : ""}">
      <div class="zone-plank" data-zone="${zone.id}">
        <span class="zp-caret">${isCollapsed ? "▸" : "▾"}</span>
        <span class="zp-name">${esc(zone.name)}</span>
        <span class="zp-levels">Lv ${zone.levelMin}–${zone.levelMax}</span>
        <span class="zp-progress">${discovered}/${zoneMv.length} erlegt <span class="zp-bar"><span style="width:${pct}%"></span></span></span>
      </div>
      ${isCollapsed ? "" : `
        ${locked ? `<div class="rope-notice"><span class="lock-icon">🔒</span> Dieser Wandabschnitt bleibt leer, bis „${esc(zone.gate)}" abgeschlossen ist.</div>` : ""}
        <div class="trophy-grid">${zoneMv.map(trophyHtml).join("")}</div>
      `}
    </section>`;
  }

  function honorTrophyHtml(cv) {
    const art = cv.known ? `<img src="${cv.img}" alt="${esc(cv.name)}" />` : `<span class="qmark">?</span>`;
    return `<div class="trophy honor-trophy ${cv.known ? "" : "unknown"}">
      <span class="nail"></span>
      <div class="trophy-medallion">${art}${cv.baseLevel != null ? `<span class="lvl-tag">Lv ${cv.baseLevel}</span>` : ""}</div>
      <div class="trophy-name">${cv.known ? esc(cv.name) : "???"}</div>
      ${cv.known
        ? `<div class="honor-stats"><div><span>Sichtungen</span><b>${B.fmtNum(cv.sightings)}</b></div><div><span>Kills</span><b>${B.fmtNum(cv.kills)}</b></div><div><span>Unikate</span><b>${B.fmtNum(cv.uniques)}</b></div><div><span>Bester Kill</span><b>${cv.fastestLabel}</b></div></div>`
        : `<div class="unknown-caption">Gesichtet in ${esc(cv.zoneName)}</div>`}
    </div>`;
  }

  function render() {
    const st = B.STATES[stateKey];
    const monsters = B.MONSTERS.filter((m) => !onlyUndefeated || (st.kills[m.id] || 0) === 0);
    const defeatedCount = B.MONSTERS.filter((m) => (st.kills[m.id] || 0) > 0).length;
    const itemsCount = Object.keys(st.discovered).length;

    let bodyHtml;
    if (view === "monsters") {
      const byZone = B.ZONES.map((z) => ({ zone: z, monsters: monsters.filter((m) => m.zone === z.id) })).filter((g) => g.monsters.length > 0);
      bodyHtml = byZone.map((g) => zoneSectionHtml(g.zone, g.monsters)).join("");
    } else {
      const byZone = B.ZONES.map((z) => ({ zone: z, champions: B.CHAMPIONS.filter((c) => c.zone === z.id).map((c) => B.computeChampionView(c, stateKey)) })).filter((g) => g.champions.length > 0);
      bodyHtml = byZone.map((g) => `
        <section class="wall-section">
          <div class="zone-plank"><span class="zp-name">${esc(g.zone.name)} — Ehrenwand</span></div>
          <div class="trophy-grid">${g.champions.map(honorTrophyHtml).join("")}</div>
        </section>`).join("");
    }

    app.innerHTML = `
      <div class="hall-header">
        <div>
          <h1>Trophäenwand</h1>
          <div class="subtitle">Halle der Jagdtrophäen — ${esc(B.STATE_LABELS[stateKey])}</div>
        </div>
        <div class="hall-plates">
          <div class="hall-plate"><strong>${itemsCount}</strong><span>/${B.TOTAL_ITEM_CATALOG} Funde</span></div>
          <div class="hall-plate"><strong>${defeatedCount}</strong><span>/${B.MONSTERS.length} erlegt</span></div>
        </div>
      </div>
      <div class="hall-toolbar">
        <div class="tab-hooks">
          <button class="tab-hook ${view === "monsters" ? "active" : ""}" data-view="monsters">Trophäenwand</button>
          <button class="tab-hook ${view === "champions" ? "active" : ""}" data-view="champions">Ehrenwand (Champions)</button>
        </div>
        <button class="rope-toggle ${onlyUndefeated ? "active" : ""}" id="btn-filter">Nur Unbesiegte</button>
        ${view === "monsters" ? `<div class="legend-plate"><span class="lp-title">Statuseffekte:</span>${legendHtml()}</div>` : ""}
      </div>
      ${bodyHtml}
    `;

    app.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => { view = btn.dataset.view; render(); }));
    const filterBtn = document.getElementById("btn-filter");
    if (filterBtn) filterBtn.addEventListener("click", () => { onlyUndefeated = !onlyUndefeated; render(); });
    app.querySelectorAll(".zone-plank[data-zone]").forEach((el) => el.addEventListener("click", () => {
      const id = el.dataset.zone;
      if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id);
      render();
    }));
  }

  stateKey = window.StudioChrome.init({
    title: "Konzept 2 — Trophäenwand",
    subtitle: "Gerahmte Trophäen je Zonen-Abschnitt",
    onState: (key) => { stateKey = key; recomputeCollapsedDefaults(); render(); },
  });
})();
