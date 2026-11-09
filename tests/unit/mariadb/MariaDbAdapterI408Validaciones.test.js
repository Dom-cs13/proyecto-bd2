import { describe, it, expect, vi } from "vitest";
import { MariaDbAdapter } from "../../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js";

describe("I4-08 - Validaciones clinicas pediatricas", () => {
  it("crea un tratamiento asociado a un diagnostico", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([{ id_diagnostico: 5 }]) // SELECT diagnostico
        .mockResolvedValueOnce({ insertId: 9 }) // INSERT tratamiento
        .mockResolvedValueOnce([]), // COMMIT
      release: vi.fn(),
    };

    const adapter = new MariaDbAdapter({
      getConnection: vi.fn().mockResolvedValue(conn),
    });

    const resultado = await adapter.crearTratamiento({
      diagnosticoId: "5",
      descripcion: "Nebulizaciones con solucion salina",
    });

    expect(resultado.id).toBe("9");
    expect(resultado.diagnosticoId).toBe("5");
    expect(resultado.estado).toBe("activo");
    expect(conn.query).toHaveBeenCalledWith("COMMIT");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("rechaza diagnosticos cuando la consulta no esta disponible o ya no es borrador", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([]) // SELECT consulta vacio
        .mockResolvedValueOnce([]), // ROLLBACK
      release: vi.fn(),
    };

    const adapter = new MariaDbAdapter({
      getConnection: vi.fn().mockResolvedValue(conn),
    });

    await expect(adapter.crearDiagnostico({
      consultaId: "999",
      descripcion: "Diagnostico de prueba",
    })).rejects.toMatchObject({
      codigo: "CONSULTA_NO_DISPONIBLE",
    });

    expect(conn.query).toHaveBeenCalledWith("ROLLBACK");
    expect(conn.release).toHaveBeenCalledOnce();
  });
});
