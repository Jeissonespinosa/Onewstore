/*
 * Tests de react/FeedbackButton.js (spec 002, grupo 4).
 * Correr: ver react/__tests__/jest.config.js.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

import FeedbackButton from '../FeedbackButton'

function mockFetch(status, body, identity = { ok: true, authenticated: false, email: null }) {
  global.fetch = jest.fn(url => {
    if (String(url).includes('/identity')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(identity) })
    }
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
  })
}
const siteCalls = () => global.fetch.mock.calls.filter(c => !String(c[0]).includes('/identity'))

const trigger = () => screen.getByRole('button', { name: /tu opinión/i })
const open = () => fireEvent.click(trigger())
const send = () => screen.getByRole('button', { name: /^enviar$/i })
const fill = (type = 'sugerencia', text = 'Más filtros') => {
  fireEvent.click(screen.getByLabelText(type === 'problema' ? 'Problema' : 'Sugerencia de mejora'))
  fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: text } })
}

beforeEach(() => {
  window.history.pushState({}, '', '/carros?x=1#a')
  window.innerWidth = 1280
  mockFetch(200, { ok: true })
})
afterEach(() => cleanup())

describe('FeedbackButton', () => {
  it('AC-6: el botón está presente y el modal cerrado hasta activarlo', () => {
    render(<FeedbackButton />)
    expect(trigger()).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('al abrir muestra un diálogo modal con tipo, mensaje y correo', () => {
    render(<FeedbackButton />)
    open()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByLabelText('Mensaje').getAttribute('maxlength')).toBe('1000')
    expect(screen.getByLabelText(/tu correo/i)).toBeTruthy()
  })

  it('el foco pasa al primer control al abrir, y vuelve al botón al cerrar con Escape', () => {
    render(<FeedbackButton />)
    open()
    expect(document.activeElement).toBe(screen.getAllByRole('radio')[0])
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('el foco queda atrapado: Tab desde el último control vuelve al primero', () => {
    render(<FeedbackButton />)
    open()
    const submit = send()
    submit.focus()
    fireEvent.keyDown(submit, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }))
  })

  it('AC-7: envía tipo, mensaje, ruta de la página (sin consulta) y tamaño de pantalla', async () => {
    render(<FeedbackButton />)
    open()
    fill('problema', '  No carga  ')
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    const [url, init] = siteCalls()[0]
    expect(url).toBe('/_v/feedback/site')
    expect(JSON.parse(init.body)).toEqual({
      type: 'problema',
      message: 'No carga',
      email: '',
      pageUrl: '/carros',
      viewport: 'escritorio',
      website: '',
    })
    expect(screen.queryByRole('dialog')).toBeNull() // RF-10: el modal se cierra
  })

  it('RF-9: en pantalla estrecha el tamaño es "movil"', async () => {
    window.innerWidth = 360
    render(<FeedbackButton />)
    open()
    fill()
    fireEvent.click(send())
    await waitFor(() => expect(siteCalls()).toHaveLength(1))
    expect(JSON.parse(siteCalls()[0][1].body).viewport).toBe('movil')
  })

  it('AC-8: sin tipo o sin mensaje no se envía y se avisa', () => {
    render(<FeedbackButton />)
    open()
    fireEvent.click(send())
    expect(screen.getByRole('alert').textContent).toMatch(/tipo/i)
    fireEvent.click(screen.getByLabelText('Problema'))
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: '   ' } })
    fireEvent.click(send())
    expect(screen.getByRole('alert').textContent).toMatch(/mensaje/i)
    expect(siteCalls()).toHaveLength(0)
  })

  it('AC-8: un correo mal escrito no se envía', () => {
    render(<FeedbackButton />)
    open()
    fill()
    fireEvent.change(screen.getByLabelText(/tu correo/i), { target: { value: 'no-es-correo' } })
    fireEvent.click(send())
    expect(screen.getByRole('alert').textContent).toMatch(/correo/i)
    expect(siteCalls()).toHaveLength(0)
  })

  it('RF-8b: con sesión el correo arranca con el de la cuenta y se envía lo que quede escrito', async () => {
    mockFetch(200, { ok: true }, { ok: true, authenticated: true, email: 'cuenta@example.com' })
    render(<FeedbackButton />)
    open()
    const input = screen.getByLabelText(/tu correo/i)
    await waitFor(() => expect(input.value).toBe('cuenta@example.com'))
    fill()
    fireEvent.change(input, { target: { value: 'otro@example.com' } })
    fireEvent.click(send())
    await waitFor(() => expect(siteCalls()).toHaveLength(1))
    expect(JSON.parse(siteCalls()[0][1].body).email).toBe('otro@example.com')
  })

  it('RF-8b: anónimo, el correo arranca vacío y es opcional', async () => {
    render(<FeedbackButton />)
    open()
    expect(screen.getByLabelText(/tu correo/i).value).toBe('')
    fill()
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
  })

  it('la precarga tardía no pisa lo que la persona ya escribió', async () => {
    let release
    global.fetch = jest.fn(url =>
      String(url).includes('/identity')
        ? new Promise(res => {
            release = () => res({ ok: true, json: () => Promise.resolve({ email: 'cuenta@example.com' }) })
          })
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
    )
    render(<FeedbackButton />)
    open()
    const input = screen.getByLabelText(/tu correo/i)
    fireEvent.change(input, { target: { value: 'escrito@example.com' } })
    release()
    await new Promise(r => setTimeout(r, 20))
    expect(input.value).toBe('escrito@example.com')
  })

  it('RF-10: si el envío falla se conserva lo escrito y se muestra el error', async () => {
    global.fetch = jest.fn(url =>
      String(url).includes('/identity')
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        : Promise.reject(new Error('offline'))
    )
    render(<FeedbackButton />)
    open()
    fill('problema', 'Texto largo que no se debe perder')
    fireEvent.change(screen.getByLabelText(/tu correo/i), { target: { value: 'a@b.co' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no pudimos/i))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByLabelText('Mensaje').value).toBe('Texto largo que no se debe perder')
    expect(screen.getByLabelText('Problema').checked).toBe(true)
    expect(screen.getByLabelText(/tu correo/i).value).toBe('a@b.co')
    expect(send().disabled).toBe(false)
  })

  it('AC-13: límite de envíos (429) avisa con un mensaje claro y conserva el texto', async () => {
    mockFetch(429, { ok: false, code: 'rate-limited' })
    render(<FeedbackButton />)
    open()
    fill()
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/demasiados/i))
    expect(screen.getByLabelText('Mensaje').value).toBe('Más filtros')
  })

  it('un 504 del proxy (respuesta que no es JSON) da el mensaje genérico', async () => {
    global.fetch = jest.fn(url =>
      String(url).includes('/identity')
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        : Promise.resolve({ ok: false, status: 504, json: () => Promise.reject(new Error('no json')) })
    )
    render(<FeedbackButton />)
    open()
    fill()
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no pudimos/i))
  })

  it('un doble clic no envía dos veces', async () => {
    render(<FeedbackButton />)
    open()
    fill()
    const btn = send()
    fireEvent.click(btn)
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(siteCalls()).toHaveLength(1)
  })

  it('el campo trampa está fuera del orden de tabulación', () => {
    render(<FeedbackButton />)
    open()
    expect(document.querySelector('input[name="website"]').tabIndex).toBe(-1)
  })

  it('un clic en el fondo, fuera del diálogo, lo cierra', () => {
    render(<FeedbackButton />)
    open()
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
