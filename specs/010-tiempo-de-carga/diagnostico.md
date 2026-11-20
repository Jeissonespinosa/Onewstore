# 010 — Diagnóstico de tiempo de carga

- **Fecha:** 2026-11-20 · **Workspace:** `pruebamedidas` (`vtex link`) · **Commit:** `3b8aaeb`
- **Fuente de todas las cifras:** la corrida de **mediana** (por puntaje) de las 5 corridas móviles de Lighthouse 13
  de cada página (ver `medidas.md`): auditorías `network-requests`, `lcp-breakdown-insight`, `render-blocking-insight`,
  `unused-javascript`, `mainthread-work-breakdown`, `bootup-time` y `third-parties-insight`. Los JSON viven en el
  scratchpad de la sesión (no se versionan); se pueden regenerar con el mismo método.
- Las cifras de tiempo son de laboratorio (throttling simulado, móvil) y las de peso son bytes transferidos.
- **Lectura crítica:** todo se midió en un workspace de desarrollo con sesión de admin. Hay peso que **no existiría en
  un theme publicado** (ver §3). No hay producción para contrastar (spec 000, Q9).

## 1. Desglose por página (móvil) — tarea 2.1 / RF-2

| | Inicio | Categoría | Ficha |
|---|---|---|---|
| Puntaje (corrida mediana) | 68 | 73 | 71 |
| FCP / LCP | 2,7 s / 4,4 s | 2,7 s / 2,7 s | 2,7 s / 2,8 s |
| TBT / CLS | 250 ms / 0 | 450 ms / 0,008 | 450 ms / 0,013 |
| Peso total · peticiones | 2 493 KB · 256 | 3 005 KB · 370 | 3 426 KB · 470 |
| JavaScript | 1 987 KB · 188 req | 2 594 KB · 288 req | 3 025 KB · 363 req |
| CSS | 87 KB · 29 req | 87 KB · 33 req | 87 KB · 54 req |
| Fuentes | 69 KB · 2 req | 69 KB · 2 req | 69 KB · 2 req |
| Imágenes | 217 KB · 12 req | 90 KB · 12 req | 82 KB · 15 req |
| Hilo principal (evaluar scripts) | 1 707 ms | 2 468 ms | 2 772 ms |
| **Elemento LCP** | `<img>` hero (Unsplash, 83 KB) | `<h3 class="rx-size__title">` (texto) | `<img>` del producto (vtexassets) |
| Desglose LCP | TTFB 403 · retraso de carga 430 · descarga 94 · **retraso de render 795** ms | TTFB 616 · **retraso de render 1 735** ms | **TTFB 1 915** · retraso de carga 659 · descarga 379 · render 386 ms |
| Imágenes sin `width`/`height` | 4 | 0 | 3 |

**Dominios externos (en todas las páginas):** `fonts.googleapis.com` (1 req) y `fonts.gstatic.com` (2 req, 69 KB);
`www.google.com` y `www.gstatic.com` (reCAPTCHA, 29 KB + 354 KB de JS); `cdn.simpleicons.org` (5-6 req, 5 KB, íconos
del pie); `activity-flow.vtex.com` (16 KB, sin caché); `io.vtex.com.br`; y en la inicio `images.unsplash.com`
(2 req, 112 KB, imágenes del hero).

**Origen del JavaScript (home, por app, transferido):** `vtex.render-runtime` 367 KB · reCAPTCHA 354 KB ·
`react-dom` 245 KB · `vtex.react-vtexid` 106 KB (18 req) · `ramda` 66 KB · `vtex.delivery-promise-components` 63 KB ·
`vtex.styleguide` 50 KB · **`onewstore.store-theme` 50 KB (5 req)** · `vtex.admin-pages` 52 KB.
En categoría se suman `vtex.search-result` 249 KB (31 req) y `vtex.address-form` 62 KB; el theme llega a 75 KB.

**Lo que aportan las páginas generadas (`category-*.jsonc`):** no se pueden separar con estas auditorías; en
categoría el JS del theme es 75 KB frente a 2 594 KB totales, es decir ~3 %. **Sin datos más finos**; no hay indicio de
que el tamaño de los archivos fuente (860 KB, 690 KB) llegue al navegador.

## 2. Candidatas contra la evidencia — tarea 2.2

| Candidata | Veredicto | Evidencia |
|---|---|---|
| **C1 Fuentes** | **Confirmada** (la mayor y la más barata) | El `@import` de Montserrat (6 pesos) en `vtex.login.css` entra en `overrides.css` y `render-blocking-insight` lo marca como **bloqueante, 858 ms estimados**, en las 3 páginas. La URL ya trae `display=swap`, así que lo que cuesta es la **cadena** (CSS → Google → fuente), no el `swap`. Además se descargan **dos familias**: Montserrat 35 KB y Roboto 34 KB (Roboto viene de los tokens de `style.json`, líneas 256-284). Montserrat se usa en bloques `.jsonc` y en CSS de `react/`, por lo que no se puede quitar sin decidir la familia. `font-display-insight`: 30 ms (Roboto). |
| **C2 Árbol de categorías diferido** | **Descartada por poca ganancia** (a confirmar con Diego) | El theme entero pesa 50-75 KB de JS transferido; el JSON del menú (46 KB sin comprimir) es una fracción. Evaluar scripts cuesta 1,7-2,8 s en el hilo principal y la mayor parte es de `render-runtime`, `search-result` y reCAPTCHA. Coherente con la 003: Diego ya la revirtió. |
| **C3 Vehículos diferidos** | **Descartada por poca ganancia** | 22 KB sin comprimir, dentro de los mismos 50-75 KB del theme. |
| **C4 Imágenes** | **Confirmada, parcial** | Inicio: el LCP es el hero de Unsplash sin `fetchpriority` (`priorityHinted: false`), con 430 ms de retraso de carga y 795 ms de render; 4 imágenes sin dimensiones (logo, pie). Ficha: 3 sin dimensiones. Categoría: 0. Los pesos son bajos (hero 83 KB). Las imágenes del hero son **marcadores externos**, no las definitivas (spec 011). `image-delivery-insight` estima 123 KB de ahorro en inicio. |
| **C5 Home arriba del pliegue** | **Sin datos** | Solo se sabe que el retraso de render del hero es 795 ms; no se midió cuánto aporta el carrusel frente al JS. |
| **C6 JS de terceros** | **Confirmada, pero fuera del tema** | reCAPTCHA Enterprise: 354 KB, 52 % sin usar, ~480 ms de arranque, **en todas las páginas**. No se declara en el repo (`manifest.json` y `store/` no lo mencionan): lo carga la plataforma (configuración de la cuenta/login). `activity-flow.vtex.com` 16 KB sin caché es de VTEX. `vtex.telemarketing` no aparece como script del theme en las corridas. |

**Nuevas observaciones (no estaban en el plan):**
- **N1 · LCP de categoría es texto** (`rx-size__title`, el selector de medidas) con **1 735 ms de retraso de render**.
  Hipótesis: el título aparece solo cuando el JS del selector hidrata o por el CSS bloqueante de C1. **Se resuelve
  midiendo de nuevo tras C1** antes de tocar `TyreSizeSelector`.
- **N2 · TTFB de la ficha: 1 915 ms** (servidor del workspace). Es el 70 % del LCP de esa página y queda **fuera de
  alcance** (spec §2, no-objetivos).
- **N3 · Peso propio del workspace:** `react-dom.development.js` (245 KB transferidos, incluida la variante de
  servidor) y 255 KB de JS sin minificar por `unminified-javascript`. En un theme publicado no existirían. La cifra
  de JS (2-3 MB, 188-363 peticiones) **sobreestima** lo que verá un comprador. El límite superior de mejora por
  recortar JS propio es bajo.

## 3. Prioridad: ganancia estimada ÷ esfuerzo — tarea 2.3 / RF-3

Las ganancias son **estimaciones**, no medidas; se confirman con la medición «antes → después» de cada commit.

| # | Qué | Ganancia estimada (móvil) | Esfuerzo | Riesgo | Comentario |
|---|---|---|---|---|---|
| 1 | **C1** Quitar el `@import`, una sola familia, solo los pesos usados | Alta: hasta ~0,86 s de render bloqueado, FCP/LCP en las 3 páginas | Bajo | Cambio visual si se unifica Roboto/Montserrat | Decisión de familia: ¿Montserrat en todo? Se anota en 3.1. |
| 2 | **C4** Hero de inicio: prioridad de carga y dimensiones; `width`/`height` en logo y pie | Media en inicio (LCP 4,4 s) | Bajo | Depende de lo que permita el bloque de VTEX | Imágenes de Unsplash son provisionales: la guía de imágenes de 4.1 aplica aquí. |
| 3 | **N1** LCP de categoría | Por confirmar (hasta ~1,7 s de render) | Medio | Cambia el selector | Solo si persiste tras C1. |
| 4 | **C6** reCAPTCHA | Alta: 354 KB, ~480 ms de arranque en todas las páginas | **Fuera del repo** | Seguridad del login | Es ajuste de plataforma; lo decide y ejecuta Diego (o consulta a VTEX). |
| 5 | C5 | Sin datos | — | Cambia el diseño | No se aplica sin evidencia. |
| — | C2, C3 | < 1 punto probable | Medio | Ya revertida por Diego | Se descartan salvo que Diego pida lo contrario. |

**Propuesta para 2.4:** aplicar **C1 y C4**, medir, y decidir N1 con los datos nuevos. Pedir a Diego que evalúe C6
(fuera del código). Descartar C2 y C3. Con estas dos, el techo realista es **moderado**: con los puntajes ya altos
(68-73) y TBT dominado por código de VTEX, la meta de +10 puede no alcanzarse; si pasa, se documenta como excepción
(AC-3).

## 4. Aprobación — tarea 2.4

*Pendiente de Diego.* Anotar aquí qué candidatas se aplican y la fecha.
