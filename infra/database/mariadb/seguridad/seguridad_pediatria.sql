-- ==============================================================================
-- Seguridad y Privilegios Mínimos · Centro Pediátrico (I4-09)
-- Motor: MariaDB (Local / Cloud)
-- ==============================================================================

-- 1. Creación del usuario de aplicación si no existe
-- En MariaDB Cloud las variables de conexión configurarán este usuario en .env
CREATE USER IF NOT EXISTS 'pediatria_app'@'%' IDENTIFIED BY 'Pediatria_App_Pass2026!';

-- 2. Concesión de privilegios mínimos sobre la base de datos pediátrica
-- Se otorgan SELECT, INSERT, UPDATE para operaciones normales.
-- NO se otorga DELETE sobre tablas clínicas ni DROP / TRUNCATE,
-- forzando que la baja de pacientes sea lógica a través de archivarHistorial.
GRANT SELECT, INSERT, UPDATE ON pediatria_db.* TO 'pediatria_app'@'%';

-- 3. Asegurar que los triggers de integridad no puedan ser puenteados
GRANT TRIGGER ON pediatria_db.* TO 'pediatria_app'@'%';

-- 4. Aplicar privilegios
FLUSH PRIVILEGES;
