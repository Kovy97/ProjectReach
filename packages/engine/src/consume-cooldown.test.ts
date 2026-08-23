import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { content } from "@hearthforge/content";
import { AUTO_EAT_COOLDOWN_MS, AUTO_POTION_COOLDOWN_MS, KILL_COOLDOWN_MS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { addItem, itemCount } from "./inventory";
import { useConsumable } from "./consumable";
import { consumeBlocked, consumeCooldownKind } from "./consume-gate";
import { advance } from "./tick";
import {
  combatStep,
  isHealPotion,
  selectFood,
  selectHealPotion,
  setAutoPotionThreshold,
  setAutoRebuffTonics,
  startCombat,
  stopCombat,
} from "./combat";

/**
 * Konsum-Abklingzeit (Spieler-Exploit-Report Steam-Forum, 1.0.0):
 *
 *   "you can literally in mid fight go to your character sheet and just start chugging potions or
 *    food bypassing the ingame mechanic of eating food and potions within a slight cooldown"
 *
 * Ursache: die Abklingzeit lebte AUSSCHLIESSLICH in den Auto-Pfaden des Kampf-Ticks
 * (combat.ts tryAutoEat/tryAutoPotion prüfen+setzen `combat.autoEatCooldownMs`/
 * `combat.autoPotionCooldownMs`). Der manuelle Verzehr (`useConsumable`, aufgerufen vom
 * Charakterblatt) kannte die Felder überhaupt nicht — beliebig viele Schlucke pro Tick.
 *
 * Fix: die Regel liegt jetzt in der Engine (consume-gate.ts) und gilt in JEDEM Konsumpfad —
 * dieselben zwei Cooldown-Felder, dieselbe Trennung Food/Trank, dieselbe Kill-Cooldown-Sperre.
 * Rein transienter Kampfzustand: KEIN neues Save-Feld, kein SAVE_VERSION-Bump.
 *
 * Alles deterministisch, kein RNG (die Gate-Prüfung liest nur State + Content).
 */
describe("Konsum-Abklingzeit (jeder Pfad)", () => {
  /** Kampf-Setup mit ruhigen Timern: kein Angriff, kein RNG, nur die Konsum-Mechanik. */
  function fight(level = 1) {
    const s = createTestGame({ name: "X" }, content, level);
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    return { s, maxHp };
  }

  function quietTick(s: ReturnType<typeof createTestGame>) {
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = 0;
    combatStep(s, content);
  }

  // -- 1. Der gemeldete Exploit ------------------------------------------------
  it("REPRO: Chugging vom Charakterblatt mitten im Kampf - nur EIN Bissen pro Abklingzeit", () => {
    const { s } = fight();
    addItem(s.inventory, content, "cooked_shrimp", 10);
    s.character.hp = 1;

    // Der Exploit-Klickpfad: 10x "Benutzen" im selben Moment (kein Tick dazwischen).
    const results = Array.from({ length: 10 }, () => useConsumable(s, content, "cooked_shrimp"));

    expect(results[0]).toBe(true); // der erste Bissen geht durch ...
    expect(results.slice(1).every((r) => r === false)).toBe(true); // ... alle weiteren prallen ab
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(9); // genau EIN Item verbraucht (vorher: 0 übrig)
    expect(s.combat.autoEatCooldownMs).toBe(AUTO_EAT_COOLDOWN_MS); // manueller Verzehr startet den Takt

    // Nach Ablauf der Abklingzeit ist wieder genau ein Bissen erlaubt.
    for (let i = 0; i < AUTO_EAT_COOLDOWN_MS / 100; i++) {
      s.character.hp = 1; // unter jeder Schwelle gepinnt (Auto-Eat ist ohne `food` ohnehin aus)
      quietTick(s);
    }
    expect(useConsumable(s, content, "cooked_shrimp")).toBe(true);
    expect(useConsumable(s, content, "cooked_shrimp")).toBe(false);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(8);
  });

  it("REPRO: dasselbe für Tränke - eigener, längerer Trank-Takt", () => {
    const { s, maxHp } = fight();
    addItem(s.inventory, content, "potion_minor_heal", 10);
    s.character.hp = 1;

    const results = Array.from({ length: 10 }, () => useConsumable(s, content, "potion_minor_heal"));
    expect(results[0]).toBe(true);
    expect(results.slice(1).every((r) => r === false)).toBe(true);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(9);
    expect(s.combat.autoPotionCooldownMs).toBe(AUTO_POTION_COOLDOWN_MS);
    expect(s.character.hp).toBeLessThan(maxHp); // ein Schluck füllt NICHT auf voll
  });

  // -- 2. Ein Takt für Hand UND Automatik (die eigentliche Lücke) --------------
  it("manueller Verzehr und Auto-Eat teilen sich EIN Cooldown-Feld (beide Richtungen)", () => {
    // (a) Hand blockiert Automatik: nach einem manuellen Bissen darf Auto-Eat nicht sofort nachlegen.
    const a = fight();
    addItem(a.s.inventory, content, "cooked_shrimp", 5);
    selectFood(a.s, content, "cooked_shrimp");
    a.s.character.hp = 1;
    expect(useConsumable(a.s, content, "cooked_shrimp")).toBe(true);
    a.s.character.hp = 1;
    quietTick(a.s); // Auto-Eat-Schwelle klar unterschritten - aber der Takt läuft
    expect(itemCount(a.s.inventory, "cooked_shrimp")).toBe(4);

    // (b) Automatik blockiert Hand: nach dem Auto-Bissen prallt der Klick ab.
    const b = fight();
    addItem(b.s.inventory, content, "cooked_shrimp", 5);
    selectFood(b.s, content, "cooked_shrimp");
    b.s.character.hp = 1;
    quietTick(b.s); // Auto-Eat feuert
    expect(itemCount(b.s.inventory, "cooked_shrimp")).toBe(4);
    expect(useConsumable(b.s, content, "cooked_shrimp")).toBe(false);
    expect(itemCount(b.s.inventory, "cooked_shrimp")).toBe(4);
  });

  it("manueller Trank und Auto-Trank teilen sich EIN Cooldown-Feld (beide Richtungen)", () => {
    const a = fight();
    addItem(a.s.inventory, content, "potion_minor_heal", 5);
    selectHealPotion(a.s, content, "potion_minor_heal");
    setAutoPotionThreshold(a.s, 0.4);
    a.s.character.hp = 1;
    expect(useConsumable(a.s, content, "potion_minor_heal")).toBe(true);
    a.s.character.hp = 1;
    quietTick(a.s);
    expect(itemCount(a.s.inventory, "potion_minor_heal")).toBe(4);

    const b = fight();
    addItem(b.s.inventory, content, "potion_minor_heal", 5);
    selectHealPotion(b.s, content, "potion_minor_heal");
    setAutoPotionThreshold(b.s, 0.4);
    b.s.character.hp = 1;
    quietTick(b.s); // Auto-Trank feuert
    expect(itemCount(b.s.inventory, "potion_minor_heal")).toBe(4);
    expect(useConsumable(b.s, content, "potion_minor_heal")).toBe(false);
  });

  it("Food- und Trank-Takt bleiben GETRENNT (unveränderte Kampfregel)", () => {
    const { s } = fight();
    addItem(s.inventory, content, "cooked_shrimp", 3);
    addItem(s.inventory, content, "potion_minor_heal", 3);
    s.character.hp = 1;

    expect(useConsumable(s, content, "cooked_shrimp")).toBe(true);
    expect(useConsumable(s, content, "potion_minor_heal")).toBe(true); // Trank hat seinen eigenen Takt
    expect(useConsumable(s, content, "cooked_shrimp")).toBe(false);
    expect(useConsumable(s, content, "potion_minor_heal")).toBe(false);
  });

  // -- 3. Kill-Cooldown: dieselbe Regel wie für die Auto-Pfade -----------------
  it("Kill-Cooldown-Verschnaufpause: Heil-Konsum ist auch von Hand gesperrt (Combat-Feel v2 #0)", () => {
    // combatStep feuert in der Pause bewusst WEDER Auto-Eat NOCH Auto-Trank ("kein Gratis-Refill
    // zwischen den Mobs"). Vom Charakterblatt aus war das Fenster bisher offen.
    const { s } = fight();
    addItem(s.inventory, content, "cooked_shrimp", 3);
    addItem(s.inventory, content, "potion_minor_heal", 3);
    s.character.hp = 1;
    s.combat.cooldownRemainingMs = KILL_COOLDOWN_MS;

    expect(useConsumable(s, content, "cooked_shrimp")).toBe(false);
    expect(useConsumable(s, content, "potion_minor_heal")).toBe(false);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(3);
    expect(itemCount(s.inventory, "potion_minor_heal")).toBe(3);

    // Pause vorbei -> wieder erlaubt (ein Bissen).
    s.combat.cooldownRemainingMs = undefined;
    expect(useConsumable(s, content, "cooked_shrimp")).toBe(true);
  });

  // -- 4. Was sich NICHT ändern darf -------------------------------------------
  it("außerhalb des Kampfes bleibt Konsum frei (kein Balance-Eingriff)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "cooked_shrimp", 5);
    addItem(s.inventory, content, "potion_minor_heal", 5);
    s.character.hp = 1;
    for (let i = 0; i < 5; i++) expect(useConsumable(s, content, "cooked_shrimp")).toBe(true);
    for (let i = 0; i < 5; i++) expect(useConsumable(s, content, "potion_minor_heal")).toBe(true);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(0);
    expect(s.combat.autoEatCooldownMs ?? 0).toBe(0); // außerhalb des Kampfs wird kein Takt gesetzt
    expect(s.combat.autoPotionCooldownMs ?? 0).toBe(0);

    // Kampf beendet (stopCombat) -> ebenfalls frei.
    startCombat(s, content, "goblin");
    addItem(s.inventory, content, "cooked_shrimp", 3);
    expect(useConsumable(s, content, "cooked_shrimp")).toBe(true);
    expect(useConsumable(s, content, "cooked_shrimp")).toBe(false);
    stopCombat(s);
    expect(useConsumable(s, content, "cooked_shrimp")).toBe(true);
  });

  it("reine Buff-Tonika (heilen nicht) bleiben im Kampf ungetaktet", () => {
    const { s } = fight();
    addItem(s.inventory, content, "tonic_oxblood", 2);
    expect(content.items.tonic_oxblood?.healAmount ?? 0).toBe(0); // Fixture-Ehrlichkeit
    expect(consumeCooldownKind(content, "tonic_oxblood")).toBe("none");
    expect(useConsumable(s, content, "tonic_oxblood")).toBe(true);
    expect(useConsumable(s, content, "tonic_oxblood")).toBe(true); // reiner Buff-Refresh, kein Heil-Takt
    expect(s.combat.autoEatCooldownMs ?? 0).toBe(0);
    expect(s.combat.autoPotionCooldownMs ?? 0).toBe(0);
  });

  it("Auto-Rebuff (Tonikum läuft ab) funktioniert weiter - auch bei laufendem Ess-Takt", () => {
    // Combo-Food (heilt UND trägt buff.category) wird von tickBuffs nachgetrunken. Der Rebuff feuert
    // höchstens einmal pro Buff-DAUER (90-300 s) und ist damit kein Chugging-Vektor - er ist die EINE
    // dokumentierte Ausnahme vom Gate (sonst ginge der Tonikum-Buff im Kampf ersatzlos verloren).
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "marshroot_chowder", 2);
    expect(content.items.marshroot_chowder?.buff?.category).toBeTruthy();
    expect((content.items.marshroot_chowder?.healAmount ?? 0) > 0).toBe(true);
    s.character.autoPotion.autoRebuffUnlocked = true;
    setAutoRebuffTonics(s, true);
    expect(useConsumable(s, content, "marshroot_chowder")).toBe(true);

    startCombat(s, content, "goblin");
    s.combat.autoEatCooldownMs = AUTO_EAT_COOLDOWN_MS; // Ess-Takt läuft
    s.character.buffs[0]!.remainingMs = 50;

    advance(s, content, 100); // Buff läuft ab -> Rebuff

    expect(itemCount(s.inventory, "marshroot_chowder")).toBe(0);
    expect(s.character.buffs.some((b) => b.itemId === "marshroot_chowder")).toBe(true);
  });

  it("Klassifikation folgt isHealPotion (Trank) bzw. Food - für den GESAMTEN Katalog", () => {
    for (const item of Object.values(content.items)) {
      if (item.type !== "consumable") continue;
      const heals = (item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0;
      const kind = consumeCooldownKind(content, item.id);
      if (!heals) expect(kind, item.id).toBe("none");
      else expect(kind, item.id).toBe(isHealPotion(content, item.id) ? "potion" : "food");
    }
  });

  // -- 5. Guards gegen den nächsten Umgehungs-Pfad -----------------------------
  it("GUARD (Verhalten): KEIN heilendes Consumable des Katalogs kommt bei laufendem Takt durch", () => {
    let checked = 0;
    for (const item of Object.values(content.items)) {
      if (item.type !== "consumable") continue;
      const kind = consumeCooldownKind(content, item.id);
      if (kind === "none") continue;
      const { s } = fight();
      addItem(s.inventory, content, item.id, 2);
      if (itemCount(s.inventory, item.id) < 2) continue; // nicht stapelbar/kein Platz -> überspringen
      s.character.hp = 1;
      // Takt künstlich scharf stellen (beide Kategorien) und Konsum versuchen.
      s.combat.autoEatCooldownMs = AUTO_EAT_COOLDOWN_MS;
      s.combat.autoPotionCooldownMs = AUTO_POTION_COOLDOWN_MS;
      expect(consumeBlocked(s, content, item.id), item.id).toBe(true);
      expect(useConsumable(s, content, item.id), item.id).toBe(false);
      expect(itemCount(s.inventory, item.id), item.id).toBe(2); // nichts verbraucht
      checked++;
    }
    expect(checked).toBeGreaterThan(50); // der Katalog wurde wirklich abgelaufen
  });

  it("GUARD (Quelltext): jede useConsumable-Aufrufstelle nutzt den gegateten Default", () => {
    // Die Regel darf nicht durch einen NEUEN Aufrufer umgangen werden: `useConsumable` ist
    // standardmäßig gegatet; nur ein explizit übergebener 4. Parameter kann das Gate umgehen.
    // Erlaubt ist dafür EXAKT eine Stelle - der Auto-Rebuff in consumable.ts (tickBuffs).
    const here = dirname(fileURLToPath(import.meta.url)); // .../packages/engine/src
    const repoRoot = join(here, "..", "..", "..");
    const roots = [join(repoRoot, "packages"), join(repoRoot, "apps", "client", "src")].filter(existsSync);
    expect(roots.length).toBeGreaterThan(0);

    const allowlist = new Set(["packages/engine/src/consumable.ts"]);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === "dist" || e.name === "CODEX" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) files.push(p);
      }
    };
    for (const r of roots) walk(r);

    /** Argumentliste eines Aufrufs ab der offenen Klammer, klammer-balanciert. */
    const argsAt = (src: string, open: number): string => {
      let depth = 0;
      for (let i = open; i < src.length; i++) {
        const c = src[i];
        if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0) return src.slice(open + 1, i);
        }
      }
      return src.slice(open + 1);
    };
    /** Top-Level-Argumente zählen (Kommas außerhalb von Klammern). */
    const argCount = (args: string): number => {
      if (args.trim() === "") return 0;
      let depth = 0;
      let n = 1;
      for (const c of args) {
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (c === "," && depth === 0) n++;
      }
      return n;
    };

    const violations: string[] = [];
    let callSites = 0;
    for (const f of files) {
      const rel = relative(repoRoot, f).replace(/\\/g, "/");
      if (rel.endsWith("consume-cooldown.test.ts")) continue; // diese Datei selbst
      const src = readFileSync(f, "utf8");
      const re = /\buseConsumable\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const args = argsAt(src, m.index + m[0].length - 1);
        const n = argCount(args);
        if (n === 0) continue;
        // Die Definition selbst (mit Typannotationen) ist kein Aufruf.
        if (/^\s*(export\s+)?function\s+useConsumable/.test(src.slice(Math.max(0, m.index - 40), m.index + 20))) continue;
        callSites++;
        if (n > 3 && !allowlist.has(rel)) violations.push(`${rel}: useConsumable mit ${n} Argumenten`);
      }
    }
    expect(callSites).toBeGreaterThan(5); // der Scanner hat wirklich Aufrufe gesehen
    expect(violations).toEqual([]);

    // Und: der manuelle UI-Pfad (Charakterblatt) existiert und ruft OHNE Bypass auf.
    const charPage = join(repoRoot, "apps", "client", "src", "renderer", "pages", "CharacterPage.tsx");
    if (existsSync(charPage)) {
      expect(readFileSync(charPage, "utf8")).toMatch(/useConsumable\(state, content, itemId\)/);
    }
  });

  it("Determinismus: das Gate zieht kein RNG", () => {
    const { s } = fight();
    addItem(s.inventory, content, "cooked_shrimp", 5);
    s.character.hp = 1;
    const rngBefore = s.rng.state;
    useConsumable(s, content, "cooked_shrimp");
    useConsumable(s, content, "cooked_shrimp"); // geblockt
    expect(s.rng.state).toBe(rngBefore);
  });
});
