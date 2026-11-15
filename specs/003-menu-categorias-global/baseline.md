# 003 — Línea base de Lighthouse

- **Fecha:** 2026-11-15
- **Workspace:** `devdiego` (`https://devdiego--onewstore.myvtex.com/`)
- **Estado del theme:** 5.3.0, sin menú de categorías (antes de cualquier cambio de la spec 003)
- **Medido por:** Diego (valores comunicados en chat; sustituyen a los primeros, 90/85/88, que no tenían dispositivo ni URL)
- **Métrica:** puntuación de rendimiento de Lighthouse (0-100)

| Página | URL | Móvil | Escritorio |
|---|---|---|---|
| Inicio | `/` | 55 | 86 |
| Listado de categoría | `/carros/llantas-y-rines/llantas` | 57 | 70 |
| Ficha de producto | `/llanta-aeolus-agc28-1100-20/p` | 52 | 85 |

## Umbral de AC-7

Ninguna página puede bajar más de 5 puntos respecto de esta tabla, en cada dispositivo:

| Página | Móvil (mínimo) | Escritorio (mínimo) |
|---|---|---|
| Inicio | 50 | 81 |
| Listado de categoría | 52 | 65 |
| Ficha de producto | 47 | 80 |

## Notas

- Cada valor es la **mediana** de varias corridas (confirmado por Diego). Lighthouse varía hasta unos 5 puntos entre corridas; al medir de nuevo en 5.2, usar el mismo método.
- Medido con `vtex link` en el workspace de desarrollo, que carga más lento que un theme publicado. Repetir la medición final en las mismas condiciones.

## Medición final (tarea 5.2) y excepción aceptada de AC-7

Mediana, `vtex link` en `devdiego`, mismo método que la línea base:

| Página | Móvil | Escritorio | Variación frente a la línea base |
|---|---|---|---|
| Inicio | 52 | 78 | −3 / **−8** |
| Listado (`/carros/llantas-y-rines/llantas`) | 58 | 68 | +1 / −2 |
| Ficha (`/llanta-aeolus-agc28-1100-20/p`) | 48 | 75 | −4 / **−10** |

- Cumplen el umbral: móvil en las tres páginas y escritorio en el listado.
- **No cumplen:** escritorio en inicio (78, piso 81) y en ficha (75, piso 80).
- **Decisión de Diego:** aceptar la bajada. Motivo: es un costo de la **primera carga** de cada página (el menú viaja con el bundle del header); la navegación posterior es SPA y reutiliza el header sin descargarlo otra vez.
- Se probó la carga diferida del árbol (`import()` al primer hover, foco o clic; commit `8077f5b`) y se **revirtió** por decisión de Diego (`89cd302`); el JSON de 46 KB vuelve a ir empaquetado con el componente.
- Si más adelante se quiere recuperar esos puntos: carga diferida del árbol, y revisar qué trae `vendors~CategoryMenu` (18 KB).
