from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


# codex:2026-08-28T20:49:06+02:00
ROOT = Path(r"G:\GameDev")
ASSET_ROOT = ROOT / "CODEX" / "assets" / "schneidern-2026-08-28"
RAW = ASSET_ROOT / "raw"
FINAL = ASSET_ROOT / "fertig"
QA = ASSET_ROOT / "qa"


def alpha_bbox(image: Image.Image, threshold: int = 2) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("Image contains no visible pixels")
    return bbox


def place_rgba(source: Path, target: Path, size: int, fill_ratio: float) -> None:
    image = Image.open(source).convert("RGBA")
    # codex:2026-08-28T20:52:00+02:00
    # ImageGen's native alpha tops out just below 255 on otherwise solid object
    # interiors. Normalize that near-opaque plateau while preserving soft edge
    # coverage; this is alpha cleanup only, never RGB/color keying.
    alpha = image.getchannel("A").point(
        lambda value: 0 if value <= 2 else (255 if value >= 250 else round((value - 2) * 255 / 248))
    )
    image.putalpha(alpha)
    bbox = alpha_bbox(image)
    subject = image.crop(bbox)
    max_extent = round(size * fill_ratio)
    scale = min(max_extent / subject.width, max_extent / subject.height)
    resized = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas.alpha_composite(resized, offset)
    pixels = canvas.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)
    canvas.save(target, optimize=True)


def opaque_fit(source: Path, target: Path, size: tuple[int, int]) -> None:
    image = Image.open(source).convert("RGB")
    fitted = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    fitted.save(target, optimize=True)


def steam_pair(source: Path, color_target: Path, gray_target: Path) -> None:
    image = ImageOps.fit(Image.open(source).convert("RGB"), (256, 256), method=Image.Resampling.LANCZOS)
    image.save(color_target, quality=95, subsampling=0, optimize=True)
    ImageOps.grayscale(image).convert("RGB").save(gray_target, quality=95, subsampling=0, optimize=True)


def checker_tile(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGBA")
    background = Image.new("RGBA", size, (24, 22, 20, 255))
    draw = ImageDraw.Draw(background)
    cell = 24
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(48, 44, 39, 255))
    fitted = ImageOps.contain(image, (size[0] - 24, size[1] - 54), Image.Resampling.LANCZOS)
    background.alpha_composite(fitted, ((size[0] - fitted.width) // 2, 12))
    return background.convert("RGB")


def scene_tile(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS)


def contact_sheet(paths: list[tuple[str, Path]], target: Path, tile_size: tuple[int, int], alpha: bool) -> None:
    width = tile_size[0] * len(paths)
    sheet = Image.new("RGB", (width, tile_size[1]), (18, 16, 15))
    draw = ImageDraw.Draw(sheet)
    for index, (label, path) in enumerate(paths):
        image = Image.open(path)
        tile = checker_tile(image, tile_size) if alpha else scene_tile(image, tile_size)
        x = index * tile_size[0]
        sheet.paste(tile, (x, 0))
        draw.rectangle((x, tile_size[1] - 34, x + tile_size[0], tile_size[1]), fill=(10, 9, 8))
        draw.text((x + 10, tile_size[1] - 25), label, fill=(226, 210, 174))
    sheet.save(target, quality=94, optimize=True)


def metrics(path: Path) -> dict[str, object]:
    image = Image.open(path)
    result: dict[str, object] = {
        "file": path.name,
        "size": list(image.size),
        "mode": image.mode,
    }
    if "A" in image.getbands():
        alpha = image.getchannel("A")
        extrema = alpha.getextrema()
        edges = Image.new("L", image.size, 0)
        edge_draw = ImageDraw.Draw(edges)
        edge_draw.rectangle((0, 0, image.width - 1, image.height - 1), outline=255, width=1)
        edge_values = [value for value, marker in zip(alpha.getdata(), edges.getdata()) if marker]
        result.update(
            {
                "alpha_extrema": list(extrema),
                "transparent_pixels": sum(value == 0 for value in alpha.getdata()),
                "partial_alpha_pixels": sum(0 < value < 255 for value in alpha.getdata()),
                "outer_edge_max_alpha": max(edge_values),
                "visible_bbox": list(alpha_bbox(image)),
            }
        )
    return result


def main() -> None:
    FINAL.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)

    place_rgba(RAW / "sidebaricon_tailoring.png", FINAL / "sidebaricon_tailoring.png", 1254, 0.84)
    place_rgba(RAW / "ring_master_tailoring.png", FINAL / "ring_master_tailoring.png", 640, 0.86)
    opaque_fit(RAW / "tailoring.png", FINAL / "tailoring.png", (2172, 724))
    opaque_fit(RAW / "tailoring.png", FINAL / "tailoring.card.png", (880, 293))
    steam_pair(
        RAW / "MASTER_TAILORING.png",
        FINAL / "MASTER_TAILORING.jpg",
        FINAL / "MASTER_TAILORING_gray.jpg",
    )

    contact_sheet(
        [
            ("Bestand: Leatherworking", ROOT / "apps/client/src/renderer/assets/sidebar/sidebaricon_leatherworking.webp"),
            ("Bestand: Hunting", ROOT / "CODEX/assets/fasern-jagen-2026-08-27/fertig/sidebaricon_hunting.png"),
            ("Neu: Tailoring", FINAL / "sidebaricon_tailoring.png"),
        ],
        QA / "contact-sidebar.jpg",
        (420, 420),
        True,
    )
    contact_sheet(
        [
            ("Bestand: Leatherworking", ROOT / "apps/client/src/renderer/assets/items/ring_master_leatherworking.webp"),
            ("Bestand: Fishing", ROOT / "apps/client/src/renderer/assets/items/ring_master_fishing.webp"),
            ("Neu: Tailoring", FINAL / "ring_master_tailoring.png"),
        ],
        QA / "contact-ring.jpg",
        (420, 420),
        True,
    )
    contact_sheet(
        [
            ("Bestand: Leatherworking", ROOT / "apps/client/src/renderer/assets/skill-backgrounds/leatherworking.webp"),
            ("Bestand: Smithing", ROOT / "apps/client/src/renderer/assets/skill-backgrounds/smithing.webp"),
            ("Neu: Tailoring", FINAL / "tailoring.png"),
        ],
        QA / "contact-background.jpg",
        (600, 220),
        False,
    )
    contact_sheet(
        [
            ("Bestand: Leatherworking Card", ROOT / "apps/client/src/renderer/assets/skill-backgrounds/leatherworking.card.webp"),
            ("Neu: Tailoring Card", FINAL / "tailoring.card.png"),
        ],
        QA / "contact-card.jpg",
        (660, 230),
        False,
    )
    contact_sheet(
        [
            ("Bestand: Master Leatherworking", ROOT / "CODEX/assets/steam-achievement-icons-2026-08-27/fertig/MASTER_LEATHERWORKING.jpg"),
            ("Neu: Master Tailoring", FINAL / "MASTER_TAILORING.jpg"),
            ("Neu: Master Tailoring Gray", FINAL / "MASTER_TAILORING_gray.jpg"),
        ],
        QA / "contact-steam.jpg",
        (320, 320),
        False,
    )

    report = [metrics(path) for path in sorted(FINAL.iterdir()) if path.is_file()]
    (QA / "qa-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
