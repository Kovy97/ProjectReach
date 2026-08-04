# Elite-/World-Spawns „Champions des Reach" — Balance- & Content-Spezifikation (Phase 2)

*balance-designer, 2026-07-22. Bau-Vorlage für content-dev — Zahlen 1:1 anwendbar. Grundlage: `design/elite-spawns-concept.md` (Chef-Entscheidungen §5), `content.monsters`/`content.zones` (packages/content/src/index.ts), `MonsterDef` (shared/src/index.ts:2935), Effekt-Palette (shared:466–628), Kampfformeln (engine/combat.ts: `contestHitChance = acc/(acc+eva)`, Mitigation `def/(def+125)` Cap 0,8, Acc-Surcharge `+0,35·(L−150)`), Threat-Spec (`design/monster-threat-spec.md`).*

---

## 0) Methode der Plausibilitätsrechnung (gilt für alle Tabellen)

Statt Sim: relative Verankerung am **Zonen-Boss** (dem stärksten frei farmbaren Mob der Zone). Wer die Zone regulär farmt, tötet ihren Boss komfortabel — der Elite darf teurer sein, aber im Verhältnis:

- **EHP\*** = `(maxHp + wardCapacity) / (1 − def/(def+125))` — effektive HP aus Spieler-Sicht.
- **TTK-Ziel:** Elite-EHP\* = **1,5–3× Boss-EHP\*** in Skill-Band-Zonen (≤L99, Boss-TTK dort ~30–60 s → Elite 1–3 min) bzw. **0,9–1,4×** in Gear-Band-Zonen (L100+, deren Bosse sind schon Chase-Kills mit 1–3 min TTK).
- **DPS-in-Guard:** Elite-`dmg/int` ≤ **~1,35× Boss-`dmg/int`** (nicht enraged). Wer den Boss tanken kann, überlebt dann auch den Elite — kein Undergeared-Wall-Ersatz.
- **Accuracy/Evasion/Defense/Intervall: unverändert** vom Basis-Mob (Identitäts-Achsen, Threat-Spec §3 Regel 3), außer wo der Modifikator es explizit ändert. Die Acc-Schärfe ab L150 liefert der Engine-Surcharge über das (leicht erhöhte) Elite-Level automatisch.
- **Ward zählt als HP** (Threat-Spec §3 Regel 2): bei Caster-Basen skaliert der HP-Multiplikator maxHp UND wardCapacity gemeinsam — darum liegen Caster-Multiplikatoren unter 4–6×.

Elite-Formel je Variante (Synthese nach `paragonScaledMonster`-Muster):
`level = base + ~10 %` (gerundet) · `maxHp/wardCapacity × M_hp` · `damage × M_dmg` · Rest vererbt, plus Modifikator-Overrides aus der Tabelle. `xp = round(base.xp × M_hp × 1,25)` (einmalig pro Spawn, kein Farm-Loop möglich). `resist`/`family`/`defenseType`/`inflict` werden vererbt; `inflict.magnitude`-Anhebungen stehen explizit in der Tabelle.

---

## 1) Elite-Varianten je Zone (28 Varianten)

Spalten: Basis → Multiplikatoren → resultierende Absolutwerte → Validierung (EHP\*-Faktor vs Zonen-Boss / DPS-in-Faktor).

### 1.1 The Pastures (Anker: bull_boss, EHP\* 72, DPS-in 2,19)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_pastures_boar | boar (L10) | Rustbristle the Famished / Rostborste der Ausgehungerte | Ausgehungert (Schadens-Brecher) | 5,0 | 1,6 | L11→**14**, hp **115**, dmg **8**, Rest wie Basis | 1,7× / 1,22 ✓ |
| elite_pastures_imp | the_imp (L11) | Embergrin the Unbidden / Glutgrinser der Ungebetene | Verhext (Ward + Brand) | 5,0 | 1,35 | L**15**, hp **130**, ward **40**, dmg **8**; NEU: inflict burn 0,25×1/4000 | 2,5× / 1,26 ✓ |
| elite_pastures_bull | bull_boss (L15) | Blackhoof the Baleful / Schwarzhuf der Unheilvolle | Rasend (Marquee, enrage vererbt) | 3,0 | 1,4 | L**18**, hp **201**, dmg **10**, enrage 0,4/1,6 vererbt | 3,0× / 1,43 (Marquee, s. §7-Hinweis) |

### 1.2 The Borderlands (Anker: goblin_warlock, EHP\* 79, DPS-in 4,06)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_border_rogue | goblin_rogue (L19) | Vex the Throatfinder / Vex der Kehlenfinder | Flink (evasion 6→**12**) | 5,0 | 1,5 | L**21**, hp **90**, dmg **12** | ~1,5× / 1,14 ✓ |
| elite_border_butcher | goblin_butcher (L26) | Gorehook the Flayer / Bluthaken der Schinder | Gepanzert (defense 20→**30**) | 5,0 | 1,5 | L**29**, hp **195**, dmg **17** | 3,1× / 1,16 ✓ |
| elite_border_warlock | goblin_warlock (L30) | Vhazrak the Ashtongue / Vhazrak Aschenzunge | Fel-Brand (inflict burn mag 1→**2**) | 4,0 | 1,3 | L**33**, hp **208**, ward **64**, dmg **17** | 4,0× / 1,31 (Endzonen-Marquee) |

### 1.3 The Ashfields (Anker: ash_tyrant, EHP\* 139, DPS-in 6,67)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_ash_vulture | dust_vulture (L34) | Carrionwind the Patient / Aaswind der Geduldige | Flink (evasion 9→**14**) | 5,0 | 1,5 | L**37**, hp **180**, dmg **20** | ~1,7× / 1,00 ✓ |
| elite_ash_crawler | mire_crawler (L38) | Mireclutch the Venomous / Moorgriff der Giftige | Giftig (inflict poison mag 1→**2**) | 5,0 | 1,5 | L**42**, hp **235**, dmg **21** | 2,0× / 0,98 ✓ |
| elite_ash_beetle | pitch_beetle (L42) | Cinderhusk the Unbowed / Glutpanzer der Ungebeugte | Gepanzert (defense 30→**45**) | 4,0 | 1,2 | L**46**, hp **268**, dmg **28** | 2,6× / 1,24 ✓ |

### 1.4 The Blackthorn Wood (Anker: forest_warden, EHP\* 302, DPS-in 10,0)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_black_wolf | thorn_wolf (L54) | Briarfang the Sleepless / Dornfang der Schlaflose | Flink (evasion 14→**18**) | 5,0 | 1,4 | L**59**, hp **335**, dmg **35** | 1,4× / 1,25 ✓ |
| elite_black_golem | moss_golem (L56) | Oldgrowth the Unrooted / Altwuchs der Entwurzelte | Gepanzert + Zäh (defense 40→**55**, regen 0,3→**0,6**) | 4,0 | 1,4 | L**62**, hp **360**, dmg **52** | 1,7× / 1,30 ✓ |
| elite_black_witch | bramble_witch (L60) | Mother Bramble / Mutter Dorn | Giftig (inflict poison mag 1→**2**) | 3,5 | 1,35 | L**66**, hp **298**, ward **91**, dmg **42** | 1,6× / 1,31 ✓ |

### 1.5 The Crypt (Anker: skeleton_nekro, EHP\* 540, DPS-in 14,1)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_crypt_butcher | skeleton_butcher (L75) | Marrowcleave the Starving / Markspalter der Darbende | Ausgehungert (inflict bleed mag 1→**2**) | 4,0 | 1,4 | L**82**, hp **568**, dmg **60** | 1,6× / 1,18 ✓ |
| elite_crypt_icemage | skeleton_icemage (L80) | Hoargrim the Lightless / Raugram der Lichtlose | Frostritus (Caster: M_hp auf hp UND ward) | 3,0 | 1,4 | L**88**, hp **483**, ward **144**, dmg **53** | 1,5× / 1,25 ✓ |
| elite_crypt_pyroclasp | skeleton_pyroclasp (L85) | Ossuar the Pyrebound / Ossuar der Glutgebundene | Pyre (inflict burn mag 1→**2**) | 3,0 | 1,3 | L**93**, hp **552**, ward **165**, dmg **53** | 1,9× / 1,25 ✓ |

### 1.6 Wildwood Hunting Grounds (Anker: dire_wolf, EHP\* 663, DPS-in 24,0)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_wild_wolf | gray_wolf (L97) | Greytooth the Famished / Grauzahn der Ausgehungerte | Ausgehungert (inflict bleed mag 1→**2**) | **8,0** | 1,6 | L**107**, hp **416**, dmg **74**, int 2500 | 0,9× / 1,23 ✓ (M_hp-Abweichung s. §7) |
| elite_wild_stag | wild_stag (L104) | Blackantler the Wrathful / Schwarzgeweih der Zornige | Urwild-Alpha | 3,5 | 1,4 | L**114**, hp **956**, dmg **76** | 2,0× / 1,13 ✓ |

### 1.7 Tidewater Shoals (Anker: deep_kraken, EHP\* 1310, DPS-in 26,3)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_coast_crab | mud_crab (L120) | Shellfather the Unbroken / Schalenvater der Ungebrochene | Gepanzert (defense 60→**75**) | 5,0 | 1,5 | L**132**, hp **1140**, dmg **80** | 1,4× / 0,95 ✓ |
| elite_coast_drowned | reef_drowned (L128) | Saltgrave the Returned / Salzgrab der Wiedergekehrte | Untot-Zäh | 4,0 | 1,5 | L**141**, hp **1020**, dmg **84** | 1,2× / 1,06 ✓ |
| elite_coast_siren | tide_siren (L138) | Lorelith of the Drowned Choir / Lorelith vom Ertrunkenen Chor | Chor (Caster; regen 0,3→**0,6**) | 2,5 | 1,35 | L**152**, hp **843**, ward **255**, dmg **93** | 1,3× / 1,26 ✓ |

### 1.8 Slag Pit & Frost Caverns (Anker: charred_doomknight, EHP\* 3233, DPS-in 33,8)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_slag_ember | ember_elemental (L168) | Furnaceheart the Undying / Ofenherz der Unsterbliche | Glut (Caster) | 4,0 | 1,4 | L**185**, hp **1368**, ward **408**, dmg **105** | 0,9× / 1,03 ✓ |
| elite_slag_revenant | iron_revenant (L175) | Morvane the Reforged / Morvane der Neugeschmiedete | Zäh (regen 0,4→**0,8**) | 3,0 | 1,3 | L**193**, hp **2202**, dmg **118** | 1,2× / 1,03 ✓ |
| elite_slag_hexer | frost_hexer (L188) | Skalva the Rimebound / Skalva die Frostgebundene | Frost (Caster) | 2,5 | 1,3 | L**207**, hp **1690**, ward **510**, dmg **131** | 1,2× / 1,21 ✓ |

### 1.9 The Highlands (Anker: void_titan, EHP\* 6458, DPS-in 49,1)

| id | Basis | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_high_roc | roc_hunter (L208) | Stormcrown the Skyfather / Himmelsvater Sturmkrone | Sturm (evasion 80 vererbt) | 3,5 | 1,4 | L**229**, hp **4071**, dmg **164** | 1,2× / 1,29 ✓ (real zäher wg. eva) |
| elite_high_specter | gravecliff_specter (L237) | Palemourn the Cliffwarden / Bleichgram der Klippenwächter | Klage (Caster, Riesen-Ward) | 2,0 | 1,15 | L**261**, hp **1630**, ward **1852**, dmg **167** | 1,1× / 1,31 ✓ |
| elite_high_wyvern | highland_wyvern (L228) | Vessk the Ridgetyrant / Vessk der Grattyrann | Tyrann (Boss-Basis; **enrage-Override damageMult 1,6→1,35**) | 2,0 | 1,15 | L**251**, hp **4506**, dmg **163** | 1,3× / 1,33 ✓ |

### 1.10 The Idol Hall — SONDERFALL (alle Zonen-Mobs sind dungeonOnly, s. §7 P1)

Templates: idol_warden / aether_wraith (NICHT last_idol/drazhan — Story-Bosse bleiben exklusiv). Anker: last_idol (EHP\* 12 582, DPS-in 61,6) — Elites bewusst DARUNTER.

| id | Basis(-Template) | Name EN / DE | Thema | M_hp | M_dmg | Elite-Werte | Valid. |
|---|---|---|---|---|---|---|---|
| elite_idol_warden | idol_warden (L245) | The Ninth Warden / Der Neunte Wächter | Götzen-Erwacht | 2,2 | 1,3 | L**270**, hp **4281**, dmg **200** | 0,7× / 0,95 ✓ |
| elite_idol_wraith | aether_wraith (L260) | Hollowveil the Forgotten / Hohlschleier der Vergessene | Schleier (Caster) | 2,0 | 1,25 | L**286**, hp **1488**, ward **3308**, dmg **216** | 0,8× / 1,17 ✓ |

---

## 2) Stärke-Ziel — Validierungs-Ergebnis (Kurzfassung)

Die Chef-Richtwerte ~4–6× HP / ~1,5× Schaden gelten **unverändert nur für Trash-Basen im Skill-Band (≤L99)**. Vier systematische Korrekturen (alle in §1 bereits eingepreist):

1. **Caster-Basen (ward > 0): M_hp 2,5–3,5×**, auf hp UND ward gemeinsam. Ward zählt als HP — 5× auf icemage/siren/hexer/specter hätte Elites von 2–3× Zonen-Boss-EHP\* erzeugt (TTK 4–6 min, Wall).
2. **Gear-Band-Zonen (coast+): M_hp 2–4×.** Die Basen sind seit dem Threat-Spec-Re-Tuning selbst elite-/boss-klassig; 4–6× hätte World-Elites ÜBER den jeweiligen Zonen-Boss ×1,7 gehoben.
3. **M_dmg 1,5× nur für mittlere Basen.** Für Top-Hitter der Zone (beetle, warlock, witch, pyroclasp, siren, revenant, hexer, specter, wyvern, wraith) **1,15–1,35×**, sonst reißt der DPS-in-Guard (≤1,35× Boss). Beim Wyvern zusätzlich **enrage-Override 1,6→1,35** (sonst enraged 261 dmg @2,5 s = Insta-Kill-Spike).
4. **Magere Schnell-Mobs brauchen mehr als 6×:** gray_wolf (52 hp) erreicht erst mit **8×** Boss-Gefühl. Absolut-Ziel (EHP\* vs Anker) schlägt den Multiplikator — der Multiplikator ist Mittel, nicht Zweck.

---

## 3) Spawn-Timing

Alle Werte in Minuten **aktiver Spielzeit** (Online-Feature, Chef §5.1). Cooldown je Zone: uniform aus [min, max] über `eliteRng`. **Fenster: 15 min in allen Zonen** (endet früher bei Kill).

| Zone | Cooldown [min] | Initial-Offset (Neu-Save/Migration) |
|---|---|---|
| pastures | 55–75 | **15–25** (= Früh-Haken, s.u.) |
| borderlands | 60–85 | +8 |
| ashfields | 65–90 | +16 |
| blackthorn | 70–95 | +24 |
| crypt | 75–100 | +32 |
| wildwood | 80–105 | +40 |
| coast | 85–110 | +48 |
| slagpit | 90–115 | +56 |
| highlands | 95–120 | +64 |
| idolhall | 100–120 | +72 |

**Initialisierung:** Erster Timer je Zone = `15 + Offset_Zone + eliteRng·10` min (statt eines vollen Cooldown-Rolls). Damit verteilen sich die ersten natürlichen Spawns über ~15–100 min und die Rotation startet entzerrt; danach normale Rolls.

**Rechnung Rotation (Volllast, alle 10 Zonen offen, Fenster läuft immer voll ab — Worst Case AFK):** Duty-Cycle je Zone = `15/(⌀CD+15)` = 0,12–0,19; Erwartungswert gleichzeitig aktiver Elites ≈ **1,4**. Real endet das Fenster beim Kill nach 1–3 min — für aktiv jagende Spieler liegt die sichtbare Gleichzeitigkeit bei **0–1, gelegentlich 2** (Konzept-Ziel getroffen). Mittelspiel (4–5 Zonen offen): Erwartung ~0,6 — meist genau eine Jagd „irgendwo".

**Neulings-Gefühl / Startzone:** Mit nur Pastures offen käme der erste Elite bei normalem Roll erst nach ~55–75 min — außerhalb des Refund-Fensters oft die ganze erste Session. **Empfehlung: GO für den Früh-Haken (Konzept §1.4)** — der Initial-Offset der Pastures (15–25 min) IST der Früh-Haken, kein Extra-Mechanismus nötig. Danach Regel-Cooldown 55–75 min: bei einer typischen 1–2-h-Session sieht der Neuling 1–2 Elites, das fühlt sich „selten aber real" an statt „existiert nicht".

**Varianten-Wahl beim Spawn:** gleichverteilt über die Zonen-Varianten (`eliteRng`). Optional später: Marquee-Variante (jeweils letzte Zeile je Zone in §1) auf halbes Gewicht — nicht MVP.

---

## 4) Unique-Items (28 — je Variante genau eines, garantierter Drop)

Regeln für ALLE Uniques: Drop als **ItemInstance mit garantiertem Suffix** (`suffixChance: 1.0`, ilvl = Elite-Level). Stats nach **Rare-Drop-Philosophie**: Kampfwerte des NÄCHSTEN Zonen-Tiers bei Requirements des aktuellen. Tier-Anker aus dem realen Content (Waffen: copper5→bronze5→iron10→steel20→blacksteel30→mithril40→adamantium50→runite60→bloodiron70→titanium80→aetherium90→godiron99; Stoff-wc und Leder-evr analog). **Effekt-Familien: alle vorhanden** (StatusType-Procs + SpecialEffectType shared:532 + EquipBonus-Passiva) — genau **1 Effekt braucht einen neuen combat-dev-Hook** (markiert NEU, mit Fallback).

| # | id | Slot | Name EN / DE | Stats (verbatim) | Req | Rarity | Effekt (Familie) |
|---|---|---|---|---|---|---|---|
| 1 | hungerfang_tusk | mainhand melee | Hungerfang / Hunger-Reißzahn | dmg 1,7–2,5, int 2400 (Steel-Dolch-Niveau) | attack 8 | rare | healOnKill 1 HP (vorhanden) |
| 2 | impbone_wand | mainhand magic | Impbone Wand / Impknochen-Stab | dmg 1,3–1,6, int 2700 (Steel-Wand) | magic 8 | rare | manaOnKill 2 (vorhanden) |
| 3 | blackhoof_charm | amulet | Blackhoof Talisman / Schwarzhuf-Talisman | mods str3 con3 lck3, sb power2 | — | superRare | vengeance 0,25 (vorhanden) |
| 4 | quietstep_boots | boots (Leder) | Quietstep Boots / Leisetritt-Stiefel | evr 8,7 (Duskhide-Tier) | ranged 12 | rare | firstStrike 1,0 (vorhanden) |
| 5 | flayers_hook | mainhand melee | Flayer's Hook / Schinderhaken | dmg 2,9–5,4, int 2900 (Blacksteel-Schwert) | attack 15 | rare | bleed 0,3×2/5000 |
| 6 | ashtongue_fetish | offhand magic | Ashtongue Fetish / Aschenzungen-Fetisch | bonus magicDamage 0,8 · maxMana 10 · manaRegen 0,3 | magic 18 | superRare | catalyst +1500 ms (vorhanden) |
| 7 | carrion_talisman | amulet | Ashlung Talisman / Aschelunge-Talisman | mods con3 int3 wis4, sb magic2 | — | superRare | catalyst +2500 ms („dein Brand hält länger", vorhanden) |
| 8 | mireclutch_fang | mainhand melee | Mireclutch Fang / Moorgriff-Fangzahn | dmg 2,6–4,0, int 2400 (Mithril-Dolch) | attack 26 | superRare | plaguebearer mag2/5000 (vorhanden) |
| 9 | cinderhusk_bulwark | offhand Schild | Cinderhusk Bulwark / Glutpanzer-Bollwerk | ar 11,5, block 0,28 (Gravewarden-Tier) | defence 16 | superRare | thorns 2,5 flat (vorhanden) |
| 10 | briarfang_blade | mainhand melee | Briarfang / Dornfang | dmg 4,4–8,2, int 2900 (Adamantium-Schwert) | attack 42 | superRare | bleed 0,3×4/5000 |
| 11 | oldgrowth_plate | body (Platte) | Oldgrowth Plate / Altwuchs-Panzer | ar 24,8 (über moss_plate 23,46, unter slagcarapace 26,15) | defence 40 | superRare | Passiv: bonus hpRegenPerSec 0,05 (vorhanden) |
| 12 | thorncrown | helmet (Stoff) | Thorncrown / Dornenkrone | wc 48 (Duskweave-Tier) | magic 45 | superRare | thorns 4 flat (vorhanden) |
| 13 | marrowcleaver | mainhand melee 2H | Marrowcleaver / Markspalter | dmg 20–37, int 3450 (Titanium-Greataxe-Niveau) | attack 62 | epic | execute 0,25 / threshold 0,2 (vorhanden) |
| 14 | hoargrim_scepter | mainhand magic | Hoargrim Scepter / Raugram-Szepter | dmg 4,0–5,2, int 2640 (Bloodiron-Wand) | magic 58 | superRare | frostbite 0,25 (vorhanden) |
| 15 | pyrebound_vestment | body (Stoff) | Pyrebound Vestment / Glutgebundene Robe | wc 101 (Runewoven-Tier) | magic 58 | epic | gutter 0,5 (+50 % eigene DoT-Ticks, vorhanden) |
| 16 | greytooth_mantle | cape | Greytooth Mantle / Grauzahn-Mantel | bonus lifesteal 0,03 · maxHp 6 | — | epic | Passiv: Lifesteal (EquipBonus, vorhanden). *Stretch-Option NEU s. §5* |
| 17 | blackantler_warbow | mainhand ranged 2H | Blackantler Warbow / Schwarzgeweih-Kriegsbogen | dmg 9,6–14,7, int 3000 (Aetherium-Longbow) | ranged 82 | epic | cooldownOnKill 2000 ms (vorhanden) |
| 18 | saltgrave_cutlass | mainhand melee | Saltgrave Cutlass / Salzgrab-Entermesser | dmg 13,6–25,2, int 2900 (Godiron-Schwert) | attack 90 | epic | bleed 0,35×5/6000 |
| 19 | tideterror_grip | gloves (Stoff) | Grip of the Tideterror / Griff des Gezeitenschreckens | wc 90 (Voidweave-Tier) | magic 88 | epic | manaDrain 1,5 je Treffer (vorhanden) |
| 20 | shellfather_aegis | offhand Schild | Shellfather Aegis / Schalenvater-Schild | ar 16,5, block 0,40 (über revenant_greatshield) | defence 55 | epic | thorns 6 flat (vorhanden) |
| 21 | furnaceheart_core | offhand magic | Furnaceheart Core / Ofenherz-Kern | bonus magicDamage 2,2 · maxMana 25 · manaRegen 0,8 | magic 90 | epic | surplus 0,2 / threshold 0,8 (vorhanden) |
| 22 | morvane_warplate | body (Platte) | Morvane's Warplate / Morvanes Kriegsplatte | ar 27,5 (über slagcarapace, unter Idol-Band) | defence 62 | epic | vengeance 0,4 (vorhanden) |
| 23 | rimebound_leggings | legs (Stoff) | Rimebound Leggings / Frostgebundene Beinlinge | wc 140,8 (Voidweave-Skirt-Niveau) | magic 92 | epic | frost 0,3×1/4000 (Gear-Proc) |
| 24 | skyfather_recurve | mainhand ranged | Skyfather Recurve / Himmelsvater-Recurvebogen | dmg 13,5–18,5, int 2650 (über Godiron-Shortbow) | ranged 92 | legendary | shock 0,3×0,3/4000 |
| 25 | palemourn_shroud | cape | Palemourn Shroud / Bleichgram-Schleier | bonus maxMana 20 · manaRegen 0,5 · maxHp 8 | — | legendary | antiRegen (vorhanden) |
| 26 | ridgetyrant_greaves | legs (Leder) | Ridgetyrant Greaves / Grattyrann-Beinschienen | evr 31 (über voidhide_legs 29,7) | defence 80 + ranged 72 | legendary | desperation 0,3 / threshold 0,3 (vorhanden) |
| 27 | ninth_wardens_signet | ring1 | Signet of the Ninth Warden / Siegel des Neunten Wächters | mods str4 con4 int3 lck5, sb defence4, bonus hpRegenPerSec 0,12 | — | legendary | bane 0,25 targetFamily construct (vorhanden) |
| 28 | hollowveil_locket | amulet | Hollowveil Locket / Hohlschleier-Medaillon | mods con5 int6 wis6 lck6, sb magic5 | — | legendary | **NEU: Ward-Siphon** — 8 % des verursachten Schadens füllen den eigenen Ward-Pool. Fallback ohne Hook: manaDrain 2 (vorhanden) |

Werte-Feld (`value`) je Item, aufsteigend mit Band: #1–3: 350/300/900 · #4–6: 650/700/900 · #7–9: 1500/1400/1600 · #10–12: 2600/2800/2800 · #13–15: 4200/4000/4200 · #16–17: 5500/6500 · #18–20: 8000/8500/8000 · #21–23: 11000/12000/12000 · #24–26: 16000/15000/16000 · #27–28: 30000/32000.

---

## 5) Neue combat-dev-Hooks (sparsam)

| Hook | Träger | Aufwand | Empfehlung |
|---|---|---|---|
| **Ward-Siphon** (Anteil des verursachten Schadens → eigener Ward-Pool) | hollowveil_locket (#28) | 1 Hook im Spieler-Schadens-Pfad, analog Lifesteal, Cap wie maxWard | **Bauen** — einziges echtes NEU-Feature, krönt die letzte Zone; passt in die Stoff-/Ward-Trinity-Identität |
| Schwellen-Lifesteal (Lifesteal ×2 vs Ziele < 35 % HP) | greytooth_mantle (#16, Stretch) | 1 Bedingung im Lifesteal-Pfad | **Nicht MVP** — Passiv-Lifesteal 0,03 trägt das Item auch allein; Hook nur, falls combat-dev ohnehin im Pfad arbeitet |

Alle übrigen 27 Effekte sind reine Content-Daten auf bestehenden Familien (kein Engine-Aufwand).

---

## 6) Loot-Paket je Elite (neben dem garantierten Unique)

Elite-Loot-Tabelle = **4 Bausteine**, mechanisch je Variante:

1. **Unique:** `{ itemId: <§4>, chance: 1.0, suffixChance: 1.0 }` (ilvl = Elite-Level).
2. **Chase-Boost:** alle Chase-Rows des **Basis-Mobs** (chance ≤ 0,05) übernehmen mit **chance ×25, Cap 0,03**; die Zonen-Top-Row (epic/legendary, z. B. ash_tyrant_crown, nekro_reaperblade, doomknight_cinderblade, voidwing_greatbow) mit **×25, Cap 0,008**. Beispiel elite_ash_beetle: chitin_bulwark 0,025→0,03 · cinder_spike 0,001→0,025 · chitin_helm 0,001→0,025 · sootscale_greaves 0,001→0,025.
3. **Mats-Bonus:** alle Nicht-Chase-Rows des Basis-Mobs (chance > 0,05) unverändert in der Chance, aber **min/max ×3**.
4. **Gold-Bounty** (`gold`-Feld des Elite, mit Standard-Streuung) + **XP** nach §0-Formel:

| Zone | Gold | XP je Variante (aus §1) |
|---|---|---|
| pastures | 50 | 125 / 150 / 285 |
| borderlands | 150 | 240 / 350 / 360 |
| ashfields | 300 | 475 / 625 / 660 |
| blackthorn | 500 | 1225 / 1150 / 1225 |
| crypt | 800 | 1820 / 1875 / 2535 |
| wildwood | 1000 | 3020 / 1840 |
| coast | 1500 | 1675 / 1950 / 1810 |
| slagpit | 2500 | 4000 / 3750 / 4470 |
| highlands | 4000 | 11290 / 19500 / 14130 |
| idolhall | 6000 | 15130 / 22500 |

Ökonomie-Guard: Bounty ≤ ~1 Dungeon-Clear des Bandes (goblin_warband 600 / crypt 1200 / throne 8000) und maximal ~1×/h erreichbar → kein Farm-Loop, aber ein spürbarer „Kopfgeld"-Moment. **Achtung Chef-Entscheid „kein Monster-Gold":** normale Monster tragen `gold: 0`; die Bounty ist eine bewusste, spawn-limitierte Ausnahme → braucht explizites GO (§7 P2). Champion-Essenz bleibt geparkt (Konzept §3.3) — die Loot-Tabellen sind additiv erweiterbar.

---

## 7) Offene Punkte / Risiken für den CEO

- **P1 — Idol Hall (Blocker für §1.10):** ALLE Zonen-Monster der Idol-Halle sind `dungeonOnly` — die Vorgabe „keine dungeonOnly-Basis-Mobs" ist dort unerfüllbar. Empfehlung: Ausnahme genehmigen — Elites sind synthetisch und starten nie über `startCombat` der Basis-Id, das dungeonOnly-Gate der Templates greift also nicht; idol_warden/aether_wraith dienen nur als Stat-Vorlage (last_idol/drazhan bleiben tabu). Alternative: idolhall aus der Rotation nehmen (dann 26 Varianten). |
- **P2 — Gold-Bounty vs „kein Monster-Gold"** (§6): GO/NO. Bei NO: Bounty ersatzlos streichen, Mats-Bonus auf ×4 anheben.
- **P3 — Früh-Haken:** GO empfohlen; per Initial-Offset der Pastures bereits in §3 integriert, kein Extra-Code.
- **P4 — Enrage-Vererbung:** Bei Boss-Basen (bull_boss, highland_wyvern) wird `enrage` vererbt; nur beim Wyvern ist ein Override nötig (§1.9). Regel für die Engine: Elite-Synthese MUSS `enrage.damageMult`-Overrides aus der Varianten-Def erlauben.
- Marquee-Varianten (bull, warlock, wyvern) liegen bewusst bei DPS-in 1,3–1,43× — hart, aber im Rahmen, weil kurz (TTK 1–3 min) und optional. Wer die Zone gerade erst betreten hat, soll den Elite AUSLASSEN können (Fenster verfällt, kein Malus).

## 8) Namens-/Titel-Pools (Reserven für spätere Rotation)

Primäre Namen = §1 (je Zone die 2–3 gebauten Varianten). Reserven (gleiche Basis, nur Name/Titel tauschbar, KEINE neuen Stats): pastures: „Palehide the Blighted / Bleichhaut der Verdorbene" · borderlands: „Grulk the Ironbellied / Grulk der Eisenbauch" · ashfields: „Smokeeye the Circling / Rauchauge der Kreisende" · blackthorn: „Rotroot the Silent / Faulwurz der Stille" · crypt: „Vessel of the Choir / Gefäß des Chors" · wildwood: „Longstride the Pale / Langschritt der Bleiche" · coast: „Brinemaw the Hollow / Solmaul der Hohle" · slagpit: „Cindrik the Ashcrowned / Cindrik der Aschgekrönte" · highlands: „Skarnfeather the Watcher / Skarnfeder der Wächter" · idolhall: „The Unnumbered Warden / Der Ungezählte Wächter". Ton-Regel eingehalten: dark fantasy, keine Comedy, max. 1 Gedankenstrich je Text (hier: keiner).

## 9) Apply-Liste für content-dev (Reihenfolge)

1. 28 Unique-ItemDefs (§4, inkl. value/rarity/Effekt-Feldern) — rein additiv, keine Abhängigkeit.
2. 28 Elite-Varianten-Defs (§1: id, Basis, Name EN+DE, Multiplikatoren, Overrides, xp) im neuen Elite-Content-Block (Shape mit logic-dev abstimmen, Konzept §1.1).
3. Loot-Tabellen je Variante nach §6-Bausteinen (Unique + Chase-Boost + Mats ×3 + Gold nach GO P2).
4. Spawn-Timing-Konstanten (§3: CD-Bänder, 15-min-Fenster, Initial-Offsets).
5. i18n: 28 Namen + 28 Item-Namen in die 7-Sprachen-Overlays (EN/DE stehen hier; Rest via Locale-Workflow).

*Keine Code-/Content-Änderung durch balance-designer erfolgt — dieses Dokument ist die einzige Ausgabe.*
