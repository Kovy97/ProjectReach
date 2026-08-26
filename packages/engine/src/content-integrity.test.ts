import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { COMBAT_SKILL_IDS } from "@hearthforge/shared";

/** Fängt tote Item-Referenzen (z.B. nach Umbenennungen/Reworks) repo-weit ab. */
describe("content integrity: alle Item-Referenzen existieren", () => {
  const items = content.items;

  it("Aktionen: inputs & loot verweisen auf existierende Items", () => {
    for (const a of Object.values(content.actions)) {
      for (const inp of a.inputs ?? []) {
        expect(items[inp.itemId], `Aktion ${a.id}: input ${inp.itemId} fehlt`).toBeDefined();
      }
      for (const roll of a.loot) {
        expect(items[roll.itemId], `Aktion ${a.id}: loot ${roll.itemId} fehlt`).toBeDefined();
      }
    }
  });

  it("Shop: alle Einträge verweisen auf existierende Items", () => {
    for (const e of content.shop) {
      expect(items[e.itemId], `Shop: ${e.itemId} fehlt`).toBeDefined();
    }
  });

  it("Monster: alle Loot-Drops verweisen auf existierende Items", () => {
    for (const m of Object.values(content.monsters)) {
      for (const roll of m.loot) {
        expect(items[roll.itemId], `Monster ${m.id}: loot ${roll.itemId} fehlt`).toBeDefined();
      }
    }
  });

  // Die früheren Munitions-Guards (ammoType-Referenz, ammoDamage/Requirement-Monotonie) sind mit
  // dem Ammo-Removal (#286) GESTORBEN — ammoType/ammoDamage/ammo sind nie-gelesene Legacy-Felder,
  // bis Stage B die Pfeil-/Arrowhead-Items komplett aus dem Katalog löscht.

  /**
   * (aus ammo-quiver.test.ts gerettet, Chef #10): Bögen dürfen zum AUSRÜSTEN nur Kampf-Skills
   * verlangen — nie einen Verarbeitungs-Skill (früher gatete Fletching versehentlich Bögen).
   */
  it("kein Fernkampf-Waffen-Requirement außerhalb der Kampf-Skills (Chef #10, Regression)", () => {
    for (const it of Object.values(items)) {
      if (it.weaponStyle !== "ranged") continue;
      for (const skill of Object.keys(it.requirements ?? {})) {
        expect(COMBAT_SKILL_IDS, `${it.id} verlangt ${skill}`).toContain(skill);
      }
    }
  });

  /**
   * Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §4.2/§9 Ladder-Guard): die vier
   * defensiven Klassen-Schicht-Felder (armorRating/evasionRating/wardCapacity auf Platte/Leder/
   * Stoff je Slot, blockChance auf Schilden) müssen je Slot STRENG mit dem Requirement-Level der
   * jeweiligen Klasse steigen — kein Teil darf bei höherem R gleich viel oder weniger tragen als
   * ein Teil mit niedrigerem R (sonst wäre die Tier-Leiter „lückenhaft"/eine Cliff-Progression).
   * Slot-übergreifend wird NICHT verglichen (ein body-Teil ist per Slot-Gewicht immer größer als
   * ein boots-Teil derselben Stufe — das ist gewollt, kein Ladder-Bruch).
   */
  /**
   * Elite-/World-Spawns Phase 2 (design/elite-balance-spec.md §4, Rare-Drop-Philosophie — Standing
   * Rule: „Chase-Items tragen Kampfwerte des NÄCHSTEN Zonen-Tiers bei Requirements des AKTUELLEN;
   * niedrige Req an raren Drops ist intended"): die 28 Elite-Unique-Items sind PER DESIGN
   * Tier-Leiter-Brecher (das ist der ganze Witz eines Chase-Drops) — garantiert selten (Elite-Kill
   * @~20 % Drop-Chance, kein Farm-Loop), daher bewusst von `expectStrictLadder` ausgenommen statt
   * die Requirements künstlich hochzuziehen (was die Spec-Vorgabe unterlaufen würde). Analog zum
   * `KNOWN_FIVE_PIECE_FAMILIES`-Allowlist-Muster weiter unten in dieser Datei.
   *
   * Rezension #8 (Chef-GO 25.08.2026, 1.1.0, design/rezension-patch-2026-08-25.html #p8): dieselbe
   * Standing Rule gilt jetzt für ALLE 65 Platte-/Schild-/Leder-Ausrüstungs-Uniques aus Kampfquellen
   * (Monster/Elite-Extra/Dungeon-Truhe/Paragon) — „Drop ≥ nächstes Craft-Tier + Effekt" bei
   * Requirement des AKTUELLEN Craft-Tiers ist exakt derselbe Tier-Leiter-Bruch wie bei den
   * Elite-Uniques oben, nur diesmal an regulären (nicht-Elite) Drop-Zeilen. Liste = alle Platte-/
   * Schild-/Leder-IDs aus den #8-Tabellen (Nahkampf/Fernkampf/Magie tragen keine dieser vier Felder,
   * Schmuck auch nicht — daher hier nicht gelistet).
   */
  const LADDER_EXEMPT_DROP_UNIQUES = new Set([
    // Elite-Uniques (elite-balance-spec.md §4, vor #8 schon exempt).
    "quietstep_boots", "cinderhusk_bulwark", "oldgrowth_plate", "thorncrown", "pyrebound_vestment",
    "shellfather_aegis", "tideterror_grip", "morvane_warplate", "rimebound_leggings",
    "ridgetyrant_greaves",
    // Rezension #8: Platte (48).
    "cowhide_jerkin", "warband_hauberk", "ashplate_cuirass", "slagheart_cuirass", "moss_plate_body",
    "gravesteel_cuirass", "aetherscale_cuirass", "idol_shroud", "muckboots", "scavenger_boots",
    "dustwalker_boots", "wildwood_treads", "frostward_treads", "gravetread_sabatons", "padfoot_boots",
    "tidewalker_boots", "cloudwalker_boots", "idolstep_sabatons", "worn_workgloves", "rivetfist_gloves",
    "boneknuckle_gauntlets", "ashen_gauntlets", "moltengrip_gauntlets", "thornmail_gauntlets",
    "clawguard_gloves", "barnacle_gauntlets", "skygrip_gauntlets", "voidtouched_gauntlets",
    "bonepatch_helm", "marrow_cap", "cryptguard_helm", "shadestalker_hood", "ash_tyrant_crown",
    "chitin_helm", "emberforge_helm", "wolfpelt_hood", "reefscale_helm", "stormhide_helm", "idol_crown",
    "goblin_warkilt", "sootscale_greaves", "forgeplate_greaves", "mossweave_leggings",
    "tombplate_greaves", "stagleather_chaps", "tidewoven_leggings", "frostplate_greaves",
    "aetherweave_leggings",
    // Rezension #8: Schild (8).
    "wattle_shield", "plaguebone_buckler", "goblin_buckler", "basilisk_scale_shield", "chitin_bulwark",
    "bark_bulwark", "gravewarden_greatshield", "crabshell_bulwark",
    // Rezension #8: Leder (9).
    "warden_brigandine", "direhide_jerkin", "bearhide_cuirass", "krakenhide_cuirass",
    "wyvernscale_aegis", "cowhide_cap", "spectral_coif", "hide_leggings", "wyvernscale_greaves",
    // Rezension #8 Nachzug: über die neue drop-gear-beats-craft-Wächterprüfung zusätzlich gefunden
    // (vorbestehende Drops außerhalb der #8-Tabellen, gleiches Muster mitbehoben).
    "slagcarapace_plate", "warchief_fist", "revenant_greatshield",
    // Chef-Test 25.08.2026 (design/slayer-shop-1.1.0.md §4.1): Slayer-Helm/-Beinschienen/
    // -Armschienen bekommen erstmals einen Trinity-Wert (Rare-Drop-Philosophie: Wert der NÄCHSTEN
    // Craft-Stufe bei unverändertem — hier slayer, nicht defence/ranged — Requirement, exakt
    // dasselbe Muster wie die Elite-/#8-Uniques oben). Ihr `requirements.defence`/`.ranged` ist 0
    // (sie gaten über `slayer`, eine eigene Fortschritts-Achse), die strikte Leiter dieser Funktion
    // vergleicht aber nur defence/ranged — dieselbe Klasse Falsch-Positiv wie bei den Elite-Uniques.
    "slayer_helm", "slayer_greaves", "slayer_vambraces",
    // Stil-Parität 4a (Chef-GO 26.08.2026, design/stil-paritaet-2026-08-26.md §4a A3/A4): 45
    // Spiegel-Uniques an Monstern, die bisher nur Nahkampf-Ausrüstung droppten — dieselbe
    // Rare-Drop-Philosophie-Standing-Rule wie oben. Leder (11):
    "goat_hide_jerkin", "rogue_hide_vambraces", "skirmisher_hide_jerkin", "butchers_hide_boots",
    "ratpelt_cap", "chitinweave_leggings", "thornwolf_pelt_hood", "mossbound_treads",
    "cryptstalker_vambraces", "butchers_hide_leggings", "roc_feather_cap",
    // Stil-Parität 4a: Stoff (16) — die ersten Stoff-Drops von normalen Monstern überhaupt.
    "shamans_cowl", "imp_hide_slippers", "goblin_ragged_robe", "felmagician_robe",
    "stormcaller_sandals", "warlock_handwraps", "ashtyrant_cinder_robe", "emberweave_cowl",
    "chanters_skirt", "rootling_sap_sandals", "treemonster_bark_sandals", "gravechant_vestment",
    "hexed_bone_gloves", "drowned_choir_mitre", "emberheart_robe", "hexer_frostweave_gloves",
  ]);

  function expectStrictLadder(field: "armorRating" | "evasionRating" | "wardCapacity" | "blockChance", reqField: "defence" | "ranged" | "magic", slots: readonly string[]) {
    const offenders: string[] = [];
    for (const slot of slots) {
      const list = Object.values(items).filter(
        (it) => it.slot === slot && (it[field] ?? 0) > 0 && !LADDER_EXEMPT_DROP_UNIQUES.has(it.id),
      );
      for (const a of list) {
        for (const b of list) {
          const ra = a.requirements?.[reqField] ?? 0;
          const rb = b.requirements?.[reqField] ?? 0;
          if (ra < rb && (a[field] ?? 0) >= (b[field] ?? 0)) {
            offenders.push(`[${slot}] ${a.id}(R${ra}, ${field}=${a[field]}) >= ${b.id}(R${rb}, ${field}=${b[field]}) trotz niedrigerem R`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  }

  const ARMOR_SLOTS = ["helmet", "body", "legs", "gloves", "boots"] as const;

  it("Platte: armorRating steigt streng mit dem defence-Requirement je Slot", () => {
    expectStrictLadder("armorRating", "defence", ARMOR_SLOTS);
  });

  it("Schilde: armorRating UND blockChance steigen streng mit dem defence-Requirement", () => {
    expectStrictLadder("armorRating", "defence", ["offhand"]);
    expectStrictLadder("blockChance", "defence", ["offhand"]);
  });

  it("Leder: evasionRating steigt streng mit dem ranged-Requirement je Slot (armor-iter2 §8: leatherworking→ranged)", () => {
    expectStrictLadder("evasionRating", "ranged", ARMOR_SLOTS);
  });

  it("Stoff: wardCapacity steigt streng mit dem magic-Requirement je Slot (armor-iter2 §9.1: magic_off→magic)", () => {
    expectStrictLadder("wardCapacity", "magic", ARMOR_SLOTS);
  });

  /**
   * Combat-Depth #221 (design/combat-depth-spec.md §1.1): 2H-Melee gibt KEINE Rüstung mehr —
   * das alte armorRating-Feld auf Speer/Greataxe/Greatsword/Maul ist ersatzlos gestrichen
   * (character.ts liest bei 2H-Melee nur noch die getragene Platte, kein Waffen-AR-Bonus mehr).
   * Der alte Guard „armorRating steigt streng mit attack-Requirement" ist damit obsolet (er
   * prüfte genau das Feld, das jetzt nicht mehr existieren darf) — ersetzt durch das Gegenteil.
   */
  it("2H-Melee-Waffen: KEINE trägt armorRating mehr (#221 Glass-Cannon)", () => {
    const offenders = Object.values(items)
      .filter((it) => it.weaponStyle === "melee" && it.twoHanded && (it.armorRating ?? 0) > 0)
      .map((it) => `${it.id}: armorRating=${it.armorRating}`);
    expect(offenders).toEqual([]);
  });

  /**
   * Discord-Bugreport (2026-07-21): Stäbe sind per Design zweihändig, aber `equipment.ts` prüft
   * `item.twoHanded`, um die Offhand zu sperren — fehlt das Flag auf einem staff-Item, lässt die
   * Engine einen zusätzlichen Fokus in die Offhand zu (Exploit: 2H-Stab + Fokus gleichzeitig).
   * Wands/Foki sind bewusst einhändig (Wand+Fokus = 1H-Caster-Loadout) und bleiben ausgenommen.
   */
  it("Alle Stäbe (weaponType=staff) tragen twoHanded:true (Offhand-Exploit-Regression)", () => {
    const offenders = Object.values(items)
      .filter((it) => it.weaponType === "staff" && it.twoHanded !== true)
      .map((it) => it.id);
    expect(offenders).toEqual([]);
  });

  /**
   * Jeder Gegner trägt Rüstungs-Trinität-Groundwork: ein Armor-Floor (§6.2) + defenseType-Tag.
   * Armor-Iteration 2 §0.2: ×10-Armor-Skala — der Floor skaliert symmetrisch mit (0.05→0.5·level).
   */
  it("Monster: alle tragen defenseType + einen defense-Floor ≈0.5·level (×10-Skala, armor-iter2 §0.2)", () => {
    const offenders: string[] = [];
    for (const m of Object.values(content.monsters)) {
      if (!m.defenseType) offenders.push(`${m.id}: kein defenseType gesetzt`);
      const floor = Math.round(0.5 * m.level);
      if (m.defense < floor) offenders.push(`${m.id}: defense ${m.defense} < Floor ${floor} (level ${m.level})`);
    }
    expect(offenders).toEqual([]);
  });

  /**
   * Armor-Iteration 2 §7 Guard: jede Rüstungs-Familie mit ≥5 Slot-Teilen (Set aus 5 verschiedenen
   * ARMOR_SLOTS desselben Namens-Präfixes) muss einen `content.sets`-Eintrag mit `minPieces` haben,
   * sonst verpufft der volle Set-Bonus stillschweigend (C-ranged-L90 „Guard-Gap").
   */
  it("Jede ≥5-Teile-Rüstungsfamilie hat einen content.sets-Eintrag", () => {
    const setPieceIds = new Set(content.sets.flatMap((s) => s.pieces));
    // Item-Namensmuster in diesem Content sind zu unregelmäßig für generische Präfix-Erkennung
    // (z.B. "arcane_robe_body" vs. "arcane_cowl") — der Guard nutzt daher eine gezielte Allowlist
    // bekannter ≥5-Teile-Familien, die alle in `content.sets` abgedeckt sein müssen. Neue 5-Teile-
    // Familien MÜSSEN hier ergänzt werden (Content-dev pflegt die Liste synchron zu neuen Sets).
    const KNOWN_FIVE_PIECE_FAMILIES = [
      "wraithhide",
      "starweave",
      "voidweave",
      "godspark",
      "runewoven",
      "arcane_robe",
      "aether_",
      "ember_robe",
      "frost_robe",
      "voidhide",
      "shadowhide",
      "dragonhide",
      "ironhide",
      "warhide",
      "studded_leather",
      "duskhide",
      "scaled_leather",
      "hardened_leather",
      "cured_leather",
      // #354 Chef-Erweiterung 2026-07-26: neues Zwischen-Tier-Set R10 (cured R5 → hardened R20).
      "buckhide",
    ];
    const offenders: string[] = [];
    for (const fam of KNOWN_FIVE_PIECE_FAMILIES) {
      const famItems = Object.values(items).filter((it) => it.id.startsWith(fam));
      const slotsCovered = new Set(famItems.map((it) => it.slot));
      const coversAll5 = ARMOR_SLOTS.every((s) => slotsCovered.has(s));
      if (!coversAll5) continue; // nicht wirklich eine 5-Teile-Familie (unvollständig) — kein Guard-Fall
      const inAnySet = famItems.some((it) => setPieceIds.has(it.id));
      if (!inAnySet) offenders.push(`Familie "${fam}" hat Teile in allen 5 Slots, aber KEIN content.sets-Eintrag`);
    }
    expect(offenders).toEqual([]);
  });

  /**
   * Armor-Iteration 2 §10.2 + Consumables-/Enchantments-Spec §4.3 Guard: die Buff-„Währungen"
   * (Attribute + Trinity + `bonus`) dürfen nur innerhalb der Chef-genehmigten Bereiche liegen, sonst
   * hebelt ein Consumable die Gear-Progression aus (ein Trank sollte nie stärker sein als das beste
   * Ausrüstungsteil derselben Stufe). §4.3 schließt drei bisherige Lücken:
   *   (1) ROH-KAMPF-FLATS in `buff.bonus` sind VERBOTEN (melee/ranged/magicDamage/defense/accuracy/
   *       evasion) — die Itemization-2.5-Flat→Tempo/Trinity-Konversion war reine Politik ohne Guard.
   *   (2) TEMPO-FLOOR: `buff.bonus.attackIntervalMs`, falls gesetzt, muss ≤ −120 ms sein — kleinere
   *       Magnituden rendern als „−0.0s" (unsichtbar) und sind mechanisch bedeutungslos (~1.5 %).
   *   (3) RANGES auf It2.1-Stand getightet: evasionRating 40→20, blockChance 0.15→0.10 (armorRating ≤35,
   *       wardCapacity ≤80, modifiers 1..6 bleiben). Kein Ist-Item bricht (max genutzt: eva 20, block 0.10).
   */
  it("Consumable-Buffs: modifiers/trinity/bonus liegen nur in den erlaubten Bereichen (§4.3/§10.2)", () => {
    const offenders: string[] = [];
    const FORBIDDEN_FLATS = [
      "meleeDamage",
      "rangedDamage",
      "magicDamage",
      "defense",
      "accuracy",
      "evasion",
    ] as const;
    for (const it of Object.values(items)) {
      const buff = it.buff;
      if (!buff) continue;
      // (1) Verbotene Roh-Kampf-Flats in buff.bonus.
      const bonus = (buff.bonus ?? {}) as Record<string, number | undefined>;
      for (const key of FORBIDDEN_FLATS) {
        const v = bonus[key];
        if (v !== undefined && v !== 0) {
          offenders.push(`${it.id}: buff.bonus.${key}=${v} verboten (Roh-Kampf-Flat, §4.3)`);
        }
      }
      // (2) Tempo-Floor: wenn gesetzt, muss attackIntervalMs ≤ −120 sein (kein „−0.0s").
      if (buff.bonus?.attackIntervalMs !== undefined && buff.bonus.attackIntervalMs > -120) {
        offenders.push(
          `${it.id}: buff.bonus.attackIntervalMs=${buff.bonus.attackIntervalMs} verletzt Tempo-Floor (≤ −120)`,
        );
      }
      if (buff.modifiers) {
        for (const [attr, v] of Object.entries(buff.modifiers)) {
          if (v === undefined) continue;
          // Deckel 8 (war 6): Chef-approved Food-Retune #241 gibt den Top-Endgame-Gerichten
          // (soulfire_banquet/risotto_starcap) bewusst bis con+8 als „bester Bissen im Spiel".
          if (!Number.isInteger(v) || v < 1 || v > 8) {
            offenders.push(`${it.id}: buff.modifiers.${attr}=${v} außerhalb 1..8 (ganzzahlig)`);
          }
        }
      }
      if (buff.trinity) {
        const t = buff.trinity;
        // Armor-Iteration 2.1 #5 (§5): Max 150 → 35. Bindender Fall = 2H-Defensiv: def=(347.6+35)·1.15
        // = 440.0 → 77.9 % (2.1 pp UNTER dem 0.80-Mitigation-Cap). +150 hätte 2H hart an den Cap geklemmt.
        if (t.armorRating !== undefined && (t.armorRating < 0 || t.armorRating > 35)) {
          offenders.push(`${it.id}: buff.trinity.armorRating=${t.armorRating} außerhalb 0..35`);
        }
        // §4.3 (3): eva 40→20 (It2.1-Stand).
        if (t.evasionRating !== undefined && (t.evasionRating < 0 || t.evasionRating > 20)) {
          offenders.push(`${it.id}: buff.trinity.evasionRating=${t.evasionRating} außerhalb 0..20`);
        }
        if (t.wardCapacity !== undefined && (t.wardCapacity < 0 || t.wardCapacity > 80)) {
          offenders.push(`${it.id}: buff.trinity.wardCapacity=${t.wardCapacity} außerhalb 0..80`);
        }
        // §4.3 (3): block 0.15→0.10 (It2.1-Stand).
        if (t.blockChance !== undefined && (t.blockChance < 0 || t.blockChance > 0.1)) {
          offenders.push(`${it.id}: buff.trinity.blockChance=${t.blockChance} außerhalb 0..0.10`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * §4.4 (red-team 2026-07-09 L3, Task #303): Buff-Kategorien-Tagging ist VOLLSTÄNDIG. Jedes
   * Buff-Consumable trägt eine `buff.category` (Exklusivitäts-Slot, Verdrängung in
   * applyConsumableBuff) — AUSSER den drei dokumentierten HoT-Heiltränken (2–4-s-Heil-Mechanik
   * der Auto-Trank-Pipeline, bewusst kategorielos = stapeln frei). Ohne diesen Guard würde jede
   * neue Tonika-Zeile ohne Tag die globale Stacking-Decke wieder additiv anheben (das L3-Leck).
   */
  it("Consumable-Buffs: jedes Buff-Item trägt eine Kategorie (§4.4) — außer den 3 HoT-Heiltränken", () => {
    const CATEGORYLESS_ALLOWED = new Set(["minor_healing_potion", "greater_healing_potion", "bloodmend_draught"]);
    const offenders: string[] = [];
    let tagged = 0;
    for (const it of Object.values(items)) {
      if (it.type !== "consumable" || !it.buff) continue;
      if (it.buff.category) {
        tagged++;
        continue;
      }
      if (!CATEGORYLESS_ALLOWED.has(it.id)) {
        offenders.push(`${it.id}: buff ohne category (L3-Exklusivität, §4.4) — taggen oder Ausnahme dokumentieren`);
      }
    }
    expect(offenders).toEqual([]);
    // Bestands-Detektor: heute 44 getaggte Buff-Consumables (15 food / 8 regeneration / 10 offense /
    // 4 defense / 2 attribute / 5 utility). Neue Buff-Items erhöhen die Zahl — bewusst mitziehen.
    // Stil-Parität 4a (Chef-GO 26.08.2026, §4a A7): +2 (tonic_windstride "attribute", tonic_wardveil
    // "defense") → 46.
    expect(tagged).toBe(46);
  });
});

/**
 * Magier-Material-Paritäts-Audit (design/magier-material-parity-audit.md, 2026-07-23) §5:
 * "Drei-Stile-Material-Paritäts-Check". Rein lesend auf der ContentDB — prüft, dass keiner der
 * drei Kampfstile (melee/ranged/magic) über eine Material-Kette an ein Kampf-Level gehängt ist,
 * das weit über seinem eigenen Ausrüstungs-Requirement liegt (der Review-Claim: "der Magier hängt
 * an Monstern, denen man erst viel später begegnet").
 */
describe("Material-Parität der drei Stile (Magier-Material-Paritäts-Audit §5)", () => {
  const items = content.items;

  // ── G1: combatGate(itemId) — Minimum-Kampf-Level, um eine Material-Kette zu beschaffen ──────
  // (Referenz-Implementierung = das Audit-Dokument. "0" = ohne Kampf beschaffbar.)
  const shopItems = new Set(content.shop.map((e) => e.itemId));
  const cropItems = new Set(content.crops ? Object.values(content.crops).map((c) => c.yieldItem) : []);
  const actionsByOutput = new Map<string, (typeof content.actions)[string][]>();
  for (const a of Object.values(content.actions)) {
    for (const roll of a.loot) {
      const arr = actionsByOutput.get(roll.itemId) ?? [];
      arr.push(a);
      actionsByOutput.set(roll.itemId, arr);
    }
  }
  const monstersByLoot = new Map<string, (typeof content.monsters)[string][]>();
  for (const m of Object.values(content.monsters)) {
    for (const roll of m.loot) {
      const arr = monstersByLoot.get(roll.itemId) ?? [];
      arr.push(m);
      monstersByLoot.set(roll.itemId, arr);
    }
  }

  /** Effektives Kampf-Gate eines Monsters: Welt = level; slayer_tower = max(level, Etagen-Req·1.6)
   *  (kodiert, dass der Slayer-Skill selbst nur über Kampf-Umwege levelt); dungeonOnly = max(level,
   *  min. requiredLevel über alle Dungeons, die es einsetzen). */
  function monsterGate(m: (typeof content.monsters)[string]): number {
    if (m.slayerFloor != null) {
      const floor = content.slayerTower?.find((f) => f.floor === m.slayerFloor);
      const floorGate = floor ? floor.slayerLevelRequired * 1.6 : 0;
      return Math.max(m.level, floorGate);
    }
    if (m.dungeonOnly) {
      const hosts = content.dungeons.filter((d) => d.encounters.includes(m.id));
      const minHostReq = hosts.length > 0 ? Math.min(...hosts.map((d) => d.requiredLevel)) : m.level;
      return Math.max(m.level, minHostReq);
    }
    return m.level;
  }

  const gateMemo = new Map<string, number>();
  const gateVisiting = new Set<string>();
  /** Minimum über ALLE Quellen (Shop/Crop/Sammeln ⇒ 0; Verarbeitung ⇒ max über Input-Gates;
   *  Monster-Drop ⇒ monsterGate). Memoisiert; Zyklus-Schutz gibt 0 zurück (bricht die Rekursion,
   *  poisont den Aufrufer nicht — ein echter Zyklus wäre ohnehin ein Content-Bug, den andere Guards
   *  fangen). Items ganz ohne Quelle (z.B. reine Quest-Belohnungen) bleiben Infinity — das ist
   *  bewusst SICHTBAR statt stillschweigend auf 0 gerundet, s. G2 unten (dort separat ausgeschlossen).
   */
  function combatGate(itemId: string): number {
    if (gateMemo.has(itemId)) return gateMemo.get(itemId)!;
    if (gateVisiting.has(itemId)) return 0;
    gateVisiting.add(itemId);
    let best = Infinity;
    if (shopItems.has(itemId) || cropItems.has(itemId)) best = 0;
    for (const a of actionsByOutput.get(itemId) ?? []) {
      const g = a.inputs && a.inputs.length > 0 ? Math.max(0, ...a.inputs.map((inp) => combatGate(inp.itemId))) : 0;
      best = Math.min(best, g);
    }
    for (const m of monstersByLoot.get(itemId) ?? []) {
      best = Math.min(best, monsterGate(m));
    }
    gateVisiting.delete(itemId);
    gateMemo.set(itemId, best);
    return best;
  }

  function maxReq(it: { requirements?: Partial<Record<string, number>> }): number {
    const vals = Object.values(it.requirements ?? {}).filter((v): v is number => v !== undefined);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }

  it("G2 (hart): craftbares Equipment < L90 hat kein Material-Gate weit über dem eigenen Requirement", () => {
    // Dokumentierte Chase-Ausnahmen (Rare-Drop-Philosophie: nächster Tier-Stat bei aktuellem Req ist
    // INTENDED) — s. audit §4 P2 "dokumentierte Ausnahmen (KEINE Änderung)" + G2-Spec-Allowlist
    // (voidweave_*/voidhide_*/shadowhide_*/chitin_coif/frost_pelt_hood — wörtlich aus der Spec).
    // heiltrank-leiter-und-ausreisser-spec §2.3 (Task #321): dragonhide_*/void_focus AUS der
    // Allowlist entfernt — beide waren keine echten Chase-Fälle (deterministisches Craft), sondern
    // Material-Gate-Ausreißer, jetzt behoben (dragonhide_*: neues Alternativ-Gerbrezept
    // tan_dragonhide_scales über basilisk_scale/warhide, Gate 32; void_focus: requirements.magic
    // 55→65, Gate 80 ≤ limit 84,5) — beide rechnen jetzt grün ohne Allowlist.
    // Chef-Test 25.08.2026 (design/slayer-shop-1.1.0.md §4.1/§7.2): slayer_helm/slayer_greaves/
    // slayer_vambraces bekommen erstmals armorRating/evasionRating und fallen dadurch zum ersten
    // Mal in isInScope (vorher explizit draußen, s. Kommentar unten). Ihre Craft-Rezepte verlangen
    // Etage-5-Material (Seelenschinder-Reißzahn/Turmschmiedeschmelze, effektives Gate 80–128) bei
    // niedrigerem Wear-Requirement (50/65/80) — ein VORBESTEHENDER Mismatch, im Dokument als eigener
    // Nebenbefund §7.2 vermerkt ("Craft-Pfad der Armschienen ist 30 Level zu spät").
    // Chef-GO 03 26.08.2026: slayer_vambraces AUS der Allowlist entfernt — craft_slayer_vambraces
    // nutzt jetzt cinderwretch_hide (Etage 3, Slayer 40 statt Etage 5, Slayer 80; s. Kommentar dort).
    // Neues Gate = max(m.level, 40·1.6) = 64 über basilisk_scale (24)/cured_leather (0), Limit bei
    // req 50 ist max(60, 65) = 65 → 64 ≤ 65 rechnet grün ohne Allowlist. slayer_helm/slayer_greaves
    // bleiben (eigenes Ticket, nicht Teil dieses Auftrags — Chef-Auftrag war nur die Armschienen).
    // Die Shop-Käufe bleiben ohnehin die praktische Bezugsquelle (Punkte statt Craft) für beide.
    const isAllowlisted = (id: string): boolean =>
      id.startsWith("voidweave_") || id.startsWith("voidhide_") || id.startsWith("shadowhide_") ||
      id === "chitin_coif" || id === "frost_pelt_hood" ||
      id === "slayer_helm" || id === "slayer_greaves";

    // Scope = exakt das, was der Audit vergleicht (§1.1 Waffen-Kernlinien, §1.2 Rüstungs-Trinität):
    // Haupt-/Nebenhand-Waffen (alle 3 Stile, inkl. Schilde/Foki) UND die 5 Trinity-Slots NUR, wenn
    // das Teil tatsächlich eine Trinity-Verteidigungsschicht trägt (armorRating/evasionRating/
    // wardCapacity > 0) — schließt Schmuck (Hals/Ring) und Umhänge explizit aus (Slayer's Regalia
    // trägt seit 25.08.2026 Trinity auf drei Teilen, s. Allowlist oben statt hier). Diese Kategorien
    // vergleicht der Audit nie.
    const TRINITY_SLOTS = new Set(["helmet", "body", "legs", "gloves", "boots"]);
    const isInScope = (it: (typeof items)[string]): boolean => {
      if (it.slot === "mainhand" || it.slot === "offhand") return true;
      if (TRINITY_SLOTS.has(it.slot ?? "")) {
        return (it.armorRating ?? 0) > 0 || (it.evasionRating ?? 0) > 0 || (it.wardCapacity ?? 0) > 0;
      }
      return false;
    };

    const offenders: string[] = [];
    for (const it of Object.values(items)) {
      if (it.type !== "equipment" || isAllowlisted(it.id) || !isInScope(it)) continue;
      const craftedBy = actionsByOutput.get(it.id)?.filter((a) => (a.inputs?.length ?? 0) > 0) ?? [];
      if (craftedBy.length === 0) continue; // nicht craftbar (reiner Drop) — kein G2-Fall
      const req = maxReq(it);
      if (req >= 90) continue; // Endgame-Band: eigene Referenz-Tank-Probe (monster-threat-spec §8/§10.2)
      const gate = combatGate(it.id);
      const limit = Math.max(req + 10, req * 1.3);
      if (!Number.isFinite(gate) || gate > limit) {
        offenders.push(`${it.id}: req${req} gate=${Number.isFinite(gate) ? gate.toFixed(1) : "∞"} > limit${limit.toFixed(1)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * G3 (hart): keine 10er-Band-Lücke > 20 Level am Stück ohne neue erreichbare Sprosse — je Stil
   * (Hauptwaffe, mainhand) und je Rüstungs-Klasse (armorRating/evasionRating/wardCapacity, Body-Slot
   * als Referenz-Slot analog audit-Tabelle 1.2). "Erreichbar" = craftbar ODER ≥2%-Drop-Chance; eine
   * Sprosse zählt nur, wenn ihr combatGate innerhalb der Bandtoleranz ihres eigenen Req-Bands liegt
   * (Req-Band-Ende + 10 — dieselbe Formel wie G2). Operationalisierung des Audit-Befunds "Stoff hat
   * zwischen L1 und L22 keine einzige Sprosse" als Lückenmaß (max. Abstand zweier Sprossen ≤ 20)
   * statt starrer literaler Bucket-Zugehörigkeit — bewusste Referenz-Implementierung von content-dev,
   * s. Bericht an den Chef.
   */
  it("G3 (hart): melee/ranged/magic + Platte/Leder/Stoff haben nie eine Sprossen-Lücke > 20 Level", () => {
    function isReachable(itemId: string): boolean {
      for (const a of actionsByOutput.get(itemId) ?? []) if (a.loot.some((r) => r.itemId === itemId)) return true;
      for (const m of monstersByLoot.get(itemId) ?? [])
        if (m.loot.some((r) => r.itemId === itemId && r.chance >= 0.02)) return true;
      return false;
    }
    function bandLimit(req: number): number {
      return Math.max(10, Math.ceil(req / 10) * 10) + 10;
    }
    function rungs(candidates: Array<{ id: string; req: number }>): number[] {
      return candidates
        .filter(({ id, req }) => isReachable(id) && combatGate(id) <= bandLimit(req))
        .map(({ req }) => req)
        .sort((a, b) => a - b);
    }
    function assertNoBigGap(label: string, rs: number[]): string[] {
      if (rs.length === 0) return [`${label}: KEINE erreichbare Sprosse im ganzen Spiel`];
      const offenders: string[] = [];
      if (rs[0]! > 10) offenders.push(`${label}: erste Sprosse erst bei Req ${rs[0]} (>Band 1-10)`);
      for (let i = 1; i < rs.length; i++) {
        const gap = rs[i]! - rs[i - 1]!;
        if (gap > 20) offenders.push(`${label}: Lücke ${rs[i - 1]}→${rs[i]} (${gap} Level, >1 Band)`);
      }
      return offenders;
    }

    const offenders: string[] = [];
    const styles = ["melee", "ranged", "magic"] as const;
    for (const style of styles) {
      const weapons = Object.values(items)
        .filter((it) => it.slot === "mainhand" && it.weaponStyle === style)
        .map((it) => ({ id: it.id, req: maxReq(it) }));
      offenders.push(...assertNoBigGap(`Waffe/${style}`, rungs(weapons)));
    }
    const classes: Array<{ label: string; field: "armorRating" | "evasionRating" | "wardCapacity" }> = [
      { label: "Platte", field: "armorRating" },
      { label: "Leder", field: "evasionRating" },
      { label: "Stoff", field: "wardCapacity" },
    ];
    for (const { label, field } of classes) {
      const pieces = Object.values(items)
        .filter((it) => it.slot === "body" && (it[field] ?? 0) > 0)
        .map((it) => ({ id: it.id, req: maxReq(it) }));
      offenders.push(...assertNoBigGap(`Rüstung/${label}-Body`, rungs(pieces)));
    }
    expect(offenders).toEqual([]);
  });
});
