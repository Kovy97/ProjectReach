// codex:2026-08-01T19:22:00+02:00 — Repräsentative Shop-Daten aus dem realen Kauf-/Verkaufsvertrag.
const ASSET_ROOT = "../../../apps/client/src/renderer/assets";
const products = [
  { id:"rusty_sword", name:"Rusty Sword", category:"weapons", rarity:"common", price:75, stock:"Unlimited", level:"Attack 1", desc:"A dependable blade for a new journey." },
  { id:"wooden_shield", name:"Wooden Shield", category:"armor", rarity:"common", price:90, stock:"Unlimited", level:"Defence 1", desc:"Simple protection, fairly priced." },
  { id:"bronze_pickaxe", name:"Bronze Pickaxe", category:"tools", rarity:"common", price:120, stock:"Unlimited", level:"Mining 1", desc:"Lets a fresh worker start mining immediately." },
  { id:"runite_pickaxe", name:"Runite Pickaxe", category:"tools", rarity:"rare", price:12500, stock:"Unlimited", level:"Mining 70", desc:"High-tier convenience without replacing progression." },
  { id:"greater_healing_potion", name:"Greater Healing Potion", category:"food", rarity:"uncommon", price:260, stock:"Unlimited", level:"No requirement", desc:"Restores health when the Reach bites back." },
  { id:"graywort_seed", name:"Graywort Seed", category:"seeds", rarity:"common", price:34, stock:"Unlimited", level:"Farming 8", desc:"A hardy seed suited to bleak soil." },
  { id:"magic_binder", name:"Magic Binder", category:"materials", rarity:"uncommon", price:480, stock:"Unlimited", level:"Crafting 25", desc:"A catalyst for enchanted construction." },
  { id:"small_pouch", name:"Small Pouch", category:"materials", rarity:"common", price:52, stock:"Unlimited", level:"No requirement", desc:"Useful cloth and cord for practical recipes." }
];
const sellItems = [
  { id:"steel_platebody", name:"Steel Platebody", category:"armor", rarity:"uncommon", price:380, owned:2, variants:3, desc:"Three variants grouped under one base item." },
  { id:"rusty_sword", name:"Rusty Sword", category:"weapons", rarity:"common", price:12, owned:18, desc:"Shift-click sells the whole stack." },
  { id:"graywort_seed", name:"Graywort Seed", category:"seeds", rarity:"common", price:6, owned:127, desc:"A plain stack with adjustable quantity." },
  { id:"greater_healing_potion", name:"Greater Healing Potion", category:"food", rarity:"uncommon", price:44, owned:9, desc:"Pet bonuses are already included in this value." },
  { id:"magic_binder", name:"Magic Binder", category:"materials", rarity:"uncommon", price:80, owned:4, desc:"A compact crafting stack." },
  { id:"runite_pickaxe", name:"Runite Pickaxe", category:"tools", rarity:"rare", price:1900, owned:1, variants:2, desc:"Open the variant bundle before selling." }
];
const conceptText = {
  1:{title:"Mux' Counter",note:"Familiar three-column shop: browse left, merchandise center, decision desk right."},
  2:{title:"Quartermaster Ledger",note:"Fast comparison in readable ledger rows; the fixed transaction pane never jumps."},
  3:{title:"Caravan Shelves",note:"Wide visual shelves with a stable transaction dock across the bottom."},
  4:{title:"Ashen Exchange",note:"Designed around selling, variants, mass selection and buy-back without hidden modes."},
  5:{title:"Mux' War Table",note:"Premium item focus on the left, compact catalog roll on the right, safety nets close at hand."}
};
let selectedId = products[0].id;
let activeCategory = "all";
let quantity = 1;
let massMode = false;
let massSelection = new Set();
let gold = 9526;

// codex:2026-08-01T19:22:00+02:00 — Kleine sichere HTML-Helfer für datengesteuerte Vorschau-Komponenten.
const itemImage = id => `${ASSET_ROOT}/items/${id}.webp`;
const iconImage = id => `${ASSET_ROOT}/icons/${id}.webp`;
const money = value => new Intl.NumberFormat("en-US").format(value);
const currentState = () => document.body.dataset.state;
const currentMode = () => document.body.dataset.mode;
const effectiveGold = () => currentState() === "lowgold" ? 42 : gold;
const selectedItems = () => currentMode() === "buy" ? products : sellItems;
const selected = () => selectedItems().find(item => item.id === selectedId) || selectedItems()[0];
const setLog = text => { document.querySelector("#actionLog").textContent = text; };

function categoriesMarkup() {
  const labels = [["all","All Goods"],["weapons","Weapons"],["armor","Armor"],["tools","Tools"],["food","Food"],["seeds","Seeds"],["materials","Materials"],["upgrades","Upgrades"]];
  return `<div class="category-list">${labels.map(([id,label]) => `<button class="category-button ${activeCategory===id?"is-active":""}" data-category="${id}">${label}</button>`).join("")}</div>`;
}

function catalogMarkup() {
  const mode = currentMode();
  let list = selectedItems();
  if (activeCategory !== "all" && activeCategory !== "upgrades") list = list.filter(x => x.category === activeCategory);
  if (activeCategory === "upgrades") return extrasMarkup(true);
  if (!list.length) return `<div class="empty-slot">No goods in this category.</div>`;
  return `<div class="item-grid ${massMode?"mass-mode":""}">${list.map(item => {
    const disabled = mode === "buy" && (currentState()==="full" || item.price>effectiveGold());
    return `<button class="item-card rarity-${item.rarity} ${item.id===selectedId||massSelection.has(item.id)?"is-selected":""} ${disabled?"is-disabled":""}" data-item="${item.id}">
      <span class="selection-mark">✓</span><span class="item-art"><img src="${itemImage(item.id)}" alt=""></span>
      <span class="item-meta"><strong>${item.name}</strong><span>${item.rarity} · ${item.level||`${item.owned} owned`}</span><span class="price numeric">${money(item.price)} g</span></span>
      ${document.body.dataset.concept==="2"?`<span class="ledger-stock numeric">${item.stock||`${item.owned} owned`}</span>`:""}
    </button>`;
  }).join("")}</div>`;
}

function quantityMarkup(item) {
  const max = currentMode()==="sell" ? item.owned : 100;
  return `<div class="quantity">${[1,10,25,100].map(q=>`<button data-quantity="${q}" class="${quantity===q?"is-active":""}" ${q>max?"disabled":""}>${q}</button>`).join("")}
    <label class="custom-quantity"><input id="customQuantity" type="number" min="1" max="${max}" value="${quantity}" aria-label="Custom quantity"><button class="small-button" data-custom-quantity>Apply</button></label></div>`;
}

function inspectorMarkup() {
  const item = selected();
  const mode = currentMode();
  const total = item.price * quantity;
  const noGold = mode==="buy" && total>effectiveGold();
  const full = mode==="buy" && currentState()==="full";
  const reason = full ? "Inventory full · free a slot or buy an inventory upgrade." : noGold ? `Need ${money(total-effectiveGold())} more gold.` : "";
  return `<div class="inspector">
    <div class="selected-hero"><img src="${itemImage(item.id)}" alt=""><div><span class="tag">${item.rarity}</span>${item.variants?`<span class="tag">${item.variants} variants</span>`:""}<h2>${item.name}</h2><p>${item.desc}</p></div></div>
    <div class="trade-details"><div class="detail-row"><span>${mode==="buy"?"Unit price":"Effective sell price"}</span><strong class="numeric">${money(item.price)} g</strong></div><div class="detail-row"><span>${mode==="buy"?"Requirement":"Owned"}</span><strong>${item.level||item.owned}</strong></div><div class="detail-row"><span>Total</span><strong class="numeric">${money(total)} g</strong></div></div>
    <div class="transaction-zone">${quantityMarkup(item)}<button class="trade-button" data-trade ${noGold||full?"disabled":""}>${mode==="buy"?"Buy":"Sell"} ${quantity}</button>${reason?`<p class="reason">${reason}</p>`:""}</div>
  </div>`;
}

function extrasMarkup(compact=false) {
  const recovery = currentState()==="recovery" ? `<section><h3 class="panel-title">Lost Master Ring <small>Safety net</small></h3><div class="recovery-list"><article class="recovery-card"><img src="${itemImage("gemstone_ring")}" alt=""><div><strong>Master Ring of Mining</strong><span>Recovered once it no longer exists in your state.</span></div><button class="small-button" data-recover>Buy · 7,500</button></article></div></section>` : "";
  return `<div class="extras-panel ${compact?"is-compact":""}"><section><h3 class="panel-title">Permanent Upgrades <small>Gold sinks</small></h3><div class="upgrade-list">
    <article class="upgrade-card"><img src="${iconImage("icon_inventory")}" alt=""><div><strong>Inventory Expansion</strong><span>+5 slots · permanent capacity</span></div><button class="small-button" data-upgrade>4,500 g</button></article>
    <article class="upgrade-card"><img src="${iconImage("icon_autoeat")}" alt=""><div><strong>Auto-Eat Threshold II</strong><span>Consumes food below 35% health</span></div><button class="small-button" data-upgrade>8,000 g</button></article>
  </div></section>${recovery}</div>`;
}

function sellToolsMarkup() {
  if (currentMode() !== "sell") return "";
  const sum = sellItems.filter(x=>massSelection.has(x.id)).reduce((a,x)=>a+x.price*x.owned,0);
  return `<div class="sell-toolbar"><button class="small-button ${massMode?"is-active":""}" data-mass>${massMode?"Finish selecting":"Mass sell"}</button><button class="small-button" data-select-all>Select visible</button><span class="tag">Shift-click = whole stack</span><span class="tag">Variant bundles open before sale</span></div>${massMode?`<div class="sell-summary"><span><strong>${massSelection.size}</strong> positions selected · <strong class="numeric">${money(sum)} g</strong> expected</span><button class="small-button" data-sell-mass>Sell selected</button></div>`:""}`;
}

function buybackMarkup() {
  if (currentMode() !== "sell") return "";
  return `<section><h3 class="panel-title">Buy Back <small>Recent sales</small></h3><div class="buyback-list"><article class="buyback-card"><img src="${itemImage("iron_ore")}" alt=""><div><strong>Iron Ore × 40</strong><span>Last sold · no hidden fee</span></div><button class="small-button" data-buyback>720 g</button></article></div></section>`;
}

// codex:2026-08-01T19:22:00+02:00 — Fünf Layout-Kompositionen teilen Daten und Zustände, nicht jedoch ihre Informationsarchitektur.
function render() {
  const concept = Number(document.body.dataset.concept);
  const info = conceptText[concept];
  document.querySelector("#conceptTitle").textContent = info.title;
  document.querySelector("#conceptNote").textContent = info.note;
  document.querySelector("#goldValue").textContent = money(effectiveGold());
  const categoryPanel = `<section class="panel category-panel"><h2 class="panel-title">Departments <small>Filter goods</small></h2>${categoriesMarkup()}</section>`;
  const catalogPanel = `<section class="panel catalog-panel"><h2 class="panel-title">${currentMode()==="buy"?"Merchandise":"Your Inventory"}<small>${currentMode()==="buy"?"Unlimited standard stock":"Base stacks and variants"}</small></h2>${sellToolsMarkup()}<div class="catalog-scroll">${catalogMarkup()}</div></section>`;
  const inspectorPanel = `<aside class="panel inspector-panel">${inspectorMarkup()}${buybackMarkup()}</aside>`;
  document.querySelector("#shopWorkspace").innerHTML = `<div class="workspace">${categoryPanel}${catalogPanel}${inspectorPanel}${extrasMarkup()}</div>`;
  bindWorkspace();
}

// codex:2026-08-01T19:22:00+02:00 — Interaktionen decken Auswahl, Filter, Mengen, Sperrgründe, Massenverkauf und Rückkauf ab.
function bindWorkspace() {
  document.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click",()=>{ activeCategory=button.dataset.category; render(); }));
  document.querySelectorAll("[data-item]").forEach(button => button.addEventListener("click",event=>{
    const id=button.dataset.item;
    if(massMode && currentMode()==="sell") { massSelection.has(id)?massSelection.delete(id):massSelection.add(id); }
    else { selectedId=id; quantity=1; }
    render();
  }));
  document.querySelectorAll("[data-quantity]").forEach(button=>button.addEventListener("click",()=>{quantity=Number(button.dataset.quantity);render();}));
  document.querySelector("[data-custom-quantity]")?.addEventListener("click",()=>{ const input=document.querySelector("#customQuantity"); quantity=Math.max(1,Number(input.value)||1); render(); });
  document.querySelector("[data-trade]")?.addEventListener("click",()=>{ const item=selected(); const total=item.price*quantity; if(currentMode()==="buy") gold=Math.max(0,gold-total); else gold+=total; setLog(`${currentMode()==="buy"?"Bought":"Sold"} ${quantity} × ${item.name} for ${money(total)} gold.`); render(); });
  document.querySelector("[data-mass]")?.addEventListener("click",()=>{massMode=!massMode;if(!massMode)massSelection.clear();render();});
  document.querySelector("[data-select-all]")?.addEventListener("click",()=>{massMode=true;sellItems.forEach(x=>massSelection.add(x.id));render();});
  document.querySelector("[data-sell-mass]")?.addEventListener("click",()=>{const sum=sellItems.filter(x=>massSelection.has(x.id)).reduce((a,x)=>a+x.price*x.owned,0);gold+=sum;setLog(`Mass sale complete: ${massSelection.size} positions for ${money(sum)} gold.`);massSelection.clear();render();});
  document.querySelectorAll("[data-upgrade]").forEach(button=>button.addEventListener("click",()=>setLog("Upgrade preview: price, next tier and permanence remain visible before confirmation.")));
  document.querySelector("[data-recover]")?.addEventListener("click",()=>setLog("Master Ring recovery confirmation opened."));
  document.querySelector("[data-buyback]")?.addEventListener("click",()=>setLog("Bought back Iron Ore × 40."));
}

// codex:2026-08-01T19:22:00+02:00 — Globale Vorschau-Steuerung und Shop-Hotkeys Q/E.
document.querySelectorAll("[data-concept]").forEach(button=>button.addEventListener("click",()=>{
  document.body.dataset.concept=button.dataset.concept;
  document.querySelectorAll(".concept-button").forEach(x=>x.classList.toggle("is-active",x===button));
  render();
}));
document.querySelectorAll("[data-state]").forEach(button=>button.addEventListener("click",()=>{
  document.body.dataset.state=button.dataset.state;
  document.querySelectorAll(".state-button").forEach(x=>x.classList.toggle("is-active",x===button));
  render();
}));
document.querySelectorAll("[data-mode]").forEach(button=>button.addEventListener("click",()=>{
  document.body.dataset.mode=button.dataset.mode;
  document.querySelectorAll(".mode-button").forEach(x=>x.classList.toggle("is-active",x===button));
  selectedId=selectedItems()[0].id; activeCategory="all"; quantity=1; massMode=false; massSelection.clear(); render();
}));
window.addEventListener("keydown",event=>{
  if(event.key.toLowerCase()==="q") document.querySelector('[data-mode="buy"]').click();
  if(event.key.toLowerCase()==="e") document.querySelector('[data-mode="sell"]').click();
});
render();
