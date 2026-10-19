# Recetario de campamento y casa

PWA estática: se instala en el móvil y funciona sin conexión. Sin servidor ni cuentas:
cada persona guarda sus recetas en su dispositivo.

- `index.html` — toda la app.
- `recetas-base.json` — recetas que vienen con la app (no se borran; se copian para cambiarlas).
- `sw.js` — guarda la app para usarla sin conexión (primero la copia guardada).
- `version.js` — versión visible (al pie de la Guía).

## Cambiar algo y publicarlo

1. Editar y probar en local: `python3 -m http.server 8790` y abrir <http://localhost:8790>.
2. **Subir la versión** (obligatorio: si no, los móviles siguen con la copia guardada):
   `bin/version MAYOR.MENOR.PARCHE`
3. O todo de una vez: `bin/publicar X.Y.Z "qué cambia"` (pruebas, versión, commit, etiqueta, push y comprobación). Las pruebas solas: `node pruebas/pruebas.mjs`.

## Datos

Las recetas propias viven solo en cada dispositivo. La copia es responsabilidad de cada
persona: Guía → «Exportar mis recetas». Riesgo asumido por JPS el 19-10-2026: la app no
tiene servidor, así que no hay copia central.

Las funciones con Claude (crear, importar texto, precios aproximados) solo aparecen
cuando la página se abre como artefacto de claude.ai.
