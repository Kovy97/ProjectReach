# W2 — Pets/Companions + Bank/Bags (Sweep 6, Welle 2)

**Tester:** Sweep-6-W2 (Kontrolleur) · **Datum:** 2026-07-03
**Methode:** Read-only-Audit + Wegwerf-Harness `_tmp_s6w2e_*` (45 Tests: 40 engine + 5 persistence, **alle grün**, danach gelöscht). Kein Fix, kein Electron.

---

## Verdict

| Bereich | Verdict |
|---|---|
| A) Pets: 21er-Roster, Effekte, Drops, UI, Persistenz | ✅ PASS (1× P4-Kosmetik, 2× Info) |
| B) Bank/Bags: Kaufkurve, Overflow, Taschen, Instanzen, Quick-Sell, Crafting | ✅ PASS (1× P3-Kante, 2× Friction dokumentiert) |

Keine P1/P2-Funde. **Empfehlung: ship** (P3/P4 als Backlog).

---

## A) Pets/Companions

### A1 — Roster & Skill-Effekte: alle 21 verdrahtet, kein toter Bonus ✅
- Genau **21 Pets** in `packages/content/src/index.ts:13658–13975`. Für JEDES Pet wurde empirisch belegt, dass sein `skillEffect` über den zuständigen Engine-Helfer messbar wirkt (kein defined-but-never-applied):
  - `instantAction`/`doubleDrop`/`gatherYield`/`bonusAmmo`/`flawlessGem`/`bonusRunes` → Doppelertrags-Chance in `tick.ts:151–157`;
  - `refundMaterial`/`perfectCook`/`potionPreserve` → Preservation `tick.ts:94`;
  - `thievingSuccess` → Erfolgschance `tick.ts:112`;
  - `skillXp` → Skilling-XP `tick.ts:127` **und** Combat-XP `combat.ts:154` (A/B-Kampf bit-gleich: attack-XP mit skillXp(attack)-Pet = exakt 1.05× — Faktor isoliert nachgemessen);
  - `manaRegen` → `character.ts:394` (computeStats-Delta exakt ×1.05 bzw. ×1.04 belegt).
- Effekte sind korrekt skill-scoped (fremder Skill = 0) und wirken NUR bei besessen+ausgerüstet (`pets.ts:35–40`); beides empirisch bestätigt.

### A2 — Combat-Abilities: alle 21 feuern nachweislich im echten Kampf ✅
- Für **jedes der 21 Pets** wurde ein realer Kampf simuliert (Riesen-HP-Chicken) und das `petAbility`-Log-Event mit dem korrekten Ability-Kind beobachtet — inkl. der bisher nur code-seitig belegten Kinds `delayedDot`, `armorRend`, `guaranteedCrit`, `manaRestore`, `lifestealBurst`, `enemyAttackDelay`, `blockNextEnemyHit`, `armorPierceHit`, `multiHit` (Guard `pet-combat.test.ts` deckt nur 6 „live"-Kinds).
- Zustands-Stichproben: vellumoth → `petAbility.shieldHp>0`, rotbark → `enemyStunMs>0`, flayling → `enemyVulnMs>0`, glyphmaw → Mana von 0 wieder >0. `enemyAttackDelay` (ironmaw) korrekt: `enemyTimerMs` ist Aufwärts-Akkumulator (`combat.ts:1613`), Subtraktion in `combat.ts:1762` verzögert also wirklich.
- **INFO-1:** Ability-Kind `accuracyDownEnemy` ist im Engine-Dispatch implementiert + gedeckelt (`combat.ts:1794–1797`, `shared:1121`), wird aber von **keinem** Content-Pet genutzt — ungenutzte Content-Option (kein Bug; bei einem 22. Pet nutzbar). Besitzer: content-dev, nur falls gewollt.

### A3 — Drop-Quellen & Raten: alle erreichbar ✅
- 14 Skill-Pets (12 Skills + Farming + 2× runecrafting) + 7 Combat-Pets. Jede Skill-Quelle hat eine früh erreichbare Aktion (≤ Lv 15) bzw. Farming-Crops; Combat-Drop hängt am einzigen Kill-Chokepoint `onEnemyDefeated` (`combat.ts:759`) → gilt auch für Dungeon-/Tower-Kills (alle 4 Kill-Stellen rufen `onEnemyDefeated`). Farming-Ernte-Pfad separat verdrahtet (`farming.ts:115`) und durch Guard `pet-integrity.test.ts:269ff` gepinnt.
- Raten: 1/15000 (witherling, per Design) bis 1/120000 (glyphmaw); alle endlich >0. Zwei Pets teilen sich die runecrafting-Quelle (glyphmaw 1/120k + vellumoth 1/90k) — pro Aktion je ein unabhängiger Wurf bis zum Besitz, beide erreichbar.
- **INFO-2 (Kommentar-Drift):** `content/src/index.ts:13656` behauptet Band „1/75k–1/120k", real sind 12 Pets auf 1/60000 und witherling 1/15000 (Sweep4-Balance-Fixes). Stale Kommentar, kein Verhalten betroffen. Besitzer: content-dev, P4.

### A4 — Pet-UI konsistent ✅ (1 Kosmetik-Fund)
- `PetGalleryPage.tsx` zeigt beide Effekte (passiv+aktiv), Quelle, Drop-Rate; alle 12+16 Effekt-Kind-i18n-Keys existieren in EN **und** DE (`translations.ts:706–733, 1749–1776`). Alle 21 Pet-PNGs vorhanden (`assets/pets/*.png`, Auto-Discovery mit Emoji-Fallback — kein Crash-Risiko).
- Mount-Punkte sauber: `PetGalleryPage` nur via `PageContent` in `MainLayout`; `PetCelebration` (lastPetDrop-Konsument) in `MainLayout` (`App.tsx:344`) — nichts rendert vor Spielstart (`useGameState`-Crash-Gate erfüllt).
- **P4 (ui-dev):** `PetGalleryPage.tsx:15` rundet Effektwerte mit `toFixed(0)` — witherling/glyphmaw (0.045) zeigen „+5%" statt 4,5 %; overclaimt um 0,5 Pp. Eine Dezimale bei Bedarf (`+4.5%`).

### A5 — Persistenz-Roundtrip ✅
- `ownedPets`/`companionPetId`/`lastPetDrop` überleben serialize→deserialize bit-gleich (ganzer State `toEqual`). Sanitize korrekt: unbekannte ownedPets fallen raus, nicht-besessenes/unbekanntes companionPet wird abgelegt (`persistence/index.ts:316–331, 665–687` inkl. PET_RENAME-Migration v29→30).

---

## B) Bank / Bags

### B1 — Bank-Slot-Kauf: Kurve exakt, Cap hart, kein Overflow-Leck ✅
- Empirisch: genau **20 Pakete** à +10 Slots kaufbar; Preise exakt `round(5000·1.6^n)` (5 000 → 8 000 → 12 800 → … → 37 778 932 beim 20.); Gesamt-Sink ≈ 98,3 Mio Gold; Endkapazität **260** (`60 + 200`). Danach `nextBankSlotCost=null`, `buyBankSlots=false` ohne Gold-Abzug; `goldSpent` korrekt gebucht. Zu wenig Gold → State unverändert. (`bank.ts:113–135`, `shared:2892–2922`.)

### B2 — Bank-Voll-Verhalten ✅ mit einer Kante
- Volle Bank (260/60 distinkte Arten): NEUE Art wird **verlustfrei** abgelehnt (deposit=0, Item bleibt im Inventar); bestehende Stacks nehmen unbegrenzt weiter an. Abheben in volles Inventar: 0 bewegt, Bank unverändert. Persistenz klemmt `bankSlotsPurchased` (99 999→200, −5→0) und entfernt 0-qty-Geister + unbekannte Arten.
- **P3 (logic-dev):** `inventory.ts:160` (`addItemOrBank`) und `tick.ts:66` (`canHoldAnywhere`) zählen Bank-Slots per `Object.keys(state.bank).length` — **inklusive 0-qty-Geister-Keys** —, während `bankSlotsUsed`/`canDeposit` (`bank.ts:19–39`, Sweep3-T13-Fix) nur qty>0 zählen. Empirisch belegt: 59 echte Arten + 1 Geist ⇒ manuelles Einlagern erlaubt, aber Auto-Bank verwirft den Loot-Overflow still (`toBank=0`). In-Session entstehen Geister derzeit nirgends und der Load-Sanitizer räumt sie weg — Restrisiko klein, aber die drei Zählweisen sollten auf `bankSlotsUsed` vereinheitlicht werden.
- **Friction-1 (dokumentiert, kein Bug):** Bei Inventar voll + Bank voll (neue Art) geht Combat-Loot mit Auto-Bank **still** verloren (`onEnemyDefeated` hat keinen Stopp analog `canHoldOutputs` beim Skilling, `tick.ts:69–79`). Fürs Skilling sauber gelöst (Aktion stoppt mit `inventory_full`); im Kampf akzeptierte Idle-Kante. Erwähnenswert falls Spieler-Reports kommen.

### B3 — Taschen: Installation/Deinstallation verlustfrei ✅
- `installBag` verbraucht genau 1 Tasche, +bagCapacity Slots; belegter Taschen-Platz wird **nie** überschrieben (Doppel-Guard `inventory.ts:219+237`); Nicht-Taschen abgelehnt. `uninstallBag` blockiert korrekt, solange belegte Slots + 1 (für die Tasche selbst) nicht in die geschrumpfte Kapazität passen — **kein Downgrade-Verlust-Bug**: Item-Gesamtzählung über alle Sequenzen konserviert, Kompaktierung (`syncSlots`) verliert nichts. Persistenz: installierte Taschen + Slot-Länge überleben Roundtrip.
- **Friction-2 (content-gap, content-dev):** Es existiert genau **eine** Tasche im ganzen Spiel (`small_pouch`, +4, Shop 160g) bei 4 Taschen-Plätzen (`BAG_SLOT_COUNT=4`) → max. +16 Slots, keinerlei Taschen-Progression; „Wechsel/Downgrade" ist real gar nicht auslösbar. Größere Taschen (Leatherworking-Craft?) wären ein natürlicher Sink.

### B4 — Instanzen: Inventar / Vault / Equipped roundtrip-sicher, Bank geschützt ✅
- Echte Suffix-Instanz (via `tryCraftSuffix`): Inventar→Vault→Inventar verlustfrei identisch (`vaultDeposit`/`vaultWithdraw`, `enchant.ts:355–370`); Equip nach `equippedInstances` korrekt (inkl. Level-Gate). Persistenz: **alle drei Container gleichzeitig** überleben serialize→deserialize bit-gleich (`toEqual` auf ganzem State).
- Die fungible Bank kann Instanzen **nicht** schlucken: `depositItem` über die Basis-ID bewegt 0 (itemCount filtert `!instance`), BankPage filtert Instanz-Slots bewusst aus (`BankPage.tsx:36–42`). Sanitizer rettet Alt-Save-Kanten (Instanz in Bank-Ecke → Vault bzw. plain, `persistence:173–209, 464–479`).

### B5 — Quick-Sell vs. Bank: keine Kollision ✅
- `sellItem` (Quick-Sell-Pfad `CharacterPage.tsx:282–295`) verkauft nur aus dem Inventar; gebankte Bestände derselben ID unberührt. Plain-Stack + Instanz nebeneinander: `sellItem` verkauft NUR plain (Instanz-Slots übersprungen, `inventory.ts:186`), `sellInventoryInstance` trifft exakt den Instanz-Slot und gibt auf plain Slots 0 zurück. Empirisch: exakt 1× Verkaufspreis, Instanz intakt.

### B6 — Crafting zieht aus der Bank: JA, dokumentiert ✅
- **Verhalten (Chef-Wunsch, `tick.ts:26–43`):** `hasInputs` zählt Inventar+Bank, `consumeInput` verbraucht Inventar-zuerst, Rest aus der Bank. Empirisch: smelt_bronze mit Erzen NUR in der Bank läuft und dekrementiert die Bank; mit gemischten Beständen wird erst das Inventar geleert, der Folge-Abschluss greift auf die Bank durch.
- **Friction-3 (Design-Doku):** Die Bank ist damit bewusst KEIN Reserve-Safe — wer Materialien „aufheben" will, kann sie nicht vor dem eigenen Crafting schützen. Umgekehrte Erwartung („Bank = geschützt") würde enttäuscht; aktuelles Verhalten ist Komfort-korrekt für Idle, sollte aber irgendwann im UI-Tooltip der Bank stehen (ui-dev, P4, ein Satz in `bank.intro`).

---

## Fund-Liste (kompakt)

| # | Sev | Fund | Ort | Besitzer |
|---|---|---|---|---|
| 1 | P3 | Auto-Bank zählt 0-qty-Geister-Keys (Zählweisen-Drift zu `bankSlotsUsed`) | `inventory.ts:160`, `tick.ts:66` | logic-dev |
| 2 | P4 | Pet-Effekt-% rundet 4,5 % auf „+5%" | `PetGalleryPage.tsx:15,45` | ui-dev |
| 3 | P4 | Bank-Intro erwähnt nicht, dass Crafting aus der Bank zieht | `translations.ts` (`bank.intro`) | ui-dev |
| 4 | Info | `accuracyDownEnemy` von keinem Content-Pet genutzt | `combat.ts:1794`, Content | content-dev |
| 5 | Info | Stale dropChance-Band-Kommentar | `content/src/index.ts:13656` | content-dev |
| 6 | Friction | Combat-Loot-Verlust bei Inventar+Bank voll (still) | `combat.ts:745` | design-Entscheid |
| 7 | Friction | Nur 1 Taschen-Item bei 4 Taschen-Plätzen (keine Progression) | Content | content-dev |

**Gesamt: ship.** Pets vollständig und nachweislich verdrahtet; Bank/Bags/Vault verlustfrei und persistenzfest. Harness `_tmp_s6w2e_*` gelöscht.
