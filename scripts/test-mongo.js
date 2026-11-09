import { MongoAdapter } from '../src/infrastructure/adapters/mongodb/MongoAdapter.js';
import { cerrarConexionMongo } from '../src/infrastructure/adapters/mongodb/connection.js';

async function main() {
  console.log('Iniciando prueba de conexión con MongoDB Atlas...');
  const adapter = new MongoAdapter();

  try {
    const pingRes = await adapter.ping();
    console.log(`✓ Conexión establecida: ${pingRes.motor} (${pingRes.institucion})`);
    console.log(`✓ Latencia de red: ${pingRes.latenciaMs} ms`);

    const resultado = await adapter.listarPacientes();
    console.log(`✓ Total de pacientes leídos en vivo: ${resultado.total}`);
    
    resultado.items.forEach((p, index) => {
      console.log(`  ${index + 1}. [${p.expediente}] ${p.nombre} ${p.apellidos} · Tel: ${p.telefono} · Estado: ${p.polizaSeguro?.estado || 'N/A'}`);
    });

    console.log('\nPrueba finalizada con éxito.');
  } catch (err) {
    console.error('✗ Error en la prueba:', err.message);
  } finally {
    await cerrarConexionMongo();
  }
}

main();

