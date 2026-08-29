# Zauberreserve und Weisheit (Chef-GO 28.08.2026)

**Anlass:** Spieler-Feedback (RU): „Warum gibt es Weisheit, wenn es kein Mana mehr gibt? Wofür ist Mana-Regen?“ Analyse 28.08.: Mana ist als Verbrauch tot (Regeneration 1,5 + 0,4·WIS je Sekunde übersteigt die Kosten von ~2/s immer), Weisheit tut außer Mana fast nichts (+0,1 Verteidigung je Punkt). Vorschlag des Spielers: Mana als Wert wie Rüstung, Haltungen lesen ihn. Chef: „Mana und Weisheit war schon lange Go.“

## Regeln

1. **Mana wird Zauberreserve (EN „Spell Reserve“).** Kein Verbrauch mehr: `manaCost` verschwindet von allen Magiewaffen (Content, Typ, Karte), Zauber kosten nichts, der „schwache Magier“ bei leerem Mana entfällt. `maxMana` bleibt als Wert (30 + 10·INT + 4·WIS + Ausrüstung) und heißt in der UI Zauberreserve; `character.mana` bleibt im Save (Kompat), wird auf `maxMana` gehalten und nicht mehr angezeigt.
2. **Magie-Haltungen lesen die Reserve** (bestehende Haltungen der Magie-Stances, Namen/IDs im Content prüfen):
   - **Fokus** (offensive Magie-Haltung): +1 % Zauberschaden je 40 Reserve, Deckel +30 % (CL-90-Kit ≈ +20 %).
   - **Schild** (defensive Magie-Haltung, heute ×1,5 Ward-Regeneration und ×0,85 Schaden): zusätzlich +1 % Ward-Regeneration je 20 Reserve, Deckel +60 %.
   - Nahkampf-/Fernkampf-Haltungen unverändert.
3. **Weisheit = Status-Widerstand für alle Stile:** Statuseffekte, die auf den SPIELER gelegt werden (Brand, Frost, Schock, Gift, Blutung, Entzug), sind je Weisheitspunkt 1 % kürzer UND 1 % schwächer, Deckel 40 % (`WIS_STATUS_RESIST_PER_POINT = 0.01`, `WIS_STATUS_RESIST_CAP = 0.4`). Für Schock heißt schwächer: Verzögerung kürzer; für Frost: Einfrieren braucht ab 20 % Widerstand vier statt drei Anwendungen. Weisheit behält maxMana und den Verteidigungsterm.
4. **Alt-Werte umdeuten (kein Save-Bump):**
   - `manaRegen`-Boni auf Items/Sets/Buffs → Reserve-Boni: +1 Regen ⇒ +10 Zauberreserve (Content-Umschreibung oder Engine-Umrechnung; Karte zeigt „+10 Zauberreserve“).
   - `manaOnKill`-Effekte (sorrow_staff, skarn_idol_staff …) → `wardOnKill` (flacher Ward-Rückfluss je Kill; neues Effekt-Kind nach Muster healOnKill, Doku-Tabelle) oder, wenn die Waffe schon einen zweiten Effekt hat, entfernen; Bericht.
   - Begleiter `glyphmaw` (Fähigkeit manaRestore) → Fähigkeit, die Ward füllt (Muster `shield`/heal); `petManaRegenMult` entfällt.
   - Mana-Tränke/Verbrauchsgüter, die Mana füllen → temporärer Reserve-Bonus (+X Zauberreserve für Y Minuten) oder Umbau zu Ward-Trank; Bericht.
   - Camp-/New-Haven-Gebäude, Runen, Suffixe mit Mana-Bezug: gleiche Umdeutung.
5. **Symmetrie:** Monster haben kein Mana; Gegner-Statuseffekte gegen den Spieler unterliegen dem Weisheits-Widerstand, Spieler-Status gegen Gegner nicht (Monster haben keine Weisheit).
6. **Texte:** Item-Karte ohne Manakosten-Zeile; Stat-Zeilen „Zauberreserve“ mit Tooltip („Zauber kosten nichts. Fokus-Haltung: +x % Zauberschaden, Schild-Haltung: +y % Ward-Regeneration“), Weisheit-Tooltip „Status-Widerstand x %“; Kampf-Panel ohne Mana-Balken (Reserve als Zahl neben Ward); Onboarding-/Hinweistexte („Dein Stab wirkt Zauber und verbraucht Mana …“) neu; 7 Sprachen.
7. **Balance:** DPS-Parität je Stufe; Fokus-Bonus ersetzt den Wegfall des „schwachen Magiers“ (der nie griff) und ist ein bewusster Magie-Buff im Rahmen des Zauberfokus-Beschlusses; Pins neu messen, im Bericht auflisten.

## Umsetzung

- combat-dev/logic-dev (packages): shared (Konstanten, Effekt-Kinds, ItemDef.manaCost entfernen), engine (character.ts computeStats: Haltungen, Widerstand; combat.ts: Cast ohne Kosten, Status-Anwendung auf Spieler skaliert; pets.ts; consumable.ts), content (manaCost weg, Umdeutungen), Tests, Patchnotes, Doku.
- ui-dev (client): Kampf-Panel, Charakter-/Stat-Seite, Item-Karte, Tooltips, Onboarding-Texte ×7.

## Umgesetzt (packages, 28.08.2026 — combat-dev)

**Korrekturen gegenüber den Regeln oben (CEO/Chef 28.08.2026, design/balance-audit-magie-2026-08-28.md):**
Fokus-Haltung **+1 % Zauberschaden je 60 Reserve, Deckel +15 %** (statt 1 %/40 und +30 %; der Magier liegt im
Kit-Charakter 12–21 % hinter dem Nahkampf, +20 % am CL-90-Kit hätte ihn gegen Trash über ±10 % gehoben).
Schild-Haltung **+1 % Ward-Regeneration je 40 Reserve, Deckel +30 %** (statt 1 %/20 und +60 %; Chef: „langweilig,
wenn der Ward-Regen beinahe overpowered ist"). Alles Übrige wie in den Regeln.

**shared** (`packages/shared/src/index.ts`): `FOCUS_STANCE_DMG_PER_RESERVE = 0.01/60`, `FOCUS_STANCE_DMG_CAP = 0.15`,
`SHIELD_STANCE_WARDREGEN_PER_RESERVE = 0.01/40`, `SHIELD_STANCE_WARDREGEN_CAP = 0.30`, `WIS_STATUS_RESIST_PER_POINT = 0.01`,
`WIS_STATUS_RESIST_CAP = 0.4`, `WIS_FROST_EXTRA_STACK_RESIST = 0.2`, `MANA_REGEN_TO_RESERVE = 10` (Doku des Umrechners),
`WARD_RECHARGE_PER_CAST = 1.2` (ersetzt `WARD_PER_MANA`; = früher 6·0,20). Helfer `spellReserveDamageBonus(maxMana)`,
`spellReserveWardRegenBonus(maxMana)`, `wisdomStatusResist(wis)` (eine Rechnung für Engine UND Tooltip).
Entfernt: `MANA_PER_CAST`, `MAGIC_WEAK_FACTOR`, `MANA_SHIELD_*`, `ItemDef.manaCost`, `EquipBonus.manaRegen`,
`DerivedStats.manaRegen`, Kinds `manaOnKill`/`manaDrain`, Pet-Kind `manaRegen`, Pet-Ability `manaRestore`.
Neu: Effekt-Kind `wardOnKill` (FLAT Ward je Kill, Doku-Tabelle), Pet-Kind `spellReserve` (+% maxMana, Cap 5 %),
Pet-Ability `wardRestore` (Bruch maxWard, Cap 0,15), DerivedStats `spellReserveDamageBonus`, `spellReserveWardRegenBonus`,
`statusResist`. `maxMana` bleibt der Feldname (Stat, Save, EquipBonus) — nur die Bedeutung ist „Zauberreserve".
`surplus` liest jetzt den EIGENEN Ward-Anteil (threshold 0,8 · maxWard) statt des Mana-Anteils (der ohne Verbrauch
immer 100 % wäre); ohne Stoff-Pool inaktiv. Attribut-Beschreibungen INT/WIS und `WEAPON_TYPE_SPECIALTY.focus` in
7 Sprachen auf Zauberreserve/Status-Widerstand.

**engine/character.ts:** `maxMana = (30 + 10·INT + 4·WIS + Σ EquipBonus.maxMana) · petSpellReserveMult`; Fokus:
Spanne (min UND max) × (1 + Bonus) nur bei Stil magic und `magicStance !== "defensive"`; Schild: `wardRegenPerSec =
min(WARDING_REGEN_CAP, warding·0,02·1,5) · (1 + Bonus)` nur defensiv (Bonus NACH dem Cap, damit er am Endgame
sichtbar bleibt; max 2,6/s). `statusResist = min(0,4; 0,01·WIS effektiv)`. Haltungs-IDs: `MagicStance = "offensive"`
(= Fokus) | `"defensive"` (= Schild), unverändert.

**engine/combat.ts:** Cast ohne Kosten (jeder Magie-Angriff ist ein Zauber, Cast-Recharge fest 1,2 Ward);
`castManaCost` entfernt; `tickPlayerRegen` hält `character.mana = maxMana` (Kampf UND Idle über tick.ts);
`applyMonsterInflict(state, monster, stats)`: Dauer × (1 − r), Magnitude × (1 − r), Schock-Verzögerung und
Ketten-Deckel × (1 − r) (`delayNextAttack(…, resist)`), Frost-Einfrieren ab r ≥ 0,2 mit vier Anwendungen
(`onStatusApplied(…, resist)`); Gegner-Seite (`applyEnemyStatus`) ungeschützt. Kill-Pfad `wardOnKill` (summiert
über Quellen wie healOnKill), Pet `wardRestore`. `manaDrain`-Pfad entfernt.

**engine/pets.ts:** `petSpellReserveMult` ersetzt `petManaRegenMult`.

**content:** `manaCost` von 53 Magiewaffen entfernt. `manaOnKill` → `wardOnKill` (gleiche Magnitude) auf
hedgewitch_twig 3, felmagician_eye 3, soulopal_band 4, tidecaller_focus 6, siren_shockstaff 4, aetherband_ring 5,
sorrow_staff 5, soulflayer_amulet 5, impbone_wand 2, shamans_cowl 2; entfernt auf last_condemnation (trägt surplus als
zweiten Effekt). `manaDrain`: tideterror_grip → wardSiphon 0,08 (≈ gleiche Größenordnung), warlock_felstaff entfernt
(Brand bleibt). glyphmaw „Runenfraß": manaRestore 30 % maxMana → wardRestore 10 % maxWard / 5 s. Pets pyreling 5 % /
hoarspite 4 %: manaRegen → spellReserve. tonic_arcane_surge: `{ maxMana: 60, manaRegen: 4 }` → `{ maxMana: 100 }`
(60 + 4·10) für 90 s. Gebäude/Runen/Suffixe hatten keinen Mana-Bezug mehr (nur affix_thin_veil = surplus, semantisch
umgestellt). Texte (EN/DE + es/fr/pt-BR/ru/zh): runewoven_robe_legs, shamans_cowl, emberheart_robe, glyphmaw,
pyreling, hoarspite.

**persistence:** kein SAVE-Bump, Sanitize unverändert (`mana` ≥ 0 endlich); Vault-Guard grün (419 Tests).

**Balance-Pins:** balance-envelope TTK-Matrix magic idol_warden 58,05 → 50,48 s, last_idol 194,82 → 169,41 s (exakt
1/1,15 — das CL-90-Kit liegt am Fokus-Deckel); Boss→Spieler und melee/ranged unverändert. sim-consistency/sim-goals/
sim-realistic ohne Pin-Änderung.

**Tests:** neu `packages/engine/src/spell-reserve.test.ts` (21); umgebaut: magic-loop (Manakosten-/Depletion-Tests
entfernt), mana-equip, mana-shield, armor-trinity-combat, lifesteal-respawn, elemental-status, ward, weapon-effects-2
(wardOnKill/surplus-Ward), pet-*, spell-focus, armor-iteration2-combat.

**Offen (ui-dev, client):** ItemTooltip (`manaCost`/`MANA_PER_CAST`/`manaRegen`-Zeilen raus, Zauberreserve-Label),
CharacterPage (Zauberreserve als Wert statt Mana-Balken, Tooltips Fokus/Schild/Weisheit aus `stats.spellReserveDamageBonus`
/`spellReserveWardRegenBonus`/`statusResist`), CombatPage (kein Mana-Balken, Reserve neben Ward; `PET_ABILITY_BUCKET`
wardRestore), combatFx (`PET_ABILITY_IMAGE` wardRestore), petText (wardRestore, spellReserve), i18n-Keys
`weaponEffect.wardOnKill`/`surplus`-Text (Ward statt Mana), `pet.*.spellReserve`/`wardRestore`, Onboarding-Texte ×7.

## Nachtrag 29.08.2026 (Chef): Reserve aus Weisheit, Haltungen heißen Fokus und Abwehr

Chef: „Ich dachte, wir machen Weisheit als Gegenstück zu Intelligenz; die Zauberreserve sollte durch Weisheit kommen." Umgesetzt: `maxMana = (30 + 10·WIS + Σ EquipBonus.maxMana) · petSpellReserveMult` (INT raus; INT bleibt Grundschaden 0,34/Punkt + Zauberfokus). Nachmessung mit dem CL-90-Götterfunken-Kit (Magie/Abwehr 99): INT 58, WIS 34, Reserve 746 → 370. Damit dieselben Haltungswerte herauskommen, Teiler 60 → 30 (Fokus, CL-90 ≈ +12,3 %) und 40 → 20 (Abwehr, ≈ +18,5 %); Deckel 15 %/30 % ab Reserve 450/600 (WIS 42/57). CL-50 Dämmerweb: WIS 15 → Reserve 180 → +6 %/+9 % (vorher 7,8/11,8). Haltungs-IDs bleiben `offensive`/`defensive` (Saves), die Labels heißen jetzt Fokus/Abwehr (EN Focus/Warding, es Enfoque/Guarda arcana, fr Concentration/Barrière, ptBR Foco/Guarda Arcana, ru Сосредоточение/Оберегание, zh 专注/结界术), Tooltip `statdesc.spellReserve` nennt „+10 je Weisheit".
