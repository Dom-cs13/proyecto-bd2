/**
 * Modal compartido para Archivado Clínico con Motivo (I4-10)
 * Cumple la Regla 2 (LSP) y sección 3.2:
 * historial.estado = "archivado", fechaArchivo, motivoArchivo: { tipo, detalle }
 */
import { mostrarErrorHttp } from './mensajesError.js';

export const TIPOS_MOTIVO_ARCHIVO = [
  { valor: 'traslado', etiqueta: 'Traslado a otra institución de salud' },
  { valor: 'fallecimiento', etiqueta: 'Fallecimiento del paciente' },
  { valor: 'administrativo', etiqueta: 'Cierre o depuración administrativa' },
  { valor: 'otro', etiqueta: 'Otro motivo clínico o legal justificado' }
];

export function abrirModalArchivado({ paciente, onConfirmar }) {
  if (!paciente) return;

  if (paciente.historial?.estado === 'archivado') {
    mostrarErrorHttp({
      status: 409,
      error: {
        codigo: 'PACIENTE_ARCHIVADO',
        mensaje: `El expediente de ${paciente.nombre} ${paciente.apellidos} ya se encuentra archivado.`
      }
    });
    return;
  }

  const existente = document.getElementById('modal-archivado-compartido');
  if (existente) existente.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-archivado-compartido';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(27,61,80,0.45);backdrop-filter:blur(2px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';

  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-archivar" style="background:#ffffff;border-radius:16px;max-width:480px;width:100%;padding:26px;box-shadow:0 16px 40px rgba(46,105,135,0.22);border:1px solid #dbe7ec;font-family:inherit;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:10px;background:#ffccc4;color:#8a2428;display:flex;align-items:center;justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
          </div>
          <div>
            <h3 id="titulo-modal-archivar" style="margin:0;font-size:1.05rem;font-weight:800;color:#2e6987;">Archivar Expediente Clínico</h3>
            <span style="font-size:0.76rem;color:#58798c;">${paciente.nombre} ${paciente.apellidos} (${paciente.expediente || paciente.id})</span>
          </div>
        </div>
        <button type="button" id="btn-cerrar-modal-archivar" aria-label="Cerrar diálogo" style="background:none;border:0;color:#58798c;cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="background:#ffccc4;border:1px solid #f8aba0;border-radius:10px;padding:10px 12px;font-size:0.76rem;color:#7a1f22;margin-bottom:16px;line-height:1.45;">
        El historial clínico no se elimina físicamente. Una vez archivado, no permitirá registrar nuevas consultas (código <code>409 PACIENTE_ARCHIVADO</code>) y quedará disponible en modo de conservación legal.
      </div>

      <form id="form-modal-archivar" style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label for="sel-tipo-motivo-archivo" style="display:block;font-size:0.78rem;font-weight:700;color:#2e6987;margin-bottom:5px;">Causal de archivo (Contrato HTTP) *</label>
          <select id="sel-tipo-motivo-archivo" required style="width:100%;padding:10px 12px;border:1px solid #dbe7ec;border-radius:8px;font:inherit;font-size:0.84rem;color:#1b3d50;background:#ffffff;">
            ${TIPOS_MOTIVO_ARCHIVO.map(t => `<option value="${t.valor}">${t.etiqueta} (${t.valor})</option>`).join('')}
          </select>
        </div>

        <div>
          <label for="txt-detalle-motivo-archivo" style="display:block;font-size:0.78rem;font-weight:700;color:#2e6987;margin-bottom:5px;">Justificación detallada *</label>
          <textarea id="txt-detalle-motivo-archivo" rows="3" required placeholder="Describe el motivo clínico, legal o administrativo del archivo..." style="width:100%;padding:10px 12px;border:1px solid #dbe7ec;border-radius:8px;font:inherit;font-size:0.84rem;color:#1b3d50;resize:vertical;"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
          <button type="button" id="btn-cancelar-modal-archivar" style="padding:9px 16px;border-radius:8px;border:1px solid #dbe7ec;background:#ffffff;color:#2e6987;font:inherit;font-size:0.82rem;font-weight:700;cursor:pointer;">
            Cancelar
          </button>
          <button type="submit" style="padding:9px 18px;border-radius:8px;border:0;background:#fa5c60;color:#ffffff;font:inherit;font-size:0.82rem;font-weight:700;cursor:pointer;">
            Confirmar Archivado
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const cerrar = () => overlay.remove();
  overlay.querySelector('#btn-cerrar-modal-archivar').addEventListener('click', cerrar);
  overlay.querySelector('#btn-cancelar-modal-archivar').addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrar();
  });

  const form = overlay.querySelector('#form-modal-archivar');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = overlay.querySelector('#sel-tipo-motivo-archivo').value;
    const detalle = overlay.querySelector('#txt-detalle-motivo-archivo').value.trim();
    if (!detalle || detalle.length < 5) {
      mostrarErrorHttp({
        status: 400,
        error: {
          codigo: 'VALIDACION_FALLIDA',
          mensaje: 'La justificación detallada debe tener al menos 5 caracteres.'
        }
      });
      return;
    }
    cerrar();
    if (onConfirmar) {
      onConfirmar({ tipo, detalle });
    }
  });
}
