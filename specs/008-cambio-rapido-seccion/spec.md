# 008 — Cambio rápido entre Carros, Motos y Herramientas

- **Estado:** backlog (sin refinar)
- **Responsable:** William
- **Origen:** tarea 6 de la lista de trabajo
- **Prioridad:** menor que la 003 (menú global). Dentro de esta spec, Carros ↔ Motos es **más prioritario** que el acceso a Herramientas.
- **Rama:** `feat/008-cambio-rapido-seccion` (cuando se aborde)

## 1. Qué se pidió
Un botón que cambie de **Moto a Carro** (y viceversa) rápidamente, sin volver al inicio, y un
botón que lleve a **Herramientas**, también sin volver al inicio. El cambio Carros ↔ Motos tiene
mayor prioridad que el de Herramientas.

## 2. Contexto conocido
- La tienda tiene tres secciones: Carros, Motos y Herramientas (spec 000 §3). Hoy el único camino entre ellas es el inicio.
- Carros y Motos comparten patrón (selector de vehículo, filtros); Herramientas no tiene vehículo.
- La spec 003 (menú global) ya incluirá las tres secciones en el menú de categorías: hay que decidir si este botón es **complementario** (acceso de un solo clic, siempre visible) o si la 003 lo cubre.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] ¿Dónde vive el botón (header, junto al logo, barra secundaria)? ¿Se muestra en móvil?
- [ ] ¿Debe llevar a la misma categoría equivalente de la otra sección, o a su portada (`/carros`, `/motos`)?
- [ ] ¿Cambiar de sección conserva el vehículo elegido (marca/modelo/año)? No tiene sentido entre carros y motos, a confirmar.
- [ ] ¿Se solapa con el menú de la 003? ¿Se implementan juntos?

## 4. Relaciones
- 003 (menú global), 009 (móvil), 011 (iconos/diseño de los botones).

> Esta spec se detallará (requisitos, criterios `AC-n`, plan y tareas) cuando se aborde.
