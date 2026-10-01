# Uso compartido en una intranet pequeña

Para dos personas, una computadora de la oficina puede alojar la aplicación y la base de datos. Ambas entran desde su navegador con cuentas separadas; no se instala la aplicación en las computadoras cliente. Ese equipo debe estar encendido mientras se utilice el sistema y tener una dirección IP fija o una reserva DHCP. No copie la base de datos a cada equipo: se perdería una única numeración e historial compartidos.

## Esquema

```
Navegadores de los dos usuarios ── HTTPS ── Caddy (equipo anfitrión)
                                            ├─ /api/* → API :3000
                                            └─ resto  → Angular SSR :4000
API → PostgreSQL :5432, en el mismo equipo
```

La API, Angular y PostgreSQL escuchan solo en `127.0.0.1`. Caddy es el único servicio al que acceden los otros equipos. `Caddyfile` sirve ambos componentes bajo una dirección HTTPS; las llamadas del navegador a `/api` se mantienen en ese mismo origen.

## Preparación en el equipo anfitrión

1. Asigne una IP estable, por ejemplo `192.168.1.50`, y compruebe que los dos equipos pueden alcanzarla. Instale Node.js, PostgreSQL y Caddy. La configuración inicial de PostgreSQL figura en el [README principal](../../docs/DEVELOPMENT.md#1-postgresql-local).
2. Antes del uso real, cambie la contraseña inicial del administrador al ingresar. Si desea dos cuentas de prueba, ejecute `npm run provision:users` después del seed y conserve las claves temporales que muestra. Para uso real, cree las cuentas personales desde Usuarios. Cada usuario deberá escoger la suya al entrar. Sustituya las credenciales de PostgreSQL de ejemplo. Conserve `HOST=127.0.0.1` para la API y PostgreSQL. No abra los puertos 3000, 4000 ni 5432 en el cortafuegos.
3. En `backend`, ejecute `npm ci`, `npm run migrate` y `npm run build`. Si la base de datos es nueva, ejecute `npm run seed` una vez, tras configurar la numeración inicial. En `frontend`, ejecute `npm ci` y `npm run build`.
4. Inicie el servicio PostgreSQL local. Inicie la API compilada con `cd backend && NODE_ENV=production npm start` y el frontend compilado con `cd frontend && NG_ALLOWED_HOSTS=192.168.1.50 npm run serve:ssr:frontend`. Ejecute cada proceso en su propia terminal para la primera prueba. Sustituya la IP por la real.
5. Exporte `UMSS_HOST=192.168.1.50` y arranque Caddy con `caddy run --config frontend/deploy/Caddyfile --adapter caddyfile` desde el directorio `informes-umss`. Si el sistema requiere privilegios para escuchar en el puerto 443, instale esta configuración en el servicio de Caddy y configure `UMSS_HOST` en el entorno de ese servicio.
6. Abra `https://192.168.1.50` desde ambos equipos. La CA local de Caddy debe instalarse como confiable **solo en esos dos equipos**; Caddy explica cómo encontrarla en su [documentación de HTTPS local](https://caddyserver.com/docs/automatic-https#local-https). No ignore avisos de certificado en el navegador.

Compruebe `https://192.168.1.50/api/health`, después inicie sesión con cada cuenta y genere una descarga de prueba. Si el anfitrión se apaga, ambos usuarios pierden el acceso hasta que vuelva a arrancar. Para operación diaria, configure PostgreSQL, API, Angular y Caddy como servicios que se inicien automáticamente, y haga una copia diaria con `pg_dump` guardada fuera del equipo anfitrión. La exposición a Internet requiere una configuración aparte; esta guía es solo para la intranet.

Para usar como anfitriona la computadora con Windows 10, siga también la [guía específica para Windows](windows-10.md).
