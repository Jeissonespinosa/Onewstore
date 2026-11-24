# 000 — Contexto global de Repuestox

- **Estado:** draft
- **Responsable:** Diego
- **Rama:** `feat/specs`
- **Depende de:** — (documento base; las specs 001-006 se apoyan en él)
- **Última actualización:** 2026-11-15 (versión del theme 5.3.0, OpenSpec descartado, idioma de las specs y respuestas del equipo sobre negocio, catálogo y estado; **faltan las de actores y marketplace**)

> Spec de **contexto**, no de funcionalidad: fija qué es Repuestox, quién interviene, cómo
> funciona el dominio y qué hay realmente construido. Es el punto de partida para
> priorizar las demás specs.

## Cómo leer este documento

Cada afirmación lleva una etiqueta de **base** y, entre corchetes, su fuente:

| Etiqueta | Significa |
|---|---|
| **[Hecho·sitio]** | Observado el 2026-11-12 en `https://devwilbis--onewstore.myvtex.com/` (workspace `devwilbis`, cuenta `onewstore`). Es un workspace de **desarrollo**, no producción. |
| **[Hecho·código]** | Verificado leyendo este repositorio (`store/`, `react/`, `catalogo/`, `scripts/`). |
| **[Hecho·equipo]** | Respuesta dada por el responsable del proyecto (Diego) el 2026-11-15. Es una decisión o dato de negocio declarado, no verificado en el sitio ni en el código. |
| **[Hecho·git]** | Consta en el historial de git (commits, autores, mensajes). Prueba que algo se hizo o se declaró, **no** que hoy esté así en el sitio. |
| **[Hecho·spec]** | Lo dicen las specs 001-006, la constitución o los documentos de `catalogo/`. Es una **intención del equipo**, no prueba de que exista. |
| **[Inferido]** | Conclusión razonable a partir de lo anterior, sin confirmación directa. |
| **[Sin información]** | No hay rastro en el sitio, el código ni las specs. |

Alcance de la verificación del sitio: navegación como visitante anónimo, consulta de las
APIs públicas (`/api/catalog_system/pub/*` y `orderForm`) y un carrito de prueba
**sin ingresar datos personales ni pagar**. No se vio el panel admin, el login, la
dirección, el envío calculado ni el paso de pago. No se consultó producción.

---

## 1. Contexto y problema

Repuestox es una tienda de repuestos y accesorios construida sobre VTEX IO. Este
repositorio es solo la capa visual (`onewstore.store-theme`); casi todo lo que define el
negocio (catálogo, sellers, comisiones, pagos, logística) vive en el admin de VTEX y
no en el código. Por eso, sin un documento de contexto, es fácil confundir lo
**diseñado** con lo **operativo**.

## 2. Objetivos / No-objetivos

**Objetivos**
- Dejar por escrito el contexto global en los 5 ejes: negocio, actores, dominio, casos de uso y estado actual.
- Distinguir hechos de inferencias y de huecos de información.
- Listar las decisiones de negocio que bloquean las specs siguientes.

**No-objetivos**
- No define requisitos nuevos ni cambia código.
- No sustituye la revisión legal de la spec 001.
- No describe producción: hay que repetir la verificación allí (ver AC-3 en §9).

---

## 3. Negocio

| Punto | Contenido | Base |
|---|---|---|
| Qué es | Tienda en línea "Repuestox" con tres áreas: **Carros**, **Motos** y **Herramientas**. La home es una portada dividida Carros / Motos con una franja Herramientas. | [Hecho·sitio] [Hecho·código: `repuestox-home.json`] |
| Condición de lo que se vende | Repuestos **nuevos e importados**, más accesorios y herramientas para mecánica automotriz. **No** se venderán usados ni remanufacturados. | [Hecho·equipo] |
| Qué vende | Repuestos y accesorios. Árbol de **33 macrocategorías** (Carros 12, Motos 14, Herramientas 7), 37 subcategorías y 497 tipos: **567 páginas** (suma: 33 + 37 + 497). Macros de carros: Eléctrico y electrónico, Motor y transmisión, Lubricantes y mantenimiento, Llantas y rines, Filtros, Baterías, Frenos, Suspensión y dirección, Iluminación, Accesorios, Carrocería y climatización, Tecnología y seguridad. | [Hecho·código: `catalogo/estructura-categorias-v2.json`] [Hecho·sitio: 12 macros de carros en `/carros`] |
| Qué hay realmente a la venta | **8 productos** en el catálogo del workspace: 5 llantas (Aeolus, Goodyear, 2 Michelin, Bridgestone) y 3 de cuidado del auto con marca genérica "Brand name". La descripción de una llanta dice "Producto de ejemplo para validar los filtros". | [Hecho·sitio] → son **datos de prueba** [Inferido] |
| A quién | **Particulares y talleres** inicialmente; también empresas que compren repuestos para su flota. | [Hecho·equipo] |
| Dónde | **Todo Colombia**: locale `es-CO`, moneda COP, país COL, copys "Envíos a toda Colombia", selector de departamento y municipio, TyC bajo Ley 1480/1581. Fuera de Colombia no se vende. | [Hecho·equipo] [Hecho·sitio] [Hecho·código: `hero-slider.jsonc`] [Hecho·spec: 001] |
| Relación con Onewstore | **"Onewstore" es el nombre de una tienda previa**; se solicitará a VTEX cambiarlo. Hoy sigue siendo el vendor/cuenta VTEX (`onewstore`), el nombre del repo de GitHub y parte de las URLs del sitio y de los activos. "Repuestox" es la marca de cara al cliente. | [Hecho·equipo] + [Hecho·código] |
| Datos legales | Razón social y NIT **por asignar**. En los TyC (spec 001) y en `/about-us` (spec 005) se usan **placeholders** hasta tenerlos. `/about-us` muestra texto de plantilla de VTEX en inglés. | [Hecho·equipo] + [Hecho·sitio] |

## 4. Actores

| Actor | Hoy | Planeado | Base |
|---|---|---|---|
| **Comprador anónimo / invitado** | Existe: navega, filtra, arma carrito y llega al checkout, que pide solo un correo. `loggedIn: false`. | — | [Hecho·sitio] |
| **Comprador registrado** | Hay botón "Inicio de sesión / Cuenta" (`vtex.login`, `vtex.my-account`). No se probó el flujo. | Calificar su compra y enviar feedback del sitio (spec 002) | [Hecho·código] / [Hecho·spec] |
| **Seller propio `Repuestox` (id `1`)** | Único seller activo: los 8 productos y el ítem de prueba salen con `seller: "1"`. Como Repuestox será **solo intermediario** (Q2), este seller es **dato de prueba** que no debería existir en producción [Inferido]; falta decidir su destino. | Retirar o reemplazar por sellers reales | [Hecho·sitio] |
| **Sellers terceros** | **No existen** en este workspace. Solo hay diseño: condiciones para sellers y plantilla de carga con especificaciones obligatorias (la calificación de sellers quedó fuera de la spec 002). | Sí (spec 001 y `catalogo/como-cargan-los-sellers.md`) | [Hecho·spec] |
| **Administrador / moderador** | Admin de VTEX para catálogo y especificaciones. | Cola de moderación de reseñas (aprobar/rechazar/ocultar) | [Hecho·spec] |
| **Telemarketing** | El header declara el bloque `telemarketing` (`vtex.telemarketing`), herramienta nativa de VTEX para que un agente compre en nombre del cliente. No se vio en uso. | — | [Hecho·código] |
| **Abogado revisor** | — | Requerido para publicar la spec 001; nombre y plazo sin definir. | [Hecho·spec] |
| **Logística / transportadora** | El PDP tiene el cotizador "Calcular envío". `logisticsInfo` vino vacío: sin dirección no se calculó nada. | — | Cotizador: [Hecho·sitio]. Transportadoras y tarifas: **[Sin información]** |
| **Pasarela de pago** | `paymentSystems` vino vacío. Puede ser que no haya ninguna configurada o que VTEX la muestre solo tras el paso de dirección. | — | [Hecho·sitio]. Cuál: **[Sin información]** |
| **Atención al cliente** | Enlace a `/contact-us`, cuyo formulario muestra "Error al cargar el formulario". Hay también un CTA "¿No encuentras el repuesto que buscas? Escríbenos y lo conseguimos". Redes: Facebook, Instagram, TikTok (enlaces genéricos a las portadas, sin cuenta de Repuestox). WhatsApp solo como botón de compartir. | — | [Hecho·sitio] [Hecho·código] |

## 5. Elementos del dominio

### 5.1 Catálogo y categorías
- La estructura de categorías es la fuente única: `catalogo/estructura-categorias-v2.json`. De ahí `scripts/gen-categorias.py` genera `store/routes.json` y los `category-*.jsonc`, y exporta `estructura-categorias-v2.csv`. Esos archivos **no se editan a mano** (constitución #3). [Hecho·código]
- Ojo: el árbol **real del API** del workspace solo tiene `Carros` (con 1 hijo) y `Repuestos mecanicos carro`. Es decir, las ~567 páginas existen como rutas del theme, pero el catálogo de VTEX no tiene ese árbol cargado. Los listados de categoría salen de la categoría `Carros > Llantas y rines > Llantas`. [Hecho·sitio] El equipo confirma que **el árbol completo aún no se carga** en VTEX. [Hecho·equipo]
- **Por qué son tantas páginas:** cada nodo del árbol (macro, subcategoría y tipo de producto) tiene su propia página y su propia URL (`/carros/frenos/pastillas-de-freno`). Son 33 + 37 + 497 = 567 y no se escriben a mano: las genera el script. [Hecho·código: `gen-categorias.py`]
- **Cómo validar qué falta cargar** [Inferido, método propuesto]: comparar las rutas del JSON con el árbol real de VTEX (`/api/catalog_system/pub/category/tree/<niveles>`) o con Admin › Catálogo › Categorías. El script ya valida que ningún enlace interno apunte a una ruta inexistente (`gen-categorias.py --dry-run`), pero **no** compara contra el catálogo de VTEX; esa comparación sería una tarea nueva.
- Las rutas se generan con `--real` solo "cuando las categorías ya existan en el catálogo". Mientras tanto, los listados son placeholders. [Hecho·código: README]
- Sinónimos de búsqueda: `gen-sinonimos.py` produce 3 CSV (límite 20 KB c/u) para importar en Intelligent Search; los términos conflictivos van a `sinonimos-conflictos.txt` para decisión del negocio. [Hecho·código]

### 5.2 Selector de vehículo (`react/VehicleSelector.js`)
- Cascada **Marca → Modelo → Año**, alimentada por los *facets* de `vtex.search-graphql` para la categoría de la ruta actual. Las especificaciones que busca se llaman `Marca vehículo`, `Modelo` y `Año`. Al buscar navega a `/<categoría>/<marca>/<modelo>/<año>?map=...`. [Hecho·código]
- Si el catálogo no tiene esas especificaciones, los selects quedan vacíos y el botón deshabilitado. Es lo que se ve hoy: `Marca`, `Modelo` y `Año` deshabilitados y sin opciones. **El selector no funciona de punta a punta porque falta cargar la compatibilidad en el catálogo.** [Hecho·código + Hecho·sitio]
- **Fuente de la compatibilidad (Marca/Modelo/Año):** decisión inicial: **la carga cada seller**, con las tres especificaciones al publicar. [Hecho·equipo, 2026-11-15] Las otras opciones (catálogo maestro de vehículos, datos de proveedor u OEM, VIN) se conservan como alternativas futuras en Q7 (§10). Consecuencia: la calidad del selector de vehículo depende de que los sellers llenen esos campos con listas cerradas; hasta que haya sellers cargando, el selector seguirá vacío (CU-3).
- Compatibilidad por producto = tres especificaciones; no hay VIN, ni tabla de fitment, ni validación de que un repuesto "sirve" para un vehículo. [Hecho·código] La spec 001 menciona VIN como contenido legal deseado, sin implementación. [Hecho·spec]

### 5.3 Selector de llantas (`react/TyreSizeSelector.js`)
- Cascada **Ancho → Perfil → Rin**, mismo patrón y mismas fuentes de facets, solo visible en rutas que contienen `llantas`. [Hecho·código]
- Funciona en el workspace: ofrece Ancho 185/205/235/265/1100, Perfil 55/65/70/75, Rin 15/16/20. Filtros adicionales: Tipo de vehículo (Automóvil, SUV y 4x4, Camión y van, OTR e industrial), Uso (Ciudad, Carretera, Todoterreno A/T, Carga), Marca y precio. [Hecho·sitio]
- Modelo de datos: especificaciones `Tipo de vehículo`, `Ancho`, `Alto (perfil)`, `Rin`, `Uso`, `Medida completa`. La `Medida completa` (`185/65R15`) es la cadena canónica. Los productos Aeolus 1100-20 no tienen `Alto (perfil)` (formato antiguo de camión), lo que el diseño ya prevé. [Hecho·sitio] [Hecho·código: `propuesta-medidas-llanta.md`]
- Decisión de diseño: las 4 hojas de llantas se fusionan en una sola categoría `Llantas` + especificación `Tipo de vehículo`; igual con los 4 sistemas de Eléctrico y electrónico. [Hecho·spec: `como-cargan-los-sellers.md`]
- **Decisiones del equipo sobre los 3 puntos pendientes de ese documento** [Hecho·equipo] (actualizadas el 2026-11-15):
  1. Se **conservan las URLs** actuales (entradas con el filtro puesto).
  2. El mismo patrón se aplica a **motos**, con sus características propias.
  3. `Tipo de vehículo` es de **selección múltiple** (decisión del 2026-11-15; la primera respuesta fue selección única). Un producto que sirve para dos o más tipos se marca con todos ellos y aparece en el resultado del filtro de cada tipo que le corresponda, sin duplicar la publicación. [Hecho·equipo]
  - La tensión que había entre selección única y "un producto en varios tipos" queda **resuelta** (Q12). Implica un cambio en el admin de VTEX: hoy los productos de prueba tienen un solo valor (p. ej. `Automóvil`) y la especificación debe pasar a tipo de campo de selección múltiple (casillas). [Inferido: es el ajuste habitual de VTEX; no se verificó en el admin]
  - **Rines:** el 2026-11-15 se **aprobaron sus especificaciones**: `Diámetro`, `Ancho de rin`, `Huecos` y `Pernos (PCD)`, como en `propuesta-medidas-llanta.md`. [Hecho·equipo] Aprobarlas no las crea: falta darlas de alta en el admin de VTEX.
  - **Fusión de hojas de rines de carros** (`Rines de acero` y `Rines de aluminio` pasan a valores de filtro): **aprobada el 2026-11-15**. [Hecho·equipo] Exige una especificación nueva: `Material` con `Acero` y `Aluminio`, **confirmada el 2026-11-15** [Hecho·equipo], y regenerar páginas y sinónimos; esperadas 565 páginas y 495 tipos [Inferido]. La línea base actual de 567 páginas (33 macros, 37 subcategorías, 497 hojas) se comprobó con `gen-categorias.py --dry-run` el 2026-11-15 [Hecho·código]. Detalle en `catalogo/como-cargan-los-sellers.md`, decisión 7.
  - **Selector de medida de rines: aprobado el 2026-11-15.** [Hecho·equipo] La spec **007** (borrador) lo describe; el componente todavía no existe (hoy solo hay `TyreSizeSelector`). Decisión 8 del mismo documento.
  - **Rines de motos: decidido el 2026-11-15** [Hecho·equipo]: la hoja `Rines` usa `Diámetro`, `Ancho de rin`, `Material` y `Número de rayos` (nueva), y **no** `Huecos` ni `Pernos (PCD)`. La base de esa decisión es una investigación [Inferido] con fichas de tienda; conviene validarla con un proveedor de repuestos de moto antes de cargar productos reales. Detalle y fuentes en la spec 007 §9.
  - **Selector de rines:** se muestran **los 4 selects** en carros y será un **componente nuevo** (spec 007). [Hecho·equipo]

### 5.4 Sellers y comisiones
- **Seller:** hoy solo existe `Repuestox` (id 1). El PDP **no muestra** quién vende ni quién envía (RF-5 de la spec 001 lo pide). [Hecho·sitio]
- **Cómo publicaría un seller** (propuesta): elige categoría de sistema o familia (menos opciones), marca, nombre con la medida, especificaciones obligatorias (`Tipo de producto`, `Ancho/Alto/Rin`…) y compatibilidad (`Marca vehículo`, `Modelo`, `Año`). Se recomienda rechazar ofertas sin especificaciones (Marketplace › Calidad de la oferta) y usar listas cerradas. Hay que migrar el catálogo viejo (26 categorías afectadas). [Hecho·spec: `como-cargan-los-sellers.md`]
- **Comisiones, split de pagos, liquidación a sellers, KYC:** [Sin información]. La spec 001 lo deja como pregunta abierta ("¿Quién gestiona pagos a sellers (split de VTEX)?").

### 5.5 Envío
- El PDP incluye `shipping-simulator` con selector de departamento → municipio (Colombia). [Hecho·código: `product.jsonc`; Hecho·sitio]
- En el carrito: "Envío: a calcular" y "Tasas y fletes calculados en el carrito". [Hecho·sitio]
- Transportadoras, tarifas, plazos, zonas, quién envía (seller o Repuestox): [Sin información]. El copy promete "Envíos a toda Colombia". [Hecho·código]

### 5.6 Pagos y checkout
- Checkout **nativo de VTEX** (`/checkout/#/cart`), **sin personalizar**: dice "Place your logo here", botón verde por defecto. [Hecho·sitio]
- Compra como invitado con solo correo. Sin checkbox de TyC ni de política de privacidad en el carrito. [Hecho·sitio]
- Medios de pago: la lista vino vacía antes de ingresar datos. Proveedor, medios (PSE, tarjetas, contra entrega…) y comisiones: [Sin información]. El copy dice "Pago seguro". [Hecho·código]
- Página de pedido (`order-placed`) con bloque de seller (`op-order-seller`) ya declarado. [Hecho·código]

## 6. Casos de uso

| # | Flujo | Estado | Evidencia |
|---|---|---|---|
| CU-1 | **Navegar por categorías** (Carros → macro → subcategoría → tipo) | Funciona como navegación; los listados dependen de datos de prueba. Menú «Categorías» global en el header, escritorio y móvil (spec 003, `done`). | [Hecho·sitio] |
| CU-2 | **Buscar llantas por medida** (Ancho/Perfil/Rin + filtros) | **Funciona** con las 5 llantas de prueba. | [Hecho·sitio] |
| CU-3 | **Buscar por vehículo** (Marca/Modelo/Año) | **No funciona**: selects vacíos y deshabilitados (faltan especificaciones de compatibilidad). | [Hecho·sitio + código] |
| CU-4 | **Ver ficha de producto** (precio, referencia, especificaciones, cantidad, envío) | Funciona. Sin reseñas visibles ni seller visible. La imagen es el logo de Repuestox (sin fotos reales). | [Hecho·sitio] |
| CU-5 | **Comprar** (agregar al carrito → checkout) | Llega hasta el carrito y pide correo. **No verificado**: dirección, envío, pago y confirmación. | [Hecho·sitio] |
| CU-6 | **Buscar texto libre** ("¿Qué estás buscando?") | Existe; la ruta de resultados se vio con "OOPS! No encontramos ningún resultado" para términos inexistentes. Sinónimos pendientes de importar. | [Hecho·sitio] [Hecho·código] |
| CU-7 | **Devolver / retracto / garantía** | **No existe**: `/devoluciones-y-garantias` cae en "no encontramos ningún resultado". Solo hay referencia legal en la spec 001 (Ley 1480, art. 47). | [Hecho·sitio] |
| CU-8 | **Publicar producto como seller** | **No existe** en el sitio. `/condiciones-sellers` no existe y no se vio portal de seller. Solo hay una propuesta de carga (§5.4). | [Hecho·sitio + spec] |
| CU-9 | **Contactar a Repuestox** | `/contact-us` muestra "Error al cargar el formulario". | [Hecho·sitio] |
| CU-10 | **Calificar la compra / enviar feedback del sitio** | **Implementado en `devdiego`, no publicado**; spec 002 en `implementing` (rating de 5 estrellas en la confirmación del pedido y botón flotante de feedback, con servicio propio `onewstore.feedback-service`). El PDP tiene declarados `product-rating-summary` y `product-questions-and-answers` pero no se renderizaron (reseñas de producto: fuera de alcance de la 002). | [Hecho·código + sitio] |
| CU-11 | **Aceptar TyC al comprar** | **No existe**; spec 001 en `draft`. | [Hecho·sitio + spec] |

## 7. Estado actual: producción vs. diseño

> No se verificó **producción** en el sitio. Todo lo marcado "construido" es lo visto en el
> workspace `devwilbis` el 2026-11-12. Sobre producción el repo dice dos cosas: el proceso
> (`vtex release`, `vtex install onewstore.store-theme@<versión>`) y la versión del
> `manifest.json`, hoy **5.3.0** (antes 5.2.0). El commit `ab08278` (2026-11-13, de otro
> miembro del equipo) afirma que esa versión se publicó con `vtex publish` y se instaló en
> `master`, `release`, `devwilbis` y `devdiego`. [Hecho·git] Es una declaración del
> commit: no se comprobó en `master` ni existe un dominio propio conocido. **Las
> observaciones de este documento corresponden al theme 5.2.0 o anterior; hay que
> revisar si 5.3.0 cambió algo.** El equipo confirma que **5.3.0 no cambió nada respecto
> de 5.2.0** (solo subió la versión; el commit únicamente toca `manifest.json`), así que
> las observaciones de este documento siguen vigentes. [Hecho·equipo]

| Área | Estado | Base |
|---|---|---|
| Theme: header, footer, home dividida, landings de carros/motos/herramientas, páginas de categoría, PDP, minicart, filtros | **Construido** (commits `13fe7fa` y `edd35e3`) | [Hecho·código + sitio] |
| Selector de llantas | **Construido y operativo** con datos de prueba | [Hecho·sitio] |
| Selector de vehículo | **Construido, sin datos**: inoperante hoy | [Hecho·sitio] |
| Catálogo real (árbol de 567 páginas, productos, imágenes, compatibilidad) | **Sin cargar**: 8 productos de prueba; imágenes y slides con placeholder ("REEMPLAZAR … 1600x700") | [Hecho·sitio] |
| Marketplace con sellers terceros | **Objetivo**, no operativo. Un solo seller (el propio). Sin condiciones, comisiones ni portal visibles. | [Hecho·sitio] + [Inferido] |
| TyC y 6 páginas legales (D2-D7) | **Diseño** (spec 001 `draft`); las rutas no existen | [Hecho·sitio + spec] |
| Feedback de compra y del sitio | **Implementado en `devdiego`, sin publicar** (spec 002 `implementing`) | [Hecho·código] |
| Menú global de categorías | **Construido** (spec 003 `done`): botón «Categorías» en el header de todas las páginas, panel de 3 columnas en escritorio y drawer con acordeón en móvil; datos en `react/category-menu.json`, generado por `scripts/gen-categorias.py`. Probado en workspace `devdiego`, no publicado | [Hecho·código + spec] |
| Tiempo de carga | **Optimizado** (spec 010 `done`): se quitó el `@import` de Google Fonts (render bloqueante ~1 005 → ~163 ms), Montserrat es la única familia (también en los tokens de `style.json`) y el hero de la inicio sirve 800 px al móvil. Lighthouse móvil final 74 / 74 / 69 y escritorio 88 / 90 / 93 en el workspace `pruebamedidas` (inicio / categoría / ficha). Meta de +10 móvil **no alcanzada** (excepción aceptada R1). Pendientes fuera del repo: reCAPTCHA de la plataforma (~354 KB en todas las páginas) y el logo de 2551 px. `devdiego` ya no existe; `pruebatema` resuelve mal las rutas de catálogo; se midió en `pruebamedidas`. No publicado | [Hecho·medido + spec] |
| Checkout, pagos, envíos | **Sin personalizar y sin verificar** | [Hecho·sitio] |
| Contacto | Roto en el workspace | [Hecho·sitio] |
| Producción | **No hay tienda en producción con dominio propio: el proyecto está en desarrollo.** El git declara 5.3.0 instalada en `master`, pero eso no equivale a una tienda abierta al público. | [Hecho·equipo] + [Hecho·git] |
| Proceso de specs | Las specs viven en `specs/` (000-007) y se ejecutan con la skill `implementar-spec`. **OpenSpec se probó y se descartó** (2026-11-15); no hay carpeta `openspec/`. Idioma de las specs y de la documentación: **español**, según la constitución #5. | [Hecho·código] |

### Hallazgos de calidad a corregir
Cubiertos por las specs 004 (hallazgo 2), 005 (hallazgo 1) y 006 (hallazgos 3 a 7).
1. `/about-us` es plantilla en inglés (texto de VTEX); no cuenta qué es Repuestox.
2. `/contact-us`: el formulario no carga (el `docs/contact-schema.json` y la entidad de Master Data deben existir en la cuenta; **no se investigó la causa**).
3. Checkout genérico: sin logo ni estilos de marca.
4. Redes sociales del footer apuntan a las portadas de Facebook/Instagram/TikTok, no a cuentas de Repuestox.
5. Bloques nativos declarados pero sin efecto visible (rating, preguntas y respuestas).
6. Una URL no existente muestra la pantalla de "búsqueda sin resultados" en vez de un 404 claro; y las URLs no existentes responden HTTP 200 (impide detectar páginas rotas por estado).
7. La constitución #2 pide tests en `react/__tests__` para todo componente: existe `VehicleSelector.test.js`, pero **no hay test de `TyreSizeSelector`** [Hecho·código].

---

## 8. Requisitos funcionales (de esta spec)

- `RF-1` Este documento se mantiene como fuente del contexto global y se actualiza cuando cambie el estado real.
- `RF-2` Cada afirmación nueva lleva su etiqueta de base ([Hecho·…], [Inferido], [Sin información]).
- `RF-3` Antes de dar por "hecho" algo para producción, se repite la verificación en producción y se anota la fecha.

## 9. Criterios de aceptación

- `AC-1` Los 5 ejes (negocio, actores, dominio, casos de uso, estado) tienen su sección y ninguna afirmación carece de etiqueta de base.
- `AC-2` Cada [Sin información] está enlazada a una pregunta abierta (§10) con responsable.
- `AC-3` Se repite la verificación en producción y se registra fecha y diferencias respecto al workspace `devwilbis`.
- `AC-4` El responsable de negocio revisa y corrige las secciones 3 y 4 (negocio y actores).

## 10. Preguntas abiertas

**Negocio** (respondidas el 2026-11-15)
- [x] ¿Qué es "Onewstore" respecto de "Repuestox"? → Nombre de una tienda previa; se pedirá a VTEX el cambio. Razón social y NIT **por asignar** (placeholder en TyC). *(Parcial: falta el NIT/razón social y el cambio de cuenta.)*
- [x] ¿Qué ciudades o regiones se atienden? → Todo Colombia.
- [x] ¿Quién es el comprador objetivo? → Particulares y talleres; también empresas con flota.
- [x] ¿Se venden usados, remanufacturados o importados? → Solo nuevos e importados, más accesorios y herramientas de mecánica automotriz.

**Actores y marketplace** (**pendientes: el equipo responderá luego de confirmarlas**)
- [x] ¿Repuestox es mero intermediario o vendedor directo? → **Intermediario únicamente** (2026-11-15): no vende por cuenta propia; los vendedores son los sellers. *(Parcial: falta saber si el marketplace con sellers terceros tiene fecha, y qué pasa con el seller de prueba `Repuestox` id 1.)*
- [ ] ¿Cómo se pagan comisiones y se liquida a sellers (split de VTEX o manual)? ¿Qué porcentaje?
- [ ] ¿Quién envía: el seller, Repuestox o un operador logístico? ¿Hay transportadoras contratadas?
- [ ] ¿Cuál es la pasarela de pago y qué medios se aceptan?
- [ ] ¿Quién atiende al cliente y por qué canal (WhatsApp, correo, teléfono)?

**Catálogo y vehículo**
- [x] ¿De dónde saldrá la tabla de compatibilidad (Marca/Modelo/Año)? ¿Se necesita VIN? → **Inicialmente la carga el seller.** Las otras opciones y el VIN quedan como alternativas futuras (ver Q7).
- [x] ¿Se carga el árbol de 567 categorías en VTEX ya, o primero un subconjunto? → **No aún.** Falta decidir el subconjunto inicial y cómo validar la carga (ver Q8).
- [x] Decisiones de `como-cargan-los-sellers.md`: se conservan las URLs; el patrón aplica a motos; `Tipo de vehículo` es de **selección múltiple** (corregido el 2026-11-15; Q12 resuelta). → Rines: especificaciones, fusión de hojas y selector aprobados el 2026-11-15; `Material` (Acero/Aluminio) confirmado; falta ejecutarlos (alta en el admin, fusión en el JSON) y la spec 007 del selector está en borrador.

**Estado**
- [x] ¿Existe tienda en producción con dominio propio? → **No, está en desarrollo.**
- [x] ¿Qué cambió en 5.3.0 respecto de 5.2.0? → Nada inicialmente.
- [x] ¿Qué se hizo con `/contact-us`? → **Se tiene que corregir** (spec 004).

### Seguimiento de preguntas abiertas

Cada pregunta queda con responsable y fecha límite. Las abiertas están por asignar: son
decisiones de negocio y no se asignan sin confirmación del equipo.

| ID | Pregunta (resumen) | Bloquea | Estado | Responsable | Fecha límite |
|---|---|---|---|---|---|
| Q1 | Relación Onewstore ↔ Repuestox; razón social y NIT | 001, 005 | **Parcial**: Onewstore es una tienda previa; NIT y razón social por asignar (placeholder). Falta pedir a VTEX el cambio de cuenta. | Por asignar | Por definir |
| Q2 | ¿Intermediario o vendedor directo? ¿Marketplace con fecha? | 001 | **Parcial**: Repuestox es **intermediario únicamente** (2026-11-15). Falta la fecha del marketplace con sellers terceros y decidir qué se hace con el seller de prueba `Repuestox` (id 1). | Por asignar | Por definir |
| Q3 | Pasarela de pago, comisiones y liquidación a sellers | 001 (D4) | **Abierta** (ídem) | Por asignar | Por definir |
| Q4 | Quién envía y qué transportadoras hay | 001 (D3, D6) | **Abierta** (ídem) | Por asignar | Por definir |
| Q5 | Canal y responsable de atención al cliente | 004 | **Abierta** (ídem) | Por asignar | Por definir |
| Q6 | Abogado revisor y plazo | 001 (AC-5) | **Abierta** | Por asignar | Por definir |
| Q7 | Fuente de la compatibilidad Marca/Modelo/Año y VIN | CU-3 | **Resuelta para la fase inicial**: la carga el seller. Alternativas futuras abajo. | — | — |
| Q8 | ¿Árbol completo o subconjunto en VTEX primero? | 003 | **Parcial**: aún no se carga. Falta elegir el subconjunto y el método de validación. | Por asignar | Por definir |
| Q9 | ¿Hay producción? ¿Qué cambió en 5.3.0? | AC-3 (000) | **Resuelta**: no hay tienda en producción (en desarrollo); 5.3.0 no cambió nada. | — | — |
| Q10 | Comprador objetivo; usados, remanufacturados o importados | 001, 005 | **Resuelta**: particulares y talleres (y flotas); solo nuevos e importados. | — | — |
| Q11 | ¿Quién lee el feedback (compra y sitio), con qué frecuencia y cómo se entera? *(antes: moderación de reseñas; la 002 ahora es feedback privado)* | 002 | **Resuelta** (2026-11-24): los asesores lo revisan como **tickets de soporte asignables**, en un sistema aparte (página para sellers, administradores y asesores, en .NET) que lee el feedback por la API de Master Data. Ese sistema aún no tiene spec. | Diego | — |
| Q12 | ¿Cómo aparece un producto en varios tipos de vehículo? ¿Y los rines? | `como-cargan-los-sellers.md` | **Resuelta** para llantas: selección múltiple (2026-11-15). **Rines: especificaciones, fusión de hojas y selector aprobados (2026-11-15)**; `Material` confirmado; rines de motos decididos (`Número de rayos`, sin `Huecos` ni PCD). Queda ejecutar: alta de las especificaciones en el admin, fusión en el JSON y avanzar la spec 007 (borrador). | Por asignar | Por definir |

**Q7: decisión y alternativas** (las alternativas son propuestas [Inferido], no verificadas con proveedores):
1. **ELEGIDA para la fase inicial: carga por el seller** con las tres especificaciones (`Marca vehículo`, `Modelo`, `Año`), como ya propone `como-cargan-los-sellers.md`. Es lo más barato, pero la calidad depende de cada seller; conviene listas cerradas y especificaciones obligatorias en la plantilla de carga.
   Alternativas futuras, conservadas para cuando la carga por seller se quede corta:
2. **Catálogo maestro de vehículos** (marcas, modelos y años del parque colombiano) para que el selector ofrezca listas cerradas y los sellers elijan de ahí. Evita errores de escritura; hay que conseguir la fuente.
3. **Datos de un proveedor de autopartes** con compatibilidad por referencia OEM, o de los propios importadores (suelen tenerla en sus catálogos). Habría que confirmar disponibilidad y licencia.
4. **VIN:** dejarlo para una fase posterior. Exige una fuente de decodificación y datos personales del vehículo (a revisar con la Ley 1581).

## 11. Fuera de alcance / futuro
- Reseñas públicas de producto, calificación y reputación de sellers (salieron de la spec 002; se retoman cuando el marketplace tenga fecha).
- Venta fuera de Colombia.
- Cualquier cambio de código derivado de los hallazgos (cubierto por las specs 004-006).

## 12. Referencias
- Sitio verificado: `https://devwilbis--onewstore.myvtex.com/` (workspace de desarrollo, 2026-11-12).
- Código: `README.md`, `manifest.json`, `store/`, `react/VehicleSelector.js`, `react/TyreSizeSelector.js`, `react/queries/vehicleFacets.gql`, `catalogo/`, `scripts/gen-categorias.py`, `scripts/gen-sinonimos.py`.
- Specs: `specs/constitution.md`, `001-tyc-marketplace`, `002-feedback-rating`, `003-menu-categorias-global`, `004-contact-us-roto`, `005-about-us`, `006-ajustes-calidad-tienda`, `catalogo/como-cargan-los-sellers.md`, `catalogo/propuesta-medidas-llanta.md`.
- Proceso: `.claude/skills/implementar-spec/SKILL.md`, `specs/constitution.md` (#5, idioma), commit `ab08278` (versión 5.3.0).
