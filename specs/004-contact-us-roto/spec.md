# 004 — Formulario de contacto roto (`/contact-us`)

- **Estado:** draft
- **Responsable:** Por asignar
- **Rama:** `fix/004-contact-us`
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
- [ ] ¿Qué dice la consola/red al cargar el formulario? (primer paso del diagnóstico)
- [ ] ¿Existe la entidad y el schema en la cuenta `onewstore`? ¿También en producción?
- [ ] ¿Quién atiende y por qué canal? (spec 000 §10)
- [ ] ¿Hay datos personales en el formulario? Si sí, enlazar política de privacidad (spec 001).
