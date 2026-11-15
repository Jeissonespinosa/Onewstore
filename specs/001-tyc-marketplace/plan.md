# 001 — Plan técnico

> Derivado de `spec.md`. Lo observado en el repo va marcado **[Observado]**; lo que se asume y
> debe confirmarse en el spike (grupo 1) va marcado **[Asumido]**. Este plan no resuelve
> preguntas de negocio: las que bloquean quedan como placeholders (decisión 6).

## Context

- **[Observado]** El footer (`store/blocks/footer/footer.json`) tiene tres filas: redes
  sociales, `accepted-payment-methods` (Visa, MasterCard, Diners Club, **sin confirmar con
  Q3**) y un `rich-text#footer` con "© Repuestox". No hay enlaces legales.
- **[Observado]** `store/routes.json` mezcla rutas escritas a mano (`/about-us`, `/faq`,
  `/contact-us`, rutas de línea de productos) y rutas generadas. `gen-categorias.py` solo
  reemplaza las que cuelgan de `/carros`, `/motos` y `/herramientas`
  (`scripts/gen-categorias.py:821`), así que las rutas legales a mano no corren riesgo.
- **[Observado]** Las páginas a mano usan `store.custom#<nombre>` con `flex-layout` y
  `rich-text` (p. ej. `store/blocks/contact.jsonc`). `vtex.rich-text`, `vtex.store-link`,
  `vtex.flex-layout` y `vtex.condition-layout` ya están en `manifest.json`.
- **[Observado]** El manifest no declara el builder `checkout-ui-custom`. Sí tiene `docs`
  (`docs/contact-schema.json` es un esquema de Master Data). `store.orderplaced` ya incluye
  `op-order-seller`.
- **[Observado]** El PDP (`store/blocks/pdp/`) y los resúmenes de producto no tienen ningún
  bloque que muestre al seller.
- **[Observado]** Tests: `react/__tests__` (Jest, `jest.config.js`) y `scripts/tests`
  (`unittest`, incluye `test_store_blocks.py`). Python 3.13 está disponible en esta máquina.
- **[Asumido]** `rich-text#…` con la prop `text` es editable desde el Site Editor sin
  redeploy (RF-6). Hay que comprobarlo en el workspace.
- **[Asumido]** El checkout nativo de VTEX no ofrece un checkbox obligatorio de TyC y el
  builder `checkout-ui-custom` permite añadirlo con JS propio. Hay que comprobarlo.
- Dependencias de la spec: 004 (contacto) y 005 (Quiénes somos) **no están hechas**: sin
  ellas los textos no pueden enlazar un canal de atención ni una identidad real (Q5, Q1).

## Goals / Non-Goals

**Goals**
- D1 (informe de investigación) verificable y listo para revisión de un abogado.
- Páginas legales con URL propia, enlazadas desde el footer, con versión y fecha visibles y
  editables sin redeploy.
- Checkbox de aceptación en el checkout y registro de la aceptación con versión y fecha.
- Seller visible en PDP y checkout.
- Una comprobación automática (AC-7) que impida publicar con placeholders o con "Onewstore".

**Non-Goals**
- Asesoría legal: el texto final lo valida un abogado y esa revisión no se puede simular.
- Resolver Q3, Q4, Q5, Q6 o la fecha del marketplace: se dejan como placeholders.
- Aceptación de TyC en el **registro** de `vtex.login` (RF-2 dice "registro/checkout"): ver
  pregunta abierta A.
- Custodia o consulta de los registros por una interfaz propia: el AC-3 pide "consultable",
  no un panel.
- Publicar en producción (no existe tienda en producción; spec 000 §7).

## Decisions

1. **Páginas legales como `store.custom#legal-*` con `rich-text`.** Un archivo por
   documento en `store/blocks/legal/` y las rutas a mano en `store/routes.json`. Es lo que ya
   hacen `/about-us` y `/contact-us`, usa solo apps oficiales (constitución #1) y deja el texto
   editable en el Site Editor (RF-6, a confirmar en el spike). *Alternativa:* componente React
   que renderice Markdown; se descarta porque exige redeploy para cambiar el texto y añade
   código que mantener. *Alternativa:* páginas de contenido gestionadas por un CMS externo;
   se descarta, no hay uno en el proyecto.

2. **Dónde vive el texto.** Los borradores para el abogado se escriben en Markdown en
   `specs/001-tyc-marketplace/borradores/Dn-<slug>.md` (se revisan con diff y sin ruido de
   JSON). Al aprobarlos se pasan al `text` del `rich-text` del bloque. El bloque es la fuente
   de lo publicado; el borrador, la de lo revisado. *Riesgo:* que diverjan (ver Riesgos).

3. **Versión y fecha (RF-4)** como primera línea de cada documento:
   `Versión AAAA.MM.DD · Actualizado: AAAA-MM-DD`. La versión es la fecha de la última
   revisión aprobada. Es un texto, no un campo: lo verifica `check-legal.py` (decisión 5).

4. **Footer.** Nueva fila `flex-layout.row#footer-legal` entre pagos y créditos, con los
   enlaces como Markdown de un único `rich-text` (un solo bloque en vez de cinco). Estilos en
   `styles/css/vtex.store-footer.css`. Sin estilos inline (constitución #4).

5. **Comprobación automática de AC-7 y RF-4: `scripts/check-legal.py`.** Lee `store/blocks/legal/*`
   y `store/routes.json` y reporta: placeholders presentes (`[RAZÓN SOCIAL]`, `[NIT]` y los
   de la decisión 6), menciones de "Onewstore" (sin distinguir mayúsculas), documentos sin
   línea de versión, y rutas legales sin bloque o bloques sin ruta. Por defecto **informa** y
   sale con 0; con `--prod` sale con 1 si hay algo. Tests en `scripts/tests/test_check_legal.py`.
   Es la prueba que se ejecuta antes de publicar. *Alternativa:* una prueba dentro de
   `test_store_blocks.py`; se descarta porque en desarrollo los placeholders son **esperados**
   y esa suite fallaría siempre.

6. **Placeholders** (RF-8): mismo formato `[MAYÚSCULAS]` para que una sola búsqueda los halle.

   | Placeholder | Pregunta que lo bloquea | Documentos |
   |---|---|---|
   | `[RAZÓN SOCIAL]`, `[NIT]` | Q1 | D2-D6 |
   | `[DOMICILIO]` | Q1 | D2, D5 |
   | `[CANAL DE ATENCIÓN]` | Q5 (y 004) | D2, D3, D5, D6 |
   | `[PASARELA DE PAGO]`, `[COMISIÓN]` | Q3 | D3, D4 |
   | `[QUIÉN ENVÍA]`, `[TRANSPORTADORA]` | Q4 | D3, D6 |
   | `[A CONFIRMAR POR ABOGADO]` | Q6 y puntos de la spec §9 | cualquiera |

   `check-legal.py` busca esta lista y la imprime con conteos: así se ve cuánto falta.

7. **Aceptación en checkout: `checkout-ui-custom` con registro por `customData` del
   `orderForm`** **[Asumido, a decidir en el spike]**. El checkbox (no premarcado, con enlaces a
   D2, D3 y D5) bloquea el botón de pago hasta marcarse, y al marcar escribe
   `customData` (`{ version, aceptadoEn }`) en el `orderForm`: el dato viaja con el pedido y
   queda consultable en el admin y por la API de pedidos, sin tablas propias ni datos extra
   (constitución #6). *Alternativa:* entidad de Master Data (`docs/`) con usuario, versión y
   fecha: más fácil de consultar en bloque, pero crea una colección de datos personales con
   su propio ciclo de vida. Se elige según el spike y se anota aquí. **Límite conocido:** el
   bloqueo está del lado del navegador; no impide pagar llamando directo a la API. Se
   documenta aquí y en el informe al abogado (RF-7).

8. **Se pide aceptar en cada compra (no se recuerda la aceptación).** Con el checkbox
   desmarcado siempre, el `AC-4` (nueva versión → se vuelve a pedir) se cumple sin leer
   datos del usuario ni comparar versiones. Costo: un clic por compra. Lo confirma el
   abogado (pregunta B).

9. **Código propio con tests.** La lógica del checkbox (versión actual, forma del registro,
   habilitar/deshabilitar el pago) va en un módulo puro, sin DOM, para probarla con Jest
   (constitución #2). El archivo de `checkout-ui-custom` solo lo conecta con la página.

10. **Seller visible (RF-5).** Primero se busca un bloque nativo o un campo de
    `vtex.product-summary` / `vtex.store-components` que muestre el seller (spike). Si no
    existe, componente React mínimo con test en `react/__tests__`. En checkout, lo que
    entregue el `orderForm` por ítem. "Quién envía" depende de Q4: texto con
    `[QUIÉN ENVÍA]` hasta que se responda.

11. **D7 (política de reseñas) se difiere** *(propuesta de cambio a la spec, pregunta C)*.
    La spec 002 pasó a feedback privado y las reseñas públicas salieron del alcance
    (spec 000 §11). Una política de moderación de reseñas que no existen sería un texto
    sin objeto y con riesgo de prometer algo falso. Se propone: D7 queda como **entregable
    futuro**, `RF-1`/`AC-1` pasan de 6 a 5 páginas (D2-D6), y el aviso de privacidad (D5)
    cubre el feedback privado de la 002.

12. **Logo del checkout (RF-7).** El hallazgo "checkout genérico: sin logo" también lo cubre
    la spec 006. Para no duplicar, aquí solo se añade el checkbox; el logo se aporta si la
    006 no se hizo antes (pregunta D).

## Risks / Trade-offs

- **Revisión legal inalcanzable en este plan** (Q6 abierta): los grupos 4-6 producen
  *borradores*, no documentos publicables. Mitigación: `check-legal.py --prod` bloquea la
  publicación y la tarea 8.1 queda sin marcar hasta que exista la evidencia del abogado.
- **El checkout no admite el bloqueo o el builder** → el spike lo detecta antes de gastar
  trabajo; alternativa: aceptación como texto informativo bajo el botón + registro al
  confirmar, documentado como limitación en D1.
- **Citas legales inexactas.** Las referencias de la spec son punto de partida. Se
  verifican contra el texto vigente (SUIN-Juriscol, Secretaría del Senado, SIC, EUR-Lex) y
  se anota la URL y la fecha de consulta; una cita sin verificar se marca como tal.
- **Divergencia borrador ↔ bloque** → el grupo 4 incluye una tarea de comparación al
  cerrar cada documento; el bloque es lo publicado.
- **Datos personales en el registro** → solo versión y fecha dentro del `orderForm` (ya
  contiene el correo del comprador); sin IP ni agente de usuario salvo que el abogado lo pida.
- **Texto largo en un solo `rich-text`** → difícil de editar en el Site Editor. El spike
  mide la legibilidad; si es mala, se parte cada documento en un `rich-text` por sección.
- **Prometer lo que no existe.** Los textos hablan de envíos, pagos y sellers que hoy no
  operan (spec 000 §7). Mitigación: placeholders y una revisión del abogado antes de
  publicar.

## Migration Plan

1. Rama `feat/001-tyc-marketplace` desde `release` (hecho) y workspace propio
   (`vtex use <nombre>` + `vtex link`); sin sesión de pago ni publicación.
2. Spike (grupo 1) y decisiones 7 y 10 anotadas aquí antes de construir.
3. D1 y borradores en `specs/`; páginas y footer en el theme; checkout al final.
4. `python scripts/check-legal.py --prod` debe pasar **antes** de cualquier `vtex publish`.
   Hoy no puede pasar: faltan Q1, Q3, Q4, Q5 y la revisión del abogado.
5. **Reversión:** quitar `flex-layout.row#footer-legal` del footer, las rutas legales de
   `routes.json` y, si se instaló, el builder `checkout-ui-custom` (sin él el checkout
   vuelve al nativo). Los `customData` ya escritos quedan en los pedidos; no hay nada que
   migrar.

## Open Questions

Deferibles (no bloquean empezar; se resuelven antes de la tarea indicada):

- **A.** ¿Se exige aceptación también en el **registro** (`vtex.login`)? El login lo gestiona
  VTEX y personalizarlo es otro trabajo. Propuesta: solo checkout en esta spec. *Antes de la 7.1.*
- **B.** ¿El abogado acepta "se pide en cada compra" (decisión 8) y un registro solo con
  versión y fecha dentro del pedido (decisión 7)? *Antes de cerrar el grupo 7.*
- **C.** ¿Se difiere D7 y se ajustan `RF-1`/`AC-1` a 5 páginas (decisión 11)? Requiere cambio
  en `spec.md`; no se hace sin tu aprobación. *Antes del grupo 4.*
- **D.** ¿El logo del checkout lo pone la 006 o esta spec (decisión 12)? *Antes de la 7.1.*
- **E.** ¿Compradores empresariales: texto aparte o el mismo régimen? Lo define el abogado;
  mientras tanto, `[A CONFIRMAR POR ABOGADO]` en D3 y D6.

Bloqueantes de negocio ya conocidas (siguen abiertas en la spec 000): **Q1** (razón social,
NIT, domicilio), **Q3** (pasarela, comisiones), **Q4** (quién envía), **Q5** (canal de atención),
**Q6** (abogado y plazo). Ninguna se supone: producen placeholders.
