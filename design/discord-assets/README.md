# Discord-Grafiken Heartforge Studios

<!-- claude:2026-10-25T12:38:00+01:00 -->

Stand 25.10.2026. Alles aus vorhandenen gemalten Spielbildern gebaut, Alpha je Quelle geprüft (`_qa/alpha-qa.csv`).
Übersicht auf dunklem und hellem Discord-Grund: `_contact.jpg`. Plan dazu: Artifact „Heartforge Studios Discord“.

## Wo was eingestellt wird

| Ordner / Datei | Format | Discord |
|---|---|---|
| `server/server-icon_crown.png` (Empfehlung), `server-icon_logo.png`, `server-icon_hearth.png` | 512×512 | Servereinstellungen → Server-Profil → Symbol |
| `server/server-banner_highlands.png`, `server-banner_dusk.png` | 960×540 | Server-Profil → Banner (Boost-Stufe 2) |
| `server/invite-background_highlands.png`, `invite-background_war-table.png` | 1920×1080 | Server-Profil → Einladungs-Hintergrund (Boost-Stufe 1) |
| `roles/role_*.png` (8 Rollen) | 64×64, Alpha | Rollen → Anzeige → Rollensymbol (Boost-Stufe 2) |
| `emojis/gr_*.png` (30) | 128×128, Alpha | Emoji, Dateiname = Emoji-Name |
| `stickers/sticker_gg.png`, `sticker_loot.png`, `sticker_afk.png` | 320×320 | Sticker |
| `headers/header_<kanal>.png` (10) | 1600×800 (2:1) | als erste Nachricht im Kanal posten und anheften; in Foren in einen angehefteten Beitrag „Read me first“. Discord zeigt Bildanhänge höchstens etwa 550 px breit, deshalb 2:1 statt 4:1: gleiche Breite, doppelte Höhe. Die alten 4:1-Fassungen liegen in `headers/alt-4x1/`. |

Die englischen Unterzeilen der Kopfbilder sind Vorschläge und brauchen die Freigabe des Chefs.

## Neu bauen

Aus `design/discord-assets/_build/`: `python -I build_icons.py`, `python -I build_pages.py`, `node render_pages.mjs`,
`python -I contact_sheet.py`. Quellen-Zuordnung in `sources.py`, verwendete Spielbilder in `used-assets-pages.txt`.

## Ausgeschlossene Quellen

`icons/icon_mana`, `icon_paw`, `icon_mastery_star` (harte Kanten), `pets/hoarspite` (heller Saum), alle flachen
Vektor-Symbole, die Champion-Bilder mit bekannten Alpha-Fehlern aus dem Monster-Audit vom 25.10.

## Schwache Stellen

`gr_fist` und `gr_raidchest` sind auf dunklem Grund dunkel; `gr_gathering`, `gr_crafting`, `gr_ranged` wirken bei 22 px
unruhig; das Rollensymbol Content Creator ist bei 20 px am schwächsten; `gr_gg` ist gesetzt, nicht gemalt.
Neu zu malende Motive (Studio-Wappen, Daumen-Handschuhe, Totenkopf, gemaltes GG, Maskottchen-Sticker, Rollen-Medaillons,
4:1-Kulissen) stehen im Codex-Auftrag `design/painterly-assets-2026-10-25/`.
