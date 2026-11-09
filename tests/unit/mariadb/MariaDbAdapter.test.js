import { describe, it, expect, vi } from "vitest";
import { MariaDbAdapter } from "../../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js";

describe("I4-07 - MariaDbAdapter (Pacientes, Historial, Crecimiento y Vacunas)", () => {
  it("devuelve null cuando el paciente no existe", async () => {
    const conn = {
      query: vi.fn().mockResolvedValue([]),
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn().mockResolvedValue(conn),
    };

    const adaptador = new MariaDbAdapter(pool);
    const paciente = await adaptador.obtenerPaciente("999");

    expect(paciente).toBeNull();
    expect(conn.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM paciente WHERE id_paciente = ?"),
      ["999"]
    );
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("crea un paciente con su historial activo y tutor principal en una sola transacción", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce({ insertId: 5 }) // INSERT paciente
        .mockResolvedValueOnce([]) // INSERT historial_clinico
        .mockResolvedValueOnce([]) // SELECT tutor existente (no hay)
        .mockResolvedValueOnce({ insertId: 8 }) // INSERT tutor
        .mockResolvedValueOnce([]) // INSERT paciente_tutor
        .mockResolvedValueOnce([]), // COMMIT
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn().mockResolvedValue(conn),
    };

    const adaptador = new MariaDbAdapter(pool);
    const paciente = await adaptador.crearPaciente({
      documento: "CUI-100200300",
      nombres: "Sofia",
      apellidos: "Gomez",
      fechaNacimiento: "2021-03-10",
      detallesInstitucion: {
        grupoSanguineo: "A+",
        tutorPrincipal: {
          dpi: "1234567890101",
          nombres: "Lucia",
          apellidos: "Gomez",
          telefono: "555-9876",
          parentesco: "Madre",
        },
      },
    });

    expect(paciente.id).toBe("5");
    expect(paciente.nombres).toBe("Sofia");
    expect(paciente.detallesInstitucion.tutorPrincipal.dpi).toBe("1234567890101");
    expect(conn.query).toHaveBeenCalledWith("BEGIN");
    expect(conn.query).toHaveBeenCalledWith("COMMIT");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("lista pacientes y convierte identificadores a string", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([{ total: 1 }]) // COUNT
        .mockResolvedValueOnce([{
          id_paciente: 5,
          documento: "CUI-100200300",
          nombres: "Sofia",
          apellidos: "Gomez",
          fecha_nacimiento: "2021-03-10",
        }]), // ITEMS
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn().mockResolvedValue(conn),
    };

    const adaptador = new MariaDbAdapter(pool);
    const resultado = await adaptador.listarPacientes({
      texto: "Sofia",
      pagina: 1,
      limite: 10,
    });

    expect(resultado.total).toBe(1);
    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].id).toBe("5");
    expect(resultado.items[0].nombres).toBe("Sofia");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("revierte la transacción si el historial no está disponible o ya fue archivado", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce({ affectedRows: 0 }) // UPDATE sin filas
        .mockResolvedValueOnce([]), // ROLLBACK
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn().mockResolvedValue(conn),
    };

    const adaptador = new MariaDbAdapter(pool);

    await expect(
      adaptador.archivarHistorial("999", {
        tipo: "traslado",
        detalle: "Cambio de clínica",
      })
    ).rejects.toMatchObject({
      codigo: "HISTORIAL_NO_DISPONIBLE",
    });

    expect(conn.query).toHaveBeenCalledWith("ROLLBACK");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("rechaza el registro de control de crecimiento si el paciente no tiene historial activo", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([{ estado: "archivado" }]) // SELECT historial
        .mockResolvedValueOnce([]), // ROLLBACK
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn().mockResolvedValue(conn),
    };

    const adaptador = new MariaDbAdapter(pool);

    await expect(
      adaptador.registrarControlCrecimiento("5", {
        edadMeses: 24,
        pesoKg: 12.5,
        tallaCm: 86,
      })
    ).rejects.toMatchObject({
      codigo: "HISTORIAL_NO_ACTIVO",
    });

    expect(conn.query).toHaveBeenCalledWith("ROLLBACK");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("registra un control de crecimiento exitosamente en un paciente activo", async () => {
    const conn = {
      query: vi.fn()
        .mockResolvedValueOnce([]) // BEGIN
        .mockResolvedValueOnce([{ estado: "activo" }]) // SELECT historial
        .mockResolvedValueOnce({ insertId: 3 }) // INSERT control
        .mockResolvedValueOnce([]), // COMMIT
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn().mockResolvedValue(conn),
    };

    const adaptador = new MariaDbAdapter(pool);
    const control = await adaptador.registrarControlCrecimiento("5", {
      edadMeses: 24,
      pesoKg: 12.5,
      tallaCm: 86,
      perimetroCefalicoCm: 48,
      imc: 16.9,
      percentilOms: "P50",
    });

    expect(control.id).toBe("3");
    expect(control.pacienteId).toBe("5");
    expect(control.pesoKg).toBe(12.5);
    expect(control.tallaCm).toBe(86);
    expect(conn.query).toHaveBeenCalledWith("COMMIT");
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it("ejecuta ping() verificando latencia del motor", async () => {
    const conn = {
      query: vi.fn().mockResolvedValue([{ conectado: 1 }]),
      release: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn().mockResolvedValue(conn),
    };

    const adaptador = new MariaDbAdapter(pool);
    const res = await adaptador.ping();

    expect(res.ok).toBe(true);
    expect(res.motor).toBe("mariadb");
    expect(typeof res.latenciaMs).toBe("number");
    expect(conn.release).toHaveBeenCalledOnce();
  });
});
