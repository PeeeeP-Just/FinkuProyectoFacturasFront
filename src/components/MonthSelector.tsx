import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: number; // 0-11 (January = 0, December = 11)
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
  className?: string;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  className = ""
}) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(event.target.value);
    onMonthChange(month, selectedYear);
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(event.target.value);
    onMonthChange(selectedMonth, year);
  };

  const clearSelection = () => {
    // Reset to current month/year or trigger parent to clear dates
    const now = new Date();
    onMonthChange(now.getMonth(), now.getFullYear()); // Reset to current month
  };

  return (
    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-8 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
          <Calendar className="h-4 w-4 text-slate-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Seleccionar Mes</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3 tracking-tight">
            Mes
          </label>
          <div className="relative">
            <select
              value={selectedMonth >= 0 ? selectedMonth : ''}
              onChange={handleMonthChange}
              className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 appearance-none pr-10"
            >
              <option value="">Todos los meses</option>
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <ChevronDown className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3 tracking-tight">
            Año
          </label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 appearance-none pr-10"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={clearSelection}
            className="w-full px-4 py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all duration-200 text-slate-700 font-medium focus:ring-2 focus:ring-slate-500 focus:border-slate-300"
          >
            Mes Actual
          </button>
        </div>
      </div>

      {selectedMonth >= 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">
            Mostrando datos de {months[selectedMonth]} {selectedYear}
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function to get date range from month/year selection
export const getMonthDateRange = (month: number, year: number) => {
  if (month < 0) {
    // Return empty dates for "all months"
    return { dateFrom: '', dateTo: '' };
  }

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of the month

  // Format as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    dateFrom: formatDate(startDate),
    dateTo: formatDate(endDate)
  };
};