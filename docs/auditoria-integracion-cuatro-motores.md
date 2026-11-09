# Auditoría de integración de ALBA Suite

Fecha: 2026-11-09. Rama: `fix/I3-09-auditoria-integracion`. Alcance: funcionalidad y seguridad; **sin rediseño**.

## Resultado y límites

Se verificaron altas en los cuatro motores, recuperación desde las otras tres instituciones y persistencia tras reiniciar realmente el proceso Node del backend de pruebas. PostgreSQL, MongoDB y MariaDB se ejecutaron como motores reales en contenedores desechables; Firestore se ejecutó en el emulador oficial, con el Admin SDK real. **No se verificaron las instancias de producción de Atlas, Supabase, Firebase ni MariaDB remota.** No se leyeron archivos de entorno ni certificados y no se escribieron datos en esas instancias.

La federación mantiene los expedientes en su origen. No fusiona personas por coincidencia de documento ni copia historiales. Las consultas clínicas de otra institución siguen restringidas: las fichas compartidas muestran únicamente la identidad y los metadatos ya autorizados. El sistema no se declara completo al 100%.

## Hallazgos y correcciones

| Gravedad | Problema reproducido | Corrección |
|---|---|---|
| Crítica | Hospital aceptaba JWT inválidos, caducados o sin firma verificada y asignaba un administrador a visitantes anónimos | Verificación HS256, expiración obligatoria y rechazo de usuarios sin identidad verificada |
| Crítica | Login de Hospital emitía tokens con cualquier contraseña | Solo cuentas provisionadas con hash scrypt; sin configuración responde 503 |
| Crítica | Laboratorio aceptaba usuarios inventados con contraseñas demo y exponía rutas sin autenticación | Eliminación de cuentas implícitas, JWT e institución obligatorios en pacientes y operaciones especializadas |
| Alta | Hospital y Laboratorio comunicaban éxito después de fallar el backend | Estado local y mensajes de éxito solo después de confirmación HTTP; se conservan formularios ante errores |
| Alta | El portal principal de Pediatría registraba pacientes y consultas solo en memoria | Conexión de las pantallas existentes a la API; eliminación de pacientes, vacunas y mediciones iniciales inventados |
| Alta | La red pediátrica fabricaba resultados cuando fallaba la API | Sin fallback clínico; errores explícitos y lectura del historial mediante el endpoint autorizado |
| Alta | MongoDB buscaba consultas por un expediente ausente, mezclando pacientes sin expediente | El criterio por expediente solo se incluye cuando existe; comprobado con MongoDB real |
| Alta | Hospital no persistía las ediciones | PATCH local validado, escritura en MongoDB y lectura tras reinicio; extensión propuesta en ADR 0002 |
| Alta | Una edición parcial podía aplicar valores predeterminados de Zod a campos omitidos | Esquema de edición sin defaults; prueba que editar teléfono no cambia otros campos |
| Alta | MariaDB podía aceptar el contenido de `password_hash` como contraseña y no verificaba certificados TLS por defecto | Eliminación de comparación directa y `rejectUnauthorized: true` por defecto al usar TLS |
| Media | Archivado sin justificación generaba un motivo automático | Justificación explícita validada; identidad y estado no pueden cambiarse mediante edición |
| Media | UI de Laboratorio usaba documento como ID interno y no recuperaba resultados de órdenes al recargar | Uso del ID confirmado y carga de muestras y resultados persistidos |
| Media | Validación de resultados permitía identidad de validador enviada por cliente | Actor tomado del JWT; validar/corregir exige validador o administrador |
| Media | Las órdenes podían referir pacientes no persistidos o archivados | Verificación local en application; resultados referidos a orden y muestra existentes; demografía tomada del paciente local |
| Media | Algunos indicadores anunciaban conexión sin haber consultado el servidor | Estados de carga/error reales; controles demo y operaciones sin endpoint identificados como no disponibles |
| Operativa | CI fusionaba automáticamente PR Open | Excepción probada para esta rama: solo diagnóstico y revisión manual |

Las primeras pruebas nuevas reprodujeron 10 fallos de autenticación y 5 fallos de persistencia del frontend antes de corregirlos. La prueba de edición parcial detectó posteriormente otro fallo real y evitó publicar una validación que borraba campos omitidos.

## Evidencia por institución

| Institución | Evidencia ejecutada | Alcance |
|---|---|---|
| Hospital / MongoDB 7 | Alta, consulta, edición, archivo, reconexión, separación de dos pacientes sin expediente; HTTP desde las otras tres instituciones; edición recuperada tras reinicio de Node | Motor real desechable; no Atlas |
| Odontología / PostgreSQL 16 | Alta e historial automático, tutor, contacto, agenda, diagnóstico, tratamiento, receta, odontograma, finalización, archivo, RLS y rollback ante FK inválida; búsqueda y ficha desde las otras tres instituciones tras reinicio | Motor real desechable; no Supabase |
| Laboratorio / Firestore | Alta, edición, archivo, órdenes y lectura con adaptador reconstruido; búsqueda y ficha desde las otras tres instituciones tras reinicio; reglas de muestras/resultados y autorización mediante pruebas aisladas | Emulador oficial con Admin SDK; no Firebase de producción. El flujo completo de resultados especializados no se considera probado contra Firebase real |
| Pediatría / MariaDB 11 | Alta, tutor, consulta, archivo y rollback de atención completa ante medicamento inexistente; búsqueda y ficha desde las otras tres instituciones tras reinicio; crecimiento/vacunas con pruebas unitarias e integración aislada | Motor real desechable; crecimiento/vacunas del portal principal aún requieren validación manual contra catálogos desplegados |

Pruebas principales:

- `tests/integration/redCuatroMotoresDesechables.test.js`: cuatro orígenes × tres destinos, tokens firmados, lecturas de ficha reducida, dos reinicios completos de un proceso Node separado, edición de Hospital/Laboratorio, rechazo de sustitución de identidad, accesos anónimos y escrituras cruzadas. Incluye apagar el contenedor MongoDB y comprobar que los otros tres motores siguen consultables.
- `tests/integration/motoresDesechables.test.js`: drivers reales, persistencia, separación de historiales, tutor y rollback.
- `tests/integration/odontologiaPostgresDesechable.test.js`: persistencia SQL, odontograma, transacciones, RLS y permisos mínimos.
- `tests/contract/contrato.test.js`: suite común de contrato con dobles en memoria para los cuatro adaptadores y MockAdapter. **No equivale a probar cinco motores reales.**
- `seguridadIntegral`, `persistenciaFrontend`, `pediatriaPersistenciaFrontend`, `pacientesLocalesValidacion` y `validarPacienteLaboratorio`: regresiones de seguridad, errores HTTP y mutaciones confirmadas.
- `consultaRedFrontend`: DOM real de jsdom, conservación del modal y botón de cierre, clase de tabla existente, errores de API y escape de contenido de pacientes.
- `disenoExistente`: huellas de los **30 archivos HTML/CSS** existentes en la base de la rama. Todos permanecen íntegros. No se alteraron colores, fuentes, logotipos, distribución ni hojas CSS. No se realizó una comparación de capturas en navegador real; jsdom no verifica píxeles.

## Validaciones

La suite estándar omite explícitamente las cinco pruebas que necesitan contenedores. Se ejecutaron por separado con sus banderas; la omisión normal no se presenta como evidencia de persistencia.

- `npm run lint`: aprobado.
- `npm test`: **469 aprobadas; 5 omitidas explícitamente por requerir contenedores** (49 archivos aprobados y 3 omitidos). Las cinco se ejecutaron además en la suite desechable.
- `npm run verificar:aislamiento`: aprobado; este script usa repositorios simulados y verifica la caída aislada de MariaDB. La prueba desechable de red cubre por separado una caída física de MongoDB.
- `npm run skills:check`: aprobado.
- `git diff --check`: aprobado antes de publicar.
- Suite desechable: **5/5 aprobadas en 3 archivos**, ejecutadas separadamente; duración de la ejecución con caída física: 31,23 s.

En el sandbox, los forks de Vitest inicialmente devolvieron `spawn EPERM`; las pruebas con `--pool=threads --maxWorkers=2` funcionaron. Después se ejecutó el comando exacto `npm test` con permisos para iniciar sus procesos. Docker también necesitó ejecución fuera de la restricción del pipe local. No se concedieron permisos sobre bases externas.

## Acceso y puesta en servicio

Hospital requiere `HOSPITAL_AUTH_USUARIOS`; Laboratorio requiere `LABORATORIO_AUTH_USUARIOS`. Ambas son configuraciones privadas del servidor, junto con `JWT_SECRET`. El operador debe provisionarlas mediante su gestión de secretos, sin incorporarlas al repositorio.

Cada variable contiene un arreglo de cuentas `{ id, usuario, rol, passwordHash }`. `passwordHash` tiene formato `scrypt$<sal hexadecimal>$<derivación hexadecimal de 64 bytes>`. La derivación usa scrypt de Node con la sal como texto hexadecimal y los parámetros predeterminados. No hay contraseña por defecto. La auditoría no creó cuentas reales ni modificó archivos de configuración privados.

La matriz de lectura federada conserva `redJwt` y `historialVisibleEnRed`: Hospital administrador; los dos roles odontológicos; los cuatro roles de Laboratorio; y los tres roles pediátricos pueden consultar identidad reducida. **Ningún rol obtiene notas clínicas ajenas.** La validación técnica de resultados de Laboratorio exige validador/admin; las escrituras especializadas rechazan instituciones distintas de Laboratorio. Los roles locales de Odontología y Pediatría conservan sus verificaciones existentes.

## Pendientes y bloqueos explícitos

1. Aprobación de I3 para la extensión HTTP de edición local: [ADR propuesto 0002](./decisiones/0002-edicion-local-pacientes.md). No se modificó el puerto compartido. El PR debe permanecer sin fusionar hasta su revisión.
2. Compartir diagnósticos, notas o resultados clínicos entre instituciones necesita una decisión de confidencialidad y aprobación del equipo. No se implementó un historial clínico global que eluda las proyecciones existentes.
3. No existe comprobación de identidad externa ni consentimiento persistido. Se muestran coincidencias separadas por institución; nunca se deduce que dos documentos iguales representan a una persona verificada.
4. Falta validar las cuatro conexiones de producción mediante el procedimiento autorizado, sus cuentas provisionadas, IAM de Firestore, certificados y catálogos. El emulador no verifica IAM de producción.
5. La atención del portal pediátrico y el formulario compuesto de Laboratorio usan varios endpoints: un paso posterior fallido puede dejar pasos previos confirmados. Se informa el fallo parcial y se recargan los datos; no se declara una transacción distribuida. MariaDB sí dispone de una operación atómica de atención completa en el adaptador, probada con rollback, cuya exposición HTTP requiere revisión de contrato.
6. Hospital dispone de métodos clínicos en su adaptador, pero sus rutas HTTP heredadas no exponen un flujo completo de nueva consulta/diagnóstico/tratamiento/receta. No se declara completo ese recorrido desde su portal. Las rutas actuales de Laboratorio tampoco convierten automáticamente órdenes especializadas en consultas del historial común.
7. La edición de pacientes de Pediatría y la edición de metadatos de órdenes/muestras de Laboratorio carecen de endpoints aprobados. Los controles existentes que no pueden persistirse se identifican como no disponibles; no se simula éxito.
8. Los listados conectados de Laboratorio/Pediatría cargan hasta 100 pacientes por consulta inicial. La navegación completa de grandes volúmenes y la protección de doble envío en todos los formularios heredados quedan por completar.
9. La suite común aún tolera alias heredados del mapper Mongo y representaciones distintas de archivo en los DTO de paciente. Se mantuvieron los campos existentes para evitar un cambio contractual unilateral. Su retirada requiere una revisión conjunta de Zod, mappers y contrato.

## Archivos y alcance del PR

Las correcciones se concentran en los estados y controladores JS de Hospital, Laboratorio y Pediatría, los clientes API compartidos, la autenticación HTTP, los adaptadores Mongo/Firestore y la configuración TLS de MariaDB. Odontología conserva su implementación visual y sus componentes.

Las rutas y validadores modificados están en `src/interfaces/http/`; el caso de uso de validación de pacientes de Laboratorio está en `src/application/useCases/validarPacienteLaboratorio.js`. Las pruebas, ejemplos, ADR y bitácora acompañan las correcciones. El listado exacto de archivos es el diff del PR.

Se conservaron e integraron los cambios locales previos de sesión de Hospital, Laboratorio y los clientes compartidos, junto con su prueba de sesión. `artifacts/` y los archivos personales no forman parte del PR. No se realizaron reset, clean, migraciones reales, cambios de RLS ni push directo a main.

La descripción revisable del PR está en [pr-auditoria-integracion-cuatro-motores.md](./pr-auditoria-integracion-cuatro-motores.md). La revisión automática de permisos rechazó publicar la rama en `origin` por no considerar explícitamente autorizado el destino y el contenido. No se intentó sortear ese rechazo: los commits quedan locales hasta recibir autorización específica para `Dom-cs13/proyecto-bd2`. Por ello todavía no hay PR ni CI remoto verificado.
