# Tower-Monster 1:1-Refactor — Scoping (2026-06-30)

## Befund
Es gibt **8 Slayer-Tower-Monster** (`tower_<x>`), die **exakte Copy-Paste-Klone** des jeweiligen Zonen-
Monsters `<x>` sind. Heute per Diff geprüft: **alle 8 unterscheiden sich NUR in `id` und `zone`** — Stats,
Loot, alles identisch. (`tower_forge_compound` ist KEIN Monster, sondern ein Material — nicht betroffen.)

| Tower-Monster            | Basis            | Status   |
|--------------------------|------------------|----------|
| tower_goblin             | goblin           | 1:1      |
| tower_goblin_rogue       | goblin_rogue     | 1:1      |
| tower_skeleton_warrior   | skeleton_warrior | 1:1      |
| tower_skeleton_archer    | skeleton_archer  | 1:1      |
| tower_ember_elemental    | ember_elemental  | 1:1      |
| tower_iron_revenant      | iron_revenant    | 1:1      |
| tower_frost_hound        | frost_hound      | 1:1      |
| tower_roc_void           | roc_void         | 1:1      |

## Problem
Reine Duplikation → **Drift-Gefahr**: Wer ein Basis-Monster tunt (HP/Schaden/Loot), muss daran denken,
den Tower-Zwilling identisch nachzuziehen. Vergisst man es, weichen sie still ab. Der Bild-Resolver setzt
die Gleichheit ebenfalls voraus (`getMonsterSrc`: `tower_<x>` → `<x>.png`-Fallback, daher rendern Tower-
Klone ohne eigene Art).

## Sofort umgesetzt (sicher, diese Iteration)
**Guard-Test** `packages/engine/src/tower-monsters.test.ts`: prüft für jedes `tower_<x>`, dass es bis auf
`id`/`zone` deckungsgleich mit `<x>` ist. Fängt künftige Drift sofort als roten Test. 9 Tests grün.
→ Das ist die „1:1"-Invariante festgenagelt, ohne Content umzubauen (kein Sim-/Build-Risiko).

## Optionen für den eigentlichen Refactor (Chef-Entscheid)
- **A — `towerClone`-Helfer im Content (empfohlen, DRY):**
  In `content/index.ts` ein Helfer `towerClone(base, { zone })`, der das Basis-Monster spreizt und `id`/
  `zone` überschreibt; idealerweise eine Liste `["goblin","skeleton_warrior",…]` → Tower-Klone werden
  generiert. **Eine** Quelle der Wahrheit, Drift unmöglich. Stats bleiben bit-identisch → Sim/Tests
  unverändert. Risiko: gering, ABER `content/index.ts` ist Single-Writer (nur EIN Content-Agent
  gleichzeitig) und sim-sensitiv → sauber verifizieren.
- **B — Nur Guard-Test (bereits erledigt):** billigste Absicherung, behält die Struktur. Reicht, wenn der
  Refactor sonst keine Priorität hat.
- **C — Datenmodell `cloneOf`-Feld + Engine-Auflösung:** überdimensioniert für 8 Monster, nicht empfohlen.

## Empfehlung
Kurzfristig **B** (ist live). Bei Gelegenheit **A** über den content-dev-Agenten (Single-Writer beachten),
falls weitere Tower-Monster dazukommen — dann skaliert die Generierung statt weiterer Copy-Paste-Zeilen.

## Offen (falls Tower bewusst abweichen soll)
Wenn ein Tower-Monster härter sein soll als seine Basis (z. B. Tower als Challenge-Mode), erlaubte
Abweichungen im Guard-Test (`ALLOWED_DIFF_KEYS`) eintragen ODER im Helfer als Overrides — dann ist die
Designentscheidung dokumentiert statt zufällig.

## Nachtrag 25.07.2026: Loot-Parität für 5 Paare bewusst aufgehoben (Task #339/#341/#344)

Der Item-Drop-Audit (`design/item-drop-audit.md`, Task #339) hat diese 1:1-Loot-Parität als eine von
zwei Wurzelursachen für wertlose Hochlevel-Zonen-Drops identifiziert (§4.1): Skelette (Turm F2, L36/38)
und Slagpit-Elementare (Turm F3/F4, L50–74) teilen sich die Loot-Tabellen mit ihren Zonen-Versionen
(Krypta L65–85 / Slagpit L168–188) — die Tabellen sind fürs TURM-Fenster getunt und liefern auf der
Zonen-Seite 3–5 Tiers zu schwach. Task #341 hat die im Audit vorgeschlagenen on-band-„Beikost-Rows"
(§6 P3) deshalb korrekt NICHT eigenmächtig gegen den Guard durchgesetzt, sondern für genau 5 Monster
zurückgenommen und den Konflikt gemeldet. Der Chef hat mit dem P3-GO die Aufhebung explizit
mitgenehmigt (Zonen-Beikost war Teil des GO-Pakets) — Task #344 zieht sie nach.

**Umsetzung:** `packages/engine/src/tower-monsters.test.ts` bekommt eine eng gefasste
`LOOT_PARITY_EXCEPTIONS`-Allowlist (nicht `loot` blanko in `ALLOWED_DIFF_KEYS`) mit genau den 5
Basis-IDs: `skeleton_warrior`, `skeleton_archer`, `ember_elemental`, `iron_revenant`, `frost_hound`.
Alle anderen Felder (Stats/Resist/Inflict/Enrage/attackIntervalMs) bleiben für diese 5 weiterhin
1:1-Pflicht; alle anderen Tower-Klone (`tower_goblin`, `tower_goblin_rogue`, `tower_roc_void`) bleiben
komplett unter der vollen 1:1-Parität inkl. Loot.

**Divergenzrichtung (einzige erlaubte):** die ZONEN-Version bekommt eine zusätzliche on-band-Row ans
Tabellenende (Krypta → Runite, Slagpit → Aetherium); der TURM-Zwilling bleibt beim bestehenden
Turm-Tuning unverändert — „Turm-Tabellen F1–F5 nicht anfassen" (oben) gilt weiterhin uneingeschränkt.
