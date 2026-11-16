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
   `reviews-and-ratings` es para reseñas públicas). *Ubicación (confirmada por Diego el 2026-11-16):* carpeta `feedback-service/` en
   este repo, con su propio `manifest.json`, enlazada con `vtex link` desde esa carpeta. *Alternativas descartadas:*
   A (campos públicos, bloqueado), D (servicio externo, datos fuera de VTEX), E (ticket a VTEX,
   puede abrirse en paralelo sin depender de él).
2. **Dos entidades de Master Data separadas** (`purchasefeedback`, `sitefeedback`): campos y ciclo
   de vida distintos y cada esquema pide solo lo necesario (constitución #6). Todos los campos
   **privados**. **Se crean a mano con la API de Master Data** (`PUT /api/dataentities/<entidad>/schemas/<esquema>`,
   con el token de un administrador), no con el builder `masterdata`: en el spike 1.5 `builder-hub`
   falló al crear el esquema (`Schema creation ... failed. undefined`) aunque el mismo `PUT` a mano
   devolvió 200. Los nombres de entidad no admiten guiones (`Invalid data entity name`). Se
   guardan las definiciones en `feedback-service/schemas/` y el comando va en el README. Nombre
   usado en el spike: `onewstore_feedback_service_spiketest` (esquema `0.0.1-devdiego`); el nombre
   definitivo de las entidades reales se fija en 2.2.
3. **Seguridad por diseño, no por permisos públicos (RF-14, AC-11):** el navegador solo llama a las
   rutas públicas del servicio; el servicio escribe con las credenciales de la app (política
   `ADMIN_DS`, que es general sobre Master Data y **no se puede limitar a una entidad**; riesgo
   aceptado, mitigado con superficie mínima del servicio). Sin campos públicos, una consulta o
   escritura directa anónima a Master Data se rechaza por construcción (**verificado en el spike**).
4. **Unicidad por pedido (RF-4):** el servicio busca un registro previo con ese número de pedido
   antes de crear y rechaza el segundo envío (lectura privada con las credenciales de la app). Es
   una comprobación, no una restricción de la base de datos: dos envíos simultáneos podrían pasar;
   se acepta y se documenta, a menos que 1.5 muestre un mecanismo atómico.
5. **Correo (RF-3, RF-8b, RF-15) — cambiado el 2026-11-16:** el correo es **siempre el que la persona
   escribe** (opcional). Con sesión, el servicio lee la sesión de la tienda con el cliente `Session` de
   `@vtex/api` y la cookie `vtex_session` (**verificado**) y `/_v/feedback/identity` devuelve el correo de
   la cuenta **solo a la propia sesión** para precargar el campo (`no-store`). **Se descartó leer el
   correo del pedido:** en `devdiego` OMS devuelve un alias `…@ct.vtex.com.br`, no el correo real, y leerlo
   exigió la política `AcessaTodosPedidos` (lectura y escritura de pedidos) tras un 403 con `OMSViewer`; la
   alternativa (leerlo de `CL`) se descartó por coste. Se retiraron esas políticas y el cliente. El
   servicio no registra correos en sus logs.
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

### Resultados del spike (tarea 1.5)

Probado el 2026-11-15/16 en `devdiego` con la app `onewstore.feedback-service@0.0.1` (carpeta `feedback-service/`, `vtex link`) y una entidad de prueba privada. Escritura con el servicio y lecturas anónimas desde el navegador y con curl; la prueba con cuenta la hizo Diego en su sesión.

| Pregunta | Resultado |
|---|---|
| (a) ¿Se instala y crea la entidad? | La app se instala con solo el builder `node`. **El builder `masterdata` falló** en `builder-hub` (`Schema creation ... failed. undefined`) aunque el esquema es válido (mismo `PUT` a mano: 200). Las entidades se crean a mano (decisión 2). `builder-hub` fuerza `@vtex/api` 7, TypeScript 5.5.3 y `@types/node` 20. El `tsconfig.json` no debe llevar `noEmit` |
| (b) ¿Responde la ruta pública a un anónimo desde la tienda? | **Sí**, 200. Origen ajeno o sin origen: **403** del servicio |
| (c) ¿Escribe el servicio y se rechaza el acceso directo? | **Sí.** Servicio: 200 con id de documento. Escritura directa anónima a la entidad: **403** `Cannot write in private fields`. Lectura directa anónima: **403** `Forbidden` |
| (d) ¿Qué política hace falta? | `ADMIN_DS` + `outbound-access` a `api.vtex.com` (`/api/*`) y a `portal.vtexcommercestable.com.br` (`/api/*`, host que usa el cliente `Session`). `ADMIN_DS` es general: no se puede limitar a una entidad |
| (e) ¿Correo del autenticado? | **Sí.** Anónimo: `{"authenticated":false,"maskedEmail":null}`. Con sesión de comprador: `{"authenticated":true,"maskedEmail":"d***@gmail.com"}`; el correo completo no llega al navegador. `ctx.clients.vtexId` no existe en `@vtex/api` 7: se usa `ctx.clients.session` |
| (f) ¿Correo de un pedido? | **Verificado y descartado (2026-11-16)**, con pedidos reales en `devdiego`: con `OMSViewer` da 403; con `AcessaTodosPedidos` lee, pero el correo es un alias `…@ct.vtex.com.br` y la respuesta fue intermitente. Ver decisión 5 |

**Hallazgos de operación (aplicables a las rutas reales):**
- **Caché del CDN:** una respuesta GET sin `Cache-Control` se sirvió desde la caché durante minutos (`age` > 200 s) con código antiguo. Todas las respuestas del servicio llevan `Cache-Control: no-store, no-cache, private` (importante: una ruta con datos de sesión no puede cachearse). Cambiar la ruta (`/session` → `/whoami`) fue la forma de saltarse una entrada ya cacheada.
- **Errores 5xx:** el CDN sustituye los 5xx por su página de error (se ve como un 404 de la tienda), lo que oculta el fallo real al navegador. Las rutas reales devolverán errores controlados con 4xx/200 más un código en el cuerpo, y los 5xx solo para fallos inesperados.
- **Query string:** las rutas del servicio no aceptan `?param` (devuelven la página 404 de la tienda); los datos van en el cuerpo POST o en la ruta.
- **Cookies sin sesión:** sin cookie `vtex_session` el servicio responde `authenticated:false` sin llamar a Janus.

Quedan en la entidad de prueba dos registros de prueba (ids `971dae76-…` y `c7393944-…`) para borrar desde el admin.

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

## Workspace de trabajo (cambio del 2026-11-16)

El workspace `devdiego`, donde se hicieron los spikes y casi todas las verificaciones de esta spec,
**se borró el 2026-11-16** y se sigue en `pruebatema`. Motivo: en `devdiego` el listado de carros
(`/carros/llantas-y-rines/llantas`) y la ficha de producto se resolvían como `store.home`, aunque el tema
era el mismo que en `pruebatema`, donde sí funcionan (`store.search#subcategory`, `store.product`).
Se descartaron, con pruebas, el botón del header, las interfaces nuevas, la confirmación del pedido, el
servicio enlazado, un build base roto, el service worker, las cachés y las cookies del dominio, y un
`vtex workspace reset`. **La causa no se identificó.** Las menciones a `devdiego` en esta spec y en las
tareas son registro de dónde se verificó cada cosa; no son instrucciones. Los datos de Master Data, los
pedidos y la condición de pago de prueba son de la cuenta y no se vieron afectados.

## Datos de prueba que se conservan (2026-11-16)

Tras las verificaciones se cancelaron los pedidos de prueba (`1676760500001`, `…03` y `1676780500005`) y se
borraron sus registros en `purchasefeedback` y `sitefeedback`. **Se conservan a propósito** la condición de
pago ID 17 y el proveedor `Promissory` (Notes Payable) de la cuenta: sirven para crear pedidos de prueba
en futuras specs. No son basura; no borrarlos sin preguntar. Cada pedido de prueba se cancela después.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La app de servicio es código nuevo que mantener, con permisos sobre Master Data | Superficie mínima: dos rutas, sin lectura; pruebas unitarias; política de Master Data limitada a las dos entidades si la plataforma lo permite |
| Rutas públicas abiertas a spam o abuso | Honeypot, límite por sesión/IP en el servidor, validación estricta, comprobación de origen (AC-13) |
| Exponer el correo del usuario | Solo se devuelve el de la cuenta, a la propia sesión y con `no-store`; el origen se comprueba; sin correos en logs (grupo 5). Ya no se lee ningún correo de pedidos |
| Un `orderGroup` conocido por un tercero permite calificar ese pedido | Riesgo bajo y aceptado: solo se puede crear una calificación (una por pedido) y no se ve ningún dato del pedido |
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
| Ubicación del servicio: **resuelta**, carpeta `feedback-service/` de este repo (2026-11-16). Queda confirmar quién lo mantiene (Diego, por defecto) | Grupo 2 | Equipo |
| Retención de datos y aviso de privacidad (001 D5) | Grupo 5 | Equipo / spec 001 |
| Nombres definitivos de las entidades y su límite de longitud | Tarea 2.2 | Spike 1.5 |
| ¿Se reutiliza el servicio para `/contact-us` (spec 004)? **Resuelta: sí** (2026-11-16); la 004 usará este servicio con su propia ruta y entidad | Spec 004 | — |
| ¿Ticket a VTEX por campos públicos (opción E)? | Opcional, sin dependencia | Diego |
