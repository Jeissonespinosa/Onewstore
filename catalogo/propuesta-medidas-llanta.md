# Medidas de llanta: propuesta de diseño (no implementada)

**Decisión pendiente del usuario.** Crear especificaciones en el catálogo es trabajo en
el admin de VTEX, no en el theme. Este documento propone el modelo; no cambia nada.

## El problema

Hoy no existe un sistema de medidas: son texto libre dentro de `_sinonimos`. El árbol
guarda las hojas como strings (`tipos: ["Llantas de automóvil", …]`), sin campo de
especificaciones. Las 16 medidas que hay en todo el catálogo:

| Hoja | Medidas registradas hoy |
|---|---|
| Llantas de automóvil | `llanta 175`, `185`, `195`, `205` (solo el ancho) |
| Llantas SUV y 4x4 | `llanta 265`, `245` |
| Llantas de van, camión y transporte | `llanta 195r15`, `700-16`, `1100-20` |
| Llantas delanteras (moto) | `llanta 2.75-18`, `llanta 90/90-17` |
| Llantas traseras (moto) | `llanta 100/90-17`, `llanta 130/70-17` |
| Llantas de scooter | `llanta 90/90-10` |
| Rines de aluminio | `rines 15`, `16`, `17` |
| Llantas OTR e industriales · enduro y cross · motocarro | ninguna |

Tres fallas:

1. **Las de carro están incompletas por diseño.** Una llanta se identifica por
   `ANCHO/PERFIL R RIN` (`185/65R15`), que es lo que está escrito en el costado y en la
   factura. Guardar solo `185` hace que `185/65R15` no encuentre nada.
2. **Las bien modeladas eran justo las rotas.** Las cinco medidas de moto con formato
   completo (`90/90-17`…) son las que el bug `/`→`,` partía en dos términos en los CSV de
   Intelligent Search. Ya está corregido en `scripts/gen-sinonimos.py`, pero muestra que
   el formato completo no cabe cómodo en una lista de sinónimos.
3. **No escala.** Hay cientos de medidas reales; los CSV de sinónimos tienen un techo de
   20 KB por archivo.

## Propuesta: medidas como especificación filtrable, no como sinónimo

Mismo patrón que ya usa `react/VehicleSelector.js` para Marca vehículo → Modelo → Año
vía `vtex.search-graphql`: el dato vive en el catálogo como **especificación filtrable**
y la interfaz lo lee de los *facets*.

### 1. Especificaciones a crear

**Grupo "Medida de llanta"** (aplica a las hojas de llanta de carro y moto):

| Especificación | Tipo | Ejemplo carro | Ejemplo moto | Notas |
|---|---|---|---|---|
| `Ancho` | lista | `185`, `265` | `90`, `130` | mm; en moto también `2.75`, `3.00` (pulgadas) |
| `Perfil` | lista | `65`, `70` | `90`, `70` | serie; vacío en las medidas viejas tipo `700-16` |
| `Rin` | lista | `15`, `16`, `17` | `10`, `17`, `18` | pulgadas |
| `Construcción` | lista | `R` (radial), `D`/`-` (diagonal) | igual | separa `195R15` de `195/65R15` |
| `Medida completa` | texto | `185/65R15` | `90/90-17` | **una sola** cadena canónica, para buscar y mostrar |

Para carga/transporte hay que contemplar el formato viejo sin perfil (`700-16`,
`1100-20`): se modela con `Ancho=700`, `Rin=16`, `Construcción=D` y
`Medida completa=700-16`.

**Grupo "Rin"** (hojas de rines): `Diámetro` (15, 16, 17…), `Ancho de rin` (6J, 7J),
`Huecos` (4, 5, 6) y `Pernos (PCD)` (`4x100`, `5x114.3`) — sin esto un rin no se puede
elegir, y hoy solo hay `rines 15/16/17`.

### 2. A qué hojas aplica

- Carros: Llantas de automóvil · Llantas SUV y 4x4 · Llantas de van, camión y transporte ·
  Llantas OTR e industriales.
- Motos: Llantas delanteras · Llantas traseras · Llantas de scooter · Llantas de enduro y
  cross · Llantas para motocarro.
- Rines: Rines de acero · Rines de aluminio (carros) · Rines (motos).

### 3. Cómo se exponen en el filtro

En `category-filters.jsonc`, `filter-navigator.v3#rx` oculta hoy Marca vehículo, Año y
Modelo (`VEHICLE_FACETS` en `scripts/gen-categorias.py`) porque los maneja el selector de
vehículo. **Las medidas no se ocultan**: deben aparecer como facetas normales, en el orden
Ancho → Perfil → Rin. No hay que tocar `hiddenFacets`: lo que no está en esa lista se
muestra solo cuando los productos traen la especificación marcada como filtrable.

### 4. ¿Selector de medida?

Sí, y conviviendo con el de vehículo, no en su lugar: en las hojas de llanta las dos
entradas son legítimas —"las llantas de mi Corolla 2019" y "una 185/65R15"—. Lo natural es
reutilizar `VehicleSelector` con otra configuración (tres selects en cascada
Ancho → Perfil → Rin leyendo los mismos facets) y ponerlos como dos pestañas del mismo
panel. Es trabajo de theme, pequeño, pero **depende de que las especificaciones existan
en el catálogo**: sin datos, los selects salen vacíos.

### 5. Qué hacer con los 16 sinónimos actuales

- **Conservar** los de formato completo como respaldo de búsqueda mientras no existan las
  especificaciones: `llanta 90/90-17`, `100/90-17`, `130/70-17`, `90/90-10`, `2.75-18`,
  `195r15`, `700-16`, `1100-20`.
- **Eliminar** los de ancho suelto: `llanta 175`, `185`, `195`, `205`, `245`, `265` y
  `rines 15/16/17`. Generan falsos positivos (`185` aparece en referencias, potencias y
  medidas de otras cosas) y dan una sensación de cobertura que no existe.
- Una vez creadas las especificaciones, los sinónimos de medida sobran: se borran todos y
  el buscador trabaja contra los facets.

## Qué decide el usuario

1. ¿Se crean las especificaciones `Ancho`, `Perfil`, `Rin`, `Construcción` y
   `Medida completa` en el admin del catálogo? (Sin esto, lo demás no se sostiene.)
2. ¿Se eliminan ya los sinónimos de ancho suelto, o se dejan hasta que las
   especificaciones estén cargadas?
3. ¿Se construye el selector de medida junto al de vehículo en las hojas de llanta?
