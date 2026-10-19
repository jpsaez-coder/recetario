# Herramientas de precios

Generan `../precios.json` (precios de la web de cada cadena, con fecha). Se ejecutan a mano,
desde esta carpeta; los catálogos descargados (`mercadona-*.json`, `norm-*.json`, `casado-*.json`)
se quedan aquí y no van a git.

    python3 -I merca.py mad3            # Mercadona, almacén del CP 28022 (mad1 = 28343)
    python3 -I ahorramas.py             # Ahorramás, una búsqueda por producto
    python3 -I casar.py norm-mercadona-mad3.json casado-mercadona-mad3.json
    python3 -I casar.py norm-ahorramas.json casado-ahorramas.json
    python3 -I generar.py ../precios.json

`productos.json` dice qué se busca y cómo se reconoce cada producto; `generar.py`, qué nombres de
ingrediente corresponden a cada uno y qué se compra a granel. Para el CP de Mercadona:
`PUT /api/postal-codes/actions/change-pc/` devuelve el almacén en la cabecera `x-customer-wh`.

Alcampo, Dia y Carrefour bloquean las consultas automáticas: no se rodea.
Después de regenerar, subir la versión (`bin/version`) para que los móviles la descarguen.
