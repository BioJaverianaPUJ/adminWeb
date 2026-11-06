# Verificación de entrega

Fecha: 4 de noviembre de 2026.

- TypeScript estricto y compilación Vite verificados.
- 19 pruebas unitarias/de servidor: DTO, recompensas, fechas, imágenes, geometría, origen, sesión, roles, rutas, protección de administradores y escritura de especies.
- 4 flujos Playwright en Edge: acceso/catalogo/alta/cierre, zonas y misiones como borradores sin llamadas de escritura, gestión de usuarios/pantalla pequeña, accesibilidad de login y catálogo.
- axe sin infracciones detectadas de WCAG 2 A/AA y WCAG 2.1 AA en las dos pantallas comprobadas. Esto no equivale a una certificación de accesibilidad de todo el producto.
- Capturas revisadas: login, catálogo escritorio, editor geográfico, comunidad y catálogo a 390 px.
- Dependencias instaladas con lockfile; npm audit no reportó vulnerabilidades en la instalación.

Las pruebas de integración usan dobles del backend. No se crearon, editaron ni eliminaron datos del despliegue real. Faltan aceptación con ADMIN real, prueba de todas las operaciones en staging, Chrome/Firefox, medidas de rendimiento y revisión de despliegue HTTPS.
