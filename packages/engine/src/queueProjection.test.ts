import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { TICK_MS } from "@hearthforge/shared";
import { createGame } from "./state";
import {
  advanceActionQueue,
  dequeueAction,
  enqueueAction,
  enqueueActionAtFront,
  prioritizeQueueEntry,
  setActiveAction,
} from "./actions";
import { addItem, itemCount } from "./inventory";
import {
  actionInputsOnHand,
  materialStatus,
  projectQueue,
  projectedMaterials,
  projectedProducers,
  projectedRuns,
} from "./queueProjection";
import { advance } from "./tick";

/**
 * Chef-Auftrag 27.08.2026 (wörtlich): „wenn ich in der Queue Copper Vein 650× habe, aber im
 * Inventar 0, kann ich Smelt Copper nicht starten. ABER das Spiel sollte merken: … die Queue ist
 * 650× Copper, also dürfte er danach 650× Kupfer verarbeiten können … Gelb (werde haben). Wenn ich
 * dann Copper aus der Queue rausnehme und Smelt Copper wäre dran, wird einfach übersprungen."
 *
 * Content-Fakten: mine_copper (Bergbau 1, 3 s) → copper_ore ×1 sicher (+ rough_garnet 1 %);
 * smelt_copper (Schmieden 1, 2,6 s) 1 copper_ore → 1 copper_bar; smelt_bronze (Schmieden 5)
 * 1 copper_ore + 1 tin_ore → 1 bronze_bar.
 */
function fresh(seed = 1) {
  const s = createGame({ name: "Projektion" }, content, seed);
  // Frischer State hat kein Erz — genau die Chef-Situation (Inventar 0).
  expect(itemCount(s.inventory, "copper_ore")).toBe(0);
  expect(s.bank["copper_ore"]).toBeUndefined();
  return s;
}

describe("Warteschlangen-Projektion: projectedRuns / materialStatus", () => {
  it("(a) Kupferader ×650 in der Queue, Inventar 0 → Kupfer schmelzen 650 Läufe, Status will_have", () => {
    const s = fresh();
    enqueueAction(s, content, "mine_copper", 650);
    expect(actionInputsOnHand(s, content.actions["smelt_copper"]!)).toBe(false); // JETZT nicht startbar
    expect(projectedRuns(s, content, "smelt_copper")).toBe(650);
    expect(materialStatus(s, content, "smelt_copper")).toEqual([
      { itemId: "copper_ore", qty: 1, have: 0, projected: 650, status: "will_have" },
    ]);
    // Tooltip-Quelle: woher kommt das Erz?
    const producers = projectedProducers(projectQueue(s, content), "copper_ore");
    expect(producers).toEqual([{ actionId: "mine_copper", source: 0, qty: 650 }]);
  });

  it("(b) Kupferader ∞ → infinite", () => {
    const s = fresh();
    enqueueAction(s, content, "mine_copper", null);
    expect(projectedRuns(s, content, "smelt_copper")).toBe("infinite");
    expect(projectedMaterials(s, content).get("copper_ore")).toBe("infinite");
    expect(materialStatus(s, content, "smelt_copper")[0]?.status).toBe("will_have");
    // Ein ∞-Verbraucher hinter dem ∞-Produzenten bleibt ∞ (und macht das Barren-Konto ∞).
    enqueueAction(s, content, "smelt_copper", null);
    expect(projectedMaterials(s, content).get("copper_bar")).toBe("infinite");
  });

  it("(c) zwei Verbraucher hintereinander teilen sich die Ausgabe — der zweite bekommt den Rest", () => {
    const s = fresh();
    enqueueAction(s, content, "mine_copper", 650);
    enqueueAction(s, content, "smelt_copper", 400);
    // Als neuer Eintrag hinter der Kette: 650 − 400 = 250 übrig.
    expect(projectedRuns(s, content, "smelt_copper")).toBe(250);
    // An Position 1 (VOR dem Schmelz-Eintrag) wären es noch alle 650.
    expect(projectedRuns(s, content, "smelt_copper", 1)).toBe(650);
    // Ein dritter Verbraucher über den Rest hinaus: nur 250 seiner 300 laufen.
    enqueueAction(s, content, "smelt_bronze", 300);
    const p = projectQueue(s, content);
    expect(p.links.map((l) => [l.actionId, l.runs, l.status])).toEqual([
      ["mine_copper", 650, "none"],
      ["smelt_copper", 400, "will_have"],
      ["smelt_bronze", 0, "missing"], // kein Zinn → auch mit Kupfer kein Lauf
    ]);
    expect(p.materials.get("copper_ore")).toBe(250);
    expect(p.materials.get("copper_bar")).toBe(400);
  });

  it("(d) ohne Produzenten → missing / 0 Läufe", () => {
    const s = fresh();
    enqueueAction(s, content, "cut_normal_tree", 10); // liefert Holz, kein Erz
    expect(projectedRuns(s, content, "smelt_copper")).toBe(0);
    expect(materialStatus(s, content, "smelt_copper")).toEqual([
      { itemId: "copper_ore", qty: 1, have: 0, projected: 0, status: "missing" },
    ]);
  });

  it("(e) die LAUFENDE Aktion zählt als Produzent (Rest-Ziel; null = ∞)", () => {
    const s = fresh();
    setActiveAction(s, content, "mine_copper", 650);
    expect(projectedRuns(s, content, "smelt_copper")).toBe(650);
    expect(projectQueue(s, content).links[0]?.source).toBe("active");
    // Ein paar Ticks später: Rest-Ziel sinkt, der Bestand steigt — die Summe bleibt 650.
    advance(s, content, 3000 * 4 + TICK_MS);
    expect(s.actionTarget).toBeLessThan(650);
    expect(projectedRuns(s, content, "smelt_copper")).toBe(650);

    const inf = fresh();
    setActiveAction(inf, content, "mine_copper", null);
    expect(projectedRuns(inf, content, "smelt_copper")).toBe("infinite");
  });

  it("nur SICHERE Ausgaben zählen: chance < 1 nicht, Kampf-Einträge nicht, Thieving nicht", () => {
    const s = fresh();
    enqueueAction(s, content, "mine_copper", 100);
    const m = projectedMaterials(s, content);
    expect(m.get("copper_ore")).toBe(100);
    expect(m.get("rough_garnet") ?? 0).toBe(0); // 1-%-Beute ist keine Zusage
    // Kampf-Eintrag mitten in der Kette: wird ignoriert, verbraucht/liefert nichts.
    s.actionQueue.splice(0, 0, { kind: "fight", actionId: "", monsterId: "chicken", target: 5 });
    expect(projectedRuns(s, content, "smelt_copper")).toBe(100);
    // Thieving (Erfolgswurf) liefert keine sichere Ausgabe.
    const thief = Object.values(content.actions).find((a) => a.successBase !== undefined && a.loot.some((l) => l.chance >= 1));
    if (thief) {
      const t = fresh();
      t.skills[thief.skill] = { xp: 1e9 };
      enqueueAction(t, content, thief.id, 50);
      const sure = thief.loot.find((l) => l.chance >= 1)!;
      expect(projectedMaterials(t, content).get(sure.itemId) ?? 0).toBe(0);
    }
  });

  it("Glied-Status: have (Bestand), will_have (nur Projektion), missing (wird übersprungen)", () => {
    const s = fresh();
    addItem(s.inventory, content, "copper_ore", 10);
    enqueueAction(s, content, "smelt_copper", 10); // frisst den echten Bestand
    enqueueAction(s, content, "mine_copper", 650); // Produzent
    enqueueAction(s, content, "smelt_copper", 5); // nur noch über die Ader gedeckt (Stapel-Regel greift nicht: anderer Nachbar)
    const links = projectQueue(s, content).links;
    expect(links.map((l) => l.status)).toEqual(["have", "none", "will_have"]);

    const t = fresh();
    addItem(t.inventory, content, "copper_ore", 10);
    enqueueAction(t, content, "smelt_copper", 10);
    enqueueAction(t, content, "cut_normal_tree", 1);
    enqueueAction(t, content, "smelt_copper", 10); // Bestand ist dann weg, kein Produzent
    expect(projectQueue(t, content).links.map((l) => l.status)).toEqual(["have", "none", "missing"]);
  });

  it("Chip-Status auf der Karte: grün = echter Bestand reicht JETZT (auch wenn die Queue ihn später frisst)", () => {
    const s = fresh();
    addItem(s.inventory, content, "copper_ore", 10);
    enqueueAction(s, content, "smelt_copper", 10);
    // Die ehrliche Zahl bleibt 10/1 → have; projiziert ist danach 0 (der Knopf bleibt wie heute klickbar).
    expect(materialStatus(s, content, "smelt_copper")[0]).toEqual({
      itemId: "copper_ore", qty: 1, have: 10, projected: 0, status: "have",
    });
    expect(projectedRuns(s, content, "smelt_copper")).toBe(0);
  });

  it("ist rein lesend: State bleibt bit-identisch, kein RNG-Zug", () => {
    const s = fresh();
    addItem(s.inventory, content, "tin_ore", 3);
    enqueueAction(s, content, "mine_copper", 650);
    enqueueAction(s, content, "smelt_bronze", 5);
    const before = JSON.stringify(s);
    projectQueue(s, content);
    projectedRuns(s, content, "smelt_copper");
    materialStatus(s, content, "smelt_bronze");
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("Queue-Start ohne Material: sauber überspringen UND melden (lastQueueSkip no_materials)", () => {
  it("Chef-Szenario: Ader ×650 + Schmelzen ×650 eingereiht, Ader entfernt → Schmelzen wird beim Anlauf übersprungen", () => {
    const s = fresh();
    enqueueAction(s, content, "mine_copper", 650);
    enqueueAction(s, content, "smelt_copper", 650); // vorgeplant über die Projektion („gelb")
    dequeueAction(s, 0); // der Spieler nimmt die Ader wieder raus
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "smelt_copper", target: 650 }]);

    advance(s, content, TICK_MS * 3); // Leerlauf → advanceActionQueue → kein Erz → Skip
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue).toEqual([]);
    expect(s.lastQueueSkip).toEqual({ monsterId: "", actionId: "smelt_copper", reason: "no_materials" });
    expect(itemCount(s.inventory, "copper_bar")).toBe(0);
  });

  it("die Kette läuft weiter: der Eintrag NACH dem übersprungenen startet im selben Anlauf", () => {
    const s = fresh();
    enqueueAction(s, content, "smelt_copper", 5); // kein Erz
    enqueueAction(s, content, "cut_normal_tree", 2);
    expect(advanceActionQueue(s, content)).toBe(true);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.lastQueueSkip).toEqual({ monsterId: "", actionId: "smelt_copper", reason: "no_materials" });
  });

  it("mit Produzent davor läuft die Kette durch — kein Skip, Barren kommen an (offline == online)", () => {
    const run = (chunkMs: number) => {
      const s = fresh(7);
      s.character.createdAt = 0; // Wallclock-Stempel aus createGame, kein Sim-Wert → für den Vergleich nullen
      enqueueAction(s, content, "mine_copper", 3);
      enqueueAction(s, content, "smelt_copper", 3);
      const total = 60_000;
      for (let t = 0; t < total; t += chunkMs) advance(s, content, Math.min(chunkMs, total - t));
      return s;
    };
    const online = run(TICK_MS * 3);
    const offline = run(60_000);
    expect(itemCount(online.inventory, "copper_bar")).toBe(3);
    expect(online.lastQueueSkip).toBeNull();
    expect(online.actionQueue).toEqual([]);
    expect(JSON.stringify(online)).toBe(JSON.stringify(offline));
  });

  it("Sofort-Start braucht echten Bestand: enqueueActionAtFront lehnt ab, prioritizeQueueEntry konsumiert nicht", () => {
    const s = fresh();
    setActiveAction(s, content, "cut_normal_tree", 100);
    enqueueAction(s, content, "mine_copper", 650);
    enqueueAction(s, content, "smelt_copper", 650);
    const before = JSON.stringify(s);
    expect(enqueueActionAtFront(s, content, "smelt_copper", 10)).toBe(false);
    expect(prioritizeQueueEntry(s, content, 1)).toBe(false);
    expect(JSON.stringify(s)).toBe(before); // nichts unterbrochen, nichts konsumiert
    // Mit Bestand geht der Sofort-Start wie gehabt.
    addItem(s.inventory, content, "copper_ore", 1);
    expect(prioritizeQueueEntry(s, content, 1)).toBe(true);
    expect(s.activeActionId).toBe("smelt_copper");
  });
});
