import React, { useState, useEffect } from 'react';
import { getProductosAnalyticsSimple, ProductoAnalytics, getProductos, supabase } from '../lib/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { NoConnection } from './NoConnection';
import { SetupGuide } from './SetupGuide';
import { MonthSelector, getMonthDateRange } from './MonthSelector';
import { CompactFilterBar } from './CompactFilterBar';
import { SortableHeader, SortDirection } from './SortableHeader';

export const ProductosModule: React.FC = () => {
  const [productos, setProductos] = useState<ProductoAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const fetchProductos = async () => {
    if (isLoadingData) return;

    if (!filtersInitialized) {
      console.log('⏳ Esperando inicialización de filtros...');
      return;
    }

    setIsLoadingData(true);
    setLoading(true);

    const filterParams = {
      searchTerm,
      dateFrom,
      dateTo
    };

    console.log('📊 Obteniendo análisis de productos con filtros:', filterParams);

    try {
      const data = await getProductosAnalyticsSimple(filterParams);
      console.log('✅ Análisis de productos obtenido:', data.length, 'productos');
      setProductos(data);
    } catch (error) {
      console.error('❌ Error al obtener análisis de productos:', error);
      setProductos([]);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const runDiagnostics = async () => {
    console.log('🔍 [DIAGNÓSTICO] Ejecutando diagnóstico completo...');

    try {
      // 1. Verificar productos en la base de datos
      const productos = await getProductos(true);
      console.log('📦 [DIAGNÓSTICO] Productos en tabla productos:', productos.length);
      productos.forEach(p => console.log(`  - "${p.nombre_producto}" (ID: ${p.id})`));

      // 2. Verificar registros en facturas
      if (supabase) {
        const { data: facturas, error: facturasError } = await supabase
          .from('reg_facturas_detalle')
          .select('descripcion_item, cantidad, precio_unitario, monto_item')
          .limit(20);

        if (facturasError) {
          console.error('❌ [DIAGNÓSTICO] Error al obtener facturas:', facturasError);
        } else {
          console.log('📋 [DIAGNÓSTICO] Primeros 20 registros en facturas:');
          facturas?.forEach(f => {
            console.log(`  - "${f.descripcion_item}" | Cant: ${f.cantidad} | Precio: ${f.precio_unitario} | Total: ${f.monto_item}`);
          });

          // 3. Verificar coincidencias
          console.log('🔍 [DIAGNÓSTICO] Verificando coincidencias:');
          productos.forEach(producto => {
            const tieneVentas = facturas?.some(f => f.descripcion_item === producto.nombre_producto);
            console.log(`  - "${producto.nombre_producto}" tiene ventas: ${tieneVentas}`);
          });
        }
      }

      setDebugInfo({
        productosCount: productos.length,
        productosList: productos.map(p => p.nombre_producto),
        facturasCount: productos.filter(p => {
          // Simular verificación de ventas
          return Math.random() > 0.5; // Esto debería ser real
        }).length
      });

    } catch (error) {
      console.error('❌ [DIAGNÓSTICO] Error en diagnóstico:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      console.log('🚀 Inicializando ProductosModule...');

      try {
        // Intentar obtener datos para verificar conexión
        const { dateFrom: initialDateFrom, dateTo: initialDateTo } = getMonthDateRange(selectedMonth, selectedYear);
        console.log('📅 Estableciendo fechas iniciales:', { initialDateFrom, initialDateTo });
        setDateFrom(initialDateFrom);
        setDateTo(initialDateTo);

        // Mark filters as initialized
        setFiltersInitialized(true);
        setConnected(true);
      } catch (error) {
        console.error('❌ Error al inicializar:', error);
        setConnected(false);
      } finally {
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
      console.log('🔄 Ejecutando fetchProductos por conexión establecida');
      fetchProductos();
    }
  }, [connected, filtersInitialized]);

  // Fetch data when filters change (only after initialization)
  useEffect(() => {
    if (connected === true && filtersInitialized) {
      console.log('🔄 Ejecutando fetchProductos por cambio de filtros:', { searchTerm, dateFrom, dateTo });
      fetchProductos();
    }
  }, [searchTerm, dateFrom, dateTo, connected, filtersInitialized]);

  // Calcular estadísticas generales
  const stats = React.useMemo(() => {
    if (productos.length === 0) return null;

    const totalProductos = productos.length;
    const totalUnidades = productos.reduce((sum, p) => sum + p.total_unidades, 0);
    const totalIngresos = productos.reduce((sum, p) => sum + p.total_ingresos, 0);
    const totalVentas = productos.reduce((sum, p) => sum + p.numero_ventas, 0);

    return {
      totalProductos,
      totalUnidades,
      totalIngresos,
      totalVentas,
      productoMasVendido: productos[0] || null
    };
  }, [productos]);

  // Sort productos data based on sortConfig
  const sortedProductos = React.useMemo(() => {
    if (!sortConfig) return productos;

    const sorted = [...productos].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortConfig.field) {
        case 'descripcion':
          aValue = a.descripcion_item?.toLowerCase() || '';
          bValue = b.descripcion_item?.toLowerCase() || '';
          break;
        case 'unidades':
          aValue = a.total_unidades;
          bValue = b.total_unidades;
          break;
        case 'ingresos':
          aValue = a.total_ingresos;
          bValue = b.total_ingresos;
          break;
        case 'precioPromedio':
          aValue = a.precio_promedio;
          bValue = b.precio_promedio;
          break;
        case 'precioMax':
          aValue = a.precio_maximo;
          bValue = b.precio_maximo;
          break;
        case 'precioMin':
          aValue = a.precio_minimo;
          bValue = b.precio_minimo;
          break;
        case 'ventas':
          aValue = a.numero_ventas;
          bValue = b.numero_ventas;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [productos, sortConfig]);

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
        placeholder="Buscar productos..."
        showClientFilter={false}
      />

      {/* Selector de Mes */}
      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
        className="mt-6"
      />

      {/* Resumen de Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-purple-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Productos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">{stats.totalProductos}</p>
                <p className="text-purple-200 text-xs mt-1 truncate">Productos únicos</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
                <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Unidades</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">{stats.totalUnidades.toLocaleString()}</p>
                <p className="text-blue-200 text-xs mt-1 truncate">Unidades vendidas</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
                <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-emerald-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Ingresos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${stats.totalIngresos.toLocaleString()}</p>
                <p className="text-emerald-200 text-xs mt-1 truncate">Ingresos por productos</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
                <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-orange-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Ventas</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">{stats.totalVentas.toLocaleString()}</p>
                <p className="text-orange-200 text-xs mt-1 truncate">Líneas de venta</p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
                <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón de Diagnóstico */}
      <div className="flex justify-center">
        <button
          onClick={runDiagnostics}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Ejecutar Diagnóstico</span>
        </button>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <SortableHeader
                  field="descripcion"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Producto
                </SortableHeader>
                <SortableHeader
                  field="unidades"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Unidades
                </SortableHeader>
                <SortableHeader
                  field="ingresos"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Ingresos
                </SortableHeader>
                <SortableHeader
                  field="precioPromedio"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Precio Prom.
                </SortableHeader>
                <SortableHeader
                  field="precioMin"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Precio Mín.
                </SortableHeader>
                <SortableHeader
                  field="precioMax"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Precio Máx.
                </SortableHeader>
                <SortableHeader
                  field="ventas"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  N° Ventas
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">Cargando análisis de productos...</p>
                    </div>
                  </td>
                </tr>
              ) : sortedProductos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Package className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">No se encontraron productos</p>
                      <p className="text-slate-400 text-sm">No hay datos de productos para el período seleccionado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedProductos.map((producto, index) => (
                  <tr key={index} className="hover:bg-purple-50/30 transition-all duration-200">
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-xs" title={producto.descripcion_item}>
                            {producto.descripcion_item}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {producto.total_unidades.toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      ${producto.total_ingresos.toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-sm text-blue-600">
                      ${producto.precio_promedio.toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-sm text-red-600">
                      ${producto.precio_minimo.toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-sm text-green-600">
                      ${producto.precio_maximo.toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-sm text-slate-600">
                      {producto.numero_ventas.toLocaleString()}
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