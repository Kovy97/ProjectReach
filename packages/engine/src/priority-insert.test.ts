import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { TICK_MS, makeFightQueueEntry } from "@hearthforge/shared";
import { createGame } from "./state";
import {
  enqueueAction,
  enqueueActionAtFront,
  enqueueFight,
  enqueueFightAtFront,
  insertQueueEntryAtFront,
  moveQueueItem,
  prioritizeQueueEntry,
} from "./actions";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

/**
 * PRIORITY-INSERT (Task #326, Spieler-Feedback mit Chef-GO): eine neue Aktivität SOFORT starten,
 * ohne die Queue zu verlieren — die laufende Aktivität wandert MIT Rest-Ziel an die Queue-Front,
 * alles andere rückt nach hinten; nach dem priorisierten Eintrag läuft die alte Kette automatisch
 * weiter. Getestet über die eine gemeinsame Primitive `insertQueueEntryAtFront` und ihre drei
 * öffentlichen Oberflächen (`enqueueActionAtFront`/`enqueueFightAtFront`/`prioritizeQueueEntry`).
 *
 * Test-Gelände wie fight-queue.test.ts: `chicken` (Weiden, ungegated, 3 HP) als farmbarer Kampf,
 * `goblin` (borderlands, quest-gesperrt) als Gate-Skip-Monster, `bull_boss` (L15) als sicherer Tod.
 */

/** Kampfstarker Held (Muster fight-queue.test.ts): farmt Hühner sicher. */
function fighter(seed: number) {
  return createGame({ name: "Jäger", baseAttributes: { str: 6, con: 80 } }, content, seed);
}

/** Schmiede-fähiger Held mit Material (Muster action-queue.test.ts): smelt_bronze ist startbar. */
function smith(seed: number) {
  const s = createGame({ name: "Schmied" }, content, seed);
  s.skills.smithing = { xp: xpForLevel(5) };
  addItem(s.inventory, content, "copper_ore", 10);
  addItem(s.inventory, content, "tin_ore", 10);
  return s;
}

/** Startet eine Queue-Aktion und tickt sie kurz an; liefert das verbleibende Rest-Ziel. */
function startAction(
  s: ReturnType<typeof smith>,
  actionId: string,
  target: number | null,
  runMs: number,
): number | null {
  enqueueAction(s, content, actionId, target);
  advance(s, content, TICK_MS); // Leerlauf-Tick zieht den Eintrag in die aktive Aktion
  advance(s, content, runMs);
  expect(s.activeActionId).toBe(actionId);
  return s.actionTarget;
}

describe("Spieler-Beispiel exakt (Aktion läuft mit Teil-Fortschritt → priorisieren)", () => {
  it("aktiv: neue Aktion; Queue: [Alt(Rest), …bisherige Einträge]; danach läuft die Kette weiter", () => {
    const s = smith(1);
    // „Shrimp kochen läuft" (hier: Holz mit Mengen-Ziel 10, ein paar Abschlüsse sind durch) …
    const rest = startAction(s, "cut_normal_tree", 10, 6_000);
    expect(rest).not.toBeNull();
    expect(rest!).toBeGreaterThan(0);
    expect(rest!).toBeLessThan(10); // Teil-Fortschritt: mindestens 1 Abschluss ist durch
    // … mit Queue [Eisen, Kupfer] …
    enqueueAction(s, content, "mine_tin", 4);
    enqueueAction(s, content, "mine_copper", 3);
    // … und der Spieler priorisiert „Waffe schmieden".
    expect(enqueueActionAtFront(s, content, "smelt_bronze", 2)).toBe(true);

    expect(s.activeActionId).toBe("smelt_bronze");
    expect(s.actionTarget).toBe(2);
    expect(s.actionProgressMs).toBe(0); // frisch angelaufen
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: rest }, // Rest-Ziel an der Front
      { kind: "action", actionId: "mine_tin", target: 4 },
      { kind: "action", actionId: "mine_copper", target: 3 },
    ]);

    // Nach der Waffe läuft die alte Kette automatisch und VOLLSTÄNDIG weiter.
    advance(s, content, 10 * 60_000);
    expect(itemCount(s.inventory, "bronze_bar")).toBeGreaterThanOrEqual(2);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(10); // alle 10 Abschlüsse
    expect(itemCount(s.inventory, "tin_ore")).toBeGreaterThanOrEqual(12); // 10 − 2 (Bronze) + 4 (Queue)
    expect(s.activeActionId).toBeNull(); // planmäßig fertig
    expect(s.actionTarget).toBeNull();
    expect(s.actionQueue).toEqual([]);
    expect(s.lastStop).toBeNull();
  });
});

describe("Kampf ⇄ Aktion (beide Richtungen)", () => {
  it("laufender Queue-Kampf + Aktion priorisiert → Kampf-Eintrag mit Rest-Kills an die Front", () => {
    const s = fighter(3);
    enqueueFight(s, content, "chicken", 50);
    advance(s, content, 60_000); // Queue-Kampf läuft
    expect(s.combat.monsterId).toBe("chicken");
    const kills = s.monsterKills["chicken"] ?? 0;
    expect(kills).toBeGreaterThan(0);

    expect(enqueueActionAtFront(s, content, "cut_normal_tree", 1)).toBe(true);
    expect(s.combat.monsterId).toBeNull();
    expect(s.queueFight).toBeNull();
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionQueue).toEqual([makeFightQueueEntry("chicken", 50 - kills)]);

    // Nach der priorisierten Aktion übernimmt der zurückgestellte Kampf-Eintrag wieder.
    advance(s, content, 60_000);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(1);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight?.monsterId).toBe("chicken");
  });

  it("laufende Aktion + Kampf priorisiert → Aktions-Eintrag mit Rest-Menge an die Front", () => {
    const s = fighter(5);
    const rest = startAction(s, "cut_normal_tree", 10, 3_000);

    expect(enqueueFightAtFront(s, content, "chicken", 2)).toBe(true);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 2 });
    expect(s.activeActionId).toBeNull();
    expect(s.actionTarget).toBeNull(); // Invariante: keine aktive Aktion ⇒ kein Mengen-Ziel
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: rest }]);

    // Exakt 2 Kills, dann läuft der Aktions-Rest durch (Gesamt: alle 10 Abschlüsse).
    advance(s, content, 10 * 60_000);
    expect(s.monsterKills["chicken"]).toBe(2);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(10);
    expect(s.combat.monsterId).toBeNull();
    expect(s.actionQueue).toEqual([]);
    expect(s.activeActionId).toBeNull();
  });
});

describe("∞-Fälle (∞ bleibt ∞)", () => {
  it("laufende ENDLOS-Aktion → Endlos-Eintrag an der Front; nach dem Kampf läuft sie endlos weiter", () => {
    const s = fighter(7);
    const rest = startAction(s, "cut_normal_tree", null, 3_000);
    expect(rest).toBeNull(); // ∞

    expect(enqueueFightAtFront(s, content, "chicken", 1)).toBe(true);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: null }]);

    advance(s, content, 5 * 60_000);
    expect(s.monsterKills["chicken"]).toBe(1); // exakt das Kill-Ziel
    expect(s.combat.monsterId).toBeNull();
    expect(s.activeActionId).toBe("cut_normal_tree"); // Endlos-Aktion wieder aktiv …
    expect(s.actionTarget).toBeNull(); // … und weiterhin ∞
    expect(s.actionQueue).toEqual([]);
  });

  it("laufender ∞-Queue-Kampf → ∞-Kampf-Eintrag an der Front; nach der Aktion kämpft er endlos weiter", () => {
    const s = fighter(11);
    enqueueFight(s, content, "chicken", null);
    advance(s, content, 60_000);
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: null });

    expect(enqueueActionAtFront(s, content, "cut_normal_tree", 1)).toBe(true);
    expect(s.actionQueue).toEqual([makeFightQueueEntry("chicken", null)]); // ∞ bleibt ∞
    expect(s.combat.monsterId).toBeNull();

    advance(s, content, 2 * 60_000);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(1);
    expect(s.combat.monsterId).toBe("chicken"); // ∞-Kampf wieder aufgenommen
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: null });
    expect(s.actionQueue).toEqual([]);
  });
});

describe("prioritizeQueueEntry (bestehender Eintrag, exakte Reihenfolge)", () => {
  it("aus der Listenmitte: gewählter Eintrag aktiv, Laufendes(Rest) an die Front, Rest-Reihenfolge stabil", () => {
    const s = smith(13);
    const rest = startAction(s, "cut_normal_tree", 10, 3_000);
    enqueueAction(s, content, "mine_tin", 4);
    enqueueAction(s, content, "mine_copper", 3);
    enqueueAction(s, content, "smelt_bronze", 2);
    // Queue: [tin(4), copper(3), bronze(2)] — Index 1 (Mitte) priorisieren.
    expect(prioritizeQueueEntry(s, content, 1)).toBe(true);

    expect(s.activeActionId).toBe("mine_copper");
    expect(s.actionTarget).toBe(3);
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: rest },
      { kind: "action", actionId: "mine_tin", target: 4 },
      { kind: "action", actionId: "smelt_bronze", target: 2 },
    ]);
  });

  it("index wird an die Grenzen geklemmt; Nicht-Ganzzahl/leere Queue → No-op", () => {
    const s = smith(17);
    const rest = startAction(s, "cut_normal_tree", 10, 3_000);
    enqueueAction(s, content, "mine_tin", 4);
    enqueueAction(s, content, "mine_copper", 3);

    expect(prioritizeQueueEntry(s, content, 2.5)).toBe(false); // Nicht-Ganzzahl → No-op
    expect(s.activeActionId).toBe("cut_normal_tree");

    expect(prioritizeQueueEntry(s, content, 99)).toBe(true); // klemmt auf den LETZTEN Eintrag
    expect(s.activeActionId).toBe("mine_copper");
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: rest },
      { kind: "action", actionId: "mine_tin", target: 4 },
    ]);

    expect(prioritizeQueueEntry(s, content, -7)).toBe(true); // klemmt auf Index 0
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionTarget).toBe(rest);
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "mine_copper", target: 3 }, // Rest der unterbrochenen Aktion
      { kind: "action", actionId: "mine_tin", target: 4 },
    ]);

    const empty = smith(19);
    expect(prioritizeQueueEntry(empty, content, 0)).toBe(false); // leere Queue → No-op
  });

  it("No-op bei bereits-aktiv: dieselbe Aktion bzw. derselbe Queue-Kampf wird nicht neu gestartet", () => {
    const s = smith(23);
    startAction(s, "cut_normal_tree", 5, 3_000);
    enqueueAction(s, content, "mine_tin", 2);
    enqueueAction(s, content, "cut_normal_tree", 7); // gleiche Aktion wie die laufende
    const progress = s.actionProgressMs;
    const queueBefore = structuredClone(s.actionQueue);
    expect(prioritizeQueueEntry(s, content, 1)).toBe(false);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionProgressMs).toBe(progress); // kein Fortschritts-Reset
    expect(s.actionQueue).toEqual(queueBefore); // Eintrag bleibt unangetastet stehen

    const f = fighter(29);
    enqueueFight(f, content, "chicken", 50);
    advance(f, content, 30_000);
    expect(f.queueFight?.monsterId).toBe("chicken");
    enqueueFight(f, content, "cow", 5);
    enqueueFight(f, content, "chicken", 25); // gleiches Monster wie der laufende Queue-Kampf
    const enemyHp = f.combat.enemyHp;
    expect(prioritizeQueueEntry(f, content, 1)).toBe(false);
    expect(f.combat.monsterId).toBe("chicken");
    expect(f.combat.enemyHp).toBe(enemyHp); // kein Gegner-Reset
    expect(f.actionQueue).toEqual([
      makeFightQueueEntry("cow", 5),
      makeFightQueueEntry("chicken", 25),
    ]);
  });

  it("nicht startbarer Aktions-Eintrag (Level fehlt) wird NICHT konsumiert (No-op statt Skip)", () => {
    const s = createGame({ name: "Lehrling" }, content, 31); // smithing 1 → smelt_bronze gesperrt
    startAction(s, "cut_normal_tree", 5, 3_000);
    enqueueAction(s, content, "smelt_bronze", 2); // Vorplanen ist erlaubt (kein Level-Check)
    expect(prioritizeQueueEntry(s, content, 0)).toBe(false);
    expect(s.activeActionId).toBe("cut_normal_tree"); // nichts unterbrochen
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "smelt_bronze", target: 2 }]);
  });
});

describe("Tod-Pause: Priorisieren hebt sie auf (Wiederaufnahme-Signal wie enqueue*)", () => {
  it("nach dem Tod läuft die Queue von selbst weiter (Chef 29.08.2026): der gefallene Eintrag verfällt, nichts bleibt hängen", () => {
    const s = createGame({ name: "Wagemut" }, content, 37);
    enqueueFight(s, content, "bull_boss", 5); // sicherer Tod für den frischen L1-Helden
    enqueueAction(s, content, "cut_normal_tree", 3);
    advance(s, content, 2 * 60_000);
    expect(s.stats.deaths).toBe(1);
    expect(s.queuePaused).toBe(false);
    expect(s.lastQueueSkip).toEqual({ monsterId: "bull_boss", reason: "defeated" });
    advance(s, content, 5 * 60_000);
    expect(itemCount(s.inventory, "normal_log")).toBe(3); // die Holz-Aktion lief ohne Zutun
    expect(s.actionQueue).toEqual([]);
  });

  it("prioritizeQueueEntry hebt eine manuelle Pause auf und startet den vorgezogenen Eintrag sofort", () => {
    const s = createGame({ name: "Wagemut" }, content, 38);
    s.actionQueue.push(makeFightQueueEntry("chicken", 5), { kind: "action", actionId: "cut_normal_tree", target: 3 });
    s.queuePaused = true;
    advance(s, content, 60_000);
    expect(s.combat.monsterId).toBeNull(); // Pause hält
    expect(prioritizeQueueEntry(s, content, 1)).toBe(true); // die Holz-Aktion vorziehen
    expect(s.queuePaused).toBe(false); // Pause aufgehoben
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionTarget).toBe(3);
    expect(s.actionQueue).toEqual([makeFightQueueEntry("chicken", 5)]);
  });
});

describe("Gate-gesperrter Kampf beim Priorisieren (lastQueueSkip-Muster, nächster läuft)", () => {
  it("prioritizeQueueEntry: gesperrter Eintrag wird mit Grund konsumiert, der Rest läuft direkt weiter", () => {
    const s = fighter(41); // frisch: goblin (borderlands) hinter chronicle_03
    const rest = startAction(s, "cut_normal_tree", 10, 3_000);
    enqueueFight(s, content, "goblin", 10); // Vorplanen erlaubt (Gate-Check erst beim Start)

    expect(prioritizeQueueEntry(s, content, 0)).toBe(true); // true: der Rest läuft direkt weiter
    expect(s.lastQueueSkip).toEqual({ monsterId: "goblin", reason: "gate_locked" });
    expect(s.combat.monsterId).toBeNull(); // nie gekämpft
    expect(s.activeActionId).toBe("cut_normal_tree"); // zurückgestellter Rest wieder aktiv
    expect(s.actionTarget).toBe(rest);
    expect(s.actionQueue).toEqual([]); // gesperrter Eintrag konsumiert (Skip-Semantik)
  });

  it("enqueueFightAtFront: identisches Muster (kein Vorab-Gate-Check, Spiegel enqueueFight)", () => {
    const s = fighter(43);
    const rest = startAction(s, "cut_normal_tree", 5, 3_000);
    expect(enqueueFightAtFront(s, content, "goblin", 10)).toBe(true);
    expect(s.lastQueueSkip).toEqual({ monsterId: "goblin", reason: "gate_locked" });
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionTarget).toBe(rest);
    expect(s.actionQueue).toEqual([]);
  });
});

describe("Ablehnungen fassen NICHTS an (Sofort-Start braucht Startbarkeit)", () => {
  it("enqueueActionAtFront: unbekannte Aktion / Level fehlt → false, Laufendes unberührt", () => {
    const s = createGame({ name: "Lehrling" }, content, 47); // smithing 1
    startAction(s, "cut_normal_tree", 5, 3_000);
    const progress = s.actionProgressMs;

    expect(enqueueActionAtFront(s, content, "gibt_es_nicht", 1)).toBe(false);
    expect(enqueueActionAtFront(s, content, "smelt_bronze", 2)).toBe(false); // braucht Schmieden 5
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionProgressMs).toBe(progress);
    expect(s.actionQueue).toEqual([]);
  });

  it("enqueueFightAtFront: unbekanntes Monster / dungeonOnly → false, Laufendes unberührt", () => {
    const s = fighter(53);
    startAction(s, "cut_normal_tree", 5, 3_000);
    const progress = s.actionProgressMs;

    expect(enqueueFightAtFront(s, content, "gibt_es_nicht", 1)).toBe(false);
    expect(enqueueFightAtFront(s, content, "goblin_reaver", 1)).toBe(false); // dungeonOnly
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionProgressMs).toBe(progress);
    expect(s.actionQueue).toEqual([]);
  });
});

describe("Kompatibilität & Primitive", () => {
  it("insertQueueEntryAtFront im Leerlauf: Eintrag startet einfach (nichts zurückzustellen)", () => {
    const s = smith(59);
    expect(
      insertQueueEntryAtFront(s, content, { kind: "action", actionId: "cut_normal_tree", target: 2 }),
    ).toBe(true);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionTarget).toBe(2);
    expect(s.actionQueue).toEqual([]);
  });

  it("moveQueueItem arbeitet unverändert auf der Queue nach einem Priority-Insert", () => {
    const s = smith(61);
    const rest = startAction(s, "cut_normal_tree", 10, 3_000);
    enqueueAction(s, content, "mine_tin", 4);
    expect(enqueueActionAtFront(s, content, "mine_copper", 3)).toBe(true);
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: rest },
      { kind: "action", actionId: "mine_tin", target: 4 },
    ]);

    moveQueueItem(s, 0, 1); // Rest-Eintrag nach hinten ziehen
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "mine_tin", target: 4 },
      { kind: "action", actionId: "cut_normal_tree", target: rest },
    ]);
  });
});

describe("Determinismus-GESETZ: nach dem Priority-Insert bleibt die Abarbeitung offline == online", () => {
  it("gemischte Kette nach Priorisierung: online getickt == offline in einem Rutsch (bit-identisch)", () => {
    const build = () => {
      const s = fighter(9_999);
      enqueueFight(s, content, "chicken", 25);
      enqueueAction(s, content, "cut_normal_tree", 20);
      advance(s, content, 30_000); // mitten im Queue-Kampf …
      expect(s.combat.monsterId).toBe("chicken");
      // … dann der Priority-Insert (Online-Nutzeraktion, in beiden Builds identisch platziert).
      expect(enqueueActionAtFront(s, content, "mine_tin", 2)).toBe(true);
      return s;
    };
    const online = build();
    const offline = build();
    const totalMs = 12 * 60 * 1000;

    for (let t = 0; t < totalMs; t += TICK_MS) advance(online, content, TICK_MS); // Tick für Tick
    advance(offline, content, totalMs, { offline: true }); // ein Rutsch (Offline-Catch-up)

    // Bekannte, queue-FREMDE Artefakte angleichen (exakt das Muster der bestehenden
    // Offline-Determinismus-Tests in action-queue.test.ts/fight-queue.test.ts, Begründungen dort).
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
    expect(offline).toEqual(online);

    // Sanity: die komplette Kette lief durch (Zinn → Kampf-Rest → Holz → idle).
    expect(offline.monsterKills["chicken"]).toBe(25);
    expect(itemCount(offline.inventory, "tin_ore")).toBeGreaterThanOrEqual(2);
    expect(itemCount(offline.inventory, "normal_log")).toBeGreaterThanOrEqual(20);
    expect(offline.actionQueue).toEqual([]);
    expect(offline.queueFight).toBeNull();
    expect(offline.combat.monsterId).toBeNull();
    expect(offline.activeActionId).toBeNull();
  });
});
