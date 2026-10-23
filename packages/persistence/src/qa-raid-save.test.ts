import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame, continueRaid, onRaidDefeat, onRaidRoomCleared, startRaid, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA-Prüfrunde 1.4.0 Raid über Save/Load, claude:2026-10-26T10:00:00+02:00 (Kontrolleur).
 * Echter Raid-Content (gobkharaz), aber keine Kampf-Zahlen: Phasen werden von Hand gesetzt, offline läuft nur
 * dort, wo der Ausgang nicht von RAID_DAMAGE_SCALE abhängt (Stufe-1-Held stirbt in jedem Fall sofort).
 */
const AT = 1_761_400_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function raider(gold = 2_000_000): GameState {
  const s = createGame({ name: "QA" }, content, 6);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared.behind_the_throne = 1;
  s.character.gold = gold;
  return s;
}

function leaveCombat(s: GameState): void {
  s.combat.monsterId = null;
  s.combat.dungeonId = null;
  s.combat.encounterIndex = 0;
}

describe("Fixpunkt je Phase", () => {
  it("rest, defeated und complete überleben Save/Load unverändert (kein Offline-Fenster)", () => {
    for (const phase of ["rest", "defeated", "complete"] as const) {
      const s = raider();
      expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
      if (phase === "defeated") {
        leaveCombat(s);
        onRaidDefeat(s, content, "defeated");
      } else {
        s.combat.encounterIndex = 4;
        onRaidRoomCleared(s, content);
        leaveCombat(s);
        if (phase === "complete") {
          for (let i = 0; i < 4; i++) {
            expect(continueRaid(s, content)).toBe(true);
            s.combat.encounterIndex = 4;
            onRaidRoomCleared(s, content);
            leaveCombat(s);
          }
        }
      }
      expect(s.raid!.run!.phase).toBe(phase);
      // Muster raid-persistence.test.ts: der erste Load normalisiert raidfremde Felder (enemyWard, Bestandsschutz
      // dungeonsUnlocked), Fixpunkt ab dem zweiten Durchlauf.
      const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
      const out = deserialize(once, content, AT)!.state;
      expect(out.raid!.run!.phase).toBe(phase);
      expect(out.raid!.run!.restMs).toBe(s.raid!.run!.restMs);
      expect(out.raid!.run!.loot).toEqual(s.raid!.run!.loot);
      expect(serialize(out, AT)).toBe(once);
    }
  });
});

describe("Befund F: offener Heroisch-Tod-Dialog wird beim Laden vom Offline-Aufholen entschieden", () => {
  // claude:2026-10-26T04:10:00+02:00 — Befund behoben (QA-Raid #8): Heroisch ohne Auto-Kauf und ohne Warteschlange wartet offline auf den Spieler.
  it("SOLL: Dialog offen → Spiel zu → 10 s später laden: der Dialog wartet weiter, nichts verfällt", () => {
    const s = raider();
    s.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
    expect(startRaid(s, content, "gobkharaz", "heroic")).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    expect(s.raid!.run!.phase).toBe("defeated");
    const gold = s.character.gold;
    const out = deserialize(serialize(s, AT), content, AT + 10_000)!.state;
    expect(out.raid!.run?.phase).toBe("defeated");
    expect(out.raid!.lastResult).toBeNull();
    expect(out.character.gold).toBe(gold); // nichts gekauft, nichts verloren
  });
});

describe("Befund G: Sanitize-Reihenfolge verletzt „queue ⇒ run“", () => {
  // claude:2026-10-26T04:10:00+02:00 — Befund behoben: beim Laden gilt „Kampf verlassen = Tod“ (A15), die Warteschlange endet.
  it("SOLL: Lauf ohne Kampf beim Laden: Tod-Dialog statt stummem Verwerfen, die Raid-Warteschlange fällt", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    s.raid!.queue = { raidId: "gobkharaz", difficulty: "normal", remaining: 3, completed: 0 };
    s.combat.monsterId = null; // Kampf weg, Lauf noch „fight“ (Stopp zwischen zwei Ticks gespeichert)
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.raid!.run?.phase).toBe("defeated");
    expect(out.raid!.queue).toBeNull();
  });

  it("SOLL: Mythisch-Lauf ohne Kampf im Save endet beim Laden MIT 25 % Rückgabe, wie der Live-Tick", () => {
    const s = raider(5_000_000);
    s.raid!.clears = { normal: 1, heroic: 1, mythic: 0 };
    expect(startRaid(s, content, "gobkharaz", "mythic")).toBe("ok");
    const gold = s.character.gold;
    s.combat.monsterId = null;
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.raid!.run).toBeNull();
    expect(out.raid!.lastResult?.outcome).toBe("defeated");
    expect(out.character.gold).toBe(gold + Math.round(2_500_000 * 0.25));
  });
});

describe("Positiv: offline über mehrere Tode", () => {
  it("Stufe-1-Held stirbt offline viermal (3 Neustarts), Lauf endet; Bericht nennt vier Tode", () => {
    const s = createGame({ name: "Weak" }, content, 3);
    s.dungeonsCleared.behind_the_throne = 1;
    s.character.gold = 300_000;
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    const res = deserialize(serialize(s, AT), content, AT + 10 * 60_000)!;
    const out = res.state;
    expect(out.raid!.run).toBeNull();
    expect(out.raid!.lastResult?.outcome).toBe("defeated");
    expect(out.stats.deaths).toBe(4);
    expect(res.offline.deaths).toBe(4);
    expect(res.offline.diedAgainst).toBe("gk_toll_thug");
    expect(out.combat.monsterId).toBeNull();
    expect(out.character.gold).toBe(0); // Gebühr weg, kein Gold aus dem Raid
  });
});
