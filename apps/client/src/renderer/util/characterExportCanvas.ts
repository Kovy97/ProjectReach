import {
  EQUIP_SLOTS,
  EQUIP_SLOT_LABELS,
  RARITY_COLORS,
  RARITY_LABEL,
  getItemRarity,
  resolveText,
  type ContentDB,
} from "@hearthforge/shared";
import { getItemImage } from "../items";
import type { CharacterExportInput } from "./characterExportPrompt";

/**
 * Prompt-Extractor (Chef-Auftrag 28.08.2026): baut `kit.png` (Ausrüstungs-Blatt) und `portrait.png`
 * rein per Canvas-2D — KEIN DOM-Screenshot (unabhängig von der UI-Skalierung/dem Zoom des
 * Spielfensters, immer scharf, s. design/prompt-extractor.md). Beide Renderer sind async (Bilder
 * müssen erst laden) und geben eine fertige `data:image/png;base64,…`-URL zurück.
 *
 * Palette 1:1 aus styles/base.css (":root" Ashen-Iron-Tokens) übernommen — Canvas kennt keine CSS-
 * Variablen, daher hier als literale Hex-Werte (Kommentar nennt jeweils die Quelle, damit ein
 * künftiger Theme-Wechsel beide Stellen findet).
 */
const COL_BG = "#0d0f12"; // --bg-deep
const COL_PANEL = "#1e2329"; // --panel
const COL_PANEL_2 = "#161a1e"; // etwas dunkler als --panel, für die Bild-Kachel im Slot
const COL_BORDER = "#333c44"; // --border
const COL_BORDER_BRIGHT = "#4d5963"; // --border-bright
const COL_TEXT = "#ccd5db"; // --text
const COL_MUTED = "#79848c"; // --muted
const COL_GOLD = "#d8c06a"; // --gold

const KIT_W = 2048;
const KIT_H = 1152;
const MARGIN = 40;
const HEADER_H = 150;
const PORTRAIT_W = 640;
const GRID_COLS = 4;

const HEAD_FONT = '"IM Fell English SC", Georgia, "Times New Roman", serif';
const BODY_FONT = 'Georgia, "Times New Roman", serif';

/** Best-effort: lädt die Kopf-/Fließtext-Schriften, bevor Canvas-Text gezeichnet wird — Canvas
 *  rendert (anders als DOM-Text) mit der Fallback-Schrift, wenn die echte Schrift zum Zeichen-
 *  Zeitpunkt noch nicht geladen ist. Bricht NIE — ein Timeout/Fehler zeichnet einfach mit dem
 *  generischen Serif-Fallback weiter (immer noch lesbar, nur nicht 1:1 die App-Schrift). */
async function ensureFontsReady(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`700 48px ${HEAD_FONT}`), document.fonts.load(`16px ${BODY_FONT}`)]),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  } catch {
    // Fallback-Serif reicht — kein harter Fehler wegen einer Schrift.
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src}`));
    img.src = src;
  });
}

/** Zeichnet `img` zentriert und seitenverhältnis-erhaltend in das Rechteck (x,y,w,h) — "contain",
 *  wie `.item-cell img { object-fit: contain }` im DOM (s. styles/achievements.css u.a.). */
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Bricht Text hart auf `maxWidth` um (Wort-Grenzen), max. `maxLines` Zeilen — die letzte
 *  gezeigte Zeile bekommt eine „…"-Ellipse, wenn noch Text übrig wäre. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = attempt;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1]!;
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      lines[maxLines - 1] = last.slice(0, -1);
    }
    if (words.join(" ").length > lines.join(" ").length) lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
  }
  return lines;
}

/**
 * Baut das Ausrüstungs-Blatt (2048×1152): Kopfzeile (Name/Level/Stil), großes Portrait links, alle
 * 14 Ausrüstungsplätze als Kacheln rechts (Bild/Name/Rarity/Slot-Beschriftung, leer = "empty").
 * Alle Texte bewusst Englisch (`resolveText(…, "en")`) — begleitet den ebenfalls englischen
 * `prompt.txt` unabhängig von der aktiven UI-Sprache.
 */
export async function renderKitCanvas(
  input: CharacterExportInput,
  content: ContentDB,
  portraitUrl: string | null,
  kitLabel: string,
): Promise<HTMLCanvasElement> {
  await ensureFontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = KIT_W;
  canvas.height = KIT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D-Canvas-Kontext nicht verfügbar");

  // Hintergrund + Außenrahmen.
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, KIT_W, KIT_H);
  ctx.strokeStyle = COL_BORDER_BRIGHT;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, KIT_W - 3, KIT_H - 3);

  // Kopfzeile.
  ctx.fillStyle = COL_PANEL;
  ctx.fillRect(0, 0, KIT_W, HEADER_H);
  ctx.strokeStyle = COL_GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H);
  ctx.lineTo(KIT_W, HEADER_H);
  ctx.stroke();

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COL_GOLD;
  ctx.font = `700 52px ${HEAD_FONT}`;
  ctx.fillText(input.name, MARGIN, 78);

  const styleLabel = input.style === "melee" ? "Melee" : input.style === "ranged" ? "Ranged" : "Magic";
  ctx.fillStyle = COL_TEXT;
  ctx.font = `24px ${BODY_FONT}`;
  ctx.fillText(`Total level ${input.totalLevel}  ·  ${styleLabel}  ·  ${kitLabel}`, MARGIN, 118);

  // Portrait — links, groß.
  const px = MARGIN;
  const py = HEADER_H + MARGIN;
  const ph = KIT_H - HEADER_H - MARGIN * 2;
  ctx.fillStyle = COL_PANEL_2;
  ctx.fillRect(px, py, PORTRAIT_W, ph);
  ctx.strokeStyle = COL_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, PORTRAIT_W - 2, ph - 2);
  if (portraitUrl) {
    try {
      const img = await loadImage(portraitUrl);
      drawContain(ctx, img, px + 12, py + 12, PORTRAIT_W - 24, ph - 24);
    } catch {
      // Kein Portrait ladbar (z.B. kaputte Daten-URL) — leere Kachel bleibt, Rest des Blatts geht weiter.
    }
  }

  // Ausrüstungs-Gitter — rechts, 4 Spalten, so viele Zeilen wie EQUIP_SLOTS.length/4 braucht (14 → 4
  // Zeilen, letzte Zeile 2 leer gelassen — dasselbe Muster wie das Inventar-Gitter der Charakterseite).
  const gx = px + PORTRAIT_W + MARGIN;
  const gy = py;
  const gw = KIT_W - MARGIN - gx;
  const gh = ph;
  const rows = Math.ceil(EQUIP_SLOTS.length / GRID_COLS);
  const cellW = gw / GRID_COLS;
  const cellH = gh / rows;
  const cellPad = 10;
  const imgSize = Math.min(cellW, cellH) - 96;

  EQUIP_SLOTS.forEach((slot, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const cx = gx + col * cellW + cellPad;
    const cy = gy + row * cellH + cellPad;
    const cw = cellW - cellPad * 2;
    const ch = cellH - cellPad * 2;

    const itemId = input.equipment[slot];
    const item = itemId ? content.items[itemId] : undefined;
    const rarity = item ? getItemRarity(item) : undefined;
    const borderCol = rarity ? RARITY_COLORS[rarity] : COL_BORDER;

    ctx.fillStyle = COL_PANEL;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = item ? 2.5 : 1.5;
    ctx.strokeRect(cx + 1, cy + 1, cw - 2, ch - 2);
  });

  // Bilder asynchron nachladen (Canvas-Zeichnen selbst ist synchron — die Bild-Fetches vorher alle
  // parallel anstoßen, dann in Zeichenreihenfolge auftragen, damit spätere Kacheln nie über
  // frühere „drüberlaufen").
  const tileImages = await Promise.all(
    EQUIP_SLOTS.map(async (slot) => {
      const itemId = input.equipment[slot];
      if (!itemId) return null;
      const src = getItemImage(itemId);
      if (!src) return null;
      try {
        return await loadImage(src);
      } catch {
        return null;
      }
    }),
  );

  EQUIP_SLOTS.forEach((slot, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const cx = gx + col * cellW + cellPad;
    const cy = gy + row * cellH + cellPad;
    const cw = cellW - cellPad * 2;

    const slotLabel = resolveText(EQUIP_SLOT_LABELS[slot], "en");
    const itemId = input.equipment[slot];
    const item = itemId ? content.items[itemId] : undefined;
    const img = tileImages[i];

    const textX = cx + cw / 2;
    let textY: number;

    if (img) {
      drawContain(ctx, img, cx + (cw - imgSize) / 2, cy + 16, imgSize, imgSize);
      textY = cy + imgSize + 40;
    } else {
      textY = cy + imgSize / 2 + 20;
    }

    ctx.textAlign = "center";
    if (item) {
      const rarity = getItemRarity(item);
      ctx.fillStyle = COL_TEXT;
      ctx.font = `600 19px ${BODY_FONT}`;
      const nameLines = wrapLines(ctx, resolveText(item.name, "en"), cw - 16, 2);
      nameLines.forEach((line, li) => ctx.fillText(line, textX, textY + li * 22));
      const afterName = textY + nameLines.length * 22 + 4;

      ctx.fillStyle = RARITY_COLORS[rarity];
      ctx.font = `15px ${BODY_FONT}`;
      ctx.fillText(resolveText(RARITY_LABEL[rarity], "en"), textX, afterName);

      ctx.fillStyle = COL_MUTED;
      ctx.font = `13px ${BODY_FONT}`;
      ctx.fillText(slotLabel, textX, afterName + 20);
    } else {
      ctx.fillStyle = COL_MUTED;
      ctx.font = `italic 18px ${BODY_FONT}`;
      ctx.fillText("empty", textX, textY + 4);
      ctx.font = `13px ${BODY_FONT}`;
      ctx.fillText(slotLabel, textX, textY + 24);
    }
    ctx.textAlign = "left";
  });

  return canvas;
}

/** Wandelt das Portrait-Asset (WebP/PNG/Daten-URL) 1:1 in Originalgröße nach PNG — reines
 *  Canvas-Redraw, kein Zuschnitt/Resize. */
export async function renderPortraitCanvas(portraitUrl: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(portraitUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D-Canvas-Kontext nicht verfügbar");
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}
