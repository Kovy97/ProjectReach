/* KONZEPT 4 — Reise durch den Reach: Render-Logik. Nutzt window.BESTIARY (data.js). */
(function () {
  const B = window.BESTIARY;
  const app = document.getElementById("app");

  let stateKey = "early";
  let view = "monsters";
  let onlyUndefeated = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function waypointHtml(mv) {
    const art = mv.known ? `<img src="${mv.img}" alt="${esc(mv.name)}" />` : `<span class="qmark">?</span>`;
    const drops = mv.known && mv.loot.length
      ? `<div class="wp-drops">${mv.loot.slice(0, 6).map((d) => `<span class="wp-drop ${d.discovered ? "" : "undiscovered"}" title="${d.discovered ? esc(d.name) + " — " + d.pct : "Unentdeckt"}"><img src="${d.img}" alt="" /></span>`).join("")}</div>`
      : "";
    const body = mv.known
      ? `${drops}<button class="wp-btn" ${mv.fight.disabled ? "disabled" : ""}>${mv.fight.disabled ? "Gesperrt" : "Zum Kampf"}</button>${mv.fight.disabled ? `<div class="wp-note">${esc(mv.fight.reason)}</div>` : ""}`
      : `<div class="wp-hint">Noch unentdeckt.</div>`;

    return `<div class="waypoint ${mv.known ? "" : "unknown"}">
      <div class="wp-art">${art}<span class="lvl">Lv ${mv.level}</span>${mv.known && mv.enrage ? `<span class="enrage" title="Wird wütend">😡</span>` : ""}</div>
      <div class="wp-body">
        <div class="wp-name">${mv.known ? esc(mv.name) : "???"}</div>
        <div class="wp-defense dt-${mv.defenseType}" title="${esc(mv.defenseDesc)}">${esc(mv.defenseName)}</div>
        <div class="wp-kills ${mv.kills > 0 ? "" : "dim"}" title="Kills: ${mv.kills}">${mv.kills > 0 ? "⚔ " + mv.killsLabel : "— kein Fund —"}</div>
        ${body}
      </div>
    </div>`;
  }

  function waypointChampHtml(cv) {
    const art = cv.known ? `<img src="${cv.img}" alt="${esc(cv.name)}" />` : `<span class="qmark">?</span>`;
    return `<div class="waypoint ${cv.known ? "" : "unknown"}">
      <div class="wp-art">${art}${cv.baseLevel != null ? `<span class="lvl">Lv ${cv.baseLevel}</span>` : ""}</div>
      <div class="wp-body">
        <div class="wp-name">${cv.known ? esc(cv.name) : "???"}</div>
        ${cv.known
          ? `<div class="wp-kills">⚔ ${B.fmtNum(cv.kills)} · 👁 ${B.fmtNum(cv.sightings)}</div><div class="wp-hint">Unikate: ${B.fmtNum(cv.uniques)} · Bester Kill: ${cv.fastestLabel}</div>`
          : `<div class="wp-hint">Gesichtet in ${esc(cv.zoneName)}</div>`}
      </div>
    </div>`;
  }

  function bandHtml(zone, items, kind) {
    const locked = kind === "monsters" ? items.every((mv) => mv.zoneLocked) : false;
    const discovered = items.filter((x) => x.known).length;
    const pct = items.length ? Math.round((discovered / items.length) * 100) : 0;
    const bg = B.zoneFull(zone.id);
    const cards = kind === "monsters" ? items.map(waypointHtml).join("") : items.map(waypointChampHtml).join("");

    return `<section class="zone-band ${locked ? "locked" : ""}" style="background-image:url('${bg}')">
      <div class="band-header">
        <h2>${esc(zone.name)}</h2>
        <div class="bh-meta">
          <span>Lv ${zone.levelMin}–${zone.levelMax}</span>
          <span>${discovered}/${items.length} entdeckt</span>
          <span class="bh-bar"><span style="width:${pct}%"></span></span>
        </div>
      </div>
      ${locked ? `<div class="band-locked-note">🔒 Der Weg hierher ist versperrt — erfordert „${esc(zone.gate)}".</div>` : ""}
      <div class="band-path">
        <div class="band-path-track">${cards}</div>
      </div>
      <div class="band-scroll-hint"></div>
    </section>`;
  }

  function render() {
    const st = B.STATES[stateKey];
    const monsters = B.MONSTERS.filter((m) => !onlyUndefeated || (st.kills[m.id] || 0) === 0);
    const defeatedCount = B.MONSTERS.filter((m) => (st.kills[m.id] || 0) > 0).length;
    const itemsCount = Object.keys(st.discovered).length;

    let bandsHtml;
    if (view === "monsters") {
      const byZone = B.ZONES.map((z) => ({ zone: z, items: monsters.filter((m) => m.zone === z.id).map((m) => B.computeMonsterView(m, stateKey)) })).filter((g) => g.items.length > 0);
      bandsHtml = byZone.map((g) => bandHtml(g.zone, g.items, "monsters")).join("");
    } else {
      const byZone = B.ZONES.map((z) => ({ zone: z, items: B.CHAMPIONS.filter((c) => c.zone === z.id).map((c) => B.computeChampionView(c, stateKey)) })).filter((g) => g.items.length > 0);
      bandsHtml = byZone.map((g) => bandHtml(g.zone, g.items, "champions")).join("");
    }

    app.innerHTML = `
      <div class="journey-head">
        <div class="jh-row">
          <div>
            <h1>Reise durch den Reach</h1>
            <div class="subtitle">Von den Weiden bis in die Tiefe — ${esc(B.STATE_LABELS[stateKey])}</div>
          </div>
          <div class="jh-seals">
            <div class="jh-seal"><b>${itemsCount}</b>/${B.TOTAL_ITEM_CATALOG} Funde</div>
            <div class="jh-seal"><b>${defeatedCount}</b>/${B.MONSTERS.length} bezwungen</div>
          </div>
        </div>
        <div class="jh-controls">
          <button class="jh-tab ${view === "monsters" ? "active" : ""}" data-view="monsters">Bestiarium</button>
          <button class="jh-tab ${view === "champions" ? "active" : ""}" data-view="champions">Champion-Kodex</button>
          <button class="jh-filter ${onlyUndefeated ? "active" : ""}" id="btn-filter">Nur Unbesiegte</button>
          ${view === "monsters" ? `<div class="jh-legend">${Object.entries(B.STATUS_META).map(([k, meta]) => `<span title="${esc(meta.desc)}">${meta.emoji} <b>${esc(meta.name)}</b></span>`).join("")}</div>` : ""}
        </div>
      </div>
      ${bandsHtml}
    `;

    app.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => { view = btn.dataset.view; render(); }));
    const filterBtn = document.getElementById("btn-filter");
    if (filterBtn) filterBtn.addEventListener("click", () => { onlyUndefeated = !onlyUndefeated; render(); });
  }

  stateKey = window.StudioChrome.init({
    title: "Konzept 4 — Reise durch den Reach",
    subtitle: "Zonen als Kulissen-Bänder",
    onState: (key) => { stateKey = key; render(); },
  });
})();
