# Story-Review Band 4 — Thane Steinmut, der Veteran

*Aschechronik-Kapitel 13–17 (Jagd / Küste / Schlackengrube / Hochland / Horst). Simulations-Spieler-Bewertung, 2026-07-14.*

## 1 · Persona-Steckbrief

- **Name:** Thane Steinmut, der Veteran.
- **Archetyp:** Hardcore / Herausforderungs-Sucher.
- **Spielstil:** Sucht die Wand. Bewertet die Gear-Kurve und ob Machbarkeit „verdient" ist statt geschenkt. Verachtet Trivialität, respektiert faire Härte.
- **Gear-Fokus:** Optimiert den Build gezielt gegen den nächsten Wall — wechselt Waffentyp, Runen und Rüstungsprofil, sobald ein Kapitel eine neue Achse verlangt.
- **Wer ich bin:** Der Spieler, der seine Genugtuung aus überwundenen Wänden zieht. Ein Kapitel, das mich durchwinkt, ist für mich kein Sieg, sondern eine verschenkte Seite.
- **Kapitel:** chronicle_13 bis chronicle_17 (Boss-Ausblick auf roc_void/chronicle_18 mitgeprüft, weil ch17 dessen Tor öffnet).
- **Session-Stats:** 58 deterministische Engine-Sim-Zellen (`simulateCombat`, seed 5, read-only) über drei Läufe: prep-freier Gear-Floor (21 Zellen, titanium→godiron Melee), Precision-Achse (13 Zellen, Scimitar/Speer/Langbogen gegen die Hochland-Rocs), prepared-Decke (24 Zellen, `buildBisCharacter` tank+damage × 3 Stile mit T3-Runen, Max-Suffixen, Pet, Voll-Buff-Stack). Kein Vollzeit-Grind, keine App-Instanz, kein Langläufer; Wegwerf-Skripte nach dem Lauf entfernt.

## 2 · Methode & Beleg-Grundlage

Gelesen: `packages/content/src/index.ts` (chronicle_13–18 + alle Ziel-Monster-Statblöcke), `design/lore/aschechronik-spec.md`, `design/balance-drazhan-audit.md` (Gear-Band-Referenz: „6 %-maxHp/s-Heil-Decke", „Runen-Schicht ist DAS Gate", Threat-Spec-Boss-Kurve). Eine eigene `armor-trinity-boss-audit.md` existiert nicht; die Trinitäts-Befunde stammen aus dem Drazhan-Audit §6 und `idol-sanctum-clear.test.ts`.

Statt eines Browser-Ports (5267) habe ich den kanonischen Balance-Pfad genommen: den deterministischen Engine-Sim (`simulateCombat` / `buildBisCharacter`), denselben, mit dem das Drazhan-Audit arbeitet. Er beantwortet die Machbarkeitsfrage direkter als ein UI-Fixture und bleibt strikt read-only. Wichtige Lesart der Zahlen:

- **Der Floor-Sim trägt KEINE Runen/Tonika/Suffixe/Auto-Trank** — nur Gear + Food + Auto-Eat. Er misst den prep-freien Boden. Ab `GEAR_BAND_START = 100` ist es *by design*, dass dieser Boden wallt (`sim.test.ts` asserted die Hochland-Bosse bewusst NICHT als besiegbar). Ein Floor-Wall ist also KEIN Balance-Bug, sondern die Aufforderung, die Prep-Schicht anzulegen.
- **Die BiS-Decke** (`buildBisCharacter`) beweist die Gegenrichtung: ist der Boss überhaupt bezwingbar oder bugged-unbeatable? Der tank-Archetyp überlebt jeden Band-4-Boss mit 0–1 Toden — sie sind alle schlagbar. Der realistische Spieler liegt zwischen Floor und Decke (die „craft"-Klasse des Drazhan-Audits: Götzeneisen-Platte + T3 keen/aegis-Runen, kein reiner Stat-Stick).

**Gear-Kurve der Band (Anforderung steigt monoton):** Monster-Level 112/120 → 128/138 → 175/188 → 215/237 → 222 (Boss) → 233 (Boss); Zonen-Bänder L120→155→200→242; Gear titanium(Req 80)→aetherium(90)→godiron(99); ab ch15 wird die Runen/Tonika-Schicht Pflicht, ab ch16 zusätzlich eine Genauigkeits-Achse gegen Evasion 82–86. Kein unfairer Zahlensprung; die Härte-Inflexion bei ch16 ist ein Mechanik-Wechsel (Evasion), nicht bloß größere Zahlen — und die Lore kündigt ihn an („der Schleier ist dünn", der Wächter wird einsilbig).

---

## 3 · Kapitel-Bewertungen

### chronicle_13 — Die alte Jagd / The Old Hunt
- Spaß: 7/10
- Einfallsreichtum: 7/10
- Machbarkeit: 8/10
- Notiz: Ein sauberer Schlussstein für den Wildwald: Heulen, dann der Große Hirsch, der Schreckenswolf, zuletzt der Altbär als Dungeon-Endboss. Die Eskalations-Dramaturgie gefällt mir, und der Altbär ist ein ehrliches Vieh-Duell (Evasion 28, dmg 63) ohne Trick — genau das, was nach einem ganzen Band Aufbau als Ritus passt. Die Gear-Kurve ramp't fair: titanium/CL85 am Floor holt den Boss (7 Kills bei 8 Toden = knapp, aber gewinnbar), godiron/99 walzt ihn (22 Kills, 1 Tod). Kein Wall, aber auch nichts geschenkt — der richtige Ton zum Bandbeginn.
- Bug/Blocker: keiner. `forest_bear` ist `dungeonOnly` und kreditiert über die Basis-ID auf chronicle_13 (Fix-Welle O), sauber verdrahtet.

### chronicle_14 — Was die See heimträgt / What the Sea Gives Back
- Spaß: 6/10
- Einfallsreichtum: 7/10
- Machbarkeit: 8/10
- Notiz: Erzählerisch der stärkste Ruhepunkt der Band — die zurückgetragenen Flotten, die Sirene als einziges Register der See. Nur: mechanisch ist es reiner Doppel-Zähler-Grind (30 Riff-Ertrunkene + 10 Sirenen), kein Boss, keine neue Achse. Nach dem Jagd-Finale von ch13 fühlt sich das für meinen Geschmack zu geschenkt an: reef_drowned fällt am Floor 43×/0 Tode, die Sirene 22×/2 Tode. Ein Veteran blättert das durch, ohne den Build anzufassen. Die Feasibility ist tadellos, die Forderung fehlt.
- Bug/Blocker: keiner.

### chronicle_15 — Die kalte Esse / The Cold Forge
- Spaß: 8/10
- Einfallsreichtum: 8/10
- Machbarkeit: 7/10
- Notiz: Hier bekommt die Band ihre Zähne — und ihr bestes Kapitel. Das Zeugen-Geständnis des Wächters (der schattenlose Mann beim Guss der Kränze) ist der narrative Höhepunkt, und die zwei Gesichter der Grube sind auch mechanisch geerdet: iron_revenant (Armor 90, resist burn/bleed) ist ein Mitigation-Check, frost_hexer (Ward 204, resist frost) ein Ward-/DPS-Check. Endlich zählt, WAS ich anlege. Am prep-freien Floor ist der Eishexer bereits eine echte Wand (aetherium/93: nur 5 Kills bei 16 Toden; titanium darunter 2/22) — er verlangt aetherium plus die Runen/Tonika-Schicht. Beweisbar bezwingbar mit Prep, ehrlich hart. Verdient.
- Bug/Blocker: keiner.

### chronicle_16 — Der dünne Himmel / The Thin Sky
- Spaß: 8/10
- Einfallsreichtum: 8/10
- Machbarkeit: 6/10
- Notiz: Die Wand, auf die ich gewartet habe. Das Hochland stapelt zwei neue Achsen in ein Kapitel: die Rocs (Evasion 78–82, der Precision-Showcase) und den Klippengeist (Ward 926, Evasion 9 — das genaue Gegenteil). In einem Kapitel wird die ganze Trinität durchdekliniert, das ist einfallsreich. Aber es ist brutal: der prep-freie Floor wallt komplett — sogar godiron/99 mit Langbogen holt 0 Kills gegen roc_elder, ein reines Schwert trifft die Evasion-84-Vögel praktisch nie. Die Decke beweist Machbarkeit (BiS-tank überlebt mit 0 Toden), aber die realistische Lösung ist ein genau austarierter Build: Precision-Waffe/keen-Runen GEGEN Evasion UND Panzer/aegis fürs Überleben, gleichzeitig. Für einen Brute-Melee-Puristen grenzt der Evasion-Soft-Gate an unfair; für mich als Optimierer ist es die verdienteste Wand der Band. Machbarkeit runter, weil die Fairness hier vom Build-Willen des Spielers abhängt, nicht mehr nur vom Gear-Tier.
- Bug/Blocker: keiner — aber ein Balance-Hinweis an den Chef/balance-designer: die Härte von ch16/17 lebt fast ausschließlich von der Evasion-Achse. Wer stur Schwert spielt, sieht eine gefühlte „Unbesiegbar"-Wand statt eines lesbaren „rüste um"-Signals. Ein In-Kontext-Hinweis (Genauigkeit/Precision zählt hier) wäre die faire Geste.

### chronicle_17 — Der Horst / The Aerie
- Spaß: 8/10
- Einfallsreichtum: 7/10
- Machbarkeit: 7/10
- Notiz: Ein einzelner gestaffelter Festungs-Boss statt Grind — genau mein Kapitel. Der Sturmbringer (roc_storm L222, 2072 HP, Evasion 84, Schock-Inflict, Enrage ×1,7 unter 30 %) ist der härteste Einzel-Check der Band, zusammen mit dem Leerenroc (roc_void L233), dessen Tor ch17 gleich mitöffnet. Beleg: der prep-freie Floor holt gegen roc_storm über ALLE Loadouts 0 Kills (aetherium, titanium, godiron/99, Schwert wie Langbogen wie Speer) — die Evasion-84-Wand plus Boss-HP plus Enrage ist der reine Prep-Gate. Die Decke bestätigt Bezwingbarkeit: BiS-tank überlebt beide Bosse mit 0 Toden (roc_void magic 0 Tode), stirbt nie, braucht aber lange — die Schadensschicht muss der Spieler selbst mitbringen. roc_void ist im Sim minimal härter als roc_storm (Evasion 86, +HP, resist shock schließt das Schock-Fenster). Beide sind schlagbar, aber sie verlangen den vollen optimierten Balance-Build. Das ist die Genugtuung, für die ich spiele — knapp unter der Fairness-Sorge von ch16, weil ein Boss-Check ehrlicher signalisiert „bereite dich vor" als ein 25er-Trash-Zähler.
- Bug/Blocker: keiner. `roc_storm`/`roc_void` `dungeonOnly`, kreditieren direkt auf chronicle_17/18; Gates sauber (`highland_aerie`←ch16, `wyvern_lair`←ch17).

---

## 4 · Band-Fazit (Thane)

Die Band fährt eine saubere Härte-Kurve mit einer bewussten Inflexion: ch13 fair, ch14 zu weich (der einzige „geschenkte" Eintrag), ch15 setzt die Zähne mit Mitigation-/Ward-Checks an, ch16/17 ziehen die Evasion-Wand hoch, die den Band-Charakter ausmacht. Nichts ist bugged-unbeatable — die BiS-Decke besiegt jeden Boss mit 0–1 Toden. Nichts ab ch15 ist geschenkt — der prep-freie Floor wallt, wie er soll. Meine einzige echte Sorge ist die Lesbarkeit der Evasion-Achse: Für einen stur brachialen Melee-Spieler kann ch16/17 wie eine grundlose Mauer wirken, obwohl es „rüste auf Genauigkeit um" heißt. Das ist keine Balance-Panne, sondern ein Signal-Problem. Wer es liest, bekommt genau die verdiente Wand, die diese Band zur besten macht, die ich in Grim Reach bislang erklommen habe.

**Belegte Machbarkeit (Auszug, `simulateCombat` seed 5, 20-min-Fenster, prep-freier Floor / `buildBisCharacter`-Decke 15-min):**

| Kapitel | Ziel-Boss/Mob (Lvl) | Floor band-gerecht | Floor Untergear | Decke (BiS-tank, bester Stil) |
|---|---|---|---|---|
| 13 | forest_bear (120) | titanium/85: 7 Kills / 8 Tode | bloodiron/75: 5 / 7 | godiron floor: 22 Kills / 1 Tod |
| 14 | tide_siren (138) | titanium/85: 22 / 2 | bloodiron/75: 16 / 6 | (trivial, nicht nötig) |
| 15 | frost_hexer (188) | aetherium/93: 5 / 16 | titanium/85: 2 / 22 | — |
| 16 | roc_elder (215) | aetherium/93: 0 / 27 | titanium/85: 0 / 44 | magic 2 Kills / 0 Tode (450 s/Kill) |
| 16 | gravecliff_specter (237) | aetherium/93: 0 / 44 | — | magic 3 / 0 (300 s, wardBreak) |
| 17 | roc_storm (222) | aetherium/93: 0 / 41 | godiron/99: 0 / 39 | magic/ranged 1 / 0 (900 s) |
| 18 | roc_void (233) | godiron/99: 0 / 41 | aetherium/93: 0 / 54 | magic 1 / 0 (900 s) |

Lesart: „0 Kills am Floor" ab ch16 ist der gewollte Prep-Gate (Runen/Tonika/Suffixe fehlen dem Floor); „0–1 Tode an der Decke" belegt, dass der prepared Spieler die Bosse bezwingt. Die langen s/Kill-Werte der Decke stammen vom Survival-Stat-Stick (tank-Archetyp, ~22 dmg) — der realistische Balance-Build der „craft"-Klasse (Platte + keen/aegis-Runen + Schadens-Suffixe) tötet spürbar schneller bei niedrigem Todesrisiko. Härte-Rangfolge der Band: ch17/ch18-Bosse > ch16 > ch15 > ch13 > ch14.
