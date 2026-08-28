# Elementar-Effekte im Kampf (Konzept, Chef-GO 28.08.2026: „machen wir so“)

**Anlass:** Mit der Elementleiter gibt es Magiewaffen aller sieben Themen in jeder Phase. Chef: „Die Effekte müssen alle was Eigenes machen; Schock zum Beispiel verzögert den Angriff eines Gegners um 0,x s.“

## Ist-Stand (engine/combat.ts, shared)

| Status | heute |
|---|---|
| burn, bleed, poison | Schaden über Zeit (DoT), gleiche Mechanik mit anderer Zahl |
| frost | Gegner schlägt 40 % langsamer (`FROST_SLOW`), `frostbite`-Waffen: Zusatzschaden gegen gefrostete Ziele |
| shock | Chance, dass ein Angriff des Gegners fehlschlägt (`missReason: "shock"`) |
| Leere (bane/execute) | Zusatzschaden gegen Familie / unter HP-Schwelle, kein Status |
| Arkan, Aether | kein Status, keine eigene Mechanik |

Drei Elemente sind heute dieselbe Mechanik (DoT), zwei haben gar keine.

## Vorschlag: eine Identität je Element

| Element | Name im Spiel | Mechanik | Gefühl |
|---|---|---|---|
| **Feuer** | Brand | DoT bleibt; **Glut**: ein brennendes Ziel nimmt 10 % mehr Schaden aus allen Quellen (Rüstung wird weich) | Feuer = Druck aufbauen, Burst vorbereiten |
| **Frost** | Frost | 40 % langsamer bleibt; **dritte Frost-Anwendung friert ein**: der Gegner lässt genau einen Angriff aus, danach 6 s immun gegen Einfrieren | Frost = Tempo nehmen, Atempause |
| **Blitz** | Schock | **verzögert den nächsten Angriff des Gegners um 0,4 s je Anwendung** (Deckel 1,2 s), Chef-Idee; die alte Fehlschlag-Chance entfällt; bei Crit springt der Schock über und trifft ein zweites Mal für 30 % | Blitz = Unterbrechen, Kettenblitz |
| **Gift** | Gift | DoT, der **stapelt** (bis 5 Stapel, Schaden je Tick × Stapel), halbiert Regeneration und Lebensraub des Ziels | Gift = Langstrecke, gegen Regenerierer |
| **Leere** | Entzug | neuer Status: Ziel macht **15 % weniger Schaden** für die Dauer; `bane`/`execute` bleiben als Waffeneffekte der Leere-Waffen | Leere = Entkräften, sicherer Kampf |
| **Arkan** | Resonanz | kein Status auf dem Ziel; jeder Treffer gibt dem Zauberer **+2 % Zauberschaden je Stapel bis 10** (bestehender Effekt-Typ `momentum`, nur auf Arkan-Waffen) | Arkan = reiner Schaden, wird im langen Kampf stark |
| **Aether** | Lichtsegen | jeder Treffer **füllt 4 % des eigenen Wards** auf und **durchdringt 50 % des Gegner-Wards** | Aether = Schutz und Ward-Brecher |

Blut (bleed) bleibt die Nahkampf-DoT (Schnitt/Stoß), Brand/Gift bleiben Verzauberungen für alle Stile.

## Regeln

- Jede Mechanik muss auf der Item-Karte in einem Satz stehen (z. B. „Schock: verzögert den nächsten Angriff um 0,4 s“) und im Kampfprotokoll sichtbar sein; die Partikel-Schicht spielt das Status-Aufflammen und den Ambient-Loop.
- DPS-Parität je Stufe bleibt Pflicht (Balance-Envelope): Sekundärnutzen (Verzögern, Entkräften) wird gegen DoT-Schaden gewertet, Pins danach neu gemessen.
- Save-Kompat: Status ist Kampf-Zustand; neuer Status-Typ `void` (Entzug) braucht Sanitize-Toleranz für unbekannte Typen (bereits vorhanden: unbekannte Effekte werden verworfen), kein SAVE-Bump.
- Gegner-Elemente (Monster mit Brand/Frost/Schock) bekommen dieselben Mechaniken gegen den Spieler, damit die Regeln symmetrisch sind.

## Umsetzung (nach GO)

combat-dev: Status-Semantik (shock → Verzögerung, frost → Freeze-Zähler, poison → Stapel, burn → Glut-Malus, neuer Status `void`), Effekt-Typen für Arkan/Aether auf den Waffen (content), Item-Karten-Texte ×7, Balance-Pins; ui: Status-Icons im Kampf bekommen den Mechanik-Tooltip. Partikel-Rezepte für den neuen Status `void` (Entzug: dunkle Schlieren am Körper) ergänzen.

## Umgesetzt 28.08. (combat-dev)

**Engine (`packages/engine/src/combat.ts`)** — alle Regeln symmetrisch (Waffen-Status → Gegner über `applyEnemyStatus`, Monster-`inflict` → Spieler über `applyMonsterInflict`; beide laufen durch denselben Nachlauf `onStatusApplied` und denselben Tick-Nachlauf `tickElementalSide`).

| Element | Mechanik in der Engine | Konstante (shared) |
|---|---|---|
| Feuer | `burnVulnMult`: brennendes Ziel nimmt ×1,1 aus ALLEN Quellen (Treffer, alle DoT-Ticks inkl. Brand selbst, Pet-Schaden, Dornen, Überspringen) | `BURN_VULNERABILITY = 0.10` |
| Frost | Slow unverändert; Zähler je Seite zählt Anwendungen in Folge (verfällt, sobald Frost abläuft); die 3. setzt `frozen` (der nächste fällige Angriff fällt aus, Log `kind:"miss", missReason:"frozen"`) und 6 s Immunität (Anwendungen zählen nicht) | `FROST_FREEZE_STACKS = 3`, `FREEZE_IMMUNITY_MS = 6000` |
| Blitz | Anwendungschance je Treffer = Content-`magnitude` (`statusApplyChance`; `chance` wird für shock nicht gelesen). Jede Anwendung schiebt den Timer des Ziels um 400 ms zurück (`delayNextAttack`, Timer darf negativ werden), Kette bis 1200 ms, endet mit dem nächsten ausgeführten Angriff. Kein Aussetz-Wurf mehr, `missReason:"shock"` wird nie emittiert; die Verzögerung loggt als `kind:"status", status:"shock", amount = ms`. Krit mit Schock-Waffe (Basis oder Enchant-Proc, nur bei echtem Zauber): Überspringen = zweite Treffer-Zeile für 30 % des Treffers vor dem Ward-Schritt, umgeht den Gegner-Ward, keine XP | `SHOCK_DELAY_MS = 400`, `SHOCK_DELAY_CAP_MS = 1200`, `SHOCK_ARC_FRACTION = 0.3` |
| Gift | Stapel je Seite (Erst-Anwendung 1, jeder Refresh +1 bis 5; verfallen mit dem Gift); DoT-Tick = magnitude × Stapel; jeder neue Stapel loggt `kind:"status", status:"poison", amount = Stapelzahl`. Regeneration des Ziels ×0,5 (Monster-`regen`, Spieler-`hpRegenPerSec` nur im Kampf-Pfad) und Lebensraub des Ziels ×0,5 (Stil- und Gear-Lebensraub, nach dem Deckel) | `POISON_MAX_STACKS = 5`, `POISON_REGEN_MULT = 0.5` |
| Leere | neuer `StatusType` `"void"` (Entzug): `voidWeakenMult` ×0,85 auf den Schaden des ENTKRÄFTETEN (Spieler-Treffer bzw. Gegner-Spanne vor dem Wurf); `bane`/`execute` bleiben | `VOID_WEAKEN = 0.15` |
| Arkan | kein Status; Resonanz = bestehendes Kind `momentum` (+2 % je Treffer, 10 Stapel, Reset je Gegner) | — |
| Aether | neues Kind `lightblessing` (Lichtsegen): jeder gelandete Zauber füllt magnitude (0,04; 0 ⇒ Konstante) × eigenes Ward-Maximum; effektiver Ward-Break = max(Stat, 0,5). Nur bei echtem Zauber (Mana), ohne Stoff-Pool ein No-op | `AETHER_WARD_ON_HIT = 0.04`, `AETHER_WARD_PIERCE = 0.5` |

Zähler/Immunitäten: `CombatState.elemental?: ElementalCounters` (`player`/`enemy`: `frostStacks`, `freezeImmunityMs`, `frozen`, `shockDelayMs`, `poisonStacks`) — lazy, transient wie `effectCounters`, nie persistiert (die Load-Whitelist der Persistenz baut `combat` ohne das Feld auf); Gegner-Seite resettet bei Respawn/Welle, beide Seiten bei Kampfende/Tod. Ein Gift-Status ohne Zähler (Alt-Save) tickt als ein Stapel. Kein SAVE-Bump; `void` kann in keinem alten Save liegen, `sanitizeEffects` behält jeden String-Typ.

**Shared:** `StatusType` + `"void"` (`STATUS_TYPE_SET`/`isStatusEffectType`), `StatusEffect.magnitude`-Doku je Typ, Konstantenblock „Elementar-Effekte", `SpecialEffectType` + `"lightblessing"` (Kind-Tabelle), `CombatEvent.missReason` + `"frozen"`, `ElementalCounters`/`createElementalCounters`.

**Content (`packages/content/src/index.ts`):** Leere-Waffen + `{ type: "void", chance, magnitude 0.15, durationMs }` nach dem Stab-/Zauberstab-Muster: blacksteel_staff (0,45/4600), godiron_staff (0,45/6400), runite_wand (0,25/4100), voidcaller_staff (0,3/4500), felmagician_rod (0,35/4000), drowned_choirstaff (0,45/5800). Arkan-Waffen + `momentum` (0,02 × 10): cracked_staff, steel_staff, adamantium_wand, aetherium_wand (die fünf themenlosen Arkan-Drops bleiben unverändert, kein `magicTheme` gesetzt). Aether-Waffen + `lightblessing` (0,04): titanium_staff und aetherium_staff (ersetzt den `manaOnKill`-Platzhalter, beide ohne coreStatScore-Beitrag, Grundspannen unverändert), aether_runestaff und godspark_staff (zusätzlich zu Brand/critBurst, Rare-Drop-Philosophie). Schock-Magnituden (0,16–0,32 nach Tier-Formel) sind unverändert und jetzt die Anwendungschance.

**Texte (7 Sprachen, `apps/client/src/renderer/i18n/`):** `status.{burn,frost,shock,poison}.desc` und `weaponEffect.{burn,frost,shock,poison}` je Mechanik ein Satz (Schock zeigt `{magnitude}` als Chance), neu `status.void`/`status.void.desc`, `weaponEffect.void`, `weaponEffect.lightblessing`, `combat.inflictsHint.{burn,frost,shock,poison,void}`, Log-Keys `combat.shockDelayEnemy/Player` (`{name}`, `{seconds}`), `combat.missFrozenEnemy/Player`, `combat.voidEnemy/Player`. `momentum` behält seinen Text.

**Tests:** `packages/engine/src/elemental-status.test.ts` (24: Glut beide Seiten + DoT, Einfrieren/Immunität/Zähler-Verfall + Spieler-Symmetrie, Schock-Kette/Deckel/Reset/Anwendungschance/Überspringen + Spieler-Symmetrie, Gift-Stapel/Deckel/Regen/Lebensraub + Alt-Save, Entzug beide Seiten, Lichtsegen Füllung/kein Mana/Durchdringung, Content-Guards je Element + Schock-Magnitude 0..1). Umgestellt: `status-coverage` (+void), `combatlog-dramaturgie` (Schock-Aussetzer → Verzögerung), `ward-status-counter` (Brand-Tick neu gepinnt: × (1 + BURN_VULNERABILITY)).

**Balance:** Sim-Guard `AUFFÄLLIGKEITEN — Bronze-Baseline (0)`, Geared-Endgame-Tabelle unverändert lesbar (goblin 4,3 s/kill), Balance-Envelope-Pins §2/§5 halten ohne Änderung (keine Stat-Änderung, nur Effekte). Sekundärnutzen (Erwartungswerte, Gegnerintervall 3 s): Schock 16–32 % × 400 ms ≈ 2–4 % weniger Gegner-Angriffe plus Überspringen (≈ +3 % Schaden bei 10 % Krit); Frost-Einfrieren ≈ ein Angriff je Dreierkette; Glut +10 % auf die gesamte Gruppe (Waffe + Pet + DoTs); Gift-Stapel bei 45 % Proc und 3-s-Takt im Mittel ~2 Stapel im Fenster. Alle Werte liegen unter den DoT-Beiträgen gleicher Stufe, die Parität der Grundspannen aus der Elementleiter bleibt maßgeblich.

**Offen (Client, TABU für combat-dev):** CombatPage rendert heute `status shock` als „erleidet Schock" (Verzögerungs-Zeile über `amount`/`combat.shockDelay*` nachziehen), `missReason:"frozen"` als generisches „verfehlt" (`combat.missFrozen*`), Gift-Stapel (`amount` am status-Event) und Entzug (`combat.void*`) ohne eigene Zeile; Status-Icon (`EFFECT_ICON_URLS.void`, heute Fallback „✦") und Partikel-Rezept für `void`; `combat.missShockPlayer/Enemy` sind engine-seitig verwaist.
