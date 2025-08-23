import React from 'react';
import { Info, FileText, RefreshCw } from 'lucide-react';

export const ViteEnvInfo: React.FC = () => {
  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <div className="flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-2">
            ℹ️ Información sobre Variables de Entorno en Vite
          </h4>
          
          <div className="text-sm text-blue-800 space-y-3">
            <div>
              <strong>¿Por qué no se cargan las variables?</strong>
              <ul className="mt-1 ml-4 space-y-1 list-disc">
                <li>Vite solo carga variables que empiecen con <code className="bg-blue-100 px-1 rounded">VITE_</code></li>
                <li>El archivo <code className="bg-blue-100 px-1 rounded">.env</code> debe estar en la raíz del proyecto</li>
                <li>Debes reiniciar el servidor después de cambiar el <code className="bg-blue-100 px-1 rounded">.env</code></li>
                <li>No debe haber espacios alrededor del signo <code className="bg-blue-100 px-1 rounded">=</code></li>
              </ul>
            </div>

            <div>
              <strong>Formato correcto del archivo .env:</strong>
              <div className="mt-2 bg-slate-900 text-green-400 p-3 rounded font-mono text-xs">
                <div># Sin espacios alrededor del =</div>
                <div>VITE_SUPABASE_URL=https://xlhblvnjsgpinojhujku.supabase.co</div>
                <div>VITE_SUPABASE_ANON_KEY=tu_clave_real_aqui</div>
              </div>
            </div>

            <div>
              <strong>Pasos para solucionar:</strong>
              <ol className="mt-1 ml-4 space-y-1 list-decimal">
                <li>Verifica que el archivo <code className="bg-blue-100 px-1 rounded">.env</code> esté en la raíz del proyecto</li>
                <li>Asegúrate de que las variables empiecen con <code className="bg-blue-100 px-1 rounded">VITE_</code></li>
                <li>No uses comillas en los valores</li>
                <li>Guarda el archivo</li>
                <li>Reinicia el servidor de desarrollo (<code className="bg-blue-100 px-1 rounded">Ctrl+C</code> y luego <code className="bg-blue-100 px-1 rounded">npm run dev</code>)</li>
              </ol>
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={reloadPage}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Recargar Página</span>
            </button>
            
            <a
              href="https://vitejs.dev/guide/env-and-mode.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Documentación Vite</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};