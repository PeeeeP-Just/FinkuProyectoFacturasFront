import React, { useState } from 'react';
import { ExternalLink, Copy, CheckCircle, Key } from 'lucide-react';
import { DebugInfo } from './DebugInfo';
import { GetSupabaseKey } from './GetSupabaseKey';

export const SetupGuide: React.FC = () => {
  const [showKeyHelper, setShowKeyHelper] = useState(false);
  const projectId = 'xlhblvnjsgpinojhujku';
  const supabaseUrl = `https://${projectId}.supabase.co`;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (showKeyHelper) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => setShowKeyHelper(false)}
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            ← Volver a la guía completa
          </button>
        </div>
        <GetSupabaseKey />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Configuración de Supabase</h2>
          <p className="text-slate-600 text-lg">
            Para conectar tu aplicación a la base de datos, necesitas configurar las credenciales de Supabase.
          </p>
        </div>

        <div className="space-y-8">
          {/* Paso 1 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Accede a tu Dashboard de Supabase
              </h3>
              <p className="text-slate-600 mb-4">
                Ve a tu proyecto en Supabase y accede a la configuración de API.
              </p>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <span>Abrir Dashboard</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Encuentra tu proyecto
              </h3>
              <p className="text-slate-600 mb-4">
                Busca el proyecto con ID: <code className="bg-slate-100 px-2 py-1 rounded">{projectId}</code>
              </p>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">Tu URL de proyecto debería ser:</p>
                <div className="flex items-center space-x-2">
                  <code className="bg-white px-3 py-2 rounded border flex-1">{supabaseUrl}</code>
                  <button
                    onClick={() => copyToClipboard(supabaseUrl)}
                    className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                    title="Copiar URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Obtén las credenciales de API
              </h3>
              <p className="text-slate-600 mb-4">
                En tu proyecto, ve a <strong>Settings → API</strong> y copia:
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>Project URL</strong> (debería coincidir con la URL de arriba)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span><strong>anon public key</strong> (clave pública anónima)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Paso 4 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Actualiza el archivo .env
              </h3>
              <p className="text-slate-600 mb-4">
                Reemplaza las siguientes líneas en tu archivo <code>.env</code>:
              </p>
              <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                <div>VITE_SUPABASE_URL={supabaseUrl}</div>
                <div>VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui</div>
              </div>
            </div>
          </div>

          {/* Paso 5 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              5
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Reinicia la aplicación
              </h3>
              <p className="text-slate-600 mb-4">
                Después de actualizar el archivo .env, reinicia el servidor de desarrollo:
              </p>
              <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                npm run dev
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Información adicional</h4>
            <p className="text-blue-800 text-sm">
              Tu base de datos ya está configurada y contiene los datos. Solo necesitas las credenciales 
              de API para que la aplicación web pueda acceder a ella de forma segura.
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2">🔍 Estado actual</h4>
            <DebugInfo />
            <div className="mt-4">
              <button
                onClick={() => setShowKeyHelper(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Key className="h-4 w-4" />
                <span>Obtener Clave Anónima</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};