# Sweep 2 — 01 · Ranged-Kampfstil (tief)

**Fokus:** Bögen/Pfeile/Köcher end-to-end via `SimPlayer` gespielt — Equip-Gates, Pfeil-Tier-vs-Monster-Level,
Köcher-Verbrauch/Nachschub, Munitions-Stopp, Ranged-DPS-Kurve über 12 Tiers, Bogen→Pfeil-Verfügbarkeit.
Methode: temporäres Vitest-Skript mit echtem `SimPlayer` (angelegt, gelaufen, wieder gelöscht).

## Verifizierte Fixes — WIRKEN ✅ (nicht als Bug gemeldet)

- **Pfeil-Drops tier-nach-Monster-Level** — bestätigt. Voller Monster→Pfeil-Dump, 0 „zu-hoch"-Flags:
  `chicken(L1)→copper_arrow (3-8)`, `goblin_archer/gaze_basilisk(L22)→iron/steel`, `ash_tyrant(L45)→mithril`,
  `forest_warden(L65)→runite`, `wild_stag(L104)→aetherium`, ab L120 →godiron. **Kein** Monster mit Level ≤ 3
  droppt `iron_arrow`. Der alte „iron_arrow auf Lv1"-Fehler ist zu.
- **Bogen ohne Fletching-Gate ausrüstbar** — bestätigt. `copper_shortbow` equipt bei `fletching L1` (nur
  `ranged`-Req zählt). Deckt `ammo-quiver.test.ts` Chef #10.
- **Köcher-Verbrauch/Nachschub/Stopp** — bestätigt. Kampf zieht aus `ammoCount` (40→29 in 30 s), leerer
  Köcher stoppt sauber (`stopReason="outOfAmmo"`, `combat.ts:835`), Nachfüllen addiert, falsche Sorte feuert
  nicht. Exakte Tier-Bindung erzwungen (Bogen feuert NUR seinen `ammoType`).
- **Ranged-DPS-Kurve steigt monoton** über alle 12 Tiers (kills/60 s vs goblin, level-skaliert):
  `copper 7 → steel 12 → mithril 17 → runite 22 → titanium 30 → godiron 33`. **0 Regressionen.**

---

## Findings

### P2 · [bug/balance] Kurzbogen verliert sein Klassen-Merkmal (Tempo) auf den 4 untersten Tiers — CONFIRMED
Die Sektions-Definition sagt „SHORTBOW: 0.52·D, **−150 aIMs**, +critChance, +evasion"
(`packages/content/src/index.ts:2664`). Tatsächlich fehlt `attackIntervalMs: -150` auf **copper / bronze /
iron / steel** shortbow (`index.ts:2665-2692`) und ist erst ab **blacksteel** gesetzt (`index.ts:2693-2748`).
`computeStats` addiert diesen Wert direkt aus dem Item (`character.ts:250`, `eq.attackIntervalMs`); der globale
Ranged-`×0.90` (`character.ts:261`) gilt für Kurz- UND Langbogen gleich — es gibt **keinen** weaponType-basierten
Ausgleich, der das kompensiert.

**Folge:** Für ranged L1-29 ist der Kurzbogen **strikt schlechter** als der gleich-Tier-Langbogen: geringerer
`rangedDamage` (z. B. steel 10 vs 12) UND identisches Angriffstempo. Der Kurzbogen hat keinerlei Existenzgrund
im gesamten Frühgame; der Spieler wählt eine Falle.

Sim-Evidenz (kills/60 s vs goblin, gleicher Level):
```
copper      shortbow=7   longbow=7    (gleich — Kurzbogen hat KEINE Tempo-Kante trotz weniger Schaden)
steel       shortbow=12  longbow=12   (gleich — dito)
blacksteel  shortbow=14  longbow=12   (Kurzbogen zieht vor — HIER greift -150 endlich)
mithril     shortbow=16  longbow=15   (Kurzbogen vorn)
```
Der Bruch liegt exakt an der copper/bronze/iron/steel-Grenze — kein gewollter Gradient, sondern ein Vergessen
der 4 untersten Einträge. **Owner: Content-Dev** (`attackIntervalMs: -150` in die 4 shortbow-`bonus`-Blöcke).

### P3 · [bug/feel] Kurzbogen-„+evasion" ist auf ALLEN Tiers unverdrahtet — CONFIRMED
Der Sektions-Kommentar (`index.ts:2664`) verspricht Kurzbögen `+evasion`; **kein einziger** der 12 Kurzbögen
trägt einen `evasion`-Bonus. Zusätzlich wurde der frühere pauschale Ranged-`evasion += 5` bewusst entfernt
(`character.ts:252-254`, Paritäts-Fix). Ergebnis: Der Kurzbogen hat **null** Ausweich-Identität — weder aus
Stil noch aus Gear. Entweder Kommentar veraltet oder Bonus nie ergänzt. **Owner: Content-Dev** (evasion an
Kurzbögen geben ODER den Kommentar bereinigen).

### P3 · [balance] Pfeil-Schadensleiter hat Flatspot: steel == blacksteel — CONFIRMED
`ammoDamage`-Leiter: copper1 bronze2 iron3 **steel5 → blacksteel5** mithril7 … Der Sprung von `steel_arrow`
auf `blacksteel_arrow` (`index.ts:431-432`) bringt **0** zusätzlichen Pfeil-Schaden, obwohl blacksteel ein
höherer Tier ist (Bogen-Req 30 vs 20, value 6 vs 4). Der Guard `ranged.test.ts` prüft nur
copper<iron<steel<mithril<runite — dieser Nachbar-Vergleich fällt durchs Raster. **Owner: Content-Dev**
(blacksteel_arrow ammoDamage 5→6).

### P3 · [balance/feel] Bogen→Pfeil-Drop-Lücke für 4 Tiers (fletch-only) — SUSPECTED
Da ein Bogen NUR seinen exakten Tier-Pfeil feuert, braucht jeder Bogen-Tier eine Nachschubquelle für genau
diesen Pfeil. Quellen-Audit:
```
copper      shop+drop+fletch      bloodiron   fletch    <-- kein Drop, nicht im Shop
bronze      fletch                titanium    fletch    <-- kein Drop, nicht im Shop
iron        shop+drop+fletch      aetherium   drop+fletch
steel       drop+fletch           godiron     drop+fletch
blacksteel  fletch  <-- kein Drop, nicht im Shop
mithril/adamantium/runite  drop+fletch
```
**bronze / blacksteel / bloodiron / titanium** Pfeile droppen von KEINEM Monster und liegen NICHT im Shop →
ausschließlich per Fletching beschaffbar. Ein Spieler mit einem dieser 4 Bogen-Tiers kann seine Munition beim
Grinden **nicht aus Loot nachfüllen** (die Pfeile, die im Level-Band droppen, sind der falsche Tier und passen
nicht in den Bogen → Munitions-Stopp). Jeder Pfeil hat EINE gültige Quelle (fletch), daher **kein Blocker** —
und wahrscheinlich als „Fletching = Munitions-Ökonomie des Ranged-Mains" gewollt (vgl. Skill-Kommentar
`content/index.ts:28`). Nur berichten. **Owner: Content-Dev / Balance (Chef-Domäne).**

---

## Notiz (kein Finding — bewusster Fix)
`godiron_arrow` ammoDamage = 38 macht am Leiter-Ende einen +90 %-Sprung (aetherium 20 → godiron 38) vs. sonst
~15-20 % pro Stufe. Das war der bewusste P1-Endgame-Buff (Briefing: „godiron 25→38"). Die Leiter-Spitze ist
dadurch uneben, aber gewollt — nicht als Bug gewertet.

---

## Kurz-Zusammenfassung
- **P0:** 0 · **P1:** 0 · **P2:** 1 · **P3:** 3
- Alle vier explizit gefixten Ranged-Punkte (Pfeil-Tier-nach-Level, kein Fletching-Gate, Köcher-Verbrauch/Stopp,
  DPS-Kurve) **verifiziert & wirksam** — keine Regressionen.

**Top-3:**
1. **P2** Kurzbogen fehlt `attackIntervalMs: -150` auf copper/bronze/iron/steel → strikt schlechter als
   Langbogen für L1-29 (Klassen-Identität kaputt). `content/index.ts:2665-2692`.
2. **P3** Kurzbogen-`+evasion` auf allen Tiers unverdrahtet + Kommentar veraltet. `content/index.ts:2664`.
3. **P3** Pfeil-Leiter-Flatspot steel==blacksteel (ammoDamage 5==5). `content/index.ts:431-432`.

**Empfehlung:** fix-then-ship — der Kurzbogen-Tempo-Fix (P2) ist ein kleiner, sicherer Content-Edit
(4 `bonus`-Blöcke) und heilt den Ranged-Frühgame-Build-Trade; die P3-Punkte sind Chef-Balance-Politur.
