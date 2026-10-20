"""Mercadona: pasa el catálogo descargado (mercadona-<almacén>.json) al formato común {name,price,size,fmt,units}.
Uso: python3 -I normmerca.py mad3   → norm-mercadona-mad3.json"""
import json,sys
wh=sys.argv[1]
d=json.load(open(f"mercadona-{wh}.json"))["productos"]
out=[{"name":p["name"],"price":p["price"],"size":p["size"],"fmt":(p["fmt"] or "").lower(),"units":p.get("total_units")} for p in d if p.get("size")]
json.dump(out,open(f"norm-mercadona-{wh}.json","w"),ensure_ascii=False)
print(wh,len(out),"productos")
