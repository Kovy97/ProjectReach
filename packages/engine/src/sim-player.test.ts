import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { addItemOrBank } from "./inventory";
import { SimPlayer } from "./sim-player";
import { PERSONAS, runAllPersonas, formatPersonaReport } from "./sim-personas";
import { FindingCollector, formatFindingsMarkdown } from "./sim-report";
import type { Finding } from "./sim-report";

describe("SimPlayer — headless Treiber", () => {
  it("fährt einen scripted Playthrough: Holz hacken → Level → craften → kämpfen", () => {
    const p = new SimPlayer(content, { seed: 7, creation: { name: "Held" } });

    // ── 1) Holz hacken: Level & Ertrag steigen wirklich ──────────────────────
    expect(p.level("woodcutting")).toBe(1);
    expect(p.startAction("cut_normal_tree")).toBe(true);
    expect(p.state.activeActionId).toBe("cut_normal_tree");
    p.advanceTime(600_000); // 10 Sim-Min
    expect(p.inventoryCount("normal_log")).toBeGreaterThan(0);
    expect(p.level("woodcutting")).toBeGreaterThan(1);

    // ── 2) Craften: verbraucht Logs (+ Sehnenfaden), erzeugt einen Bogen, trainiert Crafting ──
    // Task #286 Stage B: war fletch_shafts (Munitions-Kette, komplett gelöscht) → jetzt
    // fletch_copper_shortbow (skill: "leatherworking", die ehemalige Fletching-Fertigkeit),
    // verbraucht weiterhin normal_log (aus Phase 1) plus 1 Sehnenfaden (hier gegeben).
    p.stopAction();
    expect(p.state.activeActionId).toBeNull();
    const logsBefore = p.inventoryCount("normal_log");
    expect(logsBefore).toBeGreaterThan(0);
    p.give("bowstring", 1);
    expect(p.startAction("fletch_copper_shortbow")).toBe(true);
    p.advanceTime(120_000); // 2 Sim-Min
    expect(p.inventoryCount("copper_shortbow")).toBeGreaterThan(0);
    expect(p.inventoryCount("normal_log")).toBeLessThan(logsBefore);

    // ── 3) Kämpfen: der Starter-Nahkämpfer legt Hühner ──────────────────────
    p.stopAction();
    expect(p.startCombat("chicken")).toBe(true);
    const res = p.fightFor(180_000); // 3 Sim-Min
    expect(res.elapsedMs).toBe(180_000);
    expect(res.kills).toBeGreaterThan(0);
    expect(p.snapshot().kills).toBeGreaterThanOrEqual(res.kills);

    // Snapshot ist konsistent & kompakt.
    const snap = p.snapshot();
    expect(snap.inventory.used).toBeLessThanOrEqual(snap.inventory.capacity);
    expect(Number.isFinite(snap.combatLevel)).toBe(true);
    expect(snap.skills.woodcutting).toBeGreaterThan(1);
  });

  it("fightFor().kills liefert das Kill-DELTA je Fenster (combat.kills ist kumulativ)", () => {
    // Regression (Sweep3): combat.kills läuft über die gesamte Kampf-Session kumulativ (nur
    // startCombat resettet es). Mehrere fightFor-Aufrufe auf DENSELBEN laufenden Kampf (ohne neues
    // startCombat) dürfen die Kills nicht dreieckig aufblähen — jeder Aufruf zählt nur SEIN Fenster.
    const p = new SimPlayer(content, { seed: 7, creation: { name: "Held" } });
    // Food gegen den Squish-Floor-Effekt: das Huhn trifft über den max(1,…)-Boden jetzt relativ
    // härter (~1 HP auf 10 maxHp statt 1 auf 100) — ein Tod im Fenster würde den kumulativen
    // combat.kills-Zähler resetten und die Delta-Buchhaltung (das eigentliche Testziel) verfälschen.
    p.give("cooked_trout", 500);
    p.state.character.food = "cooked_trout";
    expect(p.startCombat("chicken")).toBe(true);
    const first = p.fightFor(120_000);
    expect(first.kills).toBeGreaterThan(0);
    const second = p.fightFor(120_000); // KEIN neues startCombat → combat.kills läuft kumulativ weiter
    expect(second.kills).toBeGreaterThan(0);
    // Kein Doppelzählen: die Summe der beiden Fenster-Deltas = kumulierter Engine-Kill-Zähler
    // (Nahkampf vs. Huhn hat keinen Respawn/Reset in diesem Fenster). Alt-Bug: das zweite Fenster
    // hätte den kumulierten Stand gemeldet → Summe ≈ doppelter Zähler.
    expect(first.kills + second.kills).toBe(p.state.combat.kills);
    // snapshot().kills (totalKills) akkumuliert exakt die zurückgegebenen Deltas.
    expect(p.snapshot().kills).toBe(first.kills + second.kills);
  });

  it("fightFor().deaths zählt ECHTE Tode (state.stats.deaths-Delta), nicht Kampf-Abbrüche", () => {
    // Frischer Held (kein Starter-Kit / kein Food) gegen einen viel zu starken Gegner: er stirbt
    // wiederholt. Der normale Kampf startet intern auto-neu und lässt combat.monsterId GESETZT —
    // der frühere monsterId===null-Zähler hätte hier fälschlich 0 Tode gemeldet.
    const p = new SimPlayer(content, { seed: 5, creation: { name: "Opfer" } });
    const deathsBefore = p.state.stats.deaths;
    expect(p.startCombat("bull_boss")).toBe(true);
    const res = p.fightFor(120_000);
    expect(res.deaths).toBeGreaterThan(0); // echte Tode registriert (nicht 0)
    expect(res.deaths).toBe(p.state.stats.deaths - deathsBefore); // exakt das stats.deaths-Delta
    expect(res.elapsedMs).toBe(120_000); // Auto-Restart hält den Kampf über das ganze Fenster
    expect(p.snapshot().deaths).toBeGreaterThanOrEqual(res.deaths);
  });

  it("snapshot().kills/deaths = Engine-Lebenszeit-Statistik, auch OHNE fightFor (Sweep5 T4)", () => {
    // Regression: pursue/playFor kämpfen über startCombat + advanceTime (kein fightFor). Die
    // früheren fightFor-only-Zähler meldeten dafür 0/0 — bei real zigtausend Kills im Lauf.
    const p = new SimPlayer(content, { seed: 7, creation: { name: "Zähler" } });
    expect(p.startCombat("chicken")).toBe(true);
    p.advanceTime(10 * 60 * 1000); // reiner advanceTime-Kampf, wie im Multi-Goal-Scheduler
    expect(p.state.stats.kills).toBeGreaterThan(0);
    expect(p.snapshot().kills).toBe(p.state.stats.kills);
    expect(p.snapshot().deaths).toBe(p.state.stats.deaths);
  });

  it("runDungeon fährt die Encounter-Kette über die echte Engine (Gate + Clear-Zähler) — Sweep5 T7", () => {
    const p = new SimPlayer(content, { seed: 7, creation: { name: "Delver" } });
    // Frisches Spiel: kein Zutritt, weil die Trägerzone quest-gesperrt ist — das Kampf-Niveau
    // sperrt seit Task #345 nicht mehr (Quest-/Zonen-Gate ist das einzige Gate).
    expect(p.canEnterDungeon("crypt_depths")).toBe(false);
    expect(p.runDungeon("crypt_depths").entered).toBe(false);
    // Gerüsteter Held (Muster aus dungeon.test.ts): Kampfkraft aufbauen, Gear anlegen, Food setzen.
    for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
      p.setSkillLevel(id, 99);
    }
    for (const g of ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"]) {
      p.give(g, 1);
      expect(p.equip(g).ok).toBe(true);
    }
    p.give("cooked_voidray", 1000);
    p.setFood("cooked_voidray");
    // Quest-based unlock (Welle J, 2026-07-13): kein Schlüssel mehr — der Bestandsschutz-Eintrag
    // öffnet das Gate K-fest (Welle K legt requiresQuest auf die echten Dungeons). Der
    // stillgelegte Alt-Schlüssel bleibt gewöhnlicher Besitz und tut nichts.
    p.state.dungeonsUnlocked["crypt_depths"] = true;
    addItemOrBank(p.state, content, "crypt_key", 1);
    expect(p.inventoryCount("crypt_key")).toBe(1); // stillgelegt: normales Item, kein Unlock-Token
    expect(p.canEnterDungeon("crypt_depths")).toBe(true);
    const res = p.runDungeon("crypt_depths");
    expect(res.entered).toBe(true);
    expect(res.cleared).toBe(true);
    expect(res.deaths).toBe(0);
    const d = content.dungeons.find((x) => x.id === "crypt_depths")!;
    expect(res.kills).toBeGreaterThanOrEqual(d.encounters.length); // alle Wellen besiegt
    expect(p.state.dungeonsCleared["crypt_depths"]).toBe(1);
    // Freie Wiederholbarkeit: der zweite Run braucht keinen weiteren Schlüssel.
    expect(p.canEnterDungeon("crypt_depths")).toBe(true);
  });

  it("Reader liefern echte Werte & Begründungen (canEquip / buy / gold)", () => {
    const p = new SimPlayer(content, { seed: 3 });
    // canEquip ohne Besitz → begründete Ablehnung.
    const before = p.canEquip("bronze_sword");
    expect(before.ok).toBe(false);
    expect(before.reason).toBeTruthy();
    // Unbekanntes Item.
    expect(p.canEquip("__nope__").ok).toBe(false);

    // Kauf aus dem Shop: Gold sinkt, Item ist da. bronze_sword ist seit dem Shop-Purge
    // (CEO 2026-07-11: keine Shortcuts für craftbares Gear) nicht mehr käuflich — für den
    // reinen Kauf-Mechanik-Check dient ein Item, das weiterhin im Shop steht (wooden_shield,
    // requirements-frei), der Rest des Tests (Gate/Equip) bekommt bronze_sword per `give`
    // (SimPlayer-Reader-API, kein Shop-Pfad nötig).
    p.state.character.gold = 1000;
    const bought = p.buy("wooden_shield", 1);
    expect(bought).toBe(1);
    expect(p.inventoryCount("wooden_shield")).toBe(1);
    expect(p.gold()).toBeLessThan(1000);
    p.give("bronze_sword", 1);
    expect(p.inventoryCount("bronze_sword")).toBe(1);

    // Skill-Anforderung (attack 5) noch nicht erfüllt → begründete Ablehnung.
    const gated = p.canEquip("bronze_sword");
    expect(gated.ok).toBe(false);
    expect(gated.reason).toContain("attack");
    // Anforderung erfüllen → jetzt ausrüstbar & wird ausgerüstet.
    p.setSkillLevel("attack", 5);
    expect(p.canEquip("bronze_sword").ok).toBe(true);
    expect(p.equip("bronze_sword").ok).toBe(true);
    expect(p.state.character.equipment.mainhand).toBe("bronze_sword");

    // Nicht im Shop → 0 gekauft, Gold unverändert.
    const goldNow = p.gold();
    expect(p.buy("__nope__", 5)).toBe(0);
    expect(p.gold()).toBe(goldNow);
  });
});

describe("Sim-Personas — adversariale Invarianten", () => {
  it("button_masher: unmögliche Aktionen crashen nie, State bleibt konsistent", () => {
    const r = PERSONAS.find((p) => p.id === "button_masher")!.run(content, { seed: 1 });
    // Keine P0/P1-Findings = kein Crash, keine Korruption.
    expect(r.findings.filter((f) => f.severity === "P0" || f.severity === "P1")).toEqual([]);
    expect(r.achieved).toBe(true);
    expect(r.snapshot.inventory.used).toBeLessThanOrEqual(r.snapshot.inventory.capacity);
  });

  it("hoarder: Inventar & Bank halten ihre Caps ein (keine Overflow-Duplikation)", () => {
    const r = PERSONAS.find((p) => p.id === "hoarder")!.run(content, { seed: 1 });
    expect(r.findings.filter((f) => f.severity === "P0")).toEqual([]);
    expect(r.snapshot.inventory.used).toBeLessThanOrEqual(r.snapshot.inventory.capacity);
    expect(r.snapshot.bank.used).toBeLessThanOrEqual(r.snapshot.bank.capacity);
  });

  it("afk_returner: Offline-Sprung liefert Fortschritt und endliche Zahlen", () => {
    const r = PERSONAS.find((p) => p.id === "afk_returner")!.run(content, { seed: 1, budgetMs: 30 * 60 * 1000 });
    // Offline-Fortschritt darf nicht ausbleiben, Werte müssen endlich sein (keine P0).
    // Task #286 Stage B: afk_returner treibt dieselbe Aktion wie die crafter-Persona
    // (CRAFT_GATHER in sim-personas.ts) — war cut_normal_tree/woodcutting, jetzt
    // mine_copper/mining (Fletching-Munitionskette komplett gelöscht).
    expect(r.findings.filter((f) => f.severity === "P0")).toEqual([]);
    expect(Number.isFinite(r.snapshot.totalLevel)).toBe(true);
    expect(r.snapshot.skills.mining ?? 0).toBeGreaterThan(1);
  });

  it("ziel-gerichtete Personas laufen headless durch und liefern Snapshot + Findings-Liste", () => {
    for (const id of ["progression_combat", "crafter", "speedrunner"]) {
      const r = PERSONAS.find((p) => p.id === id)!.run(content, { seed: 2, budgetMs: 60_000 });
      expect(Array.isArray(r.findings)).toBe(true);
      expect(r.snapshot).toBeTruthy();
      expect(typeof r.achieved).toBe("boolean");
    }
  });

  it("runAllPersonas + formatPersonaReport ergeben einen Markdown-Bericht", () => {
    const results = runAllPersonas(content, { seed: 9, budgetMs: 30_000, only: ["button_masher", "hoarder"] });
    expect(results.length).toBe(2);
    const md = formatPersonaReport(results);
    expect(md).toContain("# Sim-Persona-Report");
    expect(md).toContain("button_masher");
  });
});

describe("Sim-Report — FindingCollector & Markdown", () => {
  it("gruppiert nach Schweregrad und formatiert Findings", () => {
    const c = new FindingCollector();
    const f: Finding = {
      severity: "P1",
      category: "balance",
      title: "Testwall",
      repro: ["Schritt A", "Schritt B"],
      expected: "erwartet",
      actual: "tatsächlich",
      evidence: { combatLevel: 12 },
    };
    c.add(f);
    c.add({ ...f, severity: "P3", category: "feel", title: "Kleinkram" });
    expect(c.count()).toBe(2);
    expect(c.counts().P1).toBe(1);
    expect(c.hasBlocking()).toBe(true);
    const md = formatFindingsMarkdown(c.all(), "Test-Report");
    expect(md).toContain("# Test-Report");
    expect(md).toContain("[P1/balance] Testwall");
    expect(md).toContain("Schritt A");
    expect(md).toContain("combatLevel");
  });
});
