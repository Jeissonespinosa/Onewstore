/*
 * "También te puede interesar", debajo de los resultados.
 *
 * Tres bloques, y lo que los separa NO es estetico: es cuanta certeza
 * tenemos de que el producto le sirve al cliente que lo esta viendo.
 *
 *   1. Sirve para cualquier vehiculo   certeza total, se afirma
 *   2. Otros de esta categoria         hay que advertir, carro por carro
 *   3. Descuentos de nuestros vendedores  es pauta, lleva sello
 *
 * Mezclarlos en una sola fila de "recomendados" es lo que genera
 * devoluciones: una pastilla de Aveo ofrecida sin rotulo a alguien que
 * busca para un Corolla se compra y se devuelve.
 *
 * CADA BLOQUE SE PINTA SOLO SI TIENE CONTENIDO. Con el catalogo de hoy
 * —53 productos, casi uno por categoria— el segundo bloque casi siempre
 * viene vacio y el tercero no esta configurado. Eso no es un error: es la
 * pagina diciendo la verdad sobre lo que hay.
 *
 * POR QUE NO DICE "LO MAS VENDIDO". Porque no hay ventas todavia. Poner ese
 * rotulo sobre productos que nadie ha comprado es inventarse un dato, y el
 * dia que haya ventas de verdad nadie va a creerle al rotulo.
 */
import React, { useEffect, useState } from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import indice from './cris-index.json'
import { loDeAbajo } from './buscar'
import { seccionDe, rutaDe, leer, nombreDe, vehiculoDeRuta } from './vehiculo'
import vehiculos from './data/vehiculos-colombia.json'

const CSS_HANDLES = ['tambienTeInteresa']
const RED = '#FF371E'
const VERDE = '#0A7A3D'
const AMBAR = '#B4690E'

/* Las macros que el arbol marca universales: de ahi salen los productos que
   le sirven a cualquiera. Herramientas entra siempre, para carro y moto. */
const macrosUniversales = seccion => indice.nodos
  .filter(n => n.nivel === 'macro' && n.compatibilidad === 'universal' &&
    n.seccion === seccion)
  .map(n => n.path)

/* POR QUE SE INTERCALAN. loDeAbajo solo pide las primeras cuatro para no
   disparar diez busquedas. Pegando una lista detras de la otra, en motos
   las cuatro se las comian cascos, accesorios, ropa y tecnologia, y
   herramientas no aparecia nunca — y una copa o un gato le sirven igual al
   motociclista. Intercalando, cada lado pone dos. */
const universalesDe = (seccion, salvo) => {
  const propias = macrosUniversales(seccion === 'motos' ? 'Motos' : 'Carros')
  const taller = macrosUniversales('Herramientas')
  const mezcla = []
  for (let i = 0; i < Math.max(propias.length, taller.length); i++) {
    if (propias[i]) mezcla.push(propias[i])
    if (taller[i]) mezcla.push(taller[i])
  }
  /* Una macro no se recomienda a si misma: en /carros/accesorios los
     accesorios ya estan arriba, lo que falta es herramientas y tecnologia. */
  return mezcla.filter(p => p !== salvo)
}

/* La macro en la que esta la pagina: /carros/accesorios/tapetes -> /carros/accesorios */
const macroDe = ruta => {
  const partes = String(ruta || '').split('?')[0].split('/').filter(Boolean)
  return partes.length >= 2 ? '/' + partes[0] + '/' + partes[1] : null
}

const nodoDe = ruta => {
  const limpia = String(ruta || '').split('?')[0].replace(/\/+$/, '')
  if (!limpia) return null
  return indice.nodos.find(n => n.path === limpia) || null
}

/* A QUIEN SE NOMBRA EN LA NOTA. El carro que la pagina ESTA mostrando, no el
   guardado. Si alguien con un Aveo guardado esta viendo resultados de Corolla,
   decirle "no estan declarados para tu Aveo" lo confunde mas de lo que lo
   ayuda: lo que tiene al frente es el Corolla.
   "filtrando" sale del mismo dato, asi que no puede quedar un bloque que
   filtra nombrando un carro distinto. */
export const aQuienNombrar = (enLaUrl, guardado) => {
  const filtrando = !!(enLaUrl && enLaUrl.marca)
  const enContexto = filtrando ? enLaUrl : guardado
  return {
    filtrando,
    nombre: enContexto && enContexto.marca ? nombreDe(enContexto) : null,
  }
}

export default function TambienTeInteresa({ titulo = 'También te puede interesar' }) {
  const handles = useCssHandles(CSS_HANDLES)
  const { route } = useRuntime()
  const seccion = seccionDe(rutaDe(route))

  const [datos, setDatos] = useState(null)
  const [vehiculo, setVehiculo] = useState(null)
  const [enLaUrl, setEnLaUrl] = useState(null)

  /* OJO CON LA DEPENDENCIA. useRuntime() devuelve un objeto route NUEVO en
     cada render, asi que depender de el relanzaba el efecto sin parar: cada
     corrida abortaba el fetch de la anterior y el bloque no pintaba nunca.
     Se depende de la RUTA, que es un string y solo cambia al navegar. */
  const ruta = rutaDe(route)

  /* POR QUE NO SE ABORTA LA PETICION. Lo intente con AbortController y el
     bloque no pinto NUNCA: en una pagina de categoria el efecto se vuelve a
     correr durante la hidratacion y la limpieza cancelaba el fetch en vuelo
     una y otra vez. Lo que hace falta no es cancelar la red, es ignorar la
     respuesta vieja — eso es lo que hace "vivo". */
  useEffect(() => {
    let vivo = true
    const nodo = nodoDe(ruta)
    setVehiculo(seccion === 'herramientas' ? null : leer(seccion))
    /* "Otros de esta categoria" solo tiene sentido cuando la pagina ESTA
       filtrando por un carro: ahi el cliente ve lo suyo arriba y esto es lo
       que hay para otros. Sin filtro, la galeria de arriba ya muestra la
       categoria entera y este bloque repetiria los mismos productos. */
    let deLaUrl = null
    try {
      deLaUrl = vehiculoDeRuta(window.location.pathname, window.location.search,
        vehiculos[seccion === 'motos' ? 'motos' : 'carros'] || {})
    } catch (e) {
      deLaUrl = null
    }
    setEnLaUrl(deLaUrl)
    const hayFiltro = !!deLaUrl
    loDeAbajo({
      categoria: hayFiltro && nodo ? nodo.path : null,
      /* En una categoria que ya es universal no se repite SU macro —todo lo
         de arriba ya salio de ahi—, pero las otras macros universales si
         aportan: en accesorios sirve ver herramientas, y al contrario. */
      universales: universalesDe(
        seccion,
        nodo && nodo.compatibilidad === 'universal' ? macroDe(ruta) : null),
    })
      .then(d => { if (vivo) setDatos(d) })
      .catch(() => { if (vivo) setDatos(null) })
    return () => { vivo = false }
  }, [ruta, seccion])

  if (!datos) return null
  const { universales, deLaCategoria, patrocinados } = datos
  if (!universales.length && !deLaCategoria.length && !patrocinados.length) return null

  const { nombre, filtrando } = aQuienNombrar(enLaUrl, vehiculo)
  /* En una pagina de motos decir "no dependen del carro" suena a que la
     tienda no sabe que esta vendiendo. */
  const cosa = seccion === 'motos' ? 'moto' : 'carro'

  const css = `
    .rx-ab { margin: 2rem 0 0; }
    .rx-ab__titulo { font-size: 1.125rem; font-weight: 800; letter-spacing: -.01em;
      color: #010101; margin: 0 0 1rem }
    .rx-ab__bloque { margin-bottom: 1.75rem }
    .rx-ab__cab { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
      margin-bottom: .125rem }
    .rx-ab__h { font-size: .9375rem; font-weight: 800; color: #010101 }
    .rx-ab__sello { font-size: .625rem; font-weight: 800; letter-spacing: .06em;
      text-transform: uppercase; border-radius: 999px; padding: .1875rem .5rem }
    .rx-ab__sello--ok { background: rgba(10,122,61,.12); color: ${VERDE} }
    .rx-ab__sello--ojo { background: rgba(180,105,14,.12); color: ${AMBAR} }
    .rx-ab__sello--pauta { background: #ECECEF; color: #6B6B70 }
    .rx-ab__nota { font-size: .75rem; color: #55555C; margin: 0 0 .75rem; line-height: 1.45 }
    .rx-ab__fila { display: grid; gap: .75rem;
      grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)) }
    .rx-ab__card { border: 1px solid rgba(1,1,1,.1); border-radius: .75rem; padding: .625rem;
      display: flex; flex-direction: column; gap: .375rem; text-decoration: none;
      color: inherit; background: #fff }
    .rx-ab__card:hover { border-color: ${RED} }
    .rx-ab__img { width: 100%; aspect-ratio: 1; object-fit: contain; background: #F7F7F8;
      border-radius: .5rem }
    .rx-ab__nom { font-size: .75rem; font-weight: 600; line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden }
    .rx-ab__para { font-size: .6875rem; font-weight: 700; color: ${AMBAR} }
    .rx-ab__precio { font-size: .875rem; font-weight: 800; color: #010101; margin-top: auto }
    .rx-ab__sin { font-size: .75rem; color: #9A9AA2 }
  `

  const tarjeta = (p, conPara) => (
    <a key={p.id} className="rx-ab__card" href={p.url || '#'}>
      {p.imagen ? <img className="rx-ab__img" src={p.imagen} alt="" loading="lazy" /> : null}
      <span className="rx-ab__nom">{p.nombre}</span>
      {/* El rotulo del carro es lo que separa una recomendacion de un
          problema de servicio. Solo se omite si el producto no declara
          ninguno, que es justamente el caso universal. */}
      {conPara && p.paraQue ? <span className="rx-ab__para">Para {p.paraQue}</span> : null}
      {p.precioTexto
        ? <span className="rx-ab__precio">{p.precioTexto}</span>
        : <span className="rx-ab__sin">Consultar precio</span>}
    </a>
  )

  const bloque = (lista, h, sello, claseSello, nota, conPara) => (
    lista.length ? (
      <div className="rx-ab__bloque">
        <div className="rx-ab__cab">
          <span className="rx-ab__h">{h}</span>
          <span className={`rx-ab__sello ${claseSello}`}>{sello}</span>
        </div>
        {nota ? <p className="rx-ab__nota">{nota}</p> : null}
        <div className="rx-ab__fila">{lista.map(p => tarjeta(p, conPara))}</div>
      </div>
    ) : null
  )

  return (
    <section className={`rx-ab ${handles.tambienTeInteresa || ''}`}>
      <style>{css}</style>
      <h2 className="rx-ab__titulo">{titulo}</h2>
      {bloque(universales, 'Sirve para cualquier vehículo', 'Certeza total',
        'rx-ab__sello--ok',
        `No dependen de la ${cosa}: aceite por norma, herramienta, líquidos, accesorios.`,
        false)}
      {bloque(filtrando ? deLaCategoria : [], 'Otros de esta categoría', 'Hay que mirar',
        'rx-ab__sello--ojo',
        nombre
          ? `No están declarados para tu ${nombre}. Cada uno dice para qué ${cosa} sirve.`
          : `Cada uno dice para qué ${cosa} sirve. Revisa que coincida con la tuya.`,
        true)}
      {bloque(patrocinados, 'Descuentos de nuestros vendedores', 'Patrocinado',
        'rx-ab__sello--pauta', null, true)}
    </section>
  )
}

TambienTeInteresa.schema = {
  title: 'También te puede interesar',
  type: 'object',
  properties: {
    titulo: { title: 'Título', type: 'string', default: 'También te puede interesar' },
  },
}
