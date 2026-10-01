"""Combina las fichas institucionales sin duplicar materiales equivalentes.

Ejecutar: python3 database/merge_catalog.py
No toca PostgreSQL; npm run seed añade solo las fichas nuevas a la base.
"""
import json
from pathlib import Path

folder = Path(__file__).resolve().parent
derecho = json.loads((folder / 'materiales_derecho.json').read_text())
medicina = json.loads((folder / 'materiales_medicina.json').read_text())

# Estos once pedidos se refieren a productos ya presentes en el primer catálogo.
# Sus fichas originales se conservan: hay diferencias de redacción entre informes.
equivalents = {
    'PATCH PANEL DE 24 ENTRADAS, 1RU, DESCARGADO 24 ICONOS': 'PATCH PANEL DE 24 ENTRADAS 1RU DESCARGADO 24 ICONOS',
    'PANEL CANALETA HORIZONTAL CON CUBIERTA DE 1RU (ORDENADOR)': 'PANEL CANALETA HORIZONTAL CON CUBIERTA DE 1RU (ORDENADOR)',
    'REGLETA PDU MULTITOMA ELÉCTRICA 6 TOMAS LÍNEA A TIERRA HORIZONTAL 1RU TOMA UNIVERSAL': 'REGLETA TIPO PDU MULTITOMA ELÉCTRICA 6 TOMAS A TIERRA HORIZONTAL 1RU TOMA UNIVERSAL',
    'CAJA DE SOBREPONER TIPO CHUQUI 4" X 2"': 'CAJAS TIPO CHUQUI',
    'CABLE CANAL 20X20 CON ADHESIVO': 'CABLE CANAL 20X20mm con adhesivo',
    'PRECINTOS PLÁSTICOS PAQUETE (100 UND.) 20CM': 'PRECINTOS PLÁSTICOS PAQUETE (100 UND.) 20CM',
    'CINTA VELCRO 10MM X 3 MTS': 'CINTA VELCRO 10MM x 3MTS',
    'CINTA AISLANTE 20Y': 'CINTA AISLANTE 20 YD',
    'RAMPLUS #6 PARA LADRILLO HUECO': 'RAMPLUS #6 P/LADRILLO HUECO',
    'TORNILLO ENCARNE 4,5X40MM': 'TORNILLOS DE ENCARNE #6 DE 1 ¼”',
    'BROCAS PARA CONCRETO SDS #6': 'BROCA PARA CONCRETO SDS #6',
}

assert len(derecho) == 23 and len(medicina) == 50, 'Una fuente cambió; revise las equivalencias antes de fusionar.'
old_names = {m['nombre'] for m in derecho}
new_names = {m['nombre'] for m in medicina}
assert len(old_names) == len(derecho) and len(new_names) == len(medicina)
for new_name, old_name in equivalents.items():
    assert new_name in new_names and old_name in old_names, (new_name, old_name)

catalog = [*derecho]
for material in medicina:
    if material['nombre'] not in equivalents and material['nombre'] not in old_names:
        catalog.append(material)
assert len(catalog) == 62, f'Número de fichas inesperado: {len(catalog)}'
(folder / 'materiales.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
print(f'{len(catalog)} materiales, {sum(len(m["especificaciones"]) for m in catalog)} especificaciones; 39 materiales nuevos.')
