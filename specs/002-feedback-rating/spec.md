# 002 — Feedback de la experiencia de compra y del sitio

- **Estado:** draft
- **Responsable:** Diego
- **Rama:** `feat/002-feedback`
- **Depende de:** 000 (contexto); 004 (la infraestructura de formularios en Master Data, hoy rota en `/contact-us`); 001 D5 (aviso de privacidad que se enlaza en los formularios)

> **Cambio de alcance (2026-11-15):** esta spec antes cubría reseñas públicas de producto y
> calificación de sellers (versión del commit `bcb6b65`). Ahora cubre feedback **privado**
> sobre el proceso de compra y el uso del sitio. Las reseñas de producto/seller pasan a
> "Fuera de alcance / futuro" (§9).

## 1. Contexto y problema
Hoy el equipo no tiene forma de saber cómo vivió el usuario su compra ni qué problemas
encuentra al usar la tienda. Se necesitan dos canales sencillos:

1. **Al terminar la compra:** un control de rating de 5 estrellas más un comentario.
2. **Desde cualquier página:** un botón flotante que abre un formulario para reportar un
   problema o proponer una mejora de uso del sitio.

Si VTEX ya trae algo equivalente se reutiliza; si no, se construye con lo ya instalado.

## 2. Objetivos / No-objetivos
**Objetivos**
- Medir la satisfacción de cada compra (1-5 estrellas + comentario opcional).
- Recibir reportes de problemas y sugerencias del sitio sin que el usuario salga de la página.
- Que el equipo pueda leer, filtrar y exportar el feedback desde el admin de VTEX.

**No-objetivos**
- Reseñas públicas de productos o calificación de sellers (§9).
- Moderación y publicación de feedback: es **privado**, solo lo lee el equipo.
- Responder al usuario dentro del sitio (el equipo contacta por correo si el usuario lo dejó).
- Encuestas largas, NPS programados o envío por correo posterior a la entrega.

## 3. Escenarios
- Comprador (invitado o registrado) termina su compra: *quiero calificar mi experiencia en unos segundos.*
- Visitante navegando: *vi un error o tengo una idea; quiero avisar sin buscar la página de contacto.*
- Equipo de Repuestox: *quiero revisar el feedback, ver en qué página ocurrió y filtrar por calificación o tipo.*

## 4. Requisitos funcionales

**A. Rating al finalizar la compra**
- `RF-1` En la página de confirmación del pedido (`store.orderplaced`) se muestra un bloque "¿Cómo fue tu compra?" con 5 estrellas seleccionables y un campo de comentario opcional (máx. 1000 caracteres).
- `RF-2` "Enviar" se habilita solo con una calificación elegida; el comentario es opcional.
- `RF-3` Se guarda junto con el número de pedido, la calificación, el comentario, la fecha y el **correo del pedido** (se toma del pedido; el usuario no lo escribe).
- `RF-4` Un pedido admite una sola calificación: tras enviarla se muestra un agradecimiento y el control no vuelve a ofrecerse para ese pedido.
- `RF-5` Funciona para compra como invitado y como usuario registrado; no exige iniciar sesión.
- `RF-6` Si la calificación es de 1 a 3 estrellas se pide, de forma opcional, el motivo (lista cerrada: envío, producto, precio, uso del sitio, pago, otro).

**B. Botón flotante de feedback del sitio**
- `RF-7` Un botón flotante, siempre visible y en la misma esquina, aparece en todas las páginas del theme (no aplica al checkout, que no pertenece al theme).
- `RF-8` Al activarlo se abre un formulario en modal con: tipo (Problema / Sugerencia de mejora / Otro), mensaje obligatorio (máx. 1000 caracteres) y correo de contacto.
- `RF-8b` El correo se obtiene así: (1) si el usuario está **autenticado**, el de su cuenta; (2) si no, y el botón se abre desde la **confirmación de un pedido**, el correo del pedido; (3) en cualquier otro caso (usuario **anónimo**), se **solicita** en el formulario, pero es **opcional**: sin correo el feedback se envía igual y el equipo no podrá responderle. En los casos 1 y 2 el correo se muestra ya rellenado y visible en el formulario, para que el usuario sepa a qué dirección se le responderá.
- `RF-8c` El botón flotante también se muestra en la confirmación del pedido, junto al bloque de rating de la compra (RF-1).
- `RF-9` Cada envío guarda automáticamente la URL de la página, la fecha y el tamaño de pantalla (móvil/escritorio). No se guardan más datos técnicos del usuario.
- `RF-10` Tras enviar, se muestra confirmación y el modal se cierra; si falla el envío se conserva lo escrito y se muestra el error.
- `RF-11` El formulario enlaza al aviso de privacidad (spec 001, D5) e indica para qué se usa el correo, también cuando se rellena automáticamente.
- `RF-12` El botón no tapa el minicart, el selector de vehículo ni los controles de la página en móvil (360 px).

**C. Lectura por el equipo**
- `RF-13` El feedback queda en entidades de Master Data consultables, filtrables y exportables desde el admin de VTEX (`purchase-feedback` y `site-feedback`, nombres a confirmar).
- `RF-14` Los datos del feedback **no** son legibles públicamente: el sitio solo puede crear registros.

## 5. Requisitos no funcionales
- **Privacidad (Ley 1581):** el correo se usa solo para responder, aunque se rellene automáticamente desde la cuenta o el pedido; no se pide nombre ni teléfono. Aviso de privacidad enlazado. El correo del usuario autenticado no se envía al navegador de otra persona ni se expone en la URL.
- **Seguridad:** el comentario se guarda y se muestra escapado (sin HTML/script); límite de envíos por sesión y campo trampa (honeypot) contra spam; esquema público de solo escritura.
- **Accesibilidad:** estrellas operables por teclado con `aria-label` ("3 de 5 estrellas"); el modal atrapa el foco, se cierra con Esc y devuelve el foco al botón; contraste AA.
- **Rendimiento:** el modal y su formulario se cargan al abrirlos; el botón flotante no genera CLS ni bloquea el LCP.
- **Idioma:** textos en español (Colombia).

## 6. Criterios de aceptación
- `AC-1` En la confirmación de un pedido aparece el control de 5 estrellas y el comentario.
- `AC-2` Sin estrellas elegidas, "Enviar" está deshabilitado; con una elegida y sin comentario, el envío funciona.
- `AC-3` Un envío con 4★ y comentario aparece en Master Data con número de pedido, calificación, comentario y fecha.
- `AC-4` Al recargar la confirmación de un pedido ya calificado, no se ofrece calificar de nuevo; un segundo envío forzado para el mismo pedido se rechaza o se ignora.
- `AC-5` Una calificación de 2★ ofrece la lista de motivos; una de 5★ no.
- `AC-6` El botón flotante es visible en inicio, categoría, ficha de producto, búsqueda, carrito y cuenta.
- `AC-7` Enviar el formulario flotante con tipo y mensaje guarda un registro con la URL de la página donde se abrió.
- `AC-7b` Con sesión iniciada, el formulario flotante muestra el correo de la cuenta; abierto desde la confirmación de un pedido sin sesión, muestra el correo del pedido; como anónimo en otra página, pide el correo.
- `AC-7c` La confirmación del pedido muestra a la vez el bloque de rating y el botón flotante.
- `AC-8` Con el mensaje vacío no se puede enviar; como anónimo, el correo vacío es válido y envía el feedback, pero un correo mal escrito muestra un error claro.
- `AC-9` Solo con teclado se abre el modal, se llena, se envía y se cierra con Esc, y el foco vuelve al botón.
- `AC-10` Un comentario con `<script>` o HTML se guarda y se ve como texto plano.
- `AC-11` Una consulta pública (sin sesión de administrador) a los datos del feedback es rechazada.
- `AC-12` A 360 px el botón no tapa el minicart ni los controles de la página; Lighthouse no baja más de 5 puntos frente a la línea base.

## 7. Opciones técnicas (decisión en `plan.md`, tras un spike corto)
| Opción | Pros | Contras |
|---|---|---|
| A. `vtex.store-form` (ya instalado y usado en `/contact-us`) + Master Data v2 + componente React solo para las estrellas | Reutiliza lo existente, sin servicios nuevos, datos en el admin de VTEX | El rating de estrellas probablemente no es nativo de `store-form` (a verificar); hay que mantener un componente |
| B. App `vtex.reviews-and-ratings` | Nativa | Es para reseñas de **producto** públicas; no encaja con calificar la compra ni con feedback del sitio |
| C. Servicio externo (Typeform, Hotjar, Google Forms) | Rápido, trae paneles | Datos personales fuera de VTEX, posibles bloqueos por política de contenido, dependencia externa |

Recomendación inicial: **A**. El spike (1 día) debe comprobar: (1) si `store-form` o algún bloque de VTEX ofrece estrellas; (2) que `store.orderplaced` permite añadir el bloque y obtener el número de pedido; (3) cómo obtener el correo del usuario autenticado y del pedido, y cómo se hace el botón flotante (`vtex.modal-layout` con un disparador fijo por CSS); (4) cómo garantizar que el esquema público sea solo de escritura.

## 8. Preguntas abiertas
- [ ] ¿Quién lee el feedback, con qué frecuencia y cómo se entera (solo admin, o aviso por correo)? *(reemplaza la antigua Q11 de moderación)*
- [x] ¿El botón flotante se muestra también en la confirmación del pedido? → **Sí** (2026-11-15), RF-8c.
- [x] ¿Se pide el correo en el rating de compra? → **No**: se toma del usuario autenticado, del pedido en una compra, o se solicita si es anónimo (2026-11-15), RF-3 y RF-8b.
- [x] ¿El correo es obligatorio para el usuario anónimo? → **No, es opcional** (2026-11-15), RF-8b.
- [ ] ¿Cómo se lee el correo de la cuenta y del pedido sin exponerlo? (a confirmar en el spike)
- [ ] ¿Esquina del botón y texto ("Feedback", "Ayúdanos a mejorar")? ¿Hay otros elementos flotantes previstos (WhatsApp, chat)?
- [ ] ¿La entidad de Master Data y su esquema ya existen en la cuenta, o se crean? (se resuelve junto con el diagnóstico de la spec 004)
- [ ] ¿Cuánto tiempo se conservan los datos? (política de datos, spec 001)

## 9. Fuera de alcance / futuro
- Reseñas públicas de productos y rating agregado en PDP y shelf.
- Calificación de sellers, respuestas del seller y reputación ponderada. Requieren sellers terceros operando (hoy solo existe el seller de prueba) y se retomarán en otra spec cuando el marketplace tenga fecha (Q2 en la spec 000).
- Envío automático de la encuesta por correo tras la entrega.
- Panel propio de análisis del feedback.

## 10. Referencias
- Código existente: `store/blocks/contact.jsonc` y `docs/contact-schema.json` (patrón `store-form` + Master Data), `store/blocks/orderplaced.jsonc` (`store.orderplaced`), `styles/css/vtex.modal-layout.css`.
- VTEX: `vtex.store-form`, `vtex.modal-layout`, Master Data v2.
- Versión anterior de esta spec (reseñas y sellers): commit `bcb6b65`.
