# Grim Reach Discord-Grafiken: Server-Symbole, Banner, Einladungs-Hintergrund und Kanal-Kopfbilder als HTML.
# claude:2026-10-25T13:17:00+01:00 - Chef-Auftrag 25.10. (Discord-Server Heartforge Studios), Vorbild
# design/steam-store-panels-1.4.0. Aufruf: python -I build_icons.py; python -I build_pages.py; node render_pages.mjs
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sources import A, F, HEADER_ICONS  # noqa: E402

SRC = lambda rel: f"file:///{A}{rel}"
U = lambda rel: f'url("file:///{A}{rel}")'
TMPU = lambda name: f"file:///{HERE.replace(os.sep, '/')}/_tmp/{name}"
USED = set()


def bg(rel, pos="center", extra=""):
    USED.add(rel)
    return f'<img class="bg" src="{SRC(rel)}" style="object-position:{pos};{extra}">'


LOGO = "ui/mainmenu_logo_painterly.webp"
WOOD = "ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp"
LEATHER = "ui/gravewood/textures/texture-leather.webp"
STONE = "bg_tileable_stone_dark.webp"
SLOT = "ui/gravewood/v3/frames/slot-frame.webp"
USED.update([LOGO, WOOD, LEATHER, STONE, SLOT])

# ------------------------------------------------------------------ Server-Symbole 512 x 512
icons = f'''
<section class="sq" id="icon_crown">
  <div class="tex"></div>
  <div class="grade" style="background:radial-gradient(circle at 50% 52%, rgba(176,64,22,.72) 0%, rgba(96,30,12,.50) 30%, rgba(14,8,5,.90) 66%, rgba(6,4,3,1) 100%)"></div>
  <img class="free" src="{TMPU("crown.png")}" style="left:50%;top:50%;width:430px;transform:translate(-50%,-46%)">
</section>
<section class="sq" id="icon_logo">
  {bg("ui/mainmenu.webp", "50% 40%", "filter:brightness(.62) saturate(.9)")}
  <div class="grade" style="background:radial-gradient(circle at 50% 50%, rgba(10,6,4,.10) 0%, rgba(10,6,4,.55) 60%, rgba(6,4,3,.92) 100%)"></div>
  <img class="free" src="{SRC(LOGO)}" style="left:50%;top:50%;width:448px;transform:translate(-50%,-50%)">
</section>
<section class="sq" id="icon_hearth">
  <div class="tex"></div>
  <div class="grade" style="background:radial-gradient(circle at 50% 46%, rgba(150,62,20,.50) 0%, rgba(70,26,10,.40) 32%, rgba(10,6,4,.92) 68%, rgba(6,4,3,1) 100%)"></div>
  <img class="free" src="{SRC("sidebar/sidebaricon_newhaven.webp")}" style="left:50%;top:50%;width:470px;transform:translate(-50%,-49%)">
</section>'''
USED.update(["ui/mainmenu.webp", "sidebar/sidebaricon_newhaven.webp"])

# ------------------------------------------------------------------ Server-Banner 960 x 540
banners = f'''
<section class="banner" id="banner_highlands">
  {bg("ui/mainmenu_highlands_1920.webp", "50% 38%")}
  <div class="grade" style="background:linear-gradient(rgba(10,7,4,.45) 0%, rgba(10,7,4,.05) 30%, rgba(10,7,4,.05) 62%, rgba(10,7,4,.55) 100%), radial-gradient(ellipse 560px 260px at 50% 58%, rgba(8,5,3,.42), rgba(8,5,3,0) 100%)"></div>
  <img class="free logo" src="{SRC(LOGO)}" style="left:50%;top:58%;width:700px;transform:translate(-50%,-50%)">
</section>
<section class="banner" id="banner_dusk">
  {bg("ui/mainmenu_hero.webp", "50% 50%")}
  <div class="grade" style="background:linear-gradient(rgba(10,7,4,.40) 0%, rgba(10,7,4,.0) 34%, rgba(10,7,4,.0) 62%, rgba(10,7,4,.55) 100%)"></div>
  <img class="free logo" src="{SRC(LOGO)}" style="left:50%;top:58%;width:700px;transform:translate(-50%,-50%)">
</section>'''
USED.update(["ui/mainmenu_highlands_1920.webp", "ui/mainmenu_hero.webp"])

# ------------------------------------------------------------------ Einladungs-Hintergrund 1920 x 1080
# Discord legt die Einladungskarte mittig darueber: Logo deshalb oben links, Mitte bleibt ruhige Landschaft.
splashes = f'''
<section class="splash" id="splash_highlands">
  {bg("ui/mainmenu_highlands_1920.webp", "50% 50%")}
  <div class="grade" style="background:radial-gradient(ellipse 1300px 760px at 50% 55%, rgba(8,5,3,0) 40%, rgba(8,5,3,.55) 100%), linear-gradient(135deg, rgba(8,5,3,.55) 0%, rgba(8,5,3,0) 38%)"></div>
  <img class="free logo" src="{SRC(LOGO)}" style="left:84px;top:64px;width:600px">
</section>
<section class="splash" id="splash_war_table">
  {bg("ui/mainmenu_war_table.webp", "50% 50%")}
  <div class="grade" style="background:radial-gradient(ellipse 1300px 760px at 50% 55%, rgba(8,5,3,0) 40%, rgba(8,5,3,.55) 100%)"></div>
  <img class="free logo" src="{SRC(LOGO)}" style="left:84px;top:64px;width:600px">
</section>'''
USED.add("ui/mainmenu_war_table.webp")

# ------------------------------------------------------------------ Kanal-Kopfbilder 1200 x 300
HEADERS = [
    # id, Titel, Unterzeile, Kulisse, object-position
    ("welcome", "Welcome", "The official home of Grim Reach", "battlescreens/pastures.webp", "50% 34%"),
    ("rules", "Rules", "Read these before you post", "events/guard_change.webp", "50% 38%"),
    ("faq", "FAQ", "Answers to the questions we hear most", "skill-backgrounds/inscription.webp", "50% 55%"),
    ("announcements", "Announcements", "News from Heartforge Studios", "events/customer.webp", "50% 40%"),
    ("patch-notes", "Patch Notes", "Every update, fresh from the forge", "skill-backgrounds/smithing.webp", "zoom:1560:-150:-150"),
    ("dev-log", "Dev Log", "A look into the workshop", "skill-backgrounds/jewelcrafting.webp", "50% 45%"),
    ("guides-and-builds", "Guides &amp; Builds", "Routes, builds and hard-won knowledge", "ui/mainmenu_war_table.webp", "50% 78%"),
    ("suggestions", "Suggestions", "Your ideas for the Reach", "events/inspiration.webp", "50% 32%"),
    ("bug-reports", "Bug Reports", "Found something broken? Tell us here", "battlescreens/blackthorn.webp", "50% 42%"),
    ("beta-news", "Beta News", "Test builds and what comes next", "skill-backgrounds/runecrafting.webp", "50% 50%"),
]
heads = []
for hid, title, sub, rel, pos in HEADERS:
    icon = HEADER_ICONS[hid]
    USED.add(icon)
    if pos.startswith("zoom:"):
        _, w, left, top = pos.split(":")
        USED.add(rel)
        layer = (f'<img class="bgz" src="{SRC(rel)}" style="width:{w}px;left:{left}px;top:{top}px">')
    else:
        layer = bg(rel, pos)
    size = ' style="font-size:72px"' if len(title.replace("&amp;", "&")) >= 11 else ""
    heads.append(f'''
<section class="hdr" id="hdr_{hid}">
  {layer}
  <div class="grade" style="background:linear-gradient(90deg, rgba(12,8,5,.90) 0%, rgba(12,8,5,.82) 30%, rgba(12,8,5,.55) 58%, rgba(12,8,5,.12) 80%, rgba(12,8,5,0) 100%)"></div>
  <div class="medal"><img src="{SRC(icon)}"></div>
  <div class="txt">
    <div class="eyebrow">Grim Reach</div>
    <h1{size}>{title}</h1>
    <div class="rule"></div>
    <p>{sub}</p>
  </div>
</section>''')

# claude:2026-10-25T13:15:00+01:00 - Chef 25.10.: Kopfbilder in Discord zu klein. Discord zeigt Bildanhaenge hoechstens etwa 550 px breit,
# ein 4:1-Bild wird dadurch nur rund 140 px hoch. 2:1-Fassung (1600 x 800) mit grosser Schrift = doppelte Flaeche.
heads2 = []
for hid, title, sub, rel, pos in HEADERS:
    icon = HEADER_ICONS[hid]
    layer = bg(rel, "50% 42%" if pos.startswith("zoom:") else pos)
    heads2.append(f'''
<section class="hdr hdr2" id="hdr2_{hid}">
  {layer}
  <div class="grade" style="background:linear-gradient(90deg, rgba(12,8,5,.92) 0%, rgba(12,8,5,.84) 34%, rgba(12,8,5,.55) 62%, rgba(12,8,5,.15) 84%, rgba(12,8,5,0) 100%)"></div>
  <div class="medal"><img src="{SRC(icon)}"></div>
  <div class="txt">
    <div class="eyebrow">Grim Reach</div>
    <h1>{title}</h1>
    <div class="rule"></div>
    <p>{sub}</p>
  </div>
</section>''')

CSS = f'''
@font-face {{ font-family: "Cinzel"; src: url("file:///{F}Cinzel-Regular.ttf") format("truetype"); }}
@font-face {{ font-family: "IM Fell English SC"; src: url("file:///{F}IMFellEnglishSC-Regular.woff2") format("woff2"); }}
@font-face {{ font-family: "Alegreya"; src: url("file:///{F}Alegreya-Variable.woff2") format("woff2"); font-weight: 400 900; }}
@font-face {{ font-family: "Alegreya"; font-style: italic; src: url("file:///{F}Alegreya-Italic-Variable.woff2") format("woff2"); font-weight: 400 900; }}
:root {{ --ink: #eadcbc; --gold: #e2c47a; --gold-bright: #f3e2a8; --bronze: #d8904a; }}
html, body {{ margin: 0; background: transparent; }}
body {{ display: flex; flex-direction: column; gap: 20px; padding: 10px; }}
section {{ position: relative; overflow: hidden; background: #120c08; flex: none; }}
.sq {{ width: 512px; height: 512px; }}
.banner {{ width: 960px; height: 540px; }}
.splash {{ width: 1920px; height: 1080px; }}
.hdr {{ width: 1200px; height: 300px; color: var(--ink); font-family: Alegreya, Georgia, serif; }}
.bgz {{ position: absolute; z-index: 0; height: auto; }}
.bg {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }}
.tex {{ position: absolute; inset: 0; z-index: 0; background: {U(STONE)} 0 0 / 256px repeat; filter: brightness(.55) sepia(.35); }}
.grade {{ position: absolute; inset: 0; z-index: 1; }}
.free {{ position: absolute; z-index: 3; filter: drop-shadow(0 10px 18px rgba(0,0,0,.75)); }}
.logo {{ filter: drop-shadow(0 14px 28px rgba(0,0,0,.80)); }}
.hdr::before {{ content: ""; position: absolute; inset: 0; z-index: 18; pointer-events: none; box-shadow: inset 0 0 40px 14px rgba(6,4,2,.60); }}
.hdr::after {{ content: ""; position: absolute; inset: 0; z-index: 20; pointer-events: none; border: 24px solid transparent;
  border-image: {U(WOOD)} 28 round; }}
.medal {{ position: absolute; z-index: 6; left: 58px; top: 72px; width: 156px; height: 156px; box-sizing: border-box; display: grid; place-items: center;
  background: radial-gradient(ellipse at 50% 42%, rgba(86,56,30,.70), rgba(12,8,5,.92) 78%);
  border: 10px solid transparent; border-image: {U(SLOT)} 48 / 10px; box-shadow: 0 8px 18px rgba(0,0,0,.6); }}
.medal img {{ width: 118px; height: 118px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,.85)); }}
.txt {{ position: absolute; z-index: 6; left: 248px; top: 50%; transform: translateY(-50%); }}
.eyebrow {{ font-family: "IM Fell English SC", Georgia, serif; font-size: 28px; letter-spacing: .10em; color: var(--bronze);
  text-transform: uppercase; text-shadow: 0 1px 3px rgba(0,0,0,.95); margin: 0 0 2px 3px; }}
h1 {{ font-family: Cinzel, Georgia, serif; font-weight: 400; font-size: 80px; line-height: 1.0; margin: 0; color: var(--gold-bright);
  white-space: nowrap; text-shadow: 0 3px 10px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,.8); }}
.rule {{ height: 2px; width: 180px; margin: 14px 0 12px 3px; background: linear-gradient(90deg, var(--bronze), rgba(216,144,74,0)); }}
p {{ margin: 0 0 0 3px; font-size: 32px; font-style: italic; font-weight: 500; color: var(--ink); white-space: nowrap;
  text-shadow: 0 1px 4px rgba(0,0,0,.95); }}
.hdr2 {{ width: 1600px; height: 800px; }}
.hdr2::before {{ box-shadow: inset 0 0 70px 24px rgba(6,4,2,.62); }}
.hdr2::after {{ border-width: 38px; }}
.hdr2 .medal {{ left: 100px; top: 50%; transform: translateY(-50%); width: 270px; height: 270px; border-width: 16px; border-image-width: 16px; }}
.hdr2 .medal img {{ width: 206px; height: 206px; }}
.hdr2 .txt {{ left: 420px; right: 70px; }}
.hdr2 .eyebrow {{ font-size: 48px; margin: 0 0 6px 5px; }}
.hdr2 h1 {{ font-size: 150px; text-shadow: 0 5px 16px rgba(0,0,0,.92), 0 0 3px rgba(0,0,0,.85); }}
.hdr2 .rule {{ height: 3px; width: 300px; margin: 24px 0 20px 5px; }}
.hdr2 p {{ font-size: 54px; white-space: normal; max-width: 1050px; line-height: 1.2; }}
'''

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Grim Reach Discord Assets</title>
<!-- claude:2026-10-25T13:17:00+01:00 - erzeugt von build_pages.py, nicht von Hand bearbeiten -->
<style>{CSS}</style>
</head>
<body>
{icons}
{banners}
{splashes}
{"".join(heads)}
{"".join(heads2)}
<script>
// Titel der 2:1-Kopfbilder auf die verfuegbare Breite einpassen (lange Namen wie "Announcements").
// Erst nach dem Laden der Schriften messen, sonst misst der Browser mit der schmaleren Ersatzschrift.
window.__fitDone = document.fonts.ready.then(() => {{
  for (const h of document.querySelectorAll(".hdr2 h1")) {{
    let fs = 150;
    h.style.fontSize = fs + "px";
    while (h.scrollWidth > h.clientWidth + 1 && fs > 70) {{ fs -= 4; h.style.fontSize = fs + "px"; }}
  }}
}});
</script>
</body>
</html>
'''
with open(os.path.join(HERE, "pages.html"), "w", encoding="utf-8") as fh:
    fh.write(html)
with open(os.path.join(HERE, "used-assets-pages.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(sorted(USED)) + "\n")
print("pages.html geschrieben,", len(USED), "Assets")
