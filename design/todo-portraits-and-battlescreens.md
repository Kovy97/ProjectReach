# TODO: Charakter-Portraits (Account-Erstellung) + Battlescreen-Hintergründe (2026-06-24)

Chef-Auftrag. Neue Assets im Done-Ordner (`C:\Users\MSchu\Downloads\ASSETS\resources\done\`).

## A) Charakter-Portraits in der Account-Erstellung
- Alle Bilder mit „Char"/„char" im Namen (~40) sollen bei der **Account-/Charakter-Erstellung auswählbar** sein.
- UI: oben **◄ / ►-Knöpfe** zum Durchschalten des aktuell gewählten Portraits.
- Zusätzlich ein **optionales Modal** („Alle anzeigen"): Galerie aller Portraits, **3 Spalten, auf maximale Modal-Breite gestreckt, Scroll-Container**. Linksklick wählt ein Portrait (markiert), unten **„Bestätigen"**-Button übernimmt die Auswahl.
- Das **m/f-Suffix der Dateinamen ignorieren** (keine Gender-Logik; nur als eindeutige Portrait-Optionen listen, Bild-basiert, keine Labels nötig).
- Gewähltes Portrait **persistieren** → neues `character.portrait` (Portrait-ID) im State, via `createGame` gesetzt. **SAVE_VERSION-Bump + Migration** (Default = ein Standard-Portrait). Portrait später auch im Charakter-Sheet / Spieler-Seite im Kampf anzeigen.

## B) Battlescreen-Hintergründe (Kampf-Backdrop pro Zone/Dungeon)
- 15 `battlescreen_*`-Bilder = **Kampf-Bildschirm-Hintergrund**, pro Zone (Normalkampf) bzw. Dungeon (Dungeon-Kampf). „genau so wie beim Spieler" = ein gemeinsamer Voll-Backdrop hinter Spieler & Gegner.
- Bsp: Chicken in „Pastures" bekämpfen → Kampf-Backdrop = `battlescreen_pasture`.
- Logik: im Kampf bevorzugt `battlescreen_<dungeonId>` (wenn Dungeon-Run) sonst `battlescreen_<zoneId>`; Fallback aufs bisherige Zonen-/Dungeon-Map-Hintergrundbild.

## Asset-Mapping (Datei → Ziel-ID)
**Battlescreens → `apps/client/src/renderer/assets/battlescreens/<id>.png`:**
- pasture→pastures · borderlands→borderlands · ashlands→ashfields · backthornwoods→blackthorn · thecrypt→crypt · highlands→highlands · tidewatershoals→coast · wildwoodhuntingground→wildwood · slagpitandfrostcaves→slagpit · Idolhall→idolhall
- depthsofthecrypt→crypt_depths · thegoblinwarband→goblin_warband · thehighlandaerie→highland_aerie · thewildwoodhunt→wildwood_hunt · „sanctum of the last idol"→idol_sanctum

**Portraits → `apps/client/src/renderer/assets/portraits/<id>.png`:** id = Dateiname lowercase ohne Endung (eindeutig halten; `char--6` ≠ `char_6`; `char_20_f` ≠ `char_20_m` → beide behalten). m/f nicht als bedeutsam behandeln.

## Umsetzung (Reihenfolge)
1. **asset-integrator:** Portraits + Battlescreens in die zwei neuen Asset-Ordner kopieren (Mapping oben), Originale aus `resources/done` archivieren (Memory-Regel). `resources/undone` unberührt lassen.
2. **logic-dev:** `character.portrait` (shared State) + `createGame`-Parameter + SAVE_VERSION-Bump + Migration (Default-Portrait).
3. **ui-dev:** Portrait-Discovery + Account-Erstellung-Picker (◄/► + Modal-Galerie 3-Spalten + Bestätigen) + Portrait-Anzeige; Battlescreen-Discovery + Kampf-Backdrop-Wiring in CombatPage.
