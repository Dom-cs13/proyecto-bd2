# 1. Trigger para garantizar Tutor Principal Único en MariaDB

- **Estado:** Aprobado
- **Fecha:** 2026-11-04
- **Decisores:** Equipo Centro Pediátrico (I4)
- **Tarea:** `I4-04`, `I4-05`
- **Consulta:** Checklist 7.3 de `PLANIFICACION.md`

## Contexto y problema

En el Centro Pediátrico, los pacientes son menores de edad y requieren uno o varios tutores o responsables legales registrados en la relación `paciente_tutor` (`id_paciente`, `id_tutor`, `parentesco`, `es_principal`).

La regla de negocio clínica exige que un paciente pediátrico pueda tener varios tutores registrados, pero **como máximo exactamente uno** marcado como tutor principal (`es_principal = TRUE`).

En motores relacionales como PostgreSQL, esta restricción se resuelve directamente mediante un índice único condicional o parcial:
```sql
CREATE UNIQUE INDEX ux_paciente_tutor_principal
  ON paciente_tutor (id_paciente)
  WHERE es_principal IS TRUE;
```

Sin embargo, **MariaDB no soporta índices únicos parciales** con cláusula `WHERE` (a diferencia de PostgreSQL o SQLite). Tampoco es viable usar columnas generadas virtuales únicas cuando la cardinalidad depende de la existencia de otras filas en la misma tabla.

## Decisión

Se decide implementar la validación de integridad a nivel de base de datos en MariaDB mediante dos disparadores (triggers) transaccionales sobre la tabla `paciente_tutor`:

1. **`trg_paciente_tutor_principal_bi` (`BEFORE INSERT`):**
   Si el nuevo registro tiene `NEW.es_principal = 1`, se verifica si ya existe en `paciente_tutor` una fila para el mismo `id_paciente` con `es_principal = 1`. De existir, se interrumpe la transacción con:
   ```sql
   SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT = 'El paciente ya cuenta con un tutor principal activo';
   ```

2. **`trg_paciente_tutor_principal_bu` (`BEFORE UPDATE`):**
   Si el registro actualizado tiene `NEW.es_principal = 1`, se verifica si existe otra fila distinta (`id_tutor <> NEW.id_tutor`) para el mismo `id_paciente` con `es_principal = 1`. De existir, se lanza el mismo error `SQLSTATE '45000'`.

## Consecuencias

### Positivas
- **Integridad absoluta en el motor:** Ninguna inserción directa, script o cliente SQL puede violar la regla de negocio de tutor principal único.
- **Transparencia:** Si un intento de alta viola la unicidad, MariaDB revierte automáticamente la transacción con un error tipificado.
- **Cumplimiento estricto del Checklist 7.3:** Satisface el requisito explícito de la planificación para MariaDB sin depender de emulaciones frágiles en la aplicación.

### Negativas / Mitigaciones
- **Sobrecarga de triggers:** Requiere una lectura previa (`SELECT COUNT(*)`) antes de insertar o modificar un tutor principal. Dado el bajo volumen de tutores por paciente (típicamente 1 a 3), el impacto en rendimiento es despreciable.
- **Cambio de tutor principal:** Para reasignar el tutor principal a otro responsable existente, debe realizarse dentro de una transacción desmarcando primero el actual o actualizando ambos en el mismo bloque transaccional.
