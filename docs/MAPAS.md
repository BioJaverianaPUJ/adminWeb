# Mapas del campus

## Bloqueo OSM corregido

Helmet usaba su valor predeterminado no-referrer, incompatible con las solicitudes web a OSM. Se establece strict-origin-when-cross-origin tanto en el servidor como en las imágenes de Leaflet. No se falsifica User-Agent, no se agrega un proxy ni se cambian URLs para eludir bloqueos. Se conservan el caché normal del navegador y las atribuciones.

Reiniciar el administrador y volver a cargar la página para aplicar la política. Un bloqueo de red o una respuesta antigua almacenada puede requerir otra comprobación; no se garantiza el desbloqueo externo solo por cambiar el código.

## Estilo claro CARTO Positron

CARTO exige una clave Basemaps: https://carto.com/basemaps/apikey/ . Usar una clave pública de mapas restringida a los orígenes autorizados, nunca un token privado de cuenta.

Web: establecer VITE_CARTO_BASEMAP_KEY en .env y reiniciar el servidor de desarrollo; para dist, volver a compilar.

Móvil: compilar con --dart-define=CARTO_BASEMAP_KEY=CLAVE_PUBLICA . El proveedor debe autorizar también el uso móvil.

Con clave se utiliza rastertiles/light_all (Positron), con créditos OSM y CARTO. Sin clave continúa OSM; el nuevo estilo no se declara activo. No hay conmutación automática a otro proveedor si CARTO rechaza una clave.

Políticas: https://operations.osmfoundation.org/policies/tiles/ y https://www.carto.com/basemaps/ .

## Activación local — 2026-11-05

Clave pública Basemaps recibida y guardada en .env (excluido del repositorio). Web compilada con Positron. Móvil configurado mediante config.local.json, también excluido, y --dart-define-from-file. Una tesela del campus respondió HTTP 200 y se inspeccionó visualmente sin marca de bloqueo. Las claves públicas de mapas se incluyen en los clientes compilados: las exclusiones evitan publicarlas en el código fuente, no las convierten en secretos.

El servicio es una dependencia externa con cuota compartida por cuenta; consultar el consumo desde CARTO. Si se alcanza la cuota o falla el proveedor, mostrar la indisponibilidad del fondo sin inventar datos ni cambiar automáticamente a un servicio ajeno. La activación de planes pagos requiere una decisión del equipo.
