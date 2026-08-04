import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { RealisticPlayer, frictionsToFindings } from "./sim-realistic";
import { combatLevel, goalProxy, obtainItem, skillLevel } from "./sim-goals";
import { addInstance } from "./inventory";
import { FrictionCollector, formatFrictionMarkdown } from "./sim-report";

const MIN = 60 * 1000;
const H = 60 * MIN;

describe("RealisticPlayer — ehrlicher Entscheidungs-Spieler", () => {
  it("macht als ehrlicher Nahkämpfer echten Fortschritt (kein give/setSkillLevel)", () => {
    const rp = new RealisticPlayer(content, { seed: 7, style: "melee", name: "Ehrlich" });
    const res = rp.playFor(90 * MIN);
    // Fortschritt aus eigener Kraft: Kills, Level, kein negativer Kontostand.
    expect(res.kills).toBeGreaterThan(0);
    expect(res.combatLevel).toBeGreaterThan(1);
    expect(res.totalLevel).toBeGreaterThan(21); // > alle Skills auf 1
    expect(res.gold).toBeGreaterThanOrEqual(0);
    // Session-Rhythmus: es gab aktive Fenster UND Idle-Strecken.
    expect(res.activeWindows).toBeGreaterThan(0);
    expect(res.idleMs).toBeGreaterThan(0);
    expect(res.simTimeMs).toBe(90 * MIN);
    // State-Invarianten bleiben heil.
    expect(res.snapshot.inventory.used).toBeLessThanOrEqual(res.snapshot.inventory.capacity);
    expect(Number.isFinite(res.gold)).toBe(true);
  });

  it("ist deterministisch: gleiche Seed ⇒ bit-identisches Ergebnis", () => {
    const run = () => {
      const rp = new RealisticPlayer(content, { seed: 42, style: "melee", name: "Det" });
      const r = rp.playFor(30 * MIN);
      return JSON.stringify({ ...r, snapshot: r.snapshot });
    };
    expect(run()).toBe(run());
  });

  it("bleibt stil-treu: der Fernkämpfer rüstet nie eine stil-fremde Waffe an", () => {
    const rp = new RealisticPlayer(content, { seed: 21, style: "ranged", name: "Robin" });
    rp.playFor(90 * MIN);
    const mainhand = rp.player.state.character.equipment.mainhand;
    expect(mainhand).toBeTruthy();
    expect(content.items[mainhand!]?.weaponStyle).toBe("ranged");
  });

  it("reagiert auf wiederholte Tode: Vorsicht, Friction-Event, Ziel-Blacklist", () => {
    const rp = new RealisticPlayer(content, { seed: 3, style: "melee" });
    expect(rp.isBlacklisted("chicken")).toBe(false);
    rp.handleDefeat("chicken");
    expect(rp.isBlacklisted("chicken")).toBe(false); // 1 Tod = nochmal versuchen (besser vorbereitet)
    rp.handleDefeat("chicken");
    expect(rp.isBlacklisted("chicken")).toBe(true); // 2 Tode = Friction + meiden
    expect(rp.frictions.all().some((f) => f.what.includes("Wiederholt gestorben an chicken"))).toBe(true);
    // Die Zielwahl liefert das gemiedene Monster nie wieder (seeded Varianz hin oder her).
    for (let i = 0; i < 25; i++) {
      expect(rp.pickCombatTarget()?.id).not.toBe("chicken");
    }
  });

  it("Blacklist läuft ab: nach deutlichem Stärke-Zuwachs wird das Ziel erneut versucht (Sweep5 T2)", () => {
    const rp = new RealisticPlayer(content, { seed: 3, style: "melee" });
    rp.handleDefeat("boar");
    rp.handleDefeat("boar");
    expect(rp.isBlacklisted("boar")).toBe(true); // 2 Tode @CL1 → gemieden
    // Deutlicher Kampf-Niveau-Zuwachs (Test-Seed über die echte XP-Tabelle) → wieder trauen.
    rp.player.setSkillLevel("attack", 12);
    rp.player.setSkillLevel("power", 12);
    rp.player.setSkillLevel("vitality", 12);
    expect(rp.isBlacklisted("boar")).toBe(false);
    // Der NÄCHSTE Tod meidet sofort wieder (Zähler stand nach dem Ablauf auf 1) …
    rp.handleDefeat("boar");
    expect(rp.isBlacklisted("boar")).toBe(true);
    // … bis der nächste echte Stärke-Sprung kommt (frischer Schnappschuss beim Re-Meiden).
    rp.player.setSkillLevel("attack", 25);
    rp.player.setSkillLevel("power", 25);
    expect(rp.isBlacklisted("boar")).toBe(false);
  });

  it("Fernkampf ohne Munitionssystem (#286): 0 Gold, keine Pfeile — der Bogen kämpft trotzdem durch", () => {
    // Nachfolger der beiden Köcher-Heuristik-Tests (Sweep5 T1 / Sweep6 T3-F2): die komplette
    // Munitions-Logik ist gestorben — der härteste Alt-Fall (kein Gold, keine Pfeile) darf den
    // Fernkämpfer schlicht nicht mehr aufhalten.
    const rp = new RealisticPlayer(content, { seed: 22, style: "ranged", name: "Robin" });
    const p = rp.player;
    p.give("copper_shortbow", 1);
    expect(p.equip("copper_shortbow").ok).toBe(true);
    p.state.character.gold = 0;
    rp.playFor(30 * MIN);
    const mainhand = p.state.character.equipment.mainhand;
    expect(mainhand).toBeTruthy();
    expect(content.items[mainhand!]?.weaponStyle).toBe("ranged");
    expect(p.state.stats.kills).toBeGreaterThan(0); // Kills fließen ohne jegliche Munition
    expect("ammoCount" in p.state).toBe(false); // Alt-Key existiert nicht mehr
  });

  it("Multi-Goal: 0%-Skilling-Ziele verhungern nicht mehr neben einem Kampf-Ziel (Sweep5 T3)", () => {
    const rp = new RealisticPlayer(content, { seed: 1337, style: "melee", name: "Fair" });
    const res = rp.pursue(
      [combatLevel(20), skillLevel("fishing", 30), skillLevel("smithing", 20)],
      { budgetMs: 8 * H },
    );
    // Vor dem Fix bekamen 0%-Skilling-Ziele gegen ein Kampf-Ziel im Flow NIE ein Fokus-Fenster
    // (Seed 1337: fishing/smithing nach 30 h exakt Lv 1). Jetzt garantiert die Fairness-Rotation
    // jedem offenen Ziel periodisch ein Fenster → beide Skills haben echte XP gesammelt.
    expect(res.goals[1]!.progress).toBeGreaterThan(0);
    expect(res.goals[2]!.progress).toBeGreaterThan(0);
    expect(rp.player.state.skills["fishing"]?.xp ?? 0).toBeGreaterThan(0);
    expect(rp.player.state.skills["smithing"]?.xp ?? 0).toBeGreaterThan(0);
  });

  it("obtainItem mit level-gegatetem Rezept blockiert nicht mehr, sondern trainiert die Route (Sweep5 T6)", () => {
    const rp = new RealisticPlayer(content, { seed: 8, style: "melee", name: "Schmied" });
    const res = rp.pursue([obtainItem("steel_platebody", 1)], { budgetMs: 3 * H });
    const g = res.goals[0]!;
    // Vorher: sofort „kein gangbarer Weg" (blocked) @ Lauf-Beginn, obwohl smithing trainierbar ist.
    expect(g.blocked).toBe(false);
    // Die Route wird wirklich beschritten: die Smithing-Kette (Mining/Smithing) sammelt XP.
    const xp = (id: string): number => rp.player.state.skills[id]?.xp ?? 0;
    expect(xp("smithing") + xp("mining")).toBeGreaterThan(0);
  });

  it("claimt fertige Quests EAGER — auch ohne completeQuest-Ziel (Sweep5 #6)", () => {
    const rp = new RealisticPlayer(content, { seed: 11, style: "melee", name: "Claims" });
    rp.player.state.monsterKills["chicken"] = 5; // q_first_steps-Objective bereits erfüllt
    rp.playFor(10 * MIN);
    expect(rp.player.state.quests.claimed).toContain("q_first_steps");
  });

  it("verkraftet Mini-Budgets und ist kumulativ aufrufbar", () => {
    const rp = new RealisticPlayer(content, { seed: 9 });
    const r1 = rp.playFor(30_000);
    expect(r1.simTimeMs).toBe(30_000);
    const r2 = rp.playFor(30_000);
    expect(r2.simTimeMs).toBe(60_000);
    expect(rp.playFor(0).simTimeMs).toBe(60_000); // No-op bei 0/negativ
    expect(rp.playFor(-5).simTimeMs).toBe(60_000);
  });

  it("obtainItem balanciert Multi-Input-Rezepte: gravesteel_blade ehrlich in <10 Sim-h (Sweep6 T2-F1)", () => {
    // T2-Repro Seed 41: der Kettenplaner rekursierte stur in inputs[0] — 30 h → 32 162
    // gravesteel_ore, 0 Kohle, 0 Klinge. Jetzt verfolgt er den Engpass-Input (Kohle, dann
    // Barren, dann crude_bone via Jagd) und die Kette schließt sich ehrlich.
    const rp = new RealisticPlayer(content, { seed: 41, style: "melee", name: "Gunnar" });
    const p = rp.player;
    // Midgame-Snapshot (erlaubtes Test-Setup, vgl. T2-Bericht §2): Mindest-Level der Kette.
    p.setSkillLevel("attack", 20);
    p.setSkillLevel("power", 20);
    p.setSkillLevel("defence", 20);
    p.setSkillLevel("vitality", 20);
    p.setSkillLevel("mining", 22);
    p.setSkillLevel("smithing", 24);
    const res = rp.pursue([obtainItem("gravesteel_blade", 1)], { budgetMs: 10 * H });
    const g = res.goals[0]!;
    expect(g.blocked).toBe(false);
    expect(g.achieved).toBe(true);
    expect(g.simTimeMs).toBeLessThan(10 * H);
    // Der alte Fehlmodus lief „fälschlich sauber" ins Budget: Klinge im Besitz ist der Gegenbeweis
    // (sie existiert NUR über Erz+Kohle → Barren + crude_bone → Schmieden — die volle Kette lief).
    expect(p.inventoryCount("gravesteel_blade") + p.bankCount("gravesteel_blade") + (p.state.character.equipment.mainhand === "gravesteel_blade" ? 1 : 0)).toBeGreaterThanOrEqual(1);
  });

  it("bucht eine fruchtlose Ziel-Idle-Strecke als Stall: Friction + Rotation + Wall (Sweep6 T2-F1)", () => {
    const rp = new RealisticPlayer(content, { seed: 2, style: "melee" });
    const goal = obtainItem("gravesteel_blade", 1);
    const t = {
      goal,
      description: "1× gravesteel_blade beschaffen",
      high: 0,
      achieved: false,
      achievedAtMs: 0,
      blocked: false,
      note: undefined as string | undefined,
      stall: 0,
      cooldown: 0,
      rotations: 0,
      detail: "0/1 gravesteel_blade",
      samples: [] as number[],
      sinceFocus: 0,
      attentionMs: 0,
      lastProxy: 0,
    };
    const cast = rp as unknown as {
      registerIdleStall(t: unknown, proxyBefore: number, idleMinutes: number): void;
    };
    const proxy = goalProxy(rp.player.state, content, goal);
    // Proxy hat sich über die ganze Strecke nicht bewegt ⇒ Rotation + „stalled"-Friction (1×).
    cast.registerIdleStall(t, proxy, 60);
    expect(t.rotations).toBe(1);
    expect(t.cooldown).toBeGreaterThan(0);
    expect(rp.frictions.all().filter((f) => f.what.includes("stalled")).length).toBe(1);
    // Echter Fortschritt heilt die Zählung …
    cast.registerIdleStall(t, proxy - 1, 60);
    expect(t.rotations).toBe(0);
    // … und wiederholte tote Strecken geben das Ziel als Wall auf. Je Stall-EPISODE gibt es
    // genau EIN Friction-Event (wie im Fenster-Pfad: rotations===1 meldet, 2..n nicht mehr).
    cast.registerIdleStall(t, proxy, 60);
    cast.registerIdleStall(t, proxy, 60);
    cast.registerIdleStall(t, proxy, 60);
    expect(t.blocked).toBe(true);
    expect(t.note).toContain("stalled");
    expect(rp.frictions.all().filter((f) => f.what.includes("stalled")).length).toBe(2);
  });

  it("stockFoodForIdle schaltet Auto-Eat nicht mehr auf Mini-Stacks um (Sweep6 T1-#2)", () => {
    // Seed-62-Tod (T1 §2): vor der Nacht wurde der 4er-Stack minor_healing_potion (heal 3) als
    // Auto-Eat gesetzt → nach ~90 s leer → Idle-Tod mit 14 echten Food-Items im Inventar.
    const rp = new RealisticPlayer(content, { seed: 62, style: "melee", name: "Wachsam" });
    const p = rp.player;
    p.sell("cooked_shrimp", 15); // Starter-Stapel auf 5 drücken (kein Stapel erreicht FOOD_LOW)
    p.give("minor_healing_potion", 4);
    p.state.character.gold = 200;
    expect(p.startCombat("cow")).toBe(true);
    (rp as unknown as { stockFoodForIdle(ms: number): void }).stockFoodForIdle(40 * MIN);
    // Der heilstärkste Mini-Stack (Potion) gewinnt NICHT mehr — der größte echte Stapel schon.
    // Shop-Purge (CEO 2026-07-11): cooked_trout ist nicht mehr käuflich, `buyFood` liefert hier
    // also 0 (kein Rezept mit 3× Zutaten auf Lager) — der Fallback bleibt beim größten VORHANDENEN
    // Stapel (5× cooked_shrimp schlägt 4× minor_healing_potion), exakt das gepinnte Verhalten.
    expect(p.state.character.food).not.toBe("minor_healing_potion");
    expect(p.state.character.food).toBe("cooked_shrimp");
  });

  it("Instanz-Loot füllt die unbegrenzte Tasche statt der Slots — keine falsche Voll-Friction (#246)", () => {
    // Vor #246 belegte jede verzauberte Instanz einen eigenen Slot: nicht-stapelbarer INSTANZ-Loot
    // (dim_focus-Offhands) füllte alle Slots und die Entlastung loggte „20/20 → 20/20" als No-op
    // (Sweep6 T4-#3). Seit #246 leben Instanzen in `inventory.instances` (unbegrenzt) → sie erzeugen
    // GAR KEINEN Slot-Druck mehr; die Voll-Friction darf also nie auslösen.
    const rp = new RealisticPlayer(content, { seed: 5, style: "melee", name: "Voll" });
    const p = rp.player;
    // Baseline VOR den Instanzen (der honest-Player startet mit Starter-Kit-Slots: Food + Saatgut).
    const usedBefore = p.inventoryUsed();
    const n = p.inventoryCapacity();
    for (let i = 0; i < n; i++) {
      addInstance(p.state.inventory, { instanceId: `s6t4_${i}`, baseItemId: "dim_focus", affixes: [] });
    }
    // Instanzen liegen in der Tasche, nicht in den Slots → sie erzeugen KEINEN zusätzlichen Slot-Druck.
    expect(p.state.inventory.instances).toHaveLength(n);
    expect(p.inventoryUsed()).toBe(usedBefore);
    const cast = rp as unknown as { manageInventory(): void };
    cast.manageInventory();
    cast.manageInventory();
    cast.manageInventory();
    const stuck = rp.frictions.all().filter((f) => f.what.includes("Entlastung wirkungslos"));
    expect(stuck.length).toBe(0); // keine falsche Voll-Meldung mehr
  });

  it("craftet die eigene Waffe, wenn der Shop keine mehr bietet (Sweep6 T4-#2, Magie-Route)", () => {
    // T4 Seed 63: der ehrliche Magier klebte 40 h auf gnarled_staff (Shop-Decke), obwohl das
    // Craft-Rezept längst frei war — Magie-Waffen sind ~100 % craft-/drop-gebunden.
    const rp = new RealisticPlayer(content, { seed: 63, style: "magic", name: "Mira" });
    const p = rp.player;
    // Armor-Iteration 2 §9.1: computeStats liest jetzt `magic` (Offense). ÜBERGANGSWEISE auch
    // `magic_off` setzen, damit die noch nicht umbenannten content-Waffen-Requirements
    // (`requirements.magic_off`) weiter greifen — content-dev räumt das in Phase C auf.
    p.setSkillLevel("magic", 30);
    p.setSkillLevel("magic", 30);
    p.setSkillLevel("vitality", 25);
    p.setSkillLevel("defence", 20);
    p.setSkillLevel("runecrafting", 20); // craft_steel_staff (RC 20) ist frei; Inputs fehlen noch
    p.state.character.gold = 500; // gnarled_staff (Shop-Decke) ist sofort kaufbar
    const res = rp.playFor(10 * H);
    // Die Craft-Route wurde wirklich verfolgt (Rezept fahren bzw. Essenz-Dropper jagen) …
    expect(res.log.some((l) => l.includes("Waffen-Route"))).toBe(true);
    // … und der Magier endet NICHT mehr auf der Shop-Decke.
    const mainhand = p.state.character.equipment.mainhand;
    expect(mainhand).toBeTruthy();
    expect(content.items[mainhand!]?.weaponStyle).toBe("magic");
    expect(["cracked_staff", "gnarled_staff"]).not.toContain(mainhand);
  });

  it("liefert Friction-Markdown und Finding-Mapping", () => {
    const rp = new RealisticPlayer(content, { seed: 3 });
    rp.handleDefeat("cow");
    rp.handleDefeat("cow");
    const md = rp.frictionMarkdown();
    expect(md).toContain("# Friction-Log");
    expect(md).toContain("Wiederholt gestorben an cow");
    const findings = frictionsToFindings(rp.frictions.all());
    expect(findings.length).toBe(rp.frictions.count());
    expect(findings[0]!.category).toBe("ux");
    expect(findings[0]!.severity).toBe("P3");
  });
});

describe("gearScore — Waffen 2.0 Range-Form (Re-Gate F3)", () => {
  // gearScore ist bewusst privat (reine Heuristik des Fake-Spielers) — der Test greift typsicher
  // über einen Struktur-Cast zu, statt die API nur für Tests aufzubohren.
  const scorer = (style: "melee" | "ranged" | "magic") => {
    const rp = new RealisticPlayer(content, { seed: 1, style });
    return (item: unknown): number =>
      (rp as unknown as { gearScore(i: unknown): number }).gearScore(item);
  };

  it("erkennt Range-Form-Waffen als Upgrades (vorher: Score ~0, cracked_bow @CL30)", () => {
    const score = scorer("ranged");
    const s = (id: string) => score(content.items[id]);
    // Tooltip-DPS macht die Tier-Leiter sichtbar: jede Stufe schlägt die vorige.
    expect(s("copper_shortbow")).toBeGreaterThan(s("cracked_bow"));
    expect(s("bronze_shortbow")).toBeGreaterThan(s("copper_shortbow"));
    expect(s("iron_shortbow")).toBeGreaterThan(s("bronze_shortbow"));
    const melee = scorer("melee");
    expect(melee(content.items["copper_spear"])).toBeGreaterThan(melee(content.items["rusty_sword"]));
  });

  it("bewertet DPS (Spanne ÷ Tempo), Effekte geben +5 % je Effekt, Legacy-Pfad bleibt vergleichbar", () => {
    const score = scorer("melee");
    const base = {
      id: "t_base", name: { en: "t", de: "t" }, type: "equipment", stackable: false,
      slot: "mainhand", weaponStyle: "melee", damageMin: 1, damageMax: 3, attackIntervalMs: 3000,
    };
    // Gleiche Spanne, schnelleres Tempo ⇒ höhere DPS ⇒ höherer Score.
    expect(score({ ...base, attackIntervalMs: 2500 })).toBeGreaterThan(score(base));
    // Waffeneffekt ⇒ +5 % auf den DPS-Anteil.
    const withFx = { ...base, weaponEffect: { type: "burn", chance: 0.5, magnitude: 0.3, durationMs: 4000 } };
    expect(score(withFx)).toBeCloseTo(score(base) * 1.05, 6);
    // Skala-Anker: Legacy-Flat D ist DPS-neutral konvertiert (Mittelwert D) — eine Range-Form-
    // Waffe mit Mittelwert 2 @3 s muss einem Legacy-Flat 2 entsprechen (beide Pfade EIN Maßstab).
    const legacy = { ...base, damageMin: undefined, damageMax: undefined, bonus: { meleeDamage: 2 } };
    expect(score(base)).toBeCloseTo(score(legacy), 6);
    // Offensiv-Flats auf Range-Form-Waffen liest computeStats nicht ⇒ auch kein Score-Phantom.
    expect(score({ ...base, bonus: { meleeDamage: 99, accuracy: 50, attackIntervalMs: -500 } })).toBeCloseTo(score(base), 6);
  });

  it("tote Fremd-Attribute punkten nicht mehr: Melee bevorzugt die Caster-Robe nicht (Sweep6 T1-#5)", () => {
    // T1-#5: beide Melee-Läufe endeten in der apprentice_robe_body (con 1 + int 1, 220 g),
    // obwohl leather_body (con 1, 110 g) effektiv gleichwertig ist — das int-Gewicht 0.1 war
    // ein Phantom (computeStats liest int im Melee-Stil nie). Jetzt: con-Gleichstand, kein
    // Robe-„Upgrade" mehr; für den Magier bleibt die Robe klar besser (int zählt voll).
    const melee = scorer("melee");
    expect(melee(content.items["apprentice_robe_body"])).toBeLessThanOrEqual(melee(content.items["leather_body"]));
    const magic = scorer("magic");
    expect(magic(content.items["apprentice_robe_body"])).toBeGreaterThan(magic(content.items["leather_body"]));
  });

  it("der ehrliche Fernkämpfer zieht den besseren Bogen wirklich an", () => {
    const rp = new RealisticPlayer(content, { seed: 22, style: "ranged", name: "Robin" });
    rp.player.give("copper_shortbow", 1); // kein Munitions-Gate mehr (#286)
    const res = rp.playFor(10 * MIN);
    expect(res.log.some((l) => l.includes("Upgrade angelegt: copper_shortbow"))).toBe(true);
    const mainhand = rp.player.state.character.equipment.mainhand;
    expect(mainhand).not.toBe("cracked_bow");
    expect(content.items[mainhand!]?.weaponStyle).toBe("ranged");
  });
});

describe("Friction-Log (sim-report)", () => {
  it("sammelt Events und fasst Wiederholungen im Markdown zusammen (×N)", () => {
    const c = new FrictionCollector();
    c.add({ moment: "Sim-Min 1, Shop", what: "Kauf fehlgeschlagen", whyConfusing: "Genug Gold, trotzdem nichts gekauft." });
    c.add({ moment: "Sim-Min 5, Shop", what: "Kauf fehlgeschlagen", whyConfusing: "Genug Gold, trotzdem nichts gekauft." });
    c.add({
      moment: "Sim-Min 9, Kampf",
      what: "Köcher leer trotz Reserve",
      whyConfusing: "Pfeile im Inventar rücken nicht nach.",
      evidence: { quiver: 0, reserve: 120 },
    });
    expect(c.count()).toBe(3);
    const md = formatFrictionMarkdown(c.all(), "Sweep-Feedback");
    expect(md).toContain("# Sweep-Feedback");
    expect(md).toContain("3 Reibungs-Moment(e), 2 Muster");
    expect(md).toContain("Kauf fehlgeschlagen (×2)");
    expect(md).toContain('"reserve":120');
  });

  it("meldet eine flüssige Session als solche", () => {
    expect(formatFrictionMarkdown([])).toContain("Keine Reibungspunkte");
  });
});
