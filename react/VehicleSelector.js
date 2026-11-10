/*
 * Busca por vehiculo — Marca -> Modelo -> Ano (en cascada).
 *
 * Lee las opciones de los facets del catalogo (especificaciones
 * filtrables llamadas como brandFacet / modelFacet / yearFacet) para
 * la categoria base: props query/map o, si no se pasan, la ruta de
 * la pagina actual (/carros/frenos/pastillas-de-freno -> map c,c,c),
 * asi un mismo bloque sirve para todas las paginas de categoria.
 * Cada paso filtra al
 * siguiente: al elegir marca se vuelven a pedir los facets con esa
 * marca aplicada (solo quedan sus modelos), y al elegir modelo solo
 * quedan los anos de ese modelo. Al pulsar el boton navega a la
 * pagina de busqueda de la categoria con los filtros aplicados:
 * /<query>/<marca>/<modelo>/<ano>?map=<map>,<k1>,<k2>,<k3>
 *
 * Mientras el catalogo no tenga esas especificaciones, los selects
 * quedan vacios (placeholder) y el boton deshabilitado.
 */
import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-apollo'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import vehicleFacets from './queries/vehicleFacets.gql'

const CSS_HANDLES = [
  'vehicleSelector',
  'vehicleSelectorHeader',
  'vehicleSelectorIcon',
  'vehicleSelectorTitle',
  'vehicleSelectorField',
  'vehicleSelectorSelect',
  'vehicleSelectorButton',
]

const RED = '#FF371E'
const INK = '#010101'

const styles = {
  root: { width: '100%', fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 1rem' },
  title: { margin: 0, color: INK, fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' },
  field: { position: 'relative', margin: '0 0 0.6rem' },
  select: {
    width: '100%',
    minHeight: '3rem',
    padding: '0 2.75rem 0 1.25rem',
    border: '1px solid rgba(1,1,1,0.08)',
    borderRadius: 999,
    background: '#ffffff',
    color: INK,
    fontFamily: 'inherit',
    fontSize: '0.9375rem',
    fontWeight: 500,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    outline: 'none',
    cursor: 'pointer',
  },
  selectDisabled: { background: 'rgba(255,255,255,0.55)', color: 'rgba(1,1,1,0.38)', cursor: 'default' },
  chevron: {
    position: 'absolute',
    right: '1.1rem',
    top: '50%',
    width: 12,
    height: 12,
    marginTop: -6,
    pointerEvents: 'none',
  },
  button: {
    display: 'block',
    width: '100%',
    minHeight: '3rem',
    marginTop: '0.9rem',
    border: 0,
    borderRadius: 999,
    background: RED,
    color: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '0.9375rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'filter 0.18s ease, opacity 0.18s ease',
  },
  buttonDisabled: { opacity: 0.45, cursor: 'default' },
}

function CarIcon() {
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12 L6.5 5.5 Q7 4 8.5 4 L21.5 4 Q23 4 23.5 5.5 L26 12" />
      <path d="M2.5 12 L27.5 12 L27.5 18 L2.5 18 Z" />
      <path d="M5 18 L5 20.5 M25 18 L25 20.5" />
      <circle cx="8" cy="15" r="1" fill={INK} stroke="none" />
      <circle cx="22" cy="15" r="1" fill={INK} stroke="none" />
    </svg>
  )
}

// Misma estetica que CarIcon (trazo 2.2, esquinas redondas) para la seccion de motos.
function MotoIcon() {
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6.5" cy="16" r="4" />
      <circle cx="23.5" cy="16" r="4" />
      <path d="M6.5 16 L11.5 9.5 L17.5 9.5 L23.5 16" />
      <path d="M17.5 9.5 L20 4.5 L23 4.5" />
      <path d="M9.5 9.5 L8 7 L13.5 7" />
    </svg>
  )
}

function Chevrons() {
  return (
    <svg style={styles.chevron} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4.5 L6 1.5 L9 4.5" />
      <path d="M3 7.5 L6 10.5 L9 7.5" />
    </svg>
  )
}

function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/* VTEX a veces entrega la ruta interna de routing
   (/_v/segment/routing/vtex.store@2.x/subcategory/4/carros/llantas-y-rines/llantas).
   Nos quedamos con la ruta publica, la que ve el cliente. */
function publicPath(path) {
  const clean = (path || '').split('?')[0]
  if (clean.indexOf('/_v/') !== 0) return clean
  const parts = clean.split('/').filter(Boolean)
  for (let i = parts.length - 1; i > 0; i -= 1) {
    if (/^\d+$/.test(parts[i])) return `/${parts.slice(i + 1).join('/')}`
  }
  return clean
}

function parseBase(query, map) {
  const q = (query || '').split('/').filter(Boolean)
  const m = (map || '').split(',').filter(Boolean)
  let level = 0
  return q.map((value, i) => {
    const key = m[i] || 'c'
    if (key === 'c' || key.indexOf('category-') === 0) {
      level += 1
      return { key: 'c', fkey: `category-${level}`, value }
    }
    return { key, fkey: key, value }
  })
}

function findFacet(facets, wanted) {
  const w = normalize(wanted)
  return (facets || []).find(f => normalize(f.name) === w || normalize(f.values && f.values[0] && f.values[0].key) === w)
}

const VehicleSelector = ({
  title = 'Busca por vehículo',
  buttonLabel = 'Buscar repuestos',
  brandFacet = 'Marca vehículo',
  yearFacet = 'Año',
  modelFacet = 'Modelo',
  brandLabel = 'Marca',
  yearLabel = 'Año',
  modelLabel = 'Modelo',
  query = '',
  map = '',
  layout = 'column',
  subtitle = '',
  brands = [],
  brandsSpeed = 45,
  vehicle = 'auto',
}) => {
  const handles = useCssHandles(CSS_HANDLES)
  const { navigate, route } = useRuntime()
  const winPath =
    typeof window !== 'undefined' && window.location ? window.location.pathname : ''
  const routePath = publicPath(winPath || (route && route.path) || '')
  const base = useMemo(() => {
    if (query) return parseBase(query, map)
    const segments = (routePath || '').split('?')[0].split('/').filter(Boolean)
    return parseBase(segments.join('/'), segments.map(() => 'c').join(','))
  }, [query, map, routePath])

  // Icono segun la seccion: prop "vehicle" o, en auto, el primer segmento
  // de la categoria base (/motos/... -> moto, lo demas -> carro).
  const isMoto = vehicle === 'motos' || (vehicle === 'auto' && base.length > 0 && normalize(base[0].value) === 'motos')

  // Cada seleccion guarda {key, value} del facet para poder
  // reenviarla como filtro en la siguiente consulta.
  const [brand, setBrand] = useState(null)
  const [model, setModel] = useState(null)
  const [year, setYear] = useState(null)

  const picked = [brand, model, year].filter(Boolean)
  const { data } = useQuery(vehicleFacets, {
    variables: {
      selectedFacets: base
        .map(b => ({ key: b.fkey, value: b.value }))
        .concat(picked.map(p => ({ key: p.key, value: p.value }))),
    },
    ssr: false,
    errorPolicy: 'ignore',
  })
  const facets = (data && data.facets && data.facets.facets) || []

  const brandF = findFacet(facets, brandFacet)
  const modelF = findFacet(facets, modelFacet)
  const yearF = findFacet(facets, yearFacet)

  const options = f => (f && f.values ? f.values : [])

  const ready = Boolean(brand)

  const onSubmit = e => {
    e.preventDefault()
    if (!ready) return
    const segments = base.map(b => b.value).concat(picked.map(p => p.value))
    const keys = base.map(b => b.key).concat(picked.map(p => p.key))
    navigate({ to: `/${segments.join('/')}`, query: `map=${keys.join(',')}` })
  }

  // Con una sola marca (o un solo modelo) el select mantiene su
  // valor aunque cambie la lista: se preserva la opcion elegida.
  const renderSelect = (f, value, setValue, placeholder, disabled) => {
    const opts = options(f)
    const cur = value ? value.value : ''
    const list = value && !opts.some(o => o.value === cur) ? [value].concat(opts) : opts
    const isDisabled = disabled || list.length === 0
    return (
      <div className={`rx-vehicle__field ${handles.vehicleSelectorField || ''}`} style={{ ...styles.field, color: isDisabled ? 'rgba(1,1,1,0.38)' : INK }}>
        <select
          className={handles.vehicleSelectorSelect}
          style={{ ...styles.select, ...(isDisabled ? styles.selectDisabled : {}) }}
          value={cur}
          disabled={isDisabled}
          aria-label={placeholder}
          onChange={e => setValue(list.find(o => o.value === e.target.value) || null)}
        >
          <option value="">{placeholder}</option>
          {list.map(o => (
            <option key={o.value} value={o.value}>
              {o.name}
            </option>
          ))}
        </select>
        <Chevrons />
      </div>
    )
  }

  const isRow = layout === 'row'
  const isHero = layout === 'hero'
  const brandList = Array.isArray(brands) ? brands.filter(b => b && (b.name || b.image)) : []
  // Los estilos base van inline; la disposicion en fila y su
  // comportamiento responsivo van en este <style> (el theme no
  // puede validar CSS propio) y pisan lo inline con !important.
  const css = `
    .rx-vehicle{width:100%}
    .rx-vehicle--row{display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem 1rem}
    .rx-vehicle--row .rx-vehicle__header{flex:0 0 100%;margin:0 0 0.25rem !important}
    .rx-vehicle--row .rx-vehicle__field{flex:1 1 11rem;min-width:0;margin:0 !important}
    .rx-vehicle--row .rx-vehicle__button{flex:1 1 100%;width:auto !important;margin:0 !important;padding:0 1.75rem}
    @media (min-width:48em){
      .rx-vehicle--row .rx-vehicle__button{flex:0 0 auto;min-width:11rem}
    }
    @media (min-width:64em){
      .rx-vehicle--row .rx-vehicle__header{flex:0 0 auto;margin:0 0.5rem 0 0 !important}
    }
    /* hero: todo centrado en columna: titulo, subtitulo, fila de selects, boton, marcas */
    .rx-vehicle--hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:0.5rem 0 0}
    .rx-vehicle--hero .rx-vehicle__header{justify-content:center;margin:0 0 0.5rem !important}
    .rx-vehicle--hero .rx-vehicle__header svg{width:34px;height:26px}
    .rx-vehicle--hero .rx-vehicle__title{font-size:clamp(1.5rem,2.8vw,2.125rem) !important;font-weight:800 !important;letter-spacing:-0.025em !important;line-height:1.1}
    .rx-vehicle--hero .rx-vehicle__subtitle{margin:0 0 1.75rem;color:rgba(1,1,1,0.55);font-size:1rem;font-weight:500;line-height:1.5;max-width:40rem}
    .rx-vehicle--hero .rx-vehicle__fields{display:flex;flex-wrap:wrap;justify-content:center;gap:0.75rem;width:100%;max-width:54rem}
    .rx-vehicle--hero .rx-vehicle__field{flex:1 1 14rem;min-width:0;margin:0 !important}
    .rx-vehicle--hero .rx-vehicle__button{width:auto !important;min-width:15rem;margin:1.25rem 0 0 !important;padding:0 2.25rem}
    /* marcas: loop infinito en gris, difuminado en los bordes */
    .rx-brands{position:relative;width:100%;margin:2.25rem 0 0;overflow:hidden;
      -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12%,#000 88%,transparent 100%);
      mask-image:linear-gradient(90deg,transparent 0,#000 12%,#000 88%,transparent 100%)}
    .rx-brands__track{display:flex;align-items:center;width:max-content;animation:rx-brands-loop var(--rx-brands-speed,45s) linear infinite}
    .rx-brands:hover .rx-brands__track{animation-play-state:paused}
    .rx-brands__item{display:flex;align-items:center;justify-content:center;flex:0 0 auto;height:3.25rem;padding:0 2.25rem;
      color:#8a8a8f;font-size:1.25rem;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap;
      filter:grayscale(1);opacity:0.85}
    .rx-brands__item img{display:block;height:2.25rem;width:auto;max-width:9rem;object-fit:contain;filter:grayscale(1) contrast(0.9);opacity:0.75}
    @keyframes rx-brands-loop{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @media (prefers-reduced-motion:reduce){.rx-brands__track{animation:none}}
  `
  const selects = (
    <React.Fragment>
      {renderSelect(brandF, brand, v => { setBrand(v); setModel(null); setYear(null) }, brandLabel, false)}
      {renderSelect(modelF, model, v => { setModel(v); setYear(null) }, modelLabel, !brand)}
      {renderSelect(yearF, year, setYear, yearLabel, !model)}
    </React.Fragment>
  )
  // La pista se duplica para que el loop no tenga salto.
  const marquee = brandList.length > 0 && (
    <div className="rx-brands" style={{ '--rx-brands-speed': `${brandsSpeed}s` }} aria-hidden="true">
      <div className="rx-brands__track">
        {[0, 1].map(copy =>
          brandList.map((b, i) => (
            <span className="rx-brands__item" key={`${copy}-${i}`}>
              {b.image ? <img src={b.image} alt={b.name || ''} loading="lazy" /> : b.name}
            </span>
          ))
        )}
      </div>
    </div>
  )
  const rootClass = `rx-vehicle ${isRow ? 'rx-vehicle--row' : ''} ${isHero ? 'rx-vehicle--hero' : ''} ${handles.vehicleSelector || ''}`
  return (
    <form className={rootClass} style={styles.root} onSubmit={onSubmit}>
      <style>{css}</style>
      <div className={`rx-vehicle__header ${handles.vehicleSelectorHeader || ''}`} style={styles.header}>
        <span className={handles.vehicleSelectorIcon}>
          {isMoto ? <MotoIcon /> : <CarIcon />}
        </span>
        <h3 className={`rx-vehicle__title ${handles.vehicleSelectorTitle || ''}`} style={styles.title}>
          {title}
        </h3>
      </div>
      {isHero && subtitle ? <p className="rx-vehicle__subtitle">{subtitle}</p> : null}
      {isHero ? <div className="rx-vehicle__fields">{selects}</div> : selects}
      <button
        type="submit"
        className={`rx-vehicle__button ${handles.vehicleSelectorButton || ''}`}
        style={{ ...styles.button, ...(ready ? {} : styles.buttonDisabled) }}
        disabled={!ready}
      >
        {buttonLabel}
      </button>
      {marquee}
    </form>
  )
}

VehicleSelector.schema = {
  title: 'Busca por vehículo',
  type: 'object',
  properties: {
    title: { title: 'Título', type: 'string', default: 'Busca por vehículo' },
    buttonLabel: { title: 'Texto del botón', type: 'string', default: 'Buscar repuestos' },
    brandFacet: { title: 'Nombre de la especificación de marca del vehículo', type: 'string', default: 'Marca vehículo' },
    yearFacet: { title: 'Nombre del filtro de año', type: 'string', default: 'Año' },
    modelFacet: { title: 'Nombre del filtro de modelo', type: 'string', default: 'Modelo' },
    brandLabel: { title: 'Placeholder marca', type: 'string', default: 'Marca' },
    yearLabel: { title: 'Placeholder año', type: 'string', default: 'Año' },
    modelLabel: { title: 'Placeholder modelo', type: 'string', default: 'Modelo' },
    layout: { title: 'Disposición', type: 'string', enum: ['column', 'row', 'hero'], default: 'column' },
    subtitle: { title: 'Subtítulo (solo hero)', type: 'string', default: '' },
    brandsSpeed: { title: 'Velocidad del loop de marcas (segundos por vuelta)', type: 'number', default: 45 },
    vehicle: { title: 'Icono del vehículo', type: 'string', enum: ['auto', 'carros', 'motos'], default: 'auto' },
  },
}

export default VehicleSelector
