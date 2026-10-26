---
name: crear-adaptador
description: Implementa o modifica un adaptador de base de datos (MongoDB, PostgreSQL, Firestore o MariaDB) del proyecto BD II cumpliendo el puerto HistorialRepository. Úsala siempre que se toque src/infrastructure/adapters/.
---

# Crear o modificar un adaptador

1. Lee `src/domain/ports/HistorialRepository.js` y `contratos/API.md`. No inventes métodos ni campos.
2. Trabaja solo dentro de `src/infrastructure/adapters/<motor>/`: `<Motor>Adapter.js`, `mapper.js` y `connection.js`.
3. Usa el driver oficial (`pg`, `mariadb`, `mongodb`, `firebase-admin`). Está prohibido usar Prisma, TypeORM, Sequelize o Mongoose.
4. Toda salida pasa por `mapper.toDomain()`: camelCase, `id` como string, fechas ISO-8601. Nunca sale `_id`, `Timestamp`, `Date` ni `snake_case`.
5. Las escrituras de varias partes (receta con sus detalles, consulta con su diagnóstico) son atómicas:
   - SQL: `BEGIN/COMMIT/ROLLBACK`
   - Mongo: `session.withTransaction()`
   - Firestore: `runTransaction` o `writeBatch`
6. No valides reglas de negocio aquí; eso vive en `src/application/`.
7. Si el motor no responde, lanza `MotorNoDisponible` (el `errorHandler` lo convierte en 503).
8. Al terminar, ejecuta la skill `verificar-contrato` y agrega la entrada de bitácora con `escribir-bitacora`.
