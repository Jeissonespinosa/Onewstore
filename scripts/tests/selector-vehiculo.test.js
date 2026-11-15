/*
 * Cruce base de vehiculos x facets del catalogo.
 *
 * Comprueba que al elegir una marca el selector solo ofrezca modelos
 * de esa marca. No necesita jest ni navegador: extrae las funciones
 * reales de react/VehicleSelector.js y las corre contra la base.
 *
 *   node scripts/tests/selector-vehiculo.test.js
 *
 * La lista facetModelos replica lo que VTEX devuelve hoy para la
 * categoria Llantas; si cambia el catalogo de prueba, actualizala.
 */
const fs=require('fs');
const src=fs.readFileSync('react/VehicleSelector.js','utf8');
const vehiculos=JSON.parse(fs.readFileSync('react/data/vehiculos-colombia.json','utf8'));
// extraigo las funciones reales del componente
const corte=src.slice(src.indexOf('function normalize'), src.indexOf('const VehicleSelector'));
const codigo=corte.split('\n').filter(l=>!l.startsWith('import')).join('\n');
eval(codigo + '\nglobal.normalize=normalize; global.modelosDeMarca=modelosDeMarca; global.cruzar=cruzar; global.anosDeModelo=anosDeModelo;');

// facets reales de la categoria Llantas (lo que devuelve VTEX hoy)
const facetModelos=['Accent','Cherokee','Cruze','D-Max','Fluence','Frontier NP300','Grand Vitara','Hilux','Jetta','Logan','March','NPR','Ranger','Rio','Sail','Vitara'].map(n=>({name:n,value:n.toLowerCase(),key:'modelo'}));
const facetAnios=[]; for(let y=2000;y<=2024;y++) facetAnios.push({name:String(y),value:String(y),key:'ano'});

let fallos=0;
function prueba(nombre, real, esperado){
  const ok=JSON.stringify(real)===JSON.stringify(esperado);
  if(!ok) fallos++;
  console.log(`  ${ok?'OK  ':'FALLA'} ${nombre}`);
  if(!ok) console.log(`        esperado: ${JSON.stringify(esperado)}\n        real:     ${JSON.stringify(real)}`);
}

const mods = m => cruzar(facetModelos, modelosDeMarca('carros', m)).map(o=>o.name);
console.log('=== modelos por marca (cruce base x facet) ===');
prueba('Toyota   -> solo Hilux',            mods('Toyota'),    ['Hilux']);
prueba('Chevrolet-> sus 6 modelos',         mods('Chevrolet'), ['Cruze','D-Max','Grand Vitara','NPR','Sail','Vitara']);
prueba('Chevrolet-> NO trae Cherokee',      mods('Chevrolet').includes('Cherokee'), false);
prueba('Nissan   -> Frontier/NP300, March', mods('Nissan'),    ['Frontier NP300','March']);
prueba('Ford     -> solo Ranger',           mods('Ford'),      ['Ranger']);
prueba('Renault  -> Fluence, Logan',        mods('Renault'),   ['Fluence','Logan']);
prueba('Kia      -> solo Rio (no Frontier)',mods('Kia'),       ['Rio']);
prueba('Jeep     -> solo Cherokee',         mods('Jeep'),      ['Cherokee']);
prueba('Suzuki   -> Grand Vitara, Vitara',  mods('Suzuki'),    ['Grand Vitara','Vitara']);

console.log('\n=== marca desconocida: no debe filtrar ===');
prueba('Ferrari  -> deja los 16 del facet', mods('Ferrari').length, 16);

console.log('\n=== años por modelo ===');
const anios=(ma,mo)=>{const r=anosDeModelo('carros',ma,mo); if(!r) return 'sin rango';
  const d=facetAnios.filter(o=>{const y=parseInt(o.name,10); return y>=r.desde&&y<=r.hasta;});
  return `${d[0].name}-${d[d.length-1].name} (${d.length})`;};
console.log('  Toyota Hilux     ->', anios('Toyota','Hilux'));
console.log('  Chevrolet Sail   ->', anios('Chevrolet','Sail'));
console.log('  Jeep Cherokee    ->', anios('Jeep','Cherokee'));
console.log('  Renault Logan    ->', anios('Renault','Logan'));

console.log('\n=== motos ===');
const mm = m => Object.keys(modelosDeMarca('motos', m)||{}).length;
console.log('  Yamaha:', mm('Yamaha'), 'modelos | Bajaj:', mm('Bajaj'), '| Honda:', mm('Honda'));

console.log(fallos ? `\n${fallos} PRUEBAS FALLIDAS` : '\nTodas las pruebas pasaron');
process.exit(fallos?1:0);
