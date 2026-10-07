from pathlib import Path
from collections import Counter
import json,math,re,zipfile
import pdfplumber
from pypdf import PdfReader
from xml.etree import ElementTree as ET
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent/'source'))
from catalog import TOKENS,PLAYERS,TRACKS,wording as catalog_wording

root=Path(__file__).resolve().parent.parent;out=root/'print'/'outputs'
assert [p.name for p in out.iterdir()] == ['Mightier_than_the_Sword_Current.pdf']
q=json.loads((root/'artifacts'/'print'/'qa.json').read_text())
with pdfplumber.open(out/'Mightier_than_the_Sword_Current.pdf') as pdf:
    assert len(pdf.pages)==18
    assert not any(p.images for p in pdf.pages)
    full='\n'.join(p.extract_text() or '' for p in PdfReader(out/'Mightier_than_the_Sword_Current.pdf').pages)
    full=' '.join(full.split())
    assert not re.search(r'\b(protagonist|development|developed|bookmark|Pathos|Love|Plotline|unpublished|sidekick|exhaust)\b',full,re.I)
    assert not re.search(r'\bunlock\w*\b',full,re.I)
    assert 'Return 1 of your memories from this book' in full
    assert 'A book may conflict repeatedly in the same Act' in full
    assert 'first and second place score 5/2 in Act I' in full
    assert 'There is no hand limit' in full
    assert 'SPACE CHECKS 0.7.1' in full
    assert full.count('HIDDEN OBJECTIVE')==15
    assert 'WHEN FULL, CHOOSE ONE' not in full
    assert not re.search(r'\b(?:OVERFLOW|numbered)\b',full,re.I)
    assert '+3' not in ' '.join(pdf.pages[i].extract_text() for i in range(3,6))
    assert 'NEUTRAL INKLING' in pdf.pages[15].extract_text().upper()
    for wording in ['ending on a different page', 'Page spaces grant no automatic Twist reward', 'check occupied page spaces once from left to right', 'the only way to take a character action']:
        assert wording in full, wording
    assert 'ON YOUR TURN' not in full
    assert sum(len(p.hyperlinks) for p in pdf.pages)==15
    assert Counter(a['kind'] for a in q['cards'])=={'Twist':15,'Subplot':15,'Character':10,'Horse power':5}
    for i in range(6,11):
        pg=pdf.pages[i]
        cells=[r for r in pg.rects if abs(r['width']-180)<.01 and abs(r['height']-252)<.01]
        assert len(cells)==9
        for obj in pg.chars+pg.curves:
            assert any(obj['x0']>=r['x0']+1 and obj['x1']<=r['x1']-1 and obj['top']>=r['top']+1 and obj['bottom']<=r['bottom']-1 for r in cells),(i,obj)
    board_colors=[]
    for i in (11,12):
        pg=pdf.pages[i];assert (pg.width,pg.height)==(612,792)
        borders=[r for r in pg.rects if abs(r['width']-598)<.01 and abs(r['height']-382)<.01]
        assert len(borders)==2
        board_colors.extend(tuple(r['stroking_color']) for r in borders)
        assert pg.extract_text().count('MEMORIES')==8
        slots=[r for r in pg.curves if abs(r['width']-54)<.01 and abs(r['height']-54*math.sqrt(3)/2)<.01]
        assert len(slots)==24
        for border in borders:
            assert border['top'] >= 7 and border['bottom'] <= 785
            assert border['height'] < pg.height/2
            crop=pg.crop((border['x0'],border['top'],border['x1'],border['bottom']))
            assert crop.extract_text().count('MEMORIES')==4
            assert len([x for x in crop.curves if abs(x['width']-54)<.01 and abs(x['height']-54*math.sqrt(3)/2)<.01])==12
            base_y=pg.height-border['bottom']-7
            normalize=lambda text: ' '.join(text.split())
            for row,(_,_,base,levels,_) in enumerate(TRACKS):
                yy=278-row*70
                base_top=pg.height-base_y-(yy+39)
                base_text=pg.crop((26,base_top,151,base_top+26)).extract_text()
                assert normalize(base_text)==normalize(catalog_wording(base)),(i,row,base_text,base)
                for level,value in enumerate(levels):
                    left=183+level*140+33
                    top=pg.height-base_y-(yy+63)
                    actual=pg.crop((left,top,left+89,top+45)).extract_text()
                    assert normalize(actual)==normalize(catalog_wording(value)),(i,row,level,actual,value)
            for char in crop.chars:
                assert char['x0'] >= border['x0']+1 and char['x1'] <= border['x1']-1
                assert char['top'] >= border['top']+1 and char['bottom'] <= border['bottom']-1
                assert char['size'] >= 6.5
    assert len(set(board_colors))==4
    pg=pdf.pages[14]
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
    assert pdf.pages[15].extract_text().count('QUILL') == 4
    assert '4 Quills, 48 Inklings, 4 score markers' in pdf.pages[15].extract_text()
    front,back=pdf.pages[16:18]
    fronts=[r for r in front.rects if abs(r['width']-72)<.01 and abs(r['height']-72)<.01]
    backs=[r for r in back.rects if abs(r['width']-72)<.01 and abs(r['height']-72)<.01]
    assert len(fronts)==len(backs)==15
    for r in fronts:
        assert any(abs(b['x0']-(612-r['x1']))<.01 and abs(b['top']-r['top'])<.01 for b in backs)
    assert front.extract_text().count('FIRST / SECOND')==15
    assert front.extract_text().count('ADD A NEW BOOK')==15
    assert 'NEW:' not in front.extract_text()
    assert back.extract_text().count('FIRST / SECOND')==15
    assert '3 / 2 PP' in back.extract_text()
    assert '4 / 2 PP' in back.extract_text()
    assert '5 / 2 PP' in back.extract_text()
    for pg,cells in [(front,fronts),(back,backs)]:
        for obj in pg.chars+pg.curves:
            assert any(obj['x0']>=r['x0']+1 and obj['x1']<=r['x1']-1 and obj['top']>=r['top']+1 and obj['bottom']<=r['bottom']-1 for r in cells),obj
folder=root/'public'/'icons'
manifest=json.loads((folder/'manifest.json').read_text())
assert len(list(folder.glob('*.svg')))==len(manifest['assets'])==18
for entry in manifest['assets']:
    path=root/entry['master']
    assert path.is_file() and entry['master']==entry['web']
    svg=ET.parse(path).getroot()
    assert svg.tag.endswith('svg') and svg.attrib.get('viewBox')

print('PASS: 18 pages; two half-sheet player boards per sheet; four player colors; 48 hexes at 0.75 inches wide; 15 exact 1-inch conflict fronts and long-edge mirrored backs; current memories wording; vector-only PDFs; card cut boundaries clear.')

