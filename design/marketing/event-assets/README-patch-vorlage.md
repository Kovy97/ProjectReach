# Patch-Artwork-Vorlage (Cover 800×450 + Header 1920×622)

Wiederverwendbares Event-Design für alle künftigen Patchnotes. Erzeugt beide
Steam-Slots („Cover Image" + „Header Image") in einem Lauf:

```
python build-event-assets.py
```

## Pro Patch anpassen (Konstanten oben im Skript, ~5 Zeilen)
- `KICKER`  — z.B. `"GRIM REACH  ·  PATCH #2"`
- `TITLE`   — Update-Name in Caps, z.B. `"TIDES OF THE DEEP"`
- `BADGE`   — meist `"OUT NOW"` (bei Vorab-Ankündigung: `"COMING <DATUM>"`)
- Feature-Zeile — die drei Verkaufs-Begriffe neben dem Badge
- Kulisse + Freisteller — Battlescreen aus `assets/battlescreens/` passend zum
  Update-Thema wählen; 2–3 freigestellte WebPs (Monster/Items) als Blickfang

## Fix lassen (Wiedererkennungswert!)
Gold-Cinzel-Typo, dunkle Kulisse mit Vignette, Eck-Ornamente, Layout
(Cover: Text oben / Motiv unten · Header: Text links / Motiv rechts).
Spieler sollen auf einen Blick erkennen: „Das ist ein Grim-Reach-Patch."

## Steam-Upload
Event-Editor → Artwork-Tab → `event_cover.png` in „Cover Image",
`event_header.png` in „Header Image". Steams Titel-Overlay auf dem Cover AUS
(Titel steckt in der Grafik).

## Zwei-Akter-Muster (ab Patch #2)
1–2 Wochen vorher: Ankündigungs-Event mit `BADGE = "COMING <DATUM>"`.
Am Release-Tag: gleiche Grafik mit `BADGE = "OUT NOW"` neu rendern. Zwei
Benachrichtigungen an Follower/Wishlist statt einer.
