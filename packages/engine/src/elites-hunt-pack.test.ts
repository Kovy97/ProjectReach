import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, MailMessage } from "@hearthforge/shared";
import {
  ELITE_BLOODMOON_UNIQUE_BONUS,
  ELITE_BOUNTY_TOKENS,
  ELITE_WILDHUNT_COOLDOWN_SPEED_MULT,
  ELITE_WINDOW_MS,
  TICK_MS,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { step } from "./tick";
import { combatStep } from "./combat";
import { createRng, nextFloat } from "./rng";
import { onEliteKilled, startEliteCombat } from "./elites";

/** Type-Guard für Discriminated-Union-Narrowing in `.filter()` (Muster: TS narrowt Callbacks nicht
 *  automatisch — s. shared `MailMessage`). */
function isLetter(m: MailMessage): m is Extract<MailMessage, { kind: "letter" }> {
  return m.kind === "letter";
}

/**
 * „Jagd-Paket" (design/elite-spawns-concept.md, erweitert Champions des Reach, Chef-GO 2026-07-22):
 * Segen-Synergie (S1), Champion-Codex (S2/M), Kopfgeld (S3), Raben-Post (L). Muster elites.test.ts
 * (isolierte Test-Content-Überlagerung: reale Zonen/Items aus `content`, kontrollierte `elites`).
 */
const TEST_UNIQUE_ITEM = "rusty_sword";
const TEST_VARIANT_A = {
  id: "test_hp_pastures_a",
  zone: "pastures",
  baseMonsterId: "chicken",
  name: { en: "Test Champion A" },
  statMults: { hp: 5, damage: 1.2 },
  uniqueItemId: TEST_UNIQUE_ITEM,
  uniqueDropChance: 1,
  uniqueSuffixChance: 1,
} as const;
const TEST_VARIANT_B = {
  ...TEST_VARIANT_A,
  id: "test_hp_pastures_b",
} as const;

const TEST_CONTENT: ContentDB = {
  ...content,
  elites: { [TEST_VARIANT_A.id]: TEST_VARIANT_A, [TEST_VARIANT_B.id]: TEST_VARIANT_B },
};

/** Findet den nächsten Tag (inkl. `from`) mit dem gewünschten LOKALEN Wochentag (Muster blessing.test.ts). */
function nextLocalWeekday(from: Date, targetDay: number): Date {
  let d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
  while (d.getDay() !== targetDay) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0, 0);
  }
  return d;
}
const REF = new Date(2026, 0, 1);
const SATURDAY_BLOODMOON = nextLocalWeekday(REF, 6);
const FRIDAY_WILDHUNT = nextLocalWeekday(REF, 5);
const MONDAY_NEUTRAL = nextLocalWeekday(REF, 1); // mistvigil (§xp) — kein Elite-Effekt

/** Kämpft den aktiven Elite-Kampf bis zum Kill leer (deterministisch, enemyHp vorab auf 1 gesetzt). */
function killActiveElite(s: ReturnType<typeof createGame>, c: ContentDB, nowMs?: number): void {
  s.combat.enemyHp = 1;
  let guard = 0;
  while (s.combat.monsterId !== null && guard++ < 2000) combatStep(s, c, nowMs);
  expect(guard, "Kampf in der Zeitschranke beendet").toBeLessThan(2000);
}

describe("Jagd-Paket S1 — Segen-Synergie (bloodmoon/wildhunt)", () => {
  it("bloodmoon: die effektive uniqueDropChance steigt um ELITE_BLOODMOON_UNIQUE_BONUS — der Wurf feuert trotzdem IMMER (gleicher eliteRng-Konsum wie an einem neutralen Tag)", () => {
    // uniqueDropChance knapp UNTER dem Bonus-Schwellwert gesetzt, damit bloodmoon den Ausgang kippt:
    // Default+Bonus wird über eine eigene, niedrige Basis-Chance simuliert (0.2 Basis + 0.05 Bonus).
    const variant = { ...TEST_VARIANT_A, id: "test_bloodmoon", uniqueDropChance: 0.2, uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };

    const setup = (seed: number) => {
      const s = createGame({ name: "X" }, c, 1);
      s.eliteRng = createRng(seed);
      s.combat.eliteVariantId = variant.id;
      return s;
    };
    // Seed so gewählt, dass nextFloat() strikt zwischen 0.2 (Basis) und 0.25 (Basis+Bonus) liegt —
    // an einem neutralen Tag KEIN Drop, an bloodmoon EIN Drop.
    let seed = 1;
    let found = false;
    for (; seed < 5000; seed++) {
      const probe = createRng(seed);
      const roll = nextFloat(probe);
      if (roll > 0.2 && roll <= 0.2 + ELITE_BLOODMOON_UNIQUE_BONUS) {
        found = true;
        break;
      }
    }
    expect(found, "Test-Setup: kein passender Seed gefunden").toBe(true);

    const monster = { ...content.monsters.chicken!, id: content.monsters.chicken!.id };
    const neutral = setup(seed);
    onEliteKilled(neutral, c, monster, MONDAY_NEUTRAL.getTime());
    const bloody = setup(seed);
    onEliteKilled(bloody, c, monster, SATURDAY_BLOODMOON.getTime());

    const neutralDropped = neutral.inventory.instances.some((i) => i.baseItemId === TEST_UNIQUE_ITEM);
    const bloodyDropped = bloody.inventory.instances.some((i) => i.baseItemId === TEST_UNIQUE_ITEM);
    expect(neutralDropped).toBe(false);
    expect(bloodyDropped).toBe(true);

    // Sequenz-Stabilität: der Wurf feuert in BEIDEN Fällen identisch (gleicher Draw-Count) — der
    // eliteRng-Endzustand ist gleich, obwohl das Ergebnis divergiert.
    expect(neutral.eliteRng.state).toBe(bloody.eliteRng.state);
  });

  it("bloodmoon-Bonus ist gedeckelt auf 1 (kein Chance-Wert > 1 durch Content+Bonus-Kombination)", () => {
    const variant = { ...TEST_VARIANT_A, id: "test_cap", uniqueDropChance: 0.99, uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s = createGame({ name: "X" }, c, 1);
    s.eliteRng = createRng(2);
    s.combat.eliteVariantId = variant.id;
    const monster = content.monsters.chicken!;
    // nextFloat liefert immer ≤1 — dieser Test verifiziert nur, dass die Funktion nicht crasht/NaN
    // produziert, wenn dropChance rechnerisch > 1 wäre (0.99 + 0.05 = 1.04, geclampt auf 1).
    expect(() => onEliteKilled(s, c, monster, SATURDAY_BLOODMOON.getTime())).not.toThrow();
    expect(Number.isFinite(s.eliteRng.state)).toBe(true);
  });

  it("ohne nowMs bleibt der Drop-Chance-Wurf bit-identisch zum Vorher-Zustand (kein Bonus)", () => {
    const variant = { ...TEST_VARIANT_A, id: "test_no_nowms", uniqueDropChance: 0.2, uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s1 = createGame({ name: "X" }, c, 1);
    s1.eliteRng = createRng(999);
    s1.combat.eliteVariantId = variant.id;
    const s2 = createGame({ name: "X" }, c, 1);
    s2.eliteRng = createRng(999);
    s2.combat.eliteVariantId = variant.id;
    const monster = content.monsters.chicken!;
    onEliteKilled(s1, c, monster); // kein nowMs
    onEliteKilled(s2, c, monster, undefined); // explizit undefined — identisch
    expect(s1.inventory.instances).toEqual(s2.inventory.instances);
    expect(s1.eliteRng).toEqual(s2.eliteRng);
  });

  it("wildhunt: Zonen-Ruhe-Cooldowns ticken ELITE_WILDHUNT_COOLDOWN_SPEED_MULT× schneller herunter (reiner Dekrement-Multiplikator, kein RNG-Zug)", () => {
    const c = TEST_CONTENT;
    const s = createGame({ name: "X" }, c, 1);
    const START = 10_000; // 10s Ruhe-Cooldown
    s.eliteZones.pastures = { cooldownMs: START };
    step(s, c, false, FRIDAY_WILDHUNT.getTime());
    const wildhuntEntry = s.eliteZones.pastures as { cooldownMs: number };
    expect(wildhuntEntry.cooldownMs).toBe(START - TICK_MS * ELITE_WILDHUNT_COOLDOWN_SPEED_MULT);

    const s2 = createGame({ name: "X" }, c, 1);
    s2.eliteZones.pastures = { cooldownMs: START };
    step(s2, c, false, MONDAY_NEUTRAL.getTime());
    const neutralEntry = s2.eliteZones.pastures as { cooldownMs: number };
    expect(neutralEntry.cooldownMs).toBe(START - TICK_MS);

    // wildhunt tickt strikt schneller herunter als ein neutraler Tag.
    expect(wildhuntEntry.cooldownMs).toBeLessThan(neutralEntry.cooldownMs);
  });

  it("wildhunt wirkt NICHT auf das aktive Verfügbarkeitsfenster (nur auf Ruhe-Cooldowns)", () => {
    const c = TEST_CONTENT;
    const s = createGame({ name: "X" }, c, 1);
    s.eliteZones.pastures = { variantId: TEST_VARIANT_A.id, remainingMs: 10_000 };
    step(s, c, false, FRIDAY_WILDHUNT.getTime());
    const entry = s.eliteZones.pastures as { remainingMs: number };
    expect(entry.remainingMs).toBe(10_000 - TICK_MS); // unbeschleunigt
  });
});

describe("Jagd-Paket S2/M — Champion-Codex (state.eliteCodex)", () => {
  it("sightings +1 bei jedem Spawn der Variante", () => {
    const c = TEST_CONTENT;
    const s = createGame({ name: "X" }, c, 1);
    s.eliteZones.pastures = { cooldownMs: TICK_MS };
    expect(s.eliteCodex[TEST_VARIANT_A.id]?.sightings ?? 0).toBe(0);
    step(s, c, false);
    const spawnedId = s.lastEliteSpawn!.variantId;
    expect(s.eliteCodex[spawnedId]?.sightings).toBe(1);
  });

  it("kills/uniques +1 bei Kill bzw. gefallenem Unique; fastestKillMs misst die Kampfdauer und hält das Minimum", () => {
    const c: ContentDB = { ...content, elites: { [TEST_VARIANT_A.id]: TEST_VARIANT_A } };
    const s = createGame(
      { name: "Killer", baseAttributes: { str: 80, dex: 80, con: 80 } },
      c,
      6,
    );
    s.eliteZones.pastures = { variantId: TEST_VARIANT_A.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);

    const entry = s.eliteCodex[TEST_VARIANT_A.id]!;
    expect(entry.kills).toBe(1);
    expect(entry.uniques).toBe(1); // uniqueDropChance 1
    expect(entry.fastestKillMs).not.toBeNull();
    expect(entry.fastestKillMs!).toBeGreaterThanOrEqual(0);

    // Zweiter Kill: fastestKillMs bildet das Minimum, kills/uniques akkumulieren weiter.
    s.eliteZones.pastures = { variantId: TEST_VARIANT_A.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    const firstFastest = entry.fastestKillMs!;
    killActiveElite(s, c);
    expect(entry.kills).toBe(2);
    expect(entry.uniques).toBe(2);
    expect(entry.fastestKillMs!).toBeLessThanOrEqual(firstFastest);
  });

  it("eliteFightStartMs ist transient — fehlt der Startzeitpunkt (Muster Save/Load-Unterbrechung), bleibt fastestKillMs unverändert statt zu crashen", () => {
    const c: ContentDB = { ...content, elites: { [TEST_VARIANT_A.id]: TEST_VARIANT_A } };
    const s = createGame(
      { name: "Interrupted", baseAttributes: { str: 80, dex: 80, con: 80 } },
      c,
      6,
    );
    s.eliteZones.pastures = { variantId: TEST_VARIANT_A.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    // Simuliert einen Reload mitten im Kampf (der Load-Pfad baut combat OHNE eliteFightStartMs neu auf).
    s.combat.eliteFightStartMs = undefined;
    killActiveElite(s, c);
    expect(s.eliteCodex[TEST_VARIANT_A.id]!.kills).toBe(1);
    expect(s.eliteCodex[TEST_VARIANT_A.id]!.fastestKillMs).toBeNull(); // keine Messung möglich, kein Crash
  });

  it("unbekannte Variante (Content-Drift während des Kampfs) bleibt sauber ohne Codex-Eintrag/Crash", () => {
    const c: ContentDB = { ...content, elites: { [TEST_VARIANT_A.id]: TEST_VARIANT_A } };
    const s = createGame({ name: "Drift" }, c, 1);
    s.combat.eliteVariantId = "ghost_variant_removed";
    const monster = content.monsters.chicken!;
    expect(() => onEliteKilled(s, c, monster)).not.toThrow();
    expect(s.eliteCodex).toEqual({});
  });
});

describe("Jagd-Paket S3 — Kopfgeld (Quest-Tokens)", () => {
  it("jeder Elite-Kill zahlt ELITE_BOUNTY_TOKENS zusätzlich, unabhängig vom Unique-Drop", () => {
    const noUniqueVariant = { ...TEST_VARIANT_A, id: "test_bounty_no_unique", uniqueDropChance: 0, uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [noUniqueVariant.id]: noUniqueVariant } };
    const s = createGame(
      { name: "Bounty", baseAttributes: { str: 80, dex: 80, con: 80 } },
      c,
      6,
    );
    s.eliteZones.pastures = { variantId: noUniqueVariant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    const tokensBefore = s.character.questTokens;
    killActiveElite(s, c);
    expect(s.character.questTokens).toBe(tokensBefore + ELITE_BOUNTY_TOKENS);
    // Kein Unique gefallen (Chance 0) — das Kopfgeld ist trotzdem geflossen.
    expect(s.inventory.instances.some((i) => i.baseItemId === TEST_UNIQUE_ITEM)).toBe(false);
  });

  it("zwei Kills zahlen zweimal Kopfgeld (kumulativ)", () => {
    const c: ContentDB = { ...content, elites: { [TEST_VARIANT_A.id]: TEST_VARIANT_A } };
    const s = createGame(
      { name: "Bounty2", baseAttributes: { str: 80, dex: 80, con: 80 } },
      c,
      6,
    );
    s.eliteZones.pastures = { variantId: TEST_VARIANT_A.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);
    s.eliteZones.pastures = { variantId: TEST_VARIANT_A.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);
    expect(s.character.questTokens).toBe(2 * ELITE_BOUNTY_TOKENS);
  });
});

describe("Jagd-Paket L — Raben-Post (Briefe)", () => {
  it("erster Champion-Kill ÜBERHAUPT löst genau EINEN Brenna-Brief mit 5x cooked_trout aus", () => {
    const noUniqueVariant = { ...TEST_VARIANT_A, id: "test_letter_a", uniqueDropChance: 0, uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [noUniqueVariant.id]: noUniqueVariant } };
    const s = createGame(
      { name: "Letters", baseAttributes: { str: 80, dex: 80, con: 80 } },
      c,
      6,
    );
    expect(s.mailbox.length).toBe(0);
    s.eliteZones.pastures = { variantId: noUniqueVariant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);

    const letters = s.mailbox.filter(isLetter).filter((m) => m.from === "brenna");
    expect(letters.length).toBe(1);
    const letter = letters[0]!;
    expect(letter.textKey).toBe("mail.letter.brenna.firstChampion");
    expect(letter.items).toEqual([{ itemId: "cooked_trout", qty: 5 }]);

    // Zweiter Kill derselben Variante löst KEINEN weiteren Brenna-Brief aus.
    s.eliteZones.pastures = { variantId: noUniqueVariant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);
    expect(s.mailbox.filter(isLetter).filter((m) => m.from === "brenna").length).toBe(1);
  });

  it("erster Unique-Fund ÜBERHAUPT löst genau EINEN Warden-Brief ohne Anhang aus — auch über ZWEI verschiedene Varianten hinweg nur einmal", () => {
    const c: ContentDB = { ...content, elites: { [TEST_VARIANT_A.id]: TEST_VARIANT_A, [TEST_VARIANT_B.id]: TEST_VARIANT_B } };
    const s = createGame(
      { name: "WardenLetter", baseAttributes: { str: 80, dex: 80, con: 80 } },
      c,
      6,
    );
    s.eliteZones.pastures = { variantId: TEST_VARIANT_A.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c); // uniqueDropChance 1 → garantierter erster Unique-Fund

    const wardenLetters1 = s.mailbox.filter(isLetter).filter((m) => m.from === "warden");
    expect(wardenLetters1.length).toBe(1);
    expect(wardenLetters1[0]!.textKey).toBe("mail.letter.warden.firstUnique");
    expect(wardenLetters1[0]!.items).toEqual([]);

    // Zweiter Kill EINER ANDEREN Variante droppt ebenfalls den Unique — KEIN zweiter Warden-Brief
    // (die eliteCodex-SUMME über beide Varianten ist bereits > 0, s. onEliteKilled-Doku).
    s.eliteZones.pastures = { variantId: TEST_VARIANT_B.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);
    expect(s.mailbox.filter(isLetter).filter((m) => m.from === "warden").length).toBe(1);
  });

  it("kein Unique-Drop (Chance 0) ⇒ kein Warden-Brief; der Brenna-Brief bleibt unabhängig davon einmalig", () => {
    const noUniqueVariant = { ...TEST_VARIANT_A, id: "test_letter_no_unique", uniqueDropChance: 0, uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [noUniqueVariant.id]: noUniqueVariant } };
    const s = createGame(
      { name: "NoUnique", baseAttributes: { str: 80, dex: 80, con: 80 } },
      c,
      6,
    );
    s.eliteZones.pastures = { variantId: noUniqueVariant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);
    expect(s.mailbox.some((m) => m.kind === "letter" && m.from === "warden")).toBe(false);
    expect(s.mailbox.some((m) => m.kind === "letter" && m.from === "brenna")).toBe(true);
  });
});
