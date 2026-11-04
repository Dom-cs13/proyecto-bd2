import { store, ESQUEMA_NACIONAL_VACUNAS } from '../state.js';

export function inicializarSelectorCrecimiento() {
  const select = document.getElementById('sel-paciente-crecimiento');
  if (!select) return;

  const pacientes = store.pacientes.filter(p => p.estadoArchivo === 'activo');
  select.innerHTML = pacientes.map(p => `
    <option value="${p.id}" ${p.id === store.pacienteSeleccionadoId ? 'selected' : ''}>
      ${p.nombre} ${p.apellidos} (${p.expediente})
    </option>
  `).join('');

  select.addEventListener('change', (e) => {
    store.setPacienteSeleccionado(e.target.value);
  });

  const btnAntropo = document.getElementById('btn-nuevo-control-antropo');
  if (btnAntropo) {
    btnAntropo.addEventListener('click', () => registrarNuevoControl());
  }

  const btnVacuna = document.getElementById('btn-nueva-vacuna-aplicada');
  if (btnVacuna) {
    btnVacuna.addEventListener('click', () => registrarNuevaVacuna());
  }
}

export function renderCrecimientoVacunas(containerId = 'crecimiento-vacunas-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const paciente = store.getPacienteSeleccionado();
  if (!paciente) {
    container.innerHTML = `<p style="padding: 24px; color: var(--text-muted);">No hay paciente pediátrico seleccionado.</p>`;
    return;
  }

  const tutor = paciente.detallesInstitucion?.tutorPrincipal;
  const controles = paciente.detallesInstitucion?.controlesCrecimiento || [];
  const vacunasAplicadas = paciente.detallesInstitucion?.vacunasAplicadas || [];
  const alergias = paciente.detallesInstitucion?.alergias || [];
  const ultimo = controles[0];

  container.innerHTML = `
    <!-- Ficha Rápida del Menor -->
    <div class="kpi-card" style="margin-bottom: 24px; padding: 22px; background: linear-gradient(to right, #ffffff, var(--primary-light));">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 50px; height: 50px; border-radius: var(--radius-lg); background-color: var(--color-pacific); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800;">
            ${paciente.nombre[0]}${paciente.apellidos[0]}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--color-pacific); margin: 0;">${paciente.nombre} ${paciente.apellidos}</h2>
              <span class="badge badge-tutor" style="font-family: monospace;">${paciente.expediente}</span>
              <span class="badge badge-stable">${paciente.genero}</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
              Fecha de Nacimiento: <strong>${paciente.fechaNacimiento}</strong> · Tipo de Sangre: <strong>${paciente.detallesInstitucion?.tipoSangre || 'N/R'}</strong> · Tutor: <strong>${tutor?.nombre} (${tutor?.parentesco})</strong>
            </p>
          </div>
        </div>

        <div>
          ${alergias.length > 0 ? `
            <div style="background-color: var(--color-bubblegum); border: 1px solid #f8aba0; padding: 8px 14px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.8rem; font-weight: 800; color: #8a2428;">Alergia Crítica:</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #7a1f22;">${alergias.map(a => `${a.alergeno} (${a.severidad})`).join(', ')}</span>
            </div>
          ` : `
            <span class="badge badge-stable">Sin alergias medicamentosas conocidas</span>
          `}
        </div>
      </div>
    </div>

    <!-- Módulo 1: Control de Crecimiento Antropométrico -->
    <div class="section-block">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-direction: row;">
        <div>
          <h2 class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            <span>Mediciones Antropométricas y Percentiles (control_crecimiento)</span>
          </h2>
          <p class="section-desc">Evolución de peso, talla y perímetro cefálico del paciente.</p>
        </div>
      </div>

      <!-- Resumen Antropométrico Actual -->
      <div class="antropo-grid" style="margin-bottom: 20px;">
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.pesoKg} kg` : '--'}</div>
          <div class="antropo-lbl">Peso Corporal</div>
        </div>
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.tallaCm} cm` : '--'}</div>
          <div class="antropo-lbl">Estatura / Talla</div>
        </div>
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.perimetroCefalicoCm} cm` : '--'}</div>
          <div class="antropo-lbl">Perímetro Cefálico</div>
        </div>
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.imc}` : '--'}</div>
          <div class="antropo-lbl">Índice Masa Corporal</div>
        </div>
      </div>

      <!-- Tabla Histórica de Crecimiento -->
      <div class="table-container">
        <div class="table-scroll">
          <table class="pediatria-table">
            <thead>
              <tr>
                <th>Fecha de Medición</th>
                <th>Edad (Meses)</th>
                <th>Peso (kg)</th>
                <th>Talla (cm)</th>
                <th>Perímetro Cefálico (cm)</th>
                <th>IMC</th>
                <th>Observaciones del Desarrollo</th>
              </tr>
            </thead>
            <tbody>
              ${controles.map(c => `
                <tr>
                  <td><strong>${c.fecha}</strong></td>
                  <td>${c.edadMeses} m</td>
                  <td><span style="color: var(--color-pacific); font-weight: 700;">${c.pesoKg} kg</span></td>
                  <td>${c.tallaCm} cm</td>
                  <td>${c.perimetroCefalicoCm} cm</td>
                  <td><strong>${c.imc}</strong></td>
                  <td style="font-size: 0.78rem; color: var(--text-muted);">${c.observaciones}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Módulo 2: Carnet de Vacunación (esquema_vacunacion y vacuna_aplicada) -->
    <div class="section-block" style="margin-top: 36px;">
      <div class="section-header">
        <h2 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Carnet Oficial de Vacunación (Esquema Nacional vs Vacunas Aplicadas)</span>
        </h2>
        <p class="section-desc">Comparativa entre dosis programadas por edad y vacunas recibidas con su número de lote.</p>
      </div>

      <div class="vacunas-grid">
        ${ESQUEMA_NACIONAL_VACUNAS.map(item => {
          const aplicada = vacunasAplicadas.find(v => v.nombreVacuna.toLowerCase().includes(item.nombreVacuna.split(' ')[0].toLowerCase()) && v.dosis === item.dosis);

          return `
            <div class="vacuna-card ${aplicada ? 'aplicada' : 'pendiente'}">
              <div class="vacuna-header">
                <div>
                  <h4 class="vacuna-title">${item.nombreVacuna}</h4>
                  <span class="vacuna-meta">Dosis ${item.dosis} · Edad recomendada: <strong>${item.edadRecomendada}</strong></span>
                </div>
                ${aplicada ? `
                  <span class="badge badge-vacuna-ok">✓ Aplicada</span>
                ` : `
                  <span class="badge badge-vacuna-pend">Pendiente</span>
                `}
              </div>

              ${aplicada ? `
                <div style="font-size: 0.74rem; color: var(--text-muted); background-color: var(--bg-subtle); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                  <div>Fecha: <strong style="color: var(--color-pacific);">${aplicada.fechaAplicacion}</strong></div>
                  <div>Lote: <code>${aplicada.lote}</code> · ${aplicada.responsable}</div>
                </div>
              ` : `
                <div style="font-size: 0.74rem; color: #8a2428;">
                  Pendiente de administración según calendario de salud infantil.
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function registrarNuevoControl() {
  const paciente = store.getPacienteSeleccionado();
  if (!paciente) return;

  const peso = parseFloat(prompt("Ingresa el peso en kilogramos (ej. 14.2):", "14.2"));
  if (isNaN(peso) || peso <= 0) {
    alert("El peso debe ser un valor numérico positivo (Regla CHECK MariaDB).");
    return;
  }

  const talla = parseFloat(prompt("Ingresa la talla en centímetros (ej. 94.0):", "94.0"));
  if (isNaN(talla) || talla <= 0) {
    alert("La talla debe ser un valor numérico positivo (Regla CHECK MariaDB).");
    return;
  }

  const pc = parseFloat(prompt("Ingresa el perímetro cefálico en centímetros (ej. 49.5):", "49.5"));
  if (isNaN(pc) || pc <= 0) {
    alert("El perímetro cefálico debe ser un valor positivo.");
    return;
  }

  const obs = prompt("Observaciones clínicas del desarrollo infantil:", "Desarrollo psicomotor y nutricional óptimo.");
  const imc = parseFloat((peso / Math.pow(talla / 100, 2)).toFixed(1));

  const nuevo = {
    id: `cc-${Date.now()}`,
    fecha: new Date().toISOString().split('T')[0],
    edadMeses: 32,
    pesoKg: peso,
    tallaCm: talla,
    perimetroCefalicoCm: pc,
    imc,
    observaciones: obs || "Control registrado en consultorio."
  };

  store.agregarControlCrecimiento(paciente.id, nuevo);
  alert(`Control antropométrico registrado exitosamente para ${paciente.nombre}.`);
}

function registrarNuevaVacuna() {
  const paciente = store.getPacienteSeleccionado();
  if (!paciente) return;

  const vacunasOpciones = ESQUEMA_NACIONAL_VACUNAS.map((v, i) => `${i + 1}. ${v.nombreVacuna} (Dosis ${v.dosis})`).join('\n');
  const index = parseInt(prompt(`Selecciona la vacuna a aplicar (1-${ESQUEMA_NACIONAL_VACUNAS.length}):\n${vacunasOpciones}`, "1"), 10) - 1;

  if (isNaN(index) || index < 0 || index >= ESQUEMA_NACIONAL_VACUNAS.length) {
    return;
  }

  const seleccionada = ESQUEMA_NACIONAL_VACUNAS[index];
  const lote = prompt("Número de Lote biológico:", `L-${Math.floor(1000 + Math.random() * 9000)}`);
  if (!lote) return;

  const nuevaVacuna = {
    vacunaId: seleccionada.vacunaId,
    nombreVacuna: seleccionada.nombreVacuna,
    dosis: seleccionada.dosis,
    fechaAplicacion: new Date().toISOString().split('T')[0],
    lote,
    responsable: "Enf. Rosa Elena (Vacunación)"
  };

  store.registrarVacuna(paciente.id, nuevaVacuna);
  alert(`Vacuna ${seleccionada.nombreVacuna} (Dosis ${seleccionada.dosis}) registrada en el carnet.`);
}
