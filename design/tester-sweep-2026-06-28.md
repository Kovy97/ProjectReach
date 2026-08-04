# Tester-Sweep 2026-06-28 — 10 Personas (Triage)

Checkpoint: Post-Audio/Packaging-Build (typecheck+Build grün, 429 Tests + 71 Guard-Tests grün).
Agenten reviewen Quellcode/Content aus Persona-Sicht (kein GUI). QA-Gesamtverdikt: **SHIP**, mit
einem echten P0 (Combat-Stance) + mehreren klaren Bugs.

## P0 — muss vor Playtest gefixt/entschieden werden

- **[Combat] Stance-Auswahl im UI deaktiviert → Melee-Progression kaputt.** `CombatPage.tsx:599`
  versteckt die Controls-Leiste (inkl. einziger `setCombatStyle`-Auswahl) hinter `{(false as boolean) && (`.
  `combatStyle` bleibt permanent `"attack"`; für Melee routet `combat.ts:330` alle Offensiv-XP in `attack`,
  der `power`-Skill (einzige Quelle von `sPower*0.8`-Schaden **und** `str`-Training) bekommt 0 Kampf-XP → bleibt L1.
  Melee-Basisschaden friert auf Waffen-Tier ein, während Ranged/Magie voll skalieren. Trifft Default-/Starter-Stil.
  → ENTSCHEIDUNG nötig: (A) Melee-Kampf-XP entkoppeln (trainiert attack **und** power), oder (B) Stance-Auswahl
  in der neuen Loadout-Bar wieder sichtbar machen.

## P1 — klare Bugs (fixe ich)

- **[Persistence] `baseAttributes`/`skills`/`mastery` werden beim Laden nicht defaultet** → Crash beim ersten
  Offline-Tick bzw. ganzer Save als „beschädigt" verworfen (außerhalb migrate-try/catch). `persistence:132,177`, `character.ts:124`. (#8)
- **[Character] NaN-Härtung unvollständig** — `clamp()` nur auf crit/interval, nicht maxHp/maxMana/defense/damage/accuracy.
  Korrupte baseAttributes → NaN-Stats. `character.ts:248-263`. (#6/#8)
- **[Character] „Wucht"-Stance (`STYLE_DAMAGE_MULT`) wirkt nur auf Melee**, nicht ranged/magic. `character.ts:221-223`. (#6)
- **[Combat] Evasion ohne Deckel → Unverwundbarkeit** via Evasion-Stacking (Hit = acc/(acc+eva), kein Boden). `combat.ts:225-227`, `character.ts:238`. (#6)
- **[i18n] Deutsche Umlaut-Fehler sichtbar**: Pet-Celebration „ausserst/auserwahlt/Feier fur" → äußerst/auserwählt/für (`translations.ts:1419,1421`); city.* (`:886-889`). (#9)
- **[i18n] DE „Attack" unübersetzt** in `style.attack`/`combat.styleHint`/`skillguide.attack` → „Angriff". `translations.ts:1267,1266,1389`. (#1/#9)
- **[Audio] Doppelton bei Lautstärke-Klick** (`setVolume` spielt „hit" + globaler Klick spielt click.mp3). `audio.ts:189`. (#10)
- **[Menu] Gewähltes Portrait erscheint nie** — `summarize` serialisiert `portraitId`, Erstellung setzt nur `portrait`. `persistence:796`, `character.ts:79`. (#7)
- **[Fullscreen] F11 speichert die Vollbild-Wahl nicht** → beim Neustart von `applyFullscreenPref()` überschrieben; Optionen zeigt veralteten Zustand. `main/index.ts:60-64`. (#10)
- **[Content] Tote Rezepte** `ward_rune`/`swift_rune` (Output ohne Verbraucher, kein `rune`-Feld). `content:452,454,7083,7093`. (#5)

## P2 — Politur / kleinere Fixes (fixe ich, wo billig)

- Musik-Lautstärke-Buttons immer „active" (nicht auf enabled gegated). `OptionsPage.tsx:200`. (#10)
- Loot/Rare-Find-Toast zeigt Emoji statt Item-Art (kein `iconUrl`). `Toasts.tsx:175-181`. (#9/#3)
- Sidebar-Hero ⚔/★ als Roh-Emoji statt PNG; ItemTooltip ammo/bag/mana umgehen `statIcon()`. `Sidebar.tsx:68,72`, `ItemTooltip.tsx:241,250,307,329`. (#9)
- `seenDrops`-Einträge nicht als Array validiert; kein Future-Version-Guard; `lastStop.actionId` nicht gegen Content validiert. (#8)
- Verwaiste i18n-Keys (altes 5-Schritt-Onboarding, creation.attributes/pointsRemaining). (#1)
- Vestigiales `ammoDamage` auf `*_arrowheads` (nie verschossen). (#3)

## Balance / Design — DEINE Entscheidung (keine Bugs)

**Combat:**
- Attribut-Training schief: con (5 Skills)/dex (4) vs. int/wis/lck (je 1) → Magier/INT verhungert; Parität-Bruch. (#6/#2)
- Ranged-Crit bei 0.85 gedeckelt < Melee/Magie 0.90 (widerspricht Ranged-„höher-Crit"-Identität). (#6)
- Magie früh mana-arm/glasig (back-loaded), schwächster Eröffnungsstil. (#3)
- `dex` Super-Stat (Acc+Eva+Crit+Tempo+Ranged-Schaden). (#3)
- Melee-Lifesteal ab Midgame irrelevant (Cap 12 abs) → Melee-Defensiv-Identität dünn. (#3)
- DoT-Stile verlieren Identität an Resist-all-Bossen. (#3)
- Über-Cap-Monster L101-120 HP-Sprünge auf gleichmäßige Leiter prüfen. (#3)
- Balance-Sim testet NUR Melee — Ranged/Magie-Zeilen in `sim.ts runReport` ergänzen. (#3)

**Ökonomie:**
- Smithing→NPC-Verkauf dominanter Faucet (~16× Rohwert) → Roh-Verkauf/Combat-Gold sinnlos. (#4)
- Kein mitwachsender Gold-Sink → Gold inflationiert ab Mid-Game zur Vanity-Zahl. (#4)
- Bank hart 100 distinkte Arten, nicht erweiterbar, bei 828 Item-Typen = Dauerstau (Gold-Doc behauptet fälschlich „unbegrenzt"). (#4)
- Combat-Gold flach/fallend zum Endgame; Dungeon-Key-Sink durch Gratis-Drops dominiert; Mandrake-Crop Wertkurven-Inversion. (#4)

**Content/Progression:**
- Sammel-Tempo: Thieving zähste 99-Strecke + frustig; Mid-Game-Wall L35-55; Fishing/Foraging/Thieving ohne Tempo-Werkzeuge; Fishing-Zwischentiers XP-tot. (#2)
- Mastery beschleunigt Leveln kaum (nur Loot-Menge) — UI klarer kommunizieren. (#2)
- 7 Foraging-Zutaten + 6 Combat-Drops ohne Rezept → Output wirtschaftlich wertlos. (#5)
- legendary/godly-Rarity ungenutzt (craft-max EPIC → müssten Drop-only sein, Drops fehlen). (#5)
- Cape-Slot dünn (6, untiered) — via Item-Builder/Drops geplant. (#5)

**Onboarding/UX:**
- 21-Schritt-Guide überladen (alle Skills vorab erklärt, bevor man etwas tut). (#1)
- Default-Sprache EN für deutsch-getargetes Spiel. (#1)
- Stil-Wahl wirkt wie permanente Klasse (Text klären). (#1)

## Verifiziert OK (keine Funde)
Guide vollständig+zuverlässig (alle 21 Steps Inhalt) · Audio kein Leak/Doppel-Sound bei normalen Klicks ·
Achievement-3s-Cooldown wirkt · CSP/data:-Klasse sauber · keine kaputten Item-Referenzen (828 Items erreichbar) ·
Tier-Ketten komplett · Rarity-Verteilung gesund · Enchant+Suffix verdrahtet · Set-Boni/Instanz-Overlay korrekt ·
Save-try/catch robust · keine i18n-Roh-Key-Leaks (DE typgesichert).
