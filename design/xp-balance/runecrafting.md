# XP-Balance-Bericht: Runenkunst / Runecrafting

Skill-ID: `runecrafting` · Analyse-Datum: 2026-07-01 · Autor: Balance-Designer
Quellen: `packages/content/src/index.ts` (Aktionen ~Z.8275–8607, Monster/Dungeon ~Z.9485–11621, Shop ~Z.10940–10967, Foraging ~Z.6855–6894), `packages/engine/src/leveling.ts`, `packages/engine/src/sim.ts`.

> **HARTE REGEL eingehalten:** Dieser Bericht liest nur. Keine Content-/Spielcode-Änderung. Zahlen später mit Chef-Freigabe durch content-dev einpflegen.

---

## 0. Kurz-Zusammenfassung (Note + Top-3-Fixes)

**Note: 3 / 5** (befriedigend mit einem schweren Struktur-Defekt).

Die reinen XP-*Zahlen* sind für Runecrafting mehrheitlich fair bis großzügig und pro Linie monoton — **anders als die generelle Chef-Beschwerde** ("1 XP diabolisch") vermuten lässt, ist Runecrafting per-Stunde NICHT zu stingy: die Tier-Gear-Linien liefern 200–340 % des Zielwerts, die Affix-/Glyphen-/Schriftrollen-Linien treffen den Zielwert punktgenau (~100 %). Das eigentliche "diabolische" Problem ist **NICHT die XP-Höhe, sondern die Input-Verfügbarkeit**: der Skill lässt sich aus dem Stand gar nicht anfangen.

**Top-3-Fixes (Priorität absteigend):**

1. **`dim_essence` früh verfügbar machen (P1, blockiert den kompletten L1–14-Einstieg).** Alle Runecrafting-Aktionen von L1 bis L14 verlangen `dim_essence` oder `frost_essence` — beide sind erst per Kampf ab **L20** (Warband-Dungeon) bzw. **L60** (Rankenhexe) erhältlich. Empfehlung: `dim_essence` in den Shop legen (analog `reed_pale`, cost ~8) **und/oder** eine Foraging-Aktion `forage_dim_essence` (L1) ergänzen. Ohne das ist der beworbene `levelRequired: 1` der Kupfer-Gear-/Kraftrune-Rezepte eine Lüge.
2. **`craft_aether_rune` reparieren (P1, echter Ausreißer + Monotonie-Bruch).** L50-Aktion mit **xp 3** = **23 % des Zielwerts** und *weniger* XP als die L40-`craft_shock_rune` (xp 6). Empfehlung **xp 3 → 13**.
3. **Elementar-Runen-Linie auf Kurve heben (P2).** `craft_shock_rune` xp 6 → 8 (76 %→100 %), `bind_void_rune` xp 21 → 35 (60 %→100 %). Danach ist die Rohreihenfolge force/frost/fire/shock/aether/void wieder monoton.

---

## 1. XP-Kurven-Mechanik (Fundament)

`packages/engine/src/leveling.ts`, Cap **Level 99**:

```
XP_TABLE[n+1] = floor( Σ_{k=1..n} floor(k + 300·2^(k/7)) / 4 )
```

RuneScape-/Melvor-Stil (exponentiell). Ziel-Rate laut Studio-Modell:

```
target_xph(L) = 90 · sqrt( xpForLevel(L+1) − xpForLevel(L) )
ideal_xp(Aktion) = round( target_xph(levelRequired) · durationMs / 3_600_000 ),  min 1
```

Referenz-Zielraten (verifiziert gegen die Tabelle):

| L | xpForLevel(L) | Δ zu L+1 | target_xph |
|---|---|---|---|
| 1 | 0 | 83 | 820 |
| 10 | 1.154 | 204 | 1.285 |
| 20 | 4.470 | 548 | 2.107 |
| 30 | 13.363 | 1.470 | 3.451 |
| 40 | 37.224 | 3.947 | 5.654 |
| 50 | 101.333 | 10.612 | 9.271 |
| 60 | 273.742 | 28.546 | 15.206 |
| 70 | 737.627 | 76.818 | 24.944 |
| 80 | 1.986.068 | 206.750 | 40.923 |
| 90 | 5.346.332 | 556.499 | 67.139 |
| 99 | 13.034.431 | — | ~86.000 |

Zeit pro Level bei exakt 100 % Ziel ≈ `sqrt(Δ)/90` Stunden (L15 ≈ 0,2 h; L50 ≈ 1,1 h; L70 ≈ 3,1 h; L90 ≈ 8,3 h). Die **Kurvenform ist gesund** — kein Skalierungsproblem.

**Baseline-Methodik:** Der Sim (`sim.ts`, `simulateAction`) misst `xpPerHour` durch echtes Ticken mit befüllten Inputs, ohne Werkzeuge/Mastery. Das entspricht exakt `base_xph = xp · 3_600_000 / durationMs`. Werkzeug-/Mastery-Boni kommen später multiplikativ obendrauf — hier bewusst Baseline betrachtet.

---

## 2. Befund: zwei getrennte Reagenzien-Ökonomien

Runecrafting hat faktisch **zwei getrennte Leveling-Pfade** mit völlig unterschiedlicher Qualität:

| Pfad | Aktionen | Reagenz-Quelle | XP vs. Ziel | Verfügbarkeit | Urteil |
|---|---|---|---|---|---|
| **A – Affix/Glyphen/Schriftrollen** | `craft_rune_*_i/ii/iii`, `craft_glyph_*`, `craft_scroll_*` | **Foraging** (`forage_ash_essence` L12, `forage_umber_pods` L18, `forage_sootcaps` L6) + **Farming** (Samen im Shop) + Shop (`reed_pale` cost 8) | **~100 %** (Formel-designt) | ab **L15** organisch | **GESUND** – Referenz-Implementierung |
| **B – Tier-Gear + Elementar-Runen** | `craft_{copper..godiron}_{staff/wand/focus}`, `craft/bind_*_rune`, `enchant_*` | **Kampf-Essenzen** (`dim/ember/frost/storm/aether/void_essence`) | 60–340 % (uneinheitlich) | **dim_essence erst L20** | **DEFEKT** – Input-Wall + Ausreißer |

Pfad A ist sauber an die Zielkurve getuned (siehe §3, Ratio-Spalte durchweg 93–107 %) und über nicht-kampfliche Berufe versorgt. Pfad B ist großzügiger bei den Zahlen, aber durch Kampf-Drops hart gegated — und genau dort sitzt die frühe Progressions-Blockade.

---

## 3. Vollständige Aktions-Tabelle (Baseline vs. Ziel)

Legende: `base` = `xp·3600000/dur` · `tgt` = `target_xph(L)` · `Ratio` = base/tgt · `ideal` = formeltreues xp.
**Empf.** = Empfehlung (Zahl = neuer xp-Wert; „keep" = belassen; „OK" = bereits auf Kurve).

### 3a. `rune_runes` — Elementar-Runen binden  ⚠️ Hauptproblem-Linie

| id | L | dur | xp | base | tgt | Ratio | ideal | Empf. |
|---|---|---|---|---|---|---|---|---|
| craft_force_rune | 1 | 3000 | 1 | 1.200 | 820 | 146 % | 1 | keep (opt. 2 für Optik) |
| craft_frost_rune | 10 | 3000 | 2 | 2.400 | 1.285 | 187 % | 1 | keep |
| craft_fire_rune | 15 | 4000 | 3 | 2.700 | 1.647 | 164 % | 2 | keep |
| **craft_shock_rune** | 40 | 5000 | 6 | 4.320 | 5.654 | **76 %** | 8 | **8** |
| **craft_aether_rune** | 50 | 5000 | 3 | 2.160 | 9.271 | **23 %** ⚠️ | 13 | **13** |
| **bind_void_rune** | 65 | 6500 | 21 | 11.631 | 19.475 | **60 %** | 35 | **35** |

**Monotonie-Bruch:** Roh-xp-Reihe 1 → 2 → 3 → 6 → **3** → 21. Der Rückfall 6 (L40) → 3 (L50) ist der klassische "tote/negative Tier". `craft_aether_rune` ist zugleich der schärfste Baseline-Ausreißer des ganzen Skills (23 %). Nach Empfehlung: 1 → 2 → 3 → 8 → 13 → 35 (monoton, alle ~100–150 % Ziel).

### 3b. `rune_foci` — Fokus-Tiers (12) + Enchant-Foki

| id | L | dur | xp | base | tgt | Ratio | ideal | Empf. |
|---|---|---|---|---|---|---|---|---|
| craft_copper_focus | 1 | 4500 | 3 | 2.400 | 820 | 293 % | 1 | keep¹ |
| craft_bronze_focus | 5 | 6000 | 5 | 3.000 | 1.002 | 299 % | 2 | keep |
| craft_iron_focus | 10 | 5500 | 6 | 3.927 | 1.285 | 306 % | 2 | keep |
| craft_steel_focus | 20 | 9000 | 15 | 6.000 | 2.107 | 285 % | 5 | keep |
| craft_blacksteel_focus | 30 | 11000 | 28 | 9.164 | 3.451 | 266 % | 11 | keep |
| craft_mithril_focus | 40 | 11000 | 36 | 11.782 | 5.654 | 208 % | 17 | keep |
| craft_adamantium_focus | 50 | 13000 | 68 | 18.831 | 9.271 | 203 % | 33 | keep |
| craft_runite_focus | 60 | 14000 | 128 | 32.914 | 15.206 | 216 % | 59 | keep |
| craft_bloodiron_focus | 70 | 15000 | 240 | 57.600 | 24.944 | 231 % | 104 | keep |
| craft_titanium_focus | 80 | 16000 | 555 | 124.875 | 40.923 | 305 % | 182 | keep² |
| craft_aetherium_focus | 90 | 17000 | 870 | 184.235 | 67.139 | 274 % | 317 | keep² |
| craft_godiron_focus | 99 | 19000 | 1690 | 320.211 | ~86.000 | ~321 % | ~450 | keep² |
| enchant_dim_focus | (1) | 5000 | 3 | 2.160 | 820 | 263 % | 1 | levelRequired setzen³ |
| enchant_frost_focus | 25 | 6000 | 6 | 3.600 | 2.697 | 133 % | 4 | keep |
| enchant_aether_orb | 45 | 8000 | 21 | 9.450 | 7.240 | 131 % | 16 | keep |
| enchant_void_focus | 65 | 10000 | 69 | 24.840 | 19.475 | 128 % | 54 | keep |
| enchant_god_focus | 85 | 13000 | 240 | 66.462 | 52.417 | 127 % | 189 | keep |

Roh-xp monoton (3<5<6<15<28<36<68<128<240<555<870<1690). ✓

### 3c. `rune_staves` — Stab-Tiers (12) + Enchant-Stäbe

| id | L | dur | xp | base | tgt | Ratio | Empf. |
|---|---|---|---|---|---|---|---|
| craft_copper_staff | 1 | 6500 | 4 | 2.215 | 820 | 270 % | keep |
| craft_bronze_staff | 5 | 8000 | 7 | 3.150 | 1.002 | 314 % | keep |
| craft_iron_staff | 10 | 9500 | 9 | 3.411 | 1.285 | 265 % | keep |
| craft_steel_staff | 20 | 15000 | 23 | 5.520 | 2.107 | 262 % | keep |
| craft_blacksteel_staff | 30 | 17000 | 42 | 8.894 | 3.451 | 258 % | keep |
| craft_mithril_staff | 40 | 17000 | 54 | 11.435 | 5.654 | 202 % | keep |
| craft_adamantium_staff | 50 | 19000 | 102 | 19.326 | 9.271 | 208 % | keep |
| craft_runite_staff | 60 | 21000 | 192 | 32.914 | 15.206 | 216 % | keep |
| craft_bloodiron_staff | 70 | 23000 | 360 | 56.348 | 24.944 | 226 % | keep |
| craft_titanium_staff | 80 | 25000 | 835 | 120.240 | 40.923 | 294 % | keep² |
| craft_aetherium_staff | 90 | 27000 | 1305 | 174.000 | 67.139 | 259 % | keep² |
| craft_godiron_staff | 95 | 31000 | 2535 | 294.387 | ~86.000 | ~342 % | keep² |
| enchant_frost_scepter | (1) | 8000 | 4 | 1.800 | 820 | 220 % | levelRequired setzen³ |
| enchant_aether_runestaff | 20 | 11000 | 10 | 3.273 | 2.107 | 155 % | levelRequired setzen³ |
| enchant_stormcaller_rod | 50 | 11000 | 36 | 11.782 | 9.271 | 127 % | keep |
| enchant_voidcaller_staff | 70 | 14000 | 125 | 32.143 | 24.944 | 129 % | keep |
| enchant_godspark_staff | 88 | 18000 | 390 | 78.000 | 60.810 | 128 % | keep |

Roh-xp der Tier-Linie monoton. ✓

### 3d. `rune_wands` — Zauberstab-Tiers (12)

| id | L | dur | xp | base | tgt | Ratio | Empf. |
|---|---|---|---|---|---|---|---|
| craft_copper_wand | 1 | 4500 | 3 | 2.400 | 820 | 293 % | keep |
| craft_bronze_wand | 5 | 6000 | 5 | 3.000 | 1.002 | 299 % | keep |
| craft_iron_wand | 10 | 6500 | 6 | 3.323 | 1.285 | 259 % | keep |
| craft_steel_wand | 20 | 9000 | 15 | 6.000 | 2.107 | 285 % | keep |
| craft_blacksteel_wand | 30 | 11000 | 28 | 9.164 | 3.451 | 266 % | keep |
| craft_mithril_wand | 40 | 11000 | 36 | 11.782 | 5.654 | 208 % | keep |
| craft_adamantium_wand | 50 | 13000 | 68 | 18.831 | 9.271 | 203 % | keep |
| craft_runite_wand | 60 | 14000 | 128 | 32.914 | 15.206 | 216 % | keep |
| craft_bloodiron_wand | 70 | 15000 | 240 | 57.600 | 24.944 | 231 % | keep |
| craft_titanium_wand | 80 | 16000 | 555 | 124.875 | 40.923 | 305 % | keep² |
| craft_aetherium_wand | 90 | 17000 | 870 | 184.235 | 67.139 | 274 % | keep² |
| craft_godiron_wand | 97 | 19000 | 1690 | 320.211 | ~86.000 | ~337 % | keep² |

Roh-xp monoton. ✓ (Fokus/Wand teilen dieselbe xp-Kurve — konsistent.)

### 3e. `rune_affixes` / `rune_glyphs` / `rune_scrolls` — Pfad A (Referenz)

Alle 34 Aktionen dieser drei Kategorien liegen bei **93–107 %** des Ziels (Formel-designt, Kommentar Z.8424 nennt die Formel explizit). Roh-xp durchweg monoton mit dem Level. **Kein Handlungsbedarf.** Auszug:

| id | L | dur | xp | base | tgt | Ratio |
|---|---|---|---|---|---|---|
| craft_rune_keen_i | 15 | 7000 | 3 | 1.543 | 1.647 | 94 % |
| craft_rune_arcane_i | 30 | 10000 | 10 | 3.600 | 3.451 | 104 % |
| craft_rune_hunter_ii | 50 | 14000 | 36 | 9.257 | 9.271 | 100 % |
| craft_rune_arcane_iii | 75 | 21000 | 186 | 31.886 | 31.950 | 100 % |
| craft_glyph_of_ruin | 55 | 18000 | 59 | 11.800 | 11.873 | 99 % |
| craft_scroll_of_cataclysm | 75 | 25000 | 222 | 31.968 | 31.950 | 100 % |

¹ Kleine Roh-xp (3) sind hier **korrekt**: `ideal_xp(L1, 4500ms) = 1`. Die Zahl wirkt "diabolisch klein", die *Rate* (2.400 xp/h) ist aber großzügig — der Chef-Reflex "kleine Zahl = zu wenig" trifft bei kurzen Aktionen nicht zu.
² Die L80+-Tiers laufen 260–340 % heiß. Das ist bewusst tolerierbar, weil Tier-Gear **Einmal-Crafts** sind (man baut EINEN Stab, rüstet ihn, fertig — kein Dauergrind) und die reale Rate durch Essenz-Knappheit ohnehin weit unter Baseline liegt. **Nicht kürzen** (würde die "zu brutal"-Beschwerde verschärfen).
³ Siehe §5: `enchant_dim_focus`/`enchant_frost_scepter` haben **kein** `levelRequired` (→ default 1), verlangen aber Essenzen, die erst L20/L60 droppen; `enchant_aether_runestaff` (L20) verlangt `aether_essence` (~L55). Level/Input-Gating invertiert.

---

## 4. Input-Verfügbarkeits-Analyse (der eigentliche "diabolische" Befund)

Der Sim befüllt Inputs künstlich und sieht die Wall daher NICHT — real ist sie hart. Erst-Quelle je Essenz:

| Essenz | Erste Quelle | Effektives Min-Level | Shop? |
|---|---|---|---|
| **dim_essence** | Goblin-Warband-Dungeon (`requiredLevel 20`); `goblin_stormcaller` L28; `goblin_warlock` L30; Thieving `launder_ledger` L30 | **~L20 (Kampf)** | **nein** |
| ember_essence | `goblin_warlock` L30 | ~L30 (Kampf) | nein |
| frost_essence | `bramble_witch` L60 (erste Quelle) | ~L60 (Kampf) | nein |
| storm_essence | `goblin_stormcaller` L28 + Roc-Vögel | ~L28 (Kampf) | nein |
| aether_essence | Highland-Roc ~L55+ | ~L55 (Kampf) | nein |
| void_essence | Endgame | Endgame | nein |
| essence_ash / pigment_umber / reed_pale (Pfad A) | **Foraging** L6/L12/L18 + **Farming**-Samen + **Shop** (`reed_pale` cost 8) | **L1–18, kaufbar** | **ja** |

### Die Kern-Wall

**Jede** Runecrafting-Aktion mit `levelRequired` 1–14 verlangt `dim_essence` oder `frost_essence`:

- L1: `craft_force_rune` (dim×2), `craft_copper_staff/wand/focus` (dim×3), `enchant_dim_focus` (dim×4), `enchant_frost_scepter` (frost — L60!)
- L5: `craft_bronze_staff/wand/focus` (dim×3)
- L10: `craft_frost_rune` (frost — L60!), `craft_iron_staff/wand/focus` (dim×4)

Die erste organisch erreichbare Aktion ohne Kampf-Essenz ist `craft_rune_keen_i` bei **L15** (Pfad A, Foraging-versorgt). Aber um L15 zu erreichen, braucht man L1–14-Aktionen — und die sind **alle** `dim_essence`/`frost_essence`-gated.

> **Konsequenz:** Ein frischer Charakter kann Runecrafting **nicht aus dem Stand starten**. Er muss zuerst Kampf bis ~L20 (Warband-Dungeon) oder Thieving bis L30 (`launder_ledger`) grinden, um an `dim_essence` zu kommen, dann mit Kupfer→Eisen-Gear (großzügige 2–3× Rate) bis L15 hochziehen und erst dann auf den Foraging-versorgten Affix-Pfad wechseln. Das ist die "diabolische frühe Progression" für diesen Skill — **verursacht durch Input-Gating, nicht durch XP-Höhe.**

Der Kontrast ist eindeutig: der Shop führt sogar **Fertig-Reeds** als "Komfort-Fallback" (Z.10955–10958) für Pfad A — aber **keine** `dim_essence` für Pfad B, obwohl dessen Rezepte `levelRequired: 1` bewerben.

---

## 5. Empfehlungen (konkret, monoton, spielskaliert)

### 5a. Input-/Verfügbarkeits-Fixes (P1 — löst die eigentliche Beschwerde)

1. **`dim_essence` früh zugänglich machen.** Eine oder beide Optionen (content-dev):
   - **Shop-Eintrag** `{ itemId: "dim_essence", cost: 8 }` (analog `reed_pale`, item-value 6) — sofortiger Komfort-Fallback wie bei den Reeds.
   - **Foraging-Aktion** `forage_dim_essence` (skill `foraging`, `levelRequired: 1`, dur ~3000, xp ~2, loot `dim_essence` chance ~0.6) — konsistent mit `forage_ash_essence` als non-kampflicher Reagenz-Quelle.
2. **`ember_essence` (fire_rune, L15) und `frost_essence` (frost_rune L10 / steel-Tier L20) früher spiegeln.** Optionale niedrigstufige Foraging-/Shop-Quelle, damit die L10–20-Rezepte ihr beworbenes Level auch einlösen. Mindestens im Bericht an content-dev/combat-dev flaggen.

### 5b. XP-Zahlen-Fixes (P1/P2 — Monotonie + Ausreißer)

| id | aktuell xp | neu xp | Begründung |
|---|---|---|---|
| **craft_aether_rune** | 3 | **13** | 23 %→~140 % Ziel; behebt Monotonie-Bruch (war < shock_rune). P1. |
| **craft_shock_rune** | 6 | **8** | 76 %→~100 % Ziel. P2. |
| **bind_void_rune** | 21 | **35** | 60 %→~100 % Ziel. P2. |
| craft_force_rune | 1 | (opt.) 2 | Nur Optik/„1-XP"-Gefühl; Rate (1.200/h) ist bereits ok. Niedrigste Prio. |

Nach 5b lautet die Elementar-Runen-Roh-xp-Reihe **1 → 2 → 3 → 8 → 13 → 35** (streng monoton).

### 5c. Level/Input-Gating-Korrekturen (P2 — Konsistenz)

| id | Problem | Empfehlung |
|---|---|---|
| enchant_dim_focus | kein `levelRequired` (=1), Input dim_essence×4 | Nach 5a-Fix ok bei L1; sonst redundant zu `craft_copper_focus` → prüfen/entfernen |
| enchant_frost_scepter | kein `levelRequired` (=1), Input frost_essence (L60-Quelle) | `levelRequired: ~25` setzen (passend zu `enchant_frost_focus`) oder als Legacy entfernen |
| enchant_aether_runestaff | `levelRequired 20`, Input aether_essence (~L55-Quelle) | `levelRequired: ~45` (passend zu `enchant_aether_orb`) |

### 5d. Was NICHT ändern

Tier-Gear (staff/wand/focus, alle Tiers) und die höheren Enchant-Rezepte: **belassen.** Sie sind pro Linie monoton und großzügig; die 260–340 %-Spitzen bei L80+ sind als Einmal-Craft-Belohnung vertretbar und werden durch Essenz-Knappheit real gedeckelt. Kürzen würde die Chef-Beschwerde ("zu brutal") verschlimmern. Pfad A (Affix/Glyphen/Schriftrollen) ist bereits exakt auf Kurve — nicht anfassen.

---

## 6. Geordnete Apply-Liste für content-dev (nach Chef-Freigabe)

1. **[P1]** `craft_aether_rune`: `xp: 3 → 13`.
2. **[P1]** `dim_essence`-Frühquelle anlegen: Shop `{ itemId: "dim_essence", cost: 8 }` **und/oder** Foraging-Aktion `forage_dim_essence` (L1, dur 3000, xp 2, loot dim_essence ~0.6).
3. **[P2]** `craft_shock_rune`: `xp: 6 → 8`.
4. **[P2]** `bind_void_rune`: `xp: 21 → 35`.
5. **[P2]** `enchant_frost_scepter`: `levelRequired: 25` ergänzen (oder Rezept prüfen/entfernen).
6. **[P2]** `enchant_aether_runestaff`: `levelRequired: 20 → 45`.
7. **[P3]** (optional) `craft_force_rune`: `xp: 1 → 2` (nur Optik).
8. **[P3]** (mit combat-dev) prüfen, ob `ember_essence`/`frost_essence` eine niedrigstufige Zweitquelle bekommen sollen, damit L10–20-Rezepte einlösbar sind.

---

## 7. Verdikt

**Note 3 / 5.** Die XP-Progression von Runecrafting ist mechanisch solider als die Chef-Beschwerde befürchten lässt: Kurvenform gesund, Affix-/Glyphen-/Schriftrollen-Pfad exakt auf Ziel, Tier-Gear monoton und großzügig. Zwei echte XP-Defekte (`craft_aether_rune` als 23 %-Ausreißer + Monotonie-Bruch; `shock`/`void`-Runen leicht unter Kurve) sind eng umrissen und billig zu fixen. Der **dominante** Mangel ist kein Zahlenproblem, sondern die **Input-Wall**: `dim_essence` (von L1-Rezepten verlangt) existiert erst ab L20-Kampf, wodurch der Skill nicht organisch startbar ist. Das ist die runecrafting-spezifische Ausprägung der "diabolisch"-Beschwerde — und der Fix (frühe `dim_essence`-Quelle) hat den größten Hebel.
