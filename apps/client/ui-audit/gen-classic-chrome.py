"""claude:2026-10-19T11:10:00+02:00 — Chef 19.10.: Classic-Chrome (Look von 1.2.3) erzeugen.

Nimmt die Chrome-Stylesheets aus dem Live-Stand 1.2.3 (Commit ec86af5) — Seitenleiste, Reiterleiste, Kopfzeile
„Quiet Citadel“ — und schreibt sie nach styles/classic-chrome.css, jede Regel mit dem Präfix
`:root[data-ui-style="classic"]` (gilt nur im Classic-Stil, auch für Portale wie die Seitenleisten-Tooltips).
  - URLs der 21 seit 1.2.3 ersetzten Stil-Grafiken zeigen auf die 1.2.3-Kopien unter assets/classic/.
  - @keyframes bekommen das Suffix `--classic`, damit sie die heutigen gleichnamigen nicht überschreiben.
  - gravewood-controls.css nur mit den Kopfzeilen-Regeln (header-charinfo, gamestats, tb-bar, content-header).

Aufruf (aus G:/GameDev):  python -I -X utf8 apps/client/ui-audit/gen-classic-chrome.py
"""
import re
import subprocess
from pathlib import Path

REPO = Path("G:/GameDev")
STYLES = "apps/client/src/renderer/styles"
OUT = REPO / STYLES / "classic-chrome.css"
BASE = "ec86af5"
PREFIX = ':root[data-ui-style="classic"]'
FILES = [("topbar.css", None), ("sidebar.css", None), ("gravewood-navigation.css", None),
         ("gravewood-controls.css", re.compile(r"content-header|header-charinfo|gamestats|tb-bar|levelup-burst"))]
REPLACED = """attribute_bg.webp bagpack_background.webp bg_black.webp bg_copper.webp bg_equipment.webp bg_green.webp bg_grey.webp
bg_sidebar.webp bg_tileable_leather.webp bg_tileable_wood.webp bg_topbar.webp
ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp
ui/gravewood/textures/texture-gravewood.webp ui/gravewood/textures/texture-leather.webp
ui/gravewood/textures/texture-parchment.webp ui/gravewood/textures/texture-smoky-bronze.webp
ui/gravewood/textures/texture-umber-cloth.webp ui/gravewood/v3/textures/texture-ash-stone.webp
ui/gravewood/v3/textures/texture-basalt.webp ui/gravewood/v3/textures/texture-cold-slate.webp""".split()


def git_show(path: str) -> str:
    return subprocess.run(["git", "-C", str(REPO), "show", f"{BASE}:{path}"], capture_output=True, check=True).stdout.decode("utf-8")


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def parse(css: str):
    """Liefert eine Liste von Knoten: ("rule", prelude, body) oder ("at", prelude, children|body, is_block)."""
    nodes, i, n = [], 0, len(css)
    while i < n:
        while i < n and css[i] in " \t\r\n":
            i += 1
        if i >= n:
            break
        j, depth, quote = i, 0, None
        # Prelude bis { oder ;
        while j < n:
            c = css[j]
            if quote:
                if c == quote:
                    quote = None
            elif c in "\"'":
                quote = c
            elif c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            elif depth == 0 and c in "{;":
                break
            j += 1
        prelude = css[i:j].strip()
        if j >= n:
            break
        if css[j] == ";":  # @import / @charset u. ä.
            nodes.append(("stmt", prelude, None))
            i = j + 1
            continue
        # Block bis zur passenden }
        k, d, quote = j + 1, 1, None
        while k < n and d > 0:
            c = css[k]
            if quote:
                if c == quote:
                    quote = None
            elif c in "\"'":
                quote = c
            elif c == "{":
                d += 1
            elif c == "}":
                d -= 1
            k += 1
        inner = css[j + 1:k - 1]
        if prelude.startswith("@") and re.match(r"@(media|supports|container|layer)\b", prelude):
            nodes.append(("group", prelude, parse(inner)))
        elif prelude.startswith("@"):
            nodes.append(("atblock", prelude, inner))
        else:
            nodes.append(("rule", prelude, inner))
        i = k
    return nodes


def scope_selector(sel: str) -> str:
    s = sel.strip()
    if not s:
        return s
    m = re.match(r"^(:root|html)\b(.*)$", s, flags=re.S)
    if m:
        return PREFIX + m.group(2)
    m = re.match(r"^body\b(.*)$", s, flags=re.S)
    if m:
        return f"{PREFIX} body{m.group(1)}"
    return f"{PREFIX} {s}"


def fix_urls(body: str) -> str:
    def rep(m):
        raw = m.group(1).strip().strip("\"'")
        for f in REPLACED:
            if raw.endswith("/assets/" + f):
                raw = raw[: -len(f)] + "classic/" + f
                break
        return f'url("{raw}")'
    return re.sub(r"url\(\s*([^)]*?)\s*\)", rep, body)


def emit(nodes, keyframes, filt, out, indent=""):
    for kind, prelude, payload in nodes:
        if kind == "stmt":
            continue
        if kind == "group":
            buf = []
            emit(payload, keyframes, filt, buf, indent + "  ")
            if buf:
                out.append(f"{indent}{prelude} {{")
                out.extend(buf)
                out.append(f"{indent}}}")
        elif kind == "atblock":
            m = re.match(r"@(-webkit-)?keyframes\s+([\w-]+)", prelude)
            if m:
                if filt is not None:
                    continue
                out.append(f"{indent}@keyframes {m.group(2)}--classic {{{payload}}}")
            elif prelude.startswith("@font-face"):
                continue
            else:
                out.append(f"{indent}{prelude} {{{payload}}}")
        else:
            if filt is not None and not filt.search(prelude):
                continue
            sels = [scope_selector(x) for x in prelude.split(",")]
            body = fix_urls(payload)
            for name in keyframes:
                body = re.sub(rf"(animation(?:-name)?\s*:[^;]*?)\b{re.escape(name)}\b", rf"\1{name}--classic", body)
            out.append(f"{indent}{(',' + chr(10) + indent).join(sels)} {{{body}}}")


def main():
    out = [
        "/* claude:2026-10-19T11:10:00+02:00 — GENERIERT von apps/client/ui-audit/gen-classic-chrome.py, nicht von Hand",
        "   ändern. Classic-Chrome = Seitenleiste, Reiterleiste und Kopfzeile aus dem Live-Stand 1.2.3 (ec86af5), gilt nur",
        "   unter :root[data-ui-style=\"classic\"] (uiStyle.ts). Skaliert wie damals: --sb-scale (Seitenleisten-Griff),",
        "   --sb-vscale (Fensterhöhe) und --tb-scale (Höhenregler der Kopfleiste). */",
    ]
    for name, filt in FILES:
        css = strip_comments(git_show(f"{STYLES}/{name}"))
        nodes = parse(css)
        keyframes = set(re.findall(r"@(?:-webkit-)?keyframes\s+([\w-]+)", css))
        out.append(f"\n/* ── 1.2.3: {name}{' (nur Kopfzeilen-Regeln)' if filt else ''} ── */")
        emit(nodes, keyframes if filt is None else set(), filt, out)
    OUT.write_text("\n".join(out) + "\n", encoding="utf-8")
    print("geschrieben:", OUT, sum(1 for l in out if l.rstrip().endswith("}")), "Blöcke")


if __name__ == "__main__":
    main()
