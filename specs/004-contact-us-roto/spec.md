# 004 — Formulario de contacto roto (`/contact-us`)

- **Estado:** casi done (falta AC-3 y AC-4)
- **Responsable:** Por asignar
- **Rama:** `feat/motorizacion` (se hizo aquí)
- **Depende de:** 000 (hallazgo #2)

## 1. Contexto y problema
En el workspace `devwilbis` (2026-11-12) `/contact-us` muestra "Error al cargar el formulario".
Es el único canal de atención visible (CU-9) y también el CTA "¿No encuentras el repuesto?
Escríbenos". El repo tiene `docs/contact-schema.json` y `store/blocks/contact.jsonc`.
**La causa no se ha investigado**; la hipótesis (sin confirmar) es que la entidad de Master Data
con ese schema no existe en la cuenta o el workspace.

## 2. Objetivos / No-objetivos
**Objetivos**
- Diagnosticar la causa raíz y dejar el formulario operativo.
- Que los mensajes lleguen a alguien (canal y responsable definidos).

**No-objetivos**
- No se rediseña la página; no se añaden chat ni WhatsApp (spec futura).

## 3. Requisitos funcionales
- `RF-1` El formulario carga sin error para un visitante anónimo.
- `RF-2` Al enviar, el mensaje se guarda en Master Data y el usuario ve confirmación.
- `RF-3` Un responsable recibe aviso (correo o revisión periódica de la entidad).
- `RF-4` El CTA "Escríbenos y lo conseguimos" lleva a este formulario.
- `RF-5` Validación de campos y protección básica antispam.

## 4. Criterios de aceptación
- `AC-1` `/contact-us` carga el formulario sin errores en consola.
- `AC-2` Un envío de prueba aparece en Master Data.
- `AC-3` El responsable confirma haber recibido el mensaje de prueba.
- `AC-4` Se repite la comprobación en producción y se anota la fecha.

## 5. Preguntas abiertas
- [x] ¿Qué dice la consola/red al cargar el formulario? → **Resuelta (2026-11-27).** No era la
  consola: `GET /api/dataentities/contact/schemas` devolvía `[]`. `vtex.store-form` dibuja los
  campos a partir del JSON Schema; sin schema no hay nada que dibujar y el bloque falla.
- [x] ¿Existe la entidad y el schema en la cuenta `onewstore`? → **Resuelta (2026-11-27).** La
  entidad `contact` **sí** existe (una búsqueda devuelve `[]`, no 404); el schema `site-contact`
  **no** existía. Se creó con `docs/contact-schema.json` (nombre, correo, teléfono, vehículo,
  mensaje). En **producción está sin verificar**.
- [ ] ¿Quién atiende y por qué canal? (spec 000 §10, Q5) → **parcial (2026-11-27).** Confirmado
  el **horario: 8:00 a.m. a 6:00 p.m.** (faltan los días de la semana), y ya se publica en
  `/contacto`. Siguen sin definir el **correo**, el **número** y **quién lee los mensajes**:
  hoy quedan en Master Data y nadie está asignado. Esos tres campos están vacíos y no se
  pintan hasta que existan.
- [ ] ¿Hay datos personales en el formulario? → **sí**: nombre, correo, teléfono. Falta enlazar
  la política de privacidad (spec 001 D5) cuando exista. El negocio confirmó el 2026-11-27 que
  **un abogado está redactando las políticas** y que avisará para subirlas.

## 6. Hallazgo nuevo: VTEX bloqueó los campos públicos de Master Data
El schema se creó **sin `publicWrite`**. VTEX bloqueó temporalmente la creación de campos
públicos nuevos (nota de release del 2026-10-23) y el `PUT` con `publicWrite` devuelve
`422 BlockedRules`. Consecuencias comprobadas el 2026-11-27:

- Un `POST` directo a `/api/dataentities/contact/documents` **sin cookie** responde
  `403 Cannot write in private fields`.
- El formulario **sí** envía: la app `vtex.store-form` no usa ese camino. El envío de prueba
  quedó guardado (id `99e81589-eb29-4612-8fcd-e04de0fa9afc`, marcado "Se puede borrar").

Queda por comprobar en producción con un visitante anónimo (AC-4): el workspace `devwilbis`
exige login, así que ahí no se puede probar de verdad.

## 7. Estado de los criterios
- `AC-1` El formulario carga sin errores — **cumplido** (2026-11-27, devwilbis).
- `AC-2` Un envío de prueba aparece en Master Data — **cumplido** (ver id arriba).
- `AC-3` El responsable confirma haberlo recibido — **pendiente**: no hay responsable (Q5).
- `AC-4` Repetir en producción y anotar la fecha — **pendiente**.
