# Bitácora · I3 · Laboratorio Clínico · Firebase Firestore

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión 1 · 2026-10-30 · Tarea I3-10

- **Objetivo de la sesión:** Implementar el portal frontend modular del Laboratorio Clínico (`frontend/laboratorio/`) desacoplado de la API con datos semilla interactivos.
- **Qué hice:**
  - Estructuré `frontend/laboratorio/` con `index.html`, `css/laboratorio.css` (paleta púrpura institucional) y vistas dinámicas en `vistas/` (`principal.html`, `expedientes.html`, `pacientes.html`, `examenes.html`).
  - Desarrollé el almacén de datos mock y persistencia local (`datos.js`) con catálogo de tipos de examen (hematología, química, orina, heces, inmunología, microbiología) y generador de órdenes (`generarIdOrden`).
  - Implementé el router por hash (`app.js`), modales de nueva orden y registro de paciente, filtrado reactivo de expedientes y estados de muestra (pendiente, en proceso, completado, cancelado).
  - Integré `fetchPlantillaHtml` de `frontend/shared/js/api/client.js` y el protector de sesión `exigirSesion('laboratorio')` de `auth.js`.
- **Decisiones tomadas (y por qué):**
  - Cargar las sub-vistas HTML mediante `fetchPlantillaHtml` para cumplir estrictamente con las reglas de ESLint de `AGENTS.md`.
  - Proteger el acceso al portal mediante `exigirSesion('laboratorio')` para respetar la gobernanza de autenticación del proyecto.
- **Problemas / bloqueos:** Ajustes en ESLint (uso restringido de fetch, bloque try/catch vacío y función no invocada resuelta al conectarse al botón principal).
- **Evidencia:** Commits en rama `andres`, PR #5.
- **Tiempo invertido:** 120 min
- **Siguiente paso:** I3-04 Diseño documental de Firestore (colecciones `pacientes` y subcolecciones `ordenes`).
