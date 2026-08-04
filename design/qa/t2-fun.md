# Playtester-Fun-/UX-Report — Welle T2 (Übernacht-Test-Loop)

**Datum:** 2026-06-27 · **Persona:** Spieler-Sicht (early→mid→endgame) · **Scope:** READ-ONLY, nur dieses Doc.
**Fokus T2:** Greift die Über-Level-XP-Lenkung jetzt (mit Sichtbarkeit)? Reichen Brücken-Monster L79/84? Verbleibende Tedium-Spitzen (Thieving-Stun, „Klick→Zusehen"). Combo-Food/Fence-Verzahnung jetzt spürbar? Onboarding/Idle-Balance. **Eine** Top-Fun-ROI-Maßnahme priorisieren.
**Quellen gelesen:** `engine/combat.ts` (onEnemyDefeated/xpMult), `shared/index.ts` (combatXpLevelMult, XP_FULL_GAP 5 / XP_ZERO_GAP 15, DEFAULT_STUN_MS), `engine/tick.ts` (Stun-Pfad), `content/index.ts` (Brücken-Monster L79/84, Thieving-/Fence-Aktionen, Combo-Food), `CombatPage.tsx` (Log + Karten-Greying), `ItemTooltip.tsx` (hpRegen), `SkillPage.tsx` (Fence-Hint), `i18n/translations.ts`.

**Gesamteindruck:** Die F1-Sichtbarkeits-Fixes sind sauber gelandet und **lösen die T1-P0-Killer real** — Combo-Food-Regen steht im Tooltip, die Über-Level-Null-XP ist als Klartext-Log **und** als ausgegrauter „Kein XP"-Stern (Karte + Modal) sichtbar, der Fence-Hint existiert. Das Über-Level-System fühlt sich dadurch jetzt **fair und verständlich** an statt wie ein Bug. Der verbleibende Spaß-Verlust ist nicht mehr Sichtbarkeit, sondern **(a) eine echte, unveränderte Tedium-Spitze (Thieving-Stun) und (b) fehlende Sog-/Zielwirkung** an zwei Stellen (Brücken-Monster-Loot, „wohin als Nächstes"). Die teure Mechanik stimmt weiter; jetzt geht es um Schmerz-Entfernung und Motivations-Sog.

---

## Frage-für-Frage-Befund

### 1) Über-Level-XP — fühlt es sich jetzt GUT an? **Ja, mechanisch+Feedback. Aber der Sog nach vorn fehlt.**
- **Feedback sitzt:** `combat.logXpZero` „🚫 {mob} zu schwach — kein Kampf-XP (Beute unverändert)" (CombatPage:85–88) + Karten-/Modal-Stern grau „Kein XP" mit Tooltip (CombatPage:1072–1077, 1180–1182). Der Spieler **versteht jetzt vor dem Kampf**, dass dieser Mob nur Loot/Gold bringt. T1-P0-2 = erledigt. Das sanfte Band (FULL_GAP 5 → ZERO_GAP 15) lenkt weich statt zu bestrafen.
- **Erkennt er rechtzeitig, wohin weiterziehen? Nur halb.** Das Greying sagt „**nicht hier**", aber **nichts sagt „**dorthin**"**. Es gibt keinen „empfohlenes nächstes Ziel"-Hinweis. Der Spieler muss selbst durch die Zonen browsen, um einen Mob in seinem XP-Band zu finden. Für einen Idle-Titel mit nebenbei-Aufmerksamkeit ist das eine reale Reibung — er sieht den grauen Stern, seufzt, und sucht manuell.
- **Brücken-Monster L79/84 — als XP-Treppe ausreichend, als Köder zu schwach.** `highland_wyvern` (L79, xp 1200) und `roc_void` (L84, xp 1380) **füllen die L75→L92-Lücke mechanisch** (vorher Soft-Wall roc_storm L75 → idol_warden L92). ABER ihr **Loot ist kein Magnet:** beide droppen im Wesentlichen dieselben Essenzen wie die Roc-Familie (feather, storm/aether/void_essence, soulopal). `highland_wyvern` droppt sogar `scarred_hide` — ein **Wildwood-L26–45-Ledermaterial** an einem L79-Endgame-Wyvern: thematisch falsch und null aspirational. Einzig `void_essence` an roc_void ist halbwegs frisch. **Konsequenz:** Der Spieler zieht zu den Brücken-Monstern, **weil der graue Stern ihn wegschiebt**, nicht weil die Drops ihn ziehen. Sie funktionieren als Lückenfüller, erzeugen aber kein „die will ich legen"-Gefühl.

### 2) Schlimmste verbleibende Tedium-Stelle — **Thieving-Stun, unverändert und schärfer als T1 dachte.**
- **Stun ist NICHT entschärft** und skaliert `stunMs` 2000 → **6000 ms** über die Steal-Tiers (content/index.ts:5013–5235; T1 nannte nur 2000–3000). Pfad: Aktion läuft die **volle Dauer** ab (3000–6000 ms), DANN wird Erfolg gewürfelt; bei Fehlschlag **zusätzlich** `state.stunMs` (tick.ts:64–71). Ein **fehlgeschlagener** High-Tier-Steal = ~5–6 s Dauer **+** ~5–6 s Stun = **~10–12 s reiner Leerlauf ohne Ertrag und ohne Entscheidung**.
- **Fehlerquote:** `successBase` 0.52–0.6, `successPerLevel` 0.012 (Cap 0.95). Early/Mid (Skilllevel < ~35) → **40–48 % Fehlschlag**. Endgame seltener (5 %), aber dann ist der Stun am längsten (6 s). Für einen Spieler, der **zuschaut**, ist das die unangenehmste Stelle im gesamten Skill-Set — pure Wartezeit-Strafe.
- **WICHTIGE KORREKTUR zum Auftrag:** Der Prompt vermerkt „(Fix wäre engine+Save-Bump, bisher deferred)". **Das stimmt nicht für die reine Stun-Entschärfung.** `stunMs` ist ein **statisches ActionDef-Feld** + `DEFAULT_STUN_MS` (shared) — Werte senken ist ein **Konstanten-Tweak ohne neuen State, ohne Migration, ohne Save-Bump**. Save-Bump braucht nur der vollwertige **Risk-Toggle „Vorsichtig/Dreist"** (geparkt, korrekt). Die billige Schmerz-Entfernung ist **sofort verfügbar, ohne Chef-Gate.**
- **„Klick→Zusehen" generell:** unverändert das Grundmodell — für einen Idle-Titel **akzeptabel** und kein dringender Fix. Ein interaktiver Sparkle (seltene Node-Events) ist „nice", aber **niedrigere ROI als das Entfernen aktiven Schmerzes**: Schmerz weg schlägt milde Belohnung dazu.

### 3) Combo-Food / Fence / neue Skills — Verzahnung jetzt spürbar? **Deutlich besser, ein Discovery-Rest bleibt.**
- **Combo-Food:** `hpRegenPerSec` wird jetzt im Tooltip gerendert („💚 +N/s", ItemTooltip:212–213 Ausrüstung, :345 Buff). Der **Hauptnutzen ist endlich sichtbar** → T1-P0-1 gelöst; die 4-Skill-Lieferkette hat jetzt ein erkennbares Verkaufsargument. Gut.
- **Fence:** Besser als T1 berichtete. Die **hohen Tiers geben echte XP** (`reforge_signet` 22, `melt_goblet` 40, `desecrate_reliquary` 73) — nicht durchgängig „xp:1-Pflichtaufgabe". Es gibt also Progression in der zweiten Stufe. Gold-EV wurde in F2 getrimmt. **Verbleibend:** Der Fence-Hint (`thieving.fenceHint`) erscheint **nur nach Aufklappen** der eingeklappten „Hehler"-Kategorie (SkillPage:164–168). Ein neuer Spieler, der nie auf „Hehler" klickt, **erfährt nie**, dass gestohlene Beutel verhehlbar sind — sie stapeln sich ungenutzt. Kein proaktiver Toast/Badge bei Beute-Stau. Echte, aber kleine Lücke.

### 4) Onboarding/Klarheit & Idle-Balance — **solide.**
- Über-Level-XP ist **idle-positiv**: AFK-Endgame-Farmen in Low-Zonen gibt weiter Gold/Loot, nur kein Kampf-XP → sanfter Selbstkorrektur-Anreiz ohne Mikromanagement. Combo-Food-Regen senkt die Auto-Eat-Abhängigkeit (weniger Babysitting).
- Einziger „muss-eingreifen"-Frust ist **nicht** Combat, sondern wieder der **Thieving-Stun** — er macht Thieving sowohl aktiv (zusehen = Frust) als auch passiv (langsamer Durchsatz) unangenehm.
- Neuling versteht die Kernsysteme jetzt deutlich besser (XP-Greying, Regen-Tooltip). Großes geführtes Onboarding bleibt korrekt als finaler Meilenstein geparkt.

---

## Priorisierte Findings

### P0 — keine echten Killer mehr offen
Die T1-P0 (Combo-Food-Regen-Sichtbarkeit, Über-Level-XP-Intransparenz) sind **verifiziert behoben**. Kein neuer P0.

### P1 — spürbarer Fun-Hebel, diese Welle wert

**P1-1 · Thieving-Stun bleibt die schärfste Anti-Fun-Spitze (und ist billig fixbar).**
Fehlgeschlagener Steal = volle Dauer + bis 6 s Zwangs-Leerlauf, bei 40–48 % Early/Mid-Fehlerquote. **Fix ohne Save-Bump:** `stunMs`-Werte (content) + `DEFAULT_STUN_MS` (shared) deutlich kürzen (Richtwert ≤1000–1500 ms) **oder** Fehlschlag in „halber/kein Loot, aber kein langer Stun" umbauen (Ertrag statt Zeit kosten). **Aufwand: S · Revier: content (+shared-Konstante) · Save-Bump: NEIN.** Risk-Toggle bleibt separat geparkt.

**P1-2 · Brücken-Monster L79/84 ohne Loot-Sog → „nächstes Ziel" wird gegangen, nicht gewollt.**
Sie schließen die XP-Lücke, aber droppen Roc-Recycling (+ thematisch falsches scarred_hide am L79-Wyvern). **Fix:** je ein **distinktiver, leicht aspirationaler Drop** geben (z.B. ein eigenes Wyvern-Mat / kleiner Gem / Material, das nur hier fällt) und scarred_hide am L79-Mob durch ein level-passendes Hide/Essence ersetzen. Macht sie zum **Wunsch**, nicht nur zur Treppe. **Aufwand: S · Revier: content · Save-Bump: NEIN.**

**P1-3 · „Wohin als Nächstes?"-Sog fehlt.** Das Greying sagt „nicht hier", nichts sagt „dorthin". **Fix:** leichtes „empfohlenes Ziel"-Signal — z.B. ein „nächstes XP-Band"-Badge/Sortierung in der Monster-/Zonen-Auswahl, das Mobs im vollen XP-Band hervorhebt, sobald der aktuelle 0 gibt. **Aufwand: S–M · Revier: ui · Save-Bump: NEIN.**

### P2 — Politur / später

**P2-1 · Fence-Discovery nur nach Aufklappen.** Hint liegt hinter der eingeklappten „Hehler"-Kategorie. Proaktiver Toast/Badge „Verhehlbare Beute: N", wenn Steal-Material sich stapelt. **Aufwand: S · ui · kein Save.**

**P2-2 · Interaktiver Sparkle (seltene Node-/Schwarm-Events WC/Mining/Fishing).** Hebt das Grund-Gathering-Gefühl, aber **niedrigere ROI als Schmerz-Entfernung** — nach P1. **Aufwand: S · content.**

**P2-3 · Offline-Stopp-Feedback** (Auto-Eat-Vorrat leer → „Kampf gestoppt: kein Essen"). Unverändert offen aus T1-P2. **Aufwand: S–M.**

---

## Prioritäts-Tabelle (für CEO-Synthese)

| Prio | Finding | Maßnahme (Kern) | Aufwand | Revier | Save-Bump |
|---|---|---|---|---|---|
| **P1-1** | Thieving-Stun = Leerlaufstrafe (bis 6 s, 40–48 % Fehl früh) | stunMs/DEFAULT_STUN_MS ≤1–1.5 s **oder** „Loot statt Zeit"-Strafe | **S** | content (+shared) | **NEIN** |
| **P1-2** | Brücken-Monster L79/84 ohne Loot-Sog | distinktiver Drop je Mob; scarred_hide-Fehlplatz ersetzen | **S** | content | nein |
| **P1-3** | Kein „nächstes Ziel"-Signal | XP-Band-Empfehlung/Highlight in Auswahl | **S–M** | ui | nein |
| **P2-1** | Fence nur nach Aufklappen entdeckbar | Toast/Badge bei Beute-Stau | **S** | ui | nein |
| **P2-2** | Gathering ohne Sparkle | seltene Node-Events | **S** | content | nein |
| **P2-3** | Offline-Kampf-Stopp ohne Feedback | „kein Essen"-Zeile im Offline-Report | **S–M** | ui (+ggf. engine-reason) | nein |

---

## 🎯 EINE Top-Fun-ROI-Maßnahme (CEO als Nächstes)

### → P1-1: Thieving-Stun entschärfen.
**Warum die Nr. 1:** Es ist die **einzige verbliebene aktive Anti-Fun-Spitze** im Spiel — bei 40–48 % Early/Mid-Fehlerquote fühlt jeder ~zweite Steal sich wie eine 10-Sekunden-Strafe ohne Entscheidung an. **Schmerz entfernen schlägt milde Belohnung hinzufügen.** Und entscheidend: Es ist **sofort umsetzbar, ohne Chef-Freigabe** — entgegen der Auftrags-Annahme braucht die **reine Stun-Senkung KEINEN Save-Bump** (nur statische `stunMs`-Konstanten in `content/index.ts` + `DEFAULT_STUN_MS` in `shared`; kein neuer State, keine Migration). Der save-pflichtige Risk-Toggle bleibt korrekt geparkt.

- **Aufwand:** S
- **Revier:** content-dev (`stunMs`-Werte) + shared (`DEFAULT_STUN_MS`) — Konstanten-Tweak. Optional minimal combat/tick-seitig, falls statt Zeit „halber Loot" gewählt wird.
- **Save-Bump:** NEIN.
- **Konkret:** Stun-Werte auf ≤1000–1500 ms kappen, ODER Fehlschlag = halber/kein Loot bei kurzem Stun (Ertrag kosten statt Zeit fressen). Danach cache-frisch verifizieren (engine-Tests + Sim) — die Thieving-Guard-Tests (Fence-Exemption) sind betroffen und müssen grün bleiben.

**Knapp dahinter (gleiche S-Klasse, gleiche Welle bündelbar):** P1-2 Brücken-Monster-Loot-Magnet — beantwortet direkt die T2-Leitfrage „fehlt thematischer Anreiz/Loot-Zugkraft": **ja, fehlt** — und ist im selben content-Pass billig mitzunehmen.
