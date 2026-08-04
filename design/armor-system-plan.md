# Rüstungs-System — Design-Plan (nur Plan, keine Umsetzung)

Stand 2026-07-03. Ausgangslage: Nach Itemization 2.0 tragen Rüstungen NUR noch die 6 Attribute;
„defensive Werte" (flat def/hp/melee) sind verboten. Defense = f(CON, WIS, defence-Skill). Ergebnis:
Rüstung hat praktisch keinen eigenen defensiven Wert mehr — ein Plattenpanzer ist kaum tankier als
ein Stoffgewand (nur über die paar CON-Punkte, die er zufällig trägt).

## Das Kern-Dilemma (warum flat Armor bisher tabu war)
Wenn schwere Rüstung flache Schadensreduktion gibt und Stoff nicht, ist **Nahkampf strikt tankier**.
Da wir **kein Range-/Kiting-System** haben (alle stehen im Nahkampf und tauschen Schläge, Auto-Battle),
können Magier/Fernkämpfer den Nachteil NICHT durch Abstand ausgleichen — sie fressen dieselben Treffer
mit weniger Mitigation → sterben schneller → Melee dominiert. Das bricht die Drei-Stile-Parität, die
uns wichtig ist.

**Zielkonflikt:** Rüstung soll sich BEDEUTSAM anfühlen (Gewichtsklassen spürbar), OHNE dass ein Stil
überlebenstechnisch dominiert.

## Vorschlag: Die „Defensive Trinität" (Kern-Idee)
Jede Rüstungs-KLASSE gibt ihre EIGENE Überlebens-Schicht — mit ~gleichem effektiven Leben (EHP), aber
unterschiedlicher MECHANIK und Anmutung. Bewährtes Muster (WoW Armor/Dodge/Absorb, PoE
Armour/Evasion/Energy-Shield):

| Klasse | Stil | Schicht | Mechanik | Fühlt sich an wie |
|---|---|---|---|---|
| **Platte** | Melee (STR) | **Mitigation** (Armor Rating) | reduziert jeden Treffer flach/prozentual | zäher Fels, verlässlich |
| **Leder** | Ranged (DEX) | **Ausweichen** (Evasion) | Chance, Treffer ganz zu vermeiden | flink, riskanter (Varianz) |
| **Stoff** | Magic (INT/WIS) | **Ward / Manaschild** | Pool absorbiert Schaden (aus Mana) | Schild, regeneriert im Kampf |

**Warum das das Dilemma löst:** Alle drei erreichen auf gleichem Tier ~dasselbe EHP — nur der Weg
unterscheidet sich. Der Magier ist NICHT squishy, sein Stoff gibt ein gleichwertiges Ward. Kein Stil
ist tankier, aber Rüstung hat endlich echten defensiven Wert.

**Bonus:** Wir haben alle drei Primitive schon in der Engine — `defense` (Mitigation), `evasion`
(DEX-basiert), `manaShield` (Magie-Absorb). Es ist mehr Formalisierung + Balancing als Neubau.

### Zwei Umsetzungs-Varianten (später zu entscheiden)
- **A1 — rein attributgetrieben (bleibt „nur Attribute auf Rüstung"):** Platte trägt CON→Mitigation,
  Leder trägt DEX→Evasion, Stoff trägt INT/WIS→Ward. Kein neuer „verbotener" Flatwert; die Klassen
  unterscheiden sich, WELCHES Attribut sie tragen, und die Formeln übersetzen das in die Schicht.
  *Sauber & regelkonform, aber: koppelt Defense an die Schadens-Attribute (DEX macht Ranged doppelt
  gut: Schaden UND Ausweichen). Braucht sorgfältige Formel-Eichung.*
- **A2 — explizite Klassen-Defense (bewusste Revision der „verbotene Werte"-Regel):** Platte→`armor`,
  Leder→`evasionRating`, Stoff→`ward` als eigene, klar bepreisbare Werte auf dem Item. *Am leichtesten
  zu balancieren (Defense entkoppelt von Schaden), aber weicht die Itemization-2.0-Reinheit auf.*
- **Mein Favorit:** **A1 als Basis + kleine explizite Klassen-Schicht (A2) obendrauf** — Attribute
  bleiben der Kern (Charakter-Identität), die Klassen-Schicht macht Gewichtsklassen fühlbar und
  balancierbar. „Hybrid", wie schon bei der Progression.

## Zweite Achse: Offensive Konter (deine Streitkolben-Idee)
Das ist ein SEPARATES System — es betrifft, wie der Spieler-ANGRIFF gegen die Defense von MONSTERN
wirkt (Spieler-DPS-Tiefe), nicht die Spieler-Überlebensparität. Waffen bekommen Konter-Traits gegen
Monster-Defense-Typen:

| Waffen-Trait | Kontert | Beispiel-Waffen |
|---|---|---|
| **Rüstungsdurchbruch** (Armor Pen) | Monster-Mitigation (gepanzerte Ritter/Golems) | Streitkolben, Kriegshämmer, Maul |
| **Präzision** (ignoriert Evasion) | flinke Monster mit hohem Ausweichen | Dolche, Speere, Präzisionsbögen |
| **Mana-Bruch / Bann** | Monster mit Ward/Magieschild (Caster, Wraiths) | bestimmte Stäbe, geweihte Waffen |

→ Manche Monster sind gepanzert (Streitkolben glänzt), manche flink (Präzision), manche geschirmt
(Mana-Bruch). Das gibt dem Bestiarium **taktische Vielfalt** und einen echten Grund, Waffen zu
wechseln/mitzunehmen — passt perfekt zu deinem „Combat ist fundamental / bau deinen Charakter". Und
es ist reine PvE-Tiefe, kein PvP-Balancing nötig.

## Was das berührt (Scope-Ehrlichkeit)
Das ist KEIN kleiner Pass — es ist faktisch **„Itemization 2.5"**:
- Alle ~215 Rüstungsteile bekommen ihre Klassen-Schicht (respread).
- `computeStats`: Defense-/Evasion-/Ward-Formeln je Klasse, EHP-parität über alle Level.
- Monster: Defense-TYPEN vergeben (Mitigation/Evasion/Ward) für die Konter-Achse — Bestiarium-Pass.
- Waffen: Konter-Traits (existierende WeaponEffect-Infrastruktur nutzbar).
- **Gate wie bei Itemization 2.0:** Parität-Sim (EHP aller 3 Stile ±10 % je Band), 0 geared-Walls,
  ehrliche Läufe je Stil.

## Offene Fragen für dich (Entscheidungspunkte)
1. **Varianz von Evasion:** Ausweichen ist RNG (Pechsträhnen möglich, Mitigation ist verlässlich). Ok
   so (Leder = riskanter Stil, dafür minimal höheres Ø-EHP als Ausgleich)? Oder Evasion „glätten"
   (z. B. garantiertes Ausweichen alle N Treffer)?
2. **Ward-Regeneration:** Regeneriert der Stoff-Ward IM Kampf (kein Natur-HP-Regen, aber Ward als
   eigene Sustain-Quelle für Magier)? Das gäbe Magiern eine Identität statt Food-Abhängigkeit.
3. **A1 vs A2 vs Hybrid** (siehe oben) — wie „rein" bleiben wir bei „nur Attribute auf Rüstung"?
4. **Umfang der Konter-Achse jetzt:** volles Monster-Defense-Typ-System sofort, oder erst die
   Überlebens-Trinität, Konter-Waffen später?

## Empfehlung zum Vorgehen
Kein sofortiger Umsetzungs-Agent. Wenn dir die Richtung (Defensive Trinität + Konter-Achse) gefällt,
ist der SAUBERE nächste Schritt: **ein balance-designer-Agent**, der aus der gewählten Variante eine
konkrete Zahlen-Spec macht (EHP-Kurven je Klasse/Tier/Level, Konverter-Raten, Monster-Defense-Typ-
Verteilung, Waffen-Pen-Werte) MIT Parität-Nachweis per Sim — analog zu `itemization-2-spec.md`. Erst
danach der Content-Apply + Gate. Aber zuerst: deine Entscheidung zu den 4 Fragen oben.
