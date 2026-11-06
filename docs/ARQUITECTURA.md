# Arquitectura y operación

## Componentes

React + TypeScript construidos con Vite. Servidor Node/Express como intermediario de sesión y adaptador de contratos; no es un reemplazo del backend Spring. Zod valida entrada en servidor y formularios. Leaflet representa el mapa. Vitest/Supertest cubren reglas y límites de acceso; Playwright y axe revisan los flujos y accesibilidad.

El navegador utiliza únicamente `/admin-api` del mismo origen. El intermediario llama al backend por HTTPS con Bearer. El token nunca se serializa en respuestas ni se almacena en localStorage. Los borradores sí usan localStorage con una clave por usuario: son datos de preparación, no datos oficiales ni una base compartida.

## Sesión

- ID criptográfico aleatorio de 256 bits, cookie HttpOnly + SameSite=Strict.
- En producción: cookie Secure con prefijo __Host-, ruta / y sin dominio.
- Token y fecha del backend guardados solo en memoria del proceso; expiración máxima adicional de ocho horas.
- Revalidación con GET /users/me antes de cada operación; renovación cerca de expiración mientras el token siga vigente.
- Protección de origen para todas las escrituras, incluyendo login y logout; rutas permitidas explícitamente y DTO estrictos.
- Límite de intentos de acceso; cuerpos limitados a 128 KB; timeouts; no se registran contraseñas ni tokens.
- CSP, cabeceras Helmet y respuestas API no almacenables en caché. Cartografía externa limitada a OpenStreetMap.

Reiniciar Node cierra las sesiones. Este diseño permite una instancia; para varias instancias se necesita sustituir el almacén de memoria por uno compartido con TTL, por ejemplo Redis. Los límites de acceso también deben compartirse. No hay promesa de escalado horizontal automático.

## Producción

1. `npm ci`, `npm test`, `npm run build`.
2. Configurar `.env` con `NODE_ENV=production`, `APP_ORIGIN=https://<dominio-real>` y BACKEND_URL HTTPS.
3. Ejecutar `npm start` con supervisión de proceso. Node escucha solo en loopback 4174.
4. Colocar un proxy HTTPS delante del proceso. No publicar el puerto interno directamente.
5. Ajustar la política de IP del limitador si se despliega tras proxy: la configuración predeterminada no confía en cabeceras reenviadas. Solo se debe habilitar confianza en proxies controlados, nunca indiscriminadamente.
6. Ejecutar aceptación real con ADMIN, verificar estado/suspensión y medir cargas. Validar además en Chrome y Firefox.

`npm start` requiere `tsx`, declarado como dependencia de ejecución. Vite y herramientas de pruebas son dependencias de desarrollo. El panel no es desplegable mediante hosting estático únicamente.

## Diseño

Se usan los assets originales del frontend Flutter, sin crear imágenes nuevas. Verde profundo, lima y vidrio con gradientes de borde y desenfoque localizado. Las superficies de lectura tienen mayor opacidad. Se contempla preferencia de movimiento reducido y transparencia reducida, navegación por teclado, diálogos nativos y foco visible. No se carga tipografía desde terceros.

## Referencias técnicas

- https://vite.dev/guide/
- https://expressjs.com/en/advanced/best-practice-security/
- https://leafletjs.com/reference-1.9.4.html

## Límites operativos

La búsqueda sobre endpoints sin filtros recorre páginas completas, con un máximo explícito de 20.000 registros. No se truncan resultados silenciosamente. Para volúmenes mayores o cumplir tiempos estrictos de respuesta, el backend debe incorporar búsqueda y filtros indexados.

La comprobación previa de especie sin especímenes no es una garantía transaccional frente a otros clientes. Las restricciones de integridad deben residir en la base de datos/backend.
