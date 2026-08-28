import { content } from "@hearthforge/content";
import { computeStats } from "@hearthforge/engine";
import type { GameState } from "@hearthforge/shared";
import { getPortrait, listPortraits } from "../portraits";
import { buildCharacterExportPrompt, type CharacterExportInput } from "./characterExportPrompt";
import { canvasToPngDataUrl, renderKitCanvas, renderPortraitCanvas } from "./characterExportCanvas";
import { pushUiToast } from "./toastBus";

/**
 * Prompt-Extractor (Chef-Auftrag 28.08.2026, design/prompt-extractor.md): der EIN-KLICK-Orchestrator
 * hinter dem „Charakter exportieren"-Knopf (CharacterPage.tsx, Kit-Zeile). Baut `kit.png` +
 * `portrait.png` per Canvas (s. characterExportCanvas.ts) und `prompt.txt` (s.
 * characterExportPrompt.ts), reicht alle drei über die `window.hearthforge.export`-Bridge an den
 * Main-Prozess durch (main/characterExport.ts schreibt sie nach Downloads + öffnet den Ordner),
 * legt das Prompt zusätzlich in die Zwischenablage und meldet Erfolg/Fehler per UI-Toast
 * (util/toastBus.ts — derselbe Bus wie New Havens „Bau abgebrochen"-Meldung).
 *
 * Einmal beim Modul-Laden berechnet (Portraits ändern sich nie zur Laufzeit) — dasselbe Fallback-
 * Muster wie CharacterPage.tsx' `ALL_PORTRAITS`.
 */
const ALL_PORTRAITS = listPortraits();

export async function exportCharacterKit(state: GameState, t: (key: string) => string): Promise<void> {
  const c = state.character;
  const stats = computeStats(state, content);
  const input: CharacterExportInput = {
    name: c.name,
    totalLevel: c.totalLevel,
    style: stats.style,
    equipment: c.equipment,
  };
  // Dasselbe Fallback wie das große Porträt auf der Charakterseite (App.tsx' usePortraitFallback
  // korrigiert `character.portrait` selbst i.d.R. schon vorher — dies fängt nur den kurzen
  // Zeitraum davor bzw. jeden sonst übersehenen Fall ab).
  const portraitSrc = getPortrait(c.portrait) ?? getPortrait(ALL_PORTRAITS[0]?.id);

  try {
    const kitCanvas = await renderKitCanvas(input, content, portraitSrc, `Kit ${state.activeKit + 1}`);
    const kitDataUrl = canvasToPngDataUrl(kitCanvas);

    let portraitDataUrl: string | null = null;
    if (portraitSrc) {
      try {
        portraitDataUrl = canvasToPngDataUrl(await renderPortraitCanvas(portraitSrc));
      } catch {
        portraitDataUrl = null; // kit.png + prompt.txt trotzdem ausliefern, nur ohne portrait.png.
      }
    }

    const prompt = buildCharacterExportPrompt(input, content);

    // UI-Audit-Debug-Hook (dev-only, "__hfDebug"-Präzedenz s. GameContext.tsx setDebugHook): der
    // Sim-Harness läuft als reiner Playwright-Browser OHNE Electron/Preload — `window.hearthforge`
    // existiert dort nie. Damit ein Tester-Skript `kit.png` trotzdem visuell prüfen kann (Chef-
    // Auftrag verlangt genau das), landet das zuletzt gebaute Ergebnis zusätzlich hier. Gestrippt
    // aus Prod-Builds (`import.meta.env.DEV`, Vite tree-shaked den toten Zweig weg) — ändert nie
    // das Verhalten, nur die Beobachtbarkeit im Dev-Server.
    if (import.meta.env.DEV) {
      (window as unknown as { __hfLastExport?: { kitDataUrl: string; portraitDataUrl: string | null; prompt: string } }).__hfLastExport = {
        kitDataUrl,
        portraitDataUrl,
        prompt,
      };
    }

    const bridge = window.hearthforge?.export;
    if (!bridge) {
      // Nur relevant außerhalb der echten Desktop-App (z.B. ein reiner Browser-Preview-Kontext ohne
      // Electron-Preload) — im ausgelieferten Spiel existiert die Bridge immer.
      pushUiToast({
        icon: "⚠",
        title: t("char.export.toast.error.title"),
        detail: t("char.export.error.noBridge"),
      });
      return;
    }

    const files: { name: string; dataUrl?: string; text?: string }[] = [{ name: "kit.png", dataUrl: kitDataUrl }];
    if (portraitDataUrl) files.push({ name: "portrait.png", dataUrl: portraitDataUrl });
    files.push({ name: "prompt.txt", text: prompt });

    const result = await bridge.characterKit(c.name, files);
    if (!result?.ok) {
      pushUiToast({
        icon: "⚠",
        title: t("char.export.toast.error.title"),
        detail: t("char.export.error.writeFailed"),
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Best-effort — die Dateien liegen so oder so schon auf der Platte, das ist der Haupterfolg;
      // eine kaputte/verweigerte Zwischenablage soll den erfolgreichen Export nicht als Fehler zeigen.
    }

    pushUiToast({
      icon: "🖼",
      title: t("char.export.toast.title"),
      detail: t("char.export.toast.detail"),
    });
  } catch (err) {
    console.error("[characterExport] Export fehlgeschlagen:", err);
    pushUiToast({
      icon: "⚠",
      title: t("char.export.toast.error.title"),
      detail: t("char.export.error.render"),
    });
  }
}
