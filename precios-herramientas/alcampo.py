"""Alcampo: una búsqueda por producto; los datos van en el estado de la página (productEntities)."""
import json,re,subprocess,time,urllib.parse
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def get(u):
    return subprocess.run(["curl","-sSL","--fail","-A",UA,u],capture_output=True,check=True).stdout.decode("utf-8","replace")
prods={};fallos=[]
UNI={"kg":"kg","litre":"l","liter":"l","l":"l","each":"ud","unit":"ud","100g":"100g","100ml":"100ml"}
for s in json.load(open("productos.json")):
    try: page=get("https://www.compraonline.alcampo.es/search?q="+urllib.parse.quote(s["q"]))
    except subprocess.CalledProcessError: fallos.append(s["q"]);continue
    for t in page.split('"productId":')[1:]:
        b=re.search(r'"brand":"((?:[^"\\]|\\.)*)"',t);n=re.search(r'"name":"((?:[^"\\]|\\.)*)","price":\{"current":\{"amount":"([\d.]+)"',t)
        u=re.search(r'"unit":\{"label":"fop\.price\.per\.([a-z0-9]+)","current":\{"amount":"([\d.]+)"',t)
        if not(n and u):continue
        name=json.loads('"'+n.group(1)+'"');brand=json.loads('"'+b.group(1)+'"') if b else ""
        if brand and name.upper().startswith(brand.upper()):name=name[len(brand):].strip()
        price=float(n.group(2));up=float(u.group(2));uu=UNI.get(u.group(1))
        if up<=0 or not uu:continue
        if uu=="kg":rec={"size":price/up,"fmt":"kg"}
        elif uu=="l":rec={"size":price/up,"fmt":"l"}
        elif uu=="100g":rec={"size":price/up/10,"fmt":"kg"}
        elif uu=="100ml":rec={"size":price/up/10,"fmt":"l"}
        else:rec={"size":round(price/up),"fmt":"ud"}
        m=re.search(r"pack (\d+)|(\d+) ?(?:x|latas|uds|unidades)\b",name,re.I)
        rec["units"]=int(m.group(1) or m.group(2)) if m and rec["fmt"]!="ud" else None
        prods[name+"|"+str(price)]={"name":name,"price":price,**rec}
    time.sleep(1)
json.dump(list(prods.values()),open("norm-alcampo.json","w"),ensure_ascii=False)
print("productos leídos:",len(prods),"| búsquedas fallidas:",fallos)
