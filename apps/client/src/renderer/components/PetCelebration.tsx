import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { equipPet } from "@hearthforge/engine";
import type { PetDef } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPetSrc } from "../pets";
import { registerEscCloser } from "../util/escStack";
import { PetEffectRows } from "../pages/PetGalleryPage";
import "../styles/pet-celebration.css";

interface CelebrationState {
  petId: string;
  pet: PetDef | undefined;
}

/**
 * Dev-only screenshot hook (see game/fixtureLoader.ts for the identical pattern): lets the
 * ui-audit Playwright scripts force this overlay open via `?petTest=<petId>` without touching
 * the real `lastPetDrop` engine flow. Gated on `import.meta.env.DEV`, so Vite strips the dead
 * branch (including the URL read) from production builds — none of this exists in the shipped
 * Electron app.
 */
function getPetTestParam(): string | null {
  if (!import.meta.env.DEV) return null;
  try {
    return new URLSearchParams(window.location.search).get("petTest");
  } catch {
    return null;
  }
}

/**
 * Feier-Overlay fur ultra-seltene Pet-Drops (1/75k–1/120k).
 * Erscheint einmalig pro Drop (via lastPetDrop.seq), blendet nach 7 s
 * automatisch aus oder wird per Klick geschlossen.
 */
export function PetCelebration(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  // Welle DD-Vertrag (Fun-Sweep Fenn, "Kein Drop darf je stumm sein"): seenSeq initialisiert sich
  // aus `state.petDropSeq` (monotoner Lebenszeit-Zähler), NICHT mehr aus `lastPetDrop?.seq` — der
  // alte Code startete nach jeder UI-Quittung (`lastPetDrop = null`) faktisch wieder bei "0 gesehen"
  // und der zweite Drop einer Session (der wieder bei seq 1 begann, s. petDropSeq-JSDoc) fiel unter
  // die eigene Hochwassermarke. `petDropSeq` überlebt die Quittung, also erkennt der Vergleich unten
  // (`drop.seq > seenSeq.current`) jeden echten neuen Drop, ob 1., 2. oder n-ter dieser Session.
  // Welle MM (Pip P2 „Lade-Nachholung darf nicht stumm sein", Toasts.tsx-Pendant): dieselbe
  // Mount-Swallow-Falle wie bei den Toast-Breadcrumbs — `state.petDropSeq` reflektiert bereits
  // einen beim Laden nachgeholten, aber noch UNQUITTIERTEN Drop (`lastPetDrop != null`); die
  // Baseline lief dann mit dessen `seq` GLEICH und die Celebration feuerte nie (`drop.seq <=
  // seenSeq.current` kippte sofort auf "schon gesehen"). Ist ein Breadcrumb beim Mount pending,
  // startet die Baseline einen Schritt darunter, damit der erste Effect-Lauf ihn als neu erkennt.
  const seenSeq = useRef<number>(
    state.lastPetDrop ? state.lastPetDrop.seq - 1 : state.petDropSeq,
  );
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const drop = state.lastPetDrop;
    if (!drop) return;
    if (drop.seq <= seenSeq.current) return;

    // New drop — fire exactly once.
    seenSeq.current = drop.seq;
    const pet = content.pets[drop.petId] as PetDef | undefined;
    setCelebration({ petId: drop.petId, pet });
    setExiting(false);

    // Clear breadcrumb so the engine does not re-fire.
    state.lastPetDrop = null;

    // Auto-dismiss after 7 s.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dismiss(), 7000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Dev-only: `?petTest=<petId>` preview, independent of the real lastPetDrop flow above.
  useEffect(() => {
    const testId = getPetTestParam();
    if (!testId) return;
    const pet = content.pets[testId] as PetDef | undefined;
    setCelebration({ petId: testId, pet });
    setExiting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss(): void {
    setExiting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Wait for the CSS fade-out animation, then unmount.
    setTimeout(() => {
      setCelebration(null);
      setExiting(false);
    }, 500);
  }

  // Chef-GO Hotkeys: solange das Overlay sichtbar ist, bei der zentralen Escape-Registry anmelden
  // (util/escStack.ts) — Priorität "modal", wie ein Klick auf den Close-Button/Backdrop.
  useEffect(() => {
    if (!celebration) return;
    return registerEscCloser("modal", dismiss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration]);

  if (!celebration) return <></>;

  const { pet } = celebration;
  const icon = pet?.icon ?? "🐾";
  const name = pet ? tr(pet.name) : celebration.petId;
  const description = pet?.description ? tr(pet.description) : null;
  const petSrc = getPetSrc(celebration.petId);

  return (
    <div
      className={`pet-celebration-backdrop${exiting ? " pet-celebration-exit" : ""}`}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={t("petCelebration.ariaLabel")}
    >
      <div
        className="pet-celebration-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shimmer shine layer */}
        <div className="pet-celebration-shine" />

        <div className="pet-celebration-tag">{t("petCelebration.ultraRare")}</div>

        <div className="pet-celebration-icon-wrap">
          {/* Prestige-only glow exception (analog to runes): rotating gold rays + drifting sparks. */}
          <div className="pet-celebration-burst" aria-hidden="true" />
          <div className="pet-celebration-particles" aria-hidden="true">
            <span /><span /><span /><span /><span /><span />
          </div>
          <div className="pet-celebration-ring" />
          {petSrc
            ? <img loading="lazy" decoding="async" src={petSrc} alt={name} className="pet-celebration-art pixelart" />
            : <span className="pet-celebration-icon">{icon}</span>}
        </div>

        <div className="pet-celebration-label">{t("petCelebration.title")}</div>
        <div className="pet-celebration-name">{name}</div>
        {description && <div className="pet-celebration-desc">{description}</div>}

        {/* Welle EE (Fenn F3, "das Overlay lässt mich damit … nichts tun"): dieselben Passiv-/
            Aktiv-Zeilen wie die Galerie-Karte, PLUS ein "Jetzt ausrüsten"-Button direkt hier —
            der seltenste Moment des Spiels bekommt jetzt auch die volle Auskunft + eine Tat. */}
        {pet && (
          <div className="pet-celebration-effects">
            <PetEffectRows pet={pet} t={t} tr={tr} />
          </div>
        )}
        <div className="pet-celebration-sub">{t("petCelebration.sub")}</div>

        {pet && (
          <button
            className="pet-celebration-equip ds-button"
            disabled={state.character.companionPetId === celebration.petId}
            onClick={() => equipPet(state, celebration.petId)}
          >
            {state.character.companionPetId === celebration.petId
              ? t("companions.equipped")
              : t("petCelebration.equipNow")}
          </button>
        )}
        <button className="pet-celebration-close ds-button" onClick={dismiss}>
          {t("petCelebration.close")}
        </button>
      </div>
    </div>
  );
}
