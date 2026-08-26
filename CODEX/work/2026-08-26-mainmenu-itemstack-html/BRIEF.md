<!-- codex:2026-08-26T16:18:00+02:00 -->
# HTML-Prototypen — ausgewählte Main-Menüs und Item-Stack

## Chefentscheidung

- Item-Stack: Design 02 `War Table` umsetzen.
- Main-Menü: Designs 01 `Ashen Gate`, 02 `War Table` und 04 `Frontline Registry` umsetzen.
- Fehlende Assets dürfen erzeugt werden, müssen aber zum bestehenden Spiel passen.

## Umsetzung

- Vier eigenständige HTML-Seiten plus gemeinsame Auswahlseite.
- Bestehende Grim-Reach-Assets, Schriften und UI-Bausteine lokal kopieren und verwenden.
- Keine Renderer- oder Produktionsdatei verändern.
- Interaktive Zustände für Variantenwahl, Filter, Buttons und Layoutwechsel demonstrieren.
- Desktop zuerst; kleinere Fenster dürfen kontrolliert scrollen oder in kompaktere Raster umbrechen.

## Referenzen

- Design-Mockups: `CODEX/assets/mainmenu-itemstack-mockups-2026-08-26/`.
- Produktassets: `apps/client/src/renderer/assets/` und `apps/client/src/renderer/fonts/`.
- Aktuelle Main-Menü-Struktur: `apps/client/src/renderer/pages/MainMenu.tsx` und `styles/menu.css`.
- Aktueller Item-Stack-Screenshot: `CODEX/work/2026-08-26-mainmenu-itemstack-mockups/references/item-stack-current.png`.

## Nicht im Scope

- keine React-/Renderer-Integration;
- keine i18n- oder Content-Änderung;
- keine neuen Produkt-, Lore- oder Release-Entscheidungen.
