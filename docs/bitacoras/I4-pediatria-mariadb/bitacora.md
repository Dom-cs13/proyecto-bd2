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
