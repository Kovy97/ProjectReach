# Grim Reach Store-Panels 1.4.0 (Painterly) - erzeugt panels.html.
# claude:2026-10-25T10:19:00+01:00 - Chef-Auftrag 25.10.: panel_01..07 im gemalten Stil, Zahlen Stand 1.4.0.
# Freigestellte Figuren werden ueber ihre Alpha-Bounding-Box platziert (Hoehe + Fusspunkt), damit die Motive
# gross und exakt sitzen. Aufruf: python -I build_panels.py  ->  panels.html (danach render_panels.mjs).
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
A = "G:/GameDev/apps/client/src/renderer/assets/"
F = "G:/GameDev/apps/client/src/renderer/fonts/"
U = lambda rel: f'url("file:///{A}{rel}")'
SRC = lambda rel: f"file:///{A}{rel}"
USED = []  # alle verwendeten Bilder (fuer die QA-Liste)


def bbox(rel):
    im = Image.open(A + rel).convert("RGBA")
    return im.size, im.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()


def cut(rel, h, cx, by, z=3, extra=""):
    """Freisteller: sichtbare Figur h px hoch, Fusspunkt-Mitte bei (cx, by)."""
    USED.append(rel)
    (w0, h0), (l, t, r, b) = bbox(rel)
    s = h / (b - t)
    left = cx - s * (l + r) / 2
    top = by - s * b
    vis = (left + s * l, top + s * t, left + s * r, top + s * b)
    if vis[0] < 18 or vis[2] > 1152 or vis[1] < 18 or vis[3] > 552:
        print("WARNUNG Motiv am Rand beschnitten:", rel, [round(v) for v in vis])
    return (f'<img class="cut" src="{SRC(rel)}" style="left:{left:.1f}px;top:{top:.1f}px;'
            f'width:{w0 * s:.1f}px;height:{h0 * s:.1f}px;z-index:{z};{extra}">')


def bg(rel, pos="center", extra=""):
    USED.append(rel)
    return f'<img class="bg" src="{SRC(rel)}" style="object-position:{pos};{extra}">'


def chips(items, cls=""):
    out = []
    for it in items:
        if isinstance(it, tuple):
            n, lab = it
            out.append(f'<span class="chip"><b>{n}</b>{lab}</span>')
        else:
            out.append(f'<span class="chip">{it}</span>')
    return f'<div class="chips {cls}">' + "".join(out) + "</div>"


def plaque(side, eyebrow, title, line=None, chip_html="", width=440, top=None):
    pos = f"{side}:46px;width:{width}px;" + (f"top:{top}px;" if top is not None else "top:50%;transform:translateY(-50%);")
    body = f'<div class="eyebrow">{eyebrow}</div><h2>{title}</h2><div class="rule"></div>'
    if line:
        body += f"<p>{line}</p>"
    body += chip_html
    return f'<div class="plaque" style="{pos}">{body}</div>'


# ---------------------------------------------------------------- Panel 1: Skills
GATHER = ["woodcutting", "mining", "fishing", "farming", "foraging", "thieving", "hunting"]
CRAFT = ["smithing", "cooking", "leatherworking", "tailoring", "bowcraft", "jewelcrafting", "runecrafting", "herblore"]
COMBAT = ["attack", "power", "defence", "ranged", "magic", "warding", "vitality", "slayer"]


def icon(sid):
    rel = f"skills/{sid}.webp" if os.path.exists(A + f"skills/{sid}.webp") else f"sidebar/sidebaricon_{sid}.webp"
    USED.append(rel)
    return f'<div class="slot"><img src="{SRC(rel)}"></div>'


def skill_row(label, n, ids, y):
    return (f'<div class="srow" style="top:{y}px"><div class="glabel"><b>{n}</b><span>{label}</span></div>'
            + "".join(icon(i) for i in ids) + "</div>")


p1 = f'''
<section class="panel" id="p1">
  {bg("skill-backgrounds/bowcraft.webp", "50% 50%")}
  <div class="grade" style="background:radial-gradient(ellipse 620px 170px at 330px 100px,rgba(10,6,3,.55),rgba(10,6,3,0) 100%),linear-gradient(rgba(16,10,6,.30) 0%,rgba(14,9,5,.50) 30%,rgba(12,8,5,.70) 100%)"></div>
  <div class="head" style="left:84px;top:50px">
    <div class="eyebrow">750+ recipes · every skill to 99</div>
    <h2 class="big">23 skills, one queue.</h2>
  </div>
  <div class="board" style="left:60px;top:176px;width:1050px;height:340px"></div>
  {skill_row("Gathering", 7, GATHER, 202)}
  {skill_row("Crafting", 8, CRAFT, 304)}
  {skill_row("Combat", 8, COMBAT, 406)}
</section>'''

# ---------------------------------------------------------------- Panel 2: Kampfstile
p2 = f'''
<section class="panel" id="p2">
  {bg("battlescreens/borderlands.webp", "50% 62%")}
  <div class="grade" style="background:linear-gradient(90deg,rgba(14,9,5,.10) 0%,rgba(14,9,5,.18) 46%,rgba(12,8,5,.62) 66%,rgba(12,8,5,.74) 100%),linear-gradient(rgba(0,0,0,0) 60%,rgba(10,7,4,.55) 100%)"></div>
  {cut("portraits/human_warrior_m.webp", 400, 150, 492)}
  {cut("portraits/goblin_ranger_f.webp", 318, 345, 492)}
  {cut("portraits/elf_frost_mage_f.webp", 412, 522, 492)}
  <div class="tag" style="left:150px">Melee</div>
  <div class="tag" style="left:345px">Ranged</div>
  <div class="tag" style="left:522px">Magic</div>
  {plaque("right", "3 styles · auto-battle", "Your weapon picks the fight.", None,
          chips([("850+", "gear pieces"), ("42", "gear sets"), ("26", "enchantments"), ("29", "random suffixes")]), 470)}
</section>'''

# ---------------------------------------------------------------- Panel 3: Welt
p3 = f'''
<section class="panel" id="p3">
  {bg("battlescreens/highlands.webp", "50% 55%")}
  <div class="grade" style="background:linear-gradient(270deg,rgba(14,9,5,.05) 0%,rgba(14,9,5,.15) 45%,rgba(12,8,5,.62) 64%,rgba(12,8,5,.74) 100%),linear-gradient(rgba(0,0,0,0) 62%,rgba(10,7,4,.45) 100%)"></div>
  {cut("monsters/elite_slag_ember.webp", 285, 600, 508, 3)}
  {cut("monsters/elite_high_wyvern.webp", 350, 800, 514, 4)}
  {cut("monsters/elite_crypt_icemage.webp", 272, 998, 508, 3)}
  {plaque("left", "11 zones · 9 dungeons", "120 monsters, 29&nbsp;Champions.", None,
          chips([("125", "quests"), ("8", "Slayer floors"), ("5,000", "Paragon floors")]), 460)}
</section>'''

# ---------------------------------------------------------------- Panel 4: Begleiter
p4 = f'''
<section class="panel" id="p4">
  {bg("battlescreens/wildwood.webp", "50% 60%")}
  <div class="grade" style="background:linear-gradient(90deg,rgba(14,9,5,.10) 0%,rgba(14,9,5,.18) 48%,rgba(12,8,5,.62) 66%,rgba(12,8,5,.74) 100%),linear-gradient(rgba(0,0,0,0) 62%,rgba(10,7,4,.5) 100%)"></div>
  {cut("pets/hoarspite.webp", 240, 145, 500, 3)}
  {cut("pets/pyreling.webp", 285, 330, 508, 4)}
  {cut("pets/glyphmaw.webp", 232, 520, 500, 3)}
  {plaque("right", "23 companions", "Every companion has two jobs.",
          "A bonus for its own skill and a real move in combat.",
          chips(["Control", "Protection", "Damage", "Loot", "Support"]), 470)}
</section>'''

# ---------------------------------------------------------------- Panel 5: Raid
p5 = f'''
<section class="panel" id="p5">
  {bg("battlescreens/gk_room_5.webp", "50% 55%")}
  <div class="grade" style="background:linear-gradient(270deg,rgba(14,9,5,.05) 0%,rgba(14,9,5,.15) 45%,rgba(12,8,5,.62) 64%,rgba(12,8,5,.76) 100%),linear-gradient(rgba(0,0,0,0) 62%,rgba(10,7,4,.5) 100%)"></div>
  {cut("monsters/gk_felmagus.webp", 325, 662, 506, 3)}
  {cut("monsters/gk_warking.webp", 405, 834, 516, 4)}
  {cut("monsters/gk_crownguard.webp", 282, 1008, 506, 3)}
  {plaque("left", "Raid · 5 halls · 31 pieces", "Halls of Gobkha&#8217;raz",
          "Four waves and a boss in every hall. Runs in the queue and offline.",
          '<div class="chips"><span class="chip diff" style="--c:#ffd700">Normal</span><span class="chip diff" style="--c:#3fd6c8">Heroic</span><span class="chip diff" style="--c:#ff5fb4">Mythic</span></div>', 480)}
</section>'''

# ---------------------------------------------------------------- Panel 6: Helden
p6 = f'''
<section class="panel" id="p6">
  {bg("battlescreens/pastures.webp", "50% 60%")}
  <div class="grade" style="background:linear-gradient(90deg,rgba(14,9,5,.12) 0%,rgba(14,9,5,.22) 50%,rgba(12,8,5,.62) 66%,rgba(12,8,5,.74) 100%),linear-gradient(rgba(0,0,0,0) 60%,rgba(10,7,4,.5) 100%)"></div>
  {cut("portraits/human_paladin_m.webp", 410, 145, 500, 3)}
  {cut("portraits/elf_shadow_mage_f.webp", 416, 286, 500, 4)}
  {cut("portraits/orc_berserker_m.webp", 420, 446, 500, 5)}
  {cut("portraits/goblin_rogue_m.webp", 328, 592, 500, 6)}
  {plaque("right", "4 races · 240 portraits", "Human, Elf, Orc, Goblin.",
          "Every race can learn every skill and every style.",
          chips([("2", "talent trees"), "Prestige reset", ("350+", "achievements")]), 450)}
</section>'''

# ---------------------------------------------------------------- Panel 7: Idle
USED.append("ui/mainmenu_logo_painterly.webp")
p7 = f'''
<section class="panel" id="p7">
  {bg("ui/mainmenu_highlands_1920.webp", "50% 40%")}
  <div class="grade" style="background:linear-gradient(270deg,rgba(14,9,5,0) 0%,rgba(14,9,5,.10) 38%,rgba(12,8,5,.60) 56%,rgba(12,8,5,.72) 100%)"></div>
  <img class="logo" src="{SRC("ui/mainmenu_logo_painterly.webp")}" style="left:646px;top:122px;width:470px">
  {plaque("left", "Made for idle time", "It keeps working while you&#8217;re away.", None,
          chips(["Up to 8 hours offline", ("15", "town buildings"), "One queue for everything", ("7", "languages"), "No microtransactions"]), 548)}
</section>'''

CSS = f'''
@font-face {{ font-family: "GR Num"; src: url("file:///{F}Cinzel-Regular.ttf") format("truetype"); unicode-range: U+0025, U+002B-003A, U+00D7, U+2013, U+2212, U+221E; }}
@font-face {{ font-family: "Cinzel"; src: url("file:///{F}Cinzel-Regular.ttf") format("truetype"); }}
@font-face {{ font-family: "IM Fell English SC"; src: url("file:///{F}IMFellEnglishSC-Regular.woff2") format("woff2"); }}
@font-face {{ font-family: "Alegreya"; src: url("file:///{F}Alegreya-Variable.woff2") format("woff2"); font-weight: 400 900; }}
:root {{ --ink: #eadcbc; --ink-dim: #c2ae88; --gold: #e2c47a; --gold-bright: #f3e2a8; --bronze: #d8904a; }}
html, body {{ margin: 0; background: transparent; }}
body {{ display: flex; flex-direction: column; gap: 24px; padding: 12px; }}
.panel {{ position: relative; width: 1170px; height: 570px; overflow: hidden; background: #120c08; color: var(--ink);
  font-family: Alegreya, Georgia, serif; }}
.panel::before {{ content: ""; position: absolute; inset: 0; z-index: 18; pointer-events: none;
  box-shadow: inset 0 0 0 15px rgba(0,0,0,.0), inset 0 0 46px 16px rgba(6,4,2,.62); }}
.panel::after {{ content: ""; position: absolute; inset: 0; z-index: 20; pointer-events: none; border: 28px solid transparent;
  border-image: {U("ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp")} 28 round; }}
.bg {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }}
.grade {{ position: absolute; inset: 0; z-index: 1; }}
.cut {{ position: absolute; filter: drop-shadow(0 10px 14px rgba(0,0,0,.70)); }}
.logo {{ position: absolute; z-index: 3; filter: drop-shadow(0 12px 26px rgba(0,0,0,.75)); }}
.plaque {{ position: absolute; z-index: 10; box-sizing: border-box; padding: 34px 38px 36px;
  background: linear-gradient(rgba(26,16,9,.42), rgba(16,10,6,.62)), {U("ui/gravewood/textures/texture-leather.webp")} center / 560px repeat;
  box-shadow: 0 16px 36px rgba(0,0,0,.62), inset 0 0 30px rgba(0,0,0,.45); }}
.plaque::after {{ content: ""; position: absolute; inset: 0; pointer-events: none; border: 28px solid transparent;
  border-image: {U("ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp")} 28 round; }}
.eyebrow {{ font-family: "GR Num", "IM Fell English SC", Georgia, serif; font-size: 25px; letter-spacing: .07em; color: var(--bronze);
  text-transform: uppercase; margin: 0 0 6px; text-shadow: 0 1px 3px rgba(0,0,0,.9); }}
h2 {{ font-family: "GR Num", "IM Fell English SC", Georgia, serif; font-weight: 400; font-size: 50px; line-height: 1.04; margin: 0;
  color: var(--gold-bright); text-shadow: 0 2px 8px rgba(0,0,0,.85); }}
h2.big {{ font-size: 62px; }}
.rule {{ height: 2px; width: 140px; margin: 16px 0 16px; background: linear-gradient(90deg, var(--bronze), rgba(216,144,74,0)); }}
p {{ font-size: 27px; line-height: 1.3; margin: 0; color: var(--ink); text-shadow: 0 1px 4px rgba(0,0,0,.9); font-weight: 500; }}
.chips {{ display: flex; flex-wrap: wrap; gap: 10px 10px; margin-top: 4px; }}
p + .chips {{ margin-top: 18px; }}
.chip {{ display: inline-flex; align-items: baseline; gap: 9px; padding: 6px 14px 8px; white-space: nowrap;
  font-family: "GR Num", Alegreya, Georgia, serif; font-size: 25px; font-weight: 600; color: var(--ink);
  background: linear-gradient(rgba(12,8,5,.30), rgba(12,8,5,.50)), {U("ui/gravewood/textures/texture-nav-wood2.webp")} 0 0 / 300px repeat;
  border: 1px solid rgba(226,196,122,.40); box-shadow: inset 0 1px 0 rgba(255,232,180,.10), 0 3px 8px rgba(0,0,0,.55);
  text-shadow: 0 1px 3px rgba(0,0,0,.9); }}
.chip b {{ font-family: "GR Num", Cinzel, serif; font-weight: 400; font-size: 27px; color: var(--gold-bright); }}
.chips.two {{ display: grid; grid-template-columns: 1fr 1fr; }}
.chip.diff {{ font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; color: var(--c); border-color: var(--c); font-size: 27px; padding: 6px 18px 8px; }}
.tag {{ position: absolute; z-index: 9; bottom: 34px; transform: translateX(-50%); font-family: "IM Fell English SC", Georgia, serif;
  font-size: 27px; letter-spacing: .06em; color: var(--gold-bright); padding: 5px 20px 7px; white-space: nowrap;
  background: linear-gradient(rgba(12,8,5,.30), rgba(12,8,5,.55)), {U("ui/gravewood/textures/texture-nav-wood2.webp")} 0 0 / 300px repeat;
  border: 1px solid rgba(226,196,122,.45); box-shadow: 0 4px 10px rgba(0,0,0,.6); text-shadow: 0 1px 3px rgba(0,0,0,.9); }}
.head {{ position: absolute; z-index: 10; }}
.board {{ position: absolute; z-index: 2;
  background: linear-gradient(rgba(22,14,8,.40), rgba(14,9,5,.58)), {U("ui/gravewood/textures/texture-leather.webp")} center / 560px repeat;
  box-shadow: 0 16px 36px rgba(0,0,0,.6), inset 0 0 30px rgba(0,0,0,.45); }}
.board::after {{ content: ""; position: absolute; inset: 0; pointer-events: none; border: 28px solid transparent;
  border-image: {U("ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp")} 28 round; }}
.srow {{ position: absolute; z-index: 5; left: 88px; display: flex; align-items: center; gap: 14px; }}
.glabel {{ width: 182px; display: flex; align-items: baseline; gap: 12px; font-family: "IM Fell English SC", Georgia, serif;
  font-size: 30px; color: var(--ink); text-shadow: 0 1px 4px rgba(0,0,0,.9); }}
.glabel b {{ font-family: Cinzel, serif; font-weight: 400; font-size: 40px; color: var(--gold-bright); min-width: 30px; }}
.slot {{ width: 88px; height: 88px; box-sizing: border-box; display: grid; place-items: center;
  background: radial-gradient(ellipse at 50% 40%, rgba(70,48,28,.55), rgba(10,7,5,.85) 80%);
  border: 8px solid transparent; border-image: {U("ui/gravewood/v3/frames/slot-frame.webp")} 48 / 8px; }}
.slot img {{ width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 3px 4px rgba(0,0,0,.8)); }}
'''
USED += ["ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp", "ui/gravewood/textures/texture-leather.webp",
         "ui/gravewood/textures/texture-nav-wood2.webp", "ui/gravewood/v3/frames/slot-frame.webp"]

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Grim Reach Store Panels 1.4.0</title>
<!-- claude:2026-10-25T10:19:00+01:00 - erzeugt von build_panels.py, nicht von Hand bearbeiten -->
<style>{CSS}</style>
</head>
<body>
{p1}
{p2}
{p3}
{p4}
{p5}
{p6}
{p7}
</body>
</html>
'''
with open(os.path.join(HERE, "panels.html"), "w", encoding="utf-8") as fh:
    fh.write(html)
with open(os.path.join(HERE, "used-assets.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(sorted(set(USED))) + "\n")
print("panels.html geschrieben,", len(set(USED)), "Assets")
