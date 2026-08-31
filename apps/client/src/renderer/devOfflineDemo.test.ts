import { describe, expect, it } from "vitest";
import { baueDemoOfflineSummary } from "./devOfflineDemo";

/**
 * Chef-Auftrag 31.08.2026: Der Dev-Knopf soll die „Während du weg warst"-Bühne „mit fake daten in
 * allen bereichen" zeigen. Genau das pinnen diese Tests — sonst fällt erst beim Hinschauen auf,
 * dass ein Abschnitt leer bleibt, und das ist der eine Fall, den das Werkzeug verhindern soll.
 *
 * Die Demo zieht ihre Ids aus dem echten Katalog. Fällt eine Gattung dort weg (kein Begleiter,
 * keine Erfolge), schlägt der zugehörige Test an und wir merken es hier, nicht im Fenster.
 */
describe("Offline-Demo für das Dev-Panel", () => {
  const demo = baueDemoOfflineSummary();

  it("füllt die Kopfzahlen", () => {
    expect(demo.ms).toBeGreaterThan(0);
    expect(demo.gold).toBeGreaterThan(0);
    expect(demo.xp).toBeGreaterThan(0);
    expect(demo.kills ?? 0).toBeGreaterThan(0);
  });

  it("zeigt die 8-Stunden-Kappung, indem die echte Abwesenheit länger ist", () => {
    expect(demo.realMs).toBeDefined();
    expect(demo.realMs ?? 0).toBeGreaterThan(demo.ms);
  });

  it("füllt Beute und Skill-Fortschritt, mit mindestens einem Stufenaufstieg", () => {
    expect(Object.keys(demo.items).length).toBeGreaterThan(3);
    const skills = Object.values(demo.skillXp);
    expect(skills.length).toBeGreaterThan(1);
    expect(skills.some((s) => s.levels > 0)).toBe(true);
  });

  it("füllt den Tod-Abschnitt", () => {
    expect(demo.deaths ?? 0).toBeGreaterThan(0);
    expect(demo.combatStopped).toBe(true);
    expect(demo.combatStopReason).toBe("defeated");
    expect(demo.diedAgainst).toBeTruthy();
  });

  it("füllt Begleiter, Erfolge, New Haven und Jagd", () => {
    expect((demo.petDrops ?? []).length).toBeGreaterThan(0);
    expect((demo.achievementIds ?? []).length).toBeGreaterThan(0);
    expect(demo.achievementsEarned ?? 0).toBeGreaterThan(0);
    expect((demo.campBuilds ?? []).length).toBeGreaterThan(0);
    expect((demo.campRefined ?? []).length).toBeGreaterThan(0);
    expect((demo.huntCatches ?? []).length).toBeGreaterThan(0);
  });

  it("ist keine leere Rückkehr — sonst zeigt die Bühne nur die Mini-Karte", () => {
    expect(demo.emptyReturn).toBe(false);
  });

  it("nennt nur Ids, die es im Katalog wirklich gibt", async () => {
    const { content } = await import("@hearthforge/content");
    for (const id of Object.keys(demo.items)) expect(content.items[id]).toBeTruthy();
    for (const id of Object.keys(demo.skillXp)) expect(content.skills[id]).toBeTruthy();
    // `campBuildings` ist im Katalog-Typ optional und wird als Liste gefuehrt, nicht als Record —
    // deshalb hier ueber die Ids suchen statt indizieren.
    const gebaeudeIds = new Set((content.campBuildings ?? []).map((b) => b.id));
    for (const b of demo.campBuilds ?? []) expect(gebaeudeIds.has(b.buildingId)).toBe(true);
    for (const r of demo.campRefined ?? []) expect(content.items[r.itemId]).toBeTruthy();
    for (const h of demo.huntCatches ?? []) expect(content.monsters[h.monsterId]).toBeTruthy();
    if (demo.diedAgainst) expect(content.monsters[demo.diedAgainst]).toBeTruthy();
    // Begleiter liegen als Record vor, Erfolge als Liste — beide Zugriffsarten hier gepinnt,
    // damit ein spaeterer Typwechsel nicht wieder still Indizes statt Ids liefert.
    for (const petId of demo.petDrops ?? []) expect(content.pets[petId]).toBeTruthy();
    const erfolgIds = new Set((content.achievements ?? []).map((a) => a.id));
    for (const id of demo.achievementIds ?? []) expect(erfolgIds.has(id)).toBe(true);
  });
});
