# ⚔️ Slayer-Skill — Übersichtsplan (Synthese)

**Quellen:** `slayer-system-spec.md` (Engine/Daten), `slayer-content-spec.md` (Tower/Items), `slayer-ui-spec.md` (Dialog-UI).
**Status:** Planungsreif. Großes Feature → Phasen-Vorschlag unten. Wartet auf Chef-Entscheidungen (Abschnitt 5).

---

## 1. Konzept (deine Vorgabe)
Neuer Skill **Slayer** (1–99). Skill-Seite = **Dialog mit einem Slayer-Master** (keine Aktions-Karten). Mehrere Master nach Combat+Slayer-Level. Master gibt „töte N×Monster X": normale Welt-Mobs ODER **50% Chance** ein **Slayer-Tower**-Task. Tower = neues Gebiet, **5 SLAYER-level-gated Etagen** (1/20/40/60/80 → Mob-Bänder 1-19/20-39/40-59/60-79/80-99). Manche Monster brauchen ein **Anforderungs-Item** (Nasenklammer-Analog). Tower = **Unique-Drops**. Später craftbarer **Slayer-Helm** (kombiniert alle Anforderungs-Effekte). Optional Slayer-gated Equip.

## 2. Architektur (empfohlen)
- **Slayer-XP** lebt im bestehenden `skills["slayer"]` — kein Sonderkonstrukt. **Slayer-Punkte** als kleine eigene Währung (`slayerPoints`).
- **Tower-Gating** über `MonsterDef.slayerFloor` + `SlayerTowerFloor{ floor, slayerLevelRequired, monsters }` (schlanker als 5 separate Zonen-IDs).
- **Anforderungs-Item** über `MonsterDef.slayerRequirement`; `slayerRequirementMet()` prüft Equip/Inventar/Bank ODER ausgerüsteten Slayer-Helm.
- Neue GameState-Felder: `slayerTask | null`, `slayerPoints`, `slayerTasksCompleted`, `slayerStreak`. **SAVE_VERSION 35→36** (idempotente Default-Migration, keine Item-Renames).
- Neue Engine-Datei `engine/slayer.ts` (rein, deterministisch über `state.rng`). `combatLevel(state)` existiert bereits (wird für Master-Unlocks wiederverwendet).

## 3. Implementierungs-Reihenfolge (Reviere)
1. **shared** [logic-dev]: Typen (`SlayerMasterDef`, `SlayerTowerFloor`, `SlayerTask`, GameState-Felder, `MonsterDef.slayerFloor/slayerRequirement`, `ItemDef.slayerHelm`, optional `EquipBonus.slayerXpMult`), SAVE 36.
2. **engine/slayer.ts** [logic-dev]: `assignTask` (Master→50% Tower/Welt, N=rng-Spanne, XP/Punkte fix), `getActiveTask`, `skipTask`, `completeTask`, `recordKillForSlayer`, `slayerRequirementMet`, `spendSlayerPoints`.
3. **combat.ts** [combat-dev]: EIN Hook-Aufruf `recordKillForSlayer(...)` in `onEnemyDefeated` + Anforderungs-Gate (Hard-Block vs Soft-Penalty).
4. **persistence** [logic-dev]: Migration 35→36 + sanitize (Tasks mit unbekanntem Master/Monster → null).
5. **content** [content-dev]: 4–5 Master (Unlock-Bänder + Task-Pools), 5 Tower-Etagen + Monster-Roster, 5 Anforderungs-Items, Slayer-Helm, Unique-Drops, Punkte-Reward-Shop, Slayer-Skill-Def (`trains`?).
6. **UI** [ui-dev]: `SlayerPage` (geroutet wie FarmPage), Master-Tabs, Dialog-Panel (Porträt+Sprechblase), Task-Panel (Fortschritt, Anforderungs-Warnung, Skip/Cancel/Travel), Punkte + Reward-Shop, Tower-Etagen-Grid. Sidebar-Eintrag. i18n.
7. **Art** [asset]: 5 Master-Porträts `slayermaster_<id>.png`.

## 4. Content-Eckdaten (aus content-spec)
**Tower-Etagen:** 1 Pestkammern (L1-19) · 2 Spiegelhallen/Basilisken+Schreier (L20-39) · 3 Schmiedeabgründe/Feuer (L40-59) · 4 Flüsternde Leere (L60-79) · 5 Abyssaler Thron/Dämonen (L80-99). Je 3-4 tower-exklusive + 1-2 Welt-Mobs.
**Anforderungs-Items (5):** Seuchenmaske · Spiegelschutz · Ohrenstopfen · Seelenvorhang · Leerenstabilisator — je Craft-Quelle ODER Punkte-Shop (Early-Access).
**Slayer-Helm:** Smithing L80, Inputs = alle 5 Anforderungs-Items + tower-exklusive Mats + titanium_bar; epic; passiv = alle Anforderungen erfüllt + Stats + `slayerXpMult`.
**Unique-Drops:** Tower-Mats (Helm-/Craft-Senke) + legendäre Equip-Pieces (nicht craftbar, dürfen >epic): Slayer-Shroud (body), Void-Stalker-Blade (melee), Abyssal-Longbow (ranged), Soul-Reaver-Staff (magic) — auch über Punkte-Shop als Sicherheitsnetz.

## 5. 🟡 Offene Chef-Entscheidungen (konsolidiert)
1. **Anforderung ohne Item:** Hard-Block (kämpfen unmöglich) — *empfohlen* — vs. Soft-Penalty (Kill zählt nicht / Malus)?
2. **Anforderung erfüllt durch:** Besitz (Inventar/Bank) — *empfohlen, einfacher* — vs. nur ausgerüstet?
3. **Tower-Etagen-Wahl beim Task:** gewichtet zur höchsten freigeschalteten Etage vs. gleichverteilt über alle freigeschalteten?
4. **Skip/Cancel:** nur kostenpflichtiger Skip — *empfohlen* — oder zusätzlich kostenloser Cancel mit Streak-Reset? Streak-Punkte-Boni (OSRS-Milestones) schon in 1.0?
5. **Anzahl Master für 1.0** (Vorschlag **4–5**) + Namen: OSRS-Anlehnung vs. eigene Hearthforge-Originale.
6. **Slayer `trains`-Attribut:** con / lck / wis / keines?
7. **`towerTaskChance`:** global 50% (deine Vorgabe) oder pro Master justierbar?
8. **Slayer-Punkte als eigene Währung** + **`slayerXpMult`-Feld** (Helm) bestätigen? (beide *empfohlen ja*)
9. **dt. Skill-Name:** „Slayer" (englisch belassen) vs. „Totjäger"/o.ä.?
10. **Quick-Travel** vom Task zum Monster: `state.combatPreselect`-Feld vs. Navigations-Parameter?
11. **Tower-Monster** nur über die Tower-Etagen erreichbar, oder auch im normalen Combat sichtbar?

## 6. Scope & Phasen-Empfehlung
**Groß** (SAVE-Bump, neues Engine-Modul, Combat-Hook, viel Content, neue UI-Seite, 5 Porträts). Vorschlag:
- **Phase 1 (Kern):** Master + Tasks + 5 Tower-Etagen + XP/Punkte + Anforderungs-Items + ein paar Unique-Drops + SlayerPage-UI.
- **Phase 2:** Slayer-Helm, legendäre Equip-Drops, Streak-Milestones, Master-/Etagen-Politur, Porträts.

→ Sobald du Abschnitt 5 entscheidest, starte ich Phase 1 in der Reihenfolge aus Abschnitt 3 (shared→engine→combat→persistence→content→UI), `content/index.ts` seriell.
