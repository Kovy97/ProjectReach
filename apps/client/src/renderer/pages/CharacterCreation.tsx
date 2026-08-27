import { useEffect, useRef, useState } from "react";
import { DEFAULT_PORTRAIT } from "@hearthforge/shared";
import type { WeaponStyle } from "@hearthforge/shared";
import { listPortraits, getPortrait } from "../portraits";
import { ARCHETYPES, parsePortraitId, portraitIdFor } from "../playerRoster";
import type { ArchetypeGroup, Race, Sex } from "../playerRoster";
import { processPortraitFile } from "../util/portraitUpload";
import { PortraitPickerModal } from "../components/PortraitPickerModal";
import { useGameControl } from "../game/GameContext";
import { useI18n } from "../i18n";
import { runWithScreenFade } from "../util/screenFade";
import menuLogo from "../assets/ui/mainmenu_logo.webp";
// Frontline-Registry-Rework (Chef-Auftrag 26.08.2026, Vorlage Mira "Character Creation 03 ·
// Frontline Registry"): die Stil-Karten zeigen jetzt dieselben Illustrationen wie Miras Mockup
// statt der kleinen Attribut-Schaden-Icons — statischer Import statt getUiIcon (liegt außerhalb
// von assets/icons/*, s. uiIcons.ts).
import styleWarrior from "../assets/ui/citadel/created-resources/character_warrior.webp";
import styleRanger from "../assets/ui/citadel/created-resources/character_ranger.webp";
import styleWarlock from "../assets/ui/citadel/created-resources/character_warlock.webp";

const PORTRAITS = listPortraits();
const NAME_MAX_LENGTH = 24;

// ─── Style-Karten-Definition ─────────────────────────────────────────────────

interface StyleCardDef {
  id: WeaponStyle;
  img: string;
  nameKey: string;
  descKey: string;
}

const STYLE_CARDS: StyleCardDef[] = [
  { id: "melee", img: styleWarrior, nameKey: "style.melee", descKey: "creation.style.melee.desc" },
  { id: "ranged", img: styleRanger, nameKey: "style.ranged", descKey: "creation.style.ranged.desc" },
  { id: "magic", img: styleWarlock, nameKey: "style.magic", descKey: "creation.style.magic.desc" },
];

// ─── StylePicker ─────────────────────────────────────────────────────────────

interface StylePickerProps {
  value: WeaponStyle;
  onChange: (s: WeaponStyle) => void;
}

function StylePicker({ value, onChange }: StylePickerProps): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="creation-style-grid">
      {STYLE_CARDS.map(({ id, img, nameKey, descKey }) => (
        <button
          key={id}
          type="button"
          className={`creation-style-card${value === id ? " active" : ""}`}
          onClick={() => onChange(id)}
        >
          <img loading="lazy" decoding="async" src={img} alt="" className="creation-style-img" />
          <span className="creation-style-copy">
            <span className="creation-style-name">{t(nameKey)}</span>
            <span className="creation-style-desc">{t(descKey)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Archetypen-Raster ────────────────────────────────────────────────────────
// Chef+Mira-Auftrag 26./27.08.2026: 30 Archetypen (15 Kampfklassen + 15 Berufe, je m/w) je Rasse
// (Mensch, Elf) ersetzen die frühere freie Porträt-Liste als primäre Schritt-2-Auswahl. "Alle
// anzeigen" öffnet weiterhin die große Modal-Galerie (PortraitPickerModal, geteilt mit
// CharacterPage) — dort liegt zusätzlich der Bestand der alten Nicht-Rassen-Porträts (Reiter
// "Bestand").

interface ArchetypeGridProps {
  race: Race;
  group: ArchetypeGroup;
  sex: Sex;
  value: string;
  onSelect: (archetypeId: string) => void;
}

function ArchetypeGrid({ race, group, sex, value, onSelect }: ArchetypeGridProps): JSX.Element {
  const { t } = useI18n();
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const parsedValue = parsePortraitId(value);
  const activeArchetype = parsedValue?.race === race ? parsedValue.archetype : undefined;
  const items = ARCHETYPES.filter((a) => a.group === group);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [race, group, activeArchetype]);

  return (
    <div className="creation-portrait-grid">
      {items.map((a) => {
        const isActive = a.id === activeArchetype;
        const url = getPortrait(portraitIdFor(race, a.id, sex));
        return (
          <button
            key={a.id}
            type="button"
            ref={isActive ? activeRef : undefined}
            className={`creation-portrait-cell${isActive ? " active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onSelect(a.id)}
          >
            <span className="creation-portrait-cell-img">
              {url && <img loading="lazy" decoding="async" src={url} alt="" />}
            </span>
            <span className="creation-portrait-cell-name">{t(a.nameKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── CharacterCreation ───────────────────────────────────────────────────────
// Frontline-Registry-Rework (Chef-Auftrag 26.08.2026, wörtlich: "Mira hat aber falsche Rahmen etc.
// hergenommen, wir bleiben beim Metal-Rahmen"): zweigeteiltes Layout wie Miras Mockup (links
// Held-Pane mit großem Porträt, rechts Formular + Schrittleiste), aber durchgängig mit dem
// Stahlrahmen (`.btn-iron`, `nav-bronze-lipped-iron-9slice.webp`) statt Miras Holzrahmen —
// s. styles/creation.css für die Rezeptur. Alle Funktionen (Name, Porträt-Raster + Galerie-Modal,
// Upload, Stil, createCharacter) sind 1:1 aus der vorherigen Fassung übernommen.


// Standardwahl (Chef-Auftrag 26./27.08.2026): Mensch, Krieger, männlich — fällt nur zurück, falls
// das Asset ausnahmsweise fehlen sollte (Integritätsnetz s. playerRoster.ts).
const DEFAULT_ARCHETYPE_PORTRAIT = portraitIdFor("human", "warrior", "m");

export function CharacterCreation(): JSX.Element {
  const { createCharacter, cancelCreation } = useGameControl();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [portraitId, setPortraitId] = useState<string>(
    PORTRAITS.find((p) => p.id === DEFAULT_ARCHETYPE_PORTRAIT)?.id
      ?? PORTRAITS.find((p) => p.id === DEFAULT_PORTRAIT)?.id
      ?? PORTRAITS[0]?.id
      ?? DEFAULT_PORTRAIT,
  );
  const [race, setRace] = useState<Race>("human");
  const [group, setGroup] = useState<ArchetypeGroup>("combat");
  const [sex, setSex] = useState<Sex>("m");
  const [startingStyle, setStartingStyle] = useState<WeaponStyle>("melee");
  const [showGallery, setShowGallery] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const previewUrl = getPortrait(portraitId);
  const canStart = name.trim().length > 0;
  const heroName = name.trim() || t("creation.nameless");
  // Nur die Held-Pane-Caption (Vorlage Mira: Metamorphous, gesperrt) ist GROSSGESCHRIEBEN — der
  // Fließtext der Begin-Adventure-Unterzeile bleibt normale Groß-/Kleinschreibung.
  const displayName = heroName.toUpperCase();
  const styleLabel = t(STYLE_CARDS.find((s) => s.id === startingStyle)?.nameKey ?? "style.melee");
  // Held-Pane-Caption zweite Zeile: Rasse + Archetyp (falls Rassen-Porträt) + Stil, z.B.
  // "Elf Waldläufer · Fernkampf". Bestands-/Custom-Porträts (kein Rassen-Match) zeigen weiterhin
  // nur den Stil (altes Verhalten).
  const selectedArchetypeId = parsePortraitId(portraitId)?.archetype;
  const selectedArchetype = selectedArchetypeId
    ? ARCHETYPES.find((a) => a.id === selectedArchetypeId)
    : undefined;
  const raceLabel = t(`creation.race.${race}`);
  const archetypeCaption = selectedArchetype
    ? `${raceLabel} ${t(selectedArchetype.nameKey)} · ${styleLabel}`
    : styleLabel;

  const selectArchetype = (archetypeId: string): void => {
    setPortraitId(portraitIdFor(race, archetypeId, sex));
  };

  const changeSex = (nextSex: Sex): void => {
    setSex(nextSex);
    // Aktuell gewählter Archetyp wechselt mit (Chef-Auftrag: "Der Umschalter wechselt die Bilder
    // aller Karten" — inkl. der bereits getroffenen Auswahl). Bestands-/Custom-Porträts bleiben
    // unangetastet, da sie keinem Archetyp zugeordnet sind.
    const parsed = parsePortraitId(portraitId);
    if (parsed) setPortraitId(portraitIdFor(parsed.race, parsed.archetype, nextSex));
  };

  const changeRace = (nextRace: Race): void => {
    setRace(nextRace);
    // Chef-Auftrag 27.08.2026: Wechsel tauscht die Bilder aller Karten UND, wenn ein Archetyp
    // gewählt ist, das Held-Porträt (Archetyp + Variante bleiben erhalten). Bestands-/Custom-
    // Porträts bleiben unangetastet.
    const parsed = parsePortraitId(portraitId);
    if (parsed) setPortraitId(portraitIdFor(nextRace, parsed.archetype, parsed.sex));
  };


  return (
    <div className="creation">
      {/* Chef-Kurswechsel 26.08.2026: Übergänge zwischen Menü/New-Game/Load/Charaktererstellung
          UND der Spielstart selbst laufen über die App-weite Schwarzblende. */}
      <button type="button" className="btn-iron btn-iron--sm creation-back" onClick={() => void runWithScreenFade(() => cancelCreation())}>
        {t("menu.backToSaves")}
      </button>

      {/* Links: Held-Pane — großformatige Live-Vorschau von Porträt + Name + Stil. */}
      <div className="creation-hero-pane">
        <img className="creation-hero-logo" src={menuLogo} alt="Grim Reach" />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // gleiche Datei erneut wählbar
            if (!file) return;
            void processPortraitFile(file).then((dataUrl) => {
              if (dataUrl) setPortraitId(dataUrl);
            });
          }}
        />
        {/* Eigenes Bild hochladen (Chef 2026-07-11) — bleibt über dieselbe Icon-Taste erreichbar,
            jetzt oben rechts auf der Held-Pane statt auf dem alten Vitrinen-Rahmen. */}
        <button
          type="button"
          className="creation-portrait-upload-btn"
          onClick={() => uploadInputRef.current?.click()}
          title={t("char.portrait.upload")}
          aria-label={t("char.portrait.upload")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l5.2 5.2h-3.2V15h-4V8.2H6.8L12 3z M4.5 17.5h15V21h-15v-3.5z" fill="currentColor" />
          </svg>
        </button>
        {previewUrl ? (
          <img loading="lazy" decoding="async" className="creation-hero-art" src={previewUrl} alt="" />
        ) : (
          <span className="creation-hero-silhouette">👤</span>
        )}
        <div className="creation-hero-caption">
          <strong>{displayName}</strong>
          <small>{archetypeCaption}</small>
        </div>
      </div>

      {/* Rechts: Formular-Pane — Titel + Schrittleiste + drei Arbeitsschritte + Begin Adventure. */}
      <div className="creation-form-pane">
        <header className="creation-heading">
          <h1>{t("creation.title")}</h1>
          <span>{t("creation.subtitle")}</span>
        </header>


        <div className="creation-form">
          <section
            className="creation-step"
            ref={(el) => { sectionRefs.current.name = el; }}
          >
            {/* Chef 26.08.2026: Schrittmarke auf Höhe des Abschnitts, reiner Indikator (nicht klickbar). */}
            <div className="creation-step-marker" aria-hidden="true">
              <b>1</b>
              <span>{t("creation.name")}</span>
            </div>
            <label className="creation-step-label">{t("creation.name")}</label>
            <div className="creation-name-field">
              <input
                className="creation-input"
                value={name}
                maxLength={NAME_MAX_LENGTH}
                placeholder={t("creation.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <small>{name.length}/{NAME_MAX_LENGTH}</small>
            </div>
          </section>

          <section
            className="creation-step creation-step--portrait"
            ref={(el) => { sectionRefs.current.portrait = el; }}
          >
            {/* Chef 26.08.2026: Schrittmarke auf Höhe des Abschnitts, reiner Indikator (nicht klickbar). */}
            <div className="creation-step-marker" aria-hidden="true">
              <b>2</b>
              <span>{t("creation.portrait.label")}</span>
            </div>
            <label className="creation-step-label">{t("creation.portrait.label")}</label>

            {/* Chef 27.08.2026: kein Scrollen auf dem Charakter-Screen → Rasse, Gruppe und Variante in EINER Leiste. */}
            <div className="creation-filter-bar">
              <span className="creation-filter-label">{t("creation.race")}</span>
              <button
                type="button"
                className={`btn-iron btn-iron--sm${race === "human" ? " is-active" : ""}`}
                onClick={() => changeRace("human")}
              >
                {t("creation.race.human")}
              </button>
              <button
                type="button"
                className={`btn-iron btn-iron--sm${race === "elf" ? " is-active" : ""}`}
                onClick={() => changeRace("elf")}
              >
                {t("creation.race.elf")}
              </button>
              <button
                type="button"
                className={`btn-iron btn-iron--sm${race === "orc" ? " is-active" : ""}`}
                onClick={() => changeRace("orc")}
              >
                {t("creation.race.orc")}
              </button>
              <button
                type="button"
                className={`btn-iron btn-iron--sm${race === "goblin" ? " is-active" : ""}`}
                onClick={() => changeRace("goblin")}
              >
                {t("creation.race.goblin")}
              </button>
              <span className="creation-filter-sep" aria-hidden="true" />
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
              <span className="creation-filter-sep" aria-hidden="true" />
              <button
                type="button"
                className={`btn-iron btn-iron--sm${sex === "m" ? " is-active" : ""}`}
                onClick={() => changeSex("m")}
              >
                {t("creation.sex.m")}
              </button>
              <button
                type="button"
                className={`btn-iron btn-iron--sm${sex === "f" ? " is-active" : ""}`}
                onClick={() => changeSex("f")}
              >
                {t("creation.sex.f")}
              </button>
              {/* „Alle anzeigen" wandert in die Leiste, damit unter dem Raster keine Zeile verloren geht. */}
              <button type="button" className="btn-iron btn-iron--sm creation-portrait-more-btn" onClick={() => setShowGallery(true)}>
                {t("creation.portrait.showAll")}
              </button>
            </div>

            <div className="creation-portrait-area">
              <ArchetypeGrid race={race} group={group} sex={sex} value={portraitId} onSelect={selectArchetype} />
            </div>
          </section>

          <section
            className="creation-step"
            ref={(el) => { sectionRefs.current.style = el; }}
          >
            {/* Chef 26.08.2026: Schrittmarke auf Höhe des Abschnitts, reiner Indikator (nicht klickbar). */}
            <div className="creation-step-marker" aria-hidden="true">
              <b>3</b>
              <span>{t("creation.style.label")}</span>
            </div>
            <label className="creation-step-label">{t("creation.style.label")}</label>
            <StylePicker value={startingStyle} onChange={setStartingStyle} />
            <p className="creation-style-hint">{t("creation.style.hint")}</p>
          </section>

          <button
            className="btn-iron creation-start"
            disabled={!canStart}
            onClick={() =>
              void runWithScreenFade(() =>
                createCharacter({ name, portrait: portraitId, startingStyle, starterKit: true }),
              )
            }
          >
            <span>{t("creation.start")}</span>
            <small>{t("creation.beginHint").replace("{name}", heroName).replace("{style}", styleLabel)}</small>
          </button>
        </div>
      </div>

      {showGallery && (
        <PortraitPickerModal
          currentId={portraitId}
          title={t("creation.portrait.showAll")}
          onConfirm={(id) => {
            setPortraitId(id);
            // Filter der Karten-Ansicht (Rasse/Gruppe/Variante) an die aus der Galerie gewählte
            // Figur angleichen, damit das Raster darunter danach wieder zur Auswahl passt.
            const parsed = parsePortraitId(id);
            if (parsed) {
              setRace(parsed.race);
              setSex(parsed.sex);
              const archetype = ARCHETYPES.find((a) => a.id === parsed.archetype);
              if (archetype) setGroup(archetype.group);
            }
            setShowGallery(false);
          }}
          onCancel={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}
