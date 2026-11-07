import { describe, it, expect } from "vitest";
import {
  pacienteDesdeFila,
  historialDesdeFila,
  consultaDesdeFila,
} from "../../../src/infrastructure/adapters/postgresql/mapper.js";

describe("I2-06 - Mapper PostgreSQL", () => {
  it("convierte un paciente al formato de la API", () => {
    const paciente = pacienteDesdeFila({
      id_paciente: 5,
      nombres: "Ana",
      apellidos: "Lopez",
      fecha_nacimiento: "2000-01-01",
      sexo: "F",
      telefono: null,
      correo: null,
      direccion: null,
    });

    expect(paciente.id).toBe("5");
    expect(paciente.fechaNacimiento).toBe("2000-01-01");
    expect(paciente.nombres).toBe("Ana");
    expect(paciente.detallesInstitucion).toEqual({});
  });

  it("convierte un historial archivado", () => {
    const historial = historialDesdeFila({
      id_historial: 3,
      id_paciente: 5,
      estado: "archivado",
      fecha_creacion: new Date("2026-01-01T10:00:00Z"),
      fecha_archivo: new Date("2026-02-01T10:00:00Z"),
      motivo_archivo_tipo: "administrativo",
      motivo_archivo_detalle: "Prueba",
    });

    expect(historial.pacienteId).toBe("5");
    expect(historial.estado).toBe("archivado");
    expect(historial.motivoArchivo.tipo).toBe("administrativo");
  });

  it("convierte una consulta sin poliza", () => {
    const consulta = consultaDesdeFila({
      id_consulta: 8,
      id_paciente: 5,
      id_usuario: 2,
      id_cita: null,
      id_poliza: null,
      fecha: new Date("2026-03-01T10:00:00Z"),
      motivo: "Revision",
      observaciones: null,
      estado: "borrador",
    });

    expect(consulta.id).toBe("8");
    expect(consulta.pacienteId).toBe("5");
    expect(consulta.fecha).toBe("2026-03-01T10:00:00.000Z");
    expect(consulta.detallesInstitucion.polizaId).toBeNull();
  });
  it.each(['constructor', '__proto__', 'toString'])('un sexo heredado %s no filtra propiedades del prototipo', (sexo) => {
    const paciente = pacienteDesdeFila({ id_paciente: 7, sexo });
    expect(paciente.genero).toBe('Otro');
  });
});
