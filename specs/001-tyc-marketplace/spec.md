# 001 — Términos y Condiciones del marketplace (Colombia, referencia UE)

- **Estado:** draft (retomada el 2026-11-17; prerrequisitos y bloqueos en `pendientes.md`)
- **Responsable:** Diego
- **Rama:** `feat/001-tyc-marketplace`
- **Depende de:** 000 (contexto); 004 y 005 (contacto y "Quiénes somos" para el aviso legal); personalización del checkout (RF-2); revisión de un abogado colombiano

## 1. Contexto y problema
Repuestox vende repuestos y accesorios para carros (y motos/herramientas) y opera como
marketplace con sellers terceros. Hoy no hay TyC publicados ni aceptados en el checkout.
Se necesita un marco legal completo. La regulación europea (muy exhaustiva en marketplaces)
se usa como **benchmark de buenas prácticas**; la **norma vinculante es la colombiana**.

**Hallazgos de la spec 000 (workspace `devwilbis`, 2026-11-12):**
- Ninguna de las rutas legales (D2-D6) existe (`/devoluciones-y-garantias` y `/condiciones-sellers` caen en "sin resultados").
- El checkout es el nativo de VTEX, sin personalizar y sin checkbox de TyC: el RF-2 exige personalizarlo (p. ej. `checkout-ui-custom`), que hoy está fuera del repo.
- El PDP no muestra quién vende ni quién envía (RF-5).
- `/about-us` es plantilla en inglés y `/contact-us` está roto: ver specs 004 y 005.
- Hoy solo existe un seller propio (`Repuestox`, id 1): las condiciones de sellers (D4) anticipan un marketplace que aún no opera.

**Cambio de alcance (2026-11-17, Diego):** se **difiere D7** (política de reseñas). Las páginas legales pasan de 6 a 5 (D2-D6) y cambian `RF-1` y `AC-7`; `AC-1` no cambia de texto, pero ahora cubre 5 documentos. El feedback privado de la spec 002 se cubre en la política de privacidad (D5). **Checkout:** el logo y los estilos de marca los hace la spec 006; esta spec solo añade el checkbox de TyC y el registro de la aceptación (RF-7 se limita a eso).

**Decisiones del equipo (2026-11-15, registradas en la spec 000):**
- Se vende en **todo Colombia**, a **particulares y talleres** y también a **empresas con flota**.
- Solo repuestos **nuevos e importados**, más accesorios y herramientas de mecánica automotriz. **No** se venden usados ni remanufacturados.
- **Razón social y NIT están por asignar**: los textos legales llevan placeholders (RF-8).
- "Onewstore" es el nombre de una tienda previa y se pedirá a VTEX cambiarlo: **no debe aparecer como razón social ni como marca en los textos legales**; la marca es Repuestox.
- La tienda está **en desarrollo**, sin producción con dominio propio: no hay usuarios ni compras reales sujetos a estos textos todavía.

## 2. Objetivos / No-objetivos
**Objetivos**
- Investigar y documentar qué exige la regulación UE a un marketplace y mapearlo a la ley colombiana.
- Producir el set de documentos legales y publicarlos en la tienda.
- Registrar la aceptación de TyC por parte del usuario.

**No-objetivos**
- No es asesoría legal: el texto final lo valida un abogado.
- No se cubre venta fuera de Colombia.
- No se cubren repuestos usados ni remanufacturados (no se venden). Si se incorporan, se abre una spec nueva.

## 3. Entregables
| # | Documento | Ruta propuesta |
|---|---|---|
| D1 | Informe de investigación (UE → Colombia) | `specs/001-tyc-marketplace/research.md` |
| D2 | TyC generales de uso de la plataforma | `/terminos-y-condiciones` |
| D3 | TyC de venta al consumidor (compra, envío, pago) | `/terminos-de-venta` |
| D4 | Condiciones para sellers (contrato marketplace) | `/condiciones-sellers` |
| D5 | Política de privacidad / tratamiento de datos | `/politica-de-privacidad` |
| D6 | Política de devoluciones, retracto y garantías | `/devoluciones-y-garantias` |
| D7 | ~~Política de reseñas y moderación~~ — **diferido (2026-11-17)**: no hay reseñas públicas (spec 002 es feedback privado); se retoma cuando existan | `/politica-de-resenas` (no se publica) |

## 4. Matriz de investigación (a completar en D1)
Las referencias son punto de partida: **cada cita debe verificarse** contra el texto vigente.

| Tema | Referencia UE | Equivalente Colombia (a verificar) |
|---|---|---|
| Transparencia del marketplace / identidad del vendedor | DSA (Reg. 2022/2065); Dir. 2019/2161 (Omnibus) | Ley 1480/2011 (Estatuto del Consumidor): información veraz y suficiente |
| Ranking y criterios de búsqueda | Omnibus, P2B Reg. 2019/1150 | Información clara (Ley 1480) |
| Derecho de desistimiento (14 días UE) | Dir. 2011/83/UE | Retracto: Ley 1480 art. 47 (5 días hábiles, ventas a distancia) |
| Reversión del pago | — | Ley 1480 art. 51, Decreto 587/2016 |
| Garantía legal de productos | Dir. 2019/771 | Ley 1480, capítulo de garantías |
| Seguridad de productos (repuestos) | GPSR Reg. 2023/988 | Reglamentos técnicos / SIC |
| Datos personales | GDPR | Ley 1581/2012, Decreto 1377/2013, RNBD |
| Reseñas de consumidores | Omnibus (verificación de reseñas) | Ley 1480 (publicidad engañosa) |
| Comercio electrónico | eIDAS | Ley 527/1999, Ley 1480 comercio electrónico |
| Resolución de conflictos | ODR / ADR | SIC (Superintendencia de Industria y Comercio) |
| Responsabilidad de intermediario / sellers | DSA | Ley 1480: responsabilidad solidaria productor-expendedor |

Cada fila debe acabar con: cita exacta del artículo, requisito, y cómo se cumple en Repuestox.

## 5. Contenido mínimo específico de repuestos y autopartes
- Compatibilidad: el comprador verifica el vehículo (marca/modelo/año/VIN); el seller declara compatibilidad.
- Condición del producto: **solo nuevos**. El texto debe decirlo y distinguir original (OEM), alternativo/genérico y de marca propia; el etiquetado de usados o remanufacturados no aplica mientras no se vendan.
- Piezas de seguridad (frenos, llantas, airbags): reglas de devolución e instalación profesional.
- Garantía condicionada a instalación correcta; exclusiones por mal uso.
- Productos instalados / sin empaque: límites al retracto (a validar legalmente).
- **Importación y origen:** los productos son nuevos e **importados**. El texto debe indicar el origen, quién importa y responde por la garantía, y los plazos de entrega que implique importar. Los requisitos aduaneros y los reglamentos técnicos aplicables a cada categoría los valida el abogado (D1).
- **Compradores personas jurídicas:** se vende también a talleres y empresas con flota. Las normas de consumidor (retracto, reversión del pago) aplican a **consumidores**; si un comprador empresarial no lo es, puede regir otro régimen. Cómo tratarlo en D3 y D6 lo define el abogado.
- Accesorios y herramientas para mecánica automotriz: revisar si requieren advertencias o condiciones de garantía distintas a las de los repuestos.

## 6. Requisitos funcionales
- `RF-1` Las 5 páginas legales (D2-D6) son accesibles por URL propia y enlazadas desde el footer en todas las páginas.
- `RF-2` En registro/checkout hay un checkbox **no premarcado** de aceptación de TyC y política de privacidad con enlaces.
- `RF-3` La aceptación guarda usuario, versión del documento y fecha/hora (Master Data o campo de perfil).
- `RF-4` Cada documento muestra versión y fecha de última actualización.
- `RF-5` En PDP y checkout se muestra quién vende (seller) y quién envía.
- `RF-6` El texto legal es editable sin redeploy de código (rich-text / CMS de VTEX).
- `RF-7` El checkout se personaliza (checkbox de aceptación; el logo de marca lo pone la spec 006) para cumplir el RF-2; si VTEX no permite bloquear el pago nativamente, se documenta la alternativa en `plan.md`.
- `RF-8` Mientras no existan razón social y NIT, los textos legales usan placeholders visibles y exactos (`[RAZÓN SOCIAL]`, `[NIT]`), y no se publica en producción ningún documento que los conserve.

## 7. Requisitos no funcionales
- Lenguaje claro (español), legible en móvil.
- SEO: páginas indexables; canonical correcto.
- Cumplimiento: revisión legal firmada antes de publicar.

## 8. Criterios de aceptación
- `AC-1` Dada cualquier página, cuando el usuario baja al footer, ve enlaces a los documentos y cada uno abre su página.
- `AC-2` Dado un usuario en checkout, cuando intenta pagar sin aceptar TyC, el pago queda bloqueado con mensaje claro.
- `AC-3` Dado que se acepta TyC, existe un registro con usuario, versión y timestamp consultable.
- `AC-4` Dada una nueva versión de TyC, cuando el usuario vuelve a comprar, se le pide aceptar la nueva versión.
- `AC-5` `research.md` incluye la matriz completa con citas y fue revisado por un abogado (evidencia en el PR).
- `AC-6` Las páginas legales cumplen accesibilidad (contraste, jerarquía de encabezados).
- `AC-7` Antes de publicar en producción, una búsqueda de `[RAZÓN SOCIAL]` y `[NIT]` en los documentos D2-D6 no devuelve resultados, y ninguno menciona "Onewstore".

## 9. Preguntas abiertas
- [ ] ¿Quién es el abogado revisor y cuál es el plazo?
- [x] ¿Repuestox es mero intermediario o vendedor directo? → **Intermediario únicamente** (2026-11-15). Los TyC deben decir con claridad que el contrato de compraventa es entre comprador y seller, e identificar al seller (RF-5). El abogado debe confirmar qué obligaciones conserva Repuestox como intermediario en Colombia (p. ej. las de los portales de contacto del Estatuto del Consumidor, y la reversión del pago, art. 51) [Inferido, a verificar].
- [ ] ¿Quién gestiona pagos a sellers (split de VTEX)? Impacta cláusulas de comisiones.
- [ ] Razón social, NIT y registro para el aviso legal: **por asignar** (2026-11-15). Se usan placeholders (RF-8); falta la fecha en que existirán.
- [ ] ¿El checkbox de TyC se puede forzar nativamente en el checkout de VTEX o requiere app/custom?
- [x] ¿Se venden repuestos usados/importados? → **Solo nuevos e importados** (2026-11-15). No se venden usados ni remanufacturados.
- [ ] ¿Cómo se trata al comprador empresarial (flotas, talleres) frente al régimen de consumidor? (lo define el abogado)
- [ ] Pagos a sellers (Q3): **sigue abierta**; el equipo responderá luego. Q2 quedó parcialmente resuelta: falta la fecha del marketplace con sellers terceros (ver spec 000).

## 10. Referencias
- Colombia: Ley 1480/2011, Ley 1581/2012, Ley 527/1999, Decreto 1074/2015, Decreto 587/2016.
- UE: DSA (2022/2065), Dir. 2011/83/UE, Dir. 2019/2161 (Omnibus), Reg. 2019/1150 (P2B), GDPR (2016/679), GPSR (2023/988).
- Benchmarks: TyC de marketplaces europeos (Amazon, Zalando, AUTODOC) y colombianos (Mercado Libre, Éxito).
