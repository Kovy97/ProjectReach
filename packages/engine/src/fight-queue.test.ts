import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { TICK_MS, makeFightQueueEntry } from "@hearthforge/shared";
import { createGame } from "./state";
import {
  advanceActionQueue,
  enqueueAction,
  enqueueFight,
  moveQueueItem,
  resumeActionQueue,
  setActiveAction,
} from "./actions";
import { stopCombat } from "./combat";
import { advance } from "./tick";
import { itemCount } from "./inventory";

/**
 * KAMPF-QUEUE (SAVE_VERSION 73, Task #312, Chef-GO 2026-07-24): Kampf-Einträge in der
 * Action-Queue — Kill-Ziele (1/25/50/∞), kettenfähig mit normalen Aktionen, offline lauffähig,
 * Tod überspringt den Eintrag (Chef 29.08.2026, vorher: pausiert), Zonen-Gate-Check beim START des Eintrags.
 *
 * Test-Gelände: die Weiden (pastures) sind UNGEGATED — `chicken` (L1, 3 HP), `cow` (L5, 12 HP)
 * und `bull_boss` (L15, tödlich für einen frischen L1-Helden) sind ab createGame bekämpfbar.
 * `goblin` (borderlands) liegt hinter chronicle_03 → perfektes Gate-Skip-Monster.
 */

/** Kampfstarker Held (Muster combat.test.ts): genug HP-Puffer, um Hühner/Kühe sicher zu farmen. */
function fighter(seed: number) {
  return createGame({ name: "Jäger", baseAttributes: { str: 6, con: 80 } }, content, seed);
}

describe("enqueueFight: Einreihen + Ablehnung (v1: nur normale Zonen-Monster)", () => {
  it("reiht normale Zonen-Monster ein (endlich + ∞) und STAPELT benachbarte gleiche Monster", () => {
    const s = fighter(1);
    expect(enqueueFight(s, content, "chicken", 25)).toBe(true);
    expect(enqueueFight(s, content, "chicken", 25)).toBe(true); // benachbart gleich → stapelt
    expect(enqueueFight(s, content, "cow", 10)).toBe(true); // anderes Monster → neuer Eintrag
    expect(enqueueFight(s, content, "cow", null)).toBe(true); // ∞ stapelt nie
    expect(s.actionQueue).toEqual([
      makeFightQueueEntry("chicken", 50),
      makeFightQueueEntry("cow", 10),
      makeFightQueueEntry("cow", null),
    ]);
  });

  it("lehnt unbekannte Monster und Dungeon-only-Monster sauber ab (Elites sind strukturell nicht adressierbar)", () => {
    const s = fighter(1);
    expect(enqueueFight(s, content, "gibt_es_nicht", 5)).toBe(false);
    // goblin_reaver ist dungeonOnly (goblin_warband-Welle) — Dungeons sind v1 ausgeschlossen.
    expect(enqueueFight(s, content, "goblin_reaver", 5)).toBe(false);
    // Elite-Champions existieren NICHT als MonsterIds (nur als EliteVariantDef über
    // startEliteCombat) — ein Elite-Enqueue ist per API-Form unmöglich, kein Extra-Guard nötig.
    expect(content.monsters["elite_pastures_boar"]).toBeUndefined();
    expect(s.actionQueue).toEqual([]);
  });

  it("Gate wird beim Einreihen BEWUSST nicht geprüft (Vorplanen erlaubt, Muster enqueueAction)", () => {
    const s = fighter(1); // frisch: borderlands (goblin) ist quest-gesperrt
    expect(enqueueFight(s, content, "goblin", 10)).toBe(true);
    expect(s.actionQueue).toEqual([makeFightQueueEntry("goblin", 10)]);
  });
});

describe("Kill-Ziel erreicht → nächster Eintrag startet", () => {
  it("Kampf→Kampf: exakt 2 Hühner, dann exakt 1 Kuh, dann sauber idle", () => {
    const s = fighter(7);
    enqueueFight(s, content, "chicken", 2);
    enqueueFight(s, content, "cow", 1);
    advance(s, content, 15 * 60_000);

    // EXAKTE Zählung: das Ziel stoppt den Kampf im Kill-Tick — kein Respawn-Überschuss-Kill.
    expect(s.monsterKills["chicken"]).toBe(2);
    expect(s.monsterKills["cow"]).toBe(1);
    expect(s.combat.monsterId).toBeNull(); // Queue erschöpft → Kampf sauber beendet
    expect(s.queueFight).toBeNull();
    expect(s.actionQueue).toEqual([]);
    expect(s.activeActionId).toBeNull();
    expect(s.queuePaused).toBe(false);
  });

  it("Kampf→Sammeln: nach dem Kill-Ziel startet die Sammel-Aktion nahtlos", () => {
    const s = fighter(11);
    enqueueFight(s, content, "chicken", 1);
    enqueueAction(s, content, "cut_normal_tree", 2);
    advance(s, content, 10 * 60_000);

    expect(s.monsterKills["chicken"]).toBe(1);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(2);
    expect(s.combat.monsterId).toBeNull();
    expect(s.queueFight).toBeNull();
    expect(s.actionQueue).toEqual([]);
    expect(s.activeActionId).toBeNull(); // planmäßig fertig
  });

  it("Sammeln→Kampf: nach dem Aktions-Ziel startet der Queue-Kampf nahtlos", () => {
    const s = fighter(13);
    enqueueAction(s, content, "cut_normal_tree", 1);
    enqueueFight(s, content, "chicken", 1);
    advance(s, content, 10 * 60_000);

    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(1);
    expect(s.monsterKills["chicken"]).toBe(1);
    expect(s.combat.monsterId).toBeNull();
    expect(s.actionQueue).toEqual([]);
  });

  it("laufender Eintrag führt exakte Buchhaltung: remaining === Ziel − bisherige Kills", () => {
    const s = fighter(17);
    enqueueFight(s, content, "chicken", 50);
    advance(s, content, 90_000); // mitten im Farmen
    expect(s.combat.monsterId).toBe("chicken");
    const kills = s.monsterKills["chicken"] ?? 0;
    expect(kills).toBeGreaterThan(0);
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 50 - kills });
  });
});

describe("∞-Eintrag läuft bis zum manuellen Stopp", () => {
  it("kämpft unbegrenzt weiter; manueller stopCombat beendet den Eintrag, die Queue läuft weiter", () => {
    const s = fighter(19);
    enqueueFight(s, content, "chicken", null);
    enqueueAction(s, content, "cut_normal_tree", 2);
    advance(s, content, 5 * 60_000);

    // ∞: nach 5 Minuten immer noch am Huhn — der Folge-Eintrag wartet.
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: null });
    expect((s.monsterKills["chicken"] ?? 0)).toBeGreaterThan(1); // respawnt & farmt
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: 2 }]);
    expect(itemCount(s.inventory, "normal_log")).toBe(0);

    // Manueller Stopp = der EINZIGE Endpunkt eines ∞-Eintrags: Eintrag gilt als beendet
    // (kein Re-Queue, keine Pause), der nächste Eintrag startet im folgenden Leerlauf-Tick.
    stopCombat(s);
    advance(s, content, 5 * 60_000);
    expect(s.queueFight).toBeNull();
    expect(s.combat.monsterId).toBeNull();
    expect(itemCount(s.inventory, "normal_log")).toBe(2);
    expect(s.actionQueue).toEqual([]);
  });
});

describe("Tod überspringt den Eintrag, die Queue macht weiter (Chef 29.08.2026)", () => {
  /** Frischer L1-Held OHNE Food gegen bull_boss (L15) = sicherer Tod binnen Sekunden. */
  function doomed(seed: number) {
    const s = createGame({ name: "Wagemut" }, content, seed);
    enqueueFight(s, content, "bull_boss", 5);
    enqueueAction(s, content, "cut_normal_tree", 3);
    return s;
  }

  it("online: Niederlage → Rest des Eintrags verfällt, lastQueueSkip 'defeated', der nächste Eintrag läuft von selbst", () => {
    const s = doomed(23);
    advance(s, content, 2 * 60_000);

    expect(s.stats.deaths).toBe(1); // genau EIN Tod — kein Auto-Neustart des verlorenen Kampfs
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.stopReason).toBe("defeated");
    expect(s.queueFight).toBeNull();
    expect(s.queuePaused).toBe(false);
    expect(s.lastQueueSkip).toEqual({ monsterId: "bull_boss", reason: "defeated" });
    // Der Kampf-Eintrag ist weg (kein Rest-Ziel vorne), die Holz-Aktion dahinter lief regulär an.
    expect(s.actionQueue.some((e) => e.kind === "fight")).toBe(false);
    advance(s, content, 5 * 60_000);
    expect(itemCount(s.inventory, "normal_log")).toBe(3);
    expect(s.actionQueue).toEqual([]);
  });

  it("manuelle Pause bleibt als Vertrag: resumeActionQueue startet die Front sofort", () => {
    const s = createGame({ name: "Wagemut" }, content, 29);
    s.actionQueue.push(makeFightQueueEntry("chicken", 5), { kind: "action", actionId: "cut_normal_tree", target: 3 });
    s.queuePaused = true; // direkt gesetzt (enqueue* würde die Pause löschen)
    advance(s, content, 60_000);
    expect(s.combat.monsterId).toBeNull(); // Pause hält: nichts startet
    expect(s.activeActionId).toBeNull();

    expect(resumeActionQueue(s, content)).toBe(true);
    expect(s.queuePaused).toBe(false);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 5 });
  });

  it("enqueue* ist ein manuelles Wiederaufnahme-Signal (löscht die Pause)", () => {
    const s = createGame({ name: "Wagemut" }, content, 31);
    s.actionQueue.push(makeFightQueueEntry("chicken", 5));
    s.queuePaused = true;
    enqueueAction(s, content, "cut_normal_tree", 1); // Spieler klickt eine Aktions-Karte
    expect(s.queuePaused).toBe(false);
  });

  it("offline: der Tod überspringt den Eintrag, der Rest der Offline-Zeit gehört den Folge-Einträgen", () => {
    const s = doomed(37);
    advance(s, content, 30 * 60_000, { offline: true });

    expect(s.stats.deaths).toBe(1);
    expect(s.queuePaused).toBe(false);
    expect(s.lastQueueSkip).toEqual({ monsterId: "bull_boss", reason: "defeated" });
    expect(itemCount(s.inventory, "normal_log")).toBe(3); // die Sammel-Aktion dahinter lief
    expect(s.actionQueue).toEqual([]);
  });
});

describe("Zonen-Gate-Check beim START des Eintrags", () => {
  it("gate-gesperrtes Monster wird mit maschinenlesbarem Grund übersprungen, die Queue läuft weiter", () => {
    const s = fighter(41); // frisch: goblin (borderlands) hinter chronicle_03
    enqueueFight(s, content, "goblin", 10);
    enqueueAction(s, content, "cut_normal_tree", 2);
    advance(s, content, 5 * 60_000);

    expect(s.lastQueueSkip).toEqual({ monsterId: "goblin", reason: "gate_locked" });
    expect(s.monsterKills["goblin"]).toBeUndefined(); // nie gekämpft
    expect(itemCount(s.inventory, "normal_log")).toBe(2); // Folge-Eintrag lief regulär
    expect(s.actionQueue).toEqual([]);
  });

  it("verschwundenes Monster (Content-Drift/Save-Wechsel) → Grund 'unknown_monster'", () => {
    const s = fighter(43);
    // Direkt in die Queue (enqueueFight würde ablehnen — simuliert ein Alt-Save, dessen Monster
    // aus dem Content entfernt wurde; sanitizeState würde es beim LADEN strippen, der Engine-Pfad
    // muss trotzdem robust überspringen).
    s.actionQueue.push(makeFightQueueEntry("weg_damit", 5));
    enqueueAction(s, content, "cut_normal_tree", 1);
    advance(s, content, 3 * 60_000);

    expect(s.lastQueueSkip).toEqual({ monsterId: "weg_damit", reason: "unknown_monster" });
    expect(itemCount(s.inventory, "normal_log")).toBe(1);
    expect(s.actionQueue).toEqual([]);
  });

  it("dungeonOnly gewordenes Monster → Grund 'not_queueable'", () => {
    const s = fighter(47);
    s.actionQueue.push(makeFightQueueEntry("goblin_reaver", 5)); // heute dungeonOnly
    enqueueAction(s, content, "cut_normal_tree", 1);
    advance(s, content, 3 * 60_000);
    expect(s.lastQueueSkip).toEqual({ monsterId: "goblin_reaver", reason: "not_queueable" });
    expect(itemCount(s.inventory, "normal_log")).toBe(1);
  });
});

describe("Manuelle Eingriffe unterbrechen sauber (nichts wird still übersprungen)", () => {
  it("manuelles setActiveAction stellt den laufenden Kampf-Eintrag mit Rest-Ziel zurück an die Front", () => {
    const s = fighter(53);
    enqueueFight(s, content, "chicken", 50);
    advance(s, content, 60_000); // Queue-Kampf läuft
    expect(s.combat.monsterId).toBe("chicken");
    const kills = s.monsterKills["chicken"] ?? 0;

    setActiveAction(s, content, "cut_normal_tree", 1); // Spieler übernimmt manuell
    expect(s.combat.monsterId).toBeNull();
    expect(s.queueFight).toBeNull();
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionQueue).toEqual([makeFightQueueEntry("chicken", 50 - kills)]);

    // Nach der manuellen Aktion übernimmt die Queue wieder: der Kampf-Eintrag läuft weiter.
    advance(s, content, 60_000);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight?.monsterId).toBe("chicken");
  });

  it("moveQueueItem funktioniert unverändert über gemischte Sorten (fight/action)", () => {
    const s = fighter(59);
    enqueueFight(s, content, "chicken", 25);
    enqueueAction(s, content, "cut_normal_tree", 5);
    enqueueFight(s, content, "cow", 10);

    moveQueueItem(s, 0, 2); // Kampf-Eintrag ans Ende ziehen
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: 5 },
      makeFightQueueEntry("cow", 10),
      makeFightQueueEntry("chicken", 25),
    ]);
    moveQueueItem(s, 2, 0); // und wieder nach vorn
    expect(s.actionQueue).toEqual([
      makeFightQueueEntry("chicken", 25),
      { kind: "action", actionId: "cut_normal_tree", target: 5 },
      makeFightQueueEntry("cow", 10),
    ]);
  });
});

describe("Offline == Online (Determinismus-GESETZ)", () => {
  it("gemischte Queue (Kampf→Sammeln→Kampf): online getickt == offline in einem Rutsch (bit-identisch)", () => {
    const build = () => {
      const s = fighter(12345);
      enqueueFight(s, content, "chicken", 3);
      enqueueAction(s, content, "cut_normal_tree", 5);
      enqueueFight(s, content, "cow", 2);
      return s;
    };
    const online = build();
    const offline = build();
    const totalMs = 15 * 60 * 1000;

    for (let t = 0; t < totalMs; t += TICK_MS) advance(online, content, TICK_MS); // Tick für Tick
    advance(offline, content, totalMs, { offline: true }); // ein Rutsch (Offline-Catch-up)

    // Bekannte, queue-FREMDE Artefakte angleichen (exakt das Muster des bestehenden
    // Offline-Determinismus-Tests in action-queue.test.ts, s. dortige Begründungen):
    // activePlayMs zählt offline nicht; createdAt stempelt Date.now(); Achievements/Quests
    // werden online inkrementell/offline im Batch freigeschaltet (Menge gleich, Reihenfolge
    // anders); die fünf Elite-Felder + eliteCodex ticken bewusst NUR online.
    online.activePlayMs = offline.activePlayMs;
    online.character.createdAt = offline.character.createdAt;
    online.eliteZones = offline.eliteZones;
    online.eliteRng = offline.eliteRng;
    online.eliteSpawnSeq = offline.eliteSpawnSeq;
    online.lastEliteSpawn = offline.lastEliteSpawn;
    online.eliteCodex = offline.eliteCodex;
    online.achievements.sort();
    offline.achievements.sort();
    online.quests.completed.sort();
    offline.quests.completed.sort();
    online.quests.claimed.sort();
    offline.quests.claimed.sort();
    // Kern: RNG, Kills, Loot, Skills, Queue-Zustand — bit-identisch über den KOMPLETTEN State.
    expect(offline).toEqual(online);

    // Sanity: die ganze Kette lief durch (3 Hühner → 5 Logs → 2 Kühe → idle).
    expect(offline.monsterKills["chicken"]).toBe(3);
    expect(offline.monsterKills["cow"]).toBe(2);
    expect(itemCount(offline.inventory, "normal_log")).toBeGreaterThanOrEqual(5);
    expect(offline.actionQueue).toEqual([]);
    expect(offline.combat.monsterId).toBeNull();
    expect(offline.queueFight).toBeNull();
  });
});

describe("advanceActionQueue direkt (API-Oberfläche für die UI-Welle)", () => {
  it("startet einen fight-Eintrag via startCombat und setzt die Laufzeit (queueFight)", () => {
    const s = fighter(61);
    enqueueFight(s, content, "chicken", 25);
    expect(advanceActionQueue(s, content)).toBe(true);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 25 });
    expect(s.activeActionId).toBeNull();
    expect(s.actionTarget).toBeNull(); // Invariante: keine aktive Aktion ⇒ kein Mengen-Ziel
    expect(s.actionQueue).toEqual([]);
  });
});
