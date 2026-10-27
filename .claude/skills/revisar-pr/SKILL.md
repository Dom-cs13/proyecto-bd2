---
name: revisar-pr
description: Revisa un pull request del proyecto BD II contra el checklist de la sección 4.6 de la planificación. Úsala cuando se pida revisar un PR o un diff antes de aprobarlo.
---

1. Verifica el título `[I#-XX] …` y que corresponda a una tarea del calendario.
2. Busca violaciones de DIP: imports de drivers, SQL o SDK en `src/domain/` o `src/application/`.
3. Busca violaciones de LSP: respuestas de adaptador que no pasan por `mapper.toDomain` (`_id`, `snake_case`, `Date`, `Timestamp`).
4. Busca violaciones de YAGNI (ORMs, clases innecesarias, código P2 anticipado) y de DRY (validaciones de negocio dentro de adaptadores, `fetch` fuera de `frontend/shared/js/api/`, componentes copiados entre `frontend/<institucion>/`).
   Revisa también que ninguna ruta `/red/...` escriba ni use un método distinto de `listarPacientes`/`obtenerHistorial`.
5. Confirma que la suite de contrato esté en verde (Mock + el motor tocado).
6. Confirma que no hay secretos ni datos reales y que está la entrada de bitácora.
7. Si cambia el contrato: Zod, `contratos/API.md`, `contratos/ejemplos/` y aprobación de I3.
8. Reporta cada violación con archivo y línea.
