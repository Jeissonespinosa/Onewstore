/*
 * El precio que se le muestra al cliente.
 *
 *   node scripts/tests/buscar.test.js
 */
const fs = require('fs')
const src = fs.readFileSync('react/buscar.js', 'utf8')
const codigo = src
  .split('\n')
  .filter(l => !l.startsWith('import'))
  .join('\n')
  .replace(/^export (async function|function|const) /gm, '$1 ')
  .replace(/^export .*$/gm, '')
eval(codigo + '\nglobal.aProducto = aProducto; global.pesos = pesos;')

let fallos = 0
const prueba = (nombre, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${nombre}`)
  if (!ok) console.log(`        esperado: ${JSON.stringify(esperado)}\n        real:     ${JSON.stringify(real)}`)
}

const crudo = (precio, lista, cantidad = 10) => ({
  productId: '9',
  productName: 'Llanta Aeolus AGC28 1100-20',
  brand: 'Aeolus',
  link: '/llanta-aeolus/p',
  items: [{
    images: [{ imageUrl: 'https://x/y.png' }],
    sellers: [{ commertialOffer: { Price: precio, ListPrice: lista, AvailableQuantity: cantidad } }],
  }],
})

console.log('=== el precio viene en PESOS, no en centavos ===')
// Comprobado contra /api/pricing/prices/9: basePrice 1591272 = Price 1591272.
// Dividir por 100 mostraba una llanta de camion a $15.913.
prueba('1591272 -> $ 1.591.272', aProducto(crudo(1591272, 1591272)).precioTexto, '$ 1.591.272')
prueba('con decimales se redondea', aProducto(crudo(670435.92, 670435.92)).precioTexto, '$ 670.436')

console.log('\n=== precio 0 no es gratis ===')
// Dos productos de prueba quedaron sin precio cargado. "$ 0" se lee como
// oferta y no se puede comprar.
prueba('Price 0 -> sin texto de precio', aProducto(crudo(0, 0, 0)).precioTexto, '')
prueba('y queda marcado agotado', aProducto(crudo(0, 0, 0)).agotado, true)

console.log('\n=== el tachado solo si hay descuento de verdad ===')
prueba('mismo precio -> sin tachado', aProducto(crudo(100000, 100000)).antes, null)
prueba('lista mayor -> tachado', aProducto(crudo(80000, 100000)).antes, '$ 100.000')
prueba('lista menor no inventa descuento', aProducto(crudo(100000, 80000)).antes, null)

console.log('\n=== disponibilidad ===')
prueba('con stock no esta agotado', aProducto(crudo(1000, 1000, 5)).agotado, false)
prueba('sin stock esta agotado', aProducto(crudo(1000, 1000, 0)).agotado, true)

console.log('\n=== un producto incompleto no revienta el panel ===')
prueba('sin items', aProducto({ productId: '1', productName: 'X' }).precioTexto, '')
prueba('sin imagen', aProducto({ productId: '1', items: [{ sellers: [] }] }).imagen, null)
prueba('sin link usa linkText', aProducto({ productId: '1', linkText: 'abc' }).url, '/abc/p')

console.log(fallos ? `\n${fallos} PRUEBAS FALLIDAS` : '\nTodas las pruebas pasaron')
process.exit(fallos ? 1 : 0)
