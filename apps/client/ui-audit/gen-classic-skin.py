# claude:2026-10-19T10:30:00+02:00
"""Erzeugt apps/client/src/renderer/styles/classic-skin.css.

Classic-Haut (Look der Live-Version 1.2.3, Commit ec86af5): fuer jede aktuelle CSS-Regel, die eine beim
Painterly-Umbau ersetzte oder neue Grafik benutzt (oder deren Rahmen-Wiederholung sich geaendert hat),
entsteht eine Override-Regel unter :root[data-ui-style="classic"], die NUR background*/border-image*
(und Custom Properties mit solchen URLs) auf den 1.2.3-Stand setzt.

Aufruf (aus dem Repo-Wurzelverzeichnis):  python -I -X utf8 apps/client/ui-audit/gen-classic-skin.py
Idempotent und deterministisch; Ausgabe wird nur geschrieben, wenn sie sich aendert.
"""
import os
import re
import subprocess
import sys
from pathlib import Path

BS = chr(92)
OLD_REV = 'ec86af5'
ROOT = Path(__file__).resolve().parents[3]
RENDERER = ROOT / 'apps' / 'client' / 'src' / 'renderer'
STYLES = RENDERER / 'styles'
ASSETS = RENDERER / 'assets'
CLASSIC_DIR = ASSETS / 'classic'
OUT = STYLES / 'classic-skin.css'
REL_STYLES = 'apps/client/src/renderer/styles/'
PREFIX = ':root[data-ui-style="classic"]'

# ersetzte Dateien: alle unter assets/classic/ (1.2.3-Fassung am gleichen Pfad)
REPLACED = set()
for p in CLASSIC_DIR.rglob('*'):
    if p.is_file():
        REPLACED.add(p.relative_to(CLASSIC_DIR).as_posix())

# neue Painterly-only-Dateien -> 1.2.3-Gegenstueck (Asset-Pfad relativ zu assets/, ggf. aus classic/)
NEW_ONLY = {
    'bg_tileable_stone_dark.webp': 'bg_tileable_stone.webp',
    'ui/gravewood/textures/texture-nav-wood2.webp': 'classic/ui/gravewood/v3/textures/texture-basalt.webp',
    'ui/gravewood/textures/texture-wood-nav.webp': 'classic/ui/gravewood/textures/texture-leather.webp',
    'ui/gravewood/textures/texture-moss-nav.webp': 'classic/ui/gravewood/v3/textures/texture-basalt.webp',
    'ui/gravewood/frames/wood-frame-strip.webp': 'classic/ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp',
}
# Kachelfaktor (Painterly / 1.2.3) fuer explizite px-Groessen
SIZE_FACTOR_DEFAULT = 2.5
SIZE_FACTOR = {
    'bg_black.webp': 5.0,
    'bg_tileable_stone_dark.webp': 512.0 / 450.0,
}
# Sonderfall wood-frame-strip: Slice 47 -> 28 (Slice des 1.2.3-Holzatlas)
# claude:2026-10-25T14:47:00+01:00 - Regeln, deren Rahmenbreite (border-Breite + border-image-width) seit 1.2.3 bewusst verkleinert wurde:
# Classic nimmt hier Bild und Slice aus 1.2.3, die Breite hinter dem "/" aber aus dem aktuellen Stand, sonst zeichnet
# der alte 34-px-Rahmen in den neuen 8-px-Rand hinein (Chef 25.10.: Item-Karten-Knöpfe "viel zu fett").
KEEP_CURRENT_BI_WIDTH = {'#root .item-tooltip.itip-panel .it-action-btn'}
STRIP = 'ui/gravewood/frames/wood-frame-strip.webp'

# ───────────────────────────── CSS-Parser (tolerant, nur was wir brauchen) ─────────────────────────────


def strip_comments(s):
    out = []
    i = 0
    n = len(s)
    q = None
    while i < n:
        c = s[i]
        if q:
            out.append(c)
            if c == BS:
                out.append(s[i + 1:i + 2])
                i += 2
                continue
            if c == q:
                q = None
            i += 1
            continue
        if c in '"\'':
            q = c
            out.append(c)
            i += 1
            continue
        if c == '/' and s[i + 1:i + 2] == '*':
            j = s.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def split_top(s, sep):
    parts = []
    d = 0
    q = None
    cur = []
    i = 0
    while i < len(s):
        c = s[i]
        if q:
            cur.append(c)
            if c == BS:
                cur.append(s[i + 1:i + 2])
                i += 2
                continue
            if c == q:
                q = None
        elif c in '"\'':
            q = c
            cur.append(c)
        elif c in '([':
            d += 1
            cur.append(c)
        elif c in ')]':
            d -= 1
            cur.append(c)
        elif c == sep and d == 0:
            parts.append(''.join(cur))
            cur = []
        else:
            cur.append(c)
        i += 1
    parts.append(''.join(cur))
    return parts


def parse_decls(body):
    res = []
    for p in split_top(body, ';'):
        p = p.strip()
        if not p or ':' not in p:
            continue
        k, v = p.split(':', 1)
        k = k.strip()
        v = v.strip()
        imp = False
        m = re.search(r'\s*!\s*important\s*$', v, re.I)
        if m:
            imp = True
            v = v[:m.start()].strip()
        if not k.startswith('--'):
            k = k.lower()
        res.append((k, re.sub(r'\s+', ' ', v), imp))
    return res


def skip_block(s, j):
    n = len(s)
    d = 1
    k = j + 1
    q = None
    while k < n and d > 0:
        c = s[k]
        if q:
            if c == BS:
                k += 2
                continue
            if c == q:
                q = None
        elif c in '"\'':
            q = c
        elif c == '{':
            d += 1
        elif c == '}':
            d -= 1
        k += 1
    return k


def parse(css):
    """-> Liste (ctx-Tupel, selector, decls)"""
    s = strip_comments(css)
    out = []
    n = len(s)

    def block(i, ctx):
        while i < n:
            while i < n and s[i].isspace():
                i += 1
            if i >= n:
                return i
            if s[i] == '}':
                return i + 1
            j = i
            d = 0
            q = None
            while j < n:
                c = s[j]
                if q:
                    if c == BS:
                        j += 2
                        continue
                    if c == q:
                        q = None
                elif c in '"\'':
                    q = c
                elif c in '([':
                    d += 1
                elif c in ')]':
                    d -= 1
                elif d == 0 and c in '{;}':
                    break
                j += 1
            prelude = s[i:j].strip()
            if j >= n:
                return n
            if s[j] == ';':
                i = j + 1
                continue
            if s[j] == '}':
                return j
            if prelude.startswith('@'):
                name = prelude.split()[0].lower()
                if name in ('@media', '@container', '@supports', '@layer', '@scope'):
                    i = block(j + 1, ctx + (re.sub(r'\s+', ' ', prelude),))
                else:
                    i = skip_block(s, j)  # @keyframes, @font-face ... bleiben unberuehrt
            else:
                k = skip_block(s, j)
                out.append((ctx, re.sub(r'\s+', ' ', prelude), parse_decls(s[j + 1:k - 1])))
                i = k
        return i

    block(0, ())
    return out


# ───────────────────────────── Hilfen ─────────────────────────────

URL_RE = re.compile(r'url\(\s*(["\']?)(.*?)\1\s*\)')


def asset_of(url_text):
    u = url_text.strip()
    if u.startswith('../assets/'):
        return u[len('../assets/'):]
    return None


def is_family(prop):
    return prop.startswith('background') or prop.startswith('border-image')


def family_of(prop):
    return 'bg' if prop.startswith('background') else 'bi'


URL_VARS = {}  # Custom Property -> Asset (Datei), die ueber var(--x) auf eine ersetzte/neue Grafik zeigt
VAR_RE = re.compile(r'var\(\s*(--[\w-]+)')


def affected_assets(value):
    """Ersetzte/neue Grafiken, die ein Wert direkt (url) oder ueber var(--x) benutzt."""
    res = []
    for m in URL_RE.finditer(value):
        a = asset_of(m.group(2))
        if a and (a in REPLACED or a in NEW_ONLY):
            res.append(a)
    for m in VAR_RE.finditer(value):
        if m.group(1) in URL_VARS:
            res.append(URL_VARS[m.group(1)])
    return res


def collect_url_vars(cur):
    """Custom Properties, deren Wert (auch ueber andere Vars) eine betroffene Grafik enthaelt."""
    changed = True
    while changed:
        changed = False
        for rules in cur.values():
            for _ctx, _sel, decls in rules:
                for k, v, _i in decls:
                    if k.startswith('--') and k not in URL_VARS:
                        a = affected_assets(v)
                        if a:
                            URL_VARS[k] = a[0]
                            changed = True


def classic_url(asset):
    """Asset-Pfad -> ../assets/classic/... bzw. Gegenstueck"""
    if asset in REPLACED:
        return '../assets/classic/' + asset
    return '../assets/' + NEW_ONLY[asset]


def rewrite_old_urls(value):
    """URLs einer 1.2.3-Deklaration auf ersetzte Dateien -> classic-Kopie (Anfuehrungszeichen immer)."""
    def sub(m):
        a = asset_of(m.group(2))
        if a and a in REPLACED:
            return 'url("../assets/classic/' + a + '")'
        if m.group(1) == '':
            return 'url("' + m.group(2).strip() + '")'
        return m.group(0)
    return URL_RE.sub(sub, value)


def scale_px(text, factor):
    def sub(m):
        v = float(m.group(1)) / factor
        v = round(v, 2)
        s = ('%g' % v)
        return s + 'px'
    return re.sub(r'(?<![\w.-])(\d+(?:\.\d+)?)px', sub, text)


def layer_factor(layer):
    """Faktor fuer eine Hintergrund-Ebene (aus der erkannten Datei, auch ueber var) oder None."""
    for a in affected_assets(layer):
        return SIZE_FACTOR.get(a, SIZE_FACTOR_DEFAULT)
    return None


def transform_bg(decls):
    """Painterly-Hintergrund-Deklarationen -> Classic: URLs tauschen, Kachelgroessen zurueckrechnen."""
    # Ebenen-Faktoren aus dem letzten Bild-Deklarations (background / background-image)
    img_factors = None
    for k, v, imp in decls:
        if k in ('background', 'background-image'):
            img_factors = [layer_factor(l) for l in split_top(v, ',')]
    res = []
    for k, v, imp in decls:
        if k == 'background':
            layers = split_top(v, ',')
            new_layers = []
            for l in layers:
                f = layer_factor(l)
                l2 = l
                if f:
                    # nur die Groessenangabe hinter dem '/' skalieren
                    m = re.search(r'/\s*((?:auto|[\d.]+px|[\d.]+%)(?:\s+(?:auto|[\d.]+px|[\d.]+%))?)', l)
                    if m:
                        l2 = l[:m.start(1)] + scale_px(m.group(1), f) + l[m.end(1):]
                new_layers.append(l2)
            v = ','.join(new_layers)
        elif k == 'background-size' and img_factors:
            sizes = split_top(v, ',')
            new = []
            for i, sz in enumerate(sizes):
                f = img_factors[i % len(img_factors)] if img_factors else None
                new.append(scale_px(sz, f) if f else sz)
            v = ','.join(new)
        v = swap_urls_new(v)
        res.append((k, v.strip(), imp))
    return res


def swap_urls_new(value):
    def sub(m):
        a = asset_of(m.group(2))
        if a and (a in REPLACED or a in NEW_ONLY):
            return 'url("' + classic_url(a) + '")'
        return m.group(0)
    return URL_RE.sub(sub, value)


IRON = 'ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp'
IRON_SLICE = '85'  # Slice des 1.2.3-Eisenatlas (512 px); der Painterly-Atlas (1152 px) ist anders geschnitten


def transform_bi(decls):
    iron = any(IRON in affected_assets(v) for _k, v, _i in decls)
    res = []
    for k, v, imp in decls:
        strip = STRIP in affected_assets(v)
        v2 = swap_urls_new(v)
        if k in ('border-image', 'border-image-repeat'):
            v2 = re.sub(r'(?<![\w-])round(?![\w-])', 'stretch', v2)
        if strip and k == 'border-image':
            v2 = re.sub(r'\)\s*47(?![\w.])', ') 28', v2)
        if strip and k == 'border-image-slice':
            v2 = re.sub(r'^47$', '28', v2.strip())
        if iron and k == 'border-image':
            v2 = re.sub(r'(nav-bronze-lipped-iron-9slice\.webp"\)\s*)\d+(?:\s+\d+){0,3}', lambda m: m.group(1) + IRON_SLICE, v2)
        if iron and k == 'border-image-slice':
            v2 = re.sub(r'^\d+(?:\s+\d+){0,3}', IRON_SLICE, v2.strip())
        res.append((k, v2.strip(), imp))
    return res


def bi_has_round(decls):
    return any(k in ('border-image', 'border-image-repeat') and re.search(r'(?<![\w-])round(?![\w-])', v)
               for k, v, imp in decls)


def effective(decls):
    """Mehrfach gesetzte gleiche Eigenschaften: nur die letzte behalten (Position der letzten)."""
    last = {}
    for i, (k, v, imp) in enumerate(decls):
        last[k] = i
    return [d for i, d in enumerate(decls) if last[d[0]] == i]


def split_selector(sel):
    return [p.strip() for p in split_top(sel, ',') if p.strip()]


def prefix_selector(sel):
    out = []
    for p in split_selector(sel):
        if '.layout--reforged' in p:
            continue
        if p.startswith(':root'):
            out.append(PREFIX + p[len(':root'):])
        elif re.match(r'^html(?![\w-])', p):
            out.append(PREFIX + p[len('html'):])
        else:
            out.append(PREFIX + ' ' + p)
    return out


# ───────────────────────────── Einlesen ─────────────────────────────


def import_order():
    idx = (STYLES / 'index.css').read_text(encoding='utf8')
    order = []
    for m in re.finditer(r'@import\s+"\./([\w.-]+\.css)"', idx):
        order.append(m.group(1))
    rest = sorted(p.name for p in STYLES.glob('*.css'))
    for f in rest:
        if f not in order and f != 'index.css':
            order.append(f)
    return [f for f in order if not f.startswith('classic-') and f != 'index.css' and (STYLES / f).exists()]


def git_old(fname):
    r = subprocess.run(['git', 'show', OLD_REV + ':' + REL_STYLES + fname], cwd=str(ROOT), capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout.decode('utf8')


TRANSFORMED = []


def main():
    order = import_order()
    cur = {}
    old = {}
    for f in order:
        cur[f] = parse((STYLES / f).read_text(encoding='utf8'))
        txt = git_old(f)
        if txt is not None:
            old[f] = parse(txt)
    collect_url_vars(cur)
    old_by_key = {}
    for f, rules in old.items():
        for ctx, sel, d in rules:
            old_by_key.setdefault((ctx, sel), []).append((f, d))

    old_by_part = {}
    for f, rules in old.items():
        for ctx, sel, d in rules:
            parts = split_selector(sel)
            if len(parts) > 1:
                for part in parts:
                    old_by_part.setdefault((ctx, part), []).append((f, d))

    def old_decls(f, ctx, sel, by_part=False):
        occ = old_by_key.get((ctx, sel))
        if not occ and by_part:
            occ = old_by_part.get((ctx, sel))
        if not occ:
            return None
        same = [d for (of, d) in occ if of == f]
        use = same if same else [d for (_of, d) in occ]
        flat = []
        for d in use:
            flat.extend(d)
        return effective(flat)

    emitted = []  # (ctx, [prefixed selectors], decls)
    stats = {'matched': 0, 'transformed': 0, 'skipped_reforged': 0, 'vars': 0}

    def units():
        for f in order:
            for ctx, sel, decls in cur[f]:
                parts = split_selector(sel)
                if len(parts) > 1 and (ctx, sel) not in old_by_key:
                    # Selektorliste gab es 1.2.3 so nicht: jeden Teil einzeln gegen 1.2.3 abgleichen
                    for part in parts:
                        yield f, ctx, part, decls, True
                else:
                    yield f, ctx, sel, decls, False

    for f, ctx, sel, decls, by_part in units():
        if True:
            sels = prefix_selector(sel)
            if not sels:
                if any(is_family(k) or k.startswith('--') for k, _v, _i in decls) and any(affected_assets(v) for _k, v, _i in decls):
                    stats['skipped_reforged'] += 1
                continue
            od = old_decls(f, ctx, sel, by_part)
            out_decls = []
            # Familien
            for fam in ('bg', 'bi'):
                cd = [(k, v, i) for k, v, i in decls if is_family(k) and family_of(k) == fam]
                if not cd:
                    continue
                uses = any(affected_assets(v) for _k, v, _i in cd)
                if fam == 'bi':
                    uses = uses or bi_has_round(cd)
                if not uses:
                    continue
                important = any(i for _k, _v, i in cd)
                o_fam = [(k, v, i) for k, v, i in od if is_family(k) and family_of(k) == fam] if od else []
                if o_fam:
                    stats['matched'] += 1
                    res = [(k, rewrite_old_urls(v), i or important) for k, v, i in o_fam]
                    if fam == 'bi' and sel in KEEP_CURRENT_BI_WIDTH:
                        # claude:2026-10-25T14:47:00+01:00 - nur der Breitenteil des Kurzschreibers kommt aus dem aktuellen Stand
                        def bi_split(v):
                            # Breite steht hinter dem "/" NACH der url(...)-Klammer (der Pfad selbst enthaelt "/")
                            m = re.search(r'url\([^)]*\)', v)
                            j = m.end() if m else 0
                            head, tail = v[:j], v[j:]
                            return (head + tail.split('/', 1)[0].rstrip(), tail.split('/', 1)[1].strip()) if '/' in tail else (v, None)
                        cur_bi = [v for k, v, _i in cd if k == 'border-image']
                        cur_w = bi_split(cur_bi[-1])[1] if cur_bi else None
                        if cur_w:
                            res = [(k, bi_split(v)[0] + ' / ' + cur_w if k == 'border-image' and bi_split(v)[1] else v, i)
                                   for k, v, i in res]
                    has_short = any(k in ('background', 'border-image') for k, _v, _i in o_fam)
                    old_props = {k for k, _v, _i in o_fam}
                    if not has_short:
                        seen = set()
                        for k, _v, i in cd:
                            if k not in old_props and k not in seen and k not in ('background', 'border-image'):
                                seen.add(k)
                                res.append((k, 'initial', important))
                else:
                    stats['transformed'] += 1
                    TRANSFORMED.append(f + ' :: ' + ' '.join(ctx) + ' ' + sel + ' [' + fam + ']')
                    t = transform_bg(cd) if fam == 'bg' else transform_bi(cd)
                    res = [(k, v, i or important) for k, v, i in t]
                out_decls.extend(res)
            # Custom Properties mit betroffenen URLs
            for k, v, i in decls:
                if k.startswith('--') and affected_assets(v):
                    ov = None
                    if od:
                        for k2, v2, i2 in od:
                            if k2 == k:
                                ov = v2
                    if ov is not None:
                        out_decls.append((k, rewrite_old_urls(ov), i))
                        stats['matched'] += 1
                    else:
                        t = transform_bg([('background', v, i)])[0]
                        out_decls.append((k, t[1], i))
                        stats['transformed'] += 1
                        TRANSFORMED.append(f + ' :: ' + sel + ' [' + k + ']')
                    stats['vars'] += 1
            if out_decls:
                emitted.append((ctx, sels, out_decls))

    # ───── Ausgabe ─────
    lines = []
    lines.append('/* claude:2026-10-19T10:30:00+02:00 - Classic-Haut (Look von 1.2.3). GENERIERT von ui-audit/gen-classic-skin.py,')
    lines.append('   NICHT von Hand aendern. Nur Hintergrund-/Rahmen-Deklarationen (background*, border-image*), alle Regeln unter')
    lines.append('   :root[data-ui-style="classic"]; Quelle der Werte: git show ' + OLD_REV + ':styles/<datei>, Bilder aus assets/classic/. */')
    prev_ctx = ()
    n_rules = 0
    last_text = None
    for ctx, sels, decls in emitted:
        # Kontext wechseln
        if ctx != prev_ctx:
            for _ in prev_ctx:
                lines.append('}')
            for c in ctx:
                lines.append(c + ' {')
            prev_ctx = ctx
        ind = '  ' * len(ctx)
        txt = ind + ',\n'.join(sels).replace('\n', '\n' + ind) + ' {'
        rule = [txt]
        for k, v, i in decls:
            rule.append(ind + '  ' + k + ': ' + v + (' !important' if i else '') + ';')
        rule.append(ind + '}')
        rt = '\n'.join(rule)
        if rt == last_text:
            continue
        last_text = rt
        lines.append(rt)
        n_rules += 1
    for _ in prev_ctx:
        lines.append('}')
    text = '\n'.join(lines) + '\n'
    if not OUT.exists() or OUT.read_text(encoding='utf8') != text:
        OUT.write_text(text, encoding='utf8', newline='\n')
    print('Override-Regeln:', n_rules, '| Familien aus 1.2.3-Selektor:', stats['matched'],
          '| transformiert:', stats['transformed'], '| Reforged-Chrome uebersprungen:', stats['skipped_reforged'])
    if '-v' in sys.argv:
        for t in TRANSFORMED:
            print(t)


if __name__ == '__main__':
    main()
