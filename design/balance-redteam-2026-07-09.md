# Balance-Red-Team-Audit — Stacking-Lecks, Ökonomie-Loops, Progressions-Bypass (2026-07-09)

**Auftrag (Chef-GO):** Wie ein Exploiter denken — alle weiteren Lecks der Familie „Crit-One-Hit / Evasion 57 % / Attack-Speed 2,8 s→0,8 s" finden, bevor zahlende Spieler es tun. Launch ~24.07.

**Methode:** Read-only-Harness gegen die ECHTEN Engine-Pfade (`computeStats`, `combatStep`, `instanceBonusDelta`) — keine Handformeln. Worst-Case-Builds werden über die legitimen Systeme konstruiert (Gear per Slot, Runen via `enchantSlotsFor`/Trinity-Gate, Suffixe via ilvl-Skala, Buffs via Item-Stacking-Regeln, Pets einzeln) und dann in Echtzeit-Sims (1 h Echtzeit-Äquivalent, `combatStep`-Loop) gegen Content geworfen. Harness-Skripte (Repro): Scratchpad `audit-stats.ts`, `audit-immortal.ts`, `audit-eco.ts`, `audit-twink.ts` (Session-Scratchpad `C:\Users\MSchu\AppData\Local\Temp\claude\G--GameDev\553d2095-3a73-4795-9782-0fe746a25f13\scratchpad\`).

Zwei parallel laufende Arbeiten werden hier NICHT dupliziert: die Evasion-/Tempo-Spec (balance-designer) und die Envelope-Guard-Suite (logic-dev). Die zwei bekannten Lecks sind unten nur kurz zahlenbestätigt (L5).

---

## Leck-Liste (nach Schwere)

### L1 — LAUNCH-BLOCKIEREND: Passive HP-Regen übersteigt jeden Gegner-Schaden → Unsterblichkeit ohne Food

**Befund:** Ein BiS-Melee-Tank ist gegen den FINALBOSS (last_idol, L295, enrage ×1,75) **ohne Food, ohne Buffs, ohne Tränke** unsterblich. Schon ein **L60-Char mit req-gegatetem Gear** stirbt on-level nie.

| Variante (1 h Sim vs last_idol L295) | hpRegen/s | Armor | maxHp | Kills | Tode | min HP |
|---|---|---|---|---|---|---|
| A: NUR Gear (keine Runen/Suffixe/Buffs/Pet/Food) | 4,0 | 125 | 300 | 124 | **0** | 75,3 % |
| B: + unique Runen + Suffixe (kein Buff/Food) | 6,6 | 225 | 346 | 126 | **0** | 91,3 % |
| C: + alle stapelbaren Tonika (Dauer-Rebuff) | **30,6** | 260 | 638 | 285 | **0** | 95,8 % |
| L60-Tank, req-Gate, ohne Buffs/Food, vs forest_warden (L65) | 4,3 | 184 | 227 | 164 | **0** | 78,6 % |

**Rechnung:** last_idol: damage 32, acc 16, Intervall 3,8 s → erwartete DPS-in gegen den Tank ≈ **1,4–1,8/s** (Trefferquote ~50 %, Mitigation 50–80 %). Gear-Regen allein (4/s) liegt darüber; der stärkste Monster-DoT im ganzen Spiel ist **1 HP/s** (Inflict-Scan: alle `inflict.magnitude = 1`). Nichts im Content kann diese Regen-Decke durchschlagen.

**Wurzelursache (zweifach, beide Content-Pässe):**
1. **2026-07-05 „balance-fix":** Gear-`hpRegenPerSec` wurde ×8–10 angehoben (0,1–0,2 → 1–2), weil der Tooltip „+0/s" zeigte (formatStat-Rundungsbug). Betroffen: `void_titan_mantle`, `doomforged_band` (je 1/s, **beide requirements-frei!**), `idol_aegis`, `last_idol_mantle` (je 2/s). Der Anzeige-Bug wurde per Stat-Buff „gefixt".
2. **Task #238 „Trank-Impact-Pass":** Tonika-HoTs ×10–20 (0,1–0,3 → 1–6/s): `bloodmend_draught` 6/s, `greater_healing_potion` 4/s, `panacea_elixir` 3/s, … Σ über alle 9 stapelbaren Quellen = **+24/s**.

**Fix-Richtung (1 Zeile):** Gear-hpRegen zurück auf die alte Größenordnung (Summe BiS-Gear-Regen ≪ on-level DPS-in, Richtwert ≤ 1/s gesamt) und den Tooltip auf 1 Dezimale fixen (ui-dev), NICHT die Stats; Tonika-HoTs s. L3.

### L2 — LAUNCH-BLOCKIEREND: Monster-Level ↔ Bedrohung inkohärent („Papier-Monster") + ungedämpfte Aufwärts-XP → kompletter Progressions-Bypass

**Befund A (Papier-Monster):** Die Damage-/HP-Kurve der Monster folgt dem Level nicht. Offene Endgame-Mobs sind schwächer als Mid-Mobs:

| Monster | Level | maxHp | damage | accuracy |
|---|---|---|---|---|
| skeleton_icemage | 80 | 161 (+48 Ward) | **38** | 14 |
| gray_wolf | 97 | 52 | **46** | 11 |
| reef_drowned | **128** | 69 | **14** | 12 |
| slag_kobold | **162** | 90 | **18** | 12 |
| idol_warden | **245** | 320 | **27** | 14 |
| last_idol (FINALBOSS) | **295** | 480 | **32** | 16 |

**Befund B (Bypass, echte Sims, 30 min, Auto-Eat):** `combatXpLevelMult` dämpft nur ÜBER-leveln, nie UNTER-leveln — zusammen mit den Papier-Monstern und `earlyXpMult` (×3 früh) kollabiert die Kurve:

- **L10-Char, Basisgear (req ≤ 10):** farmt reef_drowned (L128) und slag_kobold (L162) mit **0 Toden**; idol_warden (**L245!**): 15 Kills/30 min, 0 Tode, **220 000 XP/h = 171× Zielkurve** (Ziel L10: ~1 285 XP/h). `attack` steigt in 30 min von **L10 → L49**.
- **Skiller-Twink (Kampf L1, Rest L99, Craft-Suffixe ilvl 99):** tötet den **FINALBOSS** (5 Kills/30 min, 0 Tode), **760 000 XP/h = 928× Ziel**; attack L1 → L63 in 30 min.
- Gegenprobe: echte Wände existieren punktuell (gray_wolf L97: 96 Tode; skeleton_icemage L80: 57 Tode; roc L200: Stalemate) — der optimale Pfad schlängelt sich einfach an ihnen vorbei.
- **BiS-99-DPS-Build vs Finalboss: 552 Kills/h** (TTK ~3–5 s), 0 Tode — der Endboss ist eine Farm-Node.

**Wurzelursache:** (a) Die Level-Zahl der QA-Run3-Offenwelt-Mobs (L87–L110+) und der Idol-Halle wurde nie gegen eine Threat-Kurve geeicht — `damage`/`accuracy` stagnieren ab ~L100 auf Früh-Mid-Niveau, während `xp` mit dem Level skaliert (reef_drowned: 5,7 XP/HP; idol_warden: 17 XP/HP; icemage: 2,4 XP/HP). (b) Kein Malus für Kämpfe weit ÜBER dem eigenen Level (weder XP noch Trefferchance-Malus, der greift: Accuracy-Contest bleibt bei acc 12–16 der Mobs gewinnbar). (c) Kein Zonen-/Level-Gate am `startCombat`.

**Fix-Richtung:** Monster-Threat-Kurve monoton machen (damage/accuracy je Level-Band festschreiben und die L110+-Mobs hochziehen — Tabelle liefere ich auf Zuruf als eigenen Spec); ODER/UND Aufwärts-Dämpfung: `combatXpLevelMult` symmetrisch (0 XP ab z. B. 25 Level ÜBER dem Skill) — Ersteres behebt auch Ökonomie/Loot, Letzteres nur XP.

### L3 — VOR LAUNCH FIXEN: Buff-Stacking ohne Kategorie-Exklusivität (24 Tonika parallel, AFK-dauerhaft via Auto-Rebuff)

**Befund:** `applyConsumableBuff` dedupliziert nur pro Item-ID — **alle unterschiedlichen Buff-Items stapeln frei**. Der Tank-Build trägt 24 Buffs gleichzeitig: Σ **+24 hpRegen/s**, **+210 maxHp**, **+1,04 critChance** (Cap fängt), **−5 100 ms Tempo** (Floor fängt), plus Attribut-Feasts. `autoRebuffTonics` hält das ohne Klicks dauerhaft (Brau-Vorrat vorausgesetzt). Kosten sind kein Gate (s. L6-Goldvolumen).

**Wurzelursache:** Kein Buff-Kategorie-/Slot-System — jede neue Tonika-Zeile im Content erhöht die globale Stacking-Decke additiv.

**Fix-Richtung:** Buff-Kategorien einführen (z. B. `buffCategory: "sustain" | "offense" | "utility" | "food"`, max 1 aktiv pro Kategorie, neuer verdrängt alten) — Engine-seitig EIN Feld + Verdrängungsregel in `applyConsumableBuff`.

### L4 — VOR LAUNCH FIXEN: Duplikat-Runen-Stacking (gleiche Rune 4× auf einem Item)

**Befund:** `applyEnchant` prüft NUR das Rarity-Slot-Limit, **nicht auf doppelte Affixe** — `instance.affixes.push(...)` akzeptiert 4× dieselbe Rune auf legendary/godly. `instanceBonusDelta` summiert sie voll: z. B. 4× `affix_arcane` T3 = **+40 int auf einer Waffe** (≈ +13,6 magicDamage), 4× `affix_warding` T3 = **+160 Ward auf einem Teil**, 4× `affix_might` T3 = +40 str. Bei gecappten Stats (Block) harmlos, bei ungecappten (Attribute, Ward, Armor) die stärkste Einzel-Item-Schiene im Spiel — deutlich über jeder Suffix-/Set-Größenordnung.

**Fix-Richtung:** In `applyEnchant` (und `enchantPreview.canApply`) `instance.affixes.some(a => a.affixId === ra.affixId)` → neuer Fehlercode `duplicate_affix`.

### L5 — BEKANNT (nur bestätigt; Spec läuft parallel): Evasion & Attack-Tempo

- **Evasion:** BiS-Evasion-Build: Contest-Evasion 44,5 → 3/99 Monstern am 10-%-Contest-Floor; Finalboss trifft im Contest 26,4 %. **ABER: Dodge (Cap 75 %) multipliziert sich mit dem Contest-Floor** — kombinierter effektiver Boden = 0,1 × 0,25 = **2,5 % Trefferchance**; gegen den Finalboss real **6,6 %**. Der dokumentierte „keine Unverwundbarkeit durch Evasion"-Boden (`MIN_HIT_CHANCE`) deckt nur eine der zwei Schichten. → Bitte in der laufenden Evasion-Spec den KOMBINIERTEN Floor deckeln, nicht nur den Contest.
- **Tempo:** Voll-Stack (Waffe + Suffix „Wolf" −250 + 9 Tempo-Tonika Σ −5 100 ms) schlägt hart auf die Floors: melee **800 ms**, ranged-fast **850 ms**. Floors binden zuverlässig (kein Sub-Floor-Leck) — das Problem ist die DESIGN-Höhe des Floors (2,8 s-Waffe → 3,5× Angriffsrate), nicht ein Rechenfehler. → Tempo-Spec läuft parallel.
- **Crit:** Zähmung #294 hält (s. „Geprüft & hält").

### L6 — BEOBACHTEN / PRE-LAUNCH-TUNING: Gold-Volumen & Chase-Erosion am Endgame

- **Endboss-Farm:** 552 Kills/h × Loot-EV 1 428 g = **~1,38 Mio g/h** Verkaufserlös (BiS). Endgame-Crafts (leatherworking/runecrafting L80–99) erzeugen **0,8–1,5 Mio g/h Marge** über Materialwert. Die Gold-Sinks (Enchant ≤ 3 200 g, Shop-Tools ≤ 4 500 g, Slot-/Auto-Eat-Upgrades) sind dagegen bedeutungslos — Gold verliert am Endgame jede Funktion. Folge-Effekt von L1/L2 (unsterblich + Papier-Boss); mit deren Fix sinken die Raten automatisch. Kein eigener Blocker.
- **Chase-Erosion:** die „Last"-Waffen droppen mit 1/110–1/125 — bei 552 Kills/h regnen **4–5 Chase-Waffen pro Stunde**. Die 1/32k-Godly-Drops bleiben ok (~58 h/Stück bei diesem Tempo aber auch zu schnell). Drop-Chancen sind für einen Boss ausgelegt, der Minuten pro Kill kostet — mit L2-Fix (Boss-TTK ↑) wieder stimmig.
- **Token-Shop:** beste Arbitrage 100 g/Token (cooked_salmon-Bündel verkaufen). Token-Angebot endlich (297 One-time + 51 Dailies à 1/Tag) → Größenordnung ~1 500 g/Tag. Kein Leck, nur als bekannte Konversion notieren.

---

## Geprüft & hält (bewusst genauso wichtig)

| System | Ergebnis |
|---|---|
| **Crit-Zähmung #294** | Voll-Stack (BiS + 9 Crit-Tonika Σ +1,04) endet exakt am Cap **50 % / ×2,5**. Kein One-Hit mehr. |
| **Tempo-Floors** | 800 ms (melee) / 1 000 ms×0,85 (ranged-fast) binden; −5 100 ms Buff-Summe bricht nicht durch; kein Negativ-Intervall (NaN-Clamps greifen). |
| **Shop-Arbitrage** | Kein Shop-Item verkauft ≥ Kaufpreis (SELL_FRACTION 0,5). Kauf→Verkauf-Loop existiert nicht. |
| **Shop-Input-Craft-Loop** | Keine Aktion, deren Inputs komplett shop-kaufbar sind, hat positiven Deckungsbeitrag. Keine Druckerpresse aus dem Nichts. |
| **Buy-Back** | Preis-symmetrisch (Rückkauf = Verkaufserlös, Instanz reist mit) — kein Pump. |
| **Enchant-Ökonomie** | Instanz-Verkauf = Basis-Item-Preis (kein Enchant-/Suffix-Aufschlag) → Verzauberung ist reiner Gold-Sink; Suffix-Craft-Lotterie (20–35 % Chance) druckt kein Gold. |
| **Suffix-Skala** | Soft-Stats (crit/Tempo) über gedeckelte Endpunkt-Skala statt 20×-Linear; Boost-Rolls hart 1..3; ilvl-Cap 100 im Scale-Index. |
| **Skill-Boosts** | Schalten nichts frei — Requirements/XP/combatLevel lesen Basis-Level (Anti-Exploit-Regel §4.2 verifiziert im Codepfad). |
| **Pets** | Nur 1 aktiv, kein Stacking; Engine klemmt jeden Wert auf `PET_SKILL_EFFECT_CAP`/`PET_ABILITY_CAP` (lifesteal ≤ 2 %, DR ≤ 4 %, doubleLoot ≤ 5 %) — auch bei Fehl-Content. |
| **stealDrop-Pet** | Rare-Schutz hält: nur Commons ≥ 5 % Drop-Chance stehlbar — Chase-Items/Keys unantastbar. |
| **DoT-Stacking** | Refresh = max (nie stapeln, nie abschwächen); nur Mainhand procct Status; Max-Kombi (Fusion + Flame-Rune + gutter ×1,5) ≈ 26 HP/s — kein Boss-Breaker; identische Runen-Procs dedupen. |
| **Kill-Cooldown** | Nicht skippbar (Stop/Start übernimmt Rest, wird persistiert); Auto-Eat/Trank im Cooldown gegatet (kein Gratis-Heilfenster). |
| **Lifesteal** | Melee-intrinsisch doppelt gedeckelt (5 % maxHp UND 1,2 abs je Treffer); Gear-Lifesteal max 7 % (1 Waffe) + Pet 2 % — allein kein Immortality-Träger (L1 ist der Regen, nicht der Raub). |
| **One-Shot-Cap / Ward-Break / MIN_HIT_CHANCE** | Vorhanden und greifen einzeln (Kombi-Floor-Problem s. L5-Anmerkung). |
| **Mana-Loops** | manaOnKill/manaDrain/surplus erlauben Dauer-Cast, aber ohne eigenständige Exploit-Wirkung (kein Schaden-/Gold-Multiplikator jenseits des Intendierten). |
| **Quest-Tokens** | Endliches Angebot; `buyTokenShopOffer` rollt bei Fehlschlag komplett zurück (keine Dupe). |
| **Save-Manipulations-Härtung** | `computeStats` clampt NaN/Infinity; degenerierte acc/eva-Zustände fallen auf definierte Fallbacks. |

---

## Wurzelursachen-Cluster (Priorität für content-dev/logic-dev via CEO)

1. **„×10-weil-Tooltip-rundete"-Pässe** (2026-07-05 hpRegen-Gear, #238 Tonika): Anzeige-Bugs wurden als Stat-Buffs gefixt → Regen-Decke über jeder Gegner-DPS. → Stats zurück, Tooltip fixen. **(L1)**
2. **Fehlende Threat-Eichung der L110+-Monster:** Level-Zahl (=XP-Quelle) und Kampfwerte entkoppelt. → Monster-Kurven-Spec. **(L2, trägt L6 mit)**
3. **Fehlende Exklusivitäts-/Dedup-Regeln in zwei Stacking-Systemen:** Buffs (kein Kategorie-Limit) und Enchants (kein Duplikat-Check). → je 1 kleine Engine-Regel. **(L3, L4)**
4. **Mehrschichtige Vermeidung ohne kombinierten Deckel** (Contest-Floor × Dodge): an die laufende Evasion-Spec übergeben. **(L5)**

## Apply-Reihenfolge (Vorschlag)

1. L1: hpRegen-Werte zurücksetzen (Content, ~12 Zeilen) + Tooltip-Dezimale (ui-dev).
2. L2: Monster-Threat-Tabelle L100–295 (eigener Balance-Spec, liefere ich als Nächstes auf Zuruf) — mindestens: reef_drowned/slag_kobold/tide_siren-Band, Idol-Halle, Finalboss.
3. L3: `buffCategory` + Verdrängung (logic-dev, shared+engine, SAVE-neutral).
4. L4: `duplicate_affix`-Guard in `applyEnchant`/`enchantPreview` (logic-dev, 2 Stellen).
5. L5: läuft parallel (Evasion-/Tempo-Spec) — Kombi-Floor-Hinweis dort einarbeiten.
6. L6: nach L1/L2 neu messen; erst dann Drop-/Preis-Tuning entscheiden.
