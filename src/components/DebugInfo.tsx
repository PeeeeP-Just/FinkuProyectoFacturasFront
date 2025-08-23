import React from 'react';

export const DebugInfo: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return (
    <div className="bg-slate-100 p-4 rounded-lg text-sm font-mono">
      <h4 className="font-bold mb-2">Debug Info:</h4>
      <div>URL: {supabaseUrl || 'NO DEFINIDA'}</div>
      <div>Key: {supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NO DEFINIDA'}</div>
      <div>Modo: {import.meta.env.MODE}</div>
      <div>Dev: {import.meta.env.DEV ? 'true' : 'false'}</div>
    </div>
  );
};