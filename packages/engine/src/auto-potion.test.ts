import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { AUTO_EAT_COOLDOWN_MS, AUTO_POTION_COOLDOWN_MS, AUTO_POTION_MAX_THRESHOLD, AUTO_REBUFF_UNLOCK_COST } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { addItem, itemCount } from "./inventory";
import { useConsumable } from "./consumable";
import { advance } from "./tick";
import { setActiveAction } from "./actions";
import {
  combatStep,
  eligibleHealPotions,
  isHealPotion,
  selectHealPotion,
  setAutoPotionThreshold,
  setAutoRebuffTonics,
  startCombat,
} from "./combat";
import { unlockAutoRebuffTonics } from "./shop";

/**
 * Auto-Trank-System (Chef-Feature 2026-07-02, analog Auto-Eat): konfigurierter Heiltrank wird im
 * Kampf-Tick getrunken, sobald die HP auf/unter die eigene Schwelle fallen — mit eigenem, längerem
 * Cooldown (AUTO_POTION_COOLDOWN_MS). Auto-Rebuff: abgelaufene Buff-Tonika werden automatisch
 * nachgetrunken (Kampf UND Skilling). Alles deterministisch, kein RNG.
 */
describe("auto-potion", () => {
  /** Frischer Kampf-Zustand ohne Auto-Eat-Food, Trank konfiguriert, Timer neutralisiert. */
  function combatSetup(potionId = "potion_minor_heal", potionQty = 5) {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, potionId, potionQty);
    selectHealPotion(s, content, potionId);
    setAutoPotionThreshold(s, 0.4);
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    return { s, maxHp };
  }

  /** Ein isolierter Kampf-Tick: beide Angriffs-Timer genullt → niemand schlägt zu (kein RNG). */
  function quietTick(s: ReturnType<typeof createTestGame>) {
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = 0;
    combatStep(s, content);
  }

  // codex:2026-08-02T16:20:00+02:00 — Verhaltenstests starten nach erfolgtem Kauf; die eigentliche
  // Goldtransaktion wird separat am Ende dieser Suite geprüft.
  function enableAutoRebuff(s: ReturnType<typeof createTestGame>): void {
    s.character.autoPotion.autoRebuffUnlocked = true;
    setAutoRebuffTonics(s, true);
  }

  it("Trank-Cooldown ist bewusst LÄNGER als der Auto-Eat-Cooldown (eigene Konstante)", () => {
    expect(AUTO_POTION_COOLDOWN_MS).toBeGreaterThan(AUTO_EAT_COOLDOWN_MS);
  });

  it("trinkt bei/unter der Schwelle — NICHT darüber", () => {
    const { s, maxHp } = combatSetup();

    // Knapp ÜBER der Schwelle: kein Schluck.
    s.character.hp = maxHp * 0.41;
    quietTick(s);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(5);

    // EXAKT auf der Schwelle: Schluck (Grenze inklusive), heilt um healAmount.
    s.character.hp = maxHp * 0.4;
    quietTick(s);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(4);
    expect(s.character.hp).toBeGreaterThan(maxHp * 0.4);
    // Sichtbares Heil-Event im Kampf-Log (UI-Vertrag: grüne Zahl wie beim Auto-Eat).
    expect(s.combat.log.some((e) => e.by === "player" && e.kind === "heal")).toBe(true);
  });

  it("respektiert den eigenen Cooldown (AUTO_POTION_COOLDOWN_MS) — tickgenau", () => {
    const { s, maxHp } = combatSetup();
    s.character.hp = maxHp * 0.3;
    quietTick(s); // erster Schluck → Cooldown startet
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(4);

    // Während des kompletten Cooldowns (49 Folge-Ticks à 100 ms) wird NICHT getrunken …
    const cooldownTicks = AUTO_POTION_COOLDOWN_MS / 100; // TICK_MS = 100
    for (let i = 0; i < cooldownTicks - 1; i++) {
      s.character.hp = maxHp * 0.3; // dauerhaft unter der Schwelle gepinnt
      quietTick(s);
    }
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(4);

    // … und im ersten Tick NACH Ablauf wieder.
    s.character.hp = maxHp * 0.3;
    quietTick(s);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(3);
  });

  it("Chugging-Fix (#259): trinkt einen HoT-Draught NICHT nach, solange sein hpRegenPerSec-Buff aktiv ist", () => {
    // bloodmend_draught (#244): winzige Sofort-Heilung (3) + dominanter HoT-Buff (hpRegenPerSec 6, 4 s).
    // Ohne den Guard bliebe die HP nach dem Schluck unter der Schwelle und jeder Cooldown-Ablauf würde
    // sofort den nächsten Trank verbrennen (Buff-Refresh statt Nutzen) → Chugging.
    const { s, maxHp } = combatSetup("bloodmend_draught", 5);
    s.character.hp = maxHp * 0.3;
    quietTick(s); // erster Schluck → HoT-Buff aktiv, Cooldown startet
    expect(itemCount(s.inventory, "bloodmend_draught")).toBe(4);
    expect(s.character.buffs.some((b) => b.itemId === "bloodmend_draught")).toBe(true);

    // Selbst mit künstlich neutralisiertem Cooldown wird NICHT nachgetrunken, solange die HoT läuft
    // (in quietTick/combatStep laufen Buffs nicht ab → der HoT-Buff bleibt aktiv).
    for (let i = 0; i < AUTO_POTION_COOLDOWN_MS / 100 + 2; i++) {
      s.character.hp = maxHp * 0.3; // dauerhaft unter der Schwelle gepinnt
      s.combat.autoPotionCooldownMs = 0; // nur der HoT-Guard soll den Schluck verhindern
      quietTick(s);
    }
    expect(itemCount(s.inventory, "bloodmend_draught")).toBe(4); // kein Chugging trotz freiem Cooldown

    // HoT abgelaufen (Buff weg) + HP weiter niedrig → jetzt darf wieder getrunken werden (EIN Trank/Bedarf).
    s.character.buffs = [];
    s.character.hp = maxHp * 0.3;
    s.combat.autoPotionCooldownMs = 0;
    quietTick(s);
    expect(itemCount(s.inventory, "bloodmend_draught")).toBe(3);
  });

  it("Drazhan-Fix (Welle G): Dauer-Tonika mit Mini-Regen (buff.category) sperren den Auto-Heiltrank NICHT", () => {
    // Vor dem Fix blockte JEDER aktive Buff mit hpRegenPerSec > 0 den Not-Trank — auch 90–180-s-
    // Dauer-Tonika mit Mini-Regen (emberroot 0.3/s, witchlight 0.1/s, ironbark/panacea/gloomspore …).
    // Wer ein Tonikum trank, verlor damit MINUTENLANG die Not-Heilrate → Boss-Kipper
    // (design/balance-drazhan-audit.md, Welle F). Trennlinie: kategorisierte Buffs = Dauer-Tonika
    // (sperren nie); nur die bewusst KATEGORIELOSEN 2–4-s-Heil-HoTs der Auto-Trank-Pipeline
    // (#244/#303, Guard content-integrity.test.ts §4.4) zählen als „HoT läuft, nicht nachtrinken".
    const { s, maxHp } = combatSetup();
    addItem(s.inventory, content, "emberroot_tonic", 1); // category "regeneration", 120 s
    // claude:2026-10-25T19:04:00+01:00 — Irrlicht-Tonikum trägt seit 1.4.1 keine Regeneration mehr (Chef 25.10.); zweiter kategorisierter
    // Buff mit Regeneration ist jetzt das Sternkappen-Risotto (category "food", hpRegenPerSec 1, 300 s).
    addItem(s.inventory, content, "risotto_starcap", 1);
    expect(useConsumable(s, content, "emberroot_tonic")).toBe(true);
    expect(useConsumable(s, content, "risotto_starcap")).toBe(true);
    // Fixture-Ehrlichkeit: beide tragen real hpRegenPerSec > 0 UND eine Kategorie — sonst prüft
    // dieser Test nichts mehr (Content-Drift-Detektor, Content ist content-devs Revier).
    for (const id of ["emberroot_tonic", "risotto_starcap"]) {
      expect(content.items[id]?.buff?.category).toBeTruthy();
      expect(content.items[id]?.buff?.bonus?.hpRegenPerSec ?? 0).toBeGreaterThan(0);
      expect(s.character.buffs.some((b) => b.itemId === id)).toBe(true);
    }

    s.character.hp = maxHp * 0.3; // unter der Trank-Schwelle (0.4)
    quietTick(s);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(4); // Not-Trank feuert trotz aktiver Tonika
    expect(s.character.buffs.length).toBe(2); // Tonika unangetastet (kein Verdrängen durch den Heiltrank)
  });

  it("HoT-Log (#259): Regen-Heilung erscheint als grüne heal-Zeile im Kampf-Log, throttled ~1×/Sek", () => {
    // red-team #302 L1-Rollback (2026-07-09): emberroot_tonic hpRegenPerSec zurück auf 0.3 (war ein
    // Tooltip-Rundungs-Workaround, s. balance-redteam-2026-07-09.md §L1) — Math.round(0.3)=0 erzeugt in
    // tickCombatRegen NIE eine Log-Zeile, das ist jetzt der falsche Fixture für diesen Test.
    // bloodmend_draught (unverändert, Task #244, hpRegenPerSec 6) ist NOCH schlechter geeignet: bei der
    // winzigen maxHp (11) eines frischen L1-Charakters füllt es den HP-Pool bereits binnen ~0.9 s (9
    // Ticks) komplett — VOR dem ersten Throttle-Checkpoint (totalTicks%10==0, alle 1000 ms) — danach
    // ist „hp > hpBefore" für den Rest der 3 s dauerhaft falsch (schon voll), NIE-Log trotz aktivem HoT.
    // minor_healing_potion (unverändert, Task #244, hpRegenPerSec 3) füllt langsamer (~1,7 s) und ist
    // beim ersten Checkpoint (1 s) noch klar unter maxHp — trifft den Throttle-Mechanismus real.
    const s = createTestGame({ name: "R" }, content, 1);
    addItem(s.inventory, content, "minor_healing_potion", 1);
    expect(useConsumable(s, content, "minor_healing_potion")).toBe(true); // Buff hpRegenPerSec 3, 2 s
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = Math.max(1, Math.round(maxHp * 0.5)); // klar unter maxHp → Regen heilt real

    advance(s, content, 3_000); // 3 s Kampf → totalTicks überschreitet die Sekundengrenzen (10/20/30)

    const heals = s.combat.log.filter((e) => e.by === "player" && e.kind === "heal" && e.source === "effect");
    expect(heals.length).toBeGreaterThan(0); // HoT taucht im Log auf (grün via kind "heal")
    expect(heals.length).toBeLessThanOrEqual(5); // Throttle greift: NICHT 10 Zeilen/Sek
    for (const h of heals) expect(h.amount).toBeGreaterThan(0); // gerundeter Sekunden-Regen, min 1
  });

  it("Schwelle ist auf AUTO_POTION_MAX_THRESHOLD gedeckelt: save-editierte 1.0 trinkt NICHT bei vollen HP", () => {
    // Sweep6 T8-P4-2: die Trink-Bedingung ist „auf/unter Schwelle" (inklusive) — bei Schwelle 1.0
    // und vollen HP wäre sie dauerhaft wahr und alle AUTO_POTION_COOLDOWN_MS würde ein Trank mit
    // 0 Heilung verbrannt. Nur per Save-Edit/API erreichbar (UI-Slider endet bei 90 %); die Engine
    // klemmt den Trink-Pfad UND den Setter.
    const { s, maxHp } = combatSetup();
    s.character.autoPotion.healThreshold = 1; // Save-Edit-Bypass (sanitize härtet nur auf [0,1])

    s.character.hp = maxHp; // volle HP → KEIN 0-Heilungs-Verbrauch
    quietTick(s);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(5);

    s.character.hp = maxHp * 0.95; // über der effektiven Deckel-Schwelle → weiterhin kein Schluck
    quietTick(s);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(5);

    s.character.hp = maxHp * AUTO_POTION_MAX_THRESHOLD; // auf dem Deckel (inklusive) → trinkt
    quietTick(s);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(4);

    setAutoPotionThreshold(s, 1); // der Setter klemmt ebenfalls auf den Deckel
    expect(s.character.autoPotion.healThreshold).toBe(AUTO_POTION_MAX_THRESHOLD);
  });

  it("nutzt die ECHTE Consumable-Logik: Antigift-Trank heilt UND entfernt den Gift-DoT", () => {
    const { s, maxHp } = combatSetup("potion_antidote", 1);
    s.combat.playerEffects.push({ type: "poison", remainingMs: 30_000, magnitude: 1 });
    s.character.hp = maxHp * 0.3;

    quietTick(s);

    expect(itemCount(s.inventory, "potion_antidote")).toBe(0);
    expect(s.combat.playerEffects.some((e) => e.type === "poison")).toBe(false); // kuriert wie manuell
  });

  it("Auto-Eat und Auto-Trank prüfen UNABHÄNGIG: beide feuern im selben Tick", () => {
    const { s, maxHp } = combatSetup();
    addItem(s.inventory, content, "cooked_shrimp", 5);
    s.character.food = "cooked_shrimp"; // Auto-Eat-Schwelle (Tier 0) = 0.5 — getrennt von 0.4

    s.character.hp = maxHp * 0.2; // unter BEIDEN Schwellen
    quietTick(s);

    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(4); // Food zuerst (billige Grundversorgung)
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(4); // Trank trotzdem (Food-Heal +1 hebt nicht über 0.4)
  });

  it("ohne Trank im Inventar/ohne Konfiguration passiert nichts (kein Crash, kein Schluck)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = maxHp * 0.2;
    quietTick(s); // healPotionId = null (Default aus)
    expect(s.character.hp).toBe(maxHp * 0.2);

    selectHealPotion(s, content, "potion_minor_heal"); // konfiguriert, aber 0 im Inventar
    s.character.hp = maxHp * 0.2;
    quietTick(s);
    expect(s.character.hp).toBe(maxHp * 0.2);
  });

  it("Auto-Rebuff: abgelaufenes Buff-Tonikum wird beim SKILLING nachgetrunken (voller Refresh)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "tonic_forager_i", 2);
    enableAutoRebuff(s);
    expect(useConsumable(s, content, "tonic_forager_i")).toBe(true); // 300 s Buff, 1 in Reserve
    setActiveAction(s, content, "cut_normal_tree");
    s.character.buffs[0]!.remainingMs = 500; // gleich ablaufend

    advance(s, content, 1_000);

    expect(s.character.buffs.length).toBe(1); // nahtlos nachgetrunken
    expect(itemCount(s.inventory, "tonic_forager_i")).toBe(0);
    expect(s.character.buffs[0]!.remainingMs).toBeGreaterThan(290_000); // frische volle Dauer
  });

  it("Auto-Rebuff wirkt auch IM KAMPF (Buffs laufen dort über denselben Tick-Pfad ab)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "tonic_oxblood", 2);
    enableAutoRebuff(s);
    expect(useConsumable(s, content, "tonic_oxblood")).toBe(true);
    startCombat(s, content, "goblin");
    s.character.buffs[0]!.remainingMs = 300;

    advance(s, content, 1_000); // Kampf läuft; Buff läuft ab → Rebuff im selben Tick

    expect(s.character.buffs.length).toBe(1);
    expect(itemCount(s.inventory, "tonic_oxblood")).toBe(0);
  });

  it("Auto-Rebuff aus (Default) bzw. leeres Inventar → Buff läuft einfach ab", () => {
    // Default: Flag aus → kein Nachtrinken trotz Reserve.
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "tonic_oxblood", 2);
    useConsumable(s, content, "tonic_oxblood");
    s.character.buffs[0]!.remainingMs = 300;
    advance(s, content, 1_000);
    expect(s.character.buffs.length).toBe(0);
    expect(itemCount(s.inventory, "tonic_oxblood")).toBe(1); // Reserve unangetastet

    // Flag an, aber KEINE Reserve → läuft ebenfalls nur ab (kein Crash).
    const s2 = createTestGame({ name: "Y" }, content, 1);
    addItem(s2.inventory, content, "tonic_oxblood", 1);
    enableAutoRebuff(s2);
    useConsumable(s2, content, "tonic_oxblood");
    s2.character.buffs[0]!.remainingMs = 300;
    advance(s2, content, 1_000);
    expect(s2.character.buffs.length).toBe(0);
  });

  it("Determinismus: EIN großer advance (offline-artig) == viele kleine advances (live)", () => {
    const run = (chunked: boolean) => {
      const s = createTestGame({ name: "D" }, content, 99);
      addItem(s.inventory, content, "tonic_forager_i", 4);
      enableAutoRebuff(s);
      useConsumable(s, content, "tonic_forager_i"); // aktiv (300 s), 3 in Reserve
      setActiveAction(s, content, "cut_normal_tree");
      if (chunked) {
        for (let i = 0; i < 700; i++) advance(s, content, 1_000);
      } else {
        advance(s, content, 700_000); // ein Rutsch: Buff läuft bei 300 s & 600 s ab → 2× Rebuff
      }
      return {
        tonics: itemCount(s.inventory, "tonic_forager_i"),
        buffs: s.character.buffs.map((b) => ({ itemId: b.itemId, remainingMs: b.remainingMs })),
        logs: itemCount(s.inventory, "normal_log"),
        xp: s.skills.woodcutting?.xp ?? 0,
        rng: s.rng.state,
      };
    };

    const single = run(false);
    const many = run(true);
    expect(single).toEqual(many); // bit-identisch: Buffs ticken PRO TICK, Rebuff zieht kein RNG
    expect(single.tonics).toBe(1); // 2× nachgetrunken (bei 300 s und 600 s)
    expect(single.buffs.length).toBe(1); // dritter Buff läuft noch
  });

  it("eligibleHealPotions: listet Inventar-Heiltränke (Herblore/potion-ID), aber kein Food/Buff-Tonikum", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "potion_minor_heal", 1); // klassischer Heiltrank
    addItem(s.inventory, content, "duskcap_tonic", 1); // Herblore-Heiltrank OHNE „potion" in der ID
    addItem(s.inventory, content, "cooked_shrimp", 1); // Food (Cooking) → Auto-Eat-Domäne
    addItem(s.inventory, content, "tonic_oxblood", 1); // Buff-Tonikum ohne healAmount

    const eligible = eligibleHealPotions(s, content);
    expect(eligible).toContain("potion_minor_heal");
    expect(eligible).toContain("duskcap_tonic");
    expect(eligible).not.toContain("cooked_shrimp");
    expect(eligible).not.toContain("tonic_oxblood");
    expect(isHealPotion(content, "cooked_trout")).toBe(false);
  });

  it("selectHealPotion validiert: Food wird abgelehnt, Trank übernommen, null schaltet aus", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    expect(s.character.autoPotion.healPotionId).toBeNull(); // Default: aus

    selectHealPotion(s, content, "cooked_shrimp");
    expect(s.character.autoPotion.healPotionId).toBeNull(); // Food ist kein Trank

    selectHealPotion(s, content, "potion_greater_heal");
    expect(s.character.autoPotion.healPotionId).toBe("potion_greater_heal");

    selectHealPotion(s, content, null);
    expect(s.character.autoPotion.healPotionId).toBeNull();

    // Schwelle wird geklemmt (0..AUTO_POTION_MAX_THRESHOLD — Sweep6 T8-P4-2: bei 1.0 tränke der
    // Auto-Trank auch bei vollen HP); Rebuff bleibt bis zum Goldkauf gesperrt.
    setAutoPotionThreshold(s, 7);
    expect(s.character.autoPotion.healThreshold).toBe(AUTO_POTION_MAX_THRESHOLD);
    setAutoPotionThreshold(s, -1);
    expect(s.character.autoPotion.healThreshold).toBe(0);
    setAutoPotionThreshold(s, 0.55);
    expect(s.character.autoPotion.healThreshold).toBeCloseTo(0.55, 9);
    // codex:2026-08-02T16:20:00+02:00 — der Setter darf den Kauf nicht umgehen; der Kauf zieht
    // exakt 50.000 Gold ab, zählt als Ausgabe und ist danach idempotent.
    setAutoRebuffTonics(s, true);
    expect(s.character.autoPotion.autoRebuffTonics).toBe(false);
    s.character.gold = AUTO_REBUFF_UNLOCK_COST;
    const spentBefore = s.stats.goldSpent;
    expect(unlockAutoRebuffTonics(s)).toBe(true);
    expect(s.character.gold).toBe(0);
    expect(s.stats.goldSpent).toBe(spentBefore + AUTO_REBUFF_UNLOCK_COST);
    expect(unlockAutoRebuffTonics(s)).toBe(true);
    expect(s.stats.goldSpent).toBe(spentBefore + AUTO_REBUFF_UNLOCK_COST);
    setAutoRebuffTonics(s, true);
    expect(s.character.autoPotion.autoRebuffTonics).toBe(true);
  });
});
