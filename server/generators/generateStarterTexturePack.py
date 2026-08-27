from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PACK_DIR = ROOT / "client/public/assets/packs/a-survival-content-library-v0-1"
TEXTURE_DIR = PACK_DIR / "textures"
ICON_DIR = PACK_DIR / "icons"
MANIFEST_PATH = PACK_DIR / "manifest.json"

PALETTE = {
    "obsidian": (18, 25, 38, 255),
    "ink": (8, 12, 22, 255),
    "cyan": (46, 226, 218, 255),
    "blue": (46, 117, 204, 255),
    "violet": (152, 91, 224, 255),
    "amber": (245, 174, 70, 255),
    "ember": (231, 86, 58, 255),
    "moss": (74, 132, 83, 255),
    "leaf": (113, 184, 102, 255),
    "sand": (177, 106, 70, 255),
    "stone": (93, 105, 120, 255),
    "pearl": (221, 232, 232, 255),
    "shadow": (28, 34, 50, 255),
    "clear": (0, 0, 0, 0),
}


def px(draw: ImageDraw.ImageDraw, x: int, y: int, color: str) -> None:
    draw.point((x, y), fill=PALETTE[color])


def fill_rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: str) -> None:
    draw.rectangle(box, fill=PALETTE[color])


def terrain_texture(base: str, accents: list[str], seed: int) -> Image.Image:
    image = Image.new("RGBA", (32, 32), PALETTE[base])
    draw = ImageDraw.Draw(image)
    for y in range(0, 32, 4):
        for x in range(0, 32, 4):
            choice = accents[(x * 7 + y * 11 + seed) % len(accents)]
            if (x + y + seed) % 3 != 0:
                fill_rect(draw, (x + 1, y + 1, x + 2, y + 2), choice)
            if (x * 3 + y + seed) % 5 == 0:
                px(draw, x + 3, y, choice)
    fill_rect(draw, (0, 0, 31, 0), "ink")
    fill_rect(draw, (0, 31, 31, 31), "shadow")
    return image


def crystal_fern() -> Image.Image:
    image = Image.new("RGBA", (32, 32), PALETTE["clear"])
    draw = ImageDraw.Draw(image)
    fill_rect(draw, (14, 25, 17, 29), "shadow")
    for y, width in [(23, 2), (20, 3), (17, 4), (14, 3), (11, 2)]:
        center = 15 + (y % 3) - 1
        fill_rect(draw, (center - width, y, center + width, y + 1), "moss")
        px(draw, center, y, "cyan")
    fill_rect(draw, (14, 8, 16, 12), "cyan")
    px(draw, 15, 7, "pearl")
    return image


def spore_shrub() -> Image.Image:
    image = Image.new("RGBA", (32, 32), PALETTE["clear"])
    draw = ImageDraw.Draw(image)
    fill_rect(draw, (14, 22, 18, 29), "shadow")
    for box in [(8, 16, 14, 23), (12, 12, 20, 23), (18, 16, 24, 23)]:
        fill_rect(draw, box, "moss")
    for x, y in [(10, 14), (15, 10), (21, 14), (12, 18), (19, 18)]:
        fill_rect(draw, (x, y, x + 2, y + 2), "violet")
        px(draw, x + 1, y, "cyan")
    return image


def glow_vine() -> Image.Image:
    image = Image.new("RGBA", (32, 32), PALETTE["clear"])
    draw = ImageDraw.Draw(image)
    for y in range(4, 29):
        x = 16 + ((y * 5) % 7) - 3
        px(draw, x, y, "moss")
        if y % 4 == 0:
            fill_rect(draw, (x - 2, y, x - 1, y + 1), "leaf")
            fill_rect(draw, (x + 1, y + 1, x + 2, y + 2), "cyan")
    return image


def lumen_bulb() -> Image.Image:
    image = Image.new("RGBA", (32, 32), PALETTE["clear"])
    draw = ImageDraw.Draw(image)
    fill_rect(draw, (13, 8, 18, 23), "cyan")
    fill_rect(draw, (10, 12, 21, 19), "cyan")
    fill_rect(draw, (12, 10, 19, 21), "pearl")
    fill_rect(draw, (14, 21, 17, 26), "moss")
    px(draw, 15, 12, "amber")
    return image


def weapon_icon(primary: str, secondary: str, shape: str) -> Image.Image:
    image = Image.new("RGBA", (32, 32), PALETTE["clear"])
    draw = ImageDraw.Draw(image)
    if shape == "blade":
        fill_rect(draw, (15, 5, 18, 22), primary)
        fill_rect(draw, (13, 9, 20, 12), primary)
        fill_rect(draw, (10, 22, 22, 24), secondary)
        fill_rect(draw, (15, 24, 17, 28), "shadow")
        px(draw, 16, 6, "pearl")
    elif shape == "bow":
        for y in range(5, 27):
            x = 9 + abs(y - 16) // 3
            px(draw, x, y, primary)
        for y in range(6, 27):
            px(draw, 22 - abs(y - 16) // 3, y, primary)
        for y in range(10, 23):
            px(draw, 16, y, secondary)
        fill_rect(draw, (15, 15, 23, 16), "pearl")
    elif shape == "ranged":
        fill_rect(draw, (6, 13, 25, 19), primary)
        fill_rect(draw, (10, 10, 21, 12), secondary)
        fill_rect(draw, (20, 11, 27, 14), primary)
        fill_rect(draw, (13, 19, 17, 24), "shadow")
        px(draw, 24, 15, "pearl")
    else:
        fill_rect(draw, (14, 5, 17, 26), primary)
        fill_rect(draw, (9, 18, 22, 20), secondary)
        px(draw, 15, 6, "pearl")
    return image


def material_icon(primary: str, secondary: str) -> Image.Image:
    image = Image.new("RGBA", (32, 32), PALETTE["clear"])
    draw = ImageDraw.Draw(image)
    fill_rect(draw, (8, 11, 22, 23), primary)
    fill_rect(draw, (11, 8, 19, 25), primary)
    fill_rect(draw, (13, 10, 18, 19), secondary)
    px(draw, 12, 13, "pearl")
    px(draw, 19, 21, "shadow")
    return image


def save_png(relative: str, image: Image.Image) -> dict[str, str]:
    target = PACK_DIR / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, format="PNG", optimize=False)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    return {"path": relative, "sha256": digest}


def main() -> None:
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    entries: dict[str, dict[str, str]] = {}

    terrain_files: list[tuple[str, Image.Image]] = [
        ("textures/terrain/obsidian-frontier.png", terrain_texture("obsidian", ["ink", "shadow", "cyan"], 1)),
        ("textures/terrain/aether-crystal.png", terrain_texture("shadow", ["violet", "cyan", "pearl"], 3)),
        ("textures/terrain/verdant-humus.png", terrain_texture("moss", ["shadow", "leaf", "cyan"], 5)),
        ("textures/terrain/ashen-volcanic.png", terrain_texture("stone", ["ink", "ember", "amber"], 7)),
    ]
    icon_files: list[tuple[str, Image.Image]] = [
        ("icons/plant-crystal-fern.png", crystal_fern()),
        ("icons/plant-spore-shrub.png", spore_shrub()),
        ("icons/plant-glow-vine.png", glow_vine()),
        ("icons/plant-lumen-bulb.png", lumen_bulb()),
        ("icons/weapon-aether-blade.png", weapon_icon("cyan", "shadow", "blade")),
        ("icons/weapon-ember-bow.png", weapon_icon("ember", "amber", "bow")),
        ("icons/weapon-void-rifle.png", weapon_icon("violet", "cyan", "ranged")),
        ("icons/weapon-storm-spear.png", weapon_icon("blue", "pearl", "spear")),
        ("icons/material-obsidian-shard.png", material_icon("obsidian", "cyan")),
        ("icons/material-aether-core.png", material_icon("violet", "pearl")),
        ("icons/material-ember-resin.png", material_icon("ember", "amber")),
        ("icons/material-verdant-fiber.png", material_icon("moss", "leaf")),
    ]

    for relative, image in terrain_files + icon_files:
        record = save_png(relative, image)
        category = "terrain" if relative.startswith("textures/") else "icon"
        logical_id = f"content.{Path(relative).stem}"
        entries[logical_id] = {
            "kind": category,
            "path": record["path"],
            "mime": "image/png",
            "sha256": record["sha256"],
            "source": "procedural-starter-authored",
            "provenanceRef": "ASSETS.md#procedural-starter-texture-pack",
        }

    manifest_without_hash = {
        "schemaVersion": 1,
        "id": "a-survival-content-library-v0-1",
        "namespace": "afc",
        "displayName": "A_Survival Content Library Starter Pack",
        "version": "0.1.0",
        "designSource": "a-survival-original-procedural-generator",
        "artStatus": "procedural-starter-authored",
        "textureSampling": "nearest",
        "tileSize": 32,
        "entries": dict(sorted(entries.items())),
        "usage": "future-library-only; not imported by playable Obsidian runtime",
    }
    canonical = json.dumps(manifest_without_hash, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    manifest = {**manifest_without_hash, "packSha256": hashlib.sha256(canonical).hexdigest()}
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pack": manifest["id"], "entries": len(entries), "packSha256": manifest["packSha256"], "path": str(PACK_DIR)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
