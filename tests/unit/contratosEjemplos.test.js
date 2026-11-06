import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PacienteSchema, PacienteNuevoSchema } from '../../src/domain/entities/paciente.js';
import {
  OrdenSchema,
  MuestraSchema,
  ResultadoSchema,
} from '../../src/domain/entities/laboratorio.js';

describe('Validación de Ejemplos de Contrato JSON (I3-02)', () => {
  const dirEjemplos = resolve(process.cwd(), 'contratos/ejemplos');

  function leerJson(nombre) {
    const ruta = resolve(dirEjemplos, nombre);
    return JSON.parse(readFileSync(ruta, 'utf8'));
  }

  it('existen archivos JSON en contratos/ejemplos/', () => {
    const archivos = readdirSync(dirEjemplos).filter((f) => f.endsWith('.json'));
    expect(archivos.length).toBeGreaterThanOrEqual(8);
  });

  it('paciente-crear-request.json valida contra PacienteNuevoSchema', () => {
    const data = leerJson('paciente-crear-request.json');
    const parseado = PacienteNuevoSchema.safeParse(data);
    expect(parseado.success).toBe(true);
  });

  it('paciente-crear-response.json valida contra PacienteSchema', () => {
    const data = leerJson('paciente-crear-response.json');
    const parseado = PacienteSchema.safeParse(data);
    expect(parseado.success).toBe(true);
  });

  it('pacientes-listar-response.json contiene items conformes a PacienteSchema', () => {
    const data = leerJson('pacientes-listar-response.json');
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    for (const item of data.items) {
      expect(PacienteSchema.safeParse(item).success).toBe(true);
    }
  });

  it('orden-laboratorio-response.json valida contra OrdenSchema', () => {
    const data = leerJson('orden-laboratorio-response.json');
    const parseado = OrdenSchema.safeParse(data);
    expect(parseado.success).toBe(true);
  });

  it('muestra-laboratorio-response.json valida contra MuestraSchema', () => {
    const data = leerJson('muestra-laboratorio-response.json');
    const parseado = MuestraSchema.safeParse(data);
    expect(parseado.success).toBe(true);
  });

  it('resultado-laboratorio-response.json valida contra ResultadoSchema', () => {
    const data = leerJson('resultado-laboratorio-response.json');
    const parseado = ResultadoSchema.safeParse(data);
    expect(parseado.success).toBe(true);
  });
});
