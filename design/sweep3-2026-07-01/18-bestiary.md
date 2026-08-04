# Sweep 3 — 18 · Bestiarium / Drops (`pages/BestiaryPage.tsx`)

**QA:** Kontrolleur · **Datum:** 2026-07-01 · **Fokus (Auftrag):** echte Stat-/Status-Icons,
Drops mit Chance, Fight-Button respektiert Slayer-Req, nur noch `scale_skarn` ohne Portrait,
keine Bogen↔Pfeil-Drop-Mismatches mehr.

**Methode:** statische Code-Review (`BestiaryPage.tsx`, `statIcons.tsx`, `slayer.ts`, `combat.ts`) +
Temp-Vitest über `content` (alle 92 Monster: Portrait-Diff gegen `assets/monsters/*.png` mit
`tower_`-Fallback wie `getMonsterSrc`; je Loot-Table Bögen↔Pfeile↔`ammoType`-Kohärenz) — Skript nach
Lauf wieder gelöscht. + Icon-PNG-Existenz + i18n-Parität. Gate: `pnpm --filter @hearthforge/client typecheck`.

## Ziel erreicht? — JA, alle 5 Prüfpunkte bestätigt

### ✅ Echte Stat-/Status-Icons — CONFIRMED
`statIcon()` + `renderEffectIcon()` (`statIcons.tsx:21-49`) lösen über `getUiIcon()` auf echte PNGs auf.
Alle referenzierten Icon-PNGs existieren: `icon_status_{burn,frost,shock,poison,bleed}`,
`icon_attribute_{hp,meeledamage,defense}`, `icon_goldcoin`. Status-Legende (`BestiaryPage.tsx:48-57`),
hp/atk/def-Statzeile (`:86-95`), Resist-/Inflict-Icons (`:97-110`) zeigen also echte Art. Verbleibende
Emojis (`♻` Regen, `😡` Enrage, `☠` Kills, `⚔` Fight/Portrait-Fallback) sind in `statIcons.tsx:29`
explizit als „ohne PNG-Entsprechung → Emoji" dokumentiert — by design, keine Regression.

### ✅ Drops mit Chance — CONFIRMED
`BestiaryPage.tsx:118-135`: je Loot-Roll ein klickbarer `<ItemChip>` + Prozent mit adaptiven
Nachkommastellen (`<0.01→2`, `<0.1→1`, sonst `0`; `≥1→"100%"`). Korrekt.

### ✅ Fight-Button respektiert Slayer-Req — CONFIRMED (sweep2-P3 GEFIXT)
Der stille No-Op aus Sweep 2 ist behoben. `BestiaryPage.tsx:137-146`: der Fight-Button ist jetzt
`disabled={!reqMet}` (`reqMet = slayerRequirementMet(state, content, m.id)`, `:69`) und trägt bei
fehlender Anforderung den Titel `combat.slayerRequires` („Benötigt: <Item>"). Zusätzlich zeigt die Karte
die Requirement-Zeile (`:112-116`, `.warn`-Klasse wenn nicht erfüllt). **Defense-in-depth:** `startCombat()`
hart-blockt ohnehin via `canFightMonster` (`combat.ts:164`, `slayer.ts:88-90`) → auch ein erzwungener
Klick würde keinen Kampf starten. Gate ist real: 10 `slayer_tower`-Monster tragen `slayerRequirement`
(`plague_mask`/`mirror_ward`/`ear_plugs`/`soul_veil`/`void_anchor`, `index.ts:10613`–`10839`) und
erscheinen im Bestiarium (slayer_tower inline gelistet).

### ✅ Nur noch `scale_skarn` ohne Portrait — CONFIRMED
Asset-Diff aller 92 Monster gegen 83 PNGs (`tower_*` fallen per `getMonsterSrc` auf ihr Basis-Art zurück):
**exakt 1** Monster ohne Art — `scale_skarn` (Drachenhaut-Skarn, Lv 275, Zone `idolhall`, `index.ts:10421`).
Es ist erreichbar (idolhall-Encounter + Dungeon-Welle 3) und droppt den legendären `skarn_idol_staff`;
im Bestiarium zeigt es den `⚔`-Platzhalter. Fehlende Datei:
`apps/client/src/renderer/assets/monsters/scale_skarn.png`. **Owner: asset-integrator / Chef (Art-Lieferung).**

### ✅ Keine Bogen↔Pfeil-Drop-Mismatches mehr — CONFIRMED
Temp-Audit über alle 92 Loot-Tables: **0 Mismatches**. Jedes Bogen-droppende Monster dropt jetzt genau
den `ammoType` seines/seiner gedroppten Bogen(s). Alle 9 in Sweep 2 geflaggten Fälle sind gefixt:

| Monster | Sweep-2-Zustand | Jetzt | Status |
|---|---|---|---|
| chicken (L1) | sling→iron, dropt copper (reverse) | `farmhand_sling` ammoType→`copper_arrow`, dropt copper_arrow | ✓ |
| ash_tyrant (L45) | dropt mithril (+2) | dropt steel_arrow = `ashfall_recurve`.ammo | ✓ |
| spectral_stag (L58) | dropt adamantium (+1–2) | dropt mithril_arrow = `spectral_hunter_bow`.ammo | ✓ |
| forest_warden (L65) | dropt runite (+2) | dropt mithril_arrow = `mithril_longbow`.ammo | ✓ |
| skeleton_archer (L68) | dropt runite (+3–4) | dropt steel_arrow = `skeletal_longbow`.ammo | ✓ |
| wild_stag (L104) | dropt aetherium (+5–6) | dropt steel+mithril = `antler_warbow`/`stagstride_longbow`.ammo | ✓ |
| **mud_crab (L120)** | driftwood→iron **vs. godiron (+9, Smoking Gun)** | dropt iron_arrow = `driftwood_bow`.ammo | ✓ |
| frost_hound (L182) | dropt godiron (+2) | dropt runite_arrow = `frostcaverns_bow`.ammo | ✓ |
| roc_hunter (L208) | dropt godiron (+2) | dropt runite_arrow = `skytalon_recurve`.ammo | ✓ |

`godiron_arrow` (BiS r99) dropt jetzt NUR noch aus 4 High-Level-Mobs, die je einen godiron-`ammoType`-Bogen
mit-droppen (kohärentes Paar): `abyssal_tide_serpent` L155 (+`abyssal_tide_bow`), `void_titan` L242
(+`voidwing_greatbow`), `aether_wraith` L260 (+`spectral_longbow`), `last_idol` L295 (+`last_vengeance`).
Die leichte L120-Krabbe als BiS-Munitionsquelle ist raus.

## Nebenbefunde (nicht blockierend)

- **[P3][balance] Früheste godiron_arrow-Quelle jetzt `abyssal_tide_serpent` L155** (war mud_crab L120).
  Für r99-Endgame-Munition immer noch relativ früh, ABER jetzt sauber mit dem `abyssal_tide_bow` (r99)
  gepaart → kohärentes Bogen+Pfeil-Paar, kein „dead loot" mehr. Fällt unter das im Briefing als
  „bekannt & akzeptiert" markierte Endgame-Ammo-Thema. **Info/low — Chef-Balance-Domäne, kein Bug.**
- **[Info] Discovered-Nenner zählt `tower_*`-Duplikate mit** (`BestiaryPage.tsx:25,44` — `defeatedCount /
  92`). Unverändert seit Sweep 2; eigene Statblöcke, kein Bug. slayer_tower wird inline als Zone gelistet
  (Combat-Screen blendet ihn aus und zeigt den Turm separat) — reine Anzeige-Inkonsistenz.
- **[Info] Drop-Reveal-Politik:** Bestiarium enthüllt beim ersten Kill alle Drops+Chancen, CombatPage nutzt
  ein Collection-Log-Gate (`?` bis gesehen). Weiterhin uneinheitlich (Sweep-2-P3, Chef-Entscheid offen).
  Nicht Teil dieses Auftrags.

## Gates
- Temp-Audit (92 Monster): Portrait-Gap = 1 (scale_skarn) · Bogen↔Pfeil-Mismatches = **0**.
- Icon-PNGs: alle referenzierten Status-/Stat-Icons vorhanden.
- i18n-Parität: `combat.slayerRequires` in `en` UND `de` (`translations.ts:781/1671`); alle Bestiarium-Keys
  doppelt vorhanden.
- `pnpm --filter @hearthforge/client typecheck` → **grün** (0 Fehler).

## Kurz-Zusammenfassung
**Ziel erreicht: JA — alle 5 Prüfpunkte bestätigt.** Findings je Severity: P0 0 · P1 0 · P2 0 · P3 1
(godiron-Frühquelle L155, Info-Level, Chef-Balance) · Info 2 (Duplikat-Nenner, Drop-Reveal-Politik).

**Top-3:**
1. Beide Sweep-2-P2-Bugs (Bogen↔Pfeil-Tier-Mismatch inkl. mud_crab-Smoking-Gun) **restlos gefixt** —
   0/92 Mismatches, jede Bogenquelle liefert ihren `ammoType`.
2. Sweep-2-P3 (Fight-Button ignoriert Slayer-Req) **gefixt** — Button disabled + „Benötigt: <Item>",
   Engine-Hard-Block als zweite Verteidigungslinie.
3. Einziger offener Punkt: `scale_skarn.png` fehlt noch (bekannt, Art-Lieferung Chef/asset-integrator).

**Empfehlung: SHIP** (Bestiarium/Drops-Ebene). Nur offener Rest ist das eine fehlende Portrait-PNG
(nicht release-blockend — Fallback rendert sauber).
