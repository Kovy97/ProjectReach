/**
 * SIM-Agent-Toolkit — RealisticPlayer: die ENTSCHEIDUNGS-Schicht auf dem SimPlayer.
 *
 * Ein „ehrlicher" Fake-Spieler: er bekommt NICHTS geschenkt (kein `give`, kein `setSkillLevel`),
 * sondern verdient sich alles über die echten Engine-Verben (Aktion starten, kämpfen, kaufen,
 * kochen, ausrüsten). Pro Entscheidungs-Fenster fährt er menschliche Heuristiken und protokolliert
 * jede Reibung als `FrictionEvent` (sim-report.ts) — DAS ist das realistische Spieler-Feedback für
 * die Sweep-Berichte.
 *
 * ── API (für Sweep-Agenten) ─────────────────────────────────────────────────────────────────
 *   const rp = new RealisticPlayer(content, { seed: 7, style: "ranged", name: "Robin" });
 *   const res = rp.playFor(4 * 60 * 60 * 1000);   // 4 Sim-Stunden spielen (aktiv + idle gemischt)
 *   res.kills / res.deaths / res.combatLevel / res.totalLevel / res.gold / res.snapshot
 *   res.frictions                                  // FrictionEvent[] (Reibungs-Momente)
 *   rp.frictionMarkdown()                          // fertiger Markdown-Block für den Bericht
 *   rp.player                                      // der rohe SimPlayer (Reader; im honest-Lauf
 *                                                  //   NICHT für give/setSkillLevel benutzen!)
 *   frictionsToFindings(res.frictions)             // Frictions → Finding[] (für Persona-Reports)
 *
 * ── MULTI-GOAL: mehrere Ziele in EINEM Lauf (pursue) ────────────────────────────────────────
 *   import { combatLevel, skillLevel, gold, formatMultiGoalMarkdown } from "./sim-goals";
 *   const mg = rp.pursue([combatLevel(25), skillLevel("fishing", 30), gold(10_000)],
 *                        { budgetMs: 12 * 60 * 60 * 1000 });
 *   mg.goals[i]  // { goal, description, achieved, progress (0..1, monoton), simTimeMs, blocked, note }
 *   formatMultiGoalMarkdown(mg)                    // ✅/◐ %/❌ je Ziel → direkt in den Bericht
 *
 *   Scheduler-Strategie (menschlich):
 *   - Pro Fenster wird EIN Fokus-Ziel gewählt: nah am Abschluss > im aktuellen Flow (Kampf-Ziel
 *     im Kampf-Flow, Skilling-Ziel im Skilling-Flow) + seeded Varianz.
 *   - Synergien laufen mit: Gold fällt beim Kampf ab, Quest-Claims füttern Gold-/Item-Ziele,
 *     Upkeep (Food/Munition/Gear) hat weiter Vorrang vor jedem Ziel.
 *   - [It2-Sched] Idle-Fairness über Aufmerksamkeits-ZEIT: jedes offene Ziel sammelt Zeit, in der
 *     sein Proxy sich wirklich bewegt (Kampf-Nacht zahlt auf Kampf- UND Gold-Ziel ein); wer unter
 *     der halben fairen Quote liegt, bekommt die nächste Idle-Strecke gewidmet — und die Strecke
 *     endet früh, sobald ihr Besitzer-Ziel erreicht ist („morgens den Level-Up sehen").
 *   - [It2-Sched] Zielgeraden-Sparen: Kontostand ≥ 60 % eines offenen Gold-Ziels ⇒ Luxus-Käufe
 *     (Shop-Gear, Nacht-Food-Puffer über den Basis-Vorrat) pausieren, bis das Ziel latcht;
 *     Überlebens-Käufe (Basis-Food, Munition) laufen normal weiter.
 *   - BLOCKADE-Rotation: bringt ein fokussiertes Ziel mehrfach keinerlei Fortschritt (oder ist
 *     strukturell unerreichbar), gibt es ein Friction-Event und die anderen Ziele laufen weiter —
 *     ein totes Ziel stoppt NIE den ganzen Lauf.
 *   - [Sweep6 T2-F1] Idle-Stall-Buchhaltung: auch eine einem Ziel GEWIDMETE Idle-Strecke ohne
 *     jeden Proxy-Fortschritt zählt als Rotation (Friction „stalled" beim ersten Mal, Wall nach
 *     GOAL_MAX_ROTATIONS) — vorher kannten nur die aktiven Fenster diese Buchhaltung und ein
 *     toter Idle-Task lief 30 h „fälschlich sauber" im Kreis (Seed 41: 32 162 Erz, 0 Kohle).
 *   - Ziele LATCHEN (einmal erreicht bleibt erreicht); progress ist die Hochwassermarke (monoton).
 *
 *   WICHTIG für Berichte: alle Zeitangaben (simTimeMs/totalSimMs) sind SPIELZEIT — die Sim läuft
 *   ~4.000–17.000× Echtzeit. Pacing IMMER über Spielzeit-Raten beurteilen, nie über Echtzeit-Gefühl.
 *
 * ── Heuristiken (was der RealisticPlayer „menschlich" tut) ──────────────────────────────────
 *   - Gear: zieht gedroppte/gekaufte/gecraftete Upgrades an (Score-Vergleich, stil-treu zur Persona).
 *   - Food: hält Auto-Eat-Food gesetzt; bei Ebbe nachkaufen (Shop) oder kochen (Skill + Material);
 *     vor langen Idle-Strecken wird der Food-Puffer proportional zur Idle-Länge aufgestockt.
 *   - Munition: GESTORBEN (#286 Ammo-Removal) — Bögen feuern ohne Pfeile (Schaden eingebacken,
 *     #287); die komplette Munitions-Heuristik (Köcher-Upkeep/Nachkauf/Fletch-Route) ist raus.
 *   - Gear-Craft [Sweep6 T4-#2]: bietet der Shop KEIN Mainhand-Upgrade mehr (Waffen-Decke), wird
 *     das beste craftbare, tragbare Waffen-Upgrade als Route verfolgt (Rezept fahren, fehlende
 *     Inputs sammeln oder erjagen) — Magie-Waffen sind ~100 % craft-/drop-gebunden (T4 Seed 63:
 *     40 h auf dem Shop-Starter-Stab, obwohl craft_blacksteel_staff längst frei war).
 *   - Tod beendet den Kampf (Engine: stopReason "defeated", KEIN Auto-Restart) → erst „besser
 *     vorbereiten" (Food/Gear/leichteres Ziel); wiederholter Tod am selben Ziel → Friction + Meiden.
 *     Die Meide-Liste läuft AB: nach spürbarem CL-/Gear-Zuwachs oder genug Sim-Zeit wird das Ziel
 *     erneut versucht („jetzt bin ich stärker — nochmal probieren").
 *   - Quests: jede fertige Quest wird EAGER eingelöst (Belohnung sofort, Ketten schalten frei).
 *   - Ökonomie [#279]: Monster droppen kein Roh-Gold mehr (MonsterDef.gold = 0 flächendeckend,
 *     Chef-Entscheid #272) — Gold entsteht NUR am Händler. Der Spieler verkauft deshalb in jedem
 *     aktiven Fenster seine Material-Überschüsse (`sellSurplusLoot`); Craft-Futter bis zur
 *     Hort-Schwelle bleibt liegen, Junk-Gear verkauft weiter der Druck-Pfad, Gold-Reserve für
 *     Food wird gehalten.
 *   - Zielwahl: bestes freigeschaltetes Monster/Aktion — mit SEEDED VARIANZ (nicht immer optimal).
 *   - Rhythmus: aktive Fenster + lange Idle-Strecken im Wechsel (wie echte Idle-Spieler).
 *
 * Vollständig deterministisch & headless: eigener seeded RNG (mulberry32, getrennt von der
 * Spiel-RNG), kein Date.now, kein I/O. Gleiche Seeds ⇒ bit-identische Läufe.
 */
import type {
  ActionDef,
  ActionId,
  AttributeId,
  BoostableCombatSkillId,
  ContentDB,
  EquipSlot,
  ItemDef,
  ItemId,
  ItemInstance,
  MonsterDef,
  MonsterId,
  QuestObjective,
  RngState,
  SkillId,
  WeaponStyle,
} from "@hearthforge/shared";
import { BOOSTABLE_COMBAT_SKILL_IDS, consumableHeal, effectiveWeaponEffects } from "@hearthforge/shared";
import { SKILL_BOOST_ATTR_EQUIV } from "./sim-consistency";
import { computeStats } from "./character";
import { createRng, nextFloat, nextInt } from "./rng";
import { SimPlayer } from "./sim-player";
import type { SimSnapshot } from "./sim-player";
import { FrictionCollector, formatFrictionMarkdown } from "./sim-report";
import type { Finding, FrictionEvent } from "./sim-report";
import { claimQuest, objectiveProgress, questStatus, questUnlocked } from "./quests";
import { canFightMonster } from "./slayer";
import { checkGoal, describeGoal, goalProxy, ownedItemCount } from "./sim-goals";
import type { GoalOutcome, MultiGoalResult, SimGoal } from "./sim-goals";

// ── Tuning-Konstanten (Verhaltens-Domäne des Fake-Spielers, nicht der Engine) ────────────────
const DECISION_WINDOW_MS = 2 * 60 * 1000; // ein aktives Entscheidungs-Fenster (2 Sim-Min)
const FIGHT_CHUNK_MS = 5_000; // Kampf-Antest-Schrittweite (Stop-Erkennung)
const FOOD_LOW = 10; // unter so vielen Food-Items wird nachgefasst
// [Food-Pass #5] Nachkauf-/Koch-Ziel 40 → 30: AUTO_EAT_COOLDOWN_MS 3000 → 4500 (+ ~18 %-maxHp-
// Bissen) verbrennt lt. Spec ~⅓ weniger Food-Items für dieselbe Kampf-Zeit — 30 Stück decken
// jetzt, was vorher 40 deckten (40 × ⅔ ≈ 27, +Marge). Weniger Kapital liegt im Food-Stapel fest.
const FOOD_TARGET = 30;
// AMMO_QUIVER_LOW/AMMO_TOTAL_LOW: ENTFERNT (#286 Ammo-Removal) — keine Munitions-Heuristik mehr.
const GOLD_RESERVE = 60; // eiserner Gold-Rest für Food
const INVENTORY_PRESSURE = 0.85; // ab dieser Füllung wird gebankt/verkauft
const ZERO_PROGRESS_LIMIT = 3; // so viele aktive Null-Fortschritt-Fenster ⇒ Friction
const DEATH_BLACKLIST_AT = 2; // ab so vielen Toden am selben Ziel: Friction + Ziel (vorerst) meiden
// [Sweep5 T2] Die Meide-Liste ist NICHT permanent — nach spürbarem Stärke-Zuwachs oder genug
// Sim-Zeit traut sich der Spieler wieder ran („jetzt bin ich stärker — nochmal probieren"):
const RETRY_CL_GAIN = 3; // erneut versuchen ab +3 Kampf-Niveau seit dem Meiden …
const RETRY_GEAR_GAIN = 12; // … oder einem spürbaren Gear-Score-Sprung (≈ eine Ausrüstungs-Stufe) …
const RETRY_COOLDOWN_MS = 10 * 60 * 60 * 1000; // … oder nach 10 Sim-h auch ohne messbaren Zuwachs
// [Sweep5 T5] Food-Puffer vor Idle-Strecken proportional zur Idle-Länge (40 Stück reichen nicht für 3 h Kampf):
// Planungs-Rate: gemessen 2–4 Food/Min in zähen On-Level-Kämpfen der 3s-Cooldown-Welt; mit
// AUTO_EAT_COOLDOWN_MS 4500 [Food-Pass #5] ist das Verbrauchs-Band ×⅔ (≈1,3–2,7/Min) — 2/Min
// bleibt als Planungs-Rate stehen und ist damit KONSERVATIVER als vorher (Nacht-Tod > Überkauf).
const IDLE_FOOD_PER_MIN = 2;
const IDLE_FOOD_MAX = 300; // Obergrenze des Idle-Vorrats (Budget-/Sinnhaftigkeits-Deckel)
// IDLE_AMMO_PER_MIN/IDLE_AMMO_MAX: ENTFERNT (#286 Ammo-Removal) — kein Munitions-Bevorraten mehr.
// [Sweep6 W2-T7-F2] Craft-Skill-Leveling als Gear-Route: ein noch GESPERRTES Waffen-Rezept bis zu
// so viele Skill-Level über dem aktuellen Stand gilt als erreichbares Zwischenziel („Skill dorthin
// trainieren") — der nächste Rezept-Tier liegt praktisch immer in diesem Fenster (progressive Leiter).
const CRAFT_TRAIN_REACH = 15;
// [Regression-Fix Craft-Route] Adäquanz-Schwelle der getragenen Mainhand: gearScore je Kampf-Niveau,
// den eine Waffe halten muss, um on-level-Kämpfe noch zu tragen. Die Craft-Waffen-Route (T4-#2) darf
// den Kampf NUR verdrängen, wenn die aktuelle Waffe UNTER dieser Schwelle liegt — sonst preemptete sie
// den kompletten Entscheidungs-Loop schon bei einem nur marginal besseren craftbaren Mainhand
// (copper_mace über den Melee-Starter) und ein frischer Melee craftete 90 Min durch, ohne je zu kämpfen
// (0 Kills, CL 1). gearScore ≈ DPS×9, on-level-Content-HP skaliert grob mit CL: der CL-1-Starter
// (rusty_sword 0.9) liegt klar über der Schwelle (0.2), der CL-26-Magier auf gnarled_staff (1.575) klar
// darunter (5.2) — genau die Trennung, die den Magier weiter craften und den Melee kämpfen lässt.
const WEAPON_ADEQUACY_PER_CL = 0.2;
// Multi-Goal-Scheduler (pursue):
const GOAL_STALL_LIMIT = 3; // fokussierte Fenster ohne Proxy-Fortschritt ⇒ Rotation
const GOAL_ROTATION_COOLDOWN = 4; // so viele Fenster pausiert ein rotiertes Ziel
const GOAL_MAX_ROTATIONS = 3; // fruchtlose Rotationen in Folge ⇒ Ziel als Wall aufgeben
const GOAL_IDLE_CHUNK_MS = 10 * 60 * 1000; // Idle in Häppchen (Erreicht-Zeitstempel + Früh-Ausstieg)
// [Sweep5 T3] Fairness gegen Fokus-Starvation (0%-Ziele verhungerten deterministisch gegen ein
// Kampf-Ziel im Flow — Seed 1337: fishing/smithing nach 30 h exakt Lv 1):
const STARVATION_LIMIT = 10; // spätestens nach so vielen Fenstern ohne Fokus ist ein offenes Ziel dran
const STARVATION_GAIN = 0.08; // sanfter Anti-Starvation-Sog pro Fenster ohne Fokus (vor der Garantie)
// [It2-Sched] Idle-Fairness über AUFMERKSAMKEITS-ZEIT: die Idle-Strecken sind ~94 % der Spielzeit,
// die Fenster-Zähler oben sehen sie nicht — das 2-Min-Garantie-Fenster resettete `sinceFocus` direkt
// vor der Nacht und die Nächte gehörten ALLE dem Kampf-Flow (Seed 5: woodcutting 3,5 % nach 6 h).
// Jetzt bekommt jedes offene Ziel Zeit gutgeschrieben, in der sein Proxy sich wirklich bewegt
// (Synergie inklusive: eine Kampf-Nacht zahlt auf Kampf- UND Gold-Ziel ein); wer unter der halben
// fairen Zeit-Quote liegt, bekommt die nächste Idle-Strecke gewidmet.
const ATTENTION_FAIR_SHARE = 0.5; // „ausgehungert" = weniger als die Hälfte des fairen Zeitanteils
// [It2-Sched] Zielgeraden-Sparen: liegt ein offenes Gold-Ziel in Reichweite (Kontostand ≥ 60 % des
// Ziels), friert der Spieler LUXUS-Ausgaben ein (Shop-Gear, Nacht-Food-Puffer über den Basis-Vorrat),
// bis das Ziel latcht — vorher floss vor JEDER Nacht alles über der 60er-Reserve in den Food-Puffer
// und der Kontostand konnte nie über ~300 klettern (Seed 5: Gold-Peak 304/500 trotz 1100 Einnahmen).
const GOLD_SAVING_NEAR = 0.6;
// [#279 Verkaufs-Ökonomie] Hort-Schwelle je Material (Inventar + Lager zusammen): alles darüber
// verkauft `sellSurplusLoot` in jedem aktiven Fenster am Händler — seit #272 (MonsterDef.gold = 0
// auf allen 99 Monstern) ist Verkaufen die EINZIGE Gold-Quelle. 60 deckt die ensureInputs-
// Fenster-Vorräte (qty×20 bei üblichen Rezept-qty 1–3), Rezept-Ketten bleiben also tragfähig;
// Stil-Munition, offene obtainItem-Ziele und Inputs der laufenden/geplanten Verarbeitung sind tabu.
// Die Schwelle gilt NUR für Craft-Futter (Rezept-Inputs) — Trophäen-Junk ohne jede Rezept-
// Verwendung (goblin_ear …) ist bewusstes Verkaufs-Gold und wird komplett versilbert.
const MATERIAL_KEEP = 60;
// [Food-Pass #5] Heil-Toleranz beim Food-Einkauf: Sorten, deren Bissen ≥ diesem Anteil des BESTEN
// leistbaren Bissens heilt, gelten als gleichwertig — dann entscheidet der PREIS. Selbst-
// kalibrierend über die Hybrid-Heilung: bei kleinem maxHp trennt die Flat-Leiter echt (Forelle 5
// schlägt Shrimp 3 → Qualität gewinnt), ab ~42 maxHp heilen beide identisch 12 % maxHp (pct-Floor)
// → die billige Sorte gewinnt. Details am `buyFood`-Docblock.
const FOOD_HEAL_TOLERANCE = 0.85;

/**
 * Stil-Gewichte je Attribut für den gearScore (Tooltip-Überschlag des ehrlichen Spielers):
 * das Schadens-Attribut des EIGENEN Stils zählt voll, tote Fremd-Schadens-Attribute NICHTS
 * (str speist nur meleeDamage, int nur magicDamage/Mana — computeStats liest sie im fremden Stil
 * nie), Universal-Attribute stil-unabhängig (con = HP+def, lck = Krit, dex = acc/Tempo/eva-Rider
 * auch ohne Ranged-Schaden, wis = def-Rider, für Caster zusätzlich Mana/Regen). Raten grob aus
 * den computeStats-Formeln (character.ts) bzw. den §5.1-Marginalwerten der Itemization-2-Spec
 * abgeleitet — bewusst Heuristik, kein DPS-Solver.
 * [Sweep6 T1-#5] Tote Fremd-Attribute standen auf 0.1 statt 0 — genau dieses Phantom kippte den
 * con-1-Gleichstand leather_body vs. apprentice_robe_body (con 1 + int 1) und schickte JEDEN
 * ehrlichen Melee in die 220-g-Caster-Robe statt ins 110-g-Lederwams (echter Score-Fehler:
 * int gibt einem Melee exakt nichts — magicDamage/maxMana werden im Melee-Stil nie gelesen).
 */
const GEAR_ATTR_STYLE_WEIGHT: Record<WeaponStyle, Record<AttributeId, number>> = {
  melee: { str: 1, dex: 0.7, int: 0, wis: 0.3, con: 1, lck: 0.8 },
  ranged: { str: 0, dex: 1, int: 0, wis: 0.3, con: 1, lck: 0.8 },
  magic: { str: 0, dex: 0.7, int: 1, wis: 0.8, con: 1, lck: 0.8 },
};

/**
 * [Re-Gate F3] Gewicht der Tooltip-DPS von Range-Form-Waffen (Waffen 2.0) im gearScore.
 * So gewählt, dass der DPS-Pfad beim 3-s-Basistempo EXAKT dem alten Flat-Pfad entspricht und
 * Legacy- vs. Range-Form-Scores vergleichbar bleiben: die Legacy-Flat→Spanne-Konvertierung ist
 * DPS-neutral (Mittelwert = Flat D), also DPS = D / 3 s — und D×3 (alter Pfad) == (D/3)×9.
 */
const GEAR_DPS_WEIGHT = 9;
/** Waffeneffekt-Aufschlag auf den DPS-Anteil (grob nach Spec-Pricing): je Effekt ≈ +5 % Score. */
const GEAR_EFFECT_WEIGHT = 0.05;

/**
 * Welche Skill-Boosts (§4.2) computeStats im jeweiligen Stil überhaupt LIEST — die übrigen sind
 * für diese Persona tote Tooltip-Werte (attack/power nur Melee, ranged nur Ranged, magic/
 * warding nur Magie; defence wirkt in jedem Stil auf def+eva).
 */
const GEAR_BOOST_READ_BY_STYLE: Record<WeaponStyle, ReadonlySet<BoostableCombatSkillId>> = {
  melee: new Set<BoostableCombatSkillId>(["attack", "power", "defence"]),
  ranged: new Set<BoostableCombatSkillId>(["ranged", "defence"]),
  magic: new Set<BoostableCombatSkillId>(["magic", "warding", "defence"]),
};

/** Interner Plan für das nächste aktive Fenster. */
type Task =
  | { kind: "fight"; monsterId: MonsterId }
  | { kind: "action"; actionId: ActionId; label: string };

/** Interner Laufzeit-Zustand EINES Ziels während `pursue` (Latching, Rotation, Stichproben). */
interface GoalTracker {
  goal: SimGoal;
  description: string;
  /** Hochwassermarke des Fortschritts (0..1, monoton). */
  high: number;
  achieved: boolean;
  /** SPIELZEIT (ms, relativ zum pursue-Start) des Erreichens. */
  achievedAtMs: number;
  /** Strukturell blockiert / als Wall aufgegeben. */
  blocked: boolean;
  note: string | undefined;
  /** Fokussierte Fenster in Folge ohne Proxy-Fortschritt. */
  stall: number;
  /** Fenster, die das Ziel nach einer Rotation pausiert. */
  cooldown: number;
  /** Fruchtlose Rotationen in Folge (Fortschritt setzt sie zurück). */
  rotations: number;
  /** Letzter Ist-Stand (checkGoal-detail). */
  detail: string;
  /** Fortschritts-Stichproben (Hochwassermarke) je Fenster/Idle-Chunk. */
  samples: number[];
  /** [Sweep5 T3] Fenster seit dem letzten Fokus — Basis der Anti-Starvation-Fairness. */
  sinceFocus: number;
  /** [It2-Sched] Spielzeit (ms), in der der Ziel-Proxy sich bewegt hat — Basis der Idle-Fairness. */
  attentionMs: number;
  /** [It2-Sched] Proxy-Stand der letzten Gutschrift (creditAttention). */
  lastProxy: number;
}

export interface RealisticPlayerOptions {
  /** Seed für den ENTSCHEIDUNGS-RNG (und, versetzt, die Spiel-RNG). Default 1. */
  seed?: number;
  name?: string;
  /** Persona-Stil: bestimmt Startwaffe UND welche Gear-/Ziel-Heuristiken greifen. Default melee. */
  style?: WeaponStyle;
  /**
   * 0..1 — wie nah am eigenen Kampf-Niveau Ziele gewählt werden (1 = bis genau auf Augenhöhe).
   * Nach einem Tod sinkt der effektive Mut vorübergehend (Vorsicht). Default 1.
   */
  bravery?: number;
  /** 0..1 — Anteil der aktiven Fenster, die (statt Kampf) einem Skilling-Ziel gehören. Default 0.25. */
  skillingBias?: number;
}

export interface RealisticRunResult {
  name: string;
  style: WeaponStyle;
  /** Tatsächlich gespielte Sim-Zeit (aktiv + idle). */
  simTimeMs: number;
  activeWindows: number;
  idleMs: number;
  kills: number;
  deaths: number;
  combatLevel: number;
  totalLevel: number;
  gold: number;
  frictions: FrictionEvent[];
  snapshot: SimSnapshot;
  /** Chronologisches Kurz-Protokoll der Entscheidungen (deterministisch, für Debug/Bericht). */
  log: string[];
}

/** Mappt Friction-Events auf Persona-Findings (Kategorie ux, P3 — Muster eskaliert der Leser). */
export function frictionsToFindings(events: readonly FrictionEvent[]): Finding[] {
  return events.map((e) => ({
    severity: "P3" as const,
    category: "ux" as const,
    title: e.what,
    expected: "Der Spieler kommt ohne Stocken weiter",
    actual: e.whyConfusing,
    repro: [e.moment],
    ...(e.evidence ? { evidence: e.evidence } : {}),
  }));
}

export class RealisticPlayer {
  readonly player: SimPlayer;
  readonly content: ContentDB;
  readonly style: WeaponStyle;
  readonly frictions = new FrictionCollector();

  private readonly rng: RngState;
  private readonly bravery: number;
  private readonly skillingBias: number;
  private readonly deathsByMonster = new Map<MonsterId, number>();
  /**
   * [Sweep5 T2] Gemiedene Ziele MIT Stärke-Schnappschuss vom Zeitpunkt des Meidens — Basis für
   * den Wieder-Versuch (Ablauf via `isBlacklisted`). Vorher permanent ⇒ Zielpool-Kollaps
   * (Seed 11: 50k XP-lose Grub-Kills, weil Lv10–30 komplett auf der Liste stand).
   */
  private readonly blacklist = new Map<MonsterId, { cl: number; gear: number; atMs: number }>();
  /** Vorsicht nach Toden (0..n). Senkt das akzeptierte Ziel-Level, klingt pro Fenster ab. */
  private caution = 0;
  /** [It2-Sched] Reserve für LUXUS-Käufe (Zielgeraden-Sparen; nur pursue hebt sie an). */
  private luxuryReserve = GOLD_RESERVE;
  private zeroProgressWindows = 0;
  private zeroProgressReported = false;
  private simTimeMs = 0;
  private idleMs = 0;
  private activeWindows = 0;
  /** Letztes selbst gewähltes Kampf-Ziel — für die Tod-Zuordnung nach Idle-Strecken. */
  private lastCombatTarget: MonsterId | null = null;
  /** Art der zuletzt ausgeführten Aktivität — Flow-Bonus der Multi-Goal-Zielwahl. */
  private lastTaskKind: Task["kind"] | null = null;
  private pendingTask: Task | null = null;
  private readonly logLines: string[] = [];
  /** Skills, deren „freigeschaltet, aber Material unbeschaffbar"-Friction schon gemeldet wurde. */
  private readonly unreachableReported = new Set<ActionId>();
  /** Schon gemeldete Equip-Fehlschläge (itemId:reason) — dämpft Retry-Spam im Friction-Log
   *  (Sweep5 T8: 177× „Inventar voll" für dasselbe Item verrauscht die Berichte). */
  private readonly equipFrictionReported = new Set<string>();
  /** [Sweep6 T4-#3] Entlastung lief zuletzt ins Leere (nichts bankbar/verkaufbar) — 1× Friction,
   *  danach Loot-Skip statt No-op-Schleife („Inventar entlastet 20/20 → 20/20", stundenlang). */
  private inventoryStuck = false;
  /** [#279] Items, die der Verkaufs-Pass NIE anfasst — die Ziel-Items offener obtainItem-Ziele
   *  (nur `pursue` befüllt die Liste; `playFor` verkauft frei nach Hort-Schwelle). */
  private protectedItems: ReadonlySet<ItemId> = new Set();
  /** [Food-Pass #5] Die Ziel-Tracker des LAUFENDEN pursue — damit decideAndAct die Zielgeraden-
   *  Reserve direkt NACH den Einkommens-Ereignissen des Fensters (Verkaufs-Pass, Quest-Claims)
   *  nachziehen kann, BEVOR Food/Munition/Gear das frische Gold ausgeben. `updateGoldFloor` am
   *  Fenster-ANFANG sah nur den Vor-Verkaufs-Kontostand: ein Windfall wurde im selben Fenster
   *  wieder verfrühstückt und die Reserve zog nie (Seed 5: +683 g verkauft → 616 g Food-Restock
   *  im selben Fenster, gold(500) stand nach 8 h bei 86). null außerhalb von pursue. */
  private pursueTrackers: GoalTracker[] | null = null;
  /** [#279] Material-Ids, die IRGENDEIN Rezept als Input nutzt (einmalig aus dem Content
   *  abgeleitet): nur für sie gilt die Hort-Schwelle `MATERIAL_KEEP`. Alles andere Material ist
   *  reiner Verkaufs-Loot (Trophäen-Junk wie goblin_ear/imp_horn — im Content BEWUSST als
   *  Gold-Quelle angelegt, vgl. ORPHAN_BASELINE) und wird komplett versilbert. */
  private readonly craftInputIds: ReadonlySet<ItemId>;

  constructor(content: ContentDB, opts: RealisticPlayerOptions = {}) {
    this.content = content;
    this.style = opts.style ?? "melee";
    this.bravery = clamp01(opts.bravery ?? 1);
    this.skillingBias = clamp01(opts.skillingBias ?? 0.25);
    const seed = opts.seed ?? 1;
    // Eigener Entscheidungs-RNG, versetzt zur Spiel-Seed → Entscheidungen und Spiel-RNG bleiben
    // getrennt deterministisch (eine Heuristik-Änderung verschiebt nicht die Loot-Würfe an sich).
    this.rng = createRng((seed ^ 0x9e3779b9) >>> 0);
    // [#279] Craft-Futter-Kenntnis für den Verkaufs-Pass (einmalig, read-only aus dem Content).
    const inputs = new Set<ItemId>();
    for (const a of Object.values(content.actions)) {
      for (const inp of a.inputs ?? []) inputs.add(inp.itemId);
    }
    this.craftInputIds = inputs;
    // HONEST-Modus: Der Charakter startet wie ein echter Spieler — Starter-Kit (etwas Food +
    // vorbelegtes Auto-Eat) ist der reguläre Weg der Charaktererstellung, KEIN Cheat.
    this.player = new SimPlayer(content, {
      seed,
      creation: { name: opts.name ?? "Realist", startingStyle: this.style, starterKit: true },
    });
  }

  // ── Haupt-Loop ─────────────────────────────────────────────────────────────────────────────

  /**
   * Spielt `totalMs` Sim-Zeit als Session-Rhythmus: einige aktive Entscheidungs-Fenster, dann eine
   * lange Idle-Strecke (laufende Aktion/Kampf tickt weiter), dann wieder aktiv — wie ein echter
   * Idle-Spieler. Gibt das Ergebnis inkl. Friction-Log zurück. Mehrfach aufrufbar (kumulativ).
   */
  playFor(totalMs: number): RealisticRunResult {
    if (!Number.isFinite(totalMs) || totalMs <= 0) return this.result();
    const end = this.simTimeMs + totalMs;
    while (this.simTimeMs < end) {
      // Aktive Phase: 2-5 Entscheidungs-Fenster (seeded).
      const windows = nextInt(this.rng, 2, 5);
      for (let w = 0; w < windows && this.simTimeMs < end; w++) {
        const windowMs = Math.min(DECISION_WINDOW_MS, end - this.simTimeMs);
        this.decideAndAct(windowMs);
      }
      if (this.simTimeMs >= end) break;
      // Idle-Strecke: 30 Min – 3 h (seeded), gedeckelt aufs Restbudget. Die aktuell laufende
      // Aktivität (Aktion ODER Kampf) tickt weiter — genau das ist Idle-Spielen.
      const idle = Math.min(nextInt(this.rng, 30, 180) * 60 * 1000, end - this.simTimeMs);
      if (idle > 0) {
        this.prepareForIdle(idle);
        this.player.advanceTime(idle);
        this.simTimeMs += idle;
        this.idleMs += idle;
        this.logLine(`idle ${Math.round(idle / 60000)} Min`);
      }
    }
    return this.result();
  }

  /** Fertiger Markdown-Block des Friction-Logs (für Sweep-Berichte). */
  frictionMarkdown(): string {
    return formatFrictionMarkdown(this.frictions.all(), `Friction-Log — ${this.player.state.character.name}`);
  }

  /** Aktuelles Ergebnis (auch mitten im Lauf abrufbar). Kills/Tode = Engine-Lebenszeit-Statistik. */
  result(): RealisticRunResult {
    const snapshot = this.player.snapshot();
    return {
      name: this.player.state.character.name,
      style: this.style,
      simTimeMs: this.simTimeMs,
      activeWindows: this.activeWindows,
      idleMs: this.idleMs,
      kills: this.player.state.stats.kills,
      deaths: this.player.state.stats.deaths,
      combatLevel: this.player.combatLevel(),
      totalLevel: snapshot.totalLevel,
      gold: this.player.gold(),
      frictions: this.frictions.all(),
      snapshot,
      log: [...this.logLines],
    };
  }

  // ── Multi-Goal-Scheduler (pursue) ──────────────────────────────────────────────────────────

  /**
   * Verfolgt MEHRERE Ziele in einem Lauf (Session-Rhythmus wie `playFor`: aktive Fenster + Idle).
   * Pro Fenster wird ein Fokus-Ziel gewählt (nah am Abschluss + Flow + seeded Varianz), Synergien
   * laufen mit (Gold fällt beim Kampf ab, Quest-Claims füttern Gold/Items). Blockierte Ziele
   * rotieren raus (Friction + weiter mit den anderen); der Lauf endet früher, sobald ALLE Ziele
   * erreicht sind. Kumulativ aufrufbar wie `playFor`. Alle Zeiten im Ergebnis sind SPIELZEIT.
   */
  pursue(goals: readonly SimGoal[], opts: { budgetMs: number }): MultiGoalResult {
    const startMs = this.simTimeMs;
    const trackers: GoalTracker[] = goals.map((goal) => ({
      goal,
      description: describeGoal(goal),
      high: 0,
      achieved: false,
      achievedAtMs: 0,
      blocked: false,
      note: undefined,
      stall: 0,
      cooldown: 0,
      rotations: 0,
      detail: "",
      samples: [],
      sinceFocus: 0,
      attentionMs: 0,
      lastProxy: 0,
    }));
    // [#279] Ziel-Items sind für den Verkaufs-Pass tabu (ein Spieler verkauft nicht, was er
    // gerade zu beschaffen versucht — auch nicht den „Überschuss" über der Hort-Schwelle).
    // [#286-Sched-Fix] Zusätzlich: die Rezept-INPUTS offener skillLevel-Ziele. Vorher fraß eine
    // Verkaufs-Schleife die Skilling-Route: die dem Ziel gewidmete Nacht sammelte Zutaten
    // (idleSuitableTask sattelt Verarbeitung ohne Strecken-Vorrat auf die Sammel-Quelle um),
    // aber `sellSurplusLoot` versilberte den Vorrat im nächsten aktiven Fenster wieder auf die
    // Hort-Schwelle (60) herunter → die Verarbeitung wurde NIE strecken-tauglich, jede Nacht
    // zählte als Idle-Stall und das Ziel fiel fälschlich als „Wall" (Seed 1337: smithing Lv 1
    // trotz 47k Mining-XP — Erz gehortet, verkauft, gehortet …). Ein echter Spieler verkauft
    // nicht das Erz, das er für sein Schmiede-Ziel sammelt.
    this.protectedItems = new Set([
      ...goals.flatMap((g) => (g.kind === "obtainItem" ? [g.itemId] : [])),
      ...goals.flatMap((g) =>
        g.kind === "skillLevel"
          ? Object.values(this.content.actions)
              .filter((a) => a.skill === g.skillId)
              .flatMap((a) => (a.inputs ?? []).map((i) => i.itemId))
          : [],
      ),
    ]);
    this.pursueTrackers = trackers; // [Food-Pass #5] für den Reserve-Nachzug im Fenster-Upkeep
    this.updateGoalTrackers(trackers, startMs);
    this.creditAttention(trackers, 0); // Proxy-Basis setzen, ohne Zeit gutzuschreiben
    const budget = Number.isFinite(opts.budgetMs) && opts.budgetMs > 0 ? opts.budgetMs : 0;
    const end = startMs + budget;
    const allDone = (): boolean => trackers.every((t) => t.achieved);

    while (this.simTimeMs < end && !allDone()) {
      // Aktive Phase: 2-5 Entscheidungs-Fenster (seeded), jedes einem Fokus-Ziel gewidmet.
      const windows = nextInt(this.rng, 2, 5);
      for (let w = 0; w < windows && this.simTimeMs < end && !allDone(); w++) {
        const windowMs = Math.min(DECISION_WINDOW_MS, end - this.simTimeMs);
        this.pursueWindow(trackers, windowMs, startMs);
      }
      if (this.simTimeMs >= end || allDone()) break;
      // Idle-Strecke: laufende Aktivität tickt weiter — in Häppchen, damit Ziel-Erreichen einen
      // brauchbaren Spielzeit-Stempel bekommt und der Lauf früh aussteigen kann.
      const idle = Math.min(nextInt(this.rng, 30, 180) * 60 * 1000, end - this.simTimeMs);
      if (idle > 0) {
        // [Sweep6 T2-F1] Proxy-Basis VOR der Vorbereitung nehmen: auch ein Kauf/Craft während der
        // Idle-Vorbereitung zählt als echter Fortschritt der Strecke (kein falscher Stall).
        const proxyBefore = new Map<GoalTracker, number>();
        for (const t of trackers) {
          if (!t.achieved) proxyBefore.set(t, goalProxy(this.player.state, this.content, t.goal));
        }
        const owner = this.prepareForGoalIdle(trackers, idle, this.simTimeMs - startMs);
        let done = 0;
        while (done < idle && !allDone()) {
          const chunk = Math.min(GOAL_IDLE_CHUNK_MS, idle - done);
          this.player.advanceTime(chunk);
          this.simTimeMs += chunk;
          this.idleMs += chunk;
          done += chunk;
          this.updateGoalTrackers(trackers, startMs);
          this.creditAttention(trackers, chunk);
          // [It2-Sched] Die Nacht gehörte einem konkreten Ziel und das ist jetzt DURCH → Strecke
          // beenden („morgens den Level-Up sehen und zurück zum Plan") statt Stunden zu verbrennen.
          if (owner?.achieved) break;
        }
        this.logLine(`idle ${Math.round(done / 60000)} Min (Multi-Goal)`);
        // [Sweep6 T2-F1] Stall-Buchhaltung auch für Ziel-Idle-Strecken: eine dem Ziel GEWIDMETE
        // Nacht ohne jeden Proxy-Fortschritt ist eine Rotation — vorher lief ein toter Idle-Task
        // stundenlang mit frictions=0 („fälschlich sauber") im Kreis.
        if (owner && done >= GOAL_IDLE_CHUNK_MS) {
          this.registerIdleStall(owner, proxyBefore.get(owner) ?? 0, Math.round(done / 60000));
        }
        for (const t of trackers) t.samples.push(t.high);
      }
    }

    // [#279] Session-Abschluss: endet das Budget mitten in einer Idle-Strecke, kommt der Spieler
    // mit ungebanktem Nacht-Loot zurück — Verkaufen kostet KEINE Spielzeit (Händler ist instant),
    // also versilbert er ihn ehrlich noch VOR der Schlussmessung (sonst verfehlte ein Gold-Ziel,
    // dessen Gegenwert längst als Loot im Inventar liegt, den Lauf nur wegen des Mess-Zeitpunkts).
    this.sellSurplusLoot();
    this.updateGoalTrackers(trackers, startMs);
    this.luxuryReserve = GOLD_RESERVE; // Sparverhalten ist pursue-lokal (playFor unverändert)
    this.protectedItems = new Set(); // [#279] Verkaufs-Schutz ist pursue-lokal
    this.pursueTrackers = null; // [Food-Pass #5] Reserve-Nachzug ist pursue-lokal
    const totalSimMs = this.simTimeMs - startMs;
    const outcomes: GoalOutcome[] = trackers.map((t) => ({
      goal: t.goal,
      description: t.description,
      achieved: t.achieved,
      progress: t.achieved ? 1 : t.high,
      simTimeMs: t.achieved ? t.achievedAtMs : totalSimMs,
      blocked: t.blocked,
      ...(t.note !== undefined ? { note: t.note } : {}),
      detail: t.detail,
      progressSamples: [...t.samples],
    }));
    return {
      name: this.player.state.character.name,
      goals: outcomes,
      totalSimMs,
      allAchieved: outcomes.every((g) => g.achieved),
      frictions: this.frictions.all(),
      snapshot: this.player.snapshot(),
      log: [...this.logLines],
    };
  }

  /** Ein aktives Multi-Goal-Fenster: Fokus wählen → handeln → Blockade prüfen. (Quest-Claims
   *  laufen EAGER im Entscheidungs-Takt selbst — `claimCompletedQuests` in `decideAndAct`.) */
  private pursueWindow(trackers: GoalTracker[], windowMs: number, startMs: number): void {
    for (const t of trackers) if (t.cooldown > 0) t.cooldown--;
    this.updateGoldFloor(trackers);

    const focus = this.pickFocusGoal(trackers);
    const task = focus ? this.goalTask(focus) : null;
    const proxyBefore = focus ? goalProxy(this.player.state, this.content, focus.goal) : 0;

    const ranOverride = this.decideAndAct(windowMs, task);
    // Fairness-Zähler nur zurücksetzen, wenn das Fenster WIRKLICH dem Fokus-Ziel gehörte —
    // von Upkeep verdrängte Fenster zählen nicht als Fokus (Sweep5 T3, Nachschärfung).
    if (focus && ranOverride) focus.sinceFocus = 0;
    this.updateGoalTrackers(trackers, startMs);

    // Blockade-Erkennung: das fokussierte Fenster hat KEINEN Proxy-Fortschritt gebracht.
    if (focus && task && ranOverride && !focus.achieved && !focus.blocked) {
      const proxyAfter = goalProxy(this.player.state, this.content, focus.goal);
      if (proxyAfter > proxyBefore) {
        focus.stall = 0;
        focus.rotations = 0; // echter Fortschritt heilt die Wall-Zählung
      } else {
        focus.stall++;
        if (focus.stall >= GOAL_STALL_LIMIT) {
          focus.stall = 0;
          focus.rotations++;
          focus.cooldown = GOAL_ROTATION_COOLDOWN;
          this.logLine(`Ziel „${focus.description}" steckt fest → rotiere weiter (${focus.rotations}. Mal)`);
          if (focus.rotations === 1) {
            this.frictions.add({
              moment: this.moment("Multi-Goal-Planung"),
              what: `Ziel „${focus.description}" kommt nicht voran — zu anderen Zielen rotiert`,
              whyConfusing:
                "Der Spieler investiert aktive Zeit in dieses Ziel, ohne dass sich irgendetwas bewegt — er weicht auf seine anderen Ziele aus.",
              evidence: { detail: focus.detail, progress: Number(focus.high.toFixed(3)) },
            });
          }
          if (focus.rotations >= GOAL_MAX_ROTATIONS) {
            focus.blocked = true;
            focus.note = `nach ${focus.rotations} fruchtlosen Anläufen aufgegeben (Wall) — Stand: ${focus.detail}`;
            this.logLine(`Ziel „${focus.description}" als Wall aufgegeben`);
          }
        }
      }
    }
    this.creditAttention(trackers, windowMs);
    for (const t of trackers) t.samples.push(t.high);
  }

  /**
   * [Sweep6 T2-F1] Stall-Buchhaltung für ZIEL-Idle-Strecken: hat sich der Proxy des Strecken-
   * Besitzers über die GANZE Strecke nicht bewegt, zählt das direkt als Rotation (eine
   * fruchtlose Nacht wiegt so viel wie `GOAL_STALL_LIMIT` tote Fenster): Cooldown, beim ersten
   * Mal ein „stalled"-Friction-Event, nach `GOAL_MAX_ROTATIONS` die Wall-Aufgabe. Vorher gab es
   * diese Buchhaltung NUR im aktiven Fenster (`pursueWindow`) — der Seed-41-Lauf hing 30 h in
   * einem toten Idle-Task (32 162 gravesteel_ore, 0 Kohle) und endete mit frictions=0.
   * Proxy-Fortschritt heilt umgekehrt Stall- UND Rotations-Zähler (wie im Fenster-Pfad).
   */
  private registerIdleStall(owner: GoalTracker, proxyBefore: number, idleMinutes: number): void {
    if (owner.achieved || owner.blocked) return;
    const proxyAfter = goalProxy(this.player.state, this.content, owner.goal);
    if (proxyAfter > proxyBefore) {
      owner.stall = 0;
      owner.rotations = 0;
      return;
    }
    owner.stall = 0;
    owner.rotations++;
    owner.cooldown = Math.max(owner.cooldown, GOAL_ROTATION_COOLDOWN);
    this.logLine(
      `Ziel „${owner.description}" stockte die ganze Idle-Strecke (${idleMinutes} Min) → rotiere weiter (${owner.rotations}. Mal)`,
    );
    if (owner.rotations === 1) {
      this.frictions.add({
        moment: this.moment("Idle-Strecke (Multi-Goal)"),
        what: `Ziel „${owner.description}" stockte über die ganze Idle-Strecke (stalled)`,
        whyConfusing:
          "Die Strecke war diesem Ziel gewidmet, aber nichts hat sich Richtung Ziel bewegt — der Spieler wacht ohne jeden Fortschritt auf.",
        evidence: { detail: owner.detail, idleMinutes, progress: Number(owner.high.toFixed(3)) },
      });
    }
    if (owner.rotations >= GOAL_MAX_ROTATIONS) {
      owner.blocked = true;
      owner.note = `nach ${owner.rotations} fruchtlosen Anläufen aufgegeben (stalled) — Stand: ${owner.detail}`;
      this.logLine(`Ziel „${owner.description}" als Wall aufgegeben (Idle-Stall)`);
    }
  }

  /**
   * [It2-Sched] Schreibt `elapsedMs` als Aufmerksamkeit auf jedes offene Ziel gut, dessen Proxy
   * sich seit der letzten Gutschrift bewegt hat — Synergie inklusive (eine Kampf-Strecke zahlt auf
   * Kampf- UND Gold-Ziel ein, eine Holzfäller-Nacht nur aufs Skilling-Ziel). Basis der
   * Idle-Fairness: die Fenster-Zähler (`sinceFocus`) sind blind für ~94 % Idle-Spielzeit.
   * `elapsedMs = 0` setzt nur die Proxy-Basis (pursue-Start).
   */
  private creditAttention(trackers: GoalTracker[], elapsedMs: number): void {
    for (const t of trackers) {
      if (t.achieved) continue;
      const proxy = goalProxy(this.player.state, this.content, t.goal);
      if (elapsedMs > 0 && proxy > t.lastProxy) t.attentionMs += elapsedMs;
      t.lastProxy = proxy;
    }
  }

  /**
   * [It2-Sched] Das am stärksten unterversorgte Ziel nach Aufmerksamkeits-ZEIT — oder null, wenn
   * alle offenen Ziele mindestens ihre halbe faire Zeit-Quote (`elapsed / offene Ziele`) bekommen
   * haben. Deterministisch (Array-Reihenfolge bricht Gleichstände).
   */
  private attentionStarved(eligible: readonly GoalTracker[], elapsedMs: number): GoalTracker | null {
    if (eligible.length < 2) return null;
    const fairMs = (elapsedMs / eligible.length) * ATTENTION_FAIR_SHARE;
    let worst: GoalTracker | null = null;
    for (const t of eligible) {
      if (t.attentionMs >= fairMs) continue;
      if (!worst || t.attentionMs < worst.attentionMs) worst = t;
    }
    return worst;
  }

  /**
   * [It2-Sched] Zielgeraden-Sparen: liegt ein offenes Gold-Ziel in Reichweite (Kontostand ≥
   * `GOLD_SAVING_NEAR` des Ziels), steigt die Reserve für LUXUS-Käufe (Shop-Gear, Nacht-Food-Puffer
   * über den Basis-Vorrat) auf den Zielbetrag — bis das Ziel latcht. Überlebens-Käufe (Basis-Food,
   * Munition) laufen weiter über die normale `GOLD_RESERVE`. Nur `pursue` setzt den Floor;
   * `playFor` bleibt unverändert.
   */
  private updateGoldFloor(trackers: readonly GoalTracker[]): void {
    let floor = GOLD_RESERVE;
    for (const t of trackers) {
      if (t.achieved || t.blocked || t.goal.kind !== "gold") continue;
      if (this.player.gold() >= t.goal.amount * GOLD_SAVING_NEAR) floor = Math.max(floor, t.goal.amount);
    }
    this.luxuryReserve = floor;
  }

  /** Latcht Erreichtes, pflegt Hochwassermarken + Ist-Stand (read-only auf den State). */
  private updateGoalTrackers(trackers: GoalTracker[], startMs: number): void {
    for (const t of trackers) {
      if (t.achieved) continue;
      const c = checkGoal(this.player.state, this.content, t.goal);
      t.detail = c.detail;
      if (c.progress > t.high) t.high = c.progress;
      if (c.done) {
        t.achieved = true;
        t.high = 1;
        t.achievedAtMs = this.simTimeMs - startMs;
        t.blocked = false; // Zufallssynergie kann auch ein aufgegebenes Ziel noch erfüllen
        t.note = undefined;
        this.logLine(`Ziel erreicht: ${t.description} (nach ${Math.round(t.achievedAtMs / 60000)} Sim-Min)`);
      }
    }
  }

  /**
   * Fokus-Ziel des nächsten Fensters: fast fertige Ziele ziehen an (Zielgerade), Ziele im
   * aktuellen Flow (Kampf nach Kampf, Skilling nach Skilling) bekommen einen Bonus, seeded
   * Varianz hält es menschlich. Blockierte/abkühlende Ziele pausieren (Rotation).
   *
   * [Sweep5 T3] Fairness-Garantie gegen Starvation: jedes offene Ziel sammelt `sinceFocus`-Fenster;
   * ein sanfter Anti-Starvation-Term hebt lange unfokussierte Ziele im Score an, und spätestens ab
   * `STARVATION_LIMIT` Fenstern ohne Fokus ist das am längsten wartende Ziel HART dran
   * (Round-Robin-Anteil). Der Zielgeraden-Sog bleibt — aber ein 0%-Skilling-Ziel kann nicht mehr
   * deterministisch gegen ein 70%-Kampf-Ziel im Flow verhungern (Seed 1337: fishing/smithing Lv 1
   * nach 30 h ohne ein einziges Fokus-Fenster).
   */
  private pickFocusGoal(trackers: GoalTracker[]): GoalTracker | null {
    const open = trackers.filter((t) => !t.achieved && !t.blocked);
    const eligible = open.filter((t) => t.cooldown === 0);
    if (eligible.length === 0) return null;
    let best: GoalTracker | null = null;
    const starving = eligible.filter((t) => t.sinceFocus >= STARVATION_LIMIT);
    if (starving.length > 0) {
      // Fairness-Garantie: das am längsten wartende Ziel bekommt das Fenster (deterministisch).
      for (const t of starving) {
        if (!best || t.sinceFocus > best.sinceFocus) best = t;
      }
    } else {
      let bestScore = -Infinity;
      for (const t of eligible) {
        let score = 0.2 + 0.6 * t.high + STARVATION_GAIN * t.sinceFocus;
        const flow = this.goalFlowKind(t.goal);
        if (flow !== null && flow === this.lastTaskKind) score += 0.3;
        score += nextFloat(this.rng) * 0.25;
        if (score > bestScore) {
          bestScore = score;
          best = t;
        }
      }
    }
    // Wartezähler pflegen (auch für abkühlende Ziele — sie sind nach dem Cooldown umso eher dran).
    // WICHTIG: der Gewinner wird hier NICHT zurückgesetzt — das macht der Aufrufer erst, wenn das
    // Fenster wirklich dem Ziel gehörte. Sonst frisst ein Upkeep-pendingTask (Food kochen/fletchen)
    // das Fairness-Fenster und das Ziel verhungert trotz „Fokus" weiter (Seed 1337: smithing Lv 1,
    // weil jedes Fokus-Fenster vom Koch-Task der Fishing-Route verdrängt wurde).
    for (const t of open) t.sinceFocus++;
    return best;
  }

  /** Grobe Aktivitäts-Art eines Ziels (für den Flow-Bonus der Fokus-Wahl). */
  private goalFlowKind(goal: SimGoal): Task["kind"] | null {
    switch (goal.kind) {
      case "combatLevel":
      case "killMonster":
      case "gold":
        return "fight";
      case "skillLevel":
      case "reachTotalLevel":
        return "action";
      default:
        return null; // obtainItem/completeQuest: hängt vom konkreten Weg ab
    }
  }

  /**
   * Der „nächste Schritt" Richtung Ziel als ausführbarer Task. Strukturell unerreichbare Ziele
   * werden hier (einmalig, mit Friction) blockiert — `null` heißt dann: Fenster frei verplanen.
   */
  private goalTask(t: GoalTracker): Task | null {
    const g = t.goal;
    switch (g.kind) {
      case "combatLevel": {
        const target = this.pickCombatTarget();
        if (target) return { kind: "fight", monsterId: target.id };
        return this.blockGoal(t, "kein startbares Kampf-Ziel verfügbar");
      }
      case "gold": {
        // Synergie: Kampf ist die LOOT-Quelle — Gold entsteht seit #272 nur noch am Händler
        // ([#279]: `sellSurplusLoot` versilbert die Drops/Sammel-Überschüsse in jedem Fenster).
        const target = this.pickCombatTarget();
        if (target) return { kind: "fight", monsterId: target.id };
        const gather = this.pickGatherAction();
        if (gather) return { kind: "action", actionId: gather.id, label: "Gold via Sammeln" };
        return this.blockGoal(t, "weder Kampf noch Sammeln startbar — keine Gold-Quelle");
      }
      case "killMonster": {
        if (!this.content.monsters[g.monsterId]) {
          return this.blockGoal(t, `Monster ${g.monsterId} existiert nicht im Content`);
        }
        if (this.isBlacklisted(g.monsterId)) {
          // [Sweep5 T2] NICHT dauerhaft aufgeben: das Ziel pausiert nur und wird nach dem
          // Blacklist-Ablauf (stärker geworden / Zeit vergangen) automatisch wieder angegangen.
          t.cooldown = Math.max(t.cooldown, GOAL_ROTATION_COOLDOWN);
          if (!t.achieved) t.note = `an ${g.monsterId} wiederholt gestorben — pausiert bis zum nächsten Anlauf`;
          return null;
        }
        return { kind: "fight", monsterId: g.monsterId };
      }
      case "skillLevel": {
        const a = this.pickSkillAction(g.skillId);
        if (a) return { kind: "action", actionId: a.id, label: `Ziel-Skilling ${g.skillId}` };
        return this.blockGoal(t, `keine startbare ${g.skillId}-Aktion (Level-Gate oder Material unbeschaffbar)`);
      }
      case "reachTotalLevel": {
        const gather = this.pickGatherAction();
        if (gather) return { kind: "action", actionId: gather.id, label: "Gesamtlevel-Skilling" };
        const target = this.pickCombatTarget();
        if (target) return { kind: "fight", monsterId: target.id };
        return this.blockGoal(t, "keine XP-Quelle startbar");
      }
      case "obtainItem":
        return this.obtainItemTask(t, g);
      case "completeQuest":
        return this.questTask(t, g.questId);
    }
  }

  /** Markiert ein Ziel als strukturell blockiert (einmalig Friction) und gibt `null` zurück. */
  private blockGoal(t: GoalTracker, note: string): null {
    if (!t.blocked) {
      t.blocked = true;
      t.note = note;
      this.logLine(`Ziel „${t.description}" blockiert: ${note}`);
      this.frictions.add({
        moment: this.moment("Multi-Goal-Planung"),
        what: `Ziel „${t.description}" ist blockiert — weiter mit den anderen Zielen`,
        whyConfusing: `Für dieses Ziel gibt es aktuell keinen gangbaren Weg (${note}); der Spieler kann nur ausweichen.`,
        evidence: { detail: t.detail },
      });
    }
    return null;
  }

  /**
   * Nächster Schritt für ein obtainItem-Ziel: kaufen > erspielen (Aktion) > erjagen (Drop) >
   * Gold fürs Shop-Item verdienen > [Sweep5 T6] Herstell-Skill Richtung Rezept-Level trainieren
   * (level-gegatetes Rezept ist KEINE Sackgasse) > Quest-Belohnungs-Route.
   */
  private obtainItemTask(t: GoalTracker, g: Extract<SimGoal, { kind: "obtainItem" }>): Task | null {
    if (!this.content.items[g.itemId]) {
      return this.blockGoal(t, `Item ${g.itemId} existiert nicht im Content`);
    }
    const entry = this.content.shop.find((e) => e.itemId === g.itemId);
    if (entry) {
      const missing = g.qty - ownedItemCount(this.player.state, g.itemId);
      if (missing > 0) {
        const budget = Math.max(0, this.player.gold() - GOLD_RESERVE);
        const affordable = Math.floor(budget / Math.max(1, entry.cost));
        const qty = Math.min(missing, affordable);
        if (qty > 0) {
          const bought = this.player.buy(g.itemId, qty);
          if (bought > 0) this.logLine(`Ziel-Item gekauft: ${bought}× ${g.itemId}`);
        }
      }
      // Kauf hat das Ziel evtl. schon erfüllt → Fenster frei verplanen (kein Blockade-Fall).
      if (checkGoal(this.player.state, this.content, g).done) return null;
    }
    const viaAction = this.findActionLooting(g.itemId);
    if (viaAction) return { kind: "action", actionId: viaAction.id, label: `Ziel-Item ${g.itemId}` };
    const viaMonster = this.findMonsterDropping(g.itemId);
    if (viaMonster) return { kind: "fight", monsterId: viaMonster.id };
    // [Sweep6 T2-F1] Die Rezept-Kette klemmt an einem Input OHNE Aktions-Quelle (crude_bone,
    // ember_essence …) → den Engpass-Input ERJAGEN statt das Ziel fälschlich zu blockieren.
    const inputMonster = this.findInputMonster(g.itemId);
    if (inputMonster) return { kind: "fight", monsterId: inputMonster.id };
    if (entry) {
      // Kaufbar, aber das Gold fehlt noch → Gold verdienen IST der nächste Schritt (Synergie).
      const target = this.pickCombatTarget();
      if (target) return { kind: "fight", monsterId: target.id };
    }
    // [Sweep5 T6] Es gibt ein Rezept, es ist nur noch level-gegatet → Zwischenziel: den
    // Herstell-Skill Richtung Rezept-Level trainieren, statt das Ziel als „kein Weg" zu blockieren
    // (vorher war z.B. steel_platebody mit smithing 1 strukturell unerreichbar, obwohl smithing
    // trainierbar ist — der goalProxy zählt diese Trainings-XP als echten Fortschritt mit).
    const locked = this.findLockedActionLooting(g.itemId);
    if (locked) {
      const train = this.pickSkillAction(locked.skill);
      if (train) {
        return { kind: "action", actionId: train.id, label: `${locked.skill} trainieren für ${g.itemId}` };
      }
    }
    // [Sweep5 T6] Quest-Belohnung als Quelle: eine noch nicht eingelöste Quest vergibt das Item →
    // die Quest-Route fahren (Kette/Objectives exakt wie bei einem completeQuest-Ziel).
    const rewardQuest = this.content.quests.find(
      (q) => !this.player.state.quests.claimed.includes(q.id) && q.rewards.items?.some((it) => it.id === g.itemId),
    );
    if (rewardQuest) return this.questTask(t, rewardQuest.id);
    return this.blockGoal(t, `kein gangbarer Weg zu ${g.itemId} (kein Shop-Budget, keine Aktion, kein Drop, keine Quest)`);
  }

  /**
   * Nächster Schritt für ein completeQuest-Ziel: gesperrte Ketten über die Vorquest angehen,
   * erfüllte Quests claimen, sonst das erste unerfüllte Objective in einen Teil-Task übersetzen.
   */
  private questTask(t: GoalTracker, questId: string, depth = 0): Task | null {
    const quest = this.content.quests.find((q) => q.id === questId);
    if (!quest) return this.blockGoal(t, `Quest ${questId} existiert nicht im Content`);
    if (depth > 4) return this.blockGoal(t, `Quest-Kette zu ${questId} ist zu tief/zyklisch`);
    const s = this.player.state;
    if (!questUnlocked(s, quest)) {
      const missing = (quest.requires ?? []).find((id) => !s.quests.claimed.includes(id));
      if (!missing) return null; // sollte nicht vorkommen (unlocked ⇔ alle requires claimed)
      return this.questTask(t, missing, depth + 1); // menschlich: die Kette von vorne abarbeiten
    }
    if (claimQuest(s, this.content, questId)) {
      this.logLine(`Quest eingelöst: ${questId}`);
      return null;
    }
    for (let i = 0; i < quest.objectives.length; i++) {
      const obj = quest.objectives[i]!;
      const baseline = s.quests.repeatBaseline[questId]?.[i] ?? 0;
      if (objectiveProgress(s, this.content, obj, baseline) >= obj.count) continue;
      return this.questObjectiveTask(t, obj);
    }
    return null; // alles erfüllt → evaluateQuests markiert die Quest im nächsten Tick
  }

  /** Übersetzt EIN Quest-Objective in einen ausführbaren Teil-Task. */
  private questObjectiveTask(t: GoalTracker, obj: QuestObjective): Task | null {
    switch (obj.type) {
      case "kill_monster": {
        const id = obj.target as MonsterId | undefined;
        if (!id || !this.content.monsters[id]) {
          return this.blockGoal(t, `Quest-Monster ${obj.target ?? "?"} existiert nicht im Content`);
        }
        if (this.isBlacklisted(id)) {
          // [Sweep5 T2] Pausieren statt endgültig blockieren — die Meide-Liste läuft ab.
          t.cooldown = Math.max(t.cooldown, GOAL_ROTATION_COOLDOWN);
          if (!t.achieved) t.note = `Quest-Monster ${id} wird nach wiederholten Toden gerade gemieden`;
          return null;
        }
        return { kind: "fight", monsterId: id };
      }
      case "kill_total": {
        const m = this.pickCombatTarget();
        if (m) return { kind: "fight", monsterId: m.id };
        return this.blockGoal(t, "kein startbares Kampf-Ziel für das Quest-Objective kill_total");
      }
      case "reach_skill_level": {
        const a = obj.target ? this.pickSkillAction(obj.target as SkillId) : null;
        if (a) return { kind: "action", actionId: a.id, label: `Quest-Skilling ${obj.target}` };
        return this.blockGoal(t, `keine startbare ${obj.target ?? "?"}-Aktion für das Quest-Objective`);
      }
      case "reach_total_level":
      case "gather_items": {
        const a = this.pickGatherAction();
        if (a) return { kind: "action", actionId: a.id, label: "Quest-Sammeln" };
        return this.blockGoal(t, "keine Sammel-Aktion für das Quest-Objective startbar");
      }
      case "craft_items": {
        const a = obj.target ? this.findActionLooting(obj.target as ItemId) : this.findAnyCraftAction();
        if (a) return { kind: "action", actionId: a.id, label: `Quest-Craft ${obj.target ?? ""}`.trim() };
        return this.blockGoal(t, `kein Weg, ${obj.target ?? "irgendein Item"} herzustellen (Rezept/Material fehlt)`);
      }
      default:
        return this.blockGoal(t, `Quest-Objective-Typ ${obj.type} ist (noch) nicht automatisierbar`);
    }
  }

  /**
   * [Sweep5 #6] Löst ALLE gerade einlösbaren Quests ein (EAGER statt lazy): Belohnungen (Gold,
   * Reward-Gear) kommen sofort und Prärequisiten-Claims schalten Quest-Ketten frei, statt erst im
   * (evtl. nie kommenden) Fokus-Fenster der Ziel-Quest zu laufen — genau wie ein echter Spieler,
   * der ein „Belohnung abholbar"-Badge sieht. `claimQuest` lehnt selbst ab, was (noch) nicht
   * claimbar ist (Dailies außer Rotation, volle Inventare) — dann eben im nächsten Fenster.
   */
  private claimCompletedQuests(): void {
    for (const quest of this.content.quests) {
      if (questStatus(this.player.state, this.content, quest) !== "completed") continue;
      if (claimQuest(this.player.state, this.content, quest.id)) {
        this.logLine(`Quest eingelöst: ${quest.id}`);
      }
    }
  }

  /** Niedrigst-gegatete Aktion, deren Loot `itemId` enthält, die aber noch NICHT freigeschaltet
   *  ist — der Ansatzpunkt für „Skill Richtung Rezept-Level trainieren" (Sweep5 T6). */
  private findLockedActionLooting(itemId: ItemId): ActionDef | null {
    const locked = Object.values(this.content.actions)
      .filter((a) => !this.actionUnlocked(a) && a.loot.some((l) => l.itemId === itemId))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    return locked[0] ?? null;
  }

  /**
   * Beste startbare Aktion einer KONKRETEN Fertigkeit (Ziel-Skilling): höchste freigeschaltete
   * Aktion, deren Inputs (falls Verarbeitung) verfügbar sind (Lager wird geplündert); sonst die
   * Sammel-Quelle der fehlenden Zutat als Zwischenschritt.
   */
  private pickSkillAction(skillId: SkillId): ActionDef | null {
    const candidates = Object.values(this.content.actions)
      .filter((a) => a.skill === skillId && this.actionUnlocked(a))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    for (let i = candidates.length - 1; i >= 0; i--) {
      const a = candidates[i]!;
      if (!a.inputs || a.inputs.length === 0) return a;
      if (this.ensureInputs(a)) return a;
    }
    // Verarbeitungs-Skill ohne Material: erst die Zutat der niedrigsten Rezeptstufe besorgen.
    for (const a of candidates) {
      for (const inp of a.inputs ?? []) {
        const src = this.findActionLooting(inp.itemId);
        if (src) return src;
      }
    }
    return null;
  }

  /**
   * Freigeschaltete Aktion, deren Loot `itemId` enthält — Gathering bevorzugt; Verarbeitung nur
   * mit verfügbaren Inputs (inkl. Lager-Entnahme), sonst rekursiv die Zutaten-Quelle.
   *
   * [Sweep6 T2-F1] Multi-Input-BALANCE: die Zutaten-Rekursion überspringt bereits GEDECKTE Inputs
   * (Bestand ≥ qty×3 = ensureInputs-Schwelle) und verfolgt den Engpass zuerst (wenigste gedeckte
   * Durchläufe). Vorher rekursierte sie stur in inputs[0] — der Seed-41-Lauf endete nach 30 h mit
   * 32 162 gravesteel_ore, 0 Kohle, 0 Klinge, weil der zweite Input nie beschafft wurde.
   */
  private findActionLooting(itemId: ItemId, seen: Set<ItemId> = new Set()): ActionDef | null {
    if (seen.has(itemId)) return null; // Rezept-Zyklen abfangen
    seen.add(itemId);
    const candidates = Object.values(this.content.actions)
      .filter((a) => this.actionUnlocked(a) && a.loot.some((l) => l.itemId === itemId))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    for (const a of candidates) {
      if (!a.inputs || a.inputs.length === 0) return a;
    }
    for (const a of candidates) {
      if (this.ensureInputs(a)) return a;
    }
    for (const a of candidates) {
      for (const inp of this.missingInputs(a)) {
        const src = this.findActionLooting(inp.itemId, seen);
        if (src) return src;
      }
    }
    return null;
  }

  /**
   * [Sweep6 T2-F1] Die noch UNGEDECKTEN Inputs einer Verarbeitungs-Aktion (Bestand < qty×3,
   * dieselbe Schwelle wie `ensureInputs`), sortiert nach Engpass (wenigste gedeckte Durchläufe
   * zuerst; Gleichstand: Rezept-Reihenfolge — deterministisch).
   */
  private missingInputs(a: ActionDef): Array<{ itemId: ItemId; qty: number }> {
    return (a.inputs ?? [])
      .map((inp, i) => ({
        inp,
        i,
        runs:
          (this.player.inventoryCount(inp.itemId) + this.player.bankCount(inp.itemId)) /
          Math.max(1, inp.qty),
      }))
      .filter((r) => r.runs < 3)
      .sort((x, y) => x.runs - y.runs || x.i - y.i)
      .map((r) => r.inp);
  }

  /**
   * [Sweep6 T2-F1/T4-#2] Kampf-Quelle für den Engpass-Input einer Rezept-Kette: wenn KEIN
   * Aktions-Pfad mehr existiert (`findActionLooting` == null), aber ein Monster den fehlenden
   * Input droppt (crude_bone, ember_essence …), ist JAGEN der nächste Schritt — vorher blockte
   * das Ziel an dieser Stelle fälschlich als „kein gangbarer Weg".
   */
  private findInputMonster(itemId: ItemId, seen: Set<ItemId> = new Set()): MonsterDef | null {
    if (seen.has(itemId)) return null;
    seen.add(itemId);
    // Mut-Deckel wie bei der freien Zielwahl: ein Input-Dropper weit über dem eigenen Niveau ist
    // keine Route, sondern eine Todesmühle (Seed 22: spectral_stag L58 @CL 1 für eine Bogensehne).
    const cap = this.targetLevelCap();
    const candidates = Object.values(this.content.actions)
      .filter((a) => this.actionUnlocked(a) && a.loot.some((l) => l.itemId === itemId))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    for (const a of candidates) {
      for (const inp of this.missingInputs(a)) {
        const m = this.findMonsterDropping(inp.itemId, cap);
        if (m) return m;
        const deeper = this.findInputMonster(inp.itemId, seen);
        if (deeper) return deeper;
      }
    }
    return null;
  }

  /** Niedrigste startbare Verarbeitungs-Aktion (für zielloses craft_items) — sonst deren Zutaten-Quelle. */
  private findAnyCraftAction(): ActionDef | null {
    const procs = Object.values(this.content.actions)
      .filter((a) => a.inputs && a.inputs.length > 0 && this.actionUnlocked(a))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    for (const a of procs) {
      if (this.ensureInputs(a)) return a;
    }
    for (const a of procs) {
      for (const inp of a.inputs ?? []) {
        const src = this.findActionLooting(inp.itemId);
        if (src && (!src.inputs || src.inputs.length === 0)) return src;
      }
    }
    return null;
  }

  /** Read-only-Hälfte von `ensureInputs`: sind alle Inputs (Inventar+Lager) für ≥3 Durchläufe da? */
  private inputsCovered(a: ActionDef): boolean {
    for (const inp of a.inputs ?? []) {
      const have = this.player.inventoryCount(inp.itemId) + this.player.bankCount(inp.itemId);
      if (have < inp.qty * 3) return false;
    }
    return true;
  }

  /**
   * Sind die Inputs einer Verarbeitungs-Aktion verfügbar (Inventar+Lager, ≥3 Durchläufe)?
   * Holt fehlende Mengen aus dem Lager ins Inventar (wie ein Spieler, der Material abholt).
   */
  private ensureInputs(a: ActionDef): boolean {
    if (!this.inputsCovered(a)) return false;
    for (const inp of a.inputs ?? []) {
      const want = inp.qty * 20; // Fenster-Vorrat, kein Hamstern
      const inInv = this.player.inventoryCount(inp.itemId);
      if (inInv < want) this.player.withdraw(inp.itemId, want - inInv);
    }
    return true;
  }

  /** Effektives Mut-Level der Zielwahl: Kampf-Niveau × bravery, nach Toden vorsichtiger. */
  private targetLevelCap(): number {
    const cl = Math.max(1, this.player.combatLevel());
    const cautionMult = Math.max(0.55, 1 - 0.15 * this.caution);
    return Math.max(1, Math.round(cl * this.bravery * cautionMult));
  }

  /** Niedrigst-stufiges (sicherstes) frei bekämpfbares Monster, das `itemId` droppt.
   *  `maxLevel` gesetzt ⇒ nur Ziele bis zu diesem Level (Mut-Deckel für opportunistische
   *  Beschaffungs-Jagden — [Sweep6 T4-#2]: die Craft-Route darf keine Selbstmord-Kämpfe wählen). */
  private findMonsterDropping(itemId: ItemId, maxLevel?: number): MonsterDef | null {
    const droppers = Object.values(this.content.monsters)
      .filter((m) => this.fightableTarget(m) && m.loot.some((l) => l.itemId === itemId))
      .filter((m) => maxLevel === undefined || m.level <= maxLevel)
      .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
    return droppers[0] ?? null;
  }

  /**
   * [Sweep6 W2-T2-F1] Ist das Monster ein LEGALES Ziel des ehrlichen Spielers? Konservativ wie
   * bisher (Slayer-Anforderungs-Monster werden pauschal gemieden — der Sim jagt kein Gate-Item)
   * PLUS das Engine-Gate `canFightMonster` (jetzt inkl. Tower-Etagen-Freischaltung, W2-T2-F6):
   * vorher farmten die Sim-Läufe Etage 2/3 mit Slayer 1 (36–62 % aller Kills illegal) — alle
   * Absolut-Zahlen der Sweeps waren nach oben verzerrt. Blacklist (Tod-Meidung) läuft obendrauf.
   * PLUS `dungeonOnly` (Welle P, 2026-07-13): startCombat verweigert Dungeon-Wellen-Monster hart
   * (combat.ts:296) und die Welt-Auswahl/der Slayer-Welt-Pool listen sie nicht — ein Persona-Ziel
   * darauf wäre nur eine Friction-Schleife („Kampf ließ sich nicht starten"), kein echtes Ziel.
   */
  private fightableTarget(m: MonsterDef): boolean {
    return (
      !m.slayerRequirement &&
      !m.dungeonOnly &&
      !this.isBlacklisted(m.id) &&
      canFightMonster(this.player.state, this.content, m.id)
    );
  }

  /**
   * Vor einer Multi-Goal-Idle-Strecke: die Aktivität des aussichtsreichsten Ziels anwerfen,
   * [Sweep5 T5] den Food-Puffer auf die Idle-Länge auslegen und Verarbeitungs-Aktionen tragfähig
   * machen (Zutaten bunkern / Sammel-Quelle).
   *
   * [Sweep5 T3, Idle-Fairness] Die Idle-Strecken sind der LÖWENANTEIL der Spielzeit — Fairness nur
   * über die 2-Minuten-Fenster reicht nicht (Seed 1337: smithing bekam seine Fenster, aber alle
   * Nächte gehörten dem Flow-Ziel → Lv 1 nach 30 h). Läuft schon etwas UND kein Ziel ist
   * ausgehungert, idlet die laufende Aktivität weiter (Flow). Ist ein Ziel deutlich unterversorgt,
   * gehört ihm die Strecke — wie ein Spieler, der „über Nacht" das vernachlässigte Ziel aufsetzt.
   *
   * [It2-Sched] „Ausgehungert" heißt jetzt AUFMERKSAMKEITS-ZEIT (`attentionMs`), nicht Fenster-
   * Zähler: das 2-Min-Garantie-Fenster resettete `sinceFocus` regelmäßig direkt vor der Nacht,
   * sodass die Idle-Fairness nie zündete (Seed 5: ALLE 340 Idle-Minuten gingen an den Kampf-Flow,
   * woodcutting blieb bei 3,5 %). Gibt das Ziel zurück, dem die Strecke gewidmet wurde (Besitzer) —
   * der pursue-Loop beendet die Strecke früh, sobald der Besitzer sein Soll erreicht.
   */
  private prepareForGoalIdle(trackers: GoalTracker[], idleMs: number, elapsedMs: number): GoalTracker | null {
    const s = this.player.state;
    const running = s.combat.monsterId !== null || s.activeActionId !== null;
    const eligible = trackers.filter((t) => !t.achieved && !t.blocked && t.cooldown === 0);
    this.updateGoldFloor(trackers);
    const starved = this.attentionStarved(eligible, elapsedMs);
    const worstWait = eligible.reduce((max, t) => Math.max(max, t.sinceFocus), 0);
    let owner: GoalTracker | null = null;
    if (!running || starved !== null || worstWait >= STARVATION_LIMIT) {
      const focus = starved ?? this.pickFocusGoal(trackers);
      // [Sched-Fix] Kandidaten in Prioritätsreihenfolge durchgehen: der gewählte Fokus zuerst,
      // dann die übrigen offenen/erfüllbaren Ziele. Liefert `goalTask` eines Kandidaten KEINEN
      // startbaren Task (z.B. weil es dabei erst blockiert — killMonster auf ein nicht existentes
      // Monster — oder gerade kein Weg offen ist), wird auf das nächste Ziel ROTIERT, statt die
      // ganze Idle-Strecke an den generischen Sammel-Fallback zu verschenken. Vorher schnappte
      // sich das (zeit-)ausgehungerte, aber strukturell blockierende Ghost-Ziel die Strecke,
      // nullte in `goalTask` weg und ein erfüllbares Skilling-Ziel (woodcutting) verhungerte
      // 113 Idle-Minuten neben ihm (Seed 9).
      const candidates = focus ? [focus, ...eligible.filter((t) => t !== focus)] : [...eligible];
      for (const cand of candidates) {
        let task = this.goalTask(cand);
        if (task?.kind === "action") task = this.idleSuitableTask(task, idleMs);
        if (task?.kind === "fight" && this.player.startCombat(task.monsterId)) {
          cand.sinceFocus = 0; // die Idle-Strecke gehört wirklich diesem Ziel
          owner = cand;
          this.lastCombatTarget = task.monsterId;
          this.lastTaskKind = "fight";
          this.logLine(`idle-Vorbereitung (Ziel): Kampf ${task.monsterId}`);
          break;
        }
        if (task?.kind === "action" && this.player.startAction(task.actionId)) {
          cand.sinceFocus = 0;
          owner = cand;
          this.lastTaskKind = "action";
          this.logLine(`idle-Vorbereitung (Ziel): ${task.actionId}`);
          break;
        }
      }
      if (!owner && !running) {
        this.prepareForIdle(idleMs);
        return null; // prepareForIdle versorgt die Strecke selbst (Food/Zutaten)
      }
    }
    this.sustainIdleAction(idleMs);
    this.stockFoodForIdle(idleMs);
    return owner;
  }

  // ── Entscheidungs-Takt ────────────────────────────────────────────────────────────────────

  /**
   * Ein aktives Entscheidungs-Fenster. `override` (Multi-Goal-Scheduler) schlägt eine Aktivität
   * vor; Versorgungs-Tasks (Food) behalten Vorrang — wie bei einem echten Spieler.
   * Gibt zurück, ob das Fenster tatsächlich dem Override gehörte (für die Blockade-Erkennung).
   */
  private decideAndAct(windowMs: number, override: Task | null = null): boolean {
    this.activeWindows++;
    if (this.caution > 0) this.caution -= 0.34; // Vorsicht klingt über ~3 Fenster ab

    const before = this.progressMarker();

    // 1) Rückblick: Warum ist die letzte Aktivität ausgelaufen? (Friction-Quellen)
    this.reviewStops();
    // 2) Upkeep in menschlicher Reihenfolge: Platz schaffen → Überschüsse verkaufen ([#279]
    //    Verkaufen ist seit #272 die EINZIGE Gold-Quelle — VOR Food/Gear, damit die
    //    Käufe darunter ein Budget haben) → Quest-Belohnungen abholen (EAGER, Sweep5 #6) →
    //    essen sichern → Gear (Reward-Gear wird so noch im selben Fenster angelegt).
    this.manageInventory();
    this.sellSurplusLoot();
    this.claimCompletedQuests();
    // [Food-Pass #5] Verkaufs-Pass + Quest-Claims sind die EINKOMMENS-Ereignisse des Fensters —
    // die Zielgeraden-Reserve eines Gold-Ziels JETZT nachziehen, bevor Food/Gear darunter
    // das frische Gold ausgeben. Der updateGoldFloor-Aufruf am Fenster-Anfang (pursueWindow) sah
    // nur den Vor-Verkaufs-Kontostand: ein 683-g-Windfall wurde im selben Fenster für 616 g Food
    // verfrühstückt und gold(500) latchte trotz Reserve-Durchreich nie (Seed 5, Food-Werte-Pass).
    if (this.pursueTrackers) this.updateGoldFloor(this.pursueTrackers);
    this.manageFood();
    this.upgradeGear();

    // 3) Aktivität wählen (Versorgungs-Task > Ziel-Override > freie Wahl) und ausführen.
    const task = this.pendingTask ?? override ?? this.chooseActivity();
    const ranOverride = override !== null && task === override;
    this.pendingTask = null;
    if (task) this.execute(task, windowMs);
    else {
      // Nichts Sinnvolles gefunden (sollte praktisch nie passieren) → Zeit vergeht trotzdem.
      this.frictions.add({
        moment: this.moment("Aktivitätswahl"),
        what: "Keine ausführbare Aktivität gefunden",
        whyConfusing: "Der Spieler steht ratlos da: kein startbares Monster und keine startbare Aktion.",
        evidence: { combatLevel: this.player.combatLevel(), totalLevel: this.player.snapshot().totalLevel },
      });
      this.advance(windowMs);
    }

    // 4) Null-Fortschritt-Erkennung über aktive Fenster.
    const after = this.progressMarker();
    if (after === before) {
      this.zeroProgressWindows++;
      if (this.zeroProgressWindows >= ZERO_PROGRESS_LIMIT && !this.zeroProgressReported) {
        this.zeroProgressReported = true;
        this.frictions.add({
          moment: this.moment("mehrere aktive Fenster"),
          what: `Kein Fortschritt über ${this.zeroProgressWindows} aktive Fenster`,
          whyConfusing:
            "Trotz aktiven Spielens ändern sich weder XP noch Gold noch Items — der Spieler fragt sich, ob er etwas falsch macht.",
          evidence: { marker: after },
        });
      }
    } else {
      this.zeroProgressWindows = 0;
      this.zeroProgressReported = false;
    }
    return ranOverride;
  }

  /** Kompakter Fortschritts-Fingerabdruck (XP+Gold+Kills+Items) für die Stillstand-Erkennung. */
  private progressMarker(): string {
    const s = this.player.state;
    let xp = 0;
    for (const skill of Object.values(s.skills)) xp += skill.xp;
    return `${Math.round(xp)}|${s.character.gold}|${s.stats.kills}|${s.stats.itemsGathered}`;
  }

  // ── Rückblick auf Auto-Stopps (Friction-Quellen) ──────────────────────────────────────────

  private reviewStops(): void {
    const s = this.player.state;
    // Aktion wegen vollem Inventar gestoppt → das nervt einen echten Spieler.
    // [Sweep6 T4-#3] Loot-Skip statt Dauerschleife: ist die Entlastung nachweislich wirkungslos
    // (inventoryStuck), ist jeder weitere Voll-Stopp DIESELBE bekannte Reibung — nur 1× melden.
    if (s.lastStop?.reason === "inventory_full") {
      if (!this.inventoryStuck) {
        this.frictions.add({
          moment: this.moment(`Aktion ${s.lastStop.actionId}`),
          what: "Aktion stoppte: Inventar voll",
          whyConfusing: "Die Idle-Aktion lief ins volle Inventar und stand still, bis der Spieler zurückkam.",
          evidence: { used: this.player.inventoryUsed(), capacity: this.player.inventoryCapacity() },
        });
      }
      s.lastStop = null; // quittiert (wie ein Spieler, der den Hinweis wegklickt)
    }
    // Kampf-Auto-Stopps. ("outOfAmmo" existiert seit #286 nicht mehr — Bögen feuern immer.)
    const reason = s.combat.stopReason;
    if (reason === "stalemate") {
      this.frictions.add({
        moment: this.moment("Kampf"),
        what: "Kampf stoppte: Patt (kein Netto-Fortschritt)",
        whyConfusing: "Der Kampf lief minutenlang ohne Fortschritt und brach dann ab — dem Spieler fehlt der Hinweis, WAS zu schwach ist.",
        evidence: { combatLevel: this.player.combatLevel() },
      });
      s.combat.stopReason = undefined;
    }
    // Tod in einer Idle-Strecke (Kampf-Fenster-Tode laufen direkt über handleDefeat): dem zuletzt
    // selbst gewählten Ziel zuordnen — ein Mensch weiß auch nach dem Schlafen noch, WER ihn erlegt hat.
    if (reason === "defeated") {
      s.combat.stopReason = undefined;
      if (this.lastCombatTarget) this.handleDefeat(this.lastCombatTarget);
    }
  }

  // ── Tod & Zielwahl ────────────────────────────────────────────────────────────────────────

  /**
   * Reaktion auf eine Niederlage (öffentlich, damit Tests die Heuristik direkt prüfen können):
   * Vorsicht rauf („besser vorbereiten": mehr Food, leichteres Ziel), Tode je Monster zählen,
   * ab `DEATH_BLACKLIST_AT` Toden am selben Ziel → Friction-Event + Ziel meiden (mit Ablauf, s.
   * `isBlacklisted`); der Eintrag merkt sich die Stärke des Spielers beim Meiden.
   */
  handleDefeat(monsterId: MonsterId): void {
    this.caution = Math.min(3, this.caution + 1.5);
    const n = (this.deathsByMonster.get(monsterId) ?? 0) + 1;
    this.deathsByMonster.set(monsterId, n);
    this.logLine(`Tod #${n} an ${monsterId} → vorsichtiger vorbereiten`);
    if (n >= DEATH_BLACKLIST_AT && !this.blacklist.has(monsterId)) {
      this.blacklist.set(monsterId, {
        cl: this.player.combatLevel(),
        gear: this.totalGearScore(),
        atMs: this.simTimeMs,
      });
      const m = this.content.monsters[monsterId];
      this.frictions.add({
        moment: this.moment(`Kampf gegen ${monsterId}`),
        what: `Wiederholt gestorben an ${monsterId} (Lv${m?.level ?? "?"}) — Ziel gewechselt`,
        whyConfusing:
          "Der Spieler ist trotz Vorbereitung mehrfach am selben Gegner gestorben; ohne klaren Stärke-Hinweis wirkt der Gegner unfair statt schlicht zu früh.",
        evidence: {
          deaths: n,
          combatLevel: this.player.combatLevel(),
          monsterLevel: m?.level,
          food: this.player.state.character.food,
        },
      });
    }
  }

  /**
   * Ist dieses Ziel nach wiederholten Toden (noch) auf der Meide-Liste? [Sweep5 T2] Einträge
   * LAUFEN AB: nach `+RETRY_CL_GAIN` Kampf-Niveau, `+RETRY_GEAR_GAIN` Gear-Score oder
   * `RETRY_COOLDOWN_MS` Sim-Zeit wird das Ziel wieder freigegeben. Der Todeszähler fällt dabei
   * auf `DEATH_BLACKLIST_AT − 1` zurück: der NÄCHSTE Tod meidet sofort erneut — mit frischem
   * Stärke-Schnappschuss, d.h. der übernächste Anlauf braucht wieder echten Zuwachs.
   * (Reader für Zielwahl/Tests/Reports; räumt abgelaufene Einträge dabei auf.)
   */
  isBlacklisted(monsterId: MonsterId): boolean {
    const entry = this.blacklist.get(monsterId);
    if (!entry) return false;
    const stronger =
      this.player.combatLevel() >= entry.cl + RETRY_CL_GAIN ||
      this.totalGearScore() >= entry.gear + RETRY_GEAR_GAIN;
    const waited = this.simTimeMs - entry.atMs >= RETRY_COOLDOWN_MS;
    if (!stronger && !waited) return true;
    this.blacklist.delete(monsterId);
    this.deathsByMonster.set(monsterId, DEATH_BLACKLIST_AT - 1);
    this.logLine(`traue mich wieder an ${monsterId} (${stronger ? "stärker geworden" : "genug Zeit vergangen"})`);
    return false;
  }

  /** Gear-Score-Summe der aktuell angelegten Ausrüstung (Stärke-Marker für den Blacklist-Ablauf). */
  private totalGearScore(): number {
    let sum = 0;
    for (const id of Object.values(this.player.state.character.equipment)) {
      if (id) sum += this.gearScore(this.content.items[id]);
    }
    return sum;
  }

  /**
   * Bestes plausibles Kampf-Ziel mit SEEDED VARIANZ: Kandidaten = Monster ≤ effektivem Mut-Level
   * (Kampf-Niveau × bravery, nach Toden vorsichtiger), ohne Slayer-Gate & ohne Blacklist. Meist das
   * höchste, mit ~30 % Chance eines der Top-3 (echte Spieler farmen nicht immer optimal).
   */
  pickCombatTarget(): MonsterDef | null {
    const capLevel = this.targetLevelCap();
    // [Sweep6 W2-T2-F1] fightableTarget spiegelt das Engine-Gate (canFightMonster inkl.
    // Tower-Etagen) — gesperrte Turm-Mobs sind keine Ziele mehr.
    const all = Object.values(this.content.monsters)
      .filter((m) => this.fightableTarget(m))
      .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
    if (all.length === 0) return null;
    const eligible = all.filter((m) => m.level <= capLevel);
    if (eligible.length === 0) return all[0]!; // nichts auf Augenhöhe → das schwächste nehmen
    if (eligible.length > 1 && nextFloat(this.rng) < 0.3) {
      const top = eligible.slice(-Math.min(3, eligible.length));
      return top[nextInt(this.rng, 0, top.length - 1)]!;
    }
    return eligible[eligible.length - 1]!;
  }

  /**
   * Beste freigeschaltete SKILLING-Aktion eines (seeded gewählten) Skills — mit Varianz analog zur
   * Zielwahl. [Sweep6 W2-T7-F2/W2-T1-F1] Neben input-losen Sammel-Aktionen zählen jetzt auch
   * VERARBEITUNGS-Aktionen mit GEDECKTEN Inputs (Inventar+Lager ≥ 3 Durchläufe): Runecrafting hat
   * KEINE input-losen Aktionen und blieb im Free-Play deshalb für immer Level 1 (Seed 77: 30 h
   * gnarled_staff, rc 1) — dabei lagen die Essenzen längst im Lager. Wird eine Verarbeitung
   * gewählt, holt `ensureInputs` das Material ins Inventar (wie ein Spieler, der Material abholt).
   */
  private pickGatherAction(): ActionDef | null {
    const gathers = Object.values(this.content.actions).filter(
      (a) =>
        this.actionUnlocked(a) &&
        (!a.inputs || a.inputs.length === 0 || this.inputsCovered(a)),
    );
    if (gathers.length === 0) return null;
    // Skill seeded wählen (stabil sortiert), dann darin die höchste freigeschaltete Aktion (mit Varianz).
    const skills = [...new Set(gathers.map((a) => a.skill))].sort();
    const skill = skills[nextInt(this.rng, 0, skills.length - 1)]!;
    const ofSkill = gathers
      .filter((a) => a.skill === skill)
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    let pick: ActionDef;
    if (ofSkill.length > 1 && nextFloat(this.rng) < 0.3) {
      const top = ofSkill.slice(-Math.min(3, ofSkill.length));
      pick = top[nextInt(this.rng, 0, top.length - 1)]!;
    } else {
      pick = ofSkill[ofSkill.length - 1]!;
    }
    if (pick.inputs && pick.inputs.length > 0) this.ensureInputs(pick); // Material abholen
    return pick;
  }

  private actionUnlocked(a: ActionDef): boolean {
    return this.player.level(a.skill) >= (a.levelRequired ?? 1);
  }

  private chooseActivity(): Task | null {
    if (nextFloat(this.rng) < this.skillingBias) {
      const gather = this.pickGatherAction();
      if (gather) return { kind: "action", actionId: gather.id, label: `Skilling ${gather.skill}` };
    }
    const target = this.pickCombatTarget();
    if (target) return { kind: "fight", monsterId: target.id };
    const gather = this.pickGatherAction();
    return gather ? { kind: "action", actionId: gather.id, label: `Skilling ${gather.skill}` } : null;
  }

  // ── Ausführung ────────────────────────────────────────────────────────────────────────────

  private execute(task: Task, windowMs: number): void {
    this.lastTaskKind = task.kind;
    if (task.kind === "fight") {
      this.fightWindow(task.monsterId, windowMs);
      return;
    }
    if (!this.player.startAction(task.actionId)) {
      const a = this.content.actions[task.actionId];
      this.frictions.add({
        moment: this.moment(task.label),
        what: `Aktion ${task.actionId} ließ sich nicht starten`,
        whyConfusing: "Die Aktion wirkte verfügbar, startete aber nicht — ohne Begründung für den Spieler.",
        evidence: { level: a ? this.player.level(a.skill) : undefined, required: a?.levelRequired },
      });
      this.advance(windowMs);
      return;
    }
    this.logLine(`${task.label}: ${task.actionId}`);
    this.advance(windowMs);
  }

  /** Kämpft ein Fenster gegen `monsterId`; reagiert menschlich auf jeden Auto-Stopp. */
  private fightWindow(monsterId: MonsterId, windowMs: number): void {
    const s = this.player.state;
    if (!this.player.startCombat(monsterId)) {
      this.frictions.add({
        moment: this.moment(`Kampfstart ${monsterId}`),
        what: `Kampf gegen ${monsterId} ließ sich nicht starten`,
        whyConfusing: "Das Monster stand zur Wahl, der Kampf startete aber nicht (Gate ohne sichtbaren Grund?).",
        evidence: { combatLevel: this.player.combatLevel() },
      });
      this.advance(windowMs);
      return;
    }
    this.lastCombatTarget = monsterId;
    this.logLine(`Kampf: ${monsterId}`);
    const killsBefore = s.stats.kills;
    let elapsed = 0;
    while (elapsed < windowMs) {
      const step = Math.min(FIGHT_CHUNK_MS, windowMs - elapsed);
      this.advance(step);
      elapsed += step;
      if (s.combat.monsterId !== null) continue;
      // Kampf endete von selbst → Grund ansehen und wie ein Mensch reagieren.
      const reason = s.combat.stopReason;
      s.combat.stopReason = undefined;
      if (reason === "defeated") {
        this.handleDefeat(monsterId);
        return; // Rest des Fensters „verdauen": nächstes Fenster bereitet besser vor
      }
      // "outOfAmmo" existiert seit #286 nicht mehr — Bögen feuern immer.
      if (reason === "stalemate") {
        this.frictions.add({
          moment: this.moment(`Kampf gegen ${monsterId}`),
          what: `Patt gegen ${monsterId} — kein Durchkommen`,
          whyConfusing: "Der Kampf machte keinerlei Netto-Fortschritt; für den Spieler fühlt sich das wie ein stiller Softlock an.",
          evidence: { combatLevel: this.player.combatLevel(), monsterLevel: this.content.monsters[monsterId]?.level },
        });
        this.caution = Math.min(3, this.caution + 1); // wie ein Tod: leichteres Ziel probieren
        return;
      }
      // Sonstiger Stopp (z.B. Dungeon-Ende) → einfach neu einsteigen.
      if (!this.player.startCombat(monsterId)) return;
    }
    const kills = s.stats.kills - killsBefore;
    // Volles Fenster, 0 Kills, Gegner eigentlich auf Augenhöhe → fühlt sich falsch an.
    const m = this.content.monsters[monsterId];
    if (kills === 0 && m && m.level <= this.player.combatLevel()) {
      this.frictions.add({
        moment: this.moment(`Kampf gegen ${monsterId}`),
        what: `Volle ${Math.round(windowMs / 60000)} Min gegen ${monsterId} (Lv${m.level}) ohne einen einzigen Kill`,
        whyConfusing: "Ein Gegner auf/unter dem eigenen Niveau sollte in Minuten fallen — hier passierte sichtbar nichts.",
        evidence: { combatLevel: this.player.combatLevel(), monsterLevel: m.level },
      });
    }
  }

  /** Vor einer Idle-Strecke: sicherstellen, dass etwas Sinnvolles weiterläuft — und für
   *  Kampf-Idle [Sweep5 T5] genug Food für die GANZE Strecke bunkern. */
  private prepareForIdle(idleMs: number): void {
    const s = this.player.state;
    if (s.combat.monsterId === null && s.activeActionId === null) {
      // Nichts läuft → lieber eine sichere Sammel-Aktion anwerfen als Leerlauf zu idlen.
      const gather = this.pickGatherAction();
      if (gather && this.player.startAction(gather.id)) {
        this.logLine(`idle-Vorbereitung: ${gather.id}`);
      } else {
        const target = this.pickCombatTarget();
        if (target && this.player.startCombat(target.id)) this.lastCombatTarget = target.id;
      }
    }
    this.sustainIdleAction(idleMs);
    this.stockFoodForIdle(idleMs);
  }

  /**
   * [Sweep5 T3/T5] Läuft eine VERARBEITUNGS-Aktion in die Idle-Strecke, muss sie die Strecke auch
   * tragen: Zutaten aus dem Lager fürs Durchhalten bunkern — reicht der Gesamtvorrat nicht, auf
   * die Sammel-Quelle der Zutat umsatteln (menschlich: nachts Erz hacken, morgens schmelzen).
   * Sonst stirbt die Nacht nach Minuten an leeren Inputs und die restliche Strecke verfällt still.
   */
  private sustainIdleAction(idleMs: number): void {
    const s = this.player.state;
    if (!s.activeActionId) return;
    const running: Extract<Task, { kind: "action" }> = {
      kind: "action",
      actionId: s.activeActionId,
      label: "laufende Aktion",
    };
    const suited = this.idleSuitableTask(running, idleMs);
    if (suited.actionId !== running.actionId && this.player.startAction(suited.actionId)) {
      this.logLine(`idle-Vorbereitung: ${suited.actionId} statt ${running.actionId} (Zutaten-Reichweite)`);
    }
  }

  /**
   * Idle-Tauglichkeit einer Aktions-Aufgabe: Verarbeitung, deren Inputs (Inventar+Lager) die
   * Strecke nicht tragen, wird durch die reine Sammel-Quelle der fehlenden Zutat ersetzt;
   * andernfalls werden die Zutaten fürs Durchhalten ins Inventar geholt (Lager-Entnahme).
   */
  private idleSuitableTask(
    task: Extract<Task, { kind: "action" }>,
    idleMs: number,
  ): Extract<Task, { kind: "action" }> {
    const a = this.content.actions[task.actionId];
    if (!a || !a.inputs || a.inputs.length === 0) return task;
    const runs = Math.max(1, Math.floor(idleMs / Math.max(1000, a.durationMs)));
    for (const inp of a.inputs) {
      const have = this.player.inventoryCount(inp.itemId) + this.player.bankCount(inp.itemId);
      if (have >= inp.qty * runs) continue;
      const src = this.findActionLooting(inp.itemId);
      if (src && (!src.inputs || src.inputs.length === 0)) {
        return { kind: "action", actionId: src.id, label: `${task.label} (Zutaten sammeln)` };
      }
    }
    for (const inp of a.inputs) {
      const want = inp.qty * runs;
      const inInv = this.player.inventoryCount(inp.itemId);
      if (inInv < want) this.player.withdraw(inp.itemId, want - inInv);
    }
    return task;
  }

  /**
   * [Sweep5 T5] Food-Puffer proportional zur Idle-Länge aufstocken (nur für Kampf-Idle — Sammeln
   * isst nichts). Vorher ging der Spieler mit maximal 40 Food in bis zu 3 h Kampf-Idle; die
   * meisten Idle-Tode fielen ans Ende leergegessener Strecken. Kaufen ist hier der einzige
   * schnelle Weg (kochen würde die Idle-Aktivität ersetzen); reicht das Gold nicht, bleibt der
   * bisherige Puffer stehen.
   */
  private stockFoodForIdle(idleMs: number): void {
    const s = this.player.state;
    if (s.combat.monsterId === null) return;
    const target = Math.min(
      IDLE_FOOD_MAX,
      Math.max(FOOD_TARGET, Math.ceil((idleMs / 60_000) * IDLE_FOOD_PER_MIN)),
    );
    const have = s.character.food ? this.player.inventoryCount(s.character.food) : 0;
    if (have >= target) return;
    // [It2-Sched] Der Nacht-Puffer über den Basis-Vorrat hinaus ist ein LUXUS-Kauf: auf der
    // Zielgeraden eines Gold-Ziels respektiert er die erhöhte Reserve (sonst floss vor jeder
    // Nacht alles über der 60er-Reserve in Food und der Kontostand latchte nie — Seed 5).
    const bought = this.buyFood(target - have, this.luxuryReserve);
    if (bought > 0) {
      // [Sweep6 T1-#2] Mindestmengen-Guard wie in `manageFood` — und wenn KEIN Stapel die
      // FOOD_LOW-Schwelle schafft, gewinnt der GRÖSSTE Stapel statt des heilstärksten
      // Mini-Stacks: Seed 62 setzte hier den 4er-Stack minor_healing_potion (heal 3) als
      // Auto-Eat, der nach ~90 s leergegessen war → Idle-Tod mit 14 ungenutzten Food-Items.
      const best = this.bestFoodInInventory(FOOD_LOW) ?? this.largestFoodStack();
      if (best) this.player.setFood(best);
      this.logLine(`idle-Vorbereitung: Food-Puffer +${bought} (Ziel ${target})`);
    }
  }

  // stockAmmoForIdle: ENTFERNT (#286 Ammo-Removal) — kein Munitions-Bevorraten mehr.

  // ── Upkeep: Inventar / Food / Gear ────────────────────────────────────────────────────────

  private manageInventory(): void {
    // 0) [#246] Junk aus der UNBEGRENZTEN Instanz-Tasche verkaufen. Sie erzeugt keinen Slot-Druck,
    //    läuft also VOR (und unabhängig von) dem Slot-Druck-Gate darunter — sonst häuften sich
    //    gedroppte/gecraftete Junk-Instanzen (stil-fremd oder kein Upgrade) endlos an und ihr Gold
    //    bliebe liegen (Beleg: Magie-Seed 63 — 170 dim_focus-Instanzen gestapelt, gold-verhungert).
    this.sellJunkInstances();
    const used = this.player.inventoryUsed();
    const cap = this.player.inventoryCapacity();
    if (cap <= 0 || used / cap < INVENTORY_PRESSURE) {
      this.inventoryStuck = false; // Druck weg → Entlastung darf wieder normal melden
      return;
    }
    const s = this.player.state;
    // 1) Materialien in die Bank (Rohstoffe hortet man, sie sind Craft-Futter).
    for (const slot of [...s.inventory.slots]) {
      if (!slot || slot.instance) continue;
      const item = this.content.items[slot.itemId];
      if (!item || item.type !== "material") continue;
      this.player.deposit(slot.itemId, slot.qty);
    }
    // 2) Junk verkaufen: poor-Rarity-Reste + Ausrüstung, die stil-fremd oder kein Upgrade ist.
    // [Sweep6 T3-F2] Der frühere „Backup-Bogen wegen Pfeilsorte"-Behalte-Guard ist mit der
    // Munitions-Entkopplung gegenstandslos (jeder Pfeil fliegt aus jedem Bogen) — entfernt.
    for (const slot of [...s.inventory.slots]) {
      if (!slot || slot.instance) continue;
      const item = this.content.items[slot.itemId];
      if (!item) continue;
      const isJunkMaterial = item.type === "material" && item.rarity === "poor";
      // equipBar statt equippedScore: 2H-bewusst — ein Schild ist für den Stab-Träger kein
      // „potentielles Upgrade", sondern Junk (sonst hortet der 2H-Träger endlos Offhands).
      // [Sweep6 W2-T6-F2] AUSNAHME: der Offhand, der die anstehende 2H→1H-Kombi trägt, bleibt —
      // manageInventory läuft VOR upgradeGear, sonst wäre der Schild verkauft, bevor der
      // Waffentausch (Schwert+Schild schlägt Speer) im selben Fenster feuert.
      const isUselessGear =
        item.type === "equipment" &&
        !!item.slot &&
        (!this.styleFits(item) || this.gearScore(item) <= this.equipBar(item)) &&
        !this.comboKeeper(item);
      if (isJunkMaterial || isUselessGear) {
        this.player.sell(slot.itemId, slot.qty);
      }
    }
    // [Sweep6 T4-#3] Entlastung MISST jetzt ihren Erfolg: kein freigeräumter Slot ⇒ 1× Friction
    // („Inventar voll, nichts bankbar/verkaufbar"), dann Loot-Skip statt No-op-Schleife — vorher
    // loggte der Lauf stundenlang „Inventar entlastet (20/20 → 20/20)" bei nicht-stapelbarem Loot.
    const after = this.player.inventoryUsed();
    if (after < used) {
      this.inventoryStuck = false;
      this.logLine(`Inventar entlastet (${used}/${cap} → ${after}/${cap})`);
    } else if (!this.inventoryStuck) {
      this.inventoryStuck = true;
      this.logLine("Inventar voll — nichts bankbar/verkaufbar, weiterer Loot geht verloren");
      this.frictions.add({
        moment: this.moment("Inventar"),
        what: "Inventar voll — Entlastung wirkungslos (nichts bankbar/verkaufbar)",
        whyConfusing:
          "Trotz Aufräum-Versuch bleibt jeder Slot belegt (nicht-stapelbarer Loot); weitere Beute geht verloren, ohne dass der Spieler einen Ausweg sieht.",
        evidence: { used, capacity: cap },
      });
    }
  }

  /**
   * [#279 Verkaufs-Ökonomie] Verkauft Material-ÜBERSCHÜSSE über der Hort-Schwelle `MATERIAL_KEEP`
   * (Inventar + Lager zusammen) am Händler. Seit #272 droppen Monster kein Roh-Gold mehr
   * (MonsterDef.gold = 0 auf allen Monstern) — Gold entsteht AUSSCHLIESSLICH beim Verkaufen;
   * ohne diesen Pass verhungerte der ehrliche Spieler finanziell (kein Food-/Munitions-/Gear-
   * Budget), während sein Lager überquoll. Läuft in JEDEM aktiven Fenster (decideAndAct-Upkeep).
   *
   * Tabu (wird nie verkauft):
   *  - Stil-Munition des Fernkämpfers (Pfeile sind seine Betriebskosten, kein Loot),
   *  - Ziel-Items offener obtainItem-Ziele (`protectedItems`, nur in pursue befüllt),
   *  - Inputs der gerade LAUFENDEN bzw. als pendingTask GEPLANTEN Verarbeitung (mitten im
   *    Craft-Fenster verkauft niemand sein Rezept-Material — auch nicht den Nacht-Vorrat
   *    über der Hort-Schwelle, den idleSuitableTask mit qty×runs bunkert).
   * Alles andere Material über der Schwelle geht weg: erst der Inventar-Bestand, der Rest wird
   * aus dem Lager geholt (wie ein Spieler am Händler). Ausrüstung verkauft weiterhin NUR der
   * Druck-Pfad in manageInventory bzw. sellJunkInstances (Upgrade-Kandidaten bleiben liegen).
   * Zieht kein RNG; Kandidaten alphabetisch — verkaufsdeterministisch.
   */
  private sellSurplusLoot(): void {
    const s = this.player.state;
    const keep = new Set<ItemId>(this.protectedItems);
    const active = s.activeActionId ? this.content.actions[s.activeActionId] : null;
    for (const inp of active?.inputs ?? []) keep.add(inp.itemId);
    if (this.pendingTask?.kind === "action") {
      for (const inp of this.content.actions[this.pendingTask.actionId]?.inputs ?? []) keep.add(inp.itemId);
    }
    const candidates = new Set<ItemId>();
    for (const slot of s.inventory.slots) {
      if (slot && !slot.instance) candidates.add(slot.itemId);
    }
    for (const [itemId, qty] of Object.entries(s.bank)) {
      if (typeof qty === "number" && qty > 0) candidates.add(itemId);
    }
    let earned = 0;
    for (const itemId of [...candidates].sort()) {
      const item = this.content.items[itemId];
      if (!item || item.type !== "material") continue;
      if (keep.has(itemId)) continue;
      // Hort-Schwelle nur für Craft-Futter — reiner Trophäen-Junk (kein Rezept-Input) ist im
      // Content BEWUSST als Verkaufs-Gold angelegt und wird komplett versilbert.
      const cap = this.craftInputIds.has(itemId) ? MATERIAL_KEEP : 0;
      let surplus = this.player.inventoryCount(itemId) + this.player.bankCount(itemId) - cap;
      if (surplus <= 0) continue;
      const fromInv = Math.min(surplus, this.player.inventoryCount(itemId));
      if (fromInv > 0) {
        earned += this.player.sell(itemId, fromInv);
        surplus -= fromInv;
      }
      if (surplus > 0) {
        // Rest liegt im Lager → abholen und verkaufen (withdraw liefert, was ins Inventar passt).
        const got = this.player.withdraw(itemId, surplus);
        if (got > 0) earned += this.player.sell(itemId, got);
      }
    }
    if (earned > 0) this.logLine(`Überschüsse verkauft: +${earned} Gold`);
  }

  /**
   * [#246] Verkauft Junk-Instanzen aus der Instanz-Tasche (`inventory.instances`): stil-fremde oder
   * kein-Upgrade-Gear-Instanzen. Ein echtes Upgrade bleibt liegen, bis `upgradeGear` es anlegt —
   * danach schlägt jeder weitere identische Kandidat die `equipBar` nicht mehr und wird verkauft
   * (selbst-korrigierend, es wird nie ein Keeper verkauft). Zieht kein RNG (verkaufsdeterministisch).
   */
  private sellJunkInstances(): void {
    for (const inst of [...this.player.state.inventory.instances]) {
      const item = this.content.items[inst.baseItemId];
      if (!item || item.type !== "equipment" || !item.slot) continue;
      const junk = !this.styleFits(item) || this.gearScore(item) <= this.equipBar(item);
      if (junk) this.player.sellInstance(inst.instanceId);
    }
  }

  private manageFood(): void {
    const c = this.player.state.character;
    // Bestes AUSREICHEND BEVORRATETES Food als Auto-Eat setzen (auch wenn schon eines gesetzt ist:
    // upgraden). Wichtig: 2 Notfall-Potions schlagen KEINEN 500er-Stapel Shrimp — sonst klemmt der
    // Spieler in einer ewigen Nachkoch-Schleife, obwohl massig Food da ist (Multi-Goal-Probe, Seed 5).
    const best = this.bestFoodInInventory(FOOD_LOW) ?? this.bestFoodInInventory();
    if (best && c.food !== best) this.player.setFood(best);
    if (c.food && this.player.inventoryCount(c.food) === 0) c.food = null; // leergegessen
    const count = c.food ? this.player.inventoryCount(c.food) : 0;
    if (count >= FOOD_LOW) return;

    // Nachschub-Plan A: kochen (wenn ein freigeschaltetes Rezept + Material da ist).
    const cook = this.findCookableAction();
    if (cook) {
      this.pendingTask = { kind: "action", actionId: cook.id, label: "Food kochen" };
      return;
    }
    // Plan B: kaufen (Shop), Gold-Reserve respektieren — INKLUSIVE der erhöhten Luxus-Reserve
    // auf der Zielgeraden eines Gold-Ziels (Food-Pass-#5-Fund: ohne sie fraß ein Loot-Windfall-
    // Notkauf ~616 g auf einen Schlag und das gold(500)-Ziel latchte nie; der Schwester-Aufruf
    // in stockFoodForIdle übergibt luxuryReserve bereits genauso).
    const bought = this.buyFood(undefined, this.luxuryReserve);
    if (bought > 0) {
      const nowBest = this.bestFoodInInventory();
      if (nowBest) this.player.setFood(nowBest);
      this.logLine(`Food gekauft (+${bought})`);
      return;
    }
    // Plan C: Zutaten besorgen (Fischen/Sammeln für das niedrigste Koch-Rezept).
    const gatherForCook = this.findGatherForCooking();
    if (gatherForCook) {
      this.pendingTask = { kind: "action", actionId: gatherForCook.id, label: "Zutaten sammeln" };
      return;
    }
    if (count === 0) {
      this.frictions.add({
        moment: this.moment("Food-Nachschub"),
        what: "Kein Food beschaffbar (weder kochen noch kaufen noch Zutaten sammeln)",
        whyConfusing: "Ohne Heil-Nahrung sind kommende Kämpfe deutlich riskanter — und es gibt keinen gangbaren Weg, welche zu bekommen.",
        evidence: { gold: this.player.gold(), cookingLevel: this.player.level("cooking") },
      });
    }
  }

  // manageAmmo / weaponNeedsAmmo / ownedAmmoCounts / bestOwnedArrow / equipBestArrow /
  // bestShopArrow(+Affordable): ENTFERNT (#286 Ammo-Removal) — die komplette Munitions-Heuristik
  // (Köcher-Upkeep, Pfeil-Nachkauf, Fletch-Route) ist mit dem Munitions-System gestorben.

  private upgradeGear(): void {
    // 1) Upgrades aus dem Inventar anziehen (Drops/Crafts/Käufe).
    const seen = new Set<ItemId>();
    for (const slot of [...this.player.state.inventory.slots]) {
      if (!slot || slot.instance || seen.has(slot.itemId)) continue;
      seen.add(slot.itemId);
      this.tryEquipUpgrade(slot.itemId);
    }
    // 1b) [#246] Upgrades aus der Instanz-Tasche anziehen: verzauberte/gesuffixte Gear-Instanzen liegen
    //     jetzt in `inventory.instances` statt in Slots — ohne diesen Scan würde ein gecraftetes/
    //     gedropptes Instanz-Upgrade nie angelegt (der Slot-Scan oben sieht es nicht).
    for (const inst of [...this.player.state.inventory.instances]) {
      this.tryEquipInstanceUpgrade(inst);
    }
    // 2) Shop-Upgrade kaufen (max. eines pro Fenster — Menschen shoppen nicht das ganze Sortiment).
    const buy = this.bestShopUpgrade();
    if (buy) {
      const bought = this.player.buy(buy.itemId, 1);
      if (bought > 0) {
        this.tryEquipUpgrade(buy.itemId);
        this.logLine(`Gear gekauft: ${buy.itemId}`);
      }
    }
    // 3) [Sweep6 T4-#2] Craft-Route: bietet der Shop KEIN Mainhand-Upgrade mehr (Waffen-Decke),
    //    das beste craftbare, tragbare Waffen-Upgrade als Versorgungs-Task verfolgen — Rezept
    //    fahren bzw. dessen fehlende Inputs sammeln/erjagen. Magie-Waffen sind ~100 % craft-/
    //    drop-gebunden (T4 Seed 63: 40 h auf gnarled_staff trotz freiem Craft-Rezept); für
    //    Ranged ist Fletching per Chef-Entscheid DIE Bogen-Progression (T3-F3).
    if (!this.pendingTask) {
      const craft = this.craftWeaponUpgradeTask();
      if (craft) this.pendingTask = craft;
    }
  }

  /** Gibt es im Shop ein stil-treues, tragbares Mainhand-Upgrade (Budget egal — dafür spart man)? */
  private shopHasMainhandUpgrade(): boolean {
    for (const e of this.content.shop) {
      const item = this.content.items[e.itemId];
      if (!item || item.type !== "equipment" || item.slot !== "mainhand") continue;
      if (!this.styleFits(item) || !this.meetsItemRequirements(item)) continue;
      if (this.gearScore(item) > this.equipBar(item)) return true;
    }
    return false;
  }

  /**
   * [Regression-Fix] Trägt die aktuell angelegte Mainhand noch on-level-Kämpfe? Heuristik: ihr
   * gearScore (≈ DPS×9) muss mit dem Kampf-Niveau Schritt halten (on-level-Content-HP skaliert grob
   * mit CL) — liegt er darüber, kämpft der Spieler statt eine marginal bessere Craft-Waffe zu grinden.
   * Nur wenn NEIN, ist die Craft-Route der richtige Weg (echter Stuck-Fall: der Magier klebt CL 26 auf
   * gnarled_staff, dessen ~0-DPS keinen CL-26-Gegner mehr umlegt). Keine Waffe ⇒ nie adäquat.
   */
  private mainhandCarriesOnLevel(): boolean {
    const mhId = this.player.state.character.equipment.mainhand;
    const mh = mhId ? this.content.items[mhId] : null;
    if (!mh) return false;
    return this.gearScore(mh) >= this.player.combatLevel() * WEAPON_ADEQUACY_PER_CL;
  }

  /**
   * [Sweep6 T4-#2] Bestes craftbare Waffen-Upgrade als ausführbarer Task: ein FREIGESCHALTETES
   * Rezept lootet eine stil-treue, tragbare Mainhand mit besserem Score → das Rezept (bzw. die
   * Engpass-Zutat: sammeln oder erjagen) ist der nächste Schritt. Nur aktiv, wenn der Shop kein
   * Mainhand-Upgrade mehr bietet (dann ist Kaufen/Sparen der billigere Weg). Kandidaten nach
   * Score-Gewinn absteigend; der erste mit gangbarer Route gewinnt (deterministisch).
   *
   * [Sweep6 W2-T7-F2 + W2-T1-F1] PLUS Craft-Skill-LEVELING als Gear-Route: auch NOCH GESPERRTE
   * Rezepte in Trainings-Reichweite (≤ `CRAFT_TRAIN_REACH` Level über dem Skill) zählen als
   * Kandidaten — der Unterschritt ist dann „Herstell-Skill dorthin trainieren" (pickSkillAction:
   * beste startbare Aktion des Skills, sonst die Sammel-Quelle der Zutat). Vorher sah die Route
   * nur freigeschaltete Rezepte: fletching/smithing/rc blieben im Free-Play für immer Level 1
   * und die beste craftbare Waffe für immer das L1-Rezept (Bogen- UND Melee-Stall @copper —
   * W2-Läufe 74/85; Magier Seed 77). Freigeschaltete Routen behalten Vorrang (craften > trainieren).
   */
  private craftWeaponUpgradeTask(): Task | null {
    if (this.shopHasMainhandUpgrade()) return null;
    // [Regression-Fix] Zweite Bedingung des ECHTEN Stuck-Falls: nur craften, wenn die getragene
    // Mainhand keine on-level-Kämpfe mehr trägt. Reicht sie noch (frischer Melee auf dem Starter),
    // ist Kämpfen der richtige Weg — die Craft-Route bleibt Gelegenheit, kein Dauer-Grind, und
    // preemptet den Kampf nicht mehr wegen eines nur marginal besseren Rezepts.
    if (this.mainhandCarriesOnLevel()) return null;
    // Je Ziel-Item die beste Route merken: freigeschaltetes Rezept schlägt Trainings-Route;
    // unter Trainings-Routen gewinnt das niedrigste Rezept-Gate (progressive Leiter).
    const byItem = new Map<ItemId, { itemId: ItemId; gain: number; locked: ActionDef | null }>();
    for (const a of Object.values(this.content.actions)) {
      if (!a.inputs || a.inputs.length === 0) continue;
      const unlocked = this.actionUnlocked(a);
      if (!unlocked && (a.levelRequired ?? 1) - this.player.level(a.skill) > CRAFT_TRAIN_REACH) {
        continue; // zu weit weg — kein sinnvolles Zwischenziel
      }
      for (const l of a.loot) {
        const item = this.content.items[l.itemId];
        if (!item || item.type !== "equipment" || item.slot !== "mainhand") continue;
        if (!this.styleFits(item) || !this.meetsItemRequirements(item)) continue;
        const prev = byItem.get(l.itemId);
        if (!prev) {
          const gain = this.gearScore(item) - this.equipBar(item); // 2H-bewusst (Schild zählt mit)
          if (gain > 0) byItem.set(l.itemId, { itemId: l.itemId, gain, locked: unlocked ? null : a });
        } else if (unlocked) {
          prev.locked = null;
        } else if (prev.locked && (a.levelRequired ?? 1) < (prev.locked.levelRequired ?? 1)) {
          prev.locked = a;
        }
      }
    }
    const cands = [...byItem.values()].sort((x, y) => y.gain - x.gain || x.itemId.localeCompare(y.itemId));
    // 1) Freigeschaltete Rezepte: craften bzw. Engpass-Zutat sammeln/erjagen (wie bisher);
    //    [#227 Focus-Rework] als LETZTER Schritt eine Route schließen, deren einzige offene
    //    Lücke KAUFBARE Shop-Materialien sind (die neuen Low-Tier-Barren + magic_binder).
    for (const c of cands) {
      if (c.locked) continue;
      const via = this.findActionLooting(c.itemId);
      if (via) return { kind: "action", actionId: via.id, label: `Waffen-Route ${c.itemId}` };
      const m = this.findInputMonster(c.itemId);
      if (m) return { kind: "fight", monsterId: m.id };
      const shop = this.closeCraftViaShop(c.itemId);
      if (shop) return { kind: "action", actionId: shop.id, label: `Waffen-Route ${c.itemId}` };
    }
    // 2) [Shop-Purge 2026-07-11] FREIGESCHALTETES Rezept, dessen Zutaten-Kette an einem GESPERRTEN
    //    Unter-Produzenten hängt (Stab braucht iron_bar, Smelting-Gate zu): seit Barren nicht mehr
    //    kaufbar sind (Chef: keine Shortcuts), kann closeCraftViaShop diese Lücke nicht mehr
    //    schließen — der alte #227-Stall (Magier klebt mit vollem Konto ewig auf gnarled_staff)
    //    wäre zurück. Die einzig gangbare Route ist jetzt die des echten Spielers: den Skill des
    //    klemmenden Unter-Produzenten trainieren (der über pickSkillAction auch gleich dessen
    //    eigene Zutaten-Beschaffung liefert, z. B. Kupfer minen → verhütten → Smithing leveln).
    //    WICHTIG: vor Schritt 3 — sonst kettet sich die Sim an „noch höheres gesperrtes Rezept
    //    trainieren" (RC 30/40…), dessen Barren-Lücke exakt dieselbe bleibt.
    for (const c of cands) {
      if (c.locked) continue;
      const skill = this.findLockedProducerSkill(c.itemId);
      if (!skill) continue;
      const train = this.pickSkillAction(skill);
      if (train) {
        return {
          kind: "action",
          actionId: train.id,
          label: `${skill} trainieren für ${c.itemId} (Unter-Rezept gesperrt)`,
        };
      }
    }
    // 3) [W2-T7-F2] Gesperrtes Rezept in Reichweite: den Herstell-Skill dorthin trainieren.
    //    [#356 Waffen-Leiter] „Trainieren" heißt zuerst: die WAFFEN-LEITER des Skills selbst
    //    fahren (höchstes freigeschaltetes Waffen-Rezept wiederholt craften — s. Docblock von
    //    weaponLadderTask). Der alte pickSkillAction-Fallback lief in eine Tretmühle OHNE
    //    Skill-XP: er lieferte die Zutaten-QUELLE des alphabetisch ersten Rezepts (Magie:
    //    craft_copper_focus → copper_bar → mine/smelt_copper; Ranged: dim_essence-Rezept →
    //    forage_dim_essence) — der Magier „trainierte" Runecrafting 46 Sim-h mit Kupfer-Minen
    //    (Seed 7/48 h: rc 1, mining 58, CL 8, 87 Kills), der Fernkämpfer Leatherworking mit
    //    Foraging (lw 2, foraging 60). Er bleibt nur als letzte Rückfallebene stehen.
    for (const c of cands) {
      if (!c.locked) continue;
      const ladder = this.weaponLadderTask(c.locked.skill, c.itemId);
      if (ladder) return ladder;
      const train = this.pickSkillAction(c.locked.skill);
      if (train) {
        return {
          kind: "action",
          actionId: train.id,
          label: `${c.locked.skill} trainieren für ${c.itemId}`,
        };
      }
    }
    return null;
  }

  /**
   * [#356 Waffen-Leiter] Trainings-Route für einen Waffen-Herstell-Skill (magic→Runecrafting,
   * ranged→Leatherworking/Bögen, melee→Schmieden — stil-agnostisch aus dem Content abgeleitet):
   * das höchste bereits FREIGESCHALTETE Rezept dieses Skills, das eine stil-treue Mainhand lootet,
   * wiederholt fahren — genau so levelt ein echter Spieler Richtung nächstem Waffen-Tier. Ob das
   * Zwischen-Tier selbst ein Score-Upgrade ist, ist egal: es ist XP-Futter (überzählige Crafts
   * versilbert der Junk-Pfad). Routen-Auflösung wie im Unlocked-Pfad von craftWeaponUpgradeTask:
   * Rezept fahren bzw. Engpass-Zutat sammeln/craften (findActionLooting rekursiert die Kette),
   * sonst den Dropper der fehlenden Zutat jagen (bowstring ← raw_hide ist Monster-Loot). Höchste
   * Sprosse zuerst; die erste mit gangbarer Route gewinnt (deterministisch). null ⇒ keine
   * freigeschaltete Sprosse mit gangbarer Route (dann greift der alte pickSkillAction-Fallback).
   */
  private weaponLadderTask(skill: SkillId, forItem: ItemId): Task | null {
    const isStyleMainhand = (itemId: ItemId): boolean => {
      const it = this.content.items[itemId];
      return it?.type === "equipment" && it.slot === "mainhand" && it.weaponStyle === this.style;
    };
    const rungs = Object.values(this.content.actions)
      .filter(
        (a) =>
          a.skill === skill &&
          (a.inputs?.length ?? 0) > 0 &&
          this.actionUnlocked(a) &&
          a.loot.some((l) => isStyleMainhand(l.itemId)),
      )
      .sort((a, b) => (b.levelRequired ?? 1) - (a.levelRequired ?? 1) || a.id.localeCompare(b.id));
    for (const rung of rungs) {
      const target = rung.loot.find((l) => isStyleMainhand(l.itemId))!.itemId;
      const via = this.findActionLooting(target);
      if (via) {
        return {
          kind: "action",
          actionId: via.id,
          label: `${skill} trainieren für ${forItem} (Waffen-Leiter ${target})`,
        };
      }
      const m = this.findInputMonster(target);
      if (m) return { kind: "fight", monsterId: m.id };
    }
    return null;
  }

  /**
   * [Shop-Purge 2026-07-11] Läuft die Produzenten-Kette von `itemId` entlang (gleiche Traversierung
   * wie `findActionLooting`: niedrigstes Rezept-Gate zuerst, nur Engpass-Inputs) und liefert den
   * Skill des ERSTEN gesperrten Produzenten — die Stelle, an der die Kette wirklich klemmt.
   * null ⇒ kein gesperrter Produzent gefunden (die Kette hängt woanders, z. B. an einem Drop).
   */
  private findLockedProducerSkill(itemId: ItemId, seen: Set<ItemId> = new Set()): SkillId | null {
    if (seen.has(itemId)) return null; // Rezept-Zyklen abfangen
    seen.add(itemId);
    const producers = Object.values(this.content.actions)
      .filter((a) => a.loot.some((l) => l.itemId === itemId))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    for (const a of producers) {
      if (!this.actionUnlocked(a)) return a.skill;
      for (const inp of this.missingInputs(a)) {
        const s = this.findLockedProducerSkill(inp.itemId, seen);
        if (s) return s;
      }
    }
    return null;
  }

  /**
   * [#227 Focus-Rework] Schließt eine Waffen-Craft-Route, deren EINZIGE noch offene Input-Lücke(n)
   * KAUFBARE Shop-Materialien sind — die neuen Low-Tier-Barren (copper/bronze/iron/steel_bar) bzw.
   * `magic_binder`, die RC-Stufe-1 kampf- UND smithing-frei machen. Kauft die fehlenden Inputs bis
   * zur `ensureInputs`-Schwelle im Budget nach und gibt das Rezept als nächsten Schritt zurück.
   *
   * Wird NUR als letzter Schritt aufgerufen (nachdem `findActionLooting`/`findInputMonster` beide
   * leer ausgingen): dann sind alle NICHT-kaufbaren Inputs bereits gedeckt (sonst hätte
   * findActionLooting deren Sammel-/Craft-Schritt geliefert), der Barren ist die letzte Lücke.
   * Vorher klebte der ehrliche Magier auf der Shop-Decke (gnarled_staff), weil die Route den Barren
   * nur über (gesperrtes) Smelting suchte, statt ihn — wie ein echter Spieler seit #227 — zu kaufen.
   * Gibt null zurück, sobald irgendeine offene Lücke NICHT kaufbar ist (keine Shop-schließbare Route).
   */
  private closeCraftViaShop(itemId: ItemId): ActionDef | null {
    const recipe = Object.values(this.content.actions)
      .filter((a) => this.actionUnlocked(a) && a.loot.some((l) => l.itemId === itemId))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id))[0];
    if (!recipe?.inputs || recipe.inputs.length === 0) return null;
    const missing = this.missingInputs(recipe);
    if (missing.length === 0) return null; // dann liefe schon ensureInputs (defensive)
    const shopEntry = (id: ItemId) => this.content.shop.find((e) => e.itemId === id);
    if (!missing.every((inp) => shopEntry(inp.itemId))) return null; // eine Lücke ist nicht kaufbar
    for (const inp of missing) {
      const entry = shopEntry(inp.itemId)!;
      const have = this.player.inventoryCount(inp.itemId) + this.player.bankCount(inp.itemId);
      const want = inp.qty * 3 - have; // gleiche ≥3-Durchläufe-Schwelle wie inputsCovered
      if (want <= 0) continue;
      const budget = Math.max(0, this.player.gold() - this.luxuryReserve);
      const qty = Math.min(want, Math.floor(budget / Math.max(1, entry.cost)));
      if (qty > 0) {
        const bought = this.player.buy(inp.itemId, qty);
        if (bought > 0) this.logLine(`Waffen-Route ${itemId}: ${bought}× ${inp.itemId} gekauft`);
      }
    }
    return this.ensureInputs(recipe) ? recipe : null;
  }

  /** Zieht `itemId` an, wenn es stil-treu, tragbar und ein Score-Upgrade ist. */
  private tryEquipUpgrade(itemId: ItemId): void {
    const item = this.content.items[itemId];
    if (!item || item.type !== "equipment" || !item.slot) return;
    if (!this.styleFits(item)) return;
    const score = this.gearScore(item);
    if (score <= this.equipBar(item)) return; // 2H-bewusste Hürde (Stab⇄Schild-Thrash-Schutz)
    // Munitions-Gate: ENTFERNT (#286) — ein Bogen ist immer „feuerbereit", Pfeile existieren nicht mehr.
    const can = this.player.canEquip(itemId);
    if (!can.ok) return; // Skill-Gate = normale Progression, keine Friction
    const r = this.player.equip(itemId);
    if (!r.ok) {
      const key = `${itemId}:${r.reason ?? ""}`;
      if (!this.equipFrictionReported.has(key)) {
        this.equipFrictionReported.add(key);
        this.frictions.add({
          moment: this.moment("Gear-Upgrade"),
          what: `Upgrade ${itemId} ließ sich trotz erfüllter Anforderungen nicht anlegen (${r.reason ?? "ohne Grund"})`,
          whyConfusing: "canEquip sagte ja, equip sagte nein — für den Spieler ein widersprüchliches Verhalten.",
          evidence: { reason: r.reason, slot: item.slot },
        });
      }
      return;
    }
    this.logLine(`Upgrade angelegt: ${itemId} (${item.slot})`);
    // [Sweep6 W2-T6-F2] 1H-Mainhand angelegt und der Offhand-Slot ist leer (z.B. weil eine 2H
    // verdrängt wurde) → besten besessenen Offhand direkt nachrüsten (Kombi komplettieren).
    if (item.slot === "mainhand" && !item.twoHanded && !this.player.state.character.equipment.offhand) {
      this.equipBestOffhand();
    }
  }

  /**
   * [#246] Instanz-Pendant zu `tryEquipUpgrade`: legt eine modifizierte Gear-Instanz aus der
   * Instanz-Tasche an, wenn ihre BASIS die stil-/2H-bewusste `equipBar` schlägt und die Skill-
   * Anforderungen erfüllt sind. Gewertet wird bewusst nur die Basis (der Suffix kommt als Bonus
   * obendrauf, senkt die Attraktivität also nie) — genau wie ein Spieler die Tooltip-Basiswerte
   * überschlägt. `equipInstance` prüft Besitz in der Tasche selbst; `canEquip` (Slot-Besitz) taugt
   * hier nicht, weil die Instanz keinen Slot belegt.
   */
  private tryEquipInstanceUpgrade(inst: ItemInstance): void {
    const item = this.content.items[inst.baseItemId];
    if (!item || item.type !== "equipment" || !item.slot) return;
    if (!this.styleFits(item)) return;
    if (this.gearScore(item) <= this.equipBar(item)) return; // 2H-bewusste Hürde (Thrash-Schutz)
    if (!this.meetsItemRequirements(item)) return; // Skill-Gate = normale Progression, keine Friction
    const r = this.player.equipInstance(inst.instanceId);
    if (!r.ok) return;
    this.logLine(`Upgrade angelegt (Instanz): ${inst.baseItemId} (${item.slot})`);
    // 1H-Mainhand angelegt und Offhand frei (z. B. 2H verdrängt) → besten Offhand nachrüsten.
    if (item.slot === "mainhand" && !item.twoHanded && !this.player.state.character.equipment.offhand) {
      this.equipBestOffhand();
    }
  }

  // ── Bewertungs-/Such-Helfer (reine Leser) ────────────────────────────────────────────────

  /** Passt das Item zum Persona-Stil? Waffen müssen stil-treu sein, Rüstung ist stil-frei. */
  private styleFits(item: ItemDef): boolean {
    if (!item.weaponStyle) return true;
    return item.weaponStyle === this.style;
  }

  /**
   * Einfacher Gear-Score (stil-gewichtet). Bewusst eine Heuristik statt eines vollen
   * computeStats-Vergleichs — genau wie ein Spieler Tooltip-Zahlen überschlägt.
   * Itemization 2.0: Attribut-`modifiers` zählen stil-gewichtet (GEAR_ATTR_STYLE_WEIGHT) und
   * `skillBoost` zum §4.3-Attribut-Gegenwert (SKILL_BOOST_ATTR_EQUIV, wie coreStatScore) — sonst
   * wäre Boost-only-Schmuck für den Honest-Player unsichtbar (Score 0 = nie ein „Upgrade").
   * [Re-Gate F3] Waffen 2.0: Range-Form-Waffen (damageMin/Max) tragen keine Offensiv-Flats mehr —
   * der reine Flat-Pfad sah JEDE Spannen-Waffe als Score ~0 und der ehrliche Spieler blieb auf der
   * Starterwaffe kleben (Beleg: cracked_bow @CL30). Range-Form zählt jetzt über die Tooltip-DPS
   * ((min+max)/2 ÷ Tempo, ×(1 + 5 % je Waffeneffekt), Gewicht GEAR_DPS_WEIGHT); Legacy-Waffen
   * (ohne Spanne) weiter über den alten Flat-Pfad. Offensiv-Flats (dmg/accuracy/Tempo-Delta)
   * zählen bei Range-Form NICHT — computeStats ignoriert sie dort (Doppelzähl-Schutz), und was
   * die Engine nie liest, darf auch kein Score-Phantom sein.
   */
  private gearScore(item: ItemDef | null | undefined): number {
    if (!item) return 0;
    const b = item.bonus ?? {};
    // Range-Form-Erkennung wie in computeStats (character.ts): BEIDE Spannen-Felder endlich.
    const rangeForm =
      typeof item.damageMin === "number" &&
      typeof item.damageMax === "number" &&
      Number.isFinite(item.damageMin) &&
      Number.isFinite(item.damageMax);
    let score = 0;
    if (rangeForm) {
      const min = Math.max(0, item.damageMin as number);
      const max = Math.max(min, item.damageMax as number);
      const dps = ((min + max) / 2) / Math.max(0.1, (item.attackIntervalMs ?? 3000) / 1000);
      score += dps * GEAR_DPS_WEIGHT * (1 + GEAR_EFFECT_WEIGHT * effectiveWeaponEffects(item).length);
    } else {
      const dmg =
        this.style === "ranged" ? (b.rangedDamage ?? 0) : this.style === "magic" ? (b.magicDamage ?? 0) : (b.meleeDamage ?? 0);
      score += dmg * 3 + (b.accuracy ?? 0) * 0.5 - (b.attackIntervalMs ?? 0) * 0.01;
    }
    score +=
      (b.defense ?? 0) * 1.5 +
      (b.evasion ?? 0) * 0.5 +
      (b.maxHp ?? 0) * 0.5 +
      (b.critChance ?? 0) * 100 +
      (b.critDamage ?? 0) * 20 +
      (b.lifesteal ?? 0) * 100;
    if (this.style === "magic") score += (b.maxMana ?? 0) * 0.3; // Zauberreserve 28.08.2026: manaRegen-Term entfallen (in maxMana eingefaltet)
    if (item.modifiers) {
      const w = GEAR_ATTR_STYLE_WEIGHT[this.style];
      for (const [aid, v] of Object.entries(item.modifiers)) score += (v ?? 0) * (w[aid as AttributeId] ?? 1);
    }
    // Skill-Boosts (§4, OSRS-Stil): nur die im eigenen Stil überhaupt GELESENEN Boosts zählen —
    // „+2 Power" ist für den Magier ein toter Tooltip-Wert (computeStats liest ihn nie).
    if (item.skillBoost) {
      for (const id of BOOSTABLE_COMBAT_SKILL_IDS) {
        if (!GEAR_BOOST_READ_BY_STYLE[this.style].has(id)) continue;
        score += (item.skillBoost[id] ?? 0) * SKILL_BOOST_ATTR_EQUIV[id];
      }
    }
    return score;
  }

  /**
   * Score-Hürde, die ein Kandidat schlagen muss — ZWEIHAND-bewusst ([Sweep6 T4-#2]-Folge):
   * eine 2H-Waffe muss Mainhand+Offhand ZUSAMMEN schlagen (der Schild fällt weg), und ein
   * Offhand-Teil muss gegen eine getragene 2H-Waffe die GANZE Waffe schlagen (equipItem würde
   * sie verdrängen). Ohne diese Hürde pendelte der Sim endlos Stab⇄Schild (Equip-Thrash inkl.
   * wiederholter Shop-Käufe), sobald die Craft-Route die ersten 2H-Stäbe lieferte.
   *
   * [Sweep6 W2-T6-F2] Und in die GEGENRICHTUNG symmetrisch: ersetzt eine EINHAND-Waffe eine
   * getragene 2H, wird der Offhand-Slot frei — der beste BESESSENE Offhand wird dem Kandidaten
   * gutgeschrieben (Bar = 2H-Score − Offhand-Score). Vorher bekam bronze_sword (4,80) +
   * wooden_shield (1,0) nie eine Chance gegen copper_spear (4,845); Seed 12 hing 50 h im
   * Speer-Käfig — und weil shopHasMainhandUpgrade/craftWeaponUpgradeTask dieselbe Bar fragen,
   * verriegelte das zusätzlich Shop- UND Craft-Route.
   */
  private equipBar(item: ItemDef): number {
    if (!item.slot) return Infinity;
    const mhId = this.player.state.character.equipment.mainhand;
    const mh = mhId ? this.content.items[mhId] : null;
    if (item.slot === "mainhand" && item.twoHanded) {
      return this.equippedScore("mainhand") + this.equippedScore("offhand");
    }
    if (item.slot === "mainhand" && !item.twoHanded && mh?.twoHanded) {
      return this.gearScore(mh) - this.bestOwnedOffhandScore();
    }
    if (item.slot === "offhand" && mh?.twoHanded) {
      return this.gearScore(mh);
    }
    return this.equippedScore(item.slot);
  }

  /**
   * Bestes BESESSENES Ausrüstungsteil (Inventar + Lager) nach gearScore, das `pred` erfüllt —
   * stil-treu und tragbar werden zentral geprüft. Deterministisch (Gleichstand: kleinere Id).
   */
  private bestOwnedEquipment(pred: (item: ItemDef) => boolean): { itemId: ItemId; score: number } | null {
    const seen = new Set<ItemId>();
    let best: { itemId: ItemId; score: number } | null = null;
    const check = (itemId: ItemId): void => {
      if (seen.has(itemId)) return;
      seen.add(itemId);
      const item = this.content.items[itemId];
      if (!item || item.type !== "equipment" || !item.slot) return;
      if (!this.styleFits(item) || !this.meetsItemRequirements(item) || !pred(item)) return;
      const score = this.gearScore(item);
      if (score <= 0) return;
      if (!best || score > best.score || (score === best.score && itemId < best.itemId)) {
        best = { itemId, score };
      }
    };
    for (const slot of this.player.state.inventory.slots) {
      if (slot && !slot.instance) check(slot.itemId);
    }
    for (const [itemId, qty] of Object.entries(this.player.state.bank)) {
      if (typeof qty === "number" && qty > 0) check(itemId);
    }
    return best;
  }

  /** [Sweep6 W2-T6-F2] Score des besten besessenen, tragbaren Offhands (0 = keiner). */
  private bestOwnedOffhandScore(): number {
    return this.bestOwnedEquipment((i) => i.slot === "offhand")?.score ?? 0;
  }

  /**
   * [Sweep6 W2-T6-F2] Trägt dieses Offhand-Teil die anstehende 2H→1H-Kombi? Ja, wenn eine 2H
   * getragen wird, das Teil der beste besessene Offhand ist UND es zusammen mit der besten
   * besessenen 1H-Mainhand die 2H schlägt — dann ist es kein Junk, sondern die halbe neue Waffe.
   */
  private comboKeeper(item: ItemDef): boolean {
    if (item.slot !== "offhand") return false;
    const mhId = this.player.state.character.equipment.mainhand;
    const mh = mhId ? this.content.items[mhId] : null;
    if (!mh?.twoHanded) return false;
    if (!this.styleFits(item) || !this.meetsItemRequirements(item)) return false;
    const ofScore = this.gearScore(item);
    if (ofScore < this.bestOwnedOffhandScore()) return false;
    const best1h = this.bestOwnedEquipment((i) => i.slot === "mainhand" && !i.twoHanded)?.score ?? 0;
    return best1h + ofScore > this.gearScore(mh);
  }

  /**
   * [Sweep6 W2-T6-F2] Nach einem 2H→1H-Tausch den freigewordenen Offhand-Slot sofort mit dem
   * besten besessenen Offhand bestücken (die Kombi WAR der Grund für den Tausch — sonst liefe
   * der Spieler bis zum nächsten Fenster mit leerer Schildhand).
   */
  private equipBestOffhand(): void {
    const s = this.player.state;
    if (s.character.equipment.offhand) return;
    const mhId = s.character.equipment.mainhand;
    if (mhId && this.content.items[mhId]?.twoHanded) return; // 2H blockiert den Slot
    const best = this.bestOwnedEquipment((i) => i.slot === "offhand");
    if (!best) return;
    if (this.player.inventoryCount(best.itemId) === 0 && this.player.bankCount(best.itemId) > 0) {
      this.player.withdraw(best.itemId, 1);
    }
    if (this.player.inventoryCount(best.itemId) === 0) return;
    if (this.player.equip(best.itemId).ok) {
      this.logLine(`Upgrade angelegt: ${best.itemId} (offhand, nach 2H→1H-Tausch)`);
    }
  }

  /** Score des aktuell in `slot` getragenen Items (Ringe: der schwächere der beiden Slots). */
  private equippedScore(slot: EquipSlot): number {
    const eq = this.player.state.character.equipment;
    if (slot === "ring1" || slot === "ring2") {
      const s1 = this.gearScore(eq.ring1 ? this.content.items[eq.ring1] : null);
      const s2 = this.gearScore(eq.ring2 ? this.content.items[eq.ring2] : null);
      return Math.min(s1, s2);
    }
    const id = eq[slot];
    return this.gearScore(id ? this.content.items[id] : null);
  }

  /**
   * Aktuelle abgeleitete maxHp — Basis für %maxHp-Heilungen. ALLE Heil-/Food-Auswahl-Heuristiken
   * unten messen den Heilwert eines Consumables über `consumableHeal(item, this.playerMaxHp())`
   * (shared), damit die neuen prozentualen Heilungen (healPct, %maxHp) korrekt bewertet werden und
   * nicht — wie beim reinen `healAmount`-Lesen — als „heilt 0" durchfallen.
   */
  private playerMaxHp(): number {
    return computeStats(this.player.state, this.content).maxHp;
  }

  /** Heil-stärkstes Food im Inventar mit mindestens `minQty` Stück (Consumable, das heilt). */
  private bestFoodInInventory(minQty = 1): ItemId | null {
    const maxHp = this.playerMaxHp();
    const counts = new Map<ItemId, number>();
    for (const slot of this.player.state.inventory.slots) {
      if (!slot || slot.instance) continue;
      counts.set(slot.itemId, (counts.get(slot.itemId) ?? 0) + slot.qty);
    }
    let best: ItemId | null = null;
    let bestHeal = 0;
    for (const [itemId, qty] of counts) {
      if (qty < minQty) continue;
      const item = this.content.items[itemId];
      if (!item || item.type !== "consumable") continue;
      const heal = consumableHeal(item, maxHp);
      if (heal > bestHeal) {
        bestHeal = heal;
        best = itemId;
      }
    }
    return best;
  }

  /**
   * [Sweep6 T1-#2] Heil-Food mit dem GRÖSSTEN Gesamtbestand im Inventar (Gleichstand: höherer
   * Heilwert, dann Id) — der Nacht-Fallback, wenn kein Stapel die FOOD_LOW-Schwelle schafft:
   * 4 Tränke à heal 3 überleben keine 40-Min-Idle-Strecke, ein 8er-Stapel Shrimp schon.
   */
  private largestFoodStack(): ItemId | null {
    const maxHp = this.playerMaxHp();
    const counts = new Map<ItemId, number>();
    for (const slot of this.player.state.inventory.slots) {
      if (!slot || slot.instance) continue;
      counts.set(slot.itemId, (counts.get(slot.itemId) ?? 0) + slot.qty);
    }
    let best: ItemId | null = null;
    let bestQty = 0;
    let bestHeal = 0;
    for (const [itemId, qty] of counts) {
      const item = this.content.items[itemId];
      if (!item || item.type !== "consumable" || consumableHeal(item, maxHp) <= 0) continue;
      const heal = consumableHeal(item, maxHp);
      if (
        qty > bestQty ||
        (qty === bestQty && heal > bestHeal) ||
        (qty === bestQty && heal === bestHeal && best !== null && itemId < best)
      ) {
        best = itemId;
        bestQty = qty;
        bestHeal = heal;
      }
    }
    return best;
  }

  /** Freigeschaltetes Koch-Rezept mit verfügbaren Zutaten (Inventar+Bank), Output = Heil-Food. */
  private findCookableAction(): ActionDef | null {
    const maxHp = this.playerMaxHp();
    const heals = (id: ItemId): number => {
      const it = this.content.items[id];
      return it ? consumableHeal(it, maxHp) : 0;
    };
    let best: ActionDef | null = null;
    let bestHeal = 0;
    for (const a of Object.values(this.content.actions)) {
      if (a.skill !== "cooking" || !a.inputs || a.inputs.length === 0) continue;
      if (!this.actionUnlocked(a)) continue;
      const output = a.loot.find((l) => heals(l.itemId) > 0);
      if (!output) continue;
      const haveAll = a.inputs.every(
        (inp) => this.player.inventoryCount(inp.itemId) + this.player.bankCount(inp.itemId) >= inp.qty * 3,
      );
      if (!haveAll) continue;
      const heal = heals(output.itemId);
      if (heal > bestHeal) {
        bestHeal = heal;
        best = a;
      }
    }
    return best;
  }

  /** Sammel-Aktion, die die Zutat des NIEDRIGSTEN freigeschalteten Koch-Rezepts liefert. */
  private findGatherForCooking(): ActionDef | null {
    const cooks = Object.values(this.content.actions)
      .filter((a) => a.skill === "cooking" && a.inputs && a.inputs.length > 0 && this.actionUnlocked(a))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1) || a.id.localeCompare(b.id));
    for (const cook of cooks) {
      for (const inp of cook.inputs ?? []) {
        const src = Object.values(this.content.actions).find(
          (a) =>
            (!a.inputs || a.inputs.length === 0) &&
            this.actionUnlocked(a) &&
            a.loot.some((l) => l.itemId === inp.itemId),
        );
        if (src) return src;
      }
      // Rezept freigeschaltet, aber KEINE erreichbare Quelle für die Zutat → einmalig melden.
      if (!this.unreachableReported.has(cook.id)) {
        this.unreachableReported.add(cook.id);
        this.frictions.add({
          moment: this.moment("Food kochen"),
          what: `Rezept ${cook.id} ist freigeschaltet, aber die Zutaten sind gerade unerreichbar`,
          whyConfusing:
            "Das Rezept wird angeboten, doch keine dem Spieler offene Sammel-Aktion liefert die Zutat — eine Sackgasse ohne Hinweis.",
          evidence: { inputs: cook.inputs?.map((i) => i.itemId) },
        });
      }
    }
    return null;
  }

  /**
   * Kaufbares Heil-Food (≥5 Stück im Budget). `maxQty` deckelt die Kaufmenge (Default: der normale
   * Fenster-Vorrat `FOOD_TARGET`); `reserve` ist der unantastbare Gold-Rest (Luxus-Käufe reichen
   * die erhöhte Reserve durch).
   *
   * [Food-Pass #5] PREISBEWUSST statt stur „heilstärkste Sorte": die Hybrid-Heilung
   * `max(flat, pct×maxHp)` mit healPct-Floor 0.11/0.12 macht Shop-Foods ab mittlerem maxHp
   * heil-GLEICH (Shrimp 12 g und Forelle 28 g heilen ab ~42 maxHp beide exakt 12 % maxHp) —
   * die alte Heil-DESC-Regel kaufte trotzdem immer die teuerste Sorte (Seed 5: 22 × 28 g = 616 g
   * für null Mehr-Heilung). Jetzt: unter allen Sorten, deren Bissen ≥ `FOOD_HEAL_TOLERANCE` des
   * BESTEN leistbaren Bissens heilt (heil-gleichwertig), gewinnt die BILLIGSTE. Bei kleinem maxHp
   * trennt die Flat-Leiter die Heils echt (Forelle 5 vs Shrimp 3 → Qualität gewinnt wie bisher),
   * im pct-Floor-Bereich entscheidet der Preis. Tie-Breaks deterministisch (Preis, Heil, Id).
   */
  private buyFood(maxQty = FOOD_TARGET, reserve = GOLD_RESERVE): number {
    const budget = Math.max(0, this.player.gold() - reserve);
    if (budget <= 0 || maxQty <= 0) return 0;
    const maxHp = this.playerMaxHp();
    const options = this.content.shop
      .map((e) => ({ e, item: this.content.items[e.itemId] }))
      .filter((o) => o.item && o.item.type === "consumable" && consumableHeal(o.item, maxHp) > 0)
      .filter((o) => Math.floor(budget / Math.max(1, o.e.cost)) >= 5);
    if (options.length === 0) return 0;
    const heal = (o: (typeof options)[number]): number => consumableHeal(o.item!, maxHp);
    const bestHeal = options.reduce((m, o) => Math.max(m, heal(o)), 0);
    const pick = options
      .filter((o) => heal(o) >= bestHeal * FOOD_HEAL_TOLERANCE)
      .sort((a, b) => a.e.cost - b.e.cost || heal(b) - heal(a) || a.e.itemId.localeCompare(b.e.itemId))[0]!;
    const qty = Math.min(maxQty, Math.floor(budget / Math.max(1, pick.e.cost)));
    return this.player.buy(pick.e.itemId, qty);
  }

  // ammoReserveCount / usableAmmoTotal / ammoObtainable / findAmmoCraftAction:
  // ENTFERNT (#286 Ammo-Removal) — keine Munitions-Bestandsführung mehr.

  /** Bestes Shop-Gear-Upgrade im Budget (stil-treu, tragbar, Score-Verbesserung).
   *  [It2-Sched] Gear-Shopping ist ein LUXUS-Kauf — auf der Zielgeraden eines Gold-Ziels
   *  respektiert es die erhöhte Reserve (ein Sparer macht keine Shopping-Tour). */
  private bestShopUpgrade(): { itemId: ItemId; cost: number } | null {
    const budget = Math.max(0, this.player.gold() - this.luxuryReserve);
    let best: { itemId: ItemId; cost: number; gain: number } | null = null;
    for (const e of this.content.shop) {
      if (e.cost > budget) continue;
      const item = this.content.items[e.itemId];
      if (!item || item.type !== "equipment" || !item.slot) continue;
      if (!this.styleFits(item) || !this.meetsItemRequirements(item)) continue;
      // Munitions-Gate: ENTFERNT (#286) — Bögen sind immer feuerbereit.
      const gain = this.gearScore(item) - this.equipBar(item); // 2H-bewusste Hürde
      if (gain > 0 && (!best || gain > best.gain)) best = { itemId: e.itemId, cost: e.cost, gain };
    }
    return best ? { itemId: best.itemId, cost: best.cost } : null;
  }

  private meetsItemRequirements(item: ItemDef): boolean {
    for (const [skillId, need] of Object.entries(item.requirements ?? {})) {
      if (need !== undefined && this.player.level(skillId) < need) return false;
    }
    return true;
  }

  // ── Kleinkram ────────────────────────────────────────────────────────────────────────────

  private advance(ms: number): void {
    this.player.advanceTime(ms);
    this.simTimeMs += ms;
  }

  private moment(where: string): string {
    return `Sim-Min ${Math.round(this.simTimeMs / 60000)}, ${where}`;
  }

  private logLine(text: string): void {
    this.logLines.push(`[${Math.round(this.simTimeMs / 60000)}m] ${text}`);
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
