import { useEffect, useRef, useState } from "react";
import { DEFAULT_PORTRAIT } from "@hearthforge/shared";
import type { WeaponStyle } from "@hearthforge/shared";
import { listPortraits, getPortrait } from "../portraits";
import { processPortraitFile } from "../util/portraitUpload";
import { PortraitPickerModal } from "../components/PortraitPickerModal";
import { useGameControl } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getUiIcon } from "../uiIcons";

const PORTRAITS = listPortraits();

// ─── Style-Karten-Definition ─────────────────────────────────────────────────

interface StyleCardDef {
  id: WeaponStyle;
  iconKey: string;
  emoji: string;
  nameKey: string;
  descKey: string;
}

const STYLE_CARDS: StyleCardDef[] = [
  { id: "melee",  iconKey: "icon_attribute_meeledamage",  emoji: "⚔️", nameKey: "style.melee",  descKey: "creation.style.melee.desc"  },
  { id: "ranged", iconKey: "icon_attribute_rangedamage",   emoji: "🏹", nameKey: "style.ranged", descKey: "creation.style.ranged.desc" },
  { id: "magic",  iconKey: "icon_attribute_magicdamage",   emoji: "🔮", nameKey: "style.magic",  descKey: "creation.style.magic.desc"  },
];

// ─── StylePicker ─────────────────────────────────────────────────────────────
// Task #282: die Waffen-FX-Icons sind eigenständige Illustrationen (kein simples Icon-Set) —
// deutlich größer inszeniert als zuvor, damit sie als echte "Waffen-Vorschau" pro Startstil lesen.

interface StylePickerProps {
  value: WeaponStyle;
  onChange: (s: WeaponStyle) => void;
}

function StylePicker({ value, onChange }: StylePickerProps): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="creation-style-grid">
      {STYLE_CARDS.map(({ id, iconKey, emoji, nameKey, descKey }) => {
        const img = getUiIcon(iconKey);
        return (
          <button
            key={id}
            type="button"
            className={`creation-style-card${value === id ? " active" : ""}`}
            onClick={() => onChange(id)}
          >
            <span className="creation-style-icon">
              {img
                ? <img loading="lazy" decoding="async" src={img} alt="" className="creation-style-icon-img" />
                : <span>{emoji}</span>
              }
            </span>
            <span className="creation-style-name">{t(nameKey)}</span>
            <span className="creation-style-desc">{t(descKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── PortraitStrip ────────────────────────────────────────────────────────────
// Task #282: ersetzt die alte Pfeil-Klick-Navigation — alle Portraits liegen als Filmstreifen
// griffbereit da (sofortige Auswahl statt blindem Durchblättern), "Alle anzeigen" öffnet
// weiterhin die große Modal-Galerie (PortraitPickerModal, geteilt mit CharacterPage).

interface PortraitStripProps {
  value: string;
  onChange: (id: string) => void;
  onShowAll: () => void;
}

function PortraitStrip({ value, onChange, onShowAll }: PortraitStripProps): JSX.Element {
  const { t } = useI18n();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value]);

  return (
    <div className="creation-portrait-row">
      <div className="creation-portrait-strip">
        {PORTRAITS.map((p) => {
          const isActive = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              ref={isActive ? activeRef : undefined}
              className={`creation-portrait-chip${isActive ? " active" : ""}`}
              aria-pressed={isActive}
              onClick={() => onChange(p.id)}
            >
              {p.url && <img loading="lazy" decoding="async" src={p.url} alt="" />}
            </button>
          );
        })}
      </div>
      <button type="button" className="creation-portrait-more-btn" onClick={onShowAll}>
        {t("creation.portrait.showAll")}
      </button>
    </div>
  );
}

// ─── CharacterCreation ───────────────────────────────────────────────────────

export function CharacterCreation(): JSX.Element {
  const { createCharacter, cancelCreation } = useGameControl();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [portraitId, setPortraitId] = useState<string>(
    PORTRAITS.find((p) => p.id === DEFAULT_PORTRAIT)?.id ?? PORTRAITS[0]?.id ?? DEFAULT_PORTRAIT,
  );
  const [startingStyle, setStartingStyle] = useState<WeaponStyle>("melee");
  const [showGallery, setShowGallery] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = getPortrait(portraitId);
  const canStart = name.trim().length > 0;
  const displayName = (name.trim() || t("creation.nameless")).toUpperCase();

  return (
    <div className="creation">
      {/* Left: Arch showcase — großformatige Live-Vorschau von Name + Portrait */}
      <div className="creation-showcase">
        <button className="creation-back" onClick={cancelCreation}>
          {t("creation.back")}
        </button>
        <span className="creation-showcase-ornament" aria-hidden="true">◆ ◆ ◆</span>
        <div className="creation-portrait-frame">
          {/* Chef 2026-07-11: eigenes Bild als Porträt hochladen — oben rechts im Rahmen, für
              Spieler, die sich ihr Charakterbild selbst generieren lassen. Die Data-URL landet
              wie eine normale Portrait-ID in `character.portrait` (createCharacter unten). */}
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
            <img loading="lazy" decoding="async" className="showcase-img" src={previewUrl} alt="" />
          ) : (
            <span className="showcase-silhouette">👤</span>
          )}
          <div className="showcase-name">{displayName}</div>
        </div>
      </div>

      {/* Right: Form panel — geführte Reise Name → Look → Stil → Los */}
      <div className="creation-panel">
        <div className="creation-panel-inner">
          <h1>{t("creation.title")}</h1>
          <p className="creation-subtitle">{t("creation.subtitle")}</p>

          <div className="creation-divider" aria-hidden="true">
            <div className="creation-divider-line" />
            <span className="creation-divider-diamond">◆</span>
            <div className="creation-divider-line" />
          </div>

          <div className="field">
            <div className="field-label">
              <span className="creation-step-num">1</span>
              {t("creation.name")}
            </div>
            <input
              className="creation-input"
              value={name}
              maxLength={24}
              placeholder={t("creation.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <div className="field-label">
              <span className="creation-step-num">2</span>
              {t("creation.portrait.label")}
            </div>
            <PortraitStrip value={portraitId} onChange={setPortraitId} onShowAll={() => setShowGallery(true)} />
          </div>

          <div className="field">
            <div className="field-label">
              <span className="creation-step-num">3</span>
              {t("creation.style.label")}
            </div>
            <StylePicker value={startingStyle} onChange={setStartingStyle} />
            <p className="creation-style-hint">{t("creation.style.hint")}</p>
          </div>

          <button
            className="creation-start"
            disabled={!canStart}
            onClick={() =>
              void createCharacter({ name, portrait: portraitId, startingStyle, starterKit: true })
            }
          >
            {t("creation.start")}
          </button>
        </div>
      </div>

      {showGallery && (
        <PortraitPickerModal
          currentId={portraitId}
          title={t("creation.portrait.showAll")}
          onConfirm={(id) => {
            setPortraitId(id);
            setShowGallery(false);
          }}
          onCancel={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}
