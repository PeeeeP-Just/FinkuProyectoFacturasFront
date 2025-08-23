// Función para crear una conexión directa usando las credenciales de PostgreSQL
// Esto es solo para desarrollo y testing

export const testDirectConnection = async () => {
  console.log('🔍 Probando conexión directa a PostgreSQL...');
  
  // Información de conexión desde .env
  const dbConfig = {
    host: 'aws-1-sa-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.xlhblvnjsgpinojhujku',
    password: 'N5tr1conta'
  };
  
  console.log('📋 Configuración de conexión:');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Puerto: ${dbConfig.port}`);
  console.log(`Base de datos: ${dbConfig.database}`);
  console.log(`Usuario: ${dbConfig.user}`);
  
  // Para usar en el navegador, necesitamos usar Supabase client
  // Las conexiones directas a PostgreSQL no funcionan desde el navegador por seguridad
  
  return {
    success: false,
    message: 'Las conexiones directas a PostgreSQL no están disponibles desde el navegador. Usa Supabase client.'
  };
};

// Función para generar la URL de Supabase basada en las credenciales
export const generateSupabaseConfig = () => {
  // Extraer el project ID del usuario de PostgreSQL
  const user = 'postgres.xlhblvnjsgpinojhujku';
  const projectId = user.split('.')[1]; // xlhblvnjsgpinojhujku
  
  const supabaseUrl = `https://${projectId}.supabase.co`;
  
  console.log('🔧 Configuración generada:');
  console.log(`URL de Supabase: ${supabaseUrl}`);
  console.log('⚠️  Necesitas obtener la clave anónima desde el dashboard de Supabase');
  
  return {
    url: supabaseUrl,
    projectId: projectId
  };
};