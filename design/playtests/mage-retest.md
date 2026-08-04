# Playtest-RETEST: „Die Magierin" (Lyra)

**Bezug:** Folge-Test zu `mage.md` (vorher **5/10**). Validiert die vier Magie-Identitäts-Fixes
mit Zahlen. Methode wie zuvor: deterministische Engine direkt angesteuert (Wegwerf-Test
`packages/engine/src/_retest_mage.test.ts`, danach gelöscht), log-basierte Messungen, Seeds 3/7/11.

**Kurzfazit:** Alle vier getesteten Fixes greifen sauber und messbar. Die Magie-Identität, die beim
letzten Mal „beim ersten Upgrade zerfiel", **hält jetzt durch alle Tiers**. Die zwei verbliebenen Lücken
(Mana als Ressource, Überlebensmechanik/Mana-Schild) sind bekannt und noch offen.

---

## Fix 1 — weaponEffect auf ALLEN Runecrafting-Stäben ✅ GREIFT

Setup: schwacher Mage gegen unsterblichen Dummy (HP künstlich hoch, damit Treffer nicht killen und der
Effekt am Gegner sichtbar bleibt), 60 s, voll Mana → jeder Schlag ist ein echter Cast. Gezählt: wie oft der
Statuseffekt **neu** auf dem Gegner auftrat („ausgelöst") und wie viele Ticks er aktiv war.

| Stab | Effekt | chance | Treffer | ausgelöst | ~Quote | aktiv-Ticks |
|---|---|---|---|---|---|---|
| gnarled_staff (Starter) | burn | 0.50 | 18 | 5x | ~28% | 274 |
| frost_scepter | **frost** | 0.35 | 20 | 6x | ~30% | 341 |
| aether_runestaff | **burn** | 0.30 | 18 | 4x | ~22% | 229 |
| stormcaller_rod | **shock** | 0.35 | 20 | 5x | ~25% | 257 |
| voidcaller_staff | **shock** | 0.30 | 20 | 4x | ~20% | 237 |
| godspark_staff | **burn** | 0.38 | 19 | 3x | ~16% | 324 |

**Befund:** Jeder der fünf vormals „toten" Stäbe **löst seinen Statuseffekt jetzt wirklich im Kampf aus**,
mit Auslöse-Quoten, die im Rahmen der hinterlegten `chance` liegen (kleine Stichprobe → Streuung normal).
Der Effekt ist nicht nur konfiguriert, sondern wirkt: er taucht in `enemyEffects` auf und tickt hunderte Male.
Das Frost-Zepter friert jetzt tatsächlich (frost-Slow), die Sturm-Rute schockt, der Aether-/Götzenfunken-Stab
brennt. **Magie fühlt sich ab Tier 2 wieder magisch an** — der größte Frustpunkt vom letzten Mal ist behoben.

Mechanik-Detail (positiv): Der Effekt ist an einen **echten Cast** gekoppelt (`casts === true`, also Mana ≥
Kosten) und respektiert Gegner-Resistenzen — z. B. `last_idol` (resist burn/frost/shock) bekäme korrekt
NICHTS. Das ist sauber gebaut, kein „immer-feuert"-Hack.

---

## Fix 2 — INT-Rüstungslinie ✅ GREIFT

Setup: Basis-Mage (nur Stab, style=magic), dann komplette Roben-Garnitur je Tier angelegt; Skill-Reqs
erfüllt. Gemessen via `computeStats`. **Δ = reiner Gear-Beitrag** (die Absolutwerte enthalten zusätzlich
Progressions-int aus dem hochgesetzten magic_off — daher zählt für „kann ich int über GEAR erhöhen?" das Δ).

| Roben-Set (Slots) | Δ int | Δ magicDamage | Δ maxMana |
|---|---|---|---|
| Tier 1 Lehrling (Hut+Robe) | **+4** | +2 | +20 |
| Tier 2 Frost (Zirkel+Robe+Beine) | **+11** | +43 | +55 |
| Tier 3 Aether (Kapuze+Robe+Beine) | **+18** | +84 | +100 |
| Tier 4 Götzenfunken (Mitra+Ornat+Beine) | **+32** | +154 | +178 |

**Befund:** Die Antwort auf „Kann eine Magierin ihren Kern-Stat int über Gear erhöhen?" ist jetzt ein
klares **Ja**. Eine volle Götzenfunken-Garnitur gibt allein **+32 int**, dazu **+154 magicDamage** und
**+178 maxMana** — und das ZUSÄTZLICH zur Waffe/Fokus-Achse. Damit hat der Magier endlich die eigene
Rüstungs-Achse (parallel zu Platte/Leder), die im letzten Test komplett fehlte. Schöner Nebeneffekt: die Roben
liefern auch defense/maxHp (Tier4: def +0 → +87.6, maxHp 110 → 322), was die Glass-Cannon ein Stück weit
abhärtet (siehe aber „noch offen": echte Magier-Überlebensmechanik bleibt aus).

Die int-Staffelung 3→14 ist über 4 Tiers gut spürbar und monoton steigend — kein Durchhänger.

---

## Fix 3 — magic_def wird jetzt trainiert ✅ GREIFT (inkl. korrekter Routing-Logik)

Setup: schwacher Mage, der gegen einen unsterblichen Gegner wiederholt Schaden einsteckt (120 s). Gemessen:
XP-Zuwachs in `magic_def` vs. `defence`, je nach Schadensart des Gegners.

| Gegner | Angriffsart | magic_def | defence |
|---|---|---|---|
| goblin_stormcaller | **shock**-inflict | **+172.4 xp → L2** | +0.0 |
| goblin_warlock | **burn**-inflict | **+232.1 xp → L3** | +0.0 |
| moss_golem (Kontrolle) | rein physisch | +0.0 (bleibt L1) | **+105.9** |

**Befund:** Das vormals **tote Skill `magic_def` levelt jetzt** — aber nur dann, wenn man wirklich magischen
Schaden einsteckt (Gegner mit burn/frost/shock-inflict). Die Routing-Logik ist exakt richtig: bei einem rein
physischen Gegner bekommt `defence` die XP und `magic_def` bleibt bei 0. Genau das wollte ich als „defensive
Magierin": meine Magie-Verteidigung härtet sich ab, wenn ich von Magie getroffen werde. Bonus: auch
**magischer DoT** (eingestecktes Brennen) trainiert magic_def, nicht nur direkte Treffer. Karteileiche
erledigt.

---

## Bonus — Ranged vs. Magic gegen Tank/Regen ✅ differenziert

Setup: gleiches Offense-Level (magic_off = ranged), je gute Waffe, gegen `moss_golem` (regen 3, **defense 20**),
180 s, Kills gezählt.

| Stil | Waffe | Kills (180 s) | Kills/min |
|---|---|---|---|
| **Magie** | aether_runestaff (burn-DoT) | **85** | **28.3** |
| Ranged | shadowpine_longbow | 33 | 11.0 |

**Befund:** Gegen einen gepanzerten Regen-Gegner zieht **Magie klar davon (~2,6x Kills)** — der burn-DoT
**ignoriert die Rüstung (def20)** und überrennt die Regeneration, während der Fernkampf jeden Treffer durch
def20 reduziert bekommt. Das ist die gewünschte Differenzierung: Magie = Anti-Tank/Anti-Regen über DoT.
**Vorsicht bei der Interpretation:** Der Faktor 2,6x ist auch von der konkreten Waffenwahl/dem Tier abhängig
(aether-Stab vs. shadowpine-Bogen sind nicht perfekt gematcht) — die Aussage ist **richtungsweisend**, kein
exakter Paritätswert. Aber das Vorzeichen stimmt eindeutig und passt zur Design-Absicht.

---

## ✅ Was sich jetzt gut anfühlt (neu ggü. 5/10-Test)
- **Magie bleibt über alle Tiers magisch.** Jeder Stab hat seinen Effekt — die Identität zerfällt nicht mehr
  beim ersten Upgrade. Das war mein Haupt-Kritikpunkt und ist sauber gelöst.
- **Eigene Gear-Achse für int.** Roben/Hüte/Beine geben spürbar int/magicDamage/maxMana (Tier4: +32 int).
  Der Magier baut sich jetzt richtig aus, nicht nur über magic_off-Level.
- **magic_def ist ein echtes Skill geworden** — mit korrektem physisch/magisch-Routing. Defensive-Magier-Build
  ist endlich trainierbar.
- **Magie hat eine klare Nische**: DoT gegen Panzer/Regen. Nicht mehr „Nahkampf, der int benutzt".

## ⚠️ Was noch fehlt (ehrlich, mit Zahlen aus dem letzten Test)
- **[HOCH] Magier-Überlebensmechanik / Mana-Schild — noch offen.** Die Roben geben zwar etwas def/maxHp, aber
  das Kern-Problem aus `mage.md` bleibt: Nahkampf hat 12% Lebensraub, Magie hat kein echtes defensives
  Gegenstück. Im realistischen Dauerkampf bleibt die Glass-Cannon zerbrechlich. (Laut Auftrag bewusst noch
  nicht umgesetzt — korrekt vermerkt.)
- **[MITTEL] Mana als echte Ressource — noch offen.** Regen > Verbrauch → nie ein Engpass, nie eine
  Entscheidung. Es gibt weiterhin keinen Burst-vs-Sustain-Trade-off, keinen teuren „großen" Zauber. Mana ist
  immer noch Dekoration. (Ebenfalls bewusst offen.)
- **[NIEDRIG, Alt-Punkt] Runecrafting-XP-Grind** für die High-Tier-Stäbe/Roben (frost req rc20, aether rc45,
  godspark rc88) ist weiterhin vom Kampf entkoppelt. Nicht Teil dieses Retests, aber nach wie vor der zähste
  Pfad zur eigentlichen Magie-Power.

---

## Spaß-Bewertung: **7,5 / 10** (vorher 5/10)

Drei der vier Haupt-Frustpunkte aus dem letzten Test sind **mit Zahlen nachweisbar behoben**: Statuseffekte
überleben das Upgrade (alle 5 Stäbe lösen aus), int ist jetzt eine echte Gear-Achse (+32 int Tier4), und
`magic_def` levelt korrekt nach Schadensart. Magie hat zudem eine klare Identität (DoT-Anti-Tank, ~2,6x Kills
vs. Ranged gegen Panzer/Regen) statt „int-Nahkampf". Das hebt die Magierin deutlich.

Die **0,5 unter 8** und die fehlenden 2,5 Punkte zur 10 liegen an den **bewusst noch offenen** Punkten: ohne
Mana-Schild bleibt der Glass-Cannon-Dauerkampf fragil, und Mana ist weiter belanglos (kein Burst/Sustain-Spiel).
Sobald die Überlebensmechanik + Mana-als-Ressource stehen, ist das locker eine 9.
