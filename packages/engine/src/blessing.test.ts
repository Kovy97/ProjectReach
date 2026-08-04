import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { BlessingId } from "@hearthforge/shared";
import { CAMP_BLESSING_BOOST_CAP, TICK_MS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { setActiveAction } from "./actions";
import { advance, effectiveActionDurationMs } from "./tick";
import { itemCount } from "./inventory";
import { startCombat, combatStep } from "./combat";
import { BLESSINGS, blessingChance, blessingForTime, blessingMult, setShrineChanceBonus, shrineAmplifiedMult } from "./blessing";
import { campShrineBonus } from "./camp";

/**
 * Findet den nächsten Tag (inkl. `from` selbst) mit dem gewünschten LOKALEN Wochentag
 * (`Date#getDay()`, 0=So…6=Sa) — sucht vorwärts statt eine Kalender-Wochentag-Zuordnung zu raten,
 * damit die Tests unabhängig von der TZ der Test-Maschine UND von "welcher Wochentag ein bestimmtes
 * 2026er-Datum ist" bleiben (Chef-Vorgabe: lokale Zeitzone, keine hartcodierten Epoch-Zahlen).
 * Rückgabe: Date auf 12:00:00.000 lokal (Mittag — meidet DST-Kanten um Mitternacht).
 */
function nextLocalWeekday(from: Date, targetDay: number): Date {
  let d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
  while (d.getDay() !== targetDay) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0, 0);
  }
  return d;
}

/** Lokale Mitternacht (00:00:00.000) des Kalendertags NACH `d`. */
function nextLocalMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
}

const REF = new Date(2026, 0, 1); // beliebiger Startpunkt für die Vorwärtssuche

describe("blessingForTime — Wochentag → Segen (lokale Zeitzone)", () => {
  // Spec-Tabelle (Chef-Auftrag 2026-07-21 + Korrektur „lokal statt UTC"): 0=So…6=Sa.
  const EXPECTED_BY_WEEKDAY: Record<number, BlessingId> = {
    0: "rotmist",
    1: "mistvigil",
    2: "ashenstorm",
    3: "silence",
    4: "greed",
    5: "wildhunt",
    6: "bloodmoon",
  };

  for (const day of [0, 1, 2, 3, 4, 5, 6]) {
    it(`Wochentag ${day} → ${EXPECTED_BY_WEEKDAY[day]}`, () => {
      const d = nextLocalWeekday(REF, day);
      expect(d.getDay()).toBe(day); // Sanity: die Suche hat wirklich den gewünschten Wochentag gefunden
      const b = blessingForTime(d.getTime());
      expect(b.id).toBe(EXPECTED_BY_WEEKDAY[day]);
    });
  }

  it("Definitionen (kind/mult) entsprechen exakt der Spec-Tabelle", () => {
    // bloodmoon (Task #337): mult ist hier eine CHANCE (0.15 = 15 % auf doppelten Gesamt-Loot pro
    // Kill), KEIN Multiplikator — s. blessing.ts-Kommentar.
    expect(BLESSINGS.bloodmoon).toEqual({ id: "bloodmoon", kind: "doubleLootChance", mult: 0.15 });
    expect(BLESSINGS.ashenstorm).toEqual({ id: "ashenstorm", kind: "gather", mult: 1.15 });
    expect(BLESSINGS.silence).toEqual({ id: "silence", kind: "craftSpeed", mult: 1.10 });
    expect(BLESSINGS.rotmist).toEqual({ id: "rotmist", kind: "rareDrop", mult: 1.10 });
    expect(BLESSINGS.mistvigil).toEqual({ id: "mistvigil", kind: "xp", mult: 1.10 });
    expect(BLESSINGS.greed).toEqual({ id: "greed", kind: "gold", mult: 1.20 });
    expect(BLESSINGS.wildhunt).toEqual({ id: "wildhunt", kind: "attackSpeed", mult: 1.10 });
  });

  it("blessingMult liefert 1 ohne nowMs (Alt-Aufrufer/Tests/Sim-Läufe bit-identisch)", () => {
    expect(blessingMult(undefined, "xp")).toBe(1);
    expect(blessingMult(undefined, "gold")).toBe(1);
    expect(blessingMult(undefined, "attackSpeed")).toBe(1);
  });

  it("blessingChance (Chance-Semantik, Task #337): neutral 0 ohne nowMs bzw. an anderen Tagen; 0.15 am Samstag", () => {
    const saturday = nextLocalWeekday(REF, 6);
    const monday = nextLocalWeekday(REF, 1);
    expect(blessingChance(undefined, "doubleLootChance")).toBe(0); // kein Wall-Clock-Anker → kein Wurf
    expect(blessingChance(monday.getTime(), "doubleLootChance")).toBe(0); // anderer Segen aktiv
    expect(blessingChance(saturday.getTime(), "doubleLootChance")).toBeCloseTo(0.15, 10);
  });

  it("blessingMult liefert 1 für eine NICHT aktive Segens-Art am selben Tag", () => {
    const monday = nextLocalWeekday(REF, 1); // mistvigil (xp)
    expect(blessingMult(monday.getTime(), "gold")).toBe(1);
    expect(blessingMult(monday.getTime(), "xp")).toBeCloseTo(1.10, 10);
  });
});

describe("Blessings of the Reach — Effekt-Integration", () => {
  it("mistvigil (Montag, §xp): Skilling-XP ist an diesem Tag +10% höher als ohne Segen", () => {
    const ACTION = "cut_normal_tree"; // gather, kein successBase → deterministisch, xp=4/Abschluss
    const action = content.actions[ACTION]!;
    const monday = nextLocalWeekday(REF, 1);

    const baseline = createTestGame({ name: "X" }, content, 1);
    setActiveAction(baseline, content, ACTION);
    advance(baseline, content, action.durationMs); // exakt ein Abschluss
    const xpBaseline = baseline.skills.woodcutting?.xp ?? 0;
    expect(xpBaseline).toBeCloseTo(action.xp, 10);

    const blessed = createTestGame({ name: "X" }, content, 1); // gleicher Seed
    setActiveAction(blessed, content, ACTION);
    advance(blessed, content, action.durationMs, { nowMs: monday.getTime() });
    const xpBlessed = blessed.skills.woodcutting?.xp ?? 0;

    expect(xpBlessed).toBeGreaterThan(xpBaseline);
    expect(xpBlessed).toBeCloseTo(action.xp * 1.10, 10);
  });

  it("ashenstorm (Dienstag, §gather): Sammel-Aktionen sind schneller — mehr Abschlüsse/Zeit statt mehr Menge/Abschluss", () => {
    // Chef-Fix 2026-07-21: ashenstorm war ursprünglich ein MENGEN-Bonus (qty·1.15), aber bei den
    // üblichen 1er-Drops (cut_normal_tree = 1 Log) ist round(1·1.15)=1 unsichtbar. Jetzt ein
    // TEMPO-Bonus auf die Aktionsdauer — wirkt immer, unabhängig von der gewürfelten Menge.
    const ACTION = "cut_normal_tree";
    const action = content.actions[ACTION]!;
    const tuesday = nextLocalWeekday(REF, 2);

    // Die Formel direkt: effectiveActionDurationMs teilt NUR für Sammel-Aktionen durch den
    // gather-Mult (craftSpeed bleibt unberührt, da cut_normal_tree kein `inputs` hat).
    const s = createTestGame({ name: "X" }, content, 1);
    const durBaseline = effectiveActionDurationMs(s, content, action);
    const durBlessed = effectiveActionDurationMs(s, content, action, tuesday.getTime());
    expect(durBaseline).toBe(action.durationMs);
    expect(durBlessed).toBe(Math.round(action.durationMs / 1.15));
    expect(durBlessed).toBeLessThan(durBaseline);

    // Und end-to-end: im selben Zeitfenster (fixe Ticks) mehr Abschlüsse → mehr XP/Drops, ohne
    // dass sich die pro-Abschluss-Menge ändert.
    const WINDOW_MS = 20_000; // 20s — mehrere volle Zyklen in beiden Fällen
    const baseline = createTestGame({ name: "X" }, content, 1);
    setActiveAction(baseline, content, ACTION);
    advance(baseline, content, WINDOW_MS);
    const xpBaseline = baseline.skills.woodcutting?.xp ?? 0;
    const logsBaseline = itemCount(baseline.inventory, "normal_log");

    const blessed = createTestGame({ name: "X" }, content, 1); // gleicher Seed
    setActiveAction(blessed, content, ACTION);
    advance(blessed, content, WINDOW_MS, { nowMs: tuesday.getTime() });
    const xpBlessed = blessed.skills.woodcutting?.xp ?? 0;
    const logsBlessed = itemCount(blessed.inventory, "normal_log");

    expect(xpBlessed).toBeGreaterThan(xpBaseline);
    expect(logsBlessed).toBeGreaterThan(logsBaseline);
  });

  it("greed (Donnerstag, §gold): Thieving-Gold-Ertrag ist über viele Abschlüsse hinweg spürbar höher", () => {
    const ACTION = "pickpocket_beggar"; // hat successBase → Erfolg/Fehlschlag ist RNG-gezogen
    const thursday = nextLocalWeekday(REF, 4);
    const TICKS = 6000; // 600s — reichlich Abschlüsse (durationMs 3000) für ein stabiles Aggregat

    const baseline = createTestGame({ name: "X" }, content, 3);
    setActiveAction(baseline, content, ACTION);
    advance(baseline, content, TICKS * TICK_MS);
    const goldBaseline = baseline.character.gold;
    expect(goldBaseline).toBeGreaterThan(0); // Sanity: es gab überhaupt Erfolge

    const blessed = createTestGame({ name: "X" }, content, 3); // gleicher Seed → identische Erfolgs-/RNG-Sequenz
    setActiveAction(blessed, content, ACTION);
    advance(blessed, content, TICKS * TICK_MS, { nowMs: thursday.getTime() });
    const goldBlessed = blessed.character.gold;

    expect(goldBlessed).toBeGreaterThan(goldBaseline);
    // Lockere Bandbreite um +20% (Rundungsrauschen je Abschluss, aggregiert über viele Erfolge).
    expect(goldBlessed / goldBaseline).toBeGreaterThan(1.05);
    expect(goldBlessed / goldBaseline).toBeLessThan(1.35);
  });

  it("bloodmoon (Samstag, §doubleLootChance, Task #337): pro Kill EIN Wurf — Beute ist exakt ×1 ODER exakt ×2, nie skaliert; Gold nie verdoppelt", () => {
    // rootling_treemonster: garantierter oak_log-Drop (chance 1, min 3, max 6). Gleicher Seed ⇒
    // identische RNG-Sequenz bis einschließlich des Loot-Wurfs; der Segen zieht danach genau EINEN
    // Extra-Float (und nur, weil der Kill Beute produziert hat). Je Seed also: Menge identisch
    // (kein Proc) oder exakt verdoppelt (Proc) — über mehrere Seeds müssen BEIDE Ausgänge vorkommen.
    // (Die volle Matrix — Instanz-Duplikat, carrionwing-Zusammenspiel, RNG-Regression — liegt in
    // bloodmoon-double-loot.test.ts.)
    const MONSTER = "rootling_treemonster";
    const saturday = nextLocalWeekday(REF, 6);
    const runKill = (seed: number, nowMs?: number) => {
      const s = createTestGame(
        { name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } },
        content,
        seed,
      );
      startCombat(s, content, MONSTER);
      s.combat.enemyHp = 1; // nächster landender Treffer tötet
      let guard = 0;
      while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) {
        combatStep(s, content, nowMs);
      }
      expect(s.combat.kills).toBe(1);
      return {
        qty: itemCount(s.inventory, "oak_log"),
        gold: s.character.gold,
        proc: s.combat.lastKill?.bloodMoonProc === true,
        summaryQty: s.combat.lastKill?.loot.find((l) => l.itemId === "oak_log")?.qty ?? 0,
      };
    };

    let procs = 0;
    let plain = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const base = runKill(seed);
      expect(base.qty).toBeGreaterThanOrEqual(3);
      const blessed = runKill(seed, saturday.getTime());
      // Gold ist KEIN Loot-Tabellen-Eintrag → der Blutmond fasst es nie an (gleicher Seed, gleicher
      // Gold-Wurf VOR dem Segens-Wurf).
      expect(blessed.gold).toBe(base.gold);
      if (blessed.proc) {
        procs++;
        expect(blessed.qty).toBe(base.qty * 2); // ALLES 2x — kein max(1, round(qty·1.15)) mehr
      } else {
        plain++;
        expect(blessed.qty).toBe(base.qty); // ohne Proc bit-identische Beute
      }
      // Kill-Summary (Quelle der Kill-Karte/Toasts) zeigt exakt die vergebene Endmenge.
      expect(blessed.summaryQty).toBe(blessed.qty);
    }
    expect(procs).toBeGreaterThan(0); // der 15 %-Proc kommt über 40 Seeds vor …
    expect(plain).toBeGreaterThan(0); // … und ist kein Dauer-Proc
  });

  it("wildhunt (Freitag, §attackSpeed): der Spieler greift in einem festen Zeitfenster häufiger an", () => {
    const MONSTER = "rootling_treemonster";
    const friday = nextLocalWeekday(REF, 5);
    const setup = () => {
      const s = createTestGame(
        { name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } },
        content,
        9,
      );
      startCombat(s, content, MONSTER);
      s.combat.enemyHp = 100_000; // Gegner darf im Testfenster nicht sterben (kein Respawn-Rauschen)
      return s;
    };
    const attackEvents = (s: ReturnType<typeof setup>) =>
      s.combat.log.filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "miss" || e.kind === "crit"))
        .length;

    const WINDOW_TICKS = 400; // 40s
    const baseline = setup();
    for (let i = 0; i < WINDOW_TICKS; i++) combatStep(baseline, content);
    const attacksBaseline = attackEvents(baseline);
    expect(attacksBaseline).toBeGreaterThan(0);

    const blessed = setup();
    for (let i = 0; i < WINDOW_TICKS; i++) combatStep(blessed, content, friday.getTime());
    const attacksBlessed = attackEvents(blessed);

    expect(attacksBlessed).toBeGreaterThan(attacksBaseline);
  });
});

describe("offline == online über eine LOKALE Mitternacht hinweg (das kritische Gesetz)", () => {
  // Subtilität (Chef-Anfrage 2026-07-21): `ashenstorm`/§gather ist jetzt ein DAUER-Divisor
  // (effectiveActionDurationMs), keine feste Größe mehr, die beim Aktionsstart "einfriert" —
  // skillingStep ruft effectiveActionDurationMs JEDEN Tick frisch auf (genau wie Mastery/Werkzeug
  // das schon immer tun), also greift ein Segenswechsel zur Mitternacht sofort im nächsten Tick.
  // Das bedeutet: die Anzahl der Abschlüsse VOR/NACH der Grenze lässt sich nicht mehr sauber von
  // Hand vorausberechnen (die Dauer selbst ändert sich mitten im Fortschritt). Der Test verlässt
  // sich deshalb NICHT auf hart codierte Abschluss-Zeitpunkte, sondern auf zwei unabhängige Prüfungen:
  //  (a) online (viele kleine advance()-Aufrufe) == offline (ein großer Sprung) — bit-identisch,
  //      unabhängig davon, wie viele Abschlüsse wann genau fielen.
  //  (b) der gemischte Lauf weicht von BEIDEN "eingefrorenen" Referenzen ab (ganzes Fenster nur
  //      Montag- bzw. nur Dienstag-Segen) — das beweist echte Pro-Tick-Segmentierung, nicht nur
  //      "irgendeine Segen-Art wirkt am Ende/Anfang fürs ganze Fenster".
  it("ein Offline-Sprung über die Tagesgrenze liefert dasselbe Ergebnis wie tickweises Live-Spiel", () => {
    const ACTION = "cut_normal_tree"; // durationMs 2800 = 28 Ticks, xp=4, garantierter 1er-Log-Drop
    const action = content.actions[ACTION]!;
    expect(action.durationMs).toBe(28 * TICK_MS);

    // Montag (mistvigil, §xp +10%, KEINE Dauer-Wirkung) → Dienstag (ashenstorm, §gather: Dauer ÷1.15,
    // KEINE XP-Wirkung): zwei UNTERSCHIEDLICHE Effekt-ACHSEN auf beiden Seiten der Grenze.
    const monday = nextLocalWeekday(REF, 1);
    const mondayNoon = monday.getTime();
    const tuesdayNoon = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 1,
      12,
      0,
      0,
      0,
    ).getTime();
    const midnight = nextLocalMidnight(monday); // lokale Mitternacht Mo→Di

    // Fenster: 200 Ticks (20s), Mitternacht liegt komfortabel in der Mitte — auf JEDER Seite passen
    // mehrere volle Abschluss-Zyklen hinein (Basis-Dauer 28 Ticks, ashenstorm-Dauer ~24,3 Ticks).
    const TOTAL_TICKS = 200;
    const t0 = midnight - 100 * TICK_MS;

    // — Szenario A: „online" — jeder Tick ein eigener advance()-Aufruf mit dem realen „jetzt" —
    const online = createTestGame({ name: "X" }, content, 5);
    setActiveAction(online, content, ACTION);
    for (let k = 1; k <= TOTAL_TICKS; k++) {
      advance(online, content, TICK_MS, { nowMs: t0 + k * TICK_MS });
    }

    // — Szenario B: „offline" — EIN großer Sprung übers ganze Fenster (Muster deserialize) —
    const offline = createTestGame({ name: "X" }, content, 5); // identischer Seed
    setActiveAction(offline, content, ACTION);
    advance(offline, content, TOTAL_TICKS * TICK_MS, { offline: true, nowMs: t0 + TOTAL_TICKS * TICK_MS });

    // (a) Bit-identisches Ergebnis, unabhängig vom Aufruf-Muster — das harte Gesetz.
    expect(offline.skills.woodcutting?.xp).toBe(online.skills.woodcutting?.xp);
    expect(itemCount(offline.inventory, "normal_log")).toBe(itemCount(online.inventory, "normal_log"));
    expect(offline.actionProgressMs).toBe(online.actionProgressMs);
    expect(offline.mastery[ACTION]?.xp).toBe(online.mastery[ACTION]?.xp);

    // Sanity: es gab tatsächlich mehrere Abschlüsse (sonst wäre die Grenze nicht wirklich getestet).
    expect(online.skills.woodcutting?.xp ?? 0).toBeGreaterThan(action.xp * 3);

    // (b) Referenzläufe mit dem Segen für das GESAMTE Fenster eingefroren (weit weg von Mitternacht,
    // sodass der rekonstruierte Pro-Tick-Anker nie kippt) — beweist echte Segmentierung, nicht nur
    // "irgendeine Tages-Regel gilt fürs ganze Fenster".
    const allMonday = createTestGame({ name: "X" }, content, 5);
    setActiveAction(allMonday, content, ACTION);
    advance(allMonday, content, TOTAL_TICKS * TICK_MS, { nowMs: mondayNoon });

    const allTuesday = createTestGame({ name: "X" }, content, 5);
    setActiveAction(allTuesday, content, ACTION);
    advance(allTuesday, content, TOTAL_TICKS * TICK_MS, { nowMs: tuesdayNoon });

    // Die beiden Segen-Tage müssen sich in diesem Fenster überhaupt unterscheiden (sonst wäre die
    // folgende Abweichungs-Prüfung bedeutungslos).
    expect(allMonday.skills.woodcutting?.xp).not.toBe(allTuesday.skills.woodcutting?.xp);
    // Der gemischte (echte) Lauf weicht von BEIDEN eingefrorenen Extremen ab.
    expect(online.skills.woodcutting?.xp).not.toBe(allMonday.skills.woodcutting?.xp);
    expect(online.skills.woodcutting?.xp).not.toBe(allTuesday.skills.woodcutting?.xp);
  });
});

// ── Das Lager: Schrein der Stillen (Task #359, encampment-balance.md §6 / Chef-Entscheid K2) ─────

/**
 * Der Schrein verstärkt den BONUS-ANTEIL eines Segens (Bonus × (1 + 0.10 × Stufe)), NICHT den
 * Multiplikator als Ganzes. wildhunt ist AUSGENOMMEN (Kampf-Segen, Eiserne Regel 3) — Ersatz an
 * wildhunt-Tagen ist die Elite-Ruhe-Cooldown-Beschleunigung (elites.ts, s. elites-Tests).
 */
describe("Schrein der Stillen — Segens-Verstärkung", () => {
  const SHRINE = "camp_warden_shrine";

  it("shrineAmplifiedMult rechnet exakt die Balance-Tabelle §6 nach", () => {
    // Basis → I / II / III (Anteil 0.10 / 0.20 / 0.30). NUR die MULTIPLIKATOR-Segen: hier ist der
    // Bonus der Anteil ÜBER 1. Der CHANCE-Segen bloodmoon (0.15 IST der ganze Bonus, nicht 1.15)
    // läuft bewusst NICHT über diese Funktion, sondern über die Injektion in `blessingChance`
    // (eigener Testfall unten) — sonst würde aus 0.15 fälschlich 0.065.
    const table: Array<[number, [number, number, number]]> = [
      [1.15, [1.165, 1.18, 1.195]], // ashenstorm (Sammel-Tempo)
      [1.10, [1.11, 1.12, 1.13]], // silence / rotmist / mistvigil
      [1.20, [1.22, 1.24, 1.26]], // greed
    ];
    for (const [base, expected] of table) {
      for (let stufe = 1; stufe <= 3; stufe++) {
        expect(shrineAmplifiedMult(base, stufe * 0.10), `${base} Stufe ${stufe}`).toBeCloseTo(
          expected[stufe - 1]!,
          10,
        );
      }
    }
  });

  it("neutral ohne Schrein und bei Basis 1 (kein Segen dieser Art aktiv)", () => {
    expect(shrineAmplifiedMult(1.15, 0)).toBe(1.15);
    expect(shrineAmplifiedMult(1, 0.30)).toBe(1);
  });

  it("campShrineBonus: 0 ohne Lager, 0.10/0.20/0.30 je Stufe, hart auf 0.30 geklemmt", () => {
    const s = createTestGame({ name: "Schrein" }, content, 1);
    expect(campShrineBonus(s, content)).toBe(0);
    for (const [level, expected] of [[1, 0.10], [2, 0.20], [3, 0.30]] as const) {
      s.camp.buildings[SHRINE] = level;
      s.camp.buildSeq += 1;
      expect(campShrineBonus(s, content), `Stufe ${level}`).toBeCloseTo(expected, 10);
    }
    // Überhöhter Katalog → Klemme greift.
    const fat = {
      ...content,
      campBuildings: content.campBuildings!.map((b) =>
        b.id !== SHRINE ? b : { ...b, levels: b.levels.map((l) => ({ ...l, boost: { ...l.boost, value: 0.5 } })) },
      ),
    } as typeof content;
    s.camp.buildSeq += 1;
    expect(campShrineBonus(s, fat)).toBe(CAMP_BLESSING_BOOST_CAP);
  });

  it("Sammel-Tempo am ashenstorm-Tag: Schrein III macht aus ÷1.15 ein ÷1.195", () => {
    const tuesday = nextLocalWeekday(REF, 2); // ashenstorm
    const nowMs = tuesday.getTime();
    const action = content.actions.cut_normal_tree!;

    const bare = createTestGame({ name: "Ohne" }, content, 1);
    const shrined = createTestGame({ name: "Mit" }, content, 1);
    shrined.camp.buildings[SHRINE] = 3;
    shrined.camp.buildSeq += 1;

    expect(effectiveActionDurationMs(bare, content, action, nowMs)).toBe(
      Math.round(action.durationMs / 1.15),
    );
    expect(effectiveActionDurationMs(shrined, content, action, nowMs)).toBe(
      Math.round(action.durationMs / 1.195),
    );
  });

  it("wildhunt AUSGENOMMEN (K2): am Freitag ändert der Schrein die Aktions-Dauer NICHT", () => {
    const friday = nextLocalWeekday(REF, 5); // wildhunt (Kampf-Segen)
    const nowMs = friday.getTime();
    const action = content.actions.cut_normal_tree!;
    const bare = createTestGame({ name: "Ohne" }, content, 1);
    const shrined = createTestGame({ name: "Mit" }, content, 1);
    shrined.camp.buildings[SHRINE] = 3;
    shrined.camp.buildSeq += 1;
    expect(effectiveActionDurationMs(shrined, content, action, nowMs)).toBe(
      effectiveActionDurationMs(bare, content, action, nowMs),
    );
    expect(effectiveActionDurationMs(bare, content, action, nowMs)).toBe(action.durationMs);
  });

  it("bloodmoon-CHANCE wird über die Tick-Injektion verstärkt (0.15 → 0.195) und sauber zurückgesetzt", () => {
    const saturday = nextLocalWeekday(REF, 6); // bloodmoon
    const nowMs = saturday.getTime();
    setShrineChanceBonus(0);
    expect(blessingChance(nowMs, "doubleLootChance")).toBeCloseTo(0.15, 10);
    setShrineChanceBonus(0.30);
    expect(blessingChance(nowMs, "doubleLootChance")).toBeCloseTo(0.195, 10);
    // Klemme + Reset-Vertrag (Default 0 = neutral für Direkt-Aufrufer ohne Tick-Kontext).
    setShrineChanceBonus(99);
    expect(blessingChance(nowMs, "doubleLootChance")).toBeCloseTo(0.15 * 1.30, 10);
    setShrineChanceBonus(0);
    expect(blessingChance(nowMs, "doubleLootChance")).toBeCloseTo(0.15, 10);
  });

  it("advance() setzt die Chance-Injektion deterministisch aus dem State (ohne Lager: 0)", () => {
    const saturday = nextLocalWeekday(REF, 6);
    const nowMs = saturday.getTime();
    setShrineChanceBonus(0.30); // absichtlich „verschmutzt"
    const bare = createTestGame({ name: "Ohne" }, content, 1);
    advance(bare, content, TICK_MS, { nowMs });
    expect(blessingChance(nowMs, "doubleLootChance")).toBeCloseTo(0.15, 10); // zurückgesetzt

    const shrined = createTestGame({ name: "Mit" }, content, 1);
    shrined.camp.buildings[SHRINE] = 3;
    shrined.camp.buildSeq += 1;
    advance(shrined, content, TICK_MS, { nowMs });
    expect(blessingChance(nowMs, "doubleLootChance")).toBeCloseTo(0.195, 10);
    setShrineChanceBonus(0); // Testhygiene
  });
});
