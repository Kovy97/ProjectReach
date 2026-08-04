import { useState } from "react";
import { content } from "@hearthforge/content";
import { equipPet, ownedPetCount, ownsPet } from "@hearthforge/engine";
import type { PetDef, PetSkillEffect } from "@hearthforge/shared";
import { PET_WHOLE_LEVEL_KINDS } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPetSrc, PET_ZONE_ID } from "../pets";
import { getUiIcon } from "../uiIcons";
import { formatNum, formatPct1, formatSeconds1 } from "../util/format";
import { getZoneBackgroundCard } from "../zoneBackgrounds";

// Welle QQ (2026-07-17): echtes Pfoten-Icon statt 🐾-Emoji, falls ein Pet weder Sprite-Art noch
// eigenes content.icon hat.
const PAW_ICON_URL = getUiIcon("icon_paw");

type TFn = (key: string) => string;
type TrFn = (v: import("@hearthforge/shared").LocalizedString) => string;

/**
 * Formats a pet's skill-effect magnitude for display. Every kind is a fraction (0.05 = 5%) EXCEPT
 * `skillBoost` (#276), whose `value` is WHOLE LEVELS (e.g. 2 = "+2 levels", not "+200%" —
 * see `PET_WHOLE_LEVEL_KINDS` / shared/index.ts PET_SKILL_EFFECT_CAP comment).
 */
function skillEffectValueLabel(se: PetSkillEffect, t: TFn): string {
  if (se.value === undefined) return "";
  if (PET_WHOLE_LEVEL_KINDS.includes(se.kind)) {
    return ` +${se.value} ${t("pet.effect.levels")}`;
  }
  // Fix-Welle CC (Fenn, Befund 1): `.toFixed(0)` rundete z.B. einen 4,5%-Passiv-Bonus auf "+5%" —
  // formatPct1 zeigt die echte Nachkommastelle nur, wenn sie auch gebraucht wird.
  return ` +${formatPct1(se.value)}%`;
}

/**
 * Renders both Pet effects as two separate readable lines. Exported (Welle EE, Fenn F3): die
 * Drop-Celebration (PetCelebration.tsx) braucht dieselben zwei Effekt-Zeilen wie die Galerie-Karte
 * ("Ich habe den seltensten Drop des Spiels bekommen und das Overlay lässt mich damit … nichts
 * wissen") — EINE Textquelle statt einer zweiten Kopie.
 */
export function PetEffectRows({ pet, t, tr }: { pet: PetDef; t: TFn; tr: TrFn }): JSX.Element {
  const se = pet.skillEffect;
  const sPct = skillEffectValueLabel(se, t);
  const skill = se.skill ? content.skills[se.skill] : undefined;
  const sname = skill ? tr(skill.name) : (se.skill ?? "");
  const skillKindLabel = t(`pet.effect.skill.${se.kind}`);
  const skillLine = se.skill ? `${skillKindLabel}${sPct} (${sname})` : `${skillKindLabel}${sPct}`;

  const ce = pet.combatAbility;
  // #276 Schritt 4: der Anzeigename der Ability (z.B. „Prismenlanze") prominent statt des rohen
  // Kind-Schlüssels — plus Intervall auf eine Nachkommastelle (manche Pets triggern alle 4,5s).
  const abilityName = tr(ce.name);
  const cInterval = t("companions.interval").replace("{sec}", formatSeconds1(ce.intervalMs / 1000));
  const combatLine = (ce.kind === "onHitStatus" || ce.kind === "delayedDot") && ce.status
    ? `${abilityName} · ${cInterval} (${t(`status.${ce.status}`)})`
    : `${abilityName} · ${cInterval}`;

  return (
    <div className="pet-effect-rows">
      <div className="pet-effect-row">
        <span className="pet-effect-tag pet-effect-tag-passive">{t("pet.effect.passive")}</span>
        <span className="pet-effect-value">{skillLine}</span>
      </div>
      <div className="pet-effect-row">
        <span className="pet-effect-tag pet-effect-tag-active">{t("pet.effect.active")}</span>
        <span className="pet-effect-value">{combatLine}</span>
      </div>
    </div>
  );
}

/** Single-line compact effect summary for dropdowns / badges. */
function effectSummary(pet: PetDef, t: TFn, tr: TrFn): string {
  const se = pet.skillEffect;
  const sPct = skillEffectValueLabel(se, t);
  const skillKindLabel = t(`pet.effect.skill.${se.kind}`);

  // #276 Schritt 4: Ability-Anzeigename statt des rohen Kind-Labels (konsistent zu PetEffectRows).
  const abilityName = tr(pet.combatAbility.name);

  return `${t("pet.effect.passive")}: ${skillKindLabel}${sPct} · ${t("pet.effect.active")}: ${abilityName}`;
}

export function PetGalleryPage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const tFn = t;

  const allPets = Object.values(content.pets) as PetDef[];
  const total = allPets.length;
  const owned = ownedPetCount(state, content);
  const equippedId = state.character.companionPetId;

  // codex:2026-08-01T22:18:00+02:00 — Feldjournal 03: Die Sammlung bleibt links als kompakter
  // Index sichtbar; nur der ausgewählte Eintrag wird rechts als vollständiges Dossier gerendert.
  // Dadurch bleiben alle bestehenden Pet-/Equip-Verträge erhalten, ohne 21 schwere Karten zugleich
  // in Layout und Paint zu halten.
  const initialPetId = equippedId ?? allPets.find((pet) => ownsPet(state, pet.id))?.id ?? allPets[0]?.id ?? "";
  const [selectedPetId, setSelectedPetId] = useState(initialPetId);
  const selectedPet = allPets.find((pet) => pet.id === selectedPetId) ?? allPets[0];
  const activePet = equippedId ? content.pets[equippedId] : undefined;

  const sourceLabel = (pet: PetDef): string => {
    if (pet.source.kind === "combat") return t("companions.source.combat");
    const skill = content.skills[pet.source.skill];
    return t("companions.source.skill").replace(
      "{skill}",
      skill ? tr(skill.name) : pet.source.skill,
    );
  };

  const handleEquip = (petId: string | null): void => {
    equipPet(state, petId);
  };

  if (!selectedPet) {
    return (
      <div className="pet-gallery-page pet-field-journal">
        <section className="pet-field-empty">
          <p className="muted">{t("companions.none")}</p>
        </section>
      </div>
    );
  }

  const selectedOwned = ownsPet(state, selectedPet.id);
  const selectedEquipped = equippedId === selectedPet.id;
  const selectedSrc = getPetSrc(selectedPet.id);
  const selectedBg = getZoneBackgroundCard(PET_ZONE_ID[selectedPet.id]);

  return (
    <div className="pet-gallery-page pet-field-journal">
      {/* codex:2026-08-01T22:18:00+02:00 — Ruhiger Ashen-Iron-Kopf mit dauerhaft sichtbarem
          aktivem Begleiter; Auswahl und Ausrüstung bleiben bewusst zwei getrennte Zustände. */}
      <section className="pet-field-header">
        <header className="pet-gallery-head">
          <div>
            <span className="pet-field-kicker">{t("companions.select.title")}</span>
            <h2>{t("companions.title")}</h2>
          </div>
          <div className="pet-field-head-meta">
            <span className="pet-gallery-counter">
              {t("companions.counter")
                .replace("{owned}", String(owned))
                .replace("{total}", String(total))}
            </span>
            <div className="pet-field-active">
              <span className="pet-slot-label">{t("companions.slot.label")}</span>
              {activePet ? (
                <>
                  {getPetSrc(activePet.id) ? (
                    <img src={getPetSrc(activePet.id)!} alt="" className="pet-field-active-img" />
                  ) : PAW_ICON_URL ? (
                    <img src={PAW_ICON_URL} alt="" className="pet-field-active-img" />
                  ) : null}
                  <span className="pet-slot-name">{tr(activePet.name)}</span>
                  <span className="pet-field-active-effect">{effectSummary(activePet, tFn, tr)}</span>
                </>
              ) : (
                <span className="pet-slot-none">{t("companions.slot.none")}</span>
              )}
            </div>
          </div>
        </header>
      </section>

      {/* codex:2026-08-01T22:18:00+02:00 — Layout 03 „Feldjournal des Jägers“:
          intern scrollender Fundindex links, einzelne große Beobachtung rechts. */}
      <div className="pet-field-layout">
        <aside className="pet-field-index">
          <div className="pet-field-index-head">
            <span>{t("companions.select.title")}</span>
            <span className="pet-field-count">{owned} / {total}</span>
          </div>
          <div className="pet-field-list">
            {allPets.map((pet) => {
              const has = ownsPet(state, pet.id);
              const isSelected = selectedPet.id === pet.id;
              const isEquipped = equippedId === pet.id;
              const petSrc = getPetSrc(pet.id);
              return (
                <button
                  type="button"
                  key={pet.id}
                  className={`pet-field-entry${has ? " is-owned" : " is-locked"}${isSelected ? " is-selected" : ""}${isEquipped ? " is-equipped" : ""}`}
                  onClick={() => setSelectedPetId(pet.id)}
                  aria-pressed={isSelected}
                >
                  <span className="pet-field-entry-portrait">
                    {has && petSrc ? (
                      <img loading="lazy" decoding="async" src={petSrc} alt="" />
                    ) : has ? (
                      pet.icon ?? (PAW_ICON_URL ? <img src={PAW_ICON_URL} alt="" /> : "?")
                    ) : (
                      <span className="pet-field-entry-unknown">?</span>
                    )}
                  </span>
                  <span className="pet-field-entry-copy">
                    <strong>{has ? tr(pet.name) : "???"}</strong>
                    <small>{sourceLabel(pet)}</small>
                    <small>{t("companions.dropChance").replace(
                      "{pct}",
                      `1 / ${formatNum(Math.round(1 / pet.dropChance))}`,
                    )}</small>
                  </span>
                  {isEquipped && <span className="pet-field-entry-mark">{t("companions.equipped")}</span>}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="pet-field-detail">
          <div
            className={`pet-field-stage${selectedBg ? " has-bg" : ""}${selectedOwned ? "" : " is-locked"}`}
            style={selectedBg ? { backgroundImage: `url("${selectedBg}")` } : undefined}
          >
            {selectedOwned ? (
              selectedSrc ? (
                <img src={selectedSrc} alt={tr(selectedPet.name)} className="pet-field-stage-img" />
              ) : (
                <span className="pet-field-stage-fallback">
                  {selectedPet.icon ?? (PAW_ICON_URL ? <img src={PAW_ICON_URL} alt="" /> : "?")}
                </span>
              )
            ) : (
              <span className="pet-field-stage-unknown">?</span>
            )}
            {selectedEquipped && (
              <span className="pet-equipped-badge">{t("companions.equipped")}</span>
            )}
          </div>

          <div className="pet-field-dossier">
            <div className="pet-field-dossier-head">
              <div>
                <span className="pet-field-kicker">{sourceLabel(selectedPet)}</span>
                <h3>{selectedOwned ? tr(selectedPet.name) : "???"}</h3>
              </div>
              <span className="pet-field-drop">
                {t("companions.dropChance").replace(
                  "{pct}",
                  `1 / ${formatNum(Math.round(1 / selectedPet.dropChance))}`,
                )}
              </span>
            </div>

            {selectedOwned && selectedPet.description && (
              <p className="pet-field-description">{tr(selectedPet.description)}</p>
            )}

            {selectedOwned && (
              <div className="pet-field-effects">
                <PetEffectRows pet={selectedPet} t={tFn} tr={tr} />
              </div>
            )}

            <div className="pet-field-source-seal">
              <span>{sourceLabel(selectedPet)}</span>
              <span>{t("companions.dropChance").replace(
                "{pct}",
                `1 / ${formatNum(Math.round(1 / selectedPet.dropChance))}`,
              )}</span>
            </div>

            {selectedOwned && (
              <div className="pet-field-actions">
                {selectedEquipped ? (
                  <button
                    type="button"
                    className="pet-card-btn pet-card-btn-unequip"
                    onClick={() => handleEquip(null)}
                  >
                    {t("companions.unequip")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pet-card-btn pet-card-btn-equip"
                    onClick={() => handleEquip(selectedPet.id)}
                  >
                    {t("companions.equip")}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
