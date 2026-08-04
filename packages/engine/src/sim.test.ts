import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  findExpectedUnbeatable,
  findGearedWalls,
  findIssues,
  runReport,
  simulateAction,
  simulateCombat,
} from "./sim";
import type { CombatSim } from "./sim";
import { RealisticPlayer } from "./sim-realistic";

function combatRow(c: CombatSim): string {
  return `  ${c.monster.padEnd(20)} Lv${String(c.level).padStart(3)}  kills=${String(c.kills).padStart(
    4,
  )}  ${c.secPerKill === null ? "  --  " : `${c.secPerKill}s/kill`}  deaths=${c.deaths}  ${String(
    c.goldPerHour,
  ).padStart(6)} g/h`;
}

describe("simulation", () => {
  it("läuft für jede Aktion ohne Absturz und liefert Erträge", () => {
    // 2-min-Fenster: bei inzwischen ~900 Aktionen war 10 min zu langsam (~90s). 2 min reicht für
    // den Finite-/≥0-Check vollkommen; Raten werden ohnehin auf 1h normiert.
    for (const id of Object.keys(content.actions)) {
      const r = simulateAction(id, 120_000); // 2 min
      expect(Number.isFinite(r.xpPerHour)).toBe(true);
      expect(r.xpPerHour).toBeGreaterThanOrEqual(0);
    }
  });

  it("läuft Kampf gegen jedes Monster ohne kaputten Zustand", () => {
    for (const id of Object.keys(content.monsters)) {
      const r = simulateCombat(id, 120_000, {
        baseAttributes: { str: 5, con: 5 },
        equip: ["bronze_sword", "leather_body"],
        food: "cooked_trout",
      });
      expect(Number.isFinite(r.goldPerHour)).toBe(true);
      expect(r.kills).toBeGreaterThanOrEqual(0);
      expect(r.deaths).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * Bronze-Baseline-Auffälligkeiten — Messbasis SANIERT 2026-07-26 (#356, Option B aus
   * design/bronze-baseline-analyse.md §9): „zu tanky" misst jetzt gegen die deskriptive
   * Band-HP-Fit-Kurve (`tankyIssue` in sim.ts: maxHp > 1,7× Fit, Boss-Norm 3,4×, Dungeon-
   * Wellen ×1,5) statt gegen das höchste vom CL12-Bronze-Helden getötete Level. Der alte
   * Anker verglich zwei nie zusammengeführte Stat-Populationen (Tower-Mini-HP 0,55–0,83×
   * Fit vs. Openworld 1,05–2,35×): solange die Unter-Kurve-Turm-Mobs Bronze-killbar waren,
   * wurde JEDER gesunde Openworld-Mob darüber zwangsläufig geflaggt — die Dauer-
   * Auffälligkeiten der Sweep-Berichte (gepinnte Zählstände auf dem alten Anker pendelten
   * 12 → 21 → 15 → 9 → 14 → 7 → 9 mit dem 3-min-RNG; konstant war nur der strukturelle
   * Erzeuger, s. Analyse §2/§7).
   *
   * Gepinnter Stand seit #356 (nach Content-Welle A: goblin_warlock 52+16→36+12 hp+ward,
   * pitch_beetle 67→50 — beide auf Kurve): **0 Auffälligkeiten**. Damit ist jede künftige
   * Meldung dieser Liste ein ECHTER Befund (maxHp deutlich über der Band-Kurve UND vom
   * Bronze-Helden unbesiegbar) — gegen die tankyIssue-Doku (sim.ts) triagieren statt neu
   * pinnen. Die gewollten Undergeared-Walls (Bronze CL12 tötet gesunde L30+-Mobs NICHT —
   * Chef-Prinzip Kampfhärte, „früh weicher" ist gewollt) laufen ehrlich als „ÜBER BASELINE —
   * erwartbar unbesiegbar" (je Zelle mit Fit-Ratio/Regen-/Gear-Band-Diagnose).
   * Die 2 Gold-only-Thieving-Flags der alten Pins (pickpocket_city_guard/crack_strongbox)
   * sind seit den Loot-Wellen ebenfalls weg (Aktionen haben Item-Ausgaben).
   *
   * WICHTIG (Sweep6 W2-T4): Turm-Monster (slayerFloor) sind seit dem engine-seitigen
   * Etagen-Gate NUR simulierbar, wenn `simulateCombat` das Slayer-Level mit-hebt (sim.ts) —
   * sonst falsche „Walls".
   *
   * GEAR-BAND (L≥100): steht seit dem #302-Threat-Re-Pin bei **17** Einträgen — ausnahmslos
   * L150+-Monster, deren damage/hp der Papier-Monster-Fix bewusst massiv angehoben hat. Der
   * GEARED_HERO dieses Reports (godiron-Platte, KEINE Runen/Suffixe/Buffs/Tränke, Auto-Eat
   * aus) ist dort per Design nicht das Maß — maßgeblich ist die Referenz-Tank-Probe
   * (monster-threat-spec §8/§10.2) + balance-envelope §5.
   *
   * CEO-ENTSCHEID (2026-07-09): Das Wall-Signal ist nach Bändern getrennt (GEAR_BAND_START in
   * sim.ts). „ECHTE WALLS (Skill-Band L<100)" ist ein HART GEASSERTETES Gesetz (leer);
   * das Gear-Band L≥100 wird informativ gelistet und über die Referenz-Tank-Probe
   * (monster-threat-spec §8) + balance-envelope §5 geguardet — der Plain-Plate-Held bleibt
   * bewusst spartanisch, damit das L<100-Signal scharf bleibt.
   */
  it("druckt den Balance-Report + Auffälligkeiten", () => {
    const report = runReport();

    const actionRows = report.actions
      .map(
        (a) =>
          `  ${a.action.padEnd(22)} ${a.skill.padEnd(14)} Lv${String(a.level).padStart(3)}  ${String(
            a.xpPerHour,
          ).padStart(7)} XP/h  ${String(a.goldPerHour).padStart(7)} g/h  out=${Object.entries(a.outputs)
            .map(([k, v]) => `${k}:${v}`)
            .join(",")}${a.stalled ? "  [STALLED]" : ""}`,
      )
      .join("\n");

    // Pro-Skill-Aggregat (Durchschnitt XP/h & Gold/h über alle Aktionen des Skills).
    const bySkill = new Map<string, { xp: number; gold: number; n: number }>();
    for (const a of report.actions) {
      const e = bySkill.get(a.skill) ?? { xp: 0, gold: 0, n: 0 };
      e.xp += a.xpPerHour;
      e.gold += a.goldPerHour;
      e.n += 1;
      bySkill.set(a.skill, e);
    }
    const skillRows = [...bySkill.entries()]
      .map(([skill, e]) => ({ skill, xp: Math.round(e.xp / e.n), gold: Math.round(e.gold / e.n), n: e.n }))
      .sort((x, y) => y.xp - x.xp)
      .map(
        (r) =>
          `  ${r.skill.padEnd(14)} ${String(r.n).padStart(3)} Aktionen  Ø ${String(r.xp).padStart(7)} XP/h  Ø ${String(
            r.gold,
          ).padStart(7)} g/h`,
      )
      .join("\n");

    const combatRows = report.combat.map(combatRow).join("\n");
    const gearedRows = report.combatGeared.map(combatRow).join("\n");

    const issues = findIssues(report);
    const expected = findExpectedUnbeatable(report);
    const { skillBand: wallsSkill, gearBand: wallsGear } = findGearedWalls(report.combatGeared);

    // eslint-disable-next-line no-console
    console.log(
      `\n=== AKTIONEN (Fenster 2m, Raten/1h) ===\n${actionRows}\n\n=== PRO SKILL (Ø) ===\n${skillRows}\n\n=== KAMPF (Bronze-Baseline, Fenster 3m) ===\n${combatRows}\n\n=== KAMPF (Geared Endgame-Held: Kampf L99 + Götzeneisen, Fenster 3m) ===\n${gearedRows}\n\n=== AUFFÄLLIGKEITEN — Bronze-Baseline (${issues.length}) ===\n${
        issues.length ? issues.map((i) => "  ⚠ " + i).join("\n") : "  (keine)"
      }\n\n=== ÜBER BASELINE — erwartbar unbesiegbar (${expected.length}) ===\n${
        expected.length ? expected.map((i) => "  ℹ " + i).join("\n") : "  (keine)"
      }\n\n=== ECHTE WALLS (Skill-Band L<100) — auch geared unbesiegbar (${wallsSkill.length}) ===\n${
        wallsSkill.length ? wallsSkill.map((i) => "  ⛔ " + i).join("\n") : "  (keine)"
      }\n\n=== GEAR-BAND L≥100 vs. Plain-Plate-Held (${wallsGear.length}) — informativ/GEWOLLT; maßgeblich: Referenz-Tank-Probe (monster-threat-spec §8) + balance-envelope §5 ===\n${
        wallsGear.length ? wallsGear.map((i) => "  ℹ " + i).join("\n") : "  (keine)"
      }\n`,
    );

    expect(report.actions.length).toBeGreaterThan(0);
    expect(report.combat.length).toBeGreaterThan(0);
    expect(report.combatGeared.length).toBeGreaterThan(0);
    // HARTES GESETZ (CEO-Entscheid 2026-07-09 nach #302/#303): Im Skill-Band L<100 darf es NIE eine
    // Wall geben, die selbst der geared Plain-Plate-Held nicht knackt. Das Gear-Band (L≥100) wird
    // bewusst NICHT hier geguardet (Plain-Plate scheitert dort by design) — sondern über die
    // Referenz-Tank-Probe der monster-threat-spec §8 und die TTK-Pins in balance-envelope.test.ts §5.
    expect(wallsSkill).toEqual([]);
  }, 600_000);
});

/**
 * Magier-Material-Paritäts-Audit (design/magier-material-parity-audit.md, 2026-07-23) §5 G4:
 * "Sim-Stil-Parität (weich, Report)". Der kanonische `runReport()` oben fährt NUR die Melee-Bronze-
 * Baseline — genau die Guard-Lücke, wegen der "Magier hängt bei CL9" im Balance-Sim unsichtbar war
 * (s. Audit §2). Fährt denselben ehrlichen Entscheidungs-Spieler (`RealisticPlayer`, s.
 * sim-realistic.test.ts) als melee/ranged/magic-Variante über denselben Sim-Horizont (48 Sim-h),
 * auf BEIDEN Audit-Repro-Seeds (7 UND 21 — Audit §2 nutzt genau diese zwei), und druckt den
 * CL-Fortschritt nebeneinander. WEICH per Spec: nur eine Konsole-Warnung, kein Hard-Fail
 * (Sim-Entscheidungs-Heuristiken sind Rauschen — echte Material-Wände fängt G2/G3 in
 * content-integrity.test.ts hart ab). Sichtbar in jedem `pnpm test`.
 *
 * SCHWELLE 0,85 statt 0,60 (#356, 2026-07-26): Die alte 60-%-Schwelle war zu lasch — Ranged lag
 * einen ganzen Sweep konstant bei 75–80 % der Melee-CL und blieb unsichtbar. Die Audit-P2-
 * Restlücke („RealisticPlayer levelt Runecrafting nicht als Waffen-Route") ist seit der
 * Waffen-Leiter-Heuristik (sim-realistic.ts, weaponLadderTask) GESCHLOSSEN; Messwerte danach
 * (48 Sim-h): seed7 melee CL15 / ranged CL20 / magic CL28; seed21 melee CL16 / ranged CL18 /
 * magic CL27 (vorher: magic CL8/13 auf gnarled_staff mit rc 1, ranged CL12 auf copper_shortbow).
 * Kein Stil liegt mehr unter Melee — Melee ist jetzt der FLOOR der Sim-Heuristik (er bleibt
 * mangels Adequacy-Druck lange auf Copper-Waffen, WEAPON_ADEQUACY_PER_CL): fällt ein Stil unter
 * 85 % selbst dieses Floors, ist das ein starkes Material-Wand-Signal, kein Rauschen mehr.
 */
describe("Material-Parität G4: Sim-Stil-Parität (weich, Report)", () => {
  it("druckt CL-Fortschritt melee/ranged/magic nebeneinander (48 Sim-h, Seeds 7+21)", () => {
    const HOUR = 3_600_000;
    const SIM_HOURS = 48;
    const seeds = [7, 21];
    const styles = ["melee", "ranged", "magic"] as const;
    const results = seeds.flatMap((seed) =>
      styles.map((style) => {
        const rp = new RealisticPlayer(content, { seed, style, name: `${style}${seed}` });
        const res = rp.playFor(SIM_HOURS * HOUR);
        return { seed, style, combatLevel: res.combatLevel, totalLevel: res.totalLevel, kills: res.kills, deaths: res.deaths };
      }),
    );

    const rows = results
      .map(
        (r) =>
          `  seed${r.seed}  ${r.style.padEnd(8)} CL${String(r.combatLevel).padStart(3)}  totalLv${String(
            r.totalLevel,
          ).padStart(4)}  kills=${String(r.kills).padStart(6)}  deaths=${r.deaths}`,
      )
      .join("\n");
    // eslint-disable-next-line no-console
    console.log(`\n=== STIL-PARITÄT (RealisticPlayer, Seeds 7+21, ${SIM_HOURS} Sim-h) ===\n${rows}\n`);

    for (const seed of seeds) {
      const melee = results.find((r) => r.seed === seed && r.style === "melee")!;
      for (const r of results.filter((x) => x.seed === seed)) {
        if (r.style === "melee" || melee.combatLevel <= 1) continue;
        const ratio = r.combatLevel / melee.combatLevel;
        // Schwelle 0,85 (#356): Melee ist der gemessene Floor der Sim-Heuristik (s. Docblock) —
        // ein Stil unter 85 % davon ist ein starkes Material-Wand-Signal, kein Rauschen.
        if (ratio < 0.85) {
          // eslint-disable-next-line no-console
          console.warn(
            `⚠ Stil-Rückstand: seed${seed} ${r.style} CL${r.combatLevel} liegt ${((1 - ratio) * 100).toFixed(0)}% unter melee CL${melee.combatLevel} (Schwelle 85%, G4 ist weich — kein Hard-Fail)`,
          );
        }
      }
    }
    // Kein Hard-Fail auf die Parität selbst (weich, s. Doku oben) — nur die Sim-Grundfunktion bleibt
    // hart geguardet (kein Stil bricht/stagniert komplett bei CL1).
    for (const r of results) expect(r.combatLevel).toBeGreaterThan(1);
  }, 240_000);
});
