import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { QuestDef } from "@hearthforge/shared";
import { killCreditMonsterId } from "./combat";

/**
 * Quest-Progressions-Fix-Paket (2026-07-23, Chef-GO, Basis: frisches Kontrolleur-Audit +
 * Steam-Review). Zwei Guards, die die zwei unabhängigen Fehlerklassen des Audits abdecken:
 *
 *  - Guard A (Unlock-Band-Monotonie): eine Zone/ein Dungeon darf nicht HINTER Content öffnen,
 *    das weit über dem Level-Band liegt, das die Zone selbst bietet (der F1-Fall: Aschfelder
 *    L30-45 hingen an chronicle_05, dessen Voraussetzung der L60-Kriegshäuptling-Dungeonboss
 *    war — die Zone lag damit WEIT UNTER ihrer eigenen Freischalt-Voraussetzung).
 *  - Guard B (Nebenquest-Erreichbarkeit): eine Quest darf kein kill_monster-Ziel verlangen, das
 *    zum Zeitpunkt der Quest-Freischaltung (alle `requires` claimed) noch hinter einem Zonen-/
 *    Dungeon-Gate liegt, das NICHT Teil der eigenen requires-Kette ist (der F2-Fall: 18 Neben-
 *    quests waren strukturell schon ab Spielstart sichtbar, obwohl ihr Zielmonster in einer noch
 *    gesperrten Zone lebte).
 *
 * Verallgemeinert den bestehenden Chronik-Deadlock-Guard (zone-gating.test.ts, sequenzielle
 * Ketten-Simulation NUR für chronicle_*) auf die STRUKTUR aller Quests: Guard B prüft nicht die
 * zeitliche Reihenfolge, sondern ob das Gate-Set jedes erreichbaren Ziels in der requires-Closure
 * der Quest selbst liegt — unabhängig davon, ob die Quest Teil der Hauptkette ist oder nicht.
 */

const questById = new Map(content.quests.map((q) => [q.id, q]));

/** Transitive requires-Closure EINER Quest (ohne die Quest selbst) — für Guard B. */
function requiresClosure(questId: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...(questById.get(questId)?.requires ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const q = questById.get(id);
    if (q?.requires) stack.push(...q.requires);
  }
  return seen;
}

/** Wie oben, aber INKLUSIVE der Quest selbst — für Guard A (R sammelt auch das Gate-Kapitel selbst). */
function requiresClosureIncludingSelf(questId: string): Set<string> {
  const seen = new Set<string>([questId]);
  const stack = [questId];
  while (stack.length) {
    const id = stack.pop()!;
    const q = questById.get(id);
    for (const r of q?.requires ?? []) {
      if (!seen.has(r)) {
        seen.add(r);
        stack.push(r);
      }
    }
  }
  return seen;
}

/** Alle Dungeons, deren `encounters`-Array dieses Monster (ggf. als dg_-Variante) enthält. */
function containingDungeons(monsterId: string): string[] {
  const out: string[] = [];
  for (const dungeon of content.dungeons) {
    for (const enc of dungeon.encounters) {
      if (killCreditMonsterId(content, enc) === monsterId) {
        out.push(dungeon.id);
        break;
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Guard A — Unlock-Band-Monotonie
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Anforderungslevel eines kill_monster-Ziels: Weltmonster → sein eigenes `level`. dungeonOnly →
 * das MINIMUM über alle enthaltenden Dungeons von `max(dungeon.requiredLevel, monster.level)`
 * (der Spieler braucht nur den GÜNSTIGSTEN Zugangsweg — manche Monster könnten theoretisch in
 * mehreren Dungeons auftauchen). Seit Task #345 ist requiredLevel kein Zutritts-Gate mehr,
 * bleibt hier aber als realistische "ab wann schaffbar"-Schätzung in der Band-Rechnung (die
 * Kreaturen-Härte selbst ist unverändert). Kein Dungeon gefunden (defensiv, sollte nie
 * passieren) → nur das rohe Monster-Level.
 */
function levelForTarget(monsterId: string): number | undefined {
  const m = content.monsters[monsterId];
  if (!m) return undefined;
  if (!m.dungeonOnly) return m.level;
  const dungeons = containingDungeons(monsterId);
  if (dungeons.length === 0) return m.level;
  return Math.min(
    ...dungeons.map((did) => {
      const d = content.dungeons.find((dd) => dd.id === did)!;
      return Math.max(d.requiredLevel, m.level);
    }),
  );
}

/**
 * R = das höchste Anforderungslevel unter ALLEN kill_monster-Zielen in der requires-Closure der
 * Gate-Quest (INKLUSIVE der Gate-Quest selbst — ihre eigenen Ziele zählen mit, s. F1: chronicle_05
 * fordert selbst den L60-Warchief). Das ist der ungefähre Spieler-Level, auf dem man steht, wenn
 * man das Gate gerade erst geschafft hat.
 */
function computeR(gateQuestId: string): number {
  let R = 0;
  for (const qid of requiresClosureIncludingSelf(gateQuestId)) {
    const q = questById.get(qid);
    if (!q) continue;
    for (const obj of q.objectives) {
      if (obj.type !== "kill_monster") continue;
      const ids = new Set<string>(obj.targets ?? []);
      if (obj.target) ids.add(obj.target);
      for (const id of ids) {
        const lvl = levelForTarget(id);
        if (lvl !== undefined && lvl > R) R = lvl;
      }
    }
  }
  return R;
}

/** Min/Max-Level der WELT-Monster einer Zone (dungeonOnly + dg_-Varianten ausgeschlossen — Muster
 *  `monsterClosestTo`, balance-envelope-helpers.ts: das ist das Band, das man beim freien Erkunden
 *  der Zone tatsächlich zu Gesicht bekommt, nicht die Dungeon-Finale). */
function zoneLevelRange(zoneId: string): { min: number; max: number } | undefined {
  const levels = Object.values(content.monsters)
    .filter((m) => m.zone === zoneId && !m.dungeonOnly && !m.id.startsWith("dg_"))
    .map((m) => m.level);
  if (levels.length === 0) return undefined;
  return { min: Math.min(...levels), max: Math.max(...levels) };
}

/**
 * Toleranz-Konstanten (Audit-Spec, 2026-07-23): eine Zone darf nicht komplett unter ihrer eigenen
 * Freischalt-Voraussetzung liegen (Einstiegsmonster ≥ R − ZONE_MIN_BELOW_R), muss aber auch nicht
 * über R hinausgehen — ihr Top-Ende darf nur nicht TRIVIAL unter R liegen (ZONE_MAX_BELOW_R), sonst
 * wäre das Gate reine Bürokratie ohne Bezug zur Zone dahinter.
 */
const ZONE_MAX_BELOW_R = 15;
const ZONE_MIN_BELOW_R = 20;

/**
 * Content-Drift-Ausnahme: Zonen ganz ohne WELT-Monster (nur Dungeon-Finale-Content) können keine
 * Level-Band-Aussage tragen — Guard A überspringt sie defensiv, aber NUR wenn sie hier explizit
 * gelistet sind (ein künftiger stiller Fall soll auffallen, nicht durchrutschen). `idolhall` ist
 * der einzige echte Fall: reines Dungeon-Finale-Areal (idol_sanctum + behind_the_throne), keine
 * frei bekämpfbaren Feldmonster. Das ist zugleich der dokumentierte "Kapitel-16-Grenzfall": ihr
 * Gate (chronicle_18) zieht über die requires-Closure den chronicle_16-Ausreißer
 * `gravecliff_specter` (Level 237, ein Elite-Zielscheiben-Ziel weit über dem sonstigen Hochland-
 * Band) in R hinein — ohne eigenes Weltmonster-Band gibt es dafür aber gar keine Zonen-Assertion,
 * die dadurch fehlschlagen könnte. Bewusst dokumentierte Toleranz, kein Fehler.
 */
const ZONES_WITHOUT_WORLD_BAND = new Set(["idolhall"]);

describe("Guard A — Unlock-Band-Monotonie (Quest-Progressions-Fix-Paket, 2026-07-23)", () => {
  it("jede Zonen-Gate hält ihr Level-Band relativ zur eigenen Freischalt-Voraussetzung R", () => {
    const violations: string[] = [];
    for (const zone of content.zones) {
      if (!zone.requiresQuest) continue;
      const range = zoneLevelRange(zone.id);
      if (!range) {
        if (!ZONES_WITHOUT_WORLD_BAND.has(zone.id)) {
          violations.push(
            `${zone.id}: keine Weltmonster gefunden UND nicht in ZONES_WITHOUT_WORLD_BAND — ` +
              `neuer Content-Fall, bewusst prüfen und ggf. eintragen`,
          );
        }
        continue;
      }
      const R = computeR(zone.requiresQuest);
      if (range.max < R - ZONE_MAX_BELOW_R) {
        violations.push(
          `${zone.id} (gate=${zone.requiresQuest}, R=${R}): zoneMaxLevel=${range.max} < R-${ZONE_MAX_BELOW_R} ` +
            `(${R - ZONE_MAX_BELOW_R}) — Zonen-Top-Ende trivial unter der eigenen Voraussetzung`,
        );
      }
      if (range.min < R - ZONE_MIN_BELOW_R) {
        violations.push(
          `${zone.id} (gate=${zone.requiresQuest}, R=${R}): zoneMinLevel=${range.min} < R-${ZONE_MIN_BELOW_R} ` +
            `(${R - ZONE_MIN_BELOW_R}) — Band-Inversion: die Zone liegt WEIT UNTER dem, was man tun musste, ` +
            `um sie freizuschalten (der F1-Fall)`,
        );
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("Story-Dungeon-CL-EMPFEHLUNGEN sind entlang der Kapitel-Kette monoton nicht-fallend", () => {
    // Reihenfolge = Kapitelnummer des eigenen Gates (nicht Content-Array-Reihenfolge). Seit Task
    // #345 (Chef-Entscheid 25.07.) sperrt requiredLevel NICHT mehr — es ist die auf der Karte
    // angezeigte Empfehlung ("Empfohlen: Kampfstufe {n}"). Der Guard bleibt trotzdem bestehen:
    // ein späteres Kapitel darf nie eine NIEDRIGERE Empfehlung tragen als ein früheres, sonst
    // liest sich die Leiter rückwärts (Anzeige-Kohärenz statt Zutritts-Härte).
    const storyDungeons = content.dungeons.filter((d) => d.id !== "paragon_tower");
    const chapterNum = (qid: string | undefined) => (qid ? parseInt(qid.replace("chronicle_", ""), 10) : -1);
    const sorted = [...storyDungeons].sort((a, b) => chapterNum(a.requiresQuest) - chapterNum(b.requiresQuest));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      expect(
        cur.requiredLevel,
        `${cur.id} (gate ${cur.requiresQuest}, requiredLevel ${cur.requiredLevel}) liegt UNTER ` +
          `${prev.id} (gate ${prev.requiresQuest}, requiredLevel ${prev.requiredLevel}) — Kette nicht monoton`,
      ).toBeGreaterThanOrEqual(prev.requiredLevel);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Guard B — Nebenquest-Erreichbarkeit
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Erreichbarkeits-Pfade eines Monsters, als Liste von Gate-Sets: nicht-dungeonOnly-Monster haben
 * GENAU EINEN Pfad (ihr Zonen-Gate, ggf. leer). dungeonOnly-Monster haben EINEN Pfad JE
 * enthaltendem Dungeon (Dungeon-Gate + Gate seiner Trägerzone `DungeonDef.zone` — Audit-Vorgabe
 * "bei dungeonOnly Dungeon+Trägerzone"; kann von `monster.zone` abweichen). Manche Monster stecken
 * in MEHREREN Dungeons (z.B. `roc_storm` in `highland_aerie` UND `wyvern_lair`) — der Spieler
 * braucht nur den GÜNSTIGSTEN Pfad, also OR über die Pfade, nicht AND über alle Gates (Pendant zur
 * `levelForTarget`-MIN-Logik in Guard A). Kein Dungeon gefunden (defensiv) ⇒ ein Pfad ohne Gates.
 */
function reachabilityPaths(monsterId: string): Set<string>[] {
  const m = content.monsters[monsterId];
  if (!m) return [];
  if (!m.dungeonOnly) {
    const zone = m.zone ? content.zones.find((z) => z.id === m.zone) : undefined;
    const gates = new Set<string>();
    if (zone?.requiresQuest) gates.add(zone.requiresQuest);
    return [gates];
  }
  const homes = containingDungeons(monsterId);
  if (homes.length === 0) return [new Set()];
  return homes.map((homeId) => {
    const dungeon = content.dungeons.find((d) => d.id === homeId);
    const gates = new Set<string>();
    if (dungeon?.requiresQuest) gates.add(dungeon.requiresQuest);
    const carrierZone = dungeon?.zone ? content.zones.find((z) => z.id === dungeon.zone) : undefined;
    if (carrierZone?.requiresQuest) gates.add(carrierZone.requiresQuest);
    return gates;
  });
}

/** Ist `monsterId` zum Zeitpunkt erreichbar, an dem `closure` (requires-Closure der Quest) bereits
 *  claimed ist? Reicht EIN Pfad, dessen Gates vollständig in der Closure liegen (OR über Pfade,
 *  AND über die Gates innerhalb eines Pfads). Ungegateter Pfad (leeres Set) ⇒ immer erreichbar. */
function reachableWithinClosure(monsterId: string, closure: Set<string>): boolean {
  return reachabilityPaths(monsterId).some((gates) => [...gates].every((g) => closure.has(g)));
}

function killMonsterTargetIds(objectives: QuestDef["objectives"]): { obj: QuestDef["objectives"][number]; ids: string[] }[] {
  return objectives
    .filter((o) => o.type === "kill_monster")
    .map((obj) => {
      const ids = new Set<string>(obj.targets ?? []);
      if (obj.target) ids.add(obj.target);
      return { obj, ids: [...ids] };
    });
}

describe("Guard B — Nebenquest-Erreichbarkeit (Quest-Progressions-Fix-Paket, 2026-07-23)", () => {
  it("jede non-daily Quest hat für jedes kill_monster-Ziel mindestens EIN zum Freischalt-Zeitpunkt erreichbares Ziel", () => {
    const violations: string[] = [];
    for (const quest of content.quests) {
      if (quest.daily) continue;
      const closure = requiresClosure(quest.id);
      for (const { obj, ids } of killMonsterTargetIds(quest.objectives)) {
        const anyReachable = ids.some((id) => reachableWithinClosure(id, closure));
        if (!anyReachable) {
          const detail = ids
            .map((id) => `${id}:paths=[${reachabilityPaths(id).map((p) => `{${[...p].join(",")}}`).join(" OR ")}]`)
            .join(", ");
          violations.push(
            `${quest.id}: KEIN Ziel des Objectives (Ziel "${obj.target}") erreichbar innerhalb der ` +
              `requires-Closure [${[...closure].join(",")}] — Gate-Sets: ${detail}`,
          );
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
