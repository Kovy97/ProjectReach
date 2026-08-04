# Aschechronik-Finale (Kap. 18–21) — Sim-Review „Pox Regelfuchs" (Band 5)

*Revier: Finale-Robustheit. Methode: Content gelesen (`packages/content/src/index.ts`, `design/lore/aschechronik-spec.md`) + deterministische Gegenprüfung der reinen Gate-/Credit-Funktionen (`engine/quests.ts`, `zones.ts`, `dungeon.ts`, `combat.ts`) gegen die bestehenden Invarianten-Tests (`zone-gating.test.ts`, `idol-sanctum-clear.test.ts`). Kein Grind, keine App-Instanz, read-only.*

## 1 Persona-Steckbrief

**Pox Regelfuchs, der Regel-Anwalt.** Edge-Case- und Exploit-Jäger. Ich spiele kein Kapitel „vorwärts" — ich suche die Bruchkante: Kann ich Kapitel überspringen, außer Reihe erfüllen, einen Boss ohne sein Kapitel legen, mich in einen kaputten Zustand manövrieren? Spaß interessiert mich nachrangig; ich bewerte **Machbarkeit = Robustheit gegen kaputte Zustände**. Ein Finale, das ich nicht brechen kann, ist ein gutes Finale. Ich prüfe zwei Schlösser getrennt: das **Kill-Gate** (kann ich den Zielmonster überhaupt erreichen?) und das **Claim-Gate** (kann ich das Kapitel außer Reihe einlösen?).

**Gesamturteil vorweg:** Das Finale ist **doppelt verriegelt** und hält. Die Kill-Reihenfolge ist über die Dungeon-Gates erzwungen, die Claim-Reihenfolge separat über `requires` (strikt auf `claimed`). Kein aktiver Sequenz-Bruch, kein Softlock. Zwei Stellen sind mir als Regel-Anwalt trotzdem aufgestoßen: eine **implizite (nicht per Guard gesicherte) Invariante** bei Kapitel 18 und eine **RNG-Abhängigkeit am Schluss-Gate** bei Kapitel 21. Beides ist kein Blocker, aber genau die Art Fragilität, die ein Refactor später versehentlich aufreißt.

---

## 2 Prüfstand: die Verriegelungs-Fakten

Damit die Kapitel-Notizen kurz bleiben, hier die geprüften Mechaniken (alle deterministisch, kein RNG in den Gates):

- **Claim-Kette strikt:** `questUnlocked` verlangt `requires.every(id => quests.claimed.includes(id))` (`quests.ts:121`). Kap. 19 nicht ohne Kap.-18-Claim, 20 nicht ohne 19, 21 nicht ohne 20. Kein außer-Reihe-Einlösen.
- **Dungeon-/Zonen-Gate großzügiger:** öffnet bei `claimed` **ODER** `completed` (Objectives erfüllt, noch nicht eingelöst) — `dungeon.ts:89`, `zones.ts:31`. Bewusst: „der Story-Beat zählt, nicht der Klick auf Einlösen." Heißt: der nächste Dungeon geht auf, sobald der Boss liegt, nicht erst beim Claim.
- **Kill-Gate-Kette:** wyvern_lair←ch17, idol_sanctum←ch18, behind_the_throne←ch19 (`index.ts:13169/12983/13031`). Um `last_idol` zu töten, muss `idol_sanctum` offen sein = ch18 completed = `roc_void` tot. Um `drazhan` zu töten, muss ch19 completed = `last_idol` tot. **Die physische Kill-Reihenfolge roc_void → last_idol → drazhan ist damit erzwungen.**
- **`last_idol` & `drazhan` sind echt exklusiv:** beide `dungeonOnly: true`, tauchen in KEINEM Pool auf, haben KEINEN `dg_`- oder `tower_`-Klon (Volltext-Grep). Nur in `idol_sanctum.encounters` bzw. `behind_the_throne.encounters`. → Kap. 19/20 sind außer Reihe **nicht** erfüllbar.
- **Kill-Credit ist eng:** `killCreditMonsterId` strippt AUSSCHLIESSLICH `dg_` (`combat.ts:777-781`). Der Slayer-Turm-Klon `tower_roc_void` (Floor 5, ungegatete `slayer_tower`-Zone!) kreditiert auf **sich selbst**, nicht auf `roc_void`. → Kap. 18 lässt sich **nicht** über den frei zugänglichen Slayer-Turm vorab erfüllen. Sauber isoliert.
- **`paragon.best` monoton:** Tod im Turm senkt nur den Checkpoint, nie `best` (`quests.ts:53-59`). Kap.-21-Fortschritt kann nicht regredieren.

---

## 3 Kapitel-Wertungen

### chronicle_18 — Das letzte Tor / The Last Gate
- Spaß: 7/10
- Einfallsreichtum: 7/10
- Machbarkeit: 8/10
- Notiz: Sauber gegatet (wyvern_lair←ch17, Boss `roc_void` `dungeonOnly`). Die Kill-Kette davor ist lückenlos. **Aber:** `roc_void` steht zusätzlich im Paragon-`pool` UND `bossPool` (`index.ts:13227-13228`), und `dungeonOnly` greift im Turm bewusst nicht (Turm liest `content.monsters[baseId]` direkt — Kommentar `index.ts:11479`). Ein realer roc_void-Kill im Turm **kreditiert** ch18. Dass das kein Exploit ist, hängt an einer **einzigen, impliziten** Kette: `paragon_key` droppt ausschließlich von `last_idol` @8% (`index.ts:11746`, einzige Quelle), und `last_idol` liegt hinter ch18 → der Turm existiert erst NACH ch18. Diese Invariante ist nirgends per Guard gepinnt. Als Regel-Anwalt ziehe ich zwei Punkte: eine zweite Key-Quelle oder ein früherer roc_void-Pool würde ch18 sofort außer-Reihe-erfüllbar machen und den „Dungeon-erzwingt-den-Kampf"-Sinn (Welle O/P) aushebeln.
- Bug/Blocker: keiner (in keinem linear erreichbaren Zustand triggerbar). **Empfehlung:** Guard-Test „`paragon_key` hat genau eine Quelle = `last_idol`" ODER „kein chronicle-Boss-Monster liegt in einem vor seinem Kapitel erreichbaren Pool", damit die Invariante nicht stillschweigend zerbricht.

### chronicle_19 — Das Gericht / The Judgement
- Spaß: 8/10
- Einfallsreichtum: 9/10
- Machbarkeit: 10/10
- Notiz: Meine Lieblingsstelle zum Brechen — und sie hält restlos. `last_idol` ist `dungeonOnly`, in keinem Pool, ohne Klon; einzig in `idol_sanctum` legbar, das an ch18 hängt. Es gibt **keinen** Pfad, den Letzten Götzen außerhalb des Sanktums zu töten. Der einzige „Trick", den das System zulässt, ist harmlos und laut Spec §2.4 gewollt: Weil das Sanktum schon bei ch18-`completed` (vor Claim) aufgeht, kann man `last_idol` legen, bevor man ch18 einlöst — der ch19-Zähler ist dann vorgeladen, aber die Claim-Kette zwingt trotzdem ch18-Claim zuerst. Kein Bruch, nur Vorladen. Robuster geht kaum.
- Bug/Blocker: keiner.

### chronicle_20 — Der wahre Verursacher / The True Culprit
- Spaß: 9/10
- Einfallsreichtum: 8/10
- Machbarkeit: 10/10
- Notiz: Der Endkampf ist am strengsten verriegelt. `drazhan` `dungeonOnly`, kein Pool, kein Klon, nur in `behind_the_throne` (←ch19). Der 1-Wellen-Mini-Dungeon ist bewusst chest-frei — korrekt, denn der Chest-Übergang (`encounterIndex+1 < encounters.length`) wird bei einer Welle nie erreicht; das wäre sonst toter Code. Ich habe gezielt nach „Boss ohne Kapitel legbar" gesucht: nicht möglich, weil `behind_the_throne` ch19-completed (= last_idol tot) verlangt. Kill-Reihenfolge und Claim-Reihenfolge sind hier deckungsgleich erzwungen.
- Bug/Blocker: keiner.

### chronicle_21 — Epilog: Der zweite Band / Epilogue: The Second Volume
- Spaß: 5/10
- Einfallsreichtum: 7/10
- Machbarkeit: 7/10
- Notiz: Zustands-robust (kein kaputter Zustand erreichbar, `paragon.best` monoton, Tod resetet ihn nie), aber zwei Regel-Anwalt-Einwände. **(1) Das echte Schluss-Gate ist RNG, nicht deterministisch:** um auf ch21 zu sein, hat man `last_idol` mindestens einmal gelegt (für ch19) — aber der `paragon_key` ist ein 8%-Drop. Wer ihn beim ch19-Kill nicht rollt (92%), muss `idol_sanctum` nachfarmen (Erwartung ~12,5 Kills bis zum ersten Key), um den Turm für ch21 überhaupt freizuschalten. **Kein Softlock** (Sanktum bleibt permanent offen, voll erholbar), aber die Kette **garantiert die Voraussetzung des Finalkapitels nicht** — es gibt kein Pity/keinen deterministischen Fallback. **(2) Häufiger No-Op:** weil der Turm sofort beim Key-Drop aufgeht (oft schon um ch19, lange vor ch20) und Gear-Farmer routinemäßig `best ≥ 5` erreichen, ist „Etage 5 erreichen" beim Freischalten von ch21 meist längst erfüllt → Sofort-Claim, null Gameplay. Laut §2.4 (kumulativ = gewollt) vertretbar, aber der Epilog verpufft mechanisch. Nebenbei: Text sagt „Erreiche Etage 5", mechanisch zählt `best` = höchste **abgeschlossene** Etage (erreichen ≠ abschließen) — kosmetische Wortunschärfe, kein Fehler.
- Bug/Blocker: keiner (erholbar). **Empfehlung:** überlegen, ob der erste `paragon_key` deterministisch fallen soll (z. B. garantiert beim ch19-Kill), damit das Finalkapitel nicht an einem RNG-Grind hängt.

---

## 4 Fazit des Regel-Anwalts

Ich habe das Finale ehrlich zu brechen versucht — Sequenz-Bruch, Außer-Reihe-Kill, Softlock, Epilog-ohne-Claims — und bin an jeder Kante abgeprallt: die 20er-Claim-Kette ist strikt, die Boss-Kills sind über die Dungeon-Gates in Reihe erzwungen, die beiden Endbosse sind echt dungeon-exklusiv, und der einzige naheliegende Bypass (Slayer-Turm-Klon `tower_roc_void`) ist credit-isoliert. Der Epilog ist ohne die vollständige Claim-Kette nicht erreichbar. **Verdict: robust, freigabetauglich.** Die zwei Notizen (implizite paragon_key-Invariante bei Kap. 18; RNG-Schluss-Gate bei Kap. 21) sind keine Blocker, sondern Empfehlungen für je einen Guard-Test bzw. einen deterministischen Key — Versicherung gegen den Tag, an dem jemand am Pool- oder Drop-Content dreht.
