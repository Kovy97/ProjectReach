import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  QUEST_OBJECTIVE_TYPES,
  QUEST_DIFFICULTIES,
  DAILY_QUEST_COUNT,
  PARAGON_DUNGEON_ID,
} from "@hearthforge/shared";
import { claimQuest, pickDailyQuests } from "./quests";
import { createGame } from "./state";

/**
 * Guard-Test für den Quest-Katalog (QA P3b): validiert den GANZEN `content.quests`-Datensatz,
 * damit eine künftige Tippfehler-Quest (totes Reward-Item, falsches kill-Ziel, unbekannte
 * Vorbedingung, versehentliche Attributpunkte …) nicht durch alle Gates rutscht.
 *
 * Rein lesend gegen den echten Content + die echten `shared`-Typen.
 */
describe("quest integrity: gesamter content.quests-Katalog ist konsistent", () => {
  const quests = content.quests;
  const items = content.items;
  const monsters = content.monsters;
  const skills = content.skills;
  const questIds = new Set(quests.map((q) => q.id));

  it("Katalog ist nicht leer (Smoke)", () => {
    expect(quests.length).toBeGreaterThan(0);
  });

  it("keine doppelten Quest-IDs", () => {
    const seen = new Set<string>();
    for (const q of quests) {
      expect(seen.has(q.id), `Doppelte Quest-ID: ${q.id}`).toBe(false);
      seen.add(q.id);
    }
    expect(seen.size).toBe(quests.length);
  });

  it("Objective-Typen sind bekannte QuestObjectiveType-Werte", () => {
    for (const q of quests) {
      expect(q.objectives.length, `Quest ${q.id}: keine Objectives`).toBeGreaterThan(0);
      for (const o of q.objectives) {
        expect(
          QUEST_OBJECTIVE_TYPES.includes(o.type),
          `Quest ${q.id}: unbekannter Objective-Typ ${o.type}`,
        ).toBe(true);
      }
    }
  });

  it("Objective-Counts sind > 0", () => {
    for (const q of quests) {
      for (const o of q.objectives) {
        expect(o.count, `Quest ${q.id}: Objective ${o.type} hat count ${o.count}`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it("kill_monster-Ziele sind echte content.monsters-IDs", () => {
    for (const q of quests) {
      for (const o of q.objectives) {
        if (o.type !== "kill_monster") continue;
        expect(o.target, `Quest ${q.id}: kill_monster ohne target`).toBeTruthy();
        expect(
          monsters[o.target!],
          `Quest ${q.id}: kill_monster target ${o.target} ist kein echtes Monster`,
        ).toBeDefined();
      }
    }
  });

  it("reach_skill_level-Ziele sind echte Skill-IDs", () => {
    for (const q of quests) {
      for (const o of q.objectives) {
        if (o.type !== "reach_skill_level") continue;
        expect(o.target, `Quest ${q.id}: reach_skill_level ohne target`).toBeTruthy();
        expect(
          skills[o.target!],
          `Quest ${q.id}: reach_skill_level target ${o.target} ist keine echte Skill-ID`,
        ).toBeDefined();
      }
    }
  });

  it("craft_items-target (falls gesetzt) ist eine echte content.items-ID; leer = beliebig erlaubt", () => {
    for (const q of quests) {
      for (const o of q.objectives) {
        if (o.type !== "craft_items") continue;
        if (o.target === undefined) continue; // leer = beliebiges geschmiedetes Item (gültig)
        expect(
          items[o.target],
          `Quest ${q.id}: craft_items target ${o.target} ist kein echtes Item`,
        ).toBeDefined();
      }
    }
  });

  it("repeatable Quests sind kohärent: keine reach_*-Objectives (Zustände statt pro-Zyklus-Ertrag)", () => {
    // reach_skill_level / reach_total_level messen einen Zustand, keine Menge — als wiederholbare
    // Quest wären sie nach dem ersten Claim faktisch nie wieder erfüllbar. Verhindert Daten-Stolperfalle.
    const stateLike = new Set(["reach_skill_level", "reach_total_level"]);
    for (const q of quests) {
      if (!q.repeatable) continue;
      for (const o of q.objectives) {
        expect(
          stateLike.has(o.type),
          `Quest ${q.id}: repeatable Quest mit Zustands-Objective ${o.type} (nicht sinnvoll wiederholbar)`,
        ).toBe(false);
      }
    }
  });

  it("typenlose Objectives (kill_total/reach_total_level/gather_items) brauchen kein target", () => {
    const targetless = new Set(["kill_total", "reach_total_level", "gather_items"]);
    for (const q of quests) {
      for (const o of q.objectives) {
        if (!targetless.has(o.type)) continue;
        // target wird ignoriert; falls eines gesetzt ist, ist das vermutlich ein Copy-Paste-Fehler.
        expect(
          o.target,
          `Quest ${q.id}: ${o.type} sollte kein target setzen (wird ignoriert), hat aber ${o.target}`,
        ).toBeUndefined();
      }
    }
  });

  it("Reward-Items existieren in content.items und haben qty > 0", () => {
    for (const q of quests) {
      for (const r of q.rewards.items ?? []) {
        expect(items[r.id], `Quest ${q.id}: Reward-Item ${r.id} fehlt in content.items`).toBeDefined();
        expect(r.qty, `Quest ${q.id}: Reward-Item ${r.id} hat qty ${r.qty}`).toBeGreaterThan(0);
      }
    }
  });

  it("Rewards sind kohärent: gold >= 0 und KEINE Attributpunkte (System entfernt)", () => {
    for (const q of quests) {
      const r = q.rewards;
      if (r.gold !== undefined) {
        expect(r.gold, `Quest ${q.id}: gold ${r.gold} < 0`).toBeGreaterThanOrEqual(0);
      }
      // attributePoints wurde aus QuestReward entfernt — keine Quest darf es per Datenfehler
      // wieder einschmuggeln (würde als unbekanntes Feld stumm ignoriert werden).
      expect(
        "attributePoints" in (r as Record<string, unknown>),
        `Quest ${q.id}: rewards.attributePoints existiert nicht mehr — entfernen`,
      ).toBe(false);
      // Jede Quest sollte überhaupt eine Belohnung haben (Gold, Items ODER Quest-Tokens —
      // Task #272: die Story-/Daily-Rewards wurden auf `tokenReward` umgestellt, `rewards` ist
      // für diese Quests jetzt bewusst leer `{}`).
      const hasReward = (r.gold ?? 0) > 0 || (r.items?.length ?? 0) > 0 || (q.tokenReward ?? 0) > 0;
      expect(hasReward, `Quest ${q.id}: keine Belohnung (weder gold, items noch tokenReward)`).toBe(true);
    }
  });

  it("requires referenziert echte, bekannte Quest-IDs (keine toten/zirkulären Vorbedingungen)", () => {
    for (const q of quests) {
      for (const req of q.requires ?? []) {
        expect(
          questIds.has(req),
          `Quest ${q.id}: requires ${req} ist keine bekannte Quest-ID`,
        ).toBe(true);
        expect(req, `Quest ${q.id}: requires sich selbst (Zyklus)`).not.toBe(q.id);
      }
    }
  });

  it("name & description in en + de vorhanden (kein leerer i18n-String)", () => {
    // Quests verwenden die Objekt-Form { en, de }. Ein versehentlich fehlender de-Eintrag
    // würde sonst still auf en zurückfallen — darum prüfen wir beide Sprachen direkt am Objekt.
    // Nur die ausgelieferten Basissprachen en+de sind Pflicht. Die 2026-07 hinzugekommenen
    // Lokalisierungssprachen (zh/ru/es/pt-BR/fr) werden inkrementell übersetzt und fallen
    // bewusst per resolveText auf en zurück (LocalizedString = { en } & Partial<…>), darum
    // hier NICHT über alle LOCALES prüfen.
    const REQUIRED_LOCALES = ["en", "de"] as const;
    const checkLocalized = (val: unknown, where: string) => {
      expect(typeof val === "object" && val !== null, `${where}: kein { en, de }-Objekt`).toBe(true);
      const rec = val as Record<string, string>;
      for (const loc of REQUIRED_LOCALES) {
        expect(typeof rec[loc] === "string" && rec[loc].trim() !== "", `${where}: ${loc} fehlt/leer`).toBe(
          true,
        );
      }
    };
    for (const q of quests) {
      checkLocalized(q.name, `Quest ${q.id}: name`);
      checkLocalized(q.description, `Quest ${q.id}: description`);
    }
  });

  it("Daily-Pool-Quests tragen eine gültige difficulty", () => {
    for (const q of quests) {
      if (!q.daily) continue;
      expect(q.difficulty, `Daily ${q.id}: difficulty fehlt (Pflicht im Daily-Pool)`).toBeDefined();
      expect(
        QUEST_DIFFICULTIES.includes(q.difficulty!),
        `Daily ${q.id}: difficulty ${q.difficulty} ist ungültig`,
      ).toBe(true);
    }
  });

  it("difficulty (falls gesetzt, auch bei Story-Quests) ist ein bekannter Wert", () => {
    for (const q of quests) {
      if (q.difficulty === undefined) continue;
      expect(
        QUEST_DIFFICULTIES.includes(q.difficulty),
        `Quest ${q.id}: difficulty ${q.difficulty} ist ungültig`,
      ).toBe(true);
    }
  });

  it("Daily-Pool kann unter dem 2×-Constraint volle 6 Dailies ziehen (mind. 3 Schwierigkeiten)", () => {
    const pool = quests.filter((q) => q.daily);
    if (pool.length === 0) return; // leerer Pool (vor content-dev) ist erlaubt
    const picked = pickDailyQuests(content, 20260625);
    expect(
      picked.length,
      `Daily-Pool zieht nur ${picked.length}/${DAILY_QUEST_COUNT} — Pool zu klein oder Schwierigkeiten zu wenig verteilt`,
    ).toBe(Math.min(DAILY_QUEST_COUNT, pool.length));
  });

  /**
   * Welle T (Story-Review, Pox Band 5): `paragon_key` hat exakt ZWEI Quellen — der `last_idol`-
   * Loot-Roll (@8%) und, seit Welle T, `chronicle_19`s Reward (deterministisch, Muster
   * masters_mark). Pin gegen künftige Drift: eine dritte Quelle (Pool-Drop, andere Quest) würde
   * chronicle_18 außer-Reihe erfüllbar machen und den "Dungeon-erzwingt-den-Kampf"-Sinn (Welle
   * O/P) unterlaufen (Pox-Review Band 5, Befund zu chronicle_18).
   */
  it("paragon_key-Quellen sind EXAKT last_idol-Loot + chronicle_19-Reward (Guard gegen Drift)", () => {
    const monsterSources = Object.values(monsters).filter((m) =>
      (m.loot ?? []).some((l) => l.itemId === "paragon_key"),
    );
    expect(monsterSources.map((m) => m.id)).toEqual(["last_idol"]);

    const questSources = quests.filter((q) => (q.rewards.items ?? []).some((it) => it.id === "paragon_key"));
    expect(questSources.map((q) => q.id)).toEqual(["chronicle_19"]);
  });

  /**
   * Welle T: der paragon_key-Einmal-Unlock-Intercept (addItemOrBank → unlockParagonTower,
   * inventory.ts) greift auch bei Quest-Rewards — claimQuest ruft für jedes rewards.items-Element
   * addItemOrBank auf (Welle-J-Verdrahtung). End-to-End-Beleg: chronicle_19 claimen entsperrt den
   * Paragonturm, und der Schlüssel landet (wie beim direkten Loot-Fund) NIE im Inventar.
   */
  it("chronicle_19-Claim greift den paragon_key-Intercept end-to-end: Turm ist danach entsperrt", () => {
    const state = createGame({ name: "Guard" }, content, 1);
    state.quests.claimed.push("chronicle_18");
    state.monsterKills["last_idol"] = 1;
    expect(state.dungeonsUnlocked[PARAGON_DUNGEON_ID]).not.toBe(true);

    const ok = claimQuest(state, content, "chronicle_19");

    expect(ok).toBe(true);
    expect(state.dungeonsUnlocked[PARAGON_DUNGEON_ID]).toBe(true);
    expect(state.quests.claimed).toContain("chronicle_19");
    // paragon_key landet NIE im Besitz (Intercept-Konvention, inventory.ts) — auch nicht über den
    // Quest-Reward-Pfad.
    expect(state.inventory.slots.some((s) => s?.itemId === "paragon_key")).toBe(false);
    expect(state.bank["paragon_key"]).toBeUndefined();
  });
});
