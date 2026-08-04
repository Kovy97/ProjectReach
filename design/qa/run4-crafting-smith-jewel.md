# QA Run 4 — Crafting: Smithing + Jewelcrafting (nach Fixes)

Playtester-Fokus: 12-Tier-Metall-Leiter (Copper→Godiron), 8 Gem-Tiers (Garnet→Godgem), Material-Versorgung (produziert vs. konsumiert), Upgrade-Lohnen (Stat-Monotonie), tote Referenzen, und Verifikation der angewandten Melee-`meleeDamage`-Buffs über alle Schwert/Axt/Maul-Tiers.

Methode: READ-ONLY. Temporäres Node-Parse-Harness (Datei `packages/content/src/index.ts` als Objekt geladen: **805 Items, 679 Actions**), danach entfernt. Vergleich gegen `design/qa/run3-crafting.md`.

## Fun-Score: 9 / 10

## Δ vs run3 (war 8/10): **+1**
- **[GEFIXT] P2 — 4 tote Holz-Tiers.** `willowbark_log`/`grimwood_log`/`ashfen_log`/`voidwood_log` haben jetzt je eine Senke: neue Fletching-Rezepte `fletch_willowbark_shield`, `fletch_grimwood_shield`, `fletch_ashfen_buckler`, `fletch_voidwood_pavise`. Alle 4 jetzt `consumedBy=1`.
- **[GEFIXT] P2 — vestigiale Inscription-Tinten.** `soot_ink` und `ether_ink` sind vollständig entfernt (Item + Grind-Action existieren nicht mehr; `exists=false`).
- **[NEU verifiziert] Melee-`meleeDamage`-Buff sauber angewandt.** Die ×Faktor-Buffs greifen über **alle** Nahkampf-Waffentypen monoton und ohne Ausreißer (Details unten). Frühere Lücke (run3: `copper_sword` md=5) ist auf md=10 angehoben; Endwert `godiron_sword` 132→172. Accuracy unverändert.
- **Keine Regressionen.** 0 tote Referenzen, alle 12 Forge-Sets vollständig, alle Erze/Gems versorgt.

Die Crafting-Säule ist nach den Fixes nahezu makellos. Abzug zum 10er nur für **drei unveränderte Smelt/Erz-Gaps** (carry-over P3), eine **U-förmige Upgrade-Kadenz** mit schwachem Runite-Tier und einen **cross-system Orphan-Token** (`cut_gemstone`).

---

## Verifikation Melee-`meleeDamage`-Buff (Kernauftrag)

`meleeDamage` über alle 12 Metall-Tiers, je Waffentyp — **lückenlos befüllt, durchgehend monoton steigend, 0 Inversionen, 0 Flat-Tiers**:

| Typ | cop | bro | iro | ste | bla | mit | ada | run | blo | tit | aet | god |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dagger | 6 | 10 | 18 | 22 | 31 | 36 | 45 | 48 | 60 | 73 | 87 | 107 |
| scimitar | 8 | 14 | 24 | 31 | 43 | 48 | 62 | 66 | 82 | 99 | 120 | 146 |
| sword/mace | 10 | 16 | 28 | 36 | 50 | 57 | 72 | 78 | 96 | 117 | 140 | 172 |
| axe | 10 | 16 | 30 | 38 | 52 | 60 | 75 | 82 | 101 | 122 | 147 | 181 |
| spear | 12 | 18 | 32 | 40 | 56 | 65 | 81 | 87 | 108 | 131 | 157 | 192 |
| battleaxe | 12 | 18 | 32 | 41 | 58 | 66 | 83 | 90 | 111 | 134 | 161 | 198 |
| greataxe | 16 | 26 | 46 | 58 | 81 | 93 | 117 | 126 | 156 | 190 | 228 | 278 |
| greatsword | 18 | 30 | 52 | 67 | 94 | 105 | 134 | 144 | 178 | 216 | 260 | 317 |
| maul | 22 | 34 | 60 | 77 | 108 | 123 | 155 | 168 | 207 | 252 | 302 | 369 |

- **Konsistenz-Beweis:** Die Tier-zu-Tier-Faktoren sind über sword/axe/maul praktisch deckungsgleich (z. B. copper→bronze ≈ 1.60/1.60/1.55; bronze→iron ≈ 1.75/1.88/1.76; aetherium→godiron ≈ 1.23/1.23/1.22). Der Buff wurde also als **gleichförmiger Faktor pro Tier** über die ganze Familie gezogen — kein einzelner Tier oder Waffentyp wurde vergessen oder überzogen.
- **Same-Tier-Parität korrekt:** dagger < scimitar < sword ≤ axe < spear ≤ battleaxe < greataxe < greatsword < maul gilt auf **jedem** Tier. Axt liegt konsequent minimal über Schwert (Designabsicht), Maul (2H) am höchsten — keine Inversion.
- **`mace` == `sword`** auf allen 12 Tiers (identische Kurve) — bewusst, kein Fehler.

**Ergebnis: Buff-Verifikation bestanden.** Keine Ausreißer, keine Inversionen, keine fehlenden Tiers.

---

## Bestätigte Stärken (gegen run3 erneut geprüft)

- **Metall-Leiter 12/12 vollständig & uniform.** Jedes Tier = 1 Smelt + 20 Forge (exakt 10 Waffen + 9 Rüstung + 1 Pfeilspitzen). Smelt-Level: Copper 1, Bronze 5, Iron 10, Steel 20, Blacksteel 30, Mithril 35, Adamantium 45, Runite 55, Bloodiron 65, Titanium 75, Aetherium 85, Godiron 95.
- **Coal-Gating sauber gestaffelt.** 0/0/0 (cop/bro/iro) → Steel 1 → Blacksteel/Mithril 2 → Adamantium/Runite 3 → Bloodiron/Titanium 4 → Aetherium/Godiron 5. Coal aus `mine_coal`@L15 versorgt.
- **Rüstung monoton.** Platebody def/maxHp: 8/20 → 11/28 → 17/42 → 24/60 → 32/80 → 42/105 → 52/130 → 64/160 → 78/195 → 94/235 → 112/280 → 136/340. Jeder Tier-Sprung spürbar.
- **Gem-Leiter 8/8 bis L99-Cap.** Cut/Ring/Amulett je Tier: Garnet(1/1/3) → Sapphire(15/15/18) → Ruby(34/34/38) → Bloodstone(44/44/48) → Diamond(55/55/60) → Onyx(70/70/75) → Voidstone(85/85/88) → **Godgem(95/95/99)**. Keine `>L99`-Requirements.
- **JC-Barren-Matching plausibel.** Ringe nutzen 1 Tier-Barren, Amulette 2; copper→aetherium-Barren als Gem-Tier-Begleiter (Godgem nutzt aetherium_bar, da Godiron-Barren erst L95 — ok).
- **Versorgung lückenlos.** Alle 8 Roh-Gems haben ≥1 dedizierte Mining-Ader (`mine_garnet_seam`@15 … `mine_godgem_seam`@95) plus Nebenfunde. Alle 12 Erze abbaubar. **0 tote Referenzen** in 679 Actions (Inputs+Loot zeigen ausschließlich auf existierende Items).
- **Smith/Jewel füttern die Slayer-Schutz-Mechanik.** `craft_mirror_ward` (Smithing L30) & `craft_void_anchor` (Jewelcrafting L70) wirken zunächst senkenlos, sind aber als Slayer-Gates referenziert (z. B. `gaze_basilisk` verlangt `mirror_ward`) — **nicht tot**, nur kein Action-Input.

---

## Findings (alle P3 — keine P0/P1/P2)

### [P3] (CARRY-OVER, unverändert) Smelt schaltet 5 Level vor dem eigenen Erz frei
`smelt_bloodiron` L65 (Erz `bloodiron_ore` erst Mining L70), `smelt_titanium` L75 (Mining L80), `smelt_aetherium` L85 (Mining L90). Die übrigen Tiers sind deckungsgleich (Mithril/Adamantium/Runite/Godiron gap=0). Genau die drei in run3 ([P3]) gemeldeten Gaps bestehen weiter — ein reiner Schmied muss das Erz 5 Level lang über Drops/Shop beziehen.
**Fix:** Smelt-Level dieser drei an Mining angleichen (oder als bewusste Cross-Skill-Abhängigkeit dokumentieren).

### [P3] (NEU) U-förmige Upgrade-Kadenz — Runite ist das schwächste Lohn-Tier
`meleeDamage` pro benötigtem Attack-Level (sword): copper 10.0 → bronze 3.2 → … sinkt bis **runite 1.30** (md 78 @ atk 60) → steigt wieder bis godiron 1.74. Konkret: Adamantium 72 (atk 50) → Runite 78 (atk 60) = nur **+8 % Schaden für +10 Pflichtlevel**, der kleinste Sprung der Leiter (Faktor 1.08). Monoton, also kein Bug, aber das Runite-Upgrade „fühlt sich tot an".
**Fix:** Runite-`meleeDamage` leicht anheben (~85–88) zum Glätten der Kurve.

### [P3] (NEU/cross-system) `cut_gemstone` — Thieving-Token ohne Senke
Generisches Item „Cut Gemstone" (Wert 180) wird von 3 Thieving-Actions (`crack_strongbox`@55, `pickpocket_noble`@65, `plunder_ashen_treasury`@97) erzeugt, aber von **keinem** Rezept konsumiert. Es ist **kein** Jewelcrafting-Input (JC nutzt die konkreten `garnet`…`godgem`-Cuts) — reiner Verkaufs-Token. Namensnähe kann Spieler in Richtung Jewelcrafting fehlleiten.
**Fix:** Entweder als bewussten Gold-Token belassen (ok) oder in ein JC-Rezept (z. B. Schmuck-Sammelobjekt) einbinden bzw. umbenennen.

### [P3] (CARRY-OVER, abgeschwächt) `gravesteel_bar` bleibt Nur-Jewelcrafting-Material
Geschmolzen @L22, speist ausschließlich Bloodstone-Ring/-Amulett. Kein Smithing-Gear nutzt ihn — konsumiert, also **nicht tot**, aber weiterhin der einzige „Stahl"-Barren ohne Schmiede-Gear. Nur Hinweis (wie run3).

---

## Fazit
Smithing + Jewelcrafting sind nach den Fixes in sehr gutem Zustand: beide run3-P2-Befunde (tote Hölzer, vestigiale Tinten) sind erledigt, der Melee-`meleeDamage`-Buff ist über **alle** Schwert/Axt/Maul-Tiers gleichförmig und ohne Inversion angewandt, alle Leitern (12 Metall / 8 Gem) sind lückenlos, versorgt und monoton. Es verbleiben nur drei kosmetische P3: die unverändert 5-Level-versetzten Smelt-Gates (bloodiron/titanium/aetherium), die U-förmige Upgrade-Kadenz mit schwachem Runite-Tier und der senkenlose Thieving-Token `cut_gemstone`. Keine P0/P1/P2.
