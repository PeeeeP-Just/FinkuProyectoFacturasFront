import React from 'react';
import { Database, AlertCircle, Settings } from 'lucide-react';

interface NoConnectionProps {
  onShowSetup: () => void;
}

export const NoConnection: React.FC<NoConnectionProps> = ({ onShowSetup }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center">
        <Database className="h-12 w-12 text-slate-400" />
      </div>
      
      <div className="text-center space-y-4 max-w-md">
        <h3 className="text-2xl font-semibold text-slate-900">
          Configuración de Supabase Requerida
        </h3>
        <p className="text-slate-600 leading-relaxed">
          Tu base de datos está lista, pero necesitas configurar la clave anónima de Supabase para acceder a los datos desde la aplicación web.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onShowSetup}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 hover:scale-105 shadow-lg"
        >
          <Settings className="h-5 w-5" />
          <span>Configurar Conexión</span>
        </button>
        
        <div className="flex items-center space-x-2 px-6 py-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Tus datos están seguros en Supabase</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 max-w-lg">
        <h4 className="font-semibold text-slate-900 mb-2">¿Qué necesitas hacer?</h4>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• Ir a tu dashboard de Supabase</li>
          <li>• Copiar la clave anónima (anon public key)</li>
          <li>• Actualizar el archivo .env</li>
          <li>• Reiniciar la aplicación</li>
        </ul>
      </div>
    </div>
  );
};