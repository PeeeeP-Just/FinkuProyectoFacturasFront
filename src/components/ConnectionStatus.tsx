import React, { useState, useEffect } from 'react';
import { testConnection } from '../lib/database';
import { CheckCircle, XCircle, Loader, Settings } from 'lucide-react';
import { SetupGuide } from './SetupGuide';

export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setStatus('loading');
        const isConnected = await testConnection();
        setStatus(isConnected ? 'connected' : 'error');
        if (!isConnected) {
          setError('No se pudo conectar a la base de datos');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    };

    checkConnection();
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2 text-blue-600">
        <Loader className="h-4 w-4 animate-spin" />
        <span className="text-sm">Conectando a la base de datos...</span>
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Conectado a Supabase</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Sin conexión</span>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Settings className="h-3 w-3" />
          <span>Configurar</span>
        </button>
      </div>
      
      {showSetup && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Configuración de Supabase</h2>
              <button
                onClick={() => setShowSetup(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                <XCircle className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <SetupGuide />
          </div>
        </div>
      )}
    </>
  );
};