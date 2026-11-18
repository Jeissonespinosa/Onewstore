/*
 * Logica pura de la aceptacion de los terminos en el checkout (spec 001, tarea 7.1).
 *
 * Sin DOM ni red: solo decide y construye datos, para probarla con Jest
 * (react/__tests__/AceptacionTyc.test.js, constitucion #2). El script que la conecta con
 * la pagina del checkout es la tarea 7.2.
 *
 * Decisiones del plan: 7 (registro en customData del orderForm: version y fecha, nada mas,
 * constitucion #6) y 8 (se pide aceptar en CADA compra: el checkbox arranca siempre
 * desmarcado, no se recuerda la aceptacion).
 *
 * UMD: funciona como modulo CommonJS (tests) y como script del navegador
 * (window.RepuestoxAceptacionTyc). OJO 7.2: el builder checkout-ui-custom sirve solo
 * checkout6-custom.js; este archivo hay que incluirlo en el, no importarlo.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.RepuestoxAceptacionTyc = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  // Versiones publicadas de cada documento. DEBEN coincidir con la linea
  // "Version AAAA.MM.DD" de su borrador; un test lo comprueba (AC-4).
  var DOCUMENTOS = [
    { id: 'tyc', ruta: '/terminos-y-condiciones', texto: 'Términos y condiciones', version: '2026.11.17' },
    { id: 'venta', ruta: '/terminos-de-venta', texto: 'Términos de venta', version: '2026.11.18' },
    { id: 'privacidad', ruta: '/politica-de-privacidad', texto: 'Política de privacidad', version: '2026.11.18' },
  ]

  var APP_ID = 'repuestox-tyc'
  var MENSAJE_BLOQUEO = 'Para pagar, acepta los términos y condiciones, los términos de venta y la política de privacidad.'

  // "tyc=2026.11.17;venta=2026.11.18;privacidad=2026.11.18"
  function versionVigente() {
    return DOCUMENTOS.map(function (d) { return d.id + '=' + d.version }).join(';')
  }

  // Solo un `true` explicito cuenta como aceptado (nada de valores "truthy").
  function estaAceptado(marcado) {
    return marcado === true
  }

  // Estado del boton de pago: bloqueado hasta marcar.
  function estadoPago(marcado) {
    return estaAceptado(marcado)
      ? { bloqueado: false, mensaje: '' }
      : { bloqueado: true, mensaje: MENSAJE_BLOQUEO }
  }

  // Registro que viaja con el pedido: SOLO version y fecha (constitucion #6).
  function construirRegistro(ahora) {
    var fecha = ahora instanceof Date ? ahora : new Date()
    return {
      appId: APP_ID,
      campos: { version: versionVigente(), aceptadoEn: fecha.toISOString() },
    }
  }

  // Ruta de la API publica del checkout para escribir un campo de customData.
  function rutaCustomData(orderFormId, campo) {
    return '/api/checkout/pub/orderForm/' + encodeURIComponent(orderFormId) +
      '/customData/' + APP_ID + '/' + encodeURIComponent(campo)
  }

  // Lista de peticiones PUT { ruta, cuerpo } que escriben el registro.
  function peticionesDeRegistro(orderFormId, ahora) {
    var registro = construirRegistro(ahora)
    return Object.keys(registro.campos).map(function (campo) {
      return { ruta: rutaCustomData(orderFormId, campo), cuerpo: { value: registro.campos[campo] } }
    })
  }

  // ¿El customData del orderForm ya trae una aceptacion de la version vigente?
  function registroVigente(customData) {
    var apps = (customData && customData.customApps) || []
    for (var i = 0; i < apps.length; i++) {
      if (apps[i] && apps[i].id === APP_ID) {
        var campos = apps[i].fields || {}
        return campos.version === versionVigente() && !!campos.aceptadoEn
      }
    }
    return false
  }

  return {
    APP_ID: APP_ID,
    DOCUMENTOS: DOCUMENTOS,
    MENSAJE_BLOQUEO: MENSAJE_BLOQUEO,
    versionVigente: versionVigente,
    estaAceptado: estaAceptado,
    estadoPago: estadoPago,
    construirRegistro: construirRegistro,
    rutaCustomData: rutaCustomData,
    peticionesDeRegistro: peticionesDeRegistro,
    registroVigente: registroVigente,
  }
})
