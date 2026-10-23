import { createRng as createRngW3, deriveEventRngSeed } from "@hearthforge/engine"; // claude:2026-10-25T00:30:00+02:00
import { defaultRaidState, defaultSkillEventState, defaultWorkOrderState } from "@hearthforge/shared";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { TOOL_SLOTS, SAVE_VERSION, defaultHuntTraps, defaultPrestigeState, defaultTavernState, eliteZoneCooldownBand, emptyEquipKit } from "@hearthforge/shared";
import { computeStats, storagePredicate } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Der Spiegel von Kit 0 gegen die getragene Ausruestung — OHNE die Werkzeug-Slots.
 *
 * Seit SAVE 87 (Chef-Entscheid 31.08.2026) gehoeren Werkzeuge keinem Kit mehr: sie haengen am
 * Charakter und bleiben beim Kit-Wechsel liegen. Der Spiegel traegt auf den Werkzeug-Slots also
 * immer null, waehrend der Charakter sein Werkzeug behaelt — genau das ist der Zweck der
 * Aenderung, und genau das pruefen die Aufrufer zusaetzlich.
 */
function ohneWerkzeuge<T extends object>(equipment: T): T {
  const kopie = { ...equipment } as T;
  for (const slot of TOOL_SLOTS) (kopie as Record<string, unknown>)[slot] = null;
  return kopie;
}


/**
 * SAVE-KOMPAT-VAULT (Chef-Gesetz, 2026-07-08): „Sobald wir produktiv sind, müssen Saves IMMER
 * kompatibel sein — Korruption durch ein Update ist unter keinen Umständen akzeptabel."
 *
 * In `fixtures/save-compat/` liegen eingefrorene ECHTE Saves jeder ausgelieferten Version
 * (Namensschema `vNN-<quelle>.json`; v56 = erster Steam-Build, eingefroren 2026-07-08 aus den
 * Original-Saves des Chefs, BEVOR ein neuerer Build sie migrieren konnte). Dieser Guard lädt
 * JEDES Vault-Fixture durch die volle deserialize-Kette (Migration + sanitize) und prüft die
 * Kern-Invarianten. Er MUSS vor jedem Steam-Depot-Upload grün sein.
 *
 * PROZESS bei jedem Release: (1) ein echtes Save der auszuliefernden Version einfrieren und hier
 * ins Vault legen, (2) diese Suite grün, (3) erst dann Depot-Upload. Fixtures werden NIE
 * aktualisiert oder gelöscht — sie repräsentieren, was auf Kunden-Platten liegt.
 *
 * SCHRITT (1) HÄNGT AN SAVE_VERSION, NICHT AN DER APP-VERSION (Präzedenz: v79 bekam bewusst kein
 * eigenes Pin, weil v79 nie ausgeliefert wurde; CODEX/inbox/README.md: „bei SAVE_VERSION-Bumps das
 * Vault-Neu-Pin-Ritual"). RELEASE 1.0.0 „Vollrelease" (2026-08-18, EA-Exit) liefert SAVE_VERSION 80
 * ein ZWEITES Mal aus: seit dem 0.3.0-Live-Stand ist `packages/**` unverändert (kein Bump, keine
 * Migration, keine Content-ID-Änderung), der ausgelieferte Save-Stand ist also byte-genau der
 * bereits gepinnte. Ein `v80-release-1.0.0.json` wäre eine exakte Kopie von
 * `v80-release-0.3.0.json` — null zusätzliche Abdeckung, doppelte Laufzeit und zwei konkurrierende
 * „v80-Release-Pins". Deshalb BEWUSST KEIN neues Fixture; die v80-Pins (`v80-release-0.3.0.json`
 * als sanitize-Fixpunkt + `v80-filled-0.3.0.json` als befülltes Lager) decken 1.0.0 mit ab.
 *
 * SAVE_VERSION 81 (New-Haven-Bauwarteschlange, Spieler-Report 1.0.2): der v80-Pin unten ist damit
 * vom IDENTITÄTS- zum MIGRATIONS-Pin geworden — er belegt jetzt, dass ein v80-Save auf v81 hebt
 * und sich dabei GENAU EIN Feld ändert (`camp.buildQueue`, leer). Ein eigenes `v81-*.json` kommt
 * beim RELEASE dieser Version ins Vault: das Ritual verlangt ein echtes AUSGELIEFERTES Save, und
 * v81 ist noch keins (Präzedenz v79, s.o.).
 *
 * SAVE_VERSION 82 (Anbau: Folgesorte je Beet — Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p12): zweiter Bump im selben Release-Fenster, v81 wurde
 * ebenfalls nie ausgeliefert (Präzedenz v79/v80). Der v80-Pin belegt jetzt die Kette v80 → v82 und
 * dass sich dabei GENAU ZWEI Flächen ändern: `camp.buildQueue: []` (v81) und
 * `farmPlots[*].nextCropId: null` auf allen neun Beeten (v82). Ein `v82-*.json` kommt beim Release
 * von 1.1.0 ins Vault.
 *
 * SAVE_VERSION 83 (Dungeons queuebar — Chef-Auftrag 26.08.2026: 1×/25×/50×/∞-Läufe wie bei
 * Kämpfen): dritter Bump im selben Release-Fenster, v82 wurde ebenfalls nie ausgeliefert. Der
 * v80-Pin belegt jetzt die Kette v80 → v83 mit GENAU DREI Flächen: `camp.buildQueue: []` (v81),
 * `farmPlots[*].nextCropId: null` (v82) und `queueDungeon: null` (v83 — Laufzeit des aktiven
 * Queue-Dungeon-Laufs; Alt-Queue-Einträge bleiben byte-gleich). Ein `v83-*.json` kommt beim
 * Release von 1.1.0 ins Vault (Ritual: echtes ausgeliefertes Save, kein synthetisches Fixture —
 * die Ladepfade der neuen Felder deckt dungeon-queue-persistence.test.ts ab).
 *
 * SAVE_VERSION 84 (Taverne — 1.2.0 „Alive", design/1.2.0-alive/taverne-spec-technik.md): vierter
 * Bump, v83 wurde ebenfalls nie ausgeliefert (1.1.0 ging mit v83-Stand als synthetisches Fixture
 * ins Vault, s. unten). Der v80-Pin belegt jetzt die Kette v80 → v84 mit GENAU VIER Flächen:
 * `camp.buildQueue: []` (v81), `farmPlots[*].nextCropId: null` (v82), `queueDungeon: null` (v83)
 * und `tavern: defaultTavernState()` + `stats.actionRunsById: {}` + `stats.producedById: {}` (v84).
 * `v84-synthetic-1.2.0.json` ist SYNTHETISCH wie v83 (createGame + Zustandsaufbau über `serialize`,
 * diesmal MIT gebauter Taverne, Tagesbesetzung, angenommener Aufgabe und einer Abgabe auf dem
 * echten Content) — die Sanitize-Fälle deckt tavern-persistence.test.ts ab.
 *
 * SAVE_VERSION 85 (Jagen — 1.2.0 „Fasern und Fallen", design/handwerk-fasern-jagen/spec-technik.md):
 * fünfter Bump, v84 wurde ebenfalls nie ausgeliefert (die Taverne rückte per Chef-Entscheid J7 auf 1.3.0).
 * Der v80-Pin belegt jetzt die Kette v80 → v85 mit GENAU FÜNF Flächen: die vier oben plus
 * `huntTraps: defaultHuntTraps()` (sechs leere Fallenplätze) + `huntCatchSeq: 0` + `stats.huntCatches: 0`
 * (v85). `v85-synthetic-1.2.0.json` ist SYNTHETISCH wie v83/v84 (createGame + Zustandsaufbau über
 * `serialize` auf dem echten Content: Jagen-XP, Fang-Breadcrumb, Fang-Zähler) — Migration v84 → v85
 * byte-genau, Sanitize-Fälle und OfflineSummary.huntCatches deckt hunt-persistence.test.ts ab.
 *
 * SAVE_VERSION 85-NACHTRAG (Ausrüstungs-KITS, Chef-Entscheid 28.08.2026 — KEIN weiterer Bump, v85 ist
 * unveröffentlicht): die v75-Loadout-Vorlagen `equipLoadouts` werden durch echte Kits `equipKits` (3 ×
 * equipment + equippedInstances) + `activeKit` ersetzt. Der v80-Pin belegt damit die Kette v80 → v85 mit
 * GENAU SECHS Flächen: die fünf oben plus `equipKits` = [Spiegel der getragenen Ausrüstung, leer, leer]
 * + `activeKit: 0`, wobei `equipLoadouts` (im v80-Save `[null, null, null]`) aus dem State VERSCHWINDET.
 * SAVE_VERSION 86 (Skill-Split „Schneidern", Chef-Entscheid 28.08.2026, design/handwerk-fasern-jagen/
 * spec-technik.md §6): sechster Bump, v85 wurde ebenfalls nie ausgeliefert. KEIN neues State-Feld — nur das
 * neue Skill-Konto `skills.tailoring`, das die Migration für JEDEN Alt-Save anlegt (`{ xp: 0 }` ohne Craft-
 * Log/Handwerk-XP; sonst der nach `stats.craftedById` × Rezept-XP berechnete Anteil, den Handwerk abgibt —
 * Regel und Beispielzahlen pinnt tailoring-split-persistence.test.ts). Der v80-Pin belegt damit die Kette
 * v80 → v86 mit der SECHSTEN Fläche `skills.tailoring: { xp: 0 }` (der v80-Save hat weder Handwerk-XP noch
 * Stoff-Rezepte im Craft-Log — nur garnet/sapphire). `v86-synthetic-1.2.0.json` ist SYNTHETISCH und über die
 * REALE KETTE gepinnt (v85-Stand mit Handwerk 60 + Craft-Log aus Roben/Stoff/Umhang/Leder → deserialize →
 * serialize): trägt tailoring > 0 UND leatherworking > 0 samt Craft-Zählern.
 *
 * Das v85-Fixture wurde durch die reale Kette neu gepinnt (Präzedenz: synthetisch). Befüllte Vorlagen
 * → Kits (Items aus dem Inventar) deckt equip-kits-persistence.test.ts ab.
 *
 * claude:2026-10-17T22:40:00+02:00 — SAVE 87 (1.3.0; v87+v88 aus 1.2.4 zusammengelegt, beide nie live):
 * `v87-synthetic-1.3.0.json` ist SYNTHETISCH (createGame + serialize): Bankfächer MIT Lücken (`bankOrder`),
 * belegter vierter Werkzeug-Slot `tool4`, Rabenfracht-Sendung (`kind: "transfer"`) und Kills auf neue
 * Götzenhallen-Wesen. Beim 1.3.0-Release durch einen echten Spielstand ergänzen.
 *
 * claude:2026-10-17T23:30:00+02:00 — SAVE 88 (Prestige-Fundament, 1.3 Welle B1): neues Feld `prestige`
 * (Default für jeden Alt-Save). `v88-synthetic-1.3.0.json` ist SYNTHETISCH und über die REALE KETTE gepinnt:
 * v87-Fixture → 5×99 + Kapitel 21/22 + Begleiter/Jagdbuch/Meisterschaft → `ascend` → etwas Fortschritt im
 * zweiten Durchgang → serialize (Fixpunkt). Trägt damit `prestige.count = 1` samt Historie, Quest-Laufanker in
 * `quests.repeatBaseline` und die gesperrte Rabenfracht. Die Detailprüfungen stehen in prestige-persistence.test.ts.
 * claude:2026-10-18T19:40:00+02:00 — Format-Nachtrag Welle E1 (kein Bump, v88 nie live): Fixture um
 * `prestige.runStart` ergänzt (Zählerstände beim Aufstieg der Kette, belegt durch Laufanker und unveränderte
 * Lebenszeit-Zähler); der Historien-Eintrag bleibt bewusst ohne `tally` (vor E1 geschrieben, nichts erfunden).
 *
 * claude:2026-10-25T13:45:00+02:00 — SAVE 93 (1.4.0 „Feder und Stahl“, v89–v93 nie live, Migrationen bleiben einzeln):
 * `v93-synthetic-1.4.0.json` ist SYNTHETISCH und über die REALE KETTE gebaut: v88-Fixture → Migration v89–v93 →
 * Bognerei 42, Bogen mit Kupfer-Köcher und 250 geladenen Kupferpfeilen (`loadQuiver`), Mahlzeit-Platz
 * (`marshroot_chowder`, „Mahlzeit halten“ an), Bergungs-Schloss, aktive Reiche Ader samt Logbuch, ein angenommener
 * Lieferauftrag (`makeWorkOrderOffer` + `acceptWorkOrder`), Raid freigeschaltet, ein Normal-Lauf über alle fünf Räume
 * geräumt mit offenem Abschluss-Dialog (`startRaid` + `onRaidRoomCleared`/`continueRaid`, Beute im Lauf), laufender
 * Bergbau und dahinter ein Raid-Eintrag in der Warteschlange, Raid-Teile (heroisch/mythisch in der Bank, Normal-Ring
 * angelegt) → serialize (Fixpunkt beim v88-savedAt). Bewusst KEIN Lauf in Rast oder Kampf: offline zieht der Raid
 * weiter (A6), der schwache Fixture-Charakter stürbe, und der Tod hinterlässt transiente Kampffelder (`stopReason`
 * u. a.), die absichtlich nicht gespeichert werden; das wäre kein Migrationsfehler, ließe aber den Round-Trip-Vergleich
 * reißen. Laufender Raid über Save/Load steht in raid-persistence.test.ts. Generator war ein Einmal-Test, danach gelöscht.
 */
const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");

/** Rekursiv nach non-finiten Zahlen suchen (NaN/±Infinity überleben JSON nicht sauber). */
function findNonFinite(value: unknown, path: string, out: string[]): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) out.push(`${path} = ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findNonFinite(v, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) findNonFinite(v, `${path}.${k}`, out);
  }
}

/*
 * SAVE_VERSION 83 (Dungeons queuebar, 26.08.2026) — `v83-synthetic-1.1.0.json` ist SYNTHETISCH: der Chef
 * hat am 26.08. ausdruecklich keinen echten Spielstand als Fixture freigegeben („05: Nein"). Das Fixture
 * wurde aus `createGame` + Zustandsaufbau (Skills, Inventar/Bank, Ausruestung, Slayer-Auftrag, aktive Aktion,
 * Kampf-Queue-Eintrag) ueber `serialize` erzeugt und deckt damit die ausgelieferte v83-Form ab, nicht einen
 * Kunden-Save. Sobald ein echter 1.1.0-Save vorliegt, kommt er ZUSAETZLICH ins Vault (dieses Fixture bleibt).
 */
describe("Save-Kompat-Vault: jede jemals ausgelieferte Save-Version lädt verlustfrei", () => {
  const fixtures = readdirSync(VAULT_DIR).filter((f) => f.endsWith(".json"));

  it("Vault ist nicht leer (mind. das v56-Launch-Fixture)", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.some((f) => f.startsWith("v56-"))).toBe(true);
  });

  for (const file of fixtures) {
    it(`${file}: lädt, migriert auf v${SAVE_VERSION}, Kern-Invarianten halten, Round-Trip stabil`, () => {
      const json = readFileSync(join(VAULT_DIR, file), "utf-8");

      // (1) Volle Lade-Kette (JSON → Migration → sanitize) darf nie null/Exception liefern.
      const result = deserialize(json, content, Date.now());
      expect(result, `deserialize lieferte null für ${file}`).not.toBeNull();
      const state = result!.state;

      // (2) Auf aktuelle Version migriert.
      expect(state.version).toBe(SAVE_VERSION);

      // (3) Kern-Invarianten: Charakter, Gold, Skills, Inventar-Referenzen.
      expect(state.character.name.length).toBeGreaterThan(0);
      expect(Number.isFinite(state.character.gold)).toBe(true);
      expect(state.character.gold).toBeGreaterThanOrEqual(0);
      for (const [skillId, entry] of Object.entries(state.skills)) {
        expect(Number.isFinite(entry.xp), `skills.${skillId}.xp non-finite`).toBe(true);
        expect(entry.xp).toBeGreaterThanOrEqual(0);
      }
      for (const slot of state.inventory.slots) {
        if (!slot) continue;
        expect(content.items[slot.itemId], `Inventar referenziert unbekanntes Item ${slot.itemId}`).toBeDefined();
        expect(slot.qty).toBeGreaterThan(0);
      }
      for (const [itemId] of Object.entries(state.bank)) {
        expect(content.items[itemId], `Bank referenziert unbekanntes Item ${itemId}`).toBeDefined();
      }
      for (const [slot, itemId] of Object.entries(state.character.equipment)) {
        if (itemId) expect(content.items[itemId], `equipment.${slot} referenziert unbekanntes Item ${itemId}`).toBeDefined();
      }

      // (4) Keine non-finiten Zahlen irgendwo im State (NaN-Korruptionsdetektor).
      const nonFinite: string[] = [];
      findNonFinite(state, "state", nonFinite);
      expect(nonFinite, `non-finite Werte: ${nonFinite.join(", ")}`).toEqual([]);

      // (5) Der migrierte State ist voll spielbar: computeStats crasht nicht und liefert Finites.
      const stats = computeStats(state, content);
      expect(Number.isFinite(stats.maxHp)).toBe(true);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(Number.isFinite(stats.attackDamageMax)).toBe(true);

      // (6) Round-Trip-Stabilität: serialize → deserialize ändert den State nicht mehr
      //     (Migration + sanitize sind idempotent — nichts „wandert" bei jedem Laden weiter).
      //     WICHTIG: EIN fixer Zeitstempel für serialize UND deserialize — sonst vergehen unter
      //     Testlast echte ms zwischen den Date.now()-Aufrufen und der zweite Load macht einen
      //     realen Catch-up-Tick (flaky; genau so am 2026-07-09 unter 3 parallelen Agenten gesehen).
      const now = Date.now();
      const again = deserialize(serialize(state, now), content, now);
      expect(again).not.toBeNull();
      expect(again!.state).toEqual(state);
    });

    // ZEITROBUSTHEIT (Regression 2026-07-16): Der Guard riss einmal zeitVERSETZT — grün beim
    // Pinnen des v64-Fixtures, rot Stunden später, obwohl niemand Code angefasst hatte. Ursache:
    // Das Fixture trug eine AKTIVE Fischerei-Aktion (legal — Spieler speichern mitten in
    // Aktionen); mit dem Alter des Fixtures wuchs offlineMs bis zum 8h-Cap, der Catch-up schob
    // fishing.xp über die Level-99-Schwelle (13 034 431), und die damalige sanitize-Klemme
    // (XP gegen xpForLevel(MAX_LEVEL) statt gegen den reinen Korruptions-Cap) beschnitt die XP
    // beim Re-Load → Round-Trip instabil. Dieser Fall pinnt das Worst-Case-Zeitfenster für
    // JEDES Fixture, egal wie frisch es gepinnt wurde: now liegt 7 Tage in der Zukunft, damit
    // offlineMs garantiert voll in den 8h-Cap läuft und der maximale Offline-Catch-up (inkl.
    // aktiver Aktion/aktivem Kampf) VOR dem Round-Trip passiert. serialize+deserialize nutzen
    // dasselbe künftige now (kein zweiter Catch-up) — gemessen wird also die reine
    // Migration/Sanitize-Idempotenz auf einem maximal fortgeschriebenen State. Damit kann der
    // Guard nie wieder allein durch Alterung eines Fixtures umkippen.
    it(`${file}: Round-Trip stabil auch nach vollem 8h-Offline-Cap (now = +7 Tage)`, () => {
      const json = readFileSync(join(VAULT_DIR, file), "utf-8");
      const future = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const result = deserialize(json, content, future);
      expect(result, `deserialize lieferte null für ${file}`).not.toBeNull();
      const state = result!.state;
      const again = deserialize(serialize(state, future), content, future);
      expect(again).not.toBeNull();
      expect(again!.state).toEqual(state);
    });
  }
});

/**
 * v80-RELEASE-PIN (Vault-Pin v80, Save-Kompat-GESETZ vor dem Depot-Upload): das
 * `v80-release-0.3.0.json`-Fixture ist der REPRÄSENTATIVE Stand der auszuliefernden Version —
 * erzeugt (Muster v72/…/v77/v78-release) durch Migration des v78-Pins auf v80 über die
 * reale deserialize/serialize-Kette (now === savedAt ⇒ 0 Offline-Ticks, reine Migration/Sanitize
 * ohne Catch-up-Nebenwirkungen) und als sanitize-Fixpunkt gepinnt. Der v78-Pin bleibt als reguläres
 * Vault-Fixture in der generischen Schleife oben (migriert jetzt v78→v80). Neu-Pin 2026-08-03 durch
 * Claude nach den Codex-Bumps v79 (`character.autoPotion.autoRebuffUnlocked`, Auto-Rebuff-Einmalkauf)
 * und v80 (`camp.mapVisuals`, persistente Gebäude-Skalierung/-Spiegelung auf der New-Haven-Karte);
 * ein separates v79-Pin existiert bewusst NICHT — v79 wurde nie ausgeliefert, beide Bumps gingen
 * am selben Tag ins selbe Release-Fenster.
 *
 * Die NEUE v78-Fläche (New-Haven-Dorfkarte / freie Platzierung, Task #370) ist bewusst NICHT
 * künstlich befüllt — ein migrierter Alt-Save kann strukturell nur die Migrations-Defaults tragen:
 * `camp.positions = {}`, weil das Quell-Save GAR KEIN Gebäude trägt (ohne gebautes Gebäude gibt es
 * nichts zu verorten). Die eigentliche Migrations-Leistung — Bestandsgebäude deterministisch auf
 * freie Rasterplätze verteilen — sichert camp-persistence.test.ts an einem echten v77-Shape mit
 * gebauten Gebäuden ab, ebenso Round-Trip, Klemmen und Kollisions-Reparatur.
 *
 * Die v77-Fläche (Offline-Veredelung + Tages-Gratis-Skip), v76-Fläche (Das Lager: Gebäude-Stufen,
 * Bau-Auftrag), v75-Fläche (Ausrüstungs-Loadouts), v74-Fläche (Elite-Sieg-Breadcrumb) und
 * v73-Fläche (Kampf-Queue) bleiben aus demselben Grund im Default-Zustand — s. die geerbten
 * Abdeckungs-Punkte (8)/(9)/(10)/(11) unten.
 *
 * Die generische Vault-Schleife oben deckt bereits Laden/Migration/Round-Trip + die
 * +7-Tage-Zeitrobustheit ab. Dieser Block ergänzt (a) den IDENTITÄTS-GUARD — das Fixture ist
 * BEREITS die aktuelle Version, das Laden migriert also NICHTS und reproduziert byte-genau den
 * gespeicherten State — und (b) den ABDECKUNGS-GUARD: die vom v69/v70/v71/v72/v73/v74/v75/v76/
 * v77-Save geerbten Neuflächen (getragener + besessener Meisterring, konsolidierter Stapel > 999,
 * capeGranted-Marker, die vier monotonen Breadcrumb-Zähler, die Action-Queue, die Mailbox, die
 * Elite-Fläche, die Kampf-Queue, der Elite-Sieg-Breadcrumb, die Loadout-Fläche, das Lager, die
 * Veredelung) UND die neue v78-Karten-Fläche MÜSSEN im Fixture präsent bleiben, damit ein späteres
 * Neu-Pinnen die Abdeckung nicht still verliert.
 */
describe("v80-Release-Pin: Migrations- & Abdeckungs-Guard des 1.0.x-Vault-Fixtures", () => {
  const FILE = "v80-release-0.3.0.json";
  const json = readFileSync(join(VAULT_DIR, FILE), "utf-8");
  const raw = JSON.parse(json) as { version: number; savedAt: number; state: GameState };

  it("ist der ausgelieferte 1.0.x-Stand: Save-Header UND State tragen v80", () => {
    // Bis SAVE_VERSION 80 war dies das AKTUELLE Fixture; seit dem v81-Bump (New-Haven-Bau-
    // warteschlange) ist es der jüngste AUSGELIEFERTE Stand — also genau das, was auf
    // Kunden-Platten liegt und beim nächsten Update migriert werden muss.
    expect(raw.version).toBe(80);
    expect(raw.state.version).toBe(80);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(80);
  });

  it("migriert v80 → v86 und ändert dabei GENAU die neuen Felder — sonst byte-genau derselbe Save", () => {
    // now === savedAt ⇒ offlineMs 0 ⇒ KEIN Catch-up-Tick: gemessen wird allein, was
    // Migration+Sanitize am gespeicherten Save tun. Das ist die schärfere Form des früheren
    // Identitäts-Guards: nicht nur „nichts geht kaputt", sondern „ES ÄNDERT SICH NUR, WAS SICH
    // ändern soll". Geprüft über die BYTES (JSON kann die von migrate rekonstruierten
    // undefined-combat-Felder nicht darstellen — ein deepEqual wäre ein falsch-negatives
    // JSON-Artefakt, die Byte-Gleichheit ist artefaktfrei).
    const result = deserialize(json, content, raw.savedAt);
    expect(result).not.toBeNull();
    expect(result!.offlineMs).toBe(0);
    expect(result!.offlineTicks).toBe(0);
    expect(result!.state.version).toBe(SAVE_VERSION);

    // Das neue v81-Feld: leere Bauwarteschlange (nichts geplant — gab es vorher gar nicht).
    expect(result!.state.camp.buildQueue).toEqual([]);
    // Das neue v82-Feld (#p12): auf allen neun Beeten explizit `nextCropId: null` — keine
    // Folgesorte geplant (gab es vorher gar nicht); explizit null statt fehlend, damit die
    // Save-Form fest ist und die Byte-Gegenprobe unten greifen kann.
    expect(result!.state.farmPlots).toHaveLength(9);
    for (const plot of result!.state.farmPlots) expect(plot.nextCropId).toBeNull();
    // Das neue v83-Feld (Dungeons queuebar, Chef-Auftrag 26.08.2026): kein laufender Queue-
    // Dungeon-Lauf — explizit `queueDungeon: null` (Muster queueFight/v73), die Queue-Einträge
    // des Alt-Saves bleiben unverändert (die neue Sorte "dungeon" kann dort nicht vorkommen).
    expect(result!.state.queueDungeon).toBeNull();
    expect(result!.state.actionQueue).toEqual(raw.state.actionQueue);
    // Die neuen v84-Felder (Taverne, 1.2.0): ungebaute Taverne ohne Plätze — Alt-Saves bekommen
    // NICHTS geschenkt (Chef E1: baubar) — und beide Baseline-Zähler leer (rückwirkend nicht
    // rekonstruierbar). Explizit gesetzt statt fehlend, damit die Byte-Gegenprobe unten greift.
    expect(result!.state.tavern).toEqual(defaultTavernState());
    expect(result!.state.stats.actionRunsById).toEqual({});
    expect(result!.state.stats.producedById).toEqual({});
    // Die neuen v85-Felder (Jagen, 1.2.0): sechs leere Fallenplätze (Auto-Erneuern AN, kein Fang),
    // Fang-Nummer 0, Fang-Zähler 0 — rückwirkend gibt es nichts zu rekonstruieren.
    expect(result!.state.huntTraps).toEqual(defaultHuntTraps());
    expect(result!.state.huntCatchSeq).toBe(0);
    expect(result!.state.stats.huntCatches).toBe(0);
    // Die v85-NACHTRAG-Felder (Ausrüstungs-Kits, Chef-Entscheid 28.08.2026): Kit 0 = Spiegel der
    // getragenen Ausrüstung, Kits 1/2 leer (die v80-Vorlagen waren alle null — es gab nichts zu
    // überführen), Kit 0 aktiv; das Alt-Feld `equipLoadouts` ist aus dem State verschwunden.
    expect(result!.state.activeKit).toBe(0);
    expect(result!.state.equipKits).toHaveLength(3);
    expect(result!.state.equipKits[0]!.equipment).toEqual(ohneWerkzeuge(raw.state.character.equipment));
    // Das Werkzeug selbst bleibt dabei GETRAGEN — es wandert nicht ins Kit und geht nicht verloren.
    expect(result!.state.character.equipment.tool1).toBe(raw.state.character.equipment.tool1);
    expect(result!.state.equipKits[1]).toEqual(emptyEquipKit());
    expect(result!.state.equipKits[2]).toEqual(emptyEquipKit());
    expect((result!.state as unknown as { equipLoadouts?: unknown }).equipLoadouts).toBeUndefined();
    // Das neue v86-Konto (Skill-Split Schneidern, Chef-Entscheid 28.08.2026): der v80-Save hat weder
    // Handwerk-XP noch Stoff-Rezepte im Craft-Log (craftedById: garnet/sapphire) → `tailoring = { xp: 0 }`,
    // und es wird KEIN Handwerk-Konto erfunden (der Key bleibt abwesend wie im Original).
    expect(result!.state.skills.tailoring).toEqual({ xp: 0 });
    expect(result!.state.skills.leatherworking).toBeUndefined();

    // Gegenprobe: das Original um genau diese erwarteten Änderungen ergänzt (Version, buildQueue,
    // nextCropId je Beet, queueDungeon, tavern + die zwei Stats-Zähler, huntTraps + Fang-Nummer +
    // Fang-Zähler, equipKits + activeKit statt equipLoadouts, skills.tailoring), muss die frisch
    // serialisierten Bytes exakt treffen. Reißt DAS, hat die Migration mehr angefasst als
    // angekündigt — und genau davor schützt das Save-Kompat-Gesetz.
    const erwartet = JSON.parse(json) as { version: number; state: GameState };
    erwartet.version = SAVE_VERSION;
    erwartet.state.version = SAVE_VERSION;
    erwartet.state.camp.buildQueue = [];
    for (const plot of erwartet.state.farmPlots) plot.nextCropId = null;
    erwartet.state.queueDungeon = null;
    erwartet.state.tavern = defaultTavernState();
    erwartet.state.stats.actionRunsById = {};
    erwartet.state.stats.producedById = {};
    erwartet.state.huntTraps = defaultHuntTraps();
    erwartet.state.huntCatchSeq = 0;
    erwartet.state.stats.huntCatches = 0;
    erwartet.state.stats.huntCatchesById = {}; // Jagen-XP nach Monster (28.08.2026)
    // v87 (vierter Werkzeug-Slot, Chef-GO 31.08.2026): migrateState baut den Equipment-Record
    // generisch aus EQUIP_SLOTS neu — `tool4` kommt als null dazu. BEWUSST hier, VOR dem Bilden
    // des Kit-0-Spiegels: der Spiegel wird aus genau diesem Record abgeleitet.
    erwartet.state.character.equipment.tool4 = null;
    erwartet.state.equipKits = [
      // v87: Der Spiegel traegt die Werkzeuge NICHT mehr (sie gehoeren keinem Kit) — getragen
      // bleiben sie trotzdem, das prueft die Zeile oben bei equipKits[0].
      { equipment: ohneWerkzeuge({ ...erwartet.state.character.equipment }), equippedInstances: { ...erwartet.state.character.equippedInstances } },
      emptyEquipKit(),
      emptyEquipKit(),
    ];
    erwartet.state.activeKit = 0;
    delete (erwartet.state as unknown as { equipLoadouts?: unknown }).equipLoadouts;
    erwartet.state.skills.tailoring = { xp: 0 }; // Skill-Split Schneidern (SAVE 86, 28.08.2026)
    // Achievements 1.2.0 (Chef-Entscheid 27.08.2026, KEIN SAVE_VERSION-Bump): der Katalog wurde von
    // 537 auf 311 Erfolge neu geschnitten (Kill-Tripel, Skill-Stufen 10/20/30/40/60/70/80 entfallen).
    // sanitize streift seit jeher Achievement-IDs ohne Content-Def ab (s. index.ts `knownAch`) —
    // der v80-Save trägt 14 solcher Alt-IDs (ach_skill_fishing_10 …). Erwartet ist also GENAU
    // die Content-Filterung, sonst nichts; die Nachholung neuer Erfolge (Kapitel, Bestiarium …)
    // passiert erst im Catch-up-Tick (hier bewusst 0 Ticks) und ist in engine/achievements.test.ts
    // („Alt-Save-Nachholung") gepinnt.
    const knownAch = new Set(content.achievements.map((a) => a.id));
    erwartet.state.achievements = erwartet.state.achievements.filter((id) => knownAch.has(id));
    // v87 Bank-Platzierung (Chef-Auftrag 31.08.2026 "wie OSRS"): `bankOrder` traegt die Faecher,
    // die Mengen bleiben in `bank`. BEWUSST als LETZTE Erwartung, nach allen anderen Anpassungen —
    // dieselbe Reihenfolge-Falle wie im Sanitize selbst: wer die Faecher zu frueh bildet, nimmt
    // eine Bank, die spaeter noch bereinigt wird, und erwartet Items, die es dann nicht mehr gibt.
    // Die Faecher entstehen aus den Bank-Eintraegen des ALTEN Saves (alphabetisch). Faellt ein Item
    // beim Laden aus der Bank — im v85-Fixture wandert `bait_worm` heraus —, bleibt sein Fach als
    // LEERE Luecke stehen und rueckt NICHT nach. Genau das ist das gewuenschte OSRS-Verhalten und
    // der Grund fuer diese etwas umstaendliche Erwartung: Fachanzahl aus dem alten Save, Inhalt
    // aus dem neuen.
    // v87 (Chef-Report 31.08.2026): Alt-Saves werden beim Laden EINMALIG geradegezogen — belegte
    // Faecher nach vorne, Luecken nach hinten. Bis v86 landete jeder Fund in der ERSTEN Luecke und
    // hinterliess beim Verbrauchen ein leeres Fach; die alte Ansicht hat das versteckt, seit die
    // Faecher an ihrer echten Position stehen wuerde man das gewachsene Chaos sehen.
    {
      const belegt = erwartet.state.inventory.slots.filter((sl) => sl !== null);
      for (let i = 0; i < erwartet.state.inventory.slots.length; i++) {
        erwartet.state.inventory.slots[i] = i < belegt.length ? belegt[i]! : null;
      }
    }
    const bankVorher = Object.keys((JSON.parse(json) as { state: GameState }).state.bank ?? {}).sort();
    const bankNachher = result!.state.bank;
    erwartet.state.bankOrder = bankVorher.map((id) =>
      typeof bankNachher[id as keyof typeof bankNachher] === "number" ? id : null,
    );
    // claude:2026-10-18T00:30:00+02:00 — Jagdbuch/Talentbäume (kein SAVE-Bump): sanitize ergänzt die Defaults.
    Object.assign(erwartet.state, { talents: {}, petPity: {} });
    erwartet.state.character.companionPetId2 = null;
    // claude:2026-10-17T23:30:00+02:00 — SAVE 88 (Prestige-Fundament): erster Durchgang, nichts zu rekonstruieren.
    erwartet.state.prestige = defaultPrestigeState();
    Object.assign(erwartet.state.character, { meal: null, mealKeep: true }); // claude:2026-10-23T16:50:00+02:00 — SAVE 89 (Mahlzeit-Platz)
    erwartet.state.settings.estateNotifications = true;
    // claude:2026-10-23T22:05:00+02:00 — SAVE 90 (Materiallager): Option an, Lagerware ohne Bankfach, Lücken einmal geschlossen.
    erwartet.state.settings.materialsToStorage = true;
    erwartet.state.lockedItems = {}; // claude:2026-10-24T17:05:00+02:00 — SAVE 90 (Bergung): Schloss-Liste
    // claude:2026-10-24T20:25:00+02:00 — SAVE 91 (Bognerei): Köcher leer, Nachfüllen an.
    erwartet.state.settings.quiverAutoRefill = true;
    erwartet.state.character.quiver = null;
    // claude:2026-10-25T00:30:00+02:00 — SAVE 92 (Ereignisse/Aufträge): Strom aus rng abgeleitet, leere Listen.
    erwartet.state.eventRng = createRngW3(deriveEventRngSeed(erwartet.state.rng.state));
    erwartet.state.skillEvents = defaultSkillEventState();
    erwartet.state.workOrders = defaultWorkOrderState();
    // claude:2026-10-25T04:50:00+02:00 — SAVE 93 (Raid): leerer Raid-Zustand, Schalter aus.
    erwartet.state.raid = defaultRaidState();
    Object.assign(erwartet.state.settings, { raidAutoContinue: false, raidAutoBuyRestart: false });
    erwartet.state.bankOrder = (erwartet.state.bankOrder ?? []).filter((id): id is string => typeof id === "string" && !storagePredicate(content)(id));
    expect(JSON.parse(serialize(result!.state, raw.savedAt))).toEqual(erwartet);
  });

  it("deckt die v69+v70+v71-Neuflächen ab (Abdeckung darf bei Neu-Pin nicht still verloren gehen)", () => {
    // (Der Block prüft die geerbten Flächen v69–v78 durch; s. Moduldoku oben.)
    const s = deserialize(json, content, raw.savedAt)!.state;

    // (0a) v71-POSTFACH/MAILBOX: nicht-leer, EINE overflow-Mail mit ≥2 gestapelten Items + ≥1 Instanz;
    //      jede itemId/Instanz-baseItemId existiert im Content; positive qty; mailSeq > max createdSeq.
    expect(Array.isArray(s.mailbox)).toBe(true);
    expect(s.mailbox.length).toBeGreaterThanOrEqual(1);
    const overflow = s.mailbox.find((m) => m.kind === "overflow");
    expect(overflow, "keine overflow-Mail").toBeTruthy();
    expect(overflow!.items.length, "weniger als 2 gestapelte Items").toBeGreaterThanOrEqual(2);
    for (const att of overflow!.items) {
      expect(content.items[att.itemId], `Mail referenziert unbekanntes Item ${att.itemId}`).toBeDefined();
      expect(att.qty).toBeGreaterThan(0);
    }
    expect(overflow!.instances.length, "keine Mail-Instanz").toBeGreaterThanOrEqual(1);
    for (const inst of overflow!.instances) {
      expect(content.items[inst.baseItemId], `Mail-Instanz referenziert unbekanntes Item ${inst.baseItemId}`).toBeDefined();
    }
    const maxCreatedSeq = Math.max(...s.mailbox.map((m) => m.createdSeq));
    expect(s.mailSeq, "mailSeq nicht > max createdSeq").toBeGreaterThan(maxCreatedSeq);

    // (0) v70-ACTION-QUEUE (v73: kind-Diskriminator): nicht-leer, mind. ein Eintrag mit endlichem
    //     target UND einer mit target null; jede actionId existiert im Content; JEDER Eintrag trägt
    //     den v73-Migrations-Stempel `kind:"action"` (das Quell-Save kannte keine Kampf-Einträge —
    //     die Kampf-Queue hatte zum Pin-Zeitpunkt keine UI); eine Aktion läuft aktiv (Task §6).
    expect(Array.isArray(s.actionQueue)).toBe(true);
    expect(s.actionQueue.length).toBeGreaterThanOrEqual(2);
    for (const q of s.actionQueue) {
      expect(q.kind, `Queue-Eintrag ohne v73-kind-Stempel (${q.actionId})`).toBe("action");
      expect(content.actions[q.actionId], `Queue referenziert unbekannte Aktion ${q.actionId}`).toBeDefined();
      expect(q.target === null || (Number.isInteger(q.target) && q.target > 0)).toBe(true);
    }
    expect(s.actionQueue.some((q) => typeof q.target === "number"), "kein Eintrag mit endlichem target").toBe(true);
    expect(s.actionQueue.some((q) => q.target === null), "kein Eintrag mit target null").toBe(true);
    expect(s.activeActionId, "keine aktive Aktion").not.toBeNull();

    // (1) Meister-RINGE: mind. einer GETRAGEN im ring1-Slot + mind. einer BESESSEN (Inventar/Bank).
    const ring1 = s.character.equipment.ring1;
    expect(ring1, "ring1 leer").not.toBeNull();
    expect(ring1!.startsWith("ring_master_"), `ring1 (${ring1}) ist kein Meisterring`).toBe(true);
    expect(content.items[ring1!]?.slot).toBe("ring1");
    const ownsAnotherRing = Object.entries(content.items).some(([id]) => {
      if (!id.startsWith("ring_master_") || id === ring1) return false;
      const inInv = s.inventory.slots.some((sl) => sl && sl.itemId === id);
      return inInv || (s.bank[id] ?? 0) > 0;
    });
    expect(ownsAnotherRing, "kein zweiter Meisterring im Besitz (Inventar/Bank)").toBe(true);

    // (2) Konsolidierter Stapel: mind. ein PLAIN-Stapel mit qty > 999 (Stack-Cap 9999) …
    const bigStack = s.inventory.slots.find((sl) => sl && !sl.instance && sl.qty > 999);
    expect(bigStack, "kein Stapel > 999").toBeTruthy();
    expect(bigStack!.qty).toBeLessThanOrEqual(9999);
    // … und die Konsolidierungs-Invariante hält: KEIN Item liegt in > 1 PLAIN-Stapel.
    const plainStackCount = new Map<string, number>();
    for (const sl of s.inventory.slots) {
      if (!sl || sl.instance) continue;
      plainStackCount.set(sl.itemId, (plainStackCount.get(sl.itemId) ?? 0) + 1);
    }
    const split = [...plainStackCount.entries()].filter(([, n]) => n > 1);
    expect(split, `Items mit > 1 Plain-Stapel (Konsolidierung verletzt): ${split.map(([id]) => id).join(", ")}`).toEqual([]);

    // (3) capeGranted-Marker für mind. einen 99er-Skill (Teilmengen-Invariante granted ⊆ masteryCapes).
    const grantedSkills = Object.keys(s.capeGranted).filter((k) => s.capeGranted[k] === true);
    expect(grantedSkills.length).toBeGreaterThan(0);
    for (const skill of grantedSkills) expect(s.masteryCapes[skill], `granted ${skill} ohne Weihe`).toBe(true);

    // (4) Breadcrumb-Zähler: alle vier gesetzt (> 0) und monoton ≥ ihrem jeweiligen Breadcrumb-seq.
    expect(s.petDropSeq).toBeGreaterThan(0);
    expect(s.petDropSeq).toBeGreaterThanOrEqual(s.lastPetDrop?.seq ?? 0);
    expect(s.apMilestoneSeq).toBeGreaterThan(0);
    expect(s.apMilestoneSeq).toBeGreaterThanOrEqual(s.lastApMilestone?.seq ?? 0);
    expect(s.paragonChestSeq).toBeGreaterThan(0);
    expect(s.paragonChestSeq).toBeGreaterThanOrEqual(s.lastParagonChest?.seq ?? 0);
    expect(s.slayerStreakSeq).toBeGreaterThan(0);
    expect(s.slayerStreakSeq).toBeGreaterThanOrEqual(s.lastSlayerStreakBonus?.seq ?? 0);

    // (5) v72 ELITE-/WORLD-SPAWNS: eigener RNG-Strom finit + je Content-Zone ein Ruhe-Eintrag in
    //     IHREM EIGENEN Cooldown-Band (Phase 1 hat leere content.elites ⇒ es kann real NIE eine
    //     aktive Zone geben — der ehrliche Fixture-Zustand ist „alle Zonen in Ruhe", s. Moduldoku
    //     oben). Migriertes Fixture ⇒ `initEliteZonesStaggered` (KEIN Früh-Haken), Muster
    //     elite-spawns-migration.test.ts.
    expect(Number.isFinite(s.eliteRng.state)).toBe(true);
    const zoneIds = content.zones.map((z) => z.id);
    expect(Object.keys(s.eliteZones).sort()).toEqual([...zoneIds].sort());
    const cooldowns: number[] = [];
    for (const zoneId of zoneIds) {
      const entry = s.eliteZones[zoneId];
      expect(entry, `eliteZones.${zoneId} fehlt`).toBeDefined();
      expect("variantId" in entry!, `eliteZones.${zoneId} ist aktiv (Phase 1 unmöglich)`).toBe(false);
      const cooldownMs = (entry as { cooldownMs: number }).cooldownMs;
      const band = eliteZoneCooldownBand(zoneId);
      expect(cooldownMs, `${zoneId} außerhalb seines Bands`).toBeGreaterThanOrEqual(band.minMs);
      expect(cooldownMs, `${zoneId} außerhalb seines Bands`).toBeLessThanOrEqual(band.maxMs);
      cooldowns.push(cooldownMs);
    }
    // Staffelung: mind. so viele DISTINKTE Cooldowns wie Zonen (kein reiner [MIN,MAX]-Klumpen-Wurf).
    expect(new Set(cooldowns).size).toBe(zoneIds.length);
    expect(s.eliteSpawnSeq).toBe(0);
    expect(s.lastEliteSpawn).toBeNull();

    // (6) v72 FRÜH-GARANTIE-SUFFIX: ein migriertes Save bekommt KEINE nachträgliche Garantie —
    //     firstSuffixGranted muss bereits `true` sein (Bestandsspieler-Regel, selber Bump).
    expect(s.firstSuffixGranted).toBe(true);

    // (7) v72 „Jagd-Paket"-NACHTRAG (selber Bump, s. SAVE_VERSION-Changelog): `eliteCodex` ist ein
    //     valides, leeres Record — das Quell-Save kennt keinen realen Elite-Kill, der ehrliche
    //     Fixture-Zustand ist „noch nichts im Codex" (Muster eliteZones-Kommentar oben). Kein
    //     Briefe-Sonderfall nötig: `mailbox` enthält weiterhin NUR die v71-Überlauf-Mail (Muster
    //     (0a) oben), kein `kind:"letter"`-Eintrag im Fixture — dedizierte Round-Trip-/Sanitize-
    //     Abdeckung für Briefe lebt in jagd-paket-persistence.test.ts.
    expect(s.eliteCodex).toEqual({});

    // (8) v73 KAMPF-QUEUE (Task #312): ein migriertes Save trägt exakt die Default-Fläche —
    //     kein laufender Queue-Kampf, keine Pause, kein Skip-Breadcrumb (die kind-Stempel der
    //     Queue-Einträge prüft (0) oben). "fight"-Einträge kann ein echtes Save erst nach der
    //     UI-Welle enthalten (deren Round-Trip sichert fight-queue-persistence.test.ts).
    expect(s.queueFight).toBeNull();
    expect(s.queuePaused).toBe(false);
    expect(s.lastQueueSkip).toBeNull();

    // (9) v74 ELITE-SIEG-BREADCRUMB (Task #324): ein migriertes Save trägt exakt die
    //     Migrations-Defaults — noch kein Elite-Kill aufgezeichnet (das Quell-Save kennt keinen;
    //     befüllte Breadcrumbs sichert elite-kill-breadcrumb-persistence.test.ts). Die Felder
    //     MÜSSEN im Fixture präsent sein (Byte-Identitäts-Guard oben erzwingt die Keys).
    expect(s.eliteKillSeq).toBe(0);
    expect(s.lastEliteKill).toBeNull();

    // (10) v75 AUSRÜSTUNGS-LOADOUTS (Task #349) → v85-NACHTRAG AUSRÜSTUNGS-KITS (Chef-Entscheid
    //      28.08.2026): das v80-Fixture trägt die drei nie gespeicherten Vorlagen `[null, null, null]`
    //      (der Key MUSS im Fixture präsent bleiben — er belegt, dass die Kit-Überführung leere
    //      Vorlagen korrekt verwirft); nach dem Laden gibt es nur noch Kits: Kit 0 = getragene
    //      Ausrüstung (Meisterring + Werkzeug inklusive), Kits 1/2 leer, Kit 0 aktiv, Altfeld weg.
    //      Befüllte Vorlagen → Kits sichert equip-kits-persistence.test.ts.
    expect(Array.isArray((raw.state as unknown as { equipLoadouts?: unknown }).equipLoadouts)).toBe(true);
    expect(s.activeKit).toBe(0);
    expect(s.equipKits[0]!.equipment).toEqual(ohneWerkzeuge(s.character.equipment));
    expect(s.equipKits[0]!.equipment.ring1).toBe(ring1);
    expect(s.equipKits[1]).toEqual(emptyEquipKit());
    expect(s.equipKits[2]).toEqual(emptyEquipKit());
    expect((s as unknown as { equipLoadouts?: unknown }).equipLoadouts).toBeUndefined();

    // (11) v76 DAS LAGER (Task #358) + (12) v77 OFFLINE-VEREDELUNG (Task #359) + (14) v78
    //      DORFKARTE (Task #370): ein migriertes Save trägt exakt die Migrations-Defaults — leeres
    //      Lager, Bautrupp frei, keine Historie, KEIN Veredelungs-Rezept (ohne gebaute Anlage war
    //      nie eines wählbar) und KEINE Karten-Position (ohne gebautes Gebäude gibt es nichts zu
    //      verorten). Befüllte Lager + Offline-Fertigstellung + befüllte Rezept-Slots + die
    //      Positions-Migration echter Bestandsgebäude sichert camp-persistence.test.ts. Alle
    //      Felder MÜSSEN im Fixture präsent sein (Byte-Identitäts-Guard oben erzwingt die Keys).
    //      + (15) v80 KARTEN-VISUALS (Codex 2026-08-03): `camp.mapVisuals` (individuelle
    //      Gebäudeskalierung/Spiegelung) startet für migrierte Alt-Saves leer — ohne Gebäude gibt
    //      es nichts visuell anzupassen; Renderer-Defaults greifen.
    //      + (17) v81 BAUWARTESCHLANGE (Spieler-Report 1.0.2): migrierte Alt-Saves starten mit
    //      leerem Plan — vor v81 gab es das Feld nicht, es kann also nichts geplant gewesen sein.
    expect(s.camp).toEqual({
      buildings: {},
      buildJob: null,
      buildQueue: [],
      buildSeq: 0,
      lastCompletedBuild: null,
      refine: {},
      positions: {},
      mapVisuals: {},
    });

    // (13) v77 TAGES-GRATIS-SKIP (Trophäenwand III): Migrations-Default 0 = „noch nie verbraucht".
    expect(s.slayerFreeSkipDay).toBe(0);

    // (18) v82 FOLGESORTE JE BEET (#p12, Chef-GO 25.08.2026): migrierte Alt-Saves tragen auf
    //      allen neun Beeten `nextCropId: null` — vor v82 gab es das Feld nicht, es kann also
    //      nichts geplant gewesen sein. Das Feld MUSS im Fixture präsent sein (Byte-Gegenprobe
    //      oben erzwingt den Key je Beet); befüllte Pläne + Sanitize sichert index.test.ts.
    expect(s.farmPlots).toHaveLength(9);
    for (const plot of s.farmPlots) expect(plot.nextCropId).toBeNull();

    // (16) v79 AUTO-REBUFF-EINMALKAUF (Codex 2026-08-02): migrierte Alt-Saves ohne bereits aktiven
    //      Auto-Rebuff starten GESPERRT (der 50.000-Gold-Kauf darf nicht geschenkt werden). Das
    //      Feld MUSS im Fixture präsent sein (Byte-Identitäts-Guard oben erzwingt den Key).
    expect(s.character.autoPotion.autoRebuffUnlocked).toBe(false);

    // (19) v84 TAVERNE (1.2.0): migrierte Alt-Saves tragen die ungebaute Taverne ohne Plätze
    //      (Chef E1: baubar, nichts geschenkt) und leere Baseline-Zähler. Befüllte Taverne +
    //      Sanitize sichert tavern-persistence.test.ts, das v84-Fixture trägt die volle Fläche.
    expect(s.tavern).toEqual(defaultTavernState());
    expect(s.stats.actionRunsById).toEqual({});
    expect(s.stats.producedById).toEqual({});

    // (20) v85 JAGEN (1.2.0): migrierte Alt-Saves tragen sechs leere Fallenplätze, Fang-Nummer 0 und
    //      Fang-Zähler 0. Befüllte Fallen + Sanitize + OfflineSummary sichert hunt-persistence.test.ts,
    //      das v85-Fixture trägt Breadcrumb/Zähler/Jagen-XP.
    expect(s.huntTraps).toEqual(defaultHuntTraps());
    expect(s.huntCatchSeq).toBe(0);
    expect(s.stats.huntCatches).toBe(0);

    // (21) v86 SKILL-SPLIT SCHNEIDERN (28.08.2026): migrierte Alt-Saves tragen das Konto `skills.tailoring`
    //      (hier 0: kein Handwerk-XP, kein Stoff im Craft-Log) — Handwerk bleibt, was es war. Die echte
    //      XP-Aufteilung + Klemme + Idempotenz sichert tailoring-split-persistence.test.ts, das v86-Fixture
    //      trägt tailoring > 0 und leatherworking > 0 samt Craft-Zählern.
    expect(s.skills.tailoring).toEqual({ xp: 0 });
    expect(s.skills.leatherworking).toBeUndefined();
  });
});
