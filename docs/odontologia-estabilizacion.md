# Estabilización de Odontología

2026-11-06 · rama `feat/I2-03-integracion-api`. Cambios locales anteriores
conservados; sin merge, rebase, commit, push ni eliminación de archivos.

## Comparación remota

Después de `git fetch origin`, HEAD y origin/main apuntan a
`bab0a9555706f065e99e3f5817ef16f180f5ccb7`; diferencias de commits: `0 0`.
El avance de Odontología continúa en el árbol de trabajo, sin commits propios.

El [PR #23](https://github.com/Dom-cs13/proyecto-bd2/pull/23) permanece abierto,
head `edd0e5f649a38949752b38e33978631c49784bd5`, sin incorporar sus cambios.
Los blobs de PostgresAdapter, mapper, connection y odontologiaAuth son idénticos
entre origin/main y ese head del PR. Se revisaron también su app, middleware
global de autenticación y RepositoryFactory.

## Correcciones

| Área | Corrección y alcance |
|---|---|
| Rutas | Autenticación por método/ruta concreta; deja de interceptar todo un prefijo. Las peticiones genéricas destinadas a otra institución continúan al router posterior sin resolver el repositorio dental |
| JWT | La selección de destino no autoriza: solo decodifica la institución; la firma, algoritmo, issuer, audience, caducidad, rol y sujeto se verifican para cualquier acceso dental. No se confía en req.user precargado. Sujeto positivo dentro de integer PostgreSQL |
| Permisos | Secretaría no accede a historial ni escribe clínica; odontólogo no registra pacientes. Las rutas institucionales no aceptan tokens ajenos |
| Formularios | Motivo máximo 250, cantidad máxima integer; nombres canónicos en cabeceras; diagnóstico/receta/tratamiento deben pertenecer al expediente mostrado y a una consulta borrador antes de mostrar el formulario |
| Respuestas | Cliente rechaza JSON primitivo/array en respuestas exitosas; IDs limitados al rango SQL. Unicidad clínica devuelve CONFLICTO, no PACIENTE_DUPLICADO |
| Lectura | Expediente consolidado en una conexión con REPEATABLE READ READ ONLY; rollback y liberación probados ante error |
| Archivo | Consolida paciente/consultas/detalles antes del COMMIT en la misma transacción. El caso de uso devuelve esa respuesta sin releer después; un fallo de consolidación revierte el archivo |
| Bloqueos SQL | Receta/diagnóstico/tratamiento bloquean solo historial. El rol mínimo no tiene UPDATE en consulta/diagnóstico; no se amplían sus privilegios para bloquear esas tablas |
| Conexión | TLS con verificación de certificado por defecto, DATE como día string, listener de errores de cliente inactivo y traducción de errores TLS/adquisición a MotorNoDisponible |
| Mapper/login | No se consultan propiedades heredadas al interpretar sexo o alias de usuario. El mapper siempre produce un género de dominio válido |
| SQL propuesto | Grupo existente se rechaza si tiene atributos incompatibles, membresías u objetos propios; secuencias identity resueltas por catálogo; comprobación manual de CREATE y bloqueo del historial añadida |

Se contrastaron los tamaños y relaciones del DDL existente: nombres/apellidos
100, teléfono 20, correo 150, dirección 200, motivo de consulta/archivo 250,
diagnóstico/tratamiento/observaciones 500, dosis/frecuencia/duración 100,
superficie 1, precio numeric(10,2), PK/FK integer y pieza smallint con CHECK FDI.
Documento varchar(50) sigue siendo una migración propuesta separada. No se
cambió el DDL original, el puerto ni Zod compartido.

La reducción de bloqueos se revisó contra los [privilegios PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-priv.html):
FOR UPDATE necesita UPDATE en alguna columna de cada tabla bloqueada. La fila
del historial funciona como bloqueo común para las escrituras clínicas locales.
Un futuro cierre/edición de consulta debe respetar ese mismo bloqueo.

## Resultados comprobados mediante simulaciones y análisis estático

- `npm run lint`: aprobado, código 0.
- `npm test`: **206/206**, 21 archivos. Última ejecución: inicio reportado
  2026-11-06 20:29:55, duración 5.15 s. Incluye 36 regresiones nuevas respecto a
  las 170 pruebas de la fase anterior.
- Supertest: composición con router posterior simulado y autenticación propia,
  token falso/req.user precargado, sujeto inválido, límites institucionales y
  códigos de conflicto/configuración. No se usaron módulos reales ajenos como
  dobles de prueba ni se conectaron sus bases.
- Pools simulados: misma conexión/transacción de lectura, consolidación antes
  de commit, rollback, liberación y errores TLS/adquisición. El test del
  constructor crea/cierra un Pool sin adquirir clientes ni conectarse.
- DOM jsdom y API simulada: contexto paciente-consulta, borradores/finalizados,
  cabeceras canónicas, tamaños y respuestas inválidas; regresiones anteriores
  de múltiples piezas/medicamentos, doble envío, HTML y navegación conservadas.
- `node --check`: 15 archivos de implementación aprobados.
- `git diff --check`: sin errores. Comparación explícita contra origin/main:
  sin cambios en contratos, dominio, adaptadores MongoDB/Firestore/MariaDB,
  frontends Hospital/Laboratorio/Pediatría, login pediátrico ni clientes
  compartidos preexistentes auth.js/client.js.

No se ejecutó SQL, ni siquiera en una base local, y no se validó sintaxis SQL
mediante un motor. Las observaciones sobre SQL son revisión estática, no pruebas
de RLS/privilegios efectivos o atomicidad del motor. No se leyeron archivos de
entorno, certificados o credenciales, ni se accedió a datos reales.

## Bloqueos para Supabase e integración

1. Aplicar por PR la migración de documento y completar datos antiguos; sin la
   columna, registro/búsqueda por documento responden 503. No hay backfill ficticio.
2. Validar DDL, migración, seeds, RLS, permisos heredados y extensión de login
   en el motor y entorno autorizados. El SQL manual termina con ROLLBACK, pero
   no fue ejecutado en esta sesión.
3. Validar certificado/URI TLS y configuración de la cuenta de servicio. La
   configuración del pool no prueba un handshake ni el estado de Supabase.
4. Validar snapshot, bloqueos y carreras reales en PostgreSQL. Los mocks prueban
   secuencias del programa, no las garantías concurrentes del servidor.
5. Coordinar PR #23: su middleware usa decode como identidad cuando falla la
   verificación. El código dental no adopta ese comportamiento, pero no puede
   corregir la seguridad de otros routers. Además, un router genérico montado
   antes puede consumir la petición dental. Se probó dental antes de un router
   posterior seguro; no se certifica integración completa del PR.
6. Resolver forma de Historial/archivo, alias heredados y suite de contrato
   conjunta sin cambiar unilateralmente los contratos. `/red/...` y citas P2
   siguen pendientes; tampoco se hizo validación visual en navegador real.

## Archivos de esta fase

- Backend: `src/application/useCases/odontologiaPacientes.js`;
  `src/interfaces/http/routes/{odontologiaPacientes,odontologiaAuth}.js`;
  `src/interfaces/http/middleware/odontologiaJwt.js`;
  `src/interfaces/http/controllers/odontologiaPacientes.js`;
  `src/interfaces/http/validators/odontologia.js`;
  `src/infrastructure/adapters/postgresql/{PostgresAdapter,mapper,connection}.js`.
- Frontend: `frontend/odontologia/js/portalApi.js` y
  `frontend/shared/js/api/odontologia.js` (cliente exclusivo de este módulo).
- SQL: `infra/database/postgresql/seguridad/{odontologia_api,verificar_local}.sql`.
- Tests: `tests/integration/{odontologiaCoexistencia,odontologiaPacientes,odontologiaClinica}.test.js`;
  `tests/unit/odontologiaFrontend.test.js`;
  `tests/unit/postgresql/{PostgresLecturaClinica,mapper,connection}.test.js`.
  Coexistencia y connection son archivos nuevos; se conservaron los anteriores.
- Documentación: este informe, API odontológica, informe I2-01 a I2-13,
  comparativo I2, README PostgreSQL y bitácora I2.

El inventario acumulado del avance anterior permanece en
[I2-01 a I2-13](odontologia-avance-I2-01-a-I2-13.md).
