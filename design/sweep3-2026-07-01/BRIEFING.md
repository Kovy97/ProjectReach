# Sweep 3 — Briefing (20 ziel-gerichtete simulierte Spieler), 2026-07-01

**Projekt:** „Grim Reach" (G:\GameDev), Dark-Fantasy-Idle-RPG, Steam-EA-Vorbereitung (Release 10.08).
**Auftrag (Chef):** 20 gleichzeitige simulierte Spieler, die das Spiel **wirklich spielen** — jeder mit einem
**konkreten Ziel** und der **Pflicht zu gutem, strukturiertem Feedback**. Schwerpunkt: **wirkt der neue
Balance-Pass (Stil-Parität) in der Praxis?** Plus: findet Neues.

## SO SPIELEN — WIRKLICH, nicht raten
- `packages/engine/src/sim-player.ts` — `SimPlayer` (echter headless Engine-Treiber). Schreib ein kleines
  Vitest-Skript in `packages/engine/src/<slug>.test.ts`, das über SimPlayer dein Ziel verfolgt (Aktionen
  starten, ausrüsten, kämpfen, kaufen, `advanceTime`), miss echte Ergebnisse (Kills/h, DPS, XP/h, Gold/h,
  Tode via `state.stats.deaths`), lauf es via `pnpm --filter @hearthforge/engine exec vitest run src/<slug>.test.ts`,
  **lösch es danach wieder**. (`fightFor().deaths` ist gefixt = echtes Todes-Delta.)
- Für UX/Content-Ziele: Renderer/Content lesen + `ui-audit-plan.md`.

## GERADE GEBALANCED — im SPIEL VERIFIZIEREN (nicht als neuen Bug melden, sondern bestätigen ob es wirkt)
- **Stil-Parität:** ranged/magic-Waffenschaden früh/mittig angehoben (steel_longbow 12→25, steel_staff 14→25 …)
  → Ranged/Magie sollen jetzt ~gleiche DPS wie Melee haben (vorher Melee +40–60% im Midgame). **Miss es!**
- **2H viabel:** Zweihänder (spear/greataxe/greatsword/maul) haben Schadens-Aufschlag → sollen echte
  Alternative zu „1H+Schild" sein.
- **Pfeile brauchen Ranged-Level** = ihr Bogen-Äquivalent (iron_arrow=ranged10 … godiron=ranged99); Ammo-Equip
  prüft das jetzt.
- **voidweave-Set > godspark** (Inversion raus). **Metall-Set-Tempo** steel→godiron. **Tower-Etagen 2–5**
  zurückgetiert (tower_skeleton_warrior L36 usw.). **Default-attack-Stance trainiert 55/45 attack/power**
  → kein boar-L10-Wall mehr. Köcher im UI befüllbar. witherling-Farming-Pet dropbar.

## BEKANNT & AKZEPTIERT — NICHT melden
0 echte Walls (geared clear alles); die „Bronze-Baseline"-Anomalien (undergeared Worst-Case gegen tanky
Mid-Mobs, inkl. der 2 zurückgetierten Tower-Skelette — deren Feintuning ist im Blick); endgame gold/XP-
Inflation; Onboarding-Schrittzahl.

## Regeln
- NUR analysieren/spielen + berichten, **KEIN** Spiel-Code ändern (Test-Skript anlegen+löschen ok).
- Strukturierte Findings: `[Severity P0-P3][Kategorie bug|balance|ux|feel] Titel` + Repro + erwartet vs.
  tatsächlich + Evidence (Zahlen/State-Dump/Datei:Zeile). Schwerste zuerst. „confirmed" vs „suspected".
- Balance ist jetzt Chef-freigegeben — konkrete Zahlen-Empfehlungen sind ERWÜNSCHT (Titel + Soll-Wert).
- Bericht nach `design/sweep3-2026-07-01/<deine Nummer+slug>.md`. Am Ende: Ziel erreicht? + Findings je Severity + Top-3.
