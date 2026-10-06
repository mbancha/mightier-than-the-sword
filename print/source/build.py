from pathlib import Path
import math,json,re
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor,white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase.pdfmetrics import stringWidth
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium
from PIL import Image,ImageDraw
import icons_v13 as icons
import vector_icons_v10 as v
from catalog import wording
from catalog import BOOKS,TWISTS,SUBPLOTS,CHARACTERS,HORSE,TOKENS,TRACKS,RULES,SOURCES,PLAYERS,data

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'outputs';QA=ROOT.parent/'artifacts'/'print'
OUT.mkdir(exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
icons.configure()
# Paragraph needs an image resource for inline layout. Canvas paints the actual
# vector icon through install_callback; these placeholders never enter the PDF.
v.ASSET_DIR=QA/'inline-layout'
v.ASSET_DIR.mkdir(exist_ok=True)
for key in v.DRAWINGS:
    Image.new('RGBA',(1,1),(0,0,0,0)).save(v.ASSET_DIR/(key+'.png'))
PDF=OUT/'Mightier_than_the_Sword_Current.pdf'
RULES_VERSION=data['rulesVersion'].removeprefix('mightier-')
c=canvas.Canvas(str(PDF),pagesize=(612,792))
c.setTitle(f'Mightier than the Sword - Space-check Playtest {RULES_VERSION}')
v.install_callback(c)
INK=HexColor('#263D49');GRAY=HexColor('#66757B');LIGHT=HexColor('#D3DFE1')
BLUE=HexColor('#237B9C');GOLD=HexColor('#A07223');TEAL=HexColor('#207E71');PURPLE=HexColor('#79539A')
COLORS={'Voyages':BLUE,'Epics':GOLD,'Gothic Horror':PURPLE,'Twist':PURPLE,'Subplot':TEAL,'Horse power':GOLD}
PALE={'Voyages':'#EEF6F7','Epics':'#FAF4E8','Gothic Horror':'#F5EEF7','Twist':'#F5EEF7','Subplot':'#EEF7F2','Horse power':'#FAF4E8'}
pages=[];card_checks=[];text_checks=[]

def rect(x,y,w,h,fill=None,stroke=LIGHT,lw=.6):
    c.setLineWidth(lw);c.setStrokeColor(stroke or white);c.setFillColor(fill or white)
    c.rect(x,y,w,h,stroke=bool(stroke),fill=bool(fill))
def line(x,y,xx,yy,color=LIGHT,lw=.6):
    c.setLineWidth(lw);c.setStrokeColor(color);c.line(x,y,xx,yy)
def txt(s,x,y,size=10,font='Helvetica',color=INK,center=False):
    v.draw_text(c,wording(s),x,y,size,font,color,center)
def para(s,x,top,w,size=10,leading=None,font='Helvetica',color=INK,maxh=None,align=0):
    st=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.23,textColor=color,alignment=align)
    p=Paragraph(v.markup(wording(s),size),st);_,h=p.wrap(w,1600)
    assert maxh is None or h<=maxh+.01,('Text too tall',s,h,maxh)
    assert top-h>=0,('Text below page',s,top,h)
    p.drawOn(c,x,top-h);text_checks.append((s,top,h))
    return h
def polygon(pts,fill=white,stroke=GRAY,lw=.7):
    p=c.beginPath();p.moveTo(*pts[0])
    for pt in pts[1:]:p.lineTo(*pt)
    p.close();c.setFillColor(fill or white);c.setStrokeColor(stroke or white);c.setLineWidth(lw)
    c.drawPath(p,stroke=bool(stroke),fill=bool(fill))
def hexagon(x,y,r=17,symbol=None):
    polygon([(x+r*math.cos(i*math.pi/3),y+r*math.sin(i*math.pi/3)) for i in range(6)])
    if symbol:v.draw_icon(c,icons.SYMBOLS[symbol],x-10,y-10,20)
def finish(label,w=612,h=792,footer=True):
    if footer:
        txt(f'MIGHTIER THAN THE SWORD / SPACE CHECKS {RULES_VERSION}',30,17,7,color=GRAY)
        txt(label,w-30-stringWidth(label,'Helvetica',7),17,7,color=GRAY)
    c.showPage();pages.append(label)
def rich(s):
    # Sparse resource symbols only; preserve verbs and full prose elsewhere.
    s=re.sub(r'\bplot points?\b','[pp]',s,flags=re.I)
    return s

def rules():
    c.setPageSize((612,792))
    txt('MIGHTIER THAN THE SWORD',28,760,22,'Times-Bold')
    txt('BASIC RULES / 2-4 PLAYERS / THREE ACTS',28,741,8.5,'Helvetica-Bold',TEAL)
    line(28,729,584,729,INK)
    # Full current rules in readable columns over two sheets.
    for sheet, blocks in enumerate((RULES[:5], RULES[5:])):
        if sheet:
            c.setPageSize((612,792))
            txt('MIGHTIER THAN THE SWORD / RULES CONTINUED',28,760,18,'Times-Bold')
        groups=(blocks[:3],blocks[3:]) if sheet == 0 else (blocks[:2],blocks[2:])
        for col, group in enumerate(groups):
            x=28+col*286;y=713
            for title,body in group:
                txt(title.upper(),x,y,9,'Helvetica-Bold',TEAL);y-=8
                h=para(body,x,y,270,9.5,11.4,maxh=650);y-=h+13
            assert y>30,('Rules column overflow',sheet,col,y)
        finish('Basic rules' if sheet == 0 else 'Rules continued')

def legend():
    c.setPageSize((612,792))
    txt('Current icon legend',32,751,24,'Times-Bold')
    para('Resources and memory rows use symbols. Actions and locations stay in words. Memories have a player-colored border, a large row symbol and a small reward reminder.',32,728,548,10,13,maxh=39)
    for i,(symbol,title,meaning) in enumerate(icons.LEGEND):
        x=32+(i//6)*281;y=654-(i%6)*81
        v.draw_icon(c,icons.SYMBOLS[symbol],x,y-7,30)
        txt(title,x+42,y+15,10.5,'Helvetica-Bold',TEAL)
        if symbol=='[twist]':meaning='Play during your Inkling space check in conflict. Numbered spaces grant no automatic Twist reward.'
        if symbol=='[curiosity]':meaning='Movement row. Memory reward: [overflow-ink] place 1 inkling into overflow on this book.'
        para(meaning,x+42,y+5,216,9.5,12,maxh=60)
    para('<b>PRINTING</b> / Use actual size (100%). Print pages 1-16 single-sided. Print conflict-token pages 17-18 together, double-sided, flip on the long edge.',32,199,548,9.5,12,maxh=30)
    line(32,162,580,162,GRAY)
    rect(35,117,25,25,None,TEAL,1)
    para('<b>Activation square</b><br/>Put one of your supply inklings here to use the adjacent character action. Each square can hold one inkling.',76,150,235,9.5,12,maxh=60)
    hexagon(348,128,18)
    para('<b>Memory hexagon</b><br/>A memory unlocks its board row and stays on a book space. It adds no power and does not fill the space.',376,150,202,9.5,12,maxh=60)
    para('<b>Erase</b> = return to current supply. &nbsp; <b>Suspend</b> = send to next Act reserve.<br/><b>Overflow</b> = extra ink on a book, outside numbered spaces. It adds power but never fills a space.',32,71,548,9.5,12,maxh=36)
    finish('Icon legend')

MARGIN=2*72/25.4
BOOK_W=(792-2*MARGIN)/2
BOOK_H=(612-2*MARGIN)/2

def book(b,x,y):
    c.saveState();c.translate(x,y);col=COLORS[b['genre']]
    w,h=BOOK_W,BOOK_H
    rect(0,0,w,h,white,INK,.8)
    rect(1,118,w-2,h-119,HexColor(PALE[b['genre']]),None)
    ht=para(b['title'],12,h-16,w-114,16,18,'Times-Bold',maxh=54)
    para(b['where'],12,h-ht-23,w-114,11.5,13,'Times-Italic',col,maxh=26)
    genre=b['genre'].upper()
    txt(genre,w-10-stringWidth(genre,'Helvetica-Bold',7),h-11,7,'Helvetica-Bold',col)
    rect(w-82,h-94,72,72,None,col,.9)
    txt('CONFLICT',w-46,h-40,8,'Helvetica-Bold',col,True)
    txt('+3 [pp]',w-46,h-69,19,'Helvetica-Bold',col,True)
    bx=(w-214)/2
    rect(bx,133,214,57,white,col,.65)
    effect_icon='conflict' if 'CONFLICT' in b['timing'] else 'ongoing'
    v.draw_icon(c,effect_icon,bx+7,171,12)
    txt(b['timing'],bx+24,176,7,'Helvetica-Bold',col)
    para(rich(b['effect']),bx+7,164,200,8.2,10,maxh=30)
    n=0
    for side,count in enumerate(b['page_slots']):
        width=count*54+(count-1)*4
        start=side*w/2+(w/2-width)/2
        for i in range(count):
            n+=1;xx=start+i*58
            assert xx>=side*w/2+4 and xx+54<=(side+1)*w/2-4
            rect(xx,53,54,54,None,HexColor('#000000'),.8);hexagon(xx+27,80,27)
            txt(str(n),xx+2,97,6.5,'Helvetica-Bold',GRAY)
            if b['title'] == 'Dracula' and n == 1: txt('CASTLE',xx+5,58,7,'Helvetica-Bold',col)
    if b['title'].startswith('20,000'):
        para('NO OVERFLOW / incoming overflow Inklings are suspended',10,29,w-20,8.2,10,color=col,align=1,maxh=12)
    else:
        rect(w/3,9,w/3,30,None,HexColor('#000000'),.8)
        txt('OVERFLOW',w/2,21,8,'Helvetica-Bold',GRAY,True)
    line(w/2,1,w/2,h-1,HexColor('#CFD5D6'),.55)
    c.restoreState()

def books():
    for start in range(0,9,4):
        c.setPageSize((612,792))
        for j,b in enumerate(BOOKS[start:start+4]):
            x=MARGIN+(j%2)*BOOK_H;y=MARGIN+(1-j//2)*BOOK_W
            c.saveState();c.translate(x+BOOK_H,y);c.rotate(90);book(b,0,0);c.restoreState()
        finish('Books / '+str(start//4+1),footer=False)

def card(kind,item,num,x,y):
    c.saveState();c.translate(x,y)
    genre=item['genre'] if kind=='Character' else kind
    col=COLORS[genre];rect(0,0,180,252,white,INK,.7)
    rect(1,221,178,30,HexColor(PALE[genre]),None)
    txt(kind.upper(),10,234,9.2,'Helvetica-Bold',col)
    if kind=='Character':txt('POWER '+str(item['power']),170-stringWidth('POWER '+str(item['power']),'Helvetica-Bold',8),234,8,'Helvetica-Bold',col)
    title=item['name'] if kind=='Character' else item[0]
    ht=para(escape(title),10,210,160,15.5,17,'Times-Bold',maxh=51);yy=210-ht-10
    if kind=='Twist':
        _,timing,effect,quote,source=item
        txt(timing,10,yy,7.5,'Helvetica-Bold',col)
        he=para(rich(effect),10,yy-9,160,10.2,12.8,maxh=116)
        assert yy-9-he>=77,(title,'effect/quote collision')
        hq=para('&quot;'+escape(quote)+'&quot;',10,67,160,8.5,10.4,'Times-Italic',GRAY,maxh=32)
        source_title,url=SOURCES[source]
        para('<link href="'+url+'">'+escape(source_title)+'</link>',10,67-hq-4,160,7,8.5,color=GRAY,maxh=26)
    elif kind=='Subplot':
        _,target,goal,reward=item
        txt('HIDDEN OBJECTIVE',10,yy,7,'Helvetica-Bold',col);yy-=10
        hg=para(goal,10,yy,160,9.5,11.6,maxh=92);yy-=hg+18
        txt('WHEN FULFILLED, CHOOSE ONE',10,yy,7,'Helvetica-Bold',col)
        hr=para('Draw 1 [character]<br/><b>OR</b> '+rich(reward),10,yy-8,160,9.7,12,maxh=61)
        assert yy-8-hr>=44,(title,'reward too low')
        line(10,39,170,39)
        para('Reveal, resolve, discard, then draw a new hidden Subplot. At most one completion per player turn.',10,33,160,7.3,8.6,color=GRAY,maxh=28)
    elif kind=='Character':
        txt(item['genre'].upper(),10,yy,7,'Helvetica-Bold',col);yy-=12
        for count,effect in item['actions']:
            for j in range(count):rect(10+j*25,yy-17,18,18,None,col,.8)
            yy-=24
            he=para(rich(effect),10,yy,160,9.3,11.4,maxh=72);yy-=he+12
        if item.get('collection'):
            txt('COLLECT YOUR ERASED INK',10,yy,7,'Helvetica-Bold',col);yy-=24
            for j in range(item['collection']):rect(10+j*29,yy,21,21,None,col,.8)
            yy-=9
        if item['passive']:
            symbol,effect=item['passive'];he=para('['+symbol+'] '+rich(effect),10,yy,160,9.1,11.2,maxh=108);yy-=he
        assert yy>=20,(title,'character text overflow',yy)
    else:
        txt('TROJAN HORSE / HIDDEN POWER',10,yy,6.8,'Helvetica-Bold',col)
        para('[combat] '+rich(item[1]),10,yy-13,160,10.8,13.5,maxh=120)
        para('Reveal at its book\'s next conflict.<br/>One use this Act.',10,45,160,8,10,color=GRAY,maxh=25)
    txt(num,148,5,5.5,color=GRAY);c.restoreState()
    card_checks.append({'kind':kind,'title':title})
def cards():
    # A shared card grid avoids mostly empty genre sheets.
    records=[('Twist',a) for a in TWISTS]+[('Subplot',a) for a in SUBPLOTS]+[('Character',a) for a in CHARACTERS]+[('Horse power',a) for a in HORSE]
    for start in range(0,len(records),9):
        c.setPageSize((612,792))
        for j,(kind,item) in enumerate(records[start:start+9]):
            row,col=divmod(j,3);card(kind,item,str(start+j+1).zfill(2),36+col*180,18+(2-row)*252)
        finish('Cards / '+str(start//9+1),footer=False)

def player_mark(index,x,y,size=12):
    v.draw_icon(c,PLAYERS[index]['icon'],x-size/2,y-size/2,size)

def player_box(index,x,y,w,h,fill=None,marks=True):
    color=HexColor(PLAYERS[index]['color'])
    rect(x,y,w,h,fill,color,1.8)
    if marks:
        for xx,yy in [(x,y),(x+w,y),(x,y+h),(x+w,y+h)]:player_mark(index,xx,yy,6)

def board(index,base_y):
    c.saveState();c.translate(0,base_y)
    player=PLAYERS[index];col=HexColor(player['color']);pale=HexColor(player['pale'])
    player_box(index,7,7,598,382,marks=False)
    player_mark(index,29,370,21)
    para('Cover each row with 3 matching memories. Uncover left to right.<br/>Resolve: choose any one available placement option.',52,376,538,8.5,10.2,maxh=24)
    for i,(key,name,base,levels,reward) in enumerate(TRACKS):
        yy=278-i*70
        player_box(index,18,yy,576,70,pale)
        v.draw_icon(c,icons.SYMBOLS['['+key+']'],25,yy+46,17)
        txt(name.upper(),50,yy+55,9,'Helvetica-Bold',col)
        para(base,26,yy+39,125,8.5,10,maxh=26)
        for j,value in enumerate(levels):
            xx=183+j*140
            polygon([(xx+27*math.cos(k*math.pi/3),yy+43+27*math.sin(k*math.pi/3)) for k in range(6)],white,col,1.8)
            v.draw_icon(c,icons.SYMBOLS['['+key+']'],xx-9,yy+34,18)
            txt(str(j+1),xx+21,yy+18,6.5,'Helvetica-Bold',col)
            para(value,xx+33,yy+63,89,8,9,maxh=45)
        player_box(index,24,yy+1,564,14,white)
        txt('MEMORIES',32,yy+5,6.5,'Helvetica-Bold',col)
        para(rich(reward),112,yy+12,470,8.5,10,maxh=11)
    for j,act in enumerate(('II','III')):
        xx=18+j*290;player_box(index,xx,18,286,40,pale)
        txt('ACT '+act+' RESERVE',xx+9,44,9,'Helvetica-Bold',col)
        txt('3 starting Inklings + suspended Inklings',xx+9,28,8.5)
    c.restoreState()

def boards():
    for start in (0,2):
        c.setPageSize((612,792))
        board(start,396);board(start+1,0)
        line(7,396,605,396,GRAY,.4)
        finish('Player boards / '+str(start+1)+' and '+str(start+2),footer=False)

def memories():
    c.setPageSize((612,792))
    txt('Memories',32,756,25,'Times-Bold')
    txt('12 per player / 3 per row',32,736,10,color=GRAY)
    benefits={'curiosity':'overflow-ink','valor':'points','insight':'twist','resolve':'early-inkling'}
    for index,player in enumerate(PLAYERS):
        col=HexColor(player['color']);top=685-index*168
        player_mark(index,42,top+17,20)
        txt(player['label'],61,top+13,11,'Helvetica-Bold',col)
        for k,(key,name,*_) in enumerate(TRACKS):
            row=k//2;colgroup=k%2
            for n in range(3):
                x=81+colgroup*276+n*72;y=top-32-row*72
                pts=[(x+27*math.cos(t*math.pi/3),y+27*math.sin(t*math.pi/3)) for t in range(6)]
                polygon(pts,white,col,.4)
                polygon([(x+25.6*math.cos(t*math.pi/3),y+25.6*math.sin(t*math.pi/3)) for t in range(6)],None,col,2.2)
                v.draw_icon(c,icons.SYMBOLS['['+key+']'],x-11,y-4,22)
                v.draw_icon(c,benefits[key],x-6,y-19,12)
                player_mark(index,x-17,y+1,7)
    finish('Memories / 48 hexagons')

def scoreboard():
    c.setPageSize((792,612));txt('Plot points',30,551,28,'Times-Bold')
    v.draw_icon(c,'points',202,545,28)
    for row in range(5):
        for j in range(20):
            n=row*20+j;col=j if row%2==0 else 19-j;x=30+col*36.6;y=322+(4-row)*36.6
            rect(x,y,36.6,36.6,HexColor('#EFF5F5') if n%10==0 else None,GRAY)
            txt(str(n),x+5,y+23,9,'Helvetica-Bold' if n%10==0 else 'Helvetica')
    txt('ACT',30,277,12,'Helvetica-Bold',TEAL)
    for i in range(3):
        rect(30+i*72,206,61,49,None,GRAY);txt(['I','II','III'][i],60+i*72,224,17,'Helvetica-Bold',center=True)
    txt('AVAILABLE TOKENS / CURRENT ACT',330,279,10,'Helvetica-Bold',TEAL)
    for i in range(4):rect(330+i*94,193,72,72,None,GRAY)
    para('Every conflict takes 1 token from this pool. Its last token ends the Act.',330,182,424,9,12,maxh=26)
    para('<b>CONFLICT REWARDS</b><br/>Uncovered book: +3 [pp] times the new token\'s multiplier.<br/>Covered book: no printed book points.<br/>Gain the new bonus and each older token\'s face-up reward; flip all to their backs.',30,155,367,10,14,maxh=98)
    para('<b>END OF ACT</b><br/>Last token used, or a player starts with no ink.<br/>Flip book tokens strong; uncover book VP spaces.<br/>Erase character-card ink; unlock the next reserve.<br/>Prepare Trojan Horse and the next Act\'s token pool.',415,155,347,10,14,maxh=98)
    finish('Scoreboard',792,612)

def token_face(act,name,effect,front,x,y):
    col=[BLUE,TEAL,GOLD][act-1]
    rect(x,y,72,72,white,col,.6)
    if front:
        rect(x+.7,y+58,70.6,13.3,HexColor(['#EEF6F7','#EEF7F2','#FAF4E8'][act-1]),None)
        txt('ACT '+['I','II','III'][act-1],x+36,y+62,6.8,'Helvetica-Bold',col,True)
        hn=para(escape(name),x+4,y+54,64,7.2,8,'Times-Bold',col,maxh=16)
        compact=effect.replace(' from your character cards','')
        compact=re.sub(r'\bTwists?\b','[twist]',compact)
        compact=compact.replace('activation Inklings','activation [ink]')
        he=para(rich(compact),x+4,y+51-hn,64,6.8,7.6,maxh=30.4)
        assert 51-hn-he>=16,('Token effect overlaps multiplier',name,he)
        txt('x'+str(act),x+36,y+5,9,'Helvetica-Bold',col,True)
    else:
        txt('ACT '+['I','II','III'][act-1],x+36,y+51,9,'Helvetica-Bold',col,True)
        txt(str(act)+' [pp]',x+36,y+23,17,'Helvetica-Bold',col,True)

def tokens():
    for front in (True,False):
        c.setPageSize((612,792))
        for act,items in TOKENS.items():
            for j,(name,strong,_) in enumerate(items):
                x=126+j*72;y=576-(act-1)*72
                if not front:x=612-x-72
                token_face(act,name,strong,front,x,y)
        finish('Conflict tokens / '+('fronts' if front else 'backs'),footer=False)

def pieces():
    c.setPageSize((612,792))
    txt('Quills, Inklings and score markers',28,754,22,'Times-Bold')
    para('Cut out and mount on card. Each player uses 1 Quill, 12 Inklings and 1 score marker. Start with 6 Inklings in supply and 3 in each later Act reserve. Use the shared Act marker on the scoreboard.',28,726,550,10,13,maxh=55)
    for index,player in enumerate(PLAYERS):
        y=622-index*140;col=HexColor(player['color'])
        txt(player['label'],28,y+32,11,'Helvetica-Bold',col)
        for k in range(12):
            x=45+(k%6)*43;yy=y-(k//6)*43
            c.setStrokeColor(col);c.setLineWidth(1.5);c.circle(x,yy,18,stroke=1,fill=0)
            v.draw_icon(c,'inkling',x-9,yy-9,18);player_mark(index,x+8,yy-10,7)
        c.setStrokeColor(col);c.circle(362,y-20,30,stroke=1,fill=0)
        v.draw_icon(c,'Quill',346,y-30,32);player_mark(index,381,y-40,10)
        txt('QUILL',362,y-65,8,'Helvetica-Bold',col,True)
        c.setStrokeColor(col);c.circle(475,y-20,22,stroke=1,fill=0)
        player_mark(index,475,y-20,24);txt('SCORE',475,y-58,8,'Helvetica-Bold',col,True)
    rect(28,36,36,36,None,TEAL);txt('ACT',46,49,10,'Helvetica-Bold',TEAL,True)
    finish('Player pieces / 4 Quills, 48 Inklings, 4 score markers, 1 Act marker')

rules();legend();books();cards()
boards();scoreboard();memories();pieces();tokens();c.save()
assert len(pages)==18,len(pages)
reader=PdfReader(str(PDF));assert len(reader.pages)==len(pages)
for i,p in enumerate(reader.pages):
    text=p.extract_text() or ''
    assert not v.PATTERN.search(text),('Unrendered icon',i)
    assert not re.search(r'\b(bookmark|Pathos|Love|Plotline|unpublished|sidekick|exhaust)\b',text,re.I),('Obsolete term',i)
thumbs=[]
for i in range(len(pages)):
    # Isolate each render so font-cache state cannot hide text on later sheets.
    doc=pdfium.PdfDocument(str(PDF));p=doc[i]
    im=p.render(scale=1.6).to_pil().convert('RGB');p.close();doc.close()
    im.save(QA/f'page-{i+1:02}.png')
    im.thumbnail((306,396));tile=Image.new('RGB',(322,424),'#D6DADD');tile.paste(im,((322-im.width)//2,8))
    ImageDraw.Draw(tile).text((8,405),f'{i+1}: {pages[i]}',fill='black');thumbs.append(tile)
for start in range(0,len(thumbs),6):
    im=Image.new('RGB',(966,848),'white')
    for j,t in enumerate(thumbs[start:start+6]):im.paste(t,((j%3)*322,(j//3)*424))
    im.save(QA/f'contact-{start//6+1}.png')
(ROOT.parent/'artifacts'/'print'/'qa.json').write_text(json.dumps({'pages':pages,'cards':card_checks,'book_slots':[b['slots'] for b in BOOKS],'icons':list(icons.SYMBOLS.values())},indent=2))
print(json.dumps({'pdf':str(PDF),'pages':len(pages),'cards':len(card_checks),'books':len(BOOKS),'tokens':sum(map(len,TOKENS.values()))}))
