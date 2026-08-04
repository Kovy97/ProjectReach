/**
 * Bug-Report — Konfiguration + Webhook-Auflösung (Chef-Auftrag „Report-Bug" 2026-07-18,
 * CEO-Erweiterung: Discord-Webhook als Primärweg, mailto/Kopieren bleibt Fallback).
 *
 * Alle Konstanten unten sind bewusst an EINER Stelle gebündelt — der Chef kann sie jederzeit
 * ändern, ohne im restlichen Feature-Code suchen zu müssen.
 */

/** Ziel-Mailadresse des mailto-/Kopieren-Fallbacks. Chef kann hier jederzeit eine dedizierte
 *  Bug-Adresse eintragen (aktuell die private Adresse als Startwert). */
export const SUPPORT_EMAIL = "M.Schuster97@gmx.de";

/**
 * Chef-Discord-Webhook (2026-07-18, vom CEO mit HTTP 204 verifiziert) — trägt den Primär-Sendeweg
 * ab dem ersten Build, ganz ohne Remote-Config. Bei Missbrauch/Spam: im Discord-Server rotieren
 * (neuer Webhook anlegen, diese Konstante ersetzen — die alte URL wird dadurch automatisch ungültig).
 */
const DEFAULT_BUG_WEBHOOK =
  "https://discord.com/api/webhooks/1528092893250584738/Vw78XxnYT-r7po8aTzHH5rcMfZaeE0Aua09IMzWm8rKbhsPSXAmaSe-cDRVBLqT2MTfR";

/**
 * URL einer kleinen, öffentlich lesbaren JSON-Datei `{ "webhook": "https://discord.com/api/webhooks/…" }`
 * — erlaubt, den Webhook später zu rotieren, OHNE einen neuen Client-Build auszuliefern. PLATZHALTER:
 * bis der Chef eine echte URL liefert (z.B. GitHub-Pages/RAW-Link), schlägt der Abruf defensiv fehl —
 * das ist KEIN Fehlerfall, `resolveBugReportWebhook` fällt dann einfach auf `DEFAULT_BUG_WEBHOOK` zurück.
 */
const BUG_REPORT_CONFIG_URL = "https://example.invalid/grim-reach-bugreport-config.json";

/**
 * Test-Override (Sim-/Dev-Agenten): eine komplette Webhook-URL in
 * `localStorage.setItem("bugReportWebhookOverride", "<url>")` hat Vorrang vor Remote-Config UND
 * Default — zeigt z.B. auf einen lokalen Fake-Endpoint, ohne den echten Chef-Webhook zu treffen.
 * NIE im Produkt-Code gesetzt, nur manuell/per Testskript.
 */
const OVERRIDE_STORAGE_KEY = "bugReportWebhookOverride";

let webhookPromise: Promise<string | null> | null = null;

/**
 * Löst die aktive Webhook-URL auf: Dev-Override → Remote-Config → eingebetteter Default.
 * Session-gecached (ein Auflösungsversuch pro App-Start reicht, die Config ändert sich nicht
 * während einer Sitzung). Der Remote-Config-Schritt läuft über den Main-Prozess (Renderer-CSP
 * erlaubt keine Cross-Origin-Fetches, s. main/bugReport.ts); ohne Electron-Bridge (Web-/Sim-Build)
 * wird dieser Schritt übersprungen, der eingebettete Default gilt trotzdem.
 */
export function resolveBugReportWebhook(): Promise<string | null> {
  if (!webhookPromise) {
    webhookPromise = (async () => {
      try {
        const override = localStorage.getItem(OVERRIDE_STORAGE_KEY);
        if (override && override.trim()) return override.trim();
      } catch {
        // localStorage kann in seltenen Sandbox-Kontexten fehlen — dann einfach weiter zur Remote-Config.
      }

      const bridge = window.hearthforge?.bugReport;
      if (bridge) {
        try {
          const result = await bridge.fetchConfig(BUG_REPORT_CONFIG_URL);
          if (result?.webhook) return result.webhook;
        } catch {
          // Remote-Config nicht erreichbar/kaputt — kein Fehlerfall, s. Kommentar oben.
        }
      }

      return DEFAULT_BUG_WEBHOOK;
    })();
  }
  return webhookPromise;
}

/** Nur für Tests: erzwingt beim nächsten Aufruf einen frischen Auflösungsversuch. */
export function resetBugReportWebhookCache(): void {
  webhookPromise = null;
}
