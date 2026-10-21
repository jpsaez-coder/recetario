// versión 1.25.1 — la escribe bin/version; si no cambia este fichero, el navegador no ve la actualización
importScripts("version.js");
const CACHE = "recetario-" + self.APP_VERSION;
const FILES = ["./", "index.html", "version.js", "recetas-base.json", "precios.json", "manifest.webmanifest",
  "fonts/bricolage-grotesque.woff2", "fonts/source-sans-3.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
  "fuego/cazador.svg", "fuego/estrella.svg", "fuego/cabana.svg", "fuego/antorcha-sueca.svg", "fuego/dakota.svg", "fuego/tipi.svg", "fuego/hogar-elevado.svg",
  "vendor/pdfjs/pdf.min.js", "vendor/pdfjs/pdf.worker.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("recetario-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la copia guardada: así abre igual sin cobertura. Las novedades llegan con una versión nueva.
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, {ignoreSearch: true}).then(hit => hit || fetch(r).catch(() => r.mode === "navigate" ? caches.match("index.html") : Response.error())));
});
