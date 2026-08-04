# QA Run 5 — Frühes Spiel (Level 1–15, Neuer-Spieler-Erfahrung)

**Datum:** 2026-06-28 · **Rolle:** Playtester-Analyst (Spieler-Sicht, READ-ONLY — kein Spiel-Code/Content geändert)
**Scope:** Erste Stunde / L1–15. Onboarding, Starterkit, Köcher + **craftbarer Pfeil-Nachschub (run4-P1 — behoben?)**, Start-Nahrung/Auto-Eat, Farming-Intro, drei Startstile, Discoverability, **erster Suffix-Drop als „Wow"**.
**Vergleichsbasis:** `design/qa/run4-early-l1-15.md` (Score 7.5).

**Methode:** Temporäres Sim-Harness gebaut (`createGame` mit echtem Renderer-Pfad `startingStyle` + `starterKit:true`, dann `startCombat`/`combatStep`, deterministische Seeds 42/99/123), echte Zahlen gemessen, **Harness danach wieder entfernt** (`packages/engine/src/_run5_early_mine.test.ts`). Drop-Messung mit `expandBaseCapacity`, damit Inventar-Overflow die Drop-Rate nicht verfälscht. Zahlen unten sind gemessen, nicht geschätzt.

**Quellen (im Code/Daten verifiziert):**
- `packages/engine/src/state.ts` — Köcher-Start 81–84 (**weiterhin 60 Pfeile**), Starterkit 95–101 (**nur Nahrung, keine Saat**); `character.ts:89` (Start-Gold = **0**).
- `packages/content/src/index.ts` — crude_arrow 278–286 (ammoDamage 1), **`fletch_crude_arrows` 5978–5991 (NEU: 5×arrow_shaft + 1×feather → 15 crude_arrow, fletching L1, gold-frei)**, `fletch_shafts` 5966–5975 (1×normal_log → 15×arrow_shaft, L1), `forage_feathers` 5355–5366 (foraging **L5**), goblin-Loot 7716–7721 (**feather 0.40 / 1–2**, leather_helm 0.04), Shop crude_arrow @1 Gold (8860).
- Suffix-System: `shared/src/index.ts` `DEFAULT_CRAFT_SUFFIX_CHANCE = 0.2` (1116), `DEFAULT_DROP_SUFFIX_CHANCE = 0.08` (1124); `engine/src/suffix.ts` (rollSuffix/suffixPool, lck-Mod +0.0015·lck cap +0.15, Gesamt-Cap 0.95); Apply-Hooks `combat.ts:416–418` (Drop) + `tick.ts:134–137` (Craft); Pool `content/src/index.ts` 12060+ (minIlvl-1-Suffixe für alle 3 Stile).
- `apps/client/src/renderer/components/Onboarding.tsx:13` — **weiterhin 7 Schritte** (welcome/gather/process/equip/fight/economy/idle), **kein** Köcher-/Farming-/Suffix-Schritt.

---

## Fun-Score: **8.0 / 10**  (Δ +0.5 vs run4)

Run 5 räumt den **systemischen run4-P1-Befund** (Fernkampf-Starter ökonomisch tot: kein craftbarer Pfeil, Shop-only-Restock, netto-negative Pfeil-Bilanz) substanziell ab. Es gibt jetzt eine **gold-freie, netto stark positive, renewable Pfeil-Quelle**: `fletch_crude_arrows` (Fletching L1) braucht nur `arrow_shaft` (aus normal_log, Holzfällen L1) + `feather` — und **Federn droppt der allererste Mob** (goblin L1, 40 %). Gemessen liefert das ~**4× Überschuss** (10,9 craftbare Pfeile pro Kill verdient vs. 2,73 verschossen). Damit ist die Munitions-Ökonomie repariert. Zusätzlich bringt das neue **Suffix-System einen echten Craft-Moment** („Bronzeschwert **des Bären**" ~1 alle 5 Crafts).

Kein höherer Score, weil drei Frühspiel-Bremsen bleiben: (1) der Köcher startet weiter mit **60 Pfeilen** und stoppt nach **155 s hart** — und man kann im Idle **nicht gleichzeitig kämpfen und fletchen**, der renewable Loop verlangt also weiter eine Kampf-Unterbrechung; (2) der **Suffix-Drop ist im Frühspiel praktisch unsichtbar** (~1 pro **375** Goblin-Kills) und ohne UI-/Onboarding-Signal; (3) das **Onboarding schweigt** zu Köcher, Farming und Suffix, und der **erste Farm-Besuch ist weiter eine Sackgasse** (0 Saat, 0 Gold).

---

## Δ vs run4 — alle gemeldeten Findings nachgeprüft

| run4-Finding | Status run5 | Beleg |
|---|---|---|
| **[P1] Fernkampf trocken nach 2,5 min · kein craftbares crude_arrow · idle-feindlicher Restock · netto-negative Pfeil-Ökonomie** | 🟢 **GRÖSSTENTEILS BEHOBEN** (Ökonomie-Teil) → Rest **P2** | `fletch_crude_arrows` (index.ts:5978) macht crude_arrow gold-frei craftbar; goblin droppt feather (7719, 0.40); gemessen netto **+4× Pfeile/Kill**. **Residual:** Köcher weiter 60 (state.ts:83), harter Stopp nach 155 s (`endCombatOutOfAmmo`, combat.ts:778), Fletchen unterbricht Kampf. |
| **[P2] Erster Farm-Besuch leer — keine Start-Saat, 0 Gold** | 🔴 **UNVERÄNDERT OFFEN** | Starterkit gibt weiter nur Nahrung (state.ts:95–101, gemessen graywort_seed = 0); Start-Gold = 0 (character.ts:89). |
| **[P3] Onboarding ohne Köcher-/Farming-Schritt** | 🔴 **OFFEN** (jetzt auch ohne Suffix) | Onboarding.tsx:13 weiter 7 Schritte; kein Munition-, Farming- oder Suffix-Hinweis. |
| **[P3] Köcher-Paperdoll ohne Mengenanzeige** | ⚪ **nicht erneut geprüft** | Statzeile/Combat-Display zeigten run4 bereits korrekt; Paperdoll-Politur unverändert relevant. |
| **NEU [P2] Suffix-„Wow" über Drops im Frühspiel unsichtbar** | 🆕 | Drop 8 % nur auf Equipment-Drops; goblin droppt nur leather_helm @4 % → gemessen **1 Suffix pro ~375 Kills**. |

---

## Gemessene Startwerte (Seed 42, echter Renderer-Pfad `starterKit:true`)

| Stil | Mainhand | Munition/Mana | Nahrung | Gold | Saat |
|---|---|---|---|---|---|
| melee | rusty_sword | — | cooked_shrimp ×10 | 0 | **0** |
| ranged | cracked_bow | **crude_arrow ×60 im Köcher** | cooked_shrimp ×10 | 0 | **0** |
| magic | cracked_staff | maxMana, manaCost 5 | cooked_shrimp ×10 | 0 | **0** |

Alle drei Stile ab Sekunde 1 spielbar (run4-Parität bestätigt). Auto-Eat Stufe 0 (50 %, Kosten 0) greift sofort, da `character.food` vorbelegt. Saat-/Gold-Lücke unverändert.

---

## Parität — Dauerkampf vs Goblin (L1), `starterKit`, **ohne** manuellen Restock (30-min-Fenster, Seed 42)

| Stil | Kills | Tode | Limit |
|---|---|---|---|
| melee | **201** | 3 | läuft volle 30 min |
| **ranged** | **22** | 0 | **HARTER STOPP @ 155 s** (60 Pfeile leer, `endCombatOutOfAmmo`) |
| magic | **479** | 1 | läuft volle 30 min |

Identisches Bild wie run4: Munition ist im Fernkampf der **einzige** Limiter, sonst kein Wall, keine Todesfalle. Die wenigen Tode (melee 3 / magic 1) entstehen erst, wenn der **dünne 10-Stück-Nahrungspuffer** unter Dauerkampf leerläuft; der Tod-Auto-Neustart fängt sie ab (kein harter Stopp). Magie räumt frühe Mobs am schnellsten (Burn + faktisch mana-positiv), melee solide, ranged von den 155-s-Fenstern gedeckelt.

### Fernkampf-Ökonomie im 60-Pfeil-Fenster (Seed 42, gemessen)
- Fenster: **155,3 s**, 22 Kills, **+53 Gold**, **16 Federn** gesammelt (0,727 Federn/Kill), 2,73 Pfeile/Kill verschossen.
- Selbstversorgung: 0,727 Federn/Kill × 15 Pfeile/Feder = **~10,9 craftbare Pfeile pro Kill verdient** vs. 2,73 verschossen → **~4× Überschuss**. Der renewable, gold-freie Loop, den run4 verlangt hat, **existiert und ist klar positiv**.
- Aber: man muss dafür den Kampf verlassen (Holzfällen → `fletch_shafts` → `fletch_crude_arrows`), weil immer nur **eine** Aktion aktiv ist. Die Ökonomie ist gelöst, die **Idle-Kontinuität nicht**.

### Suffix als „Wow" (gemessen)
- **Craft:** 20,4 % (2000 Rolls) → **~1 Suffix pro 4,9 Crafts**. Ein L1–15-Spieler, der Bronze-/Lederteile schmiedet/gerbt, trifft den ersten Suffix binnen weniger Crafts → **echter, früher Craft-Moment**. ✅
- **Drop:** goblin droppt als einziges Equipment leather_helm @4 %; 3000 Kills → 103 Helme + **8 Suffix-Instanzen** = **~1 Suffix-Drop pro ~375 Kills**. Im Frühspiel **faktisch unsichtbar**. 🔴
- **Pool:** an ilvl 1 vorhanden für alle Stile (melee/Leder/Schild 5, ranged 4). Numerisch ist ein ilvl-1-Suffix aber winzig (z. B. attrPerIlvl str 0.5 × 1) — der Reiz ist der **Name**, nicht die Zahl.

---

## Priorisierte Findings

### [P2 Balance/Idle] Fernkampf-Köcher stoppt nach 155 s hart — renewable Quelle existiert, aber nicht *während* des Kampfes  *(run4-P1, von P1 → P2 herabgestuft)*
Der ökonomische Kern von run4-P1 ist gelöst: crude_arrow ist gold-frei craftbar (`fletch_crude_arrows`, L1) und die Inputs sind ab L1 erreichbar (normal_log → arrow_shaft; feather droppt vom Erstmob, gemessen 0,727/Kill, ~4× Überschuss). **Aber** der Köcher startet weiter mit nur 60 Pfeilen (state.ts:83) und `endCombatOutOfAmmo` beendet den Kampf nach **155 s komplett** (combat.ts:778) — und da Idle nur **eine** Aktion fährt, muss der Fernkämpfer den Kampf verlassen, um nachzuschnitzen. Melee/Magie laufen im selben Fenster unbegrenzt. Für ein Idle-Spiel bleibt das die spürbarste Frühspiel-Asymmetrie.
**Fix-Optionen (balance/content + logic):** (a) Start-Köcher deutlich größer als Idle-Polster (z. B. 250–500); **und/oder** (b) **passives Pfeil-Bergen** (OSRS-Stil: Chance, verschossene Pfeile aus dem Kill zurückzubekommen) — damit der gemessene 4×-Feder-Überschuss den Köcher *im Kampf* nachfüllt statt per Fletch-Umweg. Eine der beiden schließt die Idle-Lücke vollständig.

### [P2 Discoverability] Suffix-„Wow" kommt im Frühspiel nur über Crafting an, nie über Drops — und ohne UI-Signal  *(NEU)*
Das Suffix-System ist ein Marquee-Feature, aber für L1–15 nur über den **Craft-Pfad** sichtbar (~1/5 Crafts). Über **Drops** ist es praktisch unsichtbar (~1 pro **375** Goblin-Kills, weil frühe Mobs kaum Equipment droppen). Dazu fehlt jedes Erst-Kontakt-Signal: kein Onboarding-Schritt, (vermutlich) kein eigener Toast/Highlight „Neu: … **des Bären**". Der erste Suffix kann unbemerkt im Inventar landen.
**Fix (klein–mittel, content/ui):** (a) erstes gesuchtes Equipment-Drop früh mit garantiertem/erhöhtem Suffix versehen **oder** frühe Equipment-Drop-Raten leicht anheben, damit der Drop-„Wow" im Frühspiel überhaupt auftritt; (b) Suffix-Items im Inventar/als Toast hervorheben („Neu erbeutet: Bronzeschwert des Bären!"). (Engine/Mechanik ist korrekt — rein Tuning + UI.)

### [P2 UX/Content] Erster Farm-Besuch weiterhin leer — keine Start-Saat, 0 Gold  *(run4-P2, unverändert)*
`starterKit` gibt nach wie vor nur Nahrung (state.ts:95–101, gemessen 0 Saat), Start-Gold 0 (character.ts:89). graywort ist pflanzbar und im Shop, aber ohne Saat/Gold zeigt der erste Farm-Besuch 3 freie Plots und im Picker überall „Keine Saat". Erste Saat nur per Forage-Roll. Gleiches „Werkzeug ohne Verbrauchsmaterial"-Muster wie früher beim Köcher.
**Fix (klein, logic/content):** dem Starterkit eine Mini-Saat mitgeben (z. B. 3× graywort_seed) — derselbe „direkt loslegen"-Effekt wie Nahrung/Köcher.

### [P3 Onboarding] Onboarding-Modal deckt Köcher/Munition, Farming und Suffix nicht ab  *(run4-P3-Carry-over, erweitert)*
7 Schritte (Onboarding.tsx:13), keiner zu Munition/Köcher-Nachschub, keiner zu Farming-Plots, keiner zum neuen Suffix-System. Der Fernkämpfer erfährt nur per In-Combat-Toast, dass Pfeile verbraucht werden — nicht, dass er sie ab L1 selbst schnitzen kann. Großer Tutorial-Flow ist laut Memory finaler Meilenstein; ein Köcher-Slot-Tooltip („Pfeile aus normal_log + Federn fletchen") + ein Farming-Hinweis + ein Einzeiler zu Suffix-Rolls wären die billige Zwischenlösung.

### [P3 Politur] Dünner 10-Stück-Nahrungspuffer
Unter Dauerkampf gegen Goblin reicht der 10er-Shrimp-Stack nicht über die ganze Sitzung (gemessen 1–3 Tode pro 30 min nach Leerlaufen; vom Tod-Auto-Neustart abgefangen, kein harter Stopp). Nicht blockierend, aber ein etwas größerer Start-Stack oder ein früh erreichbarer Nachschub-Hinweis würde den ersten langen AFK-Lauf sauberer machen.

---

## Was fehlt für 9,5? (konkret, umsetzbar)

1. **Fernkampf idle-tauglich machen, ohne den Kampf zu verlassen.** Start-Köcher auf 250–500 **oder** passives Pfeil-Bergen (Chance, verschossene Pfeile aus dem Kill zurückzuholen). Die renewable Quelle existiert (~4× Überschuss) — sie muss nur den Köcher *im Kampf* füllen statt per Fletch-Umweg. (combat/content/logic)
2. **Den Suffix-Drop im Frühspiel sichtbar machen.** Ein garantierter/erhöhter Suffix auf ein frühes Schlüssel-Drop **plus** ein Inventar-Highlight/Toast „Neu: … des Bären". Heute: ~1/375 Kills + kein Signal → der „Wow" verpufft. (content/ui)
3. **Starterkit gegen Sackgassen abdichten:** 3× graywort_seed (+ optional ein kleiner Gold-Betrag) → erster Farm-Besuch ist sofort spielbar. (logic/content)
4. **Drei leichte In-Kontext-Hilfen** (kein großer Tutorial-Flow): Köcher-/Munition-Tooltip, Farming-Plot-Hinweis, Suffix-Einzeiler im Onboarding. (ui)
5. **Nahrungspuffer leicht erhöhen** (z. B. 20 statt 10) oder früh sichtbarer Nachschub-Pfad — glättet den ersten langen AFK-Lauf. (content)

Punkte 1–3 heben den Frühspiel-Score am stärksten; 4–5 sind Politur. Combat-FX/Juice und der große geführte Tutorial-Flow bleiben laut Memory bewusst spätere Meilensteine und sind hier **nicht** bewertet.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Tutorial-Flow, Sidebar-Design-Rollout** — laut Memory spätere Meilensteine, nicht bewertet.
- **Balance L1–15:** kein Wall, keine Todesfalle. Alle drei Stile räumen den Erstmob sauber; einziger Limiter ist die Fernkampf-Munition (P2). Magie hat die höchste Frühspiel-Throughput, melee solide.
- **Suffix-/Köcher-/Auto-Eat-/Farming-Engine** mechanisch korrekt (Tests vorhanden, im Sim bestätigt). Die Findings betreffen Balance/Starterkit/Discoverability/Onboarding, nicht die Mechanik.
- **Fremde Sweep-Dateien:** `packages/engine/src/_run5_harness.test.ts` (Mid-Game-Parität, nutzt das echte Helfermodul `sim.ts`) liegt von einem parallelen Run-5-Agenten herum — **nicht von mir, bewusst unangetastet gelassen**. Mein eigenes Harness (`_run5_early_mine.test.ts`) wurde nach dem Lauf wieder entfernt. `sim.ts` ist regulärer, committeter Code (kein Temp).
