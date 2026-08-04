// codex:2026-08-01T17:28:00+02:00 — Interactive 4×5 layout matrix; presentation data only.
const surfaces = {
  companions: {
    title: "Companions",
    summary: "Roster, bonds, deployment and growth without hiding the active companion.",
    names: ["Command Roster", "Warband Deck", "Kennel Ledger", "Bond Board", "Expedition Chronicle"],
    items: ["Ashen Hound", "Mire Raven", "Grave Lynx", "Ironback Boar", "Lantern Wisp", "Carrion Drake"],
    statuses: ["Deployed", "Bond 7", "Resting", "Ready", "Bond 4", "Locked"],
    section: "Warband",
    detail: "Ashen Hound",
    copy: "A front-line companion that marks wounded enemies and guards its keeper.",
    metrics: [["Bond", "7 / 10"], ["Power", "184"], ["Next trait", "2 levels"], ["Expedition", "Ready"]],
    primary: "Deploy companion",
    secondary: "Traits & bond"
  },
  shop: {
    title: "Shop",
    summary: "Fast browsing, item comparison and purchasing with cost always visible.",
    names: ["Merchant Ledger", "Bazaar Shelves", "Quartermaster Table", "Curio Gallery", "Trade Contracts"],
    items: ["Ironwood Axe", "Ember Draught", "Warden Mail", "Runed Satchel", "Frost Charm", "Oakheart Bow"],
    statuses: ["1,250 gold", "420 gold", "3,800 gold", "950 gold", "2,100 gold", "2,750 gold"],
    section: "Merchant stock",
    detail: "Ironwood Axe",
    copy: "A work-worn rare axe. Compare the gain before committing your gold.",
    metrics: [["Damage", "18–24"], ["Speed", "2.8s"], ["Owned", "0"], ["Price", "1,250"]],
    primary: "Purchase",
    secondary: "Compare"
  },
  bank: {
    title: "Bank",
    summary: "Storage density, categories and transfers designed for large inventories.",
    names: ["Vault Ledger", "Armory Wall", "Quartermaster Split", "Crate Index", "Archive Chronicle"],
    items: ["Copper Ore", "Oak Logs", "Healing Potion", "Steel Platebody", "Rune Shard", "Cooked Chicken"],
    statuses: ["9,999", "4,556", "735", "1", "35", "489"],
    section: "Vault contents",
    detail: "Steel Platebody",
    copy: "Stored equipment remains searchable, sortable and transferable without modal hopping.",
    metrics: [["Slots", "84 / 120"], ["Value", "48,260"], ["Category", "Armor"], ["Quantity", "1"]],
    primary: "Withdraw",
    secondary: "Move all"
  },
  quests: {
    title: "Quests",
    summary: "Campaign, contracts and rewards with objectives readable at a glance.",
    names: ["Warden Docket", "Campaign Rail", "Contract Board", "Chapter Ledger", "Hunter Dispatch"],
    items: ["Fry Shadowcarp", "The Broken Bell", "Ash on the Road", "A Debt in Iron", "Blood Moon Hunt", "Haven Supplies"],
    statuses: ["3 / 38", "2 / 4", "Complete", "0 / 6", "Daily", "New Haven"],
    section: "Active docket",
    detail: "Fry Shadowcarp",
    copy: "Prepare the catch at a cooking fire and return before the river fog rises.",
    metrics: [["Progress", "3 / 38"], ["XP", "12,400"], ["Gold", "850"], ["Region", "The Ford"]],
    primary: "Track quest",
    secondary: "View rewards"
  }
};

const conceptNotes = [
  ["Three stable columns keep navigation, work area and detail visible.", "Desktop play and frequent selection changes.", "Needs a compact fallback below 1200px."],
  ["A wide feature band gives important content a stronger visual hierarchy.", "Discovery-heavy pages and controller navigation.", "Shows fewer records above the fold."],
  ["A dense ledger prioritizes scanning, sorting and large collections.", "Experienced players and inventory-heavy sessions.", "Less cinematic than card-led layouts."],
  ["A spacious board opens a fixed bottom inspector instead of changing card heights.", "Variable content and consistent card geometry.", "Inspector temporarily uses vertical room."],
  ["A chronological rail connects progression and decisions into one readable flow.", "Quest chains, bonds and long-term unlocks.", "Not ideal for bulk transactions without filters."]
];

let currentSurface = "companions";
let currentConcept = 1;

function cards(data) {
  return `<div class="cards">${data.items.map((item, i) => `<article class="card ${i === 0 ? "is-selected" : ""}"><div class="card__visual"></div><h3>${item}</h3><p>${data.statuses[i]}</p></article>`).join("")}</div>`;
}

function rows(data) {
  return `<div class="list">${data.items.map((item, i) => `<div class="list-row ${i === 0 ? "is-selected" : ""}"><strong>${item}</strong><span>${data.statuses[i]}</span><span>${i % 2 ? "Available" : "Tracked"}</span><span>›</span></div>`).join("")}</div>`;
}

function filters() {
  return `<div class="filters"><button class="chip is-active">All</button><button class="chip">Active</button><button class="chip">Ready</button><input class="search" aria-label="Filter records" placeholder="Search name or trait…"></div>`;
}

function detail(data) {
  return `<h2 class="detail-title">${data.detail}</h2><p class="detail-copy">${data.copy}</p><div class="metric-grid">${data.metrics.map(([a,b]) => `<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join("")}</div><div class="reward"><span>Primary action</span><button class="action action--primary">${data.primary}</button></div><div class="reward"><span>Secondary</span><button class="action">${data.secondary}</button></div>`;
}

function timeline(data) {
  return `<div class="timeline">${data.items.slice(0,5).map((item, i) => `<article class="timeline__entry"><span class="tag">Stage ${String(i + 1).padStart(2, "0")}</span><h3>${item}</h3><p>${data.statuses[i]}</p>${i === 1 ? '<div class="progress"><i></i></div>' : ""}</article>`).join("")}</div>`;
}

function panel(region, title, body, warm = false) {
  return `<section class="panel ${warm ? "panel--warm" : ""} ${region}"><header class="panel__head"><strong>${title}</strong><span>⋮</span></header><div class="panel__body">${body}</div></section>`;
}

function render() {
  const data = surfaces[currentSurface];
  const prototype = document.querySelector("#prototype");
  const listing = currentConcept === 3 ? rows(data) : currentConcept === 5 ? timeline(data) : cards(data);
  const main = currentConcept === 2 ? `<div class="hero"><h2>${data.detail}</h2><p>${data.copy}</p></div>` : cards({...data, items: data.items.slice(0, 4), statuses: data.statuses.slice(0, 4)});
  prototype.className = `prototype layout-${currentConcept}`;
  prototype.innerHTML = [
    panel("region-list", data.section, `${filters()}${listing}`),
    panel("region-main", currentConcept === 5 ? "Current milestone" : "Featured", main, true),
    panel("region-detail", "Inspector", detail(data), true),
    panel("region-secondary", currentConcept === 5 ? "Recent history" : "Activity", currentConcept === 5 ? rows(data) : timeline(data))
  ].join("");
  document.querySelector("#page-title").textContent = data.title;
  document.querySelector("#page-summary").textContent = data.summary;
  document.querySelector("#concept-kicker").textContent = `${data.title} · Concept 0${currentConcept}`;
  document.querySelector("#concept-name").textContent = data.names[currentConcept - 1];
  ["intent", "best-at", "tradeoff"].forEach((id, i) => document.querySelector(`#${id}`).textContent = conceptNotes[currentConcept - 1][i]);
}

document.querySelectorAll("[data-surface]").forEach(button => button.addEventListener("click", () => {
  currentSurface = button.dataset.surface;
  document.querySelectorAll("[data-surface]").forEach(item => item.classList.toggle("is-active", item === button));
  render();
}));

document.querySelectorAll("[data-concept]").forEach(button => button.addEventListener("click", () => {
  currentConcept = Number(button.dataset.concept);
  document.querySelectorAll("[data-concept]").forEach(item => item.classList.toggle("is-active", item === button));
  render();
}));

render();
