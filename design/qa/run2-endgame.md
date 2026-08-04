# QA-Report — Endgame-Playtest (Level 60–100+)

**Datum:** 2026-06-27 · **Rolle:** Playtester (Spieler-/QA-Sicht, read-only) · **Scope:** nur dieses Doc.
**Fokus:** Endgame-Fülle, Progression L60→Cap, Combat-Skalierung der 3 Stile, Gold-Relevanz, Spaß.
**Datenquellen (frisch im Code gemessen):**
- `packages/content/src/index.ts`: Jewelcrafting-Items 698–801 + Aktionen 6316–6350; Mining-Seams 4543–4576;
  Dragon-/Shadowhide 6067–6129; High-Level-Monster 7680–7908; Dungeons 8481–8562; Sets 8763–8770; Shop-Keys 7948–7949.
- `packages/engine/src/combat.ts` (Mitigation 218–229), `packages/shared/src/index.ts` (`DEFENSE_MITIGATION_K=125`, Equip-Slots 379–396),
  `packages/engine/src/equipment.ts` (Ring-Doppelslot 37–41).
- Quer gelesen: `design/skill-usage-audit-run2.md`, `design/balance-audit-styles-2026-06-26.md`, `design/gold-economy.md`, `design/qa/t3-final.md`.

---

## FUN-SCORE: **7 / 10**

Das Endgame ist seit Run 1 **substanziell ausgebaut und kohärent**: Die „Output-Leiter endet zu früh"-Lücke
(Jewelcrafting L82) ist geschlossen, jeder Verarbeitungs-Skill reicht jetzt bis L95–105, es gibt einen
Capstone-Boss (L120) + Endgame-Dungeon + craftbare Top-Sets. Combat ist über die 3 Stile fair (Mitigation
prozentual → keine Stil-Inversion am oberen Ende). Gezogen wird der Score von der **Gold-Irrelevanz im Endgame**
(bekannt/deferred), ein paar **Pacing-Oddities** (idolhall-HP-Regression, Dungeon-Loch L65→99) und der
**Status-Vollimmunität des Endbosses**, die Status-/Enchant-Builds entwertet. Keine P0-Blocker gefunden.

---

## TOP-STÄRKEN

1. **Jewelcrafting reicht jetzt bis L100 mit voller Kette.** Bloodstone (L44/48) füllt die alte L38–55-Lücke;
   Voidstone-Ring/-Amulett (L85/88) und Godgem-Ring/-Amulett (L95/100) bilden eine echte Endgame-Leiter.
   Die Kette schließt sich komplett: `mine_voidstone_seam` (L82) → `cut_voidstone` → `craft_voidstone_ring`
   (Input voidstone + bloodiron_bar), godgem analog mit aetherium_bar. **`godgem_jewel_set` (2-teilig,
   ring+amulet, +8 alle Schäden / +10 acc / +3 % crit)** gibt dem Skill eine Sink-Identität. Run-2-Audit-Top-Befund
   ist umgesetzt.
2. **Mining/Smithing/Leather/Runecrafting/Thieving ziehen alle bis Cap durch.** Mining: Voidstone-Seam L82 →
   Godgem-Seam L95 → Godiron L105. Leather: Dragonhide (L82) + Shadowhide (L95). Thieving: Steal+Fence bis **L115**
   (`desecrate_reliquary` L85, `appraise_idol` L95, +L105/L115). Auch der frühe Mining-Totzonen-Fix
   (`mine_gravesteel` ~L22) ist drin. Endgame-Fülle ist breit, nicht nur in einem Skill.
3. **Combat-Skalierung bleibt fair über die 3 Stile.** Defense-Mitigation ist **prozentual** (`def/(def+125)`,
   gedeckelt), nicht flach — die hochdefensiven Idolhalle-Mobs (def 40–60) senken DPS **uniform** (~25–32 %) und
   kippen die Stil-Parität nicht. Laut Styles-Audit (post-fix): Melee 🟢, Magie 🟢, Ranged 🟡 (DPS-König +26 %).
4. **Aspirations-Anker existieren.** Endgame-Dungeon `idol_sanctum` (L99, 9000 xp/8000 g/Run), Capstone
   `last_idol` (L120, 16000 xp), godgem-Schmuck, Shadowhide-/Godiron-/Aether-Gear, Doppel-Ring-Slot (Engine erlaubt
   2 Ringe → echtes Schmuck-Stacking). Es gibt am Cap noch Ziele.
5. **XP-Leiter L75→120 ohne Null-XP-Klemme.** Brücken-Monster (highland_wyvern L79, roc_void L84) + idolhall
   (92/98/104/120) halten alle Stufen-Gaps unter `XP_ZERO_GAP=15` (größter Sprung 84→92 = 8). Loot-Magnete
   (wyvern_scale, highland_key, void_rune) haben reale Sinks und ziehen aktiv hin.

---

## PRIORISIERTE FINDINGS

### [P1 Balance] Gold ist im Endgame irrelevant — und Kill-Gold *sinkt* sogar ins idolhall
**Befund (gemessen):** Pro-Kill-Gold ist von L60→L104 praktisch flach und **fällt in der Idolhalle**:
deep_kraken L60 = **250 g**, roc_storm L75 = 253, highland_wyvern L79 = 256, roc_void L84 = 262 → dann
idol_warden L92 = **189 g** (!), aether_wraith L98 = 196, scale_skarn L104 = 285, last_idol L120 = 794.
Ein L92-Gegner gibt also **weniger** Gold als ein L60-Kraken, während seine XP von 800 auf 1700+ steigt.
Gekoppelt mit dem in `gold-economy.md` dokumentierten Sink-Defizit (Faucets bis Mio g/h, Sinks einmalig/früh,
einziger mitwachsender Sink = farmbare Dungeon-Keys) wird Gold am Cap zur **Vanity-Zahl**.
**Status:** Das *Sink*-Defizit ist bekannt und bewusst an City gekoppelt/deferred — **nicht hier lösen**.
**Aber die Faucet-Regression** (idolhall-Mobs geben weniger Gold als Mid-Tier) ist ein eigenständiger, billiger
Content-Fixkandidat, unabhängig von City.
**Fix-Vorschlag:** Kill-Gold der idolhall-Mobs monoton mit Level staffeln (z. B. idol_warden ~400, aether_wraith
~480, scale_skarn ~620, statt 189/196/285), damit „höheres Level = mehr Gold" wenigstens *gefühlt* gilt, sobald
die City-Sinks landen. Reine Content-Zahl, keine Engine/Migration.

### [P2 Balance] Endboss `last_idol` ist gegen ALLE 5 Status-Effekte immun — entwertet Status-/Enchant-Builds
**Befund:** `last_idol` (L120) hat `resist: ["burn","frost","shock","bleed","poison"]`. Ein Spieler, der über die
Enchant-Kette (z. B. `void_greatsword` burn22+bleed18 = bis +50 % DoT-DPS laut Styles-Audit B6) oder
Status-Magie auf DoT gebaut hat, verliert gegen den finalen Boss **seinen kompletten Sekundär-Schaden** — genau
dort, wo er ihn braucht. Das ist als „bring Roh-Schaden"-Check legitim, aber eine **Voll**immunität auf den
*einzigen* Capstone fühlt sich entwertend an (der investierte Enchant-Pfad ist beim wichtigsten Kampf tot).
**Fix-Vorschlag:** Statt Vollimmunität eine **starke Resistenz** (z. B. DoT-Magnitude ×0.4 oder nur 2–3 der 5
Typen immun, die anderen reduziert). Erhält den „Phasen-Check"-Charakter, ohne einen ganzen Build-Pfad zu nullen.
(roc_void/aether_wraith mit `resist:["shock"]` sind als gezielte Einzel-Resists dagegen gut austariert — nur die
Voll-Immunität des Bosses ist das Problem.)

### [P2 UX/Balance] HP-Kurve ist im Idolhall nicht monoton — L92-Mob stirbt schneller als L84-Mob
**Befund (gemessen):** idol_warden L92 = **520 maxHp**, aether_wraith L98 = **480**, scale_skarn L104 = 620 —
alle **unter** highland_wyvern L79 (**780**) und roc_void L84 (**860**). Die Idolhalle setzt bewusst auf
„Rüstungs-Schwamm" (def 40–60 + regen) statt HP-Schwamm. Da Mitigation prozentual ist, ist das *rechnerisch* fair,
aber **gefühlt** seltsam: Beim Wechsel von den Highlands (L79–84) in die Idolhalle (L92+) **sinkt die effektive
Kill-Zeit** für penetrationsstarke Builds — die Progression fühlt sich rückwärts an („der neue, höhere Gegner geht
ja schneller um"). Dazu hat die Idolhalle deutlich niedrigeres Pro-Kill-Gold (siehe P1).
**Fix-Vorschlag:** maxHp der Idolhalle-Mobs monoton über die L84-Brückenmonster anheben (z. B. idol_warden ~900,
aether_wraith ~950, scale_skarn ~1150) und Defense leicht zurücknehmen, damit das Gefühl „höher = zäher" stimmt,
ohne die %-Mitigation-Fairness zu brechen. Reine Content-Zahlen.

### [P2 UX] Dungeon-Loch L65→L99 — 34 Level ohne neuen Dungeon
**Befund:** Dungeon-`requiredLevel`-Leiter: goblin_warband 12 · crypt_depths 30 · wildwood_hunt 34 ·
**highland_aerie 65** · **idol_sanctum 99**. Zwischen L65 und L99 gibt es **keinen** Dungeon — das ist das letzte
Drittel vor dem Cap, also genau die Endgame-Strecke, auf der der „große Run mit Boss"-Reiz fehlt. Die offene Welt
hat dort zwar Brücken-Monster (L79/84), aber kein Schlüssel-Sink-/Burst-Loot-Event.
**Fix-Vorschlag:** 1 Dungeon um ~L80–84 einschieben (passt thematisch zu highland_wyvern/roc_void; Key existiert
bereits als Loot-Magnet). Schließt die Lücke und gibt einen weiteren Gold/Key-Sink im Endgame.

### [P3 Politur] Fishing bleibt der aktionsärmste Endgame-Skill (15 Aktionen, dünne Endstrecke)
**Befund:** Fishing reicht zwar bis L97, ist aber mit 15 Aktionen der dünnste Skill; die Endstrecke L60→97 hat
wenig Sprossen. Output (Roh-Fisch → Cooking-Combos) ist gesund, aber als Endgame-Beschäftigung mager. Bereits im
`skill-usage-audit-run2.md` als „leichter Sparkle-Pass" notiert — hier nur als Endgame-Restpunkt bestätigt.
**Fix-Vorschlag:** wie im Audit: 1 Fisch-Stufe ~L60 + 1 seltener „Schwarm"-Premium-Drop (Combo-Food-Input).
Klein halten — Fishing ist AFK-Grundpfeiler.

### [P3 Politur] Ranged bleibt am Cap DPS-König (+26 %) — Stil-Identität vs. Parität
**Befund:** Aus dem Styles-Audit (verifiziert, post-fix): Shortbow L99 ≈ 108 DPS vs. Dagger 86 / Magie 82.
Munitionskosten sind nur Material (kein Gold) und tragen den 19–30 %-Vorsprung nicht ganz. Nicht spielzerstörend
(Glass-DPS-Identität), aber das obere Band ist weit. **Chef-Entscheid** (laut Audit): Band straffen (aIMs-Trim
−400→−300, das ist der wirksame Hebel) **oder** Ranged bewusst als DPS-König belassen, sofern spürbar squishier.
Kein neuer Befund, nur Endgame-Bestätigung.

---

## NICHT-BEFUNDE / bewusst sauber (geprüft, kein Handlungsbedarf)

- **Endgame-Schmuck-Kette vollständig & gegated:** rough→cut→craft für Voidstone/Godgem lückenlos; cross-gated über
  Smithing-Barren (bloodiron L70 / aetherium L90). Keine toten Items.
- **Doppel-Ring-Slot funktioniert:** Ringe deklarieren `ring1`, Engine legt den zweiten in `ring2`
  (`equipment.ts` 37–41) → echtes Endgame-Schmuck-Stacking möglich.
- **Essenz-/Runen-Gating korrekt:** aether_essence ab L45, void_essence erst L98+ (Styles-Audit B5 verifiziert).
- **Defense-Mitigation gedeckelt** (`DEFENSE_MITIGATION_MAX`) → kein „unverwundbar"-Asymptot trotz def-60-Mobs.

---

## EMPFEHLUNG

Das Endgame ist **shipfähig und macht Spaß** — die Leitern sind jetzt durchgehend bis Cap gefüllt, der Capstone
steht, Combat ist fair. Vor 1.0 die **billigen Content-Zahlen-Fixes** mitnehmen, die rein Content sind (keine
Engine/Migration): **(1) idolhall Kill-Gold + maxHp monoton anheben** (P1+P2, ein gemeinsamer Pass), **(2)
last_idol Status-Voll­immunität → starke Resistenz** (P2), **(3) 1 Dungeon ~L80** (P2). Die **Gold-Sink-Seite**
bleibt das eine große, bekannte, an City gekoppelte Thema — hier nur bewertet, nicht gelöst.
