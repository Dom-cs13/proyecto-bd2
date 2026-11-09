import { expect, it, vi } from 'vitest';
import { validarPacienteLaboratorio } from '../../src/application/useCases/validarPacienteLaboratorio.js';

it('prohíbe crear órdenes o resultados sobre pacientes archivados', async () => {
  await expect(validarPacienteLaboratorio({ obtenerHistorial: vi.fn().mockResolvedValue({ estado: 'archivado' }) }, '1')).rejects.toMatchObject({ status: 409 });
});
it('exige paciente persistido en el repositorio local', async () => {
  await expect(validarPacienteLaboratorio({ obtenerHistorial: vi.fn().mockResolvedValue(null) }, '1')).rejects.toMatchObject({ status: 404 });
});
