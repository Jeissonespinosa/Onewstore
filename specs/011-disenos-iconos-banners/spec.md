# 011 — Diseños, iconos y banners

- **Estado:** backlog (sin refinar)
- **Responsable:** William
- **Origen:** tarea 9 de la lista de trabajo
- **Rama:** `feat/011-disenos-iconos-banners` (cuando se aborde)

## 1. Qué se pidió
Diseños, iconos y banners para la tienda.

## 2. Contexto conocido
- El README ya define las medidas de las imágenes (hero 1600×700, banner de categoría 1600×400, tarjetas 800×500, mitad Carros/Motos 1200×1400, franja Herramientas 1920×600, logos de marcas 360×112).
- Hoy hay placeholders con el texto "REEMPLAZAR … 1600x700" en slides, banners y tarjetas (spec 000 §7).
- Los íconos SVG viejos de categoría están en `catalogo/iconos-categorias.json`, por si se quieren reutilizar (el menú de la 003 también los podría usar).
- La spec 006 incluye el logo del checkout y las redes del footer.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] ¿Existe una guía de marca (colores, tipografías, logo en vectores)? Los tokens del theme están en `styles/configs/style.json`.
- [ ] ¿Qué piezas exactas se piden (lista de banners, íconos y pantallas)? ¿Quién las produce y quién las aprueba?
- [ ] ¿Son diseños nuevos de páginas o solo reemplazar los placeholders?
- [ ] ¿Formato y peso máximos de imágenes (impacta la spec 010)?

## 4. Relaciones
- 003 (íconos del menú), 006 (logo del checkout, redes), 008 (íconos de los botones), 010 (peso de imágenes), 013 (ficha de producto).

> Esta spec se detallará cuando se aborde. Entregable típico: inventario de piezas con medida, destino (`image#…`) y estado.
