# 002 — Tareas

> Cada tarea indica cómo verificarla. Los `AC-n` de `spec.md` se comprueban en los grupos 3 a 6.
> Las verificaciones en el workspace necesitan `vtex link` (workspace propio, p. ej. `devdiego`).

## 1. Spike (plataforma)

- [x] 1.1 Comprobar si `vtex.store-form` u otro bloque ya instalado ofrece estrellas o un campo de calificación. Verificación: tabla "requisito → nativo / no nativo" en `plan.md`.
- [ ] 1.2 Comprobar en `store.orderplaced` (con un pedido de prueba, sin pagar con datos reales) si se puede añadir un bloque propio, obtener el número y el correo del pedido, y si la página muestra el header de la tienda. Verificación: resultado anotado en `plan.md` (decisiones 5 y 6).
- [ ] 1.3 Diagnosticar Master Data en la cuenta: ¿existen la entidad `contact` y el esquema `site-contact`?, ¿cómo se crean y se declara el acceso público solo de escritura? Verificación: nota en `plan.md` coordinada con la spec 004; una escritura anónima funciona y una lectura anónima se rechaza.
- [ ] 1.4 Decidir dónde vive el botón flotante (header, `orderplaced` o ambos) y cómo se obtiene el correo sin exponerlo. Verificación: decisiones 4-6 del plan actualizadas y sin "asumido" pendiente del spike.

## 2. Datos en Master Data

- [ ] 2.1 Definir en `docs/` los esquemas JSON de `purchase-feedback` y `site-feedback` con solo los campos de la spec (RF-3, RF-6, RF-9). Verificación: JSON válido y cada campo trazable a un RF; sin campos de más (constitución #6).
- [ ] 2.2 Crear las entidades y el esquema en el workspace con escritura pública y lectura restringida. Verificación: AC-11 (consulta anónima rechazada) y un registro de prueba visible en el admin.

## 3. Rating al finalizar la compra (RF-1 a RF-6)

- [ ] 3.1 Componente de estrellas (React, con tests en `react/__tests__`: selección, teclado, `aria-label` "N de 5 estrellas", "Enviar" deshabilitado sin calificación). Verificación: Jest en verde.
- [ ] 3.2 Bloque "¿Cómo fue tu compra?" en `store/blocks/orderplaced.jsonc` con comentario (máx. 1000), motivo para 1-3★ y agradecimiento. Verificación: AC-1, AC-2, AC-5 a mano en el workspace.
- [ ] 3.3 Guardado con número de pedido, calificación, comentario, fecha y correo del pedido; una calificación por pedido. Verificación: AC-3 y AC-4 (recarga y segundo envío forzado).
- [ ] 3.4 Probar como invitado y como registrado (RF-5). Verificación: ambos flujos guardan el registro.

## 4. Botón flotante del sitio (RF-7 a RF-12)

- [ ] 4.1 Disparador flotante y modal con tipo, mensaje (máx. 1000) y correo según RF-8b; formulario cargado al abrir. Verificación: AC-6, AC-7, AC-7b, AC-7c.
- [ ] 4.2 Guardar URL, fecha y tamaño de pantalla (RF-9); conservar lo escrito si falla el envío (RF-10). Verificación: AC-7 y un fallo simulado conserva el texto.
- [ ] 4.3 Validaciones y antispam (honeypot, límite por sesión). Verificación: AC-8 y envío con honeypot lleno rechazado.
- [ ] 4.4 Estilos con tokens; el botón no tapa el minicart ni el selector de vehículo a 360 px (RF-12). Verificación: AC-12 (parte visual) a 360 y 1280 px.

## 5. Privacidad, seguridad y accesibilidad

- [ ] 5.1 Aviso de privacidad enlazado y finalidad del correo en ambos formularios (RF-11), tras resolver 001 D5 y la retención. Verificación: enlace funcional y texto presente también con el correo rellenado.
- [ ] 5.2 Comentarios con HTML/`<script>` guardados y mostrados como texto. Verificación: AC-10.
- [ ] 5.3 Recorrido solo con teclado y foco del modal (Esc, foco al botón). Verificación: AC-9; lector de pantalla a cargo de Diego.

## 6. Lectura por el equipo y cierre

- [ ] 6.1 Documentar en `README.md` cómo ver, filtrar y exportar el feedback en el admin, y resolver Q11. Verificación: README con los pasos y Q11 respondida en la spec 000.
- [ ] 6.2 Lighthouse en inicio, categoría y producto contra la línea base (`specs/003-menu-categorias-global/baseline.md` como referencia). Verificación: ninguna página baja más de 5 puntos (AC-12) y sin CLS.
- [ ] 6.3 Actualizar `specs/README.md` y el estado de la spec. Verificación: índice coherente.
