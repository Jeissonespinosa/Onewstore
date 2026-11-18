# 001 — D1: Informe de investigación (UE → Colombia)

- **Fecha de consulta:** 2026-11-17
- **Estado:** borrador **pendiente de revisión de un abogado colombiano** (Q6 abierta). No es asesoría legal (spec 001, no-objetivos).
- **Cómo leerlo:** la norma vinculante es la colombiana; la europea es solo referencia de buenas prácticas.

## Etiquetas de verificación

| Etiqueta | Significa |
|---|---|
| **[VERIFICADO]** | Leído en el texto oficial (EUR-Lex) por la herramienta de lectura. |
| **[EXTRACTO]** | Resumen obtenido de un buscador o de una extracción automática que **no** devolvió el texto completo. Plausible, pero hay que confirmarlo contra el texto vigente antes de citarlo. |
| **[SIN VERIFICAR]** | No se pudo leer en ninguna fuente en esta sesión. Está aquí solo como punto de partida y **no debe citarse**. |

**Límite importante de esta investigación:** los sitios oficiales colombianos (Secretaría del Senado, SUIN-Juriscol, SIC, Función Pública) **no se pudieron abrir** con la herramienta de lectura (errores de conexión y de certificado) ni con el navegador. Las citas colombianas vienen de **extractos de resultados de búsqueda sobre esos dominios** y por eso son **[EXTRACTO]** o **[SIN VERIFICAR]**; ninguna es lectura directa del texto vigente. Hay normas modificadas recientemente (la Ley 2439 de 2024 aparece tocando los arts. 50 y 51 de la Ley 1480) y no se pudo comprobar qué cambió. **Primer encargo para el abogado: confirmar cada artículo contra el texto vigente.** Los resúmenes están redactados con palabras propias.

---

## 1. Matriz (spec §4)

### Fila 1 — Transparencia del marketplace e identidad del vendedor

- **UE.** DSA (Reg. 2022/2065), art. 30 «trazabilidad de los comerciantes»: la plataforma debe obtener, antes de que el comerciante opere, sus datos de contacto, identificación, cuenta de pago, registro mercantil y una autocertificación; verificar su fiabilidad con esfuerzo razonable, suspender a quien no cumpla y conservar los datos seis meses tras terminar la relación. **[VERIFICADO]** Art. 31 «cumplimiento desde el diseño» y art. 32 «derecho a la información» (avisar a quien compró un producto ilegal en los últimos seis meses). **[VERIFICADO]** Los arts. 30-32 no se aplican a plataformas cuyos comerciantes sean micro o pequeñas empresas, salvo plataformas muy grandes (art. 29). **[VERIFICADO]** Directiva 2011/83/UE, art. 6a (añadido por la Directiva 2019/2161): antes de que el consumidor quede obligado, informar si el tercero es comerciante y cómo se reparten las obligaciones. **[EXTRACTO]**
- **Colombia.** Ley 1480 de 2011, art. 53: quien ofrezca una plataforma donde terceros venden debe exigir identificación a todos los oferentes y llevar un registro con nombre o razón social, documento, dirección de notificación y teléfonos. **[EXTRACTO]** Art. 50: obligaciones del comercio electrónico, entre ellas canales accesibles para orientar al consumidor y dar trazabilidad a sus reclamaciones (literal g, modificado por la Ley 2439 de 2024). **[EXTRACTO]** Art. 23 (información mínima al consumidor). **[SIN VERIFICAR]**
- **Cómo se cumple en Repuestox.** RF-5 (seller visible en PDP y checkout: `product-seller-name`, spike 1.3) y D2/D3 identifican al seller y a Repuestox con `[RAZÓN SOCIAL]`/`[NIT]`. D4 obliga a cada seller a entregar los datos de identificación y Repuestox los conserva (registro de sellers fuera del theme: **gap**, ver §3).
- **Fuentes:** <https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng>, <https://eur-lex.europa.eu/legal-content/EN/AUTO/?uri=CELEX:02011L0083-20260927>, <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306> (resultado de búsqueda, no leído).

### Fila 2 — Ranking y criterios de búsqueda

- **UE.** Reg. 2019/1150 (P2B), art. 5: las condiciones deben exponer los parámetros principales que determinan el ranking y por qué importan. **[EXTRACTO]** Directiva 2005/29/CE, art. 7(4a) (añadido por la Directiva 2019/2161): informar si el comerciante pagó por mejor posición y los parámetros principales. **[EXTRACTO]** *(Corrección a la spec: la regla de ranking de la 2005/29 es el art. 7(4a); el art. 7(6) trata de reseñas.)*
- **Colombia.** No se halló una norma específica sobre ranking. Aplica de forma general la información veraz y suficiente (Ley 1480, art. 23). **[SIN VERIFICAR]**
- **Cómo se cumple en Repuestox.** Hoy solo hay búsqueda de VTEX (Intelligent Search) y sinónimos; no hay posiciones pagadas. D3 debe decir cómo se ordenan los resultados y que no hay pago por posición. Si algún día se vende visibilidad, se actualiza.
- **Fuentes:** <https://eur-lex.europa.eu/eli/reg/2019/1150/oj/eng>, <https://eur-lex.europa.eu/eli/dir/2019/2161/oj/eng>.

### Fila 3 — Desistimiento / retracto

- **UE.** Directiva 2011/83/UE, art. 9: 14 días para desistir de contratos a distancia sin dar motivo, con excepciones (art. 16). **[EXTRACTO]**
- **Colombia.** Ley 1480, art. 47: en ventas a distancia (incluye comercio electrónico) el consumidor puede retractarse dentro de **5 días hábiles** desde la entrega del bien; el contrato se resuelve y se devuelve el dinero; el consumidor devuelve el producto por los mismos medios y en las mismas condiciones y **asume los costos de transporte** de la devolución. Hay excepciones taxativas (según la SIC, no hay otras), entre ellas bienes confeccionados según especificaciones del consumidor o claramente personalizados, y suministros con precio sujeto al mercado financiero. **[EXTRACTO]** La lista completa de excepciones no se pudo leer: **[SIN VERIFICAR]**.
- **Cómo se cumple en Repuestox.** D6 recoge el plazo de 5 días hábiles, el procedimiento y los costos. Los límites para piezas instaladas o sin empaque son `[A CONFIRMAR POR ABOGADO]`: la SIC indica que solo valen las excepciones de la ley.
- **Fuentes:** <https://www.sic.gov.co/boletin-juridico-agosto-2017/el-retracto-solo-puede-ser-negado-por-las-excepciones-establecidas-en-la-ley>, <https://www.cancilleria.gov.co/normograma/compilacion/docs/pdf/ley_1480_2011.pdf> (ambos resultados de búsqueda, no leídos).

### Fila 4 — Reversión del pago

- **UE.** Sin equivalente directo en las fuentes consultadas.
- **Colombia.** Ley 1480, art. 51 y Decreto 587 de 2016 (que añade el capítulo 51 al Decreto 1074 de 2015): aplica a ventas por comercio electrónico pagadas con tarjeta u otro instrumento electrónico cuando hay fraude, operación no solicitada, producto no recibido, no conforme o defectuoso. El consumidor tiene **5 días hábiles** desde que conoce el hecho para quejarse al proveedor y notificar al emisor; los participantes del proceso de pago disponen de **15 días hábiles** para hacerla efectiva. Solo aplica si el vendedor y el emisor están domiciliados en Colombia. Sanciones por mala fe hasta 50 SMMLV. **[EXTRACTO]** **Ojo:** la Ley 2439 de 2024 aparece como modificatoria del art. 51; no se leyó qué cambió. **[SIN VERIFICAR]**
- **Cómo se cumple en Repuestox.** D6 explica el derecho y los plazos y la vía de reclamo. **Asunto operativo con la pasarela (Q3):** hay que confirmar con Wompi cómo se tramita una reversión y quién responde (ver §3, pregunta 3).
- **Fuentes:** <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=69037> (Decreto 587/2016, resultado de búsqueda, no leído).

### Fila 5 — Garantía legal de productos

- **UE.** Directiva (UE) 2019/771, art. 10: dos años de responsabilidad del vendedor por faltas de conformidad existentes en la entrega y manifestadas en ese plazo; los Estados pueden fijar más. **[EXTRACTO]**
- **Colombia.** Ley 1480: art. 5 (definiciones: garantía como obligación temporal y solidaria de productor y proveedor); art. 7 (garantía legal: responder por calidad, idoneidad, seguridad y buen estado y funcionamiento); art. 8 (término: el que fije la ley o la autoridad; si no, el anunciado por productor o proveedor; corre desde la entrega); art. 10 (responsabilidad **solidaria** de productor y proveedor frente al consumidor); art. 11, numeral 7 (repuestos). **[EXTRACTO]** *(Corrección: la responsabilidad solidaria está en el art. 10, no en el 11.)* Una fuente añade que sin plazo anunciado la garantía de un producto nuevo es de un año; esa frase **no aparece en otra versión**: **[SIN VERIFICAR]**.
- **Cómo se cumple en Repuestox.** D3/D6 deben decir quién responde por la garantía (seller y productor, solidariamente), quién importa (producto importado) y cómo se tramita. Si Repuestox envía y atiende las reclamaciones (Q4, Q5), conviene que D6 diga qué hace Repuestox. `[A CONFIRMAR POR ABOGADO]` el plazo mínimo aplicable a repuestos y la garantía de lo importado.
- **Fuentes:** <https://eur-lex.europa.eu/eli/dir/2019/771/oj/eng>, <https://sedeelectronica.sic.gov.co/temas/proteccion-al-consumidor/derechos-y-deberes/fallas-en-un-producto> (resultado de búsqueda, no leído).

### Fila 6 — Seguridad de productos (repuestos)

- **UE.** Reg. (UE) 2023/988 (GPSR), art. 22 «obligaciones específicas de los mercados en línea»: punto único de contacto para autoridades y para consumidores, procesos internos de seguridad, atender órdenes de retirada en dos días hábiles y avisos en tres, mostrar datos del fabricante y de seguridad en los anuncios, y avisar a los compradores en caso de retirada. **[VERIFICADO]** (párrafos leídos; la fecha de aplicación, 13-dic-2024, es **[EXTRACTO]**).
- **Colombia.** Reglamentos técnicos por producto. Para **llantas**: la Resolución 20223040044455 de 2022 del Ministerio de Transporte (llantas nuevas y reencauchadas para vehículos automotores y su instalación, con certificado de conformidad), cuya entrada en vigor se aplazó con la Resolución 20243040053595 de 2024 hasta el 30-may-2025. **[EXTRACTO]** Para **motocicleta**: Resolución 20223040065305 de 2022. **[EXTRACTO]** La Resolución 481 de 2009 de MinComercio, antecesora, aparece sustituida. **[EXTRACTO]** **Vigencia actual de todas, y reglamentos de otras categorías (frenos, baterías, lubricantes, cascos…): [SIN VERIFICAR].**
- **Cómo se cumple en Repuestox.** D4 exige al seller el certificado de conformidad y el origen cuando el reglamento lo pida; D3 informa los productos de seguridad y la instalación profesional. Qué categorías del catálogo tienen reglamento técnico es una tarea de negocio y del abogado.
- **Fuentes:** <https://eur-lex.europa.eu/eli/reg/2023/988/oj/eng>, <https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?dt=S&i=146698> (Res. 481/2009), <https://sisjur.bogotajuridica.gov.co/sisjur/normas/Norma1.jsp?i=167979&dt=S> (prórroga 2024); estos dos, resultados de búsqueda no leídos.

### Fila 7 — Datos personales

- **UE.** GDPR (Reg. 2016/679): base de licitud (art. 6), condiciones del consentimiento (art. 7: poder demostrarlo, solicitud diferenciada, retirada tan fácil como darlo), información al recoger (art. 13) y derechos (arts. 15-22: acceso, rectificación, supresión, limitación, portabilidad, oposición). **[EXTRACTO]**
- **Colombia.** Ley 1581 de 2012 (principios, derechos del titular, autorización, deberes del responsable); Decreto 1377 de 2013, compilado en el Decreto 1074 de 2015 (aviso de privacidad y política de tratamiento). **[SIN VERIFICAR: números de artículo y contenido.]** **RNBD:** el Decreto 090 de 2018 limitó la obligación de inscribir bases de datos a sociedades y entidades sin ánimo de lucro con **activos totales superiores a 100.000 UVT** y a personas jurídicas públicas. **[EXTRACTO]** No se confirmó si hubo cambios posteriores. **[SIN VERIFICAR]**
- **Cómo se cumple en Repuestox.** D5 (política de tratamiento) y el aviso de privacidad enlazado en el checkout y los formularios; autorización previa y expresa; canal de reclamos (`[CANAL DE ATENCIÓN]`). Los datos de la aceptación de TyC se limitan a versión y fecha (plan, decisión 7). Si Repuestox supera el umbral de activos, debe inscribirse en el RNBD: **depende de la razón social (Q1)**.
- **Fuentes:** <https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng>, <https://www.sic.gov.co/gobierno-nacional-reduce-universo-de-obligados-a-cumplir-el-registro-de-bases-de-datos-ante-superintendencia-de-industria-y-comercio> (resultado de búsqueda, no leído).

### Fila 8 — Reseñas de consumidores

- **UE.** Directiva 2005/29/CE, art. 7(6) y anexo I, puntos 23b y 23c (Omnibus): informar si y cómo se verifica que las reseñas vienen de quien usó el producto; es práctica desleal presentar reseñas como de usuarios sin comprobaciones razonables, o encargar o falsear reseñas. **[EXTRACTO]**
- **Colombia.** Publicidad engañosa e información engañosa (Ley 1480, arts. 29 y 30). **[SIN VERIFICAR]**
- **Cómo se cumple en Repuestox.** **D7 se difiere (2026-11-17):** no hay reseñas públicas (spec 002 es feedback privado), así que no hay nada que moderar. Esta fila se retoma cuando existan.
- **Fuentes:** <https://eur-lex.europa.eu/eli/dir/2019/2161/oj/eng>. Colombia: sin fuente leída.

### Fila 9 — Comercio electrónico

- **UE.** eIDAS (Reg. 910/2014): el considerando 21 deja la conclusión y validez de los contratos a las reglas de forma nacionales o de la Unión, y el 22 recuerda que los servicios de confianza sirven como prueba; por tanto la aceptación de términos es sobre todo derecho contractual. **[VERIFICADO el estado: en vigor, modificado; el contenido de los considerandos es EXTRACTO]**
- **Colombia.** Ley 527 de 1999 (validez de los mensajes de datos, firma electrónica y conservación): **[SIN VERIFICAR]** los artículos exactos. Ley 1480, art. 50 (obligaciones de quien vende por comercio electrónico). **[EXTRACTO]** Guía de comercio electrónico de la SIC (2021-2022) como lectura obligada. **[EXTRACTO]**
- **Cómo se cumple en Repuestox.** El checkbox no premarcado y el registro (versión y fecha en el pedido) buscan una prueba verosímil de la aceptación; el abogado confirma si basta (pregunta B, aprobada por Diego).
- **Fuentes:** <https://eur-lex.europa.eu/eli/reg/2014/910/oj/eng>, <https://www.sic.gov.co/sites/default/files/files/2022/Gu%C3%ADa%20de%20comercio%20electronico%20-%20con%20firma%20-%20abr%2008%202022%20pq.pdf> (resultado de búsqueda, no leído).

### Fila 10 — Resolución de conflictos

- **UE.** El Reglamento (UE) 524/2013 (plataforma de resolución de litigios en línea) figura **«ya no en vigor»**: fin de vigencia 19-jul-2025, derogado por el Reglamento (UE) 2024/3228 (otra fecha en los metadatos: 20-jul-2025). **[VERIFICADO en los metadatos de EUR-Lex]** El cierre de la plataforma y el contenido del 2024/3228 no se leyeron. **[SIN VERIFICAR]** *(La spec citaba «ODR/ADR» sin fecha: esa referencia ya está desactualizada.)*
- **Colombia.** Competencia de la SIC para resolver conflictos de consumo y canal de reclamos (acción de protección al consumidor, Ley 1480, arts. 56-58 aprox.). **[SIN VERIFICAR]**
- **Cómo se cumple en Repuestox.** D2/D3/D6 informan que el consumidor puede acudir a la SIC y cuál es el canal propio de reclamos (`[CANAL DE ATENCIÓN]`).
- **Fuentes:** <https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32013R0524>. Colombia: sin fuente leída (la SIC es la autoridad; sitio no accesible desde esta sesión).

### Fila 11 — Responsabilidad del intermediario y de los sellers

- **UE.** DSA, art. 6 (el proveedor de alojamiento no responde por contenido ilícito que no conoce si actúa con diligencia al saberlo). **[EXTRACTO]** Arts. 30-32, fila 1.
- **Colombia.** Ley 1480, art. 53 (**portales de contacto**) y art. 10 (responsabilidad solidaria de productor y proveedor). **[EXTRACTO]** Criterios de la SIC para ser «portal de contacto»: actuar como mero intermediario, permitir contactar al oferente por la plataforma, ofrecer cerrar la operación fuera de ella, no tener un papel fundamental en la transacción e informar claramente que solo intermedia. **[EXTRACTO]** **La SIC indica que una plataforma se trata como de comercio electrónico y no de contacto si, por ejemplo, cobra comisión por las ventas, atiende directamente las reclamaciones o asume la reversión de pagos**; en ese caso aplican las obligaciones del art. 50 (ejemplo: sanción a Mercadolibre Colombia). **[EXTRACTO]**
- **Cómo se cumple en Repuestox.** **Hallazgo que cambia una premisa:** el modelo declarado (comisión, envía Repuestox, liquida por entrega, atención al cliente propia; spec 000 Q2-Q5) tiene **varias de las señales** que, según la SIC, sacan a una plataforma de la categoría «portal de contacto». Los TyC **no deben** afirmar «solo intermediario» sin que el abogado lo confirme: ver §3, pregunta 1.
- **Fuentes:** <https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/los-portales-de-contacto-no-hacen-parte-de-la-relacion-de-consumo-quien-responde-ante-los-consumidores>, <https://www.sic.gov.co/recursos_user/boletin-juridico-sep2016/articulo/consumidor/delegada-confirma-sancion-a-mercadolibre-por-incumplir-disposiciones-en-comercio-electronico.html> (resultados de búsqueda, no leídos), <https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng>.

---

## 2. Cobertura del contenido mínimo de repuestos (spec §5)

| Punto de §5 | Dónde se cubre | Estado |
|---|---|---|
| Compatibilidad (marca/modelo/año/VIN) | D3: el comprador verifica; el seller declara (D4). VIN: no hay (spec 000, Q7). | Borrador; el VIN queda fuera. |
| Condición: solo nuevos; original / alternativo / marca propia | D3 y D4 | Borrador; no se venden usados ni remanufacturados. |
| Piezas de seguridad (frenos, llantas, airbags) | D3 (instalación profesional) y D6; reglamento técnico de llantas (fila 6) | `[A CONFIRMAR POR ABOGADO]` qué categorías tienen reglamento. |
| Garantía condicionada a instalación; exclusiones por mal uso | D6 (fila 5) | `[A CONFIRMAR POR ABOGADO]`: validez de condicionar la garantía. |
| Productos instalados o sin empaque frente al retracto | D6 (fila 3) | `[A CONFIRMAR POR ABOGADO]`: solo valen las excepciones de la ley. |
| Importación y origen; quién importa y responde; plazos | D3 y D6 | `[TRANSPORTADORA]` y plazos pendientes (Q4); requisitos aduaneros: abogado. |
| Compradores personas jurídicas (talleres, flotas) | D3 y D6 | Ver pregunta 6; art. 5 de la Ley 1480 sobre «consumidor»: **[SIN VERIFICAR]**. |
| Accesorios y herramientas para mecánica | D3 y D6 | `[A CONFIRMAR POR ABOGADO]`: advertencias y garantía distintas. |

## 3. Limitaciones técnicas y preguntas para el abogado

**Limitaciones técnicas**
- El checkbox de TyC bloquea el pago **solo en el navegador**; no impide pagar llamando directo a la API del checkout (plan, decisión 7). La viabilidad del checkbox en el checkout de VTEX **está sin comprobar** (tarea 1.1, bloqueada por el admin de la cuenta).
- La aceptación se pide en cada compra y se guarda **versión y fecha** (no IP ni agente de usuario) para minimizar datos.
- El texto publicado puede cambiarse desde el Site Editor sin pasar por el repositorio; se acordó que el texto se cambia en el repo (plan, spike 1.2).

**Preguntas para el abogado** (A-E del plan y las abiertas de la spec §9)
1. **¿Es Repuestox un «portal de contacto» o una plataforma de comercio electrónico?** Cobra comisión, envía, liquida a los sellers por entrega y atiende reclamaciones. ¿Qué obligaciones tiene entonces (art. 50, art. 53, retracto, reversión, garantía) y qué debe decir el contrato de compraventa (¿comprador–seller o comprador–Repuestox)? *(Q2/Q4; reemplaza la premisa «intermediario únicamente».)*
2. Texto vigente de los arts. 47, 50, 51, 53 y de garantías de la Ley 1480 tras la **Ley 2439 de 2024**.
3. **Reversión del pago** con Wompi: ¿quién la ejecuta y cómo se comparte el riesgo con el seller cuando la liquidación es manual por entrega?
4. ¿Es suficiente el checkbox con registro de versión y fecha en el pedido como prueba de aceptación (Ley 527/1999)? ¿Basta pedirlo en cada compra? *(Pregunta B.)*
5. **Tratamiento de datos:** responsable, necesidad de inscripción en el RNBD según los activos de la razón social, y alcance de la autorización para el feedback privado de la spec 002.
6. **Comprador empresarial** (talleres y flotas): ¿qué régimen aplica a retracto, reversión y garantía? *(Pregunta E.)*
7. **Reglamentos técnicos** vigentes para las categorías del catálogo (llantas, frenos, baterías, lubricantes, cascos, iluminación) y responsabilidad de quien importa.
8. **Límites del retracto** para piezas instaladas o sin empaque, y validez de condicionar la garantía a la instalación profesional.
9. **Pagos a sellers manuales por entrega:** implicaciones tributarias y de comisiones y cláusulas de D4 (Q3).
10. **Envío por Repuestox** y plazos de importación: qué debe informarse y qué responsabilidad conlleva (Q4).
11. ¿Qué datos de identificación del seller debe conservar Repuestox y por cuánto tiempo (fila 1)?
12. **Razón social, NIT y domicilio** (Q1) y registro mercantil para el aviso legal.

## Verificación contra el texto oficial (2026-11-18)

Fuente leída completa: <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306> (Ley 1480 de 2011, Gestor Normativo de Función Pública, con anotaciones de la Ley 2439 de 2024). Es la única fuente colombiana que pudo leerse; las demás de la lista siguen sin abrirse. **[VERIFICADO]** en esa página:

- **Art. 47 (retracto):** 5 días hábiles desde la entrega; el consumidor devuelve el bien por los mismos medios y en las mismas condiciones y paga el transporte; excepciones propias (bienes personalizados, que no pueden devolverse o se deterioran con rapidez, perecederos, de uso personal, apuestas y loterías, precios atados al mercado financiero); devolución del dinero **sin descuentos ni retenciones y en máximo 30 días calendario** (parágrafo 1: aplica también a la entidad financiera; adición del art. 3 de la Ley 2439). *Corrige D6: antes decía «plazo por confirmar».*
- **Art. 50 (comercio electrónico):** el proveedor informa su nombre o razón social, NIT, **dirección de notificación judicial**, teléfono y correo (letra a); debe disponer en el mismo medio de canales de atención con trazabilidad de reclamos (letra g, modificada por la Ley 2439); si el producto pedido no está disponible y el consumidor cancela, la devolución se hace en **máximo 15 días calendario** (modificado por la Ley 2439). *D2 §1 y D6 §8 ya lo recogen.*
- **Art. 51 (reversión del pago) y Decreto 587 de 2016 (Función Pública, `i=69037`, leído completo; es el capítulo 51 del Decreto 1074 de 2015):** el consumidor tiene 5 días hábiles desde que supo del hecho para presentar queja al proveedor (art. 2.2.2.51.4) y, dentro de ese mismo plazo, notificar al emisor del medio de pago (art. 2.2.2.51.6); en bienes, debe indicar que el producto queda a disposición del proveedor para recogerlo en las mismas condiciones y lugar; recibida la solicitud, los participantes del pago tienen **15 días hábiles** para reversar. Solo aplica cuando el productor o expendedor y el emisor del instrumento están domiciliados en Colombia (parágrafo 1) y no a pagos presenciales. **[VERIFICADO]** *(El texto de la Ley 1480 no trae los 15 días: están en el decreto.)*
- **Art. 5, numeral 18 (portal de contacto), adicionado por el art. 6 de la Ley 2439:** plataforma que *pone en contacto* a proveedores o productores con consumidores, **a través de la cual se podrá concretar la relación de consumo directamente entre ellos**. Repuestox cobra, envía y atiende: esto apoya la hipótesis de comercio electrónico (pregunta 1 al abogado), sin cerrarla.
- **Art. 53 (portales de contacto):** exige registro de los oferentes con nombre o razón social, documento, dirección física y teléfonos, consultable por quien compró y entregable a la autoridad. *D4 §1 ya lo recoge.*

- **Arts. 7 a 11 y 16 (garantía legal), leídos el 2026-11-18 [VERIFICADO]:** art. 7 define la garantía como obligación de productor y proveedor de responder por calidad, idoneidad, seguridad y buen funcionamiento; art. 8: término fijado por la ley o la autoridad, si no, el anunciado, desde la entrega, y **un año para productos nuevos si no se indica**; art. 9: suspensión mientras el consumidor no puede usar el producto y reinicio total si se cambia el producto (las piezas cambiadas tienen garantía propia); art. 10: responsabilidad solidaria de productores y proveedores, basta demostrar el defecto; art. 11: reparación gratuita con transporte y repuestos, reposición o devolución del dinero, y a elección del consumidor si la falla se repite; art. 16: exoneración solo por fuerza mayor, hecho de un tercero, uso indebido o no atender las instrucciones del manual (esta última **no se puede alegar sin manual en castellano**), y quien alega debe probar el nexo causal. *D6 §4 a §6 y D4 §3 ya lo recogen.*

- **SIC, Concepto 22-51097 (23-feb-2022, publicado en la Sede Electrónica; PDF «2251097 Consumidor», leído completo el 2026-11-18) [VERIFICADO]:** para ser **portal de contacto** la SIC exige (i) actuar como mero intermediario que solo pone en contacto a oferentes y consumidores; (ii) permitir que el consumidor contacte al oferente por la plataforma; (iii) permitir concertar la operación entre proveedor y consumidor a través del sistema; (iv) no tener un rol fundamental en la operación ni en las condiciones de la transacción; (v) informar de forma clara, veraz, suficiente, oportuna y verificable que es un mero intermediario y los efectos de ello (cita la Sentencia 16593 de 26-dic-2019 y las Res. 40212/2019, 65205/2020 y 65397/2020 de la SIC). Y añade: **si la plataforma cobra una comisión por las ventas, o no da información suficiente para contactar al proveedor, es «Portal de Comercio Electrónico» y se le aplica el art. 50 de la Ley 1480.** Un portal de contacto, en cambio, no responde ante los consumidores por los bienes vendidos.
  - **Aplicado a Repuestox:** cobra comisión (D4 §7), cobra el pedido, lo envía y atiende los reclamos, es decir, no cumple (i) ni (iv) y cae en la regla de la comisión. **Conclusión para el abogado: Repuestox es portal de comercio electrónico (art. 50) y responde ante el consumidor.** Lo que el concepto *no* resuelve es quién es la contraparte del contrato de compraventa (siguen abiertas las alternativas de `borradores/alternativas.md`).

- **SIC, Resolución 55912 del 23-ago-2016 (sanción a Mercadolibre Colombia; resumen oficial del Boletín Jurídico, leído el 2026-11-18) [VERIFICADO]:** la Delegada confirmó que no era un simple portal de contacto sino un portal de comercio electrónico, por tres elementos: **cobraba comisión por las ventas, tenía una alternativa propia de pago y no daba información suficiente para contactar al proveedor.** Repuestox cumple los dos primeros (comisión y cobro propio por [PASARELA DE PAGO]). Se leyó el resumen, no la resolución completa.
- **SIC, Guía de comercio electrónico (abr-2022, 31 págs., leída completa el 2026-11-18) [VERIFICADO]:** son recomendaciones, no norma. Las que tocan a D2 a D6: *protección contractual:* dar a conocer siempre las condiciones generales, con acceso fácil y disponibles para imprimir y descargar antes y después de la compra; resumen del pedido; acuse de recibo **a más tardar el día calendario siguiente** con tiempo de entrega, precio y forma de pago; conservar prueba de la voluntad de contratar, del pago y de la entrega; y **excluir cláusulas que permitan modificar unilateralmente el contrato, limiten la responsabilidad, presuman la aceptación o trasladen la responsabilidad a un tercero que no es parte** (ejemplo: exigir que el consumidor declare que leyó y acepta sin presumirlo, como el checkbox no premarcado). *Reversión:* formulario de solicitud en el sitio, constancia de la queja con fecha y causal, y reversión efectiva en 15 días hábiles. *Privacidad:* recolectar solo los datos estrictamente necesarios y con autorización. *Edad:* verificar que el comprador sea mayor o dejar constancia de la autorización de los padres. *D2 §9, D2 §11, D3 §5 y D6 §3 ya lo recogen.*

- **RNBD, Decreto 090 de 2018 (resumen de la SIC, leído el 2026-11-18) [EXTRACTO]:** el decreto de 18-ene-2018 redujo los obligados a registrar sus bases de datos ante la SIC a **las sociedades y entidades sin ánimo de lucro con activos superiores a $3.316 millones (cifra de 2018)**; las micro y pequeñas empresas y las personas naturales no están obligadas. Se leyó la noticia de la SIC, no el decreto; el umbral actual (se expresa en UVT) **sigue sin verificar**. *D5 §9 lo recoge sin cifra y con aviso para el abogado.*
- **Ley 527 de 1999, comercio electrónico (Función Pública, `i=4276`, leída el 2026-11-18) [VERIFICADO]:** art. 5, no se niegan efectos jurídicos a la información por estar en forma de mensaje de datos; art. 7, la firma se cumple con un método que identifique al iniciador y señale que aprueba el contenido, y que sea confiable y apropiado para el propósito; art. 10, los mensajes de datos son admisibles como prueba y no se les niega eficacia por no ser originales; art. 12, la conservación exige que la información sea accesible, se guarde en el formato original o uno que la reproduzca con exactitud, y conserve origen, destino, fecha y hora; art. 14, la oferta y su aceptación pueden expresarse por mensaje de datos y no se niega validez al contrato por ello. **Para el registro de aceptación (decisión 7):** `customData` con versión y fecha y hora (ISO) dentro del pedido, que ya identifica al comprador, cumple el espíritu de los arts. 7, 12 y 14; que baste como prueba lo confirma el abogado (pregunta B). *El Decreto 2364 de 2012 (firma electrónica, reglamenta el art. 7) no se leyó.*

- **Decreto 090 de 2018 (Función Pública, `i=85039`, leído completo el 2026-11-18) [VERIFICADO]:** modifica los arts. 2.2.2.26.1.2 y 2.2.2.26.3.1 del Decreto 1074 de 2015. Quedan obligadas a inscribir sus bases de datos en el RNBD (a) **las sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT** y (b) las personas jurídicas de naturaleza pública. El considerando toma el parámetro de la Ley 905 de 2004 (mediana empresa: 100.000 a 610.000 UVT de activos). Los plazos de inscripción de 2018 ya vencieron. *Corrige el [EXTRACTO] anterior: la noticia de la SIC daba la cifra en pesos de 2018; el texto fija 100.000 UVT.*
- **UVT 2026 (DIAN, Resolución 000238 del 15-dic-2025, Diario Oficial 53.338; Compilación Jurídica de la DIAN, leída el 2026-11-18) [VERIFICADO]:** **$52.374**. Umbral del RNBD en 2026: 100.000 × $52.374 = **$5.237.400.000** en activos totales. Se actualiza cada año; hay que recalcularlo.
- **Decreto 2364 de 2012 (firma electrónica; Función Pública, `i=50583`, leído el 2026-11-18) [VERIFICADO]:** firma electrónica = método (códigos, contraseñas, datos biométricos, claves) que identifica a una persona respecto de un mensaje de datos y es confiable y apropiado para su fin (art. 1); cumple el requisito de firma si es tan confiable como apropiada para el fin (art. 3); es confiable si los datos de creación corresponden exclusivamente al firmante y se detecta cualquier alteración posterior (art. 4); tiene la misma validez que la firma manuscrita si cumple el art. 3 (art. 5); si las partes acuerdan un método de identificación o autenticación, se presume que cumple, y **quien provee el método debe asegurar que es técnicamente seguro y probarlo** (art. 7); la seguridad se mide por criterios como un concepto pericial o una auditoría (art. 8). **Para el checkbox (decisión 7):** un clic por sí solo **no identifica** al firmante; lo hace el pedido asociado a una cuenta o a datos de contacto, y el registro `customData` con versión y fecha y hora. Que eso baste, y quién prueba la seguridad del método (Repuestox, como proveedor del mecanismo), lo decide el abogado (pregunta B). Conviene que el registro quede ligado al pedido y no se pueda editar después.

**Sigue sin verificar:** nada de las fuentes colombianas previstas. Quedan las preguntas jurídicas de la lista del abogado.

