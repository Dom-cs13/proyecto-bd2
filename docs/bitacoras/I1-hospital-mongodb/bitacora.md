# Bitácora · I1 · Hospital General · MongoDB Atlas

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión 1 · 2026-10-26 · Tarea I1-01 + [PLAN]

- **Objetivo de la sesión:** frontend por institución, consulta en red y piezas base de I1-01.
- **Qué hice:** plan (secciones 2, 3.5, 6 y 7.6), AGENTS.md y reglas al día; `frontend/shared/` + una carpeta por institución; `package.json`, ESLint con DIP, Express base con `errorHandler`, prueba con Supertest y CI que revisa todo PR.
- **Decisiones tomadas (y por qué):** escritura local y lectura en red solo por `/red/...` (ADR pendiente en I1-03); `documentoIdentidad` como llave común; los 4 drivers en `package.json` desde ya para evitar conflictos en el lockfile.
- **Problemas / bloqueos:** soy el único code owner; la revisión obligatoria la hace el CI.
- **Evidencia:** rama `docs/PLAN-frontend-por-institucion-y-consulta-en-red`.
- **Tiempo invertido:** 60 min
- **Siguiente paso:** I1-03 (JWT, `RepositoryFactory` con `obtenerTodos`, ADR).

## Sesión 2 · 2026-10-27 · Frontend Hospital General (I1)

- **Objetivo de la sesión:** Implementar el frontend específico de Hospital General (`frontend/hospital/`) alineado a la nueva estructura por institución y reglas del proyecto.
- **Qué hice:**
  - Diseñé el sistema de variables CSS (`variables.css`, `layout.css`, `components.css`) basado en el mockup Alba Suite (tonos Teal/Dark Cyan, cards limpias, badges cyan).
  - Creé el contenedor principal en `frontend/hospital/index.html` con sidebar fijo, header de acciones, buscador predictivo, tabla clínica de pacientes y selector global en `frontend/index.html`.
  - Implementé el panel flotante / drawer lateral para visualización de historial clínico 360°, registro de nuevos pacientes con póliza de seguro y archivado legal justificado.
  - Añadí el módulo de laboratorio clínico (`laboratorio.html` y `laboratorioTable.js`) con visualización de parámetros y valores biométricos.
  - Centralicé el fetch helper en `frontend/shared/js/api/client.js` para estricto cumplimiento de ESLint y DIP.
- **Decisiones tomadas (y por qué):**
  - Aislar el frontend del Hospital en `frontend/hospital/` de acuerdo con la actualización del plan de la sección 7.6 para garantizar cero colisiones con I2, I3 e I4.
  - Mantener las operaciones reactivas en memoria mediante `state.js` para operar de forma desacoplada antes de la integración con el backend.
- **Problemas / bloqueos:** Ninguno. Tests y ESLint pasando en verde.
- **Evidencia:** Rama `hopital_general`, commits de frontend hospitalario y CI en verde.
- **Tiempo invertido:** 75 min
- **Siguiente paso:** Integración de la suite de contrato y conexión con `MongoAdapter`.
