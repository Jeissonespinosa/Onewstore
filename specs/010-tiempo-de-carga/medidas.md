# 010 — Medidas de rendimiento

## Línea base propia (tareas 1.1 a 1.3)

- **Fecha:** 2026-11-20
- **Workspace:** `pruebamedidas` (desarrollo, creado el 2026-11-20 desde `master`; `https://pruebamedidas--onewstore.myvtex.com/`), con `vtex link`
- **Commit del theme medido:** `3b8aaeb` (theme 5.3.0, sin cambios de la 010)
- **Herramienta:** Lighthouse 13 (CLI, `--only-categories=performance`), Chrome headless, throttling simulado por defecto
  (móvil: Moto G Power emulado; escritorio: `--preset=desktop`), con la cookie de sesión del workspace.
- **Método:** mediana de **5 corridas** por página y dispositivo. Las corridas sueltas están en la columna «Corridas».
- **Quién midió:** el agente, con autorización de Diego (2026-11-20). Diego puede contrastar con sus medidas.
- Cada URL se comprobó antes: `/` → `store.home`, categoría → `store.search#subcategory`, ficha → `store.product`.

| Página | Dispositivo | Mediana | Corridas | LCP | CLS | TBT | Peso |
|---|---|---|---|---|---|---|---|
| Inicio `/` | Móvil | **68** | 65, 68, 69, 70, 65 | 4,4 s | 0,000 | 248 ms | 2 493 KB |
| Inicio `/` | Escritorio | **86** | 86, 86, 86, 85, 86 | 1,5 s | 0,000 | 3 ms | 2 521 KB |
| Categoría `/carros/llantas-y-rines/llantas` | Móvil | **73** | 72, 76, 68, 73, 74 | 2,8 s | 0,008 | 444 ms | 3 005 KB |
| Categoría | Escritorio | **88** | 88, 83, 88, 88, 87 | 1,4 s | 0,005 | 53 ms | 3 034 KB |
| Ficha `/llanta-aeolus-agc28-1100-20/p` | Móvil | **71** | 71, 74, 65, 70, 78 | 2,9 s | 0,013 | 392 ms | 3 426 KB |
| Ficha | Escritorio | **90** | 91, 90, 90, 88, 91 | 1,2 s | 0,026 | 24 ms | 3 447 KB |

## Comparación con la medición final de la 003 (tarea 1.3)

| Página | 003 final móvil | 010 móvil | 003 final escritorio | 010 escritorio |
|---|---|---|---|---|
| Inicio | 52 | 68 (+16) | 78 | 86 (+8) |
| Categoría | 58 | 73 (+15) | 68 | 88 (+20) |
| Ficha | 48 | 71 (+23) | 75 | 90 (+15) |

Las diferencias superan los 5 puntos en todas las celdas. **Causas probables (no verificadas):**
1. Otra herramienta y otro equipo: la 003 usó el Lighthouse de Diego en `devdiego`; esta usa el CLI en otra máquina.
2. Otro workspace (`devdiego` ya no existe) y otro estado de la caché del workspace.
3. El theme cambió desde entonces.

**Ruido observado.** Una primera tanda en `pruebatema` (misma herramienta, otro workspace) dio en móvil 60 / 63 / 65
(inicio / categoría / ficha), frente a 68 / 73 / 71 en `pruebamedidas`: hasta **10 puntos** de diferencia entre
tandas, mayor que el umbral de 3 puntos de la spec (§5, D5). Esa tanda no es válida: en `pruebatema` las rutas de
categoría y ficha resolvían `store.home` (ver abajo). Dentro de una misma tanda el rango fue de hasta 10 puntos
(ficha móvil 65-78).

## Consecuencia para las metas (pendiente de decisión de Diego)

Las metas de AC-3 y AC-4 se calcularon sobre la 003 (móvil ≥ 62 / 68 / 58; escritorio ≥ 73 / 63 / 70). Con esta
herramienta **ya se cumplen sin tocar nada** (móvil 68 / 73 / 71 y escritorio 86 / 88 / 90), así que no miden la mejora.

Propuesta, sin aplicar hasta que Diego la apruebe: **+10 puntos móvil sobre esta línea base** y escritorio sin bajar
más de 5.

| Página | Meta móvil (AC-3) | Piso escritorio (AC-4) |
|---|---|---|
| Inicio | ≥ 78 | ≥ 81 |
| Categoría | ≥ 83 | ≥ 83 |
| Ficha | ≥ 81 | ≥ 85 |

Con el ruido de hasta 10 puntos entre tandas, la comparación final debe hacerse **en la misma sesión de medición
que la línea base, o repitiendo la línea base justo antes** de medir tras las optimizaciones.

## Incidencia de rutas en `pruebatema`

En `pruebatema`, las rutas de categoría y de producto devolvían `store.home` (las 597 categorías y los productos
existen en el catálogo; las rutas del tema como `/carros` sí resolvían). Es el mismo síntoma que en `devdiego`.
En `pruebamedidas`, enlazando el mismo theme, resuelven bien. Causa en `pruebatema` sin identificar; se midió
en `pruebamedidas`.

## 3.1 — C1 Fuentes (2026-11-20)

- **Cambio:** se quita el `@import` de Google Fonts de `styles/css/vtex.login.css`, se declara Montserrat con
  `@font-face` (archivo variable, pesos 300-900, `font-display: swap`, subconjuntos latino y latino extendido) y los 12
  tokens de `style.json` pasan de Roboto a Montserrat (decisión de Diego: familia única).
- **Método:** mismo workspace y commit base `b9ff9b6`; el «antes» se midió justo antes del cambio (móvil 5 corridas,
  escritorio 3), el «después» justo tras reconstruir el link. Mediana por celda.

| Página | Móvil antes → después | Escritorio antes → después | LCP móvil | TBT móvil |
|---|---|---|---|---|
| Inicio | 70 → 69 (−1) | 86 → 88 (+2) | 4,4 → 4,2 s | 218 → 357 ms |
| Categoría | 72 → **78 (+6)** | 89 → 90 (+1) | 2,8 → **1,9 s** | 453 → 493 ms |
| Ficha | 74 → 76 (+2) | 91 → 94 (+3) | 2,7 → 2,6 s | 409 → 498 ms |

- **Corridas móviles después:** inicio 68, 75, 69, 71, 68 · categoría 76, 80, 78, 80, 78 · ficha 75, 76, 76, 73, 81.
- **Efecto medido en la causa:** peticiones a `fonts.googleapis.com` 15 → 0 (en las 15 corridas móviles); recursos
  bloqueantes del render ≈ 1 005 ms → ≈ 163 ms por corrida.
- **Lectura:** la mejora clara está en categoría (+6, sobre el umbral de 3 puntos; el LCP baja 0,9 s). Inicio y ficha
  quedan dentro del ruido (±3). El TBT sube unos 40-140 ms: no se atribuye al cambio (el ruido entre tandas es de ese
  orden) pero se vigila. **Se conserva** el commit: sin regresión en escritorio y la causa se eliminó.
- **Roboto:** sigue descargándose (≈ 33 KB) pero lo pide un `iframe` (el de reCAPTCHA de Google), no el tema; el
  diagnóstico lo atribuía a los tokens y se corrige en `diagnostico.md`.
- **AC-6 (regresión visual):** comparadas las capturas finales de Lighthouse antes/después (móvil 412 px y escritorio
  1350 px de la emulación, no 360/1280): 0,4 % a 5,9 % de píxeles distintos. La diferencia visible es la tipografía
  aprobada: en la ficha, el texto que antes salía en Roboto/sans del sistema (migas, «Hasta 1x…», «Referencia»,
  «Cantidad») ahora sale en Montserrat. No se vieron cambios de maquetación. Capturas a 360 y 1280 px con navegador
  quedan por revisar por Diego (el navegador de la sesión no tiene sesión en `pruebamedidas`).
- **Tests de `react/`:** 109 pasan y 7 fallan, todos en `VehicleSelector`; los mismos 7 fallan en `HEAD` limpio
  (comprobado en un worktree temporal), por lo que son anteriores a este cambio.
