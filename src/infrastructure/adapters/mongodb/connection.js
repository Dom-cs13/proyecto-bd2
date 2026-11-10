import { MongoClient } from 'mongodb';
import { MotorNoDisponible } from '../../../domain/errores.js';

let cliente = null;
let baseDatos = null;

export async function obtenerConexionMongo() {
  if (baseDatos) {
    return { cliente, db: baseDatos };
  }

  const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!rawUri) {
    throw new MotorNoDisponible('Hospital General', 'La variable MONGO_URI (o MONGODB_URI) no está configurada.');
  }

  const nombreEnUri = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(rawUri)?.[1];
  const dbName = process.env.MONGO_DB || process.env.MONGODB_DB ||
    (nombreEnUri ? decodeURIComponent(nombreEnUri) : 'hospital_general');

  try {
    // El driver oficial resuelve SRV/TXT y conserva authSource, replicaSet y TLS.
    cliente = new MongoClient(rawUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await cliente.connect();
    baseDatos = cliente.db(dbName);
    return { cliente, db: baseDatos };
  } catch {
    await cliente?.close().catch(() => {});
    cliente = null;
    baseDatos = null;
    throw new MotorNoDisponible('hospital', 'No se pudo conectar con MongoDB; revise la configuración, DNS y acceso de red del servidor');
  }
}

export async function cerrarConexionMongo() {
  if (cliente) {
    await cliente.close();
    cliente = null;
    baseDatos = null;
  }
}
