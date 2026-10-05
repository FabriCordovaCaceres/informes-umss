# Actualizar el formato de los informes en el servidor

La exportación Word y PDF, y la vista previa, siguen ahora el formato de `InformeTecnico_RD-RDTIC-N° Derecho.docx`: papel Carta, márgenes laterales de 3 cm, Times New Roman, encabezado del pedido dentro de la tabla y fichas técnicas con celdas combinadas. Los materiales continúan según el espacio disponible; no se fuerza una página por material. Se retiraron el encabezado adicional de cada página, la fecha repetida fuera de la tabla, el título de costos y el total automático.

También se corrigieron los avisos de la vista previa: los campos obligatorios pendientes, las validaciones fallidas y los errores de guardado aparecen encima de los botones, junto a «Validar y finalizar».

## Actualizar desde el repositorio

En la computadora que aloja el sistema, detenga la API y el frontend antes de instalar dependencias. Si están en ventanas abiertas, pulse `Ctrl+C` en cada consola que ejecuta `npm run dev`, `npm start`, `ng serve` o `npm run watch`. Si funcionan como servicios de Windows, abra `services.msc` y detenga los servicios de estas dos aplicaciones. Si utiliza un administrador como PM2, deténgalas desde ese administrador para evitar que se reinicien durante la actualización.

Desde PowerShell, en la raíz de la instalación, ejecute los comandos por separado. Si alguno falla, resuelva ese error antes de continuar:

```powershell
cd C:\informes-umss
git pull --ff-only origin main
npm ci --prefix backend --include=dev
npm ci --prefix frontend --include=dev
npm run build --prefix backend
npm run build --prefix frontend
```

Inicie de nuevo los servicios y recargue la página. Caddy conserva su configuración actual. Los informes se deben descargar nuevamente para obtener el formato actualizado.

`--include=dev` instala también TypeScript, Angular CLI y el builder, necesarios para compilar aunque el entorno tenga `NODE_ENV=production`. Consulte la [documentación de npm ci](https://docs.npmjs.com/cli/commands/npm-ci/).

## Windows: errores EPERM o EBUSY al instalar

Si `npm ci` falla al borrar `esbuild.exe` o la carpeta `sass-embedded-win32-x64`, lo más probable es que un proceso conserve archivos abiertos. Primero detenga la API, el frontend y sus procesos de desarrollo como se indica arriba. `npm ci` limpia `node_modules` antes de reinstalar; una interrupción puede dejar dependencias incompletas. Los errores posteriores de `tsc` o `@angular/build:application` se resuelven al completar la instalación.

En **CMD**, pegue este bloque completo. La cadena se detiene si falla cualquiera de los pasos:

```bat
cd /d C:\informes-umss && ^
npm ci --prefix backend --include=dev && ^
npm ci --prefix frontend --include=dev && ^
npm run build --prefix backend && ^
npm run build --prefix frontend
```

Si todavía aparece un bloqueo, cierre el editor que tenga abierto el proyecto y compruebe que los servicios no se hayan reiniciado. Para identificar procesos nativos que pueden seguir abiertos, ejecute en CMD:

```bat
tasklist /FI "IMAGENAME eq esbuild.exe"
tasklist /FI "IMAGENAME eq dart.exe"
```

Antes de finalizar un proceso, confirme que pertenece a esta instalación. Windows permite finalizar un proceso concreto con `taskkill /PID <PID> /T /F`; sustituya `<PID>` por su identificador. Consulte [tasklist](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tasklist) y [taskkill](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill).

Cuando ambas compilaciones terminen correctamente, vuelva a iniciar la API y el frontend y recargue la página con `Ctrl+F5`.

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
