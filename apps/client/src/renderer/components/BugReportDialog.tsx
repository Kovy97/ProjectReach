import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { useGameStateMaybe } from "../game/GameContext";
import { registerEscCloser } from "../util/escStack";
import { SUPPORT_EMAIL, resolveBugReportWebhook } from "../util/bugReportConfig";
import {
  autoAttachedToText,
  buildAutoAttachedRows,
  buildDiscordPayload,
  buildFullReportText,
  buildMailtoUrl,
  readClipboardImageDataUrl,
  sendBugReportWebhook,
} from "../util/bugReport";
import { MAX_IMAGES, prepareImageDataUrl, prepareImageFile } from "../util/bugReportImages";
import type { BugReportImage } from "../util/bugReportImages";
import "../styles/bug-report.css";

type SendState = "idle" | "sending" | "success" | "error";

export interface BugReportDialogProps {
  onClose: () => void;
  /** Bereits lokalisiertes Label des Screens, von dem aus der Dialog geöffnet wurde (z.B. der
   *  Options-Seitentitel, oder "Main Menu"). `null`/`undefined` → die Zeile entfällt im Auto-Block. */
  screenLabel?: string | null;
}

/**
 * Report-Bug-Dialog (Chef-Auftrag 2026-07-18 + CEO-Erweiterungen): Primärweg ist ein Discord-
 * Webhook-POST (über den Main-Prozess, s. main/bugReport.ts — die Renderer-CSP erlaubt keine
 * Cross-Origin-Requests selbst); scheitert der Versand (oder ist gar kein Webhook konfiguriert),
 * bleibt der mailto-/Kopieren-Fallback jederzeit voll funktionsfähig. Der Spieler hängt SEINEN
 * EIGENEN Screenshot an (Datei-Auswahl/Drag&Drop/Zwischenablage) — kein Auto-Capture (Chef-
 * Korrektur: bis der Options-Dialog offen ist, zeigt der Bildschirm längst nicht mehr den Bug).
 */
export function BugReportDialog({ onClose, screenLabel = null }: BugReportDialogProps): JSX.Element {
  const { t } = useI18n();
  const state = useGameStateMaybe();

  // Spieler-Report 28.08.2026 (RU): „markiert man Text und klickt daneben, ist alles weg" — der Entwurf überlebt jetzt
  // Schließen und Neustart (localStorage) und wird erst nach dem Senden verworfen.
  const [description, setDescription] = useState<string>(() => {
    try { return localStorage.getItem("gr.bugReport.draft") ?? ""; } catch { return ""; }
  });
  useEffect(() => {
    try { localStorage.setItem("gr.bugReport.draft", description); } catch { /* kein Speicher */ }
  }, [description]);
  // Overlay schließt nur bei einem echten Klick auf das Overlay (mousedown UND mouseup dort) — eine Textauswahl,
  // die außerhalb des Dialogs endet, schließt nicht mehr.
  const overlayPress = useRef(false);
  // Chef-Entscheid 23.08.2026: Der einfachste Rueckkanal ist der, den der Spieler selbst
  // aufmacht. Freiwillig, leer lassen ist voellig in Ordnung - nur wer eine Antwort will,
  // traegt hier etwas ein.
  const [contact, setContact] = useState("");
  const [images, setImages] = useState<BugReportImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [clipboardEmptyNote, setClipboardEmptyNote] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  // Webhook-Auflösung (Override → Remote-Config → eingebetteter Default, s. bugReportConfig.ts) —
  // session-gecached, meist quasi-instant nach dem ersten Dialog-Öffnen.
  useEffect(() => {
    let cancelled = false;
    void resolveBugReportWebhook().then((url) => {
      if (!cancelled) setWebhookUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Strg-V irgendwo im Dialog: nur abfangen, wenn die Zwischenablage WIRKLICH ein Bild trägt (sonst
  // bricht normales Text-Einfügen ins Beschreibungsfeld). Die eigentliche, zuverlässigere Abfrage
  // läuft über die Electron-IPC-Bridge (s. handlePasteFromClipboard) — dieser Listener entscheidet
  // nur synchron per `clipboardData`, OB überhaupt umgeleitet werden soll.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      const hasImage = Array.from(e.clipboardData?.items ?? []).some((it) => it.type.startsWith("image/"));
      if (!hasImage) return;
      e.preventDefault();
      void handlePasteFromClipboard();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  const canSend = description.trim().length > 0;

  const addImage = (img: BugReportImage): void => {
    setImages((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, img]));
  };

  const handleFilesSelected = async (fileList: FileList | null): Promise<void> => {
    if (!fileList) return;
    const remaining = MAX_IMAGES - images.length;
    const files = Array.from(fileList).slice(0, Math.max(0, remaining));
    for (const file of files) {
      const prepared = await prepareImageFile(file);
      if (prepared) addImage(prepared);
    }
  };

  const handlePasteFromClipboard = async (): Promise<void> => {
    setClipboardEmptyNote(false);
    const dataUrl = await readClipboardImageDataUrl();
    if (!dataUrl) {
      setClipboardEmptyNote(true);
      return;
    }
    addImage(await prepareImageDataUrl(dataUrl, "clipboard.png"));
  };

  const rowsAndText = (): { rows: ReturnType<typeof buildAutoAttachedRows>; text: string } => {
    const rows = buildAutoAttachedRows(t, state, screenLabel);
    return { rows, text: autoAttachedToText(rows) };
  };

  const handleSend = async (): Promise<void> => {
    if (!webhookUrl || !canSend) return;
    setSendState("sending");
    setSendNote(null);
    const { text } = rowsAndText();
    const payload = buildDiscordPayload(description, text, t, contact);
    const result = await sendBugReportWebhook(webhookUrl, payload, images);
    if (result.ok) {
      setSendState("success");
      if (result.skippedImages > 0) setSendNote(t("bugReport.imagesSkippedNote"));
    } else {
      setSendState("error");
      setFallbackOpen(true);
    }
  };

  const handleEmail = async (): Promise<void> => {
    const { text } = rowsAndText();
    const url = buildMailtoUrl(description, text, t);
    const bridge = window.hearthforge?.shell;
    if (bridge) {
      const ok = await bridge.openExternal(url);
      if (ok) return;
    }
    // Web-/Sim-Build ohne Electron-Bridge (oder die Bridge lehnte ab, sollte bei einer echten
    // mailto:-URL nie passieren): der Browser übernimmt den mailto-Link direkt.
    window.open(url, "_self");
  };

  const handleCopy = (): void => {
    const { text } = rowsAndText();
    void navigator.clipboard.writeText(buildFullReportText(description, text, t)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    });
  };

  const { rows: autoRows } = rowsAndText();
  const fallbackVisible = fallbackOpen || !webhookUrl;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { overlayPress.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (overlayPress.current && e.target === e.currentTarget) onClose(); overlayPress.current = false; }}
    >
      <div className="modal bugreport-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />


        <h2 className="bugreport-title">{t("bugReport.title")}</h2>
        <p className="bugreport-subtitle">{t("bugReport.subtitle")}</p>

        <label className="bugreport-desc-label" htmlFor="bugreport-contact">
          {t("bugReport.contactLabel")}
        </label>
        <input
          id="bugreport-contact"
          type="text"
          className="opz-input bugreport-contact-input"
          placeholder={t("bugReport.contactPlaceholder")}
          maxLength={80}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />

        <label className="bugreport-desc-label" htmlFor="bugreport-desc">
          {t("bugReport.descLabel")}
        </label>
        <textarea
          id="bugreport-desc"
          className="opz-textarea bugreport-textarea"
          placeholder={t("bugReport.descPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div
          className={`bugreport-dropzone${dragOver ? " drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFilesSelected(e.dataTransfer.files);
          }}
        >
          <p className="bugreport-dropzone-hint">{t("bugReport.attachHint")}</p>
          <div className="bugreport-dropzone-actions">
            {/* codex:2026-08-01T13:02:00+02:00 — Das Dialogformular verwendet denselben
                Gravewood-Buttonvertrag wie die restlichen Options-Aktionen. */}
            <button type="button" className="shop-citadel-btn" onClick={() => fileInputRef.current?.click()}>
              {t("bugReport.selectFileBtn")}
            </button>
            <button type="button" className="shop-citadel-btn" onClick={() => void handlePasteFromClipboard()}>
              {t("bugReport.pasteBtn")}
            </button>
          </div>
          {clipboardEmptyNote && <p className="bugreport-clipboard-empty">{t("bugReport.clipboardEmpty")}</p>}
          {images.length > 0 && (
            <div className="bugreport-thumbs">
              {images.map((img) => (
                <div key={img.id} className="bugreport-thumb-wrap">
                  <img src={img.dataUrl} alt="" className="bugreport-thumb" />
                  <button
                    type="button"
                    className="bugreport-thumb-remove"
                    aria-label={t("bugReport.removeImage")}
                    onClick={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length >= MAX_IMAGES && <p className="bugreport-max-images">{t("bugReport.maxImagesReached")}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />

        <button type="button" className="bugreport-toggle" onClick={() => setShowAuto((v) => !v)}>
          {showAuto ? "▾" : "▸"} {t("bugReport.autoAttached")}
        </button>
        {showAuto && (
          <div className="bugreport-auto-block">
            {autoRows.map((r) => (
              <div key={r.label} className="bugreport-auto-row">
                <span>{r.label}</span>
                <span>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        <p className="bugreport-privacy">{t("bugReport.privacyNote")}</p>

        {webhookUrl && (
          <div className="bugreport-primary">
            <button className="btn-iron" disabled={!canSend || sendState === "sending"} onClick={() => void handleSend()}>
              {sendState === "sending" ? t("bugReport.sending") : t("bugReport.send")}
            </button>
            {sendState === "success" && (
              <span className="opz-status-ok">
                ✓ {t("bugReport.sendSuccess")}
                {sendNote ? ` ${sendNote}` : ""}
              </span>
            )}
            {sendState === "error" && <span className="opz-status-error">✕ {t("bugReport.sendFailed")}</span>}
          </div>
        )}

        <div className="bugreport-fallback">
          {webhookUrl ? (
            <button type="button" className="bugreport-fallback-toggle" onClick={() => setFallbackOpen((v) => !v)}>
              {fallbackVisible ? "▾" : "▸"} {t("bugReport.fallbackHeading")}
            </button>
          ) : (
            <div className="bugreport-fallback-toggle" style={{ cursor: "default" }}>
              {t("bugReport.fallbackHeading")}
            </div>
          )}
          {sendState === "error" && <p className="bugreport-fallback-explain">{t("bugReport.sendFailed")}</p>}
          {fallbackVisible && (
            <div className="bugreport-fallback-body">
              <div className="opz-segment" style={{ justifyContent: "flex-start" }}>
                <button className="shop-citadel-btn" disabled={!canSend} onClick={() => void handleEmail()}>
                  {t("bugReport.emailBtn")}
                </button>
                <button className="shop-citadel-btn" disabled={!canSend} onClick={handleCopy}>
                  {t("bugReport.copyBtn")}
                </button>
                {copied && <span className="opz-status-ok">✓ {t("bugReport.copied")}</span>}
              </div>
              <p className="bugreport-email-target">
                {t("bugReport.emailTargetLabel")} <b>{SUPPORT_EMAIL}</b>
              </p>
              {images.length > 0 && <p className="bugreport-mailto-hint">{t("bugReport.mailtoAttachHint")}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
