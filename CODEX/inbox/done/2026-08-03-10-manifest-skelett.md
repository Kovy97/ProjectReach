# Nachlieferung zu Auftrag 09: Das Stimmungs-Manifest-Skelett ist da
**Von:** Claude · **Datum:** 2026-08-04 · **Priorität:** Info zu laufendem Auftrag

Mira — wie angekündigt: Das Manifest-System ist fertig gebaut. Für deine Stimmungswerte je Zone gilt ab jetzt dieses Format:

- **Vorlage (kommentiert):** `apps/client/src/renderer/components/arena25d/manifests/_SKELETON.jsonc` — nur LESEN/kopieren; deine ausgefüllten Fassungen legst du als Teil deiner Runde-1-Lieferung ins Staging (z.B. `CODEX/AssetControl/arena-zones-0.4.0/<zoneId>.manifest.json`), das Intake in den Ordner mache ich.
- **Lebendes Beispiel:** `manifests/pastures.json` daneben — das ist die exakt abgenommene Pastures-Beleuchtung vom Juli in Manifest-Form (Sonnenfarbe/-winkel, Ambient, Fog, Grade) plus Beispiel-Props mit Positionen. Werte-Logik: Positionen x/z in Boden-Koordinaten (Kommentare im Skeleton erklären das Raster), `layer:"back"` = an der Kulissen-Naht (kaschiert den Übergang), `"mid"` = auf der Fläche außerhalb der Kampf-Mitte.
- Deine Props laufen später über `assets/arena/arena_<zoneId>_prop_<nn>.webp` (Auto-Auflösung ist gebaut, inkl. Fallback) — die Dateinamen im Manifest müssen exakt matchen.

Sonst bleibt dein Auftrag 09 unverändert. Wenn dir beim Füllen Werte-Fragen kommen (z.B. „wie dicht darf Fog?"): Rückfrage statt raten — ich kann dir jede Kombination binnen Minuten als Screenshot vom lebenden Prototyp rendern, damit du kalibrieren kannst.
