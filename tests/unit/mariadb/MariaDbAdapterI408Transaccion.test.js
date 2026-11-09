import { describe, it, expect, vi } from "vitest";
import { MariaDbAdapter } from "../../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js";

describe("I4-08 - Transaccion clinica pediatrica completa", () => {
  it("revierte toda la atencion pediatrica cuando falla un medicamento", async () => {
    const errorFK = Object.assign(new Error("Medicamento inexistente"), {
      code: "ER_NO_REFERENCED_ROW_2",
    });

    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([{ estado: "activo" }]) // SELECT historial
        .mockResolvedValueOnce({ insertId: 10 }) // INSERT consulta
        .mockResolvedValueOnce({ insertId: 20 }) // INSERT diagnostico
        .mockResolvedValueOnce({ insertId: 30 }) // INSERT tratamiento
        .mockResolvedValueOnce({ insertId: 40 }) // INSERT receta
        .mockRejectedValueOnce(errorFK) // INSERT detalle_receta falla
        .mockResolvedValueOnce([]), // ROLLBACK
      release: vi.fn(),
    };

    const adapter = new MariaDbAdapter({
      getConnection: vi.fn().mockResolvedValue(conn),
    });

    await expect(adapter.registrarAtencionCompleta({
      pacienteId: "3",
      usuarioId: "2",
      motivo: "Evaluacion general",
      diagnosticos: [{
        descripcion: "Rinofaringitis",
        tratamientos: [{ descripcion: "Hidratacion y reposo" }],
      }],
      receta: {
        medicamentos: [{
          medicamentoId: "-999999",
          dosis: "5ml",
          frecuencia: "Cada 8 horas",
        }],
      },
    })).rejects.toMatchObject({ code: "ER_NO_REFERENCED_ROW_2" });

    expect(conn.query).toHaveBeenCalledWith("ROLLBACK");
    expect(conn.query).not.toHaveBeenCalledWith("COMMIT");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("confirma una atencion pediatrica completa cuando todas las operaciones funcionan", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([{ estado: "activo" }]) // SELECT historial
        .mockResolvedValueOnce({ insertId: 10 }) // INSERT consulta
        .mockResolvedValueOnce({ insertId: 20 }) // INSERT diagnostico
        .mockResolvedValueOnce({ insertId: 30 }) // INSERT tratamiento
        .mockResolvedValueOnce({ insertId: 40 }) // INSERT receta
        .mockResolvedValueOnce({ insertId: 50 }) // INSERT detalle_receta
        .mockResolvedValueOnce([]), // COMMIT
      release: vi.fn(),
    };

    const adapter = new MariaDbAdapter({
      getConnection: vi.fn().mockResolvedValue(conn),
    });

    const resultado = await adapter.registrarAtencionCompleta({
      pacienteId: "3",
      usuarioId: "2",
      motivo: "Revision del menor",
      diagnosticos: [{
        descripcion: "Bronquiolitis leve",
        tratamientos: [{ descripcion: "Terapia respiratoria y lavado nasal" }],
      }],
      receta: {
        medicamentos: [{
          medicamentoId: "1",
          dosis: "2.5ml",
          frecuencia: "Cada 12 horas",
        }],
      },
    });

    expect(resultado.consulta.id).toBe("10");
    expect(resultado.diagnosticos).toHaveLength(1);
    expect(resultado.diagnosticos[0].tratamientos).toHaveLength(1);
    expect(resultado.receta.medicamentos).toHaveLength(1);
    expect(conn.query).toHaveBeenCalledWith("COMMIT");
    expect(conn.query).not.toHaveBeenCalledWith("ROLLBACK");
    expect(conn.release).toHaveBeenCalledOnce();
  });
});
