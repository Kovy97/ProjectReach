/* KONZEPT 3 — Wardens Kodex: Master-Detail-Render-Logik. Nutzt window.BESTIARY (data.js). */
(function () {
  const B = window.BESTIARY;
  const app = document.getElementById("app");

  let stateKey = "early";
  let view = "monsters";
  let onlyUndefeated = false;
  let collapsed = new Set();
  let selectedId = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function recomputeCollapsedDefaults() {
    const st = B.STATES[stateKey];
    collapsed = new Set();
    for (const z of B.ZONES) {
      const anyDiscovered = B.MONSTERS.some((m) => m.zone === z.id && (st.kills[m.id] || 0) > 0);
      if (!anyDiscovered) collapsed.add(z.id);
    }
  }

  function fieldNote(mv) {
    const parts = [`Bekannt aus ${mv.zoneName}, Stufe ${mv.level}.`];
    const defAdj = { armor: "gepanzert", evasion: "flink und ausweichend", ward: "hinter einem Ward-Schild" }[mv.defenseType] || "unbekannt";
    parts.push(`Kämpft ${defAdj}.`);
    if (mv.inflict) parts.push(`Verursacht ${B.STATUS_META[mv.inflict].name} bei Treffern.`);
    if (mv.resist.length) parts.push(`Widersteht ${mv.resist.map((r) => B.STATUS_META[r].name).join(", ")}.`);
    if (mv.enrage) parts.push("Wird bei sinkendem Leben wütend.");
    if (mv.dungeonOnly) parts.push("Nur innerhalb eines Dungeon-Laufs anzutreffen.");
    return parts.join(" ");
  }

  function currentList() {
    const st = B.STATES[stateKey];
    if (view === "monsters") {
      return B.MONSTERS.filter((m) => !onlyUndefeated || (st.kills[m.id] || 0) === 0);
    }
    return B.CHAMPIONS;
  }

  function indexHtml() {
    const st = B.STATES[stateKey];
    const list = currentList();
    const byZone = B.ZONES.map((z) => ({ zone: z, items: list.filter((x) => x.zone === z.id) })).filter((g) => g.items.length > 0);

    return byZone.map((g) => {
      const total = (view === "monsters" ? B.MONSTERS : B.CHAMPIONS).filter((x) => x.zone === g.zone.id).length;
      const knownCount = view === "monsters"
        ? g.items.filter((m) => (st.kills[m.id] || 0) > 0).length
        : g.items.filter((c) => (st.champions[c.id]?.sightings || 0) > 0).length;
      const locked = view === "monsters" && !st.zonesUnlocked[g.zone.id];
      const isCollapsed = collapsed.has(g.zone.id);
      const pips = g.items.map((x) => {
        const filled = view === "monsters" ? (st.kills[x.id] || 0) > 0 : (st.champions[x.id]?.sightings || 0) > 0;
        return `<span class="idx-pip ${filled ? "filled" : ""}"></span>`;
      }).join("");

      const rows = isCollapsed ? "" : g.items.map((x) => {
        const known = view === "monsters" ? (st.kills[x.id] || 0) > 0 : (st.champions[x.id]?.sightings || 0) > 0;
        const thumb = known
          ? `<img src="${view === "monsters" ? B.monsterImg(x.id) : B.eliteImg(x.id, null)}" alt="" />`
          : "?";
        const killsLabel = view === "monsters" ? (st.kills[x.id] || 0) : (st.champions[x.id]?.kills || 0);
        return `<div class="idx-row ${known ? "" : "unknown"} ${x.id === selectedId ? "selected" : ""}" data-id="${x.id}">
          <span class="idx-thumb">${thumb}</span>
          <span class="idx-name">${known ? esc(x.name) : "???"}</span>
          <span class="idx-lvl">Lv ${view === "monsters" ? x.level : (x.baseLevel ?? "?")}</span>
          <span class="idx-kills">${known ? "⚔" + B.fmtNum(killsLabel) : ""}</span>
        </div>`;
      }).join("");

      return `<div class="idx-zone-head ${locked ? "locked" : ""}" data-zone="${g.zone.id}">
          <span class="iz-caret">${isCollapsed ? "▸" : "▾"}</span>
          <span class="iz-name">${esc(g.zone.name)}</span>
          ${locked ? `<span class="iz-lock" title="Erfordert: ${esc(g.zone.gate)}">🔒</span>` : ""}
          <div class="idx-pips">${pips}</div>
          <span class="iz-count">${knownCount}/${total}</span>
        </div>
        ${rows}`;
    }).join("");
  }

  function stageMonsterHtml(mv) {
    const art = mv.known ? `<img src="${mv.img}" alt="${esc(mv.name)}" />` : `<span class="qmark">?</span>`;
    const stats = mv.known ? `<div class="stage-stats">
        <div class="stage-stat"><div class="ss-label">HP</div><div class="ss-val">${B.fmtNum(mv.hp)}</div></div>
        <div class="stage-stat"><div class="ss-label">Schaden</div><div class="ss-val">${B.fmtNum(mv.atk)}</div></div>
        <div class="stage-stat"><div class="ss-label">Verteidigung</div><div class="ss-val">${B.fmtNum(mv.def)}</div></div>
        ${mv.regen ? `<div class="stage-stat"><div class="ss-label">Regen</div><div class="ss-val">${B.fmtNum(mv.regen)}/s</div></div>` : ""}
      </div>` : "";
    const statusRow = mv.known && (mv.resist.length || mv.inflict) ? `<div class="stage-status-row">
        ${mv.resist.map((r) => `<span class="st-item" title="${esc(B.STATUS_META[r].desc)}">${B.STATUS_META[r].emoji} Immun: ${esc(B.STATUS_META[r].name)}</span>`).join("")}
        ${mv.inflict ? `<span class="st-item" title="${esc(B.STATUS_META[mv.inflict].desc)}">${B.STATUS_META[mv.inflict].emoji} Verursacht: ${esc(B.STATUS_META[mv.inflict].name)}</span>` : ""}
      </div>` : "";
    const ladder = mv.known && mv.ladder.length ? `<div class="stage-ladder">${mv.ladder.map((l) => `<span class="${l.reached ? "reached" : ""}">${l.reached ? "✓" : "○"} ${B.fmtNum(l.threshold)} Kills</span>`).join("")}</div>` : "";
    const drops = mv.known && mv.loot.length ? `<div class="stage-drops">
        <div class="stage-drops-label">Beute</div>
        <div class="stage-drops-grid">${mv.loot.map((d) => `<div class="stage-drop ${d.discovered ? "" : "undiscovered"}">
            <img src="${d.img}" alt="" />
            <span class="sd-name">${d.discovered ? esc(d.name) : "Unentdeckt"}</span>
            ${d.discovered ? `<span class="sd-pct">${d.pct}</span>` : ""}
          </div>`).join("")}</div>
      </div>` : "";
    const fightBlock = mv.known
      ? `<button class="stage-fight-btn" ${mv.fight.disabled ? "disabled" : ""}>${mv.fight.disabled ? "Versperrt" : "Zum Kampf"}</button>
         ${mv.fight.disabled ? `<div class="stage-fight-note">${esc(mv.fight.reason)}</div>` : ""}`
      : `<p class="field-note">Noch nicht bezwungen. Besiege dieses Wesen im Kampf, damit sein Eintrag hier erscheint.</p>`;

    return `<div class="stage-grid">
      <div class="stage-art">
        ${art}
        <span class="lvl-badge">Lv ${mv.level}</span>
        ${mv.known && mv.enrage ? `<span class="enrage-badge" title="Wird wütend">😡</span>` : ""}
      </div>
      <div class="stage-info">
        <h2>${mv.known ? esc(mv.name) : "???"}</h2>
        <div class="zone-tag">Zone: <b>${esc(mv.zoneName)}</b> ${mv.known ? `· Kills: <b>${mv.killsLabel}</b>` : ""}</div>
        <div class="stage-defense dt-${mv.defenseType}" title="${esc(mv.defenseDesc)}">${esc(mv.defenseName)}</div>
        ${mv.known ? `<p class="field-note">${esc(fieldNote(mv))}</p>` : ""}
        ${stats}${statusRow}${ladder}${drops}
        ${fightBlock}
      </div>
    </div>`;
  }

  function stageChampionHtml(cv) {
    const art = cv.known ? `<img src="${cv.img}" alt="${esc(cv.name)}" />` : `<span class="qmark">?</span>`;
    return `<div class="stage-grid">
      <div class="stage-art">${art}${cv.baseLevel != null ? `<span class="lvl-badge">Lv ${cv.baseLevel}</span>` : ""}</div>
      <div class="stage-info">
        <h2>${cv.known ? esc(cv.name) : "???"}</h2>
        <div class="zone-tag">Zone: <b>${esc(cv.zoneName)}</b></div>
        <p class="field-note">${cv.known ? "Seltene, verstärkte Variante — ihre Beute fällt über den normalen Kampf-Loot, nicht als eigene Drop-Tafel." : `Gesichtet in ${esc(cv.zoneName)}. Noch nie erlegt oder noch nicht gesichtet.`}</p>
        ${cv.known ? `<div class="stage-champ-stats">
            <div class="stage-stat"><div class="ss-label">Sichtungen</div><div class="ss-val">${B.fmtNum(cv.sightings)}</div></div>
            <div class="stage-stat"><div class="ss-label">Kills</div><div class="ss-val">${B.fmtNum(cv.kills)}</div></div>
            <div class="stage-stat"><div class="ss-label">Unikate</div><div class="ss-val">${B.fmtNum(cv.uniques)}</div></div>
            <div class="stage-stat"><div class="ss-label">Bester Kill</div><div class="ss-val">${cv.fastestLabel}</div></div>
          </div>` : ""}
      </div>
    </div>`;
  }

  function render() {
    const st = B.STATES[stateKey];
    const defeatedCount = B.MONSTERS.filter((m) => (st.kills[m.id] || 0) > 0).length;
    const itemsCount = Object.keys(st.discovered).length;

    const list = currentList();
    if (!selectedId || !list.some((x) => x.id === selectedId)) {
      selectedId = list.length ? list[0].id : null;
    }

    let stageHtml = `<div class="stage-empty">Kein Eintrag gewählt.</div>`;
    if (selectedId) {
      if (view === "monsters") {
        const m = B.MONSTERS.find((x) => x.id === selectedId);
        if (m) stageHtml = stageMonsterHtml(B.computeMonsterView(m, stateKey));
      } else {
        const c = B.CHAMPIONS.find((x) => x.id === selectedId);
        if (c) stageHtml = stageChampionHtml(B.computeChampionView(c, stateKey));
      }
    }

    app.innerHTML = `
      <div class="kodex-top">
        <div class="kodex-top-row">
          <div>
            <h1>Wardens Kodex</h1>
            <div class="subtitle">Index &amp; Studien-Bühne — ${esc(B.STATE_LABELS[stateKey])}</div>
          </div>
          <div class="kodex-seals">
            <div class="seal-box"><b>${itemsCount}</b>/${B.TOTAL_ITEM_CATALOG} Funde</div>
            <div class="seal-box"><b>${defeatedCount}</b>/${B.MONSTERS.length} bezwungen</div>
          </div>
        </div>
        <div class="kodex-controls">
          <div class="kodex-tabs">
            <button class="kodex-tab ${view === "monsters" ? "active" : ""}" data-view="monsters">Bestiarium</button>
            <button class="kodex-tab ${view === "champions" ? "active" : ""}" data-view="champions">Champion-Kodex</button>
          </div>
          <button class="kodex-filter ${onlyUndefeated ? "active" : ""}" id="btn-filter">Nur Unbesiegte</button>
          ${view === "monsters" ? `<div class="kodex-legend">${Object.entries(B.STATUS_META).map(([k, meta]) => `<span title="${esc(meta.desc)}">${meta.emoji} <b>${esc(meta.name)}</b></span>`).join("")}</div>` : ""}
        </div>
      </div>
      <div class="kodex-shell">
        <div class="kodex-index">${indexHtml()}</div>
        <div class="kodex-stage">${stageHtml}</div>
      </div>
    `;

    app.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => { view = btn.dataset.view; selectedId = null; render(); }));
    const filterBtn = document.getElementById("btn-filter");
    if (filterBtn) filterBtn.addEventListener("click", () => { onlyUndefeated = !onlyUndefeated; render(); });
    app.querySelectorAll(".idx-zone-head[data-zone]").forEach((el) => el.addEventListener("click", () => {
      const id = el.dataset.zone;
      if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id);
      render();
    }));
    app.querySelectorAll(".idx-row[data-id]").forEach((el) => el.addEventListener("click", () => { selectedId = el.dataset.id; render(); }));
  }

  stateKey = window.StudioChrome.init({
    title: "Konzept 3 — Wardens Kodex",
    subtitle: "Index links, Studien-Bühne rechts",
    onState: (key) => { stateKey = key; recomputeCollapsedDefaults(); render(); },
  });
})();
