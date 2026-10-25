// claude:2026-10-25T14:16:00+01:00 - Steam-Event-Bilder zur Discord-Eroeffnung (Chef-Auftrag 25.10.).
// Cover 800x450 und Header 1920x622 (Steamworks "Event Graphical Assets", partner.steamgames.com/doc/store/assets/eventassets).
// Nur Bestandsbilder: gemaltes Logo + Hochland-Kulisse, Schriftzug in Cinzel. Kein fremdes Marken-Logo, nur Text.
// Vorbild: design/discord-assets/_build (HTML -> headless Chromium ueber file://, kein Server/Port).
// Aufruf: node design/discord-assets/steam-event/_build/build_event.mjs
import { chromium } from "file:///G:/GameDev/apps/client/node_modules/@playwright/test/index.mjs";
import { writeFileSync } from "node:fs";

const A = "G:/GameDev/apps/client/src/renderer/assets/";
const F = "G:/GameDev/apps/client/src/renderer/fonts/";
const HERE = "G:/GameDev/design/discord-assets/steam-event/_build/";
const OUTDIR = "G:/GameDev/design/discord-assets/steam-event/";
const LOGO = `file:///${A}ui/mainmenu_logo_painterly.webp`;
const LAND = `file:///${A}ui/mainmenu_highlands_1920.webp`;

const OUT = {
  cover: { file: "discord-launch_cover_800x450.png", w: 800, h: 450 },
  header: { file: "discord-launch_header_1920x622.png", w: 1920, h: 622 },
};

// Eck-Ornamente wie in der Patch-Vorlage (design/marketing/event-assets), damit der Post als Grim Reach erkennbar bleibt.
const corners = `<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Grim Reach Steam Event Discord</title>
<!-- claude:2026-10-25T14:16:00+01:00 - erzeugt von build_event.mjs, nicht von Hand bearbeiten -->
<style>
@font-face { font-family: "Cinzel"; src: url("file:///${F}Cinzel-Regular.ttf") format("truetype"); }
@font-face { font-family: "IM Fell English SC"; src: url("file:///${F}IMFellEnglishSC-Regular.woff2") format("woff2"); }
:root { --gold: #e2c47a; --gold-bright: #f5e6b2; --bronze: #d8904a; }
html, body { margin: 0; background: #0b0805; }
body { display: flex; flex-direction: column; gap: 20px; padding: 10px; }
section { position: relative; overflow: hidden; background: #120c08; flex: none; }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.grade { position: absolute; inset: 0; z-index: 1; }
.stack { position: absolute; z-index: 5; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; }
.logo { display: block; height: auto; filter: drop-shadow(0 12px 24px rgba(0,0,0,.85)); }
.title { display: flex; align-items: center; white-space: nowrap; }
.title h1 { font-family: Cinzel, Georgia, serif; font-weight: 400; margin: 0; line-height: 1; color: var(--gold-bright);
  letter-spacing: .03em; text-shadow: 0 3px 10px rgba(0,0,0,.95), 0 0 3px rgba(0,0,0,.9), 0 0 22px rgba(0,0,0,.55); }
.title .ln { height: 2px; background: linear-gradient(90deg, rgba(226,196,122,0), var(--gold)); }
.title .ln.r { background: linear-gradient(90deg, var(--gold), rgba(226,196,122,0)); }
.title .dot { width: 8px; height: 8px; background: var(--gold); transform: rotate(45deg); flex: none; }
.sub { font-family: "IM Fell English SC", Georgia, serif; color: var(--bronze); letter-spacing: .16em; text-transform: uppercase;
  text-shadow: 0 1px 4px rgba(0,0,0,.95), 0 0 10px rgba(0,0,0,.6); }
.c { position: absolute; z-index: 8; width: 34px; height: 34px; border: 0 solid var(--gold); opacity: .85; }
.c.tl { border-top-width: 2px; border-left-width: 2px; }
.c.tr { border-top-width: 2px; border-right-width: 2px; }
.c.bl { border-bottom-width: 2px; border-left-width: 2px; }
.c.br { border-bottom-width: 2px; border-right-width: 2px; }

/* Cover 800 x 450: Steam zeigt es auch klein in Listen, deshalb grosse Schrift und ruhiger Grund */
#cover { width: 800px; height: 450px; }
#cover .stack { top: 30px; }
#cover .logo { width: 470px; }
#cover .title { margin-top: 10px; gap: 16px; }
#cover .title h1 { font-size: 58px; }
#cover .title .ln { width: 34px; }
#cover .sub { font-size: 23px; margin-top: 12px; }
#cover .c { width: 26px; height: 26px; }
#cover .tl { left: 20px; top: 20px; } #cover .tr { right: 20px; top: 20px; }
#cover .bl { left: 20px; bottom: 20px; } #cover .br { right: 20px; bottom: 20px; }

/* Header 1920 x 622: alles mittig gestapelt, damit seitliches Beschneiden auf schmalen Ansichten nichts kostet */
#header { width: 1920px; height: 622px; }
#header .stack { top: 44px; }
#header .logo { width: 620px; }
#header .title { margin-top: 8px; gap: 26px; }
#header .title h1 { font-size: 92px; }
#header .title .ln { width: 120px; height: 3px; }
#header .title .dot { width: 11px; height: 11px; }
#header .sub { font-size: 32px; margin-top: 14px; }
#header .tl { left: 36px; top: 36px; } #header .tr { right: 36px; top: 36px; }
#header .bl { left: 36px; bottom: 36px; } #header .br { right: 36px; bottom: 36px; }
</style>
</head>
<body>
<section id="cover">
  <img class="bg" src="${LAND}" style="object-position:50% 46%;filter:saturate(.92)">
  <div class="grade" style="background:
    radial-gradient(ellipse 560px 300px at 50% 62%, rgba(10,7,4,.62) 0%, rgba(10,7,4,.30) 60%, rgba(10,7,4,0) 100%),
    linear-gradient(rgba(10,7,4,.42) 0%, rgba(10,7,4,.18) 34%, rgba(10,7,4,.48) 70%, rgba(10,7,4,.86) 100%),
    radial-gradient(ellipse 900px 520px at 50% 50%, rgba(8,5,3,0) 55%, rgba(8,5,3,.55) 100%)"></div>
  ${corners}
  <div class="stack">
    <img class="logo" src="${LOGO}">
    <div class="title"><span class="ln"></span><span class="dot"></span><h1>Official Discord</h1><span class="dot"></span><span class="ln r"></span></div>
    <div class="sub">Now open</div>
  </div>
</section>
<section id="header">
  <img class="bg" src="${LAND}" style="object-position:50% 52%;filter:saturate(.92)">
  <div class="grade" style="background:
    radial-gradient(ellipse 980px 380px at 50% 60%, rgba(10,7,4,.66) 0%, rgba(10,7,4,.34) 58%, rgba(10,7,4,0) 100%),
    linear-gradient(rgba(10,7,4,.40) 0%, rgba(10,7,4,.16) 32%, rgba(10,7,4,.42) 70%, rgba(10,7,4,.80) 100%),
    linear-gradient(90deg, rgba(8,5,3,.55) 0%, rgba(8,5,3,0) 22%, rgba(8,5,3,0) 78%, rgba(8,5,3,.55) 100%)"></div>
  ${corners}
  <div class="stack">
    <img class="logo" src="${LOGO}">
    <div class="title"><span class="ln"></span><span class="dot"></span><h1>Official Discord</h1><span class="dot"></span><span class="ln r"></span></div>
    <div class="sub">Now open</div>
  </div>
</section>
</body>
</html>
`;
writeFileSync(HERE + "event.html", html, "utf-8");

const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1960, height: 1200 }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
p.on("requestfailed", (r) => console.log("REQFAIL", r.url()));
await p.goto("file:///" + HERE + "event.html");
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => null))));
await p.waitForTimeout(400);
for (const [id, o] of Object.entries(OUT)) {
  // Lage pruefen: Cinzel wirklich geladen, Stapel innerhalb der Flaeche mit Rand
  const check = await p.evaluate((sid) => {
    const sec = document.getElementById(sid).getBoundingClientRect();
    const st = document.querySelector(`#${sid} .stack`).getBoundingClientRect();
    const t = document.querySelector(`#${sid} .title`).getBoundingClientRect();
    return {
      size: [Math.round(sec.width), Math.round(sec.height)],
      font: document.fonts.check('60px "Cinzel"'),
      top: Math.round(st.top - sec.top), bottom: Math.round(sec.bottom - st.bottom),
      titleLeft: Math.round(t.left - sec.left), titleRight: Math.round(sec.right - t.right),
    };
  }, id);
  const ok = check.size[0] === o.w && check.size[1] === o.h && check.font && check.top >= 20 && check.bottom >= 20 && check.titleLeft >= 40 && check.titleRight >= 40;
  console.log(id, ok ? "ok" : "PROBLEM", JSON.stringify(check));
  await p.locator("#" + id).screenshot({ path: OUTDIR + o.file });
}
await b.close();
