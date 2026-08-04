/**
 * Simulations-Harness: spielt das Spiel rein in der Engine durch (ohne UI/Electron),
 * um Balance & Korrektheit zu prüfen. Wird von sim.test.ts ausgeführt/geloggt.
 */
import { content } from "@hearthforge/content";
import type { AttributeId, ContentDB } from "@hearthforge/shared";
import { COMBAT_SKILL_IDS } from "@hearthforge/shared";
import { createGame } from "./state";
import { grantAllZones } from "./test-helpers";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { startCombat } from "./combat";
import { levelFromXp, xpForLevel } from "./leveling";
import { addItem, expandBaseCapacity, itemCount } from "./inventory";
import { equipItem } from "./equipment";

const HOUR = 3_600_000;
// Sim-Fenster für den vollen runReport. Bei TICK_MS=100 × HOUR × allen Monstern × 2 Helden lief der
// Report nach dem Endgame-Ausbau >5 Min (faktisch unbrauchbar). Kürzere Fenster reichen für Wall-
// Erkennung + Raten-Hochrechnung (xp/gold werden ohnehin auf 1h normiert) und machen ihn ~20× schneller.
const REPORT_ACTION_MS = 120_000; // 2 min — reicht für Raten-Überblick (~900 Aktionen → sonst zu langsam)
const REPORT_COMBAT_MS = 180_000; // 3 min — genug Kill-Versuche auch für zähes Endgame

function bigInventoryGame(baseAttributes?: Partial<Record<AttributeId, number>>, seed = 1) {
  const s = createGame({ name: "Sim", baseAttributes }, content, seed);
  expandBaseCapacity(s.inventory, content, 4000); // Overflow für die Simulation vermeiden
  return s;
}

/**
 * Sim-Content-Sicht für `simulateCombat` (Welle P, 2026-07-13): identisch zum Live-Content, nur
 * ist das `dungeonOnly`-ZUGANGS-Gate je Monster neutralisiert (Klon mit Flag aus; alle übrigen
 * Felder/Referenzen bleiben dieselben Objekte). Damit bleiben die Dungeon-Wellen-Monster
 * (Warband-Bosse L50-60, Idol-Halle, …) auf der Balance-Karte des Reports messbar — die Sim misst
 * BALANCE, nicht Zugangs-Gates (dasselbe dokumentierte Muster wie grantAllZones fürs Story-Gate
 * und das slayerRequirement-Item unten; Präzedenz für den Flag-losen Content-Klon:
 * stalemate-ward.test.ts). `dungeonOnly` ist ein reines Einstiegs-Gate — im Kampf selbst liest es
 * niemand (nur startCombat combat.ts:296, Slayer-Welt-Pool & UI-Filter), das Kampfverhalten der
 * geklonten Defs ist bit-identisch. Der PRODUKTIONS-Guard bleibt hart: startCombat selbst bekommt
 * KEINEN Bypass, und außerhalb der Sim sieht niemand diese Sicht (nicht exportiert). Das Gating
 * selbst testen dungeon.test.ts (Guard) + sim-dungeononly.test.ts (Guard + Messbarkeit).
 */
const simCombatContent: ContentDB = {
  ...content,
  monsters: Object.fromEntries(
    Object.entries(content.monsters).map(([id, m]) => [id, m.dungeonOnly ? { ...m, dungeonOnly: false } : m]),
  ),
};

export interface ActionSim {
  action: string;
  skill: string;
  level: number;
  xpPerHour: number;
  /** Netto-Gold/h, wenn alles verkauft wird: direktes Gold (Thieving) + Verkaufswert der
   *  Netto-Erträge − Verkaufswert verbrauchter Inputs (Verarbeitungs-Marge). */
  goldPerHour: number;
  outputs: Record<string, number>;
  stalled: boolean;
}

/** Simuliert eine Aktion (Sammeln/Verarbeitung) über `gameMs` Spielzeit. */
export function simulateAction(actionId: string, gameMs = HOUR, seed = 1): ActionSim {
  const a = content.actions[actionId];
  const s = bigInventoryGame(undefined, seed);
  // Gegatete Aktionen: Skill auf das nötige Level setzen, damit die Aktion läuft.
  if (a && a.levelRequired && a.levelRequired > 1) {
    s.skills[a.skill] = { xp: xpForLevel(a.levelRequired) };
  }
  // Enchant-Rezepte verbrauchen je 1× NICHT-stapelbares Basis-Gear: RC `rune_enchanting`
  // wird per Input-Stapelbarkeit behandelt (nicht per Kategorie-Whitelist) → die Rune-Enchant-
  // Verzauberungen stallen im Sim nicht fälschlich.
  const isEnchantRecipe = a?.category === "rune_enchanting";
  if (a?.inputs)
    for (const inp of a.inputs) {
      // Nicht-stapelbare Inputs (Waffen/Ausrüstung, z.B. das Basis-Gear von rune_enchanting)
      // belegen je 1 Slot — 1 Mio. davon sprengen das Inventar und
      // blockieren den Output → Aktion stallt fälschlich. Daher nur moderat befüllen.
      // Stapelbare Inputs (Erze, Barren, Essenzen, Runen, Sigille, Pfeile) dürfen großzügig sein.
      const stackable = !isEnchantRecipe
        ? (content.items[inp.itemId]?.stackable ?? true)
        : (content.items[inp.itemId]?.stackable ?? false);
      addItem(s.inventory, content, inp.itemId, stackable ? 1_000_000 : 100);
    }
  const before: Record<string, number> = {};
  for (const slot of s.inventory.slots) if (slot) before[slot.itemId] = (before[slot.itemId] ?? 0) + slot.qty;
  const xpBefore = s.skills[a?.skill ?? ""]?.xp ?? 0;
  const goldBefore = s.character.gold;

  setActiveAction(s, content, actionId);
  advance(s, content, gameMs);

  const after: Record<string, number> = {};
  for (const slot of s.inventory.slots) if (slot) after[slot.itemId] = (after[slot.itemId] ?? 0) + slot.qty;

  const outputs: Record<string, number> = {};
  // Netto-Verkaufswert-Differenz über ALLE Items (Erträge + verbrauchte Inputs).
  let valueDelta = 0;
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const delta = (after[id] ?? 0) - (before[id] ?? 0);
    if (delta > 0) outputs[id] = delta;
    valueDelta += delta * (content.items[id]?.value ?? 0);
  }
  const goldDelta = s.character.gold - goldBefore;
  const xpNow = s.skills[a?.skill ?? ""]?.xp ?? 0;
  return {
    action: actionId,
    skill: a?.skill ?? "?",
    level: levelFromXp(xpNow),
    xpPerHour: Math.round(((xpNow - xpBefore) / gameMs) * HOUR),
    goldPerHour: Math.round(((goldDelta + valueDelta) / gameMs) * HOUR),
    outputs,
    stalled: s.activeActionId === null, // verarbeitung ohne Material gestoppt
  };
}

export interface CombatSim {
  monster: string;
  level: number;
  kills: number;
  secPerKill: number | null;
  deaths: number;
  goldPerHour: number;
}

/** Simuliert Dauer-Kampf gegen ein Monster über `gameMs`. */
export function simulateCombat(
  monsterId: string,
  gameMs = HOUR,
  opts?: {
    baseAttributes?: Partial<Record<AttributeId, number>>;
    equip?: string[];
    food?: string;
    /** Setzt alle Kampf-Fertigkeiten auf dieses Level (für den „geared"-Helden). */
    combatLevel?: number;
  },
): CombatSim {
  // Welle P: die ganze Kampf-Simulation läuft über die gate-neutralisierte Sim-Content-Sicht
  // (s. simCombatContent oben) — dungeonOnly-Monster (Warband-Bosse & Co.) bleiben messbar,
  // ohne dass der startCombat-Produktions-Guard angefasst wird. Für alle übrigen Monster ist die
  // Sicht referenz-identisch zum Live-Content (No-op).
  const c = simCombatContent;
  const m = c.monsters[monsterId];
  const s = bigInventoryGame(opts?.baseAttributes, 5);
  // Story-Zonen-Gates (Welle D2, ZoneDef.requiresQuest): der Sim-Report misst BALANCE, nicht
  // Zugangs-Gates (gleiche Logik wie der slayerRequirement-Bypass unten) — alle Zonen freischalten,
  // sonst zählt jeder quest-gegatete Mob fälschlich als 36-Tode-„WALL". Gates testet zone-gating.test.ts.
  grantAllZones(s, c);
  if (opts?.combatLevel && opts.combatLevel > 1) {
    for (const id of COMBAT_SKILL_IDS) s.skills[id] = { xp: xpForLevel(opts.combatLevel) };
  }
  if (opts?.equip) {
    for (const id of opts.equip) {
      addItem(s.inventory, c, id, 1);
      equipItem(s, c, id);
    }
  }
  if (opts?.food) {
    addItem(s.inventory, c, opts.food, 1_000_000);
    s.character.food = opts.food;
  }
  // Slayer-gegatete Mobs verlangen ein Anforderungs-Item (z.B. plague_mask) im Inventar/Equip/Bank,
  // sonst blockiert canFightMonster/slayerRequirementMet den Kampf → der Sim meldet einen falschen
  // „WALL". Für die Balance-Simulation legen wir das Item ins Inventar, damit der Mob normal läuft.
  const slayerReq = m?.slayerRequirement;
  if (slayerReq) addItem(s.inventory, c, slayerReq, 1);
  // Slayer-Turm-Monster (slayerFloor) verlangen seit dem engine-seitigen Etagen-Gate (Sweep6 W2-T4)
  // auch ein ausreichendes SLAYER-Level — sonst verweigert canFightMonster den Start und der 5s-Chunk
  // zählt fälschlich als „Tod". createGame setzt Slayer auf 1; ein Endgame-Held HAT Turm-Zugang.
  // Analog zum combatLevel: Slayer aufs Kampf-Level heben — MINDESTENS aber auf die Etagen-
  // Anforderung (Welle-3-Befund: Bronze-Held CL12 vs. Etage-2-Mobs [Slayer 20 nötig] wurde vom
  // Gate geblockt und zählte fälschlich als „36-Tode-Stat-Wall" — der Sim-Report misst BALANCE,
  // nicht Zugangs-Gates; die Gates testet canFightMonster-Guard separat).
  if (m?.slayerFloor != null && opts?.combatLevel && opts.combatLevel > 1) {
    const floorReq = c.slayerTower?.find((f) => f.floor === m.slayerFloor)?.slayerLevelRequired ?? 1;
    s.skills["slayer"] = { xp: xpForLevel(Math.max(opts.combatLevel, floorReq)) };
  }

  const startGold = s.character.gold;

  let totalKills = 0;
  let deaths = 0;
  let elapsed = 0;
  const chunk = 5_000;
  startCombat(s, c, monsterId);
  while (elapsed < gameMs) {
    advance(s, c, chunk);
    elapsed += chunk;
    if (s.combat.monsterId === null) {
      totalKills += s.combat.kills;
      deaths++;
      startCombat(s, c, monsterId);
    }
  }
  totalKills += s.combat.kills;

  return {
    monster: monsterId,
    level: m?.level ?? 0,
    kills: totalKills,
    secPerKill: totalKills > 0 ? Math.round((gameMs / 1000 / totalKills) * 10) / 10 : null,
    deaths,
    goldPerHour: Math.round(((s.character.gold - startGold) / gameMs) * HOUR),
  };
}

/** Gut ausgerüsteter Endgame-Held (Kampf-Skills L90 + Götzeneisen-Set). Repräsentiert einen Spieler,
 *  der für Endgame-Content gerüstet ist — was DIESER Held nicht besiegt, ist ein echter Balance-Wall. */
export const GEARED_HERO = {
  // Itemization 2.0 §1: Seeds zählen 1:1 (ganzzahlige Skala) → alte Rohpunkte halbiert (10→5),
  // damit der Held dieselbe Attribut-Größenordnung behält wie vor dem Revert.
  baseAttributes: { str: 5, con: 5 } as Partial<Record<AttributeId, number>>,
  equip: ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"],
  food: "cooked_voidray",
  combatLevel: 99,
};

/** Voller Balance-Report über alle Aktionen & Monster (Bronze-Baseline + geared Endgame-Held). */
export function runReport(): { actions: ActionSim[]; combat: CombatSim[]; combatGeared: CombatSim[] } {
  const actions = Object.keys(content.actions).map((id) => simulateAction(id, REPORT_ACTION_MS));
  // Bronze-Baseline-Held (Frühgame-Zugänglichkeit).
  const combat = Object.keys(content.monsters).map((id) =>
    simulateCombat(id, REPORT_COMBAT_MS, {
      // §1-Revert: alte Rohpunkte (5) halbiert → 2 (floor; Basis-Anhebung 2.5→3 gleicht den Rest aus).
      baseAttributes: { str: 2, con: 2 },
      // Rüstungs-Trinität (Gate-B Hebel 3): leather_body/wooden_shield sind ungegatete Flavor-Items
      // OHNE Rüstungs-Schicht (0 armorRating) → der Baseline-Held war effektiv „unarmored" und meldete
      // 3 falsche Walls. Echte Bronze-Platte gibt dem Frühgame-Held seine Mitigation-Schicht.
      equip: ["bronze_sword", "bronze_platebody", "bronze_platelegs", "bronze_fullhelm", "bronze_kiteshield"],
      combatLevel: 12,
      food: "cooked_trout",
    }),
  );
  // Geared Endgame-Held (echte Balance-Validierung über alle Level).
  const combatGeared = Object.keys(content.monsters).map((id) => simulateCombat(id, REPORT_COMBAT_MS, GEARED_HERO));
  return { actions, combat, combatGeared };
}

/**
 * Grenze des Skill-Bands (monster-threat-spec §2, 2026-07-09): Monster L<100 MUSS der Plain-Plate-
 * GEARED_HERO immer besiegen — dort ist jede Wall ein P1-Befund. Ab L100 beginnt das Gear-Band:
 * Threat-Werte sind bewusst so gesetzt, dass NUR ein vorbereiteter Spieler (Block-Tank + Runen +
 * Buffs + Auto-Eat, Spec §8) besteht — der spartanische Report-Held scheitert dort BY DESIGN.
 * Maßgeblicher Guard fürs Gear-Band: Referenz-Tank-Probe (Spec §8) + balance-envelope.test.ts §5.
 */
export const GEAR_BAND_START = 100;

/**
 * Echte Balance-Walls, nach Band getrennt: `skillBand` (L<100) ist ein harter P1-Befund (überzogen
 * tanky/regen, unschaffbar für JEDEN — sim.test.ts asserted leer); `gearBand` (L≥100) ist nur die
 * ehrliche Info, dass der Plain-Plate-Held dort nicht reicht (gewollt, s. GEAR_BAND_START-Doku).
 */
export function findGearedWalls(combatGeared: CombatSim[]): { skillBand: string[]; gearBand: string[] } {
  const skillBand: string[] = [];
  const gearBand: string[] = [];
  for (const c of combatGeared) {
    if (c.kills !== 0) continue;
    const msg = `Monster ${c.monster} (Lv${c.level}): der Plain-Plate-Held (Kampf L99, Götzeneisen, ohne Runen/Buffs) besiegt es nicht (${c.deaths} Tode)`;
    (c.level < GEAR_BAND_START ? skillBand : gearBand).push(msg);
  }
  return { skillBand, gearBand };
}

/**
 * Deskriptive HP-Fit-Kurve des Skill-Bands (monster-threat-spec §4: OLS über alle Trash/Elite-
 * Monster L5–99, gefittet auf `ln(maxHp)` — Ward listet die Spec SEPARAT, z. B. „icemage L80:
 * 161+48 HP"): `ln(hp) = 2.617 + 0.0249·L`. Referenz der „zu tanky"-Heuristik unten.
 */
const hpFit = (level: number): number => Math.exp(2.617 + 0.0249 * level);
/**
 * „Zu tanky"-Flag-Schwelle für normale Mobs: maxHp > 1,7× Fit. Kalibriert an der echten
 * Verteilung (Ratio-Sweep 2026-07-26, #356): die gesunden Band-Tops liegen bei 1,60–1,61×
 * (skeleton_butcher L75 1,60; skeleton_icemage L80 1,61 — von der threat-spec ausdrücklich als
 * „reales Top des gesunden Bandes" gesegnet), die beiden dokumentierten ECHTEN Ausreißer der
 * bronze-baseline-analyse lagen VOR Welle A bei 1,72 (pitch_beetle) und 1,79 (goblin_warlock,
 * hp-only) — 1,7 sitzt exakt in der Trennlücke und hätte beide gefangen. (Der §9-Option-B-
 * Beispielwert 1,6 auf hp+ward flaggte Ward-Caster systematisch falsch: Ward ist ein eigener
 * Mechanik-Baustein mit ~+30 % Budget per Design [ENEMY_WARD_HP_FRACTION] bzw. bewusst extrem
 * beim Ward-Showcase hollow_choir [hp 90 = 0,90× Fit, ward 220] — HP-Tankiness misst man auf
 * der Achse, auf der die Kurve gefittet wurde.)
 */
const TANKY_FIT_MULT = 1.7;
/**
 * Flag-Schwelle für Boss-/Apex-Mobs: die Boss-Norm liegt bei 2,4–3,4× Fit (bronze-baseline-
 * analyse §3; ash_tyrant 2,67× und bull_boss 3,37× = gesund) — auffällig erst DARÜBER.
 * De-facto-Boss-Marker im Content ist `enrage` (Welle T gab benannten Bossen genau dieses
 * Boss-Verhalten; MonsterDef hat kein eigenes Boss-Flag).
 */
const TANKY_FIT_MULT_BOSS = 3.4;
/**
 * Dungeon-Wellen-Klone (`dungeonOnly`) tragen den dokumentierten Wellen-Aufschlag ×1,5 hp
 * (Elite-Wellen; Boss-Wellen ×2,2 tragen zusätzlich `enrage` und laufen ohnehin über die
 * Boss-Schwelle) — für sie hebt sich die Non-Boss-Schwelle entsprechend.
 */
const TANKY_DUNGEON_WAVE_MULT = 1.5;

/**
 * „Zu tanky"-Klassifikation EINER Bronze-Baseline-Zelle (Option B aus bronze-baseline-analyse §9,
 * 2026-07-26 #356): Auffällig ist NICHT, was der CL12-Bronze-Held nicht töten kann — das ist die
 * gewollte Undergeared-Wall —, sondern ein maxHp-Budget DEUTLICH über der Band-Fit-Kurve.
 * Der alte Anker (`maxBeatableLevel` des Bronze-Helden) verglich zwei nie zusammengeführte
 * Stat-Populationen (Tower-Mini-HP 0,55–0,83× Fit vs. Openworld 1,05–2,35×): solange die
 * Unter-Kurve-Turm-Mobs Bronze-killbar waren, wurde JEDER gesunde Openworld-Mob darüber
 * zwangsläufig geflaggt — die „Dauer-9" der Sweep-Berichte. Gilt nur im Skill-Band (L<100,
 * Fit-Domäne); Regen-Mobs sind bewusste DPS-Checks (s. findExpectedUnbeatable).
 */
function tankyIssue(c: CombatSim): string | null {
  if (c.kills !== 0 || c.level >= GEAR_BAND_START) return null;
  const m = content.monsters[c.monster];
  if (!m || (m.regen ?? 0) > 0) return null;
  let mult = m.enrage ? TANKY_FIT_MULT_BOSS : TANKY_FIT_MULT;
  if (m.dungeonOnly && !m.enrage) mult = TANKY_FIT_MULT * TANKY_DUNGEON_WAVE_MULT;
  const ratio = m.maxHp / hpFit(c.level);
  if (ratio <= mult) return null;
  return `Monster ${c.monster} (Lv${c.level}): maxHp ${m.maxHp} = ${ratio.toFixed(2)}× der Band-HP-Fit-Kurve (Fit ${Math.round(hpFit(c.level))}, Schwelle ${mult.toFixed(2)}×${m.enrage ? " Boss-Norm" : m.dungeonOnly ? " Dungeon-Welle" : ""}) und für den Bronze-Baseline-Helden unbesiegbar (${c.deaths} Tode) — zu tanky für sein Level`;
}

/** Findet auffällige Balance-/Logikprobleme (für die autonome Analyse). */
export function findIssues(report: { actions: ActionSim[]; combat: CombatSim[] }): string[] {
  const issues: string[] = [];
  for (const a of report.actions) {
    if (a.xpPerHour <= 0) issues.push(`Aktion ${a.action}: 0 XP/h (kein Ertrag?)`);
    if (Object.keys(a.outputs).length === 0 && !a.stalled)
      issues.push(`Aktion ${a.action}: keine Ausgabe-Items`);
  }
  for (const c of report.combat) {
    const tanky = tankyIssue(c);
    if (tanky) issues.push(tanky);
    if (c.level >= 25 && c.secPerKill !== null && c.secPerKill < 1.5)
      issues.push(`Monster ${c.monster} (Lv${c.level}): zu leicht (${c.secPerKill}s/Kill)`);
  }
  return issues;
}

/**
 * Mobs, die der Baseline-Held nicht besiegt, deren Unbesiegbarkeit aber ERWARTBAR ist (kein Bug):
 * exakt das Komplement zu `tankyIssue` (jede kills=0-Zelle landet in genau EINER der beiden
 * Listen) — ein bewusster DPS-Check via `regen`, das Gear-Band L≥100 (Plain-Bronze per Design
 * chancenlos) oder eine gesunde Undergeared-Wall auf/nahe der Band-HP-Kurve. Nur zur ehrlichen
 * Übersicht im Report.
 */
export function findExpectedUnbeatable(report: { combat: CombatSim[] }): string[] {
  return report.combat
    .filter((c) => c.kills === 0 && tankyIssue(c) === null)
    .map((c) => {
      const m = content.monsters[c.monster];
      const regen = m?.regen ?? 0;
      if (regen > 0)
        return `Monster ${c.monster} (Lv${c.level}): DPS-Check (regen ${regen}/s) — für untergerüsteten Baseline erwartbar`;
      if (c.level >= GEAR_BAND_START)
        return `Monster ${c.monster} (Lv${c.level}): Gear-Band (L≥${GEAR_BAND_START}) — für den Bronze-Baseline-Helden per Design außer Reichweite`;
      return `Monster ${c.monster} (Lv${c.level}): maxHp ${((m?.maxHp ?? 0) / hpFit(c.level)).toFixed(2)}× Fit — Undergeared-Wall per Design (auf Band-Kurve)`;
    });
}
