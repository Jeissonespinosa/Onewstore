/*
 * Tests de la variante movil de react/CategoryMenu.js (variant="drawer", spec 003).
 *
 * Drawer modal con acordeon de tres niveles (seccion > macro > subcategoria), montado en
 * un portal sobre document.body. Cubre lo que vtex.store-drawer no hace (spike, plan.md):
 * Esc, foco de entrada y de retorno, Tab atrapado, aria-modal y aria-expanded.
 */
import React from 'react'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'

import runtime from 'vtex.render-runtime'
import CategoryMenu from '../CategoryMenu'

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

const renderDrawer = props => render(<CategoryMenu variant="drawer" sections={SECTIONS} {...props} />)
const trigger = () => screen.getByRole('button', { name: /^categor/i })
const openDrawer = () => fireEvent.click(trigger())
const dialog = () => screen.getByRole('dialog', { name: /categor/i })
const inDialog = () => within(dialog())

beforeEach(() => runtime.__reset())
afterEach(cleanup)

describe('boton y apertura', () => {
  it('cerrado: aria-expanded=false y sin dialogo', () => {
    renderDrawer()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clic abre un dialogo modal con nombre accesible, montado fuera del header (portal)', () => {
    const { container } = renderDrawer()
    openDrawer()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(dialog().getAttribute('aria-modal')).toBe('true')
    expect(trigger().getAttribute('aria-controls')).toBe(dialog().id)
    expect(container.contains(dialog())).toBe(false)
    expect(document.body.contains(dialog())).toBe(true)
  })

  it('el foco entra al drawer (boton Cerrar menu)', () => {
    renderDrawer()
    openDrawer()
    expect(document.activeElement).toBe(inDialog().getByRole('button', { name: 'Cerrar menú' }))
  })

  it('bloquea el scroll del fondo mientras esta abierto y lo libera al cerrar', () => {
    renderDrawer()
    openDrawer()
    expect(document.body.classList.contains('bodyLock')).toBe(true)
    fireEvent.click(inDialog().getByRole('button', { name: 'Cerrar menú' }))
    expect(document.body.classList.contains('bodyLock')).toBe(false)
  })

  it('al desmontar con el drawer abierto tambien libera el scroll', () => {
    const { unmount } = renderDrawer()
    openDrawer()
    unmount()
    expect(document.body.classList.contains('bodyLock')).toBe(false)
  })

  it('sin secciones no pinta nada ni falla', () => {
    const { container } = renderDrawer({ sections: [] })
    expect(container.firstChild).toBeNull()
  })

  it('el disparador tiene nombre accesible aunque solo muestre el icono', () => {
    renderDrawer()
    expect(trigger().textContent).toContain('Categorías')
  })
})

describe('acordeon de tres niveles', () => {
  it('abre con todo colapsado cuando la pagina actual no esta en el arbol', () => {
    renderDrawer()
    openDrawer()
    expect(inDialog().getByRole('button', { name: 'Carros' }).getAttribute('aria-expanded')).toBe('false')
    expect(inDialog().getByRole('button', { name: 'Motos' }).getAttribute('aria-expanded')).toBe('false')
    expect(inDialog().queryByRole('link')).toBeNull()
  })

  it('nivel 1: expandir una seccion muestra "Ver todo" y sus macros', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    const d = inDialog()
    expect(d.getByRole('button', { name: 'Carros' }).getAttribute('aria-expanded')).toBe('true')
    expect(d.getByRole('link', { name: 'Ver todo en Carros' }).getAttribute('href')).toBe('/carros')
    expect(d.getByRole('button', { name: 'Frenos' })).toBeTruthy()
    expect(d.getByRole('link', { name: 'Baterias' }).getAttribute('href')).toBe('/carros/baterias')
  })

  it('nivel 2: expandir una macro muestra "Ver todo" y sus subcategorias (tercer nivel)', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    fireEvent.click(inDialog().getByRole('button', { name: 'Frenos' }))
    const d = inDialog()
    expect(d.getByRole('button', { name: 'Frenos' }).getAttribute('aria-expanded')).toBe('true')
    expect(d.getByRole('link', { name: 'Ver todo en Frenos' }).getAttribute('href')).toBe('/carros/frenos')
    expect(d.getByRole('link', { name: 'Pastillas de freno' }).getAttribute('href')).toBe('/carros/frenos/pastillas-de-freno')
    expect(d.getByRole('link', { name: 'Discos de freno' })).toBeTruthy()
  })

  it('solo una seccion abierta a la vez; abrir otra cierra la anterior', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    fireEvent.click(inDialog().getByRole('button', { name: 'Motos' }))
    const d = inDialog()
    expect(d.getByRole('button', { name: 'Carros' }).getAttribute('aria-expanded')).toBe('false')
    expect(d.getByRole('button', { name: 'Motos' }).getAttribute('aria-expanded')).toBe('true')
    expect(d.queryByRole('button', { name: 'Frenos' })).toBeNull()
    expect(d.getByRole('button', { name: 'Cascos' })).toBeTruthy()
  })

  it('solo una macro abierta a la vez dentro de la seccion', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    fireEvent.click(inDialog().getByRole('button', { name: 'Frenos' }))
    fireEvent.click(inDialog().getByRole('button', { name: 'Filtros' }))
    const d = inDialog()
    expect(d.queryByRole('link', { name: 'Pastillas de freno' })).toBeNull()
    expect(d.getByRole('link', { name: 'Filtros de aire' })).toBeTruthy()
  })

  it('un segundo clic en un nivel abierto lo colapsa', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    expect(inDialog().getByRole('button', { name: 'Carros' }).getAttribute('aria-expanded')).toBe('false')
    expect(inDialog().queryByRole('link')).toBeNull()
  })

  it('aria-controls del boton abierto apunta al panel que controla', () => {
    renderDrawer()
    openDrawer()
    const btn = () => inDialog().getByRole('button', { name: 'Carros' })
    expect(btn().hasAttribute('aria-controls')).toBe(false)
    fireEvent.click(btn())
    expect(document.getElementById(btn().getAttribute('aria-controls'))).toBeTruthy()
  })
})

describe('categoria actual', () => {
  it('abre con la rama de la pagina actual desplegada y marca aria-current', () => {
    runtime.__setRuntime({ route: { path: '/carros/frenos/discos-de-freno' } })
    renderDrawer()
    openDrawer()
    const d = inDialog()
    expect(d.getByRole('button', { name: 'Carros' }).getAttribute('aria-expanded')).toBe('true')
    expect(d.getByRole('button', { name: 'Frenos' }).getAttribute('aria-expanded')).toBe('true')
    expect(d.getByRole('link', { name: 'Discos de freno' }).getAttribute('aria-current')).toBe('page')
    expect(d.getByRole('link', { name: 'Pastillas de freno' }).hasAttribute('aria-current')).toBe(false)
  })

  it('en la pagina de una macro, "Ver todo" de esa macro lleva aria-current', () => {
    runtime.__setRuntime({ route: { path: '/carros/frenos' } })
    renderDrawer()
    openDrawer()
    expect(inDialog().getByRole('link', { name: 'Ver todo en Frenos' }).getAttribute('aria-current')).toBe('page')
  })
})

describe('cierre y foco', () => {
  it('Esc cierra y devuelve el foco al boton', () => {
    renderDrawer()
    openDrawer()
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('Esc cierra aunque el foco este en el body', () => {
    renderDrawer()
    openDrawer()
    document.activeElement.blur()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('el boton Cerrar menu cierra y devuelve el foco al disparador', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Cerrar menú' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('clic en el overlay cierra', () => {
    const { baseElement } = renderDrawer()
    openDrawer()
    fireEvent.click(baseElement.querySelector('.drawerOverlay'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clic dentro del drawer no lo cierra', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    expect(screen.queryByRole('dialog')).not.toBeNull()
  })

  it('el boton disparador alterna: segundo clic cierra', () => {
    renderDrawer()
    openDrawer()
    // el overlay cubre el disparador en la pantalla real; por teclado/lector se puede alternar
    fireEvent.click(trigger())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('elegir un enlace navega y cierra', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    fireEvent.click(inDialog().getByRole('link', { name: 'Baterias' }))
    expect(runtime.useRuntime().navigate).toHaveBeenCalledWith({ to: '/carros/baterias' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Ctrl+clic no intercepta pero cierra', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    fireEvent.click(inDialog().getByRole('link', { name: 'Baterias' }), { ctrlKey: true })
    expect(runtime.useRuntime().navigate).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Tab atrapado dentro del dialogo', () => {
  it('Tab desde el ultimo elemento vuelve al primero', () => {
    renderDrawer()
    openDrawer()
    const focusables = Array.from(dialog().querySelectorAll('a[href], button'))
    const last = focusables[focusables.length - 1]
    last.focus()
    const notPrevented = fireEvent.keyDown(last, { key: 'Tab' })
    expect(notPrevented).toBe(false) // preventDefault llamado
    expect(document.activeElement).toBe(focusables[0])
  })

  it('Shift+Tab desde el primero va al ultimo', () => {
    renderDrawer()
    openDrawer()
    const focusables = Array.from(dialog().querySelectorAll('a[href], button'))
    const first = focusables[0]
    first.focus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(focusables[focusables.length - 1])
  })

  it('Tab en un elemento intermedio no se intercepta', () => {
    renderDrawer()
    openDrawer()
    const focusables = Array.from(dialog().querySelectorAll('a[href], button'))
    const middle = focusables[1]
    middle.focus()
    expect(fireEvent.keyDown(middle, { key: 'Tab' })).toBe(true)
  })

  it('con el acordeon expandido, el ultimo enlace tambien cierra el ciclo', () => {
    renderDrawer()
    openDrawer()
    fireEvent.click(inDialog().getByRole('button', { name: 'Carros' }))
    const focusables = Array.from(dialog().querySelectorAll('a[href], button'))
    expect(focusables.length).toBeGreaterThan(4)
    const last = focusables[focusables.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(focusables[0])
  })
})

describe('variante por defecto', () => {
  it('sin variant sigue siendo el panel de escritorio (navigation, no dialog)', () => {
    render(<CategoryMenu sections={SECTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: /categor/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('navigation', { name: /categor/i })).toBeTruthy()
  })

  it('con los datos reales (sin prop sections) el drawer lista las 3 secciones', () => {
    render(<CategoryMenu variant="drawer" />)
    fireEvent.click(screen.getByRole('button', { name: /^categor/i }))
    const d = within(screen.getByRole('dialog'))
    expect(d.getByRole('button', { name: 'Carros' })).toBeTruthy()
    expect(d.getByRole('button', { name: 'Motos' })).toBeTruthy()
    expect(d.getByRole('button', { name: 'Herramientas' })).toBeTruthy()
  })
})
