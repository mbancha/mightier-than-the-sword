"""Original 24-unit vector pictograms; the same paths drive PDFs and SVGs."""
from pathlib import Path
import re, math, html, zipfile
from reportlab.graphics.shapes import Drawing, Path as ShapePath, Circle, Rect, Line, Polygon
from reportlab.graphics import renderPDF, renderSVG
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from ascii_icons_v09 import LEGEND

INK='#263D49';BLUE='#237B9C';TEAL='#207E71';GOLD='#B98020';RED='#B54551';PURPLE='#79539A';BROWN='#8E6442'
PALE='#F7F3E9'
KEYS=['inkling','inspiration','character','book','page','bookmark','twist','subplot','pathos','love','points','upgrade','plot','development','overflow','early-inkling','early-bookmark','curiosity','fellowship','insight','resolve','conflict','arrival','strength','move','carry','place','erase','discard','draw','hand','ongoing','exhaust','ready','turn','plotline']
SYMBOLS={s:k for (s,_),k in zip(LEGEND,KEYS)}
LABELS={k:label.split(';')[0].split(':')[0] for (_,label),k in zip(LEGEND,KEYS)}
LABELS.update({'points':'Plot points','plot':'Plot reward','arrival':'Character arrival','early-inkling':'Early inkling','early-bookmark':'Early bookmark','genre-voyages':'Voyages','genre-epics':'Epics','genre-gothic':'Gothic Horror'})
PATTERN=re.compile('|'.join(re.escape(s) for s in sorted(SYMBOLS,key=len,reverse=True)))
DRAWINGS={}
ASSET_DIR=None

def make(key):
    d=Drawing(24,24)
    def poly(points,fill=TEAL,stroke=INK,width=1.25):
        d.add(Polygon([v for xy in points for v in xy],fillColor=HexColor(fill) if fill else None,strokeColor=HexColor(stroke) if stroke else None,strokeWidth=width,strokeLineJoin=1))
    def rect(x,y,w,h,fill=PALE,stroke=INK,r=0,width=1.25):
        d.add(Rect(x,y,w,h,rx=r,ry=r,fillColor=HexColor(fill) if fill else None,strokeColor=HexColor(stroke) if stroke else None,strokeWidth=width))
    def circle(x,y,r,fill=TEAL,stroke=INK,width=1.25):
        d.add(Circle(x,y,r,fillColor=HexColor(fill) if fill else None,strokeColor=HexColor(stroke) if stroke else None,strokeWidth=width))
    def line(x,y,xx,yy,color=INK,width=1.7):
        d.add(Line(x,y,xx,yy,strokeColor=HexColor(color),strokeWidth=width,strokeLineCap=1))
    def path(ops,fill=None,stroke=INK,width=1.5):
        p=ShapePath(fillColor=HexColor(fill) if fill else None,strokeColor=HexColor(stroke) if stroke else None,strokeWidth=width,strokeLineCap=1,strokeLineJoin=1)
        for op,args in ops:
            {'M':p.moveTo,'L':p.lineTo,'C':p.curveTo,'Z':p.closePath}[op](*args)
        d.add(p)
    def arrow(x,y,xx,yy,color=TEAL,width=2.2):
        line(x,y,xx,yy,color,width)
        a=math.atan2(yy-y,xx-x)
        poly([(xx,yy),(xx-4*math.cos(a-.55),yy-4*math.sin(a-.55)),(xx-4*math.cos(a+.55),yy-4*math.sin(a+.55))],color,None)
    def drop(x=12,y=11,scale=1,color=TEAL):
        path([('M',(x,y+10*scale)),('C',(x-3*scale,y+4*scale,x-7*scale,y,x-6*scale,y-4*scale)),('C',(x-5*scale,y-11*scale,x+5*scale,y-11*scale,x+6*scale,y-4*scale)),('C',(x+7*scale,y,x+3*scale,y+4*scale,x,y+10*scale)),('Z',())],color)
        line(x-3*scale,y-3*scale,x-2*scale,y-5*scale,PALE,1.5)
    def ribbon(x=6,y=3,w=12,h=19):
        poly([(x,y+h),(x+w,y+h),(x+w,y),(x+w/2,y+4),(x,y)],RED)
        line(x+3,y+h-4,x+w-3,y+h-4,PALE,1.4)
    def card(x,y,w=11,h=15,fill=PALE):
        rect(x,y,w,h,fill,r=1)
    def node(x,y,color=TEAL):circle(x,y,2,color)
    def boot():
        path([('M',(9,21)),('L',(16,21)),('L',(15,11)),('L',(21,7)),('C',(23,5,21,3,19,3)),('L',(6,3)),('L',(6,8)),('L',(9,11)),('Z',())],BLUE)
        line(8,6,20,6,PALE,1.2)
    if key in ('inkling','early-inkling'):
        drop(11,12,.88)
        if key.startswith('early'):
            poly([(15,3),(19,6),(15,9)],GOLD,None);poly([(19,3),(23,6),(19,9)],GOLD,None)
    elif key=='inspiration':
        path([('M',(3,3)),('C',(6,9,5,19,21,22)),('C',(23,14,17,8,9,8)),('Z',())],GOLD)
        line(3,3,18,19,INK,1.6);line(12,13,17,13,PALE,1.4)
    elif key=='character':
        circle(12,17,4,PURPLE)
        path([('M',(3,2)),('C',(3,10,7,12,12,12)),('C',(17,12,21,10,21,2)),('Z',())],PURPLE)
        poly([(8,11),(12,5),(16,11),(12,12)],PALE,None)
    elif key=='book':
        path([('M',(2,4)),('L',(2,20)),('C',(6,22,9,21,12,18)),('C',(15,21,18,22,22,20)),('L',(22,4)),('C',(18,6,15,5,12,2)),('C',(9,5,6,6,2,4)),('Z',())],PALE)
        line(12,3,12,18,BROWN,1.6);line(5,16,9,15,BROWN,1.2);line(15,15,19,16,BROWN,1.2);line(5,12,9,11,BROWN,1.2);line(15,11,19,12,BROWN,1.2)
    elif key=='page':
        poly([(5,2),(20,2),(20,16),(14,22),(5,22)],PALE)
        poly([(14,22),(14,16),(20,16)],BLUE)
        line(8,11,16,11,BLUE);line(8,7,16,7,BLUE)
    elif key in ('bookmark','early-bookmark'):
        ribbon(5,2,11,20)
        if key.startswith('early'):
            poly([(16,4),(20,7),(16,10)],GOLD,None);poly([(20,4),(23,7),(20,10)],GOLD,None)
    elif key=='twist':
        path([('M',(3,6)),('C',(14,0,20,5,13,12)),('C',(6,19,10,23,19,19))],None,PURPLE,4)
        poly([(18,23),(23,17),(15,16)],GOLD,INK,1)
    elif key=='subplot':
        path([('M',(4,3)),('C',(0,3,0,8,4,8)),('L',(4,21)),('L',(19,21)),('C',(24,21,24,16,20,16)),('L',(20,3)),('Z',())],PALE)
        line(8,16,16,16,TEAL);line(8,12,16,12,TEAL);line(8,8,13,8,TEAL)
    elif key=='pathos':
        path([('M',(3,21)),('L',(21,21)),('L',(20,10)),('C',(18,1,6,1,4,10)),('Z',())],BLUE)
        line(7,15,9,16,PALE,1.8);line(15,16,17,15,PALE,1.8)
        path([('M',(8,8)),('C',(10,11,14,11,16,8))],None,PALE,1.6)
        drop(21,7,.27,TEAL)
    elif key=='love':
        path([('M',(12,2)),('C',(-3,12,1,24,10,20)),('L',(12,18)),('L',(14,20)),('C',(23,24,27,12,12,2)),('Z',())],RED)
    elif key=='points':
        circle(12,12,10,GOLD)
        pts=[(12+(7 if i%2==0 else 3)*math.sin(i*math.pi/5),12+(7 if i%2==0 else 3)*math.cos(i*math.pi/5)) for i in range(10)]
        poly(pts,PALE,None)
    elif key in ('upgrade','development'):
        poly([(2,12),(7,21),(17,21),(22,12),(17,3),(7,3)],TEAL if key=='upgrade' else PURPLE)
        if key=='upgrade':arrow(12,6,12,18,PALE,2.6)
        else:
            line(8,8,16,16,PALE,1.8);circle(8,8,2,PALE,None);circle(16,16,2,PALE,None)
    elif key in ('plot','plotline'):
        line(3,12,11,18,TEAL,2);line(3,12,11,6,TEAL,2);line(11,18,21,12,TEAL,2);line(11,6,21,12,TEAL,2)
        for x,y in ((3,12),(11,18),(11,6),(21,12)):node(x,y,GOLD if key=='plot' else BLUE)
        if key=='plot':circle(11,6,3,GOLD)
        else:line(11,18,11,6,BLUE,1.5)
    elif key=='overflow':
        rect(3,3,14,9,PURPLE,r=2);rect(5,12,10,3,PALE)
        path([('M',(7,15)),('C',(7,22,20,21,20,13))],None,PURPLE,2.4);drop(21,8,.3,PURPLE)
    elif key=='curiosity':
        circle(10,14,7,PALE,BLUE,2.3);line(15,9,22,2,BROWN,4)
        line(6,16,10,19,white.hexval(),1.4);circle(9,15,3,BLUE,None)
    elif key=='fellowship':
        poly([(1,15),(5,19),(11,15),(17,18),(23,14),(18,6),(14,4),(8,7)],GOLD)
        path([('M',(6,16)),('L',(11,11)),('L',(15,14)),('L',(20,9))],None,PALE,2)
        line(9,8,12,5,INK,1.2);line(12,10,16,6,INK,1.2)
    elif key=='insight':
        path([('M',(1,12)),('C',(8,23,16,23,23,12)),('C',(16,1,8,1,1,12)),('Z',())],PALE,PURPLE,1.8)
        circle(12,12,5,PURPLE);circle(12,12,2,INK,None);circle(10.5,14,1,PALE,None)
    elif key=='resolve':
        path([('M',(6,2)),('L',(5,8)),('L',(2,12)),('L',(3,16)),('L',(6,16)),('L',(6,21)),('L',(10,22)),('L',(13,21)),('L',(16,22)),('L',(21,20)),('L',(21,10)),('L',(17,6)),('L',(17,2)),('Z',())],RED)
        line(10,21,10,14,PALE,1.2);line(14,21,14,14,PALE,1.2);line(18,20,18,14,PALE,1.2);line(5,15,12,11,INK,1.2)
    elif key=='conflict':
        poly([(3,3),(6,2),(21,19),(22,23),(18,21)],RED)
        poly([(21,3),(18,2),(3,19),(2,23),(6,21)],GOLD)
        line(2,8,8,3,INK,2.1);line(16,3,22,8,INK,2.1)
    elif key=='arrival':
        rect(2,2,20,4,PALE,TEAL)
        circle(7,19,3,PURPLE)
        path([('M',(2,8)),('C',(2,15,12,15,12,8)),('Z',())],PURPLE)
        arrow(18,21,18,8,TEAL,2.3)
    elif key=='strength':
        path([('M',(2,3)),('L',(2,10)),('C',(4,14,7,14,9,10)),('L',(13,10)),('L',(11,17)),('L',(8,17)),('L',(8,21)),('L',(16,22)),('L',(22,9)),('C',(22,2,9,1,2,3)),('Z',())],RED)
        path([('M',(5,8)),('C',(7,11,10,10,11,7))],None,PALE,1.5)
    elif key=='move':
        boot();line(2,18,7,18,TEAL,1.7);line(1,14,6,14,TEAL,1.7);line(2,10,5,10,TEAL,1.7)
    elif key=='carry':
        path([('M',(7,18)),('C',(7,25,17,25,17,18))],None,BROWN,2.5)
        rect(2,3,20,16,BROWN,r=2);rect(2,11,20,8,GOLD,r=2);rect(10,9,4,6,PALE)
    elif key=='place':
        path([('M',(2,20)),('L',(10,20)),('L',(15,17)),('L',(21,17)),('L',(22,14)),('L',(13,13)),('L',(7,16)),('L',(2,16)),('Z',())],BROWN)
        drop(12,7,.35,TEAL);line(4,2,20,2,TEAL,2)
    elif key=='erase':
        poly([(2,8),(12,21),(22,13),(12,2),(7,2)],RED)
        poly([(2,8),(7,2),(12,2),(15,6),(6,13)],PALE)
        line(16,2,18,2,INK);line(21,2,22,2,INK)
    elif key=='discard':
        card(3,9,10,13)
        poly([(2,2),(22,2),(22,7),(18,7),(18,5),(6,5),(6,7),(2,7)],RED)
        arrow(18,21,18,9,RED)
    elif key=='draw':
        card(2,2,13,15);card(5,5,13,15,TEAL);arrow(21,5,21,22,GOLD)
    elif key=='hand':
        poly([(2,4),(0,18),(10,21),(14,5)],BLUE)
        poly([(10,5),(14,22),(24,18),(21,3)],TEAL)
        card(7,2,11,18,PALE)
    elif key=='ongoing':
        path([('M',(12,12)),('C',(3,26,-2,15,4,7)),('C',(9,1,13,15,18,18)),('C',(26,22,25,0,17,6)),('C',(15,7,13,10,12,12))],None,TEAL,3.5)
    elif key=='exhaust':
        line(5,22,19,22,BROWN,2.6);line(5,2,19,2,BROWN,2.6)
        path([('M',(6,21)),('C',(6,15,9,13,12,12)),('C',(15,11,18,9,18,3)),('L',(6,3)),('C',(6,9,9,11,12,12)),('C',(15,13,18,15,18,21)),('Z',())],PALE)
        poly([(8,4),(16,4),(12,9)],GOLD,None);poly([(8,18),(16,18),(12,13)],GOLD,None)
    elif key=='ready':
        circle(12,12,6,GOLD,INK)
        for a in range(0,360,45):
            ang=math.radians(a);line(12+8*math.cos(ang),12+8*math.sin(ang),12+11*math.cos(ang),12+11*math.sin(ang),GOLD,2)
    elif key=='turn':
        circle(12,11,9,PALE);rect(9,21,6,2,GOLD,INK)
        line(12,11,12,17,TEAL,2);line(12,11,17,9,TEAL,2);circle(12,11,1.3,GOLD,None)
    elif key=='genre-voyages':
        circle(12,12,10,PALE,BLUE)
        poly([(12,22),(9,10),(12,12),(15,14)],BLUE)
        poly([(12,2),(9,10),(12,12),(15,14)],GOLD)
    elif key=='genre-epics':
        path([('M',(3,21)),('L',(21,21)),('L',(20,10)),('C',(19,5,16,2,12,1)),('C',(8,2,5,5,4,10)),('Z',())],GOLD)
        poly([(12,19),(15,12),(12,5),(9,12)],PALE,None)
    elif key=='genre-gothic':
        path([('M',(1,18)),('L',(8,14)),('L',(10,19)),('L',(12,17)),('L',(14,19)),('L',(16,14)),('L',(23,18)),('L',(21,7)),('C',(18,12,17,8,16,6)),('C',(13,10,13,4,12,2)),('C',(11,4,11,10,8,6)),('C',(7,8,6,12,3,7)),('Z',())],PURPLE)
    else:raise KeyError(key)
    return d

for key in KEYS+['genre-voyages','genre-epics','genre-gothic']:DRAWINGS[key]=make(key)

def draw_icon(c,key,x,y,size):
    c.saveState();c.translate(x,y);c.scale(size/24,size/24)
    renderPDF.draw(DRAWINGS[key],c,0,0)
    c.restoreState()

def rich_width(s,size,font):
    pos=0;w=0
    for m in PATTERN.finditer(s):
        w+=stringWidth(s[pos:m.start()],font,size)+size*1.2
        pos=m.end()
    return w+stringWidth(s[pos:],font,size)

def draw_text(c,s,x,y,size,font,color,center=False):
    if center:x-=rich_width(s,size,font)/2
    pos=0
    for m in PATTERN.finditer(s):
        text=s[pos:m.start()];c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,text)
        x+=stringWidth(text,font,size)
        draw_icon(c,SYMBOLS[m[0]],x,y-size*.15,size*1.1);x+=size*1.2;pos=m.end()
    c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,s[pos:])

def markup(s,size):
    # Use native inline-image layout, but intercept drawing to paint vector paths.
    def replace(m):
        key=SYMBOLS[m[0]]
        return f'<img src="{(ASSET_DIR/(key+".png")).as_posix()}" width="{size*1.2}" height="{size*1.1}" valign="{-size*.15}"/>'
    s=s.replace('[@&gt;]','[@>]')
    # Do not strand punctuation after an inline pictogram on its own line.
    if any(s.endswith(symbol+'.') for symbol in SYMBOLS):s=s[:-1]
    return PATTERN.sub(replace,s)

def install_callback(c):
    original=c.drawImage
    def vector_image(image,x,y,width=None,height=None,*args,**kwargs):
        name=getattr(image,'fileName',image)
        if isinstance(name,(str,Path)):
            p=Path(name)
            if p.parent==ASSET_DIR and p.stem in DRAWINGS:
                draw_icon(c,p.stem,x,y,height)
                return (width,height)
        return original(image,x,y,width,height,*args,**kwargs)
    c.drawImage=vector_image

def export_assets(out):
    global ASSET_DIR
    folder=out/'Mightier_Vector_Icons';folder.mkdir(exist_ok=True)
    ASSET_DIR=folder
    keys=list(DRAWINGS)
    # Rasterize a vector PDF with transparent paper, then crop to actual alpha bounds.
    import io
    import pypdfium2 as pdfium
    from xml.etree import ElementTree as ET
    buffer=io.BytesIO();atlas=canvas.Canvas(buffer,pagesize=(28,28))
    for key in keys:draw_icon(atlas,key,2,2,24);atlas.showPage()
    atlas.save();doc=pdfium.PdfDocument(buffer.getvalue())
    for i,key in enumerate(keys):
        bitmap=doc[i].render(scale=24,fill_color=(0,0,0,0))
        im=bitmap.to_pil().convert('RGBA');box=im.getchannel('A').getbbox()
        assert box
        cropped=im.crop(box);cropped.save(folder/(key+'.png'))
        raw=renderSVG.drawToString(DRAWINGS[key])
        svg=ET.fromstring(raw)
        x,y,r,b=[v/24-2 for v in box]
        svg.set('viewBox',f'{x:g} {y:g} {r-x:g} {b-y:g}')
        svg.set('width',f'{r-x:g}');svg.set('height',f'{b-y:g}')
        for child in list(svg):
            if child.tag.endswith('clipPath'):svg.remove(child)
        for group in svg.iter():
            if 'clip-path' in group.attrib.get('style',''):group.attrib.pop('style')
        ET.register_namespace('','http://www.w3.org/2000/svg')
        ET.ElementTree(svg).write(folder/(key+'.svg'),encoding='utf-8',xml_declaration=True)
    # A single editable SVG sheet includes all original pictograms and plain labels.
    from reportlab.graphics.shapes import Group, String
    sheet=Drawing(612,1100)
    sheet.add(String(28,1070,'Mightier than the Sword - vector icon sheet',fontName='Helvetica-Bold',fontSize=17,fillColor=HexColor(INK)))
    for i,key in enumerate(keys):
        x=28+(i%4)*146;y=978-(i//4)*98
        g=Group();g.add(DRAWINGS[key]);g.translate(x+40,y);g.scale(2.2,2.2);sheet.add(g)
        sheet.add(String(x+67,y-17,LABELS[key],textAnchor='middle',fontName='Helvetica',fontSize=8,fillColor=HexColor(INK)))
    renderSVG.drawToFile(sheet,str(out/'Mightier_Vector_Icon_Sheet.svg'))
    pdf=canvas.Canvas(str(out/'Mightier_Vector_Icon_Sheet.pdf'),pagesize=(612,792))
    pdf.setTitle('Mightier than the Sword - original vector icon reference')
    for start in (0,20):
        pdf.setFillColor(HexColor(INK));pdf.setFont('Helvetica-Bold',18);pdf.drawString(30,752,'Mightier than the Sword')
        pdf.setFont('Helvetica',10);pdf.drawString(30,734,'Original vector icons / '+str(start//20+1)+' of 2')
        for j,key in enumerate(keys[start:start+20]):
            x=30+(j%4)*140;y=635-(j//4)*132
            draw_icon(pdf,key,x+38,y,60)
            pdf.setFillColor(HexColor(INK));pdf.setFont('Helvetica',9);pdf.drawCentredString(x+68,y-17,LABELS[key])
            # Print-size sample beside the large reference.
            draw_icon(pdf,key,x+62,y-42,12)
        pdf.showPage()
    pdf.save()
    (folder/'README.txt').write_text('Mightier than the Sword - original icon set\n\n39 unique icons, each supplied as an editable SVG and a transparent RGBA PNG.\nIndividual files are cropped to their visible artwork, with no blank padding.\nPNG files are rendered at 24 pixels per vector unit (roughly 576 px across a full-size icon). SVGs scale without loss.\nIcons use distinct silhouettes, dark outlines and a coordinated accent palette.\nThe prototype PDF draws the original vector paths directly; it does not embed these PNGs.\n\nPalette: ink #263D49; blue #237B9C; teal #207E71; gold #B98020; red #B54551; purple #79539A; brown #8E6442; paper #F7F3E9.\n',encoding='utf-8')
    with zipfile.ZipFile(out/'Mightier_Vector_Icons.zip','w',zipfile.ZIP_DEFLATED) as z:
        for f in sorted(folder.iterdir()):
            if f.suffix in ('.svg','.png','.txt'):z.write(f,'icons/'+f.name)
        z.write(out/'Mightier_Vector_Icon_Sheet.svg','Mightier_Vector_Icon_Sheet.svg')
    return len(keys)
