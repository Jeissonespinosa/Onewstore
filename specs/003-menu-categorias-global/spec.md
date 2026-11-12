# 003 — Acceso rápido a menú y categorías desde cualquier página

- **Estado:** draft
- **Responsable:** Diego
- **Rama:** `feat/003-menu-categorias-global`
- **Depende de:** — (usa `catalogo/estructura-categorias-v2.json` como fuente de categorías)

## 1. Contexto y problema
Para cambiar de categoría el usuario debe volver al inicio. Con ~600 páginas de categoría
(carros, motos, herramientas) esto penaliza la navegación. Referentes: **Éxito** y **Mercado Libre**
(menú "Categorías" siempre visible en el header, con subcategorías desplegables).

## 2. Objetivos / No-objetivos
**Objetivos**
- Menú "Categorías" accesible desde el header en **todas** las páginas (home, PLP, PDP, carrito, cuenta).
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
- `AC-1` En home, PLP, PDP y carrito el acceso "Categorías" está visible en el header.
- `AC-2` Desde una PDP, elegir "Frenos" navega a su página de categoría sin pasar por el home.
- `AC-3` En móvil (≤640 px) el menú abre como drawer y permite navegar 3 niveles.
- `AC-4` Solo con teclado se abre, recorre y cierra el menú (Tab/Enter/Esc).
- `AC-5` `python3 scripts/gen-categorias.py --dry-run` no reporta enlaces rotos tras el cambio.
- `AC-6` Al hacer scroll, el acceso al menú sigue disponible.
- `AC-7` Lighthouse: sin regresión de más de 5 puntos de rendimiento frente al baseline.

## 7. Preguntas abiertas
- [ ] ¿Mega-menú (`vtex.menu` con submenús) o menú lateral tipo Mercado Libre? (spike con prototipo)
- [ ] ¿2 o 3 niveles en escritorio? ~600 páginas pueden saturar.
- [ ] ¿Categorías destacadas/promocionales en el menú?
- [ ] ¿Qué hay ya en `store/blocks/header/header.jsonc`? (auditar y reutilizar)

## 8. Referencias
- Benchmarks: exito.com, mercadolibre.com.co.
- VTEX: `vtex.menu`, `vtex.store-drawer`, `vtex.sticky-layout`, `vtex.store-header`.
- Archivos: `store/blocks/header/header.jsonc`, `styles/css/vtex.store-header.css`, `scripts/gen-categorias.py`.
