import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { COMBAT_SKILL_IDS } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import {
  ONBOARDING_OPEN_EVENT,
  isOnboardingDone,
  setOnboardingDone,
} from "../util/onboarding";
import { getSkillIcon, SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getSidebarIcon } from "../sidebarIcons";

// ─── Step types ────────────────────────────────────────────────────────────────

type SystemKey = "achievements" | "mastery" | "shop" | "bank";

type Step =
  | { kind: "welcome" }
  | { kind: "skill"; id: string }
  | { kind: "combat" }
  | { kind: "system"; key: SystemKey }
  | { kind: "done" };

// ─── Static step list (computed once at module load) ───────────────────────────

const COMBAT_IDS = new Set<string>(COMBAT_SKILL_IDS);

const GENERAL_SKILL_IDS: string[] = Object.keys(content.skills).filter(
  (id) => !COMBAT_IDS.has(id),
);

const STEPS: Step[] = [
  { kind: "welcome" },
  ...GENERAL_SKILL_IDS.map((id): Step => ({ kind: "skill", id })),
  { kind: "combat" },
  { kind: "system", key: "achievements" },
  { kind: "system", key: "mastery" },
  { kind: "system", key: "shop" },
  { kind: "system", key: "bank" },
  { kind: "done" },
];

// ─── Icon helpers ──────────────────────────────────────────────────────────────

const SYSTEM_ICON: Record<SystemKey, string> = {
  achievements: "🏆",
  mastery: "⭐",
  shop: "🪙",
  bank: "🏦",
};

function SkillIcon({ id, size }: { id: string; size: number }): JSX.Element {
  const png = getSkillIcon(id) ?? getSidebarIcon(id);
  if (png) {
    return (
      <img loading="lazy" decoding="async"
        src={png}
        alt={id}
        width={size}
        height={size}
        style={{ objectFit: "contain", imageRendering: "pixelated" }}
      />
    );
  }
  return <span>{SKILL_EMOJI_FALLBACK[id] ?? "•"}</span>;
}

/** Icon für die "combat"-/"system"-Schritte (Kampf-Übersicht, Achievements/Mastery/Shop/Bank):
 *  echtes Sidebar-Nav-PNG (dieselbe Quelle wie die Sidebar selbst), sonst Emoji-Fallback. */
function PageIcon({ id, fallback }: { id: string; fallback: string }): JSX.Element {
  const png = getSidebarIcon(id);
  return png ? <img loading="lazy" decoding="async" src={png} alt="" /> : <span>{fallback}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Vollwertiger New-Player-Guide: erscheint beim ersten Spielstart automatisch
 * (localStorage) und ist über die Optionen erneut aufrufbar.
 * Iteriert alle Skills einzeln (Skilling) bzw. gebündelt (Kampf-Skills)
 * und erklärt die vier Kernsysteme.
 */
export function Onboarding(): JSX.Element | null {
  const { t, tr } = useI18n();
  const [open, setOpen] = useState(() => !isOnboardingDone());
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onOpen = (): void => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, onOpen);
  }, []);

  if (!open) return null;

  const close = (): void => {
    setOnboardingDone();
    setOpen(false);
  };

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  // ── Build step content ──────────────────────────────────────────────────────

  let icon: JSX.Element;
  let title: string;
  let body: JSX.Element;

  if (current.kind === "welcome") {
    icon = <span>⚒️</span>;
    title = t("onboarding.welcome.title");
    body = <p className="onboarding-body">{t("onboarding.welcome.body")}</p>;

  } else if (current.kind === "skill") {
    const skillId = current.id;
    const skill = content.skills[skillId];
    icon = <SkillIcon id={skillId} size={64} />;
    title = skill ? tr(skill.name) : skillId;
    body = (
      <p className="onboarding-body">{t(`onboarding.guide.${skillId}`)}</p>
    );

  } else if (current.kind === "combat") {
    icon = <PageIcon id="combat" fallback="⚔️" />;
    title = t("onboarding.guide.combat.title");
    body = (
      <>
        <p className="onboarding-body">{t("onboarding.guide.combat.intro")}</p>
        <ul className="onboarding-combat-list">
          {COMBAT_SKILL_IDS.map((id) => {
            const skill = content.skills[id];
            return (
              <li key={id} className="onboarding-combat-item">
                <span className="onboarding-combat-icon">
                  <SkillIcon id={id} size={22} />
                </span>
                <span>
                  <strong>{skill ? tr(skill.name) : id}</strong>
                  {" — "}
                  <span className="muted">{t(`skilldesc.${id}`)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </>
    );

  } else if (current.kind === "system") {
    const key = current.key;
    icon = <PageIcon id={key} fallback={SYSTEM_ICON[key]} />;
    title = t(`onboarding.guide.${key}.title`);
    body = (
      <p className="onboarding-body">{t(`onboarding.guide.${key}.body`)}</p>
    );

  } else {
    // done
    icon = <span>🌙</span>;
    title = t("onboarding.guide.done.title");
    body = (
      <p className="onboarding-body">{t("onboarding.guide.done.body")}</p>
    );
  }

  return (
    // Kein onClick={close} am Overlay: der Guide darf NICHT durch einen Klick daneben
    // verschwinden (sonst wirkt er „kommt gar nicht"). Schließen nur via Überspringen/Losspielen.
    <div className="modal-overlay">
      <div className="modal onboarding-modal" onClick={(e) => e.stopPropagation()}>
        <button className="onboarding-skip" onClick={close}>
          {t("onboarding.skip")} ✕
        </button>

        {/* Scrollable content area */}
        <div className="onboarding-scrollable">
          <div className="onboarding-icon">{icon}</div>
          <h2>{title}</h2>
          {body}
        </div>

        {/* Fixed footer: dots + navigation */}
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={`onboarding-dot${i === step ? " active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-nav">
          <button
            className="combat-btn ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            {t("onboarding.back")}
          </button>
          <span className="onboarding-count">
            {step + 1} / {STEPS.length}
          </span>
          {isLast ? (
            <button className="combat-btn" onClick={close}>
              {t("onboarding.start")}
            </button>
          ) : (
            <button className="combat-btn" onClick={() => setStep((s) => s + 1)}>
              {t("onboarding.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
