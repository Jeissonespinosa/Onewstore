# Plan — 010 Mejorar el tiempo de carga

- **Spec:** `spec.md` · **Tareas:** `tasks.md`
- **Rama:** `feat/010-tiempo-de-carga` (desde `release`)

## 1. Contexto

Lighthouse móvil entre 48 y 58 en el workspace de desarrollo. Ya hay una línea base y una
excepción aceptada en la 003. La meta (+10 móvil) solo se puede planear después de saber **qué
pesa**; por eso el plan es **medir → diagnosticar → aplicar de a una → medir de nuevo**. Las
optimizaciones concretas del grupo 3 son **candidatas**: solo se aplican las que el diagnóstico
confirme y Diego apruebe.

Observado (repo, sin medir): `@import` de Google Fonts con 6 pesos en `vtex.login.css`; tokens
con Roboto; 46 KB de árbol de categorías en el bundle del header; 22 KB de vehículos; imágenes
de portada como SVG incrustados.
Asumido: que las fuentes y el JS del header son los mayores contribuyentes. **Puede ser falso.**

## 2. Decisiones

| # | Decisión | Alternativas | Motivo |
|---|---|---|---|
| D1 | Remedir línea base propia antes de tocar nada | Usar la tabla de la 003 | El theme cambió (002, 003 y otros); la 003 lo declaró y su cifra es la **meta de referencia**, no necesariamente el punto de partida |
| D2 | La meta se calcula sobre la **medición final de la 003** (62/68/58 móvil) | Sobre la línea base inicial de la 003 (55/57/52) | Es el estado real del theme; decisión de Diego: "subir 10 puntos" |
| D3 | Medir con el **mismo método** (mediana, `vtex link`, `devdiego`); yo corro Lighthouse como lectura adicional con las herramientas del navegador, pero **las cifras oficiales son de Diego** | Solo mis corridas | Lighthouse en este entorno puede diferir del equipo de Diego; el skill pide cifras fiables del usuario |
| D4 | Aplicar optimizaciones **una por una**, con medición intermedia, en tareas separadas | Un solo cambio grande | Permite saber qué aporta y revertir lo que no |
| D5 | Una mejora < 3 puntos no cuenta | Contar toda mejora | Lighthouse varía ~5 puntos entre corridas |
| D6 | La guía de imágenes y el presupuesto se escriben **aunque no haya imágenes reales** | Esperar a la 011 | La 011 ya los necesita para no empeorar la carga |
| D7 | No tocar los `category-*.jsonc` ni `routes.json` a mano | Recortar bloques | Constitución #3; si pesan en la carga, es spec nueva sobre el generador |

## 3. Candidatas (a confirmar con el diagnóstico)

| Candidata | Qué se haría | Riesgo | Reversión |
|---|---|---|---|
| C1 Fuentes | Quitar el `@import`; cargar solo los pesos usados con `font-display: swap`; unificar Roboto/Montserrat | Cambio visual de tipografía | Revertir el commit |
| C2 Carga diferida del árbol de categorías | `import()` al primer hover/foco/clic (como `8077f5b`) | Diego ya lo revirtió; primer clic más lento | Revertir el commit |
| C3 Carga diferida de `vehiculos-colombia.json` | Cargar al abrir el selector | Selector vacío un instante | Revertir el commit |
| C4 Imágenes | `loading="lazy"` bajo el primer pantallazo; dimensiones declaradas; la primera con prioridad | Depende de lo que soporte cada bloque de VTEX | Revertir el commit |
| C5 Bloques de la home | Reducir lo que se pinta arriba del pliegue (p. ej. carruseles que cargan todas las diapositivas) | Cambia el diseño | Revertir el commit |
| C6 JS de terceros | Revisar `telemarketing` y otras apps que cargan en visitantes anónimos | Función de agentes | Revertir el commit |

Los costos y ganancias son **hipótesis**: ninguno está medido hasta cumplir el grupo 2.

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| El workspace de desarrollo pone un tope bajo y la meta no se alcanza | Excepción escrita aceptada por Diego (AC-3); opcionalmente medir con el theme publicado (lo hace Diego) |
| La varianza de Lighthouse oculta o inventa mejoras | Mediana de varias corridas; umbral de 3 puntos (D5) |
| Una optimización cambia el aspecto | Capturas a 360 y 1280 px antes y después (AC-6) |
| Retomar C2 contradice una decisión de Diego | Solo con su aprobación explícita (spec §7) |
| Optimizar con datos de prueba no representa el contenido real | Se anota en `medidas.md`; se repite con contenido real cuando exista |
| Cambios del theme que no son míos alteran las medidas | Anotar el commit medido en cada tabla |

## 5. Reversión

Cada optimización va en su propio commit: revertir ese commit. No hay migraciones ni datos.

## 6. Verificación

- Lighthouse (Diego, mediana) y, como apoyo, el panel de red y consola del navegador para el
  desglose de peso (extensión de Chrome o navegador integrado).
- Tests: `react/__tests__` en verde, entorno de jest como en la tarea 0.2 de la spec 007.
- Capturas a 360 y 1280 px para la regresión visual.
- `python scripts/gen-categorias.py --dry-run` solo si algún cambio llegara a tocar categorías
  (no está previsto).

## 7. Preguntas abiertas deferrables

Ver `spec.md` §7: carga diferida del árbol (C2), tope del workspace, volumen de productos e
imágenes y presupuesto para terceros.
