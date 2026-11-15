/*
 * Menu "Categorias" del header (spec 003) — seccion > macro > subcategoria.
 *
 * Boton disparador + panel con tres columnas. Los datos salen de
 * react/category-menu.json, que GENERA scripts/gen-categorias.py desde
 * catalogo/estructura-categorias-v2.json: no se edita a mano.
 *
 * Por que un componente propio y no vtex.menu: el spike de la spec 003 (plan.md,
 * "Resultados del spike") mostro que vtex.menu / vtex.store-drawer no cierran con
 * Esc, no abren con el foco, no exponen aria-expanded y no devuelven el foco.
 *
 * Teclado (patron "disclosure" + navegacion por columnas):
 *   - Enter / Espacio / clic en el boton abre y cierra; ArrowDown abre y entra.
 *   - Flechas arriba / abajo, Inicio y Fin recorren la columna actual.
 *   - Flecha derecha entra en la columna siguiente; izquierda vuelve a la anterior.
 *   - Esc cierra y devuelve el foco al boton. Salir con Tab o hacer clic fuera cierra.
 *
 * Los estilos son un CSS Module (react/CategoryMenu.css), sin estilos inline: el
 * builder de estilos de VTEX no admite un archivo propio para el theme.
 * Cada elemento lleva el handle (para personalizarlo desde fuera) y su clase del module.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import menuData from './category-menu.json'
import styles from './CategoryMenu.css'

const CSS_HANDLES = [
  'categoryMenu',
  'trigger',
  'triggerIcon',
  'triggerLabel',
  'panel',
  'column',
  'columnSections',
  'columnMacros',
  'columnSubs',
  'list',
  'item',
  'itemActive',
  'itemCurrent',
  'itemButton',
  'itemLink',
  'itemCaret',
  'seeAll',
]

const COL_SECTIONS = 0
const COL_MACROS = 1
const COL_SUBS = 2

/* handle + clase del CSS Module de cada elemento */
const cx = (...names) => names.filter(Boolean).join(' ')

/* VTEX a veces entrega la ruta interna de routing (/_v/segment/routing/...).
   Nos quedamos con la ruta publica, la que ve el cliente. */
function publicPath(path) {
  const clean = (path || '').split('?')[0].split('#')[0]
  if (clean.indexOf('/_v/') !== 0) return clean.replace(/\/+$/, '') || '/'
  const parts = clean.split('/').filter(Boolean)
  for (let i = parts.length - 1; i > 0; i -= 1) {
    if (/^\d+$/.test(parts[i])) return `/${parts.slice(i + 1).join('/')}`
  }
  return clean
}

const isCurrent = (item, path) => item.path === path
const isOnBranch = (item, path) => path === item.path || path.indexOf(`${item.path}/`) === 0
const hasKids = item => !!(item && item.children && item.children.length)

/* Seccion y macro que contienen la pagina actual; si no hay, la primera. */
function initialSelection(sections, path) {
  let section = sections.findIndex(s => isOnBranch(s, path))
  if (section < 0) section = 0
  const macros = (sections[section] && sections[section].children) || []
  let macro = macros.findIndex(m => hasKids(m) && isOnBranch(m, path))
  if (macro < 0) macro = macros.findIndex(hasKids)
  return { section, macro: macro < 0 ? null : macro }
}

function Caret() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true" focusable="false">
      <path d="M1.5 1.5 6 6l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function Hamburger() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true" focusable="false">
      <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CategoryMenu({ sections: sectionsProp, label = 'Categorías', id = 'rx-category-menu' }) {
  // La app real devuelve { handles, withModifiers }; el mock de los tests, el mapa directo.
  const cssHandles = useCssHandles(CSS_HANDLES)
  const handles = cssHandles.handles || cssHandles
  const h = {}
  CSS_HANDLES.forEach(name => {
    h[name] = cx(handles[name], styles[name])
  })
  const { navigate, route } = useRuntime()
  const sections = sectionsProp || (menuData && menuData.sections) || []
  const path = publicPath(route && route.path)

  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState({ section: 0, macro: null })

  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const pointerInside = useRef(false)

  const panelId = `${id}-panel`

  const close = useCallback(() => setOpen(false), [])

  const openMenu = useCallback(() => {
    setSel(initialSelection(sections, path))
    setOpen(true)
  }, [sections, path])

  const columnItems = col =>
    panelRef.current ? Array.from(panelRef.current.querySelectorAll(`[data-col="${col}"]`)) : []

  const focusSoon = fn => setTimeout(fn, 0)

  // Clic fuera: cierra. Se escucha solo mientras esta abierto.
  useEffect(() => {
    if (!open) return undefined
    const onDown = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Mientras el puntero esta presionado dentro del menu, el blur no cierra
  // (Safari no da foco a los botones al hacer clic).
  useEffect(() => {
    const onUp = () => setTimeout(() => { pointerInside.current = false }, 0)
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [])

  if (!sections.length) return null

  const section = sections[sel.section] || sections[0]
  const macros = section.children || []
  const macro = sel.macro != null ? macros[sel.macro] : null
  const subs = hasKids(macro) ? macro.children : null

  const onRootKeyDown = e => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      if (triggerRef.current) triggerRef.current.focus()
    }
  }

  const onTriggerKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openMenu()
      focusSoon(() => {
        const first = columnItems(COL_SECTIONS)[0]
        if (first) first.focus()
      })
    }
  }

  const onPanelKeyDown = e => {
    if (!e.target.hasAttribute || !e.target.hasAttribute('data-col')) return
    const col = Number(e.target.getAttribute('data-col'))
    const list = columnItems(col)
    const at = list.indexOf(e.target)
    let target = null
    switch (e.key) {
      case 'ArrowDown': target = list[Math.min(at + 1, list.length - 1)]; break
      case 'ArrowUp': target = list[Math.max(at - 1, 0)]; break
      case 'Home': target = list[0]; break
      case 'End': target = list[list.length - 1]; break
      case 'ArrowRight': target = columnItems(col + 1)[0]; break
      case 'ArrowLeft': {
        const prev = columnItems(col - 1)
        target = prev.find(el => el.getAttribute('aria-expanded') === 'true') || prev[0]
        break
      }
      default: return
    }
    e.preventDefault()
    if (target) target.focus()
  }

  // Macro a mostrar al elegir una seccion: la de la pagina actual si esta en ella.
  const macroFor = i => {
    const start = initialSelection(sections, path)
    if (start.section === i) return start.macro
    const k = (sections[i].children || []).findIndex(hasKids)
    return k < 0 ? null : k
  }

  const onRootBlur = e => {
    if (pointerInside.current) return
    if (rootRef.current && e.relatedTarget && rootRef.current.contains(e.relatedTarget)) return
    setOpen(false)
  }

  const onLinkClick = (e, to) => {
    setOpen(false)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate({ to })
  }

  const renderLink = (item, col, extraClass) => (
    <a
      href={item.path}
      data-col={col}
      className={`${h.itemLink} ${extraClass || ''}`.trim()}
      aria-current={isCurrent(item, path) ? 'page' : undefined}
      onClick={e => onLinkClick(e, item.path)}
    >
      {item.nombre}
    </a>
  )

  const renderSeeAll = (item, col) => (
    <a
      href={item.path}
      data-col={col}
      className={`${h.itemLink} ${h.seeAll}`}
      aria-current={isCurrent(item, path) ? 'page' : undefined}
      onClick={e => onLinkClick(e, item.path)}
    >
      {`Ver todo en ${item.nombre}`}
    </a>
  )

  const renderItem = (item, col, active, onSelect, controls) => {
    const cls = [h.item, active ? h.itemActive : '', isOnBranch(item, path) ? h.itemCurrent : '']
      .filter(Boolean)
      .join(' ')
    if (!hasKids(item)) {
      return (
        <li key={item.path} className={cls}>
          {renderLink(item, col)}
        </li>
      )
    }
    return (
      <li key={item.path} className={cls} onMouseEnter={onSelect}>
        <button
          type="button"
          data-col={col}
          className={h.itemButton}
          aria-expanded={active}
          aria-controls={controls}
          onFocus={onSelect}
          onClick={() => {
            onSelect()
            focusSoon(() => {
              const next = columnItems(col + 1)[0]
              if (next) next.focus()
            })
          }}
        >
          <span>{item.nombre}</span>
          <span className={h.itemCaret}><Caret /></span>
        </button>
      </li>
    )
  }

  return (
    <div
      className={h.categoryMenu}
      ref={rootRef}
      onKeyDown={onRootKeyDown}
      onBlur={onRootBlur}
      onMouseDown={() => { pointerInside.current = true }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={h.trigger}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={h.triggerIcon}><Hamburger /></span>
        <span className={h.triggerLabel}>{label}</span>
      </button>

      {open && (
        <nav
          id={panelId}
          ref={panelRef}
          className={h.panel}
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
        >
          <div className={`${h.column} ${h.columnSections}`}>
            <ul className={h.list}>
              {sections.map((s, i) =>
                renderItem(s, COL_SECTIONS, i === sel.section,
                  () => setSel(prev => (prev.section === i ? prev : { section: i, macro: macroFor(i) })),
                  `${id}-macros`)
              )}
            </ul>
          </div>

          <div id={`${id}-macros`} className={`${h.column} ${h.columnMacros}`}>
            {renderSeeAll(section, COL_MACROS)}
            <ul className={h.list}>
              {macros.map((m, i) =>
                renderItem(m, COL_MACROS, i === sel.macro,
                  () => setSel(prev => ({ ...prev, macro: i })),
                  `${id}-subs`)
              )}
            </ul>
          </div>

          {subs && (
            <div id={`${id}-subs`} className={`${h.column} ${h.columnSubs}`}>
              {renderSeeAll(macro, COL_SUBS)}
              <ul className={h.list}>
                {subs.map(s => (
                  <li key={s.path} className={`${h.item} ${isOnBranch(s, path) ? h.itemCurrent : ''}`.trim()}>
                    {renderLink(s, COL_SUBS)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      )}
    </div>
  )
}

export default CategoryMenu
