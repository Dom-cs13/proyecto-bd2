# Bitácora · I1 · Hospital General · MongoDB Atlas

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión N · AAAA-MM-DD · Tarea I1-XX

- **Objetivo de la sesión:** …
- **Qué hice:** …
- **Decisiones tomadas (y por qué):** …
- **Problemas / bloqueos:** …
- **Evidencia:** PR #…, commit …
- **Tiempo invertido:** … min
- **Siguiente paso:** …

## Sesión 1 · 2026-10-26 · Tarea I1-01 + [PLAN]

- **Objetivo de la sesión:** frontend por institución, consulta en red y piezas base de I1-01.
- **Qué hice:** plan (secciones 2, 3.5, 6 y 7.6), AGENTS.md y reglas al día; `frontend/shared/` + una carpeta por institución; `package.json`, ESLint con DIP, Express base con `errorHandler`, prueba con Supertest y CI que revisa todo PR.
- **Decisiones tomadas (y por qué):** escritura local y lectura en red solo por `/red/...` (ADR pendiente en I1-03); `documentoIdentidad` como llave común; los 4 drivers en `package.json` desde ya para evitar conflictos en el lockfile.
- **Problemas / bloqueos:** soy el único code owner; la revisión obligatoria la hace el CI.
- **Evidencia:** rama `docs/PLAN-frontend-por-institucion-y-consulta-en-red`.
- **Tiempo invertido:** … min
- **Siguiente paso:** I1-03 (JWT, `RepositoryFactory` con `obtenerTodos`, ADR).
