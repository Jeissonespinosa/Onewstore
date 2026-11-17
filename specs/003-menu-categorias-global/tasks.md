# 003 — Tareas

> Cada tarea indica cómo verificarla. Los `AC-n` de `spec.md` se comprueban en los grupos 3 a 5.

## 1. Línea base y spike de `vtex.menu`

- [x] 1.1 Medir Lighthouse (rendimiento) en inicio, un listado de categoría y una ficha de producto del workspace, y guardar los valores en `specs/003-menu-categorias-global/baseline.md`. Verificación: el archivo existe con 3 puntuaciones y la fecha.
- [x] 1.2 En un workspace propio con `vtex link`, montar a mano un `menu` de prueba (2 secciones, 2 niveles) en el header de escritorio y en un `drawer` móvil, y comprobar: submenús anidados, acordeón vertical, cierre con Esc y clic fuera, foco al cerrar y `aria-expanded`. Verificación: tabla "requisito → nativo / no nativo" en `plan.md` (sección de decisiones) para cada comportamiento.
- [x] 1.3 Si algún requisito obligatorio de la spec no es nativo, decidir con el equipo entre componente React mínimo o ajustar la spec, y registrar la decisión en `plan.md`. Verificación: `plan.md` sin decisiones pendientes sobre el spike.

## 2. Generador de entradas del menú

- [x] 2.1 Ampliar `scripts/gen-categorias.py` para generar `react/category-menu.json` (datos para el componente React, ver plan decisión 3) con secciones → macros → subcategorías (macros sin subcategorías: sus tipos; subcategorías de tipo filtros: sin hijos), con enlace "Ver todo" por nivel. Verificación: `python3 scripts/gen-categorias.py --dry-run` lista el archivo nuevo, no reporta enlaces rotos y no deja salida en `store/blocks/`.
- [x] 2.2 Añadir en `scripts/tests/test_gen_categorias.py` pruebas de: conteo de entradas (3 secciones, 33 macros, 37 subcategorías), macro sin subcategorías, subcategoría de tipo filtros, idempotencia y que el archivo versionado coincida con el JSON. Verificación: `python3 -m unittest scripts/tests/test_gen_categorias.py` en verde.
- [x] 2.3 Ejecutar el generador y versionar `react/category-menu.json`. Verificación: el archivo está en git, es JSON válido y la prueba de sincronía con el árbol pasa (no usa `vtex link`: no es un bloque).
- [x] 2.4 Documentar en `README.md` la nueva salida del generador y el requisito de Python 3. Verificación: el README lista `react/category-menu.json` entre las salidas.

## 3. Menú en escritorio

- [x] 3.1 Añadir en `store/blocks/header/header.jsonc` el disparador "Categorías" en `flex-layout.row#4-desktop`, enlazado al menú generado. Verificación: en el workspace, el acceso aparece en inicio, categoría, ficha de producto y búsqueda (AC-1; el checkout nativo queda fuera, ver spec.md).
- [x] 3.2 Crear los estilos del menú (CSS Module `react/CategoryMenu.css`, ver plan decisión 9) con tokens del theme para el panel, el estado activo y el foco visible; resolver el CSS huérfano `.flexCol--headerNavLinks` (eliminado de `vtex.flex-layout.css`, `vtex.store-header.css` y `vtex.login.css`). Verificación: revisión visual a 1280 px y navegación por teclado con foco visible.
- [x] 3.3 Comprobar el comportamiento en escritorio: abrir, elegir sección → macro → subcategoría, "Ver todo", resaltado de la categoría actual, cierre con Esc y clic fuera, y acceso tras hacer scroll. Verificación: cada escenario de "Mega-menú en escritorio", "Indicación de la categoría actual", "Cierre del menú" y "Acceso global" pasa a mano.

## 4. Menú en móvil

- [x] 4.1 Añadir la variante `drawer` a `react/CategoryMenu.js` (acordeón de 3 niveles en un portal, ver plan decisión 10) con tests en `react/__tests__`, y poner el bloque en `flex-layout.row#1-mobile` de `header.jsonc`. Verificación: los tests de Jest pasan y, a 360 px, el botón abre el drawer.
- [x] 4.2 Estilos del drawer y del acordeón en `react/CategoryMenu.css` (plan decisión 9). Verificación: revisión visual a 360 y 768 px.
- [x] 4.3 Comprobar los tres niveles en móvil, el cierre del drawer y el acceso con el header fijo. Verificación: criterio "Recorrer los tres niveles" pasa a mano en el workspace.

## 5. Accesibilidad, rendimiento y cierre

- [x] 5.1 Probar el recorrido solo con teclado (Tab, Enter, Esc) y con un lector de pantalla, en escritorio y móvil. Verificación: criterios "Recorrido solo con teclado" y "Estado anunciado" pasan; hallazgos corregidos o anotados.
- [x] 5.2 Medir Lighthouse otra vez en las tres páginas y comparar con `baseline.md`; comprobar que abrir y cerrar el menú no mueve el contenido (CLS). Verificación: ninguna página baja más de 5 puntos y no hay desplazamiento al abrir.
- [x] 5.3 Actualizar el índice de `specs/README.md` y marcar la spec 003 como `implementing` o `done` según corresponda. Verificación: el índice refleja el estado y enlaza a la spec 003.

## Cierre

- Marcar la spec 003 como `done` en `specs/README.md` tras la revisión del equipo.

## Resultado del cierre

Verificado por Claude en el workspace `devdiego` (no publicado):
- `AC-1` botón visible en home, listado, ficha y búsqueda (escritorio 1280 px; en móvil, ficha y listado a 360 y 768 px). El checkout nativo queda excluido (decisión del plan).
- `AC-2` desde una ficha, Carros → Llantas y rines → Llantas navega a `/carros/llantas-y-rines/llantas`.
- `AC-3` drawer en móvil con 3 niveles, a 360 y 768 px.
- `AC-4` teclado real: Enter, flechas, Tab atrapado en el drawer y Esc con retorno del foco.
- `AC-5` el generador no reporta enlaces rotos ("enlaces del menú: todos válidos").
- `AC-6` el acceso sigue disponible con scroll (header fijo). Corregido el solapamiento con el buscador de sección.

Del lado del equipo / aceptado:
- `AC-7` Lighthouse en escritorio bajó −8 (inicio) y −10 (ficha): excepción aceptada por Diego, ver `baseline.md`.
- Lector de pantalla: NVDA aprobado por Diego; sin probar en móvil real (VoiceOver/TalkBack).
- Header transparente de la home: el botón negro se confunde con la foto oscura; aceptado por Diego.
- Revisión del equipo antes de fusionar a `release`; sin push ni PR.
- Verificación en producción tras publicar.
