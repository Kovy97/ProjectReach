import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { KILL_COOLDOWN_MS, TICK_MS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, stopCombat, combatStep, selectHealPotion, setAutoPotionThreshold } from "./combat";
import { startDungeon } from "./dungeon";
import { advance } from "./tick";
import { equipItem } from "./equipment";
import { addItem, itemCount } from "./inventory";
import { computeStats } from "./character";
import { xpForLevel } from "./leveling";

const COOLDOWN_TICKS = KILL_COOLDOWN_MS / TICK_MS; // 5.000 ms / 100 ms = 50 Ticks

/** Starker Nahkämpfer, der den Goblin zuverlässig und schnell tötet (ohne zu sterben). */
function strongHero(seed: number) {
  const s = createTestGame({ name: "Held", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, seed);
  addItem(s.inventory, content, "bronze_sword", 1);
  s.skills.attack = { xp: xpForLevel(20) }; // erfüllt bronze_sword (attack 5)
  equipItem(s, content, "bronze_sword");
  return s;
}

/** Kämpft per combatStep bis zum n-ten Kill (guard-begrenzt). */
function fightUntilKills(s: ReturnType<typeof createTestGame>, kills: number, guardMax = 20_000): void {
  let guard = 0;
  while (s.combat.kills < kills && s.combat.monsterId && guard++ < guardMax) combatStep(s, content);
  expect(s.combat.kills).toBe(kills);
}

/** Zählt Kampf-Aktivitäts-Events (Angriffe beider Seiten) im Log. */
function attackEvents(s: ReturnType<typeof createTestGame>): number {
  return s.combat.log.filter((e) => e.kind === "hit" || e.kind === "crit" || e.kind === "miss").length;
}

describe("Kill-Cooldown (5s Kampfpause nach jedem Kill)", () => {
  it("nach dem Kill ruht der Kampf exakt KILL_COOLDOWN_MS: keine Angriffe, Timer eingefroren, dann Respawn-Kampf", () => {
    const s = strongHero(3);
    startCombat(s, content, "goblin");
    fightUntilKills(s, 1);

    const goblin = content.monsters.goblin!;
    // Kill-Tick: Cooldown gestartet, Respawn steht bereits voll geheilt im State.
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS);
    expect(s.combat.monsterId).toBe("goblin");
    expect(s.combat.enemyHp).toBe(goblin.maxHp);

    const eventsAtKill = attackEvents(s);
    const playerTimerAtKill = s.combat.playerTimerMs;
    const enemyTimerAtKill = s.combat.enemyTimerMs;

    // 50 Ticks (= 5.000 ms) Cooldown: KEINE Angriffe beider Seiten, Timer frieren ein,
    // der Gegner bleibt auf voller HP; der Cooldown zählt deterministisch pro Tick −100 ms.
    for (let t = 1; t <= COOLDOWN_TICKS; t++) {
      combatStep(s, content);
      expect(attackEvents(s)).toBe(eventsAtKill);
      expect(s.combat.enemyHp).toBe(goblin.maxHp);
      expect(s.combat.playerTimerMs).toBe(playerTimerAtKill);
      expect(s.combat.enemyTimerMs).toBe(enemyTimerAtKill);
      if (t < COOLDOWN_TICKS) {
        expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS - t * TICK_MS);
      }
    }
    // Nach exakt 50 Ticks: Cooldown abgelaufen (Feld entfernt), kills unverändert.
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
    expect(s.combat.kills).toBe(1);

    // Danach läuft der Kampf normal weiter → es kommt wieder zu Angriffen und zum 2. Kill.
    fightUntilKills(s, 2);
    expect(attackEvents(s)).toBeGreaterThan(eventsAtKill);
  });

  it("lastKill wird beim Kill befüllt: XP je Skill = tatsächlich vergebene Begegnungs-XP, Gold/Loot stimmen, läuft mit dem Cooldown ab", () => {
    const s = strongHero(7);
    // Snapshot VOR dem Kampf: Skill-XP, Gold.
    startCombat(s, content, "goblin");
    const xpBefore: Record<string, number> = {};
    for (const [id, sk] of Object.entries(s.skills)) xpBefore[id] = sk?.xp ?? 0;
    const goldBefore = s.character.gold;

    fightUntilKills(s, 1);

    const lk = s.combat.lastKill;
    expect(lk).toBeDefined();
    expect(lk!.monsterId).toBe("goblin");
    expect(lk!.expiresInMs).toBe(KILL_COOLDOWN_MS);

    // Gold: exakt das Delta dieses Kills (einzige Gold-Quelle in diesem Fenster).
    expect(lk!.gold).toBe(s.character.gold - goldBefore);

    // XP: lastKill.xpBySkill entspricht je Skill EXAKT der tatsächlich vergebenen XP der Begegnung
    // (Offense-Split attack/power, Vitality, Kill-Bonus — nach allen Multiplikatoren).
    const allSkillIds = new Set([...Object.keys(xpBefore), ...Object.keys(s.skills)]);
    for (const id of allSkillIds) {
      const delta = (s.skills[id]?.xp ?? 0) - (xpBefore[id] ?? 0);
      expect(lk!.xpBySkill[id] ?? 0, `xpBySkill[${id}]`).toBeCloseTo(delta, 6);
    }
    // Der Melee-Kill hat wirklich XP verteilt (attack-Stance: attack + power + vitality).
    expect(lk!.xpBySkill.attack ?? 0).toBeGreaterThan(0);
    expect(lk!.xpBySkill.power ?? 0).toBeGreaterThan(0);
    expect(lk!.xpBySkill.vitality ?? 0).toBeGreaterThan(0);

    // Loot: identisch zu den "loot"-Log-Einträgen dieses Kills (Menge inkl. evtl. Suffix-Instanz).
    const logLoot = s.combat.log
      .filter((e) => e.kind === "loot")
      .map((e) => ({ itemId: e.itemId!, qty: e.amount }));
    expect(lk!.loot).toEqual(logLoot);

    // Der frische Akkumulator gehört der NÄCHSTEN Begegnung (beim Kill geleert).
    expect(s.combat.encounterXp).toBeUndefined();

    // Ablauf: nach dem Cooldown ist die Summary weg (expiresInMs zählt im Gleichschritt).
    for (let t = 0; t < COOLDOWN_TICKS; t++) combatStep(s, content);
    expect(s.combat.lastKill).toBeUndefined();
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
  });

  it("startCombat während des Cooldowns bricht ihn NICHT ab (Queue: der neue Kampf beginnt erst nach Ablauf)", () => {
    const s = strongHero(11);
    startCombat(s, content, "goblin");
    fightUntilKills(s, 1);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS);
    const lastKillBefore = s.combat.lastKill;

    // 10 Ticks abwarten, dann manuell einen NEUEN Kampf starten (weg-klicken unmöglich).
    for (let t = 0; t < 10; t++) combatStep(s, content);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS - 10 * TICK_MS);
    expect(startCombat(s, content, "chicken")).toBe(true);
    expect(s.combat.monsterId).toBe("chicken");
    // Rest-Cooldown und Kill-Summary wandern in den neuen Kampf mit.
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS - 10 * TICK_MS);
    expect(s.combat.lastKill).toBe(lastKillBefore);

    // Bis zum Ablauf des Rests: KEINE Angriffe im frischen Kampf-Log.
    for (let t = 0; t < COOLDOWN_TICKS - 10; t++) {
      combatStep(s, content);
      expect(attackEvents(s)).toBe(0);
    }
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
    // Danach beginnt der Kampf wirklich.
    fightUntilKills(s, 1);
    expect(attackEvents(s)).toBeGreaterThan(0);
  });

  it("Stop + Start überspringt den Cooldown nicht (Rest bleibt eingefroren erhalten)", () => {
    const s = strongHero(13);
    startCombat(s, content, "goblin");
    fightUntilKills(s, 1);
    for (let t = 0; t < 5; t++) combatStep(s, content);
    const remaining = s.combat.cooldownRemainingMs;
    expect(remaining).toBe(KILL_COOLDOWN_MS - 5 * TICK_MS);

    stopCombat(s);
    expect(s.combat.monsterId).toBeNull();
    // Außerhalb des Kampfs ruht der Cooldown eingefroren (combatStep läuft nicht) …
    advance(s, content, 10_000);
    expect(s.combat.cooldownRemainingMs).toBe(remaining);

    // … und der nächste Kampfstart übernimmt den Rest: erst nach dessen Ablauf wird gekämpft.
    expect(startCombat(s, content, "goblin")).toBe(true);
    expect(s.combat.cooldownRemainingMs).toBe(remaining);
    for (let t = 0; t < COOLDOWN_TICKS - 5; t++) {
      combatStep(s, content);
      expect(attackEvents(s)).toBe(0);
    }
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
  });

  it("Dungeon: 5s Cooldown zwischen den Wellen (nächste Welle steht, ruht aber); Abschluss OHNE Cooldown", () => {
    const CRYPT = "crypt_depths";
    const s = createTestGame({ name: "X", baseAttributes: { str: 10, con: 10 } }, content, 7);
    for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
      s.skills[id] = { xp: xpForLevel(99) };
    }
    for (const g of ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"]) {
      addItem(s.inventory, content, g, 1);
      equipItem(s, content, g);
    }
    addItem(s.inventory, content, "cooked_voidray", 1000);
    s.character.food = "cooked_voidray";
    s.dungeonsUnlocked[CRYPT] = true; // Einmal-Unlock (SAVE 60)
    const dungeon = content.dungeons.find((d) => d.id === CRYPT)!;

    expect(startDungeon(s, content, CRYPT)).toBe(true);
    fightUntilKills(s, 1); // Welle 1 besiegt

    // Zwischen den Wellen: Cooldown läuft, die NÄCHSTE Welle steht bereits (voll), kämpft aber nicht.
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS);
    expect(s.combat.encounterIndex).toBe(1);
    const wave2 = content.monsters[dungeon.encounters[1]!]!;
    expect(s.combat.monsterId).toBe(wave2.id);
    expect(s.combat.lastKill?.monsterId).toBe(dungeon.encounters[0]);
    const eventsAtKill = attackEvents(s);
    for (let t = 0; t < COOLDOWN_TICKS; t++) {
      combatStep(s, content);
      expect(s.combat.enemyHp).toBe(wave2.maxHp);
      expect(attackEvents(s)).toBe(eventsAtKill);
    }
    expect(s.combat.cooldownRemainingMs).toBeUndefined();

    // Kompletter Clear: der ABSCHLUSS (letzte Welle) startet KEINEN Cooldown und keine Summary
    // (Chef: „Dungeon-Abschluss unverändert"; ohne combatStep würde lastKill auch nie ablaufen).
    let guard = 0;
    while (s.combat.dungeonId && guard++ < 400) advance(s, content, 5_000);
    expect(s.combat.dungeonId).toBeNull();
    expect(s.dungeonsCleared[CRYPT]).toBe(1);
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
    expect(s.combat.lastKill).toBeUndefined();
    expect(s.combat.encounterXp).toBeUndefined();
  });

  it("Offline-Pfad respektiert den Cooldown: identische Kills wie online, hart gedeckelt auf Fenster/3s", () => {
    const online = strongHero(21);
    const offline = strongHero(21);
    startCombat(online, content, "goblin");
    startCombat(offline, content, "goblin");

    advance(online, content, 60_000);
    advance(offline, content, 60_000, { offline: true });

    // Offline-Catch-up läuft durch dieselben Ticks → bit-identische Kampf-Ergebnisse.
    expect(offline.combat.kills).toBe(online.combat.kills);
    expect(offline.character.gold).toBe(online.character.gold);
    expect(offline.skills).toEqual(online.skills);
    expect(online.combat.kills).toBeGreaterThan(0);

    // Harte Schranke: jeder Kill kostet ≥ KILL_COOLDOWN_MS Pause (+ TTK > 0) →
    // in 60 s sind maximal 60.000/5.000 = 12 Kills möglich (vorher: sofortiger Respawn).
    expect(offline.combat.kills).toBeLessThan(60_000 / KILL_COOLDOWN_MS);
  });

  it("Spieler-DoTs laufen im Cooldown weiter und können töten (Gift, kein Gott-Modus)", () => {
    const s = strongHero(31);
    s.character.food = null;
    startCombat(s, content, "goblin");
    fightUntilKills(s, 1);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS);

    // Tödlicher DoT während der Verschnaufpause: der Tod greift auch im Cooldown (kein Gott-Modus).
    s.character.hp = 1;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 100 });
    combatStep(s, content);
    expect(s.stats.deaths).toBe(1);
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.stopReason).toBe("defeated");
  });

  it("Combat-Feel v2 #0: Auto-Eat UND Auto-Trank feuern NICHT im Kill-Cooldown (kein Gratis-Refill zwischen den Mobs)", () => {
    // Regression: der 5s-Kill-Cooldown war ein Gratis-Heil-Fenster — kein Gegner-Schaden fließt,
    // aber Auto-Eat/Auto-Trank füllten den Char zwischen den Mobs kostenlos auf (nackt endete bei
    // 3-10% HP, refillte aber jeden Kill → Attrition setzte sich nie fort). Beide Heilpfade sind
    // jetzt aus dem Cooldown-Zweig gegatet; Heilung nur noch im AKTIVEN Kampf (Schaden fließt).
    const s = strongHero(41);
    // Reichlich Food UND Trank konfiguriert und im Inventar — beides WÜRDE ohne Gate feuern.
    addItem(s.inventory, content, "cooked_trout", 50);
    s.character.food = "cooked_trout";
    addItem(s.inventory, content, "potion_minor_heal", 50);
    selectHealPotion(s, content, "potion_minor_heal");
    setAutoPotionThreshold(s, 0.9); // sehr hohe Trank-Schwelle → würde bei 20% HP sicher trinken

    startCombat(s, content, "goblin");
    fightUntilKills(s, 1);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS);

    // HP tief unter beide Schwellen setzen; Cooldowns der Heilpfade frei (würden sofort feuern).
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = Math.round(maxHp * 0.2);
    s.combat.autoEatCooldownMs = 0;
    s.combat.autoPotionCooldownMs = 0;
    const foodBefore = itemCount(s.inventory, "cooked_trout");
    const potionBefore = itemCount(s.inventory, "potion_minor_heal");
    const hpBefore = s.character.hp;

    // Kompletten Cooldown durchticken: KEIN Essen/Trank verbraucht, HP steigt nicht durch Heilung
    // (ohne hpRegenPerSec-Quelle bleibt sie exakt — passiver Gear-Regen bliebe erlaubt).
    for (let t = 0; t < COOLDOWN_TICKS; t++) {
      expect(s.combat.cooldownRemainingMs).toBeGreaterThan(0); // noch in der Pause
      combatStep(s, content);
    }
    expect(itemCount(s.inventory, "cooked_trout")).toBe(foodBefore); // nichts gegessen
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(potionBefore); // nichts getrunken
    expect(s.character.hp).toBe(hpBefore); // kein Heil-Refill in der Pause

    // Sobald der nächste Mob engaged (Cooldown vorbei), heilt Auto-Eat/Auto-Trank wieder normal.
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
    let guard = 0;
    while (itemCount(s.inventory, "cooked_trout") === foodBefore && s.combat.monsterId && guard++ < 2_000) {
      combatStep(s, content);
    }
    expect(itemCount(s.inventory, "cooked_trout")).toBeLessThan(foodBefore); // im aktiven Kampf wieder gegessen
  });
});
