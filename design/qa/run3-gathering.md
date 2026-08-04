# QA Run 3 — Gathering & Idle-Loop

> Playtest-Fokus: passiver/Idle-Loop. Mining, Woodcutting, Fishing, Foraging, Herblore-Versorgung,
> **Farming-Plots** (9 Plots / 28 Crops / Auto-Replant / Offline-Reife / Grau→Farbe-Wachstum / Catalogue).
> Methode: READ-ONLY Code-/Daten-Audit gegen `packages/content/src/index.ts`, `packages/engine/src/farming.ts`,
> `packages/engine/src/tick.ts`, `packages/shared/src/index.ts`, `apps/client/src/renderer/pages/FarmPage.tsx`.
> Validierung: `farming.test.ts` (13) + `mining.test.ts` (4) grün. Stand 2026-06-27.

## Fun-Score: **8 / 10**

Der Sammel-/Idle-Loop ist tief, sauber verdrahtet und idle-fair. Plots sind ein echtes
zweites passives Layer neben der aktiven Aktion (beide laufen offline). Abzug v.a. wegen
**8 von 28 Crops ohne Verarbeitungs-Senke** (reine Vendor-Crops) und einer schwachen
Seed-Versorgungs-Absicherung für 6 Forage-only-Crops.

---

## Stärken

- **Tiefe & Auswahl stimmt.** Lange, lückenarme Tier-Leitern: **16 Woodcutting-Tiers**
  (9 Basis + 7 Lückenfüller L5/15/25/38/63/78/92), **~19 Mining-Knoten** (Erz-Leiter copper→godiron
  + 7 gezielte Edelstein-Adern), **~11 Fishing-Tiers**, **8 Foraging-Zonen** + Feather-/Marshroot-Linien,
  **28 Crops** über 5 Tiers. Genug Ziele zum Hochgrinden.
- **Mining-Totzone ist gefixt.** `mine_gravesteel`@L22 füllt die alte Coal(L15)→Mithril(L35)-Lücke,
  `mine_bloodstone_seam`@L25, plus erfundene `voidstone`@L82 / `godgem`@L95-Adern am oberen Ende.
  Erz-Ladder jetzt durchgehend bespielbar.
- **Farming-Plot-System ist mechanisch rund.** Reift deterministisch gegen `state.elapsedMs`
  (anti-abuse, strikt monoton), `tickFarmPlots` läuft 1×/`advance` rein arithmetisch
  (`floor(elapsed/growMs)`), Offline werden mehrere Zyklen verlustfrei verrechnet, Rest-Fortschritt
  wird übernommen. Plots reifen **auch während des Kampfes** (echtes passives Layer).
- **Idle-Komfort top.** Auto-Replant ist CEO-Default AN; bei vollem Inventar parkt der Ertrag als
  `readyYield` auf dem Plot statt verloren zu gehen (`flushReadyYield` holt nach, sobald Platz frei wird).
  Saat darf aus **Inventar UND Lager** gezogen werden.
- **Offline ist fair.** `MAX_OFFLINE_MS = 24h`-Cap; dieselbe `advance`-Funktion treibt Live + Offline,
  d.h. offline laufen **aktive Aktion + alle 9 Plots gleichzeitig**. Großzügig, aber gedeckelt.
- **Polish.** Grau→Farbe-Wachstum sauber umgesetzt (graustufige Basis-Silhouette
  `grayscale(1) brightness(0.45)` + farbiger Layer per `clip-path: inset()` von unten enthüllt,
  0.3s-Transition). Crop-Catalogue zeigt Wachszeit, XP, Ertrag-Chip, **Saat-Quelle** (Shop/Forage/Drop)
  und **Senken-Skills** je Crop.
- **Senken existieren für die Mehrheit.** Crop-Outputs speisen Herblore (Tränke), Inscription
  (Pigmente→Glyphen), Fletching/Crafting (Reeds), Cooking & Leatherworking. 20/28 Crops haben
  mind. eine Verarbeitungs-Senke; Herb-Crops bis zu 8 Rezept-Referenzen.
- **Seed-Ökonomie meist self-sustaining.** 22/28 Saaten im Shop kaufbar zu Preisen unter dem
  Ernte-Verkaufswert (z.B. ashroot_seed 6g → 6–9 ashroot à 6g) → netto gold-positiv, idle-tragfähig.

---

## Findings

### [P2] 8 von 28 Crops haben KEINE Verarbeitungs-Senke (Vendor-Sackgassen)
`ashroot`, `grimwheat`, `mandrake_root`, `nightshade`, `gallows_apple`, `emberroot`,
`corpse_lily_bulb`, `godbloom` werden von **keinem** Rezept als `input` verbraucht — sie haben nur
einen Verkaufs-`value`. Besonders auffällig bei den teuren „Future ingredient"-Wirkenden
(mandrake_root 120g, gallows_apple 280g, corpse_lily_bulb 600g) → riecht nach „definiert, nie
angewandt". Für einen befriedigenden Loop sollte jeder gesammelte Output in die Verarbeitung münden.
**Fix:** Je 1–2 Rezepte ergänzen (mandrake_root/nightshade → Herblore-Gift/Trank, gallows_apple →
Cooking, corpse_lily_bulb/godbloom → High-Tier-Trank/Glyphe, ashroot/grimwheat → Cooking-Grundzutat).
Sonst bewusst als reine Gold-Crops kennzeichnen (siehe P3).

### [P2] godbloom: doppelt marginal (Forage-only-Seed @10% + keine Senke)
`godbloom_seed` ist **nicht im Shop**, droppt nur aus `forage_gravewood` @0.1 bei **Foraging L95**,
Wachszeit 160 min — und `godbloom` (T5-Spitzen-Crop) hat **keine Senke**. Die teuerste/letzte Crop
der Leiter ist damit kaum beschaffbar UND ohne Zweck außer Vendor (280g). Anti-Belohnung am Endgame-Cap.
**Fix:** godbloom in ein Endgame-Herblore/Inscription-Rezept hängen ODER godbloom_seed in den Shop
(hochpreisig) aufnehmen.

### [P2/P3] 6 Forage-only-Saaten ohne Shop-Fallback → potenzieller Soft-Stall
`bloodbeet_seed`, `nightshade_seed`, `ironvine_seed`, `emberroot_seed`, `wraithcap_seed`,
`godbloom_seed` sind nur über Foraging-Drops (8–18%) zu bekommen, nie im Shop. Da Farming ein
permanenter Seed-Sink ist (kein Seed-Return bei Ernte), kann ein Plot dieser Crops dauerhaft
brachliegen, wenn der Spieler nicht aktiv foragt. **Fix:** Entweder kleine Shop-Listung (teuer) als
Sicherheitsnetz, oder einen niedrigen Seed-Return-Wurf bei der Ernte (z.B. 5–10% Saat zurück) — passt
zum Idle-Genre und dämpft den Seed-Drain global.

### [P3] Catalogue blendet fehlende Senke unsichtbar aus (Discoverability)
In `FarmPage.tsx` wird die Senken-Zeile nur bei `sinks.length > 0` gerendert. Vendor-only-Crops zeigen
gar nichts → der Spieler kann „hat keine Senke" nicht von „Senke nur noch nicht entdeckt" unterscheiden.
**Fix:** Bei leeren Senken explizit `→ Verkauf (Gold)` / `→ vendor only` anzeigen.

### [P3] Mining-Ore-Ladder: 15-Level-Strecke L55→L70 ohne neues Erz
Nach `mine_runite`@L55 kommt das nächste Erz erst `mine_bloodiron`@L70 — dazwischen nur die
`mine_ruby_seam`@L55 (Edelstein). Kein „Totzone-Killer" wie bei L22, aber die längste Erz-Pause der
Leiter. **Fix (optional):** Ein Zwischenerz @~L62 erwägen, analog zur Woodcutting-Lückenfüller-Logik.

### [P3] Keine „Alle bepflanzen / Alle neu aussäen"-Komfortfunktion
Jeder leere Plot öffnet einen eigenen Crop-Picker; nach einem Seed-Out alle 9 Plots einzeln neu zu
bestücken sind 9 Interaktionen. Auto-Replant deckt den Normalfall, aber das Re-Seeding nach Leerlauf
ist zäh. **Fix:** „Diese Crop in alle leeren, freigeschalteten Plots"-Button im Picker.

---

## Verdict
Solider, tiefer, fair gedeckelter Idle-Loop mit gut ausgebautem passivem Farming-Layer. Kein P0/P1.
Hebel für den nächsten Punkt Richtung 9/10: **jede Crop in die Verarbeitung anbinden** (P2-Senken) und
die **Forage-only-Seed-Versorgung** absichern (Seed-Return oder Shop-Fallback).
