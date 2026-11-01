import { useState } from "react";
import { content } from "@hearthforge/content";
import {
  computeStats,
  effectivePetDropChance,
  equipPet,
  equipSecondPet,
  ownedPetCount,
  ownsPet,
  petEchoActive,
  petEchoFactor,
  petPityProgress,
  secondPetSlotUnlocked,
} from "@hearthforge/engine";
import type { PetDef, PetSkillEffect } from "@hearthforge/shared";
import { PET_WHOLE_LEVEL_KINDS } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPetSrc, PET_ZONE_ID } from "../pets";
import { getUiIcon } from "../uiIcons";
import { formatNum, formatPct1, formatPct2, formatSeconds1 } from "../util/format";
import { abilityText, passiveText } from "../util/petText";
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
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Signatur-Name der Fertigkeit (z. B. „Wurzelgespür") vor dem Kind-Label.
  const skillKindLabel = se.name ? tr(se.name) : t(`pet.effect.skill.${se.kind}`);
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
  const skillKindLabel = se.name ? tr(se.name) : t(`pet.effect.skill.${se.kind}`); // claude:2026-10-18T02:00:00+02:00

  // #276 Schritt 4: Ability-Anzeigename statt des rohen Kind-Labels (konsistent zu PetEffectRows).
  const abilityName = tr(pet.combatAbility.name);

  return `${t("pet.effect.passive")}: ${skillKindLabel}${sPct} · ${t("pet.effect.active")}: ${abilityName}`;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Rollen-Abzeichen (1.3.0, fünf Kampf-Rollen): Farbe + Text, beschreibt immer die
 * Kampf-Fähigkeit. Auch für noch fehlende Begleiter sichtbar (die Rolle verrät keine Zahlen).
 */
function RoleBadge({ pet, t, compact }: { pet: PetDef; t: TFn; compact?: boolean }): JSX.Element | null {
  if (!pet.role) return null;
  return (
    <span
      className={`pet-role-badge pet-role-${pet.role}${compact ? " is-compact" : ""}`}
      title={t("companions.role.hint")}
    >
      {t(`companions.role.${pet.role}`)}
    </span>
  );
}

/** Echo-Anteil als Prozent-Text (25). */
// claude:2026-10-30T18:06:00+01:00 — unter 1 % zwei Nachkommastellen (min. 0,01 % ab count>0), sonst ganzzahlig abgerundet.
function formatPityPct(fraction: number): string {
  if (fraction <= 0) return "0%";
  if (fraction < 0.01) return `${formatPct2(Math.max(fraction, 0.0001))}%`;
  return `${Math.floor(fraction * 100)}%`;
}
// claude:2026-10-30T19:31:00+01:00 — Echo-Prozent hängt seit 1.4.2 vom Narbenbuch ab (`petEchoFactor`), daher je Render in der Seite berechnet.

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
  // claude:2026-10-18T00:30:00+02:00 — Jagdbuch: zweiter Platz (Talent secondPetSlot) und effektive
  // Chance inkl. Fährtenkunde. Sichtbar/aktiv nur mit Talent; Werte kommen aus der Engine.
  const slot2Unlocked = secondPetSlotUnlocked(state, content);
  const secondId = slot2Unlocked ? state.character.companionPetId2 : null;
  const secondActivePet = secondId ? content.pets[secondId] : undefined;
  /** Drop-Quote „1 / N“ (geschützte Leerzeichen) — fehlende Begleiter mit effektiver Chance inkl. Jagdbuch. */
  const chanceFor = (pet: PetDef): { text: string; boosted: boolean } => {
    const eff = ownsPet(state, pet.id) ? pet.dropChance : effectivePetDropChance(state, content, pet);
    return {
      text: `1\u00a0/\u00a0${formatNum(Math.round(1 / Math.max(eff, 1e-12)))}`,
      boosted: eff > pet.dropChance,
    };
  };

  const sourceLabel = (pet: PetDef): string => {
    // claude:2026-10-30T18:06:00+01:00 — Kampf-Begleiter sind stilgebunden (Engine tryPetDrop): Stil in der Quelle nennen.
    if (pet.source.kind === "combat") {
      return pet.source.style
        ? t("companions.source.combatStyle").replace("{style}", t(`style.${pet.source.style}`))
        : t("companions.source.combat");
    }
    const skill = content.skills[pet.source.skill];
    return t("companions.source.skill").replace(
      "{skill}",
      skill ? tr(skill.name) : pet.source.skill,
    );
  };

  const handleEquip = (petId: string | null): void => {
    equipPet(state, petId);
  };
  const handleEquipSecond = (petId: string | null): void => {
    equipSecondPet(state, content, petId);
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
  const selectedSecond = secondId === selectedPet.id;
  const pity = petPityProgress(state, content, selectedPet);
  // claude:2026-10-30T18:06:00+01:00 — aktueller Kampfstil (waffenbestimmt) fuer die Pech-Schutz-Zeile.
  const currentStyle = computeStats(state, content).style;
  // claude:2026-10-18T02:00:00+02:00 — Echo: wirkt der ausgewählte Begleiter gerade mit 25 %? Und wie viele insgesamt?
  const echoFactor = petEchoFactor(state, content); // claude:2026-10-30T19:31:00+01:00 — 1.4.2 „Echo der Gefährten“ (25/35/50 %)
  const ECHO_PCT = formatPct1(echoFactor);
  const selectedEcho = selectedOwned && petEchoActive(state, content, selectedPet.id);
  const echoCount = allPets.filter((pet) => petEchoActive(state, content, pet.id)).length;

  return (
    <div className="pet-gallery-page pet-field-journal">
      {/* codex:2026-08-01T22:18:00+02:00 — Ruhiger Ashen-Iron-Kopf mit dauerhaft sichtbarem
          aktivem Begleiter; Auswahl und Ausrüstung bleiben bewusst zwei getrennte Zustände. */}
      <section className="pet-field-header">
        <header className="pet-gallery-head">
          <div>
            {/* 1.1.0: Hier stand ein Kicker "Begleiter waehlen" ueber der Ueberschrift
                "Begleiter" — zwei Zeilen, die dasselbe sagen. Die Liste links traegt
                dieselbe Beschriftung und braucht sie dort auch, weil sie eine Spalte
                benennt. Oben trug sie nichts bei. */}
            <h2>{t("companions.title")}</h2>
          </div>
          <div className="pet-field-head-meta">
            {/* claude:2026-10-17T12:30:00+02:00 — Fundzähler stand doppelt (hier + Kopf des Fundindex
                „Begleiter wählen · 7 / 23“); er bleibt nur am Index, der Kopf wird flacher. */}
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
            {/* claude:2026-10-18T02:00:00+02:00 — Echo-Zusammenfassung: wie viele Begleiter gerade mit 25 % wirken. */}
            {echoCount > 0 && (
              <div className="pet-field-echo-summary" title={t("companions.echo.hint").replace("{pct}", ECHO_PCT)}>
                {t("companions.echo.summary").replace("{n}", String(echoCount)).replace("{pct}", ECHO_PCT)}
              </div>
            )}
            {slot2Unlocked && (
              <div className="pet-field-active">
                <span className="pet-slot-label">{t("companions.slot2.label")}</span>
                {secondActivePet ? (
                  <>
                    {getPetSrc(secondActivePet.id) ? (
                      <img src={getPetSrc(secondActivePet.id)!} alt="" className="pet-field-active-img" />
                    ) : PAW_ICON_URL ? (
                      <img src={PAW_ICON_URL} alt="" className="pet-field-active-img" />
                    ) : null}
                    <span className="pet-slot-name">{tr(secondActivePet.name)}</span>
                  </>
                ) : (
                  <span className="pet-slot-none">{t("companions.slot.none")}</span>
                )}
                <span className="pet-field-active-second">{t("companions.slot2.hint")}</span>
              </div>
            )}
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
              const isSecond = secondId === pet.id;
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
                    <RoleBadge pet={pet} t={tFn} compact />
                    <small>{sourceLabel(pet)}</small>
                    {/* claude:2026-10-17T13:00:00+02:00 — geschützte Leerzeichen: „1 / 60.000“ bricht nie mitten in der Quote. */}
                    {/* claude:2026-10-18T00:30:00+02:00 — fehlende Begleiter: effektive Chance inkl. Jagdbuch. */}
                    <small>{t("companions.dropChance").replace("{pct}", chanceFor(pet).text)}</small>
                  </span>
                  {isEquipped && <span className="pet-field-entry-mark">{t("companions.equipped")}</span>}
                  {isSecond && <span className="pet-field-entry-mark">{t("companions.equipped2")}</span>}
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
                <RoleBadge pet={selectedPet} t={tFn} />
              </div>
              <span className="pet-field-drop">
                {t("companions.dropChance").replace("{pct}", chanceFor(selectedPet).text)}
                {chanceFor(selectedPet).boosted && (
                  <span className="pet-field-book-note">{t("companions.dropChance.book")}</span>
                )}
              </span>
            </div>

            {/* claude:2026-10-18T00:30:00+02:00 — Pech-Schutz-Balken (Jagdbuch „Spur aufgenommen“). */}
            {!selectedOwned && pity && (
              <div className="pet-field-pity" title={t("companions.pity.hint")}>
                <div className="pet-field-pity-label">
                  <span>
                    {t("companions.pity")
                      .replace("{n}", formatNum(Math.min(pity.count, pity.threshold)))
                      .replace("{max}", formatNum(pity.threshold))}
                  </span>
                  {/* claude:2026-10-30T18:06:00+01:00 — Prozent mit Genauigkeit (2 Stellen unter 1 %), sonst Balken/Zahl bei Schwellen von ~80.000 starr. */}
                  <span>{formatPityPct(Math.min(pity.count, pity.threshold) / pity.threshold)}</span>
                </div>
                <div className="bar">
                  <div
                    className="bar-fill"
                    style={{ transform: `scaleX(${pity.count > 0 ? Math.max(0.02, Math.min(1, pity.count / pity.threshold)) : 0})` }}
                  />
                </div>
                {selectedPet.source.kind === "combat" && selectedPet.source.style && (
                  <div className="pet-field-pity-note muted">
                    {/* claude:2026-10-30T18:20:00+01:00 — Spur zaehlt bei jedem Kill; der Begleiter faellt nur im passenden Stil. */}
                    {t(pity.count >= pity.threshold ? "companions.pity.full" : "companions.pity.grow")
                      .replace("{style}", t(`style.${selectedPet.source.style}`))}
                    {selectedPet.source.style !== currentStyle &&
                      ` ${t("companions.pity.styleMismatch").replace("{cur}", t(`style.${currentStyle}`))}`}
                  </div>
                )}
              </div>
            )}

            {selectedOwned && selectedPet.description && (
              <p className="pet-field-description">{tr(selectedPet.description)}</p>
            )}

            {/* Chef-Auftrag 27.08.2026: „Da fehlen mir Erklärungen zu den aktiven und passiven
                Skills der Pets." — volle Sätze mit echten Zahlen statt der kompakten Kind-Labels
                (die kompakte PetEffectRows-Zeile bleibt exklusiv der Feier-Overlay/Kopf-Anzeige
                vorbehalten, s. dort).
                Chef-Review 29.08.2026 (Sichtbarkeit): NUR für besessene Pets — für „???"-Pets
                verrät die volle Zahl/Formel zu viel, bevor der Spieler den Fund überhaupt hat.
                Name-Platzhalter, Skill-Zeile und Drop-Chance-Kachel bleiben unverändert sichtbar
                (der Spieler soll wissen, WOFÜR er jagt), nur die zwei Text-Zeilen weichen einem
                gedämpften Hinweis im selben Rahmen. */}
            <div className="pet-field-effects pet-field-effects-detailed">
              {selectedOwned ? (
                <>
                  <div className="pet-effect-row">
                    <span className="pet-effect-tag pet-effect-tag-passive">{t("pet.effect.passive")}</span>
                    <span className="pet-effect-value">{passiveText(selectedPet, tFn, tr)}</span>
                  </div>
                  <div className="pet-effect-row">
                    <span className="pet-effect-tag pet-effect-tag-active">{t("pet.effect.activeCombat")}</span>
                    <span className="pet-effect-value">
                      <span>{abilityText(selectedPet, tFn, tr)}</span>
                      <small className="pet-field-effects-hint">{t("pet.ability.autoHint")}</small>
                    </span>
                  </div>
                  {/* claude:2026-10-18T02:00:00+02:00 — Echo-Hinweis (1.3.0): aktuell wirksam ja/nein + der 25-%-Wert. */}
                  <div
                    className={`pet-effect-row pet-effect-row-echo${selectedEcho ? " is-active" : " is-idle"}`}
                    title={t("companions.echo.hint").replace("{pct}", ECHO_PCT)}
                  >
                    <span className="pet-effect-tag pet-effect-tag-echo">{t("companions.echo.title")}</span>
                    <span className="pet-effect-value">
                      <small className="pet-field-echo-state">
                        {selectedEcho
                          ? t("companions.echo.active").replace("{pct}", ECHO_PCT)
                          : t("companions.echo.idle")}
                      </small>
                      <span>{passiveText(selectedPet, tFn, tr, echoFactor)}</span>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="pet-effect-row pet-effect-row-unknown">
                    <span className="pet-field-effects-unknown-text">{t("pet.effect.unknownHint")}</span>
                  </div>
                  <p className="pet-field-echo-locked">{t("companions.echo.locked").replace("{pct}", ECHO_PCT)}</p>
                </>
              )}
            </div>

            {selectedOwned && (
              <div className="pet-field-actions">
                <div className="pet-field-actions-row">
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
                {/* claude:2026-10-18T00:30:00+02:00 — zweiter Platz: nur mit Talent, nie für den Platz-1-Begleiter. */}
                {slot2Unlocked && !selectedEquipped && (
                  selectedSecond ? (
                    <button
                      type="button"
                      className="pet-card-btn pet-card-btn-unequip"
                      onClick={() => handleEquipSecond(null)}
                    >
                      {t("companions.unequip2")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pet-card-btn pet-card-btn-equip"
                      onClick={() => handleEquipSecond(selectedPet.id)}
                    >
                      {t("companions.equip2")}
                    </button>
                  )
                )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
