/* ============================================================
   visualizadores.js · Visualizadores Especializados de Resultados
   ============================================================
   Implementa la vista clínica de los 8 tipos de laboratorio (I3-11):
   1. Hematología: hemograma completo, constantes y fórmula leucocitaria.
   2. Química Clínica: rango de referencia gráfico y flag de anormalidad.
   3. Urianálisis: examen físico-químico y sedimento microscópico.
   4. Inmunología: tarjeta de reactividad, punto de corte y técnica.
   5. Microbiología: cultivo, tinción y tabla de antibiograma con CMI.
   6. Coagulación: panel hemostático e INR destacado.
   7. Banco de Sangre: carnet de grupo ABO, factor Rh y pruebas cruzadas.
   8. Biología Molecular: amplificación génica, carga viral y técnica.
   ============================================================ */

import { esc } from './modal.js';
import { FLAGS_ANORMALIDAD } from '../catalogo.js';

export function renderResultadosEspecializados(orden, paciente = null) {
  if (!orden || !orden.resultados || Object.keys(orden.resultados).length === 0) {
    return '<p class="vacio" style="padding:16px;text-align:center;color:#64748b;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;">Aún sin resultados registrados para esta orden de laboratorio.</p>';
  }

  const tipo = orden.tipo || orden.tipoLaboratorio || 'hematologia';
  const res = orden.resultados || {};

  switch (tipo) {
    case 'hematologia':
      return renderHematologia(res, paciente);
    case 'quimica':
      return renderQuimica(res);
    case 'urianalisis':
      return renderUrianalisis(res);
    case 'inmunologia':
      return renderInmunologia(res);
    case 'microbiologia':
      return renderMicrobiologia(res);
    case 'coagulacion':
      return renderCoagulacion(res);
    case 'banco_sangre':
      return renderBancoSangre(res);
    case 'biologia_molecular':
      return renderBiologiaMolecular(res);
    default:
      return renderGenerico(res);
  }
}

/* ---------- 1. Hematología ---------- */
function renderHematologia(res) {
  const hb = res.hemoglobina != null ? Number(res.hemoglobina) : null;
  const hto = res.hematocrito != null ? Number(res.hematocrito) : null;
  const plq = res.plaquetas != null ? Number(res.plaquetas) : null;
  const leu = res.leucocitos != null ? Number(res.leucocitos) : null;

  const neu = res.neutrofilos_pct ?? 0;
  const lin = res.linfocitos_pct ?? 0;
  const mon = res.monocitos_pct ?? 0;
  const eos = res.eosinofilos_pct ?? 0;
  const bas = res.basofilos_pct ?? 0;

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">🩸 SERIE ROJA Y PLAQUETARIA</span>
      <span class="esp-desc">Citometría hematológica automatizada</span>
    </div>

    <div class="esp-grid-kpis">
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Hemoglobina</span>
        <b class="kpi-val ${hb && (hb < 12 || hb > 16) ? 'kpi-alerta' : ''}">${hb != null ? hb : '—'} <small>g/dL</small></b>
        <span class="kpi-sub">Ref: 12.0 - 16.0 g/dL</span>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Hematocrito</span>
        <b class="kpi-val ${hto && (hto < 36 || hto > 48) ? 'kpi-alerta' : ''}">${hto != null ? hto : '—'} <small>%</small></b>
        <span class="kpi-sub">Ref: 36.0 - 48.0 %</span>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Plaquetas</span>
        <b class="kpi-val ${plq && (plq < 150000 || plq > 450000) ? 'kpi-alerta' : ''}">${plq != null ? Number(plq).toLocaleString() : '—'} <small>/µL</small></b>
        <span class="kpi-sub">Ref: 150k - 450k /µL</span>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Leucocitos Totales</span>
        <b class="kpi-val ${leu && (leu < 4500 || leu > 11000) ? 'kpi-alerta' : ''}">${leu != null ? Number(leu).toLocaleString() : '—'} <small>/µL</small></b>
        <span class="kpi-sub">Ref: 4,500 - 11,000 /µL</span>
      </div>
    </div>

    <div class="esp-subpanel" style="margin-top:14px;">
      <b style="font-size:0.85rem; color:#475569;">🔬 Fórmula Leucocitaria Porcentual (Diferencial):</b>
      <div class="formula-leuco-bar" style="margin:8px 0;">
        <div style="width:${neu}%; background:#3b82f6;" title="Neutrófilos: ${neu}%"></div>
        <div style="width:${lin}%; background:#8b5cf6;" title="Linfocitos: ${lin}%"></div>
        <div style="width:${mon}%; background:#ec4899;" title="Monocitos: ${mon}%"></div>
        <div style="width:${eos}%; background:#f59e0b;" title="Eosinófilos: ${eos}%"></div>
        <div style="width:${bas}%; background:#10b981;" title="Basófilos: ${bas}%"></div>
      </div>
      <div class="formula-leuco-legend">
        <span><i style="background:#3b82f6"></i> Neutrófilos: <b>${neu}%</b> <small>(50-70%)</small></span>
        <span><i style="background:#8b5cf6"></i> Linfocitos: <b>${lin}%</b> <small>(20-40%)</small></span>
        <span><i style="background:#ec4899"></i> Monocitos: <b>${mon}%</b> <small>(2-8%)</small></span>
        <span><i style="background:#f59e0b"></i> Eosinófilos: <b>${eos}%</b> <small>(1-4%)</small></span>
        <span><i style="background:#10b981"></i> Basófilos: <b>${bas}%</b> <small>(0-1%)</small></span>
      </div>
    </div>

    ${
      res.vcm || res.hcm
        ? `
    <div style="display:flex; gap:16px; margin-top:12px; font-size:0.8rem; color:#64748b;">
      <span>VCM: <b>${esc(res.vcm || '—')} fL</b> (80-100)</span>
      <span>HCM: <b>${esc(res.hcm || '—')} pg</b> (27-33)</span>
      <span>Eritrocitos: <b>${esc(res.eritrocitos || '—')} M/µL</b></span>
    </div>`
        : ''
    }
  </div>`;
}

/* ---------- 2. Química Clínica ---------- */
function renderQuimica(res) {
  const val = res.valor_numerico != null ? Number(res.valor_numerico) : null;
  const u = res.unidad_medida || 'mg/dL';
  const min = res.rango_referencia_min != null ? Number(res.rango_referencia_min) : 70;
  const max = res.rango_referencia_max != null ? Number(res.rango_referencia_max) : 100;
  const flag = res.flag_anormalidad || 'normal';

  let pct = 50;
  if (val != null && max > min) {
    pct = Math.max(5, Math.min(95, ((val - min) / (max - min)) * 70 + 15));
  }

  const flagInfo = FLAGS_ANORMALIDAD[flag] || { label: flag, color: '#15803d', bg: '#dcfce7' };

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">⚗️ QUÍMICA CLÍNICA / BIOQUÍMICA</span>
      <span class="badge" style="background:${flagInfo.bg}; color:${flagInfo.color}; font-weight:700;">
        ${esc(flagInfo.label)}
      </span>
    </div>

    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
        <span style="font-size:0.9rem; color:#64748b; font-weight:600;">Resultado Cuantitativo:</span>
        <b style="font-size:2rem; color:var(--primary);">${val != null ? val : '—'} <small style="font-size:1rem; color:#64748b;">${esc(u)}</small></b>
      </div>

      <div class="rango-visual-wrap" style="margin-top:16px;">
        <div class="rango-barra">
          <div class="rango-zona-normal"></div>
          <div class="rango-indicador" style="left:${pct}%" title="Valor: ${val}"></div>
        </div>
        <div class="rango-labels">
          <span>Min: <b>${min} ${esc(u)}</b></span>
          <span style="color:#15803d; font-weight:700;">Rango de Referencia Normal</span>
          <span>Max: <b>${max} ${esc(u)}</b></span>
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.8rem; color:#475569;">
      <div>Método Analítico: <b>${esc(res.metodo_analitico || 'Colorimétrico / Enzimático')}</b></div>
      <div>Equipo Utilizado: <b>${esc(res.equipo_utilizado || 'Analizador Automatizado')}</b></div>
    </div>
  </div>`;
}

/* ---------- 3. Urianálisis ---------- */
function renderUrianalisis(res) {
  const camposFisico = [
    ['Color', res.color || 'Amarillo claro'],
    ['Aspecto', res.aspecto || 'Limpio'],
    ['Densidad', res.densidad || '1.020'],
    ['pH', res.ph || '6.0'],
    ['Proteínas', res.proteinas || 'negativo'],
    ['Glucosa', res.glucosa || 'negativo'],
    ['Cetonas', res.cetonas || 'negativo'],
    ['Sangre', res.sangre || 'negativo'],
    ['Nitritos', res.nitritos || 'negativo'],
    ['Leucocitos', res.leucocitos_esterasa || 'negativo'],
  ];

  const camposSedimento = [
    ['Eritrocitos / campo', res.sedimento_eritrocitos ?? '0 - 2'],
    ['Leucocitos / campo', res.sedimento_leucocitos ?? '0 - 4'],
    ['Bacterias', res.sedimento_bacterias || 'Escasas'],
    ['Células epiteliales', res.sedimento_celulas_epiteliales || 'Escasas'],
    ['Cristales', res.sedimento_cristales || 'No se observan'],
    ['Cilindros', res.sedimento_cilindros || 'No se observan'],
  ];

  const renderBadgeValor = (v) => {
    const s = String(v).toLowerCase();
    if (s === 'negativo' || s === 'limpio' || s === 'escasas' || s === 'no se observan') {
      return `<span class="badge" style="background:#f0fdf4; color:#15803d;">${esc(v)}</span>`;
    }
    if (s.includes('+') || s === 'positivo' || s === 'abundantes' || s === 'turbio') {
      return `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">${esc(v)}</span>`;
    }
    return `<b>${esc(v)}</b>`;
  };

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">🧪 EXAMEN GENERAL DE ORINA (EGO)</span>
      <span class="esp-desc">Análisis físico-químico y de sedimento</span>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
      <div class="esp-subpanel">
        <b style="font-size:0.85rem; color:#475569; display:block; margin-bottom:10px;">📋 Tira Reactiva / Físico-Químico:</b>
        <table class="esp-mini-table">
          <tbody>
            ${camposFisico
              .map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right;">${renderBadgeValor(v)}</td></tr>`)
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="esp-subpanel">
        <b style="font-size:0.85rem; color:#475569; display:block; margin-bottom:10px;">🔬 Sedimento Microscópico (40X):</b>
        <table class="esp-mini-table">
          <tbody>
            ${camposSedimento
              .map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right;">${renderBadgeValor(v)}</td></tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

/* ---------- 4. Inmunología / Serología ---------- */
function renderInmunologia(res) {
  const cuali = String(res.resultado_cualitativo || 'negativo').toLowerCase();
  const esPositivo = cuali === 'positivo' || cuali === 'reactivo';
  const esIndeterminado = cuali === 'indeterminado';

  const estadoBadge = esPositivo
    ? `<div class="reactivo-banner positivo">⚠️ RESULTADO: REACTIVO / POSITIVO</div>`
    : esIndeterminado
    ? `<div class="reactivo-banner indeterminado">❓ RESULTADO: INDETERMINADO / DUDOSO</div>`
    : `<div class="reactivo-banner negativo">✅ RESULTADO: NO REACTIVO / NEGATIVO</div>`;

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">🛡️ INMUNOLOGÍA Y SEROLOGÍA</span>
      <span class="esp-desc">Técnica: ${esc(res.metodo || 'ELISA / Quimioluminiscencia')}</span>
    </div>

    ${estadoBadge}

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:14px;">
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Valor Cuantitativo</span>
        <b class="kpi-val">${res.resultado_cuantitativo != null ? res.resultado_cuantitativo : '—'} <small>${esc(res.unidad_medida || 'UI/mL')}</small></b>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Punto de Corte (Cut-off)</span>
        <b class="kpi-val">${res.punto_corte != null ? res.punto_corte : '—'} <small>${esc(res.unidad_medida || 'UI/mL')}</small></b>
      </div>
    </div>

    ${
      res.interpretacion
        ? `
    <div style="margin-top:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; font-size:0.85rem;">
      <span style="color:#64748b; font-weight:600;">Interpretación Clínica:</span>
      <p style="margin:4px 0 0; color:#1e293b;">${esc(res.interpretacion)}</p>
    </div>`
        : ''
    }
  </div>`;
}

/* ---------- 5. Microbiología ---------- */
function renderMicrobiologia(res) {
  const tieneAntibiograma = Array.isArray(res.antibiograma) && res.antibiograma.length > 0;

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">🦠 CULTIVO BACTERIOLÓGICO Y ANTIBIOGRAMA</span>
      <span class="esp-desc">Aislamiento e identificación microbiana</span>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:14px;">
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Microorganismo Aislado</span>
        <b style="font-size:1.1rem; color:#7e22ce; font-style:italic;">${esc(res.microorganismo_aislado || 'Sin desarrollo bacteriano')}</b>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Recuento de Colonias</span>
        <b style="font-size:1.1rem; color:#1e293b;">${esc(res.recuento_colonias || '—')}</b>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Tinción de Gram</span>
        <b style="font-size:1.05rem; color:#1e293b;">${esc(res.tincion_gram || 'No realizada')}</b>
      </div>
    </div>

    ${
      tieneAntibiograma
        ? `
    <div class="esp-subpanel" style="background:#faf5ff; border-color:#e9d5ff;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <b style="font-size:0.88rem; color:#6b21a8;">🧫 Antibiograma Automatizado (Prueba de Sensibilidad):</b>
        <span style="font-size:0.75rem; color:#7e22ce;">Concentración Mínima Inhibitoria (CMI)</span>
      </div>
      <table class="antibiograma-tabla">
        <thead>
          <tr>
            <th>Antibiótico Evaluado</th>
            <th style="text-align:center;">Sensibilidad</th>
            <th style="text-align:right;">CMI (µg/mL)</th>
          </tr>
        </thead>
        <tbody>
          ${res.antibiograma
            .map((a) => {
              const sens = String(a.antibiotico_sensibilidad || 'sensible').toLowerCase();
              const badgeClass =
                sens === 'sensible' ? 'sensible-badge' : sens === 'resistente' ? 'resistente-badge' : 'intermedio-badge';
              return `
              <tr>
                <td><b>${esc(a.antibiotico_nombre)}</b></td>
                <td style="text-align:center;"><span class="sens-pill ${badgeClass}">${esc(sens.toUpperCase())}</span></td>
                <td style="text-align:right;"><code>${a.antibiotico_cmi != null ? a.antibiotico_cmi : '—'}</code></td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>`
        : '<p style="font-size:0.82rem; color:#94a3b8; margin:0;">No se generó antibiograma (sin aislamiento patógeno).</p>'
    }
  </div>`;
}

/* ---------- 6. Coagulación ---------- */
function renderCoagulacion(res) {
  const inr = res.inr != null ? Number(res.inr) : null;
  const tp = res.tp_segundos != null ? Number(res.tp_segundos) : null;
  const ttpa = res.ttpa_segundos != null ? Number(res.ttpa_segundos) : null;

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">⏱️ PERFIL DE COAGULACIÓN Y HEMOSTASIA</span>
      <span class="esp-desc">Control de anticoagulación oral</span>
    </div>

    <div style="display:grid; grid-template-columns:1.2fr 2fr; gap:16px; align-items:stretch;">
      <div class="esp-kpi-box" style="text-align:center; padding:20px; display:flex; flex-direction:column; justify-content:center;">
        <span class="kpi-lbl">INR (International Normalized Ratio)</span>
        <b style="font-size:2.4rem; color:${inr && inr > 1.3 ? '#b45309' : 'var(--primary)'};">${inr != null ? inr.toFixed(2) : '—'}</b>
        <span style="font-size:0.75rem; color:#64748b; margin-top:6px;">Normal: 0.8 - 1.2 · Terapéutico: 2.0 - 3.0</span>
      </div>

      <div class="esp-grid-kpis" style="grid-template-columns:1fr 1fr;">
        <div class="esp-kpi-box">
          <span class="kpi-lbl">Tiempo de Protrombina (TP)</span>
          <b class="kpi-val">${tp != null ? tp : '—'} <small>seg</small></b>
          <span class="kpi-sub">Ref: 11.0 - 13.5 seg</span>
        </div>
        <div class="esp-kpi-box">
          <span class="kpi-lbl">TTPa</span>
          <b class="kpi-val">${ttpa != null ? ttpa : '—'} <small>seg</small></b>
          <span class="kpi-sub">Ref: 25.0 - 35.0 seg</span>
        </div>
        <div class="esp-kpi-box">
          <span class="kpi-lbl">Fibrinógeno</span>
          <b class="kpi-val">${res.fibrinogeno != null ? res.fibrinogeno : '—'} <small>mg/dL</small></b>
          <span class="kpi-sub">Ref: 200 - 400 mg/dL</span>
        </div>
        <div class="esp-kpi-box">
          <span class="kpi-lbl">Dímero D</span>
          <b class="kpi-val">${res.dimerod != null ? res.dimerod : '—'} <small>ng/mL</small></b>
          <span class="kpi-sub">Ref: &lt; 500 ng/mL</span>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- 7. Banco de Sangre ---------- */
function renderBancoSangre(res) {
  const grupo = res.grupo_abo || 'O';
  const rh = res.factor_rh === 'positivo' ? '+' : res.factor_rh === 'negativo' ? '-' : '';

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">💉 BANCO DE SANGRE E INMUNOHEMATOLOGÍA</span>
      <span class="esp-desc">Tipificación globular y pruebas pre-transfusionales</span>
    </div>

    <div style="display:grid; grid-template-columns:160px 1fr; gap:20px; align-items:center;">
      <div class="blood-type-badge">
        <span class="blood-lbl">GRUPO Y FACTOR</span>
        <b class="blood-val">${esc(grupo)}${esc(rh)}</b>
        <span class="blood-rh">${esc(res.factor_rh || 'Rh Positivo')}</span>
      </div>

      <div class="esp-subpanel">
        <b style="font-size:0.85rem; color:#475569; display:block; margin-bottom:8px;">Pruebas de Compatibilidad:</b>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between;">
            <span>Prueba Cruzada Mayor:</span>
            <span class="badge ${res.prueba_cruzada === 'incompatible' ? 'archivado' : 'completado'}">${esc(res.prueba_cruzada || 'COMPATIBLE')}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Coombs Directo:</span>
            <b>${esc(res.coombs_directo || 'negativo')}</b>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Coombs Indirecto:</span>
            <b>${esc(res.coombs_indirecto || 'negativo')}</b>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- 8. Biología Molecular ---------- */
function renderBiologiaMolecular(res) {
  const cuali = String(res.resultado_cualitativo || 'no detectado').toLowerCase();
  const detectado = cuali === 'detectado';

  return `
  <div class="esp-panel">
    <div class="esp-header">
      <span class="esp-tag">🧬 BIOLOGÍA MOLECULAR Y GENÉTICA</span>
      <span class="esp-desc">${esc(res.tipo_tecnica || 'RT-PCR en tiempo real')}</span>
    </div>

    <div class="reactivo-banner ${detectado ? 'positivo' : 'negativo'}">
      ${detectado ? '🚨 MATERIAL GENÉTICO DETECTADO' : '✅ NO DETECTADO (INDETECTABLE)'}
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:14px;">
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Gen o Región Diana</span>
        <b class="kpi-val" style="font-size:1.1rem; color:var(--primary);">${esc(res.gen_diana || 'Región conservada')}</b>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Carga Viral / Cuantificación</span>
        <b class="kpi-val">${res.carga_viral != null ? Number(res.carga_viral).toLocaleString() : '—'} <small>copias/mL</small></b>
      </div>
      <div class="esp-kpi-box">
        <span class="kpi-lbl">Límite de Detección</span>
        <b class="kpi-val">${res.limite_deteccion != null ? res.limite_deteccion : '20'} <small>copias/mL</small></b>
      </div>
    </div>
  </div>`;
}

/* ---------- Fallback Genérico ---------- */
function renderGenerico(res) {
  const entries = Object.entries(res).filter(([, v]) => v !== undefined && v !== null);
  if (!entries.length) return '<p class="vacio">Sin parámetros registrados para este estudio.</p>';
  return `
  <div class="res-grid">
    ${entries
      .map(
        ([k, v]) => `
      <div class="res-item">
        <span>${esc(k)}</span>
        <b>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</b>
      </div>`
      )
      .join('')}
  </div>`;
}
