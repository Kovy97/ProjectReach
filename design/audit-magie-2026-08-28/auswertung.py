"""Auswertung der Rohdaten des Balance-Audits Magie 28.08.2026 (balance-designer).
Liest rohdaten-<tree>.tsv (aus magie.audit.test.ts) und druckt die Tabellen für den Bericht.
Lauf: python design/audit-magie-2026-08-28/auswertung.py
"""
import csv, math, os, sys
sys.stdout.reconfigure(encoding="utf-8")
from collections import defaultdict

D = os.path.dirname(os.path.abspath(__file__))
TREES = ["old-75a1806", "old-351f6f7", "old-3bb1361", "head-5236ea0"]
LABEL = {"old-75a1806": "vorher (75a1806)", "old-351f6f7": "+Zauberfokus (351f6f7)", "old-3bb1361": "+Elementleiter (3bb1361)", "head-5236ea0": "+Elementar = HEAD (5236ea0)"}
STD = {30: ["goblin_butcher", "dust_vulture", "goblin_warlock"], 60: ["skeleton_warrior", "spectral_stag", "bramble_witch"], 90: ["iron_sentinel", "gray_wolf", "skeleton_nekro"]}
BOSS = {30: ["ash_tyrant"], 60: ["goblin_warchief", "forest_warden"], 90: ["roc", "roc_elder", "idol_warden", "last_idol"]}

def load(tree):
    p = os.path.join(D, f"rohdaten-{tree}.tsv")
    if not os.path.exists(p):
        return []
    with open(p, encoding="utf8") as f:
        return list(csv.DictReader(f, delimiter="\t"))

def f(x):
    try:
        return float(x)
    except Exception:
        return float("nan")

def gmean(xs):
    xs = [x for x in xs if x > 0 and math.isfinite(x)]
    return math.exp(sum(math.log(x) for x in xs) / len(xs)) if xs else float("nan")

def rows(data, **kw):
    out = []
    for r in data:
        ok = True
        for k, v in kw.items():
            if isinstance(v, (list, tuple, set)):
                if r[k] not in v: ok = False; break
            elif r[k] != str(v): ok = False; break
        if ok: out.append(r)
    return out

def one(data, **kw):
    rs = rows(data, **kw)
    return rs[0] if rs else None

def fmt(x, d=1):
    return "—" if x is None or (isinstance(x, float) and not math.isfinite(x)) else f"{x:.{d}f}"

def pct(x):
    return "—" if x is None or not math.isfinite(x) else f"{(x-1)*100:+.0f} %"

data = {t: load(t) for t in TREES}
head = data["head-5236ea0"]

print("=" * 100)
print("A) TTK (s, unsterblich, Kit-Charakter) je Stil und Gegner — HEAD, BiS-Kit; Verhältnis = TTK Stil / TTK Nahkampf (<1 = schneller)")
print("=" * 100)
for cl in (30, 60, 90):
    print(f"\n-- CL {cl} --")
    print(f"{'Gegner':<18}{'Lv':>4} {'Def':<11}{'Nah':>8}{'Fern':>8}{'Mag':>8} | {'Fern/Nah':>9}{'Mag/Nah':>9}{'Mag/Fern':>9} | Papier-TTK Nah/Fern/Mag")
    ratios = defaultdict(list)
    for mid in STD[cl] + BOSS[cl]:
        t = {}
        pp = {}
        for s in ("melee", "ranged", "magic"):
            r = one(head, cl=cl, style=s, label="BiS", variant="full", mode="immortal", monster=mid)
            t[s] = f(r["ttk"]) if r else float("nan")
            pp[s] = f(r["paperTtk"]) if r else float("nan")
            lv = r["mlevel"] if r else "?"; de = r["mdef"] if r else "?"
        rn, rm, rmf = t["ranged"] / t["melee"], t["magic"] / t["melee"], t["magic"] / t["ranged"]
        kind = "boss" if mid in BOSS[cl] else "std"
        ratios[kind + "_rn"].append(rn); ratios[kind + "_rm"].append(rm); ratios[kind + "_rmf"].append(rmf)
        print(f"{mid:<18}{lv:>4} {de:<11}{fmt(t['melee']):>8}{fmt(t['ranged']):>8}{fmt(t['magic']):>8} | {fmt(rn,2):>9}{fmt(rm,2):>9}{fmt(rmf,2):>9} | {fmt(pp['melee'])}/{fmt(pp['ranged'])}/{fmt(pp['magic'])}")
    print(f"{'Ø Standard (geom.)':<34}{'':>24} | {fmt(gmean(ratios['std_rn']),2):>9}{fmt(gmean(ratios['std_rm']),2):>9}{fmt(gmean(ratios['std_rmf']),2):>9}")
    print(f"{'Ø Bosse (geom.)':<34}{'':>24} | {fmt(gmean(ratios['boss_rn']),2):>9}{fmt(gmean(ratios['boss_rm']),2):>9}{fmt(gmean(ratios['boss_rmf']),2):>9}")

print("\n" + "=" * 100)
print("A2) Dasselbe mit CRAFT-Waffe der Stufe (Nahkampf/Fernkampf: bester Craft; Magie: Craft-Stab) — HEAD")
print("=" * 100)
for cl in (30, 60, 90):
    print(f"\n-- CL {cl} --")
    ratios = defaultdict(list)
    for mid in STD[cl] + BOSS[cl]:
        t = {}
        for s, lab in (("melee", "craft"), ("ranged", "craft"), ("magic", "craft-staff"), ("magicW", "craft-wand")):
            st = "magic" if s == "magicW" else s
            r = one(head, cl=cl, style=st, label=lab, variant="full", mode="immortal", monster=mid)
            t[s] = f(r["ttk"]) if r else float("nan")
        kind = "boss" if mid in BOSS[cl] else "std"
        rm = t["magic"] / t["melee"]; rw = t["magicW"] / t["melee"]; rn = t["ranged"] / t["melee"]
        ratios[kind + "_rm"].append(rm); ratios[kind + "_rw"].append(rw); ratios[kind + "_rn"].append(rn)
        print(f"{mid:<18} Nah {fmt(t['melee']):>7}  Fern {fmt(t['ranged']):>7}  Stab {fmt(t['magic']):>7}  Zauberstab {fmt(t['magicW']):>7} | Fern/Nah {fmt(rn,2)}  Stab/Nah {fmt(rm,2)}  Zst/Nah {fmt(rw,2)}")
    print(f"  Ø Standard: Fern/Nah {fmt(gmean(ratios['std_rn']),2)}  Stab/Nah {fmt(gmean(ratios['std_rm']),2)}  Zauberstab/Nah {fmt(gmean(ratios['std_rw']),2)}   |   Ø Bosse: Fern/Nah {fmt(gmean(ratios['boss_rn']),2)}  Stab/Nah {fmt(gmean(ratios['boss_rm']),2)}  Zauberstab/Nah {fmt(gmean(ratios['boss_rw']),2)}")

print("\n" + "=" * 100)
print("B) Verlauf über die Commits (BiS-Kit, unsterblich): TTK Magie je Gegner, Nahkampf/Fernkampf zur Kontrolle")
print("=" * 100)
for cl in (30, 60, 90):
    print(f"\n-- CL {cl} --")
    hdr = f"{'Gegner':<18}" + "".join(f"{LABEL[t][:22]:>24}" for t in TREES)
    print(hdr)
    for s in ("magic", "melee", "ranged"):
        for mid in STD[cl] + BOSS[cl]:
            cells = []
            for t in TREES:
                r = one(data[t], cl=cl, style=s, label="BiS", variant="full", mode="immortal", monster=mid)
                cells.append(f"{fmt(f(r['ttk'])):>10} {r['mainhand'][:13]:<13}" if r else f"{'—':>24}")
            print(f"{s[:3]+' '+mid:<18}" + "".join(cells))
    # geometrische Mittel der Verhältnisse Magie/Nahkampf je Baum
    line = f"{'Mag/Nah Ø std|boss':<18}"
    for t in TREES:
        rs_s, rs_b = [], []
        for mid in STD[cl] + BOSS[cl]:
            rm = one(data[t], cl=cl, style="magic", label="BiS", variant="full", mode="immortal", monster=mid)
            rn = one(data[t], cl=cl, style="melee", label="BiS", variant="full", mode="immortal", monster=mid)
            if rm and rn:
                (rs_b if mid in BOSS[cl] else rs_s).append(f(rm["ttk"]) / f(rn["ttk"]))
        line += f"{fmt(gmean(rs_s),2)+' | '+fmt(gmean(rs_b),2):>24}"
    print(line)

print("\n" + "=" * 100)
print("C) Attribution (HEAD, Magie BiS-Kit, unsterblich): TTK je Variante; Δ = TTK(Variante)/TTK(voll) − 1 (positiv = ohne die Quelle langsamer ⇒ Beitrag der Quelle)")
print("   Varianten: noFocus = spellFocus 0 · oldSpan = Grundspannen vor Elementleiter · noStatus = Haupthand ohne Waffeneffekte · oldItem = alte Spanne + alter Brand (mit HEAD-Engine/Glut)")
print("=" * 100)
for cl in (30, 60, 90):
    print(f"\n-- CL {cl} --")
    print(f"{'Gegner':<18}{'voll':>8}{'noFocus':>9}{'Δ':>8}{'oldSpan':>9}{'Δ':>8}{'noStatus':>9}{'Δ':>8}{'oldItem':>9}{'Δ':>8}")
    for lab in ("BiS", "craft-staff"):
        for mid in STD[cl] + BOSS[cl]:
            base = one(head, cl=cl, style="magic", label=lab, variant="full", mode="immortal", monster=mid)
            if not base: continue
            b = f(base["ttk"])
            cells = ""
            for v in ("noFocus", "oldSpan", "noStatus", "oldItem"):
                r = one(head, cl=cl, style="magic", label=lab, variant=v, mode="immortal", monster=mid)
                if r:
                    x = f(r["ttk"]); cells += f"{fmt(x):>9}{pct(x/b):>8}"
                else:
                    cells += f"{'—':>9}{'':>8}"
            print(f"{lab[:5]+' '+mid:<18}{fmt(b):>8}{cells}")

print("\n" + "=" * 100)
print("D) Elementar-Effekte im vollen Lauf (HEAD, unsterblich): Schadensanteile in % des Gesamtschadens (Treffer+Überspringen+DoT+Pet)")
print("=" * 100)
print(f"{'CL':>3} {'Kit':<13}{'Waffe':<22}{'Gegner':<17}{'Glut':>6}{'Arc':>6}{'GiftSt':>7}{'Reson':>6}{'DoT':>6}{'Brand%t':>8}{'Schock s/h':>11}{'Frost#':>7}{'Void%t':>7}")
for cl in (30, 60, 90):
    for r in rows(head, cl=cl, style="magic", variant="full", mode="immortal"):
        tot = f(r["mainDmg"]) + f(r["arcDmg"]) + f(r["dot"]) + f(r["petDmg"])
        if tot <= 0: continue
        glut = (f(r["glutHit"]) + f(r["glutDot"])) / tot * 100
        arc = f(r["arcDmg"]) / tot * 100
        ps = f(r["poisonStackBonus"]) / tot * 100
        mo = f(r["momentumBonus"]) / tot * 100
        dot = f(r["dot"]) / tot * 100
        shock_h = f(r["shockDelayS"]) / f(r["hours"])
        if glut + arc + ps + mo + dot < 0.05 and f(r["enemyFrozen"]) == 0 and shock_h == 0: continue
        print(f"{cl:>3} {r['label'][:12]:<13}{r['mainhand'][:21]:<22}{r['monster'][:16]:<17}{glut:>6.1f}{arc:>6.1f}{ps:>7.1f}{mo:>6.1f}{dot:>6.1f}{f(r['burnUptime'])*100:>8.0f}{shock_h:>11.0f}{r['enemyFrozen']:>7}{f(r['voidUptime'])*100:>7.0f}")

print("\n" + "=" * 100)
print("E) Alternative Magiewaffen der Phase (HEAD, unsterblich): TTK und Verhältnis zur Nahkampf-BiS (Ø geometrisch über Standardgegner | Bosse)")
print("=" * 100)
for cl in (30, 60, 90):
    print(f"\n-- CL {cl} --")
    labs = sorted({(r["label"], r["mainhand"]) for r in rows(head, cl=cl, style="magic", variant="full", mode="immortal")})
    for lab, mh in labs:
        rs_s, rs_b, tt = [], [], []
        for mid in STD[cl] + BOSS[cl]:
            rm = one(head, cl=cl, style="magic", label=lab, variant="full", mode="immortal", monster=mid)
            rn = one(head, cl=cl, style="melee", label="BiS", variant="full", mode="immortal", monster=mid)
            if rm and rn:
                (rs_b if mid in BOSS[cl] else rs_s).append(f(rm["ttk"]) / f(rn["ttk"]))
                tt.append(f"{mid[:8]}={fmt(f(rm['ttk']))}")
        kit = rm["kit"] if rm else ""
        eff = kit[kit.find("eff[") + 4:kit.find("]")] if "eff[" in kit else ""
        print(f"{lab[:24]:<25}{mh[:22]:<23} Mag/Nah std {fmt(gmean(rs_s),2):>5} | boss {fmt(gmean(rs_b),2):>5}   eff[{eff[:60]}]")

print("\n" + "=" * 100)
print("F) Nachhaltigkeit (HEAD, sterblich, BiS-Kit): Tode/h · Ø HP % · Ø Ward % · Schaden erlitten/h · Ward-Absorb/h · Ward-Zuwachs/h · Lebensraub/h · Food/h — ohne Food | mit Phasen-Food")
print("=" * 100)
for cl in (30, 60, 90):
    print(f"\n-- CL {cl} --")
    print(f"{'Gegner':<17}{'Stil':<7}{'Tode/h':>8}{'ØHP':>6}{'ØWard':>7}{'erl/h':>8}{'WardAbs/h':>10}{'WardZu/h':>9}{'LS/h':>7}{'Kills/h':>8} || {'Tode/h':>7}{'ØHP':>6}{'Food/h':>7}{'Kills/h':>8}  Papier Boss→Spieler s")
    for mid in STD[cl] + BOSS[cl]:
        for s in ("melee", "ranged", "magic"):
            a = one(head, cl=cl, style=s, label="BiS", variant="full", mode="mortal-nofood", monster=mid)
            b = one(head, cl=cl, style=s, label="BiS", variant="full", mode="mortal-food", monster=mid)
            if not a or not b: continue
            print(f"{mid:<17}{s[:6]:<7}{f(a['deathsPerH']):>8.1f}{f(a['avgHp'])*100:>6.0f}{f(a['avgWard'])*100:>7.0f}{f(a['dmgTakenPerH']):>8.0f}{f(a['wardAbsPerH']):>10.0f}{f(a['wardGainPerH']):>9.0f}{f(a['lifestealPerH']):>7.0f}{f(a['kills'])/f(a['hours']):>8.1f} || {f(b['deathsPerH']):>7.1f}{f(b['avgHp'])*100:>6.0f}{f(b['foodPerH']):>7.0f}{f(b['kills'])/f(b['hours']):>8.1f}  {a['paperEnemyTtk']}")

print("\n" + "=" * 100)
print("G) Kits (HEAD) — Beschreibung der BiS-/Craft-Kits je Stil und Stufe")
print("=" * 100)
seen = set()
for r in head:
    k = (r["cl"], r["style"], r["label"], r["variant"])
    if k in seen or r["variant"] != "full" or r["label"].startswith("alt:"): continue
    seen.add(k)
    print(f"CL{r['cl']} {r['style']:<7}{r['label']:<12}{r['kit']}")
