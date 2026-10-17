import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { content } from "@hearthforge/content";
import {
  bankList,
  bankSlotsUsed,
  buyBankSlots,
  campBoost,
  canDeposit,
  depositAll,
  depositInstance,
  depositStackable,
  depositItem,
  depositItemGroup,
  effectiveCapacity,
  equipInstance,
  groupInstancesByBase,
  hasInstanceRoom,
  isBankFull,
  itemCount,
  nextBankSlotCost,
  withdrawInstance,
  withdrawItem,
  withdrawItemGroup,
} from "@hearthforge/engine";
import { BANK_SLOT_PACKAGE, effectiveBankCapacity, moveBankSlot } from "@hearthforge/shared";
import type { ItemInstance } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { playSfx } from "../util/audio";
import { equipSucceeded, reportEquipFailure } from "../util/equipFeedback";
import { formatNum } from "../util/format";
import { CampBoostNote } from "../components/CampBoostNote";
import { HoverTip } from "../components/CitadelTip";
import type { ItemAction } from "../components/ItemTooltip";
import { AreaTourGuide } from "../components/AreaTourGuide";
import { gameAlert } from "../components/GameAlert";
import { ItemFilterBar } from "../components/ItemFilterBar";
import { NpcGreeting } from "../components/NpcGreeting";
import { activeEliteZoneName, resolveNpcVoiceKey } from "../util/npcVoice";
import { getPortrait } from "../portraits";
import { BANK_TOUR_STEPS } from "../areaTourSteps";
import { QTY_PRESETS, QuantityPicker } from "../components/QuantityPicker";
import { VariantContainerCell } from "../components/VariantContainerCell";
import { getUiIcon } from "../uiIcons";
import {
  compareItemsBy,
  filterCategoryOf,
  getItemImage,
  instanceMatchesSearch,
  itemMatchesSearch,
  ITEM_SORT_MODES,
  type FilterCategory,
  type ItemSortMode,
} from "../items";
import { getBankFilterCat, getBankSort, setBankFilterCat, setBankSort } from "../util/uiPrefs";
import { getSidebarIcon } from "../sidebarIcons";
import { registerEscCloser } from "../util/escStack";

function GoldIcon(): JSX.Element {
  const src = getUiIcon("icon_goldcoin");
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="shop-price-icon" />
    : <span>🪙</span>;
}

/** Spalten-Überschrift im OptSection-/StatsPage-Muster: Icon-Medaillon + Cinzel-Gold-Titel
    (Citadel-Konsistenz-Welle, Chef-GO 2026-07-09 — ersetzt den nackten `<h3>`). */
function BankColTitle({ iconSrc, fallback, label }: { iconSrc: string | null; fallback: string; label: string }): JSX.Element {
  return (
    <h3 className="bank-col-title">
      <span className="bank-col-icon" aria-hidden="true">
        {iconSrc ? <img loading="lazy" decoding="async" src={iconSrc} alt="" /> : <span>{fallback}</span>}
      </span>
      {label}
    </h3>
  );
}

/** Welche Bank-Spalte eine Interaktion (Drag oder Teilmengen-Modal) betrifft. */
type BankZone = "inv" | "bank";

/**
 * Teilmengen-Modal (Task #314 B2, "Bank-Teilmengen"): vorher kannte die Bank nur "1" oder "alles" —
 * dieses Modal bringt das gemeinsame `QuantityPicker`-Widget (Presets + freie Eingabe) auch hierher,
 * für den fungiblen Anteil eines Basis-Items (Instanzen bleiben Einzel-Aktionen im Varianten-Pouch).
 * Gleiches Muster wie `VariantPouchModal` (modal-overlay/modal, Esc schließt via `registerEscCloser`).
 */
function BankQtyModal({
  itemId,
  zone,
  available,
  onConfirm,
  onClose,
}: {
  itemId: string;
  zone: BankZone;
  available: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const item = content.items[itemId];
  const img = getItemImage(itemId);

  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal qty-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("pouch.close")} />
        <div className="qty-modal-head">
          <span className="qty-modal-icon" aria-hidden="true">
            {img ? (
              <img src={img} alt="" className="pixelart" loading="lazy" decoding="async" />
            ) : item?.icon ? (
              <span>{item.icon}</span>
            ) : null}
          </span>
          <div className="qty-modal-info">
            <span className="qty-modal-name">{item ? tr(item.name) : itemId}</span>
            <span className="qty-modal-avail muted">{t(zone === "inv" ? "bank.depositQty" : "bank.withdrawQty")}</span>
          </div>
        </div>
        <QuantityPicker
          presets={QTY_PRESETS}
          max={available}
          maxLabel={t(zone === "inv" ? "bank.depositStack" : "bank.withdrawAll")}
          onPick={(qty) => {
            onConfirm(qty);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export function BankPage(): JSX.Element {
  const state = useGameState();
  const { t, tr, locale } = useI18n();
  // Ein Sortiermodus für beide Spalten (wie im Charakter-Inventar: Neueste/Name/Wert/Seltenheit/
  // Menge). Persistiert (Chef-Auftrag Suche/Filter/Sortierung 2026-07-09) — Suchtext bleibt
  // bewusst transient, nur Sortiermodus + Typ-Filter überleben einen Neustart.
  const [sortMode, setSortModeState] = useState<ItemSortMode>(getBankSort);
  const [category, setCategoryState] = useState<FilterCategory>(getBankFilterCat);
  const [search, setSearch] = useState("");
  const setSortMode = (mode: ItemSortMode): void => { setSortModeState(mode); setBankSort(mode); };
  const setCategory = (cat: FilterCategory): void => { setCategoryState(cat); setBankFilterCat(cat); };
  const filterActive = category !== "all" || search.trim().length > 0;

  // Inventar nach Art zusammenfassen (einlagerbar). Fungible Items via `owned` (Record<itemId,qty>-
  // Bank, Instanz-Slots ausgeschlossen). Verzauberte/gesuffixte Instanzen leben separat in der
  // unbegrenzten `inventory.instances`-Tasche (Task #246) — per Basis-Item gruppiert, damit ein
  // Basis-Item mit sowohl schlichtem Bestand ALS AUCH Varianten EINE Container-Zelle bekommt
  // (Stern + Pouch-Modal), statt zwei getrennte Einträge.
  const owned = new Map<string, number>();
  for (const slot of state.inventory.slots) {
    if (slot && !slot.instance) owned.set(slot.itemId, (owned.get(slot.itemId) ?? 0) + slot.qty);
  }
  const invInstanceGroups = groupInstancesByBase(state.inventory.instances);
  const bankInstanceGroups = groupInstancesByBase(state.bankInstances);

  interface BankEntry {
    itemId: string;
    qty: number;
    instances: ItemInstance[];
  }
  const depositIds = [...owned.keys(), ...[...invInstanceGroups.keys()].filter((id) => !owned.has(id))];
  const depositEntriesUnsorted: BankEntry[] = depositIds.map((itemId) => ({
    itemId,
    qty: owned.get(itemId) ?? 0,
    instances: invInstanceGroups.get(itemId) ?? [],
  }));

  const storedUnsorted = bankList(state, content);
  const storedQtyMap = new Map(storedUnsorted.map((s) => [s.itemId, s.qty] as const));
  const storedIds = [...storedQtyMap.keys(), ...[...bankInstanceGroups.keys()].filter((id) => !storedQtyMap.has(id))];
  const storedEntriesUnsorted: BankEntry[] = storedIds.map((itemId) => ({
    itemId,
    qty: storedQtyMap.get(itemId) ?? 0,
    instances: bankInstanceGroups.get(itemId) ?? [],
  }));

  // ── Such-/Typ-Filter (reine Anzeige — Bank ist ein Record, kein Slot-Grid, daher darf hier
  // frei gefiltert/umsortiert werden, s. Chef-Auftrag). Ein Eintrag matcht, wenn die Basis-Item-ID
  // ODER ihr lokalisierter Name matcht, ODER (Instanzen) irgendeine verzauberte Variante über
  // ihren vollen Anzeige-Namen (Suffix/Präfix) matcht.
  const matchesFilter = (e: BankEntry): boolean => {
    if (category !== "all" && filterCategoryOf(e.itemId) !== category) return false;
    if (!search.trim()) return true;
    if (itemMatchesSearch(e.itemId, search, tr)) return true;
    return e.instances.some((inst) => instanceMatchesSearch(inst, search, locale));
  };
  const sortEntries = (entries: BankEntry[]): BankEntry[] => {
    if (sortMode === "newest") return entries;
    if (sortMode === "qty") {
      return [...entries].sort((a, b) => b.qty - a.qty || compareItemsBy("name", a.itemId, b.itemId, content, tr));
    }
    return [...entries].sort((a, b) => compareItemsBy(sortMode, a.itemId, b.itemId, content, tr));
  };

  // Das Inventar links steht IMMER in seiner echten Fachreihenfolge (`owned` wird beim Durchlaufen
  // von `inventory.slots` gefuellt, die Map behaelt die Einfuegereihenfolge). Es hat eigene
  // Positionen, die dem Spieler gehoeren — die duerfen hier nicht anders aussehen als auf dem
  // Charakterbogen. Der Sortierknopf unten wirkt deshalb ausschliesslich auf die BANKFAECHER.
  const depositable = depositEntriesUnsorted.filter(matchesFilter);
  const stored = storedEntriesUnsorted.filter(matchesFilter);
  const used = bankSlotsUsed(state);
  const full = isBankFull(state, content);
  const bankCap = effectiveBankCapacity(state, content); // Basis + gekaufte Slots + Lager-Erdgewölbe
  // Task #334 (UI-Welle 2 "Boosts sichtbar"): der Vorratsspeicher-Anteil an `bankCap` steckte bisher
  // unsichtbar in der Summe — derselbe Engine-Lesehook, den `effectiveBankCapacity` selbst intern
  // aufruft (`campBoostSum(state.camp, content.campBuildings, "bankSlots")`), keine zweite Summe.
  const bankCampSlots = Math.max(0, campBoost(state, content, "bankSlots"));

  const cost = nextBankSlotCost(state);
  const canAfford = cost !== null && state.character.gold >= cost;

  // Leere Slots bis zur jeweiligen Kapazität (wie das echte Inventar bzw. die Bank) — NUR wenn
  // kein Filter aktiv ist. Bei aktivem Filter/Suche würde "Kapazität minus Treffer" einen Wall
  // leerer Platzhalter-Slots zeigen, wo eigentlich nur ausgeblendete (nicht gelöschte!) Items
  // sitzen — das läse sich wie Datenverlust. Die echte Slot-Zählung oben (bank.slots) bleibt
  // davon unberührt (immer `used`, nie gefiltert).
  const invCap = effectiveCapacity(state.inventory, content);
  const invEmptyCount = filterActive ? 0 : Math.max(0, invCap - depositable.length);

  // ── Bankfaecher (SAVE 87, Chef-Auftrag „wie OSRS") ────────────────────────────────────────
  // `state.bankOrder` ist die Wahrheit ueber die PLATZIERUNG, `state.bank` ueber die MENGEN.
  // Ein Fach behaelt sein Item, auch wenn davor Luecken stehen — genau das war der Auftrag:
  // „ein item was ich in Slot 65 reinziehe soll da auch reinkoennen wenn 64 und die davor leer sind".
  //
  // Die Liste ist mindestens so lang wie die Kapazitaet und mindestens so lang wie das letzte
  // belegte Fach: ein Spieler, der seinen Bestand weit hinten geparkt und danach Kapazitaet
  // VERLOREN hat (Lager-Gebaeude abgerissen), soll seine Sachen trotzdem sehen.
  //
  // Der Nachtrag am Ende ist eine Verteidigungslinie: `syncBankOrder` haelt beides im Einklang,
  // aber mehrere Engine-Pfade schreiben direkt in `state.bank` (Auto-Einlagern im Tick, Lager,
  // Meisterweihe). Taucht dort etwas ohne Fach auf, haengen wir es sichtbar hinten an, statt es
  // verschwinden zu lassen — unsichtbarer Bestand waere der schlimmste aller Fehler.
  const bankOrder = Array.isArray(state.bankOrder) ? state.bankOrder : [];
  const storedById = new Map(storedEntriesUnsorted.map((e) => [e.itemId, e] as const));
  const platziert = new Set<string>();
  let letztesBelegte = -1;
  for (let i = 0; i < bankOrder.length; i++) {
    const id = bankOrder[i];
    if (id && storedById.has(id)) letztesBelegte = i;
  }
  const fachAnzahl = Math.max(bankCap, letztesBelegte + 1);
  const bankSlots: Array<{ idx: number; entry: BankEntry | null }> = [];
  for (let i = 0; i < fachAnzahl; i++) {
    const id = bankOrder[i] ?? null;
    const entry = id ? storedById.get(id) ?? null : null;
    if (entry) platziert.add(entry.itemId);
    bankSlots.push({ idx: i, entry });
  }
  for (const e of storedEntriesUnsorted) {
    if (!platziert.has(e.itemId)) bankSlots.push({ idx: bankSlots.length, entry: e });
  }

  /**
   * Sortieren als einmalige AKTION auf den Faechern, nicht als Ansicht (dieselbe Regel wie im
   * Charakter-Inventar, Chef 31.08.2026: „Sortieren soll ein einmaliges Verschieben der Items
   * sein, kein Zustand"). Belegte Faecher ruecken dabei nach vorne, Luecken sammeln sich hinten —
   * wer bewusst Abstaende gelassen hat, verliert sie, und genau darum ist es ein Knopf.
   */
  const sortiereBank = (): void => {
    const belegt = bankSlots
      .map((f) => f.entry?.itemId)
      .filter((id): id is string => !!id);
    if (sortMode === "qty") {
      belegt.sort(
        (a, b) =>
          (storedById.get(b)?.qty ?? 0) - (storedById.get(a)?.qty ?? 0) ||
          compareItemsBy("name", a, b, content, tr),
      );
    } else if (sortMode !== "newest") {
      belegt.sort((a, b) => compareItemsBy(sortMode, a, b, content, tr));
    }
    const neu: Array<string | null> = [];
    for (let i = 0; i < Math.max(fachAnzahl, belegt.length); i++) {
      neu.push(i < belegt.length ? belegt[i]! : null);
    }
    state.bankOrder = neu;
  };

  // Chip-Zähler: Vereinigung beider Spalten (Item-Art einmal gezählt, egal ob im Inventar,
  // in der Bank oder in beiden — reine Navigationshilfe, keine Bestandsanzeige).
  const allBankItemIds = new Set<string>([
    ...depositEntriesUnsorted.map((e) => e.itemId),
    ...storedEntriesUnsorted.map((e) => e.itemId),
  ]);
  const chipCounts: Partial<Record<FilterCategory, number>> = { all: allBankItemIds.size };
  for (const id of allBankItemIds) {
    const cat = filterCategoryOf(id);
    chipCounts[cat] = (chipCounts[cat] ?? 0) + 1;
  }

  // Persönlichkeits-Paket §C.1: Weltzustand-Vorrangs-Zeile für die Verwalterin (util/npcVoice.ts).
  const bankVoiceKey = resolveNpcVoiceKey("bank", state);

  // Teilmengen-Modal (Task #314 B2) — welches Item/welche Spalte gerade eine Zahl abfragt.
  const [qtyModal, setQtyModal] = useState<{ itemId: string; zone: BankZone } | null>(null);

  // ── Pointer-basiertes Drag & Drop (Task #314, Chef-Zitat "aktuell fast kein sauberes Drag and
  // Drop möglich"): ersetzt HIER das frühere native HTML5-DnD (draggable/dragstart/dragover/drop —
  // kein Touch-Support, kein Cursor-Geist, keine Zonen-Highlights) durch echte Pointer-Events
  // (Maus+Touch einheitlich). Reine Ref-/DOM-Mutation während des Zugs (Ghost-Element + Highlight-
  // Klassen per direktem style-/classList-Zugriff, KEIN React-State pro Pixel) — dasselbe Perf-
  // Prinzip wie ActionQueuePanel.tsx' Queue-Reordering (dortiger Kopfkommentar), hier über zwei
  // GRIDS hinweg statt innerhalb einer Liste. Bewegt IMMER die GANZE Gruppe eines Basis-Items
  // (Stack + alle Varianten-Instanzen, s. `depositItemGroup`/`withdrawItemGroup`) — Punkt 2 des
  // Auftrags. CharacterPage/EquipmentDoll behalten ihr bestehendes natives DnD unverändert
  // (anderes Revier, funktioniert dort weiter unverändert).
  const invGridRef = useRef<HTMLDivElement>(null);
  const bankGridRef = useRef<HTMLDivElement>(null);
  const dragActiveRef = useRef(false);
  const DRAG_THRESHOLD_PX = 5;

  const gridEl = (zone: BankZone): HTMLDivElement | null =>
    zone === "inv" ? invGridRef.current : bankGridRef.current;

  /** Kann die Gruppe von `itemId` gerade in `zone` landen? Nur eine VORSCHAU (Highlight-Farbe) —
   *  die Engine-Ops prüfen beim tatsächlichen Drop atomar erneut, s. `depositItemGroup`/
   *  `withdrawItemGroup`. */
  const zoneAccepts = (itemId: string, zone: BankZone): boolean =>
    zone === "bank" ? canDeposit(state, content, itemId) : hasInstanceRoom(state.inventory, content, itemId);

  const setZoneHighlight = (itemId: string, activeZone: BankZone | null): void => {
    for (const zone of ["inv", "bank"] as const) {
      gridEl(zone)?.classList.remove("bank-grid--drop-valid", "bank-grid--drop-invalid");
    }
    if (activeZone === null) return;
    gridEl(activeZone)?.classList.add(zoneAccepts(itemId, activeZone) ? "bank-grid--drop-valid" : "bank-grid--drop-invalid");
  };

  const zoneAtPoint = (x: number, y: number): BankZone | null => {
    for (const zone of ["inv", "bank"] as const) {
      const box = gridEl(zone)?.getBoundingClientRect();
      if (box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return zone;
    }
    return null;
  };

  /**
   * Fach-Index unter dem Zeiger (SAVE 87). Gelesen aus dem DOM statt aus einer gefuehrten Liste:
   * das Raster ist ein CSS-Grid mit umbrechenden Spalten, seine Geometrie kennt nur der Browser.
   * `elementsFromPoint` statt `elementFromPoint`, weil der Ziehschatten unter dem Zeiger klebt und
   * sonst jeden Treffer schlucken wuerde.
   */
  const bankSlotAtPoint = (x: number, y: number): number | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const fach = (el as HTMLElement).closest?.("[data-bank-slot]");
      if (fach) {
        const idx = Number((fach as HTMLElement).dataset.bankSlot);
        if (Number.isInteger(idx)) return idx;
      }
    }
    return null;
  };

  function beginBankDrag(
    itemId: string,
    from: BankZone,
    e: ReactPointerEvent<HTMLElement>,
    fromSlot?: number,
  ): void {
    if (e.button !== 0 || dragActiveRef.current) return;
    const startX = e.clientX;
    const startY = e.clientY;

    // Das Herkunfts-Fach wird waehrend des Zugs gedaempft — so sieht man auf einen Blick, WOHER
    // das Stueck kommt, nicht nur, was am Zeiger klebt.
    const quellEl = e.currentTarget as HTMLElement | null;

    const ghostEl = document.createElement("div");
    ghostEl.className = "item-drag-ghost";
    const img = getItemImage(itemId);
    const icon = content.items[itemId]?.icon;
    if (img) {
      const el = document.createElement("img");
      el.src = img;
      el.alt = "";
      el.className = "pixelart";
      ghostEl.appendChild(el);
    } else if (icon) {
      ghostEl.textContent = icon;
    }
    ghostEl.style.display = "none"; // erst sichtbar, sobald die Bewegungsschwelle überschritten ist
    document.body.appendChild(ghostEl);

    let moved = false;
    let overZone: BankZone | null = null;
    // Sichtbare Rueckmeldung beim Umsortieren (Chef-Fund 31.08.2026: „man sieht gar nicht was man
    // dragged und dropped"). Die Spalten-Hervorhebung darunter greift nur beim Ein-/Auslagern —
    // innerhalb der Bank bleibt `overZone` null, es gab also gar keine Rueckmeldung. Bewusst per
    // Klasse aus dem Ziehen heraus gesetzt und NICHT ueber CSS `:hover`: waehrend eine Maustaste
    // gedrueckt ist, ist Hover nicht verlaesslich.
    let zielEl: HTMLElement | null = null;
    const setzeZiel = (el: HTMLElement | null): void => {
      if (zielEl === el) return;
      zielEl?.classList.remove("bank-slot--drop");
      zielEl = el;
      zielEl?.classList.add("bank-slot--drop");
    };
    // Umsortieren nur, wenn das Fach bekannt ist UND kein Filter laeuft: unter einem Filter ist die
    // Anzeige-Position nicht die echte, ein Zug landete sonst am falschen Fach.
    const umsortieren = from === "bank" && fromSlot !== undefined && !filterActive;
    let zielFach: number | null = null;

    const positionGhost = (x: number, y: number): void => {
      ghostEl.style.transform = `translate(${x + 16}px, ${y + 18}px)`;
    };

    const cleanup = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      ghostEl.remove();
      setzeZiel(null);
      quellEl?.classList.remove("bank-slot--source");
      document.body.classList.remove("bank-dragging-noselect");
      setZoneHighlight(itemId, null);
      dragActiveRef.current = false;
    };

    const onMove = (ev: PointerEvent): void => {
      if (!moved) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
        moved = true;
        dragActiveRef.current = true;
        ghostEl.style.display = "";
        quellEl?.classList.add("bank-slot--source");
        document.body.classList.add("bank-dragging-noselect");
      }
      positionGhost(ev.clientX, ev.clientY);
      const zone = zoneAtPoint(ev.clientX, ev.clientY);
      // Innerhalb der Bank ist das Ziehen ein UMSORTIEREN (SAVE 87), zwischen den Spalten ein
      // Ein-/Auslagern. Beides laeuft ueber denselben Zug, nur das Ziel unterscheidet sich.
      zielFach =
        umsortieren && zone === "bank" ? bankSlotAtPoint(ev.clientX, ev.clientY) : null;
      setzeZiel(
        zielFach !== null && zielFach !== fromSlot
          ? document.querySelector<HTMLElement>(`[data-bank-slot="${zielFach}"]`)
          : null,
      );
      const targetZone = zone !== null && zone !== from ? zone : null;
      if (targetZone !== overZone) {
        overZone = targetZone;
        setZoneHighlight(itemId, overZone);
      }
    };

    const finish = (commit: boolean): void => {
      cleanup();
      if (!commit || !moved) return;
      // Umsortieren zuerst pruefen: es passiert INNERHALB der Bank, `overZone` bleibt dabei null
      // (die eigene Spalte ist kein gueltiges Ein-/Auslager-Ziel).
      if (umsortieren && zielFach !== null && zielFach !== fromSlot) {
        if (moveBankSlot(state, fromSlot!, zielFach)) playSfx("click");
        return;
      }
      if (!overZone) return;
      if (overZone === "bank") {
        const res = depositItemGroup(state, content, itemId);
        if (res.deposited === 0 && res.instancesMoved === 0) gameAlert("bank.noSlot");
      } else {
        const res = withdrawItemGroup(state, content, itemId);
        if (res.withdrawn === 0 && res.instancesMoved === 0) gameAlert("alert.noBagSpace");
      }
    };

    const onUp = (): void => finish(true);
    const onCancel = (): void => finish(false);
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") finish(false); // Abbruch bei Esc — nichts wird bewegt
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  }

  return (
    <div className="bank-page">
      {/* Bereichs-Erst-Tour (Chef-Auftrag Welle B, 2026-07-13): läuft nur beim allerersten Besuch
          dieser Seite, danach für immer aus (state.onboarding.toursSeen.bank). */}
      <AreaTourGuide tourKey="bank" steps={BANK_TOUR_STEPS} />
      {/* NPC-Begrüßung („Speaking Head", Chef-GO 2026-07-13). Welle QQ (2026-07-17): echtes
          Porträt — Voss der Zähler, laut Lore-Bibel §3.5/§3.2 der Gewölbe-Verwalter ("das
          Gewölbe ist Voss' Zählkammer"). Name-Label bleibt bewusst der bestehende rollenneutrale
          Titel ("The Quartermaster"/"Die Verwalterin") — reine Bild-Verdrahtung, kein Text-Change. */}
      {/* codex:2026-08-01T18:37:00+02:00 — Vault-Ledger-Kopf: Voss und Kapazität teilen sich
          eine kompakte, responsive Kopfzeile, damit die eigentlichen Lagerlisten die verfügbare
          Seitenhöhe erhalten und die Bankseite keinen eigenen Seiten-Scroll benötigt. */}
      {/* claude:2026-10-17T12:05:00+02:00 — .bank-sheet ist der Query-Container („bank“), .bank-ledger
          EIN Raster darin: Voss, Einleitung, Ausbau, Filterleiste, Hinweise und Spalten ordnen sich
          nach der Panelbreite (pages.css). Tour/Modal bleiben außerhalb, weil sie position:fixed nutzen. */}
      <div className="bank-sheet">
      <div className="bank-ledger">
        <NpcGreeting
          portraitSrc={getPortrait("npc_voss")}
          name={t("npc.bank.name")}
          lines={[t("npc.bank.greet1"), t("npc.bank.greet2"), t("npc.bank.greet3")]}
          // Persönlichkeits-Paket §C.1 (design/lore/waechter-stimme-pack.md): Elite > Spielerzustand
          // (Todeszahl) > Segen (silence/greed) sticht die normale Rotation, s. util/npcVoice.ts.
          priorityLine={
            bankVoiceKey
              ? t(bankVoiceKey).replace("{zone}", activeEliteZoneName(state, tr) ?? "")
              : null
          }
        />
        {/* claude:2026-10-17T12:05:00+02:00 — Belegungszähler stand doppelt (hier + Lager-Spaltenkopf
            mit identischem Tooltip); er bleibt nur am Lager-Spaltenkopf. */}
        <div className="bank-head">
          <span className="muted">{t("bank.intro")}</span>
        </div>

      {/* ── Such-/Typ-Filter + Sortierung — EINE Kopfzeile für beide Spalten (1034 Items im Spiel,
          Endgame braucht Navigation). Reine Anzeige: filtert/sortiert nur die Darstellung, die
          Bank bleibt ein Record (kein State-Write). ── */}
      {/* codex:2026-08-01T18:37:00+02:00 — Vault-Ledger-Kommandoleiste: Suche/Filter/Sortierung
          und Kapazitätsausbau liegen in EINER flachen Zeile, statt vier Höhenblöcke zu verbrauchen. */}
        <div className="bank-filter-row">
          <ItemFilterBar
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            counts={chipCounts}
          />
          <span className="bank-sort-inline">
            <span className="cs-sort-label">{t("char.sortLabel")}</span>
            <select
              className="cs-sort-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as ItemSortMode)}
            >
              {ITEM_SORT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "qty" ? t("inv.filter.sortQty") : t(`char.sort${mode[0]!.toUpperCase()}${mode.slice(1)}`)}
                </option>
              ))}
            </select>
            {/* Das Dropdown WAEHLT nur die Art, dieser Knopf FUEHRT AUS — sonst wuerde jede
                Auswahl sofort die Faecher umwerfen. Bei aktivem Filter gesperrt: was man dann
                saehe, waere nur ein Ausschnitt, das Sortieren wuerde aber ALLE Faecher umbauen. */}
            <button
              type="button"
              className="cs-inv-sortbtn"
              onClick={sortiereBank}
              disabled={filterActive}
              title={filterActive ? t("bank.sortFiltered") : t("char.sortApply")}
            >
              {t("char.sortApply")}
            </button>
          </span>
        </div>

        <div className="shop-upgrade-card" data-guide-id="bank.slotPurchase">
          <span className="shop-upgrade-text">
            <span className="shop-upgrade-icon-medal" aria-hidden="true">
              {getSidebarIcon("bank")
                ? <img loading="lazy" decoding="async" src={getSidebarIcon("bank")!} alt="" />
                : <span>🏦</span>}
            </span>
            {t("bank.expandTitle")}
          </span>
          <button
            className="shop-citadel-btn"
            disabled={cost === null || !canAfford}
            onClick={() => { buyBankSlots(state); }}
          >
            {cost === null
              ? t("bank.buySlotsMax")
              : <>{t("bank.buySlots").replace("{n}", String(BANK_SLOT_PACKAGE))}{" "}<GoldIcon />{" "}{formatNum(cost)}</>
            }
          </button>
        </div>

        <div className="bank-notes">
          {full && <p className="bank-full-note">{t("bank.full")}</p>}
          <p className="bank-hint muted">{t("bank.shiftHint")}</p>
        </div>

      <div className="bank-columns" data-guide-id="bank.columns">
        {/* ── Inventar (links) — Slot-Raster, Einzahlen via Slot-Tooltip ── */}
        <section className="shop-panel bank-ledger-panel bank-ledger-panel--inventory">
          <div className="bank-col-head">
            <BankColTitle iconSrc={getUiIcon("icon_inventory")} fallback="🎒" label={t("bank.inventory")} />
            <button
              className="shop-citadel-btn shop-citadel-btn--sm"
              // Deposit-All wirkt auf das GESAMTE Inventar, nicht nur die gefilterte Anzeige —
              // daher an der ungefilterten Liste hängen (sonst bei aktivem Filter fälschlich
              // deaktiviert, obwohl noch einlagerbare Items existieren).
              disabled={depositEntriesUnsorted.length === 0}
              onClick={() => depositAll(state, content)}
            >
              {t("bank.depositAll")}
            </button>
            {/* „Stack all" (Steam-Forum L1GR 27.08.2026): nur Sorten einlagern, die im Lager schon liegen. */}
            <button
              className="shop-citadel-btn shop-citadel-btn--sm"
              title={t("bank.stackAll.tip")}
              disabled={!state.inventory.slots.some((sl) => sl && (state.bank[sl.itemId] ?? 0) > 0)}
              onClick={() => depositStackable(state, content)}
            >
              {t("bank.stackAll")}
            </button>
          </div>
          {depositEntriesUnsorted.length === 0 ? (
            <p className="muted">{t("bank.invEmpty")}</p>
          ) : (
            <div className="bank-grid cs-inv-grid bank-ledger-list" ref={invGridRef}>
              {depositable.length === 0 && (
                <p className="invf-empty-note">{t("inv.filter.noMatches")}</p>
              )}
              {depositable.map(({ itemId, qty, instances }) => {
                const blocked = !canDeposit(state, content, itemId);
                // Fungible Deposit-Aktionen gelten nur für die schlichte Grundmenge und respektieren
                // `blocked` (volle Bank sperrt NEUE Item-Arten). Der Instanz-Vault (`bankInstances`)
                // ist dagegen unbegrenzt (bank.ts depositInstance) — Varianten bleiben also IMMER
                // einlagerbar, auch wenn die fungible Bank voll ist.
                const plainActions =
                  qty > 0 && !blocked
                    ? [
                        { key: "deposit1", label: t("bank.deposit1"), onClick: () => depositItem(state, content, itemId, 1) },
                        // Task #314 B2: Teilmengen-Modal (gemeinsames QuantityPicker-Widget).
                        {
                          key: "depositQty",
                          label: t("bank.depositQty"),
                          onClick: () => setQtyModal({ itemId, zone: "inv" }),
                        },
                        {
                          key: "depositStack",
                          label: t("bank.depositStack"),
                          // Ganzer Stapel: Grundmenge + ALLE verzauberten Varianten ATOMAR in EINEM
                          // Zug (Task #314 — ersetzt `depositBaseWithVariants`, das bei voller Bank
                          // einen stillen Teiltransfer zuließ, s. bank.ts-JSDoc dort).
                          onClick: () => {
                            const res = depositItemGroup(state, content, itemId);
                            if (res.deposited === 0 && res.instancesMoved === 0) gameAlert("bank.noSlot");
                          },
                        },
                      ]
                    : [];
                return (
                  // Pointer-basiertes Drag (Task #314) sitzt auf diesem Wrapper, NICHT auf der
                  // ItemCell selbst — `cs-inv-slot-wrap` ist der bestehende Slot-Wrapper (Charakter-
                  // Inventar/Shop-Sell-Grid), `bank-drag-cell` schaltet nur `touch-action:none` dazu.
                  <div
                    key={itemId}
                    className="cs-inv-slot-wrap bank-drag-cell"
                    onPointerDown={(e) => beginBankDrag(itemId, "inv", e)}
                  >
                    <VariantContainerCell
                      itemId={itemId}
                      qty={qty > 0 ? qty : undefined}
                      instances={instances}
                      plainActions={plainActions}
                      variantActionsFor={(inst) => [
                        {
                          key: "depositInstance",
                          label: t("bank.depositInstance"),
                          onClick: () => depositInstance(state, inst.instanceId),
                        },
                      ]}
                      onShiftClick={
                        qty > 0 && !blocked
                          ? () => {
                              const res = depositItemGroup(state, content, itemId);
                              if (res.deposited === 0 && res.instancesMoved === 0) gameAlert("bank.noSlot");
                            }
                          : undefined
                      }
                      className={`inv-slot filled${blocked ? " bank-blocked-slot" : ""}`}
                    />
                  </div>
                );
              })}
              {Array.from({ length: invEmptyCount }, (_, i) => (
                <div key={`inv-empty-${i}`} className="inv-slot" />
              ))}
            </div>
          )}
        </section>

        {/* ── Bank (rechts) — Slot-Raster, Auszahlen via Slot-Tooltip ── */}
        <section className="shop-panel bank-ledger-panel bank-ledger-panel--storage">
          <div className="bank-col-head">
            <BankColTitle iconSrc={getSidebarIcon("bank")} fallback="🏦" label={t("bank.storage")} />
            {bankCampSlots > 0 ? (
              <HoverTip
                as="span"
                content={<div className="ct-tip-desc"><CampBoostNote kind="bankSlots" value={bankCampSlots} t={t} /></div>}
              >
                <span className={`bank-count${full ? " full" : ""}`}>
                  {used} / {bankCap}
                </span>
              </HoverTip>
            ) : (
              <span className={`bank-count${full ? " full" : ""}`}>
                {used} / {bankCap}
              </span>
            )}
          </div>
          <div className="bank-grid cs-inv-grid bank-ledger-list" ref={bankGridRef}>
            {stored.length === 0 && storedEntriesUnsorted.length > 0 && (
              <p className="invf-empty-note">{t("inv.filter.noMatches")}</p>
            )}
            {/* Zwei Ansichten aus EINER Quelle: ohne Filter die echten Faecher (mit Luecken an
                ihrer Stelle, verschiebbar), mit Filter die zusammengeschobene Trefferliste. Ein
                Fach-Raster waere unter einem Filter irrefuehrend — man saehe Luecken, wo in
                Wahrheit nur ausgeblendete Items liegen, und ein Verschieben landete am falschen
                Fach, weil die Anzeige-Position nicht mehr die echte ist. Deshalb ist das Ziehen
                dort auch aus (s. `filterActive` in `beginBankDrag`). */}
            {(filterActive
              ? stored.map((entry, i) => ({ idx: i, entry }))
              : bankSlots
            ).map(({ idx, entry }) => {
              if (!entry) {
                return (
                  <div
                    key={`bank-slot-${idx}`}
                    className="inv-slot bank-empty-slot"
                    data-bank-slot={idx}
                  />
                );
              }
              const { itemId, qty, instances } = entry;
              // Ausrüsten direkt aus dem Lager (Chef-Vorgabe „Bank = Entnehmen/Ausrüsten"): erst
              // in die Inventar-Tasche entnehmen (withdrawInstance, immer erfolgreich — unbegrenzte
              // Tasche), dann sofort dort ausrüsten (equipInstance). Nur angeboten, wenn die Basis
              // tatsächlich ausrüstbar ist.
              const isEquipment = content.items[itemId]?.type === "equipment";
              const plainActions =
                qty > 0
                  ? [
                      {
                        key: "withdraw1",
                        label: t("bank.withdraw1"),
                        // Task #314 (Verbraucher-Feedback): volles Inventar blieb bisher STILL — die
                        // Zelle bleibt im Lager (withdrawItem verändert bei 0 bewegten nichts), aber
                        // der Spieler bekam nie eine Rückmeldung, WARUM nichts passierte.
                        onClick: () => {
                          const moved = withdrawItem(state, content, itemId, 1);
                          if (moved === 0) gameAlert("alert.noBagSpace");
                        },
                      },
                      // Task #314 B2: Teilmengen-Modal (gemeinsames QuantityPicker-Widget) — vorher
                      // gab es zwischen "1" und "alles" keine Zwischenmenge.
                      {
                        key: "withdrawQty",
                        label: t("bank.withdrawQty"),
                        onClick: () => setQtyModal({ itemId, zone: "bank" }),
                      },
                      {
                        key: "withdrawAll",
                        label: t("bank.withdrawAll"),
                        // Ganzer Stapel: fungible Menge + ALLE Gear-Vault-Instanzen ATOMAR (Task #314
                        // — vorher bewegte diese Aktion NUR den fungiblen Anteil, Varianten mussten
                        // einzeln über den Pouch geholt werden; genau die Lücke, die Drag&Drop für
                        // gestapelte Waffen/Rüstungen mit mehreren Versionen unbenutzbar machte).
                        onClick: () => {
                          const res = withdrawItemGroup(state, content, itemId);
                          if (res.withdrawn === 0 && res.instancesMoved === 0) gameAlert("alert.noBagSpace");
                        },
                      },
                    ]
                  : [];
              return (
                <div
                  key={itemId}
                  className="cs-inv-slot-wrap bank-drag-cell"
                  data-bank-slot={idx}
                  onPointerDown={(e) => beginBankDrag(itemId, "bank", e, idx)}
                >
                  <VariantContainerCell
                    itemId={itemId}
                    qty={qty > 0 ? qty : undefined}
                    instances={instances}
                    plainActions={plainActions}
                    variantActionsFor={(inst) => {
                      const acts: ItemAction[] = [
                        {
                          key: "withdrawInstance",
                          label: t("bank.withdrawInstance"),
                          onClick: () => withdrawInstance(state, inst.instanceId),
                        },
                      ];
                      if (isEquipment) {
                        acts.push({
                          key: "equip",
                          label: t("item.equip"),
                          onClick: () => {
                            // Chef-Bugfix 22.07.: withdrawInstance schlägt in der Praxis nie fehl
                            // (unbegrenzte Instanz-Tasche) — der Equip-Schritt danach kann aber am
                            // Kapazitäts-Check des Ziel-Slots scheitern (kein Platz, das vorher dort
                            // getragene Item zurückzulegen). Beides landet gemeinsam im Alert-Fallback,
                            // die Bag-Voll-Meldung greift nur, wenn das Inventar es wirklich ist.
                            const withdrawn = withdrawInstance(state, inst.instanceId);
                            if (withdrawn && equipSucceeded(equipInstance(state, content, inst.instanceId))) {
                              playSfx("equip");
                            } else {
                              reportEquipFailure(state, content);
                            }
                          },
                        });
                      }
                      return acts;
                    }}
                    onShiftClick={
                      qty > 0
                        ? () => {
                            const res = withdrawItemGroup(state, content, itemId);
                            if (res.withdrawn === 0 && res.instancesMoved === 0) gameAlert("alert.noBagSpace");
                          }
                        : undefined
                    }
                    className="inv-slot filled"
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
      </div>
      </div>

      {qtyModal && (
        <BankQtyModal
          itemId={qtyModal.itemId}
          zone={qtyModal.zone}
          available={
            qtyModal.zone === "inv"
              ? itemCount(state.inventory, qtyModal.itemId)
              : (state.bank[qtyModal.itemId] ?? 0)
          }
          onConfirm={(qty) => {
            if (qtyModal.zone === "inv") {
              depositItem(state, content, qtyModal.itemId, qty);
            } else {
              const moved = withdrawItem(state, content, qtyModal.itemId, qty);
              if (moved === 0) gameAlert("alert.noBagSpace");
            }
          }}
          onClose={() => setQtyModal(null)}
        />
      )}
    </div>
  );
}
