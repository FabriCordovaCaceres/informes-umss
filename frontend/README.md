# Frontend · Sistema de Informes Técnicos

Aplicación Angular con renderizado SSR, editor de informes, catálogo de materiales, gestión de usuarios y vista previa A4.

La descripción del proyecto, instalación y pruebas están en el [README principal](../README.md). Las instrucciones de operación están en [despliegue en intranet](deploy/README.md) y [Windows 10](deploy/windows-10.md).

```bash
npm ci
npm start
```

Abra http://localhost:4200 después de iniciar PostgreSQL y la API del backend. El proxy de desarrollo envía las solicitudes `/api` a http://localhost:3000.
