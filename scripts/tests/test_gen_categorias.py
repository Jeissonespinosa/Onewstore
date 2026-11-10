"""
Tests adversariales de scripts/gen-categorias.py.

Cada test documenta: SUPUESTO que rompe, ENTRADA concreta, QUE PASA HOY (bug)
y QUE DEBERIA PASAR. Los tests marcados "ROJO HOY" fallan con el codigo
actual a proposito: capturan el comportamiento correcto esperado.

Nunca escriben en store/ ni catalogo/ reales: usan un Sandbox en tmp_path
(ver _sandbox.py) porque el script ejecuta todo al importarse.

Correr:
    python3 -m pytest scripts/tests/test_gen_categorias.py -v
  o sin pytest:
    python3 -m unittest scripts/tests/test_gen_categorias.py -v
"""
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _sandbox import Sandbox, import_pure_functions, minimal_tree, SCRIPT  # noqa: E402


def _quiet(fn, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kwargs)


class _Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp_path = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def sandbox(self, **kw):
        return Sandbox(os.path.join(self.tmp_path, 'sb%d' % len(os.listdir(self.tmp_path))), **kw)


# ---------------------------------------------------------------------------
# Funciones puras
# ---------------------------------------------------------------------------
class TestSlugify(_Base):
    def setUp(self):
        super(TestSlugify, self).setUp()
        self.fn = import_pure_functions()

    def test_basico(self):
        s = self.fn['slugify']
        self.assertEqual(s('Pastillas de freno'), 'pastillas-de-freno')
        self.assertEqual(s('Mordazas (calipers)'), 'mordazas-calipers')
        self.assertEqual(s('Citroën'), 'citroen')
        self.assertEqual(s('Año'), 'ano')

    def test_ROJO_HOY_slug_vacio_debe_fallar_no_devolver_cadena_vacia(self):
        """
        SUPUESTO: todo nombre produce un slug no vacio.
        ENTRADA: nombres sin caracteres [a-z0-9] tras NFD: '日本語', '¿?', '   ', '€'.
        HOY: slugify devuelve '' y build_tree construye la ruta '/carros/'
             (con barra final, colisiona con el landing) o '/carros//pastillas'.
        ESPERADO: slugify lanza ValueError (o build_tree aborta con mensaje claro).
        """
        s = self.fn['slugify']
        for name in ('日本語', '¿?', '   ', '€'):
            with self.assertRaises(ValueError):      # el msg= evaluaba s(name) aqui mismo
                s(name)

    def test_ROJO_HOY_eszett_y_o_barrada(self):
        """
        SUPUESTO: unicodedata NFD basta para transliterar.
        ENTRADA: 'Straße', 'Ø-ring'.
        HOY: 'stra-e' (la ß desaparece dejando un guion) y 'ring' (la Ø se pierde).
        ESPERADO: 'strasse' y 'o-ring' (o al menos no perder la letra).
        """
        s = self.fn['slugify']
        self.assertEqual(s('Straße'), 'strasse')
        self.assertEqual(s('Ø-ring'), 'o-ring')


class TestPlaceholderSvg(_Base):
    def setUp(self):
        super(TestPlaceholderSvg, self).setUp()
        self.fn = import_pure_functions()

    def _svg_of(self, data_uri):
        return data_uri.split('utf8,', 1)[1]

    def test_nombre_simple_es_svg_valido(self):
        ET.fromstring(self._svg_of(self.fn['placeholder']('Frenos')))

    def test_ROJO_HOY_ampersand_rompe_el_svg(self):
        """
        SUPUESTO: el nombre de la categoria se puede interpolar crudo en un data:image/svg+xml.
        ENTRADA: 'Llantas & rines'  (tambien '<', '>', "'").
        HOY: el src queda con '&' sin escapar -> XML mal formado -> el navegador
             no pinta la imagen placeholder.
        ESPERADO: el SVG resultante es XML valido (escapar &,<,>,' o percent-encode).
        """
        for label in ('Llantas & rines', 'A <b>', "Rines d'or"):
            svg = self._svg_of(self.fn['placeholder'](label))
            try:
                ET.fromstring(svg)
            except ET.ParseError as e:
                self.fail('placeholder(%r) genera SVG invalido: %s' % (label, e))
            svg = self._svg_of(self.fn['banner_placeholder'](label))
            try:
                ET.fromstring(svg)
            except ET.ParseError as e:
                self.fail('banner_placeholder(%r) genera SVG invalido: %s' % (label, e))


class TestGridClass(_Base):
    def test_cero_y_multiplos(self):
        g = import_pure_functions()['grid_class']
        self.assertEqual(g(12), 'rxLineasGrid')
        self.assertEqual(g(10), ['rxLineasGrid', 'rxLineasGrid5'])
        self.assertEqual(g(30), 'rxLineasGrid')       # %6==0 gana
        self.assertEqual(g(0), 'rxLineasGrid')


# ---------------------------------------------------------------------------
# Seguridad de ejecucion
# ---------------------------------------------------------------------------
class TestEjecucion(_Base):
    def test_ROJO_HOY_flag_desconocido_no_debe_escribir(self):
        """
        SUPUESTO: solo '--real' cambia el comportamiento; cualquier otro flag es inofensivo.
        ENTRADA: python3 scripts/gen-categorias.py --dry-run   (o --help, o un typo de --real)
        HOY: REAL_QUERIES = '--real' in sys.argv ignora lo demas y ESCRIBE routes.json,
             9 .jsonc y el CSV en el repo real.
        ESPERADO: flag desconocido -> error de uso sin escribir nada (y --dry-run existe).
        """
        sb = self.sandbox(tree=minimal_tree())
        seco = sb.run_subprocess(['--dry-run'])
        self.assertEqual(sb.outputs(), [], 'escribio bloques con --dry-run: %s' % sb.outputs())
        self.assertEqual(seco.returncode, 0, '--dry-run deberia terminar bien')
        malo = sb.run_subprocess(['--reeal'])        # typo de --real
        self.assertNotEqual(malo.returncode, 0, 'un flag desconocido deberia fallar')
        self.assertEqual(sb.outputs(), [], 'un flag desconocido escribio bloques')

    def test_ROJO_HOY_importar_el_modulo_no_debe_tener_efectos(self):
        """
        SUPUESTO: un script se puede importar (p.ej. desde tests) sin ejecutarlo.
        ENTRADA: importlib sobre una copia del script en tmp.
        HOY: al importar corre TODO (lee catalogo, escribe store/ y CSV): no hay
             `if __name__ == '__main__'` ni main().
        ESPERADO: importar no escribe; existe main() (o generate(root, real, dry_run)).
        """
        sb = self.sandbox(tree=minimal_tree())
        mod = _quiet(sb.import_only)
        self.assertEqual(sb.outputs(), [], 'importar el modulo escribio archivos')
        self.assertTrue(hasattr(mod, 'main'), 'no existe main()')

    def test_ROJO_HOY_routes_invalido_no_debe_dejar_salida_parcial(self):
        """
        SUPUESTO: si algo falla, el repo queda como estaba.
        ENTRADA: store/routes.json con JSON invalido ('{ not json').
        HOY: routes.json se lee al FINAL (paso 6): antes ya se escribieron los 9
             .jsonc y el CSV. El crash deja bloques store.custom#... sin ruta.
        ESPERADO: validar entradas antes de escribir (o escribir en temporales y
                  mover al final); no queda ningun archivo generado.
        """
        sb = self.sandbox(tree=minimal_tree())
        sb.write_routes_raw('{ not json')
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(sb.outputs(), [], 'salida parcial tras el crash: %s' % sb.outputs())
        self.assertFalse(os.path.exists(os.path.join(sb.cat, 'estructura-categorias-v2.csv')))

    def test_seccion_faltante_falla_antes_de_escribir(self):
        """Falta 'Herramientas' en el JSON: hoy KeyError ANTES de escribir (ok), lo fijamos."""
        t = minimal_tree()
        del t['Herramientas']
        sb = self.sandbox(tree=t)
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(sb.outputs(), [])

    def test_slugs_duplicados_abortan_antes_de_escribir(self):
        t = minimal_tree(Carros=[{'nombre': 'Mordazas (calipers)', 'subs': []},
                                 {'nombre': 'Mordazas - calipers', 'subs': []}])
        sb = self.sandbox(tree=t)
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('claves duplicadas', r.stderr + r.stdout)
        self.assertEqual(sb.outputs(), [])


# ---------------------------------------------------------------------------
# Salida: rutas, bloques, CSV
# ---------------------------------------------------------------------------
class TestSalida(_Base):
    def test_es_idempotente(self):
        sb = self.sandbox(tree=minimal_tree())
        _quiet(sb.run)
        first = {n: open(os.path.join(sb.blocks, n), encoding='utf-8').read() for n in sb.outputs()}
        first_routes = sb.read_routes()
        _quiet(sb.run)
        second = {n: open(os.path.join(sb.blocks, n), encoding='utf-8').read() for n in sb.outputs()}
        self.assertEqual(first, second)
        self.assertEqual(first_routes, sb.read_routes())

    def test_salida_commiteada_esta_al_dia_con_el_json(self):
        """Los .jsonc y routes.json del repo deben ser lo que produce el script hoy."""
        from _sandbox import REPO, load_jsonc
        sb = self.sandbox()          # catalogo y routes reales copiados
        _quiet(sb.run)
        for name in sb.outputs():
            self.assertEqual(load_jsonc(os.path.join(sb.blocks, name)),
                             load_jsonc(os.path.join(REPO, 'store', 'blocks', 'home', name)),
                             '%s desactualizado: vuelve a correr gen-categorias.py' % name)
        with open(os.path.join(REPO, 'store', 'routes.json'), encoding='utf-8') as fh:
            self.assertEqual(sb.read_routes(), json.load(fh))

    def test_ROJO_HOY_slug_vacio_no_debe_generar_ruta_con_barra_final(self):
        """
        SUPUESTO: cada nodo tiene slug; las rutas son /sec/macro[/sub][/hoja].
        ENTRADA: macro 'Carros' con nombre '日本語' (slug '').
        HOY: rutas '/carros/' (colisiona con el landing /carros) y '/carros//pastillas';
             claves 'carros' y 'carros--pastillas'. Ninguna validacion lo detiene.
        ESPERADO: el script aborta (nombre sin slug) y no escribe.
        """
        t = minimal_tree(Carros=[{'nombre': '日本語', 'subs': [{'nombre': None, 'tipos': ['Pastillas']}]}])
        sb = self.sandbox(tree=t)
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0, 'acepto un slug vacio')
        self.assertEqual(sb.outputs(), [])

    def test_ROJO_HOY_md_escape_tambien_en_el_rail(self):
        """
        SUPUESTO: los nombres se escapan antes de meterlos en un link markdown.
        ENTRADA: macro 'Frenos [ABS]'.
        HOY: card_blocks() usa md_escape() pero el rail (seccion 1) NO:
             rich-text#rx-carros-linea-01-txt = '[Frenos [ABS]](/carros/frenos-abs)'
             -> markdown roto (el link se corta en el primer ']').
        ESPERADO: '[Frenos \\[ABS\\]](/carros/frenos-abs)' como en las cuadriculas.
        """
        t = minimal_tree(Carros=[{'nombre': 'Frenos [ABS]', 'subs': [{'nombre': None, 'tipos': ['Pastillas']}]}])
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        rail = sb.read_blocks('category-rail.jsonc')
        self.assertEqual(rail['rich-text#rx-carros-linea-01-txt']['props']['text'],
                         '[Frenos \\[ABS\\]](/carros/frenos-abs)')

    def test_ROJO_HOY_placeholder_con_ampersand_en_bloques(self):
        """Mismo bug que TestPlaceholderSvg pero visto en la salida real del generador."""
        t = minimal_tree(Carros=[{'nombre': 'Llantas & rines', 'subs': [{'nombre': None, 'tipos': ['A']}]}])
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        src = sb.read_blocks('category-rail.jsonc')['image#rx-carros-linea-01-img']['props']['src']
        try:
            ET.fromstring(src.split('utf8,', 1)[1])
        except ET.ParseError as e:
            self.fail('image#rx-carros-linea-01-img.src es un SVG invalido: %s' % e)

    def test_ROJO_HOY_csv_hoja_bajo_macro_sin_sub_va_en_columna_hoja(self):
        """
        SUPUESTO: la columna 'Tipo de producto (hoja)' contiene la hoja.
        ENTRADA: macro 'Frenos' sin subcategorias con tipo 'Pastillas' (134 de las
                 537 hojas reales estan en este caso).
        HOY: export_csv escribe la hoja en 'Subcategoria' y deja 'Tipo de producto (hoja)'
             vacio: la expresion `(n['nombre'] if n['kind']=='hoja' else n['nombre'])`
             es identica en ambas ramas (condicional muerto).
        ESPERADO: fila ['Carros','Frenos','','Pastillas','/carros/frenos/pastillas',''].
        """
        t = minimal_tree(Carros=[{'nombre': 'Frenos', 'subs': [{'nombre': None, 'tipos': ['Pastillas']}]}])
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        # El CSV exporta los tres niveles y lleva columna 'Nivel':
        # Departamento, Nivel, Macro, Subcategoria, Hoja, URL, Sinonimos.
        row = [r for r in sb.read_csv() if r[0] == 'Carros' and r[1] == 'Tipo de producto'][0]
        self.assertEqual(row[:6],
                         ['Carros', 'Tipo de producto', 'Frenos', '', 'Pastillas', '/carros/frenos/pastillas'])

    def test_ROJO_HOY_csv_injection(self):
        """
        SUPUESTO: el CSV solo lo abre gente de confianza / el JSON es de confianza.
        ENTRADA: nombre '=SUM(1)' y sinonimo '=HYPERLINK("http://evil")'.
        HOY: csv.writer escribe la celda cruda; Excel/Sheets la evalua como formula.
        ESPERADO: celdas que empiezan por = + - @ se neutralizan (prefijo ' o tab).
        """
        t = minimal_tree()
        t['_sinonimos'] = {'Pastillas de freno': ['=HYPERLINK("http://evil")', '+cmd']}
        t['Carros'] = [{'nombre': '=SUM(1)', 'subs': [{'nombre': None, 'tipos': ['Pastillas de freno']}]}]
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        for row in sb.read_csv()[1:]:
            for cell in row:
                self.assertFalse(cell[:1] in ('=', '+', '-', '@'),
                                 'celda con formula sin neutralizar: %r' % cell)

    def test_ROJO_HOY_sub_sin_tipos_en_seccion_vehiculo_usa_layout_con_selector(self):
        """
        SUPUESTO: en carros/motos toda pagina que lista productos lleva el selector de vehiculo.
        ENTRADA: Carros > Motor > sub 'Bloque' con tipos: [].
        HOY: 'Bloque' no tiene hijos -> recibe search-result-layout.customQuery (lista productos)
             pero como kind=='sub' usa el layout 'rx' (sin selector ni filtros) en vez de 'rx-f'.
        ESPERADO: cualquier pagina hoja (sin hijos) de carros/motos usa 'rx-f'.
        """
        t = minimal_tree(Carros=[{'nombre': 'Motor', 'subs': [{'nombre': 'Bloque', 'tipos': []}]}])
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        listing = sb.read_blocks('category-listing.jsonc')
        blocks = listing['search-result-layout.customQuery#rx-carros-motor-bloque']['blocks']
        self.assertIn('search-result-layout.desktop#rx-f', blocks)

    def test_real_mapfield_tiene_tantas_c_como_segmentos(self):
        sb = self.sandbox(tree=minimal_tree(Carros=[{'nombre': 'Motor', 'subs': [{'nombre': 'Bloque', 'tipos': ['Pistones']}]}]))
        _quiet(sb.run, ['--real'])
        qs = sb.read_blocks('category-listing.jsonc')['search-result-layout.customQuery#rx-carros-motor-bloque-pistones']['props']['querySchema']
        self.assertEqual(qs['queryField'], 'carros/motor/bloque/pistones')
        self.assertEqual(qs['mapField'], 'c,c,c,c')

    def test_rutas_ajenas_se_conservan_y_las_de_seccion_se_regeneran(self):
        routes = {'store.custom#landing-carros': {'path': '/carros'},
                  'store.custom#landing-motos': {'path': '/motos'},
                  'store.custom#faq': {'path': '/faq'},
                  'store.custom#x': {'path': '/carros-usados'}}
        sb = self.sandbox(tree=minimal_tree(), routes=routes)
        _quiet(sb.run)
        out = sb.read_routes()
        self.assertEqual(out['store.custom#faq'], {'path': '/faq'})
        self.assertEqual(out['store.custom#x'], {'path': '/carros-usados'})
        self.assertEqual(out['store.custom#landing-herramientas'], {'path': '/herramientas'})
        self.assertEqual(out['store.custom#carros-frenos'], {'path': '/carros/frenos'})

    def test_ROJO_HOY_ruta_manual_bajo_seccion_no_se_borra_en_silencio(self):
        """
        SUPUESTO (README): 'conserva las rutas que no son de categoria'.
        ENTRADA: routes.json con store.custom#promo -> /carros/promo-navidad (landing manual).
        HOY: el filtro ^/(carros|motos|herramientas)(/|$) la descarta sin aviso; el bloque
             store.custom#promo queda huerfano y la URL deja de existir.
        ESPERADO: conservarla (solo borrar claves store.custom#<sec>-... generadas) o
                  abortar avisando de la colision.
        """
        routes = {'store.custom#landing-carros': {'path': '/carros'},
                  'store.custom#landing-motos': {'path': '/motos'},
                  'store.custom#promo': {'path': '/carros/promo-navidad'}}
        sb = self.sandbox(tree=minimal_tree(), routes=routes)
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0, 'borro una ruta manual sin avisar')
        self.assertEqual(sb.outputs(), [], 'dejo salida parcial al abortar')
        reporte = os.path.join(sb.cat, 'rutas-eliminadas.txt')
        self.assertTrue(os.path.exists(reporte), 'no escribio rutas-eliminadas.txt')
        self.assertIn('store.custom#promo', open(reporte, encoding='utf-8').read())
        # con --force el usuario asume el borrado
        self.assertEqual(sb.run_subprocess(['--force']).returncode, 0)
        self.assertNotIn('store.custom#promo', sb.read_routes())

    def test_ROJO_HOY_hidden_facets_no_duplican_los_nombres_del_componente(self):
        """
        SUPUESTO: un solo lugar define los nombres de facet (brandFacet/modelFacet/yearFacet).
        HOY: category-filters.jsonc oculta 'Marca vehículo'/'Año'/'Modelo' con literales
             copiados de react/VehicleSelector.js; vehicle-selector#rx-f no pasa esos props.
             Si alguien cambia brandFacet en el bloque, el filtro nativo deja de ocultarse.
        ESPERADO: el bloque vehicle-selector#rx-f declara brandFacet/modelFacet/yearFacet
                  y hiddenFilters se construye a partir de esos mismos valores.
        """
        sb = self.sandbox(tree=minimal_tree())
        _quiet(sb.run)
        filters = sb.read_blocks('category-filters.jsonc')
        props = filters['vehicle-selector#rx-f']['props']
        hidden = [h['name'] for h in filters['filter-navigator.v3#rx']['props']['hiddenFacets']['specificationFilters']['hiddenFilters']]
        for key in ('brandFacet', 'modelFacet', 'yearFacet'):
            self.assertIn(key, props, 'vehicle-selector#rx-f no declara %s' % key)
            self.assertIn(props[key], hidden)


# ---------------------------------------------------------------------------
# Auditoria A1-A11 + PARTE B: los 10 casos que no pueden volver a romperse.
# ---------------------------------------------------------------------------
class TestAuditoria(_Base):
    """Un caso por cada bug reportado. Ninguno escribe en el repo real."""

    # 1 --------------------------------------------------------------------
    def test_importar_no_escribe_nada(self):
        """Importar el script (desde un test, un linter, un editor) no puede
        regenerar el theme."""
        sb = self.sandbox(tree=minimal_tree())
        mod = _quiet(sb.import_only)
        self.assertEqual(sb.outputs(), [])
        self.assertTrue(hasattr(mod, 'main'))
        self.assertIsNone(mod.tree, 'importar ya cargo el catalogo')

    # 2 --------------------------------------------------------------------
    def test_flag_desconocido_sale_con_error_y_no_escribe(self):
        """Un typo como --reeal no puede pasar de largo y regenerar igual."""
        sb = self.sandbox(tree=minimal_tree())
        r = sb.run_subprocess(['--reeal'])
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('unrecognized arguments', r.stderr)
        self.assertEqual(sb.outputs(), [])

    # 3 --------------------------------------------------------------------
    def test_dry_run_no_escribe_y_sale_cero(self):
        sb = self.sandbox(tree=minimal_tree())
        r = sb.run_subprocess(['--dry-run'])
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('[dry-run]', r.stdout)
        self.assertEqual(sb.outputs(), [])
        self.assertFalse(os.path.exists(os.path.join(sb.cat, 'estructura-categorias-v2.csv')))

    # 4 --------------------------------------------------------------------
    def test_entrada_invalida_no_deja_salida_parcial(self):
        """Escritura atomica: si routes.json esta roto, el theme queda como
        estaba (antes escribia 9 .jsonc y el CSV, y moria al leer las rutas)."""
        sb = self.sandbox(tree=minimal_tree())
        with open(sb.routes_path, 'w', encoding='utf-8') as fh:
            fh.write('{ no es json')
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(sb.outputs(), [], 'quedo salida parcial')
        self.assertFalse(os.path.exists(os.path.join(sb.cat, 'estructura-categorias-v2.csv')))

    # 5 --------------------------------------------------------------------
    def test_slug_vacio_aborta_con_mensaje(self):
        """Un nombre sin letras latinas daba slug '' y ruta '/carros/', que
        pisa la landing: dos paginas sirviendo la misma URL."""
        t = minimal_tree(Carros=[{'nombre': 'Frenos', 'subs': [{'nombre': None, 'tipos': ['日本語']}]}])
        sb = self.sandbox(tree=t)
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('no produce slug', r.stderr)
        self.assertEqual(sb.outputs(), [])

    def test_translitera_eszett_y_o_barrada(self):
        s = self.fn['slugify'] if hasattr(self, 'fn') else import_pure_functions()['slugify']
        self.assertEqual(s('Straße'), 'strasse')
        self.assertEqual(s('Ø-ring'), 'o-ring')

    # 6 --------------------------------------------------------------------
    def test_nombre_con_ampersand_produce_svg_valido(self):
        """Un & o un < en el nombre rompia el XML del placeholder y con el la
        imagen de todas las tarjetas."""
        t = minimal_tree(Carros=[{'nombre': 'Llantas & rines', 'subs': [{'nombre': None, 'tipos': ['Aros <15>']}]}])
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        blocks = sb.read_blocks('category-grids-carros.jsonc')
        srcs = [b['props']['src'] for b in blocks.values()
                if isinstance(b, dict) and 'props' in b and 'src' in b.get('props', {})]
        self.assertTrue(srcs)
        for src in srcs:
            svg = src.split(',', 1)[1].replace('%23', '#')
            ET.fromstring(svg)          # revienta si el XML no es valido

    # 7 --------------------------------------------------------------------
    def test_ruta_manual_se_registra_antes_de_borrarla(self):
        routes = {'store.custom#landing-carros': {'path': '/carros'},
                  'store.custom#landing-motos': {'path': '/motos'},
                  'store.custom#promo-navidad': {'path': '/carros/promo-navidad'}}
        sb = self.sandbox(tree=minimal_tree(), routes=routes)
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0, 'borro una ruta manual sin avisar')
        reporte = os.path.join(sb.cat, 'rutas-eliminadas.txt')
        self.assertTrue(os.path.exists(reporte))
        self.assertIn('promo-navidad', open(reporte, encoding='utf-8').read())

    # 8 --------------------------------------------------------------------
    def test_enlace_roto_hace_fallar_la_corrida(self):
        """check_links imprimia los rotos y el script salia 0: el enlace
        llegaba a produccion igual."""
        sb = self.sandbox(tree=minimal_tree())
        os.makedirs(sb.blocks, exist_ok=True)
        with open(os.path.join(sb.blocks, 'extra.json'), 'w', encoding='utf-8') as fh:
            json.dump({'rich-text#x': {'props': {'text': '[ver](/carros/no-existe)'}}}, fh)
        r = sb.run_subprocess()
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('ENLACES ROTOS', r.stdout)
        self.assertEqual([f for f in sb.outputs() if f.startswith('category-')], [])
        self.assertEqual(sb.run_subprocess(['--force']).returncode, 0, 'con --force deberia escribir')

    # 9 --------------------------------------------------------------------
    def test_csv_no_ejecuta_formulas_en_excel(self):
        t = minimal_tree(Carros=[{'nombre': 'Frenos', 'subs': [{'nombre': None, 'tipos': ['=SUM(A1)']}]}])
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        celdas = [c for row in sb.read_csv() for c in row]
        self.assertTrue(any(c.startswith("'=SUM") for c in celdas), 'celda sin neutralizar')
        self.assertFalse(any(c.startswith(('=', '+', '@')) for c in celdas))

    # 10 -------------------------------------------------------------------
    def test_sinonimos_no_cruzan_de_seccion(self):
        """Antes la clave era solo el nombre: la pagina de carros recibia
        'alarma de moto' y la de motos 'alarma de carro'."""
        t = minimal_tree(
            Carros=[{'nombre': 'Seguridad', 'subs': [{'nombre': None, 'tipos': ['Alarmas']}]}],
            Motos=[{'nombre': 'Seguridad', 'subs': [{'nombre': None, 'tipos': ['Alarmas']}]}])
        t['_sinonimos'] = {'Carros': {'Alarmas': ['alarma de carro']},
                           'Motos': {'Alarmas': ['alarma de moto']},
                           'Herramientas': {},
                           '_comunes': {'Alarmas': ['alarma']}}
        sb = self.sandbox(tree=t)
        _quiet(sb.run)
        filas = {r[0]: r[6] for r in sb.read_csv() if r and r[4] == 'Alarmas'}
        self.assertIn('alarma de carro', filas['Carros'])
        self.assertNotIn('alarma de moto', filas['Carros'])
        self.assertIn('alarma de moto', filas['Motos'])
        self.assertNotIn('alarma de carro', filas['Motos'])
        self.assertIn('alarma', filas['Carros'])        # _comunes llega a las dos
        self.assertIn('alarma', filas['Motos'])


if __name__ == '__main__':
    unittest.main()
