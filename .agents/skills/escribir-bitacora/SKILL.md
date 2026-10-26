---
name: escribir-bitacora
description: Agrega la entrada de bitácora de la sesión en docs/bitacoras/<ID>/bitacora.md. Úsala al cerrar cualquier tarea I#-XX o antes de abrir un PR.
---

1. Identifica la tarea (`I#-XX`) por el nombre de la rama o pregúntala.
2. Agrega al final de `docs/bitacoras/<ID>-<institucion>-<motor>/bitacora.md` la plantilla de la sección 2.1 de `docs/planificacion/PLANIFICACION.md`.
3. Llena "Qué hice" y "Evidencia" con los commits reales de la rama (`git log main..HEAD --oneline`). No inventes avances.
4. Si hubo una decisión que afecta a otros integrantes, sugiere crear un ADR en `docs/decisiones/`.
