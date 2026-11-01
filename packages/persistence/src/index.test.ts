import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { ATTRIBUTE_IDS, AUTO_EAT_DEFAULT_THRESHOLD, CAMP_MAX_OFFLINE_BONUS_MS, AUTO_EAT_MAX_THRESHOLD, AUTO_EAT_MAX_TIER, AUTO_EAT_MIN_THRESHOLD, BUYBACK_BANNED_ITEM_IDS, DEFAULT_PORTRAIT, KILL_COOLDOWN_MS, FARM_PLOT_SLOTS, MAX_FARM_PLOTS, MAX_OFFLINE_MS, PRESTIGE_MAX_OFFLINE_BONUS_MS, SAVE_VERSION, SELL_FRACTION, autoEatThreshold, effectiveAutoEatThreshold, effectiveBankCapacity } from "@hearthforge/shared";
import type { ContentDB, CropDef, ItemDef } from "@hearthforge/shared";
import { COMPLETION_CAPE_KEY, masterRingItemId } from "@hearthforge/shared";
import { SLAYER_RETRY_RECOVERY_MS, addItem, addItemOrBank, advance, checkMasteryCapes, computeStats, createGame, equipItem, equipTool, isBankFull, setActiveAction, startCombat, startDungeon, xpForLevel } from "@hearthforge/engine"; // claude:2026-10-31T14:21:06+01:00 — + SLAYER_RETRY_RECOVERY_MS
import { deserialize, parseSummary, serialize } from "./index";

/**
 * deserialize liefert seit der Security-Härtung `LoadResult | null` (null bei beschädigtem Save).
 * Für Tests mit gültigen Saves erwarten wir immer ein Ergebnis → assert non-null.
 */
function loadOk(json: string, c = content, now?: number): NonNullable<ReturnType<typeof deserialize>> {
  const r = now === undefined ? deserialize(json, c) : deserialize(json, c, now);
  expect(r).not.toBeNull();
  return r!;
}

function gameWithProgress() {
  const s = createGame({ name: "Aldric", baseAttributes: { str: 3 } }, content, 42);
  setActiveAction(s, content, "cut_normal_tree");
  advance(s, content, 30_000);
  return s;
}

/**
 * Content-Klon, der der melee-Starter-Waffe `rusty_sword` ein `wardCapacity` gibt → ein frischer
 * Charakter hat damit maxWard > 0. Nötig, seit Armor-Iteration 2 §2 (WARD_CORE_PER_INT=0) den
 * INT-Kern entfernt hat: Ward kommt jetzt AUSSCHLIESSLICH aus Stoffgear (wardCapacity).
 */
function contentWithStarterWard(): ContentDB {
  return {
    ...content,
    items: { ...content.items, rusty_sword: { ...content.items.rusty_sword!, wardCapacity: 40 } },
  };
}

describe("persistence", () => {
  it("serialisiert und lädt verlustfrei (gleicher Zeitpunkt → kein Offline)", () => {
    const state = gameWithProgress();
    const now = 1_000_000;
    const json = serialize(state, now);

    const { state: loaded, offlineMs } = loadOk(json, content, now);
    expect(offlineMs).toBe(0);
    expect(loaded).toEqual(state);
  });

  it("Alt-Save-Duldung #303 (L3+L4): gestapelte Buffs derselben Kategorie UND Duplikat-Runen-Instanzen laden UNVERÄNDERT", () => {
    // Save-Kompat-Gesetz: die red-team-Fixes L3 (Buff-Kategorie-Verdrängung) und L4 (duplicate_affix)
    // gelten NUR für neue Anwendungen — deserialize/sanitize darf einen vor-#303-Zustand weder
    // säubern noch dedupen. Alt-Buffs laufen natürlich aus; Alt-Duplikat-Instanzen wirken weiter.
    const s = createGame({ name: "AltStack", baseAttributes: { str: 3 } }, content, 7);
    // 6 gleichzeitig aktive offense-Buffs + 2 regeneration-Buffs (vor #303 legal erspielbar).
    const altBuffs = [
      "tonic_oxblood",
      "tonic_warpath",
      "tonic_apex",
      "godsbreath_elixir",
      "slayer_war_brew",
      "elixir_grave_lily",
      "panacea_elixir",
      "tonic_ironbark",
    ];
    for (const itemId of altBuffs) s.character.buffs.push({ itemId, remainingMs: 300_000 });
    // Instanz mit 2× demselben Affix (vor #303 legal verzaubert) in der Instanz-Tasche.
    s.inventory.instances.push({
      instanceId: "inst_dup_legacy",
      baseItemId: "adamantium_dagger",
      affixes: [
        { affixId: "affix_swift", tier: 3 },
        { affixId: "affix_swift", tier: 3 },
      ],
    });

    const { state: loaded } = loadOk(serialize(s, 1_000_000), content, 1_000_000);
    // Buffs: ALLE 8 bleiben aktiv (keine Kategorie-Säuberung beim Laden).
    expect(loaded.character.buffs.map((b) => b.itemId)).toEqual(altBuffs);
    // Instanz: beide Duplikat-Affixe überleben den Round-Trip (kein Dedup im Sanitize).
    const inst = loaded.inventory.instances.find((i) => i.instanceId === "inst_dup_legacy");
    expect(inst?.affixes).toEqual([
      { affixId: "affix_swift", tier: 3 },
      { affixId: "affix_swift", tier: 3 },
    ]);
  });

  it("holt Offline-Fortschritt beim Laden nach", () => {
    const state = gameWithProgress();
    const savedAt = 1_000_000;
    const json = serialize(state, savedAt);

    const { offlineTicks } = loadOk(json, content, savedAt + 60_000);
    expect(offlineTicks).toBeGreaterThan(0);
  });

  it("liest die Summary ohne vollen State", () => {
    const json = serialize(gameWithProgress(), 5_000);
    const summary = parseSummary(json);
    expect(summary?.name).toBe("Aldric");
    expect(summary?.savedAt).toBe(5_000);
  });

  it("gibt null bei kaputtem JSON zurück", () => {
    expect(parseSummary("nicht json {{{")).toBeNull();
  });

  it("liefert eine Offline-Zusammenfassung (XP + Items + Dauer)", () => {
    const state = gameWithProgress(); // sammelt Holz
    const savedAt = 1_000_000;
    const json = serialize(state, savedAt);

    const { offline } = loadOk(json, content, savedAt + 600_000); // 10 min weg
    expect(offline.ms).toBe(600_000);
    expect(offline.xp).toBeGreaterThan(0);
    expect(offline.items.normal_log).toBeGreaterThan(0);
  });

  it("zählt Offline-Erträge auch aus der Bank (Auto-Bank, P2)", () => {
    const s = createGame({ name: "Bankier", baseAttributes: { str: 3 } }, content, 42);
    // Inventar komplett füllen (kein freier Slot, kein normal_log-Stack) → Überlauf wandert
    // bei Default-autoBank ins Lager statt ins Inventar. VOLLE Stacks (MAX_STACK 9999, SAVE 69):
    // 1er-Teilstapel würde die v69-Konsolidierung zu EINEM Stack zusammenlegen und Slots freigeben.
    for (let i = 0; i < s.inventory.slots.length; i++) {
      s.inventory.slots[i] = { itemId: "copper_ore", qty: 9999 };
    }
    expect(s.settings.autoBank).toBe(true);
    setActiveAction(s, content, "cut_normal_tree");
    const savedAt = 1_000_000;
    const json = serialize(s, savedAt);

    const { offline, state: loaded } = loadOk(json, content, savedAt + 600_000); // 10 min weg
    // Die gefällten Logs landeten in der Bank — müssen trotzdem im „weg warst"-Popup auftauchen.
    expect((loaded.bank.normal_log ?? 0)).toBeGreaterThan(0);
    expect(offline.items.normal_log).toBeGreaterThan(0);
  });

  it("migriert umbenannte Item-IDs (grimiron→iron, blackcast→steel)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save simulieren: alte Item-IDs in Inventar/Ausrüstung.
    s.inventory.slots[0] = { itemId: "grimiron_sword", qty: 1 };
    s.inventory.slots[1] = { itemId: "grimiron_ore", qty: 5 };
    s.character.equipment.mainhand = "blackcast_warblade";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.slots[0]?.itemId).toBe("iron_sword");
    expect(loaded.inventory.slots[1]?.itemId).toBe("iron_ore");
    expect(loaded.character.equipment.mainhand).toBe("steel_sword");
  });

  it("Lade-Wächter: 2H-Mainhand verdrängt plain Offhand beim Laden (verlustfrei ins Inventar)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Exploit-Save: Zweihandwaffe (copper_staff, twoHanded) im Mainhand UND belegte Offhand.
    s.character.equipment.mainhand = "copper_staff";
    s.character.equipment.offhand = "copper_focus";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.equipment.mainhand).toBe("copper_staff");
    expect(loaded.character.equipment.offhand).toBeNull();
    // Fokus verlustfrei zurück ins Inventar (frisches, leeres Inventar hat Platz).
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === "copper_focus")).toBe(true);
    // Nichts verloren: der Fokus taucht genau einmal wieder auf (Inventar/Bank/Postfach).
    const invQty = loaded.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "copper_focus" ? sl.qty : 0), 0);
    const bankQty = loaded.bank.copper_focus ?? 0;
    const mailQty = (loaded.mailbox ?? []).reduce(
      (n, m) => n + m.items.filter((a) => a.itemId === "copper_focus").reduce((k, a) => k + a.qty, 0),
      0,
    );
    expect(invQty + bankQty + mailQty).toBe(1);
  });

  it("Lade-Wächter: 2H-Mainhand verdrängt verzauberte Offhand-Instanz (Affixe bleiben erhalten)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.equipment.mainhand = "copper_staff";
    s.character.equipment.offhand = "copper_focus";
    s.character.equippedInstances.offhand = {
      instanceId: "inst_focus_1",
      baseItemId: "copper_focus",
      affixes: [{ affixId: "keen", tier: 2 }],
    };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.equipment.offhand).toBeNull();
    expect(loaded.character.equippedInstances.offhand).toBeUndefined();
    // Die Instanz liegt mitsamt Affix in der (unbegrenzten) Instanz-Tasche — keine Verzauberung verloren.
    const moved = loaded.inventory.instances.find((i) => i.baseItemId === "copper_focus");
    expect(moved).toBeDefined();
    expect(moved?.affixes).toEqual([{ affixId: "keen", tier: 2 }]);
  });

  it("Lade-Wächter: 1H-Mainhand + Offhand bleibt unangetastet (kein 2H-Konflikt, No-op)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.equipment.mainhand = "steel_sword"; // 1H (kein twoHanded)
    s.character.equipment.offhand = "copper_focus";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.equipment.mainhand).toBe("steel_sword");
    expect(loaded.character.equipment.offhand).toBe("copper_focus");
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === "copper_focus")).toBe(false);
  });

  it("migriert auch Bank-Schlüssel und führt Mengen bei Kollision zusammen", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save: Bank enthält alte ID (grimiron_ore) UND die neue Ziel-ID (iron_ore).
    s.bank = { grimiron_ore: 5, iron_ore: 3, copper_ore: 2 };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.bank.grimiron_ore).toBeUndefined(); // alte ID weg
    expect(loaded.bank.iron_ore).toBe(8); // 5 + 3 zusammengeführt
    expect(loaded.bank.copper_ore).toBe(2); // unverändert
  });

  it("migriert Kampf-Skill-XP von magic_off→magic und magic_def→warding (v50 → v51)", () => {
    const s = createGame({ name: "Zauberer" }, content, 1);
    // Alt-Save (v50): Kampf-XP unter den alten Skill-Keys.
    s.version = 50;
    s.skills.magic_off = { xp: xpForLevel(40) };
    s.skills.magic_def = { xp: xpForLevel(25) };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // XP wandert 1:1 auf die neuen Keys, die alten sind weg (Level/XP erhalten).
    expect(loaded.skills.magic?.xp).toBe(xpForLevel(40));
    expect(loaded.skills.warding?.xp).toBe(xpForLevel(25));
    expect(loaded.skills.magic_off).toBeUndefined();
    expect(loaded.skills.magic_def).toBeUndefined();
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("Skill-Rename v51 ist idempotent + merged XP bei Key-Kollision", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 50;
    // Pathologischer Save: sowohl der alte als auch der neue Key vorhanden → XP wird summiert.
    s.skills.magic_off = { xp: 100 };
    s.skills.magic = { xp: 30 };
    const first = loadOk(serialize(s, 1000), content, 1000).state;
    expect(first.skills.magic?.xp).toBe(130);
    expect(first.skills.magic_off).toBeUndefined();
    // Erneutes Laden (jetzt v51, kein alter Key mehr) lässt die XP unberührt (kein Doppel-Merge).
    const again = loadOk(serialize(first, 2000), content, 2000).state;
    expect(again.skills.magic?.xp).toBe(130);
  });

  it("setzt fehlendes character.portrait auf DEFAULT_PORTRAIT (Alt-Save < v22)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save simulieren: Portrait-Feld existierte noch nicht.
    delete (s.character as Partial<typeof s.character>).portrait;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.portrait).toBe(DEFAULT_PORTRAIT);
  });

  it("paddet Alt-Save-Inventar von 10 auf 20 Start-Slots (Auto-Bank-Default an)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (< v24) simulieren: 10 Basis-Slots, kein settings-Feld.
    s.version = 23;
    s.inventory.baseCapacity = 10;
    s.inventory.slots = new Array(10).fill(null);
    s.inventory.slots[0] = { itemId: "copper_ore", qty: 5 };
    delete (s as Partial<typeof s>).settings;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.baseCapacity).toBe(20);
    expect(loaded.inventory.slots.length).toBe(20);
    expect(loaded.inventory.slots[0]?.itemId).toBe("copper_ore"); // Inhalt erhalten
    expect(loaded.settings.autoBank).toBe(true); // Idle-Komfort default an
    expect(loaded.version).toBe(SAVE_VERSION); // auf aktuelle SAVE_VERSION gehoben (vgl. SAVE_VERSION)
  });

  it("erhält gekaufte Slot-Upgrades beim 10→20-Padding (verschiebt um +10)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save mit 2 gekauften Upgrades: 10 + 2·2 = 14.
    s.version = 23;
    s.inventory.baseCapacity = 14;
    s.inventory.slots = new Array(14).fill(null);
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.baseCapacity).toBe(24); // 14 + 10, Upgrades bleiben erhalten
    expect(loaded.inventory.slots.length).toBe(24);
  });

  it("padding ist idempotent: bereits migrierte Saves (v24) werden nicht erneut verschoben", () => {
    const s = createGame({ name: "X" }, content, 1); // frisch = v24, baseCapacity 20
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.baseCapacity).toBe(20); // unverändert
  });

  it("defaultet quests für Alt-Saves ohne Quest-State", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (< v25): kein quests-Feld.
    s.version = 24;
    delete (s as Partial<typeof s>).quests;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.quests).toEqual({
      completed: [],
      claimed: [],
      repeatBaseline: {},
      daily: { day: 0, quests: [] },
    });
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("defaultet Craft-Zähler + Repeatable-Baseline für Alt-Saves (v26 → v27)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (< v27): noch keine Craft-/Repeatable-Felder.
    s.version = 26;
    delete (s.stats as Partial<typeof s.stats>).itemsCrafted;
    delete (s.stats as Partial<typeof s.stats>).craftedById;
    delete (s.quests as Partial<typeof s.quests>).repeatBaseline;
    delete (s.quests as Partial<typeof s.quests>).daily;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.stats.itemsCrafted).toBe(0);
    expect(loaded.stats.craftedById).toEqual({});
    expect(loaded.quests.repeatBaseline).toEqual({});
    expect(loaded.quests.daily).toEqual({ day: 0, quests: [] });
    expect(loaded.version).toBe(SAVE_VERSION);
    // Idempotent: erneut laden bleibt stabil und überschreibt vorhandene Werte nicht.
    loaded.stats.itemsCrafted = 7;
    loaded.stats.craftedById = { copper_bar: 7 };
    loaded.quests.repeatBaseline = { q_daily_craft: { 0: 5 } };
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.stats.itemsCrafted).toBe(7);
    expect(again.stats.craftedById).toEqual({ copper_bar: 7 });
    expect(again.quests.repeatBaseline).toEqual({ q_daily_craft: { 0: 5 } });
  });

  it("defaultet Achievement-2.0-Zähler für Alt-Saves (v27 → v28): goldSpent/dailyStreak/dungeonsCleared", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (< v28): neue Zähler existieren noch nicht.
    s.version = 27;
    delete (s.stats as Partial<typeof s.stats>).goldSpent;
    delete (s.stats as Partial<typeof s.stats>).dailyStreak;
    delete (s.stats as Partial<typeof s.stats>).lastDailyDay;
    delete (s as Partial<typeof s>).dungeonsCleared;
    // `state.achievements` (string[]) bleibt kompatibel: alte IDs überleben die Migration.
    s.achievements = ["ach_kills_10"];
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.stats.goldSpent).toBe(0);
    expect(loaded.stats.dailyStreak).toBe(0);
    expect(loaded.stats.lastDailyDay).toBe(0);
    expect(loaded.dungeonsCleared).toEqual({});
    expect(loaded.achievements).toContain("ach_kills_10"); // alte Unlock-IDs erhalten
    expect(loaded.version).toBe(SAVE_VERSION);

    // Idempotent: vorhandene Werte werden beim erneuten Laden NICHT überschrieben.
    loaded.stats.goldSpent = 4200;
    loaded.stats.dailyStreak = 5;
    loaded.stats.lastDailyDay = 20260625;
    loaded.dungeonsCleared = { goblin_cave: 3 };
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.stats.goldSpent).toBe(4200);
    expect(again.stats.dailyStreak).toBe(5);
    expect(again.stats.lastDailyDay).toBe(20260625);
    expect(again.dungeonsCleared).toEqual({ goblin_cave: 3 });
  });

  it("defaultet das Aktions-Collection-Log für Alt-Saves (v51 → v52): seenActionDrops", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (< v52): Feld existierte noch nicht.
    s.version = 51;
    delete (s as Partial<typeof s>).seenActionDrops;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.seenActionDrops).toEqual({});
    expect(loaded.version).toBe(SAVE_VERSION);

    // Idempotent: bereits entdeckte Aktions-Drops überleben ein erneutes Laden.
    loaded.seenActionDrops.mine_copper = ["copper_ore"];
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.seenActionDrops.mine_copper).toEqual(["copper_ore"]);
  });

  it("defaultet die Auto-Eat-Schwelle für Alt-Saves (v54 → v55): autoEatThreshold = Default (0.7)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (< v55): das Override-Feld existierte noch nicht.
    s.version = 54;
    delete (s.character as Partial<typeof s.character>).autoEatThreshold;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // Default = aktuelle Max-Tier-Schwelle (Balance-Kette Schritt 4: 0.8 → 0.7). Sehr alte Saves
    // bekommen bewusst den AKTUELLEN Default, nicht den historischen Wert von v55.
    expect(loaded.character.autoEatThreshold).toBe(AUTO_EAT_DEFAULT_THRESHOLD);
    expect(AUTO_EAT_DEFAULT_THRESHOLD).toBe(0.7);
    expect(loaded.version).toBe(SAVE_VERSION);

    // Round-Trip + idempotent: der Wert überlebt ein erneutes Speichern/Laden unverändert.
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.character.autoEatThreshold).toBe(AUTO_EAT_DEFAULT_THRESHOLD);
  });

  describe("Action-Queue (SAVE_VERSION 69 → 70)", () => {
    it("(d) defaultet actionQueue = [] für Alt-Saves ohne das Feld (< 70)", () => {
      const s = createGame({ name: "X" }, content, 1);
      s.version = 69;
      delete (s as Partial<typeof s>).actionQueue;
      const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded.actionQueue).toEqual([]);
      expect(loaded.version).toBe(SAVE_VERSION);

      // Idempotent: eine bereits geplante Queue überlebt ein erneutes Laden unverändert.
      loaded.actionQueue = [{ kind: "action", actionId: "cut_normal_tree", target: 3 }];
      const again = loadOk(serialize(loaded, 2000), content, 2000).state;
      expect(again.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: 3 }]);
    });

    it("Round-Trip erhält eine geplante Queue verlustfrei (endliches + null-target)", () => {
      const s = createGame({ name: "X" }, content, 1);
      setActiveAction(s, content, "cut_normal_tree");
      s.actionQueue = [
        { kind: "action", actionId: "cut_normal_tree", target: 5 },
        { kind: "action", actionId: "smelt_bronze", target: null },
      ];
      const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded.actionQueue).toEqual([
        { kind: "action", actionId: "cut_normal_tree", target: 5 },
        { kind: "action", actionId: "smelt_bronze", target: null },
      ]);
    });

    it("sanitize säubert die Queue: unbekannte Aktion raus, target normalisiert, kaputte Einträge raus", () => {
      const s = createGame({ name: "X" }, content, 1);
      (s as unknown as Record<string, unknown>).actionQueue = [
        { kind: "action", actionId: "cut_normal_tree", target: 5 }, // gültig
        { kind: "action", actionId: "gibt_es_nicht", target: 3 }, // unbekannte Aktion → raus
        { kind: "action", actionId: "smelt_bronze", target: -4 }, // ≤0 → target null
        { kind: "action", actionId: "smelt_bronze", target: 7.9 }, // Float → floor
        { kind: "action", actionId: "smelt_bronze", target: Number.POSITIVE_INFINITY }, // JSON → null → target null
        { target: 2 }, // ohne actionId → raus
        null, // kaputt → raus
        "nope", // kaputt → raus
      ];
      const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded.actionQueue).toEqual([
        { kind: "action", actionId: "cut_normal_tree", target: 5 },
        { kind: "action", actionId: "smelt_bronze", target: null },
        { kind: "action", actionId: "smelt_bronze", target: 7 },
        { kind: "action", actionId: "smelt_bronze", target: null },
      ]);

      // Nicht-Array (manipuliert/kaputt) → leere Queue.
      (s as unknown as Record<string, unknown>).actionQueue = "kaputt";
      const { state: loaded2 } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded2.actionQueue).toEqual([]);
    });
  });

  describe("Postfach/Mailbox (SAVE_VERSION 70 → 71)", () => {
    it("defaultet mailbox = [] und mailSeq = 0 für Alt-Saves ohne die Felder (< 71)", () => {
      const s = createGame({ name: "X" }, content, 1);
      s.version = 70;
      delete (s as Partial<typeof s>).mailbox;
      delete (s as Partial<typeof s>).mailSeq;
      const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded.mailbox).toEqual([]);
      expect(loaded.mailSeq).toBe(0);
      expect(loaded.version).toBe(SAVE_VERSION);
    });

    it("Round-Trip erhält eine gefüllte Überlauf-Mail verlustfrei (gestapelte Items + Instanz)", () => {
      const s = createGame({ name: "X" }, content, 1);
      s.mailbox = [
        {
          id: "mail_0",
          kind: "overflow",
          createdSeq: 0,
          items: [
            { itemId: "copper_ore", qty: 7 },
            { itemId: "oak_log", qty: 3 },
          ],
          instances: [
            { instanceId: "inst_x", baseItemId: "steel_sword", affixes: [{ affixId: "affix_keen", tier: 1 }] },
          ],
        },
      ];
      s.mailSeq = 1;
      const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded.mailbox).toEqual(s.mailbox);
      expect(loaded.mailSeq).toBe(1);
    });

    it("sanitize säubert die Mailbox: unbekannte Items/kaputte qty raus, leere/kind-fremde Mail raus, mailSeq > max createdSeq", () => {
      const s = createGame({ name: "X" }, content, 1);
      (s as unknown as Record<string, unknown>).mailbox = [
        {
          id: "mail_5",
          kind: "overflow",
          createdSeq: 5,
          items: [
            { itemId: "copper_ore", qty: 4 }, // gültig
            { itemId: "gibt_es_nicht", qty: 3 }, // unbekanntes Item → raus
            { itemId: "oak_log", qty: -2 }, // ≤0 → raus
            { itemId: "copper_ore", qty: 6 }, // stapelt auf denselben Eintrag → 10
          ],
          instances: [
            { instanceId: "inst_ok", baseItemId: "steel_sword", affixes: [{ affixId: "affix_keen", tier: 1 }] },
            { instanceId: "", baseItemId: "steel_sword", affixes: [] }, // leere id → raus
            { baseItemId: "gibt_es_nicht", affixes: [] }, // unbekannt/kaputt → raus
          ],
        },
        { id: "mail_leer", kind: "overflow", createdSeq: 1, items: [], instances: [] }, // leer → raus
        { id: "mail_bad", kind: "system", createdSeq: 2, items: [{ itemId: "copper_ore", qty: 1 }], instances: [] }, // unbekannter kind → raus
        null, // kaputt → raus
      ];
      (s as unknown as Record<string, unknown>).mailSeq = 0; // zu klein → wird auf > max createdSeq gehoben
      const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded.mailbox.length).toBe(1);
      const m = loaded.mailbox[0]!;
      expect(m.id).toBe("mail_5");
      expect(m.kind).toBe("overflow");
      expect(m.items).toEqual([{ itemId: "copper_ore", qty: 10 }]);
      expect(m.instances.map((i) => i.instanceId)).toEqual(["inst_ok"]);
      expect(loaded.mailSeq).toBeGreaterThan(5); // > max createdSeq (5)

      // Nicht-Array (manipuliert/kaputt) → leere Mailbox.
      (s as unknown as Record<string, unknown>).mailbox = "kaputt";
      const { state: loaded2 } = loadOk(serialize(s, 1000), content, 1000);
      expect(loaded2.mailbox).toEqual([]);
    });
  });

  it("klemmt eine außer-Bereich Auto-Eat-Schwelle beim Laden (sanitize [0.05, 0.95])", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s.character as { autoEatThreshold?: number }).autoEatThreshold = 5; // absurd hoch
    const hi = loadOk(serialize(s, 1000), content, 1000).state;
    expect(hi.character.autoEatThreshold).toBe(AUTO_EAT_MAX_THRESHOLD);

    (s.character as { autoEatThreshold?: number }).autoEatThreshold = -1; // absurd niedrig
    const lo = loadOk(serialize(s, 1000), content, 1000).state;
    expect(lo.character.autoEatThreshold).toBe(AUTO_EAT_MIN_THRESHOLD);

    // Ein bewusst NICHT gesetztes Feld bleibt undefined (= „kein Override", feste Tier-Schwelle).
    delete (s.character as Partial<typeof s.character>).autoEatThreshold;
    const none = loadOk(serialize(s, 1000), content, 1000).state;
    expect(none.character.autoEatThreshold).toBeUndefined();
  });

  it("effectiveAutoEatThreshold: Override greift nur auf der Max-Stufe, sonst feste Tier-Schwelle", () => {
    // Unter der Max-Stufe wird der Override ignoriert → feste Tier-Schwelle gilt.
    expect(effectiveAutoEatThreshold({ autoEatTier: 0, autoEatThreshold: 0.2 })).toBe(autoEatThreshold(0));
    expect(
      effectiveAutoEatThreshold({ autoEatTier: AUTO_EAT_MAX_TIER - 1, autoEatThreshold: 0.2 }),
    ).toBe(autoEatThreshold(AUTO_EAT_MAX_TIER - 1));
    // Auf der Max-Stufe mit gesetztem Override → Override gilt.
    expect(effectiveAutoEatThreshold({ autoEatTier: AUTO_EAT_MAX_TIER, autoEatThreshold: 0.3 })).toBe(0.3);
    // Max-Stufe ohne Override (undefined) → Fallback auf die feste Max-Tier-Schwelle (neutral).
    expect(effectiveAutoEatThreshold({ autoEatTier: AUTO_EAT_MAX_TIER })).toBe(
      autoEatThreshold(AUTO_EAT_MAX_TIER),
    );
    // Override wird auch im Lesepfad auf [min,max] geklemmt.
    expect(effectiveAutoEatThreshold({ autoEatTier: AUTO_EAT_MAX_TIER, autoEatThreshold: 5 })).toBe(
      AUTO_EAT_MAX_THRESHOLD,
    );
    expect(effectiveAutoEatThreshold({ autoEatTier: AUTO_EAT_MAX_TIER, autoEatThreshold: 0 })).toBe(
      AUTO_EAT_MIN_THRESHOLD,
    );
  });

  // ── Dreifach-Umbau (SAVE_VERSION 55 → 56, Task #271) ───────────────────────

  it("v55→v56: entfernt ausgerüstete Taschen VERLUSTFREI (Überhang-Items bleiben, nur Aufnahme begrenzt)", () => {
    // Content-Klon MIT einem Taschen-Item (robust, egal wann content-dev small_pouch löscht).
    const pouched = {
      ...content,
      items: {
        ...content.items,
        test_pouch: {
          id: "test_pouch",
          name: { en: "Test Pouch", de: "Test-Beutel" },
          type: "bag",
          stackable: false,
          bagCapacity: 4,
        },
      },
    } as unknown as ContentDB;

    const s = createGame({ name: "X" }, pouched, 1);
    s.version = 55;
    const base = s.inventory.baseCapacity;
    // Alt-Save-Zustand simulieren: Tasche eingesetzt (+4 Slots), ALLE Slots (Basis + Tasche) belegt.
    s.inventory.bagSlots = ["test_pouch", null, null, null];
    while (s.inventory.slots.length < base + 4) s.inventory.slots.push(null);
    for (let i = 0; i < s.inventory.slots.length; i++) {
      s.inventory.slots[i] = { itemId: "oak_log", qty: 1 };
    }
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, pouched, 1000);
    // Tasche ersatzlos entfernt; Kapazität kommt nur noch aus baseCapacity.
    expect(loaded.inventory.bagSlots).toEqual([]);
    expect(loaded.inventory.baseCapacity).toBe(base);
    // VERLUSTFREI: alle (base+4) Logs überleben. Seit SAVE 69 legt die Stack-Konsolidierung die
    // 1er-Teilstapel zu EINEM Stack zusammen (MAX_STACK 9999) — der frühere „übervoll"-Zustand
    // löst sich dadurch auf und slots wird wieder auf die Basis-Kapazität getrimmt.
    const totalLogs = loaded.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "oak_log" ? sl.qty : 0), 0);
    expect(totalLogs).toBe(base + 4);
    expect(loaded.inventory.slots.length).toBe(base);
    expect(loaded.version).toBe(SAVE_VERSION);

    // Idempotent: erneutes Speichern/Laden verliert weiterhin nichts.
    const again = loadOk(serialize(loaded, 2000), pouched, 2000).state;
    const totalAgain = again.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "oak_log" ? sl.qty : 0), 0);
    expect(totalAgain).toBe(base + 4);
    expect(again.inventory.bagSlots).toEqual([]);
  });

  it("v55→v56: löscht settings.autoSalvage und defaultet questTokens = 0 (idempotent)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 55;
    (s.settings as { autoSalvage?: boolean }).autoSalvage = true; // Alt-Save trug das Flag
    delete (s.character as Partial<typeof s.character>).questTokens; // Feld existierte noch nicht
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect((loaded.settings as { autoSalvage?: boolean }).autoSalvage).toBeUndefined();
    expect(loaded.character.questTokens).toBe(0);
    expect(loaded.version).toBe(SAVE_VERSION);

    // Round-Trip: ein verdienter Token-Stand überlebt Speichern/Laden unverändert.
    loaded.character.questTokens = 42;
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.character.questTokens).toBe(42);
    expect((again.settings as { autoSalvage?: boolean }).autoSalvage).toBeUndefined();
  });

  it("sanitize klemmt manipulierte questTokens (NaN/negativ → 0)", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s.character as { questTokens: unknown }).questTokens = Number.NaN; // JSON → null
    const nan = loadOk(serialize(s, 1000), content, 1000).state;
    expect(nan.character.questTokens).toBe(0);

    (s.character as { questTokens: number }).questTokens = -50;
    const neg = loadOk(serialize(s, 1000), content, 1000).state;
    expect(neg.character.questTokens).toBe(0);
  });

  it("sanitize lässt Skill-/Mastery-XP jenseits der Level-99-Schwelle UNVERÄNDERT durch (Vault-Regression 2026-07-16)", () => {
    // Die Engine vergibt XP auch nach Level 99 ungedeckelt weiter (addXp/tick/farming/slayer) —
    // ein legitimer Save DARF also Über-XP tragen. Die frühere sanitize-Klemme gegen
    // xpForLevel(MAX_LEVEL) beschnitt sie bei jedem Load und machte den serialize→deserialize-
    // Round-Trip instabil (Save-Kompat-Vault-Guard riss zeitversetzt, sobald der Offline-Catch-up
    // eines Fixtures mit aktiver Aktion die Schwelle überschritt). Invariante jetzt: Über-XP
    // überlebt exakt; nur NaN/Infinity/negativ (Korruption/Save-Edit) werden weiter abgefangen.
    const overCap = xpForLevel(99) + 2_823_660; // realistischer Über-99-Stand (Fischer nach Catch-up)
    const s = createGame({ name: "X" }, content, 1);
    s.skills.fishing = { xp: overCap };
    s.mastery.catch_voidray = { xp: overCap };
    const loaded = loadOk(serialize(s, 1000), content, 1000).state;
    expect(loaded.skills.fishing?.xp).toBe(overCap);
    expect(loaded.mastery.catch_voidray?.xp).toBe(overCap);

    // Korruptionsschutz bleibt: NaN (→ JSON null) / Infinity (→ JSON null) / negativ ⇒ 0.
    s.skills.fishing = { xp: Number.NaN };
    s.mastery.catch_voidray = { xp: -1 };
    const bad = loadOk(serialize(s, 1000), content, 1000).state;
    expect(bad.skills.fishing?.xp).toBe(0);
    expect(bad.mastery.catch_voidray?.xp).toBe(0);
  });

  it("entfernt das alte Attributpunkt-System (unspentPoints/allocatedAttributes) aus Alt-Saves (v26)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (< v26) mit den ausgebauten Manuell-Feldern simulieren.
    const legacy = s.character as unknown as Record<string, unknown>;
    legacy.unspentPoints = 3;
    legacy.allocatedAttributes = { str: 2, dex: 0, con: 0, int: 0, wis: 0, lck: 0 };
    s.version = 25;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    const loadedChar = loaded.character as unknown as Record<string, unknown>;
    expect(loadedChar.unspentPoints).toBeUndefined();
    expect(loadedChar.allocatedAttributes).toBeUndefined();
    // Lädt ohne Crash und ist auf die aktuelle Version gehoben.
    expect(loaded.version).toBe(SAVE_VERSION);
    // Idempotent: erneut laden bleibt stabil.
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    const againChar = again.character as unknown as Record<string, unknown>;
    expect(againChar.unspentPoints).toBeUndefined();
    expect(againChar.allocatedAttributes).toBeUndefined();
  });

  it("migriert alte Iron-Rüstung (5-Teiler) auf das neue volle Set", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.inventory.slots[0] = { itemId: "iron_body", qty: 1 };
    s.character.equipment.helmet = "iron_helm";
    s.character.equipment.legs = "grimiron_legs"; // ganz alter Save
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.slots[0]?.itemId).toBe("iron_platebody");
    expect(loaded.character.equipment.helmet).toBe("iron_fullhelm");
    expect(loaded.character.equipment.legs).toBe("iron_platelegs");
    // Zielitems existieren im aktuellen Content.
    expect(content.items.iron_platebody).toBeDefined();
    expect(content.items.iron_fullhelm).toBeDefined();
  });

  it("default-initialisiert Pet-Felder aus v28-Alt-Saves (companionPetId/ownedPets/lastPetDrop)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (v28) simulieren: Pet-Felder existierten noch nicht.
    s.version = 28;
    const legacy = s.character as unknown as Record<string, unknown>;
    delete legacy.companionPetId;
    delete legacy.ownedPets;
    delete (s as unknown as Record<string, unknown>).lastPetDrop;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.companionPetId).toBeNull();
    expect(loaded.character.ownedPets).toEqual({});
    expect(loaded.lastPetDrop).toBeNull();
    expect(loaded.petDropSeq).toBe(0); // v65: ohne Breadcrumb startet der Zähler bei 0
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  describe("Pet-Drop-Sequenz (SAVE 65, Welle DD: Kein Drop darf je stumm sein)", () => {
    it("Round-Trip erhält petDropSeq monoton — auch nach UI-Quittung (lastPetDrop = null)", () => {
      const s = createGame({ name: "X" }, content, 1);
      s.petDropSeq = 5;
      s.lastPetDrop = null; // UI hat den letzten Drop bereits quittiert
      const { state: loaded } = loadOk(serialize(s, 1_000), content, 1_000);
      expect(loaded.petDropSeq).toBe(5); // NIE genullt/gesenkt → der 6. Drop bekäme seq 6
      expect(loaded.lastPetDrop).toBeNull();
    });

    it("migriert Alt-Saves (< 65): petDropSeq = lastPetDrop.seq (bzw. 0 ohne Breadcrumb)", () => {
      const s = createGame({ name: "X" }, content, 1);
      s.version = 64;
      s.lastPetDrop = { petId: "rotbark", seq: 3 };
      delete (s as unknown as Record<string, unknown>).petDropSeq;
      const { state: loaded } = loadOk(serialize(s, 1_000), content, 1_000);
      expect(loaded.petDropSeq).toBe(3);
      expect(loaded.lastPetDrop).toEqual({ petId: "rotbark", seq: 3 });

      const s2 = createGame({ name: "Y" }, content, 1);
      s2.version = 64;
      s2.lastPetDrop = null;
      delete (s2 as unknown as Record<string, unknown>).petDropSeq;
      const { state: loaded2 } = loadOk(serialize(s2, 1_000), content, 1_000);
      expect(loaded2.petDropSeq).toBe(0);
    });

    it("sanitize-Härtung: Monotonie-Invariante petDropSeq ≥ lastPetDrop.seq; NaN/negativ → geheilt", () => {
      const s = createGame({ name: "X" }, content, 1);
      (s as unknown as Record<string, unknown>).petDropSeq = -7; // korrupt/manipuliert
      s.lastPetDrop = { petId: "rotbark", seq: 2 };
      const { state: loaded } = loadOk(serialize(s, 1_000), content, 1_000);
      expect(loaded.petDropSeq).toBe(2); // nie unter den Breadcrumb-seq

      const s2 = createGame({ name: "Y" }, content, 1);
      (s2 as unknown as Record<string, unknown>).lastPetDrop = { petId: 42, seq: 1 }; // kaputtes Shape
      s2.petDropSeq = 4;
      const { state: loaded2 } = loadOk(serialize(s2, 1_000), content, 1_000);
      expect(loaded2.lastPetDrop).toBeNull(); // ungültige petId → Breadcrumb verworfen
      expect(loaded2.petDropSeq).toBe(4); // Zähler bleibt
    });

    it("offline gedroppte Pets landen chronologisch in offline.petDrops (Catch-up würfelt wie live)", () => {
      // Nur EIN Pet im Content (dropChance 1 auf woodcutting) → deterministisch genau dieser Drop.
      const c: ContentDB = {
        ...content,
        pets: {
          debug_off_pet: {
            id: "debug_off_pet",
            name: { en: "Off", de: "Off" },
            skillEffect: { kind: "doubleDrop", skill: "woodcutting", value: 0.05 },
            combatAbility: { name: { en: "T", de: "T" }, kind: "heal", intervalMs: 6000, value: 0.03 },
            source: { kind: "skill", skill: "woodcutting" },
            dropChance: 1,
          },
        },
      };
      const s = createGame({ name: "X" }, c, 42);
      setActiveAction(s, c, "cut_normal_tree");
      const savedAt = 1_000_000;
      const json = serialize(s, savedAt);

      const { offline, state: loaded } = loadOk(json, c, savedAt + 600_000); // 10 min weg
      expect(offline.petDrops).toEqual(["debug_off_pet"]);
      expect(loaded.character.ownedPets.debug_off_pet).toBe(true);
      expect(loaded.petDropSeq).toBe(1); // der Offline-Drop zählt im monotonen Zähler mit
      // Kein zweites Feiern nötig: die UI zeigt Offline-Drops im „Während du weg warst"-Popup.
    });

    it("ohne Offline-Drop fehlt petDrops (kein leeres Array — Muster kills/deaths)", () => {
      const s = gameWithProgress();
      const json = serialize(s, 1_000_000);
      const { offline } = loadOk(json, content, 1_000_000); // 0 ms weg → nichts gedroppt
      expect(offline.petDrops).toBeUndefined();
    });
  });

  describe("Offline verdiente Achievements (Welle LL — transient, kein Save-Feld)", () => {
    it("offline erfüllte Achievements landen in offline.achievementsEarned + achievementIds", () => {
      // Kurz vor der ach_gather_100-Schwelle gespeichert, aktive Holzfäller-Aktion: der
      // Catch-up sammelt weiter, checkAchievements (advance-Choke-Point) schaltet offline frei.
      const s = createGame({ name: "X" }, content, 42);
      setActiveAction(s, content, "cut_normal_tree");
      s.stats.itemsGathered = 99;
      const savedAt = 1_000_000;
      const json = serialize(s, savedAt);

      const { offline, state: loaded } = loadOk(json, content, savedAt + 600_000); // 10 min weg
      expect(loaded.stats.itemsGathered).toBeGreaterThanOrEqual(100);
      expect(loaded.achievements).toContain("ach_gather_100");
      expect(offline.achievementsEarned).toBeGreaterThanOrEqual(1);
      expect(offline.achievementIds).toContain("ach_gather_100");
      expect(offline.achievementIds).toHaveLength(offline.achievementsEarned!);
      // Bereits VOR dem Save verdiente Achievements zählen NICHT mit (nur das Catch-up-Delta).
      for (const id of offline.achievementIds!) {
        expect(s.achievements, `${id} war schon vor dem Save freigeschaltet`).not.toContain(id);
      }
    });

    it("ohne offline verdiente Achievements fehlen beide Felder (kein 0/leeres Array)", () => {
      const s = gameWithProgress();
      const json = serialize(s, 1_000_000);
      const { offline } = loadOk(json, content, 1_000_000); // 0 ms weg
      expect(offline.achievementsEarned).toBeUndefined();
      expect(offline.achievementIds).toBeUndefined();
    });
  });

  describe("AP-Meilensteine & Slayer-Streak (SAVE 66, Welle GG)", () => {
    it("defaultet alle sieben neuen Felder für Alt-Saves (< 66)", () => {
      const s = createGame({ name: "X" }, content, 1);
      s.version = 65;
      const raw = s as unknown as Record<string, unknown>;
      delete raw.claimedApMilestones;
      delete raw.apMilestoneSeq;
      delete raw.lastApMilestone;
      delete raw.apCeremonyPending;
      delete raw.slayerStreak;
      delete raw.slayerStreakSeq;
      delete raw.lastSlayerStreakBonus;

      const { state: loaded } = loadOk(serialize(s, 1_000), content, 1_000);
      expect(loaded.claimedApMilestones).toEqual([]);
      expect(loaded.apMilestoneSeq).toBe(0);
      expect(loaded.lastApMilestone).toBeNull();
      expect(loaded.apCeremonyPending).toBe(false);
      expect(loaded.slayerStreak).toBe(0);
      expect(loaded.slayerStreakSeq).toBe(0);
      expect(loaded.lastSlayerStreakBonus).toBeNull();
      expect(loaded.version).toBe(SAVE_VERSION);
      // Die AP-NACHHOLUNG passiert bewusst NICHT beim Load, sondern beim ersten advance-Check
      // (checkApMilestones am Achievement-Choke-Point) — hier (0 ms offline) bleibt alles leer.
    });

    it("Round-Trip erhält vergebene Meilensteine, Streak und Zeremonie-Flag verlustfrei", () => {
      const s = createGame({ name: "X" }, content, 1);
      s.claimedApMilestones = [5, 10, 15, 20, 25];
      s.apMilestoneSeq = 3;
      s.lastApMilestone = { steps: [20, 25], tokens: 8, seq: 3 };
      s.apCeremonyPending = true;
      s.slayerStreak = 7;
      s.slayerStreakSeq = 1;
      s.lastSlayerStreakBonus = { streak: 5, tokens: 2, points: 0, seq: 1 };

      const { state: loaded } = loadOk(serialize(s, 1_000), content, 1_000);
      expect(loaded.claimedApMilestones).toEqual([5, 10, 15, 20, 25]);
      expect(loaded.apMilestoneSeq).toBe(3);
      expect(loaded.lastApMilestone).toEqual({ steps: [20, 25], tokens: 8, seq: 3 });
      expect(loaded.apCeremonyPending).toBe(true);
      expect(loaded.slayerStreak).toBe(7);
      expect(loaded.lastSlayerStreakBonus).toEqual({ streak: 5, tokens: 2, points: 0, seq: 1 });
    });

    it("sanitize-Härtung: ungültige Schritte/Shapes raus, seq-Monotonie erzwungen, Flags strikt boolean", () => {
      const s = createGame({ name: "X" }, content, 1);
      const raw = s as unknown as Record<string, unknown>;
      // claimed: Duplikate, Nicht-5er-Schritte, außerhalb [5..100], Floats, Nicht-Zahlen.
      raw.claimedApMilestones = [5, 5, 7, -10, 200, 60, "x", 3.5];
      raw.apMilestoneSeq = Number.NaN; // JSON macht daraus null → finiteNonNeg → 0 → Monotonie hebt an
      raw.lastApMilestone = { steps: [15, 7], tokens: Number.POSITIVE_INFINITY, seq: 4.9 };
      raw.apCeremonyPending = 1; // truthy, aber kein strikt-true
      raw.slayerStreak = -3;
      raw.slayerStreakSeq = 1; // unter dem Breadcrumb-seq → Monotonie zieht hoch
      raw.lastSlayerStreakBonus = { streak: 5, tokens: 2, points: 0, seq: 7 };

      const { state: loaded } = loadOk(serialize(s, 1_000), content, 1_000);
      expect(loaded.claimedApMilestones).toEqual([5, 60]); // dedupliziert, valide 5er-Schritte, sortiert
      expect(loaded.lastApMilestone).toEqual({ steps: [15], tokens: 0, seq: 4 });
      expect(loaded.apMilestoneSeq).toBe(4); // ≥ lastApMilestone.seq (Muster petDropSeq)
      expect(loaded.apCeremonyPending).toBe(false);
      expect(loaded.slayerStreak).toBe(0); // negativ → 0
      expect(loaded.lastSlayerStreakBonus).toEqual({ streak: 5, tokens: 2, points: 0, seq: 7 });
      expect(loaded.slayerStreakSeq).toBe(7); // Monotonie-Invariante
    });

    it("kaputte Breadcrumbs (falsches Shape) werden verworfen, Zähler bleiben", () => {
      const s = createGame({ name: "X" }, content, 1);
      const raw = s as unknown as Record<string, unknown>;
      raw.lastApMilestone = { steps: "alle", tokens: 5, seq: 2 }; // steps kein Array
      raw.lastSlayerStreakBonus = { streak: "fünf", seq: 3 }; // streak keine Zahl
      raw.apMilestoneSeq = 9;
      raw.slayerStreakSeq = 9;

      const { state: loaded } = loadOk(serialize(s, 1_000), content, 1_000);
      expect(loaded.lastApMilestone).toBeNull();
      expect(loaded.lastSlayerStreakBonus).toBeNull();
      expect(loaded.apMilestoneSeq).toBe(9);
      expect(loaded.slayerStreakSeq).toBe(9);
    });

    it("Offline-Catch-up holt verdiente AP-Schritte eines Alt-Saves nach (Nachhol-Stapel beim ersten Check)", () => {
      // Alt-Save (< 66) mit VOLLER Sammlung (alle Achievement-IDs = 100 % Quote — content-proof,
      // egal wie der Katalog wächst): die Vergabe läuft beim Offline-advance
      // (checkAchievements → checkApMilestones) — alle 20 Schritte als EIN Breadcrumb-Stapel.
      const s = createGame({ name: "X" }, content, 1);
      s.version = 65;
      s.achievements = content.achievements.map((a) => a.id);
      const raw = s as unknown as Record<string, unknown>;
      delete raw.claimedApMilestones;
      delete raw.apMilestoneSeq;
      delete raw.lastApMilestone;
      delete raw.apCeremonyPending;

      const savedAt = 1_000_000;
      const { state: loaded } = loadOk(serialize(s, savedAt), content, savedAt + 1_000); // 1 s weg → advance läuft
      const allSteps = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);
      expect(loaded.claimedApMilestones).toEqual(allSteps);
      expect(loaded.lastApMilestone?.steps).toEqual(allSteps); // EIN Stapel
      expect(loaded.lastApMilestone?.seq).toBe(1);
      expect(loaded.character.questTokens).toBe(165); // volle Staffel (gepinnt in shared)
      expect(loaded.apCeremonyPending).toBe(true); // 100 % → Zeremonie wartet auf die UI
    });
  });

  it("erhält ausgerüstetes + besessenes Pet beim Round-Trip (neue IDs, v30)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.ownedPets = { rotbark: true, sporewretch: true };
    s.character.companionPetId = "rotbark";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.ownedPets).toEqual({ rotbark: true, sporewretch: true });
    expect(loaded.character.companionPetId).toBe("rotbark");
  });

  it("benennt alte Pet-IDs (v29) auf die neuen Grimm-IDs um (Migration 29→30)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 29;
    // Alt-Save mit den vorherigen Pet-IDs (barki/filu) + ausgerüstetem barki.
    s.character.ownedPets = { barki: true, filu: true } as Record<string, true>;
    s.character.companionPetId = "barki" as string;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // barki→rotbark, filu→sporewretch; companion folgt der Umbenennung; alte IDs verschwinden.
    expect(loaded.character.ownedPets).toEqual({ rotbark: true, sporewretch: true });
    expect(loaded.character.companionPetId).toBe("rotbark");
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("legt ein ausgerüstetes, aber nicht besessenes Pet defensiv ab", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.ownedPets = {}; // nichts besessen
    s.character.companionPetId = "rotbark"; // ausgerüstet ohne Besitz
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.companionPetId).toBeNull();
  });

  // ── Security-Härtung r1: Sanitize / Crash-Schutz ──────────────────────────

  it("clamped manipulierte Zahlen (Gold/HP/Mana/XP/Timer NaN/Infinity/negativ) beim Laden", () => {
    const s = createGame({ name: "X" }, content, 1);
    const loose = s as unknown as Record<string, unknown>;
    (s.character as unknown as Record<string, unknown>).gold = Infinity;
    (s.character as unknown as Record<string, unknown>).hp = NaN;
    (s.character as unknown as Record<string, unknown>).mana = -50;
    s.skills.attack = { xp: -100 };
    loose.accumulatorMs = 9e18;
    loose.stunMs = NaN;
    s.combat.enemyHp = Infinity;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // Kein NaN/Infinity überlebt; HP/Mana können durch die Offline-Regeneration nach dem
    // Sanitize-Pass wieder ansteigen — entscheidend ist: endlich & ≥ 0 (kein Soft-Brick).
    expect(loaded.character.gold).toBe(0); // Infinity → Default 0
    expect(Number.isFinite(loaded.character.hp)).toBe(true);
    expect(loaded.character.hp).toBeGreaterThanOrEqual(0); // NaN beseitigt
    expect(Number.isFinite(loaded.character.mana)).toBe(true);
    expect(loaded.character.mana).toBeGreaterThanOrEqual(0); // negativ beseitigt
    expect(loaded.skills.attack?.xp).toBe(0); // negativ → 0
    // Timer-Korruptions-Klemme: seit SAVE 77 (Das Lager/Wachturm) auf das MAXIMAL MÖGLICHE
    // Offline-Fenster (8 h Basis + 3 h Wachturm-Vollausbau), nicht mehr auf die nackten 8 h — die
    // Klemme ist eine Korruptions-Schranke, die nicht mit dem eigenen Baufortschritt schrumpfen
    // darf (s. sanitizeState). Das ECHTE Gutschrift-Fenster des Spielstands klemmt separat
    // `effectiveMaxOfflineMs` in deserialize (Guard: „Wachturm hebt das Offline-Fenster" unten).
    expect(loaded.accumulatorMs).toBeLessThanOrEqual(MAX_OFFLINE_MS + CAMP_MAX_OFFLINE_BONUS_MS + PRESTIGE_MAX_OFFLINE_BONUS_MS); // claude:2026-10-30T19:01:00+01:00 — SAVE 99: + Lange Nacht
    expect(Number.isFinite(loaded.accumulatorMs)).toBe(true);
    expect(loaded.stunMs).toBe(0); // NaN → 0
    expect(Number.isFinite(loaded.combat.enemyHp)).toBe(true);
    expect(loaded.combat.enemyHp).toBeGreaterThanOrEqual(0); // Infinity beseitigt
  });

  it("clamped negative/riesige Item-Mengen und verwirft unbekannte Item-IDs", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.inventory.slots[0] = { itemId: "copper_ore", qty: -5 }; // negativ → Slot leeren
    s.inventory.slots[1] = { itemId: "copper_ore", qty: 1e15 }; // riesig → clampen
    s.inventory.slots[2] = { itemId: "voll_erfunden" as never, qty: 3 }; // unbekannt → verwerfen
    s.bank = { copper_ore: -10, total_fake: 99 } as never;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.slots[0]).toBeNull(); // negativ entfernt
    expect(loaded.inventory.slots[1]?.qty).toBe(1_000_000_000); // auf QTY_HARD_CAP geclamped
    expect(loaded.inventory.slots[2]).toBeNull(); // unbekanntes Item verworfen
    expect(loaded.bank.copper_ore).toBeUndefined(); // negativ → kein Eintrag
    expect((loaded.bank as Record<string, number>).total_fake).toBeUndefined(); // unbekannt verworfen
  });

  it("verwirft unbekannte Achievement-IDs, behält bekannte", () => {
    const s = createGame({ name: "X" }, content, 1);
    const realId = content.achievements[0]!.id;
    s.achievements = [realId, "ach_voll_erfunden", realId]; // inkl. Duplikat
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.achievements).toContain(realId);
    expect(loaded.achievements).not.toContain("ach_voll_erfunden");
    expect(loaded.achievements.filter((a) => a === realId).length).toBe(1); // dedupliziert
  });

  it("legt Equipment in einem falschen Slot defensiv ab und RETTET es in die Bank (Slot-Spoofing)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Ein Item mit definiertem Slot in einen FALSCHEN Slot schreiben (Save-Edit-Spoofing).
    const weapon = Object.values(content.items).find((i) => i.slot === "mainhand");
    if (weapon) {
      s.character.equipment.helmet = weapon.id; // Waffe im Helm-Slot
      const json = serialize(s, 1000);
      const { state: loaded } = loadOk(json, content, 1000);
      expect(loaded.character.equipment.helmet).toBeNull();
      // Kein Datenverlust: das Item wandert in die Bank statt zu verschwinden.
      expect(loaded.bank[weapon.id]).toBe(1);
    }
  });

  // ── Mehrfach-Slot-Aliase (ring2/tool1/tool2) + Equip-Rettung ───────────────
  // P1-Datenverlust-Fix (ui-audit-Fund): sanitizeState nullte jeden Slot mit item.slot !== slot.
  // Ringe deklarieren kanonisch slot:"ring1" — ein legitim in ring2 getragener Ring wurde dadurch
  // bei JEDEM Laden still vernichtet. Die Prüfung spiegelt jetzt exakt die equipment.ts-Regeln.

  it("Regression P1: zwei Ringe (ring1+ring2) überleben Save→Load — kein stilles Vernichten", () => {
    const s = createGame({ name: "X" }, content, 1);
    const ring = Object.values(content.items).find((i) => i.slot === "ring1" && !i.requirements);
    expect(ring).toBeDefined(); // Content muss mindestens einen anforderungsfreien Ring liefern
    addItem(s.inventory, content, ring!.id, 2);
    // Exakt der Engine-Pfad: equipItem weicht beim zweiten Ring auf ring2 aus.
    expect(equipItem(s, content, ring!.id).ok).toBe(true);
    expect(equipItem(s, content, ring!.id).ok).toBe(true);
    expect(s.character.equipment.ring1).toBe(ring!.id);
    expect(s.character.equipment.ring2).toBe(ring!.id);

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.equipment.ring1).toBe(ring!.id);
    expect(loaded.character.equipment.ring2).toBe(ring!.id); // vorher: bei jedem Laden vernichtet
    // Roundtrip-Idempotenz: erneut speichern+laden ändert nichts mehr (bit-gleicher Save).
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(serialize(again, 3000)).toBe(serialize(loaded, 3000));
    expect(again.character.equipment.ring1).toBe(ring!.id);
    expect(again.character.equipment.ring2).toBe(ring!.id);
  });

  it("Werkzeuge in tool1+tool2+tool3 überleben Save→Load (equipTool-Regel gespiegelt)", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    addItem(s.inventory, content, "crude_fishing_rod", 1);
    addItem(s.inventory, content, "crude_sickle", 1);
    expect(equipItem(s, content, "bronze_pickaxe").ok).toBe(true);
    expect(equipItem(s, content, "crude_fishing_rod").ok).toBe(true);
    expect(equipItem(s, content, "crude_sickle").ok).toBe(true);
    expect(s.character.equipment.tool1).toBe("bronze_pickaxe");
    expect(s.character.equipment.tool2).toBe("crude_fishing_rod");
    expect(s.character.equipment.tool3).toBe("crude_sickle");

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.equipment.tool1).toBe("bronze_pickaxe");
    expect(loaded.character.equipment.tool2).toBe("crude_fishing_rod");
    expect(loaded.character.equipment.tool3).toBe("crude_sickle");
  });

  it("dritter Werkzeug-Slot (tool3): Dual-Use-Item (Axt) überlebt Save→Load, Roundtrip idempotent", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    addItem(s.inventory, content, "crude_fishing_rod", 1);
    addItem(s.inventory, content, "copper_axe", 1);
    equipItem(s, content, "bronze_pickaxe"); // tool1
    equipItem(s, content, "crude_fishing_rod"); // tool2
    expect(equipTool(s, content, "copper_axe").ok).toBe(true); // tool3 (Dual-Use, type "equipment")
    expect(s.character.equipment.tool3).toBe("copper_axe");

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    // Regression: sanitizeStates alter `item.type === "tool"`-Check hätte die Axt (type "equipment")
    // hier fälschlich als „im falschen Slot" erkannt und in die Bank „gerettet" (stiller Datenverlust
    // bei JEDEM Load). Der Fix prüft `!!item.tool` — genau equipTools eigene Regel.
    expect(loaded.character.equipment.tool3).toBe("copper_axe");
    expect((loaded.bank as Record<string, number>).copper_axe).toBeUndefined();

    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(serialize(again, 3000)).toBe(serialize(loaded, 3000));
    expect(again.character.equipment.tool3).toBe("copper_axe");
  });

  it("Alt-Save ohne tool3-Key (additiver Slot) lädt sauber — equipment.tool3 defaultet auf null", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    equipItem(s, content, "bronze_pickaxe");
    const json = serialize(s, 1000);
    // Alt-Save simulieren: equipment-Objekt trägt (wie vor diesem Bump) keinen tool3-Key.
    const raw = JSON.parse(json) as { state: { character: { equipment: Record<string, unknown> } } };
    delete raw.state.character.equipment.tool3;
    const patched = JSON.stringify(raw);

    const { state: loaded } = loadOk(patched, content, 1000);
    expect(loaded.character.equipment.tool3).toBeNull();
    expect(loaded.character.equipment.tool1).toBe("bronze_pickaxe"); // unberührt
  });

  it("echter Korrupt-Fall: Waffe im ring2-Slot wird bereinigt UND in die Bank gerettet", () => {
    const s = createGame({ name: "X" }, content, 1);
    const weapon = Object.values(content.items).find((i) => i.slot === "mainhand")!;
    expect(weapon).toBeDefined();
    const bankBefore = s.bank[weapon.id] ?? 0;
    (s.character.equipment as Record<string, string | null>).ring2 = weapon.id; // Save-Edit/Korruption
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.equipment.ring2).toBeNull(); // Slot bereinigt …
    expect(loaded.bank[weapon.id]).toBe(bankBefore + 1); // … Item gerettet statt vernichtet
  });

  it("Korrupt-Fall mit Instanz: modifizierte Instanz im falschen Slot wandert in den Gear-Vault", () => {
    const s = createGame({ name: "X" }, content, 1);
    // iron_platebody (slot body) samt Affix-Instanz in den Helm-Slot spoofen.
    s.character.equipment.helmet = "iron_platebody";
    s.character.equippedInstances.helmet = {
      instanceId: "inst_wrong_slot",
      baseItemId: "iron_platebody",
      affixes: [{ affixId: "affix_test", tier: 2 }],
    };
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.equipment.helmet).toBeNull();
    expect(loaded.character.equippedInstances.helmet).toBeUndefined();
    // Instanz samt Affix gerettet — und NICHT zusätzlich als plain Stück in der Bank (kein Duplikat).
    const rescued = loaded.bankInstances.find((i) => i.instanceId === "inst_wrong_slot");
    expect(rescued?.affixes).toEqual([{ affixId: "affix_test", tier: 2 }]);
    expect(loaded.bank.iron_platebody).toBeUndefined();
  });

  it("unbekannte Equipment-ID wird weiterhin ersatzlos genullt (nichts zu retten)", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s.character.equipment as Record<string, string | null>).ring2 = "voll_erfunden";
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.equipment.ring2).toBeNull();
    expect((loaded.bank as Record<string, number>).voll_erfunden).toBeUndefined();
  });

  it("gibt bei kaputtem/manipuliertem Save null zurück statt zu crashen", () => {
    expect(deserialize("nicht json {{{", content, 1000)).toBeNull();
    expect(deserialize("42", content, 1000)).toBeNull(); // valides JSON, aber kein Save-Objekt
    expect(deserialize('{"version":29}', content, 1000)).toBeNull(); // ohne state
    expect(deserialize("null", content, 1000)).toBeNull();
  });

  it("lässt einen legitimen Save vollständig unverändert durch (Sanitize ist no-op)", () => {
    const state = gameWithProgress();
    const now = 1_000_000;
    const json = serialize(state, now);
    const { state: loaded } = loadOk(json, content, now);
    expect(loaded).toEqual(state); // bit-genau gleich, keine ungewollten Korrekturen
  });

  // ── Farming-Plots (SAVE_VERSION 33 → 34) ──────────────────────────────────

  /** Content mit injiziertem Crop-Katalog (content-dev liefert den echten in Phase 2). */
  function contentWithCrops(): ContentDB {
    const crop: CropDef = {
      id: "test_crop",
      name: "Test Crop",
      seedItem: "copper_ore",
      yieldItem: "copper_ore",
      yieldMin: 8,
      yieldMax: 8,
      levelRequired: 1,
      growMs: 600_000,
      xp: 24,
      tier: 1,
    };
    return { ...content, crops: { test_crop: crop } };
  }

  it("default-fillt farmPlots für Alt-Saves ohne das Feld (v33 → v34)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 33;
    delete (s as Partial<typeof s>).farmPlots;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.farmPlots).toHaveLength(FARM_PLOT_SLOTS); // claude:2026-10-30T19:01:00+01:00 — SAVE 99: feste Länge 12
    for (const p of loaded.farmPlots) {
      expect(p.cropId).toBeNull();
      expect(p.plantedAtMs).toBe(0);
      expect(p.autoReplant).toBe(true);
      expect(p.readyYield).toBe(0);
      expect(p.readyItem).toBeNull();
    }
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  // ── Thieving-Risiko-Modus (SAVE_VERSION 34 → 35) ──────────────────────────

  it("default-setzt thievingRisk auf careful für Alt-Saves ohne das Feld (v34 → v35)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 34;
    delete (s as Partial<typeof s>).thievingRisk;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.thievingRisk).toBe("careful");
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("sanitize korrigiert einen ungültigen thievingRisk-Wert auf careful", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s as { thievingRisk: unknown }).thievingRisk = "reckless"; // unbekannter Modus
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.thievingRisk).toBe("careful");
  });

  it("erhält einen gültigen bold-Modus über einen Save-Round-Trip", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.thievingRisk = "bold";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.thievingRisk).toBe("bold");
  });

  // ── Entfernte Item-IDs generisch strippen (Glyphs/Scrolls raus, consumables-enchantments-spec §4.4) ──
  // Kein SAVE_VERSION-Bump: sanitizeState verwirft JEDE ID ∉ content.items aus allen Item-Trägern
  // (inventory.slots/bagSlots, bank, aktive Buffs, food). content-dev löscht die 10 Glyph/Scroll-Items;
  // dieser generische Strip fängt Alt-Saves ab, die sie noch tragen. Test simuliert die Löschung über
  // einen Content-Klon OHNE die IDs (robust, egal ob content-dev sie schon entfernt hat).
  it("strippt entfernte Glyph/Scroll-IDs beim Laden aus allen Item-Trägern (sanitize, kein SAVE-Bump)", () => {
    const removed = [
      "glyph_of_might",
      "glyph_of_warding",
      "glyph_of_precision",
      "glyph_of_ruin",
      "scroll_of_overload",
      "scroll_of_aegis",
    ];
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save trägt die (später entfernten) IDs in JEDEM Item-Träger:
    s.inventory.slots[0] = { itemId: "glyph_of_might", qty: 3 };
    s.inventory.bagSlots = ["glyph_of_warding"];
    s.bank["scroll_of_overload"] = 5;
    s.bank["rusty_sword"] = 1; // Kontrolle: gültiges Item bleibt erhalten
    s.character.buffs = [{ itemId: "glyph_of_precision", remainingMs: 5_000 }];
    s.character.food = "glyph_of_ruin";
    const json = serialize(s, 1000);

    // Content-Klon OHNE die entfernten IDs (simuliert content-devs Löschung).
    const items = { ...content.items } as Record<string, unknown>;
    for (const id of removed) delete items[id];
    const trimmed = { ...content, items } as unknown as ContentDB;

    const { state: loaded } = loadOk(json, trimmed, 1000);
    // inventory.slots: kein Slot trägt mehr eine entfernte ID.
    expect(loaded.inventory.slots.some((sl) => sl && removed.includes(sl.itemId))).toBe(false);
    // bagSlots: seit SAVE_VERSION 56 (Taschenslot-System entfernt) IMMER leer.
    expect(loaded.inventory.bagSlots).toEqual([]);
    // bank: entfernte Keys weg, gültiges Item bleibt.
    for (const id of removed) expect(loaded.bank[id]).toBeUndefined();
    expect(loaded.bank["rusty_sword"]).toBe(1);
    // aktive Buffs: entfernte Item-Buffs gedroppt.
    expect(loaded.character.buffs.some((b) => removed.includes(b.itemId))).toBe(false);
    // food: entfernte ID → null.
    expect(loaded.character.food).toBeNull();
  });

  // ── Slayer-System (SAVE_VERSION 35 → 36) ──────────────────────────────────

  it("default-initialisiert Slayer-Felder für Alt-Saves (v35 → v36)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 35;
    delete (s as Partial<typeof s>).slayerTask;
    delete (s as Partial<typeof s>).slayerPoints;
    delete (s as Partial<typeof s>).slayerTasksCompleted;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.slayerTask).toBeNull();
    expect(loaded.slayerPoints).toBe(0);
    expect(loaded.slayerTasksCompleted).toBe(0);
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("sanitize verwirft einen Slayer-Task mit unbekanntem Master/Monster", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.slayerTask = {
      masterId: "does_not_exist",
      monsterId: "also_not_real",
      isTower: false,
      required: 5,
      progress: 2,
      xpReward: 10,
      pointReward: 5,
    };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.slayerTask).toBeNull();
  });

  it("clamped manipulierte Slayer-Punkte/Completed beim Laden", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s as { slayerPoints: unknown }).slayerPoints = Number.NaN;
    (s as { slayerTasksCompleted: unknown }).slayerTasksCompleted = -7;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.slayerPoints).toBe(0);
    expect(loaded.slayerTasksCompleted).toBe(0);
  });

  // ── Munitions-System entfernt (SAVE_VERSION 56 → 57, Task #286) ───────────

  it("v56-Save mit ausgerüsteter Munition: Köcher verfällt, Verkaufswert wird als Gold gutgeschrieben, ammo-Key verschwindet", () => {
    // Synthetischer Legacy-Pfeil, damit der Guard Stage B (Löschung der echten *_arrow-Items aus
    // dem Katalog) überlebt. value 4 → Verkaufswert je Stück = floor(4 × SELL_FRACTION) = 2.
    // Alt-Shape mit den v56-Munitionsfeldern (existieren nicht mehr im ItemDef-Typ) — bewusst
    // über einen Cast, denn die Migration muss echte Alt-Kataloge/Save-Stände verkraften.
    const arrow = {
      id: "legacy_mig_arrow",
      name: "Legacy-Migrationspfeil",
      type: "material",
      stackable: true,
      value: 4,
      ammo: true,
      ammoDamage: 1,
    } as unknown as ItemDef;
    const testContent: ContentDB = { ...content, items: { ...content.items, [arrow.id]: arrow } };
    const s = createGame({ name: "X" }, testContent, 1);
    s.version = 56;
    s.character.gold = 100;
    // Alt-Save-Form (v56): Köcher-Slot + Menge direkt setzen.
    (s.character.equipment as Record<string, string | null>).ammo = arrow.id;
    (s as { ammoCount?: number }).ammoCount = 123;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, testContent, 1000);
    expect(loaded.version).toBe(SAVE_VERSION);
    // (a) Munition verfällt ERSATZLOS (Chef-Entscheid 2026-07-08) — nichts landet in Inventar/Bank.
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === arrow.id)).toBe(false);
    expect(loaded.bank[arrow.id] ?? 0).toBe(0);
    // (b) faire Geste: Verkaufswert des Stacks als Gold.
    expect(loaded.character.gold).toBe(100 + 123 * Math.floor(4 * SELL_FRACTION));
    // (c) ammo-Key und ammoCount sind restlos aus dem Save-Shape verschwunden.
    expect("ammo" in loaded.character.equipment).toBe(false);
    expect("ammoCount" in loaded).toBe(false);
  });

  it("v56-Save mit UNBEKANNTER Köcher-Munition: verfällt still ohne Gold-Gutschrift, kein Crash", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 56;
    s.character.gold = 50;
    (s.character.equipment as Record<string, string | null>).ammo = "deleted_arrow_id";
    (s as { ammoCount?: number }).ammoCount = 999;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.gold).toBe(50); // unbekanntes Item → value 0 → keine Gutschrift
    expect("ammo" in loaded.character.equipment).toBe(false);
    expect("ammoCount" in loaded).toBe(false);
  });

  it("sanitize löscht einen editierten ammoCount-Alt-Key restlos (Feld existiert nicht mehr)", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s as { ammoCount?: unknown }).ammoCount = 999; // editierter Save
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect("ammoCount" in loaded).toBe(false);
  });

  it("Fletching-XP wird verlustfrei in Crafting (leatherworking) gemergt; Mastery-Keys bleiben (Stage B)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 56;
    s.skills.fletching = { xp: 5000 };
    s.skills.leatherworking = { xp: 1234 };
    // Mastery der Fletch-Aktionen bleibt bis Stage B unangetastet (die Aktionen leben noch im
    // Content; Stage B mappt sie nach Crafting und trägt den ACTION_RENAME-Eintrag ein).
    s.mastery["fletch_shafts"] = { xp: 777 };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.skills.fletching).toBeUndefined(); // Key gelöscht …
    expect(loaded.skills.leatherworking?.xp).toBe(1234 + 5000); // … XP additiv gemergt (verlustfrei)
    expect(loaded.mastery["fletch_shafts"]?.xp).toBe(777); // Mastery-Eintrag ERHALTEN
  });

  it("Fletching-Merge ohne bestehenden Crafting-Eintrag: XP wandert 1:1", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 56;
    s.skills.fletching = { xp: 4321 };
    delete s.skills.leatherworking;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.skills.fletching).toBeUndefined();
    expect(loaded.skills.leatherworking?.xp).toBe(4321);
  });

  // ── Bestiarium-Sammlungs-Fundament (SAVE_VERSION 57 → 58) ──────────────────

  it("v57→v58: discoveredItems wird aus dem IST-Bestand backfilled; monsterKills-Historie bleibt 1:1", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 57;
    // IST-Bestand über alle vier Quellen verteilen:
    addItem(s.inventory, content, "copper_ore", 5); // Inventar-Stack
    s.bank["oak_log"] = 3; // Bank
    s.character.equipment.mainhand = "bronze_sword"; // Equipment
    s.inventory.instances.push({ instanceId: "inst_m1", baseItemId: "iron_sword", affixes: [{ affixId: "affix_x", tier: 1 }] }); // Instanz-Tasche
    s.bankInstances.push({ instanceId: "inst_m2", baseItemId: "steel_sword", affixes: [{ affixId: "affix_x", tier: 1 }] }); // Gear-Vault
    s.monsterKills = { chicken: 7 }; // echte Kill-Historie (Feld existiert seit dem Bestiarium-Grundstein)
    delete (s as Partial<typeof s>).discoveredItems; // Alt-Save: Feld existiert noch nicht
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.version).toBe(SAVE_VERSION);
    for (const id of ["copper_ore", "oak_log", "bronze_sword", "iron_sword", "steel_sword"]) {
      expect(loaded.discoveredItems[id], `${id} fehlt im Backfill`).toBe(true);
    }
    expect(loaded.discoveredItems["godiron_sword"]).toBeUndefined(); // nie besessen → nicht geraten
    expect(loaded.monsterKills.chicken).toBe(7); // Historie unangetastet — ehrlich, kein Raten

    // Round-Trip-Stabilität: erneutes Speichern/Laden ändert nichts (Union idempotent/monoton).
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.discoveredItems).toEqual(loaded.discoveredItems);
    expect(again.monsterKills).toEqual(loaded.monsterKills);
  });

  it("Save-Edit-Härtung v58: unbekannte/falsy discoveredItems-Einträge und korrupte monsterKills werden bereinigt", () => {
    const s = createGame({ name: "X" }, content, 1);
    const disc = s.discoveredItems as Record<string, unknown>;
    disc["ghost_item"] = true; // unbekannte Item-ID → strippen (Präzedenz small_pouch)
    disc["copper_ore"] = "yes"; // truthy Fremdwert → auf strikt true normalisieren
    disc["oak_log"] = false; // falsy → raus (und nicht im Bestand)
    s.monsterKills = {
      chicken: 3.9, // Float → floor 3
      cow: -5, // negativ → raus
      ghost_monster: 12, // unbekannte Monster-ID → strippen
      ash_rat: Number.NaN, // NaN überlebt JSON nicht → null → raus
    } as Record<string, number>;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.discoveredItems["ghost_item"]).toBeUndefined();
    expect(loaded.discoveredItems["copper_ore"]).toBe(true);
    expect(loaded.discoveredItems["oak_log"]).toBeUndefined();
    expect(loaded.monsterKills).toEqual({ chicken: 3 });
  });

  
/** Content-Klon OHNE Meisterumhänge — für Tests der „Item existiert (noch) nicht"-Semantik
 *  (Weihe-Marker ohne Verleihung), seit die Cape-Content-Welle die echten Items liefert.
 *  Gleiches Muster wie engine/src/capes.test.ts. */
function withoutMasterCapes(): ContentDB {
  const items = { ...content.items };
  for (const skillId of Object.keys(content.skills)) delete items[masterRingItemId(skillId)];
  return { ...content, items };
}

// ── Meisterweihe-Fundament (SAVE_VERSION 58 → 59) ──────────────────────────

  it("v58→v59: bestehende 99er bekommen den Weihe-Marker rückwirkend; ceremonySeen bleibt LEER (Nachfeier)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 58;
    s.skills.mining = { xp: xpForLevel(99) }; // Alt-99er → rückwirkende Weihe
    s.skills.fishing = { xp: xpForLevel(98) }; // knapp darunter → keine Weihe
    delete (s as Partial<typeof s>).masteryCapes; // Alt-Save: Felder existieren noch nicht
    delete (s as Partial<typeof s>).capeGranted;
    delete (s as Partial<typeof s>).capeCeremonySeen;
    const json = serialize(s, 1000);

    // Klon ohne Cape-Items: dieser Test prüft die Marker-OHNE-Verleihung-Semantik (Content-Stand
    // VOR der Cape-Welle) — mit echtem Content würde die Nachreichung sofort verleihen.
    const noCapes = withoutMasterCapes();
    const { state: loaded } = loadOk(json, noCapes, 1000);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.masteryCapes).toEqual({ mining: true });
    // Zeremonie wird NACHGEFEIERT: seen bleibt leer, die UI staffelt via pendingCapeCeremonies.
    expect(loaded.capeCeremonySeen).toEqual({});
    // Cape-Item existiert (noch) nicht im Content → nur der Marker, keine Verleihung.
    expect(loaded.capeGranted).toEqual({});

    // Round-Trip-Stabilität (Marker monoton, keine Doppel-Migration).
    const again = loadOk(serialize(loaded, 2000), noCapes, 2000).state;
    expect(again.masteryCapes).toEqual(loaded.masteryCapes);
    expect(again.capeGranted).toEqual({});
  });

  it("v59-Nachreichung: sobald das ring_master_*-Item im Content existiert, verleiht der Load es GENAU EINMAL", () => {
    // Alt-99er (v58) wurde bei der Migration rückwirkend geweiht; der heutige Content liefert die
    // Meisterringe (seit SAVE 69 Ringe statt Capes) → sanitize-grantPendingCapes reicht nach.
    const ringId = masterRingItemId("mining");
    const s = createGame({ name: "X" }, content, 1);
    s.version = 58;
    s.skills.mining = { xp: xpForLevel(99) };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    const owned = (id: string): number =>
      loaded.inventory.slots.reduce((n, sl) => n + (sl?.itemId === id ? sl.qty : 0), 0) + (loaded.bank[id] ?? 0);
    expect(loaded.masteryCapes.mining).toBe(true);
    expect(loaded.capeGranted.mining).toBe(true);
    expect(owned(ringId)).toBe(1);
    expect(loaded.discoveredItems[ringId]).toBe(true); // Verleihung markiert die Entdeckung

    // Idempotent über weitere Loads: kein zweiter Ring.
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    const owned2 =
      again.inventory.slots.reduce((n, sl) => n + (sl?.itemId === ringId ? sl.qty : 0), 0) + (again.bank[ringId] ?? 0);
    expect(owned2).toBe(1);
    expect(again.capeGranted.mining).toBe(true);
  });

  it("Save-Edit-Härtung v59: unbekannte Skill-IDs/falsy Werte werden gestrippt; granted/seen ⊆ masteryCapes erzwungen", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.mining = { xp: xpForLevel(99) };
    const capes = s.masteryCapes as Record<string, unknown>;
    capes["ghost_skill"] = true; // unbekannte Skill-ID → strippen
    capes["mining"] = "yes"; // truthy Fremdwert → strikt true normalisieren
    capes["fishing"] = false; // falsy → raus
    (s.capeGranted as Record<string, unknown>)["woodcutting"] = true; // granted OHNE Weihe → raus (⊆)
    (s.capeCeremonySeen as Record<string, unknown>)["cooking"] = true; // seen OHNE Weihe → raus (⊆)
    const json = serialize(s, 1000);

    // Klon ohne Cape-Items (s.o.): die ⊆-Härtung soll isoliert vom Nachreich-Verleihpfad prüfen.
    const { state: loaded } = loadOk(json, withoutMasterCapes(), 1000);
    expect(loaded.masteryCapes).toEqual({ mining: true });
    expect(loaded.capeGranted).toEqual({});
    expect(loaded.capeCeremonySeen).toEqual({});
  });

  it("Vollendungs-Weihe: der 'completion'-Pseudo-Key überlebt den Load (kein Cape-Dupe je Load)", () => {
    const s = createGame({ name: "X" }, content, 1);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    checkMasteryCapes(s, content); // markiert alle Skill-Weihen + Vollendung, verleiht Capes
    expect(s.masteryCapes[COMPLETION_CAPE_KEY]).toBe(true);
    const capeId = masterRingItemId(COMPLETION_CAPE_KEY);
    const owned = (st: typeof s): number =>
      st.inventory.slots.reduce((n, sl) => n + (sl?.itemId === capeId ? sl.qty : 0), 0) + (st.bank[capeId] ?? 0);
    expect(owned(s)).toBe(1);
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // Der Pseudo-Key darf vom Skill-ID-Stripping NICHT entfernt werden — sonst würde
    // grantPendingCapes das Cape bei JEDEM Load erneut verleihen.
    expect(loaded.masteryCapes[COMPLETION_CAPE_KEY]).toBe(true);
    expect(loaded.capeGranted[COMPLETION_CAPE_KEY]).toBe(true);
    expect(owned(loaded)).toBe(1);
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(owned(again)).toBe(1);
  });

// ── Meister-Cape → Meister-RING (SAVE_VERSION 68 → 69) ─────────────────────

  it("v68→v69 Ring-Rename: Besitz in Inventar, Bank, Buy-Back und discoveredItems wandert auf die Ring-IDs", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 68;
    // Alt-IDs von Hand einsetzen (im v68-Content existierten sie; heute kennt der Katalog nur Ringe):
    s.inventory.slots[0] = { itemId: "cape_master_woodcutting", qty: 1 };
    s.bank["cape_master_fishing"] = 1;
    s.buyBack = [{ itemId: "cape_master_cooking", qty: 1, price: 26_250 }];
    s.discoveredItems["cape_master_mining"] = true; // entdeckt, aber NICHT besessen (verkauft)
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.slots[0]?.itemId).toBe("ring_master_woodcutting");
    expect(loaded.bank["ring_master_fishing"]).toBe(1);
    expect(loaded.bank["cape_master_fishing"]).toBeUndefined();
    expect(loaded.buyBack[0]?.itemId).toBe("ring_master_cooking"); // Rückkauf-Recht überlebt
    expect(loaded.discoveredItems["ring_master_mining"]).toBe(true); // Collection-Fortschritt monoton
    expect(loaded.discoveredItems["cape_master_mining"]).toBeUndefined();

    // Round-Trip-Stabilität (Rename + Konsolidierung sind Fixpunkte).
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.inventory.slots[0]).toEqual(loaded.inventory.slots[0]);
    expect(again.bank).toEqual(loaded.bank);
    expect(again.buyBack).toEqual(loaded.buyBack);
  });

  it("v68→v69: GETRAGENES Meister-Cape zieht in den freien Ring-Slot um (ring1, sonst ring2)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 68;
    s.skills.mining = { xp: xpForLevel(99) };
    s.masteryCapes.mining = true;
    s.capeGranted.mining = true; // reale Verleihungs-Historie → sanitize verleiht NICHT erneut
    s.character.equipment.cape = "cape_master_mining";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    const ringId = masterRingItemId("mining");
    expect(loaded.character.equipment.cape).toBeNull();
    expect(loaded.character.equipment.ring1).toBe(ringId);
    // GENAU ein Exemplar existiert (kein Dupe über den Nachreich-Pfad):
    const inInv = loaded.inventory.slots.reduce((n, sl) => n + (sl?.itemId === ringId ? sl.qty : 0), 0);
    expect(inInv + (loaded.bank[ringId] ?? 0)).toBe(0); // nur getragen
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.character.equipment.ring1).toBe(ringId);
    expect(again.character.equipment.cape).toBeNull();
  });

  it("v68→v69: sind BEIDE Ring-Slots belegt, wandert das getragene Cape ins Inventar (kein Verlust)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 68;
    s.skills.mining = { xp: xpForLevel(99) };
    s.masteryCapes.mining = true;
    s.capeGranted.mining = true;
    s.character.equipment.ring1 = "gemstone_ring";
    s.character.equipment.ring2 = "sapphire_ring";
    s.character.equipment.cape = "cape_master_mining";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    const ringId = masterRingItemId("mining");
    expect(loaded.character.equipment.cape).toBeNull();
    expect(loaded.character.equipment.ring1).toBe("gemstone_ring"); // bestehende Ringe unangetastet
    expect(loaded.character.equipment.ring2).toBe("sapphire_ring");
    const inInv = loaded.inventory.slots.reduce((n, sl) => n + (sl?.itemId === ringId ? sl.qty : 0), 0);
    expect(inInv).toBe(1);
  });

  it("v68→v69: eine getragene VERZAUBERTE Cape-Instanz zieht mitsamt Affix in den Ring-Slot um", () => {
    const affixId = Object.keys(content.affixes ?? {})[0];
    expect(affixId, "Content trägt mindestens einen Affix").toBeDefined();
    const s = createGame({ name: "X" }, content, 1);
    s.version = 68;
    s.skills.mining = { xp: xpForLevel(99) };
    s.masteryCapes.mining = true;
    s.capeGranted.mining = true;
    s.character.equipment.cape = "cape_master_mining";
    s.character.equippedInstances = {
      cape: { instanceId: "i-test-1", baseItemId: "cape_master_mining", affixes: [{ affixId: affixId!, tier: 1 }] },
    };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    const ringId = masterRingItemId("mining");
    expect(loaded.character.equipment.ring1).toBe(ringId);
    expect(loaded.character.equippedInstances.ring1?.baseItemId).toBe(ringId);
    expect(loaded.character.equippedInstances.ring1?.affixes).toEqual([{ affixId: affixId!, tier: 1 }]);
    expect(loaded.character.equippedInstances.cape).toBeUndefined();
  });

// ── Stack-Konsolidierung (SAVE_VERSION 68 → 69, MAX_STACK 999 → 9999) ──────

  it("v68→v69 Stack-Konsolidierung: 3×999 desselben Items werden EIN 2997er-Stapel, Folge-Slots leeren", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 68;
    s.inventory.slots[0] = { itemId: "copper_ore", qty: 999 };
    s.inventory.slots[1] = { itemId: "oak_log", qty: 10 }; // Fremd-Stapel bleibt unberührt
    s.inventory.slots[3] = { itemId: "copper_ore", qty: 999 };
    s.inventory.slots[5] = { itemId: "copper_ore", qty: 999 };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.inventory.slots[0]).toEqual({ itemId: "copper_ore", qty: 2997 }); // erster behält Position
    expect(loaded.inventory.slots[1]).toEqual({ itemId: "oak_log", qty: 10 });
    expect(loaded.inventory.slots[3]).toBeNull();
    expect(loaded.inventory.slots[5]).toBeNull();

    // Round-Trip: das Ergebnis ist ein Fixpunkt (kein „Weiterwandern" bei jedem Load).
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.inventory.slots).toEqual(loaded.inventory.slots);
  });

  it("Stack-Konsolidierung über dem Cap: Gesamtmenge > 9999 lässt einen vollen + einen Rest-Stapel (Fixpunkt)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 68;
    s.inventory.slots[0] = { itemId: "copper_ore", qty: 9000 };
    s.inventory.slots[2] = { itemId: "copper_ore", qty: 9000 };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // SAVE 87 (Chef-Report 31.08.2026): Alt-Saves werden beim Laden EINMALIG geradegezogen — die
    // Faecher stehen seither an ihrer echten Position, und ein v68-Save bringt gewachsene Luecken
    // mit, die der Spieler sonst zum ersten Mal saehe. Die beiden Stapel liegen deshalb jetzt in
    // Fach 0 und 1 statt 0 und 2; die Konsolidierung selbst (9999 + Rest) ist unveraendert.
    expect(loaded.inventory.slots[0]).toEqual({ itemId: "copper_ore", qty: 9999 });
    expect(loaded.inventory.slots[1]).toEqual({ itemId: "copper_ore", qty: 8001 });
    expect(loaded.inventory.slots[2]).toBeNull();
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.inventory.slots).toEqual(loaded.inventory.slots);
  });

  it("v58: neuer Spielstand markiert Starterbesitz; Kill + Loot überleben Save/Load", () => {
    const s = createGame({ name: "X", startingStyle: "melee", starterKit: true }, content, 1);
    expect(s.discoveredItems["rusty_sword"]).toBe(true); // direkt ausgerüstete Startwaffe
    expect(s.discoveredItems["cooked_shrimp"]).toBe(true); // Starter-Food
    s.monsterKills["chicken"] = 2;
    s.discoveredItems["feather"] = true;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.monsterKills.chicken).toBe(2);
    expect(loaded.discoveredItems["feather"]).toBe(true);
    expect(loaded.discoveredItems["rusty_sword"]).toBe(true);
  });

  // ── Dungeon-Einmal-Unlock (SAVE_VERSION 59 → 60, Dungeon-Rework CHEF-ENTSCHEID) ──────────

  it("v59→v60 (a): bereits geclearte Dungeons sind entsperrt (dungeonsCleared ⇒ dungeonsUnlocked)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 59;
    s.dungeonsCleared = { crypt_depths: 2, goblin_warband: 1 };
    delete (s as Partial<typeof s>).dungeonsUnlocked; // Alt-Save: Felder existieren noch nicht
    delete (s as Partial<typeof s>).lastDungeonUnlock;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.dungeonsUnlocked).toEqual({ crypt_depths: true, goblin_warband: true });
    expect(loaded.lastDungeonUnlock).toBeNull(); // kein Schlüsselfund → kein UI-Signal

    // Round-Trip-Stabilität (Invariante monoton, keine Doppel-Migration).
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.dungeonsUnlocked).toEqual(loaded.dungeonsUnlocked);
  });

  it("Härtung: Dungeon-Schlüssel im Rückkauf-Regal (Alt-Save) werden beim Load verworfen", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Die KOMPLETTE geteilte Sperr-Menge (shared BUYBACK_BANNED_ITEM_IDS = paragon_key + alle
    // 6 deprecated Story-Schlüssel, Tester-Sweep 2 T6) muss der Load-Strip verwerfen — dieselbe
    // Quelle nutzt engine/shop.ts pushBuyBack als Live-Verteidigungslinie.
    s.buyBack = [
      ...[...BUYBACK_BANNED_ITEM_IDS].map((itemId) => ({ itemId, qty: 1, price: 10 })),
      { itemId: "feather", qty: 3, price: 1 }, // legitimer Eintrag → bleibt
    ];
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.buyBack.map((e) => e.itemId)).toEqual(["feather"]);
  });

  // ── Quest-basierter Dungeon-Unlock (SAVE_VERSION 63 → 64, ceo-run-2026-07-13 Welle J) ────
  // Chef-Direktive: „Keine Dungeon keys mehr, sondern quest based unlock." Alt-Schlüssel im
  // Besitz → Bestandsschutz-Unlock + Bestände weg + VOLLE Erstattung (qty × item.value, ohne
  // den alten „1 Stück geht im Unlock auf"-Abzug und ohne SELL_FRACTION). Kein Breadcrumb —
  // der Systemwechsel migriert still.

  it("v63→v64: Alt-Schlüssel (Inventar+Bank) entsperren ihren Dungeon, werden ENTFERNT und VOLL erstattet", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 63;
    delete (s as Partial<typeof s>).lastDungeonUnlock;
    // Alt-Bestand: 2 Schlüssel im Inventar + 1 in der Bank.
    addItem(s.inventory, content, "crypt_key", 2);
    s.bank["crypt_key"] = 1;
    const goldBefore = s.character.gold;
    const json = serialize(s, 1000);

    // Zahlenbeispiel: crypt_key value 250 → 3 Stück × 250 = +750 Gold (voll, kein Abzug).
    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.dungeonsUnlocked).toEqual({ crypt_depths: true });
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === "crypt_key")).toBe(false);
    expect(loaded.bank["crypt_key"]).toBeUndefined();
    expect(loaded.character.gold).toBe(goldBefore + 3 * 250);
    expect(loaded.discoveredItems["crypt_key"]).toBe(true); // Besitz war echt — Entdeckung bleibt
    expect(loaded.lastDungeonUnlock).toBeNull(); // stille Migration: KEIN „Dungeon entsperrt!"-Signal

    // Idempotenz: der zweite Load (jetzt v64) findet keine Schlüssel mehr — kein weiteres Gold.
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.character.gold).toBe(loaded.character.gold);
    expect(again.dungeonsUnlocked).toEqual(loaded.dungeonsUnlocked);
    expect(again.lastDungeonUnlock).toBeNull();
  });

  it("v63→v64: Schlüssel zu einem BEREITS geclearten/entsperrten Dungeon werden genauso voll erstattet", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 63;
    delete (s as Partial<typeof s>).lastDungeonUnlock;
    s.dungeonsCleared = { goblin_warband: 4 }; // Load-Invariante (cleared ⇒ unlocked) greift ohnehin
    addItem(s.inventory, content, "warband_key", 2); // value 90
    const goldBefore = s.character.gold;

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.dungeonsUnlocked).toEqual({ goblin_warband: true });
    expect(loaded.character.gold).toBe(goldBefore + 2 * 90); // ALLE Stücke voll erstattet
    expect(loaded.lastDungeonUnlock).toBeNull();
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === "warband_key")).toBe(false);
  });

  it("v63→v64: geteiltes Schlüssel-Item (highland_key) entsperrt aerie UND wyvern_lair; volle Erstattung je Stück", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 63;
    delete (s as Partial<typeof s>).lastDungeonUnlock;
    addItem(s.inventory, content, "highland_key", 2); // value 700
    const goldBefore = s.character.gold;

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.dungeonsUnlocked).toEqual({ highland_aerie: true, wyvern_lair: true });
    expect(loaded.character.gold).toBe(goldBefore + 2 * 700); // kein „Unlock-Verbrauch"-Abzug mehr
    expect(loaded.lastDungeonUnlock).toBeNull();
  });

  it("v63→v64: bestehende dungeonsUnlocked-Einträge bleiben; pre-v60-Saves laufen über dieselbe Schranke", () => {
    // v60–63-Saves haben nie Schlüssel im Besitz — für sie ist die Migration ein No-op, ihre
    // Unlocks bleiben. Ein pre-v60-Save (hier v59 nachgestellt) MIT Schlüsseln läuft ebenfalls
    // über die v64-Schranke (neue Voll-Erstattung statt des alten SELL_FRACTION-Sweeps).
    const s = createGame({ name: "X" }, content, 1);
    s.version = 63;
    s.dungeonsUnlocked["idol_sanctum"] = true;
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.dungeonsUnlocked).toEqual({ idol_sanctum: true });

    const old = createGame({ name: "Y" }, content, 2);
    old.version = 59;
    delete (old as Partial<typeof old>).dungeonsUnlocked;
    delete (old as Partial<typeof old>).lastDungeonUnlock;
    addItem(old.inventory, content, "wildwood_key", 1); // value 320
    const goldBefore = old.character.gold;
    const { state: migrated } = loadOk(serialize(old, 1000), content, 1000);
    expect(migrated.dungeonsUnlocked).toEqual({ wildwood_hunt: true });
    expect(migrated.character.gold).toBe(goldBefore + 320);
    expect(migrated.inventory.slots.some((sl) => sl?.itemId === "wildwood_key")).toBe(false);
  });

  it("v64-Übergangsphase: ein v64-Save MIT (deprecated) Schlüsseln behält sie als gewöhnliche Items", () => {
    // Bis Welle K die Key-Drops aus dem Content nimmt, können Schlüssel legitim droppen — sie
    // sind gewöhnliche, verkaufbare Items; KEIN Load-Sweep zieht sie mehr ein (kein Gold-Exploit
    // über wiederholtes Laden, kein stiller Besitz-Verlust).
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "crypt_key", 2);
    const goldBefore = s.character.gold;
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === "crypt_key" && sl.qty === 2)).toBe(true);
    expect(loaded.character.gold).toBe(goldBefore);
    expect(loaded.dungeonsUnlocked).toEqual({}); // kein Grant aus Übergangs-Besitz
  });

  it("v59→v60 (2b): ein MITTEN im Run gespeicherter Alt-Save entsperrt den aktiven Dungeon (Schlüssel war schon verbraucht)", () => {
    const s = createGame({ name: "X" }, content, 3);
    // Task #345 (Chef-Entscheid 25.07.): die Kampfstufe sperrt Dungeons nicht mehr — der Start
    // braucht keine hochgesetzten Skills mehr (früher Gate 75, #338; jetzt reine Empfehlung).
    // v59-Verhalten nachstellen: Run läuft, Schlüssel wurde beim Start verbraucht (kein Besitz).
    s.dungeonsUnlocked["crypt_depths"] = true;
    expect(startDungeon(s, content, "crypt_depths")).toBe(true);
    s.version = 59;
    delete (s as Partial<typeof s>).dungeonsUnlocked;
    delete (s as Partial<typeof s>).lastDungeonUnlock;
    const savedAt = 1_000_000;
    const json = serialize(s, savedAt);

    // Gleicher Zeitpunkt (kein Offline-Catch-up): der Unlock steht SOFORT — selbst wenn der Run
    // danach offline mit einem Tod endet, bleibt der Dungeon entsperrt (aktiver Run = Beweis).
    const { state: loaded } = loadOk(json, content, savedAt);
    expect(loaded.combat.dungeonId).toBe("crypt_depths");
    expect(loaded.dungeonsUnlocked["crypt_depths"]).toBe(true);
  });

  it("Save-Edit-Härtung v60: unbekannte Dungeon-IDs/falsy raus, strikt true; cleared ⇒ unlocked geheilt; Breadcrumb gehärtet", () => {
    const s = createGame({ name: "X" }, content, 1);
    const unlocked = s.dungeonsUnlocked as Record<string, unknown>;
    unlocked["ghost_dungeon"] = true; // unbekannte Dungeon-ID → strippen
    unlocked["crypt_depths"] = "yes"; // truthy Fremdwert → strikt true
    unlocked["goblin_warband"] = false; // falsy → raus
    s.dungeonsCleared = { wildwood_hunt: 3 }; // Edit hat den Unlock „entfernt" → heilen
    (s as { lastDungeonUnlock: unknown }).lastDungeonUnlock = {
      dungeonIds: ["crypt_depths", "ghost_dungeon", 7],
      itemId: "crypt_key",
      seq: 2.7,
    };

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.dungeonsUnlocked).toEqual({ crypt_depths: true, wildwood_hunt: true });
    expect(loaded.lastDungeonUnlock).toEqual({ dungeonIds: ["crypt_depths"], itemId: "crypt_key", seq: 2 });

    // Komplett kaputter Breadcrumb → null (kein Crash, kein Geister-Signal).
    (s as { lastDungeonUnlock: unknown }).lastDungeonUnlock = { dungeonIds: ["ghost_dungeon"], itemId: "crypt_key", seq: 1 };
    const { state: loaded2 } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded2.lastDungeonUnlock).toBeNull();
  });

  it("Paragon Round-Trip: Live-Unlock (paragon_key-Fund, einziger verbliebener Schlüssel-Pfad) überlebt Save→Load unverändert", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItemOrBank(s, content, "paragon_key", 1); // Live-Pfad: Intercept → Unlock + Breadcrumb
    expect(s.dungeonsUnlocked).toEqual({ paragon_tower: true });

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.dungeonsUnlocked).toEqual({ paragon_tower: true });
    expect(loaded.lastDungeonUnlock).toEqual(s.lastDungeonUnlock);
    const again = loadOk(serialize(loaded, 1000), content, 1000).state;
    expect(again.dungeonsUnlocked).toEqual(loaded.dungeonsUnlocked);
    expect(again.lastDungeonUnlock).toEqual(loaded.lastDungeonUnlock);
  });

  it("Paragon-Sweep (Load-Invariante): paragon_key im Besitz (Save-Edit/Direktpfad) wird entfernt, entsperrt, Überschuss zum Verkaufswert erstattet", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "paragon_key", 2); // roher Direktpfad vorbei am Intercept
    s.bank["paragon_key"] = 1;
    const goldBefore = s.character.gold;
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.inventory.slots.some((sl) => sl?.itemId === "paragon_key")).toBe(false);
    expect(loaded.bank["paragon_key"]).toBeUndefined();
    expect(loaded.dungeonsUnlocked["paragon_tower"]).toBe(true);
    // 3 Stück: 1 geht im Unlock auf, 2 × floor(3000 × SELL_FRACTION) = 2 × 1500 erstattet.
    expect(loaded.character.gold).toBe(goldBefore + 2 * 1500);
    expect(loaded.discoveredItems["paragon_key"]).toBe(true);
    // Idempotenz: zweiter Load ändert nichts (kein Doppel-Refund).
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.character.gold).toBe(loaded.character.gold);
  });

  it("trimmt überlange farmPlots-Arrays auf die fixe Länge FARM_PLOT_SLOTS", () => { // claude:2026-10-30T19:01:00+01:00 — SAVE 99
    const s = createGame({ name: "X" }, content, 1);
    // 50 Plots (manipuliert/legacy) → auf 9 trimmen.
    s.farmPlots = Array.from({ length: 50 }, () => ({
      cropId: null,
      plantedAtMs: 0,
      autoReplant: true,
      readyYield: 0,
      readyItem: null,
      nextCropId: null,
    }));
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.farmPlots).toHaveLength(FARM_PLOT_SLOTS); // claude:2026-10-30T19:01:00+01:00 — SAVE 99: feste Länge 12
  });

  it("sanitize clampt plantedAtMs ≤ elapsedMs und verwirft unbekannte cropId", () => {
    const c = contentWithCrops();
    const s = createGame({ name: "X" }, c, 1);
    s.elapsedMs = 500_000;
    // Plot 0: gültige Crop, aber plantedAtMs in der ZUKUNFT → auf elapsedMs clampen.
    s.farmPlots[0] = {
      cropId: "test_crop",
      plantedAtMs: 9_000_000, // > elapsedMs
      autoReplant: true,
      readyYield: 0,
      readyItem: null,
      nextCropId: null,
    };
    // Plot 1: unbekannte Crop → leeren, plantedAtMs auf 0.
    s.farmPlots[1] = {
      cropId: "ghost_crop",
      plantedAtMs: 123_456,
      autoReplant: false,
      readyYield: 5,
      readyItem: "copper_ore",
      nextCropId: null,
    };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, c, 1000);
    expect(loaded.farmPlots[0]!.cropId).toBe("test_crop");
    expect(loaded.farmPlots[0]!.plantedAtMs).toBeLessThanOrEqual(loaded.elapsedMs);
    expect(loaded.farmPlots[1]!.cropId).toBeNull(); // unbekannte Crop verworfen
    expect(loaded.farmPlots[1]!.plantedAtMs).toBe(0);
    // readyYield/readyItem bleiben (copper_ore ist ein bekanntes Item), Plot ist nur „leer".
    expect(loaded.farmPlots[1]!.readyItem).toBe("copper_ore");
    expect(loaded.farmPlots[1]!.readyYield).toBe(5);
  });

  it("sanitize clampt activePlayMs ≤ elapsedMs (Invariante: aktive Spielzeit nie > Sim-Zeit)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.elapsedMs = 500_000;
    s.activePlayMs = 9_000_000; // manipuliert/kaputt: > elapsedMs (unmöglich, activePlayMs zählt nur live)
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.activePlayMs).toBeLessThanOrEqual(loaded.elapsedMs);
    expect(loaded.activePlayMs).toBe(loaded.elapsedMs); // exakt auf elapsedMs gekappt
  });

  it("verwirft eine wartende Ernte mit unbekanntem readyItem", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.farmPlots[0] = {
      cropId: null,
      plantedAtMs: 0,
      autoReplant: true,
      readyYield: 12,
      readyItem: "voll_erfunden",
      nextCropId: null,
    };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.farmPlots[0]!.readyItem).toBeNull();
    expect(loaded.farmPlots[0]!.readyYield).toBe(0);
  });

  // ── Folgesorte je Beet (SAVE_VERSION 81→82, Chef-GO 25.08.2026 (1.1.0),
  //    design/rezension-patch-2026-08-25.html #p12) ─────────────────────────────────────────
  /** Crop-Katalog mit ZWEI Sorten (copper_ore/copper_bar sind bekannte Items → Saat-Vertrag hält). */
  function contentWithTwoCrops(): ContentDB {
    const base = contentWithCrops();
    const second: CropDef = {
      ...base.crops!.test_crop!,
      id: "second_crop",
      name: "Second Crop",
      seedItem: "copper_bar",
      yieldItem: "copper_bar",
      growMs: 1_200_000,
    };
    return { ...base, crops: { ...base.crops, second_crop: second } };
  }

  it("v81-Alt-Save ohne nextCropId: Migration setzt auf allen Beeten explizit null (Alt-Verhalten unverändert)", () => {
    const c = contentWithTwoCrops();
    const s = createGame({ name: "X" }, c, 1);
    s.elapsedMs = 100_000;
    s.farmPlots[0] = { cropId: "test_crop", plantedAtMs: 50_000, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: null };
    const raw = JSON.parse(serialize(s, 1000)) as { version: number; state: { version: number; farmPlots: Array<Record<string, unknown>> } };
    raw.version = 81;
    raw.state.version = 81;
    for (const p of raw.state.farmPlots) delete p.nextCropId; // so sieht ein v81-Save aus
    const json = JSON.stringify(raw);
    expect(json).not.toContain("nextCropId");

    const { state: loaded } = loadOk(json, c, 1000);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.farmPlots).toHaveLength(FARM_PLOT_SLOTS); // claude:2026-10-30T19:01:00+01:00 — SAVE 99: feste Länge 12
    for (const p of loaded.farmPlots) {
      expect("nextCropId" in p).toBe(true); // explizit vorhanden, nicht nur „undefined"
      expect(p.nextCropId).toBeNull();
    }
    // Das wachsende Beet ist sonst unberührt.
    expect(loaded.farmPlots[0]!.cropId).toBe("test_crop");
    expect(loaded.farmPlots[0]!.plantedAtMs).toBe(50_000);
    // Idempotent: zweiter Load ändert nichts.
    const again = loadOk(serialize(loaded, 1000), c, 1000).state;
    expect(again.farmPlots).toEqual(loaded.farmPlots);
  });

  it("sanitize: Folgesorte bleibt (auch auf LEEREM Beet, #12.2), unbekannte Sorte und Plan == Sorte werden genullt", () => {
    const c = contentWithTwoCrops();
    const s = createGame({ name: "X" }, c, 1);
    s.elapsedMs = 100_000;
    // Beet 0: gültiger Plan auf wachsendem Beet → bleibt.
    s.farmPlots[0] = { cropId: "test_crop", plantedAtMs: 10_000, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: "second_crop" };
    // Beet 1: Plan auf LEEREM Beet (Saat fehlte zur Reife, Plan blieb stehen) → bleibt.
    s.farmPlots[1] = { cropId: null, plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: "second_crop" };
    // Beet 2: unbekannte Folgesorte → null.
    s.farmPlots[2] = { cropId: "test_crop", plantedAtMs: 10_000, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: "ghost_crop" as never };
    // Beet 3: Plan == wachsende Sorte → null (nutzlos, setNextCrop lehnt es ebenfalls ab).
    s.farmPlots[3] = { cropId: "test_crop", plantedAtMs: 10_000, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: "test_crop" };
    // Beet 4: Nicht-String (manipuliert) → null.
    s.farmPlots[4] = { cropId: "test_crop", plantedAtMs: 10_000, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: 42 as never };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, c, 1000);
    expect(loaded.farmPlots[0]!.nextCropId).toBe("second_crop");
    expect(loaded.farmPlots[1]!.cropId).toBeNull();
    expect(loaded.farmPlots[1]!.nextCropId).toBe("second_crop");
    expect(loaded.farmPlots[2]!.nextCropId).toBeNull();
    expect(loaded.farmPlots[2]!.cropId).toBe("test_crop"); // die wachsende Sorte bleibt
    expect(loaded.farmPlots[3]!.nextCropId).toBeNull();
    expect(loaded.farmPlots[4]!.nextCropId).toBeNull();
    // Round-Trip stabil.
    const again = loadOk(serialize(loaded, 1000), c, 1000).state;
    expect(again.farmPlots).toEqual(loaded.farmPlots);
  });

  it("sanitize: Folgesorte wird beim Content-Wechsel genullt, wenn ihre Sorte verschwindet (Muster cropId)", () => {
    const c2 = contentWithTwoCrops();
    const s = createGame({ name: "X" }, c2, 1);
    s.elapsedMs = 100_000;
    s.farmPlots[0] = { cropId: "test_crop", plantedAtMs: 10_000, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: "second_crop" };
    const json = serialize(s, 1000);
    // Laden gegen einen Katalog, der die Folgesorte nicht mehr kennt.
    const { state: loaded } = loadOk(json, contentWithCrops(), 1000);
    expect(loaded.farmPlots[0]!.cropId).toBe("test_crop");
    expect(loaded.farmPlots[0]!.nextCropId).toBeNull();
  });

  it("nullt eine activeActionId, die im aktuellen Content nicht (mehr) existiert", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s as { activeActionId: unknown }).activeActionId = "voll_erfundene_aktion";
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.activeActionId).toBeNull();
  });

  it("erhält eine gültige activeActionId über einen Save-Round-Trip", () => {
    const s = createGame({ name: "X" }, content, 1);
    setActiveAction(s, content, "cut_normal_tree");
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.activeActionId).toBe("cut_normal_tree");
  });

  // ── Mengen-Craft-Ziel (SAVE_VERSION 39 → 40) ──────────────────────────────

  it("default-initialisiert actionTarget auf null für Alt-Saves (v39 → v40)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 39;
    delete (s as Partial<typeof s>).actionTarget;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.actionTarget).toBeNull();
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("erhält ein aktives Mengen-Craft-Ziel über einen Save-Round-Trip", () => {
    const s = createGame({ name: "X" }, content, 1);
    setActiveAction(s, content, "cut_normal_tree", 5);
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.activeActionId).toBe("cut_normal_tree");
    expect(loaded.actionTarget).toBe(5);
  });

  it("sanitize bereinigt ein ungültiges actionTarget (Float/≤0/NaN → null bzw. floored)", () => {
    const s = createGame({ name: "X" }, content, 1);
    setActiveAction(s, content, "cut_normal_tree");
    (s as { actionTarget: unknown }).actionTarget = 7.9; // Float → floor
    const json = serialize(s, 1000);
    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.actionTarget).toBe(7);

    const s2 = createGame({ name: "X" }, content, 1);
    setActiveAction(s2, content, "cut_normal_tree");
    (s2 as { actionTarget: unknown }).actionTarget = -3; // ≤0 → unbegrenzt
    const { state: loaded2 } = loadOk(serialize(s2, 1000), content, 1000);
    expect(loaded2.actionTarget).toBeNull();
  });

  it("sanitize nullt actionTarget ohne aktive Aktion (Invariante)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.activeActionId = null;
    (s as { actionTarget: unknown }).actionTarget = 9; // Geister-Ziel ohne Aktion
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.actionTarget).toBeNull();
  });

  // ── Ausbaubare Bank-Slots (SAVE_VERSION 40 → 41) ──────────────────────────

  it("grandfathert bankSlotsPurchased für Alt-Saves (< v41) auf die alte Kapazität 100", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 40;
    delete (s as Partial<typeof s>).bankSlotsPurchased;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // Vor v41 war die Bank fix 100; der Veteran behält effektiv 100 (60 Basis + 40 geschenkt).
    expect(loaded.bankSlotsPurchased).toBe(40);
    expect(effectiveBankCapacity(loaded, content)).toBe(100);
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("frische v41-States bleiben bei 0 (60 Basis) — kein Grandfather für Neuanlagen", () => {
    // createGame liefert bereits die aktuelle SAVE_VERSION → der < 41-Grandfather darf NICHT greifen.
    const s = createGame({ name: "X" }, content, 1);
    expect(s.version).toBe(SAVE_VERSION);
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.bankSlotsPurchased).toBe(0);
    expect(effectiveBankCapacity(loaded, content)).toBe(60);
  });

  it("Regression P1: Alt-Save (v40) mit 70 Bank-Arten lädt nicht gesperrt (Kapazität ≥ 100, nicht voll)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 40;
    delete (s as Partial<typeof s>).bankSlotsPurchased;
    // 70 distinkte, im aktuellen Content bekannte Item-Arten einlagern (über der neuen Basis 60).
    const ids = Object.keys(content.items).slice(0, 70);
    expect(ids.length).toBe(70); // Content liefert genug Arten für den Testfall
    s.bank = Object.fromEntries(ids.map((id) => [id, 1]));
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // Daten verlustfrei erhalten …
    expect(Object.keys(loaded.bank).length).toBe(70);
    // … und keine rückwirkende Sperre: effektive Kapazität ≥ 100, Bank NICHT voll.
    expect(effectiveBankCapacity(loaded, content)).toBeGreaterThanOrEqual(100);
    expect(isBankFull(loaded, content)).toBe(false);
  });

  it("erhält gekaufte Bank-Slots über einen Save-Round-Trip", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.bankSlotsPurchased = 30;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.bankSlotsPurchased).toBe(30);
  });

  it("sanitize klemmt ein manipuliertes bankSlotsPurchased (NaN/negativ/über Cap → gültig)", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s as { bankSlotsPurchased: unknown }).bankSlotsPurchased = 99999; // weit über Cap
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.bankSlotsPurchased).toBe(200); // MAX_BANK_SLOTS_PURCHASED

    const s2 = createGame({ name: "X" }, content, 1);
    (s2 as { bankSlotsPurchased: unknown }).bankSlotsPurchased = -5; // negativ
    const { state: loaded2 } = loadOk(serialize(s2, 1000), content, 1000);
    expect(loaded2.bankSlotsPurchased).toBe(0);
  });

  // ── Item-Instanz-Fundament (SAVE_VERSION 37 → 38) ─────────────────────────

  it("default-initialisiert Instanz-Felder für Alt-Saves (v37 → v38)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 37;
    delete (s.character as Partial<typeof s.character>).equippedInstances;
    delete (s as Partial<typeof s>).bankInstances;
    delete (s as Partial<typeof s>).nextInstanceSeq;
    delete (s.settings as { autoSalvage?: boolean }).autoSalvage;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.equippedInstances).toEqual({});
    expect(loaded.bankInstances).toEqual([]);
    expect(loaded.nextInstanceSeq).toBe(0);
    // Auto-Salvage ist mit SAVE_VERSION 56 komplett entfernt — das Feld bleibt gelöscht.
    expect((loaded.settings as { autoSalvage?: boolean }).autoSalvage).toBeUndefined();
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  // ── RNG defensiv defaulten (Fix run5 #4) ──────────────────────────────────

  it("defaultet ein fehlendes rng-Feld beim Laden (kein Crash im Offline-advance)", () => {
    const s = createGame({ name: "X" }, content, 1);
    delete (s as Partial<typeof s>).rng; // hand-korrumpierter Save
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000 + 60_000); // advance() läuft offline
    expect(loaded.rng).toBeDefined();
    expect(typeof loaded.rng.state).toBe("number");
    expect(Number.isFinite(loaded.rng.state)).toBe(true);
  });

  it("repariert ein rng mit nicht-endlichem state statt zu vergiften/crashen", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s.rng as { state: number }).state = NaN; // JSON → null; sanitize muss defaulten
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000 + 60_000);
    expect(Number.isFinite(loaded.rng.state)).toBe(true);
  });

  it("round-trippt Item-Instanzen (Inventar, ausgerüstet, Gear-Vault)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.inventory.slots[0] = {
      itemId: "iron_platebody",
      qty: 1,
      instance: {
        instanceId: "inst_a",
        baseItemId: "iron_platebody",
        affixes: [{ affixId: "affix_test", tier: 2 }],
      },
    };
    // Ausgerüstet (Invariante: equipment[slot] === baseItemId).
    s.character.equipment.helmet = "iron_fullhelm";
    s.character.equippedInstances.helmet = {
      instanceId: "inst_b",
      baseItemId: "iron_fullhelm",
      affixes: [{ affixId: "affix_test", tier: 1 }],
    };
    // Gear-Vault.
    s.bankInstances.push({
      instanceId: "inst_c",
      baseItemId: "iron_platelegs",
      affixes: [{ affixId: "affix_test", tier: 3 }],
    });
    s.nextInstanceSeq = 5;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // v53: die Slot-Instanz wandert in die unbegrenzte Tasche `inventory.instances`, der Slot ist leer.
    expect(loaded.inventory.slots[0]).toBeNull();
    expect(loaded.inventory.instances).toHaveLength(1);
    expect(loaded.inventory.instances[0]?.instanceId).toBe("inst_a");
    expect(loaded.inventory.instances[0]?.affixes).toEqual([{ affixId: "affix_test", tier: 2 }]);
    expect(loaded.character.equippedInstances.helmet?.instanceId).toBe("inst_b");
    expect(loaded.bankInstances).toHaveLength(1);
    expect(loaded.bankInstances[0]?.instanceId).toBe("inst_c");
    expect(loaded.nextInstanceSeq).toBe(5);
  });

  it("round-trippt eine Suffix-Instanz strukturell (kein Katalog-Filter → Mod überlebt)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Suffix mit einer ID, die NICHT im (leeren) Katalog steht → muss trotzdem überleben.
    s.inventory.slots[0] = {
      itemId: "iron_platebody",
      qty: 1,
      instance: {
        instanceId: "inst_suf",
        baseItemId: "iron_platebody",
        affixes: [],
        suffix: { suffixId: "suffix_tiger", ilvl: 73, roll: 0.42 },
      },
    };
    const json = serialize(s, 1000);
    const { state: loaded } = loadOk(json, content, 1000);
    // v53: Instanz liegt nach dem Laden in der Tasche, nicht mehr im Slot.
    expect(loaded.inventory.slots[0]).toBeNull();
    const suf = loaded.inventory.instances[0]?.suffix;
    expect(suf).toEqual({ suffixId: "suffix_tiger", ilvl: 73, roll: 0.42 });
  });

  it("sanitize: verwirft Tasche-Instanz mit unbekanntem Basis-Item, degradiert modifikationslose, erzwingt die Invariante", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Slot 0: Instanz mit unbekanntem Basis-Item → migriert in die Tasche, dort ersatzlos verworfen.
    s.inventory.slots[0] = {
      itemId: "ghost_item",
      qty: 1,
      instance: {
        instanceId: "inst_x",
        baseItemId: "ghost_item",
        affixes: [{ affixId: "affix_test", tier: 1 }],
      },
    };
    // Slot 1: Instanz ohne jede Modifikation → migriert in die Tasche, zerfällt zum plain Bank-Stack.
    s.inventory.slots[1] = {
      itemId: "iron_platebody",
      qty: 1,
      instance: { instanceId: "inst_y", baseItemId: "iron_platebody", affixes: [] },
    };
    // equippedInstances mit verletzter Invariante (equipment[slot] passt nicht) → verworfen.
    s.character.equipment.body = null;
    s.character.equippedInstances.body = {
      instanceId: "inst_z",
      baseItemId: "iron_platebody",
      affixes: [{ affixId: "affix_test", tier: 1 }],
    };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    // Slots geleert (Instanzen in die Tasche gezogen); Tasche enthält nach der Bereinigung nichts mehr:
    // inst_x (unbekannte Basis) verworfen, inst_y (modifikationslos) → plain Bank-Stack.
    expect(loaded.inventory.slots[0]).toBeNull();
    expect(loaded.inventory.slots[1]).toBeNull();
    expect(loaded.inventory.instances).toHaveLength(0);
    expect(loaded.bank.iron_platebody).toBe(1);
    expect(loaded.character.equippedInstances.body).toBeUndefined();
  });

  it("sanitize: modifikationslose Vault-Instanz zerfällt zum plain Bank-Stack", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.bankInstances.push({ instanceId: "inst_empty", baseItemId: "iron_platebody", affixes: [] });
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.bankInstances).toHaveLength(0);
    expect(loaded.bank.iron_platebody).toBe(1);
  });

  // ── Buy-Back-Liste (SAVE_VERSION 53 → 54, Task #245) ──────────────────────

  it("Alt-Save (< v54) ohne buyBack lädt verlustfrei mit leerer Liste", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 53;
    delete (s as Partial<typeof s>).buyBack;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.buyBack).toEqual([]);
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("erhält Buy-Back-Einträge (Stack + Instanz) über einen Round-Trip", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.buyBack = [
      { itemId: "bronze_bar", qty: 5, price: 3 },
      {
        itemId: "bronze_sword",
        qty: 1,
        price: 20,
        instance: { instanceId: "inst_bb", baseItemId: "bronze_sword", affixes: [], suffix: { suffixId: "of_test", ilvl: 3, roll: 0.5 } },
      },
    ];
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.buyBack).toHaveLength(2);
    expect(loaded.buyBack[0]).toMatchObject({ itemId: "bronze_bar", qty: 5, price: 3 });
    expect(loaded.buyBack[1]?.instance?.instanceId).toBe("inst_bb");
    expect(loaded.buyBack[1]?.instance?.suffix?.suffixId).toBe("of_test");
    // Round-trip-stabil (erneutes Speichern/Laden ändert nichts).
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.buyBack).toEqual(loaded.buyBack);
  });

  it("sanitize: verwirft Buy-Back-Einträge mit unbekannter Item-ID und kappt auf das Limit", () => {
    const s = createGame({ name: "X" }, content, 1);
    // 1 Müll-Eintrag (unbekannte ID) + Überlänge (mehr als BUYBACK_MAX_ENTRIES gültige).
    const many = Array.from({ length: 20 }, () => ({ itemId: "bronze_bar", qty: 1, price: 3 }));
    s.buyBack = [{ itemId: "does_not_exist", qty: 1, price: 5 }, ...many] as typeof s.buyBack;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.buyBack.length).toBeLessThanOrEqual(12);
    expect(loaded.buyBack.every((e) => e.itemId === "bronze_bar")).toBe(true);
  });

  // ── Onboarding-Guide (SAVE_VERSION 44 → 45) ───────────────────────────────

  it("neuer Save trägt den aktiven Guide-Zustand round-trip-fest", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Frische Saves markieren die Versions-Touren (`featureTourV1` + `featureTourV2`) vorab als
    // gesehen → „Was ist neu"-Touren feuern nur für Alt-Saves (deren toursSeen die Keys nicht haben),
    // nicht für neue Spieler (Chef 2026-07-21; V2 = New-Haven-Rundgang 0.3.0, 2026-08-03).
    const expected = { active: true, step: 0, done: false, toursSeen: { featureTourV1: true, featureTourV2: true } };
    expect(s.onboarding).toEqual(expected);
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.onboarding).toEqual(expected);
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("Alt-Save (< v45) ohne onboarding lädt als erledigt (done, nicht aktiv) — kein Retutorial", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 44;
    delete (s as Partial<typeof s>).onboarding;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.onboarding).toEqual({ active: false, step: 0, done: true, toursSeen: {} });
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("erhält den Guide-Fortschritt (mitten im Guide) über einen Round-Trip", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.onboarding = { active: true, step: 4, done: false, toursSeen: { combat: true } };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.onboarding).toEqual({ active: true, step: 4, done: false, toursSeen: { combat: true } });
  });

  it("v61→v62: Alt-Save ohne toursSeen bekommt eine leere Map; Fremdwerte werden gehärtet", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 61;
    delete (s.onboarding as Partial<typeof s.onboarding>).toursSeen; // Alt-Save: Feld existiert nicht
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.onboarding.toursSeen).toEqual({});

    // Save-Edit-Härtung: nur strikte true-Einträge mit sinnvollen String-Keys überleben.
    (loaded.onboarding.toursSeen as Record<string, unknown>)["shop"] = "yes";
    (loaded.onboarding.toursSeen as Record<string, unknown>)["bank"] = false;
    const again = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(again.onboarding.toursSeen).toEqual({ shop: true });
  });

  it("sanitize normalisiert ein manipuliertes onboarding (NaN/negativ/Float step, non-bool → gültig)", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s as { onboarding: unknown }).onboarding = { active: "yes", step: -3.7, done: 1 };
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.onboarding).toEqual({ active: false, step: 0, done: false, toursSeen: {} });

    const s2 = createGame({ name: "X" }, content, 1);
    (s2 as { onboarding: unknown }).onboarding = { active: true, step: 7.9, done: true };
    const { state: loaded2 } = loadOk(serialize(s2, 1000), content, 1000);
    expect(loaded2.onboarding).toEqual({ active: true, step: 7, done: true, toursSeen: {} });
  });

  // ── Stat-Squish ÷10 (SAVE_VERSION 45 → 46) ────────────────────────────────

  it("Alt-Save (v45): character.hp wird ×0.1 skaliert; Mana bleibt unskaliert", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 45;
    // Realistisches v45-Fixture: Attribute liegen auf der ALTEN Skala (Basis 5) — die
    // v47-Input-Squish-Migration halbiert sie beim Laden (sonst würde das frische 2.5er-Set
    // doppelt geteilt und das maxHp fiele unter das erwartete hp).
    for (const id of ATTRIBUTE_IDS) s.character.baseAttributes[id] = 5;
    s.character.hp = 100; // alter L1-HP-Stand (Skala vor dem Squish)
    s.character.mana = 65; // Mana bleibt UNskaliert (Spec §3.4)

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.hp).toBe(10); // 100 → 10 (×0.1), unter dem neuen maxHp → kein Clamp
    expect(loaded.character.mana).toBe(65);
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it("Alt-Save (v45) mit übergroßem hp (Endgame 3600) wird nach ×0.1 aufs neue maxHp geklemmt", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 45;
    for (const id of ATTRIBUTE_IDS) s.character.baseAttributes[id] = 5; // alte Attributskala (v45)
    s.character.hp = 3600; // alter Endgame-Pool — ×0.1 = 360 liegt weit über dem L1-maxHp

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.hp).toBe(computeStats(loaded, content).maxHp); // sanitize-Clamp
    expect(loaded.character.hp).toBeLessThan(360);
  });

  it("Alt-Save (v45) mitten im Kampf: enemyHp/DoT-Magnituden/Pet-Schild ×0.1, shock-Chance bleibt", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 45;
    for (const id of ATTRIBUTE_IDS) s.character.baseAttributes[id] = 5; // alte Attributskala (v45)
    s.character.hp = 100;
    s.combat.monsterId = "goblin";
    s.combat.enemyHp = 150; // altes goblin-maxHp
    s.combat.playerEffects.push({ type: "burn", remainingMs: 5_000, magnitude: 5 }); // DoT (HP/s) → ×0.1
    s.combat.enemyEffects.push({ type: "shock", remainingMs: 4_000, magnitude: 0.25 }); // CHANCE → bleibt
    s.combat.petAbility.shieldHp = 40; // HP-Betrag → ×0.1

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.combat.enemyHp).toBe(15);
    expect(loaded.combat.playerEffects[0]).toMatchObject({ type: "burn", magnitude: 0.5 });
    expect(loaded.combat.enemyEffects[0]).toMatchObject({ type: "shock", magnitude: 0.25 });
    expect(loaded.combat.petAbility.shieldHp).toBe(4);
  });

  it("Squish-Migration ist idempotent: ein bereits migrierter Save (v46) wird NICHT erneut skaliert", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 45;
    for (const id of ATTRIBUTE_IDS) s.character.baseAttributes[id] = 5; // alte Attributskala (v45)
    s.character.hp = 80; // → 8 nach der Migration
    s.combat.monsterId = "goblin";
    s.combat.enemyHp = 150;

    const once = loadOk(serialize(s, 1000), content, 1000).state;
    expect(once.character.hp).toBe(8);
    expect(once.combat.enemyHp).toBe(15);

    const twice = loadOk(serialize(once, 2000), content, 2000).state;
    expect(twice.character.hp).toBe(8); // kein zweites ×0.1
    expect(twice.combat.enemyHp).toBe(15);
  });

  it("sanitize klemmt hp > maxHp auch ohne Versions-Migration (manipulierter v46-Save)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.hp = 9999; // aktuelle Version, aber überhöhtes hp

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.hp).toBe(computeStats(loaded, content).maxHp);
    expect(loaded.character.hp).toBeLessThan(100);
  });

  // ── Attribut-Input-Squish a=1/2 (SAVE_VERSION 46 → 47) + Ganzzahl-Revert (47 → 48) ──

  it("Alt-Save (v46): baseAttributes landen über v47 (×0.5) + v48 (Ganzzahl-Revert) auf 3", () => {
    const fresh = createGame({ name: "X" }, content, 1);
    const freshMaxHp = computeStats(fresh, content).maxHp; // Referenz auf der aktuellen Skala

    const s = createGame({ name: "X" }, content, 1);
    s.version = 46;
    for (const id of ATTRIBUTE_IDS) s.character.baseAttributes[id] = 5; // alte Skala (v46)
    s.character.hp = 3; // unter maxHp — die Attribut-Migrationen skalieren KEINE HP

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    // Kette: 5 → (v47) 2.5 → (v48) 3 + max(0, round(2.5 − 2.5)) = 3 — wie ein frischer Charakter.
    for (const id of ATTRIBUTE_IDS) expect(loaded.character.baseAttributes[id]).toBe(3);
    expect(computeStats(loaded, content).maxHp).toBe(freshMaxHp); // gleiche Basis wie frisch
    expect(loaded.character.hp).toBe(3);
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  // ── Itemization 2.0 §1 — Ganzzahl-Revert (SAVE_VERSION 47 → 48, itemization-2-spec §1.4) ──

  it("Alt-Save (v47): baseAttributes 2.5 → 3; Creation-Seed-Reste (0.5-Raster) runden auf ganze Punkte", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 47;
    // Live-Spieler ohne Seed: exakt 2.5. Mit Seed (v47-Ära): 2.5 + Rohpunkte·0.5.
    for (const id of ATTRIBUTE_IDS) s.character.baseAttributes[id] = 2.5;
    s.character.baseAttributes.str = 4.0; // Seed 3 (2.5 + 1.5) → 3 + round(1.5) = 5
    s.character.baseAttributes.dex = 5.5; // Seed 6 (2.5 + 3.0) → 3 + round(3.0) = 6

    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.baseAttributes.con).toBe(3); // 2.5 → 3 (Live-Spieler)
    expect(loaded.character.baseAttributes.str).toBe(5);
    expect(loaded.character.baseAttributes.dex).toBe(6);
    for (const id of ATTRIBUTE_IDS) {
      expect(Number.isInteger(loaded.character.baseAttributes[id])).toBe(true); // ganzzahlig
    }
    expect(loaded.version).toBe(SAVE_VERSION);

    // Idempotent: erneutes Laden (jetzt v48) hebt NICHT noch einmal an.
    const twice = loadOk(serialize(loaded, 2000), content, 2000).state;
    expect(twice.character.baseAttributes.con).toBe(3);
    expect(twice.character.baseAttributes.str).toBe(5);
  });

  // ── Kill-Cooldown (Chef-Feature „Kampf entschleunigen"): Combat-Felder über Save/Load ──

  it("Kill-Cooldown überlebt Save→Load (Sweep6 T7-F1); lastKill/encounterXp bleiben transient", () => {
    // Vertrag: „Der Kill-Cooldown gilt IMMER" (combat.ts stopCombat/startCombat) schließt seit
    // Sweep6 T7-F1 auch den Load-Pfad ein — vorher übersprang jeder Reload bis zu KILL_COOLDOWN_MS
    // Kampfpause (Save-Scumming-Lücke + Design-Widerspruch). Additiv-optional, KEIN SAVE_VERSION-
    // Bump: Alt-Saves ohne das Feld laden als undefined (= kein Cooldown, wie bisher). Die reine
    // UI-Summary `lastKill` und der XP-Akkumulator `encounterXp` bleiben bewusst transient.
    const s = createGame({ name: "X" }, content, 1);
    const goblin = content.monsters.goblin!;
    // Kampf-Gate-Load-Invariante (T10): goblin liegt hinter chronicle_03 — dieser Test prüft den
    // Kill-Cooldown, nicht das Gating → Bestandsschutz-Grant wie bei einem legitimen Alt-Save.
    s.legacyZoneGrants["borderlands"] = true;
    s.combat.monsterId = "goblin";
    s.combat.enemyHp = goblin.maxHp;
    s.combat.cooldownRemainingMs = 1_500; // Rest-Cooldown läuft
    s.combat.lastKill = {
      monsterId: "goblin",
      xpBySkill: { attack: 12.5, vitality: 3 },
      loot: [{ itemId: "bones", qty: 1 }],
      gold: 7,
      expiresInMs: 1_500,
    };
    s.combat.encounterXp = { attack: 3.25 };

    const { state: loaded, offlineMs } = loadOk(serialize(s, 1_000), content, 1_000);
    expect(offlineMs).toBe(0); // kein Offline-Catch-up — der Load-Pfad selbst entscheidet

    expect(loaded.combat.cooldownRemainingMs).toBe(1_500); // Rest-Cooldown round-trippt
    expect(loaded.combat.lastKill).toBeUndefined();
    expect(loaded.combat.encounterXp).toBeUndefined();
    // Der eigentliche Kampf-Zustand überlebt dagegen unverändert.
    expect(loaded.combat.monsterId).toBe("goblin");
    expect(loaded.combat.enemyHp).toBe(goblin.maxHp);
  });

  it("Kill-Cooldown: Alt-Save ohne Feld ⇒ undefined; Save-Edit wird geklemmt (Cap/NaN/negativ)", () => {
    // Alt-Save (Feld fehlt) → kein Cooldown „aus dem Nichts".
    const legacy = createGame({ name: "X" }, content, 1);
    legacy.legacyZoneGrants["borderlands"] = true; // T10-Gate-Invariante: legitimer Alt-Kampf
    legacy.combat.monsterId = "goblin";
    legacy.combat.enemyHp = content.monsters.goblin!.maxHp;
    delete legacy.combat.cooldownRemainingMs;
    expect(loadOk(serialize(legacy, 1_000), content, 1_000).state.combat.cooldownRemainingMs).toBeUndefined();

    // Save-Edit-Härtung (sanitizeState): Riesenwert würde den Kampf dauerhaft einfrieren
    // (stopCombat/startCombat übernehmen den Rest bewusst) → Cap auf KILL_COOLDOWN_MS.
    const edit = (value: number): number | undefined => {
      const g = createGame({ name: "X" }, content, 1);
      g.legacyZoneGrants["borderlands"] = true; // T10-Gate-Invariante: legitimer Alt-Kampf
      g.combat.monsterId = "goblin";
      g.combat.enemyHp = content.monsters.goblin!.maxHp;
      g.combat.cooldownRemainingMs = value;
      return loadOk(serialize(g, 1_000), content, 1_000).state.combat.cooldownRemainingMs;
    };
    expect(edit(999_999_999)).toBe(Math.max(KILL_COOLDOWN_MS, SLAYER_RETRY_RECOVERY_MS)); // claude:2026-10-31T14:21:06+01:00 — Cap deckt seit 1.4.2 die Slayer-Erholung (30 s)
    expect(edit(-500)).toBeUndefined(); // ≤0/ungültig ⇒ Feld weg (Engine-Konvention)
    expect(edit(Number.NaN)).toBeUndefined();
  });

  it("Attribut-Migrationen sind idempotent + füllen FEHLENDE Attribute ären-skalig auf (kein Doppel-Squish)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 46;
    for (const id of ATTRIBUTE_IDS) s.character.baseAttributes[id] = 5;
    // lck fehlt im Alt-Save (JSON.stringify lässt undefined-Felder weg) → Fill muss ALT-skalig
    // (5) vorbelegen, damit die v<47-Halbierung + v<48-Anhebung ihn gemeinsam mit den echten
    // Werten treffen.
    (s.character.baseAttributes as Partial<Record<(typeof ATTRIBUTE_IDS)[number], number>>).lck =
      undefined as never;

    const once = loadOk(serialize(s, 1000), content, 1000).state;
    expect(once.character.baseAttributes.str).toBe(3); // 5 → 2.5 → 3
    expect(once.character.baseAttributes.lck).toBe(3); // Fill (5, alt) → gleiche Kette

    const twice = loadOk(serialize(once, 2000), content, 2000).state;
    for (const id of ATTRIBUTE_IDS) expect(twice.character.baseAttributes[id]).toBe(3); // stabil
  });

  // ── Auto-Trank-System (SAVE_VERSION 48 → 49): character.autoPotion ─────────

  it("Alt-Save (< v49) ohne autoPotion lädt mit Default AUS und gesperrtem Auto-Buff", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.version = 48;
    delete (s.character as Partial<typeof s.character>).autoPotion;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.autoPotion).toEqual({
      healPotionId: null,
      healThreshold: 0.4,
      autoRebuffTonics: false,
      autoRebuffUnlocked: false,
    });
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  // codex:2026-08-02T16:20:00+02:00 — Bestandsschutz der v79-Migration: Ein Spieler, der den
  // früher kostenlosen Schalter aktiv hatte, verliert ihn nicht; ein inaktiver Alt-Save bleibt zu.
  it("v78 übernimmt nur bereits aktives Auto-Rebuff als freigeschaltet", () => {
    const active = createGame({ name: "X" }, content, 1);
    active.version = 78;
    delete (active.character.autoPotion as Partial<typeof active.character.autoPotion>).autoRebuffUnlocked;
    active.character.autoPotion.autoRebuffTonics = true;
    const activeLoaded = loadOk(serialize(active, 1000), content, 1000).state;
    expect(activeLoaded.character.autoPotion.autoRebuffUnlocked).toBe(true);
    expect(activeLoaded.character.autoPotion.autoRebuffTonics).toBe(true);

    const inactive = createGame({ name: "Y" }, content, 1);
    inactive.version = 78;
    delete (inactive.character.autoPotion as Partial<typeof inactive.character.autoPotion>).autoRebuffUnlocked;
    inactive.character.autoPotion.autoRebuffTonics = false;
    const inactiveLoaded = loadOk(serialize(inactive, 1000), content, 1000).state;
    expect(inactiveLoaded.character.autoPotion.autoRebuffUnlocked).toBe(false);
    expect(inactiveLoaded.character.autoPotion.autoRebuffTonics).toBe(false);
  });

  it("autoPotion überlebt einen Round-Trip verlustfrei (konfigurierter Trank + Schwelle + Rebuff)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.autoPotion = {
      healPotionId: "potion_greater_heal",
      healThreshold: 0.55,
      autoRebuffTonics: true,
      autoRebuffUnlocked: true,
    };
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.autoPotion).toEqual({
      healPotionId: "potion_greater_heal",
      healThreshold: 0.55,
      autoRebuffTonics: true,
      autoRebuffUnlocked: true,
    });
  });

  it("sanitize härtet autoPotion: unbekannter/kein-Heil-Trank → null, Schwelle geklemmt, Flag boolean", () => {
    const s = createGame({ name: "X" }, content, 1);
    (s.character as { autoPotion: unknown }).autoPotion = {
      healPotionId: "no_such_item",
      healThreshold: 7,
      autoRebuffTonics: 1,
      autoRebuffUnlocked: 1,
    };
    const { state: loaded } = loadOk(serialize(s, 1000), content, 1000);
    expect(loaded.character.autoPotion.healPotionId).toBeNull(); // unbekannte ID verworfen
    expect(loaded.character.autoPotion.healThreshold).toBe(1); // auf [0,1] geklemmt
    expect(loaded.character.autoPotion.autoRebuffTonics).toBe(false); // 1 ≠ true → strikt boolean
    expect(loaded.character.autoPotion.autoRebuffUnlocked).toBe(false); // 1 ≠ true → strikt boolean

    // Konfigurierter Nicht-Heiler (Buff-Tonikum ohne healAmount) wird ebenfalls genullt.
    const s2 = createGame({ name: "X" }, content, 1);
    s2.character.autoPotion = { healPotionId: "tonic_oxblood", healThreshold: Number.NaN, autoRebuffTonics: true, autoRebuffUnlocked: true };
    const { state: loaded2 } = loadOk(serialize(s2, 1000), content, 1000);
    expect(loaded2.character.autoPotion.healPotionId).toBeNull();
    expect(loaded2.character.autoPotion.healThreshold).toBe(0.4); // NaN → Default
    expect(loaded2.character.autoPotion.autoRebuffTonics).toBe(true);
  });

  it("sanitize behält einen rein-prozentualen Heiltrank (healPct > 0, healAmount 0/fehlt)", () => {
    // Content-Klon mit einem %maxHp-Heiltrank ohne flachen healAmount — deckt den Fall ab, dass
    // content-dev je einen prozentualen Auto-Trank shippt: er heilt via `consumableHeal` (round(
    // maxHp · healPct)), darf beim Laden also NICHT als Nicht-Heiler genullt werden.
    const base = content.items.potion_greater_heal!;
    const c: ContentDB = {
      ...content,
      items: {
        ...content.items,
        potion_pct_heal: { ...base, id: "potion_pct_heal", healAmount: 0, healPct: 0.3 },
      },
    };
    const s = createGame({ name: "X" }, c, 1);
    s.character.autoPotion = { healPotionId: "potion_pct_heal", healThreshold: 0.4, autoRebuffTonics: false, autoRebuffUnlocked: false };
    const { state: loaded } = loadOk(serialize(s, 1000), c, 1000);
    expect(loaded.character.autoPotion.healPotionId).toBe("potion_pct_heal"); // NICHT genullt
  });
});

/**
 * Offline-Tod im „Während du weg warst"-Popup (Chef-Bug 2026-07-02): Der Charakter starb offline
 * (Food leer → Tod-Abbruch per onPlayerDefeated), aber die OfflineSummary verschwieg es. Die Summary
 * meldet jetzt deaths/diedAgainst/combatStopped/combatStopReason — rein TRANSIENT (LoadResult),
 * der GameState bleibt unverändert → KEIN SAVE_VERSION-Bump.
 *
 * Killer-Rekonstruktion (onPlayerDefeated nullt monsterId/dungeonId VOR unserer Messung):
 *  - Normalkampf: der beim Speichern aktive Gegner (offline wechselt er nie — Kill respawnt denselben).
 *  - Dungeon: encounterIndex beim Speichern + stats.kills-Delta = Todes-Welle (jeder Kill rückt den
 *    Run um genau eine Welle vor; ein Clear beendet den Kampf, kein Auto-Repeat).
 */
describe("Offline-Tod & Kampf-Auto-Stopp in der OfflineSummary", () => {
  /** Schwacher Held ohne Essen im Kampf gegen `monsterId`; `poisonPerSec` erzwingt den Tod im Catch-up. */
  function doomedFighter(monsterId: string, poisonPerSec: number, seed = 2) {
    const s = createGame({ name: "X", baseAttributes: { str: 10, con: 10 } }, content, seed);
    addItem(s.inventory, content, "bronze_sword", 1);
    equipItem(s, content, "bronze_sword");
    s.character.food = null; // kein Auto-Eat → der typische Offline-Tod-Auslöser
    expect(startCombat(s, content, monsterId)).toBe(true);
    s.combat.playerEffects.push({ type: "poison", remainingMs: 600_000, magnitude: poisonPerSec });
    return s;
  }

  it("tödliches Offline-Setup → deaths=1, diedAgainst=Gegner, combatStopped/defeated (transient, nicht persistiert)", () => {
    const s = doomedFighter("chicken", 100);
    s.character.hp = 1; // stirbt am ersten DoT-Tick des Catch-ups
    const savedAt = 1_000_000;
    const json = serialize(s, savedAt);

    const { offline, state: loaded } = loadOk(json, content, savedAt + 600_000); // 10 min weg
    expect(offline.deaths).toBe(1);
    expect(offline.diedAgainst).toBe("chicken");
    expect(offline.combatStopped).toBe(true);
    expect(offline.combatStopReason).toBe("defeated");
    // Der State trägt den Tod (Zähler + harter Kampf-Abbruch, voll geheilt) …
    expect(loaded.stats.deaths).toBe(1);
    expect(loaded.combat.monsterId).toBeNull();
    expect(loaded.character.hp).toBe(computeStats(loaded, content).maxHp);
    // … aber die Summary-Felder sind TRANSIENT: sie landen nie im Save-JSON (kein SAVE_VERSION-Bump).
    const resaved = serialize(loaded, savedAt + 600_000);
    for (const key of ["diedAgainst", "combatStopped", "combatStopReason", "offlineSummary"]) {
      expect(resaved).not.toContain(key);
    }
  });

  it("Kills VOR dem Tod verwirren die Zuordnung nicht (Normalkampf: Gegner bleibt der Killer)", () => {
    const s = doomedFighter("chicken", 0, 6);
    // Langsames Gift (~20 s Überleben): der Held farmt erst ein paar Hühner, DANN stirbt er.
    const maxHp = computeStats(s, content).maxHp;
    s.combat.playerEffects[s.combat.playerEffects.length - 1]!.magnitude = Math.max(1, maxHp / 20);
    const savedAt = 1_000_000;
    const json = serialize(s, savedAt);

    const { offline, state: loaded } = loadOk(json, content, savedAt + 600_000);
    expect(loaded.stats.kills).toBeGreaterThanOrEqual(1); // es gab Kills vor dem Tod
    expect(offline.deaths).toBe(1);
    expect(offline.diedAgainst).toBe("chicken"); // trotzdem korrekt der Normalkampf-Gegner
    expect(offline.combatStopReason).toBe("defeated");
  });

  it("Gegen-Test ohne Tod (reines Skilling offline) → alle Felder bleiben leer", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 3 } }, content, 42);
    setActiveAction(s, content, "cut_normal_tree");
    const savedAt = 1_000_000;
    const json = serialize(s, savedAt);

    const { offline, state: loaded } = loadOk(json, content, savedAt + 600_000);
    expect(loaded.stats.deaths).toBe(0);
    expect(offline.deaths).toBeUndefined();
    expect(offline.diedAgainst).toBeUndefined();
    expect(offline.combatStopped).toBeUndefined();
    expect(offline.combatStopReason).toBeUndefined();
  });

  it("Fernkampf offline OHNE Munition: kein outOfAmmo-Stopp mehr (#286) — der Bogen kämpft durch", () => {
    const s = createGame({ name: "X", baseAttributes: { dex: 8, con: 10 } }, content, 5);
    s.character.equipment.mainhand = "copper_shortbow"; // feuert ohne Pfeile (Schaden eingebacken)
    // Story-Zonen-Gating (SAVE 63): goblin liegt hinter chronicle_03 — dieser Test prüft
    // Offline-Fernkampf, nicht das Gating → Bestandsschutz-Grant wie bei einem Alt-Save.
    s.legacyZoneGrants["borderlands"] = true;
    expect(startCombat(s, content, "goblin")).toBe(true);
    const savedAt = 1_000_000;
    const json = serialize(s, savedAt);

    const { offline, state: loaded } = loadOk(json, content, savedAt + 600_000);
    // Der Kampf endet höchstens durch Tod/Stalemate — NIE mehr durch Munitionsmangel.
    expect(offline.combatStopReason).not.toBe("outOfAmmo");
    expect(loaded.stats.kills).toBeGreaterThan(0); // scharfe Schüsse im Catch-up
  });

  it("Dungeon-Tod offline: Todes-Welle = encounterIndex + Kills im Catch-up (Killer exakt rekonstruiert)", () => {
    const s = createGame({ name: "X" }, content, 3);
    for (const id of ["attack", "power", "defence", "ranged", "magic_off", "magic_def", "vitality"]) {
      // Seit Task #345 kein Zutritts-Gate mehr — die 75er-Skills bleiben für die KAMPFWERTE
      // gesetzt (der Catch-up-Held muss Welle 0 mit dem ersten Schlag legen können).
      s.skills[id] = { xp: xpForLevel(75) };
    }
    s.dungeonsUnlocked["crypt_depths"] = true; // Einmal-Unlock (SAVE 60)
    expect(startDungeon(s, content, "crypt_depths")).toBe(true);
    const dungeon = content.dungeons.find((d) => d.id === "crypt_depths")!;
    // Welle 0 steht auf 1 HP → der erste Treffer im Catch-up killt sie (stats.kills-Delta = 1),
    // Welle 1 spawnt frisch; das Gift tötet den Helden, BEVOR er die volle Welle 1 legen kann.
    // playerTimerMs vorladen: der ERSTE Catch-up-Tick schlägt sofort zu (danach normale Kadenz),
    // damit das Gift den Helden nicht schon vor seinem ersten Angriff umbringt.
    s.combat.enemyHp = 1;
    s.combat.playerTimerMs = computeStats(s, content).attackIntervalMs;
    s.character.food = null;
    const maxHp = computeStats(s, content).maxHp;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 600_000, magnitude: Math.ceil(maxHp / 8) });
    const savedAt = 1_000_000;
    const json = serialize(s, savedAt);

    const { offline, state: loaded } = loadOk(json, content, savedAt + 600_000);
    expect(offline.deaths).toBe(1);
    expect(loaded.stats.kills).toBe(1); // genau Welle 0 fiel vor dem Tod
    expect(offline.diedAgainst).toBe(dungeon.encounters[1]); // gestorben an der ZWEITEN Welle
    expect(offline.combatStopReason).toBe("defeated");
    expect(loaded.combat.dungeonId).toBeNull(); // Run hart abgebrochen (Tod = harter Stopp)
  });

  // ── Rüstungs-Trinität / Ward-Pool (SAVE_VERSION 49 → 50) ──────────────────

  it("default-initialisiert character.ward auf 0 für Alt-Saves (v49 → v50)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Alt-Save (v49): Ward-Feld existierte noch nicht.
    s.version = 49;
    delete (s.character as Partial<typeof s.character>).ward;
    const json = serialize(s, 1000);

    const { state: loaded } = loadOk(json, content, 1000);
    expect(loaded.character.ward).toBe(0); // Spec §2.4: Alt-Saves → 0
    expect(loaded.version).toBe(SAVE_VERSION);
    // Idempotent: ein bereits gesetzter Stand (innerhalb maxWard) wird nicht auf 0 zurückgesetzt.
    // Armor-Iteration 2 §2 (WARD_CORE_PER_INT=0): Ward braucht jetzt Stoffgear (maxWard>0), sonst
    // klemmt sanitize korrekt auf 0 → hier eine Robe (wardCapacity) auf die Starter-Waffe injizieren.
    const cloth = createGame({ name: "C" }, contentWithStarterWard(), 1);
    cloth.character.ward = 1;
    const again = loadOk(serialize(cloth, 2000), contentWithStarterWard(), 2000).state;
    expect(again.character.ward).toBe(1);
  });

  it("erhält einen gültigen ward-Stand über einen Round-Trip und klemmt auf maxWard", () => {
    // Armor-Iteration 2 §2: WARD_CORE_PER_INT=0 ⇒ maxWard kommt NUR aus Stoffgear (kein INT-Kern).
    const c = contentWithStarterWard();
    const s = createGame({ name: "X" }, c, 1);
    const maxWard = computeStats(s, c).maxWard;
    expect(maxWard).toBeGreaterThan(0); // Stoff-Pool aus injiziertem wardCapacity

    // Teil-Stand innerhalb [0, maxWard] überlebt unverändert.
    s.character.ward = Math.min(2, maxWard);
    const kept = loadOk(serialize(s, 1000), c, 1000).state;
    expect(kept.character.ward).toBe(Math.min(2, maxWard));

    // Über maxWard hinaus (manipuliert/entwertetes Gear) → sanitize klemmt auf maxWard.
    s.character.ward = maxWard + 999;
    const clamped = loadOk(serialize(s, 1000), c, 1000).state;
    expect(clamped.character.ward).toBe(maxWard);

    // NaN/negativ → 0 (kein Durchschlag).
    (s.character as { ward: unknown }).ward = Number.NaN;
    const fixed = loadOk(serialize(s, 1000), c, 1000).state;
    expect(fixed.character.ward).toBe(0);
  });
});
