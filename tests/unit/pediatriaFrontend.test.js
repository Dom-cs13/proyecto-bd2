import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { crearApiPediatria } from '../../frontend/shared/js/api/pediatria.js';
import { iniciarPortalPediatria } from '../../frontend/pediatria/js/portalApi.js';

describe('I4-10/I4-11 · Cliente HTTP Pediatría', () => {
  const sesion = () => ({
    institucion: 'pediatria',
    rol: 'pediatra',
    token: 'token-ficticio-pediatria',
  });

  it('envía bearer, JSON y filtros mediante el cliente compartido', async () => {
    const cliente = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });
    const api = crearApiPediatria({ cliente, sesion });

    await api.listar({ texto: 'Mateo Morales', pagina: 1, estado: 'activo' });
    expect(cliente).toHaveBeenCalledWith(
      '/pacientes?texto=Mateo+Morales&pagina=1&estado=activo',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-ficticio-pediatria',
        },
      }),
    );
  });

  it('permite registrar control de crecimiento y vacuna', async () => {
    const cliente = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1' }),
    });
    const api = crearApiPediatria({ cliente, sesion });

    await api.crecimiento('10', { pesoKg: 12.5, tallaCm: 88.0 });
    expect(cliente).toHaveBeenCalledWith(
      '/pacientes/10/crecimiento',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ pesoKg: 12.5, tallaCm: 88.0 }),
      }),
    );

    await api.vacuna('10', { vacunaId: '1', numeroDosis: 1 });
    expect(cliente).toHaveBeenCalledWith(
      '/pacientes/10/vacunas',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ vacunaId: '1', numeroDosis: 1 }),
      }),
    );
  });

  it.each([null, { institucion: 'odontologia', token: 'otro' }])(
    'no llama a la API si no hay sesión pediátrica activa %#',
    async (actual) => {
      const cliente = vi.fn();
      await expect(
        crearApiPediatria({ cliente, sesion: () => actual }).listar(),
      ).rejects.toMatchObject({ status: 401 });
      expect(cliente).not.toHaveBeenCalled();
    },
  );

  it('cierra sesión ante 401 y propaga el error con status', async () => {
    const alExpirar = vi.fn();
    const cliente = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión terminada' } }),
    });
    await expect(
      crearApiPediatria({ cliente, sesion, alExpirar }).listar(),
    ).rejects.toMatchObject({ status: 401, codigo: 'NO_AUTENTICADO' });
    expect(alExpirar).toHaveBeenCalledOnce();
  });

  it('propaga 503 sin cerrar la sesión', async () => {
    const alExpirar = vi.fn();
    const cliente = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: { mensaje: 'Motor no disponible' } }),
    });
    await expect(
      crearApiPediatria({ cliente, sesion, alExpirar }).listar(),
    ).rejects.toMatchObject({ status: 503 });
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('impide construir rutas con identificadores manipulados', () => {
    expect(() => crearApiPediatria({ sesion }).historial('../hospital')).toThrow('identificador');
  });

  it.each([true, [], null])(
    'rechaza respuestas exitosas que no contienen un objeto de API válido %#',
    async (cuerpo) => {
      const cliente = vi.fn().mockResolvedValue({ ok: true, json: async () => cuerpo });
      await expect(crearApiPediatria({ cliente, sesion }).listar()).rejects.toThrow('respuesta inválida');
    },
  );
});

describe('I4-11 · Portal DOM Pediatría con Enlace SPA y API Simulada', () => {
  let dom;
  let api;
  let contenido;
  let detener;

  const paciente = {
    id: '1',
    nombres: 'Mateo',
    apellidos: 'García',
    fechaNacimiento: '2023-01-01',
    sexo: 'M',
    documento: '3051498210101',
    telefono: '+502 5551-2341',
    correo: 'tutor@correo.com',
    direccion: 'Ciudad de Guatemala',
    detallesInstitucion: {
      tutorPrincipal: {
        dpi: '1234567890101',
        nombres: 'Valeria',
        apellidos: 'Morales',
        parentesco: 'Madre',
        telefono: '+502 5551-2341',
      },
      controlesCrecimiento: [
        {
          id: '101',
          fecha: '2024-01-01',
          pesoKg: 12.0,
          tallaCm: 85.0,
          perimetroCefalicoCm: 48.0,
          imc: 16.6,
          observaciones: 'Desarrollo psicomotor normal',
        },
      ],
      vacunasAplicadas: [
        {
          vacunaId: '1',
          nombreVacuna: 'BCG',
          numeroDosis: 1,
          fechaAplicacion: '2023-01-10',
          lote: 'L-01',
          responsable: 'Enf. Rosa Elena',
        },
      ],
      alergias: [{ alergeno: 'Amoxicilina', severidad: 'alta' }],
    },
    historial: { estado: 'activo' },
  };

  const expediente = {
    paciente,
    historial: { estado: 'activo' },
    consultas: [],
  };

  beforeEach(() => {
    dom = new JSDOM(
      '<nav id="navegacion"></nav><span id="rol-actual"></span><span id="seccion-actual"></span><main id="contenido" tabindex="-1"></main>',
      { url: 'http://localhost:3000/pediatria/#pacientes' },
    );
    for (const nombre of ['window', 'document', 'location', 'FormData']) {
      vi.stubGlobal(nombre, nombre === 'window' ? dom.window : dom.window[nombre]);
    }
    contenido = globalThis.document.getElementById('contenido');
    api = {
      listar: vi.fn().mockResolvedValue({ items: [paciente], total: 1 }),
      paciente: vi.fn().mockResolvedValue(paciente),
      historial: vi.fn().mockResolvedValue(expediente),
      registrar: vi.fn().mockResolvedValue(paciente),
      crecimiento: vi.fn().mockResolvedValue({ id: '201' }),
      vacuna: vi.fn().mockResolvedValue({ id: '301' }),
      archivar: vi.fn().mockResolvedValue(expediente),
      estado: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 3 }),
      catalogos: vi.fn().mockResolvedValue({
        vacunas: [{ id: '1', nombre: 'BCG', descripcion: 'Tuberculosis', dosisRequeridas: 1 }],
        medicamentos: [{ id: '1', nombre: 'Amoxicilina', presentacion: 'Suspensión 250mg' }],
      }),
    };
  });

  afterEach(() => {
    detener?.();
    dom.window.close();
    vi.unstubAllGlobals();
  });

  const iniciar = (rol = 'pediatra') => {
    detener = iniciarPortalPediatria({
      sesion: { rol, institucion: 'pediatria' },
      contenido,
      api,
    });
  };

  const ruta = (hash) => {
    globalThis.location.hash = hash;
  };

  const llenar = (nombre, valor, raiz = contenido) => {
    const el = raiz.querySelector(`[name="${nombre}"]`);
    if (el) el.value = valor;
  };

  const enviar = (id) => {
    contenido.querySelector(id).dispatchEvent(
      new globalThis.window.Event('submit', { bubbles: true, cancelable: true }),
    );
  };

  it('navega a #buscador, busca menores y escapa datos HTML', async () => {
    api.listar.mockResolvedValue({
      items: [{ ...paciente, nombres: '<img src=x onerror="alert(1)">' }],
      total: 1,
    });
    ruta('buscador');
    iniciar('recepcion');

    await vi.waitFor(() => expect(contenido.querySelector('table')).not.toBeNull());
    expect(contenido.querySelector('img')).toBeNull();
    expect(contenido.textContent).toContain('<img');

    llenar('texto', 'Mateo');
    enviar('#buscar-api');
    await vi.waitFor(() => expect(api.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ texto: 'Mateo', pagina: '1' }),
      expect.any(AbortSignal),
    ));
  });

  it('recepción y pediatra pueden registrar un menor con tutor legal', async () => {
    ruta('registro');
    iniciar('recepcion');

    await vi.waitFor(() => expect(contenido.querySelector('#form-registro-pediatrico')).not.toBeNull());
    llenar('documentoIdentidad', 'DOC-999');
    llenar('nombre', 'Camila');
    llenar('apellidos', 'Pérez');
    llenar('fechaNacimiento', '2024-05-10');
    llenar('genero', 'Femenino');
    llenar('tutorDpi', 'TUTOR-123');
    llenar('tutorNombres', 'Elena');
    llenar('tutorApellidos', 'Pérez');
    llenar('tutorParentesco', 'Madre');

    enviar('#form-registro-pediatrico');
    await vi.waitFor(() => expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        nombres: 'Camila',
        apellidos: 'Pérez',
        fechaNacimiento: '2024-05-10',
        detallesInstitucion: {
          tutorPrincipal: expect.objectContaining({
            dpi: 'TUTOR-123',
            nombres: 'Elena',
            parentesco: 'Madre',
          }),
        },
      }),
    ));
    await vi.waitFor(() => expect(globalThis.location.hash).toBe('#pacientes/1'));
  });

  it('enfermería tiene denegado el registro de nuevos menores en #registro', async () => {
    ruta('registro');
    iniciar('enfermeria');

    await vi.waitFor(() => expect(contenido.querySelector('[role="alert"]')).not.toBeNull());
    expect(contenido.textContent).toContain('Solo recepción y pediatras pueden registrar');
    expect(api.registrar).not.toHaveBeenCalled();
  });

  it('enlace a #crecimiento-vacunas carga el selector, datos antropométricos y carnet sin recargar la página', async () => {
    ruta('crecimiento-vacunas');
    iniciar('enfermeria');

    await vi.waitFor(() => expect(contenido.querySelector('#sel-paciente-crecimiento')).not.toBeNull());
    expect(contenido.querySelector('#sel-paciente-crecimiento').children.length).toBe(1);
    expect(contenido.textContent).toContain('12 kg');
    expect(contenido.textContent).toContain('85 cm');
    expect(contenido.textContent).toContain('BCG');
    expect(contenido.textContent).toContain('L-01');
  });

  it('cambiar de menor en el selector de crecimiento actualiza el hash sin recargar la página', async () => {
    const paciente2 = { ...paciente, id: '2', nombres: 'Lucía', apellidos: 'Álvarez' };
    api.listar.mockResolvedValue({ items: [paciente, paciente2], total: 2 });
    ruta('crecimiento-vacunas');
    iniciar('pediatra');

    await vi.waitFor(() => expect(contenido.querySelector('#sel-paciente-crecimiento')).not.toBeNull());
    const sel = contenido.querySelector('#sel-paciente-crecimiento');
    expect(sel.options.length).toBe(2);

    sel.value = '2';
    sel.dispatchEvent(new globalThis.window.Event('change', { bubbles: true }));

    await vi.waitFor(() => expect(globalThis.location.hash).toBe('#crecimiento-vacunas?paciente=2'));
  });

  it('enfermería y pediatra registran control de crecimiento reactivamente sin recargar la página', async () => {
    ruta('crecimiento-vacunas');
    iniciar('enfermeria');

    await vi.waitFor(() => expect(contenido.querySelector('#form-registrar-crecimiento')).not.toBeNull());
    llenar('pesoKg', '14.5');
    llenar('tallaCm', '91.0');
    llenar('perimetroCefalicoCm', '49.5');
    llenar('edadMeses', '30');
    llenar('observaciones', 'Buen estado de nutrición');

    enviar('#form-registrar-crecimiento');
    await vi.waitFor(() => expect(api.crecimiento).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        pesoKg: 14.5,
        tallaCm: 91.0,
        perimetroCefalicoCm: 49.5,
        edadMeses: 30,
        observaciones: 'Buen estado de nutrición',
      }),
    ));
  });

  it('enfermería y pediatra registran aplicación de vacuna reactivamente sin recargar la página', async () => {
    ruta('crecimiento-vacunas');
    iniciar('pediatra');

    await vi.waitFor(() => expect(contenido.querySelector('#form-aplicar-vacuna')).not.toBeNull());
    const formVacuna = contenido.querySelector('#form-aplicar-vacuna');
    llenar('vacunaId', '1', formVacuna);
    llenar('numeroDosis', '2', formVacuna);
    llenar('lote', 'L-VAC-2026', formVacuna);
    llenar('observaciones', 'Dosis de refuerzo sin novedad', formVacuna);

    enviar('#form-aplicar-vacuna');
    await vi.waitFor(() => expect(api.vacuna).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        vacunaId: '1',
        numeroDosis: 2,
        lote: 'L-VAC-2026',
        observaciones: 'Dosis de refuerzo sin novedad',
      }),
    ));
  });

  it('recepción solo tiene modo consulta en #crecimiento-vacunas y no ve formularios de escritura', async () => {
    ruta('crecimiento-vacunas');
    iniciar('recepcion');

    await vi.waitFor(() => expect(contenido.querySelector('#sel-paciente-crecimiento')).not.toBeNull());
    expect(contenido.querySelector('#form-registrar-crecimiento')).toBeNull();
    expect(contenido.querySelector('#form-aplicar-vacuna')).toBeNull();
    expect(contenido.textContent).toContain('Modo consulta');
  });

  it('expediente archivado bloquea el registro de crecimiento y vacunas', async () => {
    const archivado = {
      ...paciente,
      historial: { estado: 'archivado' },
    };
    api.paciente.mockResolvedValue(archivado);
    ruta('crecimiento-vacunas');
    iniciar('pediatra');

    await vi.waitFor(() => expect(contenido.textContent).toContain('Expediente archivado'));
    expect(contenido.querySelector('#form-registrar-crecimiento')).toBeNull();
    expect(contenido.querySelector('#form-aplicar-vacuna')).toBeNull();
  });

  it('pediatra puede archivar el expediente desde la vista de paciente', async () => {
    ruta('pacientes/1');
    iniciar('pediatra');

    await vi.waitFor(() => expect(contenido.querySelector('#form-archivar-paciente')).not.toBeNull());
    llenar('tipoMotivo', 'traslado');
    llenar('detalleMotivo', 'Traslado a hospital de referencia');

    enviar('#form-archivar-paciente');
    await vi.waitFor(() => expect(api.archivar).toHaveBeenCalledWith(
      '1',
      { tipo: 'traslado', detalle: 'Traslado a hospital de referencia' },
    ));
  });

  it('muestra catálogos oficiales y estado de latencia de MariaDB', async () => {
    ruta('catalogos');
    iniciar('pediatra');
    await vi.waitFor(() => expect(contenido.textContent).toContain('Vacunas Oficiales (1)'));
    expect(contenido.textContent).toContain('Medicamentos Pediátricos (1)');

    ruta('estado');
    await vi.waitFor(() => expect(contenido.textContent).toContain('Motor: mariadb'));
    expect(contenido.textContent).toContain('Latencia: 3 ms');
  });

  it('maneja error 401 mostrando aviso de sesión expirada', async () => {
    api.listar.mockRejectedValue(Object.assign(new Error('Sesión vencida'), { status: 401 }));
    ruta('buscador');
    iniciar('recepcion');

    await vi.waitFor(() => expect(contenido.querySelector('[role="alert"]')).not.toBeNull());
    expect(contenido.textContent).toContain('La sesión terminó. Vuelve al acceso general.');
  });
});
