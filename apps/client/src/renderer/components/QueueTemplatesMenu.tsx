import { useState } from "react";
import { content } from "@hearthforge/content";
import {
  clearQueueTemplate,
  loadQueueTemplate,
  renameQueueTemplate,
  saveQueueTemplate,
} from "@hearthforge/engine";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { ConfirmModal, type ConfirmRequest } from "./ConfirmModal";

// claude:2026-10-31T16:34:28+01:00 — Ideen-Welle 1.4.2: Warteschlangen-Vorlagen (3 Plätze: Speichern, Laden, Umbenennen, Löschen).
/** Anzahl der Vorlagenplätze (Engine-Vertrag: `queueTemplates` hat 3 Plätze). */
const SLOTS = [0, 1, 2] as const;
const NAME_MAX = 24;

type Editing = { slot: number; mode: "save" | "rename"; value: string } | null;

/** Kompaktes Menü „Vorlagen“ im Warteschlangen-Panel. Rendert inline unter der Listenkopfzeile
 *  (kein Popover: das Panel scrollt, ein absolut positioniertes Menü würde abgeschnitten). */
export function QueueTemplatesMenu(): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const templates = state.queueTemplates ?? [];
  const hasQueue = (state.actionQueue ?? []).length > 0;

  const commit = (): void => {
    if (!editing) return;
    const name = editing.value.trim().slice(0, NAME_MAX);
    if (!name) return;
    const slot = editing.slot;
    const run = (): void => {
      if (editing.mode === "save") saveQueueTemplate(state, slot, name);
      else renameQueueTemplate(state, slot, name);
      setEditing(null);
      setMessage(null);
    };
    // Speichern auf einen belegten Platz überschreibt die alte Vorlage: erst bestätigen.
    if (editing.mode === "save" && templates[slot]) {
      setConfirm({
        title: t("queue.tpl.overwriteTitle"),
        body: t("queue.tpl.overwriteBody").replace("{name}", templates[slot]!.name),
        confirmLabel: t("queue.tpl.overwrite"),
        danger: true,
        onConfirm: () => {
          setConfirm(null);
          run();
        },
      });
      return;
    }
    run();
  };

  const load = (slot: number): void => {
    const res = loadQueueTemplate(state, content, slot);
    setMessage(t("queue.tpl.loaded").replace("{added}", String(res.added)).replace("{skipped}", String(res.skipped)));
  };

  return (
    <div className="queue-tpl">
      <button
        type="button"
        className={`queue-panel-clear queue-tpl-toggle${open ? " active" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={t("queue.tpl.hint")}
      >
        {t("queue.tpl.button")} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="queue-tpl-menu">
          {SLOTS.map((slot) => {
            const tpl = templates[slot] ?? null;
            const isEditing = editing?.slot === slot;
            return (
              <div key={slot} className={`queue-tpl-slot${tpl ? " filled" : ""}`}>
                {isEditing ? (
                  <form
                    className="queue-tpl-edit"
                    onSubmit={(e) => {
                      e.preventDefault();
                      commit();
                    }}
                  >
                    <input
                      className="queue-tpl-input"
                      autoFocus
                      maxLength={NAME_MAX}
                      value={editing!.value}
                      placeholder={t("queue.tpl.namePlaceholder")}
                      aria-label={t("queue.tpl.namePlaceholder")}
                      onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                    <button type="submit" className="queue-tpl-btn" disabled={!editing!.value.trim()}>{t("queue.tpl.ok")}</button>
                    <button type="button" className="queue-tpl-btn" onClick={() => setEditing(null)}>{t("queue.tpl.cancel")}</button>
                  </form>
                ) : (
                  <>
                    <span className="queue-tpl-name" title={tpl?.name}>
                      {tpl ? `${tpl.name} · ${tpl.entries.length}` : t("queue.tpl.empty")}
                    </span>
                    <span className="queue-tpl-actions">
                      <button
                        type="button"
                        className="queue-tpl-btn"
                        disabled={!hasQueue}
                        title={hasQueue ? t("queue.tpl.saveHint") : t("queue.tpl.saveNeedsQueue")}
                        onClick={() => setEditing({ slot, mode: "save", value: tpl?.name ?? "" })}
                      >
                        {t("queue.tpl.save")}
                      </button>
                      {tpl && (
                        <>
                          <button type="button" className="queue-tpl-btn" title={t("queue.tpl.loadHint")} onClick={() => load(slot)}>
                            {t("queue.tpl.load")}
                          </button>
                          <button
                            type="button"
                            className="queue-tpl-btn"
                            onClick={() => setEditing({ slot, mode: "rename", value: tpl.name })}
                          >
                            {t("queue.tpl.rename")}
                          </button>
                          <button
                            type="button"
                            className="queue-tpl-btn queue-tpl-btn--danger"
                            aria-label={t("queue.tpl.delete")}
                            title={t("queue.tpl.delete")}
                            onClick={() => {
                              clearQueueTemplate(state, slot);
                              setMessage(null);
                            }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </span>
                  </>
                )}
              </div>
            );
          })}
          {message && <div className="queue-tpl-msg" role="status">{message}</div>}
        </div>
      )}
      <ConfirmModal request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
