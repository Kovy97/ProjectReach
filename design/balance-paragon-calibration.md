# Paragonturm-Kalibrierung (Welle BB, 2026-07-16)

**Auftrag:** BLOCKER-Fix aus dem Fun-Sweep (design/fun-review/paragon-aldric.md Befund 1, deckt sich mit Thanes Band-4-Daten): `paragonScaledMonster` skalierte nur HP/Schaden/Genauigkeit über die Etagen — die SEKUNDÄRWERTE der L175–242-Pool-Monster (Rüstung 90–170, Regen 0,4–0,6, Enrage ×1,7–1,8, Inflicts, Ausweichen 86, Ward-Quote 23 %) wurden ROH geerbt. Folge: Die Turm-Wand stand auf Etage 3–4, Chronik-Kapitel 21 („Erreiche Etage 5") war mit realistischem Kapitel-20-Gear unabschließbar — Verletzung des Machbarkeits-Korridors („Kap. 21 = sanfter Onramp").

**Root-Cause bestätigt** (Engine-Sims, echtes `advance`→`combatStep`): Unter der alten Formel lag die E10-Clear-Chance des kanonischen Kapitel-20-Loadouts bei 3–30 % je Stil und die Etage-1-TTK bei 43–79 s — der Turm begann oberhalb der Story-Endgame-Decke statt darunter.

## Der Fix (engine/paragon.ts — reine Formel, KEIN Content-/Save-/Renderer-Edit, kein SAVE-Bump)

### 1) Sekundärwert-Rampe

```
k(f) = 0,3 + 0,7 · (f−1)/19   für f < 20;   k(f) = 1 für f ≥ 20
```

| Feld | Skalierung |
|---|---|
| defense | `round(base · k)` |
| evasion | `round(base · k)` |
| regen | `base · k` |
| Ward-Quote (Anteil des HP-Budgets) | `baseShare · k` (Budget-Summe hp+ward bleibt exakt auf der Kurve) |
| enrage.damageMult | `1 + (base − 1) · k` (Richtung ×1,0; `belowHpPct` bleibt Identität) |
| inflict.chance / .magnitude | `base · k` (type/durationMs bleiben Identität) |

HP/Schaden/Genauigkeit behalten die §7-Formel. Ab Etage 20 ist k exakt 1 ⇒ **E20+ ist bit-identisch zur bisherigen Härte** (BiS-/Suffix-Territorium unangetastet).

Stützwerte k: E1 0,30 · E3 0,37 · E5 0,45 · E10 0,63 · E15 0,82 · E20+ 1,00.

### 2) HP-Budget-Onramp (Nachjustierung, von der Auftrags-Leitplanke gedeckt)

Die Sekundärwert-Rampe allein ließ Ranged/Magie auf Etage 1 bei ~44–50 s TTK (Ziel ≤ ~30 s). Deshalb blendet das HP-Budget der ersten vier Etagen kurz ein:

```
r(f) = 0,65 + 0,35 · (f−1)/4   für f < 5;   r(f) = 1 für f ≥ 5
hpBudget(f) = 900 · 1,12^(f−1) · (Boss ×2) · r(f)
```

Stützwerte: E1 585 · E2 743 · E3 931 · E4 1153 · **E5 (Kapitel-21-Boss) exakt §7-Kurve (2832)**. Schaden/Genauigkeit/Ertrag unverändert; alle Monotonie-Guards (Schwierigkeit strikt steigend, Ertrag/Schwierigkeit strikt fallend) halten weiter.

Beide Konstanten leben bewusst in `engine/paragon.ts` (Turm-Formel-Interna, kein shared-/Content-Belang): `PARAGON_SECONDARY_RAMP_BASE = 0.3`, `PARAGON_SECONDARY_RAMP_FULL_FLOOR = 20`, `PARAGON_HP_ONRAMP_BASE = 0.65`, `PARAGON_HP_ONRAMP_FULL_FLOOR = 5`.

## Mess-Setup

Deterministische Engine-Sims (echter `advance`→`combatStep`-Pfad inkl. Auto-Eat T3, Auto-Trank @40 %, Tonika-Auto-Rebuff, Heilpause zwischen Etagen), je Zelle eigene Seeds. **Loadout = exakt das Kapitel-20-Referenz-Loadout („craft") aus design/balance-drazhan-audit.md §3:** volles Godiron-Panzer-Set + Kiteschild + Godgem-Schmuck, Tier-III-Runen (keen/hunter/arcane auf der Stil-Waffe, aegis auf jedem Panzerteil), Skills 99, soulfire_banquet + godbloom_infusion + apex/stoneskin/gravensap-Tonika. KEINE Suffixe, kein Pet, keine Chase-Items (garantierter Floor). Stile über den Audit-Rüstungs-Wechsel: godiron_mace / godiron_shortbow (1H) / godiron_wand + Schild.

## Korridor-Messwerte (Vorher → Nachher)

### E1→E5-Aufstieg am Stück (N = 150 je Stil nachher; N = 50 vorher)

| Stil | Erfolg E1→E5 vorher | **nachher** | E1-TTK med vorher | **nachher** | Ziel |
|---|---|---|---|---|---|
| Melee | 98 % | **100 %** | 43,5 s | **22,0 s** | ≥ 70 % je Stil, ≥ 80 % pooled; TTK ≤ ~30 s |
| Ranged | 94 % | **100 %** | 65,0 s | **31,0 s** | ✅ |
| Magie | 88 % | **100 %** | 78,5 s | **33,5 s** | ✅ |

TTK-Verlauf nachher (Median je Etage, E1→E5): Melee 22 / 26,5 / 38,5 / 65 / 113 s · Ranged 31 / 38,5 / 52 / 84 / 158,5 s · Magie 33,5 / 43,5 / 60 / 109,5 / 192 s — klare Steigung statt „überall derselbe Brei"; die Boss-Etage 5 ist ein spürbares 2–3-Minuten-Finale. Tod-Risiko auf Etage 1: 0 % (alle Stile, N = 150).

Hinweis Einordnung „vorher": Das Tonika+Auto-Trank-Voll-Setup des Referenz-Loadouts überlebte E1→E5 auch alt knapp — der Fun-Review-Char (endgame-Fixture, Chase-Stoff-Teile, ohne dieses Sustain-Setup) starb reproduzierbar auf E3. Die alte Formel verlangte also das perfekte Sustain-Rezept schon für den Epilog; real bindend war die alte Wand ab E10 (s. u.) plus die 43–79-s-TTK auf Etage 1.

### Tiefen-Sonden (je Etage frisch angesetzt; nachher N = 50, vorher N = 30)

| Etage | Melee vorher → **nachher** | Ranged vorher → **nachher** | Magie vorher → **nachher** |
|---|---|---|---|
| E10 (Boss) | 30 % → **80 % Clear** (Tod 20 %) | 3 % → **70 %** (Tod 30 %) | 7 % → **40 %** (Tod 60 %) |
| E15 (Boss) | 0 % → **0 %** (Tod 100 %) | 0 % → **0 %** | 0 % → **0 %** |
| E20 (Boss) | 0 % → **0 %** | 0 % → **0 %** | 0 % → **0 %** |
| E25 (Boss) | 0 % → **0 %** | 0 % → **0 %** | 0 % → **0 %** |

⇒ E10–15 „spürbar fordernd" ✅ (E10 mit sichtbarem Tod-Risiko 20–60 %, E15 = Wand fürs suffix-lose Floor-Loadout — Enchant-/Suffix-Endgame wird ab ~E12–15 zur Pflicht, exakt Aldrics Zielband „E15–25").

### BiS-Decke (Stichprobe, `buildBisCharacter` + Top-Food/Trank)

| Build | E20 | E25 | E30 |
|---|---|---|---|
| BiS-Tank (melee, alle Suffixe/Runen/Pet) | 100 % Clear (Marathon-TTK) | Bruch (Patt/TTK-Guard) | Bruch |
| BiS-DPS (Glass) | 0 % (Tod) | 0 % | 0 % |

⇒ **Keine Trivialisierung:** ab E20 gelten Rampe & Onramp exakt ×1 (Formel-Guard in paragon.test.ts) — die Region ist bit-identisch zum Zustand vor dem Fix; die BiS-Envelope („bricht an endlicher Etage") aus paragon.test.ts hält unverändert.

## Guards / Tests

- `packages/engine/src/paragon.test.ts`: Formel-Spiegel inkl. r(f); neue Rampen-Unit-Tests (Grenzwerte k(1)/k(20), Monotonie, Blend defense/evasion/regen/enrage/inflict/Ward-Quote an void_titan/aether_wraith, „Feld fehlt bleibt Feld fehlt", E21 = Roh-Erbe).
- `packages/engine/src/paragon-corridor.test.ts` (NEU): Korridor als deterministische Sim-Assertions — E1 Tod-frei + Median-TTK ≤ 36 s; E1→E5 ≥ 70 % je Stil / ≥ 80 % pooled (N = 25 je Stil, feste Seeds); E10 Tod-Risiko sichtbar, E20 = Wand fürs Referenz-Loadout.
- Der „Etage-5"-Pin in zone-gating.test.ts (reach_paragon_floor) ist reine Quest-Logik (liest `paragon.best`) — kein Alt-Verhaltens-Pin, unverändert.

## Offen / Nicht Teil dieser Welle

- UI-Punkte des Fun-Reviews (Preview-Karte abgeschnitten, Ward-Anteil verschwiegen, „Weiter: Etage N+1"-CTA, DeathPopup-Text) → ui-dev.
- Paragon-Achievements/Meta-Progression (Aldric Top-3 #3) → CEO-Priorisierung.
- Keine DATA-Änderungen nötig (Pool-Monster bleiben unangetastet); kein Bedarf an Logic-Dev (shared unberührt).
