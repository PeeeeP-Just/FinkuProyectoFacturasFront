import React, { useState, useEffect } from 'react';
import { getCompras, getProveedores, testComprasConnection, calculateComprasTotal, getDocumentStats } from '../lib/database';
import { RegCompra } from '../types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  TrendingDown,
  Building,
  DollarSign,
  Minus,
  Plus
} from 'lucide-react';
import { NoConnection } from './NoConnection';
import { SetupGuide } from './SetupGuide';
import { MonthSelector, getMonthDateRange } from './MonthSelector';
import { getDocumentTypeName, getDocumentTypeColor, getDocumentMultiplier } from '../lib/documentTypes';
import { CompactFilterBar } from './CompactFilterBar';
import { SortableHeader, SortDirection } from './SortableHeader';

export const ComprasModule: React.FC = () => {
  const [compras, setCompras] = useState<RegCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRutProveedor, setSelectedRutProveedor] = useState('');
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [proveedores, setProveedores] = useState<Array<{rut: string, razon_social: string}>>([]);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // Current month by default
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [isLoadingData, setIsLoadingData] = useState(false); // Prevent multiple API calls
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  } | null>(null);

  const fetchCompras = async () => {
    if (isLoadingData) return; // Prevent multiple simultaneous calls

    // Only fetch if filters are initialized
    if (!filtersInitialized) {
      console.log('⏳ Esperando inicialización de filtros...');
      return;
    }

    setIsLoadingData(true);
    setLoading(true);

    const filterParams = {
      searchTerm,
      dateFrom,
      dateTo,
      rutProveedor: selectedRutProveedor
    };

    console.log('📊 Obteniendo compras con filtros:', filterParams);

    try {
      const data = await getCompras(filterParams);
      console.log('✅ Compras obtenidas:', data.length, 'registros');
      setCompras(data);
    } catch (error) {
      console.error('❌ Error al obtener compras:', error);
      setCompras([]);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const fetchProveedores = async () => {
    try {
      const data = await getProveedores();
      setProveedores(data);
    } catch (error) {
      console.error('❌ Error al obtener proveedores:', error);
      setProveedores([]);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      console.log('🚀 Inicializando ComprasModule...');

      // Probar conexión a tabla de compras
      const isConnected = await testComprasConnection();
      setConnected(isConnected);

      if (isConnected) {
        console.log('✅ Conectado, cargando proveedores...');
        await fetchProveedores();

        // Set initial month dates to current month
        const { dateFrom: initialDateFrom, dateTo: initialDateTo } = getMonthDateRange(selectedMonth, selectedYear);
        console.log('📅 Estableciendo fechas iniciales:', { initialDateFrom, initialDateTo });
        setDateFrom(initialDateFrom);
        setDateTo(initialDateTo);

        // Mark filters as initialized
        setFiltersInitialized(true);
      } else {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    const { dateFrom: newDateFrom, dateTo: newDateTo } = getMonthDateRange(month, year);
    setDateFrom(newDateFrom);
    setDateTo(newDateTo);
  };


  // Fetch data when connection is established and filters are initialized
  useEffect(() => {
    if (connected === true && filtersInitialized) {
      console.log('🔄 Ejecutando fetchCompras por conexión establecida');
      fetchCompras();
    }
  }, [connected, filtersInitialized]);

  // Fetch data when filters change (only after initialization)
  useEffect(() => {
    if (connected === true && filtersInitialized) {
      console.log('🔄 Ejecutando fetchCompras por cambio de filtros:', { searchTerm, dateFrom, dateTo, selectedRutProveedor });
      fetchCompras();
    }
  }, [searchTerm, dateFrom, dateTo, selectedRutProveedor, connected, filtersInitialized]);

  const totalCompras = calculateComprasTotal(compras);
  const comprasStats = getDocumentStats(compras, 'tipo_doc');

  // Las compras ya vienen como registros individuales de la tabla reg_compras
  const comprasOrdenadas = compras.sort((a, b) => {
    const fechaA = a.fecha_docto || '';
    const fechaB = b.fecha_docto || '';
    return new Date(fechaB).getTime() - new Date(fechaA).getTime();
  });

  // Sort compras data based on sortConfig
  const sortedCompras = React.useMemo(() => {
    if (!sortConfig) return comprasOrdenadas;

    const sorted = [...comprasOrdenadas].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortConfig.field) {
        case 'folio':
          aValue = a.folio || '';
          bValue = b.folio || '';
          break;
        case 'fecha':
          aValue = new Date(a.fecha_docto || '').getTime();
          bValue = new Date(b.fecha_docto || '').getTime();
          break;
        case 'proveedor':
          aValue = a.razon_social?.toLowerCase() || '';
          bValue = b.razon_social?.toLowerCase() || '';
          break;
        case 'tipo':
          aValue = a.tipo_doc || '';
          bValue = b.tipo_doc || '';
          break;
        case 'montoNeto':
          aValue = Math.abs(a.monto_neto || 0);
          bValue = Math.abs(b.monto_neto || 0);
          break;
        case 'iva':
          aValue = Math.abs(a.monto_iva_recuperable || 0);
          bValue = Math.abs(b.monto_iva_recuperable || 0);
          break;
        case 'montoTotal':
          aValue = Math.abs(a.monto_total || 0);
          bValue = Math.abs(b.monto_total || 0);
          break;
        case 'estado':
          aValue = a.fecha_recepcion ? 'Recibida' : 'Pendiente';
          bValue = b.fecha_recepcion ? 'Recibida' : 'Pendiente';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [comprasOrdenadas, sortConfig]);

  const handleSort = (field: string) => {
    let direction: SortDirection = 'asc';

    if (sortConfig && sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig && sortConfig.field === field && sortConfig.direction === 'desc') {
      direction = null;
    }

    setSortConfig(direction ? { field, direction } : null);
  };

  // Si no hay conexión, mostrar componente de configuración
  if (connected === false) {
    return (
      <>
        <NoConnection onShowSetup={() => setShowSetup(true)} />
        {showSetup && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Configuración de Supabase</h2>
                <button
                  onClick={() => setShowSetup(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <SetupGuide />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros Compacta */}
      <CompactFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        selectedClient={selectedRutProveedor}
        onClientChange={setSelectedRutProveedor}
        clients={proveedores}
        placeholder="Producto, folio, proveedor..."
        showClientFilter={true}
      />

      {/* Selector de Mes */}
      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
        className="mt-6"
      />

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-orange-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Documentos</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">{compras.length}</p>
              <p className="text-orange-200 text-xs mt-1 truncate">
                {comprasStats.regularDocs} docs + {comprasStats.creditNotes} NC
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-red-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Compras Brutas</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${comprasStats.positive.toLocaleString()}</p>
              <p className="text-red-200 text-xs mt-1 truncate">Sin notas de crédito</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <Plus className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-green-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Notas de Crédito</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${comprasStats.negative.toLocaleString()}</p>
              <p className="text-green-200 text-xs mt-1 truncate">{comprasStats.creditNotes} documentos</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <Minus className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-indigo-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Neto</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${totalCompras.toLocaleString()}</p>
              <p className="text-indigo-200 text-xs mt-1 truncate">Compras - Créditos</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <SortableHeader
                  field="folio"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Folio
                </SortableHeader>
                <SortableHeader
                  field="fecha"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Fecha Documento
                </SortableHeader>
                <SortableHeader
                  field="proveedor"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Proveedor
                </SortableHeader>
                <SortableHeader
                  field="tipo"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Tipo Doc
                </SortableHeader>
                <SortableHeader
                  field="montoNeto"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Monto Neto
                </SortableHeader>
                <SortableHeader
                  field="iva"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  IVA Recuperable
                </SortableHeader>
                <SortableHeader
                  field="montoTotal"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Monto Total
                </SortableHeader>
                <SortableHeader
                  field="estado"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Estado
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">Cargando compras...</p>
                    </div>
                  </td>
                </tr>
              ) : compras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCompras.map((compra) => {
                  const multiplier = getDocumentMultiplier(compra.tipo_doc || '');
                  const isCredit = multiplier === -1;

                  return (
                    <tr key={compra.id} className={`hover:bg-orange-50/30 transition-all duration-200 ${isCredit ? 'bg-green-50/20' : ''}`}>
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 font-medium text-slate-900 truncate max-w-20 sm:max-w-24 lg:max-w-full" title={compra.folio || '-'}>
                        {compra.folio || '-'}
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                        {compra.fecha_docto ?
                          format(new Date(compra.fecha_docto), 'dd/MM/yyyy', { locale: es }) :
                          '-'
                        }
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm text-slate-900">
                        <div className="font-medium truncate max-w-32 sm:max-w-40 lg:max-w-full" title={compra.razon_social || '-'}>{compra.razon_social || '-'}</div>
                        <div className="text-slate-400 text-xs truncate max-w-32 sm:max-w-40 lg:max-w-full">{compra.rut_proveedor}</div>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm text-slate-600">
                        <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(compra.tipo_doc || '')}`}>
                          {getDocumentTypeName(compra.tipo_doc || '')}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                        {isCredit && <span className="text-green-500">-</span>}${(compra.monto_neto || 0).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                        {isCredit && <span className="text-green-500">-</span>}${(compra.monto_iva_recuperable || 0).toLocaleString()}
                      </td>
                      <td className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-slate-900'}`}>
                        {isCredit && <span>-</span>}${(compra.monto_total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm">
                        <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {compra.fecha_recepcion ? 'Recibida' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};