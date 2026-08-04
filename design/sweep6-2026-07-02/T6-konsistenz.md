# Sweep 6 — T6 Konsistenz-Audit (2026-07-03, Tester read-only)

Methodik: Wegwerf-Harness `_tmp_s6t6_*` (vitest über echten Content + Node-Script über
`translations.ts`), danach gelöscht. Kein Fix vorgenommen. Alle Zeilenangaben Stand heute.

## Ergebnis-Überblick

| Prüfung | Ergebnis |
|---|---|
| (a) sim-consistency (alle 4 Checker) vs. gepinnte Baseline | ✅ **0 NEUE Auffälligkeiten** (Ladder 36/36 gepinnt, Drop-Gaps 17/17, Waisen 3/3, Naming 1/1); Guard-Test grün. **14 Pins sind stale** (s. P4-1) |
| (b) Referenz-Vollständigkeit (loot/inputs/shop/slayerShop/dungeons/quests/achievements/sets/crops/runes→affixes/slayerMasters/tower) | ✅ 0 tote Referenzen; 0 verwaiste Affixe; Runen-Tier ≤ bonusByTier-Länge überall |
| (b2) weaponEffects-Kinds ↔ Prosa-Templates | ✅ 31/32 genutzte Kinds haben en+de-Template; ❌ **`bane` fehlt** → Fallback greift sauber, verliert aber die Kern-Info (P3-2) |
| (c) i18n en/de | ✅ 921/921 Key-Parität (zusätzlich tsc-erzwungen); 0 Platzhalter-Mismatches ({n}/{magnitude}/{flat}/…); 0 `t()`-Aufrufe auf fehlende Keys. **~87 Waisen-Keys** (P4-2) |
| (c) DoT-Anzeigen nach dem DoT-Fix | ✅ plausibel: burn/bleed/poison-Prosa nutzt `{flat}` (Content-Magnituden 0.1–4.8 Schaden/s), shock nutzt `{magnitude}` auf 0.1–0.4-Fraktion (=10–40 %), frost zeigt keine Magnitude (Engine nutzt sie nicht), Kampflog zeigt echten Tick-Betrag via formatStat, Status-Chips nur Restdauer |
| (d) Naming/DE-Vollständigkeit | ✅ ALLE lokalisierten Felder (Namen + Beschreibungen + Affix-Präfixe + Suffix-Phrasen + Pets/Dungeons/Slayer/Crops) vollständig en+de, 0 einsprachige; en==de nur Onyx/Goblin (legitim); keine EN-Leaks im de-Block |
| (e) MonsterFamily-Tags | ✅ 72/92 getaggt, alle Tags plausibel (kein Wolf als undead o.ä.); 20 ungetaggt, davon 3 diskutable Kandidaten (P4-3) |

## Findings

### P3-1 — `combat.inflictsHint` ist gift-spezifisch, wird aber für ALLE Inflict-Typen gezeigt (ui-dev)
- `apps/client/src/renderer/pages/CombatPage.tsx:1223` und `:1635`, `apps/client/src/renderer/pages/BestiaryPage.tsx:184` hängen an JEDES inflict-Badge den Tooltip `combat.inflictsHint` = „This enemy can poison you. Carry an Antivenom Tonic."
- 27 von 37 inflict-Monstern verursachen aber burn/bleed/frost/shock (z.B. skeleton_icemage frost, roc_storm shock, dire_wolf bleed) — der Rat ist dort falsch: Antivenom heilt NUR poison (`packages/engine/src/combat.ts:108`, `consumable.ts` curesPoison).
- Fix-Idee: pro-Typ-Hint (`combat.inflictsHint.<type>`) oder generischer Text; die Labels `status.<type>` existieren bereits.

### P3-2 — `weaponEffect.bane`-Template fehlt (en+de); bekannter Gap, Fallback verifiziert (ui-dev)
- Einziger bane-Träger: `gravesteel_blade` (`packages/content/src/index.ts:4916`, +25 % vs. undead).
- `apps/client/src/renderer/util/weaponEffectProse.ts:38` fällt sauber auf `weaponEffect.fallback` zurück („Grants the weapon a special combat effect.") — kein Roh-Key, kein Crash, EnchantingPage/Tooltip identisch. ABER: die Headline-Info der Waffe (+25 % gegen Untote) ist für den Spieler unsichtbar.
- `monsterFamily.<family>`-i18n-Keys existieren noch NICHT (geplant laut `packages/shared/src/index.ts:170`); `weaponEffectProse` kennt zudem keinen `{targetFamily}`-Platzhalter — beides zusammen liefern, wenn das Template kommt.
- Nebenbefund: `doubleStrike` hat Template+Engine-Pfad, aber 0 Content-Nutzer — dokumentierter Palette-Hook, ok.

### P4-1 — 14 stale Guard-Pins in `sim-consistency.test.ts` kürzen (logic-dev/content-dev)
Feuern nicht mehr, maskieren aber künftige Re-Regressionen (Subset-Check schluckt sie stumm):
- Ladder (13): spellbinder_ring->diamond_ring, soul_amulet->sapphire_amulet, sapphire_amulet->gemstone_amulet, bloodstone_amulet->diamond_amulet, copper_spear->pitchfork_spear, iron_spear->wolffang_spear, iron_longbow->ashwood_longbow, bronze_shortbow->stolen_shortbow, dim_focus->iron_focus, frost_focus->blacksteel_focus, void_focus->runite_focus, bloodstone_ring->spellbinder_ring, stormcaller_amulet->onyx_amulet
- Orphan (1): `crude_bone` — ist seit Task #213 Gravesteel-Rezept-Input (`content/src/index.ts:6720/6726/6732`), kein Waisen-Item mehr.

### P4-2 — ~87 verwaiste UI-Text-Keys (×2 Sprachen) in `translations.ts` (ui-dev, Aufräumen)
Kein Literal- und kein Dynamik-Präfix-Treffer im gesamten Renderer. Cluster:
- Alte Onboarding-Tour: `onboarding.gather/process/equip/fight/economy/idle .title/.body`
- `footer.save/saved/mainMenu` (durch `sidebar.*` ersetzt)
- Vestigiale Attributpunkte-UI: `creation.appearance/attributes/pointsRemaining`, `char.freePoints` (laut Chef-Entscheid „vestigialen State löschen")
- Map-View-Reste: `combat.mapView/listView/unplacedMobs` (Maps sind aus)
- Slayer-Reste: `slayer.tower.intro/range/enter/combatHint`, `slayer.task.location/travel`, `slayer.shop.unlock/unlocked/cost/buy`
- Itemization-Reste: `instance.enchanted`, `instance.suffix`, `suffix.rollStrength`
- Diverse Einzel-Keys (stat.style, item.value, bank.empty, mastery.title, …) — vollständige Liste reproduzierbar über das Audit-Script (Waisen-Sektion).
Hinweis: `pet.flavor.*`, `sidebar.*`, `topbar.*` sind KEINE Waisen (dynamische Keys via `pet.flavor.${petId}` CombatPage.tsx:170 u.ä.).

### P4-3 — MonsterFamily: 3 diskutable Ungetaggte (content-dev, nur falls Bane-Abdeckung wachsen soll)
- `charred_doomknight` (slagpit, L200) ungetaggt, während `dread_knight` undead ist; `spectral_stag` (blackthorn) ungetaggt, während Wraiths/Shades undead sind; `slag_abomination` (tower) ungetaggt.
- Elementare/Rootlings/Void-Wesen haben schlicht keine passende Familie in der 6er-Taxonomie — ok. Falsch-Tags gefunden: keine. Gameplay-Impact heute gering (einziger bane ist undead auf einer L24-Waffe).

### P4-4 — Kleinkram
- `suffix_phoenix` de „des Phoenix" → Konvention wäre „des Phönix" (einziger echter Umlaut-Treffer über ALLE Felder; „zuerst"/„Konsequent" sind False-Positives).
- `CombatPage.tsx:175`: `{amount}` in pet.flavor-Templates (cragmaw/ashgut) wird nur bei amount>0 ersetzt — würde ein petAbility-Event je amount=0 loggen, stünde „{amount}" roh im Kampflog. Defensiv-Nit.
- Icon-Backlog unverändert: 331 Items ohne Emoji-Fallback (bekanntes, gepinntes Info-P3; Pixelart bindet über ID).

## Empfehlung
Kein Blocker. P3-1/P3-2 als kleine ui-dev-Tickets einplanen (P3-2 zusammen mit den `monsterFamily.*`-Keys + `{targetFamily}`-Platzhalter), P4-1-Pins beim nächsten Guard-Anfassen kürzen. Konsistenz-Zustand insgesamt: sehr sauber — 0 neue Checker-Findings, 0 tote Referenzen, i18n-Parität vollständig.
