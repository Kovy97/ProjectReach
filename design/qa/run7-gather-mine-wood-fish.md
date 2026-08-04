# QA Run 7 — Gathering: Mining · Woodcutting · Fishing

> Playtester-Persona: Gathering-Sammler (Mining + Woodcutting + Fishing). Fokus run7: Sind die in run6 benannten
> **zwei 9,5-Blocker** umgesetzt? — (1) **Holz-/Fisch-XP-Dips geglättet** (birchwood/willowbark/trout) und
> (2) **murkvein_bar bekommt eine Forge-Senke**. Plus: bleiben sonstige Pausen & Senken sauber?
> Methode: READ-ONLY Daten-Audit von `packages/content/src/index.ts` (actions/recipes/items). Temporäres
> Sim-Harness für xp/h & Dip-Erkennung über alle drei Gather-Leitern (`scratchpad/sim7.mjs`, nach Lauf entfernt).
> Vergleich: `run6-gather-mine-wood-fish.md` (war 9,3 — 2 Holz-Dips + 1 Fisch-Dip + murkvein_bar ohne Senke). Stand 2026-06-28.

## Fun-Score: **9,4 / 10**   (Δ vs run6: **+0,1**, war 9,3)

Von den zwei run6-Blockern ist **einer voll geliefert**, der andere **nur scheinbar**:

- ✅ **Blocker 2 (murkvein_bar-Senke) komplett gelandet.** `forge_murkvein_longsword`@L63 (2× `murkvein_bar` →
  `murkvein_longsword`) ist verdrahtet, das Gear-Item ist vollständig definiert (mainhand sword, meleeDamage 88 /
  accuracy 96, req attack 63). Der run6-P2 („defined but never applied") ist **erledigt** — die Kette
  murkvein_ore → smelt → bar → Gear schließt jetzt sauber. Für den Sammler bedeutet das: das geschürfte
  Trübergaderz führt end-to-end irgendwohin.
- 🔴 **Blocker 1 (Dip-Glättung) ist Whack-a-Mole — exakt wie von run6 vorhergesagt.** Die drei namentlich
  beklagten Dips (birchwood/willowbark/trout) **überholen jetzt jeweils ihren Vorgänger** ✓ — aber der XP-Bump
  hat um eine volle Rundungsstufe **überschossen**, sodass der Dip nicht verschwindet, sondern **eine Stufe nach
  oben auf den nächsten Original-Tier wandert**: `oak`, `ashbark`, `cod` dippen jetzt. Netto **3 Dips → 3 Dips**,
  nur verschoben — und in einem Fall (`cod`) sogar **tiefer** geworden (Lücke 386 → **720** xp/h).

Das hebt den Score wegen der echten Senken-Reparatur leicht über run6, aber der eigentliche 9,5-Blocker
(Tiefstufen-Monotonie) ist **nicht** gelöst. **Kein P0/P1.** Ein **P2** (Dip-Verschiebung, fehlgeschlagener
Zweitversuch). Rest P3.

---

## Verifikation der zwei run6-Blocker (frisch simuliert)

### Blocker 2 — murkvein_bar → Gear-Senke → **ERLEDIGT**
| | Run6 | Run7 |
|---|---|---|
| murkvein_ore → bar | `smelt_murkvein` (2 ore + 3 coal → bar) | unverändert vorhanden |
| **bar → Gear** | **kein Rezept** (Sackgasse, P2) | **`forge_murkvein_longsword`@L63** (2× bar → `murkvein_longsword`) |
| Gear-Item-Def | nur smelt-Output | **vollständig** (sword, meleeDamage 88 / acc 96, req attack 63, value 3000) |

Die in run6 gemeldete Halb-Sackgasse ist geschlossen. Sauber verdrahtet, vollständige Item-Definition. **Keine
Restschuld.**

### Blocker 1 — Dip-Glättung → **NUR VERSCHOBEN** (xp-only-Bump überschoss)
Code zeigt die Absicht (Kommentare `run6-fix: … muss ≥N (monoton)`). Die genannten Dips sind weg — aber je ein
neuer entsteht eine Stufe höher:

| Skill | run6-Dip | run7: Vorgänger geschlagen? | run7: neuer Dip eine Stufe höher |
|---|---|---|---|
| Wood | birchwood L5 2.250 < normal 2.571 | ✅ birchwood xp3 → **3.375** > 2.571 | 🔴 **oak L10 3.000 < birchwood 3.375** (−375) |
| Wood | willowbark L15 2.667 < oak 3.000 | ✅ willowbark xp4 → **3.556** > 3.000 | 🔴 **ashbark L20 3.200 < willowbark 3.556** (−356) |
| Fish | trout L10 2.700 < murk_perch 3.086 | ✅ trout xp4 → **3.600** > 3.086 | 🔴 **cod L15 2.880 < trout 3.600** (−720, *tiefer* als zuvor) |

**Ursache unverändert:** grobe Floor-Rundung auf kurzen Low-Level-Dauern. Bei `birchwood` (3200 ms) liegt kein
ganzzahliger xp-Wert zwischen `normal` (2.571) und `oak` (3.000): xp2 = 2.250 (zu tief), xp3 = 3.375 (zu hoch).
Ein reiner xp-Bump **kann** den Filler dort nicht zwischen die Nachbarn legen — es braucht **Dauer-Tuning** oder
das **UI-„Material-Tier"-Label**. run6 hatte genau das vorhergesagt: *„bei trout dann cod L15 prüfen — Floor-Rounding
macht low-tier-Monotonie zäh."* → eingetreten, cod ist jetzt der tiefste Dip der ganzen Fisch-Leiter.

---

## Senken-/Regressions-Check (frisch verifiziert)

| Prüfpunkt | Run7-Befund | Status |
|---|---|---|
| murkvein_ore → Senke | `smelt_murkvein` vorhanden | OK |
| **murkvein_bar → Gear** | **`forge_murkvein_longsword` verbraucht 2× bar** | **GEFIXT (run6-P2)** |
| Fisch → Cooking | alle Rohfische mit `cook_*` | intakt |
| Gem → Jewelcrafting | `cut_*` 1:1 zu Adern | intakt |
| Erz → Smithing | smelt-Kette für alle Erze inkl. murkvein | intakt |
| Tote Hölzer (willowbark/grimwood/ashfen/voidwood) | `fletch_*`-Schilde + birchwood→`fletch_bronze_bow` | intakt |
| Mining-Erz-Leiter (Dips) | **dip-frei** (coal 3.429 > iron 3.086 > … > murkvein 16.971) | unverändert, sauber |
| XP-Kurve / Grind 1→99 | `leveling.ts` unverändert (xp-Bumps nur an Mini-Tiers) | ~run6 (Wood ~269 h · Fish ~224 h · Mining ~210 h) |

**Keine tote Leiterstufe.** Mining bleibt komplett dip-frei. Einzige Wirkung der R5-Änderung: 3 Dips von den
**Filler-Tiers** auf die **Original-Tiers** verlagert.

---

## Findings — gereiht nach Hebelwirkung Richtung 9,5

### [P2-A] Dip-Whack-a-Mole — der xp-only-Bump hat überschossen, Dips nur verlagert (cod sogar tiefer)
Die drei namentlich gefixten Tiers schlagen jetzt ihren Vorgänger, aber überholen auch ihren **Nachfolger**:
`oak L10` (3.000 < birchwood 3.375), `ashbark L20` (3.200 < willowbark 3.556), `cod L15` (2.880 < trout 3.600).
Der xp-optimierende Sammler überspringt also weiter ein gerade freigeschaltetes Tier — nur ein anderes als in run6.
**`cod` ist mit −720 xp/h jetzt der tiefste Dip der gesamten Fisch-Leiter** (vorher war trout nur −386 tief): die
Reparatur hat die Magnitude an dieser Stelle **verschlechtert**. Das ist der **letzte echte 9,5-Blocker**.
**Fix (zwei saubere Optionen, statt erneut an xp zu drehen):**
1. **Dauer-Tuning** (legt den Filler garantiert *zwischen* die Nachbarn): birchwood ms 3200 → ~3850 (≈2.805 xp/h,
   zwischen normal 2.571 und oak 3.000); willowbark ms 4050 → ~4615 (≈3.120, zwischen oak 3.000 und ashbark 3.200).
   **Fishing braucht mehr als ein Tuning** — die Low-Kette `shrimp 2.400 < murk_perch 3.086 > cod 2.880` ist schon
   strukturell verhakt (cod liegt unter murk_perch). Hier müssen `cod` (xp4→6 ⇒ 4.320) **und** `ghostfin_pike`
   (xp5→7 ⇒ 4.582) koordiniert mit angehoben werden, sonst kaskadiert der Dip weiter.
2. **UI-„Material-Tier"-Label** (run5/run6-Dauerempfehlung): die Low-Filler als Material-Tier markieren, dann
   erwartet der Spieler dort keine xp/h-Monotonie. **Killt die ganze Klasse auf einen Schlag**, ohne Zahlenfrickelei
   — nach **zwei** fehlgeschlagenen xp-Bump-Runden die robustere Wahl. (UI-Modul, nicht Gathering-Daten.)

### [P3-A] Größte verbleibende Level-Pausen — UNVERÄNDERT
- Woodcutting: **ironbark L45 → bloodoak L55** (10 Level) — größte Holzlücke.
- Fishing: **salmon L35 → duskfin_carp L45** (10 Level) — größte Fischlücke.
- Mining (reines Erz): **gravesteel L22 → mithril L35** (13 Level) — durch garnet/bloodstone in der kombinierten
  Leiter überbrückt; nur für reine Erz-Schürfer spürbar. Bleibt der „nächste Kandidat" für ein Zwischen-Erz @~L28.
Alle drei steigen sauber im xp/h drüber; reine Dichte-Notiz, kein Leerlauf. **Fix (optional):** je ein Zwischen-Tier.

### [P3-B] Kombinierte-Leiter-Interleave & Gem-Lücke — UNVERÄNDERT (kosmetisch)
Gem-Adern L35→L55 (sapphire→ruby, 20 Level) in der kombinierten Mining-Leiter durch adamantite/murkvein überbrückt.
Winzige Interleave-Dips zwischen Erz/Gem-Pfaden bleiben kosmetisch (getrennte Pfade). Aus run6 übernommen.

---

## Δ vs run6
- **Blocker 2 (murkvein_bar):** **ERLEDIGT** — `forge_murkvein_longsword`@L63 + vollständiges `murkvein_longsword`.
  Der run6-P2 ist geschlossen; die Erz-Kette schließt end-to-end.
- **Blocker 1 (Dip-Glättung):** **nur scheinbar** — die 3 benannten Dips schlagen ihren Vorgänger, der Bump
  überschoss aber → 3 neue Dips eine Stufe höher (oak/ashbark/cod). Netto **3 → 3**, `cod` mit −720 sogar **tiefer**.
- **Mining:** weiter dip-frei, unverändert. Senken sonst 100 % verdrahtet, keine Regression.
- **Grind & XP-Kurve:** unverändert (~Wood 269 h / Fish 224 h / Mining 210 h).
- **Fun-Score 9,3 → 9,4** — der **+0,1 trägt allein die murkvein-Senke**; der Gather-Loop selbst hat sich nicht
  verbessert (Tiefstufen-Erlebnis lateral bis minimal schlechter).

## Was fehlt für 9,5? (konkret)
**Ein** Eingriff — aber diesmal richtig, nicht zum dritten Mal per xp-Bump:
1. **Tiefstufen-Dips strukturell auflösen statt verschieben (P2-A).** Empfehlung nach zwei gescheiterten
   xp-Runden: **UI-„Material-Tier"-Label** für die Low-Filler (birchwood/willowbark/trout & Co.) — setzt die
   xp/h-Erwartung zurück und killt die ganze Dip-Klasse auf einen Schlag. **Oder** Dauer-Tuning + koordinierte
   Fishing-Anhebung (birchwood ms→~3850, willowbark ms→~4615; cod xp→6 **und** ghostfin_pike xp→7 zusammen).
   Reines Weiter-Drehen an einzelnen xp-Werten reproduziert nur das Whack-a-Mole.

Optional Richtung 10/10: je ein Zwischen-Tier für die drei 10–13-Level-Pausen (Wood L45→55, Fish L35→45,
Mining-Erz L22→35).

## Verdict
Run7 schließt sauber den **kleineren, aber konkreten** der zwei run6-Blocker (murkvein_bar hat jetzt eine echte
Gear-Senke, vollständig verdrahtet) → **9,3 → 9,4**. Der **größere** Blocker (Tiefstufen-Dips) wurde **nicht**
gelöst, sondern per überschießendem xp-Bump nur **eine Stufe nach oben verschoben** (oak/ashbark/cod), wobei `cod`
mit −720 xp/h sogar tiefer dippt als der ursprüngliche trout-Dip — exakt das von run6 vorhergesagte Whack-a-Mole.
Unter 9,5 bleibt es daher aus **einem** klaren Grund: die Low-Tier-Monotonie braucht endlich die strukturelle
Lösung (UI-Material-Label oder Dauer-Tuning), nicht eine dritte xp-Bump-Runde.
