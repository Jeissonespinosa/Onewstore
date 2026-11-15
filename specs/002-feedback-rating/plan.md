# 002 — Plan técnico

> Derivado de `spec.md` (estado `draft`). Aprobar este plan **no** cierra las preguntas abiertas de
> negocio de la spec §8: se resuelven antes del grupo que las necesita (ver "Preguntas abiertas
> deferrables"). Lo marcado *[asumido]* no se ha verificado.
>
> **Revisión 2026-11-15:** el plan original (opción A: `store-form` + Master Data con campos
> públicos) quedó invalidado por el bloqueo de VTEX a los campos públicos (tarea 1.3). Este plan
> adopta la opción B (servicio propio). Las secciones "Resultados del spike" conservan lo observado
> con la versión anterior.

## Contexto

- Hay dos entregables: (A) rating de 5 estrellas + comentario en `store.orderplaced`, (B) botón
  flotante global que abre un formulario en modal. Ambos envían a un servicio propio que guarda en
  Master Data con campos privados.
- **Restricción de la plataforma (observada 2026-11-15):** al crear un esquema con `publicWrite`
  en `devdiego`, Master Data responde 422 «The creation of new public fields is temporarily
  blocked» (nota de VTEX del 22-oct-2026, en vigor desde el 26-oct). El nombre de entidad no admite
  guiones (`Invalid data entity name`).
- Observado en el repo:
  - `store/blocks/orderplaced.jsonc` define `order-placed` con bloques `op-*` de `vtex.order-placed`.
    Comprobado: la página renderiza el header y el footer globales de la tienda.
  - `store/blocks/contact.jsonc` + `docs/contact-schema.json` usan `vtex.store-form` con
    `entity: "contact"` y `schema: "site-contact"`. El esquema no existe en la cuenta (tarea 1.3),
    y además `store-form` necesita campos públicos para escribir, ahora bloqueados.
  - `vtex.modal-layout` y `vtex.order-placed` ya están en `manifest.json`; `store-form` no se usará
    en esta spec.
  - `manifest.json` del theme tiene builders `store`, `styles`, `react`, `docs`, `sitemap`: **no
    `node` ni `masterdata`**. Un theme no puede llevar un servicio, así que hace falta una app aparte.
  - `react/` tiene componentes propios con tests (`CategoryMenu`, selectores) y usa CSS Modules
    (excepción de la spec 003, decisión 9).
- No observado, a resolver en el spike (tarea 1.5): que una app con `node` + `masterdata` se instala
  y escribe en campos privados, que una ruta pública responde a un anónimo desde la tienda, y cómo
  identifica el servidor al usuario autenticado y lee el correo del pedido.

## Objetivos / No-objetivos

**Objetivos:** los de la spec §2 (rating de compra, feedback del sitio, lectura en el admin).
**No-objetivos:** reseñas públicas, moderación, responder al usuario, encuestas por correo (spec §2 y §9).

## Decisiones

1. **Opción B de la spec: servicio propio en VTEX IO.** Una app nueva (vendor `onewstore`, nombre
   provisional `feedback-service`) con los builders `node` y `masterdata`. Justificación frente a la
   constitución #1 ("bloques nativos antes que código propio"): las opciones nativas no sirven
   (`store-form` sin estrellas ni valores dinámicos y dependiente de campos públicos bloqueados;
   `reviews-and-ratings` es para reseñas públicas). *Ubicación:* carpeta `feedback-service/` en
   este repo, con su propio `manifest.json`, enlazada con `vtex link` desde esa carpeta *[asumido;
   alternativa: repositorio aparte; pendiente de confirmar, spec §8]*. *Alternativas descartadas:*
   A (campos públicos, bloqueado), D (servicio externo, datos fuera de VTEX), E (ticket a VTEX,
   puede abrirse en paralelo sin depender de él).
2. **Dos entidades de Master Data separadas**, sin guiones en el nombre (`purchasefeedback`,
   `sitefeedback`; a confirmar, también el límite de longitud): campos y ciclo de vida distintos y
   cada esquema pide solo lo necesario (constitución #6). Todos los campos **privados**. Se
   declaran en la carpeta `masterdata/` de la app, para que se creen al instalarla en lugar de
   hacerlo a mano con un token *[asumido: se comprueba en 1.5]*.
3. **Seguridad por diseño, no por permisos públicos (RF-14, AC-11):** el navegador solo llama a las
   rutas públicas del servicio; el servicio escribe con las credenciales de la app (política de
   Master Data en el manifest, nombre exacto a confirmar en 1.5). Sin campos públicos, una consulta
   o escritura directa anónima a Master Data se rechaza por construcción.
4. **Unicidad por pedido (RF-4):** el servicio busca un registro previo con ese número de pedido
   antes de crear y rechaza el segundo envío (lectura privada con las credenciales de la app). Es
   una comprobación, no una restricción de la base de datos: dos envíos simultáneos podrían pasar;
   se acepta y se documenta, a menos que 1.5 muestre un mecanismo atómico.
5. **Correo (RF-3, RF-8b, RF-15):** se resuelve en el servidor. Usuario autenticado: el servicio
   valida la cookie de sesión de VTEX ID y lee el correo. Pedido: el servicio lee el pedido con las
   credenciales de la app a partir del número de pedido que envía la página, y toma el correo de ahí
   *[asumido: el número de pedido de la URL es la prueba de pertenencia; se valora en 1.5]*. Al
   navegador solo vuelve el correo **enmascarado**. El servicio no registra correos en sus logs.
6. **Botón flotante y modal:** una sola instancia en `header.jsonc`, dentro de
   `header-layout.desktop` y `header-layout.mobile` (la confirmación del pedido también muestra el
   header: RF-8c cubierto sin duplicar). El modal usa `vtex.modal-layout` con disparador fijo por CSS
   *[asumido hasta el grupo 4]*, con el formulario cargado al abrir (rendimiento, spec §5).
7. **Estilos:** tokens en `styles/configs/style.json`; componente React del theme con CSS Module
   (misma excepción que la spec 003). Sin estilos inline.
8. **Antispam en el servidor:** honeypot (descarta sin guardar), límite de envíos por sesión/IP con
   un contador en VBase y validación estricta de tamaños y valores. N y la ventana de tiempo se fijan
   en 2.3 (valor inicial propuesto: 5 envíos cada 10 minutos). Mitigación, no garantía.
9. **Origen y rutas:** las rutas son públicas pero se sirven bajo el dominio de la tienda
   (`/_v/...`), por lo que no hay CORS; el servicio comprueba `Origin`/`Referer` y solo acepta
   `application/json`. Ninguna ruta devuelve registros guardados.
10. **Pruebas:** el servicio lleva sus propias pruebas unitarias (validación, límites, unicidad,
    enmascarado de correo); el componente React lleva tests en `react/__tests__` (constitución #2).
11. **Despliegue:** solo en el workspace propio con `vtex link`. Nada de `vtex publish` ni `vtex
    install` en producción sin pedirlo explícitamente (regla del repositorio).

### Resultados del spike (tarea 1.1)

Fuente: README de `vtex.store-form` (rama `master` de `vtex-apps/store-form`, leído el 2026-11-15). Solo lectura de documentación; **no probado en el workspace**.

| Requisito | Resultado | Observación |
|---|---|---|
| Estrellas / calificación 1-5 | **No nativo** | Bloques disponibles: `form-input.checkbox`, `dropdown`, `radiogroup`, `textarea`, `text`, `upload`, `form-field-group`, `form-submit`, `form-success`. Ningún control de estrellas. |
| Lista cerrada (tipo, motivo) | **Nativo** | `form-input.dropdown` o `radiogroup`, con valores del esquema. |
| Comentario largo | **Nativo** | `form-input.textarea`; el límite de 1000 caracteres va en el esquema (`maxLength`), a comprobar. |
| Campo oculto con valor | **Parcial** | `form-input.text` con `inputType: "hidden"` y `value` fijo en el bloque. El valor es estático: no sirve para URL, pedido o correo, que son dinámicos. |
| Valores dinámicos (URL, pedido, correo, pantalla) | **No nativo** | `store-form` no los inyecta. Hay que usar un componente React que envíe a Master Data. |
| Mensaje de éxito / error | **Nativo** | `form-success` y handles `formErrorServer` / `formErrorUserInput`. |
| Esquema público de solo escritura | **Sin información** | El README no lo cubre; se verifica en la tarea 1.3. |

**Consecuencia:** faltan las estrellas y los valores dinámicos, así que ambos formularios se hacen con un componente React propio y no con `store-form` (confirmado por la decisión 1 revisada).

### Resultados del spike (tarea 1.3, parcial)

Observado el 2026-11-15 en `devdiego`, como visitante anónimo, solo con lecturas.

| Comprobación | Resultado |
|---|---|
| `GET /api/dataentities/contact/schemas[/site-contact]`, `.../search`, y `CL/search` | **403** para todas, incluida `CL` (que siempre existe): desde fuera no se distingue "existe" de "no existe" |
| Consulta que usa `store-form` (`documentPublicSchema`, `vtex.store-graphql`) para `contact` / `site-contact` | **404** de Master Data: el esquema público `site-contact` **no existe** (o no está marcado público) en la cuenta |
| `/contact-us` | Se queda en "Cargando formulario..." sin error de consola; la consulta devuelve `documentPublicSchema: null` con el 404 anterior |

**Causa probable del fallo de la spec 004** *[inferido de lo anterior]*: `docs/contact-schema.json` está en el repo pero el esquema nunca se creó en Master Data de la cuenta; el builder `docs` no lo crea solo. Para 002 significa que **hay que crear los esquemas a mano** (API de Master Data con permiso de administrador) y que el repo solo guarda su definición.

**Completado el mismo día con Diego** (ejecutó los comandos con su sesión; yo no usé tokens):
- `PUT /api/dataentities/site-feedback/schemas/site-feedback` → **400** «Invalid data entity name»: el nombre de la entidad no admite guiones.
- `PUT /api/dataentities/sitefeedback/schemas/site-feedback` con `publicWrite` → **422** «The creation of new public fields is temporarily blocked» (`BlockedRules.publicWrite`), nota de VTEX del 22-oct-2026 (https://developers.vtex.com/updates/release-notes/2026-10-23-master-data-temporary-restriction-on-public-fields). No se creó nada.
- **Consecuencia:** un visitante anónimo ya no puede escribir en Master Data. Se adopta el servicio propio (decisión 1). Probablemente `/contact-us` (spec 004) fallará también por esto *[inferido, no verificado]*.

### Resultados del spike (tarea 1.4, parcial)

Observado el 2026-11-15 en `devdiego`, como visitante anónimo.

| Pregunta | Resultado |
|---|---|
| ¿`store.orderplaced` muestra el header y el footer de la tienda? | **Sí.** Con `/checkout/orderPlaced/?og=<número ficticio>` se renderizan el botón "Categorías", el acceso a la cuenta y el pie de página. |
| ¿Un bloque en el header aparece también en la confirmación del pedido? | **Sí** (se deduce de lo anterior): basta **una** instancia global; no hace falta duplicar en `orderplaced.jsonc` para RF-8c. |
| ¿Cómo se sabe si hay sesión y cuál es el correo? | `GET /api/sessions?items=profile.email,profile.isAuthenticated` responde 200 con la cookie de la propia sesión. Anónimo: solo `isAuthenticated: "false"`, sin correo. **Con sesión iniciada no probado** (no inicio sesión). |
| ¿Cómo se obtiene el correo del pedido? | `GET /api/checkout/pub/orders/<og>` existe (404 con un número inexistente). **Qué devuelve y a quién con un pedido real no se verificó**: falta un pedido (tarea 1.2, aplazada por no haber medio de pago). |

**Efecto en las decisiones:** el lugar del botón (decisión 6) queda resuelto. La resolución del correo ya no se hace en el navegador sino en el servidor (decisión 5); lo que falta por verificar (sesión iniciada y pedido real) pasa a la tarea 1.5.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La app de servicio es código nuevo que mantener, con permisos sobre Master Data | Superficie mínima: dos rutas, sin lectura; pruebas unitarias; política de Master Data limitada a las dos entidades si la plataforma lo permite |
| Rutas públicas abiertas a spam o abuso | Honeypot, límite por sesión/IP en el servidor, validación estricta, comprobación de origen (AC-13) |
| Exponer el correo del usuario | Se resuelve en el servidor; el navegador recibe solo la versión enmascarada; sin correos en logs (grupo 5) |
| Un `orderGroup` conocido por un tercero permite calificar o ver el correo enmascarado de ese pedido | Riesgo bajo y aceptado (solo se puede crear una calificación y solo se ve el correo enmascarado); se valora en 1.5 |
| VTEX restringe más Master Data o cambia las políticas de una app `node` | Fallo visible en el spike 1.5; la lógica queda aislada en el servicio |
| Se pisa el trabajo con otra spec (004 usa el mismo problema) | Coordinar con la 004 antes del grupo 2 |
| El botón tapa el minicart u otros flotantes (015 WhatsApp) | Esquina definida con el equipo; prueba a 360 px (AC-12) |
| Empeora LCP/CLS | Carga diferida del modal; Lighthouse contra línea base |

## Reversión

Todo es aditivo: desinstalar la app `feedback-service` y quitar el componente y su bloque de
`header.jsonc`/`orderplaced.jsonc`. Los datos ya recogidos quedan en las entidades de Master Data y
se conservan o se borran según la política de retención. Sin migraciones sobre datos existentes.

## Preguntas abiertas deferrables

| Pregunta | Se necesita antes de | Responde |
|---|---|---|
| Q11: quién lee el feedback y cómo se entera (¿aviso por correo?) | Grupo 6 | Equipo |
| Esquina y texto del botón; otros flotantes previstos | Grupo 4 | Equipo |
| Ubicación del servicio (carpeta de este repo o repo aparte), nombre de la app y quién la mantiene | Grupo 2 (tarea 2.1) | Equipo |
| Retención de datos y aviso de privacidad (001 D5) | Grupo 5 | Equipo / spec 001 |
| Nombres definitivos de las entidades y su límite de longitud | Tarea 2.2 | Spike 1.5 |
| ¿Se reutiliza el servicio para `/contact-us` (spec 004)? | Fin del grupo 2 | Equipo |
| ¿Ticket a VTEX por campos públicos (opción E)? | Opcional, sin dependencia | Diego |
