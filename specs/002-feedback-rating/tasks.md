# 002 — Tareas

> Cada tarea indica cómo verificarla. Los `AC-n` de `spec.md` se comprueban en los grupos 2 a 6.
> Las verificaciones en el workspace necesitan `vtex link` (workspace propio, p. ej. `devdiego`).
> **Revisado el 2026-11-15** por el bloqueo de VTEX a los campos públicos de Master Data: el grupo 2
> pasa de "esquemas públicos" a "servicio propio + campos privados" (ver `plan.md`, decisión 1).

## 1. Spike (plataforma)

- [x] 1.1 Comprobar si `vtex.store-form` u otro bloque ya instalado ofrece estrellas o un campo de calificación. Verificación: tabla "requisito → nativo / no nativo" en `plan.md`. *(Resultado: no hay estrellas.)*
- [x] 1.2 Comprobar en `store.orderplaced`, con un pedido real de prueba (no hay medio de pago configurado: lo crea Diego o se configura uno), qué número de pedido y qué datos expone la página y si se puede añadir un bloque propio. Verificación: resultado anotado en `plan.md` (decisiones 5 y 6). Incluye (f) del spike 1.5: cómo lee el servidor el correo de un pedido (política de OMS por confirmar). *Aplazada hasta tener un pedido; su parte de "dónde va el botón" ya está resuelta.*
  - Cerrada 2026-11-16: pedido real creado con Promissory/Notes Payable y `store.orderplaced` verificado con `?og=<número>`. (f) descartada: OMS devuelve un alias `…@ct.vtex.com.br` (decisión 5 del plan).
  - Parcial 2026-11-16: pedido real `1676760500001` creado; `store.orderplaced` se renderiza con `?og=<número>` y el bloque aparece. (f) resuelto: la lectura del correo del pedido se descartó (plan, decisión 5).
- [x] 1.3 Diagnosticar Master Data en la cuenta. Verificación: notas en `plan.md`. *(Resultado: `site-contact` no existe; el nombre de entidad no admite guiones; VTEX bloquea los campos públicos, así que la prueba de escritura anónima original ya no aplica y se sustituye por 1.5.)*
- [x] 1.4 Decidir dónde vive el botón flotante. Verificación: decisión 6 del plan. *(Resultado: una instancia en el header, que también aparece en la confirmación del pedido. La resolución del correo se movió a 1.5.)*
- [x] 1.5 Spike del servicio: crear una app mínima con `node` y `masterdata` (una ruta pública y una entidad privada de prueba) y comprobar en `devdiego`: (a) que se instala con `vtex link` y crea la entidad; (b) que la ruta responde a un visitante anónimo desde el origen de la tienda; (c) que el servicio escribe en la entidad con sus credenciales y una escritura o lectura directa anónima a Master Data se rechaza; (d) qué política de Master Data hace falta y si se puede limitar a las dos entidades; (e) cómo identifica al usuario autenticado y obtiene el correo (sesión iniciada la prueba Diego); (f) cómo lee el correo de un pedido, con un pedido real si existe. Verificación: tabla "pregunta → resultado" en `plan.md`, decisiones 1-5 sin "asumido" pendiente del spike y nombres de entidad confirmados. *(Resultado: (a)-(e) verificadas; el builder `masterdata` falla en `builder-hub`, así que las entidades se crean a mano. **(f) pasa a la tarea 1.2**, que ya necesita un pedido real.)*

## 2. Servicio y datos en Master Data

- [x] 2.1 Decidir con el equipo la ubicación (carpeta `feedback-service/` o repositorio aparte), el nombre de la app y quién la mantiene; crear el esqueleto (`manifest.json`, `service.json`, políticas, `.gitignore` sin `node_modules`). Verificación: la app se enlaza con `vtex link` sin errores y la decisión queda en `plan.md` (decisión 1).
- [x] 2.2 Esquemas JSON de `purchasefeedback` y `sitefeedback` en `feedback-service/schemas/` con solo los campos de la spec (RF-3, RF-6, RF-9), todos **privados**, y creación de las entidades con `PUT /api/dataentities/<entidad>/schemas/<esquema>` (el builder `masterdata` falla; plan, decisión 2). Verificación: JSON válido, cada campo trazable a un RF, ninguna clave `publicRead/publicWrite/publicFilter`, y las entidades aparecen en el admin con una escritura de prueba del servicio.
- [x] 2.3 Rutas del servicio: crear feedback de compra y de sitio, y la consulta de correo enmascarado. Validación de tipos, tamaños (comentario ≤ 1000) y valores cerrados; escape del texto; honeypot; límite por sesión/IP; comprobación de origen; unicidad por pedido; correo resuelto en el servidor; sin correos en logs. Tests unitarios de cada regla. Verificación: la suite del servicio en verde. *(53 pruebas en verde con `yarn test`: validación, enmascarado, límites y las tres rutas con un contexto simulado. La lectura del correo del pedido queda como módulo aislado sin verificar, ver 1.2.)*
- [x] 2.4 Probar el servicio en `devdiego` desde fuera de la tienda: envío válido (200 y registro en el admin), envío duplicado de un pedido (rechazado), exceso de envíos (rechazado), honeypot lleno (descartado), origen ajeno (rechazado) y escritura o lectura directa a Master Data sin sesión de administrador (rechazada). Verificación: AC-11 y AC-13 comprobados y anotados.
  - Hecho 2026-11-16 en `devdiego` (curl con `Origin` a mano, sin navegador real): AC-11 escritura/lectura anónima 403 en ambas entidades; AC-4 duplicado 409 inmediato; AC-13 429 desde el 2.º envío inválido (contador por ruta) y honeypot 200 sin guardar; origen ajeno/ausente 403; AC-8/AC-10 correctos (HTML guardado como texto, `pageUrl` solo ruta, `email` vacío). Fallos hallados y corregidos: política `vbase-read-write`, duplicados por índice con retraso (id = nº de pedido), `getDocument` sin 404, timeouts bajo el corte de 10 s. 504 intermitentes: no reaparecen en 27 peticiones tras el ajuste, causa no confirmada. Registros de prueba por borrar.
- [x] 2.5 Documentar en `README.md` cómo se enlaza, instala y prueba el servicio, y qué política de Master Data requiere. Verificación: los pasos del README funcionan en un workspace limpio. Avisar a la spec 004 del patrón (decisión del equipo sobre reutilizarlo).
  - Hecho 2026-11-16: pasos de entidades, `yarn test` y `vtex link` ejecutados en `devdiego`; **no** probado en un workspace nuevo. Spec 004: decisión de reutilizar el servicio tomada por Diego; falta actualizar esa spec.

## 3. Rating al finalizar la compra (RF-1 a RF-6)

- [x] 3.1 Componente de estrellas (React, con tests en `react/__tests__`: selección, teclado, `aria-label` "N de 5 estrellas", "Enviar" deshabilitado sin calificación). Verificación: Jest en verde.
  - Hecho 2026-11-16: `react/PurchaseRating.js` + `react/__tests__/PurchaseRating.test.js` (16 tests en verde). El número de pedido sale de `?og=` de la URL; el bloque no se muestra sin él. Aún sin registrar en `store/interfaces.json` (3.2).
- [x] 3.2 Bloque "¿Cómo fue tu compra?" en `store/blocks/orderplaced.jsonc` con comentario (máx. 1000), motivo para 1-3★ y agradecimiento, enviando al servicio. Verificación: AC-1, AC-2, AC-5 a mano en el workspace.
  - Hecho 2026-11-16 en `devdiego` con el pedido real `1676760500001` (medio de pago de prueba Promissory/Notes Payable, ver plan): el bloque aparece bajo la confirmación; AC-1 y AC-5 (2★ + motivo `envio` + comentario → 200 y agradecimiento) comprobados a mano. AC-2 (solo estrellas) cubierto por test unitario, no a mano. El envío tarda varios segundos: medir.
- [x] 3.3 Guardado con número de pedido, calificación, comentario, fecha y correo del pedido (resuelto por el servicio); una calificación por pedido. Verificación: AC-3 y AC-4 (recarga y segundo envío forzado). Necesita un pedido real (ver 1.2).
  - Hecho 2026-11-16: registro con `orderId`=1676760500001, `rating` 2, `reason` envio, comentario y `createdIn` (AC-3); segundo envío del mismo pedido → 409 y agradecimiento (AC-4). Con sesión, `email` = el de la cuenta (`davrdavr@gmail.com`), no el del pedido (`prueba.feedback@example.com`): el correo por pedido se **descartó el 2026-11-16** (alias de OMS): ahora el correo es el escrito, precargado con el de la cuenta (RF-8b).
- [x] 3.4 Probar como invitado y como registrado (RF-5). Verificación: ambos flujos guardan el registro.
  - Hecho 2026-11-16 con alcance parcial: **registrado**, probado en el navegador con un pedido real (precarga del correo de la cuenta, editado a `escrito.spec002@example.com`, guardado tal cual: 200 y registro verificado en Master Data). **Invitado**: probado en el servidor con `curl` sin cookies (identity anónimo con `email: null`; envíos sin sesión guardan con el correo escrito o vacío). **No** se probó el invitado visualmente: en `devdiego` un invitado es redirigido al login de admin al ver la confirmación; repetirlo en una tienda publicada. Tampoco se probó a mano un correo mal escrito en el navegador (cubierto por tests).

## 4. Botón flotante del sitio (RF-7 a RF-12)

- [ ] 4.1 Disparador flotante y modal con tipo, mensaje (máx. 1000) y correo según RF-8b (escrito por la persona; precargado con el de la cuenta si hay sesión); formulario cargado al abrir; una instancia en `header.jsonc` (escritorio y móvil). Verificación: AC-6, AC-7, AC-7b, AC-7c.
- [ ] 4.2 Enviar al servicio URL, tamaño de pantalla (RF-9); la fecha la pone el servidor; conservar lo escrito si falla el envío (RF-10). Verificación: AC-7 y un fallo simulado conserva el texto.
- [ ] 4.3 Validaciones del formulario y mensajes de los límites del servidor. Verificación: AC-8 y AC-13 (mensaje claro).
- [ ] 4.4 Estilos con tokens; el botón no tapa el minicart ni el selector de vehículo a 360 px (RF-12). Verificación: AC-12 (parte visual) a 360 y 1280 px.

## 5. Privacidad, seguridad y accesibilidad

- [ ] 5.1 Aviso de privacidad enlazado y finalidad del correo en ambos formularios (RF-11), tras resolver 001 D5 y la retención. Verificación: enlace funcional y texto presente también con el correo enmascarado.
- [ ] 5.2 Comentarios con HTML/`<script>` guardados y mostrados como texto, y revisión de que ni el servicio ni el navegador envían o registran el correo completo. Verificación: AC-10 y revisión de las respuestas del servicio y de sus logs.
- [ ] 5.3 Recorrido solo con teclado y foco del modal (Esc, foco al botón). Verificación: AC-9; lector de pantalla a cargo de Diego.

## 6. Lectura por el equipo y cierre

- [ ] 6.1 Documentar en `README.md` cómo ver, filtrar y exportar el feedback en el admin, y resolver Q11. Verificación: README con los pasos y Q11 respondida en la spec 000.
- [ ] 6.2 Lighthouse en inicio, categoría y producto contra la línea base (`specs/003-menu-categorias-global/baseline.md` como referencia). Verificación: ninguna página baja más de 5 puntos (AC-12) y sin CLS.
- [ ] 6.3 Actualizar `specs/README.md` (índice y dependencias de la 002) y el estado de la spec. Verificación: índice coherente.
