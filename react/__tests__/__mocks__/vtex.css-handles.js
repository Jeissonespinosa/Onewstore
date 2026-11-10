/* Mock de vtex.css-handles: cada handle se devuelve tal cual (sin prefijo de app). */
function useCssHandles(handles) {
  const out = {}
  ;(handles || []).forEach(h => {
    out[h] = h
  })
  return out
}
module.exports = { useCssHandles }
