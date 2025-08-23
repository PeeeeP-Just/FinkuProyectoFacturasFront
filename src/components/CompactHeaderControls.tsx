import React from 'react';

interface CompactHeaderControlsProps {
  soloMes: boolean;
  onSoloMesChange: (value: boolean) => void;
}

export const CompactHeaderControls: React.FC<CompactHeaderControlsProps> = ({
  soloMes,
  onSoloMesChange
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={soloMes}
          onChange={(e) => onSoloMesChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-1 transition-all duration-200"
        />
        <span className="text-sm font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
          Solo mes seleccionado
        </span>
      </label>
    </div>
  );
};