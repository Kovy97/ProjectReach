/**
 * Bug-Report — Bild-Anhänge (Chef-Korrektur 2026-07-18: KEIN Auto-Capture, der Spieler hängt seinen
 * EIGENEN Screenshot vom Problem an — per Datei-Auswahl, Drag&Drop oder Zwischenablage-Einfügen).
 * Bis zu 3 Bilder je Report (s. `MAX_IMAGES`), zu große Dateien werden client-seitig per Canvas
 * herunterskaliert statt abgelehnt (Discord-Limit 8 MB/Datei).
 */

export interface BugReportImage {
  id: string;
  dataUrl: string;
  name: string;
}

export const MAX_IMAGES = 3;

/** Ab dieser Größe wird herunterskaliert — Discord erlaubt 8 MB/Datei, Puffer statt Ablehnen. */
const DOWNSCALE_THRESHOLD_BYTES = 7 * 1024 * 1024;
/** Ziel-Kantenlänge (längste Seite) beim Herunterskalieren. */
const MAX_DIMENSION = 2000;

function newImageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Grobe Byte-Schätzung einer Base64-DataURL (Base64 ist ~4/3 der Rohgröße). */
function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.ceil((base64.length * 3) / 4);
}

function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

/** Skaliert ein zu großes Bild über eine Offscreen-Canvas auf `MAX_DIMENSION` herunter und
 *  re-encoded als JPEG (kompakter als PNG für foto-/screenshot-artige Bilder). Schlägt das
 *  Decodieren/Zeichnen fehl, wird defensiv die ORIGINAL-DataURL zurückgegeben — lieber ein zu
 *  großer Anhang als ein kaputter. */
function downscaleDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Verkleinert eine DataURL nur, wenn sie über dem Schwellwert liegt — sonst unverändert. Geteilt
 *  zwischen dem Datei-/Drop-Pfad UND dem Zwischenablage-Pfad (Clipboard-Bilder können ebenso groß
 *  sein wie eine volle PNG-Bildschirmaufnahme). */
export async function ensureUnderSizeLimit(dataUrl: string): Promise<string> {
  if (dataUrlByteLength(dataUrl) <= DOWNSCALE_THRESHOLD_BYTES) return dataUrl;
  return downscaleDataUrl(dataUrl);
}

/** Baut aus einer ausgewählten/gedroppten Bilddatei einen `BugReportImage`-Eintrag. `null` bei
 *  Nicht-Bild-Dateien (z.B. versehentlich eine .txt reingezogen). */
export async function prepareImageFile(file: File): Promise<BugReportImage | null> {
  if (!file.type.startsWith("image/")) return null;
  const raw = await readFileAsDataUrl(file);
  const dataUrl = await ensureUnderSizeLimit(raw);
  return { id: newImageId(), dataUrl, name: file.name || "screenshot" };
}

/** Baut aus einer bereits vorliegenden DataURL (Zwischenablage-Pfad) einen `BugReportImage`-Eintrag. */
export async function prepareImageDataUrl(dataUrl: string, name: string): Promise<BugReportImage> {
  return { id: newImageId(), dataUrl: await ensureUnderSizeLimit(dataUrl), name };
}
