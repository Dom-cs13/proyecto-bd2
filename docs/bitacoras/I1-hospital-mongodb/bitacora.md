# Bitácora · I1 · Hospital General · MongoDB Atlas

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión 1 · 2026-10-26 · Frontend Base & Hospital General

- **Objetivo de la sesión:** Implementar el diseño base del frontend (estilo Alba Suite) y módulo de pacientes/expedientes para el Hospital General desacoplado del backend.
- **Qué hice:**
  - Diseñé el sistema de variables CSS (`variables.css`, `layout.css`, `components.css`) basado en el mockup (tonos Teal/Dark Cyan, cards limpias, badges cyan).
  - Creé el contenedor principal `index.html` con sidebar fijo, header de acciones, barra de búsqueda predictiva y tabla clínica de pacientes.
  - Implementé el panel flotante / drawer lateral para visualización de historial clínico, registro de nuevos pacientes y edición.
  - Creé un almacén de estado reactivo local (`state.js`) y datos mock (`mockData.js`) alineados estrictamente con el contrato del proyecto.
- **Decisiones tomadas (y por qué):**
  - Implementar arquitectura modular en Vanilla JS para permitir que los integrantes de I2, I3 e I4 agreguen sus vistas sin conflictos de merge.
  - Utilizar un Drawer lateral deslizable (similar al botón "Probar Panel Flotante" del mockup) para edición y detalle sin requerir recargas de página.
- **Problemas / bloqueos:** Ninguno.
- **Evidencia:** Archivos en `frontend/` y estructura lista para ejecución local.
- **Tiempo invertido:** 60 min
- **Siguiente paso:** Revisión interactiva del frontend y preparación de los formularios de internamiento/citas.
