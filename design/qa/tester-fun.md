# Playtester-Fun-/UX-Report — Welle T1 (Übernacht-Test-Loop)

**Datum:** 2026-06-27 · **Persona:** Spieler-Sicht (early→mid→endgame) · **Scope:** READ-ONLY, nur dieses Doc.
**Bewertet:** Combat-Level-XP (#113), Combo-/Effekt-Food (#108), neue Skills + Fence-Kette (P1-C), Interaktions-Defizit (Audit), Onboarding/Klarheit, Idle-Tauglichkeit.
**Quellen gelesen:** `engine/combat.ts`, `shared/index.ts` (combatXpLevelMult), `content/index.ts` (Combo-Food, Fence, Thieving), `apps/client/.../CombatPage.tsx`, `SkillPage.tsx`, `ItemTooltip.tsx`, `CharacterPage.tsx`, `tick.ts`, `design/overnight-ceo-plan.md`, `design/skill-interaction-audit.md`.

**Gesamteindruck:** Die drei Nacht-Features sind mechanisch **solide gebaut und korrekt verdrahtet** (XP-Dämpfung sanft & loot-/gold-schonend, Combo-Food echte Regen-Leiter, Fence eine echte Steal→Hehler-Kette). Der Spaß-Score wird aktuell aber **fast ausschließlich durch fehlende Sichtbarkeit/Feedback ausgebremst** — die guten Systeme sind im Spiel kaum *erkennbar*. Das ist die gute Nachricht: die teuren Design-Entscheidungen stimmen, die offenen Punkte sind überwiegend günstige UI-Fixes (ui-dev, kein Save-Bump).

---

## P0 — Spaß-/Klarheits-Killer (sofort, billig, hoher Hebel)

### P0-1 · Combo-Food zeigt seinen Hauptnutzen NICHT an (HP-Regen unsichtbar)
**Befund:** Das Kern-Verkaufsargument der ganzen Combo-Food-Kette ist `hpRegenPerSec` („echte Regeneration über Zeit", bis 12 HP/s beim Festmahl). Aber **`ItemTooltip.tsx` rendert genau dieses Feld nicht** (Buff-Block listet meleeDamage/defense/accuracy/crit… — `hpRegenPerSec` fehlt, `ItemTooltip.tsx:330–345`). Auch das Char-Blatt-Buff-Badge zeigt nur Icon + Restzeit (`CharacterPage.tsx:425–436`), und die DerivedStats-Anzeige listet keine HP/s.
**Spielerwirkung:** Der Spieler kocht eine 4-Skill-Lieferkette (Fisch+Fleisch+Crop+Kraut) für ein Gericht, dessen einziger Mehrwert gegenüber normalem Essen **komplett unsichtbar** ist. Er sieht „+35 HP, +Verteidigung" wie bei billigem Essen und fragt sich, warum er den Aufwand treiben soll. Das entwertet Aufgabe 1 (#108) im Spielgefühl praktisch vollständig.
**Fix:** In `ItemTooltip.tsx` Buff-Block eine Zeile `hpRegenPerSec` ergänzen (z.B. „💚 +N HP/s für {dauer}s"); optional Heal-Tag um „+Regeneration" erweitern; Buff-Badge-Tooltip am Char-Blatt um die Bonus-Liste anreichern. **Aufwand: S (ui-dev), kein Save/Engine.** Höchster Fun-ROI der ganzen Welle.

### P0-2 · Über-Level-XP=0 ist im Spiel kaum erkennbar (Chef-Kernziel halb erreicht)
**Befund:** Die Mechanik selbst ist gut (sanftes Band FULL_GAP 5 → ZERO_GAP 15, Loot/Gold bleiben voll — `combat.ts:343–360`). ABER das einzige Signal beim Nullen ist eine Log-Zeile, die als **„+0 Angriff-XP"** gerendert wird (`combat.logXp` = `"+{xp} {skill}-XP"`, `CombatPage.tsx:69–75`). Das ist:
- **nicht erklärend** — sagt nicht *warum* (zu hoch gelevelt), wirkt wie ein Bug/Rundungsfehler;
- **leicht zu übersehen** — verschwindet im schnell scrollenden Kampf-Log zwischen Hits/Loot/Gold;
- **zu spät** — die Monster-Auswahl-Karten bewerben weiter `⭐ {m.xp}` als vollen Wert (`CombatPage.tsx:1049`, `1146`), obwohl der Spieler dort 0 bekommt. Er wählt den Mob in Erwartung von XP und merkt erst im Kampf (wenn überhaupt), dass nichts kommt.

**Spielerwirkung:** Genau das vom Chef adressierte Problem („nicht ewig am selben Mob farmen") wird mechanisch gelöst, aber der Spieler **versteht die neue Regel nicht** — Risiko: Frust („warum kriege ich kein XP mehr?!") statt der gewünschten sanften Lenkung zu passenden Mobs. Anti-Fun durch Intransparenz, nicht durch die Regel.
**Fix (zweiteilig):**
1. **Eigene Klartext-Log-Zeile** statt „+0 XP" wenn `xpMult===0`: z.B. „⚠ Zu schwach — kein Kampf-XP (Loot & Gold bleiben)". (Engine pusht bereits die 0-Zeile; ui-dev muss `kind:"xp"`+`amount:0` als Sonderfall rendern; ggf. combat-dev ein klareres Event-Flag.) **Aufwand: S.**
2. **Proaktiv in der Monster-Auswahl:** XP-Stern ausgrauen/durchstreichen oder „0 XP"-Badge zeigen, wenn `combatXpLevelMult(stilLevel, m.level)===0` (bzw. reduziert anzeigen im Band). Der Spieler sieht *vor* dem Kampf, dass dieser Mob nur noch Loot/Gold bringt. **Aufwand: S–M (ui-dev).**

> Zusammen heben diese beiden P0-Fixes das Feature von „funktioniert, verwirrt" auf „funktioniert, lenkt sanft & verständlich".

---

## P1 — spürbarer Fun-/Tedium-Hebel (diese Nacht/Welle wert)

### P1-1 · Tedium-Spitze #1: Thieving-Stun ist weiterhin reine Leerlaufstrafe
**Befund:** Die Fence-Kette (P1-C) wurde geliefert und ist gut — ABER der vom Audit als „Top-Anti-Fun" markierte **Stun bei Fehlschlag ist unverändert** (`DEFAULT_STUN_MS = 3000`, Aktionen tragen `stunMs` 2000–3000, `tick.ts:64–70`). Bei `successBase` ~0.5–0.6 heißt das: rund jede zweite Aktion → mehrere Sekunden **erzwungener Leerlauf ohne Ertrag und ohne Entscheidung**. Für einen Idle-Spieler, der nebenbei zuschaut, ist das die unangenehmste Stelle im ganzen Skill-Set — pure Wartezeit-Bestrafung.
**Fix (ohne Save-Bump):** Stun deutlich kürzen (z.B. ≤1000ms) **oder** in „halber/kein Loot bei Fehlschlag" umwandeln (Ertrag kosten statt Zeit fressen). Reiner Content/Engine-Konstanten-Tweak, keine Migration. **Aufwand: S.** Der vollwertige Risiko-Toggle „Vorsichtig/Dreist" (Audit P1-Kern) bleibt korrekt für die Chef-Freigabe geparkt (Save-Format) — aber die Stun-Entschärfung braucht das nicht und sollte nicht mit darauf warten.

### P1-2 · Fence-Kette ist lohnend, aber unentdeckbar (Verzahnung nicht spürbar)
**Befund:** Steal→`stolen_coinpurse`/`cutpurse_trinket`/… → Fence-Aktionen → Gems/Gold ist eine echte, saubere Kette (`content/index.ts:5003–5337`). Aber: (a) Die Hehler-Aktionen sitzen als eingeklappte Kategorie **auf derselben Thieving-Seite** — ein neuer Spieler sieht nur, dass „komische Beutel" sich im Inventar stapeln, und erfährt **nirgends**, dass man sie verhehlen kann. (b) Fence-Aktionen geben `xp: 1` — bewusst (Sink, keine Progression), aber dadurch fühlt sich die zweite Stufe wie eine Pflichtaufgabe ohne Skill-Fortschritt an.
**Spielerwirkung:** Die „Verzahnung Thieving→Hehler" existiert im Code, ist für den Spieler aber **nicht spürbar/motivierend**, weil sie nie angeteasert wird. Risiko: gestohlene Waren versanden ungenutzt im Bank-Stack.
**Fix:** Leichter In-Kontext-Hinweis, wenn sich Hehler-Material ansammelt (Toast/Badge „Verhehlbare Beute: N — siehe Hehler"), oder ein Hinweis-Chip an der eingeklappten Fence-Kategorie. **Aufwand: S (ui-dev).** (Die Kategorie-Labels selbst sind ok — `content/index.ts:8063–8064` definiert steal/fence sauber, SkillPage rendert `tr(cat.name)`; der alte Plan-Follow-up „i18n category.fence.name" ist damit gegenstandslos.)

### P1-3 · „Mehr vom Gleichen?" — neue Skills heben Zahlen, nicht Interaktion
**Ehrliche Einordnung:** Combo-Food + Fence machen das Spiel **breiter und sinnvoller** (mehr Sinks, mehr Lieferketten-Tiefe, echte Vorbereitungs-Entscheidungen *vor* dem Kampf), aber sie ändern das Moment-zu-Moment-Modell **nicht** — es bleibt „Karte wählen → Start → Balken zusehen" (deckt sich mit dem Audit-Hauptbefund). Das ist für einen Idle-Titel grundsätzlich ok, aber der „oh nice"-Moment fehlt überall im Gathering.
**Top-2-Stellen für mehr Interaktivität (bestes Spaß/Aufwand, beide ohne Save-Bump):**
1. **Seltene Node-/Event-Drops für WC/Mining/Fishing** (Audit P2): gelegentliche „reiche Ader/Schwarm"-Rolls mit wertvollem Mat oder Mini-Buff. Reiner Content (Loot-Roll), erzeugt Vorbeischau-Belohnung im sonst ereignislosen Grundpfeiler. **Aufwand: S.**
2. **Demand-Verzahnung sichtbar machen:** Gather-Outputs, die jetzt von den neuen Ketten (Herblore/Inscription/Combo-Food) gezogen werden, im Skill-/Item-Tooltip als „wird verwendet für: …" andeuten — macht den passiven Loop „lebendiger" (Pull statt nur Lager füllen). **Aufwand: S–M (ui-dev).**

> Der vollwertige Interaktions-Umbau (Risiko-/Fokus-Toggles, Heat-Meter) ist korrekt als Chef-Freigabe-/Save-Thema geparkt — nicht über Nacht erzwingen. Die zwei obigen Sparkles holen den Großteil des Gefühls für einen Bruchteil des Aufwands.

---

## P2 — Politur / später

### P2-1 · Combo-Food-Onboarding: opake Entdeckung
Die Combo-Rezepte verlangen eine 4-Skill-Lieferkette und sind erst ab Kochen L18–90 (mid/endgame). Die Rezept-Inputs sind in der Kochen-Seite sichtbar (gut), aber **warum** sich der Aufwand lohnt, bleibt bis P0-1 unsichtbar. Nach P0-1 weitgehend gelöst; ein kurzer Tooltip-Hinweis „beste Regenerationsquelle" am Combo-Gericht wäre Bonus. **Aufwand: S.** (Großes geführtes Onboarding ist ohnehin als finaler Meilenstein geparkt — hier nur leichte In-Kontext-Hilfe.)

### P2-2 · Idle-/Offline-Tauglichkeit: grundsätzlich gut, eine Lücke
Kampf läuft offline mit (`tick.ts:133–137` treibt Live- UND Offline-Loop, `combatStep` inklusive) — solides AFK-Verhalten. Die Über-Level-XP-Regel ist **idle-positiv**: Endgame-Spieler, die low-Zonen afk-farmen, kriegen weiter Gold/Loot, aber kein Kampf-XP → sanfter Anreiz, die richtige Zone zu wählen, ohne aktiv eingreifen zu müssen. Einzige Lücke: Auto-Eat hängt am Food-Vorrat; geht offline das Essen aus, kann der Char sterben/stoppen — akzeptabel, aber ein Offline-Report „Kampf gestoppt: kein Essen mehr" wäre wertvoll (vermutlich via OfflinePopup; nicht tief geprüft). **Aufwand: S–M.** Combo-Food mit echter HP/s-Regen reduziert die Auto-Eat-Abhängigkeit spürbar — guter Nebeneffekt, sobald P0-1 ihn sichtbar macht.

### P2-3 · Smithing-Menümüdigkeit (aus Audit, unverändert)
252 fast identische Karten = Scroll-/Klick-Müdigkeit, kein Inhalts-Defizit. „Nur craftbar"-Filter / „bestes Tier je Slot"-Schnellzugriff. **Aufwand: S (ui-dev), niedrige Prio.**

### P2-4 · Magie ohne In-Fight-Textur
Kein Zauber-Wechsel im Kampf (kein `selectedSpell`) — Magie fühlt sich dünner an als die 3 Nahkampf-Stile. Combat-dev-Scope, separat; hier nur als bekannter Engagement-Unterschied vermerkt.

---

## Priorisierte Fix-Liste (für CEO-Synthese)

| Prio | Finding | Maßnahme (Kern) | Aufwand | Save/Engine? |
|---|---|---|---|---|
| **P0-1** | Combo-Food-Regen unsichtbar | `hpRegenPerSec` in ItemTooltip + Buff-Badge rendern | **S** | nein (ui-dev) |
| **P0-2** | Über-Level-XP=0 unklar | Klartext-Log-Zeile statt „+0 XP" + Monster-Karten XP ausgrauen wenn 0 | **S–M** | ui-dev (+ggf. kleines combat-Event-Flag) |
| **P1-1** | Thieving-Stun = Leerlaufstrafe | Stun ≤1000ms oder „halber Loot" statt Zeit | **S** | Engine-Konstante, keine Migration |
| **P1-2** | Fence-Kette unentdeckbar | Hinweis/Toast wenn Hehler-Material sich stapelt | **S** | nein (ui-dev) |
| **P1-3** | Gathering ohne „Sparkle" | seltene Node-Events (WC/Mining/Fishing) + Demand-Tooltips | **S–M** | nein (content/ui) |
| **P2-1** | Combo-Food-Entdeckung | Tooltip-Hinweis „beste Regen-Quelle" | **S** | nein |
| **P2-2** | Offline-Kampf-Stopp-Feedback | „kein Essen mehr"-Zeile im Offline-Report | **S–M** | ui (+ggf. Engine-Reason) |
| **P2-3** | Smithing-Menü | craftbar-Filter / Tier-Schnellzugriff | **S** | nein (ui-dev) |

**Kernbotschaft an den CEO:** Die Nacht-Features sind inhaltlich richtig gebaut — der Spaß-Score steckt aktuell in der **Sichtbarkeit** fest, nicht in der Mechanik. Die zwei P0-Fixes (Regen-Anzeige + Über-Level-XP-Klartext) sind billig (ui-dev, kein Save-Bump) und holen den größten Teil des verschenkten Spielgefühls zurück. P1-1 (Stun) ist der einzige verbliebene echte Anti-Fun-Punkt, der ohne Chef-Freigabe sofort entschärfbar ist.
