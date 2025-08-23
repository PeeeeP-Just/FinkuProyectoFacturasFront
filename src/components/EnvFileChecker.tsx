import React, { useState } from 'react';
import { FileText, Copy, Eye, EyeOff } from 'lucide-react';

export const EnvFileChecker: React.FC = () => {
  const [showContent, setShowContent] = useState(false);
  
  const expectedContent = `# Configuración de Supabase
VITE_SUPABASE_URL=https://xlhblvnjsgpinojhujku.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_real_aqui

# Configuración de la base de datos PostgreSQL (backup)
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xlhblvnjsgpinojhujku
DB_PASSWORD=N5tr1conta`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(expectedContent);
    alert('Contenido copiado al portapapeles');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Verificador del archivo .env</span>
        </h3>
        <button
          onClick={() => setShowContent(!showContent)}
          className="flex items-center space-x-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm"
        >
          {showContent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{showContent ? 'Ocultar' : 'Mostrar'} contenido esperado</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">📋 Checklist del archivo .env:</h4>
          <div className="space-y-2 text-sm">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>El archivo se llama exactamente <code className="bg-yellow-100 px-1 rounded">.env</code> (con punto al inicio)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Está ubicado en la raíz del proyecto (mismo nivel que package.json)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Las variables empiezan con <code className="bg-yellow-100 px-1 rounded">VITE_</code></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>No hay espacios alrededor del signo <code className="bg-yellow-100 px-1 rounded">=</code></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Los valores no están entre comillas</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Has reiniciado el servidor después de los cambios</span>
            </label>
          </div>
        </div>

        {showContent && (
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-900">Contenido esperado del .env:</h4>
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>Copiar</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
              {expectedContent}
            </pre>
            <p className="text-xs text-slate-600 mt-2">
              ⚠️ Reemplaza "tu_clave_real_aqui" con tu clave anónima real de Supabase
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">🔧 Comandos útiles:</h4>
          <div className="space-y-2 text-sm font-mono">
            <div className="bg-slate-900 text-green-400 p-2 rounded">
              # Verificar que el archivo existe<br/>
              ls -la .env
            </div>
            <div className="bg-slate-900 text-green-400 p-2 rounded">
              # Ver contenido del archivo<br/>
              cat .env
            </div>
            <div className="bg-slate-900 text-green-400 p-2 rounded">
              # Reiniciar servidor de desarrollo<br/>
              npm run dev
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};