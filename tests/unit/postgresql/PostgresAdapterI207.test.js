import { describe, it, expect, vi } from "vitest";
import { PostgresAdapter } from "../../../src/infrastructure/adapters/postgresql/PostgresAdapter.js";

describe("I2-07 - Operaciones clinicas", () => {
  it("rechaza consultas sin historial activo", async () => {
    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(cliente) };
    const adapter = new PostgresAdapter(pool);

    await expect(adapter.crearConsulta({
      pacienteId: 3,
      usuarioId: 2,
    })).rejects.toMatchObject({ codigo: "HISTORIAL_NO_ACTIVO" });

    expect(cliente.query).toHaveBeenCalledWith("ROLLBACK");
    expect(cliente.release).toHaveBeenCalledOnce();
  });

  it("registra un diagnostico en una consulta disponible", async () => {
    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id_consulta: 4 }] })
        .mockResolvedValueOnce({
          rows: [{
            id_diagnostico: 7,
            id_consulta: 4,
            descripcion: "Caries de prueba",
            observaciones: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(cliente) };
    const adapter = new PostgresAdapter(pool);

    const diagnostico = await adapter.crearDiagnostico({
      consultaId: 4,
      descripcion: "Caries de prueba",
    });

    expect(diagnostico.id).toBe("7");
    expect(diagnostico.consultaId).toBe("4");
    expect(cliente.query).toHaveBeenCalledWith("COMMIT");
    expect(cliente.release).toHaveBeenCalledOnce();
  });

  it("revierte una receta si falla uno de sus medicamentos", async () => {
    const errorFK = Object.assign(new Error("Medicamento inexistente"), {
      code: "23503",
    });

    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id_consulta: 4 }] })
        .mockResolvedValueOnce({
          rows: [{
            id_receta: 8,
            id_consulta: 4,
            fecha: new Date("2026-11-01T12:00:00Z"),
            indicaciones_generales: null,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id_detalle_receta: 1,
            id_medicamento: 1,
            dosis: "1 tableta",
            frecuencia: "Cada 12 horas",
          }],
        })
        .mockRejectedValueOnce(errorFK)
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };

    const pool = { connect: vi.fn().mockResolvedValue(cliente) };
    const adapter = new PostgresAdapter(pool);

    await expect(adapter.crearReceta({
      consultaId: 4,
      medicamentos: [
        { medicamentoId: 1, dosis: "1 tableta", frecuencia: "Cada 12 horas" },
        { medicamentoId: -999, dosis: "1 tableta", frecuencia: "Cada 8 horas" },
      ],
    })).rejects.toMatchObject({ code: "23503" });

    expect(cliente.query).toHaveBeenCalledWith("ROLLBACK");
    expect(cliente.query).not.toHaveBeenCalledWith("COMMIT");
    expect(cliente.release).toHaveBeenCalledOnce();
  });
});
