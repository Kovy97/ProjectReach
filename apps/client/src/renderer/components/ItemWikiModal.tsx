import { useEffect, useSyncExternalStore } from "react";
import { content } from "@hearthforge/content";
import { isZoneUnlocked } from "@hearthforge/engine";
import type { GameState, ItemInstance } from "@hearthforge/shared";
import { getItemRarity, instanceDisplayName, RARITY_LABEL } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { getSidebarIcon } from "../sidebarIcons";
import { getSkillIcon, SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getUiIcon } from "../uiIcons";
import { registerEscCloser } from "../util/escStack";
import { formatDropPct, formatNum } from "../util/format";
import { ITEM_SOURCE_INDEX, ITEM_USED_FOR_INDEX, type ItemWikiSource, type ItemWikiUse } from "../util/itemWiki";
import { jumpToAction } from "../util/skillJump";
import { jumpToMonster } from "../util/monsterJump";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
const SHOP_ICON_URL = getSidebarIcon("shop");
// Story-Zonen-Gate (Task #350, Chef-Fund "Wiki-Links führen in gesperrte Zonen"): dasselbe
// Schloss-Icon wie die Zonen-/Dungeon-Karten in CombatPage.tsx (`LOCK_ICON_URL`-Muster dort).
const LOCK_ICON_URL = getUiIcon("icon_locked");

/** Skill-Icon für eine Quelle-/Verwendungs-Zeile: Kampf-PNG → Sidebar-PNG → Emoji (dieselbe
 *  3-stufige Kette wie SkillsOverviewPage's `SkillIconImg`). */
function WikiSkillIcon({ skillId }: { skillId: string }): JSX.Element {
  const url = getSkillIcon(skillId) ?? getSidebarIcon(skillId);
  return url ? (
    <img loading="lazy" decoding="async" src={url} alt="" className="iwk-row-icon-img" />
  ) : (
    <span className="iwk-row-icon-emoji">{SKILL_EMOJI_FALLBACK[skillId] ?? "✦"}</span>
  );
}

/**
 * Formatiert eine Drop-/Erfolgschance IMMER als Prozent (Chef-Entscheid 2026-07-09: „Das sollte
 * immer % sein" — die Bruch-Schreibweise 1/2500 ist raus). Delegiert an `formatDropPct` (Welle KK,
 * Grete-Retest #8b: Karte zeigte „0,10 %" — lokalisiert mit Komma —, das Wiki daneben „0.1%" mit
 * fest verdrahtetem Punkt; dieselbe Quelle wie die Dungeon-Beute-Vorschau/Bestiarium behebt beide
 * Symptome auf einen Schlag: gleiche Rundung UND locale-bewusstes Trennzeichen). Die „—"-Sonderrolle
 * für eine echte 0 bleibt lokal (Content-Bug-Signal, kein Fall für die geteilte Funktion).
 */
function pct(chance: number): string {
  if (chance <= 0) return "—"; // echte 0 wäre ein Content-Bug; ehrlich als „—" statt „0%"
  return formatDropPct(chance);
}

/**
 * Trägt die einzige `useGameState()`-Abhängigkeit der Quelle-Liste (Task #350 Zonen-Gate-Check
 * je Monster-Zeile, s. `SourceRow`). Bewusst ALS EIGENE KOMPONENTE statt `useGameState()` direkt
 * in `ItemWikiModalOverlay` (die app-weit gemountet ist, s. App.tsx) — `useGameState()`/
 * LiveContext re-rendert bei JEDEM 10-Hz-Tick (GameContext.tsx-JSDoc); die Overlay-Komponente
 * selbst bliebe sonst dauerhaft im 10-Hz-Takt, auch wenn kein Wiki-Modal offen ist. Diese
 * Komponente existiert nur, SOLANGE das Modal offen ist (Aufrufer rendert sie innerhalb des
 * `if (!payload) return null`-Zweigs) — der 10-Hz-Re-Render läuft also nur während der Spieler
 * das Wiki tatsächlich ansieht, exakt wie die Perf-Welle-Konvention andernorts (s. z.B.
 * EliteMiniWindow's `activeEliteSelector`).
 */
function SourceList({ sources }: { sources: ItemWikiSource[] }): JSX.Element {
  const state = useGameState();
  return (
    <ul className="iwk-list">
      {sources.map((s, i) => (
        <SourceRow key={i} entry={s} state={state} />
      ))}
    </ul>
  );
}

function SourceRow({ entry, state }: { entry: ItemWikiSource; state: GameState }): JSX.Element {
  const { t, tr } = useI18n();
  if (entry.kind === "shop") {
    return (
      <li className="iwk-row iwk-row-shop">
        {SHOP_ICON_URL
          ? <img loading="lazy" decoding="async" src={SHOP_ICON_URL} alt="" className="iwk-row-icon-img" />
          : <span className="iwk-row-icon-emoji" aria-hidden="true">🛒</span>}
        <span className="iwk-row-name">{t("itip.sourceShop")}</span>
        <span className="iwk-row-val">
          {formatNum(entry.cost)}
          {GOLD_ICON_URL && <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />}
        </span>
      </li>
    );
  }
  if (entry.kind === "slayerShop") {
    return (
      <li className="iwk-row iwk-row-shop">
        <span className="iwk-row-icon-emoji" aria-hidden="true">💀</span>
        <span className="iwk-row-name">{t("nav.slayer")}</span>
        <span className="iwk-row-val">{formatNum(entry.cost)} {t("slayer.points")}</span>
      </li>
    );
  }
  if (entry.kind === "tokenShop") {
    return (
      <li className="iwk-row iwk-row-shop">
        <span className="iwk-row-icon-emoji" aria-hidden="true">🎟️</span>
        <span className="iwk-row-name">{t("quests.shop.title")}</span>
        <span className="iwk-row-val">{formatNum(entry.tokenCost)} 🎟️</span>
      </li>
    );
  }
  if (entry.kind === "crop") {
    // Ernte-Ertrag: Farming-Skill-Icon + Beet-Name; garantierter Ertrag → 100 %.
    return (
      <li className="iwk-row">
        <WikiSkillIcon skillId="farming" />
        <span className="iwk-row-name">{tr(entry.name)}</span>
        <span className="iwk-row-val">100%</span>
      </li>
    );
  }
  if (entry.kind === "action") {
    // Wiki→Rezept-Sprung (Chef-Auftrag, Beispiel "Sinew Bowstring" → Quelle "Twist Bowstring"):
    // die erzeugende Aktion ist klickbar — schließt das Modal, springt zur Skill-Seite, klappt
    // die Kategorie auf und hebt die Rezeptkarte kurz hervor (s. util/skillJump.ts + SkillPage.tsx).
    return (
      <li
        className="iwk-row iwk-row-clickable"
        role="button"
        tabIndex={0}
        title={t("itemwiki.jumpToRecipe")}
        onClick={() => {
          closeItemWikiModal();
          jumpToAction(entry.actionId);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          closeItemWikiModal();
          jumpToAction(entry.actionId);
        }}
      >
        <WikiSkillIcon skillId={entry.skillId} />
        <span className="iwk-row-name">{tr(entry.name)}</span>
        <span className="iwk-row-val">{pct(entry.chance)}</span>
      </li>
    );
  }
  if (entry.kind === "monster") {
    // Wiki→Kampfgebiet-Sprung (Chef-Auftrag, spiegelt den Rezept-Sprung oben): die Monster-Quelle
    // ist klickbar — schließt das Modal, springt zur Kampf-Seite, öffnet die Zone, in der das
    // Monster vorkommt, und hebt seine Monster-Karte kurz hervor (s. util/monsterJump.ts +
    // CombatPage.tsx). Dungeon-Quellen bleiben bewusst reiner Text (Chef-Scope) — s. Zweig unten.
    //
    // Story-Zonen-Gate (Task #350, Chef-Fund "Über Wiki-Links können wir in Gebiete rein, wo wir
    // noch nicht rein sollten"): der Sprung landete bisher UNGEACHTET des Zonen-Gates direkt in
    // der Zonen-Monster-Ansicht (`jumpToMonster` → CombatPage setzt `zoneId` ohne die
    // `isZoneUnlocked`-Prüfung der normalen Zonen-Karte). Der Eintrag bleibt SICHTBAR (keine
    // Spoiler-Politik-Änderung — Bestiarium/Wiki zeigen weiter alle Quellen), aber für eine
    // gesperrte Zone ist die Zeile nicht mehr klickbar: gedimmt + Schloss-Icon + Tooltip, exakt
    // das Muster der Zonen-/Dungeon-Karten (`zone-card-story-locked`, s. CombatPage.tsx) und des
    // Bestiarium-„Kämpfen"-Buttons (BestiaryPage.tsx `zoneLocked`).
    const monster = content.monsters[entry.monsterId];
    const zoneLocked = !!monster?.zone && !isZoneUnlocked(state, content, monster.zone);
    if (zoneLocked) {
      const zoneDef = content.zones.find((z) => z.id === monster!.zone);
      const gateQuest = zoneDef?.requiresQuest
        ? content.quests.find((q) => q.id === zoneDef.requiresQuest)
        : undefined;
      const gateHint = t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"));
      return (
        <li className="iwk-row iwk-row-locked" title={gateHint}>
          <span className="iwk-row-icon-emoji" aria-hidden="true">⚔️</span>
          <span className="iwk-row-name">{tr(entry.name)}</span>
          <span className="iwk-row-lock-badge" aria-hidden="true">
            {LOCK_ICON_URL
              ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" />
              : "🔒"}
          </span>
          <span className="iwk-row-val">{pct(entry.chance)}</span>
        </li>
      );
    }
    return (
      <li
        className="iwk-row iwk-row-clickable"
        role="button"
        tabIndex={0}
        title={t("itemwiki.jumpToMonster")}
        onClick={() => {
          closeItemWikiModal();
          jumpToMonster(entry.monsterId);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          closeItemWikiModal();
          jumpToMonster(entry.monsterId);
        }}
      >
        <span className="iwk-row-icon-emoji" aria-hidden="true">⚔️</span>
        <span className="iwk-row-name">{tr(entry.name)}</span>
        <span className="iwk-row-val">{pct(entry.chance)}</span>
      </li>
    );
  }
  // dungeon — dieselbe Zeilenform, nicht klickbar (Chef-Scope, s. Kommentar oben).
  return (
    <li className="iwk-row">
      <span className="iwk-row-icon-emoji" aria-hidden="true">🏰</span>
      <span className="iwk-row-name">{tr(entry.name)}</span>
      <span className="iwk-row-val">{pct(entry.chance)}</span>
    </li>
  );
}

function UseRow({ entry, onOpenOutput }: { entry: ItemWikiUse; onOpenOutput: (itemId: string) => void }): JSX.Element {
  const { tr, t } = useI18n();
  const outputImg = getItemImage(entry.outputItemId);
  const outputItem = content.items[entry.outputItemId];
  // Wiki→Rezept-Sprung: nur für ECHTE Aktionen klickbar — Farming-Ernte-Einträge tragen eine
  // synthetische `crop:<id>`-ID ohne content.actions-Gegenstück (s. util/itemWiki.ts buildIndices)
  // und haben keine Rezeptkarte auf einer SkillPage; dort bleibt dieser Teil reiner Text.
  const isRealAction = !!content.actions[entry.actionId];
  const jump = (): void => {
    closeItemWikiModal();
    jumpToAction(entry.actionId);
  };
  return (
    <li className="iwk-row iwk-row-use">
      {isRealAction ? (
        <span
          className="iwk-use-source iwk-row-clickable"
          role="button"
          tabIndex={0}
          title={t("itemwiki.jumpToRecipe")}
          onClick={jump}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") jump();
          }}
        >
          <WikiSkillIcon skillId={entry.skillId} />
          <span className="iwk-row-name">{tr(entry.actionName)}</span>
        </span>
      ) : (
        <>
          <WikiSkillIcon skillId={entry.skillId} />
          <span className="iwk-row-name">{tr(entry.actionName)}</span>
        </>
      )}
      <span className="iwk-use-arrow" aria-hidden="true">&#9658;</span>
      <button
        type="button"
        className={`iwk-use-output ${rarityClass(outputItem?.rarity)}`}
        onClick={() => onOpenOutput(entry.outputItemId)}
        title={t("itemwiki.openAria")}
      >
        {outputImg ? (
          <img loading="lazy" decoding="async" src={outputImg} alt="" className="pixelart iwk-use-output-img" />
        ) : outputItem?.icon ? (
          <span className="iwk-row-icon-emoji">{outputItem.icon}</span>
        ) : null}
        {tr(entry.outputName)}
      </button>
    </li>
  );
}

// ── Modul-globaler Mini-Store (kein Context nötig — wie ItemTooltip's `store`, s. dortiges JSDoc):
// der "?"-Button lebt tief im ItemTooltip-Baum, das Modal muss aber von ÜBERALL (Inventar/Bank/Shop/
// Loadout/Token-Shop) aus öffenbar sein. `openItemWikiModal` ist die einzige Kontaktfläche.
interface WikiPayload {
  itemId: string;
  instance?: ItemInstance;
}

let current: WikiPayload | null = null;
const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
const store = {
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: (): WikiPayload | null => current,
};

/** Öffnet das Item-Wiki-Modal (aus dem "?"-Button im Tooltip ODER dem Klick auf einen Verwendungs-
 *  Zielitem in einem bereits offenen Wiki-Modal — s. `UseRow`). Ersetzt einen evtl. bereits offenen
 *  Wiki-Eintrag direkt (kein Stack), spiegelbildlich zu `useItemTooltip().pin`. */
export function openItemWikiModal(itemId: string, instance?: ItemInstance): void {
  current = { itemId, instance };
  emit();
}

export function closeItemWikiModal(): void {
  if (current) {
    current = null;
    emit();
  }
}

/**
 * Einmalig in App montiert (neben `ItemTooltipOverlay`): rendert das Item-Wiki-Modal, sobald
 * `openItemWikiModal` aufgerufen wurde. Citadel-Modal-Grundgerüst (`.modal-overlay`/`.modal`, wie
 * `PortraitPickerModal`) + eigener `iwk-*`-Namespace für den Inhalt (styles/item-wiki.css).
 */
export function ItemWikiModalOverlay(): JSX.Element | null {
  const payload = useSyncExternalStore(store.subscribe, store.get);
  const { t, tr, locale } = useI18n();

  // Escape schließt über die zentrale Prioritäts-Registry (util/escStack.ts, Priorität "modal" —
  // ein gepinntes ItemTooltip darunter schließt zuerst, s. dortiges JSDoc), NICHT über einen
  // eigenen keydown-Listener.
  useEffect(() => {
    if (!payload) return;
    return registerEscCloser("modal", closeItemWikiModal);
  }, [payload]);

  if (!payload) return null;
  const item = content.items[payload.itemId];
  if (!item) return null;

  const img = getItemImage(item.id);
  const rarity = getItemRarity(item);
  const displayName =
    payload.instance && (payload.instance.affixes.length > 0 || payload.instance.suffix)
      ? instanceDisplayName(payload.instance, content, locale)
      : tr(item.name);

  const sources = ITEM_SOURCE_INDEX.get(item.id) ?? [];
  const uses = ITEM_USED_FOR_INDEX.get(item.id) ?? [];

  return (
    <div className="modal-overlay iwk-overlay" onClick={closeItemWikiModal}>
      <div className="modal iwk-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={closeItemWikiModal} aria-label={t("common.close")} />


        <div className="iwk-kicker">{t("itemwiki.kicker")}</div>

        <div className="iwk-head">
          <div className={`iwk-head-icon ${rarityClass(item.rarity)}`}>
            {img ? (
              <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" />
            ) : item.icon ? (
              <span className="iwk-head-emoji">{item.icon}</span>
            ) : (
              <span className="iwk-head-emoji">?</span>
            )}
          </div>
          <div className="iwk-head-text">
            <div className={`iwk-head-name ${rarityClass(item.rarity)}`}>{displayName}</div>
            <div className={`iwk-head-rarity ${rarityClass(item.rarity)}`}>{tr(RARITY_LABEL[rarity])}</div>
            <div className="iwk-head-meta">
              {item.value !== undefined && (
                <span className="iwk-head-meta-item">
                  {t("char.itemValue")}: {formatNum(item.value)}
                  {GOLD_ICON_URL && <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />}
                </span>
              )}
              <span className="iwk-head-meta-item">
                {t("itemwiki.stackable")}: {item.stackable ? t("itemwiki.yes") : t("itemwiki.no")}
              </span>
            </div>
          </div>
        </div>

        <div className="iwk-body">
          <section className="iwk-section">
            <h3 className="iwk-section-title">{t("itip.source")}</h3>
            {sources.length === 0 ? (
              <div className="iwk-empty">{t("itemwiki.noSource")}</div>
            ) : (
              <SourceList sources={sources} />
            )}
          </section>

          <section className="iwk-section">
            <h3 className="iwk-section-title">{t("itip.usedFor")}</h3>
            {uses.length === 0 ? (
              <div className="iwk-empty">{t("itemwiki.noUsedFor")}</div>
            ) : (
              <ul className="iwk-list">
                {uses.map((u, i) => (
                  <UseRow key={i} entry={u} onOpenOutput={(id) => openItemWikiModal(id)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
