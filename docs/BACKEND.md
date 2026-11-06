# Contratos y pendientes del backend

Repositorio: https://github.com/BioJaverianaPUJ/backend
Revisión: `8e9c221488b5182ff6daec327226f68761a7ad19`.
URL predeterminada: `https://biojaveriana.downloadablefox.dev/api/v1`.

## Contratos consumidos

| Operación      | Contrato                                                                          |
| -------------- | --------------------------------------------------------------------------------- |
| Acceso         | POST /auth/login: email, password; devuelve token y expiresIn (fecha ISO)         |
| Renovación     | POST /auth/refresh-token con Bearer vigente                                       |
| Usuario actual | GET /users/me; se comprueba role ADMIN                                            |
| Listados       | GET /species, /specimens, /users con page y size; content + pagination            |
| Detalles       | GET /species/{id}, /specimens/{id}, /users/{id}                                   |
| Especies       | POST /species; PATCH y DELETE /species/{id}                                       |
| Especímenes    | PATCH y DELETE /specimens/{id}; formulario de POST preparado, escritura bloqueada |
| Cuentas        | PATCH /users/{id}: role o enabled; DELETE /users/{id}                             |

El formulario de especie usa scientificName, commonName, family, woodDensity. Especímenes usan speciesId al crear, latitude, longitude, circumference, height, healthStatus, notes, observationDate. PATCH no admite speciesId. Se conserva esa restricción.

`UserUpdateRequest` declara firstName y lastName, pero `UserService.updateById` no los aplica. El panel no presenta una edición que prometa guardar esos campos. `UserResponse` carece de enabled/deactivated: el panel no puede conocer el estado actual ni filtrarlo. Suspender/reactivar son órdenes explícitas y confirmadas.

## Cambios requeridos en el backend

1. Devolver estado de cuenta y habilitar filtros de rol/estado/búsqueda paginados.
2. Proteger transaccionalmente la última cuenta ADMIN al despromover o eliminar. La protección del panel no sustituye esta regla para otros clientes.
3. Crear contratos CRUD de zonas y límite oficial, con polígonos geográficos y validación de contención en servidor.
4. Deduplicar especímenes por especie y ubicación mediante restricción/operación atómica; validar RF-58 en creación y actualización.
5. Garantizar eliminación de especie y especímenes en una sola transacción. El código actual no muestra la cascada requerida.
6. Implementar misiones/logros/datos curiosos, imágenes, asociaciones de zonas, reglas de asignación y propagación.
7. Exponer revisión de observaciones no verificadas solicitadas por usuarios.
8. Implementar denuncias, estados no revisada/revisada/descartada, transiciones y eliminación condicionada; retirar publicaciones/comentarios denunciados.
9. Probar invalidación de sesiones suspendidas en todos los endpoints y clientes.

No se inventaron URLs para esas funciones. Los modelos `Draft` son modelos de preparación locales, no DTO oficiales. Al acordar contratos: añadir adaptadores, activar guardado remoto, migrar/importar borradores mediante validación y agregar pruebas de contrato. No activar escrituras de coordenadas solo quitando una condición del frontend.

## Revisión y aceptación

No se modificó el repositorio backend ni se ejecutaron operaciones de escritura sobre el despliegue. El código está conectado al endpoint configurado, pero las pruebas automatizadas usan un backend simulado. Se necesita una cuenta ADMIN y un entorno de pruebas con datos descartables para certificar integración real, cascadas y suspensión.
