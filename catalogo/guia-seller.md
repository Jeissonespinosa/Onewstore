# Guía para publicar productos

Qué tiene que llenar un seller para que su producto se encuentre. Acompaña a
`plantilla-seller.csv`, que lista cada categoría con sus especificaciones, el
tipo de campo y los valores admitidos.

## La regla que más duele si se ignora

**Un producto sin especificaciones existe pero es invisible.** Entra a la
categoría, aparece si alguien navega hasta ella, pero **no sale en ningún
filtro**. Y como la mayoría de la gente llega filtrando (por vehículo, por
medida, por viscosidad), en la práctica no se vende.

No da error al publicar. Nadie se entera hasta que un cliente no lo encuentra.

## Campos obligatorios

| Campo | Por qué |
|---|---|
| **Categoría** | La más específica que aplique (`Aceite de motor`, no `Lubricantes`) |
| **Marca** | El fabricante del repuesto (Bosch, Mobil, Michelin). Debe existir ya; si falta, se pide antes de publicar |
| **Nombre** | Con la medida o el dato clave adentro: *"Llanta Michelin Energy XM2+ 185/65R15"* |
| **Referencia** | El código del fabricante |
| **Marca vehículo · Modelo · Año** | La compatibilidad. Sin esto el buscador por vehículo no lo encuentra nunca |
| **Las especificaciones de su categoría** | Ver `plantilla-seller.csv` |

## Cómo llenar la compatibilidad

Son **tres campos de selección múltiple**: un repuesto sirve para varias motos
o carros a la vez.

```
Marca vehículo:  Toyota, Ford, Chevrolet, Nissan
Modelo:          Hilux, Ranger, D-Max, Frontier NP300
Año:             2010 … 2024
```

**El nombre del modelo tiene que ser exacto al de la lista.** No vale escribir
"Frontier" si en la lista dice "Frontier NP300": el producto terminaría
asociado a otro vehículo. En la plantilla van todos los valores admitidos.

## Valores cerrados, nunca texto libre

Si un seller escribe `185 mm` y otro `185`, salen dos filtros distintos y el
comprador ve la mitad del inventario en cada uno. Por eso casi todas las
especificaciones son listas: se elige, no se escribe.

Las dos excepciones son `Medida` e `Índice de carga y velocidad`, que todavía
no tienen valores cargados.

## Único vs Múltiple

| Campo | Significa | Ejemplo |
|---|---|---|
| **Único** | El producto tiene un solo valor | Un aceite es 20W50, no también 10W30 |
| **Múltiple** | Puede tener varios | Una llanta puede ser Runflat *y* Reforzada *y* All Season |

Esto **no se puede cambiar después** sin crear otra especificación y
re-etiquetar todos los productos.

## Qué revisar antes de dar por buena una publicación

1. El producto aparece en su categoría.
2. **Aparece al filtrar** por cada especificación que se llenó.
3. El buscador por vehículo lo encuentra con marca, modelo y año.

El punto 2 es el que se salta todo el mundo. Un producto puede verse perfecto
en la ficha y ser invisible en los filtros.

**El índice tarda entre 1 y 5 minutos.** Si acabas de publicar y no aparece
filtrando, espera antes de dar algo por roto.

## Un error real que ya nos pasó

Cargamos una llanta Nissan con el modelo `Frontier`, pero en la base ese
nombre es de **Kia** (el camión K2500); el Nissan se llama `Frontier NP300`.
La llanta quedó asociada al vehículo equivocado y nadie lo habría notado sin
revisar desde la tienda.

Por eso el punto 3: no basta con que el dato quede guardado.
