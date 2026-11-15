# 009 — Optimizar el uso por móvil

- **Estado:** backlog (sin refinar)
- **Responsable:** Diego
- **Origen:** tarea 7 de la lista de trabajo
- **Rama:** `feat/009-optimizacion-movil` (cuando se aborde)

## 1. Qué se pidió
Optimizar el uso de la tienda en móvil.

## 2. Contexto conocido
- El header móvil tiene logo, login y minicart (`store/blocks/header/header.jsonc`).
- Las specs 002 (botón flotante de feedback) y 003 (drawer de categorías) ya exigen comportamiento en 360 px; esta spec debe coordinarse con ellas para no duplicar ni chocar.
- Aún no hay una auditoría de qué falla en móvil: **el alcance depende de ese diagnóstico**.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] ¿Qué problemas concretos se han visto en móvil? (lista de páginas y fallos)
- [ ] ¿Qué dispositivos y anchos son el objetivo (p. ej. 360, 390, 412 px)? ¿Qué porcentaje del tráfico es móvil?
- [ ] ¿Se incluye el checkout (nativo de VTEX, fuera del theme)?
- [ ] ¿Qué métrica define "optimizado" (usabilidad, Lighthouse móvil, tasa de conversión)?

## 4. Relaciones
- 002 y 003 (comportamiento móvil ya especificado), 010 (tiempo de carga en móvil), 008, 013 (ficha de producto), 006 (ajustes de calidad).

> Esta spec se detallará (requisitos, criterios `AC-n`, plan y tareas) cuando se aborde. Primer paso sugerido: una auditoría móvil de las páginas principales.
