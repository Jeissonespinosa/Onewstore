# 007 — Selector de medida de rines

- **Estado:** approved (2026-11-15). Las preguntas 4, 5 y 6 de §7 siguen abiertas y **no bloquean**; el plan asume una respuesta por defecto para cada una.
- **Responsable:** Diego
- **Rama:** `feat/007-selector-medida-rines`
- **Depende de:** 000 (contexto); `catalogo/como-cargan-los-sellers.md` (decisiones 6, 7 y 8); alta de las especificaciones de rines en el admin de VTEX; `react/TyreSizeSelector.js` como patrón de referencia

## 1. Contexto y problema

Las llantas tienen un selector de medida (`react/TyreSizeSelector.js`: Ancho → Perfil → Rin,
en cascada, leyendo los *facets* del catálogo). Los rines no tienen nada equivalente, y el
equipo decidió el 2026-11-15 que lo tengan. Quien busca un rin conoce sus medidas
(diámetro, ancho, número de huecos, patrón de pernos), no el vehículo, y sin un selector tiene que
adivinar entre filtros sueltos.

Estado de partida, con base:
- Las especificaciones de rines están **aprobadas pero no creadas**: `Diámetro`, `Ancho de rin`, `Huecos`, `Pernos (PCD)` y `Material` (`Acero` / `Aluminio`). [Hecho·equipo, 2026-11-15]
- Las hojas `Rines de acero` y `Rines de aluminio` de carros se **fusionan** en `/carros/llantas-y-rines/rines` con `Material` como filtro. [Hecho·equipo]
- `TyreSizeSelector` se muestra en toda ruta cuyo texto **contenga** `llantas` (`showOn`, coincidencia por subcadena) y no tiene test (la constitución #2 pide tests para todo componente). [Hecho·código]
- **Consecuencia [Inferido por lectura del código; no se probó en el sitio]:** `/carros/llantas-y-rines/rines` contiene `llantas` (por la macro `llantas-y-rines`), así que hoy el selector de llantas aparecería también en las páginas de rines y de accesorios de rueda. Y un `showOn: "rines"` caería en el mismo error. El componente nuevo no puede identificar su página por subcadena.
- Las páginas de las categorías marcadas `"catalogo": true` (llantas y, tras la fusión, los rines de carros) **no las genera `gen-categorias.py`**: las sirve VTEX con el layout escrito a mano de `store/blocks/search.jsonc` (`search-result-layout#rx-cat`, que ya incluye la fila `rx-size` del selector de llantas). Las hojas de motos (`rines-y-rayos/rines`) sí usan el layout generado `category-filters.jsonc`. [Hecho·código]
- Sin las especificaciones cargadas, los selects salen vacíos y el botón apagado. Es el comportamiento actual del selector de vehículo. [Hecho·código + sitio]
- En el workspace `devwilbis` no hay ningún rin cargado (8 productos: 5 llantas y 3 de cuidado del auto). [Hecho·sitio, 2026-11-12]

## 2. Objetivos / No-objetivos

**Objetivos**
- Un selector de medida de rines en cascada, con el mismo comportamiento y estética que el de llantas.
- Mostrarlo solo en las páginas de rines.
- Cubrir **carros** (cuatro selects) y **motos** (con las especificaciones propias de rines de rayos, ver RF-9).
- Hacerlo con un **componente nuevo**, sin modificar `TyreSizeSelector` (decisión del 2026-11-15).

**No-objetivos**
- No reemplaza los filtros nativos del panel; conviven con ellos (como en llantas).
- No incluye el selector de vehículo ni cambia el de llantas.
- No crea las especificaciones en el admin (es trabajo de catálogo).
- No cubre accesorios de rueda (tuercas, espaciadores…).

## 3. Usuarios y escenarios

- *Como comprador con un rin de aluminio de 16", quiero elegir diámetro y patrón de pernos, para ver solo los rines que me sirven.*
- *Como comprador, quiero que cada elección limite la siguiente, para no armar combinaciones que no existen.*
- *Como visitante en móvil, quiero usarlo con el teclado o con el dedo, sin salirme de la página.*

## 4. Requisitos funcionales

Decisiones del 2026-11-15: **se muestran los 4 selects** en carros, **componente nuevo**, y para motos se aplica la propuesta con `Número de rayos`. [Hecho·equipo]

- `RF-1` El selector se muestra en la página de rines de carros (`/carros/llantas-y-rines/rines`) y en la hoja de rines de motos (`/motos/llantas-y-rines/rines-y-rayos/rines`), y **no** en otras páginas, incluidas las de llantas.
- `RF-2` En carros ofrece, en cascada, los **cuatro** selects: `Diámetro` → `Ancho de rin` → `Huecos` → `Pernos (PCD)`. Cada select se habilita al elegir el anterior y muestra solo valores que existen con las elecciones previas.
- `RF-3` Los valores salen de los *facets* de la categoría actual (`vtex.search-graphql`); no hay valores escritos en el componente.
- `RF-4` Al pulsar "Buscar" navega a la misma categoría con los filtros aplicados, con el formato que ya usa `TyreSizeSelector` (`/<categoría>/<valor>/...?map=...`).
- `RF-5` Mientras falten datos, los selects quedan vacíos y el botón deshabilitado, sin error visible.
- `RF-6` Cada select se identifica por el nombre **exacto** de su especificación. No se admite coincidencia por prefijo: `Ancho de rin` no debe confundirse con `Rin`, ni `Diámetro` con otras medidas.
- `RF-7` El bloque se define una vez en `store/blocks/search.jsonc` (escrito a mano), dentro de la fila `rx-size`, que ya sirve las páginas nativas de VTEX (carros, tras la fusión). Para que las hojas de motos, que usan el layout generado, también lo muestren, el **generador** (`scripts/gen-categorias.py`) añade esa fila a los layouts `#rx-f`; su salida `category-filters.jsonc` no se edita a mano y el cambio lleva su test.
- `RF-8` Se acompaña de tests en `react/__tests__`: cascada, filtrado del siguiente select, navegación al buscar, ausencia de datos y nombres exactos.
- `RF-9` En motos, el selector usa las especificaciones de rines de rayos: `Diámetro` → `Ancho de rin` → `Número de rayos`. **No** usa `Huecos` ni `Pernos (PCD)`. `Material` (`Acero` / `Aluminio`) queda como filtro del panel, igual que en carros. [Interpretación mía de "aplícala": la decisión del equipo fue sobre las especificaciones; que el selector de motos tenga estos tres selects y deje `Material` como filtro es una propuesta por confirmar.]
- `RF-11` La página donde se muestra se decide por **ruta exacta o por prefijo de segmentos completos** (`/carros/llantas-y-rines/rines` y `/carros/llantas-y-rines/rines/...`), configurable por instancia del bloque; nunca por subcadena. El selector de llantas **no** debe aparecer en páginas de rines: se ajusta con la prop `showOn` de su instancia en `search.jsonc`, sin cambiar su código.
- `RF-12` Valores de facets: se ignoran los de `quantity` 0, se ordenan de forma natural (numérica, p. ej. 15 < 16 < 17 y `5x114.3` después de `4x100`), se codifican con `encodeURIComponent` al armar la ruta y el nombre de la especificación se compara sin tildes, sin mayúsculas y sin espacios de borde. Son los defectos que hoy reproducen los tests `ROJO HOY` de `VehicleSelector`; el componente nuevo no debe heredarlos.
- `RF-10` Es un componente **nuevo**, configurable por la lista de especificaciones que muestra, en un archivo propio (`react/RimSizeSelector.js`, nombre propuesto) y registrado en `store/interfaces.json`. No modifica `TyreSizeSelector` ni `VehicleSelector`.

## 5. Requisitos no funcionales

- **Accesibilidad:** operable solo con teclado, `aria-label` en cada select, foco visible, contraste AA (constitución #9).
- **Rendimiento:** sin regresión de LCP; consulta de facets diferida (`ssr: false`, como los otros selectores).
- **Estilos:** coherentes con `TyreSizeSelector` y `VehicleSelector`; sin estilos inline nuevos más allá del patrón existente.
- **Mantenibilidad:** hoy los dos selectores repiten `publicPath`, `parseBase` y `findFacet`, y el componente nuevo sería el tercero. Se decidió componente nuevo; en `plan.md` queda por decidir si esa lógica común se copia otra vez o se extrae a un módulo compartido sin tocar el comportamiento de los dos existentes.
- **Idioma:** textos de la interfaz en español de Colombia.

## 6. Criterios de aceptación

- `AC-1` En `/carros/llantas-y-rines/rines` aparece el selector; en `/carros/llantas-y-rines/llantas` no.
- `AC-2` Con rines cargados, elegir `Diámetro` habilita `Ancho de rin` y deja solo los anchos que existen con ese diámetro; igual con `Huecos` y `Pernos (PCD)`. Se ven los **cuatro** selects en carros.
- `AC-9` En la hoja de rines de motos se ven `Diámetro`, `Ancho de rin` y `Número de rayos`, y no aparecen `Huecos` ni `Pernos (PCD)`.
- `AC-10` En `/carros/llantas-y-rines/rines` **no** aparece el selector de llantas, y en `/carros/llantas-y-rines/llantas` sigue apareciendo igual que hoy.
- `AC-11` Valores con `quantity` 0 no se ofrecen; `15`, `16`, `17` salen en ese orden aunque el API los devuelva en otro; un valor con `/` o espacios se codifica en la ruta.
- `AC-3` Al pulsar "Buscar", el listado muestra solo los rines con esas medidas.
- `AC-4` Sin especificaciones en el catálogo, los selects salen vacíos y el botón deshabilitado, sin errores en consola.
- `AC-5` Con una especificación `Ancho de rin` y otra `Rin` presentes, cada select usa la suya (prueba de coincidencia exacta).
- `AC-6` Se opera completo con teclado (Tab, flechas, Enter) y a 360 px de ancho.
- `AC-7` Los tests nuevos pasan y cubren los casos de RF-8.
- `AC-8` `python gen-categorias.py --dry-run` no reporta enlaces rotos y la página de rines sigue en la lista.

## 7. Preguntas abiertas

- [x] **1. ¿Aplica a motos?** → **Sí, con otras especificaciones** (2026-11-15): `Número de rayos` en vez de `Huecos`, y sin `Pernos (PCD)` (investigación en §9). *Por confirmar:* que el selector de motos sea `Diámetro` → `Ancho de rin` → `Número de rayos` con `Material` como filtro (RF-9), y qué pasa con cuatrimotos y motocarros (no hay hoja de rines propia para ellos en el árbol).
- [x] **2. Orden y cantidad de selects en carros.** → **Los cuatro**, en este orden: `Diámetro` → `Ancho de rin` → `Huecos` → `Pernos (PCD)`.
- [x] **3. ¿Componente nuevo o `TyreSizeSelector` generalizado?** → **Componente nuevo** (RF-10).
- [ ] **4. `Pernos (PCD)` como un solo valor (`5x114.3`) o como dos (`Huecos` y `PCD`).** Hoy son dos especificaciones y el patrón completo `5x114.3` repite el número de huecos. Evitar la inconsistencia entre ambas. **Abierta, no bloquea. Supuesto del plan:** se mantienen las dos especificaciones aprobadas; el orden de la cascada (`Huecos` antes de `Pernos (PCD)`) ya hace que, al elegir `5`, solo queden patrones de 5 pernos. Se revisa si en la carga real aparecen contradicciones.
- [ ] **5. ¿Se relaciona con el selector de llantas?** Un comprador de rin suele buscar luego la llanta del mismo diámetro. Hoy la especificación de llantas se llama `Rin` y la de rines `Diámetro`: decidir si comparten valores o se enlazan (futuro). **Abierta, no bloquea:** fuera de esta spec (§8).
- [ ] **6. Plazo y dependencia de datos:** ¿cuándo se cargan los primeros rines? Sin ellos no se puede probar AC-2 a AC-5 en un workspace. **Abierta, no bloquea el código** (los tests unitarios usan datos simulados), **sí bloquea la verificación en el workspace**: el plan la deja como tarea de catálogo.

### Dudas anotadas para el arranque de la spec

Registradas el 2026-11-15 por el responsable para **responderse cuando se vaya a abordar esta
spec**, no antes. Ninguna bloquea hoy; las marcadas "antes de T…" conviene resolverlas antes de esa
tarea. Cada una trae la opción que el plan asume por defecto si no hay respuesta.

| ID | Duda | Afecta | Asume el plan por defecto | Resolver antes de |
|---|---|---|---|---|
| D1 | **Selector de motos:** ¿son tres selects (`Diámetro` → `Ancho de rin` → `Número de rayos`) con `Material` como filtro del panel, o se quiere otra combinación? (RF-9 es interpretación mía de "aplícala".) | RF-9, T5.1, AC-9 | Tres selects y `Material` como filtro | T5.1 |
| D2 | **Validación de las especificaciones de motos** con un proveedor de repuestos de moto: ¿`Número de rayos` y las demás cubren lo que el comprador necesita? La investigación se basó en fichas de tienda. | `Número de rayos`, T1.1, T1.3 | Se cargan con la propuesta actual | T1.3 (cargar productos reales) |
| D3 | **Cuatrimotos y motocarros:** ¿se van a vender? Si sí, necesitan hoja propia y las especificaciones `Huecos` y `Pernos (PCD)` (patrón `4x110` y similares). Los rines de motocarro no se confirmaron. | §8, árbol de categorías | Fuera de alcance | Antes de ampliar el catálogo de motos |
| D4 | **`Material` en motos:** ¿los rines de moto de rayos se clasifican en `Acero` / `Aluminio` o hace falta otro valor (p. ej. aleación, magnesio)? | T1.1, RF-9 | Solo `Acero` y `Aluminio` | T1.1 |
| D5 | **CSS del componente:** el plan lo incrusta en el componente, como los tres existentes, lo que incumple la constitución #4 ("sin estilos inline"). ¿Se acepta como deuda o se mueve a `styles/css/` desde ya (más trabajo)? | Plan §3.6, T3.2, T7.3 | Se acepta como deuda | T3.2 |
| D6 | **Cuándo se habilita "Buscar":** el plan lo habilita al elegir solo `Diámetro`, como `TyreSizeSelector` con el ancho. ¿Se prefiere exigir más selects? | Plan §3.4, T3.2 | Basta `Diámetro` | T3.2 |
| D7 | **Ilustración lateral del rin** (equivalente a `TyreDiagram`): ¿se quiere? | T3.6 | No (opcional, al final) | T3.6 |
| D8 | **Fusión de rines de carros (PR 1):** la regla es "una spec = una rama". La fusión es prerrequisito de esta spec pero la decisión vive en `como-cargan-los-sellers.md`, sin spec propia. ¿Va en esta rama con un PR aparte (como propone el plan) o se abre una spec/rama para ella? | Plan §6, T2 | Misma rama, dos PR | T2.1 |
| D9 | **Sinónimos tras la fusión:** hay que volver a importar los CSV en Intelligent Search (tarda hasta 2 h). ¿Quién lo hace y cuándo? | T2.7 | Diego, al abrir el PR 1 | T2.7 |
| D10 | **Fila `rx-size` vacía en las hojas generadas:** si abre un hueco visual, ¿se aplica el plan B (instancia de motos en la columna lateral con `layout: "stack"`)? Se decide al ver el resultado. | Plan §3.3, T6.4 | Plan A; B solo si hay hueco | T6.4 |
| D11 | **Aprobación con preguntas abiertas:** la spec se aprobó con las preguntas 4, 5 y 6 abiertas. ¿Se confirma que no hace falta una nueva revisión cuando se respondan? | Proceso | Sí, no hace falta | Al responderlas |

Las preguntas 4, 5 y 6 de arriba cuentan también como dudas pendientes.

## 8. Fuera de alcance / futuro

- Rines de cuatrimotos y motocarros (sin hoja propia en el árbol; patrón `4x110` y similares).
- Búsqueda cruzada "llantas para este rin".
- Datos de compatibilidad rin ↔ vehículo (la carga de compatibilidad la hace el seller, spec 000, Q7).
- Corregir el bug que reproduce el test `ROJO_HOY` de `scripts/tests/test_gen_categorias.py` (no es de esta spec, pero toca el mismo generador).

## 9. Investigación: ¿`Huecos` y `Pernos (PCD)` aplican a rines de moto de rayos?

**Conclusión provisional [Inferido]:** en las motos de calle y de enduro con rines de rayos **no aplican**; sí aplican en vehículos que montan la rueda con birlos, como cuatrimotos (y quizá motocarros, sin confirmar). Es una conclusión apoyada en fichas de tienda, no en una norma ni en un fabricante; conviene confirmarla con un proveedor de repuestos de moto.

Lo que se encontró, con su fuerza:

| Hallazgo | Fuente | Fuerza |
|---|---|---|
| Un rin de rayos de enduro se describe como **1.60x21", de acero, para 36 rayos** (ancho x diámetro y número de orificios de rayos). | Ficha de producto de tienda | Media: es un solo ejemplo |
| Los anuncios de moto de calle (p. ej. rin trasero 1.60x17 para FT150, delantero 1.6x18 para YBR125) se describen por ancho, diámetro y modelo, **sin patrón de pernos**. | Listados de Mercado Libre México | Media: ausencia en listados, no prueba |
| Se pide verificar con el modelo: diámetro, ancho, número de rayos, calibre y longitud del rayo. | Resumen de búsqueda | Baja-media |
| Los patrones con PCD (como `4x110`, 4 birlos en círculo de 110 mm) son comunes en **cuatrimotos/ATV**, con rosca de espárrago 10x1.25. | RevZilla, America's Tire, Discount Tire, Moose, entre otros | Alta para ATV |
| Lo que sí tiene patrón de pernos en una moto son **otras piezas**: el disco de freno (rotor) y la corona/piñón, no la rueda. | Resultados de motor/Harley y foros | Media |
| Los rines de **motocarro** podrían usar un montaje distinto al de las cuatrimotos. | Resumen de búsqueda sin fuente concreta | **No confirmada** |

**Un riesgo de lenguaje a decidir:** en rines de carro `Huecos` es el número de pernos (4, 5, 6); en rines de moto de rayos el número que importa es el de **orificios para rayos** (28, 32, 36…). Usar la misma palabra para dos cosas distintas confundiría al seller y al comprador. Propuesta (a validar): en motos usar `Número de rayos` y no reutilizar `Huecos`.

**Decisión para motos (2026-11-15, aprobada por el equipo; la conclusión de fondo sigue siendo [Inferido]):** en la hoja `Rines` de motos usar `Diámetro`, `Ancho de rin`, `Material` y `Número de rayos`, y dejar `Huecos` y `Pernos (PCD)` solo para carros (y para cuatrimotos/motocarros si algún día se venden y se confirma su patrón). Antes de cargar productos reales conviene validar con un proveedor de repuestos de moto que esto cubre lo que el comprador necesita.

## 10. Referencias

- Código: `react/TyreSizeSelector.js`, `react/VehicleSelector.js`, `react/queries/vehicleFacets.gql`, `store/interfaces.json`, `scripts/gen-categorias.py`, `store/blocks/home/category-filters.jsonc`.
- Documentos: `catalogo/como-cargan-los-sellers.md` (decisiones 6, 7 y 8), `catalogo/propuesta-medidas-llanta.md` (grupo "Rin"), spec 000.
- Fuentes de la investigación (consultadas el 2026-11-15, tiendas y foros, no normas):
  - [Ficha de rin de rayos 1.60x21 de acero, 36 rayos, tipo enduro](https://motor-x.pages.dev/product/rim-spoked-wheel-160x21-steel-36-spokes-enduro-type)
  - [Listado de rin trasero de moto en Mercado Libre México](https://listado.mercadolibre.com.mx/rin-trasero-yamaha-de-xtz)
  - [Rines ATV 4x110 en RevZilla](https://www.revzilla.com/utv-atv-4x110-wheels)
  - [Moose, espaciadores ATV 4/110 M10](https://takatalo.fi/es/p184813/moose-wheel-spacers-atv-1-4-110-m10)
