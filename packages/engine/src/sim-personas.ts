/**
 * SIM-Agent-Toolkit — Ziel-gerichtete & adversariale Personas.
 *
 * Jede Persona hat ein Ziel + eine Verhaltens-Policy, treibt einen `SimPlayer` durch eine Session und
 * liefert strukturierte `Finding`s (mit Repro + Evidence). Ziel: „Fake-Spieler", die realistischer
 * spielen als der mechanische Balance-Sim (sim.ts) — Walls/Dead-ends, Offline-Catch-up, Crash-
 * Resistenz gegen unmögliche Eingaben und Cap-Verhalten (Hoarder).
 *
 * REFERENZ-NUTZUNG RealisticPlayer (sim-realistic.ts): `progression_combat` und `speedrunner`
 * laufen im HONEST-Modus über den RealisticPlayer — nichts wird gecheatet (kein give/setSkillLevel);
 * Food/Gear/Munition werden verdient, gekauft, gekocht. Ihre Findings enthalten zusätzlich das
 * Friction-Log als realistisches Spieler-Feedback (`frictionsToFindings`). Die übrigen Personas
 * (hoarder/afk_returner/button_masher/crafter) bleiben Skript-Personas auf dem rohen SimPlayer.
 *
 * MULTI-GOAL-PERSONAS (sim-goals.ts): `allrounder` verfolgt MEHRERE Ziele in EINEM Lauf über
 * `RealisticPlayer.pursue(goals, { budgetMs })` — Referenz für Sweep-Agenten, die eigene
 * Ziel-Kombinationen fahren wollen. Ihr `PersonaResult.multiGoal` enthält das volle
 * `MultiGoalResult` (✅/◐/❌ je Ziel); `formatPersonaReport` rendert es mit. Zeitangaben darin
 * sind SPIELZEIT (Sim läuft ~4.000–17.000× Echtzeit) — Pacing nur über Spielzeit-Raten beurteilen.
 *
 * Vollständig deterministisch/headless: seeded RNG über `SimPlayer`/`RealisticPlayer`, kein Date.now,
 * kein I/O. Budgets sind IN-GAME-Millisekunden (Spielzeit) — Tests fahren winzige Budgets, Sweeps grosse.
 */
import type { ContentDB } from "@hearthforge/shared";
import { SimPlayer } from "./sim-player";
import type { SimSnapshot } from "./sim-player";
import type { Finding, Severity, Category } from "./sim-report";
import { FindingCollector, SEVERITY_ORDER } from "./sim-report";
import { RealisticPlayer, frictionsToFindings } from "./sim-realistic";
import { combatLevel, formatMultiGoalMarkdown, formatSimDuration, gold, skillLevel } from "./sim-goals";
import type { MultiGoalResult } from "./sim-goals";

export interface PersonaRunOptions {
  seed?: number;
  /** Spielzeit-Budget in ms (In-Game). Die Persona hört auf, sobald es erreicht ist. */
  budgetMs?: number;
}

export interface PersonaResult {
  persona: string;
  goal: string;
  achieved: boolean;
  summary: string;
  findings: Finding[];
  snapshot: SimSnapshot;
  /** Nur Multi-Goal-Personas: das volle Ziel-für-Ziel-Ergebnis (sim-goals.ts). */
  multiGoal?: MultiGoalResult;
}

export interface Persona {
  id: string;
  goal: string;
  run(content: ContentDB, opts?: PersonaRunOptions): PersonaResult;
}

// ── kleine Finding-Fabrik (hält den Persona-Code knapp) ───────────────────────────────────────
function finding(
  severity: Severity,
  category: Category,
  title: string,
  expected: string,
  actual: string,
  repro: string[],
  evidence?: Record<string, unknown>,
): Finding {
  return { severity, category, title, expected, actual, repro, ...(evidence ? { evidence } : {}) };
}

// (Die früheren Skript-Helfer stockFood/grindCombat sind mit der Umstellung von
// progression_combat & speedrunner auf den ehrlichen RealisticPlayer entfallen —
// Zielwahl/Food-Management leben jetzt als menschliche Heuristiken in sim-realistic.ts.)

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1) progression_combat — Ziel: Kampf-Niveau 30. HONEST via RealisticPlayer (Referenz-Nutzung):
//    kein give/setSkillLevel — Food/Gear/Munition werden verdient/gekauft/gekocht. Frictions
//    fließen als realistisches Spieler-Feedback in die Findings ein.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const progressionCombat: Persona = {
  id: "progression_combat",
  goal: "Kampf-Niveau 30 als ehrlicher Spieler erreichen (RealisticPlayer, honest)",
  run(content, opts = {}) {
    const budgetMs = opts.budgetMs ?? 30 * 60 * 1000; // 30 Sim-Minuten
    const rp = new RealisticPlayer(content, {
      seed: opts.seed ?? 11,
      name: "Grinder",
      style: "melee",
      skillingBias: 0.15, // überwiegend Kampf, gelegentlich Skilling (wie echte Grinder)
    });
    const res = rp.playFor(budgetMs);
    const findings: Finding[] = [...frictionsToFindings(res.frictions)];
    const snap = res.snapshot;

    if (res.kills === 0 && budgetMs >= 5 * 60 * 1000) {
      findings.push(
        finding(
          "P1",
          "balance",
          "Ehrlicher Nahkämpfer erzielt im gesamten Budget keinen einzigen Kill",
          "Ein frischer Held findet sofort besiegbare Gegner",
          `0 Kills in ${Math.round(res.simTimeMs / 60000)} Sim-Min (${res.deaths} Tode) — der Einstieg ist blockiert`,
          ["RealisticPlayer (melee) starten", `playFor(${budgetMs})`],
          { combatLevel: res.combatLevel, deaths: res.deaths, frictions: res.frictions.length },
        ),
      );
    } else if (!res.combatLevel || res.combatLevel < 30) {
      const perMin = res.simTimeMs > 0 ? res.kills / (res.simTimeMs / 60000) : 0;
      findings.push(
        finding(
          "P3",
          "feel",
          "Kampf-Niveau 30 im Budget nicht erreicht (ehrliches Pacing-Maß)",
          "Ziel im Zeitbudget erreichbar",
          `Nach ${Math.round(res.simTimeMs / 60000)} Sim-Min (davon ${Math.round(res.idleMs / 60000)} idle) bei Kampf-Niveau ${res.combatLevel} (${perMin.toFixed(1)} Kills/Min)`,
          ["RealisticPlayer (melee) starten", "Bis zum Budget spielen lassen"],
          { finalCombatLevel: res.combatLevel, killsPerMin: Number(perMin.toFixed(2)), idleMinutes: Math.round(res.idleMs / 60000) },
        ),
      );
    }

    return {
      persona: this.id,
      goal: this.goal,
      achieved: res.combatLevel >= 30,
      summary: `Kampf-Niveau ${res.combatLevel}/30, ${res.kills} Kills, ${res.deaths} Tode, ${res.frictions.length} Frictions in ${Math.round(res.simTimeMs / 60000)} Sim-Min`,
      findings,
      snapshot: snap,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2) crafter — Ziel: Craft-Tree (Smithing) hochleveln.
// Task #286 Stage B: war cut_normal_tree → fletch_shafts (Fletching/Munitions-Kette, komplett
// gelöscht). Ersetzt durch die analoge Gather→Process-Kette Mining→Smithing (mine_copper liefert
// copper_ore, smelt_copper verbraucht es zu copper_bar) — gleiche Form (Sammeln↔Verarbeiten-
// Wechsel, beide L1, req-frei), nur ein anderer Skill.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const CRAFT_GATHER = "mine_copper"; // liefert copper_ore
const CRAFT_ACTION = "smelt_copper"; // verbraucht copper_ore → copper_bar
const CRAFT_SKILL = "smithing";
const crafter: Persona = {
  id: "crafter",
  goal: "Smithing auf Level 10 hochleveln (Sammeln → Verarbeiten)",
  run(content, opts = {}) {
    const budgetMs = opts.budgetMs ?? 20 * 60 * 1000;
    const player = new SimPlayer(content, { seed: opts.seed ?? 22, creation: { name: "Crafter" } });
    const findings: Finding[] = [];

    if (!content.actions[CRAFT_GATHER] || !content.actions[CRAFT_ACTION]) {
      findings.push(
        finding("P1", "bug", "Craft-Kette im Content nicht auffindbar", `${CRAFT_GATHER} + ${CRAFT_ACTION} existieren`, "eine der Aktionen fehlt", ["Content laden"]),
      );
      return { persona: this.id, goal: this.goal, achieved: false, summary: "Content-Lücke", findings, snapshot: player.snapshot() };
    }

    let simTime = 0;
    let stalledEarly = false;
    const window = 60 * 1000; // 1 Sim-Min je Phase
    while (simTime < budgetMs && player.level(CRAFT_SKILL) < 10) {
      // Phase A: Erz sammeln (Nachschub).
      if (!player.startAction(CRAFT_GATHER)) break;
      player.advanceTime(window);
      simTime += window;
      const ore = player.inventoryCount("copper_ore");
      // Phase B: verarbeiten, bis Material leer (Aktion stoppt sich selbst bei fehlenden Inputs).
      if (!player.startAction(CRAFT_ACTION)) break;
      player.advanceTime(window);
      simTime += window;
      const oreAfter = player.inventoryCount("copper_ore");
      const bars = player.inventoryCount("copper_bar");
      // Sofortiger Leerlauf: Verarbeitung verbrauchte kaum Material trotz Vorrat → Verdacht auf Stall.
      if (ore >= 5 && bars === 0 && oreAfter >= ore) {
        stalledEarly = true;
        break;
      }
    }
    const snap = player.snapshot();
    const craftLvl = player.level(CRAFT_SKILL);

    if (stalledEarly) {
      findings.push(
        finding(
          "P1",
          "bug",
          "Craft-Aktion verarbeitet trotz Material nicht",
          `${CRAFT_ACTION} verbraucht copper_ore und erzeugt copper_bar`,
          "Trotz ausreichend copper_ore kein copper_bar erzeugt, Erz-Bestand unverändert",
          [`${CRAFT_GATHER} bis Vorrat`, `${CRAFT_ACTION} starten`, "1 Sim-Min laufen lassen"],
          { ore: snap.inventory.top, smithingLevel: craftLvl },
        ),
      );
    } else if (craftLvl < 10) {
      findings.push(
        finding(
          "P3",
          "feel",
          "Craft-Ziel (Smithing 10) im Budget nicht erreicht",
          "Craft-Level im Budget erreichbar",
          `Smithing Lv${craftLvl} nach ${Math.round(simTime / 60000)} Sim-Min (Sammel-/Craft-Wechsel bremst)`,
          [`${CRAFT_GATHER} ↔ ${CRAFT_ACTION} im Wechsel`, "bis Budget"],
          { smithingLevel: craftLvl, copperBars: player.inventoryCount("copper_bar") },
        ),
      );
    }

    return {
      persona: this.id,
      goal: this.goal,
      achieved: craftLvl >= 10,
      summary: `Smithing Lv${craftLvl}, ${player.inventoryCount("copper_bar")} Barren in ${Math.round(simTime / 60000)} Sim-Min`,
      findings,
      snapshot: snap,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3) hoarder (adversarial) — füllt Inventar + Bank bis an die Caps; prüft Invarianten.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const hoarder: Persona = {
  id: "hoarder",
  goal: "Inventar & Bank bis an die Caps füllen ohne Invarianten-Bruch",
  run(content, opts = {}) {
    const player = new SimPlayer(content, { seed: opts.seed ?? 33, creation: { name: "Hoarder" } });
    const findings: Finding[] = [];
    const ids = Object.keys(content.items);
    const invCap = player.inventoryCapacity();

    // (A) Inventar mit distinkten Arten bis zum Cap füllen (1 Stück je Slot).
    let fillIdx = 0;
    while (player.inventoryUsed() < invCap && fillIdx < ids.length) {
      player.give(ids[fillIdx]!, 1);
      fillIdx++;
    }
    if (player.inventoryUsed() > invCap) {
      findings.push(
        finding("P0", "bug", "Inventar überschreitet seine Kapazität", `belegte Slots ≤ ${invCap}`, `belegte Slots = ${player.inventoryUsed()}`, ["Distinkte Items geben, bis das Inventar voll ist"], { used: player.inventoryUsed(), capacity: invCap }),
      );
    }
    // Overflow-Test: eine WEITERE neue Art in ein volles Inventar → muss 0 einlagern.
    const overflowId = ids[fillIdx] ?? ids[0]!;
    const usedBefore = player.inventoryUsed();
    const added = player.give(overflowId, 1);
    if (added > 0 && player.inventoryUsed() > invCap) {
      findings.push(
        finding("P0", "bug", "Overflow ins volle Inventar akzeptiert", "addItem lehnt neue Art bei vollem Inventar ab (0)", `addItem akzeptierte ${added}, Slots jetzt ${player.inventoryUsed()} > ${invCap}`, ["Inventar füllen", "eine weitere neue Art geben"], { added, usedBefore, usedAfter: player.inventoryUsed(), capacity: invCap }),
      );
    }

    // (B) Bank bis zum Cap füllen: distinkte Arten einlagern.
    const bankCap = player.snapshot().bank.capacity;
    let bankKindIdx = 0;
    let guard = 0;
    while (player.snapshot().bank.used < bankCap && bankKindIdx < ids.length && guard < ids.length + 5) {
      const id = ids[bankKindIdx]!;
      // Ins Inventar holen, falls nicht vorhanden, dann einlagern.
      if (player.inventoryCount(id) < 1) player.give(id, 1);
      player.deposit(id, 1);
      bankKindIdx++;
      guard++;
    }
    const bankSnap = player.snapshot();
    if (bankSnap.bank.used > bankCap) {
      findings.push(
        finding("P0", "bug", "Bank überschreitet ihre Kapazität", `belegte Bank-Slots ≤ ${bankCap}`, `belegte Bank-Slots = ${bankSnap.bank.used}`, ["Distinkte Arten einlagern, bis die Bank voll ist"], { used: bankSnap.bank.used, capacity: bankCap }),
      );
    }
    // Bank-Overflow-Test: neue Art in volle Bank → deposit muss 0 sein.
    if (bankSnap.bank.used >= bankCap) {
      const newKind = ids.find((id) => player.bankCount(id) === 0) ?? overflowId;
      if (player.inventoryCount(newKind) < 1) player.give(newKind, 1);
      const usedBankBefore = player.snapshot().bank.used;
      const deposited = player.deposit(newKind, 1);
      const usedBankAfter = player.snapshot().bank.used;
      if (deposited > 0 && usedBankAfter > bankCap) {
        findings.push(
          finding("P0", "bug", "Einlagern in volle Bank akzeptiert", "deposit lehnt neue Art bei voller Bank ab (0)", `deposit gab ${deposited} zurück, Bank-Slots ${usedBankAfter} > ${bankCap}`, ["Bank füllen", "neue Art einlagern"], { deposited, usedBankBefore, usedBankAfter, capacity: bankCap }),
        );
      }
    }

    const snap = player.snapshot();
    const clean = findings.length === 0;
    return {
      persona: this.id,
      goal: this.goal,
      achieved: clean,
      summary: `Inventar ${snap.inventory.used}/${snap.inventory.capacity}, Bank ${snap.bank.used}/${snap.bank.capacity} — Invarianten ${clean ? "OK" : "VERLETZT"}`,
      findings,
      snapshot: snap,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4) afk_returner (adversarial) — lange advanceTime → Offline-Catch-up + Fixed-Step-Determinismus.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const afkReturner: Persona = {
  id: "afk_returner",
  goal: "Langer Offline-Sprung == viele kleine Ticks (Fixed-Step) & keine kaputten Zahlen",
  run(content, opts = {}) {
    const budgetMs = opts.budgetMs ?? 8 * 60 * 60 * 1000; // 8 Sim-Stunden AFK
    const seed = opts.seed ?? 44;
    const action = content.actions[CRAFT_GATHER] ? CRAFT_GATHER : Object.keys(content.actions)[0]!;
    const findings: Finding[] = [];

    // Held A: EIN grosser Offline-Sprung.
    const a = new SimPlayer(content, { seed, creation: { name: "AfkBig" } });
    a.startAction(action);
    a.advanceTime(budgetMs);

    // Held B: identisch, aber in vielen kleinen Fenstern (Online-Loop-Emulation).
    const b = new SimPlayer(content, { seed, creation: { name: "AfkSmall" } });
    b.startAction(action);
    const chunk = 60 * 1000;
    let t = 0;
    while (t < budgetMs) {
      const step = Math.min(chunk, budgetMs - t);
      b.advanceTime(step);
      t += step;
    }

    const skill = content.actions[action]!.skill;
    const xpA = a.level(skill);
    const xpB = b.level(skill);
    const rawXpA = a.state.skills[skill]?.xp ?? 0;
    const rawXpB = b.state.skills[skill]?.xp ?? 0;
    const snap = a.snapshot();

    // (1) Offline-Fortschritt darf nicht 0 sein.
    if (rawXpA <= 0) {
      findings.push(
        finding("P1", "bug", "Offline-Fortschritt bleibt aus", "Ein AFK-Sprung auf einer laufenden Aktion sammelt XP", `Nach ${Math.round(budgetMs / 3600000)}h keine ${skill}-XP`, [`${action} starten`, `advanceTime(${budgetMs}) in einem Aufruf`], { skill, rawXp: rawXpA }),
      );
    }
    // (2) Fixed-Step-Determinismus: ein grosser Sprung MUSS bit-identisch zu vielen kleinen sein.
    if (rawXpA !== rawXpB) {
      findings.push(
        finding(
          "P1",
          "bug",
          "Offline-Catch-up ≠ Online-Loop (Fixed-Step verletzt)",
          "advance(dt) in einem Stück == advance in vielen kleinen Schritten (fixe TICK_MS)",
          `XP grosser Sprung=${rawXpA} (Lv${xpA}) vs. kleine Schritte=${rawXpB} (Lv${xpB})`,
          [`${action} starten`, `Variante A: advanceTime(${budgetMs})`, `Variante B: ${Math.round(budgetMs / chunk)}× advanceTime(${chunk})`],
          { skill, rawXpBig: rawXpA, rawXpSmall: rawXpB },
        ),
      );
    }
    // (3) Alle Snapshot-Zahlen müssen endlich sein (kein NaN/Infinity durch grossen dt).
    const nonFinite = collectNonFinite(snap);
    if (nonFinite.length > 0) {
      findings.push(
        finding("P0", "bug", "Nicht-endliche Werte nach langem AFK", "alle abgeleiteten Zahlen sind endlich", `nicht-endlich: ${nonFinite.join(", ")}`, [`advanceTime(${budgetMs})`], { nonFinite }),
      );
    }

    return {
      persona: this.id,
      goal: this.goal,
      achieved: findings.length === 0,
      summary: `AFK ${Math.round(budgetMs / 3600000)}h: ${skill} Lv${xpA}, big==small=${rawXpA === rawXpB}, finite=${nonFinite.length === 0}`,
      findings,
      snapshot: snap,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 5) button_masher (adversarial) — schnelle illegale/unmögliche Aktionen dürfen nie crashen.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const buttonMasher: Persona = {
  id: "button_masher",
  goal: "Illegale/unmögliche Aktionen dürfen nie crashen und den State nicht korrumpieren",
  run(content, opts = {}) {
    const player = new SimPlayer(content, { seed: opts.seed ?? 55, creation: { name: "Masher" } });
    const findings: Finding[] = [];
    const ops: Array<[string, () => void]> = [
      ["startAction(unbekannt)", () => player.startAction("__nope__")],
      ["stopAction(ohne Aktion)", () => player.stopAction()],
      ["equip(unbekannt)", () => player.equip("__nope__")],
      ["equip(nicht besessen)", () => player.equip("bronze_sword")],
      ["unequip(mainhand)+nochmal", () => { player.unequip("mainhand"); player.unequip("mainhand"); }],
      ["buy(unbekannt)", () => player.buy("__nope__", 5)],
      ["buy(ohne Gold)", () => player.buy("bronze_sword", 3)],
      ["sell(unbekannt)", () => player.sell("__nope__", 5)],
      ["sell(nicht besessen)", () => player.sell("bronze_sword", 5)],
      ["startCombat(unbekannt)", () => player.startCombat("__nope__")],
      ["fightFor(ohne Kampf)", () => player.fightFor(5000)],
      ["advanceTime(negativ)", () => player.advanceTime(-1000)],
      ["advanceTime(0)", () => player.advanceTime(0)],
      ["deposit(unbekannt)", () => player.deposit("__nope__", 5)],
      ["give(qty 0)", () => player.give("normal_log", 0)],
      ["give(qty negativ)", () => player.give("normal_log", -50)],
      ["canEquip(unbekannt)", () => player.canEquip("__nope__")],
    ];
    for (const [name, op] of ops) {
      try {
        op();
      } catch (err) {
        findings.push(
          finding("P0", "bug", `Crash bei unmöglicher Aktion: ${name}`, "Ungültige Eingaben werden still abgelehnt", `Ausnahme geworfen: ${(err as Error).message}`, [`SimPlayer.${name} aufrufen`], { op: name, error: String(err) }),
        );
      }
    }
    // State-Konsistenz nach dem Ansturm.
    const snap = player.snapshot();
    if (snap.gold < 0) {
      findings.push(finding("P1", "bug", "Gold negativ nach Button-Mashing", "Gold ≥ 0", `Gold = ${snap.gold}`, ["Button-Mashing-Batterie ausführen"], { gold: snap.gold }));
    }
    if (snap.inventory.used > snap.inventory.capacity) {
      findings.push(finding("P0", "bug", "Inventar inkonsistent nach Button-Mashing", "belegte Slots ≤ Kapazität", `${snap.inventory.used} > ${snap.inventory.capacity}`, ["Button-Mashing-Batterie ausführen"], { inv: snap.inventory }));
    }
    const nonFinite = collectNonFinite(snap);
    if (nonFinite.length > 0) {
      findings.push(finding("P0", "bug", "Nicht-endliche Werte nach Button-Mashing", "alle Zahlen endlich", `nicht-endlich: ${nonFinite.join(", ")}`, ["Button-Mashing-Batterie ausführen"], { nonFinite }));
    }

    return {
      persona: this.id,
      goal: this.goal,
      achieved: findings.length === 0,
      summary: `${ops.length} unmögliche Aktionen ausgeführt — ${findings.length === 0 ? "kein Crash, State konsistent" : `${findings.length} Problem(e)`}`,
      findings,
      snapshot: snap,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 6) speedrunner — früher Meilenstein (Kampf-Niveau 10) als EHRLICHER Spieler (RealisticPlayer,
//    honest; Referenz-Nutzung #2): voller Kampf-Fokus (skillingBias 0), maximaler Mut (bravery 1).
// ─────────────────────────────────────────────────────────────────────────────────────────────
const speedrunner: Persona = {
  id: "speedrunner",
  goal: "Schnellster ehrlicher Pfad zu Kampf-Niveau 10 (RealisticPlayer, honest)",
  run(content, opts = {}) {
    const budgetMs = opts.budgetMs ?? 15 * 60 * 1000;
    const rp = new RealisticPlayer(content, {
      seed: opts.seed ?? 66,
      name: "Speedy",
      style: "melee",
      bravery: 1,
      skillingBias: 0, // reiner Kampf-Fokus — der schnellste Pfad
    });
    const res = rp.playFor(budgetMs);
    const findings: Finding[] = [...frictionsToFindings(res.frictions)];
    const reached = res.combatLevel >= 10;

    if (res.kills === 0 && budgetMs >= 3 * 60 * 1000) {
      findings.push(
        finding(
          "P1",
          "balance",
          "Speedrun-Pfad blockiert: kein einziger Kill als ehrlicher Frisch-Held",
          "Ein früher Meilenstein-Pfad ist ohne Wall begehbar",
          `0 Kills in ${Math.round(res.simTimeMs / 60000)} Sim-Min (${res.deaths} Tode)`,
          ["RealisticPlayer (melee, bravery 1) starten", `playFor(${budgetMs})`],
          { combatLevel: res.combatLevel, deaths: res.deaths },
        ),
      );
    } else if (reached) {
      findings.push(
        finding(
          "P3",
          "feel",
          "Kampf-Niveau 10 erreicht — ehrliche Timing-Referenz",
          "—",
          `Kampf-Niveau 10 in ${Math.round(res.simTimeMs / 60000)} Sim-Min (${res.kills} Kills, ${res.deaths} Tode, ${res.frictions.length} Frictions)`,
          ["RealisticPlayer (melee, bravery 1)", "bis Kampf-Niveau 10 spielen lassen"],
          { simMinutes: Math.round(res.simTimeMs / 60000), kills: res.kills, deaths: res.deaths },
        ),
      );
    }

    return {
      persona: this.id,
      goal: this.goal,
      achieved: reached,
      summary: `Kampf-Niveau ${res.combatLevel}/10 in ${Math.round(res.simTimeMs / 60000)} Sim-Min (${res.kills} Kills, ${res.frictions.length} Frictions)`,
      findings,
      snapshot: res.snapshot,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 7) allrounder — MULTI-GOAL-Referenz: drei Ziele PARALLEL in einem ehrlichen Lauf
//    (RealisticPlayer.pursue). Zeigt Sweep-Agenten das Muster: Ziele deklarieren, pursue fahren,
//    formatMultiGoalMarkdown in den Bericht übernehmen. Budgets/Zeiten = SPIELZEIT.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const allrounder: Persona = {
  id: "allrounder",
  goal: "Multi-Goal: Kampf-Niveau 25 + fishing 30 + 10.000 Gold parallel (RealisticPlayer, honest)",
  run(content, opts = {}) {
    const budgetMs = opts.budgetMs ?? 24 * 60 * 60 * 1000; // 24 Sim-Stunden Spielzeit
    const rp = new RealisticPlayer(content, {
      seed: opts.seed ?? 77,
      name: "Allrounder",
      style: "melee",
      skillingBias: 0.35, // gemischter Spielstil — passt zum gemischten Ziel-Set
    });
    const res = rp.pursue([combatLevel(25), skillLevel("fishing", 30), gold(10_000)], { budgetMs });
    const findings: Finding[] = [...frictionsToFindings(res.frictions)];
    for (const g of res.goals) {
      if (g.achieved) continue;
      findings.push(
        finding(
          "P3",
          g.blocked ? "ux" : "feel",
          `Multi-Goal nicht erreicht: ${g.description}`,
          "Ziel im Spielzeit-Budget erreichbar",
          `${Math.round(g.progress * 100)} % nach ${formatSimDuration(res.totalSimMs)} Spielzeit — ${g.note ?? g.detail}`,
          [
            "RealisticPlayer.pursue([combatLevel(25), skillLevel('fishing', 30), gold(10000)])",
            `budgetMs=${budgetMs} (Spielzeit)`,
          ],
          { progress: Number(g.progress.toFixed(3)), blocked: g.blocked, detail: g.detail },
        ),
      );
    }
    const achievedCount = res.goals.filter((g) => g.achieved).length;
    return {
      persona: this.id,
      goal: this.goal,
      achieved: achievedCount === res.goals.length,
      summary:
        `${achievedCount}/${res.goals.length} Ziele in ${formatSimDuration(res.totalSimMs)} Spielzeit — ` +
        res.goals
          .map((g) => `${g.description}: ${g.achieved ? "✅" : g.blocked ? "❌" : `◐ ${Math.round(g.progress * 100)} %`}`)
          .join(" · "),
      findings,
      snapshot: res.snapshot,
      multiGoal: res,
    };
  },
};

/** Sammelt Pfade nicht-endlicher Zahlen aus einem Snapshot (NaN/Infinity-Detektor). */
function collectNonFinite(snap: SimSnapshot): string[] {
  const bad: string[] = [];
  const check = (path: string, v: unknown): void => {
    if (typeof v === "number" && !Number.isFinite(v)) bad.push(path);
  };
  check("gold", snap.gold);
  check("hp", snap.hp);
  check("maxHp", snap.maxHp);
  check("combatLevel", snap.combatLevel);
  check("totalLevel", snap.totalLevel);
  check("elapsedMs", snap.elapsedMs);
  check("inventory.used", snap.inventory.used);
  check("inventory.capacity", snap.inventory.capacity);
  check("bank.used", snap.bank.used);
  check("bank.capacity", snap.bank.capacity);
  for (const [k, v] of Object.entries(snap.skills)) check(`skills.${k}`, v);
  return bad;
}

/** Registry aller Personas. */
export const PERSONAS: Persona[] = [
  progressionCombat,
  crafter,
  hoarder,
  afkReturner,
  buttonMasher,
  speedrunner,
  allrounder,
];

/** Führt alle (oder ausgewählte) Personas aus und gibt ihre Ergebnisse zurück. */
export function runAllPersonas(content: ContentDB, opts: PersonaRunOptions & { only?: string[] } = {}): PersonaResult[] {
  const selected = opts.only ? PERSONAS.filter((p) => opts.only!.includes(p.id)) : PERSONAS;
  return selected.map((p) => p.run(content, opts));
}

/** Fasst mehrere Persona-Ergebnisse als Markdown zusammen (Übersicht + gesammelte Findings). */
export function formatPersonaReport(results: readonly PersonaResult[]): string {
  const collector = new FindingCollector();
  for (const r of results) collector.addAll(r.findings);
  const counts = collector.counts();
  const out: string[] = [];
  out.push("# Sim-Persona-Report");
  out.push("");
  out.push(`**Personas:** ${results.length} · **Findings:** ${collector.count()} — ` + SEVERITY_ORDER.map((s) => `${s}: ${counts[s]}`).join(" · "));
  out.push("");
  out.push("| Persona | Ziel erreicht | Zusammenfassung | Findings |");
  out.push("| --- | --- | --- | --- |");
  for (const r of results) {
    out.push(`| ${r.persona} | ${r.achieved ? "✓" : "✗"} | ${r.summary} | ${r.findings.length} |`);
  }
  out.push("");
  // Multi-Goal-Personas: Ziel-für-Ziel-Block (✅/◐/❌ + warum) direkt mit ausgeben.
  for (const r of results) {
    if (!r.multiGoal) continue;
    out.push(formatMultiGoalMarkdown(r.multiGoal, `Multi-Goal — ${r.persona}`));
    out.push("");
  }
  for (const r of results) {
    if (r.findings.length === 0) continue;
    out.push(`## ${r.persona} — ${r.goal}`);
    out.push("");
    let n = 0;
    for (const sev of SEVERITY_ORDER) {
      for (const f of r.findings.filter((x) => x.severity === sev)) {
        out.push(`**${++n}. [${f.severity}/${f.category}] ${f.title}**`);
        out.push(`- Erwartet: ${f.expected}`);
        out.push(`- Tatsächlich: ${f.actual}`);
        if (f.repro.length) out.push(`- Repro: ${f.repro.join(" → ")}`);
        if (f.evidence) out.push(`- Evidence: \`${JSON.stringify(f.evidence)}\``);
        out.push("");
      }
    }
  }
  return out.join("\n").trimEnd();
}
