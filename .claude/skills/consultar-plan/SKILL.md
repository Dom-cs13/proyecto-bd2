---
name: consultar-plan
description: Lee solo la parte necesaria de docs/planificacion/PLANIFICACION.md (42 KB) en vez del archivo completo. Úsala siempre que necesites una sección, una tarea I#-XX, sus dependencias o su criterio de "hecho".
---

# Consultar el plan sin leerlo entero

Nunca leas `PLANIFICACION.md` completo. Usa el script (cada llamada imprime unas pocas líneas):

- `node scripts/leer-plan.js tarea I2-05`: fila del calendario, "hecho cuando…" y dependencias de la tarea.
- `node scripts/leer-plan.js seccion 7.2`: una sección o subsección (checklists 7.2/7.3, contrato 3.1, reglas 4.x…).
- `node scripts/leer-plan.js lista`: índice de títulos con número de línea, por si dudas del número.

Atajos de contenido, para elegir la sección sin buscar:

| Necesito | Sección |
|---|---|
| Asignación de motores | 1 |
| Estructura de carpetas | 2 |
| Puerto, forma de datos, rutas, decisiones de modelado | 3.1, 3.2, 3.3, 3.4 |
| DIP/LSP, patrones, YAGNI, DRY, seguridad, checklist de PR | 4.1 a 4.6 |
| Calendario y dependencias | 6, 6.1 |
| Criterios de "hecho" y checklists SQL/documental | 7.1 a 7.4 |
| Reglas de adaptadores / frontend | 7.5 / 7.6 |
| Argumento del comparativo por motor | 8 |
| Recortes si hay atraso | 9 |

Si ya leíste una sección en esta conversación, no la vuelvas a pedir. Para el contrato HTTP lee `contratos/API.md` (2 KB), no el plan.
