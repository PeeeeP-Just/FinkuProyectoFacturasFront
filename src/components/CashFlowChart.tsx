import React, { useState, useEffect } from 'react';
import { FlujoCajaItem } from '../types/database';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CashFlowChartProps {
  flujoData: FlujoCajaItem[];
  selectedMonth: number;
  selectedYear: number;
  soloMes?: boolean;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  flujoData,
  selectedMonth,
  selectedYear,
  soloMes = true
}) => {
  const [chartWidth, setChartWidth] = useState(() =>
    typeof window !== 'undefined' ? Math.max(window.innerWidth - 100, 600) : 800
  );

  useEffect(() => {
    const handleResize = () => {
      setChartWidth(Math.max(window.innerWidth - 100, 600));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Filter data based on soloMes mode
  const monthData = soloMes
    ? flujoData.filter(item => {
        const itemDate = parseISO(item.fecha);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      })
    : flujoData; // Use all data in full mode

  if (monthData.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            📊
          </div>
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Gráfico de Flujo de Caja</h3>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              📈
            </div>
            <p className="text-slate-500 font-medium">No hay datos para mostrar en el período seleccionado</p>
          </div>
        </div>
      </div>
    );
  }

  // Group data by day
  const dailyData = monthData.reduce((acc: any, item) => {
    const day = parseISO(item.fecha).getDate();
    if (!acc[day]) {
      acc[day] = { ingresos: 0, egresos: 0, acumulado: 0 };
    }
    if (item.tipo === 'INGRESO') {
      acc[day].ingresos += item.monto;
    } else {
      acc[day].egresos += item.monto;
    }
    return acc;
  }, {});

  // Calculate cumulative values
  let cumulativeIngresos = 0;
  let cumulativeEgresos = 0;
  const chartData = Object.entries(dailyData)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([day, data]: [string, any]) => {
      cumulativeIngresos += data.ingresos;
      cumulativeEgresos += data.egresos;
      return {
        day: parseInt(day),
        ingresos: cumulativeIngresos,
        egresos: cumulativeEgresos,
        neto: cumulativeIngresos - cumulativeEgresos
      };
    });

  // Chart dimensions - responsive
  const width = chartWidth;
  const height = Math.min(Math.max(400, window.innerHeight * 0.4), 500); // Responsive height between 400-500px
  const margin = { top: 30, right: 30, bottom: 50, left: 80 }; // Increased margins for better spacing
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Find max value for scaling
  const ingresosValues = chartData.map(d => d.ingresos);
  const egresosValues = chartData.map(d => d.egresos);
  const netoValues = chartData.map(d => Math.abs(d.neto));

  const maxValue = Math.max(
    ...ingresosValues,
    ...egresosValues,
    ...netoValues
  );

  const minValue = Math.min(
    ...ingresosValues,
    ...egresosValues,
    ...chartData.map(d => d.neto)
  );

  // Scale functions
  const xScale = (day: number) => (day - 1) / 30 * innerWidth;
  const yScale = (value: number) => innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;

  // Create path data for lines
  const ingresosPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.day)} ${yScale(d.ingresos)}`).join(' ');
  const egresosPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.day)} ${yScale(d.egresos)}`).join(' ');

  // Get last values for display
  const lastData = chartData[chartData.length - 1];

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            📊
          </div>
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Gráfico de Flujo de Caja</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">
            {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: es })}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-200">
          <p className="text-xs sm:text-sm font-medium text-emerald-800 mb-1">Total Ingresos</p>
          <p className="text-base sm:text-lg font-bold text-emerald-900">${lastData?.ingresos.toLocaleString() || 0}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
          <p className="text-xs sm:text-sm font-medium text-red-800 mb-1">Total Egresos</p>
          <p className="text-base sm:text-lg font-bold text-red-900">${lastData?.egresos.toLocaleString() || 0}</p>
        </div>
        <div className={`rounded-lg p-3 sm:p-4 border ${lastData?.neto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-xs sm:text-sm font-medium mb-1 ${lastData?.neto >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
            Flujo Neto
          </p>
          <p className={`text-base sm:text-lg font-bold ${lastData?.neto >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            ${lastData?.neto.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full overflow-hidden">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="border border-slate-200 rounded-lg bg-white/50">
          <defs>
            <linearGradient id="ingresosGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="egresosGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = ratio * innerHeight;
              return (
                <g key={ratio}>
                  <line
                    x1="0"
                    y1={y}
                    x2={innerWidth}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x="-10"
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748b"
                  >
                    {((1 - ratio) * maxValue + ratio * minValue).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {chartData.map(d => (
              <text
                key={d.day}
                x={xScale(d.day)}
                y={innerHeight + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {d.day}
              </text>
            ))}

            {/* Fill areas */}
            <path
              d={`${ingresosPath} L ${xScale(chartData[chartData.length - 1].day)} ${innerHeight} L ${xScale(chartData[0].day)} ${innerHeight} Z`}
              fill="url(#ingresosGradient)"
            />
            <path
              d={`${egresosPath} L ${xScale(chartData[chartData.length - 1].day)} ${innerHeight} L ${xScale(chartData[0].day)} ${innerHeight} Z`}
              fill="url(#egresosGradient)"
            />

            {/* Lines */}
            <path
              d={ingresosPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d={egresosPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Data points */}
            {chartData.map(d => (
              <g key={d.day}>
                <circle
                  cx={xScale(d.day)}
                  cy={yScale(d.ingresos)}
                  r="4"
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle
                  cx={xScale(d.day)}
                  cy={yScale(d.egresos)}
                  r="4"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Legend */}
          <g transform={`translate(20, 20)`}>
            <rect width="100" height="60" fill="white" stroke="#e2e8f0" strokeWidth="1" rx="4" />
            <g transform="translate(10, 15)">
              <line x1="0" y1="0" x2="20" y2="0" stroke="#10b981" strokeWidth="3" />
              <text x="25" y="4" fontSize="12" fill="#374151">Ingresos</text>
            </g>
            <g transform="translate(10, 35)">
              <line x1="0" y1="0" x2="20" y2="0" stroke="#ef4444" strokeWidth="3" />
              <text x="25" y="4" fontSize="12" fill="#374151">Egresos</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};