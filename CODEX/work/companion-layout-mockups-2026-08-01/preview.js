// codex:2026-08-01T20:42:00+02:00
const petRoot = "../../../apps/client/src/renderer/assets/pets/";
const pets = [
  ["ashgut","Aschbauch","Kochen","Perfektes Kochen +4%","Verschlingen · alle 5,0s","1 / 60.000"],
  ["carapace","Schlackenpanzer","Kampf","Schadensreduktion +3%","Bollwerk · alle 10,0s","1 / 105.000"],
  ["carrionwing","Aasschwinge","Kampf","Doppelbeute +5%","Sturzflug · alle 4,5s","1 / 90.000"],
  ["charnel","Beinhaus","Kampf","Kill-Heilung +3%","Mahl der Gefallenen · alle 5,0s","1 / 75.000"],
  ["cragmaw","Felsschlund","Bergbau","Doppelertrag +5%","Felswurf · alle 4,0s","1 / 60.000"],
  ["flayling","Schindling","Handwerk","Sammelertrag +4%","Häuten · alle 5,0s","1 / 60.000"],
  ["gemwraith","Edelsteinwicht","Juwelierkunst","Makelloser Edelstein +5%","Prismenlanze · alle 4,5s","1 / 60.000"],
  ["gillrot","Kiemenfäule","Angeln","Doppelertrag +5%","Haken & Riss · alle 5,0s","1 / 60.000"],
  ["gloomrat","Düsterratte","Diebeskunst","Erfolgschance +3%","Diebesgriff · alle 6,0s","1 / 60.000"],
  ["glyphmaw","Glyphenschlund","Runenkunst","Bonusrune +4,5%","Runenfraß · alle 5,0s","1 / 80.000"],
  ["gorehound","Blutbracke","Kampf","Lebensraub +1,5%","Zerfleischen · alle 4,5s","1 / 80.000"],
  ["hemlock","Schierling","Kräuterkunde","Trank bewahren +5%","Giftphiole · alle 5,0s","1 / 60.000"],
  ["hoarspite","Frostgroll","Kampf","Manaregeneration +4%","Grabfrost · alle 5,5s","1 / 90.000"],
  ["ironmaw","Eisenschlund","Kampf","Kraft +2 Stufen","Rammstoß · alle 5,0s","1 / 75.000"],
  ["pyreling","Scheiterling","Kampf","Manaregeneration +5%","Flammennova · alle 4,5s","1 / 85.000"],
  ["quillshrike","Federwürger","Handwerk","Doppelertrag +5%","Kielsalve · alle 4,5s","1 / 60.000"],
  ["rotbark","Faulrinde","Holzfällen","Sofortaktion +5%","Wurzelschlinge · alle 5,0s","1 / 60.000"],
  ["slagfiend","Schlackenscheusal","Schmieden","Materialrückgabe +5%","Schmiedebrand · alle 4,0s","1 / 60.000"],
  ["sporewretch","Sporenwicht","Sammeln","Doppelertrag +5%","Sporenwolke · alle 5,5s","1 / 60.000"],
  ["vellumoth","Pergamotte","Runenkunst","Verkaufspreis +5%","Siegelschirm · alle 6,0s","1 / 80.000"],
  ["witherling","Welkling","Anbau","Sammelertrag +4,5%","Fäulnisblüte · alle 5,5s","1 / 15.000"]
].map((p,i)=>({id:p[0],name:p[1],source:p[2],passive:p[3],active:p[4],drop:p[5],owned:i%3!==1,desc:`Ein seltener, im Reach gefundener Begleiter. ${p[3]} stärkt deinen Weg außerhalb des Kampfes; ${p[4]} greift sichtbar in Gefechte ein.`}));
let selected = pets.find(p=>p.id==="rotbark");
let equipped = "rotbark";
let concept = 1;
let filter = "Alle";

// codex:2026-08-01T20:42:00+02:00
const portrait = (p, cls="") => `<div class="portrait ${p.owned?"":"locked"} ${cls}"><img src="${petRoot}${p.id}.webp" alt="${p.name}">${equipped===p.id?'<span class="equipped-ribbon">AUSGERÜSTET</span>':""}</div>`;
const effects = p => `<div class="effect"><b>PASSIV</b><span>${p.passive}</span></div><div class="effect activefx"><b>AKTIVE KAMPFFÄHIGKEIT</b><span>${p.active}</span></div>`;
const meta = p => `<div class="meta"><div><small>QUELLE</small><strong>${p.source}</strong></div><div><small>DROPCHANCE</small><strong>${p.drop}</strong></div></div>`;
const action = p => p.owned ? `<button class="equip ${equipped===p.id?"off":""}" data-equip="${p.id}">${equipped===p.id?"ABLEGEN":"AUSRÜSTEN"}</button>` : `<button class="equip" disabled>NOCH NICHT GEFUNDEN</button>`;
const thumbnails = (limit=99) => pets.filter(p=>filter==="Alle"||filter==="Besessen"&&p.owned||p.source===filter).slice(0,limit).map(p=>`<button class="thumb ${p.owned?"owned":"locked"} ${selected.id===p.id?"selected":""}" data-pet="${p.id}" title="${p.owned?p.name:"Unbekannter Begleiter"}"><img src="${petRoot}${p.id}.webp" alt=""><i class="dot"></i></button>`).join("");
const filters = () => ["Alle","Besessen","Kampf","Holzfällen","Bergbau","Angeln","Handwerk"].map(x=>`<button class="filter ${filter===x?"active":""}" data-filter="${x}">${x}</button>`).join("");
const header = (title,sub) => `<section class="frame canvas head"><div class="titleline"><div><span class="kicker">${sub}</span><h2>${title}</h2></div><div><strong>${pets.filter(p=>p.owned).length} / ${pets.length}</strong> gefunden</div></div></section>`;

// codex:2026-08-01T20:42:00+02:00
function layout1(){return `<div class="screen c1">${header("Die Menagerie des Wächters","01 · Bühne + beständiges Dossier")}<aside class="frame canvas roster"><div class="filters">${filters()}</div><div class="thumb-grid">${thumbnails()}</div></aside><section class="frame stone stage">${portrait(selected)}<div class="titleline"><span class="pet-name">${selected.owned?selected.name:"???"}</span><span class="kicker">${selected.source}</span></div></section><aside class="frame canvas dossier"><span class="kicker">Begleiterakte</span><div class="pet-name">${selected.owned?selected.name:"Unbekannt"}</div><p class="pet-desc">${selected.owned?selected.desc:"Dieser seltene Begleiter muss zuerst in der Welt gefunden werden. Seine Gestalt und Effekte bleiben bis dahin verborgen."}</p>${selected.owned?effects(selected)+meta(selected):meta(selected)}${action(selected)}</aside></div>`}
function layout2(){return `<div class="screen c2">${header("Das Begleiter-Reliquiar","02 · Aktiver Schrein + Archivband")}<section class="frame stone hero">${portrait(selected)}<div class="herocopy"><span class="kicker">Aktiver Gefährte</span><div class="pet-name">${selected.owned?selected.name:"???"}</div><p class="pet-desc">${selected.desc}</p>${effects(selected)}${action(selected)}</div></section><aside class="frame canvas archive"><span class="kicker">Fundarchiv</span><div class="thumb-grid">${thumbnails()}</div></aside><section class="frame canvas ledger"><div><span class="kicker">Eintrag</span><div class="pet-name">${selected.name}</div></div><p class="pet-desc">${selected.desc}</p>${meta(selected)}<div>${action(selected)}</div></section></div>`}
function layout3(){var rows=pets.filter(p=>filter==="Alle"||filter==="Besessen"&&p.owned||p.source===filter).map(p=>`<div class="journal-row ${p.id===selected.id?"selected":""}" data-pet="${p.id}"><img src="${petRoot}${p.id}.webp" alt=""><div><b>${p.owned?p.name:"Unbekannter Fund"}</b><small>${p.source} · ${p.drop}</small></div><span class="journal-mark">${p.owned?"GEFUNDEN":"???"}</span></div>`).join("");return `<div class="screen c3">${header("Das Feldjournal des Jägers","03 · Schnelles Nachschlagen + große Beobachtung")}<aside class="frame canvas journal"><div class="filters">${filters()}</div><div class="scroll">${rows}</div></aside><section class="frame stone field">${portrait(selected)}<div class="fieldcopy"><span class="kicker">Beobachtung Nr. ${String(pets.indexOf(selected)+1).padStart(2,"0")}</span><div class="pet-name">${selected.owned?selected.name:"Unbekannte Kreatur"}</div><p class="pet-desc">${selected.desc}</p>${effects(selected)}<div class="dropseal">Fundort: ${selected.source} · Chance ${selected.drop}</div>${action(selected)}</div></section></div>`}
function layout4(){var quick=pets.filter(p=>p.owned).slice(0,5).map(p=>`<button class="quickpet" data-pet="${p.id}"><img src="${petRoot}${p.id}.webp" alt=""><b>${p.name}</b></button>`).join("");return `<div class="screen c4">${header("Halle des Aschenbundes","04 · Zentrale Bindung + Schnellwechsel")}<section class="frame stone bondstage"><div class="bond-side"><div class="sigil"><b>PASSIVER BUND</b>${selected.passive}</div><div class="sigil"><b>HERKUNFT</b>${selected.source}</div></div>${portrait(selected)}<div class="bond-side"><div class="sigil"><b>KAMPFRUF</b>${selected.active}</div><div class="sigil"><b>SELTENHEIT</b>${selected.drop}</div>${action(selected)}</div></section><aside class="frame canvas hunt"><span class="kicker">Noch unentdeckte Spuren</span><div class="thumb-grid">${pets.filter(p=>!p.owned).map(p=>`<button class="thumb locked" data-pet="${p.id}"><img src="${petRoot}${p.id}.webp" alt=""><i class="dot"></i></button>`).join("")}</div></aside><section class="frame canvas quickbar"><div class="quicklabel">GEFUNDENE BEGLEITER</div>${quick}</section></div>`}
function layout5(){var sources=["Alle","Besessen",...new Set(pets.map(p=>p.source))];return `<div class="screen c5">${header("Das Gestell des Hüters","05 · Dichte Sammlung + festes Ausrüstungsdock")}<aside class="frame canvas sources"><span class="kicker">Herkunft filtern</span>${sources.map(s=>`<button class="sourcebtn ${filter===s?"active":""}" data-filter="${s}">${s}</button>`).join("")}</aside><section class="frame stone collection"><div class="titleline"><span class="pet-name">Sammlung</span><span>${pets.filter(p=>p.owned).length} entdeckt</span></div><div class="thumb-grid">${thumbnails()}</div></section><aside class="frame canvas rack"><span class="kicker">Aktives Begleiter-Dock</span>${portrait(selected)}<div class="pet-name">${selected.owned?selected.name:"???"}</div>${effects(selected)}${meta(selected)}${action(selected)}</aside></div>`}

// codex:2026-08-01T20:42:00+02:00
function render(){document.getElementById("app").innerHTML=[layout1,layout2,layout3,layout4,layout5][concept-1]();bind()}
function bind(){document.querySelectorAll("[data-pet]").forEach(el=>el.onclick=()=>{selected=pets.find(p=>p.id===el.dataset.pet);render()});document.querySelectorAll("[data-filter]").forEach(el=>el.onclick=()=>{filter=el.dataset.filter;render()});document.querySelectorAll("[data-equip]").forEach(el=>el.onclick=()=>{if(selected.owned)equipped=equipped===el.dataset.equip?null:el.dataset.equip;render()})}
document.querySelectorAll("[data-concept]").forEach(btn=>btn.onclick=()=>{concept=Number(btn.dataset.concept);document.querySelectorAll("[data-concept]").forEach(b=>b.classList.toggle("active",b===btn));render()});
render();
