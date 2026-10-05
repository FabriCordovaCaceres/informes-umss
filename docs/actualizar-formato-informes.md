# Actualizar el formato de los informes en el servidor

La exportación Word y PDF, y la vista previa, siguen ahora el formato de `InformeTecnico_RD-RDTIC-N° Derecho.docx`: papel Carta, márgenes laterales de 3 cm, Times New Roman, encabezado del pedido dentro de la tabla y fichas técnicas con celdas combinadas. Los materiales continúan según el espacio disponible; no se fuerza una página por material. Se retiraron el encabezado adicional de cada página, la fecha repetida fuera de la tabla, el título de costos y el total automático.

También se corrigieron los avisos de la vista previa: los campos obligatorios pendientes, las validaciones fallidas y los errores de guardado aparecen encima de los botones, junto a «Validar y finalizar».

## Actualizar desde el repositorio

En la computadora que aloja el sistema, detenga los servicios de la API y del frontend. Desde PowerShell, en la raíz de la instalación:

```powershell
cd C:\informes-umss
git pull --ff-only origin main
npm ci --prefix backend
npm ci --prefix frontend
npm run build --prefix backend
npm run build --prefix frontend
```

Inicie de nuevo los servicios y recargue la página. Caddy conserva su configuración actual. Los informes se deben descargar nuevamente para obtener el formato actualizado.

## Actualizar con el paquete compilado

Si recibió `actualizacion-formato-informes.zip` por separado, contiene los archivos modificados y las compilaciones de backend y frontend. Los documentos generados de ejemplo se entregan aparte y no se publican en el repositorio. LibreOffice se utilizó únicamente para la revisión local; el servidor sigue generando documentos con las dependencias Node existentes.

1. Detenga los servicios de la API y del frontend.
2. Extraiga el ZIP sobre la raíz de la instalación (por ejemplo, `C:\informes-umss`), conservando las rutas de las carpetas y reemplazando los archivos de la actualización.
3. Inicie de nuevo los servicios de la API y del frontend. Caddy mantiene su configuración actual.
4. Recargue la página y descargue nuevamente Word y PDF de un informe. Las descargas anteriores conservan su formato anterior.
5. Para comprobar los avisos, abra un informe nuevo, avance a la vista previa sin completar los campos obligatorios y pulse «Validar y finalizar». El aviso aparece junto al botón.

La actualización no requiere migraciones ni cambios en PostgreSQL. Conserva informes, usuarios y configuración existentes.

Si copia solo el código fuente, compile desde PowerShell antes de reiniciar los servicios:

```powershell
cd C:\informes-umss\backend
npm run build
cd ..\frontend
npm run build
```

Las compilaciones incluidas corresponden a este proyecto y sus dependencias bloqueadas. Si su instalación tiene otras modificaciones de código, aplique los cambios de fuente y compile en el servidor.
