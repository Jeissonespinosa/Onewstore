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
import { createPortal } from 'react-dom'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

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
  // variante drawer (movil)
  'triggerLabelHidden',
  'drawerRoot',
  'drawerOverlay',
  'drawer',
  'drawerHeader',
  'drawerTitle',
  'drawerClose',
  'drawerBody',
  'accItem',
  'accButton',
  'accLink',
  'accPanel',
  'accCaret',
  'accSeeAll',
  'level1',
  'level2',
  'level3',
  'drawerLoading',
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

/* Clase de cada elemento = handle de vtex.css-handles + clase del CSS Module. */
function useClasses() {
  // La app real devuelve { handles, withModifiers }; el mock de los tests, el mapa directo.
  const cssHandles = useCssHandles(CSS_HANDLES)
  const handles = cssHandles.handles || cssHandles
  const h = {}
  CSS_HANDLES.forEach(name => {
    h[name] = cx(handles[name], styles[name])
  })
  return h
}

function PanelMenu({ sections, pending, onRequest, label = 'Categorías', id = 'rx-category-menu' }) {
  const h = useClasses()
  const { navigate, route } = useRuntime()
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
    if (onRequest) onRequest()
    setSel(initialSelection(sections, path))
    setOpen(true)
  }, [sections, path, onRequest])

  // Los datos pueden llegar despues de abrir (carga diferida): se elige la rama actual.
  useEffect(() => {
    if (open && sections.length) setSel(initialSelection(sections, path))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

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

  if (!sections.length && !pending) return null

  const section = sections[sel.section] || sections[0] || {}
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
        aria-controls={open && sections.length ? panelId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        onMouseEnter={onRequest}
        onFocus={onRequest}
      >
        <span className={h.triggerIcon}><Hamburger /></span>
        <span className={h.triggerLabel}>{label}</span>
      </button>

      {open && sections.length > 0 && (
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

const FOCUSABLE = 'a[href], button:not([disabled])'
const slug = value => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')

/*
 * Variante movil: boton + drawer (dialogo modal) con un acordeon de tres niveles.
 * Se monta en un portal sobre document.body: el header fijo usa backdrop-filter y un
 * position:fixed dentro de un ancestro con backdrop-filter se ancla a ese ancestro,
 * no a la pantalla. Ver plan.md, decision 10.
 */
function DrawerMenu({ sections, pending, onRequest, label = 'Categorías', id = 'rx-category-menu-drawer' }) {
  const h = useClasses()
  const { navigate, route } = useRuntime()
  const path = publicPath(route && route.path)

  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState({ section: null, macro: null })

  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const dialogId = `${id}-dialog`

  const openMenu = () => {
    if (onRequest) onRequest()
    // Abre desplegada la rama de la pagina actual, si esta dentro del arbol.
    const section = sections.findIndex(x => isOnBranch(x, path))
    const macro =
      section < 0 ? -1 : (sections[section].children || []).findIndex(m => hasKids(m) && isOnBranch(m, path))
    setSel({ section: section < 0 ? null : section, macro: macro < 0 ? null : macro })
    setOpen(true)
  }

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false)
    if (triggerRef.current) triggerRef.current.focus()
  }, [])

  // Al abrir: el foco entra al drawer, el scroll del fondo se bloquea y Esc cierra.
  useEffect(() => {
    if (!open) return undefined
    const lock = styles.bodyLock || 'rx-body-lock'
    document.body.classList.add(lock)
    if (closeRef.current) closeRef.current.focus()
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeAndReturnFocus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove(lock)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, closeAndReturnFocus])

  // Los datos pueden llegar despues de abrir (carga diferida): se despliega la rama actual.
  useEffect(() => {
    if (!open || !sections.length) return
    const section = sections.findIndex(x => isOnBranch(x, path))
    const macro =
      section < 0 ? -1 : (sections[section].children || []).findIndex(m => hasKids(m) && isOnBranch(m, path))
    setSel({ section: section < 0 ? null : section, macro: macro < 0 ? null : macro })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

  if (!sections.length && !pending) return null

  // Tab atrapado dentro del dialogo (aria-modal).
  const onDialogKeyDown = e => {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE))
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const onLinkClick = (e, to) => {
    setOpen(false)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate({ to })
  }

  const renderLink = (item, level, text, extra) => (
    <a
      href={item.path}
      className={cx(h.accLink, h[level], extra)}
      aria-current={isCurrent(item, path) ? 'page' : undefined}
      onClick={e => onLinkClick(e, item.path)}
    >
      {text || item.nombre}
    </a>
  )

  const renderSeeAll = (item, level) =>
    renderLink(item, level, `Ver todo en ${item.nombre}`, h.accSeeAll)

  // Un nivel del acordeon: boton con aria-expanded + panel (solo montado si esta abierto).
  const renderAccordion = (item, level, expanded, onToggle, body) => {
    const panelId = `${id}-${slug(item.path)}`
    return (
      <li key={item.path} className={h.accItem}>
        <button
          type="button"
          className={cx(h.accButton, h[level])}
          aria-expanded={expanded}
          aria-controls={expanded ? panelId : undefined}
          onClick={onToggle}
        >
          <span>{item.nombre}</span>
          <span className={h.accCaret}><Caret /></span>
        </button>
        {expanded && (
          <div id={panelId} className={h.accPanel}>
            {body}
          </div>
        )}
      </li>
    )
  }

  const renderSubs = macro => (
    <>
      {renderSeeAll(macro, 'level3')}
      <ul className={h.list}>
        {macro.children.map(sub => (
          <li key={sub.path} className={h.accItem}>
            {renderLink(sub, 'level3')}
          </li>
        ))}
      </ul>
    </>
  )

  const renderMacros = section => (
    <>
      {renderSeeAll(section, 'level2')}
      <ul className={h.list}>
        {(section.children || []).map((macro, j) =>
          hasKids(macro) ? (
            renderAccordion(
              macro,
              'level2',
              sel.macro === j,
              () => setSel(prev => ({ ...prev, macro: prev.macro === j ? null : j })),
              renderSubs(macro)
            )
          ) : (
            <li key={macro.path} className={h.accItem}>
              {renderLink(macro, 'level2')}
            </li>
          )
        )}
      </ul>
    </>
  )

  const drawer = (
    <div className={h.drawerRoot}>
      <div className={h.drawerOverlay} onClick={closeAndReturnFocus} aria-hidden="true" />
      <div
        id={dialogId}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={h.drawer}
        onKeyDown={onDialogKeyDown}
      >
        <div className={h.drawerHeader}>
          <span className={h.drawerTitle}>{label}</span>
          <button
            type="button"
            ref={closeRef}
            className={h.drawerClose}
            aria-label="Cerrar menú"
            onClick={closeAndReturnFocus}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M2 2l12 12M14 2 2 14" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
        </div>
        <nav aria-label={label} className={h.drawerBody}>
          {!sections.length && <p className={h.drawerLoading} role="status">Cargando categorías…</p>}
          <ul className={h.list}>
            {sections.map((section, i) =>
              renderAccordion(
                section,
                'level1',
                sel.section === i,
                () =>
                  setSel(prev =>
                    prev.section === i ? { section: null, macro: null } : { section: i, macro: null }
                  ),
                renderMacros(section)
              )
            )}
          </ul>
        </nav>
      </div>
    </div>
  )

  return (
    <div className={h.categoryMenu}>
      <button
        type="button"
        ref={triggerRef}
        className={h.trigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        onClick={() => (open ? closeAndReturnFocus() : openMenu())}
        onMouseEnter={onRequest}
        onFocus={onRequest}
      >
        <span className={h.triggerIcon}><Hamburger /></span>
        <span className={h.triggerLabelHidden}>{label}</span>
      </button>
      {open && typeof document !== 'undefined' && createPortal(drawer, document.body)}
    </div>
  )
}

/*
 * variant="panel" (por defecto): escritorio, mega-menu de tres columnas.
 * variant="drawer": movil, drawer con acordeon.
 */
function CategoryMenu({ variant = 'panel', sections: sectionsProp, ...rest }) {
  // Sin `sections` el arbol (46 KB) se descarga al primer uso del menu (hover, foco o clic en
  // el boton), no con el primer pintado de cada pagina: pesa en Lighthouse (spec 003, AC-7).
  const [loaded, setLoaded] = useState(null)
  const inflight = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const onRequest = useCallback(() => {
    if (sectionsProp || loaded || inflight.current) return
    inflight.current = true
    import('./category-menu.json')
      .then(mod => {
        const data = mod && mod.default ? mod.default : mod
        if (mounted.current) setLoaded((data && data.sections) || [])
      })
      .catch(() => {
        inflight.current = false // reintenta en la siguiente interaccion
      })
  }, [sectionsProp, loaded])

  const sections = sectionsProp || loaded || []
  const pending = !sectionsProp && !loaded
  const Variant = variant === 'drawer' ? DrawerMenu : PanelMenu
  return <Variant {...rest} sections={sections} pending={pending} onRequest={sectionsProp ? undefined : onRequest} />
}

export default CategoryMenu
