# Equipo anfitrión con Windows 10

La computadora Windows puede atender a los dos usuarios de la intranet. Debe permanecer encendida, sin suspensión automática y con IP fija o reserva DHCP. Windows 10 terminó su soporte general en octubre de 2025; para un equipo que conserva informes de trabajo, manténgalo cubierto por ESU o actualícelo a un sistema con soporte. Consulte [Microsoft](https://support.microsoft.com/en-us/windows/deployment/updates-lifecycle/windows-10-support-has-ended-on-october-14-2025).

## Preparación

1. Instale PostgreSQL para Windows, Node.js compatible con Angular 22 y Caddy. No hace falta Docker ni WSL. PostgreSQL puede instalarse como servicio de Windows; Caddy también [puede funcionar como servicio](https://caddyserver.com/docs/running#windows-service).
2. Copie el proyecto a una ruta estable, por ejemplo `C:\informes-umss`. Ejecute los comandos en PowerShell desde esa carpeta. No copie `database/pgdata` de Linux a Windows. Si va a trasladar datos existentes, genere un respaldo reciente con `pg_dump -Fc` y transfiéralo de forma privada: los respaldos y los datos de PostgreSQL están excluidos del repositorio público. Cree en Windows el rol `umss` y una base vacía `informes_umss` de su propiedad y restáurela con `pg_restore`:

   ```powershell
   pg_restore -h 127.0.0.1 -U umss -d informes_umss --no-owner .\database\respaldo_privado.dump
   ```

   [PostgreSQL documenta el respaldo y la restauración](https://www.postgresql.org/docs/current/backup.html).

3. Mantenga PostgreSQL y la API enlazados a `127.0.0.1`; la configuración de Caddy es la única entrada desde la red. En el cortafuegos permita HTTPS desde la intranet y mantenga cerrados los puertos 3000, 4000 y 5432 para otros equipos.
4. Cree `backend\.env` a partir de `backend\.env.example` y configure una contraseña nueva de PostgreSQL, `NODE_ENV=production` y `HOST=127.0.0.1`. En cada carpeta (`backend` y `frontend`) ejecute `npm ci` y `npm run build`. En `backend` ejecute `npm run migrate` después de restaurar; es idempotente. Si parte de una base vacía, configure una clave inicial fuerte para admin y ejecute además `npm run seed` y cree las cuentas personales desde Usuarios. Si restauró una base anterior, las cuentas y sus contraseñas existentes se conservan.
5. Para la primera prueba, inicie PostgreSQL y abra tres terminales: en `backend`, `npm start`; en `frontend`, defina `$env:NG_ALLOWED_HOSTS = '192.168.1.50'` y ejecute `npm run serve:ssr:frontend`; en la raíz del proyecto, defina `$env:UMSS_HOST = '192.168.1.50'` y ejecute `caddy run --config .\frontend\deploy\Caddyfile`. Cambie la IP de ejemplo por la IP real.
6. Pruebe `https://192.168.1.50/api/health` y el inicio de sesión de cada cuenta. Para la operación diaria, configure la API, Angular y Caddy como servicios de Windows que arranquen después de PostgreSQL; no deje el sistema dependiendo de terminales abiertas. En el servicio de Caddy, use una copia del `Caddyfile` con `{$UMSS_HOST}` sustituido por la IP fija; configure `NG_ALLOWED_HOSTS` en el servicio de Angular. Instale la CA local de Caddy como confiable en los dos equipos cliente y programe una copia diaria de PostgreSQL fuera de la computadora anfitriona.

La contraseña temporal de cada técnico deja de servir en cuanto elija una propia. El administrador puede restablecerla desde **Usuarios**; ese restablecimiento revoca sesiones anteriores y vuelve a exigir el cambio al siguiente ingreso. Entregue cada clave temporal únicamente a su titular.
