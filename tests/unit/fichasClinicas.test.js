import { afterEach, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { detallePaciente } from '../../frontend/shared/js/components/pacientes.js';
import { renderModalDrawer } from '../../frontend/pediatria/js/components/modalDrawer.js';
import { store } from '../../frontend/pediatria/js/state.js';
import { renderPatientTable } from '../../frontend/pediatria/js/components/patientTable.js';
import { iniciarPortalOdontologia } from '../../frontend/odontologia/js/portalApi.js';

let dom, detener;
function preparar(hash = '') {
  dom = new JSDOM('<nav id="navegacion"></nav><span id="rol-actual"></span><span id="seccion-actual"></span><footer class="page-footer"><span></span></footer><div id="drawer-container"></div><div id="contenido"></div>', { url: `http://localhost/#${hash}` });
  for (const clave of ['window', 'document', 'location', 'localStorage']) vi.stubGlobal(clave, dom.window[clave]);
}
afterEach(() => { detener?.(); detener = null; dom?.window.close(); vi.unstubAllGlobals(); store.pacientes = []; });

it('presenta el documento ausente sin sustituirlo por el expediente', () => {
  const html = detallePaciente({ id: 'ID-INTERNO', nombre: 'Paciente', apellidos: 'Ficticio' });
  expect(html).toContain('<dt>Documento</dt><dd>No registrado</dd>');
  expect(html).not.toContain('undefined');
});

it('distingue un historial local vacío de uno externo restringido', () => {
  preparar();
  store.pacientes = [{ id: '1', historial: { consultas: [] } }];
  renderModalDrawer(); globalThis.window.abrirDrawerExpediente('1');
  expect(globalThis.document.body.textContent).toContain('Sin consultas registradas');
  globalThis.window.abrirDrawerSoloLectura({ id: '2', historial: { consultas: [] } }, 'Odontología');
  expect(globalThis.document.body.textContent).toContain('Información restringida');
  expect(globalThis.document.body.textContent).not.toContain('Sin consultas registradas');
  expect(globalThis.document.body.textContent).not.toContain('undefined');
});

it('muestra diagnóstico, tratamiento y recetas locales sin undefined ni fechas inventadas', () => {
  preparar();
  store.pacientes = [{ id: '1', historial: { consultas: [{ motivo: 'Control ficticio',
    diagnosticos: [{ descripcion: 'Diagnóstico ficticio', tratamientos: [{ descripcion: 'Tratamiento ficticio' }] }],
    recetas: [{ medicamentos: [{ nombre: 'Medicamento ficticio' }] }] }] } }];
  renderModalDrawer(); globalThis.window.abrirDrawerExpediente('1');
  for (const texto of ['Diagnóstico ficticio', 'Tratamiento ficticio', 'Medicamento ficticio', 'No registrado']) expect(globalThis.document.body.textContent).toContain(texto);
  expect(globalThis.document.body.textContent).not.toMatch(/undefined|Invalid Date/);
  globalThis.document.querySelector('[data-tab="tutor"]').click();
  expect(globalThis.document.body.textContent).not.toContain('undefined');
  expect(globalThis.document.body.textContent).toContain('No registrado');
});

it('recepción local conserva la restricción clínica aunque existan consultas', () => {
  preparar(); store.pacientes = [{ id: '1', informacionRestringida: true, historial: { consultas: [{ motivo: 'SECRETO' }] } }];
  renderModalDrawer(); globalThis.window.abrirDrawerExpediente('1');
  expect(globalThis.document.body.textContent).toContain('Información restringida');
  expect(globalThis.document.body.textContent).not.toContain('SECRETO');
});

it('la tabla pediátrica tolera nombres y mediciones ausentes sin romper sus acciones', () => {
  preparar(); store.pacientes = [{ id: '1', historial: { estado: 'activo' }, detallesInstitucion: { controlesCrecimiento: [{}] } }];
  renderPatientTable('contenido');
  expect(globalThis.document.body.textContent).not.toMatch(/undefined|null/);
  expect(globalThis.document.body.textContent).toContain('No registrado');
  expect(globalThis.document.querySelector('.btn-abrir-drawer-paciente')?.dataset.id).toBe('1');
});

it.each([[undefined, 'ESTABLE'], [null, 'ESTABLE'], ['observacion', 'OBSERVACION'], ['critico', 'CRITICO']])(
  'renderiza el estado clínico %s sin fallar en toUpperCase', (estadoClinico, esperado) => {
    preparar();
    store.pacientes = [{ id: '1', nombre: 'Paciente', apellidos: 'Ficticio', estadoClinico, historial: { estado: 'activo' } }];
    expect(() => renderPatientTable('contenido')).not.toThrow();
    expect(globalThis.document.querySelector('.badge-stable, .badge-warning, .badge-critical')?.textContent).toContain(esperado);
    expect(globalThis.document.querySelector('.btn-abrir-drawer-paciente')?.dataset.id).toBe('1');
  },
);

it('la ficha externa de Odontología identifica la restricción y el documento faltante', async () => {
  preparar('red-historial/pediatria/2');
  detener = iniciarPortalOdontologia({ sesion: { rol: 'odontologo' }, contenido: globalThis.document.getElementById('contenido'),
    api: { historialEnRed: async () => ({ paciente: { nombre: 'Ficticio' }, historial: {}, consultas: [] }) } });
  await vi.waitFor(() => expect(globalThis.document.body.textContent).toContain('Información restringida'));
  expect(globalThis.document.body.textContent).toContain('DocumentoNo registrado');
  expect(globalThis.document.body.textContent).not.toContain('undefined');
});
