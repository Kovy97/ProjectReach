import { content } from "@hearthforge/content";
import { ITEM_RARITIES } from "@hearthforge/shared";
import type { ItemId, SkillId } from "@hearthforge/shared";
import type { OfflineSummaryUI } from "./game/GameContext";

/**
 * Demo-Daten für die „Während du weg warst"-Bühne (Chef-Auftrag 31.08.2026, Dev-Werkzeug).
 *
 * WOZU: Das Offline-Fenster zeigt je nach Abwesenheit ganz unterschiedliche Abschnitte — Beute,
 * Skill-Fortschritt, Tod, Begleiter, Erfolge, New-Haven-Bauten, Veredelung, Jagdfänge, dazu den
 * Hinweis auf die 8-Stunden-Kappung. Im normalen Spiel bekommt man die nie alle zusammen zu sehen,
 * schon gar nicht auf Kommando. Dieser Knopf füllt JEDEN Abschnitt, damit man das Layout in einem
 * Zug beurteilen kann.
 *
 * WARUM DYNAMISCH: Die Ids kommen aus dem geladenen Katalog, nicht als feste Zeichenketten. Ein
 * umbenanntes Item oder ein entfernter Begleiter würde sonst eine tote Demo hinterlassen, die
 * niemand bemerkt, bis er sie braucht. Fehlt eine Gattung ganz, bleibt der Abschnitt eben leer —
 * das Fenster verträgt das, es ist derselbe Fall wie „offline nichts passiert".
 *
 * Nur im Dev-Build erreichbar (DevSpeedPanel hängt am `devToolsAllowed`-Gate); im ausgelieferten
 * Spiel ruft diese Funktion niemand auf.
 */

/** Erste n Items, die es wirklich gibt — bevorzugt seltene, damit die Rang-Hervorhebung greift. */
function beuteAuswahl(n: number): ItemId[] {
  const alle = Object.values(content.items);
  const rang = (id: ItemId): number => ITEM_RARITIES.indexOf(content.items[id]?.rarity ?? "common");
  const materialien = alle.filter((i) => i.type === "material").map((i) => i.id);
  const ausruestung = alle.filter((i) => i.type === "equipment").map((i) => i.id);
  // Absteigend nach Seltenheit: so landet mindestens ein "rare oder besser" in der Liste, was im
  // Popup die hervorgehobene Zeile auslöst (s. RARE_RANK in OfflinePopup.tsx).
  const selten = [...ausruestung].sort((a, b) => rang(b) - rang(a)).slice(0, 3);
  return [...selten, ...materialien.slice(0, Math.max(0, n - selten.length))];
}

export function baueDemoOfflineSummary(): OfflineSummaryUI {
  const stunde = 60 * 60 * 1000;

  const items: Record<ItemId, number> = {};
  beuteAuswahl(7).forEach((id, i) => {
    items[id] = i < 3 ? 1 : (i - 1) * 17;
  });

  // Skills mit Fortschritt, davon zwei mit Stufenaufstieg (der Aufstieg hat eine eigene Zeile).
  const skillIds = Object.keys(content.skills).slice(0, 4) as SkillId[];
  const skillXp: Record<SkillId, { xp: number; levels: number }> = {};
  skillIds.forEach((id, i) => {
    skillXp[id] = { xp: 4820 - i * 900, levels: i < 2 ? 2 - i : 0 };
  });

  const petIds = Object.keys(content.pets ?? {});
  const achievements = Object.values(content.achievements ?? {}).slice(0, 3);
  // `campBuildings` ist eine LISTE, kein Record — `Object.keys` haette hier Indizes ('0','1')
  // statt Gebaeude-Ids geliefert und den New-Haven-Abschnitt der Demo still leer gelassen.
  // Genau das hat devOfflineDemo.test.ts aufgedeckt.
  const gebaeude = (content.campBuildings ?? []).map((b) => b.id);
  const monster = Object.values(content.monsters ?? {});
  const material = Object.values(content.items).find((i) => i.type === "material");

  return {
    // 8h Kappung sichtbar machen: `ms` ist die gekappte Zeit, `realMs` die echte Abwesenheit.
    ms: 8 * stunde,
    realMs: 31 * stunde,
    gold: 128_450,
    xp: 96_300,
    items,
    skillXp,
    kills: 412,
    deaths: 1,
    diedAgainst: monster[0]?.id ?? null,
    combatStopped: true,
    combatStopReason: "defeated",
    petDrops: petIds.slice(0, 1),
    achievementsEarned: achievements.length,
    achievementIds: achievements.map((a) => a.id),
    campBuilds: gebaeude.slice(0, 2).map((buildingId, i) => ({ buildingId, level: i + 1 })),
    campRefined: gebaeude.slice(0, 1).map((buildingId) => ({
      buildingId,
      itemId: material?.id ?? (Object.keys(content.items)[0] as ItemId),
      qty: 240,
    })),
    huntCatches: monster.slice(0, 2).map((m, i) => ({ monsterId: m.id, count: 9 - i * 4 })),
    emptyReturn: false,
  };
}
