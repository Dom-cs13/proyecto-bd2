import { expect, it } from 'vitest';
import { editarPacienteLocal, motivoArchivoLocal, pacienteLocal } from '../../src/interfaces/http/validators/pacientesLocales.js';

it('la edición no permite sustituir identidad, institución, id ni estado de archivo', () => {
  for (const datos of [{ documentoIdentidad: 'OTRO' }, { id: 'OTRO' }, { institucion: 'hospital' }, { activo: false }, { detallesInstitucion: {} }, {}]) {
    expect(editarPacienteLocal.safeParse(datos).success).toBe(false);
  }
});
it('el alta no permite fechas imposibles ni documento vacío y elimina identificadores de almacenamiento', () => {
  const datos = { nombre: 'Paciente', apellidos: 'Ficticio', genero: 'Otro', documentoIdentidad: 'PRUEBA', fechaNacimiento: '2000-01-01', _id: 'inyectado' };
  expect(pacienteLocal.parse(datos)._id).toBeUndefined();
  expect(pacienteLocal.safeParse({ ...datos, fechaNacimiento: '2000-02-31' }).success).toBe(false);
  expect(pacienteLocal.safeParse({ ...datos, documentoIdentidad: ' ' }).success).toBe(false);
});
it('el archivado exige justificación explícita', () => {
  expect(motivoArchivoLocal.safeParse(undefined).success).toBe(false);
  expect(motivoArchivoLocal.safeParse({ tipo: 'otro', detalle: '' }).success).toBe(false);
  expect(motivoArchivoLocal.parse('Justificación ficticia')).toEqual({ tipo: 'administrativo', detalle: 'Justificación ficticia' });
});
it('editar un campo no rellena ni borra otros campos omitidos', () => {
  expect(editarPacienteLocal.parse({ telefono: '12345678' })).toEqual({ telefono: '12345678' });
});
