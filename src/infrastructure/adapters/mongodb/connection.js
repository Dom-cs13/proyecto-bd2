import dns from 'node:dns';
import { MongoClient } from 'mongodb';
import { MotorNoDisponible } from '../../../domain/errores.js';

// Usar servidores DNS públicos confiables para resolver registros SRV de MongoDB Atlas en Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignorar si el entorno restringe la configuración de DNS
}

let cliente = null;
let baseDatos = null;

export async function obtenerConexionMongo() {
  if (baseDatos) {
    return { cliente, db: baseDatos };
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new MotorNoDisponible('Hospital General', 'La variable MONGO_URI (o MONGODB_URI) no está configurada.');
  }

  const dbName = process.env.MONGO_DB || process.env.MONGODB_DB || 'hospital_general';

  try {
    cliente = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await cliente.connect();
    baseDatos = cliente.db(dbName);
    return { cliente, db: baseDatos };
  } catch (err) {
    cliente = null;
    baseDatos = null;
    throw new MotorNoDisponible('Hospital General', `Error al conectar con MongoDB: ${err.message}`);
  }
}

export async function cerrarConexionMongo() {
  if (cliente) {
    await cliente.close();
    cliente = null;
    baseDatos = null;
  }
}

