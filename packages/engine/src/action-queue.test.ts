import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { TICK_MS } from "@hearthforge/shared";
import { createGame } from "./state";
import {
  advanceActionQueue,
  clearActionQueue,
  dequeueAction,
  enqueueAction,
  moveQueueItem,
  setActiveAction,
} from "./actions";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { mailItemCount } from "./mail";
import { xpForLevel } from "./leveling";

// Verarbeitungs-Aktion mit Eingaben: smelt_bronze (Schmieden 5, 1 Kupfer + 1 Zinn → 1 Barren, 3 s).
function smith() {
  const s = createGame({ name: "Schmied" }, content, 1);
  s.skills.smithing = { xp: xpForLevel(5) };
  return s;
}

describe("Action-Queue: Setter/Helfer", () => {
  it("enqueueAction hängt gültige Aktionen an, normalisiert target wie setActiveAction", () => {
    const s = smith();
    expect(enqueueAction(s, content, "cut_normal_tree", 5)).toBe(true);
    expect(enqueueAction(s, content, "smelt_bronze")).toBe(true); // ohne target → null
    expect(enqueueAction(s, content, "cut_normal_tree", 4.8)).toBe(true); // Float → floor
    expect(enqueueAction(s, content, "cut_normal_tree", 0)).toBe(true); // ≤0 → null
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: 5 },
      { kind: "action", actionId: "smelt_bronze", target: null },
      { kind: "action", actionId: "cut_normal_tree", target: 4 },
      { kind: "action", actionId: "cut_normal_tree", target: null },
    ]);
    // Unbekannte Aktion wird NICHT eingereiht (Content-Guard).
    expect(enqueueAction(s, content, "gibt_es_nicht" as never, 1)).toBe(false);
    expect(s.actionQueue).toHaveLength(4);
  });

  it("dequeueAction/clearActionQueue/moveQueueItem verwalten die Queue robust", () => {
    const s = smith();
    enqueueAction(s, content, "cut_normal_tree", 1);
    enqueueAction(s, content, "smelt_bronze", 2);
    enqueueAction(s, content, "cut_normal_tree", 3);

    dequeueAction(s, 1); // mittleren Eintrag entfernen
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: 1 },
      { kind: "action", actionId: "cut_normal_tree", target: 3 },
    ]);
    dequeueAction(s, 99); // ungültiger Index → No-op
    expect(s.actionQueue).toHaveLength(2);

    moveQueueItem(s, 0, 1); // Reihenfolge tauschen
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: 3 },
      { kind: "action", actionId: "cut_normal_tree", target: 1 },
    ]);
    moveQueueItem(s, 0, 5); // ungültiges Ziel → No-op
    expect(s.actionQueue[0]?.target).toBe(3);

    clearActionQueue(s);
    expect(s.actionQueue).toEqual([]);
  });

  // Spieler-Feedback 0.2.2 Punkt 2 (Drag&Drop-Umsortierung der Action-Queue-UI): die bestehenden
  // ▲/▼-Buttons riefen `moveQueueItem` bisher nur mit BENACHBARTEN Indizes auf (i∓1) — die neue
  // Drag&Drop-UI (ActionQueuePanel.tsx) nutzt DIESELBE Funktion jetzt auch für weite Sprünge
  // (eine Zeile von Position 2 an Position 15 ziehen). `moveQueueItem` war dafür bereits generisch
  // genug (from/to beliebig, nicht nur ±1) — kein neuer Engine-Helper nötig, nur zusätzliche
  // Testabdeckung für den bisher ungetesteten Mehrfach-Positionen-Fall.
  it("moveQueueItem verschiebt auch über mehrere Positionen hinweg exakt (Drag&Drop-Grundlage)", () => {
    const s = smith();
    // 6 Einträge, bewusst ALTERNIEREND (A/B) — enqueueAction stapelt sonst benachbarte gleiche
    // Aktionen (s. Stapel-Test oben) und würde die Positionen hier verschleiern.
    for (const [action, qty] of [
      ["cut_normal_tree", 1],
      ["smelt_bronze", 2],
      ["cut_normal_tree", 3],
      ["smelt_bronze", 4],
      ["cut_normal_tree", 5],
      ["smelt_bronze", 6],
    ] as const) {
      enqueueAction(s, content, action, qty);
    }
    const targets = () => s.actionQueue.map((e) => e.target);
    expect(targets()).toEqual([1, 2, 3, 4, 5, 6]);

    // Weite Distanz nach HINTEN (Index 1 → 4, wie ein Drag weit nach unten in der Liste).
    moveQueueItem(s, 1, 4);
    expect(targets()).toEqual([1, 3, 4, 5, 2, 6]);

    // Weite Distanz nach VORNE (derselbe Eintrag, jetzt an Index 4, zurück an Index 0).
    moveQueueItem(s, 4, 0);
    expect(targets()).toEqual([2, 1, 3, 4, 5, 6]);

    // from === to → No-op (exakt dieselbe Reihenfolge, keine Mutation).
    const stable = targets();
    moveQueueItem(s, 2, 2);
    expect(targets()).toEqual(stable);

    // Grenzen: negativer/zu großer Index → No-op statt Crash. `moveQueueItem` klemmt NICHT selbst
    // (die UI klemmt den Ziel-Index bereits VOR dem Aufruf, s. ActionQueuePanel.tsx
    // `updateDragVisual` — der Slot-Index bleibt beim Ziehen immer im gültigen Bereich).
    moveQueueItem(s, -1, 3);
    expect(targets()).toEqual(stable);
    moveQueueItem(s, 2, 99);
    expect(targets()).toEqual(stable);
    moveQueueItem(s, 99, 2);
    expect(targets()).toEqual(stable);
  });
});

describe("Action-Queue: Weiterschalten im Tick", () => {
  it("(a) Ziel erreicht → nächste Queue-Aktion läuft an (über zwei verschiedene Aktionen)", () => {
    const s = smith();
    addItem(s.inventory, content, "copper_ore", 50);
    addItem(s.inventory, content, "tin_ore", 50);

    setActiveAction(s, content, "cut_normal_tree", 3); // erst 3 Logs sammeln
    enqueueAction(s, content, "smelt_bronze", 2); // dann 2 Bronze schmieden
    advance(s, content, 120_000);

    expect(itemCount(s.inventory, "normal_log")).toBe(3);
    expect(itemCount(s.inventory, "bronze_bar")).toBe(2);
    expect(s.activeActionId).toBeNull(); // Queue erschöpft → sauber gestoppt
    expect(s.actionQueue).toEqual([]);
    expect(s.actionTarget).toBeNull();
    expect(s.lastStop).toBeNull(); // planmäßig fertig, kein Abbruch-Hinweis
  });

  it("(a) no_materials bei target-null-Eintrag zählt als natürlicher Abschluss → weiter", () => {
    const s = smith();
    addItem(s.inventory, content, "copper_ore", 3);
    addItem(s.inventory, content, "tin_ore", 3);

    setActiveAction(s, content, "smelt_bronze"); // null → bis das Material leer ist
    enqueueAction(s, content, "cut_normal_tree", 4); // dann 4 Logs
    advance(s, content, 120_000);

    expect(itemCount(s.inventory, "bronze_bar")).toBe(3); // genau 3 Sets Material vorhanden
    expect(itemCount(s.inventory, "normal_log")).toBe(4); // Queue lief nach no_materials weiter
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue).toEqual([]);
    // Weder der no_materials-Stopp noch der Ziel-Abschluss hinterlässt einen Hinweis (Queue kontinuierlich).
    expect(s.lastStop).toBeNull();
  });

  it("(b) volles Inventar hält die Queue NICHT mehr an — Überlauf ins Postfach, Aktion läuft weiter (SAVE 71)", () => {
    const s = createGame({ name: "Voll" }, content, 1);
    s.settings.autoBank = false; // Überlauf kann nicht in die Bank → landet im Postfach
    // Jeden Slot mit einem Fremd-Item belegen → für normal_log ist nirgends Platz.
    for (let i = 0; i < s.inventory.slots.length; i++) {
      s.inventory.slots[i] = { itemId: "copper_ore", qty: 1 };
    }
    setActiveAction(s, content, "cut_normal_tree"); // Ertrag passt nirgends hin → Postfach
    enqueueAction(s, content, "cut_normal_tree", 2); // wartender Queue-Eintrag
    advance(s, content, 60_000);

    // Kein inventory_full-Stopp mehr: die unbegrenzte aktive Aktion läuft weiter (endet nie von
    // selbst), kein lastStop, der Ertrag wandert ins Postfach.
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.lastStop).toBeNull();
    expect(mailItemCount(s)).toBeGreaterThan(0);
    // Queue UNANGETASTET: die aktive Aktion endet nie von selbst, also schaltet nichts weiter.
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: 2 }]);
  });

  it("(c) Leerlauf + nicht-leere Queue: der Tick startet die erste eingereihte Aktion selbst (enqueue-only-UI)", () => {
    const s = createGame({ name: "Leerlauf" }, content, 1);
    expect(s.activeActionId).toBeNull(); // frisch, nichts läuft
    // NUR enqueuen (KEIN setActiveAction) — genau der Weg der neuen 4er-Grid-Buttons.
    enqueueAction(s, content, "cut_normal_tree", 5);
    expect(s.activeActionId).toBeNull(); // Enqueue allein startet noch nichts

    advance(s, content, TICK_MS); // EIN Leerlauf-Tick zieht die Aktion aus der Queue in die aktive Aktion
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionQueue).toEqual([]);

    advance(s, content, 120_000); // arbeitet die 5 Wiederholungen ab
    expect(itemCount(s.inventory, "normal_log")).toBe(5);
    expect(s.activeActionId).toBeNull(); // planmäßig fertig
  });

  it("(c) advanceActionQueue überspringt gesperrte/unbekannte Einträge und startet den ersten gültigen", () => {
    const s = createGame({ name: "Skip" }, content, 1); // frisch → smithing 1
    // Direkt eine gemischte Queue setzen (simuliert Save-Edit / später gesperrte Aktion):
    s.actionQueue = [
      { kind: "action", actionId: "smelt_bronze", target: 2 }, // gesperrt (braucht Schmieden 5)
      { kind: "action", actionId: "gibt_es_nicht" as never, target: 1 }, // unbekannt
      { kind: "action", actionId: "cut_normal_tree", target: 3 }, // gültig (Level 1)
    ];
    expect(advanceActionQueue(s, content)).toBe(true);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionTarget).toBe(3);
    expect(s.actionQueue).toEqual([]); // alle drei verarbeitet (2 übersprungen, 1 gestartet)
  });

  it("(c) rein ungültige Queue → keine Aktion, kein Hänger (Endlosschutz)", () => {
    const s = createGame({ name: "AllBad" }, content, 1);
    s.actionQueue = [
      { kind: "action", actionId: "smelt_bronze", target: 1 }, // gesperrt
      { kind: "action", actionId: "nope" as never, target: 1 }, // unbekannt
    ];
    expect(advanceActionQueue(s, content)).toBe(false);
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue).toEqual([]); // erschöpft (beide übersprungen), keine Endlosschleife
  });

  it("manuelles setActiveAction lässt die Queue UNANGETASTET (setzt später fort)", () => {
    const s = smith();
    enqueueAction(s, content, "cut_normal_tree", 2);
    setActiveAction(s, content, "cut_normal_tree", 1); // Spieler startet selbst etwas
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: 2 }]); // Queue bleibt
    // manueller Stopp lässt die Queue ebenfalls stehen (sie läuft nicht von selbst wieder an).
    setActiveAction(s, content, null);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: 2 }]);
  });
});

describe("Action-Queue: Stapeln beim Einreihen (enqueueAction)", () => {
  it("(a) 5× enqueue derselben Aktion mit endlichem Ziel → EIN gestapelter Eintrag (50→250)", () => {
    const s = smith();
    for (let i = 0; i < 5; i++) expect(enqueueAction(s, content, "mine_tin", 50)).toBe(true);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "mine_tin", target: 250 }]);
  });

  it("(b) gleiche Aktion, aber NICHT benachbart (fremder Eintrag dazwischen) → stapelt NICHT", () => {
    const s = smith();
    enqueueAction(s, content, "mine_tin", 50);
    enqueueAction(s, content, "mine_copper", 25);
    enqueueAction(s, content, "mine_tin", 50); // letzter ≠ erster (mine_copper liegt dazwischen)
    // Stapel-Regel greift nur für den unmittelbar letzten Eintrag ⇒ drei getrennte Einträge.
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "mine_tin", target: 50 },
      { kind: "action", actionId: "mine_copper", target: 25 },
      { kind: "action", actionId: "mine_tin", target: 50 },
    ]);
  });

  it("(c) ∞ (null) bricht das Stapeln — davor wie danach ein neuer Eintrag", () => {
    const s = smith();
    enqueueAction(s, content, "mine_tin", 50);
    enqueueAction(s, content, "mine_tin", null); // ∞ nach endlich → neuer Eintrag (kein Merge)
    enqueueAction(s, content, "mine_tin", 50); // endlich nach ∞ → neuer Eintrag (letztes Ziel ist null)
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "mine_tin", target: 50 },
      { kind: "action", actionId: "mine_tin", target: null },
      { kind: "action", actionId: "mine_tin", target: 50 },
    ]);
  });

  it("Stapeln klemmt gegen die Obergrenze (QTY_HARD_CAP-Spiegel, kein Überlauf)", () => {
    const s = smith();
    enqueueAction(s, content, "mine_tin", 900_000_000);
    enqueueAction(s, content, "mine_tin", 900_000_000); // Summe 1,8e9 > Cap 1e9 → geklemmt
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "mine_tin", target: 1_000_000_000 }]);
  });
});

describe("Action-Queue: no_materials überspringt & schaltet weiter (Skip-Semantik)", () => {
  it("(d) material-lose Queue-Aktion wird übersprungen, die nächste (mit Material) startet", () => {
    const s = smith(); // Schmieden 5, aber KEIN Erz im Inventar → smelt_bronze ohne Material
    setActiveAction(s, content, "smelt_bronze", 5); // will 5 Bronze, hat aber kein Material
    enqueueAction(s, content, "cut_normal_tree", 3); // Sammeln braucht keine Inputs → läuft immer
    advance(s, content, 120_000);

    expect(itemCount(s.inventory, "bronze_bar")).toBe(0); // nie geschmolzen (no_materials)
    expect(itemCount(s.inventory, "normal_log")).toBe(3); // übersprungen → nächste Aktion lief
    expect(s.activeActionId).toBeNull(); // Queue danach erschöpft → sauber gestoppt
    expect(s.actionQueue).toEqual([]);
    expect(s.lastStop).toBeNull(); // Queue lief kontinuierlich weiter (planmäßiges Ziel-Ende)
  });

  it("(e) ALLE Einträge material-los → sauber idle ohne Hänger (Endlosschutz)", () => {
    const s = smith(); // kein Erz → weder smelt_bronze noch smelt_copper haben Material
    setActiveAction(s, content, "smelt_bronze"); // aktiv, ∞, kein Material
    enqueueAction(s, content, "smelt_copper", 5); // kein Material
    enqueueAction(s, content, "smelt_bronze", 5); // kein Material
    advance(s, content, 120_000);

    expect(itemCount(s.inventory, "bronze_bar")).toBe(0);
    expect(itemCount(s.inventory, "copper_bar")).toBe(0);
    expect(s.activeActionId).toBeNull(); // alle drei material-los abgeräumt → idle
    expect(s.actionQueue).toEqual([]);
    // Der zuletzt erschöpfte Eintrag hinterlässt genau EINEN no_materials-Breadcrumb (kein Loop).
    expect(s.lastStop).toEqual({ actionId: "smelt_bronze", reason: "no_materials" });
  });

  it("enqueue nimmt material-lose Aktionen BEDINGUNGSLOS auf (kein Material-Check beim Einreihen)", () => {
    const s = smith(); // kein Erz vorhanden
    expect(enqueueAction(s, content, "smelt_bronze", 5)).toBe(true); // trotzdem eingereiht
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "smelt_bronze", target: 5 }]);
  });
});

describe("Action-Queue: Offline-Determinismus (Kernanforderung)", () => {
  it("(e) 100 Abschlüsse über eine Queue: online getickt == offline in einem Rutsch", () => {
    const build = () => {
      const s = createGame({ name: "Det" }, content, 12345);
      s.skills.smithing = { xp: xpForLevel(5) };
      addItem(s.inventory, content, "copper_ore", 500);
      addItem(s.inventory, content, "tin_ore", 500);
      setActiveAction(s, content, "smelt_bronze", 40); // aktiv: 40 Bronze
      enqueueAction(s, content, "cut_normal_tree", 30); // dann 30 Logs
      enqueueAction(s, content, "smelt_bronze", 30); // dann 30 Bronze (Summe > 100 Abschlüsse)
      return s;
    };
    const online = build();
    const offline = build();
    const totalMs = 20 * 60 * 1000; // 20 min — genug für alle Abschlüsse

    for (let t = 0; t < totalMs; t += TICK_MS) advance(online, content, TICK_MS); // Tick für Tick
    advance(offline, content, totalMs, { offline: true }); // ein Rutsch (Offline-Catch-up)

    // Bekannte, queue-FREMDE Artefakte angleichen, bevor der Rest bit-genau verglichen wird:
    //  • activePlayMs zählt offline bewusst NICHT (Offline-Zeit ist keine Spielzeit);
    //  • createdAt stempelt Date.now() je createGame → die zwei build()-Aufrufe liegen ms auseinander;
    //  • achievements/quests werden im Live-Loop tick-inkrementell, offline im Batch freigeschaltet —
    //    dieselbe MENGE, andere Reihenfolge (bestehendes Verhalten der once-per-advance-Checks).
    online.activePlayMs = offline.activePlayMs;
    online.character.createdAt = offline.character.createdAt;
    // Elite-/World-Spawns (SAVE 72, design/elite-spawns-concept.md §1.3, Chef-Entscheid „Online-/
    // Aktiv-Feature"): der Zonen-Zyklus tickt bewusst NUR online — über 20 Min Live-Loop können
    // eliteZones/eliteRng/eliteSpawnSeq/lastEliteSpawn dadurch weiterlaufen (seit content-dev Phase 2
    // reale Varianten liefert, kann ein Zonen-Fenster innerhalb dieses Fensters sogar tatsächlich
    // spawnen — Pastures' Früh-Haken liegt bei ~15–25 Min), im Offline-Catch-up bleiben ALLE FÜNF
    // Felder eingefroren. Das ist KEIN Bruch des offline==online-Gesetzes (das gilt für die KERN-
    // Progression: RNG/Mastery/Inventar/Skills/Queue, unverändert unten geprüft) — für DIESEN
    // Full-State-Vergleich alle fünf bewusst-online-only-Felder angleichen. `eliteCodex`
    // („Jagd-Paket" S2/M, selber v72-Bump) zählt `sightings` bei jedem Spawn (`spawnElite`) —
    // dieselbe Online-only-Asymmetrie wie `eliteZones`, daher hier mit angeglichen.
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
    // Kern der Anforderung: RNG, Mastery, Inventar, Skills, Gold, aktive Aktion UND Queue sind
    // nach 100 Queue-Abschlüssen bit-identisch — egal ob live getickt oder offline verrechnet.
    expect(offline).toEqual(online);

    // Sanity: die komplette Queue lief durch (aktive Aktion + beide Queue-Einträge), danach gestoppt.
    // (Exakte Loot-Mengen variieren durch Mastery-Doppelertrag — hier nur „lief bis zum Ende".)
    expect(offline.activeActionId).toBeNull();
    expect(offline.actionQueue).toEqual([]);
    expect(itemCount(offline.inventory, "bronze_bar")).toBeGreaterThanOrEqual(70);
    expect(itemCount(offline.inventory, "normal_log")).toBeGreaterThanOrEqual(30);
  });
});
