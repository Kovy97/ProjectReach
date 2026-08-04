/* KONZEPT 1 — Jäger-Journal: Render-Logik. Nutzt window.BESTIARY (data.js) als einzige
   Datenquelle; bildet exakt den BestiaryPage.tsx-Funktionsumfang ab (Zonen-Gruppierung, Tabs,
   Nur-Unbesiegte-Filter, Status-Legende, Kill-/Drop-Discovery, Sperr-/Dungeon-Hinweise). */
(function () {
  const B = window.BESTIARY;
  const app = document.getElementById("app");

  let stateKey = "early";
  let view = "monsters"; // "monsters" | "champions"
  let onlyUndefeated = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function statusLegendHtml() {
    return Object.entries(B.STATUS_META).map(([key, meta]) =>
      `<span class="ln-item" title="${esc(meta.desc)}">${meta.emoji} <b>${esc(meta.name)}</b></span>`
    ).join("");
  }

  function entryHtml(mv) {
    const artInner = mv.known
      ? `<img src="${mv.img}" alt="${esc(mv.name)}" />`
      : `<span class="qmark">?</span>`;

    const statRow = mv.known
      ? `<div class="stat-row"><span>HP <b>${B.fmtNum(mv.hp)}</b></span><span>DMG <b>${B.fmtNum(mv.atk)}</b></span><span>DEF <b>${B.fmtNum(mv.def)}</b></span>${mv.regen ? `<span>Regen <b>${B.fmtNum(mv.regen)}/s</b></span>` : ""}</div>`
      : "";

    const statusRow = mv.known && (mv.resist.length || mv.inflict)
      ? `<div class="status-row">${mv.resist.map((r) => `<span title="Immun: ${esc(B.STATUS_META[r].name)}">${B.STATUS_META[r].emoji}</span>`).join("")}${mv.inflict ? `<span class="inflict" title="Verursacht: ${esc(B.STATUS_META[mv.inflict].name)}">${B.STATUS_META[mv.inflict].emoji}</span>` : ""}</div>`
      : "";

    const ladderRow = mv.known && mv.ladder.length
      ? `<div class="ladder-row">${mv.ladder.map((l) => `<span class="${l.reached ? "reached" : ""}" title="${B.fmtNum(Math.min(mv.kills, l.threshold))} / ${B.fmtNum(l.threshold)} Kills">${l.reached ? "✓" : "○"} ${B.fmtNum(l.threshold)}</span>`).join("")}</div>`
      : "";

    const dropsRow = mv.known && mv.loot.length
      ? `<div class="drops-row">${mv.loot.map((d) => `
          <span class="drop-tag ${d.discovered ? "" : "undiscovered"}" title="${d.discovered ? esc(d.name) + " — " + d.pct : "Unentdeckt"}">
            <img src="${d.img}" alt="" />
            ${d.discovered ? `<span class="pct">${d.pct}</span>` : ""}
          </span>`).join("")}</div>`
      : "";

    // Defense-Badge ist NIE ein Spoiler (Kampfmechanik, s. DefenseTypeBadge-JSDoc im echten
    // BestiaryPage.tsx) — steht IMMER da, auch auf einer noch komplett unbekannten Karte.
    const defenseBadge = `<div class="entry-defense dt-${mv.defenseType}" title="${esc(mv.defenseDesc)}">${esc(mv.defenseName)}</div>`;

    // Fight-Button + Stats/Drops erscheinen NUR, sobald die Karte bekannt ist (kills>0) — bei
    // "???" bleibt es bei einem reinen Hinweistext, exakt wie BestiaryMonsterCard.tsx (kein
    // Direktstart-Button für unentdeckte Kreaturen; die kommen über die Kampf-Zonenauswahl).
    const body = mv.known
      ? `${statRow}${statusRow}${ladderRow}${dropsRow}
         <button class="fight-ticket" ${mv.fight.disabled ? "disabled" : ""}>${mv.fight.disabled ? "Versperrt" : "Zum Kampf ➤"}</button>
         ${mv.fight.disabled ? `<div class="fight-ticket-note">${esc(mv.fight.reason)}</div>` : ""}`
      : `<div class="unknown-note">Besiege diesen Gegner,<br>um ihn einzutragen.</div>`;

    return `<div class="entry">
      <div class="entry-art">
        ${artInner}
        <span class="lvl-badge">Lv ${mv.level}</span>
        ${mv.known && mv.enrage ? `<span class="enrage-mark" title="Wird wütend">😡</span>` : ""}
      </div>
      <div class="entry-name">${mv.known ? esc(mv.name) : "???"}</div>
      ${defenseBadge}
      <div class="entry-kills${mv.kills > 0 ? "" : " dim"}" title="Kills: ${mv.kills}">${mv.kills > 0 ? `<span class="stamp">× ${mv.killsLabel}</span>` : "— noch keine Kills"}</div>
      ${body}
    </div>`;
  }

  function spreadHtml(zone, monsters) {
    const zoneMv = monsters.map((m) => B.computeMonsterView(m, stateKey));
    const discovered = zoneMv.filter((mv) => mv.known).length;
    const pct = Math.round((discovered / zoneMv.length) * 100);
    const locked = zoneMv.every((mv) => mv.zoneLocked);

    return `<section class="spread ${locked ? "locked" : ""}">
      <div class="page-left">
        <h2>${esc(zone.name)}</h2>
        <div class="lvl-tag">Lv ${zone.levelMin}–${zone.levelMax}</div>
        ${locked ? `<div class="gate-note">Erfordert: „${esc(zone.gate)}"</div>` : ""}
        <div class="field-photo">
          <span class="fp-tape"></span>
          <img src="${B.zoneCard(zone.id)}" alt="${esc(zone.name)}" />
          <span class="fp-cap">Feldskizze — ${esc(zone.name)}</span>
        </div>
        <div class="discovery-line"><strong>${discovered}/${zoneMv.length}</strong> Kreaturen studiert</div>
        <div class="discovery-bar"><span style="width:${pct}%"></span></div>
        <p class="flavor">${locked ? "Diese Seiten bleiben leer, bis der Weg dorthin offen steht." : "Notizen aus eigener Hand, Zug um Zug im Feld gesammelt."}</p>
      </div>
      <div class="page-right">
        <div class="entries-grid">${zoneMv.map(entryHtml).join("")}</div>
      </div>
    </section>`;
  }

  function championEntryHtml(cv) {
    const artInner = cv.known
      ? `<img src="${cv.img}" alt="${esc(cv.name)}" />`
      : `<span class="qmark">?</span>`;
    return `<div class="champ-entry">
      <div class="champ-art">${artInner}${cv.baseLevel != null ? `<span class="lvl-badge">Lv ${cv.baseLevel}</span>` : ""}</div>
      <div class="champ-name">${cv.known ? esc(cv.name) : "???"}</div>
      ${cv.known
        ? `<div class="champ-stats">
            <div><span>Sichtungen</span><b>${B.fmtNum(cv.sightings)}</b></div>
            <div><span>Kills</span><b>${B.fmtNum(cv.kills)}</b></div>
            <div><span>Unikate</span><b>${B.fmtNum(cv.uniques)}</b></div>
            <div><span>Bester Kill</span><b>${cv.fastestLabel}</b></div>
          </div>`
        : `<div class="champ-hint">Gesichtet in ${esc(cv.zoneName)}</div>`}
    </div>`;
  }

  function render() {
    const st = B.STATES[stateKey];
    const monsters = B.MONSTERS.filter((m) => !onlyUndefeated || (st.kills[m.id] || 0) === 0);
    const defeatedCount = B.MONSTERS.filter((m) => (st.kills[m.id] || 0) > 0).length;
    const itemsCount = Object.keys(st.discovered).length;

    let bodyHtml;
    if (view === "monsters") {
      const byZone = B.ZONES.map((z) => ({ zone: z, monsters: monsters.filter((m) => m.zone === z.id) }))
        .filter((g) => g.monsters.length > 0);
      bodyHtml = `<div class="book">${byZone.map((g) => spreadHtml(g.zone, g.monsters)).join("")}</div>`;
    } else {
      const byZone = B.ZONES.map((z) => ({
        zone: z,
        champions: B.CHAMPIONS.filter((c) => c.zone === z.id).map((c) => B.computeChampionView(c, stateKey)),
      })).filter((g) => g.champions.length > 0);
      bodyHtml = `<div class="book">${byZone.map((g) => `
        <section class="spread">
          <div class="page-left">
            <h2>${esc(g.zone.name)}</h2>
            <div class="lvl-tag">Champion-Sichtungen</div>
            <div class="field-photo"><span class="fp-tape"></span><img src="${B.zoneCard(g.zone.id)}" alt="" /><span class="fp-cap">Anhang — Elite-Wild</span></div>
            <p class="flavor">Seltene, verstärkte Exemplare — ihre Beute fällt über den normalen Kampf-Loot.</p>
          </div>
          <div class="page-right"><div class="champ-grid">${g.champions.map(championEntryHtml).join("")}</div></div>
        </section>`).join("")}</div>`;
    }

    app.innerHTML = `
      <div class="book-title-bar">
        <div>
          <h1>Jäger-Journal</h1>
          <div class="subtitle">Feldnotizen des Warden — ${esc(B.STATE_LABELS[stateKey])}</div>
        </div>
        <div class="book-seals">
          <div class="seal"><strong>${itemsCount}</strong><span>/${B.TOTAL_ITEM_CATALOG} Funde</span></div>
          <div class="seal"><strong>${defeatedCount}</strong><span>/${B.MONSTERS.length} bezwungen</span></div>
        </div>
      </div>
      <div class="book-toolbar">
        <div class="ribbon-tabs">
          <button class="ribbon-tab ${view === "monsters" ? "active" : ""}" data-view="monsters">Bestiarium</button>
          <button class="ribbon-tab ${view === "champions" ? "active" : ""}" data-view="champions">Champion-Kodex</button>
        </div>
        <button class="quill-toggle ${onlyUndefeated ? "active" : ""}" id="btn-filter">Nur Unbesiegte</button>
        ${view === "monsters" ? `<div class="legend-note"><span class="ln-title">Statuseffekte:</span>${statusLegendHtml()}</div>` : ""}
      </div>
      ${bodyHtml}
    `;

    app.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => { view = btn.dataset.view; render(); }));
    const filterBtn = document.getElementById("btn-filter");
    if (filterBtn) filterBtn.addEventListener("click", () => { onlyUndefeated = !onlyUndefeated; render(); });
  }

  stateKey = window.StudioChrome.init({
    title: "Konzept 1 — Jäger-Journal",
    subtitle: "Feldbuch-Doppelseiten je Zone",
    onState: (key) => { stateKey = key; render(); },
  });
})();
