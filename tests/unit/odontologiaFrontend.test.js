import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { crearApiOdontologia } from '../../frontend/shared/js/api/odontologia.js';
import { iniciarPortalOdontologia } from '../../frontend/odontologia/js/portalApi.js';

describe('I2-09/I2-11 · cliente HTTP institucional', () => {
  const sesion = () => ({ institucion: 'odontologia', rol: 'odontologo', token: 'token-ficticio' });
  it('envía bearer, JSON y filtros codificados mediante el cliente compartido', async () => {
    const cliente = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], total: 0 }) });
    const api = crearApiOdontologia({ cliente, sesion });
    await api.listar({ texto: 'Ana & José', pagina: 1, estado: '' });
    expect(cliente).toHaveBeenCalledWith('/pacientes?texto=Ana+%26+Jos%C3%A9&pagina=1', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-ficticio' },
    }));
    await api.receta('4', { medicamentos: [{ medicamentoId: '2' }] });
    expect(cliente).toHaveBeenLastCalledWith('/consultas/4/recetas', expect.objectContaining({ method: 'POST',
      body: JSON.stringify({ medicamentos: [{ medicamentoId: '2' }] }) }));
  });
  it.each([null, { institucion: 'hospital', token: 'otro' }])('no llama la API sin sesión odontológica %#', async (actual) => {
    const cliente = vi.fn();
    await expect(crearApiOdontologia({ cliente, sesion: () => actual }).listar()).rejects.toMatchObject({ status: 401 });
    expect(cliente).not.toHaveBeenCalled();
  });
  it('cierra sesión ante 401 y conserva el código HTTP para la UI', async () => {
    const alExpirar = vi.fn();
    const cliente = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión terminada' } }) });
    await expect(crearApiOdontologia({ cliente, sesion, alExpirar }).listar()).rejects.toMatchObject({ status: 401, codigo: 'NO_AUTENTICADO' });
    expect(alExpirar).toHaveBeenCalledOnce();
  });
  it('propaga 503 sin inventar resultados ni cerrar la sesión', async () => {
    const alExpirar = vi.fn();
    const cliente = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { mensaje: 'Motor no disponible' } }) });
    await expect(crearApiOdontologia({ cliente, sesion, alExpirar }).listar()).rejects.toMatchObject({ status: 503 });
    expect(alExpirar).not.toHaveBeenCalled();
  });
  it('impide construir rutas con identificadores manipulados', () => {
    expect(() => crearApiOdontologia({ sesion }).historial('../hospital')).toThrow('identificador');
  });
  it('consulta red con identificadores opacos y conserva el bearer institucional', async () => {
    const cliente = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ resultados: [] }) });
    const api = crearApiOdontologia({ cliente, sesion });
    await api.buscarEnRed({ texto: 'Ana & José', documento: '' });
    expect(cliente).toHaveBeenLastCalledWith('/red/pacientes?texto=Ana+%26+Jos%C3%A9', expect.objectContaining({ method: 'GET' }));
    await api.historialEnRed('laboratorio', 'uuid-prueba-1');
    expect(cliente).toHaveBeenLastCalledWith('/red/laboratorio/pacientes/uuid-prueba-1/historial', expect.objectContaining({ method: 'GET' }));
    expect(() => api.historialEnRed('constructor', '1')).toThrow('válido');
    expect(() => api.historialEnRed('hospital', '../pacientes')).toThrow('válido');
  });
  it.each([true, [], null])('rechaza respuestas exitosas que no contienen un objeto de API %#', async (cuerpo) => {
    const cliente = vi.fn().mockResolvedValue({ ok: true, json: async () => cuerpo });
    await expect(crearApiOdontologia({ cliente, sesion }).listar()).rejects.toThrow('respuesta inválida');
  });
});

describe('I2-09/I2-11 · portal DOM con API simulada', () => {
  let dom, api, contenido, detener;
  const paciente = { id: '7', nombres: 'Ana', apellidos: 'López', fechaNacimiento: '2000-01-01' };
  const expediente = { paciente, historial: { estado: 'activo' }, consultas: [{
    id: '4', estado: 'borrador', motivo: 'Revisión', diagnosticos: [{ id: '8', descripcion: 'Diagnóstico', tratamientos: [] }], recetas: [], detallesInstitucion: { servicios: [] },
  }] };
  beforeEach(() => {
    dom = new JSDOM('<nav id="navegacion"></nav><span id="rol-actual"></span><span id="seccion-actual"></span><main id="contenido" tabindex="-1"></main><footer class="page-footer"><span></span><span></span></footer>',
      { url: 'http://localhost:3000/odontologia/#pacientes' });
    for (const nombre of ['window', 'document', 'location', 'FormData']) vi.stubGlobal(nombre, nombre === 'window' ? dom.window : dom.window[nombre]);
    contenido = globalThis.document.getElementById('contenido');
    api = {
      buscarEnRed: vi.fn().mockResolvedValue({ resultados: [
        { institucion: 'hospital', estado: 'ok', items: [{ id: 'mongo-7', nombre: 'Paciente red', apellidos: 'Prueba' }], total: 1 },
        { institucion: 'laboratorio', estado: 'no_disponible', items: [], total: 0 },
      ] }),
      historialEnRed: vi.fn().mockResolvedValue({ paciente: { id: 'mongo-7', nombre: 'Paciente red', apellidos: 'Prueba' }, historial: { estado: 'activo' }, consultas: [] }),
      agenda: vi.fn().mockResolvedValue({ items: [{ id: '2', pacienteId: '7', nombre: 'Ana López', fecha: '2026-11-10', hora: '09:00', motivo: 'Control', estado: 'confirmada' }] }),
      equipo: vi.fn().mockResolvedValue({ items: [{ id: '9', nombre: 'Profesional' }] }),
      crearCita: vi.fn().mockResolvedValue({ id: '2' }), cambiarCita: vi.fn().mockResolvedValue({ id: '2' }),
      responsables: vi.fn().mockResolvedValue({ items: [] }), responsable: vi.fn().mockResolvedValue({ id: '1' }),
      alergias: vi.fn().mockResolvedValue({ items: [], catalogo: [{ id: '2', nombre: 'Alergia conocida' }] }),
      alergia: vi.fn().mockResolvedValue({ id: '2' }), finalizar: vi.fn().mockResolvedValue({ id: '4' }),
      actualizarContacto: vi.fn().mockResolvedValue(paciente),
      listar: vi.fn().mockResolvedValue({ items: [paciente], total: 1 }), paciente: vi.fn().mockResolvedValue(paciente),
      historial: vi.fn().mockResolvedValue(expediente), registrar: vi.fn().mockResolvedValue(paciente),
      consulta: vi.fn().mockResolvedValue({ id: '4' }), diagnostico: vi.fn().mockResolvedValue({ id: '8' }),
      tratamiento: vi.fn().mockResolvedValue({ id: '9' }), receta: vi.fn().mockResolvedValue({ id: '10' }),
      archivar: vi.fn().mockResolvedValue(expediente), estado: vi.fn().mockResolvedValue({ ok: true, motor: 'postgresql', latenciaMs: 2 }),
      catalogos: vi.fn().mockResolvedValue({ servicios: [{ id: '2', nombre: 'Servicio ficticio' }], medicamentos: [{ id: '3', nombre: 'Medicamento ficticio' }] }),
    };
  });
  afterEach(() => { detener?.(); dom.window.close(); vi.unstubAllGlobals(); });
  const iniciar = (rol = 'secretaria') => { detener = iniciarPortalOdontologia({ sesion: { rol, institucion: 'odontologia' }, contenido, api }); };
  const ruta = (hash) => { globalThis.location.hash = hash; };
  const llenar = (nombre, valor, raiz = contenido) => { raiz.querySelector(`[name="${nombre}"]`).value = valor; };
  const enviar = (id) => contenido.querySelector(id).dispatchEvent(new globalThis.window.Event('submit', { bubbles: true, cancelable: true }));

  it('el odontograma envía el procedimiento seleccionado al endpoint de consulta existente', async () => {
    ruta('consulta/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('.odontograma')).not.toBeNull());
    llenar('motivo', 'Control'); llenar('servicioId', '2');
    contenido.querySelector('[data-pieza="26"]').click(); contenido.querySelector('[data-superficie="M"]').click();
    enviar('#clinica-api');
    await vi.waitFor(() => expect(api.consulta).toHaveBeenCalledWith({ pacienteId: '7', motivo: 'Control', detallesInstitucion: { servicios: [{ servicioId: '2', piezaDental: 26, superficie: 'M' }] } }));
  });
  it('el acceso directo a procedimientos conserva la intención al elegir paciente', async () => {
    ruta('pacientes?accion=consulta'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('a[href="#consulta/7"]')).not.toBeNull());
    expect(contenido.textContent).toContain('Selecciona un paciente');
    expect(api.listar).toHaveBeenCalledWith(expect.not.objectContaining({ accion: 'consulta' }), expect.any(AbortSignal));
  });
  it('el odontograma usa la fila activa al agregar otro servicio', async () => {
    ruta('consulta/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('.odontograma')).not.toBeNull());
    llenar('motivo', 'Control'); llenar('servicioId', '2');
    contenido.querySelector('[data-pieza="11"]').click(); contenido.querySelector('[data-superficie="V"]').click();
    contenido.querySelector('#agregar-servicio').click();
    const fila = contenido.querySelectorAll('.api-servicio')[1];
    llenar('servicioId', '2', fila); contenido.querySelector('[data-pieza="48"]').click(); contenido.querySelector('[data-superficie="O"]').click();
    enviar('#clinica-api');
    await vi.waitFor(() => expect(api.consulta).toHaveBeenCalledWith(expect.objectContaining({ detallesInstitucion: { servicios: [
      { servicioId: '2', piezaDental: 11, superficie: 'V' }, { servicioId: '2', piezaDental: 48, superficie: 'O' },
    ] } })));
  });
  it('secretaría no accede al odontograma clínico por navegación directa', async () => {
    ruta('consulta/7'); iniciar('secretaria');
    await vi.waitFor(() => expect(api.listar).toHaveBeenCalled());
    expect(contenido.querySelector('.odontograma')).toBeNull(); expect(api.historial).not.toHaveBeenCalled();
  });
  it.each(['secretaria', 'odontologo'])('%s consulta la red y abre una ficha sin acciones de escritura', async (rol) => {
    ruta('red'); iniciar(rol);
    await vi.waitFor(() => expect(contenido.querySelector('#buscar-red')).not.toBeNull());
    expect(api.buscarEnRed).not.toHaveBeenCalled();
    llenar('documento', 'FICTICIO'); enviar('#buscar-red');
    await vi.waitFor(() => expect(contenido.querySelectorAll('.network-card')).toHaveLength(2));
    expect(contenido.textContent).toContain('No disponible');
    contenido.querySelector('a[href^="#red-historial/"]').click();
    await vi.waitFor(() => expect(api.historialEnRed).toHaveBeenCalledWith('hospital', 'mongo-7', expect.any(AbortSignal)));
    await vi.waitFor(() => expect(contenido.textContent).toContain('solo lectura'));
    expect(contenido.querySelector('form')).toBeNull(); expect(api.registrar).not.toHaveBeenCalled();
    expect(contenido.textContent).not.toContain('Sin registrar');
  });
  it('no envía una búsqueda vacía de red y explica cómo continuar', async () => {
    globalThis.window.history.replaceState(null, '', '#red'); iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('#buscar-red')).not.toBeNull());
    enviar('#buscar-red');
    await vi.waitFor(() => expect(contenido.querySelector('[role="alert"]')).not.toBeNull());
    expect(api.buscarEnRed).not.toHaveBeenCalled();
  });

  it.each(['secretaria', 'odontologo'])('restaura el dashboard %s con agenda real y navegación', async (rol) => {
    ruta('inicio'); iniciar(rol);
    await vi.waitFor(() => expect(contenido.querySelector('.appointment')).not.toBeNull());
    expect(contenido.textContent).toContain('Ana López');
    expect(contenido.textContent).not.toMatch(/ficticio|demostración|Próximamente/);
    expect(globalThis.document.querySelector('#navegacion').textContent).toContain('Inicio');
    expect(contenido.querySelector(`a[href="#${rol === 'odontologo' ? 'expediente' : 'ficha'}/7"]`)).not.toBeNull();
    expect(api.historial).not.toHaveBeenCalled();
  });
  it('secretaría agenda una cita con profesional seleccionado desde la API', async () => {
    ruta('nueva-cita/7'); iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('#cita-api')).not.toBeNull());
    llenar('usuarioId', '9'); llenar('fecha', '2026-11-10'); llenar('hora', '09:00'); llenar('motivo', 'Control');
    enviar('#cita-api');
    await vi.waitFor(() => expect(api.crearCita).toHaveBeenCalledWith({ pacienteId: '7', usuarioId: '9', fecha: '2026-11-10', hora: '09:00', motivo: 'Control' }));
  });
  it('secretaría reprograma o cancela una cita y vuelve a la agenda', async () => {
    ruta('reprogramar/2?fecha=2026-11-10&hora=09:00'); iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('#cita-api')).not.toBeNull());
    llenar('estado', 'cancelada'); enviar('#cita-api');
    await vi.waitFor(() => expect(api.cambiarCita).toHaveBeenCalledWith('2', { fecha: '2026-11-10', hora: '09:00', estado: 'cancelada' }));
  });
  it('secretaría registra al responsable principal', async () => {
    ruta('responsables/7'); iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('#relacion-api')).not.toBeNull());
    llenar('nombres', 'Ana'); llenar('apellidos', 'López'); llenar('parentesco', 'Madre'); llenar('esPrincipal', 'true');
    enviar('#relacion-api');
    await vi.waitFor(() => expect(api.responsable).toHaveBeenCalledWith('7', { nombres: 'Ana', apellidos: 'López', parentesco: 'Madre', esPrincipal: true }));
  });
  it('secretaría registra menor y responsable desde el mismo formulario', async () => {
    ruta('registro'); iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('#registro-api')).not.toBeNull());
    llenar('documentoIdentidad', 'MENOR-1'); llenar('nombre', 'Menor'); llenar('genero', 'Otro'); llenar('apellidos', 'Ficticio'); llenar('fechaNacimiento', '2020-01-01');
    llenar('responsableNombres', 'Tutor'); llenar('responsableApellidos', 'Ficticio'); llenar('responsableParentesco', 'Madre');
    enviar('#registro-api');
    await vi.waitFor(() => expect(api.registrar).toHaveBeenCalledWith(expect.objectContaining({ detallesInstitucion: { responsableLegal: {
      nombres: 'Tutor', apellidos: 'Ficticio', parentesco: 'Madre', esPrincipal: true,
    } } })));
  });
  it('secretaría actualiza el contacto desde la ficha', async () => {
    ruta('contacto/7'); iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('#contacto-api')).not.toBeNull());
    llenar('telefono', '12345678'); enviar('#contacto-api');
    await vi.waitFor(() => expect(api.actualizarContacto).toHaveBeenCalledWith('7', { telefono: '12345678' }));
  });
  it('conserva la cita seleccionada desde agenda al guardar consulta', async () => {
    ruta('consulta/7?citaId=2'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('#clinica-api')).not.toBeNull());
    llenar('motivo', 'Control'); enviar('#clinica-api');
    await vi.waitFor(() => expect(api.consulta).toHaveBeenCalledWith({ pacienteId: '7', citaId: '2', motivo: 'Control' }));
  });
  it('odontólogo guarda una alergia del catálogo con reacción y severidad', async () => {
    ruta('alergias/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('#relacion-api')).not.toBeNull());
    llenar('alergiaId', '2'); llenar('nivelSeveridad', 'Alta'); llenar('reaccion', 'Erupción'); enviar('#relacion-api');
    await vi.waitFor(() => expect(api.alergia).toHaveBeenCalledWith('7', { alergiaId: '2', nivelSeveridad: 'Alta', reaccion: 'Erupción' }));
  });
  it('odontólogo finaliza la consulta desde el expediente', async () => {
    ruta('expediente/7'); iniciar('odontologo');
    await vi.waitFor(() => expect([...contenido.querySelectorAll('button')].some((b) => b.textContent.includes('Finalizar consulta'))).toBe(true));
    [...contenido.querySelectorAll('button')].find((b) => b.textContent.includes('Finalizar consulta')).click();
    await vi.waitFor(() => expect(api.finalizar).toHaveBeenCalledWith('4'));
  });
  it('odontólogo consulta responsables sin formulario administrativo', async () => {
    ruta('responsables/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(api.responsables).toHaveBeenCalled());
    await vi.waitFor(() => expect(contenido.textContent).toContain('Responsables legales'));
    expect(contenido.querySelector('#relacion-api')).toBeNull();
  });

  it('busca pacientes y escapa datos clínicos recibidos de la API', async () => {
    api.listar.mockResolvedValue({ items: [{ ...paciente, nombres: '<img src=x onerror="alert(1)">' }], total: 1 });
    iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('table')).not.toBeNull());
    expect(contenido.querySelector('img')).toBeNull();
    expect(contenido.textContent).toContain('<img');
    llenar('texto', 'Ana'); enviar('#buscar-api');
    await vi.waitFor(() => expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ texto: 'Ana', pagina: 1 }), expect.any(AbortSignal)));
  });
  it('secretaría registra datos y abre la ficha sin cargar historial clínico', async () => {
    ruta('registro'); iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('#registro-api')).not.toBeNull());
    llenar('documentoIdentidad', 'DOC-FICTICIO-7'); llenar('nombre', 'Ana'); llenar('genero', 'Femenino'); llenar('apellidos', 'López'); llenar('fechaNacimiento', '2000-01-01');
    enviar('#registro-api');
    await vi.waitFor(() => expect(api.registrar).toHaveBeenCalledWith({ documentoIdentidad: 'DOC-FICTICIO-7', nombre: 'Ana', genero: 'Femenino', apellidos: 'López', fechaNacimiento: '2000-01-01' }));
    await vi.waitFor(() => expect(globalThis.location.hash).toBe('#ficha/7'));
    expect(api.historial).not.toHaveBeenCalled();
  });
  it('el odontólogo registra consulta con servicio y pieza dental', async () => {
    ruta('consulta/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('#clinica-api')).not.toBeNull());
    llenar('motivo', 'Revisión'); llenar('servicioId', '2'); llenar('piezaDental', '11'); llenar('superficie', 'O'); llenar('precioAplicado', '25.50');
    enviar('#clinica-api');
    await vi.waitFor(() => expect(api.consulta).toHaveBeenCalledWith({ pacienteId: '7', motivo: 'Revisión',
      detallesInstitucion: { servicios: [{ servicioId: '2', piezaDental: 11, superficie: 'O', precioAplicado: 25.5 }] } }));
  });
  it('envía varios medicamentos de una receta sin mezclar sus campos', async () => {
    ruta('receta/7/4'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('#agregar-medicamento')).not.toBeNull());
    contenido.querySelector('#agregar-medicamento').click();
    const filas = contenido.querySelectorAll('.api-medicamento');
    filas.forEach((fila, i) => { llenar('medicamentoId', '3', fila); llenar('dosis', `Dosis ${i}`, fila); llenar('frecuencia', `Frecuencia ${i}`, fila); });
    enviar('#clinica-api');
    await vi.waitFor(() => expect(api.receta).toHaveBeenCalledWith('4', { medicamentos: [
      { medicamentoId: '3', dosis: 'Dosis 0', frecuencia: 'Frecuencia 0' },
      { medicamentoId: '3', dosis: 'Dosis 1', frecuencia: 'Frecuencia 1' },
    ] }));
  });
  it('conserva cada pieza y su precio cuando hay varios servicios en una consulta', async () => {
    ruta('consulta/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('#agregar-servicio')).not.toBeNull());
    contenido.querySelector('#agregar-servicio').click();
    llenar('motivo', 'Revisión múltiple');
    contenido.querySelectorAll('.api-servicio').forEach((fila, i) => {
      llenar('servicioId', '2', fila); llenar('piezaDental', String(11 + i), fila); llenar('precioAplicado', String(i), fila);
    });
    enviar('#clinica-api');
    await vi.waitFor(() => expect(api.consulta).toHaveBeenCalledWith({ pacienteId: '7', motivo: 'Revisión múltiple',
      detallesInstitucion: { servicios: [{ servicioId: '2', piezaDental: 11, precioAplicado: 0 }, { servicioId: '2', piezaDental: 12, precioAplicado: 1 }] } }));
  });
  it('requiere justificación formal para archivar y evita doble envío', async () => {
    ruta('archivar/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('#clinica-api')).not.toBeNull());
    llenar('tipo', 'traslado'); llenar('detalle', 'Traslado solicitado');
    enviar('#clinica-api'); enviar('#clinica-api');
    await vi.waitFor(() => expect(api.archivar).toHaveBeenCalledOnce());
    expect(api.archivar).toHaveBeenCalledWith('7', { tipo: 'traslado', detalle: 'Traslado solicitado' });
  });
  it('muestra 503 y permite reintentar sin resultados ficticios', async () => {
    api.listar.mockRejectedValueOnce(Object.assign(new Error('Servicio no disponible'), { status: 503 }));
    iniciar();
    await vi.waitFor(() => expect(contenido.querySelector('[role="alert"]')?.textContent).toBe('Servicio no disponible'));
    contenido.querySelector('#reintentar-api').click();
    await vi.waitFor(() => expect(contenido.querySelector('table')).not.toBeNull());
  });
  it('ignora respuestas antiguas después de cambiar de pantalla', async () => {
    let resolver;
    api.listar.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));
    iniciar();
    ruta('estado');
    await vi.waitFor(() => expect(contenido.textContent).toContain('Disponible'));
    resolver({ items: [paciente], total: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(contenido.textContent).toContain('Estado del servicio');
    expect(contenido.querySelector('table')).toBeNull();
  });
  it('no ofrece nuevas escrituras en un historial archivado', async () => {
    api.historial.mockResolvedValue({ ...expediente, historial: { estado: 'archivado', motivoArchivo: { detalle: 'Archivo' } } });
    ruta('expediente/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.textContent).toContain('archivado'));
    expect(contenido.textContent).not.toContain('Nueva consulta');
    expect(contenido.textContent).not.toContain('Agregar diagnóstico');
  });
  it.each(['diagnostico/7/999', 'tratamiento/7/999', 'receta/7/999'])('no mezcla el contexto del paciente con un registro ajeno en %s', async (hash) => {
    ruta(hash); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('[role="alert"]')?.textContent).toContain('no pertenece'));
    expect(contenido.querySelector('#clinica-api')).toBeNull();
    expect(api.diagnostico).not.toHaveBeenCalled();
    expect(api.tratamiento).not.toHaveBeenCalled();
    expect(api.receta).not.toHaveBeenCalled();
  });
  it('no muestra un formulario de diagnóstico para una consulta finalizada', async () => {
    api.historial.mockResolvedValue({ ...expediente, consultas: [{ ...expediente.consultas[0], estado: 'finalizada' }] });
    ruta('diagnostico/7/4'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('[role="alert"]')?.textContent).toContain('no está disponible'));
    expect(contenido.querySelector('#clinica-api')).toBeNull();
  });
  it('el formulario acepta nombres canónicos y limita el motivo al tamaño SQL', async () => {
    api.historial.mockResolvedValue({ ...expediente, paciente: { id: '7', nombre: 'Ana canónica', apellidos: 'López' } });
    ruta('consulta/7'); iniciar('odontologo');
    await vi.waitFor(() => expect(contenido.querySelector('#clinica-api')).not.toBeNull());
    expect(contenido.textContent).toContain('Ana canónica');
    expect(contenido.querySelector('[name="motivo"]').maxLength).toBe(250);
  });
});
