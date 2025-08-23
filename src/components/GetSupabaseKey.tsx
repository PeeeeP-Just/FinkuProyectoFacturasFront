import React, { useState } from 'react';
import { Copy, ExternalLink, Eye, EyeOff } from 'lucide-react';

export const GetSupabaseKey: React.FC = () => {
  const [showKey, setShowKey] = useState(false);
  const [userKey, setUserKey] = useState('');
  
  const projectId = 'xlhblvnjsgpinojhujku';
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/settings/api`;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const testKey = () => {
    if (userKey.trim()) {
      // Actualizar el .env temporalmente para prueba
      console.log('🔑 Clave ingresada:', userKey.substring(0, 20) + '...');
      alert('Clave copiada al portapapeles. Pégala en tu archivo .env y reinicia la aplicación.');
      copyToClipboard(userKey);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          Obtener Clave Anónima de Supabase
        </h3>
        <p className="text-slate-600">
          Sigue estos pasos para obtener tu clave anónima real
        </p>
      </div>

      {/* Paso 1: Ir al dashboard */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-2">
              Accede a la configuración de API
            </h4>
            <p className="text-slate-600 mb-4">
              Haz clic en el botón para ir directamente a la configuración de API de tu proyecto.
            </p>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <span>Abrir Configuración API</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Paso 2: Copiar la clave */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-2">
              Copia la clave "anon public"
            </h4>
            <p className="text-slate-600 mb-4">
              En la página de configuración, busca la sección "Project API keys" y copia la clave que dice <strong>"anon public"</strong>.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">La clave debería verse así:</p>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaGJsdm5qc2dwaW5vamh1amt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU5OTI4MDAsImV4cCI6MjAwMTU2ODgwMH0.FIRMA_REAL_AQUI
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Paso 3: Pegar la clave */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-2">
              Pega tu clave aquí para probar
            </h4>
            <p className="text-slate-600 mb-4">
              Pega la clave que copiaste para verificar que es correcta:
            </p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={userKey}
                  onChange={(e) => setUserKey(e.target.value)}
                  placeholder="Pega tu clave anónima aquí..."
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 font-mono text-sm"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={testKey}
                disabled={!userKey.trim()}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                Copiar al Portapapeles
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Paso 4: Actualizar .env */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
            4
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-2">
              Actualiza tu archivo .env
            </h4>
            <p className="text-slate-600 mb-4">
              Reemplaza la línea en tu archivo <code>.env</code>:
            </p>
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <div className="text-red-400">- VITE_SUPABASE_ANON_KEY=REEMPLAZA_CON_TU_CLAVE_ANONIMA_REAL</div>
              <div className="text-green-400">+ VITE_SUPABASE_ANON_KEY=tu_clave_real_aqui</div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Después de actualizar el archivo, reinicia la aplicación con <code>npm run dev</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};