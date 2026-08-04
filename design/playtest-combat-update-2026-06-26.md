# Spaß-Playtest: Großes Kampf-Update (Ranged / Magie / Runen / Pets) — Richtung Steam

**Tester-Team:** ~10 simulierte Profile (Idle-Veteran, Neueinsteiger, Min-Maxer, Casual-AFKler, Lore-Fan u.a.)
**Datum:** 2026-06-26 · **Methode:** Bewertung aus Design-Specs + echten Content-Werten (`packages/content/src/index.ts`) + Engine-Mechanik (`combat.ts`, `character.ts`) + UI (`CombatPage.tsx`, i18n). Kein Live-Electron-Spiel — fundierte Schreibtisch-Bewertung.
**Spaß-Brille:** Macht es Laune? Ist es klar? Lohnt es sich? Respektiert es meine Zeit?

---

## Gesamt-Spaß-Score: **7,0 / 10**

Das Update ist ein **großer, solider Sprung**: Die drei Stile sind echt unterschiedlich UND balanciert (Post-Fix-Parität verifiziert — alle drei ~82–86 DPS bei L99, Ranged sogar im Content nochmal Richtung Parität getrimmt), die Pet-Aktionen sind sichtbar und aufregend, Gating und Tier-Kurven sind sauber. Was die **9** (Chef-Ziel) verhindert, ist **Klarheit/Lesbarkeit**, nicht Balance: Man merkt im Kampf nicht, *welchen* Makro-Stil man führt, der „Fireball-Moment" sieht aus wie ein Schwertschwung, und der Einstieg erklärt die neuen Systeme nicht.

| # | Bereich | Score |
|---|---|---:|
| 1 | Stil-Wahl & -Gefühl | **7,0** |
| 2 | Magie / Mana-Loop | **6,5** |
| 3 | Ranged + Munition | **7,5** |
| 4 | Runen & Verzauberung | **7,0** |
| 5 | Pets / Gefährten | **7,5** |
| 6 | Onboarding / First-10-Min | **5,5** |
| 7 | Gesamt-Progression & AFK-Komfort | **8,0** |

---

## 1) Stil-Wahl & -Gefühl — 7,0

**Was Spaß macht:** Die drei Stile fühlen sich mechanisch *wirklich* anders an und keiner ist eine Falle:
- **Melee** = Lebensraub (`MELEE_LIFESTEAL 0.08`, doppelt gedeckelt) → tanky, „dranbleiben".
- **Ranged** = Krit +0.1, Tempo ×0.85, +5 Evasion, Munitions-Burst → Glass-Burst-Gefühl.
- **Magie** = Mana-Loop + DoT/Control + Mana-Schild (50 % Absorb) → „Ressourcen-Manager".

Die **Parität ist da** (Balance-Audit Post-Fix verifiziert; Content trägt sogar den moderaten Ranged-Trim: `godiron_shortbow` aIMs −150, `godiron_arrow` 32, `longbow` 82, Staff-acc 185 = 1.4·D + struktureller `offenseSkill`-Fix in `character.ts`). Kein „dominanter Stil, der die Wahl killt" → gut.

**🔴 Spaß-Blocker — der „Stil"-Picker lügt.** Auf dem Kampf-Screen heißt der einzige sichtbare Stil-Wähler **„Stil:"** und zeigt **Attack / Wucht / Defensiv** — das sind aber nur die *Nahkampf-Unterstile*. Der eigentliche Makro-Stil (Melee/Ranged/Magie) wird **unsichtbar von der Waffe** bestimmt (`CombatPage.tsx` Z.461 ff., `combat.styleHint` sagt wörtlich „Dein **Nahkampf**stil…"). Folge:
- Mit Bogen/Stab in der Hand stehen die drei Melee-Karten weiter sichtbar/„aktiv" da, obwohl sie nichts mehr tun (XP geht an `ranged`/`magic_off`).
- Es gibt **kein Element**, das sagt „Du kämpfst gerade als Magier". Indirekte Hinweise (Mana-Leiste taucht auf, Munitions-Zähler taucht auf) existieren, sind aber nicht beschriftet.
- „Wie wechsle ich den Stil?" → nirgends erklärt, dass das die *Waffe* macht.

**Fix (ui-dev):** (a) Makro-Stil-Badge über dem Picker: „Aktiv: 🪄 Magie — bestimmt durch deine Waffe". (b) Picker zu **„Nahkampf-Fokus"** umbenennen und nur bei `style==='melee'` voll aktiv zeigen; bei Bogen/Stab ausgrauen + Mini-Hinweis „gilt nur für Nahkampf". (c) `styleHint`-Text entkoppeln (nicht mehr „Nahkampfstil" als Oberbegriff).

---

## 2) Magie / Mana-Loop — 6,5

**Was funktioniert:** Casten zieht `manaCost` (Staff 5→16, Wand 3→8 pro Waffe), Mana-Leiste leert sichtbar, Staff hat eingebauten eskalierenden Burn-DoT (mag 1→31) → der Treffer „brennt nach". Mana-Schild als versteckte Tiefe ist clever (echte Opportunitätskosten gegen den Offensiv-Burst). Sehr **zuverlässig** = idle-fair.

**🟡 Reibung A — die designte „Burst→Bash"-Spannung existiert nicht.** Nachgerechnet (Audit B4, im Code bestätigt: `manaRegen = (1 + wis·0.3)·…/Tick`): der Regen pro Cast-Intervall **übersteigt** die Manakosten in *jedem* Tier → der Pool läuft im Dauerkampf praktisch nie leer, der Weak-Melee-Fallback (`MAGIC_WEAK_FACTOR 0.35`) feuert fast nie. Heißt: „Mana leer → schwacher Stab → Regen → wieder casten" ist als *Gameplay-Hebel inert*. Das ist **nicht nervig** (gut!), aber auch **nicht spannend** — Mana ist Deko statt Entscheidung. Für ein Idle-Game ist Zuverlässigkeit vertretbar; nur sollte man wissen, dass der „Loop" emotional flach ist.

**🟡 Reibung B — der Fireball-Moment sieht aus wie ein Schwertschwung.** Cast, Munitionsschuss und Schwerthieb teilen sich **dieselbe** Lunge-Animation (`LUNGE_RIGHT`, 400 ms) und denselben Hit-SFX. Es gibt **kein eigenes Zauber-VFX** (kein Projektil, kein Glow, kein Cast-Sound). Der „befriedigende Spell-Moment", nach dem gefragt wird, ist visuell nicht vorhanden — Lore-/Magie-Fans vermissen die Fantasy.

**Fix:** Reibung A bewusst so lassen *oder* `manaCost` ~×1.5 schärfen (reiner Content-Wert), wenn echte Spannung gewünscht ist. Reibung B (ui-dev, höchste Spaß-Wirkung für Magie): eigenes Cast-Visual + Sound, sichtbarer Burn-Tick-Floater. Mana-Schild im Log/HUD sichtbarer machen (er feuert, aber niemand merkt's).

---

## 3) Ranged + Munition — 7,5

**Was Spaß macht:** Niedrige Reibung. `ammoDamage` addiert sich automatisch auf jeden Schuss (2→32 über die Tiers, spürbares Upgrade), Verbrauch ist Auto (1 Pfeil/Schuss), Munitions-Zähler + „Keine Munition!"-Warnung sind da. Pfeile-Fletchen ist ein netter Nebenloop für Min-Maxer. Tempo+Krit-Identität fühlt sich knackig an.

**🟡 Reibung — stille Munitions-Erschöpfung im AFK.** Geht die Munition mitten in einer Stunden-AFK-Session aus, fällt der Schaden klammheimlich auf `RANGED_WEAK_FACTOR 0.4` (−60 %) und der Waffeneffekt entfällt (`firesAmmo=false`). Die Warnung steht auf dem Screen, aber ein AFK-Spieler sieht sie stundenlang nicht → er kommt zurück und hat 60 % seiner DPS verschenkt. Das **bestraft genau das Kern-Idle-Verhalten**.

**Fix (combat-dev/ui-dev):** Bei Munition = 0 entweder Kampf auto-stoppen (wie „kein Essen"-Logik) *oder* eine persistente, dicke HUD-Warnung + optionaler Toast. Mindestens: Munitions-Reichweite als „reicht für ~X Kills" anzeigen, damit man vor dem AFK nachlegt.

---

## 4) Runen & Verzauberung — 7,0

**Was Spaß macht:** Der Pfad **Essenz-Drop → Rune craften → neue verzauberte Waffe** ist mehrschichtig und thematisch (6 Essenzen dim→ember→frost→storm→aether→void, 8 Runen). Gating ist **sauber & verifiziert**: Aether erst L45+, Void erst L98+, `void_rune` aus `void_essence` (nicht aether-recycelt). Verzauberung erzeugt eine **neue Item-ID** (kein Overwrite) → keine Angst, gute Gear zu „bricken". Endgame-Fusionen (`void_greatsword` burn+bleed, `voidstorm_staff`) sind fett und lohnend (~+50 % DoT).

**🟡 Reibung — der *erste* Enchant enttäuscht (schlechter First-Impression).** Frühe reine-DoT-Enchants liefern mickrige ~4 % Mehrschaden (`flaming_steel_sword` burn mag 4 / chance .30), und die Materialien (`ember_essence`) droppen von **höher-leveligen** Mobs (pyroclast L36) als die Enchant-Req (RC18). Das erste Mal, dass ein Spieler das System ausprobiert, fühlt es sich „nicht den Aufwand wert" an — schlechtes Aushängeschild für ein ansonsten gutes System. Außerdem: die schiere Menge (36 Ranged- + 36 Magie-Items + Essenzen/Runen/Enchants) ist für Casuals **Entscheidungs-Overload**.

**Fix (content-dev, steht schon im Audit B6):** reine-DoT-Enchant-Magnitude `0.20·D_basis → 0.30·D_basis`; `fire_rune` zusätzlich aus `goblin_warlock` (L14) zugänglich → RC15–20-Enchants ohne Über-Level-Farm. Endgame-Fusionen unverändert lassen.

---

## 5) Pets / Gefährten — 7,5

**Was Spaß macht:** Mechanisch **stark umgesetzt** und sichtbar: eigener Intervall-Timer, das Pet **springt zum Gegner** (`PET_LUNGE_KEYFRAMES`, 700 ms), Floater + eigener Log-Eintrag. 21 distinkte Abilities (stun/burst/heal/shield/stealDrop/armorRend/multiHit…) → die **Begleiter-Wahl ist echte Build-Entscheidung** (ashgut-Heal für Survival, gemwraith-Krit für DPS, gloomrat-stealDrop für Loot). Gedeckelt/fair (Sim grün). Der Gloomrat-„erbeutet <Item>!"-Moment ist genau das aufregende Anker-Gefühl.

**🟡 Reibung — Log-Flavor geht verloren.** Das Design-Doc beschreibt **flavorvolle** Aktionen („Wurzel-Snare", „Sporenwolke", „glüht Waffe"). Im Spiel zeigt der Log aber **trockene Mechanik-Namen**: „Rotbark — Betäubung!" / „Held — Burst-Schaden (12)" (`pet.effect.combat.*`). Nur `stealDrop` hat bespoke Text. Lore-Fans bekommen die Persönlichkeit der Pets nicht — die Sprung-Animation ist toll, aber der Text killt die Stimmung.

**Fix (ui-dev/i18n):** pro Pet/Ability eine **flavorvolle Log-Zeile** statt des generischen Kind-Namens („Rotbark schnürt Wurzeln um {name}!"). Billiger, hochwirksamer Stimmungs-Gewinn. Optional: Ability-Tooltip mit Intervall/Wirkung am Pet-Footer (ist teils da, gut).

---

## 6) Onboarding / First-10-Minutes — 5,5 (größtes Steam-Review-Risiko)

Ein Neuling startet mit Melee-Gear, sieht „Stil: Attack/Wucht/Defensiv", kämpft — alles ok. **Dann** findet/craftet er einen Bogen oder Stab und … nichts erklärt, dass das **alles ändert**: Der alte „Stil"-Picker ist plötzlich irrelevant, eine Mana- oder Munitions-Leiste taucht unkommentiert auf, der `styleHint` redet weiter von „Nahkampfstil". **Kein Tutorial/Tooltip verbindet Waffe → Stil.** Magie (Mana), Ranged (Munition) und Verzauberung erscheinen ohne Erstkontakt-Erklärung. Das ist exakt die Sorte „ich versteh das System nicht" → mittelmäßige Steam-Reviews.

**Fix (ui-dev):** Einmal-Kontext-Hinweis beim **ersten Ausrüsten** eines Bogens/Stabs: „Du führst jetzt 🏹 Fernkampf / 🪄 Magie — deine **Waffe** bestimmt den Kampfstil. Munition/Mana siehst du an deiner Leiste." Plus der Makro-Stil-Badge aus Punkt 1. Das eine Toast/Tooltip-Paar entschärft das halbe Onboarding-Problem.

---

## 7) Gesamt-Progression & AFK-Komfort — 8,0

**Was Spaß macht:** Parität über alle Stile = keine Reue-Wahl, jeder Build trägt L1→100. Tier-Kurven streng monoton, **keine toten Tiers** (Audit B3), jedes Upgrade lohnt spürbar (×≈1.35/Tier). AFK-freundlich: Auto-Battle, Auto-Eat (auch bei DoT), Offline-Progress, Respawn-Loop, Tod = voll heilen + Stopp (milde Strafe). Zuverlässige Magie (nie leer) ist sogar ein **AFK-Plus**. Frühgame→Endgame motiviert durch die Essenz/Runen-Leiter als Fernziel.

**🟡 Einziger Komfort-Bruch:** die stille Munitions-Erschöpfung aus Punkt 3 — der einzige Mechanismus, der unbeaufsichtigtes Idlen aktiv bestraft. Sonst respektiert das Spiel die Zeit gut.

---

## Top-3 Prioritäten (mit konkretem Fix)

**🔴 1 — Makro-Stil ist unsichtbar / „Stil"-Picker ist irreführend** (Bereiche 1 & 6).
*Fix (ui-dev):* Badge „Aktiv: 🪄/🏹/⚔ {Stil} — bestimmt durch deine Waffe" über dem Picker; Melee-Picker zu „Nahkampf-Fokus" umbenennen und bei Bogen/Stab ausgrauen; `styleHint` entkoppeln. **Höchste Spaß-/Review-Wirkung.**

**🔴 2 — Kein Onboarding für Waffe→Stil / Mana / Munition** (Bereich 6).
*Fix (ui-dev):* Einmal-Toast/Tooltip beim ersten Ausrüsten einer Ranged-/Magie-Waffe, das Stil + Ressourcen-Leiste erklärt.

**🟡 3 — Kein eigener „Spell-Moment" & stille Munitions-Erschöpfung** (Bereiche 2 & 3).
*Fix:* (a) ui-dev: eigenes Cast-VFX/Sound + Burn-Tick-Floater, Mana-Schild im HUD sichtbar. (b) combat-dev/ui-dev: bei Munition 0 Auto-Stopp oder persistente Warnung.

**Weitere 🟡 (schnell, billig):** Enchant-DoT-Floor `0.20→0.30·D_basis` + `fire_rune` via goblin_warlock (content-dev, Audit B6); Pet-Log mit Flavor-Text statt Mechanik-Namen (i18n).

---

## Urteil: Spaß-Score ≥ 9 erreicht? — **Nein (noch nicht).**

**Erreicht: ~7,0.** Das Fundament ist 9-würdig — Balance/Parität sitzen, die Systeme laufen, Pets sind aufregend, Gating ist sauber. Was fehlt, ist **kein Balance-, sondern ein Klarheits-/Feel-Layer**: Der Spieler muss *sehen und verstehen*, welchen Stil er führt, der Zauber muss sich wie ein Zauber *anfühlen*, und der Einstieg muss die neuen Systeme an die Hand nehmen. Setzt man **Top-3 (1+2 zuerst)** plus die billigen 🟡 (Spell-VFX, Pet-Flavor, Enchant-Floor) um, ist die **9 realistisch in Reichweite** — der Content trägt sie bereits.

---

# Re-Test nach #76 (Klarheits-/Feel-Politur) — 2026-06-26

**Methode:** identisch (10-Tester-Brille), Bewertung gegen die **tatsächlich geänderten Dateien** (Build läuft nicht live). Verifiziert im Code: `CombatPage.tsx` (Makro-Badge + ausgegrauter „Nahkampf-Fokus"), `Toasts.tsx` (Einmal-Toasts ranged/magic + Munitions-leer), `util/onboarding.ts` (localStorage-Flags), `audio.ts`/Keyframes (`cast`/`castWeak`-SFX, `CAST_KEYFRAMES` 480 ms Hue/Flash, lila Magie-Floater), `translations.ts` (`pet.flavor.*` für alle 21 Pets, sauberer Fallback in `eventText`). Alle vier Punkte sind **echt umgesetzt und robust verdrahtet** (graceful Fallbacks, korrekte Stilwechsel-Erkennung `prev.weaponStyle !== … && …`).

## Neuer Gesamt-Spaß-Score: **8,1 / 10** (+1,1 ggü. 7,0)

| # | Bereich | vorher | jetzt | Δ | Status der Befunde |
|---|---|---:|---:|---:|---|
| 1 | Stil-Wahl & -Gefühl | 7,0 | **8,5** | +1,5 | 🔴#1 **gelöst** |
| 2 | Magie / Mana-Loop | 6,5 | **8,0** | +1,5 | 🟡 Spell-Moment **gelöst**; Mana-Tension bewusst inert (kein Blocker) |
| 3 | Ranged + Munition | 7,5 | **8,0** | +0,5 | 🟡 stille Erschöpfung **gemildert** (Toast), Auto-Stopp offen |
| 4 | Runen & Verzauberung | 7,0 | **7,0** | 0 | 🟡 unverändert (bewusst deferred) |
| 5 | Pets / Gefährten | 7,5 | **8,5** | +1,0 | 🟡 Flavor-Loss **gelöst** |
| 6 | Onboarding / First-10-Min | 5,5 | **8,5** | +3,0 | 🔴#2 **gelöst** |
| 7 | Progression & AFK-Komfort | 8,0 | **8,0** | 0 | 🟡 AFK-Munitions-Nag bleibt (kein Auto-Stopp) |

### Was jetzt gelöst ist
- **🔴#1 Makro-Stil sichtbar (gelöst):** Das Badge „Aktiv: ✦ Magie · durch Waffe bestimmt" steht prominent über dem Picker; der alte Picker heißt jetzt „Nahkampf-Fokus", wird bei Bogen/Stab **ausgegraut + disabled** mit „(nur Nahkampf)"-Note und korrektem Hover-Hint. Die Picker-Lüge ist weg — der Spieler sieht auf einen Blick, was er führt und wodurch.
- **🔴#2 Onboarding (gelöst):** Einmal-Toasts (localStorage-gated) beim ersten Ranged-Equip (Stilwechsel + Munition) und Magie-Equip (Mana + Spell + Leer→Schwach-Loop) plus Munitions-leer-Toast. Greift genau im „Aha"-Moment des ersten Waffenwechsels. Tutorial ist zudem über Optionen reopenbar.
- **🟡 Spell-Moment (gelöst):** eigener Cast-SFX + `castWeak` bei leerem Mana, eigene Cast-Animation (Hue/Flash statt Schwert-Lunge), **lila glühende Magie-Schadenszahlen**. Der Zauber fühlt sich endlich wie ein Zauber an — der größte „Feel"-Mangel ist behoben.
- **🟡 Pet-Flavor (gelöst):** alle 21 Pets haben stimmungsvolle Log-Zeilen („Rotbark schnürt Wurzeln um den Gegner — betäubt!") mit sauberem Fallback aufs generische Format. Lore-Fans bekommen ihre Persönlichkeit.

### Verbliebene Punkte (alle 🟡 — **kein 🔴 mehr**)
1. **🟡 Früher Enchant enttäuscht** (Bereich 4, unverändert). *Fix → content-dev:* DoT-Floor `0.20→0.30·D_basis`; `fire_rune` zusätzlich via `goblin_warlock` (L14). Audit-B6, billig, hebt den ersten Enchant-Eindruck spürbar.
2. **🟡 AFK-Munitions-Erschöpfung** (Bereiche 3 & 7). Toast hilft dem *zurückkehrenden* Spieler, aber tief-AFK verliert weiter DPS bis zur Rückkehr. *Fix → combat-dev:* Kampf-Auto-Stopp bei Munition 0 (analog „kein Essen") **oder** Pre-AFK-Anzeige „reicht für ~X Kills".
3. **🟡 Mana-Loop emotional flach** (Bereich 2, bewusst belassen). Für ein Idle-Game vertretbar (Zuverlässigkeit = AFK-fair). *Optional → combat-dev/content-dev:* `manaCost` ~×1.5, falls echte Burst→Bash-Spannung gewünscht — reine Design-Entscheidung, **kein Muss**.

## Urteil: ≥ 9 erreicht? — **Noch nicht, aber sehr nah: ~8,1.**
**Alle 🔴-Spaß-Blocker sind beseitigt** — das Update ist von „solide, aber verwirrend" zu „klar, juicy und einsteigerfreundlich" gesprungen (+1,1). Die letzten ~0,9 zur **9** hängen an **drei deferred 🟡**, keiner davon ein Blocker: (1) Enchant-Floor (content-dev), (2) Munitions-Auto-Stopp (combat-dev), (3) optional Mana-Tension (Design-Entscheid). Werden #1 und #2 umgesetzt, ist die **9 erreichbar** — die Balance und der Feel tragen sie bereits.
