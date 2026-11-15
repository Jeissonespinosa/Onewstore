/*
 * Tests de react/CategoryMenu.js (menu "Categorias" del header, spec 003).
 *
 * Mocks (react/__tests__/__mocks__, cableados en jest.config.js):
 *  - vtex.render-runtime: useRuntime() -> { navigate: jest.fn(), route: { path } }
 *  - vtex.css-handles:    useCssHandles(h) -> { h: h }
 *
 * Cubren lo que el spike de la spec 003 mostro que vtex.menu no hace: Esc, teclado,
 * aria-expanded, foco de retorno; y los criterios RF-5 (categoria actual) y RF-7 (cierre).
 */
import React from 'react'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'

import runtime from 'vtex.render-runtime'
import cssHandles from 'vtex.css-handles'
import CategoryMenu from '../CategoryMenu'
import realMenu from '../category-menu.json'

const SECTIONS = [
  {
    nombre: 'Carros',
    path: '/carros',
    children: [
      {
        nombre: 'Frenos',
        path: '/carros/frenos',
        children: [
          { nombre: 'Pastillas de freno', path: '/carros/frenos/pastillas-de-freno' },
          { nombre: 'Discos de freno', path: '/carros/frenos/discos-de-freno' },
        ],
      },
      {
        nombre: 'Filtros',
        path: '/carros/filtros',
        children: [{ nombre: 'Filtros de aire', path: '/carros/filtros/filtros-de-aire' }],
      },
      { nombre: 'Baterias', path: '/carros/baterias' }, // macro sin hijos: enlace directo
    ],
  },
  {
    nombre: 'Motos',
    path: '/motos',
    children: [
      {
        nombre: 'Cascos',
        path: '/motos/cascos',
        children: [{ nombre: 'Cascos abatibles', path: '/motos/cascos/cascos-abatibles' }],
      },
    ],
  },
]

const trigger = () => screen.getByRole('button', { name: /categor/i })
const openMenu = () => fireEvent.click(trigger())
const panel = () => screen.getByRole('navigation', { name: /categor/i })

beforeEach(() => runtime.__reset())
afterEach(cleanup)

describe('boton y apertura', () => {
  it('cerrado: aria-expanded=false, sin aria-controls y sin panel', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(trigger().hasAttribute('aria-controls')).toBe(false)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('clic abre: aria-expanded=true y aria-controls apunta al panel con nombre accesible', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(panel().id).toBe(trigger().getAttribute('aria-controls'))
  })

  it('un segundo clic cierra', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    openMenu()
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('sin secciones no pinta nada ni falla', () => {
    const { container } = render(<CategoryMenu sections={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('tres niveles', () => {
  it('abre con la primera seccion y su primera macro con hijos activas', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const p = within(panel())
    expect(p.getByRole('button', { name: 'Carros' }).getAttribute('aria-expanded')).toBe('true')
    expect(p.getByRole('button', { name: 'Motos' }).getAttribute('aria-expanded')).toBe('false')
    expect(p.getByRole('button', { name: 'Frenos' }).getAttribute('aria-expanded')).toBe('true')
    expect(p.getByRole('link', { name: 'Pastillas de freno' })).toBeTruthy()
    expect(p.queryByRole('link', { name: 'Filtros de aire' })).toBeNull()
  })

  it('cada nivel con hijos trae su enlace "Ver todo" a la ruta de ese nivel', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const p = within(panel())
    expect(p.getByRole('link', { name: 'Ver todo en Carros' }).getAttribute('href')).toBe('/carros')
    expect(p.getByRole('link', { name: 'Ver todo en Frenos' }).getAttribute('href')).toBe('/carros/frenos')
  })

  it('elegir otra seccion cambia las macros', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    fireEvent.click(within(panel()).getByRole('button', { name: 'Motos' }))
    const p = within(panel())
    expect(p.getByRole('button', { name: 'Motos' }).getAttribute('aria-expanded')).toBe('true')
    expect(p.getByRole('button', { name: 'Cascos' })).toBeTruthy()
    expect(p.queryByRole('button', { name: 'Frenos' })).toBeNull()
  })

  it('pasar el puntero por una macro muestra sus subcategorias', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const filtros = within(panel()).getByRole('button', { name: 'Filtros' })
    fireEvent.mouseEnter(filtros.closest('li'))
    expect(within(panel()).getByRole('link', { name: 'Filtros de aire' })).toBeTruthy()
    expect(within(panel()).queryByRole('link', { name: 'Pastillas de freno' })).toBeNull()
  })

  it('una macro sin hijos es un enlace, no un boton', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const p = within(panel())
    expect(p.getByRole('link', { name: 'Baterias' }).getAttribute('href')).toBe('/carros/baterias')
    expect(p.queryByRole('button', { name: 'Baterias' })).toBeNull()
  })
})

describe('categoria actual (RF-5)', () => {
  it('abre en la seccion y la macro de la pagina actual', () => {
    runtime.__setRuntime({ route: { path: '/motos/cascos/cascos-abatibles' } })
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const p = within(panel())
    expect(p.getByRole('button', { name: 'Motos' }).getAttribute('aria-expanded')).toBe('true')
    expect(p.getByRole('button', { name: 'Cascos' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('marca aria-current="page" solo en el enlace exacto', () => {
    runtime.__setRuntime({ route: { path: '/carros/frenos/discos-de-freno' } })
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const p = within(panel())
    expect(p.getByRole('link', { name: 'Discos de freno' }).getAttribute('aria-current')).toBe('page')
    expect(p.getByRole('link', { name: 'Pastillas de freno' }).hasAttribute('aria-current')).toBe(false)
    expect(p.getByRole('link', { name: 'Ver todo en Carros' }).hasAttribute('aria-current')).toBe(false)
  })

  it('las ramas de la pagina actual llevan la clase itemCurrent', () => {
    runtime.__setRuntime({ route: { path: '/carros/frenos/discos-de-freno' } })
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const p = within(panel())
    expect(p.getByRole('button', { name: 'Carros' }).closest('li').className).toContain('itemCurrent')
    expect(p.getByRole('button', { name: 'Motos' }).closest('li').className).not.toContain('itemCurrent')
  })

  it('usa la ruta publica cuando VTEX entrega la ruta interna de routing', () => {
    runtime.__setRuntime({ route: { path: '/_v/segment/routing/vtex.store@2.x/subcategory/4/carros/frenos/discos-de-freno' } })
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    expect(within(panel()).getByRole('link', { name: 'Discos de freno' }).getAttribute('aria-current')).toBe('page')
  })
})

describe('cierre (RF-7)', () => {
  it('Esc cierra y devuelve el foco al boton', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    within(panel()).getByRole('button', { name: 'Motos' }).focus()
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('Esc con el foco en el boton tambien cierra', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    trigger().focus()
    fireEvent.keyDown(trigger(), { key: 'Escape' })
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('clic fuera cierra; clic dentro del panel no', () => {
    render(
      <div>
        <p data-testid="fuera">fuera</p>
        <CategoryMenu sections={SECTIONS} />
      </div>
    )
    openMenu()
    fireEvent.mouseDown(panel())
    expect(screen.queryByRole('navigation')).not.toBeNull()
    fireEvent.mouseDown(screen.getByTestId('fuera'))
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('sacar el foco con Tab (hacia fuera) cierra', () => {
    render(
      <div>
        <CategoryMenu sections={SECTIONS} />
        <button type="button">otro</button>
      </div>
    )
    openMenu()
    trigger().focus()
    fireEvent.blur(trigger(), { relatedTarget: screen.getByRole('button', { name: 'otro' }) })
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('mover el foco dentro del menu no lo cierra', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const motos = within(panel()).getByRole('button', { name: 'Motos' })
    fireEvent.blur(trigger(), { relatedTarget: motos })
    expect(screen.queryByRole('navigation')).not.toBeNull()
  })

  it('elegir un enlace navega y cierra', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    fireEvent.click(within(panel()).getByRole('link', { name: 'Pastillas de freno' }))
    expect(runtime.useRuntime().navigate).toHaveBeenCalledWith({ to: '/carros/frenos/pastillas-de-freno' })
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('Ctrl+clic no intercepta (abre en pestana nueva) pero cierra el menu', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    fireEvent.click(within(panel()).getByRole('link', { name: 'Pastillas de freno' }), { ctrlKey: true })
    expect(runtime.useRuntime().navigate).not.toHaveBeenCalled()
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})

describe('teclado (AC-4)', () => {
  const key = (el, k) => fireEvent.keyDown(el, { key: k })

  it('ArrowDown en el boton abre el menu y enfoca la primera seccion', () => {
    jest.useFakeTimers()
    render(<CategoryMenu sections={SECTIONS} />)
    trigger().focus()
    key(trigger(), 'ArrowDown')
    jest.runAllTimers()
    jest.useRealTimers()
    expect(screen.queryByRole('navigation')).not.toBeNull()
    expect(document.activeElement.textContent).toContain('Carros')
  })

  it('flechas arriba y abajo recorren la columna sin salirse de ella', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const carros = within(panel()).getByRole('button', { name: 'Carros' })
    carros.focus()
    key(carros, 'ArrowDown')
    expect(document.activeElement.textContent).toContain('Motos')
    key(document.activeElement, 'ArrowDown') // ya es la ultima: se queda
    expect(document.activeElement.textContent).toContain('Motos')
    key(document.activeElement, 'ArrowUp')
    expect(document.activeElement.textContent).toContain('Carros')
  })

  it('Home y End saltan al primero y al ultimo de la columna', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const ver = within(panel()).getByRole('link', { name: 'Ver todo en Carros' })
    ver.focus()
    key(ver, 'End')
    expect(document.activeElement.textContent).toContain('Baterias')
    key(document.activeElement, 'Home')
    expect(document.activeElement.textContent).toContain('Ver todo en Carros')
  })

  it('flecha derecha entra a la columna siguiente y la izquierda vuelve a la rama activa', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    const carros = within(panel()).getByRole('button', { name: 'Carros' })
    carros.focus()
    key(carros, 'ArrowRight')
    expect(document.activeElement.textContent).toContain('Ver todo en Carros')
    key(document.activeElement, 'ArrowLeft')
    expect(document.activeElement.textContent).toContain('Carros')
    expect(document.activeElement.getAttribute('aria-expanded')).toBe('true')
  })

  it('enfocar una macro con Tab/flechas muestra sus subcategorias', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    within(panel()).getByRole('button', { name: 'Filtros' }).focus()
    expect(within(panel()).getByRole('link', { name: 'Filtros de aire' })).toBeTruthy()
  })

  it('volver a la seccion con la flecha izquierda no pierde la macro elegida', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    within(panel()).getByRole('button', { name: 'Filtros' }).focus()
    const ver = within(panel()).getByRole('link', { name: 'Ver todo en Filtros' })
    ver.focus()
    key(ver, 'ArrowLeft')
    expect(document.activeElement.textContent).toContain('Filtros')
    expect(document.activeElement.getAttribute('aria-expanded')).toBe('true')
  })

  it('Enter/clic sobre una macro con hijos pasa el foco a sus subcategorias', () => {
    jest.useFakeTimers()
    render(<CategoryMenu sections={SECTIONS} />)
    openMenu()
    fireEvent.click(within(panel()).getByRole('button', { name: 'Frenos' }))
    jest.runAllTimers()
    jest.useRealTimers()
    expect(document.activeElement.textContent).toContain('Ver todo en Frenos')
  })
})

describe('datos reales (react/category-menu.json)', () => {
  it('trae 3 secciones, 33 macros y rutas bien formadas', () => {
    expect(realMenu.sections.map(s => s.nombre)).toEqual(['Carros', 'Motos', 'Herramientas'])
    const macros = realMenu.sections.reduce((n, s) => n + s.children.length, 0)
    expect(macros).toBe(33)
    const walk = items => items.forEach(i => {
      expect(i.path).toMatch(/^\/[a-z0-9\-/]+$/)
      walk(i.children || [])
    })
    walk(realMenu.sections)
  })

  it('se pinta con los datos por defecto, sin la prop sections (carga diferida al abrir)', async () => {
    render(<CategoryMenu />)
    openMenu()
    expect(await screen.findByRole('button', { name: 'Carros' })).toBeTruthy()
    const p = within(panel())
    expect(p.getByRole('button', { name: 'Motos' })).toBeTruthy()
    expect(p.getByRole('button', { name: 'Herramientas' })).toBeTruthy()
    expect(p.getByRole('link', { name: 'Ver todo en Carros' }).getAttribute('href')).toBe('/carros')
  })

  it('el boton se pinta de inmediato; el panel aparece cuando llegan los datos', async () => {
    render(<CategoryMenu />)
    expect(trigger()).toBeTruthy()
    openMenu()
    expect(screen.queryByRole('navigation')).toBeNull() // aun sin datos
    expect(trigger().hasAttribute('aria-controls')).toBe(false)
    await screen.findByRole('navigation', { name: /categor/i })
    expect(trigger().getAttribute('aria-controls')).toBe(panel().id)
  })

  it('al pasar el puntero o dar foco al boton precarga los datos (el panel abre sin espera)', async () => {
    render(<CategoryMenu />)
    fireEvent.mouseEnter(trigger())
    await new Promise(r => setTimeout(r, 50))
    openMenu()
    expect(panel()).toBeTruthy() // sincrono: ya estaban cargados
  })
})

describe('css handles', () => {
  it('aplica las clases cuando useCssHandles devuelve { handles, withModifiers } (forma real de la app)', () => {
    const spy = jest.spyOn(cssHandles, 'useCssHandles').mockImplementation(list => ({
      handles: list.reduce((acc, name) => ({ ...acc, [name]: `app-${name}` }), {}),
      withModifiers: name => name,
    }))
    render(<CategoryMenu sections={SECTIONS} />)
    expect(trigger().className).toBe('app-trigger trigger')
    openMenu()
    expect(panel().className).toBe('app-panel panel')
    spy.mockRestore()
  })

  it('aplica el handle y la clase del CSS Module en cada elemento (mock del repo)', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    expect(trigger().className).toBe('trigger trigger')
  })
})
