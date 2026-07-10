#!/usr/bin/env python3
"""Generate tighter BeatQuest rhythm-bank PNGs from the original bank assets.

The source PNGs are intentionally left untouched. This script does not scale
each rhythm independently. It trims canvas around the alpha bounding box while
enforcing a minimum canvas size per source family, so sparse symbols such as
rests do not become visually huge compared with dense beamed figures.
"""

from __future__ import annotations

import csv
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


# Repointed for THIS repo on 2026-07-10. The redesign kept its art under `assets/rhythm-assets/`;
# here it is `rhythm-assets/`. The script is otherwise the owner's, unchanged — it is what produced
# the 99 tiles in `rhythm-assets/bank-tight/`, and it is kept so that art can be regenerated from
# `bank/` rather than being a binary nobody can rebuild.
#
#   python3 -m pip install Pillow
#   python3 tools/generate-tight-bank-assets.py
#
# Writes rhythm-assets/bank-tight/*.png, plus a metrics CSV and a contact sheet under build/.
ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "rhythm-assets" / "bank"
OUTPUT_DIR = ROOT / "rhythm-assets" / "bank-tight"
REPORT_DIR = ROOT / "build" / "bank-tight-report"
METRICS_PATH = REPORT_DIR / "bank-tight-metrics.csv"
CONTACT_SHEET_PATH = REPORT_DIR / "bank-tight-contact-sheet.png"

ALPHA_THRESHOLD = 1
TILE_W = 126
TILE_H = 88
TILE_ASPECT = 104 / 72
LABEL_H = 24
SHEET_COLS = 5

SOURCE_FAMILIES = {
    (380, 192): {
        "min_w": 360,
        "pad_x": 18,
        "pad_y": 24,
    },
    (720, 360): {
        "min_w": 640,
        "pad_x": 28,
        "pad_y": 38,
    },
}


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    return mask.getbbox()


def output_canvas_plan(
    source: Image.Image,
    bbox: tuple[int, int, int, int],
) -> tuple[Image.Image, dict[str, int]]:
    src_w, src_h = source.size
    x0, y0, x1, y1 = bbox
    ink_w = x1 - x0
    ink_h = y1 - y0
    family = SOURCE_FAMILIES.get(source.size)
    if family:
        min_w = family["min_w"]
        pad_x = family["pad_x"]
        pad_y = family["pad_y"]
    else:
        min_w = round(src_w * 0.88)
        pad_x = max(round(src_w * 0.04), 16)
        pad_y = max(round(src_h * 0.08), 22)

    min_h = round(min_w / TILE_ASPECT)
    out_w = max(min_w, ink_w + pad_x * 2)
    out_h = max(min_h, ink_h + pad_y * 2)
    if out_w / out_h > TILE_ASPECT:
        out_h = round(out_w / TILE_ASPECT)
    else:
        out_w = round(out_h * TILE_ASPECT)

    center_x = (x0 + x1) / 2
    center_y = (y0 + y1) / 2
    virtual_left = round(center_x - out_w / 2)
    virtual_top = round(center_y - out_h / 2)

    src_left = max(0, virtual_left)
    src_top = max(0, virtual_top)
    src_right = min(src_w, virtual_left + out_w)
    src_bottom = min(src_h, virtual_top + out_h)
    dest_left = src_left - virtual_left
    dest_top = src_top - virtual_top

    output = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    output.alpha_composite(source.crop((src_left, src_top, src_right, src_bottom)), (dest_left, dest_top))
    plan = {
        "output_w": out_w,
        "output_h": out_h,
        "virtual_left": virtual_left,
        "virtual_top": virtual_top,
        "source_left": src_left,
        "source_top": src_top,
        "source_right": src_right,
        "source_bottom": src_bottom,
        "dest_left": dest_left,
        "dest_top": dest_top,
        "pad_x": pad_x,
        "pad_y": pad_y,
        "min_w": min_w,
    }
    return output, plan


def paste_contained(
    canvas: Image.Image,
    image: Image.Image,
    box: tuple[int, int, int, int],
) -> None:
    x0, y0, x1, y1 = box
    box_w = x1 - x0
    box_h = y1 - y0
    scale = min(box_w / image.width, box_h / image.height)
    draw_w = max(1, round(image.width * scale))
    draw_h = max(1, round(image.height * scale))
    resized = image.resize((draw_w, draw_h), Image.Resampling.LANCZOS)
    x = x0 + round((box_w - draw_w) / 2)
    y = y0 + round((box_h - draw_h) / 2)
    canvas.alpha_composite(resized, (x, y))


def draw_tile_preview(
    draw: ImageDraw.ImageDraw,
    sheet: Image.Image,
    image: Image.Image,
    x: int,
    y: int,
    label: str,
    font: ImageFont.ImageFont,
) -> None:
    tile_box = (x, y, x + TILE_W, y + TILE_H)
    draw.rounded_rectangle(tile_box, radius=9, fill=(226, 239, 208, 255), outline=(180, 194, 168, 255), width=1)
    paste_contained(sheet, image, (x + 5, y + 5, x + TILE_W - 5, y + TILE_H - 5))
    text = label.replace(".png", "")
    if len(text) > 24:
        text = text[:22] + ".."
    draw.text((x + 3, y + TILE_H + 5), text, fill=(35, 39, 34, 255), font=font)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    metrics: list[dict[str, object]] = []
    generated: list[tuple[str, Image.Image]] = []

    for source_path in sorted(SOURCE_DIR.glob("*.png")):
        source = Image.open(source_path).convert("RGBA")
        bbox = alpha_bbox(source)
        if bbox is None:
            continue
        output, plan = output_canvas_plan(source, bbox)
        output.save(OUTPUT_DIR / source_path.name)

        x0, y0, x1, y1 = bbox
        metrics.append({
            "file": source_path.name,
            "source_w": source.width,
            "source_h": source.height,
            "ink_w": x1 - x0,
            "ink_h": y1 - y0,
            **plan,
        })
        generated.append((source_path.name, output))

    with METRICS_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(metrics[0].keys()))
        writer.writeheader()
        writer.writerows(metrics)

    rows = (len(generated) + SHEET_COLS - 1) // SHEET_COLS
    cell_w = TILE_W + 18
    cell_h = TILE_H + LABEL_H + 18
    sheet = Image.new("RGBA", (SHEET_COLS * cell_w + 18, rows * cell_h + 18), (26, 28, 31, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (name, image) in enumerate(generated):
        col = index % SHEET_COLS
        row = index // SHEET_COLS
        x = 10 + col * cell_w
        y = 10 + row * cell_h
        draw_tile_preview(draw, sheet, image, x, y, name, font)

    sheet.convert("RGB").save(CONTACT_SHEET_PATH)
    print(f"Generated {len(generated)} tight bank assets in {OUTPUT_DIR}")
    print(f"Wrote metrics to {METRICS_PATH}")
    print(f"Wrote contact sheet to {CONTACT_SHEET_PATH}")


if __name__ == "__main__":
    main()
