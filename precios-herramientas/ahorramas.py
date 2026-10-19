"""Ahorramás: una búsqueda por producto; de cada ficha, nombre, precio y precio por unidad."""
import json,re,subprocess,time,html,urllib.parse
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def get(u):
    return subprocess.run(["curl","-sSL","--fail","-A",UA,u],capture_output=True,check=True).stdout.decode("utf-8","replace")
num=lambda t:float(t.replace(".","").replace(",",".")) if "," in t else float(t)
prods={};fallos=[]
for s in json.load(open("productos.json")):
    try: page=get("https://www.ahorramas.com/buscador?q="+urllib.parse.quote(s["q"])+"&sz=48")
    except subprocess.CalledProcessError: fallos.append(s["q"]);continue
    for t in page.split('class="product-tile ')[1:]:
        n=re.search(r'class="link product-name-gtm"[^>]*>([^<]+)<',t)
        p=re.search(r'<span class="sales">\s*<span class="value" content="([\d.]+)"',t)
        u=re.search(r'unit-price-per-unit grey">\s*([\d.,]+)&euro;/([A-ZÁÉÍÓÚ]+)',t)
        if not(n and p and u):continue
        name=html.unescape(n.group(1)).strip();price=float(p.group(1));up=num(u.group(1));uu=u.group(2)
        if up<=0:continue
        if uu in("KILO","KG"):rec={"size":price/up,"fmt":"kg","units":None}
        elif uu in("LITRO","L"):rec={"size":price/up,"fmt":"l","units":None}
        elif uu in("UNIDAD","UD"):rec={"size":round(price/up),"fmt":"ud","units":None}
        elif uu=="DOCENA":rec={"size":round(12*price/up),"fmt":"ud","units":None}
        else:continue
        m=re.search(r"pack (\d+)|(\d+) ?(?:x|latas|uds|unidades)\b",name,re.I)
        if m and rec["fmt"]!="ud":rec["units"]=int(m.group(1) or m.group(2))
        prods[name+"|"+str(price)]={"name":name,"price":price,**rec}
    time.sleep(1)
json.dump(list(prods.values()),open("norm-ahorramas.json","w"),ensure_ascii=False)
print("productos leídos:",len(prods),"| búsquedas fallidas:",fallos)
