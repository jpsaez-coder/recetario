// Recetas que la comunidad aporta: llegan aquí, se comprueban y se guardan en la cola (KV «COLA»).
// No se publican solas: JPS las revisa con bin/recoger y las aceptadas entran en recetas-base.json.
// Variables del proyecto en Cloudflare: COLA (KV), TURNSTILE_SECRET (secreto), ORIGENES (opcional,
// separados por comas; por defecto la web de GitHub Pages). No se guarda la IP ni nada de quien envía.

const MAX_BYTES = 64 * 1024;
const MAX_DIA = 10; // envíos por persona y día
const UNIDADES = ["g", "kg", "ml", "l", "ud", "barra", "lata", "paquete", "diente", "cda", "cdta"]; // las de la app (UNITS)

const texto = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

/* Devuelve la receta limpia o un texto con lo que falla. Solo pasan los campos conocidos y con su tamaño. */
export function validar(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return "No llega ninguna receta.";
  const name = texto(r.name, 120);
  if (name.length < 3) return "La receta necesita un nombre.";
  if (!Array.isArray(r.ingredients) || !r.ingredients.length) return "La receta necesita ingredientes.";
  if (r.ingredients.length > 60) return "Demasiados ingredientes.";
  const ingredients = r.ingredients.map(i => ({
    name: texto(i && i.name, 80), qty: texto(i && i.qty, 20),
    unit: UNIDADES.includes(i && i.unit) ? i.unit : "ud", price: texto(i && i.price, 12)
  })).filter(i => i.name);
  if (!ingredients.length) return "La receta necesita ingredientes.";
  const steps = texto(Array.isArray(r.steps) ? r.steps.join("\n") : r.steps, 4000);
  if (steps.length < 10) return "Faltan los pasos.";
  const servings = Math.min(200, Math.max(1, Math.round(Number(r.servings)) || 4));
  const categories = (Array.isArray(r.categories) ? r.categories : []).map(c => texto(c, 30)).filter(Boolean).slice(0, 8);
  return { name, servings, categories, ingredients, steps };
}

function cabeceras(req, env) {
  const permitidos = (env.ORIGENES || "https://jpsaez-coder.github.io").split(",").map(s => s.trim()).filter(Boolean);
  const o = req.headers.get("Origin") || "";
  const mismo = o === new URL(req.url).origin;
  const ok = mismo || permitidos.includes(o);
  const h = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", Vary: "Origin" };
  if (ok && o) { h["Access-Control-Allow-Origin"] = o; h["Access-Control-Allow-Methods"] = "POST, OPTIONS"; h["Access-Control-Allow-Headers"] = "Content-Type"; h["Access-Control-Max-Age"] = "86400"; }
  return { h, ok };
}
const resp = (h, status, obj) => new Response(JSON.stringify(obj), { status, headers: h });

async function resumen(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestOptions({ request, env }) {
  const { h, ok } = cabeceras(request, env);
  return new Response(null, { status: ok ? 204 : 403, headers: h });
}

export async function onRequestPost({ request, env }) {
  const { h, ok } = cabeceras(request, env);
  if (!ok) return resp(h, 403, { error: "Origen no permitido." });
  if (!env.COLA || !env.TURNSTILE_SECRET) return resp(h, 503, { error: "El envío aún no está configurado." });
  const crudo = await request.text();
  if (crudo.length > MAX_BYTES) return resp(h, 413, { error: "La receta es demasiado grande." });
  let body; try { body = JSON.parse(crudo); } catch { return resp(h, 400, { error: "No se entiende lo enviado." }); }
  if (body.acepto !== true) return resp(h, 400, { error: "Falta aceptar que se publique." });

  // ¿es una persona? (Turnstile). La IP solo se le pasa a Cloudflare para esta comprobación.
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const f = new FormData(); f.append("secret", env.TURNSTILE_SECRET); f.append("response", texto(body.token, 2048)); if (ip) f.append("remoteip", ip);
  let humano = false;
  try { const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: f }); humano = !!(await v.json()).success; } catch { }
  if (!humano) return resp(h, 403, { error: "No se ha podido comprobar el envío. Vuelve a intentarlo." });

  const receta = validar(body.receta);
  if (typeof receta === "string") return resp(h, 400, { error: receta });

  // límite por persona y día, con un resumen de la IP que caduca solo (no se guarda la IP)
  const hoy = new Date().toISOString().slice(0, 10);
  const kl = "lim:" + await resumen(hoy + "|" + ip);
  const n = Number(await env.COLA.get(kl)) || 0;
  if (n >= MAX_DIA) return resp(h, 429, { error: "Hoy ya has enviado muchas. Prueba mañana." });
  await env.COLA.put(kl, String(n + 1), { expirationTtl: 60 * 60 * 26 });

  const id = new Date().toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomUUID().slice(0, 8);
  const aporte = { id, fecha: new Date().toISOString(), receta, autor: texto(body.autor, 60), origen: texto(body.origen, 200), app: texto(body.app, 20) };
  await env.COLA.put("p:" + id, JSON.stringify(aporte));
  return resp(h, 201, { ok: true, id });
}
