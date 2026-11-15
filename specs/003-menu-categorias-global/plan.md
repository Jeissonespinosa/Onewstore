# 003 — Plan técnico

> Derivado de `spec.md`. Decisiones asumidas (marcadas abajo) quedan abiertas a revisión del equipo.

## Context

- El header (`store/blocks/header/header.jsonc`) tiene `header-layout.desktop` y `header-layout.mobile`, ambos con `sticky-layout`. No hay menú; solo logo, login y minicart. Hay CSS huérfano `.flexCol--headerNavLinks` de un menú anterior.
- `vtex.menu 2.x`, `vtex.store-drawer 0.x` y `vtex.sticky-layout 0.x` ya están en `manifest.json`, pero no se usan en `store/`.
- Árbol fuente (`catalogo/estructura-categorias-v2.json`): 3 secciones, 33 macros, 37 subcategorías, 497 tipos. 25 macros no tienen subcategorías (sus tipos cuelgan directo) y 5 subcategorías son de tipo "filtros": tienen página, pero sus valores no.
- `scripts/gen-categorias.py` ya recorre el árbol (`build_tree`), valida enlaces (`check_links`) y escribe de forma atómica. Escribe en `store/blocks/home/`. Tiene suite en `scripts/tests/test_gen_categorias.py`, incluida una prueba de que la salida versionada está al día con el JSON.
- Python no está instalado en la máquina donde se redactó este plan, así que el generador y sus tests no se pudieron ejecutar ahí. Hace falta Python 3 para implementar.
- Las páginas de categoría existen como rutas del theme aunque el catálogo de VTEX no tenga el árbol cargado (spec 000 §5.1).

## Goals / Non-Goals

**Goals:**
- Un único generador y una única fuente de verdad para páginas y menú.
- Menú con el mismo árbol en escritorio y móvil, con el menor número de bloques posible.

**Non-Goals:**
- Mostrar los 497 tipos en el menú: se llega a ellos desde la página de la subcategoría.
- Resaltar o destacar categorías promocionales (queda para una spec futura).
- Tocar el checkout o las páginas de categoría generadas.

## Decisions

1. **Mega-menú de `vtex.menu` en escritorio, drawer de `vtex.store-drawer` con `vtex.menu` vertical en móvil.** Son apps ya instaladas, evitan código React propio (constitución #1) y comparten la definición de entradas. *Alternativa:* menú lateral permanente tipo Mercado Libre; se descarta porque ocupa espacio en cada página y no encaja con el header actual. *Alternativa:* componente React propio; se descarta mientras `vtex.menu` cubra la necesidad (ver decisión 6).

2. **Tres niveles en el menú: sección → macro → subcategoría.** Con 567 páginas, mostrar solo hasta subcategoría (33 + 37 entradas más las 3 secciones) mantiene el panel manejable; los tipos viven en la página de la subcategoría. Para macros sin subcategorías, el segundo nivel son sus tipos. La spec 003 dejaba esto como pregunta abierta; se asume "3 niveles" y se anota para revisión.

3. **Ampliar `gen-categorias.py` para escribir `store/blocks/header/category-menu.jsonc`.** Es un archivo generado nuevo, no editado a mano, que define los bloques `menu#...` y `menu-item#...` a partir de `build_tree()`. Se reutiliza `check_links` para validar que cada `href` existe en `routes`. *Alternativa:* un script aparte; se descarta para no duplicar el recorrido ni la validación. Se escribe en `header/` y no en `home/` porque no es contenido de página; el script ya acepta añadir salidas.

4. **Bloques de layout a mano, entradas generadas.** `header.jsonc` (a mano) solo referencia un bloque raíz del menú y el `drawer`; los `menu-item` hijos viven en el archivo generado. Así un cambio de categorías nunca obliga a editar el header.

5. **Estado activo con la funcionalidad nativa de `vtex.menu` si existe; si no, con CSS sobre el `href` activo.** Se resuelve en el spike (tarea 1).

6. **Spike antes de implementar.** Comprobar en un workspace con `vtex link`: submenús anidados en `vtex.menu`, orientación vertical con acordeón en el drawer, cierre con Esc, `aria-expanded` y foco al cerrar. Si algún comportamiento obligatorio de la spec no existe de forma nativa, se evalúa un componente React mínimo (con test en `react/__tests__`) antes de cambiar la spec. *Resultado esperado:* `vtex.menu` cubre todo salvo, quizá, el foco de retorno y el Esc.

7. **Acceso en el header.** Escritorio: nuevo `flex-layout.col` con el disparador entre el logo y el espaciador de `flex-layout.row#4-desktop`. Móvil: `drawer-trigger` antes del logo en `flex-layout.row#1-mobile`.

8. **Rendimiento.** Activar la renderización optimizada de submenús que ofrezca `vtex.menu` y reservar el alto del disparador en CSS para evitar CLS. Estilos en `styles/css/vtex.menu.css` y `styles/css/vtex.store-drawer.css`, con tokens de `styles/configs/style.json` (constitución #4).

### Resultados del spike (tarea 1.2)

Probado el 2026-11-15 en el workspace `devdiego` (`vtex.menu` 2.x, `vtex.store-drawer` 0.x) con un menú de prueba de 2 secciones y 2 niveles. Escritorio a 1536 px; móvil en un iframe de 360 px (la herramienta del navegador no cambia el ancho de la ventana). No se probó con lector de pantalla.

| Requisito | Resultado | Observación |
|---|---|---|
| Submenús anidados (escritorio) | **Nativo** | Se renderizan; el ítem alterna `isOpen` / `isClosed`. |
| Ocultar el submenú cerrado | **No nativo** | Sin CSS propio queda siempre visible; se resuelve con estilos (tarea 3.2). |
| Apertura | **Solo hover** | Con foco de teclado en el ítem el submenú sigue `isClosed`. |
| Cierre con Esc (escritorio) | **No nativo** | Esc no cambia el estado ni mueve el foco. |
| `aria-expanded` en los ítems | **No nativo** | Los ítems son `li` sin atributos; el `nav` no tiene `aria-label`. |
| Drawer móvil: abrir, overlay, botón de cierre | **Nativo** | Abre desde el `drawer-trigger`. |
| Acordeón vertical en el drawer | **Parcial** | Aparece el "+" (prop `accordion`), pero los hijos se ven desplegados desde el inicio; hay que confirmarlo y ajustarlo con CSS. |
| Cierre del drawer con Esc | **No nativo** | El drawer sigue `opened` y el foco queda en `BODY`. |
| Foco al cerrar | **No nativo** | Tras Esc el foco no vuelve al disparador. |

**Conclusión provisional:** `vtex.menu` y `vtex.store-drawer` cubren la estructura y el drawer, pero no teclado (Esc, foco), `aria-expanded` ni foco de retorno (RF-7, AC-4 y la sección 5 de la spec). 

**Decisión (tarea 1.3, aprobada por Diego el 2026-11-15):** se construye un **componente React mínimo** con test en `react/__tests__`, en lugar de ajustar la spec. Debe cubrir Esc, apertura y recorrido con teclado, `aria-expanded`, `aria-label` en el `nav` y foco de retorno al disparador, tanto en escritorio como en el drawer. Sigue usando `vtex.menu` / `vtex.store-drawer` para la estructura y los estilos donde sea posible; el alcance exacto (envolver los bloques nativos o renderizar el árbol propio) se define al implementar los grupos 3 y 4 y se anota aquí. La spec no cambia: RF-7, AC-4 y la sección 5 se mantienen.

## Risks / Trade-offs

- **`vtex.menu` no cubre un requisito (Esc, foco, ARIA, acordeón)** → el spike lo detecta antes de escribir el generador; plan B: componente React mínimo.
- **Archivo generado demasiado grande para el relink incremental** → estimar tamaño en el spike; el README ya documenta reiniciar `vtex link` para archivos grandes. Solo se generan ~73 entradas, lejos del tamaño de las páginas de categoría.
- **Enlaces a páginas con listado vacío** (catálogo sin cargar) → aceptado; la página existe y carga. Se resuelve cuando se cargue el catálogo (spec 000, Q8).
- **Regresión de LCP/CLS** → medir la línea base de Lighthouse **antes** de tocar el header y comparar al final.
- **Python no disponible en algún equipo** → bloquea regenerar; documentar el requisito en el README.
- **Árbol cambia y el menú queda desfasado** → la prueba existente de "salida versionada al día" se amplía para cubrir el archivo del menú.

## Migration Plan

1. Medir la línea base de Lighthouse en el workspace.
2. Implementar en una rama propia y un workspace propio (`vtex use <nombre>` + `vtex link`).
3. Regenerar con `python3 scripts/gen-categorias.py` y hacer commit del archivo generado.
4. Publicar con el flujo habitual de release del theme.
5. **Reversión:** quitar el bloque del disparador de `header.jsonc` y restaurar la versión anterior; el archivo generado puede quedar sin efecto.

## Open Questions

- ¿Se destacan categorías promocionales en el menú? Se pospone; no cambia ni la spec ni las tareas.
- ¿Se mantiene o se elimina el CSS huérfano `.flexCol--headerNavLinks`? Se decide al implementar los estilos nuevos.
