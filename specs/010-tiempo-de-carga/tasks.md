# Tareas — 010 Mejorar el tiempo de carga

- **Spec:** `spec.md` · **Plan:** `plan.md`
- **Rama:** `feat/010-tiempo-de-carga`
- Cada tarea cita los `AC-n` que cubre. Un grupo = un commit (en el grupo 3, **un commit por
  optimización**, para poder revertir cada una).
- Las tareas del grupo 3 son **candidatas**: se confirman o se descartan al aprobar el
  diagnóstico (3.0).

## 1. Línea base propia

- [x] 1.1 **Diego:** tener `vtex link` activo en un workspace y darme la URL. Anotar el commit
  del theme medido. Verificación: la URL carga el theme.
- [x] 1.2 **Diego:** medir Lighthouse (mediana de varias corridas, móvil y escritorio) en `/`,
  `/carros/llantas-y-rines/llantas` y `/llanta-aeolus-agc28-1100-20/p` con el método de la 003,
  y pasarme los valores. Verificación: tabla en `medidas.md` con fecha, workspace y commit (AC-1).
- [x] 1.3 Crear `medidas.md` con la tabla de 1.2 y comparar contra la medición final de la 003.
  Si difiere más de 5 puntos, anotar la diferencia y su causa probable.
  Verificación: la tabla existe y las metas de AC-3 y AC-4 están calculadas en ella.

## 2. Diagnóstico (spike: decide qué se optimiza)

- [x] 2.1 Con el navegador, registrar por página (móvil emulado) el desglose: peso total, JS, CSS,
  fuentes, imágenes, número de peticiones, LCP y su elemento, CLS y TBT. Incluir cuánto llega
  de las páginas generadas y si hay peticiones a dominios externos (Google Fonts u otros).
  Verificación: tabla por página en `diagnostico.md` con la fuente de cada cifra (RF-2).
- [x] 2.2 Contrastar cada **candidata** del plan §3 (C1 a C6) con lo medido: confirmada,
  descartada o sin datos. Verificación: columna "evidencia" por candidata en `diagnostico.md`.
- [x] 2.3 Ordenar las causas por ganancia estimada ÷ esfuerzo y proponer qué aplicar.
  Verificación: lista priorizada en `diagnostico.md` (RF-3).
- [x] 2.4 **Diego:** aprobar qué candidatas se aplican (incluida C2, que él revirtió en la 003).
  Verificación: aprobación anotada en `diagnostico.md` (AC-2); se reescribe el grupo 3.
  *Aprobado el 2026-11-20: C1 y C4; familia única Montserrat; C2 y C3 descartadas.*

## 3. Optimizaciones *(concretadas el 2026-11-20 en 2.4)*

Verificación común a cada una: tests de `react/__tests__` en verde; capturas a 360 y 1280 px sin
cambios visuales salvo lo que la tarea declare (AC-6); medida "antes → después" en `medidas.md`
(AC-9, móvil 5 corridas y escritorio 3, **el "antes" se mide justo antes de cada cambio** por el ruido
entre tandas); si la mejora es menor de 3 puntos, se revierte el commit. Un commit por tarea.

- [x] 3.1 **C1 Fuentes:** quitar el `@import` de `vtex.login.css`; declarar Montserrat con `@font-face`
  (peso variable 300-900, `font-display: swap`, subconjunto latino) y reemplazar Roboto por Montserrat
  en los tokens de `style.json`. Verificación adicional: AC-5 (sin petición a `fonts.googleapis.com`
  ni CSS de fuentes bloqueante) y que Roboto ya no se descargue.
- [x] 3.2 **C4 Imágenes:** prioridad de carga del hero de la inicio y `width`/`height` en las imágenes
  sin dimensiones (logo, pie, ficha), donde el bloque de VTEX lo soporte; anotar lo que no. Verificación
  adicional: CLS y LCP antes y después.
- [x] 3.3 **N1 LCP de categoría:** decidir con la medición posterior a 3.1 si hace falta tocar
  `TyreSizeSelector`. Verificación: anotar en `diagnostico.md` la decisión y sus datos.

## 4. Guía de imágenes y presupuesto

- [x] 4.1 Escribir `guia-imagenes.md`: formatos, ancho máximo por tipo (slide 1600×700, tarjeta de
  producto, miniatura), peso máximo, `alt`, y presupuesto de peso y JS por página
  (RF-7). Verificación: el documento existe y cada cifra cita su fuente (medida propia o referencia).
- [x] 4.2 Enlazar la guía desde `specs/011-disenos-iconos-banners/spec.md`.
  Verificación: el enlace existe y no está roto (AC-8).

## 5. Medición final y cierre

- [x] 5.1 Medir Lighthouse con el mismo método tras el grupo 3 (la hizo el agente con autorización de Diego).
  Verificación: AC-3 (móvil ≥ 78 / 83 / 81) y AC-4 (escritorio ≥ 81 / 83 / 85), o excepción por
  escrito de Diego con su causa. *Medido: AC-4 se cumple; AC-3 no (74 / 74 / 69). Excepción aceptada por
  Diego el 2026-11-20; a revisar (`spec.md` §8.1, R1).*
- [x] 5.2 Revisar que `medidas.md` tenga todas las optimizaciones con antes → después y que las
  revertidas estén marcadas. Verificación: AC-9.
- [x] 5.3 Correr `react/__tests__`. Verificación: AC-7. *Corrido: 109 pasan, 7 fallan en `VehicleSelector`; los 7 fallan igual en `HEAD` limpio (anteriores a la 010). Aceptado por Diego el 2026-11-20 como línea conocida; a revisar (`spec.md` §8.1, R2).*
- [x] 5.4 Actualizar `specs/README.md` y la spec 000 §7, marcar la spec como `done` con el enlace
  al PR. Verificación: `AC-1` a `AC-9` revisados uno por uno en el resumen.
