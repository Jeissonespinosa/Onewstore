/*
 * Tests adversariales de react/VehicleSelector.js (jest + @testing-library/react).
 *
 * Cada test documenta: SUPUESTO que rompe, ENTRADA, HOY (bug), ESPERADO.
 * Los `it('ROJO HOY: ...')` fallan con el codigo actual a proposito.
 *
 * Mocks (react/__tests__/__mocks__, cableados en jest.config.js):
 *  - vtex.render-runtime: useRuntime() -> { navigate: jest.fn(), route: { path } }
 *  - vtex.css-handles:    useCssHandles(h) -> { h: h }
 *  - react-apollo:        useQuery -> { data: { facets: { facets } } } segun __setFacets()
 */
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

import runtime from 'vtex.render-runtime'
import apollo from 'react-apollo'
import VehicleSelector from '../VehicleSelector'

const facet = (name, key, values) => ({
  name,
  type: 'TEXT',
  values: values.map(v => (typeof v === 'string' ? { name: v, key, value: v.toLowerCase(), quantity: 1 } : { key, quantity: 1, ...v })),
})

const CATALOG = [
  facet('Marca vehículo', 'marca-vehiculo', ['Chevrolet', 'Renault']),
  facet('Modelo', 'modelo', ['Spark', 'Sail']),
  facet('Año', 'ano', ['2015', '2021', '2018']),
]

function selects() {
  const all = screen.getAllByRole('combobox')
  return { brand: all[0], model: all[1], year: all[2] }
}

function choose(select, value) {
  fireEvent.change(select, { target: { value } })
}

function button() {
  return screen.getByRole('button')
}

beforeEach(() => {
  runtime.__reset()
  apollo.__reset()
  apollo.__setFacets(CATALOG)
})
afterEach(cleanup)

describe('cascada Marca -> Modelo -> Año', () => {
  it('modelo y año quedan deshabilitados hasta elegir marca; el boton tambien', () => {
    render(<VehicleSelector query="carros" map="c" />)
    const s = selects()
    expect(s.brand.disabled).toBe(false)
    expect(s.model.disabled).toBe(true)
    expect(s.year.disabled).toBe(true)
    expect(button().disabled).toBe(true)
  })

  it('cambiar la marca resetea modelo y año', () => {
    render(<VehicleSelector query="carros" map="c" />)
    let s = selects()
    choose(s.brand, 'chevrolet')
    choose(selects().model, 'spark')
    choose(selects().year, '2015')
    expect(selects().year.value).toBe('2015')
    choose(selects().brand, 'renault')
    s = selects()
    expect(s.model.value).toBe('')
    expect(s.year.value).toBe('')
    expect(s.year.disabled).toBe(true)
  })

  it('cada eleccion se reenvia como selectedFacet en la siguiente consulta', () => {
    render(<VehicleSelector query="carros" map="c" />)
    choose(selects().brand, 'chevrolet')
    const last = apollo.__calls().slice(-1)[0]
    expect(last.selectedFacets).toEqual([
      { key: 'c', value: 'carros' },
      { key: 'marca-vehiculo', value: 'chevrolet' },
    ])
  })
})

describe('navegacion', () => {
  it('con marca, modelo y año navega a /<query>/<marca>/<modelo>/<año>?map=<map>,<k1>,<k2>,<k3>', () => {
    render(<VehicleSelector query="carros/frenos" map="c,c" />)
    choose(selects().brand, 'chevrolet')
    choose(selects().model, 'spark')
    choose(selects().year, '2015')
    fireEvent.click(button())
    expect(runtime.useRuntime().navigate).toHaveBeenCalledWith({
      to: '/carros/frenos/chevrolet/spark/2015',
      query: 'map=c,c,marca-vehiculo,modelo,ano',
    })
  })

  it('ROJO HOY: los valores de facet se codifican con encodeURIComponent al construir la ruta', () => {
    /*
     * SUPUESTO: facets.values[].value nunca trae '/', '?', '#', '&' ni espacios.
     * ENTRADA: valor de modelo '1.5/1.6 16v' (VTEX no garantiza que `value` sea slug:
     *          en search-graphql legacy `value` es el texto del filtro).
     * HOY: navigate({ to: '/carros/chevrolet/1.5/1.6 16v', query: 'map=c,marca-vehiculo,modelo' })
     *      -> la ruta tiene 4 segmentos y el map 3: VTEX interpreta '1.6 16v' como otra
     *      categoria y el filtro se pierde (o 404).
     * ESPERADO: cada segmento pasa por encodeURIComponent: '/carros/chevrolet/1.5%2F1.6%2016v'.
     */
    apollo.__setFacets([
      facet('Marca vehículo', 'marca-vehiculo', ['Chevrolet']),
      facet('Modelo', 'modelo', [{ name: '1.5/1.6 16v', value: '1.5/1.6 16v' }]),
    ])
    render(<VehicleSelector query="carros" map="c" />)
    choose(selects().brand, 'chevrolet')
    choose(selects().model, '1.5/1.6 16v')
    fireEvent.click(button())
    const call = runtime.useRuntime().navigate.mock.calls[0][0]
    const segments = call.to.split('/').filter(Boolean)
    const keys = call.query.replace(/^map=/, '').split(',')
    expect(segments.length).toBe(keys.length)
    expect(call.to).toBe('/carros/chevrolet/1.5%2F1.6%2016v')
  })

  it('ROJO HOY: sin props query/map, una ruta que no es de categoria (PDP, /faq) no se usa como base', () => {
    /*
     * SUPUESTO: si no llegan props query/map, la ruta actual es /<sec>/<macro>/... (leaf).
     * ENTRADA: el bloque cae en un PDP: route.path = '/pastillas-bosch-123/p'.
     * HOY: base = [{c:'pastillas-bosch-123'},{c:'p'}]: se consulta facets de una
     *      categoria inexistente y, al buscar, navega a
     *      /pastillas-bosch-123/p/chevrolet?map=c,c,marca-vehiculo (404).
     * ESPERADO: solo se deriva base cuando el primer segmento es una seccion conocida
     *           (carros|motos|herramientas); si no, base vacia (o el bloque no consulta).
     */
    runtime.__setRuntime({ route: { path: '/pastillas-bosch-123/p' } })
    render(<VehicleSelector />)
    const first = apollo.__calls()[0]
    expect(first.selectedFacets).not.toContainEqual({ key: 'c', value: 'p' })
    choose(selects().brand, 'chevrolet')
    fireEvent.click(button())
    const call = runtime.useRuntime().navigate.mock.calls[0][0]
    expect(call.to.startsWith('/pastillas-bosch-123/p/')).toBe(false)
  })

  it('sin props, deriva la base de la ruta de categoria y usa map c por segmento', () => {
    runtime.__setRuntime({ route: { path: '/motos/frenos/pastillas-de-freno/' } })
    render(<VehicleSelector />)
    expect(apollo.__calls()[0].selectedFacets).toEqual([
      { key: 'c', value: 'motos' },
      { key: 'c', value: 'frenos' },
      { key: 'c', value: 'pastillas-de-freno' },
    ])
    choose(selects().brand, 'chevrolet')
    fireEvent.click(button())
    expect(runtime.useRuntime().navigate).toHaveBeenCalledWith({
      to: '/motos/frenos/pastillas-de-freno/chevrolet',
      query: 'map=c,c,c,marca-vehiculo',
    })
  })
})

describe('facets', () => {
  it('encuentra los facets sin distinguir mayusculas ni tildes', () => {
    apollo.__setFacets([
      facet('MARCA VEHICULO', 'marca-vehiculo', ['Chevrolet']),
      facet('ano', 'ano', ['2015']),
    ])
    render(<VehicleSelector query="carros" map="c" />)
    expect(selects().brand.disabled).toBe(false)
    expect(screen.getByRole('option', { name: 'Chevrolet' })).toBeTruthy()
  })

  it('ROJO HOY: un espacio extra en el nombre del facet (admin) no debe impedir el match', () => {
    /*
     * SUPUESTO: el nombre de la especificacion en el catalogo es exactamente 'Marca vehículo'.
     * ENTRADA: facet.name = 'Marca vehículo ' (espacio final, tipico al crear la spec en el admin).
     * HOY: normalize() no hace trim -> brandF undefined -> selector vacio y deshabilitado
     *      sin ningun aviso.
     * ESPERADO: match ignorando espacios de borde (y multiples espacios internos).
     */
    apollo.__setFacets([facet('Marca vehículo ', 'marca-vehiculo', ['Chevrolet'])])
    render(<VehicleSelector query="carros" map="c" />)
    expect(selects().brand.disabled).toBe(false)
  })

  it('ROJO HOY: los años se listan en orden numerico descendente, no en el orden del API', () => {
    /*
     * SUPUESTO: el API devuelve los valores en un orden util.
     * ENTRADA: facet Año con valores ['2015','2021','2018'] (VTEX ordena por cantidad).
     * HOY: el <select> muestra 2015, 2021, 2018.
     * ESPERADO: 2021, 2018, 2015.
     */
    render(<VehicleSelector query="carros" map="c" />)
    choose(selects().brand, 'chevrolet')
    choose(selects().model, 'spark')
    const years = Array.from(selects().year.querySelectorAll('option'))
      .map(o => o.value)
      .filter(Boolean)
    expect(years).toEqual(['2021', '2018', '2015'])
  })

  it('ROJO HOY: valores con quantity 0 no se ofrecen como opcion', () => {
    /*
     * SUPUESTO: todo valor devuelto tiene productos.
     * ENTRADA: Marca vehículo = [Chevrolet (quantity 3), Renault (quantity 0)].
     * HOY: Renault aparece y al elegirlo el listado destino queda vacio.
     * ESPERADO: solo Chevrolet.
     */
    apollo.__setFacets([
      facet('Marca vehículo', 'marca-vehiculo', [
        { name: 'Chevrolet', value: 'chevrolet', quantity: 3 },
        { name: 'Renault', value: 'renault', quantity: 0 },
      ]),
    ])
    render(<VehicleSelector query="carros" map="c" />)
    expect(screen.queryByRole('option', { name: 'Renault' })).toBeNull()
  })

  it('sin facets (catalogo sin especificaciones) todo queda deshabilitado y no rompe', () => {
    apollo.__setFacets([])
    render(<VehicleSelector query="carros" map="c" />)
    const s = selects()
    expect(s.brand.disabled).toBe(true)
    expect(s.model.disabled).toBe(true)
    expect(s.year.disabled).toBe(true)
    expect(button().disabled).toBe(true)
  })

  it('tolera respuestas con facets/values nulos', () => {
    apollo.__setFacets([{ name: null, type: 'TEXT', values: null }, { name: 'Modelo', values: [] }])
    expect(() => render(<VehicleSelector query="carros" map="c" />)).not.toThrow()
  })
})

describe('icono y layout', () => {
  it('vehicle=auto: la seccion motos usa el icono de moto', () => {
    const { container } = render(<VehicleSelector query="motos/frenos" map="c,c" />)
    // MotoIcon dibuja dos ruedas (circle); CarIcon dibuja puntos r=1.
    expect(container.querySelectorAll('circle[r="4"]').length).toBe(2)
  })

  it('layout=hero pinta subtitulo y marquee de marcas duplicado para el loop', () => {
    const { container } = render(
      <VehicleSelector query="carros" map="c" layout="hero" subtitle="Elige tu carro" brands={[{ name: 'Kia' }, { name: 'BYD' }]} />
    )
    expect(screen.getByText('Elige tu carro')).toBeTruthy()
    expect(container.querySelectorAll('.rx-brands__item').length).toBe(4)
  })
})
