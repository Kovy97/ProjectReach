import { ipcMain, shell } from "electron";

/**
 * Minimaler externer-Link-Öffner (Report-Bug-Feature, Chef-Auftrag 2026-07-18): öffnet eine URL im
 * System-Standardprogramm — hier ausschließlich für `mailto:`-Links (Bug-Report „Per E-Mail senden").
 *
 * SICHERHEIT: striktes Allowlist auf das `mailto:`-Schema, KEINE Ausnahmen. Ein Renderer-Prozess,
 * der beliebige `shell.openExternal()`-Aufrufe triggern könnte, wäre ein Einfallstor (z.B.
 * `file://`- oder benutzerdefinierte Protokoll-Links, die lokale Programme mit
 * attacker-kontrollierten Argumenten starten).
 */
export function registerShellHandlers(): void {
  ipcMain.handle("shell:openExternal", (_event, url: unknown) => {
    // mailto: für den Fehlerbericht; https://discord.gg / discord.com/invite für den Discord-Knopf (Chef-Link in renderer/util/links.ts).
    if (typeof url !== "string" || !(/^mailto:/i.test(url) || /^https:\/\/(discord\.gg|discord\.com\/invite)\//i.test(url))) return false;
    void shell.openExternal(url);
    return true;
  });
}
