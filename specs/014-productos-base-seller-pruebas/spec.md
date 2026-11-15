# 014 — Crear productos base desde el seller de pruebas

- **Estado:** backlog (sin refinar)
- **Responsable:** William
- **Origen:** tarea 12 de la lista de trabajo
- **Rama:** no aplica (es carga de datos en VTEX; si hay scripts, `chore/014-…`)

## 1. Qué se pidió
Crear productos base desde el seller de pruebas.

## 2. Contexto conocido
- Hoy el catálogo del workspace tiene **8 productos de prueba** (5 llantas y 3 de cuidado del auto) con el seller `Repuestox` (id 1) (spec 000 §3).
- Como Repuestox será solo intermediario (Q2), ese seller es dato de prueba; sirve como seller de pruebas para esta carga.
- La carga de datos vive en el admin de VTEX, no en este repo. El diseño de cómo cargan los sellers está en `catalogo/como-cargan-los-sellers.md` (especificaciones obligatorias, compatibilidad `Marca vehículo`/`Modelo`/`Año`, fusión de hojas); el árbol de 567 categorías aún **no** está cargado (Q8).
- Los productos base desbloquean probar el selector de vehículo (hoy sin datos), la 003, la 007 y la 013.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] ¿Cuántos productos base y de qué categorías (subconjunto inicial, Q8)? ¿Cuáles son prioritarios (llantas, rines, eléctrico)?
- [ ] ¿De dónde salen los datos y las imágenes de los productos?
- [ ] ¿Se cargan por el admin, por una plantilla masiva o con un script?
- [ ] ¿Qué se hace con los 8 productos actuales: se conservan, se reemplazan?
- [ ] ¿Los productos base deben cumplir ya las especificaciones obligatorias de `como-cargan-los-sellers.md`?

## 4. Relaciones
- 007 (selector de rines), 013 (PDP), 003 (menú; listados con datos), 010 (medir con datos reales), 016 (portal de sellers a futuro). Preguntas Q7 y Q8 de la spec 000.

> Esta spec se detallará cuando se aborde. Entregable típico: inventario de productos con categoría, especificaciones, compatibilidad e imágenes.
