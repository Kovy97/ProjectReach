import { clipboard, ipcMain } from "electron";

/**
 * Bug-Report — Netzwerk- + Clipboard-Pfad (Chef-Auftrag „Report-Bug" 2026-07-18, CEO-Erweiterung:
 * Discord-Webhook als Primärweg, mailto/Kopieren bleibt Fallback; Spieler hängt eigene Screenshots
 * an — KEIN Auto-Capture, s. Chef-Korrektur „der User muss den Screen vom PROBLEM machen").
 *
 * Der Renderer darf laut CSP (`index.html`, default-src 'self') keine Cross-Origin-Requests selbst
 * stellen — sowohl das Lesen der Remote-Config als auch der Discord-POST laufen daher hier im
 * Main-Prozess, der keiner Renderer-CSP unterliegt. Electrons gebündeltes Node (≥18) hat
 * `fetch`/`FormData`/`Blob`/`AbortController` global, kein zusätzliches Package nötig.
 *
 * ALLOWLIST-DISZIPLIN (analog shell.ts' mailto-Filter): die Config-URL muss `https:` sein (der Chef
 * kontrolliert den Inhalt über einen konstanten Renderer-Wert, s. renderer/util/bugReportConfig.ts —
 * kein beliebiger Aufrufer-Input); das Webhook-POST-Ziel muss zusätzlich auf `discord.com` zeigen
 * (echte Discord-Webhook-URLs sehen IMMER so aus) — kein genereller Netzwerk-Proxy für den Renderer.
 */

const CONFIG_TIMEOUT_MS = 4_000;
const WEBHOOK_TIMEOUT_MS = 20_000; // großzügiger als der Config-Fetch — bis zu 3 Bild-Anhänge im Upload.
const MAX_IMAGES = 3;
/** Discord-Webhook-Limit ist 8 MB/Datei; der Renderer skaliert schon vorher herunter (s.
 *  util/bugReportImages.ts) — diese Prüfung ist nur ein defensives zweites Netz. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function isHttpsUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function isDiscordWebhookUrl(url: unknown): url is string {
  if (!isHttpsUrl(url)) return false;
  try {
    return new URL(url).hostname.endsWith("discord.com");
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** `data:image/png;base64,...` oder `data:image/jpeg;base64,...` → rohe Bytes. `null` bei jedem
 *  anderen/kaputten Format — nie werfen, der Aufrufer zählt das schlicht als übersprungen. */
function decodeImageDataUrl(dataUrl: string): { buf: Buffer; ext: "png" | "jpg"; mime: string } | null {
  const match = /^data:image\/(png|jpeg);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const mimeType = match[1];
    const buf = Buffer.from(match[2]!, "base64");
    return mimeType === "jpeg" ? { buf, ext: "jpg", mime: "image/jpeg" } : { buf, ext: "png", mime: "image/png" };
  } catch {
    return null;
  }
}

export function registerBugReportHandlers(): void {
  // Remote-Config lesen (JSON `{ "webhook": "https://discord.com/api/webhooks/…" }`) — erlaubt dem
  // Chef, den Webhook später zu rotieren, ohne einen neuen Client-Build auszuliefern. Liefert IMMER
  // `{ webhook: null }` statt zu werfen (Timeout/kaputtes JSON/nicht erreichbar sind KEIN Fehlerfall,
  // s. util/bugReportConfig.ts — der Renderer fällt dann auf den eingebauten Default-Webhook zurück).
  ipcMain.handle("bugreport:fetchConfig", async (_event, url: unknown) => {
    if (!isHttpsUrl(url)) return { webhook: null };
    try {
      const res = await fetchWithTimeout(url, { method: "GET" }, CONFIG_TIMEOUT_MS);
      if (!res.ok) return { webhook: null };
      const data = (await res.json()) as { webhook?: unknown };
      return { webhook: isDiscordWebhookUrl(data.webhook) ? data.webhook : null };
    } catch {
      return { webhook: null };
    }
  });

  // Sendet den Report an einen Discord-Webhook. Ohne Bilder: reines JSON. Mit Bildern: multipart/
  // form-data (`payload_json` + `files[0..2]`) — `fetch` setzt Content-Type inkl. Boundary
  // automatisch, sobald `body` ein `FormData` ist.
  ipcMain.handle("bugreport:sendWebhook", async (_event, url: unknown, payload: unknown, images: unknown) => {
    if (!isDiscordWebhookUrl(url)) return { ok: false, attachedImages: 0, skippedImages: 0 };
    const imageList = (Array.isArray(images) ? images : []).filter((x): x is string => typeof x === "string").slice(0, MAX_IMAGES);

    try {
      if (imageList.length === 0) {
        const res = await fetchWithTimeout(
          url,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
          WEBHOOK_TIMEOUT_MS,
        );
        return { ok: res.ok, status: res.status, attachedImages: 0, skippedImages: 0 };
      }

      const form = new FormData();
      form.append("payload_json", JSON.stringify(payload));
      let attachedImages = 0;
      let skippedImages = 0;
      imageList.forEach((dataUrl, i) => {
        const decoded = decodeImageDataUrl(dataUrl);
        if (!decoded || decoded.buf.byteLength > MAX_IMAGE_BYTES) {
          skippedImages++;
          return;
        }
        // Uint8Array.from(...) statt des rohen Buffers: Node-Buffer typisiert seinen `.buffer` als
        // `ArrayBufferLike` (inkl. SharedArrayBuffer), Blob's `BlobPart` verlangt ein konkretes
        // `ArrayBuffer` — eine frische Kopie räumt den Typkonflikt aus (Laufzeit unverändert).
        form.append(`files[${attachedImages}]`, new Blob([Uint8Array.from(decoded.buf)], { type: decoded.mime }), `screenshot-${i + 1}.${decoded.ext}`);
        attachedImages++;
      });

      const res = await fetchWithTimeout(url, { method: "POST", body: form }, WEBHOOK_TIMEOUT_MS);
      return { ok: res.ok, status: res.status, attachedImages, skippedImages };
    } catch {
      return { ok: false, attachedImages: 0, skippedImages: imageList.length };
    }
  });

  // „Aus Zwischenablage einfügen" (Chef-Vorgabe: Electron `clipboard.readImage` bevorzugt — laut
  // Chef zuverlässiger als die Browser-`navigator.clipboard`-API, die der Renderer als Fallback
  // nutzt, wenn diese Bridge fehlt, s. util/bugReport.ts). `null` = kein Bild im Clipboard (der
  // Renderer zeigt dann eine freundliche Meldung statt eines stillen No-Ops).
  ipcMain.handle("bugreport:readClipboardImage", () => {
    const image = clipboard.readImage();
    if (image.isEmpty()) return null;
    const size = image.getSize();
    return { dataUrl: `data:image/png;base64,${image.toPNG().toString("base64")}`, width: size.width, height: size.height };
  });
}
