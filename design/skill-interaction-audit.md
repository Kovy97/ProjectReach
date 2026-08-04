# Skill-Interaktions-Audit (Overnight, Aufgabe 3)

**Datum:** 2026-06-27 · **Autor:** Analyse-Agent · **Scope:** read-only Audit, NUR dieses Doc.
**Frage:** Welche Skills bieten zu wenig Interaktion/Tiefe und sollten überarbeitet werden — *über* die schon erweiterten **herblore / farming / foraging / inscription** hinaus (Farming wird gerade separat interaktiver gemacht: Plot-System)?

**Wichtige Abgrenzung:** Dies ist ein **Interaktions-/Engagement**-Audit, nicht ein Utility-/Sink-Audit. Der Sink-Vertrag (wer konsumiert wen) ist über den `_master-plan.md` und frühere Audits bereits weitgehend gelöst — das spiegelt die Sink-Spalte unten nur kurz wider. Der eigentliche Befund liegt im **Interaktions-Modell**.

---

## 1. Befund vorab: Alle Nicht-Kampf-Skills teilen EIN identisches Interaktions-Modell

Quelle: `engine/src/tick.ts` (`completeAction`/`step`), `engine/src/actions.ts` (`setActiveAction`), `apps/client/.../SkillPage.tsx`.

Jeder Skilling-Skill funktioniert exakt gleich:

> **Karte wählen → „Start" klicken → Fortschrittsbalken zusehen → Items tropfen ins Inventar.**
> Es läuft immer **genau eine** Aktion (`state.activeActionId`); Wechsel = neue Karte klicken.

Die einzigen mechanischen Differenzierer im Datenmodell (`ActionDef` in `shared/src/index.ts`) sind:

| Feld | Effekt | Wer nutzt es |
|---|---|---|
| `inputs[]` | Materialien nötig → Aktion stoppt bei Mangel; UI zeigt „craftbar: N" | alle **Crafting**-Skills |
| `successBase`/`successPerLevel`/`stunMs` | Erfolgschance; Fehlschlag → **Betäubung**, kein Ertrag | **nur Thieving** |
| `gold` | Direkt-Gold bei Erfolg | nur Thieving |
| `category` | UI-Gruppierung (einklappbare Tiers) | smithing, runecrafting, fletching, … |
| `tool` (via Gear) | beschleunigt Aktion (z.B. Spitzhacke) | woodcutting/mining/… |

Universell über **alle** Skills wirken nur passive Hintergrund-Systeme: **Mastery** (pro Aktion, Doppelertrag + Tempo), **Mastery-Pool** (Skill-weiter Checkpoint-Bonus), **Pets** (Drop + Bonus), **Skilling-Buffs** (`gatherXpMult`/`gatherYieldMult` aus Tonika). Diese erhöhen *Zahlen*, aber verlangen **keine Spielerentscheidung im Moment**.

**Konsequenz für das Scoring:** Echte „Interaktion" entsteht nur aus (a) **Vor-Entscheidungen** (Was füttere ich? Welche Lieferkette? Welcher Loadout?) und (b) **In-Moment-Entscheidungen** (Risiko/Reaktion). Reines Gathering hat per Design wenig davon — das ist als AFK-Grundpfeiler **gewollt**. Rework lohnt nur dort, wo *niedrige Interaktion auf fehlende Identität/Anti-Fun trifft* oder wo eine *kleine* Mechanik viel Charme bringt.

---

## 2. Skill-Übersichtstabelle

Aktions-Zahlen aus `content/src/index.ts` (Actions-Block Z. 3319–6358, gezählt per `skill:`).
Interaktions-Score: **niedrig / mittel / hoch**.

### Sammel-Skills (gather, trainieren ein Attribut)

| Skill | Aktionen | Output → Sink | Interaktions-Modell | Score | Diagnose |
|---|---|---|---|---|---|
| **woodcutting** | 9 | Logs → Fletching (Bögen/Pfeile) | Einzel-Node anklicken, Axt = Tempo. Sonst rein passiv. | **niedrig** | Dünnster Skill (nur 9 Aktionen). Klassischer AFK-Baseline, aber 0 Würze, keine Sub-Wahl. **Rework-Kandidat (leichte Tiefe).** |
| **mining** | 16 | Erz → Smithing | Einzel-Node, Spitzhacke = Tempo. Passiv. | **niedrig** | Wie WC; Edelstein-Nebendrops geben minimal Varianz. **Rework-Kandidat (leichte Tiefe).** |
| **fishing** | 15 | Roh-Fisch → Cooking | Einzel-Node, passiv. | **niedrig** | Wie WC/Mining. **Rework-Kandidat (leichte Tiefe).** |
| **foraging** | 32 | Kräuter/Essenzen/**Samen** → Herblore/Inscription/Farming | Einzel-Node, aber **Multi-Loot + Samen-Routing** in Folge-Skills. | **mittel** | ✅ Bereits erweitert (Sink-Ketten, Samen→Farming). Interaktion bleibt passiv, aber Identität/Payoff stark. **Nicht antasten.** |
| **farming** | 29 | Crops/Kräuter/Schilf/Pigment → Cooking/Herblore/Inscription | Aktuell wie Gather; **Plot-System in Arbeit**. | **mittel→** | ⏳ Wird gerade interaktiver (passive Plots, Offline-Ernte). **Läuft separat.** |
| **thieving** | 14 | **Gold** + kleine Wertsachen (verkaufen) | Node anklicken, RNG-Erfolgschance, Fehlschlag → **Stun-Downtime**. | **niedrig** | ⚠ **Top-Rework-Kandidat.** „Risiko" ohne Entscheidung; Stun ist reine Anti-Fun-Leerlaufzeit. Gold-only-Identität. |

### Verarbeitungs-Skills (crafting, trainieren kein Kampf-Attribut)

| Skill | Aktionen | Output → Sink | Interaktions-Modell | Score | Diagnose |
|---|---|---|---|---|---|
| **smithing** | 252 | Barren/Gear → Equip + Verkauf | Rezept wählen (braucht Erz/Barren), craftbar-Zähler. **Riesige flache Liste.** | **mittel** | Tiefe ist *Volumen*, nicht Engagement — 252 fast identische Karten = Menü-Müdigkeit. Sink top, Interaktion mittel. **Kein Inhalts-, höchstens UX-Thema.** |
| **cooking** | 17 | Essen → Kampf (Heilung/Buff) | Rezept wählen, Roh-Fisch füttern. | **mittel** | **Combo-/Effekt-Food (Aufgabe 1) hebt das gerade an** — danach echte Rezept-Entscheidungen (Combos). **Läuft separat.** |
| **fletching** | 38 | Pfeile/Bögen → **Ranged-Kampf** | 2-Stufen-Kette (Log→Bogen; Spitzen+Schäfte→Pfeile), Input-Mgmt. | **mittel** | Solide Lieferkette, direkter Kampf-Sink. **OK.** |
| **leatherworking** | 19 | Leder → leichte Rüstung (Ranged/Mage) | 2-Stufen-Kette (Haut→Leder→Rüstung). | **mittel** | Echte Kette + Equip-Sink. **OK.** |
| **jewelcrafting** | 22 | Ringe/Amulette/Gems → Equip | Gem schleifen → fassen, Input-Mgmt. | **mittel** | **OK.** |
| **runecrafting** | 76 | Runen → Magie + Enchant | Essenz→Runen, große Tier-Leiter. | **mittel** | Sink (Magie-Munition + Gear-Enchant) stark. **OK.** |
| **herblore** | 29 | Tränke → Heilung/Kampf-Buffs/Antidot | Rezept-Kette, **Zonen-Gating** (Pflicht-Tränke). | **mittel-hoch** | ✅ Bereits erweitert. Zonen-Gating erzwingt echte Vorbereitung. **Nicht antasten.** |
| **inscription** | 36 | Tinten/Sigil → **Gear-Enchant** + Schriftrollen | 2-stufig (Tinte/Pergament→Sigil→Enchant). | **mittel-hoch** | ✅ Bereits erweitert. **Nicht antasten.** |

### Kampf-Skills (trainieren je ihr Attribut, KEINE SkillPage-Aktionen)

| Skill | „Aktionen" | Sink | Interaktions-Modell | Score | Diagnose |
|---|---|---|---|---|---|
| **attack / power / defence** (Nahkampf) | via Kampf | — (XP/Loot) | **3 Sub-Stile** wählbar (`combatStyle`: attack=Treffer, power=Schaden, defensive=Verteidigung) routen XP + Multiplikatoren. | **hoch** | Stil-Toggle = echte Wahl. Plus Waffe/Gear/Food/Gegner/Auto-Eat/Pets. **Interaktivster Bereich.** |
| **ranged** | via Kampf | — | Munition (Pfeile) als Sink + Loadout. | **hoch** | Munitions-Loadout = Wahl. **OK** (Stil-Paritäts-Audit existiert separat). |
| **magic_off / magic_def** | via Kampf | — | Mana-basiert, Stab-Gear. | **hoch (mit Vorbehalt)** | Kein In-Fight-Zauber-Wechsel (kein `selectedSpell`); Magie-Texture entsteht nur über Gear/Mana. Tiefer als Skilling, aber dünner als Nahkampf-Stile. *Combat-dev-Thema, nicht Skilling.* |
| **vitality** | via Kampf | max-HP | Passiv durchs Kämpfen. | n/a | Reiner Derived-Skill, kein eigenes Spielfeld — korrekt so. |

---

## 3. Rework-Kandidaten (priorisiert, ohne die 4 erledigten + Farming/Cooking-die-schon-laufen)

Bewertung nach **Spaß-Gewinn pro Aufwand**. Aufwand: **S** (Content/Zahlen, evtl. 1 kleines Engine-Feld) · **M** (Engine-State + UI) · **L** (neues System + Persistenz/Migration).

### 🥇 P1 — Thieving: vom „Gold-Automaten mit Strafzeit" zu Risiko/Belohnungs-Skill — **Aufwand S–M, höchster Fun-ROI**

**Problem:** Einziger Skill mit „Risiko", aber das Risiko ist eine **passive RNG-Bestrafung**: Fehlschlag → Stun (`stunMs`) = reiner Leerlauf, kein Lerneffekt, keine Entscheidung. Identität „nur Gold" macht ihn zum schwächsten Skill im Lineup. Idle-Spieler empfinden Stun als anti-AFK-Ärgernis.

**Vorschläge (idle-tauglich, nicht überladen):**
1. **Risiko-Wahl pro Ziel (Kernidee, Aufwand S):** Statt Stun-Strafe ein **Modus-Toggle je Aktion**: *„Vorsichtig"* (höhere Erfolgschance, weniger Gold/Loot, kürzerer/kein Stun) vs *„Dreist"* (mehr Gold + seltene Wertsachen-Chance, aber höherer Fehlschlag/Stun). Eine echte Dauer-Entscheidung statt fixem Profil. Umsetzbar als zwei `successBase`/`gold`-Profile pro Ziel oder ein `risk`-Multiplikator-Feld.
2. **Suspicion/Heat-Meter (Aufwand M, optional):** Aufeinanderfolgende Erfolge am selben Ziel füllen einen Verdachts-Balken → steigende Fehlschlag-Chance → zwingt zum **Ziel-Wechsel** (leichte aktive Rotation, sehr idle-freundlich, kein Reflex nötig). Neuer State → SAVE_VERSION/Migration.
3. **Echte Wertsachen-Sink statt nur Gold (Aufwand S):** Gestohlene Items als **Fence-/Hehler-Material** in eine Kette einbinden (z.B. „stolen_coinpurse" → öffnen → seltene Gems/Enchant-Mats), so wie der `_master-plan` offen fragt: *„Thieving in die Ketten einbinden oder reiner Gold-Skill?"* → **Empfehlung: einbinden.** Gibt Thieving eine Nicht-Gold-Identität.
4. **Stun entschärfen:** Fehlschlag sollte primär *Ertrag kosten*, nicht *Zeit fressen* — Stun deutlich kürzen oder durch „halber Loot" ersetzen. Reduziert Anti-Fun ohne Risiko-Gefühl zu verlieren.

> **Offene Chef-Entscheidung** (aus `_master-plan.md` übernommen): Thieving an Crafting-Ketten anbinden? Diese Audit empfiehlt **ja** (Vorschlag 3) — gibt dem Skill Tiefe UND Sink in einem Zug.

### 🥈 P2 — Primär-Gatherer (Woodcutting / Mining / Fishing): leichte „Würze", AFK-Kern erhalten — **Aufwand S–M, mittlerer ROI**

**Problem:** Die drei dünnsten, ältesten Skills (9/16/15 Aktionen). Reines Einzel-Node-Klicken. Foraging hat durch Samen/Multi-Loot Identität bekommen — diese drei nicht. Sie *sollen* AFK bleiben, aber 0 Überraschung = vergessbar.

**Vorschläge (Würze ohne den AFK-Charakter zu brechen):**
1. **Seltene Node-/Event-Drops (Aufwand S):** Schon teilweise da (Vogelnest beim WC). Ausbauen: gelegentliche **„reiche Ader"/„Schwarm"**-Momente — ein seltener Loot-Roll, der ein wertvolles Mat oder einen Mini-Buff gibt. Pure Content-Zahlen, kein Engine-Bedarf, erzeugt „oh nice"-Momente beim Vorbeischauen.
2. **Sekundär-Ertrag-Wahl (Aufwand S–M):** Pro Node optional ein **Fokus-Toggle** („auf Tempo" vs „auf seltene Nebenmats") — minimaler Entscheidungs-Hook, analog zum Thieving-Risiko-Toggle, wiederverwendbares Pattern.
3. **Cross-Skill-Verzahnung nutzen:** Sicherstellen, dass WC/Mining/Fishing-Outputs in die *neuen* Ketten (Herblore/Inscription/Cooking-Combos) hineinspielen, damit der Gather-Loop sich „lebendiger" anfühlt (Pull-Demand statt nur Lager füllen). Reine Content-Disziplin.

> Bewusst **klein** halten — diese Skills sind der ruhige Grundpfeiler. Nur „Sparkle", kein Vollumbau.

### 🥉 P3 — Smithing: Volumen ≠ Tiefe (UX, kein Inhalt) — **Aufwand S (UI), niedriger ROI**

**Problem:** 252 fast identische Karten. Sink top, aber das „Erlebnis" ist Scrollen + Klicken in einer Mega-Liste → Menü-Müdigkeit, kein Engagement. Kein Content-/Sink-Defizit.

**Vorschläge:** Reines **UI/UX**-Thema (gehört ui-dev): Kategorien sind schon da — zusätzlich z.B. „nur craftbares zeigen"-Filter, „bestes Tier je Slot"-Schnellzugriff, oder eine optionale Smithing-Qualitäts-/Hitze-Mini-Mechanik (Aufwand M) falls man echte Tiefe will. **Niedrige Prio** — funktioniert, ist nur fad.

### Bereits adressiert / nicht antasten
- **herblore, foraging, inscription** — Utility/Sink-Erweiterung erledigt (`design/skills/*.md`). Interaktion bleibt passiv-aber-sinnvoll. **Finger weg.**
- **farming** — Plot-System (Aufgabe 2) macht es gerade interaktiver (passive Echtzeit-Plots, Offline-Ernte). **Läuft.**
- **cooking** — Combo-/Effekt-Food (Aufgabe 1) hebt die Rezept-Entscheidungen gerade an. **Läuft.**
- **fletching, leatherworking, jewelcrafting, runecrafting** — gesunde 2-Stufen-Lieferketten mit direktem Equip/Kampf-Sink. **Solide, keine Rework-Not.**
- **Kampf-Skills** — interaktivster Bereich (Stil, Gear, Food, Gegner, Auto-Eat, Munition, Pets). Magie könnte In-Fight-Texture vertragen (kein Zauber-Wechsel), aber das ist **combat-dev-Scope**, kein Skilling-Thema.

---

## 4. Empfohlene Reihenfolge (Spaß-Gewinn pro Aufwand)

| Prio | Skill | Maßnahme (Kern) | Aufwand | Engine/State? |
|---|---|---|---|---|
| **P1** | **Thieving** | Risiko-Toggle „Vorsichtig/Dreist" + Stun entschärfen + Wertsachen-Sink-Kette | **S–M** | S: nur Content + ggf. 1 Feld · M wenn Heat-Meter (→ SAVE_VERSION) |
| **P2** | **WC / Mining / Fishing** | Seltene „reiche Node"-Events + optionaler Fokus-Toggle + Demand-Verzahnung | **S–M** | meist nur Content; Toggle = kleines State-Feld |
| **P3** | **Smithing** | UX: craftbar-Filter / Tier-Schnellzugriff (ui-dev) | **S** | nein (reines UI) |

**Empfehlung CEO:** P1 (Thieving) zuerst umsetzen lassen — höchster Fun-Gewinn, kleinster Eingriff, schließt zugleich eine offene Design-Frage aus dem Master-Plan. P2 als günstiger „Sparkle"-Pass danach (gleiches Toggle-Pattern wie P1 wiederverwenden). P3 bei Gelegenheit über ui-dev, kein Content-Bottleneck.

**Wichtig (Master-Plan-Regel):** Falls ein Vorschlag neuen persistenten State einführt (Heat-Meter, Fokus-Toggle), zwingend **SAVE_VERSION + Migration** mitziehen. Reine `ActionDef`-Profile (Risiko-Varianten, Event-Loot) brauchen **keine** Migration.
