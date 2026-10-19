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
vm.runInContext(m[1]+`\n;globalThis.__T={S,U,etiquetas,seccion,packFor,prodDe,macros,matches,aguaReceta,aguaMenu,ricoEn,shopList,all,getR,norm,vList,vMenu,compraTexto,cleanRecipe,
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
T.U.ord="precio";const h2=T.vList();caso("por precio, sin títulos de grupo",/grp-t/.test(h2),false);T.U.ord="plato";}
// fotos: la ruta de una foto base pasa por cleanRecipe; una ruta rara, no
caso("foto base se conserva",T.cleanRecipe({...T.getR("ej-arroz"),foto:"fotos/ej-arroz.jpg"}).foto,"fotos/ej-arroz.jpg");
caso("foto con ruta rara se descarta",T.cleanRecipe({...T.getR("ej-arroz"),foto:"javascript:alert(1)"}).foto,undefined);
// fotos base: el fichero existe, tiene crédito con enlace a Commons y está en la lista del modo sin conexión
{const conF=base.filter(r=>r.foto);const lista=fs.readFileSync(path.join(raiz,"fotos/lista.js"),"utf8");
caso("fotos base: el fichero existe",conF.filter(r=>!fs.existsSync(path.join(raiz,r.foto))).map(r=>r.id),[]);
caso("fotos base: con crédito de Commons",conF.filter(r=>!(r.fotoCredito&&/^https:\/\/commons\.wikimedia\.org\//.test(r.fotoCredito.pagina)&&r.fotoCredito.licencia)).map(r=>r.id),[]);
caso("fotos base: en la lista sin conexión",conF.filter(r=>!lista.includes(r.foto)).map(r=>r.id),[]);
caso("hay fotos base",conF.length>40,true);}
// versión: la visible y la del service worker, iguales
const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8").match(/^\/\/ versión (\S+)/m)?.[1];
caso("versión de sw.js = version.js",sw,T.APP_VERSION);
caso("el service worker guarda precios.json",/"precios\.json"/.test(fs.readFileSync(path.join(raiz,"sw.js"),"utf8")),true);
console.log(`\n${ok} bien, ${fallos} mal`);process.exit(fallos?1:0);
