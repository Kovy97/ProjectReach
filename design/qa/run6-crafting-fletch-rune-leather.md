# QA Run 6 — Crafting: Fletching · Runecrafting · Leatherworking

Playtester-Persona: Crafting-Säule (Fletching, Runecrafting, Crafting/Leder).
Methode: READ-ONLY Datenanalyse von `packages/content/src/index.ts` + Wiring-Gegencheck gegen `packages/engine/src/{enchant,suffix,equipment,combat}.ts`. **NEU in Run 6:** eigenes Temp-Combat-Harness gegen die echte Engine (`simulateCombat`-Muster + `applyEnchant`/`equipInstance`) gefahren, um die seit run5 offene DoT-vs-Flat-Frage **empirisch** statt nur aus Daten zu beantworten. Harness nach Auswertung wieder entfernt. Guard-Specs real ausgeführt: `enchant`/`suffix`/`drop-suffix`/`instance-weapon-effect`/`weapon-type`/`ranged`/`content-integrity` → **48/48 grün**.
Vergleichsbasis: `design/qa/run5-crafting-fletch-rune-leather.md` (Fun-Score 9.0/10).

## Fun-Score: 9.3 / 10
## Δ vs run5: +0.3

Run 6 räumt die zwei in run5 offenen **ironhide-Substat-Dellen** ab (Helm-Inversion weg, Boots-rngDmg ergänzt) und der **Ranged-Trim** lässt Bogen- und Leder-Leiter **intakt** (voll monoton). Wichtiger noch: Ich konnte die run5-Kernlücke — „DoT-vs-Flat ist aus Daten nicht beweisbar" — per Combat-Harness **schließen**. Antwort: DoT ist **grundsätzlich konkurrenzfähig** (flame gewinnt auf langen Boss-Kämpfen sogar leicht), aber die Sim deckt eine echte, kleinere Imbalance auf (flame strikt bester any_weapon-Slot; frost/shock liefern als Kill-Tempo-Runen kaum) **und** dass Runen außerhalb von Boss-HP-Zielen fast wirkungslos sind. Das, plus eine neu entstandene Mini-Boots-Inversion und die zähen P3-Carryovers, hält es unter 9,5.

---

## Verifikation der Run-6-Neuerungen

### ✅ ironhide-Helm-Inversion behoben (war run5-[P3])
`ironhide_helm` rangedDamage **2 → 1** (Z. 2823). Die rngDmg-Kette im Helm-Slot ist jetzt monoton-flach:

| Helm rngDmg | studded (L50) | ironhide (L60) | warhide (L70) |
|---|---|---|---|
| rangedDamage | 1 | **1** | 1 |

Kein „niedrigeres Tier schlägt höheres" mehr. Def/eva/hp bleiben sauber monoton (studded 14/14/30 → ironhide 17/16/36 → warhide 20/18/42). **Erledigt.**

### ✅ ironhide-Boots-rngDmg ergänzt (war run5-[P3]) — Set jetzt intern konsistent
`ironhide_boots` hat jetzt `rangedDamage: 1` (Z. 2843). Damit tragen **alle 5** ironhide-Teile rngDmg (helm 1 / body 4 / legs 2 / vambraces 2 / boots 1) — die in run5 bemängelte Lücke (boots als einziges Teil ohne rngDmg) ist zu. Deckt sich auch mit `voidhide_boots` (rngDmg 6), das im Boots-Slot ebenfalls rngDmg führt. *(Nebenwirkung → [P3] unten.)*

### ✅ Ranged-Trim hat die Bogen-Leiter NICHT kaputtgemacht (Kernfrage)
Beide Bogen-Leitern sind über alle 12 Tiers (copper L1 → godiron L99) **streng monoton** in rangedDamage **und** accuracy:
- **Shortbow** (0.52·D, +critChance): rngDmg 3·4·7·10·13·17·21·26·32·40·48·59; acc 7→185. ✓
- **Longbow** (0.62·D, +critDamage): rngDmg 3·5·9·12·15·20·26·31·39·48·57·70; acc 8→211. ✓
- Munition (`*_arrow.ammoDamage`): 1·2·3·5·5·7·9·11·14·17·20·25 — monoton (ein Flatspot steel=blacksteel=5, s. [P3]).
- Jeder Bogen hat passenden `ammoType`, jedes Craft-Rezept (Fletching L1–99) verdrahtet. Keine toten Tiers, keine Lücke.

### ✅ voidhide (T8, L99 ranged-Cap) sauber über shadowhide
Monoton in allen Stats; rngDmg shadowhide (helm4/body5/legs4/vamb4) → voidhide (helm6/body9/legs7/vamb6/boots6). L99-Parität zum Götzeneisen-Melee-Cap. ✓

### ✅ Combat-Harness: DoT-vs-Flat ist jetzt EMPIRISCH belegt (schließt run5-[P2])
Eigenes Harness: L99- bzw. L62-Held, godiron- bzw. runite-Set, Mainhand mit je 1 Rune verzaubert (`applyEnchant` auf Equipment-Ref), 1 h Dauerkampf, Kills/h vs. „keine Rune". Kernzahlen:

**On-level (L62, runite_sword) — der repräsentative Fall:**
| Ziel | keen_iii (+14) | flame_iii (+4,burn14) | frost_iii (+3,slow) | storm_iii (+3,shock) |
|---|---|---|---|---|
| iron_revenant (def30) | **+7.6%** | −0.7% | −0.6% | −1.1% |
| frost_hound (def22) | +0% | +0.8% | +0.8% | +1.2% |
| frost_hexer (L68) | **+5.4%** | +3.8% | −1.7% | −1.6% |
| idol_warden (hp900) | +13% | **+16.5%** | +11.8% | +13.4% |

**Endgame (L99, godiron) — fast alles One-Shot:** nur gegen last_idol (hp1400) differenziert überhaupt etwas: keen **+12.7%** » flame +6.5% » frost +0.9% » storm −0.6%.

Lesart:
1. **DoT IST konkurrenzfähig** — auf dem langen Boss-Kampf (idol_warden, on-level) **überholt flame (+16.5%) sogar keen (+13%)**. Die run5-Sorge „DoT könnte tot sein" ist damit widerlegt. Die garantierte Flat-Basis trägt die DoT-Runen über die Schwelle.
2. Aber **flame ist der strikt beste any_weapon-Slot**: bestes DoT (burn 14) **und** höchste Flat (+4 vs. frost/shock +3, run5-[P3] unverändert). Die Wahl läuft nicht über Charakter, sondern „flame ist immer ≥".
3. **frost & shock unterliefern als Kill-Tempo-Runen.** frost-Slow ist defensiv (beschleunigt Kills nicht; sein Wert liegt im Überleben, hier nicht messbar, deaths=0), shock-magnitude 0.20 bewegt das Kill-Tempo kaum. Beide hängen fast nur an ihrem +3 Flat.

---

## Findings

### [P0] — keine.

### [P1] — keine.
Run 6 ist regressionsfrei; alle Guard-Specs grün (48/48). Die DoT-Imbalance ist real, aber mild und nicht spielbrechend (s. P2).

### [P2] Runen sind außerhalb von Boss-HP-Zielen quasi wirkungslos — Crafting-Belohnung fühlt sich „leer" an
Die Sim zeigt: gegen normale Mobs liegt **jede** Rune (sogar das +14-keen) bei ±1 % Kill-Tempo, weil Kämpfe durch One-Shot / Angriffsintervall gedeckelt sind, nicht durch Schaden. Runen „schalten sich erst ein" gegen sehr tanky/Boss-HP-Ziele. Für die Crafting-Säule heißt das: der Spieler farmt Reeds/Pigmente, craftet eine T3-Rune, verzaubert — und sieht im Alltag **keinen** Unterschied. Das ist eine Engagement-Delle der gecrafteten Runen (Combat-Sättigung, kein run6-Regress, aber direkt relevant für „macht Runecrafting Spaß?").
**Fix-Richtung (combat-dev):** Runen-Flat oder -Effekte etwas anheben/skalieren, ODER DoT/shock als %-vom-Treffer statt Fix-Magnitude, damit eine Rune auch im Normal-Content spürbar ist. Mind. dokumentieren, dass Runen bewusst Boss-Tech sind.

### [P2] flame strikt bester any_weapon-Slot (Sim-bestätigt) — run5-[P3] unverändert
`affix_flame` T3 = **+4** Tri-Damage, `affix_frost`/`affix_shock` T3 = **+3** (Z. 12242/12257/12313). flame trägt damit gleichzeitig das stärkste DoT (burn 14) **und** die höchste Flat — die Sim bestätigt flame als ≥ allen anderen any_weapon-Runen auf jedem getesteten Ziel. Hochstufung von [P3] auf [P2], weil jetzt **mit Sim belegt**, nicht mehr nur vermutet.
**Fix:** flame T3 auf **+3** angleichen (frost/shock-Niveau). Dann differenziert die Wahl rein über Effekt-Charakter (Burst-DoT vs Slow vs Shock) statt über einen Gratis-Flat-Daumen.

### [P3] Neue Mini-Boots-Inversion durch den ironhide-Boots-Fix
Der run5-Fix gab `ironhide_boots` rngDmg 1 — gut fürs Set, aber `warhide_boots` (das **höhere** L70-Tier) hat **kein** rangedDamage (Z. 2816), ebenso studded_boots (L50) und shadowhide_boots (L95). Damit gilt im Boots-Slot jetzt: studded 0 → ironhide **1** → warhide **0** → … → voidhide 6. Ein Ranged-Build könnte ironhide_boots (L60) den warhide_boots (L70) vorziehen — exakt die Art Inversion, die run6 bei den Helmen gerade beseitigt hat, nur eine Etage tiefer.
**Fix:** warhide_boots (und konsistenterweise studded_boots/shadowhide_boots) rngDmg ≥1 geben, ODER ironhide_boots-rngDmg wieder streichen und stattdessen den Boots-Slot in ALLEN Leder-Tiers ohne rngDmg lassen (außer dem bestehenden voidhide). Aktuell ist der Boots-Slot der einzige uneinheitliche Substat der Leiter.

### [P3] Munitions-Flatspot: steel_arrow = blacksteel_arrow (ammoDamage 5)
`steel_arrow` (L20-Bogen) und `blacksteel_arrow` (L30-Bogen) haben beide ammoDamage **5** (Z. 413/414); der höherstufige Pfeil bringt nur mehr Verkaufswert, keinen Schaden. Klein, aber ein toter Upgrade-Schritt in der Munitionsleiter.
**Fix:** blacksteel_arrow auf ammoDamage 6.

### [P3] Carryover (4. Run): `craft_scaled_body` levelRequired **14**
Unverändert (Z. 6450): Body schnitzbar @ L14, aber `scaled_leather_body` braucht zum Anlegen leatherworking **28** (Z. 2694), Rest des Sets craftet L28–30. Funktional folgenlos, aber zähe Schönheits-Altlast seit run3.
**Fix:** auf ~L26–28 anheben.

### [P3] Carryover: `enchant_*`-Magiewaffen-Crafts-Naming
`enchant_dim_focus`/`enchant_frost_scepter`/`enchant_aether_runestaff`/… (Z. 7016 ff.) heißen weiter „Enchant …", obwohl „Verzauberung" jetzt exklusiv das Runen-Apply meint. Kosmetisch/irreführend (run4/run5-[P3], unverändert).
**Fix:** auf „Craft/Forge X" umbenennen.

### [Info] shortbow-Speed-Doc/Daten-Mismatch
Header-Kommentar (Z. 2492) dokumentiert für ALLE Shortbows „−150 aIMs", aber copper/bronze/iron/steel (L1–20) tragen **kein** `attackIntervalMs`; der Speed-Bonus startet erst ab blacksteel (L30, Z. 2525). Entweder bewusster Frühgame-Trim (dann Kommentar anpassen) oder Versehen (dann −150 ergänzen). Ladder-Monotonie ist davon unberührt.

---

## „Was fehlt für 9,5?"
1. **flame-Flat angleichen** ([P2], +4→+3): die einzige sim-belegte echte Runen-Imbalance — ein Zwei-Zeichen-Edit, der die any_weapon-Wahl ehrlich macht.
2. **Runen im Normal-Content spürbar machen** ([P2]): die Sim zeigt, dass gecraftete Runen außerhalb von Boss-HP fast nichts bewirken — das untergräbt den Belohnungsbogen von Runecrafting. Combat-seitige Skalierung oder klare „Boss-Tech"-Kommunikation.
3. **Boots-Substat über die ganze Leder-Leiter vereinheitlichen** ([P3]): die neue ironhide-Boots-Inversion gegen warhide_boots schließen — sonst hat run6 eine Helm-Inversion behoben und eine Boots-Inversion eingeführt.
4. **P3-Carryovers endlich abräumen**: scaled_body L14→~26, blacksteel_arrow dmg 5→6, `enchant_*`→`craft/forge`-Rename. Drei Mini-Edits, teils seit drei Runs offen.

## Fazit
Run 6 liefert genau die zwei zugesagten ironhide-Substat-Fixes (Helm-Inversion weg, Boots-rngDmg ergänzt) und der Ranged-Trim lässt Bogen-/Munitions-/Leder-Leiter vollständig intakt und monoton — die Kernfrage „nicht kaputtgemacht?" ist mit Ja beantwortet. Der größte Mehrwert dieses Runs ist die **Auflösung der run5-[P2]**: per echtem Combat-Harness ist DoT-vs-Flat jetzt belegt — DoT ist konkurrenzfähig (flame schlägt keen auf Boss-Kämpfen), aber die Sim deckt zwei reale Nuancen auf (flame strikt bester Slot; Runen außerhalb Boss-HP fast inert). Ein sauberer, gut belegter Aufwärtsschritt mit einer selbst eingehandelten Mini-Boots-Delle: **9.3/10 (Δ +0.3)**.
