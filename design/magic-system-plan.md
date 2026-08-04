# Magie-System-Redesign — grobe Übersicht

Status: PLANUNG (high-level). Finetuning durch Chef. Querverweise: Tier-Plan (Waffen-Tiers), Runen-Plan (Verzauberung/Herstellung) — von anderen Agenten.

## TL;DR / Kern-Empfehlung
Das Chef-Konzept ist **größtenteils schon im Engine-Code vorhanden** — es muss nicht neu gebaut, sondern **formalisiert, sichtbar gemacht und balanciert** werden:
- Magie-Waffen tragen bereits `weaponEffect` (burn/frost/shock) → Status beim Cast. ✅
- Cast kostet Mana (`MANA_PER_CAST=6`); kein Mana → `MAGIC_WEAK_FACTOR=0.35` schwacher Schlag. ✅ (= der „Nahkampf mit dem Stab"-Fallback, nur noch nicht so benannt/getunt)
- Mana-Pool + Regen (`maxMana`, `manaRegen`) in `computeStats`. ✅
- Mana-Schild als Defensiv-Nutzung. ✅

**Empfehlung:** Konzept annehmen. Arbeit = (1) Spell pro Waffe sauber als Datenmodell, (2) Mana-Ökonomie so tunen, dass der Cast→Leer→Bash→Regen-Loop spürbar ist, (3) Element→Status-Matrix vereinheitlichen, (4) magic_off/def-Rollen schärfen. Kein neues GameState-Feld zwingend nötig → ggf. **kein SAVE_VERSION-Bump** (nur falls wir per-Cast-Spell-Daten in den State packen, was nicht nötig ist — Spell lebt im Content).

---

## 1) Mana-Modell

| Aspekt | Heute | Redesign-Richtung |
|---|---|---|
| Pool | `maxMana = 10 + INT*5 + WIS*2` | beibehalten; INT = Hauptfahrer, WIS = Reserve/Regen |
| Regen | `manaRegen = (1 + WIS*0.3) * petMult` Mana/s | beibehalten; ggf. kleiner Flat-Beitrag aus Gear/magic_off-Level |
| Treiber | INT + WIS (+ Pet manaRegen) | + Gear (`bonus.maxMana`/neuer `bonus.manaRegen`-Pfad), + Runen/Verzauberung (Querverweis) |
| Verbrauch | flat `MANA_PER_CAST` je Cast | **pro Spell** (stärkere Elemente/Tiers kosten mehr) statt global flat |

Kernidee: Mana ist **endlich & idle-fair** (kein Unsterblichkeits-/Infinite-DPS-Exploit). Pool klein, Regen langsam → bewusster Rhythmus statt Dauerfeuer.

## 2) Magie-Waffe-mit-Zauber-Modell

- Jede Magie-Waffe (mainhand-Stab/Rute) = **eingebauter Spell**. Datenmodell-Erweiterung am Item:
  - `spell?: { element, manaCost, weaponEffect }` ODER bestehendes `weaponEffect` + `manaCost` am Item nutzen (minimal-invasiv, **bevorzugt**).
- Cast-Resolution (existiert, nur erweitern):
  1. Genug Mana? → Mana abziehen, **vollen Magieschaden** + Element-Status anwenden.
  2. Nicht genug? → **schwacher physischer Stab-Schlag** (`MAGIC_WEAK_FACTOR`), **kein** Status, **kein** Mana-Verbrauch.
- Offhand-Foki bleiben reine Stat-Sticks (kein eigener Spell) — geben magicDamage/maxMana.
- Spell-Stärke skaliert über **Waffen-Tier** (Querverweis Tier-Plan) und optional **Runen** (Querverweis Runen-Plan).

## 3) Der Loop: Cast → Mana leer → Nahkampf → Regen

```
[voll]  Cast (−manaCost) → Cast → Cast ...
          ↓ Mana < manaCost
[leer]  schwacher Stab-Schlag (×0.35, kein Status, 0 Mana)  ← regeneriert nebenher
          ↓ Mana ≥ manaCost
[zurück] Cast ...
```

Balance-Stellschrauben (Chef-Finetuning), damit sich der Loop **gut anfühlt**:
- **Casts-pro-Pool** = `maxMana / manaCost` → Ziel-Burst ~3–6 Casts am Stück (nicht 1, nicht endlos).
- **Regen-Erholzeit** = `manaCost / manaRegen` Sekunden pro Cast → Bash-Phase soll **kurz & spürbar** sein (~2–4 Schläge), nicht zäh.
- Faustregel: `manaRegen` deckt **nicht** die volle Cast-Rate (sonst nie leer = kein Loop), aber genug, dass die Leer-Phase nicht frustriert.
- Mana-on-Hit-Pet (`manaOnHit`) gibt es schon → verkürzt Leer-Phase, gutes Build-Ziel.

## 4) Element → Status-Mapping

Nutzt vorhandene `StatusType` (`burn|frost|shock|poison|bleed`); Magie nutzt die magischen 3:

| Element | Status | Effekt (vorhanden) | Rolle |
|---|---|---|---|
| Feuer | `burn` | DoT (ignoriert Rüstung) | reiner Schaden / Tank-Buster |
| Frost | `frost` | verlangsamt Gegner-Timer (`FROST_SLOW`) | Kontrolle / weniger eingehender Schaden |
| Blitz/Arkan | `shock` | Chance Gegner-Angriff auszusetzen | Lockout / Defensiv-Tempo |

Erweiterungsoption (Chef): pro Element leicht andere `magnitude/duration/manaCost`-Defaults — Feuer teuer+hart, Frost billig+Utility.

## 5) magic_off vs. magic_def

| Skill | Trainiert wann | Geht ein in | Rolle |
|---|---|---|---|
| `magic_off` | eigener Magie-Treffer (Schaden) | `magicDamage` (×1.2/Level) | **Offensiv** — Spell-Schaden & Gates/Requirements |
| `magic_def` | wenn von magischem Schaden getroffen | `defense` (×0.2/Level) | **Defensiv** — magische Resistenz, macht Mana-Schild/Tank-Magier sinnvoll |

Beide bleiben getrennt trainierbar (kein totes Skill). magic_def speist optional zusätzlich die **Mana-Schild-Effizienz** (Designoption: Schild-Absorb skaliert mit magic_def).

---

## Was sich ändert/erweitert (vs. heute)

- **Erweitern:** `MANA_PER_CAST` global → **manaCost pro Waffe/Spell** (shared-Konstante bleibt als Default-Fallback).
- **Formalisieren:** „schwacher Schlag ohne Mana" explizit als **Stab-Nahkampf-Fallback** dokumentieren/benennen (Logik existiert).
- **Balancen:** Pool-Größe, Regen-Rate, manaCost pro Element/Tier → Loop-Gefühl (Balance-Designer + Content-Dev liefern Zahlen).
- **Sichtbar machen (UI-Agent):** Mana-Bar, aktiver Spell/Element, „Mana leer → Nahkampf"-Hinweis, Cast- vs. Bash-Log.
- **Kein zwingender State-/Save-Change:** Spell-Daten liegen im Content, nicht im GameState. SAVE_VERSION nur bumpen, falls ein neues persistentes Feld doch dazukommt.

## Follow-ups für den Chef (Routing)
- **Content-Dev:** `manaCost` an Magie-Waffen, Element-pro-Stab konsistent über alle Tiers, Spell-Datenfelder.
- **Combat-Dev:** Cast-Resolution auf per-Waffe-manaCost umstellen; Fallback-Schlag benennen; ggf. magic_def→Schild-Skalierung.
- **Balance-Designer:** Pool/Regen/manaCost-Tabelle fürs Loop-Gefühl; Magie-Parität zu melee/ranged.
- **UI-Dev:** Mana-Bar + Spell/Element-Anzeige + Cast/Bash-Feedback.
- **Tier-Plan / Runen-Plan:** Schnittstelle für Spell-Stärke per Tier bzw. Verzauberung.

## Offene Entscheidungen (Chef)
1. Neues Item-Feld `spell{}` oder bestehendes `weaponEffect` + `manaCost` (minimal)? → Empfehlung: minimal.
2. Skaliert Mana-Schild mit `magic_def`? (ja = klarere Defensiv-Magier-Rolle)
3. Element-Differenzierung über manaCost/magnitude — wie stark spreizen?
