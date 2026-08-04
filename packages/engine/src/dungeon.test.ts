import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { KILL_COOLDOWN_MS, PARAGON_DUNGEON_ID, PRE_BOSS_BREATHER_MS, TICK_MS } from "@hearthforge/shared";
import type { ContentDB, DungeonDef, ItemDef, MonsterDef, SuffixDef, ZoneDef } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { createGame } from "./state";
import { advance } from "./tick";
import { combatStep, killCreditMonsterId, startCombat } from "./combat";
import { canEnterDungeon, combatLevel, dungeonKeyItemId, isDungeonUnlocked, keyUnlocksDungeons, startDungeon, unlockDungeonsForKey, unlockParagonTower } from "./dungeon";
import { equipItem } from "./equipment";
import { addItem, addItemOrBank, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { worldTaskMonsters } from "./slayer";

const CRYPT = "crypt_depths";

/** Setzt alle Kampf-Fertigkeiten auf ein Level (für Niveau-Gate). */
function setCombatLevel(s: ReturnType<typeof createTestGame>, lvl: number): void {
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(lvl) };
  }
}

describe("dungeon runs", () => {
  it("ECHTER GATE (Task #345): canEnterDungeon = NUR isDungeonUnlocked (Quest-Gate + offene Trägerzone) — die Kampfstufe sperrt NICHT mehr", () => {
    // Welle K (2026-07-13): crypt_depths trägt requiresQuest: "chronicle_10" (Kapitel 10 "Das
    // gebrochene Siegel" → Dungeon frei). Task #345 (Chef-Entscheid 2026-07-25): das frühere
    // Kampfstufen-Gate (zuletzt 75, #338) ist raus — requiredLevel ist reine Empfehlung/Anzeige.
    const s = createTestGame({ name: "X" }, content, 1); // alle Zonen offen (Bestandsschutz-Grants)
    expect(isDungeonUnlocked(s, content, CRYPT)).toBe(false); // Zone offen, Quest-Gate aber unerfüllt
    expect(canEnterDungeon(s, content, CRYPT)).toBe(false); // gesperrt WEGEN DER QUEST, nicht des Levels
    s.quests.completed.push("chronicle_10"); // erfüllt-claimbar reicht (der Story-Beat zählt)
    expect(isDungeonUnlocked(s, content, CRYPT)).toBe(true);
    expect(canEnterDungeon(s, content, CRYPT)).toBe(true); // L1-Char, Empfehlung 75 — trotzdem offen
    // Gegenprobe: gesperrte Trägerzone sperrt den Dungeon trotz erfüllter Quest weiterhin —
    // ein frisches Spiel ohne Grants hat die crypt-Zone hinter chronicle_09 (Welle D2).
    const fresh = createGame({ name: "Z" }, content, 1);
    setCombatLevel(fresh, 75);
    fresh.quests.completed.push("chronicle_10");
    expect(isDungeonUnlocked(fresh, content, CRYPT)).toBe(false); // Zone selbst noch gesperrt
    expect(canEnterDungeon(fresh, content, CRYPT)).toBe(false);
  });

  it("Task #345 Guard (rot→grün): ein UNTERLEVELTER Spieler betritt den Dungeon, sobald das Quest-Gate offen ist", () => {
    // Chef-Entscheid 2026-07-25, wörtlich: „Dungeons sollten nur durch Quests gelocked sein!
    // … Wenn Spieler sterben, merken sie es selber und trainieren." Dieser Test war ROT gegen
    // die alte Engine (combatLevel < requiredLevel ⇒ canEnterDungeon false) und ist seit dem
    // Ausbau des Level-Checks GRÜN — er pinnt die neue Semantik gegen Rückfälle fest.
    const s = createTestGame({ name: "Underdog" }, content, 1); // Zonen offen (Bestandsschutz)
    setCombatLevel(s, 30); // weit unter der Empfehlung (crypt_depths: requiredLevel 75)
    const d = content.dungeons.find((x) => x.id === CRYPT)!;
    expect(combatLevel(s)).toBeLessThan(d.requiredLevel); // wirklich unterlevelt (Empfehlungs-Skala)
    s.quests.completed.push("chronicle_10"); // Quest-Gate öffnen — das EINZIGE Gate
    expect(canEnterDungeon(s, content, CRYPT)).toBe(true);
    expect(startDungeon(s, content, CRYPT)).toBe(true); // Eintritt startet die erste Welle
    expect(s.combat.dungeonId).toBe(CRYPT);
    // Die gewollte Härte bleibt bei den Kreaturen (Stats unangetastet): stirbt er, bricht der
    // Run hart ab (onPlayerDefeated) — geprüft im Test "Tod im Dungeon bricht den Run ab".
  });

  it("startDungeon verbraucht KEINE Items (Schlüssel-System stillgelegt) und startet die erste Welle", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    // Task #345: kein setCombatLevel mehr nötig — das Level ist kein Gate, der L1-Char darf starten.
    s.dungeonsUnlocked[CRYPT] = true; // Welle K: Quest-Gate statt Schlüssel — hier reine Mechanik-Probe
    const invBefore = s.inventory.slots.filter((x) => x !== null).length;
    expect(startDungeon(s, content, CRYPT)).toBe(true);
    expect(s.inventory.slots.filter((x) => x !== null).length).toBe(invBefore); // nichts verbraucht
    expect(s.combat.dungeonId).toBe(CRYPT);
    expect(s.combat.encounterIndex).toBe(0);
    expect(s.combat.monsterId).toBe(content.dungeons.find((d) => d.id === CRYPT)!.encounters[0]);
  });

  it("ein gerüsteter Held räumt den Dungeon über alle Wellen ab und endet (Loot vergeben)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 10, con: 10 } }, content, 7);
    setCombatLevel(s, 99);
    for (const g of ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"]) {
      addItem(s.inventory, content, g, 1);
      equipItem(s, content, g);
    }
    // Guard (Sweep3): Gear ist WIRKLICH getragen (echte IDs). Sonst lehnt equipItem still ab und der
    // Held cleart NACKT — der Test prüfte dann nicht mehr den gerüsteten Clear.
    expect(s.character.equipment.mainhand).toBe("godiron_sword");
    expect(s.character.equipment.offhand).toBe("godiron_kiteshield");
    addItem(s.inventory, content, "cooked_voidray", 1000);
    s.character.food = "cooked_voidray";
    s.dungeonsUnlocked[CRYPT] = true; // Einmal-Unlock (Eintritt verbraucht keine Schlüssel mehr)
    const d = content.dungeons.find((x) => x.id === CRYPT)!;

    expect(startDungeon(s, content, CRYPT)).toBe(true);
    let guard = 0;
    while (s.combat.dungeonId && guard++ < 400) advance(s, content, 5_000);

    expect(s.combat.dungeonId, "Dungeon nicht beendet").toBe(null);
    expect(s.stats.deaths).toBe(0); // geräumt, nicht gestorben
    expect(s.combat.kills).toBeGreaterThanOrEqual(d.encounters.length); // alle Wellen besiegt
    // Regression: Clear erhöht den lebenslangen Dungeon-Zähler genau einmal (nicht pro Welle),
    // damit `dungeons_cleared`-Achievements greifen.
    expect(s.dungeonsCleared[CRYPT]).toBe(1);
  });

  it("Dungeon-Clear zählt dungeonsCleared genau 1× hoch (nicht pro Welle), Zähler akkumuliert", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 10, con: 10 } }, content, 7);
    setCombatLevel(s, 99);
    for (const g of ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"]) {
      addItem(s.inventory, content, g, 1);
      equipItem(s, content, g);
    }
    // Guard (Sweep3): Gear ist WIRKLICH getragen (echte IDs) — kein stiller Nackt-Clear.
    expect(s.character.equipment.mainhand).toBe("godiron_sword");
    expect(s.character.equipment.offhand).toBe("godiron_kiteshield");
    addItem(s.inventory, content, "cooked_voidray", 2000);
    s.character.food = "cooked_voidray";
    s.dungeonsUnlocked[CRYPT] = true; // ein Unlock trägt beliebig viele Runs (frei wiederholbar)
    expect(s.dungeonsCleared[CRYPT]).toBeUndefined(); // Start: noch nie geclear

    for (let run = 1; run <= 2; run++) {
      expect(startDungeon(s, content, CRYPT)).toBe(true);
      let guard = 0;
      while (s.combat.dungeonId && guard++ < 400) advance(s, content, 5_000);
      expect(s.combat.dungeonId, "Dungeon nicht beendet").toBe(null);
      expect(s.dungeonsCleared[CRYPT]).toBe(run); // pro Clear +1
    }
  });

  it("Tod im Dungeon bricht den Run ab (dungeonId zurückgesetzt)", () => {
    const s = createTestGame({ name: "X" }, content, 3);
    setCombatLevel(s, 75); // seit #345 kein Gate mehr — bleibt für stabile Kampfwerte gesetzt
    s.dungeonsUnlocked[CRYPT] = true;
    expect(startDungeon(s, content, CRYPT)).toBe(true);
    // Schwächster Fall: 1 HP, keine Heilung → der nächste Gegner-Treffer beendet den Run.
    s.character.food = null;
    s.character.hp = 1;
    let guard = 0;
    while (s.combat.dungeonId && guard++ < 200) advance(s, content, 3_000);
    expect(s.combat.dungeonId).toBe(null); // Run abgebrochen
  });

  it("startDungeon während des Kill-Cooldowns übernimmt den Rest: die erste Welle kämpft erst nach Ablauf", () => {
    // Regression (Kill-Cooldown-Follow-up): startDungeon baute state.combat OHNE Übernahme von
    // cooldownRemainingMs/lastKill neu auf → Kill → sofort startDungeon übersprang den Rest-Cooldown.
    const s = createTestGame({ name: "X", baseAttributes: { str: 40, con: 40 } }, content, 17);
    setCombatLevel(s, 99); // hohe Kampfwerte für den zügigen Goblin-Kill (Gate ist es seit #345 keins mehr)
    s.dungeonsUnlocked[CRYPT] = true;
    const attackEvents = () =>
      s.combat.log.filter((e) => e.kind === "hit" || e.kind === "crit" || e.kind === "miss").length;

    // Kill Nr. 1 im Normalkampf → Kill-Cooldown startet.
    startCombat(s, content, "goblin");
    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 20_000) combatStep(s, content);
    expect(s.combat.kills).toBe(1);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS);

    // 10 Ticks später (Rest-Cooldown läuft) SOFORT in den Dungeon wechseln.
    for (let t = 0; t < 10; t++) combatStep(s, content);
    const remaining = KILL_COOLDOWN_MS - 10 * TICK_MS;
    expect(s.combat.cooldownRemainingMs).toBe(remaining);
    const lastKillBefore = s.combat.lastKill;
    expect(lastKillBefore?.monsterId).toBe("goblin");

    expect(startDungeon(s, content, CRYPT)).toBe(true);
    const wave1 = content.monsters[content.dungeons.find((d) => d.id === CRYPT)!.encounters[0]!]!;
    expect(s.combat.dungeonId).toBe(CRYPT);
    expect(s.combat.monsterId).toBe(wave1.id);
    // Rest-Cooldown + Kill-Summary wandern in den Dungeon-Kampf mit (analog startCombat).
    expect(s.combat.cooldownRemainingMs).toBe(remaining);
    expect(s.combat.lastKill).toBe(lastKillBefore);

    // Bis zum Ablauf des Rests: KEINE Angriffe, Welle 1 bleibt auf voller HP.
    for (let t = 0; t < remaining / TICK_MS; t++) {
      combatStep(s, content);
      expect(attackEvents()).toBe(0);
      expect(s.combat.enemyHp).toBe(wave1.maxHp);
    }
    expect(s.combat.cooldownRemainingMs).toBeUndefined();

    // Danach beginnt der Encounter wirklich zu kämpfen.
    guard = 0;
    while (attackEvents() === 0 && guard++ < 1_000) combatStep(s, content);
    expect(attackEvents()).toBeGreaterThan(0);
  });

  it("normaler Kampf hat keinen Dungeon-Kontext (Determinismus unberührt)", () => {
    const s = createTestGame({ name: "X" }, content, 5);
    startCombat(s, content, "goblin");
    expect(s.combat.dungeonId).toBe(null);
    expect(s.combat.encounterIndex).toBe(0);
    advance(s, content, 30_000);
    expect(s.combat.dungeonId).toBe(null); // bleibt null im Normalkampf
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Dungeon-Rework Welle 2 (Spec §6 / §5.1): Chest+Breather, Erst-Clear-Gold ×2,
// dungeonOnly-Direktstart-Guard, dg_-Kill-Credit-Alias, Clear-Loot-Suffix (explizit-only).
// Synthetischer Content (Guards): die echten Werte kommen in der content-dev-Welle (§6 Welle 3).
// ───────────────────────────────────────────────────────────────────────────

/** Synthetisches Truhen-Material (volle Kontrolle, keine Content-Abhängigkeit). */
const CHEST_MAT: ItemDef = {
  id: "test_chest_mat",
  name: { en: "Test Chest Mat", de: "Test-Truhen-Material" },
  type: "material",
  stackable: true,
};

/** Trivialer Wellen-Mob: stirbt schnell, trifft nie → deterministische, sichere Runs. */
function waveMob(id: string, overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 40,
    maxHp: 4,
    damage: 0,
    accuracy: 0,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 100_000,
    xp: 0,
    gold: 0,
    loot: [],
    ...overrides,
  };
}

/** Synthetischer Dungeon (Gate 1, crypt_key als vorhandenes Schlüssel-Item). */
function testDungeon(id: string, encounters: string[], overrides: Partial<DungeonDef> = {}): DungeonDef {
  return {
    id,
    name: { en: id, de: id },
    requiredLevel: 1,
    keyItem: "crypt_key",
    keysPerRun: 1,
    encounters,
    loot: [],
    xp: 0,
    gold: 0,
    ...overrides,
  };
}

/** ContentDB-Erweiterung um synthetische Monster/Dungeons/Items (Muster drop-suffix.test.ts). */
function withSynthetic(
  monsters: MonsterDef[],
  dungeons: DungeonDef[],
  extra: Partial<ContentDB> = {},
): ContentDB {
  const monsterMap = { ...content.monsters };
  for (const m of monsters) monsterMap[m.id] = m;
  return {
    ...content,
    monsters: monsterMap,
    dungeons: [...content.dungeons, ...dungeons],
    items: { ...content.items, [CHEST_MAT.id]: CHEST_MAT },
    ...extra,
  };
}

/** Starker Held (killt Trivial-Mobs in 1–2 Schlägen); die genannten Dungeons sind entsperrt. */
function heroUnlocked(c: ContentDB, seed: number, ...dungeonIds: string[]) {
  const s = createTestGame({ name: "Delver", baseAttributes: { str: 90, dex: 90, con: 90 } }, c, seed);
  for (const id of dungeonIds) s.dungeonsUnlocked[id] = true; // Einmal-Unlock (SAVE 60)
  return s;
}

/** Kämpft bis `kills` Wellen-Kills erreicht sind (Guard gegen Endlosschleifen). */
function fightToKills(s: ReturnType<typeof createTestGame>, c: ContentDB, kills: number): void {
  let guard = 0;
  while (s.combat.kills < kills && s.combat.monsterId && guard++ < 50_000) combatStep(s, c);
  expect(s.combat.kills).toBe(kills);
}

describe("Dungeon-Rework Welle 2: Schatztruhe + Atempause vor dem Boss (§5.1.2)", () => {
  const mob = waveMob("test_wave_mob");
  const chestDungeon = testDungeon("test_chest_dungeon", ["test_wave_mob", "test_wave_mob", "test_wave_mob"], {
    chest: { loot: [{ itemId: "test_chest_mat", chance: 1, min: 2, max: 2 }] },
    // waveMeta ist rein UI-facing — hier gesetzt als Guard, dass die Engine es folgenlos ignoriert.
    waveMeta: [{ kind: "trash" }, { name: { en: "The Test Wall", de: "Die Testwand" }, kind: "elite" }, { kind: "boss" }],
    gold: 100,
  });
  const plainDungeon = testDungeon("test_plain_dungeon", ["test_wave_mob", "test_wave_mob", "test_wave_mob"], {
    gold: 100,
  });
  const c = withSynthetic([mob], [chestDungeon, plainDungeon]);

  it("Chest rollt genau 1×, NUR beim Übergang in die letzte Welle; der Cooldown ist die 8-s-Atempause", () => {
    const s = heroUnlocked(c, 11, "test_chest_dungeon");
    expect(startDungeon(s, c, "test_chest_dungeon")).toBe(true);

    // Welle 1 → 2 (NICHT letzte): keine Truhe, normaler Wellen-Cooldown.
    fightToKills(s, c, 1);
    expect(itemCount(s.inventory, "test_chest_mat")).toBe(0);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS);

    // Welle 2 → 3 (Übergang in die LETZTE Welle): Truhe rollt (2 Stück @chance 1), Atempause 8 s.
    fightToKills(s, c, 2);
    expect(itemCount(s.inventory, "test_chest_mat")).toBe(2);
    expect(s.combat.cooldownRemainingMs).toBe(PRE_BOSS_BREATHER_MS);
    expect(s.combat.log.some((e) => e.kind === "loot" && e.itemId === "test_chest_mat")).toBe(true);

    // Boss besiegt → Clear: Truhe rollte GENAU einmal (immer noch 2 Stück), Run sauber beendet.
    fightToKills(s, c, 3);
    expect(s.combat.dungeonId).toBe(null);
    expect(itemCount(s.inventory, "test_chest_mat")).toBe(2);
    expect(s.dungeonsCleared["test_chest_dungeon"]).toBe(1);
  });

  it("ohne definiertes chest: kein Truhen-Loot, kein Atempause-Cooldown (Alt-Content-Verhalten)", () => {
    const s = heroUnlocked(c, 11, "test_plain_dungeon");
    expect(startDungeon(s, c, "test_plain_dungeon")).toBe(true);
    fightToKills(s, c, 2); // Übergang in die letzte Welle
    expect(itemCount(s.inventory, "test_chest_mat")).toBe(0);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS); // KEINE 8-s-Atempause
    fightToKills(s, c, 3);
    expect(s.combat.dungeonId).toBe(null);
  });

  it("Determinismus: gleicher Seed → identischer Run (RNG-Endzustand + Gold + Truhen-Ertrag)", () => {
    const run = () => {
      const s = heroUnlocked(c, 77, "test_chest_dungeon");
      expect(startDungeon(s, c, "test_chest_dungeon")).toBe(true);
      let guard = 0;
      while (s.combat.dungeonId && guard++ < 50_000) combatStep(s, c);
      expect(s.combat.dungeonId).toBe(null);
      return s;
    };
    const a = run();
    const b = run();
    expect(b.rng.state).toBe(a.rng.state);
    expect(b.character.gold).toBe(a.character.gold);
    expect(itemCount(b.inventory, "test_chest_mat")).toBe(itemCount(a.inventory, "test_chest_mat"));
  });
});

describe("Dungeon-Rework Welle 2: Erst-Clear-Bonus (§5.1.3)", () => {
  it("der ERSTE Clear zahlt das Clear-Gold doppelt (zweiter Gold-Log-Eintrag), Folge-Clears einfach", () => {
    const mob = waveMob("test_gold_mob");
    const d = testDungeon("test_gold_dungeon", ["test_gold_mob"], { gold: 500 });
    const c = withSynthetic([mob], [d]);
    const s = heroUnlocked(c, 5, "test_gold_dungeon");

    const goldEntries = () =>
      s.combat.log.filter((e) => e.kind === "gold" && e.amount === 500).length;

    // Run 1 (Erst-Clear): 2× Clear-Gold (Mob-Gold 0 → jede 500er-Zeile stammt vom Clear).
    const before1 = s.character.gold;
    expect(startDungeon(s, c, "test_gold_dungeon")).toBe(true);
    fightToKills(s, c, 1);
    expect(s.combat.dungeonId).toBe(null);
    expect(s.character.gold - before1).toBe(1_000);
    expect(goldEntries()).toBe(2);
    expect(s.dungeonsCleared["test_gold_dungeon"]).toBe(1);

    // Run 2: exakt der alte Pfad (einfaches Clear-Gold).
    const before2 = s.character.gold;
    expect(startDungeon(s, c, "test_gold_dungeon")).toBe(true);
    fightToKills(s, c, 1);
    expect(s.combat.dungeonId).toBe(null);
    expect(s.character.gold - before2).toBe(500);
    expect(s.dungeonsCleared["test_gold_dungeon"]).toBe(2);
  });
});

describe("Dungeon-Rework Welle 2: dungeonOnly-Guard (§5.1.2/§5.3)", () => {
  const gated = waveMob("test_dgonly_mob", { dungeonOnly: true });
  const escort = waveMob("test_escort_mob");
  const d = testDungeon("test_dgonly_dungeon", ["test_escort_mob", "test_dgonly_mob"]);
  const c = withSynthetic([gated, escort], [d]);

  it("startCombat verweigert den Direktstart eines dungeonOnly-Monsters", () => {
    const s = heroUnlocked(c, 3);
    expect(startCombat(s, c, "test_dgonly_mob")).toBe(false);
    expect(s.combat.monsterId).toBe(null);
    // Gegenprobe: dasselbe Monster OHNE Flag bleibt frei anwählbar (Alt-Content unverändert).
    expect(startCombat(s, c, "test_escort_mob")).toBe(true);
    expect(s.combat.monsterId).toBe("test_escort_mob");
  });

  it("als Dungeon-Welle bleibt ein dungeonOnly-Monster kämpfbar (startDungeon + Wellen-Spawn)", () => {
    const s = heroUnlocked(c, 3, "test_dgonly_dungeon");
    expect(startDungeon(s, c, "test_dgonly_dungeon")).toBe(true);
    fightToKills(s, c, 1); // Welle 1 (frei) besiegt → Welle 2 (dungeonOnly) spawnt ungehindert
    expect(s.combat.monsterId).toBe("test_dgonly_mob");
    fightToKills(s, c, 2);
    expect(s.combat.dungeonId).toBe(null); // Run cleart normal durch
    expect(s.dungeonsCleared["test_dgonly_dungeon"]).toBe(1);
  });
});

describe("Dungeon-Rework Welle 2: dg_-Kill-Credit-Alias (§5.1.4)", () => {
  it("killCreditMonsterId strippt dg_ nur bei existierender Basis (defensiv, deterministisch)", () => {
    expect(killCreditMonsterId(content, "dg_goblin")).toBe("goblin");
    expect(killCreditMonsterId(content, "goblin")).toBe("goblin");
    expect(killCreditMonsterId(content, "dg_no_such_base_xyz")).toBe("dg_no_such_base_xyz");
  });

  it("dg_-Kill schreibt monsterKills, Slayer-Task-Credit und Collection-Log auf die Basis-Id", () => {
    const variant = waveMob("dg_goblin", {
      loot: [{ itemId: "test_chest_mat", chance: 1, min: 1, max: 1 }],
    });
    const c = withSynthetic([variant], []);
    const s = heroUnlocked(c, 9);
    // Aktiver Welt-Task auf die BASIS: der Varianten-Kill (Dungeon-Welle) muss ihn füttern.
    s.slayerTask = {
      masterId: "test_master",
      monsterId: "goblin",
      isTower: false,
      required: 5,
      progress: 0,
      xpReward: 10,
      pointReward: 1,
    };
    expect(startCombat(s, c, "dg_goblin")).toBe(true);
    fightToKills(s, c, 1);

    expect(s.monsterKills["goblin"]).toBe(1); // Kill-Zähler → Basis (Achievements/Bestiarium)
    expect(s.monsterKills["dg_goblin"]).toBeUndefined(); // KEIN Schatten-Zähler auf der Variante
    expect(s.slayerTask?.progress).toBe(1); // Slayer-Task-Credit → Basis
    expect(s.seenDrops["goblin"]).toContain("test_chest_mat"); // Collection-Log → Basis
    expect(s.seenDrops["dg_goblin"]).toBeUndefined();
  });

  it("dg_-Monster OHNE existierende Basis zählt auf sich selbst (kein Credit ins Leere)", () => {
    const orphan = waveMob("dg_orphan_mob");
    const c = withSynthetic([orphan], []);
    const s = heroUnlocked(c, 9);
    expect(startCombat(s, c, "dg_orphan_mob")).toBe(true);
    fightToKills(s, c, 1);
    expect(s.monsterKills["dg_orphan_mob"]).toBe(1);
  });
});

describe("Dungeon-Rework Welle 2: Clear-Loot-Suffix nur bei EXPLIZITER suffixChance (§5.5)", () => {
  const sword: ItemDef = {
    id: "test_dungeon_sword",
    name: { en: "Test Dungeon Sword", de: "Test-Dungeon-Schwert" },
    type: "equipment",
    slot: "mainhand",
    weaponStyle: "melee",
    stackable: false,
  };
  const bull: SuffixDef = {
    id: "suffix_bull",
    suffix: { en: "of the Bull", de: "des Stiers" },
    appliesTo: ["weapon_melee"],
    statsPerIlvl: { meleeDamage: 0.7 },
    attrPerIlvl: { str: 0.45 },
    weight: 100,
  };

  function suffixContent(suffixChance?: number): ContentDB {
    const mob = waveMob("test_suffix_mob", { level: 40 });
    const d = testDungeon("test_suffix_dungeon", ["test_suffix_mob"], {
      loot: [
        {
          itemId: "test_dungeon_sword",
          chance: 1,
          min: 1,
          max: 1,
          ...(suffixChance !== undefined ? { suffixChance } : {}),
        },
      ],
    });
    const base = withSynthetic([mob], [d]);
    return {
      ...base,
      suffixes: { suffix_bull: bull },
      items: { ...base.items, [sword.id]: sword },
    };
  }

  function clearOnce(c: ContentDB, seed: number) {
    const s = heroUnlocked(c, seed, "test_suffix_dungeon");
    expect(startDungeon(s, c, "test_suffix_dungeon")).toBe(true);
    fightToKills(s, c, 1);
    expect(s.combat.dungeonId).toBe(null);
    return s;
  }

  it("explizite suffixChance auf einer Clear-Loot-Row wird ANGEWANDT (ilvl = Boss-Level)", () => {
    // Chance 1 (gecappt 0.95) → fester Seed, deterministisch reproduzierbar: Seed 42 liefert den Suffix.
    const s = clearOnce(suffixContent(1), 42);
    const inst = s.inventory.instances.find((i) => i.suffix);
    expect(inst, "Clear-Loot-suffixChance definiert, aber nie angewandt").toBeTruthy();
    expect(inst?.baseItemId).toBe("test_dungeon_sword");
    expect(inst?.suffix?.ilvl).toBe(40); // ilvl = Level des Boss-Monsters (letzte Welle)
  });

  it("OHNE explizite suffixChance: kein Suffix-Versuch, kein Default-Fallback (Alt-Content bit-identisch)", () => {
    const s = clearOnce(suffixContent(undefined), 42);
    expect(s.inventory.instances).toHaveLength(0); // plain Stack — kein DEFAULT_DROP_SUFFIX_CHANCE
    expect(itemCount(s.inventory, "test_dungeon_sword")).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Quest-basierter Dungeon-Unlock (CHEF-DIREKTIVE 2026-07-13, ceo-run Welle J, SAVE 64):
// „Keine Dungeon keys mehr, sondern quest based unlock." Gate-Fälle von isDungeonUnlocked +
// Stilllegung des Schlüssel-Intercepts (nur der Paragonturm behält sein Einmal-Unlock-System).
// ───────────────────────────────────────────────────────────────────────────

describe("Quest-basierter Dungeon-Unlock (Welle J): isDungeonUnlocked-Fälle", () => {
  const GATE_QUEST_ID = "q_test_dungeon_gate";
  const mob = waveMob("test_gate_mob");
  const openZone: ZoneDef = { id: "test_dg_zone", name: { en: "Open Zone", de: "Offene Zone" } };
  const lockedZone: ZoneDef = {
    id: "test_locked_zone",
    name: { en: "Locked Zone", de: "Gesperrte Zone" },
    requiresQuest: "q_zone_gate_never_done",
  };
  const freeDungeon = testDungeon("test_free_dungeon", ["test_gate_mob"], { zone: "test_dg_zone" });
  const questDungeon = testDungeon("test_quest_dungeon", ["test_gate_mob"], {
    zone: "test_dg_zone",
    requiresQuest: GATE_QUEST_ID,
  });
  const zoneLockedDungeon = testDungeon("test_zonelocked_dungeon", ["test_gate_mob"], { zone: "test_locked_zone" });
  // Quest-Gate UND gesperrte Trägerzone gleichzeitig — für den Kohärenz-Fall (Zone schlägt Quest).
  const questInLockedZoneDungeon = testDungeon("test_qz_dungeon", ["test_gate_mob"], {
    zone: "test_locked_zone",
    requiresQuest: GATE_QUEST_ID,
  });
  const c = withSynthetic([mob], [freeDungeon, questDungeon, zoneLockedDungeon, questInLockedZoneDungeon], {
    zones: [...content.zones, openZone, lockedZone],
  });

  /**
   * Frischer State — `test_dg_zone` trägt kein Zonen-Gate und ist damit per isZoneUnlocked (a)
   * offen (Grants unnötig); `test_locked_zone` bleibt quest-gesperrt.
   */
  function freshState() {
    return createGame({ name: "X" }, c, 1);
  }

  it("Fallback-Regel: ohne requiresQuest ist der Dungeon offen, sobald die Trägerzone offen ist", () => {
    // Generische Engine-Regel (bleibt dauerhaft bestehen): ein Dungeon OHNE eigenes Quest-Gate
    // verhält sich wie eine freie Aktivität seiner Zone. Seit Welle K tragen alle 7 Story-Dungeons
    // ihr eigenes requiresQuest im echten Content — dieser Fall greift nur noch für gate-lose
    // Dungeons (z. B. künftige Nicht-Story-Dungeons); hier an einem synthetischen Fixture geprüft.
    const s = freshState();
    expect(isDungeonUnlocked(s, c, "test_free_dungeon")).toBe(true);
  });

  it("Quest-Gate: completed ODER claimed öffnet (Großzügigkeit wie isZoneUnlocked); ohne beides zu", () => {
    const s = freshState();
    expect(isDungeonUnlocked(s, c, "test_quest_dungeon")).toBe(false);
    s.quests.completed.push(GATE_QUEST_ID); // erfüllt-claimbar = der Story-Beat zählt
    expect(isDungeonUnlocked(s, c, "test_quest_dungeon")).toBe(true);
    const s2 = freshState();
    s2.quests.claimed.push(GATE_QUEST_ID); // eingelöst
    expect(isDungeonUnlocked(s2, c, "test_quest_dungeon")).toBe(true);
  });

  it("gesperrte Trägerzone sperrt den Dungeon — auch ohne eigenes Quest-Gate und trotz erfüllter Dungeon-Quest (Kohärenz)", () => {
    const s = freshState();
    s.quests.completed.push(GATE_QUEST_ID);
    expect(isDungeonUnlocked(s, c, "test_zonelocked_dungeon")).toBe(false); // Zone quest-gesperrt
    expect(isDungeonUnlocked(s, c, "test_qz_dungeon")).toBe(false); // Dungeon-Quest erfüllt, Zone bleibt zu
    // Gegenprobe: dieselbe erfüllte Quest öffnet den Dungeon in der OFFENEN Zone.
    expect(isDungeonUnlocked(s, c, "test_quest_dungeon")).toBe(true);
    // Legacy-Grant auf die Zone hebt die Sperre (Bestandsschutz-Pfad der Zonen, isZoneUnlocked (b)).
    s.legacyZoneGrants["test_locked_zone"] = true;
    expect(isDungeonUnlocked(s, c, "test_zonelocked_dungeon")).toBe(true);
    expect(isDungeonUnlocked(s, c, "test_qz_dungeon")).toBe(true);
  });

  it("Legacy-Bestandsschutz: dungeonsUnlocked-Eintrag überstimmt Quest-Gate UND gesperrte Trägerzone", () => {
    const s = createGame({ name: "X" }, c, 1); // nichts offen
    s.dungeonsUnlocked["test_quest_dungeon"] = true;
    s.dungeonsUnlocked["test_zonelocked_dungeon"] = true;
    expect(isDungeonUnlocked(s, c, "test_quest_dungeon")).toBe(true);
    expect(isDungeonUnlocked(s, c, "test_zonelocked_dungeon")).toBe(true);
  });

  it("unbekannte Dungeon-ID ist gesperrt; Paragonturm folgt NICHT den Quest-/Zonen-Regeln (eigenes System)", () => {
    const s = freshState();
    expect(isDungeonUnlocked(s, c, "__nope__")).toBe(false);
    // paragon_tower hat weder requiresQuest noch (im echten Content) eine Trägerzone — die
    // Übergangsregel würde ihn öffnen; der Sonderfall hält ihn beim Einmal-Unlock-System.
    expect(isDungeonUnlocked(s, c, PARAGON_DUNGEON_ID)).toBe(false);
    s.dungeonsUnlocked[PARAGON_DUNGEON_ID] = true;
    expect(isDungeonUnlocked(s, c, PARAGON_DUNGEON_ID)).toBe(true);
  });

  it("startDungeon-Guard: unerfüllte Quest/gesperrte Trägerzone blockieren; erfüllte Quest öffnet", () => {
    const s = freshState(); // requiredLevel ist seit #345 reine Empfehlung — nur das Quest-/Zonen-Gate entscheidet
    expect(startDungeon(s, c, "test_quest_dungeon")).toBe(false);
    expect(s.combat.monsterId).toBe(null);
    s.quests.completed.push(GATE_QUEST_ID);
    expect(startDungeon(s, c, "test_quest_dungeon")).toBe(true);
    expect(s.combat.dungeonId).toBe("test_quest_dungeon");
    const s2 = freshState();
    expect(startDungeon(s2, c, "test_zonelocked_dungeon")).toBe(false);
    expect(s2.combat.monsterId).toBe(null);
  });

  it("Alt-Signatur isDungeonUnlocked(state, id) — deprecated UI-Übergang: roher Bestandsschutz-Check", () => {
    const s = freshState();
    expect(isDungeonUnlocked(s, "test_free_dungeon")).toBe(false); // kennt keine Übergangsregel
    s.dungeonsUnlocked["test_free_dungeon"] = true;
    expect(isDungeonUnlocked(s, "test_free_dungeon")).toBe(true);
  });
});

describe("Schlüssel-Stilllegung (Welle J) + Paragonturm-Ausnahme", () => {
  it("Story-Schlüssel sind gewöhnliche Items: addItemOrBank legt sie ins Inventar (kein Unlock, kein Breadcrumb, kein Gold)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    const goldBefore = s.character.gold;
    const res = addItemOrBank(s, content, "crypt_key", 2);
    expect(res).toEqual({ toInventory: 2, toBank: 0 });
    expect(itemCount(s.inventory, "crypt_key")).toBe(2); // liegt jetzt schlicht im Inventar
    expect(s.dungeonsUnlocked["crypt_depths"]).toBeUndefined(); // KEIN Intercept-Unlock mehr
    expect(s.lastDungeonUnlock).toBeNull();
    expect(s.character.gold).toBe(goldBefore); // keine Live-Erstattung (das macht nur die v64-Migration)
    expect(s.discoveredItems["crypt_key"]).toBe(true); // normaler Erst-Besitz-Marker
  });

  it("Kill-Loot-E2E: ein Schlüssel-Drop im Kampf landet als normales Item (Loot-Log ja, Unlock nein)", () => {
    const dropper = waveMob("test_key_dropper", {
      loot: [{ itemId: "crypt_key", chance: 1, min: 1, max: 1 }],
    });
    const c = withSynthetic([dropper], []);
    const s = heroUnlocked(c, 13);
    expect(startCombat(s, c, "test_key_dropper")).toBe(true);
    fightToKills(s, c, 1);
    expect(itemCount(s.inventory, "crypt_key")).toBe(1);
    expect(s.dungeonsUnlocked["crypt_depths"]).toBeUndefined();
    expect(s.combat.log.some((e) => e.kind === "loot" && e.itemId === "crypt_key")).toBe(true);
    expect(s.lastDungeonUnlock).toBeNull();
  });

  it("Paragonturm-Ausnahme: paragon_key behält den Einmal-Unlock-Intercept (nie im Besitz, Breadcrumb, Folge-Fund erstattet)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    const goldBefore = s.character.gold;
    const res = addItemOrBank(s, content, "paragon_key", 1);
    expect(res).toEqual({ toInventory: 1, toBank: 0 }); // Fund zählt als „angekommen" (Loot-Log/Statistik)
    expect(s.dungeonsUnlocked[PARAGON_DUNGEON_ID]).toBe(true);
    expect(itemCount(s.inventory, "paragon_key")).toBe(0); // nie im Besitz
    expect(s.bank["paragon_key"]).toBeUndefined();
    expect(s.character.gold).toBe(goldBefore); // der entsperrende Schlüssel wird nicht erstattet
    expect(s.discoveredItems["paragon_key"]).toBe(true);
    expect(s.lastDungeonUnlock).toEqual({ dungeonIds: [PARAGON_DUNGEON_ID], itemId: "paragon_key", seq: 1 });
    // Folge-Fund bei entsperrtem Turm: Verkaufswert-Erstattung (floor(value × SELL_FRACTION)), kein neues Signal.
    addItemOrBank(s, content, "paragon_key", 1);
    expect(s.character.gold).toBe(goldBefore + Math.floor(content.items["paragon_key"]!.value! * 0.5));
    expect(s.lastDungeonUnlock?.seq).toBe(1);
  });

  it("unlockParagonTower ist idempotent/monoton, zieht kein RNG und setzt den Breadcrumb nur beim NEUEN Unlock", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    const rngBefore = s.rng.state;
    expect(unlockParagonTower(s)).toBe(true);
    expect(unlockParagonTower(s)).toBe(false); // zweiter Aufruf: no-op
    expect(s.dungeonsUnlocked[PARAGON_DUNGEON_ID]).toBe(true);
    expect(s.rng.state).toBe(rngBefore);
    expect(s.lastDungeonUnlock?.seq).toBe(1);
  });

  it("Legacy-Selektoren (deprecated, UI-Übergang): dungeonKeyItemId/keyUnlocksDungeons/unlockDungeonsForKey über den Paragon-Eintrag", () => {
    // K-fest über den Paragonturm formuliert: dessen Content-Def behält `keyItem: paragon_key`
    // (§7-Konvention); die Story-Dungeon-keyItems sind deprecated und dürfen in Welle K fallen.
    expect(dungeonKeyItemId(content, PARAGON_DUNGEON_ID)).toBe("paragon_key");
    expect(dungeonKeyItemId(content, "__nope__")).toBe(null);
    expect(keyUnlocksDungeons(content, "paragon_key")).toEqual([PARAGON_DUNGEON_ID]);
    expect(keyUnlocksDungeons(content, "copper_ore")).toEqual([]); // kein Schlüssel-Item
    const s = createTestGame({ name: "X" }, content, 1);
    expect(unlockDungeonsForKey(s, content, "paragon_key")).toEqual([PARAGON_DUNGEON_ID]);
    expect(unlockDungeonsForKey(s, content, "paragon_key")).toEqual([]); // idempotent
  });
});

describe("Slayer-Welt-Pool: dungeonOnly-Monster sind ausgeschlossen (§5.1.2)", () => {
  it("ein dungeonOnly-Monster im Level-Fenster taucht NICHT im Welt-Task-Pool auf", () => {
    // Zwei Monster im selben Fenster (CL+1..CL+8) — nur das freie darf in den Pool.
    const gated = waveMob("test_pool_gated", { level: 45, dungeonOnly: true });
    const free = waveMob("test_pool_free", { level: 45 });
    const c = withSynthetic([gated, free], []);
    const s = createTestGame({ name: "X" }, c, 1);
    setCombatLevel(s, 40); // Fenster [41..48] → beide Level-45er kämen in Frage
    const pool = worldTaskMonsters(s, c);
    expect(pool).toContain("test_pool_free");
    expect(pool).not.toContain("test_pool_gated");
    // Härtegrad: KEIN dungeonOnly-Monster darf je im Welt-Pool stehen (Invariante).
    for (const id of pool) expect(c.monsters[id]?.dungeonOnly, `dungeonOnly im Welt-Pool: ${id}`).not.toBe(true);
  });
});
