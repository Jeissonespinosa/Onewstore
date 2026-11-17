"""
Tests de scripts/check-legal.py (spec 001: AC-7, RF-4, RF-8).

Cada test arma un repo minimo en un directorio temporal (store/routes.json y
store/blocks/legal/*.jsonc) y comprueba que el script lo detecta. Nunca toca el
repo real.

Correr:
    python -m unittest scripts/tests/test_check_legal.py -v
"""
import contextlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT = os.path.join(REPO, 'scripts', 'check-legal.py')

_spec = importlib.util.spec_from_file_location('check_legal', SCRIPT)
check_legal = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_legal)

VERSION = 'Versión 2026.11.17 · Actualizado: 2026-11-17'


class Repo:
    """Repo minimo temporal."""

    def __init__(self):
        self.root = tempfile.mkdtemp(prefix='checklegal_')
        os.makedirs(os.path.join(self.root, 'store', 'blocks', 'legal'))
        self.routes = {}

    def doc(self, filename, text, page='terminos', with_route=True, raw=None):
        """Escribe un documento legal con un rich-text de `text`."""
        key = 'store.custom#legal-%s' % page
        body = raw if raw is not None else json.dumps({
            key: {'blocks': ['rich-text#legal-%s' % page]},
            'rich-text#legal-%s' % page: {'props': {'text': text}},
        }, ensure_ascii=False)
        with open(os.path.join(self.root, 'store', 'blocks', 'legal', filename), 'w', encoding='utf-8') as fh:
            fh.write(body)
        if with_route:
            self.routes[key] = {'path': '/' + page}
        self.save_routes()

    def save_routes(self):
        with open(os.path.join(self.root, 'store', 'routes.json'), 'w', encoding='utf-8') as fh:
            json.dump(self.routes, fh)

    def scan(self):
        return check_legal.scan(self.root)

    def run(self, *args):
        """Ejecuta el script como proceso; devuelve (codigo, salida)."""
        env = dict(os.environ, PYTHONIOENCODING='utf-8')
        p = subprocess.run([sys.executable, '-B', SCRIPT, '--root', self.root] + list(args),
                           capture_output=True, text=True, encoding='utf-8', env=env)
        return p.returncode, p.stdout

    def cleanup(self):
        shutil.rmtree(self.root, ignore_errors=True)


class CheckLegalCase(unittest.TestCase):
    def setUp(self):
        self.repo = Repo()
        self.addCleanup(self.repo.cleanup)


class TestPlaceholders(CheckLegalCase):
    def test_detecta_cada_placeholder_conocido(self):
        """Un placeholder sin resolver publicaria '[NIT]' a un cliente real (RF-8)."""
        for ph in check_legal.KNOWN_PLACEHOLDERS:
            with self.subTest(placeholder=ph):
                self.repo.doc('d.jsonc', '%s\n\nTexto %s fin' % (VERSION, ph))
                found = self.repo.scan()['docs'][0]['placeholders']
                self.assertEqual(found.get(ph), 1)

    def test_cuenta_repeticiones(self):
        self.repo.doc('d.jsonc', '%s [NIT] y otra vez [NIT] y [NIT]' % VERSION)
        self.assertEqual(self.repo.scan()['docs'][0]['placeholders']['[NIT]'], 3)

    def test_atrapa_placeholder_mal_escrito(self):
        """'[RAZON SOCIAL]' sin tilde no esta en la lista, pero tambien es un hueco."""
        self.repo.doc('d.jsonc', '%s [RAZON SOCIAL]' % VERSION)
        self.assertIn('[RAZON SOCIAL]', self.repo.scan()['docs'][0]['placeholders'])

    def test_no_confunde_enlaces_markdown(self):
        """[texto](/ruta) es un enlace, no un placeholder."""
        self.repo.doc('d.jsonc', '%s Ver [términos](/terminos-y-condiciones) y [Ley 1480](https://x.co)' % VERSION)
        self.assertEqual(self.repo.scan()['docs'][0]['placeholders'], {})


class TestOnewstore(CheckLegalCase):
    def test_detecta_onewstore_en_cualquier_capitalizacion(self):
        for word in ('Onewstore', 'ONEWSTORE', 'onewstore', 'OneWStore'):
            with self.subTest(word=word):
                self.repo.doc('d.jsonc', '%s Vende %s S.A.S.' % (VERSION, word))
                self.assertEqual(self.repo.scan()['docs'][0]['onewstore'], 1)

    def test_detecta_onewstore_dentro_de_una_url(self):
        self.repo.doc('d.jsonc', '%s [ver](https://x--onewstore.myvtex.com/a)' % VERSION)
        self.assertEqual(self.repo.scan()['docs'][0]['onewstore'], 1)

    def test_sin_onewstore(self):
        self.repo.doc('d.jsonc', '%s Repuestox' % VERSION)
        self.assertEqual(self.repo.scan()['docs'][0]['onewstore'], 0)


class TestVersion(CheckLegalCase):
    def test_documento_sin_version_se_reporta(self):
        """RF-4: cada documento muestra version y fecha."""
        self.repo.doc('d.jsonc', 'Solo texto, sin version')
        self.assertEqual(self.repo.scan()['missing_version'], ['d.jsonc'])

    def test_documento_con_version_pasa(self):
        self.repo.doc('d.jsonc', VERSION)
        self.assertEqual(self.repo.scan()['missing_version'], [])

    def test_version_con_formato_incorrecto_no_vale(self):
        self.repo.doc('d.jsonc', 'Versión 1.0 · Actualizado: ayer')
        self.assertEqual(self.repo.scan()['missing_version'], ['d.jsonc'])


class TestRutasYBloques(CheckLegalCase):
    def test_ruta_sin_bloque(self):
        self.repo.routes['store.custom#legal-fantasma'] = {'path': '/fantasma'}
        self.repo.save_routes()
        self.assertEqual(self.repo.scan()['routes_without_block'], ['store.custom#legal-fantasma'])

    def test_bloque_sin_ruta(self):
        self.repo.doc('d.jsonc', VERSION, page='huerfano', with_route=False)
        self.assertEqual(self.repo.scan()['blocks_without_route'], ['store.custom#legal-huerfano'])

    def test_ruta_y_bloque_coinciden(self):
        self.repo.doc('d.jsonc', VERSION)
        r = self.repo.scan()
        self.assertEqual((r['routes_without_block'], r['blocks_without_route']), ([], []))

    def test_rutas_que_no_son_legales_se_ignoran(self):
        self.repo.routes['store.custom#about-us'] = {'path': '/about-us'}
        self.repo.save_routes()
        self.assertEqual(self.repo.scan()['routes_without_block'], [])


class TestJsonc(CheckLegalCase):
    def test_lee_comentarios_y_no_los_cuenta_como_texto(self):
        """Un comentario con '[NIT]' o 'Onewstore' no es contenido publicado."""
        raw = ('// nota interna sobre Onewstore [NIT]\n'
               '{ /* otro Onewstore */ "store.custom#legal-t": {"blocks": ["rich-text#t"]},\n'
               '  "rich-text#t": {"props": {"text": "%s"}} }' % VERSION)
        self.repo.doc('d.jsonc', None, page='t', raw=raw)
        d = self.repo.scan()['docs'][0]
        self.assertEqual((d['onewstore'], d['placeholders']), (0, {}))

    def test_barras_dobles_dentro_de_un_string_no_son_comentario(self):
        raw = '{"store.custom#legal-t": {"blocks": []}, "x": {"props": {"text": "https://a.co [NIT] %s"}}}' % VERSION
        self.repo.doc('d.jsonc', None, page='t', raw=raw)
        self.assertEqual(self.repo.scan()['docs'][0]['placeholders'], {'[NIT]': 1})


class TestCli(CheckLegalCase):
    def test_repo_sin_documentos_sale_con_0(self):
        """3.1: sin documentos no hay nada que comprobar, ni siquiera con --prod."""
        for args in ((), ('--prod',)):
            code, out = self.repo.run(*args)
            self.assertEqual(code, 0, out)
            self.assertIn('no hay documentos', out)

    def test_por_defecto_informa_y_sale_con_0(self):
        self.repo.doc('d.jsonc', '%s [NIT] Onewstore' % VERSION)
        code, out = self.repo.run()
        self.assertEqual(code, 0)
        self.assertIn('[NIT]', out)
        self.assertIn('Onewstore', out)

    def test_prod_falla_con_hallazgos(self):
        self.repo.doc('d.jsonc', '%s [NIT]' % VERSION)
        code, out = self.repo.run('--prod')
        self.assertEqual(code, 1)
        self.assertIn('BLOQUEADA', out)

    def test_prod_falla_por_onewstore_solo(self):
        self.repo.doc('d.jsonc', '%s marca Onewstore' % VERSION)
        self.assertEqual(self.repo.run('--prod')[0], 1)

    def test_prod_falla_por_version_ausente_o_ruta_huerfana(self):
        self.repo.doc('d.jsonc', 'sin version')
        self.assertEqual(self.repo.run('--prod')[0], 1)

    def test_prod_pasa_sin_hallazgos(self):
        self.repo.doc('d.jsonc', '%s Texto limpio de Repuestox.' % VERSION)
        code, out = self.repo.run('--prod')
        self.assertEqual(code, 0, out)
        self.assertIn('Sin hallazgos', out)

    def test_main_importable_no_deja_pycache(self):
        """Los scripts no deben dejar __pycache__ en el arbol (reglas del repo)."""
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            check_legal.main(['--root', self.repo.root])
        self.assertFalse(os.path.isdir(os.path.join(REPO, 'scripts', '__pycache__')))


if __name__ == '__main__':
    unittest.main()
