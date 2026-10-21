# Cloudflare: la app y las recetas que aporta la comunidad

Las recetas que la gente aporta van a una cola en Cloudflare (`functions/api/aportar.js`).
**No se publican solas**: se revisan con `bin/recoger`, y las aceptadas entran en
`recetas-base.json` con la siguiente versión.

Piezas:

| qué | dónde | para qué |
|---|---|---|
| proyecto de Pages conectado a GitHub | Cloudflare → Workers & Pages | sirve la app y ejecuta la función |
| cola `recetario-cola` (KV) | Cloudflare → Storage & Databases → KV | guarda lo enviado hasta revisarlo |
| widget de Turnstile | Cloudflare → Turnstile | comprueba que envía una persona |
| `TURNSTILE_SECRET` | variables del proyecto (secreto) | lo usa la función, nunca la app |
| token de solo KV | `~/.config/recetario/cloudflare.json` (600) | lo usa `bin/recoger` |

La función no guarda la IP. Para limitar a 10 envíos por persona y día guarda un
resumen (hash) de la IP y la fecha que caduca solo en 26 h.

## Pasos (una vez)

1. **Proyecto conectado a GitHub.** Un proyecto creado subiendo un zip no se puede
   pasar a Git, así que hay que crear otro: Workers & Pages → Create → Pages →
   *Connect to Git* → `jpsaez-coder/recetario`, rama `master`.
   - *Framework preset*: None.
   - *Build command*: vacío.
   - *Build output directory*: `/`.

   Si quieres el mismo nombre que el proyecto del zip, borra antes el viejo; si no, ponle
   otro. Desde aquí cada `bin/publicar` despliega solo, y se acaban los zips.
2. **La cola.** Storage & Databases → KV → *Create* → `recetario-cola`.
   Después, en el proyecto → Settings → Bindings → *Add* → KV namespace:
   - nombre de la variable: **`COLA`**
   - espacio: `recetario-cola`
3. **Turnstile.** Turnstile → *Add widget*:
   - nombre: Recetario
   - modo: *Managed*
   - dominios: `<proyecto>.pages.dev` y `jpsaez-coder.github.io`, más tu dominio si algún día lo pones.

   Te da dos claves:
   - **Site key** (pública): pásamela y la pongo en la app.
   - **Secret key**: no la pegues en el chat. Va al proyecto → Settings → Variables and
     Secrets → *Add* → tipo *Secret* → nombre **`TURNSTILE_SECRET`**.
4. **Volver a desplegar** para que coja la cola y el secreto: Deployments → el último → *Retry deployment*.
5. **Token para `bin/recoger`.** My Profile → API Tokens → *Create Token* → *Custom token*:
   - permisos: *Account* · *Workers KV Storage* · *Edit*;
   - recursos: solo tu cuenta.

   No se puede limitar a una sola cola: abre todos los KV de la cuenta, y por eso va solo en
   tu MacBook. Crea el fichero sin que el token pase por la línea de órdenes:
   ```sh
   mkdir -p ~/.config/recetario && touch ~/.config/recetario/cloudflare.json && chmod 600 ~/.config/recetario/cloudflare.json && open -e ~/.config/recetario/cloudflare.json
   ```
   y escribe dentro:
   ```json
   {"cuenta": "<Account ID>", "cola": "<ID de recetario-cola>", "token": "<el token>"}
   ```
   El *Account ID* sale en la portada de Workers & Pages; el ID de la cola, en la lista de KV.
6. **Decirme la dirección** del proyecto (`https://<proyecto>.pages.dev`) **y la site key**.
   Las pongo en `APORTA_WEB` y `APORTA_CLAVE` (index.html) y publico: hasta entonces el
   botón no sale.

## Revisar lo que llega

```sh
bin/recoger                 # lista lo pendiente; avisa si se parece a una que ya existe
bin/recoger ver <id>        # la enseña entera
bin/recoger aceptar <id>    # a recetas-base.json, con su autor; sale de la cola
bin/recoger descartar <id>  # sale de la cola sin más
```

Después de aceptar: `git diff recetas-base.json`, retocar lo que haga falta (nombre,
categorías, cantidades) y `bin/publicar X.Y.Z "…"`.

## Probar en local

```sh
npx wrangler@4.144.0 pages dev . --port 8788 --ip 127.0.0.1 --kv COLA --binding TURNSTILE_SECRET=1x0000000000000000000000000000000AA --binding ORIGENES=http://127.0.0.1:8788
```

En `localhost` la app usa la clave de prueba de Turnstile, que siempre pasa. Lo enviado
se queda en `.wrangler/` (ignorado por git):
`npx wrangler@4.144.0 kv key list --namespace-id COLA --local`.
