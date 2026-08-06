# Grim Reach 1.0 — Vollrelease-Plan (Chef-Kurs 06.08.2026)

**Chef-Entscheid 06.08.:** Trotz großer Updates zu wenig Aufmerksamkeit (≤5 Verkäufe/Tag). Der
verbliebene große Hebel ist der EA-Exit: 1.0 fertigmachen und als vollen Release ausspielen —
Steam behandelt den EA-Exit als zweites Launch-Ereignis mit eigener Sichtbarkeit.

## Ehrliche Rechnung (damit wir sie steuern statt hoffen)
Der 1.0-Moment multipliziert, was bis dahin aufgebaut ist: **Wishlists × Review-Score × Qualität
des Release-Pakets (Trailer/Store)**. Ein 1.0-Schuss auf der heutigen Basis verpufft; derselbe
Schuss nach 3 Monaten Wishlist-Aufbau trägt. Deshalb hat dieser Plan ZWEI Stränge:
**A) das Spiel fertig machen** (mein Strang) und **B) bis dahin Wunschzettel aufbauen** (gemeinsam,
jedes Update-Event + Festival zählt). Benötigte Steamworks-Zahlen vom Chef als Basis-Messung:
aktuelle Wishlists, Review-Anzahl/-Score, verbleibende Sichtbarkeitsrunden.

## Strang A — Was „1.0 fertig" konkret heißt
Reihenfolge = Abhängigkeiten; jede Stufe endet mit verifiziertem, gepushtem Stand.

1. **0.4.0 „Kampfgefühl" abschließen (August)** — das Trailer-Material.
   - Arena produktiv in allen Zonen (Welle 3: Paritäts-Wächtertest, Clutter-System, Rest-Verifikation).
   - Posen-Rollout Zone für Zone (Pilot Chicken ist live; nach Chef-Optik-GO: Pastures komplett,
     dann pro Zone gebündelt mit Miras Szenen-Runde-2). Spieler-Charakter-Posen dazu.
   - Leichter Juice-Pass im Rahmen des Arena-Systems (Treffer-Impact, Zahlen); große VFX bleiben raus.
2. **0.5.0 „Die Aschechronik" — das Spiel bekommt ein Ende (September).**
   - Hauptquest-Kette auf dem bestehenden Quest-System (lore-dev-Material), Bogen bis zum Endboss
     (last_idol) + echter Abschluss-Moment (Ende erreicht = 1.0-Versprechen eingelöst).
   - Steam-Achievements SCHARF (steamworks.js aktivieren; kuratierte Liste
     design/steam-achievements-export.md existiert — Achievements gehören zu einem „fertigen" Spiel
     und stehen auf der Store-Page).
3. **0.6.0 „Willkommen im Reach" — Onboarding-Guide (Oktober).**
   - Der große geführte Tutorial-Flow (bewusst als finaler Meilenstein aufgehoben — jetzt ist er
     dran). Ziel: Refund-Treiber Frühspiel-Verwirrung töten.
   - Erste-Stunde-Politur nach frischem Tester-Sweep (10-Agent-Sweep auf die ersten 60 Minuten).
4. **1.0-Härtung (Oktober/November).**
   - Musik-Entscheid einlösen (Lizenz/Paket — Chef), 20 Rest-Battlescreens, Restlücken Monster-Art.
   - Lokalisierungs-Vollpass ×7 inkl. Noto-SC-Font-Bundling; Save-Compat-Vault-Ritual;
     Balance-/Sim-Endpass; Performance-/Minify-Entscheid; voller Release-Checkpoint-Sweep.

## Strang B — Sichtbarkeit bis zum 1.0-Tag
- **Jede 0.x-Stufe = Steam-Event mit Announcement** (hält zugleich die <30-Tage-Regel für
  Sichtbarkeitsrunden offen). Sichtbarkeitsrunden NICHT mehr für 0.x verbrennen — aufheben,
  Anzahl verbleibend klären.
- **Genre-Festivals mitnehmen** (Idler-/Automation-Fests akzeptieren released EA-Titel) — Chef
  prüft Steam-Event-Kalender, ich liefere je Festival frisches Material.
- **Creator-Outreach klein aber echt:** Keys + Fact-Sheet an Idle-/Incremental-Streamer und
  -Kuratoren zum 1.0 (Liste bereite ich vor; Versand = Chef).
- **1.0-Release-Paket:** neuer Trailer (Arena-Kämpfe!), neue Screenshots ×7 Sprachen, Store-Text
  „Full Release"-Refresh, Launch-Rabatt (Empfehlung 20 %), Announcement-Serie (Ankündigung des
  Termins ≥2 Wochen vorher, Launch-Post, Post-Launch-Woche).
- **Termin-Logik:** Empfehlung Anfang–Mitte November 2026 — klar VOR dem Steam Autumn Sale
  (nicht im Sale-Schatten releasen) und mit ≥2 Wochen Anlauf nach Termin-Announcement.
  Chef entscheidet das Datum, sobald 0.5.0 steht und wir die Restarbeit sauber schätzen können.

## Rollen
- **Claude:** kompletter Strang A, Material für Strang B (Texte, Screenshots, Clips, Fact-Sheet),
  Releases/Depots auf Chef-GO. Chef-Aufwand pro Stufe: Abnahmen + Steam-Klicks.
- **Mira:** Asset-Wellen je Zone (Szene + Posen), Store-/Event-Grafiken, Trailer-Standbilder.
- **Chef:** Steamworks-Zahlen, Musik-Entscheid, Termine/Events, Abnahmen, Kreidestadt/Neues parallel.

## Bewusst NICHT in 1.0
Multiplayer, Township-Ausbau über New Haven hinaus, Pet-Redesign-Reste, Mod-Support, große
VFX-Systeme, weitere neue Skills. Post-1.0-Ideen sammeln wir in design/update-backlog.md.
