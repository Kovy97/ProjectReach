# Sweep 2 — Bericht 16: UI Shop & Bank

**Fokus:** `apps/client/src/renderer/pages/ShopPage.tsx`, `BankPage.tsx` — Kauf 2×2-Buttons (1/5/25/100),
Verkauf (Slot-Grid + Instanzen), Bank-Sortierung (neu), Kapazität/Slots-kaufen, Auto-Eat-Upgrade, Icons/Layout/i18n.
**Datum:** 2026-07-01 · **Verdikt:** SHIP (keine P0/P1 im Fokusbereich).

---

## Gate-Ergebnisse (headless)

| Gate | Ergebnis |
|------|----------|
| Client `typecheck` (turbo) | ✅ GRÜN (client-Task successful) |
| Client `build` | ✅ GRÜN (`✓ built in 9.14s`) |
| Engine `shop.test.ts` + `bank.test.ts` | ✅ 23/23 passed |
| Aggregat `pnpm typecheck` | ❌ ROT — **nur** durch fremde, transiente Sweep-Skripte (siehe Umgebungshinweis), NICHT Produktcode, NICHT Shop/Bank |

**Umgebungshinweis (kein Produktbug, kein Fix von mir):** `pnpm typecheck` schlägt fehl in
`packages/engine/src/midgame-dump.test.ts` und `packages/engine/src/zz-ranged-sweep.test.ts` — beide **heute
15:24/15:26 angelegt** (schreiben in den Scratchpad), also aktive temporäre Skripte anderer Sweep-Agenten.
Per Briefing-Regel „löscht es danach wieder" gehören sie ihren Autoren; ich habe sie nicht angefasst. Sollte
der Aggregat-Gate am Sweep-Ende noch rot sein, ist das ein Aufräum-Item für die jeweiligen Autoren, nicht für
Shop/Bank. Client-`typecheck` und -`build` sind davon unabhängig und grün.

---

## Findings

### [P3][balance · suspected] Verzauberte/gesuffixte Instanz-Items verkaufen zum BASISPREIS
- `packages/engine/src/shop.ts:91-98` — `sellInventoryInstance` nutzt `sellPrice(content, slot.itemId)`
  (= `item.value × 0.5`) und ignoriert den Affix-/Suffix-Wert der Instanz. Die Verkaufs-Detail-Meta in
  `ShopPage.tsx:230-234` zeigt ebenfalls nur den Basis-Stückpreis.
- **Erwartet vs. tatsächlich:** ein gerolltes/enchantetes Teil bringt gleich viel Gold wie ein Vanilla-Teil.
- Vermutlich akzeptiert (Instanzen sind für Salvage/Disenchant gedacht), aber Chef-Balance-Domäne → nur melden.
  **Owner:** Content-Dev/Combat-Dev (Wertmodell) via Chef.

### [P3][ux] Auto-Eat-Zeile nutzt 🍗-Emoji statt echtem Icon
- `i18n/translations.ts:499-500` (en) / `:1375-1376` (de): `shop.autoEatUpgrade` / `shop.autoEatMaxed`
  betten das Emoji 🍗 ein. Jede andere Shop-Zeile nutzt ein echtes PNG (`GoldIcon`/`BagIcon` via `getUiIcon`).
- Widerspricht MEMORY „UI größer + echte Icons" (Emojis → `getSidebarIcon/getSkillIcon`/`getUiIcon`).
  **Owner:** UI-Dev (+ Content-Dev für den String). Kosmetisch.

### [P3][ux] Bank-Spalte „Inventar": Leer-Slot-Zählung & Leer-Text ignorieren Instanz-Items
- `BankPage.tsx:61` `invEmptyCount = invCap − depositable.length`; `depositable` enthält nur fungible Slots.
  Liegen verzauberte/gesuffixte Items im Inventar, zeigt das Einlager-Raster **mehr freie Zellen** als das
  Inventar real frei hat.
- `BankPage.tsx:121-122`: enthält das Inventar **ausschließlich** Instanz-Items, erscheint „bank.invEmpty"
  („Dein Inventar ist leer."), obwohl Gear vorhanden ist.
- Bewusst (Instanzen sind nicht einlagerbar), aber leicht irreführend. **Owner:** UI-Dev. Niedrig.

### [P3][ux] Mengen-Kauf (5×/25×/100×) kauft bei Platzmangel still weniger als das Label
- `ShopPage.tsx:155-168`: der Button ist aktiv, sobald Platz für ≥1 besteht (`noSpace` blockt nur bei 0 freier
  Kapazität) und das Gold für die **volle** Menge reicht; `buyItem` (`shop.ts:60-69`) kauft dann partiell bis
  zum verfügbaren Platz. „100×" kann so z. B. 12 Stück liefern — ohne Rückmeldung.
- Kein Korrektheitsfehler (keine Überbuchung; Partial-Buy ist korrekt & NaN-geguardet), aber kein Toast/Hinweis.
  **Owner:** UI-Dev. Niedrig.

---

## Verifiziert OK (Fix-Pass hält)

- **Bank-Sortierung (neu):** `BankPage.tsx:46-51` treibt beide Spalten über geteiltes
  `compareItemsBy`/`ITEM_SORT_MODES`; „newest" behält Content-/Slot-Reihenfolge. Sinnig verdrahtet.
- **Kauf 2×2 (1/5/25/100):** `ShopPage.tsx:66,155-168` → `buyItem(state, content, itemId, entry.cost, q)`;
  Engine multipliziert Kosten pro Stück korrekt, `disabled` gegen Vollpreis+Platz.
- **Verkauf (Slot-Grid + Instanzen):** stapelbare Items aggregiert, Instanz-Items als Einzel-Stacks mit eigenem
  Pfad `sellInventoryInstance`. `itemCount`/`removeItem` überspringen Instanz-Slots
  (`inventory.ts:67,186`) → keine Phantom-Verkäufe/-Einlagerungen. NaN-Guards in `sellItem`/`depositItem`/`buyItem`.
- **Kapazität / Slots kaufen:** `buySlotUpgrade` (Inventar, eskalierend) + `buyBankSlots` (Paket
  `BANK_SLOT_PACKAGE=10`, eskalierend, Cap `MAX_BANK_SLOTS_PURCHASED=200`); `nextBankSlotCost` gibt `null` am
  Cap → UI zeigt korrekt Max-Labels (`bank.buySlotsMax`, `★`-Anzeige bei Auto-Eat max).
- **Auto-Eat-Upgrade ist echt verdrahtet (kein totes Feld):** Combat liest die Stufe → Schwelle
  (`combat.ts:80-81 autoEatThreshold`) und Heilmultiplikator (`:88 autoEatHealMult`); `shop.test.ts` deckt es ab.
  `healMult` ist auf allen Stufen 1.0 (bewusst — nur die Ess-Schwelle steigt; Hint-Text stimmt).
- **i18n-Parität:** alle `shop.*`/`bank.*`-Keys in en+de vorhanden, deutsche Werte mit echten Umlauten
  (ä/ö/ü/ß). Parität ist per `const de: Record<keyof typeof en, string>` **compile-erzwungen**.
- **Icons:** `getUiIcon("icon_goldcoin")`/`("icon_inventory")` mit Emoji-Fallback; alle neuen CSS-Klassen
  (`shop-item-buys`, `shop-buy-qty-*`, `shop-sell-grid/-cell/-detail`, `bank-grid`, `cs-sort-select`) existieren
  in `styles/pages.css`.
- **UI-Crash-Gate:** `ShopPage`/`BankPage` mounten ausschließlich innerhalb `MainLayout` (`App.tsx` Root-Switch;
  nur bei aktivem Spiel). Das am App-Root gemountete `ItemTooltipOverlay` nutzt `useGameStateMaybe()` (null-safe).
  Kein `useGameState()`-Throw vor Spielstart im Shop/Bank-Pfad.

---

## Kurz-Zusammenfassung

- **P0/P1:** keine.
- **P2:** keine.
- **P3:** 4 (1× balance-suspected Instanz-Verkaufspreis, 3× ux: Emoji-Icon, irreführende Bank-Leerzählung,
  stiller Partial-Kauf).

**Top-3 (alle P3):**
1. Instanz-Gear verkauft zum Basispreis (Chef-Balance-Frage) — `shop.ts:91-98`.
2. Bank-„Inventar"-Spalte über-zählt freie Slots / meldet „leer" trotz Instanz-Gear — `BankPage.tsx:61,121`.
3. Mengen-Kauf liefert bei Platzmangel still weniger als das Label — `ShopPage.tsx:155-168`.

**Empfehlung Fokusbereich Shop/Bank: SHIP.** Sauber verdrahtet, i18n-Parität, keine toten Felder, kein
Pre-Game-Crash. Der rote Aggregat-`typecheck` ist ein Fremd-Artefakt konkurrierender Sweep-Skripte, kein
Shop/Bank-Problem.
