# Guía de desarrollo y operación

## Requisitos

- Node.js 22.22.3 o posterior compatible con Angular 22 (también Node 24.15+ o 26+), npm.
- PostgreSQL 14 o posterior (verificado con PostgreSQL 18).
- Puertos locales 3000 (API), 4200 (frontend en desarrollo), 4000 (frontend compilado) y 5432 (PostgreSQL por defecto). En la intranet se expone solo HTTPS mediante Caddy.

La estructura es `informes-umss/frontend`, `informes-umss/backend`, `informes-umss/database` y `informes-umss/docs`. Ejecute los comandos siguientes desde `informes-umss`, salvo indicación contraria.

## 1. PostgreSQL local

Instale PostgreSQL, cree una base vacía y configure su conexión en backend/.env. Los archivos de datos y los respaldos no se incluyen en este repositorio. No habilite conexiones remotas a PostgreSQL para la instalación de intranet.

### Ejemplo de instalación en Ubuntu

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql
```

En la consola PostgreSQL:

```sql
CREATE ROLE umss WITH LOGIN PASSWORD 'umss_local';
CREATE DATABASE informes_umss OWNER umss;
\q
```

La contraseña anterior es exclusivamente para desarrollo local; puede elegir otra y reflejarla en `DATABASE_URL`. No es necesario habilitar conexiones remotas a PostgreSQL.

## 2. Backend, base de datos y catálogo inicial

```bash
cd backend
npm ci
cp .env.example .env
# Editar .env para que coincida con su PostgreSQL.
npm run migrate
npm run seed
npm run build
npm run dev
```

Variables de `backend/.env`:

```dotenv
PORT=3000
HOST=127.0.0.1
DATABASE_URL=postgresql://umss:umss_local@127.0.0.1:5432/informes_umss
FRONTEND_ORIGIN=http://localhost:4200
NODE_ENV=development
SEED_ADMIN_PASSWORD=admin123
INITIAL_GESTION=2026
INITIAL_LAST_NUMERO=17
```

El seed crea `admin` / `admin123` solo para desarrollo y exige cambiar esa contraseña al primer ingreso. En producción, configure una clave inicial distinta antes de ejecutar el seed. Las contraseñas se almacenan con salt y scrypt, nunca en texto plano. Un seed posterior conserva usuarios y materiales existentes. El administrador cambia su propia clave desde **Cambiar contraseña** en la cabecera; en **Usuarios** puede restablecer la de otra persona, obligándola a cambiarla al ingresar. Si pierde el acceso a admin, `npm run rotate:admin-password` desde el backend genera otra clave temporal y revoca las sesiones anteriores. Cambiar la variable del seed no restablece una clave ya creada.

Las cuentas técnicas de ejemplo `tecnico1` y `tecnico2` se crean con `cd backend && npm run provision:users` después de migrar y cargar los roles. El comando genera una clave temporal diferente para cada una y la muestra una sola vez; si ya existen, no modifica sus contraseñas. Los nombres y correos `@local.invalid` son provisionales hasta que el administrador registre los datos reales.

Compruebe la API:

```bash
curl http://localhost:3000/api/health
```

Respuesta: `{"status":"ok","sistema":"Sistema de Informes Técnicos UMSS"}`. La API comprueba la conexión PostgreSQL antes de iniciar; ejecute las migraciones antes de usar las pantallas.

## 3. Frontend (otra terminal)

```bash
cd frontend
npm ci
npm start
```

Si tenía un `ng serve` anterior abierto, deténgalo con Ctrl+C y vuelva a iniciarlo para que cargue la nueva configuración SSR.

Abra **http://localhost:4200**. `npm start` ejecuta `ng serve`. El navegador usa `/api` en el mismo origen; `frontend/src/proxy.conf.json` envía las solicitudes al backend local durante el desarrollo.

Para compartir el sistema entre dos computadoras, siga la [guía de despliegue en intranet](../frontend/deploy/README.md). Si la anfitriona usa Windows 10, consulte además la [guía de Windows](../frontend/deploy/windows-10.md).

## Flujo de uso

1. En una instalación nueva de desarrollo, ingresar con `admin` / `admin123` y elegir de inmediato una contraseña propia de al menos 15 caracteres. Las cuentas técnicas también deben cambiar su clave temporal en su primer ingreso.
2. Revisar el catálogo y los textos iniciales en **Plantillas**. Crear cuentas técnicas o de jefatura en **Usuarios**, si corresponde.
3. **Nuevo informe**: datos generales, áreas, materiales, cantidades, costos y cierre.
4. Cada material incorpora su ficha automáticamente. **Especificaciones → Editar especificaciones solo para este informe** crea una excepción local. **Restaurar ficha original** recupera la revisión utilizada por ese informe.
5. Cambiar de paso conserva todos los datos. **Guardar borrador** permite cerrar y continuar después. Se impide abandonar el editor con cambios sin guardar y se ofrece descartarlos explícitamente. Al recargar, el navegador avisa si quedan cambios; no hay autoguardado.
6. Revisar la hoja A4, **Validar y finalizar** y descargar **PDF** o **Word**. También se pueden exportar borradores completos, marcados como BORRADOR.
7. Consultar historial o duplicar. Un informe finalizado no se edita ni se elimina; duplicarlo crea un borrador con número nuevo y fecha actual.

Las tablas del panel son datos reales de PostgreSQL; no hay informes de demostración precargados. En una base nueva el seed reserva el número 17/2026 del documento de referencia, por lo que el primer informe nuevo será el 18/2026; no crea un informe ficticio. Configure `INITIAL_GESTION` y `INITIAL_LAST_NUMERO` antes del primer seed según la secuencia real del departamento. Para comenzar en 1 en 2026, use `INITIAL_LAST_NUMERO=0`. Cada gestión posterior sin configuración previa comienza en 1. El Word de referencia sirve también como fuente del catálogo. La numeración se reserva dentro de una transacción al guardar; la estimación visible puede variar si otro usuario guarda antes. Eliminar un borrador no reutiliza su número. La fecha de un informe guardado debe permanecer dentro de su gestión.

## Catálogo y fidelidad de los datos

`database/materiales.json` contiene **62 materiales y 346 atributos** extraídos de `docs/InformeTecnico_RD-RDTIC-N° Derecho.docx` y `docs/Aulas_medicina final (2) (Reparado).docx`. El informe de Medicina aporta 50 fichas; 11 describen productos ya presentes y 39 son materiales nuevos. Se emplean las fichas de Planta Baja del informe de Derecho como base y las del informe de Medicina para los materiales nuevos. Las equivalencias conservan la ficha existente; los valores divergentes entre documentos pueden personalizarse en cada informe. No se inventaron certificaciones ni características ausentes. Se conserva la redacción técnica de la fuente, incluso sus inconsistencias (por ejemplo, la cinta de 3 m tiene una ficha sin longitud y el punto de acceso menciona WIFI 6 y 802.11b/g/n/ac). La revisión técnica del contenido corresponde al departamento.

Para regenerar el catálogo, coloque primero los Word originales autorizados en la carpeta docs. Estos documentos no están incluidos en Git. Después ejecute, sin dependencias Python adicionales:

```bash
python3 database/extract_reference.py
python3 database/extract_medicina.py
python3 database/merge_catalog.py
```

Estos comandos actualizan los JSON de fuente y `database/materiales.json`; no alteran PostgreSQL. Para agregar las fichas nuevas a una base existente, ejecute `cd backend && npm run seed`. El seed conserva las revisiones y ediciones de materiales ya guardados.

## Arquitectura

- `frontend/src/app/core`: modelos, HttpClient, sesiones, guards e interceptor.
- `frontend/src/app/layout`: sidebar y encabezado institucional reutilizables.
- `frontend/src/app/features`: login, panel/listado, editor de informes, catálogo, usuarios y plantillas.
- `frontend/src/app/shared/components`: iconos SVG locales y documento A4.
- `backend/src/routes`, `controllers`, `services`, `repositories`: API, reglas de negocio, exportación y SQL parametrizado.
- `backend/src/middleware`: sesión, permisos, validación y errores.
- `database/001_initial.sql` y `database/002_force_password_change.sql`: esquema inicial y cambio obligatorio de contraseña. Los scripts `extract_reference.py`, `extract_medicina.py` y `merge_catalog.py` generan el catálogo desde los dos Word institucionales.

La relación informe → áreas → materiales se almacena en tablas normalizadas. `material_revisiones` y `especificaciones_material` permiten compartir fichas y preservar los informes cuando cambia el catálogo. Cada línea referencia una revisión; solo las personalizaciones se guardan como excepción JSON. El mismo material en dos áreas mantiene cantidades independientes. Los archivos PDF/DOCX se generan bajo demanda desde esos datos; no es necesario almacenar copias binarias.

Las actualizaciones usan transacciones y control de versión: guardar una copia desactualizada devuelve un conflicto en lugar de sobrescribir cambios de otra ventana. El administrador gestiona catálogo/usuarios y todos los borradores; el técnico solo sus informes; el jefe consulta informes, documentos e historial. Desactivar una cuenta revoca su acceso.

Sesiones de 8 horas: token aleatorio en `sessionStorage`, hash del token en PostgreSQL, cierre de sesión revocable, límite de intentos de login. Ninguna contraseña se guarda en el navegador. La comunicación es frontend → API → PostgreSQL.

Las cuentas con contraseña temporal solo pueden consultar su sesión, cambiar la contraseña o salir. La API bloquea los demás recursos hasta el cambio; este requiere la clave actual y revoca las otras sesiones del usuario. La clave propia se puede cambiar después desde la cabecera. Las contraseñas nuevas deben tener al menos 15 caracteres.

Se conserva Angular SSR y su servidor. El login se renderiza en servidor; las rutas privadas se renderizan en cliente porque su sesión reside en `sessionStorage`. No se prerenderizan datos privados ni rutas con parámetros. `angular.json` permite los hosts locales `localhost` y `127.0.0.1` para SSR; en la intranet se añade el host real con `NG_ALLOWED_HOSTS`.

PDF usa [PDFKit](https://pdfkit.org/docs/getting_started.html), sin navegador instalado en el servidor. Word usa [docx](https://docx.js.org/), con tablas editables, encabezado, pie `pág. X` y saltos de página. Ambos son A4. La vista web reproduce contenido y formato; la paginación definitiva depende del motor PDF o del procesador Word y no será idéntica entre formatos.

## API

Las rutas privadas requieren `Authorization: Bearer <token>`.

| Método             | Ruta                                              | Acción                                            |
| ------------------ | ------------------------------------------------- | ------------------------------------------------- |
| GET                | `/api/health`                                     | Estado del servicio                               |
| POST               | `/api/auth/login`                                 | `{usuario,password}` → sesión                     |
| GET / POST         | `/api/auth/me`, `/api/auth/logout`                | Sesión actual / cerrar                            |
| POST               | `/api/auth/change-password`                       | Verificar clave actual y guardar una nueva         |
| GET / POST         | `/api/informes`                                   | Listar / crear                                    |
| GET / PUT / DELETE | `/api/informes/:id`                               | Consultar / guardar / eliminar borrador           |
| GET                | `/api/informes/siguiente?gestion=2026`            | Número estimado                                   |
| POST               | `/api/informes/:id/duplicar`                      | Nuevo borrador                                    |
| GET                | `/api/informes/:id/preview`                       | Modelo completo para vista A4                     |
| GET                | `/api/informes/:id/pdf`, `/api/informes/:id/docx` | Exportar                                          |
| GET / POST         | `/api/materiales`                                 | Catálogo / alta                                   |
| GET / PUT          | `/api/materiales/:id`                             | Consulta / nueva revisión, incluida desactivación |
| GET / POST         | `/api/usuarios`                                   | Listar / crear (administrador)                    |
| PUT                | `/api/usuarios/:id`                               | Editar / desactivar (administrador)               |
| GET / PUT          | `/api/configuracion`                              | Valores iniciales; escritura solo administrador   |

Los informes incluyen el historial en GET. PUT de un informe requiere la `version` recibida en GET. Una línea contiene `material_id`, `cantidad`, `revision_id` opcional y `especificaciones_override` opcional (`[{nombre,valor}]`). Si falta la revisión se usa la vigente del catálogo; al editar y duplicar se conserva la revisión original.

## Verificación

```bash
cd backend
npm run build
npm test
cd ../frontend
npm run build
npm test -- --watch=false
```

Prueba integral de API (solo con base **desechable**, ya migrada, seed ejecutado y API levantada):

```bash
cd backend
INTEGRATION_TEST=1 TEST_API_URL=http://localhost:3000/api node src/utils/integration.mjs
```

La prueba crea cuentas e informes, verifica permisos, versiones, concurrencia, cambio de gestión, duplicados, fichas por área, exportación e historial. Deja un informe finalizado y cuentas de prueba; no la ejecute sobre datos de trabajo. Exporta los archivos de inspección en `/tmp/umss-exports`.

La suite automática contiene 7 pruebas de Angular y 5 del backend. GitHub Actions ejecuta ambas suites y las compilaciones en cada push y pull request. La prueba integral se ejecuta por separado contra una base desechable. Los componentes no requieren CDN ni fuentes remotas.

## Operación y alcance

- Copia de seguridad: `pg_dump -h 127.0.0.1 -U umss -d informes_umss -Fc -f informes_umss.dump`. Conserve también el Word fuente y las variables de entorno de forma privada.
- Los adjuntos son descripciones de texto; no hay carga de archivos.
- Desactivar materiales mantiene disponibles sus referencias históricas. Para retirar uno del selector, desmárquelo como activo.
- La interfaz permite gestionar una plantilla institucional configurable. No incluye diseñador visual de múltiples plantillas.
- No incluye firma digital ni circuito de aprobación por jefatura. El jefe puede consultar el historial.
- Para dos usuarios en la misma red, una computadora de la oficina puede alojar la aplicación sin Proxmox ni un servidor dedicado; consulte la [guía de intranet](../frontend/deploy/README.md). El acceso remoto necesitaría una VPN o un despliegue distinto.
