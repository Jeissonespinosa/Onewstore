/*
 * Tests de react/PurchaseRating.js (spec 002, tarea 3.1).
 * Correr: ver react/__tests__/jest.config.js.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

import PurchaseRating from '../PurchaseRating'

function setUrl(search) {
  window.history.pushState({}, '', `/checkout/orderPlaced/${search}`)
}

// `identity` es lo que responde /_v/feedback/identity (por defecto, anónimo).
function mockFetch(status, body, identity = { ok: true, authenticated: false, email: null }) {
  global.fetch = jest.fn(url => {
    if (String(url).includes('/identity')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(identity) })
    }
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
  })
}

// Llamadas al endpoint de calificación (sin contar `identity`).
const purchaseCalls = () => global.fetch.mock.calls.filter(c => !String(c[0]).includes('/identity'))

const star = n => screen.getByRole('radio', { name: `${n} de 5 estrellas` })
const send = () => screen.getByRole('button', { name: /enviar/i })

beforeEach(() => {
  setUrl('?og=1234567890123')
  mockFetch(200, { ok: true })
})
afterEach(() => cleanup())

describe('PurchaseRating', () => {
  it('muestra 5 estrellas con aria-label "N de 5 estrellas" y Enviar deshabilitado sin calificación', () => {
    render(<PurchaseRating />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    ;[1, 2, 3, 4, 5].forEach(n => expect(star(n)).toBeTruthy())
    expect(send().disabled).toBe(true)
  })

  it('no se muestra sin número de pedido válido en la URL', () => {
    setUrl('')
    const { container } = render(<PurchaseRating />)
    expect(container.innerHTML).toBe('')
    cleanup()
    setUrl('?og=%3Cscript%3E')
    expect(render(<PurchaseRating />).container.innerHTML).toBe('')
  })

  it('seleccionar una estrella la marca y habilita Enviar', () => {
    render(<PurchaseRating />)
    fireEvent.click(star(4))
    expect(star(4).getAttribute('aria-checked')).toBe('true')
    expect(star(2).getAttribute('aria-checked')).toBe('false')
    expect(send().disabled).toBe(false)
  })

  it('teclado: flechas, Inicio y Fin mueven la selección dentro de 1-5', () => {
    render(<PurchaseRating />)
    fireEvent.click(star(3))
    fireEvent.keyDown(star(3), { key: 'ArrowRight' })
    expect(star(4).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(star(4), { key: 'End' })
    expect(star(5).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(star(5), { key: 'ArrowRight' })
    expect(star(5).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(star(5), { key: 'Home' })
    expect(star(1).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(star(1), { key: 'ArrowLeft' })
    expect(star(1).getAttribute('aria-checked')).toBe('true')
  })

  it('solo una estrella está en el orden de tabulación', () => {
    render(<PurchaseRating />)
    expect(screen.getAllByRole('radio').filter(r => r.tabIndex === 0)).toHaveLength(1)
    fireEvent.click(star(4))
    expect(star(4).tabIndex).toBe(0)
    expect(star(1).tabIndex).toBe(-1)
  })

  it('RF-6: el motivo aparece con 1-3 estrellas y desaparece con 4-5', () => {
    render(<PurchaseRating />)
    expect(screen.queryByLabelText(/qué falló/i)).toBeNull()
    fireEvent.click(star(2))
    expect(screen.getByLabelText(/qué falló/i)).toBeTruthy()
    fireEvent.click(star(5))
    expect(screen.queryByLabelText(/qué falló/i)).toBeNull()
  })

  it('el comentario admite como máximo 1000 caracteres', () => {
    render(<PurchaseRating />)
    expect(screen.getByLabelText(/cuéntanos más/i).getAttribute('maxlength')).toBe('1000')
  })

  it('envía pedido, calificación, comentario y motivo al servicio (AC-1, AC-5)', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(2))
    fireEvent.change(screen.getByLabelText(/qué falló/i), { target: { value: 'envio' } })
    fireEvent.change(screen.getByLabelText(/cuéntanos más/i), { target: { value: '  Llegó tarde  ' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    const [url, init] = purchaseCalls()[0]
    expect(url).toBe('/_v/feedback/purchase')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      orderId: '1234567890123',
      rating: 2,
      comment: 'Llegó tarde',
      reason: 'envio',
      email: '',
      website: '',
    })
    expect(screen.getByRole('status').textContent).toMatch(/gracias/i)
  })

  it('AC-2: se puede enviar solo con estrellas, sin comentario', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(5))
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(JSON.parse(purchaseCalls()[0][1].body)).toMatchObject({ rating: 5, comment: '', reason: '' })
  })

  it('al pasar de 2 a 5 estrellas no envía el motivo', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(2))
    fireEvent.change(screen.getByLabelText(/qué falló/i), { target: { value: 'precio' } })
    fireEvent.click(star(5))
    fireEvent.click(send())
    await waitFor(() => expect(purchaseCalls().length).toBeGreaterThan(0))
    expect(JSON.parse(purchaseCalls()[0][1].body).reason).toBe('')
  })

  it('un doble clic no envía dos veces', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(4))
    const btn = send()
    fireEvent.click(btn)
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(purchaseCalls()).toHaveLength(1)
  })

  it('si ya estaba calificado (409) muestra el agradecimiento', async () => {
    mockFetch(409, { ok: false, code: 'already-rated' })
    render(<PurchaseRating />)
    fireEvent.click(star(4))
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
  })

  it('límite de envíos (429): avisa y permite reintentar', async () => {
    mockFetch(429, { ok: false, code: 'rate-limited' })
    render(<PurchaseRating />)
    fireEvent.click(star(4))
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/demasiados/i))
    expect(send().disabled).toBe(false)
  })

  it('error de red: avisa sin perder lo escrito', async () => {
    global.fetch = jest.fn(url => (String(url).includes('/identity') ? Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) : Promise.reject(new Error('offline'))))
    render(<PurchaseRating />)
    fireEvent.click(star(3))
    fireEvent.change(screen.getByLabelText(/cuéntanos más/i), { target: { value: 'texto' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByLabelText(/cuéntanos más/i).value).toBe('texto')
    expect(star(3).getAttribute('aria-checked')).toBe('true')
  })

  it('respuesta que no es JSON (p. ej. 504 del proxy): mensaje genérico', async () => {
    global.fetch = jest.fn(url => (String(url).includes('/identity') ? Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) : Promise.resolve({ ok: false, status: 504, json: () => Promise.reject(new Error('no json')) })))
    render(<PurchaseRating />)
    fireEvent.click(star(3))
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no pudimos/i))
  })

  it('el campo trampa existe, está fuera del orden de tabulación y viaja vacío', async () => {
    render(<PurchaseRating />)
    const trap = document.querySelector('input[name="website"]')
    expect(trap.tabIndex).toBe(-1)
    fireEvent.click(star(4))
    fireEvent.click(send())
    await waitFor(() => expect(purchaseCalls().length).toBeGreaterThan(0))
    expect(JSON.parse(purchaseCalls()[0][1].body).website).toBe('')
  })
  it('RF-3: con sesión el campo de correo arranca con el de la cuenta y se envía lo que quede escrito', async () => {
    mockFetch(200, { ok: true }, { ok: true, authenticated: true, email: 'cuenta@example.com' })
    render(<PurchaseRating />)
    const input = screen.getByLabelText(/tu correo/i)
    await waitFor(() => expect(input.value).toBe('cuenta@example.com'))
    fireEvent.click(star(5))
    fireEvent.change(input, { target: { value: 'otro@example.com' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(JSON.parse(purchaseCalls()[0][1].body).email).toBe('otro@example.com')
  })

  it('RF-3: la persona puede borrar el correo precargado y se envía vacío', async () => {
    mockFetch(200, { ok: true }, { ok: true, authenticated: true, email: 'cuenta@example.com' })
    render(<PurchaseRating />)
    const input = screen.getByLabelText(/tu correo/i)
    await waitFor(() => expect(input.value).toBe('cuenta@example.com'))
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(star(4))
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(JSON.parse(purchaseCalls()[0][1].body).email).toBe('')
  })

  it('RF-3: la precarga tardía no pisa lo que la persona ya escribió', async () => {
    let release
    global.fetch = jest.fn(url =>
      String(url).includes('/identity')
        ? new Promise(res => {
            release = () => res({ ok: true, json: () => Promise.resolve({ ok: true, authenticated: true, email: 'cuenta@example.com' }) })
          })
        : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
    )
    render(<PurchaseRating />)
    const input = screen.getByLabelText(/tu correo/i)
    fireEvent.change(input, { target: { value: 'escrito@example.com' } })
    release()
    await new Promise(r => setTimeout(r, 20))
    expect(input.value).toBe('escrito@example.com')
  })

  it('anónimo: el correo queda vacío y es opcional (AC-2)', async () => {
    render(<PurchaseRating />)
    expect(screen.getByLabelText(/tu correo/i).value).toBe('')
    fireEvent.click(star(5))
    expect(send().disabled).toBe(false)
  })

  it('un correo mal escrito se rechaza en el navegador sin llamar al servicio', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(4))
    fireEvent.change(screen.getByLabelText(/tu correo/i), { target: { value: 'no-es-correo' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/correo/i))
    expect(purchaseCalls()).toHaveLength(0)
  })

  it('el servidor responde bad-email: muestra el aviso', async () => {
    mockFetch(400, { ok: false, code: 'bad-email' })
    render(<PurchaseRating />)
    fireEvent.click(star(4))
    fireEvent.change(screen.getByLabelText(/tu correo/i), { target: { value: 'a@b.co' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/correo/i))
  })
})
