"""Rebuild the four GOST-shaped flowchart sheets; requires reportlab and Poppler."""
from pathlib import Path
import math
import subprocess
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent
FONT = os.environ.get('LAB_FONT', '/System/Library/Fonts/Supplemental/Arial.ttf')
pdfmetrics.registerFont(TTFont('Diagram', FONT))
C = canvas.Canvas(str(ROOT / 'flowchart.pdf'), pagesize=A4)
W, H = A4
S = W / 620

def start(title, number):
    C.saveState()
    C.scale(S, S)
    C.setLineWidth(1.3)
    text(310, 31, title, 17)
    text(310, 53, f'Схема example.ts · лист {number} из 4', 11)

def text(x, y, value, size=14):
    C.setFont('Diagram', size)
    for i, line in enumerate(value.split('\n')):
        C.drawCentredString(x, H / S - y - i * (size + 2) - size / 3, line)

def node(x, y, value, kind='rect', w=172, h=42, size=14):
    py = H / S - y
    if kind == 'diamond':
        p=C.beginPath();p.moveTo(x,py+h/2);p.lineTo(x+w/2,py);p.lineTo(x,py-h/2);p.lineTo(x-w/2,py);p.close();C.drawPath(p)
    elif kind == 'terminal':
        C.roundRect(x-w/2,py-h/2,w,h,h/2)
    elif kind == 'circle':
        C.circle(x,py,17)
    elif kind == 'io':
        p=C.beginPath();p.moveTo(x-w/2+15,py+h/2);p.lineTo(x+w/2,py+h/2);p.lineTo(x+w/2-15,py-h/2);p.lineTo(x-w/2,py-h/2);p.close();C.drawPath(p)
    else:
        C.rect(x-w/2,py-h/2,w,h)
    lines=len(value.split('\n'));text(x,y-(lines-1)*(size+2)/2,value,size)

def line(points, label=None, label_at=None):
    p=C.beginPath();p.moveTo(points[0][0],H/S-points[0][1])
    for x,y in points[1:]:p.lineTo(x,H/S-y)
    C.drawPath(p)
    x,y=points[-1];a,b=points[-2];angle=math.atan2(y-b,x-a)
    p=C.beginPath();p.moveTo(x,H/S-y)
    for delta in [-0.45,0.45]:
        px=x-7*math.cos(angle+delta);py=y-7*math.sin(angle+delta);p.lineTo(px,H/S-py);p.moveTo(x,H/S-y)
    C.drawPath(p)
    if label:text(*label_at,label,12)

def end():
    C.restoreState();C.showPage()

start('Инициализация и внешний цикл for',1)
node(210,90,'Начало','terminal');node(210,142,'total = 0');node(210,196,'values = [1, 2, 3]')
node(210,250,'labels = {a: "A", bb: "B"}',size=12);node(210,304,'i = 0');node(210,365,'i < 4?','diamond',h=66)
node(210,470,'i > 0?','diamond',h=66);node(210,567,'total += 1')
node(210,704,'++i');node(455,365,'F','circle');node(455,470,'S','circle');node(405,635,'I','circle')
for a,b in [(111,121),(163,175),(217,229),(271,283),(325,332)]:line([(210,a),(210,b)])
line([(210,398),(210,437)],'Да',(230,416));line([(296,365),(438,365)],'Нет',(365,351))
line([(296,470),(438,470)],'Да',(366,456));line([(210,503),(210,546)],'Нет',(234,523))
line([(210,588),(210,683)]);line([(388,635),(210,635),(210,683)])
line([(210,725),(210,744),(75,744),(75,365),(124,365)])
text(455,405,'F → лист 3',12);text(455,510,'S → лист 2',12);text(422,608,'I ← лист 2',12)
text(310,805,'Соединители с одной буквой обозначают продолжение потока.',12)
end()

start('switch как цепочка вложенных if',2)
node(160,90,'S','circle');node(160,158,'i === 1?','diamond',w=168,h=60)
line([(160,107),(160,128)])
node(455,158,'total === 0?','diamond',w=164,h=60)
line([(244,158),(373,158)],'Да',(304,144))
node(365,244,'total += 2',w=130);node(530,244,'total += 1',w=130)
line([(455,188),(455,208),(365,208),(365,223)],'Да',(384,195))
line([(537,158),(601,158),(601,211),(530,211),(530,223)],'Нет',(572,145))
line([(365,265),(365,284),(455,284),(455,303)]);line([(530,265),(530,284),(455,284),(455,303)])
node(455,322,'I','circle');text(507,319,'break',12)
for y,case,amount in [(389,2,3),(508,3,4),(627,4,5)]:
    node(160,y,f'i === {case}?','diamond',w=168,h=60)
    node(455,y,f'total += {amount}',w=166)
    node(455,y+65,'I','circle');text(506,y+65,'break',12)
    line([(244,y),(372,y)],'Да',(301,y-14));line([(455,y+21),(455,y+48)])
line([(160,188),(160,359)],'Нет',(184,268))
line([(160,419),(160,478)],'Нет',(184,451))
line([(160,538),(160,597)],'Нет',(184,570))
node(160,744,'total += 6');node(160,804,'I','circle')
line([(160,657),(160,723)],'Нет',(184,687));line([(160,765),(160,787)])
text(427,766,'default: без нового условия',12)
text(427,799,'Все I → лист 1, затем ++i',12)
end()

start('Циклы while, do-while и for-of',3)
node(163,92,'F','circle');node(163,149,'j = 0');node(163,224,'j < 2?','diamond',w=160,h=56)
node(163,298,'total += j',w=160);node(163,360,'++j',w=160)
line([(163,109),(163,128)]);line([(163,170),(163,196)])
line([(163,252),(163,277)],'Да',(187,266));line([(163,319),(163,339)])
line([(163,381),(163,399),(49,399),(49,224),(83,224)])
line([(243,224),(288,224),(288,429),(163,429),(163,443)],'Нет',(267,211))
node(163,464,'k = 0',w=160);node(163,526,'total += k',w=160);node(163,588,'++k',w=160)
node(163,663,'k < 2?','diamond',w=160,h=56);node(163,746,'R','circle')
line([(163,485),(163,505)]);line([(163,547),(163,567)]);line([(163,609),(163,635)])
line([(83,663),(49,663),(49,526),(83,526)],'Да',(63,648));line([(163,691),(163,729)],'Нет',(188,711))
node(452,92,'R','circle');node(452,153,'r = 0',w=190,h=55)
node(452,236,'r < values.length?','diamond',w=172,h=56);node(452,304,'value = values[r]',w=172)
node(452,362,'total += value',w=172);node(452,420,'++r',w=172)
line([(452,109),(452,125)]);line([(452,181),(452,208)]);line([(452,264),(452,283)],'Да',(477,276))
line([(452,325),(452,341)]);line([(452,383),(452,399)])
line([(452,441),(452,455),(338,455),(338,236),(366,236)])
line([(538,236),(589,236),(589,493),(452,493),(452,538)],'Нет',(565,222))
node(452,555,'Q','circle');text(452,603,'Q → лист 4',12)
text(163,790,'R: переход в правый столбец.',11)
text(452,650,'r раскрывает for-of массива.',11)
end()

start('Цикл for-in и завершение',4)
node(220,90,'Q','circle');node(220,151,'keys = ["a", "bb"]\nt = 0',h=55)
node(220,240,'t < keys.length?','diamond',w=198,h=64)
node(220,318,'key = keys[t]');node(220,380,'total += key.length');node(220,442,'++t')
line([(220,107),(220,123)]);line([(220,179),(220,208)])
line([(220,272),(220,297)],'Да',(244,285));line([(220,339),(220,359)]);line([(220,401),(220,421)])
line([(220,463),(220,483),(63,483),(63,240),(121,240)])
line([(319,240),(580,240),(580,518),(220,518),(220,539)],'Нет',(386,226))
node(220,570,'total < 0?','diamond',h=62);node(220,655,'total = 0')
line([(220,601),(220,634)],'Да',(244,615));line([(306,570),(520,570),(520,699),(220,699),(220,724)],'Нет',(380,556))
node(220,745,'console.log(total)','io',w=192);line([(220,676),(220,724)])
node(220,811,'Конец','terminal');line([(220,766),(220,790)])
text(452,326,'keys перечисляет ключи',11);text(452,345,'объекта labels из примера.',11)
text(452,388,'Скрытые t и keys показаны',11);text(452,407,'для раскрытия for-in.',11)
text(452,758,'Вывод: total = 20',12)
end()
C.save()
subprocess.run(['pdftoppm','-png','-r','150',str(ROOT/'flowchart.pdf'),str(ROOT/'flowchart')],check=True)
print(ROOT/'flowchart.pdf')
