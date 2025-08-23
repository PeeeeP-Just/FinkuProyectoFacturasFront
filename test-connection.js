// Script para probar la conexión a Supabase
// Ejecutar con: node test-connection.js

import { createClient } from '@supabase/supabase-js';

// Configuración basada en tus credenciales
const supabaseUrl = 'https://xlhblvnjsgpinojhujku.supabase.co';

// Claves anónimas comunes que podríamos probar
const possibleKeys = [
  // Clave genérica basada en el proyecto ID
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaGJsdm5qc2dwaW5vamh1amt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU5OTI4MDAsImV4cCI6MjAwMTU2ODgwMH0.example',
];

async function testConnection(url, key) {
  try {
    console.log(`🔍 Probando conexión con URL: ${url}`);
    console.log(`🔑 Clave: ${key.substring(0, 50)}...`);
    
    const supabase = createClient(url, key);
    
    // Probar una consulta simple
    const { data, error } = await supabase
      .from('reg_facturas_detalle')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    }
    
    console.log('✅ Conexión exitosa!');
    console.log('📊 Datos:', data);
    return true;
  } catch (err) {
    console.log(`❌ Error de conexión: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando pruebas de conexión a Supabase...\n');
  
  for (const key of possibleKeys) {
    const success = await testConnection(supabaseUrl, key);
    if (success) {
      console.log('\n🎉 ¡Conexión exitosa encontrada!');
      console.log(`URL: ${supabaseUrl}`);
      console.log(`Key: ${key}`);
      break;
    }
    console.log('---\n');
  }
  
  console.log('\n📝 Si ninguna clave funcionó, necesitas:');
  console.log('1. Ir a tu dashboard de Supabase: https://supabase.com/dashboard');
  console.log('2. Seleccionar tu proyecto');
  console.log('3. Ir a Settings > API');
  console.log('4. Copiar la "anon public" key');
  console.log('5. Actualizar el archivo .env con VITE_SUPABASE_ANON_KEY');
}

main().catch(console.error);