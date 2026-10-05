from pathlib import Path
from collections import Counter
import json,math,re,zipfile
import pdfplumber
from pypdf import PdfReader
from PIL import Image
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent/'source'))
from catalog import TOKENS,PLAYERS

root=Path(__file__).resolve().parent.parent;out=root/'print'/'outputs'
assert [p.name for p in out.iterdir()] == ['Mightier_than_the_Sword_Current.pdf']
q=json.loads((root/'artifacts'/'print'/'qa.json').read_text())
with pdfplumber.open(out/'Mightier_than_the_Sword_Current.pdf') as pdf:
    assert len(pdf.pages)==20
    assert not any(p.images for p in pdf.pages)
    full='\n'.join(p.extract_text() or '' for p in PdfReader(out/'Mightier_than_the_Sword_Current.pdf').pages)
    full=' '.join(full.split())
    assert not re.search(r'\b(protagonist|development|developed|bookmark|Pathos|Love|Plotline|unpublished|sidekick|exhaust)\b',full,re.I)
    assert not re.search(r'\b(?:ink|unlock\w*)\b',full,re.I)
    assert 'Return 1 of your memories from this book' in full
    assert 'EVERY conflict takes 1 available current-Act token' in full
    assert 'NO printed book points' in full
    assert 'no conflict resolves without an available token' in full.lower()
    assert 'base pool of 15' in full
    assert 'SPACE CHECKS 0.6.0' in full
    assert full.count('HIDDEN OBJECTIVE')==10
    assert 'WHEN FULL, CHOOSE ONE' not in full
    for wording in ['ending on a different page', 'Twists are played ONLY in conflict', 'Check numbered spaces ONCE, left to right', 'Agamemnon triggers with 1 space still empty', 'Numbered spaces have no automatic Twist reward']:
        assert wording in full, wording
    assert 'ON YOUR TURN' not in full
    assert sum(len(p.hyperlinks) for p in pdf.pages)==15
    assert Counter(a['kind'] for a in q['cards'])=={'Twist':15,'Subplot':10,'Character':10,'Horse power':5}
    for i in range(6,11):
        pg=pdf.pages[i]
        cells=[r for r in pg.rects if abs(r['width']-180)<.01 and abs(r['height']-252)<.01]
        assert len(cells)==(9 if i<10 else 4)
        for obj in pg.chars+pg.curves:
            assert any(obj['x0']>=r['x0']+1 and obj['x1']<=r['x1']-1 and obj['top']>=r['top']+1 and obj['bottom']<=r['bottom']-1 for r in cells),(i,obj)
    board_colors=[]
    for i in (11,12,13,14):
        pg=pdf.pages[i];assert (pg.width,pg.height)==(612,792)
        borders=[r for r in pg.rects if abs(r['width']-598)<.01 and abs(r['height']-778)<.01]
        assert len(borders)==1
        board_colors.extend(tuple(r['stroking_color']) for r in borders)
        assert pg.extract_text().count('MEMORIES')==4
        slots=[r for r in pg.curves if abs(r['width']-54)<.01 and abs(r['height']-54*math.sqrt(3)/2)<.01]
        assert len(slots)==12
    assert len(set(board_colors))==4
    pg=pdf.pages[16]
    tokens=[r for r in pg.curves if abs(r['width']-54)<.01 and abs(r['height']-54*math.sqrt(3)/2)<.01]
    assert len(tokens)==48
    assert Counter(tuple(t['stroking_color']) for t in tokens)=={col:12 for col in board_colors}
    for i in range(3,6):
        pg=pdf.pages[i]
        assert 'Cover once' not in pg.extract_text()
        books=[r for r in pg.rects if abs(r['width']-((612-4*72/25.4)/2))<.01 and abs(r['height']-((792-4*72/25.4)/2))<.01]
        assert len(books)==(4 if i<5 else 1)
        for book in books:
            assert book['x0']>=2*72/25.4-.01 and book['x1']<=612-2*72/25.4+.01
            assert book['top']>=2*72/25.4-.01 and book['bottom']<=792-2*72/25.4+.01
            middle=(book['top']+book['bottom'])/2
            slots=[r for r in pg.rects if abs(r['width']-54)<.01 and abs(r['height']-54)<.01 and r['x0']>=book['x0'] and r['x1']<=book['x1'] and r['top']>=book['top'] and r['bottom']<=book['bottom']]
            assert 3<=len(slots)<=5
            assert all(r['bottom']<middle or r['top']>middle for r in slots)
            assert abs(sum(r['bottom']<middle for r in slots)-sum(r['top']>middle for r in slots))<=1
            assert any(abs(l['top']-middle)<.01 and abs(l['width']-((612-4*72/25.4)/2-2))<.01 for l in pg.lines)
    assert pdf.pages[19].extract_text().count('QUILL') == 4
    assert '4 Quills, 48 Inklings, 4 score markers' in pdf.pages[19].extract_text()
    front,back=pdf.pages[17:19]
    fronts=[r for r in front.rects if abs(r['width']-72)<.01 and abs(r['height']-72)<.01]
    backs=[r for r in back.rects if abs(r['width']-72)<.01 and abs(r['height']-72)<.01]
    assert len(fronts)==len(backs)==15
    for r in fronts:
        assert any(abs(b['x0']-(612-r['x1']))<.01 and abs(b['top']-r['top'])<.01 for b in backs)
    assert front.extract_text().count('x1')==5
    assert front.extract_text().count('x2')==5
    assert front.extract_text().count('x3')==5
    assert 'NEW:' not in front.extract_text()
    # Back text is restricted to Act labels and their 1/2/3 point values.
    words=set(back.extract_text().split());assert words<=set(['ACT','I','II','III','1','2','3']),words
    for pg,cells in [(front,fronts),(back,backs)]:
        for obj in pg.chars+pg.curves:
            assert any(obj['x0']>=r['x0']+1 and obj['x1']<=r['x1']-1 and obj['top']>=r['top']+1 and obj['bottom']<=r['bottom']-1 for r in cells),obj
folder=root/'assets'/'icons'
assert len(list(folder.glob('*.png')))==17
for p in folder.glob('*.png'):
    im=Image.open(p);assert im.mode=='RGBA'
    assert im.getchannel('A').getbbox()==(0,0,*im.size)

print('PASS: 20 pages; four portrait player-board sheets; four player colors; 48 hexes at 0.75 inches wide; 15 exact 1-inch conflict fronts and long-edge mirrored backs; current memories wording; vector-only PDFs; card cut boundaries clear.')
