// codex:2026-08-03T13:26:00+02:00
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const MAP = path.join(ROOT, 'apps/client/src/renderer/assets/camp/camp_map_day.webp');
const OUT = path.join(ROOT, 'CODEX/work/newhaven-growth-concepts');
const FONT_PATH = path.join(ROOT, 'apps/client/src/renderer/fonts/Cinzel-Regular.ttf');
const fontData = (await fs.readFile(FONT_PATH)).toString('base64');
const W = 1920;
const H = 1080;
const MAP_W = 1440;
const MAP_H = 810;
const MAP_X = 28;
const MAP_Y = 122;

function stakes(points) {
  return points.map(([x, y], i) => `<path d="M${x - 8} ${y + 15}L${x} ${y - 18}L${x + 8} ${y + 15}" fill="#261c14" fill-opacity=".76" stroke="#a36b3c" stroke-width="3"/><path d="M${x - 9} ${y + 5}L${x + 9} ${y + 5}" stroke="#543822" stroke-width="4"/>`).join('');
}

function fire(x, y) {
  return `<g><circle cx="${x}" cy="${y}" r="68" fill="#d88025" opacity=".11"/><circle cx="${x}" cy="${y}" r="34" fill="#ef9e3a" opacity=".18"/><path d="M${x} ${y + 22}c-34-8-36-39-13-58-1 18 10 21 15 5 8-25 27-35 23-59 38 36 40 82-25 112Z" fill="#d87924" stroke="#f1c46d" stroke-width="4"/><path d="M${x - 28} ${y + 22}l56 18M${x + 28} ${y + 22}l-56 18" stroke="#352218" stroke-width="8"/></g>`;
}

function callout(n, x, y, tx, ty) {
  return `<path d="M${x} ${y}L${tx} ${ty}" stroke="#d8b870" stroke-width="2"/><circle cx="${x}" cy="${y}" r="19" fill="#111518" stroke="#d8b870" stroke-width="3"/><text x="${x}" y="${y + 7}" class="num">${n}</text>`;
}

// codex:2026-08-03T13:35:00+02:00
function wrapWords(text, limit = 42) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && `${line} ${word}`.length > limit) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function stageOverlay(stage) {
  const ox = MAP_X;
  const oy = MAP_Y;
  const fireX = ox + 710;
  const fireY = oy + 430;
  let mapMarks = `
    <path d="M${ox + 70} ${oy + 665}C${ox + 310} ${oy + 590},${ox + 465} ${oy + 515},${fireX} ${fireY}S${ox + 1080} ${oy + 300},${ox + 1370} ${oy + 254}" fill="none" stroke="#47392b" stroke-width="34" opacity=".42"/>
    <path d="M${ox + 70} ${oy + 665}C${ox + 310} ${oy + 590},${ox + 465} ${oy + 515},${fireX} ${fireY}S${ox + 1080} ${oy + 300},${ox + 1370} ${oy + 254}" fill="none" stroke="#9b7651" stroke-width="3" stroke-dasharray="18 14" opacity=".68"/>
    ${fire(fireX, fireY)}
  `;
  let calls = callout(1, fireX + 45, fireY - 54, 1512, 302) + callout(2, ox + 1080, oy + 610, 1512, 428);
  let notes = [
    ['1', 'WATCHFIRE ANCHOR', 'One permanent warm landmark; never a building slot.'],
    ['2', 'OPEN BUILD FIELD', 'Central ground stays visually quiet for player placement.'],
    ['3', 'OLD ROAD SCARS', 'Subtle track and ford connection establish the place.']
  ];
  calls += callout(3, ox + 450, oy + 570, 1512, 554);

  if (stage >= 2) {
    const ring = [[ox + 160, oy + 130],[ox + 365, oy + 72],[ox + 650, oy + 54],[ox + 930, oy + 62],[ox + 1200, oy + 120],[ox + 1340, oy + 255],[ox + 1350, oy + 510],[ox + 1220, oy + 705],[ox + 980, oy + 765],[ox + 700, oy + 776],[ox + 410, oy + 748],[ox + 175, oy + 655],[ox + 82, oy + 448],[ox + 92, oy + 260]];
    mapMarks += `<path d="M${ring.map(p => p.join(' ')).join('L')}Z" fill="none" stroke="#5d3b24" stroke-width="10" opacity=".78" stroke-dasharray="26 10"/>${stakes(ring)}`;
    mapMarks += `<g fill="none" stroke="#aa7b4b" stroke-width="5" opacity=".48"><ellipse cx="${fireX - 240}" cy="${fireY - 62}" rx="106" ry="62"/><ellipse cx="${fireX + 245}" cy="${fireY - 68}" rx="110" ry="66"/><ellipse cx="${fireX - 10}" cy="${fireY + 188}" rx="120" ry="58"/></g>`;
    notes = [
      ['1', 'WATCHFIRE REMAINS', 'The founding point survives every stage.'],
      ['2', 'TENT-RING TRACES', 'Packed ovals and stake holes imply settlement without fixed tents.'],
      ['3', 'PALISADE AT THE EDGE', 'A broken outer ring grows behind the player build field.']
    ];
    calls = callout(1, fireX + 45, fireY - 54, 1512, 302) + callout(2, fireX + 250, fireY - 140, 1512, 428) + callout(3, ox + 1180, oy + 110, 1512, 554);
  }

  if (stage >= 3) {
    mapMarks += `
      <g opacity=".82">
        <path d="M${ox + 238} ${oy + 158}h270v142H${ox + 238}Z" fill="#27231f" fill-opacity=".38" stroke="#8d8070" stroke-width="8"/>
        <path d="M${ox + 256} ${oy + 176}h234v106H${ox + 256}Z" fill="none" stroke="#4f4941" stroke-width="5" stroke-dasharray="12 8"/>
        <path d="M${ox + 340} ${oy + 158}v-92h62v92M${ox + 355} ${oy + 98}h32M${ox + 371} ${oy + 98}v30" fill="none" stroke="#b18a55" stroke-width="7"/>
        <circle cx="${ox + 371}" cy="${oy + 128}" r="14" fill="#a56c31" stroke="#e0bd73" stroke-width="3"/>
      </g>
      <path d="M${ox + 112} ${oy + 690}C${ox + 240} ${oy + 570},${ox + 302} ${oy + 420},${ox + 370} ${oy + 300}" fill="none" stroke="#756b5c" stroke-width="24" opacity=".36"/>
      <path d="M${ox + 1085} ${oy + 730}h150v-62h72" fill="none" stroke="#86613b" stroke-width="12" opacity=".78"/>
    `;
    notes = [
      ['1', 'RESTORED FOUNDATION', 'Fixed waystation footprint occupies the old-road rim, not the center.'],
      ['2', 'BELL LANDMARK', 'A small permanent silhouette makes Stage III readable at a glance.'],
      ['3', 'GATE + STONE APPROACH', 'The ford-to-gate route becomes durable while build space stays free.']
    ];
    calls = callout(1, ox + 265, oy + 290, 1512, 302) + callout(2, ox + 371, oy + 82, 1512, 428) + callout(3, ox + 1180, oy + 708, 1512, 554);
  }

  const title = ['THE WATCHFIRE', 'THE TENT RING', 'THE WAYSTATION'][stage - 1];
  const kicker = ['STAGE I · ARRIVAL', 'STAGE II · THE RING', 'STAGE III · THE STONE'][stage - 1];
  const accent = ['One light claims the dead road.', 'The edge grows; the center remains the player’s.', 'A landmark returns without becoming a fixed town.'][stage - 1];
  // codex:2026-08-03T13:35:00+02:00
  const noteSvg = notes.map(([n, head, body], i) => {
    const bodyLines = wrapWords(body).map((line, lineIndex) => `<tspan x="32" dy="${lineIndex === 0 ? 0 : 20}">${line}</tspan>`).join('');
    return `<g transform="translate(1512 ${278 + i * 126})"><circle cx="0" cy="0" r="17" fill="#111518" stroke="#d8b870" stroke-width="2"/><text x="0" y="6" class="num">${n}</text><text x="32" y="-3" class="head">${head}</text><text x="32" y="25" class="body">${bodyLines}</text></g>`;
  }).join('');

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><font-face font-family="GrimCinzel"><font-face-src><font-face-uri href="data:font/ttf;base64,${fontData}"/></font-face-src></font-face><linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#171b1e"/><stop offset="1" stop-color="#0d1012"/></linearGradient></defs>
    <style>.title{font-family:GrimCinzel,Georgia,serif;font-size:38px;letter-spacing:5px;fill:#f0dca0}.kick{font:700 14px Segoe UI,sans-serif;letter-spacing:3px;fill:#a07840}.accent{font:italic 18px Georgia,serif;fill:#aab0b2}.num{font:700 15px Segoe UI,sans-serif;fill:#f0dca0;text-anchor:middle}.head{font:700 15px Segoe UI,sans-serif;letter-spacing:1px;fill:#d8b870}.body{font:14px Segoe UI,sans-serif;fill:#aab0b2}.footer{font:13px Segoe UI,sans-serif;fill:#8d9295}</style>
    <!-- codex:2026-08-03T13:31:00+02:00 -->
    <rect x="0" y="0" width="${W}" height="94" fill="#111518"/><path d="M28 94H1892" stroke="#5b402d" stroke-width="2"/>
    <text x="38" y="30" class="kick">${kicker}</text><text x="38" y="75" class="title">${title}</text><text x="1455" y="67" class="accent">${accent}</text>
    <rect x="${MAP_X - 8}" y="${MAP_Y - 8}" width="${MAP_W + 16}" height="${MAP_H + 16}" fill="none" stroke="#5b402d" stroke-width="4"/>
    <rect x="1484" y="122" width="408" height="810" fill="url(#panel)" stroke="#5b402d" stroke-width="2"/>
    ${mapMarks}${calls}${noteSvg}
    <path d="M1512 696H1864" stroke="#4a392b"/><text x="1512" y="730" class="head">DESIGN CONTRACT</text>
    <text x="1512" y="766" class="body">• Same ford, road and camera in every stage</text><text x="1512" y="798" class="body">• Additions accumulate; nothing jumps location</text><text x="1512" y="830" class="body">• Edge growth never consumes the central sandbox</text><text x="1512" y="862" class="body">• Night version keeps one warm point: the watchfire</text>
    <text x="28" y="1008" class="footer">CONCEPT ONLY · BASE MAP READ-ONLY · FIXED LANDMARKS STAY BEHIND PLAYER BUILDINGS</text>
  </svg>`);
}

async function renderStage(stage) {
  const base = await sharp(MAP).resize(MAP_W, MAP_H, { fit: 'fill' }).modulate({ brightness: .76, saturation: .72 }).toBuffer();
  const canvas = sharp({ create: { width: W, height: H, channels: 4, background: '#090b0d' } });
  const file = path.join(OUT, `${String(stage).padStart(2, '0')}-${['watchfire','tent-ring','waystation'][stage - 1]}.png`);
  await canvas.composite([{ input: base, left: MAP_X, top: MAP_Y }, { input: stageOverlay(stage), left: 0, top: 0 }]).png({ compressionLevel: 9 }).toFile(file);
  return file;
}

await fs.mkdir(OUT, { recursive: true });
const boards = [];
for (let stage = 1; stage <= 3; stage += 1) boards.push(await renderStage(stage));
const thumbs = await Promise.all(boards.map(file => sharp(file).resize(768, 432).toBuffer()));
await sharp({ create: { width: 768, height: 1296, channels: 4, background: '#090b0d' } }).composite(thumbs.map((input, i) => ({ input, left: 0, top: i * 432 }))).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'overview.png'));

await fs.writeFile(path.join(OUT, 'README.md'), `<!-- codex:2026-08-03T13:26:00+02:00 -->\n# New Haven · sichtbares Kartenwachstum\n\nStatus: reine Konzepttafeln, nicht bindend und nicht produktiv verdrahtet. Der echte Kartengrund \`apps/client/src/renderer/assets/camp/camp_map_day.webp\` wurde ausschließlich gelesen.\n\n## Empfehlung\n\nDie Stufen sollten kumulativ an Rand und Boden erzählt werden, nicht durch fest eingebrannte Nutzgebäude im freien Bauareal:\n\n1. **Wachfeuer:** fester warmer Anker, alte Straßenspur, ansonsten ruhige Fläche.\n2. **Zeltring:** verdichtete Bodenabdrücke und ein unvollständiger Palisadenring am Kartenrand.\n3. **Wegstation:** wiedererkennbare alte Fundamente mit kleinem Glocken-Landmark am Straßenrand, Tor und dauerhaftere Zuwegung.\n\nSo wächst New Haven sichtbar, ohne die frei platzierbaren Gebäude des Spielers zu übermalen. Alle Landmarken müssen dieselben Weltkoordinaten, dieselbe Kamera und eine abgestimmte Tag-/Nachtfassung behalten.\n\n## Dateien\n\n- \`01-watchfire.png\`\n- \`02-tent-ring.png\`\n- \`03-waystation.png\`\n- \`overview.png\`\n`, 'utf8');
