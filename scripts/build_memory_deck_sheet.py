from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "tts" / "assets"
OUTPUT = ASSETS / "memories-deck-10x7.png"
COLS = 10
ROWS = 7
CELL = 240


tokens = [
    ASSETS / f"memory-p{player}-t{track}-{copy}.png"
    for player in range(1, 5)
    for track in range(1, 5)
    for copy in range(1, 4)
]

sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
for index, path in enumerate(tokens):
    token = Image.open(path).convert("RGBA")
    if token.size != (CELL, CELL):
        raise ValueError(f"Unexpected token size for {path}: {token.size}")
    x = (index % COLS) * CELL
    y = (index // COLS) * CELL
    sheet.alpha_composite(token, (x, y))

sheet.save(OUTPUT, optimize=True)
print(f"Wrote {len(tokens)} tokens to {OUTPUT} ({sheet.width}x{sheet.height})")
