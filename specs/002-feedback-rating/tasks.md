# 002 — Tareas

> Cada tarea indica cómo verificarla. Los `AC-n` de `spec.md` se comprueban en los grupos 2 a 6.
> Las verificaciones en el workspace necesitan `vtex link` (workspace propio, p. ej. `devdiego`).
> **Revisado el 2026-11-15** por el bloqueo de VTEX a los campos públicos de Master Data: el grupo 2
> pasa de "esquemas públicos" a "servicio propio + campos privados" (ver `plan.md`, decisión 1).

## 1. Spike (plataforma)

- [x] 1.1 Comprobar si `vtex.store-form` u otro bloque ya instalado ofrece estrellas o un campo de calificación. Verificación: tabla "requisito → nativo / no nativo" en `plan.md`. *(Resultado: no hay estrellas.)*
- [ ] 1.2 Comprobar en `store.orderplaced`, con un pedido real de prueba (no hay medio de pago configurado: lo crea Diego o se configura uno), qué número de pedido y qué datos expone la página y si se puede añadir un bloque propio. Verificación: resultado anotado en `plan.md` (decisiones 5 y 6). Incluye (f) del spike 1.5: cómo lee el servidor el correo de un pedido (política de OMS por confirmar). *Aplazada hasta tener un pedido; su parte de "dónde va el botón" ya está resuelta.*
- [x] 1.3 Diagnosticar Master Data en la cuenta. Verificación: notas en `plan.md`. *(Resultado: `site-contact` no existe; el nombre de entidad no admite guiones; VTEX bloquea los campos públicos, así que la prueba de escritura anónima original ya no aplica y se sustituye por 1.5.)*
- [x] 1.4 Decidir dónde vive el botón flotante. Verificación: decisión 6 del plan. *(Resultado: una instancia en el header, que también aparece en la confirmación del pedido. La resolución del correo se movió a 1.5.)*
- [x] 1.5 Spike del servicio: crear una app mínima con `node` y `masterdata` (una ruta pública y una entidad privada de prueba) y comprobar en `devdiego`: (a) que se instala con `vtex link` y crea la entidad; (b) que la ruta responde a un visitante anónimo desde el origen de la tienda; (c) que el servicio escribe en la entidad con sus credenciales y una escritura o lectura directa anónima a Master Data se rechaza; (d) qué política de Master Data hace falta y si se puede limitar a las dos entidades; (e) cómo identifica al usuario autenticado y obtiene el correo (sesión iniciada la prueba Diego); (f) cómo lee el correo de un pedido, con un pedido real si existe. Verificación: tabla "pregunta → resultado" en `plan.md`, decisiones 1-5 sin "asumido" pendiente del spike y nombres de entidad confirmados. *(Resultado: (a)-(e) verificadas; el builder `masterdata` falla en `builder-hub`, así que las entidades se crean a mano. **(f) pasa a la tarea 1.2**, que ya necesita un pedido real.)*

## 2. Servicio y datos en Master Data

- [ ] 2.1 Decidir con el equipo la ubicación (carpeta `feedback-service/` o repositorio aparte), el nombre de la app y quién la mantiene; crear el esqueleto (`manifest.json`, `service.json`, políticas, `.gitignore` sin `node_modules`). Verificación: la app se enlaza con `vtex link` sin errores y la decisión queda en `plan.md` (decisión 1).
- [ ] 2.2 Esquemas JSON de `purchasefeedback` y `sitefeedback` en `feedback-service/schemas/` con solo los campos de la spec (RF-3, RF-6, RF-9), todos **privados**, y creación de las entidades con `PUT /api/dataentities/<entidad>/schemas/<esquema>` (el builder `masterdata` falla; plan, decisión 2). Verificación: JSON válido, cada campo trazable a un RF, ninguna clave `publicRead/publicWrite/publicFilter`, y las entidades aparecen en el admin con una escritura de prueba del servicio.
- [x] 2.3 Rutas del servicio: crear feedback de compra y de sitio, y la consulta de correo enmascarado. Validación de tipos, tamaños (comentario ≤ 1000) y valores cerrados; escape del texto; honeypot; límite por sesión/IP; comprobación de origen; unicidad por pedido; correo resuelto en el servidor; sin correos en logs. Tests unitarios de cada regla. Verificación: la suite del servicio en verde. *(53 pruebas en verde con `yarn test`: validación, enmascarado, límites y las tres rutas con un contexto simulado. La lectura del correo del pedido queda como módulo aislado sin verificar, ver 1.2.)*
- [ ] 2.4 Probar el servicio en `devdiego` desde fuera de la tienda: envío válido (200 y registro en el admin), envío duplicado de un pedido (rechazado), exceso de envíos (rechazado), honeypot lleno (descartado), origen ajeno (rechazado) y escritura o lectura directa a Master Data sin sesión de administrador (rechazada). Verificación: AC-11 y AC-13 comprobados y anotados.
- [ ] 2.5 Documentar en `README.md` cómo se enlaza, instala y prueba el servicio, y qué política de Master Data requiere. Verificación: los pasos del README funcionan en un workspace limpio. Avisar a la spec 004 del patrón (decisión del equipo sobre reutilizarlo).

## 3. Rating al finalizar la compra (RF-1 a RF-6)

- [ ] 3.1 Componente de estrellas (React, con tests en `react/__tests__`: selección, teclado, `aria-label` "N de 5 estrellas", "Enviar" deshabilitado sin calificación). Verificación: Jest en verde.
- [ ] 3.2 Bloque "¿Cómo fue tu compra?" en `store/blocks/orderplaced.jsonc` con comentario (máx. 1000), motivo para 1-3★ y agradecimiento, enviando al servicio. Verificación: AC-1, AC-2, AC-5 a mano en el workspace.
- [ ] 3.3 Guardado con número de pedido, calificación, comentario, fecha y correo del pedido (resuelto por el servicio); una calificación por pedido. Verificación: AC-3 y AC-4 (recarga y segundo envío forzado). Necesita un pedido real (ver 1.2).
- [ ] 3.4 Probar como invitado y como registrado (RF-5). Verificación: ambos flujos guardan el registro.

## 4. Botón flotante del sitio (RF-7 a RF-12)

- [ ] 4.1 Disparador flotante y modal con tipo, mensaje (máx. 1000) y correo según RF-8b (enmascarado cuando lo resuelve el servidor); formulario cargado al abrir; una instancia en `header.jsonc` (escritorio y móvil). Verificación: AC-6, AC-7, AC-7b, AC-7c.
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
