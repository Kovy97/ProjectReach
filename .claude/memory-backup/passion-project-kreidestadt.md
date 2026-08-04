---
name: passion-project-kreidestadt
description: "Chefs zweites Spiel (Passion-Projekt): Metropolismania-Neuinterpretation „Kreidestadt\" — GDD liegt in G:\\GameDev\\passion-project\\GDD.md, Stack Unity 6 + Synty"
metadata: 
  node_type: memory
  type: project
  originSessionId: 85edb3a2-2fd2-41b3-a534-53012ba5a3bd
  modified: 2026-07-26T08:07:48.623Z
---

Chefs Passion-Projekt neben Grim Reach (26.07.2026 geplant): **„Kreidestadt"** (Arbeitstitel) — moderne Metropolismania-Kopie als Endless Game. **GDD: `G:\GameDev\passion-project\GDD.md`** (dort ALLES: Systeme, Hooks, Meilensteine M0–M9).

Kern: Third-Person auf großer Insel; Kreide = Straßen-SPAWN-Werkzeug auf unsichtbarem Grid (Chef-Korrektur: man ZEICHNET nicht wirklich — im Kreide-Modus läuft man auf Grid-Knoten, Straße spawnt auf den markierten Kanten); Checkbuch platziert Gebäude an Straßen (reale Bauzeit); vordefinierter Familien-Cast mit Schedules, Sozial-Menü, Freundschaft → Kontakt-Empfehlungen = Tech-Tree; Jobs selbstbesetzend; familienbasierte Bedürfnisse; Endless über Stadtstufen + Insel-Distrikte statt Level. Haupt-Hook: „Ensemble statt Spawner" (persistente Familien-Bögen). Offener Chef-Entscheid: kreidig-organische Straßen-OPTIK (rein kosmetisch) vs. Original-sauber.

**Stack-ENTSCHEIDUNG: Unity 6 LTS + C#** — wegen Chefs großer GEKAUFTER Asset-Bibliothek (v.a. Synty POLYGON) + Unity-Erfahrung (schlug meine Godot-Präferenz). AI-first-Modell: Force-Text, asmdefs, Editor-Bootstrap-Skripte (Szenen/Prefabs programmatisch, Chef klickt nur Menüpunkte), AssetRegistry-ScriptableObject für Platzhalter→Synty-Swap, Unity Test Framework im Batchmode als Agenten-Verifikation. Save-Kompat-Gesetz ab Tag 1 (Grim-Reach-Lektion). Erwartung: Fable baut bei Projektstart die KOMPLETTE Grundstruktur (M0–M8 im GDD mit Definition of Done).
