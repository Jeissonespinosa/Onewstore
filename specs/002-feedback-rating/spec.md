# 002 — Feedback de la experiencia de compra y del sitio

- **Estado:** implementing (2026-11-16: grupos 1-4 y 5.2/5.3 hechos y verificados en `devdiego`; falta 5.1 por el aviso de privacidad y la retención, y el cierre del grupo 6)
- **Responsable:** Diego
- **Rama:** `feat/002-feedback`
- **Depende de:** 000 (contexto); 001 D5 (aviso de privacidad que se enlaza en los formularios). Ya **no** depende de la infraestructura de formularios de la 004 (ver el cambio de 2026-11-15 abajo); la 004 debería adoptar el mismo servicio.

> **Cambio de diseño (2026-11-15):** VTEX bloquea desde el 26-oct-2026 la creación de campos
> **públicos** en Master Data v1 y v2 ([nota de VTEX](https://developers.vtex.com/updates/release-notes/2026-10-23-master-data-temporary-restriction-on-public-fields)).
> Un visitante anónimo ya no puede escribir directamente en Master Data, que era la base de la
> opción A (`store-form` + Master Data público). La spec adopta un **servicio propio en VTEX IO**
> que recibe el feedback y lo guarda en campos **privados** con credenciales de la app (§7,
> opción B). Cambian RF-8b, RF-13, RF-14, los requisitos no funcionales, AC-11 y se añade AC-13.

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
- `RF-3` Se guarda junto con el número de pedido, la calificación, el comentario, la fecha y el **correo que la persona escribe** (opcional; ver RF-8b). No se lee del pedido.
- `RF-4` Un pedido admite una sola calificación: tras enviarla se muestra un agradecimiento y el control no vuelve a ofrecerse para ese pedido.
- `RF-5` Funciona para compra como invitado y como usuario registrado; no exige iniciar sesión.
- `RF-6` Si la calificación es de 1 a 3 estrellas se pide, de forma opcional, el motivo (lista cerrada: envío, producto, precio, uso del sitio, pago, otro).

**B. Botón flotante de feedback del sitio**
- `RF-7` Un botón flotante, siempre visible y en la misma esquina, aparece en todas las páginas del theme (no aplica al checkout, que no pertenece al theme).
- `RF-8` Al activarlo se abre un formulario en modal con: tipo (Problema / Sugerencia de mejora / Otro), mensaje obligatorio (máx. 1000 caracteres) y correo de contacto.
- `RF-8b` **El correo es siempre el que la persona escribe**, en ambos formularios (calificación de la compra y botón flotante), y es **opcional**: sin correo el feedback se envía igual y el equipo no podrá responder. Si el usuario tiene **sesión iniciada**, el campo arranca **precargado con el correo de su cuenta** y puede editarlo o borrarlo; lo que se guarda es lo que quede escrito. No se lee el correo de los pedidos (decisión 2026-11-16: OMS devuelve un alias `…@ct.vtex.com.br` y leerlo exige permisos amplios sobre pedidos). La precarga la hace el servicio en el servidor (RF-15), solo para la propia sesión.
- `RF-8c` El botón flotante también se muestra en la confirmación del pedido, junto al bloque de rating de la compra (RF-1).
- `RF-9` Cada envío guarda automáticamente la URL de la página, la fecha y el tamaño de pantalla (móvil/escritorio). No se guardan más datos técnicos del usuario.
- `RF-10` Tras enviar, se muestra confirmación y el modal se cierra; si falla el envío se conserva lo escrito y se muestra el error.
- `RF-11` El formulario enlaza al aviso de privacidad (spec 001, D5) e indica para qué se usa el correo, también cuando se rellena automáticamente.
- `RF-12` El botón no tapa el minicart, el selector de vehículo ni los controles de la página en móvil (360 px).

**C. Lectura por el equipo**
- `RF-13` El feedback queda en entidades de Master Data con **campos privados**, consultables, filtrables y exportables desde el admin de VTEX. Los nombres de entidad no admiten guiones (p. ej. `purchasefeedback` y `sitefeedback`, a confirmar en la tarea 2.2); las entidades se crean con la API de Master Data, no con el builder `masterdata` (falla en `builder-hub`, spike 1.5).
- `RF-14` Los datos del feedback **no** son legibles ni escribibles directamente por el público. El navegador solo habla con un **servicio propio** que valida, aplica límites y guarda en Master Data con las credenciales de la app; no existe ningún campo público.
- `RF-15` El servicio resuelve en el servidor lo que el navegador no debe decidir: el correo de la cuenta de la sesión (solo para precargar) y si un pedido ya fue calificado (RF-4).

## 5. Requisitos no funcionales
- **Privacidad (Ley 1581):** el correo es opcional y se usa solo para responder, aunque se precargue desde la cuenta; no se pide nombre ni teléfono. Aviso de privacidad enlazado. El correo de la cuenta solo se devuelve a la propia sesión (`no-store`) para precargar el campo, no se expone en la URL, y el servicio no lo escribe en sus registros (logs).
- **Seguridad:** el comentario se guarda y se muestra escapado (sin HTML/script); validación de tamaños y valores en el servidor; límite de envíos por sesión/IP y campo trampa (honeypot) **aplicados en el servidor**; campos de Master Data solo privados (VTEX no permite crear públicos); el servicio rechaza orígenes ajenos a la tienda y expone solo las rutas necesarias.
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
- `AC-7b` Con sesión iniciada, el campo de correo arranca con el correo de la cuenta y se puede editar o borrar; como anónimo arranca vacío. En ambos formularios se guarda lo que quede escrito. Un correo mal escrito se rechaza. El correo de la cuenta solo se devuelve a la propia sesión (`no-store`) y nunca se lee de un pedido.
- `AC-7c` La confirmación del pedido muestra a la vez el bloque de rating y el botón flotante.
- `AC-8` Con el mensaje vacío no se puede enviar; como anónimo, el correo vacío es válido y envía el feedback, pero un correo mal escrito muestra un error claro.
- `AC-9` Solo con teclado se abre el modal, se llena, se envía y se cierra con Esc, y el foco vuelve al botón.
- `AC-10` Un comentario con `<script>` o HTML se guarda y se ve como texto plano.
- `AC-11` Una consulta o una escritura directa y anónima a Master Data sobre las entidades de feedback es rechazada, y el envío a través del servicio sí guarda el registro. Ninguno de los campos es público.
- `AC-13` Más de N envíos seguidos desde la misma sesión/IP (N a fijar en el plan) son rechazados por el servidor con un mensaje claro; un envío con el campo trampa lleno se descarta sin guardar.
- `AC-12` A 360 px el botón no tapa el minicart ni los controles de la página; Lighthouse no baja más de 5 puntos frente a la línea base.

## 7. Opciones técnicas (decisión en `plan.md`)
| Opción | Pros | Contras |
|---|---|---|
| A. `vtex.store-form` + Master Data con campos públicos de solo escritura | Reutiliza lo existente, sin servicios nuevos | **Descartada (2026-11-15):** VTEX bloquea crear campos públicos (nota del 22-oct-2026); `store-form` tampoco tiene estrellas ni valores dinámicos (spike 1.1) |
| **B. Servicio propio en VTEX IO (elegida)** + componente React en el theme + Master Data con campos privados | Cumple la política de VTEX; antispam, límites y unicidad por pedido en el servidor; el correo se resuelve en el servidor sin exponerlo | App nueva (`node` no va en el theme): instalación, permisos de Master Data y mantenimiento; más trabajo |
| C. `vtex.reviews-and-ratings` | Nativa | Es para reseñas **públicas de producto**; no encaja |
| D. Servicio externo (Typeform, Hotjar, Google Forms) | Rápido, trae paneles | Datos personales fuera de VTEX (Ley 1581), dependencia externa |
| E. Ticket a VTEX para excepción de campos públicos | Mantendría la opción A | Plazo y resultado inciertos; VTEX orienta a retirar los campos públicos. Puede abrirse en paralelo, sin depender de ella |

Decisión: **B**. El spike debe comprobar: (1) que `store.orderplaced` muestra el header global (**hecho**: sí) y de dónde sale el número de pedido; (2) que una app con `node` y `masterdata` se instala en el workspace y escribe en campos privados; (3) que una ruta pública del servicio responde a un visitante anónimo desde el origen de la tienda; (4) cómo el servidor identifica al usuario autenticado y lee el correo del pedido.

## 8. Preguntas abiertas
- [ ] ¿Quién lee el feedback, con qué frecuencia y cómo se entera (solo admin, o aviso por correo)? *(reemplaza la antigua Q11 de moderación)*
- [x] ¿El botón flotante se muestra también en la confirmación del pedido? → **Sí** (2026-11-15), RF-8c.
- [x] ¿Se pide el correo en el rating de compra? → **Sí, opcional y escrito por la persona**, precargado con el de la cuenta si hay sesión (2026-11-16, sustituye a la decisión del 2026-11-15), RF-3 y RF-8b.
- [x] ¿El correo es obligatorio para el usuario anónimo? → **No, es opcional** (2026-11-15), RF-8b.
- [x] ¿Cómo se lee el correo de la cuenta y del pedido sin exponerlo? → **El del pedido ya no se lee** (alias de OMS + permisos amplios, 2026-11-16). El de la cuenta lo da el servicio solo a la propia sesión para precargar, RF-8b y RF-15.
- [x] ¿Dónde vive el servicio? → Carpeta `feedback-service/` de este repo, app `onewstore.feedback-service` (2026-11-16). Falta confirmar quién la mantiene e instala (por defecto, Diego).
- [ ] ¿Se abre un ticket a VTEX por campos públicos en paralelo (opción E)? No bloquea esta spec.
- [x] Impacto en la spec 004: `/contact-us` con `store-form` y Master Data público probablemente falle por el mismo motivo → **se reutiliza este servicio** (2026-11-16). La 004 deberá añadir su ruta y su entidad privada.
- [ ] ¿Esquina del botón y texto ("Feedback", "Ayúdanos a mejorar")? ¿Hay otros elementos flotantes previstos (WhatsApp, chat)?
- [x] ¿La entidad de Master Data y su esquema ya existen en la cuenta, o se crean? → No existen (spike 1.3: `site-contact` da 404); se crean con el servicio como entidades de campos privados (2026-11-15).
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
