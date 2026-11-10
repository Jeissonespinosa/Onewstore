# Onewstore — Store Theme (VTEX IO)

Theme de la tienda **Onewstore / Repuestox** construido sobre VTEX IO.
Es una app de tipo *store-theme*: solo contiene configuración de bloques (JSON/JSONC), rutas y CSS. **No hay código React ni build de Node** en este repositorio.

| | |
|---|---|
| Vendor | `onewstore` |
| App | `store-theme` |
| Versión | `5.2.0` |
| Builders | `store 0.x`, `styles 2.x`, `sitemap 0.x`, `docs 0.x` |

---

## Requisitos previos

1. **Node.js** 12 o superior (solo para instalar el CLI de VTEX).
2. **VTEX IO CLI**:
   ```bash
   npm install -g vtex
   ```
3. Acceso a la cuenta VTEX de la tienda y un rol con permisos para crear workspaces y hacer `link`.

---

## Cómo descargar y levantar el proyecto

```bash
# 1. Clonar el repositorio
git clone https://github.com/Jeissonespinosa/Onewstore.git
cd Onewstore

# 2. Iniciar sesión en la cuenta VTEX
vtex login <nombre-de-la-cuenta>

# 3. Crear (o entrar a) un workspace de desarrollo propio
vtex use mi-workspace

# 4. Enlazar el theme al workspace y ver los cambios en vivo
vtex link
```

Con `vtex link` corriendo, el CLI queda escuchando: cada vez que guardes un archivo de `store/` o `styles/`, el cambio se sincroniza al workspace y puedes verlo en la URL que imprime la terminal
(`https://mi-workspace--<cuenta>.myvtex.com`).

> **Importante:** no trabajes nunca directamente sobre `master`/producción. Cada persona debe usar su propio workspace (`vtex use su-nombre`).

### Comandos útiles

```bash
vtex whoami            # ver cuenta y workspace actual
vtex workspace list    # listar workspaces
vtex ls                # ver apps linkeadas en el workspace
vtex unlink            # dejar de enlazar el theme
vtex browse            # abrir la tienda del workspace en el navegador
```

---

## Estructura del repositorio

```
manifest.json          Declaración de la app: vendor, versión, builders y dependencias VTEX
store/
  blocks.jsonc         Punto de entrada que importa todos los demás archivos de bloques
  routes.json          Rutas personalizadas (landings y páginas de categoría)
  blocks/
    header/            Header, menú de categorías
    footer/            Footer y su menú
    home/              Home, landings (carros / motos) y páginas de categoría
                       (category-*.jsonc: GENERADAS, ver abajo)
    pdp/               Página de producto: assembly, gifts, tabla de especificaciones
    product-summary/   Tarjeta de producto, quickview, listas
    categories.jsonc   Plantillas de las páginas de línea de producto
    about-us.json, faq.jsonc, contact.jsonc, search.jsonc, minicart.jsonc, ...
styles/
  configs/style.json   Tokens del theme: colores, tipografías, espaciados
  css/                 Overrides de CSS por app (vtex.store-header.css, vtex.flex-layout.css, ...)
sitemap/               Configuración del sitemap
docs/                  Documentación y assets de apoyo (contact-schema.json, Buton.png)
catalogo/              Estructura de categorías (CSV + JSON) e íconos SVG por categoría
scripts/               gen-categorias.py (páginas de categoría) y gen-sinonimos.py
                       (CSV de sinónimos para Intelligent Search); tests en scripts/tests/
```

### Páginas de categoría (generadas)

Las rutas `/carros/...`, `/motos/...` y `/herramientas/...` (macro → subcategoría →
tipo de producto, ~600 páginas) **no se editan a mano**: salen de
`catalogo/estructura-categorias-v2.json` (la fuente; el orden de las macros es el
orden en que se muestran) con

```bash
python3 scripts/gen-categorias.py            # listados vacíos (placeholder)
python3 scripts/gen-categorias.py --real     # cuando las categorías ya existan en el catálogo
python3 scripts/gen-categorias.py --dry-run  # enumera lo que escribiría, sin tocar nada
python3 scripts/gen-categorias.py --force    # escribe aunque haya enlaces rotos o rutas manuales
python3 -m unittest scripts/tests/test_gen_categorias.py
```

Valida las entradas antes de escribir, escribe de forma atómica (temporal + `os.replace`,
así un fallo no deja el theme a medias), aborta si un enlace interno apunta a una ruta
inexistente o si se perdería una ruta hecha a mano (queda registrada en
`catalogo/rutas-eliminadas.txt`).

Escribe `store/routes.json` (conserva las rutas que no son de categoría), exporta
`catalogo/estructura-categorias-v2.csv` (rutas + sinónimos, para el admin) y, en
`store/blocks/home/`: `category-rail.jsonc` (cuadrícula "Explora por categoría" de
las landings y la landing `/herramientas`), `category-pages-<sección>.jsonc` (banner,
"Volver" de cada página), `category-grids-<sección>.jsonc` (cuadrícula de hijos),
`category-listing.jsonc` (listado + consulta por página) y `category-filters.jsonc`
(filtros + selector de vehículo en las hojas de carros y motos). Para cambiar una
categoría, edita el JSON y vuelve a correr el script (valida solo que ningún enlace interno apunte a una ruta inexistente);
después reinicia `vtex link`
(el relink incremental rechaza los archivos grandes).

### Medidas de las imágenes

| Dónde | Bloque (`src`) | Medida | Notas |
|---|---|---|---|
| Hero de `/carros` y `/motos` (slider) | `image#rx-<sec>-slide-N-img` | 1600×700 JPG | El texto va a la izquierda con velo oscuro; motivo a la derecha |
| Banner de cada categoría (campaña) | `image#rx-p-<página>-banner-img` | 1600×400 JPG/PNG | Igual: texto a la izquierda, motivo a la derecha. Se recorta (cover) según el ancho |
| Tarjetas del rail de macros | `image#rx-<sec>-linea-NN-img` | 800×500 PNG | Fondo blanco o transparente, producto centrado |
| Tarjetas de subcategorías y tipos | `image#rx-g-<página>-<hijo>-img` | 800×500 PNG | Misma tarjeta que las macros |
| Home: mitad Carros / Motos | `image#repuestox-split-*-bg` | 1200×1400 JPG | Vertical, se recorta a la mitad de la pantalla |
| Home: franja HERRAMIENTAS (bajo el selector) | `image#repuestox-split-herramientas-bg` | 1920×600 JPG | De lado a lado, proporción 16:5; la palabra va centrada, dejar el centro despejado. Hoy lleva una ilustración vectorial |
| Marcas (logos) | `image#repuestox-brand-N-*` | 360×112 PNG | Se muestra a 180×56, fondo transparente |

### Sinónimos de Intelligent Search

```bash
python3 scripts/gen-sinonimos.py            # escribe los CSV
python3 scripts/gen-sinonimos.py --dry-run  # solo informa
python3 -m unittest scripts/tests/test_sinonimos.py
```

Lee `_sinonimos` del mismo JSON del catálogo y escribe
`catalogo/sinonimos-intelligent-search-N.csv` (formato bidireccional de VTEX,
`términos,separados,por,coma;true`, máximo 20 KB por archivo — el script corta en 16 KB)
y `catalogo/sinonimos-conflictos.txt` con los términos descartados y las decisiones que
debe tomar el negocio. Se importan en *Admin › Storefront › Intelligent Search ›
Sinónimos › Importar*, un archivo a la vez; tardan hasta 2 horas en aplicar.

### Rutas personalizadas

Definidas en `store/routes.json`:

| Path | Bloque |
|---|---|
| `/carros` | `store.custom#landing-carros` |
| `/motos` | `store.custom#landing-motos` |
| `/about-us` | `store.custom#about-us` |
| `/faq` | `store.custom#faq` |
| `/contact-us` | `store.custom#contact-us` |
| `/linea-productos/baterias` | `store.custom#categoria-baterias` |
| `/linea-productos/lubricantes` | `store.custom#categoria-lubricantes` |
| `/linea-productos/autopartes` | `store.custom#categoria-autopartes` |
| `/linea-productos/motopartes` | `store.custom#categoria-motopartes` |
| `/linea-productos/equipos-de-diagnostico` | `store.custom#categoria-equipos-diagnostico` |
| `/linea-productos/sistemas-de-respaldo` | `store.custom#categoria-sistemas-respaldo` |
| `/linea-productos/baterias-de-traccion` | `store.custom#categoria-baterias-traccion` |
| `/carros/<macro>[/<sub>][/<hoja>]` | `store.custom#carros-...` (generadas) |
| `/motos/<macro>[/<sub>][/<hoja>]` | `store.custom#motos-...` (generadas) |
| `/herramientas` y `/herramientas/<macro>[/<hoja>]` | `store.custom#landing-herramientas`, `store.custom#herramientas-...` (generadas) |

---

## Cómo hacer cambios

- **Layout / contenido:** edita los `.json` / `.jsonc` dentro de `store/blocks/`. Todo bloque nuevo debe quedar importado desde `store/blocks.jsonc` para que el builder lo tome.
- **Colores, tipografías y espaciados:** `styles/configs/style.json`.
- **CSS puntual:** `styles/css/vtex.<app>.css`, usando los *CSS handles* que expone cada app de VTEX.
- **Nuevas rutas:** agrega la entrada en `store/routes.json` y crea el bloque `store.custom#...` correspondiente.

Si agregas un bloque de una app de VTEX que aún no se usa, hay que declararla en `dependencies` dentro de `manifest.json`.

---

## Publicar a producción

```bash
vtex release patch stable   # sube la versión y dispara el publish (ver scripts.postreleasy)
```

Luego, desde un workspace de producción:

```bash
vtex install onewstore.store-theme@<version>
```

Coordina siempre con el responsable de la tienda antes de publicar o instalar una versión nueva.

---

## Notas

- El historial de este repositorio parte del [store-theme oficial de VTEX](https://github.com/vtex-apps/store-theme); el commit `13fe7fa` contiene las customizaciones de Onewstore (header, home, landings de carros/motos, PDP y estilos).
- `CHANGELOG.md` mantiene el registro de cambios heredado del theme base.
