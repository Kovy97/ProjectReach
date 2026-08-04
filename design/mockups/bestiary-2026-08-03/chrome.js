/* ═══════════════════════════════════════════════════════════
   CHROME — Werkzeugleiste (Zustand-Umschalter + Zurück-Link) für jede
   Konzept-Seite. Erwartet, dass data.js VOR dieser Datei geladen wurde
   (window.BESTIARY).
   ═══════════════════════════════════════════════════════════ */
(function () {
  const B = window.BESTIARY;

  function currentStateFromUrl() {
    const p = new URLSearchParams(window.location.search).get("state");
    return p && B.STATES[p] ? p : "early";
  }

  function zonesUnlockedCount(stateKey) {
    const st = B.STATES[stateKey];
    return B.ZONES.filter((z) => st.zonesUnlocked[z.id]).length;
  }

  window.StudioChrome = {
    /**
     * @param {{ title: string, subtitle?: string, mount?: HTMLElement, onState: (stateKey: string) => void }} opts
     * @returns {string} den initial aktiven Zustand (z.B. "early")
     */
    init(opts) {
      const mount = opts.mount || document.body.insertAdjacentElement("afterbegin", document.createElement("div"));
      const bar = document.createElement("div");
      bar.id = "studio-chrome";

      const back = document.createElement("a");
      back.className = "sc-back";
      back.href = "index.html";
      back.textContent = "← Studien-Übersicht";
      bar.appendChild(back);

      const title = document.createElement("div");
      title.className = "sc-title";
      title.innerHTML = opts.title + (opts.subtitle ? "<small>" + opts.subtitle + "</small>" : "");
      bar.appendChild(title);

      const stat = document.createElement("div");
      stat.className = "sc-stat";
      bar.appendChild(stat);

      const group = document.createElement("div");
      group.className = "sc-group";
      const label = document.createElement("span");
      label.className = "sc-group-label";
      label.textContent = "Spielstand:";
      group.appendChild(label);

      let active = currentStateFromUrl();
      const buttons = {};
      B.STATE_ORDER.forEach((key) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sc-btn" + (key === active ? " active" : "");
        btn.textContent = B.STATE_LABELS[key];
        btn.addEventListener("click", () => setState(key));
        buttons[key] = btn;
        group.appendChild(btn);
      });
      bar.appendChild(group);
      mount.replaceWith(bar);

      function setState(key) {
        active = key;
        Object.entries(buttons).forEach(([k, b]) => b.classList.toggle("active", k === key));
        const url = new URL(window.location.href);
        url.searchParams.set("state", key);
        window.history.replaceState(null, "", url);
        stat.innerHTML = "Freigeschaltet: <strong>" + zonesUnlockedCount(key) + "/" + B.ZONES.length + "</strong> Zonen";
        opts.onState(key);
      }

      setState(active);
      return active;
    },
  };
})();
