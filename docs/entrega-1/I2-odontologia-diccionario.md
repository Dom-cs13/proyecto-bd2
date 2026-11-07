# I2-01 · Diccionario y clasificación de Odontología

Alcance local: el [DDL existente](../../infra/database/postgresql/ddl/odontologia_i2_04_i2_05.sql)
y la [migración propuesta de documento](../../infra/database/postgresql/ddl/odontologia_documento_i2.sql).
No reemplaza el diccionario conjunto de las cuatro instituciones ni cambia contratos.

| Entidad | Atributos principales y relación | Clasificación |
|---|---|---|
| rol | id_rol, nombre único | Institucional |
| usuario | id_usuario, id_rol, nombres, apellidos, correo único, estado, hash de autenticación | Acceso restringido al backend; no se devuelve por estas rutas |
| paciente | id_paciente, nombres, apellidos, fecha_nacimiento, sexo, teléfono, correo, dirección; documento_identidad en migración separada | Confidencial: secretaría y odontólogo |
| responsable_legal | id_responsable, DPI único, nombres, apellidos, contacto | Confidencial; sin API nueva en esta fase |
| paciente_responsable | paciente + responsable, parentesco, es_principal; principal único por paciente | Confidencial; sin API nueva |
| historial_clinico | paciente único, fecha_creacion, estado, fecha_archivo y motivo estructurado | Restringido al odontólogo en API |
| cita | paciente, usuario, fecha/hora, motivo, estado, observaciones | Confidencial; API P2 pendiente de convergencia |
| aseguradora | id_aseguradora, nombre único | Catálogo |
| poliza_seguro | paciente, aseguradora, número único por aseguradora, cobertura 0–100, vigencia | Confidencial; FK compuesta con consulta |
| consulta | paciente, usuario, cita/póliza opcionales, fecha, motivo, observaciones, estado y fechas de cierre | Clínico restringido |
| diagnostico | consulta, descripción y observaciones | Clínico restringido |
| tratamiento | diagnóstico, descripción, fechas, estado, observaciones | Clínico restringido |
| receta | consulta, fecha, indicaciones generales | Clínico restringido |
| medicamento | nombre, presentación, estado | Catálogo clínico; solo lectura por odontólogo |
| detalle_receta | receta, medicamento, dosis, frecuencia, duración, cantidad positiva, indicaciones | Clínico restringido |
| servicio_odontologico | nombre, descripción, precio base no negativo, estado | Catálogo clínico; solo lectura por odontólogo |
| consulta_servicio | consulta, servicio, precio aplicado, pieza FDI permanente y superficie opcional | Extensión odontológica restringida |
| auditoria_clinica | usuario, entidad/registro, acción, fecha y mapas anterior/nuevo | Restringido; sin API nueva ni lectura desde el navegador |
| alergia | nombre único, descripción, estado | Catálogo clínico; gestión pendiente |
| paciente_alergia | paciente + alergia, severidad, reacción, observaciones y fecha | Clínico restringido; gestión pendiente |

Las PK identity y FK, `CHECK`, fechas, índices y decisiones clínicas están en el
DDL. El estado de archivo solo vive en historial, no en paciente. El mapper
traduce nombres de columnas a camelCase, fechas ISO e identificadores string;
los servicios dentales se entregan dentro de `consulta.detallesInstitucion`.

Los endpoints actuales no aceptan alergias, responsables, auditoría ni pólizas
como atributos arbitrarios de paciente: los rechazan en lugar de descartarlos.
La gestión de esas extensiones requiere acordar sus casos de uso y permisos.
No se ha validado el diccionario de las demás instituciones en esta sesión.
