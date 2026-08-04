import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { addItem } from "./inventory";
import { xpForLevel } from "./leveling";
import type { GameState } from "@hearthforge/shared";

/**
 * P2.7 — Ranged ≢ Magic: Differenzierung verifizieren.
 *
 * Der Min-Maxer maß ranged und magic einst mit identischen s/Kill. Inzwischen tragen Stäbe
 * weaponEffects (frost/burn/shock) und Bögen Krit/Tempo. Dieser Test belegt, dass sich beide
 * Stile am SELBEN Mob unterschiedlich verhalten:
 *   - Magie via DoT-Statuseffekt (ignoriert Rüstung, tickt durch Regen) → stark gegen tanky/regen.
 *   - Ranged (Basis-/Mittel-Bögen) via Burst/Krit (höherer Direktschaden), OHNE durchtickenden DoT.
 *
 * WICHTIG (Balance-Pass 3 #4): die TOP-Bögen (last_vengeance/spectral_longbow, req99) tragen künftig
 * einen eigenen bleed-DoT (Rüstungs-/Regen-Bypass) — „Ranged trägt per Design KEINEN DoT" gilt also
 * NICHT mehr pauschal. Die Differenzierungs-Tests hier nutzen daher bewusst EFFEKTLOSE Basis-/Mittel-
 * Bögen (copper_/mithril_longbow), damit sie den Stil-Kontrast messen, nicht einzelne End-Waffen. Der
 * separate „Ranged-Bleed-Pfad"-Test unten belegt content-UNABHÄNGIG, dass ein bleed-weaponEffect eines
 * Bogens in der Engine tatsächlich am Gegner landet (fängt „definiert, aber nie angewandt"-Regressionen).
 *
 * Mob: Elder Treant (rootling_treemonster) — tanky (380 HP), regeneriert (regen 4) und resistent
 * gegen bleed/poison. Damit zählt für Magie nur der NICHT-resistierte burn-DoT (aether_runestaff),
 * während ein Bogen ohne weaponEffect seinen ganzen Output in Direktschaden packt → die Profile
 * MÜSSEN auseinanderlaufen.
 */

const TREANT = "rootling_treemonster";

/** Setzt die Skill-Gates so, dass beide Stäbe/Bögen tragbar sind und earlyXpMult = 1 (>L40). */
function levelUp(s: GameState): void {
  for (const id of ["ranged", "magic", "runecrafting", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(50) };
  }
}

/** Misst, wie viel Schaden ein Setup in `ticks` Ticks am Treant kumuliert (= roher Output). */
function fightDamageDealt(setup: (s: GameState) => void, seed: number, ticks: number): number {
  // Seeds halbiert (Itemization 2.0 §1: Seeds zählen 1:1) — hält die Stil-Profile auf der
  // bisherigen Attribut-Größenordnung (sonst verwischt der doppelte dex/int-Schub den Kontrast).
  const s = createTestGame({ name: "X", baseAttributes: { dex: 20, int: 20, con: 15 } }, content, seed);
  levelUp(s);
  setup(s);
  startCombat(s, content, TREANT);
  const maxHp = content.monsters[TREANT]!.maxHp;
  let dealt = 0;
  let prevHp = s.combat.enemyHp;
  for (let i = 0; i < ticks; i++) {
    combatStep(s, content);
    // Niederlage bricht den Kampf jetzt ab (Chef 2026-07-01) statt intern neu zu starten. Für die
    // Output-Messung über das volle Fenster steigen wir nach einem Abbruch sofort wieder ein (analog
    // zum alten Auto-Neustart / zum SimPlayer.fightFor-Harness) — sonst würde ein Tod die Messung
    // unterschiedlich weit abschneiden und den Stil-Kontrast verfälschen.
    if (s.combat.monsterId === null) {
      startCombat(s, content, TREANT);
      prevHp = s.combat.enemyHp;
      continue;
    }
    // Schaden = Verlust gegenüber letztem Tick (Respawn/Heal wieder hochrechnen).
    if (s.combat.enemyHp < prevHp) dealt += prevHp - s.combat.enemyHp;
    prevHp = s.combat.kills > 0 && s.combat.enemyHp === maxHp ? maxHp : s.combat.enemyHp;
  }
  return dealt;
}

describe("P2.7 — Ranged differenziert sich von Magic", () => {
  it("Magie wirkt am bleed-resistenten Regen-Mob über einen durchtickenden burn-DoT", () => {
    // aether_runestaff: burn-weaponEffect, nicht resistiert → DoT tickt durch Regen.
    const s = createTestGame({ name: "X", baseAttributes: { int: 40, con: 60 } }, content, 101);
    levelUp(s);
    s.character.equipment.mainhand = "aether_runestaff";
    s.character.mana = 999;
    // Combat-Feel-v2 #0: On-Level-Mobs schlagen jetzt härter (~5%/s naked). Dieser Test prüft
    // NUR die Burn-Anwendung, nicht Überleben — dem ungeprepten Magier Food+Auto-Eat geben,
    // damit er lange genug lebt, um den Burn-Stack zuverlässig (seed-unabhängig) zu beobachten.
    s.character.food = "cooked_soulfish";
    addItem(s.inventory, content, "cooked_soulfish", 200);
    startCombat(s, content, TREANT);
    let sawBurn = false;
    for (let i = 0; i < 600; i++) {
      combatStep(s, content);
      if (s.combat.enemyEffects.some((e) => e.type === "burn")) sawBurn = true;
    }
    expect(sawBurn, "Magie sollte burn-DoT am Gegner auslösen").toBe(true);
  });

  it("Ranged-Frost-Bogen verliert seinen Effekt am frostimmunen Mob (kein DoT-Profil)", () => {
    // Moderner Instanz-Pfad (das alte frostbite_longbow ist raus): Basis-Bogen + ausgerüstete
    // affix_frost-Instanz (höchster Tier = sichere Chance). skeleton_icemage resistiert frost →
    // der Frost-Waffeneffekt darf NIE als Stack am Gegner landen.
    const s = createTestGame({ name: "X", baseAttributes: { dex: 40, con: 30 } }, content, 101);
    levelUp(s);
    s.character.equipment.mainhand = "mithril_longbow";
    s.character.equippedInstances = {
      ...s.character.equippedInstances,
      mainhand: {
        instanceId: "inst_test_frostbow",
        baseItemId: "mithril_longbow",
        affixes: [{ affixId: "affix_frost", tier: 3 }],
      },
    };
    // Keine Munition mehr (#286) — der Bogen feuert direkt.
    startCombat(s, content, "skeleton_icemage"); // resists frost
    let sawFrost = false;
    for (let i = 0; i < 600; i++) {
      combatStep(s, content);
      if (s.combat.enemyEffects.some((e) => e.type === "frost")) sawFrost = true;
    }
    expect(sawFrost, "frost muss am frostresistenten Mob ausbleiben").toBe(false);
  });

  it("Gegenprobe: derselbe Frost-Bogen löst am NICHT-frostresistenten Mob sehr wohl Frost aus", () => {
    // Beweist, dass der obige Test echte Frost-Logik prüft (nicht vakuant grün): identisches Setup,
    // aber ein nicht-resistenter Mob (ash_tyrant) → Frost-Stack muss auftreten.
    const s = createTestGame({ name: "X", baseAttributes: { dex: 40, con: 30 } }, content, 101);
    levelUp(s);
    s.character.equipment.mainhand = "mithril_longbow";
    s.character.equippedInstances = {
      ...s.character.equippedInstances,
      mainhand: {
        instanceId: "inst_test_frostbow2",
        baseItemId: "mithril_longbow",
        affixes: [{ affixId: "affix_frost", tier: 3 }],
      },
    };
    // Keine Munition mehr (#286) — der Bogen feuert direkt.
    startCombat(s, content, "ash_tyrant"); // nicht frostimmun
    let sawFrost = false;
    for (let i = 0; i < 4000; i++) {
      combatStep(s, content);
      if (s.combat.enemyEffects.some((e) => e.type === "frost")) sawFrost = true;
    }
    expect(sawFrost, "frost muss am nicht-resistenten Mob auftreten").toBe(true);
  });

  it("Profile laufen messbar auseinander: Magie hat einen DoT-Anteil, der Bogen nicht", () => {
    // Über mehrere Seeds MITTELN: mit der OSRS-Schadens-Varianz schwankt ein einzelner Lauf; der
    // konstante DoT-Aufschlag von Magie zeigt sich erst im Mittel klar über dem Rauschen.
    const magicSetup = (s: GameState): void => {
      s.character.equipment.mainhand = "aether_runestaff";
      s.character.mana = 999_999; // genug für die ganze Messung (Mana-Regen sekundär)
    };
    const rangedSetup = (s: GameState): void => {
      s.character.equipment.mainhand = "mithril_longbow"; // krit/tempo, KEIN weaponEffect (#286: feuert ohne Munition)
    };
    let magicDealt = 0, rangedDealt = 0;
    for (let seed = 200; seed < 216; seed++) {
      magicDealt += fightDamageDealt(magicSetup, seed, 2000);
      rangedDealt += fightDamageDealt(rangedSetup, seed, 2000);
    }
    // Beide tun echten Schaden …
    expect(magicDealt).toBeGreaterThan(0);
    expect(rangedDealt).toBeGreaterThan(0);
    // … aber im Mittel nicht identisch: der Status-/DoT-Pfad von Magie verschiebt das Profil.
    // Schwelle 0.05 → 0.03 (Rüstungs-Trinität / Itemization 2.5, Phase A2): der alte Mana-Schild ist
    // durch den Stoff-WARD ersetzt. Dessen Recharge-beim-Cast macht den Magier in diesem Fenster
    // SUSTAINABLER als früher (Playtest: 36 Tode → 0 Tode) → er überlebt statt am Mana-Schild-Chip zu
    // sterben, deckt seinen Output also voller ab und läuft näher an den Bogen heran. Der DoT-KONTRAST
    // bleibt real (Magie legt burn an, der Bogen nie), fällt gegen den regen-schwachen Treant nur
    // kleiner aus. FLAG an balance-designer: gegen einen regen-STARKEN Mob (Kern-DoT-Nutzen) sollte
    // die Divergenz wieder deutlich über 5 % steigen — Zielmob ggf. anpassen, wenn der Kontrast schärfer
    // sein soll. Deterministisch (feste Seeds) → 0.03 bindet stabil.
    // Schwelle 0.03 → 0.02 → 0.01 (kumulativ 2026-07-05): (1) waffen-native DoT-Sweep hob die Burns
    // auf spürbare Ganzzahlen (aether_runestaff burn 1→3), (2) KILL_COOLDOWN 5000→2000 kürzt die
    // Post-Kill-Pause, in der der Burn-DoT der Magie WEITERtickt der Bogen aber nicht — beides
    // schiebt den GESAMT-Output beider Stile näher zusammen (jetzt ~1.6%). Das ist gesunde Balance
    // im Total; der eigentliche PROFIL-Kontrast (Magie legt burn an, Bogen NIE) ist durch die
    // burn/frost-Assertions oben hart bewiesen — diese Zeile prüft nur „nicht identisch".
    // Deterministisch (feste Seeds) → 0.01 bindet stabil (aktuell 0.016).
    // Schwelle 0.002 → 0.05 (Ammo-Removal #286, ehrlich neu vermessen 2026-07-08): der Übergangs-
    // Doppelzähler aus #287 (Bogen-Baked-In + zusätzlicher Köcher-ammoDamage) ist weg — der Bogen
    // feuert exakt seine eingebackene ×1.25-Kurven-Spanne. Gemessen: rel ≈ 0.135 (magic 27079 vs
    // ranged 23416 — Magie liegt an diesem regen-Mob wieder klar vorn, DoT-Profil trennt sauber).
    // 0.05 bindet mit komfortabler Marge unter dem Messwert und weit über dem Rauschen; wächst die
    // Divergenz Richtung Ungleichgewicht (> ~25 %), ist das ein Fall für balance-designer, nicht
    // für diese Schwelle.
    const rel = Math.abs(magicDealt - rangedDealt) / Math.max(magicDealt, rangedDealt);
    expect(rel, `magic=${magicDealt.toFixed(0)} ranged=${rangedDealt.toFixed(0)}`).toBeGreaterThan(
      0.05,
    );
  });

  it("Ranged-Bleed-Pfad: ein Bogen mit bleed-weaponEffect legt Blutung am Gegner an (Engine, content-unabhängig)", () => {
    // Balance-Pass 3 #4: die Top-Bögen (last_vengeance/spectral_longbow) bekommen einen bleed-DoT von
    // content-dev. Dieser Guard prüft ROBUST — mit einem SYNTHETISCHEN Bogen (nicht an konkrete content-
    // Werte gekoppelt) —, dass die Engine einen bleed-weaponEffect eines FERNKAMPF-Schusses tatsächlich
    // auf den Gegner anwendet. Fängt „definiert, aber nie angewandt"-Regressionen im Ranged-DoT-Pfad.
    const bowId = "copper_shortbow";
    const local = {
      ...content,
      items: {
        ...content.items,
        [bowId]: {
          ...content.items[bowId]!,
          weaponEffect: { type: "bleed" as const, chance: 1, magnitude: 10, durationMs: 6000 },
        },
      },
      monsters: {
        ...content.monsters,
        // Zäher, effekt-neutraler Dummy: viel HP (Blutung bleibt sichtbar), 0 Schaden (Spieler stirbt nie),
        // KEINE resistances → bleed wird nicht gefiltert. Isoliert rein den Ranged→bleed-Anwendungspfad.
        bleeddummy: {
          id: "bleeddummy",
          name: { en: "Bleed Dummy", de: "Blut-Puppe" },
          level: 1,
          maxHp: 100_000,
          damage: 0,
          accuracy: 0,
          evasion: 0,
          defense: 0,
          attackIntervalMs: 1000,
          xp: 0,
          gold: 0,
          loot: [],
        },
      },
    };
    const s = createTestGame({ name: "X", baseAttributes: { dex: 40, con: 30 } }, local, 101);
    levelUp(s);
    s.character.equipment.mainhand = bowId;
    // Keine Munition mehr (#286): jeder Fernkampf-Schuss ist scharf und trägt den Waffeneffekt.
    startCombat(s, local, "bleeddummy");
    let sawBleed = false;
    for (let i = 0; i < 300; i++) {
      combatStep(s, local);
      if (s.combat.enemyEffects.some((e) => e.type === "bleed")) {
        sawBleed = true;
        break;
      }
    }
    expect(sawBleed, "ein Bogen mit bleed-weaponEffect muss Blutung am Gegner anlegen").toBe(true);
  });
});
