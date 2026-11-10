# Cómo queda el catálogo y cómo cargan los sellers

Con las vitrinas de filtros (Llantas y los cuatro sistemas de Eléctrico y electrónico)
cambia **dónde** se publica el producto, no cuánto trabajo cuesta publicarlo. Resumen:

> Antes: el seller elegía la categoría más profunda (`Llantas de automóvil`) y el tipo
> quedaba "escrito" en el árbol.
> Ahora: el seller publica en la categoría del sistema o de la familia (`Llantas`,
> `Encendido`) y dice **qué es** y **qué medida tiene** en las especificaciones.

## 1. Qué cambia en el árbol del catálogo

| | Antes | Ahora |
|---|---|---|
| Llantas | 4 categorías hoja (automóvil · SUV y 4x4 · van, camión y transporte · OTR) | 1 categoría `Llantas` + especificación **Tipo de vehículo** con esos 4 valores |
| Eléctrico y electrónico | 21 categorías hoja sueltas | 4 categorías de sistema (Encendido · Arranque y carga · Gestión electrónica · Eléctrico general) + especificación **Tipo de producto** con los 22 valores |

Las páginas que desaparecen no se pierden: siguen existiendo como **valor de filtro** y
quedan registradas en `estructura-categorias-v2.csv` con el nivel
`Valor de filtro (…)`, apuntando a la URL de la categoría padre.

Total: de 589 a **567 páginas** (33 macros, 37 subcategorías, 497 tipos).

## 2. Especificaciones a crear en el admin (Catálogo › Especificaciones)

Se crean **una sola vez** por categoría y se marcan como *filtrable* para que aparezcan
en el panel de la izquierda.

### Llantas
| Especificación | Tipo de campo | Valores |
|---|---|---|
| Tipo de vehículo | Lista (radio) | Automóvil · SUV y 4x4 · Van y camión · OTR e industrial |
| Ancho | Lista | 175, 185, 195, 205, 215, 225, 235, 245, 265, 285… |
| Alto (perfil) | Lista | 45, 50, 55, 60, 65, 70, 75… |
| Rin | Lista | 13, 14, 15, 16, 17, 18, 20… |
| Medida completa | Texto | `185/65R15`, `700-16` (no filtrable: para buscar y mostrar) |
| Uso | Lista | Ciudad · Carretera · Todoterreno (A/T) · Barro (M/T) · Carga |
| Índice de carga/velocidad | Texto | `91V`, `110T` (opcional) |

### Eléctrico y electrónico (una por cada sistema)
| Especificación | Valores |
|---|---|
| Tipo de producto — Encendido | Bobinas · Módulos y distribuidores · Bujías · Cables de alta · Bujías de precalentamiento · Kits de sincronización |
| Tipo de producto — Arranque y carga | Motores de arranque · Bendix y automáticos · Alternadores · Reguladores de voltaje |
| Tipo de producto — Gestión electrónica | Computadores ECU · Módulos electrónicos · Actuadores · Sensores de motor (CKP, CMP, temperatura) |
| Tipo de producto — Eléctrico general | Fusibles · Relés · Suiches de encendido y cilindros de llave · Suiches e interruptores · Llaves y controles · Cableado · Conectores · Pitos |

Además, las que ya estaban previstas y **no cambian**: `Marca vehículo`, `Modelo`, `Año`
(compatibilidad, las usa el selector de vehículo) y la `Marca` del producto, que es un
campo nativo de VTEX.

## 3. Cómo publica el seller

Mismo flujo de siempre (Portal del seller o integración), con dos campos más:

1. **Categoría** — ya no busca la hoja exacta; elige `Llantas` o el sistema
   (`Eléctrico y electrónico > Encendido`). Menos opciones, menos error.
2. **Marca** — Michelin, Bosch, Yazaki… (campo nativo).
3. **Nombre y referencia** — se recomienda dejar la medida o el tipo en el título, como
   hace Mercado Libre: *"Llanta Michelin Energy XM2+ 185/65R15"*.
4. **Especificaciones** — aquí va lo que antes era la categoría:
   - Llanta: Tipo de vehículo = *Automóvil*, Ancho = *185*, Alto = *65*, Rin = *15*,
     Medida completa = *185/65R15*, Uso = *Ciudad*.
   - Encendido: Tipo de producto = *Bujías*.
5. **Compatibilidad** — Marca vehículo, Modelo y Año, como ya estaba previsto.

### Lo que gana el seller
- No tiene que adivinar entre 21 categorías parecidas; publica en 4.
- Un producto que sirve para dos tipos (una llanta que va en SUV y en camioneta) ya no
  obliga a duplicar la publicación: se marcan los dos valores si la especificación es de
  selección múltiple.
- Corregir un dato mal puesto es editar una especificación, no mover el producto de
  categoría (que en VTEX implica perder la URL).

### Lo que hay que cuidar
- **La carga masiva debe traer las especificaciones.** Si un seller sube un producto sin
  `Tipo de producto` o sin `Ancho/Alto/Rin`, el producto aparece en la categoría pero no
  sale en ningún filtro. Recomendación: marcarlas como **obligatorias** en la plantilla de
  carga y rechazar la oferta si vienen vacías (Marketplace › Calidad de la oferta).
- **Valores cerrados, no texto libre.** `Ancho` debe ser lista, no texto: si un seller
  escribe "185 mm" y otro "185", salen dos filtros distintos.
- Para el catálogo viejo ya publicado hay que hacer una migración: mover los productos de
  las hojas eliminadas a la categoría padre y llenarles la especificación. Se hace por API
  o por hoja de cálculo; son 26 categorías afectadas.

## 4. Qué NO cambia

- Las URLs actuales pueden seguir vivas como entradas con el filtro puesto
  (`/carros/llantas-y-rines/llantas?tipo=suv`), así no se pierde el SEO.
- El selector de vehículo sigue igual y encima del panel de filtros.
- Los sinónimos de esos 26 nombres se conservan: el cliente que busca "bujías" o
  "llantas SUV" llega igual, ahora a la categoría con el filtro aplicado.

## 5. Decisiones pendientes

1. ¿Las cuatro URLs de tipo de llanta se conservan como entradas con filtro, o se
   eliminan y se redirigen a `/carros/llantas-y-rines/llantas`?
2. ¿Se aplica el mismo patrón en **motos** (llantas delanteras/traseras/scooter/cross y
   el eléctrico de moto) y en **rines** (diámetro, huecos, pernos)?
3. ¿La especificación `Tipo de vehículo` de llantas es de selección única o múltiple?
