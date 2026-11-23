"""Las motorizaciones calzan con la base de vehiculos.

Corre el validador real. Si esto se pone rojo, el selector de vehiculo le va
a ofrecer a alguien un motor que su carro no tuvo, o peor: no le va a
preguntar el motor a un modelo que si lo necesita y le vamos a vender la
pieza equivocada.
"""
import os
import subprocess
import sys
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VALIDADOR = os.path.join(REPO, 'scripts', 'validar-motorizaciones.py')


class TestMotorizaciones(unittest.TestCase):
    def test_validador_pasa(self):
        r = subprocess.run([sys.executable, VALIDADOR], capture_output=True, text=True, cwd=REPO)
        self.assertEqual(r.returncode, 0, 'validar-motorizaciones.py fallo:\n' + r.stdout + r.stderr)

    def test_ningun_modelo_rankeado_se_escapa(self):
        """El que mas duele: un modelo de los que mas se venden sin motor."""
        r = subprocess.run([sys.executable, VALIDADOR], capture_output=True, text=True, cwd=REPO)
        self.assertNotIn('SIN MOTORIZACION', r.stdout)

    def test_las_motos_no_llevan_motor(self):
        """El cilindraje de una moto ya va en el nombre: Pulsar 160, XTZ 150.
        Preguntarlo seria un paso de mas que no cambia la pieza."""
        import json
        with open(os.path.join(REPO, 'react', 'data', 'motorizaciones.json'), encoding='utf-8') as fh:
            d = json.load(fh)
        self.assertNotIn('motos', d, 'las motos no deben tener motorizaciones')


if __name__ == '__main__':
    unittest.main()
