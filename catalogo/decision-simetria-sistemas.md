# Simetría de sistemas: decisión pendiente antes de crear el árbol

El rediseño por sistemas quedó a medias. Solo `Carros > Eléctrico y electrónico`
tiene subcategorías (`Encendido`, `Arranque y carga`, `Gestión electrónica`,
`Eléctrico general`). Las demás macros grandes siguen planas, y **quedarían planas
para siempre si se suben así**.

Este documento no cambia nada: propone, para que lo aprueben o lo descarten antes
de la carga.

## 1. Las macros planas

Macros sin subcategorías y con 11 hojas o más:

| Macro | Hojas |
|---|---|
| Carros > Suspensión y dirección | 23 |
| Herramientas > Cuidado y limpieza | 23 |
| Carros > Frenos | 18 |
| Motos > Accesorios | 17 |
| Motos > Eléctrico y electrónico | 13 |
| Motos > Chasis y carrocería | 13 |
| Herramientas > Consumibles de taller | 13 |
| Carros > Iluminación | 11 |
| Motos > Frenos | 11 |
| Motos > Suspensión y dirección | 11 |

**153 hojas** en total. Las dos de Herramientas no estaban en el encargo original
pero tienen el mismo problema, así que van en la lista.

## 2. Por qué es irreversible

En VTEX **una categoría no se puede borrar**, solo desactivar. Eso tiene dos
consecuencias:

1. **Si mañana se subdivide Frenos**, las 18 hojas planas ya existen colgando
   directamente de la macro. Las nuevas subcategorías (`Freno de fricción`,
   `Hidráulico`, `ABS`) nacerían *al lado* de ellas, no por encima. Quedarían 18
   categorías huérfanas que no se pueden eliminar y que los sellers seguirán
   viendo en el selector.
2. **Mover un producto de categoría pierde su URL.** Cuando ya haya catálogo
   cargado, reorganizar significa romper enlaces y posicionamiento, además de
   migrar las ofertas de todos los sellers.

Dicho de otro modo: subdividir **antes** cuesta editar un JSON. Subdividir
**después** cuesta una migración y deja basura permanente en el catálogo.

## 3. Propuesta de subcategorías

Lista para aprobar, rechazar o ajustar macro por macro.

### Carros > Suspensión y dirección (23 → 3 subcategorías)
El propio nombre ya contiene dos sistemas distintos.

- **Suspensión** — Amortiguadores · Resortes (espirales) · Copas (bases) de
  amortiguador · Topes de amortiguador · Suspensión neumática (bolsas de aire) ·
  Coilovers y suspensión deportiva · Ballestas (muelles de hoja)
- **Dirección** — Cajas de dirección (cremalleras) · Bombas de dirección
  hidráulica · Mangueras de dirección hidráulica · Columnas y crucetas de
  dirección · Terminales de dirección · Axiales (brazos axiales)
- **Tren delantero y rueda** — Rótulas · Bujes · Tijeras · Barras estabilizadoras ·
  Links de estabilizadora · Balineras de rueda · Manzanas de rueda (cubos) ·
  Puntas de eje (manguetas) · Guardapolvos y fuelles · Kits de tren delantero

### Carros > Frenos (18 → 3)
- **Fricción** — Pastillas de freno · Discos de freno · Campanas de freno · Bandas
  de freno · Herrajes y pernos de pastillas · Sensores de desgaste de pastillas
- **Hidráulico** — Mordazas (calipers) · Pistones y kits de caliper · Cilindros de
  freno · Bombas de freno · Servofreno (booster) · Bombas de vacío · Mangueras y
  líneas de freno · Depósitos de líquido de frenos · Kits de reparación de frenos
- **ABS y freno de mano** — Sensores ABS · Módulos y unidades ABS · Guayas de
  freno de mano

### Motos > Frenos (11 → 2)
Mismo criterio que Carros, para que las dos secciones se lean igual.
- **Fricción** — Pastillas de freno · Bandas de freno · Discos de freno · Campanas
  de freno
- **Hidráulico y mando** — Mordazas (calipers) · Bombas de freno · Cilindros de
  freno · Mangueras de freno · Maniguetas de freno · Kits de reparación de frenos ·
  Depósitos de líquido de frenos

### Motos > Eléctrico y electrónico (13 → 4)
Replica exacta del modelo de Carros, que es lo que pide la simetría.
- **Encendido** — CDI (módulos de encendido) · Bobinas de alta · Bujías ·
  Capuchones de bujía
- **Arranque y carga** — Reguladores (rectificadores) · Estatores (platos de
  bobinas)
- **Gestión electrónica** — Sensores · Tableros, tacómetros y velocímetros
- **Eléctrico general** — Fusibles y relés · Suiches y comandos · Flashers ·
  Pitos · Cableado y conectores

### Carros > Iluminación (11 → 3)
- **Exterior** — Farolas · Stops · Direccionales · Luces de placa y cortesía
- **Auxiliar** — Exploradoras · Barras LED · Luces DRL (diurnas)
- **Bombillos** — Luces LED · Bombillos halógenos · Xenón (HID) · Luces interiores

### Motos > Suspensión y dirección (11 → 2)
- **Suspensión** — Amortiguadores traseros · Barras telescópicas (botellas) · Kits
  de barras (retenedores y guardapolvos) · Resortes · Tijeras (basculantes) ·
  Rodamientos de tijera · Bujes
- **Dirección** — Cunas de dirección · Manubrios · Puños y contrapesos · Tés y
  triples de dirección

### Motos > Chasis y carrocería (13 → 2)
- **Carrocería** — Carenajes y plásticos · Tanques de gasolina y tapas · Sillines ·
  Colines y parrillas traseras · Guardabarros · Portaplacas · Agarraderas
- **Estructura y apoyos** — Chasis y subchasis · Patas y caballetes · Pedalines y
  soportes · Pedales de cambio y freno · Cajas de filtro de aire · Ejes de rueda

### Motos > Accesorios (17 → 3)
- **Equipaje** — Maletas y baúles · Alforjas y mochilas · Parrillas y portamaletas ·
  Pulpos y redes
- **Protección** — Defensas (mataperros) · Sliders y cubrecárter · Pijamas
  (cubremotos) · Cúpulas (parabrisas) y soportes · Cubrepuños y cubremanos
- **Confort y electrónica** — Espejos · Soportes de celular · Forros de sillín ·
  Rampas y caballetes · Cubrerayos y adhesivos · Cargadores USB ·
  Intercomunicadores · Parlantes

### Herramientas (36 → pendiente)
`Cuidado y limpieza` (23) y `Consumibles de taller` (13) tienen el mismo problema.
No se proponen aquí porque no estaban en el encargo; conviene decidirlas junto con
el resto.

## 4. Recomendación: cargar por macro, no todo de golpe

Subir las 567 categorías en una sola operación obliga a acertar en todo a la vez,
y lo que salga mal queda fijo. La alternativa es cargar por tandas, empezando por
las macros que ya están resueltas.

**Tanda 1 — listas para subir hoy.** Estructura coherente, sin decisiones abiertas.

- Carros > Llantas y rines *(ya creada, con producto real)*
- Carros > Baterías
- Carros > Filtros
- Carros > Lubricantes y mantenimiento
- Carros > Eléctrico y electrónico *(el modelo de sistemas)*
- Motos > Llantas y rines · Baterías · Filtros · Lubricantes

Sirven además para validar el flujo completo del seller (publicar, llenar
especificaciones, aparecer en los filtros, que Cris lo encuentre por vehículo)
sobre un universo pequeño.

**Tanda 2 — después de aprobar este documento.** Las 8 macros de arriba, ya
subdivididas.

**Tanda 3 — el resto**, cuando las dos primeras estén verificadas en la tienda.

Un detalle que conviene tener presente: el índice de Intelligent Search tarda
entre 1 y 5 minutos en reflejar cambios. Al cargar por tandas conviene esperar y
verificar en la tienda, no solo contra la API — un error de nombres solo se ve
desde el storefront.

## 5. Qué se necesita decidir

1. ¿Se subdividen las 8 macros antes de la carga? (153 hojas cambian de ruta;
   ninguna está creada todavía en VTEX, así que hoy no cuesta nada)
2. ¿Se aprueban los nombres de subcategoría propuestos arriba?
3. ¿Se incluyen las dos macros de Herramientas?
4. ¿Se adopta la carga por tandas?
