# Alba Suite · Guía breve de evaluación

Entrega en la rama `fix/I3-09-auditoria-integracion`, [PR #36](https://github.com/Dom-cs13/proyecto-bd2/pull/36). Revisar el resultado de CI del último commit antes de evaluar. El PR permanece abierto para revisión, sin merge automático.

## Inicio

Requisitos: Node.js 24, npm y acceso al entorno de evaluación que configure el equipo. Docker y Chrome son necesarios únicamente para las pruebas desechables de SQL y navegador.

Desde una copia del repositorio sin modificaciones propias pendientes:

```powershell
git fetch origin
git switch fix/I3-09-auditoria-integracion
git pull --ff-only origin fix/I3-09-auditoria-integracion
npm ci
npm start
```

Abrir `http://localhost:3000` y seleccionar la institución. El mismo Express sirve las pantallas y la API; no abrir los HTML con `file://`. Si el operador configura otro `PORT`, usar ese puerto en el navegador.

El operador debe proporcionar por un canal privado la configuración y las cuentas de evaluación. Las variables se documentan en la plantilla `.env.example`; la configuración privada queda solo en el equipo que ejecuta el backend, nunca en Git ni en capturas. Se requiere `JWT_SECRET` y configurar cada motor disponible. Hospital y Laboratorio necesitan cuentas provisionadas mediante `HOSPITAL_AUTH_USUARIOS` / `LABORATORIO_AUTH_USUARIOS`; sus contraseñas se almacenan como hashes scrypt. Los usuarios SQL se validan contra las cuentas provisionadas en sus bases. No hay una contraseña universal de demostración.

No ejecutar seeds, migraciones ni cambios de permisos en bases existentes durante la evaluación. El arranque no sustituye la provisión previa del esquema y las cuentas por el equipo.

## Recorrido funcional

| Institución | Motor | Comprobación según disponibilidad |
|---|---|---|
| Hospital General | MongoDB | Iniciar sesión con cuenta autorizada, buscar una ficha de evaluación y consultar solo la información permitida. La cobertura clínica HTTP conserva las limitaciones del informe inicial. |
| Clínica Odontológica | PostgreSQL | Buscar una ficha, abrir el expediente local con rol odontólogo y comprobar consultas, diagnósticos, tratamientos y recetas existentes. Secretaría conserva acceso administrativo. |
| Laboratorio Clínico | Firestore | Iniciar sesión con cuenta autorizada, buscar fichas y consultar estudios según su rol. No se presenta la integración de estudios en el historial común como completa. |
| Centro Pediátrico | MariaDB | Buscar fichas, abrir el historial local con pediatra/enfermería y revisar consultas y recetas. Recepción conserva la restricción clínica. La ausencia de `estadoClinico` ya no interrumpe la tabla. |

1. Revisar el panel de estado o `GET /system/status`. Un motor no disponible debe afectar únicamente a su institución; una conexión exitosa no demuestra permisos de escritura.
2. En Odontología y Pediatría, usar Consulta en Red con un documento ficticio conocido del entorno de evaluación. Probar en ambas direcciones. Los resultados mantienen su institución de origen y no fusionan identidades.
3. Abrir las fichas externas: se esperan datos generales autorizados e **Información restringida** para la clínica ajena. **Sin consultas registradas** corresponde a un historial local autorizado sin consultas. Una lista externa redactada no prueba que el paciente carezca de consultas.
4. Los campos realmente ausentes muestran **No registrado**. El documento no se sustituye por el ID del expediente o el del tutor.
5. Solo en una base de evaluación con escritura expresamente autorizada, registrar un paciente ficticio mediante el formulario. Comprobar HTTP `201`, volver a buscarlo y verificar su persistencia con la cuenta de lectura. Los menores odontológicos requieren responsable legal. No usar datos reales ni realizar esta prueba en producción sin autorización.

La búsqueda PostgreSQL ↔ MariaDB fue comprobada manualmente por el usuario. Las altas, persistencia, recetas, rollback y pantallas originales fueron comprobadas automáticamente con motores SQL desechables y Chrome. No se realizaron nuevas escrituras de prueba en las bases reales.

## Revisión de bases con acceso limitado

Solicitar al equipo conexiones de **solo lectura**, limitadas al entorno y a las colecciones/tablas autorizadas. Son diferentes de las credenciales internas de escritura de la API. No entregar cuentas root, superusuario, propietario de proyecto ni claves privadas del backend.

- PostgreSQL / MariaDB: usar el cliente SQL elegido con la cuenta lectora provista por el operador. Revisar esquema y conteos; consultar únicamente los pacientes ficticios de evaluación por su documento. No consultar tablas de usuarios, hashes o datos clínicos ajenos al recorrido autorizado. No ejecutar INSERT, UPDATE, DELETE, DDL o GRANT.
- MongoDB: usar Compass o mongosh con una cuenta lectora restringida a la base autorizada. Revisar colecciones y documentos ficticios identificados por el equipo, sin exportaciones masivas.
- Firestore: usar la consola con una identidad de lectura limitada por el operador. No reutilizar credenciales de servicio de la API, modificar documentos ni cambiar reglas/IAM. Las reglas del navegador no sustituyen los permisos IAM del Admin SDK.

Los controles del frontend no conceden acceso directo a las bases. La revisión debe respetar el alcance autorizado de la cuenta lectora; no usarla para eludir las restricciones clínicas entre instituciones.

## Verificaciones y límites de entrega

```powershell
npm run lint
npm test
npx vitest run tests/contract tests/unit/disenoExistente.test.js
npm run verificar:aislamiento
npm run skills:check
```

La suite general omite explícitamente las pruebas que requieren contenedores; una omisión no cuenta como motor validado. Para repetir SQL y Chrome, seguir los requisitos y comandos de [la auditoría SQL](auditoria-historiales-sql.md). Para los cuatro motores desechables, consultar [la segunda auditoría](auditoria-funcional-segunda-revision.md).

MongoDB y Firestore continúan reportados como desconectados en el entorno del usuario; requieren configuración y acceso del operador. MariaDB real mantiene pendientes la verificación de esquema efectivo, permisos y persistencia con datos autorizados. Un documento nunca almacenado requiere corrección autorizada en origen. No se afirma funcionamiento de los cuatro motores reales.

También siguen vigentes los pendientes del [informe inicial](auditoria-integracion-cuatro-motores.md), incluida la aprobación de I3 del ADR 0002 ya propuesto en el PR. Esta entrega no amplía contratos, roles ni intercambio de información clínica, ni modifica el diseño.
