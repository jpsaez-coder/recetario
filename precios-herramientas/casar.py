"""Casa los 45 productos con el catálogo de una cadena y elige el más barato por unidad.
Entrada: lista normalizada [{name,price,size,fmt,units}] (fmt: kg|l|ud). Salida: {k:{...}}."""
import json,re,sys
def base(spec,p):
    u=spec["u"];fmt=(p.get("fmt") or "").lower();size=p.get("size") or 0;units=p.get("units")
    if u=="g": return size*1000 if fmt=="kg" else (size if fmt=="g" else None)
    if u=="ml": return size*1000 if fmt=="l" else (size if fmt=="ml" else None)
    if u in("ud","lata"):
        if units: return units
        if fmt=="ud": return size
        if spec["k"]=="pan" and fmt=="kg" and 0.15<=size<=0.4: return 1
        if spec["k"] in("pepino","lechuga") : return 1
    return None
def casar(specs,prods):
    out={}
    for s in specs:
        # en cadenas cuyo nombre no empieza por el producto («Pastilla de mantequilla»), sin anclar al principio
        pat=s["inc"].replace("^","") if SUELTO else s["inc"]
        inc=re.compile(pat,re.I);exc=re.compile(s["exc"],re.I) if s["exc"] else None
        c=[]
        for p in prods:
            n=p["name"]
            if not inc.search(n) or (exc and exc.search(n)):continue
            b=base(s,p)
            if not b or not p.get("price"):continue
            c.append((p["price"]/b,p,b))
        if not c:continue
        # para un grupo vale un formato grande, pero no una garrafa de 5 l de aceite
        mx=s.get("max",{"g":2000,"ml":1500}.get(s["u"]))
        cc=[x for x in c if not mx or x[2]<=mx] or c
        c=sorted(cc,key=lambda x:x[0])
        ppu,p,b=c[0]
        out[s["k"]]={"producto":p["name"],"size":round(b,3),"unit":s["u"],"precio":p["price"],"alternativas":len(c)-1}
    return out
SUELTO=False
if __name__=="__main__":
    SUELTO="--suelto" in sys.argv
    specs=json.load(open("productos.json"));prods=json.load(open(sys.argv[1]))
    r=casar(specs,prods);json.dump(r,open(sys.argv[2],"w"),ensure_ascii=False,indent=1)
    print(len(r),"de",len(specs),"| faltan:",", ".join(s["k"] for s in specs if s["k"] not in r))
