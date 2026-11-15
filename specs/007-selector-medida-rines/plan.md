# Plan técnico — 007 Selector de medida de rines

- **Spec:** `spec.md` (estado `approved`, 2026-11-15)
- **Rama:** `feat/007-selector-medida-rines`
- **Estado del plan:** borrador para implementar. Las tareas están en `tasks.md`.

Etiquetas: **[Hecho·código]** verificado leyendo el repo; **[Hecho·equipo]** decisión del
responsable; **[Inferido]** deducido, sin comprobar en el sitio; **[Supuesto]** valor por defecto
que se asume mientras no se decida otra cosa.

---

## 1. Resumen

Un componente React **nuevo**, `RimSizeSelector`, que muestra selects en cascada sobre las
especificaciones de rines, con el mismo patrón que `TyreSizeSelector` (lee *facets* del catálogo
con `vehicleFacets.gql` y navega a la categoría con los filtros aplicados). Se coloca en la fila
`rx-size` que ya existe en `search.jsonc` y se declara una sola vez, con dos instancias
(carros y motos) que se activan por **ruta exacta**, no por subcadena.

No se modifica `TyreSizeSelector` ni `VehicleSelector` (RF-10). La única forma de evitar que el
selector de llantas aparezca también en las páginas de rines es **ajustar la prop `showOn` de su
instancia** (sección 3.2).

## 2. Hallazgos del código que condicionan el diseño

| # | Hallazgo | Base |
|---|---|---|
| H1 | `TyreSizeSelector` decide si se muestra con `normalize(ruta).indexOf(normalize(showOn)) >= 0`, es decir, por **subcadena**. Con `showOn: "llantas"`, la ruta `/carros/llantas-y-rines/rines` lo activa porque contiene `llantas`. | [Hecho·código] `TyreSizeSelector.js:143`, `search.jsonc:426`. El efecto en el sitio es [Inferido]. |
| H2 | La macro se llama `llantas-y-rines`. Un `showOn: "rines"` también coincidiría con toda la macro. | [Hecho·código] |
| H3 | Las páginas de categorías `"catalogo": true` no las genera `gen-categorias.py`: las sirve VTEX con `search-result-layout#rx-cat` de `search.jsonc`, que ya incluye la fila `rx-size` en escritorio y móvil. | [Hecho·código] `search.jsonc:361-395`, `gen-categorias.py:490` |
| H4 | Las hojas de motos (`/motos/llantas-y-rines/rines-y-rayos/rines`) usan el layout **generado** `search-result-layout.desktop#rx-f` / `.mobile#rx-f`, que **no** incluye `rx-size`. | [Hecho·código] `gen-categorias.py:701-733` |
| H5 | Los dos selectores existentes calculan la categoría base con **todos los segmentos de la ruta actual** (`map` `c` por segmento). En una URL ya filtrada (`/…/rines/16?map=c,c,c,diametro`) el `16` se tomaría como categoría y la consulta de facets quedaría mal. | [Hecho·código] `TyreSizeSelector.js:120-124` |
| H6 | `react/__tests__/VehicleSelector.test.js` documenta, con tests `ROJO HOY`, cinco defectos del patrón: sin `encodeURIComponent`, base tomada de una PDP, nombre de facet con espacio de borde, orden del API en vez de numérico y valores con `quantity` 0. `TyreSizeSelector` copia el mismo patrón. | [Hecho·código] |
| H7 | Cada `.js` en la raíz de `react/` lo trata el builder `react 3.x` como *entrypoint*. Los módulos auxiliares deben ir en una subcarpeta (ya existe `queries/`). | [Hecho·código] comentario de `jest.config.js` |
| H8 | `scripts/tests/test_store_blocks.py` exige que cada entrada de `store/interfaces.json` tenga su componente en `react/` y viceversa, y que todo `blockClass` tenga CSS. | [Hecho·código] |
| H9 | Los tres componentes existentes incrustan su CSS en una etiqueta `<style>`, y la constitución #4 pide "sin estilos inline". | [Hecho·código] vs constitución |
| H10 | `react/node_modules` no trae jest ni las dependencias de test. `jest.config.js` documenta cómo correrlos con `JEST_EXTRA_MODULES` sin tocar esa carpeta. | [Hecho·código] |

## 3. Decisiones de diseño

### 3.1 Componente nuevo y módulo auxiliar propio — *resuelve «copiar o extraer»*

- `react/RimSizeSelector.js`: el componente.
- `react/utils/facetSelect.js`: funciones puras del componente nuevo (normalizar nombres, buscar un
  facet por nombre exacto, ordenar valores, armar la ruta, resolver la categoría base). Es una
  subcarpeta por H7.
- **No se refactorizan** `VehicleSelector` ni `TyreSizeSelector` para usarlas: queda fuera de
  alcance y se evita tocar código ya en uso. Sí se anota la duplicación como deuda.

### 3.2 Dónde y cómo se muestra — *resuelve RF-1, RF-6 y RF-11*

El componente recibe la lista de rutas donde vive:

```jsonc
"rim-size-selector#rx-carros": {
  "props": {
    "routes": ["/carros/llantas-y-rines/rines"],
    "fields": [
      { "facet": "Diámetro",     "label": "Diámetro" },
      { "facet": "Ancho de rin", "label": "Ancho" },
      { "facet": "Huecos",       "label": "Huecos" },
      { "facet": "Pernos (PCD)", "label": "Pernos (PCD)" }
    ]
  }
},
"rim-size-selector#rx-motos": {
  "props": {
    "routes": ["/motos/llantas-y-rines/rines-y-rayos/rines"],
    "fields": [
      { "facet": "Diámetro",         "label": "Diámetro" },
      { "facet": "Ancho de rin",     "label": "Ancho" },
      { "facet": "Número de rayos",  "label": "Rayos" }
    ],
    "title": "Encuentra rines de la medida que buscas"
  }
}
```

- Se muestra si la ruta actual es **igual** a una de `routes` o empieza por ella más `/`
  (segmentos completos). Si no, devuelve `null`. Así `/carros/llantas-y-rines/llantas` no coincide.
- La **categoría base se toma de la ruta configurada**, no de la URL actual. Resuelve H5: con la
  URL ya filtrada, la consulta de facets sigue usando `carros / llantas-y-rines / rines`.
- Cada `facet` se compara por **nombre exacto** normalizado (sin tildes, sin mayúsculas, sin
  espacios de borde ni dobles). No hay coincidencia por prefijo: `Ancho de rin` no se confunde con
  `Rin`.
- **Selector de llantas:** se cambia `showOn` de `tyre-size-selector#rx` de `"llantas"` a
  `"/llantas-y-rines/llantas"` en `search.jsonc`. Sigue coincidiendo con `/carros/llantas-y-rines/llantas`
  y deja de coincidir con `/carros/llantas-y-rines/rines` (AC-10). Es un cambio de configuración,
  no de código.

### 3.3 Colocación de los bloques — *resuelve RF-7 y H3/H4*

- `search.jsonc`: `flex-layout.row#rx-size` pasa a tener
  `["tyre-size-selector#rx", "rim-size-selector#rx-carros", "rim-size-selector#rx-motos"]`.
  Cada uno se oculta solo si la ruta no es la suya. Esto cubre las páginas nativas (carros).
- `scripts/gen-categorias.py`: se añade `flex-layout.row#rx-size` como **primer hijo** de
  `search-result-layout.desktop#rx-f` y de `search-result-layout.mobile#rx-f`, para que las hojas de
  motos muestren la misma fila. Se regeneran `category-filters.jsonc` y se actualizan los tests del
  generador.
- **Efecto secundario aceptado [Inferido]:** esa fila queda también en el resto de hojas
  generadas y se muestra vacía (los tres selectores devuelven `null`). Hoy ocurre lo mismo en las
  páginas nativas de eléctrico y otras categorías, así que se espera sin cambio visual; se verifica
  en T6.4. Alternativa si apareciera un hueco: colocar la instancia de motos en la columna lateral
  con un `layout: "stack"` (queda como plan B, no se implementa ahora).

### 3.4 Cascada y navegación — *RF-2, RF-3, RF-4, RF-5*

- Cascada **estricta**: el select *i* se habilita al elegir el *i−1*. Al cambiar uno se reinician los
  siguientes.
- Cada elección se reenvía como `selectedFacets` en la consulta siguiente (así los valores de cada
  select solo muestran lo que existe con las elecciones previas).
- El botón "Buscar" se habilita al elegir **el primer select** (`Diámetro`). Es el mismo criterio de
  `TyreSizeSelector` (basta el ancho).
- Navega a `/<categoría base>/<v1>/<v2>…` con `map=c,c,c,<key1>,<key2>…`, igual que hoy, pero cada
  segmento pasa por `encodeURIComponent` (RF-12).
- Sin datos: selects vacíos y botón apagado, sin error (`errorPolicy: 'ignore'`, `ssr: false`).

### 3.5 Valores de los facets — *RF-12*

Se descartan los de `quantity` 0, se ordenan con `Intl.Collator('es', { numeric: true })`
(`15 < 16 < 17`, `6J < 7J < 8.5J < 10J`, `4x100 < 5x114.3`) y se codifican al navegar. Son los cinco
defectos de H6; el componente nuevo nace sin ellos y los tests los cubren como casos normales (no
como `ROJO HOY`).

### 3.6 Estilos — *H9*

- **Se sigue el patrón existente** (CSS incrustado con clases `rx-rim__*` y *css handles* propios,
  prefijo distinto del de llantas para no pisarse). Es coherente con los otros tres componentes y
  el builder `styles` no puede darle estilo a un componente propio.
- **Se registra como desviación conocida de la constitución #4** y se anota como deuda en
  `tasks.md` (T7.3). Si se prefiere cumplir #4 ahora, hay que mover el CSS a
  `styles/css/` por *handles*; implica más trabajo y no se hace salvo que lo pidas.
- Sin `blockClass` nuevo en los bloques (H8: todo `blockClass` necesita CSS).
- La ilustración lateral del rin (equivalente a `TyreDiagram`) es **opcional**: se deja como tarea
  final (T3.6) y no bloquea ningún criterio.

### 3.7 Supuestos de las preguntas abiertas de la spec

- **Pregunta 4 (`Huecos` y `Pernos (PCD)`):** se mantienen las dos especificaciones aprobadas.
  El orden `Huecos` → `Pernos (PCD)` hace que, al elegir `5`, solo queden patrones de 5 pernos.
- **Pregunta 5 (enlace con llantas):** fuera de alcance.
- **Pregunta 6 (cuándo habrá datos):** no bloquea el código; sí la verificación en el workspace.

## 4. Cambios por archivo

| Archivo | Cambio | Tarea |
|---|---|---|
| `react/RimSizeSelector.js` | **Nuevo.** Componente y `schema` para el editor. | T3.2, T3.5 |
| `react/utils/facetSelect.js` | **Nuevo.** Funciones puras. | T3.1 |
| `react/__tests__/RimSizeSelector.test.js` | **Nuevo.** Tests de componente. | T4 |
| `react/__tests__/facetSelect.test.js` | **Nuevo.** Tests de las funciones puras. | T4 |
| `store/interfaces.json` | `"rim-size-selector": { "component": "RimSizeSelector" }` | T3.3 |
| `store/blocks/search.jsonc` | Fila `rx-size` con las dos instancias; `showOn` de llantas. | T5.1 |
| `scripts/gen-categorias.py` | `rx-size` como primer hijo de los layouts `#rx-f`. | T5.2 |
| `scripts/tests/test_gen_categorias.py` | Test del cambio anterior. | T5.2 |
| `store/blocks/home/category-filters.jsonc` | **Regenerado**, no se edita a mano. | T5.3 |
| `catalogo/estructura-categorias-v2.json` y salidas | Fusión de rines de carros (prerrequisito, decisión 7). | T2 |
| `README.md`, `CHANGELOG.md`, `specs/README.md` | Documentación. | T7 |

## 5. Estrategia de pruebas

**Componente (jest).** Se corren con `JEST_EXTRA_MODULES` apuntando a una carpeta **fuera del
repo** donde se instalan las dependencias (H10); no se toca `react/node_modules` ni
`react/package.json`. Se reutilizan los mocks de `react/__tests__/__mocks__`. Casos mínimos:

1. Se muestra en la ruta exacta y en rutas hijas por segmentos; **no** en `/carros/llantas-y-rines/llantas`,
   ni en una PDP, ni en `/carros/llantas-y-rines/rines-x` (prefijo parcial).
2. Cascada: cada select deshabilitado hasta elegir el anterior; cambiar uno reinicia los siguientes.
3. Cada elección se reenvía como `selectedFacets` con la categoría base configurada.
4. Navegación: `to` y `map` correctos con los cuatro valores; con tres (motos).
5. `Ancho de rin` y `Rin` presentes a la vez: cada select toma el suyo (RF-6).
6. Sin facets, con facets/values nulos, con nombre con espacio de borde: no rompe y se comporta.
7. `quantity` 0 no se ofrece; orden natural; valor con `/` o espacio queda codificado.
8. En una URL ya filtrada, la consulta sigue usando la categoría base configurada (H5).
9. Motos: no aparecen `Huecos` ni `Pernos (PCD)` (AC-9).

**Python.** Línea base medida el 2026-11-15 con Python 3.13, **antes de tocar nada**:

| Suite | Resultado base |
|---|---|
| `test_gen_categorias.py` | 34 tests, **1 error**: `ROJO_HOY_csv_hoja_bajo_macro_sin_sub_va_en_columna_hoja` |
| `test_store_blocks.py` | 19 tests, **10 fallos**: 9 con prefijo `ROJO_HOY` más `test_links_markdown_e_image_link_apuntan_a_rutas_existentes` (los enlaces a `/carros/llantas-y-rines/llantas` no están en `routes.json` porque esa página es nativa) |
| `test_sinonimos.py` | 11 tests, OK |

Criterio de cierre: **no aumenta** el número de fallos de ninguna suite y los tests nuevos pasan. La
fusión de rines (T2) hará que el enlace a `/carros/llantas-y-rines/rines` caiga en el mismo fallo
que ya existe para llantas; se anota y no se cuenta como regresión.

**Manual (workspace propio).** Cada AC de la spec en escritorio y a 360 px, con teclado, más una
revisión visual de una hoja generada cualquiera para confirmar que la fila vacía `rx-size` no abre
un hueco (T6.4).

## 6. Orden de trabajo y PRs

Una spec = una rama, **dos PR** para separar el riesgo del catálogo del riesgo del código:

1. **PR 1 — prerrequisito de catálogo** (T2): fusión de rines de carros en el JSON, regeneración,
   tests del generador. No incluye el selector. Se verifica con `--dry-run` (esperado 565 páginas /
   495 hojas) y las suites de Python.
2. **PR 2 — selector** (T3, T4, T5): componente, tests, bloques y generador.

Fuera del repo y antes de verificar en el workspace (T1, **a cargo de Diego**): crear las
especificaciones y las categorías en el admin de VTEX y cargar rines de prueba. El código y los
tests unitarios **no** esperan por esto.

## 7. Riesgos

| Riesgo | Efecto | Mitigación |
|---|---|---|
| Hay que cambiar `showOn` del selector de llantas y no se hace | El selector de llantas aparece en rines (H1) | AC-10 y T5.1 |
| La fila `rx-size` vacía abre un hueco en hojas generadas | Regresión visual | T6.4; plan B de la sección 3.3 |
| Las especificaciones se crean en el admin con otro nombre | Selects vacíos, sin error | RF-6 exige nombre exacto; T1.1 fija los nombres; las props `facet` son configurables |
| La fusión cambia más páginas de las esperadas | Enlaces rotos | `--dry-run` valida enlaces y cuenta; el generador aborta si hay rutas manuales perdidas |
| `vtex link` incremental rechaza archivos grandes | Cambios que no se ven | Reiniciar `vtex link` tras regenerar (README) |
| Las especificaciones de motos se revisan con un proveedor y cambian | Retrabajo de `fields` de motos | Es solo configuración de bloque |

## 8. Fuera de alcance

Lo de §8 de la spec, más: refactorizar los selectores existentes, mover el CSS fuera del componente,
y cualquier cambio de datos en el catálogo de producción.
