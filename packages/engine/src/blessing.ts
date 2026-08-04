import type { Blessing, BlessingEffectKind, BlessingId } from "@hearthforge/shared";
import { CAMP_BLESSING_BOOST_CAP } from "@hearthforge/shared";

/**
 * Blessings of the Reach (Welt-Segen, 2026-07-21): sieben milde, rein additive Weltboni, einer je
 * Wochentag. Reine Kalendertag-Ableitung — KEIN Save-State, KEINE Migration (siehe shared/index.ts
 * Kommentar-Block über den Typen). Die Definitionen sind FEST (kein Content, keine Balance-Achse) —
 * eine spätere Umgewichtung ist ein reiner Zahlen-Edit hier, keine Struktur-/Save-Änderung.
 */
export const BLESSINGS: Record<BlessingId, Blessing> = {
  // bloodmoon (Task #337, Chef-Design): `mult` ist hier eine CHANCE (0.15 = 15 %), KEIN
  // Multiplikator — EIN Wurf pro Kill, bei Erfolg wird der GESAMTE Kill-Loot verdoppelt
  // (combat.ts Kill-Pfad, gelesen über `blessingChance`, nicht `blessingMult`).
  bloodmoon: { id: "bloodmoon", kind: "doubleLootChance", mult: 0.15 },
  ashenstorm: { id: "ashenstorm", kind: "gather", mult: 1.15 },
  silence: { id: "silence", kind: "craftSpeed", mult: 1.10 },
  rotmist: { id: "rotmist", kind: "rareDrop", mult: 1.10 },
  mistvigil: { id: "mistvigil", kind: "xp", mult: 1.10 },
  greed: { id: "greed", kind: "gold", mult: 1.20 },
  wildhunt: { id: "wildhunt", kind: "attackSpeed", mult: 1.10 },
};

/**
 * Wochentag → aktiver Segen. `Date#getDay()`-Nummerierung: 0=So, 1=Mo, …, 6=Sa.
 * LOKALE Zeitzone (Chef-Korrektur 2026-07-21: „bei mir ist Samstag" — nicht UTC/`getUTCDay()`).
 */
const WEEKDAY_BLESSING: Record<number, BlessingId> = {
  0: "rotmist", // Sonntag
  1: "mistvigil", // Montag
  2: "ashenstorm", // Dienstag
  3: "silence", // Mittwoch
  4: "greed", // Donnerstag
  5: "wildhunt", // Freitag
  6: "bloodmoon", // Samstag
};

/**
 * Der an diesem Zeitpunkt aktive Segen — bestimmt über den LOKALEN Wochentag (`new Date(nowMs)
 * .getDay()`), NICHT UTC: der Buff soll zur lokalen Mitternacht des Spielers wechseln (Chef-Vorgabe
 * „bei mir ist Samstag → Blood Moon", nicht irgendwo auf der Welt). Reine Funktion, kein GameState
 * nötig — der Renderer ruft `blessingForTime(Date.now())` direkt.
 *
 * Determinismus/offline==online: die Engine ruft diese Funktion NIE mit `Date.now()` intern auf
 * (das wäre I/O in deterministischer Logik) — Aufrufer (tick.ts/combat.ts) erhalten `nowMs` als
 * expliziten, optionalen Parameter, der von advance()/step() aus einem einzigen pro Tick
 * fortgeschriebenen Zeitstempel abgeleitet wird (siehe tick.ts `advance`). Auf demselben Gerät ist
 * die lokale Zeitzone zwischen Live-Loop und Offline-Catch-up identisch, also bleibt das Ergebnis
 * bit-identisch, ob eine Zeitspanne live tickt oder als Offline-Sprung nachgeholt wird.
 */
/**
 * Tages-Cache (Perf-Fix 2026-07-22, Chef-Report „Laden dauert ewig"): `new Date(nowMs)` mit lokaler
 * Zeitzonen-Auflösung ist teuer, und die Offline-Aufholung ruft blessingForTime/blessingMult MEHRFACH
 * PRO TICK — bei 8 h Offline (288 000 Ticks) summierte sich das auf ~14,5 s Ladezeit (gemessen am
 * echten Save; ohne Offline-Fenster 30 ms). Der Cache merkt sich die lokalen Tagesgrenzen des zuletzt
 * aufgelösten Zeitpunkts und beantwortet alle Aufrufe innerhalb desselben lokalen Tages ohne Date-
 * Konstruktion. Ergebnis bleibt eine reine Funktion von `nowMs` (identischer Rückgabewert, nur
 * memoisiert) — Determinismus/offline==online unberührt; DST-Kanten korrekt, weil die Grenzen über
 * den lokalen Date-Konstruktor bestimmt werden.
 */
let cachedDayStartMs = Number.POSITIVE_INFINITY;
let cachedDayEndMs = Number.NEGATIVE_INFINITY;
let cachedBlessing: Blessing | null = null;

export function blessingForTime(nowMs: number): Blessing {
  if (cachedBlessing !== null && nowMs >= cachedDayStartMs && nowMs < cachedDayEndMs) {
    return cachedBlessing;
  }
  const d = new Date(nowMs);
  cachedDayStartMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  cachedDayEndMs = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  cachedBlessing = BLESSINGS[WEEKDAY_BLESSING[d.getDay()]!]!;
  return cachedBlessing;
}

/**
 * Effektiver Multiplikator einer Segens-Art an einem Zeitpunkt. Liefert 1 (neutral), wenn KEIN
 * Zeitpunkt übergeben wurde (`nowMs === undefined` — der Default-Fall für alle bestehenden
 * Aufrufer/Tests/Sim-Läufe, die keinen Wall-Clock-Anker kennen: bit-identisch zum Vorher-Zustand,
 * KEIN zusätzlicher RNG-Draw) oder wenn ein ANDERER Segen aktiv ist als `kind`.
 */
export function blessingMult(nowMs: number | undefined, kind: BlessingEffectKind): number {
  if (nowMs === undefined) return 1;
  const active = blessingForTime(nowMs);
  return active.kind === kind ? active.mult : 1;
}

/**
 * Schrein-Verstärkung (Das Lager, Task #359 — balance.md §6: Bonus-Anteil × (1 + 0.10 × Stufe)):
 * hebt den BONUS-Anteil eines Segens-Multiplikators an (1.15 → 1.195 bei Anteil 0.30). Neutral
 * (Faktor unverändert) bei Anteil ≤ 0 oder Basis 1 (kein Segen dieser Art aktiv) — Alt-Pfade
 * bleiben bit-identisch. Reine Arithmetik, kein RNG. Aufrufer: die Skilling-Callsites in tick.ts
 * (xp/gold/rareDrop/gather/craftSpeed) UND seit Chef-Entscheid 2026-08-03 auch die Kampf-BEUTE-
 * Callsites in combat.ts (Kill-/Dungeon-XP, Kill-/Clear-Gold, Rare-Drop-Chance) — die frühere
 * #359-Sperrzonen-Auslassung („Kampf bleibt auf dem Basis-Wert") ist damit aufgehoben. wildhunt
 * (§attackSpeed) bleibt weiterhin KOMPLETT ausgenommen (Kampf-Tempo = Kampfwert, Eiserne Regel 3 /
 * Chef-Entscheid K2; Ersatz: Elite-Spawn-Frequenz in elites.ts).
 */
export function shrineAmplifiedMult(base: number, shrineBonus: number): number {
  if (shrineBonus <= 0 || base === 1) return base;
  return 1 + (base - 1) * (1 + shrineBonus);
}

/**
 * Schrein-Verstärkung der CHANCE-Segen (bloodmoon, Task #359): modulweiter, PRO TICK aus dem
 * State gesetzter Verstärkungs-Anteil. WARUM Injektion statt Parameter: der einzige
 * `blessingChance`-Konsument ist der Kill-Pfad in combat.ts (Sperrzone dieses Tasks — wird nicht
 * angefasst); tick.ts `step()` setzt den Anteil deterministisch aus (state, content) am
 * Tick-Anfang, BEVOR combatStep läuft — das Ergebnis bleibt damit eine reine Funktion des
 * getickten States (offline==online, kein I/O, kein RNG). Default/Reset ist 0 (neutral):
 * Direkt-Aufrufer ohne Tick-Kontext (UI/Tests) sehen die Basis-Chance. Klemme wie überall
 * CAMP_BLESSING_BOOST_CAP; die verstärkte Chance kappt bei 1 (Garantie bleibt Garantie).
 */
let shrineChanceBonus = 0;

export function setShrineChanceBonus(bonus: number): void {
  shrineChanceBonus =
    Number.isFinite(bonus) ? Math.max(0, Math.min(CAMP_BLESSING_BOOST_CAP, bonus)) : 0;
}

/**
 * Effektive CHANCE einer Chance-Segens-Art (aktuell nur `doubleLootChance`) an einem Zeitpunkt.
 * Gegenstück zu `blessingMult` mit Chance-Semantik: neutral ist 0 (kein Wurf), nicht 1 —
 * ohne `nowMs` (Alt-Aufrufer/Tests/Sim-Läufe) bzw. wenn ein ANDERER Segen aktiv ist, liefert sie 0,
 * und die Konsumenten (combat.ts) ziehen dann KEINEN RNG (Muster tryPetDrop/petDoubleLootChance) —
 * bit-identisch zum Vorher-Zustand. Der Schrein der Stillen verstärkt die Chance multiplikativ
 * (s. `setShrineChanceBonus`; 0.15 → 0.195 bei Stufe III) — die 0-Neutralität (kein zusätzlicher
 * RNG-Zug ohne aktiven Segen) bleibt strukturell erhalten.
 */
export function blessingChance(nowMs: number | undefined, kind: BlessingEffectKind): number {
  if (nowMs === undefined) return 0;
  const active = blessingForTime(nowMs);
  if (active.kind !== kind) return 0;
  return Math.min(1, active.mult * (1 + shrineChanceBonus));
}
