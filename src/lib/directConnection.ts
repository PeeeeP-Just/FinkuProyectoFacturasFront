// Función para crear una conexión directa usando las credenciales de PostgreSQL
// Esto es solo para desarrollo y testing

export const testDirectConnection = async () => {
  console.log('🔍 Probando conexión directa a PostgreSQL...');

  // Validar que las variables de entorno estén configuradas
  const requiredVars = ['VITE_DB_HOST', 'VITE_DB_USER', 'VITE_DB_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    return {
      success: false,
      message: `Faltan configurar las siguientes variables de entorno: ${missingVars.join(', ')}`
    };
  }

  // Información de conexión desde variables de entorno
  const dbConfig = {
    host: import.meta.env.VITE_DB_HOST,
    port: parseInt(import.meta.env.VITE_DB_PORT || '6543'),
    database: import.meta.env.VITE_DB_NAME,
    user: import.meta.env.VITE_DB_USER,
    password: import.meta.env.VITE_DB_PASSWORD
  };

  console.log('📋 Configuración de conexión:');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Puerto: ${dbConfig.port}`);
  console.log(`Base de datos: ${dbConfig.database}`);
  console.log(`Usuario: ${dbConfig.user}`);
  console.log(`Password: ${dbConfig.password ? '***' : 'NO CONFIGURADO'}`);
  
  // Para usar en el navegador, necesitamos usar Supabase client
  // Las conexiones directas a PostgreSQL no funcionan desde el navegador por seguridad
  
  return {
    success: false,
    message: 'Las conexiones directas a PostgreSQL no están disponibles desde el navegador. Usa Supabase client.'
  };
};

// Función para generar la URL de Supabase basada en las credenciales
export const generateSupabaseConfig = () => {
  // Extraer el project ID del usuario de PostgreSQL desde variables de entorno
  const user = import.meta.env.VITE_DB_USER || 'postgres.xlhblvnjsgpinojhujku';
  const projectId = user.split('.')[1];

  const supabaseUrl = `https://${projectId}.supabase.co`;

  console.log('🔧 Configuración generada:');
  console.log(`URL de Supabase: ${supabaseUrl}`);
  console.log('⚠️  Necesitas obtener la clave anónima desde el dashboard de Supabase');

  return {
    url: supabaseUrl,
    projectId: projectId
  };
};
