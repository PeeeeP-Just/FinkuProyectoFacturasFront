import React from 'react';
import { Search, Calendar, Filter } from 'lucide-react';

interface CompactFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  selectedClient?: string;
  onClientChange?: (value: string) => void;
  clients?: Array<{rut: string, razon_social: string}>;
  placeholder?: string;
  showClientFilter?: boolean;
}

export const CompactFilterBar: React.FC<CompactFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  selectedClient = '',
  onClientChange,
  clients = [],
  placeholder = "Buscar...",
  showClientFilter = false
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
      {/* Search Input */}
      <div className="relative flex-1 max-w-xs">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200"
        />
      </div>

      {/* Date From */}
      <div className="relative">
        <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="pl-9 pr-2 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200"
        />
      </div>

      {/* Date To */}
      <div className="relative">
        <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="pl-9 pr-2 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200"
        />
      </div>

      {/* Client Filter (optional) */}
      {showClientFilter && onClientChange && (
        <div className="relative">
          <select
            value={selectedClient}
            onChange={(e) => onClientChange(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 appearance-none pr-8"
          >
            <option value="">Todos los clientes</option>
            {clients.map(cliente => (
              <option key={cliente.rut} value={cliente.rut}>
                {cliente.razon_social}
              </option>
            ))}
          </select>
          <Filter className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      )}
    </div>
  );
};