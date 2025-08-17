import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Configurado' : 'NO CONFIGURADO');
console.log('Supabase Key:', supabaseAnonKey ? 'Configurado' : 'NO CONFIGURADO');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  console.error('Necesitas configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Test de conexión
if (supabase) {
  console.log('✅ Cliente Supabase creado correctamente');
} else {
  console.error('❌ No se pudo crear el cliente Supabase');
}