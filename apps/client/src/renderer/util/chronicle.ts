import { questStatus } from "@hearthforge/engine";
import type { QuestStatus } from "@hearthforge/engine";
import type { ContentDB, DungeonDef, GameState, LocalizedString, QuestDef } from "@hearthforge/shared";

/**
 * Aschechronik-Hauptquest (ceo-run-2026-07-13 Welle E): Chronik-Kapitel sind normale Quests mit
 * IDs `chronicle_01` … `chronicle_21`, strikt sequenziell via `requires` (Welle D2 liefert den
 * Content — VOR D2 existieren schlicht keine `chronicle_*`-Quests, jede Funktion hier ist dann ein
 * No-op/leere Liste, s. JSDoc unten). Erkennung ausschließlich über das ID-Präfix, wie vom Chef
 * vorgegeben — kein separates Content-Flag nötig.
 */
export const CHRONICLE_ID_PREFIX = "chronicle_";

/** Alle Chronik-Kapitel-Quests aus dem Content, aufsteigend nach ID sortiert (chronicle_01 zuerst
 *  — die zweistellige Nullpadding-Konvention der Spec sortiert lexikalisch korrekt numerisch). */
export function chronicleChapters(content: ContentDB): QuestDef[] {
  return content.quests
    .filter((q) => q.id.startsWith(CHRONICLE_ID_PREFIX))
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** `chronicle_07` → 7. Ungültige/fehlende Nummer → 0 (defensiv, sollte laut ID-Konvention nie vorkommen). */
export function chronicleChapterNumber(questId: string): number {
  const n = parseInt(questId.slice(CHRONICLE_ID_PREFIX.length), 10);
  return Number.isFinite(n) ? n : 0;
}

export interface ActiveChronicleChapter {
  quest: QuestDef;
  status: QuestStatus;
  /** Kapitelnummer aus der ID (chronicle_07 → 7). */
  chapter: number;
  /** Gesamtzahl der Kapitel, die der Content aktuell definiert (i.d.R. 21). */
  total: number;
}

/**
 * Das AKTIVE Chronik-Kapitel: die erste `chronicle_*`-Quest (in ID-Reihenfolge), die noch nicht
 * eingelöst ("claimed") ist UND deren Voraussetzungen erfüllt sind (Status "active" oder
 * "completed" — nicht "locked"). Dank der strikt sequenziellen `requires`-Kette (jedes Kapitel
 * verlangt exakt das vorherige) gibt es zu jedem Zeitpunkt höchstens ein solches Kapitel: alle
 * davor liegenden sind bereits "claimed", alle danach liegenden bleiben "locked".
 *
 * Gibt `null` zurück, wenn der Content (noch) keine Chronik-Quests definiert (Welle D2 offen) ODER
 * alle Kapitel bereits eingelöst sind (Epilog abgeschlossen) — beide Fälle blenden den Kompass
 * bewusst komplett aus (kein Crash, kein leerer Pin).
 */
export function activeChronicleChapter(state: GameState, content: ContentDB): ActiveChronicleChapter | null {
  const chapters = chronicleChapters(content);
  for (const quest of chapters) {
    const status = questStatus(state, content, quest);
    if (status === "active" || status === "completed") {
      return { quest, status, chapter: chronicleChapterNumber(quest.id), total: chapters.length };
    }
  }
  return null;
}

/** Ein Content-Eintrag, den der Abschluss einer Quest freischaltet (s. `unlocksForQuest`).
 *  `kind` unterscheidet die Chip-Optik in QuestsPage (`ChronicleUnlocksLine`): Zonen und Dungeons
 *  sind beide „Kampfgebiete freigeschaltet", aber ein Dungeon-Unlock ist der seltenere, größere
 *  Meilenstein („Gebiet für Gebiet, Dungeon um Dungeon", Chef-Direktive 2026-07-13) — die UI
 *  markiert ihn deshalb mit einem eigenen Chip-Akzent/Label statt ihn optisch mit Zonen zu mischen. */
export interface ChronicleUnlock {
  id: string;
  name: LocalizedString;
  kind: "zone" | "dungeon";
}

/**
 * Zonen UND Dungeons, die durch den Abschluss der übergebenen Quest-ID freigeschaltet werden —
 * Chef-Zusatz ceo-run-2026-07-13 Welle H: „Schaltet frei"-Zeile am aktiven Kapitel auf dem
 * Story-Tab (pages/QuestsPage.tsx `ChronicleUnlocksLine`). Generischer Helfer über ALLE
 * quest-gate-fähigen Content-Quellen: Zonen (`ZoneDef.requiresQuest`, engine/zones.ts
 * `isZoneUnlocked`) UND seit Welle L (Chef-Direktive „Gebiet für Gebiet, Dungeon um Dungeon",
 * KEINE Dungeon-Keys mehr) Dungeons (`DungeonDef.requiresQuest`, engine/dungeon.ts
 * `isDungeonUnlocked`) — bewusst NUR das eigene Quest-Gate des Dungeons (nicht die Trägerzone):
 * diese Zeile zeigt "was schaltet DIESE Quest frei", die Trägerzonen-Kohärenz ist ein separates
 * Laufzeit-Gate, kein Freischalt-Ereignis dieser Quest.
 */
export function unlocksForQuest(content: ContentDB, questId: string): ChronicleUnlock[] {
  // Sweep2-T3/T5 „Geister-Zone" (2026-07-13): Zonen, deren Bewohner ALLE dungeonOnly sind
  // (aktuell die Götzenhalle), bekommen im Zonen-Grid nie eine Karte — ein „Schaltet frei:
  // Zone"-Chip würde etwas bewerben, das der Spieler nirgends sieht. Nur Zonen mit mindestens
  // einem frei kämpfbaren Welt-Monster listen; die Dungeon-Chips tragen den Unlock-Moment.
  const hasWorldMonster = (zoneId: string): boolean =>
    Object.values(content.monsters).some((m) => m.zone === zoneId && !m.dungeonOnly);
  const zoneUnlocks: ChronicleUnlock[] = content.zones
    .filter((z) => z.requiresQuest === questId && hasWorldMonster(z.id))
    .map((z) => ({ id: z.id, name: z.name, kind: "zone" as const }));
  const dungeonUnlocks: ChronicleUnlock[] = content.dungeons
    .filter((d) => d.requiresQuest === questId)
    .map((d) => ({ id: d.id, name: d.name, kind: "dungeon" as const }));
  return [...zoneUnlocks, ...dungeonUnlocks];
}

/**
 * Der Dungeon, in dessen `encounters` die übergebene Monster-Basis-ID vorkommt — Fix-Welle S
 * (Sela-Bug, ceo-run-2026-07-13 Story-Review): die WO-Zeile eines `kill_monster`-Ziels
 * (`objectiveLocation` in pages/QuestsPage.tsx) zeigte bislang IMMER `monster.zone`, auch für
 * `dungeonOnly`-Bosse (Warband-5, Idol-Sanctum-4, roc_storm/roc_void, drazhan), die dort gar nicht
 * kämpfbar sind — reine Orientierungsfalle. Gleiches Muster wie `monsterHomeDungeon` in
 * engine/zone-gating.test.ts (Deadlock-Guard): dg_-Alias wird wie `killCreditMonsterId`
 * (engine/combat.ts) gestrippt, hier dupliziert statt importiert, weil ui-dev keinen Testcode aus
 * packages/** ziehen darf. Kommt eine ID in MEHREREN Dungeons vor (aktuell nur roc_storm: Endboss
 * von highland_aerie UND Elite-Welle 2 in wyvern_lair), gewinnt der Dungeon mit dem FRÜHEREN
 * Freischalt-Gate (`requiresQuest`-Kapitel-Id, lexikalisch = numerisch dank zweistelligem
 * Zero-Padding) — das ist der Ort, an dem der Spieler dem Monster zuerst tatsächlich begegnet.
 * `undefined` für normale Weltmonster (kein Dungeon führt sie in `encounters`).
 */
export function monsterHomeDungeon(content: ContentDB, monsterId: string): DungeonDef | undefined {
  let best: DungeonDef | undefined;
  for (const dungeon of content.dungeons) {
    const hit = dungeon.encounters.some((enc) => {
      const credited = enc.startsWith("dg_") && content.monsters[enc.slice(3)] ? enc.slice(3) : enc;
      return credited === monsterId;
    });
    if (!hit) continue;
    if (!best || (dungeon.requiresQuest ?? "") < (best.requiresQuest ?? "")) best = dungeon;
  }
  return best;
}
