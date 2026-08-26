# codex:2026-08-26T19:08:00+02:00
from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(r"G:\GameDev")
OUT = ROOT / "CODEX" / "outbox" / "2026-08-26-mainmenu-submenus-html"
ASSETS = OUT / "assets"
GENERATED = Path(r"C:\Users\MSchu\.codex\generated_images\01a02f40-1bd9-7802-8352-58082679c45b")

COPIES = {
    GENERATED / "exec-7dc402de-200f-46c9-a013-8f1c46891ffd.png": ASSETS / "ember-reliquary-background.png",
    ROOT / "CODEX/outbox/2026-08-26-mainmenu-itemstack-html/assets/knight_m.webp": ASSETS / "frontline-registry-hero.webp",
    ROOT / "apps/client/src/renderer/assets/ui/mainmenu_logo.webp": ASSETS / "mainmenu-logo.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/frames/frame-panel.webp": ASSETS / "frame-panel.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/textures/texture-leather.webp": ASSETS / "texture-leather.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/textures/texture-gravewood.webp": ASSETS / "texture-gravewood.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/textures/texture-umber-cloth.webp": ASSETS / "texture-umber-cloth.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/buttons/primary/primary-normal.webp": ASSETS / "button-primary.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/buttons/primary/primary-hover.webp": ASSETS / "button-primary-hover.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/buttons/alternate/alternate-normal.webp": ASSETS / "button-alt.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/buttons/alternate/alternate-hover.webp": ASSETS / "button-alt-hover.webp",
    ROOT / "apps/client/src/renderer/assets/ui/gravewood/misc/divider.webp": ASSETS / "divider.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/knight_m.webp": ASSETS / "portrait-edric.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/knight_f.webp": ASSETS / "portrait-mara.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/char_20_m.webp": ASSETS / "portrait-vaelen.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/archer_m.webp": ASSETS / "portrait-archer-m.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/archer_f.webp": ASSETS / "portrait-archer-f.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/mage_m.webp": ASSETS / "portrait-mage-m.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/mage_f.webp": ASSETS / "portrait-mage-f.webp",
    ROOT / "apps/client/src/renderer/assets/portraits/char_1.webp": ASSETS / "portrait-extra.webp",
    ROOT / "apps/client/src/renderer/assets/ui/citadel/created-resources/character_warrior.webp": ASSETS / "style-melee.webp",
    ROOT / "apps/client/src/renderer/assets/ui/citadel/created-resources/character_ranger.webp": ASSETS / "style-ranged.webp",
    ROOT / "apps/client/src/renderer/assets/ui/citadel/created-resources/character_warlock.webp": ASSETS / "style-magic.webp",
    ROOT / "CODEX/outbox/2026-08-26-mainmenu-itemstack-html/assets/cinzel.ttf": ASSETS / "cinzel.ttf",
    ROOT / "CODEX/outbox/2026-08-26-mainmenu-itemstack-html/assets/metamorphous.ttf": ASSETS / "metamorphous.ttf",
    ROOT / "CODEX/outbox/2026-08-26-mainmenu-itemstack-html/assets/fell.woff2": ASSETS / "fell.woff2",
    ROOT / "CODEX/assets/mainmenu-submenus-mockups-2026-08-26/new-game/new-game-05-ember-reliquary.png": ASSETS / "concept-new-game-05.png",
    ROOT / "CODEX/assets/mainmenu-submenus-mockups-2026-08-26/load-game/load-game-05-ember-reliquary.png": ASSETS / "concept-load-game-05.png",
    ROOT / "CODEX/assets/mainmenu-submenus-mockups-2026-08-26/character-creation/character-creation-03-frontline-registry.png": ASSETS / "concept-character-03.png",
}


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    # codex:2026-08-26T19:13:00+02:00 — Verwirft nur die eigene RGB-Schachbrettkopie; kein Keying.
    rejected_copy = ASSETS / "frontline-registry-hero.png"
    if rejected_copy.exists():
        rejected_copy.unlink()
    for source, target in COPIES.items():
        if not source.exists():
            raise FileNotFoundError(source)
        shutil.copy2(source, target)

    for name in ["ember-reliquary-background.png", "frontline-registry-hero.webp"]:
        with Image.open(ASSETS / name) as image:
            alpha = image.getchannel("A") if "A" in image.getbands() else None
            alpha_range = alpha.getextrema() if alpha is not None else None
            print(f"{name}: {image.width}x{image.height} {image.mode} alpha={alpha_range}")


if __name__ == "__main__":
    main()
