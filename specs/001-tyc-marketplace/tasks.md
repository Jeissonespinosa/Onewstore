# 001 — Tareas

> **Retomada el 2026-11-17** (estuvo en pausa desde el 2026-11-15). Los prerrequisitos y
> bloqueos de negocio están en `pendientes.md`. Workspace de trabajo: `pruebatema`.

> Cada tarea indica cómo verificarla. Los grupos van en orden de dependencias. Los grupos 4-6
> producen **borradores con placeholders**: nada se publica en producción hasta la tarea 8.2.
> Lo que requiere sesión autenticada, `vtex link` o un abogado lo hace el equipo (se indica).

## 1. Spike de plataforma (antes de construir)

Necesita un workspace con `vtex link` (lo inicia Diego) y, para 1.1, acceso al admin.

- [ ] 1.1 Checkout: comprobar si el admin ofrece un campo nativo de TyC y si el builder `checkout-ui-custom` permite añadir un checkbox que bloquee el botón de pago y escribir `customData` en el `orderForm`. Verificación: tabla "capacidad → nativo / con `checkout-ui-custom` / no posible" en `plan.md`, con la decisión 7 confirmada o cambiada. *(Con el navegador solo se puede llegar hasta antes de pagar y sin datos reales; el admin lo mira el equipo.)*
- [x] 1.2 Páginas legales: crear en el workspace una `store.custom#legal-prueba` con un `rich-text` de ~2.000 palabras (títulos `##`/`###`, listas, enlaces y anclas) y editarla desde el Site Editor. Verificación: tabla en `plan.md` que responda: ¿se edita sin redeploy (RF-6)? ¿qué Markdown renderiza? ¿es legible en 360 px?; se retira la página de prueba.
- [x] 1.3 Seller visible: buscar un bloque nativo que muestre el seller en PDP y en el resumen del carrito. Verificación: `plan.md` anota el bloque encontrado o la decisión de componente propio (decisión 10).
- [x] 1.4 Resolver las preguntas abiertas A, B (adelantar al abogado), C y D de `plan.md`. Verificación: cada una con respuesta y fecha en `plan.md`; si C se aprueba, `spec.md` se ajusta (`RF-1`, `AC-1`) en este mismo grupo.

## 2. D1 — Informe de investigación (UE → Colombia)

No depende de Q1-Q5. Las fuentes se consultan en la web y cada cita se verifica contra el texto vigente.

- [x] 2.1 Redactar `specs/001-tyc-marketplace/research.md` con la matriz de §4 de la spec, filas 1-6 (transparencia, ranking, desistimiento/retracto, reversión del pago, garantía, seguridad de productos). Verificación: cada fila tiene cita exacta del artículo, requisito, cómo se cumple en Repuestox, URL de la fuente y fecha de consulta; las no verificadas dicen "SIN VERIFICAR".
- [x] 2.2 Filas 7-11 (datos personales, reseñas, comercio electrónico, resolución de conflictos, responsabilidad del intermediario y los sellers). Verificación: mismo criterio que 2.1; la fila de intermediario recoge el punto de la spec §9 (obligaciones de Repuestox como intermediario) sin darlo por resuelto.
- [x] 2.3 Cerrar el informe con: cobertura del contenido mínimo de §5 de la spec (compatibilidad, solo nuevos, piezas de seguridad, garantía e instalación, retracto, importación y origen, comprador empresarial, accesorios y herramientas); limitaciones técnicas (decisión 7 y el bloqueo solo en el navegador); y una lista numerada de **preguntas para el abogado**. Verificación: los 8 puntos de §5 aparecen y la lista incluye las preguntas A-E del plan y las abiertas de la spec §9.

## 3. Comprobación automática (AC-7 y RF-4)

Va antes que los documentos para usarla desde el primero.

- [x] 3.1 Crear `scripts/check-legal.py` (decisión 5): placeholders (lista de la decisión 6) con conteo, "Onewstore", falta de línea de versión y desajuste ruta ↔ bloque; `--prod` sale con 1 si hay hallazgos. Verificación: `python scripts/check-legal.py` corre en el repo sin documentos y sale con 0.
- [x] 3.2 Tests en `scripts/tests/test_check_legal.py` con una carpeta de prueba (patrón de `scripts/tests/_sandbox.py`): detecta cada placeholder, "ONEWSTORE" en mayúsculas, documento sin versión y ruta sin bloque; `--prod` falla con hallazgos y pasa sin ellos. Verificación: `python -m unittest scripts/tests/test_check_legal.py` en verde, sin `__pycache__` en el árbol.

## 4. Páginas legales: estructura, footer y D2

- [x] 4.1 Crear `store/blocks/legal/` con la plantilla compartida y las rutas `/terminos-y-condiciones`, `/terminos-de-venta`, `/condiciones-sellers`, `/politica-de-privacidad` y `/devoluciones-y-garantias` en `store/routes.json` (sin tocar las rutas generadas). Verificación: `python -m unittest scripts/tests/test_store_blocks.py` y `python scripts/gen-categorias.py --dry-run` en verde, y `check-legal.py` sin desajustes ruta ↔ bloque.
- [x] 4.2 Fila de enlaces legales en el footer (`flex-layout.row#footer-legal`, decisión 4) y sus estilos en `styles/css/vtex.store-footer.css`. Verificación: en el workspace, a 1280 y 360 px, el footer muestra los enlaces en inicio, categoría y ficha, y cada uno abre su página (AC-1); contraste AA (AC-6).
- [x] 4.3 Redactar D2 (TyC generales de uso) en `borradores/D2-terminos-y-condiciones.md` y pasarlo al bloque. Verificación: `check-legal.py` no reporta falta de versión; encabezados sin saltos de nivel (un `#`, luego `##`…; AC-6); el texto distingue intermediario y seller (spec §9) y cada hueco es un placeholder; el bloque coincide con el borrador.
- [x] 4.4 Documentar en `README.md` cómo editar los textos legales y cómo correr `check-legal.py`, y registrar en el CHANGELOG. Verificación: el README explica el flujo borrador → bloque → comprobación.

## 5. D3 y D6 — Venta y devoluciones

- [ ] 5.1 Redactar D3 (TyC de venta: compra, envío, pago; solo nuevos e importados; origen, quién importa y responde por la garantía; plazos por importación; comprador empresarial). Verificación: cubre los puntos de §5 de la spec que le corresponden o los marca `[A CONFIRMAR POR ABOGADO]`; `check-legal.py` lista cada placeholder pendiente (Q3, Q4, Q5); borrador y bloque coinciden.
- [ ] 5.2 Redactar D6 (retracto, reversión del pago, garantías; piezas de seguridad; productos instalados o sin empaque; accesorios y herramientas). Verificación: cada cita legal de D6 aparece en `research.md` con su fuente; los límites del retracto están marcados `[A CONFIRMAR POR ABOGADO]`; en el workspace `/devoluciones-y-garantias` ya no cae en "sin resultados" (CU-7).

## 6. D4 y D5 — Sellers y privacidad

- [ ] 6.1 Redactar D4 (condiciones para sellers: obligaciones de publicación y de compatibilidad según `catalogo/como-cargan-los-sellers.md`, comisiones, pagos, responsabilidad). Verificación: las secciones que dependen de Q3 llevan `[COMISIÓN]` / `[PASARELA DE PAGO]`; sin cifras ni plazos supuestos; `/condiciones-sellers` existe (CU-8, parcialmente).
- [ ] 6.2 Redactar D5 (privacidad, Ley 1581: responsable, finalidades, derechos del titular, canal de reclamos, datos recogidos por el checkout, el contacto y el feedback privado de la spec 002, y los datos del registro de aceptación). Verificación: solo menciona datos que el sitio recoge realmente (constitución #6); cada finalidad es una que alguna spec del repo usa; los huecos son placeholders.

## 7. Aceptación en checkout y seller visible

Depende del spike (grupo 1) y de las preguntas A, B y D.

- [ ] 7.1 Módulo puro con la lógica del checkbox (versión vigente, forma del registro, habilitar o deshabilitar el pago) y sus tests en `react/__tests__`. Verificación: `yarn jest` en `react/` en verde, incluidos casos de checkbox sin marcar, marcado y versión distinta.
- [ ] 7.2 Añadir el builder `checkout-ui-custom` al `manifest.json` y el script que muestra el checkbox no premarcado con enlaces a D2, D3 y D5, y bloquea el pago hasta marcarlo (RF-2, RF-7). Verificación: en el workspace, con datos ficticios y **sin pagar**, el botón queda bloqueado con mensaje claro hasta marcar (AC-2). *(El checkout autenticado o con pago real lo prueba el equipo.)*
- [ ] 7.3 Registro de la aceptación (decisión 7): `customData` con versión y fecha. Verificación: tras marcar, el `orderForm` (consulta de red del navegador) contiene el registro con versión y fecha (AC-3); el equipo confirma que se ve en el pedido real y que no se guarda nada más (constitución #6).
- [ ] 7.4 Mostrar al seller en el PDP y en el checkout (RF-5, decisión 10); «quién envía» con `[QUIÉN ENVÍA]` mientras Q4 siga abierta. Si hace falta componente propio, con test en `react/__tests__`. Verificación: en el workspace, la ficha muestra al seller en 1280 y 360 px y los tests pasan.
- [ ] 7.5 Documentar el límite del bloqueo (solo navegador) y la decisión final de checkout en `plan.md` y `research.md`. Verificación: ambos lo mencionan y la pregunta B figura para el abogado.

## 8. Revisión legal y cierre

Estas tareas **dependen de personas ajenas a Claude**; se dejan sin marcar hasta que exista la evidencia.

- [ ] 8.1 Revisión del abogado (Q6) sobre `research.md` y los borradores; los cambios se incorporan en bloques y borradores. Verificación: evidencia en el PR (AC-5) y `research.md` con la matriz completa.
- [ ] 8.2 Antes de publicar en producción: `python scripts/check-legal.py --prod` sin hallazgos (AC-7). Verificación: salida con 0. *(Hoy no puede pasar: faltan Q1, Q3, Q4 y Q5.)*
- [ ] 8.3 Actualizar el estado de la spec en `spec.md` y en `specs/README.md`, y `specs/000-contexto-global/spec.md` (CU-7, CU-8 y CU-11, estado de TyC) cuando corresponda. Verificación: los tres reflejan el estado real; la spec solo pasa a `done` con los `AC-1` a `AC-7` verificados.

## Cierre

- `AC-1`, `AC-2`, `AC-3`, `AC-6`: se verifican en el workspace en los grupos 4 y 7.
- `AC-4`: se cumple por diseño (decisión 8); lo confirma el abogado.
- `AC-5`: requiere al abogado (8.1).
- `AC-7`: requiere Q1, Q3, Q4 y Q5 (8.2).
