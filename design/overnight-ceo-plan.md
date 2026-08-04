# Abwesenheits-CEO-Run — 2026-06-29

**Mandat:** Chef abwesend ~12 h (bis ~21:00, 2026-06-29), volle CEO-Entscheidungsgewalt.
Auftrag: Tester-Sweeps fahren, Feedback eigenständig in Fixes umsetzen, immer grün halten,
periodisch frisches Playtest-ZIP bauen. Keine Rückfragen — sinnvolle Defaults + dokumentieren.
Dieses Dokument = SOURCE OF TRUTH; bei zusammengefasstem Kontext hier weiterlesen & Status updaten.

### Loop-Tick ~22:45, 2026-06-30 — sichere UI-Queue (a) Affix-Werte im Tooltip
- ASSETS leer, keine frischen Chef-Dateien. Queue-Punkt (a) umgesetzt: ItemTooltip zeigte im „Instance enchantments"-
  Block nur Affix-Name+Tier, KEINE Werte. Neu: Helper `affixEffectSummary(def,tier,t,tr)` (Flat-Boni via bonusByTier
  + Attribut-Mods via modifiersByTier + Proc via weaponEffectByTier, „·"-verbunden); Affix-Zeile → 2-zeiliger Entry
  (Name/Tier oben, eingerückte Wert-Zeile `.itip-inst-affix-val` darunter). Client-Typecheck + Build grün. Engine
  unberührt. NICHT separat geZIPpt (autonom, nicht angefragt) → mit nächster Charge/Icons bündeln.
  Offen aus Queue: (b) leerer Köcher räumbar, (c) Bank-Drag-Quell-Unterscheidung.

### Loop-Tick ~23:55, 2026-06-30 — sichere UI-Queue (b) leerer Köcher räumbar
- ASSETS leer. Queue-Punkt (b): unequipItem("ammo") gab bei leerem Köcher (eq.ammo gesetzt, ammoCount=0) wegen
  `added=addItem(...,0)=0 → return false` auf → Slot nie räumbar. Fix: `if (amount<=0){ eq.ammo=null; ammoCount=0;
  return true }` VOR dem addItem/Platz-Check. UI erreichbar (CharacterPage itemId=eq.ammo → Slot bleibt „filled"
  mit Unequip-Aktion), keine UI-Änderung nötig. Guard-Test in ammo-quiver.test.ts. Engine 461, 5 Typechecks grün.
  NICHT separat geZIPpt (ZIP gerade 23:24 raus) → mit nächster Charge. Queue-Rest: (c) Bank-Drag-Quell-Unterscheidung.

## Chef-Feedback (~23:15, Chef online) — Fortschrittsleiste + Drops-Anzeige
- ROOT-CAUSE Fortschrittsleiste „resettet vor dem Ende": Engine schließt Aktion bei EFFEKTIVER Dauer ab
  (tick.ts: durationMs × Werkzeug × Mastery × Pool), die UI-Bar teilte aber durch BASIS-durationMs → bei
  aktivem Speed-Bonus reset bei effSpeed×100 % < 100 %. Fix: `effectiveActionDurationMs(state,content,action)`
  aus tick.ts exportiert (Engine-`dur` refactored darauf = verhaltensgleich), SkillPage teilt Bar (ActivePanel
  + renderCard) UND leitet effSpeed daraus ab (Zeit/Rate/Ertrag-Kacheln inkl. zuvor fehlendem Pool-Bonus).
  Combat-Bar geprüft = korrekt (safeInterval==attackIntervalMs im Normalfall). Guard-Test action-duration.test.ts
  (3): no-speed=Basis, mit-Mastery<Basis, Engine-Abschluss==Helper. Engine no-sim 460, 5 Typechecks, Build grün.
- Combat-Drops im Kampf-Kopf zu klein/gedrängt → `.fighter-sub-drops` Icons 14→28px, Label 12→15px, gap 3→7px,
  flex-wrap + justify flex-end (nutzt freien Platz). CSS-only.
- Frischer ZIP gebaut (bm312hfrh) bündelt: Fortschrittsleiste + Drops + Lv-Badge + IN-PROGRESS-Icons +
  Disenchant-Feedback + Affix-Tooltip-Werte.
- Combat-XP-Frage (unterlevelte Gegner = keine XP) vom Chef vertagt (AskUserQuestion abgelehnt) → später.

## Chef-Feedback (~22:00, Chef online) — Skill-Seiten-Politur
Screenshot Crafting-Seite. Zwei Wünsche, beide umgesetzt + grün (Client-Typecheck + Build):
1. "Lv"-Badge im Skill-Kopf soll Citadel-Look: `.skill-level-badge` von Accent-Pille → Citadel-Holzrahmen
   (wooden_frame_with_corners 9-slice + bg_black-Textur + Gold-Schrift), analog `.skillcard-lvl`.
2. IN-PROGRESS-Bereich zeigte Platzhalter-Emoji (🧱 für Tan Hide) für ALLE Aktionen → ActivePanel nutzt jetzt
   `getActionSrc(action.id) ?? getItemImage(out.itemId)` (= identische Auflösung wie die Karten), Emoji nur Fallback.
   +CSS `.skill-active-icon` (30px) / `.skill-active-emoji`, `.skill-active-name` inline-flex.
→ Frischer ZIP gebaut (b3y24h8jf) bündelt diese 2 + den vorherigen Disenchant-Feedback-Fix.

## Live-Feedback-Welle (~17:45–17:55, Chef online)
Vier Punkte, alle grün verifiziert (5 Typechecks, Engine 434, Persistenz 58, Client-Build) + Portable-Build:
1. **Suffix-UI:** Suffix-Bonus stand außerhalb des Item-Detail-Containers (separater Erklär-Block mit
   Label+Name+Roll). Jetzt: Bonus-Attribute als Stat-Zeilen INNEN unter dem letzten Attribut, mit
   Suffix-Name als kleiner Header, eingefärbt in der Rarity-Farbe des Items (grün=Selten usw.).
   `ItemTooltip.tsx`: StatRow bekam `tone`-Prop; SuffixBlock→SuffixStatRows; alten Außen-Block entfernt.
2. **ChatGPT-Prompts neu formatiert:** Chef wollte Vorlagen-Format (`chatgpt-icon-prompts.txt`):
   10er-Batches, je Block ein Intro-Prompt davor + Bullet `• Name (datei.png) — Beschreibung`.
   genprompts.cjs umgebaut (deutsche Namen, Rarity-Flavor an echte Spielfarben). 141 Items/15 Blöcke + 1 Monster.
3. **Battle-Skalierung „Problem":** KEIN echter Bug — Fill-Kette intakt (battle→battle-main flex:1→fighter
   h:100%→figure-wrap flex:1). Leere Fläche im Screenshot = Tester hatte Fenster kleiner gezogen (vom Chef
   bestätigt). Zusätzlich global-Zoom 0.80→0.89 für bessere 1920×1080-Flächennutzung (früher gefixt).
4. **Feuer-Status als Floating-Damage:** Burn-DoT (100ms-Tick) emittiert jetzt ~1×/Sek einen `dot`-Event
   (abgeleitet aus remainingMs-Sekundengrenze → kein Log-Spam). Renderer: orange Schadenszahl mit
   Feuer-Status-Icon daneben (`renderEffectIcon`) + orange Chat-Zeile „🔥 … erleidet N Feuerschaden".
   Shared: CombatEvent-Kind `"dot"`. Engine: `emitBurnTick` in tickEnemy/PlayerEffects. KEIN SAVE_VERSION-Bump
   (Event ist transient, kein neues persistentes Feld).

## Werkzeuge ausrüstbar + Tester-Bedenken (~18:00–18:25, Chef online)
Discord-Tester (Satoru): „Wo rüstet man Spitzhacken aus?" + „buffs sollte man ausrüsten können ohne
Inventar zu verstopfen". Recherche: Tools wirkten bisher NUR passiv aus dem Inventar (`bestToolSpeed`
liest Inventar+Equipment, „müssen NICHT ausgerüstet sein"). Chef-Entscheid: **„trotzdem equippable machen!"**
Umgesetzt (alles grün: 5 Typechecks, Engine 436 inkl. 2 neue Tests, Persistenz 58, Build):
- shared: 2 Werkzeug-Slots `tool1/tool2` + Labels; SAVE_VERSION 41→42 (Alt-Saves füllt migrateState generisch).
- engine/equipment: `equipTool` routet Tools in freien Werkzeug-Slot; Inventar-Passiv BLEIBT (kein Balance-
  Risiko, `bestToolSpeed` liest beides). Guard-Tests (equip→Slot, wirkt aus Slot, 2. Tool→tool2).
- UI CharacterPage: „Werkzeuge"-Zeile (2 Slots) unter dem Begleiter; Inventar-Equip-Aktion für type=tool;
  Drag-&-Drop (type===tool) + Klick. Tooltip-Hinweis „Im Werkzeug-Slot ausrüstbar — wirkt auch aus dem Inventar".
- persistence-Test: Versions-Assertions auf `SAVE_VERSION` umgestellt (statt Literal 41) → künftige Bumps brechen sie nicht.
Bank-„nur 7 Helme": kein Limit — schlichte Items stapeln unbegrenzt, Suffix-Unikate (Instanzen) stapeln nicht
(eigener Slot). Reichlich Bank-Platz frei. = Kein Bug, nur Stacking-Erklärung.

## Große Live-UI-Welle (~18:30–19:00, Chef online, Rapid-Fire) — alles grün
5/5 Typechecks, Engine 436, Persistenz 58, Client-Build. Umgesetzt:
- **Offline-Cap 24h→12h** (shared MAX_OFFLINE_MS; persistence-Test auf MAX_OFFLINE_MS/SAVE_VERSION statt Literale).
- **Combat-Container dynamisch** (echter Fix): `.battle-main`-Grid-Items `min-width:0` + `.fighter-figure img max-width:100%` + Flex-Container `min-width:0` → Spalten schrumpfen mit Fensterbreite, nichts läuft mehr rechts raus (Tester-Screenshot war Overflow, nicht „resized window").
- **Werkzeuge ausrüstbar** (Forts.): separate „Werkzeuge"-Sektion (Bloat) wieder entfernt; tool1/tool2 jetzt im Paperdoll-Grid LINKS & RECHTS neben dem Helm; Empty-Slot-Emblem = Citadel-Spitzhacke (sidebaricon_mining); Drag-&-Drop (type===tool) + Klick.
- **Equip-Slot Hover-Label**: leere Slots zeigen bei Mouseover mittig in Weiß, was reingehört.
- **Inventar-Slots Holzrahmen**: `.cs-inv-grid .inv-slot` border:none-Override entfernt → 9-slice-Holzrahmen pro Slot (Charakter-Inventar UND Shop-Sell, beide via .cs-inv-grid).
- **Shop-Sell Detail-Menü**: Klick wählt Item → Detail-Panel mit 2×2-Buttons (Verkaufen 1/10/100/Alle); kein Per-Zelle-Action-Menü mehr. i18n shop.sell100/owned/each/sellSelectHint.
- **Smithing-Reihenfolge**: je Tier identisch Barren→Waffen(dagger…maul)→Rüstung(helmet…offhand)→Rest (SkillPage smithingOrderKey, nur skill smithing).
- **Enchanting Sidebar** unter Slayer / über Shop einsortiert.
- **Bestiary-Drops**: echte Item-Icons via ItemChip (klickbar→Tooltip-Link) + Dropchance, visuell aufgewertet.
- **Mastery**: Action-Schrift ~2× (16→28/26/22px), Header 25px, Kategorien standardmäßig EINGEKLAPPT.
- **Agenten (Hintergrund)**: (1) Guide-Diagnose — KEIN Bug, bewusste Minimal-Variante: 21 Text-Folien, „Weiter" nur Index++ ohne Navigation/Wirkung. Empfehlung Option B (mittel): „Weiter" navigiert zur passenden Seite. (2) balance-designer plant Zonen-Drop-Items (level-skalierte Rarity bis legendär in Idol Hall + Dungeon-Keys in Loot-Tables) — NUR Plan, läuft noch.

## Lifesteal + Offline-Popup + Status-PNGs (~19:00–19:20, Chef online) — alles grün
5/5 Typechecks, Engine 436, Persistenz 58, Build.
- **Lifesteal (neue Mechanik):** EquipBonus.lifesteal + DerivedStats.lifestealPct (computeStats additiv, cap 100%). In combat.ts beim Spieler-Treffer (ALLE Stile): heal=round(dmg*pct), auf fehlende HP gedeckelt; neuer CombatEvent `lifesteal`. Renderer: grüne Heil-Floater beim Spieler mit Blutungs-Icon (Platzhalter) + grüne Log-Zeile. Innater Melee-Lifesteal bleibt unberührt. KEIN SAVE_VERSION-Bump (DerivedStats/EquipBonus nicht persistiert). Lifesteal-Items kommen über den Zonen-Drop-Plan.
- **Status-Emojis → echte PNGs:** Chef-Hinweis — Combat-Log-Zeilen (dot/lifesteal) nutzen jetzt `renderEffectIcon` (Status-PNG) statt 🔥/🩸 im String. Floater nutzten schon PNGs.
- **While-you-were-away-Popup:** (1) kaputtes Item-Icon → ItemChip (echtes Bild + Tooltip-Link). (2) XP pro Skill aufgeschlüsselt: Skill-Icon + „Skill: +X XP · +X Lvl" (OfflineSummary.skillXp; persistence snapshottet skills-XP vor/nach advance + Level-Delta via levelFromXp). Gold-Zeile + Items mit echten Bildern.

## Zonen-Drop-Items UMGESETZT (~20:50–21:13) — grün
content-dev-Agent: 1. Runde schrieb NICHTS (wollte alles im Riesenbericht → Output-Limit). Nachgesteuert
(inkrementell per Edit, zonenweise). 2. Runde: **+152 Items (862→1014)**, Key-Umverteilung auf alle
Zonen-Mobs (warband 10/crypt 7/highland 8/wildwood 5/idolhall 4 Quellen), Dropraten Rev.3 (offline-tauglich).
UNABHÄNGIG verifiziert (Agent-Schlussbericht überlief erneut, irrelevant): content-TC ✅, Engine **436/436** ✅
(content-integrity/refs/wiring grün → keine toten Refs), Persistenz 58/58 ✅, Client-Build ✅.
Lifesteal: 2 Items mit echtem `bonus.lifesteal` (nekro_reaperblade 0.05, doomknight_cinderblade 0.07) —
Plan nutzte sonst hpRegenPerSec-Sustain (kein Item-spezifischer Lifesteal-Plan). Mehr Vampir-Items optional.
Icon-Prompts regeneriert: **293 Items ohne Icon** (30 Blöcke) in design/chatgpt-icon-prompts-2026-06-29.txt.
→ Portable + ZIP. Hinweis: content-dev-Agent ggf. noch am Verifizieren — content seit 20:53 unverändert, daher
keine Race; ZIP spiegelt den verifizierten Stand (Portable bündelt frisches out/).

## Großer Live-Polish-Batch (~21:30–22:15, Chef-Rapid-Fire) — alles grün
5/5 TC, Engine 436 (4 Guard-Tests an Max-Stack/AutoEat angepasst), Persistenz, Build. Umgesetzt:
- **Inventar Drag-&-Drop-Umsortieren** (engine moveInventorySlot + UI Slot-Swap, nur im „newest"-Modus).
- **Tooltip-Overflow bei Suffix-Items** behoben durch kleinere Schrift (Bild 392→272px, Stat-Rows 20→16px) statt Scroll.
- **Shop verkauft jetzt Suffix/Instanz-Items** (engine sellInventoryInstance; ShopPage listet Stacks + Instanzen getrennt, je eigener Stack; Detail: Stacks 1/10/100/All, Instanz = Einzelverkauf).
- **Stackbare Items Max-Stack 999** (engine MAX_STACK + addItem-Überlauf in neue Slots).
- **AutoEat-Upgrades nur Schwelle, nie Heal-Menge** (AUTO_EAT_TIERS healMult alle 1.0; Shop-Text/i18n + Tests angepasst).
- **Lifesteal-Floater** (vorher), **Combat-Außenrahmen** + **Status-Debuffs als Overlay IM Frame** (kein Bild-Reskalieren).
- **Combat-Container/Panels**: äußerer .battle Holzrahmen+Textur; .cl-section-Panels haben Frame (im Source); Food-&-AutoEat-Panel kompakter (Basis 380→330, max 580→380).
- **Bestiary**: Monster-BG nur noch im Top-Banner (Footer solide); TASK-TARGET-Badge im Citadel-Look (Holzrahmen+Pergament).
- **5 Dietriche/Lockpicks KOMPLETT aus dem Spiel entfernt** (Chef-Entscheid; Items+Shop; lösten ChatGPT-Filter aus). Thieving ohne Speed-Tool.
- **Icon-Prompts** (288 Items): fiktiv-Game-Framing + grell-grüner #00FF00-Chroma-BG (Filter-Bypass) + material-spezifische Looks (Runit=blau-türkis, Mithril=silbrig-blau, Aetherium=türkis-weiß …). Lockpick-Label/Beschreibung neutralisiert.

## Polish-Batch 2 + Tower-Split (~22:15–22:35) — grün
- **Combat-Loadout-Leiste vertikal stark kompaktiert** (Padding 12→5, Border 8→6, Gaps, Equip-Slots 44→34, Skill-Rows 9→3px, Food-Slots 52→42) — Chef: minimaler vertikaler Platz.
- **Monster-Cards**: Artwork+Footer auf FLEX umgebaut (Footer flex:1 → bündig bis Unterkante, kein Leerraum mehr bei Grid-Stretch); Holzrahmen 5→10px (dicker, auch oben); BG nur im Top-Banner.
- **Kampfstil-Wahl (Stance) jetzt im laufenden Kampf** über den Portraits (battle-stance-bar, nur Melee).
- **Duplikat-Monster-Split** (content-dev): 8 `tower_*`-Monster (goblin/goblin_rogue/skeleton_warrior+archer/ember_elemental/iron_revenant/frost_hound/roc_void), 5 Slayer-Floors auf tower_*-IDs umgebogen, zone slayer_tower; Zonen-Originale bleiben → Tower kann eigene Level/Drops bekommen. Engine 436/Persistenz 58/Build grün.
UI-Checkpoint-ZIP (ohne Split) bei 22:33 ausgeliefert; finaler ZIP MIT Split baut gerade.

## Glow-Weg + Universal-Stacking + Rare-Find (~22:45–23:15) — grün
- **Rarity-Glow ENTFERNT** (Chef: Rarity nur über Karten-Hintergrundfarbe): `.inv-slot.rarity-*` box-shadow-Glows → Rarity-Hintergrundfarben. ChatGPT-Prompts: rarityFlavor + MATERIAL_LOOK entglowt (keine Schimmer/Leuchten/Glut/Puls mehr; Farben bleiben) + globale Anti-Glow-Regel im Intro + Chroma-Grün-BG. Datei neu + geöffnet.
- **Universal-Stacking (Chef-Entscheid „ALLES stapeln, auch Gear/Tools"):** addItem ignoriert jetzt `stackable:false` → ALLE Items stapeln bis 999 (nur Suffix-INSTANZEN bleiben Unikate via addInstance). canHold/buyItem/ShopPage-noSpace auf canHold umgestellt; „/1"-Anzeige raus. 4 inventory.test-Tests auf neues Modell angepasst. Engine 436/Persistenz 58/Build grün.
- **„Rare Find!"-Toast nur noch bei GEGNER-LOOT**, nicht beim Crafting (gegatet auf wasInCombat) — Crafting läuft nie im Kampf.
- Frage „Thieving-7": = Fence-Badge (7 Diebesgut-Items im Inventar zum Verkaufen) — kein Bug.

## Combat-Feel + Slayer-Rework + Loadout-Sidebar (~23:30–00:00) — grün
- **Schadens-Varianz (Chef: nur Varianz, kein OSRS-Vollport):** resolveAttack — Non-Crit-Hits ROLLEN [floor..maxHit] (≈0,33×–1,67×, Mittelwert=alt → DPS-neutral), Crit EXAKT wie vorher (balance-erhaltend). 2 statistische Guard-Tests (mana-shield, ranged-vs-magic) über mehrere Seeds gemittelt → robust gegen das Varianz-Rauschen. Engine grün.
- **Slayer-Rework (Agent combat-dev):** dynamischer Welt-Task-Pool aus Monstern mit level ∈ [combatLevel+1..+8] (Tasks immer ÜBER dem Spieler, kein Low-Level-Goblin; Endgame-Fallback auf nächstgelegene). NUR EIN Master (brenna_ashwick, Unlock 1/1). Slayer-XP JETZT pro Target-Kill (monster.xp×0.5) + Abschlussbonus. Engine 441 Tests grün.
- **Combat-Loadout in linke Sidebar (Agent ui-dev):** CombatPage .combat-layout (links .combat-sidebar 340px + Loadout vertikal, rechts .combat-main-area). Loadout jetzt auch im Kampf sichtbar → redundante battle-stance-bar über Portraits entfernt.
- **tower_*-Monster-Art-Fallback:** getMonsterSrc(tower_<x>) → Original-Art <x> (keine Asset-Duplikate); tower_* aus Icon-Prompts ausgeschlossen.
- **Prompts (Chef):** Waffen jetzt ~45°-Diagonal-Winkel + globale Kamera-Diversität (nicht steril-aufrecht), OHNE Reihenfolge zu ändern.
- Frage „Thieving-7" final geklärt: Fence-Diebesgut-Zähler (9 Diebesgut-Typen).

## Arbeitsrhythmus (Loop, selbst-gepaced)
- Implementierungs-Wellen (spezialisierte Agenten, GETRENNTE Dateibereiche) + periodische frische
  10-Tester-Sweeps zur Validierung/Regressionssuche.
- Nach JEDER Welle: typecheck alle Pakete + Engine(ohne sim)/Persistenz-Tests + Client-Build = GRÜN.
  Nie Rotes hinterlassen. An stabilen Checkpoints: volle Sim + neues ZIP.
- Serieller Single-Writer: nur EIN content-dev gleichzeitig auf `packages/content/src/index.ts`.

## Backlog (aus Tester-Sweep 2026-06-28, siehe design/tester-sweep-2026-06-28.md)
**Ökonomie:** [W1] Bank-Gold-Sink/Ausbau (#10/#11) · [W1] Smithing-Resale-Cap (#9) ·
Combat-Gold-Endgame-Kurve (#12) · Dungeon-Key-Sink (#13).
**Combat/Balance:** Over-Cap-HP-Leiter glätten (#7) · dex-Super-Stat (#4) · DoT-vs-Resist-Bosse (#6) ·
Melee-Lifesteal/Defensiv-Identität (#5) · Sim um Ranged/Magie-Zeilen erweitern (#8).
**Content:** Tempo-Werkzeuge Fishing/Foraging/Thieving (#2.4) · legendary/godly Drop-only-Gear (#5) ·
Fishing-XP-tote-Zwischentiers (#2.5).
**UX:** Bank-„Slots kaufen"-Button (zu W1) · Icons für die 13 neuen Items (Chef generiert).

## Bereits erledigt vor dem Run (Kontext)
Tester-Sweep + Bug-Welle (P0 Stance, baseAttributes-Crash, Evasion-Boden, i18n, Audio, Portrait, F11)
+ Balance-Welle 1 (Attribut-Parität, Ranged-Crit, Magie-Mana, 13 Rezepte, tote Rezepte, Mandrake,
Default-DE, Stil-Text). Alles grün, ZIP @ Downloads\GrimReach-0.1.0-Playtest.zip.

## Iterations-Log
### Welle 1 (Start ~00:10) — Ökonomie-Backend
- **logic-dev:** Bank-Gold-Sink + Ausbau (engine/bank + shared Basis-Kapazität + State + persistence
  SAVE_VERSION + Migration). Behebt #10 (mitwachsender Gold-Sink) UND #11 (Bank-Cap erweiterbar).
- **content-dev:** Smithing NPC-Resale-Cap (#9) — craftbares Gear-Resale deckeln, damit Schmieden
  nicht der ~16×-Dominanz-Faucet bleibt. Combat-Gold/Drops unangetastet.
- Danach: Integrations-Verify + ggf. ZIP. Welle 2: ui-dev Bank-Button + frischer Tester-Sweep.

### Welle 1 — ERLEDIGT (~08:40)
- logic-dev: Bank-Gold-Sink. `BANK_CAPACITY`(100) → `BASE_BANK_CAPACITY`(60) + `bankSlotsPurchased`-State,
  `effectiveBankCapacity(state)`, `buyBankSlots/nextBankSlotCost` (eskalierender Preis, Cap +200),
  SAVE_VERSION→41 + Migration. content-dev: 189 schmiedbare Gear-`value` auf ~2,5×-Marge gesenkt.
- Integrator-Fix: `BankPage.tsx` von `BANK_CAPACITY` → `effectiveBankCapacity(state)` (logic-dev ließ
  client bewusst aus; Renderer-Referenz gebrochen → von mir gefixt).
- Verify: typecheck alle 5 ✅, Engine 430 ✅, Persistenz 56 ✅. Volle Sim läuft (Ökonomie-Checkpoint).

### Welle 2 (Start ~08:45)
- ui-dev: Bank-„Slots kaufen"-Button (nutzt buyBankSlots/nextBankSlotCost) — sichtbarer Gold-Sink-UI.
- Parallel: volle Sim als Welle-1-Ökonomie-Validierung. Danach: ZIP + frischer Tester-Sweep planen.

### Welle 2 — ERLEDIGT (~09:00)
- ui-dev: Bank-„Slots kaufen"-Button + 4 i18n-Keys (en/de). typecheck + Build grün.
- Ökonomie-Welle (Bank-Sink + Button + Smithing-Resale) komplett. Sim Bronze-Baseline 0.
- Client neu gebaut → frisches Playtest-ZIP @ Downloads\GrimReach-0.1.0-Playtest.zip.

### Welle 3 (Start ~09:05) — Sammel-Skill-Tempo
- content-dev: Tempo-Werkzeuge für Fishing/Foraging/Thieving (Angeln/Sichel/Dietrich-Tiers, analog
  Mining-Spitzhacken/WC-Äxte; nutzt generisches tools.ts/bestToolSpeed) + Fishing-XP-tote-Zwischentiers
  (catch_cod/ghostfin_pike unter catch_trout) anheben. Behebt Tester #2.4 + #2.5.
- Danach: nach ein paar weiteren Wellen ein frischer 10-Tester-Sweep zur Re-Validierung.

### Welle 3 — ERLEDIGT (~09:20)
- content-dev: 15 Tempo-Werkzeuge (Fishing-Ruten/Foraging-Sicheln/Thieving-Dietriche, je 5 Tiers,
  Shop-gekauft, speedMult 0.93→0.58) + Fishing-XP monoton gefixt (catch_cod/ghostfin_pike/shadowcarp/
  ironscale_bass angehoben). Wirkt automatisch via bestToolSpeed (tick.ts).
- Verify: typecheck alle ✅, volle Suite 433 Tests ✅, Sim AUFFÄLLIGKEITEN 0, keine Walls.

### Sweep 2 (Start ~09:25) — Validierungs-Sweep
- 10 Personas erneut: VALIDIEREN der Wellen seit Sweep 1 (Stance/Parität/Evasion, Bank-Sink+Button,
  Smithing-Resale, Tempo-Tools, Fishing-XP, Default-DE) + NEUE/Rest-Funde. Bekannten deferred-Backlog
  (combat-gold #12, over-cap-HP #7, legendary/godly #5, dex #4, DoT-resist #6, dungeon-keys #13,
  sim-ranged/magic #8) NICHT neu melden. Danach Triage → nächste Implementierungs-Welle + ZIP.

### Sweep 2 — ERGEBNIS (~09:45): QA-Verdikt SHIP, alle jüngsten Wellen validiert OK.
Neue Funde (Fix-Welle ~09:50 gestartet, 3 Agenten getrennt):
- content-dev: shade_rune toter Loop (neu durch Welle-1); Kochfisch-Heilung + Woodcutting-XP +
  Roh-Fisch-Werte + Thieving-drunkard nicht-monoton; frost_pelt_hood rarity common→rare.
- logic-dev: **Bank-Grandfather** (P1-Regress) — pre-41-Saves seeden bankSlotsPurchased=40 (Veteranen
  behalten 100); + Doc-Kommentar Bank-Preis (≈37,8 Mio).
- ui-dev: Runenkunst-Onboarding-Text faktisch falsch (Mana statt Runen); quests.comingSoon-Umlaute;
  OptionsPage:67 veralteter Kommentar; toter (false&&)-Stance-Block in CombatPage entfernen.
- Hinweis: Ökonomie-Validator (#4) lieferte Junk-Completion (redundante Eigen-Sim); Ökonomie aber
  durch QA/Robustheit/Min-Maxer abgedeckt. Balance-Notizen (wis-Mehrfachstat, Ranged-Crit-Cap,
  Tool-Kauf-ohne-Level-Gate) → deferred-Backlog.
- Danach: Integrations-Verify + frisches ZIP.

### Sweep-2-Fix-Welle — ERLEDIGT (~09:50): alle 3 Agenten grün, integriert.
- content-dev: shade_rune→craft_void_shroud (Loop zu), Kochfisch/Woodcutting(6-Knoten)/Roh-Fisch/
  drunkard monoton, frost_pelt_hood→rare. logic-dev: Bank-Grandfather (pre-41→bankSlotsPurchased=40,
  effektiv 100; Test +3), Doc-Kommentar. ui-dev: Runenkunst-Text korrekt (Mana), Umlaute, Dead-Code raus.
- Integration: typecheck alle 5 ✅, Engine 430 ✅, Persistenz 58 ✅. Ökonomie-Sim (separat) Bronze 0.
- Client gebaut → ZIP (Sweep-2-Checkpoint) wird gepackt.

### Welle 4 (Start ~10:05) — Mandrake-Folgefix + Top-Tier-Gear
- content-dev: mandrake_tincture 200→~140 + mandrake_seed billiger (P1/P2 aus Ökonomie-Validierung);
  Foraging-Reagenzien-Pfad monoton; legendary/godly Drop-only-Gear (Tester #5: Top-Tiers leer) von
  Endgame-Bossen. Danach Verify + (Checkpoint-Sim) + ZIP.
- Offener Backlog (Endgame/Balance): combat-gold-Kurve #12 (~175-206k g/h endgame), over-cap-HP #7,
  dungeon-key-sink #13, dex/wis-Mehrfachstat #4, sim-ranged/magic #8, Tool-Kauf-Level-Gate-Hinweis.

### Welle 4 — ERLEDIGT (~10:40): integriert + grün.
- content-dev: mandrake_tincture 200→140, mandrake_seed 20→10/Shop 12, Foraging-Reagenzien monoton,
  6 neue legendary/godly Drop-only-Items (voidwarden_blade/idol_shroud/spectral_longbow/skarn_idol_staff
  legendary; last_judgement/eye_of_the_idol godly) von Endgame-Bossen. Sim Bronze 0, keine Walls.
- Integration: typecheck alle 5 ✅, Engine 430 ✅, Client-Build ✅. ZIP (Welle-4-Checkpoint) wird gepackt.

### Cadence-Entscheidung (CEO): Volle 10-Sweeps an größeren Meilensteinen (Budget); dazwischen
fokussierte Regressions-/Balance-Checks. Jetzt: QA-Regression + Balance auf die neuen legendary/godly.
Nächster großer Schritt-Kandidat: combat-gold-Endgame-Kurve (#12) via balance-designer-Spec→content-dev,
dann voller 10-Sweep.

### Welle 4 Validierung (~10:50): QA SHIP (430+58 grün), Balance: Legendaries OK, Mandrake peer-konform.
P1-Fund: godly nur Melee → Apex-Parität-Bruch. → Welle 5 startet.

### Welle 5 (Start ~10:55) — godly Apex-Parität
- content-dev: 2 neue godly Drop-only-Waffen (Ranged-Bogen + Magie-Stab) von last_idol, gespiegelt an
  last_judgement-Band → jeder Stil hat godly-Chase. + Tunes: skarn_idol_staff-Drop 0.012→0.015,
  last_judgement mDmg 420→400/critDmg 0.50→0.40, eye_of_the_idol critDmg/acc gezähmt, idol_shroud-Text.
- Offene P2-Doc-Nits (kein Fix nötig): shared:949 weaponEffect-Kommentar „nur Magie".
- Danach: Verify + Sim + ZIP, dann combat-gold-Kurve (#12) + voller 10-Sweep.

### Welle 5 — ERLEDIGT (~11:10): godly Apex-Parität integriert + grün.
- 2 neue godly-Waffen (last_vengeance ranged, last_condemnation magic) von last_idol → jeder Stil hat
  godly-Chase; + Tunes (skarn-Drop 0.015, last_judgement ins Band, eye_of_the_idol gezähmt, idol_shroud-Text).
- Verify: typecheck alle 5 ✅, Engine 433 ✅, Persistenz 58 ✅, Auffälligkeiten 0. Client gebaut → ZIP.

### Sweep 3 (Start ~11:15) — voller 10-Tester-Milestone-Sweep
- 10 Personas (Anfänger/UX, Idle, Combat, Crafter, QA, Ökonomie, Robustheit, Min-Maxer, Completionist,
  Feel): VALIDIEREN den akkumulierten Stand (legendary/godly Tier, Parität, Ökonomie, Monotonie,
  Bank-Grandfather) + NUR neue Funde; bekannten deferred-Backlog (combat-gold #12, over-cap-HP #7,
  dungeon-keys #13, dex/wis #4, sim-rows #8) NICHT neu melden. Danach Triage → ggf. Fix-Welle, ZIP.
- Hinweis Budget/Cadence: volle 10-Sweeps an Meilensteinen (so wie hier); dazwischen fokussierte Checks.

### Sweep 3 — ERGEBNIS (~11:45): Verdikt SHIP, kein P0/P1-Blocker, Ökonomie konsistent. Echte Funde:
- P1: Burn-Affix-Downgrade (combat.ts status last-write-wins); skillguide.slayer roher Key (i18n);
  Ranged-Apex-Parität-Lücke (last_vengeance kaum Upgrade, ~20% Gap, kein fletching→dex-Feed);
  Foraging-Primär-Track-Monotonie (bloodthistle/palefungus/wildhives).
- P2: thieving merchant-Dip, scale_skarn-Slayer-Pool, Godly-Achievement, Herblore-Heiltrank-Inversion
  (bloodmend/revenant wert-negativ), runecrafting-Einzeiler, Bank-Button-Preis/Icon, Dead-Code, aria-labels.
- Deferred (Design): legendary/godly value-cliff (#12-nah), critDamage-Cap, Ranged-no-status (gewollt).

## ★ ECHTES TESTER-FEEDBACK (Chef relayed, ~11:55) — TOP-PRIORITÄT
- **A) Texte generell zu klein/schwer lesbar** → app-weite Schriftgrößen-Anhebung (ui-dev läuft, a47ff97).
- **B) „Kampf beenden" wirft komplett in die Kampf-Übersicht** → soll zur Monster-Liste der aktuellen
  Gegend zurück (MonsterSelect `zoneId` merken/wiederherstellen). QoL, CombatPage.tsx.
- **C) Slayer-Auftrag-Abschluss ohne Feedback** → Abschluss-Toast (Toasts.tsx difft `slayerTasksCompleted`)
  + Fortschritts-Chip oben (GameStats, zeigt `slayerTask.progress/required` + Monstername). Reiner Renderer.
- **D) Battle-Screen: Fighter-Bilder viel zu klein** → Figuren vergrößern (combat.css `.battle-main
  .fighter-figure-wrap` Höhe 280px + `.fighter-figure img` max 92% → deutlich größer; bottom-aligned
  bleibt). Renderer/combat.css.
- Sequenz: A läuft (ui-dev Text-Größen, editiert combat.css). B+C+D als EINE combat-fokussierte ui-dev-
  Welle NACH A (gleiches Revier Renderer → seriell, kein Konflikt). Endgame-Backlog (#12/#7/#13) wartet.

### Tester-Feedback-Status (~12:40):
- A) Texte größer — ERLEDIGT (app-weite Schriftgrößen-Anhebung, alle CSS, Build grün).
- Cleanup-Welle (content/combat/ui) ERLEDIGT + integriert: typecheck alle 5 ✅, Engine 434, Persistenz 58,
  Client-Build ✅, Sim Bronze 0. (Ranged-Apex-Parität, Monotonie, Burn-Affix-max, skillguide.slayer etc.)
- B+C+D — ERLEDIGT (ui-dev a740c2a): B Kampf-Beenden→Gegend (lastZoneId gemerkt); C Slayer-Abschluss-Toast
  + Fortschritts-Chip oben (gamestats-slayer-chip); D Fighter-Bereich flex:1 → füllt Spalte, Void weg
  (Regression behoben — vorher full-vertical-fill, jetzt wiederhergestellt). typecheck alle 5 + Build grün.
  → ZIP mit ALLEN Tester-Fixes (A+B+C+D) GEPACKT @ Downloads\GrimReach-0.1.0-Playtest.zip (12:33).

## ★ Chef-FRUST (~12:55): „Text immer noch nicht größer!" (Shop-Bild, Verkauf rechts abgeschnitten)
Diagnose: (a) mein +2px-Font-Bump wurde vom globalen 0,80-Zoom fast aufgefressen → kaum sichtbar;
(b) Chef-Fenster wirkt schmal/Portrait → UI (für Vollbild gebaut) schneidet rechts ab. Vermutlich lief
auch ein alter extrahierter Build. FIX (verifiziert per Build):
- **Globaler Zoom 0,80 → ~0,89** (Referenz 2400×1350 → 2150×1210, Floor 0,65→0,72) = ALLES +~11% größer.
  Bewusst nicht 0,95 (würde effektive Breite zu stark senken → breite Seiten horizontal abschneiden).
- Shop-Verkaufszeile: `flex-wrap` an Card + Actions → Buttons brechen um statt abzuschneiden;
  shop-sell-name 13→16, qty/price 14→16.
- typecheck + Build grün. → portable + ZIP. WICHTIG für Chef: alten Extraktions-Ordner LÖSCHEN + neu
  entpacken (Änderungen sind in der exe) + Vollbild (F11). Falls noch zu klein: Zoom weiter auf 0,95.

## ★ Chef-Feedback (~13:15): Shop-Text noch zu klein + Sell→Grid + Combat-Scaling
- Shop-Item-Namen (Kauf) + Verkauf größer; Verkaufs-Inventar von LISTE → SLOT-GRID (wie Bank/Inventar,
  Verkauf via ItemCell-Tooltip ×1/×10/Alles); Kaufseite bleibt Liste/Karten.
- Combat „skaliert nicht" @1920×1080: Fill-Fix IST im aktuellen Build korrekt (Kette verifiziert:
  combat-page h:100%→battle flex-col→battle-main flex:1→fighter h:100%→figure-wrap flex:1→img h:100%).
  Test-User vermutl. ALTER Build → muss 12:47-ZIP frisch entpacken. ui-dev auditiert zusätzlich ALLE
  Seiten-Roots auf Höhen-Fill.
- ui-dev a30642 ERLEDIGT: Shop-Item-Namen 15→20px (Cinzel bold); Verkaufs-Inventar Liste→Slot-Grid
  (cs-inv-grid + ItemCell, Verkauf via Tooltip ×1/×10/Alles, i18n shop.sell1/sell10/sellAll); Scaling-Audit:
  ALLE Seiten-Roots ok, Combat-Fill-Kette intakt verifiziert (kein toter Raum). typecheck alle 5 + Build grün.
- Combat-„skaliert nicht" GEKLÄRT: Chef bestätigt, war als der User das FENSTER verkleinert hatte; im
  Normal/Vollbild füllt+skaliert es korrekt (Screenshot #12). Kein Bug.
- Felsschlund=Pet „Cragmaw" (Mining-Pet), Drop 1/95000=0,00105%/Aktion, flach (kein Level-Scaling);
  kumulativ bis L27 ~3-4%. Test-User-Drop war legit.
- → portable + ZIP mit Shop-Rework.

## Bronze-Rüstung: weißer Hintergrund entfernt (~17:40)
Chef: bronze_platebody hatte weißen BG. Scan: 8 Items betroffen (komplette Bronze-Rüstung +
bronze_arrowheads), alle anderen 740 transparent. Quell-Art war white-bg (keine transparente Variante).
Fix: Flood-Fill-BG-Removal (scratchpad/dewhite.cjs, sharp) auf alle 8 → transparent, weiche Kante,
Innen-Details erhalten. Re-Scan 0 white-bg. Visuell verifiziert. Originale im Archiv. → Build + ZIP.

## Icon-Analyse + ChatGPT-Prompts (~13:05, Chef-Auftrag „warten auf Steam")
142 fehlende Bilder (141 Items + 1 Monster scale_skarn): 15 Tools, 16 Consumables, 84 Equipment, 26 Materials.
Paste-fertige Prompts (Stil-Block + Rarity-Glow, pro Item Dateiname) → `design/chatgpt-icon-prompts-2026-06-29.txt`.
Skript: scratchpad/genprompts.cjs (Content-IDs vs assets/items|monsters). Chef generiert Bilder → ich binde ein
(assets/items/<id>.png, Auto-Discovery) → Quell-Originale nach ASSETS\archive\. Priorität: neue Session-Items
(Tools/legendary/godly/Tonics) + scale_skarn; Bögen/Roben-Sets = vorbestehende Lücken (Emoji-Fallback, kein Blocker).

## CADENCE-WECHSEL (~12:35): Loop auf ruhige Überwachung
Alles Live-Tester-Feedback abgearbeitet, Build sehr poliert + voll verifiziert (typecheck alle 5,
Engine 434, Persistenz 58, Sim Bronze 0). Live-Tester-Feedback (via Chef) ist wertvoller als weitere
Auto-Sweeps → längere Idle-Intervalle, reaktionsbereit auf neues Feedback (weckt sofort als User-Msg).
Endgame-Backlog (#12 combat-gold, #7 over-cap-HP, #13 keys, dex/wis, sim-ranged/magic, godly-Achievement
echter ConditionType) bleibt bewusst liegen — nur mit Sorgfalt/Sim, nicht blind im Idle.
- Danach: Integration-Verify + frisches ZIP mit ALLEN Tester-Fixes (A+B+C+D).
- Offen (logic-dev, optional): echtes „godly-Item erhalten"-Achievement (neuer ConditionType) statt Proxy.

### Cleanup-Welle (Start ~11:50) — 3 Agenten getrennt:
- content-dev: Ranged-Apex-Parität (last_vengeance stärker + fletching→dex + ammoDamage) + Foraging/
  Thieving-Monotonie + Herblore-Heilline + scale_skarn-Slayer + Godly-Achievement. (volle Sim Pflicht)
- combat-dev: Status-Anwendung max() statt overwrite (Burn-Affix-Downgrade-Fix).
- ui-dev: skillguide.slayer + runecrafting-Einzeiler + Bank-Button-Preis/Icon + Dead-Code + aria-labels.
- Danach: Integration-Verify + ZIP. DANN Loop runterfahren (Spiel sehr poliert → längere Intervalle,
  leichtere Checks) bis Chef ~21:00 zurück; Endgame-Backlog (#12 combat-gold, #7 over-cap-HP, #13 keys)
  nur noch bei Bedarf/mit Sorgfalt.

## Combat-Feel-Welle 2 (Chef live, ~00:30–01:20, 2026-06-30)
Chef-Aufträge in Folge:
1. **Item-Tooltip:** Krone/Emblem oben entfernt (itip-crest raus), „MATERIAL"-Typ-Chip + Text kleiner
   (18→13px, Padding kompakter). Nach Entfernen der Krone clipte der Name → `.itip-panel` padding-top 0→26px.
2. **OSRS-Sofort-Wins 1–3 (selbst, reine Anzeige — Engine-Events `miss`/`xp` existierten schon):**
   - Miss-Hit-Splat: blaue „0" auf der angegriffenen Seite (CombatPage Floater + `.dmg-number.miss`).
   - Max-Hit + Angriffstempo in der Loadout-Sidebar; `DerivedStats.maxHit` (= attackDamage×DMG_MAX_HIT_MULT),
     Konstante DMG_MAX_HIT_MULT nach shared verschoben (Single Source: combat.ts + computeStats). i18n +3 Keys.
   - Floating-XP-Drops: goldene „+N XP" beim Spieler bei Kill (`.dmg-number.xp-drop`).
3. **Zonen-Level-Rebalance + Endgame (content-dev-Agent af7d28…):** kontiguierliche, überlappungsfreie
   Bänder: pastures 1–15 · borderlands 15–30 · ashfields 30–45 · blackthorn 45–65 · crypt 65–90 ·
   wildwood 90–120 · coast 120–155 · slagpit 155–200 · highlands 200–242 · idolhall 245–295. Stats
   mitskaliert (z.B. roc Lvl 200/1120HP/168dmg), Dungeon-Eintrittslevel synchronisiert. Agent brach seine
   Eigenverifikation ab → ICH unabhängig verifiziert.
   - Nachgezogen: zones-Anzeige-Array auf Schwierigkeitsreihenfolge umsortiert (highlands war Pos.6).
   - 6 von der Rebalance gebrochene Tests selbst gefixt: 4 Crypt-Dungeon (meine crypt_depths 30→55
     zurückgenommen) + 2 mana-shield (Referenz-Mob ash_tyrant jetzt Lvl45/74dmg → auf bull_boss 290HP/24dmg
     umgepinnt; Survival-Test über 40 Seeds gemittelt = varianz-robust).
- Verifikation: Typecheck 5/5 exit 0, Engine 441/441, Persistenz 58/58, Client-Build grün. VOLLER
  Balance-Sim (neue Zonen-Stats) läuft noch (bcntisw1l) → bei Grün Portable+ZIP+Report; sonst nachsteuern.

### Finaler Sim-Befund (~02:15, 2026-06-30) — Zonen-Rebalance
Sim b9pgf1ju6 (sauberer Ist-Zustand, 41 Min): **3/3 PASS, exit 0, kein kaputter Zustand.**
- **ECHTE WALLS (auch geared unbesiegbar) = 0** ✅ — nichts ist real unbeatbar.
- **ÜBER BASELINE — erwartbar unbesiegbar = 13** (gewolltes Endgame).
- **Bronze-Baseline-AUFFÄLLIGKEITEN = 16** (war historisch 0): 14 Monster (void_herald L90, dire_wolf
  L112, tide_siren L138, iron_revenant L175, frost_hound L182, frost_hexer L188, roc-Familie L200–233,
  highland_wyvern L228 + 3 tower-Kopien) + forest_warden L65 als „Stat-Wall, zu tanky für sein Level"
  + craft_slayer_helm 0 XP/h.
- **WICHTIG:** Der content-dev-Agent hat „Stat-Wall OHNE Regen" als Aufforderung MISSverstanden und
  regen 3–10 auf diese 14 ergänzt — das ändert die Klassifizierung NICHT (sie bleiben Bronze-Anomalie),
  macht sie nur tankiger. Echter Fix = HP/Defense dieser 14–16 auf Tier-Niveau senken (besiegbar wie ihre
  Tier-Nachbarn) + regen auf Nicht-Bossen zurücknehmen, Boss-regen (last_idol 10, scale_skarn 6) behalten.
- Entscheidung: Build ist grün & schiffbar (Härte = Chef-Ziel) → JETZT Release; De-Tank-Balance-Pass als
  Follow-up (Chef-Steuerung zur gewünschten Endgame-Härte abwarten, sonst autonom Richtung „Bronze 0").

- BUILD AUSGELIEFERT (~02:20): Portable + ZIP C:\Users\MSchu\Downloads\GrimReach-0.1.0-Playtest.zip (701 MB, Grim Reach.exe + LIESMICH). Alles gruen (Typecheck 5/5, Engine 441, Persistenz 58, Client-Build, Sim 3/3 SIM=0, ECHTE WALLS=0). OFFEN als Follow-up: De-Tank-Balance-Pass fuer 16 Bronze-Anomalien + regen-Ruecknahme auf Nicht-Bossen (Chef-Steuerung zur Endgame-Haerte abwarten).
- BUILD AUSGELIEFERT (~02:20): Portable + ZIP nach Downloads/GrimReach-0.1.0-Playtest.zip (701 MB,
  Grim Reach.exe + LIESMICH). Alles gruen (Typecheck 5/5, Engine 441, Persistenz 58, Client-Build,
  Sim 3/3 SIM=0, ECHTE WALLS=0). Follow-up offen: De-Tank-Balance-Pass fuer 16 Bronze-Anomalien +
  regen-Ruecknahme auf Nicht-Bossen (Chef-Steuerung zur Endgame-Haerte abwarten).

### A/B-Auflösung (~03:45) — De-Tank ÜBERFLÜSSIG
Mein „16 Bronze-Anomalien"-Befund war VERALTET: mein Sim b9pgf1ju6 startete 01:34, BEVOR der Agent das
regen ergänzte. Die Agent-Sims auf dem regen-Stand zeigen den wahren Verlauf:
- sim-clean.log (vor regen): Bronze 16
- sim_out2.txt (teils regen): Bronze 2
- sim_final.txt (finaler Stand, ~03:20): **Bronze 0, ECHTE WALLS 0, 3/3 PASS** ✅
Der regen-Ansatz erreicht also „Bronze 0" — KEIN De-Tank nötig, A/B gegenstandslos. Stat-Kurve bestätigt:
roc L200 hp1120/def72 ist nicht auffällig (Nachbar charred_doomknight L200 hp2680/def135). Slayer-Helm-
Kette BLEIBT (Teil der Bronze-0-Lösung). Aktion: finaler Portable+ZIP (mit Nachzügler-Fixes) + frischer
Bestätigungs-Sim b2vyjwcib vom exakten Ist-Stand; ZIP-Auslieferung erst nach Sim=Bronze-0.

### FINALER BUILD ausgeliefert (~04:24, 2026-06-30)
Bestätigungs-Sim b2vyjwcib (frisch, exakter Ist-Stand): Bronze-Baseline-Anomalien=0, ECHTE WALLS=0,
ÜBER BASELINE=28 (gewollt), 3/3 PASS. Alles grün (Typecheck 5/5, Engine 441, Persistenz 58, Client-Build).
ZIP neu gepackt: C:\Users\MSchu\Downloads\GrimReach-0.1.0-Playtest.zip (701 MB, Grim Reach.exe 03:46 + LIESMICH).
Enthält jetzt zusätzlich zur vorigen Auslieferung: craft_slayer_helm-3-Stufen-Kette + 4 neue Slayer-Items
+ forest_warden regen + finale regen-Tuning → Bronze 0. KEIN De-Tank. Zonen-Rebalance-Epos abgeschlossen.
Lessons learned: content-dev-Agent lief unbemerkt lange weiter + parallele Edits/Sims → künftig Agent-
Fertigstellung härter verifizieren (Disk-Stand + Prozesse prüfen, Agent explizit stoppen) bevor man selbst
an denselben Dateien arbeitet.

## UI- + Balance-Welle (Chef live, ~08:30–10:15, 2026-06-30)
Viele Live-Wünsche, alle umgesetzt + verifiziert (Typecheck 5/5, Engine 441, Persistenz, Client-Build):
- WoW-Vergleichs-Tooltip (Shift+Hover Inventar → angelegtes Item rechts, „Angelegt"-Tag; ItemTooltip in
  ItemTooltipCard extrahiert + useShiftHeld + useGameStateMaybe + Wrapper-Layout).
- Hit-Spanne (min–max) in Combat-Loadout statt nur Max-Hit.
- Fighter-Cards komplett überarbeitet: Bild an oberer Goldkante, Level+Diff oben rechts (Holzrahmen+Textur),
  Task-Target oben links im Porträt, Name zentriert, ALLE Stats (hp/dmg/def/acc/eva/Tempo), Drops Label+Grid,
  Buttons unten bündig (margin-top:auto), Footer bg_tileable_wood, dynamische cqw-Skalierung (container-type);
  zwei dup. Card-Blöcke (Zone+Tower) zu EINER MonsterCard-Komponente konsolidiert.
- Thieving-Fence-Badge („8") entfernt (countFenceItems-Import + State raus).
- Sidebar-Spieler-Container: schlanker bündiger Holzrahmen (border-image round 14px) statt schwebender Beams.
- HAUPTMENÜ-CRASH gefixt: ItemTooltipOverlay nutzte app-weit useGameState() (wirft ohne Spiel) → useGameStateMaybe().
- BALANCE „spürbar aber fair" (Chef-Wahl): Low/Mid-Mobs (Bänder bis Crypt) HP×2.3/acc×1.15/dmg×1.10, xp/gold×2.0;
  Endgame+regen unberührt. 2 Fixture-Tests gefixt (mana-shield melee → bull_boss+con30; shop-gold → chicken).
  Sim nach Buff: 3/3 PASS, ECHTE WALLS 0, ABER 1 Bronze-Anomalie skeleton_pyroclasp (L85 zu tanky) — geared
  besiegbar, im Rahmen von „härter"; Chef-Angebot offen, genau den Mob nachzujustieren.
- NEUES TOOL tools/chroma-key.cjs (sharp): Chroma-Key + Despill für Item-Bilder — entfernt #00FF00 (auch
  eingeschlossene Flächen, kein Flood-Fill) + neutralisiert grünen Rand-Schimmer. Smoke-getestet OK.
- Build/ZIP mit allem läuft (bg8k381fb) → danach Chef-Report. portable von 08:53 war kaputt (vor Crash-Fix).

## Icon-Integration + Kampfstil-System (Chef live, ~10:15–11:00, 2026-06-30)
- 277 gelieferte Item-Icons eingebunden: 229 aus resources/undone + 49 lose aus Downloads-Root (Chef:
  "scavenger_boots fehlt" → war im losen Batch). NEUES TOOL tools/chroma-key.cjs (sharp Chroma-Key+Despill,
  entfernt #00FF00 inkl. eingeschlossener Flächen + Saum) → 0% Restgrün. Dateiname=Item-ID → Auto-Discovery
  bindet alle Refs; ~15 Sonderfälle (Tippfehler/DE-Namen) manuell auf korrekte ID gemappt. Originale archiviert
  (ASSETS/archive/items-icons-{done,loose}-2026-06-30).
- Icon-OPTIMIERUNG (wie frühere Praxis): 276 große Icons (bis 3 MB) auf 384px + PNG-palette/level9 → assets/items
  567 MB → 35 MB; exe 1243 MB → 711 MB. Vollauflösung bleibt im Archiv.
- „Press Shift to compare"-Hint ersetzt closeHint auf equippbaren Items (i18n item.compareHint).
- KAMPFSTIL-SYSTEM (OSRS): Stance-Leiste adaptiv je Waffenstil — Melee Angriff/Wucht/Defensiv, Fernkampf
  Präzise/Schnell/Defensiv, Magie Offensiv/Defensiv. activeStanceMods (shared) → Acc/Schaden/Tempo/Block +
  XP-Routing (Defensiv→defence, Magie→magic_off/def). SAVE_VERSION 43 + Migration. 2 styles.test-Fixtures
  angepasst. Alles grün (Typecheck 5/5, Engine 441, Persistenz 58, Build).
- ZIP ausgeliefert (710 MB): 277 Icons + Compare-Hint + Kampfstil-System. Stance-Balance-Sim b4mj1xak8 lief
  noch beim Zippen → Parität nachmelden, falls Imbalance.
- Offen (Chef-Call): skeleton_pyroclasp de-tank? · Holzrahmen-Header ok? · Tower-Monster 1:1-Refactor · Icon-Lücken-Audit.

## Batch „Crafting/QoL/Combat-Feinschliff" (Chef live, ~12:50–14:10, 2026-06-30)
- DUNGEON-LEVEL an neue Zonen-Bänder: crypt_depths 30→70, wildwood_hunt 75→90, highland_aerie 82→92,
  wyvern_lair 90→96 (goblin 20 + idol 99 unverändert). dungeon.test + combat-autorestart.test nachgezogen.
- AUTO-EAT-COOLDOWN (Chef „mit Food kann man fast nie sterben"): AUTO_EAT_COOLDOWN_MS=3000 (shared),
  CombatState.autoEatCooldownMs (optional, transient), Check+Set in tryAutoEat, Decrement pro Tick in
  combatStep. Kein SAVE_VERSION-Bump nötig (optional, default 0).
- CRAFTING AUS BANK (Chef „wichtig"): hasInputs + neuer consumeInput (Inv zuerst, dann Bank) in tick.ts;
  SkillPage matCount/hasInputs/craftable/Material-Anzeige zählen Inv+Bank (bankCount aus engine).
- QUICK-SELL-SLOT oben rechts im Inventar (CharacterPage): Drag→sofort verkauft, „+N Gold"-Flash;
  Instanzen via sellInventoryInstance, sonst sellItem. i18n + CSS (.cs-quicksell).
- HIT-SPANNE enger (Chef-Wahl „Mittel ~35–100%"): DMG_ROLL_FLOOR 0.2→0.35 + DMG_MAX_HIT_MULT 1.667→1.4815
  (gekoppelt Mult=2/(Floor+1) → DPS bleibt exakt neutral, Spanne ~52–148% der Basis).
- UI: Equip-Icons .cs-slot 80%→95% (füllen Holzrahmen, #25); Tool-Slot-Spitzhacke entfernt
  (CITADEL_SLOT_EMPTY tool1/tool2 raus, Import weg); Dungeon-Fortschrittsbalken Citadel 9-slice (#24).
- BALANCE-METHODIK (Chef-Challenge „nach welchen Kriterien?"): Sim balanced über (a) baseline-on-level+Food
  und (b) GEARED_HERO (Lv99 + godiron-Set). „Bronze zu tanky"-Anomalie ist KEIN echtes Kriterium → Skelette
  NICHT entpanzert (Lv80 in Bronze unschlagbar ist korrekt). BUG GEFUNDEN: GEARED_HERO war nicht exportiert →
  ein Wegwerf-Sim importierte undefined (=Lv1-Naked) → Falsch-Walls; jetzt `export const GEARED_HERO`.
- Gezielte Balance-Stichprobe (statt vollem runReport, der bei TICK_MS=100 × HOUR × alle Mobs ×2 jetzt >5min
  dauert): geared zerlegt alles (Huhn 56 … idol_warden L245 14), GEARED-WALLS ≤Lv150 ohne Regen = keine;
  baseline+Food deaths=0 überall → Auto-Eat-Cooldown bricht On-Level-Spiel nicht.
- Grün: Typecheck 5/5, Engine no-sim 441, Persistenz OK, Client-Build. Portable+ZIP läuft (bwzltpqlq).
- FOLLOW-UP (nicht blockierend): voller runReport-Sim ist zu langsam → ggf. samplen/kürzen für nutzbaren
  periodischen Balance-Check.

### Follow-up erledigt: Sim wieder nutzbar (Loop-Iteration ~14:15–14:55, 2026-06-30)
- Ursache der >5min/„Hänger": Content auf ~900 Aktionen + Endgame-Mobs gewachsen; sim.test.ts fuhr je
  Aktion 10min + je Monster ×2 die volle STUNDE bei TICK_MS=100 → Millionen Ticks. (Kein Infinite-Loop;
  alle Schleifen sind begrenzt — nur Laufzeit.) „Mini-durationMs 1/3/10" war ein grep-Artefakt durch
  Zahlentrenner (3_000), keine echten 1ms-Aktionen.
- Fix (nur Test-Helfer sim.ts + sim.test.ts — Spiel-Build UNBERÜHRT, kein Re-ZIP): Test-1-Fenster 10min→2min;
  runReport REPORT_ACTION_MS=120s, REPORT_COMBAT_MS=180s (Raten werden ohnehin auf 1h normiert);
  Report-Labels ehrlich aufs Fenster gesetzt.
- Ergebnis: volle sim.test.ts jetzt 140s (war >5min+Timeout), 3/3 grün. ECHTE WALLS=0, „über Baseline
  erwartbar unbesiegbar" 63 (mid/endgame, ok), Bronze-Auffälligkeiten 9 (informativ, kein echtes Kriterium).
- Combat-Balance-Check isoliert (Test 2) = 3s → schnelles Werkzeug für künftige Balance-Calls. Engine-Typecheck grün.

### Follow-up erledigt: Icon-Lücken-Audit (Loop-Iteration ~15:00–15:20, 2026-06-30)
- Audit aller content-IDs gegen vorhandene PNGs MIT echter Resolver-Logik (Monster: tower_<x>→<x>-Fallback;
  Items: kein Fallback). Ergebnis: nur 1 Monster (scale_skarn L275) + 17 Items von 1011 ohne Bild.
  Items: 4 Gear (frostcaverns_bow, mithril_shortbow, voidhide_legs, aetherscale_cuirass) + 13 Material/Runen/Wards.
- tower_*-Monster sind KEINE echten Lücken (rendern via Basis-Art-Fallback) — entwertet die frühere „9 Monster"-Zahl.
- Ergebnis als persistente Liste design/icon-gaps.md (inkl. Beinah-Treffer-Kandidaten: mandrake_root↔mandrake,
  nightshade_seed↔nightshade — NICHT auto-gebunden, Chef-Entscheid). Nur Analyse + Doc, kein Spiel-Code/kein Re-ZIP.
- Chef-Anfrage: ChatGPT-Bild-Prompt für die fehlenden Icons generiert (gemeinsamer Stil + Chroma-Grün #00FF00 +
  Dateiname=ID, pro Item Prompt mit echten Namen/Beschreibungen). Alias-Frage (mandrake/nightshade) an Chef offen.

### Follow-up erledigt: Tower-Monster-Refactor gescopt + Guard-Test (Loop-Iteration ~15:50–16:10, 2026-06-30)
- 8 Tower-Monster (tower_<x>) sind exakte Copy-Paste-Klone des Zonen-Monsters <x> — heute per Diff bestätigt:
  alle 8 nur in id/zone verschieden, 0 Drift. (tower_forge_compound ist ein Material, kein Monster.)
- SICHER UMGESETZT: Guard-Test packages/engine/src/tower-monsters.test.ts nagelt die 1:1-Invariante fest
  (fängt künftige Drift). 9 Tests grün → Engine no-sim jetzt 450 (war 441). Kein Spiel-Code/kein Re-ZIP.
- Scoping-Doc design/tower-monster-refactor.md mit Optionen: A towerClone-Helfer im Content (DRY, empfohlen,
  via content-dev wegen Single-Writer), B nur Guard-Test (erledigt), C cloneOf-Datenmodell (überdimensioniert).
  Empfehlung: B ist live; A bei Gelegenheit. → Chef-Entscheid für A.

## Chef-Request: Shop-Mengenkauf 1/5/10/50 (~16:15, 2026-06-30)
- buyItem(state, content, itemId, cost, qty=1) erweitert: kauft bis zu qty, partiell (Gold/Platz), gibt
  gekaufte Anzahl zurück (war boolean). 2 shop.test-Fälle auf Count umgestellt + 2 neue (Mengenkauf, partiell).
- ShopPage: Mengen-Umschalter (1×/5×/10×/50×) über dem Buy-Grid; Buy-Button zeigt Gesamtpreis (qty×cost),
  disabled wenn Gold < Gesamtpreis. i18n shop.qtyLabel (Qty:/Menge:) + CSS .shop-buyqty(.active).
- Fix: tower-monsters.test.ts as-Cast über unknown (tsc-streng; vitest hatte es durchgelassen).
- Grün: Typecheck 5/5, Engine no-sim 452 (450+2 Shop), Persistenz, Client-Build. Noch NICHT geZIPpt →
  wird mit den kommenden Icons gebündelt (vermeidet doppelten 710-MB-Download), sofort-ZIP auf Zuruf.

### QA-Scan „definiert aber nie angewendet" (Loop-Iteration ~16:25, 2026-06-30)
- Downloads/ASSETS geprüft: noch KEINE neuen Icons abgelegt (Chef generiert).
- ItemDef-Felder gegen Engine-Referenzen geprüft: nur `weaponType` hat 0 Referenzen (Engine+Client),
  ist aber auf 264 Items gesetzt (sword/dagger/staff/bow/maul…). → Tot-Metadata, kein Bug/kein Crash.
  CHEF-ENTSCHEID, ob/wie nutzen (Tooltip-Zeile? Waffen-Typ-Mastery? oder bewusst Zukunfts-Hook lassen).
  NICHT eigenmächtig verdrahtet (Tooltips wurden gerade entrümpelt → Zeile evtl. unerwünscht).
- Alle übrigen ItemDef-Felder (bonus/modifiers/ammoDamage/manaCost/healAmount/weaponEffect/…) sind verdrahtet.

## Chef-Request: Tester-Sweep mit 20 Spieltestern (~16:30, 2026-06-30)
- 20 read-only Tester-Agenten (general-purpose, Hintergrund) gegen den grünen Checkpoint losgelassen, je 1
  Bereich: 1 Melee · 2 Ranged · 3 Magic · 4 Status/Lifesteal · 5 Auto-Eat · 6 Dungeons · 7 Slayer ·
  8 Smithing/Crafting-aus-Bank · 9 Gathering · 10 Thieving/Farming/Rest · 11 Inventar/Equip · 12 Bank ·
  13 Shop(Mengenkauf) · 14 Instanzen/Suffix/Enchant · 15 Progression/computeStats · 16 Sets · 17 Save/Migration ·
  18 Achievements/Quests · 19 Ökonomie/Balance-Sim · 20 UI/UX/i18n.
- Auftrag: 🔴 Bugs / 🟡 Balance / 🟢 UX; temporäre vitest-Checks erlaubt (eindeutige _tmp_t<N>.test.ts,
  danach löschen); STRIKT READ-ONLY auf Spiel-Code, content/index.ts tabu. Melden, nicht fixen.
- Plan: bei Fertigmeldungen Funde zu EINER priorisierten Bug-Liste bündeln → triagieren → fixen → grün
  halten → ZIP. Tote Agenten ade9876de0292f0b1/af7d28d792bee57b1 bleiben tabu.
- ALLE 20 Berichte da → design/tester-sweep-findings.md. Headline: ECHTE WALLS=0 (geared schlägt alle 184
  Monster), i18n sauber (en=799/de=799). Funde: mehrere 🔴 Datenverlust/Crash/Soft-Lock + Balance/Content.

### Fix-Batch 1 (CODE-Blocker) ausgeliefert (~16:45-17:30, 2026-06-30)
- Gefixt + grün (Typecheck 5/5, Engine no-sim 453, Persistenz 58, Build): Equip/Unequip/Ammo-Datenverlust
  (stowEquipped safe + Pre-Flight-Kapazitätscheck, equipment.ts) + Guard-Test equip-dataloss.test.ts;
  Quick-Sell/Equip-Drag-Instanz (CharacterPage: dragInvIdx immer gesetzt, equipInstance im Drop);
  Bank-Phantom-Instanz (BankPage !slot.instance); deserialize null-Skill-Crash (persistence);
  stopCombat-Dungeon-Leak; Shock-Clamp ≤1 (combat.ts); Hit-Range-Anzeige (DMG_ROLL_FLOOR→shared + minHit
  in DerivedStats, CombatPage minHit–maxHit). + Shop-Mengenkauf 1/5/10/50 (separater Chef-Request).
- LIESMICH aktualisiert; Portable+ZIP läuft (b2iq5we6e) → C:\Users\MSchu\Downloads\GrimReach-0.1.0-Playtest.zip.
- OFFEN Batch 2 (medium): SL1 Slayer-Pool-Filter, L1 autoBank-Stop, ST1 Regen-Stalemate; + 🟢-Politur.
- ZIP Batch 1 ausgeliefert 16:59 (710 MB) → C:\Users\MSchu\Downloads\GrimReach-0.1.0-Playtest.zip.

### Fix-Batch 2 (Code, grün, NICHT geZIPpt) ~17:30-17:45, 2026-06-30
- ✅ SL1 assignTask filtert Tower-Pool nach slayerRequirementMet (kein Soft-Lock; RNG-Normalfall unverändert).
- ✅ L1 canHoldOutputs/canHoldAnywhere prüft Inventar+Bank-Kapazität → stoppt statt Input zu verbrennen.
- Grün: engine Typecheck + Engine no-sim 453. Re-ZIP bewusst aufgeschoben (bündeln mit Icons/nächstem Checkpoint).
- ST1 (Regen-Stalemate) verschoben: braucht Stalemate-Counter + Sim, kein Datenverlust.

## Chef-Request: 2. Tester-Sweep mit 30 Spielern (~17:50, 2026-06-30)
- 30 read-only Tester gegen den gefixten Code → design/tester-sweep2-findings.md. Doppelzweck: feinere/breitere
  Abdeckung (NEU: Pets, Content-Integrität, Stalemate-Quantifizierung, Skills einzeln) + REGRESSIONS-CHECK der
  Sweep-1-Fixes (minHit, ammo-unequip, shock≤1, stopCombat, SL1, L1, Equip-Datenverlust, Instanz-Drag/Sell,
  Bank-Phantom, deserialize-null-Skill, Hit-Range-UI). Eindeutige Temp-Dateien _tmp_u<N>.
- Plan: bei Fertigmeldungen sammeln → Regressionen bestätigen, NEUE 🔴 fixen → grün → ZIP (mit SL1/L1).

### ST1 Regen-Stalemate IMPLEMENTIERT (Loop-Iteration ~19:30-20:30, 2026-06-30)
- combat.ts trackStalemate: verfolgt Referenz-Tief der Gegner-HP; sinkt es über STALEMATE_NO_PROGRESS_MS (60s)
  NICHT um mind. STALEMATE_MIN_PROGRESS_PCT (1% maxHp) → Kampf stoppt mit stopReason="stalemate" (+ Dungeon-
  Reset). Mikro-Schaden (Regen holt ihn zurück) zählt bewusst NICHT als Fortschritt. Reset bei Respawn/Welle/
  Spieler-Tod. shared: STALEMATE_NO_PROGRESS_MS + STALEMATE_MIN_PROGRESS_PCT + CombatState.enemyHpLow/
  noProgressMs/stopReason. Bonus: endCombatOutOfAmmo setzt stopReason="outOfAmmo" (dokumentierter TODO).
- Guard-Test combat-stalemate.test.ts (Regen-Wall → stalemate; gewinnbar → kein Stop). magic-loop-Test
  (unsterblicher 5M-Dummy) auf Stalemate-Neustart angepasst. Engine no-sim 456 grün.
- SIM-VALIDIERT: ECHTE WALLS=0 bleibt (geared Held false-stalematet NICHT), AUFFÄLLIGKEITEN 9/ÜBER BASELINE 63
  unverändert. Typecheck 5/5, Persistenz, Build grün. ZIP läuft (bf8jjhssu).

### Loop-Tick ~21:40, 2026-06-30 — sicherer UI-Nachzug (kein Asset, Chef weg)
- ASSETS leer, Downloads-Root nur Fremd-Art (nichts frisch). Statt idlen: 1 nicht-sim-relevanter UI-Papercut aus
  Sweep 3 behoben — T16 Disenchant-Feedback verschluckt (EnchantingPage: Feedback-Banner aus Runen-Vorschau-Zweig
  herausgezogen → einmalig oben im Preview-Panel; fehlgeschlagener Disenchant zeigt jetzt Meldung). 5 Typechecks +
  Client-Build grün. Engine/Persistenz unberührt. NICHT separat geZIPpt (zu klein für 710-MB-Rebuild) → mit nächster
  Icon-Lieferung/Charge bündeln. Rest Sweep-3-UI-Politur (Affix-Tooltip-Werte, leerer Köcher, Bank-Drag) bewusst offen.

### ZIP ausgeliefert ~21:08, 2026-06-30
- GrimReach-0.1.0-Playtest.zip (710 MB) → C:\Users\MSchu\Downloads\. Bündelt: Sweep-3-Fixes (claimQuest-Reward,
  worldTaskMonsters, bankSlotsUsed, isFull-Import) + Pet-skillXp + i18n-Cleanup + ST1. LIESMICH aktualisiert.
  Portable-EXE frisch 21:06 (711 MB), Build exit 0, alles grün vor Build.

### Chef-Request: 3. Tester-Sweep (20 Tester, Regression-Fokus) ~21:35, 2026-06-30
- 20 read-only Tester gegen den gefixten Code → design/tester-sweep3-findings.md. ALLE ~11 Regressionen seit
  Sweep 2 bestätigt GRÜN (minHit, equipAmmo-Dup, ST1, shock≤1, Pet-skillXp, stopCombat, SL1, L1, canClaimQuest,
  dt-Cap, equipBag). T19-Sim: ECHTE WALLS=0 (kein ST1-False-Trigger am geared Held), Content-Integrität 0 orphan.
- NEUER 🔴 gefixt: claimQuest-Reward-Verlust bei vollem Inventar (quests.ts canHoldRewards-Pre-Check → Claim
  blockt statt Items+einmalige Quest zu verbrennen) + Guard-Test. Plus 3 kleine: worldTaskMonsters-Filter
  (SL1 symmetrisch), bankSlotsUsed `>0`, toter isFull-Import. Engine no-sim 457, alles grün.
- ZIP (b25spmhj1) bündelt Sweep-3-Fixes + Pet-skillXp + i18n-Cleanup.
- OFFEN Chef: ST1-Tuning-Nuance (False-Trigger >100min-TTK), Balance/Content-Liste (Fence-Traps, Margen, bull_boss,
  Ranged-Start/Starter-Food, slayer-Achievement-Leiter, Suffix-Varianz …), UI-Politur (Disenchant-Feedback,
  Affix-Tooltip-Werte). Alles in den findings-Docs.

### i18n-Bulk-Cleanup als UNSICHER eingestuft (Loop-Iteration ~20:30, 2026-06-30)
- Orphan-Detektor-Skript (statisch + dynamische Prefixe) gefahren: 84 „unreferenzierte" i18n-Keys. ABER der
  Bulk-Purge ist NICHT sicher: enthält `onboarding.{economy,equip,fight,gather,idle,process}.{body,title}`
  (12 Keys) = VORAB-Content für den geplanten Onboarding-Meilenstein (Memory: finaler Meilenstein, noch nicht
  gebaut). Auch slayer.tower.*/mastery.* könnten Vorab-Content sein. → NICHT autonom löschen; nur die 10
  bereits entfernten (selbst-verwaiste + city.* stillgelegt) waren eindeutig sicher. Restliche i18n-„Orphans"
  bewusst belassen (harmlos; teils geplant). i18n-Cleanup damit ABGESCHLOSSEN (kein weiterer autonomer Bedarf).

### i18n-Cleanup Teil 2 (Loop-Iteration ~19:40, 2026-06-30)
- 4 weitere tote Keys entfernt: city.intro/shop.desc/bank.desc/quests.desc (Stadt stillgelegt, 0 statische +
  0 dynamische Refs). Client-Typecheck (en/de-Parität) + Build grün. Gesamt 10/82 verwaiste i18n-Keys weg.
- Rest (~72: mastery.*/slayer.shop.*/char.*/skill.*/achievements.*/creation.*/quests.*/footer.*/offline.*/
  instance.*/item.* + Einzel) = geringwertige Restliste, je Kategorie einzeln gegen Refs zu prüfen → besser
  am Stück auf Chef-Wunsch statt 4er-Häppchen. Autonome Code-Arbeit faktisch leer; rein chef-gated.

### i18n-Cleanup Teil 1 (Loop-Iteration ~19:05, 2026-06-30)
- 6 von 82 verwaisten i18n-Keys sicher entfernt (beide Locales): stat.maxHit (durch Hit-Range-Fix verwaist),
  combat.macroStyleLabel/Hint/Weapon + combat.meleeFocusHint/Only (durch Stance-Rework verwaist). Je 0 statische
  UND 0 dynamische Refs verifiziert (nur pet.effect.combat.*/combat.diff.* sind dynamisch → nicht betroffen).
  Client-Typecheck (erzwingt en/de-Parität) + Build grün. Restliche 76 (city.*/mastery.*/slayer.shop.* …) für
  chef-gelenktes Cleanup gelassen (geringere Sicherheit). Nicht geZIPpt (mit Pet-Fix + Icons bündeln).

### Pet-skillXp-Fix (Loop-Iteration ~18:30, 2026-06-30)
- 5 Combat-Pets (gorehound/ironmaw/carapace/carrionwing/charnel) hatten toten +5%-skillXp-Bonus (petSkillXpMult
  wurde nur im Skilling-Tick gelesen). Fix: content durch combat addXp + grantOffenseXp/grantDefenseXp/
  tickPlayerEffects gethreadet, addXp × petSkillXpMult(skillId). Engine-Typecheck + no-sim 456 + client grün.
  Pets nicht im Sim → Balance unverändert. NICHT standalone geZIPpt (mit nächster Icon-Lieferung bündeln).
- Keine neuen Icons in Downloads/ASSETS. Sichere autonome Code-Arbeit jetzt ausgeschöpft (Rest: 82 i18n-Keys-
  Cleanup low-value + Content/Balance = Chef).

### Sweep 2 KOMPLETT (30/30) + Fix-Batch 3 (~17:50-19:00, 2026-06-30)
- ALLE Sweep-1-Regressionen bestätigt GRÜN (stopCombat/SL1/L1/Bank-Phantom/Instanz-Drag+Sell/deserialize/
  Auto-Eat/Shock-Clamp/Munition-Unequip/Equip-Datenverlust/Hit-Range). Content-Integrität 100% sauber (kein
  orphan ref), ECHTE WALLS=0, i18n-Parität en=799/de=799.
- EINZIGER neuer 🔴: equipAmmo-Sortenwechsel duplizierte Munition (von MIR im Sweep-1-Fix eingebaut) → gefixt
  (Rollback entfernt teilweise eingelagerte alte Munition) + Guard-Test equip-dataloss.test.ts. T19 hat den
  Fix unabhängig live bestätigt.
- Batch 3 (klein, sicher, grün): minHit aus gerundetem maxHit (±1-Drift weg) · canClaimQuest Daily-Rotation-
  Guard (Off-Rotation-Claim) · GameContext dt auf MAX_OFFLINE_MS gecappt (Sleep-Freeze/Offline-Bypass) ·
  equipBag-Guard (belegten Bag-Slot nicht überschreiben). Engine no-sim 454, Typecheck 5/5, Persistenz, Build.
- ZIP läuft (b467x8sxw) → enthält Sweep-2-Fixes + zuvor unverzippte SL1/L1 + Shop-Mengenkauf.
- DEFERRED (dediziert, mit Sim): ST1 Regen-Stalemate-Erkennung (T5 quantifiziert: void_titan/abyssal_devourer/
  last_idol; prädiktiv ODER enemyHpFloor-60s-Heuristik). Pet-skillXp tot für 5 Combat-Pets (T7) — combat-addXp.
- CONTENT/Balance (Chef/content-dev): siehe design/tester-sweep2-findings.md — Endgame-Crafting-Gold (runecrafting
  Caster 2,6M, LW/JC 455k), Gem-Adern≫Erz, neg. Pfeil-/Runen-/Brau-Margen, 2 Heiltrank-Dubletten, Farming-Exploit
  reed_iron/reed_void (levelRequired-Typo), Set-Tier-Inversionen, idol_sanctum-Difficulty-Inversion, ach_quests_100
  (≤88)/ach_sets_all (29↔30), 82 verwaiste i18n-Keys, Suffix-Roll-Varianz −15..0%, Instanz-Verkaufswert nur Basis.
- CONTENT/Balance (Chef/content-dev, single-writer, sim-sensitiv): cook_shadowcarp/honey_cake-Marge,
  Crafting-Gold-Skalierung, bloodstone_seam, ach_quests_100 (≤88), ach_sets_all (29→30), Doppel-Heiltränke,
  Default-Melee-Stance, Dungeon-Balance-Inversionen, Set-minPieces/Capstones, weaponType-Nutzung, Suffix-
  Roll-Varianz (−15%..0% statt ±15%), Instanz-Verkaufswert (nur Basis), Affix-Zahlen im Tooltip.
