# Band-3-Review — Onyx Vollend, der Vervollständiger

**Revier:** Aschechronik Kap. 9–12 (Krypta → Nekromant → Riesen/Jagd)
**Datum:** 2026-07-14 · **Quellen:** `packages/content/src/index.ts` (chronicle_09–12, Zonen/Dungeons/Monster), `design/lore/aschechronik-spec.md`
**Machbarkeit belegt:** headless (Port 5265, `story-tab-check.mjs`-Muster + `window.__hfDebug`, read-only, kein Content-Edit, kein Grind). Reward-Kurve, Gates und Story-Tab-Chips live aus dem ausgelieferten Build gelesen; Kap. 9–12 einzeln als aktives Kapitel gerendert. Skript nach dem Lauf gelöscht.

---

## 1 · Persona-Steckbrief

**Onyx Vollend, der Vervollständiger.** Completionist mit 100%-Zwang. Ich will jeden Token, jedes Gold, jede Freischaltung — und ich lese Reward-Kurven im Schlaf. Ich frage nicht „macht der Kampf Spaß", ich frage „lohnt sich der Haken". Eine Belohnung, die kleiner ist als die davor, ohne dass mir jemand erklärt warum, empfinde ich als Betrug am Fortschrittsversprechen. Wertlose oder inkonsistente Rewards sind meine Erzfeinde. Ich sammle alles; ein Kapitel ohne Trophäe im Belohnungs-Chip merke ich mir.

---

## 2 · Reward-Kurve des Reviers (live belegt)

| Kap | Token | Gold | Item | Schaltet frei | WO gekämpft wird |
|---|---|---|---|---|---|
| 09 | **2** | 2 500 | — | Zone **Die Krypta** | Schwarzdornwald |
| 10 | **2** | 3 500 | — | Dungeon **Tiefen der Krypta** | Die Krypta |
| 11 | **3** | 4 000 | — | Zone **Wildwald** | Die Krypta |
| 12 | **2** | 5 000 | — | Dungeon **Wildwald-Jagd** | Wildwald |

- **Gold:** streng monoton 2 500 → 3 500 → 4 000 → 5 000. Jeder Haken zahlt mehr als der letzte. Sauber.
- **Token:** 2 → 2 → **3** → 2 — nicht monoton. Der Boss-Ausschlag in Kap. 11 ist gut, aber Kap. 12 **fällt zurück auf 2**, obwohl es die größte Kill-Zahl des Reviers (30) verlangt und einen Dungeon öffnet. Kap. 13 springt sofort wieder auf 3. Kap. 12 ist damit die einzige Token-Senke des ganzen Krypta-Wildwald-Bogens (3→2→3).
- **Item-Chip:** im gesamten Revier **null**. Vier Kapitel am Stück nur Gold+Token; die nächste Trophäe (`bear_haunch`) kommt erst in Kap. 13. Laut Spec-Philosophie liegen die Chase-Items in den Boss-**Loot**-Tabellen, nicht im Quest-Chip — d.h. der echte Reiz von Kap. 11 ist `necrosignet_ring`/`nekro_reaperblade` + der garantierte `grave_warden_sigil`-Clear-Loot, nicht die 4 000 Gold. Für mich als Sammler funktioniert das, aber der Quest-Chip selbst liest sich vier Kapitel lang „nur Gold".

Alle „Schaltet frei"-Chips rendern korrekt und unterscheiden **Zone** von **Dungeon** (Dungeon-Chip trägt ein eigenes „Dungeon"-Label). Die Freischaltung ist damit klar als Belohnung ausgewiesen — genau das, was ich sehen will.

---

## 3 · Kapitel

### chronicle_09 — Der Chor unter den Hügeln / The Choir Beneath the Barrows
- Spaß: 7/10
- Einfallsreichtum: 7/10
- Machbarkeit: 9/10
- Notiz: Der Haken zahlt eine ganze neue Zone (Die Krypta) plus 2 500 Gold — ein Zonen-Unlock ist für mich ein fetter Tick, und er steht unübersehbar im Chip. 15 Hügelgrab-Choristen + der benannte Waldvogt (L65, Enrage) sind ein anständiges Ziel mit echtem Mini-Boss. Reward bleibt aber schlicht Gold+Token; die Idee („Tote singen mit Richtung") ist stärker als ihre Belohnung.
- Bug/Blocker: keiner.

### chronicle_10 — Das gebrochene Siegel / The Broken Seal
- Spaß: 7/10
- Einfallsreichtum: 8/10
- Machbarkeit: 9/10
- Notiz: Der größte Gold-Sprung des Reviers (+1 000 auf 3 500) und ein **Dungeon**-Unlock — seltener und größer als ein Zonen-Unlock, und die UI markiert das auch so. Das entschädigt spürbar für den gestrichenen `crypt_key`. Wermutstropfen: 40+10 = 50 Kills sind die grindigste Etappe des Bogens und zahlen trotzdem nur 2 Token; der Hohle Chor (Ward 220) ist für nicht-ward-brechende Builds ein Schwamm. Fühlt sich dennoch nach Meilenstein an.
- Bug/Blocker: keiner.

### chronicle_11 — Der Fürst der Tiefe / The Lord of the Depths
- Spaß: 8/10
- Einfallsreichtum: 8/10
- Machbarkeit: 9/10
- Notiz: Das rundeste Kapitel des Reviers. Ein einzelner Klimax-Boss, **3 Token** (Ausschlag nach oben) und der Wildwald-Unlock in einem — genau so soll sich ein Boss-Kapitel anfühlen: weniger Arbeit, mehr Auszahlung. Als Sammler mag ich außerdem die zwei Kill-Pfade: der Nekro steht offen in der Krypta (281 HP) UND als Dungeon-Endwelle (`dg_skeleton_nekro`, 379 HP) — beide kreditieren, ich werde nicht in genau einen Modus gezwungen.
- Bug/Blocker: keiner.

### chronicle_12 — Die Riesen / The Giants
- Spaß: 6/10
- Einfallsreichtum: 6/10
- Machbarkeit: 9/10
- Notiz: Hier stolpert die Kurve. 5 000 Gold ist das Höchste im Revier und der Wildwald-Jagd-Dungeon öffnet — aber der **Token-Rückfall von 3 auf 2** direkt nach dem Boss-Hoch ist ein Schlag ins Kontor: die größte Kill-Zahl (30, L97–104) plus ein Dungeon-Unlock zahlt weniger Token als der Einzel-Boss davor, und Kap. 13 stellt sofort wieder 3 her. Als Task ist es reiner 30er-Grind zweier Bestien, kein Boss, kein Item — das einfallsärmste Reward-Kapitel der vier. Die Enthüllung („der Wald ist gesund, nur nicht mehr für Menschen gebaut") ist stark, rettet die Belohnung aber nicht.
- Bug/Blocker: kein Blocker — aber die Token-Regression 3→2→3 (Kap. 11→12→13) an balance-designer melden. Kein Bug im Code (`tokenReward` ist bewusst gesetzt), sondern eine Kurven-Inkonsistenz, die genau ein Token-Completionist wie ich sofort bemerkt.

---

## 4 · Fazit (Onyx-Urteil)

Der Bogen trägt: Gold steigt monoton, jede Etappe schaltet sichtbar etwas frei (2 Zonen + 2 Dungeons, sauber als Chips ausgewiesen, Zone vs. Dungeon optisch getrennt), und die Krypta öffnet tatsächlich mit Kap. 9 — im Build verifiziert (`crypt.requiresQuest = chronicle_09`, Zonen-Chip „The Crypt" gerendert). Der Nekromant ist fair: L90, erreichbar aus dem gerade freigespielten Krypta-Levelband (Dungeon reqLevel 70 ≪ Spieler-Stand nach Kap. 10), mit zwei Kill-Pfaden statt Zwang. Die Kette ist außerdem soft-lock-frei — jedes Kapitel bekämpft Monster in einer bereits offenen Zone.

Zwei Reibungspunkte für meinen Typ:
1. **Token-Senke in Kap. 12** (3→2→3). Der einzige nicht-monotone Punkt des Reviers; für einen Token-Sammler liest er sich als Regression an der grindigsten Stelle. Empfehlung an balance-designer: Kap. 12 auf 3 Token heben (dann 09–13: 2/2/3/3/3, monoton nach dem Krypta-Sockel).
2. **Item-Dürre 09–12.** Vier Chips ohne Trophäe. Vertretbar, weil der Chase in den Loot-Tabellen liegt (nekro_reaperblade, grave_warden_sigil, alpha_fang etc.) — aber ein einziges thematisches Quest-Item im Krypta-Bogen (analog `bear_haunch` in Kap. 13) würde den Sammel-Reiz des Chips schließen.

Nichts davon ist ein Blocker. Alle Ziel-, Zonen- und Dungeon-IDs existieren, die Level-Bänder sind monoton, die Gates greifen — Machbarkeit belegt.
