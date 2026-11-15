# 010 — Mejorar el tiempo de carga

- **Estado:** backlog (sin refinar)
- **Responsable:** Diego
- **Origen:** tarea 8 de la lista de trabajo
- **Rama:** `feat/010-tiempo-de-carga` (cuando se aborde)

## 1. Qué se pidió
Mejorar el tiempo de carga de la tienda.

## 2. Contexto conocido
- La spec 003 tiene como primera tarea medir una **línea base de Lighthouse** (inicio, categoría y ficha de producto): sirve de punto de partida también para esta spec.
- Las specs 002 y 003 piden no degradar rendimiento (LCP/CLS, máximo 5 puntos de bajada).
- Hay 567 páginas de categoría generadas con bloques grandes (el README avisa de que el relink incremental rechaza archivos grandes).
- Hoy casi todas las imágenes son placeholders; las imágenes reales (spec 011) pueden empeorar la carga si no se optimizan.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] ¿Qué páginas y qué métrica se priorizan (LCP, TTFB, peso de página)? ¿Cuál es el objetivo numérico?
- [ ] ¿Se mide en desarrollo (workspace) o ya existe una tienda en producción para medir? (spec 000: aún no hay producción)
- [ ] ¿Cuántos productos y qué tamaño de imágenes habrá realmente?
- [ ] ¿Se incluyen apps de terceros (chat, analítica) como parte del presupuesto?

## 4. Relaciones
- 003 (línea base), 009 (móvil), 011 (imágenes y banners), 013 (ficha de producto), 015 (widget de WhatsApp/chat).

> Esta spec se detallará cuando se aborde. Conviene esperar a tener contenido real (productos e imágenes) para medir con datos representativos.
