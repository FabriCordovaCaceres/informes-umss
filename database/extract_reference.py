"""Extract first area's specifications from the supplied institutional DOCX.
Uses XML paragraphs rather than table count: the Word contains merged tables.
Run from informes-umss: python database/extract_reference.py
"""
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

root = Path(__file__).resolve().parent.parent
source = root / 'docs' / 'InformeTecnico_RD-RDTIC-N° Derecho.docx'
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
doc = ET.fromstring(zipfile.ZipFile(source).read('word/document.xml'))
lines = [''.join(t.text or '' for t in p.findall('.//w:t', ns)).strip() for p in doc.findall('.//w:p', ns)]
lines = [line for line in lines if line]
start = next(i for i, line in enumerate(lines) if line.startswith('ESPECIFICACIONES TÉCNICAS PLANTA BAJA'))
end = next(i for i, line in enumerate(lines) if line.startswith('ESPECIFICACIONES TÉCNICAS PLANTA ALTA'))
sections = re.split(r'\nITEM \d+:\s*\n', '\n'.join(lines[start:end]))[1:]
assert len(sections) == 23, 'Expected 23 material specifications in the first area'
materials = []
# Material names and units come from the first request table.
for table in doc.findall('.//w:tbl', ns):
    rows = [[''.join(t.text or '' for t in cell.findall('.//w:t', ns)).strip() for cell in row.findall('w:tc', ns)] for row in table.findall('w:tr', ns)]
    if any('PEDIDO DE MATERIALES' in ' '.join(row) for row in rows):
        materials = [{'nombre': row[3], 'unidad': row[2], 'categoria': 'Redes e infraestructura', 'descripcion': '', 'activo': True, 'especificaciones': []} for row in rows if len(row) == 4 and row[0].isdigit()]
        break
assert len(materials) == 23
for material, section in zip(materials, sections):
    parts = [p.strip() for p in section.split('\n') if p.strip() and not p.startswith('ESPECIFICACIONES TÉCNICAS')]
    technical = parts.index('Datos técnicos:')
    specs = []
    for i, part in enumerate(parts[:technical]):
        if part in ('Marca', 'Marca y modelo'):
            specs.append({'nombre': part, 'valor': parts[i+1]})
    values = parts[technical+1:]
    if 'PoE-SALIDA' in values:
        # This is a section heading, followed by the actual attribute and value.
        values.remove('PoE-SALIDA')
    assert len(values) % 2 == 0, (material['nombre'], values)
    specs.extend({'nombre': values[i], 'valor': values[i+1]} for i in range(0, len(values), 2))
    material['especificaciones'] = specs
(root / 'database' / 'materiales_derecho.json').write_text(json.dumps(materials, ensure_ascii=False, indent=2) + '\n')
print(f'{len(materials)} materiales; {sum(len(m["especificaciones"]) for m in materials)} especificaciones extraídas.')
