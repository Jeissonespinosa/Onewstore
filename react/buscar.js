/*
 * Lo que la tienda sabe mientras alguien escribe.
 *
 * Cuatro llamadas a Intelligent Search, en paralelo y normalizadas a formas
 * planas para que el componente no tenga que conocer el JSON de VTEX:
 *
 *   sugerencias   terminos que la gente ya busco, con su categoria
 *   marcas        del facet "brand" de ESA busqueda, con su conteo
 *   productos     para mostrarlos con foto y precio
 *   patrocinados  productos y banner de pauta (lo que se le vende al comercio)
 *
 * CADA UNA FALLA SOLA. Si el autocompletado se cae, las otras tres siguen
 * pintando: un panel a medias sirve, un panel en blanco no.
 *
 * OJO CON LAS SUGERENCIAS: VTEX las aprende del trafico. En una tienda nueva
 * vienen vacias casi siempre (medido: 0 o 1 termino para "llanta",
 * "pastilla", "filtro", "bateria", "aceite"). Por eso el panel NO se apoya en
 * ellas: las categorias salen del indice local, que conoce las 593 del arbol
 * con sus sinonimos desde el primer dia. Copiar a Exito al pie de la letra
 * daria una columna izquierda vacia durante meses.
 */
const BASE = '/api/io/_v/api/intelligent-search'

/* El precio de Intelligent Search YA VIENE EN PESOS, no en centavos.
   Comprobado contra el catalogo: basePrice 1591272 en /api/pricing/prices/9
   es el mismo 1591272 que entrega el buscador, y otros llegan con decimales
   (670435.92), que en centavos no existirian. Dividir por 100 mostraba la
   llanta de camion a $15.913 en vez de $1.591.272. */
const aPesos = n => (typeof n === 'number' ? n : null)

const pesos = n =>
  n === null || n === undefined
    ? ''
    : '$ ' + Math.round(n).toLocaleString('es-CO')

async function pedir(url, senal) {
  try {
    const r = await fetch(url, { signal: senal })
    if (!r.ok) return null
    return await r.json()
  } catch (e) {
    /* abortada o caida: quien llama decide que hacer con el null */
    return null
  }
}

/* De la respuesta de product_search a lo que pinta una tarjeta. */
export function aProducto(p) {
  const item = (p.items || [])[0] || {}
  const oferta = ((item.sellers || [])[0] || {}).commertialOffer || {}
  /* Price 0 no es gratis: es un producto sin precio cargado. Mostrar "$ 0"
     se lee como una oferta y no se puede comprar. */
  const bruto = aPesos(oferta.Price)
  const precio = bruto > 0 ? bruto : null
  const lista = aPesos(oferta.ListPrice)
  return {
    id: p.productId,
    nombre: p.productName,
    marca: p.brand,
    url: p.link || (p.linkText ? '/' + p.linkText + '/p' : null),
    imagen: ((item.images || [])[0] || {}).imageUrl || null,
    precio,
    precioTexto: pesos(precio),
    /* Solo se muestra tachado si de verdad hay descuento. */
    antes: lista && precio && lista > precio ? pesos(lista) : null,
    agotado: !(oferta.AvailableQuantity > 0),
  }
}

export async function buscarEnTienda(q, senal) {
  const texto = (q || '').trim()
  if (texto.length < 2) {
    return { sugerencias: [], marcas: [], productos: [], patrocinados: [], banner: null }
  }
  const enc = encodeURIComponent(texto)

  const [auto, facetas, prods, patro, banners] = await Promise.all([
    pedir(`${BASE}/autocomplete_suggestions?query=${enc}`, senal),
    pedir(`${BASE}/facets/trade-policy/1?query=${enc}`, senal),
    pedir(`${BASE}/product_search?query=${enc}&count=6`, senal),
    pedir(`${BASE}/sponsored_products?query=${enc}`, senal),
    pedir(`${BASE}/banners?query=${enc}`, senal),
  ])

  /* Las sugerencias traen atributos (Departamento, Categoria...): se usa el
     mas especifico, que es el que le dice al cliente donde va a aterrizar. */
  const sugerencias = ((auto && auto.searches) || [])
    .filter(s => s && s.term)
    .slice(0, 6)
    .map(s => {
      const attrs = s.attributes || []
      const ultimo = attrs[attrs.length - 1]
      return {
        termino: s.term,
        donde: ultimo ? ultimo.labelValue : null,
        cuantos: s.count || null,
      }
    })

  const facetDe = clave =>
    (((facetas && facetas.facets) || []).find(f => f.key === clave) || {}).values || []

  /* El href lo calcula VTEX ("llanta/michelin?map=ft,brand"): se usa el suyo
     en vez de armarlo a mano, que es donde se rompen estas rutas. */
  const marcas = facetDe('brand')
    .slice(0, 5)
    .map(v => ({
      nombre: v.name,
      valor: v.value,
      cuantos: v.quantity,
      url: v.href ? '/' + String(v.href).replace(/^\//, '') : null,
    }))

  const productos = ((prods && prods.products) || []).map(aProducto)

  const patrocinados = (Array.isArray(patro) ? patro : [])
    .slice(0, 2)
    .map(aProducto)

  const b = ((banners && banners.banners) || [])[0] || null
  const banner = b ? { html: null, imagen: b.imageUrl || null, url: b.targetUrl || null } : null

  return { sugerencias, marcas, productos, patrocinados, banner }
}

/* Lo mas buscado, para cuando la caja esta vacia. Tambien se alimenta del
   trafico, asi que puede venir corto o vacio: quien llama no debe contar con
   que traiga algo. */
export async function masBuscado(senal) {
  const d = await pedir(`${BASE}/top_searches`, senal)
  return ((d && d.searches) || []).slice(0, 6).map(s => s.term).filter(Boolean)
}

export { pesos as formatearPesos }
