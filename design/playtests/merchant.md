# Playtest-Feedback: „Der Händler / Goldjäger"

**Persona & Spielstil:** Ich will REICH werden. Thieving hochziehen, wertvolle Drops sammeln und
verkaufen, alles in Gold-Upgrades stecken, Gold horten. Mein Erfolgsgefühl hängt daran, ob Reichtum
*spürbar lohnt* — und ob es überhaupt etwas Sinnvolles zu kaufen gibt.

**Sim-Setup:** Engine direkt angesteuert (`createGame` → `setActiveAction` → `advance`), seed 777/4242,
Loot kontinuierlich zu Gold liquidiert (Händler-Verhalten). Voller Durchlauf 200h Sim-Zeit, immer die
beste freigeschaltete Thieving-Aktion. Plus isolierte 1h-Messung jeder Thieving-Stufe @ `levelRequired+5`.

---

## Was ich gespielt habe

Reiner Thieving-Lauf von 0 Gold. Erste Stunden Bettler/Betrunkene/Händler bestehlen, dann hoch über
Steuereintreiber, Lagerhaus, Stadtwache, Geldkassette … bis Thieving L80 nach 200h. Stolen Loot
(Coinpurse, Trinket, Edelsteine, Siegelringe, Prunkkelche …) laufend verkauft.

---

## Pacing-Messungen (konkrete Zahlen)

### Thieving-Leiter — gold/h pro Stufe (@ Level = levelRequired+5)

| Aktion | lvlReq | Erfolg% | direkt g/h | Loot-Verkauf g/h | **TOTAL g/h** |
|---|---:|---:|---:|---:|---:|
| pickpocket_beggar | 1 | 66% | 3.009 | 3.842 | **6.851** |
| pickpocket_drunkard | 5 | 64% | 4.691 | 4.752 | **9.443** |
| pickpocket_merchant | 12 | 61% | 7.234 | 5.452 | **12.686** |
| loot_market_stall | 20 | 58% | 8.327 | 2.462 | **10.789** ⬇ |
| pickpocket_tax_collector | 28 | 56% | 16.296 | 6.598 | **22.894** |
| burgle_warehouse | 36 | 55% | 16.359 | 4.031 | **20.390** ⬇ |
| pickpocket_city_guard | 45 | 48% | 22.779 | 1.185 | **23.964** |
| crack_strongbox | 55 | 51% | 40.675 | 3.770 | **44.445** |
| pickpocket_noble | 65 | 46% | 29.859 | 5.060 | **34.919** ⬇ |
| rob_cultist_shrine | 75 | 48% | 43.919 | 3.808 | **47.727** |
| raid_tax_vault | 85 | 46% | 70.090 | 6.744 | **76.834** |
| loot_reliquary | 95 | 46% | 60.681 | 5.220 | **65.901** ⬇ |
| plunder_ashen_treasury | 105 | 45% | 98.170 | 9.610 | **107.780** |
| heist_idol_hoard | 115 | 41% | 150.131 | 14.880 | **165.011** |

### Zeit bis Meilensteinen (voller Durchlauf, seed 777)

- Thieving **L10: 0,4h · L30: 5,1h · L45: 18,9h · L55: 47,5h · L65: 83h · L75: 158h** · L80 nach 200h (Cap).
- Gold **1.000: 0,2h · 10.000: 1,1h · 100.000: 6,7h · 1.000.000: 45,1h**.
- End-Gold nach 200h: **7,63 Mio** (davon nur 0,94 Mio aus Loot-Verkauf — der Rest ist Direkt-Gold).

---

## Was sich gut anfühlt ✅

- **Thieving IST eine echte Gold-Maschine.** gold/h skaliert sauber von ~7k (L1) auf ~165k (L115).
  Die Top-Aktionen geben fett Direkt-Gold — als Goldjäger fühle ich mich endlich am richtigen Skill.
- **Gold-Meilensteine kommen früh und befriedigend:** 1k in 12 Min, 10k in gut 1h, 100k in unter 7h.
  Die erste Stunde belohnt aggressiv — guter Hook für meine Persona.
- **Stolen-Loot-Tabelle hat Flair** (Coinpurse → Trinket → Edelstein → Siegelring → Prunkkelch →
  Götzenmünze). Steigende Rarität fühlt sich nach „echtem Beuteln" an.
- **Erfolg/Fehlschlag + Stun** gibt Thieving Würze; die Erfolgschance steigt mit Level (Cap 95%).

## Was sich zu zäh / zu schnell anfühlt ⚠️

- **NACH ~7h habe ich nichts mehr zum Ausgeben.** Siehe Gold-Senken-Audit unten: ich sitze nach
  45h auf **1 Mio**, nach 200h auf **7,6 Mio Gold** — und es gibt schlicht NICHTS, wofür ich das
  ausgebe. Das ist für meine Persona der Genickbruch: Reichtum ist komplett folgenlos.
- **Loot-Verkauf ist als Einkommensquelle bedeutungslos.** In jeder Top-Stufe ist Loot-g/h nur
  4–10% des Direkt-Golds (z.B. heist: 14,9k Loot vs 150k direkt). Mein Kern-Fantasy „wertvolle
  Drops sammeln und verkaufen" trägt fast nichts bei — das Gold kommt ohnehin direkt.
- **Nicht-monotone Leiter:** market_stall (10,8k) < merchant (12,7k); warehouse (20,4k) < tax_collector
  (22,9k); noble (34,9k) < strongbox (44,4k); reliquary (65,9k) < tax_vault (76,8k). Mehrere höhere
  Stufen sind ein gold/h-**Downgrade** — als Optimierer ignoriere ich sie und es fühlt sich kaputt an.
- **High-End-Thieving (L85+) ist sehr weit weg:** L75 erst nach 158h, L85+ in 200h gar nicht erreicht.
  Die fettesten Gold-Aktionen (raid_tax_vault, ashen_treasury, idol_hoard) sehe ich praktisch nie.

---

## DER KERNFRUST: Es gibt kaum Gold-Senken

Gold-Senken-Audit — was kann ich *überhaupt* mit Gold kaufen?

| Senke | Gesamtkosten (alles) |
|---|---:|
| **Alle 25 Shop-Einträge je 1x** | **6.071 g** |
| **Auto-Eat (alle 3 Stufen)** | **35.000 g** |
| **Inventar-Slots:** 12 Upgrades | ~15.000 g |
| Inventar-Slots: 25 Upgrades (geometrisch ×1,5) | ~3,03 Mio g |

- **Der GESAMTE Shop kostet 6.071 Gold.** Das verdiene ich in der ersten **Stunde** (10k in 1,1h).
  Danach ist der Shop für immer „durchgekauft". Teuerstes Item: runite_pickaxe für 2.400 g.
- **Auto-Eat (35k total)** und **Slots** sind die einzigen echten dauerhaften Senken. Auto-Eat ist
  nach ~3h leistbar und dann auf Max. Slot-Upgrades sind die *einzige* skalierende Senke (geometrisch),
  aber als Thieving-Hortender brauche ich kaum Slots — alles ist stackable, ich verkaufe sofort.
- **Dungeon-Schlüssel sind NICHT kaufbar.** crypt_key/idolhall_key/warband_key haben zwar Werte
  (250/1.200/90 g), kommen aber nur als Drop. Ich kann mir mit Gold *keinen* Dungeon-Zugang erkaufen —
  eine offensichtliche Gold-Senke, die fehlt.
- **Dungeons sind Gold-QUELLEN, keine Senken** (crypt 1.200 g/Run, idol_sanctum 8.000 g/Run) — sie
  verschärfen das Problem noch.

Ergebnis: Nach **~7h** ist meine gesamte sinnvolle Lebenszeit-Ausgabe (Shop 6k + Auto-Eat 35k +
~20 Slot-Upgrades) erschöpft. Alles danach — Millionen Gold — ist **toter Zahlenwert**. Genau das
nervt mich als Goldjäger am meisten: „Reich werden" hat kein Ziel, kein Statussymbol, kein Sieg.

---

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht) + Vorschläge (priorisiert)

1. **[KRITISCH] Skalierende Gold-Senken am High-End.** Millionen müssen wohin können. Ideen:
   - **Kaufbare Dungeon-Schlüssel** (teuer, z.B. crypt_key 5–10k, idolhall_key 100k+). Sofortige,
     thematisch perfekte Senke: Gold → Content-Zugang. Direkt verfügbare Item-IDs existieren bereits.
   - **Gold-Gear-Tiers / Luxus-Shop**, der mit Reichtum skaliert (5-/6-stellige Preise).
   - **Bank-/Lager-Upgrades**, **Reise-/Aktions-Speed-Boosts**, **permanente Gold-/XP-Multiplikatoren**
     als Geldsenke (Melvor-Stil „Mastery-/Pet-/Township"-Sinks).
2. **[HOCH] Loot-Verkauf relevant machen.** Mein Kern-Fantasy. Entweder Stolen-Loot-Werte deutlich
   anheben (×3–5), oder einen **Fence/Schwarzmarkt** mit schwankenden Preisen + Verkaufs-Boni für
   Mengen/seltene Stücke. Aktuell ist „sammeln & verkaufen" mechanisch irrelevant (4–10% vom Ertrag).
3. **[HOCH] Thieving-Leiter monoton machen.** market_stall/warehouse/noble/reliquary so anheben,
   dass jede höhere Stufe *immer* mehr gold/h liefert. Sonst überspringe ich sie und sie sind toter Content.
4. **[MITTEL] Reichtum sichtbar belohnen.** Es gibt Achievements für 1k/10k Gold — aber nichts für
   100k/1M/10M. Gold-Sammel-Achievements + ein **Gold-Sink-Statussymbol** (kaufbares Haus/Trophäe)
   geben dem Horten ein Ziel.
5. **[MITTEL] High-End-Thieving zugänglicher.** L85+ nach 200h+ ist zu weit. Entweder XP-Kurve im
   oberen Bereich glätten oder Gold-Boni der mittleren Stufen anheben, damit der Grind sich trägt.

---

## Spaß-Bewertung: **5/10**

Gold *verdienen* macht über Thieving richtig Laune (schnelle Meilensteine, fette g/h-Skalierung) — aber
spätestens nach 7h kollabiert die Fantasy, weil es absolut nichts mehr zu kaufen gibt und „reich werden"
in einen sinnlosen Zahlenberg mündet; ohne skalierende Gold-Senken und relevanten Loot-Verkauf bleibt
meine Persona unbefriedigt.
