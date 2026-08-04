# Sweep 2026-07-01 — Ökonomie & Min-Maxing/Exploits (Kontrolleur)

Scope: Gold-Quellen vs. -Senken, Shop-Preise, Drop-/Craft-Margen, Auto-Eat-Kosten,
Degenerate-Strategien. Rein gemessen über echte Engine-Funktionen (`SimPlayer`/`sim.ts`,
`createGame`/`advance`/`buyItem`/`sellItem`/`shop.sellPrice`). Headless, deterministisch.
Nur Bericht — kein Spiel-Code geändert.

## Verifikations-Gates (Kontext)
- `pnpm typecheck`: ✅ 5/5 Pakete grün.
- Engine-Tests (direkt via vitest, kein Turbo-Cache): ✅ **478 passed / 79 files**.
- Balance-Sim: **ECHTE WALLS (geared) = 0** (kein Monster ist für einen ausgerüsteten Helden
  unbesiegbar). **AUFFÄLLIGKEITEN — Bronze-Baseline = 9** (7× untergerüstete Bronze-Baseline
  besiegt bestimmte Lv15–42-Mobs/Bosse nicht — Combat/Content-Domäne; 2× Thieving-Aktionen als
  „keine Ausgabe-Items" markiert = **Heuristik-False-Positive**, s.u. Info-3). Keine Aktion mit
  0 XP/h, keine gestallte Aktion.

---

## P2 — [balance/exploit] Shop-gefütterter Gold-Loop: `enchant_dim_focus` (Level-1, risikofrei)

**Erwartet:** Kein positiver Kauf→Craft→Verkauf-Loop, der allein aus Shop-Material Gold druckt
(Design: „Gear nur via Crafting/Drops", Wirtschaft soll nicht ab Minute 1 trivialisierbar sein).

**Tatsächlich:** Die Aktion `enchant_dim_focus` (content/index.ts:8344) erzeugt aus **4× `dim_essence`**
ein **`dim_focus`** — ohne `levelRequired` (default 1), 5 s Dauer. `dim_essence` ist im Shop für
**8 g** kaufbar (index.ts:11021). `dim_focus` hat **value 120 → Verkaufspreis 60 g** (non-Instance-
Equipment, via `sellItem` normal verkaufbar).

- Marge pro Craft: `60 − 4×8 = +28 g`.
- Gemessene Rate: **610 foci/h** (5-s-Aktion), Steady-State **NET ≈ +13.720 g/h** (konservativ; ~20 %
  der Foci werden per `DEFAULT_CRAFT_SUFFIX_CHANCE` zu Suffix-**Instanzen** — von `itemCount`/`sellItem`
  übersprungen, aber ebenfalls verkauf-/salvage-bar → realer Ertrag eher **~17 k g/h**).
- Zusätzlich: gratis Runecrafting-XP + verkaufbare Suffix-Gear-Instanzen.

**Repro:**
1. Neues Spiel (Level 1, kein Skill-Setup).
2. `dim_essence` im Shop kaufen (8 g), `setActiveAction("enchant_dim_focus")`, `advance(1h)`.
3. Alle `dim_focus` via `sellItem` verkaufen → +13.720 g netto (nur Shop-Input, kein Kampf/kein Gear).

**Evidence:**
```
recipe: 4x dim_essence (shop 8g = 32g) -> 1x dim_focus (sell 60g), levelRequired: NONE
foci/1h = 610, essence consumed = 2860 (Rest = Suffix-Instanzen), revenue 36600g,
essence cost 22880g  =>  NET +13720 g/h  (pure shop-fed, no gear, no risk)
```

**Root Cause (P3, gleiche Ursache):** `dim_focus` value=120 ist gegen seine Nachbarn **invertiert**:
`copper_focus`=35, `bronze_focus`=70, `iron_focus`=110 — der Tier-0/Start-Fokus ist teurer als die
drei Stufen darüber. copper/bronze/iron-Foci sind bei ihren Rezepten **netto-negativ** (−22 etc.),
also KEIN Loop — nur `dim_focus` ist der Ausreißer. Fix-Optionen (Chef/content-dev): `dim_focus.value`
auf ~20–30 senken (unter 32 g Input) ODER `enchant_dim_focus.levelRequired`/Input-Kosten anheben.
**Owner:** content-dev (Zahlen), Freigabe Chef.

---

## P3 — [balance] 66/625 Craft-Aktionen sind material-netto-negativ (meist erwartbar, 1 Ausreißer)

**Erwartet:** Verbrauchs-/Zwischenprodukte dürfen netto-negativ sein (man craftet zum Benutzen, nicht
zum Verkauf). Die Marge soll aber nicht extrem klaffen.

**Tatsächlich:** 66 Aktionen netto-negativ; überwiegend Runen (rune_*_ii/iii) und Herblore-Elixiere —
**erwartbar** (Verzauberungs-/Buff-Material, nicht zum Vendorn gedacht). **Ein Ausreißer sticht heraus:**
`forge_tower_compound` (smithing, 20 s): Input-Wert **3700 → Output-Wert 2000**, Marge **−1700**
(−306.000 g/h). Als Zwischenprodukt/Sink evtl. gewollt, aber die Größe ist auffällig — bitte prüfen,
ob `tower_forge_compound.value` bewusst so tief liegt. **Owner:** content-dev (Info/Review).

---

## P3 — [balance] Endgame-Gear-Craften ist die stärkste Gold-Quelle (Inflation im Late-Game)

**Erwartet:** Craften-zum-Verkauf ~ auf Combat-Niveau, nicht um Größenordnungen darüber.

**Tatsächlich:** Top-Margen sind Endgame-Gear-Crafts, z. B. `craft_godiron_staff` Input ~1020 →
Output-Wert **21.000** (Marge +19.980; theoretisch 2,3 Mio g/h), `craft_godiron_wand` +12.460,
`craft_voidhide_body` +10.130. Tief hinter L90-Skills + seltenen Mats gegated (kein Shop-Loop), also
**intendierte Progression** — aber die Wert-Kurve für Endgame-Gear (10 k–21 k) läuft der Input-Mat-Wert-
Kurve (1–3 k) weit davon. Konsequenz: Sobald freigeschaltet, ist Crafting→Vendor die dominante Gold/h-
Quelle (weit über bestem geared-Combat ~265 k/h). Für EA unkritisch (Endgame), aber als Inflations-
Signal notiert. **Owner:** balance-designer/Chef (Info).

---

## P3 — [balance] Lv1-`chicken` als Munitions-/Wert-Brunnen

**Tatsächlich:** `chicken` (Lv1) dropt `iron_arrow` **15–40 Stück @ 25 %** (index.ts:9560ff) — ~6,9
iron_arrows/Kill (value 3 each). Der geared-Held erntete daraus **~38.560 g/h Verkaufswert** am
allereinfachsten Mob (mehr Loot-Wert/h als an vielen höherstufigen Mobs). iron_arrow ist zudem im Shop
(6 g). Vermutlich als früher Ranged-Ammo-Nachschub gedacht, aber 15–40 Stück eines Mid-Tier-Pfeils vom
Lv1-Huhn ist großzügig. **Owner:** content-dev (Info/Review Drop-Menge).

---

## Info (kein Befund / gesund)

- **Info-1 — Shop-Kauf→Verkauf-Arbitrage: KEIN Exploit.** Über alle 70 Shop-Einträge: **0** Items mit
  `sellPrice > cost`, genau 1 Breakeven (`crude_arrow`: cost 1 = sellPrice 1, netto 0 → nicht
  ausbeutbar). Der `SELL_FRACTION=0.5` + `max(1,…)`-Floor erzeugt keine Kauf-Verkauf-Schleife. Sauber.
- **Info-2 — Dungeon-Keys nur noch Drops (Chef #8): sinnvoll.** Keys aus dem Shop zu nehmen entfernt eine
  Gold→Dungeon-Loot-Umwandlung; Dungeon-Zugang ist jetzt ein Gameplay-Gate (Key-Farm/Risiko), kein
  Gold-Shortcut. Aus Ökonomie-Sicht klar besser (verhindert „reich = überspringt Content").
- **Info-3 — Thieving-„keine Ausgabe-Items"-Flags sind False-Positives.** `pickpocket_city_guard`
  (gold 66–132) und `crack_strongbox` (gold 120–240) geben **Gold + seltene Item-Rolls**; im 2-min-Fenster
  fiel nur kein Item (6–12 % Chance). `findIssues` prüft nur Item-Outputs, nicht Gold → Heuristik-Artefakt,
  kein Reward-Bug.
- **Info-4 — Auto-Eat als Gold-Senke:** Untergerüstet-über-Tier zu kämpfen ist netto-negativ
  (z. B. Bronze vs. `goblin_warlock` Lv30: Einnahme ~6.860 g/h, Food-Kosten ~10.320 g/h → **−3.460 g/h**).
  Für geared-Helden ist Food trivial (~20 k g/h Kosten vs. 100 k–265 k g/h Einnahme). Sink wirkt wie
  vorgesehen: bestraft Over-Tiering, nicht normales Spiel.
- **Info-5 — Gold-Senken strukturell ok:** Inv-Slots 60→17.516 (kumuliert ~52 k für +30 Slots),
  Auto-Eat max 35 k (einmalig), Bank-Slot-Pakete 5.000×1.6^n bis Cap 200 (letztes Paket ≈37,8 Mio,
  Gesamt-Bank-Sink ~100 Mio g). Eskalierende Bank ist der einzige mit dem Reichtum mitwachsende Sink —
  gut fürs Endgame.

---

## Combat-Ökonomie-Referenz (gemessen, 3-min-Fenster, gold+Loot-Verkaufswert, ×food-Kosten)

```
GEARED (Combat L99, godiron, cooked_voidray):     NET/h
  chicken   Lv1    total 47.040   food -20.000  ->  +27.040
  boar      Lv10   total 65.620                 ->  +45.620
  warlock   Lv30   total 173.500                -> +153.500
  bramble   Lv60   total 285.000                -> +265.000
  gray_wolf Lv97   total 179.700                -> +159.700
BRONZE-BASELINE (Combat L5, cooked_trout):
  chicken   Lv1    +23.500     boar Lv10 +5.740     warlock Lv30 -3.460 (Food-Verlust)
  ab Lv45   0 Kills (untergerüstet, erwartbar)
```

## Kurz-Zusammenfassung
Die Wirtschaft ist grundsätzlich gesund: **kein Shop-Arbitrage-Exploit, keine Overflow-/Unendlich-
Gold-Bugs, strukturierte, eskalierende Gold-Senken, Dungeon-Keys-drops-only ist sinnvoll.** Ein echter
Fund: der **`enchant_dim_focus`-Loop** — ein Level-1, risikofreier, shop-gefütterter Gold-Drucker
(~14–17 k g/h) durch das fehlbepreiste `dim_focus` (value 120 vs. copper/bronze/iron 35/70/110) und ein
Rezept ohne Level-Gate. **Empfehlung: fix-then-ship** — `dim_focus`-value senken oder Rezept gaten
(content-dev, Chef-Freigabe), bevor EA raus geht; die P3-Punkte (forge_tower_compound-Marge, Endgame-
Gear-Inflation, chicken-Ammo-Menge) sind Review-/Info-Level.
```
