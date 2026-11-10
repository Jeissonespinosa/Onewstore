"""
Infraestructura compartida para probar scripts/gen-categorias.py SIN tocar
el repo real.

El script no tiene main() ni --dry-run: TODO corre al importarlo (lee
catalogo/, escribe store/routes.json y store/blocks/home/category-*.jsonc y
exporta el CSV). Por eso no se puede hacer `importlib.import_module` a
secas: primero se copia el script + catalogo + routes.json a un directorio
temporal y se importa DESDE ahi (ROOT se deriva de __file__).

Uso:
    sb = Sandbox(tmp_path)          # copia el repo minimo
    sb.write_tree({...})            # (opcional) reemplaza el JSON de entrada
    mod = sb.run()                  # importa == ejecuta; devuelve el modulo
    sb.read_routes(), sb.read_blocks('category-listing.jsonc'), sb.read_csv()

Tambien funciona sin pytest: cada test_*.py se puede correr con
`python3 -m unittest scripts/tests/test_gen_categorias.py`.
"""
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT = os.path.join(REPO, 'scripts', 'gen-categorias.py')


def strip_jsonc(text):
    """Quita comentarios /* */ y // (fuera de strings) de un JSONC."""
    out, i, n, instr = [], 0, len(text), False
    while i < n:
        c = text[i]
        if instr:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                instr = False
            i += 1
            continue
        if c == '"':
            instr = True
            out.append(c)
            i += 1
            continue
        if text.startswith('//', i):
            j = text.find('\n', i)
            i = n if j < 0 else j
            continue
        if text.startswith('/*', i):
            j = text.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def load_jsonc(path):
    with open(path, encoding='utf-8') as fh:
        return json.loads(strip_jsonc(fh.read()))


class Sandbox(object):
    def __init__(self, root, tree=None, routes=None, icons=None):
        self.root = str(root)
        self.cat = os.path.join(self.root, 'catalogo')
        self.blocks = os.path.join(self.root, 'store', 'blocks', 'home')
        self.routes_path = os.path.join(self.root, 'store', 'routes.json')
        os.makedirs(self.cat)
        os.makedirs(self.blocks)
        os.makedirs(os.path.join(self.root, 'scripts'))
        shutil.copy(SCRIPT, os.path.join(self.root, 'scripts', 'gen-categorias.py'))
        real_cat = os.path.join(REPO, 'catalogo')
        shutil.copy(os.path.join(real_cat, 'iconos-categorias.json'), self.cat)
        if icons is not None:
            self.write_json(os.path.join(self.cat, 'iconos-categorias.json'), icons)
        if tree is None:
            shutil.copy(os.path.join(real_cat, 'estructura-categorias-v2.json'), self.cat)
        else:
            self.write_tree(tree)
        if routes is None:
            shutil.copy(os.path.join(REPO, 'store', 'routes.json'), self.routes_path)
        else:
            self.write_json(self.routes_path, routes)

    # --- entradas ----------------------------------------------------------
    @staticmethod
    def write_json(path, data):
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False, indent=1)

    def write_tree(self, tree):
        self.write_json(os.path.join(self.cat, 'estructura-categorias-v2.json'), tree)

    def write_routes_raw(self, text):
        with open(self.routes_path, 'w', encoding='utf-8') as fh:
            fh.write(text)

    # --- ejecucion ---------------------------------------------------------
    def run(self, argv=()):
        """Importa el script copiado y devuelve el modulo.

        El script ya no ejecuta al importarse (tiene main() con guard), asi que
        aqui se llama a main() explicitamente: para los tests, run() sigue
        significando "genera la salida".
        """
        old_argv = sys.argv
        sys.argv = ['gen-categorias.py'] + list(argv)
        try:
            spec = importlib.util.spec_from_file_location(
                'gen_categorias_%d' % id(self), os.path.join(self.root, 'scripts', 'gen-categorias.py'))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            self._mod, self._argv, self._ran = mod, list(argv), True
            if hasattr(mod, 'main'):
                mod.main(list(argv))         # el script ya no corre al importarse
            return mod
        finally:
            sys.argv = old_argv

    def _ensure_ran(self):
        """Genera la salida una sola vez, cuando un test la pide."""
        if getattr(self, '_ran', True):
            return
        self._ran = True
        old_argv = sys.argv
        sys.argv = ['gen-categorias.py'] + self._argv
        try:
            self._mod.main(self._argv)
        finally:
            sys.argv = old_argv

    def import_only(self):
        """Importa el script SIN ejecutarlo (para probar que no tiene efectos)."""
        spec = importlib.util.spec_from_file_location(
            'gen_categorias_imp_%d' % id(self), os.path.join(self.root, 'scripts', 'gen-categorias.py'))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def run_subprocess(self, argv=()):
        """Ejecuta el script en un proceso aparte (para capturar sys.exit)."""
        return subprocess.run(
            [sys.executable, os.path.join(self.root, 'scripts', 'gen-categorias.py')] + list(argv),
            capture_output=True, text=True, cwd=self.root)

    # --- salidas -----------------------------------------------------------
    def read_routes(self):
        self._ensure_ran()
        with open(self.routes_path, encoding='utf-8') as fh:
            return json.load(fh)

    def read_blocks(self, name):
        self._ensure_ran()
        return load_jsonc(os.path.join(self.blocks, name))

    def read_csv(self):
        self._ensure_ran()
        import csv
        with open(os.path.join(self.cat, 'estructura-categorias-v2.csv'), encoding='utf-8', newline='') as fh:
            return list(csv.reader(fh))

    def outputs(self):
        return sorted(os.listdir(self.blocks))


def minimal_tree(**overrides):
    """Arbol minimo valido: 1 macro por seccion. Se puede sobreescribir por seccion."""
    tree = {
        '_sinonimos': {},
        'Carros': [{'nombre': 'Frenos', 'subs': [{'nombre': None, 'tipos': ['Pastillas de freno']}]}],
        'Motos': [{'nombre': 'Frenos', 'subs': [{'nombre': None, 'tipos': ['Pastillas de freno']}]}],
        'Herramientas': [{'nombre': 'Manuales', 'subs': [{'nombre': None, 'tipos': ['Llaves']}]}],
    }
    tree.update(overrides)
    return tree


def import_pure_functions():
    """
    Devuelve (norm, slugify, md_escape, placeholder) SIN ejecutar el script:
    se extraen las defs del fuente y se evaluan aisladas. Sirve para probar
    las funciones puras sin sandbox.
    """
    # El script ya tiene main() con guard: importarlo no lee ni escribe nada,
    # asi que basta con importar y devolver su namespace (antes se recortaban
    # las defs con un regex y cualquier helper nuevo quedaba fuera).
    spec = importlib.util.spec_from_file_location('gen_categorias_pure', SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return vars(mod)
