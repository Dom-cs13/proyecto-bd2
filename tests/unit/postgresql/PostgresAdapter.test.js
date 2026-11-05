import { describe, it, expect, vi } from "vitest";
import { PostgresAdapter } from "../../../src/infrastructure/adapters/postgresql/PostgresAdapter.js";

describe("I2-06 - PostgresAdapter", () => {
  it("devuelve null cuando el paciente no existe", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    const adaptador = new PostgresAdapter(pool);
    const paciente = await adaptador.obtenerPaciente("999");

    expect(paciente).toBeNull();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM public.paciente"),
      ["999"]
    );
  });

  it("lista pacientes y convierte los identificadores", async () => {
    const pool = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            id_paciente: 7,
            nombres: "Ana",
            apellidos: "Lopez",
            fecha_nacimiento: "2000-01-01",
          }],
        }),
    };

    const adaptador = new PostgresAdapter(pool);
    const resultado = await adaptador.listarPacientes({
      texto: "Ana",
      pagina: 1,
      limite: 10,
    });

    expect(resultado.total).toBe(1);
    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].id).toBe("7");
  });

  it("revierte la transaccion si el historial no esta disponible", async () => {
    const cliente = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
      release: vi.fn(),
    };

    const pool = {
      connect: vi.fn().mockResolvedValue(cliente),
    };

    const adaptador = new PostgresAdapter(pool);

    await expect(
      adaptador.archivarHistorial("999", {
        tipo: "administrativo",
        detalle: "Prueba",
      })
    ).rejects.toMatchObject({
      codigo: "HISTORIAL_NO_DISPONIBLE",
    });

    expect(cliente.query).toHaveBeenCalledWith("ROLLBACK");
    expect(cliente.release).toHaveBeenCalledOnce();
  });
});
