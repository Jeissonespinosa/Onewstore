# Guía de imágenes y presupuesto de rendimiento

- **Spec:** 010 (RF-7) · **Para:** la spec 011 (diseños, iconos y banners) y quien cargue contenido
- **Fecha:** 2026-11-20 · **Estado:** propuesta; los valores marcados *(propuesta)* se ajustan con la 011
- **Cómo leerla:** cada cifra dice de dónde sale. **Medida** = observada por Lighthouse en `pruebamedidas`
  (`medidas.md`, `diagnostico.md`). **Referencia** = criterio público. **Propuesta** = valor sugerido sin dato propio.

## 1. Regla de oro

**Subir cada imagen al tamaño en que se muestra (×2 para pantallas retina), no al tamaño del archivo original.**

Evidencia medida, en la inicio (`diagnostico.md`, `image-delivery-insight`):

| Imagen | Archivo subido | Se muestra a | Peso transferido | Ahorro estimado |
|---|---|---|---|---|
| Logo del header (en todas las páginas) | 2551×786 px | ~228 px de ancho | 53 KB | ~51 KB |
| Imagen del bloque `repuestox-split` | 2551×3301 px | ~252 px de ancho | 45 KB | ~44 KB |

Son **~95 KB de la inicio** (y el logo, 53 KB, viaja en cada página) que se evitarían subiendo los archivos a su tamaño
real. Es un cambio de contenido, no de código: se hace reemplazando los archivos en el admin de VTEX.

## 2. Formato

- **El almacén de archivos de VTEX convierte a WebP por su cuenta.** Medido: un `.png` subido llega al navegador como
  `image/webp`. No hace falta subir WebP; sí hace falta subir el **tamaño correcto**.
- Las imágenes externas con `auto=format` (hoy los marcadores de Unsplash) llegan como **AVIF** (medido: 14 KB y 31 KB a 800 px).
- **Logos e íconos: SVG** siempre que existan en vectores (spec 011 ya lista `catalogo/iconos-categorias.json`). Un logo
  vectorial pesa pocos KB y no depende de la resolución. *(propuesta)*
- **Fotos y banners:** JPG de calidad 75-80, o WebP/AVIF si el diseñador lo entrega. **Productos y tarjetas con fondo
  blanco/transparente:** PNG o WebP. Evitar GIF animados.
- **Referencia:** WebP y AVIF comprimen mejor que JPG/PNG a igual calidad visual ([web.dev, «Serve images in modern formats»](https://web.dev/articles/serve-images-webp)).

## 3. Medidas y peso máximo por tipo de imagen

Las medidas vienen del README del repositorio (sección de imágenes). Los pesos son un **tope por archivo ya
exportado** *(propuesta)*, calculados a partir de lo medido: el hero de la inicio pesa hoy 30 KB a 800 px y 83 KB a
1600 px (ambos Unsplash); las imágenes de producto de VTEX pesan 6-9 KB (300×300 y 800×450).

| Tipo | Medida (px) | Bloque | Peso máximo | Notas |
|---|---|---|---|---|
| Hero de `/carros` y `/motos` (slider) | 1600×700 | `image#rx-<sec>-slide-N-img` | **150 KB** | Dar también una versión de 800 px (`srcSet`, ver §5). El texto va a la izquierda. |
| Banner de cada categoría | 1600×400 | `image#rx-p-<página>-banner-img` | **100 KB** | Se recorta (cover) según el ancho. |
| Tarjetas del rail y de subcategorías | 800×500 | `image#rx-<sec>-linea-NN-img`, `rx-g-…` | **60 KB** | Se repiten varias veces por página: el peso se multiplica. |
| Home: mitad Carros / Motos | 1200×1400 | `image#repuestox-split-*-bg` | **150 KB** | Es la imagen del LCP de la inicio: la que más cuenta. |
| Home: franja Herramientas | 1920×600 | `image#repuestox-split-herramientas-bg` | **100 KB** | Centro despejado para la palabra. |
| Logo de marcas | 360×112 | `image#repuestox-brand-N-*` | **15 KB** (SVG: 5 KB) | Se muestra a 180×56. |
| Logo del header | 460×142 (2× de ~230 px) o SVG | `logo` | **10 KB** | Hoy: 53 KB (§1). |
| Íconos (menú, redes, botones) | vectorial | `image` / CSS | **5 KB** cada uno, SVG | Las redes del pie hoy vienen de `cdn.simpleicons.org` (5-6 peticiones externas). |
| Productos (catálogo) | ≥ 800 px de lado largo | admin de catálogo | **100 KB** | VTEX genera las miniaturas (`/arquivos/ids/<id>-<ancho>-<alto>`). |

## 4. Accesibilidad y contenido

- Toda imagen informativa lleva `alt` descriptivo en español; las decorativas, `alt` vacío.
- El texto **no** va incrustado en la imagen si se puede evitar (títulos como «CARROS» son `rich-text`): no se
  traduce, no se lee con lector de pantalla y empeora la compresión.
- Nombrar los archivos de forma descriptiva (`slide-carros-baterias-1600x700.jpg`).

## 5. Qué sí y qué no se puede hacer en el theme (medido)

- **Sí:** el bloque `image` admite `srcSet` y `sizes`. Con eso el móvil descarga una versión más pequeña: aplicado al hero
  de la inicio (tarea 3.2), pasó de 29 + 83 KB a 13 + 30 KB. La 011 debe entregar **dos versiones** (800 y 1600 px) de
  hero y mitades Carros/Motos para aprovecharlo.
- **No (con el bloque actual):** `width`/`height`, carga diferida (`loading`) ni `fetchpriority`. Según la
  [documentación del bloque](https://developers.vtex.com/docs/apps/vtex.store-components/Image) solo admite `src`, `srcSet`,
  `sizes`, `alt`, `link`, `maxHeight` y `maxWidth`. Hacerlo requeriría otro bloque o un componente propio, y debería
  hacerse **solo si** las imágenes reales mueven el LCP o el CLS.
- **El elemento del LCP de la inicio es una imagen** (la mitad Carros): cualquier peso extra ahí se paga completo en
  el LCP. Ver `diagnostico.md`.

## 6. Presupuesto de rendimiento por página (móvil)

*Punto de partida medido* (Lighthouse 13, móvil, mediana de 5 corridas en `pruebamedidas`, tras las optimizaciones de la
010; ver `medidas.md`). Los límites son una **propuesta**; el JS total de la tabla incluye código de VTEX y la variante
de desarrollo de React, por lo que **solo el JS propio es controlable desde el theme**.

| Métrica | Hoy (medido) | Presupuesto *(propuesta)* | Fuente del límite |
|---|---|---|---|
| Lighthouse de rendimiento, móvil | inicio ~69-73, categoría ~78, ficha ~76 | **no bajar más de 5 puntos** de la última medición | Criterio de la spec 003 y de la 010 (AC-4) |
| LCP móvil | inicio 3,9-4,2 s, categoría 1,9 s, ficha 2,6 s | **≤ 2,5 s** (meta); no empeorar lo medido | Referencia: umbral «bueno» de [Core Web Vitals](https://web.dev/articles/lcp). Hoy la inicio no lo cumple |
| CLS | ≤ 0,026 | **≤ 0,1** | Referencia: [Core Web Vitals](https://web.dev/articles/cls) |
| Imágenes que se cargan al abrir la página | inicio 143 KB, categoría 84 KB, ficha 75 KB | **≤ 300 KB** | Propuesta: ~2× lo medido hoy |
| Fuentes | ~37 KB (Montserrat, 1 archivo) | **≤ 60 KB**, una sola familia | Medido; unificado en la tarea 3.1 |
| JavaScript propio del theme (`onewstore.store-theme`) | 50-75 KB transferidos | **≤ 100 KB** | Medido (`diagnostico.md` §1) |
| CSS total | 87 KB | **≤ 120 KB** | Medido |
| Recursos que bloquean el render | ~163 ms estimados | **≤ 300 ms** | Medido tras 3.1 (era ~1 005 ms) |
| App o script de terceros nuevo (chat, analítica, WhatsApp de la 015) | — | **≤ 50 KB de JS** cada uno, sin bloquear el render, cargado después del contenido | Propuesta; la pregunta de §7 de la spec 010 sigue abierta |
| Peso total de la página | 2,4-3,4 MB (con JS de VTEX y React de desarrollo) | **medir en un theme publicado** antes de fijar un tope | Las cifras actuales sobreestiman a un comprador (`diagnostico.md` N3) |

## 7. Lista de verificación antes de subir contenido

1. ¿La imagen está al tamaño de la tabla de §3 (no el original de cámara o de diseño)?
2. ¿Pesa menos que el máximo de su tipo? Si no, bajar calidad a 75-80 o recortar.
3. ¿Hay versión de 800 px para hero y mitades (`srcSet`)?
4. ¿Los logos e íconos son SVG?
5. ¿Lleva `alt` en español?
6. Tras publicar en un workspace: correr Lighthouse móvil en la página afectada (método de `medidas.md`) y anotar
   el antes y el después.

## 8. Pendientes que dependen de otras specs o personas

- **Reemplazar el logo y la imagen de 2551 px (§1):** contenido; lo hace quien tenga el archivo original (spec 011).
- **Presupuesto para terceros y volumen real de imágenes:** preguntas abiertas de la spec 010 §7; esta guía usa
  valores propuestos hasta que existan datos.
- **Medir en un theme publicado** (fuera del alcance del agente, lo decide Diego): permite fijar un tope de peso total.
