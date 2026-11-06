# Integración SRS v0.3 — 5 de noviembre de 2026

## Base de la revisión

Documento: SRS v0.3.pdf, 58 páginas. Backend: BioJaverianaPUJ/backend, origin/main 8100f3c (PR #6, reconocimiento), comparado con 8e9c221. Se revisaron controladores, DTO, servicio de observaciones, trabajos, consumidor de respuestas, almacenamiento y cambios de autenticación. No se modificó ni se desplegó el backend. La revisión de código no demuestra que el servidor público tenga ese mismo commit desplegado.

## Implementado en esta revisión

- Móvil: listado propio paginado de observaciones; consulta de trabajos pendientes/fallidos; captura -> URL firmada -> PUT de imagen -> creación asíncrona con waitTimeoutSeconds=0; consulta posterior del resultado y solicitud de revisión.
- El PUT al almacenamiento no contiene el token de la aplicación y no sigue redirecciones. No hay reintentos automáticos del POST de creación, para evitar duplicados tras una respuesta incierta.
- Comprobación local de pertenencia al polígono, precisión y espera de cinco minutos desde la observación más reciente. Estas comprobaciones NO sustituyen la validación atómica del servidor.
- Estados de procesamiento diferenciados. checked=true significa reconocimiento procesado, no verificación oficial. No se otorgan insignias de verificación a partir de ese booleano. La certeza se presenta como porcentaje solo cuando está en el intervalo 0..1; debe formalizarse su unidad en el contrato.
- Botones de eliminar, reenviar y publicar observaciones no se habilitan si sus servicios no existen.
- Admin: GET autenticado /observations/admin, paginación y filtro revisionRequested, detalle con fotografía, ubicación y puntuación del modelo. La revisión es de consulta, no cambia la especie ni la verificación.
- Mapa móvil: observaciones propias de animales cargadas de manera independiente de zonas; controles de capas plegables; tonos moderados, perímetro, exterior atenuado, agrupación de especímenes cercanos con contadores y botón para centrar el campus.
- Mapa web: mismo perímetro de referencia y exterior atenuado; encuadre corregido tras medir el contenedor, sin marcadores de vértices en vista de consulta. Los vértices se muestran al editar.
- Perfil: tarjeta de experiencia independiente del feed. XP procede exclusivamente del repositorio de progreso; no se asignan puntos locales. Nivel calculado conforme a RF-36, insignia, barra y XP restantes. Fallar las publicaciones no oculta la experiencia.

## Perímetro y procedencia

Fuente: https://www.openstreetmap.org/way/40739535, versión 40, consultada 2026-11-05. 125 vértices únicos y cierre en GeoJSON; coordenadas GeoJSON en orden longitud, latitud. Licencia ODbL: https://www.openstreetmap.org/copyright. Se preservan fuente, fecha y atribución en assets/campus-reference.geojson (móvil) y public/assets/campus-reference.geojson (web).

Es una referencia cartográfica del campus de Bogotá, incorporada a petición del usuario. No se presenta como delimitación oficial aprobada por la universidad. El administrador puede crear una copia editable y exportarla. Los cambios guardados en su navegador no se sincronizan al móvil: faltan los servicios de publicación del perímetro. La validación móvil utiliza la referencia incluida en la compilación; deberá sustituirse por el perímetro versionado publicado por el servidor.

## Contratos nuevos conectados

| Operación               | Ruta bajo /api/v1                                   | Particularidad                                                  |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Autorizar fotografía    | POST /observations/upload-presign                   | contentType; retorna key, url, method, contentType, expiresAt   |
| Subir fotografía        | PUT a url firmada                                   | sin Authorization; mismo Content-Type                           |
| Crear trabajo           | POST /observations                                  | referencePictureKey, latitude, longitude, waitTimeoutSeconds: 0 |
| Estado                  | GET /observations/{observationId}/job-status        | el identificador es de observación, no jobId                    |
| Historial propio        | GET /observations?page&size                         | totalPages y totalElements en raíz, distinto del catálogo       |
| Solicitar revisión      | POST /observations/{id}/revision-request            | requiere checked; conserva resultado                            |
| Consulta administrativa | GET /observations/admin?page&size&revisionRequested | exige ADMIN; se consume mediante BFF                            |

## Matriz de alcance del SRS

Esta matriz no declara cumplimiento integral ni certifica reglas que solo se pueden probar en el servidor.

| Requisitos     | Situación                                                                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-01,02,04,06 | Registro, login y separación de roles ya conectados. Mantener pruebas contra despliegue.                                                                                                                                             |
| RF-03          | Política pendiente del documento aprobado y de persistencia de aceptación/fecha; se conserva la decisión anterior del usuario de dejar la opción preparada.                                                                          |
| RF-05          | Móvil renueva token; admin tiene sesión en memoria con máximo de 8 horas. Persistencia independiente de dos semanas en web requiere ajuste de almacenamiento de sesiones y política compartida. No cumple todavía el plazo completo. |
| RF-07,08       | Permisos y captura exclusiva de cámara existentes.                                                                                                                                                                                   |
| RF-09..13      | Nuevo envío, historial y trabajos conectados. Validaciones geográficas y cooldown solo preventivos en cliente; el servidor no los impone.                                                                                            |
| RF-14          | Pendiente estado de verificación explícito y reglas 95% / 20 m en backend. checked no es sustituto.                                                                                                                                  |
| RF-15          | Publicar observación pendiente del feed.                                                                                                                                                                                             |
| RF-16,17       | Solicitud de revisión e historial conectados; contrato de verificación incompleto.                                                                                                                                                   |
| RF-18          | No hay DELETE de observación ni borrado de imagen expuesto.                                                                                                                                                                          |
| RF-19,21,23    | Perímetro de referencia, ubicación, animales propios y capas en móvil.                                                                                                                                                               |
| RF-20          | Especímenes y detalles existentes; imágenes de referencia GBIF siguen pendientes.                                                                                                                                                    |
| RF-22          | Zonas oficiales y asociaciones requieren servicios ausentes.                                                                                                                                                                         |
| RF-24..29      | Feed, publicaciones, comentarios, likes y denuncias siguen sin contratos backend.                                                                                                                                                    |
| RF-30..35,37   | Misiones, logros, visitas y dato diario requieren backend. Se mantienen pantallas y borradores, sin premios ficticios.                                                                                                               |
| RF-36,38       | Experiencia y nivel preparados en perfil; falta XP autoritativo y logros/publicaciones.                                                                                                                                              |
| RF-39,40       | Edición de datos e imágenes existente; restricciones temporales de username y cambio de contraseña necesitan contrato/validación del servidor.                                                                                       |
| RF-41          | Borrado de cuenta propia y cascadas no disponibles.                                                                                                                                                                                  |
| RF-42..45      | Catálogo conectado. Alta/cambios geográficos de especímenes y eliminación con asociados continúan protegidos por ausencia de validación geográfica/deduplicación/cascada.                                                            |
| RF-46          | Consulta administrativa de revisiones conectada ahora.                                                                                                                                                                               |
| RF-47..51      | Edición de borradores de zonas, misiones, logros y curiosidades; falta persistencia remota.                                                                                                                                          |
| RF-52..54      | Reportes y moderación de contenido sin endpoints. Las acciones existentes sobre usuarios se conservan.                                                                                                                               |
| RF-55,56       | Consulta de usuarios y promoción existentes; DTO no expone estado de suspensión y falta protección atómica del último admin.                                                                                                         |
| RF-57,58       | Delineado de referencia editable/exportable; falta publicación y validación geográfica oficial en backend.                                                                                                                           |
| RF-59          | Frontends reaccionan a sesión denegada; comprobar revocación/suspensión en despliegue.                                                                                                                                               |

## Hallazgos concretos para el backend

1. ObservationService.createObservation no verifica pertenencia al campus ni cooldown. Debe hacerlo en servidor antes de crear/enviar el trabajo.
2. referencePictureKey no se valida como propiedad del usuario ni se confirma la subida antes de crear la observación, aunque existe confirmUpload. Validar propietario, existencia, tipo y tamaño.
3. ObservationMessageConsumer marca checked=true al recibir success sin contraste 95%/espécimen a 20 m. Añadir estado de verificación independiente del estado del trabajo.
4. La lista de observaciones no incluye estado del job. El cliente consulta cada elemento sin checked para distinguir fallidos de pendientes; conviene devolver jobStatus en el listado para evitar solicitudes adicionales.
5. El consumidor incrementa reintentos pero solo deja PENDING con un comentario sobre republicación futura. No se encontró implementación de republicación en los cambios revisados. Probar recuperación real de errores.
6. Faltan operaciones de reenvío y eliminación, además del contrato de experiencia. El DTO UserResponse no incluye XP ni nivel.
7. El perímetro debe publicarse con versión y aplicarse también a especímenes/zonas. Exportación GeoJSON disponible para usar como base de revisión.

## Pruebas y límites

Pruebas automatizadas usan datos aislados, no crean cuentas ni observaciones en producción. Se verifican paginación raíz, autorización, PUT sin bearer/redirección, trabajos fallidos, distinción reconocimiento/verificación, cooldown, contención del campus y umbrales de nivel. Las pruebas web cubren navegación y perímetro editable; se inspeccionó una captura con teselas reales de OSM cargadas.

Queda por probar en un teléfono con una cuenta real: permisos, precisión GPS, subida firmada al almacenamiento y respuesta completa de la cola/modelo desplegado. No se ha probado la identificación real de una especie ni la concesión real de XP.

## Cómo probar

Móvil (PowerShell, Android conectado y autorizado):

```powershell
& "D:\dev\android\platform-tools\adb.exe" install -r "D:\Universidad Javeriana\Proyecto Final\biojaveriana\flutter_app\build\app\outputs\flutter-apk\BioJaveriana-1.0.3.apk"
```

Abrir Mapa, comprobar contorno, agrupaciones y capas. En Cámara, usar una captura dentro del campus y una cuenta real; consultar resultado y Mis observaciones. En Perfil, experiencia pendiente es el estado correcto hasta que exista su servicio.

Administrador:

```powershell
cd "D:\Universidad Javeriana\Proyecto Final\BioJaverianaAdminWeb"
.\iniciar-admin.bat
```

Abrir http://localhost:5173 con una cuenta ADMIN. Catálogo > Solicitudes de revisión consulta el backend; Zonas del campus > Límite del campus muestra la referencia y permite editar una copia local.
