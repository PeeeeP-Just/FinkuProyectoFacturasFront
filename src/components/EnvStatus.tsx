import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { ViteEnvInfo } from './ViteEnvInfo';

export const EnvStatus: React.FC = () => {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  };

  const getStatus = (value: any, name: string) => {
    if (name === 'VITE_SUPABASE_URL') {
      if (!value) return { status: 'error', message: 'No definida' };
      if (value === 'https://xlhblvnjsgpinojhujku.supabase.co') return { status: 'success', message: 'Correcta' };
      return { status: 'warning', message: 'URL diferente a la esperada' };
    }
    
    if (name === 'VITE_SUPABASE_ANON_KEY') {
      if (!value) return { status: 'error', message: 'No definida' };
      if (value === 'REEMPLAZA_CON_TU_CLAVE_ANONIMA_REAL') return { status: 'error', message: 'Placeholder - necesita clave real' };
      if (value.startsWith('eyJ')) return { status: 'success', message: 'Formato JWT válido' };
      return { status: 'warning', message: 'Formato no reconocido' };
    }
    
    return { status: 'info', message: String(value) };
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        🔍 Estado de Variables de Entorno
      </h3>
      
      <div className="space-y-3">
        {Object.entries(envVars).map(([key, value]) => {
          const { status, message } = getStatus(value, key);
          
          return (
            <div key={key} className={`p-3 rounded-lg border ${getStatusColor(status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getIcon(status)}
                  <span className="font-medium text-sm">{key}</span>
                </div>
                <span className="text-sm">{message}</span>
              </div>
              
              {key.includes('SUPABASE') && value && (
                <div className="mt-2 text-xs font-mono bg-white/50 p-2 rounded border">
                  {key === 'VITE_SUPABASE_ANON_KEY' && value.length > 50 
                    ? `${value.substring(0, 30)}...${value.substring(value.length - 10)}`
                    : value
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-900 mb-2">Información del entorno:</h4>
        <div className="text-sm text-slate-600 space-y-1">
          <div>• Modo: {envVars.MODE}</div>
          <div>• Desarrollo: {envVars.DEV ? 'Sí' : 'No'}</div>
          <div>• Producción: {envVars.PROD ? 'Sí' : 'No'}</div>
          <div>• Total variables VITE_*: {Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')).length}</div>
        </div>
      </div>

      {(!envVars.VITE_SUPABASE_URL || !envVars.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY === 'REEMPLAZA_CON_TU_CLAVE_ANONIMA_REAL') && (
        <>
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Acción requerida:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {!envVars.VITE_SUPABASE_URL && <li>• Definir VITE_SUPABASE_URL en .env</li>}
              {(!envVars.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY === 'REEMPLAZA_CON_TU_CLAVE_ANONIMA_REAL') && (
                <li>• Obtener y configurar VITE_SUPABASE_ANON_KEY real</li>
              )}
              <li>• Reiniciar la aplicación después de los cambios</li>
            </ul>
          </div>
          
          <div className="mt-4">
            <ViteEnvInfo />
          </div>
        </>
      )}
    </div>
  );
};