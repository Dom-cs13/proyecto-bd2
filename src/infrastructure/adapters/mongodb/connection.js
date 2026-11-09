import dns from 'node:dns/promises';
import { MongoClient } from 'mongodb';
import { MotorNoDisponible } from '../../../domain/errores.js';

let cliente = null;
let baseDatos = null;

async function resolverUriAtlas(srvUri, dbName) {
  if (!srvUri.startsWith('mongodb+srv://')) {
    return srvUri;
  }

  try {
    const match = srvUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/?[^?]*)(\??.*)/);
    if (!match) return srvUri;
    const [, user, pass, host] = match;

    // Resuelve los 3 nodos del Replica Set en Atlas evitando el timeout de DNS TXT
    const records = await dns.resolveSrv(`_mongodb._tcp.${host}`);
    if (!records || records.length === 0) return srvUri;

    const directHosts = records.map((r) => `${r.name}:${r.port}`).join(',');
    return `mongodb://${encodeURIComponent(decodeURIComponent(user))}:${encodeURIComponent(decodeURIComponent(pass))}@${directHosts}/${dbName}?ssl=true&authSource=admin`;
  } catch {
    return srvUri;
  }
}

export async function obtenerConexionMongo() {
  if (baseDatos) {
    return { cliente, db: baseDatos };
  }

  const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!rawUri) {
    throw new MotorNoDisponible('Hospital General', 'La variable MONGO_URI (o MONGODB_URI) no está configurada.');
  }

  const dbName = process.env.MONGO_DB || process.env.MONGODB_DB || 'hospital_general';

  try {
    const uri = await resolverUriAtlas(rawUri, dbName);
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
    throw new MotorNoDisponible('Hospital General', `Error al conectar con MongoDB Atlas: ${err.message}`);
  }
}

export async function cerrarConexionMongo() {
  if (cliente) {
    await cliente.close();
    cliente = null;
    baseDatos = null;
  }
}
