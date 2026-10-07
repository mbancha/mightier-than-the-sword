"""Only the cut-down edition's icons; no automatic word substitutions."""
from pathlib import Path
import io, re, zipfile
from xml.etree import ElementTree as ET
from reportlab.graphics.shapes import Drawing, Path as ShapePath, Circle, Rect, Polygon, Group, Line
from reportlab.graphics import renderSVG
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
import pypdfium2 as pdfium
import vector_icons_v10 as v

SYMBOLS={'[ink]':'inkling','[quill]':'Quill','[character]':'character',
 '[twist]':'twist','[pp]':'points','[unlock]':'early-inkling',
 '[curiosity]':'pacing','[valor]':'tension','[insight]':'imagination','[resolve]':'voice',
 '[combat]':'conflict','[passive]':'ongoing','[overflow-ink]':'overflow-ink'}
LEGEND=[
 ('[ink]','Inkling','Your limited supply of ink. Each inkling on a book contributes 1 power.'),
 ('[quill]','Quill','Your quill and inkwell figure. Its power comes from Tension.'),
 ('[character]','Character','Draw the top character card when you gain one.'),
 ('[twist]','Twist','The shared deck of special effects.'),
 ('[pp]','Plot points','Your score. The most plot points wins.'),
 ('[unlock]','Unlock ink','Take ink from your next Act reserve into your current supply.'),
 ('[curiosity]','Pacing','Movement row. Memory reward: place 1 Inkling into the Background.'),
 ('[valor]','Tension','Quill power row. Memory reward: gain 1 plot point.'),
 ('[insight]','Imagination','Twist-draw row. Memory reward: draw 1 Twist.'),
 ('[resolve]','Voice','Placement row. Memory reward: unlock 1 inkling.'),
 ('[combat]','During conflict','A passive combat ability; no activation ink required.'),
 ('[passive]','Other passive','Use the printed timing; no activation ink required.')]

def configure():
    drawings={key:v.DRAWINGS[key] for key in SYMBOLS.values() if key in v.DRAWINGS}
    ink=HexColor(v.INK);teal=HexColor(v.TEAL);gold=HexColor(v.GOLD);paper=HexColor(v.PALE)
    d=Drawing(24,24)
    feather=Group();feather.add(v.DRAWINGS['inspiration']);feather.scale(.69,.69);feather.translate(10,10);d.add(feather)
    d.add(Rect(2,1,13,10,rx=2,ry=2,fillColor=teal,strokeColor=ink,strokeWidth=1.2))
    d.add(Rect(4,11,9,3,rx=.6,ry=.6,fillColor=paper,strokeColor=ink,strokeWidth=1.2))
    d.add(Circle(8.5,6,2.2,fillColor=gold,strokeColor=None))
    drawings['Quill']=d
    d=Drawing(24,24)
    d.add(Polygon([3,21,12,23,21,21,20,10,17,5,12,1,7,5,4,10],fillColor=gold,strokeColor=ink,strokeWidth=1.3))
    d.add(Polygon([12,19,14,14,19,14,15,11,16,6,12,9,8,6,9,11,5,14,10,14],fillColor=paper,strokeColor=None))
    drawings['valor']=d
    pacing=HexColor('#007F91');imagination=HexColor('#B87900');tension=HexColor('#D9472B');voice=HexColor('#7952B3')
    d=Drawing(24,24)
    d.add(Polygon([4.5,5.25,12.75,12,4.5,18.75,4.5,14.25,7.5,12,4.5,9.75],fillColor=pacing,strokeColor=None))
    d.add(Polygon([12.75,5.25,21,12,12.75,18.75,12.75,14.25,15.75,12,12.75,9.75],fillColor=pacing,strokeColor=None))
    drawings['pacing']=d
    d=Drawing(24,24)
    d.add(Circle(12,9.4,6.4,fillColor=imagination,strokeColor=None))
    d.add(Rect(9.4,14,5.2,4.2,fillColor=imagination,strokeColor=None))
    d.add(Rect(9.4,18.4,5.2,1.9,fillColor=imagination,strokeColor=None))
    d.add(Rect(10.5,21.1,3,1.1,fillColor=imagination,strokeColor=None))
    drawings['imagination']=d
    d=Drawing(24,24)
    d.add(Polygon([13.5,1.9,4.9,13.5,11.25,13.5,10.1,22.1,19.1,9.75,12.75,9.75],fillColor=tension,strokeColor=None))
    drawings['tension']=d
    d=Drawing(24,24)
    d.add(Rect(2.25,4.1,19.5,14.3,rx=3.4,ry=3.4,fillColor=voice,strokeColor=None))
    d.add(Polygon([5.6,16.8,5.6,22.1,10.9,18.4],fillColor=voice,strokeColor=None))
    drawings['voice']=d
    d=Drawing(24,24)
    g=Group();g.add(v.DRAWINGS['inkling']);g.scale(.62,.62);g.translate(7,13);d.add(g)
    d.add(Line(3,9,3,2,strokeColor=ink,strokeWidth=1.7))
    d.add(Line(3,2,21,2,strokeColor=ink,strokeWidth=1.7))
    d.add(Line(21,2,21,9,strokeColor=ink,strokeWidth=1.7))
    drawings['overflow-ink']=d
    # Player marks combine a unique silhouette with each player's border color.
    from catalog import PLAYERS
    for i,player in enumerate(PLAYERS):
        d=Drawing(24,24);color=HexColor(player['color'])
        if i==0:
            d.add(Circle(10,12,8,fillColor=None,strokeColor=color,strokeWidth=3))
            d.add(Circle(20,12,3,fillColor=color,strokeColor=None))
        elif i==1:
            d.add(Polygon([12,23,23,7,12,1,1,7],fillColor=color,strokeColor=None))
            d.add(Polygon([12,18,16,10,8,10],fillColor=HexColor('#FFFFFF'),strokeColor=None))
        elif i==2:
            for x,y in [(7,7),(17,7),(7,17),(17,17)]:d.add(Circle(x,y,5,fillColor=color,strokeColor=None))
            d.add(Circle(12,12,3,fillColor=HexColor('#FFFFFF'),strokeColor=None))
        else:
            for y in [4,13]:d.add(Polygon([1,y+7,12,y,23,y+7,20,y+10,12,y+5,4,y+10],fillColor=color,strokeColor=None))
        drawings[player['icon']]=d
    v.DRAWINGS=drawings;v.SYMBOLS=SYMBOLS
    v.PATTERN=re.compile('|'.join(re.escape(s) for s in sorted(SYMBOLS,key=len,reverse=True)))

def export(out):
    configure();folder=out/'Mightier_Current_Icons_v13';folder.mkdir(exist_ok=True)
    v.ASSET_DIR=folder
    buf=io.BytesIO();c=canvas.Canvas(buf,pagesize=(28,28))
    for key in v.DRAWINGS:v.draw_icon(c,key,2,2,24);c.showPage()
    c.save();doc=pdfium.PdfDocument(buf.getvalue())
    for i,(key,drawing) in enumerate(v.DRAWINGS.items()):
        im=doc[i].render(scale=24,fill_color=(0,0,0,0)).to_pil().convert('RGBA')
        bounds=im.getchannel('A').getbbox();im.crop(bounds).save(folder/(key+'.png'))
        svg=ET.fromstring(renderSVG.drawToString(drawing))
        x,y,r,b=[a/24-2 for a in bounds]
        svg.set('viewBox',f'{x:g} {y:g} {r-x:g} {b-y:g}')
        svg.set('width',f'{r-x:g}');svg.set('height',f'{b-y:g}')
        for child in list(svg):
            if child.tag.endswith('clipPath'):svg.remove(child)
        for group in svg.iter():
            if 'clip-path' in group.attrib.get('style',''):group.attrib.pop('style')
        ET.register_namespace('','http://www.w3.org/2000/svg')
        ET.ElementTree(svg).write(folder/(key+'.svg'),encoding='utf-8',xml_declaration=True)
    with zipfile.ZipFile(out/'Mightier_Current_Icons_v13.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(folder.iterdir()):z.write(p,p.name)
    return folder
