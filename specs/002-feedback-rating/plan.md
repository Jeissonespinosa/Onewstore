# 002 — Plan técnico

> Derivado de `spec.md` (estado `draft`). Aprobar este plan **no** cierra las preguntas abiertas de
> negocio de la spec §8: se resuelven antes del grupo que las necesita (ver "Preguntas abiertas
> deferrables"). Lo marcado *[asumido]* no se ha verificado.

## Contexto

- Hay dos entregables: (A) rating de 5 estrellas + comentario en `store.orderplaced`, (B) botón
  flotante global que abre un formulario en modal. Ambos guardan en Master Data y son privados.
- Observado en el repo:
  - `store/blocks/orderplaced.jsonc` define `order-placed` con bloques `op-*` de `vtex.order-placed`;
    no declara header ni footer de la tienda *[asumido: se comprueba en el spike]*.
  - `store/blocks/contact.jsonc` + `docs/contact-schema.json` usan `vtex.store-form` (`form#`,
    `form-input.*`, `form-submit`) con `entity: "contact"` y `schema: "site-contact"`. Ese formulario
    hoy falla ("Error al cargar el formulario", spec 004; causa no investigada).
  - `vtex.store-form`, `vtex.modal-layout` y `vtex.order-placed` ya están en `manifest.json`.
  - `react/` tiene componentes propios con tests (`CategoryMenu`, selectores) y usa CSS Modules
    (excepción de la spec 003, decisión 9).
- No observado, a resolver en el spike: si `store-form` ofrece estrellas, cómo se lee el correo de
  la sesión y del pedido, y dónde se monta un bloque que aparezca en todas las páginas.

## Objetivos / No-objetivos

**Objetivos:** los de la spec §2 (rating de compra, feedback del sitio, lectura en el admin).
**No-objetivos:** reseñas públicas, moderación, responder al usuario, encuestas por correo (spec §2 y §9).

## Decisiones

1. **Opción A de la spec (recomendada):** `vtex.store-form` + Master Data v2 + un componente React
   mínimo solo para lo que `store-form` no cubra (estrellas, y quizá el disparador flotante).
   *Alternativas:* B `vtex.reviews-and-ratings` (pensada para reseñas públicas de producto, no
   encaja); C servicio externo (datos personales fuera de VTEX, dependencia externa). Se confirma
   o se cambia con el resultado del spike.
2. **Dos entidades de Master Data separadas** (`purchase-feedback`, `site-feedback`; nombres a
   confirmar): campos y ciclo de vida distintos, y cada esquema pide solo lo necesario
   (constitución #6).
3. **Esquema público de solo escritura** (`v-security` en el JSON Schema, sin lectura para el rol
   público). Es el requisito más delicado (RF-14, AC-11): se comprueba con una consulta anónima
   real, no solo leyendo el esquema.
4. **Unicidad por pedido (RF-4):** *[asumido]* se intenta con el número de pedido como campo único
   en la entidad; si Master Data v2 no lo permite, se bloquea el reenvío en el cliente y se
   documenta como límite conocido. Se decide tras el spike.
5. **Correo (RF-3, RF-8b):** se resuelve en el cliente leyendo el perfil de la sesión y el pedido
   solo dentro de la página del propio usuario; nunca por URL. Si el spike muestra que esto expone
   el correo a terceros, se reconsidera (p. ej. que lo escriba el usuario).
6. **Botón flotante y modal:** `vtex.modal-layout` con disparador fijo por CSS *[asumido]*, con el
   formulario cargado al abrir (rendimiento, spec §5). Si no hay un lugar común a todas las
   páginas, se monta en el header y se añade también en `orderplaced.jsonc` (RF-8c).
7. **Estilos:** tokens en `styles/configs/style.json`; si hay componente React propio, CSS Module
   (misma excepción que la spec 003). Sin estilos inline.
8. **Antispam:** honeypot + límite de envíos por sesión en el cliente. Es mitigación, no garantía.

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

**Consecuencia para la decisión 1:** la opción A puede usar `store-form` solo en parte. Como faltan las estrellas y los valores dinámicos, es probable que ambos formularios (rating y botón flotante) se hagan con un componente React propio que escriba en Master Data, y no con `store-form`. Se confirma tras 1.2 y 1.3; hasta entonces la decisión 1 sigue abierta.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La infraestructura de formularios sigue rota (spec 004) | El spike diagnostica Master Data en el workspace; se coordina con la 004 en vez de duplicar |
| El esquema queda legible públicamente | Consulta anónima (AC-11) antes de dar por buena la entidad |
| Exponer el correo del usuario | Decisión 5; revisión en el grupo 5 |
| El botón tapa el minicart u otros flotantes (015 WhatsApp) | Esquina definida con el equipo; prueba a 360 px (AC-12) |
| Empeora LCP/CLS | Carga diferida del modal; Lighthouse contra línea base |

## Reversión

Todo es aditivo: quitar los bloques de `header.jsonc`/`orderplaced.jsonc`, el componente y las
entidades (los datos ya recogidos se conservan o se borran según la política de retención). Sin
migraciones sobre datos existentes.

## Preguntas abiertas deferrables

| Pregunta | Se necesita antes de | Responde |
|---|---|---|
| Q11: quién lee el feedback y cómo se entera (¿aviso por correo?) | Grupo 6 | Equipo |
| Esquina y texto del botón; otros flotantes previstos | Grupo 4 | Equipo |
| ¿La entidad existe o se crea? | Grupo 2 | Spike (grupo 1) + spec 004 |
| Retención de datos y aviso de privacidad (001 D5) | Grupo 5 | Equipo / spec 001 |
| ¿Cómo se lee el correo sin exponerlo? | Grupo 3 | Spike (grupo 1) |
