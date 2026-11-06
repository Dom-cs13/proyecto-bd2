/**
 * Configuración e inicialización de Firebase Admin SDK para el Laboratorio Clínico.
 * 
 * ============================================================================
 * ¿DÓNDE PONER TU API KEY Y CREDENCIALES DE FIREBASE?
 * ============================================================================
 * 1. Crea un archivo `.env` en la raíz del proyecto (copiando `.env.example`).
 * 2. Tu API Key va en la variable:
 *      FIREBASE_API_KEY=tu_firebase_api_key_de_ejemplo
 *    (Obtenla en: Consola de Firebase -> Configuración del Proyecto -> General -> Tus apps)
 * 3. Para que el backend acceda a Firestore con permisos de administrador:
 *    Ve a: Consola de Firebase -> Configuración del Proyecto -> Cuentas de servicio
 *    -> "Generar nueva clave privada".
 *    
 *    Tienes dos formas de configurarla:
 *    - Opción A (Recomendada en producción/CI):
 *        FIREBASE_PROJECT_ID=tu-proyecto-id
 *        FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@tu-proyecto.iam.gserviceaccount.com
 *        FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *    
 *    - Opción B (Cómoda en desarrollo local):
 *        Coloca el archivo descargado en `infra/database/firestore/serviceAccountKey.json`
 *        y define en tu `.env`:
 *        FIREBASE_SERVICE_ACCOUNT_PATH=./infra/database/firestore/serviceAccountKey.json
 * ============================================================================
 */

import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MotorNoDisponible } from '../../domain/errores.js';

let firestoreInstance = null;
let appInstance = null;

/**
 * Indica si las credenciales de Firebase están configuradas en el entorno.
 * @returns {boolean}
 */
export function esFirebaseConfigurado() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_SERVICE_ACCOUNT_PATH } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) return true;
  if (FIREBASE_SERVICE_ACCOUNT_PATH && existsSync(resolve(process.cwd(), FIREBASE_SERVICE_ACCOUNT_PATH))) return true;
  return false;
}

/**
 * Obtiene o inicializa la app de Firebase Admin.
 * @returns {import('firebase-admin/app').App}
 */
export function obtenerFirebaseApp() {
  if (appInstance) return appInstance;

  const apps = getApps();
  if (apps.length > 0) {
    appInstance = apps[0];
    return appInstance;
  }

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_SERVICE_ACCOUNT_PATH,
  } = process.env;

  let credential = null;

  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const fullPath = resolve(process.cwd(), FIREBASE_SERVICE_ACCOUNT_PATH);
    if (existsSync(fullPath)) {
      try {
        const fileContent = JSON.parse(readFileSync(fullPath, 'utf8'));
        credential = cert(fileContent);
      } catch (err) {
        console.warn(`[Firebase] Error al leer serviceAccount desde ${fullPath}:`, err.message);
      }
    }
  }

  if (!credential && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    credential = cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  }

  if (!credential && FIREBASE_PROJECT_ID) {
    try {
      credential = applicationDefault();
    } catch {
      // Ignorar si applicationDefault falla
    }
  }

  if (!credential) {
    throw new MotorNoDisponible(
      'laboratorio',
      'Firebase no está configurado. Especifica FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY o FIREBASE_SERVICE_ACCOUNT_PATH en tu archivo .env'
    );
  }

  appInstance = initializeApp({
    credential,
    projectId: FIREBASE_PROJECT_ID,
  });

  return appInstance;
}

/**
 * Obtiene la instancia de Firestore. Lanza MotorNoDisponible si no se puede conectar.
 * @returns {import('firebase-admin/firestore').Firestore}
 */
export function obtenerFirestore() {
  if (firestoreInstance) return firestoreInstance;
  const app = obtenerFirebaseApp();
  firestoreInstance = getFirestore(app);
  try {
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Ignorar si ya se aplicaron settings previamente
  }
  return firestoreInstance;
}

/**
 * Permite inyectar un mock o instancia alternativa para pruebas unitarias.
 * @param {import('firebase-admin/firestore').Firestore|null} mock
 */
export function inyectarFirestoreParaPruebas(mock) {
  firestoreInstance = mock;
}
