# Tester-Welle T3 — Finaler End-to-End-Durchgang (Übernacht-Test-Loop)

**Datum:** 2026-06-27 · **Rolle:** Playtester-Analyst (Spieler-Sicht, read-only) · **Scope:** nur dieses Doc.
**Fokus:** Laufen die HEUTE-NACHT-Systeme **in Kombination** rund? Combo-Food-Loop · Fence-Loop · neue Skill-Ketten · Combat-Level-XP + Brücken-Monster + neue Loot-Magnete. Plus: Gesamteindruck Spaß & ggf. EINE billige F4-Restmaßnahme.

**Quellen verifiziert (Code gelesen):** `content/index.ts` (Combo-Food-Items 126–167 + Rezepte 3916–3977; Brücken-Monster 7211–7240; Loot-Magnete highland_key/wyvern_scale/void_rune + ihre Sinks tan_wyvern_scale 5660, highland_aerie-Dungeon 8049, Runecrafting-Rezepte; Fence-Kette 5244+; stunMs 5014–5236), `shared/index.ts` (DEFAULT_STUN_MS=1200, combatXpLevelMult), `engine/tick.ts` + `combat.ts` (hpRegen-Tick, Stun-Pfad), `i18n/translations.ts` (en/de-Parität), Fence-Kategorie-Label (categories 8101).

**Frischer Verifikationslauf (cache-frei, Turbo-Cache geleert):**
- `tsc --noEmit` shared/content/engine/client → **alle grün**.
- `pnpm --filter @hearthforge/engine exec vitest run` → **61 Files / 334 Tests passed**, exit 0.
- Sim: **AUFFÄLLIGKEITEN — Bronze-Baseline (0)** · **ECHTE WALLS (0)**. Brücken-Monster beide aktiv: highland_wyvern L79 (Bronze kills=21/d1 · geared 222/d0), roc_void L84 (Bronze kills=1/d21 = bewusster Regen/DPS-Check wie roc_storm · geared 203/d0).

**Damit ist F3 holistisch grün** (war im Plan dispatcht, aber noch nicht als DONE verifiziert — hiermit nachgeholt).

---

## End-to-End-Verdikt je System

### 1) Combo-Food-Loop (Fisch/Fleisch/Crop/Herb → kochen → Kampf) — **RUND**
Die Kette schließt sich als Spieler sauber und greift über **vier Lieferskills**: Fischen (raw_murk_perch … raw_soulfish) + Monster-Fleisch (raw_chicken/raw_beef) + Farming-Crop (gravetato/bloodgrain/soulgourd/wither_leek/ambergrain) + Herblore/Foraging-Kraut (herb_marshroot … herb_godsbreath) → Kochen T1–T5. Die Engine-Reparatur sitzt: `useConsumable` wendet **Heilung UND Buff zugleich** an, `hpRegenPerSec` ist ein echter DerivedStat und tickt **im Kampf** (combat.ts) wie im Idle. Der Tooltip rendert „💚 +N/s" (F1). Die Regen-Leiter **1→2→4→7→12 HP/s** ist klar gestaffelt und gated.
**Lohnt der Aufwand?** Ja, sichtbar: `cooked_voidray` heilt 170 ohne Buff; `ambergrain_feast` heilt 265 **+ 12/s Regen + großes Kampf-Buff-Paket** (+14 alle Schäden, +6 % Crit, +12 Acc, +22 Def, 5 min). Heal + hpRegen + Buff fühlen sich zusammen jetzt als klares, lohnendes BiS-Food an — nicht als drei getrennte Halbsachen. **Friktion:** keine spielbare; nur die aus T1 bekannte **Design-Wechselwirkung** (T5 so stark, dass reine Herblore-Buff-Tränke im Schatten stehen) — gewollt laut Auftrag, kein Fix nötig.

### 2) Fence-Loop (stehlen → verhehlen → Gold/Gems) — **RUND, mit einem Discovery-Rest**
Schleife schließt sich: Steal liefert Wertsachen (stolen_coinpurse … idol_coin) als Items → Fence-Aktionen verbrauchen sie als `inputs` → Gold + Gems/Mats. Der **Stun ist entschärft** (F3): statt 2000–6000 ms jetzt **600–1400 ms** (DEFAULT_STUN_MS=1200) — die schärfste Anti-Fun-Spitze ist weg, ein Fehlschlag kostet keinen 10-Sekunden-Leerlauf mehr. Gold-EV ist auf ~+17–36 % getrimmt (F2), höhere Tiers geben echte XP. Fence-Kategorie hat ein Label (en „Fence" / de „Hehler").
**Auffindbarkeit nach dem Hint:** halb. Der `thieving.fenceHint` existiert (en+de), erscheint aber **nur, wenn der Spieler die eingeklappte „Hehler"-Kategorie aufklappt**. Ein Spieler, der nie draufklickt, sieht „stolen_*"-Items stapeln und erfährt nie, dass sie verhehlbar sind. → einzige verbleibende, kleine **Friktionsstelle** (siehe F4).

### 3) Neue Skills (foraging/farming/herblore/inscription) — **RUND**
Greifen als Spieler spürbar ineinander: Der Combo-Food-Loop ist der sichtbare Beweis — Farming-Crops **und** Herblore/Foraging-Kräuter fließen zusammen ins Kochen (Forage/Farm → Brew/Cook → in-combat Power). Herblore-Heiltränke, Inscription-Glyphen (Gear-Power) und Farming/Foraging-Mats haben durchweg Verbraucher-Skills (Balance-T1: alle vier Kurven konsistent im Gathering-Band, keine 0-XP-Aktionen, keine toten Mats). Die Ketten Forage/Farm→Brew/Scribe→Power sind als Lieferketten erkennbar verdrahtet.

### 4) Combat-Level-XP + Brücken-Monster + Loot-Magnete — **RUND**
Die Leiter **L75 → 79 → 84 → 92** hat Lücken **4/5/8** — alle unter `XP_ZERO_GAP=15`. Die T1-Soft-Wall (17-Level-Loch) ist geschlossen; die Progression fließt jetzt durch das Übergangsband ohne Null-XP-Klemme. Die Über-Level-Lenkung ist transparent (Klartext-Log + ausgegrauter „Kein XP"-Stern, F1) → fair statt buggy.
**Loot-Magnete ziehen jetzt hin** (F3 löst T2-fun-P1-2): highland_wyvern dropt **wyvern_scale** (epic, → `tan_wyvern_scale` = 2× warhide-Abkürzung) **+ highland_key** (epic, value 700, schaltet den Highland-Aerie-**Dungeon** auf — echtes aspirationales Ziel); roc_void dropt **void_rune** (heavy Runecrafting-Feedstock, viele Rezepte) + void_essence/soulopal. Alle drei Magnete haben reale Sinks. Der Spieler zieht jetzt zu den Brücken-Monstern **weil die Drops locken**, nicht nur weil der graue Stern wegschiebt. Der einzige fehlplatzierte `scarred_hide` am L79-Wyvern ist ersetzt.

### 5) Gesamteindruck Spaß-Score — **gut & kohärent**
Das Spiel ist in einem runden, kohärenten Zustand. Die heute-nacht-Systeme laufen **in Kombination** glatt: eine Heil-/Buff-Versorgungskette über vier Skills, eine geschlossene Diebstahl→Hehler-Ökonomie ohne Leerlaufstrafe, eine flüssige Endgame-XP-Leiter mit begehrenswertem Loot. Sim grün (0 Auffälligkeiten / 0 Walls), tsc grün, 334 Tests grün. Die teuren Mechaniken stimmen; was bleibt, ist **eine** kleine Sichtbarkeits-Lücke, kein Systemproblem.

---

## Verbleibende P0/P1
**Keine.** Kein P0, kein P1. Alle T1/T2-P0/P1 sind verifiziert geschlossen (Sichtbarkeit F1, Brücken-Monster+Fence-Trim F2, Stun+Loot-Magnete F3). Verbleibend nur Politur (P2).

---

## EINE höchste-Fun-ROI-Restmaßnahme (optionales F4)

### → Fence-Discovery-Nudge: proaktiver Toast/Badge bei Beute-Stau.
**Was:** Wenn sich verhehlbare Steal-Items (`stolen_*`) im Inventar stapeln (z. B. ≥ N), ein einmaliger Toast / ein Badge an der Thieving-Seite: „Verhehlbare Beute: N — beim Hehler in Gold & Edelsteine wandeln." Damit findet **jeder** Spieler den Fence-Loop, statt dass eine ganze fertige Mechanik ungenutzt liegt, weil der Hint hinter einer eingeklappten Kategorie versteckt ist.
**Warum die Nr. 1:** Es schaltet ein komplettes, bereits gebautes Fun-System (die Fence-Schleife) für Spieler frei, die es sonst nie entdecken — höchster Hebel pro Aufwand. Alles andere Verbleibende (Combat-„nächstes-Ziel"-Highlight, Gathering-Sparkle-Events, Offline-Stopp-Feedback) ist entweder teurer oder geringerer Sog.
- **Aufwand:** S
- **Revier:** ui (Toast/Badge-Trigger an vorhandenem Inventar-State; optional eine i18n-Zeile en/de). content/engine unberührt.
- **Save-Flag:** **NEIN** — reine UI/Anzeige, kein neuer persistenter State, kein SAVE_VERSION-Bump. (Eine „schon gesehen"-Flag wäre nice-to-have, ist aber nicht nötig — der Badge kann rein aus dem Inventarbestand abgeleitet werden.)
**Knapp dahinter (gleiche S-Klasse, optional bündelbar):** „nächstes XP-Band"-Highlight in der Monster-/Zonenauswahl (sagt „dorthin", nachdem das Greying „nicht hier" sagt) — ui, kein Save, aber S–M und geringerer Sog als der Fence-Nudge.

---

## Empfehlung
Das Spiel ist **konvergiert** und im verifizierten SHIP-Zustand. Das eine F4 oben ist billig+wertvoll, aber **optional** (Politur, kein Blocker). **Empfehlung: shippen** — entweder direkt, oder mit dem einen S-großen Fence-Nudge als letztem Politur-Schliff — und die geparkten **Chef-Entscheidungen vorlegen**: (a) Farming-Plots umsetzen (Save-Bump 34), (b) engine-thin-skill-Toggles Risk/Fokus (Save-Bump + UI), (c) Combat-Bundle-Cleanups (toter overLevelMult/shared, Fletching-Kategorie, combatXpLevelMult-NaN-Härtung), (d) M5-Packaging-Entscheide aus `design/release-readiness.md` (App-Name/Icon/Steam-AppID/Store-Assets).
