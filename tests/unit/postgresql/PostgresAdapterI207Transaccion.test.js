import { describe, it, expect, vi } from "vitest";
import { PostgresAdapter } from "../../../src/infrastructure/adapters/postgresql/PostgresAdapter.js";

describe("I2-07 - Transaccion clinica completa", () => {
  it("revierte toda la atencion cuando falla un medicamento", async () => {
    const errorFK = Object.assign(new Error("Medicamento inexistente"), {
      code: "23503",
    });

    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ estado: "activo" }] })
        .mockResolvedValueOnce({
          rows: [{ id_consulta: 10, id_paciente: 3, id_usuario: 2, estado: "borrador" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_diagnostico: 20, descripcion: "Diagnostico" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_tratamiento: 30, descripcion: "Tratamiento" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_receta: 40, id_consulta: 10 }],
        })
        .mockRejectedValueOnce(errorFK)
        .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
      release: vi.fn(),
    };

    const adapter = new PostgresAdapter({
      connect: vi.fn().mockResolvedValue(cliente),
    });

    await expect(adapter.registrarAtencionCompleta({
      pacienteId: 3,
      usuarioId: 2,
      motivo: "Prueba",
      diagnosticos: [{
        descripcion: "Diagnostico",
        tratamientos: [{ descripcion: "Tratamiento" }],
      }],
      receta: {
        medicamentos: [{
          medicamentoId: -999999,
          dosis: "1 tableta",
          frecuencia: "Cada 12 horas",
        }],
      },
    })).rejects.toMatchObject({ code: "23503" });

    expect(cliente.query).toHaveBeenCalledWith("ROLLBACK");
    expect(cliente.query).not.toHaveBeenCalledWith("COMMIT");
    expect(cliente.release).toHaveBeenCalledOnce();
  });

  it("confirma una atencion completa cuando todas las operaciones funcionan", async () => {
    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ estado: "activo" }] })
        .mockResolvedValueOnce({
          rows: [{
            id_consulta: 10,
            id_paciente: 3,
            id_usuario: 2,
            id_cita: null,
            id_poliza: null,
            fecha: new Date("2026-11-01T12:00:00Z"),
            motivo: "Revision",
            observaciones: null,
            estado: "borrador",
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_diagnostico: 20, descripcion: "Diagnostico" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_tratamiento: 30, descripcion: "Tratamiento" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_receta: 40, id_consulta: 10 }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_detalle_receta: 50, id_medicamento: 1 }],
        })
        .mockResolvedValueOnce({ rows: [] }), // COMMIT
      release: vi.fn(),
    };

    const adapter = new PostgresAdapter({
      connect: vi.fn().mockResolvedValue(cliente),
    });

    const resultado = await adapter.registrarAtencionCompleta({
      pacienteId: 3,
      usuarioId: 2,
      motivo: "Revision",
      diagnosticos: [{
        descripcion: "Diagnostico",
        tratamientos: [{ descripcion: "Tratamiento" }],
      }],
      receta: {
        medicamentos: [{
          medicamentoId: 1,
          dosis: "1 tableta",
          frecuencia: "Cada 12 horas",
        }],
      },
    });

    expect(resultado.consulta.id).toBe("10");
    expect(resultado.diagnosticos).toHaveLength(1);
    expect(resultado.diagnosticos[0].tratamientos).toHaveLength(1);
    expect(resultado.receta.medicamentos).toHaveLength(1);
    expect(cliente.query).toHaveBeenCalledWith("COMMIT");
    expect(cliente.query).not.toHaveBeenCalledWith("ROLLBACK");
    expect(cliente.release).toHaveBeenCalledOnce();
  });

});
