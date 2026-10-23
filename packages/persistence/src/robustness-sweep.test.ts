/**
 * QA ROBUSTNESS / CRASH-HUNT SWEEP (2026-07-01, Kontrolleur).
 *
 * Adversariales Test-Skript (KEIN Spiel-Code) — attackiert die Engine-Invarianten mit illegalen/
 * unmöglichen Eingaben, Cap-Overflow, kaputten Slots, NaN/negativ, leerem Köcher und
 * Save→Serialize→Deserialize-Roundtrips. Ziel: nichts crasht, nichts korrumpiert dauerhaft.
 *
 * Diagnostisch + hart: fundamentale Invarianten (kein Crash, kein persistiertes NaN, keine Dupe,
 * Caps eingehalten) werden hart geasserted; grenzwertiges Verhalten wird via console.log berichtet.
 */
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { effectiveBankCapacity } from "@hearthforge/shared";
import {
  addItem,
  removeItem,
  itemCount,
  usedSlots,
  effectiveCapacity,
  advance,
  createGame,
  setActiveAction,
  startCombat,
  equipItem,
  equipTool,
  unequipItem,
  buyItem,
  sellItem,
  depositItem,
  withdrawItem,
  bankSlotsUsed,
  isBankFull,
} from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

// ── Helfer ────────────────────────────────────────────────────────────────

/** Rekursiver NaN/Infinity-Detektor über den gesamten State. Liefert Pfade nicht-endlicher Zahlen. */
function findNonFinite(obj: unknown, path = "", seen = new Set<unknown>()): string[] {
  const bad: string[] = [];
  if (typeof obj === "number") {
    if (!Number.isFinite(obj)) bad.push(`${path}=${obj}`);
    return bad;
  }
  if (!obj || typeof obj !== "object") return bad;
  if (seen.has(obj)) return bad;
  seen.add(obj);
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    bad.push(...findNonFinite(v, path ? `${path}.${k}` : k, seen));
  }
  return bad;
}

/** Negative Mengen irgendwo im Inventar / in der Bank? */
function findNegativeQty(state: GameState): string[] {
  const bad: string[] = [];
  state.inventory.slots.forEach((s, i) => {
    if (s && s.qty < 0) bad.push(`inv.slots[${i}].qty=${s.qty}`);
  });
  for (const [id, qty] of Object.entries(state.bank)) {
    if (qty < 0) bad.push(`bank.${id}=${qty}`);
  }
  return bad;
}

/** Alle harten State-Invarianten. Leere Liste = gesund. */
function invariants(state: GameState, c: ContentDB): string[] {
  const bad: string[] = [];
  const inv = state.inventory;
  const cap = effectiveCapacity(inv, c);
  if (usedSlots(inv) > inv.slots.length) bad.push(`used(${usedSlots(inv)}) > slots.length(${inv.slots.length})`);
  if (inv.slots.length > cap) bad.push(`slots.length(${inv.slots.length}) > effectiveCap(${cap})`);
  if (state.character.gold < 0) bad.push(`gold<0 (${state.character.gold})`);
  if (bankSlotsUsed(state, c) > effectiveBankCapacity(state, c)) {
    bad.push(`bankUsed(${bankSlotsUsed(state, c)}) > bankCap(${effectiveBankCapacity(state, c)})`);
  }
  // Ammo-Removal (#286): `ammoCount` existiert nicht mehr — Invariante: der Alt-Key ist nach jedem Load restlos weg.
  if ("ammoCount" in state) bad.push(`ammoCount-Alt-Key überlebt den Load (muss restlos gelöscht sein)`);
  if (state.activePlayMs > state.elapsedMs + 1) {
    bad.push(`activePlayMs(${state.activePlayMs}) > elapsedMs(${state.elapsedMs})`);
  }
  // Bestiarium-Fundament (SAVE 58): discoveredItems ist ein striktes true-Set (kein false/0/"x"-
  // Geist); monsterKills trägt nur positive Ganzzahlen (sanitize strippt/klemmt beim Load, live
  // inkrementiert combat nur +1 — alles andere ist Korruption).
  for (const [id, v] of Object.entries(state.discoveredItems ?? {})) {
    if (v !== true) bad.push(`discoveredItems.${id}=${String(v)} (muss strikt true sein)`);
  }
  // Meisterweihe (SAVE 59): dieselbe strikte true-Set-Semantik für die drei Weihe-Records,
  // plus die Teilmengen-Invarianten granted/seen ⊆ masteryCapes (sanitize erzwingt beides).
  for (const [id, v] of Object.entries(state.masteryCapes ?? {})) {
    if (v !== true) bad.push(`masteryCapes.${id}=${String(v)} (muss strikt true sein)`);
  }
  for (const [id, v] of Object.entries(state.capeGranted ?? {})) {
    if (v !== true) bad.push(`capeGranted.${id}=${String(v)} (muss strikt true sein)`);
    if (state.masteryCapes?.[id] !== true) bad.push(`capeGranted.${id} ohne Weihe (⊆-Invariante)`);
  }
  for (const [id, v] of Object.entries(state.capeCeremonySeen ?? {})) {
    if (v !== true) bad.push(`capeCeremonySeen.${id}=${String(v)} (muss strikt true sein)`);
    if (state.masteryCapes?.[id] !== true) bad.push(`capeCeremonySeen.${id} ohne Weihe (⊆-Invariante)`);
  }
  for (const [id, n] of Object.entries(state.monsterKills ?? {})) {
    if (!Number.isInteger(n) || n <= 0) bad.push(`monsterKills.${id}=${n} (muss positive Ganzzahl sein)`);
  }
  // Dungeon-Einmal-Unlock (SAVE 60): strikte true-Set-Semantik + nur bekannte Dungeon-IDs;
  // geclearte Dungeons sind IMMER entsperrt (Load-Invariante). Der „Schlüssel nie im Besitz"-
  // Check ist bewusst NICHT hier: er gilt nur POST-Load (der Sweep heilt Besitz beim Laden);
  // handgebaute Vorher-States (E1-Fuzz) dürfen Schlüssel tragen → dedizierter G1-Test.
  for (const [id, v] of Object.entries(state.dungeonsUnlocked ?? {})) {
    if (v !== true) bad.push(`dungeonsUnlocked.${id}=${String(v)} (muss strikt true sein)`);
    if (!c.dungeons.some((d) => d.id === id)) bad.push(`dungeonsUnlocked.${id} (unbekannter Dungeon)`);
  }
  for (const [id, n] of Object.entries(state.dungeonsCleared ?? {})) {
    if (typeof n === "number" && n > 0 && c.dungeons.some((d) => d.id === id) && state.dungeonsUnlocked?.[id] !== true) {
      bad.push(`dungeonsCleared.${id}=${n} ohne Unlock (cleared ⇒ unlocked verletzt)`);
    }
  }
  bad.push(...findNegativeQty(state));
  bad.push(...findNonFinite(state));
  return bad;
}

/** Serialisiert + lädt einen State (gleicher Zeitpunkt = kein Offline). Wirft, wenn null. */
function roundtrip(state: GameState, c: ContentDB = content, now = 1_000_000): GameState {
  const json = serialize(state, now);
  const res = deserialize(json, c, now);
  if (!res) throw new Error("deserialize gab null zurück (Save als beschädigt verworfen)");
  return res.state;
}

/** Findet eine Fernkampf-Mainhand aus dem echten Content (#286: Munition existiert nicht mehr). */
function findRangedWeapon(c: ContentDB): ItemId | null {
  for (const item of Object.values(c.items)) {
    if (item.slot === "mainhand" && item.weaponStyle === "ranged") return item.id;
  }
  return null;
}

/** Ein Food-Item (heilt). */
function findFood(c: ContentDB): ItemId | null {
  const f = Object.values(c.items).find((i) => i.type === "consumable" && (i.healAmount ?? 0) > 0);
  return f?.id ?? null;
}

/** Ein bekanntes stapelbares Material (kein Instanz/Ammo). */
const MAT: ItemId = "copper_ore";

// ── Suite ─────────────────────────────────────────────────────────────────

describe("robustness sweep", () => {
  // ---- A) NaN / negative Mengen in die Low-Level-Primitive ------------------
  // BEFUND (P3, defensiv) — BEHOBEN 2026-07-01 (logic-dev): die exportierten Primitive
  // addItem/sellItem/depositItem (+ advance-`dt`) guarden jetzt NEBEN `qty <= 0` auch `Number.isFinite`
  // (spiegelt SimPlayer.advanceTime). Eine nicht-endliche MENGE ist damit ein No-op — kein transientes
  // NaN mehr in Slot-/Gold-/Bank-Werten. (Kein Live-Pfad speiste je NaN: qty sind abgeleitete Counts/
  // Fixbuttons, dt ist gedeckelt; der Guard härtet ein künftiges Freitext-Mengenfeld vor.) Diese Tests
  // asserten den Guard nun direkt. Das Save→Load-Sanitize-Netz (NaN→JSON null→clampFinite) bleibt als
  // zweite Verteidigungslinie bestehen — relevant nur noch für den PREIS-Parameter von buyItem (siehe
  // B2), der niemals Freitext ist.
  it("A1: addItem(nicht-endliche/negative Menge) ist ein No-op (qty-Guard)", () => {
    const s = createGame({ name: "P" }, content, 1);
    addItem(s.inventory, content, MAT, 10); // Basis-Stack
    const report: Record<string, unknown> = {};
    for (const q of [NaN, Infinity, -Infinity, -50, 0]) {
      const before = itemCount(s.inventory, MAT);
      const added = addItem(s.inventory, content, MAT, q);
      report[`q=${q}`] = { added, before };
      expect(added).toBe(0); // nicht-endlich/≤0 → nichts hinzugefügt
    }
    // eslint-disable-next-line no-console
    console.log("[A1 addItem qty-Verhalten]", JSON.stringify(report));
    expect(itemCount(s.inventory, MAT)).toBe(10); // Stack unverändert
    // Der Guard verhindert transientes NaN schon VOR dem Save-Load (kein Netz nötig) …
    expect(findNonFinite(s)).toEqual([]);
    expect(findNegativeQty(s)).toEqual([]);
    // … und der Round-Trip bleibt selbstverständlich endlich (zweite Verteidigungslinie).
    expect(findNonFinite(roundtrip(s))).toEqual([]);
  });

  it("A2: sellItem(nicht-endliche/negative Menge) ist ein No-op (qty-Guard) — Gold bleibt endlich", () => {
    const s = createGame({ name: "P" }, content, 1);
    addItem(s.inventory, content, MAT, 5);
    const report: Record<string, unknown> = {};
    for (const q of [Infinity, -3, 0, NaN]) {
      const goldBefore = s.character.gold;
      const gold = sellItem(s, content, MAT, q);
      report[`q=${q}`] = { returned: gold, goldBefore, goldAfter: s.character.gold };
      expect(gold).toBe(0); // nichts verkauft, kein Gold-Fluss
    }
    // eslint-disable-next-line no-console
    console.log("[A2 sellItem endlich-Verhalten]", JSON.stringify(report));
    // Auch NaN vergiftet Gold nicht mehr (Guard fängt es VOR addGold ab):
    expect(Number.isFinite(s.character.gold)).toBe(true);
    expect(s.character.gold).toBeGreaterThanOrEqual(0);
    expect(itemCount(s.inventory, MAT)).toBe(5); // Bestand unverändert
    expect(findNonFinite(s)).toEqual([]);
    expect(findNonFinite(roundtrip(s))).toEqual([]);
  });

  it("A3: deposit/withdraw(nicht-endlich/negativ/0) sind No-ops; Bestand bleibt endlich & erhalten", () => {
    const s = createGame({ name: "P" }, content, 1);
    addItem(s.inventory, content, MAT, 100);
    for (const q of [Infinity, -10, 0, NaN]) {
      depositItem(s, content, MAT, q);
      withdrawItem(s, content, MAT, q);
    }
    // depositItem hat jetzt einen isFinite-Guard; withdrawItem ist durch seine Slot-Schleife inhärent
    // sicher → keine der Ops verschiebt/vergiftet etwas. Gesamtmenge bleibt erhalten & endlich:
    expect(findNonFinite(s)).toEqual([]);
    expect(findNegativeQty(s)).toEqual([]);
    expect(itemCount(s.inventory, MAT) + (s.bank[MAT] ?? 0)).toBe(100);
    expect(s.bank[MAT]).toBeUndefined(); // nichts eingelagert (auch Infinity lagert NICHTS mehr ein)
    expect(findNonFinite(roundtrip(s))).toEqual([]);
  });

  // ---- B) Button-Masher 2.0: illegale Ops dürfen nie crashen -----------------
  it("B1: illegale ENDLICHE Ops crashen nie & lassen den State perfekt invariant", () => {
    const s = createGame({ name: "Masher" }, content, 7);
    const ops: Array<[string, () => void]> = [
      ["equip(unbekannt)", () => equipItem(s, content, "__nope__" as ItemId)],
      ["equip(nicht besessen)", () => equipItem(s, content, MAT)],
      ["unequip(mainhand)x3", () => { unequipItem(s, content, "mainhand"); unequipItem(s, content, "mainhand"); unequipItem(s, content, "mainhand"); }],
      ["buy(unbekannt)", () => buyItem(s, content, "__nope__" as ItemId, 5, 3)],
      ["buy(qty 0)", () => buyItem(s, content, MAT, 1, 0)],
      ["buy(ohne Gold)", () => buyItem(s, content, "iron_platebody" as ItemId, 999999, 3)],
      ["sell(nicht besessen)", () => sellItem(s, content, "iron_platebody" as ItemId, 5)],
      ["sell(qty negativ)", () => sellItem(s, content, MAT, -5)],
      ["deposit(unbekannt)", () => depositItem(s, content, "__nope__" as ItemId, 5)],
      ["deposit(negativ)", () => depositItem(s, content, MAT, -5)],
      ["withdraw(unbekannt)", () => withdrawItem(s, content, "__nope__" as ItemId, 5)],
      ["withdraw(nicht in Bank)", () => withdrawItem(s, content, MAT, 9999)],
      ["startCombat(unbekannt)", () => startCombat(s, content, "__nope__" as never)],
      ["setAction(unbekannt)", () => setActiveAction(s, content, "__nope__" as never)],
      ["advance(negativ)", () => advance(s, content, -1000)],
      ["advance(0)", () => advance(s, content, 0)],
      ["removeItem(qty negativ)", () => removeItem(s.inventory, MAT, -5)],
    ];
    const crashes: string[] = [];
    for (const [name, op] of ops) {
      try { op(); } catch (e) { crashes.push(`${name}: ${(e as Error).message}`); }
    }
    expect(crashes).toEqual([]);
    // ENDLICHE illegale Ops dürfen den State NICHT korrumpieren — muss perfekt invariant bleiben.
    expect(invariants(s, content)).toEqual([]);
    expect(invariants(roundtrip(s), content)).toEqual([]);
  });

  it("B2: NaN-PREIS an buyItem vergiftet transient, wird aber vom Save-Load geheilt", () => {
    // advance/addItem guarden NaN-`dt`/`qty` jetzt (No-op). Einziger verbleibender transienter Pfad:
    // der PREIS-Parameter (`cost`) von buyItem — der stammt IMMER aus dem Shop-Content, nie aus einem
    // Freitextfeld, ist also kein realer Live-Bug. Das Save-Load-Sanitize-Netz härtet ihn ab.
    const s = createGame({ name: "NaN" }, content, 7);
    expect(() => {
      advance(s, content, NaN);         // Guard → No-op (accumulatorMs bleibt endlich)
      buyItem(s, content, MAT, NaN, 2); // cost=NaN → gold=NaN, goldSpent=NaN (transient)
      addItem(s.inventory, content, MAT, NaN); // Guard → No-op (kein NaN-Slot)
    }).not.toThrow();
    expect(Number.isFinite(s.accumulatorMs)).toBe(true); // advance-Guard griff
    // Transient nicht-endlich (nur gold/goldSpent aus dem NaN-Preis), aber NIE ein Crash …
    console.log("[B2] transiente non-finite Pfade:", JSON.stringify(findNonFinite(s)));
    // … und der Save-Load-Sanitize härtet ALLES wieder auf endliche, invariante Werte.
    const loaded = roundtrip(s);
    expect(findNonFinite(loaded)).toEqual([]);
    expect(invariants(loaded, content)).toEqual([]);
  });

  // ---- C) Inventar + Bank an die Caps: Overflow/Dupe --------------------------
  it("C1: Inventar/Bank bis Cap füllen — keine Overflow-Akzeptanz, kein Cap-Bruch", () => {
    const s = createGame({ name: "Hoarder" }, content, 3);
    s.settings.autoBank = false; // Overflow soll NICHT automatisch in die Bank
    const ids = Object.keys(content.items) as ItemId[];
    // Inventar mit distinkten Arten bis zum Cap füllen.
    const cap = effectiveCapacity(s.inventory, content);
    let i = 0;
    while (usedSlots(s.inventory) < cap && i < ids.length) addItem(s.inventory, content, ids[i++]!, 1);
    expect(usedSlots(s.inventory)).toBeLessThanOrEqual(cap);
    // Weitere NEUE Art in volles Inventar (kein passender Stack) → 0 eingelagert.
    const newKind = ids.find((id) => itemCount(s.inventory, id) === 0)!;
    const added = addItem(s.inventory, content, newKind, 1);
    expect(added).toBe(0);
    expect(usedSlots(s.inventory)).toBeLessThanOrEqual(cap);

    // Bank bis Cap füllen.
    const bankCap = effectiveBankCapacity(s, content);
    let k = 0;
    while (bankSlotsUsed(s, content) < bankCap && k < ids.length) {
      const id = ids[k++]!;
      if (itemCount(s.inventory, id) < 1) addItem(s.inventory, content, id, 1);
      depositItem(s, content, id, 1);
    }
    expect(bankSlotsUsed(s, content)).toBeLessThanOrEqual(bankCap);
    // Neue Art in volle Bank → deposit lehnt ab.
    const newBankKind = ids.find((id) => (s.bank[id] ?? 0) === 0)!;
    if (itemCount(s.inventory, newBankKind) < 1) addItem(s.inventory, content, newBankKind, 1);
    const beforeUsed = bankSlotsUsed(s, content);
    const dep = depositItem(s, content, newBankKind, 1);
    if (isBankFull(s, content)) {
      expect(dep).toBe(0);
      expect(bankSlotsUsed(s, content)).toBe(beforeUsed);
    }
    expect(invariants(s, content)).toEqual([]);
    expect(invariants(roundtrip(s), content)).toEqual([]);
  });

  // ---- D) Fernkampf ohne Munitionssystem (#286) ------------------------------
  // D2 (Köcher-Sortenwechsel) ist mit dem Ammo-Removal gestorben — es gibt keinen Köcher mehr.
  it("D1: Fernkampf ganz ohne Munition crasht nicht und kämpft durch (kein outOfAmmo-Stopp mehr)", () => {
    const weapon = findRangedWeapon(content);
    if (!weapon) { console.log("[D1] keine Fernkampf-Waffe im Content — übersprungen"); return; }
    const s = createGame({ name: "Archer", startingStyle: "ranged" }, content, 5);
    s.character.equipment.mainhand = weapon;
    const mon = Object.values(content.monsters).find((m) => !m.slayerRequirement && m.level <= 3);
    if (!mon) { console.log("[D1] kein Low-Level-Monster — übersprungen"); return; }
    expect(startCombat(s, content, mon.id)).toBe(true);
    expect(() => advance(s, content, 30_000)).not.toThrow();
    // Kein Munitions-Stopp: der Kampf endet höchstens durch Tod/Stalemate — nie durch "outOfAmmo".
    expect(s.combat.stopReason).not.toBe("outOfAmmo");
    expect(invariants(s, content)).toEqual([]);
    console.log(`[D1] nach 30s: monsterId=${s.combat.monsterId}, stopReason=${s.combat.stopReason}, hp=${s.character.hp}, kills=${s.combat.kills}`);
  });

  // ---- E) Save-Roundtrip-Fuzz auf diverse States + Idempotenz ---------------
  it("E1: diverse States round-trippen ohne NaN/Korruption und sind idempotent", () => {
    const food = findFood(content);
    const states: Array<{ label: string; make: () => GameState }> = [
      { label: "fresh-melee", make: () => createGame({ name: "M" }, content, 1) },
      { label: "fresh-ranged", make: () => createGame({ name: "R", startingStyle: "ranged" }, content, 2) },
      { label: "fresh-magic", make: () => createGame({ name: "G", startingStyle: "magic" }, content, 3) },
      {
        label: "mid-gather-8h",
        make: () => {
          const s = createGame({ name: "A", starterKit: true }, content, 4);
          setActiveAction(s, content, "cut_normal_tree");
          advance(s, content, 8 * 60 * 60 * 1000);
          return s;
        },
      },
      {
        label: "mid-combat-with-food",
        make: () => {
          const s = createGame({ name: "C" }, content, 6);
          if (food) { addItem(s.inventory, content, food, 50); s.character.food = food; }
          const mon = Object.values(content.monsters).find((m) => !m.slayerRequirement && m.level <= 3);
          if (mon) { startCombat(s, content, mon.id); advance(s, content, 20_000); }
          return s;
        },
      },
      {
        label: "full-inventory-autobank",
        make: () => {
          const s = createGame({ name: "F" }, content, 8);
          const ids = Object.keys(content.items) as ItemId[];
          for (let i = 0; i < s.inventory.slots.length; i++) s.inventory.slots[i] = { itemId: ids[i % ids.length]!, qty: 999 };
          setActiveAction(s, content, "cut_normal_tree");
          advance(s, content, 60_000);
          return s;
        },
      },
    ];
    for (const { label, make } of states) {
      const s = make();
      expect(invariants(s, content), `${label}: pre-roundtrip`).toEqual([]);
      const l1 = roundtrip(s);
      const bad = invariants(l1, content);
      expect(bad, `${label}: post-roundtrip`).toEqual([]);
      // Idempotenz: erneut serialisieren+laden ⇒ tief gleich (Sanitize ist stabil).
      const j1 = serialize(l1, 2_000_000);
      const l2 = deserialize(j1, content, 2_000_000)!.state;
      expect(serialize(l2, 3_000_000)).toBe(serialize(l1, 3_000_000));
      console.log(`[E1] ${label}: ok (inv ${usedSlots(l1.inventory)}/${effectiveCapacity(l1.inventory, content)}, bank ${bankSlotsUsed(l1)}, gold ${l1.character.gold})`);
    }
  });

  // ---- E2) Gear-Erhaltungssatz über den Roundtrip (Regression P1, ui-audit) --
  // LÜCKE IM ALTEN SWEEP: E1 round-trippte nie einen State mit belegten Alias-Slots (ring2/tool2),
  // und die Idempotenz-Prüfung verglich erst NACH dem ersten Load — ein Slot, den sanitizeState beim
  // ERSTEN Laden vernichtet (Ring in ring2: P1-Datenverlust), blieb dadurch unsichtbar. Dieser Test
  // rüstet über die ECHTEN Engine-Pfade (equipItem) alle Mehrfach-/Alias-Slots aus und assertet,
  // dass das komplette Equipment-Record den Roundtrip unverändert überlebt.
  it("E2: Alias-Slots (ring2/tool1/tool2/tool3) überleben den Roundtrip — Gear-Erhaltungssatz", () => {
    const s = createGame({ name: "Ringer" }, content, 11);
    const ring = Object.values(content.items).find((i) => i.slot === "ring1" && !i.requirements);
    if (ring) {
      addItem(s.inventory, content, ring.id, 2);
      equipItem(s, content, ring.id);
      equipItem(s, content, ring.id); // Engine weicht auf ring2 aus
      expect(s.character.equipment.ring2).toBe(ring.id);
    } else {
      console.log("[E2] kein anforderungsfreier Ring im Content — ring2-Teil übersprungen");
    }
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    addItem(s.inventory, content, "crude_fishing_rod", 1);
    addItem(s.inventory, content, "copper_axe", 1); // Dual-Use-Item (type "equipment" MIT tool-Feld)
    equipItem(s, content, "bronze_pickaxe");
    equipItem(s, content, "crude_fishing_rod"); // Engine weicht auf tool2 aus
    // equipItem würde die Axt (type "equipment", slot "mainhand") als Waffe ausrüsten — der
    // Werkzeug-Slot-Pfad für Dual-Use-Items ist equipTool (UI routet den Slot-Drop gezielt dorthin).
    equipTool(s, content, "copper_axe"); // Engine weicht auf tool3 aus (dritter freier Werkzeug-Slot)
    expect(s.character.equipment.tool3).toBe("copper_axe");
    expect(s.character.equipment.mainhand).toBe("rusty_sword"); // Start-Waffe unberührt
    // (Der frühere Köcher-Teil ist mit dem Ammo-Removal #286 gestorben.)
    const before = { ...s.character.equipment };
    const loaded = roundtrip(s);
    // KEIN Slot darf sein Item beim Laden verlieren (vorher: ring2 bei jedem Load genullt).
    expect(loaded.character.equipment).toEqual(before);
    expect(invariants(loaded, content)).toEqual([]);
  });

  // ---- F) SAVE_VERSION 44 activePlayMs-Migration ----------------------------
  it("F1: Alt-Save (v43) ohne activePlayMs → best-effort = elapsedMs, endlich, ≤ elapsedMs", () => {
    const s = createGame({ name: "Vet" }, content, 1);
    setActiveAction(s, content, "cut_normal_tree");
    advance(s, content, 120_000);
    const elapsed = s.elapsedMs;
    s.version = 43;
    delete (s as Partial<GameState>).activePlayMs;
    const loaded = roundtrip(s);
    expect(Number.isFinite(loaded.activePlayMs)).toBe(true);
    expect(loaded.activePlayMs).toBe(elapsed); // best effort
    expect(loaded.activePlayMs).toBeLessThanOrEqual(loaded.elapsedMs);
  });

  it("F2: v43 mit kaputtem elapsedMs (NaN/negativ/riesig) → activePlayMs endlich & ≥0", () => {
    for (const badElapsed of [NaN, -500, 9e18, Infinity]) {
      const s = createGame({ name: "Vet" }, content, 1);
      s.version = 43;
      delete (s as Partial<GameState>).activePlayMs;
      (s as { elapsedMs: unknown }).elapsedMs = badElapsed;
      const loaded = roundtrip(s);
      expect(Number.isFinite(loaded.activePlayMs), `elapsed=${badElapsed}`).toBe(true);
      expect(loaded.activePlayMs, `elapsed=${badElapsed}`).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(loaded.elapsedMs)).toBe(true);
    }
  });

  it("F3: v44-State mit manipuliertem activePlayMs (NaN/negativ) wird gehärtet", () => {
    // NaN serialisiert zu JSON `null` → migrate behandelt es wie „fehlend" → best-effort = elapsedMs.
    const s = createGame({ name: "V" }, content, 1);
    advance(s, content, 60_000);
    (s as { activePlayMs: unknown }).activePlayMs = NaN;
    let loaded = roundtrip(s);
    expect(Number.isFinite(loaded.activePlayMs)).toBe(true);
    expect(loaded.activePlayMs).toBe(loaded.elapsedMs); // best effort auf elapsedMs
    expect(loaded.activePlayMs).toBeLessThanOrEqual(loaded.elapsedMs);
    // Negativ bleibt als JSON-Zahl erhalten → migrate lässt es (typeof number), sanitize härtet auf 0.
    const s2 = createGame({ name: "V" }, content, 1);
    advance(s2, content, 60_000);
    (s2 as { activePlayMs: unknown }).activePlayMs = -1234;
    loaded = roundtrip(s2);
    expect(loaded.activePlayMs).toBe(0);
  });

  // ---- G) Dungeon-Schlüssel (Welle J, SAVE 64: quest-based unlock) ----
  it("G1: v63-Alt-Schlüssel (Inventar-Stack + Bank, auch absurd groß) werden von der v64-Migration entfernt, entsperren, erstatten VOLL & endlich", () => {
    const s = createGame({ name: "Keyhoarder" }, content, 21);
    s.version = 63; // Alt-Save: die v64-Migration (EINMALIG, versioniert) macht den Sweep
    // Handgebauter „Alt-/Edit"-Besitz: großer Inventar-Stack + Bank-Bestand + zweite Schlüsselart.
    s.inventory.slots[0] = { itemId: "crypt_key", qty: 999 };
    s.bank["crypt_key"] = 500;
    s.bank["highland_key"] = 3;
    const loaded = roundtrip(s);
    // Nach der Migration: KEINE Alt-Schlüssel mehr im Besitz, Dungeons als Bestandsschutz entsperrt.
    for (const id of ["crypt_key", "highland_key"]) {
      expect(loaded.inventory.slots.some((sl) => sl?.itemId === id), `${id} im Inventar`).toBe(false);
      expect(loaded.bank[id] ?? 0, `${id} in der Bank`).toBe(0);
    }
    expect(loaded.dungeonsUnlocked["crypt_depths"]).toBe(true);
    expect(loaded.dungeonsUnlocked["highland_aerie"]).toBe(true);
    expect(loaded.dungeonsUnlocked["wyvern_lair"]).toBe(true);
    // VOLLE Erstattung (qty × value, Welle J: kein SELL_FRACTION-Abschlag, kein Unlock-Abzug):
    // 1499 × 250 + 3 × 700 — endlich, kein Overflow, kein NaN.
    expect(Number.isFinite(loaded.character.gold)).toBe(true);
    expect(loaded.character.gold).toBe(s.character.gold + 1499 * 250 + 3 * 700);
    expect(invariants(loaded, content)).toEqual([]);
    // Idempotenz: zweiter Load (jetzt v64) ändert nichts mehr (kein Doppel-Refund).
    const again = roundtrip(loaded);
    expect(again.character.gold).toBe(loaded.character.gold);
    expect(serialize(again, 5_000_000)).toBe(serialize(loaded, 5_000_000));
  });

  it("G2: post-v64 sind Story-Schlüssel gewöhnliche Items (kein Load-Sweep); NUR der paragon_key wird weiter eingezogen", () => {
    const s = createGame({ name: "Transitional" }, content, 22);
    s.inventory.slots[0] = { itemId: "crypt_key", qty: 5 }; // Übergangsphasen-Drop (bis Welle K)
    s.bank["paragon_key"] = 2; // Direktpfad/Edit — „nie im Besitz"-Invariante des Turms
    const goldBefore = s.character.gold;
    const loaded = roundtrip(s);
    // Story-Schlüssel bleiben liegen (verkaufbare Vendor-Ware, kein Gold, kein Grant) …
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === "crypt_key" && sl.qty === 5)).toBe(true);
    expect(loaded.dungeonsUnlocked["crypt_depths"]).toBeUndefined();
    // … der Paragon-Schlüssel nicht: Unlock + Überschuss-Erstattung (1 auf, 1 × floor(3000 × 0.5)).
    expect(loaded.bank["paragon_key"]).toBeUndefined();
    expect(loaded.dungeonsUnlocked["paragon_tower"]).toBe(true);
    expect(loaded.character.gold).toBe(goldBefore + 1500);
    expect(invariants(loaded, content)).toEqual([]);
    // Idempotenz: zweiter Load stabil (Schlüssel bleiben, kein weiteres Gold).
    const again = roundtrip(loaded);
    expect(serialize(again, 5_000_000)).toBe(serialize(loaded, 5_000_000));
  });

  // ── Chef-Bugfix „22/20" (2026-07-23): Instanz-Intake-Kapazitäts-Gate + Alt-Zustand bleibt ladbar ──
  it("22/20: ein historisch übervolles Inventar (mehr distinkte belegte Slots als Kapazität) lädt UNVERÄNDERT — kein Sanitize-Wegräumen", () => {
    // Simuliert einen Alt-Save-Zustand (z.B. nach dem Taschenslot-Entfall SAVE_VERSION 56, s.
    // `InventoryState`-Doku in shared): mehr DISTINKTE belegte Slots als die aktuelle Kapazität. Bewusst
    // distinkte Item-Arten (keine Stack-Konsolidierung möglich, anders als der oak_log-Fall im
    // v55→v56-Test oben) — der Spieler behält JEDES Item; nur neue Aufnahme bleibt begrenzt, bis
    // wieder Platz frei ist. NICHT über die geteilte `invariants()`-Sweep-Prüfung laufen lassen: die
    // flaggt `slots.length > cap` bewusst als Warnsignal für FRISCHE/zufällige States — hier ist es
    // die exakt gewollte Alt-Save-Ausnahme.
    const s = createGame({ name: "Overfull" }, content, 1);
    const cap = s.inventory.baseCapacity;
    expect(cap).toBe(20);
    const distinctIds = Object.keys(content.items).slice(0, cap + 2); // cap+2 = 22 distinkte Arten
    expect(distinctIds.length).toBe(cap + 2);
    s.inventory.slots = distinctIds.map((id) => ({ itemId: id, qty: 1 }));
    expect(usedSlots(s.inventory)).toBe(cap + 2);

    const loaded = roundtrip(s);
    // Nichts verloren: alle cap+2 distinkten Items überleben den Load.
    expect(usedSlots(loaded.inventory)).toBe(cap + 2);
    expect(loaded.inventory.slots.length).toBeGreaterThanOrEqual(cap + 2);
    for (const id of distinctIds) {
      expect(loaded.inventory.slots.some((sl) => sl?.itemId === id), `${id} überlebt`).toBe(true);
    }
    // Kapazität selbst bleibt unverändert (kein impliziter Auto-Ausbau durch Überfüllung — genau DAS
    // ist der „22/20"-Zustand: Spieler sieht mehr belegte als nominell verfügbare Slots).
    expect(effectiveCapacity(loaded.inventory, content)).toBe(cap);
    expect(usedSlots(loaded.inventory)).toBeGreaterThan(effectiveCapacity(loaded.inventory, content));
    // Idempotent: ein zweiter Load ändert nichts mehr (stabil, kein schleichender Verlust).
    const again = roundtrip(loaded);
    expect(usedSlots(again.inventory)).toBe(cap + 2);
    expect(serialize(again, 3_000_000)).toBe(serialize(loaded, 3_000_000));
  });
});
