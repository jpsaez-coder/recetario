"""Genera precios.json para la app a partir de los cruces por cadena (casado-*.json)."""
import json,os,sys,time
# nombres de ingrediente (normalizados, sin tildes) que corresponden a cada producto
CLAVES={"mantequilla":["mantequilla"],"huevo":["huevo","huevos","yema","yemas","clara","claras","yemas de huevo","claras de huevo"],"azucar":["azucar","azucar blanco"],
 "aceite de oliva":["aceite de oliva","aceite","aceite de oliva virgen extra","aceite de oliva virgen"],"aceite de girasol":["aceite de girasol"],
 "leche":["leche","leche entera","leche semidesnatada","leche desnatada"],"leche sin lactosa":["leche sin lactosa"],"ajo":["ajo","ajos","diente de ajo","dientes de ajo"],
 "harina":["harina","harina de trigo"],"cebolla":["cebolla","cebollas"],"tomate":["tomate","tomates"],"patata":["patata","patatas"],
 "nata":["nata","nata liquida","nata para cocinar","nata para montar","nata fresca","nata espesa"],"pimenton":["pimenton","pimenton dulce"],"arroz":["arroz","arroz redondo"],
 "vinagre":["vinagre","vinagre de vino"],"limon":["limon","limones"],"pepino":["pepino","pepinos"],"chorizo":["chorizo"],"lechuga":["lechuga"],"platano":["platano","platanos"],
 "maicena":["maicena","harina fina de maiz"],"tomate triturado":["tomate triturado"],"tomate frito":["tomate frito"],"pollo":["pollo","pollo troceado"],
 "pechuga":["pechuga","pechugas","pechuga de pollo","pechugas de pollo"],"guisantes":["guisantes"],"jamon cocido":["jamon cocido"],"pan rallado":["pan rallado"],
 "pimiento":["pimiento","pimiento rojo","pimientos rojos","pimientos"],"pan":["pan","barra de pan"],"levadura":["levadura","levadura quimica"],"manzana":["manzana","manzanas"],
 "naranja":["naranja","naranjas"],"chocolate":["chocolate","chocolate negro","chocolate para fundir"],"aceitunas":["aceitunas","aceitunas sin hueso"],
 "atun":["atun","atun en aceite"],"sardinas":["sardinas","sardinas en tomate","sardinillas"],"cuscus":["cuscus","semola"],"caldo":["pastilla de caldo","pastillas de caldo"],
 "pasta":["pasta","macarrones"],"garbanzos cocidos":["garbanzos cocidos","garbanzos"],"galletas":["galletas","galletas maria"],"yogur":["yogur","yogur natural","yogures"],
 "queso rallado":["queso rallado"],
 "soja texturizada":["soja texturizada"],"tofu":["tofu","tofu firme"],"hamburguesa vegetal":["hamburguesa vegetal","hamburguesas vegetales","burger vegetal"],
 "salchichas vegetales":["salchichas vegetales","salchicha vegetal"],"chorizo vegetal":["chorizo vegetal"]}
CAD={"Mercadona":("casado-mercadona-mad3.json","28022 (en 28343, igual salvo céntimos)"),"Ahorramás":("casado-ahorramas.json",""),"Alcampo":("casado-alcampo.json","")}
out={"fecha":time.strftime("%Y-%m-%d"),"nota":"Precios de la web de cada cadena; cambian con el tiempo y entre tiendas.","claves":CLAVES,"cadenas":{}}
for cad,(f,cp) in CAD.items():
    if not os.path.exists(f):continue
    d=json.load(open(f,encoding="utf-8"))
    if len(d)<20:print("se omite",cad,"(solo",len(d),"productos)");continue
    # fruta, verdura suelta y pan: se compran por peso o pieza (precio por unidad, sin envase obligatorio)
    GRANEL={"tomate","pimiento","limon","manzana","naranja","platano","pan"}
    out["cadenas"][cad]={"cp":cp,"productos":{k:{"producto":v["producto"],"size":v["size"],"unit":v["unit"],"precio":v["precio"],**({"granel":True} if k in GRANEL else {})} for k,v in d.items()}}
json.dump(out,open(sys.argv[1],"w",encoding="utf-8"),ensure_ascii=False,indent=1)
print("cadenas:",{k:len(v["productos"]) for k,v in out["cadenas"].items()})
