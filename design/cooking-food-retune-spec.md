# Cooking-Food-Retune-Spec (Task #241)

**Owner:** balance-designer (Zahlen). **Anwendung:** content-dev (setzt verbatim um). **Danach:** `pnpm test` (Sim + Guards) + Sweep-Gegencheck (kontrolleur).
**Ich editiere kein `packages/**`.** Diese Spec liefert nur die Ziel-Zahlen + Apply-Liste.

Grundwerte gelesen aus `packages/content/src/index.ts` (Foods + `cook_*`-Aktionen), `packages/engine/src/character.ts`/`combat.ts`/`consumable.ts` (Heil-/Regen-Mechanik) und `packages/shared/src/index.ts` (`consumableHeal`, Attribute). Bezug: `design/combat-feel-v2-spec.md` #0 (Sustain-Fenster), `design/sweep4-2026-07-01/05-cooking.md` (XP-Kurve = OK, unberührt).

Chef-Befund (#238 klammerte Food bewusst aus): keine Differenzierung zwischen Tiers, Krümel-Regen (`cooked_cod`=`cooked_ghostfin_pike` identisch trotz höherem Level; `healPct` erst ab heal≥5 wirksam; Regen-Dezimalen 0.1–1.2 runden in der UI auf „0/s").

---

## 0) Kern-Entscheidungen (das Modell)

1. **Zwei Food-Klassen.** *Einfach* (1 Zutat: Fisch/Fleisch) = **nur Heilung, kein Buff.** *Gericht* (3–4 Zutaten) = **mehr Heilung als das gleich-Tier-Einfach-Food + Attribut-Buff.** Gerichte führen jedes Tier und das Endgame.
2. **Heil-Leiter.** Low-Band (Freischalt ≤ L25) = **flache, distinkte Ganzzahlen 1–6** (fixt `cod`=`ghostfin`; kleiner HP-Pool ⇒ kleine Zahlen unvermeidbar). High-Band (≥ L26) = **`healPct` in ganzen %** ⇒ Heilung **skaliert mit dem Spieler** (macht spätes Food spürbar groß, sobald der UI-Display-Bug gefixt ist). Einfach-`healPct` **5→9 %**, Gerichte **immer +1…+3 % darüber, Deckel 12 %**.
3. **Regen raus.** `hpRegenPerSec` wird aus **allen Koch-Foods entfernt** (Dezimalen unsichtbar, marginal, fressen das Sustain-Budget). Gericht-Power kommt jetzt aus **Attribut-Buffs** (heilen nicht → Rüstung bleibt relevant).
4. **Attribut-Buffs auf Gerichten** (ganzzahlig, spürbar, +3 mid … +8 ultimativ): STR→Nahkampf, DEX→Fernkampf (auch Krit/Tempo/Ausweichen — daher etwas kleiner), INT→Magie (+WIS Mana), CON→maxHP/Tank, LCK→Krit/Glück.
5. **Endgame von Gerichten geführt.** 3 neue Gerichte (L86/L93/L98), damit `voidray`/`abyssal`/`soulfish` (einfache Fische) nicht mehr die Spitze sind. Bester Bissen im Spiel = `soulfire_banquet` (L98).

**Chef-Entscheidung übernommen:** Top-Gerichte **12 %** (Zufriedenheit vor striktem Fenster; Rüstung bleibt stark bevorzugt).

---

## 1) Mechanik-Fakten (dieser Session verifiziert)

**Frische, ungerüstete maxHP-Kurve** (`maxHp = 5 + con·2 + (vit−1)·0.3`, con aus Skills; Sim-Worst-Case-Baseline):

| L | 1 | 15 | 25 | 30 | 35 | 45 | 55 | 63 | 70 | 78 | 85 | 92 | 97 |
|---|---|----|----|----|----|----|----|----|----|----|----|----|----|
| maxHp | 11 | 33 | 48 | 56 | 63 | 80 | 95 | 108 | 118 | 130 | 142 | 152 | 160 |

- `consumableHeal(item,maxHp)` = `healPct != null ? round(maxHp·healPct) : healAmount`. **Ist `healPct` gesetzt, wird flaches `healAmount` beim ECHTEN Heilen ignoriert** (nur Fallback/Tooltip). ⇒ Zwei Foods mit gleichem `healPct` heilen identisch — Ursache von „keine Tier-Differenzierung".
- `hpRegenPerSec` akkumuliert **fraktional pro Tick** im Kampf (combat.ts ~1506) ⇒ Dezimal-Regen heilt real, ist nur in der UI unsichtbar („0/s") und Sustain-relevant. → deshalb raus.
- **% rundet bei kleinem Pool auf fast gleiche Werte** (cod/ghostfin/shadowcarp alle → 2 bei 5 %) ⇒ **flache Ganzzahlen geben im Low-Band mehr distinkte Stufen als %.** Bestätigt „Low-Band flach lassen".
- Kein Guard deckelt Consumable-Attribut-Buffs; Guards erzwingen nur **Ganzzahligkeit** (erfüllt). Das „+2-Food-Attribut-Budget" (`consumables-enchantments-spec §2.3`) ist eine Design-Konvention, die hier **bewusst überschrieben** wird.
- **Cooking-XP unberührt:** `pnpm test` zeigt gesunde XP/h über alle Koch-Aktionen (kein 0-XP). Dieser Retune fasst NUR `healAmount`/`healPct`/`buff` an — nie `xp`/`durationMs`/`inputs`/`loot`.

---

## 2) Apply-Tabelle A — Low-Band (flach, nur Heilung, `healPct` + Regen + Buff ENTFERNEN)

`healAmount` = Ganzzahl unten setzen. `healPct` löschen, `hpRegenPerSec`/`buff` aus diesen Einfach-Foods entfernen (chicken/beef/wolf etc. werden reine Heil-Foods).

| id | cook L | ist heal | **NEU flat** | Aktion |
|---|---|---|---|---|
| ashroot_broth | 1 | 3 | **1** | heal only |
| cooked_shrimp | 1 | 1 | **1** | — |
| cooked_chicken | 2 | 3 (+crit/regen) | **1** | Buff+Regen raus |
| grimwheat_porridge | 3 | 4 | **2** | heal only |
| cooked_murk_perch | 5 | 1 | **2** | — |
| cooked_beef | 5 | 4 (+regen) | **2** | Regen raus |
| roasted_bog_fowl | 7 | 3 | **2** | — |
| grilled_boar_loin | 8 | 4 | **3** | — |
| cooked_trout | 10 | 2 | **3** | — |
| cake_honey | 10 | 2 (+regen) | **3** | Regen raus (value 34 bleibt) |
| roasted_hare | 14 | 5 | **4** | — |
| cooked_cod | 15 | 4 | **4** | war == ghostfin |
| cooked_ghostfin_pike | 20 | 4 (+maxHp) | **5** | **jetzt ≠ cod**; maxHp-Buff raus |
| wolf_steak | 22 | 7 (+dex2) | **5** | dex-Buff raus → heal only |
| cooked_shadowcarp | 25 | 5 | **6** | flach Spitze |

Fisch-Track streng steigend **1,2,3,4,5,6** ✓. Fleisch/Misc folgen der Level-Kurve (1–2 triviale Cross-Mob-Gleichstände L5–7, ok).

---

## 3) Apply-Tabelle B — High-Band Einfach-Fisch/Fleisch (nur Heilung, `healPct` in ganzen %)

`healPct` = neuer %-Wert (als Dezimal: 5 %=`0.05`). `healAmount`-Fallback = `round(unlockMaxHp·pct)` (sane, steigend, für den noch-buggy Display). `hpRegenPerSec` + crit/tempo-Buffs **entfernen** (anglerfish, wyvern → heal only).

| id | cook L | ist healPct | **NEU healPct** | **Fallback healAmount** |
|---|---|---|---|---|
| venison_roast (Fleisch) | 28 | 0.05 | **0.05** | 3 |
| cooked_ironscale_bass | 30 | 0.05 | **0.05** | 3 |
| cooked_salmon | 35 | 0.05 | **0.05** | 3 |
| roc_drumstick_grilled (Fleisch) | 40 | 0.05 | **0.06** | 4 |
| cooked_duskfin_carp | 45 | 0.05 | **0.06** | 5 |
| bear_haunch (Fleisch) | 48 | 0.055 | **0.06** | 5 |
| cooked_lobster | 55 | 0.055 | **0.06** | 6 |
| cooked_crypteel | 60 | 0.055 | **0.07** | 7 |
| cooked_bloodfang_eel | 63 | 0.055 | **0.07** | 8 |
| cooked_anglerfish | 70 | 0.06 (+buff) | **0.08** | 9 |
| wyvern_steak (Fleisch) | 72 | 0.06 (+buff) | **0.08** | 10 |
| cooked_wraithscale | 78 | 0.06 | **0.08** | 10 |
| cooked_voidray | 85 | 0.06 | **0.09** | 13 |
| cooked_abyssal_crawler | 92 | 0.065 | **0.09** | 14 |
| cooked_soulfish | 97 | 0.065 | **0.09** | 14 |

---

## 4) Apply-Tabelle C — Gerichte (mehr Heilung als gleich-Tier-Einfach + Attribut-Buff; Regen raus)

`healPct` neu, `hpRegenPerSec` **entfernen**, tempo/crit-Mikro-Buffs durch **Attribut-`modifiers`** (ganzzahlig) ersetzen. `healAmount`-Fallback = `round(unlockMaxHp·pct)`.

| id | cook L | Tier | **NEU healPct** | **NEU Buff (modifiers, ganzzahlig)** | Stil |
|---|---|---|---|---|---|
| marshroot_chowder | 18 | T1 | **0.08** | `con +2` | früh, herzhaft |
| bloodgrain_stew | 38 | T2 | **0.08** | `str +3` | Nahkampf |
| duskfin_rangers_stew | 48 | T3 | **0.08** | `dex +3` | Fernkampf |
| spellwarden_bisque | 52 | T3 | **0.08** | `int +3` | Magie |
| soulgourd_brisket | 58 | T3 | **0.09** | `str +4, con +2` | Nahkampf herzhaft |
| steelshot_bisque | 63 | T3 | **0.09** | `dex +4` | Fernkampf |
| spellflare_tisane | 65 | T4 | **0.10** | `int +4, wis +2` | Magie |
| witherleek_bouillabaisse | 75 | T4 | **0.10** | `str +5, con +2` | Nahkampf |
| witherleek_sharpshooters_pie | 76 | T4 | **0.10** | `dex +5, con +2` | Fernkampf |
| witherleek_arcane_broth | 77 | T4 | **0.10** | `int +5, wis +3` | Magie |
| risotto_starcap | 90 | T5 | **0.11** | `con +8` | Tank / max-HP |
| ambergrain_feast | 90 | T5 | **0.11** | `con +6, str +4, dex +4, int +4` | großes Festmahl |

Das Witherleek-Trio L75–77 behält seine bewusste **Stil-Parität** (gleiche Heilung, stil-spezifisches Attribut). Buff-Dauer (`durationMs`) je Gericht unverändert lassen.

---

## 5) Apply-Tabelle D — NEUE Endgame-Gerichte (content-dev LEGT AN: Item + `cook_*`-Aktion + Roh-Input-Refs)

Alle Zutaten existieren. Jedes schlägt klar den Einfach-Fisch seines Bereichs ⇒ Gerichte dominieren L85-99. XP/Gold der `cook_*`-Aktionen on-curve via `target_xph`-Formel (content-dev, nicht mein Hebel).

| neue id | cook L | Zutaten (qty) | **healPct** | **Buff (modifiers)** | Rolle |
|---|---|---|---|---|---|
| `voidray_banquet` | 86 | raw_voidray 1 · raw_beef 2 · ambergrain 1 · herb_godsbreath 1 | **0.10** | `con +5, str +3, dex +3, int +3` | erstes Endgame-Festmahl (schlägt voidray 9 %) |
| `abyssal_feast` | 93 | raw_abyssal_crawler 1 · raw_beef 2 · starcap_truffle 1 · herb_nightbloom 1 | **0.11** | `con +6, dex +4, lck +2` | schlägt abyssal 9 % |
| `soulfire_banquet` | 98 | raw_soulfish 1 · raw_beef 2 · ambergrain 1 · herb_godsbreath 1 | **0.12** | `con +8, str +5, dex +5, int +5, wis +3, lck +3` | **bester Bissen im Spiel** |

Vorschlag Namen (EN/DE): Voidray Banquet / Leerenrochen-Bankett · Abyssal Feast / Abgrund-Festmahl · Soulfire Banquet / Seelenfeuer-Bankett. Icons: 🍽️/🫕. `rarity`: epic (banquet/feast), `soulfire_banquet` legendary falls vorhanden. `value` on-tier (content-dev).

---

## 6) Bestätigung: monoton, distinkt, Hierarchie

- **Fisch-Flach-Track L1–25:** 1,2,3,4,5,6 — streng steigend, **cod(4) ≠ ghostfin(5)** ✓ (Chef-Befund gefixt).
- **High-Band Ist-Heilung-bei-Freischalt** (`pct·maxHp` an der Unlock-maxHp): Einfach ≈ 3,3,4,5,6,6,7,9,10,10,13,14,14 — steigend; wenige %-Gleichstände ziehen durch maxHp-Wachstum beim Leveln auseinander.
- **Gericht > Einfach in jedem Tier** (Gericht-`healPct` > Einfach-`healPct` desselben Tiers) ✓.
- **Endgame von Gerichten geführt:** L86/90/90/93/98-Gerichte (10–12 %) schlagen alle plain voidray/abyssal/soulfish (9 %) ✓. Bester Bissen = `soulfire_banquet` ✓.
- **Attribut-Map:** Nahkampf→str, Fernkampf→dex, Magie→int(+wis), Tank→con, Glück→lck; +3 (mid) → +8 (ultimativ). Stil-Parität erhalten.

---

## 7) Sustain-Fenster-Einordnung (v2 Rüstungs-Pflicht) + geflaggte Grenze

Food-allein Steady-Sustain = `healPct / 3 s`. Nackt on-level Zufluss ≈ **5 % maxHp/s**; gerüstet ≈ **2,5 %/s**. Ziel: Food-allein zwischen beiden, näher an nackt ⇒ **nackt+Food stirbt weiter on-level**.

| Band | bestes Food | healPct | Food-allein %/s | vs nackt 5 %/s |
|---|---|---|---|---|
| L28-45 | bloodgrain_stew | 8 % | 2,7 % | stirbt ✓ |
| L46-64 | steelshot_bisque | 9 % | 3,0 % | stirbt ✓ |
| L65-84 | witherleek-Gerichte | 10 % | 3,3 % | stirbt ✓ |
| L85-97 einfach | soulfish | 9 % | 3,0 % | stirbt ✓ |
| **L85-99 Gericht** | soulfire_banquet | **12 %** | **4,0 %** | **stirbt, dünne Marge ⚠** |

- **Regen-Entfernung senkt** den Gesamt-Sustain ggü. heute ⇒ Fenster auf der Sustain-Achse strukturell sicherer; das höhere `healPct` gibt das Budget zurück, netto Food-allein ~3–4 %/s (innerhalb v2-Ziel 3–4 %/s).
- **⚠ Obergrenze (Chef bestätigt 12 %):** `soulfire_banquet` 12 % = 4,0 %/s nähert sich dem nackten Zufluss (~4,5–5 %/s). Steady-State stirbt Nackt weiter, aber ein **nackter Endgamer, der Top-Gericht + Auto-Trank stapelt, könnte on-level via Burst überleben.** Bewusst akzeptiert (Zufriedenheit priorisiert). **Rüstung bleibt stark bevorzugt**, nicht absolut zwingend am Ceiling für einen voll-consumable-gestapelten Nackten. Fallback bei Bedarf: Top-Gerichte auf 10 % (3,3 %/s).
- **Attribut-Buffs = sicherer Power-Hebel:** con hebt Pool, dex minimal Ausweichen (Sekundär-Überleben), aber KEINE HP/s ⇒ Rüstung (Mitigation) bleibt materiell besser als Food allein. Genau der „buffen ≠ heilen"-Ansatz.

---

## 8) Geordnete Apply-Liste (content-dev)

1. **Low-Band → flach, heal only** (Tab A): `healAmount` setzen; `healPct`, `hpRegenPerSec` und Buffs aus diesen Einfach-Foods **entfernen**.
2. **High-Band Einfach-Fisch/Fleisch** (Tab B): neues `healPct`; Fallback `healAmount = round(unlockMaxHp·pct)`; `hpRegenPerSec` + crit/tempo-Buffs **entfernen** (anglerfish, wyvern → heal only).
3. **Gerichte** (Tab C): neues `healPct`; `hpRegenPerSec` **raus**; tempo/crit-Mikro-Buffs durch die gelisteten **Attribut-`modifiers`** ersetzen; `durationMs` unverändert.
4. **3 neue Endgame-Gerichte anlegen** (Tab D): Item-Defs + `cook_*`-Aktionen + Roh-Input-Refs; XP/Gold on-curve.
5. **`pnpm test`** (Sim + Guards): Cooking-XP unverändert, kein neuer kills=0, Ganzzahl-Attribut-Guard grün. Danach Sweep-Gegencheck (kontrolleur): gerüstet ≈ 0 Tode, nackt+Food stirbt weiter.

**Koordination / Risiken:**
- **UI-Display-Fix (ui-dev / Chef):** Food muss `healPct·maxHp` zeigen, nicht flaches `healAmount`, sonst ist das Skalieren unsichtbar. Fallback-Flats sind derweil sane gesetzt.
- **§2.3-Konvention:** Food-Attribut-Buffs (+3…+8) übersteigen das alte „+2-Budget" bewusst — kein Guard blockt (nur Ganzzahligkeit), aber die §2.3-Notiz aktualisieren, damit es nicht zurückgedreht wird.
- **Save-Logik:** heal/buff leben nur in der ContentDB ⇒ **kein SAVE_VERSION-Bump**, keine Migration. Neue Items = neue ids (additiv).
