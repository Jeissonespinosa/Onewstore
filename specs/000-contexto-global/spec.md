# 000 — Contexto global de Repuestox

- **Estado:** draft
- **Responsable:** Diego
- **Rama:** `feat/specs`
- **Depende de:** — (documento base; las specs 001-003 se apoyan en él)

> Spec de **contexto**, no de funcionalidad: fija qué es Repuestox, quién interviene, cómo
> funciona el dominio y qué hay realmente construido. Es el punto de partida para
> priorizar las demás specs.

## Cómo leer este documento

Cada afirmación lleva una etiqueta de **base** y, entre corchetes, su fuente:

| Etiqueta | Significa |
|---|---|
| **[Hecho·sitio]** | Observado el 2026-11-12 en `https://devwilbis--onewstore.myvtex.com/` (workspace `devwilbis`, cuenta `onewstore`). Es un workspace de **desarrollo**, no producción. |
| **[Hecho·código]** | Verificado leyendo este repositorio (`store/`, `react/`, `catalogo/`, `scripts/`). |
| **[Hecho·spec]** | Lo dicen las specs 001-003, la constitución o los documentos de `catalogo/`. Es una **intención del equipo**, no prueba de que exista. |
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
- No describe producción: hay que repetir la verificación allí (ver §8).

---

## 3. Negocio

| Punto | Contenido | Base |
|---|---|---|
| Qué es | Tienda en línea "Repuestox" con tres áreas: **Carros**, **Motos** y **Herramientas**. La home es una portada dividida Carros / Motos con una franja Herramientas. | [Hecho·sitio] [Hecho·código: `repuestox-home.json`] |
| Qué vende | Repuestos y accesorios. Árbol de **33 macrocategorías** (Carros 12, Motos 14, Herramientas 7), 37 subcategorías y 497 tipos: **567 páginas** (suma: 33 + 37 + 497). Macros de carros: Eléctrico y electrónico, Motor y transmisión, Lubricantes y mantenimiento, Llantas y rines, Filtros, Baterías, Frenos, Suspensión y dirección, Iluminación, Accesorios, Carrocería y climatización, Tecnología y seguridad. | [Hecho·código: `catalogo/estructura-categorias-v2.json`] [Hecho·sitio: 12 macros de carros en `/carros`] |
| Qué hay realmente a la venta | **8 productos** en el catálogo del workspace: 5 llantas (Aeolus, Goodyear, 2 Michelin, Bridgestone) y 3 de cuidado del auto con marca genérica "Brand name". La descripción de una llanta dice "Producto de ejemplo para validar los filtros". | [Hecho·sitio] → son **datos de prueba** [Inferido] |
| A quién | No hay público objetivo declarado. Por el lenguaje y el selector de vehículo se apunta a dueños de carros y motos. | [Inferido] |
| Dónde | **Colombia**: locale `es-CO`, moneda COP, país COL, copys "Envíos a toda Colombia", selector de departamento y municipio, TyC bajo Ley 1480/1581. Fuera de Colombia no se vende. | [Hecho·sitio] [Hecho·código: `hero-slider.jsonc`] [Hecho·spec: 001 "No se cubre venta fuera de Colombia"] |
| Relación con Onewstore | `onewstore` es el **vendor/cuenta VTEX** y el nombre del repo de GitHub. "Repuestox" es la marca de cara al cliente (logo, footer, header). El README las junta como "Onewstore / Repuestox". No se sabe si son la misma empresa, empresa y proyecto, o cliente y proveedor. | Cuenta/vendor: [Hecho·código]. Relación societaria: **[Sin información]** |
| Datos legales | Razón social, NIT y registro: no aparecen. `/about-us` muestra texto de plantilla de VTEX en inglés. | [Sin información] |

## 4. Actores

| Actor | Hoy | Planeado | Base |
|---|---|---|---|
| **Comprador anónimo / invitado** | Existe: navega, filtra, arma carrito y llega al checkout, que pide solo un correo. `loggedIn: false`. | — | [Hecho·sitio] |
| **Comprador registrado** | Hay botón "Inicio de sesión / Cuenta" (`vtex.login`, `vtex.my-account`). No se probó el flujo. | Reseñas verificadas y edición de las propias (spec 002) | [Hecho·código] / [Hecho·spec] |
| **Seller propio `Repuestox` (id `1`)** | Único seller activo: los 8 productos y el ítem de prueba salen con `seller: "1"`. | — | [Hecho·sitio] |
| **Sellers terceros** | **No existen** en este workspace. Solo hay diseño: condiciones para sellers, feedback del seller, rating agregado del seller, plantilla de carga con especificaciones obligatorias. | Sí (specs 001, 002 y `catalogo/como-cargan-los-sellers.md`) | [Hecho·spec] |
| **Administrador / moderador** | Admin de VTEX para catálogo y especificaciones. | Cola de moderación de reseñas (aprobar/rechazar/ocultar) | [Hecho·spec] |
| **Telemarketing** | El header declara el bloque `telemarketing` (`vtex.telemarketing`), herramienta nativa de VTEX para que un agente compre en nombre del cliente. No se vio en uso. | — | [Hecho·código] |
| **Abogado revisor** | — | Requerido para publicar la spec 001; nombre y plazo sin definir. | [Hecho·spec] |
| **Logística / transportadora** | El PDP tiene el cotizador "Calcular envío". `logisticsInfo` vino vacío: sin dirección no se calculó nada. | — | Cotizador: [Hecho·sitio]. Transportadoras y tarifas: **[Sin información]** |
| **Pasarela de pago** | `paymentSystems` vino vacío. Puede ser que no haya ninguna configurada o que VTEX la muestre solo tras el paso de dirección. | — | [Hecho·sitio]. Cuál: **[Sin información]** |
| **Atención al cliente** | Enlace a `/contact-us`, cuyo formulario muestra "Error al cargar el formulario". Hay también un CTA "¿No encuentras el repuesto que buscas? Escríbenos y lo conseguimos". Redes: Facebook, Instagram, TikTok (enlaces genéricos a las portadas, sin cuenta de Repuestox). WhatsApp solo como botón de compartir. | — | [Hecho·sitio] [Hecho·código] |

## 5. Elementos del dominio

### 5.1 Catálogo y categorías
- La estructura de categorías es la fuente única: `catalogo/estructura-categorias-v2.json`. De ahí `scripts/gen-categorias.py` genera `store/routes.json` y los `category-*.jsonc`, y exporta `estructura-categorias-v2.csv`. Esos archivos **no se editan a mano** (constitución #3). [Hecho·código]
- Ojo: el árbol **real del API** del workspace solo tiene `Carros` (con 1 hijo) y `Repuestos mecanicos carro`. Es decir, las ~567 páginas existen como rutas del theme, pero el catálogo de VTEX no tiene ese árbol cargado. Los listados de categoría salen de la categoría `Carros > Llantas y rines > Llantas`. [Hecho·sitio]
- Las rutas se generan con `--real` solo "cuando las categorías ya existan en el catálogo". Mientras tanto, los listados son placeholders. [Hecho·código: README]
- Sinónimos de búsqueda: `gen-sinonimos.py` produce 3 CSV (límite 20 KB c/u) para importar en Intelligent Search; los términos conflictivos van a `sinonimos-conflictos.txt` para decisión del negocio. [Hecho·código]

### 5.2 Selector de vehículo (`react/VehicleSelector.js`)
- Cascada **Marca → Modelo → Año**, alimentada por los *facets* de `vtex.search-graphql` para la categoría de la ruta actual. Las especificaciones que busca se llaman `Marca vehículo`, `Modelo` y `Año`. Al buscar navega a `/<categoría>/<marca>/<modelo>/<año>?map=...`. [Hecho·código]
- Si el catálogo no tiene esas especificaciones, los selects quedan vacíos y el botón deshabilitado. Es lo que se ve hoy: `Marca`, `Modelo` y `Año` deshabilitados y sin opciones. **El selector no funciona de punta a punta porque falta cargar la compatibilidad en el catálogo.** [Hecho·código + Hecho·sitio]
- Compatibilidad por producto = tres especificaciones; no hay VIN, ni tabla de fitment, ni validación de que un repuesto "sirve" para un vehículo. [Hecho·código] La spec 001 menciona VIN como contenido legal deseado, sin implementación. [Hecho·spec]

### 5.3 Selector de llantas (`react/TyreSizeSelector.js`)
- Cascada **Ancho → Perfil → Rin**, mismo patrón y mismas fuentes de facets, solo visible en rutas que contienen `llantas`. [Hecho·código]
- Funciona en el workspace: ofrece Ancho 185/205/235/265/1100, Perfil 55/65/70/75, Rin 15/16/20. Filtros adicionales: Tipo de vehículo (Automóvil, SUV y 4x4, Camión y van, OTR e industrial), Uso (Ciudad, Carretera, Todoterreno A/T, Carga), Marca y precio. [Hecho·sitio]
- Modelo de datos: especificaciones `Tipo de vehículo`, `Ancho`, `Alto (perfil)`, `Rin`, `Uso`, `Medida completa`. La `Medida completa` (`185/65R15`) es la cadena canónica. Los productos Aeolus 1100-20 no tienen `Alto (perfil)` (formato antiguo de camión), lo que el diseño ya prevé. [Hecho·sitio] [Hecho·código: `propuesta-medidas-llanta.md`]
- Decisión de diseño: las 4 hojas de llantas se fusionan en una sola categoría `Llantas` + especificación `Tipo de vehículo`; igual con los 4 sistemas de Eléctrico y electrónico. [Hecho·spec: `como-cargan-los-sellers.md`]

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
| CU-1 | **Navegar por categorías** (Carros → macro → subcategoría → tipo) | Funciona como navegación; los listados dependen de datos de prueba. Sin menú global en el header (spec 003). | [Hecho·sitio] |
| CU-2 | **Buscar llantas por medida** (Ancho/Perfil/Rin + filtros) | **Funciona** con las 5 llantas de prueba. | [Hecho·sitio] |
| CU-3 | **Buscar por vehículo** (Marca/Modelo/Año) | **No funciona**: selects vacíos y deshabilitados (faltan especificaciones de compatibilidad). | [Hecho·sitio + código] |
| CU-4 | **Ver ficha de producto** (precio, referencia, especificaciones, cantidad, envío) | Funciona. Sin reseñas visibles ni seller visible. La imagen es el logo de Repuestox (sin fotos reales). | [Hecho·sitio] |
| CU-5 | **Comprar** (agregar al carrito → checkout) | Llega hasta el carrito y pide correo. **No verificado**: dirección, envío, pago y confirmación. | [Hecho·sitio] |
| CU-6 | **Buscar texto libre** ("¿Qué estás buscando?") | Existe; la ruta de resultados se vio con "OOPS! No encontramos ningún resultado" para términos inexistentes. Sinónimos pendientes de importar. | [Hecho·sitio] [Hecho·código] |
| CU-7 | **Devolver / retracto / garantía** | **No existe**: `/devoluciones-y-garantias` cae en "no encontramos ningún resultado". Solo hay referencia legal en la spec 001 (Ley 1480, art. 47). | [Hecho·sitio] |
| CU-8 | **Publicar producto como seller** | **No existe** en el sitio. `/condiciones-sellers` no existe y no se vio portal de seller. Solo hay una propuesta de carga (§5.4). | [Hecho·sitio + spec] |
| CU-9 | **Contactar a Repuestox** | `/contact-us` muestra "Error al cargar el formulario". | [Hecho·sitio] |
| CU-10 | **Calificar producto o seller** | **No existe**; spec 002 en `draft`. El PDP tiene declarados `product-rating-summary` y `product-questions-and-answers` pero no se renderizaron. | [Hecho·código + sitio] |
| CU-11 | **Aceptar TyC al comprar** | **No existe**; spec 001 en `draft`. | [Hecho·sitio + spec] |

## 7. Estado actual: producción vs. diseño

> No se verificó **producción**. Todo lo marcado "construido" es lo visto en el workspace
> `devwilbis`. Lo único que dice el repo sobre producción es el proceso (`vtex release`,
> `vtex install onewstore.store-theme@<versión>`) y la versión `5.2.0`.

| Área | Estado | Base |
|---|---|---|
| Theme: header, footer, home dividida, landings de carros/motos/herramientas, páginas de categoría, PDP, minicart, filtros | **Construido** (commits `13fe7fa` y `edd35e3`) | [Hecho·código + sitio] |
| Selector de llantas | **Construido y operativo** con datos de prueba | [Hecho·sitio] |
| Selector de vehículo | **Construido, sin datos**: inoperante hoy | [Hecho·sitio] |
| Catálogo real (árbol de 567 páginas, productos, imágenes, compatibilidad) | **Sin cargar**: 8 productos de prueba; imágenes y slides con placeholder ("REEMPLAZAR … 1600x700") | [Hecho·sitio] |
| Marketplace con sellers terceros | **Objetivo**, no operativo. Un solo seller (el propio). Sin condiciones, comisiones ni portal visibles. | [Hecho·sitio] + [Inferido] |
| TyC y 6 páginas legales (D2-D7) | **Diseño** (spec 001 `draft`); las rutas no existen | [Hecho·sitio + spec] |
| Feedback y rating | **Diseño** (spec 002 `draft`) | [Hecho·spec] |
| Menú global de categorías | **Diseño** (spec 003 `draft`); el header solo tiene login y minicart | [Hecho·código + spec] |
| Checkout, pagos, envíos | **Sin personalizar y sin verificar** | [Hecho·sitio] |
| Contacto | Roto en el workspace | [Hecho·sitio] |
| Producción | **No verificada** | — |

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

**Negocio**
- [ ] ¿Qué es "Onewstore" respecto de "Repuestox" (misma empresa, matriz, proveedor)? ¿Razón social y NIT?
- [ ] ¿Qué ciudades o regiones se atienden en la práctica, o es todo Colombia?
- [ ] ¿Quién es el comprador objetivo: particular, taller, flotas?
- [ ] ¿Se venden repuestos usados, remanufacturados o importados? (afecta etiquetado y garantía)

**Actores y marketplace**
- [ ] ¿Repuestox es mero intermediario o vendedor directo? ¿El marketplace con sellers terceros está en el roadmap con fecha?
- [ ] ¿Cómo se pagan comisiones y se liquida a sellers (split de VTEX o manual)? ¿Qué porcentaje?
- [ ] ¿Quién envía: el seller, Repuestox o un operador logístico? ¿Hay transportadoras contratadas?
- [ ] ¿Cuál es la pasarela de pago y qué medios se aceptan?
- [ ] ¿Quién atiende al cliente y por qué canal (WhatsApp, correo, teléfono)?

**Catálogo y vehículo**
- [ ] ¿De dónde saldrá la tabla de compatibilidad (Marca/Modelo/Año)? ¿Se necesita VIN?
- [ ] ¿Se carga el árbol de 567 categorías en VTEX ya, o primero un subconjunto (p. ej. Llantas + Eléctrico)?
- [ ] ¿Las 4 decisiones pendientes de `como-cargan-los-sellers.md` (URLs con filtro, motos/rines, selección única o múltiple)?

**Estado**
- [ ] ¿Existe tienda en producción (dominio propio)? ¿Qué versión de `onewstore.store-theme` está instalada?
- [ ] ¿Qué se hizo con `/contact-us` en producción?

### Seguimiento de preguntas abiertas

Cada pregunta queda con responsable y fecha límite. **Todos están por asignar**: son
decisiones de negocio y no se asignan sin confirmación del equipo.

| ID | Pregunta (resumen) | Bloquea | Responsable | Fecha límite |
|---|---|---|---|---|
| Q1 | Relación Onewstore ↔ Repuestox; razón social y NIT | 001, 005 | Por asignar | Por definir |
| Q2 | ¿Intermediario o vendedor directo? ¿Marketplace con fecha? | 001, 002 | Por asignar | Por definir |
| Q3 | Pasarela de pago, comisiones y liquidación a sellers | 001 (D4) | Por asignar | Por definir |
| Q4 | Quién envía y qué transportadoras hay | 001 (D3, D6) | Por asignar | Por definir |
| Q5 | Canal y responsable de atención al cliente | 004 | Por asignar | Por definir |
| Q6 | Abogado revisor y plazo | 001 (AC-5) | Por asignar | Por definir |
| Q7 | Fuente de la compatibilidad Marca/Modelo/Año y VIN | CU-3 | Por asignar | Por definir |
| Q8 | ¿Árbol completo o subconjunto en VTEX primero? | 003 | Por asignar | Por definir |
| Q9 | ¿Hay producción? ¿Qué versión está instalada? | AC-3 (000) | Por asignar | Por definir |
| Q10 | Comprador objetivo; repuestos usados, remanufacturados o importados | 001, 005 | Por asignar | Por definir |
| Q11 | Moderación previa o posterior, y quién modera | 002 | Por asignar | Por definir |

## 11. Fuera de alcance / futuro
- Reputación ponderada de sellers, disputas e incentivos por reseñar (spec 002, fase 2).
- Venta fuera de Colombia.
- Cualquier cambio de código derivado de los hallazgos (cubierto por las specs 004-006).

## 12. Referencias
- Sitio verificado: `https://devwilbis--onewstore.myvtex.com/` (workspace de desarrollo, 2026-11-12).
- Código: `README.md`, `manifest.json`, `store/`, `react/VehicleSelector.js`, `react/TyreSizeSelector.js`, `react/queries/vehicleFacets.gql`, `catalogo/`, `scripts/gen-categorias.py`, `scripts/gen-sinonimos.py`.
- Specs: `specs/constitution.md`, `001-tyc-marketplace`, `002-feedback-rating`, `003-menu-categorias-global`, `catalogo/como-cargan-los-sellers.md`, `catalogo/propuesta-medidas-llanta.md`.
