import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { actionSuccessChance } from "@hearthforge/shared";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";

describe("thieving mechanic", () => {
  it("Erfolgschance steigt mit Level und ist gedeckelt; deterministische Aktionen sind 1", () => {
    const a = content.actions.pickpocket_beggar!;
    const low = actionSuccessChance(a, 1);
    const high = actionSuccessChance(a, 80);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(0.95);
    // Aktion ohne successBase (z.B. Holzfällen) gelingt immer.
    expect(actionSuccessChance(content.actions.cut_normal_tree!, 1)).toBe(1);
  });

  it("gibt bei Erfolg Gold + XP und betäubt bei Fehlschlag", () => {
    const s = createGame({ name: "X" }, content, 123);
    setActiveAction(s, content, "pickpocket_beggar");
    const gold0 = s.character.gold;

    let sawStun = false;
    for (let i = 0; i < 800; i++) {
      advance(s, content, 100);
      if (s.stunMs > 0) sawStun = true;
    }

    expect(s.character.gold).toBeGreaterThan(gold0); // Erfolge zahlten Gold
    expect(s.skills.thieving?.xp ?? 0).toBeGreaterThan(0);
    expect(sawStun).toBe(true); // mindestens ein Fehlschlag hat betäubt
  });

  it("Betäubung pausiert die Aktion und läuft dann ab", () => {
    const s = createGame({ name: "X" }, content, 1);
    setActiveAction(s, content, "pickpocket_beggar");
    s.stunMs = 1000;
    const xp0 = s.skills.thieving?.xp ?? 0;

    advance(s, content, 500); // 5 Ticks, komplett von der Betäubung verbraucht
    expect(s.stunMs).toBe(500);
    expect(s.skills.thieving?.xp ?? 0).toBe(xp0); // kein Fortschritt während Betäubung

    advance(s, content, 600); // Betäubung endet
    expect(s.stunMs).toBe(0);
  });

  it("Content: die Thieving-Leiter ist durchgängig gegated und gibt Gold", () => {
    const thieving = Object.values(content.actions).filter((a) => a.skill === "thieving");
    expect(thieving.length).toBeGreaterThanOrEqual(10);
    for (const a of thieving) {
      expect(a.levelRequired, `${a.id} ohne levelRequired`).toBeGreaterThanOrEqual(1);
      expect(a.gold, `${a.id} ohne Gold`).toBeTruthy();
      // Fence-Aktionen (category: "fence") nutzen den Craft-Pfad — kein Erfolgswurf nötig.
      if (a.category !== "fence") {
        expect(a.successBase, `${a.id} ohne successBase`).toBeDefined();
      }
    }
  });
});
