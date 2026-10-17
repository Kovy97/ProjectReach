# codex:2026-08-28T01:18:00+02:00
"""Normalize the accepted native ImageGen outputs and build the handoff QA package."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(r"G:\GameDev\CODEX\assets\fasern-jagen-2026-08-27")
RAW = ROOT / "raw"
FINAL = ROOT / "fertig"
QA = ROOT / "qa"

SOURCES = {
    "fiber_nettle": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-14fb67a7-45ee-4711-b9ac-6b256cec1e6f.png",
    "fiber_flax": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-e14c89c9-f239-441c-af67-55757e20ab1b.png",
    "fiber_thornhemp": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-e3d41998-4dcd-4ead-ab6b-09c7a20881d8.png",
    "fiber_ghostsilk": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-5a3f0f1f-3740-405d-9a41-b716b5e11055.png",
    "fiber_starflax": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-35d8ef6d-f5fd-44ff-8670-673f247054d1.png",
    "nettle_seed": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-9bc76bae-bc2e-4f46-869c-ece2d832be46.png",
    "flax_seed": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-81ae1884-43da-476f-b8bd-4e6cfd9e3a1a.png",
    "thornhemp_seed": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-aa353357-030f-4717-8484-c3eed8337f27.png",
    "ghostsilk_seed": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-25657ff9-470d-471b-b6b7-1ae9a6f29f46.png",
    "starflax_seed": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-53773908-babd-47ad-85da-8c843c3969cb.png",
    "cloth_nettle": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-782c2a03-f005-4bb6-b155-31b5c4f05984.png",
    "cloth_linen": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-ca01053c-0ac0-416f-9ff2-11aa5331bf47.png",
    "cloth_thornlinen": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-cd232557-ac73-4723-b506-c93a40a84241.png",
    "cloth_ghostweave": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-db097096-6fd9-44f6-889e-337e0085972c.png",
    "cloth_starweave": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-73b9953d-e06b-4bd9-b67d-37d73ae825bf.png",
    "bait_worm": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-8257cdb7-75bb-4bc2-b0f1-c2b0edd5ad4d.png",
    "trap_empty": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-d0f533fe-03bb-4bca-aef2-7fb594e2f406.png",
    "trap_set": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-d0f533fe-03bb-4bca-aef2-7fb594e2f406.png",
    "trap_caught": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-d0f533fe-03bb-4bca-aef2-7fb594e2f406.png",
    "forage_nettle": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-53ca73fa-ff52-41c2-874f-bfd8e02f9caf.png",
    "forage_flax": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-f72265aa-4134-4eea-8bdb-a4632752f925.png",
    "forage_thornhemp": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-be7161ae-2652-49ab-8e8f-6fbca19c83ea.png",
    "forage_ghostsilk": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-1aeaefed-80b0-4d55-9ab6-0fc96897884e.png",
    "forage_starflax": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-3699c63c-5f2d-4885-ab1c-153738da27d5.png",
    "sidebaricon_hunting": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-97019858-a10f-4d0f-9543-84c785ace644.png",
    "ring_master_hunting": r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b\exec-81f228cf-17b4-4862-97be-3378988f3591.png",
}

ITEM_IDS = list(SOURCES)[:19]
CARD_IDS = list(SOURCES)[19:24]
TRAP_IDS = ["trap_empty", "trap_set", "trap_caught"]


def alpha_fit(source: Path, size: tuple[int, int], coverage: float) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox or alpha.getextrema()[0] != 0:
        raise ValueError(f"Native alpha missing in {source}")
    cropped = image.crop(bbox)
    limit = (int(size[0] * coverage), int(size[1] * coverage))
    cropped.thumbnail(limit, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - cropped.width) // 2
    y = (size[1] - cropped.height) // 2
    canvas.alpha_composite(cropped, (x, y))
    return canvas


def trap_cell_fit(source: Path, index: int) -> Image.Image:
    """Take one native-alpha cell from the shared three-state trap strip."""
    strip = Image.open(source).convert("RGBA")
    cell_width = strip.width // 3
    left = index * cell_width
    right = strip.width if index == 2 else left + cell_width
    cell = strip.crop((left, 0, right, strip.height))
    alpha = cell.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox or alpha.getextrema()[0] != 0:
        raise ValueError(f"Native alpha missing in trap cell {index}")
    cropped = cell.crop(bbox)
    cropped.thumbnail((550, 550), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (640, 640), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, ((640 - cropped.width) // 2, (640 - cropped.height) // 2))
    return canvas


def opaque_fit(source: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGB")
    target_ratio = size[0] / size[1]
    ratio = image.width / image.height
    if ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    elif ratio < target_ratio:
        height = round(image.width / target_ratio)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    return image.resize(size, Image.Resampling.LANCZOS)


def alpha_metrics(image: Image.Image) -> dict[str, object]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    assert bbox is not None
    edge = list(alpha.crop((0, 0, image.width, 1)).getdata())
    edge += list(alpha.crop((0, image.height - 1, image.width, image.height)).getdata())
    edge += list(alpha.crop((0, 0, 1, image.height)).getdata())
    edge += list(alpha.crop((image.width - 1, 0, image.width, image.height)).getdata())
    histogram = alpha.histogram()
    return {
        "alpha_extrema": list(alpha.getextrema()),
        "edge_alpha_max": max(edge),
        "partial_alpha_pixels": sum(histogram[1:255]),
        "visible_bbox": list(bbox),
        "visible_width_percent": round((bbox[2] - bbox[0]) * 100 / image.width, 2),
        "visible_height_percent": round((bbox[3] - bbox[1]) * 100 / image.height, 2),
    }


def contact_sheet(ids: list[str], destination: Path, background: tuple[int, int, int], columns: int = 5) -> None:
    cell, label = 260, 30
    rows = (len(ids) + columns - 1) // columns
    canvas = Image.new("RGB", (columns * cell, rows * (cell + label)), background)
    draw = ImageDraw.Draw(canvas)
    for index, asset_id in enumerate(ids):
        image = Image.open(FINAL / f"{asset_id}.png").convert("RGBA")
        image.thumbnail((cell - 26, cell - 26), Image.Resampling.LANCZOS)
        column, row = index % columns, index // columns
        x = column * cell + (cell - image.width) // 2
        y = row * (cell + label) + (cell - image.height) // 2
        canvas.paste(image, (x, y), image)
        draw.text((column * cell + 7, row * (cell + label) + cell + 5), asset_id, fill=(235, 216, 174))
    canvas.save(destination)


def card_contact() -> None:
    width, height, label = 560, 315, 28
    canvas = Image.new("RGB", (width * 2, (height + label) * 3), (20, 18, 17))
    draw = ImageDraw.Draw(canvas)
    ids = CARD_IDS
    for index, asset_id in enumerate(ids):
        image = Image.open(FINAL / f"{asset_id}.png").convert("RGB")
        image.thumbnail((width - 12, height - 12), Image.Resampling.LANCZOS)
        column, row = index % 2, index // 2
        x = column * width + (width - image.width) // 2
        y = row * (height + label) + (height - image.height) // 2
        canvas.paste(image, (x, y))
        draw.text((column * width + 7, row * (height + label) + height + 4), asset_id, fill=(235, 216, 174))
    canvas.save(QA / "contact-cards.png")


def main() -> None:
    for directory in (RAW, FINAL, QA):
        directory.mkdir(parents=True, exist_ok=True)

    for obsolete in ("trap_empty.png", "trap_set.png", "trap_caught.png"):
        path = RAW / obsolete
        if path.exists():
            path.unlink()
    trap_strip = Path(SOURCES["trap_empty"])
    shutil.copy2(trap_strip, RAW / "trap_states_strip.png")

    report: dict[str, object] = {"asset_count": len(SOURCES), "assets": {}}
    for asset_id, source_text in SOURCES.items():
        source = Path(source_text)
        if asset_id not in TRAP_IDS:
            shutil.copy2(source, RAW / f"{asset_id}.png")
        if asset_id in TRAP_IDS:
            final = trap_cell_fit(source, TRAP_IDS.index(asset_id))
        elif asset_id == "bait_worm":
            final = alpha_fit(source, (640, 640), 0.76)
        elif asset_id in ITEM_IDS:
            final = alpha_fit(source, (640, 640), 0.86)
        elif asset_id in CARD_IDS:
            final = opaque_fit(source, (1672, 941))
        elif asset_id == "ring_master_hunting":
            final = alpha_fit(source, (640, 640), 0.86)
        else:
            final = alpha_fit(source, (1254, 1254), 0.84)
        destination = FINAL / f"{asset_id}.png"
        final.save(destination, optimize=True)
        entry: dict[str, object] = {
            "filename": destination.name,
            "mode": final.mode,
            "size": list(final.size),
            "source": f"{source}#cell={TRAP_IDS.index(asset_id)}" if asset_id in TRAP_IDS else str(source),
        }
        if final.mode == "RGBA":
            entry.update(alpha_metrics(final))
        else:
            entry["opaque"] = True
        report["assets"][asset_id] = entry

    contact_sheet(ITEM_IDS, QA / "contact-items-dark.png", (20, 18, 17))
    contact_sheet(ITEM_IDS, QA / "contact-items-magenta.png", (255, 0, 170))
    contact_sheet(["sidebaricon_hunting"], QA / "contact-sidebar-dark.png", (20, 18, 17), columns=1)
    contact_sheet(["sidebaricon_hunting"], QA / "contact-sidebar-magenta.png", (255, 0, 170), columns=1)
    card_contact()
    (QA / "qa.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    source_map = {
        asset_id: (f"{source}#cell={TRAP_IDS.index(asset_id)}" if asset_id in TRAP_IDS else source)
        for asset_id, source in SOURCES.items()
    }
    (QA / "source-map.json").write_text(json.dumps(source_map, indent=2), encoding="utf-8")
    print(f"Built {len(SOURCES)} final assets in {FINAL}")


if __name__ == "__main__":
    main()
