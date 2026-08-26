# codex:2026-08-26T18:42:00+02:00
from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFont


GENERATED = Path(r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b")
ROOT = Path(r"G:\GameDev\CODEX\assets\mainmenu-submenus-mockups-2026-08-26")
QA = ROOT / "qa"

GROUPS = {
    "new-game": [
        ("new-game-01-ashen-gate.png", "exec-f2841736-33a3-485f-a473-403f33cc045d.png", "01 ASHEN GATE"),
        ("new-game-02-war-table.png", "exec-46d088d1-9dab-446d-a378-2dbb330f08b2.png", "02 WAR TABLE"),
        ("new-game-03-frontline-registry.png", "exec-868828e9-7098-472b-bb2e-6367443c8210.png", "03 FRONTLINE REGISTRY"),
        ("new-game-04-black-chronicle.png", "exec-ab5633ae-6ce6-49a5-9691-7a57147f711e.png", "04 BLACK CHRONICLE"),
        ("new-game-05-ember-reliquary.png", "exec-dc25c9ce-3d54-47bd-b446-b4536022f710.png", "05 EMBER RELIQUARY"),
    ],
    "load-game": [
        ("load-game-01-ashen-gate.png", "exec-1bb34e1b-56e9-4c85-a1eb-42c0cb637505.png", "01 ASHEN GATE"),
        ("load-game-02-war-table.png", "exec-b8e87116-bd5f-4322-b045-81d1610d6a27.png", "02 WAR TABLE"),
        ("load-game-03-frontline-registry.png", "exec-d7bbc84c-4266-4b60-a816-2cdf95d652a0.png", "03 FRONTLINE REGISTRY"),
        ("load-game-04-black-chronicle.png", "exec-fa5e7f47-1059-4eb4-9441-3bcf3fb1d325.png", "04 BLACK CHRONICLE"),
        ("load-game-05-ember-reliquary.png", "exec-d05f22b7-2525-45c0-927f-a74a3cda95b4.png", "05 EMBER RELIQUARY"),
    ],
    "character-creation": [
        ("character-creation-01-ashen-gate.png", "exec-4df45269-54ee-4975-b669-61472af327b8.png", "01 ASHEN GATE"),
        ("character-creation-02-war-table.png", "exec-d8745183-58d0-4d48-b610-baa34ebed4b8.png", "02 WAR TABLE"),
        ("character-creation-03-frontline-registry.png", "exec-8db11c1c-574e-49cf-b483-ce119a76b4d9.png", "03 FRONTLINE REGISTRY"),
        ("character-creation-04-black-chronicle.png", "exec-af044ab9-daec-499d-a9ee-a36fea9c1906.png", "04 BLACK CHRONICLE"),
        ("character-creation-05-ember-reliquary.png", "exec-cdfc2ce1-7be5-4ff2-853d-3db6e068226b.png", "05 EMBER RELIQUARY"),
    ],
}


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\georgiab.ttf" if bold else r"C:\Windows\Fonts\georgia.ttf"),
        Path(r"C:\Windows\Fonts\timesbd.ttf" if bold else r"C:\Windows\Fonts\times.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def stage_files() -> None:
    for group, entries in GROUPS.items():
        target = ROOT / group
        target.mkdir(parents=True, exist_ok=True)
        for name, source, _ in entries:
            shutil.copy2(GENERATED / source, target / name)
    QA.mkdir(parents=True, exist_ok=True)


def make_sheet(title: str, entries: list[tuple[Path, str]], output: Path, columns: int, thumb_width: int) -> None:
    thumb_height = round(thumb_width * 941 / 1672)
    label_height = 54
    gutter = 22
    margin = 30
    header = 82
    rows = (len(entries) + columns - 1) // columns
    width = margin * 2 + columns * thumb_width + (columns - 1) * gutter
    height = header + margin + rows * (thumb_height + label_height) + (rows - 1) * gutter + margin
    sheet = Image.new("RGB", (width, height), "#0d0b0a")
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((1, 1, width - 2, height - 2), outline="#5d4930", width=2)
    draw.text((30, 22), title, font=load_font(30, True), fill="#e3d0a4")

    for index, (image_path, label) in enumerate(entries):
        column = index % columns
        row = index // columns
        left = margin + column * (thumb_width + gutter)
        top = header + margin + row * (thumb_height + label_height + gutter)
        with Image.open(image_path) as source:
            thumb = source.convert("RGB").resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (left, top))
        draw.rectangle((left, top + thumb_height, left + thumb_width, top + thumb_height + label_height), fill="#171310")
        draw.text((left + 18, top + thumb_height + 13), label, font=load_font(21, True), fill="#d8c49a")
    sheet.save(output, "PNG", optimize=True)


def main() -> None:
    stage_files()
    # codex:2026-08-26T18:48:00+02:00
    for group, entries in GROUPS.items():
        for name, _, _ in entries:
            with Image.open(ROOT / group / name) as image:
                print(f"{group}/{name}: {image.width}x{image.height} {image.mode}")
    for group, entries in GROUPS.items():
        sheet_entries = [(ROOT / group / name, label) for name, _, label in entries]
        title = group.replace("-", " ").upper() + " - FIVE DESIGN DIRECTIONS"
        make_sheet(title, sheet_entries, QA / f"contact-sheet-{group}.png", 2, 760)

    family_names = ["ASHEN GATE", "WAR TABLE", "FRONTLINE REGISTRY", "BLACK CHRONICLE", "EMBER RELIQUARY"]
    paired = []
    for index, family in enumerate(family_names):
        for group, screen in [("new-game", "NEW GAME"), ("load-game", "LOAD GAME"), ("character-creation", "CHARACTER CREATION")]:
            name = GROUPS[group][index][0]
            paired.append((ROOT / group / name, f"{index + 1:02d} {family} - {screen}"))
    make_sheet(
        "PAIRED DESIGN FAMILIES - NEW GAME / LOAD GAME / CHARACTER CREATION",
        paired,
        QA / "contact-sheet-paired-families.png",
        3,
        500,
    )


if __name__ == "__main__":
    main()
