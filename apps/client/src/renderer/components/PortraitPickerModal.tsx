import { useEffect, useState } from "react";
import { listPortraits, getPortrait } from "../portraits";
import { HUMAN_ARCHETYPES, parsePortraitId, portraitIdFor } from "../humanRoster";
import type { ArchetypeGroup, Sex } from "../humanRoster";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";

const PORTRAITS = listPortraits();
// Bestand (Chef+Mira-Auftrag 26.08.2026): alle Nicht-Human-Porträts (char_*, knight_m, archer_*,
// mage_* …) bleiben über den Reiter "Bestand" erreichbar, damit Bestandsspieler ihr Bild wiederfinden.
const LEGACY_PORTRAITS = PORTRAITS.filter((p) => !p.id.startsWith("human_"));

type PickerTab = "human" | "legacy";

export interface PortraitPickerModalProps {
  currentId: string;
  /** Modal-Überschrift — Aufrufer entscheidet den Wortlaut (Erstellung vs. späteres Ändern). */
  title: string;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

/**
 * Portrait-Galerie-Modal (Task #240, Human-Roster-Rework 26.08.2026): aus `CharacterCreation`
 * ausgelagert, damit sowohl die initiale Charaktererstellung als auch der spätere Zahnrad-Button
 * auf `CharacterPage` dieselbe Auswahl-Logik/Assets teilen. Zwei Reiter: "Human" (30 Archetypen ×
 * m/w, gefiltert nach Kampfklasse/Beruf + Variante) und "Bestand" (alte freie Porträt-Liste).
 */
export function PortraitPickerModal({ currentId, title, onConfirm, onCancel }: PortraitPickerModalProps): JSX.Element {
  const { t } = useI18n();
  const [tempId, setTempId] = useState<string>(currentId);
  const parsedCurrent = parsePortraitId(currentId);
  const [tab, setTab] = useState<PickerTab>(parsedCurrent ? "human" : "legacy");
  const [group, setGroup] = useState<ArchetypeGroup>(
    (parsedCurrent && HUMAN_ARCHETYPES.find((a) => a.id === parsedCurrent.archetype)?.group) || "combat",
  );
  const [sex, setSex] = useState<Sex>(parsedCurrent?.sex ?? "m");

  // Chef-GO Hotkeys: Escape schließt dieses Modal wie ein Klick auf den Backdrop/Abbrechen-Button
  // (util/escStack.ts, Priorität "modal") — die Komponente ist stets "offen", solange sie gemountet
  // ist (der Aufrufer rendert sie nur bedingt), daher genügt Registrierung beim Mount/Unmount.
  useEffect(() => {
    return registerEscCloser("modal", onCancel);
  }, [onCancel]);

  const humanItems = HUMAN_ARCHETYPES.filter((a) => a.group === group);
  const activeArchetype = parsePortraitId(tempId)?.archetype;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal portrait-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onCancel} aria-label={t("creation.portrait.cancel")} />

        <h2 className="portrait-gallery-title">{title}</h2>

        <div className="creation-filter-row">
          <button
            type="button"
            className={`btn-iron btn-iron--sm${tab === "human" ? " is-active" : ""}`}
            onClick={() => setTab("human")}
          >
            {t("creation.race.human")}
          </button>
          <button
            type="button"
            className={`btn-iron btn-iron--sm${tab === "legacy" ? " is-active" : ""}`}
            onClick={() => setTab("legacy")}
          >
            {t("creation.legacy")}
          </button>
        </div>

        {tab === "human" && (
          <>
            <div className="creation-filter-row">
              <button
                type="button"
                className={`btn-iron btn-iron--sm${group === "combat" ? " is-active" : ""}`}
                onClick={() => setGroup("combat")}
              >
                {t("creation.group.combat")}
              </button>
              <button
                type="button"
                className={`btn-iron btn-iron--sm${group === "profession" ? " is-active" : ""}`}
                onClick={() => setGroup("profession")}
              >
                {t("creation.group.profession")}
              </button>
            </div>
            <div className="creation-filter-row">
              <button
                type="button"
                className={`btn-iron btn-iron--sm${sex === "m" ? " is-active" : ""}`}
                onClick={() => setSex("m")}
              >
                {t("creation.sex.m")}
              </button>
              <button
                type="button"
                className={`btn-iron btn-iron--sm${sex === "f" ? " is-active" : ""}`}
                onClick={() => setSex("f")}
              >
                {t("creation.sex.f")}
              </button>
            </div>
          </>
        )}

        <div className="portrait-gallery-scroll">
          {tab === "human" ? (
            <div className="portrait-gallery-grid">
              {humanItems.map((a) => {
                const id = portraitIdFor(a.id, sex);
                const isActive = a.id === activeArchetype;
                const url = getPortrait(id);
                return (
                  <button
                    key={a.id}
                    className={`portrait-thumb${isActive ? " active" : ""}`}
                    onClick={() => setTempId(id)}
                    aria-pressed={isActive}
                  >
                    <span className="portrait-thumb-img">
                      {url ? (
                        <img loading="lazy" decoding="async" src={url} alt="" />
                      ) : (
                        <span className="portrait-silhouette" style={{ fontSize: 40 }}>👤</span>
                      )}
                    </span>
                    <span className="portrait-thumb-name">{t(a.nameKey)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="portrait-gallery-grid">
              {LEGACY_PORTRAITS.map((p) => {
                const isActive = p.id === tempId;
                return (
                  <button
                    key={p.id}
                    className={`portrait-thumb${isActive ? " active" : ""}`}
                    onClick={() => setTempId(p.id)}
                    aria-pressed={isActive}
                  >
                    {p.url ? (
                      <img loading="lazy" decoding="async" src={p.url} alt={p.id} />
                    ) : (
                      <span className="portrait-silhouette" style={{ fontSize: 40 }}>👤</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="portrait-gallery-actions">
          <button className="shop-citadel-btn" onClick={onCancel}>
            {t("creation.portrait.cancel")}
          </button>
          <button className="btn-iron" onClick={() => onConfirm(tempId)}>
            {t("creation.portrait.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
