# Tester-Sweep 3 (20 Tester) — 2026-06-30

Gegen den GRÜN+gefixten Code (nach Sweep 1+2 + ST1 + Pet-skillXp + i18n-Cleanup). Schwerpunkt: REGRESSION der
jüngsten Fixes + Deep-Dive + Neuspieler-Durchlauf. Read-only, Temp `_tmp_v<N>.test.ts` (danach gelöscht).

Eingegangen: **19/20** (1-18,20). Offen: 19 (Sim, läuft ~150s).
- T18 Achievements: ✅ canClaimQuest-Regression grün (Off-Rotation-Daily gesperrt, kein Gold), Zähler/Schwellen/
  Quest-Ketten sauber. Bekannt: ach_quests_100 (≤88), ach_sets_all 29 vs 30 (slayer_set+slayer_set_4pc teilen
  pieces → Doppelzählung). 🟡 NEU Content: skill_level-Achievement-Leiter fehlt für Skill `slayer` (10 fehlend;
  20/21 Skills haben sie).
- T6 Auto-Eat: ✅ grün, Cooldown korrekt, Auto-Eat×Stalemate sauber (Stalemate trackt nur Gegner-HP, Heilung
  stört nicht). Funde low (Cooldown nicht bei Respawn resettet harmlos; Todesschleife nicht von Stalemate erfasst).
- T5 Stalemate-Deep: ✅ (a)-(d) grün (Regen-Wall stoppt @Tick601, gewinnbar kein Stop, Resets ok, Mikro-Schaden
  zählt nicht). 🟡 NUANCE/Balance: ST1 FALSE-TRIGGER bei gewinnbaren Kämpfen mit TTK >~100min (netto-DPS <
  1%maxHp/60s) — aktuell nur am extremsten Regen-Mob; + Miss-Streak-Grenzfall (60s ohne Treffer vs High-Evasion).
  Tunebar via STALEMATE_MIN_PROGRESS_PCT / längeres Fenster, falls künftig High-HP/Regen-Bosse. Doppel-Lifesteal
  (8%+Gear) bestätigt.
- T20 Neuspieler: ONBOARDING/Balance (→Chef): 🔴-Frühgame bull_boss L15 (667HP, 90s/Kill = 4.5× gleichstufiger
  Goblin); Ranged-Start schwächster Stil (kein +1-Basisterm, kein Lifesteal); cooked_shrimp (heal8) zu schwach
  für Nicht-Melee-Start → cooked_trout?; bronze_sword doppelt gegatet (130g + attack5); Früh-Rüstung wirkungslos
  (Engpass=Offense); kein Level-Gate-Warnhinweis. Magie-Start ok.
- T16 Enchant: ✅ Engine solide (Affix-Procs burn/frost/shock wirken, Rarity-Slot-Limit, Disenchant erhält
  Suffix, Vault, Rollback bei unpassendem Affix). Funde UI-Schicht: 🟢 NEU Disenchant-Fehlermeldung verschluckt
  (EnchantingPage feedback nur im Rune-Preview-Zweig → fehlgeschlagener Disenchant = stilles No-Op) [UI-Fix];
  Vault-Withdraw-No-Op-Feedback (NEU minor); Duplikat-Affix Flat stapelt aber Proc dedupliziert (Design-Call).
  Bekannt: Affix-Procs/Flat-Werte nicht im Item-Tooltip, Bench prüft Anwendbarkeit nicht.
- T7 Pets: ✅ Pet-skillXp-Regression bestätigt — attack-XP mit gorehound ×1.045 (earlyXpMult-Drift), vitality
  unverändert (korrekt gescoped); alle 5 Combat-Pets 1.05 für passenden Skill, 1.0 sonst; alle Ability-Kinds
  wirken + gedeckelt. Kein Bug.
- T4 Status: ✅ Shock-Clamp ≤1 beidseitig verifiziert (mag5==mag1, kein stärkerer Stun), alle 5 Typen korrekt,
  Resist/Refresh ok. Funde low: Dauer-0-Effekt wirkt 1 Tick (kein Content nutzt es), Spieler-DoT gibt keine
  Offense-XP (Balance-Asymmetrie), Stale-Kommentar status-coverage.test.
- T8 Dungeons: ✅ Regression grün — alle 5 Austrittspfade (stop/clear/tod/ammo/STALEMATE) setzen dungeonId=null+
  encounterIndex=0; Stalemate-im-Dungeon räumt sauber auf. Content-Integrität (24 Encounter, 5 Keys, Loot) ok.
  Funde = bekannte Balance (idol_sanctum-Inversion, crypt-Boss-HP 2806>höhere, wildwood→highland +2 Gate vs +80
  Mob-Level). 🟢 minor: combatStep bei korruptem Monster nullt nur monsterId nicht dungeonId (latent).
- T2 Ranged: ✅ equipAmmo-Dup-Regression grün (auch Härtetest: vorhandene gleiche Munition nicht dupliziert),
  unequip >999 grün. 🟢 NEU minor: leerer Köcher (ammoCount=0) per unequip nicht räumbar (UX); RANGED_WEAK_FACTOR
  toter Zweig (bekannt).
- T17 Save/Migration: ✅ beide Regressionen grün (null-Skill kein Crash, dt-Cap greift), Migrationskette→43
  vollständig mit allen Defaults, Determinismus/Round-Trip ok. P2/P3 nur bekannt (combat-rebuild-Falle für
  künftige persistente Felder; Stance-String-Validierung; transiente Combat-Felder beim Round-Trip weg = harmlos).
- T15 Instanzen/Suffix: ✅ alle Suffix-Stats fließen in computeStats, Instanzen stapeln nie. Bekannte Mathe-
  Mängel bestätigt (Roll-Varianz −15..0% statt ±15%, Auto-Salvage zerlegt Beinahe-Best, Low-ilvl→alle Rolls=1,
  Math.max(1) kippt künftige Negativ-Stats) — alle in instanceBonusDelta/isLowQualityInstance, BALANCE/Chef.
- T10 Crafting: ✅ L1-Regression verifiziert (Inv+Bank voll → inventory_full, kein Material-Burn; 15/15 grün).
  Beide Output-Pfade verlustfrei (auch Suffix-Instanz→Vault). Nur Beobachtungen (canHoldOutputs .some bei
  Multi-Output latent, Logik-Duplikat 3×).
- T13 Bank: ✅ Phantom-Fix hält, Crafting-aus-Bank konsistent, i18n vollständig. 🟢 NEU: Drag-Drop ohne Quell-
  Unterscheidung (Fehl-Drop hebt/lagert ganzen Stack — verlustfrei, überraschend). Bekannt: bankSlotsUsed zählt
  0-qty-Keys (defensiv `>0` filterbar), withdraw O(n).
- T14 Shop: keine neuen funktionalen Bugs. 🟢 NEU CODE: toter `isFull`-Import in ShopPage.tsx:9 (Lint, trivial
  entfernbar). 🟢 buy 1/5/10/50 vs sell 1/10/100 Asymmetrie; goldEarned-Stat fehlt. Rest bekannt (UI-Partialkauf,
  Instanz-Verkaufswert). Engine-Kauf/Verkauf korrekt.
- T11 Gathering: ✅ XP/h streng monoton (frühere Fixes halten), autoBank-Stop greift, Tool-Gating korrekt, Loot-
  IDs gültig. Funde = CONTENT/Balance: Gem-Adern≫Erz, Onyx-Wert-Inversion (rough_onyx 240<diamond 320), sapphire
  90<bloodstone 110, copper/tin_ore ohne value→0g, WC ohne WC-Tool, Fishing XP-pro-Versuch.
- T3 Magie: ✅ sauber grün, kein Bug. ST1 stoppt mana-leeren Magier korrekt (kein „endlos schwach"); magic_def-
  Gate leakt nicht in Melee/Ranged; Mana-Schild/Regen-Cap korrekt. Nur by-design-Notizen (wis-Hybrid, magic_def-XP
  für Nicht-Magier).
- T1 Melee: ✅ minHit-Regression behoben (minHit=round(maxHit×0.35) bit-identisch zum Combat-Floor, kein
  ±1-Drift); Edge-Cases (combatStyle undefined / 0 Def / Cap99) robust, keine NaN. Kein neuer Fund (nur
  bekannt: Melee-Lifesteal stumm = Combat-FX-Meilenstein).

## 🔴 NEU ZU FIXEN (Sweep 3)
- **Q1 claimQuest permanenter Reward-Verlust** [T12#1]: claimQuest (quests.ts:~160) ruft addItemOrBank OHNE
  Platz-Prüfung + markiert Quest bedingungslos `claimed` → vollem Inventar (autoBank aus/Bank voll) = Items weg
  UND einmalige Quest verbraucht = UNWIEDERBRINGLICH. Fix: vor Claim per canHoldAnywhere-Logik prüfen, sonst
  Claim blocken (return false). → CEO-Fix.
- 🟢 Kleine CODE-Fixes (Sammelpass): toter isFull-Import ShopPage [T14]; worldTaskMonsters slayerRequirementMet-
  Filter symmetrisch [T9]; bankSlotsUsed `>0`-Filter (0-qty-Key) [T13].
- ⏳ Combat-Loot-Overflow bei vollem Inv+Bank still verworfen [T12#2] + Loot-Log über-meldet [T12#3]:
  idle-Konvention (Drop-Verlust bei voll), aber Log irreführend → Chef-Call ob akzeptabel.

## ✅ SWEEP 3 ABGESCHLOSSEN (20/20) — Bilanz
- ALLE ~11 Regressionen seit Sweep 2 bestätigt GRÜN (minHit, equipAmmo-Dup, ST1+WALLS=0, shock≤1, Pet-skillXp,
  stopCombat, SL1, L1, canClaimQuest, dt-Cap, equipBag). Content-Integrität 0 orphan refs. WALLS=0 (kein
  ST1-False-Trigger am geared Held).
- CODE-FIXES gemacht + grün (Engine no-sim 457, Typecheck 5/5, Persistenz, Build): Q1 claimQuest-Reward-Verlust
  (canHoldRewards-Pre-Check + Guard-Test quests.test.ts) · worldTaskMonsters slayerRequirementMet-Filter ·
  bankSlotsUsed `>0` · toter isFull-Import ShopPage.
- ZIP läuft (b25spmhj1) → bündelt diese + zuvor unverzippte Pet-skillXp + i18n-Cleanup.
- NICHT gefixt (Chef-Domäne / Design): ST1-Nuance (False-Trigger >100min-TTK, tunebar via
  STALEMATE_MIN_PROGRESS_PCT) [T5]; Balance/Content (Fence-Traps reforge_signet/crack_smugglers_lock,
  Smelt-/Smithing-/Gem-Margen, bull_boss-Spitze, Ranged-Start, Starter-Food, slayer-Achievement-Leiter fehlt,
  ach_quests_100/ach_sets_all, Suffix-Varianz, idol_sanctum); UI-Politur (leerer Köcher räumbar,
  Bank-Drag-Quell-Unterscheidung).
- ✅ NACHGEZOGEN (autonom, UI): Affix-Werte im Item-Tooltip — affixEffectSummary zeigt jetzt Flat-Boni/Attribut-Mods/
  Proc pro Affix-Zeile (vorher nur Name+Tier). Client-Typecheck + Build grün, nicht separat geZIPpt.
- ✅ NACHGEZOGEN (autonom, UI, nicht sim-relevant): T16 Disenchant-Feedback verschluckt → Feedback-Banner aus dem
  Runen-Vorschau-Zweig herausgezogen, rendert jetzt einmalig oben im Preview-Panel → fehlgeschlagener Disenchant
  (realistisch: „Nicht genug Gold") zeigt Meldung statt stilles No-Op. 5 Typechecks + Client-Build grün. Nicht
  separat geZIPpt — bündelt mit nächster Charge.

## Funde-Log
- T9 Slayer: ✅ SL1-Regression bestätigt korrekt (kein blockierter Tower-Task bei SL1 ohne plague_mask,
  determinismus-neutral). 🟢 worldTaskMonsters filtert NICHT nach slayerRequirementMet (latent, 0 Welt-Mobs
  mit Requirement) → CODE-Kandidat „cheap insurance": Filter symmetrisch ziehen. 🟢 xpReward-Doku-Mismatch
  (Kommentar slayer.ts:234 vs round(xp*0.5*N), nur Doku). Mathe/Randfälle sonst sauber.

## Abdeckung (je 1 Tester)
1 Melee(+minHit) · 2 Ranged(+equipAmmo-Dup) · 3 Magie(+Stalemate) · 4 Status(+shock) · 5 STALEMATE+Lifesteal ·
6 Auto-Eat · 7 Pets(+skillXp im Kampf) · 8 Dungeons(+stopCombat/Stalemate) · 9 Slayer(+SL1) ·
10 Crafting(+L1 autoBank-Stop) · 11 Gathering · 12 Inventar-Datenverlust(+equipBag) · 13 Bank · 14 Shop ·
15 Instanzen/Suffix · 16 Enchant/Affixe · 17 Save/Migration(+null-Skill,dt-Cap) · 18 Achievements/Quests(+canClaimQuest) ·
19 Ökonomie-Sim+Content-Integrität(WALLS=0, ST1-False-Trigger?) · 20 Neuspieler-Durchlauf (frisch).

## REGRESSIONEN, die explizit verifiziert werden (sollten ✅)
minHit (T1) · equipAmmo-Dup (T2) · Stalemate korrekt+kein-False-Trigger (T5,T19) · shock≤1 (T4) · Pet-skillXp
im Kampf (T7) · stopCombat-Cleanup (T8) · SL1 (T9) · L1 autoBank-Stop (T10) · Equip-Datenverlust+equipBag (T12) ·
Bank-Phantom (T13) · deserialize null-Skill + dt-Cap (T17) · canClaimQuest Daily-Rotation (T18) · WALLS=0 (T19).

## KRITISCHSTE Frage: ST1 darf den geared Held NICHT fälschlich stalematen → T19 WALLS muss 0 bleiben.

---

## Funde (werden bei Eingang ergänzt)
