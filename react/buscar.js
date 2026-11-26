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
    /* Para que carro sirve, de las especificaciones de compatibilidad. Un
       repuesto de calce estricto no se puede ofrecer sin decirlo: la
       pastilla de un Aveo en la lista de alguien con Corolla, sin rotulo,
       se compra y se devuelve. */
    paraQue: paraQueSirve(p),
  }
}

function paraQueSirve(p) {
  const props = {}
  ;(p.properties || []).forEach(x => { props[x.name] = x.values || [] })
  const marcas = props['Marca vehículo'] || []
  const modelos = props.Modelo || []
  if (!marcas.length) return null
  if (marcas.length > 2 || modelos.length > 2) return 'varios vehículos'
  if (!modelos.length) return marcas.join(' y ')
  return marcas.slice(0, 1).concat(modelos.slice(0, 2)).join(' ')
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

/* ---------------------------------------------------------------------------
   LO QUE VA DEBAJO DE LOS RESULTADOS

   Tres bloques, y lo que los separa no es la estetica: es cuanta certeza
   tenemos de que el producto le sirve.

     universales   no dependen del carro. Se afirman sin reservas.
     deLaCategoria mismo tipo de repuesto, otros vehiculos. Hay que AVISARLO
                   en cada tarjeta o terminan en devolucion.
     patrocinados  lo que se le vende al comercio. Lleva sello.

   Cada uno falla y se pinta solo: si una llamada se cae, las otras siguen.

   OJO CON LA RUTA DE CATEGORIA. En este endpoint el filtro NO va como
   "/carros/frenos?map=c,c" —esa es la forma de la tienda y aqui devuelve
   cero sin avisar— sino con la llave en la ruta:

     /product_search/category-1/carros/category-2/frenos

   Comprobado contra la tienda: la primera forma da 0 y la segunda 3.
   --------------------------------------------------------------------------- */
const rutaFacet = ruta => (ruta || '')
  .split('/')
  .filter(Boolean)
  .map((seg, i) => 'category-' + (i + 1) + '/' + seg)
  .join('/')

const sinRepetir = (lista, fuera) => {
  const ya = new Set(fuera || [])
  return lista.filter(p => (ya.has(p.id) ? false : ya.add(p.id)))
}

/* Si un endpoint no contesta, el bloque entero no puede quedarse colgado.
   Paso: sponsored_products no respondia desde la pagina y, como las tres
   llamadas iban en un Promise.all, el bloque no pintaba NUNCA — ni siquiera
   los universales, que si habian respondido. Lo que no llega a tiempo se
   trata como vacio. */
const ESPERA = 4000

const conTope = promesa => Promise.race([
  promesa,
  new Promise(resolver => setTimeout(() => resolver(null), ESPERA)),
])

export async function loDeAbajo({ categoria, universales, excluir, senal, cuantos = 8 }) {
  const uno = async url => {
    const d = await conTope(pedir(BASE + url, senal))
    return ((d && d.products) || []).map(aProducto)
  }
  const deCat = categoria
    ? uno('/product_search/' + rutaFacet(categoria) + '?count=' + cuantos)
    : Promise.resolve([])
  /* Los universales salen de las categorias que el indice marca asi:
     accesorios, tecnologia, cascos, ropa y toda herramientas. */
  const deUni = Promise.all(
    (universales || []).slice(0, 4).map(r =>
      uno('/product_search/' + rutaFacet(r) + '?count=' + cuantos))
  ).then(ls => [].concat.apply([], ls))
    /* UN UNIVERSAL NO DECLARA VEHICULO. El arbol marca universal la MACRO
       (/motos/accesorios), pero adentro hay hojas que no lo son: una defensa
       tubular es de un modelo exacto. Buscando por macro se colaba, y quedaba
       bajo el rotulo "sirve para cualquier vehiculo" — justo la promesa que
       produce devoluciones. El producto manda sobre el arbol: si declara
       marca de vehiculo, no entra aqui; cae en "otros de esta categoria",
       donde si lleva rotulo. */
    .then(ls => ls.filter(p => !p.paraQue))

  const [uni, cat, pauta] = await Promise.all([
    deUni,
    deCat,
    uno('/sponsored_products/?query=&count=3'),
  ])
  const fuera = (excluir || []).slice()
  return {
    universales: sinRepetir(uni, fuera).slice(0, cuantos),
    deLaCategoria: sinRepetir(cat, fuera).slice(0, cuantos),
    patrocinados: sinRepetir(pauta, fuera).slice(0, 3),
  }
}
