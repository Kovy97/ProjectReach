---
name: localization-7-languages
description: "Grim Reach ist jetzt 7-sprachig — UI + Content übersetzt, Overlay-Architektur, offener Font-Follow-up"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Grim Reach ist seit 2026-07-05 auf **7 Sprachen** ausgelegt: EN/DE (Referenz) + **ZH-Hans, RU, ES, PT-BR, FR**.

- **UI-Strings:** `apps/client/src/renderer/i18n/locales/<lang>.ts` (je ~996 Keys), eingehängt in `UI_TEXT` in `translations.ts`. `Locale`-Typ + `LOCALES` in `packages/shared/src/index.ts`.
- **Content-Strings:** Overlay-Architektur — `packages/content/src/locales/<lang>.ts` (je ~3528 Keys, Schema `"<collection>:<id>:<field>"`), gemerged via `applyContentLocales()` in `packages/content/src/locales/apply.ts` (aufgerufen in content/index.ts). EN-Quelle: `design/content-strings-en.json`. `LocalizedString = { en } & Partial<Record<Locale,string>>` → fehlende Keys fallen per `resolveText` auf en zurück (inkrementell shippbar).
- **Glossar:** `design/i18n-glossary.md` (115 Kernbegriffe, 7 Sprachen) — Referenz für Konsistenz bei künftigen Übersetzungen/Nachträgen.
- **Font:** `--font-head` (base.css) hat CJK/Kyrillisch-System-Font-Fallback. **ENTSCHEIDUNG 2026-07-09 (EA-Launch):** Noto Sans SC wird NICHT gebündelt — Windows-only-Launch, Microsoft YaHei ist auf Win10/11 vorinstalliert (~10 MB gespart). Wiedervorlage NUR falls Linux-nativ/Steam-Deck-Verifikation ansteht (Proton-CJK-Abdeckung dann prüfen). Übersetzungen sind maschinell+glossarkonform → für den Store Muttersprachler-Review empfohlen.
- **Verschachtelte Content-Felder** (z.B. `pets:<id>:combatAbility.name`): Punkt-Pfad-Support in apply.ts (resolveHost, 1 Ebene); Ability-Namen seit 2026-07-09 in allen 7 Sprachen + Engine-Guard in pet-integrity.test.ts.

Neue Sprache hinzufügen = Locale-Typ erweitern + `i18n/locales/<lang>.ts` (UI) + `content/locales/<lang>.ts` (Content) füllen. Siehe [[always-rebuild-client-after-changes]].
