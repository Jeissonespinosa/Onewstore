# Tareas — 010 Mejorar el tiempo de carga

- **Spec:** `spec.md` · **Plan:** `plan.md`
- **Rama:** `feat/010-tiempo-de-carga`
- Cada tarea cita los `AC-n` que cubre. Un grupo = un commit (en el grupo 3, **un commit por
  optimización**, para poder revertir cada una).
- Las tareas del grupo 3 son **candidatas**: se confirman o se descartan al aprobar el
  diagnóstico (3.0).

## 1. Línea base propia

- [ ] 1.1 **Diego:** tener `vtex link` activo en un workspace y darme la URL. Anotar el commit
  del theme medido. Verificación: la URL carga el theme.
- [ ] 1.2 **Diego:** medir Lighthouse (mediana de varias corridas, móvil y escritorio) en `/`,
  `/carros/llantas-y-rines/llantas` y `/llanta-aeolus-agc28-1100-20/p` con el método de la 003,
  y pasarme los valores. Verificación: tabla en `medidas.md` con fecha, workspace y commit (AC-1).
- [ ] 1.3 Crear `medidas.md` con la tabla de 1.2 y comparar contra la medición final de la 003.
  Si difiere más de 5 puntos, anotar la diferencia y su causa probable.
  Verificación: la tabla existe y las metas de AC-3 y AC-4 están calculadas en ella.

## 2. Diagnóstico (spike: decide qué se optimiza)

- [ ] 2.1 Con el navegador, registrar por página (móvil emulado) el desglose: peso total, JS, CSS,
  fuentes, imágenes, número de peticiones, LCP y su elemento, CLS y TBT. Incluir cuánto llega
  de las páginas generadas y si hay peticiones a dominios externos (Google Fonts u otros).
  Verificación: tabla por página en `diagnostico.md` con la fuente de cada cifra (RF-2).
- [ ] 2.2 Contrastar cada **candidata** del plan §3 (C1 a C6) con lo medido: confirmada,
  descartada o sin datos. Verificación: columna "evidencia" por candidata en `diagnostico.md`.
- [ ] 2.3 Ordenar las causas por ganancia estimada ÷ esfuerzo y proponer qué aplicar.
  Verificación: lista priorizada en `diagnostico.md` (RF-3).
- [ ] 2.4 **Diego:** aprobar qué candidatas se aplican (incluida C2, que él revirtió en la 003).
  Verificación: aprobación anotada en `diagnostico.md` (AC-2); se reescribe el grupo 3.

## 3. Optimizaciones *(candidatas; se concretan en 2.4)*

Verificación común a cada una: tests de `react/__tests__` en verde; capturas a 360 y 1280 px sin
cambios visuales (AC-6); medida "antes → después" en `medidas.md` (AC-9); si la mejora es menor
de 3 puntos, se revierte el commit.

- [ ] 3.1 **C1 Fuentes:** quitar el `@import` de `vtex.login.css`, cargar solo los pesos usados con
  `font-display: swap` y definir una sola familia. Verificación adicional: AC-5.
- [ ] 3.2 **C2 Árbol de categorías diferido** (solo con aprobación de Diego). Verificación
  adicional: tests de `CategoryMenu` y del drawer; abrir el menú con teclado y con clic funciona
  (RF-8).
- [ ] 3.3 **C3 Datos de vehículos diferidos.** Verificación adicional: test de `VehicleSelector`.
- [ ] 3.4 **C4 Imágenes:** carga diferida bajo el primer pantallazo y dimensiones declaradas,
  donde el bloque lo soporte. Verificación adicional: CLS medido antes y después.
- [ ] 3.5 **C5 Home arriba del pliegue** y **C6 JS de terceros**: solo si el diagnóstico las
  confirma. Verificación adicional: el aspecto visible no cambia sin aprobación.

## 4. Guía de imágenes y presupuesto

- [ ] 4.1 Escribir `guia-imagenes.md`: formatos, ancho máximo por tipo (slide 1600×700, tarjeta de
  producto, miniatura), peso máximo, `alt`, y presupuesto de peso y JS por página
  (RF-7). Verificación: el documento existe y cada cifra cita su fuente (medida propia o referencia).
- [ ] 4.2 Enlazar la guía desde `specs/011-disenos-iconos-banners/spec.md`.
  Verificación: el enlace existe y no está roto (AC-8).

## 5. Medición final y cierre

- [ ] 5.1 **Diego:** medir Lighthouse con el mismo método tras el grupo 3.
  Verificación: AC-3 (móvil ≥ 62 / 68 / 58) y AC-4 (escritorio ≥ 73 / 63 / 70), o excepción por
  escrito de Diego con su causa.
- [ ] 5.2 Revisar que `medidas.md` tenga todas las optimizaciones con antes → después y que las
  revertidas estén marcadas. Verificación: AC-9.
- [ ] 5.3 Correr `react/__tests__`. Verificación: AC-7.
- [ ] 5.4 Actualizar `specs/README.md` y la spec 000 §7, marcar la spec como `done` con el enlace
  al PR. Verificación: `AC-1` a `AC-9` revisados uno por uno en el resumen.
