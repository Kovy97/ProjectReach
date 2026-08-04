/**
 * SIM-Agent-Toolkit — Strukturiertes Reporting.
 *
 * Personas (sim-personas.ts) emittieren `Finding`s mit konkreten Repro-Schritten und State-Evidence
 * (aus `SimPlayer.snapshot()`). Der `FindingCollector` sammelt/gruppiert sie, der Markdown-Formatter
 * macht daraus einen an den Chef weiterreichbaren Bericht.
 *
 * ZUSÄTZLICH (Sweep-Toolkit): das FRICTION-LOG — leichte „Reibungs-Momente" eines realistischen
 * Spielers (sim-realistic.ts). Ein `FrictionEvent` ist KEIN Bug-Finding, sondern der Moment, in dem
 * ein echter Spieler stutzt („wollte X, ging nicht, warum?"). API:
 *   - `FrictionEvent { moment, what, whyConfusing, evidence? }`
 *   - `FrictionCollector` — sammelt Events (add/all/count), dedupliziert exakt gleiche Momente nicht
 *     (Wiederholung IST Signal).
 *   - `formatFrictionMarkdown(events, title?)` — das „realistische Spieler-Feedback" für Sweep-Berichte.
 *
 * Rein deterministisch/headless: keine I/O, kein Date.now, keine Engine-Abhängigkeit — nur Datentypen
 * + Formatierung. Bewusst frei von Persona-/Player-Imports (kein Import-Zyklus).
 */

/** P0 = Blocker/Crash · P1 = schwer · P2 = mittel · P3 = klein/Politur. */
export type Severity = "P0" | "P1" | "P2" | "P3";

/** Grobklasse: echter Fehler · Balance-Schieflage · Bedienbarkeit · Spielgefühl · Content-Inkonsistenz. */
export type Category = "bug" | "balance" | "ux" | "feel" | "consistency";

export interface Finding {
  severity: Severity;
  category: Category;
  /** Kurze, eindeutige Überschrift (eine Zeile). */
  title: string;
  /** Konkrete, nachvollziehbare Reproschritte (was der Fake-Spieler getan hat). */
  repro: string[];
  /** Was hätte passieren sollen. */
  expected: string;
  /** Was tatsächlich passiert ist. */
  actual: string;
  /** Optionale State-Evidence (z.B. Auszug aus snapshot(): Level, Gold, Slot-Zähler …). */
  evidence?: Record<string, unknown>;
}

/** Sortier-/Anzeigereihenfolge der Schweregrade (P0 zuerst). */
export const SEVERITY_ORDER: Severity[] = ["P0", "P1", "P2", "P3"];

/**
 * Sammelt Findings über eine ganze Sim-Session hinweg (mehrere Personas). Reine In-Memory-Struktur;
 * keine Sortier-Nebenwirkungen bis zum Abruf.
 */
export class FindingCollector {
  private items: Finding[] = [];

  /** Fügt genau ein Finding hinzu. Gibt es zur bequemen Verkettung zurück. */
  add(finding: Finding): Finding {
    this.items.push(finding);
    return finding;
  }

  /** Fügt mehrere Findings auf einmal hinzu. */
  addAll(findings: readonly Finding[]): void {
    for (const f of findings) this.items.push(f);
  }

  /** Alle Findings in Einfügereihenfolge. */
  all(): Finding[] {
    return [...this.items];
  }

  /** Findings nach Schweregrad gruppiert (immer alle vier Buckets vorhanden). */
  bySeverity(): Record<Severity, Finding[]> {
    const out: Record<Severity, Finding[]> = { P0: [], P1: [], P2: [], P3: [] };
    for (const f of this.items) out[f.severity].push(f);
    return out;
  }

  /** Anzahl je Schweregrad (für Kopfzeilen/Tallies). */
  counts(): Record<Severity, number> {
    const grouped = this.bySeverity();
    return { P0: grouped.P0.length, P1: grouped.P1.length, P2: grouped.P2.length, P3: grouped.P3.length };
  }

  count(): number {
    return this.items.length;
  }

  /** Gibt es Blocker (P0) oder schwere (P1) Findings? → Release-Gate. */
  hasBlocking(): boolean {
    return this.items.some((f) => f.severity === "P0" || f.severity === "P1");
  }
}

/** Ein einzelnes Finding als Markdown-Block. */
export function formatFinding(f: Finding, index?: number): string {
  const heading = index !== undefined ? `### ${index}. [${f.severity}/${f.category}] ${f.title}` : `### [${f.severity}/${f.category}] ${f.title}`;
  const lines: string[] = [heading];
  lines.push("");
  lines.push(`- **Erwartet:** ${f.expected}`);
  lines.push(`- **Tatsächlich:** ${f.actual}`);
  if (f.repro.length > 0) {
    lines.push(`- **Repro:**`);
    f.repro.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
  }
  if (f.evidence && Object.keys(f.evidence).length > 0) {
    lines.push(`- **Evidence:**`);
    lines.push("  ```json");
    for (const line of JSON.stringify(f.evidence, null, 2).split("\n")) lines.push(`  ${line}`);
    lines.push("  ```");
  }
  return lines.join("\n");
}

/**
 * Rendert eine Findings-Liste als Markdown-Bericht: Kopf-Tally + nach Schweregrad gruppierte Blöcke.
 * `title` erlaubt einen Abschnittstitel (z.B. Persona-Name).
 */
export function formatFindingsMarkdown(findings: readonly Finding[], title = "Sim-Findings"): string {
  const collector = new FindingCollector();
  collector.addAll(findings);
  const counts = collector.counts();
  const out: string[] = [];
  out.push(`# ${title}`);
  out.push("");
  out.push(
    `**Tally:** ${collector.count()} Findings — ` +
      SEVERITY_ORDER.map((s) => `${s}: ${counts[s]}`).join(" · "),
  );
  out.push("");
  if (collector.count() === 0) {
    out.push("_Keine Auffälligkeiten._");
    return out.join("\n");
  }
  const grouped = collector.bySeverity();
  let n = 0;
  for (const sev of SEVERITY_ORDER) {
    const bucket = grouped[sev];
    if (bucket.length === 0) continue;
    out.push(`## ${sev} (${bucket.length})`);
    out.push("");
    for (const f of bucket) {
      out.push(formatFinding(f, ++n));
      out.push("");
    }
  }
  return out.join("\n").trimEnd();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Friction-Log — „Reibungs-Momente" eines realistischen Spielers (kein Bug-Bericht, sondern
// das Protokoll der Stellen, an denen ein Mensch gestockt hätte). Genutzt von sim-realistic.ts.
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Ein einzelner Reibungs-Moment aus Sicht eines echten Spielers. */
export interface FrictionEvent {
  /** Wann/Wo im Spielverlauf (z.B. "Sim-Min 42, Kampf gegen bog_troll" oder "Shop, Food-Nachkauf"). */
  moment: string;
  /** Was der Spieler wollte bzw. was passierte (eine Zeile). */
  what: string;
  /** Warum das für einen Menschen verwirrend/frustrierend ist. */
  whyConfusing: string;
  /** Optionale State-Evidence (Level, Gold, reason-Strings der Engine …). */
  evidence?: Record<string, unknown>;
}

/**
 * Sammelt Friction-Events über eine Session. Bewusst OHNE Deduplizierung: dass derselbe Moment
 * mehrfach auftritt, ist selbst ein Signal (der Spieler läuft wiederholt gegen dieselbe Wand).
 */
export class FrictionCollector {
  private items: FrictionEvent[] = [];

  add(event: FrictionEvent): FrictionEvent {
    this.items.push(event);
    return event;
  }

  addAll(events: readonly FrictionEvent[]): void {
    for (const e of events) this.items.push(e);
  }

  all(): FrictionEvent[] {
    return [...this.items];
  }

  count(): number {
    return this.items.length;
  }
}

/**
 * Rendert das Friction-Log als Markdown — das „realistische Spieler-Feedback" für Sweep-Berichte.
 * Gruppiert NICHT nach Schwere (Frictions haben keine), sondern erzählt chronologisch; identische
 * `what`-Zeilen werden zusammengefasst („×N"), damit wiederholte Reibung als Muster sichtbar wird.
 */
export function formatFrictionMarkdown(events: readonly FrictionEvent[], title = "Friction-Log"): string {
  const out: string[] = [];
  out.push(`# ${title}`);
  out.push("");
  if (events.length === 0) {
    out.push("_Keine Reibungspunkte — die Session lief flüssig._");
    return out.join("\n");
  }
  // Wiederholungs-Muster: gleiche what+whyConfusing zählen zusammen (Chronologie des Erstauftritts).
  const groups = new Map<string, { first: FrictionEvent; count: number; moments: string[] }>();
  for (const e of events) {
    const key = `${e.what}|${e.whyConfusing}`;
    const g = groups.get(key);
    if (g) {
      g.count++;
      if (g.moments.length < 5) g.moments.push(e.moment);
    } else {
      groups.set(key, { first: e, count: 1, moments: [e.moment] });
    }
  }
  out.push(`**${events.length} Reibungs-Moment(e), ${groups.size} Muster.**`);
  out.push("");
  let n = 0;
  for (const { first, count, moments } of groups.values()) {
    const times = count > 1 ? ` (×${count})` : "";
    out.push(`### ${++n}. ${first.what}${times}`);
    out.push("");
    out.push(`- **Moment:** ${moments.join(" · ")}${count > moments.length ? " · …" : ""}`);
    out.push(`- **Warum verwirrend:** ${first.whyConfusing}`);
    if (first.evidence && Object.keys(first.evidence).length > 0) {
      out.push(`- **Evidence:** \`${JSON.stringify(first.evidence)}\``);
    }
    out.push("");
  }
  return out.join("\n").trimEnd();
}
