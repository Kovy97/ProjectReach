/**
 * GUARD — Konsistenz-Checker über den ECHTEN Content (Baseline gepinnt am 2026-07-02).
 *
 * Prinzip: Jeder gemeldete Befund muss in der hier gepinnten Ausnahme-Liste stehen (Subset-Check).
 *  - Wird Content repariert → Test bleibt grün (die Liste darf danach gekürzt werden).
 *  - Kommt eine NEUE Inkonsistenz dazu → Test wird rot → bewusst pinnen ODER Content fixen.
 * Die Listen sind damit zugleich der offene, dokumentierte Review-Backlog für content-/balance-dev
 * (bekannte Muster schlagen nicht rot; siehe Chef-Notizen unten).
 *
 * Bekannte akzeptierte Muster (Stand heute):
 *  - Tier-Leitern: thematische Monster-Drops (Kreative-Item-Lizenz) liegen teils über der nächsten
 *    Schmiede-Stufe (z.B. talon_dagger > mithril_dagger) — bewusster „Drop lohnt sich"-Reiz; und
 *    Schmuck-Linien (ring/amulet) haben absichtlich unterschiedliche Stat-Profile je Stein.
 *  - Drop-Level-Gaps: einige Zonen-Uniques sind bewusst Früh-Gear an späten Mobs (Transmog/Flavor).
 *  - Verwaiste Materialien: klassische Trophäen-Junk-Drops (Verkaufs-Gold) — Chef-Muster; falls
 *    eines davon eine Verwendung bekommen soll → content-dev.
 *  - craft_leather_body: ID verspricht 'leather_body', erzeugt aber 'cured_leather_body' —
 *    Umbenennungs-Kandidat für content-dev (Follow-up gemeldet).
 *  - Itemization-2.0-Apply, GELÖST (2026-07-02): `coreStatScore` gewichtet `item.skillBoost` (§4)
 *    jetzt zum Attribut-Gegenwert der Spec (§4.3/§5.1: Power 0.27 str · Ranged 0.15 dex ·
 *    MagicOff 0.35 int · Attack 0.1 dex · Defence 0.33 con je Boost-Level) — exakt die Raten, die
 *    die §5.3-Budget-Konversion abgezogen hat; Boost-Träger scoren damit wieder budget-neutral.
 *    Die zwei dabei re-geprüften Paare (bloodstone_ring→spellbinder_ring, stormcaller_amulet→
 *    onyx_amulet) feuerten nach späteren Content-Anpassungen NICHT mehr und wurden im
 *    Sweep-6-Pin-Trim (2026-07-03) entpinnt — kommen sie je zurück, bewusst neu bewerten.
 */
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  checkDropRequirementGap,
  checkNamingConsistency,
  checkReferenceCompleteness,
  checkTierLadderMonotony,
  runConsistencyChecks,
} from "./sim-consistency";

// ── Gepinnte Ausnahmen (Review-Backlog; Fingerprint = "<prev>-><cur>" der Leiter-Nachbarn) ────
// [Sweep6 T6-P4] 14 stale Pins entfernt (feuerten nicht mehr und maskierten künftige
// Re-Regressionen im Subset-Check): sapphire_ring->gemstone_ring, spellbinder_ring->diamond_ring,
// soul_amulet->sapphire_amulet, sapphire_amulet->gemstone_amulet, bloodstone_amulet->
// diamond_amulet, copper_spear->pitchfork_spear, iron_spear->wolffang_spear, iron_longbow->
// ashwood_longbow, bronze_shortbow->stolen_shortbow, dim_focus->iron_focus, frost_focus->
// blacksteel_focus, void_focus->runite_focus sowie die zwei 2026-07-02 noch als „echte
// Profil-Seitgrades" dokumentierten Paare bloodstone_ring->spellbinder_ring und
// stormcaller_amulet->onyx_amulet (Content hat sich seither bewegt — sie brechen nicht mehr).
// Stand nach dem Trim: JEDER verbleibende Pin feuert aktuell wirklich (35/35, geprüft 2026-07-03).
const LADDER_BASELINE = new Set([
  "alpha_fang_amulet->ruby_amulet",
  "pyre_staff->mithril_staff",
  "runite_staff->voidcaller_staff",
  "voidcaller_staff->bloodiron_staff",
  "bloodiron_staff->sorrow_staff",
  "sorrow_staff->stormcrest_staff",
  "stormcrest_staff->titanium_staff",
  "titanium_staff->godspark_staff",
  "godspark_staff->aetherium_staff",
  "rotfang_dagger->iron_dagger",
  "steel_dagger->mire_fang_dagger",
  "talon_dagger->mithril_dagger",
  "cinderfang_dagger->runite_dagger",
  "slagforged_sword->adamantium_sword",
  "boar_tusk_mace->bronze_mace",
  "wolffang_spear->steel_spear",
  "boneknuckle_gauntlets->barnacle_gauntlets",
  "thornmail_gauntlets->blacksteel_gauntlets",
  "skygrip_gauntlets->runite_gauntlets",
  "gravetread_sabatons->blacksteel_sabatons",
  "runite_greatsword->skybreaker_greatsword",
  "skybreaker_greatsword->bloodiron_greatsword",
  "skeletal_longbow->steel_longbow",
  "stagstride_longbow->blacksteel_longbow",
  "wailing_wand->blacksteel_wand",
  "frosthex_wand->bloodiron_wand",
  "bronze_focus->dim_focus",
  "tidecaller_focus->frost_focus",
  "bark_bulwark->chitin_bulwark",
  "gorehorn_cleaver->goblin_cleaver",
  // itemization-parity-fix (2026-07-02), NEU nach dem Waffen-2.0-/Strikte-Leiter-/Chase-Apply:
  // (a) Chase-Flavor-Drops (§5.2, kleine +1-Attribut-Chase-Stufe) sitzen jetzt teils unter dem
  //     nächsten strikt respreadeten Craft-Tier (dessen Σ-Attribute klettert steiler, §4.1) —
  //     dasselbe „Drop lohnt sich trotzdem"-Muster wie bei den bereits gepinnten Paaren oben.
  "steel_sabatons->gravetread_sabatons",
  "cowhide_cap->cured_leather_cap",
  "wattle_shield->willowbark_shield",
  // (b) Die 5 Unique-Offhand-Attribut-Träger (§3.3 „Offhand → Attribut-Träger": dim_focus/
  //     frost_focus/aether_orb/void_focus/god_focus) sind bewusst SCHWÄCHER als die parallele
  //     Fokus-Craft-Leiter (Vendor-/Quest-Nebenpfad, keine Progressions-Pflicht) — Spec-Tabelle
  //     gibt ihre Attribut-Summen explizit vor.
  // heiltrank-leiter-und-ausreisser-spec §2.2/Teil 4-P7 (Task #321): void_focus requirements.magic
  // 55→65 rückt es in der Leiter hinter runite_focus (60) statt adamantium_focus (50) — alter Pin
  // "adamantium_focus->void_focus" feuert nicht mehr (adamantium(50)->runite_focus(60) ist jetzt
  // monoton), neuer Nachbar-Bruch ist "runite_focus->void_focus" (gleiches „Nebenpfad schwächer"-
  // Muster, verifiziert nach Testlauf).
  "runite_focus->void_focus",
  "bloodiron_focus->god_focus",
  // Elite-/World-Spawns Phase 2 (design/elite-balance-spec.md §4, 2026-07-22): 8 neue Paare — die
  // 28 Elite-Unique-Items sind PER DESIGN Rare-Drop-Philosophie-Chase-Items (Standing Rule: „Stats
  // des NÄCHSTEN Zonen-Tiers bei Requirements des AKTUELLEN"), also strukturell Score/Value-Leiter-
  // Brecher — exakt das schon oben dokumentierte „Drop lohnt sich"-Muster (talon_dagger>mithril_
  // dagger etc.), hier nur konzentriert auf einen einzigen Content-Sweep statt einzelner Drops.
  "cured_leather_boots->quietstep_boots",
  "quietstep_boots->hardened_leather_boots",
  "impbone_wand->iron_wand",
  // item-drop-audit P1 (#339, Chef-GO 2026-07-25): cinderhusk_bulwark req def 16→30 (Chef-Fall-Fix,
  // AR/Block auf Mithril-Anker) rückt es in der offhand|-|defence|bulwark-Leiter zwischen
  // bark_bulwark(24) und chitin_bulwark(34) statt zwischen crabshell(8) und bark(24). Die alten
  // Nachbar-Fingerprints ("crabshell_bulwark->cinderhusk_bulwark", "cinderhusk_bulwark->bark_bulwark")
  // feuern nicht mehr (entfernt); neue Nachbarn unten. Score/Value bleiben strukturell Elite-Unique-
  // untypisch (coreStatScore ignoriert armorRating/blockChance, desperation-Effekt hat durationMs 0
  // → Potency 0) — dasselbe „Drop lohnt sich trotzdem"-Muster wie bei den 8 Elite-Phase-2-Paaren oben.
  "bark_bulwark->cinderhusk_bulwark",
  "cinderhusk_bulwark->chitin_bulwark",
  "wyvernscale_greaves->ridgetyrant_greaves",
  "gravesteel_warplate->morvane_warplate",
  "oldgrowth_plate->slagcarapace_plate",
  // item-drop-audit P2 Nachzug (#339/#344, Chef-GO 25.07.2026): chitin_helm/sootscale_greaves req
  // def 12/16→30 (Blacksteel-Anker, s. index.ts-Kommentare) rückt beide hinter reefscale_helm(20)
  // bzw. tombplate_greaves(24) in ihrer Leiter. Gleiches Muster wie cinderhusk_bulwark oben:
  // coreStatScore ignoriert das Trinity-Feld `armorRating` (zählt nur `bonus.defense`, das diese
  // Items nicht setzen) — der tatsächliche AR-Sprung (10.27→12.8 / 11.88→14.0) taucht im Score gar
  // nicht auf, nur die unveränderten `modifiers`/`skillBoost` zählen. „Drop lohnt sich trotzdem"
  // bleibt wahr (Blacksteel-AR bei Steel/Iron-Req), der Score-Bruch ist ein Artefakt der Formel.
  "reefscale_helm->chitin_helm",
  "tombplate_greaves->sootscale_greaves",
  // #354 Paket 2 (Chef-Erweiterung 2026-07-26): neues buckhide-Set (req ranged 10) schließt sich
  // zwischen cured (R5) und quietstep_boots (R12, Elite-Unique) in die boots-Leiter ein.
  // quietstep_boots bleibt strukturell ein Chase-Item (coreStatScore ignoriert evasionRating,
  // zählt nur modifiers/skillBoost — quietstep_boots trägt keine) — "Drop lohnt sich trotzdem",
  // dasselbe Muster wie die bereits gepinnten Elite-Paare oben. Der alte Nachbar-Fingerprint
  // "cured_leather_boots->quietstep_boots" feuert nicht mehr (buckhide_boots ist jetzt dazwischen).
  "buckhide_boots->quietstep_boots",
  // Chef-GO 1.1.0 (25.08.2026, design/rezension-patch-2026-08-25.html #p14, Rüstungsklassen-
  // Trennung, Vorschlag B): stormhide_helm/skygrip_gauntlets/tidewalker_boots wechseln von Platte
  // (requirements.defence) zu Leder (requirements.ranged) — reqSkill() gruppiert Leitern-Familien
  // GENAU nach diesem Requirement-Skill, die drei Teile verlassen also ihre bisherige Platte-Familie
  // und ziehen in die jeweilige Leder-Familie um (cloudwalker_boots bricht nichts Neues, s.u.).
  // In der verlassenen Platte-Familie rückt für jeden Slot ein neuer, bisher nicht direkt
  // benachbarter Nachbar nach — und coreStatScore ignoriert die Trinity-Felder (armorRating/
  // evasionRating/wardCapacity) komplett, zählt nur `modifiers`/`skillBoost`: die neuen Nachbarn
  // haben zufällig weniger davon als das jetzt tiefer sitzende, niedriger-stufige Teil. Dasselbe
  // strukturelle "coreStatScore ignoriert Trinity"-Artefakt wie bei reefscale_helm->chitin_helm
  // oben (kein echter Balance-Fehler — die eigentlichen Trinity-Werte steigen korrekt mit dem
  // Level: stormhide_helm EV 14.6 < ironhide_helm EV 16.8, tidewalker_boots EV 10.22 < ironhide_
  // boots EV 11.76). Die alten Fingerprints "skygrip_gauntlets->runite_gauntlets" (Zeile oben)
  // feuern nicht mehr (skygrip ist raus aus der Platte-Familie) — neue Nachbarn:
  "moltengrip_gauntlets->runite_gauntlets",
  "stormhide_helm->ironhide_helm",
  "tidewalker_boots->ironhide_boots",
  // Rezension #8 (Chef-GO 25.08.2026, 1.1.0, design/rezension-patch-2026-08-25.html #p8): „Drop ≥
  // nächstes Craft-Tier + Effekt" bei Requirement des AKTUELLEN Tiers angewandt auf 149 reguläre
  // (nicht-Elite) Ausrüstungs-Uniques aus Kampfquellen — strukturell dasselbe „Drop lohnt sich
  // trotzdem"-Muster wie die Elite-Phase-2-Paare oben, nur diesmal am großen Batch. 37 neue
  // Nachbar-Fingerprints (Score- und value-Brüche, verifiziert nach dem #8-Apply-Testlauf).
  "voidcaller_staff->pyre_staff",
  "sorrow_staff->titanium_staff",
  "stormcrest_staff->godiron_staff",
  "rotfang_dagger->steel_dagger",
  "blacksteel_dagger->mire_fang_dagger",
  "titanium_dagger->talon_dagger",
  "titanium_sword->slagforged_sword",
  "boar_tusk_mace->iron_mace",
  "pitchfork_spear->iron_spear",
  "runite_spear->bonewrought_spear",
  "bloodiron_spear->wolffang_spear",
  "boneknuckle_gauntlets->ashen_gauntlets",
  "mithril_gauntlets->thornmail_gauntlets",
  "bloodiron_gauntlets->barnacle_gauntlets",
  "runite_sabatons->gravetread_sabatons",
  "skybreaker_greatsword->godiron_greatsword",
  "blacksteel_longbow->ashwood_longbow",
  "bloodiron_longbow->stagstride_longbow",
  "iron_shortbow->stolen_shortbow",
  "plaguebone_buckler->goblin_buckler",
  "wailing_wand->mithril_wand",
  "frosthex_wand->godiron_wand",
  "steel_focus->frost_focus",
  "bloodiron_focus->tidecaller_focus",
  "cinderhusk_bulwark->bark_bulwark",
  "bark_bulwark->crabshell_bulwark",
  "frost_pelt_hood->wolfpelt_hood",
  "cryptguard_helm->chitin_helm",
  "emberforge_helm->reefscale_helm",
  "slagheart_cuirass->gravesteel_cuirass",
  "aetherscale_cuirass->bearhide_cuirass",
  "forgeplate_greaves->tombplate_greaves",
  "tombplate_greaves->ridgetyrant_greaves",
  "ridgetyrant_greaves->frostplate_greaves",
  "revenant_greatshield->gravewarden_greatshield",
  "mariner_cloak->voidstalker_cloak",
  "cinderwretch_maul->direfang_maul",
  // Rezension #8 Nachzug: über die neue drop-gear-beats-craft-Wächterprüfung zusätzlich gefunden
  // (vorbestehende Drops außerhalb der #8-Tabellen, gleiches Muster mitbehoben) — antler_warbow
  // (Zonen-Drop, jetzt DPS 4.05..4.07 statt 4.03) überholt knapp das Elite-Unique blackantler_warbow
  // (dessen eigener Wert unverändert blieb, coreStatScore ignoriert dessen Precision-Feld).
  "antler_warbow->blackantler_warbow",
  // Stil-Parität 4a (Chef-GO 26.08.2026, design/stil-paritaet-2026-08-26.md §4a A1–A4): dieselbe
  // Rare-Drop-Philosophie wie oben — Kernwert/value der 45 Spiegel-Uniques ist am Craft-Gegenstück
  // der NÄCHSTEN Familienstufe verankert (Requirement bleibt die eigene, niedrigere Stufe), darum
  // überholen sie in der reinen Level-Nachbarschaft der eigenen Waffen-/Rüstungs-Familie absichtlich
  // die nächste Craft-Sprosse ("Drop lohnt sich trotzdem"-Muster).
  "bullhorn_longbow->steel_longbow",
  "mossbound_longbow->runite_longbow",
  "bonewrought_longbow->stagstride_longbow",
  "drovers_shortbow->iron_shortbow",
  "marrow_shortbow->stolen_shortbow",
  "emberglass_shortbow->runite_shortbow",
  "rogue_hide_vambraces->hardened_leather_vambraces",
  "cryptstalker_vambraces->warhide_vambraces",
  "impfire_wand->steel_wand",
  "felglass_orb->aether_orb",
  "emberweave_cowl->arcane_cowl",
  "drowned_choir_mitre->godspark_mitre",
  "gravechant_vestment->godspark_vestment",
  // crossbower_warbow ist ein longbow (Req ranged 24) auf der Stab-artigen "next tier"-Regel
  // gebaut (Craft-Gegenstück Req ~40) — überholt darum den Zonen-Drop antler_warbow (Lv80), dessen
  // eigener value-Wert schon vor 4a ungewöhnlich niedrig lag (s. Rezension-#8-Pin oben).
  "crossbower_warbow->antler_warbow",
]);

/** Akzeptierte Drop-Level-Gaps ("monster:item") — Zonen-Uniques bewusst unter Beute-Klasse. */
const DROP_GAP_BASELINE = [
  "mire_crawler:mire_hexstaff",
  "pitch_beetle:cinder_spike",
  "pitch_beetle:chitin_helm",
  "pitch_beetle:sootscale_greaves",
  "ash_tyrant:ashplate_cuirass",
  "ash_tyrant:ashfall_recurve",
  "ash_tyrant:ash_tyrant_crown",
  "thorn_wolf:thornvine_whip",
  "moss_golem:bark_bulwark",
  "moss_golem:mossweave_leggings",
  "spectral_stag:spectral_hunter_bow",
  "spectral_stag:wildwood_treads",
  "bramble_witch:witchroot_wand",
  "forest_warden:mithril_longbow",
  "roc_storm:storm_mantle",
  "tide_siren:mariner_cloak",
  "last_idol:aether_runestaff",
  // item-drop-audit P3 (#339, Chef-GO 2026-07-25): neue on-band-"Beikost-Rows" (Craft-Items als
  // seltene Zusatz-Drops, s. index.ts-Kommentare "item-drop-audit P3") heben `monsterTier` (= höchstes
  // Requirement unter den Equipment-Drops des Monsters) je Monster deutlich an. Die folgenden
  // PRE-EXISTING Unique-Drops lagen vorher innerhalb der 15-Level-Toleranz und werden jetzt als Gap
  // gemeldet — sie sind unverändert legitime frühe Flavor-/Chase-Drops (Rare-Drop-Philosophie), nicht
  // Content-Fehler. Kein bestehendes Item wurde entfernt oder abgewertet, nur der Referenzwert (die
  // Beute-Klasse) ist gestiegen.
  "frost_hexer:frostplate_greaves",
  "frost_hexer:frosthex_wand",
  "skeleton_spearman:iron_spear",
  "skeleton_spearman:bonewrought_spear",
  "skeleton_spearman:gravetread_sabatons",
  "skeleton_spearman:gravewarden_greatshield",
  "skeleton_pyroclasp:pyre_staff",
  "skeleton_pyroclasp:gravesteel_cuirass",
  "roc:talon_dagger",
  "roc_hunter:stormhide_helm",
  "roc_hunter:skygrip_gauntlets",
  "roc_hunter:skytalon_recurve",
  "mud_crab:coral_shiv",
  "mud_crab:driftwood_bow",
  "mud_crab:crabshell_bulwark",
  "reef_drowned:drowned_cutlass",
  "reef_drowned:tidecaller_focus",
  "reef_drowned:reefscale_helm",
  "reef_drowned:barnacle_gauntlets",
  "tide_siren:tidewoven_leggings",
  "tide_siren:tidewalker_boots",
  "tide_siren:siren_shockstaff",
  "gray_wolf:wolffang_spear",
  "gray_wolf:beastcaller_totem",
  "gray_wolf:wolfpelt_hood",
  "wild_stag:antler_warbow",
  "wild_stag:stagleather_chaps",
  "wild_stag:stagstride_longbow",
  "dire_wolf:clawguard_gloves",
  "dire_wolf:direhide_jerkin",
  "dire_wolf:direfang_maul",
  // #354 Paket 3.3 (Chef-Mandat 2026-07-26): neue Spät-Zonen-on-band-Beikost-Rows (titanium_/
  // aetherium_/bloodiron_-Familie, s. index.ts-Kommentare "#354 Paket 3.3") heben `monsterTier`
  // (= höchstes Requirement unter den Equipment-Drops) je Monster an — dasselbe Muster wie die
  // item-drop-audit-P3-Welle oben. Die folgenden PRE-EXISTING Chase-/Unique-Drops lagen vorher
  // innerhalb der Toleranz und werden jetzt als Gap gemeldet; kein bestehendes Item wurde
  // entfernt/abgewertet, nur der Referenzwert (die Beute-Klasse) ist gestiegen.
  "roc_elder:skybreaker_greatsword",
  "deep_kraken:krakenhide_cuirass",
  "deep_kraken:kraken_maw",
  "forest_hare:hunting_knife",
  "forest_hare:padfoot_boots",
  "forest_bear:bearhide_cuirass",
  "gravecliff_specter:cloudwalker_boots",
];

/** Bewusste Nur-Verkauf-Trophäen (Chef-Muster: Monster-Junk = Gold-Quelle).
 *  [Sweep6 T6-P4] crude_bone entfernt — seit Task #213 Input der Gravesteel-Rezepte, kein Waisen-Item mehr.
 *  imp_horn (the_imp, Pastures L11) neu gepinnt: bewusster Trophäen-Junk-Drop, keine Rezept-Bindung vorgesehen.
 *  feather (Task #286 Stage B) neu gepinnt: fütterte bisher ausschließlich die Pfeil-Herstellung
 *  (fletch_*_arrows), die komplett aus dem Spiel entfernt wurde — bleibt als verkäuflicher
 *  Weiden-/Vogel-Drop ohne Rezept-Bindung (value 4). */
const ORPHAN_BASELINE = ["birds_nest", "goblin_ear", "shaman_totem", "imp_horn", "feather"];

/** Bekannte Namens-Findings (Follow-up an content-dev gemeldet, bis dahin gepinnt). */
const NAMING_BASELINE = new Set([
  "Aktions-ID verspricht anderen Output: craft_leather_body erzeugt kein 'leather_body'",
  // #227 Focus-Rework (Runecrafting-Spec §5): craft_<tier>_focus wurde zu Stufe 1 umgebaut
  // (Output = enchanted_<tier>_focus Precursor statt des tragbaren Fokus). Die id ist BEWUSST
  // beibehalten (geringste Migration-/Mastery-Churn) — der tragbare Fokus kommt jetzt aus dem
  // neuen enchant_<tier>_focus (Stufe 2). Bewusster, dokumentierter Namens-Mismatch, kein Bug.
  "Aktions-ID verspricht anderen Output: craft_copper_focus erzeugt kein 'copper_focus'",
  "Aktions-ID verspricht anderen Output: craft_bronze_focus erzeugt kein 'bronze_focus'",
  "Aktions-ID verspricht anderen Output: craft_iron_focus erzeugt kein 'iron_focus'",
  "Aktions-ID verspricht anderen Output: craft_steel_focus erzeugt kein 'steel_focus'",
  "Aktions-ID verspricht anderen Output: craft_blacksteel_focus erzeugt kein 'blacksteel_focus'",
  "Aktions-ID verspricht anderen Output: craft_mithril_focus erzeugt kein 'mithril_focus'",
  "Aktions-ID verspricht anderen Output: craft_adamantium_focus erzeugt kein 'adamantium_focus'",
  "Aktions-ID verspricht anderen Output: craft_runite_focus erzeugt kein 'runite_focus'",
  "Aktions-ID verspricht anderen Output: craft_bloodiron_focus erzeugt kein 'bloodiron_focus'",
  "Aktions-ID verspricht anderen Output: craft_titanium_focus erzeugt kein 'titanium_focus'",
  "Aktions-ID verspricht anderen Output: craft_aetherium_focus erzeugt kein 'aetherium_focus'",
  "Aktions-ID verspricht anderen Output: craft_godiron_focus erzeugt kein 'godiron_focus'",
]);

describe("sim-consistency — Guard über den echten Content", () => {
  it("Referenz-Vollständigkeit: keine unerreichbaren Inputs/Keys/Seeds, keine neuen Waisen", () => {
    const findings = checkReferenceCompleteness(content, { orphanExceptions: ORPHAN_BASELINE });
    // HARTE Garantie: kein P1 (unerreichbares Rezept-Input/Key/Seed/Slayer-Item, tote Referenz).
    // `masters_mark` ist seit Welle D2 über Aschechronik-Kapitel 19 (Quest-Reward) erreichbar
    // (obtainableItemIds liest Quest-Rewards, s. sim-consistency.ts §(a)) — kein Pin mehr nötig.
    expect(findings.filter((f) => f.severity === "P1")).toEqual([]);
    // Keine neuen verwaisten Materialien außerhalb der gepinnten Trophäen-Liste.
    expect(findings.filter((f) => f.severity === "P2").map((f) => f.title)).toEqual([]);
    // P3 (Icon-Backlog-Aggregat) ist informativ und erlaubt.
    for (const f of findings) expect(f.category).toBe("consistency");
  });

  it("Tier-Leiter-Monotonie: keine NEUEN Brüche außerhalb der gepinnten Baseline", () => {
    const findings = checkTierLadderMonotony(content);
    const unexpected = findings.filter((f) => {
      const ev = f.evidence as { prev: { id: string }; cur: { id: string } };
      return !LADDER_BASELINE.has(`${ev.prev.id}->${ev.cur.id}`);
    });
    expect(unexpected.map((f) => f.title)).toEqual([]);
  });

  it("Drop-Level-Gap: keine NEUEN Gaps außerhalb der gepinnten Baseline", () => {
    // Die Baseline läuft als reguläre `dropGapExceptions`-Option → danach muss der Check leer sein.
    const findings = checkDropRequirementGap(content, { dropGapExceptions: DROP_GAP_BASELINE });
    expect(findings.map((f) => f.title)).toEqual([]);
  });

  it("Namens-Konventionen: EN/DE vollständig, keine ASCII-Umlaute, IDs versprechen den Output", () => {
    const findings = checkNamingConsistency(content);
    // Fehlende Lokalisierung wäre P2 — davon darf es keine geben.
    expect(findings.filter((f) => f.severity === "P2")).toEqual([]);
    // Alles Übrige (Aktions-ID↔Output, Umlaut-Verdacht, einsprachige Namen) gegen die Baseline.
    const unexpected = findings.filter((f) => !NAMING_BASELINE.has(f.title));
    expect(unexpected.map((f) => f.title)).toEqual([]);
  });

  it("runConsistencyChecks bündelt alle Checker deterministisch", () => {
    const a = runConsistencyChecks(content, { orphanExceptions: ORPHAN_BASELINE, dropGapExceptions: DROP_GAP_BASELINE });
    const b = runConsistencyChecks(content, { orphanExceptions: ORPHAN_BASELINE, dropGapExceptions: DROP_GAP_BASELINE });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    for (const f of a) expect(f.category).toBe("consistency");
  });
});
