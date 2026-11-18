# 001 — Pendientes y prerrequisitos

- **Pausada el:** 2026-11-15. **Reanudada el 2026-11-17** (los prerrequisitos P1 a P3 se resuelven ahora con el grupo 1; Q1, Q3-Q6 siguen abiertas).
- **Actualización 2026-11-17:** el workspace de trabajo es **`pruebatema`**; `devdiego` se borró el 2026-11-16. La spec 002 se fusionó en esta rama y **ya no depende de la 004**; la 001 sí sigue necesitando la 004 (canal de atención) y la 005 (identidad).
- **Motivo:** el spike del grupo 1 necesita un `vtex link` que sirva los cambios y acceso al admin de VTEX, y los grupos 4-8 dependen de decisiones de negocio y de un abogado que aún no existen.
- **Pausada de nuevo el 2026-11-18.** Hechos: grupos 2, 3, 4, 5, 6, 7.1 y la parte del PDP de 7.4 (rama `feat/001-tyc-marketplace`). Los cinco textos legales existen como borrador, con placeholders.
- **Qué la bloquea:**
  1. **Tarea 1.1 (checkout):** el admin de VTEX muestra «bloqueado por facturas impagas». Sin él no se pueden hacer 1.1, 7.2, 7.3, 7.5 ni la parte de checkout de 7.4.
  2. **Grupo 8:** abogado (Q6) y datos de negocio Q1 (razón social, NIT, domicilio), Q3 (comisión y pasarela), Q4 (transportadora y plazos) y Q5 (canal de atención).
  3. **Jest** no corre en el equipo de Diego: falta correr `yarn jest` en un entorno con dependencias (los tests de `AceptacionTyc` solo se verificaron con un ejecutor mínimo).
- **Para el abogado (fuentes colombianas):** el 2026-11-18 se leyó la Ley 1480 completa en Función Pública (arts. 5, 47, 50, 51 y 53; ver `research.md`, «Verificación»). El Decreto 587 de 2016 también se leyó (15 días hábiles de la reversión confirmados). Los arts. 7-11 y 16 (garantía) también se leyeron. El criterio de la SIC sobre «portales de contacto» (Concepto 22-51097) también se leyó: Repuestox, que cobra comisión, es portal de comercio electrónico y responde ante el consumidor (art. 50); Diego fijó el 2026-11-18 la alternativa 1 (Repuestox es la contraparte del comprador); el abogado la puede revisar. La sanción a MercadoLibre (Res. 55912/2016) y la guía de comercio electrónico de la SIC (2022) también se leyeron; de la guía queda por decidir si se crean el formulario de reversión y la constancia de queja (D6 §3). Siguen sin leerse: el RNBD y la Ley 527 de 1999. La lista de enlaces está en `research.md` («Fuentes»).
- **Cómo reanudar:** resuelto el bloqueo del admin, ejecuta `/implementar-spec 001`; retomará la 1.1. `vtex link` en `pruebatema`.

Quién: **Diego** (responsable de la spec y del workspace), **Equipo** (decisiones de negocio), **Abogado** (aún sin asignar, Q6).

---

## A. Prerrequisitos técnicos para reanudar (bloquean el grupo 1)

### P1. Reiniciar `vtex link` — Diego *(hecho el 2026-11-17: `/legal-prueba` se sirvió tras reiniciar; hay que repetirlo al añadir páginas o carpetas nuevas)*
- **Por qué:** `vtex link` (iniciado a las 10:07, antes de cambiar de rama) no sirvió una ruta nueva ni una carpeta nueva: `/legal-prueba` (en el `devdiego` de entonces) respondió "No encontramos ningún resultado" tras esperar y recargar. El README ya advierte que hay que reiniciarlo cuando se añaden archivos.
- **Cómo:**
  1. Detén el `vtex link` actual (Ctrl+C en su terminal).
  2. `cd D:\repos\vtex\Repuestox` y confirma `git branch --show-current` → `feat/001-tyc-marketplace`.
  3. `vtex use pruebatema` y `vtex link`.
  4. Espera "App linked" y abre `https://pruebatema--onewstore.myvtex.com/`.
- **Listo cuando:** el sitio carga con el link nuevo. Avísame y repito la prueba de `/legal-prueba`.
- **Desbloquea:** tareas 1.2 y 1.3 (y 7.x más adelante).

### P2. Revisar el checkout en el admin de VTEX — Diego o el equipo
- **Por qué (tarea 1.1):** hay que saber si VTEX ofrece un campo nativo de TyC y cómo se personaliza el checkout. Hallazgo preliminar de documentación, **sin verificar**: la app `vtex.checkout-ui-custom` figura sin mantenimiento desde jun-2023 y la vía vigente son los archivos `checkout6-custom.js` y `.css`, que VTEX no soporta oficialmente. Esto cuestiona la decisión 7 del plan.
- **Cómo (las rutas del menú son aproximadas; confírmalas):**
  1. Entra al admin de `onewstore` en el workspace `pruebatema` (`https://pruebatema--onewstore.myvtex.com/admin`).
  2. Busca en la configuración del checkout (Configuración de la tienda → Checkout) cualquier opción de **términos y condiciones / términos de uso** y anota si existe.
  3. En la misma sección, busca la pestaña de **código** o de archivos personalizados (`checkout6-custom.js`, `checkout6-custom.css`) y anota si existe y si hoy tiene contenido.
  4. No guardes ni publiques nada. Toma capturas.
- **Bloqueo hallado el 2026-11-17:** al abrir *Store Settings → Storefront → Checkout* en `pruebatema`, el admin muestra "Your admin has been blocked due to unpaid invoices" (en rojo, con enlace "For more information"). No se abrió el enlace ni se tocó nada. **Hay que resolver esto primero** (facturación de la cuenta `onewstore` con VTEX) o la configuración del checkout no se puede revisar. No se probó si el bloqueo afecta a otras secciones del admin ni al sitio (el Site Editor y el sitio sí cargaron).
- **Entrega:** cuéntame (o pega las capturas) qué ves en cada punto; yo registro la tabla "capacidad → nativo / personalizado / no posible" en `plan.md`.
- **Desbloquea:** tarea 1.1 y la decisión 7 del plan; después, el grupo 7.

### P3. Responder las preguntas A, B, C y D de `plan.md` — Diego *(resuelto el 2026-11-17: A sí, B sí, C diferir D7, D logo en la spec 006)*
Aprobaste el plan, pero no respondiste estas cuatro. Responde cada una con sí o no (y la alternativa si es no):

| # | Pregunta | Recomendación del plan |
|---|---|---|
| A | ¿La aceptación de TyC va **solo en el checkout** y no en el registro de `vtex.login`? | Sí, solo checkout |
| B | ¿Se pide aceptar **en cada compra** y se registra solo versión y fecha dentro del pedido? (se confirma además con el abogado) | Sí |
| C | ¿Se **difiere D7** (política de reseñas) y `RF-1` y `AC-1` pasan de 6 a 5 páginas? Exige cambiar `spec.md` | Sí, diferir |
| D | ¿El **logo del checkout** lo pone la spec 006 o esta spec? | La 006 |

- **Desbloquea:** tarea 1.4 y los grupos 4 y 7.

### P4. Qué haré yo cuando P1 y P2 estén listos (no requiere nada de ti)
- 1.2: crear de nuevo la página de prueba larga, medir edición en el Site Editor (o pedirte que la edites si no tengo acceso), Markdown renderizado y lectura a 360 px, y retirarla.
- 1.3: añadir `product-seller-name` (`vtex.product-price`) al PDP en el workspace y comprobar que muestra al seller; si no existe o no sirve, decidir componente propio.
- Actualizar `plan.md` con las tres tablas y marcar las tareas.

---

## B. Prerrequisitos de negocio y legales (bloquean los grupos 4-8 de forma parcial)

El plan **no supone** ninguna de estas respuestas: cada una deja un placeholder en los textos (decisión 6 del plan). Pueden responderse después del spike, pero **sin ellas no se puede publicar** (`check-legal.py --prod`, AC-7).

| ID | Pendiente | Quién | Cómo completarlo | Placeholder que cierra | Bloquea |
|---|---|---|---|---|---|
| Q1 | Razón social, NIT y domicilio | Equipo | Constituir o asignar la entidad que opera Repuestox; anotar los tres datos en la spec 000 (Q1). Pedir a VTEX el cambio del nombre de la cuenta "Onewstore". | `[RAZÓN SOCIAL]`, `[NIT]`, `[DOMICILIO]` | AC-7; D2 a D6 |
| Q3 | **Parcial (2026-11-17).** Respondido: liquidación **manual por entrega realizada**; pasarela preferida **Wompi** (luego Addi y Sistecrédito). **Falta:** % de comisión, plazo de liquidación y confirmar el contrato con Wompi y sus medios. | Equipo | Anotar el % y el plazo en la spec 000 (Q3); confirmar Wompi. | `[COMISIÓN]`, `[PASARELA DE PAGO]` (este último hasta confirmar Wompi) | D3, D4 |
| Q4 | **Parcial (2026-11-17).** Respondido: **envía Repuestox** y busca ser operador logístico; **no hay transportadora** (posible aliada vía contrato con Envía, en conversación). **Falta:** transportadora, tarifas, plazos y cobertura. **Para el abogado:** si Repuestox envía y liquida por entrega, ¿sigue siendo «solo intermediario»? | Equipo / Abogado | Anotar transportadora y plazos cuando existan; añadir la pregunta a la lista de la tarea 2.3. | `[TRANSPORTADORA]` (`[QUIÉN ENVÍA]` ya se puede llenar con «Repuestox») | D3, D6; RF-5 |
| Q5 | **Parcial (2026-11-17).** Respondido: **los tres canales** (WhatsApp, correo y teléfono). **Falta:** responsable y datos de contacto (número, correo, teléfono); la spec 004 arregla `/contact-us`. | Equipo | Aportar los tres datos y el responsable. | `[CANAL DE ATENCIÓN]` | D2, D3, D5, D6 |
| Q6 | Abogado revisor y plazo | Equipo | Contratar o asignar un abogado colombiano de derecho comercial y de consumo; acordar plazo y entregar `research.md` y los borradores. | `[A CONFIRMAR POR ABOGADO]` | AC-5; tarea 8.1 |
| E | Comprador empresarial (talleres y flotas) frente al régimen de consumidor | Abogado | Incluir la pregunta en la lista de la tarea 2.3. | `[A CONFIRMAR POR ABOGADO]` | D3, D6 |
| Q2 | Fecha del marketplace con sellers terceros y destino del seller de prueba `Repuestox` (id 1) | Equipo | Definir fecha estimada y si el seller de prueba se retira en producción. | — | Tono de D4; no bloquea el borrador |
| 004, 005 | Specs de contacto y "Quiénes somos" sin hacer | Por asignar | Implementarlas (ver sus specs); aportan canal de atención e identidad para el aviso legal. | — | Publicación de D2 y D5 |

---

## C. Trabajo que no puede avanzar hasta reanudar (sin cambios respecto de `tasks.md`)

| Grupo | Qué falta | Depende de |
|---|---|---|
| 1 Spike | 1.1, 1.2, 1.3, 1.4 | P1, P2, P3 |
| 2 D1 investigación | `research.md` (matriz UE → Colombia). **No depende de Q1-Q5**: puede hacerse en cuanto se reanude, sin esperar el spike. | — |
| 3 `check-legal.py` | Script y tests. Tampoco depende de nada de negocio. | — |
| 4 a 6 | Estructura de páginas, footer, D2 a D6 | Spike (1.2); P3 (C); placeholders de la sección B |
| 7 Checkout y seller | Checkbox, registro, seller visible | Spike (1.1, 1.3); P3 (A, B, D) |
| 8 Revisión y cierre | Revisión legal, `--prod`, estados | Q1, Q3, Q4, Q5, Q6 |

**Sugerencia:** si quieres avanzar en la pausa sin esperar a P1 y P2, los grupos 2 y 3 son independientes (D1 y el comprobador). Es una decisión tuya: la spec queda en pausa y no los empiezo sin que lo pidas.

---

## D. Verificación y evidencia que quedará por parte del equipo

- `AC-2` y `AC-3` en un checkout real (autenticado o con pago): solo el equipo, con datos ficticios.
- `AC-5`: evidencia de la revisión del abogado en el PR.
- `AC-7`: `python scripts/check-legal.py --prod` con salida 0, tras cerrar Q1, Q3, Q4 y Q5.
