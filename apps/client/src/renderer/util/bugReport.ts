import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { formatPlaytime } from "./format";
import { SUPPORT_EMAIL } from "./bugReportConfig";
import type { BugReportImage } from "./bugReportImages";

/**
 * Bug-Report — Report-Text/Payload-Bausteine + Sende-/Zwischenablage-Orchestrierung (Chef-Auftrag
 * „Report-Bug" 2026-07-18 + CEO-Erweiterungen). Reine Funktionen, wo möglich — die einzigen
 * Seiteneffekte sind die beiden dünnen Bridge-Wrapper ganz unten.
 */

export interface AutoAttachedRow {
  label: string;
  value: string;
}

/**
 * Baut die Zeilen des „Automatisch angehängt"-Blocks. `state === null` → Hauptmenü-Kontext (kein
 * Spielstand geladen) — der Spielstand-Teil entfällt dann komplett (Chef-Vorgabe).
 */
export function buildAutoAttachedRows(
  t: (key: string) => string,
  state: GameState | null,
  screenLabel: string | null,
): AutoAttachedRow[] {
  const platform = window.hearthforge?.platform ?? navigator.platform ?? "unknown";
  const rows: AutoAttachedRow[] = [
    { label: t("bugReport.autoAttached.version"), value: __APP_VERSION__ },
    { label: t("bugReport.autoAttached.saveVersion"), value: String(SAVE_VERSION) },
    { label: t("bugReport.autoAttached.platform"), value: `${platform} — ${navigator.userAgent}` },
  ];
  if (screenLabel) rows.push({ label: t("bugReport.autoAttached.screen"), value: screenLabel });
  if (state) {
    rows.push({ label: t("bugReport.autoAttached.playtime"), value: formatPlaytime(state.activePlayMs) });
    rows.push({ label: t("bugReport.autoAttached.character"), value: state.character.name });
    rows.push({ label: t("bugReport.autoAttached.totalLevel"), value: String(state.character.totalLevel) });
  }
  return rows;
}

export function autoAttachedToText(rows: AutoAttachedRow[]): string {
  return rows.map((r) => `${r.label}: ${r.value}`).join("\n");
}

const MAILTO_BODY_LIMIT = 1800;
const DISCORD_EMBED_LIMIT = 3800;
/** Gold-Ton (--gold) als Embed-Seitenfarbe — dieselbe Palette wie der Rest der UI. */
const DISCORD_EMBED_COLOR = 0xd8c06a;

/** Voller, ungekürzter Report-Text (Beschreibung + Auto-Block) — für „Report kopieren" (Clipboard
 *  hat kein Längenlimit, anders als mailto-URLs/Discord-Embeds). */
export function buildFullReportText(
  description: string,
  autoBlockText: string,
  t: (key: string) => string,
): string {
  return `${description}\n\n---\n${t("bugReport.autoAttached")}\n${autoBlockText}`;
}

/** `mailto:`-URL — Subject trägt die App-Version, Body ist der volle Report-Text, defensiv auf
 *  ~1800 Zeichen gekürzt (manche Mail-Clients/OS kappen sehr lange `mailto:`-URLs sonst hart). */
export function buildMailtoUrl(description: string, autoBlockText: string, t: (key: string) => string): string {
  const subject = `[Grim Reach] Bug Report (v${__APP_VERSION__})`;
  let body = buildFullReportText(description, autoBlockText, t);
  if (body.length > MAILTO_BODY_LIMIT) {
    body = `${body.slice(0, MAILTO_BODY_LIMIT)}\n\n[${t("bugReport.truncatedNote")}]`;
  }
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export interface DiscordPayload {
  content: string;
  embeds: Array<{ description: string; color: number; timestamp: string }>;
}

/** Discord-Webhook-Payload: Titel-Zeile (mit Version) als `content`, Beschreibung + Auto-Block
 *  (als Codeblock) im Embed. Bild-Anhänge werden NICHT hier referenziert (Discord zeigt mehrere
 *  `files[]`-Anhänge automatisch als Galerie unter der Nachricht) — s. main/bugReport.ts. */
export function buildDiscordPayload(
  description: string,
  autoBlockText: string,
  t: (key: string) => string,
  contact = "",
): DiscordPayload {
  // Der Kontakt steht bewusst GANZ OBEN im Post, nicht unten im Auto-Block: er ist die
  // einzige Angabe, nach der der Chef ueberhaupt handeln kann (antworten oder nicht).
  // Leer = der Spieler will keine Antwort, dann steht dort auch nichts.
  const kontakt = contact.trim().slice(0, 80);
  const content = `🐞 Grim Reach — Bug Report (v${__APP_VERSION__})`;
  let body = `${kontakt ? `**${t("bugReport.contactLabel")}** ${kontakt}\n\n` : ""}**${t("bugReport.descLabel")}**\n${description}\n\n**${t("bugReport.autoAttached")}**\n\`\`\`\n${autoBlockText}\n\`\`\``;
  if (body.length > DISCORD_EMBED_LIMIT) {
    body = `${body.slice(0, DISCORD_EMBED_LIMIT)}\n…[${t("bugReport.truncatedNote")}]`;
  }
  return {
    content,
    embeds: [{ description: body, color: DISCORD_EMBED_COLOR, timestamp: new Date().toISOString() }],
  };
}

/** Postet den Report an den (bereits aufgelösten) Webhook, über den Main-Prozess (s.
 *  main/bugReport.ts) — die Renderer-CSP erlaubt keinen direkten Cross-Origin-POST. Ohne
 *  Electron-Bridge (Web-/Sim-Build ohne Mock) gibt es keinen Sendeweg → `ok: false`. */
export async function sendBugReportWebhook(
  webhookUrl: string,
  payload: DiscordPayload,
  images: BugReportImage[],
): Promise<BugReportSendResult> {
  const bridge = window.hearthforge?.bugReport;
  if (!bridge) return { ok: false, attachedImages: 0, skippedImages: images.length };
  try {
    return await bridge.sendWebhook(webhookUrl, payload, images.map((img) => img.dataUrl));
  } catch {
    return { ok: false, attachedImages: 0, skippedImages: images.length };
  }
}

/**
 * „Aus Zwischenablage einfügen" — bevorzugt den Electron-IPC-Weg (`clipboard.readImage`, laut Chef
 * zuverlässiger als die Browser-API), fällt ohne Bridge (Web-/Sim-Build) auf `navigator.clipboard`
 * zurück. `null` = kein Bild im Clipboard gefunden (der Aufrufer zeigt dann eine freundliche
 * Meldung statt eines stillen No-Ops).
 */
export async function readClipboardImageDataUrl(): Promise<string | null> {
  const bridge = window.hearthforge?.bugReport;
  if (bridge) {
    try {
      const img = await bridge.readClipboardImage();
      if (img) return img.dataUrl;
      return null;
    } catch {
      // IPC-Weg fehlgeschlagen — weiter zum Browser-Fallback statt sofort aufzugeben.
    }
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((ty) => ty.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });
    }
    return null;
  } catch {
    return null;
  }
}
