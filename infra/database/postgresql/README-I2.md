# Preparación local de Odontología

Archivos preparados para revisión por PR. Esta sesión no ejecutó SQL ni se
conectó a Supabase. Tampoco certificó que coincidan con una base desplegada.

Orden de revisión/aplicación manual en PostgreSQL **desechable**:

1. `ddl/odontologia_i2_04_i2_05.sql`: DDL existente, solo para una base vacía.
2. `ddl/odontologia_documento_i2.sql`: agrega documento nullable e índice único.
   Las filas antiguas no reciben documentos generados. Completar los documentos
   reales y acordar NOT NULL requiere una migración posterior revisada.
3. `seguridad/odontologia_api.sql`: grupo NOLOGIN, sin BYPASSRLS/DDL/DELETE,
   SELECT y los INSERT necesarios, UPDATE limitado a columnas de archivo.
4. `seeds/odontologia_ficticia.sql`: requiere establecer expresamente
   `SET red_salud.entorno = 'pruebas'` en la sesión. Datos con `.invalid`, sin
   cuentas ni contraseñas predeterminadas. Se puede repetir sin duplicar esos fixtures.
5. `seguridad/verificar_local.sql`: comprobaciones de privilegios, ausencia de
   CREATE en el esquema, registro con rol limitado, bloqueo del historial,
   archivo y denegación de reactivación; termina con ROLLBACK.

El grupo no abre conexiones. La asignación del grupo a una cuenta de servicio
se hace fuera de estos archivos, con credenciales administradas por el dueño.
La cuenta no debe ser superusuario, dueña de tablas ni tener BYPASSRLS, y no debe
heredar otros permisos amplios. El script aborta si el grupo ya existe con
atributos de administración/replicación incompatibles, membresías en otros roles
o propiedad de objetos de public; no elimina roles ni usuarios. Las secuencias
identity se resuelven con pg_get_serial_sequence, sin adivinar sus nombres.

Las políticas se aplican únicamente al grupo del backend. `USING (true)` dentro
de ese grupo permite operar sobre esta base institucional, no sobre una red de
instituciones. El permiso secretaría/odontólogo lo verifica el JWT en Express;
no se toma del navegador ni de una variable SQL arbitraria. No se dan membresías
a roles del navegador. Debe revisarse que no haya políticas/grants previos más
permisivos en la instalación objetivo. No se afirma seguridad de producción.

El login existente requiere `extensions.crypt(text,text)`. El script concede
uso/ejecución al grupo si ya existe; no instala extensiones. Su instalación y
el aprovisionamiento de cuentas quedan fuera del seed. Configurar TLS y la
conexión de servicio según el entorno; no publicar archivos de credenciales. El
constructor del pool usa verificación de certificado por defecto tanto en login
como en repositorio; las opciones TLS de la URI y el certificado del servidor
requieren revisión del despliegue. Una prueba de configuración sin conexiones
no valida un handshake TLS. DATE se recibe como string para no cambiar de día
por la zona horaria.

Las escrituras clínicas toman FOR UPDATE únicamente sobre el historial. Un
bloqueo adicional de consulta/diagnóstico requeriría privilegios UPDATE que este
rol no tiene. La comprobación manual prueba el bloqueo de historial; su ejecución
sigue pendiente. Referencia: [privilegios PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-priv.html).

Los tests automáticos (`npm test`) usan pool/repositorio simulados y no ejecutan
ninguno de estos scripts. Falta verificar sintaxis, integridad, RLS, permisos
efectivos e idempotencia en PostgreSQL local desechable antes de aplicarlos.
