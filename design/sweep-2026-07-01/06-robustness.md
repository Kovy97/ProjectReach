# Sweep 2026-07-01 — 06 Robustheit / Edge / Crash-Hunt

**Tester:** Kontrolleur (QA)
**Fokus:** Invarianten-Angriff — illegale/unmögliche Aktionen in schneller Folge, Inventar/Bank an die Caps (Overflow/Duplikation), Ausrüsten/Ablegen kaputter/leerer Slots, Verkaufen ohne Besitz, Save→Serialize→Deserialize-Roundtrips über diverse States, NaN/negative Werte, leerer Köcher im Kampf, SAVE_VERSION-44-Migration (`activePlayMs`).
**Methode:** Headless Vitest gegen die echte Engine + Persistenz. Neues adversariales Test-Skript `packages/persistence/src/robustness-sweep.test.ts` (12 Probes, **alle grün**) + Baseline `persona-sweep` (button_masher/hoarder/afk_returner) + Persistenz-Suite (82 Tests) + Balance-Sim gelesen. Keine Electron-, keine Render-Prüfung.

## Verdikt: **ship** (Robustheit). 0× P0/P1/P2. Ein einziger P3-Härtungshinweis (nicht live erreichbar).

Die Engine ist gegen die attackierten Invarianten außergewöhnlich robust: nichts crasht, nichts dupliziert, nichts überschreitet die Caps, kein `deserialize` wirft, kein persistiertes NaN. Alle in früheren Sweeps gemeldeten Muster (Ammo-Dupe, Bank-Overflow, NaN-Save, Slot-Spoofing) sind bereits gehärtet und über Guard-Tests abgesichert. Mein Skript findet **keinen** neuen Live-Bug — nur eine latente, aktuell unerreichbare Defensiv-Lücke.

---

## Findings

### P3 — Roh-Primitive guarden `qty<=0`, aber NICHT `Number.isFinite` (NaN-Argument vergiftet transient)
- **Kategorie:** Defensive Härtung / Konsistenz (nicht live erreichbar)
- **Was:** Die exportierten Low-Level-Primitive lehnen 0/negativ/Infinity korrekt ab, prüfen aber `qty`/`cost`/`dt` NICHT auf `NaN`. Ein `NaN`-Argument schlüpft durch den `<= 0`-Guard (`NaN <= 0` ist `false`) und schreibt transient `NaN` in den State:
  - `addItem(inv, content, id, NaN)` → Slot-`qty = NaN` — `inventory.ts:106` (`if (qty <= 0) return 0`)
  - `sellItem(state, content, id, NaN)` → `character.gold = NaN` — `shop.ts:71-79` (via `removeItem` `NaN` → `addGold(NaN)`)
  - `depositItem(state, id, NaN)` → `bank[id] = NaN` — `bank.ts:53-62`
  - `buyItem(state, content, id, NaN, …)` → `gold = NaN`, `stats.goldSpent = NaN` — `shop.ts:63`
  - `advance(state, content, NaN)` → `accumulatorMs = NaN` (danach `accumulatorMs >= TICK_MS` immer `false` → **Tick-Loop friert bis Reload ein**) — `tick.ts:306`
- **Repro (Test):** `robustness-sweep.test.ts` Probe **B2** — `advance(NaN); buyItem(…,NaN,2); addItem(…,NaN)` → `findNonFinite` = `["accumulatorMs=NaN","character.gold=NaN","inventory.slots.0.qty=NaN","stats.goldSpent=NaN"]`. Kein Crash.
- **Erreichbarkeit heute: KEINE.** Alle Live-Aufrufer speisen endliche Werte:
  - UI-Mengen sind abgeleitete Counts/Fixbuttons, kein Freitext: `BankPage.tsx` (`1`, `itemCount(...)`, `state.bank[id] ?? 0`), `ShopPage.tsx` (`entry.cost`, Fix-`q`, `Math.min(b.n, itemCount(...))`). Kein `parseInt/Number(...)` auf Mengen im Client.
  - Der Game-Loop deckelt `dt = Math.min(now - last, MAX_OFFLINE_MS)` → immer endlich (`GameContext.tsx:192`). `performance.now()` ist monoton.
  - Der `SimPlayer.advanceTime`-Wrapper guardet bereits (`if (!Number.isFinite(ms) || ms <= 0) return 0`, `sim-player.ts:186`) — der Roh-Export `advance` nicht. Genau diese Inkonsistenz ist der Kern des Befunds.
- **Sicherheitsnetz greift:** Ein Save→Load härtet jeden `NaN` wieder auf endlich (`NaN` → JSON `null` → `clampFinite`/`finiteNonNeg` in `persistence/src/index.ts:51-59, 130, 210, 234, 295, 302`). Probes **A1/A2/A3/B2** verifizieren: nach `roundtrip()` ist `findNonFinite` überall `[]` und die Invarianten halten.
- **Warum trotzdem melden:** (1) `advance(NaN)` würde den Live-Tick einfrieren (kein Auto-Heilen ohne Reload). (2) Das Netz heilt `gold` auf **0** — wäre je ein Freitext-Mengenfeld in der UI (Item-Builder / „N verkaufen"-Input aus der Roadmap), würde stiller **Gold-Verlust** real erreichbar → dann **P2**.
- **Fix (klein, logic-dev):** In den fünf Primitiven `if (!Number.isFinite(qty)) return 0;` bzw. in `advance` `if (!Number.isFinite(dtMs) || dtMs <= 0) return 0;` — spiegelt exakt den bereits vorhandenen `SimPlayer.advanceTime`-Guard.
- **Owner:** **Logic-Dev** (`packages/engine/src/inventory.ts:106`, `shop.ts:50-79`, `bank.ts:53-62`, `tick.ts:299-306`)

---

## Grün bestätigt (harte Asserts, alle bestanden)

| Angriff | Probe | Ergebnis |
| --- | --- | --- |
| Illegale ENDLICHE Ops (equip unbekannt/nicht-besessen, unequip leerer/Doppel-Slot, buy ohne Gold, sell/withdraw nicht besessen, deposit/remove negativ, startCombat/setAction unbekannt, advance neg/0) | B1 | Kein Crash, State bleibt **perfekt invariant**, Roundtrip sauber |
| Inventar + Bank bis Cap füllen; Overflow einer neuen Art | C1 | `addItem`→0, `depositItem`→0; `used ≤ cap`, `bankUsed ≤ bankCap`; nie überschritten |
| Leerer Köcher im Kampf (Ranged-Waffe, `ammoCount=0`) | D1 | `advance(30s)` crasht nicht; Kampf stoppt sauber (`monsterId=null`, `stopReason=outOfAmmo`), HP intakt |
| Köcher-Sortenwechsel bei **vollem** Inventar (Dupe/Vernichtung?) | D2 | Erhaltungssatz hält: A 500→500, B 200→200, keine Dupe, sauberer Roll-back |
| Save-Roundtrip-Fuzz über 6 diverse States (fresh melee/ranged/magic, 8h-Gather, Mid-Combat+DoT, volles Inventar+AutoBank) | E1 | Kein NaN, Invarianten halten, **idempotent** (2. Roundtrip byte-gleich) |
| `activePlayMs`-Migration v43→v44 (fehlend) | F1 | best-effort = `elapsedMs`, endlich, `≤ elapsedMs` |
| v43 mit kaputtem `elapsedMs` (NaN/neg/9e18/Infinity) | F2 | `activePlayMs` endlich & ≥0, `elapsedMs` endlich |
| v44 mit manipuliertem `activePlayMs` (NaN→JSON null→best-effort; negativ→0) | F3 | endlich, korrekt gehärtet |

Zusätzlich Baseline weiter grün: `persona-sweep` (button_masher: 18 unmögliche Aktionen, kein Crash, State konsistent; hoarder: Caps OK; afk_returner 8h: `big==small=true`, finite) und die 82 Persistenz-Tests (inkl. NaN/Slot-Spoofing/Instanz-Roundtrip/Grandfather-Migrationen).

---

## Beobachtungen (nicht Robustheit — zur Info an CEO/andere Devs)

- **Balance-Sim (`sim.test.ts`) — ECHTE WALLS: `(0)`.** Ein voll ausgerüsteter Endgame-Held (Kampf L99 + Götzeneisen) besiegt die gesamte Bestie → Progression ist end-to-end abschließbar. Kein P1-Wall.
- **9× AUFFÄLLIGKEITEN (Bronze-Baseline)** — Balance-Domäne, kein Crash/Wiring-Bug:
  - 7 Mobs „zu tanky für ihr Level, 0 Tode" für einen Bronze-Held, obwohl unter dem L44-Ceiling (`goblin_warlock` Lv30, `bull_boss` Lv15, `dust_vulture` Lv34, `mire_crawler` Lv38, `pitch_beetle` Lv42, `bone_stalker` Lv34, `ashfield_wraith` Lv38). → **Balance-Designer** prüfen, ob gewollt (Bosse) oder Tuning nötig.
  - 2 Thieving-Aktionen „keine Ausgabe-Items" (`pickpocket_city_guard`, `crack_strongbox`) — **kein Dead-Content**: verifiziert, beide zahlen Gold (`crack_strongbox: gold {120..240}`, xp 25) + Low-Chance-Loot. Heuristik-Artefakt des Sims. Keine Aktion bei 0 XP/h.
- **Transientes Fremd-Artefakt:** Während meines Engine-Suite-Laufs schlug `packages/engine/src/zzz_qa_idle.test.ts:91` fehl — die Datei stammt von einem **parallel laufenden Schwester-Agenten** und war beim erneuten Prüfen bereits gelöscht (existiert nicht mehr). **Nicht mein Artefakt, kein Produkt-Bug.** Ohne diese Datei sind alle 82 Engine-Testdateien / 495 Tests grün.

---

## Gates (Robustheits-relevant)

- ✅ **typecheck** `@hearthforge/persistence` (inkl. neues Skript) — clean
- ✅ **tests** `@hearthforge/persistence` — 82 passed (davon 12 neue Robustheits-Probes)
- ✅ **tests** `@hearthforge/engine` — 495 passed (der einzige „failed" war die o.g. vanishing Schwester-Datei)
- ✅ **Balance-Sim** — `ECHTE WALLS (0)`; die 9 Bronze-Baseline-Notes sind Balance, nicht Robustheit
- ➖ **client build** — nicht ausgeführt: mein Change ist nur ein Test in `persistence` (nicht im Client-Bundle) → build unberührt; UI-Gate deckt Sweep `08-ui-audit` ab.

## Empfehlung
**Ship** aus Robustheitssicht. Einziger Nachzügler ist der P3-`Number.isFinite`-Guard an den Roh-Primitiven — kein Blocker, aber **vor** dem Ausliefern eines Freitext-Mengenfelds (Item-Builder / „N verkaufen") umsetzen, sonst wird Gold-Verlust real erreichbar. Owner: Logic-Dev.
