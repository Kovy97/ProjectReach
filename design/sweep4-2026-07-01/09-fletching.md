# Sweep 4 — Fletching (Bogenbau) Deep-Dive & Benotung

**Agent:** Kontrolleur (QA)  **Datum:** 2026-07-01  **Methode:** echter headless `SimPlayer`-Treiber
(temporäres Vitest-Skript `engine/src/fletching-sweep.test.ts`, L1→99 real getrieben, danach gelöscht).
Alle Zahlen unten sind gemessen (deterministisch, seed-basiert), nicht geschätzt.

## NOTE: **B+**
Mechanisch sehr sauber gebaut: streng monotone XP/h-Kurve über die gesamte Level-Linie (0 Regressionen),
kein toter Tier, tiefe Tier-Leiter (12 Tiers × Pfeile+Kurzbogen+Langbogen + 4 Holzschilde + Schäfte +
Sehne + Grobpfeile = 45 Aktionen), Skill-Pet droppt real, Mastery greift, Pfeil↔Ranged-Reqs sauber
verzahnt. Abzüge nur für Reibung: 28 der 45 Aktionen (alle Bögen + Schilde) hängen an `bowstring`, dessen
einziges Material `scarred_hide` **combat-only** ist — die „coole" Fletch-Ausgabe (Bögen) ist also nicht
skiller-zugänglich, während der freischaltbare Pfeil-Pfad langsamer UND materialintensiver ist als der
gate-behaftete Bogen-Pfad. Solide, engagierende Verarbeitungs-Skill; kein Ship-Blocker.

---

## 1) XP/h-Kurve L1→99 — monoton, keine toten Tiers (confirmed)
Basis-XP/h = `xp / (durationMs/1000) · 3600` (Fletching hat KEIN Werkzeug, Mastery=1 bei frisch → Basis ist real).

Best-verfügbare Aktion je Level (die „Level-Linie", Langbögen dominieren durchweg):

| Lvl | Beste Aktion | Basis-XP/h |
|----:|---|---:|
| 1  | fletch_copper_longbow    | 2.700 |
| 5  | fletch_bronze_longbow    | 3.927 |
| 10 | fletch_iron_longbow      | 4.985 |
| 20 | fletch_steel_longbow     | 6.300 |
| 30 | fletch_blacksteel_longbow| 7.754 |
| 40 | fletch_mithril_longbow   | 10.368 |
| 50 | fletch_adamantium_longbow| 16.883 |
| 60 | fletch_runite_longbow    | 27.927 |
| 70 | fletch_bloodiron_longbow | 46.703 |
| 80 | fletch_titanium_longbow  | 97.463 |
| 90 | fletch_aetherium_longbow | 139.200 |
| 92 | fletch_voidwood_pavise   | 142.364 |
| 99 | fletch_godiron_longbow   | 229.585 |

**Monotonie-Regressionen auf der Level-Linie: 0.** Auch jede Einzel-Leiter ist streng steigend:

- Pfeile: 2.400 → 3.600 → 4.114 → 4.500 → 5.040 → 6.000 → 9.771 → 16.200 → 24.800 → 41.684 → 66.857 → **109.500** (godiron). Kein toter Tier.
- Kurzbögen: 2.400 → 3.600 → 4.800 → 5.400 → 6.300 → 8.100 → 13.600 → 23.040 → 39.273 → 83.400 → 120.462 → **202.800**. Kein toter Tier.
- Langbögen: 2.700 → 3.927 → 4.985 → 6.300 → 7.754 → 10.368 → 16.883 → 27.927 → 46.703 → 97.463 → 139.200 → **229.585**. Kein toter Tier.

→ Bestätigt die Sweep-3-Balance-Fixes (iron-Pfeil war 2, jetzt 4; bronze/iron-Kurzbogen 4/6/9;
steel_longbow Dauer-Cliff 11000→8000). Alle halten. **Kein Tier unterbietet seinen Vorgänger.**

Real-Sim-Gegenprobe (1 h echte Ticks, frische Mastery — Mastery-Inflation sichtbar):
`fletch_copper_arrows` base 2.400 → real 2.428 (+1 %); `fletch_runite_arrows` 16.200 → 16.740 (+3 %);
`fletch_godiron_longbow` 229.585 → **258.570** (+13 %, Mastery L59 nach 1 h). Wiring bestätigt: XP fließt,
Items werden erzeugt, Mastery wächst.

## 2) Freischalt-Takt — dicht (confirmed)
Neue Fletch-Aktion auf Level: **1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 63, 70, 80, 90, 92, 95, 99** (17 Stufen).
Größte Lücke = 10 Level (z.B. L30→40). Die Holzschilde (L15/25/63/92) füllen bewusst die frühen
10er-Lücken. Auf keinem Level-Band gibt es einen Leerlauf ohne verfügbare Aktion.

## 3) Werkzeug-/Upgrade-Progression
Fletching hat **kein Werkzeug** (keine „Messer"-Tiers) — Progression läuft rein über Tier-Materialien
(Holzsorten + Pfeilspitzen + Sehne/Feder). Sauber gestaffelt und spürbar (Dauer 2.0 s→26.5 s, XP 1→1690).
Kein Handlungsbedarf; das ist konsistent mit den anderen reinen Verarbeitungs-Skills.

## 4) Drops + Skill-Pet — Quillshrike droppt real (confirmed)
`quillshrike` (source `skill: fletching`, `dropChance 1/115000`, skillEffect `bonusAmmo 0.05`).
- **Echter Tick-Pfad:** 125.578 reale `fletch_shafts`-Abschlüsse über die Engine-Tick-Schleife → Pet
  **gedroppt** (`ownedPets.quillshrike = true`, erwartet 1.09).
- **Direkter Mechanik-Pfad** (`tryPetDrop` × 2.000.000, exakt der Aufruf aus `tick.ts:193`): 16 Drops →
  empirisch **1/125.000** (Content 1/115.000, im Sampling-Rauschen), erster Drop bei Abschluss 184.459.
- `bonusAmmo` ist real verdrahtet (`pets.ts:107` — aggregiert in `petDoubleYieldBonus`), kein totes Feld.
`fletch_shafts` hat zusätzlich keine sinnlosen Bonus-Drops; die Ketten sind schlank.

## 5) Gold/Ökonomie
Keine Fletch-Aktion hat ein `gold`-Feld → **0 Direkt-Gold** (bestätigt: „gold from action=0"). Ökonomie
läuft über den Verkauf der Ausgabe (`sellPrice = value·0.5`):

| Aktion | craft/h | Ausgabe | value | Sell-Gold/h |
|---|---:|---|---:|---:|
| fletch_copper_arrows  | 1.200 | copper_arrow (×15) | 2 | 18.000 |
| fletch_runite_arrows  | 450 | runite_arrow (×15) | 15 | 54.000 |
| fletch_godiron_arrows | 300 | godiron_arrow (×15) | 40 | 90.000 |
| fletch_godiron_longbow| 136 | godiron_longbow | **3.000** | **203.774** |

Pfeil-Verkauf ist netto bescheiden (Inputs kosten via Smithing/Foraging Zeit), kein Exploit. Der
godiron-Langbogen-Verkauf (204k Gold/h) ist hoch, aber L99-Endgame und liegt in der akzeptierten
Endgame-Inflation. Kein Fletch-only Gold-Exploit gefunden. Fletching lohnt sich primär als **Zulieferer**
(eigene Munition/Bögen sparen Shop-Kosten), nicht als Gold-Farm — das ist stimmig.

## 6) Mastery — spürbar, aber unauffällig
Aktions-Mastery gibt Doppelertrag (bis +49 %), Tempo (bis −15 %), Preservation (bis +39 %); dazu die
skillweiten Pool-Checkpoints (5 %/25 %/50 %/95 %). Gemessen als XP/h-Uplift über 1 h frischen Grind:
+1 % (früh) bis **+13 %** (godiron longbow, wo pro Abschluss viel Mastery-XP fließt). Funktioniert, aber
der Frühgame-Uplift (+1–2 %) ist so klein, dass er sich kaum „anfühlt" — das ist ein skillweites
Mastery-Thema (siehe Mastery-Tiefenprüfungs-Agent), kein Fletch-Spezifikum.

## 7) Ranged-Zulieferung — Pfeil↔Ranged-Reqs sauber (confirmed, 1 Mini-Delta)
Fletch-Level == Ranged-Anforderung des erzeugten Pfeils auf **jedem** Metall-Tier (copper 1, bronze 5,
iron 10, steel 20, blacksteel 30, mithril 40, adamantium 50, runite 60, bloodiron 70, titanium 80,
aetherium 90). Perfekte Verzahnung: wer den Pfeil fletchen kann, kann ihn auch schießen. `ammoDamage`
steigt monoton (1→2→3→5→6→7→9→11→14→17→20→**38** godiron). Feather-Zulieferung ist skillbar
(`forage_feathers`, Foraging L5). **Einziges Delta:** `godiron_arrow` ist ab Fletch **L95** herstellbar,
aber erst ab Ranged **99** nutzbar (alle anderen Tiers matchen exakt). Grober Pfeil hat bewusst keine
Ranged-Req (Starter) — kein Fehler.

---

## FINDINGS (schwerste zuerst)

### [P2][balance/feel] Bögen & Holzschilde (28/45 Aktionen) sind combat-gated — der freischaltbare Pfeil-Pfad ist der langsamste & teuerste (suspected, Design-Spannung)
- **Repro:** Alle 12 Kurz- + 12 Langbögen + 4 Holzschilde verlangen `bowstring`. `bowstring` kommt nur aus
  `fletch_bowstring` (Input `scarred_hide`) ODER Monster-Drop (spectral_stag 0.3). `scarred_hide` hat
  **keine** Skilling-Quelle — nur Combat-Drops (bull_boss, thorn_wolf, spectral_stag, frost_hound,
  skeleton_butcher, roc_hunter, tide_siren, wild_stag, dire_wolf, dreadfang).
- **Erwartet:** Der XP-schnellste Pfad (Langbögen) sollte auch ohne Kämpfen erreichbar sein, oder der
  skillbare Pfad (Pfeile) sollte nicht doppelt bestraft sein.
- **Tatsächlich:** Pfeile sind (a) skillbar, aber je Tier ~15–40 % weniger XP/h als der gleich-Tier-Langbogen
  UND (b) brauchen 3 Input-Arten aus 3 Skills (Schaft=Fletching, Spitze=Smithing, Feder=Foraging), während
  Bögen nur Log+Sehne brauchen. Ein reiner Skiller nimmt also den langsamsten, materialintensivsten Weg.
- **Evidence:** `content/src/index.ts` — `fletch_bowstring` (7488, Input scarred_hide), scarred_hide-Loot
  nur in Monster-Block (9664–10749), keine Gather-Aktion. XP/h-Tabellen oben.
- **Owner:** Content-Dev (evtl. eine skillbare `scarred_hide`/`bowstring`-Quelle, z.B. Foraging-„Cure Sinew"
  aus Logs, oder Sehne im Shop günstig). Überlappt mit dem „Reiner Skiller"-Agenten.

### [P3][balance] `godiron_arrow` 4 Level vor Nutzbarkeit herstellbar (suspected)
- **Repro:** `fletch_godiron_arrows` `levelRequired: 95`, aber `godiron_arrow.requirements.ranged: 99`.
- **Erwartet:** Fletch-Level == Ranged-Req (wie bei allen anderen 10 Metall-Tiers).
- **Tatsächlich:** Man fletcht godiron-Pfeile ab 95, kann sie aber erst ab Ranged 99 schießen (und der
  passende godiron-Bogen braucht ohnehin Fletch 99).
- **Fix-Vorschlag (Zahl):** `fletch_godiron_arrows.levelRequired: 95 → 99` (kostenlos, macht die Leiter
  konsistent; der L95→99-Slot ist sonst leer). Evidence: `content/src/index.ts:7697`, `:445`.
- **Owner:** Content-Dev.

### [P3][feel] Holzschilde sind XP-tot als Methode (accepted-nearby)
- **Repro:** Die 4 Holzschilde (willowbark L15 2.618, grimwood L25 4.629, ashfen_buckler L63 20.571,
  voidwood_pavise L92 142.364) sind auf ihrem Level nie die beste XP/h-Wahl (bei L15 schlägt der ab L10
  verfügbare iron_longbow mit 4.985 bereits den willowbark-Schild).
- **Bewertung:** Bewusst als **Item-Filler** für tote Holz-Tiers gebaut (Kommentar „tote Holztiers als
  Offhand-Schilde"), nicht als XP-Methode. Nur melden, falls die Schilde auch als Ausrüstung ungenutzt
  sind — das prüft der Completionist/Item-Agent. Kein Fletch-Bug. Evidence: `content/src/index.ts:7735–7760`.

---

## TOP-3 FINDINGS
1. **[P2]** Bögen+Schilde (28/45 Aktionen) combat-gated via `bowstring`←`scarred_hide` (combat-only); der
   skillbare Pfeil-Pfad ist zugleich der langsamste & materialintensivste. → Content-Dev.
2. **[P3]** `godiron_arrow` ab Fletch 95 herstellbar, aber erst ab Ranged 99 nutzbar (einziger Tier-Bruch
   in der sonst perfekten Fletch==Ranged-Verzahnung). → Content-Dev.
3. **[P3/positiv-nah]** Holzschilde XP-tot als Methode (bewusster Item-Filler, kein Bug) — nur zur Kenntnis.

## TOP-3 VERBESSERUNGEN (Zahlen, Chef-freigegeben)
1. **Skillbare Sehnen-Quelle:** `bowstring` skiller-zugänglich machen — z.B. eine Foraging/Leatherworking-
   Aktion „Cure Plant Sinew" (Input z.B. 3× normal_log/Flachs → 2× bowstring, Fletch/Foraging L1, ~2 XP)
   ODER `scarred_hide` als seltenen Foraging-Drop. Damit werden Bögen (der schnellste XP-Pfad) ohne
   Kämpfen erreichbar; behebt Finding #1.
2. **`fletch_godiron_arrows.levelRequired: 95 → 99`** — schließt das 4-Level-Nutzbarkeitsloch, macht die
   Pfeil-Leiter konsistent zur Bogen-Leiter (godiron-Bögen sind ohnehin L99).
3. **Optionaler früher Mastery-Feel:** Der Frühgame-Mastery-Uplift (+1–2 %/h) ist kaum spürbar. Ein
   kleiner sichtbarer erster Pool-Checkpoint (existiert bei 5 %: +3 % Doppelertrag) früher erlebbar machen
   — skillweites Thema, an den Mastery-Agenten weiterreichen.

---

### Prüfsummen (was bestätigt wurde, nicht neu gemeldet)
- Balance-Parität / keine toten Fletch-Tiers L1–99: **0 Regressionen** (Sweep-3-Fixes halten). ✅
- Skill-Pet `quillshrike` dropbar über echten Pfad + `bonusAmmo` verdrahtet. ✅
- Pfeil-Ranged-Reqs (fletchL == rangedReq) auf allen Metall-Tiers. ✅
- Feather-Zulieferung skillbar (`forage_feathers` Foraging L5). ✅
- Fletching-Achievement-Leiter (L10…99) + craft_items-Quests (copper/iron/steel/mithril/runite arrow)
  sind alle über den skillbaren Pfeil-Pfad erfüllbar. ✅
