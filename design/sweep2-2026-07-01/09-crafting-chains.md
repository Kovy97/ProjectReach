# Sweep 2 — 09: Crafting-Ketten-Vollständigkeit

**Fokus:** Ist jede Rezept-Zutat beschaffbar (Drop/Shop/Craft/Gather/Farm)? Unmögliche/zirkuläre
Ketten? Sackgassen? Alle 13 Skilling-Skills bis Max hochlevelbar mit verfügbaren Inputs?
**Methode:** Programmatischer Erreichbarkeits-Fixpunkt über die echte `ContentDB` (temporäres
Vitest-Skript via `SimPlayer`-Umfeld angelegt, gelaufen, wieder gelöscht). Quellen-Modell:
Shop + Slayer-Shop + **Mob-`loot`** (nicht `drops`) + Dungeon-`loot` + Quest-Rewards + Startkit +
input-lose Gather-Actions + Crops (`seedItem`→`yieldItem`). Danach Fixpunkt über alle 654 Producer
(Actions mit `inputs` + 29 Crops). Zusatzchecks: SCC-Zyklen, Slayer-Gate-Zirkularität, Sackgassen,
Cross-Skill-Level-Gates.

---

## Ergebnis in einem Satz
Die Crafting-Ketten sind **vollständig und sauber**: **0 unerreichbare Items, 0 blockierte Rezepte,
0 Zyklen, 0 echte Sackgassen** — alle 13 Skilling-Skills sind bis Max (95–99) mit verfügbaren Inputs
hochlevelbar. **Ein** substanzielles Problem (Chef-/Balance-Domäne): eine Gruppe Runecrafting-Rezepte
verlangt **Endgame-Zutaten weit unterhalb ihrer freischaltenden Skill-Stufe**.

---

## Zahlen (Fixpunkt-Audit)
- Items gesamt: **1011** · Actions: **726** · Producer (mit Inputs): **654** · Crops: **29**
- Erreichbare Items nach Fixpunkt: **1011 / 1011** → **UNERREICHBAR: 0**
- Blockierte Producer (Input nicht beschaffbar): **0**
- Abhängigkeits-Zyklen (Item braucht Item, SCC): **0**
- Invertierte Level-Gates (Craft-Input braucht höhere Craft-Stufe als Output): **0**
- Selbst-konsumierende Rezepte (Input-ID == Output-ID): **0**
- Echte Sackgassen (gecraftetes `material` ohne Abnehmer): **0** (siehe „Falscher Alarm" unten)

---

## Verifizierte fixgeglaubte Punkte (halten)
- **Mob-Drops im Feld `loot`** korrekt gelesen — kein Ketten-Loch dadurch.
- **Slayer-Requirement-Ketten NICHT zirkulär:** Die 5 Pflicht-Items (`plague_mask`, `mirror_ward`,
  `ear_plugs`, `soul_veil`, `void_anchor`) sind ausnahmslos aus **nicht-gegateten** Zutaten craftbar
  **UND** über den Slayer-Punkte-Shop kaufbar (doppelte Fluchttür). Keines der Gate-Items braucht eine
  gate-exklusive Zutat. Die 4 gate-exklusiven Materialien (`basilisk_scale`, `soul_flayer_fang`,
  `void_herald_shard`, `void_thread`) speisen ausschließlich Endgame-Slayer-Gear
  (`slayer_vambraces`/`slayer_amulet`/`void_shroud`) — die Ketten laufen sauber aus, kein Deadlock.
- **Jewelcrafting-Gem-Kette vollständig:** durchgehende `cut_*` → `garnet/sapphire/ruby/diamond/onyx/
  bloodstone/voidstone/godgem` → Ring/Amulett-Progression (L1/15/34/44/55/70/85/95).
- **Farming nachhaltig:** alle 29 Crop-Saaten beschaffbar; 9 zusätzlich per Foraging, Rest per Shop.

---

## Falscher Alarm (dokumentiert, KEIN Bug)
Der Sackgassen-Detektor meldete zunächst **24 Runen-Items** (`rune_flame_i` … `rune_swift_iii`) als
gecraftete `material` ohne Abnehmer. **Verifiziert falsch positiv:** Runen tragen das `rune`-Feld
(`{affixId, tier}`) und werden am **Verzauberungstisch** konsumiert — `applyEnchant` zieht sie per
`removeItem(state.inventory, runeId, 1)` ab (`packages/engine/src/enchant.ts:182`). Runecrafting hat
also eine echte terminale Senke (Enchanting). **Keine Sackgasse.**

---

## SUSPECTED / CONFIRMED — Findings

### [P2][balance] Runecrafting-Rezepte gaten auf Endgame-Zutat weit unter ihrer Skill-Stufe
**Status:** confirmed (Datenlage eindeutig), Bewertung = Chef-/Balance-Domäne → nur berichten.
**Kern:** `aether_essence` ist ein **Endgame-Material** — frühester Bezug: Mob `skeleton_nekro`
**(Kampf-Lvl 90)**, Thieving `desecrate_reliquary` **(Lvl 85)** bzw. Foraging `loot_reliquary`
**(Lvl 95)**; kein Shop, kein früher Craft. Es wird aber in Rezepten mit **Skill-Stufe 30–40**
verlangt, u.a.:
- `craft_rune_arcane_i` — **runecrafting L30**, Input `aether_essence` (`index.ts:8506-8511`).
  Alle Geschwister-Tier-I-Runen (`rune_keen_i` L15, `rune_flame_i` L18, `rune_precise_i` L22) nutzen
  L1–L60-Materialien — der Arcane-Tier-I ist der Ausreißer.
- `craft_mithril_focus` — **runecrafting L40**, Input `aether_essence` (`index.ts:8458`).
- `craft_adamantium_focus` L50, `craft_runite_focus` L60 usw. (ab hier ist der Gap kleiner/plausibler).

**Erwartet:** Ein Rezept, das bei Skill-Stufe X freischaltet, sollte mit Zutaten auskommen, die um
X herum beschaffbar sind (± moderate Spanne).
**Tatsächlich:** `craft_rune_arcane_i` erscheint ab RC 30 nutzbar, ist aber **praktisch tot bis
Kampf-/Thieving-Lvl ~85–95**. Der Spieler sieht ein freigeschaltetes Rezept, kann es aber ~55 Level
lang nicht beliefern. Chain bleibt **vollständig** (Item ist beschaffbar), nur die Stufen-Kopplung
ist irreführend.
**Umfang:** 51 Rezept-Instanzen mit `Gather-Level(Input) − Craft-Level(Rezept) > 15`. Dominanz
`aether_essence` (mehrere RC-Foki + Arcane-Runen), sekundär `frost_essence` (Mob Lvl 60) in
`craft_steel_focus` (RC20) / `craft_blacksteel_focus` (RC30), und `pigment_violet`/`pigment_radiant`
(Foraging L73/L93) in mittleren Runen.
**Owner:** balance-designer / Content-Dev (Chef-Freigabe) — entweder Rezept-`levelRequired` anheben
oder eine frühere `aether_essence`-Quelle (mittlere Mob-Stufe / Shop) ergänzen.

### [P3][balance] Zwei Content-Dichte-Lücken (kein Blocker fürs Hochleveln)
**Status:** confirmed, Balance-Domäne.
- **Jewelcrafting L20→L34** (14 Level ohne neues Rezept). Der L20-Eintrag `craft_gemstone_ring` ist
  zudem eine **Thieving-Drop-Senke** (`cut_gemstone` nur aus Thieving L55+; Kommentar `index.ts:233`
  „cut_gemstone-Senke") — bewusst, aber verschärft die gefühlte Leere zwischen 20 und 34.
- **Farming/Crops L50→L62** (12 Level ohne neue Crop).
**Kein Hard-Block:** Man trainiert mit dem jeweils niedrigeren Rezept/Crop weiter bis Max — reine
Progressions-/Feel-Note.

---

## Explizit geprüft & SAUBER
- Jede der 654 Producer-Zutaten ist beschaffbar (Fixpunkt, 0 Rest).
- Keine unmöglichen/zirkulären Ketten (0 SCC-Zyklen; Slayer-Gates non-zirkulär).
- Keine echten Sackgassen (Runen = Enchant-Senke verifiziert).
- Alle 13 Skilling-Skills (woodcutting/mining/fishing/foraging/thieving + smithing/cooking/fletching/
  leatherworking/jewelcrafting/runecrafting/herblore/farming) haben erreichbare Actions bis Max (95–99).
- Farming-Saat-Nachschub gesichert; Startkit-Saat (`graywort_seed`) korrekt.

---

## Kurz-Zusammenfassung
- **P0:** 0 · **P1:** 0 · **P2:** 1 · **P3:** 1
- **Top-3:**
  1. [P2/balance] Runecrafting-Rezepte (RC30–40) gaten auf Endgame-`aether_essence` (Bezug erst
     Lvl ~85–95) — 51 Instanzen; Rezepte wirken lange freigeschaltet, sind aber unbelieferbar.
  2. [P3/balance] JC-Lücke L20→34 (+ `cut_gemstone`-Thieving-Senke) und Farming-Lücke L50→62.
  3. **Positiv-Befund:** Crafting-Ketten strukturell komplett — 0 unerreichbar, 0 blockiert,
     0 Zyklen, 0 Sackgassen; Slayer-Gates verifiziert non-zirkulär.
- **Empfehlung:** Ketten-Struktur ist EA-tauglich (ship). Das `aether_essence`-Stufen-Mismatch
  vor Release an Chef/Balance zur Entscheidung geben (Rezept-Level anheben ODER frühere Quelle).
