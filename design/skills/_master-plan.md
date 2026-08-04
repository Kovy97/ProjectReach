# Skill-Utility-Masterplan — Foraging · Farming · Herblore · Inscription

**Modell (Chef-bestätigt):** Foraging/Farming → Herblore/Inscription → Kampf-/Skilling-Power.
Jeder Output hat einen echten Konsum-Sink. Detailpläne: `foraging.md`, `farming.md`, `herblore.md`, `inscription.md`.

## Finaler Cross-Skill-Vertrag (verbindliche IDs — Konflikte aufgelöst)
Tiers: T1(1–20) · T2(21–40) · T3(41–60) · T4(61–80) · T5(81–99)

| Linie | IDs (T1→T5) | Quelle | Senke |
|---|---|---|---|
| **A Kräuter** | herb_marshroot · _bloodthistle · _gravemoss · _nightbloom · _godsbreath | Foraging (wild) + Farming (kultiviert, höherer Yield) | Herblore |
| **B Essenzen** | essence_ash · **essence_mire** · **essence_grave** · essence_void · essence_divine | Foraging | Herblore (sek.) + Inscription |
| **C Pigmente→Tinte** | pigment_umber(T1–2) · _verdant · _violet · _radiant | Farming + Foraging | Inscription |
| **D Schilf→Pergament** | reed_pale(T1–2) · reed_iron(T3–4) · reed_void(T5) | Farming (exklusiv) | Inscription |
| **E Pilze** | fungus_soot · _pale · _grave · _void · _god | Foraging | Herblore |

> **FIX:** Inscription-Plan nutzte abweichend `essence_gloom/storm/astral` (T2–4) → auf Vertrags-IDs **essence_mire/grave/void** vereinheitlichen (Foraging ist der Owner). Herblore/Inscription konsumieren exakt diese.

## Umfang (≈ neue Inhalte)
- **Foraging:** 20 Vertrags-Aktionen (B+E exklusiv, A wild, C anteilig) + Samen-Drops (→Farming) + 4 Flavor.
- **Farming:** kultivierte Kräuter (A), Pigmentpflanzen (C), Schilf (D), Cooking-Crops (Gemüse/Getreide-Lücke), Saat-Items; idle-freundlich (lange Dauer = Offline-Ertrag, **ohne Engine-Änderung**).
- **Herblore:** 23 Rezepte (6 Heil · 8 Kampf-Tonika+Capstone · 4 Antidot/Ward · 4 Skilling-Tonika). **Zonen-Gating** (Pflicht-Tränke gegen Gift-/Enrage-Gegner).
- **Inscription:** 2-stufig — Tinten/Pergament aus C+D → `sigil_*` schreiben → **Gear-Verzauberung (#63)** + Kampf-Schriftrollen. 3 Stile + Rüstung, Power-Parität zur RC-Enchant-Ladder.

## Engine-Abhängigkeiten (klein, vor/bei Umsetzung)
1. **Skilling-Buffs** (Herblore 4 Tonika + Inscription XP-Rolle): `EquipBonus` braucht ein `gatherXpMult`/`yieldMult`-Feld + buff-bewussten Skilling-Tick → **logic-dev**. Ohne das: **19/23 Herblore + Gear-Enchant-Inscription sofort umsetzbar**, Skilling-Buffs nachziehen.
2. **sim.ts Nicht-stapelbar-Heuristik:** `inscription_enchanting` wie `rune_enchanting` behandeln (verbraucht non-stackable Gear), sonst stallt der Sim → **logic-dev** (1 Zeile).
3. *(optional)* Offensive Sofortschaden-Schriftrolle braucht `combatConsumable`-Feld → **combat-dev**, später.
- Hinweis: `buff` schließt `healAmount` aus (useConsumable priorisiert Buff) → kein Item kombiniert Heal+Buff (reine Content-Disziplin).

## Umsetzungs-Reihenfolge (1 content-dev-Pass, da 1 Datei + 1 kleiner logic-dev-Pass)
1. **logic-dev:** `gatherXpMult` in EquipBonus + skilling-tick buff-aware; `inscription_enchanting` in sim-Heuristik. (SAVE_VERSION-Regel beachten falls State.)
2. **content-dev (in Abhängigkeitsreihenfolge):**
   a. Vertrags-**Items** anlegen (A–E, Saat, Tinten/Pergament, sigil_*, Basis-/Output-Gear) — exakte IDs.
   b. **Produzenten**: Foraging- + Farming-Aktionen.
   c. **Konsumenten**: Herblore-Brews + Inscription-Ketten.
   d. Legacy-Rezepte: Inputs auf Vertrags-IDs umstellen, alte Item-IDs als Alias behalten → **keine Save-Migration**.
   e. `pnpm test` + Sim: jede Aktion >0 XP/h, keine toten Item-Referenzen.

## Offene Chef-Entscheidungen
- **Thieving** in die Ketten einbinden (stärkere Utility) oder reiner Gold-Skill? *(aus dem Audit)*
- **Skilling-Tonika/XP-Rolle:** kleines Engine-Feature jetzt bauen (dann voll umsetzbar) oder diese ~5 Rezepte parken?
- **Legacy-Tränke/Glyphen:** belassen oder auf den neuen Vertrag migrieren?
- **Basis-Gear für Inscription-Enchants:** Tier-Basen wählen, die RC nicht schon verzaubert (Doppelung vermeiden) — Vorschlagsliste bei Umsetzung.
