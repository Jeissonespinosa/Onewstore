"""
Tests de scripts/gen-legal.py (spec 001, tarea 4.3: el bloque publicado coincide con el
borrador que revisa el abogado) y de la coherencia de las paginas legales del repo.

Correr:
    python -m unittest scripts/tests/test_gen_legal.py -v
"""
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT = os.path.join(REPO, 'scripts', 'gen-legal.py')
CHECK = os.path.join(REPO, 'scripts', 'check-legal.py')

_spec = importlib.util.spec_from_file_location('gen_legal', SCRIPT)
gen_legal = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen_legal)
_spec2 = importlib.util.spec_from_file_location('check_legal', CHECK)
check_legal = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(check_legal)

SAMPLE = '# Titulo\n\nVersión 2026.11.17 · Actualizado: 2026-11-17\n\nIntro.\n\n## 1. Uno\n\nTexto uno.\n\n## 2. Dos\n\nTexto dos con [enlace](/x).\n'


class Sandbox:
    def __init__(self):
        self.root = tempfile.mkdtemp(prefix='genlegal_')
        os.makedirs(os.path.join(self.root, gen_legal.DRAFTS_REL))

    def draft(self, name, text):
        with open(os.path.join(self.root, gen_legal.DRAFTS_REL, name), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(text)

    def run(self, *args):
        env = dict(os.environ, PYTHONIOENCODING='utf-8')
        p = subprocess.run([sys.executable, '-B', SCRIPT, '--root', self.root] + list(args),
                           capture_output=True, text=True, encoding='utf-8', env=env)
        return p.returncode, p.stdout

    def out(self, slug):
        with open(os.path.join(self.root, gen_legal.OUT_REL, slug + '.jsonc'), encoding='utf-8') as fh:
            return fh.read()

    def cleanup(self):
        shutil.rmtree(self.root, ignore_errors=True)


class TestGenerador(unittest.TestCase):
    def setUp(self):
        self.sb = Sandbox()
        self.addCleanup(self.sb.cleanup)

    def test_una_pagina_con_un_rich_text_por_seccion(self):
        blocks = gen_legal.build('demo', SAMPLE)
        page = blocks['store.custom#legal-demo']['children']
        self.assertEqual(len(page), 3)  # introduccion + 2 secciones
        self.assertTrue(all(i in blocks for i in page))
        self.assertTrue(blocks[page[0]]['props']['text'].startswith('# Titulo'))
        self.assertTrue(blocks[page[1]]['props']['text'].startswith('## 1. Uno'))
        self.assertEqual(blocks[page[2]]['props']['blockClass'], 'legal')

    def test_el_texto_publicado_es_el_del_borrador(self):
        """Ninguna seccion se pierde ni se altera al generar."""
        blocks = gen_legal.build('demo', SAMPLE)
        texts = [blocks[i]['props']['text'] for i in blocks['store.custom#legal-demo']['children']]
        self.assertEqual('\n\n'.join(texts), SAMPLE.strip())

    def test_borrador_sin_titulo_falla(self):
        with self.assertRaises(ValueError):
            gen_legal.build('demo', 'Sin titulo\n\n## 1. Uno\n')

    def test_escribe_y_es_idempotente(self):
        self.sb.draft('D9-demo.md', SAMPLE)
        self.assertEqual(self.sb.run()[0], 0)
        first = self.sb.out('demo')
        self.assertIn('GENERADO por scripts/gen-legal.py', first)
        self.assertIn('"store.custom#legal-demo"', first)
        code, out = self.sb.run()
        self.assertEqual(code, 0)
        self.assertIn('0 escrita', out)
        self.assertEqual(self.sb.out('demo'), first)

    def test_check_detecta_un_bloque_desactualizado(self):
        self.sb.draft('D9-demo.md', SAMPLE)
        self.sb.run()
        self.assertEqual(self.sb.run('--check')[0], 0)
        self.sb.draft('D9-demo.md', SAMPLE.replace('Texto uno.', 'Texto uno cambiado.'))
        code, out = self.sb.run('--check')
        self.assertEqual(code, 1)
        self.assertIn('desactualizado', out)

    def test_check_detecta_un_bloque_sin_borrador(self):
        self.sb.draft('D9-demo.md', SAMPLE)
        self.sb.run()
        os.remove(os.path.join(self.sb.root, gen_legal.DRAFTS_REL, 'D9-demo.md'))
        code, out = self.sb.run('--check')
        self.assertEqual(code, 1)
        self.assertIn('sin borrador', out)

    def test_ignora_archivos_que_no_son_borradores(self):
        """alternativas.md no genera ninguna pagina."""
        self.sb.draft('alternativas.md', '# Alternativas\n')
        self.sb.draft('notas.md', '# Notas\n')
        self.assertEqual(self.sb.run()[1].count('escrito:'), 0)


class TestRepoReal(unittest.TestCase):
    """Lo versionado en el repo: borradores, bloques y rutas tienen que cuadrar."""

    def test_bloques_versionados_coinciden_con_los_borradores(self):
        p = subprocess.run([sys.executable, '-B', SCRIPT, '--check'], capture_output=True, text=True,
                           encoding='utf-8', env=dict(os.environ, PYTHONIOENCODING='utf-8'))
        self.assertEqual(p.returncode, 0, p.stdout)

    def test_cada_pagina_legal_tiene_ruta_y_version(self):
        r = check_legal.scan(REPO)
        self.assertEqual(r['routes_without_block'], [])
        self.assertEqual(r['blocks_without_route'], [])
        self.assertEqual(r['missing_version'], [])

    def test_las_cinco_rutas_legales_existen(self):
        with open(os.path.join(REPO, 'store', 'routes.json'), encoding='utf-8') as fh:
            routes = json.load(fh)
        paths = {v['path'] for k, v in routes.items() if k.startswith('store.custom#legal-')}
        self.assertEqual(paths, {
            '/terminos-y-condiciones', '/terminos-de-venta', '/condiciones-sellers',
            '/politica-de-privacidad', '/devoluciones-y-garantias'})

    def test_el_footer_enlaza_cada_pagina_legal(self):
        """AC-1: desde cualquier pagina se llega a cada documento."""
        with open(os.path.join(REPO, 'store', 'blocks', 'footer', 'footer.json'), encoding='utf-8') as fh:
            footer = json.load(fh)
        text = footer['rich-text#footer-legal']['props']['text']
        for path in ('/terminos-y-condiciones', '/terminos-de-venta', '/condiciones-sellers',
                     '/politica-de-privacidad', '/devoluciones-y-garantias'):
            self.assertIn('(%s)' % path, text)
        for block in ('footer-layout.desktop', 'footer-layout.mobile'):
            self.assertIn('flex-layout.row#footer-legal', footer[block]['children'])

    def test_d2_no_menciona_onewstore(self):
        r = check_legal.scan(REPO)
        d2 = [d for d in r['docs'] if d['file'] == 'terminos-y-condiciones.jsonc'][0]
        self.assertEqual(d2['onewstore'], 0)


if __name__ == '__main__':
    unittest.main()
