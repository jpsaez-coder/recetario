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
vm.runInContext(m[1]+`\n;globalThis.__T={S,U,etiquetas,seccion,packFor,prodDe,macros,matches,aguaReceta,aguaMenu,ricoEn,shopList,all,getR,norm,vList,vMenu,compraTexto,cleanRecipe,corto,vImprimir,packKey,comidasVacias,vDias,RAC,tres,nombrePDF,vTopMenu,planIds,costeSlot,
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
caso("Mercadona tiene los 45",Object.keys(JSON.parse(fs.readFileSync(path.join(raiz,"precios.json"),"utf8")).cadenas.Mercadona.productos).length,45);
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
caso("imprimir: lo que hay en casa, en «Ya en casa»",/Ya en casa<\/b> Leche/.test(h),true);
caso("imprimir: lo de casa no sale en la compra",/<span>Leche <em>/.test(h),false);
Object.assign(T.S,JSON.parse(S0));}
caso("ninguna receta base trae foto",base.filter(r=>r.foto||r.fotoCredito).map(r=>r.id),[]);
{const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8");const lista=[...sw.slice(sw.indexOf("const FILES")).split("];")[0].matchAll(/"([^"]+)"/g)].map(m=>m[1]).filter(f=>f!=="./");
caso("el modo sin conexión pide más de 10 ficheros",lista.length>10,true);
caso("ningún SVG trae DOCTYPE ni ENTITY",fs.readdirSync(path.join(raiz,"fuego")).filter(f=>/<!(DOCTYPE|ENTITY)/.test(fs.readFileSync(path.join(raiz,"fuego",f),"utf8"))),[]);
caso("todo lo que pide el modo sin conexión existe",lista.filter(f=>!fs.existsSync(path.join(raiz,f))),[]);}
caso("el modo sin conexión no pide fotos",/fotos\//.test(fs.readFileSync(path.join(raiz,"sw.js"),"utf8")),false);
// versión: la visible y la del service worker, iguales
const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8").match(/^\/\/ versión (\S+)/m)?.[1];
caso("versión de sw.js = version.js",sw,T.APP_VERSION);
caso("el service worker guarda precios.json",/"precios\.json"/.test(fs.readFileSync(path.join(raiz,"sw.js"),"utf8")),true);
console.log(`\n${ok} bien, ${fallos} mal`);process.exit(fallos?1:0);
