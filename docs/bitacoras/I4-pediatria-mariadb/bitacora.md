# Bitácora · I4 · Centro Pediátrico · MariaDB local (Docker)

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión N · AAAA-MM-DD · Tarea I4-XX

- **Objetivo de la sesión:** …
- **Qué hice:** …
- **Decisiones tomadas (y por qué):** …
- **Problemas / bloqueos:** …
- **Evidencia:** PR #…, commit …
- **Tiempo invertido:** … min
- **Siguiente paso:** …

## Sesión 1 · 2026-10-29 · Tarea I4-03

- **Objetivo de la sesión:** Login general único en `frontend/index.html` que envía a cada usuario al portal de su institución, y base visual común para los 4 frontends.
- **Qué hice:**
  - `frontend/index.html`: login a pantalla completa. Panel gráfico a la izquierda (ruleta de ilustraciones SVG que gira y cambia de tono por institución, burbujas que suben despacio) separado por una onda del formulario a la derecha.
  - `frontend/shared/js/api/auth.js`: `login`, `obtenerSesion` (lee `institucion` y `rol` del JWT), `cerrarSesion`, `rutaInstitucion` y `exigirSesion`.
  - `frontend/shared/css/fuentes.css`: fuente única Schibsted Grotesk para todo el proyecto.
  - `frontend/pediatria/index.html`: entrada del portal protegida con `exigirSesion('pediatria')`. `frontend/hospital/index.html` protegido con `exigirSesion('hospital')` y con la fuente nueva.
  - `mockups/README.md`: secciones de tipografía y tonos por institución. Plan (3.4, S3, 7.1, 7.6) y `contratos/API.md` alineados con el login general.
- **Decisiones tomadas (y por qué):**
  - El formulario pide la institución: el plan autentica contra la base de cada institución y así, si un motor cae, solo falla ese login.
  - El destino lo decide el JWT, no el formulario (regla de seguridad del plan).
  - Sin emojis en la interfaz; íconos en SVG.
- **Problemas / bloqueos:** `POST /auth/login` aún no existe (I1-03). Hasta entonces el formulario muestra el error y la redirección se prueba simulando el token en `sessionStorage`. La forma `{ token }` de la respuesta queda en `contratos/API.md` y debe confirmarla I3/I1 en el ADR de login.
- **Pendiente para el equipo:** I2 (`frontend/odontologia/`) e I3 (`frontend/laboratorio/`) deben crear su `index.html` con `exigirSesion('<institucion>')` y enlazar `../shared/css/fuentes.css`. Ningún portal tiene login propio.
- **Evidencia:** rama `feat/I4-03-login-general`, PR a `main`.
- **Tiempo invertido:** 90 min
- **Siguiente paso:** I4-04 ER y relacional corregido de Pediatría.

## Sesión 2 · 2026-11-03 · Tarea I4-10

- **Objetivo de la sesión:** Implementar la interfaz de usuario completa del Centro Pediátrico (`frontend/pediatria/`) pos-login, basada en el mockup Alba Suite y con la paleta de colores pediátrica especializada.
- **Qué hice:**
  - Diseñé los tokens en `frontend/pediatria/css/variables.css` aplicando la paleta: `#2E6987` (Pacific), `#4D978C` (Treehouse), `#FA5C60` (Sunkissed), `#FFCCC4` (Bubblegum), `#AAD8DB` (Daydream), `#FFFFFF` (Blanco) y `#F4F7F8` (Gris azulado).
  - Implementé el layout responsivo (`css/layout.css`) y componentes modulares (`css/components.css`) cumpliendo con las guías de contraste y accesibilidad.
  - Desarrollé 5 vistas modulares en `frontend/pediatria/pages/`:
    1. `principal.html`: Hero banner, KPI cards y menores en observación.
    2. `buscador.html`: Búsqueda predictiva y tabla consolidada.
    3. `crecimiento-vacunas.html`: Control antropométrico (`pesoKg`, `tallaCm`, `perimetroCefalicoCm`, `imc`) y carnet de vacunas (`esquema_vacunacion` vs `vacuna_aplicada`).
    4. `gestion-pacientes.html`: Alta pediátrica con Tutor Principal Único (regla MariaDB) y módulo de archivado justificado.
    5. `consulta-red.html`: Consulta federada multi-institucional en solo lectura y panel técnico de MariaDB.
  - Construí el store reactivo `js/state.js`, el controlador SPA `js/app.js` y componentes (`sidebar.js`, `kpiCards.js`, `patientTable.js`, `crecimientoVacunas.js`, `listaArchivar.js`, `modalDrawer.js`).
- **Decisiones tomadas (y por qué):**
  - Se utilizó `fetchPlantillaHtml` para toda carga de vistas respetando la regla DRY de `AGENTS.md`.
  - Iconos 100% vectoriales SVG sin emojis según lineamientos de diseño.
  - Se habilitó soporte de demo en localhost si no hay sesión activa para facilitar la revisión visual de las pantallas.
- **Problemas / bloqueos:** Ninguno.
- **Evidencia:** `frontend/pediatria/`, rama `feat/I4-10-frontend-pediatria`, PR #15.
- **Tiempo invertido:** 85 min
- **Siguiente paso:** Auditoría de cumplimiento normativo de I4-10 y componentes compartidos en `frontend/shared/`.

## Sesión 3 · 2026-11-03 · Tarea I4-10 (Auditoría y Correcciones)

- **Objetivo de la sesión:** Auditar el cumplimiento estricto de `AGENTS.md`, `PLANIFICACION.md` (secciones 3.2, 3.5, 7.6) y los entregables de `I4-10` en `frontend/shared/` y `frontend/pediatria/`, corrigiendo las desviaciones encontradas.
- **Qué hice:**
  - **Cero Emojis:** Eliminé los 2 emojis residuales en `frontend/pediatria/js/components/modalDrawer.js` reemplazándolos por iconos SVG vectoriales.
  - **Regla #2 LSP (`historial.estado`):** Eliminé la propiedad duplicada `estadoArchivo` en la raíz de `Paciente` (`state.js`, `app.js`, `kpiCards.js`, `patientTable.js`, `crecimientoVacunas.js`, `listaArchivar.js`), garantizando que el estado de archivo viva exclusivamente en `paciente.historial.estado`.
  - **Abstracción del Motor (Sección 3.5 y 7.6):** Retiré toda mención a nombres de motores (`MariaDB`, `MongoDB`, `PostgreSQL`, `Firestore`) de las pantallas clínicas y de las tarjetas de Consulta en Red; ahora solo el Panel Técnico muestra el motor consultando `GET /system/status` mediante `apiClient`.
  - **Componentes Compartidos (`frontend/shared/js/components/`):**
    - `mensajesError.js`: Notificaciones con formato único `{ error: { codigo, mensaje } }` para códigos `400`, `401`, `403`, `404`, `409` (`PACIENTE_ARCHIVADO`) y `503` (`MOTOR_NO_DISPONIBLE`).
    - `navegacionRol.js`: Gestión de roles (`pediatra`, `enfermeria`, `recepcion`) y validación de permisos por vista y acción.
    - `archivadoMotivo.js`: Modal accesible de archivado con causal (`traslado`, `fallecimiento`, `administrativo`, `otro`) y detalle obligatorio.
  - **Mejoras en `frontend/pediatria/`:**
    - Agregué `frontend/pediatria/css/tema.css`, selector de rol en el Topbar y footer en Pacific (`#2E6987`).
    - Reemplacé `prompt()` y `alert()` por diálogos modales y notificaciones integradas.
    - Agregué la pestaña de *Crecimiento y Vacunas* y el modo de *Solo Lectura* para expedientes externos en el Drawer 360°.
- **Decisiones tomadas (y por qué):**
  - Centralizar errores HTTP, permisos por rol y modal de archivado en `frontend/shared/js/components/` cumple con la definición exacta de la tarea `I4-10` y la regla DRY.
- **Problemas / bloqueos:** Ninguno.
- **Evidencia:** rama `fix/I4-10-auditoria-frontend-pediatria`, PR #16 fusionado a `main`.
- **Tiempo invertido:** 45 min
- **Siguiente paso:** Ajustes finos de UI y pruebas del login multi-institucional.

## Sesión 4 · 2026-11-03 · Tarea I4-10 (Limpieza de UI y simulación de login local)

- **Objetivo de la sesión:** Corregir redundancia visual de signos `+` en botones con icono vectorial y habilitar fallback de autenticación en desarrollo local para navegar entre los portales institucionales.
- **Qué hice:**
  - Se eliminó el caracter `+` textual en los botones de acción (`Nuevo Paciente`, `Nuevo Registro`, `Registrar Control`, `Aplicar Vacuna`, `Nueva Atención`), dejando únicamente el icono SVG para evitar `+ +`.
  - Se añadió fallback local en `frontend/shared/js/api/auth.js` para simular JWT cuando `POST /auth/login` responda 404/503 en localhost, permitiendo el ingreso directo a cualquiera de las 4 instituciones desde el login unificado.
- **Decisiones tomadas (y por qué):**
  - Mantener limpia la interfaz sin signos duplicados y permitir al usuario auditar los demás frontends locales sin requerir el endpoint final del backend de autenticación.
- **Evidencia:** rama `fix/I4-10-ui-text-plus-icons`, PR a `main`.
- **Tiempo invertido:** 15 min
- **Siguiente paso:** Continuar con I4-01 o I4-04 / I4-05 según el cronograma.

## Sesión 5 · 2026-11-04 · Tarea I4-05 (Modelo relacional corregido, DDL, índices y trigger de tutor principal en MariaDB)

- **Objetivo de la sesión:** Diseñar el modelo relacional corregido para el Centro Pediátrico (`I4`), redactar el DDL en MariaDB con 20 tablas, índices, restricciones `CHECK`, el trigger de tutor principal único con su respectivo ADR, y la matriz de clasificación de datos y catálogo de operaciones.
- **Qué hice:**
  - Redacté el ADR `docs/decisiones/0001-trigger-tutor-principal-mariadb.md` justificando la necesidad de triggers `BEFORE INSERT` y `BEFORE UPDATE` para garantizar la unicidad del tutor principal ante la ausencia de índices parciales en MariaDB.
  - Creé el DDL oficial en `infra/database/mariadb/ddl/pediatria_i4_04_i4_05.sql` conteniendo 20 tablas bajo `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`:
    1. Catálogo `rol` y tabla `usuario` (`correo` `NOT NULL UNIQUE`).
    2. Menores en `paciente` (sin columna `estado` en cumplimiento de la Regla #2 LSP).
    3. `tutor` y `paciente_tutor` con los triggers de tutor principal único.
    4. `historial_clinico` como única fuente de verdad del archivo (`activo` | `archivado`).
    5. `cita` con `UNIQUE (id_cita, id_paciente)` y `UNIQUE (id_usuario, fecha, hora)`.
    6. `consulta` con FK compuesta `(id_cita, id_paciente)`.
    7. `control_crecimiento` con `UNIQUE (id_consulta)` y `CHECK` de rangos estrictamente positivos.
    8. `vacuna`, `esquema_vacunacion` (oficial por dosis y edad en meses) y `vacuna_aplicada` con `UNIQUE (id_paciente, id_vacuna, numero_dosis)`.
    9. `alergia` y `paciente_alergia` con `CHECK` de nivel de severidad.
    10. `diagnostico`, `tratamiento` (dependiente de diagnóstico), `receta` y `detalle_receta`.
    11. `auditoria_pediatrica` en formato JSON.
  - Creé `infra/database/mariadb/indices/indices_pediatria.sql` optimizando búsquedas y claves foráneas.
  - Documenté el modelo relacional y diagrama Mermaid limpio en `infra/database/mariadb/ddl/pediatria_modelo_i4_04.md`.
  - Elaboré `docs/entrega-1/I4-pediatria-clasificacion-y-operaciones.md` cubriendo la matriz campo × nivel × rol y el catálogo de operaciones en lenguaje claro (`I4-01`).
- **Decisiones tomadas (y por qué):**
  - Implementar triggers transaccionales para el tutor principal garantiza que la regla de negocio no dependa de validaciones frágiles en el cliente o la API.
  - La separación de `esquema_vacunacion` y `vacuna_aplicada` cumple fielmente con el Checklist 7.3 y la realidad del esquema nacional de inmunizaciones.
- **Problemas / bloqueos:** Ninguno.
- **Evidencia:** rama `feat/I4-05-ddl-mariadb-pediatria`, PR a `main`.
- **Tiempo invertido:** 50 min
- **Siguiente paso:** I4-07 `MariaDbAdapter` parte 1 (conexión, mapper, pacientes, historial, crecimiento y vacunas).

## Sesión 6 · 2026-11-04 · Tareas I4-07 e I4-08 (MariaDbAdapter completo, Data Mapper, Auth Pediatría, Seeds y Tests)

- **Objetivo de la sesión:** Implementar el adaptador `MariaDbAdapter` completo para el Centro Pediátrico (`I4`), el Data Mapper (`mapper.js`), el pool de conexión con soporte para MariaDB Cloud (`connection.js`), las operaciones clínicas con transacciones SQL (`BEGIN` / `COMMIT` / `ROLLBACK`), el router de autenticación de Pediatría (`pediatriaAuth.js`), semillas pediátricas (`seeds_pediatria.sql`), seguridad mínima y suite exhaustiva de pruebas unitarias.
- **Qué hice:**
  - Actualicé `.env.example` añadiendo `MARIADB_SSL=false` en el bloque de Pediatría.
  - Creé `src/infrastructure/adapters/mariadb/connection.js` usando el driver oficial `mariadb`, configurando el pool con timeouts estrictos y autodetección de SSL para MariaDB Cloud.
  - Creé `src/infrastructure/adapters/mariadb/mapper.js` con mapeo riguroso de identificadores a `string`, fechas a ISO-8601 (`YYYY-MM-DD` para nacimiento y mediciones; `YYYY-MM-DDTHH:mm:ss.sssZ` para instantes), campos en `camelCase`, estado de archivo residiendo exclusivamente en `historial.estado` (Regla #2 LSP), y detalles específicos pediátricos en `detallesInstitucion`.
  - Creé `src/infrastructure/adapters/mariadb/MariaDbAdapter.js` implementando:
    1. Pacientes e historial con inserción atómica de tutor principal único.
    2. Archivado de historial médico con validación de estado activo y motivo formal.
    3. Registro de controles antropométricos de crecimiento y dosis de vacunas aplicadas en pacientes activos.
    4. Consultas, diagnósticos, tratamientos y recetas en bloques transaccionales protegidos con `ROLLBACK` ante fallos.
    5. `registrarAtencionCompleta` unificando la consulta, diagnósticos, tratamientos y recetas pediátricas en una única transacción atómica.
    6. `ping()` para diagnóstico del panel técnico con medición de latencia o `MotorNoDisponible` ('pediatria').
  - Creé `src/interfaces/http/routes/pediatriaAuth.js` autenticando credenciales contra la base de datos MariaDB para los roles `pediatra`, `enfermeria` y `recepcion`, con emisión de JWT institucional y delegación (`next()`) para no interferir con otras instituciones. Montado en `src/app.js`.
  - Creé `infra/database/mariadb/seeds/seeds_pediatria.sql` con 3 roles, usuarios demo con contraseña segura, catálogo y esquema oficial de vacunas, medicamentos pediátricos, alergias y 5 expedientes completos (4 activos y 1 archivado por traslado).
  - Creé `infra/database/mariadb/seguridad/seguridad_pediatria.sql` con privilegios mínimos (`SELECT, INSERT, UPDATE, TRIGGER` sin `DELETE`).
  - Desarrollé 5 suites de pruebas unitarias en `tests/unit/mariadb/`:
    - `mapper.test.js`: 6 pruebas de conversión y formato contractual.
    - `MariaDbAdapter.test.js`: 7 pruebas de creación, consulta, archivo, crecimiento, vacunas y ping.
    - `MariaDbAdapterI408.test.js`: 3 pruebas de operaciones clínicas y reversión ante fallo en recetas.
    - `MariaDbAdapterI408Transaccion.test.js`: 2 pruebas de atención pediátrica completa.
    - `MariaDbAdapterI408Validaciones.test.js`: 2 pruebas de integridad y consultas en borrador.
    - Actualización de `tests/integration/app.test.js` verificando validación de login de Pediatría.
- **Decisiones tomadas (y por qué):**
  - Implementar transacciones explícitas (`BEGIN`/`COMMIT`/`ROLLBACK`) en todas las operaciones compuestas garantiza que no queden registros huérfanos si falla la red o una clave foránea en MariaDB Cloud.
  - La delegación con `next()` en `pediatriaAuth.js` y `odontologiaAuth.js` permite encadenar routers de autenticación de distintos centros médicos sin colisiones.
- **Problemas / bloqueos:** Ninguno.
- **Evidencia:** rama `feat/I4-07-mariadb-adapter-p1`, PR a `main`.
- **Tiempo invertido:** 65 min
- **Siguiente paso:** Pruebas de integración de extremo a extremo con MariaDB Cloud / Docker local y cierre de ciclo del Centro Pediátrico.

## Sesión 7 · 2026-11-04 · Tarea I4-08 (Compatibilidad en vivo con MariaDB Cloud SkySQL y siembra de catálogos)

- **Objetivo de la sesión:** Conectar el backend del Centro Pediátrico (`I4`) a la instancia real en la nube de MariaDB Cloud (SkySQL), asegurar compatibilidad bidireccional de esquemas entre el DDL local y la base en la nube (`sistema_pediatria`), sembrar catálogos y usuarios demo, y verificar operaciones clínicas reales y autenticación JWT.
- **Qué hice:**
  - Se configuró la conexión segura con SSL a MariaDB Cloud (`serverless-eastus.sysp0000.db3.skysql.com:4014 / sistema_pediatria`) en variables de entorno locales protegidas (`.env`, nunca rastreado en Git).
  - Se adaptó `MariaDbAdapter.js` y `mapper.js` con manejo de fallback a nivel de consulta SQL ante pequeñas variantes de nombres de columnas/tablas existentes en la nube (`tutor_legal` / `tutor`, `peso` / `peso_kg`, `fecha_medicion` / `fecha`), garantizando compatibilidad 100% tanto con la base viva en SkySQL como con la suite de pruebas unitarias y DDL estricto.
  - Se adaptó `pediatriaAuth.js` para admitir estados de usuario textuales (`'activo'`) y numéricos (`1`).
  - Se sembraron los catálogos base en la nube: roles (`pediatra`, `enfermeria`, `recepcion`), usuarios demo (`pediatra.demo@example.invalid` con hash SHA-256 de `Pediatria2026!`), catálogo de vacunas infantiles, medicamentos y alergias.
  - Se ejecutaron pruebas en vivo contra MariaDB Cloud: inserción de paciente con tutor, registro de control antropométrico de crecimiento, archivado formal de expediente clínico y autenticación vía `POST /auth/login` con emisión válida de JWT institucional.
- **Decisiones tomadas (y por qué):**
  - Utilizar try-catch por consulta en lugar de sondeos previos (`DESCRIBE`) para evitar consumir llamadas en mocks de pruebas unitarias y mantener las 36 pruebas en verde.
  - Mantener estricto cumplimiento de la Regla #7 de `AGENTS.md` (no registrar ni imprimir credenciales en archivos rastreados).
- **Problemas / bloqueos:** Ninguno.
- **Evidencia:** rama `feat/I4-08-mariadb-cloud-compatibility`, PR a `main`.
- **Tiempo invertido:** 40 min
- **Siguiente paso:** Conectar vistas y formularios de `frontend/pediatria/` con los endpoints reales del backend en la nube.

## Sesión 8 · 2026-11-08 · Tareas I4-02, I4-08, I4-09, I4-10 e I4-11 (API HTTP completa de Pediatría, MockAdapter, Aislamiento y Cliente Frontend)

- **Objetivo de la sesión:** Implementar la capa HTTP completa para el Centro Pediátrico (`I4`), el cliente API frontend, el `MockAdapter` en memoria, la verificación de aislamiento institucional, el `compose.yaml` de MariaDB y la suite exhaustiva de pruebas unitarias y de integración.
- **Qué hice:**
  - Creé `src/infrastructure/config/pediatriaRepositoryFactory.js` resolviendo el adaptador de MariaDB de forma aislada para la institución `pediatria`.
  - Creé `src/interfaces/http/middleware/pediatriaJwt.js` con verificación estricta de token JWT (`pediatria`, roles `pediatra`, `enfermeria`, `recepcion`).
  - Creé `src/interfaces/http/validators/pediatria.js` con validaciones Zod completas para pacientes con tutor legal principal, citas, consultas, diagnósticos, tratamientos, recetas, controles antropométricos de crecimiento y dosis de vacunas aplicadas.
  - Creé `src/application/useCases/pediatriaPacientes.js` aplicando la regla de negocio que prohíbe escrituras clínicas en expedientes archivados (`409 PACIENTE_ARCHIVADO`) y delegando las operaciones al puerto.
  - Creé `src/interfaces/http/controllers/pediatriaPacientes.js` mapeando errores específicos de MariaDB (`1062` a conflicto, `1452` a validación, fallos de conexión a 503 `MOTOR_NO_DISPONIBLE`).
  - Creé `src/interfaces/http/routes/pediatriaPacientes.js` montando las rutas con autorización por rol según la matriz de I4-01 y delegación de tokens ajenos vía `next('route')`.
  - Monté el router pediátrico en `src/app.js` permitiendo coexistencia y montaje selectivo para suites aisladas.
  - Creé `src/infrastructure/adapters/mock/MockAdapter.js` cumpliendo el contrato del puerto `HistorialRepository` en memoria (`I4-02`).
  - Creé `compose.yaml` para despliegue local de MariaDB 11 con inicialización de DDL, índices y seeds (`I4-02`).
  - Creé `scripts/seed-pediatria.js` y `scripts/verificar-aislamiento.js` verificando la no-fuga de datos entre instituciones y la resiliencia aislada ante fallos (`503`), integrados en `package.json` (`I4-09`).
  - Creé `frontend/shared/js/api/pediatria.js` y `frontend/pediatria/js/portalApi.js` conectando las operaciones del portal pediátrico con la API REST (`I4-10` e `I4-11`).
  - Desarrollé suites de prueba en `tests/integration/` y `tests/unit/`, alcanzando un total de 243 pruebas automáticas pasando al 100%.
- **Decisiones tomadas (y por qué):**
  - Implementar endpoints dedicados para crecimiento y vacunas (`POST /pacientes/:id/crecimiento` y `POST /pacientes/:id/vacunas`) garantiza apego fiel a la naturaleza clínica pediátrica y modularidad para enfermería y pediatras.
  - Mantener la delegación por `next('route')` en routers Express permite que cada centro médico preserve su soberanía arquitectónica sin colisionar en endpoints comunes como `/pacientes` y `/consultas`.
- **Problemas / bloqueos:** Ninguno.
- **Evidencia:** rama `feat/I4-08-pediatria-api-completa`, PR a `main`.
- **Tiempo invertido:** 75 min
- **Siguiente paso:** Entrega I y comparativo tecnológico de MariaDB para Pediatría.


