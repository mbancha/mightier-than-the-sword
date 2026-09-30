"""The PDF and digital game consume one versioned component catalog."""
import json
from pathlib import Path
data=json.loads((Path(__file__).resolve().parents[2]/'src/data/content.json').read_text(encoding='utf-8'))
for name in ('BOOKS','TWISTS','SUBPLOTS','CHARACTERS','HORSE','TRACKS','RULES','SOURCES','PLAYERS'):
    globals()[name]=data[name.lower()]
TOKENS={int(k):v for k,v in data['tokens'].items()}
def wording(text):
    # Layout-only labels inherited from the approved v15 sheets.
    from terminology import wording as normalize
    return normalize(text)
