# Sweep 3 — 12: Erste-Stunde-Anfänger je Startstil (Onboarding / Equip / Quiver)

**Rolle:** Kontrolleur (QA). **Datum:** 2026-07-01. **Modus:** headless, kein Code geändert.
**Ziel:** Erste-Stunde-Anfänger je Startstil verifizieren — Onboarding-Kampf-Text (3 Skills),
Köcher im UI befüllbar (Ranged kann Pfeile nachlegen), Auffindbarkeit Equip/Kampf/Craft, Renderer.

## Verdikt der Gates
- ✅ **typecheck** — `pnpm typecheck` exit 0.
- ✅ **tests** — 78 Dateien / **486 Tests** grün (engine + persistence). Balance-Sim endet
  `ECHTE WALLS — auch geared unbesiegbar (0)`. Die Bronze-Baseline (12) + Über-Baseline (61)
  sind die im BRIEFING ausdrücklich **akzeptierten** Undergeared-Worst-Case-Anomalien, keine echten Walls.
- ✅ **build** — `pnpm --filter @hearthforge/client build` exit 0 (`✓ built in 13.64s`).
- ✅ **Renderer-Crash-Gate** — sauber (Details unten).
- ✅ **i18n-Parität** — alle geprüften Onboarding-/Ammo-/Hint-Keys EN+DE vollständig.

## Ziel erreicht? → JA (mit 3 P3-Politur-Findings)
Köcher-Befüllen und Pfeil-Nachschub funktionieren voll; Onboarding-Kampf-Text stimmt für
Fernkampf & Magie, hat eine kleine Ungenauigkeit für den Default-Nahkämpfer. Alle Gates grün.

---

## Target 1 — Onboarding-Kampf-Text „3 Skills leveln"
**Status: bestätigt korrekt für Ranged/Magie, off-by-one für Default-Melee.**

Text (EN `translations.ts:881`, DE `:1771`): *„Pro Kampf trainieren drei Fertigkeiten: dein
Offensiv-Skill (bestimmt durch den Fokus — Angriff, Wucht, Fernkampf oder Magie-Angriff),
Vitalität (immer) sowie Verteidigung bzw. Magie-Verteidigung (bei jedem erlittenen Treffer)."*

Abgleich mit der Engine (`packages/engine/src/combat.ts`):
- `grantOffenseXp` (405–428): Default-Melee-Stance ist `combatStyle:"attack"` (`character.ts:86`),
  und die **splittet die Offensiv-XP 55 % attack / 45 % power** (`combat.ts:421–423`) — plus
  Vitalität immer (`:427`) — plus Verteidigung/`magic_def` beim Einstecken (`:121`).
- **Melee-Starter trainiert also 4 Skills:** attack + power + vitality + defence.
- **Ranged-Starter:** ranged + vitality + defence = **3** ✓
- **Magie-Starter:** magic_off + vitality + (magic_def|defence) = **3** ✓ (Text „Verteidigung bzw.
  Magie-Verteidigung" deckt beide Fälle korrekt ab, da der Defensiv-Skill von der Schadensart des
  Gegners abhängt.)

→ Für den Default-Nahkämpfer (häufigster Startfall) sieht der neugierige Neuling **Angriff UND
Wucht** steigen, im Widerspruch zum „dein Offensiv-Skill (bestimmt durch den Fokus)". Der
Combat-Step listet darunter zwar alle 7 Kampf-Skills auf (mildert Verwirrung), die Kernaussage
„drei Fertigkeiten" bleibt aber für Melee um 1 daneben.

`[P3][ux] Onboarding „3 Skills" unterzählt Default-Melee (attack-Stance trainiert 4: attack+power+vitality+defence)`
Repro: Neuen Melee-Char erstellen, kämpfen → Angriff, Wucht, Vitalität, Verteidigung steigen.
Erwartet lt. Guide: 3. Tatsächlich: 4. Owner: **ui-dev** (Text). Fix-Vorschlag: im Melee-Kontext
„Angriff und Wucht" statt „dein Offensiv-Skill" andeuten, oder Aussage auf „drei Kategorien:
Offensive, Vitalität, Verteidigung" umformulieren. Vertretbar auch als bewusste Vereinfachung.

## Target 2 — Köcher im UI befüllbar / Ranged kann Pfeile nachlegen
**Status: bestätigt voll funktionsfähig.** (confirmed)

- `ammo` ist ein echter Equip-Slot (`shared/index.ts:488`), Label „Quiver/Köcher" (`:507`).
- CharacterPage: `ammo` in `dollSlots` (`CharacterPage.tsx:415`); Drag&Drop validiert
  `isAmmoItem` (`:532–533`) → `equipItem` → `equipAmmo` (`:552`); Inventar-Aktion „Ausrüsten"
  für Munition (`:343–346`); Munitionszähler im Slot (`:593–594`).
- Engine `equipAmmo` (`equipment.ts:185–217`): **gleiche Sorte stapelt** (`ammoCount += moved`, `:199`),
  saubere Rollbacks bei „Inventar voll"/Dup — Nachfüllen funktioniert.
- **Nachschub-Quellen für Anfänger vorhanden:** Shop `crude_arrow` = 1 Gold (`content:10987`);
  `fletch_crude_arrows` ab Fletching **L1** (`content:7509`, arrow_shaft×5 + feather×1 → 15 Pfeile).
  `crude_arrow` hat **keine** `requirements` (`content:322–331`) → immer ausrüstbar.
- **Awareness gut verdrahtet:** Ranged-Start-Hinweis „halte Munition bereit!" (`Toasts.tsx:175–182`,
  i18n `:659/:1549`); Munition-leer-Toast „Lege Pfeile nach…" (`Toasts.tsx:293–298`, i18n `:664/:1554`).

`[P3][chore] Veralteter Kommentar CharacterPage.tsx:63` — „Pre-registered … no-op until EQUIP_SLOTS
includes 'ammo'" ist überholt; `ammo` ist längst in `EQUIP_SLOTS`. Owner: **ui-dev**. Rein kosmetisch.

## Target 3 — Auffindbarkeit Equip / Kampf / Craft
- **Kampf:** Sidebar-Eintrag `nav.combat` (`navigation.ts:62`) + Onboarding-Combat-Step +
  Kampfstatus in der Kopfzeile. ✅ gut auffindbar.
- **Craft:** alle Handwerks-Skills als Sidebar-Einträge (`navigation.ts:75,80–84`) + je Skill ein
  Onboarding-Guide-Step (alle 14 Nicht-Kampf-Skills haben `onboarding.guide.<id>` EN+DE). ✅
- **Equip:** Charakter-/Ausrüstungs-Seite ist **nur in der Top-Bar** (`navigation.ts:54`,
  `topBarPages:121`), **kein eigener Onboarding-Step** fürs Ausrüsten. Startwaffe ist auto-equippt,
  daher kein Blocker; „Ausrüsten" gefundener/gecrafteter Gegenstände hängt aber am Finden des
  Top-Bar-Charakter-Buttons. „done"-Step erwähnt „rüste dich aus" (i18n `:895/:1785`).

`[P3][ux] Equip-Auffindbarkeit schwächer als Kampf/Craft` — Charakterblatt top-bar-only, kein
dedizierter Onboarding-Step. Owner: **ui-dev**. Vorschlag: kurzer Character/Equip-Step im Guide.

## Renderer-Crash-Gate (useGameState)
Alle 21 `useGameState`-Verbraucher werden ausschließlich innerhalb von `MainLayout` gemountet
(Screen „playing"): alle Seiten via `PageContent` (`App.tsx:302`), `GameStats`/`Sidebar`/`TopBar`
(header), `Toasts`/`PetCelebration`/`OfflinePopup`/`Onboarding` (`App.tsx:305–308`).
Der einzige App-Root-Verbraucher `ItemTooltipOverlay` nutzt das null-sichere `useGameStateMaybe`
(`ItemTooltip.tsx:495,747`). `MainMenu`/`CharacterCreation` verwenden nur `useGameControl`.
→ Kein „Toasts-am-App-Root"-artiger Absturz möglich. **PASS.**

---

## Findings nach Severity
- **P0/P1/P2:** keine.
- **P3 (3):**
  1. `[ux]` Onboarding „3 Skills" unterzählt Default-Melee (4 Skills). — ui-dev
  2. `[ux]` Equip-Auffindbarkeit: Charakterblatt top-bar-only, kein Onboarding-Step. — ui-dev
  3. `[chore]` Veralteter „no-op ammo slot"-Kommentar `CharacterPage.tsx:63`. — ui-dev

## Top-3
1. Onboarding-Kampf-Text für Default-Melee präzisieren (attack+power) — sonst korrekt.
2. Equip als Onboarding-Step/Sidebar-Sichtbarkeit ergänzen (Kampf & Craft sind es).
3. Köcher-Fill + Pfeil-Nachschub verifiziert einwandfrei — kein Handlungsbedarf.

## Empfehlung: **ship** — alle Gates grün, nur 3 P3-Politur-Punkte, keiner blockierend.
