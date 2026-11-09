# I2-11 · Revisión del frontend de Odontología

Base: `main` ea434f0, posterior al PR #31; rama `feat/I2-11-mejoras-frontend`.
Se conservaron el stash y los archivos personales sin seguimiento.

La comparación con el inicio de Pediatría (`pages/principal.html`) identifica
tres niveles útiles: presentación, indicadores y seguimiento. Odontología adopta
esa jerarquía con sus propios azules, logotipo y fuente compartida. Los indicadores
provienen exclusivamente de la agenda de la fecha elegida: en el perfil clínico
representan la agenda del profesional, y en recepción la agenda institucional.
No representan pacientes únicos ni estadísticas históricas.

Se incorpora lectura del catálogo existente para el odontólogo, estado de consulta
y referencia de póliza en el expediente. Se conserva el estado al gestionar citas,
se permite actualizar la misma fecha, se anuncia carga/guardado y se lleva el foco
al título después del render. Tablas y tarjetas se adaptan al teléfono.

## Cobertura de las veinte tablas

Una tabla no implica una pantalla CRUD: se respeta la autorización de la API.

| Tabla | Representación y alcance |
|---|---|
| rol | Sesión institucional; menú por secretaria/odontólogo. Sin administración de roles. |
| usuario | Profesional de la cita y sesión; selección desde equipo activo en recepción. |
| paciente | Buscar, paginar, registrar adulto/menor, consultar ficha y actualizar contacto. |
| responsable_legal | Lectura y registro desde ficha; odontólogo solo consulta. |
| paciente_responsable | Vínculo, parentesco y principal; alta conjunta para menores. |
| historial_clinico | Expediente, estado y archivado justificado; bloquea acciones clínicas archivadas. |
| cita | Agenda, programación, confirmación, reprogramación, cancelación y no asistencia. |
| aseguradora | Sin endpoint de catálogo ni gestión: pendiente API institucional. |
| poliza_seguro | Se muestra el ID vinculado que devuelve la consulta; sin CRUD ni selección sin catálogo. |
| consulta | Crear con/sin cita y finalizar; estado explícito en expediente. |
| diagnostico | Registro en borrador y lectura en consulta. |
| tratamiento | Registro por diagnóstico y lectura; cambio longitudinal de estado pendiente de endpoint. |
| receta | Emitir y consultar; sin gestión de entrega, no modelada por la API. |
| medicamento | Catálogo clínico de solo lectura y selección en receta. |
| detalle_receta | Múltiples medicamentos con dosis, frecuencia, duración, cantidad e indicaciones. |
| servicio_odontologico | Catálogo clínico de solo lectura con precio base disponible. |
| consulta_servicio | Servicios múltiples, precio aplicado, pieza FDI y superficie en odontograma/expediente. |
| auditoria_clinica | Persistencia interna; no existe endpoint para exponer auditoría al navegador. |
| alergia | Catálogo autorizado en antecedentes; sin administración de catálogo. |
| paciente_alergia | Registrar/actualizar relación, severidad, reacción y observaciones. |

Consulta en red mantiene búsqueda y ficha autorizada de solo lectura, con
estados parciales por institución. Las rutas, JWT, permisos, TLS y conexiones
existentes se conservan. No se cambiaron Zod, contratos, adaptadores ni SQL.

## Verificación y límites

- `npm run lint`: aprobado.
- `ALBA_ODONTOLOGIA_DESECHABLE=1 npm test` (variable en PowerShell):
  **412/412 pruebas, 39 archivos**, incluidos contrato e integración; ronda final
  de Vitest a las 23:20:51, duración 19.76 s.
- `npm run verificar:aislamiento` y `npm run skills:check`: aprobados.
- Chrome real: **13 vistas** a **1440/390 px**, sin desbordamiento de página,
  cierre de sesión visible y 32 piezas en el odontograma. Capturas locales en
  `artifacts/odontologia/`, conservadas fuera del commit.
- Recorridos de ambos roles: DOM automatizado con API simulada, permisos HTTP
  con JWT firmados y persistencia clínica real en PostgreSQL desechable.
- `git diff --check`: aprobado; sin cambios en otros frontends, conexiones,
  adaptadores, contrato compartido ni esquema.
- Implementación: commit `1232b65` de esta rama.

Las pruebas DOM usan API simulada explícita; las capturas Chrome usan fixtures,
sin iniciar el servidor de producción ni leer archivos de entorno. Los recorridos
HTTP/SQL se ejecutan en PostgreSQL 16 desechable con RLS y rol mínimo. No son
aceptación de usuarios ni verificación de login/TLS en Supabase.

La prueba SQL heredada esperaba un error bruto 23505 en el alta con tutor duplicado;
se actualizó a la respuesta de dominio vigente (409/PACIENTE_DUPLICADO), conservando
la comprobación de rollback. No se cambió el adaptador.

El script de CI fusionaba automáticamente los PR Open. Una excepción exacta para
esta rama deja el PR para revisión manual, con regresión que prohíbe llamadas de
merge. Es el único cambio de automatización compartida; no afecta otras ramas.

Pendientes: gestión de aseguradoras/pólizas y auditoría (sin endpoints), reutilizar
responsables existentes, borrar contacto, seguimiento longitudinal de tratamientos,
entrega de recetas, aceptación con usuarios y cuatro servicios desplegados. No se
añaden botones para esas operaciones.
