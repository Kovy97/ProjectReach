# Release-Readiness & Packaging-Plan — Hearthforge Idle

> Stand 2026-06-24. **Reines Planungs-Dokument** (kein Code/keine Config geändert). Die Umsetzung
> (electron-builder, steamworks, Store-Assets) startet erst auf Chef-Freigabe („M5"/„Release"), da sie
> Entscheidungen + Accounts/Assets braucht, die nur der Chef liefern kann.

---

## ⟳ STAND-UPDATE 2026-06-26 (seit der ursprünglichen Fassung dazugekommen)
Die Tabelle unten (§1) ist teils veraltet. Wesentliche Erweiterungen:
- **Voll ausgebautes Smithing:** 12-Metall-Tier-Leiter (copper→godiron), 240 schmiedbare Items, einklappbare Tier-Kategorien.
- **Drei vollwertige Kampfstile, tier-getrieben:** Melee + **Ranged** (Short/Long-Bögen ×12 + Pfeile ×12) + **Magie** (Staff/Wand/Focus ×12 mit Mana-System: per-Waffe `manaCost`, Mana-Depletion→Schwach-Nahkampf→Regen-Loop). Stil-abhängige Treffsicherheit (skaliert mit dem jeweiligen Kampf-Skill). Drei-Stile-Parität auditiert + balanciert.
- **Runen & Verzauberung:** 6 Element-Essenzen (tier-platzierte Monster-Drops) → 8 Runen → 11 Enchant-Rezepte (kombinierbare Effekte, inkl. Void-Fusionen mit 2 Status).
- **Gefährten/Pets:** 21 Pets mit **einzigartigen getriggerten Kampf-Aktionen** (Klauen/Burn/Stun/Heal/Schild…) + Pet-Sprung-Animation, statt bloßer %-Buffs.
- **UI-Rework:** Achievements-, Mastery-, Skills-Overview-Seiten neu (größer, echte Icons), Status-Banderole mit Kampf-Cancel + HP-Übersicht, Mana-Bar, Enchant/Spell-Tooltips, atmosphärische gekachelte Textur-Hintergründe.
- **Persistenz:** SAVE_VERSION jetzt **33** (vollständige Migrationskette), `sanitizeState`-Härtung.
- **Tests:** Engine **317** grün, persistence 26, typecheck 5/5, Balance-Sim AUFFÄLLIGKEITEN 0 / WALLS 0.
- **Marketing-Vorbereitung:** `design/steam-store-draft.md` (Store-Texte EN/DE, Screenshot-Shotlist, Trailer-Beats, Tags, Capsule/Icon-Konzept, Preis-Range).

→ Kerngame ist **noch reicher & runder** als zuvor. Es fehlt weiterhin nur der **Distributions-/Steam-Layer** (M5) + Chef-Entscheidungen (Name/Icon/AppID/Preis/Assets).

---

## ⟳ STAND-UPDATE 2026-07-01 — M5-Dev-Todos VORBEREITET (startklar für EA)
Der Distributions-/Steam-Layer ist jetzt technisch fertig vorbereitet, sodass EA nur noch an Chef-Entscheidungen (§4) hängt:
- **electron-builder aktiv:** `apps/client/electron-builder.json` (appId `com.hearthforge.idle`, productName „Grim Reach", NSIS + Portable, x64). `pnpm --filter @hearthforge/client package` erzeugt verifiziert **NSIS-Setup + Portable** in `apps/client/release/` (je ~745 MB). Version steht auf `0.1.0`.
- **Steam-Integration verdrahtet, aber INERT:** neues `apps/client/src/main/steam.ts` — optionaler `steamworks.js`-Runtime-Require (No-Op ohne Paket/AppID), `initSteam()`, `unlockAchievement(id)`, IPC-Handler `steam:achievement-unlock`/`-sync`. Renderer meldet neu freigeschaltete Achievements über die bestehende Toast-Diff-Logik + Voll-Sync beim Laden. Preload-Brücke `window.hearthforge.steam` + Typen ergänzt.
- **Scharfschalten sobald AppID da (3 Schritte):**
  1. `pnpm add steamworks.js --filter @hearthforge/client`
  2. `STEAM_APP_ID` in `steam.ts` auf die echte AppID (oder Env `GRIMREACH_STEAM_APPID`).
  3. `steam_appid.txt` (nur die Zahl) für Dev neben die Executable; Achievements im Steam-Backend anlegen und ihre API-Namen = interne IDs benennen (1:1-Default) oder in `STEAM_ACHIEVEMENTS` mappen.
- Icon: Platzhalter `resources/icon.ico` (7 Größen) + `icon.png` (256²) vorhanden; durch Chef-Branding ersetzen.
- **Offen bleibt nur §4** (AppID, Icon/Branding, Store-Assets, Preis, Signing).

---

## 1) Release-Reife-Status (was steht)
| Bereich | Status |
|---|---|
| **Kern-Loop** | ✅ Sammeln → Verarbeiten → Ausrüsten → Kämpfen → Gold → Shop |
| **Skills** | ✅ 6 Gathering + 8 Processing (alle vertieft, Tier-Laddern, Processing kategorisiert) + 7 Kampf-Skills |
| **Content** | ✅ 8 Zonen, 56 Monster, ~270 Items, 13 Metall-Tiers, Gem-/Schmuck-Kette, Buff-Glyphen, Tränke |
| **Combat-Balance** | ✅ Über ALLE Level validiert: Bronze-Baseline 0 Auffälligkeiten + geared Endgame-Held 0 Walls (`design/sim-economy-snapshot.md`) |
| **Mastery** | ✅ Doppelertrag + Tempo + Preservation + Pool-Checkpoints (Melvor-artig) |
| **Economy** | ✅ Gold-Senke (Auto-Eat-Upgrade-Linie), Shop, Bank, Sim-Gold-Instrumentierung |
| **Meta/Politur** | ✅ Stats-Seite, Offline-Popup, Toasts, Optionen (Sprache/UI-Scale/Save-Export-Import/Audio), Onboarding, Bestiary mit Portraits |
| **Persistenz** | ✅ SAVE_VERSION 20, vollständige `migrateState`-Kette, 5 Slots, Autosave, Offline-Engine |
| **i18n** | ✅ EN/DE, compile-erzwungene Parität |
| **Audio** | ✅ prozedurale SFX (Web Audio); ⬜ optionale Hintergrundmusik offen |
| **Fenster** | ✅ Fullscreen-Start, kein Debug, F11/F12-Notausgänge |
| **Tests/QA** | ✅ 180+ Tests grün, sim grün, kontrolleur-QA-Sign-off grün |
| **Packaging** | ⬜ electron-vite bündelt nach `out/`; **electron-builder (Installer) fehlt** |
| **Steam** | ⬜ steamworks.js nicht integriert |

→ **Spielerisch & technisch release-reif.** Es fehlt der **Distributions-/Steam-Layer** (M5).

## 2) Packaging-Plan (electron-builder)
electron-vite baut Renderer+Main nach `apps/client/out/`. Für Installer/Distributable zusätzlich
**electron-builder** (oder `@electron-forge`). Vorschlag electron-builder:
- `pnpm --filter @hearthforge/client add -D electron-builder` + `electron-builder.yml` (oder `build`-Key).
- **Felder (Chef bestätigt):**
  - `appId`: Vorschlag `com.hearthforge.idle`
  - `productName`: Vorschlag `Hearthforge Idle`
  - `version`: aus `0.0.0` auf `1.0.0` heben (package.json)
  - `directories.output`: `release/`
  - `files`: `out/**`
- **Targets:**
  - Windows: `nsis` (Installer) + `portable` (für Itch/Direkt) — primär
  - macOS: `dmg` (braucht Signing/Notarization → Apple-Dev-Account, optional/später)
  - Linux: `AppImage` (optional)
- **Icon-Anforderungen (Chef liefert Branding):**
  - Windows: `icon.ico` (256×256 enthalten)
  - macOS: `icon.icns`
  - Linux/Allg.: `icon.png` 512×512 (besser 1024×1024)
  - NSIS-Installer-Grafik (optional): `installerSidebar.bmp` 164×314, Header 150×57
- electron-vite hat einen `electron-vite build`-Schritt; danach `electron-builder` auf `out/` ansetzen
  (Reihenfolge im Script: `electron-vite build && electron-builder`).

## 3) Steam-Integration (steamworks.js)
- **Voraussetzung:** Steam-Partner-Account + **App-ID** (kostet 100 $ Steam-Direct, Chef).
- Lib: `steamworks.js` (Node-Native, im Main-Prozess). `steam_appid.txt` mit der App-ID fürs Dev.
- **Achievements:** wir haben bereits `state.achievements` + `content.achievements` — auf Steam-
  Achievement-IDs mappen, beim Freischalten `client.achievement.activate(id)` aus dem Main via IPC.
- **Cloud-Saves:** Steam Auto-Cloud (einfachste Variante) auf den Save-Ordner zeigen ODER Remote
  Storage API; unsere Saves sind JSON-Dateien (über `saves`-IPC) → Auto-Cloud genügt vermutlich.
- **Overlay:** funktioniert mit Steam-Launch automatisch.

## 4) Offene CHEF-Entscheidungen (Blocker für M5-Umsetzung)
- [ ] **Finaler App-Name** (Arbeitstitel „Hearthforge Idle")
- [ ] **Icon / Branding** (Logo, Icon in den o. g. Größen)
- [ ] **Steam-App-ID** (Account + Steam-Direct-Gebühr)
- [ ] **Store-Assets:** Capsule-Bilder (Header 460×215, kleine/große Capsule, Library 600×900),
      Screenshots, Trailer, Kurz-/Lang-Beschreibung, Tags
- [ ] **Preis & Release-Datum**
- [ ] **Ziel-Plattformen** (nur Windows zum Start? mac/Linux später?)
- [ ] **Signing:** Windows-Code-Signing-Zertifikat (gegen SmartScreen-Warnung), macOS-Notarization

## 5) Verbleibende Pre-Launch-TODOs (autonom machbar bis dahin)
- [ ] **19 Monster ohne Art** (s. `design/asset-gaps-monsters.md`) — warten auf Asset-Drop des Chefs
- [ ] **Optionale Hintergrundmusik** (prozedural via Web Audio, analog zu SFX) — autonom machbar
- [ ] **Finaler manueller QA-Durchlauf** im echten Build (`/run`-Skill / `pnpm dev`) — Sichtprüfung aller Seiten
- [ ] **version 0.0.0 → 1.0.0** (trivial, beim M5-Start)
- [ ] **Balance-Feinschliff** (optional; aktuell 0 Auffälligkeiten, daher niedrige Prio)

## 6) Konkrete erste Schritte, sobald Chef „M5" sagt
1. `electron-builder` als devDependency hinzufügen + Build-Config (appId/productName/targets) anlegen.
2. `version` → `1.0.0`; Build-Script `electron-vite build && electron-builder --win nsis portable`.
3. Platzhalter-Icon einsetzen (bis Chef-Branding kommt) → ersten Windows-Installer erzeugen + lokal testen.
4. Parallel: `steamworks.js` integrieren (sobald App-ID da), Achievement-Mapping + Auto-Cloud.
5. Store-Assets-Liste an den Chef zur Lieferung; Steam-Store-Seite einrichten.

**CEO-Empfehlung:** Spiel ist release-reif. Sobald der Chef „M5"/„Release" sagt + die Entscheidungen
aus §4 trifft, sind Punkte 1–3 in 1–2 Iterationen autonom umsetzbar (Installer lokal lauffähig).
