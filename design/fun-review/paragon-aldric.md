# Fun-Review: Paragonturm — „Aldric Steigeisen, der Kletterer"

**FUN-SWEEP des CEO-Loops 2026-07-14 · Tester F5 · 2026-07-16**

## Persona-Steckbrief

Aldric ist der Spieler, für den der Turm DAS Spiel nach dem Spiel ist. Er sucht EIN endloses
System, das ihn Monate trägt, und misst Etagen-Progression an Roguelite-Maßstäben: Steigt die
Spannung pro Etage? Ist der Tod ein „nochmal!" oder ein „wozu?"? Gibt es Build-Anpassung
zwischen Läufen? Seine Kernfrage an Grim Reach: **Kann ich an diesem Turm wochenlang klettern?**

## Session-Stats

- 2 Playwright-Sessions (headless, Port 5294, Fixture `endgame`, Locale de), 12 Screenshots,
  0 Page-Errors. Erlebt: Locked-Karte → Unlock → Etage-1-Kampf live (Clear nach 72 s) →
  Boss-5- und Etage-20-Preview via `__hfDebug` → Tod auf Etage 20 → Panel nach dem Tod →
  Stats-Medaillon → Kapitel 21 als aktives Chronik-Kapitel (3/5-Fortschritt).
- 6 deterministische Engine-Kletter-Sims (echte `deserialize`+`step`-Ticks, Wegwerf-vitest):
  Erstaufstieg as-is, mit 5000 Food, Defensiv-Stance, Re-Climb nach Tod, plus Kontrolllauf
  gegen die Pool-Monster in Normalform.
- Systemumfang: endloser Etagen-Turm (Cap 5.000), 1 Etage = 1 Kampf, Pause nach jeder Etage,
  Checkpoint persistiert, Tod → Etage 1 (Rekord bleibt). Formel: HP 900·1,12^(f−1),
  Schaden 70·1,055^(f−1), Genauigkeit 20+0,6·f; Ertrag flach 300·1,035^(f−1). Jede 5. Etage
  Boss (×2 HP, ×1,15 dmg) + Meilenstein-Truhe (Basis / Soulopal ab E10 / 5 Chase-Items
  @1,5 % + Suffix-Chance ab E20). Pool: 5 threat-getunte L175–242-Monster, Rotation.

## Erlebte Momente

**1. Das Versprechen stimmt — der erste Blick nach oben ist gut.** Locked-Karte („Paragon-
Schlüssel gesucht"), dann das Panel: „ETAGE 1 · Rekord: 0", Monster-Preview, Boss-Rhythmus- und
Tod-Regel-Hinweis, ein satter „Aufstieg beginnen"-Button. Im Kampf ein eigenes
„🗼 Paragonetage 1"-Banner, beim Clear ein goldener Legendary-Toast „Neuer Rekord! Etage 1" —
und weil die Etagen-Monster ihre Identität behalten, fiel im selben Moment organisch das
Boss-Achievement „Eiserner Wille" (Eisenrevenant) plus Bestiarium-/Slayer-Credit. Diese
Verzahnung ist vorbildlich. Aber: Der allererste Kampf dauerte 72 Sekunden. Etage 1 eines
Endlos-Turms, mit dem besten Gear des Spiels, zäher als jeder Trash-Kampf — als Kletterer
erwarte ich unten Tempo und oben Widerstand, nicht überall denselben Brei.

**2. Die Wand steht auf Etage 3 — und sie erklärt sich nicht.** Der kanonische Endgame-Char
(Ges.-Lv 1915, last_idol-Chase-Drops angelegt) stirbt am Verkohlten Schicksalsritter auf
Etage 3. Mit 15 Food. Mit 5000 Food. Mit Defensiv-Stance (+50 % Ward-Regen). Immer Etage 3.
Der Grund steht nicht in der Preview: Die §7-Formel skaliert nur HP/Schaden/Genauigkeit,
aber **Rüstung 90–170, Regeneration, Enrage ×1,75–1,8, Burn-/Schock-Inflicts und Ausweichen 86
(Leerenroc, Etage 4!) bleiben roh vom L175–242-Basis-Monster**. Mein Kontrolllauf zeigt: 3 der
4 direkt kämpfbaren Pool-Monster töten diesen Char auch in ihrer NORMALEN Form. Der Turm fängt
also nicht an der Decke des Story-Endgames an, sondern oberhalb davon. Ein Turm, dessen Etage 1
schon Endgame-Plus verlangt, hat keine Steigung — er hat nur Wand.

**3. Kapitel 21 schickt mich auf Etage 5 — die ich nicht erreichen kann.** Die Quest-Seite
macht alles richtig: „Epilog: Der zweite Band · Erreiche Etage 5 des Paragonturms ·
📍 Der Paragonturm · 3/5" mit Fortschrittsbalken, Wächter-Zitat, 10.000 Gold + 5 Marken. Der
Turm als Epilog und Band-2-Haken ist erzählerisch genau mein Futter. Nur: Etage 5 ist eine
Boss-Etage — derselbe Schicksalsritter, der mich auf Etage 3 tötet, mit 2.832 HP, Enrage ×1,8
und Meilenstein-Truhe, die ich nie öffnen werde. Das letzte Kapitel der Hauptstory ist mit dem
besten Story-Gear und beiden Stances nicht abschließbar (möglich, dass perfekte
Enchant-/Suffix-Rolls die Wand 1–2 Etagen schieben — aber ein Epilog, der perfekte Rolls
voraussetzt, bleibt ein Blocker).

**4. Der Tod ist ehrlich, aber der Wiederaufstieg ist Arbeit statt Rausch.** Tod auf Etage 20:
Das Popup benennt Monster und Regel („🗼 Zurück auf Etage 1."), der Rekord bleibt sichtbar
stehen („Etage 1 · Rekord: 19") — faires Roguelite-Handwerk. Zwei Dinge kippen es: Erstens
sagt dasselbe Popup eine Zeile darüber „Kein Verlust: Du behältst alles" — nach 19 verlorenen
Etagen liest sich das wie Hohn. Zweitens gibt es keinerlei Zwischencheckpoint (bewusst „später",
laut Spec), und der Re-Climb ist derselbe 1,5–2-Minuten-Kampf plus Heilpause PRO Etage, jede
einzeln von Hand gestartet. Mein Sim-Re-Climb über nur 2 Etagen kostete bereits 3,4 Minuten;
hochgerechnet auf Rekord 19 sind das 40+ Minuten identischer, entscheidungsfreier Wiederholung.
Das ist ein „wozu?", kein „nochmal!".

**5. Das „eine Etage noch"-Moment stirbt am Scrollweg.** Nach jedem Clear endet der Kampf
(als Checkpoint-Pause richtig!), aber die UI wirft mich auf die Zonen-Auswahl ganz oben —
der Turm wohnt am SEITENENDE der Kampfseite, unter acht Dungeon-Karten. Der Kern-Loop des
Systems ist also: runterscrollen → Button → 2 Minuten zuschauen → wieder hochgeworfen werden.
Kein „Weiter: Etage N+1"-Knopf im Clear-Moment, kein Auto-Aufstieg-Toggle. Dazu ist die
Preview-Karte, das strategische Herz des Panels, visuell kaputt: Auf 1920×1080 sind Monster-Name
und alle drei Stat-Kacheln abgeschnitten („VERKOHLTER …", „LE… 1…", „SC… 2…" statt 15.503
Leben / 223 Schaden) — ausgerechnet die Zahl, die mir sagt, dass Etage 20 mich oneshottet
(223 Schaden gegen 242 Max-HP), ist unlesbar. Und der Eishexer zeigt „774 Leben", verschweigt
aber seine 234 Ward.

## Bewertungsbogen — Paragonturm (Aldric Steigeisen, der Kletterer)

- Spaß sofort (erste 5 Minuten): 5/10
- Spaß über Zeit (Stunden/Tage, simuliert): 2/10
- Sucht-Faktor („eine Runde noch"): 3/10
- Belohnungs-Dichte & Dopamin-Momente: 2/10
- Ziel-Klarheit (warum mache ich weiter?): 8/10
- Tiefe & Entscheidungen (denken statt klicken?): 4/10
- Frustfreiheit (10 = kein Frust): 3/10
- Verzahnung mit dem Rest des Spiels: 8/10
- GESAMT-SUCHT-URTEIL: 3/10
- Komme ich morgen wieder? Nein — solange Etage 3 die Decke des besten bekannten Builds ist,
  gibt es dort oben für mich nichts zu klettern.

Begründung der Ausreißer: Ziel-Klarheit und Verzahnung sind echte Stärken (Rekord im Panel,
Kapitel-21-Anschluss mit Ortsmarke und Fortschritt, Stats-Medaillon ab der ersten Etage,
Kill-Credit in Bestiarium/Slayer/Achievements, Truhen-Staffelung als klare Chase-Achse).
Spaß über Zeit und Belohnungs-Dichte scheitern an der Realität: Ertrag pro Etage ist bewusst
flach (≈420 Gold + Cap-irrelevante XP je ~2 min), die erste Truhe (E5) und erst recht die
Chase-Truhen (E20) liegen hinter einer Wand auf Etage 3, es gibt keine Paragon-Achievements,
keine Turm-eigene Meta-Progression, und das planmäßige „Ende" der Endlos-Achse ist Oneshot
(Schadenskurve überholt die statische Max-HP ~E20) oder Patt-Abbruch. Endlos auf dem Papier,
15 Minuten in der Praxis.

## Top-3-Sucht-Verbesserungen

1. **Die Einstiegskurve an den Kap.-19-Sieger kalibrieren.** Wer den Letzten Götzen legt und
   den Schlüssel trägt, muss Etage 1–10 in der ersten Session schaffen (Kap.-21-Ziel E5
   inklusive) — Ziel-TTK Etage 1 ≤ 30 s. Konkreter Hebel: die Sekundärwerte der Basis-Monster
   (Rüstung/Ausweichen/Regen/Enrage/Inflict) nicht roh erben, sondern wie HP/Schaden über die
   Etagen-Nummer einblenden (z. B. ×0,3 auf E1, linear auf ×1,0 bis ~E20) — dann trägt die
   1,12er-Kurve die Spannung, und das Enchant-/Suffix-Endgame wird erst ab E15–25 zur Pflicht
   statt ab E3.
2. **Den „eine Etage noch"-Klick in den Clear-Moment legen.** Nach dem Etagen-Clear direkt am
   Kampfschirm/Toast ein „Weiter: Etage N+1"-CTA (+ Hotkey), statt Rauswurf zur Zonenliste und
   Scrollweg ans Seitenende; dazu ein Auto-Aufstieg-Toggle mit Stopp-Regeln („vor Boss-Etage",
   „unter X Food") — idle-gerecht und exakt das Werkzeug, das den 40-Minuten-Re-Climb nach dem
   Tod von Handarbeit in Vorfreude verwandelt. Die geplanten Safespot-Checkpoints (alle 25)
   vorziehen, sobald überhaupt jemand E25 erreichen kann.
3. **Den Aufstieg sichtbar veredeln.** Paragon-Achievement-Leiter (E5/10/25/50/100), im Panel
   eine Meilenstein-Vorschau („Nächste Truhe: E5 · Soulopal ab E10 · Chase-Items ab E20" —
   die Staffelung existiert, aber kein Spieler kann sie im Spiel sehen), lesbare Preview-Karte
   inklusive der Werte, die wirklich töten (Rüstung/Ausweichen/Ward/Enrage), und perspektivisch
   eine kleine Turm-Meta (z. B. Paragon-Marken pro Erst-Clear für kosmetische/utility-Käufe),
   damit auch ein gescheiterter Lauf ein Einzahlungs-Gefühl hinterlässt.

## Bugs & Findings

1. **Blocker-verdächtig (Balance):** Kapitel 21 (`reach_paragon_floor` 5) ist mit dem
   kanonischen `endgame`-Fixture-Build unerreichbar — Tod auf Etage 3 (charred_doomknight),
   reproduziert mit 15/5000 Food und beiden Magie-Stances; 3 der 4 direkt kämpfbaren
   Pool-Monster töten den Char auch in Normalform (Engine-Sim, echte step-Ticks).
   Ursache: `paragonScaledMonster` (packages/engine/src/paragon.ts) erbt defense/evasion/
   regen/enrage/inflict roh vom L175–242-Basis-Monster.
2. **UI:** ParagonPreviewCard (apps/client/src/renderer/pages/CombatPage.tsx) schneidet auf
   1920×1080 Monster-Name und alle Stat-Kacheln ab („LE… 1…" statt „15.503") — die
   Entscheidungszahlen des Panels sind unlesbar.
3. **UI/Text:** DeathPopup zeigt beim Turm-Tod gleichzeitig „Kein Verlust: Du behältst alles"
   (death.reassurance, Jorin-Fix) und „🗼 Zurück auf Etage 1." — widersprüchlich; die
   Reassurance-Zeile bei Turm-/Dungeon-Tod unterdrücken oder umformulieren.
4. **UI:** Die Etagen-Preview verschweigt Ward-Anteile (Eishexer: „Leben 774", real 774+234
   Ward) und generell alle Sekundärwerte — inkonsistent zur Kampf-Anzeige, die die Ward-Leiste
   zeigt.
5. **Kosmetik/bewusst?:** Auf dem Erstaufstieg feuert JEDER Clear den Legendary-„Neuer
   Rekord!"-Toast (best steigt ja jede Etage); der kompakte „Etage bezwungen"-Toast existiert
   praktisch nur im Re-Climb. Für einen Kletterer vertretbar (jede neue Etage IST ein Rekord),
   ab ~E20+ würde die Inflation den Legendary-Moment entwerten — beobachten.
