import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerTodos } from '../../src/infrastructure/config/redRepositoryFactory.js';

const locales = vi.hoisted(() => ({ odonto: vi.fn(), pedia: vi.fn(), hospital: { listarPacientes: vi.fn() } }));
vi.mock('../../src/infrastructure/config/RepositoryFactory.js', () => ({ obtenerTodos: () => ({ hospital: locales.hospital }) }));
vi.mock('../../src/infrastructure/config/odontologiaRepositoryFactory.js', () => ({ obtenerRepositorio: locales.odonto }));
vi.mock('../../src/infrastructure/config/pediatriaRepositoryFactory.js', () => ({ obtenerRepositorio: locales.pedia }));

describe('Registro de red · composición diferida sin adaptar motores ajenos', () => {
  beforeEach(() => vi.clearAllMocks());
  it('conserva el registro común, no fabrica Laboratorio ni abre conexiones al componer', () => {
    const repos = obtenerTodos();
    expect(repos.hospital).toBe(locales.hospital);
    expect(repos.laboratorio).toBeUndefined();
    expect(Object.keys(repos.odontologia)).toEqual(['listarPacientes', 'obtenerHistorial']);
    expect(locales.odonto).not.toHaveBeenCalled(); expect(locales.pedia).not.toHaveBeenCalled();
  });
  it('resuelve con la institución fija únicamente al ejecutar una lectura', async () => {
    const repo = { listarPacientes: vi.fn().mockResolvedValue({ items: [], total: 0 }), obtenerHistorial: vi.fn().mockResolvedValue(null) };
    locales.odonto.mockReturnValue(repo); locales.pedia.mockReturnValue(repo);
    const repos = obtenerTodos();
    await repos.odontologia.listarPacientes({ texto: 'Pa' });
    await repos.pediatria.obtenerHistorial('1');
    expect(locales.odonto).toHaveBeenCalledWith('odontologia'); expect(locales.pedia).toHaveBeenCalledWith('pediatria');
    expect(repo.obtenerHistorial).toHaveBeenCalledWith('1');
  });
});
