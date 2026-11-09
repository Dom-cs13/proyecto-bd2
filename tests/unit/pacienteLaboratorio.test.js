import { describe, it, expect } from 'vitest';
import {
  PacienteSchema,
  PacienteNuevoSchema,
  calcularEdad,
} from '../../src/domain/entities/paciente.js';

describe('Entidad Paciente · Integridad y Regla 8', () => {
  it('valida un paciente con la estructura estándar del proyecto', () => {
    const pacienteValido = {
      id: 'pac-001',
      documentoIdentidad: '2987654320101',
      nombre: 'Mariana',
      apellidos: 'Soto Hernández',
      fechaNacimiento: '1992-04-18',
      genero: 'Femenino',
      tipoSangre: 'O+',
      telefono: '+502 5555 1234',
      correo: 'mariana.soto@correo.gt',
      direccion: 'Zona 1, Quetzaltenango',
      alergias: ['Penicilina'],
      activo: true,
      detallesInstitucion: {
        tipoPaciente: 'ambulatorio',
        servicioProcedencia: 'Consulta Externa',
      },
    };

    const parsed = PacienteSchema.safeParse(pacienteValido);
    expect(parsed.success).toBe(true);
    expect(parsed.data.nombre).toBe('Mariana');
    expect(parsed.data.apellidos).toBe('Soto Hernández');
    expect(parsed.data.documentoIdentidad).toBe('2987654320101');
  });

  it('permite transformar cui a documentoIdentidad en PacienteNuevoSchema', () => {
    const entrada = {
      cui: '2456789010901',
      nombre: 'Carlos',
      apellidos: 'Pérez López',
      fechaNacimiento: '1985-11-02',
      genero: 'Masculino',
      tipoSangre: 'A+',
    };

    const res = PacienteNuevoSchema.safeParse(entrada);
    expect(res.success).toBe(true);
    expect(res.data.documentoIdentidad).toBe('2456789010901');
    expect(res.data.nombre).toBe('Carlos');
  });

  it('calcula la edad correctamente en base a fecha de nacimiento', () => {
    const edad = calcularEdad('1990-01-01');
    expect(edad).toBeGreaterThanOrEqual(34);
    expect(calcularEdad('')).toBe(0);
  });
});
