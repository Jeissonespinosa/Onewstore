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

    def test_a_una_moto_solo_se_le_pregunta_si_el_nombre_no_lo_dice(self):
        """El cilindraje de casi toda moto ya va en el nombre: Pulsar 160,
        XTZ 150. Preguntarlo ahi seria un paso de mas que no cambia la pieza,
        y cada paso de mas en el selector es gente que lo abandona.

        Se pregunta SOLO donde el nombre es ambiguo de verdad: "Discover 100
        125" cubre dos cilindrajes distintos y la pieza no es la misma. La
        unica otra excepcion es la electrica, donde no hay cilindraje y hay
        que decirlo.

        Antes esta prueba exigia que NO hubiera motos en la tabla. Dejo de
        ser cierto cuando se cargaron las motos igual que los carros; lo que
        sigue siendo cierto, y es lo que importa, es POR QUE se pregunta.
        """
        import json
        with open(os.path.join(REPO, 'react', 'data', 'motorizaciones.json'), encoding='utf-8') as fh:
            d = json.load(fh)
        sobran = []
        no_esta_en_el_nombre = []
        for marca, modelos in d.get('motos', {}).items():
            for modelo, ficha in modelos.items():
                motores = ficha.get('motores') or []
                electricos = [m for m in motores if m.get('electrico')]
                if len(motores) == 1 and not electricos:
                    # Un solo cilindraje: el nombre ya lo dice, no se pregunta.
                    sobran.append('%s %s' % (marca, modelo))
                for m in motores:
                    if m.get('electrico'):
                        continue
                    if m['id'] not in modelo:
                        no_esta_en_el_nombre.append('%s %s -> %s' % (marca, modelo, m['id']))
        self.assertEqual(sobran, [],
                         'estas motos tienen un solo cilindraje: preguntarlo es un paso de mas')
        self.assertEqual(no_esta_en_el_nombre, [],
                         'el cilindraje que se ofrece tiene que estar en el nombre del modelo, '
                         'si no el cliente no sabe cual escoger')


if __name__ == '__main__':
    unittest.main()
