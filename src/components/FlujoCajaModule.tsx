import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FlujoCajaItem, RegVenta, RegCompra, ManualEntry } from '../types/database';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getManualEntries, groupRelatedDocuments } from '../lib/database';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { MonthSelector, getMonthDateRange } from './MonthSelector';
import { CashFlowChart } from './CashFlowChart';
import { CompactHeaderControls } from './CompactHeaderControls';
import { getDocumentMultiplier } from '../lib/documentTypes';
import { SortableHeader, SortDirection } from './SortableHeader';

export const FlujoCajaModule: React.FC = () => {
  const [flujo, setFlujo] = useState<FlujoCajaItem[]>([]);
  const [flujoCompleto, setFlujoCompleto] = useState<FlujoCajaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // Current month by default
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [soloMes, setSoloMes] = useState<boolean>(true); // Default to month-only mode
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  } | null>(null);


  const fetchFlujoCaja = async () => {
    console.log('💰 Iniciando fetchFlujoCaja...');
    console.log('Supabase disponible:', !!supabase);

    if (!supabase) {
      console.error('❌ Supabase no está configurado. Necesitas conectar a Supabase primero.');
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('📊 Consultando reg_ventas, reg_compras y manual_entries...');

    try {
      // Obtener ventas
      console.log('📈 Consultando ventas...');
      let ventasQuery = supabase
        .from('reg_ventas')
        .select('*')
        .order('fecha_docto', { ascending: true });

      if (soloMes && dateFrom) {
        console.log('Filtro ventas fecha desde:', dateFrom);
        ventasQuery = ventasQuery.gte('fecha_docto', dateFrom);
      }
      if (soloMes && dateTo) {
        console.log('Filtro ventas fecha hasta:', dateTo);
        ventasQuery = ventasQuery.lte('fecha_docto', dateTo);
      }

      // Obtener compras
      console.log('📉 Consultando compras...');
      let comprasQuery = supabase
        .from('reg_compras')
        .select('*')
        .order('fecha_docto', { ascending: true });

      if (soloMes && dateFrom) {
        console.log('Filtro compras fecha desde:', dateFrom);
        comprasQuery = comprasQuery.gte('fecha_docto', dateFrom);
      }
      if (soloMes && dateTo) {
        console.log('Filtro compras fecha hasta:', dateTo);
        comprasQuery = comprasQuery.lte('fecha_docto', dateTo);
      }

      // Obtener entradas manuales
      console.log('📝 Consultando entradas manuales...');
      const manualEntries = await getManualEntries({
        dateFrom: soloMes ? (dateFrom || undefined) : undefined,
        dateTo: soloMes ? (dateTo || undefined) : undefined
      });

      const [ventasResult, comprasResult] = await Promise.all([
        ventasQuery,
        comprasQuery
      ]);

      console.log('📋 Resultados:');
      console.log('Ventas - Error:', ventasResult.error, 'Datos:', ventasResult.data?.length || 0);
      console.log('Compras - Error:', comprasResult.error, 'Datos:', comprasResult.data?.length || 0);
      console.log('Manual Entries:', manualEntries.length);

      if (ventasResult.error) throw ventasResult.error;
      if (comprasResult.error) throw comprasResult.error;

      const ventas = ventasResult.data || [];
      const compras = comprasResult.data || [];

      console.log('💰 Procesando flujo de caja...');
      console.log('Ventas a procesar:', ventas.length);
      console.log('Compras a procesar:', compras.length);
      console.log('Entradas manuales a procesar:', manualEntries.length);

      // Convertir a items de flujo de caja
      const flujoItems: FlujoCajaItem[] = [];

      // Group related documents and process them
      const documentGroups = groupRelatedDocuments(ventas);

      // Process each group (original invoice + its credit notes) with real payment dates
      for (const group of documentGroups) {
        const originalInvoice = group.original;

        // Use factoring date if available, otherwise fecha_recepcion, then fecha_docto
        const fechaPago = (originalInvoice.is_factored && originalInvoice.factoring_date
          ? originalInvoice.factoring_date
          : (originalInvoice.fecha_recepcion || originalInvoice.fecha_docto || ''));

        if (fechaPago) {
          flujoItems.push({
            fecha: fechaPago,
            tipo: 'INGRESO',
            descripcion: group.isFullyCancelled
              ? `Venta ${originalInvoice.folio || originalInvoice.nro} - ${originalInvoice.razon_social || 'Cliente'} (ANULADA)${originalInvoice.is_factored ? ' (Factorizada)' : ''}`
              : `Venta ${originalInvoice.folio || originalInvoice.nro} - ${originalInvoice.razon_social || 'Cliente'}${originalInvoice.is_factored ? ' (Factorizada)' : ''}`,
            monto: originalInvoice.monto_total || 0,
            acumulado: 0,
            documento: originalInvoice.folio || originalInvoice.nro?.toString() || ''
          });
        }

        // Add credit notes linked to this invoice
        group.creditNotes.forEach((creditNote, index) => {
          const creditNoteDate = creditNote.fecha_docto || '';
          if (creditNoteDate) {
            flujoItems.push({
              fecha: creditNoteDate,
              tipo: 'EGRESO', // Credit notes are negative for sales
              descripcion: `Nota Crédito ${creditNote.folio || creditNote.nro} - ${originalInvoice.folio || originalInvoice.nro} (${originalInvoice.razon_social || 'Cliente'})`,
              monto: Math.abs(creditNote.monto_total || 0),
              acumulado: 0,
              documento: `${originalInvoice.folio || originalInvoice.nro}-NC${index + 1}`
            });
          }
        });
      }

      // Agregar egresos (compras) con fechas de pago reales
      for (const compra of compras) {
        // Use fecha_docto as payment date
        const fechaPago = compra.fecha_docto || '';

        if (fechaPago) {
          flujoItems.push({
            fecha: fechaPago,
            tipo: 'EGRESO',
            descripcion: `Compra ${compra.folio || compra.nro} - ${compra.razon_social || 'Proveedor'}`,
            monto: compra.monto_total || 0,
            acumulado: 0,
            documento: compra.folio || compra.nro?.toString() || ''
          });
        }
      }

      // Agregar entradas manuales
      manualEntries.forEach(entry => {
        flujoItems.push({
          fecha: entry.entry_date,
          tipo: entry.entry_type === 'income' ? 'INGRESO' : 'EGRESO',
          descripcion: entry.description,
          monto: entry.amount,
          acumulado: 0,
          documento: `Manual-${entry.id}`
        });
      });

      console.log('💰 Items de flujo generados:', flujoItems.length);

      // Para el modo acumulado real, necesitamos calcular desde el historial completo
      if (!soloMes) {
        // Obtener todas las transacciones hasta la fecha del último día del mes anterior
        const selectedDate = new Date(selectedYear, selectedMonth, 1);
        const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const firstDate = firstDayOfMonth.toISOString().split('T')[0];

        const [ventasAnterioresResult, comprasAnterioresResult] = await Promise.all([
          supabase
            .from('reg_ventas')
            .select('*')
            .lt('fecha_docto', firstDate)
            .order('fecha_docto', { ascending: true }),
          supabase
            .from('reg_compras')
            .select('*')
            .lt('fecha_docto', firstDate)
            .order('fecha_docto', { ascending: true })
        ]);

        // Calcular acumulado histórico
        let acumuladoHistorico = 0;

        if (ventasAnterioresResult.data) {
          const ventasAnteriores = groupRelatedDocuments(ventasAnterioresResult.data);
          ventasAnteriores.forEach(group => {
            const originalInvoice = group.original;
            if (!group.isFullyCancelled) {
              acumuladoHistorico += originalInvoice.monto_total || 0;
            }
            group.creditNotes.forEach(creditNote => {
              acumuladoHistorico -= Math.abs(creditNote.monto_total || 0);
            });
          });
        }

        if (comprasAnterioresResult.data) {
          comprasAnterioresResult.data.forEach(compra => {
            const multiplier = getDocumentMultiplier(compra.tipo_doc || '');
            acumuladoHistorico -= (compra.monto_total || 0) * multiplier;
          });
        }

        // Agregar entradas manuales anteriores
        const manualEntriesAnteriores = await getManualEntries({
          dateTo: firstDate
        });

        manualEntriesAnteriores.forEach(entry => {
          if (entry.entry_type === 'income') {
            acumuladoHistorico += entry.amount;
          } else {
            acumuladoHistorico -= entry.amount;
          }
        });

        // Ahora procesar solo los items del mes seleccionado con el acumulado histórico
        const itemsDelMes = flujoItems.filter(item => {
          const itemDate = parseISO(item.fecha);
          return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
        });

        itemsDelMes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        let acumulado = acumuladoHistorico;
        itemsDelMes.forEach(item => {
          if (item.tipo === 'INGRESO') {
            acumulado += item.monto;
          } else {
            acumulado -= item.monto;
          }
          item.acumulado = acumulado;
        });

        setFlujoCompleto(flujoItems);
        setFlujo(itemsDelMes);
      } else {
        // Modo "Solo mes": calcular acumulado desde el inicio del mes
        const itemsDelMes = flujoItems.filter(item => {
          const itemDate = parseISO(item.fecha);
          return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
        });

        itemsDelMes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        let acumulado = 0;
        itemsDelMes.forEach(item => {
          if (item.tipo === 'INGRESO') {
            acumulado += item.monto;
          } else {
            acumulado -= item.monto;
          }
          item.acumulado = acumulado;
        });

        setFlujoCompleto(flujoItems);
        setFlujo(itemsDelMes);
      }

      // Filtrar solo los items del mes seleccionado para mostrar en la tabla
      const itemsDelMes = flujoItems.filter(item => {
        const itemDate = parseISO(item.fecha);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      });

      console.log('💰 Flujo de caja procesado correctamente');
      console.log('Items totales procesados:', flujoItems.length);
      console.log('Items del mes para tabla:', itemsDelMes.length);

      setFlujoCompleto(flujoItems); // Guardar todos los datos para cálculos de acumulado
      setFlujo(itemsDelMes); // Mostrar solo los del mes en la tabla
    } catch (error) {
      console.error('❌ Error al obtener flujo de caja:', error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFlujoCaja();
  }, []);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    const { dateFrom: newDateFrom, dateTo: newDateTo } = getMonthDateRange(month, year);
    setDateFrom(newDateFrom);
    setDateTo(newDateTo);
  };

  const handleSort = (field: string) => {
    let direction: SortDirection = 'asc';

    if (sortConfig && sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig && sortConfig.field === field && sortConfig.direction === 'desc') {
      direction = null;
    }

    setSortConfig(direction ? { field, direction } : null);
  };

  useEffect(() => {
    fetchFlujoCaja();
  }, [dateFrom, dateTo, soloMes]);

  // Sort the flujo data
  const sortedFlujo = React.useMemo(() => {
    if (!sortConfig) return flujo;

    const sorted = [...flujo].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortConfig.field) {
        case 'fecha':
          aValue = new Date(a.fecha).getTime();
          bValue = new Date(b.fecha).getTime();
          break;
        case 'tipo':
          aValue = a.tipo;
          bValue = b.tipo;
          break;
        case 'descripcion':
          aValue = a.descripcion.toLowerCase();
          bValue = b.descripcion.toLowerCase();
          break;
        case 'documento':
          aValue = a.documento.toLowerCase();
          bValue = b.documento.toLowerCase();
          break;
        case 'monto':
          aValue = a.monto;
          bValue = b.monto;
          break;
        case 'acumulado':
          aValue = a.acumulado;
          bValue = b.acumulado;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [flujo, sortConfig]);

  const totalIngresos = flujo
    .filter(item => item.tipo === 'INGRESO')
    .reduce((sum, item) => sum + item.monto, 0);

  const totalEgresos = flujo
    .filter(item => item.tipo === 'EGRESO')
    .reduce((sum, item) => sum + item.monto, 0);

  const flujoNeto = totalIngresos - totalEgresos;
  const saldoFinal = flujo.length > 0 ? flujo[flujo.length - 1].acumulado : 0;

  return (
    <div className="space-y-6">
      {/* Controles Compactos en Header */}
      <CompactHeaderControls
        soloMes={soloMes}
        onSoloMesChange={setSoloMes}
      />

      {/* Selector de Mes */}
      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
      />

      {/* Gráfico de Flujo de Caja */}
      <CashFlowChart
        flujoData={flujo}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        soloMes={soloMes}
      />

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-emerald-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Ingresos</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${totalIngresos.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-red-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Egresos</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${totalEgresos.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <TrendingDown className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
          flujoNeto >= 0 ? 'from-blue-500 via-indigo-600 to-purple-600' : 'from-orange-500 via-amber-600 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className={`text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate ${flujoNeto >= 0 ? 'text-blue-100' : 'text-orange-100'}`}>
                Flujo Neto
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${flujoNeto.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <BarChart3 className={`h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white`} />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
          saldoFinal >= 0 ? 'from-violet-500 via-purple-600 to-indigo-600' : 'from-slate-500 via-gray-600 to-zinc-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className={`text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate ${saldoFinal >= 0 ? 'text-violet-100' : 'text-slate-100'}`}>
                Saldo Acumulado
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${saldoFinal.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <DollarSign className={`h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white`} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de flujo */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-slate-200/50">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Flujo de Caja Detallado</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full lg:min-w-[1200px] divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <SortableHeader
                  field="fecha"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Fecha
                </SortableHeader>
                <SortableHeader
                  field="tipo"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-20 sm:w-24"
                >
                  Tipo
                </SortableHeader>
                <SortableHeader
                  field="descripcion"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-64 lg:w-80 xl:w-96"
                >
                  Descripción
                </SortableHeader>
                <SortableHeader
                  field="documento"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-24 sm:w-28 lg:w-32"
                >
                  Documento
                </SortableHeader>
                <SortableHeader
                  field="monto"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-24 sm:w-28 text-right"
                >
                  Monto
                </SortableHeader>
                <SortableHeader
                  field="acumulado"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-28 sm:w-32 lg:w-36 text-right"
                >
                  Acumulado
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
               {loading ? (
                 <tr>
                   <td colSpan={6} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                     <div className="flex flex-col items-center space-y-4">
                       <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                       <p className="text-slate-500 font-medium text-sm sm:text-base">Cargando flujo de caja...</p>
                     </div>
                   </td>
                 </tr>
               ) : flujo.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                     <div className="flex flex-col items-center space-y-4">
                       <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                         <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                       </div>
                       <p className="text-slate-500 font-medium text-sm sm:text-base">No se encontraron movimientos en el período seleccionado</p>
                     </div>
                   </td>
                 </tr>
               ) : (
                 sortedFlujo.map((item, index) => (
                   <tr key={index} className="hover:bg-slate-50/50 transition-all duration-200">
                     <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                       {format(parseISO(item.fecha), 'dd/MM/yyyy', { locale: es })}
                     </td>
                     <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap">
                       <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold ${
                         item.tipo === 'INGRESO'
                           ? 'bg-emerald-100 text-emerald-800'
                           : 'bg-red-100 text-red-800'
                       }`}>
                         {item.tipo === 'INGRESO' ? (
                           <ArrowUp className="w-3 h-3 mr-1 sm:mr-1.5" />
                         ) : (
                           <ArrowDown className="w-3 h-3 mr-1 sm:mr-1.5" />
                         )}
                         <span className="hidden sm:inline">{item.tipo}</span>
                         <span className="sm:hidden">{item.tipo === 'INGRESO' ? 'ING' : 'EGR'}</span>
                       </span>
                     </td>
                     <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm text-slate-900 font-medium w-64 lg:w-80 xl:w-96">
                       <div className="break-words" title={item.descripcion}>
                         {item.descripcion}
                       </div>
                     </td>
                     <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-20 sm:max-w-24 lg:max-w-full" title={item.documento}>
                       {item.documento}
                     </td>
                     <td className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm text-right font-bold ${
                       item.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'
                     }`}>
                       {item.tipo === 'INGRESO' ? '+' : '-'}${item.monto.toLocaleString()}
                     </td>
                     <td className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm text-right font-bold ${
                       item.acumulado >= 0 ? 'text-indigo-600' : 'text-red-600'
                     }`}>
                       ${item.acumulado.toLocaleString()}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};