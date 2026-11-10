"""
Validador estatico del theme: grafo de bloques, rutas, interfaces y CSS.

No necesita VTEX ni red: parsea todos los store/**/*.json(c) (quitando
comentarios), construye el grafo de referencias (children / blocks / props
que apuntan a bloques) y comprueba invariantes que `vtex link` solo
detecta tarde (o nunca, como los links rotos en markdown).

Cada test lleva: SUPUESTO, ENTRADA, HOY, ESPERADO. Los "ROJO_HOY" fallan
con el repo actual a proposito.

Correr:
    python3 -m pytest scripts/tests/test_store_blocks.py -v
    python3 -m unittest scripts/tests/test_store_blocks.py -v
"""
import glob
import json
import os
import re
import sys
import unittest
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _sandbox import REPO, load_jsonc  # noqa: E402

BLOCK_FILES = sorted(glob.glob(os.path.join(REPO, 'store', 'blocks.jsonc')) +
                     glob.glob(os.path.join(REPO, 'store', 'blocks', '**', '*.json*'), recursive=True))
CSS_FILES = sorted(glob.glob(os.path.join(REPO, 'styles', 'css', '**', '*.css'), recursive=True))

# Interfaces nativas de las apps declaradas en manifest.json que el theme
# usa SIN declararlas (sin '#'). Lista blanca mantenida a mano: si aparece
# una nueva, o se agrega aqui o es un typo.
NATIVE_INTERFACES = {
    # vtex.store
    'store.home', 'store.custom', 'store.search', 'store.product', 'store.account', 'store.login',
    'store.orderplaced', 'store.not-found', 'store.product-review-form', 'challenge.profile',
    'header', 'header.full', 'footer', 'my-account', 'login', 'login-content', 'telemarketing',
    # store-header / footer
    'header-layout.desktop', 'header-layout.mobile', 'footer-layout.desktop', 'footer-layout.mobile',
    'accepted-payment-methods', 'logo',
    # layouts
    'flex-layout.row', 'flex-layout.col', 'sticky-layout', 'stack-layout', 'responsive-layout.desktop',
    'responsive-layout.mobile', 'condition-layout.product', 'modal-trigger', 'modal-layout',
    'modal-header', 'modal-content', 'modal-actions', 'disclosure-layout', 'disclosure-layout-group',
    'disclosure-trigger', 'disclosure-content', 'disclosure-state-indicator', 'slider-layout',
    'list-context.product-list',
    # store-components / rich-text / image / icons / link / video
    'rich-text', 'image', 'video', 'search-bar', 'product-images', 'product-description',
    'product-name', 'product-brand', 'sku-selector', 'shipping-simulator', 'availability-subscriber',
    'share', 'product-separator', 'product-installments', 'icon-caret', 'icon-expand', 'icon-grid',
    'icon-inline-grid', 'link.product', 'vtex.store-components:product-name',
    'vtex.store-components:product-brand', 'product-specification-badges', 'product-bookmark',
    'product-questions-and-answers', 'product-rating-summary', 'product-rating-inline',
    'product-review-form', 'shelf.relatedProducts', 'product-identifier.product', 'product-quantity',
    'product-assembly-options', 'assembly-option-input-values', 'assembly-option-item-quantity-selector',
    'assembly-option-item-image', 'assembly-option-item-name', 'assembly-option-item-price',
    'assembly-option-item-children-description', 'assembly-option-item-customize',
    # product-summary / price
    'product-summary.shelf', 'product-summary-image', 'product-summary-name', 'product-summary-space',
    'product-summary-sku-selector', 'product-summary-quantity', 'product-list-price',
    'product-selling-price', 'product-price-savings', 'product-installments',
    # search-result
    'search-result-layout', 'search-result-layout.desktop', 'search-result-layout.mobile',
    'search-result-layout.customQuery', 'search-not-found-layout', 'search-content', 'gallery',
    'gallery-layout-switcher', 'gallery-layout-option', 'not-found', 'filter-navigator.v3',
    'order-by.v2', 'total-products.v2', 'search-title.v2', 'search-fetch-more', 'search-fetch-previous',
    'breadcrumb', 'breadcrumb.search',
    # minicart / cart
    'minicart.v2', 'minicart-base-content', 'minicart-empty-state', 'minicart-product-list',
    'minicart-summary', 'minicart-checkout-button', 'product-list', 'add-to-cart-button',
    # gifts / highlights / specifications / form
    'product-gifts', 'product-gift-list', 'gift-name', 'gift-description', 'gift-image', 'gift-text',
    'vtex.product-highlights@2.x:product-highlights', 'product-highlight-wrapper',
    'product-highlight-text', 'product-specification-group', 'product-specification',
    'product-specification-values', 'product-specification-text', 'form', 'form-success',
    'form-input.text', 'form-input.textarea', 'form-submit',
    # order-placed
    'order-placed', 'op-header', 'op-order', 'op-section', 'op-summary-section', 'op-bank-invoice-section',
    'op-confirmation-icon', 'op-confirmation-title', 'op-confirmation-message', 'op-print-button',
    'op-notices', 'op-order-split-notice', 'op-order-customer', 'op-order-takeaway-packages',
    'op-order-total', 'op-order-number', 'op-order-datetime', 'op-order-seller', 'op-order-options',
    'op-order-payment', 'op-order-pickup-packages', 'op-order-delivery-packages',
}

BLOCK_REF = re.compile(r'^[a-z][A-Za-z0-9.\-:@]*(#[\w\-]+)?$')


def load_theme():
    """Devuelve (defs, refs): defs[id] = [archivos]; refs = [(id_referenciado, desde, archivo)]."""
    defs, refs = defaultdict(list), []
    for f in BLOCK_FILES:
        data = load_jsonc(f)
        rel = os.path.relpath(f, REPO)
        for bid, body in data.items():
            defs[bid].append(rel)
            for key in ('children', 'blocks'):
                for c in (body.get(key) or []):
                    refs.append((c, bid, rel))
            props = body.get('props') or {}
            for pk, pv in props.items():
                if pk in ('Then', 'Else', 'GridSummary', 'ListSummary', 'Show', 'Hide') and isinstance(pv, str):
                    refs.append((pv, '%s.props.%s' % (bid, pk), rel))
            if isinstance(body.get('parent'), dict):
                for pv in body['parent'].values():
                    refs.append((pv, '%s.parent' % bid, rel))
    return defs, refs


def routes():
    with open(os.path.join(REPO, 'store', 'routes.json'), encoding='utf-8') as fh:
        return json.load(fh)


def manifest():
    with open(os.path.join(REPO, 'manifest.json'), encoding='utf-8') as fh:
        return json.load(fh)


class TestBloques(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.defs, cls.refs = load_theme()

    def test_todos_los_jsonc_parsean(self):
        for f in BLOCK_FILES:
            load_jsonc(f)  # lanza si hay coma final u otro error

    def test_sin_ids_duplicados_entre_archivos(self):
        """El builder toma el ultimo en silencio: dos definiciones del mismo id es un bug."""
        dups = {k: v for k, v in self.defs.items() if len(v) > 1}
        self.assertEqual(dups, {})

    def test_referencias_resuelven_a_bloque_definido_o_interfaz_nativa(self):
        """Cada children/blocks debe existir en el theme o ser interfaz nativa conocida."""
        bad = []
        for ref, src, f in self.refs:
            if ref in self.defs:
                continue
            base = ref.split('#')[0]
            if base in NATIVE_INTERFACES:
                continue
            bad.append((ref, src, f))
        self.assertEqual(bad, [], 'referencias a interfaces desconocidas (typo o app sin declarar)')

    def test_referencias_tienen_forma_de_id(self):
        bad = [(r, s) for r, s, _ in self.refs if not BLOCK_REF.match(r)]
        self.assertEqual(bad, [])

    def test_store_custom_tiene_ruta_y_viceversa(self):
        r = routes()
        customs = [k for k in self.defs if k.startswith('store.custom#')]
        self.assertEqual(sorted(k for k in customs if k not in r), [], 'store.custom sin ruta')
        self.assertEqual(sorted(k for k in r if k not in self.defs), [], 'ruta sin bloque')

    def test_rutas_bien_formadas_y_unicas(self):
        r = routes()
        paths = Counter(v.get('path') for v in r.values())
        self.assertEqual([p for p, c in paths.items() if c > 1], [], 'paths duplicados')
        for k, v in r.items():
            self.assertIn('path', v, k)
            self.assertTrue(v['path'].startswith('/'), k)
            self.assertFalse(v['path'].endswith('/') and v['path'] != '/', 'barra final en %s' % k)
            self.assertNotIn('//', v['path'], k)
            self.assertNotRegex(v['path'], r'[A-Z\s]', 'mayusculas o espacios en %s' % k)

    def test_ROJO_HOY_links_internos_apuntan_a_la_categoria_correcta(self):
        """
        SUPUESTO: los CTA del hero apuntan a la categoria que anuncian.
        ENTRADA: hero-slider.jsonc, rich-text#rx-carros-slide-1-cta1 = '[Ver baterías](/carros/electrico-y-electronico)'.
        HOY: cambios-v3.txt movio Baterias a macro propia (/carros/baterias, existe en
             routes.json) pero el slide sigue enviando a Electrico y electronico.
        ESPERADO: '[Ver baterías](/carros/baterias)'.
        """
        hero = load_jsonc(os.path.join(REPO, 'store', 'blocks', 'home', 'hero-slider.jsonc'))
        self.assertEqual(hero['rich-text#rx-carros-slide-1-cta1']['props']['text'],
                         '[Ver baterías](/carros/baterias)')

    def test_links_markdown_e_image_link_apuntan_a_rutas_existentes(self):
        """Todo [texto](/path) e image.link.url interno debe existir en routes.json (o ser nativo)."""
        known = set(v['path'] for v in routes().values()) | {'/', '/{slug}/p'}
        bad = []
        for f in BLOCK_FILES:
            for bid, body in load_jsonc(f).items():
                props = body.get('props') or {}
                links = []
                if isinstance(props.get('text'), str):
                    links += re.findall(r'\]\(([^)]*)\)', props['text'])
                if isinstance(props.get('link'), dict) and props['link'].get('url'):
                    links.append(props['link']['url'])
                if isinstance(props.get('href'), str):
                    links.append(props['href'])
                for u in links:
                    if u.startswith(('http', '#', 'mailto:', 'tel:')):
                        continue
                    if u.split('?')[0] not in known:
                        bad.append((u, bid, os.path.relpath(f, REPO)))
        self.assertEqual(bad, [])

    def test_ROJO_HOY_textos_de_otra_tienda(self):
        """
        SUPUESTO: el theme es de Repuestox.
        ENTRADA: store/blocks/categories.jsonc (7 store.custom#categoria-* con ruta
                 /linea-productos/*, rich-text#category-offer-title).
        HOY: '## En Coéxito te ofrecemos' y '+65 años en el mercado' son textos del
             cliente anterior (Coexito) y siguen publicados en 7 rutas vivas.
        ESPERADO: sin referencias a Coexito en ningun bloque.
        """
        hits = []
        for f in BLOCK_FILES:
            for bid, body in load_jsonc(f).items():
                t = (body.get('props') or {}).get('text', '')
                if isinstance(t, str) and re.search(r'co[eé]xito', t, re.I):
                    hits.append((bid, t))
        self.assertEqual(hits, [])

    def test_ROJO_HOY_blockclass_tiene_css(self):
        """
        SUPUESTO: todo blockClass usado en bloques rx*/repuestox* tiene al menos una regla CSS.
        ENTRADA: repuestox-home.json, flex-layout.col#repuestox-split-herramientas-copy-slot
                 blockClass ["repuestoxSplitSlotCopy", "repuestoxSplitSlotCopyCenter"].
        HOY: no existe ningun selector --repuestoxSplitSlotCopyCenter; el centrado se hace
             por otro camino (.flexRowContent--repuestoxToolsHero ...) y la clase es ruido
             que sugiere un CSS que no esta.
        ESPERADO: cada blockClass tiene CSS o se elimina.
        """
        css = '\n'.join(open(f, encoding='utf-8').read() for f in CSS_FILES)
        js = open(os.path.join(REPO, 'react', 'VehicleSelector.js'), encoding='utf-8').read()
        missing = set()
        for f in BLOCK_FILES:
            for bid, body in load_jsonc(f).items():
                bc = (body.get('props') or {}).get('blockClass')
                for c in (bc if isinstance(bc, list) else [bc]):
                    if not c or not c.startswith(('rx', 'repuestox')):
                        continue
                    if ('--%s' % c) not in css and c not in js:
                        missing.add((c, bid))
        self.assertEqual(sorted(missing), [])


class TestInterfaces(unittest.TestCase):
    def test_interfaces_json_apunta_a_componentes_existentes_y_viceversa(self):
        with open(os.path.join(REPO, 'store', 'interfaces.json'), encoding='utf-8') as fh:
            ifaces = json.load(fh)
        react_dir = os.path.join(REPO, 'react')
        comps = {os.path.splitext(f)[0] for f in os.listdir(react_dir)
                 if f.endswith(('.js', '.jsx', '.tsx', '.ts')) and not f.startswith(('jest', 'setup'))}
        for name, spec in ifaces.items():
            self.assertIn(spec['component'], comps, 'interfaz %s -> componente inexistente' % name)
        declared = {spec['component'] for spec in ifaces.values()}
        self.assertEqual(sorted(comps - declared), [], 'componentes en react/ sin interfaz')

    def test_bloques_custom_usan_interfaces_declaradas(self):
        with open(os.path.join(REPO, 'store', 'interfaces.json'), encoding='utf-8') as fh:
            ifaces = set(json.load(fh))
        defs, refs = load_theme()
        used = {r.split('#')[0] for r, _, _ in refs} | {d.split('#')[0] for d in defs}
        self.assertTrue(ifaces <= used, 'interfaces declaradas y nunca usadas: %s' % (ifaces - used))

    def test_manifest_declara_deps_del_componente(self):
        deps = manifest()['dependencies']
        for app in ('vtex.render-runtime', 'vtex.css-handles', 'vtex.search-graphql'):
            self.assertIn(app, deps)
        self.assertEqual(manifest()['builders'].get('react'), '3.x')

    def test_ROJO_HOY_readme_no_dice_que_no_hay_react(self):
        """
        SUPUESTO: el README describe el repo.
        HOY: README.md: 'No hay código React ni build de Node' y builders sin 'react 3.x',
             pero existe react/VehicleSelector.js y manifest.json declara react 3.x.
        """
        readme = open(os.path.join(REPO, 'README.md'), encoding='utf-8').read()
        self.assertNotIn('No hay código React', readme)
        self.assertIn('react 3.x', readme)


class TestCss(unittest.TestCase):
    def test_ROJO_HOY_versiones_de_handles_coinciden_con_manifest(self):
        """
        SUPUESTO: los selectores :global(.vtex-<app>-<major>-x-...) usan el major del manifest.
        ENTRADA: styles/css/vtex.login.css:554  .vtex-telemarketing-1-x-container
        HOY: manifest.json declara vtex.telemarketing 2.x -> el handle real es
             vtex-telemarketing-2-x-container; la regla que oculta la barra en el home es muerta.
        ESPERADO: majors del CSS == majors del manifest.
        """
        deps = manifest()['dependencies']
        majors = {app.replace('vtex.', ''): v.split('.')[0] for app, v in deps.items()}
        bad = []
        for f in CSS_FILES:
            for m in re.finditer(r'vtex-([a-z][a-z-]*?)-(\d+)-x', open(f, encoding='utf-8').read()):
                app, major = m.group(1), m.group(2)
                if app in majors and majors[app] != major:
                    bad.append((os.path.relpath(f, REPO), m.group(0), 'manifest=%s.x' % majors[app]))
        self.assertEqual(sorted(set(bad)), [])

    def test_ROJO_HOY_tokens_rx_definidos_donde_siempre_cargan(self):
        """
        SUPUESTO: var(--rx-*) esta definido en toda pagina donde se usa.
        HOY: los 13 tokens --rx-* se definen SOLO en styles/css/vtex.login.css (:global(html)).
             VTEX inyecta el override de cada app solo cuando esa app renderiza en la pagina:
             quitar/ocultar el bloque `login` del header (o una pagina sin header) deja
             padding: 0 var(--rx-gutter), color: var(--rx-ink), etc. invalidos en
             flex-layout, rich-text, slider-layout, search-result, product-price...
        ESPERADO: definir los tokens en un override que siempre esta presente
                  (vtex.store-header.css o vtex.flex-layout.css) o en cada archivo que los usa.
        """
        defs_by_file = defaultdict(set)
        uses_by_file = defaultdict(set)
        for f in CSS_FILES:
            txt = open(f, encoding='utf-8').read()
            rel = os.path.relpath(f, REPO)
            defs_by_file[rel] |= set(re.findall(r'(--rx-[a-z0-9-]+)\s*:', txt))
            uses_by_file[rel] |= set(re.findall(r'var\((--rx-[a-z0-9-]+)', txt))
        always = defs_by_file['styles/css/vtex.store-header.css'] | defs_by_file['styles/css/vtex.flex-layout.css']
        bad = {}
        for rel, uses in uses_by_file.items():
            missing = {u for u in uses if u not in defs_by_file[rel] and u not in always
                       and not u.startswith(('--rx-cols', '--rx-gap'))}
            if missing:
                bad[rel] = sorted(missing)
        self.assertEqual(bad, {})

    def test_ROJO_HOY_sin_bloques_de_reglas_duplicados(self):
        """
        SUPUESTO: cada selector se declara una vez por archivo.
        HOY: vtex.flex-layout.css repite completos los bloques 'FILTRO Y LISTADO' y
             'FILTROS' (rxFilterbar, rxFBody, rxFSide, rxFVehicleM, rxToolsSearch...) dos
             veces (~lineas 1005-1200 y 1290-1500): 40 selectores duplicados, el segundo
             pisa al primero y cualquier ajuste en uno se pierde.
        ESPERADO: sin selectores duplicados (a nivel raiz, fuera de @media).
        """
        f = os.path.join(REPO, 'styles', 'css', 'vtex.flex-layout.css')
        txt = re.sub(r'/\*.*?\*/', '', open(f, encoding='utf-8').read(), flags=re.S)
        # solo bloques de nivel raiz (fuera de @media)
        depth, sel, selectors, i = 0, '', [], 0
        while i < len(txt):
            c = txt[i]
            if c == '{':
                if depth == 0 and not sel.strip().startswith('@'):
                    selectors.append(' '.join(sel.split()))
                depth += 1
                sel = ''
            elif c == '}':
                depth -= 1
                sel = ''
            elif depth == 0:
                sel += c
            i += 1
        dups = sorted(s for s, n in Counter(selectors).items() if n > 1)
        self.assertEqual(dups, [])

    def test_ROJO_HOY_css_de_bloques_eliminados(self):
        """
        SUPUESTO: no hay CSS para bloques que ya no existen.
        HOY: header/category-menu.json, footer/menu.json y home/deals.json se borraron pero
             siguen .flexCol--headerNavLinks (store-header.css: ademas es un handle de
             flex-layout, nunca matchea con el prefijo vtex-store-header), .flexRow--deals,
             .container--deals, .row--menu-row, :global(.vtex-menu-2-x-...).
        ESPERADO: cero reglas para blockClass que ningun bloque usa.
        """
        used = set()
        for f in BLOCK_FILES:
            for body in load_jsonc(f).values():
                bc = (body.get('props') or {}).get('blockClass')
                for c in (bc if isinstance(bc, list) else [bc]):
                    if c:
                        used.add(c)
        orphans = set()
        for f in CSS_FILES:
            for m in re.finditer(r'\.[A-Za-z][\w]*--([A-Za-z][\w]*)', open(f, encoding='utf-8').read()):
                cls = m.group(1)
                if cls in ('stuck', 'sticky-header', 'isActive', 'selected', 'list', 'summary'):
                    continue
                if cls not in used and cls.split('--')[0] not in used:
                    orphans.add((os.path.relpath(f, REPO), cls))
        checked = {c for _, c in orphans} & {'headerNavLinks', 'deals', 'menu-row', 'menu-link', 'headerDrawerMobile'}
        self.assertEqual(sorted(checked), [], 'CSS para blockClass de bloques borrados: %s' % sorted(orphans))

    def test_ROJO_HOY_archivos_css_no_vacios(self):
        """
        HOY: styles/css/vtex.sticky-layout.css tiene 0 bytes. El CLI de VTEX descarta los
             archivos vacios al subir (ProjectFilesManager: stats.size > 0), asi que es un
             archivo fantasma que sugiere overrides que no existen.
        ESPERADO: borrarlo o darle contenido.
        """
        empty = [os.path.relpath(f, REPO) for f in CSS_FILES if os.path.getsize(f) == 0]
        self.assertEqual(empty, [])


if __name__ == '__main__':
    unittest.main()
