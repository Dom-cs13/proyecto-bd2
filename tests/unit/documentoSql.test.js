import { describe, expect, it } from 'vitest';
import { pacienteDesdeFila as postgres } from '../../src/infrastructure/adapters/postgresql/mapper.js';
import { pacienteDesdeFila as maria } from '../../src/infrastructure/adapters/mariadb/mapper.js';

describe.each([['PostgreSQL', postgres], ['MariaDB', maria]])('%s · identidad real de la fila', (_, mapear) => {
  it.each([
    [{ documento_identidad: '  DOC-A  ' }, 'DOC-A'],
    [{ documento: 'DOC-B' }, 'DOC-B'],
    [{ documento: ' ', documento_identidad: 'DOC-C' }, 'DOC-C'],
    [{ documento_identidad: '', documento: 'DOC-D' }, 'DOC-D'],
    [{ documento: 123 }, '123'],
    [{ documento: '00123' }, '00123'],
    [{}, null],
  ])('conserva el documento disponible sin usar id ni documento del tutor %#', (campos, esperado) => {
    const paciente = mapear({ id_paciente: 9, ...campos }, { tutorPrincipal: { dpi: 'SOLO-DEL-TUTOR' } });
    expect(paciente.documentoIdentidad).toBe(esperado);
  });
});
