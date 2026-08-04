# Aschechronik Band 2 (Kap. 5–8) — Sim-Spieler-Review

**Persona:** Davorin Blutklinge, der Kampfsucher
**Revier:** `chronicle_05`–`chronicle_08` + Bosse `goblin_warchief`, `ash_tyrant`, `rootling_treemonster`
**Datum:** 2026-07-14
**Methode:** Content-Lesung (`packages/content/src/index.ts`, `design/lore/aschechronik-spec.md`) + headless Machbarkeits-Sim über die Engine (`simulateCombat`, gate-neutralisierte Sim-Content-Sicht), band-gerechtes Gear, 120 s/Lauf, Auto-Eat mit Band-Food.

---

## 1 · Persona-Steckbrief

Ich lese keine Chronik. Ich lese Trefferzahlen. Ein Kapitel ist für mich genau so viel wert wie der Kampf, der am Ende steht: Wie fühlt sich der Boss an, wann geht er in Enrage, zwingt er mich, meinen Build zu verteidigen, oder ist er nur ein Sack Lebenspunkte mit Prosa drumherum? Sammeln langweilt mich, „Durchgang statt Sieg" beleidigt mich. Ich trage das beste Waffen-Tier meines Stils (Nahkampf, STR) und will, dass es einen Unterschied macht. Der Wächter darf so viel schreiben, wie er will — mich interessiert, ob der Kriegshäuptling zurückschlägt, wenn ich ihn in die Ecke dränge.

---

## 2 · Machbarkeits-Beleg (Sim, band-gerechtes Gear)

Nahkampf-Held (STR/CON-Seed), Kampf-Skills = Bandlevel, Schwert+Schild sofern nicht anders vermerkt. Tier-Leiter nach Anforderung: Stahl 20 < Schwarzstahl 30 < Mithril 40 < Adamant 50 < Runit 60.

| Ziel | Level | Gear | secPerKill | Tode/120 s |
|---|---|---|---|---|
| `ash_tyrant` (Kap.7) | 45 | Schwarzstahl, CL40 (unter Band) | 40 | 0 |
| `ash_tyrant` | 45 | **Mithril, CL45 (Band)** | 30 | 0 |
| `ash_tyrant` | 45 | Mithril-Großschwert, CL45 | 30 | 1 |
| `goblin_warchief` (Kap.5) | 60 | **Adamant, CL55 (Dungeon-Gate)** | 40 | 0 |
| `goblin_warchief` | 60 | Runit, CL60 | 30 | 0 |
| `goblin_warchief` | 60 | Runit-Großschwert, CL60 | 30 | 1 |
| `rootling_treemonster` (Kap.8) | 62 | **Runit, CL60 (Band)** | 30 | 0 |
| `rootling_treemonster` | 62 | Runit, CL62 | 30 | 0 |
| Trash-Referenz `ash_rat` L30 | — | Mithril CL45 | 8 | 0 |
| Trash-Referenz `pitch_beetle` L42 | — | Mithril CL45 | 20 | 0 |
| Elite `goblin_siegebrute` L55 | — | Adamant CL55 | 20 | 0 |
| Elite `goblin_bloodshaman` L57 | — | Adamant CL55 | 24 | 0 |

**Fazit Machbarkeit:** Alle drei Bosse fallen mit band-gerechtem Gear ohne einen einzigen Tod. Der Warchief ist sogar mit dem reinen Dungeon-Gate-Set (L55 Adamant) sauber schlagbar — kein Wall. Bosse liegen bei ~30–40 s/Kill, Trash bei 8–24 s: Bosse fühlen sich messbar meatiger an als ihre Wellen (2–4×), das stimmt. Der einzige Ausrutscher: reine Glass-Cannon-Großschwert-Builds (kein Schild) fressen an Enrage-Bossen einen gelegentlichen Tod, ohne dafür schneller zu killen — dazu unten mehr.

---

## 3 · Kapitel-Wertungen

### chronicle_05 — Das Kriegsbanner / The War Banner
- Spaß: **8/10**
- Einfallsreichtum: **7/10**
- Machbarkeit: **9/10**
- Notiz: Das ist das Kapitel, für das ich gekommen bin. Ein echter Dungeon (goblin_warband), fünf benannte Wellen in Heerschau-Ordnung — Vorhut, Speerwand, Belagerungslinie, Blutritus — und am Ende ein Boss mit Enrage (1,4× ab 35 % HP). Der Enrage ist real: mit Schild überlebe ich ihn glatt, mit blankem Großschwert kostet er mich hin und wieder das Leben. Genau so soll sich der letzte Schlagabtausch anfühlen. Zwei Wermutstropfen: (1) der Warchief selbst dropt NUR Material (shaman_totem/dim_essence/ember_essence) — die Beute liegt in der Dungeon-Truhe (warbanner_cape/warlock_felstaff), nicht auf dem Kadaver, und ein Boss ohne eigene Gear-Beute fühlt sich mager an. (2) Mein Großschwert killt ihn keine Sekunde schneller als Schwert+Schild — die „bestes Waffen-Tier"-Jagd zahlt hier nicht ein.
- Bug/Blocker: keiner.

### chronicle_06 — Die Aschelektion / The Ash Lesson
- Spaß: **3/10**
- Einfallsreichtum: **2/10**
- Machbarkeit: **10/10**
- Notiz: Eine Predigt mit Tötungsauftrag. 30 Ungeziefer plus 10 Irrlichter, kein Boss, kein Moment, an dem irgendetwas kippt. Ratte 8 s, Irrlicht 11 s, Käfer 20 s — ich laufe da durch und höre dem Wächter beim Reden nicht zu. Als faire Sammel-/Übergangsstufe funktioniert es, aber für einen Boss-Jäger ist es Leerlauf. Wenigstens ist es kurz und ehrlich als das etikettiert, was es ist.
- Bug/Blocker: keiner.

### chronicle_07 — Der König des Aas / The Carrion King
- Spaß: **5/10**
- Einfallsreichtum: **3/10**
- Machbarkeit: **9/10**
- Notiz: Der große Aas-König der Aschfelder — und mechanisch der flachste „Boss" des Bandes. Kein Enrage, kein Inflict, keine Phase: 136 HP, Rüstung 40, resist:burn, fertig. 30 Sekunden gleichförmiges Auto-Attack gegen einen Lebenspunkte-Sack. Die Brand-Resistenz ist die einzige „Mechanik" und die juckt nur Feuer-Magier, nicht mich. Bitterste Ironie: seine Loot-Tabelle (ashen_reaper 2 %, ashfall_recurve, ash_tyrant_crown als Chase) ist REICHER als die des echten Dungeon-Bosses aus Kap.5. Ein benannter Zonen-Boss ohne eine einzige Kampf-Idee ist für mich eine vertane Gelegenheit. Gib ihm einen Fress-Heal bei niedrigem HP oder einen Enrage, dann ist er ein König; so ist er Elite-Trash mit Titel.
- Bug/Blocker: keiner (Design-Hinweis: benannter Boss ganz ohne enrage/inflict).

### chronicle_08 — Dornen / Thorns
- Spaß: **5/10**
- Einfallsreichtum: **6/10**
- Machbarkeit: **8/10**
- Notiz: 30 Wurzling-Trash, dann der Alte Baumriese. Die Lore sagt ausdrücklich „Durchgang, nicht Sieg" — der Höhepunkt ist also mit Absicht gedämpft, und das merkt man. ABER: die ganze Wurzling-Linie ist bleed/gift-immun, das entwertet DoT-Builds und zwingt zu rohem Schaden — ein echter Build-Check, den ich respektiere. Der Baumriese hat obendrauf Regen (0,4/s) und Enrage (1,5× ab 30 %). Damit ist er das besser designte Monster des Bandes — nur dass er ein freier Zonen-Boss ist, den man nebenbei antaggt, begraben unter einer Trash-Quote. Der Regen ist bei Band-DPS so klein, dass er nie beißt (er ist praktisch Deko statt DPS-Check). Gutes Monster, schwach in Szene gesetzt.
- Bug/Blocker: keiner (Regen so niedrig, dass der DPS-Check am Band folgenlos bleibt).

---

## 4 · Davorins Gesamturteil zu Band 2

Ein Band mit genau einem richtigen Boss-Fight: **Kap.5, der Kriegshäuptling**, ist das Herzstück — Wellen-Gauntlet plus Enrage, sauber schlagbar am Gate, härter für Glass-Builds. Das ist die Vorlage, an der ich die anderen drei messe, und sie fallen ab. **Kap.6** ist Sammel-Pflicht ohne Kampf-Reiz (fair, aber langweilig). **Kap.7** verschenkt seinen einzigen benannten Boss an ein mechanikfreies HP-Fass. **Kap.8** hat das interessanteste Monster (Immunitäten + Regen + Enrage), traut sich aber nicht, es als Boss zu inszenieren.

Zwei systemische Punkte über die Kapitel hinweg, die mich als Gear-Jäger stören:
1. **Boss-Loot-Inversion:** Der freie Zonen-Boss (ash_tyrant) hat die bessere Beute als der Dungeon-Boss (warchief, nur Mats). Bei einem Dungeon-Endboss erwarte ich die dickste eigene Tabelle.
2. **Waffen-Tier ohne Wirkung am Boss:** Großschwert killt die Bosse dieses Bandes nicht schneller als Schwert+Schild, kostet aber Überleben. Die Motivation, das „beste Waffen-Tier meines Stils" zu jagen, zahlt am Boss nicht ein — das nimmt genau meinem Spielertyp den Antrieb.

Machbarkeit über den ganzen Band: **grün, kein Wall.** Kampf-Gefühl: **ein Höhepunkt (Kap.5), drei Enttäuschungen unterschiedlichen Grades.**
