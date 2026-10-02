"""Build one canonical GitHub-hosted image for each Component Studio row."""

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tts" / "assets"
OUT = ROOT / "print" / "outputs" / "cs3-assets"
OUT.mkdir(parents=True, exist_ok=True)


def copy(source: str, *names: str) -> None:
    for name in names:
        shutil.copyfile(SOURCE / source, OUT / name)


def split_sheet(sheet_name: str, stem: str, count: int) -> None:
    sheet = Image.open(SOURCE / sheet_name).convert("RGB")
    width, height = 720, 1008
    for index in range(count):
        left = (index % 5) * width
        top = (index // 5) * height
        sheet.crop((left, top, left + width, top + height)).save(
            OUT / f"{stem}-{index + 1}.png", optimize=True
        )


split_sheet("twists-faces.png", "twist", 15)
split_sheet("subplots-faces.png", "subplot", 10)
split_sheet("characters-faces.png", "character", 10)
split_sheet("horse-faces.png", "horse", 5)
for index in range(1, 6):
    shutil.copyfile(OUT / f"horse-{index}.png", OUT / f"horse-power-{index}.png")

for index in range(1, 10):
    copy(f"book-{index:02}.png", f"book-{index}.png")

for index in range(1, 16):
    copy(f"conflict-{index:02}-front.png", f"conflict-{index}.png")

for index in range(1, 5):
    copy(f"player-{index}.png", f"player-{index}.png", f"player-board-{index}.png")

for player in range(1, 5):
    for track, category in enumerate(("curiosity", "insight", "resolve", "valor"), start=1):
        for copy_number in range(1, 4):
            name = f"memory-p{player}-t{track}-{copy_number}.png"
            copy(name, name)
            shutil.copyfile(
                OUT / name,
                OUT / f"memory-p{player}-{category}-{copy_number}.png",
            )

copy("rules.png", "rules.png", "reference-1.png")
copy("legend.png", "legend.png", "reference-2.png")
copy("rules.png", "reference-basic-rules.png")
copy("legend.png", "reference-icon-legend.png")
copy("scoreboard.png", "scoreboard.png", "scoreboard-1.png")

print(f"Wrote canonical CS3 assets to {OUT}")
