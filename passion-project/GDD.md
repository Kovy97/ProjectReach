# GDD — Arbeitstitel „Kreidestadt" (Passion-Projekt)

*Moderne Neuinterpretation von „Metropolismania" — Third-Person-Stadtbau als Endless Game.*
*Stand: 2026-07-26 · Autor: Chef + Claude (CEO) · Status: PLANUNG, jederzeit startbar*

---

## 1. Elevator Pitch

Du landest auf einer großen, wilden Insel — mit nichts als einem Telefon, einem Stück Kreide
und einem Checkbuch. Du zeichnest Straßen von Hand auf den Boden, lädst Familien ein, dort zu
bauen, und lernst jeden einzelnen Bewohner persönlich kennen. Ihre Freundschaften sind dein
Tech-Tree: Wer dich mag, empfiehlt dir Bekannte — den Arzt, die Lehrerin, den Ladenbesitzer.
So wächst aus Kreidestrichen eine lebendige Stadt, in der du selbst wohnst und jeden Namen
kennst. Kein Level-Ende, kein Zahlen-Dashboard: ein endloses, warmes Stadt-Tagebuch in
Third Person.

## 2. Die zwei Hooks (was uns von jedem anderen Stadtbauer unterscheidet)

1. **Ein Ensemble, kein Spawner.** Alle Bewohner sind vordefinierte, wiedererkennbare
   Familien mit Namen, Aussehen, Beziehungsnetz (wie im Original — Kenner wissen bei Run 2,
   mit wem sie reden müssen). Wir verstärken das: Familien haben persistente Bögen — Kinder
   werden Teenager (neue Bedürfnisse!), Freundschaften/Fehden entwickeln sich, und
   Gebäude-Kontakte kommen über erlebte Geschichten. Die Stadt ist eine Seifenoper, die du
   kuratierst.
2. *(Positionierung obendrauf: Third-Person-Stadtbau ist praktisch konkurrenzlos — die
   Stadt wird ERLAUFEN statt von oben verwaltet.)*

**Optionaler Zusatz-Hook (CHEF-ENTSCHEID OFFEN, „Kreide-Optik"):** Die Original-Kreide ist
ein reines Spawn-Werkzeug auf dem Grid (kein echtes Zeichnen!). Als moderne Abweichung
KÖNNTEN unsere fertigen Straßen trotzdem eine leicht organische, kreidig-charmante OPTIK
bekommen (kosmetisches Wobble auf der Grid-Logik, Logik bleibt 1:1). Alternativ: strikt
saubere Straßen wie im Original. Reine Geschmacksfrage, keine Mechanik-Änderung.

## 3. Kern-Referenz Metropolismania — was wir 1:1 übernehmen

- **Third-Person-Erkundung** frei über die Insel; die Stadt wird ERLAUFEN, nicht von oben verwaltet.
- **Radialmenü** mit Werkzeugen: Telefon, Kreide, Checkbuch (+ später Kamera, Notizbuch, Stadtplan).
- **Kreide-Modus:** unsichtbares Grid; im Kreide-Modus bewegt man sich NUR auf dem Grid und
  zeichnet Straßen; außerhalb freies Laufen. Straßen = gezeichnete Linien auf dem Boden.
- **Checkbuch:** Start mit X Wohnhaus-Kontakten; Platzierung nur an Straßen; nach Bauzeit
  (Minuten, real) steht das Haus und die Familie zieht ein.
- **Bewohner:** eigene Tages-Schedules, Sozial-Menü; Hausbesuch zeigt alle Anwesenden;
  Gespräche erhöhen Freundschaft; hohe Freundschaft → Kontakt-Empfehlung ins Checkbuch
  (Schule, Büro, Laden, Arzt …).
- **Jobs:** Bewohner nehmen sich selbstständig freie Stellen in platzierten Gebäuden.
- **Bedürfnisse familienbasiert:** Familie mit Kind braucht Grundschule, mit Teenager
  Highschool usw. (weiche Zufriedenheits-Treiber, keine harten Fail-States).
- **Vordefinierter Cast** statt Zufallsgenerierung (siehe Hook 2).

## 4. Unsere Abweichungen vom Original

- **Endless statt Level:** kein Missions-Ende. Fortschritt über „Stadtstufen"
  (Weiler → Dorf → Gemeinde → Kleinstadt → Stadt …), die an weiche Happiness-/
  Einwohner-Meilensteine gebunden sind und neue Insel-Distrikte + Kontakt-Kreise öffnen.
- **Insel-Distrikte als Raum-Progression:** die Insel ist groß und wild; neue Gebiete werden
  durch Erkundung + Stadtstufe erschlossen (Brücke reparieren, Pfad freischneiden — kleine
  Vor-Ort-Aktionen, KEIN Kampfsystem).
- **Happiness als Kompass, nicht als Fail-State:** sichtbar pro Familie und als Stadt-Stimmung;
  niedrige Werte verlangsamen Zuzug, nichts „stirbt".
- **Lebendige Bögen** (Hook 2): saisonale Mini-Ereignisse (Stadtfest, Streit der Nachbarn,
  Neugeborenes) aus einem handgeschriebenen Ereignis-Pool je Familie.

## 5. Kern-Loops

- **Minuten-Loop:** laufen → Kreide zücken → Straße ziehen → Gebäude platzieren → mit
  jemandem reden → kleine Empfehlung/Ereignis kassieren.
- **Session-Loop (20–60 min):** 1–2 neue Familien einziehen lassen, 1 neuer Kontakt-Typ,
  1 Familienbogen weitergedreht, Stadtspaziergang mit sichtbarem Wachstum.
- **Langzeit-Loop:** Stadtstufe erreichen → neuer Distrikt + neuer Kontakt-Kreis → Stadtbild
  verändert sich fundamental (erste Schule! erstes Café!) → neue Bögen im Ensemble.

## 6. Systeme im Detail

### 6.1 Insel & Weltgenerierung
- Eine große Insel, prozedural aus Seed (Heightmap + Biome: Wiese, Wald, Strand, Fels,
  Fluss), aber mit handdefinierten „Distrikt-Slots" (Progression braucht Verlässlichkeit).
- Straßenbau-taugliche Flächen werden bei der Generierung markiert (Slope-Grenzwert).
- Platzhalter Phase 0: Unity-Primitives + Vertex-Color-Terrain; Ziel-Look: Synty POLYGON.

### 6.2 Third-Person-Controller & Kamera
- CharacterBody-Controller (Laufen, Sprinten, kein Springen nötig), Cinemachine-3rd-Person,
  Kollision mit Welt + Gebäuden. Interaktions-Prompt (E) an Türen/Personen.

### 6.3 Radialmenü (Tools)
- Halten der Tool-Taste öffnet Radialmenü: **Telefon** (Kontakte anrufen/Status),
  **Kreide** (Bau-Modus), **Checkbuch** (Gebäude-Kontakte + Platzierung), später:
  Stadtplan, Kamera-/Foto-Modus, Notizbuch (Bögen-Tagebuch).

### 6.4 Kreide-System (Herzstück #1) — Original-treu
- **Die Kreide ist ein Straßen-SPAWN-Werkzeug, kein Zeichenstift** (Chef-Korrektur 26.07.):
  Im Kreide-Modus erscheint das sonst unsichtbare Grid (Zellgröße ~4 m), der Spieler bewegt
  sich NUR auf Grid-Knoten, und die abgelaufenen Grid-Kanten werden als Kreide-Markierung
  sichtbar → dort SPAWNT anschließend die Straße (kurze Bauzeit, dann fertige Straße).
- Regeln: max. Steigung, kein Wasser, Kreuzungen automatisch; Radieren möglich (solange
  kein Gebäude anliegt). Straßen tragen Adressen (für Schedules/Postkarten-Flair).
- Wichtig: außerhalb des Kreide-Modus KEIN Grid-Gefühl — freie Bewegung in Third Person.
- Optik der fertigen Straßen: sauber (Original) ODER leicht kreidig-organisch — offener
  Chef-Entscheid, s. Abschnitt 2.

### 6.5 Checkbuch & Bau-Lebenszyklus (Herzstück #2)
- Checkbuch = Liste freigeschalteter Kontakte (Familien + Institutionen) mit Porträt,
  Anforderungen (Straßenanschluss, Fläche, ggf. Distrikt) und „Scheck ausstellen"-Aktion.
- Platzierung: Fußabdruck an Straße snappen → Bauschild erscheint → reale Bauzeit
  (Minuten; Institution länger) → Richtfest-Moment → Einzug.
- Gebäude-Typen v1: Wohnhaus (3 Größen), Grundschule, Highschool, Lebensmittelladen,
  Arztpraxis, Büro, Café, Park (dekorativ + Happiness). Erweiterbar über Kontakt-Kreise.

### 6.6 Bewohner, Schedules, Sozial-System (Herzstück #3)
- **Cast-Datenbank:** ~40 handdefinierte Familien für v1 (Name, Mitglieder, Alter,
  Porträt-Rezept, Lieblingsthemen, Empfehlungsnetz, Ereignis-Pool). Datengetrieben
  (ScriptableObjects/JSON) — Fable kann den Cast generieren, Chef kuratiert.
- **Schedules:** Tagesphasen (Schlafen, Arbeit/Schule, Freizeit an POIs, Zuhause);
  NavMesh-Wege durch die gebaute Stadt; sichtbares Stadtleben ist das Belohnungsbild.
- **Sozial-Menü:** Hausbesuch → Anwesenden-Ansicht → Gespräch (Themenwahl, kleine
  Dialog-Vignetten aus dem Ereignis-Pool) → Freundschaftsstufen (Bekannt → Freund →
  Vertraut) → Empfehlungen (neue Kontakte ins Checkbuch) + Bogen-Fortschritt.
- **Jobs:** Institutionen definieren Stellen; arbeitsfähige Bewohner besetzen sie
  selbstständig (einfacher Matcher), sichtbar im Sozial-Menü („arbeitet im Laden").

### 6.7 Bedürfnisse & Happiness
- Familienbedürfnisse aus Zusammensetzung (Kind→Grundschule, Teen→Highschool,
  alle→Nahversorgung/Arzt in Reichweite, Job-Verfügbarkeit, Park-Nähe als Bonus).
- Happiness je Familie = erfüllte Bedürfnisse + Freundschaft + Ereignis-Modifikatoren;
  Stadt-Stimmung = gewichtetes Mittel → steuert Zuzugs-Tempo + Stadtstufen.

### 6.8 Endless-Struktur & Stadtstufen
- Stadtstufe N erreicht bei (Einwohner ≥ X UND Stimmung ≥ Y) → öffnet Distrikt + neuen
  Kontakt-Kreis + 1–2 Ensemble-Großereignisse. Keine Niederlage; Sandbox mit Herz.

### 6.9 Speicherstand
- **Lektion aus Grim Reach ab Tag 1:** SAVE_VERSION + Migrationskette + Kompat-Fixture-Vault
  von Anfang an; ein Save = Insel-Seed + Straßen-Graph + Gebäude + Cast-Zustand + Uhr.

## 7. Tech-Stack (ENTSCHEIDUNG)

**Unity 6 LTS + C#** — gewählt am 26.07.2026.
Ausschlaggebend (Chef): umfangreiche vorhandene, GEKAUFTE Asset-Bibliothek (v. a. Synty
POLYGON) + bestehende Unity-Erfahrung. Damit entfällt der größte Kostenblock (Art) und der
Ziel-Look steht ab Phase 1.

**AI-first-Arbeitsmodell (damit Fable die Grundstruktur KOMPLETT liefern kann):**
- Force-Text-Serialisierung, Assembly Definitions je Modul, klare Ordner-Konvention.
- **Editor-Bootstrap-Skripte statt Editor-Handarbeit:** Menü-Kommandos wie
  `Kreidestadt/Generate Island`, `Generate Test City`, `Rebuild NavMesh` erzeugen Szenen,
  Prefabs und Testwelten programmatisch. Chef klickt Menüpunkte, zieht keine Objekte.
- **AssetRegistry (ScriptableObject):** JEDE Asset-Referenz (Baum, Haus, Straße, UI-Icon)
  läuft über die Registry. Phase 0 = Primitives; Synty-Swap = Registry-Einträge tauschen.
- **Verifikation:** Unity Test Framework (EditMode+PlayMode) im `-batchmode` von der CLI —
  Agenten-Workflow wie bei Grim Reach (Suiten im Vordergrund, rot→grün-Beweise).
- Pakete: Cinemachine, Input System, AI Navigation (NavMesh), TextMeshPro. Keine exotischen
  Abhängigkeiten ohne Not.
- **Alternative (dokumentiert, verworfen):** Godot 4 — text-first ideal für AI, aber
  Asset-Bibliothek + Erfahrung liegen in Unity; Godot bleibt Plan B bei Lizenz-/Editor-Frust.

## 8. Fable-Bootstrap-Plan („Grundstruktur komplett", Meilensteine mit Definition of Done)

| M | Inhalt | Definition of Done (verifizierbar) |
|---|---|---|
| M0 | Projekt-Setup: Unity 6, asmdefs, Force Text, Test-Harness, AssetRegistry, Save-Gerüst v1 | Batchmode-Testlauf grün von CLI; leere Szene lädt |
| M1 | Insel-Generierung: Seed → Heightmap, Biome, Wasser, Platzhalter-Bäume (Registry) | `Generate Island` erzeugt begehbare Insel; PlayMode-Test prüft Flächen/Slopes |
| M2 | Third-Person: Controller + Cinemachine + Interaktions-Prompt | Testszene: laufen/kollidieren; Input-Smoke-Test |
| M3 | Radialmenü-UI (Telefon/Kreide/Checkbuch als Slots, UI-Platzhalter) | Menü öffnet/wählt per Gamepad+Maus; UI-Test |
| M4 | Kreide-System: Grid-Snap-Modus, Linien zeichnen/radieren, Straßen-Graph + Decals | `Generate Test City` zeichnet Straßennetz; Graph-Unit-Tests (Kreuzungen, Steigung) |
| M5 | Checkbuch + Platzierung + Bauzeit-Lebenszyklus (Schild→Haus, Platzhalter-Häuser) | Haus an Straße platzierbar, baut nach Timer; Save/Load-Roundtrip-Test |
| M6 | Bewohner v1: Cast-Datenbank (10 Familien), Einzug, NavMesh-Schedules | Bewohner pendeln sichtbar; Schedule-Unit-Tests |
| M7 | Sozial-System: Hausbesuch-UI, Gespräche, Freundschaft, Empfehlungs-Unlock | Empfehlung schaltet Kontakt frei; Integrationstest |
| M8 | Jobs + Bedürfnisse + Happiness + Stadtstufe 1→2 | Endless-Kernloop schließt sich; Sim-Smoke über 1 Spielwoche |
| M9 | Synty-Integration: Registry-Swap, Look-Pass, Foto-tauglicher Vertical Slice | Screenshot-Set „sieht nach Spiel aus" |

## 9. Platzhalter-Konventionen (Phase 0)

Bäume = grüne Capsules auf Zylindern · Häuser = Boxen mit Farbcode je Typ + TMP-Schild ·
Straßen = dunkle Quads + weiße Kreide-Linie (LineRenderer/Decal) · Personen = Capsules mit
Namens-Billboard · UI = flat panels, Systemfont. ALLES über die AssetRegistry, nichts hart
referenziert.

## 10. Risiken & offene Fragen

- **Cast-Autorenschaft skaliert nicht endlos** → Kreise von je ~15 Familien pro Stadtstufe,
  Fable generiert Entwürfe, Chef kuratiert (bewährtes Grim-Reach-Muster).
- **NavMesh auf prozeduraler Insel + wachsender Stadt** → Runtime-NavMesh-Baking (AI
  Navigation unterstützt das); Rebuild nur bei Bauabschluss.
- **Scope-Falle Innenräume:** v1 = EIN generischer Innenraum pro Gebäudetyp (Original-Feeling
  reicht), keine individuellen Interieurs.
- **Unity-Versionspflege:** LTS pinnen, Upgrade nur bewusst.
- Offen (Chef): endgültiger Titel, Insel-Größe v1, Zeitmodell (Echtzeit-Minuten vs.
  beschleunigte Spieltage), Foto-Modus in v1 ja/nein.

## 11. Verhältnis zu Grim Reach

Grim Reach läuft als Live-Produkt weiter (Updates, Community); Kreidestadt ist das parallele
Passion-Projekt. Getrennte Repos, getrennte Save-Welten, gemeinsames Arbeitsmodell
(Agenten-Wellen, Suiten-Disziplin, Patchnotes-Kultur, Save-Kompat-Gesetz ab Tag 1).
