// Pruebas de la app: cargan el código de index.html con un navegador de mentira y comprueban
// casos que ya fallaron alguna vez (o que no deben fallar nunca). Uso: node pruebas/pruebas.mjs
import fs from "node:fs";import vm from "node:vm";import path from "node:path";
const raiz=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const html=fs.readFileSync(path.join(raiz,"index.html"),"utf8");
const m=html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);if(!m){console.error("no encuentro el script de la app");process.exit(2)}
const el=()=>({innerHTML:"",value:"",style:{},classList:{add(){},remove(){}},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],focus(){},setSelectionRange(){}});
const store={};
const ctx={console,setTimeout:(f)=>0,clearTimeout(){},URL,Blob:class{},File:class{},
  document:{querySelector:()=>el(),querySelectorAll:()=>[],addEventListener(){},getElementById:()=>el(),createElement:()=>el(),body:el()},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
  navigator:{},location:{protocol:"file:"},
  fetch:async u=>{const f=path.join(raiz,String(u).split("?")[0]);return {ok:fs.existsSync(f),json:async()=>JSON.parse(fs.readFileSync(f,"utf8"))}}};
ctx.window=ctx;ctx.self=ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz,"version.js"),"utf8"),ctx);
vm.runInContext(m[1]+`\n;globalThis.__T={S,U,etiquetas,seccion,packFor,prodDe,macros,matches,aguaReceta,aguaMenu,ricoEn,shopList,all,getR,norm,vList,vMenu,compraTexto,cleanRecipe,leerReceta,corto,vImprimir,vImprimirReceta,nombreReceta,objetivo,vegAdapta,altVeg,notaVeg,sueltosRecipe,HEADS,getM,aproxDe,packKey,comidasVacias,vDias,RAC,tres,nombrePDF,vTopMenu,planIds,costeSlot,
  setBase:b=>{BASE=b},setPrecios:p=>{PRECIOS=p},CLAVES:()=>PRECIOS&&PRECIOS.claves,FACETS,UNITS,APP_VERSION};`,ctx);
const T=ctx.__T;
T.setBase(JSON.parse(fs.readFileSync(path.join(raiz,"recetas-base.json"),"utf8")));
T.setPrecios(JSON.parse(fs.readFileSync(path.join(raiz,"precios.json"),"utf8")));
let fallos=0,ok=0;
const caso=(nombre,real,esperado)=>{const a=JSON.stringify(real),b=JSON.stringify(esperado);if(a===b)ok++;else{fallos++;console.log(`✗ ${nombre}\n   sale:     ${a}\n   esperado: ${b}`)}};
const R=(nombre,ings)=>({id:"t-"+nombre,name:nombre,servings:4,categories:["Principal"],ingredients:ings.map(([n,q,u])=>({name:n,qty:String(q??""),unit:u||"g",price:""})),steps:""});
const alerg=n=>T.etiquetas(R(n,[[n,100,"g"]])).alerg;
const tipos=n=>T.etiquetas(R(n,[[n,100,"g"]])).tipos;
// alérgenos: palabras que se parecen
caso("panceta no es pan",alerg("Panceta en dados").includes("Gluten"),false);
caso("pan duro lleva gluten",alerg("Pan duro").includes("Gluten"),true);
caso("yogur natural lleva lactosa",alerg("Yogur natural").includes("Lactosa"),true);
caso("leche sin lactosa no lleva lactosa",alerg("Leche sin lactosa").includes("Lactosa"),false);
caso("trigo sarraceno no es gluten",alerg("Harina de trigo sarraceno").includes("Gluten"),false);
caso("mayonesa lleva huevo",alerg("Mayonesa").includes("Huevo"),true);
caso("atún es pescado",alerg("Atún en aceite").includes("Pescado"),true);
caso("crema de cacahuete",alerg("Crema de cacahuete").includes("Cacahuete"),true);
caso("vinagre lleva sulfitos",alerg("Vinagre").includes("Sulfitos"),true);
// tipos
caso("salchichas son carne",tipos("Salchichas").includes("Carne"),true);
caso("caldo de cocido es carne",tipos("Caldo de cocido").includes("Carne"),true);
caso("tomate es vegetariano",tipos("Tomate").includes("Vegetariana"),true);
// secciones de la compra
caso("jamón cocido → charcutería",T.seccion("Pechuga de pavo o jamón cocido"),"Charcutería");
caso("garbanzos cocidos → conservas",T.seccion("Garbanzos cocidos"),"Conservas");
caso("sal → despensa",T.seccion("Sal"),"Despensa / baúl");
caso("salchichas → carne",T.seccion("Salchichas"),"Carne y pescado");
caso("pan de molde → panadería",T.seccion("Pan de molde"),"Panadería");
caso("tomate → fruta y verdura",T.seccion("Tomate"),"Fruta y verdura");
// formatos de venta (sin súper)
T.S.super="";T.S.packs={};
caso("sal se vende en 1 kg",T.packFor("Sal","g")?.size,1000);
caso("salchichas no son sal",T.packFor("Salchichas","g"),null);
// precios por cadena
T.S.super="Ahorramás";
caso("pan de molde no es la barra",T.prodDe("Pan de molde"),null);
caso("pan es la barra",!!T.prodDe("Pan"),true);
caso("aceite virgen extra → aceite de oliva",T.prodDe("Aceite de oliva virgen extra")?.k,"aceite de oliva");
caso("tomate frito no es tomate",T.prodDe("Tomate frito")?.k,"tomate frito");
caso("leche entera → leche",T.prodDe("Leche entera")?.k,"leche");
T.S.super="Mercadona";
caso("Mercadona no pierde productos al regenerar (al menos 45)",Object.keys(JSON.parse(fs.readFileSync(path.join(raiz,"precios.json"),"utf8")).cadenas.Mercadona.productos).length>=45,true);
T.S.super="";
// buscador
const busca=q=>T.all().filter(r=>T.matches(r,q)).map(r=>r.name);
caso("sopa no encuentra el San Jacobo",busca("sopa").some(n=>/San Jacobo/.test(n)),false);
caso("cous cous encuentra cuscús",busca("cous cous").some(n=>/cusc[uú]s/i.test(n)),true);
caso("proteína encuentra al menos 5",busca("proteína").length>=5,true);
caso("grasa no marca casi todo",busca("grasa").length<T.all().length/2,true);
// recetas base: datos sanos
const base=T.all();
caso("ids únicos",new Set(base.map(r=>r.id)).size,base.length);
caso("todas tienen plato",base.filter(r=>!r.categories.some(c=>T.FACETS[0].v.includes(c))).map(r=>r.name),[]);
caso("unidades válidas",base.flatMap(r=>r.ingredients.filter(i=>!T.UNITS.includes(i.unit)).map(i=>r.name+": "+i.unit)),[]);
caso("ningún ingrediente sin datos de macros",base.filter(r=>T.macros(r).sin.length).map(r=>r.name+": "+T.macros(r).sin),[]);
caso("kcal por persona razonables (40-1300)",base.filter(r=>{const k=T.macros(r).kcal;return k<40||k>1300}).map(r=>r.name+" "+Math.round(T.macros(r).kcal)),[]);
// agua
T.S.people=4;T.S.kids=0;
caso("bocadillo no hierve agua",T.aguaReceta(T.getR("ej-bocadillo-chorizo")),null);
caso("arroz con chorizo usa su propia agua",T.aguaReceta(T.getR("ej-arroz"))?.l,0.5);
T.S.menu=["mr-sopa-fideos-cocido"];T.S.plan={};
caso("el caldo no cuenta como agua que cargar",T.aguaMenu().l,0);
T.S.menu=[];
// recordatorio de copia de tus recetas
T.S.recipes=[R("Mía",[["Arroz",100,"g"]])];T.S.lastExport=null;T.S.remindAt=null;T.U.f={};T.U.q="";
caso("recuerda copiar si nunca se exportó",/sin copia todavía/.test(T.vList()),true);
T.S.lastExport=Date.now();caso("no molesta recién exportado",/sin copia/.test(T.vList()),false);
T.S.lastExport=Date.now()-40*864e5;caso("avisa a los 40 días",/hace 40 días/.test(T.vList()),true);
T.S.remindAt=Date.now()+864e5;caso("«Luego» lo calla",/sin copia/.test(T.vList()),false);
T.S.recipes=[];caso("sin recetas propias, sin aviso",(T.S.remindAt=null,/sin copia/.test(T.vList())),false);
// precios viejos
T.S.super="Mercadona";T.S.menu=["ej-arroz"];T.S.plan={};T.S.dias=1;
caso("precios recientes, sin aviso",/más de 3 meses/.test(T.vMenu()),false);
const pr=JSON.parse(fs.readFileSync(path.join(raiz,"precios.json"),"utf8"));pr.fecha="2020-01-01";T.setPrecios(pr);
caso("precios de hace años, con aviso",/más de 3 meses/.test(T.vMenu()),true);
T.setPrecios(JSON.parse(fs.readFileSync(path.join(raiz,"precios.json"),"utf8")));T.S.super="";T.S.menu=[];
// lista para WhatsApp: casillas ☐ y ☑ (lo que ya está en el carro)
{T.S.super="";T.S.have={};const its=T.shopList([T.getR("ej-arroz")],4);T.S.bought={[its[0].key]:true};const tx=T.compraTexto(its);
caso("WhatsApp: casilla vacía",/^☐ /m.test(tx),true);caso("WhatsApp: lo comprado, marcado",/^☑ /m.test(tx),true);caso("WhatsApp: sin viñetas",/^- /m.test(tx),false);T.S.bought={};}
// orden de las recetas: por plato, con su título y de la A a la Z
{T.U.f={};T.U.q="";T.S.recipes=[];T.U.ord="plato";const h=T.vList();
const tit=[...h.matchAll(/<h3 class="secc grp-t">([^<]+)<\/h3>/g)].map(m=>m[1]);
caso("grupos en el orden de Plato",tit,T.FACETS[0].v.filter(p=>tit.includes(p)));
caso("hay grupo de Desayuno y de Principal",tit.includes("Desayuno")&&tit.includes("Principal"),true);
T.U.ord="precio";const h2=T.vList();caso("por precio, sin títulos de grupo",/grp-t/.test(h2),false);
T.U.ord="kcal";const h3=T.vList();caso("orden antiguo «kcal» vuelve a por plato",/grp-t/.test(h3),true);caso("no se ofrece ordenar por calorías",/menos calorías|value="kcal"/.test(h3),false);T.U.ord="plato";}
// fotos: las base se retiraron en la 1.17.0; solo quedan las tuyas (r.foto="idb", en IndexedDB)
caso("foto base antigua se descarta",T.cleanRecipe({...T.getR("ej-arroz"),foto:"fotos/ej-arroz.jpg"}).foto,undefined);
caso("foto con ruta rara se descarta",T.cleanRecipe({...T.getR("ej-arroz"),foto:"javascript:alert(1)"}).foto,undefined);
// nombre corto del menú: cabe, no se repite (si dos se llaman igual no se distinguen) y la de usuario se recorta por palabras
caso("nombre corto: cabe en 24 letras",base.filter(r=>T.corto(r).replace("…","").length>24).map(r=>r.id),[]);
{const v=base.map(r=>T.corto(r));caso("nombre corto: no se repite",v.filter((c,i)=>v.indexOf(c)!==i),[]);}
caso("nombre corto: una tuya larga se recorta por palabras",T.corto({name:"Lentejas estofadas de la abuela con chorizo"}),"Lentejas estofadas…");
caso("nombre corto: una corta se queda igual",T.corto({name:"Pan con chocolate"}),"Pan con chocolate");
// menú: una receta puesta en dos días cuenta dos veces (compra y coste); sin día, una
{const g="ej-gachas-avena",avena=()=>{const it=T.shopList(T.planIds().map(T.getR),8).find(i=>/avena/i.test(i.name));return it?it.q:0};
const S0=JSON.stringify({menu:T.S.menu,plan:T.S.plan,dias:T.S.dias});
T.S.dias=2;T.S.menu=[g];T.S.plan={};const una=avena();
T.S.plan={"1|Desayuno":[g]};const unDia=avena();
T.S.plan={"1|Desayuno":[g],"2|Desayuno":[g]};const dos=avena();
caso("sin día cuenta una vez",unDia,una);
caso("en dos días, el doble de compra",Math.round(dos/una*100)/100,2);
caso("en dos días, cada día su coste",T.costeSlot(1,"Desayuno")>0&&T.costeSlot(1,"Desayuno")===T.costeSlot(2,"Desayuno"),true);
T.S.plan={"1|Desayuno":[g],"3|Desayuno":[g]};caso("un día por encima de los días del menú no cuenta",Math.round(avena()/una*100)/100,1);
Object.assign(T.S,JSON.parse(S0));}
// temporada: lo que no está marcado sale en invierno y en verano; lo de verano no sale en invierno
{T.U.q="";T.U.f={temp:"Invierno"};const h=T.vList();caso("en invierno salen los postres de todo el año",/Torrijas/.test(h)&&/Bizcocho dentro de una naranja/.test(h),true);
caso("en invierno no sale lo de verano",/Ensalada de cuscús para la mochila/.test(h),false);caso("en invierno sale lo de invierno",/Sopa de ajo castellana/.test(h),true);T.U.f={};}
// hoja para imprimir: días, receta con pasos, repetida avisada, básicos que faltan; arriba del menú, el recuento de básicos
{const S0=JSON.stringify({menu:T.S.menu,plan:T.S.plan,dias:T.S.dias,check:T.S.check});const g="ej-gachas-avena";
T.S.dias=2;T.S.menu=[g];T.S.plan={"1|Desayuno":[g],"2|Desayuno":[g]};T.S.check={};const h=T.vImprimir();
caso("imprimir: sale el día 2",/<h2>Día 2<\/h2>/.test(h),true);
caso("imprimir: la receta con sus pasos",/Gachas de avena con plátano<\/h3>/.test(h)&&/<ol>/.test(h),true);
caso("imprimir: avisa de que se hace 2 veces",/se hace 2 veces/.test(h),true);
caso("imprimir: la receta sale una vez aunque se repita",(h.match(/Gachas de avena con plátano<\/h3>/g)||[]).length,1);
caso("imprimir: lista los básicos que faltan",/Básicos que faltan/.test(h),true);
caso("arriba del menú: 0 de N básicos",/0 de \d+ en la caja/.test(T.vTopMenu()),true);
Object.assign(T.S,JSON.parse(S0));}
// sin cantidad solo pueden ir condimentos («al gusto»): un ingrediente principal sin cantidad no entra bien en la compra
{const ok=/^(sal|pimienta|aceite|aceite de oliva|ajo|perejil|tomillo|romero|laurel|canela|curri|azafr[aá]n|estrag[oó]n|albahaca|or[eé]gano|piment[oó]n|vinagre|ketchup|mostaza|nuez moscada|comino|hierbas|agua|lim[oó]n|az[uú]car glas|vainilla|salvia|cebollino|especias)$/i;
caso("ingredientes principales con cantidad",base.flatMap(r=>r.ingredients.filter(i=>!String(i.qty).trim()&&!i.name.trim().split(/ [ou] /).every(x=>ok.test(x.trim()))).map(i=>r.id+": "+i.name)),[]);}
// imprimir: el reparto en tres columnas no pierde, no repite y mantiene el orden; columnas equilibradas
{const bl=Array.from({length:10},(_,i)=>[`<b>${i}</b>`,i%3+1]),h=T.tres(bl),cols=h.split("</div><div>");
caso("tres: salen 3 columnas",(h.match(/<div>/g)||[]).length,3);
caso("tres: todo, una vez y en orden",[...h.matchAll(/<b>(\d)<\/b>/g)].map(m=>+m[1]).join(""),"0123456789");
caso("tres: ninguna columna vacía con 10 bloques",cols.every(c=>/<b>/.test(c)),true);
caso("tres: con un solo bloque no se rompe",(T.tres([["<b>x</b>",3]]).match(/<b>x<\/b>/g)||[]).length,1);}
// nombre del PDF: «Menú - actividad», sin caracteres que no admiten los ficheros
caso("nombre del PDF",T.nombrePDF("Acampada (2 días)"),"Menú - Acampada (2 días)");
caso("nombre del PDF sin barras ni dos puntos",T.nombrePDF("Ruta: día 1/2"),"Menú - Ruta día 1 2");
// compra: un mismo ingrediente sale en una sola línea (plural, sinónimo, otra unidad o «al gusto»)
{const it=T.shopList(base,8),k=it.map(i=>i.key.split("|")[0]);
caso("compra: ningún ingrediente repetido",k.filter((x,i)=>k.indexOf(x)!==i),[]);
const ac=it.filter(i=>/^aceite de oliva$/i.test(i.name));caso("compra: aceite de oliva en una línea y con cantidad",ac.length===1&&ac[0].q>0,true);
caso("compra: sin «aceite» suelto al gusto",it.some(i=>/^aceite$/i.test(i.name)),false);
caso("compra: sal, una línea",it.filter(i=>/^sal$/i.test(i.name)).length,1);
caso("compra: cebolla y cebollas juntas",it.filter(i=>/^cebollas?$/i.test(i.name)).length,1);
const R=(id,ings)=>({id,name:id,servings:1,categories:[],steps:"",ingredients:ings.map(([name,qty,unit])=>({name,qty:String(qty),unit,price:""}))});
const dos=T.shopList([R("a",[["Cebolla",2,"ud"]]),R("b",[["Cebollas",300,"g"]])],1).filter(i=>/cebolla/i.test(i.name));
caso("compra: 2 cebollas + 300 g = 600 g en una línea",dos.length===1&&Math.round(dos[0].q),600);}
// compra de un menú completo, hecha a mano: 8 personas, 2 días
// día 1: gachas + bocadillo de chorizo; día 2: pan con tomate + leche con cacao + bocadillo de chorizo
// pan: 2 barras×2 (bocadillo) ×2 días + 1×2 (pan con tomate) = 10 barras; leche: 1 l×2 + 1 l×2 = 4 l; chorizo: 160 g×2×2 = 640 g
{const S0=JSON.stringify({menu:T.S.menu,plan:T.S.plan,dias:T.S.dias,people:T.S.people,kids:T.S.kids,have:T.S.have,extras:T.S.extras,ajustes:T.S.ajustes});
Object.assign(T.S,{people:8,kids:0,dias:2,have:{},extras:[],ajustes:{},menu:["ej-gachas-avena","ej-bocadillo-chorizo","ej-pan-tomate","ej-leche-cacao"],
 plan:{"1|Desayuno":["ej-gachas-avena"],"1|Comida":["ej-bocadillo-chorizo"],"2|Desayuno":["ej-pan-tomate","ej-leche-cacao"],"2|Comida":["ej-bocadillo-chorizo"]}});
const it=T.shopList(T.planIds().map(T.getR),T.RAC()),q=re=>{const x=it.find(i=>re.test(i.name));return x?Math.round(x.q)+" "+x.unit:"no está"};
caso("menú completo: raciones",T.RAC(),8);
caso("menú completo: pan",q(/^pan$/i),"10 barra");
caso("menú completo: leche",q(/^leche$/i),"4000 ml");
caso("menú completo: chorizo",q(/^chorizo$/i),"640 g");
Object.assign(T.S,JSON.parse(S0));}
// imprimir: lo que solo se monta va en días y compra, no como receta; comidas vacías según la salida; ajustar al tocar la receta
{const S0=JSON.stringify({menu:T.S.menu,plan:T.S.plan,dias:T.S.dias,salida:T.S.salida});const U0={aj:T.U.aj,ajAt:T.U.ajAt};
Object.assign(T.S,{dias:2,salida:"finde",menu:["ej-pan-tomate","ej-gachas-avena"],plan:{"1|Comida":["ej-gachas-avena"],"2|Desayuno":["ej-pan-tomate"]}});
const h=T.vImprimir();
caso("imprimir: pan con tomate no sale como receta",/Pan con tomate y aceite<\/h3>/.test(h),false);
caso("imprimir: pan con tomate sale en el día",/<td>[^<]*Pan con tomate y aceite/.test(h),true);
caso("imprimir: pan con tomate en «se montan en el momento»",/Se montan en el momento[\s\S]*Pan con tomate/.test(h),true);
caso("imprimir: las gachas sí salen como receta",/Gachas de avena con plátano<\/h3>/.test(h),true);
caso("vacías acampada, día 1: sin desayuno no avisa; falta la cena",T.comidasVacias(1),["Cena"]);
caso("vacías acampada, último día: sin cena no avisa; falta la comida",T.comidasVacias(2),["Comida"]);
T.S.salida="ruta";T.S.dias=1;T.S.plan={"1|Desayuno":["ej-pan-tomate"]};caso("vacías ruta: solo pide la comida",T.comidasVacias(1),["Comida"]);
T.S.salida="reunion";caso("vacías reunión: no avisa",T.comidasVacias(1),[]);
T.S.salida="finde";T.S.dias=2;T.S.plan={"1|Comida":["ej-gachas-avena"],"2|Desayuno":["ej-pan-tomate"]};
T.U.aj="ej-gachas-avena";T.U.ajAt="1|Comida";const v=T.vDias();
caso("ajustar: el panel sale una vez",(v.match(/Ajustar: /g)||[]).length,1);
caso("ajustar: debajo de la comida tocada, no arriba",v.indexOf("Ajustar: ")>v.indexOf('data-k="1|Comida"'),true);
caso("ajustar: ya no hay botón «Ajustar» suelto",/>Ajustar<\/button>/.test(v),false);
Object.assign(T.S,JSON.parse(S0));Object.assign(T.U,U0);}
// variantes de color o tamaño: una línea con desglose; lo que es otro producto, aparte
{const it=T.shopList(base,8),cuenta=re=>it.filter(i=>re.test(i.name)).length;
caso("variantes: pimientos frescos en una línea",it.filter(i=>/^pimientos?\b/i.test(i.name)&&!/piquillo/i.test(i.name)).map(i=>i.name).length,1);
caso("variantes: los del piquillo siguen aparte",cuenta(/piquillo/i),1);
caso("variantes: patatas en una línea",cuenta(/^patatas?\b/i),1);
caso("variantes: galletas en una línea",cuenta(/^galletas?\b/i),1);
caso("variantes: pimentón en una línea (sin contar «pimentón u orégano»)",it.filter(i=>/^piment[oó]n\b/i.test(i.name)&&!/or[eé]gano/i.test(i.name)).length,1);
caso("variantes: azúcar glas sigue aparte",cuenta(/glas/i),1);
const R=(id,ings)=>({id,name:id,servings:1,categories:[],steps:"",ingredients:ings.map(([name,qty,unit])=>({name,qty:String(qty),unit,price:""}))});
const p=T.shopList([R("a",[["Pimiento rojo",1,"ud"]]),R("b",[["Pimiento verde",300,"g"]])],1).filter(i=>/pimiento/i.test(i.name));
caso("variantes: 1 pimiento rojo + 300 g verde = 450 g, con desglose",p.length===1&&Math.round(p[0].q)+" "+p[0].unit+" · "+p[0].det,"450 g · rojo 1 ud, verde 300 g");}
caso("singular: grandes, verdes, limones, nueces",["Patatas grandes","Pimientos verdes","Limones","Nueces"].map(x=>T.packKey(x,"ud").split("|")[0]),["patata grande","pimiento verde","limon","nuez"]);
// imprimir: lo comprado sale marcado y lo que hay en casa, en su línea
{const S0=JSON.stringify({menu:T.S.menu,plan:T.S.plan,dias:T.S.dias,bought:T.S.bought,have:T.S.have});
Object.assign(T.S,{dias:1,menu:["ej-gachas-avena"],plan:{"1|Desayuno":["ej-gachas-avena"]},bought:{},have:{}});
const it=T.shopList([T.getR("ej-gachas-avena")],T.RAC()),av=it.find(i=>/avena/i.test(i.name)),le=it.find(i=>/^leche$/i.test(i.name));
T.S.bought={[av.key]:true};T.S.have={[le.key]:true};const h=T.vImprimir();
caso("imprimir: lo comprado, marcado",/<li class="hecho"><span class="cb on"><\/span><span>Copos de avena/.test(h),true);
caso("imprimir: lo que hay en casa, en «Ya en casa o en el baúl»",/Ya en casa o en el baúl<\/b> Leche/.test(h),true);
caso("imprimir: lo de casa no sale en la compra",/<span>Leche <em>/.test(h),false);
Object.assign(T.S,JSON.parse(S0));}
// tarjeta: con supermercado elegido, nombra lo que va con precio aproximado; sin supermercado, nada
{const s0=T.S.super;T.S.super="Ahorramás";caso("aprox: pan con tomate en Ahorramás → tomate",T.aproxDe(T.getR("ej-pan-tomate")),["Tomate"]);
T.S.super="Mercadona";caso("aprox: pan con tomate en Mercadona → nada",T.aproxDe(T.getR("ej-pan-tomate")),[]);
T.S.super="";caso("aprox: sin supermercado no dice nada",T.aproxDe(T.getR("ej-pan-tomate")),[]);T.S.super=s0;}
// compra: lo que se vende en paquete sale en paquetes, no en unidades sueltas
{const s0=T.S.super;T.S.super="";const R=(id,ings)=>({id,name:id,servings:1,categories:[],steps:"",ingredients:ings.map(([name,qty,unit])=>({name,qty:String(qty),unit,price:""}))});
const it=T.shopList([R("a",[["Pan de hamburguesa",3,"ud"],["Mantequilla",300,"g"],["Yogur natural",5,"ud"]])],1),k=re=>{const x=it.find(i=>re.test(i.name));return x&&x.pk?x.k+" × "+x.pk.size+" "+x.unit:"suelto"};
caso("paquete: 3 panes de hamburguesa → 1 paquete de 4",k(/hamburguesa/i),"1 × 4 ud");
caso("paquete: 300 g de mantequilla → 2 de 250 g",k(/mantequilla/i),"2 × 250 g");
caso("paquete: 5 yogures → 2 de 4",k(/yogur/i),"2 × 4 ud");T.S.super=s0;}
// sueltos en las comidas: cada vez que se pone cuenta su cantidad; sin día, una vez
{const S0=JSON.stringify({menu:T.S.menu,plan:T.S.plan,dias:T.S.dias,people:T.S.people,kids:T.S.kids,extras:T.S.extras,have:T.S.have});
Object.assign(T.S,{people:8,kids:0,dias:2,have:{},menu:[],extras:[{id:"s1",name:"Sandía",qty:"1",unit:"ud",per:"fijo",price:"3"},{id:"s2",name:"Plátano",qty:"1",unit:"ud",per:"persona",price:""}],
 plan:{"1|Comida":["x:s2"],"2|Comida":["x:s2"]}});
const sr=T.sueltosRecipe(T.RAC(),T.HEADS()),rs=[...T.planIds().map(T.getM).filter(Boolean),...(sr?[sr]:[])],it=T.shopList(rs,T.RAC());
const q=re=>{const x=it.find(i=>re.test(i.name));return x?Math.round(x.q):0};
caso("sueltos: plátano por persona en 2 comidas = 16",q(/pl[aá]tano/i),16);
caso("sueltos: sandía sin día cuenta una vez",q(/sand[ií]a/i),1);
caso("sueltos: los puestos en un día no se cuentan otra vez como «sin día»",sr.ingredients.map(i=>i.name),["Sandía"]);
const h=T.vImprimir();caso("sueltos: salen en su comida al imprimir",/<td>Plátano<\/td>/.test(h),true);
caso("sueltos: no salen como receta ni en «se montan»",/Plátano<\/h3>/.test(h)||/Se montan en el momento[^<]*<\/b>[^<]*Plátano/.test(h),false);
Object.assign(T.S,JSON.parse(S0));}
// vegetarianos: 4 de 16 (una cuarta parte). La carne adaptable se reparte; la de «toque» se les quita; la que no se adapta, se avisa
{const S0=JSON.stringify({people:T.S.people,kids:T.S.kids,veg:T.S.veg,super:T.S.super});Object.assign(T.S,{people:16,kids:0,veg:4,super:""});
const compra=id=>T.shopList([T.getR(id)],T.RAC()),q=(it,re)=>{const x=it.find(i=>re.test(i.name));return x?Math.round(x.q)+" "+x.unit:"no está"};
const c1=compra("mr-picada-cuscus");
caso("veg: picada cuscús, carne para 12",q(c1,/^carne picada/i),"1125 g");
caso("veg: picada cuscús, soja texturizada para 4 (un tercio, en seco)",q(c1,/^soja texturizada/i),"125 g");
const c2=compra("ej-hamburguesas");
caso("veg: hamburguesas, carne para 12",q(c2,/^carne picada/i),"1500 g");
caso("veg: hamburguesas, 4 hamburguesas vegetales",q(c2,/^hamburguesa vegetal/i),"4 ud");
const c3=compra("ej-bocadillo-jamon-queso");
caso("veg: bocadillo de jamón, jamón solo para 12",q(c3,/^jam[oó]n cocido/i),"480 g");
caso("veg: bocadillo de jamón, sin sustituto",c3.some(i=>/vegetal/i.test(i.name)),false);
caso("veg: entrecot no se adapta",T.vegAdapta(T.getR("gpg-entrecot-a-la-parrilla-a-la-nizarda")),false);
caso("veg: «pan de hamburguesa» no es carne",T.vegAdapta(T.getR("ej-hamburguesas")),true);
caso("veg: gachas no llevan carne",T.vegAdapta(T.getR("ej-gachas-avena")),null);
const r=T.getR("mr-picada-cuscus");caso("veg: nota en la receta",T.notaVeg(r,r.ingredients.find(i=>/picada/i.test(i.name)),1),"Soja texturizada: 125 g para 4 (en seco: se hidrata 10 min en agua caliente)");
T.S.veg=0;caso("veg: sin vegetarianos, todo carne",q(compra("mr-picada-cuscus"),/^carne picada/i),"1500 g");
Object.assign(T.S,JSON.parse(S0));}
// «De casa» en una comida: cuenta como cubierta, no se compra ni cuenta en el menú, y sale al imprimir
{const S0=JSON.stringify({menu:T.S.menu,plan:T.S.plan,dias:T.S.dias,salida:T.S.salida});
Object.assign(T.S,{salida:"finde",dias:2,menu:["ej-gachas-avena"],plan:{"1|Comida":["__casa"],"1|Cena":["ej-gachas-avena"],"2|Desayuno":["ej-gachas-avena"],"2|Comida":["__casa"]}});
caso("de casa: la comida cuenta como cubierta",T.comidasVacias(1),[]);
caso("de casa: no cuenta en el menú",T.planIds().filter(x=>x==="__casa").length,0);
caso("de casa: no rompe la compra",T.shopList(T.planIds().map(T.getM).filter(Boolean),8).length>0,true);
{T.S.dias=3;const sin=T.objetivo(3).kcal;T.S.plan["3|Cena"]=["__casa"];caso("de casa: el objetivo del día no cambia",T.objetivo(3).kcal,sin);caso("de casa: la barra marca el 30 % de la cena como de casa",/class="tcasa" style="width:30%"/.test(T.vDias()),true);delete T.S.plan["3|Cena"];T.S.dias=2;}
caso("de casa: sale al imprimir",/<th>Comida<\/th><td>De casa<\/td>/.test(T.vImprimir()),true);
Object.assign(T.S,JSON.parse(S0));}
// receta en PDF: cabecera con el nombre, para el grupo, ingredientes y pasos; nombre del fichero
{const S0=JSON.stringify({people:T.S.people,kids:T.S.kids,veg:T.S.veg});Object.assign(T.S,{people:8,kids:0,veg:0});
const h=T.vImprimirReceta(T.getR("ej-gachas-avena"));
caso("PDF receta: título",/<h1>Gachas de avena con plátano<\/h1>/.test(h),true);
caso("PDF receta: para el grupo (8 raciones)",/Para 8 raciones/.test(h),true);
caso("PDF receta: avena escalada a 8 (480 g)",/Copos de avena<\/td><td class="q">480 g/.test(h),true);
caso("PDF receta: lleva los pasos",(h.match(/<li>/g)||[]).length,3);
caso("PDF receta: nombre del fichero",T.nombreReceta("Pan con tomate y aceite"),"Receta - Pan con tomate y aceite");
Object.assign(T.S,JSON.parse(S0));}
// leer una receta de un texto: con títulos, de un PDF de la app (dos líneas de título, raciones, categorías) y sin títulos
{const a=T.leerReceta("Lentejas con chorizo\nPara 4 personas\nIngredientes:\n- 300 g de lentejas\n- 1/2 cebolla\n- 3 cucharadas de aceite de oliva\n- Sal al gusto\n- 1 litro de agua\nPreparación:\n1. Pon las lentejas en remojo.\n2. Cuece 40 minutos.");
caso("leer: título",a.name,"Lentejas con chorizo");caso("leer: raciones",a.servings,4);
caso("leer: ingredientes",a.ingredients.map(i=>i.qty+" "+i.unit+" "+i.name),["300 g Lentejas","0.5 ud Cebolla","3 cda Aceite de oliva"," ud Sal","1 l Agua"]);
caso("leer: pasos sin numerar",a.steps,"Pon las lentejas en remojo.\nCuece 40 minutos.");
const b=T.leerReceta("RECETARIO\nPimientos rellenos de carne,\nchampiñones y zanahoria\nUnas 521 kcal por persona\nIngredientes\nPimientos rojos grandes 16 ud\nCarne picada mixta 1,2 kg\nPara 16 raciones\nPrincipal · Acampada\n21 de octubre de 2026\nPasos\nCorta la tapa\nRellena\nRecetario 1.25.0 · 21 de octubre de 2026");
caso("leer PDF de la app: título en dos líneas",b.name,"Pimientos rellenos de carne, champiñones y zanahoria");
caso("leer PDF de la app: raciones y categorías",b.servings+" "+b.categories.join(","),"16 Principal,Acampada");
caso("leer PDF de la app: cantidad al final",b.ingredients.map(i=>i.qty+" "+i.unit),["16 ud","1.2 kg"]);
caso("leer PDF de la app: pasos",b.steps,"Corta la tapa\nRellena");
const d=T.leerReceta("R E C E T A R I O\nTortilla\nPASOS\n1. Pela las patatas y córtalas finas, y fríelas en\nabundante aceite 15 min\n2. Bate los huevos");
caso("leer: letras espaciadas fuera del título",d.name,"Tortilla");
caso("leer: un paso en dos líneas se junta",d.steps,"Pela las patatas y córtalas finas, y fríelas en abundante aceite 15 min\nBate los huevos");
const c=T.leerReceta("Tortitas\n2 huevos\nun vaso de leche\nuna pizca de sal\nBate todo junto hasta que no queden grumos y deja reposar diez minutos.");
caso("leer sin títulos: vaso = 200 ml",c.ingredients.find(i=>/leche/i.test(i.name)).qty+" "+c.ingredients.find(i=>/leche/i.test(i.name)).unit,"200 ml");
caso("leer: raciones dentro de una frase",T.leerReceta("Bizcocho\nReceta fácil y esponjosa. Para 8 personas. Tiempo: 45 minutos.\nIngredientes\n3 huevos").servings,8);
caso("leer sin títulos: la frase larga es un paso",c.steps.startsWith("Bate todo"),true);}
caso("ninguna receta base trae foto",base.filter(r=>r.foto||r.fotoCredito).map(r=>r.id),[]);
{const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8");const lista=[...sw.slice(sw.indexOf("const FILES")).split("];")[0].matchAll(/"([^"]+)"/g)].map(m=>m[1]).filter(f=>f!=="./");
caso("el modo sin conexión pide más de 10 ficheros",lista.length>10,true);
caso("ningún SVG trae DOCTYPE ni ENTITY",fs.readdirSync(path.join(raiz,"fuego")).filter(f=>/<!(DOCTYPE|ENTITY)/.test(fs.readFileSync(path.join(raiz,"fuego",f),"utf8"))),[]);
caso("todo lo que pide el modo sin conexión existe",lista.filter(f=>!fs.existsSync(path.join(raiz,f))),[]);}
caso("el modo sin conexión no pide fotos",/fotos\//.test(fs.readFileSync(path.join(raiz,"sw.js"),"utf8")),false);
{const s0=T.S.super,v0=T.S.veg,r=T.getR("ej-arroz"),ch=r.ingredients.find(i=>/^chorizo/i.test(i.name));T.S.veg=2;
T.S.super="";caso("vegetal sin súper: chorizo vegetal",/^Chorizo vegetal/.test(T.notaVeg(r,ch,1)),true);
T.S.super="Mercadona";caso("vegetal en Mercadona (no hay chorizo vegetal): tofu",/^Tofu firme.*en Mercadona no hay chorizo vegetal/.test(T.notaVeg(r,ch,1)),true);
caso("vegetal en Mercadona: la compra lleva tofu, no chorizo vegetal",T.shopList([r],8).some(i=>/chorizo vegetal/i.test(i.name)),false);
T.S.super="Ahorramás";caso("vegetal en Ahorramás (tampoco hay): tofu",/^Tofu firme/.test(T.notaVeg(r,ch,1)),true);
T.S.super=s0;T.S.veg=v0;}
{const v0=T.S.veg,al0=T.S.alergias,m0=T.S.menu,p0=T.S.plan,s0=T.S.super;T.S.super="";T.S.alergias=[];
const pa=T.getR("gpg-paella-de-campamento");
caso("alternativa vegetariana: paella → arroz a la cubana",T.altVeg(pa)?.id,"gpg-arroz-a-la-cubana-de-campamento");
caso("las recetas base que no se adaptan tienen todas alternativa",T.all().filter(r=>T.vegAdapta(r)===false&&!T.altVeg(r)).map(r=>r.id),[]);
caso("la que se adapta no lleva alternativa",T.altVeg(T.getR("ej-arroz")),null);
T.S.alergias=["Lactosa"];const sj=T.altVeg(T.getR("gpg-san-jacobo-de-pavo"));
caso("con lactosa en el grupo, la alternativa no lleva lactosa",!!sj&&!T.etiquetas(sj).alerg.includes("Lactosa"),true);T.S.alergias=[];
const mia={id:"u-costillas",name:"Costillas al fuego",servings:4,categories:["Principal","Fuego"],steps:"",ingredients:[{name:"Costillas de cerdo",qty:"1",unit:"kg",price:"8"}]};
const am=T.altVeg(mia);caso("receta propia sin alternativa escrita: un principal vegetariano",!!am&&am.categories.includes("Principal")&&T.vegAdapta(am)===null&&!am.sencilla,true);
const pollo=its=>its.filter(i=>/pollo/i.test(i.name)).reduce((a,i)=>a+i.q,0);
T.S.veg=0;const sin=T.shopList([pa],16);T.S.veg=4;const con=T.shopList([pa],16);
caso("con vegetarianos, la paella lleva el pollo de los demás",Math.round(pollo(con)/pollo(sin)*100),Math.round((1-4/T.HEADS())*100));
caso("y la compra lleva lo del arroz a la cubana",con.some(i=>/^huevo/i.test(i.name))&&!sin.some(i=>/^huevo/i.test(i.name)),true);
T.S.menu=["gpg-paella-de-campamento"];T.S.plan={};const h=T.vImprimir();
caso("la hoja impresa trae la receta alternativa",/Arroz a la cubana[\s\S]*vegetarianos, en lugar de Paella/i.test(h),true);
T.S.veg=v0;T.S.alergias=al0;T.S.menu=m0;T.S.plan=p0;T.S.super=s0;}
// versión: la visible y la del service worker, iguales
const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8").match(/^\/\/ versión (\S+)/m)?.[1];
caso("versión de sw.js = version.js",sw,T.APP_VERSION);
caso("el service worker guarda precios.json",/"precios\.json"/.test(fs.readFileSync(path.join(raiz,"sw.js"),"utf8")),true);
console.log(`\n${ok} bien, ${fallos} mal`);process.exit(fallos?1:0);
