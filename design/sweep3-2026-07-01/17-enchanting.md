# 17 — Verzaubern / Runen / Suffixe (QA-Verifikation)

**Rolle:** Kontrolleur (QA-Gate, read-only). **Datum:** 2026-07-01.
**Ziel:** Enchanting/Runen/Suffixe durchspielen und die vier gemeldeten Fixes verifizieren:
(1) Vorschau zeigt den Waffeneffekt-Proc, (2) Reason-Codes lokalisiert, (3) Erfolgs-Feedback +
Vorab-Gating, (4) Affix/Suffix-Werte + Umlaute korrekt.

**Ziel erreicht: JA.** Alle vier Punkte bestätigt (confirmed). Keine Blocker. Ein P3-Kosmetik-Nit.

---

## Headless-Gates
- ✅ **typecheck** — `pnpm typecheck` 5/5 Tasks grün.
- ✅ **tests** — `pnpm test` 486 passed / 78 Files (engine) + persistence (cached-pass). Guard-Tests
  direkt nachgefahren: `enchant.test.ts` (17), `suffix.test.ts` (13), `instance-weapon-effect.test.ts`
  (1) — 31 grün.
- ✅ **build** — `pnpm --filter @hearthforge/client build` exit 0.
- ✅ **sim** — `ECHTE WALLS — auch geared unbesiegbar (0)`. `AUFFÄLLIGKEITEN — Bronze-Baseline (12)`:
  ausschließlich die im Briefing bekannt/akzeptierten (undergeared vs. tanky Mid-Mobs + die 2
  zurückgetierten Tower-Skelette L36/L38 + 2 Gold-only-Diebstahl-Aktionen „keine Ausgabe-Items").
  Keine neue, enchanting-bezogene Auffälligkeit; keine Skilling-Aktion bei 0 XP/h.
- ✅ **UI-Crash-Gate** — `EnchantingPage` und alle `useGameState()`-Verbraucher hängen in `MainLayout`;
  App-Root rendert nur `Root` + `ItemTooltipOverlay` (nutzt das sichere `useGameStateMaybe`). Kein
  Menü-Crash-Risiko.

---

## Verifikation der 4 Punkte

### 1. Vorschau zeigt den Waffeneffekt-Proc — ✅ confirmed
`EnchantingPage.affixLines()` (`apps/client/src/renderer/pages/EnchantingPage.tsx:39`) delegiert an
`affixEffectSummary()` (`apps/client/src/renderer/components/ItemTooltip.tsx:164`), die ab Zeile 197
den `weaponEffectByTier`-Proc anhängt. Die Affixe flame/frost/shock tragen `weaponEffectByTier`
(`packages/content/src/index.ts:14125,14140,14196`). **Wichtig — nicht „defined but never applied":**
der Proc wird im Kampf tatsächlich angewandt, `combat.ts:655-658` nutzt bei ausgerüsteter Instanz
`effectiveInstanceWeaponEffects` (Basis + Affix) statt nur der Basis; abgesichert durch
`instance-weapon-effect.test.ts`. Vorher zeigte die Vorschau bei flame/frost/shock nur den winzigen
Flat-Bonus und verschwieg den Proc → Fix greift.

### 2. Reason-Codes lokalisiert — ✅ confirmed
Engine liefert stabile `EnchantReason`-Codes (`packages/engine/src/enchant.ts:32`). UI mappt via
`enchantReasonLabel` → `t("enchant.reason.<code>")`. Alle 6 Codes in EN + DE vorhanden
(`translations.ts:810-815` / `1700-1705`, korrekte Umlaute: „ausgewählt"). Der Legacy-Prosa-Fallback
(`LEGACY_REASON_MAP`) ist nur noch Sicherheitsnetz — die Engine emittiert ausschließlich Codes.

### 3. Erfolgs-Feedback + Vorab-Gating — ✅ confirmed
- **Erfolg:** `handleEnchant` → grünes Banner `enchant.feedback.enchanted` („Verzaubert!"), Disenchant
  → `enchant.feedback.removed` („Verzauberung entfernt."), `feedbackOk` schaltet die `.success`-Optik
  (`EnchantingPage.tsx:181-201`; Keys `translations.ts:817-818/1707-1708`). Salvage hat eigenes
  kurzlebiges „+X Gold, +Y Schrott".
- **Vorab-Gating:** `canEnchant` (`EnchantingPage.tsx:171`) deaktiviert den Verzaubern-Button
  vorab bei fehlendem Item/Rune, zu wenig Gold, keinem freien Slot (`usedSlots < maxSlots`) und
  Affix-Mismatch (`affixAppliesToItem` — dieselbe Prüfung wie in der Engine). Fehlgründe werden also
  verhindert, bevor geklickt wird; das lokalisierte Reason-Banner ist nur der Fallback.

### 4. Affix/Suffix-Werte + Umlaute — ✅ confirmed
Affix-`bonusByTier`/`weaponEffectByTier` sauber getiert (T1→T3), Suffix-Pool
(`statsPerIlvl`/`attrPerIlvl`/`weight`/`minIlvl`) typlogisch nach appliesTo (melee/ranged/magic/
armor/shield). Deutsche Präfixe/Suffixe korrekt inkl. Umlaute (Präzise, Jägerisch, des Bären, der
Schildkröte, des Wächters, Köcher). Mojibake-Scan über `translations.ts` + `content/index.ts`: 0
Treffer.

---

## Findings

### [P3][ux] Vorschau splittet den Proc in zwei Zeilen
`affixLines` (`EnchantingPage.tsx:45`) zerlegt die Summary an `" · "` — der Proc-String
`"15% Brand · 4/s"` bildet dadurch selbst zwei getrennte Bonus-Zeilen („15% Brand" und „4/s").
Der Proc **wird** angezeigt (Ziel erfüllt), Chance und DoT-Wert stehen aber optisch entkoppelt.
Der Item-Tooltip (`ItemTooltip.tsx:706`) zeigt exakt dieselbe Summary korrekt auf **einer** Zeile →
kleine Inkonsistenz. **Owner: UI-Dev.** Fix-Vorschlag: in `affixLines` nur an Bonus-Grenzen splitten
(z.B. Proc als eigenes, ungesplittetes Segment behandeln) statt pauschal an jedem `" · "`.

### [P3][feel] „/s"-Suffix bei frost/shock semantisch unscharf (pre-existing, nicht Enchanting-neu)
`affixEffectSummary` hängt an jeden Proc `"{magnitude}/s"`. Für frost (magnitude=1 = Slow-Flag) und
shock (magnitude=0.10 = Aussetz-Chance) ist „/s" irreführend — beides ist kein Schaden pro Sekunde.
Gilt identisch für Basiswaffen mit frost/shock und stammt aus der bestehenden Tooltip-Konvention
(`StatRows`), also **kein** Enchanting-Regress. Nur zur Kenntnis. **Owner: UI-Dev** (falls je poliert).

---

## Top-3
1. ✅ Enchant-Pipeline end-to-end intakt: Vorschau-Proc → Kampf-Anwendung → Tooltip stimmig,
   Reason-Codes + Erfolgs-Feedback + Vorab-Gating vollständig lokalisiert und funktional.
2. ✅ Affix-/Suffix-Content sauber getiert, typlogisch, Umlaute fehlerfrei; 31 Guard-Tests grün.
3. ⚠ Einziger Nit: Vorschau splittet den Proc kosmetisch in zwei Zeilen (P3, UI-Dev).

**Empfehlung: SHIP.** Der P3-Nit ist optional-fix-then-ship, kein Blocker.
