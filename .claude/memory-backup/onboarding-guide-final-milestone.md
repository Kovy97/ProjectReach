---
name: onboarding-guide-final-milestone
description: Großer geführter Onboarding-Guide kommt ganz zum Schluss — jetzt nur leichte In-Kontext-Hilfen
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Entscheid (2026-06-26): Der **umfassende, geführte Onboarding-Guide** (erklärt Stadt, Optionen, Menüs — das ganze Spiel für Neulinge) kommt **ganz zum Schluss**, als finaler Politur-Meilenstein, erst wenn alles andere fertig ist.

**Why:** Erst Systeme/Content/Balance fertigstellen und Richtung Steam bringen; ein großer Tutorial-Layer lohnt sich erst, wenn das Spiel inhaltlich steht (sonst muss man ihn ständig nachziehen).

**How to apply:** Kleine, leichte **In-Kontext-Hilfen** (einmalige Toasts/Tooltips bei neuen Mechaniken) sind ok. Verwirrungs-/Erklärungsbedarf aus Playtests für diesen Meilenstein sammeln. Vgl. [[combat-fx-later-milestone]].

**UPDATE 2026-07-01 — Chef hat den Guide jetzt konkret beauftragt** (als „großer Plan" NACH dem laufenden Balance-Sweep). Volle Spec/Anforderungen + technischer Ansatz stehen in **`design/onboarding-guide-plan.md`**. Kernvorgaben: feuert bei JEDEM neuen Spielstand + im Optionsmenü neu startbar; **Spotlight-Gating** (immer nur das hervorgehobene Element klickbar, Rest abgedunkelt/deaktiviert); erklärt JEDEN Topbar-Unterpunkt einzeln, dann in der Sidebar JEDEN Skill (wozu/wie-leveln/was-bewirkt); **Ton Lore/In-Game, KEINE Dev-Notizen**. Ersetzt das aktuelle 21-Schritt-Modal `components/Onboarding.tsx` (von Sweeps als zu schwer/nicht-adaptiv geflaggt). Offene Design-Frage beim Bau: alle 13 Skills upfront ODER per-Skill beim ersten Seitenbesuch (gegen die 40-Schritt-Wall). Bau = eigener dedizierter Pass (ui-dev + logic-dev Zustand + SAVE_VERSION-Bump).
