# 010 — Mejorar el tiempo de carga

- **Estado:** done (2026-11-20), con excepciones aceptadas R1 y R2 a revisar (§8.1)
- **Responsable:** Diego
- **Origen:** tarea 8 de la lista de trabajo
- **Rama:** `feat/010-tiempo-de-carga` (creada desde `release`)
- **PR:** https://github.com/Jeissonespinosa/Onewstore/pull/5 (contra `release`)
- **Depende de:** 000, 003 (línea base). Se coordina con 011 (imágenes) y 009 (móvil); **no se bloquea por ellas**.
- **Última actualización:** 2026-11-20 (spec cerrada; metas recalculadas sobre la línea base propia)

## 1. Contexto y problema

La tienda carga lento en móvil: Lighthouse móvil **52 (inicio), 58 (categoría), 48 (ficha)**
frente a 78, 68 y 75 en escritorio (`003-menu-categorias-global/baseline.md`, medición final,
mediana de varias corridas con `vtex link` en `devdiego`, hoy borrado). Esas cifras están medidas en un
workspace de desarrollo, que carga más lento que un theme publicado, y con datos de prueba.

Observado leyendo el repo (**[Hecho·código]**, sin medir en el navegador todavía):
- La fuente **Montserrat** se importa con `@import url('https://fonts.googleapis.com/…')` de **6 pesos**
  dentro de `styles/css/vtex.login.css`. Un `@import` dentro de CSS bloquea el render y encadena
  una petición a un dominio externo. Además, `styles/configs/style.json` declara **Roboto** como
  familia de los tokens: puede haber dos familias cargándose. *(Hipótesis a medir, no hecho.)*
- `react/category-menu.json` pesa 46 KB y viaja con el bundle del header en **todas** las páginas.
  La spec 003 probó cargarlo de forma diferida (`8077f5b`) y Diego **lo revirtió** (`89cd302`) y
  aceptó la bajada de escritorio (inicio −8, ficha −10). Esta spec puede **retomar** esa decisión
  solo con acuerdo de Diego (ver §7).
- `react/data/vehiculos-colombia.json` pesa 22 KB y lo usa el selector de vehículo.
- Los `slides` de la portada usan imágenes **SVG incrustadas** como marcador (`REEMPLAZAR … 1600x700`);
  no pesan como fotos reales. Las imágenes reales (spec 011) pueden **empeorar** la carga si no se
  optimizan.
- Solo `VehicleSelector` marca `loading="lazy"` en sus imágenes; no se vio configuración de carga
  diferida en los bloques de `store/` (por confirmar en el navegador).
- Las páginas de categoría generadas son grandes (`category-pages-carros.jsonc` ≈ 860 KB,
  `category-grids-carros.jsonc` ≈ 690 KB). Es tamaño de **archivo fuente**; **no** se sabe cuánto
  llega al navegador por página. Es una de las preguntas del diagnóstico.

## 2. Objetivos / No-objetivos

**Objetivos**
- Diagnosticar qué pesa y qué bloquea en inicio, categoría y ficha (móvil primero).
- Subir **10 puntos de Lighthouse móvil** en cada una de esas tres páginas respecto de la medición
  final de la 003 (meta de Diego, 2026-11-19): inicio ≥ 62, categoría ≥ 68, ficha ≥ 58.
- No degradar escritorio más de 5 puntos respecto de esa misma medición.
- Dejar una **guía de imágenes** para la 011 (formato, tamaño, carga diferida) y un
  **presupuesto de rendimiento** para las specs futuras.

**No-objetivos**
- No se mide ni se optimiza producción: no existe (spec 000, Q9). Todo se mide en el workspace.
- No se optimiza el checkout de VTEX ni el servidor de VTEX (TTFB propio de la plataforma).
- No se cambian imágenes ni banners reales (spec 011); solo se define cómo deben prepararse.
- No se agregan apps de terceros; si la 015 las agrega, deberán caber en el presupuesto.
- No se garantiza llegar a 62/68/58 si el tope lo pone el workspace de desarrollo (ver §7 y riesgos).

## 3. Usuarios y escenarios

- Como **comprador en móvil con datos limitados**, quiero que la página sea usable en pocos
  segundos, para no abandonar antes de ver el producto.
- Como **responsable del sitio**, quiero saber qué cuesta tiempo de carga y qué se arregló, con
  números antes y después.

## 4. Requisitos funcionales

- `RF-1` Se mide una **línea base propia** de la 010 en inicio, categoría y ficha, móvil y
  escritorio, con el método de la 003 (mediana de varias corridas, `vtex link`, mismo workspace),
  y se guarda en `specs/010-tiempo-de-carga/medidas.md`.
- `RF-2` Se registra por página el **desglose** que sirva para decidir: peso total transferido,
  JavaScript, CSS, fuentes, imágenes, número de peticiones, LCP (y su elemento), CLS y TBT.
- `RF-3` Se produce `diagnostico.md` con las causas medidas, ordenadas por **ganancia estimada ÷
  esfuerzo**, cada una con su evidencia (captura de red o de Lighthouse).
- `RF-4` Se aplican las optimizaciones aprobadas por Diego, en orden, midiendo tras cada una para
  descartar las que no aportan (se revierte lo que no mejora).
- `RF-5` Las fuentes se cargan sin bloquear el render: sin `@import` de CSS dentro de overrides y
  con `font-display: swap`; solo los pesos que se usan. *(Se aplica solo si el diagnóstico lo
  confirma.)*
- `RF-6` Las imágenes bajo el primer pantallazo cargan de forma diferida y las de la primera
  pantalla (LCP) no. Los bloques declaran `width`/`height` o proporción para evitar saltos (CLS).
  *(Se aplica solo donde el bloque de VTEX lo soporte; si no, se anota.)*
- `RF-7` Se entrega `guia-imagenes.md` (formato WebP/AVIF, ancho máximo por tipo de imagen,
  peso máximo, `alt`) y un **presupuesto de rendimiento** (peso y JS por página).
- `RF-8` Cualquier cambio que afecte el menú de categorías o el selector (carga diferida de sus
  datos) conserva su comportamiento y sus tests (`react/__tests__`).

## 5. Requisitos no funcionales

- **Funcional:** ninguna optimización cambia el aspecto ni el comportamiento visible (comparación
  de capturas a 360 y 1280 px).
- **Accesibilidad:** el menú, los selectores y el botón de feedback siguen operables por teclado.
- **Medición:** cada cifra lleva fecha, workspace, dispositivo emulado y mediana; Lighthouse varía
  hasta ~5 puntos entre corridas, por lo que una mejora menor de 3 puntos no se considera real.
- **Datos personales:** no se agrega analítica ni cookies nuevas.

## 6. Criterios de aceptación

- `AC-1` `medidas.md` contiene la línea base propia con el método descrito y la fecha, para las 3
  páginas, en móvil y escritorio.
- `AC-2` `diagnostico.md` lista las causas con evidencia y prioridad; Diego aprobó cuáles se
  aplican.
- `AC-3` Lighthouse móvil, mediana de varias corridas con el mismo método, al terminar:
  **inicio ≥ 78, categoría ≥ 83, ficha ≥ 81** (la línea base propia de `medidas.md` + 10; Diego cambió la referencia
  el 2026-11-20 porque la herramienta y el workspace de la 003 ya no son comparables), **o** hay una excepción
  aceptada por Diego, por escrito, con la causa (p. ej. tope del workspace).
- `AC-4` Lighthouse de escritorio no baja más de 5 puntos frente a la línea base propia
  (inicio ≥ 81, categoría ≥ 83, ficha ≥ 85).
- `AC-5` Si se tocan las fuentes: a 360 px, una petición de red a `fonts.googleapis.com` no bloquea
  el render (sin `@import` en CSS) y el texto se ve con `font-display: swap`.
- `AC-6` No hay regresión visual: capturas de inicio, categoría y ficha a 360 y 1280 px iguales
  antes y después, salvo lo que cada tarea declare.
- `AC-7` Los tests de `react/__tests__` pasan, y si se modifica `CategoryMenu` o un selector,
  sus tests cubren el comportamiento tras el cambio.
- `AC-8` Existe `guia-imagenes.md` con el presupuesto de rendimiento y la spec 011 lo referencia.
- `AC-9` Cada optimización aplicada tiene su medida "antes → después" en `medidas.md`; las que
  no mejoraron están revertidas.

## 7. Preguntas abiertas

Respondidas el 2026-11-19:
- [x] Meta numérica → **+10 puntos móvil** en inicio, categoría y ficha. *Referencia cambiada el 2026-11-20: de la medición final de la 003 (62/68/58) a la línea base propia de `medidas.md` (78/83/81).*
- [x] Dónde se mide → workspace `pruebamedidas` con `vtex link` (no hay producción; creado el 2026-11-20 porque `pruebatema` resuelve mal las rutas de catálogo). `devdiego` se
  borró el 2026-11-16; la medición final de la 003 se hizo allí, por lo que la comparación lleva esa salvedad.

Siguen abiertas y **no bloquean** el diagnóstico:
- [ ] **Carga diferida del árbol de categorías (46 KB):** Diego la revirtió en la 003. ¿Se vuelve a
  probar si el diagnóstico la señala como una de las mayores ganancias? *Se asume: solo con su aprobación
  explícita, y sin cambiar el comportamiento del menú (RF-8).*
- [ ] **Tope del workspace:** `vtex link` carga más lento que un theme publicado. ¿Se acepta medir
  también con el theme publicado en un workspace (`vtex publish` en un workspace de desarrollo
  no es producción)? **Queda fuera de lo que puede hacer el agente**: lo decide y ejecuta Diego.
- [ ] ¿Cuántos productos e imágenes habrá y de qué tamaño? Sin dato, el presupuesto de imágenes
  (RF-7) usa valores de referencia y se ajusta con la spec 011.
- [ ] ¿Qué presupuesto se da a apps de terceros (chat, analítica, WhatsApp de la 015)?

## 8. Fuera de alcance / futuro

- Medición en producción y datos de usuarios reales (Core Web Vitals de campo) cuando exista.
- CDN, caché o TTFB del servidor de VTEX.
- Optimización de las imágenes reales (la hace quien cargue el contenido, con la guía).
- Reducir el tamaño de los `category-*.jsonc` si el diagnóstico demuestra que importa en la carga
  (sería spec nueva, porque toca el generador y la constitución #3).

## 8.1 Aceptaciones que se deben revisar en el futuro

Diego aceptó estas dos excepciones el 2026-11-20. No son definitivas: quedan **abiertas para revisión**.

| # | Qué se aceptó | Por qué | Cuándo revisarla |
|---|---|---|---|
| R1 | **AC-3 no cumplido:** móvil final 74 / 74 / 69 frente a la meta 78 / 83 / 81 (excepción redactada en `medidas.md`) | La carga la dominan el JS de VTEX y reCAPTCHA y el TTFB del workspace, fuera del código propio | (a) cuando se decida sobre reCAPTCHA (cuenta o VTEX); (b) cuando la spec 011 reemplace el logo de 2551 px y las imágenes reales; (c) cuando exista un theme publicado o producción para medir; (d) antes de cualquier lanzamiento |
| R2 | **AC-7 con 7 tests en rojo** en `react/__tests__/VehicleSelector.test.js` (109 pasan, 7 fallan) | Fallan igual en `HEAD` limpio, antes de la 010 (comprobado en un worktree). Son los casos marcados `ROJO HOY` y otros de cascada/navegación de la spec 007 | Antes de la siguiente spec que modifique `VehicleSelector`, o al cerrar la 007 |

AC-6 se revisó en el navegador el 2026-11-20 (360 y 1280 px; ver `medidas.md`). Quedan pendientes de Diego, sin
bloquear lo aceptado: evaluar reCAPTCHA (C6) y decidir cuándo abrir el PR.

## 9. Referencias

- `specs/003-menu-categorias-global/baseline.md` (línea base y medición final, excepción aceptada de AC-7).
- `styles/css/vtex.login.css` (importación de fuentes), `styles/configs/style.json` (tokens de fuente).
- `react/CategoryMenu.js`, `react/category-menu.json`, `react/data/vehiculos-colombia.json`.
- Relacionadas: 009, 011, 013, 015.
