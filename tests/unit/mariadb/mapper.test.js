import { describe, it, expect } from "vitest";
import {
  pacienteDesdeFila,
  historialDesdeFila,
  consultaDesdeFila,
  controlCrecimientoDesdeFila,
  vacunaAplicadaDesdeFila,
  fechaSoloDiaISO,
  fechaHoraISO,
} from "../../../src/infrastructure/adapters/mariadb/mapper.js";

describe("I4-07 - Mapper MariaDB (Centro Pediatrico)", () => {
  it("convierte un paciente pediátrico al formato de la API con sus detalles institucionales", () => {
    const paciente = pacienteDesdeFila({
      id_paciente: 12,
      documento: "CUI-102938475",
      nombres: "Mateo",
      apellidos: "Morales",
      fecha_nacimiento: "2020-05-15",
      sexo: "M",
      grupo_sanguineo: "O+",
      telefono: "555-1234",
      correo: "tutor@example.invalid",
      direccion: "Zona 1, Ciudad",
    }, {
      tutorPrincipal: {
        id: "1",
        dpi: "2093847580101",
        nombres: "Carlos",
        apellidos: "Morales",
        parentesco: "Padre",
        esPrincipal: true,
      },
    });

    expect(paciente.id).toBe("12");
    expect(paciente.documento).toBe("CUI-102938475");
    expect(paciente.nombres).toBe("Mateo");
    expect(paciente.fechaNacimiento).toBe("2020-05-15");
    expect(paciente.detallesInstitucion.grupoSanguineo).toBe("O+");
    expect(paciente.detallesInstitucion.tutorPrincipal.nombres).toBe("Carlos");
    expect(paciente.detallesInstitucion.tutorPrincipal.esPrincipal).toBe(true);
    expect(paciente.detallesInstitucion.controlesCrecimiento).toEqual([]);
    expect(paciente.detallesInstitucion.vacunasAplicadas).toEqual([]);
  });

  it("convierte un historial clínico archivado con su motivo", () => {
    const historial = historialDesdeFila({
      id_historial: 4,
      id_paciente: 12,
      estado: "archivado",
      fecha_creacion: new Date("2026-01-10T08:00:00Z"),
      fecha_archivo: new Date("2026-03-01T12:30:00Z"),
      motivo_archivo_tipo: "traslado",
      motivo_archivo_detalle: "Cambio de residencia a otra ciudad",
    });

    expect(historial.id).toBe("4");
    expect(historial.pacienteId).toBe("12");
    expect(historial.estado).toBe("archivado");
    expect(historial.fechaCreacion).toBe("2026-01-10T08:00:00.000Z");
    expect(historial.fechaArchivo).toBe("2026-03-01T12:30:00.000Z");
    expect(historial.motivoArchivo).toEqual({
      tipo: "traslado",
      detalle: "Cambio de residencia a otra ciudad",
    });
  });

  it("convierte una consulta médica pediátrica", () => {
    const consulta = consultaDesdeFila({
      id_consulta: 9,
      id_paciente: 12,
      id_usuario: 3,
      id_cita: 15,
      fecha: new Date("2026-04-02T10:00:00Z"),
      motivo: "Control de rutina y fiebre leve",
      observaciones: "Faringe ligeramente hiperémica",
      estado: "borrador",
    });

    expect(consulta.id).toBe("9");
    expect(consulta.pacienteId).toBe("12");
    expect(consulta.usuarioId).toBe("3");
    expect(consulta.citaId).toBe("15");
    expect(consulta.fecha).toBe("2026-04-02T10:00:00.000Z");
    expect(consulta.motivo).toBe("Control de rutina y fiebre leve");
    expect(consulta.detallesInstitucion).toEqual({});
  });

  it("convierte controles de crecimiento y desarrollo", () => {
    const control = controlCrecimientoDesdeFila({
      id_control: 1,
      id_paciente: 12,
      id_consulta: 9,
      fecha: "2026-04-02",
      edad_meses: 24,
      peso_kg: "12.50",
      talla_cm: "86.00",
      perimetro_cefalico_cm: "48.20",
      imc: "16.90",
      percentil_oms: "P50",
    });

    expect(control.id).toBe("1");
    expect(control.pacienteId).toBe("12");
    expect(control.consultaId).toBe("9");
    expect(control.edadMeses).toBe(24);
    expect(control.pesoKg).toBe(12.5);
    expect(control.tallaCm).toBe(86);
    expect(control.perimetroCefalicoCm).toBe(48.2);
    expect(control.imc).toBe(16.9);
    expect(control.percentilOms).toBe("P50");
  });

  it("convierte una vacuna aplicada del carnet infantil", () => {
    const vacuna = vacunaAplicadaDesdeFila({
      id_vacuna_aplicada: 5,
      id_paciente: 12,
      id_vacuna: 2,
      nombre: "Pentavalente",
      numero_dosis: 3,
      id_consulta: 9,
      fecha_aplicacion: "2026-04-02",
      lote: "LOTE-2026-XYZ",
      reaccion_adversa: "Fiebre leve autolimitada",
    });

    expect(vacuna.id).toBe("5");
    expect(vacuna.pacienteId).toBe("12");
    expect(vacuna.vacunaId).toBe("2");
    expect(vacuna.nombreVacuna).toBe("Pentavalente");
    expect(vacuna.numeroDosis).toBe(3);
    expect(vacuna.lote).toBe("LOTE-2026-XYZ");
    expect(vacuna.reaccionAdversa).toBe("Fiebre leve autolimitada");
  });

  it("gestiona formatos de fecha fechaSoloDiaISO y fechaHoraISO limpiamente", () => {
    expect(fechaSoloDiaISO(null)).toBeNull();
    expect(fechaSoloDiaISO("2026-11-04")).toBe("2026-11-04");
    expect(fechaHoraISO(null)).toBeNull();
    expect(fechaHoraISO("2026-11-04T12:00:00.000Z")).toBe("2026-11-04T12:00:00.000Z");
  });
});
