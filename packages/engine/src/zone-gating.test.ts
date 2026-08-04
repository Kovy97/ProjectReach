import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, QuestDef, ZoneDef } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat } from "./combat";
import { canFightMonster, worldTaskMonsters } from "./slayer";
import { isZoneUnlocked } from "./zones";
import { isDungeonUnlocked } from "./dungeon";
import { evaluateQuests, objectiveProgress, questObjectivesMet } from "./quests";

/**
 * Story-Zonen-Gating + reach_paragon_floor (Aschechronik, ceo-run-2026-07-13 Welle C):
 *  - Zieltyp `reach_paragon_floor` liest den Etagen-Höchststand `state.paragon.best`
 *    (monoton — Tod-Reset senkt nur den checkpoint, nie den Rekord).
 *  - `isZoneUnlocked`: kein Gate / Gate+Quest fertig / Gate+Quest offen / Legacy-Grant.
 *  - Kampf-Start-Hard-Block: startCombat (via canFightMonster) verweigert Monster
 *    quest-gesperrter Zonen — kein Throw, einfach false wie andere Validierungen dort.
 *  - NEUTRALITÄT: ohne `requiresQuest` im Content läuft alles exakt wie heute.
 */

const GATE_QUEST: QuestDef = {
  id: "q_gate_pastures",
  name: { en: "Gate", de: "Tor" },
  description: { en: "", de: "" },
  objectives: [{ type: "kill_total", count: 5 }],
  rewards: { gold: 10 },
};

/**
 * Content-Klon: NUR die Weiden-Zone quest-gated (Muster Welle C) + Gate-Quest im Katalog.
 * Setzt bewusst JEDE ANDERE Zone auf `requiresQuest: undefined` zurück — sonst würden die
 * ECHTEN Aschechronik-Gates (Welle D2, z.B. borderlands→chronicle_03) durchsickern, deren
 * Gate-Quests hier gar nicht existieren (`quests` ist auf `[GATE_QUEST]` reduziert) und die
 * Zonen so PERMANENT unlösbar sperren würden — diese Fixture testet isoliert nur EIN Gate.
 */
function gatedContent(): ContentDB {
  const zones: ZoneDef[] = content.zones.map((z) =>
    z.id === "pastures" ? { ...z, requiresQuest: GATE_QUEST.id } : { ...z, requiresQuest: undefined },
  );
  return { ...content, zones, quests: [GATE_QUEST] };
}

describe("reach_paragon_floor (Zieltyp Kapitel 21)", () => {
  const paragonQuest: QuestDef = {
    id: "q_paragon_5",
    name: { en: "Second Volume", de: "Zweiter Band" },
    description: { en: "", de: "" },
    objectives: [{ type: "reach_paragon_floor", count: 5 }],
    rewards: { gold: 100 },
  };
  const c: ContentDB = { ...content, quests: [paragonQuest] };

  it("liest den Etagen-Höchststand state.paragon.best (unter der Schwelle: nicht erfüllt)", () => {
    const s = createGame({ name: "Test" }, c, 1);
    expect(objectiveProgress(s, c, paragonQuest.objectives[0]!)).toBe(0);
    s.paragon.best = 3;
    expect(objectiveProgress(s, c, paragonQuest.objectives[0]!)).toBe(3);
    expect(questObjectivesMet(s, c, paragonQuest)).toBe(false);
  });

  it("erfüllt, sobald der Höchststand ≥ count ist — evaluateQuests markiert claimbar", () => {
    const s = createGame({ name: "Test" }, c, 1);
    s.paragon.best = 5;
    expect(questObjectivesMet(s, c, paragonQuest)).toBe(true);
    evaluateQuests(s, c);
    expect(s.quests.completed).toContain("q_paragon_5");
  });

  it("monoton/kumulativ: der Tod-Reset (checkpoint 0) senkt den Fortschritt nicht", () => {
    const s = createGame({ name: "Test" }, c, 1);
    s.paragon = { checkpoint: 0, best: 7 }; // nach Tod im Turm: Rekord bleibt
    expect(objectiveProgress(s, c, paragonQuest.objectives[0]!)).toBe(7);
    expect(questObjectivesMet(s, c, paragonQuest)).toBe(true);
  });
});

describe("isZoneUnlocked (Story-Zonen-Gate)", () => {
  it("Zone ohne requiresQuest ist immer offen (heutiges Verhalten)", () => {
    const c = gatedContent();
    const s = createGame({ name: "Test" }, c, 1);
    expect(isZoneUnlocked(s, c, "borderlands")).toBe(true);
    // Unbekannte Zonen-ID: defensiv offen (kein Gate kann aus Versehen entstehen).
    expect(isZoneUnlocked(s, c, "no_such_zone")).toBe(true);
  });

  it("Gate + Quest offen ⇒ gesperrt", () => {
    const c = gatedContent();
    const s = createGame({ name: "Test" }, c, 1);
    expect(isZoneUnlocked(s, c, "pastures")).toBe(false);
  });

  it("Gate + Quest eingelöst (claimed) ⇒ offen", () => {
    const c = gatedContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.quests.claimed.push(GATE_QUEST.id);
    expect(isZoneUnlocked(s, c, "pastures")).toBe(true);
  });

  it("Gate + Objectives erfüllt (completed, noch nicht eingelöst) ⇒ offen (Story-Beat zählt)", () => {
    const c = gatedContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.stats.kills = 5;
    evaluateQuests(s, c);
    expect(s.quests.completed).toContain(GATE_QUEST.id);
    expect(isZoneUnlocked(s, c, "pastures")).toBe(true);
  });

  it("Legacy-Grant (Bestandsschutz, v63-Migration) ⇒ offen trotz offener Quest", () => {
    const c = gatedContent();
    const s = createGame({ name: "Veteran" }, c, 1);
    s.legacyZoneGrants["pastures"] = true;
    expect(isZoneUnlocked(s, c, "pastures")).toBe(true);
  });
});

describe("Kampf-Start-Hard-Block in gesperrter Zone", () => {
  it("Fixture-Annahme: chicken lebt in der Weiden-Zone", () => {
    expect(content.monsters["chicken"]?.zone).toBe("pastures");
  });

  it("canFightMonster/startCombat verweigern Monster einer gesperrten Zone (kein Throw)", () => {
    const c = gatedContent();
    const s = createGame({ name: "Test" }, c, 1);
    expect(canFightMonster(s, c, "chicken")).toBe(false);
    expect(startCombat(s, c, "chicken")).toBe(false);
    expect(s.combat.monsterId).toBe(null);
  });

  it("nach Quest-Abschluss startet der Kampf normal", () => {
    const c = gatedContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.quests.claimed.push(GATE_QUEST.id);
    expect(canFightMonster(s, c, "chicken")).toBe(true);
    expect(startCombat(s, c, "chicken")).toBe(true);
    expect(s.combat.monsterId).toBe("chicken");
  });

  it("Legacy-Grant öffnet den Kampf-Start ohne Quest", () => {
    const c = gatedContent();
    const s = createGame({ name: "Veteran" }, c, 1);
    s.legacyZoneGrants["pastures"] = true;
    expect(startCombat(s, c, "chicken")).toBe(true);
    expect(s.combat.monsterId).toBe("chicken");
  });

  it("ECHTER KATALOG: pastures bleibt ungegatet, borderlands ist an chronicle_03 gebunden (Welle D2)", () => {
    // Ersetzt die alte NEUTRALITÄTS-Pin (Content trug bis Welle D2 nirgends requiresQuest —
    // das war der Punkt, bis die Aschechronik-Gates real eingetragen wurden). Jetzt pinnt dieser
    // Test das ECHTE Verhalten: erste Zone frei, erste gegatete Zone hängt am erwarteten Kapitel.
    // Das vollständige Zonen→Kapitel-Mapping pinnt der Block "Aschechronik: Zonen-Gate-Mapping" unten.
    const s = createGame({ name: "Test" }, content, 1);
    expect(canFightMonster(s, content, "chicken")).toBe(true);
    expect(startCombat(s, content, "chicken")).toBe(true);
    expect(content.monsters["goblin"]?.zone).toBe("borderlands");
    expect(canFightMonster(s, content, "goblin")).toBe(false);
    s.quests.claimed.push("chronicle_03");
    expect(canFightMonster(s, content, "goblin")).toBe(true);
  });

  it("Welt-Task-Pool: Monster gesperrter Zonen fliegen raus (kein Soft-Lock-Task), Pool bleibt nutzbar", () => {
    const c = gatedContent();
    const s = createGame({ name: "Test" }, c, 1);
    const locked = worldTaskMonsters(s, c);
    expect(locked.length).toBeGreaterThan(0); // Fallback greift — nie ein leerer Pool durch das Gate
    expect(locked.every((id) => c.monsters[id]?.zone !== "pastures")).toBe(true);
    // Nach Freischaltung ist der Pool wieder ungefiltert (identisch zum Verhalten ohne Gate).
    s.quests.claimed.push(GATE_QUEST.id);
    expect(worldTaskMonsters(s, c)).toEqual(worldTaskMonsters(createGame({ name: "Test" }, content, 1), content));
  });
});

/**
 * Aschechronik-Zonen-Gates (Welle D2, 2026-07-13): jede Zone (außer der ersten `pastures` und
 * dem eigenständigen `slayer_tower`) öffnet mit Abschluss des LETZTEN Aschechronik-Kapitels der
 * VORHERIGEN Zone (design/lore/aschechronik-spec.md §1-Progressionstabelle). Der Paragonturm hat
 * keinen ZoneDef-Eintrag (eigenes Unlock-System über `paragon_key`, kein Gate).
 */
describe("Aschechronik: Zonen-Gate-Mapping (Welle D2, gepinnt)", () => {
  const EXPECTED_ZONE_GATES: Record<string, string | undefined> = {
    pastures: undefined,
    borderlands: "chronicle_03",
    ashfields: "chronicle_04",
    blackthorn: "chronicle_07",
    crypt: "chronicle_09",
    wildwood: "chronicle_11",
    coast: "chronicle_13",
    slagpit: "chronicle_14",
    highlands: "chronicle_15",
    idolhall: "chronicle_18",
    slayer_tower: undefined,
  };

  it("jede Zone trägt exakt das erwartete Gate (oder keins) — Content-Drift-Guard", () => {
    // Keine unerwarteten neuen/fehlenden Zonen (sonst würde eine künftige Zone unbemerkt
    // ungegatet oder das Mapping unten stumm falsch werden).
    expect(content.zones.map((z) => z.id).sort()).toEqual(Object.keys(EXPECTED_ZONE_GATES).sort());
    for (const [zoneId, expected] of Object.entries(EXPECTED_ZONE_GATES)) {
      const zone = content.zones.find((z) => z.id === zoneId);
      expect(zone, `Zone ${zoneId} fehlt im Content`).toBeDefined();
      expect(zone!.requiresQuest, `Zone ${zoneId}: Gate stimmt nicht mit dem Spec-Mapping überein`).toBe(expected);
    }
  });

  it("jedes Gate zeigt auf eine existierende chronicle_*-Quest", () => {
    for (const zone of content.zones) {
      if (!zone.requiresQuest) continue;
      expect(
        content.quests.some((q) => q.id === zone.requiresQuest),
        `Zone ${zone.id}: Gate-Quest ${zone.requiresQuest} existiert nicht im Quest-Katalog`,
      ).toBe(true);
    }
  });
});

/**
 * Aschechronik-Dungeon-Gates (Welle K, 2026-07-13, Chef-Direktive "Gebiet für Gebiet, Dungeon um
 * Dungeon"): die 7 Story-Dungeons tragen jetzt requiresQuest statt Schlüssel-Items. Muster: das
 * LETZTE Gebietskapitel VOR dem Boss-Kapitel schaltet den Dungeon frei; das Boss-Kapitel selbst
 * tötet den Dungeon-Endboss (und schaltet — wo vorhanden — Zone/nächsten Dungeon frei). Der
 * Paragonturm bleibt ohne Gate (eigenes Einmal-Unlock-System über `paragon_key`).
 */
describe("Aschechronik: Dungeon-Gate-Mapping (Welle K, gepinnt)", () => {
  const EXPECTED_DUNGEON_GATES: Record<string, string | undefined> = {
    goblin_warband: "chronicle_04",
    crypt_depths: "chronicle_10",
    wildwood_hunt: "chronicle_12",
    highland_aerie: "chronicle_16",
    wyvern_lair: "chronicle_17",
    idol_sanctum: "chronicle_18",
    behind_the_throne: "chronicle_19",
    paragon_tower: undefined,
  };

  it("jeder Dungeon trägt exakt das erwartete Gate (oder keins) — Content-Drift-Guard", () => {
    // Keine unerwarteten neuen/fehlenden Dungeons (sonst würde ein künftiger Dungeon unbemerkt
    // ungegatet oder das Mapping unten stumm falsch werden).
    expect(content.dungeons.map((d) => d.id).sort()).toEqual(Object.keys(EXPECTED_DUNGEON_GATES).sort());
    for (const [dungeonId, expected] of Object.entries(EXPECTED_DUNGEON_GATES)) {
      const dungeon = content.dungeons.find((d) => d.id === dungeonId);
      expect(dungeon, `Dungeon ${dungeonId} fehlt im Content`).toBeDefined();
      expect(dungeon!.requiresQuest, `Dungeon ${dungeonId}: Gate stimmt nicht mit dem Spec-Mapping überein`).toBe(
        expected,
      );
    }
  });

  it("jedes Gate zeigt auf eine existierende chronicle_*-Quest", () => {
    for (const dungeon of content.dungeons) {
      if (!dungeon.requiresQuest) continue;
      expect(
        content.quests.some((q) => q.id === dungeon.requiresQuest),
        `Dungeon ${dungeon.id}: Gate-Quest ${dungeon.requiresQuest} existiert nicht im Quest-Katalog`,
      ).toBe(true);
    }
  });

  it("Key-Purge vollständig: keyItem ist auf allen 7 Story-Dungeons entfernt (Paragonturm ausgenommen)", () => {
    for (const dungeon of content.dungeons) {
      if (dungeon.id === "paragon_tower") continue;
      expect(dungeon.keyItem, `Dungeon ${dungeon.id}: keyItem sollte entfernt sein (Key-Purge Welle K)`).toBeUndefined();
      expect(dungeon.keysPerRun, `Dungeon ${dungeon.id}: keysPerRun sollte entfernt sein (Key-Purge Welle K)`).toBeUndefined();
    }
    expect(content.dungeons.find((d) => d.id === "paragon_tower")?.keyItem).toBe("paragon_key");
  });
});

/**
 * Deadlock-Guard (Welle D2, wichtigster neue Test dieser Welle; Welle K erweitert um Dungeons):
 * rollt die 21-Kapitel-Kette sequenziell ab — genau wie ein realer Spieler, der Kapitel N erst
 * erreicht, nachdem Kapitel N-1 (und damit alle vorherigen) claimed ist — und prüft für JEDES
 * Kapitel, dass alle seine kill_monster-Ziele zu diesem Zeitpunkt erreichbar sind: die Zone muss
 * offen sein, und ein `dungeonOnly`-Monster braucht zusätzlich seinen Heimat-Dungeon offen (der
 * Dungeon selbst erbt kein Kohärenz-Freipass — er hängt an SEINEM eigenen requiresQuest). Ein
 * Verstoß wäre ein Soft-Lock: eine Quest, die ein Monster verlangt, das zu diesem Zeitpunkt der
 * Kette noch nicht erreichbar ist.
 */
describe("Aschechronik: Deadlock-Guard (Welle D2, Welle K)", () => {
  const CHAPTER_IDS = Array.from({ length: 21 }, (_, i) => `chronicle_${String(i + 1).padStart(2, "0")}`);

  // Heimat-Dungeon je dungeonOnly-Monster: über die encounters-Arrays aufgelöst (dg_-Präfix wie
  // killCreditMonsterId gestrippt), damit last_idol/drazhan & Co. auf ihren echten Dungeon zeigen.
  function monsterHomeDungeon(monsterId: string): string | undefined {
    for (const dungeon of content.dungeons) {
      for (const enc of dungeon.encounters) {
        const credited = enc.startsWith("dg_") && content.monsters[enc.slice(3)] ? enc.slice(3) : enc;
        if (credited === monsterId) return dungeon.id;
      }
    }
    return undefined;
  }

  it("jedes Kapitel ist mit den bis dahin freigeschalteten Zonen/Dungeons lösbar (keine Soft-Locks)", () => {
    // Start: alle Zonen/Dungeons OHNE requiresQuest sind von Anfang an offen (pastures, slayer_tower;
    // bei Dungeons real nur der Paragonturm, der ohnehin nie ein kill_monster-Ziel trägt).
    const unlockedZones = new Set(content.zones.filter((z) => !z.requiresQuest).map((z) => z.id));
    const unlockedDungeons = new Set(content.dungeons.filter((d) => !d.requiresQuest).map((d) => d.id));
    const violations: string[] = [];

    for (const chapterId of CHAPTER_IDS) {
      const quest = content.quests.find((q) => q.id === chapterId);
      if (!quest) {
        violations.push(`${chapterId}: Quest fehlt im Katalog`);
        continue;
      }
      // requires-Kette-Sanity: jedes Kapitel (außer dem ersten) muss exakt sein Vorkapitel verlangen.
      const idx = CHAPTER_IDS.indexOf(chapterId);
      if (idx === 0) {
        expect(quest.requires ?? [], `${chapterId}: erstes Kapitel darf keine requires haben`).toEqual([]);
      } else {
        expect(quest.requires, `${chapterId}: requires-Kette gebrochen`).toEqual([CHAPTER_IDS[idx - 1]]);
      }
      for (const obj of quest.objectives) {
        if (obj.type !== "kill_monster") continue;
        const ids = new Set<string>(obj.targets ?? []);
        if (obj.target) ids.add(obj.target);
        for (const monsterId of ids) {
          const monster = content.monsters[monsterId];
          if (!monster) {
            violations.push(`${chapterId}: Monster ${monsterId} existiert nicht`);
            continue;
          }
          if (monster.zone && !unlockedZones.has(monster.zone)) {
            violations.push(
              `${chapterId}: Monster ${monsterId} lebt in Zone ${monster.zone} — zu diesem Zeitpunkt der Kette noch gesperrt (Soft-Lock)`,
            );
          }
          if (monster.dungeonOnly) {
            const home = monsterHomeDungeon(monsterId);
            if (!home) {
              violations.push(`${chapterId}: dungeonOnly-Monster ${monsterId} taucht in keinem Dungeon-encounters-Array auf`);
            } else if (!unlockedDungeons.has(home)) {
              violations.push(
                `${chapterId}: Monster ${monsterId} ist dungeonOnly und lebt in ${home} — zu diesem Zeitpunkt der Kette noch gesperrt (Soft-Lock)`,
              );
            }
          }
        }
      }
      // Kapitel N gilt ab hier als claimed — Zonen/Dungeons, die es als Gate tragen, öffnen sich
      // für die Prüfung der folgenden Kapitel (Spiegel von isZoneUnlocked/isDungeonUnlocked:
      // completed/claimed reicht).
      for (const zone of content.zones) {
        if (zone.requiresQuest === chapterId) unlockedZones.add(zone.id);
      }
      for (const dungeon of content.dungeons) {
        if (dungeon.requiresQuest === chapterId) unlockedDungeons.add(dungeon.id);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
    // Sanity: am Ende der Kette sind ALLE Zonen offen — keine tote/dauerhaft unerreichbare Zone.
    expect(unlockedZones.size).toBe(content.zones.length);
    // Sanity: am Ende der Kette sind alle 7 Story-Dungeons offen (Paragonturm zählt nicht mit —
    // eigenes Unlock-System, kein requiresQuest, war schon zu Beginn in der Menge).
    expect(unlockedDungeons.size).toBe(content.dungeons.length);
  });

  it("Kohärenz-Gegenprobe: isDungeonUnlocked stimmt für die 2 echten dungeonOnly-Boss-Kapitel mit der Simulation überein", () => {
    // Direkte Cross-Verifikation gegen die echte Engine-Funktion (statt nur die reine Content-
    // Simulation oben): last_idol (chronicle_19) und drazhan (chronicle_20) sind die einzigen
    // dungeonOnly-Monster, die als Chronicle-kill_monster-Ziel auftauchen.
    const idolSanctum = content.dungeons.find((d) => d.id === "idol_sanctum")!;
    const behindThrone = content.dungeons.find((d) => d.id === "behind_the_throne")!;
    const idolhallZoneGate = content.zones.find((z) => z.id === idolSanctum.zone)!.requiresQuest!;

    const beforeIdol = createGame({ name: "X" }, content, 1);
    expect(isDungeonUnlocked(beforeIdol, content, "idol_sanctum")).toBe(false);
    const afterIdol = createGame({ name: "X" }, content, 1);
    afterIdol.quests.claimed.push(idolSanctum.requiresQuest!); // = chronicle_18, öffnet zugleich die idolhall-Zone
    expect(isDungeonUnlocked(afterIdol, content, "idol_sanctum")).toBe(true);

    const beforeThrone = createGame({ name: "X" }, content, 1);
    expect(isDungeonUnlocked(beforeThrone, content, "behind_the_throne")).toBe(false);
    const afterThrone = createGame({ name: "X" }, content, 1);
    // Trägerzone (idolhall, Gate chronicle_18) UND eigenes Dungeon-Gate (chronicle_19) — realistisch
    // sind beide claimed, sobald chronicle_19 erreicht ist (lineare requires-Kette), hier explizit
    // beide gesetzt statt sich auf die Kette zu verlassen (isolierter Unit-Test).
    afterThrone.quests.claimed.push(idolhallZoneGate, behindThrone.requiresQuest!);
    expect(isDungeonUnlocked(afterThrone, content, "behind_the_throne")).toBe(true);
  });
});
