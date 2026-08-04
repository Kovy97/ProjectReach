# QA Run 4 — Crafting: Fletching · Runecrafting · Leatherworking

Playtester-Persona: Crafting-Säule (Fletching, Runecrafting, Crafting/Leder).
Methode: READ-ONLY Datenanalyse von `packages/content/src/index.ts` (11.861 Zeilen) + Wiring-Gegencheck gegen `packages/engine/src/enchant.ts` / `enchant.test.ts`. Zahlen = Zeilen-/Level-/Wert-Belege aus der Quelle. Kein Sim-Harness nötig (reine Datenverifikation), daher nichts angelegt/entfernt.
Vergleichsbasis: `design/qa/run3-crafting.md` (Fun-Score 8/10).

## Fun-Score: 8.5 / 10
## Δ vs run3: +0.5

Run 4 räumt die beiden echten run3-Mängel ab (tote Holz-Tiers, vestigiale Tinten) UND liefert ein substanzielles neues Feature sauber ab: das tiered Affix-Runen-Verzauberungssystem (21 Runen, engine-verdrahtet + getestet) plus L99-Ranged/Magie-Leder-Parität. Punktabzug bleibt für eine neue Versorgungs-/Gating-Reibung (Reeds) und ein paar kosmetische Altlasten.

---

## Verifikation der Fixes (Run3 → Run4)

### ✅ Fix C — 4 tote Holz-Tiers haben jetzt eine Senke (run3 [P2])
Jedes der vier verwaisten Hölzer bekommt **genau ein** Fletching-Offhand-Schild (Z. 6162–6185, Items Z. 2830–2849):
- `willowbark_log` → `willowbark_shield` (Fletch L15, def 7 / eva 5 / maxHp 16, equip defence 12, Wert 130)
- `grimwood_log` → `grimwood_shield` (Fletch L25, def 12 / eva 8 / maxHp 28, defence 22, 280)
- `ashfen_log` → `ashfen_buckler` (Fletch L63, def 30 / eva 20 / maxHp 66, defence 58, 1200, rare)
- `voidwood_log` → `voidwood_pavise` (Fletch L92, def 58 / eva 36 / maxHp 120, defence 88, 3600, epic)

Sauber gelöst: Die Fletch-Levels (15/25/63/92) matchen **exakt** die Woodcutting-Log-Levels — wer den Baum fällen kann, kann das Schild schnitzen. Stats skalieren monoton (def 7→58). Input `bowstring` ist versorgt (`fletch_bowstring` aus `scarred_hide`, Z. 5938). Holz-Senken-Befund aus run3 vollständig erledigt.

### ✅ Fix F — L99-Ranged & L99-Magie-Leder-Parität
- **Voidhide** (T8 Ranged, 5-teilig, alle L99, Z. 7240–7268): helm/body/legs/vambraces/boots, jeweils mit `rangedDamage`-Bonus (body 12, helm/legs 8–9) — das erste Ranged-Leder mit Offensiv-Stat. Set `voidhide_set` registriert (Z. 9695). Input: `shadowhide` + `void_rune` + `aether_essence` (alle versorgt).
- **Voidweave** (Magie-Robe, 5-teilig, alle L99, Z. 7274–7302): mitre/vestment/skirt/handwraps/sandals, hohe magicDamage (vestment 40) + crit. Set `voidweave_set` registriert (Z. 9638). Input: `warhide` + `void_rune` + `aether_essence` + `idol_shard` (idol_shard droppt 0.3–0.8, Z. 8347/8390/8412).

Damit haben Melee (Godiron @99), Ranged (Voidhide @99) und Magie (Voidweave/Godspark) jeweils ein L99-Cap-Set. Robe-Sets jetzt **8** (apprentice/ember/frost/aether/arcane/runewoven/godspark/voidweave), **alle exakt 5-teilig** (category-Zählung je 5).

### ✅ Neues tiered Affix-Runen-Enchant-System
- **21 Runen** = 7 Affixe × 3 Tiers (Z. 595–617), jede mit `rune:{affixId,tier}`. **21 craft-Rezepte** (Z. 6864–6997), saubere 1:1-Abdeckung, 0 verwaiste Runen.
- Affix-Registry (Z. 11787–11860) mit `bonusByTier` + `appliesTo`-Restriktion, **3-Stil-Parität**: `affix_keen`→weapon_melee (meleeDmg 3/7/14), `affix_arcane`→weapon_magic (magicDmg 3/7/14), `affix_hunter`→weapon_ranged (rangedDmg 3/7/14); universell: `affix_flame`/`affix_frost` (burn/frost-Effekt 0.15→0.30), `affix_precise` (acc/crit), `affix_swift` (attackInterval −150/−300/−500).
- **Engine-verdrahtet + getestet** (kein "definiert-aber-nie-genutzt"): `packages/engine/src/enchant.ts` (enchant/disenchant/affixAppliesToItem/disenchantGoldCost) + `enchant.test.ts` (Runen-Anwendung, Affix-Stacking, Disenchant, Enchant am ausgerüsteten Item via `equippedInstances`) + `instance-weapon-effect.test.ts`.

### ✅ Alte per-Waffe-Enchant-Rezepte — Frage geklärt
Es existiert **kein** "Waffe-rein → verzauberte-Waffe-raus"-Rezept mehr. Verzauberung läuft ausschließlich über Runen auf Item-Instanzen (Arch-B, engine-seitig). Die noch vorhandenen `enchant_*`-Rezepte (Z. 6755–6821, 7000–7013: dim_focus, frost_scepter, aether_runestaff, frost/aether/void/god_focus, stormcaller_rod, voidcaller_staff, godspark_staff) sind **Magiewaffen-/Fokus-ERSTELLUNG** aus Essenz+Rune, kein Affix-Apply. Sie sind also kein toter Altlast-Mechanismus — aber das geteilte Vokabular "Enchant …" kollidiert mit dem neuen System (siehe [P3]).

### ✅ Vestigiale Inscription-Tinten entfernt (run3 [P2])
`soot_ink` / `ether_ink`: **0 Referenzen** (entfernt). Inscription-Skill komplett raus: **0** `skill: "inscription"`. Deckt sich mit Design-Memory ("Inscription raus").

---

## Verbleibende / neue Findings

### [P2] Reed-Versorgung gated Farming-Levels WEIT über den Runecrafting-Verbrauch
Die Affix-Runen verbrauchen `reed_pale/iron/void` — diese sind **nur via Farming** beschaffbar (yieldItem, Z. 11381/11506/11620), die **fertigen Reeds sind NICHT im Shop** (nur die Samen: palereed_seed 10 g / ironreed_seed 60 g / voidreed_seed 380 g, Z. 8839–8841). Aber das Wachsen verlangt Farming L6 / **L46** / **L84**. Verbrauch dagegen:
- `craft_rune_hunter_i` @ Runecrafting **L28** braucht `reed_iron` (Farming L46) → +18 Cross-Skill-Gap.
- `craft_rune_keen_ii` (L38), `craft_rune_precise_ii` (L45) → `reed_iron` (L46).
- `craft_rune_keen_iii` (L62), `craft_rune_precise_iii` (L70), `craft_rune_swift_iii` (L72) → `reed_void` (Farming **L84**) → bis +22 Gap.

Effekt: Ein selbstversorgender Runecrafter muss Farming massiv vor-leveln, um das **Flaggschiff-Feature** dieses Runs überhaupt zu nutzen — Reeds lassen sich nicht fertig zukaufen. Besonders auffällig als **Stil-Parität-Delle**: Tier-I-Runen für Melee (`keen_i` L15, reed_pale) und Magie (`arcane_i` L30, reed-frei) sind früh zugänglich, aber die **Ranged**-Tier-I-Rune (`hunter_i` L28) hängt allein an Farming L46.
**Fix:** Reed-Farming-Level an die jeweils niedrigste konsumierende Rune angleichen (reed_iron ~L26, reed_void ~L60), ODER fertige Reeds im Shop/als Drop anbieten, ODER `hunter_i`/Tier-II/III auf reed_pale/-iron statt -void umstellen.

### [P3] Vokabular-Kollision: `enchant_*`-Rezepte vs. neues Verzauberungssystem
10 Magiewaffen-/Fokus-Crafts heißen `enchant_…` ("Enchant Frost Focus", "Enchant Godspark Staff", Z. 6755–6821 / 7000–7013), erzeugen aber feste Waffen aus Essenz — parallel zum echten Affix-Runen-"Enchant". Ein Spieler, der "Enchant …" liest, erwartet das Runen-System. Rein kosmetisch, aber irreführend.
**Fix:** Auf "Craft/Forge X" umbenennen; "Enchant" exklusiv fürs Runen-Apply reservieren.

### [P3] `scaled_body` weiterhin L14 — 14–16 Level vor dem Rest seines Sets (run3-Carryover, NICHT behoben)
`craft_scaled_body` levelRequired **14** (Z. 6225), aber `craft_scaled_helm/vambraces/boots` L28 und `craft_scaled_legs` L30. Identischer run3-[P3]-Befund, unverändert.
**Fix:** scaled_body auf ~L26–28 anheben.

### [P3] voidweave verlangt zum Anlegen Runecrafting 99 **und** magic_off 99 (Doppel-Cap)
Die L99-Magie-Robe (leatherworking-gefertigt) hat `requirements: { magic_off: 99, runecrafting: 99 }`. Thematisch ("Runengewebe") vertretbar, aber ein reiner Caster ohne Runecrafting-Maxung kann seine beste Robe nicht tragen. Bewusst lassen oder Runecrafting-Req senken.

### [Info] Persona-Erwartung „rune_storm" trifft nicht zu — kein Bug
Das implementierte Affix-Set ist keen/flame/frost/precise/swift/arcane/hunter; es gibt **kein** `affix_storm`/`rune_storm_*`. Die drei „elementaren" Tier-Runen sind flame/frost (Status) — der dritte Slot ist nicht „storm", sondern über keen/precise/swift/arcane/hunter abgedeckt. Nur Erwartungsabgleich, kein Defekt.

### [Info] Kosmetische Rezept-ID-Inkonsistenz im cured-Tier — kein Set-Defekt
cured (T1) ist **vollständig 5-teilig** (cap/body/legs/vambraces/boots, Set `cured_leather_set` Z. 9648), aber die IDs mischen `craft_leather_cap`/`craft_leather_body` mit `craft_cured_legs/vambraces/boots`. Rein kosmetisch.

---

## Fazit
Die zwei substanziellen run3-Beanstandungen (tote Holz-Tiers, vestigiale Tinten) sind **vollständig behoben**, und das neue Affix-Runen-Verzauberungssystem ist **lückenlos, stil-paritätisch und engine-getestet** abgeliefert — dazu L99-Ranged/Magie-Leder-Parität (Voidhide/Voidweave). Einziger echter neuer Wermutstropfen: die **Reed-Farming-Gates** liegen deutlich über dem Runecrafting-Bedarf und drosseln ausgerechnet das Headline-Feature (P2). Rest sind Kosmetik/Carryover-P3. Solider Aufwärtsschritt: **8.5/10 (Δ +0.5)**.
</content>
</invoke>
