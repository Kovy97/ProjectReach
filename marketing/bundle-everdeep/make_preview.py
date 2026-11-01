# claude:2026-10-31T21:10:56+01:00 Lokale Vorschau der Bündeltexte im Steam-Look (Annäherung, kein Steam-Renderer).
# Liest texte/*.txt und schreibt vorschau.html.  Aufruf aus G:\GameDev:
#   python -I -X utf8 marketing/bundle-everdeep/make_preview.py
import glob
import html
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SECTIONS = ["ÜBER DIESES BÜNDEL (BBCode)", "KURZBESCHREIBUNG: ÜBERSCHRIFT",
            "KURZBESCHREIBUNG: TEXT (max. 155 Zeichen)", "ANGEBOTSBESCHREIBUNG", "RECHTLICHES"]


def parse(path):
    text = open(path, encoding="utf-8").read()
    parts = re.split(r"^=== (.+?) ===$", text, flags=re.M)
    return {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts), 2)}


def bbcode(src):
    out = html.escape(src)
    out = re.sub(r"\[h2\](.*?)\[/h2\]\n?", r'<h2 class="bb_tag">\1</h2>', out, flags=re.S)
    out = re.sub(r"\[b\](.*?)\[/b\]", r"<b>\1</b>", out, flags=re.S)
    out = re.sub(r"\[i\](.*?)\[/i\]", r"<i>\1</i>", out, flags=re.S)
    out = re.sub(r"\[u\](.*?)\[/u\]", r"<u>\1</u>", out, flags=re.S)

    def lst(m):
        items = [x.strip() for x in m.group(1).split("[*]") if x.strip()]
        return '<ul class="bb_ul">' + "".join(f"<li>{x}</li>" for x in items) + "</ul>"

    out = re.sub(r"\[list\](.*?)\[/list\]\n?", lst, out, flags=re.S)
    out = out.replace("\n\n", "<br><br>").replace("\n", "<br>")
    return out


def main():
    langs = []
    for p in sorted(glob.glob(os.path.join(HERE, "texte", "*.txt"))):
        name = os.path.basename(p)[3:-4].replace("-", " ").title()
        langs.append((name, parse(p)))
    tabs = "".join(f'<button data-i="{i}"{" class=on" if i == 0 else ""}>{html.escape(n)}</button>'
                   for i, (n, _) in enumerate(langs))
    pages = []
    for i, (name, s) in enumerate(langs):
        short = s[SECTIONS[2]]
        pages.append(f"""
<section data-i="{i}"{"" if i == 0 else " hidden"}>
  <img class="hdr" src="fertig/bundle_page_header_1414x464.png" alt="">
  <div class="cols">
    <div class="main">
      <div class="block_title">Über dieses Bündel</div>
      <div class="desc">{bbcode(s[SECTIONS[0]])}</div>
      <div class="legal">{html.escape(s[SECTIONS[4]])}</div>
    </div>
    <aside>
      <div class="cap">
        <img src="fertig/bundle_main_capsule_1232x706.png" alt="">
        <div class="cap_head">{html.escape(s[SECTIONS[1]])}</div>
        <div class="cap_text">{html.escape(short)}</div>
        <div class="count{" bad" if len(short) > 155 else ""}">{len(short)} / 155 Zeichen</div>
      </div>
      <div class="block_title">Angebotsbeschreibung</div>
      <div class="offer">{html.escape(s[SECTIONS[3]])}</div>
    </aside>
  </div>
</section>""")
    doc = f"""<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bündel-Vorschau</title>
<style>
:root {{ --bg:#1b2838; --panel:#16202d; --text:#acb2b8; --head:#fff; --blue:#66c0f4; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--text); font:14px/1.6 "Motiva Sans", Arial, "Noto Sans CJK SC", "Microsoft YaHei", "Meiryo", "Malgun Gothic", sans-serif; }}
nav {{ position:sticky; top:0; z-index:2; display:flex; flex-wrap:wrap; gap:6px; padding:10px 16px; background:#0e141b; }}
nav button {{ background:#2a475e; color:#c7d5e0; border:0; padding:6px 10px; border-radius:2px; cursor:pointer; font:inherit; font-size:13px; }}
nav button.on {{ background:var(--blue); color:#0e141b; }}
section {{ max-width:960px; margin:0 auto; padding:16px; }}
.hdr {{ width:100%; display:block; border-radius:2px; }}
.cols {{ display:flex; gap:24px; margin-top:16px; }}
.main {{ flex:1 1 616px; min-width:0; }}
aside {{ flex:0 0 308px; }}
.block_title {{ color:var(--head); font-size:14px; text-transform:uppercase; letter-spacing:.03em; padding-bottom:4px; margin:0 0 10px;
  background:linear-gradient(to right, #3b6e8c 0%, rgba(59,110,140,0) 100%) left bottom / 100% 1px no-repeat; }}
h2.bb_tag {{ color:var(--head); font-size:14px; font-weight:normal; text-transform:uppercase; letter-spacing:2px; margin:18px 0 6px; }}
h2.bb_tag:first-child {{ margin-top:0; }}
ul.bb_ul {{ margin:6px 0 10px; padding-left:22px; }}
ul.bb_ul li {{ margin:2px 0; }}
.legal {{ margin-top:24px; font-size:11px; color:#8f98a0; }}
.cap {{ background:var(--panel); padding:0 0 10px; margin-bottom:18px; }}
.cap img {{ width:100%; display:block; }}
.cap_head {{ color:var(--head); font-size:15px; padding:8px 10px 2px; }}
.cap_text {{ padding:0 10px; font-size:13px; line-height:1.45; }}
.count {{ padding:4px 10px 0; font-size:11px; color:#5c7e10; }}
.count.bad {{ color:#e03c3c; }}
.offer {{ font-size:13px; }}
@media (max-width:720px) {{ .cols {{ flex-direction:column; }} aside {{ flex-basis:auto; }} }}
</style></head><body>
<nav>{tabs}</nav>
{"".join(pages)}
<script>
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {{
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("on", x === b));
  document.querySelectorAll("section").forEach(s => s.hidden = s.dataset.i !== b.dataset.i);
}});
</script></body></html>"""
    out = os.path.join(HERE, "vorschau.html")
    open(out, "w", encoding="utf-8").write(doc)
    print(out)


if __name__ == "__main__":
    main()
