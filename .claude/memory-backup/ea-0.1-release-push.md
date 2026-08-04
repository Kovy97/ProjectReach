---
name: ea-0.1-release-push
description: Aktuelles Ziel — Steam Early-Access 0.1 „voll poliert"; Arbeitsteilung Chef vs. Claude
metadata:
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Ziel (2026-06-28): So bald wie möglich eine **Early-Access 0.1 auf Steam** publishen.

## STAND 2026-07-01 — Steam-Setup größtenteils erledigt
- **Steam Partner freigeschaltet, App angelegt:** **AppID `4915450`**, **Depot `4915451`** („Grim Reach Content").
- **EA-Release-Datum: 2026-08-10** (von 20.07 verschoben, ~40 Tage Puffer für Politur + Wishlists).
- **Store-Seite** (vorerst **English-only**, siehe [[steam-store-english-only]]): Beschreibung, Capsules/Bilder, KI-Offenlegung, Early-Access-Fragebogen, Altersfreigabe, Screenshots, Allgemeine Infos = fertig. **Offen: Preis** (~$6.99–7.99) + Store-Seite zur Valve-Prüfung einreichen (→ „Demnächst" öffentlich).
- **Build-Upload:** `win-unpacked` gebaut; per Browser-ZIP-Upload (`G:\GameDev\steam\grimreach_depot_4915451.zip`, 746 MB) statt steamcmd. Danach noch: Build auf `default`-Branch live schalten + App-Config veröffentlichen. VDF-Skripte + Anleitung in `G:\GameDev\steam\`.
- **electron-builder** (NSIS+Portable+dir) aktiv, Version 0.1.0; **Steam-Integration verdrahtet aber inert** (`apps/client/src/main/steam.ts`, Achievements/Stats für EA bewusst AUS; Auto-Cloud = config-only, Werte: Byte-Kontingent 104857600 / 100 Dateien, Pfad `%APPDATA%\Grim Reach\saves`, `*.json`).
- **Capsules** sind 2×-hochskaliert (Steam verlangt neue doppelte Größen) → etwas weich; **später durch native ersetzen** (Asset-Swap unkritisch, kein Re-Review-Blocker).
- **XP-Balance-Studie** aller 13 Nicht-Combat-Skills fertig (`design/xp-balance/<skill>.md` + `SUMMARY.md`): Raten meist ok, Problem = 1-XP-Böden + tote Tiers; Fix = fast nur `xp`-Bumps + Min-2-Boden. **Einpflegen noch offen (chef-gated).** Zusätzlich Blocker: `dim_essence` erst ab Lv20 verfügbar → Runenkunst nicht startbar (früh-Quelle nötig).

**Qualitäts-Schwelle: „voll poliert"** — alle 327 fehlenden Icons + leichte Onboarding-Hilfen + Run-4-Politur müssen vor 0.1 fertig sein (nicht der schlanke Schnellstart).

**Arbeitsteilung:**
- **Chef** kümmert sich um die **Icons** (generiert sie via ChatGPT aus `design/chatgpt-icon-prompts.txt`) UND um „das Steam zeug" (Partner-Account/AppID, Store-Page, Upload).
- **Claude (CEO)** treibt **alle Dev-Todos** weiter, maximal parallel (so viele Agents wie das serielle `content/index.ts` + Single-Owner-pro-Revier zulassen, i.d.R. ~3-4).

**AKTIVER NACHT-LOOP (2026-06-28, 12 h):** Wenn keine andere Dev-Arbeit offen ist → 20-Tester-Sweep → Triage → Fix (parallele Agents) → Re-Verify → Re-Sweep, **iterieren bis JEDE der 20 Personas Spaß-Score ≥ 9,5** hat. Ehrlich messen, keine geschönten Scores; deferred-gedeckelte Linsen (Economy→City) so hoch wie möglich + Blocker dokumentieren. Tester-Sweeps nur an grünen Checkpoints ([[tester-sweep-budget-ok]]).

**Kritischer Pfad ist Steam selbst** (Partner-Account-Freischaltung + Store-/Build-Review, Tage), nicht der Code → läuft parallel.

**Dev-Restliste bis 0.1** (Details/Plan: dieser Chat + `design/release-readiness.md`): Parität-Runde-2 verifizieren · Content-Sammelwelle (Suffix-Pool, Crop-Ökonomie, Reed-Gates, affix_shock, Meta-Achievements) · Pet-Vollsammlung-Achievement · leichte Onboarding-Hilfen · electron-builder Windows-Packaging + steamworks.js-Minimalintegration + Version 0.1.0 + About-Screen + Bug/Discord-Link · finale Icon-Bindung (asset-integrator, sobald Chef Bilder liefert) · Smoke-Test der gepackten Build. Siehe [[roadmap-1.0]], [[onboarding-guide-final-milestone]] (voller Guide bleibt späterer Meilenstein), [[overnight-ceo-run]].
