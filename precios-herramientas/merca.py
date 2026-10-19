import json,sys,time,subprocess
# curl usa los certificados del sistema (el Python de python.org no los trae instalados)
def get(u):
    return json.loads(subprocess.run(["curl","-sS","--fail","-A","Mozilla/5.0 (Macintosh) recetario-precios/1.0",u],capture_output=True,check=True).stdout)
wh=sys.argv[1]
cats=get(f"https://tienda.mercadona.es/api/categories/?lang=es&wh={wh}")["results"]
prods=[]
for top in cats:
    for sub in top["categories"]:
        c=get(f"https://tienda.mercadona.es/api/categories/{sub['id']}/?lang=es&wh={wh}")
        for sec in c.get("categories",[]):
            for p in sec.get("products",[]):
                pi=p["price_instructions"]
                prods.append({"id":p["id"],"name":p["display_name"],"pack":p.get("packaging"),"cat":top["name"]+" / "+sub["name"],
                  "price":float(pi["unit_price"]),"size":pi.get("unit_size"),"fmt":pi.get("size_format"),"ref":pi.get("reference_price"),"reffmt":pi.get("reference_format"),"total_units":pi.get("total_units")})
        time.sleep(0.25)
json.dump({"wh":wh,"fecha":time.strftime("%Y-%m-%d"),"productos":prods},open(f"mercadona-{wh}.json","w"),ensure_ascii=False)
print(wh,len(prods))
