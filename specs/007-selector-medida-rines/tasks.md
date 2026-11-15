# Tareas — 007 Selector de medida de rines

- **Spec:** `spec.md` · **Plan:** `plan.md`
- **Rama:** `feat/007-selector-medida-rines`
- **Responsable:** columna "Quién". **Diego** = trabajo en el admin de VTEX o decisión; **Código** = cambio en el repo.
- Cada tarea cita los criterios de aceptación (`AC-n`) que cubre. Un PR cita los `AC` de sus tareas.
- Casilla `[ ]` = pendiente. Nada está hecho todavía.

> **Antes de empezar:** revisar con Diego las **dudas D1 a D11** y las preguntas 4 a 6 de
> `spec.md` §7. Están anotadas para responderse cuando se aborde esta spec; cada una indica la
> tarea antes de la cual conviene resolverla y qué asume el plan mientras tanto.

> Regla de trabajo (constitución #7): no tocar `master`. Cada persona usa su propio workspace
> (`vtex use <nombre>`) y la rama `feat/*`.

---

## T0 — Preparación y línea base

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T0.1 | Crear la rama `feat/007-selector-medida-rines` desde `feat/specs` (o la rama base que se acuerde). | Código | — | — |
| [ ] T0.2 | Preparar el entorno de jest **fuera del repo**: instalar en una carpeta temporal `jest`, `jest-environment-jsdom`, `babel-jest`, `@babel/core`, `@babel/preset-env`, `@babel/preset-react`, `@testing-library/react@12`, `react@16.14` y `react-dom@16.14`. Correr con `JEST_EXTRA_MODULES` según `react/__tests__/jest.config.js`. No modificar `react/node_modules` ni `react/package.json`. | Código | — | H10 |
| [ ] T0.3 | Correr los tests actuales de `VehicleSelector` y **anotar la línea base** (se esperan fallos en los `ROJO HOY`). | Código | T0.2 | — |
| [ ] T0.4 | Confirmar la línea base de Python del plan (§5): 34 / 1 error, 19 / 10 fallos, 11 / OK. Si difiere, actualizar el plan antes de seguir. | Código | — | — |

## T1 — Catálogo en el admin de VTEX (**a cargo de Diego**, fuera del repo)

No bloquea el código ni los tests unitarios; **sí bloquea la verificación en el workspace** (T6).

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T1.1 | Crear en Catálogo › Especificaciones, como **listas filtrables**, con estos nombres exactos: `Diámetro`, `Ancho de rin`, `Huecos`, `Pernos (PCD)`, `Material` (valores `Acero`, `Aluminio`) y `Número de rayos`. Sin espacios de borde. | Diego | — | RF-6 |
| [ ] T1.2 | Crear (o confirmar) las categorías `Carros › Llantas y rines › Rines` y `Motos › Llantas y rines › Rines y rayos › Rines` con sus rutas reales. | Diego | — | AC-1 |
| [ ] T1.3 | Cargar rines de prueba, marcados como ejemplo (como ya se hizo con las llantas): al menos **6 de carros** que varíen en diámetro, ancho, huecos y PCD (con al menos un par con el mismo diámetro y distinto PCD), y **4 de motos** con distinto número de rayos. Incluir un valor con espacio o `/` para probar la codificación. | Diego | T1.1, T1.2 | AC-2, AC-3, AC-9, AC-11 |

## T2 — PR 1: fusión de rines de carros (prerrequisito, decisión 7)

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T2.1 | En `catalogo/estructura-categorias-v2.json`, convertir la subcategoría `Rines` de carros a la forma de `Llantas`: `"vitrina": "filtros"`, `"filtro": "Material"`, `"catalogo": true`. Los tipos `Rines de acero` y `Rines de aluminio` pasan a ser valores del filtro. | Código | — | AC-1 |
| [ ] T2.2 | Correr `python scripts/gen-categorias.py --dry-run`. Esperado: **565 páginas** (33 macros, 37 subcategorías, 495 hojas) y enlaces internos válidos. Si la cuenta difiere, investigar antes de escribir. | Código | T2.1 | — |
| [ ] T2.3 | Correr sin `--dry-run` (con `--real` solo si las categorías ya existen en VTEX, ver T1.2). Revisar el diff: desaparecen las rutas `rines-de-acero` y `rines-de-aluminio`, se actualiza `rutas-eliminadas.txt` y el CSV marca ambas como `Valor de filtro (Material)`. | Código | T2.2 | — |
| [ ] T2.4 | Añadir/ajustar un test en `scripts/tests/test_gen_categorias.py` que fije el resultado de la fusión (conteo, CSV, rutas). | Código | T2.1 | — |
| [ ] T2.5 | Regenerar los CSV de sinónimos con `gen-sinonimos.py` y verificar que `aros de acero` y `rines deportivos` se conservan. | Código | T2.3 | — |
| [ ] T2.6 | Correr las tres suites de Python y comparar con la línea base: **ningún fallo nuevo** salvo el enlace a `/carros/llantas-y-rines/rines` en `test_links_markdown…` (mismo defecto que llantas; anotarlo). | Código | T2.3 | — |
| [ ] T2.7 | Abrir el **PR 1** con el diff y el resultado de `--dry-run`. Importar los CSV de sinónimos en Intelligent Search (Admin › Storefront); tarda hasta 2 h en aplicar. | Código / Diego | T2.6 | — |

## T3 — PR 2: componente

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T3.1 | Crear `react/utils/facetSelect.js` con funciones puras: `normalizeName`, `findFacetExact`, `naturalSort`, `matchRoute`, `baseFromRoute`, `buildTarget` (con `encodeURIComponent`) y `usableValues` (descarta `quantity` 0). | Código | T0.2 | RF-6, RF-11, RF-12, AC-11 |
| [ ] T3.2 | Crear `react/RimSizeSelector.js`: props `routes`, `fields` (lista `{facet, label}`), `title`, `subtitle`, `buttonLabel`. Cascada estricta, `useQuery(vehicleFacets)` con `ssr: false` y `errorPolicy: 'ignore'`, devuelve `null` fuera de sus rutas, navegación con `map`. `aria-label` en cada select, estilo coherente con `TyreSizeSelector`, clases `rx-rim__*`, *css handles* propios. | Código | T3.1 | RF-1 a RF-6, RF-11, AC-1 a AC-6 |
| [ ] T3.3 | Registrar `"rim-size-selector": { "component": "RimSizeSelector" }` en `store/interfaces.json`. | Código | T3.2 | RF-10 |
| [ ] T3.4 | Verificar que el componente **no** importa nada de `TyreSizeSelector` ni de `VehicleSelector` y que esos dos archivos quedan sin cambios (`git diff` vacío para ellos). | Código | T3.2 | RF-10 |
| [ ] T3.5 | Definir `RimSizeSelector.schema` para el editor del sitio (título, subtítulo, botón, rutas, campos). | Código | T3.2 | — |
| [ ] T3.6 | *(Opcional, no bloquea nada.)* Ilustración lateral de un rin con las cotas (diámetro, ancho, huecos, PCD), equivalente a `TyreDiagram`. | Código | T3.2 | — |

## T4 — PR 2: tests del componente

Se escriben **junto con** T3 (primero los casos, luego el código). Archivos nuevos en
`react/__tests__/`. Los tests nuevos **no** llevan el prefijo `ROJO HOY`: los defectos de H6 son aquí
requisitos y deben pasar.

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T4.1 | `facetSelect.test.js`: normalización, coincidencia exacta, orden natural (`15<16<17`, `6J<7J<8.5J<10J`, `4x100<5x114.3`), `matchRoute` por segmentos, `buildTarget` con `/` y espacios, descarte de `quantity` 0. | Código | T3.1 | AC-5, AC-11 |
| [ ] T4.2 | `RimSizeSelector.test.js`, visibilidad: ruta exacta sí, ruta hija sí, `/carros/llantas-y-rines/llantas` no, PDP no, prefijo parcial (`…/rines-x`) no. | Código | T3.2 | AC-1, AC-10 |
| [ ] T4.3 | Cascada: cada select deshabilitado hasta elegir el anterior; cambiar uno reinicia los siguientes; botón apagado hasta elegir `Diámetro`. | Código | T3.2 | AC-2 |
| [ ] T4.4 | Cada elección se reenvía como `selectedFacets` con la categoría base **configurada**, también con la URL ya filtrada. | Código | T3.2 | AC-2, H5 |
| [ ] T4.5 | Navegación: `to` y `map` correctos con cuatro valores (carros) y con tres (motos), con valores codificados. | Código | T3.2 | AC-3, AC-9 |
| [ ] T4.6 | Nombres exactos: con `Ancho de rin` y `Rin` a la vez, cada select toma la suya; nombre con espacio de borde sigue funcionando. | Código | T3.2 | AC-5 |
| [ ] T4.7 | Robustez: sin facets, con `facets`/`values` nulos, sin error visible. | Código | T3.2 | AC-4 |
| [ ] T4.8 | Motos: la configuración de motos no muestra `Huecos` ni `Pernos (PCD)`. | Código | T3.2 | AC-9 |
| [ ] T4.9 | Correr toda la suite de jest; deben pasar los tests nuevos y **no empeorar** la línea base de `VehicleSelector` (T0.3). | Código | T4.1 a T4.8 | AC-7 |

## T5 — PR 2: bloques y generador

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T5.1 | En `store/blocks/search.jsonc`: añadir `rim-size-selector#rx-carros` y `rim-size-selector#rx-motos` (props del plan §3.2) y ponerlos en `flex-layout.row#rx-size` junto a `tyre-size-selector#rx`; cambiar `showOn` de este último a `"/llantas-y-rines/llantas"`. | Código | T3.3 | RF-1, RF-7, RF-11, AC-10 |
| [ ] T5.2 | En `scripts/gen-categorias.py`: añadir `flex-layout.row#rx-size` como primer hijo de `search-result-layout.desktop#rx-f` y `.mobile#rx-f`. Añadir su test en `scripts/tests/test_gen_categorias.py`. | Código | — | RF-7, AC-9 |
| [ ] T5.3 | Regenerar con el script (`--dry-run` primero) y revisar que `category-filters.jsonc` cambia solo en esos dos `children`. No editar el archivo a mano. | Código | T5.2 | AC-8 |
| [ ] T5.4 | Correr las tres suites de Python. `test_store_blocks` debe seguir cumpliendo: ids sin duplicados, referencias resueltas, interfaz ↔ componente. **Ningún fallo nuevo** respecto de la línea base. | Código | T5.1, T5.3 | AC-7, AC-8 |

## T6 — Verificación en un workspace propio

Requiere T1 (datos). Usar `vtex use <nombre>` y `vtex link`; **reiniciar `vtex link`** tras regenerar
(el relink incremental rechaza los archivos grandes).

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T6.1 | En `/carros/llantas-y-rines/rines`: aparecen los **cuatro** selects; cada uno limita al siguiente; "Buscar" lista solo los rines de esas medidas. | Código / Diego | T1.3, T5.4 | AC-1, AC-2, AC-3 |
| [ ] T6.2 | En `/carros/llantas-y-rines/llantas`: sigue el selector de llantas y **no** aparece el de rines. En `/carros/llantas-y-rines/rines`: **no** aparece el de llantas. | Código / Diego | T6.1 | AC-10 |
| [ ] T6.3 | En `/motos/llantas-y-rines/rines-y-rayos/rines`: aparecen `Diámetro`, `Ancho` y `Rayos`, y no `Huecos` ni PCD. | Código / Diego | T1.3, T5.4 | AC-9 |
| [ ] T6.4 | Abrir 3 hojas generadas cualquiera (p. ej. frenos, baterías, una de herramientas) y comparar con una captura previa: la fila `rx-size` vacía **no** introduce un hueco. Si lo hace, aplicar el plan B de §3.3. | Código / Diego | T5.4 | AC-8 |
| [ ] T6.5 | Sin especificaciones en una categoría de prueba: selects vacíos, botón apagado, **sin errores en consola**. | Código | T5.4 | AC-4 |
| [ ] T6.6 | Con una especificación `Ancho de rin` y otra `Rin` en el catálogo, cada select toma la suya. | Código / Diego | T1.3 | AC-5 |
| [ ] T6.7 | Teclado completo (Tab, flechas, Enter) y a 360 px, 768 px y 1280 px. | Código | T6.1 | AC-6 |
| [ ] T6.8 | Valores con `quantity` 0, orden numérico y el valor con `/` o espacio de T1.3: se omiten, se ordenan y se codifican. | Código | T1.3 | AC-11 |
| [ ] T6.9 | Registrar el resultado de cada AC (pasa/falla, con captura o salida) en la descripción del PR 2. | Código | T6.1 a T6.8 | todos |

## T7 — Cierre

| ID | Tarea | Quién | Depende de | Cubre |
|---|---|---|---|---|
| [ ] T7.1 | Actualizar `README.md` (rutas, componentes, tabla de props del selector) y `CHANGELOG.md`. | Código | T6.9 | DoD |
| [ ] T7.2 | Actualizar `catalogo/como-cargan-los-sellers.md` y la spec 000 (estado de rines y de la fusión). | Código | T6.9 | DoD |
| [ ] T7.3 | Anotar como **deuda** la desviación de la constitución #4 (CSS incrustado en el componente) y la duplicación de `publicPath` / `parseBase` / `findFacet` entre los tres selectores existentes. | Código | T6.9 | — |
| [ ] T7.4 | Abrir el **PR 2** con los `AC` cubiertos (T6.9) y marcar la spec 007 como `done` con el enlace. | Código | T7.1 a T7.3 | DoD |

---

## Definition of Done (de `specs/README.md`)

- [ ] Todos los `AC-n` verificados en un workspace propio (`vtex use` + `vtex link`) — T6.
- [ ] Probado en móvil (≤640 px) y escritorio — T6.7.
- [ ] Sin enlaces internos rotos: `python scripts/gen-categorias.py --dry-run` — T2.2, T5.3.
- [ ] README y CHANGELOG actualizados — T7.1.
- [ ] Spec marcada `done` con enlace al PR — T7.4.

## Cobertura de criterios de aceptación

| AC | Tareas |
|---|---|
| AC-1 | T3.2, T4.2, T6.1 |
| AC-2 | T3.2, T4.3, T4.4, T6.1 |
| AC-3 | T4.5, T6.1 |
| AC-4 | T4.7, T6.5 |
| AC-5 | T4.1, T4.6, T6.6 |
| AC-6 | T3.2, T6.7 |
| AC-7 | T4.9, T5.4 |
| AC-8 | T5.3, T5.4, T6.4 |
| AC-9 | T4.5, T4.8, T5.2, T6.3 |
| AC-10 | T4.2, T5.1, T6.2 |
| AC-11 | T3.1, T4.1, T6.8 |
