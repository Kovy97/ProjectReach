// codex:2026-08-02T00:15:00+02:00 — Gemeinsamer Funktionsdatensatz für alle fünf Layouts.
const ASSET_ROOT = "../../../apps/client/src/renderer/assets";

const concepts = {
  1: {
    name: "01 · The Warden's Dispatch",
    page: "The Warden's Dispatch",
    summary: "A command desk: quest families left, current order center, consequence ledger right.",
    line: "“An oath is only worth the road you walk for it.”",
  },
  2: {
    name: "02 · The Ashen Procession",
    page: "The Ashen Procession",
    summary: "A chapter procession: history remains visible while the active ordeal owns the stage.",
    line: "“Every completed step leaves an ember for the next.”",
  },
  3: {
    name: "03 · The Contract Wall",
    page: "The Contract Wall",
    summary: "A dense notice wall for scanning many obligations before opening one decision panel.",
    line: "“Choose carefully. The wall remembers every promise.”",
  },
  4: {
    name: "04 · The Hunter's Ledger",
    page: "The Hunter's Ledger",
    summary: "A disciplined field journal: compact index, generous dossier and a quiet reward register.",
    line: "“Read the trail first. Draw steel second.”",
  },
  5: {
    name: "05 · The Twin-Leaf Codex",
    page: "The Twin-Leaf Codex",
    summary: "An open codex: the task lives on one leaf, its price and consequences on the other.",
    line: "“Every deed has two pages: what it asks, and what it costs.”",
  },
};

const tabMeta = {
  chronicle: {
    title: "Kapitel der Asche",
    count: "18 / 21",
    coverage: "Real feature coverage: chapters · objectives · locations · unlocks · claim states",
  },
  contracts: {
    title: "Auftragsstränge",
    count: "9 / 14",
    coverage: "Real feature coverage: strands · prerequisites · active/locked/claimed · objective progress",
  },
  daily: {
    title: "Heutige sechs",
    count: "2 / 6",
    coverage: "Real feature coverage: exactly six dailies · five difficulties · reset · rewards · claim",
  },
  shop: {
    title: "Belohnungslager",
    count: "148 tokens",
    coverage: "Real feature coverage: token balance · offers · quantities · affordability · inventory space",
  },
};

const questData = {
  chronicle: [
    { id: "c17", mark: "XVII", name: "The Grave Below", sub: "Claimed · The Crypt", status: "claimed" },
    { id: "c18", mark: "XVIII", name: "A Crown of Cinders", sub: "Claimed · Paragon Tower", status: "claimed" },
    { id: "c19", mark: "XIX", name: "The Broken Bell", sub: "Active · Ashen Causeway", status: "active" },
    { id: "c20", mark: "XX", name: "The Last Procession", sub: "Requires chapter XIX", status: "locked" },
    { id: "c21", mark: "XXI", name: "Where the Ash Settles", sub: "Requires chapter XX", status: "locked" },
  ],
  contracts: [
    { id: "q1", mark: "01", name: "Blood on the Old Road", sub: "Warband strand · 2/4", status: "active" },
    { id: "q2", mark: "02", name: "Goblin Blood", sub: "Frontier strand · claimable", status: "completed" },
    { id: "q3", mark: "03", name: "Into the Wood", sub: "Wilds strand · 1/3", status: "active" },
    { id: "q4", mark: "04", name: "The Smith's Due", sub: "Settlement strand · claimed", status: "claimed" },
    { id: "q5", mark: "05", name: "No Light Below", sub: "Crypt strand · locked", status: "locked" },
    { id: "q6", mark: "06", name: "A Debt in Iron", sub: "Settlement strand · 0/2", status: "active" },
  ],
  daily: [
    { id: "d1", mark: "VE", name: "Kindling for the Watch", sub: "Very easy · 12/12 logs", status: "completed", difficulty: "Very easy" },
    { id: "d2", mark: "E", name: "Thin the Goblins", sub: "Easy · 18/25 kills", status: "active", difficulty: "Easy" },
    { id: "d3", mark: "M", name: "A Miner's Measure", sub: "Medium · 44/80 ore", status: "active", difficulty: "Medium" },
    { id: "d4", mark: "H", name: "Brew for the Wounded", sub: "Hard · 6/20 potions", status: "active", difficulty: "Hard" },
    { id: "d5", mark: "M", name: "The Long Hunt", sub: "Master · 1/3 elites", status: "active", difficulty: "Master" },
    { id: "d6", mark: "E", name: "Rations for Dawn", sub: "Easy · claimed", status: "claimed", difficulty: "Easy" },
  ],
  shop: [
    { id: "s1", mark: "", name: "Warden's Sigil", sub: "A rare crafting seal", status: "active", price: 90, qty: 1, img: "items/grave_warden_sigil.webp" },
    { id: "s2", mark: "", name: "Greater Healing Potion", sub: "Bundle of 5", status: "active", price: 35, qty: 5, img: "items/greater_healing_potion.webp" },
    { id: "s3", mark: "", name: "Bloodiron Ore", sub: "Bundle of 20", status: "active", price: 55, qty: 20, img: "items/bloodiron_ore.webp" },
    { id: "s4", mark: "", name: "Grave Warden Band", sub: "Equipment reward", status: "locked", price: 240, qty: 1, img: "items/grave_warden_band.webp" },
    { id: "s5", mark: "", name: "Gloomspore Tincture", sub: "Bundle of 3", status: "active", price: 70, qty: 3, img: "items/tincture_gloomspore.webp" },
    { id: "s6", mark: "", name: "Mariner Cloak", sub: "Equipment reward", status: "locked", price: 180, qty: 1, img: "items/mariner_cloak.webp" },
  ],
};

const uiState = {
  concept: "1",
  tab: "chronicle",
  state: "active",
  tokens: 148,
  selected: { chronicle: "c19", contracts: "q1", daily: "d2", shop: "s1" },
};

// codex:2026-08-02T00:15:00+02:00 — Kleine Template-Helfer für Index, Ziele und Belohnungsregister.
function stateLabel(status) {
  if (status === "completed") return "Claimable";
  if (status === "claimed") return "Claimed";
  if (status === "locked") return "Locked";
  return "Active";
}

function asset(path) {
  return `${ASSET_ROOT}/${path}`;
}

function questEntry(item, selected) {
  const shopClass = uiState.tab === "shop" ? " shop-offer" : "";
  const mark = item.img
    ? `<span class="entry-mark"><img src="${asset(item.img)}" alt=""></span>`
    : `<span class="entry-mark numeric">${item.mark}</span>`;
  const tail = item.price
    ? `<span class="offer-price numeric">${item.price}</span>`
    : `<span class="entry-state ${item.status}">${stateLabel(item.status)}</span>`;
  return `
    <button class="quest-entry${shopClass}${selected ? " is-selected" : ""} is-${item.status}" data-entry="${item.id}">
      ${mark}
      <span class="entry-copy"><strong>${item.name}</strong><small>${item.sub}</small></span>
      ${tail}
    </button>`;
}

function objective(name, count, progress, where) {
  const pct = Math.max(0, Math.min(100, (progress / count) * 100));
  const shownProgress = uiState.state === "completed" ? count : uiState.state === "locked" ? 0 : progress;
  return `
    <div class="objective">
      <div class="objective-head"><strong>${name}</strong><span class="numeric">${shownProgress} / ${count}</span></div>
      <div class="progress" style="--progress:${pct}%"><i></i></div>
      <div class="where-line"><span>Where</span><b>${where}</b></div>
    </div>`;
}

function reward(img, label, value) {
  return `
    <div class="reward">
      <img src="${asset(img)}" alt="">
      <span><small>${label}</small><strong class="numeric">${value}</strong></span>
    </div>`;
}

function statusForFocus(selected) {
  if (uiState.state === "completed") return "completed";
  if (uiState.state === "locked") return "locked";
  return selected.status === "claimed" ? "claimed" : selected.status === "locked" ? "locked" : "active";
}

function actionButton(label = "Claim rewards") {
  const disabled = uiState.state !== "completed";
  const text = uiState.state === "locked" ? "Requirements missing" : disabled ? "Quest in progress" : label;
  return `<button class="claim-button" id="primaryAction" ${disabled ? "disabled" : ""}>${text}</button>`;
}

// codex:2026-08-02T00:15:00+02:00 — Tab-spezifische Dossiers bilden die realen QuestsPage-Verträge ab.
function chronicleFocus(selected) {
  const status = statusForFocus(selected);
  return `
    <span class="focus-kicker">Aschechronik · Chapter XIX of XXI</span>
    <div class="focus-head">
      <h2>${selected.name}</h2>
      <span class="status-seal ${status}">${stateLabel(status)}</span>
    </div>
    <p class="quest-directive">The bell beneath the causeway still tolls without a hand. Silence its keeper before the road fills with ash-born dead.</p>
    <div class="objective-stack">
      ${objective("Defeat the Bell Keeper", 1, 0, "Ashen Causeway")}
      ${objective("Reach Paragon floor 60", 60, 54, "Paragon Tower")}
    </div>
    ${actionButton("Seal chapter XIX")}`;
}

function contractsFocus(selected) {
  const status = statusForFocus(selected);
  return `
    <span class="focus-kicker">Contract strand · Frontier Oaths</span>
    <div class="focus-head">
      <h2>${selected.name}</h2>
      <span class="status-seal ${status}">${stateLabel(status)}</span>
    </div>
    <p class="quest-directive">The ford is red again. Break the goblin bands before their scouts reach New Haven's timber road.</p>
    <div class="objective-stack">
      ${objective("Slay goblin variants", 40, 32, "Briarwood Verge")}
      ${objective("Gather warband seals", 8, 5, "Goblin camps")}
    </div>
    ${actionButton()}`;
}

function dailyFocus(selected) {
  const status = statusForFocus(selected);
  return `
    <span class="focus-kicker">Daily contract · resets at local midnight</span>
    <div class="focus-head">
      <h2>${selected.name}</h2>
      <span class="difficulty-seal">${selected.difficulty ?? "Medium"}</span>
    </div>
    <p class="quest-directive">A short obligation chosen from today's deterministic pool. Unclaimed progress expires at the next reset.</p>
    <div class="daily-card-strip">
      <div class="daily-stat"><span>Difficulty</span><strong>${selected.difficulty ?? "Medium"}</strong></div>
      <div class="daily-stat"><span>Time left</span><strong class="numeric">06:42:18</strong></div>
      <div class="daily-stat"><span>Claimed today</span><strong class="numeric">2 / 6</strong></div>
    </div>
    <div class="objective-stack" style="margin-top:10px">
      ${objective("Defeat goblins", 25, 18, "Any goblin zone")}
    </div>
    ${actionButton("Claim daily reward")}`;
}

function shopFocus(selected) {
  const affordable = uiState.tokens >= selected.price;
  return `
    <span class="focus-kicker">Warden's token reserve · quantity ${selected.qty}</span>
    <div class="focus-head">
      <h2>${selected.name}</h2>
      <span class="status-seal ${affordable ? "completed" : "locked"}">${affordable ? "Affordable" : "Need tokens"}</span>
    </div>
    <div class="offer-preview"><img src="${asset(selected.img)}" alt="${selected.name}"></div>
    <p class="quest-directive">${selected.sub}. Purchases use quest tokens and respect normal inventory or auto-bank capacity.</p>
    <button class="buy-button" id="primaryAction" ${affordable ? "" : "disabled"}>Buy for <span class="numeric">${selected.price}</span> tokens</button>`;
}

function ledgerFor(tab, selected) {
  if (tab === "shop") {
    return `
      <div class="panel-heading"><span>Token ledger</span><small class="numeric">${uiState.tokens} available</small></div>
      <div class="ledger-body">
        <div class="context-card"><b>Selected bundle</b><span>${selected.qty} × ${selected.name}</span></div>
        <div class="context-card"><b>After purchase</b><span class="numeric">${Math.max(0, uiState.tokens - selected.price)} tokens remain</span></div>
        <div class="unlock-list"><b>Delivery rule</b><span>Inventory first · auto-bank fallback · no partial loss</span></div>
      </div>`;
  }

  const dailyExtra = tab === "daily"
    ? `<div class="context-card"><b>Daily rule</b><span>Exactly six tasks · maximum two of one difficulty · local midnight reset.</span></div>`
    : `<div class="unlock-list"><b>Unlocks</b><span>${tab === "chronicle" ? "Chapter XX · The Last Procession · new dungeon clue" : "Next contract in the Frontier Oaths strand"}</span></div>`;

  return `
    <div class="panel-heading"><span>Rewards & consequence</span><small>Preview</small></div>
    <div class="ledger-body">
      <div class="reward-grid">
        ${reward("icons/icon_goldcoin.webp", "Gold", tab === "daily" ? "1,250" : "8,500")}
        ${reward("icons/icon_quest_token.webp", "Quest tokens", tab === "daily" ? "12" : "35")}
        ${reward("items/greater_healing_potion.webp", "Potion", tab === "daily" ? "2 × Greater" : "5 × Greater")}
        ${reward("items/grave_warden_sigil.webp", "Item", "Warden's Sigil")}
      </div>
      ${dailyExtra}
      <div class="context-card"><b>Progress rule</b><span>Claiming is explicit. Rewards are granted once; completed and claimed remain visually distinct.</span></div>
    </div>`;
}

function renderWorkspace() {
  const list = questData[uiState.tab];
  const selectedId = uiState.selected[uiState.tab];
  const selected = list.find((item) => item.id === selectedId) ?? list[0];
  const meta = tabMeta[uiState.tab];
  const indexMarkup = list.map((item) => questEntry(item, item.id === selected.id)).join("");

  let focusMarkup = chronicleFocus(selected);
  if (uiState.tab === "contracts") focusMarkup = contractsFocus(selected);
  if (uiState.tab === "daily") focusMarkup = dailyFocus(selected);
  if (uiState.tab === "shop") focusMarkup = shopFocus(selected);

  document.querySelector("#questWorkspace").innerHTML = `
    <aside class="quest-index">
      <div class="panel-heading"><span>${meta.title}</span><small class="numeric">${meta.count}</small></div>
      <div class="quest-list${uiState.tab === "shop" ? " shop-offer-list" : ""}">${indexMarkup}</div>
    </aside>
    <section class="quest-focus">${focusMarkup}</section>
    <aside class="quest-ledger">${ledgerFor(uiState.tab, selected)}</aside>`;

  document.querySelector("#coverageNote").textContent = meta.coverage;
  document.querySelector("#resetClock").hidden = uiState.tab !== "daily";

  document.querySelectorAll("[data-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.selected[uiState.tab] = button.dataset.entry;
      document.querySelector("#actionLog").textContent = `Selected: ${button.querySelector("strong").textContent}`;
      renderWorkspace();
    });
  });

  const action = document.querySelector("#primaryAction");
  if (action && !action.disabled) {
    action.addEventListener("click", () => {
      if (uiState.tab === "shop") {
        uiState.tokens -= selected.price;
        document.querySelector("#tokenBalance").textContent = String(uiState.tokens);
        document.querySelector("#actionLog").textContent = `${selected.name} purchased. ${uiState.tokens} tokens remain.`;
      } else {
        document.querySelector("#actionLog").textContent = `${selected.name}: reward claimed once.`;
        uiState.state = "active";
        document.body.dataset.state = "active";
        syncStateButtons();
      }
      renderWorkspace();
    });
  }
}

// codex:2026-08-02T00:15:00+02:00 — Kontrollleiste wechselt nur Layout/Testzustand, nie Produktionsdaten.
function syncStateButtons() {
  document.querySelectorAll("[data-state]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.state === uiState.state);
  });
}

function applyConcept() {
  const concept = concepts[uiState.concept];
  document.body.dataset.concept = uiState.concept;
  document.querySelector("#conceptName").textContent = concept.name;
  document.querySelector("#conceptSummary").textContent = concept.summary;
  document.querySelector("#pageTitle").textContent = concept.page;
  document.querySelector("#wardenLine").textContent = concept.line;
  document.querySelectorAll("[data-concept]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.concept === uiState.concept);
  });
}

document.querySelectorAll("[data-concept]").forEach((button) => {
  button.addEventListener("click", () => {
    uiState.concept = button.dataset.concept;
    applyConcept();
    renderWorkspace();
  });
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    uiState.tab = button.dataset.tab;
    document.body.dataset.tab = uiState.tab;
    document.querySelectorAll("[data-tab]").forEach((tabButton) => {
      tabButton.classList.toggle("is-active", tabButton.dataset.tab === uiState.tab);
    });
    document.querySelector("#actionLog").textContent = `${tabMeta[uiState.tab].title} opened.`;
    renderWorkspace();
  });
});

document.querySelectorAll("[data-state]").forEach((button) => {
  button.addEventListener("click", () => {
    uiState.state = button.dataset.state;
    document.body.dataset.state = uiState.state;
    syncStateButtons();
    renderWorkspace();
  });
});

applyConcept();
syncStateButtons();
renderWorkspace();
