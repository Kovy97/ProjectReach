// ───────────────────────────────────────────────────────────────────────────
// Zeit & Versionierung
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// Lokalisierung (Default Englisch, zusätzlich Deutsch)
// ───────────────────────────────────────────────────────────────────────────

export type Locale = "en" | "de" | "zh" | "ru" | "es" | "pt-BR" | "fr";
export const LOCALES: Locale[] = ["en", "de", "zh", "ru", "es", "pt-BR", "fr"];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Ein Text, der entweder einsprachig (Fallback) oder pro Sprache vorliegt. `en` ist PFLICHT
 * (Referenz-/Fallback-Sprache), alle anderen Locales sind optional — Content/UI-Text muss NICHT
 * sofort in allen 7 Sprachen vorliegen (7-Sprachen-Fundament, Task #252); fehlende Locales fallen
 * über `resolveText` auf `en` zurück. Vor Task #252 war dies `Record<Locale, string>` (alle Keys
 * PFLICHT) — mit 7 Locales hätte das ~2600 bestehende `{ en, de }`-Content-Literale gebrochen.
 */
export type LocalizedString = string | ({ en: string } & Partial<Record<Locale, string>>);

/** Löst einen LocalizedString in der gewünschten Sprache auf (mit en-Fallback). */
export function resolveText(value: LocalizedString, locale: Locale): string {
  if (typeof value === "string") return value;
  return value[locale] ?? value.en;
}

/**
 * Natürliche HP-Regeneration AUSSERHALB des Kampfes (Chef 2026-07-13): 1 % der Max-HP pro
 * Sekunde — nach einem Kampf füllt sich der Held von selbst wieder auf (voll in ≤100 s).
 * Gilt NUR idle (tick.ts); IM Kampf bleibt Heilung ausschließlich bei Food/hpRegenPerSec-Quellen
 * (der Kampf-Regen-Entscheid vom 2026-07-02 bleibt unberührt).
 */
export const OUT_OF_COMBAT_HP_REGEN_PCT = 0.01;

/** Fester Simulations-Tick. 100 ms = 10 Ticks/Sekunde. */
export const TICK_MS = 100;

/** Deckel für Offline-Fortschritt (8 h). */
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;

/** Save-Format-Version. Bei Breaking Changes erhöhen + Migration schreiben. */
// 42: Werkzeug-Equip-Slots (tool1/tool2). Alt-Saves füllt migrateState generisch aus EQUIP_SLOTS (→ null).
// 44: `activePlayMs` (aktive Spielzeit OHNE Offline-Catch-up). Alt-Saves: activePlayMs = elapsedMs (best effort).
// 45: `onboarding` (geführter Tutorial-Zustand). Alt-Saves: { active:false, step:0, done:true } (Veteranen
//     werden NICHT erneut ins Tutorial gezwungen). Neuer Save: { active:true, step:0, done:false }.
// 46: Stat-Squish ÷10 (design/stat-squish-spec.md, S=10): Content-/Formel-Skala ÷10. Persistierte
//     HP-Beträge werden migriert (character.hp ×0.1; combat.enemyHp ×0.1; DoT-Magnituden der
//     laufenden Status-Effekte ×0.1; petAbility.shieldHp ×0.1). Mana bleibt unskaliert (§3.4).
// 47: Attribut-Input-Squish a=1/2 (stat-squish-spec §6.2): persistierte baseAttributes ×0.5
//     (Basis 5→2.5, 0.5-Raster). Durch v48 wieder abgelöst.
// 48: Itemization 2.0 §1 (§6.2-Revert auf GANZZAHLIGE Attribute, design/itemization-2-spec.md):
//     Basis 2.5→3, Skill-Beitrag „+0.5 je 4 Level" → „+1 je 8 Level" (identische Rate),
//     ATTRIBUTE_INPUT_SQUISH entfällt. Migration: baseAttributes neu = 3 + max(0, round(alt − 2.5)).
// 49: Auto-Trank-System (Chef-Feature 2026-07-02): neues Feld `character.autoPotion`
//     { healPotionId, healThreshold, autoRebuffTonics }. Alt-Saves: Default AUS
//     (null / AUTO_POTION_DEFAULT_THRESHOLD / false). Im selben Zug wurde die NATÜRLICHE
//     HP-Regeneration entfernt (HP_REGEN_PER_TICK-Pfad gestrichen — Heilung nur noch über
//     Items/Effekte); dafür ist kein State-Feld betroffen.
// 50: Rüstungs-Trinität / Itemization 2.5 (design/armor-trinity-spec.md, Phase A1): neues
//     Feld `character.ward` (Absorptions-Pool des Stoff-Stils, analog hp/mana). Alt-Saves < 50
//     → ward = 0 (wird beim ersten computeStats/Kampfstart auf maxWard geklemmt/gefüllt).
//     `createCharacter` setzt ward:0, `createGame` finalisiert auf maxWard (wie hp/mana).
//     Rein additiv — keine Item-ID-Renames; die vier neuen ItemDef-Klassen-Schicht-Felder
//     (armorRating/blockChance/evasionRating/wardCapacity) + MonsterDef.defenseType leben nur
//     in der ContentDB (nicht im Save) und brauchen daher keinen weiteren Migrationszweig.
// 51: Armor-Iteration 2 (design/armor-iteration2-spec.md §9.1) — Kampf-Skill-Rename:
//     `magic_off`→`magic` (Offensiv-Magie, trainiert int) und `magic_def`→`warding` (Ward-Regen,
//     trainiert wis). Migration benennt die XP-Keys in `state.skills` um (XP/Level ERHALTEN, nur
//     der Key ändert sich). Das `ward`-Feld bleibt. Rein Key-Rename — keine Item-IDs betroffen.
//     (Die Skill-DEFINITIONEN in der ContentDB + die 131+ content-Referenzen benennt content-dev
//     in derselben Welle um; sie leben nicht im Save.)
// 52: Aktions-Collection-Log — neues Feld `seenActionDrops: Record<ActionId, ItemId[]>` (Spiegel
//     von `seenDrops` für Monster). Zeichnet je Aktion die bereits tatsächlich erhaltenen
//     Loot-Item-IDs auf, damit die UI unentdeckte Foraging-Drops als „???" maskieren kann. Rein
//     additiv — Alt-Saves defaulten auf `{}` (rückwirkend nicht rekonstruierbar). Keine Item-IDs
//     betroffen.
// 53: Inventar-Instanz-Tasche (#246): Item-Instanzen (verzaubert/gesuffixt) ziehen aus einzelnen
//     `slots` in eine unbegrenzte Tasche `inventory.instances`. Alt-Saves: Slot-Instanzen wandern
//     in die Tasche, der Slot wird geleert. Rein Umzug — keine Item-IDs betroffen.
// 54: Buy-Back-Liste (Shop-UX, Task #245): neues Feld `buyBack: BuyBackEntry[]` am GameState.
//     Verkaufte Items/Instanzen landen (FIFO, vorne, Länge ≤ BUYBACK_MAX_ENTRIES) in dieser Liste
//     und lassen sich zum Verkaufspreis zurückkaufen. Rein additiv — Alt-Saves defaulten auf `[]`
//     (leerer Puffer). Keine Item-IDs betroffen.
// 55: Auto-Eat-Schwellen-Slider (Chef-Feature 2026-07-06, analog Auto-Trank-Slider): neues
//     OPTIONALES Feld `character.autoEatThreshold` (HP-Anteil 0..1, Override der Ess-Schwelle —
//     NUR auf der Max-Auto-Eat-Stufe `AUTO_EAT_MAX_TIER` wirksam; darunter gilt weiter die feste
//     Tier-Schwelle). Alt-Saves (< 55) defaulten auf AUTO_EAT_DEFAULT_THRESHOLD (damals 0.8 =
//     Max-Tier-Verhalten → verhaltensneutral; seit Balance-Kette Schritt 4 ist die Konstante 0.7 —
//     Alt-Saves bekommen also den jeweils AKTUELLEN Default); sanitizeState klemmt (falls gesetzt) auf
//     [AUTO_EAT_MIN_THRESHOLD, AUTO_EAT_MAX_THRESHOLD]. Rein additiv — keine Item-IDs betroffen.
// 56: Polish-Sprint-Dreifach-Umbau (Task #271, Chef-Entscheidungen 2026-07-08):
//     (a) Pouch-/Taschenslot-System ENTFERNT — Kapazitäts-Upgrades laufen nur noch über den
//         Gold-Shop (`buySlotUpgrade`). `inventory.bagSlots` wird geleert (ausgerüstete Taschen
//         werden ersatzlos entfernt; die durch sie gewährte Kapazität entfällt). Items im
//         Überhang bleiben ERHALTEN (sanitizeState kürzt `slots` nie unter die belegten Slots;
//         nur neue Aufnahme ist begrenzt, bis wieder Platz frei ist). Das Item `small_pouch`
//         bleibt vorerst im Content (content-dev entfernt es in der Folge-Welle) — es ist nur
//         noch ein inertes Item ohne Mechanik.
//     (b) Auto-Salvage ENTFERNT — `settings.autoSalvage` wird aus Alt-Saves gelöscht (Feld nur
//         noch deprecated-optional für die UI-Übergangszeit); `intakeInstance` behält jetzt
//         IMMER. Der Gear-Vault (`bankInstances`) bleibt als BEWUSSTES Bank-Feature erhalten
//         (depositInstance/withdrawInstance) — nur der Salvage-Pfad verschwindet.
//     (c) Quest-Tokens NEU — `character.questTokens: number` (analog `gold`), `QuestDef.tokenReward`
//         schreibt beim Claim gut. Alt-Saves defaulten auf 0. Keine Item-IDs betroffen.
// 57: Munitions-System KOMPLETT ENTFERNT (Task #286 Stage A, Chef-GO 2026-07-08; Bögen tragen den
//     Pfeilschaden seit dem Waffen-Kurven-Pass #287 eingebacken — Pfeile existieren künftig gar
//     nicht mehr als Items, Stage B löscht sie aus dem Katalog):
//     (a) EquipSlot "ammo" (Köcher) ist aus EQUIP_SLOTS raus — `equipment.ammo` verschwindet aus
//         dem Save-Shape (das equipment-Record wird beim Laden ohne den Key neu aufgebaut).
//         Ausgerüstete Alt-Munition verfällt ERSATZLOS (Chef-Entscheid: „Wir brauchen auch gar
//         keine Pfeile generell mehr im Spiel"); als faire Geste wird der VERKAUFSWERT des
//         Köcher-Stacks (value × SELL_FRACTION je Stück, floor) als Gold gutgeschrieben.
//         `GameState.ammoCount` wurde im Stage-C-Finale komplett aus dem Typ entfernt
//         (sanitize löscht den Alt-Key restlos aus geladenen Saves).
//     (b) Fletching-Skill stirbt: `skills.fletching` wird VERLUSTFREI in `skills.leatherworking`
//         gemergt (die im Spiel als „Crafting"/„Handwerk" angezeigte Fertigkeit; XP addieren,
//         fletching-Key löschen — string-basiert, contentunabhängig). Mastery-Einträge der
//         fletch_*-Aktionen bleiben STEHEN; Stage B mappt die Aktionen nach Crafting und trägt
//         das Mapping in den neuen generischen ACTION_RENAME-Pfad (persistence) ein.
//     (c) Keine sonstigen Item-ID-Renames. Die ItemDef-Felder ammoType/ammoDamage/ammo sind mit
//         Stage B (Katalog-Löschung) + dem Stage-C-Finale komplett aus dem Typ entfernt.
// 58: Bestiarium-Sammlungs-Fundament (Chef-GO 2026-07-09): neues Feld
//     `discoveredItems: Record<ItemId, true>` — Erst-Besitz-Marker je Item (Set-Semantik als
//     Record, JSON-freundlich). Markiert an den ZENTRALEN Zugangs-Pfaden (addItemOrBank,
//     intakeInstance, Shop-Kauf/Buy-Back, createGame-Starter) — die UI maskiert unentdeckte
//     Drops als „???" (Bestiarium/Item-Wiki). Alt-Saves: migrateState defaultet leer; sanitize
//     unioniert den IST-BESTAND (Inventar+Bank+Equipment+Instanzen) bei JEDEM Load nach
//     (Backfill + Selbstheilung, idempotent). `monsterKills` (Kill-Zähler je Monster) existiert
//     bereits seit dem Bestiarium-Grundstein — v58 ergänzt nur seine sanitize-Härtung
//     (unbekannte Monster-IDs strippen, Werte endlich/≥0/ganzzahlig). Keine Item-ID-Renames.
// 59: Meisterweihe-Fundament (Level-99-Belohnung, design/master-capes-konzept.md, Chef-GO
//     2026-07-09): drei neue Felder `masteryCapes` / `capeGranted` / `capeCeremonySeen`
//     (je Record<SkillId, true>, Set-Semantik wie discoveredItems; sanitize strippt unbekannte
//     Skill-IDs, normalisiert auf strikt true und erzwingt granted/seen ⊆ masteryCapes).
//     Migration: Alt-Saves (< 59) mit bestehenden 99er-Skills bekommen den Weihe-Marker
//     RÜCKWIRKEND (fair — die Leistung ist erbracht); `capeCeremonySeen` bleibt dabei BEWUSST
//     leer, die Zeremonien werden beim ersten Login nachgefeiert (UI staffelt sie über
//     `pendingCapeCeremonies`, engine/capes.ts). Die Cape-Items (`masterCapeItemId(skillId)` =
//     `cape_master_<skillId>`) existieren zum Bump-Zeitpunkt noch NICHT im Content — die
//     VERLEIHUNG reicht `grantPendingCapes` (engine/capes.ts) nach, sobald content-dev sie
//     liefert (läuft in sanitize UND je advance; idempotent über `capeGranted`). Dazu NEU, aber
//     NUR ContentDB (kein Save-State, daher migrationsfrei): `ItemDef.masterPerk` — die 8
//     Ökonomie-Perk-Kinds der Meisterumhänge, additiv zu den Pet-Passiva verdrahtet.
//     Keine Item-ID-Renames.
// 60: Dungeon-Einmal-Unlock (Dungeon-Rework-Spec Kopf-Block, CHEF-ENTSCHEID 2026-07-09 —
//     „Schlüssel einmalig finden zum Dungeon entsperren"): neue Felder
//     `dungeonsUnlocked: Record<DungeonId, true>` (Set-Semantik wie discoveredItems; permanenter
//     Zutritt, Eintritt verbraucht KEINE Schlüssel mehr) und `lastDungeonUnlock` (UI-Breadcrumb,
//     Muster lastPetDrop). Schlüssel-Items werden zu reinen Unlock-Tokens: der zentrale
//     Zugangs-Pfad (addItemOrBank, inventory.ts) fängt sie ab — Fund entsperrt alle Dungeons mit
//     diesem `keyItem` (Schlüssel verschwindet); ist alles schon entsperrt, wird der Verkaufswert
//     (floor(value × SELL_FRACTION) je Stück, Köcher-Präzedenz #286) als Gold erstattet.
//     Migration/sanitize (persistence): (a) bereits geclearte Dungeons (`dungeonsCleared[id] > 0`)
//     ⇒ entsperrt (läuft als Invariante bei JEDEM Load); (b) Alt-Schlüssel im Besitz
//     (Inventar+Bank) entsperren ihren Dungeon (1 Schlüssel je Schlüssel-ART wird dabei
//     „verbraucht"), ALLE Schlüssel werden entfernt, der Rest zum Verkaufswert erstattet —
//     idempotent, läuft als Selbstheilung ebenfalls bei jedem Load; (c) sanitize strippt
//     unbekannte Dungeon-IDs und normalisiert auf strikt true. Keine Item-ID-Renames.
// 61: Paragonturm (dungeon-rework-spec §7, Welle P1): neue Felder `state.paragon`
//     ({ checkpoint, best } — Etagen-Checkpoint + Prestige-Rekord, Default { 0, 0 }) und
//     `combat.paragonFloor?` (aktive Etage eines laufenden Turm-Kampfs; undefined = keiner).
//     Migration: Alt-Saves → defaultParagonState(); paragonFloor bleibt undefined. sanitize:
//     Finites/Ganzzahlen klemmen, Invarianten best ≥ checkpoint und paragonFloor === checkpoint+1
//     (sonst Etage strikt beenden — Checkpoint bleibt, kein Verlust). Keine Item-ID-Renames.
// 62: Bereichs-Touren (Onboarding-Ausbau 2026-07-13): neues Feld `onboarding.toursSeen`
//     (Record<string, true>, Keys UI-definiert). Alt-Saves → leer. Keine Item-ID-Renames.
// 63: Story-Zonen-Gating (Aschechronik, ceo-run-2026-07-13 Welle C): neues Feld
//     `legacyZoneGrants: Record<zoneId, true>` — Bestandsschutz-Freischaltungen für quest-gesperrte
//     Kampf-Zonen (`ZoneDef.requiresQuest`, Gate-Logik engine/zones.ts `isZoneUnlocked`).
//     Migration: Alt-Saves (< 63) erhalten ALLE zum v62-Zeitpunkt existierenden Kampf-Zonen als
//     Grant (harte, in persistence EINGEFRORENE ID-Liste — NICHT zur Laufzeit aus content gelesen,
//     damit die Migration deterministisch bleibt, wenn Content später wächst; der künftige
//     Endkampf-Dungeon „behind_the_throne" steht NICHT auf der Liste). Frische Saves (createGame):
//     leer. sanitize: strikte true-Map (Muster toursSeen, Keys ≤ 64 Zeichen), BEWUSST ohne
//     content.zones-Abgleich (Grants überleben Content-Drift — Leitplanke „NIE Zugriff verlieren").
//     Keine Item-ID-Renames.
// 64: Quest-basierter Dungeon-Unlock (ceo-run-2026-07-13 Welle J, Chef-Direktive: „Keine Dungeon
//     keys mehr, sondern quest based unlock"): KEIN neues State-Feld — der Bump friert den
//     Systemwechsel ein. Neues Content-Gate `DungeonDef.requiresQuest?` (analog ZoneDef, Welle C);
//     `keyItem`/`keysPerRun` sind deprecated (Engine wertet sie NICHT mehr aus, der
//     addItemOrBank-Schlüssel-Intercept ist entfernt). EINZIGE Ausnahme: der Paragonturm
//     (PARAGON_KEY_ITEM_ID → PARAGON_DUNGEON_ID) bleibt eigenes Einmal-Unlock-System.
//     Migration (< 64): Alt-Schlüssel im Besitz (Inventar-plain-Stacks + Bank; EINGEFRORENE
//     Schlüssel→Dungeon-Zuordnung in persistence, OHNE paragon_key) tragen ihren Dungeon als
//     Bestandsschutz in `dungeonsUnlocked` ein, die Bestände werden ENTFERNT und VOLL erstattet
//     (qty × item.value — großzügiger als der alte SELL_FRACTION-Sweep: das Zutrittsrecht kommt
//     jetzt von der Quest, der Schlüssel ist nur noch Geld; kein UI-Breadcrumb — der Systemwechsel
//     migriert still). Der versions-UNGEGATETE Alt-Schlüssel-Sweep aus v60 entfällt dafür (nur
//     paragon_key behält seine „nie im Besitz"-Invariante); Story-Schlüssel aus der kurzen
//     Übergangsphase (bis Welle K die Drops/Gates nachzieht) bleiben gewöhnliche, verkaufbare
//     Items. Keine Item-ID-Renames.
// 65: Pet-Drop-Feiern (Welle DD, Fun-Sweep pets-fenn Top-1 „Kein Drop darf je stumm sein"): neues
//     Feld `petDropSeq: number` — monotoner Lebenszeit-Zähler aller Pet-Drops und die EINZIGE
//     Quelle der `lastPetDrop.seq`-Werte. Vorher leitete tryPetDrop die seq aus
//     `(lastPetDrop?.seq ?? 0) + 1` ab; da die UI den Breadcrumb nach Anzeige mit null quittiert,
//     begann jeder weitere Drop derselben Session wieder bei 1 und blieb unter der
//     seenSeq-Hochwassermarke der UI stumm. petDropSeq wird NIE genullt oder gesenkt.
//     Migration (< 65): petDropSeq = lastPetDrop?.seq ?? 0. sanitize (jeder Load): Monotonie-
//     Invariante petDropSeq ≥ lastPetDrop.seq erzwingen, NaN/negativ → 0. Dazu (transient,
//     KEIN Save-Feld, KEIN Bump-Anteil): `OfflineSummary.petDrops` — offline gedroppte Pet-IDs,
//     chronologisch. Keine Item-ID-Renames.
// 66: AP-Meilensteine + Slayer-Streak (Welle GG, Fun-Sweep-Chef-GO: collection-pip P1 +
//     slayer-vesna V2). SIEBEN neue Felder:
//     (a) `claimedApMilestones: number[]` — die bereits vergebenen 5-%-AP-Schritte (5..100,
//         Vielfache von AP_MILESTONE_STEP_PCT). Claimed bleibt claimed, auch wenn Content-Wachstum
//         die Quote wieder senkt (kein Neuberechnen, kein Rückzug).
//     (b) `apMilestoneSeq: number` — monotoner Lebenszeit-Zähler der Meilenstein-Vergaben und die
//         EINZIGE Quelle von `lastApMilestone.seq` (Lehre aus Welle DD: seq NIE aus dem nullbaren
//         Breadcrumb ableiten). Wird NIE genullt oder gesenkt.
//     (c) `lastApMilestone: { steps; tokens; seq } | null` — UI-Breadcrumb (Muster lastPetDrop);
//         `steps` = alle in DIESER Vergabe nachgeholten Schritte (Alt-Save-Stapel), `tokens` = Summe.
//     (d) `apCeremonyPending: boolean` — Zeremonie-Flag bei 100 % AP (UI rendert die große Feier
//         und quittiert mit false).
//     (e) `slayerStreak: number` — aktuelle Serie abgeschlossener Slayer-Tasks; bezahlter Skip
//         bricht auf 0, die Gratis-Gnade (effectiveSkipCost 0 unter SLAYER_SKIP_FREE_BELOW_LEVEL)
//         bricht NICHT.
//     (f) `slayerStreakSeq: number` — monotoner Zähler der Streak-Bonus-Vergaben (analog b).
//     (g) `lastSlayerStreakBonus: { streak; tokens; points; seq } | null` — UI-Toast-Breadcrumb.
//     Migration (< 66): claimed-Liste leer, Zähler/Streak 0, Breadcrumbs null, Flag false.
//     Keine Item-ID-Renames.
// 67: Auto-Aufstieg im Paragonturm (Welle JJ, Fun-Sweep-Chef-GO: paragon-aldric A2): neues
//     Settings-Feld `settings.autoParagonAscend: boolean` (Default false, Opt-in-Komfort) —
//     bei aktivem Toggle startet ein siegreicher Etagen-Abschluss sofort die nächste Etage
//     (onParagonFloorCleared ruft denselben startParagonFloor-Pfad wie der manuelle Klick:
//     voller Ward-Init, KEIN RNG-Draw). Tod im Turm und manuelles Verlassen stoppen die Kette
//     natürlich (beide räumen paragonFloor, der Auto-Start hängt am Clear-Pfad); der
//     Offline-Catch-up hat automatisch dieselbe Semantik (identischer Kill-Pfad via combatStep) —
//     mit Toggle AN chained der Turm also auch offline, mit Toggle AUS bleibt die
//     Offline-Neutralität (höchstens die laufende Etage) bit-identisch erhalten.
//     Migration (< 67): Feld fehlt → false; Härtung bei JEDEM Load: Nicht-boolean → false
//     (Muster autoBank). Dazu im selben Zug, aber KEIN State-Feld/kein Migrations-Anteil:
//     neuer AchievementConditionType "paragon_floor" (count = geforderte Etage, Fortschritt =
//     state.paragon.best — rein aus einem Bestandsfeld gelesen). Keine Item-ID-Renames.
// 68: Paragon-Truhen-Breadcrumb (Welle LL, Fun-RETEST paragon-aldric P1 „Meilenstein-Truhe ohne
//     sichtbares Feedback"): ZWEI neue Felder —
//     (a) `paragonChestSeq: number` — monotoner Lebenszeit-Zähler der Truhen-Vergaben und die
//         EINZIGE Quelle von `lastParagonChest.seq` (Muster petDropSeq/apMilestoneSeq).
//         Wird NIE genullt oder gesenkt.
//     (b) `lastParagonChest: { floor; chestTier; items; seq } | null` — UI-Breadcrumb (Muster
//         lastPetDrop), gesetzt in rollParagonChest (engine/paragon.ts) bei JEDER Vergabe (auch
//         Auto-Aufstieg/Offline-Chaining). KUMULIER-Semantik bei unquittiertem Vor-Breadcrumb:
//         items werden je Item-ID aufsummiert (AP-Stapel-Geist), floor/seq = letzte Truhe,
//         chestTier = Maximum.
//     Migration (< 68): Zähler 0, Breadcrumb null. sanitize (jeder Load): Shape-Härtung
//     (floor ganzzahlig 1..PARAGON_MAX_FLOOR, items nur bekannte Item-IDs mit qty ≥ 1) +
//     Monotonie-Invariante paragonChestSeq ≥ lastParagonChest.seq. Dazu im selben Zug, aber
//     KEIN Save-Feld/kein Bump-Anteil: (i) `OfflineSummary.achievementsEarned`/`achievementIds`
//     (transient — offline verdiente Achievements fürs „Während du weg warst"-Popup),
//     (ii) items_discovered-Achievements lesen jetzt die MONOTONE Wahrheit `discoveredItems`
//     statt der sinkbaren Besitz-Union (Fortschritt kann nie mehr durch Verkauf fallen),
//     (iii) Slayer-Turm-Fenster bekommt eine untere Kampf-Level-Kante (slayer.ts, kein State).
//     Keine Item-ID-Renames.
// 69: Meister-RINGE statt Meister-Capes (Chef-Entscheid 2026-07-17, Memory skill-99-ring-statt-
//     cape; ceo-run-2026-07-13 Chef-Nachtrag 17.07.): die 21 Level-99-Belohnungs-Items werden von
//     Umhängen zu legendären Ringen — Item-ID-RENAME `cape_master_<skillId>` →
//     `ring_master_<skillId>` (inkl. cape_master_completion → ring_master_completion),
//     Slot-Wechsel "cape" → "ring1"; Stats/Perks/requirements/value bleiben 1:1 (KEIN
//     Balance-Eingriff — nur Slot/Name/Beschreibung/Art ändern sich). ID-Konvention neu
//     `masterRingItemId(skillId)`; `masterCapeItemId` bleibt als deprecated Alias stehen, bis
//     die UI umgestellt ist. Die Weihe-Marker-Felder masteryCapes/capeGranted/capeCeremonySeen
//     behalten BEWUSST ihre Namen (reine Skill-Marker ohne Item-Bezug — ein Feld-Rename wäre
//     reines Migrationsrisiko ohne Spielerwert). Migration (persistence):
//     (a) die 21 Renames laufen über den generischen RENAME-Pfad (inventory.slots, equipment,
//         food, buffs, bank) und werden für diese IDs ERWEITERT auf Instanz-baseItemIds
//         (inventory.instances/bankInstances/equippedInstances), das Buy-Back-Regal und
//         discoveredItems-Keys (Entdeckung/Buy-Back gehen nicht verloren);
//     (b) ein GETRAGENER Meister-Umhang steckt nach dem Rename im falschen Slot → er wandert
//         beim Load in den Ring-Slot (ring1 frei? sonst ring2), sind beide belegt via
//         addItemOrBank ins Inventar (Überlauf → Bank; direkter Bank-Eintrag als letzte
//         Rettung — KEIN Verlust-Fenster). Eine getragene INSTANZ (verzaubertes Cape) zieht
//         mitsamt Affixen/Suffix um (Slot frei) bzw. in den Gear-Vault (bankInstances).
//     Un-gegated & idempotent (die Alt-IDs existieren im Content nicht mehr).
//     NEU im selben Zug (Chef-gebilligt): `ring_master_enchanting` als GEPARKTES Content-Item —
//     ein Enchanting-SKILL existiert noch nicht (enchantment-system-rework-spec §Offene-Fragen:
//     Runecrafting-Umwidmung vs. neuer Skill, Chef-Entscheid offen). Bis zur Enchanting-Skill-
//     Welle ist das Item unerhältlich (keine Quelle, benannte wiring-audit-Ausnahme) und
//     unequipbar (requirement runecrafting 100 — bewusst unerreichbar, hält es aus den
//     BiS-Envelopes); die Verleihung greift automatisch über die masterRingItemId-Konvention,
//     sobald der Skill existiert. Kein Save-State-Anteil.
//     DREI Chef-Nachträge im selben Bump (2026-07-18, Live-Funde am eigenen Save):
//     (a) VERGABE-HÄRTUNG: grantPendingCapes (engine/capes.ts) stellt jetzt GARANTIERT zu —
//         kommt das Item über addItemOrBank nirgends unter (Inventar voll + Auto-Bank aus/
//         Bank-Arten erschöpft), wandert es DIREKT in den Bank-Record (strukturell immer
//         Platz; Muster sanitize-Slot-Rettung). Kein Pending-/Verlust-Fenster mehr.
//     (b) SHOP-SICHERHEITSNETZ: verlorene Meisterringe sind im Laden wiederbeschaffbar —
//         engine/shop.ts `masterRingShopEntries(state, content)` (Bedingungen: Ring wurde je
//         verliehen [`capeGranted`] && nirgends mehr besessen [Inventar+Instanzen, Bank+Vault,
//         angelegt, Buy-Back]) + `buyMasterRing(state, content, itemId)`; Preis =
//         `masterRingShopCost` = voller Item-value (Verkauf zahlt max. 0,525·value inkl.
//         Pet-Bonus ⇒ nie eine Gold-Pumpe). Bereits VOR dem Update verlorene Capes werden
//         NICHT automatisch nachgeliefert (Chef-Entscheid: der Verkauf war legitimes Gold) —
//         der Shop deckt sie ab. Reine Engine-Logik, KEIN neues Save-Feld.
//     (c) STACK-CAP 999 → 9999 (engine/inventory.ts MAX_STACK — einzige Klemmstelle; Bank ist
//         ein Record ohne Stapel-Semantik): „jedes Item braucht maximal 1 Stapel". Migration
//         konsolidiert bestehende Teil-Stapel desselben Items (erster Stapel behält seine
//         Position, Folge-Stapel laufen bis MAX_STACK zusammen, geleerte Slots → null).
//     NACHTRAG ohne Bump (Welle TT, Chef-Entscheid 2026-07-18 „Enchanting geht in Runecrafting
//     mit rein"): der bei 69 GEPARKTE `ring_master_enchanting` ist ERSATZLOS aus dem Content
//     entfernt — es kommt nie ein Enchanting-Skill (Verzauberungs-Progression = Runecrafting,
//     enchantment-system-rework-spec §F entschieden). Das Item war zu keinem Zeitpunkt
//     erhältlich (keine Quelle, capeGranted für einen nicht-existenten Skill nie true,
//     requirement runecrafting 100 unerreichbar) ⇒ kein Save kann es enthalten, KEINE
//     Migration nötig (Guards: master-ring-shop.test.ts + capes.test.ts Live-Content-Detektor).
// v70 (Action-Queue, Welle Queue): neues Feld `actionQueue: QueuedAction[]` — vorgeplante
//     Aktivitäten mit Zielmengen; ist die aktive Aktion fertig (Ziel erreicht / kein Material),
//     startet die Engine automatisch die nächste (advanceActionQueue). Migration
//     default-initialisiert das Feld auf [] (Muster actionTarget, persistence index.ts:1717);
//     sanitizeState säubert das Array (nur existierende actionIds, target null oder positiv-endlich).
// v71 (Postfach/Mailbox, Überlauf-Puffer): neue Felder `mailbox: MailMessage[]` (Default []) +
//     `mailSeq: number` (Default 0, deterministische Mail-ID-Vergabe). Loot, der bei vollem Inventar
//     (und, bei Auto-Bank, vollem Lager) sonst verloren ginge, wandert jetzt in EINE stehende
//     `kind:"overflow"`-Mail (grantLoot/grantLootInstance, engine/mail.ts) — die Sammel-/Craft-Aktion
//     läuft weiter (der `inventory_full`-Loot-Stopp entfällt; `no_materials` bleibt). Migration
//     default-initialisiert beide Felder (Muster actionQueue); sanitizeState säubert die Mailbox
//     (nur bekannte itemIds, positive qty, gültige Instanzen; Nicht-Array → []) und erzwingt
//     `mailSeq > max(createdSeq)`. Das `inventory_full`-Literal bleibt im `lastStop`-Typ (Alt-Saves).
// v72 (Elite-/World-Spawns „Champions des Reach", design/elite-spawns-concept.md, Phase 1 —
//     verhaltens-neutrales Fundament, logic-dev): VIER neue Felder —
//     (a) `eliteRng: RngState` — zweiter, von `rng` UNABHÄNGIGER mulberry32-Strom (Muster `rng`).
//         ALLE Würfe des Elite-Systems (Zonen-Cooldowns, Varianten-Wahl, Fenster-Varianz, Unique-
//         Suffix-Roll, extraLoot) laufen AUSSCHLIESSLICH hierüber — NIE über `rng`, damit die
//         normale Skilling-/Kampf-Loot-Sequenz bit-identisch bleibt, ob Elites aktiv sind oder nicht.
//     (b) `eliteZones: Record<string, EliteZoneState>` — je Kampf-Zonen-ID „Ruhe" (`{cooldownMs}`)
//         oder „Aktiv" (`{variantId, remainingMs}`); tickt NUR online (`tickEliteSpawns`,
//         engine/tick.ts `step()` hinter dem `offline`-Guard) — der Offline-Catch-up ist für den
//         Zyklus ein kompletter No-op (ein BEREITS laufender Elite-Kampf ist davon unabhängig und
//         kann offline zu Ende gekämpft werden, s. combat.ts).
//     (c) `eliteSpawnSeq: number` — monotoner Lebenszeit-Zähler aller Spawns (Muster petDropSeq).
//     (d) `lastEliteSpawn: { zoneId; variantId; seq } | null` — UI-Toast-Breadcrumb (Muster
//         `lastPetDrop`; der Toast selbst ist Phase 3/ui-dev).
//     Dazu `CombatState.eliteVariantId?: string` (aktiver Elite-Kampf, Muster `paragonFloor`) und
//     `ContentDB.elites?: Record<string, EliteVariantDef>` (Phase 1 LEER — content-dev befüllt sie
//     in Phase 2; ohne Einträge spawnt nie ein Elite, das Feature ist verhaltens-neutral).
//     Migration (< 72): `eliteRng` deterministisch aus dem bereits geladenen `rng.state` abgeleitet
//     (`deriveEliteRngSeed`, engine/elites.ts — LIEST nur, konsumiert `rng` NICHT); `eliteZones` im
//     selben Zug GESTAFFELT befüllt (`initEliteZonesStaggered` — Zone i erhält ihr eigenes Cooldown-
//     Band, verhindert Clustering; s. ZWEITEN Nachtrag unten für die per-Zone-Bänder/Früh-Haken-
//     Feinschliff); `eliteSpawnSeq` 0, `lastEliteSpawn` null. sanitizeState härtet
//     `eliteRng` (Muster `rng`), `eliteZones` (strikte Shape-Härtung, unbekannte Zonen-Keys toleriert
//     — Muster `legacyZoneGrants`; ein aktiver Eintrag mit unbekannter `variantId` → Ruhe statt Crash)
//     und die `lastEliteSpawn`/`eliteSpawnSeq`-Monotonie-Invariante (Muster `lastApMilestone`). Neues
//     Vault-Pin-Fixture `v72-release-*.json`. Keine Item-ID-Renames.
//     NACHTRAG (selber Bump, Chef-Balance-Feinschliff 2026-07-22, design/elite-balance-spec.md):
//     KEIN weiterer Save-Shape-Wechsel (nur Formel-/Konstanten-Feinschliff) —
//     (i) `EliteVariantDef.enrageDamageMultOverride?` (Content-Feld, Spike-Kill-Schutz bei vererbtem
//     Boss-`enrage`); (ii) per-Zone-Cooldown-Bänder (`ELITE_ZONE_COOLDOWN_BANDS`/
//     `eliteZoneCooldownBand`) ersetzen das ursprüngliche globale [60,120]-Min-Band; (iii) das
//     Verfügbarkeitsfenster ist FEST 15 Min (keine Varianz mehr); (iv) frische Saves (createGame)
//     initialisieren `eliteZones` über die Früh-Haken-Formel (`initEliteZonesEarlyHook`) statt des
//     reinen Band-Rolls — Migrationen von Alt-Saves (< 72) bleiben beim normalen, staffelnden
//     Band-Roll (`initEliteZonesStaggered`, KEIN Früh-Haken für Bestandsspieler).
//     ZWEITER NACHTRAG (selber Bump, Chef-Korrektur 2026-07-22): der Elite-Unique ist KEIN
//     Garantie-Drop mehr — neues Content-Feld `EliteVariantDef.uniqueDropChance?` (Default
//     `ELITE_UNIQUE_DROP_CHANCE_DEFAULT` 0,2), über `state.eliteRng` gewürfelt. Der Wurf feuert
//     IMMER (auch bei 0/1) — NIE chance-bedingt übersprungen —, damit die eliteRng-Sequenz nicht
//     vom konkreten Chance-Wert abhängt (Sequenz-Stabilität über Content-Feintuning hinweg). Kein
//     Save-Shape-Wechsel.
//     DRITTER NACHTRAG (selber Bump, Chef-GO 2026-07-22 „Identitäts-Paket"): Früh-Garantie-Suffix —
//     neues Feld `firstSuffixGranted: boolean`. Der erste Equipment-Drop/-Craft eines neuen
//     Spielstands, der strukturell einen Suffix tragen könnte, rollt GARANTIERT einen (Choke-Point
//     `tryCraftSuffix`, engine/suffix.ts — deckt Kill-Loot/Crafting-Output/Paragon-Truhen ab). KEIN
//     zusätzlicher RNG-Zug ggü. dem Normalpfad (die Garantie hebt nur den Chance-Vergleichswert auf
//     1 an — rollSuffix zieht seine drei Rolls unverändert). Migration (< 72, Feld fehlt): `true`
//     (Bestandsspieler bekommen KEINE nachträgliche Garantie); `createGame`: `false`. sanitizeState
//     härtet striktes boolean, Nicht-boolesche Werte konservativ → `true` (kein Wiederhol-Exploit
//     über Save-Edits). Kein Save-Shape-Wechsel jenseits des einen neuen Feldes.
//     VIERTER NACHTRAG (selber Bump, Spieler-Feedback „komisch, 2 ausgerüstet + 1 im Inventar",
//     Chef-GO): dritter Werkzeug-Slot `tool3` — `EQUIP_SLOTS` um `"tool3"` erweitert (Muster
//     tool1/tool2, §42 oben), `equipTool`s `TOOL_SLOTS` entsprechend (engine/equipment.ts). Reines
//     Ordnungs-/QoL-Feature — KEIN Mechanik-Buff: `bestToolSpeed` (engine/tools.ts) scannte schon vor
//     diesem Bump generisch `Object.values(state.character.equipment)` UND das komplette Inventar,
//     ein drittes Werkzeug wirkt in tool3 exakt so wie lose im Inventar. KEIN dedizierter
//     migrateState-Zweig nötig — der bestehende generische EQUIP_SLOTS-Fill (migrateState:
//     `for (const slot of EQUIP_SLOTS) equip[slot] = oldEquip[slot] ?? null`) füllt einen fehlenden
//     `tool3`-Key bei Alt-Saves automatisch auf `null`, exakt wie beim v42-Erstbau der Tool-Slots.
//     sanitizeStates Slot-Whitelist (`slotAccepts`, persistence/index.ts) um `tool3` erweitert, sonst
//     hätte ein dort getragenes Werkzeug jeden Load in die Bank „gerettet". v72-Vault-Pin
//     (`v72-release-0.1.0.json`) neu erzeugt (jetzt mit `tool3: null` im Equipment-Record — die
//     Byte-Identitäts-Prüfung des Release-Pins verlangt den zusätzlichen Key). Keine Item-ID-Renames.
//     FÜNFTER NACHTRAG (selber Bump, „Jagd-Paket" — erweitert die Champions des Reach, Chef-GO
//     2026-07-22, Kontext design/elite-spawns-concept.md): VIER Bausteine, EIN neues PERSISTIERTES
//     GameState-Feld (`eliteCodex`) + EIN neues TRANSIENTES CombatState-Feld (`eliteFightStartMs`,
//     s. (S2/M) unten — nicht persistiert, daher kein zweiter Save-Shape-Eintrag).
//     (S1) Segen-Synergie: an einem bloodmoon-Tag steigt die effektive `uniqueDropChance` eines
//         erlegten Elites um `ELITE_BLOODMOON_UNIQUE_BONUS` (absolut, 0,2→0,25 bei der Default-
//         Chance) — der Drop-Chance-WURF selbst feuert weiter IMMER (Sequenz-Stabilitäts-Disziplin,
//         s. `onEliteKilled`-Doku), nur der Vergleichswert ändert sich. An einem wildhunt-Tag ticken
//         die Zonen-RUHE-Cooldowns `ELITE_WILDHUNT_COOLDOWN_SPEED_MULT`× schneller herunter (reiner
//         Multiplikator auf den TICK_MS-Dekrement, kein RNG-Zug, wirkt NICHT auf das aktive
//         15-Min-Fenster). `onEliteKilled`/`tickEliteSpawns` (engine/elites.ts) bekommen dafür ein
//         optionales `nowMs`-Argument (Muster `combatStep`/`skillingStep` — fehlt es, ist der Effekt
//         neutral, bit-identisch zum Vorher-Zustand). KEIN Save-Shape-Wechsel (reine
//         Konstanten + Parametrisierung bestehender Funktionen).
//     (S2/M) Champion-Codex: NEUES Feld `eliteCodex: Record<string, EliteCodexEntry>` — je
//         `EliteVariantDef.id` `{ sightings, kills, uniques, fastestKillMs }`. `sightings` zählt
//         JEDEN Spawn (`spawnElite`), `kills`/`uniques` JEDEN Elite-/Unique-Kill (`onEliteKilled`),
//         `fastestKillMs` die kürzeste bislang gemessene Kampfdauer (`null` = noch nie gemessen).
//         Die Kampfdauer misst `CombatState.eliteFightStartMs?: number` (NEU, aber TRANSIENT — NICHT
//         persistiert, Muster `lastKill`/`effectCounters`: der Load-Pfad baut `combat` über eine
//         Feld-Whitelist neu auf, die dieses Feld NICHT enthält; ein mitten im Kampf gespeicherter
//         Elite-Fight verliert seinen Startzeitpunkt beim Reload — `fastestKillMs` bleibt dann für
//         DIESEN einen Kill unverändert, kein Crash/keine Fehlmessung). Migration (Feld fehlt):
//         `{}`. sanitizeState härtet Struktur (endliche Ganzzahlen ≥ 0, `fastestKillMs` endlich ≥ 0
//         oder `null`) und TOLERIERT unbekannte variantIds (Content-Drift-Leitplanke, Muster
//         `eliteZones`/`legacyZoneGrants` — ein später entfernter Elite behält seine Codex-Statistik).
//     (S3) Kopfgeld: `ELITE_BOUNTY_TOKENS` (Default 1, bewusst konservativ — Chronik-Quests zahlen
//         2–3, Champions kommen ~1/h) fließt bei JEDEM Elite-Kill zusätzlich in
//         `character.questTokens` (Feld existiert bereits seit v56). BEWUSST OHNE eigenen
//         `CombatEvent.kind` (der Kill-Log ist ein UI-Renderer-Vertrag außerhalb des Engine-
//         Reviers — `CombatPage.tsx eventText` schaltet exhaustiv über `kind`, ein neuer
//         Literal-Wert bräche dessen Kompilierung ohne einen begleitenden UI-`case`; ui-dev
//         müsste ihn ergänzen, bevor ein neuer `kind` sicher landen kann). Sichtbarkeit
//         übernimmt vorerst das bereits vorhandene Kopfgeld-Brett (Task 1, BountyBoard.tsx) —
//         die Vergabe selbst bleibt voll wirksam (`character.questTokens` steigt sofort sichtbar
//         im HUD). KEIN Save-Shape-Wechsel (kein neues Feld, `questTokens` existiert bereits).
//     (L) Raben-Post: `MailMessage` (v71) zum ECHTEN Discriminated Union erweitert —
//         `kind: "letter"` trägt zusätzlich `from: "brenna" | "warden"` und `textKey: string`
//         (i18n-SCHLÜSSEL, sprachneutral im Save, NIE Rohtext); das optionale Geschenk liegt
//         BEWUSST in denselben `items`/`instances`-Feldern wie eine Überlauf-Mail (kein separates
//         `attachments`-Feld — ein Brief ist strukturell eine Überlauf-Mail plus `from`+`textKey`,
//         damit bestehender Renderer-Code, der generisch über `mail.items`/`mail.instances`
//         iteriert [z. B. MailPage.tsx], unverändert für JEDE Mail-Art gilt). `engine/mail.ts`
//         `sendLetter` mintet id/createdSeq wie die Überlauf-Mail (`mintMailSeq`);
//         `collectMail`/`collectAllMail` brauchen dafür KEINE Sonderbehandlung — derselbe
//         items/instances-Collect-Pfad gilt identisch, „gelesen" = die Mail ist vollständig
//         eingesammelt (kein separates read-Flag). ZWEI Trigger (je EINMAL pro Spielstand, in
//         `onEliteKilled`, engine/elites.ts): erster Champion-Kill ÜBERHAUPT (Summe
//         `eliteCodex[*].kills` war 0 vor diesem Kill) → Brief von Brenna
//         (`mail.letter.brenna.firstChampion`, 5× `cooked_trout` — ein bereits im Content
//         vorhandenes, günstiges Koch-Food, ohne dass logic-dev dafür neue Content-Daten anlegen
//         müsste); erster Unique-Fund ÜBERHAUPT (Summe `eliteCodex[*].uniques` war 0 vor diesem Drop)
//         → Brief vom Wächter (`mail.letter.warden.firstUnique`, ohne Anhang). Beide Trigger sind AUS
//         `eliteCodex` ABGELEITET (kein zusätzliches Once-Flag nötig — die Summen steigen nur
//         monoton, `onEliteKilled` ist der einzige Inkrement-Ort). KEIN neuer SAVE_VERSION-Bump nötig
//         (rein additiv zum bestehenden `mailbox`-Array, Muster jeder neuen Mail-`kind`); sanitizeState
//         härtet die neue Form (Muster der bestehenden Überlauf-Mail-Härtung — unbekannte `kind`s
//         raus, `from` strikt `"brenna"|"warden"`, `textKey` non-empty string, `items`/`instances`
//         wie gehabt geprüft; anders als Überlauf-Mails werden Briefe NIE wegen leerem Inhalt
//         verworfen — der Brieftext selbst ist der Inhalt).
// v73 (Kampf-Queue, Task #312, Chef-GO 2026-07-24 — NUR Engine/Shared/Persistence, UI-Welle folgt):
//     Kämpfe werden Queue-fähig. VIER Änderungen:
//     (a) `QueuedAction` trägt jetzt einen Sorten-Diskriminator `kind: "action" | "fight"` —
//         "fight"-Einträge (`monsterId` gesetzt, `target` = Kill-Ziel; null = ∞) reihen einen Kampf
//         gegen ein NORMALES Zonen-Monster ein (Elites sind strukturell nicht adressierbar — sie
//         sind Varianten, keine MonsterIds; Dungeon-only-Monster lehnt `enqueueFight` ab). Migration
//         stempelt ALLE Alt-Einträge auf `kind:"action"`. ÜBERGANGS-SHAPE: `actionId` bleibt aus
//         Compile-Kompat zur bestehenden Queue-UI auf allen Einträgen typ-präsent (Platzhalter
//         FIGHT_QUEUE_ACTION_ID für "fight"), s. QueuedAction-JSDoc.
//     (b) `queueFight: QueueFightRuntime | null` — Laufzeit des AKTIVEN Queue-Kampfs (aus der Queue
//         gepoppt, Analogon zu activeActionId/actionTarget): Ziel-Monster + verbleibende Kills.
//         WIRD persistiert (ein mitten im Queue-Kampf gespeicherter Stand zählt nach dem Load
//         weiter — combat.monsterId ist ebenfalls persistiert). Default null.
//     (c) `queuePaused: boolean` — Tod/Patt pausiert die Queue (der unterbrochene Kampf-Eintrag
//         wandert mit Rest-Ziel zurück an die Front, NICHTS wird still übersprungen; vorher startete
//         nach einem Tod automatisch der nächste Queue-Eintrag). Wiederaufnahme manuell:
//         enqueueAction/enqueueFight/setActiveAction/resumeActionQueue löschen das Flag. Default false.
//     (d) `lastQueueSkip: QueueSkip | null` — maschinenlesbarer Grund des letzten übersprungenen
//         Kampf-Eintrags (Zonen-Gate-Check beim START des Eintrags: Monster weg/„not_queueable"/
//         Gate zu) für die spätere UI. Default null.
//     Migration default-initialisiert (b)-(d) und stempelt (a); sanitizeState härtet alle vier
//     Flächen (Details persistence/index.ts). Vault-Pin: v73-release-0.2.0.json.
// v74 (Elite-Sieg-Breadcrumb, Task #324, Chef-Feedback „Nach Elite-Fight komme ich instant zurück
//     zur Zonen-Übersicht — sollte länger sein mit Fanfare und Loot-Übersicht"): ZWEI neue Felder
//     für die kommende UI-Sieg-Zeremonie (separate ui-dev-Welle) — die Beute-Daten eines Elite-Kills
//     gingen bisher im Kill-Tick verloren (onEliteKilled vergibt sie direkt ins Inventar; der
//     Kampf-Log kennt nur Einzel-Zeilen, keine Kill-Zusammenfassung, und `combat.lastKill` wird im
//     Elite-Pfad bewusst NIE gesetzt — kein Kill-Cooldown).
//     (a) `eliteKillSeq: number` — monotoner Lebenszeit-Zähler aller Elite-Kills (Muster
//         `eliteSpawnSeq`/petDropSeq) und die EINZIGE Quelle der `lastEliteKill.seq`-Werte.
//     (b) `lastEliteKill: EliteKillSummary | null` — Breadcrumb des JÜNGSTEN Elite-Kills (Muster
//         `lastEliteSpawn`): variantId, Spielzeit-Stempel `atMs` (= `elapsedMs`, NIE Wanduhrzeit),
//         `drops` (das Material-Bundle: EXAKT die tatsächlich vergebenen extraLoot-Items/-Mengen),
//         `uniqueItemId` (das Unique, falls gefallen, sonst null) + `suffixRolled` (trug das
//         gefallene Unique einen Suffix), `bountyTokens` (das gezahlte Kopfgeld), `seq`.
//         WICHTIG (Determinismus-GESETZ): reine AUFZEICHNUNG bereits gewürfelter Ergebnisse in
//         `onEliteKilled` (engine/elites.ts) — KEIN zusätzlicher RNG-Zug, KEINE Reihenfolge-
//         Änderung; ein offline zu Ende gekämpfter Elite-Kill schreibt das Feld identisch (letzter
//         Kill gewinnt — für die UI-Zeremonie reicht der jüngste). Die BASIS-Zonen-Loot-Tabelle des
//         skalierten Monsters fließt weiterhin über den normalen Kill-Pfad (combat.ts) und ist
//         BEWUSST NICHT Teil des Breadcrumbs (nur die elite-EIGENEN Belohnungen).
//     Migration (< 74): `eliteKillSeq` 0, `lastEliteKill` null (rückwirkend gibt es nichts
//     nachzuholen, Muster eliteSpawnSeq/lastEliteSpawn). sanitizeState härtet Shape strikt
//     (Unbekanntes/kaputtes Objekt → null; drops-/unique-itemIds gegen den Content geprüft —
//     unbekannte drops-Zeilen gestrippt, unbekanntes Unique → null + suffixRolled false) und die
//     `eliteKillSeq`-Monotonie (≥ `lastEliteKill.seq`, NIE senken/nullen — Muster eliteSpawnSeq).
//     Keine Item-ID-Renames. Vault-Pin: v74-release-0.2.1.json (aus v73 über die reale Kette).
// v75 (Ausrüstungs-Loadouts 1/2/3, Task #349, Spieler-Wunsch „drei Loadout-Slots zum schnellen
//     Stil-Wechsel" — passt exakt zum 3-Stile-Design): EIN neues Feld
//     `equipLoadouts: (EquipLoadout | null)[]` (fixe Länge EQUIP_LOADOUT_COUNT = 3; null = nie
//     gespeichert). Ein Loadout ist ein SNAPSHOT der Kampf-Ausrüstungs-Slots (LOADOUT_SLOTS —
//     bewusst OHNE tool1/tool2/tool3: Werkzeuge sind Skill-Ausrüstung, kein Kampfstil-Wechselgut;
//     sie umzuziehen würde bei jedem Wechsel sinnlos Inventar-Platz verbrennen). Jeder Eintrag
//     referenziert `itemId` + optional `instanceId` (Suffix-/Verzauberungs-Instanzen reisen exakt
//     mit; verkaufte/zersalvagte Instanzen gelten beim Anlegen als fehlend). ANLEGEN läuft
//     ausschließlich über den NORMALEN Equip-Pfad (engine/loadouts.ts → equipItem/equipInstance:
//     Requirements gelten BEIM ANLEGEN, kein Sonderweg; fehlende Teile werden übersprungen, der
//     Rest zieht an — Ergebnis „X von Y angelegt"). Fehlt ein Teil im Inventar, wird es aus der
//     Bank/dem Gear-Vault abgehoben (withdrawItem/withdrawInstance — ebenfalls Normalpfade).
//     RNG-frei (reine Spieler-Aktion, kein Tick-Pfad). Migration (< 75): `[null, null, null]`
//     (rückwirkend gibt es nichts zu rekonstruieren). sanitizeState härtet Shape (Array fixer
//     Länge; nur LOADOUT_SLOTS-Keys; unbekannte itemIds gestrippt — Muster Unknown-Id-Strip) und
//     der generische RENAME-Pfad in migrateState benennt künftige Item-ID-Renames auch in den
//     Loadout-Einträgen um. Keine Item-ID-Renames in DIESEM Bump. Vault-Pin:
//     v75-release-0.2.3.json (aus v74 über die reale Kette).
// v76 (Das Lager / Encampment Phase 1 — FUNDAMENT, Task #358; design/encampment-konzept.md +
//     encampment-balance.md §3 + lore/encampment-lore.md): EIN neues Feld `camp: CampState` —
//     (a) `buildings`: Gebäude-Stufen je Camp-Gebäude-ID (Record, nur Stufen 1..3 werden
//         gespeichert; fehlend = Stufe 0/ungebaut). Katalog: `ContentDB.campBuildings` (optional,
//         15 Gebäude × 3 Stufen — content-dev/Lizenzblock; ohne Katalog ist das Lager inert).
//     (b) `buildJob`: der EINE aktive Bautrupp-Auftrag ({buildingId, targetLevel, remainingMs}).
//         `remainingMs` zählt in DETERMINISTISCHER SPIELZEIT herunter (tick.ts `step()` −TICK_MS
//         je Tick, wie Action-Timer — NIE Date.now in der Engine): der Offline-Catch-up läuft
//         über denselben advance-Pfad ⇒ offline==online bit-identisch. Kein RNG-Zug.
//     (c) `buildSeq` (monoton, Muster petDropSeq) + `lastCompletedBuild` (UI-/Offline-Report-
//         Breadcrumb „{Gebäude} steht", die UI quittiert mit null). deserialize meldet einen im
//         Offline-Fenster fertiggestellten Bau über `OfflineSummary.campBuilds` (transient).
//     Freischaltung damals ab Kapitel 4 (`CAMP_UNLOCK_QUEST_ID = chronicle_04`) — SEIT TASK #365
//     ERSATZLOS ENTFALLEN: New Haven ist ab Spielstart da (Chef-Entscheid 27.07.), kein
//     Zugangs-Gate mehr. Zentralhaus-Stufen tragen `requiresQuest` (seit #365 nur noch II/III:
//     chronicle_09/14 — Stufe I ist frei),
//     Nicht-Zentralhaus-Stufe II/III verlangt Zentralhaus II/III (Balance-K4), Bauplatz-Limit über
//     `campBoost("buildSlots")` (+4/+5/+5; das Zentralhaus selbst zählt NICHT gegen das Limit).
//     WELLE 1 verdrahtet BEWUSST NUR `buildSpeed` (Schreibzelt, wirkt auf NEUE Bau-Jobs in
//     engine/camp.ts) — alle übrigen boostKinds liefern über `campBoost()` bereits ihre Summen,
//     werden aber erst in Welle 2 an tick/bank/offline/slayer/shop/blessing/farming angeschlossen
//     (ohne gebautes Lager überall exakt neutral ⇒ Sim/Fixtures bit-identisch).
//     Migration (< 76): `defaultCampState()` (leeres Lager — rückwirkend gibt es nichts zu
//     rekonstruieren). sanitizeState härtet: unbekannte buildingIds gestrippt, Stufen ganzzahlig
//     0..3 geklemmt, buildJob strukturell validiert (bekannte ID, targetLevel = Stufe+1,
//     remainingMs endlich 0..buildMs der Zielstufe), buildSeq ≥ lastCompletedBuild.seq.
//     Keine Item-ID-Renames. Vault-Pin: v76-release-0.3.0.json (aus v75 über die reale Kette).
// v77 (Das Lager / Encampment Phase 1 — VERDRAHTUNG + Offline-Veredelung, Task #359;
//     design/encampment-balance.md §4 Veredelungs-Spez + §7 Guard-/Klemmen-Liste): ZWEI neue Flächen.
//     (a) `camp.refine: Record<CampBuildingId, CampRefineSlot>` — je Veredelungs-Gebäude
//         (Schmelzofen `smeltRate` / Räucherhaus `smokeRate`) EIN gewählter Rezept-Slot
//         ({recipeId, accMs, produced}). Rezeptwahl NUR über engine/refine.ts
//         `setCampRefineRecipe` (Eligibility: Schmelzofen nur `smelt_*`-Basisrezepte
//         [smithing], Räucherhaus nur 1-Zutat-Kochrezepte [cooking, inputs.length === 1 —
//         Bankette/Eintöpfe bleiben aktives Kochen]; genau EIN deterministischer Output
//         [1 Loot-Roll, chance ≥ 1, min === max]; `levelRequired` muss erfüllt sein =
//         „beherrschte Rezepte"). Verarbeitung tickt in `tickCampRefine` (tick.ts advance,
//         PRO TICK in der Tick-Schleife nach step(), Task #335 — läuft „nebenher" online UND
//         offline über exakt dieselbe Abfolge): `accMs` sammelt getickte
//         Spielzeit, alle `3 600 000 / rate` ms ein Durchlauf — Inputs Inventar-zuerst-dann-
//         Bank (Craft-Semantik), Output zurück Inventar-dann-Bank, KEIN XP/Mastery/Stats-
//         Zähler, KEIN RNG-Zug (Determinismus-Fixtures bit-identisch), Stopp verlustfrei bei
//         leerem Input/vollem Ziel (accMs klemmt auf einen Durchlauf). deserialize meldet das
//         Fenster-Ergebnis über `OfflineSummary.campRefined` (transient, produced-Diff).
//     (b) `slayerFreeSkipDay: number` — YYYYMMDD-Stempel (Muster quests.daily.day; 0 = nie)
//         des zuletzt verbrauchten GRATIS-Task-Skips der Trophäenwand III („1 Gratis-Skip/
//         Tag", balance.md §6): `skipTask(state, content, dayStamp?)` kostet 0 Punkte, wenn
//         Trophäenwand III steht und der Stempel ≠ heute ist; der Gratis-Skip erhält die
//         Streak (cost === 0, Präzedenz SLAYER_SKIP_FREE_BELOW_LEVEL). Ohne dayStamp
//         (Alt-Aufrufer/Tests) neutral — die UI liefert den lokalen Kalendertag.
//     AUSSERDEM (kein eigener State, aber DERSELBE Bump): alle v76-Boost-Arten sind jetzt
//     verdrahtet — Skill-Tempo in `effectiveActionDurationMs` (+ Foraging über farmingSpeed),
//     Reifezeit in farming.ts `effectiveGrowMs`, `bankSlots` in `effectiveBankCapacity(state,
//     content)`, `offlineCapMs` in `effectiveMaxOfflineMs` (persistence-Fenster + Sanitize-
//     Klemmen aufs Maximal-Cap), `slayerPoints` additiv zum Meisterring (Gesamt-Klemme
//     SLAYER_POINTS_TOTAL_BONUS_CAP ×1.5), `sellBonus` additiv zum Pet (Gesamt-Klemme
//     SELL_BONUS_TOTAL_CAP +15 %), `blessing` als Schrein-Verstärkung (Bonus-Anteil ×
//     (1 + Stufe·0.10); wildhunt AUSGENOMMEN [Kampf-Segen, Chef-Entscheid K2] — Ersatz:
//     Elite-Ruhe-Cooldown-Beschleunigung in elites.ts). Ohne gebautes Lager ist ALLES exakt
//     neutral ⇒ Alt-Verhalten bit-identisch (Guard engine/camp-envelope.test.ts).
//     Migration (< 77): `camp.refine = {}` (kein Rezept gewählt), `slayerFreeSkipDay = 0`
//     (rückwirkend gibt es nichts zu rekonstruieren). sanitizeState härtet: refine nur für
//     bekannte Veredelungs-Gebäude, unbekannte/unpassende Rezept-IDs gestrippt, accMs endlich
//     0..msPerRun(min-Rate), produced ganzzahlig ≥ 0; slayerFreeSkipDay ganzzahlig ≥ 0.
//     Keine Item-ID-Renames. Vault-Pin: v77-release-0.3.0.json (aus v76 über die reale Kette).
// v78 (New-Haven-Dorfkarte — FREIE PLATZIERUNG, Task #370; design/newhaven-karte-spec.md §2/§4,
//     Chef-Entscheid 28.07.: Karte kommt in 0.3.0, Platzhalter-Grafik statt Asset-Wartezeit):
//     EIN neues Teilfeld `camp.positions: Record<CampBuildingId, CampPos>` — die Standort-Wahl des
//     Spielers je Gebäude als NORMALISIERTE Karten-Koordinate `{x, y}` im Bereich 0..1 (KEINE
//     Pixel: die Karte skaliert responsiv und die finale Grafik kommt später — normalisierte Werte
//     überleben jeden Auflösungs- und Asset-Wechsel). Einen Eintrag hat GENAU, wer auf der Karte
//     steht: jedes gebaute Gebäude (Stufe ≥ 1) plus das Gebäude eines laufenden NEUBAUS
//     (targetLevel 1 — der Bautrupp reserviert seinen Platz ab dem Baustart).
//     Fläche/Kollision leben als KONSTANTEN hier in shared (kein Save-Anteil, kein Content):
//     `CAMP_MAP_BUILDABLE` (Polygone in denselben 0..1-Koordinaten = die Menge der erlaubten
//     MITTELPUNKTE; bewusst großzügig, die echten Wasser-/Fels-/Waldränder justiert die Welle mit
//     der finalen Kartengrafik) und `CAMP_FOOTPRINT`/`campFootprint(id)` (Grundfläche als
//     Halb-Achsen in 0..1; heute für alle Gebäude gleich, die Funktion ist der Haken für
//     künftige Größen je Gebäude). Zwei Gebäude dürfen sich nie überlappen.
//     Neue Engine-Verben (engine/camp.ts, alle RNG-frei und ohne Zeitquelle):
//     `placeCampBuilding` (Platzierung + Baustart in EINEM Schritt), `moveCampBuilding`
//     (kostenlos, jederzeit, keine Bauzeit — das Gebäude im Bau ist gesperrt),
//     `demolishCampBuilding` (Stufe → 0, Platz frei, 50 % der Summe ALLER gebauten Stufen zurück,
//     Gold und jedes Material EINZELN abgerundet). `startCampBuild` bleibt unverändert gültig —
//     ein NEUBAU ohne vorher gewählte Position bekommt dort automatisch den ersten freien
//     Rasterplatz (die Listen-Ansicht aus 0.3.0 bleibt damit voll funktionsfähig, spec §5).
//     Migration (< 78): `camp.positions = {}` → sanitize verteilt JEDES Bestandsgebäude
//     deterministisch auf freie Rasterplätze (`campRepairPositions`: feste Katalog-Reihenfolge,
//     gleichmäßiges Raster `campLayoutSlots()` innerhalb der bebaubaren Fläche). Niemand verliert
//     etwas, niemand muss neu bauen. sanitizeState härtet: unbekannte Gebäude-IDs gestrippt,
//     Nicht-Zahlen verworfen, Koordinaten auf 0..1 geklemmt + auf CAMP_POS_DECIMALS gerundet,
//     Positionen außerhalb der Fläche oder in Kollision deterministisch auf freie Rasterplätze
//     repariert, Einträge für Gebäude ohne Karten-Präsenz entfernt. Idempotent.
//     Keine Item-ID-Renames. Vault-Pin: v78-release-0.3.0.json (aus v77 über die reale Kette).
// codex:2026-08-02T16:20:00+02:00 — v79 schließt den vom Chef freigegebenen Combat-Prep-Vertrag:
//     `character.autoPotion.autoRebuffUnlocked` persistiert den einmaligen 50.000-Gold-Kauf.
//     Alt-Saves mit bereits aktivem Auto-Rebuff behalten die Funktion automatisch; alle übrigen
//     Alt-Saves starten gesperrt. Keine IDs oder Kampfwerte ändern sich.
// codex:2026-08-03T12:45:00+02:00 — v80 persistiert die freie visuelle New-Haven-Anpassung:
//     individuelle Gebäudeskalierung (1..300 %) und horizontale Spiegelung. Alt-Saves erhalten
//     keine Overrides und verwenden dadurch weiterhin die rangabhängigen Renderer-Defaults.
// v81 (New-Haven-Bauwarteschlange, Spieler-Report 1.0.2): neues Teilfeld `camp.buildQueue`
//     (Gebäude-IDs, Länge ≤ CAMP_BUILD_QUEUE_MAX). Migration: leere Liste. Keine Item-ID-Renames.
// v82 (Anbau: Folgesorte je Beet — Chef-GO 25.08.2026 (1.1.0), design/rezension-patch-2026-08-25.html
//     #p12): EIN neues Feld `farmPlots[*].nextCropId: ItemId | null`. Bei der nächsten Reife wird
//     die Folgesorte statt der aktuellen gesät (eine Saat der Folgesorte wird ZUR REIFE abgezogen,
//     nicht beim Planen — eine Quelle für Saatverbrauch, keine Rückerstattung beim Abbrechen),
//     danach nullt sich das Feld und das Beet läuft mit Auto-Nachpflanzen der neuen Sorte
//     (einmalig, Chef-Entscheid #12.1). Fehlt die Saat zur Reife: Beet leer, Plan bleibt, der Tick
//     sät ein, sobald Saat da ist (Chef-Entscheid #12.2). `tickFarmPlots` rechnet die Reife-Zyklen
//     seitdem als „solange elapsed ≥ growMs(aktuelle Sorte)"-Schleife statt `floor(elapsed/growMs)`
//     vorab — für Beete OHNE Plan bit-identisch (gleiche Ernten, gleiche nextInt-Züge, gleicher
//     Restübertrag). Migration (< 82): `nextCropId = null` auf allen 9 Beeten (explizit null statt
//     fehlend, damit der Vault-Guard byte-genau vergleichen kann). sanitizeState: nur behalten, wenn
//     String, in content.crops vorhanden und ungleich cropId — ein Plan auf einem LEEREN Beet ist
//     gültig (s. FarmPlot.nextCropId). Keine Item-ID-Renames.
// v83 (Dungeons queuebar — Chef-Auftrag 26.08.2026: „wie Kämpfe mit 1×/25×/50×/∞-Knöpfen; nach dem
//     Endboss wieder von neu anfangen"): (a) `QueuedAction.kind` kennt die dritte Sorte "dungeon"
//     mit neuem optionalem Feld `dungeonId` (Übergangs-Shape wie "fight", `actionId`-Platzhalter "");
//     (b) EIN neues GameState-Feld `queueDungeon: QueueDungeonRuntime | null` (Laufzeit des aktiven
//     Queue-Dungeon-Laufs: dungeonId, remaining, completed); (c) `lastQueueSkip` kann Dungeon-Skips
//     tragen (`dungeonId` + Gründe unknown_dungeon/dungeon_locked). Ein Lauf zählt beim Endboss-Kill
//     (`dungeonsCleared`-Delta), danach startet der Dungeon im selben Tick von vorn. Migration (< 83):
//     `queueDungeon = null`; Alt-Einträge unverändert. sanitizeState: "dungeon"-Einträge nur mit
//     bekanntem Dungeon (≥ 1 Welle), queueDungeon nur zusammen mit genau diesem laufenden Dungeon
//     (sonst Rest an die Queue-Front). Keine Item-ID-Renames, keine Kampfwerte-Änderung.
// v84 (Taverne — 1.2.0 „Alive“, Chef-Entscheide E1–E3 + 27.08.2026, design/1.2.0-alive/taverne-spec-technik.md):
//     (a) EIN neues GameState-Feld `tavern: TavernState` (Tagesbesetzung der vier Plätze, angenommene Aufgaben,
//     Wechsel-/Abgabe-Zähler, Breadcrumb); (b) zwei neue PlayerStats-Zähler `actionRunsById`/`producedById`
//     (Baselines der "run"/"produce"-Aufgaben); (c) neues Lager-Gebäude `camp_tavern` (Boost-Art "tavernPerks",
//     belegt keinen Bauplatz); (d) Consumable-Effekt "blackMarketCrate" (+ `tier`) für black_market_crate_i..v.
//     Migration (< 84): `tavern = defaultTavernState()`, beide Zähler `{}`. sanitizeState: Plätze nur mit
//     bekanntem Gast + Vorlage, Zahlen geklemmt, Länge TAVERN_SEATS. Keine Item-ID-Renames, keine Kampfwerte.
// v85 (Jagen — 1.2.0 „Fasern und Fallen", Chef-Entscheide J1–J7 27.08.2026, design/handwerk-fasern-jagen/spec-technik.md):
//     (a) `huntTraps: HuntTrap[]` (fixe Länge HUNT_TRAP_SLOTS) + `huntCatchSeq`; (b) `stats.huntCatches`; (c) Skill "hunting"
//     (skills[...] entsteht beim ersten XP-Gewinn wie jeder Skill); (d) Content `huntingZones`, neue Items (Fasern/Saaten/Stoffe/
//     Köder). Migration (< 85): `huntTraps = defaultHuntTraps()`, `huntCatchSeq = 0`, `stats.huntCatches = 0`. sanitizeState:
//     Fallen nur mit bekannter Zone, remainingMs ≥ 0, Länge exakt HUNT_TRAP_SLOTS, lastCatch nur mit bekanntem Monster/Items.
//     Keine Item-ID-Renames (Roben-Rezepte wechseln nur ihre Zutaten).
//     NACHTRAG im SELBEN Bump (v85 ist unveröffentlicht — kein weiterer Bump; Chef-Entscheid 28.08.2026,
//     Spieler-Feedback „3 separate equipment kits, not unequip/equip modes, just swap"): die v75-Loadout-
//     VORLAGEN `equipLoadouts: (EquipLoadout | null)[]` werden ERSETZT durch ECHTE KITS
//     `equipKits: EquipKit[]` (fixe Länge EQUIP_KIT_COUNT = 3; ein Kit = `equipment` + `equippedInstances`
//     in der Form von `character`) + `activeKit: 0|1|2`. Die WAHRHEIT des aktiven Kits bleibt
//     `character.equipment`/`equippedInstances` (alle Pfade lesen weiter dort), `equipKits[activeKit]` ist
//     dessen Spiegel (`syncActiveKit` beim Umschalten/Serialisieren/Sanitize). Umschalten
//     (engine/loadouts.ts `switchEquipKit`) tauscht das GANZE Set inkl. Instanzen (Verzauberung reist mit),
//     verschiebt nichts ins Inventar, nur außerhalb des Kampfes (`combat.monsterId === null`). RNG-frei.
//     Migration (jeder Save ohne `equipKits`, also < 85 UND frühe v85-Stände): Kit 0 = getragene
//     Ausrüstung (Loadout 0 wird VERWORFEN — Kit 0 ist das, was man trägt); für Loadout N (1..2) wird jede
//     Vorlagen-Position, deren Item (bzw. Instanz per instanceId) JETZT im INVENTAR liegt, aus dem Inventar
//     ENTNOMMEN und in Kit N gelegt (Instanz aus inventory.instances mitsamt Affixen/Suffix); fehlt das Teil
//     (Bank/Vault/verkauft/getragen), bleibt der Platz leer — nichts wird dupliziert. Alt-Saves ohne
//     `equipLoadouts`: Kits 1/2 leer. `equipLoadouts` wird aus dem State gelöscht (Typ entfernt).
//     sanitizeState: Länge exakt 3, activeKit 0..2, je Kit nur bekannte + slot-korrekte Items (Rettung in
//     Bank/Gear-Vault wie beim Charakter), Instanz-Invariante je Kit, Zweihand ⇒ Offhand leer (Rückgabe über
//     den Grant-Pfad), Kit[activeKit] am Ende = Spiegel des Charakters. Keine Item-ID-Renames.
// v86 (Skill-Split „Schneidern" — 1.2.0 „Fasern und Fallen", Chef-Entscheid 28.08.2026,
//     design/handwerk-fasern-jagen/spec-technik.md §6): der Skill `leatherworking` (EN „Crafting"/DE „Handwerk")
//     wird GETEILT. NEUER Skill `tailoring` (EN „Tailoring"/DE „Schneidern", kein `trains`) übernimmt alles aus
//     Stoff: Weben (weave_*), sämtliche Magier-Roben-Kategorien robe_* (inkl. der Handschuh-/Schuh-Teile derselben
//     Kategorien) und alle Umhang-Rezepte (Kategorie capes, dazu craft_silk_mantle/craft_void_shroud, die dorthin
//     umziehen); die Umhänge werden dabei auf die fünf Stoff-Stufen umgestellt (Leder bleibt Beikost).
//     `leatherworking` behält Leder (tan/leather_*), Bögen (fletch_*), Holzschilde/Angelruten, Nessel-Sehne
//     (twist_nettle_cord) und die Slayer-Anforderungs-Rezepte. KEIN neues GameState-Feld — nur ein neuer
//     Schlüssel `skills.tailoring`, der wie jeder Skill beim ersten XP-Gewinn entsteht.
//     Migration (< 86), XP-AUFTEILUNG NACH TATSÄCHLICH HERGESTELLTEM: für jedes Rezept, das JETZT `tailoring`
//     ist, zählt `stats.craftedById[ergebnisItem] × rezept.xp` (craftedById existiert seit SAVE 27 und zählt
//     jedes aus einem Rezept mit Zutaten erzeugte Stück, Weben eingeschlossen; `producedById`/`actionRunsById`
//     gibt es erst seit v84 und bringen nichts Zusätzliches). Ergebnis-Items, die auch ein Nicht-Schneidern-
//     Rezept liefert, werden konservativ NICHT gezählt. Dann `tailoring.xp = min(Σ, leatherworking.xp)` und
//     `leatherworking.xp −= tailoring.xp` (Handwerk sinkt entsprechend, nie unter 0; Gesamt-XP bleibt exakt
//     erhalten). Ohne Zähler: `tailoring = { xp: 0 }`, Handwerk unverändert. Mastery-Einträge hängen an
//     Aktions-IDs und wandern automatisch mit. Meisterweihe-Marker/Erfolge/angelegte Ringe bleiben stehen
//     (meetsRequirements prüft nur beim Anlegen). sanitizeState: unbekannte Skill-Keys weiter tolerant, `tailoring`
//     wird NICHT nachträglich erzeugt (Muster hunting). Content: 5 neue Erfolge ach_skill_tailoring_25..99,
//     Meisterring ring_master_tailoring (inputSaver 5 %), ring_master_completion verlangt jetzt 22 Skills.
//     Keine Item-ID-Renames, keine Kampfwerte.
export const SAVE_VERSION = 86;

/**
 * Vorgaben für den Mengen-Craft auf Ersteller-/Crafting-Karten (1 / 25 / 50). „∞/Alle" ist die
 * unbegrenzte Variante (Ziel = null) und kein Eintrag dieser Liste (die UI liefert den ∞-Button separat).
 * Reine Zahlen → keine i18n nötig; zentral hier, damit Engine-Tests und UI dieselben Presets teilen.
 * Stapelt der Spieler dieselbe Aktion mehrfach, addiert `enqueueAction` die endlichen Ziele
 * (5× 50 → EIN Eintrag mit Ziel 250), sodass die höheren Presets die Queue nicht zumüllen.
 */
// Chef 27.08.2026: Karten-Raster 1 / 25 / X / ∞ — „X“ öffnet das Mengen-Modal (QueueAmountModal), „50“ entfällt.
export const CRAFT_TARGET_PRESETS: readonly number[] = [1, 25];

/** Default-/Fallback-Portrait-ID für die Charaktererstellung. */
export const DEFAULT_PORTRAIT = "char_1";

/** Nahkampf-Stil (OSRS-artig): bestimmt, welcher Skill XP sammelt + welcher Bonus aktiv ist. */
export type CombatStyle = "attack" | "power" | "defensive";
export type RangedStance = "precise" | "fast" | "defensive";
export type MagicStance = "offensive" | "defensive";
export const COMBAT_STYLES: CombatStyle[] = ["attack", "power", "defensive"];
/** Stil-Boni (multiplikativ auf den jeweiligen Kampfwert). */
export const STYLE_ACCURACY_MULT = 1.12; // Attack: Trefferbonus
export const STYLE_DAMAGE_MULT = 1.12; // Wucht: Schadensbonus
export const STYLE_DEFENCE_MULT = 1.15; // Defensiv: Blockrate/Verteidigung

/**
 * Kampf-Stance-Modifikatoren (OSRS-Stil) je Waffenstil + gewählter Stance.
 * `speedMult` multipliziert attackIntervalMs (>1 langsamer, <1 schneller).
 * `xpSkill` = Ziel-Skill der Kampf-XP (Offensiv-XP-Routing).
 *   Melee: Angriff(+Acc)/Wucht(+Schaden,−Acc)/Defensiv(+Block) → attack/power/defence
 *   Fernkampf: Präzise(+Acc, langsamer)/Schnell(schneller,−Acc)/Defensiv(langsamer,+Block) → ranged/ranged/defence
 *   Magie: Offensiv/Defensiv(+Block) → magic/warding (Armor-Iteration 2 §9.1; Defensiv trainiert Warding)
 */
export interface StanceMods {
  accMult: number;
  dmgMult: number;
  defMult: number;
  speedMult: number;
  xpSkill: SkillId;
}
export function activeStanceMods(style: WeaponStyle, c: CharacterState): StanceMods {
  if (style === "ranged") {
    switch (c.rangedStance) {
      case "fast":
        return { accMult: 0.9, dmgMult: 1, defMult: 1, speedMult: 0.85, xpSkill: "ranged" };
      case "defensive":
        return { accMult: 1, dmgMult: 1, defMult: STYLE_DEFENCE_MULT, speedMult: 1.12, xpSkill: "defence" };
      default: // precise
        // Balance-Pass 3 #7: precise war mit speedMult 1.12 (12 % langsamer) eine Default-DPS-Falle
        // — der Standard-Bogenschütze las nur 71–80 % vom Besten. Auf 1.0 gesetzt: der Default ist
        // keine Falle mehr, das Dreieck bleibt sauber (fast = Glass-DPS 0.85/−Acc, defensive = Tank 1.12/+Def).
        return { accMult: STYLE_ACCURACY_MULT, dmgMult: 1, defMult: 1, speedMult: 1.0, xpSkill: "ranged" };
    }
  }
  if (style === "magic") {
    // Armor-Iteration 2 §9.1: Offensiv-Magie routet auf `magic`, Defensiv auf `warding`
    // (die Defensiv-Stance IST die Ward-Regen-Fertigkeit).
    // Armor-Iteration 2.1 #4: Defensiv-Magie kostet jetzt −15 % Cast-Schaden (dmgMult 0.85) als
    // Offense-Tradeoff für den ×1.5-Ward-Regen (WARDING_DEF_STANCE_MULT) — vorher gratis (dmgMult 1),
    // ~+18 % TTK (1/0.85). Kein Accuracy-/Tempo-Malus obendrauf (single-Knopf-Tradeoff).
    return c.magicStance === "defensive"
      ? { accMult: 1, dmgMult: 0.85, defMult: STYLE_DEFENCE_MULT, speedMult: 1, xpSkill: "warding" }
      : { accMult: 1, dmgMult: 1, defMult: 1, speedMult: 1, xpSkill: "magic" };
  }
  switch (c.combatStyle) {
    case "power":
      return { accMult: 0.92, dmgMult: STYLE_DAMAGE_MULT, defMult: 1, speedMult: 1, xpSkill: "power" };
    case "defensive":
      return { accMult: 1, dmgMult: 1, defMult: STYLE_DEFENCE_MULT, speedMult: 1, xpSkill: "defence" };
    default: // attack
      return { accMult: STYLE_ACCURACY_MULT, dmgMult: 1, defMult: 1, speedMult: 1, xpSkill: "attack" };
  }
}

/** Ein aktiver, zeitlich begrenzter Buff (von einem Consumable). */
export interface ActiveBuff {
  itemId: ItemId;
  remainingMs: number;
}

/**
 * Buff-Kategorien-Taxonomie (red-team 2026-07-09 L3 — Buff-Stacking ohne Exklusivität): jede
 * Kategorie ist ein EXKLUSIVER Buff-Slot — max. 1 aktiver Buff pro Kategorie, ein neuer verdrängt
 * den alten derselben Kategorie (Verdrängungsregel in `applyConsumableBuff`, engine/consumable.ts).
 * Einteilung nach PRIMÄRWIRKUNG des Consumables:
 *  - "regeneration"  Sustain-Tonika: maxHp/hpRegenPerSec (nightshade_extract, tonic_ironbark,
 *                    panacea_elixir, salve_gravensap, …). Der L3-Kern: Σ +210 maxHp / Σ-Regen
 *                    kollabiert auf das beste Einzel-Tonikum.
 *  - "offense"       Angriffs-Tonika: attackIntervalMs/critChance/critDamage (slayer_war_brew,
 *                    tonic_warpath/apex, godsbreath_elixir, …). BEWUSST keine getrennte
 *                    Tempo-Kategorie: der Content kombiniert Tempo+Krit auf denselben Zeilen —
 *                    eine Trennung wäre willkürlich und würde das Stacking nur halbieren statt
 *                    deckeln (Σ −5100 ms / Σ +1.04 crit → bestes Einzel-Item).
 *  - "defense"       Trinity-Schicht-Tonika (das Quartett stoneskin=Armor / keeneye=Ausweichen /
 *                    warding=Ward / bulwark=Block): max. 1 Defensiv-Buff, der Tank WÄHLT eine Achse.
 *  - "attribute"     Herblore-Attribut-Schübe (tonic_bloodrage str / tonic_arcane_surge int+Mana).
 *  - "food"          Koch-Gerichte mit Attribut-Buff („well fed": Feasts/Stews/Bisques) — genau
 *                    EIN aktives Buff-Essen, getrennt vom Tonika-Slot (Trank+Essen bleibt legal).
 *  - "utility"       Skilling-Tonika (gatherXpMult/gatherYieldMult): XP-Tonikum ODER
 *                    Ertrags-Tonikum, nicht mehr die multiplizierte 4er-Kette.
 * OHNE Kategorie (bewusst, dokumentierter Alt-/Sonderfall): die 2–4-s-HoT-Heiltränke
 * (minor/greater_healing_potion, bloodmend_draught) — sie sind Heil-MECHANIK (Auto-Trank/Auto-Eat),
 * keine Dauer-Buffs; eine Kategorie würde jede Trank-Heilung einen laufenden Buff verdrängen lassen.
 */
export type BuffCategory =
  | "regeneration"
  | "offense"
  | "defense"
  | "attribute"
  | "food"
  | "utility";

/**
 * Sonder-Wirkung eines Verbrauchsguts JENSEITS von Heilung/Gift-Heilung/Buff (Chef-GO 26.08.2026,
 * Belohnungsladen-Item „Auftragsmarke" `chronicle_task_token`). Diskriminierte Union über `kind`,
 * heute genau EIN Kind:
 *  - "slayerReroll"  Der aktive Slayer-Auftrag wird OHNE Punkteabzug, OHNE Streak-Bruch und OHNE
 *                    Verbrauch des Tages-Gratis-Skips (Trophäenwand III) verworfen und beim SELBEN
 *                    Meister sofort neu vergeben (engine/slayer.ts `rerollTask`, ausgelöst über
 *                    `useConsumable`). Ohne aktiven Auftrag ist das Item nicht benutzbar — kein
 *                    Verbrauch (engine/consumable.ts `consumeFailReason` liefert der UI den Grund).
 * Content-Shape am Item: `consumable: { kind: "slayerReroll" }`. Lebt NUR in der ContentDB (kein
 * Save-State) ⇒ KEIN SAVE_VERSION-Bump. Sonder-Wirkungen feuern AUSSCHLIESSLICH beim spieler-
 * ausgelösten Verzehr — nie über Auto-Eat/Auto-Trank/Auto-Rebuff.
 */
export type ConsumableEffectKind = "slayerReroll" | "blackMarketCrate";
export interface ConsumableEffect {
  kind: ConsumableEffectKind;
  /** NUR kind "blackMarketCrate" (Taverne, SAVE 84): Behälter-Stufe 1..5 = Band (design/1.2.0-alive/taverne-spec-technik.md §7). */
  tier?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Magie: Mana & Statuseffekte
// ───────────────────────────────────────────────────────────────────────────

/** Manakosten pro Zauber. */
export const MANA_PER_CAST = 6;
/** Schadensfaktor, wenn nicht genug Mana da ist (schwacher Stab-Schlag). */
export const MAGIC_WEAK_FACTOR = 0.35;
// RANGED_WEAK_FACTOR: ENTFERNT (#286 Ammo-Removal) — es gibt keine Munition mehr, Bögen feuern
// immer mit voller (eingebackener) Spanne; der „improvisierte Notschlag" existiert nicht mehr.
/** Frost verlangsamt den Gegner-Angriffstimer um diesen Anteil. */
export const FROST_SLOW = 0.4;

/**
 * Mana-Schild (Magie-Defensiv-Identität, Playtest-Hebel P3 / r6 Cassia „Mana-Schild").
 *
 * Der Magie-Stil hat offensiv INT-Skalierung, aber bisher KEINEN Survival-Term → Magier sind
 * glasig und der dritte Stil hinkt bei der Überlebensfähigkeit hinter melee (Lebensraub) und
 * ranged (+Evasion/Tempo) zurück. Schließt diese Lücke stilspezifisch und gedeckelt:
 *
 * Nur im Magie-Stil absorbiert Mana einen Anteil eines eingehenden Treffers, BEVOR der Rest auf
 * die HP geht. Pro absorbiertem Schadenspunkt werden `MANA_SHIELD_COST_PER_DAMAGE` Mana verbraucht.
 * Es kann höchstens `MANA_SHIELD_ABSORB_PCT` eines Treffers absorbiert werden (Deckel) und nur so
 * weit, wie Mana reicht — fällt das Mana aus, schlägt der Rest voll durch. Dadurch:
 *   - moderate, idle-faire Survival (keine Unsterblichkeit: Deckel < 1 und Mana ist endlich),
 *   - macht Mana zur defensiven Ressource (verbraucht denselben Pool wie das Zaubern → echte
 *     Opportunitätskosten gegen den Offensiv-Burst),
 *   - die Mitigation/Lifesteal-Endgame-Deckel bleiben unangetastet (greift NACH der Mitigation
 *     auf den bereits reduzierten Treffer, ersetzt sie nicht).
 *
 * Konservativ gewählt (Chef kann justieren): 50 % eines Treffers, 20 Mana je absorbiertem HP.
 * (Stat-Squish ÷10: Schaden ist ×0.1, Mana bleibt unskaliert → Kosten pro absorbiertem HP ×10,
 * damit die Schild-Ökonomie Mana:Treffer EXAKT identisch bleibt — Spec §3.2/§3.4.)
 */
export const MANA_SHIELD_ABSORB_PCT = 0.5;
export const MANA_SHIELD_COST_PER_DAMAGE = 20;

export type StatusType = "burn" | "frost" | "shock" | "poison" | "bleed";

/** Ein aktiver Statuseffekt auf einem Kämpfer. */
export interface StatusEffect {
  type: StatusType;
  remainingMs: number;
  /** Bedeutung je Typ: burn/poison/bleed = Schaden/Sek, shock = Aussetz-Chance 0..1, frost = ungenutzt. */
  magnitude: number;
}

/**
 * Kreaturen-Familie eines Monsters (Bane-System, Task #213). Grobe Taxonomie für konditionale
 * Effekte („Extra-Schaden gegen Untote"). Erweiterbar — neue Familien einfach an Union UND
 * `MONSTER_FAMILIES` anhängen. Getaggt wird über `MonsterDef.family` (optional; ungetaggt =
 * gehört keiner Familie an → KEIN Familien-Match, `bane` greift nie). UI lokalisiert die Namen
 * über i18n-Keys `monsterFamily.<family>` (en „undead" / de „Untote" …).
 */
export type MonsterFamily = "undead" | "beast" | "demon" | "construct" | "humanoid" | "dragonkin";

/** Alle bekannten Familien (Guard-/Validierungs-Quelle für Content-Tagging & UI-Aufzählungen). */
export const MONSTER_FAMILIES: MonsterFamily[] = [
  "undead",
  "beast",
  "demon",
  "construct",
  "humanoid",
  "dragonkin",
];

/**
 * Spezial-Effekt-Kinds (Waffen 2.0, design/itemization-parity-fix.md §2.1 + Palette-Hooks).
 * Jedes Kind = genau 1 Bedingung + 1 Wirkung im Schadens-/Krit-/Kill-/Treffer-Pfad (combat.ts).
 * Transiente Zähler (momentum/firstStrike/…) leben in `CombatState.effectCounters` — NIE persistiert.
 *
 * Daten-Vertrag je Kind (Felder von `WeaponEffect`; ungenutzte Felder = 0 setzen):
 * | kind           | magnitude                              | weitere Felder                        |
 * |----------------|----------------------------------------|---------------------------------------|
 * | execute        | +Anteil Schaden (0.25)                 | threshold: Ziel-HP-Anteil (0.2)       |
 * | giantSlayer    | +Anteil, wenn Monster-CL > Spieler-CL  | —                                     |
 * | desperation    | +Anteil (0.3)                          | threshold: eigene-HP-Anteil (0.3)     |
 * | bounty         | +Anteil vs. aktives Slayer-Ziel (0.2)  | —                                     |
 * | firstBlood     | +Anteil vs. unverletztes Ziel (0.25)   | —                                     |
 * | momentum       | +Anteil je Treffer-Stapel (0.02)       | stacks: max Stapel (Default 10)       |
 * | firstStrike    | +Anteil auf den 1. Treffer (1 = ×2; 0 ⇒ Default 1) | —                        |
 * | eagleEye       | — (1. Treffer des Kampfes ist Krit)    | —                                     |
 * | everyNth       | +Anteil auf jeden n-ten Treffer (1.0)  | stacks: n (Default 5)                 |
 * | critBurst      | FLAT-Zusatzschaden bei Krit            | —                                     |
 * | vengeance      | +Anteil auf den nächsten Treffer nach erlittenem Treffer (0.4) | —            |
 * | cooldownOnKill | —                                      | durationMs: −ms vom Kill-Cooldown     |
 * | manaOnKill     | FLAT Mana je Kill                      | —                                     |
 * | healOnKill     | FLAT HP je Kill                        | —                                     |
 * | overkillCarry  | — (Überschuss trifft nächsten Gegner)  | —                                     |
 * | antiRegen      | — (Ziele mit aktivem DoT burn/bleed/poison regenerieren nicht) | —             |
 * | manaDrain      | FLAT Mana je Treffer                   | —                                     |
 * | wardSiphon     | +Anteil verurs. Schaden → eigener Ward (0.08) | —                              |
 * | plaguebearer   | Fallback-Gift-Magnitude (0 ⇒ Gift-Status der Waffe) | durationMs: Fallback-Dauer |
 * | gutter         | +Anteil auf eigene DoT-Ticks (0.5)     | —                                     |
 * | frostbite      | +Anteil vs. verlangsamte Ziele (0.25)  | —                                     |
 * | catalyst       | —                                      | durationMs: +ms auf eigene Status     |
 * | surplus        | +Anteil Zauberschaden (0.2)            | threshold: Mana-Anteil (Default 0.8)  |
 * | ammoSaver      | NO-OP seit Ammo-Removal #286 (es gibt keine Munition mehr; Stage B ersetzt/entfernt die Träger-Items) | — |
 * | luckyStrike    | +Anteil Gold von Kills (0.15)          | —                                     |
 * | packLeader     | +Anteil Pet-Ability-Frequenz (0.25)    | —                                     |
 * | thorns         | FLAT Schaden an Angreifer (Rüstungs-Chase §5) | —                              |
 * | doubleStrike   | — (Palette-Hook, Content später)       | chance: Zweitschlag-Chance            |
 * | bane           | +Anteil vs. Monster der targetFamily (0.25) | targetFamily: MonsterFamily (Pflicht) |
 * | blockRestore   | +Anteil maxHp Heilung je ERFOLGREICHEM Block (0.02); Klemme BLOCK_RESTORE_CAP_PCT und BLOCK_RESTORE_CAP_ABS | — |
 * | combatXp       | +Anteil auf JEDE Kampf-XP des Kampfmoduls (0.10); Klemme COMBAT_XP_BONUS_CAP | — |
 * | lootChance     | +Anteil auf die Chance regulaerer Kill-Loot-Tabellen (0.10); Klemme LOOT_CHANCE_BONUS_CAP | — |
 *
 * Die drei letzten Kinds sind die Runen-Tier-IV-Hooks (Chef-Entscheid 25.08.2026,
 * design/runen-tier-iv.html §3/§4): Ungebrochene Mauer (blockRestore, Schild), Chronik (combatXp,
 * Schmuck), Nachlese (lootChance, Schmuck). Sie sind bewusst KINDS und keine EquipBonus-Schluessel
 * (§9 Frage 5): ein Kind ist pro Item einmalig (`affixHasActiveEffect`) und stapelt ueber Quellen
 * nur per MAX, ein Bonus-Schluessel wuerde ueber 16 Schmuck-Slots additiv laufen.
 */
export type SpecialEffectType =
  | "execute"
  | "giantSlayer"
  | "desperation"
  | "bounty"
  | "firstBlood"
  | "momentum"
  | "firstStrike"
  | "eagleEye"
  | "everyNth"
  | "critBurst"
  | "vengeance"
  | "cooldownOnKill"
  | "manaOnKill"
  | "healOnKill"
  | "overkillCarry"
  | "antiRegen"
  | "manaDrain"
  | "wardSiphon"
  | "plaguebearer"
  | "gutter"
  | "frostbite"
  | "catalyst"
  | "surplus"
  | "ammoSaver"
  | "luckyStrike"
  | "packLeader"
  | "thorns"
  | "doubleStrike"
  | "bane"
  | "blockRestore"
  | "combatXp"
  | "lootChance";

/** Alle implementierten Spezial-Kinds (Guard-Quelle: status-coverage prüft Content dagegen). */
export const SPECIAL_EFFECT_TYPES: SpecialEffectType[] = [
  "execute",
  "giantSlayer",
  "desperation",
  "bounty",
  "firstBlood",
  "momentum",
  "firstStrike",
  "eagleEye",
  "everyNth",
  "critBurst",
  "vengeance",
  "cooldownOnKill",
  "manaOnKill",
  "healOnKill",
  "overkillCarry",
  "antiRegen",
  "manaDrain",
  "wardSiphon",
  "plaguebearer",
  "gutter",
  "frostbite",
  "catalyst",
  "surplus",
  "ammoSaver",
  "luckyStrike",
  "packLeader",
  "thorns",
  "doubleStrike",
  "bane",
  "blockRestore",
  "combatXp",
  "lootChance",
];

/** Jeder Waffeneffekt-Typ: klassischer Status (burn/…) ODER Spezial-Kind (Waffen 2.0 §2.1). */
export type WeaponEffectType = StatusType | SpecialEffectType;

const STATUS_TYPE_SET: ReadonlySet<string> = new Set(["burn", "frost", "shock", "poison", "bleed"]);
/** Type-Guard: ist dieser Effekt-Typ ein klassischer Status (DoT/Frost/Schock)? */
export function isStatusEffectType(type: WeaponEffectType): type is StatusType {
  return STATUS_TYPE_SET.has(type);
}

/**
 * Ein Waffen-Effekt. Zwei Familien über dasselbe Datenfeld:
 *  - STATUS (`type` ∈ StatusType): wird bei einem Treffer mit `chance` (0..1) ausgelöst und legt
 *    einen Status der Stärke `magnitude` für `durationMs` an (klassisches Modell, unverändert).
 *  - SPEZIAL (`type` ∈ SpecialEffectType): passiver Bedingungs-Effekt (Waffen 2.0 §2.1) —
 *    Feld-Semantik je Kind siehe Tabelle an `SpecialEffectType`. Nicht genutzte Felder auf 0.
 * Eine Waffe kann genau einen `weaponEffect` UND/ODER mehrere `weaponEffects[]` tragen — die
 * effektive Liste liefert `effectiveWeaponEffects(item)` (s. `ItemDef`).
 */
export interface WeaponEffect {
  type: WeaponEffectType;
  chance: number;
  magnitude: number;
  durationMs: number;
  /** Nur Spezial-Kinds mit Bedingungs-Schwelle (execute/desperation/surplus): Anteil 0..1. */
  threshold?: number;
  /** Nur momentum (max Stapel) und everyNth (n). */
  stacks?: number;
  /**
   * Nur bane (Pflichtfeld bei diesem Kind): Monster-Familie, gegen die der Bonus greift
   * (`MonsterDef.family === targetFamily` ⇒ ×(1+magnitude)). Aggregation wie bei allen Kinds
   * (combat.ts §2.3): GLEICHES Kind aus mehreren Quellen stapelt nicht — die stärkste Magnitude
   * gewinnt, unabhängig von targetFamily; verschiedene Kinds multiplizieren.
   */
  targetFamily?: MonsterFamily;
}

// ───────────────────────────────────────────────────────────────────────────
// Shop / Wirtschaft
// ───────────────────────────────────────────────────────────────────────────

/** Wie viel beim Verkauf vom Item-Wert ausgezahlt wird (Rest = Spanne des Händlers). */
export const SELL_FRACTION = 0.5;
/** Slots pro gekauftem Inventar-Upgrade. */
export const SLOT_UPGRADE_AMOUNT = 2;
/** Basiskosten des ersten Slot-Upgrades. */
export const SLOT_UPGRADE_BASE_COST = 60;
/** Kostenwachstum je weiterem Slot-Upgrade. */
export const SLOT_UPGRADE_GROWTH = 1.5;
/** Maximale Länge der Buy-Back-Liste (nur die letzten N Verkäufe bleiben zurückkaufbar). */
export const BUYBACK_MAX_ENTRIES = 12;

// ───────────────────────────────────────────────────────────────────────────
// Kampf-Konstanten (Platzhalter-Werte, später justierbar)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Anteil des Nahkampfschadens, der als HP zurückfließt (Lebensraub). Von 0.12 auf 0.08 gesenkt
 * (Playtest 2026-06-25, P1-Combat-Gefahr): 12 % heilte mehr zurück als ein gegearter Spieler je
 * verlor → 0 Tode, Auto-Eat/Food bedeutungslos. 8 % hielt die Melee-Stil-Identität (einziger Stil
 * mit Selbstheilung), lässt aber starken Gegnern echten Netto-Schaden durch.
 * Armor-Iteration 2 (§6.2): 0.08 → 0.06 (−25 % Durchsatz) — die 3 Nicht-Enrage-L90-Bosse kippten
 * mit 0.08 auf „netto ~0 HP/s" (foodless 0-Tod); 0.06 lässt ein leichtes Netto-Minus durch → Food
 * kehrt für Melee zurück, ohne die Sustain-Identität zu töten (Lifesteal deckt weiter ~¾ des Chips).
 */
export const MELEE_LIFESTEAL = 0.06;
/**
 * Deckel für den Lebensraub pro Treffer als Anteil der max. HP. Verhindert, dass ein einzelner
 * Krit-Schlag den Spieler praktisch voll heilt (Burst-Lifesteal trivialisierte Boss-Spike-Phasen).
 */
export const MELEE_LIFESTEAL_CAP_PCT = 0.05;
/**
 * Absoluter Deckel für den Lebensraub pro Treffer (HP). Greift ZUSÄTZLICH zum prozentualen Deckel
 * (effektiver Deckel = min beider). Hintergrund (Playtest 2026-06-25 r2, P1-Endgame-Gefahr): der
 * reine 5%-maxHp-Deckel skaliert mit der riesigen Endgame-HP (maxHp ~1700 → 85 HP/Treffer) mit und
 * heilte Melee bei Bossen praktisch voll → Auto-Eat löste nie aus. Ein absoluter Deckel von 12 HP
 * lässt Lifesteal im Frühgame unverändert (dort greift ohnehin der niedrigere %-Deckel), kappt ihn
 * aber im Endgame auf einen spürbaren, nicht-trivialisierenden Tropfen — reicht nicht, um den
 * Boss-Netto-Schaden zu negieren. (Stat-Squish ÷10: 12 → 1.2 — relativer Bindungspunkt bleibt.)
 */
export const MELEE_LIFESTEAL_CAP_ABS = 1.2;

// ── Runen-Tier-IV-Deckel (Chef-Entscheid 25.08.2026, design/runen-tier-iv.html §7.2 / §9) ──
// Drei neue Spezial-Kinds bekommen je eine Klemme in shared, damit Fehl-Content (eine Rune mit
// magnitude 5) nie ausbrechen kann. Muster: MELEE_LIFESTEAL_CAP_* / PET_ABILITY_CAP.
/**
 * blockRestore: Anteil der max. HP, den EIN erfolgreicher Block hoechstens heilt. Die Rune der
 * Ungebrochenen Mauer traegt genau diesen Wert (0.02); mehr gibt es ueber Content nicht (§9 Frage 11,
 * Option A). Sustain-Groessenordnung: bei 47 % Block und 3-s-Gegnerintervall ~0,3 % maxHp/s.
 */
export const BLOCK_RESTORE_CAP_PCT = 0.02;
/**
 * blockRestore: absolute Klemme je Block (HP). Bewusst an die Lifesteal-Schiene gebunden
 * (2 × MELEE_LIFESTEAL_CAP_ABS): die Block-Heilung soll dieselbe Groessenordnung haben wie der
 * gedeckelte Melee-Lebensraub, nur seltener feuern. Effektive Heilung = min(maxHp·pct, ABS).
 */
export const BLOCK_RESTORE_CAP_ABS = MELEE_LIFESTEAL_CAP_ABS * 2;
/**
 * combatXp: Obergrenze des Kampf-XP-Bonus-Anteils (Rune der Chronik: 0.10). Die XP-Zielkurve
 * toleriert ±10 % je Sprosse (§4.3); 0.20 laesst Raum fuer eine spaetere Stufe, ohne die Leiter zu
 * knicken. Greift in `addXp` (combat.ts) auf JEDE XP des Kampfmoduls, nicht auf Slayer-XP
 * (eigener Vergabe-Pfad mit eigener Klemme SLAYER_POINTS_TOTAL_BONUS_CAP).
 */
export const COMBAT_XP_BONUS_CAP = 0.20;
/**
 * lootChance: Obergrenze des Beutechance-Bonus-Anteils (Rune der Nachlese: 0.10). Wirkt NUR auf die
 * Chance regulaerer Kill-Loot-Tabellen (`monster.loot` in onEnemyDefeated, auf 1 geklemmt), NICHT
 * auf Elite-Uniques (eigener `eliteRng`-Strom), NICHT auf Dungeon-Truhen/-Abschluss (§9 Frage 4,
 * Option A: 1/1000 bleibt sinngemaess 1/1000, die Rare-Drop-Philosophie bleibt intakt).
 */
export const LOOT_CHANCE_BONUS_CAP = 0.20;
// HP_REGEN_PER_TICK: ENTFERNT (Chef-Entscheid 2026-07-02, SAVE_VERSION 49). Die natürliche
// Basis-HP-Regeneration (früher 0.04 HP/Tick außerhalb des Kampfes) existiert nicht mehr —
// Heilung kommt AUSSCHLIESSLICH aus Items/Effekten: Auto-Eat-Food, Tränken (Auto-Trank-System),
// Melee-/Gear-Lifesteal, Pet-Heals, Voll-Heal beim Tod-Abbruch und `hpRegenPerSec` aus
// Ausrüstung/Set-Boni/Buffs („Special Effects", bleiben voll wirksam). Mana-Regeneration
// (WIS-basiert, computeStats.manaRegen) ist bewusst UNBERÜHRT — nur Health ist betroffen.
/**
 * Auto-Eat-Upgrade-Stufen (Melvor-artige Gold-Senke). Stufe 0 = Basis (entspricht dem alten
 * festen Verhalten). Höhere Stufen essen früher (höhere `threshold` = mehr Sicherheitspuffer)
 * UND vor allem deutlich FOOD-EFFIZIENTER: `healMult` ist HP-Heilung pro EINEM Food-Item.
 *
 * Warum healMult der Food-Spar-Faktor ist (run7 P2/P3 „T0=T3, Tiers fühlen sich gleich an"):
 * Auto-Eat isst pro Tick GENAU 1 Food, solange HP < threshold·maxHp. Deckt eine Heilung den
 * HP-Einbruch nicht in einem Bissen (schwaches Food / hohe maxHp — genau die Kaufphase dieser
 * Upgrades), wird Tick für Tick nachgegessen → viele Food-Items pro Einbruch. Ein höherer
 * `healMult` füllt den Einbruch in 1 Bissen und spart so direkt Food (bis ~3× weniger Bissen
 * auf Max-Stufe). So ist jede Stufe ein klar spürbarer Effizienz-/Komfort-Gewinn, ohne die
 * idle-Robustheit zu brechen (Heilung bleibt auf maxHp gedeckelt; rein deterministisch).
 *
 * Die Spreizung wurde von 1.0…1.5 auf 1.0…3.0 verbreitert, damit der Effizienz-Unterschied
 * tatsächlich zählt. Beide Werte (threshold + healMult) liegen im Anwendungspfad combat.ts
 * (`tryAutoEat` liest `autoEatThreshold`/`autoEatHealMult`) und wirken ohne weitere Änderung.
 * `cost` = Gold für den Aufstieg in DIESE Stufe (Stufe 0 ist gratis/Start).
 */
// Chef-Entscheid: AutoEat-Upgrades ändern NUR die Schwelle (ab wann gegessen wird), NIE die Heal-Menge.
// Daher healMult durchgängig 1.0 (Heilung = Food-Basiswert). Höhere Tiers essen früher → sicherer.
// Balance-Kette Schritt 4 (Chef-GO, Spec weapon-damage-scaling §5.5): Schwellen
// [0.5, 0.6, 0.7, 0.8] → [0.45, 0.55, 0.62, 0.70]. Die alte Top-Schwelle 0.8 fraß bei jedem
// Chip-Treffer knapp unter Voll (Panik-Nibbling = maximaler Food-Burn); 0.70 als neue Decke
// beendet das, die unteren Stufen rücken mit, damit jede Stufe ein spürbarer Schritt bleibt.
// Der Spieler-Override (Slider, nur Max-Stufe) bleibt davon unberührt.
export const AUTO_EAT_TIERS: { threshold: number; healMult: number; cost: number }[] = [
  { threshold: 0.45, healMult: 1.0, cost: 0 },
  { threshold: 0.55, healMult: 1.0, cost: 2_000 },
  { threshold: 0.62, healMult: 1.0, cost: 8_000 },
  { threshold: 0.70, healMult: 1.0, cost: 25_000 },
];
export const AUTO_EAT_MAX_TIER = AUTO_EAT_TIERS.length - 1;

function autoEatTier(tier: number): { threshold: number; healMult: number; cost: number } {
  return AUTO_EAT_TIERS[Math.max(0, Math.min(AUTO_EAT_MAX_TIER, tier))]!;
}
/** HP-Anteil, unter dem bei gegebener Auto-Eat-Stufe automatisch gegessen wird. */
export function autoEatThreshold(tier: number): number {
  return autoEatTier(tier).threshold;
}
/** Heil-Multiplikator des Essens bei gegebener Auto-Eat-Stufe. */
export function autoEatHealMult(tier: number): number {
  return autoEatTier(tier).healMult;
}
/**
 * Schwellen-Slider auf der MAX Auto-Eat-Stufe (Chef-Feature 2026-07-06, analog Auto-Trank-Slider):
 * Erst auf der obersten Stufe (`AUTO_EAT_MAX_TIER`) darf der Spieler die Ess-Schwelle FREI justieren
 * (`character.autoEatThreshold`, HP-Anteil 0..1). Darunter bleibt die feste Tier-Schwelle
 * (`AUTO_EAT_TIERS`) bestehen, damit die Upgrades weiter ein spürbarer Fortschritt sind.
 *
 * Default = Max-Tier-Schwelle → verhaltensneutral: ein Alt-Save / ungesetztes Feld isst auf der
 * Max-Stufe exakt wie bisher. Min/Max klemmen Slider (UI), Persistenz-Härtung UND den Kampf-Lesepfad
 * gleichermaßen (0 % wäre „nie essen" = sicherer Idle-Tod; 100 % = Dauer-Essen bei vollen HP).
 */
export const AUTO_EAT_DEFAULT_THRESHOLD = AUTO_EAT_TIERS[AUTO_EAT_MAX_TIER]!.threshold;
export const AUTO_EAT_MIN_THRESHOLD = 0.05;
export const AUTO_EAT_MAX_THRESHOLD = 0.95;
/**
 * Effektive Auto-Eat-Ess-Schwelle (HP-Anteil 0..1) für den Kampf-Tick (`tryAutoEat` in combat.ts).
 * DIE einzige Stelle, die Override vs. feste Tier-Schwelle entscheidet: auf der Max-Stufe UND mit
 * gesetztem (endlichem) `autoEatThreshold` gilt der Spieler-Override (geklemmt auf
 * [AUTO_EAT_MIN_THRESHOLD, AUTO_EAT_MAX_THRESHOLD]); sonst die feste `autoEatThreshold(tier)`.
 * Rein lesend, deterministisch — kein RNG/I/O.
 */
export function effectiveAutoEatThreshold(character: {
  autoEatTier?: number;
  autoEatThreshold?: number;
}): number {
  const tier = character.autoEatTier ?? 0;
  if (
    tier >= AUTO_EAT_MAX_TIER &&
    typeof character.autoEatThreshold === "number" &&
    Number.isFinite(character.autoEatThreshold)
  ) {
    return Math.max(AUTO_EAT_MIN_THRESHOLD, Math.min(AUTO_EAT_MAX_THRESHOLD, character.autoEatThreshold));
  }
  return autoEatThreshold(tier);
}
/**
 * Cooldown (ms) zwischen zwei Auto-Eat-Bissen. OHNE Cooldown isst der Spieler JEDEN Tick → man kann
 * praktisch nie sterben (Chef-Feedback „mit Food kann man fast nie sterben"). Mit Cooldown können
 * mehrere harte Treffer in Folge töten, bevor das nächste Essen greift — „spürbar, aber fair".
 * Balance-Domäne (Chef tunebar). Wird im Kampf pro Tick heruntergezählt.
 *
 * Balance-Kette Schritt 4 (Chef-GO, Spec weapon-damage-scaling §5.2/§5.5): 3_000 → 4_500.
 * Größerer Bissen, seltener: Ziel-Mittel-Food heilt ~18 % maxHp je Bissen (Content-Werte setzt
 * content-dev in Schritt 5) ⇒ Peak-Sustain bleibt ~4 %/s (18 %/4.5 s ≈ 12 %/3 s), also UNTER dem
 * naked-on-level-Inflow (~5 %/s) — die „Rüstung ist Pflicht"-Garantie bleibt stehen, aber es
 * werden ~⅓ weniger Food-Items verbrannt und jeder Heal ist eine große, befriedigende Zahl.
 */
export const AUTO_EAT_COOLDOWN_MS = 4_500;
/**
 * Cooldown (ms) zwischen zwei Auto-Trank-Schlucken (Auto-Trank-System, Chef-Feature 2026-07-02;
 * analog AUTO_EAT_COOLDOWN_MS, aber bewusst LÄNGER): Tränke heilen kräftiger als Food und takten
 * deshalb langsamer — Auto-Eat bleibt die schnelle Grundversorgung, der Trank der seltene große
 * Schluck. Balance-Domäne (Chef tunebar). Wird in combat.ts pro Tick heruntergezählt
 * (`CombatState.autoPotionCooldownMs`).
 *
 * Combat-Feel v2 #0b: 5_000 → 8_000. Sobald Heiltränke auf `healPct` (%maxHp, s. `consumableHeal`)
 * umgestellt sind, ist ein Top-Trank ein GROSSER Schluck (bis ~25 % maxHp); der längere Cooldown
 * deckelt den DAUER-Durchsatz (25 %/8 s ≈ 3,1 %/s) unter den nackten on-level-Zufluss, damit
 * Rüstung/Mitigation ab Mid wieder Pflicht bleibt (Trank = Notreserve, nicht Sustain-Motor).
 */
export const AUTO_POTION_COOLDOWN_MS = 8_000;
/** Default-HP-Schwelle (Anteil 0..1), unter der der Auto-Heiltrank getrunken wird. */
export const AUTO_POTION_DEFAULT_THRESHOLD = 0.4;
/**
 * Obergrenze der Auto-Trank-Schwelle (Sweep6 T8-P4-2). Die Trink-Bedingung ist „hp AUF/UNTER
 * Schwelle" — bei Schwelle 1.0 wäre sie auch bei VOLLEN HP wahr und der Trank würde alle
 * AUTO_POTION_COOLDOWN_MS mit 0 Heilung verbrannt (nur per Save-Edit/API erreichbar; der
 * UI-Slider endet ohnehin bei 90 %). Engine klemmt Setter UND Trink-Pfad hierauf.
 */
export const AUTO_POTION_MAX_THRESHOLD = 0.9;
/** Einmaliger Goldpreis für Auto-Buff/automatisches Nachtrinken abgelaufener Tonika. */
export const AUTO_REBUFF_UNLOCK_COST = 50_000;
/**
 * Auto-Trank-Einstellungen (persistiert in `CharacterState.autoPotion`, SAVE_VERSION 49).
 * Analog zum Auto-Eat-System, aber mit EIGENER Schwelle + EIGENEM Cooldown — beide Systeme
 * prüfen im Kampf-Tick unabhängig voneinander (Food zuerst; hebt dessen Heilung die HP über
 * die Trank-Schwelle, bleibt der Trank im Gürtel).
 */
export interface AutoPotionSettings {
  /** Konfigurierter Heiltrank (Item-ID). null = Auto-Heiltrank AUS (Default). */
  healPotionId: ItemId | null;
  /** HP-Anteil (0..1), auf/unter dem getrunken wird. Default AUTO_POTION_DEFAULT_THRESHOLD. */
  healThreshold: number;
  /**
   * true ⇒ läuft ein Buff-Tonikum ab (character.buffs) und DASSELBE Item liegt noch im Inventar,
   * wird es automatisch nachgetrunken — im Kampf UND beim Skilling (Gather-Tonika). Default false.
   */
  autoRebuffTonics: boolean;
  /** Einmalig mit AUTO_REBUFF_UNLOCK_COST freigeschaltet; Voraussetzung für autoRebuffTonics. */
  autoRebuffUnlocked: boolean;
}
/** Frische Auto-Trank-Einstellungen (Default: alles aus). */
export function defaultAutoPotion(): AutoPotionSettings {
  // codex:2026-08-02T16:20:00+02:00 — neue Figuren müssen Auto-Buff bewusst kaufen.
  return {
    healPotionId: null,
    healThreshold: AUTO_POTION_DEFAULT_THRESHOLD,
    autoRebuffTonics: false,
    autoRebuffUnlocked: false,
  };
}
/**
 * Kill-Cooldown (Chef-Feature „Kampf entschleunigen"): Nach JEDEM Monster-Kill vergehen so viele ms,
 * bevor der nächste Gegner aktiv wird (kein Angriff beider Seiten, kein neuer Encounter). Gilt IMMER —
 * aktiv, idle UND offline (bewusste Design-Entscheidung: kills/h sinken um TTK/(TTK+5s)). Deterministisch
 * tick-basiert in combat.ts (`CombatState.cooldownRemainingMs`) heruntergezählt, kein Date.now. In diesem
 * Fenster zeigt die UI die Kill-Summary (`CombatState.lastKill`). Balance-Domäne (Chef tunebar).
 * Chef-Tuning 2026-07-02: 3_000 → 5_000 (Kampf weiter entschleunigen, Kill-Summary länger lesbar).
 */
export const KILL_COOLDOWN_MS = 2_000;
/**
 * Dungeon-Dramaturgie (Dungeon-Rework-Spec §5.1.2/§5.4): Atempause VOR dem Boss-Finale. Beim
 * Übergang in die LETZTE Welle eines Dungeons MIT definierter Schatztruhe (`DungeonDef.chest`)
 * beträgt der Wellen-Cooldown einmalig diesen Wert statt `KILL_COOLDOWN_MS` — das 8-s-Fenster IST
 * das Boss-Intro (UI zeigt darin Truhen-Loot + Boss-Ansage; kein eigener Engine-Zustand, §5.1.5).
 * Bewusst NICHT durch `cooldownOnKill`-Waffen verkürzbar (Dramaturgie-Fenster, kein Farm-Cooldown).
 * Dungeons OHNE `chest` behalten den normalen Wellen-Cooldown → Alt-Content bit-identisch.
 */
export const PRE_BOSS_BREATHER_MS = 8_000;
/**
 * Stalemate-Erkennung: Macht ein Kampf über so viele ms KEINEN Netto-Fortschritt (der niedrigste je
 * erreichte Gegner-HP-Wert sinkt nicht weiter — z.B. Gegner-Regen ≥ Spieler-DPS, oder Evasion/Mitigation
 * zu hoch), wird er automatisch gestoppt statt endlos still weiterzulaufen (Idle-Zeit-Falle). 60 s ist
 * großzügig: ein gewinnbarer (auch langsamer) Kampf erreicht weit häufiger als alle 60 s einen neuen
 * Tiefstwert → kein Fehlalarm; nur ein echter Patt (Fortschritt ≈ 0) löst aus. Balance-Domäne (Chef tunebar).
 */
export const STALEMATE_NO_PROGRESS_MS = 60_000;
/**
 * Mindest-Netto-Fortschritt, der den Stalemate-Timer zurücksetzt: der niedrigste Gegner-HP muss pro
 * Fenster um mind. diesen Anteil der maxHp weiter sinken. Verhindert, dass MIKRO-Fortschritt (ein paar
 * HP, die der Regen sofort zurückholt) fälschlich als „Fortschritt" zählt — nur ein echter, spürbarer
 * Abwärtstrend gilt. 1 % ⇒ Kämpfe, die nicht binnen ~100 min/Kill schaffen, gelten als Patt (Idle-untauglich).
 */
export const STALEMATE_MIN_PROGRESS_PCT = 0.01;
/** Wie viele Kampf-Log-Einträge maximal behalten werden. */
export const COMBAT_LOG_MAX = 40;
/**
 * Verteidigungs-Mitigation (prozentual, Melvor/OSRS-Stil): Schadensreduktion =
 * defense/(defense+K). Hohe Verteidigung dämpft, nullt aber nie. K=12.5 → def 12.5 = 50 %,
 * def 25 = 67 % Reduktion. Ersetzt die alte flache Subtraktion (s. design/balance-combat-2.md).
 *
 * Historie: von 100 auf 125 angehoben (Playtest 2026-06-25, P1-Combat-Gefahr): bei K=100 dämpfte
 * ein Endgame-Held >70 % weg, sodass selbst der End-Boss nichts durchbrachte. Stat-Squish ÷10
 * (Spec §3.2, PFLICHT-Kopplung): def ist ×0.1 → K MUSS ×0.1 (125 → 12.5), sonst kippt die
 * Reduktions-Kurve. Die Mitigation-Prozente sind damit bit-identisch zur Vor-Squish-Balance.
 * Gilt symmetrisch für Spieler- UND Gegner-Mitigation (gleicher Term in resolveAttack).
 *
 * Armor-Iteration 2 (§0.2, ×10-Armor-Skala): 12.5 → 125. Der Chef will „große" OSRS-artige
 * Rüstungswerte; ALLE `armorRating`- UND Monster-`defense`-Werte werden von content-dev ×10
 * skaliert. Weil K MIT-skaliert, bleibt die Mitigation bit-identisch: `AR/(AR+K)` mit AR×10 und
 * K×10 liefert exakt denselben Prozentsatz. ⚠️ KOPPLUNG: bis content den ×10-Rescale liefert
 * (Phase C), dämpft der Term untertunt (kleine Alt-armorRating gegen K=125 ⇒ ~0 Mitigation) —
 * die Invarianz gilt erst NACH dem Content-Rescale.
 */
export const DEFENSE_MITIGATION_K = 125;
/**
 * Oberer Deckel für die Defense-Mitigation (Playtest 2026-06-25 r2, P1-Endgame-Gefahr). Ohne Deckel
 * läuft `def/(def+125)` mit wachsender Endgame-Verteidigung (full-godiron + Set-Bonus → def ~500+)
 * asymptotisch gegen ~0,85 weiter hoch → der End-Boss bringt netto fast nichts mehr durch, 0 Tode,
 * Auto-Eat tot. Bei 0,80 gedeckelt nimmt ein voll gegearter Spieler im Endgame weiterhin spürbaren
 * Schaden (last_idol 110 → 22/Treffer, enrage ×1,75 → 39), ohne dass es zum Death-Loop kippt —
 * idle-fair, aber nicht mehr unverwundbar. Gilt symmetrisch für Spieler- UND Gegner-Mitigation.
 */
export const DEFENSE_MITIGATION_MAX = 0.8;

// ───────────────────────────────────────────────────────────────────────────
// Rüstungs-Trinität / Itemization 2.5 (design/armor-trinity-spec.md §1) — Klassen-Defensiv-Schicht.
//
// Vier defensive Identitäten je Rüstungsklasse, GETRENNT vom Attribut-Basiskern:
//   Platte (STR) → Mitigation via `armorRating` (nutzt DEFENSE_MITIGATION_K/-MAX, wie gehabt),
//   Schild (Melee-1H) → Block-Chance (`blockChance`), Leder (DEX) → flache Ausweich-Chance
//   (`evasionRating`), Stoff (INT/WIS) → Ward-Absorptionspool (`wardCapacity` + INT-Kern).
// Diese Konstanten sind die Deckel/Faktoren der neuen Schichten. computeStats (character.ts) leitet
// maxWard/dodgeChance/blockChance/armorRating ab; combat.ts (Phase A2) wendet Block/Dodge/Ward/
// One-Shot-Cap im Fight an. Der bestehende MANA_SHIELD-Pfad bleibt bis A2 in Kraft (combat-dev
// ersetzt ihn dort durch den Ward-Absorb).
// ───────────────────────────────────────────────────────────────────────────

/** Max. Block-Chance eines Schildes (0..1), gedeckelt in computeStats. Spec §1.2. */
export const BLOCK_CAP = 0.5;
/**
 * Schadensreduktion eines geblockten Treffers (0..1). combat-dev (Phase B) wendet es an. Spec §1.2.
 * Armor-Iteration 2 (§3): 0.75 → 0.85. Block-Wumms rauf, damit 1H+Schild eine echte Defensiv-Linie
 * gegen 2H wird (Block-Ø-Reduktion an L30 von ~18 % auf ~26 %). Kein Full-Negate (0.85 statt 1.0),
 * damit kein „Immun-Feelbad" (C-melee-L10) entsteht — Block gibt Wumms ohne Null-Chip.
 */
export const BLOCK_DAMAGE_REDUCTION = 0.85;
/**
 * Max. flache Leder-Ausweichchance (0..1), gedeckelt in computeStats.
 * Evasion-Tempo-Zähmung (design/evasion-tempo-taming-spec.md §3.1, #301): 0.75 → 0.40 — Dodge ist
 * VOLL-Vermeidung (−100 % Schaden) und darf nie über BLOCK_CAP (0.5 bei nur −85 %) liegen; Chef-
 * Vorgabe „on-level ~30–40 % max". Der alte 0.75-Deckel war der Normalzustand (Voll-Voidhide = Cap)
 * und machte BiS-Leder gegen den L245-Boss de facto unverwundbar (Live-Sim: 3,4 % Land-Chance).
 */
export const DODGE_CAP = 0.40;
/**
 * Halbwertskonstante der Leder-Ausweichkurve: computeStats rechnet
 * `dodge = min(DODGE_CAP, DODGE_EFF_MAX·Σevr/(Σevr+K_DODGE))` — dieselbe Kurvenform wie die
 * Armor-Mitigation (`x/(x+K)`), seit #301 mit Asymptote DODGE_EFF_MAX statt 1.
 * Evasion-Tempo-Zähmung (§3.1): 45 → 60 — Kurve gestreckt (viele Sprossen statt Cap-Plateau ab R15);
 * die item-`evasionRating`-Werte im Content bleiben unangetastet (die Kurve reicht global).
 */
export const K_DODGE = 60;
/**
 * Asymptote der Leder-Ausweichkurve (Evasion-Tempo-Zähmung §3.1, #301). BEWUSST > DODGE_CAP:
 * der Cap (0.40) ist mit Voll-Investment (R99-Leder + Evasion-Runen + Tonikum, Σevr ≥ 240)
 * ERREICHBAR, aber nur so — exakt die Crit-Spec-Philosophie „Caps sind erreichbar, by design".
 * R99-Voll-Leder allein (Σevr 135) landet bei ~34,6 %.
 */
export const DODGE_EFF_MAX = 0.5;
/**
 * Leder-Schadens-Floor (Armor-Iteration 2 §5.2): ein LANDENDER Treffer gegen einen Leder-Träger
 * (dodgeChance > 0) wird nach der Mitigation um diesen Anteil reduziert. Dämpft die
 * „ein Unglückstreffer = halbe Leiste"-Varianz am Low/Mid-Band, ohne Leders Vermeidungs-Identität
 * zu Mitigation umzubauen. combat-dev (Phase B) wendet es im resolveAttack-Pfad an.
 * Evasion-Tempo-Zähmung (§3.4, #301): 0.12 → 0.18 — EHP-Ausgleich für die Dodge-Senkung (§4.2:
 * Leder-EHP ×1.87, knapp unter Platten-Parität ×2.00; Voll-Vermeidung bleibt der Qualitäts-Vorteil).
 */
export const LEATHER_HIT_FLOOR = 0.18;
/**
 * Ward-Teil-Refill je Kill (Armor-Iteration 2 §6.1): statt eines Gratis-Voll-Resets füllt ein Kill
 * den Ward-Pool nur um diesen Anteil von maxWard nach → in einem Dauerkampf erodiert der Pool
 * (Food-Druck für Magier). Kampf-START/Tod-Voll-Heal bleiben voller Ward. combat-dev (Phase B).
 * Armor-Iteration 2.1 F1b: 0.20 → 0.10 — der Kill-Refill ist am Low/Mid-Band der DOMINANTE Ward-
 * Zufluss; ohne ihn zu halbieren bleibt der Magier food-frei (WARD_PER_MANA allein reicht nicht,
 * beide Hebel gekoppelt). De-facto Magier-only: WARD_CORE_PER_INT=0 ⇒ Melee/Ranged maxWard=0 ⇒
 * 0.10·0 = 0 → Melee/Ranged unberührt.
 */
export const WARD_KILL_REFILL_PCT = 0.10;
/**
 * Ward, das je 1 verbrauchtem Mana-Punkt auflädt (Recharge-an-Cast-Kopplung). Spec §1.4.
 * Armor-Iteration 2.1 F1a: 0.5 → 0.20 — der flache Cast-Recharge (≈1.0–1.47/s über alle Bänder)
 * war die eigentliche Low/Mid-Band-Sustain-Engine (nie erodierender Ward → nie Food); 0.20 drückt
 * ihn auf Endgame-Niveau (≈0.40–0.59/s), bleibt ein kleiner thematischer Cast-Trickle.
 */
export const WARD_PER_MANA = 0.20;
/** Anti-One-Shot: kein Einzeltreffer > 50 % der max. HP. combat-dev (A2) wendet es an. Spec §1.6. */
export const ONE_SHOT_CAP = 0.5;
/**
 * Attribut-Basisanteil des Ward-Pools je INT-Punkt (maxWard = int·dies + Σ wardCapacity). Spec §1.4.
 * Armor-Iteration 2 (§2): 1.0 → 0. Ward kommt jetzt AUSSCHLIESSLICH aus Stoffgear (`wardCapacity`);
 * der frühere INT-Kern ist in die §11.5-Stoff-Tabelle eingefaltet (content-dev, Phase C). Melee/
 * Ranged zeigen damit keine Ward-Leiste mehr (UI gatet auf maxWard>0) und bekommen keinen Gratis-
 * Absorb-Sockel („Ward-INT-Leak", in allen 12 Testern gemeldet).
 */
export const WARD_CORE_PER_INT = 0;
/** Warding-Skill → Ward-Regen pro SEKUNDE und Level (Armor-Iteration 2 §9.2). Cap: WARDING_REGEN_CAP. */
export const WARDING_REGEN_PER_LEVEL = 0.02;
/** Deckel des Warding-Ward-Regens/s (bleibt ≪ Endgame-DPS-in → kein Unsterblichkeits-Sustain). §9.2. */
export const WARDING_REGEN_CAP = 2.0;
/** Multiplikator des Ward-Regens in der Defensiv-Magie-Stance (Armor-Iteration 2 §9.2): ×1.5. */
export const WARDING_DEF_STANCE_MULT = 1.5;
/**
 * Warding-XP je absorbiertem Ward-Punkt (Armor-Iteration 2 §9.3): jeder Magier, der Treffer
 * schluckt, levelt Warding (stil-neutral, „man lernt Abwehr durch Abwehren"). combat-dev wendet ihn
 * beim absorbWard an.
 *
 * Retune D3 (Chef-Entscheid 27.08.2026, Achievements-Audit § 3.1/Frage 3): 0,25 → 1,0 (Faktor 4, obere
 * Kante der Chef-Spanne 3–4). Messung (engine/warding-xp-rate.test.ts, `advance`-Sim mit Auto-Essen,
 * Offensiv-Haltung, 2 Sim-h je Band): der Ward-Zufluss (Mana-Cast ×WARD_PER_MANA + Kill-Refill +
 * Warding-Regen) deckelt das Absorbierte auf ~14–30 k Ward/h — bei 0,25 also nur 3,5–7,6 k XP/h,
 * das wären 1 700–3 700 h bis 99 auf dem passiven Pfad (das Audit hatte 60 k XP/h ≈ 220 h geschätzt).
 * Mit 1,0 liefert der passive Pfad 14–30 k XP/h ≈ 8–25 % des gleichzeitig verdienten Magie-XP —
 * ein spürbares Nebeneinkommen für den Offensiv-Magier, das NIE den Offensiv-Skill überholt
 * (Pin: Bannmagie-XP < 50 % der Magie-XP im selben Kampf). Der eigentliche 99er-Pfad bleibt die
 * Defensiv-Magie-Haltung (activeStanceMods → xpSkill "warding": 100 % Offensiv-+Kill-XP; gemessen
 * ~74 h bis 99 im Endgame-Band, paritätisch zur Verteidigung).
 */
export const WARDING_XP_PER_ABSORB = 1.0;

// ───────────────────────────────────────────────────────────────────────────
// Crit-Zähmung (design/crit-taming-spec.md §3/§5.1, Task #294) — Endgame-One-Hit-Fix.
//
// Vorher: critChance linear `S/100` (S = 0.4·dex + 0.6·lck) mit 0.9-Cap, critDamage
// `1.5 + lck·0.04` UNGECAPPT → BiS-Endgame 90 % / 533 % = ×4.9 eff. DPS ⇒ One-Hits auf
// Idol-Hall-Bosse. Neu: Attribut-Beitrag auf Sättigungskurve `ATTR_MAX·S/(S+K)` (gleiche
// Form wie Mitigation/Dodge), harter Chance-Cap 0.5 (Präzedenz BLOCK_CAP), Schadens-Cap 2.5,
// LCK-Schadens-Faktor 0.04 → 0.01. Suffixe/Tonika/Ranged-Specialty bleiben additiv über
// eq.critChance/critDamage und kaufen den Rest ZUM Cap (Caps sind erreichbar, by design).
// computeStats (character.ts) ist die einzige Anwenderstelle; combat.ts konsumiert die
// gedeckelten Stats unverändert (inkl. guaranteedCrit-Pet-Pfad).
// ───────────────────────────────────────────────────────────────────────────

/** Harter Deckel der Krit-Chance (0..1) — Endsumme aus Attributen+Gear+Suffix+Buffs. Spec §3.1. */
export const CRIT_CHANCE_CAP = 0.5;
/** Asymptote der Attribut-Krit-Kurve (MUSS < CRIT_CHANCE_CAP bleiben — Attribute allein erreichen den Cap nie). */
export const CRIT_CHANCE_ATTR_MAX = 0.45;
/** Halbwertskonstante der Sättigungskurve `ATTR_MAX·S/(S+K)`: bei S=K ist der halbe Asymptoten-Wert erreicht. */
export const CRIT_CHANCE_ATTR_K = 75;
/** Basis-Krit-Schaden (Multiplikator, unverändert 1.5 — jetzt benannt statt inline). */
export const CRIT_DAMAGE_BASE = 1.5;
/** Krit-Schaden je LCK-Punkt (war 0.04 inline — 4× zu heiß, LCK double-dippte Chance UND Schaden). */
export const CRIT_DAMAGE_PER_LCK = 0.01;
/** Deckel des Krit-Schadens (250 % total; vorher UNGECAPPT). Bei cc=Cap ⇒ eff. ×1.75 — Zielband ×1.5–1.8. */
export const CRIT_DAMAGE_CAP = 2.5;
/** Ranged-Specialty-Krit-Bonus (war 0.06 inline in character.ts) — additiv, auf CRIT_CHANCE_CAP gedeckelt. */
export const RANGED_CRIT_BONUS = 0.06;

// ───────────────────────────────────────────────────────────────────────────
// Evasion-Tempo-Zähmung (design/evasion-tempo-taming-spec.md §3/§5.1, Task #301,
// CHEF-GO 2026-07-09 mit T1-Cap −20 % statt −30 %) — „der Gegner verfehlt einfach IMMER"-Fix.
//
// Vorher: Leder-Dodge cappte real bei 0.75 (Voll-Voidhide = Cap), der DEX-Beitrag zur
// Contest-Evasion (dex·0.3) und zum Tempo (dex·40) lief LINEAR und ungecappt, Monster-Accuracy
// skalierte nicht mit dem Level → BiS-Evasion-Builds waren gegen L245-Bosse de facto unverwundbar
// (Live-Sim 3,4 % Land-Chance) und JEDE Waffe klebte ab Endgame-dex am 800-ms-Boden (Waffen-
// Tempo-Identität wegnivelliert). Muster identisch zum Crit-Leck (#294): Sättigungskurven + Caps.
// character.ts (computeStats) wendet E1/E3/T1 an, combat.ts E2 + den L5-Kombiboden (Nachtrag).
// ───────────────────────────────────────────────────────────────────────────

/** E3: Asymptote des DEX-Beitrags zur Contest-Evasion (ersetzt lineares dex·0.3). Spec §3.3. */
export const EVASION_ATTR_MAX = 25;
/** E3: Halbwertskonstante der DEX-Evasion-Kurve (dex 75 ⇒ halbe Asymptote). Spec §3.3. */
export const EVASION_ATTR_K = 75;
/**
 * E2: Gegner-Accuracy-Zuwachs je Monster-Level ÜBER der Schwelle (combat.ts, Accuracy-Lesestelle):
 * `effAcc = acc + dies·max(0, level − MONSTER_ACC_LEVEL_START)`. DAS ist der Level-Gap-Malus, nur
 * auf der richtigen Contest-Seite — ein L245er bringt effektiv ~47 acc gegen eva ~10–15 und TRIFFT
 * einen 90er (76–86 %), statt mit statischen ~14 Flavor-Punkten ins Leere zu schlagen. Spec §3.2.
 */
export const MONSTER_ACC_PER_LEVEL = 0.35;
/** E2: Level-Schwelle der Accuracy-Skalierung — alles ≤ L150 (78/99 Monster) bleibt bit-identisch. */
export const MONSTER_ACC_LEVEL_START = 150;
/** T1: Asymptote des DEX-Tempo-Beitrags in ms (ersetzt lineares dex·40; dex 105 ⇒ −1181 statt −4200). */
export const TEMPO_DEX_MS_MAX = 1800;
/** T1: Halbwertskonstante der DEX-Tempo-Kurve (dex 55 ⇒ halbe Asymptote). Spec §3.5. */
export const TEMPO_DEX_K = 55;
/**
 * T1: Max. relative Beschleunigung unter das WAFFEN-Basisintervall durch Flat-Quellen
 * (DEX-Kurve + Suffixe + Tonika/Buffs via eq.attackIntervalMs): `interval ≥ base·(1−dies)`.
 * CHEF-ENTSCHEID 2026-07-09: −20 % statt der Spec-§3.5-Vorlage −30 % („ich möchte nicht dass man
 * zu schnell angreift mit den stärkeren Waffen") — voidwarden_blade (3650) bleibt ≥ 2920 ms.
 * Die Stance-/Stil-Multiplikatoren (Ranged ×0.90, Fast-Stance ×0.85) bleiben AUSSERHALB dieses
 * relativen Bodens (bewusste Spielentscheidungen mit Accuracy-Tradeoff, kein Stat-Stacking).
 */
export const TEMPO_REDUCTION_CAP = 0.20;
/** Absoluter Angriffs-Intervall-Boden in ms (letzte Rail; war inline 800 in character.ts). */
export const ATTACK_INTERVAL_FLOOR_MS = 800;
/** Absoluter Angriffs-Intervall-Deckel in ms (war inline 5000 in character.ts). */
export const ATTACK_INTERVAL_CEIL_MS = 5000;
/** Fernkampf-Zwischen-Boden in ms nach dem ×0.90-Stil-Mult (war inline 1000 in character.ts). */
export const RANGED_INTERVAL_FLOOR_MS = 1000;

// ───────────────────────────────────────────────────────────────────────────
// Combat-Depth / Konter-Play-System (design/combat-depth-spec.md §3.3, Tasks #221/#222/#223) —
// die drei Spieler-Konter-Stats spiegeln die Gegner-Verteidigungs-Trinität (weiches RPS, kein hartes
// Dreieck). Jeder Konter trifft GENAU EINE Gegner-Achse (disjunkt):
//   Armor-Pen  ↔ Gegner-Mitigation (`effDef = def·(1−armorPen)`),
//   Precision  ↔ Gegner-Evasion    (`effEva = eva·(1−precision)`),
//   Ward-Break ↔ Gegner-Ward-Pool  (ADDITIV, Combat-Feel v2 #2a): der volle Treffer drainт den
//     Ward-Pool, und `bleed = dmg·wardBreak` trifft die HP ZUSÄTZLICH (Bonus durch den Ward
//     hindurch) — nicht mehr ein umgeschichteter Anteil. Dadurch ⇒ `Treffer bis Kill =
//     (HP + Ward·(1−wardBreak))/dmg`, d.h. Ward-Break SPART `Ward·wardBreak/dmg` Treffer und
//     skaliert mit der Pool-Größe (die alte Anteils-Split-Formel war TTK-neutral, s. combat.ts).
// computeStats (character.ts) aggregiert sie aus der Waffen-Signatur (+ künftig Runen/Skills) und
// klemmt jeden auf seinen Cap; combat.ts (Phase B) wendet die Wirkung im resolveAttack an. Die Caps
// mirroren DEFENSE_MITIGATION_MAX — NIE eine 100-%-Negation einer Gegner-Achse. Alle Felder additiv/
// optional ⇒ KEIN SAVE_VERSION-Bump (Spec §4).
// ───────────────────────────────────────────────────────────────────────────

/** Deckel des Spieler-Armor-Pen (0..1): max. Anteil der Gegner-Mitigation, den die Signatur ignoriert. Spec §3.3. */
export const ARMOR_PEN_CAP = 0.6;
/** Deckel der Spieler-Precision (0..1): max. Anteil der Gegner-Evasion, den die Signatur ignoriert. Spec §3.3. */
export const PRECISION_CAP = 0.6;
/**
 * Deckel des Spieler-Ward-Break (0..1). Combat-Feel v2 #2a (ADDITIVE Semantik): Anteil eines Treffers,
 * der ZUSÄTZLICH als Bonus-HP-Schaden durch den Gegner-Ward blutet (der volle Treffer drainт weiter
 * den Pool). Der Deckel < 1 garantiert, dass der Ward NIE völlig wirkungslos wird — bei wardBreak=CAP
 * behält der Pool noch `(1−CAP)=25 %` seiner effektiven HP. Spec §3.3.
 */
export const WARD_BREAK_CAP = 0.75;
/**
 * Content-Generator-Konstante: der Anteil der Gegner-`maxHp`, der als brechbarer Ward-Pool
 * (`MonsterDef.wardCapacity`) auf Caster-Gegner (`defenseType==="ward"`) gelegt wird — `round(dies·maxHp)`.
 * ~+30 % effektive HP als absorbierender Schild VOR den HP; Ward-Break blutet zusätzlich hindurch
 * (ADDITIV, Combat-Feel v2 #2a) und senkt so den effektiven Pool auf `Ward·(1−wardBreak)`. Spec §3.3/§3.4.
 */
export const ENEMY_WARD_HP_FRACTION = 0.3;

/**
 * Status-vs-Ward-Konter (Chef-Design nach Spieler-Report "Hollow Choir: I miss 9/10" — voll
 * absorbierte Treffer sahen wie Misses aus): Monster mit einem Ward-Pool (`wardCapacity > 0` bzw.
 * `defenseType === "ward"`) nehmen +20 % Schaden von schadensverursachenden Status-DoTs des Spielers
 * (burn/bleed/poison — Frost/Shock tragen keinen Schaden und bleiben unberührt). TRAIT-basiert, nicht
 * zustands-basiert: gilt den GESAMTEN Kampf über, auch nachdem der Ward-Pool schon gebrochen ist
 * (einfach, lesbar, tooltip-fähig als "Schwach gegen Status-Effekte"). DoT-Schaden umgeht den
 * Ward-Pool ohnehin bereits (trifft direkt `enemyHp`, s. combat.ts `tickEnemyEffects`) — dieser Mult
 * ist ein reiner Schadens-Buff, kein zusätzlicher Pool-Bypass. Kein RNG-Draw, deterministisch.
 */
export const STATUS_VS_WARD_MULT = 1.2;

/**
 * Ward-Recharge beim Zaubern (reiner Helfer für combat.ts, Phase A2). Koppelt den Ward-Aufbau an
 * den Mana-VERBRAUCH statt an Zeit: jeder Cast lädt `manaSpent · WARD_PER_MANA` Ward, gedeckelt auf
 * `maxWard`. Läuft Mana leer (Weak-Melee), gibt es keinen Cast → kein Recharge (gewollter Druck).
 * Deterministisch & seiteneffektfrei; NaN-fest (nicht-endliche Eingaben lassen `currentWard` stehen).
 * VERTRAG für combat-dev (A2): bei `casts === true` in performPlayerAttack aufrufen —
 *   `state.character.ward = rechargeWard(state.character.ward, stats.maxWard, cost)`.
 */
export function rechargeWard(currentWard: number, maxWard: number, manaSpent: number): number {
  if (!Number.isFinite(currentWard) || !Number.isFinite(maxWard) || !Number.isFinite(manaSpent)) {
    return currentWard;
  }
  return Math.min(maxWard, currentWard + Math.max(0, manaSpent) * WARD_PER_MANA);
}

/**
 * Ward-Absorption eines eingehenden Treffers (reiner Helfer für combat.ts, Phase A2). Zieht Schaden
 * ZUERST vom Ward-Pool ab (nach Mitigation/Block/One-Shot-Cap, Spec §1.5 Schritt 6), Rest geht auf HP.
 * Liefert den neuen Ward-Stand, den absorbierten Betrag (für den Combat-Log `kind:"shield"`) und den
 * verbleibenden HP-Schaden. Deterministisch & seiteneffektfrei; NaN-fest.
 * VERTRAG für combat-dev (A2): ersetzt `applyManaShield` als der EINE Magie-Absorb-Layer.
 */
export function absorbWard(
  currentWard: number,
  incomingDamage: number,
): { ward: number; absorbed: number; hpDamage: number } {
  const ward = Number.isFinite(currentWard) && currentWard > 0 ? currentWard : 0;
  const dmg = Number.isFinite(incomingDamage) && incomingDamage > 0 ? incomingDamage : 0;
  const absorbed = Math.min(ward, dmg);
  return { ward: ward - absorbed, absorbed, hpDamage: dmg - absorbed };
}

/**
 * ZENTRALER Heilbetrag eines Consumables (Combat-Feel v2 #0a) — EINE Quelle der Wahrheit für alle
 * Heilpfade (Auto-Eat, Auto-Trank, manuelles useConsumable) UND alle Heil-Bewertungs-Heuristiken
 * (Tooltip, Sim-Food-Wahl).
 *
 * HYBRID-Formel (Balance-Kette Schritt 4, Spec weapon-damage-scaling §5.4/§5.5, Chef-GO):
 * `heal = max(healAmount, round(maxHp · healPct))` — der FLACHE Wert ist die fühlbare Tier-Leiter
 * und der Früh-/Mid-Game-Boden (round(maxHp·pct) war dort mickrig bis 0), der %-Anteil greift,
 * sobald maxHp groß genug ist (End-Game-Floor, Food fällt nie hinter einen riesigen HP-Balken
 * zurück). Items mit NUR flat oder NUR pct verhalten sich exakt wie vorher — die max()-Form ist
 * ein strikter Superset beider Alt-Semantiken. Nur bei Items mit BEIDEN Feldern ändert sich das
 * Verhalten: früher gewann `healPct` immer (flat war toter Fallback), jetzt gewinnt die größere
 * Seite (bei kleinem maxHp also der Flat — der gewollte Früh-Game-Buff).
 * Rein & deterministisch (kein RNG/I/O).
 */
export function consumableHeal(item: Pick<ItemDef, "healPct" | "healAmount">, maxHp: number): number {
  return Math.max(item.healAmount ?? 0, Math.round(maxHp * (item.healPct ?? 0)));
}

// Kampf-XP ist schadensbasiert. Das Stil-Routing (OSRS) gibt XP nur noch an EINEN Skill statt
// früher an attack+power gleichzeitig → effektiv ~⅓ langsamer; daher von 0,085 auf 0,13 angehoben
// (Balance-Pass 2, s. design/balance-combat-2.md).
// Stat-Squish ÷10 (Spec §3.2, PFLICHT-Kopplung): Schaden ist ×0.1 → XP-pro-Schaden ×10, damit
// die XP pro Treffer/Kill (= Kampf-Leveltempo) EXAKT identisch bleiben: 0.13→1.3, 0.11→1.1, 0.05→0.5.
/** Kampf-XP pro ausgeteiltem Schadenspunkt (aktiver Stil-Skill). */
export const MELEE_XP_PER_DAMAGE = 1.3;
/** Verteidigungs-XP pro eingestecktem Schadenspunkt. */
export const DEFENCE_XP_PER_DAMAGE = 1.1;
/** Lebenskraft-XP pro ausgeteiltem Schadenspunkt (RuneScape-Hitpoints-artig). */
export const VITALITY_XP_PER_DAMAGE = 0.5;
/**
 * LEGACY-Spannen-Faktor (Waffen 2.0, itemization-parity-fix §1.2): Als SCHADENS-MECHANIK abgelöst —
 * die Spanne kommt jetzt aus `ItemDef.damageMin/damageMax` (Range-Form), combat.ts rollt uniform in
 * [attackDamageMin..attackDamageMax]. Die Konstante lebt weiter als KONVERTIERUNG für die beiden
 * Legacy-Fälle (Übergangs-Kompatibilität):
 *  - Waffen OHNE damageMin/Max: computeStats leitet die Spanne aus dem Flat ab
 *    (max = Flat×DMG_MAX_HIT_MULT, min = max×DMG_ROLL_FLOOR) → bisheriges Wurf-Verhalten bleibt.
 *  - MONSTER (flaches `damage`): combat.ts leitet die Gegner-Spanne identisch ab, bis Content
 *    Monster-Spannen liefert.
 * DPS-Neutralität: Mittelwert = ((Floor+1)/2) × Mult × Basis ⇒ Mult = 2/(Floor+1) ≈ 1,4815.
 * Spanne ~52 %..148 % der Basis.
 */
export const DMG_MAX_HIT_MULT = 1.4815;
/**
 * LEGACY-Wurf-Boden (Gegenstück zu DMG_MAX_HIT_MULT, s.o.): min = max × DMG_ROLL_FLOOR. Nur noch für
 * die Legacy-Flat→Spanne-Konvertierung (Alt-Waffen + Monster) — Range-Form-Waffen definieren ihre
 * Spanne selbst. Mit DMG_MAX_HIT_MULT gekoppelt (Mult = 2/(Floor+1)) → DPS-neutral.
 */
export const DMG_ROLL_FLOOR = 0.35;

/**
 * Frühgame-XP-Verstärker: hebt die ersten ~20 Level an, damit L1→15 kein Slog ist
 * (L1 ×2,5 → L20 ×1,0, darüber wirkungslos). Gilt für Skill- & Kampf-XP gleichermaßen.
 */
export function earlyXpMult(level: number): number {
  return 1 + 2.0 * Math.max(0, (40 - level) / 39);
}

/** Über-Level-Diminishing: ab wie vielen Leveln über dem Mob die Dämpfung greift. */
export const OVER_LEVEL_GRACE = 4;
/** Lineare Abnahme der XP/Gold-Belohnung je Level über (Grace + Mob-Level). */
export const OVER_LEVEL_SLOPE = 0.09;
/** Untergrenze: weit über dem Mob kollabiert die Belohnung auf diesen Restanteil. */
export const OVER_LEVEL_FLOOR = 0.02;

/**
 * Bedrohungs-Diminishing: XP/Gold fallen, wenn der aktive Skill den Mob-Level
 * deutlich übersteigt. `diff = skillLevel - monsterLevel`.
 *   diff <= GRACE  -> 1.0  (On-Level + leicht drüber: voll, Frühgame bleibt unangetastet)
 *   darüber linear -> 1 - (diff - GRACE) * SLOPE, geclamped auf [FLOOR, 1]
 *
 * Rein berechnend (kein State) — schließt das Trivial-Mob-Farm-Schlupfloch, ohne
 * On-Level-Kämpfe anzutasten.
 */
export function overLevelMult(skillLevel: number, monsterLevel: number): number {
  const diff = skillLevel - monsterLevel;
  if (diff <= OVER_LEVEL_GRACE) return 1;
  return Math.max(OVER_LEVEL_FLOOR, 1 - (diff - OVER_LEVEL_GRACE) * OVER_LEVEL_SLOPE);
}

/**
 * Level-Range-XP (CEO #113) — ab wie vielen Leveln ÜBER dem Mob die Kampf-XP zu fallen beginnt.
 * Bis hierhin (inkl.) volle XP: on-level + komfortabler Puffer bleibt unangetastet.
 */
export const XP_FULL_GAP = 5;
/**
 * Level-Range-XP — ab dieser Level-Differenz über dem Mob gibt es GAR KEIN Kampf-XP mehr.
 * Default 15: ein klar über-levelter Mob lohnt XP-technisch nicht (Anti-Dauerfarm an einem
 * schwachen Mob), bleibt aber Material-/Gold-/Loot-Quelle (Loot & Gold sind NICHT betroffen).
 */
export const XP_ZERO_GAP = 15;

/**
 * Kampf-XP-Faktor nach Level-Differenz (Stil-/Kampf-Skill-Level vs Mob-Level). `diff = skillLevel - monsterLevel`.
 *   diff <= XP_FULL_GAP -> 1   (on-level + Puffer: volle XP; Spieler UNTER dem Mob nie gedämpft)
 *   diff >= XP_ZERO_GAP -> 0   (zu schwach: kein Kampf-XP — gegen ewiges Farmen am selben Low-Mob)
 *   dazwischen          -> linear von 1 → 0 (sanfte Bandbreite statt harter Klippe)
 *
 * Rein arithmetisch (kein RNG/State). Wirkt AUSSCHLIESSLICH auf Kampf-XP — Loot & Gold bleiben
 * unberührt, damit schwache Mobs weiter als Material-/Gold-Quelle taugen. Löst `overLevelMult` für
 * die XP-Berechnung im Kampf ab (jenes nullte nie ganz und dämpfte zusätzlich Gold).
 */
export function combatXpLevelMult(skillLevel: number, monsterLevel: number): number {
  const diff = skillLevel - monsterLevel;
  if (diff <= XP_FULL_GAP) return 1;
  if (diff >= XP_ZERO_GAP) return 0;
  return (XP_ZERO_GAP - diff) / (XP_ZERO_GAP - XP_FULL_GAP);
}

/** Kampf-Fertigkeiten (kein eigener Sidebar-Eintrag; werden durchs Kämpfen trainiert). */
// Armor-Iteration 2 §9.1: `magic_off`→`magic`, `magic_def`→`warding`.
export const COMBAT_SKILL_IDS: SkillId[] = [
  "attack",
  "power",
  "defence",
  "ranged",
  "magic",
  "warding",
  "vitality",
];

/**
 * Skill-Boost-System (Itemization 2.0 §4, OSRS-Stil, Chef-Nachentscheidung 2): Ausrüstung darf
 * die 6 offensiven/defensiven Kampf-Skills um GANZE Level boosten („Ring of Power: +2 Power" →
 * effektives Level 40→42; Wirkung über die BESTEHENDEN Formeln). Geboostet wird AUSSCHLIESSLICH
 * in den computeStats-Kampftermen (effektives Level, §4.2); Ausrüstungs-Requirements
 * (`meetsRequirements`), `combatLevel`, XP-Kurve/`overLevelMult`/`combatXpLevelMult`,
 * Aktions-/Rezept-Freischaltungen und der `skill.trains`-Attributbeitrag lesen IMMER das
 * BASIS-Level (Anti-Exploit: Boost schaltet nichts frei und beschleunigt kein XP).
 * `vitality` ist bewusst NICHT boostbar.
 */
// Armor-Iteration 2 §9.1: `magic_off`→`magic`, `magic_def`→`warding`. Content-dev hat in Phase C
// alle content-Refs auf `magic`/`warding` umbenannt — die deprecated Übergangs-Union-Member sind
// entfernt.
export type BoostableCombatSkillId =
  | "attack"
  | "power"
  | "defence"
  | "ranged"
  | "magic"
  | "warding";
export const BOOSTABLE_COMBAT_SKILL_IDS: BoostableCombatSkillId[] = [
  "attack",
  "power",
  "defence",
  "ranged",
  "magic",
  "warding",
];
/** Σ Skill-Level-Boosts je boostbarem Kampf-Skill (Aggregat aus Items + Sets + Suffix-Rolls). */
export type SkillBoostMap = Partial<Record<BoostableCombatSkillId, number>>;

/** Anzahl der Speicher-Slots im Hauptmenü. */
export const MAX_SAVE_SLOTS = 5;

/** Leichtgewichtige Zusammenfassung eines Spielstands (für die Slot-Liste). */
export interface SaveSummary {
  name: string;
  totalLevel: number;
  /** Gespielte Simulationszeit in ms (INKL. Offline-Catch-up — für Farming-Uhr, nicht als „Spielzeit"). */
  elapsedMs: number;
  /**
   * Aktiv gespielte Zeit in ms — OHNE Offline-Catch-up (das ist die „played"-Zeit fürs Menü).
   * Optional, weil Alt-Save-Summaries (vor SAVE_VERSION 44) das Feld nicht tragen; die Anzeige
   * fällt dann auf `elapsedMs` zurück, bis der Slot einmal neu gespeichert wurde.
   */
  activePlayMs?: number;
  /** Zeitpunkt des letzten Speicherns (Epoch-ms). */
  savedAt: number;
  /** Gewähltes Portrait, damit das Menü den Charakter zeigen kann. */
  portraitId?: string | null;
}

/** Ein Speicher-Slot. `summary === null` = leerer Slot. */
export interface SaveSlot {
  id: number;
  summary: SaveSummary | null;
}

/**
 * Zusammenfassung des Offline-Fortschritts beim Laden ("Während du weg warst").
 *
 * TRANSIENT: wird beim Laden in `deserialize` frisch berechnet und NUR an die UI gereicht —
 * sie wird NIE persistiert (SaveFile speichert `SaveSummary` + `GameState`, nicht dies).
 * Neue Felder hier brauchen daher KEINEN SAVE_VERSION-Bump.
 */
export interface OfflineSummary {
  ms: number;
  gold: number;
  xp: number;
  items: Record<ItemId, number>;
  /** XP-Aufschlüsselung je Skill, der offline XP erhalten hat (für „Smithing: X XP, +X Level"). */
  skillXp: Record<SkillId, { xp: number; levels: number }>;
  /** Offline erzielte Kills (stats.kills-Delta des Catch-ups; #306 Beute-Bühnen-Medaillon). */
  kills?: number;
  /**
   * Tode während des Offline-Catch-ups (fehlt/0 = keiner). Da eine Niederlage den Kampf HART beendet
   * (kein Auto-Neustart) und offline kein neuer Kampf gestartet werden kann, ist das Delta max. 1.
   */
  deaths?: number;
  /** Gegner des (letzten) Todes, falls bekannt (für „Du bist gegen X gefallen"). */
  diedAgainst?: MonsterId | null;
  /** true, wenn der laufende Kampf beim Catch-up automatisch endete (defeated/stalemate). */
  combatStopped?: boolean;
  /** Grund des Auto-Stopps beim Catch-up (Spiegel von `CombatState.stopReason`). */
  combatStopReason?: "defeated" | "stalemate" | null;
  /**
   * Offline gedroppte Pets (Pet-IDs, chronologisch; fehlt = keine — nie leeres Array). Der
   * Catch-up läuft über `advance` und würfelt Pet-Drops wie live (Skilling-Abschluss in tick.ts,
   * Farming-Ernte, Kampf-Kill-Pfad); deserialize bildet die Differenz der `character.ownedPets`-
   * Keys vor/nach dem Catch-up (Insertion-Order = Drop-Reihenfolge, da jeder Drop ein NEUES Pet
   * ist). Die UI feiert diese Drops im Offline-Popup (Welle DD „Kein Drop darf je stumm sein");
   * die Live-Celebration greift nur für Drops NACH dem Load (seenSeq-Init auf `petDropSeq`).
   */
  petDrops?: PetId[];
  /**
   * Anzahl der WÄHREND des Offline-Catch-ups freigeschalteten Achievements (Welle LL, Fun-Retest
   * pets-fenn: „offline verdiente Achievements bleiben lautlos"). deserialize bildet die Differenz
   * der `state.achievements`-Länge vor/nach dem Catch-up (checkAchievements hängt nur an — die
   * Liste wächst monoton). Fehlt (statt 0), wenn nichts verdient wurde — Muster kills/deaths.
   */
  achievementsEarned?: number;
  /**
   * Die IDs der offline freigeschalteten Achievements, chronologisch (= Push-Reihenfolge von
   * checkAchievements). Nur gesetzt, wenn `achievementsEarned` gesetzt ist — nie leeres Array.
   */
  achievementIds?: string[];
  /**
   * Im Offline-Fenster fertiggestellte Lager-Bauten („Die Hände haben gearbeitet", SAVE 76):
   * deserialize bildet die `camp.buildSeq`-Differenz vor/nach dem Catch-up. Da nach einer
   * Fertigstellung offline kein neuer Auftrag starten kann (Spieler-Aktion + Kosten nötig),
   * ist es strukturell max. EIN Eintrag. Fehlt (statt leerem Array), wenn nichts fertig wurde.
   */
  campBuilds?: { buildingId: CampBuildingId; level: number }[];
  /**
   * Ergebnis der Offline-Veredelung („Dein Lager hat gearbeitet", SAVE 77): je Veredelungs-
   * Gebäude mit Fenster-Produktion ein Eintrag — `itemId` = Output des gewählten Rezepts
   * (offline kann kein Rezeptwechsel passieren), `qty` = produzierte Output-Stücke.
   * deserialize bildet die `camp.refine[*].produced`-Differenz vor/nach dem Catch-up.
   * Fehlt (statt leerem Array), wenn nichts produziert wurde — Muster campBuilds.
   */
  campRefined?: { buildingId: CampBuildingId; itemId: ItemId; qty: number }[];
  /** Jagen (SAVE 85): Fänge im Offline-Fenster je Monster. */
  huntCatches?: { monsterId: MonsterId; count: number }[];
}

// ───────────────────────────────────────────────────────────────────────────
// Attribute (das "Charakterblatt")
// ───────────────────────────────────────────────────────────────────────────

export interface AttributeMeta {
  id: string;
  name: LocalizedString;
  abbr: string;
  description: LocalizedString;
}

/** Die 6 primären Attribute. Reihenfolge = Anzeigereihenfolge. */
// Sweep-Fund T6 (2026-07-11): Attributnamen erscheinen in Tooltip/Set-Zeile/Attributkarten →
// alle 7 Sprachen (Namen + Kurzbeschreibungen).
export const ATTRIBUTES = [
  {
    id: "str",
    name: { en: "Strength", de: "Stärke", es: "Fuerza", fr: "Force", "pt-BR": "Força", ru: "Сила", zh: "力量" },
    abbr: "STR",
    description: {
      en: "Melee damage",
      de: "Nahkampfschaden",
      es: "Daño cuerpo a cuerpo",
      fr: "Dégâts de mêlée",
      "pt-BR": "Dano corpo a corpo",
      ru: "Урон в ближнем бою",
      zh: "近战伤害",
    },
  },
  {
    id: "dex",
    name: { en: "Dexterity", de: "Geschick", es: "Destreza", fr: "Dextérité", "pt-BR": "Destreza", ru: "Ловкость", zh: "敏捷" },
    abbr: "DEX",
    description: {
      en: "Ranged damage, accuracy, attack speed & crit chance",
      de: "Fernkampfschaden, Treffgenauigkeit, Angriffstempo & Krit-Chance",
      es: "Daño a distancia, precisión, velocidad de ataque y prob. de crítico",
      fr: "Dégâts à distance, précision, vitesse d'attaque et chance de critique",
      "pt-BR": "Dano à distância, precisão, velocidade de ataque e chance de crítico",
      ru: "Дальний урон, точность, скорость атаки и шанс крита",
      zh: "远程伤害、命中、攻击速度与暴击几率",
    },
  },
  {
    id: "con",
    name: { en: "Constitution", de: "Konstitution", es: "Constitución", fr: "Constitution", "pt-BR": "Constituição", ru: "Телосложение", zh: "体质" },
    abbr: "CON",
    description: {
      en: "Maximum health",
      de: "Maximale Gesundheit",
      es: "Salud máxima",
      fr: "Points de vie maximum",
      "pt-BR": "Vida máxima",
      ru: "Максимальное здоровье",
      zh: "最大生命值",
    },
  },
  {
    id: "int",
    name: { en: "Intelligence", de: "Intelligenz", es: "Inteligencia", fr: "Intelligence", "pt-BR": "Inteligência", ru: "Интеллект", zh: "智力" },
    abbr: "INT",
    description: {
      en: "Magic damage & max mana",
      de: "Magieschaden & Max. Mana",
      es: "Daño mágico y maná máx.",
      fr: "Dégâts magiques et mana max",
      "pt-BR": "Dano mágico e mana máx.",
      ru: "Магический урон и макс. мана",
      zh: "法术伤害与最大法力",
    },
  },
  {
    id: "wis",
    name: { en: "Wisdom", de: "Weisheit", es: "Sabiduría", fr: "Sagesse", "pt-BR": "Sabedoria", ru: "Мудрость", zh: "智慧" },
    abbr: "WIS",
    description: {
      en: "Mana regeneration & max mana",
      de: "Mana-Regeneration & Max. Mana",
      es: "Regeneración de maná y maná máx.",
      fr: "Régénération de mana et mana max",
      "pt-BR": "Regeneração de mana e mana máx.",
      ru: "Восстановление маны и макс. мана",
      zh: "法力回复与最大法力",
    },
  },
  {
    id: "lck",
    name: { en: "Luck", de: "Glück", es: "Suerte", fr: "Chance", "pt-BR": "Sorte", ru: "Удача", zh: "幸运" },
    abbr: "LCK",
    description: {
      en: "Crit chance & crit damage",
      de: "Krit-Chance & Krit-Schaden",
      es: "Prob. de crítico y daño crítico",
      fr: "Chance de critique et dégâts critiques",
      "pt-BR": "Chance de crítico e dano crítico",
      ru: "Шанс крита и урон критов",
      zh: "暴击几率与暴击伤害",
    },
  },
] as const satisfies readonly AttributeMeta[];

export type AttributeId = (typeof ATTRIBUTES)[number]["id"];
export const ATTRIBUTE_IDS: AttributeId[] = ATTRIBUTES.map((a) => a.id);

/**
 * Itemization 2.0 §1 (§6.2-REVERT, design/itemization-2-spec.md): Attribute sind wieder
 * GANZZAHLIG, behalten aber die HALBE Größenordnung des früheren Input-Squish — d.h. die
 * heutigen computeStats-Attribut-Koeffizienten bleiben UNVERÄNDERT. Quellen sind ganzzahlig:
 *   - Basis 3 (statt 2.5),
 *   - Skill-Beitrag floor(level/8) GANZE Punkte (identische Rate wie floor(level/4)·0.5,
 *     Rungs alle 8 statt 4 Level),
 *   - Gear-`modifiers`/Suffix-`attrPerIlvl`-Rundung ganzzahlig (min 1, s. instanceBonusDelta).
 * Der alte Faktor ATTRIBUTE_INPUT_SQUISH (0.5) ist ersatzlos ENTFALLEN; Creation-Seed-Punkte
 * zählen 1:1. Anzeige im Charakterblatt wieder OHNE Dezimalstelle (ui-dev, §4.5).
 */
/** Startwert jedes Attributs bei der Erstellung (für alle gleich). */
export const BASE_ATTRIBUTE_VALUE = 3;
/** Je X Level einer trainierenden Fertigkeit gibt es +1 GANZEN Punkt auf das trainierte Attribut. */
export const ATTRIBUTE_SKILL_DIVISOR = 8;

// ───────────────────────────────────────────────────────────────────────────
// Ausrüstung
// ───────────────────────────────────────────────────────────────────────────

export const EQUIP_SLOTS = [
  "helmet",
  "amulet",
  "mainhand",
  "offhand",
  "body",
  "legs",
  "gloves",
  "boots",
  "cape",
  "ring1",
  "ring2",
  "tool1",
  "tool2",
  "tool3",
] as const;

// Hinweis: der frühere "ammo"-Köcher-Slot ist mit dem Ammo-Removal (#286, SAVE_VERSION 57)
// restlos entfernt — Alt-Saves migriert v57 (Köcher verfällt gegen Gold-Gutschrift).
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

// ── Ausrüstungs-Kits 1/2/3 (SAVE_VERSION 85 — unveröffentlicht; Chef-Entscheid 28.08.2026) ────
/** Anzahl der Kits — FIX 3 (je Kampfstil eines; bewusst nicht konfigurierbar). */
export const EQUIP_KIT_COUNT = 3;
/** Gültiger Kit-Index (0..EQUIP_KIT_COUNT-1). */
export type EquipKitIndex = 0 | 1 | 2;

/**
 * Ein Ausrüstungs-KIT: besitzt seine EIGENEN Items je Slot — exakt die Form von
 * `character.equipment` + `character.equippedInstances` (Spieler-Feedback „3 separate equipment
 * kits, not unequip/equip modes, just swap"; Chef-Entscheid 28.08.2026). Ersetzt die v75-Loadout-
 * VORLAGEN (Snapshots aus itemId/instanceId, die beim Anlegen aus Inventar/Bank bedient wurden):
 * ein Kit trägt seine Teile selbst, ein Wechsel (engine/loadouts.ts `switchEquipKit`) tauscht das
 * GANZE Set — verbraucht nichts, verschiebt nichts ins Inventar, nur außerhalb des Kampfes.
 * Alle EQUIP_SLOTS inkl. tool1..tool3 (ganzes Set tauscht; die alte LOADOUT_SLOTS-Ausnahme für
 * Werkzeuge entfällt — es gibt keinen Inventar-Churn mehr, den sie verhindern müsste).
 * Invarianten je Kit (sanitizeState): `equippedInstances[slot]` existiert nur, wenn
 * `equipment[slot] === equippedInstances[slot].baseItemId`; Zweihandwaffe im Mainhand ⇒ Offhand leer.
 */
export interface EquipKit {
  equipment: Record<EquipSlot, ItemId | null>;
  equippedInstances: Partial<Record<EquipSlot, ItemInstance>>;
}

/** Leeres Kit (alle Slots null, keine Instanzen). */
export function emptyEquipKit(): EquipKit {
  const equipment = {} as Record<EquipSlot, ItemId | null>;
  for (const slot of EQUIP_SLOTS) equipment[slot] = null;
  return { equipment, equippedInstances: {} };
}

/** Frische Kit-Liste fixer Länge EQUIP_KIT_COUNT (alle leer). */
export function defaultEquipKits(): EquipKit[] {
  return Array.from({ length: EQUIP_KIT_COUNT }, () => emptyEquipKit());
}

// Sweep-Fund T6 (2026-07-11): Slot-Namen erscheinen im Tooltip-Kopf/Paperdoll → alle 7 Sprachen.
export const EQUIP_SLOT_LABELS: Record<EquipSlot, LocalizedString> = {
  helmet: { en: "Helmet", de: "Helm", es: "Casco", fr: "Casque", "pt-BR": "Elmo", ru: "Шлем", zh: "头盔" },
  amulet: { en: "Neck", de: "Hals", es: "Cuello", fr: "Cou", "pt-BR": "Pescoço", ru: "Шея", zh: "颈部" },
  mainhand: { en: "Right Hand", de: "Rechte Hand", es: "Mano derecha", fr: "Main droite", "pt-BR": "Mão direita", ru: "Правая рука", zh: "主手" },
  offhand: { en: "Left Hand", de: "Linke Hand", es: "Mano izquierda", fr: "Main gauche", "pt-BR": "Mão esquerda", ru: "Левая рука", zh: "副手" },
  body: { en: "Chest", de: "Brust", es: "Pecho", fr: "Torse", "pt-BR": "Peito", ru: "Грудь", zh: "胸甲" },
  legs: { en: "Legs", de: "Beine", es: "Piernas", fr: "Jambes", "pt-BR": "Pernas", ru: "Ноги", zh: "腿部" },
  gloves: { en: "Hands", de: "Hände", es: "Manos", fr: "Mains", "pt-BR": "Mãos", ru: "Кисти", zh: "手部" },
  boots: { en: "Feet", de: "Füße", es: "Pies", fr: "Pieds", "pt-BR": "Pés", ru: "Ступни", zh: "脚部" },
  cape: { en: "Cape", de: "Umhang", es: "Capa", fr: "Cape", "pt-BR": "Capa", ru: "Плащ", zh: "披风" },
  ring1: { en: "Ring", de: "Ring", es: "Anillo", fr: "Anneau", "pt-BR": "Anel", ru: "Кольцо", zh: "戒指" },
  ring2: { en: "Ring", de: "Ring", es: "Anillo", fr: "Anneau", "pt-BR": "Anel", ru: "Кольцо", zh: "戒指" },
  tool1: { en: "Tool", de: "Werkzeug", es: "Herramienta", fr: "Outil", "pt-BR": "Ferramenta", ru: "Инструмент", zh: "工具" },
  tool2: { en: "Tool", de: "Werkzeug", es: "Herramienta", fr: "Outil", "pt-BR": "Ferramenta", ru: "Инструмент", zh: "工具" },
  tool3: { en: "Tool", de: "Werkzeug", es: "Herramienta", fr: "Outil", "pt-BR": "Ferramenta", ru: "Инструмент", zh: "工具" },
};

// ───────────────────────────────────────────────────────────────────────────
// Content-Definitionen (reine Daten, data-driven)
// ───────────────────────────────────────────────────────────────────────────

export type ItemId = string;
export type SkillId = string;
export type ActionId = string;
export type MonsterId = string;

// "bag": GELÖSCHT (#278) — Taschenslot-System entfernt (#271), small_pouch aus dem Katalog (#272).
export type ItemType = "material" | "equipment" | "consumable" | "tool";

/** Kampfstil, den eine Waffe vorgibt. */
export type WeaponStyle = "melee" | "ranged" | "magic";

/**
 * Konkreter Waffentyp — ergänzt `WeaponStyle` (Stil) um die physische Waffenart für die
 * Tooltip-Anzeige. Vorhanden genau dann, wenn `ItemDef.weaponStyle` gesetzt ist.
 * ui-dev liest dieses Feld, um z.B. „Two-Handed Spear" statt fälschlich „Sword" zu zeigen.
 */
export type WeaponType =
  | "dagger"
  | "sword"
  | "scimitar"
  | "mace"
  | "axe"
  | "battleaxe"
  | "spear"
  | "greataxe"
  | "greatsword"
  | "maul"
  | "shortbow"
  | "longbow"
  | "staff"
  | "wand"
  | "focus"
  | "scepter";

/**
 * Kurze, knackige Rollenbe­schreibung je Waffentyp (en + de), abgeleitet aus den echten
 * Bonus-Profilen der Items. ui-dev rendert sie im Tooltip unter der Typ-Zeile.
 * Werte spiegeln die tatsächlichen Stat-Tendenzen wider (kein Marketing-Text).
 */
export const WEAPON_TYPE_SPECIALTY: Record<WeaponType, LocalizedString> = {
  dagger:     { en: "Fast · High Crit · Precision",   de: "Schnell · Hohe Krit · Präzision" },
  sword:      { en: "Balanced",                       de: "Ausgewogen" },
  scimitar:   { en: "Fast · Crit · Precision",        de: "Schnell · Krit · Präzision" },
  mace:       { en: "One-Handed · Armor Penetration", de: "Einhändig · Rüstungsdurchdringung" },
  axe:        { en: "Versatile · Woodcutting",        de: "Vielseitig · Holzfällen" },
  battleaxe:  { en: "High Crit Damage · Medium Speed", de: "Hoher Krit-Schaden · Mittelschnell" },
  spear:      { en: "Two-Handed · Fastest · Precision", de: "Zweihändig · Schnellste · Präzision" },
  greataxe:   { en: "Two-Handed · High Strength, Slow", de: "Zweihändig · Hohe Stärke, Langsam" },
  greatsword: { en: "Two-Handed · Balanced, Fastest Heavy", de: "Zweihändig · Ausgewogen, Schnellste Schwere" },
  maul:       { en: "Two-Handed · Max Impact · Armor Pen", de: "Zweihändig · Max. Impact · Rüstungsbruch" },
  shortbow:   { en: "Fast Shots · Precision",         de: "Schnelle Schüsse · Präzision" },
  longbow:    { en: "Range · High Precision",         de: "Reichweite · Hohe Präzision" },
  staff:      { en: "Two-Handed · Magic · Ward Break", de: "Zweihändig · Magie · Ward-Bruch" },
  wand:       { en: "Fast · Ward Break · Frost/Shock", de: "Schnell · Ward-Bruch · Frost/Schock" },
  focus:      { en: "Offhand · +Mana & Mana Regen",   de: "Nebenhand · +Mana & Mana-Regen" },
  scepter:    { en: "One-Handed Magic · Ward Break",  de: "Einhändige Magie · Ward-Bruch" },
};

/** Flache Boni eines Ausrüstungsstücks auf abgeleitete Werte. */
export interface EquipBonus {
  meleeDamage?: number;
  rangedDamage?: number;
  magicDamage?: number;
  defense?: number;
  accuracy?: number;
  evasion?: number;
  maxHp?: number;
  /** Additiver Mana-Pool (z.B. Magie-Focus-Offhand). Summiert in computeStats analog zu maxHp. */
  maxMana?: number;
  /** Additive Mana-Regeneration/Sek (z.B. Magie-Focus). Summiert in computeStats analog zu maxHp. */
  manaRegen?: number;
  /**
   * Additive HP-Regeneration pro SEKUNDE (echte „Regeneration über Zeit"). Wird in computeStats
   * analog zu manaRegen aggregiert (Ausrüstung + Set-Boni + aktive Buffs) und pro Tick angewandt —
   * im Idle-Tick (tick.ts) UND im Kampf-Tick (combat.ts), solange die Quelle aktiv ist. Hauptzweck:
   * Regenerations-Combo-Food (heilt sofort via `healAmount` UND regeneriert über die Buff-Dauer).
   */
  hpRegenPerSec?: number;
  /** Additive Krit-Chance (0..1), z.B. Dolch. */
  critChance?: number;
  /** Additiver Krit-Schaden-Multiplikator, z.B. 2H-Axt. */
  critDamage?: number;
  /** Additive Angriffsintervall-Änderung in ms: + = langsamer (schwere Rüstung/Waffe), − = schneller (Dolch). */
  attackIntervalMs?: number;
  /**
   * Skilling-XP-MULTIPLIKATOR (Sammel-/Verarbeitungs-Tonika). 1.10 = +10 % Skilling-XP.
   * Wirkt NUR im Skilling-Tick auf die gewährte Skill-XP (nicht Mastery, nicht Kampf).
   * Mehrere aktive Buffs MULTIPLIZIEREN sich. Wird von computeStats bewusst IGNORIERT
   * (kein Kampfwert) — siehe engine/tick.ts.
   */
  gatherXpMult?: number;
  /**
   * Skilling-ERTRAG-Bonus: ADDITIVE Extra-Ertrag-Chance (0..1) im Skilling-Tick, analog zur
   * Mastery-Doppelertrag-Chance. 0.10 = +10 % Chance auf doppelten Ertrag. Mehrere aktive
   * Buffs ADDIEREN sich. Ebenfalls von computeStats ignoriert (kein Kampfwert).
   */
  gatherYieldMult?: number;
  /**
   * Lebensraub (0..1): Anteil des vom Spieler angerichteten Kampfschadens, der als Heilung
   * zurückfließt. 0.10 = 10 % des Schadens heilen den Spieler (gecappt auf maxHp). Wird in
   * computeStats über Ausrüstung/Set-Boni/Buffs ADDITIV aggregiert und im Kampf-Tick angewandt.
   */
  lifesteal?: number;
}

export interface LootRoll {
  itemId: ItemId;
  /** Wahrscheinlichkeit pro Aktions-Abschluss, 0..1. */
  chance: number;
  min: number;
  max: number;
  /**
   * Suffix-Roll-Chance (0..1) für DIESEN gecrafteten/gedroppten Equipment-Output (Phase 2). Fehlt/0
   * ⇒ kein Suffix-Versuch (und KEINE RNG-Ziehung). Überschreibt `ActionDef.suffixChance` pro Loot.
   * Wird nur für `type === "equipment"`-Outputs ausgewertet (Random-Roll-Suffixe, WoW-Stil).
   */
  suffixChance?: number;
}

export interface ActionDef {
  id: ActionId;
  name: LocalizedString;
  skill: SkillId;
  durationMs: number;
  xp: number;
  /** Mindest-Level der Fertigkeit, um diese Aktion auszuführen. */
  levelRequired?: number;
  /** Verbrauchte Materialien (Verarbeitung). Aktion stoppt, wenn welche fehlen. */
  inputs?: Array<{ itemId: ItemId; qty: number }>;
  /** Erzeugte Items (bei Verarbeitung i.d.R. garantiert mit chance 1). */
  loot: LootRoll[];
  /** Direkt-Gold bei Erfolg (z.B. Thieving). */
  gold?: { min: number; max: number };
  /** Erfolgschance exakt auf `levelRequired` (0..1). Fehlt → Aktion gelingt immer (deterministisch). */
  successBase?: number;
  /** Zuwachs der Erfolgschance pro Level über `levelRequired`. */
  successPerLevel?: number;
  /** Betäubungsdauer (ms) bei Fehlschlag (z.B. Thieving). */
  stunMs?: number;
  /** Kategorie-ID für die Gruppierung auf der Skill-Seite (z.B. Smithing-Tier). Verweist auf ContentDB.categories. */
  category?: string;
  /**
   * Suffix-Roll-Basis-Chance (0..1) beim Abschluss DIESER Craft-Aktion (Phase 2, WoW-Stil Random
   * Rolls). Gilt für alle Equipment-Outputs der Aktion (per-Loot via `LootRoll.suffixChance`
   * überschreibbar). Fehlt/0 ⇒ kein Suffix-Versuch, KEINE RNG-Ziehung (Determinismus bit-identisch).
   * Der lck-Modifikator (+0.0015·lck, Cap +0.15) wird in `rollSuffix` additiv aufgeschlagen.
   */
  suffixChance?: number;
}

/** Eine (einklappbare) Aktions-Kategorie, z.B. ein Smithing-Metall-Tier. */
export interface CategoryDef {
  id: string;
  name: LocalizedString;
}

/**
 * Ausrüstungs-Set: trägt der Spieler mindestens `minPieces` der gelisteten Teile,
 * wird der Set-Bonus zusätzlich gewährt (skaliert die Tier-Progression nach oben).
 *
 * Itemization 2.0 (§4.1): Set-Boni werden Attribute (`modifiers`) + genau eine Stil-Boost-
 * Krönung (`skillBoost`, §4.4: Metall→Power, Leder→Ranged, Stoff→MagicOff). Das flache
 * `bonus`-Feld ist LEGACY und bleibt ÜBERGANGSWEISE Pflichtfeld, bis content-dev die
 * §6-Tabellen einpflegt (danach setzen Sets `bonus: {}`) und ui-dev die Charakterblatt-
 * Set-Anzeige auf modifiers/skillBoost umgestellt hat — dann wird es entfernt.
 */
export interface SetDef {
  id: string;
  name: LocalizedString;
  pieces: ItemId[];
  minPieces: number;
  /** LEGACY flache Kampf-Boni (s.o.). computeStats aggregiert weiterhin beides. */
  bonus: EquipBonus;
  /** Attribut-Boni des Set-Bonus (Itemization 2.0: Sets geben Attribute statt Flats). */
  modifiers?: Partial<Record<AttributeId, number>>;
  /** Stil-Boost-Krönung des Sets (genau 1 Boost je Set, Werte laut §4.4-Tier-Staffel). */
  skillBoost?: SkillBoostMap;
}

// ───────────────────────────────────────────────────────────────────────────
// Pet-/Begleiter-System (Chef-Freigabe). Pets sind EIGENE Datenklassen (KEIN
// Gear-Item, kein EquipSlot). Genau ein Pet aktiv (character.companionPetId),
// besessene Pets als Set (character.ownedPets). Effekte sind gedeckelte Komfort-
// Beschleuniger (≤5 %, Combat-relevant ≤3 %), KEIN Stacking. Drops über einen
// eigenen, vom Loot unabhängigen RNG-Wurf pro Aktion/Kill (siehe engine/pets.ts).
// ───────────────────────────────────────────────────────────────────────────

export type PetId = string;

// ───────────────────────────────────────────────────────────────────────────
// Zwei-Effekt-Modell (Chef-Freigabe 2026-06-25): jedes Pet hat ZWEI Effekte.
//  - `skillEffect`  wirkt im Herkunfts-Skill (Skilling-Pfad / computeStats).
//  - `combatAbility` ist eine getriggerte Kampf-Aktion (alle intervalMs; combat-dev löst sie aus).
// Genau 1 Pet aktiv, KEIN Stacking, alle Werte gedeckelt.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Geschlossene Skill-Effekt-Taxonomie (wirkt im Herkunfts-Skill, sobald das Pet
 * ausgerüstet UND besessen ist). `value` ist bei %-Kinds ein Bruch (0.05 = 5 %).
 * Deckel über `PET_SKILL_EFFECT_CAP` + Guard-Test erzwungen.
 *
 * | Kind            | Wirkung                                          | Engine-Anwendung                                |
 * |-----------------|--------------------------------------------------|-------------------------------------------------|
 * | instantAction   | Chance, eine Aktion sofort abzuschließen         | tick.ts (additive Doppelertrag-Chance, additiv) |
 * | doubleDrop      | +Chance auf doppelten Ertrag                     | tick.ts `completeAction` (bonusChance, additiv) |
 * | gatherYield     | +Chance auf doppelten Sammel-Ertrag              | tick.ts `completeAction` (bonusChance, additiv) |
 * | thievingSuccess | +Erfolgschance (additiv, Cap 0.95 bleibt)        | tick.ts `completeAction` (actionSuccessChance)  |
 * | refundMaterial  | +Chance, Crafting-Material zu erstatten          | tick.ts `completeAction` (preserveChance)       |
 * | perfectCook     | +Chance, nicht zu verbrennen (= preserve/Erfolg) | tick.ts `completeAction` (preserveChance)       |
 * | bonusAmmo       | NO-OP seit Ammo-Removal #286 (fletching-scoped; stirbt mit Fletching in Stage B — das Passiv des Träger-Pets wird dort ersetzt) | pets.ts filtert es aus `petDoubleYieldBonus` |
 * | flawlessGem     | +Chance auf doppelten Craft-Ertrag (Gem)         | tick.ts `completeAction` (bonusChance, additiv) |
 * | bonusRunes      | +Chance auf doppelten Craft-Ertrag (Runen)       | tick.ts `completeAction` (bonusChance, additiv) |
 * | potionPreserve  | +Chance, Trank-Zutaten zu erstatten              | tick.ts `completeAction` (preserveChance)       |
 * | manaRegen       | +% Mana-Regeneration (global)                    | character.ts `computeStats` (manaRegen-Mult)    |
 * | lifesteal       | +Lebensraub auf allem Spieler-Schaden (global)   | character.ts `computeStats` (lifestealPct, additiv) |
 * | skillBoost      | +GANZE effektive Kampf-Skill-Level (wie Gear)    | character.ts `computeStats` (Skill-Boost-Aggregat)  |
 * | damageReduction | Spieler nimmt % weniger Schaden (global)         | computeStats-Feld `damageReduction`; combat.ts wendet es multiplikativ NACH Armor/Ward/Block an |
 * | doubleLoot      | Chance je Monster-Kill, den kompletten Loot+Gold-Wurf zu wiederholen (ohne Pet-Drop/Dungeon-Token) | combat.ts Kill-Pfad (`petDoubleLootChance`) |
 * | killHeal        | heilt % player.maxHp bei jedem Monster-Kill      | combat.ts Kill-Pfad (`petKillHealFraction`)     |
 * | sellBonus       | +% Gold beim Item-Verkauf (Shop-Sell-Pfad)       | shop.ts `effectiveSellPrice` (`petSellBonus`)   |
 *
 * Mehrere Kinds docken funktional an dieselbe Mechanik an (doubleDrop/gatherYield/
 * flawlessGem/bonusRunes → Doppelertrag-Chance; refundMaterial/perfectCook/
 * potionPreserve → Preservation). Die Trennung ist semantisch fürs Roster.
 *
 * XP-VERBOT (#276, Chef-Vorgabe): Das frühere Kind `skillXp` ist KOMPLETT GELÖSCHT — Pets dürfen
 * NIE (wieder) eine XP-Wirkung tragen (Pets fallen meist erst nach Max-Level). Der Guard
 * `pet-integrity.test.ts` verbietet jedes XP-Kind dauerhaft (Spec design/pet-redesign-spec.md §4.2/§2).
 */
export type PetSkillEffectKind =
  | "instantAction"
  | "doubleDrop"
  | "gatherYield"
  | "thievingSuccess"
  | "refundMaterial"
  | "perfectCook"
  | "bonusAmmo"
  | "flawlessGem"
  | "bonusRunes"
  | "potionPreserve"
  | "manaRegen"
  // ── #276 Pet-Redesign: 6 neue Passiv-Kinds (Ersatz der verbotenen skillXp-Passive, Spec §4.2) ──
  | "lifesteal"
  | "skillBoost"
  | "damageReduction"
  | "doubleLoot"
  | "killHeal"
  | "sellBonus";

// RemovedPetSkillEffectKind („skillXp"): GELÖSCHT (#276 Schritt 3 erledigt) — Content ist auf die
// neuen Passive umgestellt, XP-Kinds sind per Guard-Test dauerhaft verboten. Alt-Saves unberührt
// (Pet-Effekte leben im Content, nicht im Save).

/**
 * Geschlossene Pet-COMBAT-ABILITY-Taxonomie (Chef-Freigabe 2026-06-26: ersetzt die alte
 * passive %-`combatEffect`). Jede Ability ist eine **getriggerte Aktion**: das aktive Pet hat
 * einen eigenen Intervall-Timer (`combatAbility.intervalMs`); wird er fällig, löst combat.ts
 * (`firePetAbility`) den Effekt nach `kind` aus und pusht einen `petAbility`-Log-Eintrag (mit
 * pet-id) — die UI/Animation triggert über die Log-`seq`. Engine liefert die reine Lese-API
 * `petCombatAbility(state, content)`.
 *
 * `value`-Semantik je Kind (gedeckelt über `PET_ABILITY_CAP`); `status` NUR bei
 * `onHitStatus`/`delayedDot`. Alle Effekt-Familien sind im Engine-Dispatch implementiert; die
 * mit (✓6) markierten sind in diesem Durchgang per Content live (Beweis-Teilmenge).
 *
 * | Kind              | Wirkung beim Trigger                                  | value-Bedeutung                 |
 * |-------------------|------------------------------------------------------|---------------------------------|
 * | stun (✓6)         | Gegner setzt Angriff aus (enemyStunMs)               | Stun-Dauer in ms                |
 * | burstDamage (✓6)  | Sofort-Bonusschaden an den Gegner                    | Bruch der enemy.maxHp           |
 * | onHitStatus (✓6)  | legt SOFORT einen Status auf den Gegner              | Bruch enemy.maxHp PRO SEKUNDE Status-Laufzeit (#276 §5.1; frost: egal) |
 * | delayedDot        | legt einen länger laufenden DoT-Status               | Bruch enemy.maxHp PRO SEKUNDE Status-Laufzeit (#276 §5.1) |
 * | accuracyDownEnemy | senkt die Gegner-Treffer-Chance für ein Fenster      | Bruch Accuracy-Abzug            |
 * | stealDrop (✓6)    | klaut ein Item aus dem Monster-Loot (Anker)          | Erfolgschance (0..1)            |
 * | heal (✓6)         | heilt den Spieler                                    | Bruch der maxHp                 |
 * | shield (✓6)       | gibt dem Spieler einen Absorb-Schild (petShieldHp)   | Bruch der maxHp                 |
 * | armorRend         | Gegner nimmt für ein Fenster +% Schaden              | Bruch Zusatzschaden             |
 * | guaranteedCrit    | garantierter Krit-Burst (Sofortschaden)              | Bruch der enemy.maxHp           |
 * | manaRestore       | stellt Spieler-Mana her                              | Bruch der maxMana               |
 * | lifestealBurst    | Sofortschaden am Gegner + heilt den Spieler          | Bruch der enemy.maxHp           |
 * | enemyAttackDelay  | schiebt den Gegner-Angriffs-Timer zurück             | ms Verzögerung                  |
 * | blockNextEnemyHit | blockt den nächsten Gegner-Treffer komplett          | (ungenutzt; one-shot)           |
 * | armorPierceHit    | Sofortschaden, ignoriert Gegner-Defense              | Bruch der enemy.maxHp           |
 * | multiHit          | mehrere schnelle Sofort-Treffer                      | Bruch der enemy.maxHp je Treffer|
 */
export type PetAbilityKind =
  | "stun"
  | "burstDamage"
  | "onHitStatus"
  | "delayedDot"
  | "accuracyDownEnemy"
  | "stealDrop"
  | "heal"
  | "shield"
  | "armorRend"
  | "guaranteedCrit"
  | "manaRestore"
  | "lifestealBurst"
  | "enemyAttackDelay"
  | "blockNextEnemyHit"
  | "armorPierceHit"
  | "multiHit";

/**
 * Skill-Effekt-Arten, die NUR einen einzelnen Skill betreffen (brauchen `skillEffect.skill`).
 * `skillBoost` (#276) ist als einziges NEUES Kind skill-gebunden: sein `skill` MUSS eine
 * `BoostableCombatSkillId` sein (`vitality` bleibt wie bei Gear unboostbar — Guard erzwingt das).
 * Alle übrigen neuen Kinds (lifesteal/damageReduction/doubleLoot/killHeal/sellBonus) sind
 * global wie `manaRegen`.
 */
export const SKILL_SCOPED_PET_KINDS: PetSkillEffectKind[] = [
  "instantAction",
  "doubleDrop",
  "gatherYield",
  "thievingSuccess",
  "refundMaterial",
  "perfectCook",
  "bonusAmmo",
  "flawlessGem",
  "bonusRunes",
  "potionPreserve",
  "skillBoost",
];

/**
 * Pet-Passiv-Kinds, deren `value` GANZE LEVEL bedeutet (kein Bruch!). Der Guard-Test nimmt
 * diese Kinds von der „Passiv-Cap ≤ 5 %"-Bruch-Prüfung aus (#276 §5.3). Aktuell nur `skillBoost`.
 */
export const PET_WHOLE_LEVEL_KINDS: PetSkillEffectKind[] = ["skillBoost"];

/**
 * Maximaler erlaubter `value` je Skill-Effekt-Art (Bruch). Alle Skill-Effekte sind
 * auf ≤5 % gedeckelt (Power-Budget #276 §2: 1/10 des Mastery-Caps, Referenz gemwraith);
 * `thievingSuccess` enger (≤3 %), da additiv auf die Erfolgschance; Kampf-Utility-Passive
 * enger (lifesteal ≤2 %, damageReduction ≤4 %). AUSNAHME `skillBoost`: value = GANZE Level
 * (max 2, siehe `PET_WHOLE_LEVEL_KINDS`), identisch zum Item-Boost-Muster („Ring of Power +2").
 */
export const PET_SKILL_EFFECT_CAP: Record<PetSkillEffectKind, number> = {
  instantAction: 0.05,
  doubleDrop: 0.05,
  gatherYield: 0.05,
  thievingSuccess: 0.03,
  refundMaterial: 0.05,
  perfectCook: 0.05,
  bonusAmmo: 0.05,
  flawlessGem: 0.05,
  bonusRunes: 0.05,
  potionPreserve: 0.05,
  manaRegen: 0.05,
  // ── #276 Pet-Redesign (Spec §5.3) ──
  lifesteal: 0.02, // Bruch: +2 % Lebensraub max (Gear-Quellen ~10 % — Pet bleibt Komfort)
  skillBoost: 2, // GANZE Level (nicht Bruch!) — von der ≤5-%-Guard-Prüfung ausgenommen
  damageReduction: 0.04, // Bruch: multiplikative Schadensreduktion, deutlich unter einem Rüstungs-Tier
  doubleLoot: 0.05, // Chance je Kill (Ökonomie-Spiegel des gemwraith-5-%-Referenzlevels)
  killHeal: 0.05, // Bruch player.maxHp je Kill (reines Food-Sparen im Grind)
  sellBonus: 0.05, // Bruch: +5 % Verkaufs-Gold max
};

/**
 * Maximaler erlaubter `value` je Pet-Ability-Art. Die Einheit folgt der `value`-Semantik
 * aus der Tabelle oben (Bruch, ms oder Chance). Bewusst gedeckelt, damit getriggerte Pet-
 * Aktionen Komfort/Würze bleiben und die Sim `AUFFÄLLIGKEITEN` grün hält (Pet ≠ Power-Spike).
 */
export const PET_ABILITY_CAP: Record<PetAbilityKind, number> = {
  stun: 2500, // ms
  burstDamage: 0.15, // Bruch enemy.maxHp
  // #276 §5.1: DoT-value ist jetzt BRUCH enemy.maxHp PRO SEKUNDE (war 12 flat/s — wirkungslos am
  // Endgame). combat.ts rechnet die Magnitude via `petDotMagnitude` (unten). Cap 0.04 ≈ Region der
  // Endgame-Waffen-DoTs (0.04 × 358 maxHp ≈ 14/s), früh nicht mehr trivial/OP (0.04 × 100 = 4/s).
  onHitStatus: 0.04, // Bruch enemy.maxHp/s
  delayedDot: 0.04, // Bruch enemy.maxHp/s
  accuracyDownEnemy: 0.5, // Bruch Accuracy-Abzug
  stealDrop: 1, // Erfolgschance
  heal: 0.15, // Bruch maxHp
  shield: 0.15, // Bruch maxHp
  armorRend: 0.3, // Bruch Zusatzschaden
  guaranteedCrit: 0.15, // Bruch enemy.maxHp
  manaRestore: 0.5, // Bruch maxMana
  lifestealBurst: 0.12, // Bruch enemy.maxHp
  enemyAttackDelay: 2000, // ms
  blockNextEnemyHit: 1, // one-shot (value ungenutzt)
  armorPierceHit: 0.15, // Bruch enemy.maxHp
  multiHit: 0.06, // Bruch enemy.maxHp je Treffer
};

/** Mindest-/Default-Intervall einer Pet-Ability (ms). Guard erzwingt intervalMs > 0. */
export const PET_ABILITY_MIN_INTERVAL_MS = 1000;

/** Fenster-Dauer (ms) der timed Debuffs accuracyDownEnemy/armorRend. */
export const PET_ABILITY_DEBUFF_MS = 3000;

/** Anzahl Treffer von `multiHit`. */
export const PET_ABILITY_MULTIHIT_COUNT = 3;

/** Dauer (ms) eines von `onHitStatus`/`delayedDot` gelegten Status. */
export const PET_ABILITY_STATUS_MS = 3000;
export const PET_ABILITY_DELAYED_DOT_MS = 6000;

/** Status-Arten, die `onHitStatus`/`delayedDot` anwenden dürfen (Teilmenge von StatusType). */
export const PET_ABILITY_STATUS: StatusType[] = ["burn", "bleed", "poison", "frost"];

/**
 * #276 §5.1 — DoT-Magnitude (Schaden PRO SEKUNDE) aus der neuen %-Semantik: `value` der Kinds
 * `onHitStatus`/`delayedDot` ist ein Bruch von enemy.maxHp pro Sekunde Status-Laufzeit.
 * combat-dev übergibt das Ergebnis an `applyEnemyStatus`; frost bleibt reiner Slow (Magnitude
 * irrelevant). Pure Funktion — EINZIGE Umrechnungsstelle, damit Sim/Tests/combat identisch rechnen.
 */
export function petDotMagnitude(enemyMaxHp: number, value: number): number {
  return Math.max(1, Math.round(enemyMaxHp * value));
}

/**
 * #276 §5.2 — stealDrop-Bindung (Rare-Drop-Schutz, PFLICHT): `firePetAbility` (combat.ts) darf NUR
 * Loot-Einträge mit `chance ≥ PET_STEAL_MIN_LOOT_CHANCE` stehlen. Chase-/Rare-Einträge und Keys
 * (< 5 %) sind ausgeschlossen — kein Suffix-Equipment-Farming über das Pet (Rare-Drop-Philosophie).
 * Weitere Bindungsregeln (combat-dev): Auswahl gleichverteilt über die GEFILTERTE Liste,
 * Menge = `roll.min` (der Dieb klaut, er erntet nicht), leere gefilterte Liste → kein Effekt/Log.
 */
export const PET_STEAL_MIN_LOOT_CHANCE = 0.05;

/** Skill-Passiv eines Pets — wirkt im Herkunfts-Skill (siehe `PetSkillEffectKind`). */
export interface PetSkillEffect {
  /** Effekt-Art (geschlossene Taxonomie; XP-Kinds sind seit #276 verboten — Guard erzwingt es). */
  kind: PetSkillEffectKind;
  /**
   * Betroffener Skill (PFLICHT für `SKILL_SCOPED_PET_KINDS`; bei `skillBoost` MUSS es eine
   * `BoostableCombatSkillId` sein — `vitality` ist unboostbar). Fehlt → global (skill-frei sind
   * `manaRegen`, `lifesteal`, `damageReduction`, `doubleLoot`, `killHeal`, `sellBonus`).
   */
  skill?: SkillId;
  /** Magnitude als Bruch (0.05 = 5 %) — AUSNAHME `skillBoost`: GANZE Level (max 2). */
  value?: number;
}

/**
 * Getriggerte Combat-Ability eines Pets (ersetzt die alte passive `combatEffect`).
 * Das aktive Pet löst sie alle `intervalMs` aus; combat-dev wendet sie an (siehe `PetAbilityKind`).
 */
export interface PetCombatAbility {
  kind: PetAbilityKind;
  /**
   * Anzeigename der Ability für Combat-Log, Pet-Card/Galerie und Sprung-Animation (#276 §3 —
   * z.B. rotbark „Root Snare"/„Wurzelschlinge"). Pflichtfeld, en+de nicht-leer (Guard).
   * Weitere Sprachen via Locale-Overlay (loc-Pass folgt).
   */
  name: LocalizedString;
  /** Trigger-Intervall in ms (> 0). Guard erzwingt das. */
  intervalMs: number;
  /** NUR für `onHitStatus`/`delayedDot`: welcher Status gelegt wird (burn/bleed/poison/frost). */
  status?: StatusType;
  /** Magnitude — Bedeutung je Kind (siehe `PetAbilityKind`-Tabelle), gedeckelt via `PET_ABILITY_CAP`. */
  value?: number;
}

export interface PetDef {
  id: PetId;
  name: LocalizedString;
  description?: LocalizedString;
  /** Skill-Passiv (wirkt im Herkunfts-Skill, sobald ausgerüstet+besessen). */
  skillEffect: PetSkillEffect;
  /** Getriggerte Combat-Ability (wirkt im Kampf alle `intervalMs`; combat-dev wendet sie an). */
  combatAbility: PetCombatAbility;
  /**
   * Welche Quelle das Pet droppt. `skill` = ein Skilling-Skill (Drop pro Aktions-
   * Abschluss dieses Skills). `combat` = Monster-Kills IM PASSENDEN STIL (combat-dev wirft nur
   * für den aktiven `style`, s. `WeaponStyle`) — Pflichtfeld, damit Content das nie vergisst
   * (Chef-Fix 2026-07-22: Combat-Pets sind an den geführten Kampfstil gebunden).
   */
  source:
    | { kind: "skill"; skill: SkillId }
    | { kind: "combat"; style: WeaponStyle };
  /** Drop-Chance pro Aktions-Abschluss / Kill (z.B. 1/100000 = 0.00001). Reines RNG, KEIN Pity. */
  dropChance: number;
  /** Emoji-Fallback bis Pixelart da ist. */
  icon?: string;
  /** Art-Pfad-Konvention pets/<id>.png (späteres Auto-Discovery). */
  art?: string;
}

/** Obergrenze der Erfolgschance (kein 100%-Selbstläufer). */
export const THIEVING_SUCCESS_CAP = 0.95;
/** Standard-Betäubung bei Fehlschlag, falls die Aktion keine eigene `stunMs` definiert. */
export const DEFAULT_STUN_MS = 1200;

/**
 * Risiko-Modus beim Thieving (Stehlen). Der Spieler wählt zwischen Sicherheit und Ertrag.
 * - „careful" (vorsichtig): höhere Erfolgschance, kürzerer Stun bei Fehlschlag, dafür weniger Belohnung.
 * - „bold" (dreist): mehr Belohnung (XP/Gold/Beute), dafür höhere Fehlschlagchance + längerer Stun.
 */
export type ThievingRisk = "careful" | "bold";

/** Gültige Risiko-Modi (für Sanitize/Validierung). */
export const THIEVING_RISKS: ThievingRisk[] = ["careful", "bold"];

/** Standard-Risiko-Modus für frische Spielstände (und Migration alter Saves). */
export const DEFAULT_THIEVING_RISK: ThievingRisk = "careful";

/** Multiplikatoren/Boni, die ein Risiko-Modus auf die Thieving-Resolution anwendet. */
export interface ThievingRiskMods {
  /** Additiver Bonus auf die Erfolgschance (positiv = sicherer). Wird in actionSuccessChance verrechnet. */
  successBonus: number;
  /** Faktor auf die Betäubungsdauer bei Fehlschlag (< 1 = kürzer, > 1 = länger). */
  stunMult: number;
  /** Faktor auf die Erfolgsbelohnung (Skill-XP, Gold, Beute-Menge). < 1 = weniger, > 1 = mehr. */
  rewardMult: number;
}

/**
 * Konkrete Balance der beiden Modi (bewusst symmetrisch um den Standard).
 * careful: +5 Pp Erfolg, halber Stun, −15 % Belohnung.
 * bold:    −5 Pp Erfolg, 1,5× Stun, +20 % Belohnung.
 */
export const THIEVING_RISK_MODS: Record<ThievingRisk, ThievingRiskMods> = {
  careful: { successBonus: 0.05, stunMult: 0.5, rewardMult: 0.85 },
  bold: { successBonus: -0.05, stunMult: 1.5, rewardMult: 1.4 },
};

/** Liefert die Mods eines Risiko-Modus (fällt für ungültige Werte auf „careful" zurück). */
export function thievingRiskMods(risk: ThievingRisk): ThievingRiskMods {
  return THIEVING_RISK_MODS[risk] ?? THIEVING_RISK_MODS[DEFAULT_THIEVING_RISK];
}

/**
 * Effektive Erfolgschance einer Aktion auf gegebenem Skill-Level. `bonus` ist der
 * additive Hook für späteres Diebes-Gear. Ohne `successBase` immer 1 (deterministisch).
 */
export function actionSuccessChance(action: ActionDef, level: number, bonus = 0): number {
  if (action.successBase === undefined) return 1;
  const req = action.levelRequired ?? 1;
  const raw = action.successBase + (action.successPerLevel ?? 0) * Math.max(0, level - req) + bonus;
  return Math.max(0, Math.min(THIEVING_SUCCESS_CAP, raw));
}

export interface SkillDef {
  id: SkillId;
  name: LocalizedString;
  /** Attribut, das diese Fertigkeit passiv mittrainiert (Hybrid-System). */
  trains?: AttributeId;
}

/** Seltenheitsstufen (Diablo-Stil). Reihenfolge = aufsteigende Wertigkeit. */
export type ItemRarity =
  | "poor"
  | "common"
  | "magic"
  | "rare"
  | "superRare"
  | "epic"
  | "legendary"
  | "godly";

/** Geordnet niedrig → hoch. „magic" ist ein Legacy-Tier (wird in content → „superRare" migriert). */
export const ITEM_RARITIES: ItemRarity[] = [
  "poor",
  "common",
  "magic",
  "rare",
  "superRare",
  "epic",
  "legendary",
  "godly",
];

/** Rarity-Farbe (färbt Name/Label/Item-Bild-Hintergrund im Tooltip). Plan #90. */
export const RARITY_COLORS: Record<ItemRarity, string> = {
  poor: "#8a8a8a", // grau (Müll/junk)
  common: "#e8e8e8", // weiß
  magic: "#5b8fd6", // blau (Legacy)
  rare: "#5ec46e", // grün
  superRare: "#5b8fd6", // blau
  epic: "#a85fd6", // lila
  legendary: "#e0902a", // orange
  godly: "#ffe24a", // hellgelb
};

/** Angezeigtes Rarity-Label (unter dem Item-Namen im Tooltip). */
// Sweep-Fund T6 (2026-07-11): Rarity erscheint im Tooltip-Kopf/Wiki → alle 7 Sprachen.
export const RARITY_LABEL: Record<ItemRarity, LocalizedString> = {
  poor: { en: "Poor", de: "Minderwertig", es: "Pobre", fr: "Médiocre", "pt-BR": "Precário", ru: "Низкое", zh: "劣质" },
  common: { en: "Common", de: "Gewöhnlich", es: "Común", fr: "Commun", "pt-BR": "Comum", ru: "Обычное", zh: "普通" },
  magic: { en: "Magic", de: "Magisch", es: "Mágico", fr: "Magique", "pt-BR": "Mágico", ru: "Магическое", zh: "魔法" },
  rare: { en: "Rare", de: "Selten", es: "Raro", fr: "Rare", "pt-BR": "Raro", ru: "Редкое", zh: "稀有" },
  superRare: { en: "Super Rare", de: "Sehr Selten", es: "Muy raro", fr: "Très rare", "pt-BR": "Muito Raro", ru: "Очень редкое", zh: "超稀有" },
  epic: { en: "Epic", de: "Episch", es: "Épico", fr: "Épique", "pt-BR": "Épico", ru: "Эпическое", zh: "史诗" },
  legendary: { en: "Legendary", de: "Legendär", es: "Legendario", fr: "Légendaire", "pt-BR": "Lendário", ru: "Легендарное", zh: "传说" },
  godly: { en: "Godly", de: "Göttlich", es: "Divino", fr: "Divin", "pt-BR": "Divino", ru: "Божественное", zh: "神圣" },
};

/** Effektive Rarity eines Items (Default „common"). Volle Auto-Ableitung folgt in content (#90). */
export function getItemRarity(item: ItemDef): ItemRarity {
  return item.rarity ?? "common";
}

// ───────────────────────────────────────────────────────────────────────────
// Meisterweihe / Meisterumhänge (design/master-capes-konzept.md, Chef-GO 2026-07-09)
//
// Jeder Skill verleiht bei Level 99 („Meisterweihe") EINMALIG seinen Meisterumhang. Die
// 7 Kampf-Capes brauchen KEINE neuen Hooks (bestehende Bonus-/Signatur-Felder); die
// Ökonomie-Perks laufen über EIN generisches Feld `ItemDef.masterPerk` (Konzept-Notiz §2).
// Engine-Verdrahtung: engine/capes.ts aggregiert die Perks aller AUSGERÜSTETEN Träger
// (generisch alle Slots, praktisch nur Capes) — ADDITIV zu den Pet-Passiva an denselben
// Callsites (Präzedenz petDoubleYieldBonus & Co.).
// ───────────────────────────────────────────────────────────────────────────

/**
 * Die 8 Ökonomie-Perk-Arten der Meisterumhänge (Konzept §2). Bedeutung von `value` je Kind:
 *  - `doubleYield`   additiv auf die Doppelertrag-Chance des Skills (tick.ts `bonusChance`,
 *                    neben Mastery/Pool/Pet/Buff). 0.05 = +5 Pp.
 *  - `inputSaver`    additiv auf die Material-Preservation-Chance des Skills (tick.ts
 *                    `preserveChance`, neben Mastery/Pool/Pet). 0.05 = +5 Pp.
 *  - `cropSpeed`     Farming-Beete reifen um `value` schneller (farming.ts `effectiveGrowMs`:
 *                    growMs × (1 − value)). 0.08 = 8 % schneller.
 *  - `alwaysSucceed` Erfolgschance EXAKT 1 für Aktionen des angegebenen Skills (tick.ts,
 *                    am 0.95-Cap von `actionSuccessChance` vorbei — die Soulchef-Hommage).
 *                    `value` wird ignoriert (Konvention: 1 setzen).
 *  - `buffDuration`  Multiplikator-Bonus auf die Buff-Dauer BEIM ANLEGEN (consumable.ts
 *                    `applyConsumableBuff`: durationMs × (1 + value)). 0.10 = +10 % Dauer.
 *                    Wirkt global auf alle Buff-Consumables (kein Skill-Kontext am Callsite);
 *                    ein deklarierter `skill` ist hier reine Provenienz-Doku.
 *  - `stunReduction` −value auf die Betäubungsdauer bei Fehlschlag (tick.ts, auf die
 *                    risiko-modifizierte DEFAULT_STUN_MS/stunMs-Anwendung). 0.2 = −20 %.
 *  - `successBoost`  additiv auf die Erfolgschance des Skills (tick.ts `successBonus` →
 *                    `actionSuccessChance`; Cap 0.95 bleibt). 0.03 = +3 Pp.
 *  - `slayerPoints`  +value auf die Slayer-Punkte-Gutschrift beim Task-Abschluss (slayer.ts
 *                    `recordKillForSlayer`: round(pointReward × (1 + value))). 0.10 = +10 %.
 *                    Wirkt global (Slayer hat genau eine Gutschrift-Stelle); deklarierter
 *                    `skill` ist Provenienz-Doku.
 */
export type MasterPerkKind =
  | "doubleYield"
  | "inputSaver"
  | "cropSpeed"
  | "alwaysSucceed"
  | "buffDuration"
  | "stunReduction"
  | "successBoost"
  | "slayerPoints";

/**
 * Meister-Perk eines Items (praktisch: eines Meisterumhangs). `skill` scopet skill-gebundene
 * Kinds auf genau diesen Skill (Muster PetSkillEffect): deklariert der Perk einen Skill, wirkt
 * er NUR für diesen; ohne deklarierten Skill wirkt er skill-unabhängig. Für die globalen Kinds
 * (`buffDuration`, `slayerPoints`) ist `skill` reine Doku. Werte werden in der Engine defensiv
 * auf `MASTER_PERK_CAP` geklemmt (Schutz vor Fehl-Content, Muster PET_SKILL_EFFECT_CAP).
 */
export interface MasterPerk {
  kind: MasterPerkKind;
  /** Skill-Scope (z.B. "woodcutting"); fehlt er, wirkt der Perk skill-unabhängig. */
  skill?: SkillId;
  /** Magnitude (Bedeutung je Kind, s. MasterPerkKind). `alwaysSucceed` ignoriert den Wert. */
  value: number;
}

/**
 * Defensive Obergrenzen je Perk-Kind (Engine klemmt via capPerk, engine/capes.ts). BEWUSST über
 * den Konzept-Werten (doubleYield/inputSaver 0.05, cropSpeed 0.08, buffDuration 0.10,
 * stunReduction 0.20, successBoost 0.03, slayerPoints 0.10) — Luft für spätere Items, aber ein
 * Save-/Content-Fehler kann die Ökonomie nie sprengen. Die Envelope-Suite (§8) pinnt die real
 * ausgelieferten Werte.
 */
export const MASTER_PERK_CAP: Record<MasterPerkKind, number> = {
  doubleYield: 0.1,
  inputSaver: 0.1,
  cropSpeed: 0.25,
  alwaysSucceed: 1,
  buffDuration: 0.5,
  stunReduction: 0.8,
  successBoost: 0.1,
  slayerPoints: 0.5,
};

/**
 * Level, ab dem ein Skill die Meisterweihe (und seinen Meisterring) erhält. Name trägt aus
 * historischen Gründen „CAPE" (bis SAVE_VERSION 68 war die Belohnung ein Meisterumhang;
 * Chef-Entscheid 2026-07-17: legendärer RING statt Cape — der Cape-Slot wird frei für
 * Chase-Capes). Die UI importiert die Konstante — Rename folgt mit der UI-Welle.
 */
export const MASTER_CAPE_LEVEL = 99;

/**
 * Pseudo-Skill-Key der VOLLENDUNGS-Weihe (Ring der Vollendung, master-capes-konzept.md §
 * „Vollendung"; seit v69 ein Ring statt Umhang): verliehen, wenn ALLE Content-Skills ≥
 * MASTER_CAPE_LEVEL sind. Läuft durch dieselben Marker-Sets
 * (`masteryCapes`/`capeGranted`/`capeCeremonySeen`) und dieselbe Item-Konvention
 * (`masterRingItemId("completion")` = ring_master_completion) wie die Skill-Weihen —
 * Persistenz-Sanitize und Engine kennen den Key explizit.
 */
export const COMPLETION_CAPE_KEY = "completion";

/**
 * ID-Konvention des Meisterring-Items eines Skills (`ring_master_<skillId>`; bis SAVE_VERSION 68
 * `cape_master_<skillId>` — Chef-Entscheid 2026-07-17: legendärer RING statt Meister-Cape, die
 * v69-Migration mappt die Alt-IDs). EINZIGE Quelle der Konvention — Engine (Verleihung/
 * Nachreichung), Content (Item-Anlage) und UI (Icon/Anzeige) lesen sie hier. Existiert das Item
 * (noch) nicht im Content, setzt die Engine nur den Weihe-Marker und reicht die Verleihung
 * später nach (grantPendingCapes, engine/capes.ts).
 */
export function masterRingItemId(skillId: SkillId): ItemId {
  return `ring_master_${skillId}`;
}

/**
 * @deprecated Seit v69 heißt die Konvention `masterRingItemId` (Ring statt Cape). Alias bleibt,
 * bis die UI (MasteryCeremony.tsx) umgestellt ist — liefert bereits die NEUE Ring-ID.
 */
export const masterCapeItemId = masterRingItemId;

export interface ItemDef {
  id: ItemId;
  name: LocalizedString;
  type: ItemType;
  stackable: boolean;
  /** Emoji-Icon für die Anzeige (v.a. Ausrüstung/Consumables). Nur Platzhalter bis Pixelart-Bilder da sind. */
  icon?: string;
  /** Grundwert in Gold (Verkauf = Wert × SELL_FRACTION). */
  value?: number;
  /** Nur für type === "equipment": in welchen Slot das Item passt. */
  slot?: EquipSlot;
  /** Nur für Waffen: bestimmt den aktiven Kampfstil. */
  weaponStyle?: WeaponStyle;
  /**
   * Konkreter Waffentyp (für Tooltip „Two-Handed Spear" statt fälschlich „Sword").
   * Vorhanden genau dann, wenn `weaponStyle` gesetzt ist. ui-dev liest `WEAPON_TYPE_SPECIALTY`
   * für die Rollenzeile darunter.
   */
  weaponType?: WeaponType;
  /** Zweihandwaffe: belegt Haupt- und Nebenhand (kein Schild gleichzeitig möglich). */
  twoHanded?: boolean;
  /**
   * Waffen 2.0 (itemization-parity-fix §1.1): WoW-Stil-Schadensspanne der Waffe. NUR auf
   * weaponStyle-Trägern; BEIDE Felder gesetzt ⇒ „Range-Form": computeStats liefert
   * attackDamageMin/Max = Charakter-Anteil + Spanne (+ammo), combat.ts rollt uniform darin, und
   * `attackIntervalMs` (unten) gilt ABSOLUT. Fehlen die Felder ⇒ Legacy-Form: die Waffe wirkt wie
   * bisher über ihre `bonus.*`-Flats (Übergangs-Kompatibilität, bis der Content-Apply §3 landet).
   * Range-Form-Waffen tragen KEINE Offensiv-bonus-Flats mehr (damage/accuracy/attackIntervalMs
   * werden zum Doppelzähl-Schutz ignoriert; Guard-Ausweitung folgt mit dem Content-Apply).
   */
  damageMin?: number;
  damageMax?: number;
  /**
   * Zauberfokus (Chef-GO 28.08.2026, bewusster Magier-Buff nach RU-Spielerfeedback „Magieschaden 0,
   * keine Skalierung"): Anteil je INT-Punkt, um den die Waffenspanne (damageMin/damageMax) einer
   * MAGIEWAFFE wächst — computeStats multipliziert die Spanne der Haupthand mit `1 + spellFocus · int`
   * (Range-Form, nur aktiver Stil "magic", nur wenn > 0; `spellFocusMult` in engine/character.ts ist
   * die eine Rechnung für Engine UND Tooltip). 0.008 = +0,8 % je INT. NUR auf mainhand-Waffen mit
   * `weaponStyle: "magic"` und Schadensspanne gültig (Guard: content spell-focus-content.test.ts);
   * Foki/Orbs (offhand, keine Spanne) tragen es NICHT. Zielkurve + Koeffizienten je Stufe:
   * design/zauberfokus-2026-08-28.md (Stab ≈ 0,0030–0,0032, Zauberstab/Zepter ≈ 0,0025–0,0027).
   */
  spellFocus?: number;
  /**
   * Waffen 2.0 (§1.4): ABSOLUTES Waffentempo in ms („Tempo 2.8 s"). Wird NUR bei Range-Form-Waffen
   * (damageMin/Max gesetzt) gelesen; Default 3000 (unbewaffnet-Basis). Legacy-Waffen behalten ihr
   * Tempo-DELTA in `bonus.attackIntervalMs`. Nicht-Waffen-Quellen (Suffixe/Buffs) bleiben Deltas.
   */
  attackIntervalMs?: number;
  /** Flache Boni auf Kampfwerte, wenn ausgerüstet. */
  bonus?: EquipBonus;
  // ── Rüstungs-Trinität / Itemization 2.5 (design/armor-trinity-spec.md §2.1) ──────────────────
  // Vier defensive Klassen-Schicht-Felder, je NUR auf ihrer Rüstungsklasse gültig (Guard: content-dev/
  // kontrolleur — alle ≥ 0, streng steigend je Tier). Getrennt vom Attribut-Basiskern; computeStats
  // aggregiert sie (armorRating/evasionRating/wardCapacity summiert, blockChance als MAX = ein Schild).
  /**
   * Platte-Mitigation: Roh-Armor je Teil (VOR der `def/(def+K)`-Reduktion). NUR auf Platten-Rüstung
   * (helmet/body/legs/gloves/boots) + Platten-Schilden; zusätzlich als 2H-Melee-Waffen-Bonus (Spec §5),
   * den computeStats NUR bei `weaponStyle==="melee" && twoHanded` addiert. ≥ 0.
   */
  armorRating?: number;
  /**
   * Schild-Block-Chance (0..1). NUR auf offhand-Schilden gültig (Guard: `slot==="offhand"` und KEIN
   * `weaponStyle`). Block ist die reine Melee-1H-Schiene — 2H-Waffen (Bogen/Stab) tragen nie ein Schild,
   * also nie Block (Spec §5). In computeStats auf `BLOCK_CAP` gedeckelt und bei 2H-Mainhand auf 0 gesetzt.
   */
  blockChance?: number;
  /**
   * Leder-Ausweichen: Ausweichwertungs-Punkte je Teil (Σevr → dodgeChance über die Sättigungskurve
   * `min(DODGE_CAP, DODGE_EFF_MAX·Σevr/(Σevr+K_DODGE))`, #301). NUR auf Leder-Rüstung. Getrennt vom
   * Accuracy-Contest-`evasion` (DEX-Kern) — das ist eine ZUSÄTZLICHE flache Voll-Vermeidung
   * (0 Schaden); der L5-Kombiboden in combat.ts klemmt Dodge×Contest gemeinsam auf MIN_HIT_CHANCE.
   */
  evasionRating?: number;
  /**
   * Stoff-Ward: Beitrag zum Ward-Absorptionspool je Teil (maxWard = int·WARD_CORE_PER_INT + Σ dies).
   * NUR auf Stoff-Rüstung. ≥ 0. Spec §1.4.
   */
  wardCapacity?: number;
  // ── Combat-Depth / Konter-Play-Signaturen (design/combat-depth-spec.md §2.4/§2.5/§3.3) ─────────
  // Drei optionale Waffen-Signatur-Felder (0..1), NUR auf `weaponStyle`-Trägern gültig (Guard:
  // content-dev/kontrolleur — alle 0..1, nur auf Waffen). computeStats aggregiert sie in die
  // gleichnamigen DerivedStats (auf ARMOR_PEN_CAP/PRECISION_CAP/WARD_BREAK_CAP geklemmt); combat.ts
  // (Phase B) wendet die (disjunkte) Wirkung gegen die Gegner-Verteidigungs-Trinität an.
  /** Armor-Pen: Anteil der Gegner-Mitigation (`def/(def+K)`-Input), den die Waffe ignoriert (Maul .30, Kolben .25). Spec §2.4. */
  armorPen?: number;
  /** Precision: Anteil der Gegner-Evasion, den die Waffe ignoriert (Dolch .30, Langbogen .25, Speer .20). Spec §2.3/§2.5. */
  precision?: number;
  /** Ward-Break: Anteil eines Treffers, der den Gegner-Ward-Pool umgeht und direkt auf HP geht (Stab .30, Zepter .25). Spec §2.5. */
  wardBreak?: number;
  /** Nur für Magie-/Spezialwaffen: Statuseffekt, der bei Treffer angewandt wird. */
  weaponEffect?: WeaponEffect;
  /**
   * Zusätzliche Waffeneffekte (additiv zum einzelnen `weaponEffect`). Für kombinierte Mehrfach-
   * Status (z.B. Void-Fusion burn+bleed). Die effektive Liste = `[weaponEffect, ...weaponEffects]`
   * (dedupliziert) liefert `effectiveWeaponEffects(item)`. combat-dev iteriert darüber.
   */
  weaponEffects?: WeaponEffect[];
  /**
   * Nur für Magie-Waffen: Manakosten pro Zauber (überschreibt den globalen `MANA_PER_CAST`).
   * Fehlt das Feld, gilt der globale Default. Erwartet ≥ 0.
   */
  manaCost?: number;
  /**
   * Nur für Consumables: zeitlich begrenzter Buff (Glyphen/Tränke).
   * Armor-Iteration 2 (§10.1): zusätzlich zu den Kampf-Flats (`bonus`) kann ein Buff jetzt auch
   * Attribute (`modifiers`) UND die Trinity-Defensiv-Schicht (`trinity`) temporär anheben. Beides
   * ist stil-UNABHÄNGIG (ein Trank-Effekt, kostet ein Consumable — wie OSRS; bewusst KEIN
   * Rüstungsklassen-Gate). computeStats faltet `modifiers` in die Attribut-Summe und `trinity` in
   * die jeweiligen Aggregate (armorRating/evasionRating/wardCapacity additiv, blockChance als MAX).
   */
  buff?: {
    durationMs: number;
    /**
     * Buff-Kategorie mit Verdrängung (red-team 2026-07-09 L3): pro Kategorie ist maximal EIN Buff
     * aktiv — `applyConsumableBuff` verdrängt beim Anlegen einen aktiven Buff DERSELBEN Kategorie
     * (ersetzt, nicht addiert); dasselbe Item erneut = reiner Dauer-Refresh. Buffs OHNE Kategorie
     * (Alt-/Sonderfälle, z.B. die 2–4-s-HoT-Heiltränke minor/greater_healing_potion +
     * bloodmend_draught, die zur HEIL-Pipeline gehören und keine Dauer-Buffs sind) stapeln wie
     * bisher frei. Lebt NUR in der ContentDB (kein Save-State) ⇒ KEIN SAVE_VERSION-Bump; Alt-Saves
     * mit bereits gestapelten Buffs derselben Kategorie bleiben ladbar und laufen natürlich aus.
     */
    category?: BuffCategory;
    bonus: EquipBonus;
    /** NEU (§10.1): temporäre Attribut-Boni (str/dex/con/int/wis/lck), ganzzahlig. */
    modifiers?: Partial<Record<AttributeId, number>>;
    /** NEU (§10.1): temporäre Trinity-Schicht-Boni. */
    trinity?: {
      /** ×10-Skala (wie ItemDef.armorRating). */
      armorRating?: number;
      /** Punkte (dodge-Formel-Input, wie ItemDef.evasionRating). */
      evasionRating?: number;
      /** 1:1-Pool (wie ItemDef.wardCapacity). */
      wardCapacity?: number;
      /** 0..1 (nur mit Schild/1H wirksam — der 2H-Gate in computeStats greift wie bei Gear). */
      blockChance?: number;
    };
  };
  /** Attribut-Boni, wenn ausgerüstet. Itemization 2.0: ganzzahlig ≥1 (Guard §8.3). */
  modifiers?: Partial<Record<AttributeId, number>>;
  /**
   * Skill-Level-Boosts (Itemization 2.0 §4, OSRS-Stil), wenn ausgerüstet: hebt das EFFEKTIVE
   * Level der 6 boostbaren Kampf-Skills NUR in den computeStats-Kampfformeln (z.B.
   * `{ power: 2 }` → Power-Terme rechnen mit Level+2). KEIN Einfluss auf Requirements/
   * combatLevel/XP/Freischaltungen (§4.2). Erlaubte Träger laut §4.4: Schmuck/Capes/Amulette
   * (Kern-Mechanik, genau 1 Boost je Stück) und Rüstungs-Signaturen; normale Rüstung/Waffen
   * tragen KEINE Boosts (Guard §8.3). Werte ganzzahlig 1–5.
   */
  skillBoost?: SkillBoostMap;
  /** Mindest-Skill-Level zum Tragen/Benutzen (z.B. { attack: 10 }). */
  requirements?: Partial<Record<SkillId, number>>;
  /** Nur für type === "consumable": geheilte HP beim Verzehr. */
  healAmount?: number;
  /**
   * Anteil der maxHp (0..1), der beim Verzehr geheilt wird (Combat-Feel v2 #0a). Wenn gesetzt,
   * überschreibt `healPct` den flachen `healAmount` für die Heilung: ALLE Heilpfade (Auto-Eat,
   * Auto-Trank, manuelles useConsumable) nutzen dann `round(maxHp · healPct)` statt `healAmount`
   * (zentral in `consumableHeal`). `healAmount` bleibt Fallback/Tooltip. Lebt NUR in der ContentDB
   * (kein Save-State) ⇒ KEIN SAVE_VERSION-Bump. Ohne dieses Feld heilt das Item exakt wie bisher.
   */
  healPct?: number;
  /** Nur für type === "consumable": entfernt aktive Gift-Effekte vom Spieler. */
  curesPoison?: boolean;
  /**
   * Nur für type === "consumable": Sonder-Wirkung (s. `ConsumableEffect`, z.B. Auftragsmarke
   * `{ kind: "slayerReroll" }`). Kombinierbar mit Heilung/Gift-Heilung/Buff (alle Wirkungen greifen
   * in EINEM Verzehr); ein Item mit NUR dieser Wirkung ist ein reines Utility-Verbrauchsgut ohne
   * Heil-Takt (consume-gate: kind "none"). Schlägt die Sonder-Wirkung fehl (z.B. kein aktiver
   * Slayer-Auftrag), wird das Item NICHT verbraucht. Nur ContentDB ⇒ kein SAVE_VERSION-Bump.
   */
  consumable?: ConsumableEffect;
  /** RPG-Beschreibung/Flavor (im großen Tooltip). */
  description?: LocalizedString;
  /** Seltenheitsstufe (Diablo-Stil, färbt Name/Rahmen). Default „common". */
  rarity?: ItemRarity;
  // bagCapacity: GELÖSCHT (#278) — Taschenslot-System entfernt, small_pouch ist aus dem Katalog (#272).
  /** Nur für type === "tool": beschleunigt eine Fertigkeit (speedMult < 1 = schneller), wirkt aus dem Inventar. */
  tool?: { skill: SkillId; speedMult: number };
  /**
   * true = dieses Ausrüstungsteil erfüllt ALLE Slayer-Item-Anforderungen (kombinierter Slayer-Helm).
   * Phase 1: nur das Feld + die `slayerRequirementMet`-Logik sind vorbereitet — Content liefert das
   * konkrete Helm-Item + Rezept erst in Phase 2 (`slayerXpMult` & Helm-Crafting). Wirkt nur, wenn
   * ausgerüstet (egal in welchem Slot).
   */
  slayerHelm?: boolean;
  /**
   * Nur für Runen-Items (Enchant): welcher Affix + Tier am Verzauberungstisch angebracht wird.
   * Quelle der Runen→Affix-Map (content-dev füllt es in Welle 2). Die Engine liest es defensiv
   * über `runeAffix()` — ohne Runen-Content existiert das Feld einfach nicht, kein Crash.
   */
  rune?: RuneAffix;
  /**
   * Meister-Perk (Meisterringe, design/master-capes-konzept.md §2; seit v69 Ringe statt
   * Umhänge): EIN generisches Feld für die 8 Ökonomie-Perk-Kinds (s. `MasterPerkKind`). Wirkt
   * NUR ausgerüstet; engine/capes.ts aggregiert generisch über ALLE Equip-Slots (praktisch
   * tragen nur die `ring_master_<skillId>`-Ringe einen Perk) und stapelt die Werte ADDITIV mit
   * den Pet-Passiva an denselben Callsites.
   * Lebt NUR in der ContentDB (kein Save-State) ⇒ das Feld selbst braucht KEINEN Migrationszweig;
   * der SAVE_VERSION-59-Bump gilt den Weihe-Markern im GameState.
   */
  masterPerk?: MasterPerk;
}

/**
 * Effektive Waffeneffekte eines Items = `[weaponEffect, ...weaponEffects]`, dedupliziert
 * (identische Effekte — gleicher type/chance/magnitude/durationMs — zählen nur einmal).
 * Reine, deterministische Lese-/Normalisierungs-Funktion: combat-dev iteriert darüber, um
 * alle Status (inkl. 2-Status-Fusionen) anzuwenden, ohne `weaponEffect` und `weaponEffects[]`
 * getrennt behandeln zu müssen. Liefert [] für Items ohne jeden Effekt.
 */
export function effectiveWeaponEffects(item: ItemDef | null | undefined): WeaponEffect[] {
  if (!item) return [];
  const out: WeaponEffect[] = [];
  const seen = new Set<string>();
  const push = (e: WeaponEffect | undefined | null): void => {
    if (!e) return;
    const key = `${e.type}|${e.chance}|${e.magnitude}|${e.durationMs}|${e.threshold ?? ""}|${e.stacks ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(e);
  };
  push(item.weaponEffect);
  if (Array.isArray(item.weaponEffects)) for (const e of item.weaponEffects) push(e);
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Item-Instanzen (Enchant-Fundament, Phase 1 — Architektur B = echte Instanzen)
//
// Leitprinzip: Unmodifizierte Items bleiben EXAKT stapelbare Stacks `{itemId, qty}`.
// Eine `ItemInstance` entsteht ERST, wenn ein Affix (Verzauberung) ODER ein Suffix
// (Phase-2-Roll) angebracht wird. Nur Instanzen sind non-stackable. So bleibt das
// gesamte Stack-/Bank-/Mengen-System für 99 % der Items unangetastet.
// ───────────────────────────────────────────────────────────────────────────

export type InstanceId = string; // deterministisch vergeben: "inst_" + seq.toString(36)
export type AffixId = string; // Verzauberung (deterministisch, Tier-getrieben)
export type SuffixId = string; // Random-Roll-Suffix (Phase 2)

/** Ein konkret angebrachter Affix (Verzauberung) auf einer Instanz. */
export interface EnchantAffix {
  affixId: AffixId;
  /** Runen-Tier → Effektstärke (1-basiert; Index in `AffixDef.bonusByTier` = tier-1). */
  tier: number;
}

/**
 * Ein konkret gerollter Suffix (Random Roll). Phase 1: nur das Feld existiert (suffix-ready),
 * computeStats liest es mit. Befüllt wird es erst in Phase 2 (`rollSuffix`).
 */
export interface SuffixRoll {
  suffixId: SuffixId;
  /** Item-Level beim Roll (Craft-/Monster-Level). Skaliert die Stat-Höhe. */
  ilvl: number;
  /** Gerollte Stärkestufe innerhalb des ilvl-Bandes (0..1, Platzhalter). */
  roll: number;
}

/** Eine echte Item-Instanz: Basis-Item + angebrachte Modifikationen + eigene Identität. */
export interface ItemInstance {
  instanceId: InstanceId;
  /** Verweist auf die statische ItemDef (Icon/Typ/Slot/Basis-bonus). */
  baseItemId: ItemId;
  /** 0..N Affixe (N = `enchantSlotsFor(rarity)`). */
  affixes: EnchantAffix[];
  /** 0..1 Suffix (Phase 2). */
  suffix?: SuffixRoll;
}

// ───────────────────────────────────────────────────────────────────────────
// Postfach / Mailbox (SAVE_VERSION 71): Überlauf-Puffer für vollen Inventar (WoW-artig).
// ───────────────────────────────────────────────────────────────────────────

/**
 * Ein gestapelter Item-Anhang einer Mail. Stackbarer Loot wird per `itemId` zusammengefasst
 * (eine `qty`), damit nicht pro Item eine Zeile entsteht (Staffelung). `qty` ist stets eine
 * positiv-endliche Ganzzahl (sanitize härtet).
 */
export interface MailAttachment {
  itemId: ItemId;
  qty: number;
}

/** Wer einen Brief (`MailMessage.kind === "letter"`) verschickt hat — s. dortige Doku. */
export type MailLetterSender = "brenna" | "warden";

/** Gemeinsame Felder JEDER Postfach-Nachricht, unabhängig von `kind` (s. `MailMessage`). */
export interface MailMessageBase {
  id: string;
  /** Vergabe-Reihenfolge (= Wert von `GameState.mailSeq` beim Anlegen). Deterministisch, monoton. */
  createdSeq: number;
  /** Gestapelte stackbare Anhänge (per itemId zusammengefasst). */
  items: MailAttachment[];
  /** Nicht stapelbare Item-Instanzen (verzaubert/gesuffixt), je ein Unikat. */
  instances: ItemInstance[];
}

/**
 * Eine Postfach-Nachricht — echtes Discriminated Union über `kind`, ZWEI Sorten:
 *  - `kind: "overflow"` — das EINE stehende Überlauf-Objekt, in dem Loot/Craft-Output gesammelt
 *    wird, wenn Inventar (und, bei Auto-Bank, das Lager) keinen Platz mehr hat. Stackbarer Loot
 *    liegt gestapelt in `items` (per itemId), nicht stapelbare Unikate (verzaubert/gesuffixt) als
 *    Liste in `instances`. Beim vollständigen Abholen verschwindet die Mail; neuer Überlauf legt
 *    bei Bedarf eine frische an (find-or-create).
 *  - `kind: "letter"` (Raben-Post, „Jagd-Paket" L, engine/mail.ts `sendLetter`) — EIN erzählerischer
 *    Brief von `from`, dessen Text über den i18n-SCHLÜSSEL `textKey` aufgelöst wird (NIE Rohtext im
 *    Save). Ein optionales Geschenk (Kopfgeld-Anhang) liegt — bewusst IN DENSELBEN Feldern wie ein
 *    Überlauf-Paket, `items`/`instances` (kein separates `attachments`-Feld): ein Brief IST
 *    strukturell eine Überlauf-Mail plus `from`+`textKey`, dieselbe Sammel-/Abhol-Mechanik gilt
 *    identisch für beide Sorten. Jeder Brief bekommt eine EIGENE Mail-Zeile (kein Zusammenfassen
 *    mehrerer Briefe wie bei der stehenden Überlauf-Mail). Ein Brief OHNE Geschenk (leere
 *    `items`/`instances`, z. B. der Wächter-Brief) wird NIEMALS wegen „leerem Inhalt" verworfen
 *    (anders als eine leere Überlauf-Mail) — der Brieftext selbst ist der Inhalt, unabhängig vom
 *    Geschenk (`engine/mail.ts sendLetter`/persistence-Sanitize kennen diese Ausnahme).
 * `id`/`createdSeq` werden für BEIDE Sorten deterministisch aus `GameState.mailSeq` vergeben (KEIN
 * Date.now/Math.random — sonst bricht der Offline==Online-Determinismus). „Gelesen"/Zustellung
 * folgt für BEIDE Sorten demselben Collect-Mechanismus (`collectMail`/`collectAllMail`,
 * engine/mail.ts) — kein separates read-Flag: eine Mail verschwindet, sobald ihr gesamter Inhalt
 * (items+instances) abgeholt ist.
 */
export type MailMessage =
  | (MailMessageBase & { kind: "overflow" })
  | (MailMessageBase & { kind: "letter"; from: MailLetterSender; textKey: string });

/**
 * Verknüpft ein Runen-Item mit dem Affix + Tier, den es am Verzauberungstisch anbringt.
 * Liegt als optionales Feld `ItemDef.rune` am Runen-Item (content-dev füllt es in Welle 2).
 * Die Engine liest es defensiv — ohne Runen-Content crasht nichts.
 */
export interface RuneAffix {
  affixId: AffixId;
  tier: number;
}

/** Gemeinsames Item-Typ-Tag-System (Affixe UND Suffixe filtern darüber). */
export type ItemTypeTag =
  | "weapon_melee"
  | "weapon_ranged"
  | "weapon_magic"
  | "armor"
  // Rüstungsklassen-Tags (Chef-GO 25.08.2026, 1.1.0, design/rezension-patch-2026-08-25.html #p14):
  // ZUSÄTZLICH zu "armor" (das bleibt für die Runen-Affixe/`requiresTrinity`-Gate erhalten), damit
  // Suffix-Pools klassenrein filtern können (Platte bekam vorher denselben `armor`-Pool wie Stoff —
  // Grund für „Plattenhelm des Weisen" mit Weisheit). Abgeleitet aus dem Trinity-Stat des Items,
  // kein neues Datenfeld nötig.
  | "armor_plate"
  | "armor_leather"
  | "armor_cloth"
  | "shield"
  | "jewelry"
  | "any_weapon"
  | "any";

/**
 * Aggregierte Trinity-Defensiv-Werte (Rüstungs-Trinität, alle vier Achsen präsent, ≥ 0). Gemeinsame
 * Form für `instanceBonusDelta().trinity` (Affix-Overlay) und die Enchant-Vorschau (`ItemStatView`).
 * Aggregations-Regel überall identisch (computeStats/Gear/Buff): armorRating/evasionRating/
 * wardCapacity ADDITIV, blockChance als MAX (nur ein Schild bzw. die stärkste Quelle zählt).
 */
export interface TrinityStats {
  armorRating: number;
  evasionRating: number;
  wardCapacity: number;
  blockChance: number;
}

/** Katalog-Definition einer Verzauberung (content-dev füllt `ContentDB.affixes`). */
export interface AffixDef {
  id: AffixId;
  /** Namens-Präfix („Feuriges", „Wuchtiges", …). */
  prefix: LocalizedString;
  /** Flache Boni pro Tier (Index 0 = T1). Aggregiert in computeStats via addBonus. */
  bonusByTier: EquipBonus[];
  /** Attribut-Mods pro Tier (optional, Index 0 = T1). */
  modifiersByTier?: Array<Partial<Record<AttributeId, number>>>;
  /**
   * Optionaler Waffeneffekt pro Tier (z.B. burn) — von combat-dev über effectiveInstanceWeaponEffects gelesen.
   * `undefined`-Eintraege sind erlaubt (Runen Tier IV, Chef-Entscheid 25.08.2026, design/runen-tier-iv.html
   * §2 Prinzip 4): eine T4-Familie belegt NUR Index 3 (`[undefined, undefined, undefined, effekt]`), die
   * Indizes 0..2 bleiben leer, damit kein Tier I bis III dieser Familie existiert. Alle Leser indizieren
   * ohnehin mit `?.[tier - 1]` (noUncheckedIndexedAccess) und pruefen auf Vorhandensein.
   */
  weaponEffectByTier?: Array<WeaponEffect | undefined>;
  /**
   * Trinity-Defensiv-Boni pro Tier (Index 0 = T1), analog `buff.trinity`. Für die Rüstungs-/Schild-Runen
   * (Rune der Ägide=armorRating / des Ausweichens=evasionRating / der Abwehr=wardCapacity / des
   * Bollwerks=blockChance). `instanceBonusDelta` faltet sie in den Trinity-Delta (armorRating/
   * evasionRating/wardCapacity ADDITIV, blockChance als MAX); computeStats addiert diesen Delta auf die
   * gleichnamigen `eq.*`-Aggregate (dieselbe Faltung wie Gear/Buff — computeStats bleibt die einzige
   * Stat-Aggregation). Klassen-Gate am Verzauberungstisch (`applyEnchant`, §6.2): eine Trinity-Rune
   * haftet nur auf einem Basis-Teil, das denselben Trinity-Stat bereits > 0 trägt (Schutz→Platte,
   * Ausweich→Leder, Ward→Stoff, Block→Schild).
   */
  trinityByTier?: Array<Partial<TrinityStats>>;
  /**
   * Klassen-Gate OHNE Trinity-Wert (Runen Tier IV, Chef-Entscheid 25.08.2026, design/runen-tier-iv.html
   * §4.2): das Zielteil muss diesen Trinity-Stat bereits > 0 tragen, auch wenn der Affix selbst keinen
   * Trinity-Bonus bringt. Noetig, weil Schmuck (Ringe/Amulett/Umhang) ZUSAETZLICH das `armor`-Tag traegt
   * (`itemTypeTags`): eine Dornen-Rune mit `appliesTo: ["armor"]` und nur einem Aktiv-Effekt wuerde
   * sonst auf einem Meister-Ring haften. armorRating→Platte, evasionRating→Leder, wardCapacity→Stoff,
   * blockChance→Schild. Ausgewertet in `trinityGatePasses` (engine/enchant.ts), also in applyEnchant,
   * enchantPreview und dem BiS-Builder der Envelope-Suite gleichermassen. Optional: Alt-Content
   * unveraendert, `trinityByTier` gated weiterhin von selbst.
   */
  requiresTrinity?: keyof TrinityStats;
  /** Auf welche Item-Typen/Stile anwendbar. Fehlt = überall. */
  appliesTo?: ItemTypeTag[];
}

/**
 * „Soft"-Stats mit eigener, gedeckelter Skala (suffix-pool-spec §3.3): crit & Speed dürfen NICHT
 * mit dem ~20× Scale-Index linear hochskalieren (sonst 100 % Crit / Negativ-Intervalle). Sie rollen
 * über feste Endpunkte (`SUFFIX_SOFT_STATS`). Ein Suffix LISTET nur, welche Soft-Stats er trägt; die
 * Magnitude kommt aus der universellen Tabelle (kein per-Suffix-Wert → content-dev pflegt nur die Liste).
 */
export type SuffixSoftStatKey = "critChance" | "critDamage" | "attackIntervalMs";

/** Katalog-Definition eines Suffix (Phase 2; content-dev füllt `ContentDB.suffixes`). */
export interface SuffixDef {
  id: SuffixId;
  /** Namens-Suffixphrase („des Tigers", …). */
  suffix: LocalizedString;
  appliesTo?: ItemTypeTag[];
  /**
   * Lineare Stats: k-Koeffizient pro Stat (Wert bei Scale-Index S=1). Skaliert mit `suffixScaleIndex(ilvl)`
   * und der ±15 %-Roll-Varianz. Rundung: gesquishte Flat-Stats 1 Dezimale (min 0.1), `maxMana`
   * ganzzahlig (min 1), `manaRegen` 1 Dezimale, `hpRegenPerSec` 2 Dezimalen (s. instanceBonusDelta).
   */
  statsPerIlvl?: Partial<EquipBonus>;
  /**
   * Attribut-k-Koeffizienten (analog `statsPerIlvl`). Itemization 2.0 §1.2: gerundet wird
   * GANZZAHLIG mit min 1 (`max(1, round(k·S·variance))`); die k-Werte im Content bleiben
   * unverändert (gleiche Größenordnung wie zuvor, nur Integer-Raster statt 0.5er-Raster).
   */
  attrPerIlvl?: Partial<Record<AttributeId, number>>;
  /**
   * Skill-Boost-k-Koeffizient (Itemization 2.0 §7, NUR Schmuck-Pool via appliesTo "jewelry"):
   * gerollte Boost-Stufe = `clamp(max(1, round(k·S·variance)), 1, 3)` — d.h. +1 (früh) bis
   * +3 (ilvl 100) effektive Level auf den gelisteten Kampf-Skill (s. `instanceBonusDelta`).
   */
  boostPerIlvl?: SkillBoostMap;
  /** „Soft"-Stats (crit/speed): nur die Liste der Felder; Werte aus `SUFFIX_SOFT_STATS` (§3.3). */
  softStats?: SuffixSoftStatKey[];
  /** Pool-Gewicht für den gewichteten Roll (Roll 2). Fehlt → 1. */
  weight?: number;
  /** Min-ilvl, ab dem dieser Suffix im Pool ist (Gating starker Suffixe). */
  minIlvl?: number;
}

/**
 * Globale Basis-Suffix-Chance beim CRAFTEN (suffix-pool-spec §5: „~20 % der Crafts werden etwas
 * Besonderes"). Gilt für jede Craft-Aktion (Aktion mit `inputs`), die ein Equipment-Item ausgibt,
 * sofern weder `LootRoll.suffixChance` noch `ActionDef.suffixChance` gesetzt sind. Der lck-Modifikator
 * (+0.0015·lck, Cap +0.15) wird in `rollSuffix` additiv aufgeschlagen. Override-Priorität:
 * `LootRoll.suffixChance` › `ActionDef.suffixChance` › `DEFAULT_CRAFT_SUFFIX_CHANCE`.
 */
export const DEFAULT_CRAFT_SUFFIX_CHANCE = 0.2;

/**
 * Globale Basis-Suffix-Chance beim DROP (suffix-pool-spec §5/§6, Phase 2): deutlich seltener als
 * Crafting. Greift, wenn ein `LootRoll.suffixChance` beim Combat-Drop fehlt. Verdrahtung des
 * Drop-Pfads liegt in combat.ts (Combat-Dev) — diese Konstante + `LootRoll.suffixChance` ist das
 * gemeinsame Fundament dafür.
 */
export const DEFAULT_DROP_SUFFIX_CHANCE = 0.08;

/** Item-ID des Schrott-Materials aus Salvage (content-dev legt das Item in Welle 2 an). */
export const SCRAP_ITEM_ID: ItemId = "item_scrap";

/**
 * Enchant-Slots pro Item nach RARITY (Chef: „Enchant-Slots pro Item nach Rarity").
 * Deckelt `ItemInstance.affixes.length`. Platzhalter-Staffel (Balance-Domäne).
 */
export function enchantSlotsFor(rarity: ItemRarity): number {
  switch (rarity) {
    case "poor":
    case "common":
      return 1;
    case "magic":
    case "rare":
    case "superRare":
      return 2;
    case "epic":
      return 3;
    case "legendary":
    case "godly":
      return 4;
    default:
      return 1;
  }
}

// AUTO_SALVAGE_MAX_AFFIX_TIER / AUTO_SALVAGE_SUFFIX_ROLL / isLowQualityInstance: ENTFERNT
// (Chef-Entscheid Task #271, SAVE_VERSION 56). Es gibt kein Auto-Salvage mehr — ungewollte
// Instanzen werden verkauft. `intakeInstance` (engine) behält jetzt immer.

/**
 * Leitet die Item-Typ-Tags rein aus der ItemDef ab (kein neues Datenfeld nötig).
 * Affix-/Suffix-Pools filtern über `appliesTo ∩ itemTypeTags(item)`.
 */
export function itemTypeTags(item: ItemDef): ItemTypeTag[] {
  const tags: ItemTypeTag[] = ["any"];
  if (item.weaponStyle) {
    tags.push("any_weapon");
    if (item.weaponStyle === "melee") tags.push("weapon_melee");
    else if (item.weaponStyle === "ranged") tags.push("weapon_ranged");
    else if (item.weaponStyle === "magic") tags.push("weapon_magic");
  } else if (item.type === "equipment" && item.slot) {
    if (item.slot === "offhand") tags.push("shield");
    // Schmuck-Slots (Itemization 2.0 §7): eigener "jewelry"-Tag für den Boost-Suffix-Pool.
    // BEWUSST ZUSÄTZLICH zu "armor" (bestehende armor-Suffix-Pools auf Schmuck bleiben
    // unverändert — die §7-NEU-Spalte macht sie ohnehin attribut-only).
    if (
      item.slot === "ring1" ||
      item.slot === "ring2" ||
      item.slot === "amulet" ||
      item.slot === "cape"
    ) {
      tags.push("jewelry");
    }
    tags.push("armor");
    // Rüstungsklassen-Tag (Chef-GO 25.08.2026, 1.1.0, #p14): zusätzlich zu "armor", je nachdem,
    // welchen Trinity-Stat das Teil trägt (Rüstungs-Trinität legt die Klasse fest — Platte
    // mitigiert/armorRating, Leder weicht aus/evasionRating, Stoff wardet/wardCapacity). Schmuck
    // (Ringe/Amulett/Umhang) trägt i.d.R. keinen Trinity-Stat und bleibt damit klassenfrei (nur
    // "armor" + "jewelry"), rollt also weiterhin alle Attribut-Suffixe.
    if (item.armorRating) tags.push("armor_plate");
    else if (item.evasionRating) tags.push("armor_leather");
    else if (item.wardCapacity) tags.push("armor_cloth");
  }
  return tags;
}

/** true, wenn ein Affix/Suffix mit `appliesTo` auf das Item passt (leeres appliesTo = überall). */
export function affixAppliesToItem(appliesTo: ItemTypeTag[] | undefined, item: ItemDef): boolean {
  if (!appliesTo || appliesTo.length === 0) return true;
  const tags = new Set(itemTypeTags(item));
  return appliesTo.some((t) => tags.has(t));
}

/** Gold-Kosten einer Verzauberung (Rune + Gold). Platzhalter — Balance-Domäne. */
export function enchantGoldCost(tier: number, rarity: ItemRarity): number {
  const rIdx = Math.max(0, ITEM_RARITIES.indexOf(rarity));
  return 100 * Math.max(1, tier) * (1 + rIdx);
}

/** Gold-Kosten eines Disenchant (Affix entfernen; Rune ist weg, kein Refund). Platzhalter. */
export function disenchantGoldCost(tier: number, rarity: ItemRarity): number {
  return Math.round(enchantGoldCost(tier, rarity) * 0.5);
}


/**
 * Aggregierter Stat-Delta einer Instanz (Affix- + Suffix-Boni). REINE Funktion — die einzige
 * Auflösungsstelle von Affix/Suffix-Stärke zu Boni, aufgerufen ausschließlich aus computeStats.
 * Defensiv: ohne `content.affixes`/`content.suffixes` liefert sie leere Deltas (kein Crash).
 * `skillBoost` = gerollte Skill-Level-Boosts der Schmuck-Boost-Suffixe (Itemization 2.0 §7).
 */
export function instanceBonusDelta(
  inst: ItemInstance,
  content: ContentDB,
): {
  bonus: EquipBonus;
  modifiers: Partial<Record<AttributeId, number>>;
  skillBoost: SkillBoostMap;
  trinity: TrinityStats;
} {
  const bonus: EquipBonus = {};
  const modifiers: Partial<Record<AttributeId, number>> = {};
  const skillBoost: SkillBoostMap = {};
  // Trinity-Overlay der Rüstungs-/Schild-Runen (`AffixDef.trinityByTier`). Faltung wie Gear/Buff:
  // armorRating/evasionRating/wardCapacity additiv, blockChance als MAX. computeStats addiert diesen
  // Delta auf die eq.*-Aggregate (die EINZIGE Stat-Aggregation) — nur Suffixe tragen kein Trinity.
  const trinity: TrinityStats = { armorRating: 0, evasionRating: 0, wardCapacity: 0, blockChance: 0 };
  const addBonus = (b: EquipBonus | undefined): void => {
    if (!b) return;
    const k = Object.keys(b) as (keyof EquipBonus)[];
    for (const key of k) bonus[key] = (bonus[key] ?? 0) + (b[key] ?? 0);
  };
  const addMods = (m: Partial<Record<AttributeId, number>> | undefined): void => {
    if (!m) return;
    for (const id of ATTRIBUTE_IDS) if (m[id]) modifiers[id] = (modifiers[id] ?? 0) + (m[id] ?? 0);
  };
  const addTrinity = (tr: Partial<TrinityStats> | undefined): void => {
    if (!tr) return;
    trinity.armorRating += tr.armorRating ?? 0;
    trinity.evasionRating += tr.evasionRating ?? 0;
    trinity.wardCapacity += tr.wardCapacity ?? 0;
    trinity.blockChance = Math.max(trinity.blockChance, tr.blockChance ?? 0);
  };
  for (const a of inst.affixes) {
    const def = content.affixes?.[a.affixId];
    if (!def) continue;
    addBonus(def.bonusByTier?.[a.tier - 1]);
    addMods(def.modifiersByTier?.[a.tier - 1]);
    addTrinity(def.trinityByTier?.[a.tier - 1]);
  }
  if (inst.suffix) {
    const sdef = content.suffixes?.[inst.suffix.suffixId];
    if (sdef) {
      const S = suffixScaleIndex(inst.suffix.ilvl);
      const variance = suffixRollVariance(inst.suffix.roll);
      // Lineare Stats: k · S · variance.
      // Rundung nach Stat-Domäne (Stat-Squish ÷10, Spec §3.3): die GESQUISHTEN Flat-Stats
      // (maxHp/damage/def/eva/acc — k-Koeffizienten im Content sind ×0.1) runden auf 1 Dezimale
      // mit Min 0.1 — das ist EXAKT das alte `max(1, round(raw))` ÷10, also bit-identische
      // relative Suffix-Stärke (Integer-Min-1 hätte alle Rolls auf 1 kollabiert = 10×-Buff).
      // Mana ist unskaliert (§3.4): maxMana bleibt ganzzahlig (min 1), manaRegen 1 Dezimale.
      // hpRegenPerSec ist ×0.1 → 2 Dezimalen (altes 1-Dezimal-Raster ÷10).
      if (sdef.statsPerIlvl) {
        const scaled: EquipBonus = {};
        for (const key of Object.keys(sdef.statsPerIlvl) as (keyof EquipBonus)[]) {
          const raw = (sdef.statsPerIlvl[key] ?? 0) * S * variance;
          scaled[key] =
            key === "manaRegen"
              ? Math.round(raw * 10) / 10
              : key === "hpRegenPerSec"
                ? Math.round(raw * 100) / 100
                : key === "maxMana"
                  ? Math.max(1, Math.round(raw))
                  : Math.max(0.1, Math.round(raw * 10) / 10);
        }
        addBonus(scaled);
      }
      // Attribute: k · S · variance, GANZZAHLIG mit min 1 (Itemization 2.0 §1.2 — Attribute
      // sind wieder integer; die k-Werte im Content bleiben unverändert, gleiche Größenordnung).
      if (sdef.attrPerIlvl) {
        const scaledMods: Partial<Record<AttributeId, number>> = {};
        for (const id of ATTRIBUTE_IDS) {
          if (sdef.attrPerIlvl[id]) {
            scaledMods[id] = Math.max(1, Math.round((sdef.attrPerIlvl[id] ?? 0) * S * variance));
          }
        }
        addMods(scaledMods);
      }
      // Skill-Boosts (Itemization 2.0 §7, nur Schmuck-Pool): Boost-Stufe ganzzahlig, hart auf
      // 1..3 geclamped — Suffix-Rolls bleiben die kleine Schiene neben Item-/Set-Boosts (§4.4).
      if (sdef.boostPerIlvl) {
        for (const id of BOOSTABLE_COMBAT_SKILL_IDS) {
          const k = sdef.boostPerIlvl[id];
          if (k) {
            skillBoost[id] =
              (skillBoost[id] ?? 0) + Math.min(3, Math.max(1, Math.round(k * S * variance)));
          }
        }
      }
      // „Soft"-Stats (crit/speed): eigene gedeckelte Endpunkt-Skala (§3.3), NICHT 20× linear.
      if (sdef.softStats && sdef.softStats.length > 0) {
        const sSoft = S / SUFFIX_SCALE_MAX; // 0.05 … 1.0
        const soft: EquipBonus = {};
        for (const sk of sdef.softStats) {
          const ep = SUFFIX_SOFT_STATS[sk];
          if (!ep) continue;
          soft[sk] = ep.round((ep.low + (ep.high - ep.low) * sSoft) * variance);
        }
        addBonus(soft);
      }
    }
  }
  return { bonus, modifiers, skillBoost, trinity };
}

/**
 * Stückweise-linearer Scale-Index S(ilvl) (suffix-pool-spec §3.1): ein einziger glatter Index
 * (≈×1,3/Band, ~20× am Cap), der alle linearen Suffix-Stats treibt. Clamped auf [1, 20].
 */
const SUFFIX_SCALE_TABLE: ReadonlyArray<readonly [number, number]> = [
  [1, 1.0], [5, 1.4], [10, 2.0], [20, 3.0], [30, 4.2], [40, 5.6],
  [50, 7.2], [60, 9.0], [70, 11.0], [80, 13.5], [90, 16.5], [100, 20.0],
];
/** Maximaler Scale-Index (Cap am ilvl 100) — Bezug für die Soft-Stat-Skala (`S / SUFFIX_SCALE_MAX`). */
export const SUFFIX_SCALE_MAX = 20;

export function suffixScaleIndex(ilvl: number): number {
  const lv = Number.isFinite(ilvl) ? ilvl : 1;
  const first = SUFFIX_SCALE_TABLE[0]!;
  const last = SUFFIX_SCALE_TABLE[SUFFIX_SCALE_TABLE.length - 1]!;
  if (lv <= first[0]) return first[1];
  if (lv >= last[0]) return last[1];
  for (let i = 1; i < SUFFIX_SCALE_TABLE.length; i++) {
    const [x1, s1] = SUFFIX_SCALE_TABLE[i]!;
    if (lv <= x1) {
      const [x0, s0] = SUFFIX_SCALE_TABLE[i - 1]!;
      const t = (lv - x0) / (x1 - x0);
      return s0 + (s1 - s0) * t;
    }
  }
  return last[1];
}

/** ±15 %-Roll-Varianz aus dem Stärke-Roll (0..1) → Faktor 0.85 … 1.0 (suffix-pool-spec §3.2). */
function suffixRollVariance(roll: number): number {
  const r = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0;
  return 0.85 + 0.15 * r;
}

/**
 * Universelle Endpunkte der „soft" Stats (suffix-pool-spec §3.3). ilvl1 → `low`, ilvl100 → `high`,
 * dazwischen über `S / SUFFIX_SCALE_MAX`. `attackIntervalMs` ist negativ (schneller). content-dev
 * pflegt KEINE eigenen Soft-Werte — nur die `softStats`-Liste; die Magnitude lebt hier zentral.
 */
export const SUFFIX_SOFT_STATS: Record<
  SuffixSoftStatKey,
  { low: number; high: number; round: (v: number) => number }
> = {
  critChance: { low: 0.01, high: 0.05, round: (v) => Math.round(v * 1000) / 1000 },
  critDamage: { low: 0.05, high: 0.25, round: (v) => Math.round(v * 100) / 100 },
  // Attack-Speed-Suffix („of the Viper"/„of the Wolf"): spürbare, gedeckelte Beschleunigung. Die alten
  // Endpunkte (-15…-150) fielen bei niedrigem ilvl auf ~-20 ms und rundeten in der Sekunden-Anzeige auf
  // „-0.0s" (Chef #9: „wirkt nicht"). Neue Endpunkte liefern schon am Suffix-Mindest-ilvl (10) ≈ -80 ms
  // (echte „-0.1s") und skalieren bis ~-250 ms am Cap — real fühlbar, aber von den attackInterval-Floors
  // (800/1000 ms) gedeckelt, also nicht ausbrechend.
  attackIntervalMs: { low: -60, high: -250, round: (v) => Math.round(v / 5) * 5 },
};

/**
 * GESAMTE Waffeneffektliste eines (ausgerüsteten) Mainhand-Items inkl. Affix-Effekte.
 * Andockpunkt für combat-dev (Welle 2): in resolveAttack() statt/zusätzlich zu
 * `effectiveWeaponEffects(base)` aufrufen. Defensiv: ohne Instanz/Affix-Content == base-Effekte.
 */
export function effectiveInstanceWeaponEffects(
  inst: ItemInstance | null | undefined,
  base: ItemDef | null | undefined,
  content: ContentDB,
): WeaponEffect[] {
  const out: WeaponEffect[] = [];
  const seen = new Set<string>();
  const push = (e: WeaponEffect | undefined | null): void => {
    if (!e) return;
    const key = `${e.type}|${e.chance}|${e.magnitude}|${e.durationMs}|${e.threshold ?? ""}|${e.stacks ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(e);
  };
  for (const e of effectiveWeaponEffects(base)) push(e);
  if (inst && content.affixes) {
    for (const a of inst.affixes) {
      push(content.affixes[a.affixId]?.weaponEffectByTier?.[a.tier - 1]);
    }
  }
  return out;
}

/**
 * Abgeleiteter Anzeigename einer Instanz: Präfix (höchstwertiger Affix) + Basisname + Suffixphrase.
 * „Feuriges Kupferschwert (des Tigers)". i18n über `Locale`; plain Items → unverändert `ItemDef.name`.
 */
export function instanceDisplayName(
  inst: ItemInstance,
  content: ContentDB,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const base = content.items[inst.baseItemId];
  let name = base ? resolveText(base.name, locale) : inst.baseItemId;
  if (inst.affixes.length > 0 && content.affixes) {
    // Höchstwertiger Affix liefert das Präfix (Rest nur im Tooltip), damit Namen kurz bleiben.
    const best = [...inst.affixes].sort((a, b) => b.tier - a.tier)[0]!;
    const def = content.affixes[best.affixId];
    if (def) name = `${resolveText(def.prefix, locale)} ${name}`;
  }
  if (inst.suffix && content.suffixes) {
    const sdef = content.suffixes[inst.suffix.suffixId];
    if (sdef) name = `${name} ${resolveText(sdef.suffix, locale)}`;
  }
  return name;
}

/**
 * Effektive Rarity einer Instanz. Phase 1: == Basis-Rarity (Affix/Suffix heben sie nicht an).
 * Eigener Helfer, damit UI/Enchant denselben Wert nutzen (enchantSlotsFor liest darauf auf).
 */
export function instanceRarity(inst: ItemInstance, content: ContentDB): ItemRarity {
  const base = content.items[inst.baseItemId];
  return base ? getItemRarity(base) : "common";
}

/**
 * Referenz auf ein konkretes Item für die Enchant-/Salvage-/Vault-API (UI konstruiert sie).
 * Deckt einen PLAIN Inventar-Slot (zum Promoten zur Instanz), eine Instanz der Inventar-Tasche
 * (`InventoryState.instances`, seit v53), einen Ausrüstungs-Slot und eine Gear-Vault-Instanz ab.
 */
export type ItemRef =
  | { kind: "inventory"; index: number }
  | { kind: "inventory_instance"; instanceId: InstanceId }
  | { kind: "equipment"; slot: EquipSlot }
  | { kind: "vault"; instanceId: InstanceId };

/** Ein Gegner. Eine einzige `defense` (kein Kampf-Dreieck → reiner Stat-Check). */
/**
 * Defense-Typ eines Gegners für die spätere Konter-Achse (Rüstungs-Trinität, Spec §6.2):
 * `armor` (default, gekontert von Armor-Pen), `evasion` (flinke Bestien, gekontert von Precision),
 * `ward` (Untote/Dämonen-Caster, gekontert von Mana-Break). Jetzt NUR Tagging (rein additiv,
 * ungetaggt = `armor`); die Konter-WIRKUNG ist Waffen-Spec-Scope.
 */
export type MonsterDefenseType = "armor" | "evasion" | "ward";
export const MONSTER_DEFENSE_TYPES: readonly MonsterDefenseType[] = ["armor", "evasion", "ward"];

export interface MonsterDef {
  id: MonsterId;
  name: LocalizedString;
  level: number;
  maxHp: number;
  damage: number;
  accuracy: number;
  evasion: number;
  /** Armor-Mitigation (unverändert: `def/(def+DEFENSE_MITIGATION_K)`, auf DEFENSE_MITIGATION_MAX gedeckelt). */
  defense: number;
  /**
   * Defense-Typ für die Konter-Achse (Rüstungs-Trinität Spec §6.2). Optional & rein additiv —
   * ungetaggt = `"armor"`. Jetzt nur Daten/Tagging (content-dev setzt es); die Konter-Wirkung folgt.
   */
  defenseType?: MonsterDefenseType;
  /**
   * Combat-Depth #223 (Spec §3.1/§3.4): Ward-Absorptionspool eines Caster-Gegners (`defenseType==="ward"`).
   * Transienter per-Encounter-Schild VOR den HP — combat.ts (Phase B) initialisiert seinen `enemyWard`
   * bei Encounter-Start auf diesen Wert (kein Regen), Ward-Break umgeht ihn anteilig. Content generiert
   * ihn als `round(ENEMY_WARD_HP_FRACTION · maxHp)` (~+30 % effektive HP). Optional & additiv (fehlt ⇒
   * kein Ward, kein Bruch für Alt-Content). Reines Content-Shape — nie persistiert (kein SAVE-Belang).
   */
  wardCapacity?: number;
  attackIntervalMs: number;
  /** Kampf-XP beim Besiegen. */
  xp: number;
  /** Gold beim Besiegen (mit kleiner Streuung). */
  gold: number;
  loot: LootRoll[];
  /** Statuseffekte, gegen die dieser Gegner immun ist (Magie-Waffeneffekte greifen nicht). */
  resist?: StatusType[];
  /** Statuseffekt, den dieser Gegner bei einem Treffer auf den Spieler auslösen kann. */
  inflict?: { type: StatusType; chance: number; magnitude: number; durationMs: number };
  /** Selbstheilung in HP/Sekunde, solange der Gegner lebt (macht den Kampf zum DPS-Check). */
  regen?: number;
  /** Wut: unterhalb `belowHpPct` (0..1) seiner HP schlägt der Gegner mit `damageMult`-fachem Schaden. */
  enrage?: { belowHpPct: number; damageMult: number };
  /**
   * Kreaturen-Familie (Bane-System #213): Ziel-Taxonomie für `bane`-Waffeneffekte
   * (`weaponEffect.targetFamily`). Optional & rein additiv — ungetaggte Monster gehören
   * keiner Familie an und matchen NIE (kein Bruch für Alt-Content). Reines Content-Shape,
   * wird nie persistiert (kein SAVE_VERSION-Belang).
   */
  family?: MonsterFamily;
  /** Zugehörige Zone (für Bestiarium/Auswahl-Gruppierung). Verweist auf ZoneDef.id. */
  zone?: string;
  /**
   * Slayer-Tower-Etage (1..5), falls dieses Monster zum Slayer-Tower gehört. Sonst undefined.
   * Content setzt es analog zur passenden `SlayerTowerFloor.floor`. Reine Daten/Tagging.
   */
  slayerFloor?: number;
  /**
   * Pflicht-Item zum Bekämpfen (OSRS-Nasenklammer-Analog). Gesetzt → der Spieler muss die
   * Anforderung erfüllen (Item ausgerüstet/im Inventar/in der Bank ODER ausgerüsteter Slayer-Helm),
   * sonst greift der Hard-Block (`canFightMonster` = false). undefined = keine Anforderung.
   */
  slayerRequirement?: ItemId;
  /**
   * Nur-Dungeon-Monster (Dungeon-Rework-Spec §5.1.2/§5.3): `true` ⇒ existiert ausschließlich als
   * Dungeon-Welle — `startCombat` verweigert den Direktstart (combat.ts); der Slayer-WELT-Task-Pool
   * (slayer.ts, logic-dev-Welle) und die Monster-/Zonen-Auswahl der UI (ui-dev-Welle) filtern es aus.
   * Dungeon-Wellen (`startDungeon`/Wellen-Spawn in onEnemyDefeated) bleiben unberührt. Optional &
   * rein additiv — fehlend/false = heutiges Verhalten. Reines Content-Shape, nie persistiert
   * (kein SAVE_VERSION-Belang).
   */
  dungeonOnly?: boolean;
}

/**
 * ID-Präfix der Dungeon-Wellen-Zwillinge (`dg_skeleton_warrior` & Co., Dungeon-Rework-Spec
 * §5.1.4). Autorität für die KREDIT-Auflösung bleibt `killCreditMonsterId` (engine/combat.ts):
 * Kills einer dg_-Variante zählen auf die BASIS-ID (Präfix-Strip), sofern die Basis existiert.
 * Diese Konstante existiert für alle Stellen AUSSERHALB von combat.ts, die dg_-Varianten als
 * „Geister-IDs" erkennen müssen (Task #347: Slayer-Welt-Task-Pool-Filter in slayer.ts + die
 * Load-Normalisierung kaputter Bestands-Tasks in persistence) — ein Task/Vertrag auf eine
 * dg_-ID wäre mathematisch unerfüllbar, weil sein Zähler nie einen Kill-Credit sieht.
 * Muss mit dem privaten `DUNGEON_VARIANT_PREFIX` in combat.ts übereinstimmen ("dg_" ist eine
 * Spec-Konvention, kein Tuning-Wert).
 */
export const DUNGEON_VARIANT_PREFIX = "dg_";

/** Eine Kampf-Zone (Region) — gruppiert Gegner im Bestiarium und in der Auswahl. */
export interface ZoneDef {
  id: string;
  name: LocalizedString;
  /**
   * Story-Gate (Aschechronik, ceo-run-2026-07-13): Quest-ID — die Zone ist gesperrt, bis diese
   * Quest abgeschlossen ist (Objectives erfüllt: `quests.completed` ODER `quests.claimed`) ODER
   * der Spielstand einen Bestandsschutz-Grant trägt (`GameState.legacyZoneGrants[zoneId]`,
   * v63-Migration). Gate-Logik zentral in engine/zones.ts `isZoneUnlocked`; durchgesetzt am
   * Kampf-Start (`canFightMonster`, engine/slayer.ts → combat.ts startCombat) + Welt-Task-Pool.
   * OPTIONAL & rein additiv: fehlend = kein Gate = heutiges Verhalten (Mechanik neutral, solange
   * kein Content das Feld setzt — Welle D2 trägt die Gates ein). Reines Content-Shape, nie
   * persistiert (kein SAVE_VERSION-Belang; der Save-Anteil ist NUR legacyZoneGrants).
   */
  requiresQuest?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Elite-/World-Spawns („Champions des Reach", design/elite-spawns-concept.md) — Phase 1: Datenmodell
// + Engine-Fundament (logic-dev), VERHALTENS-NEUTRAL solange `ContentDB.elites` leer ist. Content
// (2–3 Varianten je Zone) kommt in Phase 2 (content-dev), Toast/Badge/Countdown-UI in Phase 3
// (ui-dev). Owner der Zyklus-/Kill-Logik: engine/elites.ts.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Verfügbarkeitsfenster eines gespawnten Elites — FEST 15 Min in JEDER Zone (balance-spec §3
 * „Fenster: 15 min in allen Zonen"), endet früher nur bei Kill. Keine Varianz mehr (Chef-Nachtrag
 * 2026-07-22 zum ursprünglichen „~15 Min ± Varianz"-Vorschlag) — `tickEliteSpawns` würfelt dafür
 * KEINEN eliteRng-Zug (ein Spawn kostet dadurch nur noch den Varianten-Wurf).
 */
export const ELITE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Ruhe-Cooldown-Band einer Zone (Minuten → ms) + Initial-Offset-Minuten für die früh-haken-artige
 * ERST-Initialisierung frischer Saves (`initEliteZonesEarlyHook`, engine/elites.ts). Werte 1:1 aus
 * `design/elite-balance-spec.md` §3 (balance-designer, 2026-07-22) — Cooldown-Bänder steigen mit der
 * Zonen-Stärke (55–75 Min Pastures bis 100–120 Min Idol Hall), der Offset (0/8/16/…/72 Min, +8 je
 * Zone in derselben Reihenfolge) entzerrt die ERSTEN Spawns über ~15–100 Min statt sie auf einen
 * vollen Cooldown-Roll zu setzen (Konzept §1.4 „Früh-Haken", Chef-GO 2026-07-22: die Pastures-Zone
 * bekommt dadurch garantiert ihr erstes Fenster nach ~15–25 Min aktiver Spielzeit — der Refund-
 * Fenster-Moment). Key = `ZoneDef.id`.
 */
export interface EliteZoneCooldownBand {
  minMs: number;
  maxMs: number;
  /** Minuten-Offset für die Früh-Haken-Formel `15 + offsetMinutes + eliteRng·10` (nur createGame). */
  offsetMinutes: number;
}

/** balance-spec §3 — Reihenfolge = Zonen-Stärke (auch die Offset-Progression 0,8,16,…,72). */
export const ELITE_ZONE_COOLDOWN_BANDS: Readonly<Record<string, EliteZoneCooldownBand>> = {
  pastures: { minMs: 55 * 60_000, maxMs: 75 * 60_000, offsetMinutes: 0 },
  borderlands: { minMs: 60 * 60_000, maxMs: 85 * 60_000, offsetMinutes: 8 },
  ashfields: { minMs: 65 * 60_000, maxMs: 90 * 60_000, offsetMinutes: 16 },
  blackthorn: { minMs: 70 * 60_000, maxMs: 95 * 60_000, offsetMinutes: 24 },
  crypt: { minMs: 75 * 60_000, maxMs: 100 * 60_000, offsetMinutes: 32 },
  wildwood: { minMs: 80 * 60_000, maxMs: 105 * 60_000, offsetMinutes: 40 },
  coast: { minMs: 85 * 60_000, maxMs: 110 * 60_000, offsetMinutes: 48 },
  slagpit: { minMs: 90 * 60_000, maxMs: 115 * 60_000, offsetMinutes: 56 },
  highlands: { minMs: 95 * 60_000, maxMs: 120 * 60_000, offsetMinutes: 64 },
  idolhall: { minMs: 100 * 60_000, maxMs: 120 * 60_000, offsetMinutes: 72 },
};

/**
 * Fallback-Band für Zonen OHNE Eintrag in `ELITE_ZONE_COOLDOWN_BANDS` (Content-Drift-Leitplanke —
 * z. B. `slayer_tower`, das kein "Kampf-Zone"-Ziel der Elite-Rotation ist, oder eine künftig neue
 * Zone vor dem nächsten balance-spec-Update). Mittelwert-Band; die Zyklus-Mechanik bleibt für solche
 * Zonen definiert (nie NaN/undefined), auch wenn realistisch nie eine Variante für sie existiert.
 */
export const ELITE_DEFAULT_COOLDOWN_BAND: EliteZoneCooldownBand = {
  minMs: 75 * 60_000,
  maxMs: 105 * 60_000,
  offsetMinutes: 40,
};

/** Das Cooldown-Band einer Zone — bekannte Zone-ID oder `ELITE_DEFAULT_COOLDOWN_BAND`. */
export function eliteZoneCooldownBand(zoneId: string): EliteZoneCooldownBand {
  return ELITE_ZONE_COOLDOWN_BANDS[zoneId] ?? ELITE_DEFAULT_COOLDOWN_BAND;
}

/**
 * Default-Drop-Chance des Elite-Uniques, wenn `EliteVariantDef.uniqueDropChance` fehlt (Chef-
 * Korrektur 2026-07-22: „Der Elite-Unique ist KEIN Garantie-Drop mehr"). Sitzt hier (statt eines
 * Inline-Literals) als EINE benannte Quelle der Wahrheit, s. `onEliteKilled` (engine/elites.ts).
 */
export const ELITE_UNIQUE_DROP_CHANCE_DEFAULT = 0.2;

/**
 * „Jagd-Paket" S1 (design/elite-spawns-concept.md, Chef-GO 2026-07-22): Segen-Synergie mit den
 * Tages-Segen (blessing.ts). An einem bloodmoon-Tag (`blessingForTime(nowMs).id === "bloodmoon"`)
 * steigt die effektive `uniqueDropChance` eines erlegten Elites um DIESEN absoluten Betrag (0,2→0,25
 * bei der Default-Chance, s. `ELITE_UNIQUE_DROP_CHANCE_DEFAULT`). WICHTIG (Sequenz-Stabilitäts-
 * Disziplin, s. `onEliteKilled`-Doku engine/elites.ts): der Drop-Chance-WURF selbst feuert davon
 * UNABHÄNGIG weiter IMMER — nur der VERGLEICHSWERT ändert sich, die eliteRng-Sequenz bleibt an
 * jedem Wochentag gleich lang.
 */
export const ELITE_BLOODMOON_UNIQUE_BONUS = 0.05;

/**
 * „Jagd-Paket" S2 (design/elite-spawns-concept.md, Chef-GO 2026-07-22): an einem wildhunt-Tag
 * (`blessingForTime(nowMs).id === "wildhunt"`) ticken die Zonen-RUHE-Cooldowns (`tickEliteSpawns`,
 * engine/elites.ts) `ELITE_WILDHUNT_COOLDOWN_SPEED_MULT`× schneller herunter — ein reiner
 * Multiplikator auf den `TICK_MS`-Dekrement (KEIN RNG-Zug, wirkt NICHT auf das aktive
 * `ELITE_WINDOW_MS`-Fenster eines bereits gespawnten Elites). Ohne `nowMs` (Alt-Aufrufer/Tests) ⇒
 * Faktor 1, bit-identisch zum Vorher-Zustand.
 */
export const ELITE_WILDHUNT_COOLDOWN_SPEED_MULT = 1.25;

/**
 * „Jagd-Paket" S3 (design/elite-spawns-concept.md, Chef-GO 2026-07-22): Kopfgeld in Quest-Tokens,
 * das JEDER Elite-Kill zusätzlich zur regulären Belohnung zahlt (`character.questTokens`,
 * `onEliteKilled` engine/elites.ts) — bewusst KONSERVATIV: Chronik-Quests zahlen 2–3 Tokens pro
 * Abschluss, Champions kommen ~1×/Stunde/Zone (bei 10 Zonen deutlich häufiger insgesamt) — ein
 * höherer Wert würde den Token-Shop gegenüber der Quest-Progression entwerten.
 */
export const ELITE_BOUNTY_TOKENS = 1;

/**
 * Harter Sanitize-Clamp (Save-Edit-/Korruptionsschutz, persistence sanitizeState): deckt JEDES
 * Zonen-Band ab (das höchste reale Max ist 120 Min, Idol Hall/Highlands) — sanitize braucht keine
 * zonen-PRÄZISE Klemme (nur Crash-/NaN-Schutz), daher EIN blunter Wert statt eines Band-Lookups.
 */
export const ELITE_COOLDOWN_HARD_CAP_MS = 120 * 60_000;

/**
 * Elite-/World-Spawn-Variante: eine benannte, skalierte Zonen-Monster-Variante — synthetisch zur
 * Laufzeit aus `baseMonsterId × statMults` gebaut (Muster `paragonScaledMonster`, s.
 * engine/elites.ts `eliteScaledMonster`). Content-Aufwand pro Elite ≈ eine Tabellenzeile
 * (Konzept §1.1). `id` ist der Registry-Key in `ContentDB.elites`.
 */
export interface EliteVariantDef {
  id: string;
  /** Kampf-Zone (`ZoneDef.id`), in der diese Variante spawnen kann. */
  zone: string;
  /** Zonen-Basis-Monster, das skaliert wird (`ContentDB.monsters[baseMonsterId]`). */
  baseMonsterId: MonsterId;
  name: LocalizedString;
  /**
   * Stat-Multiplikatoren auf den Basis-Mob (Konzept §6 „Elite-Stärke-Ziel"-Vorschlag: ~4–6× HP,
   * ~1,5× Schaden — Feintuning durch balance-designer in Phase 2). `accuracy`/`defense`/`evasion`/
   * `wardCapacity` optional, fehlend = Basis-Wert unverändert (Muster `xpMult`/`goldMult`).
   * `wardCapacity` ist NUR bei Ward-Casern (Basis-Mob trägt `wardCapacity`) wirksam — ohne
   * Basis-Ward ist der Multiplikator ein No-op (nichts zu skalieren). Phase-1.5-Nachtrag
   * (Chef-Auftrag 2026-07-22, aus dem content-dev-Phase-2-Bericht „Contract-Lücke"): balance-spec
   * §0 „bei Caster-Basen skaliert der HP-Multiplikator maxHp UND wardCapacity gemeinsam" — für
   * ALLE 10 Caster-Elite-Varianten der Spec ist `wardCapacity` daher identisch zu `hp` gesetzt
   * (verifiziert exakt gegen die Spec-Zieltabelle §1, z. B. the_imp ward 8×5,0=40 ✓).
   */
  statMults: { hp: number; damage: number; accuracy?: number; defense?: number; evasion?: number; wardCapacity?: number };
  /**
   * Überschreibt, WENN der Basis-Mob ein `enrage` trägt, dessen `damageMult` (der Rest des enrage-
   * Objekts — `belowHpPct` — bleibt Identität, vererbt vom Basis-Mob). Ohne dieses Feld bleibt der
   * Basis-`damageMult` unverändert. Chef-Nachtrag (2026-07-22, „Spike-Kill-Schutz",
   * design/elite-balance-spec.md §7 P4): bei vererbtem Boss-`enrage` (z. B. highland_wyvern
   * 1,6×) UND zusätzlicher Elite-Schadensskalierung (`statMults.damage`) würde der enraged Hit sonst
   * zum Insta-Kill-Spike — dieses Feld senkt NUR den Enrage-Multiplikator selbst (z. B. auf 1,35),
   * unabhängig von `statMults.damage`. Wirkungslos, wenn der Basis-Mob KEIN `enrage` trägt.
   */
  enrageDamageMultOverride?: number;
  /**
   * Multiplikator auf die Selbstheilung des Basis-Mobs (`MonsterDef.regen`, HP/Sekunde). Fehlt ⇒
   * Basis-Wert unverändert. Wirkungslos ohne Basis-`regen` (nichts zu skalieren). Phase-1.5-
   * Nachtrag (Chef-Auftrag 2026-07-22, elite-balance-spec.md §1: „Zäh"/„Chor"-Varianten — black_golem/
   * coast_siren/slag_revenant verdoppeln ihre Selbstheilung, `regenMult: 2`).
   */
  regenMult?: number;
  /**
   * Ersetzt (oder ergänzt NEU, falls der Basis-Mob keinen trägt) den kompletten `inflict`-Status
   * des Basis-Mobs — komplettes `MonsterDef.inflict`-Shape, kein Teil-Override. Fehlt ⇒ Basis-
   * `inflict` unverändert vererbt (auch „gar keiner", falls die Basis keinen trägt). Phase-1.5-
   * Nachtrag (Chef-Auftrag 2026-07-22, elite-balance-spec.md §1): 7 Varianten setzen dies — 6 heben
   * die Magnitude eines vererbten Status an (z. B. `border_warlock` Brand 1→2), `pastures_imp`
   * bekommt NEU einen Brand-Proc, den die Basis (`the_imp`) gar nicht trägt.
   */
  inflictOverride?: { type: StatusType; chance: number; magnitude: number; durationMs: number };
  /** Multiplikator auf die Kampf-XP des Basis-Mobs. Fehlt ⇒ 1 (unverändert). */
  xpMult?: number;
  /** Multiplikator auf das Gold des Basis-Mobs. Fehlt ⇒ 1 (unverändert). */
  goldMult?: number;
  /**
   * Thematischer Chase-Drop (Konzept §3.1/§3.2): fällt beim Kill mit `uniqueDropChance` als
   * `ItemInstance` (WoW-Stil „jeder Drop ist anders gerollt") — s. `onEliteKilled`. KEIN
   * Garantie-Drop mehr (Chef-Korrektur 2026-07-22 zum ursprünglichen Konzept-Entwurf).
   */
  uniqueItemId: ItemId;
  /**
   * Drop-CHANCE (0..1) des Uniques selbst. Fehlt ⇒ `ELITE_UNIQUE_DROP_CHANCE_DEFAULT` (0,2). Wird
   * über `state.eliteRng` gewürfelt — der Wurf feuert IMMER (auch bei 0/1), NIE chance-bedingt
   * übersprungen (Sequenz-Stabilitäts-Disziplin, s. `onEliteKilled`-Doku: die eliteRng-Sequenz darf
   * nicht vom konkreten Chance-WERT abhängen, sonst divergiert sie zwischen Content-Feintuning-
   * Ständen). Fällt der Drop nicht, gibt es nur das restliche Loot-Paket (`extraLoot`).
   */
  uniqueDropChance?: number;
  /**
   * Suffix-Roll-Chance (0..1), NACHDEM der Unique oben tatsächlich gefallen ist. Fehlt ⇒ 1
   * (garantiert — sofern das Item Equipment ist UND `ContentDB.suffixes` einen passenden Pool
   * trägt; sonst bleibt es ein suffixloses Unique). Bei einem NICHT gefallenen Unique wirkungslos
   * (kein Suffix-Wurf, s. `onEliteKilled`).
   */
  uniqueSuffixChance?: number;
  /**
   * Zusätzliche Loot-Rolls (Konzept §3.3: ↑ Chance auf reguläre Zonen-Chase-Items, Bonus-Gold-Mats,
   * …) — laufen über den normalen Loot-Roll-Pfad, aber vollständig über `state.eliteRng`.
   */
  extraLoot?: LootRoll[];
}

/**
 * Pro-Zone-Elite-Zyklus-Zustand (engine/elites.ts `tickEliteSpawns`): GENAU einer von zwei
 * Zuständen — „Ruhe" (Cooldown bis zum nächsten möglichen Spawn) oder „Aktiv" (ein gespawnter Elite
 * mit Verfügbarkeitsfenster). Key von `GameState.eliteZones` = `ZoneDef.id`.
 */
export type EliteZoneState = { cooldownMs: number } | { variantId: string; remainingMs: number };

/**
 * Champion-Codex-Zähler EINER Elite-Variante (§Champion-Codex, „Jagd-Paket" S2/M, Chef-GO
 * 2026-07-22) — je `EliteVariantDef.id` Lebenszeit-Statistik: `sightings` (jeder Spawn dieser
 * Variante, `spawnElite`), `kills`/`uniques` (jeder Elite-Kill bzw. gefallene Unique-Drop dieser
 * Variante, `onEliteKilled`), `fastestKillMs` (kürzeste je gemessene Kampfdauer, `null` = noch nie
 * gemessen — s. `CombatState.eliteFightStartMs` für die Messgrundlage). Alle Werte NIE gesenkt
 * außer `fastestKillMs`, der bei jedem neuen Rekord SINKT (Minimum, kein Lebenszeit-Zähler).
 */
export interface EliteCodexEntry {
  sightings: number;
  kills: number;
  uniques: number;
  fastestKillMs: number | null;
}

/** Frischer, leerer Codex-Eintrag (Default für eine bislang unbekannte Variante). */
export function emptyEliteCodexEntry(): EliteCodexEntry {
  return { sightings: 0, kills: 0, uniques: 0, fastestKillMs: null };
}

/**
 * Elite-Sieg-Breadcrumb (`GameState.lastEliteKill`, SAVE_VERSION 74, Task #324) — der Beute-Vertrag
 * für die kommende UI-Sieg-Zeremonie („Fanfare + Loot-Übersicht" statt Instant-Rückkehr zur
 * Zonen-Übersicht; die Zeremonie selbst ist eine separate ui-dev-Welle). Geschrieben von
 * `onEliteKilled` (engine/elites.ts) bei JEDEM erfolgreichen Elite-Kill — reine AUFZEICHNUNG der
 * dort BEREITS gewürfelten Ergebnisse (kein eigener RNG-Zug, Determinismus-Gesetz); ein offline zu
 * Ende gekämpfter Elite-Kampf schreibt identisch (letzter Kill gewinnt).
 *
 * UI-Lese-Vertrag (Muster `lastEliteSpawn`/`eliteSpawnSeq`): neue Kills erkennt die UI über den
 * PRIMITIV-Selector `state.eliteKillSeq` (monoton steigend; `seq` hier = `eliteKillSeq` zum
 * Kill-Zeitpunkt) — steigt er, liegt in `lastEliteKill` die frische Beute-Übersicht. Quittieren
 * durch Zurücksetzen von `lastEliteKill` auf null ist erlaubt (der Zähler bleibt stehen, sanitize
 * hält `eliteKillSeq ≥ seq` monoton). Inhalt: NUR die elite-EIGENEN Belohnungen — `drops` ist das
 * Material-Bundle (EXAKT die vergebenen `extraLoot`-Items/-Mengen, inkl. einer evtl. daraus
 * entstandenen Suffix-Instanz in der Menge), `uniqueItemId`/`suffixRolled` das Unique (falls
 * gefallen; `suffixRolled` = die Unique-Instanz trägt einen Suffix), `bountyTokens` das Kopfgeld.
 * Die BASIS-Zonen-Loot-Tabelle/XP/Gold des skalierten Monsters fließen über den normalen Kill-Pfad
 * (combat.ts) und stehen bewusst NICHT hier. `atMs` ist SPIELZEIT (`elapsedMs` zum Kill-Zeitpunkt,
 * NIE Wanduhrzeit — Determinismus).
 */
export interface EliteKillSummary {
  variantId: string;
  /** Spielzeit-Stempel (`state.elapsedMs` beim Kill) — NIE Date.now()/Wanduhrzeit. */
  atMs: number;
  /** Material-Bundle: exakt die tatsächlich vergebenen extraLoot-Drops (nur Zeilen mit Menge > 0). */
  drops: Array<{ itemId: ItemId; qty: number }>;
  /** Das gefallene Unique-Item — null, wenn der Drop-Chance-Wurf nicht fiel. */
  uniqueItemId: ItemId | null;
  /** true, wenn die gefallene Unique-Instanz einen Suffix trägt (immer false ohne Unique). */
  suffixRolled: boolean;
  /** Gezahltes Kopfgeld dieses Kills (`ELITE_BOUNTY_TOKENS` zum Kill-Zeitpunkt). */
  bountyTokens: number;
  /** = `eliteKillSeq` zum Kill-Zeitpunkt (Muster `lastEliteSpawn.seq`). */
  seq: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Slayer-System (Monsterjäger) — Content-Definitionen + Laufzeit-Task
// ───────────────────────────────────────────────────────────────────────────

export type SlayerMasterId = string;

/** XP-Faktor: Slayer-XP eines Tasks = round(monster.xp * FACTOR * N). Koppelt XP an Mob-Stärke × Menge. */
export const SLAYER_XP_KILL_FACTOR = 0.5;

/** Globale Default-Chance, dass ein Auftrag ein Slayer-Tower-Task wird (Chef-Vorgabe: 50 %). */
export const DEFAULT_TOWER_TASK_CHANCE = 0.5;

/**
 * Slayer-Tower-Etagen-Schwellen (Referenz/Validierung): Etage 1..5 wird ab Slayer-Level
 * 1/20/40/60/80 freigeschaltet. Die Engine liest die echten Schwellen aus
 * `SlayerTowerFloor.slayerLevelRequired` — diese Konstante ist nur Referenz/Guard.
 */
export const SLAYER_TOWER_FLOOR_THRESHOLDS = [1, 20, 40, 60, 80] as const;

/**
 * [Sweep6 W2-T4-P2-2] Früh-Slayer-Gnade: unter DIESEM Slayer-Level ist das Überspringen eines
 * Tasks KOSTENLOS (skipCost 0). Hintergrund: Punkte gibt es nur aus Abschlüssen (5/Task), Skip
 * kostet 20 — ein frischer Spieler mit unschaffbarem Task saß in einer unbezahlbaren Sackgasse
 * (Seed 66: 17,3 h an Tasks „geparkt"). Ab diesem Level gilt der normale `master.skipCost`.
 * Bewusst OHNE neues State-Feld (kein SAVE_VERSION-Belang) — die kleinste saubere Lösung.
 */
export const SLAYER_SKIP_FREE_BELOW_LEVEL = 10;

/**
 * Slayer-Task-Streak (SAVE_VERSION 66, Welle GG/slayer-vesna V2): jeder abgeschlossene Task
 * erhöht `slayerStreak` um 1; ein BEZAHLTER Skip (effectiveSkipCost > 0) bricht die Serie auf 0 —
 * die Gratis-Gnade unter SLAYER_SKIP_FREE_BELOW_LEVEL bricht NICHT (Früh-Slayer soll die Gnade
 * nutzen dürfen, ohne seine Serie zu opfern). Jeder TOKEN_INTERVAL-te Task zahlt
 * `SLAYER_STREAK_TOKEN_BONUS` Quest-Tokens; jeder POINT_INTERVAL-te zusätzlich Bonus-Slayer-Punkte
 * in Höhe von ~1 Task-Äquivalent (= pointReward des gerade abgeschlossenen Tasks).
 */
export const SLAYER_STREAK_TOKEN_INTERVAL = 5;
/** Quest-Tokens je Streak-Token-Schritt (jeder 5. Task). */
export const SLAYER_STREAK_TOKEN_BONUS = 2;
/** Jeder 10. Task: zusätzlich Bonus-Slayer-Punkte (~1 Task-Äquivalent, s. o.). */
export const SLAYER_STREAK_POINT_INTERVAL = 10;

/**
 * Endgame-Pool-Streckung (Welle GG/slayer-vesna V3): fallen weniger als SO VIELE Kandidaten in
 * das Task-Auswahl-Fenster, wird das Fenster gestreckt (Welt: untere Kante zuerst runter, dann
 * obere hoch; Turm: obere Kante hoch), bis ≥ `SLAYER_MIN_TASK_POOL` Kandidaten hineinfallen oder
 * der Gesamt-Pool erschöpft ist — hohe Slayer-/Kampflevel bekommen so wieder Task-Vielfalt statt
 * immer derselben 1–3 Monster. Implementierung: `stretchLevelWindow` (engine/slayer.ts).
 */
export const SLAYER_MIN_TASK_POOL = 4;

/**
 * Ein Slayer-Master (OSRS-artiger Auftraggeber). Reine Content-Daten.
 * Freischaltung erfordert BEIDES: Kampf-Niveau (`combatLevel`) UND Slayer-Level.
 */
export interface SlayerMasterDef {
  id: SlayerMasterId;
  name: LocalizedString;
  description?: LocalizedString;
  /** Freischalt-Bedingung. BEIDE Schwellen müssen erfüllt sein. */
  unlock: { combatLevel: number; slayerLevel: number };
  /**
   * Pool an WELT-Monstern (normale `MonsterId`s), die dieser Master als „normalen" Task vergeben darf.
   * Tower-Tasks ziehen NICHT hieraus, sondern aus den freigeschalteten Tower-Etagen.
   */
  taskPool: MonsterId[];
  /** Chance (0..1), dass ein Auftrag stattdessen ein Slayer-Tower-Task wird (Chef-Vorgabe global 0.5). */
  towerTaskChance: number;
  /** Spanne der zu tötenden Anzahl N (inkl.). Höhere Master → größere Spanne. */
  taskAmount: { min: number; max: number };
  /** Slayer-Punkte bei Abschluss. */
  basePoints: number;
  /** Punkte-Kosten, um einen Task dieses Masters zu überspringen (skip). */
  skipCost: number;
}

/** Eine Slayer-Tower-Etage. Slayer-Level-gated; bündelt ihre Monster. Reine Content-Daten. */
export interface SlayerTowerFloor {
  /** 1..5 (Etagen-Index, aufsteigend). */
  floor: number;
  name: LocalizedString;
  /** Mindest-SLAYER-Level zum Betreten/als Task zu bekommen (1/20/40/60/80). */
  slayerLevelRequired: number;
  /** Monster dieser Etage (MonsterId → MonsterDef in content.monsters, Zone "slayer_tower"). */
  monsters: MonsterId[];
}

/**
 * Ein Eintrag im Slayer-Punkte-Shop: ein Item, das gegen Slayer-Punkte (aus abgeschlossenen Tasks)
 * eingetauscht wird. Reine Content-Daten — content-dev füllt den Katalog später. Die Engine
 * behandelt ein fehlendes `slayerShop` defensiv als „leerer Shop".
 */
export interface SlayerShopEntry {
  /** Gekauftes Item (ItemId → ItemDef in content.items). */
  itemId: ItemId;
  /** Kosten in Slayer-Punkten pro Kauf. */
  cost: number;
  /** Wie oft kaufbar (z.B. einmalige Freischaltungen). undefined = unbegrenzt. */
  maxPurchases?: number;
  /** Optionales Mindest-Slayer-Level, um den Eintrag freizuschalten. */
  slayerLevelRequired?: number;
}

/**
 * Aktiver Slayer-Auftrag (lebt im GameState). null = aktuell kein Task.
 * Belohnung (`xpReward`/`pointReward`) wird beim Assign deterministisch fixiert.
 */
export interface SlayerTask {
  masterId: SlayerMasterId;
  /** Ziel-Monster (eine konkrete MonsterId). */
  monsterId: MonsterId;
  /** true = Tower-Mob, false = normaler Welt-Mob. */
  isTower: boolean;
  /** Benötigte Kills. */
  required: number;
  /** Bereits erzielte Kills (0..required). */
  progress: number;
  /** Beim Assign fixierte Slayer-Skill-XP bei Abschluss. */
  xpReward: number;
  /** Beim Assign fixierte Slayer-Punkte bei Abschluss. */
  pointReward: number;
}

/** Dramaturgie-Rolle einer Dungeon-Welle (Dungeon-Rework-Spec §5.1.2/§5.4). Rein UI-facing. */
export type DungeonWaveKind = "trash" | "elite" | "boss";

/**
 * Dramaturgie-Metadaten EINER Dungeon-Welle (Dungeon-Rework-Spec §5.1.2): benannter Spannungsbogen
 * statt kontextloser Wellen. Index-parallel zu `DungeonDef.encounters`. Reines Content-Shape für
 * die UI (Encounter-Leiste, Wellen-Ansage, Boss-Plakette, §5.6) — die Engine wertet es NICHT aus;
 * fehlende Einträge/Felder ⇒ heutiges Verhalten (UI-Fallback: Monster-Name). Nie persistiert.
 */
export interface DungeonWaveMeta {
  /** Wellen-Name („Die Knochenwache" / „The Bone Guard"). EN/DE inline, Rest via locales-Overlay. */
  name?: LocalizedString;
  /** Dramaturgie-Rolle (Totenkopf-Leiste markiert `boss`). */
  kind?: DungeonWaveKind;
}

/**
 * Ein Dungeon: Mid/Endgame-Aktivität, läuft als Sequenz von Gegner-Wellen (`encounters`) ab;
 * beim Clear winkt dedizierte Dungeon-`loot` + xp/gold.
 *
 * CHEF-DIREKTIVE 2026-07-13 (ceo-run Welle J, SAVE_VERSION 64) — QUEST-BASIERTER UNLOCK:
 * „Keine Dungeon keys mehr, sondern quest based unlock." Das Gate ist `requiresQuest` (analog
 * `ZoneDef.requiresQuest`, Welle C): Gebiets-Kapitel abschließen → Gebiets-Dungeon offen →
 * Kapitel „töte den Dungeon-Endboss" → nächstes Gebiet. Gate-Logik lebt EINZIG in
 * engine/dungeon.ts `isDungeonUnlocked(state, content, dungeonId)`: Quest abgeschlossen ODER
 * Legacy-Bestandsschutz (`state.dungeonsUnlocked`, seit SAVE 60) — zusätzlich muss die
 * Trägerzone (`zone`) offen sein (isZoneUnlocked, Kohärenz). Der Eintritt bleibt frei und
 * unbegrenzt wiederholbar; verbraucht wird nichts. Ausnahme: der Paragonturm bleibt eigenes
 * Einmal-Unlock-System (PARAGON_KEY_ITEM_ID → dungeonsUnlocked, s. §7-Block unten).
 */
export interface DungeonDef {
  id: string;
  name: LocalizedString;
  /** Zugehörige Zone (für Gruppierung/Hintergrund UND Gate-Kohärenz: gesperrte Zone ⇒ Dungeon gesperrt). */
  zone?: string;
  /** Mindest-Gesamtlevel/Kampf-Niveau zum Betreten. */
  requiredLevel: number;
  /**
   * Story-Gate (Welle J, 2026-07-13 — analog `ZoneDef.requiresQuest`): der Dungeon öffnet erst
   * mit Abschluss dieser Quest („abgeschlossen" = claimed ODER completed, gleiche Großzügigkeit
   * wie isZoneUnlocked — der Story-Beat zählt, nicht der Einlöse-Klick). OPTIONAL & rein additiv:
   * fehlend = kein Quest-Gate → der Dungeon ist offen, sobald die Trägerzone offen ist (BEWUSSTE
   * kurze Übergangsphase, bis Welle K die Gates in den Content einträgt). Reines Content-Shape,
   * nie persistiert (der Save-Anteil ist NUR der Bestandsschutz `dungeonsUnlocked`).
   */
  requiresQuest?: string;
  /**
   * @deprecated seit 2026-07-13 (Welle J, SAVE_VERSION 64) ohne Funktion — quest-based unlock
   * (`requiresQuest`). Die Engine wertet das Feld NICHT mehr aus (kein addItemOrBank-Intercept,
   * kein Unlock, kein Verbrauch); es bleibt für Alt-Content-Kompat lesbar. EINZIGE Ausnahme:
   * der Paragonturm — sein `keyItem` (PARAGON_KEY_ITEM_ID) bleibt das aktive Einmal-Unlock-Item
   * des eigenen Turm-Systems.
   */
  keyItem?: ItemId;
  /**
   * @deprecated LEGACY (Einmal-Unlock SAVE 60; seit 2026-07-13/Welle J endgültig ohne Funktion,
   * quest-based unlock) — der Eintritt verbraucht keine Schlüssel. Feld bleibt für
   * Alt-Content-Kompat lesbar; die Engine liest es nirgends.
   */
  keysPerRun?: number;
  /** Gegner-Wellen in Reihenfolge (letzte = Boss). */
  encounters: MonsterId[];
  /**
   * Dramaturgie-Metadaten je Welle (Dungeon-Rework-Spec §5.1.2/§5.4), index-parallel zu
   * `encounters`. Optional & rein additiv: fehlend (oder kürzer als `encounters`) ⇒ exakt
   * heutiges Verhalten. Nur die UI liest es (§5.6); die Engine ignoriert es vollständig.
   */
  waveMeta?: DungeonWaveMeta[];
  /**
   * Schatztruhe/Verschnaufpause VOR dem Boss (Dungeon-Rework-Spec §5.1.2): beim Übergang in die
   * LETZTE Welle rollt combat.ts die Chest-Rows (addItemOrBank + Loot-Log) und der Wellen-Cooldown
   * beträgt einmalig `PRE_BOSS_BREATHER_MS` (8 s Atempause = Boss-Intro-Fenster fürs UI) statt
   * `KILL_COOLDOWN_MS`. RNG-Disziplin: Rows werden NUR gewürfelt, wenn `chest` definiert ist —
   * Alt-Content ohne das Feld bleibt bit-identisch (weder RNG-Draw noch Cooldown-Änderung).
   * Braucht ≥ 2 Wellen (bei 1 Welle gibt es keinen Übergang → Truhe rollt nie).
   */
  chest?: { loot: LootRoll[] };
  /** Belohnungen beim erfolgreichen Abschluss. */
  loot: LootRoll[];
  xp: number;
  gold: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Paragonturm — „Paragon Dungeon" (dungeon-rework-spec §7, Chef-Leitplanken 4+5)
//
// Endlos skalierender Prestige-Turm für die Zeit NACH dem ersten idol_sanctum-Clear:
// 1 Etage = 1 Encounter aus einem Content-Pool, Stats werden zur LAUFZEIT per Formel
// überschrieben (kein Content-Duplikat je Etage); jede 5. Etage = Boss-Etage mit
// Meilenstein-Truhe. Pause nach JEDER Etage (Checkpoint persistiert), Tod = kompletter
// Reset auf Etage 1 (Rekord `best` bleibt). Engine-Logik: engine/src/paragon.ts.
//
// FREISCHALTUNG (CHEF-ENTSCHEID im Spec-Kopf, Punkt 3 — überschreibt die §7-Klausel
// „kein Schlüssel"): über das bestehende EINMAL-Unlock-System. KONVENTION für content-dev
// (Welle P2): content.dungeons bekommt eine Def mit `id: PARAGON_DUNGEON_ID` und
// `keyItem: PARAGON_KEY_ITEM_ID` (Drop-Row auf dem last_idol, der finale Chase);
// `encounters` bleibt LEER (der Turm läuft nie über startDungeon — startParagonFloor ist
// der einzige Eintritt, das leere Array hält canEnterDungeon/startDungeon inert). Der
// Schlüsselfund entsperrt dann über den zentralen addItemOrBank-Pfad → dungeonsUnlocked.
// Fehlt Def/Key/Pool im Content, ist der Turm schlicht inert (Engine toleriert das).
// ───────────────────────────────────────────────────────────────────────────

/** Dungeon-Id des Paragonturms im Einmal-Unlock-System (Def liefert content-dev, Welle P2). */
export const PARAGON_DUNGEON_ID = "paragon_tower";
/** Schlüssel-Item des Paragonturms (Drop vom Letzten Götzen — content-dev, Welle P2). */
export const PARAGON_KEY_ITEM_ID = "paragon_key";
/** Jede so-vielte Etage ist eine Boss-Etage (×Boss-Mults + Meilenstein-Truhe). */
export const PARAGON_BOSS_INTERVAL = 5;
/** Skalierungs-Formel §7 (VERBATIM): hp(f) = 900 · 1,12^(f−1) — verdoppelt sich alle ~6,1 Etagen. */
export const PARAGON_HP_BASE = 900;
export const PARAGON_HP_GROWTH = 1.12;
/** Boss-Etage: HP-Budget ×2. */
export const PARAGON_BOSS_HP_MULT = 2;
/** dmg(f) = 70 · 1,055^(f−1) — verdoppelt sich alle ~13 Etagen. */
export const PARAGON_DMG_BASE = 70;
export const PARAGON_DMG_GROWTH = 1.055;
/** Boss-Etage: Schaden ×1,15. */
export const PARAGON_BOSS_DMG_MULT = 1.15;
/** acc(f) = 20 + 0,6·(f−1); evasion/defense/interval bleiben Basis-Monster. */
export const PARAGON_ACC_BASE = 20;
export const PARAGON_ACC_PER_FLOOR = 0.6;
/**
 * Ertrag wächst LANGSAMER als die Schwierigkeit (Leitplanke 5 — kein Printer):
 * Etagen-Gold g(f) = 300 · 1,035^(f−1) (verdoppelt alle ~20 Etagen vs. Schwierigkeit ~6
 * → Ertrag/Schwierigkeit fällt monoton; Guard in paragon.test.ts). XP folgt DERSELBEN
 * flachen Kurve (xp(f) = PARAGON_XP_BASE · 1,035^(f−1)); die XP-Basis ist nicht Spec-fixiert
 * — Balance-Domäne, kontrolleur/Chef tunebar (P2-Nachmessung).
 */
export const PARAGON_GOLD_BASE = 300;
export const PARAGON_XP_BASE = 300;
export const PARAGON_YIELD_GROWTH = 1.035;
/**
 * Harte Etagen-Obergrenze — reiner NUMERIK-Guard, spielerisch unerreichbar (BiS-99 bricht
 * per Envelope bei ~28–38): 1,12^f läuft ab ~f≈6000 in Infinity — sanitize/Engine klemmen
 * Checkpoint/Etage hierauf, damit ein editierter Riesenwert keine NaN/Infinity-Stats erzeugt.
 */
export const PARAGON_MAX_FLOOR = 5_000;

/**
 * Deprecated Story-Dungeon-Schlüssel-IDs (Einmal-Unlock SAVE 60 → quest-basierter Unlock
 * SAVE 64, ceo-run-2026-07-13 Wellen J/K): seit dem Key-Purge funktionslose, aber im Content
 * verbliebene Items (Alt-Save-/Save-Edit-Bestände bleiben verkaufbar). EINGEFROREN wie die
 * Migrations-Zuordnung LEGACY_V63_KEY_TO_DUNGEONS in persistence — diese Liste wächst NIE
 * (neue Dungeons sind quest-gated und hatten nie Schlüssel). OHNE paragon_key (eigenes,
 * AKTIVES Einmal-Unlock-System des Paragonturms — s. BUYBACK_BANNED_ITEM_IDS unten).
 */
export const LEGACY_DUNGEON_KEY_ITEM_IDS: readonly ItemId[] = [
  "warband_key",
  "crypt_key",
  "wildwood_key",
  "highland_key",
  "idolhall_key",
  "masters_mark",
];

/**
 * Sperr-Menge fürs Buy-Back-Regal (Tester-Sweep 2 T6, 2026-07-13): Dungeon-Schlüssel landen
 * NIE im Rückkauf-Regal. Für den paragon_key ist das die harte „nie im Besitz"-Invariante
 * (ein Rückkauf liefe per rohem addItem am addItemOrBank-Intercept vorbei und brächte ihn
 * zurück in die Welt); für die deprecated Story-Schlüssel schlichte Tote-Items-Hygiene (kein
 * Verlust — das Verkaufs-Gold ist beim Verkauf bereits geflossen). EINE Quelle für BEIDE
 * Verteidigungslinien: engine/shop.ts `pushBuyBack` (Live-Pfad, Defense-in-depth gegen
 * Live-Injection) UND persistence sanitize (Load-Strip der geladenen Liste).
 */
export const BUYBACK_BANNED_ITEM_IDS: ReadonlySet<ItemId> = new Set<ItemId>([
  PARAGON_KEY_ITEM_ID,
  ...LEGACY_DUNGEON_KEY_ITEM_IDS,
]);

/**
 * Persistierter Paragonturm-Fortschritt (`GameState.paragon`, SAVE_VERSION 61 — Spec-§7-Shape).
 * Checkpoint-Semantik: `checkpoint` = höchste ABGESCHLOSSENE Etage des laufenden Aufstiegs
 * (0 = frisch bzw. Tod-Reset); die nächste zu kämpfende Etage ist immer `checkpoint + 1`.
 * Der Checkpoint überlebt Pause/Save/Offline (Verlassen kostet nichts — Leitplanke 4);
 * NUR der Tod im Turm setzt ihn auf 0 zurück (= Reset auf Etage 1). `best` = Prestige-Rekord
 * („Höchste Etage", Stats-Seite): höchste jemals abgeschlossene Etage, strikt monoton —
 * der Tod senkt ihn NIE. Invariante (sanitize erzwingt): best ≥ checkpoint, beide ≥ 0, ganzzahlig.
 */
export interface ParagonState {
  checkpoint: number;
  best: number;
}

/** Frischer Paragonturm-Fortschritt (createGame + Alt-Save-Migration v61). */
export function defaultParagonState(): ParagonState {
  return { checkpoint: 0, best: 0 };
}

/**
 * Eine Meilenstein-Truhen-Stufe des Paragonturms (§7): ihre Rows rollen auf jeder Boss-Etage
 * ab `minFloor` (fehlend ⇒ 1 = immer). Spec-Staffelung: Basis-Rows immer, soulopal ab f≥10,
 * Chase-Rows (@0,015) ab f≥20 — content-dev bildet das als drei Stufen ab (Welle P2).
 * Suffix-Rolls NUR bei explizit gesetzter `LootRoll.suffixChance` (Muster Dungeon-Clear-Loot).
 */
export interface ParagonChestTier {
  /** Ab dieser Etage (inklusive) rollen die Rows mit. Fehlt ⇒ 1. */
  minFloor?: number;
  loot: LootRoll[];
}

/**
 * Paragonturm-Content (`ContentDB.paragon`, OPTIONAL — fehlend ⇒ Turm inert, Engine defensiv).
 * Die Monster-Auswahl je Etage ist eine PURE Funktion der Etagen-Nummer (deterministische
 * Rotation, engine/paragon.ts): normale Etagen rotieren durch `pool`, Boss-Etagen (jede 5.)
 * durch `bossPool`. Bewusst KEIN RNG-Draw (Spec sagt „deterministisch rotierend via seeded
 * RNG" — die pure Rotation IST die deterministische Erfüllung und hält zusätzlich
 * `paragonFloorPreview` und den Wiedereinstieg nach Save/Load exakt vorhersagbar; ein
 * RNG-Draw beim Etagen-Start würde beides brechen). Gegner-Identität (inflict/enrage/resist/
 * evasion/defense/interval/level/Name/Art) = Basis-Monster; hp/ward/damage/accuracy sowie
 * xp/gold werden per Formel ÜBERSCHRIEBEN, `loot` ist IMMER leer (kein Chase-Leck — nur
 * Etagen-Ertrag + Meilenstein-Truhen). Spec-Vorschlag Pool: iron_revenant, frost_hexer,
 * charred_doomknight, roc_void, void_titan; Boss-Pool: charred_doomknight, void_titan, roc_void.
 */
export interface ParagonContent {
  /** Monster-Pool der normalen Etagen: pool[(f−1) mod n]. Leer ⇒ Turm inert. */
  pool: MonsterId[];
  /** Boss-Pool der Boss-Etagen: bossPool[(f/5 − 1) mod n]. Leer ⇒ Boss-Etagen fallen auf `pool` zurück. */
  bossPool?: MonsterId[];
  /** Meilenstein-Truhen-Stufen (jede Boss-Etage, nach dem Kill). Fehlend ⇒ keine Truhe. */
  chest?: ParagonChestTier[];
}

/** Ein im Laden kaufbarer Eintrag. */
export interface ShopEntry {
  itemId: ItemId;
  cost: number;
}

/**
 * Ein Buy-Back-Eintrag (Shop-UX, Task #245): ein soeben verkaufter Stack ODER eine verkaufte
 * Instanz, zwischengepuffert zum Zurückkaufen. FIFO, vorne eingefügt, Länge ≤ `BUYBACK_MAX_ENTRIES`.
 * - `itemId`: Basis-Item-ID (bei Instanzen deren `baseItemId`).
 * - `qty`: verkaufte Menge (bei Instanzen immer 1).
 * - `price`: Verkaufspreis PRO STÜCK (= Rückkaufkosten je Stück). Rückkauf-Gesamtkosten = `qty*price`.
 * - `instance`: die verkaufte Instanz (verzaubert/gesuffixt), damit sie beim Rückkauf identisch
 *   zurückkehrt. Fehlt bei schlichten Stacks.
 */
export interface BuyBackEntry {
  itemId: ItemId;
  qty: number;
  price: number;
  instance?: ItemInstance;
}

// ───────────────────────────────────────────────────────────────────────────
// Farming — passive Plots/Beete (Chef-Freigabe 2026-06-26, design/skills/farming-plots-plan.md)
//
// Farming ist vom „eine-Aktion-zur-Zeit"-Modell ENTKOPPELT: der Spieler pflanzt Saat in Plots,
// die PASSIV gegen die deterministische Sim-Uhr (`state.elapsedMs`, NICHT Date.now) reifen —
// online wie offline — und bei Reife automatisch geerntet werden, OHNE den `activeActionId`-Slot
// zu belegen. Plots laufen also parallel zu Kampf/anderem Skilling. Reife = `elapsedMs - plantedAtMs
// >= growMs`; `elapsedMs` ist strikt monoton (nur über `advance`) → Wachstum ist anti-abuse-fest.
// ───────────────────────────────────────────────────────────────────────────

/** Ein passives Beet (fester Slot im Plot-Grid). Reife/Wachstum messen gegen `GameState.elapsedMs`. */
export interface FarmPlot {
  /** Gepflanzte Crop-ID (Schlüssel in `ContentDB.crops`). null = leerer Plot. */
  cropId: ItemId | null;
  /** Snapshot von `state.elapsedMs` beim Pflanzen (Sim-Uhr, nicht Wanduhr). 0 wenn leer. */
  plantedAtMs: number;
  /** Bei Reife automatisch neu aussäen, solange Saat im Inventar/Lager ist (CEO-Default: AN). */
  autoReplant: boolean;
  /**
   * Fertige, aber (Inventar voll + autoBank=off) noch nicht eingelagerte Ernte, die als
   * „abholbar" auf dem Plot wartet. 0 = nichts offen. Verhindert Ertragsverlust.
   */
  readyYield: number;
  /** Item-ID der wartenden Ernte (für `readyYield > 0`), sonst null. */
  readyItem: ItemId | null;
  /**
   * Folgesorte (SAVE_VERSION 82, Chef-GO 25.08.2026 (1.1.0), design/rezension-patch-2026-08-25.html
   * #p12): wird bei der NÄCHSTEN Reife statt `cropId` gesät und nullt sich danach — das Beet läuft
   * dann mit Auto-Nachpflanzen der neuen Sorte weiter. EINMALIG statt Rotationsliste (Chef-Entscheid
   * #12.1): wer erneut wechseln will, setzt wieder eine Folgesorte. null = nichts geplant.
   *
   * Fehlt die Saat der Folgesorte zur Reife, fällt das Beet NICHT auf die alte Sorte zurück
   * (Chef-Entscheid #12.2: „keine Samen = einfach kein Pflanzen, Management-Fehler vom Spieler"):
   * es wird leer, der Plan BLEIBT stehen, die UI warnt — und sobald Saat da ist, sät der Tick das
   * leere Beet mit der Folgesorte ein. Deshalb ist ein Plan auf einem LEEREN Beet ein gültiger
   * Save-Zustand (Sanitize strippt nur unbekannte Sorten und Plan == aktuelle Sorte).
   */
  nextCropId: ItemId | null;
}

/** Harte Obergrenze der Plot-Anzahl (UI-Grid + Sanitize-Cap + fixe Array-Länge im Save). */
export const MAX_FARM_PLOTS = 9;

/**
 * Anteil der nackten Zielkurve, den EIN Plot passiv liefert (Identitäts-Hebel: die Progression
 * liegt im Plot-COUNT 3→9, nicht in XP/h pro Plot). content-dev tunt `CropDef.xp` damit.
 */
export const PLOT_XP_SHARE = 0.15;

/** Freischalt-Stufen: ab Farming-Level → Anzahl freigeschalteter Plots (aufsteigend). */
export const PLOT_UNLOCK: Array<[level: number, plots: number]> = [
  [1, 3],
  [10, 4],
  [25, 5],
  [40, 6],
  [55, 7],
  [70, 8],
  [85, 9],
];

/** Anzahl freigeschalteter Plots für ein Farming-Level (reine Funktion, kein State). */
export function plotsUnlocked(farmingLevel: number): number {
  let p = PLOT_UNLOCK[0]![1];
  for (const [lv, n] of PLOT_UNLOCK) if (farmingLevel >= lv) p = n;
  return p;
}

/** Ein leerer Plot (Default für `createGame` + Save-Migration). Auto-Replant per CEO-Default AN. */
export function emptyFarmPlot(): FarmPlot {
  return { cropId: null, plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: null };
}

/** Frisches Plot-Array fester Länge `MAX_FARM_PLOTS` (leere Beete). */
export function defaultFarmPlots(): FarmPlot[] {
  return Array.from({ length: MAX_FARM_PLOTS }, () => emptyFarmPlot());
}

/**
 * Eine anbaubare Crop (neue `ContentDB.crops`-Sektion, von content-dev in Phase 2 gefüllt).
 * Wiederverwendet dieselben Item-Verträge (Saat/Ertrag) wie die bisherigen aktiven `farm_*`-Aktionen,
 * ergänzt sie aber um echte passive Wachszeiten (`growMs`) + passiv-getunte `xp` (≙ `PLOT_XP_SHARE`).
 */
export interface CropDef {
  /** Crop-ID = Schlüssel in `ContentDB.crops` UND in `FarmPlot.cropId`. */
  id: string;
  name: LocalizedString;
  /** Saat-Item, das beim PFLANZEN (nicht bei der Ernte) verbraucht wird. */
  seedItem: ItemId;
  /** Geerntetes Item (Vertrags-ID, z.B. herb_marshroot). */
  yieldItem: ItemId;
  yieldMin: number;
  yieldMax: number;
  /** Farming-Level zum Pflanzen. */
  levelRequired: number;
  /** Echte Wachszeit in ms (gegen `state.elapsedMs` gemessen). */
  growMs: number;
  /** Farming-XP pro Ernte (passiv-getunt, ≙ `PLOT_XP_SHARE` der Zielkurve). */
  xp: number;
  /** Tier (1..5) für Anzeige/Gruppierung. */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Emoji-/Icon-Fallback bis Pixelart da ist. */
  icon?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Achievement-System 2.0 (Vollausbau ~660, reiner Score). Design-Doc:
// design/achievement-system-plan.md. Schema/Generator-Interface: siehe unten.
// ───────────────────────────────────────────────────────────────────────────

/** Seltenheits-/Schwierigkeitsstufe eines Achievements → fester Punktwert (AP). */
export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Achievement-Points je Seltenheit. EINZIGE Quelle der Punktzuordnung. */
export const ACHIEVEMENT_POINTS: Record<AchievementRarity, number> = {
  common: 5,
  uncommon: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
};

/** Thematische Gruppierung (UI: Tabs/Akkordeons, je Kategorie ein Completion-Zähler). */
export type AchievementCategory =
  | "skilling"
  | "combat"
  | "gathering"
  | "crafting"
  | "quests"
  | "wealth"
  | "collection"
  | "exploration"
  | "meta";

/**
 * Auslöser eines Achievements (datengetrieben, gegen den Spielstand geprüft).
 * JEDER Typ wertet ausschließlich BEREITS VORHANDENE / die wenigen neuen State-Zähler aus —
 * KEIN neuer Event-Hook (Muster aus quests.ts `rawProgress`). `target` ist je nach Typ eine
 * Skill-/Monster-/Item-/Dungeon-ID (oder entfällt); `count` ist der Zielwert.
 *
 * Zähler-Zuordnung (was `checkAchievements` liest):
 * - skill_level      target=SkillId    → levelFromXp(state.skills[target].xp)
 * - total_level                        → state.character.totalLevel
 * - monster_kills    target=MonsterId  → state.monsterKills[target]
 * - total_kills                        → state.stats.kills
 * - items_gathered                     → state.stats.itemsGathered
 * - items_crafted    target=ItemId?    → state.stats.craftedById[target] | state.stats.itemsCrafted
 * - quests_completed                   → state.quests.claimed.length
 * - gold_reached                       → state.character.gold (aktueller Goldstand)
 * - gold_spent                         → state.stats.goldSpent (NEU, kumulativ)
 * - items_discovered                   → Anzahl entdeckter Item-IDs (`state.discoveredItems`,
 *                                        monotoner Erst-Besitz-Marker — Verkauf senkt den
 *                                        Fortschritt NIE; Welle LL, vorher seenDrops ∪ Besitz)
 * - dungeons_cleared target=DungeonId? → state.dungeonsCleared[target] | Σ aller Clears (NEU)
 * - daily_streak                       → state.stats.dailyStreak (NEU)
 * - pets_owned                         → Anzahl besessener Pets, die es im Content gibt (NEU)
 * - sets_completed                     → Anzahl vollständig BESESSENER Sets (alle Teile irgendwo im Besitz)
 * - paragon_floor                      → state.paragon.best (Prestige-Rekord „Höchste abgeschlossene
 *                                        Turm-Etage"; count = geforderte Etage — Welle JJ, für die
 *                                        Paragon-Achievement-Leiter von content-dev)
 *
 * Achievements 1.2.0 (Chef-Entscheid 27.08.2026, design/achievements-1.2.0/audit.md § 2.5) — alle
 * neuen Typen lesen NUR bestehenden State (kein neues Feld, kein SAVE_VERSION-Sprung):
 * - quests_completed target=QuestId?  → mit target: 1 wenn `quests.claimed` die Quest enthält, sonst 0
 *                                        (Chronik-Kapitel-Erfolge); ohne target wie bisher (Anzahl)
 * - monsters_discovered                → Anzahl Content-Monster mit monsterKills ≥ 1 (Bestiarium)
 * - zone_bestiary    target=ZoneId    → MIN der Kills über alle Content-Monster der Zone (count 1 =
 *                                        „jedes Wesen besiegt", count 100 = „Zone gemeistert")
 * - dungeons_distinct                  → Anzahl Dungeon-IDs mit ≥ 1 Clear (ohne paragon_tower)
 * - slayer_tasks · slayer_streak       → state.slayerTasksCompleted · state.slayerStreak
 * - slayer_floor                       → höchste `MonsterDef.slayerFloor` unter Monstern mit Kill ≥ 1
 * - elite_kills      target=EliteId?  → Σ eliteCodex[*].kills bzw. Kills EINER Variante
 * - elite_variants · elite_uniques     → Anzahl Varianten mit kills ≥ 1 · mit uniques ≥ 1
 * - camp_levels      target=BuildingId?→ Σ camp.buildings-Stufen bzw. Stufe EINES Gebäudes
 * - camp_buildings                     → Anzahl gebauter Gebäude (Stufe ≥ 1)
 * - mastery_maxed                      → Anzahl Aktionen mit Meisterschafts-Level ≥ MASTERY_MAX_LEVEL
 * - min_skill_level                    → kleinstes Level über alle Content-Skills („Alleskönner")
 * - dailies_distinct                   → Anzahl VERSCHIEDENER Daily-Quests in `quests.claimed`
 * - bank_slots                         → state.bankSlotsPurchased
 * - food_cooked                        → Σ craftedById über alle Outputs von Kochen-Aktionen
 * - runes_discovered                   → Anzahl entdeckter Items mit `rune`-Feld (discoveredItems)
 * - farm_plots_planted                 → Anzahl bepflanzter Beete (farmPlots[].cropId ≠ null)
 * - deaths · play_hours                → state.stats.deaths · floor(activePlayMs / 3 600 000)
 */
export type AchievementConditionType =
  | "skill_level"
  | "total_level"
  | "monster_kills"
  | "total_kills"
  | "items_gathered"
  | "items_crafted"
  | "quests_completed"
  | "gold_reached"
  | "gold_spent"
  | "items_discovered"
  | "dungeons_cleared"
  | "daily_streak"
  | "pets_owned"
  | "sets_completed"
  | "paragon_floor"
  | "monsters_discovered"
  | "zone_bestiary"
  | "dungeons_distinct"
  | "slayer_tasks"
  | "slayer_streak"
  | "slayer_floor"
  | "elite_kills"
  | "elite_variants"
  | "elite_uniques"
  | "camp_levels"
  | "camp_buildings"
  | "mastery_maxed"
  | "min_skill_level"
  | "dailies_distinct"
  | "bank_slots"
  | "food_cooked"
  | "runes_discovered"
  | "farm_plots_planted"
  | "deaths"
  | "play_hours";

export interface AchievementCondition {
  type: AchievementConditionType;
  /** Skill-/Monster-/Item-/Dungeon-ID, je nach Typ (optional für Gesamt-Zähler). */
  target?: string;
  /** Zu erreichender Schwellenwert. */
  count: number;
}

export interface AchievementDef {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  icon?: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  condition: AchievementCondition;
  /**
   * Versteckter Erfolg (Achievements 1.2.0 § 2.6): Name, Beschreibung und Fortschritt werden in der
   * UI bis zum Freischalten maskiert („???" + Schloss), damit Story-Twists (Kapitel 20/21) und die
   * Augenzwinker-Erfolge nicht gespoilert werden. Engine-Auswertung ist identisch zu sichtbaren
   * Erfolgen; das Flag ist reines Anzeige-Metadatum (Steam-Backend: „Hidden"-Haken, s. steam-set.csv).
   */
  hidden?: boolean;
}

/** AP-Wert eines einzelnen Achievements (rein aus rarity abgeleitet). */
export function achievementPoints(def: AchievementDef): number {
  return ACHIEVEMENT_POINTS[def.rarity];
}

/**
 * Erspielte Achievement-Points = Σ AP über alle freigeschalteten Achievements.
 * REIN ABGELEITET aus `state.achievements` + `content` — NICHT persistiert (kein Drift,
 * keine Migration; Rebalancing wirkt sofort). IDs ohne Def (z.B. entfernte) zählen 0.
 */
export function earnedAP(state: GameState, content: ContentDB): number {
  const unlocked = new Set(state.achievements);
  let sum = 0;
  for (const a of content.achievements) {
    if (unlocked.has(a.id)) sum += achievementPoints(a);
  }
  return sum;
}

/** Maximal erreichbare Achievement-Points = Σ AP über ALLE definierten Achievements. */
export function totalAP(content: ContentDB): number {
  let sum = 0;
  for (const a of content.achievements) sum += achievementPoints(a);
  return sum;
}

/**
 * AP-Meilenstein-Schrittweite in Prozentpunkten (SAVE_VERSION 66, Welle GG/collection-pip P1):
 * bei jedem vollen 5-%-Schritt der Gesamt-AP-Quote (earnedAP / totalAP) gibt es EINMALIG
 * Quest-Tokens (`AP_MILESTONE_TOKENS`). Vergeben wird in `checkApMilestones` (engine/achievements.ts).
 */
export const AP_MILESTONE_STEP_PCT = 5;

/**
 * Quest-Token-Staffel je AP-Meilenstein-Schritt (Schlüssel = Prozent-Schritt 5..100).
 * Begründete Staffel (Chef-GO „früh klein, spät groß"):
 *  - Innerhalb jedes Viertels rampt der Wert sanft (2→3 · 4→5 · 6→9 · 10→16) — späte Schritte
 *    sind schwerer verdient (seltene/epische Achievements) und zahlen entsprechend mehr.
 *  - Die Viertel-Grenzen 25/50/75/100 % sind FEIER-Schritte mit Bonus-Spike (5/10/15/25 ≈ das
 *    Doppelte der Rampe) — sichtbare Etappenziele statt gleichförmigem Tröpfeln.
 *  - Gesamtsumme über alle 20 Schritte: 165 Tokens ≈ 8–11 Tage Daily-Quest-Einkommen
 *    (Dailys ≈ 15–20 Tokens/Tag) — ein spürbarer Lebenszeit-Meta-Bonus, ohne den Token-Shop
 *    zu sprengen. 100 % setzt zusätzlich das Zeremonie-Flag `apCeremonyPending`.
 * Bereits vergebene Schritte bleiben vergeben (claimedApMilestones), auch wenn wachsender
 * Content die Quote wieder unter den Schritt drückt.
 */
export const AP_MILESTONE_TOKENS: Readonly<Record<number, number>> = {
  5: 2, 10: 2, 15: 3, 20: 3, 25: 5,
  30: 4, 35: 4, 40: 5, 45: 5, 50: 10,
  55: 6, 60: 7, 65: 8, 70: 9, 75: 15,
  80: 10, 85: 12, 90: 14, 95: 16, 100: 25,
};

/** Token-Wert eines AP-Meilenstein-Schritts (unbekannter Schritt → 0, defensiv). */
export function apMilestoneTokens(step: number): number {
  return AP_MILESTONE_TOKENS[step] ?? 0;
}

// ───────────────────────────────────────────────────────────────────────────
// Quests — vergeben Gold + Items (Chef-Entscheidung 2026-06-25: keine Attributpunkte)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Objective-Typen: jeder wertet sich gegen einen BEREITS VORHANDENEN State-Zähler aus
 * (keine neuen Event-Hooks in combat/tick nötig). `target` ist je nach Typ eine Monster-/
 * Skill-ID oder wird ignoriert; `count` ist der zu erreichende Zielwert.
 *
 * - kill_monster      → state.monsterKills[target]        (Kills eines bestimmten Monsters)
 *                       [Sweep6 W2-T6-#3] optional `targets: string[]`: Kills ALLER gelisteten
 *                       Monster zählen SUMMIERT (Union mit `target`, dedupliziert) — für
 *                       Varianten-Familien („Erschlage 10 Goblins" zählt goblin + Varianten).
 *                       Abwärtskompatibel: ohne `targets` unverändert nur `target`.
 * - kill_total        → state.stats.kills                 (Kills insgesamt; target ignoriert)
 * - reach_skill_level → levelFromXp(state.skills[target]) (Level einer Fertigkeit)
 * - reach_total_level → state.character.totalLevel        (Gesamtlevel; target ignoriert)
 * - gather_items      → state.stats.itemsGathered         (gesammelte Items; target ignoriert)
 * - craft_items       → state.stats.itemsCrafted / craftedById[target]
 *                       (geschmiedete/verarbeitete Items; target = Item-ID oder leer = beliebig)
 * - reach_paragon_floor → state.paragon.best              (Paragonturm-Etagen-Höchststand =
 *                       höchste jemals ABGESCHLOSSENE Etage, strikt monoton — der Tod im Turm
 *                       senkt ihn nie; target ignoriert, count = zu erreichende Etage.
 *                       Aschechronik Kapitel 21, ceo-run-2026-07-13; kein neuer State.)
 */
export type QuestObjectiveType =
  | "kill_monster"
  | "kill_total"
  | "reach_skill_level"
  | "reach_total_level"
  | "gather_items"
  | "craft_items"
  | "reach_paragon_floor";

/** Alle gültigen Objective-Typen (für Validierung & UI). */
export const QUEST_OBJECTIVE_TYPES: QuestObjectiveType[] = [
  "kill_monster",
  "kill_total",
  "reach_skill_level",
  "reach_total_level",
  "gather_items",
  "craft_items",
  "reach_paragon_floor",
];

export interface QuestObjective {
  type: QuestObjectiveType;
  /** Monster-/Skill-/Item-ID je nach Typ. Bei typ-losen Zählern (kill_total/…) leer/ignoriert.
   *  Bei craft_items optional: gesetzt = bestimmte Item-ID, leer = beliebiges geschmiedetes Item. */
  target?: string;
  /**
   * [Sweep6 W2-T6-#3] NUR kill_monster: alternative Ziel-Liste — Kills ALLER gelisteten Monster
   * zählen summiert auf denselben Zähler (Union mit `target`, dedupliziert). Löst die
   * Goblin-Quest-Falle (q_first_blood zählte nur den Basis-`goblin`, nie die 8 Varianten).
   * Andere Objective-Typen ignorieren das Feld. Abwärtskompatibel optional.
   */
  targets?: string[];
  /** Zu erreichender Zielwert des Zählers. */
  count: number;
}

/** Belohnung einer Quest. Reine Gold- + Item-Belohnungen (keine Attributpunkte mehr). */
export interface QuestReward {
  gold?: number;
  items?: Array<{ id: ItemId; qty: number }>;
}

/** Schwierigkeitsgrade einer Quest (Daily-Pool): skaliert Reward + Objective-Umfang. */
export type QuestDifficulty = "very_easy" | "easy" | "medium" | "hard" | "master";

/** Alle Schwierigkeitsgrade in aufsteigender Reihenfolge (für UI/Validierung). */
export const QUEST_DIFFICULTIES: QuestDifficulty[] = [
  "very_easy",
  "easy",
  "medium",
  "hard",
  "master",
];

export interface QuestDef {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  /**
   * Chronik-Erzähltext (Aschechronik, ceo-run-2026-07-13): der lange Erzählkanal des Wächters —
   * getrennt von der knappen Ziel-`description`. Anzeige macht ui-dev (Kompass-Panel, Welle E);
   * Content liefert ihn für die chronicle_*-Quests (Welle D2). OPTIONAL & rein additiv: fehlend =
   * kein Erzähltext (bestehende Quests unverändert). Reines Content-Shape, nie persistiert
   * (kein SAVE_VERSION-Belang — verifiziert: nur Quest-IDs/Fortschritt liegen im Save).
   */
  loreText?: LocalizedString;
  objectives: QuestObjective[];
  rewards: QuestReward;
  /**
   * Quest-Tokens, die der Claim zusätzlich zur normalen Reward-Pipeline gutschreibt
   * (`character.questTokens`, Task #271, SAVE_VERSION 56 — Währung für den kommenden Token-Shop).
   * Fehlt das Feld → 0 Tokens (abwärtskompatibel; content-dev stellt die Quest-Defs danach um).
   */
  tokenReward?: number;
  /** Vorbedingung für Quest-Ketten: erst verfügbar, wenn diese Quests eingelöst sind. */
  requires?: string[];
  /**
   * Wiederholbare Quest (Daily/Grind-Tafel gegen die „leere Tafel" nach den statischen Quests).
   * Wird NICHT dauerhaft `claimed`; nach dem Einlösen wird der aktuelle Zählerstand als neue
   * Baseline gemerkt und der Fortschritt misst „seit letztem Claim" — die Quest re-armt also.
   * Daily-Pool-Quests sind implizit wiederholbar (über `daily`).
   */
  repeatable?: boolean;
  /**
   * Gehört zum Daily-Pool: NICHT Teil der statischen Story-Linie, sondern Kandidat für die
   * tägliche 6er-Auswahl (`pickDailyQuests`). Daily-Pool-Quests verhalten sich beim Claim wie
   * repeatable (re-armen pro Tag) und MÜSSEN ein `difficulty` tragen.
   */
  daily?: boolean;
  /** Schwierigkeitsgrad (Pflicht für Daily-Pool-Quests; bei Story-Quests optional). */
  difficulty?: QuestDifficulty;
  /**
   * Obere Gesamtlevel-Schranke der Daily-Vergabe (Chef-Entscheidung E7 25.08.2026, Rezension
   * #13): liegt `character.totalLevel` ÜBER diesem Wert, wird die Pool-Quest nicht mehr gezogen —
   * Gegenstück zum unteren Schwierigkeits-Gate `DAILY_DIFFICULTY_MIN_TOTAL_LEVEL`, damit „5 Hühner"
   * keine Slots eines Hochstufigen belegen und jeder Spieler Dailies seines Niveaus bekommt.
   * Nur für `daily: true` ausgewertet (engine/quests.ts `isDailyEligible`, greift ausschließlich
   * bei der NEUEN Tagesvergabe — bereits im Save liegende Karten bleiben). Fehlend = keine
   * Obergrenze (schwere/Endgame-Dailies). Reines Content-Shape, nie persistiert: kein SAVE-Belang.
   */
  maxTotalLevel?: number;
}

/**
 * Fortschritt einer einzelnen aktiven Daily-Quest am laufenden Tag.
 * - `questId`: ID der gezogenen Pool-Quest.
 * - `claimed`: bereits heute eingelöst (1× pro Tag).
 * Der eigentliche Objective-Fortschritt wird wie bei repeatable Quests über die
 * `repeatBaseline` gegen die kumulativen State-Zähler gemessen (kein zweiter Zähler nötig).
 */
export interface DailyQuestEntry {
  questId: string;
  claimed: boolean;
}

/**
 * Daily-Quest-Laufzeitzustand.
 * - `day`: Kalendertag-Stempel (YYYYMMDD, lokal vom Client geliefert — die Engine erzeugt KEINE Zeit).
 *   0 = noch nie gezogen.
 * - `quests`: die 6 für diesen Tag gezogenen Dailies inkl. claimed-Flag.
 */
export interface DailyQuestState {
  day: number;
  quests: DailyQuestEntry[];
}

/**
 * Laufzeit-Zustand des Quest-Systems.
 * - `completed`: Quests, deren Objectives ERFÜLLT sind (claimbar; von evaluateQuests gesetzt).
 * - `claimed`: Quests, deren Belohnung bereits eingelöst wurde (idempotent, nie doppelt).
 * - `repeatBaseline`: pro wiederholbarer Quest der Zählerstand zum Zeitpunkt des letzten Claims
 *   (questId → objIndex → Baseline). Der Fortschritt einer repeatable Quest = Zähler − Baseline,
 *   wird also nach jedem Claim wieder von 0 hochgezählt. Frisch/ohne Claim = 0 (= absoluter Zähler).
 * - `daily`: aktiver Daily-Tag + die 6 gezogenen Dailies (Reset bei Tageswechsel).
 */
export interface QuestState {
  completed: string[];
  claimed: string[];
  repeatBaseline: Record<string, Record<number, number>>;
  daily: DailyQuestState;
}

/** Default-Daily-State (kein Tag gezogen). */
export function defaultDailyState(): DailyQuestState {
  return { day: 0, quests: [] };
}

/**
 * Kalendertag-Nachfolger für YYYYMMDD-Stempel (rein, deterministisch, kein Date/I-O).
 * Nutzt Schaltjahr-korrekte Monatslängen. Eingabe/Ausgabe sind Integer-Stempel (z.B.
 * 20260131 → 20260201, 20261231 → 20270101). Basis der Daily-Streak-Kontinuität.
 */
export function nextCalendarDay(stamp: number): number {
  const y = Math.floor(stamp / 10000);
  const m = Math.floor((stamp % 10000) / 100);
  const d = stamp % 100;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const mdays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let ny = y;
  let nm = m;
  let nd = d + 1;
  if (nd > (mdays[m - 1] ?? 31)) {
    nd = 1;
    nm = m + 1;
    if (nm > 12) {
      nm = 1;
      ny = y + 1;
    }
  }
  return ny * 10000 + nm * 100 + nd;
}

/** Default-Quest-State für frische Spielstände (und Migration alter Saves). */
export function defaultQuestState(): QuestState {
  return { completed: [], claimed: [], repeatBaseline: {}, daily: defaultDailyState() };
}

/** Anzahl täglich gezogener Dailies. */
export const DAILY_QUEST_COUNT = 6;
/** Maximale Häufigkeit einer einzelnen Schwierigkeit unter den 6 Dailies (Constraint). */
export const DAILY_MAX_PER_DIFFICULTY = 2;

/**
 * Mix-Garantie der Tagesauswahl (Kern-Loop-Review Henrik, Empf. 5 — Welle Z2 2026-07):
 * mindestens so viele NICHT-Kampf-Dailies (reine craft-/gather-/skill-Ziele) pro Tag, sofern der
 * progressions-gefilterte Pool sie hergibt. Die hochwertigen Kampf-Dailies bleiben unangetastet
 * (combat-is-fundamental) — es geht um die Token-Grundversorgung der Skiller, nicht ums
 * Abschaffen der Kampf-Anreize. Auswahl-Logik: engine/quests.ts `pickDailyQuests`.
 */
export const DAILY_NONCOMBAT_MIN = 2;

/**
 * Progressions-Heuristik der Daily-Vergabe (Neuling-Review Jorin, Empf. 5 — Welle Z2): ein
 * craft-/reach-Ziel gilt als „in erreichbarer Nähe", wenn das benötigte Skill-Level höchstens
 * aktuelles Level + dieses Headroom beträgt. Pragmatisch gewählt: eine Tages-Quest darf leicht
 * über dem Stand liegen (Anreiz), aber keine ferne Endgame-Rezeptur verlangen (Tag-1-Spieler
 * bekam „Schmelze Runit" bei Smithing 1). Prüfung: engine/quests.ts `isDailyEligible`.
 */
export const DAILY_LEVEL_HEADROOM = 10;

/**
 * Mindest-Gesamtlevel je Daily-Schwierigkeit (Progressions-Filter engine/quests.ts
 * `isDailyEligible`): hält „Meister"-Karten von Tag-1-Brettern fern, auch wenn ihre Ziele selbst
 * kein Zonen-/Rezept-Gate tragen (z.B. „gather 250" / „kill_total 60" — erfüllbar, aber am
 * ersten Tag demotivierend, Neuling-Review Jorin Empf. 5). Kalibrierung: frischer Char ≈ 21
 * (Σ aller Level-1-Skills), master ≈ Slagpit-Ära (Chronik ~Kapitel 14). 0 = kein Gate;
 * Feinjustierung ist balance-designer-Terrain.
 */
export const DAILY_DIFFICULTY_MIN_TOTAL_LEVEL: Record<QuestDifficulty, number> = {
  very_easy: 0,
  easy: 0,
  medium: 0,
  hard: 0,
  master: 300,
};

/**
 * Ein Angebot im Quest-Token-Belohnungs-Shop (Task #284): ein Item-BÜNDEL (`qty` Stück auf einmal)
 * gegen Quest-Tokens (`character.questTokens`). Reine Content-Daten — kein persistierter State,
 * unbegrenzt oft kaufbar (Token-Einkommen ist die natürliche Bremse: Dailys ≈ 15-20 Tokens/Tag).
 * Kauf-Logik: `buyTokenShopOffer` (engine/quests.ts). Die Engine behandelt ein fehlendes/leeres
 * `tokenShop` defensiv als „leerer Shop".
 */
export interface TokenShopOffer {
  /** Eindeutige Angebots-ID (Kauf-Referenz der UI; unabhängig von der ItemId, damit dasselbe Item in mehreren Bündelgrößen erscheinen kann). */
  id: string;
  /** Gekauftes Item (ItemId → ItemDef in content.items; nur stackables — das Bündel landet als Stack im Inventar). */
  itemId: ItemId;
  /** Bündelgröße: wie viele Stück EIN Kauf liefert (positive Ganzzahl). */
  qty: number;
  /** Preis des Bündels in Quest-Tokens (positive Ganzzahl). */
  tokenCost: number;
  /** Optionale Anzeige-Sortierung (aufsteigend; fehlend = 0, Array-Reihenfolge als Tiebreak). */
  sortOrder?: number;
  /**
   * Regal-Zugehörigkeit (Chef-GO 25.08.2026 (1.1.0), design/rezension-patch-2026-08-25.html #p13):
   * verweist auf `TokenShopShelf.id`. FEHLT das Feld, gilt das Angebot als im offenen Regal
   * (abwärtskompatibel — die ursprünglichen 9 #284-Angebote tragen es trotzdem explizit, s.
   * content-dev). Kauf-Gate: `buyTokenShopOffer` (engine/quests.ts) prüft das Regal über
   * `TokenShopShelf.requiresQuest`, exakt dieselbe Quelle wie `ZoneDef.requiresQuest`
   * (isZoneUnlocked-Muster: `quests.claimed` ODER `quests.completed`).
   */
  shelfId?: string;
}

/**
 * Ein Regal im Quest-Token-Belohnungs-Shop (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p13, Chef-Entscheidung 1: 6 Regale an Kapitel-Gates).
 * Gruppiert `TokenShopOffer`s (via `TokenShopOffer.shelfId`) unter einer Kapitel-Überschrift —
 * exakt dasselbe Gate-Muster wie `ZoneDef.requiresQuest`/`isZoneUnlocked` (zones.ts), nur für den
 * Shop statt eine Kampfzone. Reine Content-Daten, kein persistierter State (kein SAVE-Bump nötig
 * — welches Regal offen ist, folgt vollständig aus `state.quests`, das schon existiert).
 */
export interface TokenShopShelf {
  /** Eindeutige Regal-ID (Referenzziel von `TokenShopOffer.shelfId`). */
  id: string;
  /** Anzeigename der Regal-Überschrift (z.B. „Aschfelder"). */
  name: LocalizedString;
  /**
   * Freischalt-Quest (Chronik-Kapitel-ID, z.B. `"chronicle_04"`). FEHLT das Feld, ist das Regal
   * immer offen (das Start-Regal). Gate-Logik identisch zu `isZoneUnlocked`: erfüllt, wenn
   * `state.quests.claimed` ODER `state.quests.completed` die Quest enthält.
   */
  requiresQuest?: string;
  /** Anzeige-Sortierung der Regale (aufsteigend; Kapitel-Reihenfolge). */
  sortOrder: number;
}

export interface ContentDB {
  skills: Record<SkillId, SkillDef>;
  actions: Record<ActionId, ActionDef>;
  items: Record<ItemId, ItemDef>;
  monsters: Record<MonsterId, MonsterDef>;
  shop: ShopEntry[];
  achievements: AchievementDef[];
  zones: ZoneDef[];
  /** Dungeons (Mid/Endgame-Aktivitäten mit Schlüssel + dedizierter Loot). */
  dungeons: DungeonDef[];
  /**
   * Paragonturm-Pools + Meilenstein-Truhen (dungeon-rework-spec §7). OPTIONAL → Fehlen =
   * Turm inert (startParagonFloor liefert false, kein RNG-Zug); content-dev füllt es in
   * Welle P2. Reine Content-Daten, kein persistierter State (der Fortschritt lebt in
   * `GameState.paragon`).
   */
  paragon?: ParagonContent;
  /** Geordnete Aktions-Kategorien (Anzeigereihenfolge auf Skill-Seiten). */
  categories: CategoryDef[];
  /** Ausrüstungs-Sets mit Set-Boni. */
  sets: SetDef[];
  /** Quests — vergeben Gold + Items (content-dev füllt die echte Quest-Linie). */
  quests: QuestDef[];
  /**
   * Quest-Token-Belohnungs-Shop (Task #284): Item-Bündel gegen Quest-Tokens. OPTIONAL →
   * Fehlen = leerer Shop (Engine/UI defensiv); reine Content-Daten, kein persistierter State.
   */
  tokenShop?: TokenShopOffer[];
  /**
   * Regale des Quest-Token-Belohnungs-Shops (#p13). OPTIONAL → Fehlen = alle Angebote gelten als
   * offenes Regal (Engine/UI defensiv, Muster `tokenShop`); reine Content-Daten, kein Save-Bump.
   */
  tokenShopShelves?: TokenShopShelf[];
  /**
   * Begleiter-Pets (Pet-/Companion-System). Ziel: 21 Pets, eins pro Skill —
   * content-dev füllt das Roster. Key = PetId. Jedes Pet hat skillEffect + combatAbility (gedeckelt).
   */
  pets: Record<PetId, PetDef>;
  /**
   * Anbaubare Crops (passives Plot-/Farming-System). Key = Crop-ID (≙ `FarmPlot.cropId`).
   * OPTIONAL: content-dev füllt den Katalog in Phase 2 — bis dahin behandelt die Engine ein
   * fehlendes/leeres `crops` defensiv (keine Reife, kein RNG-Zug) → bestehende Saves/Tests unberührt.
   */
  crops?: Record<ItemId, CropDef>;
  /**
   * Slayer-Master (Monsterjäger-Auftraggeber). OPTIONAL → Alt-Content/Tests laufen unverändert;
   * die Engine behandelt Fehlen defensiv als „kein Slayer verfügbar" (keine Master, kein Assign).
   */
  slayerMasters?: SlayerMasterDef[];
  /**
   * Slayer-Tower-Etagen (5 Etagen, Schwellen 1/20/40/60/80). OPTIONAL → Fehlen = keine Tower-Tasks
   * (Assign fällt dann auf Welt-Tasks zurück).
   */
  slayerTower?: SlayerTowerFloor[];
  /**
   * Slayer-Punkte-Shop (Einträge gegen Slayer-Punkte). OPTIONAL → Fehlen = kein Shop verfügbar.
   * Content-dev füllt den Katalog später; rein additive Content-Daten (kein persistierter State).
   */
  slayerShop?: SlayerShopEntry[];
  /**
   * Affix-Katalog (Verzauberungen). OPTIONAL → Fehlen = keine Verzauberungen verfügbar; die Engine
   * (applyEnchant/computeStats/Naming) behandelt das defensiv. content-dev füllt es in Welle 2.
   */
  affixes?: Record<AffixId, AffixDef>;
  /**
   * Suffix-Katalog (Random Rolls, Phase 2). OPTIONAL → Fehlen = keine Suffixe. Phase 1 liest es
   * nur in computeStats/Naming (suffix-ready); der Roll-Mechanismus folgt in Phase 2.
   */
  suffixes?: Record<SuffixId, SuffixDef>;
  /**
   * Elite-/World-Spawn-Varianten („Champions des Reach", design/elite-spawns-concept.md). Key =
   * `EliteVariantDef.id`. OPTIONAL & PHASE 1 bewusst LEER (`{}` im echten Content, packages/content/
   * src/index.ts) — content-dev befüllt sie in Phase 2 (2–3 Varianten je Zone). Ohne Einträge (oder
   * ganz ohne das Feld — Alt-/Test-Fixtures) spawnt `tickEliteSpawns` (engine/elites.ts) NIE einen
   * Elite: das komplette Zyklus-/Kill-Fundament ist bereits scharf, aber verhaltens-neutral.
   */
  elites?: Record<string, EliteVariantDef>;
  /**
   * Lager-Gebäude-Katalog (Das Lager / Encampment Phase 1, 0.3.0 — 15 Gebäude × 3 Stufen EXAKT
   * nach design/encampment-balance.md §3). OPTIONAL → Fehlen = Lager komplett inert (campBoost
   * liefert 0, startCampBuild lehnt ab; Alt-/Test-Fixtures unberührt). Reine Content-Daten —
   * der persistierte Fortschritt lebt in `GameState.camp`.
   */
  campBuildings?: CampBuildingDef[];
  /**
   * Taverne (1.2.0, taverne-spec-technik.md §3): die 19 Gäste und ihre Aufgaben-Vorlagen. OPTIONAL → Fehlen =
   * Taverne inert (tavernRefresh besetzt nichts, Seite zeigt die Baustelle). Reine Content-Daten.
   */
  tavernGuests?: TavernGuestDef[];
  tavernTasks?: TavernTaskTemplateDef[];
  /** Jagen (1.2.0): Gebiete mit Stufe, Fallenzeit und XP. OPTIONAL → Fehlen = Jagd inert. */
  huntingZones?: HuntZoneDef[];
}

/** Liefert den Affix+Tier, den ein Runen-Item anbringt — oder null, wenn es keine Rune ist. */
export function runeAffix(content: ContentDB, runeId: ItemId): RuneAffix | null {
  return content.items[runeId]?.rune ?? null;
}

// ammoCapableItemIds: GELÖSCHT (#286 Ammo-Removal) — es gibt keinen Köcher-Slot mehr.

// ───────────────────────────────────────────────────────────────────────────
// Charakter & Laufzeit-Zustand (serialisierbar → Save & Multiplayer-Sync)
// ───────────────────────────────────────────────────────────────────────────

export interface CharacterState {
  name: string;
  /** Verweis auf ein (späteres) Portrait-Bild. null = leerer Platzhalter. */
  portraitId: string | null;
  /** Bei der Account-Erstellung gewähltes Charakter-Portrait (ID, z.B. "char_1"). Rein kosmetisch. */
  portrait: string;
  createdAt: number;
  /** Innate Attribut-Basis (gleicher Startwert für alle; reine Hybrid-Progression). */
  baseAttributes: Record<AttributeId, number>;
  /** Zuletzt verbuchtes Gesamtlevel (rein informativ; Attribute leiten sich aus Skills/Gear ab). */
  totalLevel: number;
  /** Gewählter Nahkampf-Stil (XP-Routing + Bonus). */
  combatStyle: CombatStyle;
  /** Fernkampf-Stance (OSRS: Präzise/Schnell/Defensiv). */
  rangedStance: RangedStance;
  /** Magie-Stance (Offensiv/Defensiv). */
  magicStance: MagicStance;
  /** Aktuelle HP (Maximum wird aus den Stats abgeleitet). */
  hp: number;
  equipment: Record<EquipSlot, ItemId | null>;
  /** Gewähltes Essen für Auto-Heilung im Kampf (null = keins). */
  food: ItemId | null;
  /** Gekaufte Auto-Eat-Upgrade-Stufe (0 = Basis). Hebt Schwelle & Heil-Effizienz. */
  autoEatTier: number;
  /**
   * Frei justierbare Auto-Eat-Ess-Schwelle (HP-Anteil 0..1) — NUR auf der Max-Stufe
   * (`AUTO_EAT_MAX_TIER`) wirksam, analog zum Auto-Trank-Slider (Chef-Feature 2026-07-06,
   * SAVE_VERSION 55). Optional/Override: fehlt das Feld (oder unter der Max-Stufe), gilt die feste
   * Tier-Schwelle `autoEatThreshold(tier)`. Alt-Saves defaulten auf `AUTO_EAT_DEFAULT_THRESHOLD`
   * (= aktuelle Max-Tier-Schwelle; seit Balance-Kette Schritt 4: 0.7). Der Kampf liest sie AUSSCHLIESSLICH
   * über `effectiveAutoEatThreshold`; sanitizeState klemmt (falls gesetzt) auf
   * [AUTO_EAT_MIN_THRESHOLD, AUTO_EAT_MAX_THRESHOLD].
   */
  autoEatThreshold?: number;
  /**
   * Auto-Trank-Einstellungen (Heiltrank-Auswahl + Schwelle + Auto-Rebuff für Tonika).
   * Persistiert (SAVE_VERSION 49); Alt-Saves defaulten auf `defaultAutoPotion()` (alles aus).
   */
  autoPotion: AutoPotionSettings;
  /** Gold (Währung). */
  gold: number;
  /**
   * Quest-Tokens (Zweit-Währung, Task #271, SAVE_VERSION 56 — analog `gold`): werden beim
   * Quest-Claim über `QuestDef.tokenReward` gutgeschrieben und im kommenden Token-Shop
   * ausgegeben (`spendQuestTokens`, engine/quests.ts). Alt-Saves defaulten auf 0.
   */
  questTokens: number;
  /** Aktuelles Mana (Maximum wird aus den Stats abgeleitet). */
  mana: number;
  /**
   * Aktueller Ward-Absorptionspool des Stoff-Stils (analog hp/mana; Maximum `maxWard` aus den Stats).
   * Persistiert (SAVE_VERSION 50). Lädt bei Alt-Saves als 0 und wird beim ersten computeStats/
   * Kampfstart auf `maxWard` geklemmt. combat-dev (A2) füllt/absorbiert/lädt ihn im Fight (Spec §1.4/§1.5).
   */
  ward: number;
  /** Aktive zeitlich begrenzte Buffs. */
  buffs: ActiveBuff[];
  /**
   * Aktuell ausgerüstetes Begleiter-Pet (genau eins aktiv). null = kein Begleiter.
   * Muss in `ownedPets` enthalten sein, um wirksam zu sein (Engine-Helfer prüfen das).
   */
  companionPetId: PetId | null;
  /**
   * Set der besessenen Pets (PetId → true). O(1)-Lookup, JSON-stabil. Wird über
   * den Pet-Drop-Wurf (engine/pets.ts `tryPetDrop`) befüllt. KEIN Pity-Zähler nötig.
   */
  ownedPets: Record<PetId, true>;
  /**
   * Instanz-Detail je Ausrüstungs-Slot, wenn das getragene Item modifiziert ist (Affix/Suffix).
   * `equipment[slot]` hält weiter die Basis-ID (Equipment-lesender Code läuft unverändert);
   * `equippedInstances[slot]` trägt die Modifikation MIT — so reist die Verzauberung beim
   * Ausrüsten/Ablegen mit (Architektur-B-Kern). Slot fehlt = plain Item. Invariante (sanitizeState):
   * `equippedInstances[slot]` existiert nur, wenn `equipment[slot] === equippedInstances[slot].baseItemId`.
   */
  equippedInstances: Partial<Record<EquipSlot, ItemInstance>>;
}

/**
 * Abgeleitete Kampfwerte — werden NIE gespeichert, sondern bei Bedarf aus
 * Attributen + Skills + Ausrüstung berechnet (siehe engine/computeStats).
 */
export interface DerivedStats {
  attributes: Record<AttributeId, number>;
  /**
   * Σ aktiver Skill-Level-Boosts (Itemization 2.0 §4, OSRS-Stil) aus Ausrüstung + Sets +
   * Suffix-Rolls. Bereits in die Kampfterme dieses Stat-Blocks eingerechnet (effektive Level);
   * ui-dev liest das Feld für die Anzeige „42/99 (+2)" an den 6 Kampf-Skills (§4.5).
   */
  skillBoosts: SkillBoostMap;
  /** Aktiver Kampfstil (aus der ausgerüsteten Waffe; Standard "melee"). */
  style: WeaponStyle;
  /**
   * MITTLERER Schaden des aktiven Stils = (attackDamageMin + attackDamageMax) / 2 — die einzige
   * Budget-/Anzeige-Quelle (Waffen 2.0 §1.2). Bei Legacy-Waffen identisch zum bisherigen Flat-Wert.
   */
  attackDamage: number;
  /**
   * Untere/obere Kante der Schadensspanne des aktiven Stils gegen 0-Defense (Waffen 2.0 §1.2):
   * Charakter-Anteil + Waffen-damageMin/Max (Pfeilschaden ist seit #287 in die Bogen-Spanne
   * eingebacken — kein Ammo-Zuschlag mehr, #286). UNGERUNDET (UI rundet, §7.3); combat.ts rollt
   * NON-Crits uniform in der mitigierten Spanne. Legacy-Waffen (ohne damageMin/Max) leiten die
   * Spanne aus dem Flat ab: max = Flat×DMG_MAX_HIT_MULT, min = max×DMG_ROLL_FLOOR
   * — bisheriges Wurf-Verhalten bleibt erhalten.
   */
  attackDamageMin: number;
  attackDamageMax: number;
  /** Maximaler Treffer (= attackDamageMax, UNGERUNDET — Anzeige mit 1 Dezimale, §7.1). */
  maxHit: number;
  /** Minimaler Treffer (= attackDamageMin, UNGERUNDET — untere Kante der Schadensspanne). */
  minHit: number;
  maxHp: number;
  maxMana: number;
  /** Mana-Regeneration pro Sekunde. */
  manaRegen: number;
  /** HP-Regeneration pro Sekunde aus Ausrüstung/Set/Buffs (z.B. Regenerations-Food). 0 = keine. */
  hpRegenPerSec: number;
  meleeDamage: number;
  rangedDamage: number;
  magicDamage: number;
  /**
   * Mitigations-Quelle = `armorRating · defMult` (Rüstungs-Trinität Spec §1.1/§3). combat.ts rechnet
   * daraus die Reduktion `def/(def+DEFENSE_MITIGATION_K)` (auf DEFENSE_MITIGATION_MAX gedeckelt) — wie
   * gehabt. Seit Itemization 2.5 KEIN Attribut-Term mehr (CON/WIS/defence-Skill sind raus); CON zahlt
   * nur noch auf maxHp, Defense kommt ausschließlich aus der Platten-Klassen-Schicht.
   */
  defense: number;
  /** Roh-Armor VOR der Reduktion (= Σ armorRating + 2H-Melee-Bonus, OHNE defMult). UI zeigt reduction% daraus. Spec §2.3. */
  armorRating: number;
  /** Max. Ward-Absorptionspool (Stoff): `int·WARD_CORE_PER_INT + Σ wardCapacity`. 0 ohne Stoff. Spec §1.4. */
  maxWard: number;
  /** Flache Leder-Ausweichchance (0..1, bereits auf DODGE_CAP gedeckelt). 0 ohne Leder. Spec §1.3. */
  dodgeChance: number;
  /** Schild-Block-Chance (0..1, auf BLOCK_CAP gedeckelt). 0 bei 2H/kein Schild. Spec §1.2. */
  blockChance: number;
  /**
   * Ward-Regeneration pro SEKUNDE aus dem Warding-Skill (Armor-Iteration 2 §9.2):
   * `min(WARDING_REGEN_CAP, wardingLevel·WARDING_REGEN_PER_LEVEL) · (magicStance==="defensive" ? 1.5 : 1)`.
   * 0 ohne Warding-Level. combat-dev (Phase B) wendet es pro Tick an (analog hpRegenPerSec), zusätzlich
   * zum Cast-Recharge (rechargeWard). Gesamt-Ward-Regen bleibt ≪ Endgame-DPS-in.
   */
  wardRegenPerSec: number;
  accuracy: number;
  evasion: number;
  /** 0..1 */
  critChance: number;
  /** Multiplikator, z.B. 1.5 = +50 % */
  critDamage: number;
  attackIntervalMs: number;
  /** Lebensraub (0..1): Anteil des angerichteten Schadens, der den Spieler heilt. */
  lifestealPct: number;
  /**
   * Multiplikative Schadensreduktion des Spielers (0..PET_SKILL_EFFECT_CAP.damageReduction).
   * Quelle: aktives Pet mit Passiv `damageReduction` (#276 §4.2, carapace „Stoneshell" 3 %).
   * combat-dev (Schritt 2) wendet sie in der Gegner→Spieler-Pipeline NACH Armor/Ward/Block an:
   * `damage = max(1, round(damage × (1 − damageReduction)))`. 0 ohne passendes Pet.
   */
  damageReduction: number;
  // ── Combat-Depth / Konter-Play-Stats (design/combat-depth-spec.md §3.3) ────────────────────────
  // Aggregiert aus der Waffen-Signatur (+ künftig Runen/Skills), je auf ihren Cap geklemmt. combat.ts
  // (Phase B) liest sie im resolveAttack gegen die Gegner-Verteidigungs-Trinität; 0 ohne Signatur.
  /** Armor-Pen: Anteil der Gegner-Mitigation, den der Spieler ignoriert (0..ARMOR_PEN_CAP). Konter zu `armor`-Gegnern. */
  armorPen: number;
  /** Precision: Anteil der Gegner-Evasion, den der Spieler ignoriert (0..PRECISION_CAP). Konter zu `evasion`-Gegnern. */
  precision: number;
  /** Ward-Break: Anteil eines Treffers, der den Gegner-Ward-Pool umgeht (0..WARD_BREAK_CAP). Konter zu `ward`-Gegnern. */
  wardBreak: number;
}

/** Serialisierbarer RNG-Zustand → deterministische, reproduzierbare Läufe. */
export interface RngState {
  state: number;
}

export interface SkillState {
  xp: number;
}

/** Ein Eintrag im Kampf-Log (Schlagabtausch-Feed). */
export interface CombatEvent {
  /** Monoton steigende ID → UI erkennt neue Treffer (Schadenszahlen). */
  seq: number;
  by: "player" | "enemy";
  kind:
    | "hit"
    | "crit"
    | "miss"
    | "kill"
    | "defeat"
    | "heal"
    | "shield"
    | "block"
    | "status"
    | "dot"
    | "lifesteal"
    | "loot"
    | "xp"
    | "gold"
    | "pet"
    | "petAbility";
  amount: number;
  /** Für kind === "status" (welcher Effekt ausgelöst) bzw. "dot" (welcher DoT Schaden tickt). */
  status?: StatusType;
  /**
   * Nur für kind === "loot" / "petAbility"(stealDrop): welches Item betroffen ist (amount = Menge).
   * Zusätzlich für heilende Item-Quellen (source "potion"/"food"): die Item-ID fürs Quell-Icon.
   */
  itemId?: ItemId;
  /**
   * Task #220 — QUELLE einer Heilung/Absorption (für Icon + Klartext im Combat-Log/Floating-Text).
   * Gesetzt bei kind "heal" (potion=Auto-Trank, food=Auto-Eat, kill=Heal-on-Kill, effect=Pet-/sonst.
   * Heil-Effekt, lifesteal=Pet-Lebensraub-Burst), kind "lifesteal" (lifesteal=Gear-Lebensraub aus
   * Ausrüstung/Set/Buffs; meleeLifesteal=der STIL-Lebensraub des Nahkampfs, E+-Paket
   * battle-040-dramaturgie §E+ — vorher heilte er stumm ohne Event) und kind "shield" (ward=
   * Ward-Absorb am Spieler, effect=Pet-Schild/-Block). Rein additiv/optional.
   */
  source?: "potion" | "food" | "lifesteal" | "meleeLifesteal" | "kill" | "effect" | "ward";
  /**
   * Task #220 — nur für SPIELER-Angriffs-Schaden auf den Gegner (kind "hit"/"crit" mit by "player"):
   * `rawDamage` = Schaden VOR der Gegner-Mitigation (effDef-Reduktion), `mitigated` = der davon von der
   * Gegner-Rüstung geschluckte Betrag (rawDamage − finalDamage). Es gilt `rawDamage − mitigated === amount`.
   * `mitigated > 0` nur gegen einen Rüstungs-Gegner (defense>0), `=== 0` gegen einen defense-0-Gegner.
   * Rein additiv/optional — die UI zeigt daraus „18 (26 − 8 / Gegner-Rüstung)".
   */
  rawDamage?: number;
  mitigated?: number;
  /**
   * Chef-Fix nach Spieler-Report "Hollow Choir: I miss 9/10" (voll absorbierte Treffer sahen wie
   * Misses aus): nur für SPIELER-Angriffs-Schaden auf einen Ward-Gegner (kind "hit"/"crit" mit
   * by "player") — der in DIESEM Schlag vom Gegner-Ward-Pool geschluckte Betrag. Nur gesetzt wenn
   * > 0 (Gegner ohne Ward bzw. mit leerem Pool: Feld fehlt). `amount` bleibt wie bisher der
   * tatsächliche HP-Schaden (bei Voll-Absorption 0) — rein additiv, kein neuer Log-`kind`.
   */
  absorbed?: number;
  /**
   * E+-Paket (battle-040-dramaturgie §E+, Chef-GO 2026-08-03) — nur für kind === "miss": WARUM der
   * Angriff ausblieb. "shock" = Schock-Aussetzer (der Geschockte setzt seinen Schlag aus; beide
   * Seiten), "dodge" = Leder-Dodge des Spielers (voll ausgewichener Gegner-Treffer, by "enemy").
   * Fehlt (undefined) beim ECHTEN Fehlschlag des Accuracy-Contests. Rein additiv/optional —
   * bestehende miss-Konsumenten (Floater/SFX/Filter-Kategorien) lesen es nicht, nur der
   * Log-Zeilen-TEXT unterscheidet. Persistenz: Log-Einträge laufen beim Load verbatim durch
   * (nur Längen-Cap, keine kind-/Feld-Allowlist) — kein SAVE_VERSION-Bump.
   */
  missReason?: "shock" | "dodge";
  /** Nur für kind === "xp": welcher Skill die Kill-XP erhalten hat. */
  skill?: string;
  /** Nur für kind === "petAbility": welches Pet die Ability ausgelöst hat (für UI/Animation). */
  petId?: PetId;
  /** Nur für kind === "petAbility": welche Ability ausgelöst wurde (Beschreibung/Animation). */
  ability?: PetAbilityKind;
}

/**
 * Laufender Kampf. Spieler und Gegner haben je einen eigenen Angriffs-Timer
 * (tempo-basiert, kein Abwechseln). `monsterId === null` = kein Kampf aktiv.
 */
export interface CombatState {
  monsterId: MonsterId | null;
  enemyHp: number;
  /**
   * Combat-Depth #223 (Spec §3.2): transienter Gegner-Ward-Absorptionspool VOR den HP, per-Encounter.
   * combat.ts (Phase B) setzt ihn bei Encounter-Start (startCombat/Respawn/Dungeon-Welle) auf
   * `monster.wardCapacity ?? 0` (frischer Voll-Pool, KEIN Regen) und lazy auf `wardCapacity`, falls ein
   * Alt-Save mitten im Kampf das Feld nicht trägt. Ward-Break umgeht ihn anteilig, der Rest wird
   * absorbiert, bis er leer ist. Rein transient wie `effectCounters`/`lastKill` — der Load-Pfad baut
   * `combat` über eine Feld-Whitelist neu auf (nicht enthalten ⇒ verworfen), daher KEIN SAVE-Bump.
   * Gegner mit `wardCapacity` 0/undefined ⇒ Pool 0 ⇒ der Ward-Schritt ist ein No-op (bit-identisch).
   */
  enemyWard?: number;
  playerTimerMs: number;
  enemyTimerMs: number;
  kills: number;
  /** Zähler für die nächste Event-seq. */
  eventCount: number;
  /** Aktive Statuseffekte auf dem Gegner (von Magie). */
  enemyEffects: StatusEffect[];
  /** Aktive Statuseffekte auf dem Spieler (z.B. Gift von Gegnern). */
  playerEffects: StatusEffect[];
  log: CombatEvent[];
  /** Aktiver Dungeon-Run (null = normaler Kampf). */
  dungeonId: string | null;
  /** Index der aktuellen Gegner-Welle im Dungeon. */
  encounterIndex: number;
  /**
   * Aktive Paragonturm-Etage (dungeon-rework-spec §7, SAVE_VERSION 61). Gesetzt ⇒ der laufende
   * Kampf ist ein Turm-Kampf: combatStep löst den Gegner über die synthetisch skalierte
   * Monster-Instanz auf (engine/paragon.ts — Stats per Formel aus Etage + Basis-Monster,
   * deterministisch aus (paragonFloor, monsterId) rekonstruierbar → nur die Etagen-Nummer
   * muss persistieren). undefined = kein Turm-Kampf. WIRD persistiert (ein mitten in der
   * Etage gespeicherter Kampf läuft nach dem Load korrekt skaliert weiter); sanitize erzwingt
   * paragonFloor === paragon.checkpoint + 1 (sonst wird der Kampf strikt beendet — der
   * Checkpoint bleibt, kein Verlust). Invariante: nie gleichzeitig mit `dungeonId` gesetzt.
   */
  paragonFloor?: number;
  /**
   * Aktive Elite-Kampf-Variante (design/elite-spawns-concept.md, SAVE_VERSION 71→72). Gesetzt ⇒ der
   * laufende Kampf ist ein Elite-Kampf: combatStep löst den Gegner über die synthetisch skalierte
   * Monster-Instanz auf (engine/elites.ts `eliteScaledMonster` — Stats per `EliteVariantDef.
   * statMults`, deterministisch aus (eliteVariantId, monsterId) rekonstruierbar, Muster
   * `paragonFloor`). undefined = kein Elite-Kampf. WIRD persistiert (ein mitten im Kampf
   * gespeicherter Elite-Fight läuft nach dem Load skaliert weiter — der Zonen-ZYKLUS selbst tickt
   * offline NICHT, aber ein BEREITS laufender Kampf ist davon unabhängig und darf offline zu Ende
   * gekämpft werden, „spielerfreundlich", Konzept §1.2). Invariante: nie gleichzeitig mit
   * `dungeonId`/`paragonFloor` gesetzt (`startEliteCombat` verlangt `monsterId === null`).
   */
  eliteVariantId?: string;
  /**
   * `state.elapsedMs` beim `startEliteCombat` (§Champion-Codex, „Jagd-Paket" S2/M, Chef-GO
   * 2026-07-22) — Messgrundlage für `EliteCodexEntry.fastestKillMs` (`onEliteKilled` bildet
   * `state.elapsedMs − eliteFightStartMs`). TRANSIENT wie `lastKill`/`effectCounters`: NICHT
   * persistiert (der Load-Pfad baut `combat` über eine Feld-Whitelist neu auf, die dieses Feld
   * NICHT enthält) — ein über Save/Load unterbrochener Elite-Fight verliert seinen Startzeitpunkt,
   * `fastestKillMs` bleibt für DIESEN einen Kill dann einfach unverändert (kein Crash, keine
   * Fehlmessung). undefined außerhalb eines laufenden Elite-Kampfs.
   */
  eliteFightStartMs?: number;
  /** Laufzeit-Zustand des getriggerten Pet-Ability-Systems (siehe `PetAbilityKind`). */
  petAbility: PetAbilityRuntime;
  /**
   * Verbleibender Auto-Eat-Cooldown (ms). >0 ⇒ noch nicht wieder essbar. Transient pro Kampf, zählt
   * pro Tick herunter. Optional/Alt-Saves: undefined ⇒ 0 (sofort essbar), daher kein Migrations-Zwang.
   */
  autoEatCooldownMs?: number;
  /**
   * Verbleibender Auto-Trank-Cooldown (ms), analog `autoEatCooldownMs` (transient pro Kampf,
   * zählt pro Tick herunter; Alt-Saves: undefined ⇒ 0 = sofort trinkbar). Eigener, LÄNGERER
   * Cooldown (AUTO_POTION_COOLDOWN_MS) — getrennt vom Auto-Eat-Takt.
   */
  autoPotionCooldownMs?: number;
  /** Stalemate-Tracking (transient): niedrigster je erreichter Gegner-FORTSCHRITTSWERT dieser
   *  Begegnung — seit Dungeon-Welle 0 (Patt-Ward-Fix, dungeon-rework-spec §E1) HP + Ward,
   *  damit Ward-Abbau als Fortschritt zählt. Feldname bleibt aus Transienz-Gründen unverändert. */
  enemyHpLow?: number;
  /** Stalemate-Tracking (transient): ms ohne neuen Tiefstwert (Reset bei jedem neuen Tief / neuen Gegner). */
  noProgressMs?: number;
  /**
   * Grund des letzten automatischen Kampf-Stopps (für UI-Hinweis). undefined = manuell/normal beendet.
   * "defeated" = Spieler-Niederlage: der Kampf ENDET (kein Auto-Neustart), der Spieler muss den Gegner
   * nach Vorbereitung manuell neu wählen (das Todes-Popup im Renderer feuert auf `stats.deaths`).
   */
  stopReason?: "stalemate" | "defeated";
  /**
   * Kill-Cooldown: Rest-ms der Kampf-Pause nach einem Kill (`KILL_COOLDOWN_MS`). >0 ⇒ der nächste
   * Gegner steht zwar schon in `monsterId`/`enemyHp` (voll), aber es finden KEINE Angriffe statt
   * (beide Seiten pausieren; Spieler-DoTs/Auto-Eat/Regen laufen weiter). combatStep zählt pro Tick
   * herunter — deterministisch, auch offline. Ein manueller `startCombat` bricht den Cooldown NICHT
   * ab (Rest wird übernommen). WIRD persistiert (Sweep6 T7-F1: „gilt IMMER" schließt Save/Load ein;
   * vorher übersprang jeder Reload den Rest). Additiv-optional: Alt-Saves ohne Feld ⇒ undefined =
   * kein Cooldown; sanitizeState klemmt auf (0, KILL_COOLDOWN_MS].
   */
  cooldownRemainingMs?: number;
  /**
   * Kill-Summary des letzten Kills (transient, fürs UI): was DIESER Kill an XP/Loot/Gold vergeben hat.
   * Wird bei jedem Kill mit Respawn/Dungeon-Welle befüllt und läuft mit dem Kill-Cooldown ab
   * (`expiresInMs` zählt im Gleichschritt mit `cooldownRemainingMs`; bei 0 wird das Feld entfernt).
   * Beim Dungeon-ABSCHLUSS (letzte Welle) bewusst NICHT gesetzt (kein Cooldown → würde nie ablaufen).
   * NICHT persistiert (reine Anzeige): nach einem Reload läuft der Rest-Cooldown weiter
   * (`cooldownRemainingMs` wird persistiert), nur die Summary-Anzeige fehlt — kosmetisch, kein Exploit.
   */
  lastKill?: LastKillSummary;
  /**
   * Abschluss-Summary des JÜNGSTEN Dungeon-Clears (transient, fürs UI — Clear-Zeremonie, SAVE 83
   * „Dungeons queuebar"): seit Queue-Dungeon-Läufe nach dem Endboss im SELBEN Tick von vorn
   * beginnen, sieht die UI den Übergang „dungeonId gesetzt → null" NICHT mehr und `combat.log`
   * wird vom Neustart geleert — dieses Feld ist der stabile Vertrag: `grantDungeonRewards` setzt
   * es beim Clear (aus den soeben geloggten Belohnungs-Einträgen, kein RNG), startDungeon/
   * startCombat tragen es über den Neustart mit (wie `lastKill`); die UI erkennt einen neuen Clear
   * an `clearNo` (== `dungeonsCleared[dungeonId]` nach dem Clear, monoton). NICHT persistiert
   * (Load-Whitelist, kein Save-Bump-Anteil) — nach einem Reload gibt es keine Zeremonie nachzuholen.
   */
  lastDungeonClear?: DungeonClearSummary;
  /**
   * Transienter XP-Akkumulator der LAUFENDEN Begegnung (Quelle für `lastKill.xpBySkill`): tatsächlich
   * vergebene Kampf-XP je Skill seit dem Spawn dieses Gegners (inkl. earlyXpMult/Pet-Multiplikatoren).
   * Wird beim Kill in `lastKill` übernommen und für den nächsten Gegner geleert. Nicht persistiert.
   */
  encounterXp?: Record<SkillId, number>;
  /**
   * Transiente Zähler der Spezial-Waffeneffekte (Waffen 2.0 §2.3.4). Existiert NUR, solange
   * mindestens ein Spezial-Effekt ausgerüstet ist und ein Kampf läuft. NIE persistiert (der
   * Load-Pfad baut `combat` über eine Feld-Whitelist neu auf — analog lastKill/encounterXp).
   * Reset-Semantik: per-Begegnung-Zähler (momentum/firstHit/hitCount/vengeance) resetten bei
   * Kampfende, Tod UND Gegnerwechsel; die „nächster-Gegner"-Übergaben (overkillCarry/plague)
   * überleben genau EINEN Gegnerwechsel und verfallen bei Kampfende.
   */
  effectCounters?: EffectCounters;
}

/** Transiente Spezial-Effekt-Zähler (siehe `CombatState.effectCounters`). */
export interface EffectCounters {
  /** momentum: aktuelle Treffer-Stapel (0..stacks). */
  momentumStacks: number;
  /** firstStrike/eagleEye: der erste Treffer dieser Begegnung ist bereits gefallen. */
  firstHitDone: boolean;
  /** everyNth: gelandete Treffer dieser Begegnung. */
  hitCount: number;
  /** vengeance: nächster eigener Treffer ist gebufft (gesetzt durch erlittenen Treffer). */
  vengeancePrimed: boolean;
  /** overkillCarry: Überschuss-Schaden des letzten Todesstoßes → trifft den nächsten Gegner. */
  overkillCarry: number;
  /** plaguebearer: der nächste Gegner startet mit diesem Gift (null = nichts übergeben). */
  plague: { magnitude: number; durationMs: number } | null;
}

/** Frische (leere) Spezial-Effekt-Zähler. */
export function createEffectCounters(): EffectCounters {
  return {
    momentumStacks: 0,
    firstHitDone: false,
    hitCount: 0,
    vengeancePrimed: false,
    overkillCarry: 0,
    plague: null,
  };
}

/**
 * Kill-Summary fürs UI (siehe `CombatState.lastKill`): die Belohnungen, die EIN Kill vergeben hat.
 * XP = über die ganze Begegnung tatsächlich vergebene Kampf-XP je Skill (Offense-Split/Vitality/
 * Kill-Bonus/Slayer — nach allen Multiplikatoren), Loot/Gold = die Würfe dieses Kills.
 */
export interface LastKillSummary {
  monsterId: MonsterId;
  /** Tatsächlich vergebene XP je Skill (Summe = alles, was diese Begegnung an XP ausgeschüttet hat). */
  xpBySkill: Record<SkillId, number>;
  /** Gedroppte Items dieses Kills (qty = tatsächlich vergebene Menge inkl. Suffix-Instanz). */
  loot: Array<{ itemId: ItemId; qty: number }>;
  /** Vergebenes Gold dieses Kills (inkl. Streuung). */
  gold: number;
  /** Rest-Anzeigezeit (ms); zählt im Gleichschritt mit dem Kill-Cooldown herunter. */
  expiresInMs: number;
  /**
   * Blutmond-Jackpot (Task #337, §doubleLootChance): true ⇔ der Samstags-Segen hat den GESAMTEN
   * Loot DIESES Kills verdoppelt (`loot`-Mengen enthalten die Verdopplung bereits). Rein fürs UI
   * (Jackpot-Moment feierbar); wie die ganze Summary transient/NICHT persistiert — kein Save-Bump.
   */
  bloodMoonProc?: boolean;
}

/**
 * Abschluss-Summary eines Dungeon-Clears (`CombatState.lastDungeonClear`, transient, SAVE 83
 * „Dungeons queuebar"): die Abschluss-Belohnung (Clear-Gold inkl. Erst-Clear-Bonus, Lebenskraft-XP,
 * Clear-Loot) exakt so, wie `grantDungeonRewards` sie geloggt hat — NICHT die Wellen-Kills und
 * NICHT die Vor-Boss-Truhe (die fließen wie bisher über `lastKill`/`combat.log`).
 */
export interface DungeonClearSummary {
  dungeonId: string;
  /** Wievielter Clear dieses Dungeons (== `dungeonsCleared[dungeonId]` nach dem Clear) — monoton, eindeutig je Clear. */
  clearNo: number;
  /** true ⇔ dies war der ERSTE Clear dieses Dungeons (Erst-Clear-Bonus: Clear-Gold doppelt, §5.1.3). */
  firstClear: boolean;
  /** Tatsächlich gutgeschriebenes Clear-Gold (inkl. Segen/Schrein, inkl. Erst-Clear-Verdopplung). */
  gold: number;
  /** Tatsächlich vergebene Abschluss-XP (Lebenskraft, gerundet wie die Log-Zeile). */
  xp: number;
  /** Clear-Loot (qty = tatsächlich vergebene Menge inkl. Suffix-Instanz), gleiche itemIds gemergt. */
  loot: Array<{ itemId: ItemId; qty: number }>;
}

/**
 * Transienter Laufzeit-Zustand der getriggerten Pet-Ability (nur das aktive Pet, kein Stacking).
 * Alle Felder defaulten auf 0/false; Persistenz defaultet sie für Alt-Saves (SAVE_VERSION 31).
 */
export interface PetAbilityRuntime {
  /** Akkumulierte Zeit (ms) Richtung `combatAbility.intervalMs` → Trigger bei Erreichen. */
  timerMs: number;
  /** Verbleibender Absorb-Pool (HP) aus `shield`; fängt eingehenden Schaden ab. */
  shieldHp: number;
  /** `blockNextEnemyHit`: der nächste Gegner-Treffer wird komplett geblockt. */
  blockNextHit: boolean;
  /** `stun`: Restzeit (ms), in der der Gegner-Angriffs-Timer eingefroren ist. */
  enemyStunMs: number;
  /** `accuracyDownEnemy`: Restzeit (ms) + Magnitude (Bruch) des Accuracy-Abzugs. */
  enemyAccDownMs: number;
  enemyAccDownPct: number;
  /** `armorRend`: Restzeit (ms) + Magnitude (Bruch), um die der Gegner mehr Schaden nimmt. */
  enemyVulnMs: number;
  enemyVulnPct: number;
}

/** Frischer (leerer) Pet-Ability-Laufzeitzustand. */
export function createPetAbilityRuntime(): PetAbilityRuntime {
  return {
    timerMs: 0,
    shieldHp: 0,
    blockNextHit: false,
    enemyStunMs: 0,
    enemyAccDownMs: 0,
    enemyAccDownPct: 0,
    enemyVulnMs: 0,
    enemyVulnPct: 0,
  };
}

/** Ein Inventar-Slot. Stackables stapeln unbegrenzt in einem Slot. */
export interface InventorySlot {
  itemId: ItemId;
  qty: number;
  /**
   * LEGACY (vor SAVE_VERSION 53): ein Slot konnte eine non-stackable `ItemInstance` halten. Seit v53
   * leben Instanzen in der unbegrenzten `InventoryState.instances`-Tasche (Kapazitäts-Explosion, #246);
   * `migrateState` zieht Alt-Save-Slot-Instanzen dorthin um. Das Feld bleibt nur, damit Migration/
   * Sanitize Alt-Saves lesen können — NEUER Code schreibt es nie mehr. Vorhanden bei Alt-Saves ⇒ `itemId`
   * spiegelt `instance.baseItemId`, `qty` ist 1.
   */
  instance?: ItemInstance;
}

/**
 * Grid-Inventar (Melvor-Stil). Die effektive Kapazität = `baseCapacity` (per Gold-Shop-Upgrade
 * `buySlotUpgrade` erhöhbar). `slots.length` wird stets auf die effektive Kapazität synchron
 * gehalten; leere Plätze sind null. Ist `slots.length` nach einer Migration GRÖSSER als die
 * Kapazität (z.B. Pouch-Entfall, SAVE_VERSION 56), bleiben belegte Slots erhalten — nur neue
 * Aufnahme ist begrenzt, bis wieder Platz frei ist.
 */
export interface InventoryState {
  /** Inhärente Slots, per Shop-Upgrade erhöhbar. */
  baseCapacity: number;
  /**
   * @deprecated LEGACY (Task #271, SAVE_VERSION 56): das Taschenslot-System ist entfernt —
   * Kapazität kommt NUR noch aus `baseCapacity`. `migrateState` leert das Array; neuer Code
   * schreibt es nie mehr. Bleibt nur, bis ui-dev die Taschen-Leiste (CharacterPage) entfernt hat.
   */
  bagSlots: Array<ItemId | null>;
  slots: Array<InventorySlot | null>;
  /**
   * UNBEGRENZTE Instanz-Tasche (Varianten-Container, SAVE_VERSION 53, #246): non-stackable
   * `ItemInstance`n (verzaubert/gesuffixt) liegen hier statt je einem eigenen `slots`-Platz — sonst
   * explodiert der Platzbedarf bei vielen Varianten. Kein Kapazitäts-Limit (`addInstance` schlägt nie
   * fehl); spiegelt `bankInstances` (Gear-Vault) fürs Inventar. Die UI rendert je Basis-Item EINE
   * Container-Zelle (`groupInstancesByBase`).
   */
  instances: ItemInstance[];
}

/** Start-Slots des Basis-Inventars. */
export const BASE_INVENTORY_SLOTS = 20;

/** Vorheriger Default der Start-Slots (für Save-Migration: Alt-Saves auf 20 padden). */
export const LEGACY_BASE_INVENTORY_SLOTS = 10;

// BAG_SLOT_COUNT: ENTFERNT (Task #271, SAVE_VERSION 56) — es gibt keine Taschen-Plätze mehr.

/**
 * Basis-Bank-Kapazität = kostenlose Anzahl belegbarer Bank-Slots = distinkter Item-Arten ab Start.
 * Jeder Slot ist ein Stack mit unbegrenzter Stückzahl. Eine neue Item-Art einzulagern belegt einen
 * Slot; ist die Bank voll (alle Slots belegt) und die Art noch nicht im Lager, wird das Einlagern
 * verlustfrei abgelehnt. In bestehende Stacks geht immer. Per Gold AUSBAUBAR (siehe `buyBankSlots`
 * / State-Feld `bankSlotsPurchased`); die effektive Obergrenze liefert `effectiveBankCapacity(state)`.
 * (War vor SAVE_VERSION 41 die fixe `BANK_CAPACITY = 100`; gesenkt auf 60 + ausbaubar als Gold-Sink.)
 */
export const BASE_BANK_CAPACITY = 60;

/** Bank-Slots pro gekauftem Ausbau-Paket (ein Kauf = +BANK_SLOT_PACKAGE distinkte Arten). */
export const BANK_SLOT_PACKAGE = 10;

/**
 * Maximal zusätzlich kaufbare Bank-Slots (Cap). Harte effektive Obergrenze = BASE_BANK_CAPACITY + dies
 * (= 60 + 200 = 260 distinkte Arten). Großzügig fürs Endgame, aber endlich. Vielfaches von
 * BANK_SLOT_PACKAGE, damit Pakete den Cap exakt treffen.
 */
export const MAX_BANK_SLOTS_PURCHASED = 200;

/** Basiskosten des ERSTEN Bank-Slot-Pakets in Gold. */
export const BANK_SLOT_BASE_COST = 5000;

/**
 * Kostenwachstum je bereits gekauftem Paket (eskalierender, mit dem Reichtum mitwachsender Gold-Sink).
 * Preis des n-ten Pakets (0-basiert) = round(BANK_SLOT_BASE_COST · BANK_SLOT_GROWTH^n). Bei 1.6
 * wächst der Preis exponentiell — der Sink läuft im Endgame nie „leer". 1. Paket 5 000 →
 * 2. 8 000 → 3. 12 800 … 20. (Cap) ≈ 37,8 Mio Gold pro Paket (5000·1,6^19).
 */
export const BANK_SLOT_GROWTH = 1.6;

/**
 * Effektive Bank-Kapazität = Basis + gekaufte Zusatz-Slots + Vorratsspeicher-Stufen des Lagers
 * (`bankSlots`-Boost, +4/+4/+6 — Task #359 Welle 2). EINZIGE Quelle der Slot-Obergrenze;
 * alle Nutzer (`canDeposit`/`isBankFull`/Auto-Bank/UI) leiten sich hieraus ab. Defensiv gegen
 * fehlendes/negatives `bankSlotsPurchased` (Alt-Save vor der Migration / manipulierter State)
 * und nicht-ganzzahlige Katalog-Werte (floor). `content` ist seit Welle 2 Pflicht — der
 * Lager-Anteil braucht den Gebäude-Katalog; ohne gebauten Vorratsspeicher exakt der Alt-Wert.
 */
export function effectiveBankCapacity(state: GameState, content: ContentDB): number {
  const campSlots = Math.max(
    0,
    Math.floor(campBoostSum(state.camp, content.campBuildings, "bankSlots")),
  );
  return BASE_BANK_CAPACITY + Math.max(0, state.bankSlotsPurchased ?? 0) + campSlots;
}

/**
 * Belegte Bank-Slots = distinkte Arten mit ECHTEM Bestand (> 0). EINZIGE Zähl-Quelle für die
 * Slot-Belegung — Engine (`bankSlotsUsed`/`canDeposit`/Auto-Bank/`canHoldAnywhere`) und UI leiten
 * sich hieraus ab. [Sweep6 W2-T5-P3] 0-qty-Geister-Keys (Alt-/Korrupt-Save) zählen NICHT:
 * vorher zählten `addItemOrBank` (inventory.ts) und `canHoldAnywhere` (tick.ts) per
 * `Object.keys(bank).length` inklusive Geister — Auto-Bank verwarf Loot still, obwohl manuelles
 * Einlagern (qty>0-Zählung in bank.ts) noch ging. Defensiv gegen Nicht-Zahlen im Record.
 */
export function usedBankSlots(state: GameState): number {
  let n = 0;
  for (const qty of Object.values(state.bank)) {
    if (typeof qty === "number" && qty > 0) n++;
  }
  return n;
}

/** Lebenslange Spielstatistiken. */
export interface PlayerStats {
  kills: number;
  deaths: number;
  /** Insgesamt erhaltene Items (Sammeln/Verarbeiten/Loot). */
  itemsGathered: number;
  /** Insgesamt geschmiedete/verarbeitete Items (Aktionen mit `inputs` → Output). Für craft_items-Quests. */
  itemsCrafted: number;
  /** Geschmiedete Items je Item-ID (für craft_items mit konkretem target). */
  craftedById: Record<ItemId, number>;
  /**
   * Lebenslang ausgegebenes Gold (Shop-Kauf / Upgrades). Kumulativ; nur steigend.
   * Quelle für `gold_spent`-Achievements. Wird dort inkrementiert, wo Gold durch Kauf sinkt.
   */
  goldSpent: number;
  /**
   * Aktuelle Daily-Serie (aufeinanderfolgende Kalendertage mit gezogenen Dailies).
   * Wird in der Daily-Refresh-Logik gepflegt (consecutive++; Lücke → reset). Quelle für `daily_streak`.
   */
  dailyStreak: number;
  /**
   * Letzter Kalendertag (YYYYMMDD), an dem Dailies gezogen wurden — Basis für die Streak-Berechnung.
   * 0 = noch nie. KEIN Achievement-Zähler, nur Hilfszustand für `dailyStreak`.
   */
  lastDailyDay: number;
  /**
   * Taverne (SAVE_VERSION 84, taverne-spec-technik.md §2): je Aktions-ID die Zahl ERFOLGREICH abgeschlossener
   * Durchläufe (tick.ts, online == offline). Baseline-Zähler für "run"-Aufgaben (z.B. Pims Griffe). Migration: {}.
   */
  actionRunsById: Record<ActionId, number>;
  /**
   * Taverne (SAVE_VERSION 84): je Item-ID die Zahl frisch ERZEUGTER Stücke aus Aktionen (tick.ts) UND
   * Feld-Ernten (farming.ts). Baseline-Zähler für "produce"-Aufgaben. Migration: {}.
   */
  producedById: Record<ItemId, number>;
  /** Jagen (SAVE 85): erfolgreiche Fänge gesamt (kein Kill-Zähler, s. Chef-Entscheid J2). Migration: 0. */
  huntCatches: number;
  /** Jagen (28.08.2026): Fänge je Monster-Art; 0/fehlend = Erstfang (HUNT_FIRST_CATCH_MULT). Migration: {}. */
  huntCatchesById: Record<MonsterId, number>;
}

/**
 * Ein vorgeplanter Eintrag der Action-Queue (SAVE_VERSION 70; `kind`-Diskriminator seit 73).
 *
 * kind "action" (Skilling — alle Alt-Save-Einträge werden per v73-Migration so gestempelt):
 *   `actionId` = die Aktivität, `target` = wie mit ihr verfahren wird, sobald sie aktiv ist:
 *   • endliche positive Zahl → so viele Abschlüsse, dann rückt die Queue weiter (wie actionTarget);
 *   • `null` → „bis die Aktion von selbst stoppt" (kein Material / natürlicher Abschluss) — dann
 *     rückt die Queue ebenfalls weiter. (Ein Inventar-voll-Stop schaltet NICHT weiter, s. tick.ts.)
 *
 * kind "fight" (Kampf-Eintrag, Task #312): `monsterId` = das Ziel-Monster (NUR normale
 *   Zonen-Monster — Dungeon-only-Monster lehnt `enqueueFight` ab, Elites sind strukturell nicht
 *   adressierbar), `target` = Kill-Ziel (1/25/50/…; `null` = ∞, läuft bis der Spieler den Kampf
 *   manuell stoppt). Beim Anlaufen poppt der Eintrag in `GameState.queueFight` (Laufzeit-Zähler);
 *   das Zonen-Gate (`canFightMonster`) wird beim START geprüft — ein nicht (mehr) kämpfbares
 *   Monster wird mit Grund übersprungen (`lastQueueSkip`), die Queue läuft weiter.
 *
 * kind "dungeon" (Dungeon-Läufe, SAVE_VERSION 83, Chef-Auftrag 26.08.2026 „Dungeons queuebar"):
 *   `dungeonId` = der Dungeon (bekannte `DungeonDef` mit ≥ 1 Welle — der Paragonturm mit leeren
 *   `encounters` ist strukturell ausgeschlossen, er läuft über startParagonFloor), `target` = Anzahl
 *   LÄUFE (1/25/50/…; `null` = ∞, bis Tod oder manueller Stopp). Ein Lauf ZÄHLT, wenn der Endboss
 *   fällt (`dungeonsCleared[dungeonId]`-Delta pro Tick, engine/tick.ts); danach beginnt der Dungeon
 *   im SELBEN Tick automatisch von vorn (Welle 1), bis das Ziel erreicht ist. Beim Anlaufen poppt
 *   der Eintrag in `GameState.queueDungeon` (Laufzeit-Zähler, s. QueueDungeonRuntime). Das Gate
 *   (`canEnterDungeon`: Quest + Trägerzone) wird beim START geprüft — ein gesperrter/unbekannter
 *   Dungeon wird mit Grund übersprungen (`lastQueueSkip.dungeonId`), die Queue läuft weiter.
 *
 * ÜBERGANGS-SHAPE (bewusst EIN Interface statt Discriminated Union): `actionId` bleibt auf ALLEN
 * Einträgen typ-präsent, weil die bestehende Queue-UI (ActionQueuePanel) `entry.actionId`
 * unkonditioniert liest (`content.actions[entry.actionId]`) — für "fight"-/"dungeon"-Einträge
 * trägt es den Platzhalter `FIGHT_QUEUE_ACTION_ID` (""), den der `if (!action)`-Guard der UI
 * ausblendet, bis die UI-Welle auf `kind` umstellt (isFightQueueEntry/isDungeonQueueEntry unten).
 * Die Engine liest `actionId` für "fight"-/"dungeon"-Einträge NIE.
 */
export interface QueuedAction {
  kind: "action" | "fight" | "dungeon";
  actionId: ActionId;
  /** NUR kind "fight": das Ziel-Monster. Für andere Einträge nie gesetzt. */
  monsterId?: MonsterId;
  /** NUR kind "dungeon" (SAVE_VERSION 83): der Dungeon. Für andere Einträge nie gesetzt. */
  dungeonId?: string;
  target: number | null;
}

/**
 * Platzhalter-`actionId` eines "fight"-Queue-Eintrags (s. QueuedAction-JSDoc „ÜBERGANGS-SHAPE"):
 * "" matcht nie eine echte Aktion — `content.actions[""]` ist undefined, die Alt-UI blendet den
 * Eintrag damit aus, und die Stapel-Regel von `enqueueAction` kann nie fälschlich stapeln.
 */
export const FIGHT_QUEUE_ACTION_ID: ActionId = "";

/** Type-Guard: ist dieser Queue-Eintrag ein Kampf-Eintrag (mit gesetztem Ziel-Monster)? */
export function isFightQueueEntry(
  entry: QueuedAction,
): entry is QueuedAction & { kind: "fight"; monsterId: MonsterId } {
  return entry.kind === "fight" && typeof entry.monsterId === "string";
}

/** Baut einen "fight"-Queue-Eintrag (EINZIGE Konstruktions-Stelle des Übergangs-Shapes). */
export function makeFightQueueEntry(monsterId: MonsterId, target: number | null): QueuedAction {
  return { kind: "fight", actionId: FIGHT_QUEUE_ACTION_ID, monsterId, target };
}

/** Type-Guard: ist dieser Queue-Eintrag ein Dungeon-Lauf-Eintrag (mit gesetztem Dungeon)? */
export function isDungeonQueueEntry(
  entry: QueuedAction,
): entry is QueuedAction & { kind: "dungeon"; dungeonId: string } {
  return entry.kind === "dungeon" && typeof entry.dungeonId === "string";
}

/**
 * Baut einen "dungeon"-Queue-Eintrag (SAVE_VERSION 83; EINZIGE Konstruktions-Stelle — Muster
 * makeFightQueueEntry, gleicher `actionId`-Platzhalter). `target` = Anzahl Läufe, `null` = ∞.
 */
export function makeDungeonQueueEntry(dungeonId: string, target: number | null): QueuedAction {
  return { kind: "dungeon", actionId: FIGHT_QUEUE_ACTION_ID, dungeonId, target };
}

/**
 * Laufzeit des AKTIVEN Queue-Dungeon-Laufs (`GameState.queueDungeon`, SAVE_VERSION 83) — das
 * "dungeon"-Pendant zu `queueFight`: der Eintrag wurde aus der Queue gepoppt (advanceActionQueue →
 * startDungeon) und zählt hier seine Läufe. `remaining` = verbleibende Läufe INKLUSIVE des gerade
 * laufenden (`null` = ∞), `completed` = in diesem Eintrag bereits geschaffte Clears (Anzeige „Lauf
 * completed+1 von completed+remaining", s. dungeonRunProgress in engine/actions.ts). Gezählt wird
 * über das `dungeonsCleared[dungeonId]`-Delta pro Tick (engine/tick.ts) — nur der Endboss-Kill
 * zählt, Tod/Patt/Flucht zählen nie. Invariante nach jedem Tick/Load: gesetzt ⇒
 * `combat.dungeonId === dungeonId && combat.monsterId !== null` (sanitizeState stellt sonst den
 * Rest als "dungeon"-Eintrag zurück an die Queue-Front). Nie gleichzeitig mit `queueFight` gesetzt.
 */
export interface QueueDungeonRuntime {
  dungeonId: string;
  remaining: number | null;
  completed: number;
}

/**
 * Laufzeit des AKTIVEN Queue-Kampfs (`GameState.queueFight`, SAVE_VERSION 73) — das "fight"-Pendant
 * zu `activeActionId`+`actionTarget`: der Eintrag wurde aus der Queue gepoppt (advanceActionQueue →
 * startCombat) und zählt hier seine verbleibenden Kills. `remaining` = Rest-Kill-Ziel (`null` = ∞).
 * Gezählt wird über den Kill-Credit-Zähler (`monsterKills[killCreditMonsterId(...)]`-Delta pro
 * Tick, engine/tick.ts) — NUR Kills des Ziel-Monsters. Invariante nach jedem Tick/Load: gesetzt ⇒
 * `combat.monsterId === monsterId` (sanitizeState stellt sonst den Eintrag zurück an die Queue-Front).
 */
export interface QueueFightRuntime {
  monsterId: MonsterId;
  remaining: number | null;
}

/**
 * Maschinenlesbarer Grund, warum ein Kampf-Queue-Eintrag beim START übersprungen wurde
 * (`GameState.lastQueueSkip`, SAVE_VERSION 73) — Anzeige-Vertrag für die spätere UI-Welle:
 *   • "unknown_monster": Monster existiert nicht (mehr) im Content (z.B. Save-/Content-Drift).
 *   • "not_queueable": Monster ist nicht (mehr) queue-fähig (dungeonOnly — v1 schließt Dungeons aus).
 *   • "gate_locked": Zonen-/Slayer-/Turm-Gate nicht erfüllt (canFightMonster false — z.B.
 *     Story-Zone noch nicht freigespielt, etwa nach einem Save-Wechsel).
 */
export type QueueSkipReason =
  | "unknown_monster"
  | "not_queueable"
  | "gate_locked"
  /** "dungeon"-Eintrag (SAVE 83): Dungeon existiert nicht (mehr) im Content oder hat keine Wellen. */
  | "unknown_dungeon"
  /** "dungeon"-Eintrag (SAVE 83): Gate nicht erfüllt (canEnterDungeon false — Quest/Trägerzone). */
  | "dungeon_locked"
  /**
   * "action"-Eintrag (Chef-Auftrag 27.08.2026, Warteschlangen-Projektion): beim START fehlte das
   * Material (Inventar + Lager) — typisch, weil der Produzent (z.B. „Kupferader ×650") vorher aus
   * der Kette entfernt wurde. Reine Union-Erweiterung, KEIN SAVE-Bump (alte Saves kennen den Grund
   * nicht; die Persistenz-Whitelist prüft ihn beim Laden neu).
   */
  | "no_materials";

/**
 * Breadcrumb des letzten übersprungenen Kampf-/Dungeon-/Aktions-Queue-Eintrags (Muster `lastStop`).
 * Dungeon-Skips (SAVE 83) tragen `dungeonId` und die Gründe `unknown_dungeon`/`dungeon_locked`;
 * Aktions-Skips (27.08.2026) tragen `actionId` und den Grund `no_materials`. `monsterId` ist in
 * beiden Fällen der Platzhalter "" (Übergangs-Shape wie `FIGHT_QUEUE_ACTION_ID` — die bestehende
 * UI liest `monsterId` unkonditioniert). Die UI verzweigt auf `dungeonId` bzw. `actionId`.
 */
export interface QueueSkip {
  monsterId: MonsterId;
  reason: QueueSkipReason;
  dungeonId?: string;
  actionId?: ActionId;
}

export interface GameState {
  version: number;
  rng: RngState;
  totalTicks: number;
  /**
   * Deterministische Sim-Uhr in ms — steigt bei JEDEM Tick, AUCH im Offline-Catch-up. Dient als
   * anti-abuse-feste Uhr (z.B. Farming-Reife, `plantedAtMs`) und NICHT als angezeigte Spielzeit.
   */
  elapsedMs: number;
  /**
   * Aktiv gespielte Zeit in ms — steigt pro Tick NUR im Live-Loop (`advance` ohne `offline`-Flag),
   * NICHT während des Offline-Catch-ups. Das ist die Quelle für die „played"-Zeit im Menü.
   * SAVE_VERSION 43→44: Alt-Saves defaulten auf `elapsedMs` (best effort).
   */
  activePlayMs: number;
  /** Rest-Millisekunden, die noch nicht zu einem vollen Tick gereicht haben. */
  accumulatorMs: number;
  activeActionId: ActionId | null;
  actionProgressMs: number;
  /**
   * Ziel-Zähler für die aktive Aktion (Mengen-Craft 1/5/10). Zählt verbleibende Abschlüsse; bei
   * jedem abgeschlossenen Aktions-Durchlauf um 1 verringert. Erreicht er 0 → Aktion stoppt sauber
   * (wie ein regulärer Stop, KEIN `lastStop`-Hinweis). `null` = unbegrenzt („Alle"/Standard für
   * Gathering — heutiges Endlos-Verhalten). Invariante: `activeActionId === null ⇒ actionTarget === null`.
   */
  actionTarget: number | null;
  /**
   * Action-Queue (SAVE_VERSION 70): vorgeplante Aktivitäten, die NACH der aktiven Aktion der Reihe
   * nach automatisch anlaufen. Ist die aktive Aktion fertig (Ziel erreicht ODER kein Material mehr),
   * poppt die Engine `actionQueue[0]` und startet ihn via `setActiveAction` (advanceActionQueue in
   * engine/actions.ts). Ein Inventar-voll-Stop schaltet BEWUSST nicht weiter (der Spieler soll erst
   * das Inventar leeren). Manuelles `setActiveAction` lässt die Queue unangetastet. Default `[]`.
   */
  actionQueue: QueuedAction[];
  /**
   * Laufzeit des AKTIVEN Queue-Kampfs (SAVE_VERSION 73, Task #312): der zuletzt aus der Queue
   * gestartete "fight"-Eintrag mit Rest-Kill-Ziel (s. QueueFightRuntime). `null` = kein Queue-Kampf
   * (auch bei manuell gestarteten Kämpfen — die zählen NIE auf ein Queue-Ziel). Endet der Kampf
   * ohne erreichtes Ziel (Tod/Patt/Fremd-Unterbrechung), wandert der Eintrag mit Rest-Ziel zurück
   * an die Queue-Front (engine/tick.ts + actions.ts requeueFightFront). Persistiert.
   */
  queueFight: QueueFightRuntime | null;
  /**
   * Laufzeit des AKTIVEN Queue-Dungeon-Laufs (SAVE_VERSION 83, Chef-Auftrag 26.08.2026): der
   * zuletzt aus der Queue gestartete "dungeon"-Eintrag mit Rest-Lauf-Ziel (s. QueueDungeonRuntime).
   * `null` = kein Queue-Dungeon (auch bei manuell per `startDungeon` betretenen Dungeons — die
   * zählen NIE auf ein Queue-Ziel). Endet der Lauf ohne Clear (Tod/Patt/Fremd-Unterbrechung),
   * wandert der Rest als "dungeon"-Eintrag zurück an die Queue-Front (engine/tick.ts +
   * actions.ts requeueDungeonFront); Tod/Patt pausieren die Queue wie beim Kampf-Eintrag. Flucht
   * (manueller stopCombat) beendet den Eintrag wie beim Kampf-Eintrag (Rest verfällt, Queue läuft
   * ohne Pause weiter). Persistiert; Migration (< 83): null.
   */
  queueDungeon: QueueDungeonRuntime | null;
  /**
   * Queue-Pause (SAVE_VERSION 73): true nach Tod/Patt („Tod pausiert die Queue", Chef-GO #312) —
   * kein Queue-Eintrag läuft automatisch an, bis der Spieler manuell wieder aufnimmt
   * (enqueueAction/enqueueFight/setActiveAction/resumeActionQueue löschen das Flag). Offline wie
   * online identisch (derselbe Tick-Pfad): nach einem Offline-Tod verfällt die Rest-Offline-Zeit
   * für die Queue. Default false.
   */
  queuePaused: boolean;
  /**
   * Grund des zuletzt beim START übersprungenen Kampf-Queue-Eintrags (SAVE_VERSION 73, Muster
   * `lastStop`): maschinenlesbar für die spätere UI („Eintrag X übersprungen: Gate gesperrt").
   * Wird beim nächsten erfolgreichen Kampf-Queue-Start NICHT automatisch geleert (die UI-Welle
   * entscheidet über die Anzeige-Dauer); `startCombat`/`setActiveAction` lassen es unberührt.
   */
  lastQueueSkip: QueueSkip | null;
  character: CharacterState;
  combat: CombatState;
  skills: Record<SkillId, SkillState>;
  inventory: InventoryState;
  stats: PlayerStats;
  /** Freigeschaltete Achievement-IDs. */
  achievements: string[];
  /**
   * Bereits vergebene AP-Meilenstein-Schritte in Prozent (5, 10, … 100 — Vielfache von
   * AP_MILESTONE_STEP_PCT; SAVE_VERSION 66, Welle GG). Vergabe-Stelle: `checkApMilestones`
   * (engine/achievements.ts) am Achievement-Choke-Point. Idempotent + nachholend: ein Alt-Save
   * mit 60 % Quote bekommt beim ersten Check alle Schritte bis 60 % auf einmal (als EIN
   * `lastApMilestone`-Stapel). Claimed bleibt claimed — wächst der Content (Quote sinkt),
   * werden vergebene Schritte NIE neu berechnet oder zurückgefordert.
   */
  claimedApMilestones: number[];
  /**
   * Monotoner Lebenszeit-Zähler der AP-Meilenstein-Vergaben (SAVE 66) und die EINZIGE Quelle
   * der `lastApMilestone.seq`-Werte (Lehre aus Welle DD/petDropSeq: seq NIE aus dem nullbaren
   * Breadcrumb ableiten — die UI quittiert mit null, ein Rückfall auf 1 bliebe unter ihrer
   * seenSeq-Hochwassermarke stumm). Wird NIE genullt oder gesenkt; sanitize erzwingt
   * apMilestoneSeq ≥ lastApMilestone.seq.
   */
  apMilestoneSeq: number;
  /**
   * Letzte AP-Meilenstein-Vergabe (UI-Breadcrumb „Meilenstein erreicht!", Muster `lastPetDrop`,
   * SAVE 66). `steps` = ALLE in dieser Vergabe nachgeholten 5-%-Schritte (Alt-Save-Nachholung
   * kommt als Stapel), `tokens` = Summe der gutgeschriebenen Quest-Tokens, `seq` = Wert von
   * `apMilestoneSeq` zum Vergabe-Zeitpunkt. Die UI quittiert durch Zurücksetzen auf null.
   */
  lastApMilestone: { steps: number[]; tokens: number; seq: number } | null;
  /**
   * Zeremonie-Flag für 100 % AP-Quote (SAVE 66): wird beim Vergeben des 100-%-Schritts auf true
   * gesetzt; die UI rendert später die große Vollendungs-Feier und quittiert mit false.
   * Persistiert (überlebt Reload bis zur Feier). Unabhängig von `lastApMilestone`.
   */
  apCeremonyPending: boolean;
  /**
   * Lebenslange Kills je Monster-ID (Bestiarium). Inkrement-Stelle: combat.ts `onEnemyDefeated` —
   * dort laufen ALLE Kill-Pfade durch (Spieler-Schlag, DoT, Thorns, Pet-Ability; Normalkampf UND
   * Dungeon-Wellen). UI liest NIE raw, sondern über den Selektor `monsterKills(state, monsterId)`
   * (engine/drops.ts). sanitize (v58) strippt unbekannte Monster-IDs und klemmt Werte auf
   * endlich/≥0/ganzzahlig.
   */
  monsterKills: Record<MonsterId, number>;
  /**
   * Lebenslange Dungeon-Clears je Dungeon-ID. Quelle für `dungeons_cleared`-Achievements.
   * Inkrement-Stelle: combat.ts (Dungeon-Clear-Pfad, bei `grantDungeonRewards`) — NICHT hier, da
   * combat-dev's Revier. Default `{}`; Alt-Saves starten leer (nicht rückrechenbar).
   */
  dungeonsCleared: Record<string, number>;
  /**
   * Permanent entsperrte Dungeons (eingeführt SAVE_VERSION 59→60; ROLLE SEIT SAVE 64/Welle J:
   * Legacy-BESTANDSSCHUTZ + Paragonturm): je Dungeon-ID `true`. Set-Semantik als Record
   * (JSON-freundlich, Muster `discoveredItems`); MONOTON (wird nie wieder entfernt). Ein Eintrag
   * überstimmt das Quest-Gate (`DungeonDef.requiresQuest`) UND das Trägerzonen-Gate — ein
   * Alt-Save verliert NIE Zugriff (CEO-Leitplanke). Gefüllt von: (a) der v64-Migration
   * (Alt-Schlüssel im Besitz), (b) der Load-Invariante „gecleart ⇒ entsperrt" (persistence),
   * (c) dem Paragon-Schlüsselfund (`addItemOrBank`-Intercept, EINZIGER verbliebener
   * Schlüssel-Pfad — der Turm bleibt eigenes System). sanitize strippt unbekannte Dungeon-IDs
   * und normalisiert auf strikt `true`. UI liest NUR über
   * `isDungeonUnlocked(state, content, dungeonId)` (engine/dungeon.ts).
   */
  dungeonsUnlocked: Record<string, true>;
  /**
   * Letzter Dungeon-Unlock (UI-Breadcrumb „Dungeon entsperrt!", Muster `lastPetDrop`,
   * SAVE_VERSION 60): von der Engine beim Schlüsselfund gesetzt; die UI quittiert durch
   * Zurücksetzen auf null. Seit SAVE 64 (Welle J, quest-based unlock) feuert ihn nur noch der
   * Paragonturm-Schlüsselfund (paragon_key → paragon_tower); das Shape bleibt unverändert.
   * `dungeonIds` = ALLE durch diesen Fund neu entsperrten Dungeons; `itemId` = das gefundene
   * Schlüssel-Item; `seq` monoton steigend (UI erkennt neue Unlocks). null = nichts Neues.
   */
  lastDungeonUnlock: { dungeonIds: string[]; itemId: ItemId; seq: number } | null;
  /**
   * Bestandsschutz-Freischaltungen fürs Story-Zonen-Gating (SAVE_VERSION 62→63, Aschechronik,
   * ceo-run-2026-07-13): je Kampf-Zonen-ID `true`, wenn dieser Spielstand die Zone UNABHÄNGIG
   * vom Quest-Gate (`ZoneDef.requiresQuest`) betreten darf. Set-Semantik als Record (Muster
   * `dungeonsUnlocked`); MONOTON — wird nie wieder entfernt. Gefüllt AUSSCHLIESSLICH von der
   * v63-Migration: Alt-Saves (< 63) erhalten ALLE zum v62-Zeitpunkt existierenden Kampf-Zonen
   * (eingefrorene ID-Liste in persistence — Bestandsspieler verlieren NIE Zugriff, CEO-Leitplanke);
   * frische Saves (`createGame`) starten leer und spielen die Chronik-Gates regulär frei.
   * Gate-Logik NUR über `isZoneUnlocked(state, content, zoneId)` (engine/zones.ts) lesen.
   * sanitize härtet auf eine strikte true-Map (Keys ≤ 64 Zeichen), BEWUSST ohne
   * content.zones-Abgleich (ein Grant überlebt Content-Drift — nie Zugriff verlieren).
   */
  legacyZoneGrants: Record<string, true>;
  /**
   * Paragonturm-Fortschritt (SAVE_VERSION 60→61, dungeon-rework-spec §7): Etagen-Checkpoint
   * (überlebt Pause/Save/Offline; Tod im Turm → 0) + Prestige-Rekord `best` (monoton, Tod
   * senkt ihn nie). Engine-Verben/Selektoren: engine/paragon.ts (startParagonFloor,
   * paragonStatus, paragonFloorPreview) — nie raw in der UI lesen. Alt-Saves defaulten auf
   * `defaultParagonState()` ({ 0, 0 }); sanitize klemmt auf endliche Ganzzahlen ≥ 0 und
   * erzwingt best ≥ checkpoint.
   */
  paragon: ParagonState;
  /**
   * Monotoner Lebenszeit-Zähler aller vergebenen Paragon-Meilenstein-Truhen (SAVE 68, Welle LL —
   * Fun-Retest paragon-aldric P1 „Truhe ohne Feedback") und die EINZIGE Quelle der
   * `lastParagonChest.seq`-Werte (Muster petDropSeq/apMilestoneSeq — seq NIE aus dem nullbaren
   * Breadcrumb ableiten). Wird NIE genullt oder gesenkt; sanitize erzwingt
   * paragonChestSeq ≥ lastParagonChest.seq.
   */
  paragonChestSeq: number;
  /**
   * Letzte Paragon-Meilenstein-Truhe (UI-Breadcrumb „Truhe erbeutet!", Muster `lastPetDrop`,
   * SAVE 68). Gesetzt von `rollParagonChest` (engine/paragon.ts) bei JEDER Truhen-Vergabe —
   * auch beim Auto-Aufstieg und im Offline-Catch-up. KUMULIER-Semantik (Geist der AP-Stapel):
   * ist der vorige Breadcrumb noch NICHT quittiert (≠ null), werden die `items` der neuen Truhe
   * per Item-ID AUFsummiert; `floor` und `seq` zeigen immer die LETZTE Truhe, `chestTier` das
   * Maximum. Die UI quittiert durch Zurücksetzen auf null.
   *  - `floor`: Etage der letzten Truhe (Boss-Etage, Vielfaches von PARAGON_BOSS_INTERVAL).
   *  - `chestTier`: Anzahl der mitrollenden Truhen-Stufen (`ParagonChestTier.minFloor ≤ floor`) —
   *    1-basiert; mit dem Live-Content: 1 ab E5, 2 ab E10, 3 ab E20.
   *  - `items`: tatsächlich erbeutete Item-Mengen (inkl. Suffix-Instanzen als Basis-Item);
   *    darf leer sein, wenn alle Chance-Rows verfehlten — die Truhe selbst wird trotzdem gefeiert.
   */
  lastParagonChest: { floor: number; chestTier: number; items: { id: ItemId; qty: number }[]; seq: number } | null;
  /** Warum die zuletzt aktive Aktion automatisch endete. null = regulär gestoppt. */
  lastStop: { actionId: ActionId; reason: "no_materials" | "inventory_full" } | null;
  /** Verbleibende Betäubung in ms (z.B. nach einem Thieving-Fehlschlag). Pausiert die Aktion. */
  stunMs: number;
  /**
   * Risiko-Modus für Thieving (Stehlen). „careful" = vorsichtig (höhere Erfolgschance,
   * kürzerer Stun, dafür weniger Belohnung); „bold" = dreist (mehr Belohnung, dafür
   * höhere Fehlschlagchance + längerer Stun). Wirkt ausschließlich auf Thieving-Aktionen.
   * Default „careful". Siehe `THIEVING_RISK_MODS` / `thievingRiskMods`.
   */
  thievingRisk: ThievingRisk;
  /** Mastery-Fortschritt je Aktion (Langzeit-Progression): mehr Mastery → Chance auf doppelten Ertrag. */
  mastery: Record<ActionId, SkillState>;
  /** Bank/Lager: unbegrenzte Stapel je Item-ID. Entlastet das platzbeschränkte Inventar. */
  bank: Record<ItemId, number>;
  /**
   * Gekaufte ZUSÄTZLICHE Bank-Slots (Gold-Sink). Effektive Kapazität = `BASE_BANK_CAPACITY` + dies,
   * via `effectiveBankCapacity(state)`. Wird per `buyBankSlots` in Paketen (`BANK_SLOT_PACKAGE`)
   * erhöht; Cap `MAX_BANK_SLOTS_PURCHASED`. SAVE_VERSION 40→41: Alt-Saves defaulten auf 0.
   */
  bankSlotsPurchased: number;
  /** Collection-Log: je Monster die bereits erbeuteten Drop-Item-IDs (für „???"-Anzeige bis entdeckt). */
  seenDrops: Record<MonsterId, ItemId[]>;
  /**
   * Collection-Log für AKTIONEN: je Aktion die bereits tatsächlich erhaltenen Loot-Item-IDs
   * (Spiegel von `seenDrops` für Monster). Wird beim Aktionsabschluss für jeden real erhaltenen
   * Drop markiert; die UI maskiert unentdeckte Drops (foraging-spezifisch) als „???" bis entdeckt.
   * SAVE_VERSION 51→52: Alt-Saves defaulten auf `{}`.
   */
  seenActionDrops: Record<ActionId, ItemId[]>;
  /**
   * Erst-Besitz-Marker je Item-ID (SAVE_VERSION 57→58, Bestiarium-/Item-Wiki-Fundament):
   * jede jemals BESESSENE Item-ID, Set-Semantik als Record (JSON-freundlich; value immer `true`).
   * Gesetzt an den zentralen Zugangs-Pfaden (`addItemOrBank`, `intakeInstance`, Shop-Kauf/Buy-Back,
   * `createGame`-Starterbesitz) — KEINE Streuung über Callsites. Alt-Saves: migrateState defaultet
   * leer, sanitize unioniert den IST-Bestand (Inventar+Bank+Equipment+Instanzen) bei jedem Load
   * nach (Backfill + Selbstheilung, idempotent/monoton). UI liest NUR über
   * `isItemDiscovered(state, itemId)` (engine/inventory.ts) — unentdeckte Drops zeigen „???".
   */
  discoveredItems: Record<ItemId, true>;
  /**
   * Meisterweihe-Marker (SAVE_VERSION 58→59, design/master-capes-konzept.md): je Skill `true`,
   * sobald der Skill jemals Level ≥ `MASTER_CAPE_LEVEL` (99) erreicht hat. EINMALIG & monoton
   * (wird nie wieder entfernt — auch nicht, wenn XP je gesenkt würden). Gesetzt vom Level-Hook
   * `checkMasteryCapes` (engine/capes.ts, läuft einmal je advance hinter ALLEN XP-Quellen) bzw.
   * rückwirkend von der v59-Migration für Alt-Saves mit bestehenden 99ern. Set-Semantik als
   * Record (JSON-freundlich, Muster `discoveredItems`); sanitize strippt unbekannte Skill-IDs
   * und normalisiert auf strikt `true`.
   */
  masteryCapes: Record<SkillId, true>;
  /**
   * Verleihungs-Marker (Content-Guard der Meisterweihe; Feldname „cape" historisch, seit v69 ist
   * die Belohnung ein RING): je Skill `true`, sobald das Meisterring-Item
   * (`masterRingItemId(skillId)`) TATSÄCHLICH via addItemOrBank verliehen wurde. Getrennt von
   * `masteryCapes`, weil das Item beim Erreichen der Weihe noch gar nicht im Content existieren
   * kann — die Nachreichung `grantPendingCapes` (engine/capes.ts) verleiht später („Weihe
   * vermerkt && Item existiert im Content && nie verliehen"), beim Load (sanitize) UND je
   * advance. Passt der Ring ausnahmsweise nirgends hin (Inventar+Bank voll), bleibt der
   * Marker ungesetzt und der nächste Versuch reicht nach (kein Verlust). Invariante:
   * capeGranted ⊆ masteryCapes (sanitize erzwingt sie).
   */
  capeGranted: Record<SkillId, true>;
  /**
   * Zeremonie-Quittung (UI-Signal der Meisterweihe): je Skill `true`, sobald die UI die
   * Weihe-Zeremonie angezeigt hat. Die UI liest offene Zeremonien über
   * `pendingCapeCeremonies(state)` (engine/capes.ts), zeigt sie GESTAFFELT (eine nach der
   * anderen — nie 12 Popups auf einmal, Konzept-Notiz §4) und quittiert je Skill via
   * `markCapeCeremonySeen`. Die v59-Migration setzt für rückwirkende Weihen BEWUSST kein seen —
   * Alt-99er feiern ihre Zeremonien beim ersten Login nach. Invariante: ⊆ masteryCapes.
   */
  capeCeremonySeen: Record<SkillId, true>;
  /** Spieler-Komfort-Einstellungen (z.B. Auto-Bank bei vollem Inventar). */
  settings: GameSettings;
  /** Quest-Fortschritt: erfüllte (claimbare) und bereits eingelöste Quests. */
  quests: QuestState;
  /**
   * Monotoner Lebenszeit-Zähler aller Pet-Drops (SAVE 65, Welle DD). Die EINZIGE Quelle der
   * `lastPetDrop.seq`-Werte: `tryPetDrop` (engine/pets.ts) inkrementiert IHN und stempelt den
   * Breadcrumb damit. Wird NIE genullt oder gesenkt — insbesondere überlebt er die UI-Quittung
   * (`lastPetDrop = null`), sodass auch der 2./3./n-te Drop einer Session eine ECHT höhere seq
   * trägt als jede seenSeq-Hochwassermarke der UI. sanitize erzwingt petDropSeq ≥ lastPetDrop.seq.
   */
  petDropSeq: number;
  /**
   * Letztes per Pet-Drop frisch erhaltenes Pet (Breadcrumb für eine UI-Benachrichtigung
   * „Begleiter erhalten!"). Wird beim Drop von der Engine gesetzt; die UI quittiert es,
   * indem sie es nach Anzeige wieder auf null setzt. `seq` ist monoton steigend (= `petDropSeq`
   * zum Drop-Zeitpunkt) → die UI erkennt einen neuen Drop auch bei gleicher petId und darf ihre
   * seenSeq-Hochwassermarke beim Mount aus `petDropSeq` initialisieren. null = nichts Neues.
   */
  lastPetDrop: { petId: PetId; seq: number } | null;
  /**
   * Passive Beete (Farming-Plot-System). FIXE Länge `MAX_FARM_PLOTS` für stabile UI-Indizes; die
   * tatsächlich freigeschaltete Anzahl ist eine reine Funktion des Farming-Levels (`plotsUnlocked`).
   * Plots reifen passiv gegen `elapsedMs` und umgehen `activeActionId` (parallel zu Kampf/Skilling).
   */
  farmPlots: FarmPlot[];
  /**
   * Aktiver Slayer-Auftrag (Monsterjäger). null = kein Task (Spieler holt einen beim Master).
   * SAVE_VERSION 35→36: Alt-Saves defaulten auf null.
   */
  slayerTask: SlayerTask | null;
  /** Slayer-Punkte (eigene Belohnungs-Währung, getrennt von Gold). SAVE 36: Alt-Saves → 0. */
  slayerPoints: number;
  /** Lebenslang abgeschlossene Slayer-Tasks (für Achievements/Statistik). SAVE 36: Alt-Saves → 0. */
  slayerTasksCompleted: number;
  /**
   * Aktuelle Slayer-Task-Serie (SAVE 66, Welle GG/slayer-vesna V2): +1 je abgeschlossenem Task;
   * ein BEZAHLTER Skip (`effectiveSkipCost > 0`) bricht auf 0, die Gratis-Gnade unter
   * SLAYER_SKIP_FREE_BELOW_LEVEL bricht NICHT. Jeder SLAYER_STREAK_TOKEN_INTERVAL-te Task zahlt
   * SLAYER_STREAK_TOKEN_BONUS Quest-Tokens, jeder SLAYER_STREAK_POINT_INTERVAL-te zusätzlich
   * Bonus-Slayer-Punkte (~1 Task-Äquivalent). Vergabe-Stelle: recordKillForSlayer (slayer.ts).
   */
  slayerStreak: number;
  /**
   * Monotoner Lebenszeit-Zähler der Streak-Bonus-Vergaben (SAVE 66) und die EINZIGE Quelle der
   * `lastSlayerStreakBonus.seq`-Werte (Muster apMilestoneSeq/petDropSeq — NIE aus dem nullbaren
   * Breadcrumb ableiten). Wird NIE genullt oder gesenkt.
   */
  slayerStreakSeq: number;
  /**
   * Letzter Streak-Bonus (UI-Toast-Breadcrumb, Muster `lastPetDrop`, SAVE 66): `streak` = Stand
   * beim Bonus, `tokens`/`points` = Gutschriften dieser Vergabe, `seq` = `slayerStreakSeq` zum
   * Vergabe-Zeitpunkt. Die UI quittiert durch Zurücksetzen auf null.
   */
  lastSlayerStreakBonus: { streak: number; tokens: number; points: number; seq: number } | null;
  /**
   * YYYYMMDD-Kalendertag-Stempel des zuletzt verbrauchten GRATIS-Task-Skips der Trophäenwand III
   * (SAVE_VERSION 77, Task #359 — „1 Gratis-Skip/Tag", encampment-balance.md §6). 0 = nie
   * verbraucht. Der Stempel kommt wie bei den Dailies (`quests.daily.day`) vom CLIENT (lokaler
   * Kalendertag) — die Engine erzeugt KEINE Zeit. Verbrauchs-Stelle: engine/slayer.ts `skipTask`
   * (kostet 0 Punkte, erhält die Streak — Präzedenz SLAYER_SKIP_FREE_BELOW_LEVEL). Alt-Saves: 0.
   */
  slayerFreeSkipDay: number;
  /**
   * Gear-Vault (Instanz-Lager). Non-stackable `ItemInstance`n passen NICHT in die stackbare
   * `bank: Record<ItemId,number>`, daher separater Speicher. SAVE 37→38: Alt-Saves → [].
   */
  bankInstances: ItemInstance[];
  /**
   * Monoton steigender Zähler für deterministische Instanz-IDs (KEIN uuid/Date.now).
   * `instanceId = "inst_" + (nextInstanceSeq++).toString(36)`. SAVE 37→38: Alt-Saves → 0.
   */
  nextInstanceSeq: number;
  /**
   * Buy-Back-Liste (Shop-UX, Task #245, SAVE 53→54): die letzten Verkäufe (Stacks UND Instanzen),
   * FIFO vorne eingefügt, gekappt auf `BUYBACK_MAX_ENTRIES`. Zum Verkaufspreis zurückkaufbar
   * (`buyBack(state, content, index)` in engine/shop.ts). Alt-Saves defaulten auf `[]`.
   */
  buyBack: BuyBackEntry[];
  /**
   * Onboarding-Guide (geführtes Tutorial). Rein UI-getriebener Fortschritt — die Engine ändert das
   * Feld NIE von sich aus (kein RNG, kein Tick-Effekt), nur die expliziten Verben `advanceGuide` /
   * `finishGuide` / `restartGuide` (engine/onboarding.ts) sowie `createGame` (neuer Save) + Migration.
   * - `active`: der Guide läuft gerade (UI blendet Overlay + Spotlight-Gating ein).
   * - `step`: aktueller Schritt-Index in der UI-seitigen Schritt-Registry. Invariante: ganze Zahl ≥ 0.
   * - `done`: jemals abgeschlossen ODER übersprungen (unterdrückt den Auto-Trigger).
   * Neuer Save (`createGame`): `{ active:true, step:0, done:false }`. Alt-Saves (< SAVE_VERSION 45):
   * `{ active:false, step:0, done:true }` — Veteranen werden NICHT erneut ins Tutorial gezwungen.
   */
  onboarding: OnboardingState;
  /**
   * Postfach / Mailbox (SAVE_VERSION 71): Überlauf-Puffer für vollen Inventar. Wenn beim Sammeln/
   * Crafting ein Loot-/Output-Item weder ins Inventar noch (bei Auto-Bank) ins Lager passt, wandert
   * es hier hinein (statt die Aktion zu stoppen oder verloren zu gehen) — die Aktion LÄUFT WEITER.
   * Items werden GESTAFFELT: es entsteht EINE stehende `kind:"overflow"`-Mail, in der stackbarer Loot
   * per itemId zusammengefasst und Instanzen als Liste gesammelt werden (find-or-create). Später
   * abholbar (`collectMail`/`collectAllMail`, engine/mail.ts) — der Inhalt wandert zurück ins Inventar,
   * geleerte Mails verschwinden, bei vollem Inventar bleibt der Rest (partieller Collect). Alt-Saves
   * (< 71) defaulten auf `[]`; sanitize säubert (nur bekannte itemIds, positive qty, gültige Instanzen).
   */
  mailbox: MailMessage[];
  /**
   * Monoton steigender Zähler für deterministische Mail-`id`/`createdSeq` (KEIN uuid/Date.now —
   * sonst bricht Offline==Online-Determinismus). `id = "mail_" + (mailSeq++).toString(36)`,
   * `createdSeq` = derselbe Wert. SAVE 70→71: Alt-Saves → 0. Wird NIE genullt/gesenkt; sanitize
   * erzwingt `mailSeq > max(mailbox[].createdSeq)`.
   */
  mailSeq: number;
  /**
   * Elite-/World-Spawn-RNG-Strom (design/elite-spawns-concept.md §1.2, SAVE_VERSION 71→72): zweiter,
   * von `rng` UNABHÄNGIGER mulberry32-Zustand (Muster `rng`, s. engine/rng.ts). ALLE Würfe des
   * Elite-Systems (Zonen-Cooldowns, Varianten-Wahl, Fenster-Varianz, Unique-Suffix-Roll, extraLoot)
   * laufen AUSSCHLIESSLICH hierüber — NIE über `rng`. Der Elite-Zyklus tickt NUR bei aktivem Spiel
   * (`tickEliteSpawns`, engine/tick.ts `step()` hinter dem `offline`-Guard); der eigene Strom stellt
   * sicher, dass diese automatische Hintergrund-Aktivität `state.rng` NIE verschiebt — die normale
   * Skilling-/Kampf-Loot-Sequenz bleibt bit-identisch, ob Elites aktiv sind oder nicht (Determinismus-/
   * offline==online-Gesetz). Migration (< 72): deterministisch aus dem bereits geladenen `rng.state`
   * abgeleitet (`deriveEliteRngSeed`, engine/elites.ts — LIEST nur, konsumiert `rng` NICHT).
   */
  eliteRng: RngState;
  /**
   * Pro-Zone-Elite-Zyklus (design/elite-spawns-concept.md §1.2): je Kampf-Zonen-ID (`ZoneDef.id`)
   * GENAU EINER von zwei Zuständen (`EliteZoneState`) — „Ruhe" (`{cooldownMs}`, zählt in `step()`
   * bis zur Fälligkeit runter) oder „Aktiv" (`{variantId, remainingMs}`, ein gespawnter Elite mit
   * Restfenster). Unbekannte Zonen-Keys werden TOLERIERT (Content-Drift-Leitplanke, Muster
   * `legacyZoneGrants`) — eine später entfernte Zone crasht nicht, ihr Eintrag liegt inert herum.
   * `createGame` füllt JEDE zum Zeitpunkt bekannte Zone über die FRÜH-HAKEN-Formel
   * (`initEliteZonesEarlyHook`, engine/elites.ts — Konzept §1.4, elite-balance-spec.md §3: die
   * Pastures-Zone wird garantiert nach ~15–25 Min aktiver Spielzeit fällig, die übrigen Zonen
   * entzerrt bis ~100 Min); die v72-Migration nutzt stattdessen den normalen, staffelnden Band-Roll
   * (`initEliteZonesStaggered` — JEDE Zone würfelt in ihrem EIGENEN, per-Zone unterschiedlichen
   * Cooldown-Band, `ELITE_ZONE_COOLDOWN_BANDS`; kein Früh-Haken für Bestandsspieler). Eine SPÄTER
   * hinzukommende Zone (Content-Wachstum ohne neuen Save-Bump) wird beim ersten Tick lazy über den
   * normalen Band-Roll nachgerüstet (`tickEliteSpawns`). sanitizeState härtet auf die beiden
   * gültigen Shapes (Zahlen endlich/≥0/gedeckelt); ein aktiver Eintrag mit einer im aktuellen
   * Content unbekannten `variantId` (Content entfernt) wird in Ruhe überführt, NIE verworfen/gecrasht.
   */
  eliteZones: Record<string, EliteZoneState>;
  /**
   * Monotoner Lebenszeit-Zähler aller Elite-Spawns (Muster petDropSeq/paragonChestSeq) und die
   * EINZIGE Quelle der `lastEliteSpawn.seq`-Werte. Wird NIE genullt oder gesenkt.
   */
  eliteSpawnSeq: number;
  /**
   * Letzter Elite-Spawn (UI-Toast-Breadcrumb „Ein mächtiger Gegner wurde gesichtet…", Muster
   * `lastPetDrop`, design/elite-spawns-concept.md §2.1 — der Toast selbst ist Phase 3/ui-dev).
   * Gesetzt vom Zyklus (`tickEliteSpawns`, engine/elites.ts) bei JEDEM Spawn; die UI quittiert durch
   * Zurücksetzen auf null. `seq` = `eliteSpawnSeq` zum Spawn-Zeitpunkt.
   */
  lastEliteSpawn: { zoneId: string; variantId: string; seq: number } | null;
  /**
   * Früh-Garantie-Suffix (SAVE_VERSION 72, selber Bump — „Identitäts-Paket", Chef-GO 2026-07-22):
   * `true`, sobald die ERSTE Suffix-Instanz überhaupt entstanden ist (egal ob durch die Garantie
   * erzwungen oder natürlich gewürfelt). Der EINZIGE Choke-Point ist `tryCraftSuffix`
   * (engine/suffix.ts) — er deckt Kill-Loot (combat.ts), Crafting-Output (tick.ts) UND Paragon-
   * Truhen-Loot (paragon.ts) gemeinsam ab, da alle drei Pfade durch ihn laufen. Solange `false` UND
   * der Kandidat Equipment mit einem strukturell MÖGLICHEN Suffix ist (die aufrufer-seitige
   * `baseChance > 0` — 0/fehlend bleibt bewusst suffixlos, Content-Entscheidung wird respektiert),
   * rollt `tryCraftSuffix` mit Chance 1 statt der normalen `baseChance`. Migration (< 72, i.e. Save
   * ohne dieses Feld): `true` (Bestandsspieler bekommen KEINE nachträgliche Garantie). Frische Saves
   * (`createGame`): `false`. Wird NIE zurückgesetzt (monoton); sanitizeState härtet auf striktes
   * boolean, Nicht-boolesche Werte fallen KONSERVATIV auf `true` zurück (verhindert einen
   * wiederholbaren Garantie-Suffix-Exploit über ein hand-editiertes Save-Feld).
   */
  firstSuffixGranted: boolean;
  /**
   * Champion-Codex (§Champion-Codex, „Jagd-Paket" S2/M, Chef-GO 2026-07-22, selber v72-Bump): je
   * `EliteVariantDef.id` (Key = `variantId`, unbekannte/entfernte Varianten werden TOLERIERT statt
   * gestrippt — Content-Drift-Leitplanke, Muster `eliteZones`) eine Lebenszeit-Statistik
   * (`EliteCodexEntry`). `sightings` +1 bei jedem Spawn dieser Variante (`spawnElite`),
   * `kills`/`uniques` +1 bei jedem Kill bzw. gefallenen Unique-Drop dieser Variante
   * (`onEliteKilled`), `fastestKillMs` die kürzeste je gemessene Kampfdauer (Messgrundlage:
   * `CombatState.eliteFightStartMs`, transient — ein über Save/Load unterbrochener Elite-Fight
   * liefert für DIESEN einen Kill keine Messung, aber crasht nicht). Migration (Feld fehlt): `{}`
   * (rückwirkend nicht rekonstruierbar — Phase 1 hatte ohnehin eine leere `content.elites`-Registry,
   * ein Alt-Save kann also strukturell nie einen realen Elite-Kill verpasst haben). sanitizeState
   * härtet Struktur (endliche Ganzzahlen ≥ 0, `fastestKillMs` endlich ≥ 0 oder `null`).
   */
  eliteCodex: Record<string, EliteCodexEntry>;
  /**
   * Monotoner Lebenszeit-Zähler aller Elite-Kills (SAVE_VERSION 74, Task #324 — Muster
   * `eliteSpawnSeq`/petDropSeq) und die EINZIGE Quelle der `lastEliteKill.seq`-Werte. Der
   * PRIMITIV-Selector der UI-Sieg-Zeremonie: steigt er, liegt in `lastEliteKill` frische Beute.
   * Inkrement-Ort ist AUSSCHLIESSLICH `onEliteKilled` (engine/elites.ts). Wird NIE genullt oder
   * gesenkt; sanitize hält ihn ≥ `lastEliteKill.seq`.
   */
  eliteKillSeq: number;
  /**
   * Beute-Übersicht des JÜNGSTEN Elite-Kills (SAVE_VERSION 74, Task #324) für die kommende
   * UI-Sieg-Zeremonie — vollständiger Vertrag s. `EliteKillSummary`-Doku. Geschrieben von
   * `onEliteKilled` bei jedem erfolgreichen Elite-Kill (auch offline — letzter Kill gewinnt);
   * die UI quittiert durch Zurücksetzen auf null (Muster `lastEliteSpawn`).
   */
  lastEliteKill: EliteKillSummary | null;
  /**
   * Ausrüstungs-Kits 1/2/3 (SAVE_VERSION 85, Chef-Entscheid 28.08.2026; ersetzt die v75-Loadout-
   * Vorlagen `equipLoadouts`): fixe Länge EQUIP_KIT_COUNT (3), jedes Kit BESITZT seine Teile.
   * WAHRHEIT des AKTIVEN Kits ist `character.equipment`/`character.equippedInstances` (alle
   * bestehenden Pfade — computeStats, Kampf, equip/unequip — lesen und schreiben weiter dort);
   * `equipKits[activeKit]` ist nur dessen SPIEGEL und darf zur Laufzeit stale sein. Synchronisiert
   * wird beim Umschalten (`switchEquipKit`), beim Serialisieren und im Sanitize (`syncActiveKit`,
   * engine/loadouts.ts). Inaktive Kits tragen ihre Items SELBST (nicht im Inventar); ein Wechsel
   * verschiebt nichts und ist nur außerhalb des Kampfes erlaubt. RNG-frei, reine Spieler-Aktion.
   */
  equipKits: EquipKit[];
  /** Index des aktiven Kits (0..EQUIP_KIT_COUNT-1). Alt-Saves (< 85 bzw. ohne Kits): 0. */
  activeKit: EquipKitIndex;
  /**
   * Das Lager (Encampment Phase 1, SAVE_VERSION 76, Task #358): Gebäude-Stufen + der EINE
   * Bautrupp-Auftrag + Fertigstellungs-Breadcrumb. Verben/Selektoren AUSSCHLIESSLICH über
   * engine/camp.ts (startCampBuild/cancelCampBuild/campBoost) — der Bau-Timer tickt
   * deterministisch in tick.ts `step()` (offline==online). Alt-Saves (< 76): `defaultCampState()`.
   */
  camp: CampState;
  /**
   * Die Taverne (1.2.0, SAVE_VERSION 84, design/1.2.0-alive/taverne-spec-technik.md): Tagesbesetzung der
   * vier Plätze, angenommene Aufgaben, Wechsel-/Abgabe-Zähler. Verben AUSSCHLIESSLICH über engine/tavern.ts.
   * Alt-Saves (< 84): `defaultTavernState()`. Zufall NUR aus reinem Hash (Seed + Tag + Platz), nie state.rng.
   */
  tavern: TavernState;
  /**
   * Jagen (1.2.0 „Fasern und Fallen", SAVE_VERSION 85, design/handwerk-fasern-jagen/spec-technik.md): sechs Fallenplätze
   * (fixe Länge HUNT_TRAP_SLOTS, gesperrte Plätze sind leer), Fang-Zähler. Verben nur über engine/hunting.ts; Tick wie die Beete.
   */
  huntTraps: HuntTrap[];
  /** Monoton steigende Fang-Nummer (Breadcrumb `HuntTrap.lastCatch.seq`, Toast-Dedupe). */
  huntCatchSeq: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Jagen (1.2.0 „Fasern und Fallen“, Chef-Entscheide J1–J7 vom 27.08.2026;
// Spezifikation design/handwerk-fasern-jagen/spec-technik.md)
// ───────────────────────────────────────────────────────────────────────────

export const HUNT_TRAP_SLOTS = 6;
/** Jagen-Stufe, ab der Platz i (0-basiert) offen ist. */
// Chef 28.08.2026: 1/10/25/45/65/85 war utopisch langsam (zweite Falle erst nach Stunden), deshalb früher.
export const HUNT_SLOT_LEVELS: readonly number[] = [1, 5, 15, 30, 50, 75];
/**
 * Jagen-XP je Fang (Chef 28.08.2026): die Kampf-XP des GEFANGENEN Monsters × HUNT_XP_PER_CATCH (ein Fang = fünf
 * Beute-Würfe = fünf Kills); der ERSTE Fang jeder Art zusätzlich × HUNT_FIRST_CATCH_MULT (Jagdbuch-Entdeckung, ×10 gesamt).
 * Huhn 10, Eber 100, Ziege 210, Goblin 120, Dornenwolf 980, Roc 10 250, Wyvern 28 250; sechs Fallen im Hochland
 * ≈ 80 000 XP/h, also auf der Anbau-Kurve (99 in ~150 h); Stufe 5 (zweite Falle) fällt auf den Weiden nach drei bis vier Fängen.
 */
export const HUNT_XP_PER_CATCH = 5;
export const HUNT_FIRST_CATCH_MULT = 2;
export function huntCatchXp(monsterXp: number): number {
  return Math.max(1, Math.round(Math.max(0, monsterXp) * HUNT_XP_PER_CATCH));
}
export const HUNT_LOOT_ROLLS = 5;
export const HUNT_CATCH_BASE = 0.7;
export const HUNT_CATCH_PER_LEVEL = 0.005;
export const HUNT_CATCH_CAP = 0.95;
// Chef 28.08.2026: JEDE Kreaturenart ist fangbar (war J1 "Tiere und Kleinvolk"; Krypta/Goetzenhalle standen sonst mit 0/0 da).
// Ausgeschlossen bleiben nur Bosse, Dungeon-Varianten und nie besiegte Monster (engine/hunting.ts huntableMonsters).
export const BAIT_ITEM_ID: ItemId = "bait_worm";
/**
 * Köder-Stufen (Chef 28.08.2026, Symbiose Angeln ↔ Jagen): jedes Jagdgebiet verlangt den Köder seiner Stufe, und das
 * Angeln liefert genau diesen Köder auf derselben Stufe (Sammel-Aktion mit levelRequired = fishingLevel). Ein Gebiet ohne
 * eigenes `baitItemId` fällt über `huntBaitForZoneLevel(levelRequired)` auf die Tabelle zurück.
 */
export interface HuntBaitTier {
  itemId: ItemId;
  tier: 1 | 2 | 3 | 4 | 5;
  /** Ab dieser Gebietsstufe (huntingZones.levelRequired) ist das der verlangte Köder. */
  minZoneLevel: number;
  /** Angel-Stufe der liefernden Sammel-Aktion. */
  fishingLevel: number;
}
export const HUNT_BAIT_TIERS: readonly HuntBaitTier[] = [
  { itemId: "bait_worm", tier: 1, minZoneLevel: 1, fishingLevel: 1 },
  { itemId: "bait_maggot", tier: 2, minZoneLevel: 20, fishingLevel: 20 },
  { itemId: "bait_crab", tier: 3, minZoneLevel: 40, fishingLevel: 40 },
  { itemId: "bait_squid", tier: 4, minZoneLevel: 60, fishingLevel: 60 },
  { itemId: "bait_glow", tier: 5, minZoneLevel: 80, fishingLevel: 80 },
];
export function huntBaitForZoneLevel(zoneLevel: number): HuntBaitTier {
  let best = HUNT_BAIT_TIERS[0]!;
  for (const t of HUNT_BAIT_TIERS) if (zoneLevel >= t.minZoneLevel) best = t;
  return best;
}
export const HUNTING_SKILL_ID: SkillId = "hunting";

/**
 * Skill-Split „Schneidern" (SAVE_VERSION 86, Chef-Entscheid 28.08.2026): `tailoring` (EN „Tailoring"/
 * DE „Schneidern") trägt alles aus Stoff — Weben, Magier-Roben, Umhänge; `leatherworking` (EN „Crafting"/
 * DE „Handwerk") behält Leder, Bögen, Holzschilde, Angelruten und die Nessel-Sehne. Die Migration
 * (persistence, v85 → v86) teilt die Handwerk-XP nach tatsächlich Hergestelltem (`stats.craftedById`).
 * Reihenfolge in Skill-Listen: `tailoring` direkt NACH `leatherworking`.
 */
export const LEATHERWORKING_SKILL_ID: SkillId = "leatherworking";
export const TAILORING_SKILL_ID: SkillId = "tailoring";

export function huntTrapSlotsForLevel(level: number): number {
  let n = 0;
  for (const l of HUNT_SLOT_LEVELS) if (level >= l) n++;
  return Math.min(HUNT_TRAP_SLOTS, n);
}

/** Gebiets-Eintrag der Jagd (Content `huntingZones`). */
export interface HuntZoneDef {
  zoneId: string;
  /** Jagen-Stufe, ab der hier Fallen stehen dürfen (Kampf-Freischaltung der Zone bleibt zusätzlich Pflicht). */
  levelRequired: number;
  /** Fallenzeit in ms (5 min Weiden … 60 min Götzenhalle). */
  trapMs: number;
  /** Verlangter Köder (Köder-Stufen 28.08.2026); fehlt er, gilt `huntBaitForZoneLevel(levelRequired)`. */
  baitItemId?: ItemId;
  /** Historisch: Jagen-XP je Fang. Seit 28.08.2026 zählt `huntCatchXp(monster.xp)`; das Feld bleibt als Content-Kennzahl. */
  xp: number;
}

export interface HuntCatch {
  seq: number;
  monsterId: MonsterId;
  items: { id: ItemId; qty: number }[];
  gold: number;
}

export interface HuntTrap {
  /** Gebiet der Falle; null = Platz leer. */
  zoneId: string | null;
  /** Restzeit bis zum Wurf in ms (Spielzeit, offline == online). */
  remainingMs: number;
  /** Nach dem Wurf automatisch mit neuem Köder stellen (Muster FarmPlot.autoReplant). */
  autoRebait: boolean;
  /** Jüngster Fang dieses Platzes (transient fürs UI; null = noch keiner oder letzter Wurf ging leer aus). */
  lastCatch: HuntCatch | null;
  /** true = der letzte Wurf ging leer aus (Köder weg, Falle neu gestellt oder leer). */
  lastMissed: boolean;
}

export function emptyHuntTrap(): HuntTrap {
  return { zoneId: null, remainingMs: 0, autoRebait: true, lastCatch: null, lastMissed: false };
}
export function defaultHuntTraps(): HuntTrap[] {
  return Array.from({ length: HUNT_TRAP_SLOTS }, () => emptyHuntTrap());
}

// ───────────────────────────────────────────────────────────────────────────
// Taverne (1.2.0 „Alive“, Chef-Entscheide E1–E3 + 27.08.2026; Spezifikation
// design/1.2.0-alive/taverne-spec-technik.md — Typen-Vertrag für logic-dev/content-dev/ui-dev)
// ───────────────────────────────────────────────────────────────────────────

/** Gebäude-ID der Taverne im Lager-Katalog (belegt KEINEN Bauplatz, Ausnahme wie das Zentralhaus). */
export const CAMP_TAVERN_ID: CampBuildingId = "camp_tavern";
/**
 * Release-Schalter der Taverne (Chef 27.08.2026: „Die Taverne soll 1.2.0 werden, alles andere 1.1.2“). AUS = 1.1.2:
 * kein Sidebar-Eintrag, keine Gebäudekarte/kein Bau (engine/camp.ts), kein Tageswechsel-Hook, Behälter-Items nicht im
 * Item-Browser. Save-Format bleibt 84 (Feld `tavern` liegt leer im Save, Migration ist additiv). 1.2.0 stellt auf true.
 * Engine-Tests überschreiben zur Laufzeit `features.tavern` (engine/features.ts).
 */
export const TAVERN_ENABLED = false;
/** Plätze in der Taverne (Szene: drei Tische + Tresen). */
export const TAVERN_SEATS = 4;
/** Bänder nach Skill-Level: 1–20 → 1, 21–40 → 2, 41–60 → 3, 61–80 → 4, 81–99 → 5. */
export const TAVERN_BANDS = 5;
/** Gold-Grundbelohnung je Band (Index = Band, 0 unbenutzt; Art-Faktor s. Spec §4). */
export const TAVERN_GOLD_BY_BAND: readonly number[] = [0, 150, 400, 900, 1800, 3200];
/** Slayer-XP je Band für Kampf-Aufgaben (Dungeon/Champion ×2). */
export const TAVERN_COMBAT_XP_BY_BAND: readonly number[] = [0, 300, 1200, 3000, 6000, 12000];
/** Kill-Mengen je Band für "kill"-Aufgaben. */
export const TAVERN_KILL_COUNT_BY_BAND: readonly number[] = [0, 8, 12, 16, 20, 25];
/** Zusatzchance je Abgabe auf einen Schwarzmarktbehälter des Bands. */
export const TAVERN_CRATE_BONUS_CHANCE = 0.1;
/** Gold je Band für einen Gäste-Wechsel über das Gratis-Kontingent hinaus. */
export const TAVERN_SWAP_GOLD_PER_BAND = 100;
/** Gold-Faktor der Taverne Stufe III auf Aufgaben-Belohnungen. */
export const TAVERN_LEVEL3_GOLD_FACTOR = 1.15;
/** Präfix der Behälter-Items: black_market_crate_i … _v (Tier = Band). */
export const BLACK_MARKET_CRATE_PREFIX = "black_market_crate_";

export function tavernBandForLevel(level: number): number {
  return Math.max(1, Math.min(TAVERN_BANDS, Math.ceil(Math.max(1, level) / 20)));
}

export type TavernRace = "human" | "elf" | "orc" | "goblin";
export type TavernGuestId = string;

/** Ein Gast (Fassung 2 der Gästeliste, 19 Personen; Halvard vergibt keine Aufgaben). */
export interface TavernGuestDef {
  id: TavernGuestId;
  name: LocalizedString;
  race: TavernRace;
  sex: "m" | "f";
  /** Rolle/Beruf als Anzeige ("Slayer", "Bergarbeiter" …). */
  role: LocalizedString;
  /** Skill, dessen Level das Band bestimmt; null = Gesamtlevel-Band (Fremder, Karawane). */
  skill: SkillId | null;
  /** false = nur Kulisse/Tresen (Halvard). */
  givesTasks: boolean;
  /** Die Stimme des Gastes (ein Satz; ≤ 1 Gedankenstrich). */
  greeting: LocalizedString;
  /** "daily" = im normalen Pool; "rare" = nur an Hash-Tagen (stranger 1/12, ashka 1/4). */
  rarity: "daily" | "rare";
}

export type TavernTaskKind = "deliver" | "produce" | "run" | "kill" | "dungeon" | "champion" | "assortment";

/** Wie das Ziel einer Vorlage aus dem Content gewählt wird (Spec §3). */
export interface TavernTaskSelect {
  /** Aktionen dieses Skills (deliver/produce/run/assortment). */
  skill?: SkillId;
  /** Nur Aktionen dieser Kategorie(n). */
  categories?: string[];
  /** Nur Aktionen mit (true) / ohne (false) inputs. */
  hasInputs?: boolean;
  /** Nur Aktionen, deren Haupt-Output diesen Item-Typ hat. */
  itemType?: ItemType;
  /** Nur Aktionen, deren Haupt-Output diese Slot(s) belegt (z.B. Waffen bei Merrit). */
  equipSlots?: string[];
  /** kill: Monster aus freigeschalteten Zonen im Band (Spec §3). */
  zoneBand?: boolean;
}

export interface TavernTaskTemplateDef {
  id: string;
  guestId: TavernGuestId;
  kind: TavernTaskKind;
  select: TavernTaskSelect;
  /** Arbeitsminuten je Band (Index 0 = Band 1 … 4 = Band 5); Menge = minutes × 60 000 / durationMs × outputQty. */
  minutes: readonly number[];
  minBand?: number;
  maxBand?: number;
  /** Ansprache mit Platzhaltern {count}, {target}, {zone}. */
  line: LocalizedString;
}

/** Eine gewürfelte Tagesaufgabe (alles Feste wird bei der Vergabe bestimmt, Spec §4). */
export interface TavernTask {
  templateId: string;
  kind: TavernTaskKind;
  band: number;
  /** Item-ID (deliver/produce), Aktions-ID (run), Monster-ID (kill), Dungeon-ID (dungeon), Varianten-ID (champion). */
  targetId: string;
  /** Nur assortment: die drei Items (targetId = erstes davon). */
  targetIds?: string[];
  /** Nur produce/run: die erzeugende Aktion (für "In die Warteschlange"). */
  actionId?: ActionId;
  count: number;
  /** Nötige Skill-Stufe der Zielaktion (0 = keine); über dem Spieler-Level ⇒ "Stufe X nötig", Annahme erlaubt. */
  requiredLevel: number;
  accepted: boolean;
  /** Zählerstand bei Annahme (produce/run/kill/dungeon/champion); deliver/assortment: 0. */
  baseline: number;
  rewardGold: number;
  rewardXp: number;
  rewardSkill: SkillId;
  rewardItems: { id: ItemId; qty: number }[];
  /** true = zahlt einen Schwarzmarktbehälter (Tier = band) statt Gold + Rohstoffe (Fremder, Karawane). */
  paysCrate: boolean;
}

export interface TavernSeat {
  guestId: TavernGuestId;
  /** null nur transient (unbesetzt) — der nächste tavernRefresh besetzt neu. */
  task: TavernTask | null;
  /** Wechsel dieses Platzes am aktuellen Tag (Hash-Zutat für die Neubesetzung). */
  swaps: number;
}

/** Transienter Breadcrumb der jüngsten Abgabe (UI-Zeremonie; seq monoton). */
export interface TavernDelivery {
  seq: number;
  guestId: TavernGuestId;
  gold: number;
  xp: number;
  skill: SkillId;
  items: { id: ItemId; qty: number }[];
  /** Behälter-Item-IDs, die diese Abgabe gezahlt hat (Bezahlung und/oder 10-%-Bonus). */
  crates: ItemId[];
}

export interface TavernState {
  /** Tagesstempel (YYYYMMDD, lokal, vom Client) der letzten Besetzung; 0 = nie. */
  day: number;
  /** Genau TAVERN_SEATS Einträge (leer nur vor der ersten Besetzung). */
  seats: TavernSeat[];
  /** Gäste-Wechsel heute (Gratis-Kontingent 1 + (Stufe ≥ 2 ? 1 : 0)). */
  swapsUsed: number;
  deliveredToday: number;
  totalDelivered: number;
  /** Abgaben je Gast (Stammgast-Vorbereitung Phase 2). */
  deliveredByGuest: Record<TavernGuestId, number>;
  /** Monoton steigende Abgabe-Nummer (Hash-Zutat des Behälter-Wurfs, Toast-Breadcrumb). */
  deliverSeq: number;
  lastDelivery: TavernDelivery | null;
  /** Halvards Erklärung beim ersten Besuch gesehen. */
  introSeen: boolean;
}

export function defaultTavernState(): TavernState {
  return {
    day: 0,
    seats: [],
    swapsUsed: 0,
    deliveredToday: 0,
    totalDelivered: 0,
    deliveredByGuest: {},
    deliverSeq: 0,
    lastDelivery: null,
    introSeen: false,
  };
}

/**
 * Zustand des Onboarding-Guides (geführtes Tutorial). Contract für ui-dev: die UI hält die
 * Schritt-Registry (welches Element pro `step`), die Engine hält nur diesen minimalen Fortschritt.
 */
export interface OnboardingState {
  /** Guide läuft gerade (Overlay + Gating aktiv). */
  active: boolean;
  /** Aktueller Schritt-Index (0-basiert) in der UI-Schritt-Registry. Immer ganze Zahl ≥ 0. */
  step: number;
  /** Jemals abgeschlossen oder übersprungen — verhindert das erneute Auto-Starten. */
  done: boolean;
  /**
   * Bereichs-Touren (SAVE_VERSION 62, Onboarding-Ausbau 2026-07-13): einmalige Erst-Betreten-
   * Touren je Bereich (z. B. "combat", "shop", "bank"). Strikte true-Map wie masteryCapes;
   * Keys sind UI-definiert (Schritt-Registry im Renderer), die Engine speichert nur die Marker.
   * Alt-Saves (< 62): leer → Bereichs-Touren erscheinen einmalig (kurz + überspringbar).
   */
  toursSeen: Record<string, true>;
}

/** Onboarding-Zustand für einen frischen Spielstand ODER einen Neustart: Guide läuft ab Schritt 0. */
export function newGameOnboarding(): OnboardingState {
  // `featureTourV1` vorab als „gesehen" markiert → NEUE Spieler (createGame/Neustart) sehen die
  // „Was ist neu"-Versions-Tour NICHT; sie feuert nur für Alt-Saves, deren toursSeen diesen Key nicht
  // enthält (Chef 2026-07-21). Bei künftigen Updates einen neuen Key ergänzen (featureTourV2 …).
  // 0.3.0 (2026-08-03): featureTourV2 (New-Haven-Rundgang) ebenfalls vorab markiert — neue Spieler
  // lernen New Haven über das reguläre Onboarding, die v2-Tour ist NUR für wiederkehrende Alt-Saves.
  return { active: true, step: 0, done: false, toursSeen: { featureTourV1: true, featureTourV2: true } };
}

/**
 * Onboarding-Zustand für Alt-Saves (vor SAVE_VERSION 45): als bereits erledigt markiert, damit
 * bestehende Spieler NICHT ins Tutorial gezwungen werden. Auch der „Skip/Fertig"-Endzustand.
 */
export function legacyOnboarding(): OnboardingState {
  return { active: false, step: 0, done: true, toursSeen: {} };
}

/** Persistente Komfort-/Idle-Einstellungen des Spielers. */
export interface GameSettings {
  /**
   * Auto-Bank: Wenn das Inventar voll ist, wandern gesammelte/gelootete Items
   * automatisch ins Lager (Bank), statt die Aktion zu stoppen. Standard: an —
   * das hält den Idle-/AFK-Fortschritt am Laufen.
   */
  autoBank: boolean;
  // autoSalvage: GELÖSCHT (#278) — Auto-Salvage existiert nicht mehr; das Alt-Save-Flag räumt
  // migrateState weiterhin weg (dort per lokalem Cast, braucht dieses Feld nicht).
  /**
   * Auto-Aufstieg im Paragonturm (SAVE_VERSION 67, Welle JJ — Aldric A2 „nach jedem Etagen-Sieg
   * manuell klicken bricht den Flow"): Wenn an, startet ein siegreicher Etagen-Abschluss sofort
   * die nächste Etage (derselbe `startParagonFloor`-Pfad wie der manuelle Klick — voller
   * Ward-Init, kein RNG-Draw). Tod im Turm und manuelles Verlassen stoppen die Kette natürlich
   * (kein Clear ⇒ kein Auto-Start). Standard: AUS — die Etagen-Pause zum Aufstocken
   * (Chef-Leitplanke 4) bleibt das Default-Verhalten, der Dauerlauf ist Opt-in.
   */
  autoParagonAscend: boolean;
}

/** Default-Einstellungen für frische Spielstände (und Migration alter Saves). */
export function defaultSettings(): GameSettings {
  return { autoBank: true, autoParagonAscend: false };
}

/** Mastery: gemeinsame Level-Kurve mit Fertigkeiten; höchstes Level. */
export const MASTERY_MAX_LEVEL = 99;
/** Chance auf doppelten Ertrag pro Mastery-Level (linear bis zur Kappe). */
export const MASTERY_DOUBLE_PER_LEVEL = 0.005;
/** Obergrenze der Doppel-Ertrag-Chance (bei Mastery 99 ≈ 49 %). */
export const MASTERY_DOUBLE_CAP = 0.5;

/** Chance, dass eine Aktion bei gegebenem Mastery-Level doppelten Ertrag liefert. */
export function masteryDoubleChance(masteryLevel: number): number {
  return Math.min(MASTERY_DOUBLE_CAP, Math.max(0, masteryLevel - 1) * MASTERY_DOUBLE_PER_LEVEL);
}

/** Tempo-Reduktion der Aktionsdauer pro Mastery-Level (linear bis zur Kappe). */
export const MASTERY_SPEED_PER_LEVEL = 0.0015;
/** Maximale Tempo-Reduktion durch Mastery (bei Lv99 ≈ 14,7 %; Melvor-näher, s. melvor-study.md). */
export const MASTERY_SPEED_CAP = 0.15;

/** Dauer-Multiplikator (≤1 = schneller) für eine Aktion beim gegebenen Mastery-Level. */
export function masterySpeedMult(masteryLevel: number): number {
  return 1 - Math.min(MASTERY_SPEED_CAP, Math.max(0, masteryLevel - 1) * MASTERY_SPEED_PER_LEVEL);
}

/** Preservation: Chance pro Mastery-Level, bei Verarbeitung die Inputs NICHT zu verbrauchen. */
export const MASTERY_PRESERVE_PER_LEVEL = 0.004;
/** Obergrenze der Preservation-Chance (bei Mastery 99 ≈ 39 %). */
export const MASTERY_PRESERVE_CAP = 0.4;

/** Chance, dass eine Verarbeitungs-Aktion ihre Materialien spart (kein Verbrauch). */
export function masteryPreserveChance(masteryLevel: number): number {
  return Math.min(MASTERY_PRESERVE_CAP, Math.max(0, masteryLevel - 1) * MASTERY_PRESERVE_PER_LEVEL);
}

/**
 * Mastery-Pool: skillweiter Langzeit-Anker (Melvor-artig). Der Pool füllt sich aus der
 * aggregierten Mastery-XP ALLER Aktionen eines Skills (0..1). Beim Überschreiten fester
 * Schwellen werden dauerhafte, skillweite Boni freigeschaltet (additiv).
 *
 * WICHTIG (Pacing, s. playtest-2026-06-25 #P3.1): Die Pool-Kapazität wird NICHT an
 * `xpForLevel(99)` gehängt — das ist die asymptotische Endgame-XP und macht selbst den
 * 1. Checkpoint praktisch unerreichbar (>270M XP/Skill). Stattdessen referenziert die
 * Kapazität ein mittleres Mastery-Level (`MASTERY_POOL_REFERENCE_LEVEL`): „durchschnittlich
 * dieses Mastery-Level über alle Aktionen eines Skills" = voller Pool. Dadurch ist der erste
 * Checkpoint im Frühgame spürbar erreichbar, während ein voller Pool ein Mehrtages-Ziel bleibt.
 */
export const MASTERY_POOL_REFERENCE_LEVEL = 20;

export const MASTERY_POOL_CHECKPOINTS = [0.05, 0.25, 0.5, 0.95] as const;

/** Bonus je Checkpoint (additiv): double = +Doppelertrag, speed = +Tempo-Reduktion, preserve = +Preservation. */
export const MASTERY_POOL_CHECKPOINT_BONUS: Record<number, { double: number; speed: number; preserve: number }> = {
  0.05: { double: 0.03, speed: 0, preserve: 0 }, // 1. Checkpoint: früh erreichbar, sichtbarer Doppelertrag-Bonus
  0.25: { double: 0, speed: 0.04, preserve: 0 },
  0.5: { double: 0, speed: 0, preserve: 0.05 },
  0.95: { double: 0.05, speed: 0.04, preserve: 0 }, // Capstone
};

/** Summiert die Pool-Boni aller Checkpoints, deren Schwelle ≤ pct ist. */
export function poolCheckpointBonus(pct: number): { double: number; speed: number; preserve: number } {
  let double = 0;
  let speed = 0;
  let preserve = 0;
  for (const threshold of MASTERY_POOL_CHECKPOINTS) {
    if (threshold <= pct) {
      const b = MASTERY_POOL_CHECKPOINT_BONUS[threshold]!;
      double += b.double;
      speed += b.speed;
      preserve += b.preserve;
    }
  }
  return { double, speed, preserve };
}

// ───────────────────────────────────────────────────────────────────────────
// Blessings of the Reach (Welt-Segen, täglich nach Wochentag wechselnd, 2026-07-21)
//
// Rein aus dem Kalendertag abgeleitet (engine/src/blessing.ts: `blessingForTime`) — KEIN neuer
// Save-State, KEIN SAVE_VERSION-Bump, KEINE Migration. Mild positiv, additiv zu allen bestehenden
// Boni (Ausrüstung/Set/Buffs/Mastery/Pets/Meisterweihen); wirkt an den jeweiligen Grant-Punkten
// (XP/Gold/Loot/Aktionsdauer/Angriffstempo) — siehe tick.ts/combat.ts Integrationsstellen.
// ───────────────────────────────────────────────────────────────────────────

export type BlessingId =
  | "bloodmoon" | "ashenstorm" | "silence" | "rotmist"
  | "mistvigil" | "greed" | "wildhunt";

export type BlessingEffectKind =
  // Chance (0..1, KEIN Multiplikator!), dass der GESAMTE Kill-Loot verdoppelt wird: EIN Wurf pro
  // Kill; bei Erfolg jeder Stack nochmal in gleicher Menge + jede Drop-Instanz als Duplikat
  // (Task #337, ersetzt das frühere "beastLoot" = +% Beute-Menge). Anwendung: combat.ts Kill-Pfad.
  | "doubleLootChance"
  | "gather"       // +% Ertrag der Sammel-Skills (mining/woodcutting/foraging/fishing …)
  | "craftSpeed"   // +% Handwerks-Tempo (Aktion läuft schneller)
  | "rareDrop"     // +% Chance auf seltene Drops
  | "xp"           // +% XP (alle Skills, inkl. Combat)
  | "gold"         // +% Gold
  | "attackSpeed"; // +% Angriffstempo im Kampf (schnellere Angriffe)

export interface Blessing {
  id: BlessingId;
  kind: BlessingEffectKind;
  /**
   * Effekt-Stärke. Für die Multiplikator-Arten ein Faktor (z.B. 1.15 = +15 %, gelesen über
   * `blessingMult`, neutral = 1); für die CHANCE-Art `doubleLootChance` eine Wahrscheinlichkeit
   * 0..1 (z.B. 0.15 = 15 %, gelesen über `blessingChance`, neutral = 0). Bewusst EIN Feld
   * (Umgewichtung bleibt ein reiner Zahlen-Edit in blessing.ts, keine Struktur-Änderung).
   */
  mult: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Das Lager (Encampment, 0.3.0 Phase 1 — SAVE_VERSION 76, Task #358)
//
// Bindende Grundlagen: design/encampment-konzept.md (Regeln + Balance-Korrekturen),
// design/encampment-balance.md §3 (exakte 45 Stücklisten), design/lore/encampment-lore.md
// (Namen/Flavor EN/DE). Katalog: `ContentDB.campBuildings` (optional — ohne Katalog ist das
// Lager komplett inert, Alt-/Test-Fixtures unberührt). Engine-Verben: engine/camp.ts
// (startCampBuild/cancelCampBuild/tickCampBuild/campBoost) — die UI liest NIE raw.
// ───────────────────────────────────────────────────────────────────────────

/** ID eines Lager-Gebäudes (Konvention: `camp_<name>`, kollisionsfrei zu Item-/Monster-IDs). */
export type CampBuildingId = string;

/**
 * Wirkungs-Arten der Lager-Gebäude (Enum nach der Gebäudeliste in encampment-konzept.md, inkl.
 * der Balance-Korrekturen: Schreibzelt = `buildSpeed` statt Queue-Slots [K1], Zentralhaus-Bauplätze
 * +4/+5/+5 [K4], Schrein OHNE wildhunt [K2 — Ausnahme lebt in der Welle-2-Verdrahtung]).
 *
 * SEIT WELLE 2 (Task #359, SAVE 77) sind ALLE Arten verdrahtet (Stelle in Klammern):
 *  - buildSlots     Zentralhaus: Gebäudekapazität (+4/+5/+5; Legacy-Key, Gate-Logik engine/camp.ts)
 *  - offlineCapMs   Wachturm: +Offline-Cap in ms (shared `effectiveMaxOfflineMs` →
 *    persistence deserialize-Fenster + Sanitize-Klemmen aufs Maximal-Cap)
 *  - bankSlots      Vorratsspeicher: +Bank-Plätze (shared `effectiveBankCapacity(state, content)`)
 *  - buildSpeed     Schreibzelt: Anteil Bauzeit-Reduktion neuer Bau-Jobs (engine/camp.ts
 *    `startCampBuild`, 0.10/0.20/0.30 — wirkt nur auf NEUE Jobs, nie rückwirkend)
 *  - fishingSpeed / woodcuttingSpeed / miningSpeed / thievingSpeed: Anteil Dauer-Reduktion des
 *    jeweiligen Sammel-Skills (engine/tick.ts `effectiveActionDurationMs` via
 *    CAMP_SKILL_SPEED_KIND; je ≤ 0.15, Klemme CAMP_SPEED_CUT_CAP)
 *  - farmingSpeed   Saatgarten: Anteil Reifezeit-Reduktion (farming.ts `effectiveGrowMs`) UND
 *    Foraging-Dauer-Reduktion (Aktions-Pfad, s. CAMP_SKILL_SPEED_KIND; ≤ 0.12)
 *  - craftSpeed     Werkhof: Anteil Dauer-Reduktion ALLER 6 Handwerks-Skills (≤ 0.09, Aktions-Pfad)
 *  - smeltRate / smokeRate: Offline-Veredelungs-Rate in Stück/h (20/40/60; engine/refine.ts
 *    `tickCampRefine` — läuft „nebenher" online UND offline, Rezept-Slot `camp.refine`)
 *  - slayerPoints   Trophäenwand: +Anteil Slayer-Punkte (≤ 0.30; additiv zum Meisterring in
 *    engine/slayer.ts `recordKillForSlayer`, Gesamt-Klemme SLAYER_POINTS_TOTAL_BONUS_CAP ×1.5)
 *  - blessing       Schrein der Stillen: +Anteil Segens-Effekt (≤ 0.30, Bonus-Anteil ×(1+Anteil);
 *    wildhunt AUSGENOMMEN [K2] — Ersatz: Elite-Ruhe-Cooldown-Tick, engine/elites.ts)
 *  - sellBonus      Händlerposten: +Anteil Verkaufserlös (≤ 0.06; additiv zum Pet in
 *    engine/shop.ts `effectiveSellPrice`, Gesamt-Klemme SELL_BONUS_TOTAL_CAP +15 %)
 */
export type CampBoostKind =
  | "buildSlots"
  | "offlineCapMs"
  | "bankSlots"
  | "buildSpeed"
  | "fishingSpeed"
  | "woodcuttingSpeed"
  | "miningSpeed"
  | "farmingSpeed"
  | "thievingSpeed"
  | "craftSpeed"
  | "smeltRate"
  | "smokeRate"
  | "slayerPoints"
  | "blessing"
  | "sellBonus"
  /** Taverne (SAVE 84): Stufen-Marker, Wirkung in engine/tavern.ts (Gratis-Wechsel, Gold-Faktor). */
  | "tavernPerks";

/**
 * Laengen-Deckel der New-Haven-Bauwarteschlange (SAVE_VERSION 81). Bei EINEM Bautrupp und drei
 * Stufen je Gebaeude ist alles darueber nicht mehr ueberschaubar — und ein unbegrenztes Feld im
 * Save waere eine Einladung fuer korrupte Alt-Staende.
 */
export const CAMP_BUILD_QUEUE_MAX = 8;

/** Höchste Ausbaustufe jedes Lager-Gebäudes (I..III). */
export const CAMP_MAX_BUILDING_LEVEL = 3;

/** ID des Zentrums-Gebäudes: das Zentralhaus erhöht Kapazität und zählt selbst NICHT dagegen. */
export const CAMP_TOWNHALL_ID = "camp_townhall";

/*
 * KEIN `CAMP_UNLOCK_QUEST_ID` MEHR (Task #365, Chef-Entscheid 27.07.): New Haven ist ab SPIELSTART
 * verfügbar — die Heimatbasis, an der der Charakter ankommt, statt einer Kapitel-4-Belohnung. Das
 * frühere Zugangs-Gate (chronicle_04) ist ersatzlos entfallen, in der Engine (`campUnlocked` +
 * Grund `locked`) wie im Content (Zentralhaus Stufe I trägt kein `requiresQuest` mehr).
 *
 * SEIT TASK #366 (Bauteil-System, 27.07.) GILT DAS AUCH FÜR DIE FRÜHEREN STUFEN-PACING-GATES:
 * Zentralhaus II/III trugen chronicle_09/14, das ist gestrichen — kein `CampBuildingLevelDef` im
 * gesamten Katalog setzt `requiresQuest` mehr. Die neuen Bauteil-Materialien (`timber_beam`/
 * `timber_brace`/`timber_anchor`) sind jetzt das alleinige Pacing-Gerüst für JEDE Stufe (laufen
 * über die normale Kosten-Prüfung, `levelDef.items`). Der generische Engine-Check dafür
 * (`questGateMet`, Grund `quest_required`) ist in camp.ts ersatzlos entfallen — das Feld
 * `CampBuildingLevelDef.requiresQuest` selbst bleibt aber im Typ (generischer, optionaler
 * Mechanismus, den eine künftige Content-Stufe wieder setzen könnte).
 */

/** Eine Ausbaustufe eines Lager-Gebäudes (Kosten + Bauzeit + Wirkung DIESER Stufe). */
export interface CampBuildingLevelDef {
  /** Gold-Kosten dieser Stufe (encampment-balance.md §3: I = Anker, II = 5×I, III = 4×II). */
  gold: number;
  /** Material-Kosten (echte Katalog-Item-IDs; Abbuchung über die normalen Inventar-/Bank-Pfade). */
  items: { itemId: ItemId; qty: number }[];
  /** Basis-Bauzeit in ms (encampment-konzept.md-Tabelle; Schreibzelt-`buildSpeed` verkürzt NEUE Jobs). */
  buildMs: number;
  /**
   * Wirkung dieser Stufe als DELTA (nicht Gesamtwert): `campBoost` summiert die Deltas aller
   * GEBAUTEN Stufen — z.B. Fischerhütte 0.05/0.05/0.05 ⇒ Stufe II liefert 0.10 gesamt.
   */
  boost: { kind: CampBoostKind; value: number };
  /**
   * Optionales Quest-Gate DIESER Stufe (Muster ZoneDef/DungeonDef.requiresQuest) — REIN GENERISCH
   * & aktuell ohne Content-Nutzung: seit Task #366 (Bauteil-System, 27.07.) setzt KEIN
   * `CampBuildingLevelDef` im Katalog dieses Feld mehr (die früheren Zentralhaus-Einträge
   * chronicle_09/14 sind gestrichen — die neuen Bauteil-Materialien in `items` sind jetzt das
   * alleinige Stufen-Pacing). Der Engine-seitige Check (`questGateMet`, Grund `quest_required`)
   * ist entsprechend aus camp.ts entfernt; das Feld bleibt nur als optionaler Mechanismus stehen,
   * den eine künftige Stufe wieder aktivieren könnte (dann müsste der Engine-Check zurückkehren).
   * Die übrigen Gebäude gaten unabhängig davon strukturell über die Zentralhaus-Stufe
   * (Balance-K4: Stufe II braucht Zentralhaus II, III braucht III — engine/camp.ts `townhall_required`).
   */
  requiresQuest?: string;
}

/** Ein Lager-Gebäude (15 Stück, encampment-lore.md §3 — Namen/Flavor EN/DE + Locale-Overlays ×7). */
export interface CampBuildingDef {
  id: CampBuildingId;
  name: LocalizedString;
  /** Flavor-Zeile aus der Lore (encampment-lore.md §3). */
  description?: LocalizedString;
  /** Genau CAMP_MAX_BUILDING_LEVEL Einträge (Index 0 = Stufe I … Index 2 = Stufe III). */
  levels: CampBuildingLevelDef[];
}

/**
 * Der EINE aktive Bautrupp-Auftrag (encampment-konzept.md Regel 4: EIN Bautrupp). `remainingMs`
 * zählt in deterministischer SPIELZEIT herunter (engine/tick.ts `step()` −TICK_MS je Tick, online
 * wie offline über denselben advance-Pfad — NIE Date.now in der Engine, kein RNG-Zug).
 */
export interface CampBuildJob {
  buildingId: CampBuildingId;
  /** Zielstufe dieses Auftrags (immer aktuelle Stufe + 1, 1..CAMP_MAX_BUILDING_LEVEL). */
  targetLevel: number;
  /** Verbleibende Bauzeit in ms (bei Job-Start bereits um `buildSpeed` verkürzt — nie rückwirkend). */
  remainingMs: number;
}

/**
 * Rezept-Slot der Offline-Veredelung (SAVE_VERSION 77, Task #359 — encampment-balance.md §4):
 * je Veredelungs-Gebäude (Schmelzofen/Räucherhaus) EIN gewähltes Rezept. Wahl/Verarbeitung
 * AUSSCHLIESSLICH über engine/refine.ts (`setCampRefineRecipe`/`tickCampRefine`).
 */
export interface CampRefineSlot {
  /** Gewähltes Rezept (ActionId eines eligiblen Basis-Rezepts, s. engine/refine.ts Eligibility). */
  recipeId: ActionId;
  /**
   * Fortschritts-Akkumulator in getickter Spielzeit-ms (0..msPerRun). Alle
   * `3 600 000 / rate` ms (rate = smeltRate/smokeRate-Summe des Gebäudes, 20/40/60) schließt
   * EIN Durchlauf ab; bei leerem Input/vollem Ziel klemmt er verlustfrei auf einen Durchlauf.
   */
  accMs: number;
  /**
   * Abgeschlossene Durchläufe SEIT der Rezeptwahl (Rezeptwechsel nullt accMs, `produced` bleibt
   * je Gebäude bestehen; Slot löschen verwirft ihn). Diff-Basis des Offline-Reports
   * (`OfflineSummary.campRefined`) und UI-Anzeige „bisher veredelt".
   */
  produced: number;
}

/** Persistierter Lager-Zustand (`GameState.camp`, SAVE_VERSION 76; `refine` seit 77). */
export interface CampState {
  /**
   * Gebäude-Stufen je Camp-Gebäude-ID: NUR gebaute Gebäude (Stufe 1..3) haben einen Eintrag;
   * fehlend = Stufe 0/ungebaut. sanitize strippt unbekannte IDs und klemmt auf ganze Zahlen 1..3.
   */
  buildings: Record<CampBuildingId, number>;
  /** Aktiver Bau-Auftrag oder null (Bautrupp frei). */
  buildJob: CampBuildJob | null;
  /**
   * Bauwarteschlange (SAVE_VERSION 81, Spieler-Report 1.0.2: "ability to queue up what would
   * start next after the current project ends"). Reihenfolge = Startreihenfolge; der EINE
   * Bautrupp arbeitet sie von vorn ab, sobald er frei wird (`advanceCampQueue`, engine/camp.ts).
   *
   * Nur Gebaeude-IDs, KEINE Zielstufe: die ergibt sich beim Anlauf aus dem dann aktuellen Stand
   * (aktuelle Stufe + 1). Zweimal dasselbe Gebaeude einreihen baut also Stufe II und danach III.
   *
   * KOSTEN werden beim START abgebucht, nicht beim Einreihen — eine Warteschlange, die
   * stundenlang steht, soll kein Material binden, das der Spieler bis dahin noch braucht.
   * Folge: reicht es beim Anlauf nicht, bleibt der Eintrag stehen (die UI nennt den Grund).
   *
   * Laenge geklemmt auf CAMP_BUILD_QUEUE_MAX — mehr waere ohnehin nicht ueberschaubar.
   */
  buildQueue: CampBuildingId[];
  /**
   * Monotoner Lebenszeit-Zähler fertiggestellter Bauten (Muster petDropSeq) und die EINZIGE
   * Quelle der `lastCompletedBuild.seq`-Werte. Wird NIE genullt oder gesenkt; sanitize erzwingt
   * buildSeq ≥ lastCompletedBuild.seq.
   */
  buildSeq: number;
  /**
   * Breadcrumb des jüngsten fertiggestellten Baus (Muster `lastPetDrop`). Die UI quittiert mit
   * null — seit Task #364 tut sie das auch wirklich (bis dahin war dieser Satz eine unerfüllte
   * Zusage: der Breadcrumb wurde geschrieben, gehärtet und persistiert, aber von KEINER .tsx
   * gelesen, und ein online fertiggestellter Bau meldete sich beim Spieler nie).
   *
   * GENAU EINER von zwei Meldern quittiert, nie beide (Regel „wer meldet, quittiert"):
   *  • Bau-fertig-Toast „Der Bautrupp meldet: {Gebäude} steht." (client Toasts.tsx) — der
   *    Normalfall im laufenden Spiel und der Nachzügler für offline Fertiggestelltes, das die
   *    Offline-Bühne nicht gezeigt hat;
   *  • „Während du weg warst"-Bühne (client GameContext.loadGame → `OfflineSummary.campBuilds`),
   *    wenn sie tatsächlich aufgeht.
   */
  lastCompletedBuild: { buildingId: CampBuildingId; level: number; seq: number } | null;
  /**
   * Offline-Veredelung (SAVE_VERSION 77): je Veredelungs-Gebäude-ID der EINE gewählte
   * Rezept-Slot; fehlend = kein Rezept gewählt (Anlage ruht). sanitize strippt Einträge zu
   * unbekannten/Nicht-Veredelungs-Gebäuden und unbekannten/unpassenden Rezept-IDs.
   */
  refine: Record<CampBuildingId, CampRefineSlot>;
  /**
   * New-Haven-Dorfkarte (SAVE_VERSION 78, Task #370 — FREIE PLATZIERUNG): Standort je Gebäude als
   * NORMALISIERTE Karten-Koordinate (0..1, s. `CampPos`). Einen Eintrag hat GENAU, wer auf der
   * Karte steht — jedes gebaute Gebäude (Stufe ≥ 1) und das Gebäude eines laufenden NEUBAUS
   * (targetLevel 1; der Bautrupp reserviert seinen Platz ab dem Baustart und gibt ihn bei
   * `cancelCampBuild` wieder frei). Geschrieben AUSSCHLIESSLICH von den Engine-Verben
   * (`placeCampBuilding`/`moveCampBuilding`/`startCampBuild`-Autoplatzierung, gelöscht von
   * `demolishCampBuilding`/`cancelCampBuild`); sanitize repariert (`campRepairPositions`).
  */
  positions: Record<CampBuildingId, CampPos>;
  /**
   * codex:2026-08-03T12:45:00+02:00 — Persistierte, rein visuelle Karten-Anpassung je Gebäude.
   * Fehlt ein Eintrag, nutzt der Renderer den rangabhängigen Standard. Der Eintrag überlebt
   * Rang-Upgrades; Reset oder Abriss entfernt ihn vollständig.
   */
  mapVisuals: Record<CampBuildingId, CampMapVisual>;
}

/** Frischer/migrierter Lager-Zustand: nichts gebaut, Bautrupp frei, keine Historie, kein Rezept. */
export function defaultCampState(): CampState {
  return {
    buildings: {},
    buildJob: null,
    buildQueue: [],
    buildSeq: 0,
    lastCompletedBuild: null,
    refine: {},
    positions: {},
    mapVisuals: {},
  };
}

// ── Lager-Verdrahtung (Welle 2, Task #359) — pure Helpers + Klemmen (balance.md §7) ─────────────
//
// Die generische Boost-Summe lebt HIER (pure Funktion über CampState + Katalog), damit shared
// selbst (`effectiveBankCapacity`/`effectiveMaxOfflineMs`) und persistence sie OHNE Engine-Import
// nutzen können; engine/camp.ts `campBoost` delegiert hierher (und cached per buildSeq).

/**
 * Aufsummierter Boost-Wert aller GEBAUTEN Stufen einer Wirkungs-Art (Stufen-Deltas, s.
 * CampBuildingLevelDef.boost). Ohne Lager-State, ohne Katalog, ohne gebaute Gebäude oder ohne
 * passende Art exakt 0 (neutral — Guard balance.md §7.1). Defensiv gegen korrupte Stufenwerte
 * (nicht-endlich → 0; Klemme 0..CAMP_MAX_BUILDING_LEVEL). Ein LAUFENDER Bau zählt nicht.
 */
export function campBoostSum(
  camp: CampState | null | undefined,
  catalog: readonly CampBuildingDef[] | undefined,
  kind: CampBoostKind,
): number {
  if (!camp || typeof camp !== "object" || !catalog || catalog.length === 0) return 0;
  const buildings = camp.buildings;
  if (!buildings || typeof buildings !== "object") return 0;
  let sum = 0;
  for (const b of catalog) {
    const raw = buildings[b.id];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const level = Math.max(0, Math.min(CAMP_MAX_BUILDING_LEVEL, Math.floor(raw)));
    for (let i = 0; i < level && i < b.levels.length; i++) {
      const boost = b.levels[i]!.boost;
      if (boost.kind === kind && Number.isFinite(boost.value)) sum += boost.value;
    }
  }
  return sum;
}

/**
 * MAXIMAL erreichbarer Boost einer Art laut Katalog (Summe ALLER Stufen-Deltas, unabhängig vom
 * Baufortschritt) — z.B. für „aufs maximal mögliche Offline-Cap klemmen" (persistence-Sanitize)
 * und die Envelope-Guards. 0 ohne Katalog.
 */
export function campCatalogMaxBoost(
  catalog: readonly CampBuildingDef[] | undefined,
  kind: CampBoostKind,
): number {
  if (!catalog) return 0;
  let sum = 0;
  for (const b of catalog) {
    for (const lvl of b.levels) {
      if (lvl.boost.kind === kind && Number.isFinite(lvl.boost.value)) sum += lvl.boost.value;
    }
  }
  return sum;
}

// ── New-Haven-Dorfkarte: Fläche, Grundfläche, Raster (SAVE_VERSION 78, Task #370) ───────────────
//
// ALLES HIER IST REINE GEOMETRIE über normalisierten 0..1-Koordinaten — keine Pixel, kein RNG,
// keine Zeitquelle, kein Content. Die Konstanten leben in shared (nicht im Content-Katalog), weil
// persistence (sanitize/Migration) sie OHNE Engine-Import braucht und die UI dieselbe Wahrheit
// zeichnen muss, gegen die die Engine prüft (design/newhaven-karte-spec.md §2).

/**
 * Position auf der Dorfkarte: normalisierte Koordinaten relativ zur Kartengrafik.
 * `x` 0 = linker Rand … 1 = rechter Rand, `y` 0 = OBERER Rand … 1 = unterer Rand (Bild-Konvention,
 * dieselbe Achsenrichtung wie CSS/Canvas). Der Punkt ist immer der MITTELPUNKT des Gebäudes.
 *
 * BEWUSST NICHT IN PIXELN: die Karte skaliert responsiv und die finale Grafik kommt erst später —
 * normalisierte Werte überleben jeden Auflösungs- und Asset-Wechsel unverändert.
 */
export interface CampPos {
  x: number;
  y: number;
}

/** codex:2026-08-03T12:45:00+02:00 — Gemeinsame Save-/Engine-/UI-Grenzen für Karten-Skalierung. */
export const CAMP_MAP_VISUAL_SCALE_MIN_PERCENT = 1;
export const CAMP_MAP_VISUAL_SCALE_MAX_PERCENT = 300;

/** Rein visuelle, vom Spieler gespeicherte Darstellung eines Gebäudes auf der New-Haven-Karte. */
export interface CampMapVisual {
  scalePercent: number;
  flipped: boolean;
}

/** Ein Flächen-Polygon der Karte (≥ 3 Punkte, im Uhrzeigersinn, Koordinaten wie `CampPos`). */
export type CampMapPolygon = readonly Readonly<CampPos>[];

// Anmerkung logic-dev 2026-08-03 (Engine-Audit KO1) zum codex-Block direkt darunter: dessen
// Schluss-Satz „Kartenrand und Kollision" ist bei der KOLLISION überholt — der spätere
// Chef-Nachentscheid 31.07. (codex:2026-07-31T23:56:00, s. `campRepairPositions` unten und
// engine/camp.ts `campPositionReason`) hat die Gebäude-Kollision gestrichen. Einzige räumliche
// Regel ist der Kartenrand; Überlappung ist erlaubt und bleibt exakt erhalten.
/**
 * codex:2026-07-31T19:00:03+02:00 — Chef-Entscheid: Die gesamte Kartenfläche ist bebaubar.
 * `CAMP_MAP_BUILDABLE` bleibt als kompatibler Geometrie-Export erhalten, beschreibt nun aber die
 * volle normalisierte Karte. Die tatsächliche Randprüfung berücksichtigt zusätzlich die jeweilige
 * Gebäude-Grundfläche via `campPositionFitsMap`; feste Lichtungs-/Wasser-/Fels-Sperrzonen und
 * sichtbare Bauslots gibt es nicht mehr. Einzige räumliche Regeln sind Kartenrand und Kollision.
 */
export const CAMP_MAP_BUILDABLE: readonly CampMapPolygon[] = [
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
];

/** Grundfläche eines Gebäudes: Halb-Achsen eines achsenparallelen Rechtecks in 0..1-Einheiten. */
export interface CampFootprint {
  halfW: number;
  halfH: number;
}

/**
 * codex:2026-07-31T20:21:01+02:00 — Größere, quadratische Gebäudebühne auf der festen 16:9-Karte.
 * Breite und Höhe bleiben normalisierte Kartenanteile, niemals Pixel. 16 % Kartenbreite entsprechen
 * auf einer 16:9-Karte 28,44 % Kartenhöhe; dadurch bleiben die quadratischen 640×640-Sprites auf
 * jeder Auflösung unverzerrt. Sie ist die konservative Town-Hall-Bühne; kleinere Gebäudefamilien
 * werden darin visuell skaliert und erhalten dadurch bewusst zusätzlichen Kollisionsabstand.
 */
export const CAMP_FOOTPRINT: Readonly<CampFootprint> = { halfW: 0.08, halfH: 0.1422 };

/** Nachkommastellen, auf die JEDE gespeicherte Koordinate gerundet wird (Save bleibt stabil/lesbar). */
export const CAMP_POS_DECIMALS = 4;

/**
 * Toleranz des Kollisionstests: zwei Grundflächen, die sich exakt BERÜHREN, überlappen nicht.
 * Ohne die Toleranz würde die Fließkomma-Darstellung gerundeter Koordinaten „Kante an Kante"
 * mal als Treffer, mal als Lücke werten.
 */
export const CAMP_POS_EPSILON = 1e-9;

/**
 * logic-dev 2026-08-03 (Release-Fix 0.3.0, Bot-1 Befund 3): Zentrale LICHTUNGSFLÄCHE der
 * Lagerkarte als Rechteck der RASTER-MITTELPUNKTE (0..1, Bild-Konvention wie `CampPos`). Das
 * Auto-Raster wurde bisher aus den Kartenrand-Grenzen abgeleitet (erster Platz {0.08, 0.1422}) —
 * auf der echten Karte (`camp_map_day.webp`) liegen diese Randplätze aber im Waldhang (oben
 * links), an der Felswand (oben rechts), am Bach mit Brücke (unten links) und an der Palisade
 * (unten rechts). Das Rechteck deckt die freie Lichtungsmitte um die Feuerstelle (~0.50/0.49):
 * links der Hangfuß (~x 0.12–0.17), rechts der tote Baumbestand (~x 0.76+), oben der Waldsaum
 * (~y 0.10) und die Felsbasis, unten Bachufer/Palisade (~y 0.74+) — jeweils mit Luft, da die
 * Werte MITTELPUNKTE sind und die Gebäudebühne (`CAMP_FOOTPRINT`) darum herum gezeichnet wird.
 * Jeder Rasterplatz erfüllt `campPositionFitsMap` (volle Bühne im Kartenrand) — Auto-Plätze sind
 * dadurch load-stabil (der Reparatur-Pass fasst sie nie wieder an).
 */
export const CAMP_LAYOUT_AREA = { minX: 0.22, maxX: 0.82, minY: 0.26, maxY: 0.68 } as const;

/**
 * Spalten × Zeilen des Auto-Rasters — 18 Plätze für die 16 Gebäudefamilien (15 aus 0.3.0 + die
 * Taverne, 1.2.0/SAVE 84). logic-dev 27.08.2026: sechste Spalte RECHTS angehängt (maxX 0.70 →
 * 0.82) bei UNVERÄNDERTER Schrittweite 0.12 — die 15 bestehenden Rasterplätze behalten exakt ihre
 * Koordinaten (Migrations-/Load-Stabilität der Alt-Saves), nur ein VOLLES Lager schiebt das 16.
 * Gebäude in die neue Spalte (x 0.82, am Baumbestand — kostenlos verschiebbar).
 */
export const CAMP_LAYOUT_COLS = 6;
export const CAMP_LAYOUT_ROWS = 3;

/**
 * Zuständigkeits-HALBZELLE eines Rasterplatzes (halbe Schrittweite je Achse): ein Platz gilt als
 * belegt, sobald der MITTELPUNKT eines platzierten Gebäudes in seiner Zelle liegt
 * (`campFirstFreeLayoutSlot`). Bewusst NICHT die volle Gebäudebühne: die Lichtung ist kleiner als
 * 15 kollisionsfreie Bühnen (Bühnenfläche 0.16×0.2844 ⇒ 15 Stück ≈ 68 % der GESAMT-Karte) — und
 * Überlappung ist seit dem Chef-Entscheid 2026-07-31 ohnehin eine erlaubte Spielerwahl. Die
 * Zellen-Semantik garantiert weiterhin: die Auto-Verteilung vergibt jeden Platz höchstens einmal.
 */
export const CAMP_LAYOUT_CLAIM: Readonly<CampFootprint> = {
  halfW: (CAMP_LAYOUT_AREA.maxX - CAMP_LAYOUT_AREA.minX) / (CAMP_LAYOUT_COLS - 1) / 2,
  halfH: (CAMP_LAYOUT_AREA.maxY - CAMP_LAYOUT_AREA.minY) / (CAMP_LAYOUT_ROWS - 1) / 2,
};

/** Punkt-„Grundfläche" für den Zellen-Test in `campFirstFreeLayoutSlot` (nur der Mittelpunkt zählt). */
const CAMP_LAYOUT_POINT: Readonly<CampFootprint> = { halfW: 0, halfH: 0 };

/** Rundet eine Koordinate auf `CAMP_POS_DECIMALS` und klemmt sie auf 0..1 (nicht-endlich → 0.5). */
export function campClampCoord(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0.5;
  const clamped = Math.max(0, Math.min(1, v));
  const f = 10 ** CAMP_POS_DECIMALS;
  return Math.round(clamped * f) / f;
}

/** Geklemmte + gerundete Position — die Form, in der JEDER Schreibpfad speichert. Idempotent. */
export function campClampPos(pos: { x: unknown; y: unknown }): CampPos {
  return { x: campClampCoord(pos.x), y: campClampCoord(pos.y) };
}

/** Grundfläche eines Gebäudes. Heute für alle gleich (s. CAMP_FOOTPRINT). */
export function campFootprint(_buildingId: CampBuildingId): Readonly<CampFootprint> {
  return CAMP_FOOTPRINT;
}

/**
 * codex:2026-07-31T19:00:03+02:00 — Passt die VOLLSTÄNDIGE Grundfläche auf die Karte?
 * Der gespeicherte Punkt ist der Mittelpunkt; deshalb reicht ein bloßer 0..1-Mittelpunkt nicht.
 */
export function campPositionFitsMap(buildingId: CampBuildingId, pos: CampPos): boolean {
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return false;
  const fp = campFootprint(buildingId);
  return (
    pos.x - fp.halfW >= 0 &&
    pos.x + fp.halfW <= 1 &&
    pos.y - fp.halfH >= 0 &&
    pos.y + fp.halfH <= 1
  );
}

/**
 * Liegt der Punkt auf der bebaubaren Fläche? Ray-Casting (even-odd) über alle Polygone — rein
 * arithmetisch, damit online, offline, Migration und UI dieselbe Antwort geben.
 */
export function campPointInBuildable(x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  for (const poly of CAMP_MAP_BUILDABLE) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const b = poly[j]!;
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

/** Überlappen sich zwei Grundflächen (achsenparalleler Rechteck-Test, Berühren erlaubt)? */
export function campBoxesOverlap(
  a: CampPos,
  aFp: Readonly<CampFootprint>,
  b: CampPos,
  bFp: Readonly<CampFootprint>,
): boolean {
  return (
    Math.abs(a.x - b.x) < aFp.halfW + bFp.halfW - CAMP_POS_EPSILON &&
    Math.abs(a.y - b.y) < aFp.halfH + bFp.halfH - CAMP_POS_EPSILON
  );
}

/**
 * Das gleichmäßige RASTER freier Plätze auf der zentralen Lichtung (`CAMP_LAYOUT_AREA`,
 * zeilenweise von oben links, `CAMP_LAYOUT_COLS × CAMP_LAYOUT_ROWS` Plätze). Zweck: die
 * deterministische Auto-Verteilung — Migration von Bestandsspielern, sanitize-Reparatur und die
 * Autoplatzierung eines Neubaus aus der Listen-Ansicht greifen ALLE hierauf zu, damit „wo landet
 * mein Gebäude, wenn ich es nicht selbst hinstelle?" genau EINE Antwort hat. Rein aus den
 * Konstanten berechnet (einmalig memoisiert), NIE spielstandabhängig. BEREITS GESPEICHERTE
 * Positionen bleiben von diesen Konstanten unberührt (`campRepairPositions` verteilt nur, was
 * keine gültige Position trägt) — eine Raster-Änderung layoutet also NIE ein Bestands-Save um.
 */
let layoutSlotsCache: readonly CampPos[] | null = null;

export function campLayoutSlots(): readonly CampPos[] {
  if (layoutSlotsCache) return layoutSlotsCache;
  const { minX, maxX, minY, maxY } = CAMP_LAYOUT_AREA;
  const stepX = CAMP_LAYOUT_COLS > 1 ? (maxX - minX) / (CAMP_LAYOUT_COLS - 1) : 0;
  const stepY = CAMP_LAYOUT_ROWS > 1 ? (maxY - minY) / (CAMP_LAYOUT_ROWS - 1) : 0;
  const slots: CampPos[] = [];
  for (let r = 0; r < CAMP_LAYOUT_ROWS; r++) {
    for (let c = 0; c < CAMP_LAYOUT_COLS; c++) {
      const pos = campClampPos({ x: minX + c * stepX, y: minY + r * stepY });
      if (campPointInBuildable(pos.x, pos.y)) slots.push(pos);
    }
  }
  layoutSlotsCache = slots;
  return slots;
}

/**
 * Welche Gebäude stehen (oder entstehen gerade) auf der Karte? KATALOG-REIHENFOLGE — die feste,
 * inhaltlich sinnvolle Ordnung, aus der jede Auto-Verteilung ihre Determinismus-Garantie zieht.
 * Enthalten ist jedes gebaute Gebäude (Stufe ≥ 1) plus das Gebäude eines laufenden NEUBAUS
 * (der Bautrupp reserviert seinen Platz ab dem Baustart).
 */
export function campPlacedBuildingIds(
  camp: CampState | null | undefined,
  catalog: readonly CampBuildingDef[] | undefined,
): CampBuildingId[] {
  if (!camp || typeof camp !== "object" || !catalog) return [];
  const jobId = camp.buildJob?.buildingId ?? null;
  const out: CampBuildingId[] = [];
  for (const b of catalog) {
    const raw = camp.buildings?.[b.id];
    const level = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (level >= 1 || b.id === jobId) out.push(b.id);
  }
  return out;
}

/**
 * Erster freier Rasterplatz — `null`, wenn das Raster voll ist (es hält exakt 15 Plätze für die
 * 15 heutigen Gebäudefamilien; nur ein von Hand verbogenes oder zukünftig erweitertes Save kann
 * ihn sprengen). „Frei" heißt seit dem Lichtungs-Raster (logic-dev 2026-08-03, Bot-1 Befund 3):
 * KEIN belegter MITTELPUNKT liegt in der Zuständigkeitszelle des Platzes (`CAMP_LAYOUT_CLAIM`) —
 * nicht mehr der volle Bühnen-Kollisionstest, denn die dichteren Lichtungs-Plätze dürfen sich an
 * den Bühnenrändern berühren (Überlappung ist ohnehin erlaubte Spielerwahl, Chef-Entscheid
 * 2026-07-31). Die Garantie der Auto-Verteilung bleibt: jeder Rasterplatz wird höchstens einmal
 * vergeben (Nachbarplätze liegen genau EINE volle Zellbreite auseinander, nie in derselben Zelle).
 * `_buildingId` bleibt für API-Stabilität in der Signatur (früher Grundflächen-abhängig; die
 * Grundfläche ist heute für alle Familien identisch und für die Zellen-Semantik irrelevant).
 */
export function campFirstFreeLayoutSlot(
  taken: readonly { readonly id: CampBuildingId; readonly pos: CampPos }[],
  _buildingId: CampBuildingId,
): CampPos | null {
  for (const slot of campLayoutSlots()) {
    let free = true;
    for (const t of taken) {
      if (campBoxesOverlap(slot, CAMP_LAYOUT_CLAIM, t.pos, CAMP_LAYOUT_POINT)) {
        free = false;
        break;
      }
    }
    if (free) return { x: slot.x, y: slot.y };
  }
  return null;
}

/**
 * REPARATUR-PASS der Karten-Positionen (persistence sanitize + Migration v77→v78, EINE Wahrheit).
 * Stellt die Invariante her: „genau die Gebäude auf der Karte haben eine Position und jede Position
 * hält die vollständige Gebäudebühne im Kartenrand." Überlappungen sind eine erlaubte Spielerwahl.
 * Deterministisch, idempotent,
 * verlustfrei (Positionen sind reine Anordnung — repariert wird nur, was nicht darstellbar ist).
 *
 * Ablauf (Katalog-Reihenfolge, wer zuerst kommt, behält seinen Platz):
 *  1. Einträge zu Gebäuden OHNE Karten-Präsenz und unbekannte IDs fallen weg.
 *  2. Jede erhaltene Koordinate wird auf 0..1 geklemmt und gerundet (`campClampPos`).
 *  3. Wer danach außerhalb der Fläche liegt,
 *     bekommt den ersten freien RASTERPLATZ (`campLayoutSlots`) — und genau das ist auch der
 *     Migrationsweg der Bestandsspieler: sie haben GAR KEINE Position, also bekommt jedes
 *     Gebäude in Katalog-Reihenfolge den nächsten freien Rasterplatz.
 *  4. Ist das Raster voll, bleibt die (in-Fläche geklemmte) Wunschposition bzw. der erste
 *     Rasterplatz stehen — kosmetische Überlappung statt Datenverlust; der Spieler kann jedes
 *     Gebäude kostenlos verschieben.
 * Die Schlüssel-Reihenfolge des Ergebnisses ist immer die Katalog-Reihenfolge (stabile Save-Bytes).
 */
export function campRepairPositions(
  camp: CampState,
  catalog: readonly CampBuildingDef[] | undefined,
): void {
  if (!camp || typeof camp !== "object") return;
  const raw = camp.positions;
  const rawOk = !!raw && typeof raw === "object" && !Array.isArray(raw);
  const ids = campPlacedBuildingIds(camp, catalog);
  const taken: { id: CampBuildingId; pos: CampPos }[] = [];
  const resolved = new Map<CampBuildingId, CampPos>();
  const pending: { id: CampBuildingId; wish: CampPos | null }[] = [];

  for (const id of ids) {
    const entry = rawOk ? (raw as Record<string, unknown>)[id] : undefined;
    let wish: CampPos | null = null;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const { x, y } = entry as { x?: unknown; y?: unknown };
      if (typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y)) {
        wish = campClampPos({ x, y });
      }
    }
    // codex:2026-07-31T19:00:03+02:00 — freie Karte: nur volle Grundfläche im Kartenrand.
    if (!wish || !campPositionFitsMap(id, wish)) {
      pending.push({ id, wish: null });
      continue;
    }
    // codex:2026-07-31T23:56:00+02:00 — gültige Prozentpositionen bleiben exakt erhalten, auch wenn
    // ihre Bühnen überlappen. `taken` verteilt nur fehlende/ungültige Positionen weiterhin lesbar.
    resolved.set(id, wish);
    taken.push({ id, pos: wish });
  }

  for (const { id, wish } of pending) {
    const slot = campFirstFreeLayoutSlot(taken, id);
    const pos = slot ?? wish ?? campLayoutSlots()[0] ?? { x: 0.5, y: 0.5 };
    resolved.set(id, { x: pos.x, y: pos.y });
    taken.push({ id, pos });
  }

  const clean: Record<CampBuildingId, CampPos> = {};
  for (const id of ids) clean[id] = resolved.get(id)!;
  camp.positions = clean;
}

/**
 * Harte Klemme des Lager-Tempo-Anteils JE Skill (Eiserne Regel 3: max +15 % Tempo je Einzel-Skill
 * über alle Stufen; der Katalog liefert exakt 0.15 bzw. 0.12/0.09 — die Klemme schützt vor
 * künftigen Content-Fehlern und hält den B2-Boden 0.60 aus balance.md §3 strukturell ein:
 * 0.85 (Mastery-Cap) × 0.92 (Pool-Cap) × 0.85 (diese Klemme) = 0.6647).
 */
export const CAMP_SPEED_CUT_CAP = 0.15;

/**
 * Lager-Tempo-Wirkungs-Art je Skill (engine/tick.ts `effectiveActionDurationMs`). NUR Sammel-/
 * Handwerks-Skills — Kampf-Skills (attack/power/defence/ranged/magic/warding/vitality) und
 * slayer haben BEWUSST keinen Eintrag (Eiserne Regel 3: Kampf unberührt; Guard
 * camp-envelope.test.ts). `foraging` läuft laut Balance-§3 über den Feldgarten (`farmingSpeed`,
 * 12 %); farming selbst hat keinen Aktions-Pfad (Reifezeit via farming.ts `effectiveGrowMs`).
 */
export const CAMP_SKILL_SPEED_KIND: Readonly<Partial<Record<SkillId, CampBoostKind>>> = {
  fishing: "fishingSpeed",
  woodcutting: "woodcuttingSpeed",
  mining: "miningSpeed",
  thieving: "thievingSpeed",
  foraging: "farmingSpeed",
  // Die 7 Handwerks-Skills (Werkhof, +9 % gesamt; seit SAVE 86 auch Schneidern):
  smithing: "craftSpeed",
  cooking: "craftSpeed",
  leatherworking: "craftSpeed",
  tailoring: "craftSpeed",
  jewelcrafting: "craftSpeed",
  runecrafting: "craftSpeed",
  herblore: "craftSpeed",
};

/**
 * Klemme des Schrein-Verstärkungs-Anteils (Katalog max. 0.30 = Stufe III; balance.md §6:
 * Bonus-Anteil × (1 + 0.10 × Stufe)). wildhunt ist AUSGENOMMEN (Kampf-Segen, Chef-Entscheid K2).
 */
export const CAMP_BLESSING_BOOST_CAP = 0.30;

/**
 * Maximal möglicher Wachturm-Offline-Cap-Bonus (Stufe III = +3 h; Katalog-Pin im Envelope-Guard).
 * Persistence klemmt Timer-Felder auf `MAX_OFFLINE_MS + CAMP_MAX_OFFLINE_BONUS_MS` (das maximal
 * MÖGLICHE Cap — die echte Fenster-Größe liefert `effectiveMaxOfflineMs` aus dem Baufortschritt).
 */
export const CAMP_MAX_OFFLINE_BONUS_MS = 3 * 3_600_000;

/**
 * Effektives Offline-Aufhol-Fenster in ms: `MAX_OFFLINE_MS` (8 h) + gebaute Wachturm-Stufen
 * (je +1 h), defensiv auf `CAMP_MAX_OFFLINE_BONUS_MS` geklemmt. EINZIGE Quelle des Fensters —
 * persistence (deserialize) und UI-Anzeigen leiten sich hieraus ab.
 */
export function effectiveMaxOfflineMs(state: GameState, content: ContentDB): number {
  const bonus = campBoostSum(state.camp, content.campBuildings, "offlineCapMs");
  return MAX_OFFLINE_MS + Math.max(0, Math.min(CAMP_MAX_OFFLINE_BONUS_MS, bonus));
}

/**
 * Gesamt-Klemme des Slayer-Punkte-Multiplikators: Trophäenwand (≤ 0.30) + Meisterring (0.10)
 * additiv in EINEM Ausdruck, gesamt NIE über ×1.5 (balance.md §6-Empfehlung — spätere Quellen
 * können nicht stapeln). Anwendungs-Stelle: engine/slayer.ts `recordKillForSlayer`.
 */
export const SLAYER_POINTS_TOTAL_BONUS_CAP = 0.5;

/**
 * Gesamt-Klemme des Verkaufsbonus: Pet (≤ 0.05) + Händlerposten (≤ 0.06) additiv, gesamt NIE
 * über +15 % (balance.md §6-Empfehlung). Anwendungs-Stelle: engine/shop.ts `effectiveSellPrice`.
 */
export const SELL_BONUS_TOTAL_CAP = 0.15;
