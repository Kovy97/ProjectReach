# claude:2026-10-26T07:50:00+02:00 — Asset-Einbau 1.4.0 „Feder und Stahl“: prüft eine Codex-Lieferung gegen die Loader-Verträge
# (Ordner, Dateiname = Content-ID, Maße, echtes Alpha bzw. deckend) und kopiert erst mit --apply. Bedarfsliste:
# tools/asset-intake-1.4.0.ids.json (aus dem Content erzeugt, 26.10.). Quelle: design/1.4.0-assets-final.md.
#
# Aufruf (aus G:\GameDev):
#   python -I -X utf8 tools/asset-intake-1.4.0.py <Lieferordner> [--select keep-teil1] [--apply] [--replace] [--report <md>]
#   python -I -X utf8 tools/asset-intake-1.4.0.py --coverage            (nur: was fehlt im Spiel noch?)
# Ohne --apply wird nichts kopiert. Bestehende Dateien werden nie überschrieben, außer mit --replace; gelöscht wird nie.
import argparse
import json
import os
import shutil
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "apps", "client", "src", "renderer", "assets")
IDS = json.load(open(os.path.join(ROOT, "tools", "asset-intake-1.4.0.ids.json"), encoding="utf-8"))

# Behalten-Liste aus design/1.4.0-assets-final.md („Behalten (Lieferung Teil 1, geprüft am 25.10.)“).
METALS9 = ["copper", "bronze", "iron", "steel", "blacksteel", "mithril", "adamantium", "runite", "bloodiron"]
METALS12 = METALS9 + ["titanium", "aetherium", "godiron"]
KEEP_TEIL1 = set(
    [f"battlescreens/gk_room_{i}{s}" for i in range(1, 5) for s in ("", ".card")]
    + ["ui/raid/raid_chest_closed", "ui/raid/raid_chest_open", "icons/icon_rarity_heroic", "icons/icon_rarity_mythic", "icons/icon_tier_crown"]
    + ["sidebar/sidebaricon_bowcraft", "skill-backgrounds/bowcraft", "skill-backgrounds/bowcraft.card", "items/ring_master_bowcraft", "items/arrow_shaft"]
    + [f"items/{m}_arrow" for m in METALS9]
    + [f"items/{m}_quiver" for m in METALS12]
    + ["icons/icon_enchant_rune", "items/relic_dust", "sidebar/sidebaricon_estates"]
    + [f"events/{e}" for e in IDS["events"] if e != "inspiration"]
)

# Loader-Verträge je Zielordner: erlaubte Maße, Kartenmaße (.card.webp), Alpha (True = freigestellt, False = deckend), gültige IDs.
RULES = {
    # 640 Standard; 1254 wie die meisten Meisterringe (ring_master_*) im Bestand.
    "items": {"sizes": [(640, 640), (1254, 1254)], "alpha": True, "ids": set(IDS["items"])},
    "monsters": {"sizes": [(1254, 1254)], "alpha": True, "ids": set(IDS["monsters"])},
    "battlescreens": {"sizes": [(1536, 1024)], "card": [(880, 587)], "alpha": False, "ids": set(IDS["raidRooms"])},
    "dungeons": {"sizes": [(1122, 1402)], "card": [(880, 1100)], "alpha": False, "ids": set(IDS["raids"])},
    "ui/raid": {"sizes": [(1254, 1254)], "alpha": True, "ids": {"raid_chest_closed", "raid_chest_open"}},
    "icons": {"sizes": [(512, 512), (128, 128)], "alpha": True, "ids": {"icon_rarity_heroic", "icon_rarity_mythic", "icon_tier_crown", "icon_enchant_rune"}},
    "sidebar": {"sizes": [(1254, 1254)], "alpha": True, "ids": {"sidebaricon_bowcraft", "sidebaricon_estates"}},
    "skill-backgrounds": {"sizes": [(2172, 724)], "card": [(880, 293)], "alpha": False, "ids": {"bowcraft"}},
    "events": {"sizes": [(1536, 1024)], "alpha": False, "ids": set(IDS["events"])},
    "portraits": {"sizes": [(1122, 1402)], "alpha": True, "ids": {f"npc_{c}" for c in IDS["orderCustomers"]}},
}


def required():
    """Alles, was 1.4.0 an Bildern braucht (Ordner/Name ohne Endung)."""
    req = [f"items/{i}" for i in IDS["missingItems"]]
    req += [f"monsters/{m}" for m in IDS["raidMonsters"]]
    req += [f"battlescreens/{r}{s}" for r in IDS["raidRooms"] for s in ("", ".card")]
    req += [f"dungeons/{r}{s}" for r in IDS["raids"] for s in ("", ".card")]
    req += ["ui/raid/raid_chest_closed", "ui/raid/raid_chest_open"]
    req += [f"icons/{i}" for i in sorted(RULES["icons"]["ids"])]
    req += [f"sidebar/{i}" for i in sorted(RULES["sidebar"]["ids"])]
    req += ["skill-backgrounds/bowcraft", "skill-backgrounds/bowcraft.card"]
    req += [f"events/{e}" for e in IDS["events"]]
    req += [f"portraits/npc_{c}" for c in IDS["orderCustomers"]]
    return req


def in_game(key):
    return any(os.path.exists(os.path.join(ASSETS, *key.split("/")) + ext) for ext in (".webp", ".png"))


def rel_key(path):
    """Lieferpfad → (Zielordner, Name ohne Endung, Endung). Erwartet …/delivery/<ordner>/… oder …/deliverables/<ordner>/…."""
    parts = path.replace("\\", "/").split("/")
    for anchor in ("delivery", "deliverables"):
        if anchor in parts:
            rest = parts[len(parts) - 1 - parts[::-1].index(anchor) + 1:]
            break
    else:
        return None
    if len(rest) < 2:
        return None
    folder = "/".join(rest[:-1])
    name, ext = os.path.splitext(rest[-1])
    return folder, name, ext.lower()


def check(path, folder, name):
    """Fehler und Warnungen für eine Datei."""
    errs, warns = [], []
    rule = RULES.get(folder)
    if not rule:
        return [f"unbekannter Zielordner '{folder}'"], warns
    is_card = name.endswith(".card")
    base = name[:-5] if is_card else name
    if base not in rule["ids"]:
        errs.append(f"'{base}' ist keine gültige ID für {folder}")
    try:
        im = Image.open(path)
        im.load()
    except Exception as e:  # noqa: BLE001
        return [f"nicht lesbar: {e}"], warns
    sizes = rule.get("card", []) if is_card else rule["sizes"]
    if is_card and not sizes:
        errs.append("Kartenbild ist für diesen Ordner nicht vorgesehen")
    elif im.size not in sizes:
        errs.append(f"Maße {im.size[0]}x{im.size[1]}, erwartet {' oder '.join(f'{w}x{h}' for w, h in sizes)}")
    if rule["alpha"]:
        if im.mode not in ("RGBA", "LA"):
            errs.append(f"kein Alphakanal (Modus {im.mode}), Freisteller brauchen echtes Alpha")
        else:
            a = im.getchannel("A")
            lo, hi = a.getextrema()
            if lo > 0:
                errs.append("keine transparenten Pixel (deckender Hintergrund?)")
            w, h = im.size
            border = [a.getpixel((x, 0)) for x in range(w)] + [a.getpixel((x, h - 1)) for x in range(w)]
            border += [a.getpixel((0, y)) for y in range(h)] + [a.getpixel((w - 1, y)) for y in range(h)]
            hot = sum(1 for v in border if v > 8)
            if hot:
                warns.append(f"{hot} Randpixel nicht transparent (angeschnitten?)")
    else:
        if im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 255:
            warns.append("deckende Szene hat transparente Pixel")
    return errs, warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?")
    ap.add_argument("--select", choices=["keep-teil1"], help="nur die Behalten-Liste aus Teil 1 übernehmen")
    ap.add_argument("--apply", action="store_true", help="geprüfte Dateien in den Spielordner kopieren")
    ap.add_argument("--replace", action="store_true", help="vorhandene Spieldateien überschreiben (sonst übersprungen)")
    ap.add_argument("--report", help="Bericht zusätzlich als Markdown schreiben")
    ap.add_argument("--coverage", action="store_true", help="nur Abdeckung im Spiel melden")
    args = ap.parse_args()

    lines = []
    out = lines.append
    delivered = {}
    if args.source and not args.coverage:
        files = []
        for dp, _dn, fn in os.walk(args.source):
            for f in fn:
                if f.lower().endswith((".webp", ".png")):
                    files.append(os.path.join(dp, f))
        ok = bad = skipped = copied = 0
        out(f"## Lieferung {args.source}\n")
        for p in sorted(files):
            rk = rel_key(p)
            if not rk:
                continue
            folder, name, ext = rk
            key = f"{folder}/{name}"
            if args.select == "keep-teil1" and key not in KEEP_TEIL1:
                skipped += 1
                continue
            errs, warns = check(p, folder, name)
            if ext != ".webp":
                warns.append("Endung nicht .webp")
            status = "FEHLER" if errs else ("WARNUNG" if warns else "ok")
            if errs:
                bad += 1
            else:
                ok += 1
                delivered[key] = p
            msg = "; ".join(errs + warns)
            if status != "ok":
                out(f"- {status} `{key}{ext}`: {msg}")
            if not errs and args.apply:
                target = os.path.join(ASSETS, *folder.split("/"), name + ext)
                if os.path.exists(target) and not args.replace:
                    out(f"- übersprungen (schon im Spiel) `{key}{ext}`")
                    continue
                os.makedirs(os.path.dirname(target), exist_ok=True)
                shutil.copy2(p, target)
                copied += 1
        out(f"\nGeprüft: {ok} ok, {bad} mit Fehler, {skipped} nicht ausgewählt. Kopiert: {copied}{'' if args.apply else ' (Probelauf, --apply fehlt)'}.\n")

    req = required()
    missing = [k for k in req if not in_game(k) and k not in delivered]
    have = [k for k in req if in_game(k)]
    pending = [k for k in req if not in_game(k) and k in delivered]
    out("## Abdeckung 1.4.0\n")
    out(f"Bedarf {len(req)} Bilder: {len(have)} im Spiel, {len(pending)} in dieser Lieferung bereit, {len(missing)} fehlen noch.\n")
    groups = {}
    for k in missing:
        groups.setdefault(k.split("/")[0] if not k.startswith("ui/") else "ui/raid", []).append(k.split("/")[-1])
    for g, names in sorted(groups.items()):
        out(f"- **{g}** ({len(names)}): {', '.join(sorted(names))}")
    text = "\n".join(lines)
    print(text)
    if args.report:
        with open(args.report, "w", encoding="utf-8") as fh:
            fh.write("# Asset-Einbau 1.4.0, Bericht\n\n" + text + "\n")


if __name__ == "__main__":
    sys.exit(main())
