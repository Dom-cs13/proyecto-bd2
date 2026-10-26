## Descripción

<!-- Qué cambia y por qué -->

## Checklist

- [ ] El título lleva el formato `[I#-XX] …` y corresponde a una tarea del calendario.
- [ ] No hay imports de drivers ni SQL/SDK en `domain/` o `application/`.
- [ ] Las respuestas del adaptador pasan por `mapper.toDomain` (camelCase, `id` string, fechas ISO).
- [ ] La suite de contrato está en verde (como mínimo contra `MockAdapter` y contra mi motor).
- [ ] No se agregaron secretos, datos reales ni ORMs.
- [ ] La entrada de bitácora de esta sesión está agregada.
- [ ] Si cambia el contrato: se actualizaron Zod, `contratos/API.md` y `contratos/ejemplos/`, y hubo aprobación de I3 (después de la Convergencia 1, solo con un ADR).
