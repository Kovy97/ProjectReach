# Playtest-Feedback: Der Bogenschütze

**Persona & Spielstil:** Fernkampf-Spezialist (Bögen, Pfeil-Munition, Krit/Tempo), liebt konstanten Präzisionsschaden aus Distanz und das Selbstversorger-Fantasy über Fletching (eigene Bögen UND eigene Pfeile bauen). Wird genervt von Munitions-Mikromanagement und wenn Fernkampf sich gegenüber Nahkampf unterlegen anfühlt.

**Was ich gespielt habe:** Engine-Sim (Seed 42/3/9). DEX-Build (dex 8, con 4), Kurzbogen sofort ab `ranged 1` ausgerüstet, Goblin-Dauerkampf, Fletching-Grind (Schäfte + Copper-Pfeile), Bogen-Leiter-Audit, Munitions-Runway-Test, Feder-Ökonomie. Grob ~1h Sim je Messblock, plus ein 40h-Progressionslauf für die Skill-Meilensteine.

---

## Pacing-Messungen (Zahlen)

**Start-Stats (Kurzbogen, dex 8, con 4):** dmg 23.8, crit 14%, Intervall 2312 ms, acc 116. → Fernkampf startet sofort spielbar, kein Tool/Quest-Gate. ✅

**DPS / Parität (1h vs. Goblin, gleiches Attribut-Budget):**
| Build | Waffe | Kills/h | dmg | Intervall |
|---|---|---|---|---|
| Ranged | short_bow + copper_arrow | **1213** | 23.8 | 2312 ms |
| Melee | bronze_sword (str 8) | 622 | 21.3 | 2880 ms |
| Ranged OHNE Munition | short_bow (improvisiert) | 27 | – | – |

→ **Ranged = 195% der Nahkampf-Kills** bei gleichem Budget. Fernkampf ist nicht nur viabel, sondern dem Nahkampf in der Frühphase *deutlich überlegen* (höherer Basisschaden via dex×1.2 vs. Schwert, +Tempo −85%, +10% Crit). Ohne Munition fällt man auf 2% — die Munitions-Kopplung wirkt sauber.

**Krit/Tempo-Skalierung (Kurzbogen):**
| dex | crit | Intervall | rangedDmg |
|---|---|---|---|
| 8 | 14% | 2312 ms | 23.8 |
| 20 | 17% | 2108 ms | 38.2 |
| 40 | 21% | 1768 ms | 62.2 |
| 70 | 27% | 1258 ms | 98.2 |

→ Tempo und Crit skalieren beide mit dex — die „Fernkampf-Eigenheit" ist spürbar, aber Crit wächst flach (14→27% über 62 dex-Punkte). Tempo ist der dominante Hebel.

**Ranged-XP/h:** Gegen Goblins mit unbegrenzter Munition erreicht ranged in der **ersten Stunde bereits L40** (L10/L22/L30 alle < 1h). Grund: `addXp(ranged, damage × 2)` — Fernkampf bekommt doppelte Offense-XP pro Schaden. → Skill-Progression ist **viel zu schnell**; die Bogen-Leiter-Gates (`ranged 22/42/62/80/95`) fallen quasi sofort, das eigentliche Gate ist *Fletching-Level + Material*, nicht ranged.

**Fletching-Progression (1h, Inputs vorrätig):**
- `fletch_shafts`: → Fletching **L25**, 28 875 Schäfte.
- `fletch_copper_arrows`: → Fletching L21, 18 930 Pfeile.

**Munitions-Verbrauch:** ~**1.1 copper_arrow/Kill**, ~**1283 Schüsse/h** gegen Goblin. 50 Pfeile sind in **deutlich unter 1h leer** (50 Pfeile ≈ 45 Kills). Eine einzige Fletch-Charge (15 Pfeile) reicht für ~14 Kills.

---

## Was sich gut anfühlt ✅

- **Sofort-Einstieg:** Kurzbogen ab `ranged 1`, copper_arrow ammoDamage 0 (reiner Basis-Bogen) — kein langes Tutorial-Gate.
- **Fernkampf ist stark & befriedigend:** 195% Nahkampf-DPS, schnellere Schüsse, +Crit. Genau das Distanz-Powerfantasy, das die Persona will.
- **Munitions-Kopplung ist mechanisch sauber:** ohne Pfeile nur 2% Schaden, Waffeneffekt (Blutung) feuert nur mit echter Munition. Nie negative Pfeilbestände. ✅
- **Pfeil-Tiers sinnvoll gestaffelt:** ammoDamage copper 0 → iron 2 → steel 4 → mithril 7 → runite 11. Klare, lohnende Leiter.
- **Bogen-Leiter ist breit & thematisch:** 10 Bögen, Holz-Tier (ashbark→bonewood) + Komposit/Runed/Godwood-Endgame, alle via Fletching herstellbar, alle mit existierender Munition. Die neuen Holz-Tier-Bögen schließen die Lücke sauber.

## Was sich zu langsam/schnell/zäh anfühlt ⚠️

- **Ranged-XP ist 2× überdreht:** L40 in 1h. Die ranged-Level-Gates der Bögen sind faktisch wirkungslos — man ist meilenweit über dem ranged-Req, bevor man das Fletching-Level/Material hat. Der `× 2`-Faktor in `grantOffenseXp` für ranged sollte runter (auf ~1.0–1.2), sonst trägt das Skill-Gate nichts zur Progression bei.
- **Munitions-Durchsatz beim Fletchen ist absurd hoch:** 18 930 Pfeile/h. Eine einzige Stunde Fletchen deckt ~15h Kampf. Entweder Output runter oder das ist gewollt „craft selten, kämpfe lang" — dann fehlt aber Spannung im Nachschub.

## Reibungspunkte & Frust (konkret)

1. **FEDER-ENGPASS ist der echte Killer.** Federn (`feather`) haben **0 Skilling-Aktionen** — es gibt KEINE gather-Aktion. Sie kommen NUR aus Monster-Drops (chicken, dust_vulture, roc, goblin_archer, skeleton_archer …). Mein Haupt-Grindziel **Goblin droppt 0 Federn** → 1644 Pfeile verbraucht, 0 Federn gelootet = **0% Selbstversorgung**. Der Bogenschütze, der „ständig Pfeile baut", kann seinen Pfeil-Loop *nicht* schließen, ohne gezielt Hühner/Vögel zu farmen — das ist genau das Munitions-Mikromanagement, das die Persona hasst. Arrowheads (Smithing aus Barren) und Schäfte (Logs) sind selbstversorgbar; **Federn sind die einzige Sackgasse**.
2. **Holz-Tier-Bögen schlechter als gleichzeitig verfügbarer Komposit:** ashbark (+22, req fletch 25) vs. blackthorn (+30 + Blutung, req fletch 25) — bei identischem Fletch-Req ist blackthorn klar besser, ashbark wird übersprungen. ironbark (+34, fletch 45) vs. composite (+50, fletch 40) — composite ist **früher verfügbar UND stärker**. Der ganze „reine Holz"-Pfad (ashbark/ironbark/shadowpine/bonewood) ist gegenüber dem Komposit/Metall-Pfad **dominiert** und damit toter Content.
3. **`fletchReq L` der Bögen ≠ Item-`requirements.fletching`:** z.B. grimoak_longbow Item verlangt `fletching 8`, die Craft-Aktion aber `levelRequired 1`. Inkonsistent — man kann den Bogen bauen, bevor man ihn tragen darf (oder umgekehrt verwirrend). Bei ashbark: bauen ab L25, tragen ab fletch 25 — passt; bei blackthorn: bauen ab L18, Item-Req fletch 25 → man baut ihn 7 Level bevor man ihn anlegen kann.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht) + Vorschläge (priorisiert)

1. **[HOCH] Feder-Selbstversorgung ermöglichen.** Eine Skilling-Quelle für Federn (z.B. Foraging/„Federn sammeln", Farming-Hühnerstall, oder Fletching-Nebenprodukt). Solange Federn nur aus Kampf-Drops kommen, ist die Munitions-Ökonomie für einen reinen Crafting-Bogenschützen kaputt. **Wichtigster Fix.**
2. **[HOCH] Ranged-XP-Faktor halbieren** (`× 2` → ~`× 1.0–1.2`), damit die ranged-Bogen-Gates greifen und Progression spürbar wird statt in 1h erledigt.
3. **[MITTEL] Holz-Tier-Bögen rebalancen oder differenzieren.** Entweder Stats anheben (über Komposit/Metall des gleichen Tiers), günstiger machen, oder ihnen eine eigene Nische geben (z.B. Holz = mehr Tempo/Crit, Metall = mehr Flat-Damage). Aktuell dominiert.
4. **[MITTEL] Item-`requirements.fletching` und Craft-`levelRequired` angleichen**, damit „bauen = tragen können".
5. **[NIEDRIG] Munitions-Spannung erzeugen:** Pfeil-Output pro Charge senken oder Pfeile schneller verbrauchen lassen (Mehrfachschüsse?), damit „Nachschub managen" ein echtes, aber faires Subsystem wird statt 1h Fletchen für 15h Kampf.
6. **[NIEDRIG] Krit-Skalierung schärfen:** +13% Crit über 62 dex-Punkte ist flach. Wenn Crit die Fernkampf-Identität sein soll, stärker an dex/lck koppeln oder mehr Crit-Bögen im Mid-Tier.

---

## Spaß-Bewertung: **7 / 10**

Fernkampf fühlt sich stark, schnell und befriedigend an (195% Nahkampf-DPS, sauberes Munitions-System, breite Bogen-Leiter) — aber der nicht-selbstversorgbare Feder-Engpass und die in 1h ausgereizte ranged-Progression nehmen dem Crafting-Bogenschützen genau die Langzeit-Schleife, die seine Persona trägt.
