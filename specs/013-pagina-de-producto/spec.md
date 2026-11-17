# 013 — Mejorar el aspecto de la página de producto

- **Estado:** backlog (sin refinar)
- **Responsable:** William
- **Origen:** tarea 11 de la lista de trabajo
- **Rama:** `feat/013-pagina-de-producto` (cuando se aborde)

## 1. Qué se pidió
Mejorar el aspecto de la página de producto (PDP).

## 2. Contexto conocido
- La PDP funciona (precio, referencia, especificaciones, cantidad, cotizador de envío), pero no muestra quién vende ni quién envía (spec 001, RF-5); las imágenes son el logo de Repuestox (spec 000 §6, CU-4).
- Están declarados `product-rating-summary` y `product-questions-and-answers`, que no se renderizan (spec 006, ítem C).
- Archivos: `store/blocks/pdp/` y `store/blocks/product-summary/`, estilos en `styles/css/`.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] ¿Qué es lo que no gusta hoy (jerarquía, galería, tabla de especificaciones, botones)? ¿Hay un referente (Éxito, Mercado Libre)?
- [ ] ¿Qué información nueva debe aparecer (seller, compatibilidad con el vehículo, garantía)?
- [ ] ¿El rediseño incluye la versión móvil? (spec 009)
- [ ] ¿Se esperan imágenes reales de producto antes de diseñar?

## 4. Relaciones
- 001 (seller visible), 006 (bloques sin efecto), 009 (móvil), 010 (carga), 011 (diseños), 014 (productos base para probar).

> Esta spec se detallará cuando se aborde. Conviene tener productos base (spec 014) para diseñar con contenido real.
