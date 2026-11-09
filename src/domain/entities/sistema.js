import { z } from 'zod';

/**
 * @file sistema.js
 * Entidades y esquemas Zod del subsistema de diagnóstico técnico (/system/status).
 * Cumple con el contrato formal de la sección 3.3 y contratos/API.md.
 */

export const EstadoMotorEnum = z.enum(['conectado', 'desconectado']);

export const MotorStatusSchema = z.object({
  estado: EstadoMotorEnum,
  motor: z.string(),
  latenciaMs: z.number().nullable(),
});

export const SystemStatusSchema = z.object({
  motores: z.record(z.string(), MotorStatusSchema),
}).passthrough();
