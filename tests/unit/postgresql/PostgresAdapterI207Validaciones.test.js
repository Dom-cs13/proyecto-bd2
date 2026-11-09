import { describe, it, expect, vi } from "vitest";
import { PostgresAdapter } from "../../../src/infrastructure/adapters/postgresql/PostgresAdapter.js";

describe("I2-07 - Validaciones clinicas", () => {
  it("crea un tratamiento asociado a un diagnostico", async () => {
    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id_diagnostico: 5 }] })
        .mockResolvedValueOnce({
          rows: [{
            id_tratamiento: 9,
            id_diagnostico: 5,
            descripcion: "Limpieza dental",
            fecha_inicio: null,
            fecha_fin: null,
            estado: "activo",
            observaciones: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };

    const adapter = new PostgresAdapter({
      connect: vi.fn().mockResolvedValue(cliente),
    });

    const resultado = await adapter.crearTratamiento({
      diagnosticoId: 5,
      descripcion: "Limpieza dental",
    });

    expect(resultado.id).toBe("9");
    expect(resultado.diagnosticoId).toBe("5");
    expect(resultado.estado).toBe("activo");
    expect(cliente.query).toHaveBeenCalledWith("COMMIT");
    expect(cliente.release).toHaveBeenCalledOnce();
  });

  it("rechaza diagnosticos cuando la consulta no esta disponible", async () => {
    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };

    const adapter = new PostgresAdapter({
      connect: vi.fn().mockResolvedValue(cliente),
    });

    await expect(adapter.crearDiagnostico({
      consultaId: 999,
      descripcion: "Diagnostico de prueba",
    })).rejects.toMatchObject({
      codigo: "CONSULTA_NO_DISPONIBLE",
    });

    expect(cliente.query).toHaveBeenCalledWith("ROLLBACK");
    expect(cliente.release).toHaveBeenCalledOnce();
  });
});
