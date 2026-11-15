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

- Se desconoce si cada valor es una sola corrida o la mediana de varias. Lighthouse varía hasta unos 5 puntos entre corridas, que es justo el margen de AC-7; al medir de nuevo en 5.2, repetir tres veces y usar la mediana.
- Medido con `vtex link` en el workspace de desarrollo, que carga más lento que un theme publicado. Repetir la medición final en las mismas condiciones.
