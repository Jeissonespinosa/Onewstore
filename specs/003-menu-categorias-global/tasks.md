# 003 — Tareas

> Cada tarea indica cómo verificarla. Los `AC-n` de `spec.md` se comprueban en los grupos 3 a 5.

## 1. Línea base y spike de `vtex.menu`

- [x] 1.1 Medir Lighthouse (rendimiento) en inicio, un listado de categoría y una ficha de producto del workspace, y guardar los valores en `specs/003-menu-categorias-global/baseline.md`. Verificación: el archivo existe con 3 puntuaciones y la fecha.
- [x] 1.2 En un workspace propio con `vtex link`, montar a mano un `menu` de prueba (2 secciones, 2 niveles) en el header de escritorio y en un `drawer` móvil, y comprobar: submenús anidados, acordeón vertical, cierre con Esc y clic fuera, foco al cerrar y `aria-expanded`. Verificación: tabla "requisito → nativo / no nativo" en `plan.md` (sección de decisiones) para cada comportamiento.
- [x] 1.3 Si algún requisito obligatorio de la spec no es nativo, decidir con el equipo entre componente React mínimo o ajustar la spec, y registrar la decisión en `plan.md`. Verificación: `plan.md` sin decisiones pendientes sobre el spike.

## 2. Generador de entradas del menú

- [ ] 2.1 Ampliar `scripts/gen-categorias.py` para generar `store/blocks/header/category-menu.jsonc` con secciones → macros → subcategorías (macros sin subcategorías: sus tipos; subcategorías de tipo filtros: sin hijos), con enlace "Ver todo" por nivel. Verificación: `python3 scripts/gen-categorias.py --dry-run` lista el archivo nuevo y no reporta enlaces rotos.
- [ ] 2.2 Añadir en `scripts/tests/test_gen_categorias.py` pruebas de: conteo de entradas (3 secciones, 33 macros, 37 subcategorías), macro sin subcategorías, subcategoría de tipo filtros, idempotencia y que el archivo versionado coincida con el JSON. Verificación: `python3 -m unittest scripts/tests/test_gen_categorias.py` en verde.
- [ ] 2.3 Ejecutar el generador y versionar `category-menu.jsonc`; confirmar que su tamaño permite el relink incremental. Verificación: el archivo está en git y `vtex link` lo acepta sin reiniciar.
- [ ] 2.4 Documentar en `README.md` la nueva salida del generador y el requisito de Python 3. Verificación: el README lista `category-menu.jsonc` entre las salidas.

## 3. Menú en escritorio

- [ ] 3.1 Añadir en `store/blocks/header/header.jsonc` el disparador "Categorías" en `flex-layout.row#4-desktop`, enlazado al menú generado. Verificación: en el workspace, el acceso aparece en inicio, categoría, ficha de producto, búsqueda y carrito (AC-1).
- [ ] 3.2 Crear `styles/css/vtex.menu.css` con tokens del theme para el panel, el estado activo y el foco visible; resolver el CSS huérfano `.flexCol--headerNavLinks`. Verificación: revisión visual a 1280 px y navegación por teclado con foco visible.
- [ ] 3.3 Comprobar el comportamiento en escritorio: abrir, elegir sección → macro → subcategoría, "Ver todo", resaltado de la categoría actual, cierre con Esc y clic fuera, y acceso tras hacer scroll. Verificación: cada escenario de "Mega-menú en escritorio", "Indicación de la categoría actual", "Cierre del menú" y "Acceso global" pasa a mano.

## 4. Menú en móvil

- [ ] 4.1 Añadir el `drawer-trigger` y el `drawer` con el menú vertical en `flex-layout.row#1-mobile` de `header.jsonc`. Verificación: a 360 px el botón abre el drawer.
- [ ] 4.2 Crear `styles/css/vtex.store-drawer.css` y ajustar `vtex.menu.css` para el acordeón. Verificación: revisión visual a 360 y 768 px.
- [ ] 4.3 Comprobar los tres niveles en móvil, el cierre del drawer y el acceso con el header fijo. Verificación: criterio "Recorrer los tres niveles" pasa a mano en el workspace.

## 5. Accesibilidad, rendimiento y cierre

- [ ] 5.1 Probar el recorrido solo con teclado (Tab, Enter, Esc) y con un lector de pantalla, en escritorio y móvil. Verificación: criterios "Recorrido solo con teclado" y "Estado anunciado" pasan; hallazgos corregidos o anotados.
- [ ] 5.2 Medir Lighthouse otra vez en las tres páginas y comparar con `baseline.md`; comprobar que abrir y cerrar el menú no mueve el contenido (CLS). Verificación: ninguna página baja más de 5 puntos y no hay desplazamiento al abrir.
- [ ] 5.3 Actualizar el índice de `specs/README.md` y marcar la spec 003 como `implementing` o `done` según corresponda. Verificación: el índice refleja el estado y enlaza a la spec 003.

## Cierre

- Marcar la spec 003 como `done` en `specs/README.md` tras la revisión del equipo.
