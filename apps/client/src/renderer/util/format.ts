/**
 * Anzeige-Locale der Zahlen-/Datumsformate — folgt der SPIELSPRACHE, nicht der OS-Locale
 * (Sweep-Fund T6, 2026-07-11: ein EN-Spieler auf deutschem Windows las "5.400" als
 * fünf-Komma-vier). Gesetzt von I18nProvider (applyDocumentLocale) beim Start + bei jedem
 * Sprachwechsel; Fallback undefined = OS-Locale (nur bis zum ersten Provider-Mount relevant).
 */
let formatLocale: string | undefined;

export function setFormatLocale(bcp47: string): void {
  formatLocale = bcp47;
}

/**
 * Große Zahlen mit Tausendertrennzeichen, z.B. Gold/XP: 482000 → "482,000".
 * Zentraler Ersatz für verstreute `.toLocaleString()`-Aufrufe (Sweep 5, Finding 6) — u.a. die
 * Topbar zeigte rohes "482000" während die Sidebar direkt daneben "482.000" formatierte.
 */
export function formatNum(n: number): string {
  return n.toLocaleString(formatLocale);
}

/**
 * Kampf-/Ausrüstungs-Statwerte: GANZZAHLIG gerundet, kein Dezimal-Krümel mehr (Chef-Feedback
 * #239: „17,3 / +7,8 / −0,1" liest sich unangenehm bei Tränken/Equip/Stats). Gilt für Damage,
 * HP/maxHp, Armor/armorRating, Attribute, flache Boni, DPS etc. — überall dort, wo bisher der
 * ÷10-Stat-Squish (Sweep 5, Squish-Follow-up) krumme Floats wie 0.4/1.4/17.3 durchsickern ließ.
 * Ändert NIE den zugrunde liegenden Wert, nur die Anzeige.
 *
 * AUSNAHME Sekunden (z.B. Angriffstempo „2,4s", Aktionsdauer): dort ist die Nachkommastelle
 * semantisch wichtig — solche Stellen nutzen bewusst `formatSeconds1` statt `formatStat`.
 */
export function formatStat(n: number): string {
  return n.toLocaleString(formatLocale, { maximumFractionDigits: 0 });
}

/**
 * claude:2026-10-25T10:30:00+01:00 — 1.4.1 B2 (Spieler-Report „massive floating point“ beim Fechten):
 * Zuwachs-Anzeigen wie die „+XP“-Einblendung der Skill-Karten. XP-Multiplikatoren erzeugen krumme
 * Floats (+8.400000000000091); unter 10 bleibt höchstens EINE Nachkommastelle, ab 10 ganzzahlig.
 * Trennzeichen folgt der Spielsprache. Ändert nie den Wert, nur die Anzeige.
 */
export function formatGain(n: number): string {
  return n.toLocaleString(formatLocale, { maximumFractionDigits: Math.abs(n) < 10 ? 1 : 0 });
}

/** Schadenszahlen (Waffen-Spanne/DPS im Tooltip): bis zu 1 Nachkommastelle — Früh-Waffen (0,5–0,9)
 *  zeigen echte Werte statt „1–1"/„0 DPS" (Chef 2026-07-08: „führen wir wieder Dezimalwerte ein"). */
export function formatDamage(n: number): string {
  return n.toLocaleString(formatLocale, { maximumFractionDigits: 1 });
}

/**
 * Sekunden auf GENAU eine Nachkommastelle (nie 0 Nachkommastellen wie `formatStat`) — für JEDE
 * Sekunden-Anzeige (Angriffstempo, Aktionsdauer, Kampf-Schwung-Timer-Countdown), z.B. "2,4s" /
 * "2.4s" (Trennzeichen folgt der Locale wie `formatStat`). Seit #239 die einzige Stelle für
 * Sekunden-Werte — `formatStat` selbst rundet jetzt auf Ganzzahlen (s. dort).
 */
export function formatSeconds1(n: number): string {
  return n.toLocaleString(formatLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Prozentwert einer Fraktion (0..1), bis zu 1 Nachkommastelle, OHNE überflüssige „,0" bei glatten
 * Werten (Fix-Welle CC, Fenn Befund 1): `toFixed(0)` rundete einen 4,5%-Pet-Passiv-Bonus auf
 * "+5%" — ein realer Wert wurde falsch angezeigt. `maximumFractionDigits: 1` OHNE
 * `minimumFractionDigits` lässt `toLocaleString` die Nachkommastelle bei glatten Zahlen selbst
 * weglassen (5 → "5", 4.5 → "4,5"/"4.5" je nach Locale). Aufrufer hängt "%" selbst an.
 */
export function formatPct1(fraction: number): string {
  return (fraction * 100).toLocaleString(formatLocale, { maximumFractionDigits: 1 });
}

/**
 * Prozentwert einer Fraktion mit bis zu 2 Nachkommastellen — für kleine Sätze wie den Zauberfokus
 * („+0,31 % Schaden je INT", Chef-GO 28.08.2026), bei denen 1 Nachkommastelle die Stufen (0,30 /
 * 0,31 / 0,32) nicht mehr unterscheiden würde. Glatte Werte ohne Nullen-Schwanz wie `formatPct1`.
 */
export function formatPct2(fraction: number): string {
  return (fraction * 100).toLocaleString(formatLocale, { maximumFractionDigits: 2 });
}

/**
 * Drop-/Loot-Chance (0..1) als Prozent-Text, CHEF-REGEL „immer %, nie Brüche": gestaffelte
 * Präzision je Seltenheit (<1% → 2 Nachkommastellen, <10% → 1, sonst ganzzahlig) — sonst würde
 * z.B. 0,1% als "0%" verschwinden. Extrahiert aus BestiaryPage (Fun-Sweep FF, Grete G1): geteilte
 * Quelle für die Bestiary-Drop-Liste UND die neue Dungeon-Beute-Vorschau (CombatPage), damit beide
 * Stellen exakt dieselbe Rundung zeigen.
 *
 * Welle KK (ItemWikiModal-Vereinheitlichung #8b): 2 Dezimalen reichen bei den seltensten Chase-
 * Drops nicht — der Content kennt Ketten-Chancen bis 0,003 % (0.00003), die bei fester 2-Dezimal-
 * Präzision auf "0.00%" verschwänden (genau der alte "Ember Elemental 0.0%"-Ur-Fund, den das
 * inzwischen entfernte, wiki-lokale `pct()` per 3-Dezimal-Eskalation abfing). Eskaliert hier
 * zentral auf 3 Dezimalen, wenn 2 auf null runden würden — kommt jetzt allen drei Aufrufern
 * (Bestiarium, Dungeon-Beute-Vorschau, Item-Wiki) gleichermaßen zugute.
 */
export function formatDropPct(chance: number): string {
  if (chance >= 1) return "100%";
  const pct = chance * 100;
  let digits = chance < 0.01 ? 2 : chance < 0.1 ? 1 : 0;
  if (digits === 2 && Number(pct.toFixed(digits)) === 0) digits = 3;
  return `${pct.toLocaleString(formatLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/**
 * Kompakte Zahl mit EINER Nachkommastelle ab 1000, z.B. 16800 → "16.8k" (EN) / "16,8k" (DE) —
 * Trennzeichen folgt der Spielsprache wie jede andere Zahl hier (Release-Fix-Welle 0.3.0 Fix 5:
 * die vorherige SkillPage-lokale `formatK` schrieb das Komma HART über `.replace(".", ",")` rein,
 * unabhängig von der gewählten Sprache — ein EN-Spieler sah „5.1k" fälschlich als „5,1k". Das „k"
 * selbst bleibt unübersetzt (wie zuvor, international verständliche Kurzschreibweise, kein
 * Sprachbegriff).
 */
export function formatCompactK(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toLocaleString(formatLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
}

/** Gespielte Zeit kompakt, z.B. "2h 14m" oder "8m". */
export function formatPlaytime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Kurzer m:ss-Countdown (Elite-Verfügbarkeitsfenster/-Cooldown, Kampf-Schwung-Timer etc.) — NIE
 * Stunden. Extrahiert aus CombatPage.tsx `formatEliteCountdown` (Jagd-Paket, Chef-GO): jetzt auch
 * vom Kopfgeld-Brett (SlayerPage) und dem Champion-Kodex (BestiaryPage) genutzt, eine Quelle statt
 * einer dritten Kopie derselben zwei Zeilen.
 */
export function formatMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Reine Uhrzeit ohne Datum, z.B. "06:40" — für die Warteschlangen-Endzeit-Prognose ("fertig gegen
 * 06:40", Steam-Forum-Wunsch 1.0.1, s. queueTiming.ts). Folgt wie `formatDate` der Spielsprache
 * (`formatLocale`), NICHT der OS-Locale.
 */
export function formatClockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(formatLocale ?? "de-DE", { hour: "2-digit", minute: "2-digit" });
}

/** Letztes Speicherdatum in lokaler Schreibweise. */
export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString(formatLocale ?? "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Relative Zuletzt-gespielt-Angabe fürs Menü ("Today"/"Yesterday"/"N days ago"), fällt für
 * älteres auf `formatDate` zurück. Kalendertag-Vergleich statt reiner 24h-Differenz, damit
 * "Gestern" auch kurz nach Mitternacht stimmt; ein (theoretisch) in der Zukunft liegender
 * Zeitstempel fällt defensiv auf "Today" statt auf eine negative Tageszahl.
 *
 * Aus MainMenu.tsx extrahiert (Neuguss New-Game/Load-Game-Screens, Chef-Auftrag 26.08.2026):
 * jetzt auch von pages/LoadGameScreen.tsx genutzt, eine Quelle statt eines Duplikats.
 */
export function formatLastPlayed(savedAt: number, t: (key: string) => string): string {
  const startOfDay = (ms: number): number => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const dayDiff = Math.round((startOfDay(Date.now()) - startOfDay(savedAt)) / 86_400_000);
  if (dayDiff <= 0) return t("menu.today");
  if (dayDiff === 1) return t("menu.yesterday");
  if (dayDiff < 7) return t("menu.daysAgo").replace("{n}", String(dayDiff));
  return formatDate(savedAt);
}

/**
 * Lager-Ausbaustufe als römische Ziffer (0 = ungebaut ⇒ leerer String). Sprachneutral, in allen
 * sieben Locales identisch — deshalb kein i18n-Schlüssel.
 *
 * EINE Quelle für alle Stellen, die eine Gebäude-Stufe anzeigen (Bau-fertig-Toast, „Während du weg
 * warst"-Bühne). Vorher lag dieselbe Ziffern-Tabelle in jeder Datei erneut; die NewHavenPage hält
 * bewusst ihre eigene Variante, weil sie auch ZIEL-Stufen jenseits des Katalogs (IV/V) beschriften
 * können muss.
 */
export function romanLevel(level: number): string {
  const n = Math.max(0, Math.floor(level));
  return ["", "I", "II", "III"][n] ?? String(n);
}
