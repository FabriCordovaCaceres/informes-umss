# Fuentes del catálogo

Los archivos Word institucionales de esta carpeta no se publican en GitHub porque contienen nombres de personas e información de infraestructura. El catálogo técnico derivado que utiliza la aplicación está en [database/materiales.json](../database/materiales.json).

Para regenerarlo, coloque aquí las fuentes originales autorizadas y ejecute desde la raíz del proyecto:

```bash
python3 database/extract_reference.py
python3 database/extract_medicina.py
python3 database/merge_catalog.py
```

Los scripts esperan los nombres de archivo originales. Los documentos fuente y los respaldos de datos deben transferirse por un canal privado.
