# Cómo trabajar el catálogo

Para cualquiera del equipo que toque categorías, filtros o el buscador.

## La regla que explica todo lo demás

**En VTEX una categoría no se puede borrar.** Solo desactivar. Lo mismo con
las especificaciones y sus valores. Un error aquí es permanente, así que todo
el trabajo está montado para que los errores salgan **antes** de crear nada.

## Nunca edites `store/**` a mano

Esa carpeta la genera `scripts/gen-categorias.py` desde
`catalogo/estructura-categorias-v2.json`, que es la única fuente. Si editas la
salida, el próximo que corra el generador borra tu cambio — y CI lo rechaza.

```bash
# 1. cambias el árbol
vim catalogo/estructura-categorias-v2.json

# 2. ves qué haría, sin escribir nada
python3 scripts/gen-categorias.py --dry-run

# 3. si está en verde, escribes
python3 scripts/gen-categorias.py
```

## Qué valida el generador, y por qué cada uno existe

Todos son bloqueantes: si alguno falla, **no se escribe nada**.

| Chequeo | Lo que evita | De dónde salió |
|---|---|---|
| `check_separadores` | `" - "` y `" / "` en nombres | VTEX corta el nombre ahí y el filtro lleva a una página vacía |
| `check_caracteres` | No ASCII que VTEX no translitera | `"Mazda 3 (3ª gen)"` daba dos rutas distintas, la del theme inexistente |
| `check_hojas_contenidas` | Dos hojas donde una contiene a la otra | `"Retenedores de motor"` convivió con `"Empaques y retenedores de motor"` |
| `check_sinonimos_vacios` | Listas de sinónimos vacías | Esconden la intención: o hay términos o no va la clave |
| `check_filtros` | Especificaciones mal definidas | El tipo de campo es **inmutable** en VTEX |
| `check_links` | Enlaces a rutas que no existen | Tras renombrar, el menú apuntaba a páginas muertas |

VTEX **sí** translitera `á é í ó ú ü ñ`. **No** translitera `ª º ° ½ × – '`.
Verificado contra las 597 categorías y los valores reales de la tienda.

## Antes de crear algo en VTEX

Los scripts que escriben en VTEX traen `--dry-run` por defecto y son
idempotentes. Córrelos sin `--ejecutar` y lee el plan.

```bash
python3 scripts/crear-categorias-vtex.py --tanda 2      # plan
python3 scripts/crear-categorias-vtex.py --verificar    # registro vs VTEX
python3 scripts/crear-especificaciones-vtex.py
python3 scripts/crear-productos-prueba.py
```

**`catalogo/categorias-vtex.json` es el registro de lo ya creado.** No lo
edites. El árbol de categorías de VTEX tarda minutos en reflejar lo recién
creado, y una corrida que lea de ahí vuelve a crear todo: así se duplicaron
88 categorías que siguen ahí, desactivadas, porque no se pueden borrar.

## Dos trampas de la API que cuestan caro

**Las especificaciones se mandan de a una.** La API acepta un lote y responde
`200`, pero solo aplica la primera. Las demás se pierden sin aviso.

**Un valor que no existe no da error.** VTEX lo ignora y el producto queda
invisible en ese filtro. Por eso `crear-productos-prueba.py` valida cada
valor contra la categoría antes de crear, y dice qué descartó.

## Pruebas

```bash
cd scripts/tests
python3 -m unittest test_gen_categorias    # 52
python3 -m unittest test_sinonimos         # 11
cd ../.. && node scripts/tests/cris.test.js  # 31
```

`test_store_blocks` tiene **10 fallos conocidos y anteriores** a este trabajo
(CSS, textos de otra tienda, tokens). No son tuyos: lo que importa es que el
número no suba.

## CI

`.github/workflows/catalogo.yml` corre todo esto en cada push y en cada PR
contra `release` y `master`. Incluye un chequeo de que lo generado coincide
con lo commiteado, para atrapar ediciones a mano en `store/**`.

## Flujo de ramas

```
release → feat/<tarea> → PR → release → promote → master
```

Cada quien linkea en su propio workspace (`devwilbis`, `devdiego`). Los
workspaces de producción no permiten `vtex link`; los de desarrollo no se
pueden promover.
