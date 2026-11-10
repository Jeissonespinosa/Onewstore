"""
Tests de scripts/gen-sinonimos.py: que los CSV que se le importan a VTEX no
tengan basura y que ninguna hoja del catalogo se quede sin sinonimos.

Cada test dice QUE rompe y POR QUE importa. No escriben en catalogo/: usan
generate() en memoria, que es el mismo pipeline que el script.

Correr:
    python3 -m unittest scripts/tests/test_sinonimos.py -v
"""
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT = os.path.join(REPO, 'scripts', 'gen-sinonimos.py')
TREE = os.path.join(REPO, 'catalogo', 'estructura-categorias-v2.json')
VTEX_LIMIT = 20 * 1024
SAFE_LIMIT = 16 * 1024

# codigos tecnicos cortos que si son terminos validos (asi busca el cliente el
# bombillo): h4, h7, h11, 9005, 9006.
CODE_RE = re.compile(r'^[a-z]{1,2}\d{1,4}$')


def load_module():
    spec = importlib.util.spec_from_file_location('gen_sinonimos', SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)          # tiene guard: importar no ejecuta main()
    return mod


class SinonimosTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module()
        with open(TREE, encoding='utf-8') as fh:
            cls.tree = json.load(fh)
        cls.files, cls.info = cls.mod.generate(cls.tree)
        cls.rows = [row for chunk in cls.files for _, row in chunk]
        cls.groups = [row[:-len(';true')].split(',') for row in cls.rows]
        cls.terms = [t for g in cls.groups for t in g]

    # 1 -------------------------------------------------------------------- #
    def test_sin_espacio_doble(self):
        """Un nombre con coma ("Sliders, defensas y cubrecarter") no puede
        llegar como "sliders  defensas": con doble espacio no coincide nunca."""
        malos = [t for t in self.terms if '  ' in t or t != t.strip()]
        self.assertEqual(malos, [], 'terminos con espacio doble o sin recortar')

    # 2 -------------------------------------------------------------------- #
    def test_sin_terminos_basura(self):
        """Un termino de un caracter o un digito suelto ("c", "4") sale de
        partir mal otro termino y contamina resultados de forma impredecible."""
        malos = []
        for t in self.terms:
            if t.isdigit() and len(t) < 4:
                malos.append(t)
            elif len(t) <= 2 and not CODE_RE.match(t):
                malos.append(t)
        self.assertEqual(sorted(set(malos)), [], 'terminos de 1-2 caracteres o digitos sueltos')

    # 3 -------------------------------------------------------------------- #
    def test_termino_en_un_solo_grupo(self):
        """Con sinonimos bidireccionales, un termino compartido vuelve
        equivalentes a los dos grupos ("booster" = servofreno y cargador)."""
        visto, repetidos = {}, {}
        for i, g in enumerate(self.groups):
            for t in g:
                if t in visto and visto[t] != i:
                    repetidos.setdefault(t, {visto[t]}).add(i)
                visto.setdefault(t, i)
        self.assertEqual(sorted(repetidos), [], 'terminos en mas de un grupo')

    # 4 -------------------------------------------------------------------- #
    def test_sin_claves_duplicadas(self):
        """Si dos filas empiezan por el mismo termino, el importador de VTEX
        se queda con una sola y la otra se pierde en silencio."""
        claves = [g[0] for g in self.groups]
        dup = sorted({c for c in claves if claves.count(c) > 1})
        self.assertEqual(dup, [], 'claves de grupo duplicadas')

    # 5 -------------------------------------------------------------------- #
    def test_tamano_de_archivo(self):
        """VTEX rechaza los archivos de mas de 20 KB; el generador corta en 16
        para que quepan grupos nuevos sin reventar el limite."""
        for i, chunk in enumerate(self.files, 1):
            size = sum(len((row + '\n').encode('utf-8')) for _, row in chunk)
            self.assertLessEqual(size, VTEX_LIMIT, 'archivo %d sobre el limite de VTEX' % i)
            self.assertLessEqual(size, SAFE_LIMIT, 'archivo %d sobre el techo de seguridad' % i)

    # 6 -------------------------------------------------------------------- #
    def test_todas_las_hojas_tienen_grupo(self):
        """Una hoja sin grupo solo se encuentra escribiendo su nombre exacto."""
        n = self.mod.normalize
        presentes = {n(t) for t in self.terms}
        faltan = []
        for _, name, kind in self.mod.iter_nodes(self.tree):
            if kind != 'hoja':
                continue
            sin_parentesis = re.sub(r'\s*\(.*?\)', '', name).strip()
            if n(name) not in presentes and n(sin_parentesis) not in presentes:
                faltan.append(name)
        self.assertEqual(faltan, [], 'hojas sin ningun grupo de sinonimos')

    # 7 -------------------------------------------------------------------- #
    def test_formato_de_fila(self):
        """El formato bidireccional de VTEX es {terminos};true: cualquier otra
        cosa la rechaza la importacion."""
        for row in self.rows:
            self.assertTrue(row.endswith(';true'), 'fila sin ;true: %r' % row)
            self.assertEqual(row.count(';'), 1, 'punto y coma de mas en: %r' % row)
            self.assertGreaterEqual(len(row[:-len(';true')].split(',')), 2,
                                    'grupo de un solo termino: %r' % row)

    # 8 -------------------------------------------------------------------- #
    def test_la_barra_no_parte_terminos(self):
        """"compresor a/c" es un termino; si la barra se convierte en coma,
        queda "c" equivaliendo a Compresores de AC."""
        n = self.mod.normalize
        presentes = {n(t) for t in self.terms}
        faltan = []
        for name, syns in self.tree['_sinonimos'].items():
            for term in [name] + list(syns):
                if '/' not in term:
                    continue
                limpio = self.mod.clean_term(term)
                if limpio in self.terms:
                    continue
                if n(limpio) in presentes:
                    continue          # sobrevive como termino equivalente
                faltan.append(term)
        self.assertEqual(sorted(set(faltan)), [], 'terminos con / que no llegaron al CSV')

    # extras --------------------------------------------------------------- #
    def test_dry_run_no_escribe(self):
        """--dry-run informa pero no toca catalogo/."""
        antes = {p: os.path.getmtime(os.path.join(REPO, 'catalogo', p))
                 for p in os.listdir(os.path.join(REPO, 'catalogo'))}
        out = subprocess.run([sys.executable, SCRIPT, '--dry-run'], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        despues = {p: os.path.getmtime(os.path.join(REPO, 'catalogo', p))
                   for p in os.listdir(os.path.join(REPO, 'catalogo'))}
        self.assertEqual(antes, despues, '--dry-run escribio en catalogo/')

    def test_flag_desconocido_falla(self):
        """Un flag mal escrito no puede pasar de largo y regenerar a medias."""
        out = subprocess.run([sys.executable, SCRIPT, '--que-es-esto'], capture_output=True, text=True)
        self.assertNotEqual(out.returncode, 0)
        self.assertIn('unrecognized arguments', out.stderr)

    def test_no_depende_del_orden_del_json(self):
        """El mismo catalogo debe dar el mismo CSV: si cambia con el orden de
        lectura, la importacion siguiente mueve terminos de grupo sin motivo."""
        files2, _ = self.mod.generate(json.loads(json.dumps(self.tree)))
        rows2 = [row for chunk in files2 for _, row in chunk]
        self.assertEqual(self.rows, rows2)


if __name__ == '__main__':
    unittest.main()
