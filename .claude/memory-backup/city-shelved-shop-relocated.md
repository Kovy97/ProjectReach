---
name: city-shelved-shop-relocated
description: Stadt-Feature stillgelegt; Shop/Bank/Quests ins Menü; Combat-Zonen nur List (Maps aus, Karten halbiert)
metadata:
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Entscheidungen (2026-06-28):

- **Stadt-Feature „auf Eis gelegt"** (nicht nur deferred — vorerst ganz raus). Die bisher Stadt-gegateten Nav-Einträge (`placement:"city"` in navigation.ts: Shop/Bank/Quests) wurden **ins Menü/Sidebar als direkt erreichbare Top-Level-Einträge** ausgelagert. Stadt-Eintrag ausgeblendet, solange leer.
- **Combat-Zonen: „Maps"-Ansicht deaktiviert** — nur noch die **List/Karten-Ansicht** der Monster (CombatPage `mapMode` dauerhaft false, immersive ZoneMapView stillgelegt). Die **List-Karten um ~50% verkleinert**.
- **Economy-Konsequenz:** Da City das geplante Zuhause der Gold-Makrosenke war und jetzt stillgelegt ist, bleibt der Gold-Sink offen → Economy-Persona bleibt ~8 gedeckelt, bis ein Ersatz-Sink gebaut wird (siehe [[ea-0.1-release-push]]). Slayer-Punkte-Sink existiert (Slayer-Shop).
- **Asset-Arbeitsteilung bekräftigt:** Chef generiert/liefert alle Icons selbst → Visual-Reworks mit dem **bestehenden Citadel-Design-System** (Rahmen/Texturen/Cinzel/vorhandene Icons), keine neue Art voraussetzen. Siehe [[sidebar-style-is-design-system]].

**Why:** Stadt war zu groß für 0.1; Shop muss sofort nutzbar sein. Maps-Ansicht war unfertig/überladen → schlanke List bevorzugt.
**How to apply:** Neue Features nicht hinter „Stadt" gaten. Visual-Rework-Rollout (Citadel-DS) läuft auf Charakter-Erstellung, Shop, Slayer-Oberfläche, Kampf-Oberfläche.
