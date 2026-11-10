/*
 * Busca por medida de llanta — Ancho -> Perfil -> Rin (en cascada).
 *
 * Mismo patron del selector de vehiculo (VehicleSelector.js): lee los facets
 * del catalogo para la categoria de la ruta actual y al buscar navega a la
 * categoria con los tres filtros aplicados. Cada paso filtra al siguiente: al
 * elegir 185 de ancho solo quedan los perfiles y rines que existen en 185.
 *
 * Se muestra solo en las categorias cuya ruta contiene "showOn" (por defecto
 * "llantas"), porque el layout de categoria es el mismo para todo el catalogo.
 *
 * Mientras el catalogo no tenga las especificaciones Ancho / Alto (perfil) /
 * Rin marcadas como filtrables, los selects salen vacios y el boton apagado.
 */
import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-apollo'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import vehicleFacets from './queries/vehicleFacets.gql'

const CSS_HANDLES = ['tyreSize', 'tyreSizeTitle', 'tyreSizeField', 'tyreSizeSelect', 'tyreSizeButton']

const RED = '#FF371E'
const INK = '#010101'

function normalize(s) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
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

/* La URL de la tienda usa el mapa antiguo (c,c,c) pero la API de facets pide
   category-1 / category-2 / category-3. Guardamos las dos claves: `key` para
   armar la URL y `fkey` para consultar los facets. */
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
  return (facets || []).find(f => {
    const name = normalize(f.name)
    return name === w || name.indexOf(w) === 0 || w.indexOf(name) === 0
  })
}

function Chevrons() {
  return (
    <svg className="rx-size__chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4.5 L6 1.5 L9 4.5" />
      <path d="M3 7.5 L6 10.5 L9 7.5" />
    </svg>
  )
}

/* Llanta de referencia con las tres medidas marcadas, como viene impreso en
   el costado: 225/75 R16. */
function TyreDiagram() {
  return (
    <svg className="rx-size__art" viewBox="0 0 300 220" fill="none" aria-hidden="true">
      <ellipse cx="190" cy="118" rx="88" ry="92" stroke={INK} strokeWidth="9" opacity=".85" />
      <ellipse cx="190" cy="118" rx="55" ry="58" stroke={INK} strokeWidth="6" opacity=".45" />
      <ellipse cx="190" cy="118" rx="30" ry="32" stroke={INK} strokeWidth="5" opacity=".3" />
      <path d="M118 62 L150 78 M112 118 L146 118 M118 174 L150 158" stroke={INK} strokeWidth="4" opacity=".25" />
      <text x="150" y="112" fontFamily="Montserrat,Helvetica,sans-serif" fontSize="22" fontWeight="700" fill={INK}>225</text>
      <text x="196" y="112" fontFamily="Montserrat,Helvetica,sans-serif" fontSize="22" fontWeight="700" fill={INK}>/75</text>
      <text x="238" y="112" fontFamily="Montserrat,Helvetica,sans-serif" fontSize="22" fontWeight="700" fill={INK}>R16</text>
      <path d="M40 40 L150 92" stroke={RED} strokeWidth="2" />
      <path d="M120 22 L205 92" stroke={INK} strokeWidth="2" opacity=".5" />
      <path d="M260 22 L252 92" stroke={INK} strokeWidth="2" opacity=".5" />
      <text x="8" y="34" fontFamily="Montserrat,Helvetica,sans-serif" fontSize="15" fontWeight="700" fill={RED}>Ancho</text>
      <text x="96" y="16" fontFamily="Montserrat,Helvetica,sans-serif" fontSize="15" fontWeight="600" fill={INK}>Perfil</text>
      <text x="246" y="16" fontFamily="Montserrat,Helvetica,sans-serif" fontSize="15" fontWeight="600" fill={INK}>Rin</text>
    </svg>
  )
}

const TyreSizeSelector = ({
  title = 'Encuentra llantas del tamaño que buscas',
  subtitle = 'Si no conoces las medidas, búscalas en el costado de la llanta.',
  buttonLabel = 'Buscar',
  widthFacet = 'Ancho',
  profileFacet = 'Alto (perfil)',
  rimFacet = 'Rin',
  widthLabel = 'Ancho',
  profileLabel = 'Perfil',
  rimLabel = 'Rin',
  showOn = 'llantas',
  query = '',
  map = '',
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

  const [width, setWidth] = useState(null)
  const [profile, setProfile] = useState(null)
  const [rim, setRim] = useState(null)

  const picked = [width, profile, rim].filter(Boolean)
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

  // Fuera de las categorias de llanta este bloque no aplica.
  const applies = normalize(routePath).indexOf(normalize(showOn)) >= 0
  if (!applies) return null

  const options = f => (f && f.values ? f.values : [])
  const widthF = findFacet(facets, widthFacet)
  const profileF = findFacet(facets, profileFacet)
  const rimF = findFacet(facets, rimFacet)
  const ready = Boolean(width)

  const onSubmit = e => {
    e.preventDefault()
    if (!ready) return
    const segments = base.map(b => b.value).concat(picked.map(p => p.value))
    const keys = base.map(b => b.key).concat(picked.map(p => p.key))
    navigate({ to: `/${segments.join('/')}`, query: `map=${keys.join(',')}` })
  }

  const renderSelect = (facet, value, setValue, placeholder, disabled) => {
    const opts = options(facet)
    const cur = value ? value.value : ''
    const list = value && !opts.some(o => o.value === cur) ? [value].concat(opts) : opts
    const isDisabled = disabled || list.length === 0
    return (
      <div className={`rx-size__field ${isDisabled ? 'rx-size__field--off' : ''} ${cur ? 'rx-size__field--on' : ''} ${handles.tyreSizeField || ''}`}>
        <span className="rx-size__label">{placeholder}</span>
        <div className="rx-size__control">
          <select
            className={handles.tyreSizeSelect}
            value={cur}
            disabled={isDisabled}
            aria-label={placeholder}
            onChange={e => setValue(list.find(o => o.value === e.target.value) || null)}
          >
            <option value="">Todos</option>
            {list.map(o => (
              <option key={o.value} value={o.value}>{o.name}</option>
            ))}
          </select>
          <Chevrons />
        </div>
      </div>
    )
  }

  const css = `
    .rx-size{display:flex;align-items:stretch;gap:1rem;width:100%;max-width:96rem;margin:0 auto;
      background:#fff;border:1px solid rgba(1,1,1,.08);border-left:4px solid ${RED};border-radius:18px;
      padding:1.25rem 1.25rem 1.25rem 1.5rem;box-sizing:border-box;
      font-family:Montserrat,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif}
    .rx-size__main{flex:1 1 auto;min-width:0}
    .rx-size__head{display:flex;align-items:flex-start;gap:.75rem}
    .rx-size__icon{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:2px solid ${RED};
      display:grid;place-items:center;color:${RED}}
    .rx-size__title{margin:0;color:${INK};font-size:1.125rem;font-weight:800;letter-spacing:-.015em;line-height:1.2}
    .rx-size__sub{margin:.25rem 0 0;color:rgba(1,1,1,.55);font-size:.875rem;font-weight:500;line-height:1.4}
    .rx-size__sub b{color:rgba(1,1,1,.75);font-weight:700}
    .rx-size__row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:.75rem;margin-top:1rem}
    .rx-size__field{flex:1 1 9rem;min-width:0}
    .rx-size__label{display:block;margin:0 0 .3rem;color:${INK};font-size:.8125rem;font-weight:700}
    .rx-size__field--off .rx-size__label{color:rgba(1,1,1,.38)}
    .rx-size__control{position:relative}
    .rx-size__control select{width:100%;min-height:3rem;padding:0 2.5rem 0 1rem;border-radius:12px;
      border:1.5px dashed rgba(1,1,1,.22);background:#fff;color:${INK};font:inherit;font-size:.9375rem;
      font-weight:600;appearance:none;-webkit-appearance:none;outline:none;cursor:pointer}
    .rx-size__field--on .rx-size__control select{border-style:solid;border-color:${RED}}
    .rx-size__control select:disabled{color:rgba(1,1,1,.35);cursor:default;background:rgba(1,1,1,.02)}
    .rx-size__chev{position:absolute;right:1rem;top:50%;width:12px;height:12px;margin-top:-6px;pointer-events:none;color:rgba(1,1,1,.45)}
    .rx-size__btn{flex:0 0 auto;min-width:8rem;min-height:3rem;padding:0 1.75rem;border:0;border-radius:999px;
      background:${RED};color:#fff;font:inherit;font-size:.9375rem;font-weight:700;cursor:pointer;
      transition:opacity .18s ease}
    .rx-size__btn:disabled{opacity:.35;cursor:default}
    .rx-size__aside{flex:0 0 240px;display:flex;align-items:center;justify-content:center;
      border-left:1px solid rgba(1,1,1,.07);padding-left:1rem}
    .rx-size__art{width:100%;max-width:240px;height:auto}
    @media (max-width:64em){.rx-size__aside{display:none}}
    @media (max-width:40em){
      .rx-size{padding:1rem;border-left-width:3px;border-radius:14px}
      .rx-size__title{font-size:1rem}
      .rx-size__row{gap:.5rem}
      .rx-size__field{flex:1 1 0;min-width:0}
      .rx-size__control select{padding:0 1.6rem 0 .6rem;font-size:.875rem;text-align:center;text-align-last:center}
      .rx-size__chev{right:.5rem}
      .rx-size__btn{flex:1 1 100%;margin-top:.25rem}
    }
  `

  return (
    <form className={`rx-size ${handles.tyreSize || ''}`} onSubmit={onSubmit}>
      <style>{css}</style>
      <div className="rx-size__main">
        <div className="rx-size__head">
          <span className="rx-size__icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          </span>
          <div>
            <h3 className={`rx-size__title ${handles.tyreSizeTitle || ''}`}>{title}</h3>
            {subtitle ? <p className="rx-size__sub">{subtitle}</p> : null}
          </div>
        </div>
        <div className="rx-size__row">
          {renderSelect(widthF, width, v => { setWidth(v); setProfile(null); setRim(null) }, widthLabel, false)}
          {renderSelect(profileF, profile, v => { setProfile(v); setRim(null) }, profileLabel, !width)}
          {renderSelect(rimF, rim, setRim, rimLabel, !width)}
          <button type="submit" className={`rx-size__btn ${handles.tyreSizeButton || ''}`} disabled={!ready}>
            {buttonLabel}
          </button>
        </div>
      </div>
      <div className="rx-size__aside">
        <TyreDiagram />
      </div>
    </form>
  )
}

TyreSizeSelector.schema = {
  title: 'Busca por medida de llanta',
  type: 'object',
  properties: {
    title: { title: 'Título', type: 'string', default: 'Encuentra llantas del tamaño que buscas' },
    subtitle: { title: 'Subtítulo', type: 'string', default: 'Si no conoces las medidas, búscalas en el costado de la llanta.' },
    buttonLabel: { title: 'Texto del botón', type: 'string', default: 'Buscar' },
    widthFacet: { title: 'Especificación de ancho', type: 'string', default: 'Ancho' },
    profileFacet: { title: 'Especificación de perfil', type: 'string', default: 'Alto (perfil)' },
    rimFacet: { title: 'Especificación de rin', type: 'string', default: 'Rin' },
    showOn: { title: 'Se muestra en rutas que contengan', type: 'string', default: 'llantas' },
  },
}

export default TyreSizeSelector
