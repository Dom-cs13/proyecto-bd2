import { buscarEnRed, historialEnRed } from '../api/red.js';

// Se monta en el drawer o modal que ya utiliza cada institución.
export async function consultarRed(valor, contenedor, claseTabla = '') {
  contenedor.textContent = 'Consultando las cuatro instituciones…';
  try {
    const { resultados } = await buscarEnRed(valor.trim());
    const tabla = document.createElement('table');
    tabla.className = claseTabla;
    const cabecera = tabla.createTHead().insertRow();
    for (const titulo of ['Institución', 'Paciente', 'Estado']) {
      const th = document.createElement('th'); th.textContent = titulo; cabecera.append(th);
    }
    const cuerpo = tabla.createTBody();
    for (const resultado of resultados) {
      if (!resultado.items.length) {
        const fila = cuerpo.insertRow();
        for (const texto of [resultado.institucion, 'Sin coincidencias', resultado.estado]) fila.insertCell().textContent = texto;
      }
      for (const paciente of resultado.items) {
        const fila = cuerpo.insertRow();
        fila.insertCell().textContent = resultado.institucion;
        const boton = document.createElement('button');
        boton.type = 'button'; boton.className = 'btn btn-outline btn-sm';
        boton.textContent = `${paciente.nombre} ${paciente.apellidos} · ${paciente.documentoIdentidad}`;
        fila.insertCell().append(boton);
        const estado = fila.insertCell(); estado.textContent = 'Solo lectura';
        boton.addEventListener('click', async () => {
          boton.disabled = true;
          try {
            const datos = await historialEnRed(resultado.institucion, paciente.id);
            estado.textContent = `Historial ${datos.historial.estado}. ${datos.consultas.length} consultas autorizadas. Datos clínicos externos restringidos.`;
          } catch (error) { estado.textContent = error.message; }
          finally { boton.disabled = false; }
        });
      }
    }
    contenedor.replaceChildren(tabla);
  } catch (error) { contenedor.textContent = error.message; }
}
