import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION, eliteZoneCooldownBand } from "@hearthforge/shared";
import { computeStats } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

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
 * als sanitize-Fixpunkt + `v80-filled-0.3.0.json` als befülltes Lager) decken 1.0.0 mit ab. Beim
 * NÄCHSTEN SAVE_VERSION-Bump (v81) gilt das Ritual wieder regulär.
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
describe("v80-Release-Pin: Identitäts- & Abdeckungs-Guard des aktuellen Vault-Fixtures", () => {
  const FILE = "v80-release-0.3.0.json";
  const json = readFileSync(join(VAULT_DIR, FILE), "utf-8");
  const raw = JSON.parse(json) as { version: number; savedAt: number; state: GameState };

  it("ist BEREITS die aktuelle Version — der Save-Header UND der State tragen v" + SAVE_VERSION, () => {
    expect(raw.version).toBe(SAVE_VERSION);
    expect(raw.state.version).toBe(SAVE_VERSION);
  });

  it("migriert NICHT: Laden mit now = savedAt hat 0 Offline-Zeit und reproduziert den State byte-genau", () => {
    // now === savedAt ⇒ offlineMs 0 ⇒ KEIN Catch-up-Tick: gemessen wird allein, dass
    // Migration+Sanitize auf einem bereits aktuellen, bereits gesanitizeten Save ein reiner
    // No-op sind (nichts „wandert"). serialize(loaded) muss die Original-Bytes exakt treffen —
    // die stärkste Identitäts-Aussage (JSON kann die von migrate rekonstruierten
    // undefined-combat-Felder nicht darstellen, ein deepEqual gegen raw.state wäre also ein
    // falsch-negativer JSON-Artefakt; die Byte-Gleichheit ist artefaktfrei).
    const result = deserialize(json, content, raw.savedAt);
    expect(result).not.toBeNull();
    expect(result!.offlineMs).toBe(0);
    expect(result!.offlineTicks).toBe(0);
    expect(serialize(result!.state, raw.savedAt)).toBe(json);
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

    // (10) v75 AUSRÜSTUNGS-LOADOUTS (Task #349): ein migriertes Save trägt exakt die
    //      Migrations-Defaults — drei nie gespeicherte Slots (befüllte Loadouts sichert
    //      equip-loadouts-persistence.test.ts). Das Feld MUSS im Fixture präsent sein
    //      (Byte-Identitäts-Guard oben erzwingt den Key).
    expect(s.equipLoadouts).toEqual([null, null, null]);

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
    expect(s.camp).toEqual({
      buildings: {},
      buildJob: null,
      buildSeq: 0,
      lastCompletedBuild: null,
      refine: {},
      positions: {},
      mapVisuals: {},
    });

    // (13) v77 TAGES-GRATIS-SKIP (Trophäenwand III): Migrations-Default 0 = „noch nie verbraucht".
    expect(s.slayerFreeSkipDay).toBe(0);

    // (16) v79 AUTO-REBUFF-EINMALKAUF (Codex 2026-08-02): migrierte Alt-Saves ohne bereits aktiven
    //      Auto-Rebuff starten GESPERRT (der 50.000-Gold-Kauf darf nicht geschenkt werden). Das
    //      Feld MUSS im Fixture präsent sein (Byte-Identitäts-Guard oben erzwingt den Key).
    expect(s.character.autoPotion.autoRebuffUnlocked).toBe(false);
  });
});
