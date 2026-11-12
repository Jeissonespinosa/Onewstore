# 002 — Feedback y rating de clientes (compradores y sellers)

- **Estado:** draft
- **Responsable:** Diego
- **Rama:** `feat/002-feedback-rating`
- **Depende de:** 000 (contexto); 001 (política de reseñas y consentimiento); datos reales de producto y pedidos para probar

## 1. Contexto y problema
No hay forma de que los compradores califiquen productos o sellers, ni de que los sellers
den feedback. El rating genera confianza (crítico en repuestos) y datos de calidad.
Se debe poder **enviar, evaluar (moderar) y editar** feedback.

**Hallazgos de la spec 000 (workspace `devwilbis`, 2026-11-12):**
- El PDP declara `product-rating-summary` y `product-questions-and-answers`, pero no se renderizan: probablemente la app de reseñas no está instalada. Refuerza el spike de la opción A.
- Solo existe el seller propio (`Repuestox`, id 1): los flujos de seller (RF-9, RF-10) no se pueden probar de punta a punta hasta que haya sellers terceros. Se pueden construir con el seller 1 y validarlos con datos de prueba.
- El flujo de pedido (dirección, pago, confirmación) no se ha verificado, y el RF-3 (compra verificada, pedido entregado) depende de él.
- El catálogo tiene 8 productos de prueba: hacen falta pedidos de prueba entregados para validar AC-2 a AC-8.

## 2. Objetivos / No-objetivos
**Objetivos**
- Rating 1-5 con comentario opcional; es obligatorio elegir rating para poder enviar.
- Dos flujos: **comprador → producto/seller** y **seller → plataforma/comprador** (alcance exacto en preguntas abiertas).
- Moderación (evaluación) por el administrador.
- Edición de sus propias sugerencias por el autor.

**No-objetivos**
- Sin sistema de disputas ni reputación ponderada (fase 2).
- Sin incentivos/descuentos por reseñar en esta versión.

## 3. Escenarios
- Comprador con pedido entregado: *quiero calificar producto y seller.*
- Comprador: *quiero editar mi reseña.*
- Seller: *quiero enviar feedback y ver los ratings que recibo; responder reseñas.*
- Admin: *quiero aprobar, ocultar o eliminar reseñas inapropiadas.*
- Visitante: *quiero ver promedio y reseñas en PDP y perfil de seller.*

## 4. Requisitos funcionales
- `RF-1` El formulario pide primero el **rating (1-5 estrellas)**; "Enviar" se habilita solo con rating elegido.
- `RF-2` Tras el rating se muestra comentario (máx. 1000 car.) y, si rating ≤ 3, motivo (calidad, compatibilidad, envío, atención).
- `RF-3` Solo compradores con pedido **entregado** reseñan; se muestra insignia "Compra verificada".
- `RF-4` Una reseña por producto/pedido/usuario.
- `RF-5` El autor puede **editar** (se marca "editada" con fecha) y eliminar su reseña.
- `RF-6` Estados: `pendiente → aprobada | rechazada | oculta`; solo `aprobada` es pública.
- `RF-7` El admin evalúa (aprueba/rechaza con motivo) desde una cola de pendientes.
- `RF-8` PDP muestra promedio, distribución por estrellas y lista paginada.
- `RF-9` El rating agregado del seller es visible en PDP y en su página.
- `RF-10` Sellers acceden a un formulario de feedback (rating + comentario + categoría), ven sus reseñas y pueden responder públicamente una vez por reseña.
- `RF-11` Se puede reportar una reseña (abuso/spam).
- `RF-12` Enlace a la política de reseñas (spec 001, D7) y explicación de cómo se verifican.

## 5. Requisitos no funcionales
- Datos personales: mostrar solo nombre de pila + inicial; consentimiento según Ley 1581.
- Antispam: límite de envíos, sanitización de HTML, filtro básico de lenguaje ofensivo.
- Accesibilidad: estrellas operables por teclado, `aria-label` ("3 de 5 estrellas").
- Rendimiento: carga diferida de reseñas, sin bloquear el render de la PDP.

## 6. Criterios de aceptación
- `AC-1` Sin rating seleccionado, "Enviar" está deshabilitado.
- `AC-2` Pedido entregado + 4★ + comentario → queda `pendiente` y el usuario ve confirmación.
- `AC-3` Usuario sin compra que intenta reseñar → mensaje de que requiere compra verificada.
- `AC-4` Admin aprueba una reseña `pendiente` → aparece en PDP y el promedio se recalcula.
- `AC-5` Autor edita su reseña → se muestra "editada" (y vuelve a moderación si la política lo exige).
- `AC-6` Seller con 10 reseñas → promedio y total visibles en PDP y página de seller.
- `AC-7` Seller autenticado responde una reseña → la respuesta aparece bajo la reseña.
- `AC-8` Segundo intento de reseñar el mismo producto/pedido → se ofrece editar la existente.
- `AC-9` Comentarios con HTML/script se guardan escapados (prueba de XSS).

## 7. Opciones técnicas (decisión en plan.md)
| Opción | Pros | Contras |
|---|---|---|
| A. App oficial `vtex.reviews-and-ratings` | Nativa, moderación en admin, rápida | Orientada a producto; rating de seller y compra verificada a validar |
| B. Componente React propio + Master Data v2 | Control total (seller, respuestas) | Más código, tests, seguridad y moderación propias |
| C. Híbrida: A para producto, B para seller | Equilibrio | Dos fuentes de verdad |

Recomendación inicial: **spike de 1-2 días con A** y cubrir huecos de seller con B.

## 8. Preguntas abiertas
- [ ] ¿"Sellers" reciben ratings de compradores, dan feedback a la plataforma, o ambos? (la spec asume ambos)
- [ ] ¿Moderación previa o posterior a la publicación?
- [ ] ¿Quién modera y con qué SLA?
- [ ] ¿Los sellers califican compradores públicamente o solo en privado?
- [ ] ¿Se solicita el feedback automáticamente por email tras la entrega?
- [ ] ¿Rating del seller visible en PLP/shelf?

## 9. Referencias
- VTEX: Reviews and Ratings, Master Data v2, `vtex.my-account` (secciones extendibles).
- Omnibus 2019/2161 (transparencia de reseñas) como benchmark; Ley 1480 (publicidad engañosa).
