> Actualización 2026-11-05: consulta [la revisión del SRS v0.3](docs/INTEGRACION_SRS_V03.md) para la conexión de observaciones, perímetro de referencia y pendientes del backend.

# BioJaveriana Admin Web

Módulo web independiente de la aplicación Flutter. Administra el mismo backend de BioJaveriana mediante un servidor intermediario que mantiene los tokens fuera del navegador.

## Abrir en desarrollo

Requisito: Node.js 22.12 o posterior. En PowerShell:

```powershell
cd adminWeb
npm.cmd ci
npm.cmd run dev
```

Abre **http://localhost:5173**. Es importante usar `localhost` y no `127.0.0.1` en la barra del navegador: la protección de origen compara con `APP_ORIGIN`.

La API intermediaria escucha en `127.0.0.1:4174`; Vite redirige `/admin-api` hacia ella. La URL del backend ya tiene como valor predeterminado `https://biojaveriana.downloadablefox.dev/api/v1`. No hay que editar código para conectarlo. Para cambiar la configuración, copia `.env.example` como `.env` y ajusta los valores. No subas `.env` a Git.

Entra con una cuenta **ADMIN ya existente**. No se crean cuentas, claves predeterminadas ni administradores desde este proyecto. Una cuenta USER no puede acceder. No se han ejecutado escrituras contra la base de datos desplegada durante el desarrollo.

## Qué está implementado

- Interfaz en español, cuatro secciones, búsqueda, paginación, formularios, detalles y confirmaciones.
- Estética verde y lima, vidrio, ilustraciones originales, navegación lateral y adaptación a pantallas pequeñas.
- Especies: consulta, búsqueda por nombres, familia, alta y edición con DTO real; eliminación protegida cuando tiene especímenes.
- Especímenes: consulta, filtros por especie/familia, mapa, detalles, edición de atributos y eliminación. El alta y los cambios de ubicación se preparan en formulario, pero están bloqueados mientras faltan las garantías geográficas del backend.
- Usuarios: consulta, filtro por rol, detalle, promoción a ADMIN, suspensión, reactivación y eliminación de cuentas USER. Todas las acciones sensibles piden confirmación.
- Zonas verdes, zonas de interés y límite del campus: editores de **borradores locales**, con mapa, puntos, círculos convertibles en polígonos, vértices arrastrables y coordenadas editables por teclado.
- Misiones, logros y datos curiosos: borradores con validación de recompensas, eventos, objetivos, zona opcional y hasta cinco imágenes.
- Borradores: ver, editar, eliminar y exportar JSON. Se guardan en este navegador, separados por usuario; no se publican ni aparecen en el móvil. Las imágenes locales tienen un límite de 1 MB cada una para no agotar el almacenamiento del navegador.
- Consulta de observaciones y solicitudes de revisión conectada al backend. La resolución de revisiones y las denuncias siguen pendientes de servicios.

## Lo que impide completar el SRS de extremo a extremo

El repositorio del backend revisado aún no implementa todos los requisitos. **Este panel no convierte esos requisitos en servicios existentes.** Consulta [la matriz de requisitos](docs/REQUISITOS.md) y [las dependencias del backend](docs/BACKEND.md).

En particular: no hay persistencia remota de zonas/gamificación, denuncias ni resolución de revisiones; no se devuelve estado de cuenta; faltan límite del campus, deduplicación atómica de especímenes, eliminación en cascada de especies y protección transaccional del último administrador. No se simulan éxitos para estas funciones.

## Estructura

```text
src/
  app/                  Sesión, navegación y composición
  components/           Componentes de vidrio, formularios, diálogos y mapa
  features/
    auth/               Acceso administrativo
    catalog/            Especies y especímenes
    community/          Usuarios y moderación
    drafts/             Preparación de zonas y gamificación
  lib/                  Cliente HTTP y consultas paginadas
  styles/               Diseño adaptable y accesibilidad
server/                 Sesión HTTP y adaptador del backend
shared/                 Tipos, validación y geometría
public/assets/          Marca e ilustraciones originales
tests/unit/             Reglas de negocio y geometría
tests/server/           Autenticación y operaciones del servidor
tests/e2e/             Flujos de navegador y accesibilidad
docs/                   Requisitos, integración y arquitectura
```

## Comprobar

```powershell
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run format:check
```

Las pruebas de navegador usan Edge instalado en Windows. En otros sistemas ejecuta `npx playwright install chromium` antes de correrlas. Los tests usan datos ficticios y no escriben en el servidor real. Las capturas de `test-results` no son datos productivos.

## Ejecutar compilado

```powershell
npm.cmd run build
npm.cmd start
```

En desarrollo, `npm start` sirve el compilado en el puerto 4174: configura `APP_ORIGIN=http://localhost:4174` en `.env` para ese modo. Para publicación usa HTTPS, `NODE_ENV=production` y el origen real. Lee [Arquitectura](docs/ARQUITECTURA.md) antes de desplegar. No es una web puramente estática: necesita su proceso Node para la sesión protegida.
