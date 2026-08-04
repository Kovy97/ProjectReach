# Runecrafting Focus-Rework — 2-Stufen-Spec (Task #227)

**Autor:** balance-designer · **Datum:** 2026-07-04 · **Status:** PLAN (kein Code) · **Reviere:** nur `design/*.md`
**Zweck:** Runecrafting kampf-unabhängig trainierbar machen. Heute hängt jeder RC-Fortschritt an Kampf-Essenzen (dim/frost/aether/void), weil ausnahmslos alle Waffen-Rezepte Essenz verlangen. Wir bauen eine stabile **kampf-freie Trainings-Grundlage** in RC selbst ein (Stufe 1 = Barren + Shop-Reagenz), und lassen die **Essenz nur noch das finale, tragbare Gear gaten** (Stufe 2).

---

## 0. Kernentscheidung: „Focus" = die BESTEHENDE Focus-Linie (nicht neu)

Es existieren bereits **drei** vollständige 12-Tier-Magiewaffen-Linien, jede über Runecrafting gecraftet:

| Linie | Slot | Rolle | Rezept-Kategorie | Bars in Rezept? |
|---|---|---|---|---|
| **staff** (`copper_staff`…`godiron_staff`) | mainhand, 2H | Burn-DoT-Schadenswaffe | `rune_staves` | ja (#226: 2 Barren) |
| **wand** (`copper_wand`…`godiron_wand`) | mainhand, 1H | Control (frost/shock) | `rune_wands` | ja (#226: 1 Barren) |
| **focus** (`copper_focus`…`godiron_focus`) | **offhand** | reiner Stat-Stick (int/wis/lck) | `rune_foci` | **nein** |

**→ Empfehlung: Das 2-Stufen-Muster wird NUR auf die bestehende Focus-Linie angewandt. Staff & Wand bleiben 1-Step und kampf-gegatet.**

Begründung:
1. **Die Focus-Linie existiert schon als 12 fertige, tragbare Offhand-Items** (`copper_focus`…`godiron_focus`) — sie sind die perfekten **Stufe-2-Outputs**. Kein einziges neues Equip-Item nötig, keine Stat-Balance-Arbeit.
2. **Namens-Match:** Chef-Name „Copper Focus / Enchanted Copper Focus" trifft exakt diese Linie.
3. **Minimaler Fußabdruck:** 12 neue Precursor-Materialien + Umbau von 12 Rezepten in 2 Stufen — statt 36 Precursor über alle drei Linien.
4. **Die Focus-Linie hatte als einzige noch KEINEN Barren im Rezept** (#226 hat nur staff/wand mit Barren versehen). Stufe 1 bringt den Barren jetzt sauber in die Focus-Linie — vollendet #226s Absicht für die dritte Linie.
5. **„Combat ist fundamental" (Memory) bleibt gewahrt:** Staff/Wand — die Haupthand-Schadenswaffen des Magiers — bleiben essenz-gegatet. Der Magier muss weiterhin kämpfen, um seine *Angriffswaffe* zu bauen. Aber **das SKILLEN von Runecrafting selbst** wird über den Focus-Precursor kampf-frei — genau die Lücke, die der Chef schließen will. Der Offhand-Focus ist der „Trainings- und Support-Slot", der Stab/Wand die „Kampf-Ernte".

**Was mit den bestehenden `craft_<tier>_staff` / `craft_<tier>_wand` passiert: NICHTS.** Sie bleiben unverändert 1-Step (Barren + Essenz + Rune). Sie bleiben kampf-gegatet — das ist gewollt.

**Was mit den bestehenden `craft_<tier>_focus` passiert:** Sie werden zu **Stufe 1** umgebaut (Output = Precursor statt tragbarer Focus; Inputs = Barren + Magic Binder statt Essenz + Rune). Siehe §4. Die 12 tragbaren `*_focus`-Items bleiben unverändert und werden zum Output von **Stufe 2** (§5).

> **Nicht betroffen:** Die parallele „Chase"-Focus-Sonderlinie (`enchant_dim_focus`→`dim_focus`, `enchant_frost_focus`→`frost_focus`, `enchant_aether_orb`, `enchant_void_focus`, `enchant_god_focus`) bleibt komplett wie sie ist in `rune_foci`. Diese Spec berührt ausschließlich die 12 getierten `craft_<tier>_focus`.

---

## 1. Das 2-Stufen-Modell

```
STUFE 1  „Fokus bauen"  (kampf-frei, die Trainings-Grundlage)
   1× Metallbarren (copper_bar … godiron_bar)   ← Smithing/Mining
 + 1× Magic Binder                                ← Shop
 ──────────────────────────────────────────────
 → 1× Verzauberter <Tier>-Fokus  (Precursor, NON-EQUIP Material)     + Runecrafting-XP (Bulk)

STUFE 2  „Fokus verzaubern"  (essenz-gegatet, das Gear)
   1× Verzauberter <Tier>-Fokus  (Precursor)
 + N× passende Essenz (dim/frost/aether/void, +onyx@godiron)  ← Kampf/Forage
 ──────────────────────────────────────────────
 → 1× <Tier> Focus  (tragbar, bestehendes Item, mit Stats)         + Runecrafting-XP (kleiner Bonus)
```

**Kern-Prinzip der XP-Aufteilung:** Stufe 1 trägt **die gesamte bisherige Trainings-XP** (identisch zu heute), Stufe 2 gibt nur einen **kleinen Bonus (~15 %)**. Damit gilt:
- Ein reiner Skiller levelt RC **kampf-frei über Stufe 1** — mit **exakt dem heutigen XP/h-Tempo** (keine Regression, kein „warum ist RC jetzt langsamer").
- Ein Kämpfer, der zusätzlich Stufe 2 macht, bekommt ~15 % oben drauf **und** das tragbare Gear — ein moderater, fairer Kampf-Vorteil, keine Pflicht.
- Reine XP-Grinder bevorzugen automatisch Stufe 1 (Stufe 2 läuft bei ~30 % des Stufe-1-Tempos → niemals der schnellere XP-Weg).

---

## 2. Ökonomie-Check gegen die Zielkurve

`target_xph(L) = 90·√(xpForLevel(L+1) − xpForLevel(L))` — Referenz: 820/h (L1), 9 271/h (L50), 104 831/h (L99).

Wichtig: **Die Zielkurve ist im Live-Spiel ein Boden, kein Deckel.** Alle realen Skilling-Aktionen laufen darüber (Sim-Messung): Mining L1 = 2 400/h, Fishing L35 = 12 960/h, Woodcutting L99 = 136 500/h — also ~1,3–3× die Formel. Die **heutigen Focus-Rezepte sitzen exakt in diesem Band** (Sim: copper 2 340/h, iron 3 780/h, steel 5 850/h …). Stufe 1 übernimmt diese Zahlen **verbatim** → RC bleibt konsistent mit allen Nachbar-Skills.

### Stufe 1 — Precursor-Rezepte (kampf-frei) — XP identisch zu heute

| tier | level | dur (ms) | xp | XP/h | tgt_xph | vs tgt | Barren+Binder | Gold-Senke/h |
|---|---|---|---|---|---|---|---|---|
| copper | 1 | 4500 | 3 | 2 400 | 820 | 293 % | 8+8 = 16 | 12 800 |
| bronze | 5 | 6000 | 5 | 3 000 | 1 002 | 299 % | 12+8 = 20 | 12 000 |
| iron | 10 | 5500 | 6 | 3 927 | 1 285 | 306 % | 16+8 = 24 | 15 709 |
| steel | 20 | 9000 | 15 | 6 000 | 2 107 | 285 % | 30+8 = 38 | 15 200 |
| blacksteel | 30 | 11000 | 28 | 9 164 | 3 451 | 266 % | 52+8 = 60 | 19 636 |
| mithril | 40 | 11000 | 36 | 11 782 | 5 654 | 208 % | 70+8 = 78 | 25 527 |
| adamantium | 50 | 13000 | 68 | 18 831 | 9 271 | 203 % | 120+8 = 128 | 35 446 |
| runite | 60 | 14000 | 128 | 32 914 | 15 206 | 216 % | 160+8 = 168 | 43 200 |
| bloodiron | 70 | 15000 | 240 | 57 600 | 24 944 | 231 % | 200+8 = 208 | 49 920 |
| titanium | 80 | 16000 | 555 | 124 875 | 40 923 | 305 % | 260+8 = 268 | 60 300 |
| aetherium | 90 | 17000 | 870 | 184 235 | 67 139 | 274 % | 340+8 = 348 | 73 694 |
| godiron | 99 | 19000 | 1690 | 320 211 | 104 831 | 305 % | 480+8 = 488 | 92 463 |

*(Werte = heutige `craft_<tier>_focus` Duration & XP, 1:1 übernommen.)*

### Stufe 2 — Enchant-Rezepte (essenz-gegatet) — kleiner XP-Bonus

`s2dur = round(s1dur × 0,5)`, `s2xp = round(s1xp × 0,15)` (min 1).

| tier | level | dur (ms) | xp | XP/h | % von St1-Rate | Essenz-Input |
|---|---|---|---|---|---|---|
| copper | 1 | 3000 | 1 | 1 200 | 50 % | dim_essence ×3 |
| bronze | 5 | 3000 | 1 | 1 200 | 40 % | dim_essence ×3 |
| iron | 10 | 3000 | 1 | 1 200 | 31 % | dim_essence ×4 |
| steel | 20 | 4500 | 2 | 1 600 | 27 % | frost_essence ×3 |
| blacksteel | 30 | 5500 | 4 | 2 618 | 29 % | frost_essence ×3 |
| mithril | 40 | 5500 | 5 | 3 273 | 28 % | aether_essence ×2 |
| adamantium | 50 | 6500 | 10 | 5 538 | 29 % | aether_essence ×2 |
| runite | 60 | 7000 | 19 | 9 771 | 30 % | aether_essence ×3 |
| bloodiron | 70 | 7500 | 36 | 17 280 | 30 % | aether_essence ×3 |
| titanium | 80 | 8000 | 83 | 37 350 | 30 % | void_essence ×2 |
| aetherium | 90 | 8500 | 131 | 55 482 | 30 % | void_essence ×3 |
| godiron | 99 | 9500 | 254 | 96 253 | 30 % | void_essence ×4 + onyx ×1 |

*(Essenz-Mengen = heutige `craft_<tier>_focus` Essenz-Inputs, unverändert übernommen → die Essenz behält exakt ihren heutigen Gate-Wert für das tragbare Gear. Die Runen aus den Alt-Rezepten entfallen bewusst — siehe §7.)*

**Kombinierter Gear-Pfad (St1 + St2)** liegt +13–33 % über der heutigen reinen 1-Step-XP (Bulk bei niedrigen Tiers durch Integer-Rundung höher). Das ist ein moderater, akzeptabler Aufschlag dafür, dass man zwei Aktionen ausführt.

---

## 3. Magic Binder — neues Shop-Reagenz

**Empfehlung: EIN generischer Binder für alle Tiers** (nicht tier-spezifisch).

Begründung: Der Chef will „einfachen Start". Die Tier-Staffelung der Kosten kommt bereits vollständig aus dem **Barren** (copper 8 g → godiron 480 g). Ein zweiter, tier-spezifischer Binder-Baum wäre 12 zusätzliche Shop-Items + „welchen Binder brauche ich?"-Reibung, die genau dem einfachen Start entgegenläuft. Bei hohen Tiers wird der 8-g-Binder ökonomisch ohnehin vernachlässigbar (das ist ok — er ist ein Starter-Reagenz, kein Endgame-Sink; wenn ein Endgame-Sink gewünscht ist, Barren-Anzahl erhöhen, nicht Binder-Tiers einführen).

| Feld | Wert |
|---|---|
| id | `magic_binder` |
| name.en | `Magic Binder` |
| name.de | `Magiebinder` |
| type | `material`, `stackable: true` |
| icon | `🧷` (oder `✨`) |
| value | **4** (bewusst < Shop-Kaufpreis → kein Kauf→Verkauf-Arbitrage) |

**Shop-Eintrag:** `{ itemId: "magic_binder", cost: 8 }` — einreihen im Reagenzien-Block der `shop.buy`-Liste (bei den reeds/seeds).

Preis-Rationale: 8 g hält den Frühstart bezahlbar (copper-Training = 16 g/Aktion) und macht die kampf-freie Trainings-Grundlage zu einer **echten, aber milden Gold-Senke** — sie soll etwas kosten (kein Gratis-Unendlich-XP), aber nicht den L1-Einstieg blockieren.

---

## 3b. Barren-Sourcing für reine Magier — der Barren-Zwang darf den Start nicht koppeln

**Problem (vom CEO gemeldet):** Der Barren in Stufe 1 (und der bereits per #226 eingeführte Barren-Zwang bei staff/wand) koppelt Magie-Crafting an **Mining + Smithing**. Ein reiner Kampf-Magier (nur `magic` + `runecrafting`) kann so weder Precursor noch Waffe selbst herstellen — das bricht den `sim-realistic`-„Magie-Route"-Test und widerspricht dem „einfacher Start"-Ziel. Bars sind aktuell **nirgends im Shop** (geprüft: nur als Item-Def, kein `shop.buy`-Eintrag).

**Empfehlung: Niedrige Metallbarren (copper → steel) im Shop kaufbar machen — mit Aufpreis.** So holt der Magier **Barren + Magic Binder komplett aus dem Shop** und craftet den Precursor **ohne Mining/Smithing**. Wer schmiedet, spart Gold (Shop = Bequemlichkeitsaufpreis); wer nicht, zahlt Gold statt Skill-Zeit. RC bleibt damit **kampf-frei UND smithing-frei** trainierbar ab L1.

**Shop-Barren (in `shop.buy` ergänzen):**

| itemId | value (Verkauf) | Shop-cost (Kauf) | Aufpreis |
|---|---|---|---|
| `copper_bar` | 8 | **20** | 2,5× |
| `bronze_bar` | 12 | **28** | 2,3× |
| `iron_bar` | 16 | **40** | 2,5× |
| `steel_bar` | 30 | **65** | 2,2× |

Alle cost > value ⇒ **kein Kauf→Verkauf-Arbitrage**. Der Aufpreis (~2,2–2,5×) macht Selbst-Schmieden klar günstiger.

**Reiner-Magier-Kosten Stufe 1 mit Kauf-Barren** (Barren-cost + 8 g Binder):

| tier | L | Kauf-Barren+Binder | Gold-Senke/h | Selbst-Schmied-Senke/h (nur Binder) |
|---|---|---|---|---|
| copper | 1 | 20+8 = 28 | 22 400 | 6 400 |
| bronze | 5 | 28+8 = 36 | 21 600 | 4 800 |
| iron | 10 | 40+8 = 48 | 31 418 | 5 236 |
| steel | 20 | 65+8 = 73 | 29 200 | 3 200 |

Das ist eine spürbare, aber tragbare Senke — ein Kampf-Magier finanziert sie problemlos aus Kampf-Gold, oder halbiert/drittelt sie durch etwas Smithing. Genau die gewünschte Wahlfreiheit.

**Warum bei `steel` (L20) kappen und NICHT alle 12 Tiers in den Shop legen:** Barren sind auch die Basis für Melee/Ranged-Gear (Smithing). Kaufbare High-Tier-Barren (adamantium … godiron) würden es Nicht-Schmieden erlauben, **Endgame-Gear-Mats zu umgehen** und die Mining/Smithing-Progression auszuhöhlen — ein breiter Ökonomie-Schaden. Der „einfache Start"-Bedarf betrifft das **frühe** Spiel; ab Mid-Tier ist etwas kampf-freies Smithing (oder Handel) eine normale Cross-Skill-Berührung und kein Kampf-Gate. Also: **Shop-Barren copper→steel**, darüber Selbst-Schmieden/Handel.

**Alternativen (abgewogen, nicht empfohlen):**
- *Barren-freie Low-Tier-Precursor* (copper/bronze nur Binder, kein Barren): maximal simpler L1-Start, aber inkonsistent zu #226 (Barren-Zwang bei Magie-Waffen) und entfernt den Barren-Sink genau dort, wo #226 ihn wollte. Verworfen zugunsten uniformer 1-Barren-Rezepte + Shop-Barren.
- *Magier trainiert leicht Smithing*: funktioniert (Smithing ist kampf-frei), erfüllt aber „einfacher Start" nur halb — erzwingt einen zweiten Skill von Minute 1. Als **ergänzender** Pfad ok (High-Tier), nicht als alleinige Lösung.

---

## 4. Stufe-1-Precursor-Items (12 neue Materialien)

Alle: `type: "material"`, `stackable: true`, **NON-EQUIP** (kein `slot`, kein `weaponStyle`, keine `requirements`), `icon: "🔮"`. „Gleiches Bild wie der finale Fokus" → Art bindet per Datei-Name (`assets/items/<id>.png`); asset-integrator kopiert die jeweilige `<tier>_focus.png` auf den Precursor-Namen (siehe Apply-List). Bis dahin fällt beides auf 🔮 zurück — optisch identisch.

`value = round(bar_value × 0,5)` → immer **unter** den Input-Kosten (Barren + Binder) ⇒ kein Kauf→Craft→Verkauf-Loop.

| id | name.en | name.de | value |
|---|---|---|---|
| `enchanted_copper_focus` | Enchanted Copper Focus | Verzauberter Kupfer-Fokus | 4 |
| `enchanted_bronze_focus` | Enchanted Bronze Focus | Verzauberter Bronze-Fokus | 6 |
| `enchanted_iron_focus` | Enchanted Iron Focus | Verzauberter Eisen-Fokus | 8 |
| `enchanted_steel_focus` | Enchanted Steel Focus | Verzauberter Stahl-Fokus | 15 |
| `enchanted_blacksteel_focus` | Enchanted Blacksteel Focus | Verzauberter Schwarzstahl-Fokus | 26 |
| `enchanted_mithril_focus` | Enchanted Mithril Focus | Verzauberter Mithril-Fokus | 35 |
| `enchanted_adamantium_focus` | Enchanted Adamantium Focus | Verzauberter Adamantium-Fokus | 60 |
| `enchanted_runite_focus` | Enchanted Runite Focus | Verzauberter Runit-Fokus | 80 |
| `enchanted_bloodiron_focus` | Enchanted Bloodiron Focus | Verzauberter Bluteisen-Fokus | 100 |
| `enchanted_titanium_focus` | Enchanted Titanium Focus | Verzauberter Titan-Fokus | 130 |
| `enchanted_aetherium_focus` | Enchanted Aetherium Focus | Verzauberter Aetherium-Fokus | 170 |
| `enchanted_godiron_focus` | Enchanted Godiron Focus | Verzauberter Götzeneisen-Fokus | 240 |

> **Namens-Hinweis (Chef-Entscheidung offen):** „Enchanted …" ist semantisch leicht invers (verzaubert wird erst in Stufe 2). Ich setze den Chef-Namen 1:1 um. Falls gewünscht, wäre „**<Tier> Focus Blank** / **<Tier>-Rohfokus**" präziser. Default = Chef-Name.

---

## 5. Rezept-Umbau (Actions)

### Stufe 1 — `craft_<tier>_focus` UMBAUEN (id behalten, Output + Inputs + Kategorie ändern)

**id bewusst beibehalten** (geringste Migration/Mastery-Churn). Nur ändern: `category` → `rc_focus_forge`, `name`, `loot` → Precursor, `inputs` → Barren + Binder. **Duration & xp bleiben exakt wie heute.**

| id (behalten) | level | dur | xp | inputs | loot (Precursor) |
|---|---|---|---|---|---|
| `craft_copper_focus` | 1 | 4500 | 3 | copper_bar ×1, magic_binder ×1 | enchanted_copper_focus ×1 |
| `craft_bronze_focus` | 5 | 6000 | 5 | bronze_bar ×1, magic_binder ×1 | enchanted_bronze_focus ×1 |
| `craft_iron_focus` | 10 | 5500 | 6 | iron_bar ×1, magic_binder ×1 | enchanted_iron_focus ×1 |
| `craft_steel_focus` | 20 | 9000 | 15 | steel_bar ×1, magic_binder ×1 | enchanted_steel_focus ×1 |
| `craft_blacksteel_focus` | 30 | 11000 | 28 | blacksteel_bar ×1, magic_binder ×1 | enchanted_blacksteel_focus ×1 |
| `craft_mithril_focus` | 40 | 11000 | 36 | mithril_bar ×1, magic_binder ×1 | enchanted_mithril_focus ×1 |
| `craft_adamantium_focus` | 50 | 13000 | 68 | adamantium_bar ×1, magic_binder ×1 | enchanted_adamantium_focus ×1 |
| `craft_runite_focus` | 60 | 14000 | 128 | runite_bar ×1, magic_binder ×1 | enchanted_runite_focus ×1 |
| `craft_bloodiron_focus` | 70 | 15000 | 240 | bloodiron_bar ×1, magic_binder ×1 | enchanted_bloodiron_focus ×1 |
| `craft_titanium_focus` | 80 | 16000 | 555 | titanium_bar ×1, magic_binder ×1 | enchanted_titanium_focus ×1 |
| `craft_aetherium_focus` | 90 | 17000 | 870 | aetherium_bar ×1, magic_binder ×1 | enchanted_aetherium_focus ×1 |
| `craft_godiron_focus` | 99 | 19000 | 1690 | godiron_bar ×1, magic_binder ×1 | enchanted_godiron_focus ×1 |

Anzeige-Namen: en „Build Copper Focus" / de „Kupfer-Fokus bauen" usw.

### Stufe 2 — `enchant_<tier>_focus` NEU (12 neue Actions)

`category: "rc_focus_enchant"`, `skill: "runecrafting"`. Output = bestehendes tragbares `*_focus`-Item (unverändert).

| id (neu) | level | dur | xp | inputs | loot (Equip) |
|---|---|---|---|---|---|
| `enchant_copper_focus` | 1 | 3000 | 1 | enchanted_copper_focus ×1, dim_essence ×3 | copper_focus ×1 |
| `enchant_bronze_focus` | 5 | 3000 | 1 | enchanted_bronze_focus ×1, dim_essence ×3 | bronze_focus ×1 |
| `enchant_iron_focus` | 10 | 3000 | 1 | enchanted_iron_focus ×1, dim_essence ×4 | iron_focus ×1 |
| `enchant_steel_focus` | 20 | 4500 | 2 | enchanted_steel_focus ×1, frost_essence ×3 | steel_focus ×1 |
| `enchant_blacksteel_focus` | 30 | 5500 | 4 | enchanted_blacksteel_focus ×1, frost_essence ×3 | blacksteel_focus ×1 |
| `enchant_mithril_focus` | 40 | 5500 | 5 | enchanted_mithril_focus ×1, aether_essence ×2 | mithril_focus ×1 |
| `enchant_adamantium_focus` | 50 | 6500 | 10 | enchanted_adamantium_focus ×1, aether_essence ×2 | adamantium_focus ×1 |
| `enchant_runite_focus` | 60 | 7000 | 19 | enchanted_runite_focus ×1, aether_essence ×3 | runite_focus ×1 |
| `enchant_bloodiron_focus` | 70 | 7500 | 36 | enchanted_bloodiron_focus ×1, aether_essence ×3 | bloodiron_focus ×1 |
| `enchant_titanium_focus` | 80 | 8000 | 83 | enchanted_titanium_focus ×1, void_essence ×2 | titanium_focus ×1 |
| `enchant_aetherium_focus` | 90 | 8500 | 131 | enchanted_aetherium_focus ×1, void_essence ×3 | aetherium_focus ×1 |
| `enchant_godiron_focus` | 99 | 9500 | 254 | enchanted_godiron_focus ×1, void_essence ×4, onyx ×1 | godiron_focus ×1 |

Anzeige-Namen: en „Enchant Copper Focus" / de „Kupfer-Fokus verzaubern" usw. (Keine Kollision mit bestehenden `enchant_*`-ids: dim/frost_focus/aether_orb/void_focus/god_focus sind andere Tier-Namen.)

---

## 6. Zwei neue Kategorien (SkillPage-Gruppen)

In `content.categories` einfügen (bei `rune_foci`):

```
{ id: "rc_focus_forge",   name: { en: "Build Focus",   de: "Fokus bauen" } },
{ id: "rc_focus_enchant", name: { en: "Enchant Focus", de: "Fokus verzaubern" } },
```

`rune_foci` bleibt bestehen (hält weiterhin die Chase-Sonder-Foki dim/frost/aether/void/god). Reihenfolge-Empfehlung auf der Runecrafting-Seite: `rc_focus_forge` **vor** `rc_focus_enchant`, damit die kampf-freie Grundlage zuerst gelesen wird. Kein neuer UI-Code nötig — SkillPage rendert `content.categories` generisch; sie braucht nur die zwei neuen Category-Einträge.

---

## 7. Balance-/Exploit-Prüfung

- **Kein Gold-Loop (Stufe 1):** Precursor-value < Input-Kosten (Barren+Binder) ⇒ Kauf→Craft→Verkauf verliert immer. Precursor ist zum Verbrauch da, nicht zum Verkauf.
- **Kein Gold-Loop (Stufe 2):** `dim_essence` ist **bewusst NICHT im Shop** (Fix 2026-07, sweep2 — genau um Fokus-Gold-Loops zu killen). Höhere Essenzen ebenfalls nicht käuflich. Der Durchsatz von Stufe 2 ist damit durch Forage/Kampf-Nachschub gedeckelt. Der neue Binder-Kosten **reduziert** die Alt-Margen sogar leicht.
- **Runen entfallen aus der Focus-Linie:** Die Alt-`craft_<tier>_focus` nutzten force/frost/aether/void_rune. Stufe 1 darf **keine** Runen nutzen (Runen werden aus Essenz gecraftet → das würde die kampf-freie Grundlage re-gaten). Stufe 2 = nur Essenz (sauberes Gate). Netto sinkt die Runen-Nachfrage minimal; Runen bleiben stark nachgefragt durch staff/wand/glyphs/scrolls/armor. Falls content-dev die Runen-Nachfrage erhalten will, kann optional 1 Tier-Rune in Stufe 2 ergänzt werden — Default: nur Essenz.
- **XP kein Exploit:** Stufe-1-XP/h = heutige Werte (bereits im gesunden Skilling-Band, verbraucht Barren analog zu Smithing-Forge). Stufe 2 läuft bei ~30 % des Stufe-1-Tempos ⇒ nie der schnellere Grind.
- **Essenz behält Gate-Wert:** Mengen 1:1 aus den Alt-Rezepten übernommen. Der tragbare Focus kostet exakt gleich viel Essenz wie heute.

### ⚠️ Out-of-scope-Befund (separat, NICHT in diesem Task fixen)
Die getierten Magiewaffen-Linien (focus **und** staff/wand) laufen im High-Tier **~2–3× über der Zielkurve** und ~2,5× über den Peer-Gathering-Skills bei gleichem Level (godiron_focus 320 k XP/h vs. godwood-Woodcutting 136 k, Fishing L97 109 k). Das ist eine **bestehende** Kalibrierung, die diese Spec bewusst 1:1 erhält (Ziel = Entkopplung von Kampf, nicht Kurven-Retune — ein stiller großer Kurven-Shift im selben Change wäre schlecht nachvollziehbar). **Empfehlung: eigener RC-Kurven-Retune-Pass** für focus/staff/wand High-Tier. Als separater Task auflisten.

---

## 8. Apply-List

### content-dev (Katalog `packages/content/src/index.ts`)
1. **Item:** `magic_binder` hinzufügen (§3).
2. **Shop:** `{ itemId: "magic_binder", cost: 8 }` in `shop.buy` (Reagenzien-Block).
2b. **Shop-Barren (§3b):** `{ itemId: "copper_bar", cost: 20 }`, `{ itemId: "bronze_bar", cost: 28 }`, `{ itemId: "iron_bar", cost: 40 }`, `{ itemId: "steel_bar", cost: 65 }` in `shop.buy`. **Nur diese vier** — keine höheren Barren in den Shop (Ökonomie-Schutz, §3b).
3. **Items:** 12 Precursor-Materialien anlegen (§4) — non-equip, `icon: "🔮"`, value je Tabelle. Vorher id-Unikat prüfen (`enchanted_<tier>_focus`).
4. **Kategorien:** `rc_focus_forge` + `rc_focus_enchant` in `content.categories` bei `rune_foci` (§6).
5. **Stufe 1:** die 12 bestehenden `craft_<tier>_focus` umbauen — `category` → `rc_focus_forge`, `name` → „Build … Focus", `inputs` → `<tier>_bar ×1 + magic_binder ×1`, `loot` → `enchanted_<tier>_focus ×1`. **Duration & xp NICHT anfassen** (§5).
6. **Stufe 2:** die 12 neuen `enchant_<tier>_focus` anlegen (§5) — `category: "rc_focus_enchant"`, inputs Precursor+Essenz(+onyx@godiron), loot = tragbares `<tier>_focus`.
7. **Unberührt lassen:** alle `craft_<tier>_staff`, `craft_<tier>_wand`, sowie `enchant_dim_focus`/`enchant_frost_focus`/`enchant_aether_orb`/`enchant_void_focus`/`enchant_god_focus` und die `*_focus` Equip-Item-Defs.
8. **Save/Migration** (Memory „Save-Logik immer mitziehen"): mit logic-dev abklären, ob `craft_<tier>_focus`-Mastery-/Fortschritts-Referenzen vom geänderten Output betroffen sind. id-Beibehaltung minimiert das; Precursor sind neue stackable Materials (unkritisch). SAVE_VERSION ggf. bumpen, wenn nötig.

### asset-integrator (Reviere: Asset-Ordner)
9. **„Gleiches Bild":** für jeden Tier die vorhandene `assets/items/<tier>_focus.png` (falls vorhanden) auf `assets/items/enchanted_<tier>_focus.png` duplizieren, damit Precursor & finaler Focus dasselbe Bild zeigen. Fehlt eine Focus-PNG, beide fallen auf 🔮 zurück — nichts zu tun.

### logic-dev (Reviere: engine, Sim)
10. **`sim-realistic.ts` „Magie-Route" re-pinnen** (Test `sim-realistic.test.ts:266`, aktuell rot): Die Alt-Annahme „Magie-Waffen ~100 % craft-/drop-gebunden ohne andere Skills" (Kommentar Z. 268) gilt nach dem Barren-Zwang (#226) **nicht mehr**. Der `RealisticPlayer` muss die neue Bar/Precursor-Route abbilden: **Low-Barren aus dem Shop kaufen** (Einkaufslogik um die vier Shop-Barren erweitern) **oder** etwas Smithing trainieren, um Barren-Inputs zu decken → dann Precursor/Waffe craften. Gehört zum #227-Build (mit content-dev abstimmen, da Shop-Barren-Einträge Voraussetzung sind).

### ui-dev (Reviere: Renderer)
11. Kein Pflicht-Code — SkillPage rendert Kategorien generisch. Optional: kurze Kontext-Hilfe auf der Runecrafting-Seite über der `rc_focus_forge`-Gruppe („Kampf-frei trainierbar — Barren + Magiebinder; niedrige Barren im Shop"). Nur i18n-Strings, kein Struktur-Code.

---

## 9. Gate-Kriterien (Abnahme)

- ✅ **RC 1 → mid/high kampf-frei levelbar:** Ausschließlich Stufe-1-Precursor (Barren + Magiebinder, beide kampf-frei) erreichen — mit heutigem XP/h-Tempo — jedes RC-Level bis 99. Kein Rezept der kampf-freien Grundlage verlangt Essenz oder Runen.
- ✅ **Tragbarer Focus braucht weiter Essenz:** Jeder equippbare `<tier>_focus` kommt nur aus Stufe 2 (Precursor + Kampf-/Forage-Essenz). Essenz-Mengen unverändert.
- ✅ **Staff/Wand unverändert kampf-gegatet** (Haupthand-Waffe bleibt Kampf-Ernte).
- ✅ **Einfacher Start, smithing-frei:** reiner Magier (nur magic+RC) sourct Precursor komplett aus dem Shop (Low-Barren copper→steel + generischer 8-g-Binder) — **kein Mining/Smithing erzwungen**, keine Essenz für Stufe 1. Wer schmiedet, spart Gold (§3b).
- ✅ **`sim-realistic` „Magie-Route" wieder grün:** der ehrliche Magier findet die Bar/Precursor-Route (Barren kaufen ODER leicht smithing) und landet nicht mehr auf der Shop-Decke.
- ✅ **Kein Gold-/XP-Exploit** (§7).
- ✅ Sim (`pnpm test`): `rc_focus_forge`-Aktionen zeigen positive XP/h ohne Essenz-Input; keine `0 XP/h`-Zeilen.

---

## Anhang — relevante Referenzen
- Katalog: `G:\GameDev\packages\content\src\index.ts` — Focus-Items 3580–3663; Focus-Rezepte 9003–9014; staff/wand-Rezepte 8975–9000; Kategorien 12470–12529; Shop.buy endet 11778; `forage_dim_essence` 7252.
- Zielkurve: `G:\GameDev\packages\engine\src\leveling.ts` (`xpForLevel`).
- Pre-existing Sim-Fail (thematisch verwandt, nicht durch diese Spec verursacht): `sim-realistic.test.ts › craftet die eigene Waffe, wenn der Shop keine mehr bietet (Magie-Route)` — genau die Kampf-Gate-Reibung, die dieser Rework adressiert.
