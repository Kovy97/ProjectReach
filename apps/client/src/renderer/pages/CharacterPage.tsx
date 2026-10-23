import { ITEM_RARITIES } from "@hearthforge/shared"; // claude:2026-10-23T23:10:00+02:00 — Bergung: Rarität-Rang
import { SalvageBatchModal, SalvageConfirmModal } from "../components/SalvageModals"; // claude:2026-10-23T23:10:00+02:00 — Bergung (1.4.0)
import { Fragment, useRef, useState, type CSSProperties, type ReactElement, type KeyboardEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { getUiIcon } from "../uiIcons";
import { content } from "@hearthforge/content";
import {
  computeStats,
  effectiveCapacity,
  equipItem,
  equipInstance,
  groupInstancesByBase,
  isItemDiscovered,
  moveInventorySlot,
  sellInstance,
  sellItem,
  buffChargeInfo, itemCount, useConsumable, useConsumableMany,
  usedCapacityUnits,
  consumeFailReason, isSalvageable, isSalvageLocked, salvageItem, toggleSalvageLock
} from "@hearthforge/engine";
import { ActiveBuffsBar } from "../components/ActiveBuffs";
import { HoverTip } from "../components/CitadelTip";
import { EquipKitBar } from "../components/EquipKitBar";
import {
  AttributesGrid,
  CombatStatsPanelGrouped,
  EquipmentDoll,
} from "../components/EquipmentOverview";
import { ItemCell } from "../components/ItemCell";
import { ItemFilterChips, ItemFilterSearch } from "../components/ItemFilterBar";
import type { ItemAction } from "../components/ItemTooltip";
import { PortraitPickerModal } from "../components/PortraitPickerModal";
import { CrateOpenModal } from "../components/CrateOpenModal";
import { VariantContainerCell } from "../components/VariantContainerCell";
import type { ItemInstance } from "@hearthforge/shared";
import { instanceDisplayName } from "@hearthforge/shared";
import { getPortrait, listPortraits } from "../portraits";
import { playSfx } from "../util/audio";
import { gameAlert } from "../components/GameAlert";
import { equipSucceeded, reportEquipFailure } from "../util/equipFeedback";
import { exportCharacterKit } from "../util/characterExport";
import citadelSlotFrameImg from "../assets/ui/citadel/box-character-sheet/slots/slot_frame.webp";
import coinGoldImg from "../assets/ui/citadel/box-inventory/coin_gold.webp";
import emblGearImg from "../assets/ui/emblem_gear.svg";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import {
  compareItemsBy,
  filterCategoryOf,
  getItemImage,
  instanceMatchesSearch,
  itemMatchesSearch,
  type FilterCategory,
} from "../items";
import { statIcon } from "../statIcons";
import { hasSeenNewItemBadge, markNewItemBadgeSeen } from "../util/discoveryBadge";
import { formatNum, formatSeconds1, formatStat } from "../util/format";
import { processPortraitFile } from "../util/portraitUpload";
import { AshNotch } from "../components/AshNotch"; // claude:2026-10-18T14:00:00+02:00 — Aschekerbe am Porträt
import { getInvFilterCat, setInvFilterCat } from "../util/uiPrefs";

// ── types ────────────────────────────────────────────────────────────────────

type SortMode = "newest" | "type" | "name" | "value" | "rarity" | "tier"; // claude:2026-10-23T18:30:00+02:00 — 1.4.0 ST

// ── sub-components ───────────────────────────────────────────────────────────

function Vital({
  label,
  icon,
  cur,
  max,
  kind,
}: {
  label: string;
  icon: string | JSX.Element;
  cur: number;
  max: number;
  kind: "hp" | "ward";
}): JSX.Element {
  const pct = max > 0 ? Math.min(100, (cur / max) * 100) : 0;
  return (
    <div className={`vital ${kind}`}>
      <div className="vital-head">
        <span className="vital-label">
          <span className="vital-icon">{icon}</span>
          {label}
        </span>
        <span className="vital-values">
          {formatNum(cur)} / {formatStat(max)}
        </span>
      </div>
      <div className="vital-bar">
        <div className="vital-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Ornamentaler Panel-Header: ◅── TITLE ──▻ */
function PanelHeader({ title }: { title: string }): JSX.Element {
  // Einheitlicher Header-Stil wie „Attributes": Titel zwischen weichen horizontalen Strichen.
  return (
    <div className="cs-panel-header">
      <span className="cs-section-line" />
      <span className="cs-section-title">{title}</span>
      <span className="cs-section-line" />
    </div>
  );
}

// HP-Icon (für den Vital-Balken)
const HP_ICON_URL = getUiIcon("icon_attribute_hp");

// Defensiver Fallback fürs große Portrait (#249): `App.tsx` (usePortraitFallback) korrigiert
// einen ungültigen `character.portrait` bereits beim Mount + persistiert die Wahl — dieser
// Fallback hier fängt nur den kurzen Zeitraum VOR jenem Effekt ab (erster Paint) sowie jeden
// sonst übersehenen Fall, damit hier nie ein leeres 👤-Platzhalterbild statt eines echten
// Charakters steht. Einmal am Modul-Load berechnet (wie PortraitPickerModal.PORTRAITS) —
// bewusst NICHT zufällig gewählt (würde bei jedem Tick-Re-Render flackern).
const ALL_PORTRAITS = listPortraits();

// ── main component ───────────────────────────────────────────────────────────

export function CharacterPage(): JSX.Element {
  const state = useGameState();
  const { t, tr, locale } = useI18n();
  const c = state.character;
  const stats = computeStats(state, content);
  const inv = state.inventory;
  // Chef-Bugfix 22.07./23.07.-Follow-up ("Zähler zeigt 20/20 trotz 22 belegten Einheiten"): ECHTE
  // Ist-Belegung (Slots + separate Instanz-Tasche, `usedCapacityUnits`) gegen die tatsächliche
  // Kapazität, s. ausführlichen Kommentar am Slot-Count-JSX weiter unten.
  const invUsedUnits = usedCapacityUnits(inv);
  const invCapacity = effectiveCapacity(inv, content);
  const invOverCapacity = invUsedUnits > invCapacity;
  const portraitSrc = getPortrait(c.portrait) ?? getPortrait(ALL_PORTRAITS[0]?.id);
  const [dragItem, setDragItem] = useState<string | null>(null);
  // Quell-Slot beim Drag&Drop-Umsortieren im Inventar (originalIdx); null = kein Inventar-Drag.
  const [dragInvIdx, setDragInvIdx] = useState<number | null>(null);

  /**
   * Sortieren als einmalige AKTION (Chef 31.08.2026: „Sortieren soll ein einmaliges Verschieben
   * der Items sein, kein Zustand").
   *
   * Vorher war die Sortierung eine Ansicht: Das Dropdown ordnete die Darstellung um, waehrend die
   * echten Faecher unveraendert blieben — deshalb liess sich nur im Modus „Neueste" ziehen, in
   * allen anderen nicht. Mit echten Faechern ergibt das keinen Sinn mehr. Jetzt ordnet der Knopf
   * die Faecher WIRKLICH um; danach steht wieder alles frei zum Verschieben.
   *
   * Belegte Faecher rutschen dabei nach vorne, Luecken sammeln sich hinten — wer bewusst Abstaende
   * gelassen hat, verliert sie, aber genau darum ist es ein Knopf und kein Automatismus.
   */
  const sortiereJetzt = (): void => {
    const inv = state.inventory;
    const belegt = inv.slots.filter((sl): sl is NonNullable<typeof sl> => sl !== null);
    if (sortMode !== "newest") {
      belegt.sort((a, b) => compareItemsBy(sortMode, a.itemId, b.itemId, content, tr));
    }
    for (let i = 0; i < inv.slots.length; i++) inv.slots[i] = i < belegt.length ? belegt[i]! : null;
    setDragItem(null);
    bumpCrate((n) => n + 1);
  };

  /**
   * Ein leeres Inventarfach als Ablageziel. Bewusst EIN Helfer fuer beide Renderstellen: die
   * Position eines Fachs und sein Verhalten beim Ablegen duerfen nie auseinanderlaufen — genau
   * daran ist das Ziehen vorher gescheitert.
   */
  const leeresFach = (originalIdx: number): JSX.Element => (
    <div
      key={originalIdx}
      className={`inv-slot${dragInvIdx !== null ? " inv-drop-target" : ""}`}
      onDragOver={dragInvIdx !== null ? (e) => e.preventDefault() : undefined}
      onDrop={
        dragInvIdx !== null
          ? (e) => {
              e.preventDefault();
              moveInventorySlot(state.inventory, dragInvIdx, originalIdx);
              setDragInvIdx(null);
              setDragItem(null);
            }
          : undefined
      }
    />
  );
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  // Such-/Typ-Filter (Chef-Auftrag Suche/Filter/Sortierung 2026-07-09): NUR die Anzeige — dimmt
  // Nicht-Treffer, statt sie auszublenden (Inventar hat Slot-Semantik, Drag&Drop-Ziele müssen
  // stabil bleiben). Typ-Filter persistiert (uiPrefs), Suchtext bleibt bewusst transient.
  const [invSearch, setInvSearch] = useState("");
  const [invCategory, setInvCategoryState] = useState<FilterCategory>(getInvFilterCat);
  const setInvCategory = (cat: FilterCategory): void => { setInvCategoryState(cat); setInvFilterCat(cat); };
  // Zahnrad-Button oben links am Portrait (Task #240): öffnet die wiederverwendete
  // Portrait-Galerie aus der Charaktererstellung, um das Bild jederzeit zu ändern.
  const [portraitPickerOpen, setPortraitPickerOpen] = useState(false);
  // Mittleres Panel — Task #340: Equipment/Stats-Tabs statt zwei gestapelter Container. Rein
  // visueller UI-State (kein Save-State nötig), Default „Equipment" (Chef-Vorgabe).
  const [midTab, setMidTab] = useState<"equipment" | "stats">("equipment");
  // Pfeiltasten-Navigation zwischen den zwei Tabs (WAI-ARIA APG „Tabs"-Pattern: bei role="tab" +
  // roving tabindex erwarten Screenreader/Tastatur-Nutzer Links/Rechts statt erneutem Tab-Sprung).
  // Nur 2 Tabs → Links/Rechts wirken identisch (togglen), das reicht hier.
  const handleMidTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = midTab === "equipment" ? "stats" : "equipment";
    setMidTab(next);
    requestAnimationFrame(() => {
      document.getElementById(next === "equipment" ? "cs-tab-equipment" : "cs-tab-stats")?.focus();
    });
  };
  // Upload-Button oben RECHTS am Portrait (Chef 2026-07-11): eigenes Bild als Porträt —
  // der Zähler erzwingt den sofortigen Re-Render nach dem direkten State-Write (s. onConfirm).
  const [, bumpPortrait] = useState(0);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  // Taverne (1.2.0 „Alive", taverne-spec-technik.md §6): ein Behälter-Item im Inventar öffnet
  // denselben Dialog wie der „Sack des Fremden" in der Taverne, statt des generischen "Benutzen"
  // (`useConsumable` hat für `blackMarketCrate`-Items keinen Sofort-Effekt — sie brauchen die
  // Tier-/Mengen-Wahl des Dialogs, s. CrateOpenModal). Eigener Dirty-Zähler (Muster NewHavenPage
  // `onDirty`), unabhängig vom Portrait-Upload-Zähler oben.
  const [crateItemId, setCrateItemId] = useState<string | null>(null);
  // claude:2026-10-23T23:10:00+02:00 — Bergung (1.4.0 BG): Bestätigung (ab legendär, Einzelstücke, ganze Stapel) und Sammel-Knopf.
  const [salvage, setSalvage] = useState<{ itemId: string; instanceId: string | null; qty: number; hasRunes: boolean } | null>(null);
  const [salvageBatchOpen, setSalvageBatchOpen] = useState(false);
  const [, bumpCrate] = useState(0);
  // Prompt-Extractor (Chef-Auftrag 28.08.2026, "Charakter exportieren"): sperrt den Knopf während
  // Canvas-Rendern + IPC-Schreiben laufen — verhindert Doppel-Klicks, die denselben Export zweimal
  // anstoßen (Canvas-Bildladen ist async, ein zweiter Klick vor dem ersten Toast wäre sonst möglich).
  const [exporting, setExporting] = useState(false);
  // Chef 28.08.2026: Export nur im Dev-Modus sichtbar (Browser-ChatGPT kann keine saubere Transparenz; privat ueber Mira).
  const [exportAllowed, setExportAllowed] = useState(false);
  useEffect(() => {
    let alive = true;
    void window.hearthforge?.app?.devToolsAllowed?.().then((ok) => { if (alive) setExportAllowed(!!ok); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // ── inventory actions (plain, stapelbare Slots) ──────────────────────────────
  const invActions = (itemId: string): ItemAction[] => {
    const it = content.items[itemId];
    const acts: ItemAction[] = [];
    if (it?.type === "equipment") {
      acts.push({
        key: "equip",
        label: t("item.equip"),
        onClick: () => {
          if (equipSucceeded(equipItem(state, content, itemId))) playSfx("equip");
          else reportEquipFailure(state, content);
        },
      });
    }
    if (it?.type === "tool") {
      acts.push({
        key: "equip",
        label: t("item.equip"),
        onClick: () => {
          if (equipSucceeded(equipItem(state, content, itemId))) playSfx("equip");
          else reportEquipFailure(state, content);
        },
      });
    }
    if (it?.type === "consumable" && it.consumable?.kind === "blackMarketCrate") {
      // Taverne (1.2.0 „Alive"): Behälter öffnen den Tier-/Mengen-Dialog statt des generischen
      // Sofort-Verzehrs — derselbe Dialog wie der „Sack des Fremden" in der Taverne (Spec §6).
      acts.push({
        key: "open",
        label: t("tavern.crate.open"),
        onClick: () => setCrateItemId(itemId),
      });
    } else if (it?.type === "consumable") {
      // Konsum-Abklingzeit (Engine, consume-gate.ts): `useConsumable` liefert im Kampf `false`,
      // solange der Ess-/Trank-Takt läuft (oder während der Kill-Verschnaufpause). Ohne
      // Rückmeldung wäre das ein stiller Klick ins Leere. Eigene Meldung statt des generischen
      // „Das geht gerade nicht": der Spieler soll den Grund sehen (es liegt an der Zeit, nicht
      // am Item) — sonst klickt er weiter und hält das Spiel für kaputt.
      // Aufladen (Chef 27.08.2026): reine Dauer-Tonika bekommen neben „Benutzen“ (×1) Stapel-Knöpfe ×5/×10 und
      // „Aufladen“ (bis zum Deckel BUFF_STACK_CAP_MS, engine/consumable.ts). Heil-/Sonder-Items bleiben einzeln.
      const chargeable = !!it.buff && !((it.healAmount ?? 0) > 0 || (it.healPct ?? 0) > 0) && !it.curesPoison && !it.consumable;
      const charge = chargeable ? buffChargeInfo(state, content, itemId) : null;
      const have = itemCount(state.inventory, itemId);
      const useMany = (n: number) => {
        if (!useConsumableMany(state, content, itemId, n)) gameAlert("alert.consumeCooldown");
      };
      acts.push({
        key: "use",
        label: t("item.use"),
        onClick: () => {
          if (!useConsumable(state, content, itemId)) {
            // Auftragsmarke ohne aktiven Slayer-Auftrag hat einen eigenen Grund (consumeFailReason, engine).
            gameAlert(consumeFailReason(state, content, itemId) === "no_slayer_task" ? "alert.consumeNoSlayerTask" : "alert.consumeCooldown");
          }
        },
      });
      if (charge && charge.usesToCap > 1 && have > 1) {
        for (const n of [5, 10]) {
          if (have >= n && charge.usesToCap >= n) acts.push({ key: `use${n}`, label: t("item.useN").replace("{n}", String(n)), onClick: () => useMany(n) });
        }
        const all = Math.min(have, charge.usesToCap);
        if (all > 1) acts.push({ key: "charge", label: t("item.useCharge").replace("{n}", String(all)), onClick: () => useMany(all) });
      }
    }
    // claude:2026-10-23T23:10:00+02:00 — Bergung (1.4.0 BG, Chef 23.10.): nur gedroppte Teile; ab legendär immer mit Bestätigung; Schloss je Item.
    if (isSalvageable(content, itemId)) {
      const locked = isSalvageLocked(state, itemId);
      const stack = itemCount(state.inventory, itemId);
      const high = ITEM_RARITIES.indexOf(it?.rarity ?? "common") >= ITEM_RARITIES.indexOf("legendary");
      if (!locked) {
        acts.push({
          key: "salvage",
          label: t("salvage.action"),
          onClick: () => {
            if (high) setSalvage({ itemId, instanceId: null, qty: 1, hasRunes: false });
            else salvageItem(state, content, itemId, 1);
          },
        });
        if (stack > 1) {
          acts.push({ key: "salvageAll", label: t("salvage.actionAll"), onClick: () => setSalvage({ itemId, instanceId: null, qty: stack, hasRunes: false }) });
        }
      }
      acts.push({ key: "salvageLock", label: locked ? t("salvage.unlock") : t("salvage.lock"), onClick: () => toggleSalvageLock(state, itemId) });
    }
    acts.push({ key: "sell", label: t("item.sell"), onClick: () => sellItem(state, content, itemId, 1) });
    return acts;
  };

  // ── variant-pouch actions (Task #246 Phase C, je Instanz per instanceId) ──────
  // Kontext „Inventar" = Ausrüsten/Verkaufen (Chef-Vorgabe) — Zerlegen bleibt der Enchanting-Page-
  // Tab „Zerlegen" vorbehalten (eigener, dedizierter Workflow, kein Zweit-Pfad hier nötig).
  const pouchVariantActions = (inst: ItemInstance): ItemAction[] => {
    const it = content.items[inst.baseItemId];
    const acts: ItemAction[] = [];
    if (it?.type === "equipment") {
      acts.push({
        key: "equip",
        label: t("item.equip"),
        onClick: () => {
          if (equipSucceeded(equipInstance(state, content, inst.instanceId))) playSfx("equip");
          else reportEquipFailure(state, content);
        },
      });
    }
    // claude:2026-10-23T23:10:00+02:00 — Bergung (1.4.0 BG): Einzelstücke immer mit Bestätigung (Runen gingen verloren).
    if (isSalvageable(content, inst.baseItemId)) {
      const locked = isSalvageLocked(state, inst.instanceId);
      if (!locked) {
        acts.push({
          key: "salvage",
          label: t("salvage.action"),
          onClick: () => setSalvage({ itemId: inst.baseItemId, instanceId: inst.instanceId, qty: 1, hasRunes: inst.affixes.length > 0 }),
        });
      }
      acts.push({ key: "salvageLock", label: locked ? t("salvage.unlock") : t("salvage.lock"), onClick: () => toggleSalvageLock(state, inst.instanceId) });
    }
    acts.push({ key: "sell", label: t("item.sell"), onClick: () => sellInstance(state, content, inst.instanceId) });
    return acts;
  };

  // Gruppiert die unbegrenzte Varianten-Tasche nach Basis-Item (geteilter Engine-Helfer — Shop/Bank
  // nutzen denselben) — je Basis-Item eine Container-Zelle mit Stern-Badge statt N Einzelzellen.
  const instanceGroups = groupInstancesByBase(inv.instances);
  // Erster Slot-Index je Basis-Item: nur DORT bekommt die Zelle den Stern + öffnet das Pouch-Modal,
  // damit ein (theoretischer) zweiter Slot derselben Art (>999 Stack-Overflow) nicht ein zweites
  // Modal für dieselbe Gruppe anbietet.
  const firstSlotIdxForItem = new Map<string, number>();
  inv.slots.forEach((slot, idx) => {
    if (slot && !firstSlotIdxForItem.has(slot.itemId)) firstSlotIdxForItem.set(slot.itemId, idx);
  });
  const slotItemIds = new Set(inv.slots.filter((s) => s !== null).map((s) => s!.itemId));
  // Basis-Items, die NUR als Varianten existieren (kein schlichter Stack im Slot-Gitter) — diese
  // brauchen eine eigene Container-Zelle im „Varianten-Tasche"-Bereich unten (sonst unerreichbar).
  const orphanInstanceGroups = [...instanceGroups.entries()].filter(([id]) => !slotItemIds.has(id));

  // ── Such-/Typ-Filter: matcht eine Basis-Item-Art (Anzeige-only, s. State-Kommentar oben) ────
  const invFilterActive = invCategory !== "all" || invSearch.trim().length > 0;
  const itemMatchesInvFilter = (itemId: string): boolean => {
    if (invCategory !== "all" && filterCategoryOf(itemId) !== invCategory) return false;
    if (!invSearch.trim()) return true;
    if (itemMatchesSearch(itemId, invSearch, tr)) return true;
    // Container-Zellen zählen als Treffer, wenn IRGENDEINE ihrer Varianten (z.B. per Suffix-
    // Namen wie „... des Bären") matcht — sonst würde man verzauberte Items nie über den Suffix
    // finden, weil der Basis-Name allein nicht passt.
    const group = instanceGroups.get(itemId) ?? [];
    return group.some((inst) => instanceMatchesSearch(inst, invSearch, locale));
  };
  // Chip-Zähler: jede Basis-Item-Art einmal (Slot-Stacks + reine Varianten-Gruppen).
  const allInvItemIds = new Set<string>([...slotItemIds, ...instanceGroups.keys()]);
  const invChipCounts: Partial<Record<FilterCategory, number>> = { all: allInvItemIds.size };
  for (const id of allInvItemIds) {
    const cat = filterCategoryOf(id);
    invChipCounts[cat] = (invChipCounts[cat] ?? 0) + 1;
  }

  // ── Sammel-Funkel (Welle PP): „NEU"-Badge für Basis-Items, die der Spieler zum ersten Mal
  // überhaupt besitzt (`isItemDiscovered`, engine-seitig monoton) UND deren Zelle noch nicht
  // gehovert/geklickt wurde (localStorage, util/discoveryBadge.ts) — Hover/Klick quittiert über
  // `onNewBadgeSeen` (s. beide VariantContainerCell-Aufrufer unten).
  const isNewItemBadge = (itemId: string): boolean =>
    isItemDiscovered(state, itemId) && !hasSeenNewItemBadge(state, itemId);

  // ── sorted inventory slots ─────────────────────────────────────────────────
  const sortedSlots = [...inv.slots].map((slot, originalIdx) => ({ slot, originalIdx }));
  // Chef-Test 25.08.2026: "Wenn ich 49/48 Inv-Plätze habe, warum werden mir dann 3 leere Slots
  // angezeigt?" Die Kopfzeile zählt Kapazitäts-EINHEITEN (physische Slots + Instanz-Zellen der
  // Tasche, s. usedCapacityUnits), das Raster zeigte aber jeden physischen Null-Slot. Eine
  // verzauberte Variante ohne Grundversion belegt eine Einheit, aber keinen Null-Slot, also
  // blieben Zellen leer, in die die Engine trotzdem nichts Neues legt (hasCapacityForNewCell).
  // Sichtbar sind jetzt nur so viele leere Zellen, wie Einheiten wirklich frei sind (übervoll = 0).
  const freieEinheiten = Math.max(0, invCapacity - invUsedUnits);
  const leereSichtbar = new Set<number>();
  for (const { slot, originalIdx } of sortedSlots) {
    if (!slot && leereSichtbar.size < freieEinheiten) leereSichtbar.add(originalIdx);
  }
  // Chef 31.08.2026: Die Anzeige folgt IMMER der echten Fachreihenfolge — Sortieren ist jetzt eine
  // Aktion (`sortiereJetzt`), die die Faecher wirklich umordnet, keine Ansicht mehr. Damit ist auch
  // das Verschieben in jedem Zustand erlaubt; vorher ging es nur im Modus „Neueste", was niemand
  // erraten konnte.


  // claude:2026-10-17T21:00:00+02:00 Rein verzauberte Basis-Items (Orphans) stehen direkt HINTER dem
  // letzten befuellten Fach und damit VOR den Leerfaechern (Chef-Fix 2026-07-06, Bild #43). Items mit
  // Grundversion tragen den Stern schon an ihrem Slot (kein Doppel-Eintrag).
  const orphanZellen = (): ReactElement[] =>
    orphanInstanceGroups.map(([itemId, group]) => (
    <div
      key={`orphan-${itemId}`}
      className={`cs-inv-slot-wrap${invFilterActive && !itemMatchesInvFilter(itemId) ? " invf-dim" : ""}`}
    >
      <VariantContainerCell
        itemId={itemId}
        instances={group}
        plainActions={invActions(itemId)}
        variantActionsFor={pouchVariantActions}
        className="inv-slot filled"
        newBadge={isNewItemBadge(itemId)}
        onNewBadgeSeen={() => markNewItemBadgeSeen(state, itemId)}
      />
    </div>
  ));
  let letztesBefuellt = -1;
  sortedSlots.forEach(({ slot }, i) => { if (slot) letztesBefuellt = i; });

  // claude:2026-10-17T12:20:00+02:00 — `.cs-layout` ist Container-Query-Wurzel (Spalten nach
  // PANELbreite, character.css); das Spaltenraster sitzt deshalb eine Ebene tiefer in `.cs-grid`.
  return (
    <div className="cs-layout">
      <div className="cs-grid">

      {/* ═══════════════════════════════════════════════════════════
          LINKE SPALTE — CHARACTER
      ═══════════════════════════════════════════════════════════ */}
      <div className="cs-col cs-col-left ds-frame">
        <PanelHeader title={t("nav.character")} />

        {/* Portrait */}
        <div className="cs-portrait-wrap">
          <button
            className="cs-portrait-settings-btn"
            onClick={() => setPortraitPickerOpen(true)}
            title={t("char.portrait.change")}
            aria-label={t("char.portrait.change")}
          >
            <img loading="lazy" decoding="async" src={emblGearImg} alt="" className="cs-portrait-settings-icon" />
          </button>
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
                if (!dataUrl) return; // unlesbar → bisheriges Porträt bleibt
                c.portrait = dataUrl; // rein kosmetisch, direkter Write wie beim Picker (s.u.)
                bumpPortrait((n) => n + 1);
              });
            }}
          />
          <button
            className="cs-portrait-settings-btn cs-portrait-upload-btn"
            onClick={() => uploadInputRef.current?.click()}
            title={t("char.portrait.upload")}
            aria-label={t("char.portrait.upload")}
          >
            <svg className="cs-portrait-upload-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l5.2 5.2h-3.2V15h-4V8.2H6.8L12 3z M4.5 17.5h15V21h-15v-3.5z" fill="currentColor" />
            </svg>
          </button>
          {portraitSrc ? (
            <img loading="lazy" decoding="async" className="cs-portrait-img" src={portraitSrc} alt={c.name} />
          ) : (
            <div className="cs-portrait-placeholder">👤</div>
          )}
          <div className="cs-nameplate">
            {/* claude:2026-10-19T10:00:00+02:00 — Aschekerbe klein inline neben dem Namen statt als lose Box oben mittig (Chef 18.10.: zu viele Container). */}
            <span className="cs-hero-namerow">
              <span className="cs-hero-name">{c.name}</span>
              <AshNotch count={state.prestige?.count ?? 0} className="ash-notch--inline" />
            </span>
            <span className="cs-hero-level">{t("char.totalLevel").replace("{n}", String(c.totalLevel))}</span>
          </div>
        </div>

        {/* Kosmetik-Sweep T9 (2026-07-12): Vitals+Buffs+Attribute in einen eigenen Spalten-Wrapper —
            bei <=900px wird .cs-col-left zu flex-direction:row (Porträt links, Rest rechts, s.
            character.css @media 900px); OHNE diesen Wrapper waren Vitals/Buffs/Attribute selbst
            gleichrangige Row-Geschwister des Porträts und quetschten sich gegenseitig (Buff-Namen
            liefen bis auf ~3 Zeichen wie "SUM" ein, Attribute wurden vom `overflow:hidden` der
            Spalte teils ganz abgeschnitten). `display:contents` (Default/breite Viewports) macht
            den Wrapper unsichtbar für den Layout-Baum — bestehendes Aussehen bei >=901px bleibt
            bit-identisch; erst die @900px-Regel schaltet ihn auf einen echten flex-column-Block um. */}
        <div className="cs-col-left-info">
          {/* Vitals */}
          <div className="cs-vitals">
            <Vital
              label={t("char.life")}
              icon={HP_ICON_URL ? <img loading="lazy" decoding="async" src={HP_ICON_URL} alt="" className="ui-icon" /> : "♥"}
              cur={Math.round(c.hp)}
              max={stats.maxHp}
              kind="hp"
            />
            {/* Zauberreserve (28.08.2026): Mana verbraucht sich nicht mehr — kein Vital-Balken mehr
                dafür (der wäre immer voll und damit sinnlos); die Zahl steht jetzt als Stat-Zeile
                im "Stats"-Tab (CombatStatsPanelGrouped), mit Fokus-/Schild-Tooltip. */}
            {/* Rüstungs-Trinität (Spec §8): dritte Vitals-Zeile NUR bei Stoff-Trägern (maxWard > 0) —
                Platte/Leder zeigen sie gar nicht (kein leerer Balken). */}
            {stats.maxWard > 0 && (
              <Vital label={t("char.ward")} icon={statIcon("ward")} cur={Math.round(c.ward)} max={stats.maxWard} kind="ward" />
            )}
          </div>

          {/* Active buffs — Citadel-Chip mit Icon+Name+Timer, voller Effekt via Hover-Tooltip. */}
          {c.buffs.length > 0 && (
            <div className="cs-buffs">
              <ActiveBuffsBar buffs={c.buffs} />
            </div>
          )}

          {/* ATTRIBUTES — fester Block ÜBER dem Scroll → wird nie zum Scroll-Container.
              Extrahiert nach components/EquipmentOverview.tsx (Chef-Fix 2026-07-05): derselbe
              Baustein taucht read-only im Combat-Log „Equipment"-Tab auf. */}
          <AttributesGrid />
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          MITTLERE SPALTE — EQUIPMENT / STATS (Task #340 Tab-Umbau)
          War: zwei gestapelte Container (Equipment oben ~68%, Combat-Stats unten ~32%). Jetzt:
          EIN Panel mit Tab-Lasche oben (Vorbild: Combat-Log „LOG|AUSRÜSTUNG"-Tabs, CombatPage.tsx/
          combat.css .battle-log-tab — NUR als visuelles Vorbild gelesen, dortiger Code unangetastet;
          eigene Klassen `.cs-tabbar`/`.cs-tab-btn` am Ende von character.css), darunter EIN
          Container über die volle Panelhöhe je Tab — beide Ansichten bekommen dadurch deutlich
          mehr Platz als vorher.
      ═══════════════════════════════════════════════════════════ */}
      <div className="cs-col-mid-stack">
        <div className="cs-col cs-col-tabpanel ds-frame">
          <div className="cs-tabbar" role="tablist" aria-label={t("char.tabs.ariaLabel")}>
            <button
              type="button"
              role="tab"
              id="cs-tab-equipment"
              aria-selected={midTab === "equipment"}
              aria-controls="cs-tabpanel-equipment"
              tabIndex={midTab === "equipment" ? 0 : -1}
              className={`cs-tab-btn${midTab === "equipment" ? " active" : ""}`}
              onClick={() => setMidTab("equipment")}
              onKeyDown={handleMidTabKeyDown}
            >
              {t("char.tab.equipment")}
            </button>
            <button
              type="button"
              role="tab"
              id="cs-tab-stats"
              aria-selected={midTab === "stats"}
              aria-controls="cs-tabpanel-stats"
              tabIndex={midTab === "stats" ? 0 : -1}
              className={`cs-tab-btn${midTab === "stats" ? " active" : ""}`}
              onClick={() => setMidTab("stats")}
              onKeyDown={handleMidTabKeyDown}
            >
              {t("char.tab.stats")}
            </button>
          </div>

          {midTab === "equipment" ? (
            /* Paperdoll-Ausrüstungsgitter — extrahiert nach components/EquipmentOverview.tsx
               (Chef-Fix 2026-07-05): interactive=true behält Drag&Drop-Equip + Klick-Unequip
               (geteilter dragItem-State aus dem Inventar unten), der Combat-Log „Equipment"-Tab
               nutzt denselben Baustein read-only (interactive=false, Default). Slot-Logik/
               Tooltips/Rarity-Rahmen unverändert — nur der umgebende Container ist jetzt größer. */
            <div
              id="cs-tabpanel-equipment"
              role="tabpanel"
              aria-labelledby="cs-tab-equipment"
              className="cs-col cs-col-mid cs-tabpanel-content"
            >
              {/* Ausrüstungs-Kits 1/2/3 (Chef-Entscheid 28.08.2026): kompakte Leiste ÜBER der
                  Puppe — jedes Kit trägt eigene Items, Umschalten tauscht das ganze Set (nur
                  außerhalb des Kampfes), s. components/EquipKitBar.tsx. */}
              <EquipKitBar />
              {/* Prompt-Extractor (Chef-Auftrag 28.08.2026): Ein-Klick-Export von Ausrüstungs-Blatt
                    (kit.png), Portrait (portrait.png) und einem fertigen englischen Bildgenerator-
                    Prompt (prompt.txt) nach Downloads\Grim Reach Exports\ — s. util/characterExport.ts
                    (Orchestrierung), util/characterExportPrompt.ts (Prompt-Text, unit-getestet) und
                    main/characterExport.ts (IPC-Schreiber). */}
              {exportAllowed && (
                <div className="cs-export-row">
                  <HoverTip as="div" className="cs-export-tipwrap" content={<span className="ct-tip-desc">{t("char.export.tooltip")}</span>}>
                    <button
                      type="button"
                      className="btn-iron btn-iron--sm"
                      disabled={exporting}
                      onClick={() => {
                        setExporting(true);
                        void exportCharacterKit(state, t).finally(() => setExporting(false));
                      }}
                    >
                      {t("char.export.button")}
                    </button>
                </HoverTip>
              </div>
              )}
              <EquipmentDoll interactive dragItem={dragItem} onDragItem={setDragItem} />
            </div>
          ) : (
            /* Gruppierte Kampfwerte-Übersicht (Task #340): dieselben Werte wie zuvor, jetzt in
               Offensive/Defensive/Tempo&Krit/Set-Bonus-Abschnitten mit voller Panelhöhe statt
               im gequetschten unteren Halb-Container — s. CombatStatsPanelGrouped. */
            <div
              id="cs-tabpanel-stats"
              role="tabpanel"
              aria-labelledby="cs-tab-stats"
              className="cs-col cs-col-stats cs-tabpanel-content"
            >
              <CombatStatsPanelGrouped />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RECHTE SPALTE — INVENTORY
      ═══════════════════════════════════════════════════════════ */}
      <div className="cs-col cs-col-right ds-frame">
        <PanelHeader title={t("char.inventory")} />

        {/* Toolbar row — Kategorie-Filter-Icons links, Sortierung rechts (Chef-Umbau Inventar-
            Header 2026-07-23: „Sell"-Quick-Sell-Slot ersatzlos raus, Verkaufen läuft über den
            Shop; die Chip-Reihe zieht dafür aus der zweiten Zeile hier hoch neben die Sortierung,
            skaliert per cqw mit der Panel-Breite, s. .cs-inv-toolbar in character.css). */}
        <div className="cs-inv-toolbar">
          <div className="cs-inv-toolbar-left">
            <ItemFilterChips
              compact
              category={invCategory}
              onCategoryChange={setInvCategory}
              counts={invChipCounts}
            />
          </div>
          <div className="cs-inv-toolbar-right">
            <span className="cs-sort-label">{t("char.sortLabel")}</span>
            <select
              className="cs-sort-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="newest">{t("char.sortNewest")}</option>
              <option value="type">{t("char.sortType")}</option>
              <option value="name">{t("char.sortName")}</option>
              <option value="value">{t("char.sortValue")}</option>
              <option value="rarity">{t("char.sortRarity")}</option>
              <option value="tier">{t("char.sortTier")}</option>
            </select>
            {/* Chef 31.08.2026: Das Dropdown WAEHLT nur noch die Art, dieser Knopf FUEHRT AUS —
                sonst wuerde jede Auswahl sofort die Faecher umwerfen. */}
            <button type="button" className="cs-inv-sortbtn" onClick={sortiereJetzt}>
              {t("char.sortApply")}
            </button>
            {/* claude:2026-10-23T23:10:00+02:00 — Bergung: Sammel-Knopf „Beute zerlegen …“ (1.4.0 BG). */}
            <button type="button" className="cs-inv-sortbtn" onClick={() => setSalvageBatchOpen(true)}>
              {t("salvage.batchButton")}
            </button>
          </div>
        </div>

        {/* Suche — eigene Zeile, volle Breite (Chef-Umbau 2026-07-23): dimmt Nicht-Treffer statt
            sie zu entfernen — Slot-Semantik/Drag&Drop bleiben unangetastet, die echte Reihenfolge
            in state.inventory.slots ändert sich NIE dadurch. */}
        <div className="cs-inv-searchrow">
          <ItemFilterSearch
            className="cs-inv-search"
            search={invSearch}
            onSearchChange={setInvSearch}
          />
        </div>

        {/* Slot count (+ Hinweis, wenn der aktive Filter/die Suche NICHTS im Inventar trifft — die
            Slots bleiben dabei sichtbar/gedimmt, dieser Text ist nur ein zusätzlicher Hinweis).
            Chef-Bugfix 22.07. + 23.07.-Follow-up: zeigt die ECHTE Ist-Belegung (`usedCapacityUnits`
            = Slots + separate Instanz-Tasche `inv.instances` — reine `usedSlots` zählt Instanzen
            NICHT mit, s. engine `inventory.ts`) gegen die tatsächliche Kapazität (`effectiveCapacity`,
            NICHT das rohe `inv.slots.length` — das Array kann bei einer Kapazitäts-Schrumpfung
            länger als die Kapazität bleiben, um Items nicht zu verlieren, s. engine `syncSlots`) —
            ein übervolles Inventar zeigt ehrlich "22 / 20" statt stumm bei der Kapazität zu kappen.
            Rot + Tooltip nur, wenn wirklich übervoll. */}
        {invOverCapacity ? (
          <HoverTip
            as="div"
            className="cs-slot-count cs-slot-count-over"
            content={<span className="ct-tip-desc">{t("inv.overCapacity.hint")}</span>}
          >
            {t("char.slots")
              .replace("{used}", String(invUsedUnits))
              .replace("{total}", String(invCapacity))}
            {invFilterActive && ![...allInvItemIds].some(itemMatchesInvFilter) && (
              <span className="cs-slot-count-filter"> · {t("inv.filter.noMatches")}</span>
            )}
          </HoverTip>
        ) : (
          <div className="cs-slot-count">
            {t("char.slots")
              .replace("{used}", String(invUsedUnits))
              .replace("{total}", String(invCapacity))}
            {invFilterActive && ![...allInvItemIds].some(itemMatchesInvFilter) && (
              <span className="cs-slot-count-filter"> · {t("inv.filter.noMatches")}</span>
            )}
          </div>
        )}

        {/* Inventory grid / list */}
        <div className={"cs-inv-grid"}>
          {letztesBefuellt < 0 && orphanZellen()}
          {sortedSlots.map(({ slot, originalIdx }, displayIdx) =>
            !slot ? (
              /* Chef-Report 31.08.2026: „ich dragge etwas auf einen leeren platz aber es huepft
                 einfach auf einen anderen random platz". Ursache war, dass leere Faecher frueher
                 GESAMMELT am Ende gerendert wurden (s. alter Kommentar unten) — das Kaestchen, auf
                 das man zog, gehoerte also gar nicht zu dem Fach, dessen Index beim Ablegen benutzt
                 wurde. Die Luecken stehen genau dort, wo sie im Inventar wirklich sind; sichtbar sind nur
                 so viele, wie Kapazitaetseinheiten frei sind (`leereSichtbar`). */
              leereSichtbar.has(originalIdx) ? leeresFach(originalIdx) : null
            ) : (
              /* Wrapper catches mousedown for selection without blocking ItemCell tooltip click.
                 Drag&Drop: Start merkt den Quell-Slot, Drop auf einen anderen Slot tauscht (Umsortieren). */
              <Fragment key={originalIdx}>
              <div
                className={`cs-inv-slot-wrap${dragInvIdx !== null && dragInvIdx !== originalIdx ? " inv-drop-target" : ""}${invFilterActive && !itemMatchesInvFilter(slot.itemId) ? " invf-dim" : ""}`}
                /* Quell-Slot IMMER merken (für Equip-per-Drag / Quick-Sell von Instanzen); das
                   Umsortier-Drop selbst bleibt aber auf "newest" begrenzt (sonst falsche Slot-Zuordnung). */
                onDragStart={() => setDragInvIdx(originalIdx)}
                onDragEnd={() => { setDragInvIdx(null); setDragItem(null); }}
                onDragOver={dragInvIdx !== null ? (e) => e.preventDefault() : undefined}
                onDrop={
                  dragInvIdx !== null
                    ? (e) => { e.preventDefault(); moveInventorySlot(state.inventory, dragInvIdx, originalIdx); setDragInvIdx(null); setDragItem(null); }
                    : undefined
                }
              >
                {(() => {
                  // Container-Zelle (Task #246 Phase C): NUR am ersten Slot dieser Basis-Item-Art
                  // (firstSlotIdxForItem) und NUR wenn diese Art tatsächlich Varianten in der Tasche
                  // hat — sonst identisch zur schlichten ItemCell (kein Verhaltensunterschied).
                  const group = instanceGroups.get(slot.itemId) ?? [];
                  const isContainer = group.length > 0 && firstSlotIdxForItem.get(slot.itemId) === originalIdx;
                  return (
                    <VariantContainerCell
                      itemId={slot.itemId}
                      qty={slot.qty}
                      instances={isContainer ? group : []}
                      plainActions={invActions(slot.itemId)}
                      variantActionsFor={pouchVariantActions}
                      draggable
                      onDragItem={setDragItem}
                      className="inv-slot filled"
                      newBadge={isNewItemBadge(slot.itemId)}
                      onNewBadgeSeen={() => markNewItemBadgeSeen(state, slot.itemId)}
                    />
                  );
                })()}
              </div>
              {displayIdx === letztesBefuellt && orphanZellen()}
              </Fragment>
            ),
          )}
        </div>

        {/* Das Item-Detail-Panel ist raus (Chef 2026-07-09: „Diese Sektion kann raus aus dem Inv!") —
            Tooltip-Deltas (#307) + Item-Wiki (#308) decken Inspektion vollständig ab; löst zugleich
            den 55-px-1080p-Überlauf der Seite. */}
      </div>
      </div>

      {/* claude:2026-10-17T12:20:00+02:00 — Portal: das Containment von `.cs-layout` würde das
          fixed-Overlay sonst an die Seite statt ans Fenster binden (CrateOpenModal portalt selbst). */}
      {portraitPickerOpen && createPortal(
        <PortraitPickerModal
          currentId={c.portrait}
          title={t("char.portrait.change")}
          onConfirm={(id) => {
            // Rein kosmetisches Feld, direkt auf dem lebenden State geschrieben (wie
            // `state.character.companionPetId` bei equipPet) — kein neuer State/keine
            // Persistenz-Änderung nötig, `character.portrait` existiert bereits seit der
            // Charaktererstellung. setPortraitPickerOpen löst den sofortigen Re-Render aus.
            c.portrait = id;
            setPortraitPickerOpen(false);
          }}
          onCancel={() => setPortraitPickerOpen(false)}
        />,
        document.body,
      )}
      {salvage && (
        <SalvageConfirmModal
          itemId={salvage.itemId}
          instanceId={salvage.instanceId}
          qty={salvage.qty}
          hasRunes={salvage.hasRunes}
          onClose={() => setSalvage(null)}
        />
      )}
      {salvageBatchOpen && <SalvageBatchModal onClose={() => setSalvageBatchOpen(false)} />}
      {crateItemId && (
        <CrateOpenModal
          initialItemId={crateItemId}
          onClose={() => setCrateItemId(null)}
          onDirty={() => bumpCrate((n) => n + 1)}
        />
      )}
    </div>
  );
}
