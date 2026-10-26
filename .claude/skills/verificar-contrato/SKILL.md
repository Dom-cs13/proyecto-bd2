---
name: verificar-contrato
description: Verifica que un adaptador cumpla el contrato del puerto HistorialRepository. Úsala al terminar un método de adaptador o al tocar esquemas Zod, contratos/API.md o contratos/ejemplos/.
---

# Verificar el contrato

1. Corre la suite `tests/contract/` (`describe.each` sobre los adaptadores disponibles), como mínimo contra `MockAdapter` y contra tu motor.
2. Revisa que cada respuesta cumpla la forma: camelCase, `id` string, fechas ISO-8601, sin `_id`/`Timestamp`/`snake_case`.
3. Confirma que la creación de receta con detalles es atómica forzando un error en un detalle.
4. Si cambiaste el contrato: actualiza Zod, `contratos/API.md` y `contratos/ejemplos/` en el mismo PR. Después de la Convergencia 1 requiere un ADR y la aprobación de I3.
5. Reporta qué métodos pasan y cuáles no, con la salida real de los tests.
