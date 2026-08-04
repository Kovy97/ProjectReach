# Level-Leiter-Analyse: Zonen ↔ Dungeons ↔ Hauptquest-Kapitel (Task #338)

**Datum:** 2026-07-25 · **Autor:** Balance-Designer · **Status:** Analyse + Vorschlag, KEINE Edits — Chef-Entscheid ausstehend.
**Datenquelle:** ausschließlich `packages/content/src/index.ts` (Live-Katalog, per Skript extrahiert), Engine-Verhalten aus `packages/engine/src/{combat,dungeon}.ts`, Guards aus `packages/engine/src/progression-band.test.ts`.

---

## 0. Kurzantwort auf den Chef-Befund

1. **„Blackthorn-Dungeon Lvl 82" existiert nicht.** Der Schwarzdornwald (45–65) hat **gar keinen Dungeon**. Der 82er ist „Die Wildwald-Jagd" (`wildwood_hunt`), Trägerzone **Wildwald-Jagdgründe** (Monster 90–112). Zwei Wald-Zonen direkt hintereinander + die Dungeon-Karte zeigt ihre Trägerzone **nirgends** an → die Jagd liest sich wie „der Dungeon vom Schwarzdornwald". Die Reihenfolge ist in den Daten korrekt: Krypta-Dungeon (Kap. 10, Gate 70) kommt VOR der Jagd (Kap. 12, Gate 82).
2. **„Krypta 65–90, Dungeon nur 70":** Beide Zahlen stimmen, meinen aber **zwei verschiedene Skalen**. Zonenkarten zeigen „Lv min–max" = **Monster-Level**; Dungeon-Karten zeigen „Lv n" = **benötigte Kampfstufe des Charakters** (CL, Cap 99). Gleiche Beschriftung „Lv", zwei Bedeutungen — das ist die Wurzel des „willkürlich"-Eindrucks. Inhaltlich ist 70 trotzdem zu niedrig angesetzt (Boss der Krypta-Tiefen ist L90 + dg-Aufschlag): Empfehlung 70 → **75** (Begründung §4).
3. Ab dem Wildwald **divergieren die Skalen absichtlich** (Monster bis L310, CL-Cap 99; „Gear-Band"-Philosophie aus dem Threat-Spec/Endgame-Re-Tiering). Nicht willkürlich, aber unlesbar, solange die UI beide Zahlen gleich beschriftet. Der größte Hebel ist darum **Anzeige**, nicht Zahlenverschiebung.

---

## 1. IST-Aufnahme

### 1.1 Zonen-Leiter (Weltmonster-Band, ohne dungeonOnly/dg_-Varianten — exakt was die Zonenkarte anzeigt)

| Zone | Band (Monster-Lv) | Freischaltung | Kapitel-Inhalt der Zone | Anzahl Weltmonster |
|---|---|---|---|---|
| pastures | 1–15 | frei | Kap. 1–3 | 6 |
| borderlands | 15–30 | chronicle_03 | Kap. 4 (+Dungeon Kap. 4/5) | 10 |
| ashfields | 30–45 | chronicle_04 | Kap. 6–7 | 7 |
| blackthorn | 45–65 | chronicle_07 | Kap. 8–9 | 10 |
| crypt | 65–90 | chronicle_09 | Kap. 10 (+Dungeon Kap. 10/11) | 11 (+3 dg_-Varianten) |
| wildwood | 90–112 | chronicle_11 | Kap. 12 (+Dungeon Kap. 12/13) | 4 |
| coast | 120–155 | chronicle_13 | Kap. 14 | 5 |
| slagpit | 155–200 | chronicle_14 | Kap. 15 | 8 |
| highlands | 200–242 | chronicle_15 | Kap. 16 (+2 Dungeons Kap. 16/17, 17/18) | 6 |
| idolhall | — (nur Dungeon-Finale) | chronicle_18 | Kap. 19, 20 (2 Dungeons) | 0 (5 dungeonOnly) |
| slayer_tower | 3–96 | frei (Slayer-System) | — | 27 |

Die Zonen-Bänder sind eine **lückenlos anschließende Leiter** (15→15, 30→30, 45→45, 65→65, 90→90, 112→120, 155→155, 200→200). Auf der Monsterskala ist hier NICHTS verkehrt.

### 1.2 Dungeon-Leiter (alle 7 Story-Dungeons + Turm)

| Dungeon | Trägerzone (Band) | reqLevel (CL) | Kreaturen (Lv, letzte = Boss) | Gate (Kapitel) | Boss-Kapitel | XP/Clear | Gold/Clear |
|---|---|---|---|---|---|---|---|
| goblin_warband | borderlands (15–30) | **45** | 50, 52, 55, 57, **60** | chronicle_04 | chronicle_05 | 350 | 600 |
| crypt_depths | crypt (65–90) | **70** | 65, 68, 75, 80, **90** (dg-Aufschlag: dmg +6/+6/+5 auf Wellen 3–5) | chronicle_10 | chronicle_11 | 700 | 1200 |
| wildwood_hunt | wildwood (90–112) | **82** | 97, 104, 112, **120** | chronicle_12 | chronicle_13 | 950 | 1100 |
| highland_aerie | highlands (200–242) | **90** | 200, 208, 215, **222** | chronicle_16 | chronicle_17 | 3200 | 3600 |
| wyvern_lair | highlands (200–242) | **95** | 208, 222, 228, **233** | chronicle_17 | chronicle_18 | 4500 | 5000 |
| idol_sanctum | idolhall (—) | **95** | 245, 260, 275, **295** | chronicle_18 | chronicle_19 | 15000 | 12000 |
| behind_the_throne | idolhall (—) | **95** | **310** (nur Boss) | chronicle_19 | chronicle_20 | 24000 | 8000 (bewusst < sanctum, Farm-Loop-Nerf, s. balance-drazhan-audit) |
| paragon_tower | — | 100 (rein kosmetisch, Sortierung) | Etagen-Formel | chronicle_21/paragon_key | — | — | — |

**CL-Gate-Kette entlang der Kapitel: 45 (K4) ≤ 70 (K10) ≤ 82 (K12) ≤ 90 (K16) ≤ 95 (K17) ≤ 95 (K18) ≤ 95 (K19) — bereits monoton.** Der Monotonie-Guard (progression-band.test.ts, Test 2) hält das fest; es gibt KEINE echte Reihenfolge-Inversion in den Daten.

### 1.3 Anzeige-Situation (CombatPage.tsx)

- Zonenkarte: `combat.zoneLevels` = „Lv {min}–{max}" aus **Monster-Leveln** (Z. 4086–4088, 4179).
- Dungeon-Karte: `combat.dungeonLevel` = „Lv {n}" aus **requiredLevel** (CL-Skala, Z. 4271); **Trägerzone wird nicht angezeigt, Kreaturen-Level auch nicht.**
- Dungeon-Grid sortiert nach requiredLevel (Z. 3869).

---

## 2. Anomalien-Liste (vollständig, A1–A9)

| # | Befund | Schwere | Einordnung |
|---|---|---|---|
| A1 | **Skalen-Kollision in der Anzeige:** „Lv" heißt auf Zonenkarten Monster-Level, auf Dungeon-Karten Charakter-Kampfstufe. Ab Wildwald (Monster > CL-Cap 99) laufen die Skalen auseinander (bis L310). | **Hoch** | Wurzel des Chef-Befunds; reine UI-/i18n-Sache. |
| A2 | **Dungeon-Karten nennen ihre Trägerzone nicht.** „Wildwald-Jagd Lv 82" ist dadurch dem Schwarzdornwald zuordenbar (zwei Wald-Namen nebeneinander). | **Hoch** | Erklärt „Blackthorn-Dungeon 82". |
| A3 | **crypt_depths Gate 70 vs. eigener Boss L90 (+dg-Aufschlag):** Gate liegt am Band-ANFANG (65), obwohl der Lauf die Abschlussprüfung der Zone ist. Auf CL 70 endet der Run realistisch als Wipe ab Welle 3–5 — die Wand ist da, aber nicht LESBAR (Karte verspricht „Lv 70"). Zudem bindet 70 praktisch nie: Kap.-10-Pflicht (40 Kills bis L85-Pyroclasp + 10× L80-Chor) trägt den Spieler ohnehin auf ~CL 75+. | Mittel | Zahlen-Retune sinnvoll (§4). |
| A4 | **wildwood_hunt Gate 82 (CL) „unter" dem Zonen-Band 90–112 (Monster):** mechanisch stimmig (nach Kap. 12 hat man ~CL 80–85), liest sich aber als Inversion. | Niedrig | Durch A1/A2-Fix erledigt; Zahl kann bleiben. |
| A5 | **goblin_warband Gate 45 vs. Kreaturen 50–60:** KEIN Fehler. 45 = exakt das Band-Top der einzigen offenen Grind-Zone (Aschfelder 30–45, öffnet mit Kap. 4 VOR der Wand — das Aschfelder-Muster). Gate 50 würde Grind ÜBER das verfügbare Band hinaus verlangen (nur ash_tyrant L45 / Slayer-Turm) — schlechter. Die L50–60-Crew auf CL 45 ist die gewollte Undergeared-Wand; unlesbar ist nur, dass die Karte die Kreaturen-Level verschweigt. | — | 45 behalten; Kreaturenband anzeigen (§4). |
| A6 | **Gold-Leiter-Knick:** crypt_depths 1200 g (Kap. 10) > wildwood_hunt 1100 g (Kap. 12). XP-Leiter ist monoton (350<700<950<3200<4500<15000<24000), Gold nicht. (throne 8000 < sanctum 12000 ist dokumentiert gewollt.) | Niedrig | 1100 → 1300 (§4). |
| A7 | **5 von 10 Kampfzonen haben keinen Dungeon** (pastures, ashfields, blackthorn, coast, slagpit). Die zwei „Dungeon-Wüsten" der Reise (Kap. 6–9 und Kap. 14–15) decken sich exakt damit. | Beobachtung | Content-Lücke, kein Balancing-Fehler; NICHT Teil dieses Vorschlags (Scope). |
| A8 | **Wildwald ist dünn:** 4 Weltmonster (davon forest_hare L90 mit nur 192 XP), Band 90–112. Trägt ein CL-Gate 82→90-Fenster allein kaum. | Beobachtung | Grind weicht auf Krypta/Turm aus; ok, aber erklärt, warum sich die Strecke leer anfühlt. |
| A9 | **`monster.level` ist KEIN reines Anzeigefeld.** Es speist (a) Gegner-Accuracy ab L150 (`enemyEffectiveAccuracy`, +0.35/Lv über 150), (b) den Kampf-XP-Multiplikator (Spieler-Skill vs. Monster-Level, immer), (c) Suffix-Roll-Tier bei Drops, (d) giantSlayer-Effekte. | **Wichtig** | Kreaturen-LEVEL-Umnummerierung ist darum faktisch eine Balance-Änderung — kollidiert mit „Leben und Schaden nicht zerstören". S. Option B (§4.3). |

---

## 3. Soll-Prinzip (aus den gesunden Fällen abgeleitet)

1. **Zonen:** Monster-Band schließt lückenlos ans Vorgänger-Top an (IST bereits überall erfüllt — nicht anfassen).
2. **Dungeon = Abschlussprüfung seiner Trägerzone:** öffnet per Gebiets-Kapitel, sein Boss-Kill IST das Folgekapitel. (IST bereits überall erfüllt — Welle-K-Muster.)
3. **CL-Gate eines Dungeons = was der zum Gate-Zeitpunkt verfügbare Grind-Pfad realistisch liefert**, nicht was der Boss verlangt — der Boss bleibt die echte Prüfung (Undergeared-Wand gewollt). Solange Monsterskala ≈ CL-Skala (bis Krypta) heißt das konkret: **Gate ≈ Boss-Level − 15** (warband: 60−15 = 45 ✓; crypt: 90−15 = **75**, IST aber 70). Ab Wildwald (Skalen getrennt) gilt nur noch: monoton, in ~5er-Sprossen Richtung 95.
4. **Reward-Leiter (XP UND Gold) monoton entlang der Kapitel**, dokumentierte Ausnahmen (throne-Gold) erlaubt.
5. **Beide Skalen sichtbar machen:** Ein Gate darf hart sein, aber nie überraschend — jede Dungeon-Karte nennt Trägerzone, CL-Anforderung UND Kreaturen-Band.

---

## 4. SOLL: Alt → Neu

### 4.1 Zahlen (Katalog, `packages/content/src/index.ts`)

| Dungeon | Feld | Alt | **Neu** | Begründung (1 Zeile) |
|---|---|---|---|---|
| crypt_depths | requiredLevel | 70 | **75** | Boss−15-Muster (wie warband 45/60); Kap.-10-Abschluss trägt ohnehin auf ~75+, das Gate wird ehrlich statt Wipe-Einladung; Leiter 45<75<82 bleibt monoton und gleichmäßiger als 45<70<82. |
| wildwood_hunt | gold | 1100 | **1300** | Gold-Leiter monoton: 600 < 1200 < 1300 < 3600 < 5000 (XP-Leiter ist schon monoton). |
| goblin_warband | requiredLevel | 45 | **45 (bleibt)** | 45 = Band-Top des einzig offenen Grind-Pfads (Aschfelder); die L50–60-Crew ist die gewollte Wand — „ehrlich" wird sie über die Anzeige (4.2), nicht über 50. |
| wildwood_hunt | requiredLevel | 82 | **82 (bleibt)** | Nach Kap.-12-Pflicht (30× L97–104) hat man ≥82; Zahl passt in die CL-Leiter, das Lesbarkeits-Problem ist A1/A2. |
| highland_aerie / wyvern_lair / idol_sanctum / behind_the_throne | requiredLevel | 90/95/95/95 | **unverändert** | Endgame-Re-Tiering (Chef-GO 2026-07-10) + Gesamtbogen-Review 2026-07-14 bleiben gültig; Kette monoton. |

### 4.2 Anzeige (ui-dev, kein Katalog-Balancing)

| # | Maßnahme | Wirkung |
|---|---|---|
| U1 | Dungeon-Karte zeigt **Trägerzone** („Zone: Wildwald-Jagdgründe"). | Beerdigt die Blackthorn-Verwechslung endgültig. |
| U2 | Dungeon-Karte zeigt **Kreaturen-Band** („Kreaturen Lv 50–60") zusätzlich zum CL-Gate. | Macht die Warband-/Krypta-Wand lesbar: „Zutritt ab Kampfstufe 45 — drinnen wartet Lv 50–60." |
| U3 | Label trennen: Dungeon-Karte „**Kampfstufe {n}**" (Begriff existiert schon in `combat.dungeonNeedLevel`) statt „Lv {n}"; Zonenkarte behält „Lv {min}–{max}". | Beendet die Skalen-Kollision A1 mit einem Wort. |

Neue/geänderte i18n-Keys in **7 Sprachen** (translations.ts + locales/zh, ru, ptBR, fr, es): 1 geänderter (`combat.dungeonLevel`), 2 neue (Zone-Zeile, Kreaturen-Zeile).

### 4.3 Option B — Kreaturen-LEVEL-Normalisierung (separat ausgewiesen, NICHT empfohlen, nicht eingepreist)

Man könnte die Monster-Level ab Wildwald auf die CL-Skala stauchen (z.B. wildwood 90–112 → 83–90), damit „eine Zahl = eine Skala" gilt. **Impact:** `monster.level` ist mechanisch live (A9) — Stauchen unter 150 ändert den Kampf-XP-Multiplikator und Suffix-Tiers, Stauchen über 150 zusätzlich die Gegner-Trefferchance (Evasion-Tempo-Spec §3.2 hängt daran!). Das wäre ein Re-Balancing des halben Endgames durch die Hintertür und verletzt Anker 1 im Geiste. **Empfehlung: verwerfen; A1/A2/A3-Fix über Anzeige + Gate-Zahl reicht.**

---

## 5. Spieler-Reise-Check (Kapitel für Kapitel, mit SOLL aus §4)

CL-Schätzungen aus Band-Logik + `design/story-review/gesamtbogen-corvin.md` (Live-Durchlauf); exakte Stunden-Werte: **offen** (kein neuer Sim-Lauf, Auftrag). Corvins Taktung gilt weiter: Kapitel selbst = 10–60 min, die echten Fristen sind die CL-Gates.

| Kap. | Ort / Pflicht | Spieler-CL (Schätzung) | Gate davor | Gefühl |
|---|---|---|---|---|
| 1–3 | Weiden, bull_boss L15, the_imp | 1→~15 | — | zügig |
| 4 | Grenzlande, 30+15 Goblins (L15–30) | ~15→30 | — | zügig; **öffnet Aschfelder UND Warband-Dungeon** |
| 5 | Warband-Boss (Warchief L60, Dungeon-Gate CL 45) | ~30 → Wand | **1. Wand: CL 45** + Gear | Erster Tempobruch (gewollt); Grind-Pfad Aschfelder liegt bereits offen — Muster intakt. Mit U2 steht „Kreaturen Lv 50–60" dran: Wand wird angekündigt statt erlitten. |
| 6–7 | Aschfelder (L30–45), ash_tyrant | 45→50 | — | „Trivial-Tal" dokumentiert (Corvin Befund 3): Content unter Spieler-Level — Preis der 45er-Wand, bekannt und akzeptiert. |
| 8–9 | Schwarzdorn (L45–65), Treant L62, Warden L65 | 50→~62 | — | wieder on-level; **kein Dungeon in der Zone (A7)** |
| 10 | Krypta, 40 Skelette (bis L85) + 10 Chor (L80) | ~62→75 | — | längster Zähler der ersten Hälfte (Corvin) |
| 11 | Krypta-Tiefen-Boss (Nekro L90; Zonen-Alternative: Welt-Nekro L90) | ~75–80 | **Gate NEU 75** (statt 70) | Mit 75 bindet das Gate genau dort, wo Kap. 10 einen abliefert — kein zusätzlicher Grind, aber ehrliche Karte. |
| 12 | Wildwald, 30× Wolf/Hirsch (L97/104) | ~78→83 | Zone ab Kap. 11 | erster „Monster-Lv > CL"-Moment — mit U3 als Skalenwechsel lesbar |
| 13 | Jagd-Boss (Altbär L120, Gate CL 82) | ~83 | Gate 82 | fließend |
| 14 | Küste (L120–155), 30 Ziele | ~83→88 | — | Gear-Band-Mitte, kein Dungeon (A7) |
| 15 | Schlackengrube (L155–200), 20 Ziele | ~88→92 | — | dito |
| 16 | Hochland, 25 Rocs + 8 Specter L237 | ~92 | Aerie-Gate 90 | Evasion-Wand (Corvin #3), verdient hart |
| 17–18 | Aerie-Boss → Wyvern-Boss | ~92→95 | Gate 95 (Wyvern) | letzte Level-Frist vor dem Finale |
| 19–20 | Sanktum → Thron | 95+ | Gates 95 | seit 99→95-Review bewusst kampf- statt levelgegated |

**Fazit Reise:** Nach §4 gibt es genau zwei gewollte Level-Wände (Kap. 5: CL 45, Kap. 17/18: CL 95) und eine ehrlich gemachte Prüfungs-Tür (Kap. 11: CL 75). Nichts an der Kapitel-REIHENFOLGE muss sich ändern.

---

## 6. Umsetzungs-Impact

| Bereich | Impact |
|---|---|
| **Dateien/Felder** | `packages/content/src/index.ts`: `crypt_depths.requiredLevel` 70→75 (+Kommentar-Update der dokumentierten Ladder „warband(45) < crypt(75) < wildwood(82)…" an DREI Stellen: crypt_depths-, behind_the_throne-, goblin_warband-Kommentar); `wildwood_hunt.gold` 1100→1300 (+Ökonomie-Kommentar). UI: `apps/client/src/renderer/pages/CombatPage.tsx` (Dungeon-Karte U1–U3) + `i18n/translations.ts` + `i18n/locales/{zh,ru,ptBR,fr,es}.ts`. |
| **Guards/Tests** | `progression-band.test.ts`: Guard A Zonen-Assertions unberührt (kein dungeonOnly-Monster in crypt_depths ⇒ `levelForTarget` ändert sich für kein Quest-Ziel); Monotonie-Guard grün (45 ≤ 75 ≤ 82 ≤ 90 ≤ 95…). `content-integrity.test.ts` `monsterGate`: unberührt (gleicher Grund). Kein Guard nagelt 70/1100 als Konstante fest. **Keine Test-Anpassung nötig.** Turbo-Cache beachten (`pnpm test` frisch laufen lassen). |
| **Save-Kompat** | `requiredLevel` wird statuslos live geprüft (`canEnterDungeon`, dungeon.ts Z. 156) — **bestätigt, keine Migration, kein SAVE_VERSION-Bump**. ABER: Der `dungeonsUnlocked`-Bestandsschutz überstimmt nur Quest-/Zonen-Gates, NICHT den Level-Check ⇒ ein Live-Spieler mit CL 70–74, der gestern crypt_depths farmen konnte, steht nach dem Patch kurz davor. Kein Datenverlust, UI erklärt es („Erfordert Kampf-Niveau 75 · Dein Level: 7x"); für Patchnotes erwähnen. |
| **i18n/Anzeige** | 1 geänderter + 2 neue Keys × 7 Sprachen; Dungeon-Karten-Layout wächst um 1–2 Meta-Zeilen (Karten sind seit 22.07. kompakter gewollt — ui-dev soll die Zeilen zusammenlegen: „Kampfstufe 45 · Kreaturen Lv 50–60 · 5 Wellen"). |
| **Nicht anfassen** | Kreaturen-Stats UND Kreaturen-Level (A9/Option B), Zonen-Bänder, Kapitel-Kette, alle übrigen requiredLevel, throne-Gold (dokumentierter Nerf), paragon_tower (100 kosmetisch). |

### Apply-Liste (geordnet, für content-dev/ui-dev nach Chef-GO)

1. content-dev: `crypt_depths.requiredLevel: 70 → 75` + Ladder-Kommentare an den 3 Stellen aktualisieren.
2. content-dev: `wildwood_hunt.gold: 1100 → 1300` + Ökonomie-Kommentar.
3. ui-dev: Dungeon-Karte — Trägerzone (U1) + Kreaturen-Band min–max aus `encounters` (U2) + Label „Kampfstufe {n}" (U3); i18n 7 Sprachen; danach `pnpm build` (stale-build-Regel).
4. kontrolleur: `pnpm test` frisch (Turbo-Cache!), Sichtprüfung Dungeon-Grid, Patchnote-Zeile für den 70→75-Lockout.
