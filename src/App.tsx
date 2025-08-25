import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { VentasModule } from './components/VentasModule';
import { ComprasModule } from './components/ComprasModule';
import { FlujoCajaModule } from './components/FlujoCajaModule';
import { ManualEntriesModule } from './components/ManualEntriesModule';
import { ProductosModule } from './components/ProductosModule';
import { GestionProductosModule } from './components/GestionProductosModule';
import { DataStatusModule } from './components/DataStatusModule';
import { EnvStatus } from './components/EnvStatus';
import { EnvFileChecker } from './components/EnvFileChecker';

interface AppContentProps {
  activeModule?: string;
}

const AppContent: React.FC<AppContentProps> = ({ activeModule }) => {
  const [showEnvStatus, setShowEnvStatus] = useState(true);
  
  // Verificar si las variables de entorno están configuradas
  const envConfigured = import.meta.env.VITE_SUPABASE_URL && 
                       import.meta.env.VITE_SUPABASE_ANON_KEY && 
                       import.meta.env.VITE_SUPABASE_ANON_KEY !== 'REEMPLAZA_CON_TU_CLAVE_ANONIMA_REAL';

  // Mostrar estado de env por 10 segundos o hasta que esté configurado
  useEffect(() => {
    if (envConfigured) {
      const timer = setTimeout(() => setShowEnvStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [envConfigured]);

  // Si las variables no están configuradas, mostrar siempre el estado
  if (!envConfigured || showEnvStatus) {
    return (
      <div className="space-y-6">
        <EnvStatus />
        <EnvFileChecker />
        {envConfigured && (
          <div className="text-center">
            <button
              onClick={() => setShowEnvStatus(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Continuar a la aplicación
            </button>
          </div>
        )}
        {!envConfigured && (
          <div className="text-center text-slate-500">
            <p>Configura las variables de entorno para continuar</p>
          </div>
        )}
      </div>
    );
  }

  switch (activeModule) {
    case 'ventas':
      return <VentasModule />;
    case 'compras':
      return <ComprasModule />;
    case 'productos':
      return <ProductosModule />;
    case 'gestion-productos':
      return <GestionProductosModule />;
    case 'flujo-caja':
      return <FlujoCajaModule />;
    case 'manual-entries':
      return <ManualEntriesModule />;
    case 'data-status':
      return <DataStatusModule />;
    default:
      return <VentasModule />;
  }
};

function App() {
  // Log detallado al arrancar
  useEffect(() => {
    console.log('🚀 Iniciando aplicación...');
    console.log('📋 Variables de entorno detectadas:');
    
    const allEnvVars = import.meta.env;
    const viteVars = Object.keys(allEnvVars).filter(key => key.startsWith('VITE_'));
    
    console.log(`Total variables VITE_*: ${viteVars.length}`);
    viteVars.forEach(key => {
      const value = allEnvVars[key];
      if (key.includes('KEY') || key.includes('SECRET')) {
        console.log(`${key}: ${value ? `${value.substring(0, 10)}...` : 'NO DEFINIDA'}`);
      } else {
        console.log(`${key}: ${value || 'NO DEFINIDA'}`);
      }
    });
    
    console.log('🔧 Información del entorno:');
    console.log(`Modo: ${allEnvVars.MODE}`);
    console.log(`Desarrollo: ${allEnvVars.DEV}`);
    console.log(`Producción: ${allEnvVars.PROD}`);
    
    // Verificar configuración específica de Supabase
    const supabaseUrl = allEnvVars.VITE_SUPABASE_URL;
    const supabaseKey = allEnvVars.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔍 Estado de configuración Supabase:');
    console.log(`URL configurada: ${!!supabaseUrl}`);
    console.log(`Clave configurada: ${!!supabaseKey}`);
    console.log(`Clave es placeholder: ${supabaseKey === 'REEMPLAZA_CON_TU_CLAVE_ANONIMA_REAL'}`);
    
    if (!supabaseUrl || !supabaseKey || supabaseKey === 'REEMPLAZA_CON_TU_CLAVE_ANONIMA_REAL') {
      console.warn('⚠️ Configuración de Supabase incompleta');
    } else {
      console.log('✅ Configuración de Supabase parece correcta');
    }
  }, []);

  return (
    <Layout>
      <AppContent />
    </Layout>
  );
}

export default App;