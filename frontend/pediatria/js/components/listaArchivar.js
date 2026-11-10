import { store } from '../state.js';
import { abrirModalArchivado } from '../../../shared/js/components/archivadoMotivo.js';
import { mostrarErrorHttp, mostrarNotificacionExito } from '../../../shared/js/components/mensajesError.js';
import { puedeEjecutarAccion, obtenerConfiguracionRol } from '../../../shared/js/components/navegacionRol.js';

export function renderListaArchivar(containerId = 'lista-archivar-pacientes-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activos = store.pacientes.filter(p => p.historial?.estado === 'activo');

  if (activos.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-muted); background-color: var(--bg-subtle); border-radius: var(--radius-md);">
        No hay pacientes activos disponibles para archivar.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px; max-height: 480px; overflow-y: auto;">
      ${activos.map(p => {
        const tutor = p.detallesInstitucion?.tutorPrincipal;
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background-color: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="color: var(--color-pacific); font-size: 0.88rem;">${p.nombre} ${p.apellidos}</strong>
                <span class="badge badge-tutor" style="font-family: monospace; font-size: 0.7rem;">${p.expediente}</span>
              </div>
              <p style="font-size: 0.74rem; color: var(--text-muted); margin-top: 3px;">
                Tutor: ${tutor?.nombre || 'Sin tutor'} (${tutor?.parentesco || 'Tutor'}) · Nac: ${p.fechaNacimiento}
              </p>
            </div>
            <button class="btn btn-outline btn-sm btn-archivar-paciente" data-id="${p.id}" type="button" style="color: #8a2428; border-color: #f8aba0;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              <span>Archivar</span>
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.btn-archivar-paciente').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!puedeEjecutarAccion('archivar_paciente')) {
        const cfg = obtenerConfiguracionRol();
        mostrarErrorHttp({
          status: 403,
          error: {
            codigo: 'ACCESO_DENEGADO',
            mensaje: `El rol ${cfg.etiqueta} no tiene autorización para archivar expedientes clínicos.`
          }
        });
        return;
      }

      const id = btn.getAttribute('data-id');
      const paciente = store.pacientes.find(p => p.id === id);
      if (!paciente) return;

      abrirModalArchivado({
        paciente,
        onConfirmar: async ({ tipo, detalle }) => {
          try { await store.archivarPaciente(id, { tipo, detalle }); } catch (error) { return mostrarErrorHttp(error); }
          mostrarNotificacionExito(
            `Expediente ${paciente.expediente} archivado`,
            `Estado actualizado en historial.estado = "archivado" bajo causal "${tipo}".`
          );
        }
      });
    });
  });
}
