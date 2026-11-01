import { BrowserWindow, ipcMain, Notification } from "electron";

/**
 * claude:2026-10-31T16:34:28+01:00 — Desktop-Benachrichtigungen (1.4.2, Opt-in in den Optionen).
 *
 * Der Renderer erkennt das Ereignis (Zustands-Diff) und schickt nur zwei kurze Texte. Main entscheidet
 * mit der EIGENEN Fenster-Wahrheit, ob wirklich benachrichtigt wird: nie bei fokussiertem Fenster. Kein
 * Klick-Handler außer „Fenster nach vorn", keine Aktion, keine Daten zurück. Längen sind hart begrenzt.
 */
const MAX_TITLE = 80;
const MAX_BODY = 200;

export function registerNotifyHandlers(): void {
  ipcMain.handle("notify:show", (event, title: unknown, body: unknown): boolean => {
    if (typeof title !== "string" || typeof body !== "string") return false;
    if (!Notification.isSupported()) return false;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed() || win.isFocused()) return false;
    const note = new Notification({ title: title.slice(0, MAX_TITLE), body: body.slice(0, MAX_BODY), silent: false });
    note.on("click", () => {
      if (win.isDestroyed()) return;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    });
    note.show();
    return true;
  });
  ipcMain.handle("notify:supported", (): boolean => Notification.isSupported());
}
