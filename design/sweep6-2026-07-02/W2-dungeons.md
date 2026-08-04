# W2 — Dungeon-System komplett — Sweep 6 Welle 2, 2026-07-03

Tester: Kontrolleur (W2-Dungeons). Methode: Code-Audit (`packages/engine/src/dungeon.ts`,
`combat.ts:798–905`, `packages/content/src/index.ts:11976–12074`) + Wegwerf-Harness
`_tmp_s6w2c_dungeons.test.ts` (6 Proben: Statik, instrumentierter Crypt-Run, Tod-in-Welle-3,
Cooldown-Spotcheck, 8×2h Key-Farm-Messungen, Seed-44-Lauf; alle grün gelaufen, danach gelöscht).
Bestehende Guard-Tests (`dungeon.test.ts` 7, `kill-cooldown.test.ts` 7, `idol-sanctum-clear.test.ts` 3)
mitgeprüft: **17/17 grün**. Kein Fix vorgenommen.

**Gesamtbild: Das Dungeon-System ist sauber verdrahtet und on-level fair.** Kein P1, kein P2.
Wellen-Reihenfolge, Key-Verbrauch, Cooldown-Semantik und Abschluss-Belohnung verhalten sich exakt
wie im Code dokumentiert. 2× P3 (Content-/Balance-Schiefstand), 3× P4 (UX-Doku/Beobachtung).

Hinweis zum Auftrag: Es gibt **6** Dungeons, nicht 4 — zusätzlich zu goblin_warband (CL20),
crypt_depths (CL70), wildwood_hunt (CL90), idol_sanctum (CL99) existieren highland_aerie (CL92)
und wyvern_lair (CL96, einziger mit `keysPerRun: 2`). Die beiden Extra wurden statisch mitgeprüft.

---

## 1) Key-Beschaffung (Drop-Quellen + gemessene ehrliche Spielzeit)

Keys droppen NUR von Monstern (kein Shop — bewusst, content:11329; keine Aktion, keine Quest).
Muster überall gleich: alle Zonen-Mobs 0.005–0.010, der Zonen-Endmob ~0.05–0.10. Messung mit
on-gate-Personas (alle Kampf-Skills = Gate-Level, bestes ehrlich craftbares Kit, Auto-Eat-Food),
2 Sim-Stunden Farm auf dem besten Dropper, inkl. 5s-Kill-Cooldown:

| Dungeon | Key | Bester Dropper | Chance | Messung (on-gate) | min/Key |
|---|---|---|---|---|---|
| goblin_warband (CL20) | warband_key | goblin_warlock L30 | 0.05 | 139 Kills/h, 17 Keys/2h, 0 Tode | **~7** |
| crypt_depths (CL70) | crypt_key | skeleton_nekro L90 | 0.07 | 74 Kills/h, 11 Keys/2h, 0 Tode | **~11** |
| wildwood_hunt (CL90) | wildwood_key | forest_bear L120 | 0.06 | 164 Kills/h, 23 Keys/2h, 0 Tode | **~5** |
| idol_sanctum (CL99) | idolhall_key | last_idol L295 | 0.10 | 168 Kills/h, 33 Keys/2h, 0 Tode | **~4** |

Reguläre Dropper (0.01er) zum Vergleich: goblin_stormcaller ~20 min/Key, dire_wolf ~30 min/Key,
scale_skarn ~40 min/Key — Keys fallen also auch beim normalen Zonen-Farmen nebenbei an.
(skeleton_pyroclasp 0.01: 1. Messung 237 Kills/0 Keys = 9%-Pech; Retry mit anderem Seed 233 Kills/1 Key
→ Verdrahtung ok, kein Bug.) Fazit: **5–11 min Spielzeit pro Run-Ticket ist ein fairer Preis**,
und der beste Key-Dropper ist jeweils zugleich die letzte Dungeon-Welle (konsistentes Design).

## 2) Wellen-Mechanik (Code = beobachtetes Verhalten)

Instrumentierter crypt_depths-Run (on-gate CL70, Bloodiron-Kit): Wellen-Reihenfolge exakt
`encounters`-Array (warrior→archer→butcher→icemage→nekro), Clear in 137s, 0 Tode.

- **Key-Verbrauch beim START** (`dungeon.ts:51`), nicht beim Clear. Tod in Welle 3 (Probe C):
  Run bricht ab (`combat.ts:938`), **kein Refund**, kein Teil-Clear, Spieler voll geheilt,
  `stopReason:"defeated"`, manueller Neustart nötig. Exakt das im Code dokumentierte
  „Einsatz/Risiko"-Verhalten.
- **Keine Heilung zwischen Wellen.** Spieler-HP läuft durch (gemessen 93→94.9→95.9→88.4);
  während des 5s-Cooldowns laufen nur Regen/Auto-Eat/Auto-Potion und **Spieler-DoTs weiter**
  (`combat.ts:1523–1538` — Gift aus Welle N tickt in Welle N+1 hinein, DoT-Tod im Cooldown möglich
  und kostet den Run). Nächste Welle steht sofort voll im State, kämpft aber erst nach Ablauf.
- **Stalemate im Dungeon = Run-Abbruch inkl. Key** (`combat.ts:1483–1486`) — relevant, weil
  z.B. skeleton_nekro (regen 0.5/s) ein DPS-Check ist. Konsistent zur Tod-Regel.
- **Abschluss ohne Cooldown** (Chef-Vorgabe), `dungeonsCleared` +1 genau am Clear (Guard-Test grün).
  Wellen-Kills vergeben zusätzlich normalen Monster-Loot/Gold/XP; der Abschluss legt Dungeon-Loot,
  Dungeon-Gold und Dungeon-XP (an vitality) obendrauf.

## 3) Loot-Tabellen & Wert-Plausibilität

Exklusivität geprüft (Quelle je Item über Monster/Aktionen/Shop/Quests/Dungeons): `warband_seal`,
`grave_warden_sigil`, `alpha_fang`, `storm_core`, `idol_heart` sind **strikt dungeon-exklusiv** und
speisen die 5 Jewelcrafting-Uniques (content:8437–8466). Übrige Loot-Zeilen (ruby/runite_bar/onyx/
godiron_bar/…) sind bewusst redundante Materialquellen — ok.

Erwartungswerte pro Clear (Completion-Loot-EV + Dungeon-Gold + Wellen-Gold ~×1.2):
goblin_warband ≈ 1.000g + 180 vit-XP (Run ~85s) · crypt ≈ 4.400g + 600 (137s, gemessen 3.549g inkl.
Wellen-Drops) · wildwood ≈ 2.570g + 950 · idol_sanctum ≈ 20.400g + 9.000 (64s). Zeitaufwand je Zyklus
= Key-Farm (Tabelle oben) + Run → alle vier sind gold-/xp-positiv, tragen aber primär über die
Exklusiv-Materialien. Passt zur Rare-Drop-Philosophie.

### P3-1 · wildwood_hunt (CL90): Belohnungslinie ist Mid-Game-tuned — Exklusivität faktisch unterlaufen
Der einzige Exklusiv-Loot `alpha_fang` (0.6, value 700) mündet in `alpha_fang_amulet`
(str+3/lck+3/power+1, value 900, **jewelcrafting 36**, content:859–863) — und GENAU dieses Amulett
vergibt bereits die Mid-Game-Quest `q_thorn_wolf_pack` (20× thorn_wolf **L54**, content:12657–12673)
direkt. Ein CL90-Dungeon, dessen Unique man ~40 Level früher questen kann, und dessen Reward-Craft
bei jc36 hängt (Vergleich: crypt CL70→jc55, aerie CL92→jc65, sanctum CL99→jc82 — wildwood fällt aus
der Leiter). Entweder wildwood-Reward hochziehen oder Quest-Reward austauschen.
**Owner: content-dev + balance-designer.**

### P3-2 · idol_sanctum stellt on-level keinerlei Fail-Risiko — und Open-World-last_idol schlägt den Dungeon
On-gate-CL99-Melee (Godiron-Kit): Sanctum-Clear in **64s, 0 Tode** (Wellen-Schaden 8–13 vs.
Godiron-Tank + risotto_starcap-Auto-Eat); Open-World-`last_idol` farmbar mit 168 Kills/h, 0 Tode →
~500k Gold/h + 58k-XP-Kills + 0.10 Keys nebenbei. Der Dungeon-Zyklus (~4min Key + 64s Run ≈
20.4k Gold) liegt UNTER dem reinen last_idol-Farmen — der Endgame-Dungeon ist ökonomisch nur über
`idol_heart`/Achievements motiviert, und der Endboss ist als normaler Zonen-Mob billiger zu melken
als sein eigener Dungeon. Kein Bug, aber Balance-Review wert (last_idol-Gold/Respawn vs. Sanctum-Reward).
**Owner: balance-designer.**

## 4) „DU:30"-Cap — Semantik geklärt: KEIN Cap

„DU: 30" auf den Dungeon-Karten war `combat.dungeonYourLevel` = das **Kampf-Niveau des Spielers**
(CSS-uppercased „du: {n}"), angezeigt nur wenn das Gate NICHT erfüllt ist (CombatPage.tsx:1435–1440).
Kein Durchläufe-Limit: `dungeonsCleared` ist ein unbegrenzter Lebenszeit-Zähler (Achievements bis 50),
einziger Run-Limiter sind Keys. Die Beschriftung ist inzwischen zu „Dein Level: {n}" / „Your level: {n}"
umformuliert (translations.ts:496/1539) — das W2-ui-review-/T9-Finding ist damit **erledigt**.

## 5) Kill-Cooldown in Wellen (T8-P3-2-Nachprüfung)

Fix ist gelandet: die Tick-Guards prüfen `cs.monsterId !== monster.id` statt nur `=== null`
(`combat.ts:1566–1574`), womit auch ein künftiger 0-Cooldown-Wellenwechsel den Rest-Tick nicht mehr
mit dem alten `monster` weiterrechnen würde. Heute weiter unerreichbar: max. `cooldownOnKill.durationMs`
im Content ist 2000 (content:2654, 5140) < KILL_COOLDOWN_MS 5000. Stichprobe Normal-Cooldown
(idol_sanctum, Probe D): an JEDEM Wellen-Übergang `cooldownRemainingMs = 5000`, nächste Welle bleibt
während des Cooldowns auf voller HP, `stats.kills`-Delta == Wellenanzahl (**kein Doppel-Reward**),
Run endet in 64s (**kein Stall**), `dungeonsCleared` genau +1. Guard `kill-cooldown.test.ts:168` grün.
Auch geprüft: `startDungeon` übernimmt einen laufenden Rest-Cooldown korrekt (dungeon.ts:74–75 +
Guard-Test) — kein Cooldown-Skip durch Kill→sofort-Dungeon.

## 6) Ehrlicher Lauf Seed 44 (goblin_warband, on-level)

Persona Seed 44: alle Kampf-Skills 20 (CL exakt 20 = Gate), ehrlich beschaffbares Kit
(Steel-Set + steel_greataxe + arcane_cape, alles craftbar ≤ L23), Food wolf_steak (heilt 7),
Start sogar mit nur 11 HP (frischer Char, ungeheilt): **Clear im 1. Versuch**, 5/5 Wellen,
0 Tode, 85s, Ende bei ~40 HP, 4 Keys übrig. Antwort: **ja, deutlich unter 5 Versuchen** —
das CL20-Gate ist für einen on-level-Spieler mit zeitgemäßem Gear + Food komfortabel, der
Schwierigkeitsanstieg über die Wellen (goblin_warlock L30 mit Burn am Ende) ist spürbar, aber fair.

---

## Kleinere Findings (P4)

### P4-1 · Key-Verlust bei Tod/Patt wird dem Spieler NIRGENDS kommuniziert
Das „Key beim Start verbraucht, Tod/Stalemate = Run + Key weg"-Verhalten steht nur in Code-Kommentaren
(`combat.ts:924–925`). Death-Popup sagt nur „du bist gestorben gegen {monster}" (translations.ts:18),
die Dungeon-Karte nur „Erfordert einen {name}" — der Spieler lernt die Einsatz-Regel erst durch
Key-Verlust. Ein Satz im Death-Popup (wenn `prev.dungeonId` gesetzt) oder auf der Dungeon-Karte reicht.
**Owner: ui-dev.**

### P4-2 · wyvern_lair teilt sich den Key mit highland_aerie (einziger 2-Key-Dungeon)
`highland_key` bedient BEIDE Highland-Dungeons (aerie ×1, lair ×2, content:12046/12062) — als einziges
geteiltes Key-Item konsistent bepreist (lair = härtere Wellen). Kein Fehler; nur dokumentiert, damit
niemand „wyvern_key fehlt" als Bug meldet.

### P4-3 · Dungeon-XP-Anker vitality + Wellen-XP: idol_sanctum-Wellen tragen 5.5k–58k Kill-XP
Abschluss-XP geht bewusst an vitality (`combat.ts:892–895`). Die Wellen-Kill-XP (monster.xp, über
`offenseXpMult` gedämpft) sind am Sanctum enorm (last_idol 58.000) — bei Skill-Cap 99 praktisch
folgenlos, aber falls je ein Prestige-/Post-99-System kommt, ist der Sanctum-Loop die dominante
XP-Quelle. Nur Notiz für balance-designer.

## Empfehlung
Kein Blocker. P3-1 (wildwood-Reward-Linie) und P3-2 (Sanctum vs. Open-World-last_idol) als
Balance-Tickets einplanen; P4-1 ist ein Einzeiler für ui-dev. Dungeon-Kern: **ship**.
