# Cómo queda el catálogo y cómo cargan los sellers

Con las vitrinas de filtros (Llantas y los cuatro sistemas de Eléctrico y electrónico)
cambia **dónde** se publica el producto, no cuánto trabajo cuesta publicarlo. Resumen:

> Antes: el seller elegía la categoría más profunda (`Llantas de automóvil`) y el tipo
> quedaba "escrito" en el árbol.
> Ahora: el seller publica en la categoría del sistema o de la familia (`Llantas`,
> `Encendido`) y dice **qué es** y **qué medida tiene** en las especificaciones.

## 1. Qué cambia en el árbol del catálogo

| | Antes | Ahora |
|---|---|---|
| Llantas | 4 categorías hoja (automóvil · SUV y 4x4 · van, camión y transporte · OTR) | 1 categoría `Llantas` + especificación **Tipo de vehículo** con esos 4 valores |
| Eléctrico y electrónico | 21 categorías hoja sueltas | 4 categorías de sistema (Encendido · Arranque y carga · Gestión electrónica · Eléctrico general) + especificación **Tipo de producto** con los 22 valores |

Las páginas que desaparecen no se pierden: siguen existiendo como **valor de filtro** y
quedan registradas en `estructura-categorias-v2.csv` con el nivel
`Valor de filtro (…)`, apuntando a la URL de la categoría padre.

Total: de 589 a **567 páginas** (33 macros, 37 subcategorías, 497 tipos).

## 2. Especificaciones a crear en el admin (Catálogo › Especificaciones)

Se crean **una sola vez** por categoría y se marcan como *filtrable* para que aparezcan
en el panel de la izquierda.

### Llantas
| Especificación | Tipo de campo | Valores |
|---|---|---|
| Tipo de vehículo | Lista de **selección múltiple** (casillas) | Automóvil · SUV y 4x4 · Van y camión · OTR e industrial |
| Ancho | Lista | 175, 185, 195, 205, 215, 225, 235, 245, 265, 285… |
| Alto (perfil) | Lista | 45, 50, 55, 60, 65, 70, 75… |
| Rin | Lista | 13, 14, 15, 16, 17, 18, 20… |
| Medida completa | Texto | `185/65R15`, `700-16` (no filtrable: para buscar y mostrar) |
| Uso | Lista | Ciudad · Carretera · Todoterreno (A/T) · Barro (M/T) · Carga |
| Índice de carga/velocidad | Texto | `91V`, `110T` (opcional) |

### Eléctrico y electrónico (una por cada sistema)
| Especificación | Valores |
|---|---|
| Tipo de producto — Encendido | Bobinas · Módulos y distribuidores · Bujías · Cables de alta · Bujías de precalentamiento · Kits de sincronización |
| Tipo de producto — Arranque y carga | Motores de arranque · Bendix y automáticos · Alternadores · Reguladores de voltaje |
| Tipo de producto — Gestión electrónica | Computadores ECU · Módulos electrónicos · Actuadores · Sensores de motor (CKP, CMP, temperatura) |
| Tipo de producto — Eléctrico general | Fusibles · Relés · Suiches de encendido y cilindros de llave · Suiches e interruptores · Llaves y controles · Cableado · Conectores · Pitos |

Además, las que ya estaban previstas y **no cambian**: `Marca vehículo`, `Modelo`, `Año`
(compatibilidad, las usa el selector de vehículo) y la `Marca` del producto, que es un
campo nativo de VTEX.

## 3. Cómo publica el seller

Mismo flujo de siempre (Portal del seller o integración), con dos campos más:

1. **Categoría** — ya no busca la hoja exacta; elige `Llantas` o el sistema
   (`Eléctrico y electrónico > Encendido`). Menos opciones, menos error.
2. **Marca** — Michelin, Bosch, Yazaki… (campo nativo).
3. **Nombre y referencia** — se recomienda dejar la medida o el tipo en el título, como
   hace Mercado Libre: *"Llanta Michelin Energy XM2+ 185/65R15"*.
4. **Especificaciones** — aquí va lo que antes era la categoría:
   - Llanta: Tipo de vehículo = *Automóvil*, Ancho = *185*, Alto = *65*, Rin = *15*,
     Medida completa = *185/65R15*, Uso = *Ciudad*.
   - Encendido: Tipo de producto = *Bujías*.
5. **Compatibilidad** — Marca vehículo, Modelo y Año, como ya estaba previsto. **La carga
   la hace el seller** (decisión inicial del 2026-11-15); otras fuentes como un catálogo
   maestro de vehículos o datos de proveedor quedan como alternativa futura (spec 000, Q7).

### Lo que gana el seller
- No tiene que adivinar entre 21 categorías parecidas; publica en 4.
- Un producto que sirve para dos tipos (una llanta que va en SUV y en camioneta) no obliga
  a duplicar la publicación: se marcan los dos valores, porque `Tipo de vehículo` es de
  selección múltiple (decisión del 2026-11-15, §5).
- Corregir un dato mal puesto es editar una especificación, no mover el producto de
  categoría (que en VTEX implica perder la URL).

### Lo que hay que cuidar
- **La carga masiva debe traer las especificaciones.** Si un seller sube un producto sin
  `Tipo de producto` o sin `Ancho/Alto/Rin`, el producto aparece en la categoría pero no
  sale en ningún filtro. Recomendación: marcarlas como **obligatorias** en la plantilla de
  carga y rechazar la oferta si vienen vacías (Marketplace › Calidad de la oferta).
- **Valores cerrados, no texto libre.** `Ancho` debe ser lista, no texto: si un seller
  escribe "185 mm" y otro "185", salen dos filtros distintos.
- Para el catálogo viejo ya publicado hay que hacer una migración: mover los productos de
  las hojas eliminadas a la categoría padre y llenarles la especificación. Se hace por API
  o por hoja de cálculo; son 26 categorías afectadas.

## 4. Qué NO cambia

- Las URLs actuales **se conservan** como entradas con el filtro puesto
  (`/carros/llantas-y-rines/llantas?tipo=suv`), así no se pierde el SEO (decisión del
  2026-11-15, §5).
- El selector de vehículo sigue igual y encima del panel de filtros.
- Los sinónimos de esos 26 nombres se conservan: el cliente que busca "bujías" o
  "llantas SUV" llega igual, ahora a la categoría con el filtro aplicado.

## 5. Decisiones

### Tomadas (2026-11-15 y 2026-11-15, por el responsable del proyecto)

1. **URLs:** las cuatro URLs de tipo de llanta **se conservan** como entradas con el
   filtro puesto; no se eliminan ni se redirigen.
2. **Motos:** el mismo patrón se aplica a motos, con sus características propias
   (llantas delanteras, traseras, scooter, cross y el eléctrico de moto).
3. **`Tipo de vehículo`:** especificación de **selección múltiple**. La primera respuesta
   fue selección única (2026-11-15); se cambió el 2026-11-15.
4. **Producto que sirve para más de un tipo:** aparece en el resultado del filtro de cada
   tipo que le corresponda; se logra marcando varios valores, sin duplicar la publicación.
   (Quedan descartadas las alternativas de dos ofertas por producto y de equivalencias
   en el filtro.)
5. **Compatibilidad (Marca/Modelo/Año):** la carga el seller, inicialmente.
6. **Rines: especificaciones aprobadas (2026-11-15)**, tal como las propone
   `propuesta-medidas-llanta.md` para las hojas de rines (acero y aluminio en carros;
   "Rines" en motos):

   | Especificación | Ejemplos | Notas |
   |---|---|---|
   | Diámetro | 15, 16, 17… | pulgadas; lista cerrada |
   | Ancho de rin | 6J, 7J | lista cerrada |
   | Huecos | 4, 5, 6 | cantidad de pernos; lista cerrada |
   | Pernos (PCD) | `4x100`, `5x114.3` | patrón de pernos; lista cerrada |

   Como con las demás medidas, deben ser listas cerradas y obligatorias en la plantilla
   de carga (ver "Lo que hay que cuidar"). Aprobar las especificaciones **no** las crea:
   hay que darlas de alta en el admin de VTEX (Catálogo › Especificaciones).
7. **Rines de carros: se fusionan las hojas como con las llantas (2026-11-15).**
   `Rines de acero` y `Rines de aluminio` dejan de ser páginas y pasan a ser valores de un
   filtro dentro de `/carros/llantas-y-rines/rines`. Implicaciones:
   - **Hace falta una especificación nueva que conserve la diferencia:** `Material` con los
     valores `Acero` y `Aluminio`. **Nombre y valores confirmados el 2026-11-15.** Falta
     darla de alta en el admin, como las demás.
   - **Catálogo:** el seller publica en `Llantas y rines > Rines` y dice el material en la
     especificación, en vez de elegir entre dos categorías.
   - **Generador:** en `estructura-categorias-v2.json` la subcategoría `Rines` pasa a la
     misma forma que `Llantas` (`vitrina: "filtros"`, `filtro: "Material"`,
     `catalogo: true`) y se vuelve a correr `gen-categorias.py`.
   - **Páginas:** desaparecen 2 (`rines-de-acero`, `rines-de-aluminio`); se esperan 565
     páginas y 495 tipos en vez de 567 y 497. [Inferido: la línea base de 567 (33 macros,
     37 subcategorías, 497 hojas) sí se comprobó con `gen-categorias.py --dry-run` el
     2026-11-15; el resultado tras la fusión se verifica al hacerla.]
     Las URLs viejas se conservan como entradas con el filtro puesto, igual que en
     llantas (decisión 1).
   - **CSV y sinónimos:** las dos páginas pasan a `Valor de filtro (Material)` apuntando a
     `/carros/llantas-y-rines/rines`, y sus sinónimos (`aros de acero`, `rines deportivos`…)
     se conservan. Hay que regenerar y volver a importar los CSV de Intelligent Search.
   - **Catálogo viejo:** si ya hubiera productos en las hojas eliminadas, hay que moverlos
     a `Rines` y llenarles el material (hoy el workspace no tiene rines cargados).
   - **Motos:** no hay nada que fusionar; `Rines` ya es una sola hoja.
8. **Selector de medida también para rines (2026-11-15).** Mismo patrón de
   `TyreSizeSelector`, en cascada sobre las especificaciones de rines. En **carros** se
   muestran **los cuatro**: `Diámetro` → `Ancho de rin` → `Huecos` → `Pernos (PCD)`.
   Será un **componente nuevo**, sin tocar `TyreSizeSelector` (spec 007). Es trabajo de
   theme nuevo:
   - Una **spec nueva** antes de implementar (el proceso lo exige) y un componente React
     con **tests** en `react/__tests__` (constitución #2).
   - Hoy `TyreSizeSelector` solo sale en rutas que contienen `llantas`; hay que poder
     mostrar el de rines solo en las hojas de rines, y lo configura `gen-categorias.py`.
   - **Depende de los datos:** sin las especificaciones cargadas, los selects salen vacíos.
     En motos el selector usa otras especificaciones (decisión 9).
   - Ojo con los nombres: `TyreSizeSelector` busca la especificación `Rin` por coincidencia
     de prefijo; hay que comprobar que no se confunda con `Ancho de rin`. El componente
     nuevo usa el nombre exacto.
9. **Rines de motos (2026-11-15).** Se aplica la propuesta de la investigación (spec 007,
   §9): la hoja `Rines` de motos usa `Diámetro`, `Ancho de rin`, `Material` y
   **`Número de rayos`** (28, 32, 36…; lista cerrada y obligatoria en la plantilla de
   carga). **No** usa `Huecos` ni `Pernos (PCD)`, que quedan para carros. `Número de
   rayos` es una especificación nueva: hay que darla de alta en el admin.

**Efecto en el admin de VTEX [Inferido, no verificado]:** `Tipo de vehículo` hay que
cambiarlo a un tipo de campo de selección múltiple (casillas) y revisar los productos ya
cargados, que hoy tienen un solo valor. El filtro del panel izquierdo seguirá funcionando,
pero un producto con dos valores sumará a cada uno.

### Pendientes

- **Rines:** especificaciones, fusión de hojas, `Material` y selector de medida están
  **aprobados** (decisiones 6 a 8). Falta ejecutarlos: alta de las especificaciones en el
  admin y la fusión en el JSON. El selector tiene su spec en borrador: `specs/007-selector-medida-rines`.
- **Rines de motos:** la hoja `Rines` está dentro de `Rines y rayos`, junto a rayos,
  manzanas y balineras, que no son rines y no llevan estas especificaciones.
  **Investigado el 2026-11-15 (spec 007, §9):** en los rines de rayos de calle y enduro,
  `Huecos` y `Pernos (PCD)` **no parecen aplicar**; lo que se mide es diámetro, ancho y
  número de rayos (28, 32, 36…). Sí aplican en cuatrimotos (p. ej. 4x110). Los rines de
  motocarro no se confirmaron. **Decisión del 2026-11-15 (decisión 9 más arriba):** en motos
  se usa `Número de rayos` y no se reutiliza `Huecos`, que en carros significa número de
  pernos. Pendiente solo validar con un proveedor de repuestos de moto antes de cargar
  productos reales.
- **Motos:** falta definir sus especificaciones concretas (hoy la propuesta de medidas
  está en `propuesta-medidas-llanta.md`).
- Las cuatro especificaciones de **Eléctrico y electrónico** (`Tipo de producto`) no se
  mencionaron en la respuesta; se mantienen como están.
