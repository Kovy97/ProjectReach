# UI-Audit — Sweep 2026-07-01

**Auditor:** QA (Kontrolleur/UI-Audit-Fokus) · **Methode:** HEADLESS (Code-/Content-/CSS-Statik, kein Electron) · Checkliste: `packages/engine/src/ui-audit-plan.md`

Da kein Renderer gefahren wird, sind das statisch-belegbare Findings (Datei:Zeile). Rein visuelle Punkte (echte Pixel-Overlaps, Ellipsis greift wirklich) sind als „braucht Screenshot" markiert — die gehören zu ui-dev/Playwright.

Reihenfolge: schwerste zuerst.

---

## P1 — Roher Dev-Token sichtbar auf dem Charakterblatt (Begleiter)

- **Kategorie:** ux / i18n
- **Wo:** `apps/client/src/renderer/pages/CharacterPage.tsx:653-655` (Companion-Widget im Character-Sheet, Top-Bar-Kernseite)
- **Erwartet:** Lesbare, lokalisierte Effekt-Beschreibung wie „+15 % Sammelertrag · ⚔ Statuseffekt bei Treffer" — genau wie es die Pet-Galerie zeigt.
- **Tatsächlich:** Es wird der rohe camelCase-Enum-Token gerendert:
  ```
  {pet.skillEffect.value !== undefined
    ? `+${(pet.skillEffect.value * 100).toFixed(0)}% ${pet.skillEffect.kind}`
    : pet.skillEffect.kind}
  {` · ⚔ ${pet.combatAbility.kind}`}
  ```
  → im Spiel steht dann z. B. **„+15% gatherYield · ⚔ onHitStatus"**. Die Kinds sind Dev-Tokens (`gatherYield`, `doubleDrop`, `thievingSuccess`, `onHitStatus`, `delayedDot`, `burstDamage` …).
- **Fix vorhanden, nur nicht genutzt:** `PetGalleryPage.tsx:16-25` löst dieselben Tokens korrekt über `t(\`pet.effect.skill.${se.kind}\`)` / `t(\`pet.effect.combat.${ce.kind}\`)` auf. Diese Keys existieren beide in `translations.ts`. CharacterPage soll denselben Weg (oder `effectSummary`) verwenden.
- **Owner:** ui-dev

---

## P2 — Enchanting-Vorschau: Bonus-Zeilen hart auf Englisch (Sprach-Mix)

- **Kategorie:** ux / i18n
- **Wo:** `apps/client/src/renderer/pages/EnchantingPage.tsx:32-53` (`formatBonusLines`), gerendert bei `:132` (Affix-Preview) und `:330` (Vault-Rune-Liste)
- **Erwartet:** Stat-Labels lokalisiert (DE-UI → deutsche Labels).
- **Tatsächlich:** Labels sind Hardcode-Englisch: `"Melee Dmg"`, `"Ranged Dmg"`, `"Magic Dmg"`, `"Defense"`, `"Accuracy"`, `"Evasion"`, `"HP"`, `"Crit Chance"`, `"Crit Dmg"`, `"Speed"`. In der deutschen UI erscheint gemischt Deutsch/Englisch.
- **Beleg für „falsch":** Der geteilte Tooltip-Formatter `affixEffectSummary` in `components/ItemTooltip.tsx:164-201` macht es korrekt über `t("stat.meleeDamage")` etc. EnchantingPage dupliziert die Logik und übersetzt eben nicht. Sollte den geteilten Formatter / dieselben `stat.*`-Keys nutzen.
- **Owner:** ui-dev

---

## P2 — 10 Items ohne Bild UND ohne Emoji-Icon → leerer/Text-Slot

- **Kategorie:** ux / fehlende Icons
- **Wo:** Content `packages/content/src/index.ts` (Item-Defs) + Asset-Ordner `apps/client/src/renderer/assets/items/`. Sichtbar überall via `components/ItemCell.tsx:93-99` (Fallback → nackter Item-Name) und `components/ItemChip.tsx:36-40` (Fallback → „▪").
- **Erwartet:** Jedes Item hat ein PNG oder mindestens ein `icon:`-Emoji als Fallback.
- **Tatsächlich:** 10 von 1011 Items haben **weder** PNG **noch** `icon:` — sie rendern als bloßer Name (Inventar/Bank/Paperdoll/Shop) bzw. „▪" (Drops/Quest-Rewards/Tooltip). Betrifft auch **ausrüstbare Gear**:
  - `voidhide_legs` (equipment/legs) — restliches Voidhide-Set hat Art (`voidhide_body/boots/helm/vambraces.png`), nur die Beine fehlen → Set wirkt im Paperdoll gebrochen
  - `aetherscale_cuirass` (equipment/body)
  - `frostcaverns_bow` (equipment/mainhand)
  - `plague_mask`, `mirror_ward`, `slayer_ward_capsule`, `tower_forge_compound`, `rot_gland`, `soul_flayer_fang`, `mandrake_root` (materials/consumables)
- **Owner:** asset-integrator (Art liefern) bzw. content-dev (Emoji-`icon:`-Fallback setzen). Kandidat für einen content-integrity-Guard-Test „jedes Item hat PNG oder icon".

---

## P2 — Bestiary nutzt rohe Emojis für Stats + Status, wo echte PNGs existieren (Inkonsistenz)

- **Kategorie:** ux / Emojis statt Icons
- **Wo:** `apps/client/src/renderer/pages/BestiaryPage.tsx` — Status-Legende `:9,:53`, Monster-Stats `:86-93` (`❤ ⚔ 🛡 ♻ 😡 ☠`), Immun/Inflict `:100,:107` (`🔥❄️⚡🟢🩸`). Bestiary ist eine Top-Bar-Kernseite.
- **Erwartet:** Dieselben Icons wie im Kampf. Die PNGs existieren alle (`icon_attribute_hp/_meeledamage/_defense`, `icon_status_burn/frost/shock/poison/bleed`) und werden auf der Schwesterseite `CombatPage.tsx` bereits via `statIcon()` / `renderEffectIcon()` (`:202-230`) gerendert.
- **Tatsächlich:** Bestiary ist die einzige Kernseite komplett auf Roh-Emoji — `getUiIcon` wird hier gar nicht importiert. Sichtbarer Stilbruch gegenüber Kampf-Screen (Emoji vs. crisp PNG).
- **Owner:** ui-dev

---

## P3 — Offline-Popup: Gold-Zeile noch Emoji 🪙 (Fix unvollständig)

- **Kategorie:** ux / Emojis statt Icons
- **Wo:** `apps/client/src/renderer/pages/OfflinePopup.tsx:49`
- **Kontext:** Recent Fix „Offline-Popup-Icons" ist bei den Skill-Zeilen umgesetzt (`:31,:35` nutzen jetzt korrekt `getSkillIcon(id) ?? getSidebarIcon(id)`). Die Gold-Zeile blieb aber auf `🪙` (aria-hidden), obwohl `icon_goldcoin` existiert und in der TopBar (`App.tsx:41`) bereits verwendet wird.
- **Erwartet:** Gold-Zeile mit `getUiIcon("icon_goldcoin")`.
- **Owner:** ui-dev

---

## P3 — Roher Status-/Kind-Token in Hover-Tooltips (title-Attribut)

- **Kategorie:** ux / i18n
- **Wo:** `apps/client/src/renderer/pages/CombatPage.tsx:381` (`title={e.type}` am Effekt-Badge → z. B. „burn") und `:657` (`title=…${activePet.combatAbility.kind}…` → z. B. „onHitStatus").
- **Erwartet:** `t(\`status.${e.type}\`)` bzw. `t(\`pet.effect.combat.${...kind}\`)`.
- **Tatsächlich:** Sichtbarer Inhalt ist okay (Badge zeigt PNG + Restzeit); nur der Hover-Title zeigt den Roh-Token. Geringe Sichtbarkeit, daher P3.
- **Owner:** ui-dev

---

## P3 — Monster-Kartenname wird bei langen DE-Namen abgeschnitten (Ellipsis)

- **Kategorie:** ux / Overflow
- **Wo:** `apps/client/src/renderer/styles/combat.css:405-415` — `.monster-card-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px; }`
- **Erwartet:** Vollständiger Monstername auf der Auswahlkarte.
- **Tatsächlich:** Lange deutsche Namen (z. B. „Roher Geisterflosser-Hecht"-Klasse Monsternamen) werden mit „…" gekürzt. Ob's real greift → **braucht Screenshot** (Kartenbreite bei max. 3 Spalten). Als Watch-Item für ui-dev/Playwright.
- **Owner:** ui-dev

---

## Info / Aufräumen

- **Verwaistes Asset:** `apps/client/src/renderer/assets/sidebar/sidebaricon_inscription.png` — Inscription wurde bewusst entfernt (MEMORY „Inscription raus"); Icon ist tot. Kein UI-Bug, aber Karteileiche. (asset-integrator)
- **DE-Namens-Disambiguierung:** Robe-Beinteile heißen im DE `„… -Gewand (Beine)"` (z. B. `index.ts:3686`), im EN „Skirt". Bewusste Disambiguierung, kein Dev-Leak — nur als bekannt vermerkt.

---

## Verifizierte jüngste Fixes

- ✅ **Save-Übersicht breiter:** `styles/character.css:650` — `.menu-panel { max-width: 780px }` (Kommentar bestätigt: von 610px verbreitert, damit Slot-Zeilen nicht umbrechen). Umgesetzt.
- ⚠️ **Offline-Popup-Icons:** Skill-Zeilen auf echte Icons umgestellt (gut), **Gold-Zeile noch Emoji** → siehe P3.
- ◻️ **Karten-Header-Ecken:** Combat-Karten/Headings nutzen durchgängig das 9-Slice `wooden_frame_with_corners.png` mit `border-radius:0` (`combat.css:45,214,436,757`), strukturell konsistent. Exakte Ecken-Optik ist rein visuell → **braucht Screenshot** (out of headless scope).

---

## Saubere Durchläufe (kein Finding)

- **i18n-Literal-Keys:** 0 fehlende — alle 789 in `t("…")` referenzierten Literal-Keys sind in `translations.ts` definiert. DE/EN-Parität ist per TypeScript erzwungen (`de` muss exakt `en`-Keys haben → sonst tsc-Fehler). Dynamische Keys (`pet.effect.*`, `status.*`, `achievements.rarity.*`, `item.type.*`) haben Fallback-Handling.
- **Kein Platzhalter-Leak im Content:** kein `TODO/FIXME/Lorem/placeholder/(Foraging)`-artiger Dev-Tag in Item/Monster/Action-Namen/Descriptions.
- **Nav-Icons vollständig:** alle Sidebar- **und** Top-Bar-Seiten haben ein echtes `sidebaricon_*.png` — **kein** Emoji-Fallback in der Navigation.
- **Zahlenformatierung:** überall gerundet/formatiert (`toFixed`, `toLocaleString`) — kein `12.3333`, kein rohes NaN/undefined in den geprüften Pfaden.
- **Empty-States:** Listen-Seiten haben Empty-Texte (`achievements.empty`, `enchant.noItems`, `vault.empty`, `farm.empty`, `companions.none`, `menu.empty`).
- **Item-Fallback-Kette** (`ItemCell`/`ItemChip`): PNG → Emoji → Name/„▪" ist sauber implementiert (nur die 10 Items aus P2 fallen bis auf die letzte Stufe durch).

---

## Kurz-Zusammenfassung

Ein echter **P1**: das Charakterblatt zeigt beim ausgerüsteten Begleiter rohe Dev-Tokens (`gatherYield`, `onHitStatus`) statt der bereits vorhandenen, in der Pet-Galerie genutzten Übersetzung — das ist genau die Art Bug, die dem Chef auffällt (`CharacterPage.tsx:653-655`, Fix: ui-dev).

Drei **P2**: (1) Enchanting-Vorschau mit hart-englischen Stat-Labels (Sprach-Mix, ui-dev), (2) 10 Items komplett ohne Icon inkl. ausrüstbarer Gear wie `voidhide_legs`/`aetherscale_cuirass`/`frostcaverns_bow` → leere/Text-Slots (asset-integrator + content-dev), (3) Bestiary rendert Stat-/Status-Emojis, wo Combat schon echte PNGs zeigt (ui-dev).

Rest ist Politur (P3: Offline-Gold-Emoji, Roh-Token in Hover-Titles, Monster-Name-Ellipsis) plus eine Karteileiche (`sidebaricon_inscription.png`).

Verifizierte Fixes: Save-Übersicht-Breite ✅ umgesetzt; Offline-Icons ⚠️ bis auf die Gold-Zeile umgesetzt; Karten-Ecken strukturell konsistent, finaler Optik-Check braucht Screenshot.

**Nächster Schritt:** i18n/Content ist erfreulich sauber (Parität type-enforced, keine fehlenden Keys). Die visuelle Restklasse (echte Overflows, Alignment) bleibt der offene ui-dev-Punkt — der `?fixture=`-Hook + Playwright-Scaffold aus dem Audit-Plan §3 fehlt weiterhin.
