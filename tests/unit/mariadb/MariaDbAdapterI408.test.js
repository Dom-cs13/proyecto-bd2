import { describe, it, expect, vi } from "vitest";
import { MariaDbAdapter } from "../../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js";

describe("I4-08 - Operaciones clinicas pediatricas", () => {
  it("rechaza consultas sin historial activo", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([]) // SELECT historial (vacio)
        .mockResolvedValueOnce([]), // ROLLBACK
      release: vi.fn(),
    };
    const pool = { getConnection: vi.fn().mockResolvedValue(conn) };
    const adapter = new MariaDbAdapter(pool);

    await expect(adapter.crearConsulta({
      pacienteId: "3",
      usuarioId: "2",
    })).rejects.toMatchObject({ codigo: "HISTORIAL_NO_ACTIVO" });

    expect(conn.query).toHaveBeenCalledWith("ROLLBACK");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("registra un diagnostico en una consulta disponible", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([{ id_consulta: 4 }]) // SELECT consulta activa
        .mockResolvedValueOnce({ insertId: 7 }) // INSERT diagnostico
        .mockResolvedValueOnce([]), // COMMIT
      release: vi.fn(),
    };
    const pool = { getConnection: vi.fn().mockResolvedValue(conn) };
    const adapter = new MariaDbAdapter(pool);

    const diagnostico = await adapter.crearDiagnostico({
      consultaId: "4",
      descripcion: "Faringoamigdalitis aguda",
    });

    expect(diagnostico.id).toBe("7");
    expect(diagnostico.consultaId).toBe("4");
    expect(conn.query).toHaveBeenCalledWith("COMMIT");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("revierte una receta si falla uno de sus medicamentos", async () => {
    const errorFK = Object.assign(new Error("Medicamento inexistente"), {
      code: "ER_NO_REFERENCED_ROW_2",
    });

    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([{ id_consulta: 4 }]) // SELECT consulta
        .mockResolvedValueOnce({ insertId: 8 }) // INSERT receta
        .mockResolvedValueOnce({ insertId: 1 }) // INSERT primer detalle
        .mockRejectedValueOnce(errorFK) // Segundo detalle falla
        .mockResolvedValueOnce([]), // ROLLBACK
      release: vi.fn(),
    };

    const pool = { getConnection: vi.fn().mockResolvedValue(conn) };
    const adapter = new MariaDbAdapter(pool);

    await expect(adapter.crearReceta({
      consultaId: "4",
      medicamentos: [
        { medicamentoId: "1", dosis: "5ml", frecuencia: "Cada 8 horas" },
        { medicamentoId: "-999", dosis: "10ml", frecuencia: "Cada 12 horas" },
      ],
    })).rejects.toMatchObject({ code: "ER_NO_REFERENCED_ROW_2" });

    expect(conn.query).toHaveBeenCalledWith("ROLLBACK");
    expect(conn.query).not.toHaveBeenCalledWith("COMMIT");
    expect(conn.release).toHaveBeenCalledOnce();
  });
});
