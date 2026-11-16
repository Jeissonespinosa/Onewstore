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

function mockFetch(status, body) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }))
}

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
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/_v/feedback/purchase')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      orderId: '1234567890123',
      rating: 2,
      comment: 'Llegó tarde',
      reason: 'envio',
      website: '',
    })
    expect(screen.getByRole('status').textContent).toMatch(/gracias/i)
  })

  it('AC-2: se puede enviar solo con estrellas, sin comentario', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(5))
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ rating: 5, comment: '', reason: '' })
  })

  it('al pasar de 2 a 5 estrellas no envía el motivo', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(2))
    fireEvent.change(screen.getByLabelText(/qué falló/i), { target: { value: 'precio' } })
    fireEvent.click(star(5))
    fireEvent.click(send())
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).reason).toBe('')
  })

  it('un doble clic no envía dos veces', async () => {
    render(<PurchaseRating />)
    fireEvent.click(star(4))
    const btn = send()
    fireEvent.click(btn)
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(global.fetch).toHaveBeenCalledTimes(1)
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
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    render(<PurchaseRating />)
    fireEvent.click(star(3))
    fireEvent.change(screen.getByLabelText(/cuéntanos más/i), { target: { value: 'texto' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByLabelText(/cuéntanos más/i).value).toBe('texto')
    expect(star(3).getAttribute('aria-checked')).toBe('true')
  })

  it('respuesta que no es JSON (p. ej. 504 del proxy): mensaje genérico', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 504, json: () => Promise.reject(new Error('no json')) }))
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).website).toBe('')
  })
})
