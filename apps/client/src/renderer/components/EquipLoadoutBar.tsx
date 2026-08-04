import { content } from "@hearthforge/content";
import { applyLoadout, saveLoadout } from "@hearthforge/engine";
import { EQUIP_LOADOUT_COUNT } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage } from "../items";
import { playSfx } from "../util/audio";
import { HoverTip } from "./CitadelTip";
import { gameAlert } from "./GameAlert";

/**
 * Ausrüstungs-Loadouts 1/2/3 (Task #349, Headline-Feature 0.2.3 — Spieler-Wunsch „drei
 * Loadout-Slots zum schnellen Stil-Wechsel"): kompakte Leiste oben im Equipment-Tab des
 * Character-Screens (CharacterPage, über der EquipmentDoll).
 *
 * BEDIENKONZEPT (bewusst zwei sichtbare Knöpfe statt verstecktem Rechtsklick):
 *  • Großer Knopf „1/2/3" (mit Waffen-Icon des Loadouts) = ANLEGEN. Leer = gedimmt/disabled.
 *  • Kleiner Disketten-Knopf daneben = aktuelles Equipment in DIESEN Slot SPEICHERN.
 *  Beide erklären sich per Citadel-HoverTip (KEIN natives title). Ergebnis kommt als
 *  GameAlert-Einblendung („Loadout N: X von Y angelegt" — gold bei voll, rot bei Teil-Erfolg).
 *
 * Die Logik lebt KOMPLETT in engine/loadouts.ts (saveLoadout/applyLoadout — Anlegen über den
 * normalen Equip-Pfad inkl. Requirements, Bank-/Vault-Abhebung, Instanz-Treue); diese Komponente
 * ruft nur auf und meldet. Re-Render nach der State-Mutation kommt wie bei jedem Equip-Klick über
 * den nächsten Game-Tick (~100 ms, GameContext) — dasselbe Muster wie EquipmentDoll/CharacterPage.
 */
export function EquipLoadoutBar(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  const onApply = (i: number): void => {
    const res = applyLoadout(state, content, i);
    if (!res.ok) return; // leerer Slot ist disabled — hier nur Defensive
    if (res.applied > 0) playSfx("equip");
    gameAlert(
      "loadout.applied",
      { n: i + 1, x: res.applied, y: res.total },
      res.skipped.length === 0 ? "success" : "error",
    );
  };

  const onSave = (i: number): void => {
    if (!saveLoadout(state, i)) return;
    playSfx("equip");
    gameAlert("loadout.saved", { n: i + 1 }, "success");
  };

  return (
    <div className="eq-loadout-bar" role="group" aria-label={t("loadout.aria")}>
      <span className="eq-loadout-label">{t("loadout.title")}</span>
      {Array.from({ length: EQUIP_LOADOUT_COUNT }, (_, i) => {
        const lo = state.equipLoadouts[i] ?? null;
        const empty = lo === null;
        const pieces = lo ? Object.keys(lo).length : 0;
        const mainhandId = lo?.mainhand?.itemId ?? null;
        const mainhandItem = mainhandId ? content.items[mainhandId] : undefined;
        const iconUrl = mainhandId ? getItemImage(mainhandId) : null;
        const slotName = t("loadout.slotLabel").replace("{n}", String(i + 1));
        return (
          <div key={i} className="eq-loadout-slot">
            <HoverTip
              as="div"
              focusable={false}
              className="eq-loadout-tipwrap"
              content={
                <>
                  <span className="ct-tip-title">{slotName}</span>
                  {empty ? (
                    <span className="ct-tip-desc">{t("loadout.tip.empty")}</span>
                  ) : (
                    <>
                      {mainhandItem && <span className="ct-tip-desc">{tr(mainhandItem.name)}</span>}
                      <span className="ct-tip-desc">
                        {t("loadout.pieces").replace("{n}", String(pieces))}
                      </span>
                      <span className="ct-tip-desc">{t("loadout.tip.apply")}</span>
                    </>
                  )}
                </>
              }
            >
              <button
                type="button"
                className={`eq-loadout-btn${empty ? " eq-loadout-empty" : ""}`}
                disabled={empty}
                aria-label={slotName}
                onClick={() => onApply(i)}
              >
                {iconUrl && <img loading="lazy" decoding="async" src={iconUrl} alt="" className="eq-loadout-btn-icon" />}
                <span className="eq-loadout-btn-num">{i + 1}</span>
              </button>
            </HoverTip>
            <HoverTip
              as="div"
              focusable={false}
              className="eq-loadout-tipwrap"
              content={
                <span className="ct-tip-desc">
                  {t("loadout.tip.save").replace("{n}", String(i + 1))}
                </span>
              }
            >
              <button
                type="button"
                className="eq-loadout-save-btn"
                aria-label={t("loadout.tip.save").replace("{n}", String(i + 1))}
                onClick={() => onSave(i)}
              >
                {/* Disketten-Glyphe inline (Muster Portrait-Upload-SVG in CharacterPage — keine Emojis) */}
                <svg className="eq-loadout-save-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 3h11l3 3v15H5V3zm2 2v5h9V5H7zm7 1h2v3h-2V6zM7 13v6h10v-6H7zm2 2h6v2H9v-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </HoverTip>
          </div>
        );
      })}
    </div>
  );
}
