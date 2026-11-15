# 003 — Acceso rápido a menú y categorías desde cualquier página

- **Estado:** done
- **Responsable:** Diego
- **Rama:** `feat/003-menu-categorias-global`
- **Depende de:** 000 (contexto) — (usa `catalogo/estructura-categorias-v2.json` como fuente de categorías)

## 1. Contexto y problema
Para cambiar de categoría el usuario debe volver al inicio. Con 567 páginas de categoría
(33 macros, 37 subcategorías y 497 tipos; ver spec 000 §3) esto penaliza la navegación.
Hallazgos de la spec 000: el header solo tiene login y minicart (no hay menú que reutilizar)
y el catálogo real de VTEX casi no tiene el árbol cargado (las rutas existen en el theme,
pero los listados son placeholders). Referentes: **Éxito** y **Mercado Libre**
(menú "Categorías" siempre visible en el header, con subcategorías desplegables).

## 2. Objetivos / No-objetivos
**Objetivos**
- Menú "Categorías" accesible desde el header en **todas** las páginas del theme (home, PLP, PDP, búsqueda, cuenta). El checkout nativo de VTEX (`/checkout`, incluido el carrito) no usa el header del theme y queda fuera; se aborda con la personalización del checkout (spec 006, hallazgo A).
- Navegación en 2-3 niveles (macro → subcategoría → tipo) sin pasar por el home.
- Funciona en móvil (drawer) y escritorio (mega-menú).

**No-objetivos**
- No se rediseña el home ni las páginas de categoría.
- No se edita a mano ninguna página generada (constitución #3).

## 3. Escenarios
- En una PDP: *quiero ir a "Frenos" sin volver al inicio.*
- En móvil: *abro un menú lateral y navego por niveles.*
- Con teclado/lector de pantalla: *puedo abrir y recorrer el menú.*

## 4. Requisitos funcionales
- `RF-1` Acceso "Categorías" fijo en el header en toda ruta de la tienda (también con header sticky al hacer scroll).
- `RF-2` Escritorio: mega-menú con las macros (Carros, Motos, Herramientas) y sus subcategorías; enlace "Ver todo" por nivel.
- `RF-3` Móvil: drawer (`vtex.store-drawer`) con acordeón por niveles.
- `RF-4` Las entradas se derivan de `estructura-categorias-v2.json` (ampliando `gen-categorias.py`) para no duplicar la fuente de verdad.
- `RF-5` Se resalta la categoría actual.
- `RF-6` Cada macro reutiliza su ícono SVG de `catalogo/`.
- `RF-7` Se cierra con Esc, clic fuera o botón cerrar.

## 5. Requisitos no funcionales
- Accesibilidad: roles ARIA (`navigation`, `aria-expanded`), foco visible, teclado completo.
- Rendimiento: sin bloquear LCP; sin CLS al abrir.
- Responsive: probado a 360, 768 y 1280 px.
- Sin enlaces internos rotos (lo valida el script).

## 6. Criterios de aceptación
- `AC-1` En home, PLP, PDP y búsqueda el acceso "Categorías" está visible en el header.
- `AC-2` Desde una PDP, elegir una categoría (p. ej. "Llantas") navega a su página sin pasar por el home. Mientras el catálogo no tenga el árbol cargado, basta con que la página de categoría cargue (aunque el listado sea placeholder).
- `AC-3` En móvil (≤640 px) el menú abre como drawer y permite navegar 3 niveles.
- `AC-4` Solo con teclado se abre, recorre y cierra el menú (Tab/Enter/Esc).
- `AC-5` `python3 scripts/gen-categorias.py --dry-run` no reporta enlaces rotos tras el cambio.
- `AC-6` Al hacer scroll, el acceso al menú sigue disponible.
- `AC-7` Lighthouse: sin regresión de más de 5 puntos de rendimiento frente al baseline.

## 7. Preguntas abiertas
- [ ] ¿Mega-menú (`vtex.menu` con submenús) o menú lateral tipo Mercado Libre? (spike con prototipo)
- [ ] ¿2 o 3 niveles en escritorio? 567 páginas pueden saturar; proponer mostrar macros + subcategorías (33 + 37) y dejar los 497 tipos a las páginas de categoría.
- [ ] ¿Categorías destacadas/promocionales en el menú?
- [x] ¿Qué hay ya en el header? Resuelto (spec 000): solo login y minicart; el menú se construye desde cero.
- [ ] ¿Se carga el árbol completo en VTEX antes del menú, o primero un subconjunto? (spec 000 §10)

## 8. Referencias
- Benchmarks: exito.com, mercadolibre.com.co.
- VTEX: `vtex.menu`, `vtex.store-drawer`, `vtex.sticky-layout`, `vtex.store-header`.
- Archivos: `store/blocks/header/header.jsonc`, `styles/css/vtex.store-header.css`, `scripts/gen-categorias.py`.
