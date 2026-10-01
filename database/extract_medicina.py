"""Extrae el pedido y las 50 fichas del informe de aulas de Medicina.

Ejecutar desde cualquier directorio: python3 database/extract_medicina.py
Las cantidades del pedido son propias del informe y no forman parte del catálogo.
"""
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

root = Path(__file__).resolve().parent.parent
source = root / 'docs' / 'Aulas_medicina final (2) (Reparado).docx'
target = root / 'database' / 'materiales_medicina.json'
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def rows(table):
    return [
        [''.join(t.text or '' for t in cell.findall('.//w:t', ns)).strip()
         for cell in row.findall('w:tc', ns)]
        for row in table.findall('w:tr', ns)
    ]

root_xml = ET.fromstring(zipfile.ZipFile(source).read('word/document.xml'))
tables = root_xml.findall('.//w:tbl', ns)
request_table = next(t for t in tables if any(row[:4] == ['ITEM', 'DESCRIPCIÓN', 'UNIDAD', 'CANT.'] for row in rows(t)))
category_names = {
    'GABINETE': 'Gabinetes y racks',
    'CABLEADO HORIZONTAL': 'Cableado estructurado',
    'CANALIZACIÓN EXTERNA/INTERNA': 'Canalización e instalación',
    'ENERGÍA': 'Energía eléctrica',
    'EQUIPAMIENTO MULTIMEDIA': 'Multimedia',
    'FIBRA ÓPTICA': 'Fibra óptica',
}
units = {'PZAS.': 'PZA', 'PZAS': 'PZA', 'ROLLO': 'ROLLO', 'KILO': 'KG', 'MTS.': 'M', 'METROS': 'M'}
materials = {}
category = None
for row in rows(request_table):
    if len(row) == 1 and row[0] in category_names:
        category = category_names[row[0]]
    if len(row) >= 4 and row[0].isdigit():
        number = int(row[0])
        assert number not in materials and category, (number, category)
        # Corrige erratas evidentes del rótulo sin cambiar datos técnicos.
        material = row[1].strip().upper().replace('PACTH CORD', 'PATCH CORD').replace('TIERRRA', 'TIERRA')
        unit = units.get(row[2].strip().upper())
        assert material and unit, row
        materials[number] = {'nombre': material, 'unidad': unit, 'categoria': category,
                             'descripcion': '', 'activo': True, 'especificaciones': []}
assert set(materials) == set(range(1, 51)), f'Pedido incompleto: {len(materials)} materiales'

seen = set()
for table in tables:
    content = rows(table)
    if len(content) < 3 or content[0] != ['ESPECIFICACIONES TÉCNICAS']:
        continue
    match = re.fullmatch(r'ITEM\s+(\d+):', content[1][0], re.IGNORECASE)
    if not match:
        continue
    number = int(match.group(1))
    assert number in materials and number not in seen, f'Ficha repetida o ausente: {number}'
    seen.add(number)
    specs = []
    for cells in content[2:]:
        if len(cells) >= 2:
            name, value = cells[0].strip(), cells[1].strip()
            if name.casefold() != 'cantidad' and name and value:
                specs.append({'nombre': name, 'valor': value})
        elif len(cells) == 1 and cells[0].startswith('Descripción: '):
            specs.append({'nombre': 'Descripción', 'valor': cells[0].split(':', 1)[1].strip()})
        elif len(cells) == 1:
            assert cells[0] in {'Datos generales:', 'Datos técnicos:', 'CARACTERÍSTICAS'}, (number, cells)
    materials[number]['especificaciones'] = specs
assert seen == set(materials), f'Fichas faltantes: {sorted(set(materials) - seen)}'
result = [materials[i] for i in sorted(materials)]
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'{len(result)} materiales, {sum(len(m["especificaciones"]) for m in result)} especificaciones de Medicina.')
