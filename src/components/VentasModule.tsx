import React, { useState, useEffect } from 'react';
import { getVentas, getClientes, testVentasConnection, calculateVentasTotal, getDocumentStats, markInvoiceAsFactored, unmarkInvoiceAsFactored, groupRelatedDocuments } from '../lib/database';
import { RegVenta } from '../types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Minus,
  Plus,
  CreditCard
} from 'lucide-react';
import { NoConnection } from './NoConnection';
import { SetupGuide } from './SetupGuide';
import { MonthSelector, getMonthDateRange } from './MonthSelector';
import { getDocumentTypeName, getDocumentTypeColor, getDocumentMultiplier } from '../lib/documentTypes';
import { CompactFilterBar } from './CompactFilterBar';
import { SortableHeader, SortDirection } from './SortableHeader';
import { VentasDetalleModal } from './VentasDetalleModal';

export const VentasModule: React.FC = () => {
  const [ventas, setVentas] = useState<RegVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRutCliente, setSelectedRutCliente] = useState('');
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [clientes, setClientes] = useState<Array<{rut: string, razon_social: string}>>([]);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // Current month by default
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [showFactoringModal, setShowFactoringModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RegVenta | null>(null);
  const [factoringDate, setFactoringDate] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [documentGroups, setDocumentGroups] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false); // Prevent multiple API calls
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedDetalleFactura, setSelectedDetalleFactura] = useState<{
    id: number;
    folio: string;
    cliente: string;
    fecha: string;
    total: number;
  } | null>(null);

  const fetchVentas = async () => {
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
      rutCliente: selectedRutCliente
    };

    console.log('📊 Obteniendo ventas con filtros:', filterParams);

    try {
      const data = await getVentas(filterParams);
      console.log('✅ Ventas obtenidas:', data.length, 'registros');

      setVentas(data);

      // Group related documents (invoices with their credit notes)
      const groups = groupRelatedDocuments(data);
      setDocumentGroups(groups);
    } catch (error) {
      console.error('❌ Error al obtener ventas:', error);
      setVentas([]);
      setDocumentGroups([]);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (error) {
      console.error('❌ Error al obtener clientes:', error);
      setClientes([]);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      console.log('🚀 Inicializando VentasModule...');

      // Probar conexión a tabla de ventas
      const isConnected = await testVentasConnection();
      setConnected(isConnected);

      if (isConnected) {
        console.log('✅ Conectado, cargando clientes...');
        await fetchClientes();

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

  const handleMarkAsFactored = (invoice: RegVenta) => {
    setSelectedInvoice(invoice);
    setFactoringDate(invoice.fecha_recepcion || new Date().toISOString().split('T')[0]);
    setShowFactoringModal(true);
  };

  const handleFactoringSubmit = async () => {
    if (!selectedInvoice) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      if (selectedInvoice.is_factored) {
        await unmarkInvoiceAsFactored(selectedInvoice.id);
      } else {
        await markInvoiceAsFactored(selectedInvoice.id, today);
      }
      setShowFactoringModal(false);
      setSelectedInvoice(null);
      setFactoringDate('');
      await fetchVentas();
    } catch (error) {
      console.error('Error updating factoring status:', error);
      alert('Error al actualizar el estado de factoring');
    }
  };

  const handleBulkFactoring = async (markAsFactored: boolean) => {
    if (selectedInvoices.size === 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const promises = Array.from(selectedInvoices).map(invoiceId => {
        if (markAsFactored) {
          return markInvoiceAsFactored(invoiceId, today);
        } else {
          return unmarkInvoiceAsFactored(invoiceId);
        }
      });

      await Promise.all(promises);
      setSelectedInvoices(new Set());
      setShowBulkActions(false);
      await fetchVentas();
    } catch (error) {
      console.error('Error updating bulk factoring status:', error);
      alert('Error al actualizar el estado de factoring en masa');
    }
  };

  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = ventas.map(v => v.id);
      setSelectedInvoices(new Set(allIds));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const closeFactoringModal = () => {
    setShowFactoringModal(false);
    setSelectedInvoice(null);
    setFactoringDate('');
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

  const handleShowDetalle = (invoice: RegVenta) => {
    setSelectedDetalleFactura({
      id: invoice.id,
      folio: invoice.folio || invoice.nro?.toString() || '',
      cliente: invoice.razon_social || '-',
      fecha: invoice.fecha_docto || '',
      total: invoice.monto_total || 0
    });
    setShowDetalleModal(true);
  };

  const closeDetalleModal = () => {
    setShowDetalleModal(false);
    setSelectedDetalleFactura(null);
  };

  // Fetch data when connection is established and filters are initialized
  useEffect(() => {
    if (connected === true && filtersInitialized) {
      console.log('🔄 Ejecutando fetchVentas por conexión establecida');
      fetchVentas();
    }
  }, [connected, filtersInitialized]);

  // Fetch data when filters change (only after initialization)
  useEffect(() => {
    if (connected === true && filtersInitialized) {
      console.log('🔄 Ejecutando fetchVentas por cambio de filtros:', { searchTerm, dateFrom, dateTo, selectedRutCliente });
      fetchVentas();
    }
  }, [searchTerm, dateFrom, dateTo, selectedRutCliente, connected, filtersInitialized]);

  const totalVentas = calculateVentasTotal(ventas);
  const ventasStats = getDocumentStats(ventas, 'tipo_doc');

  // Sort document groups based on sortConfig
  const sortedDocumentGroups = React.useMemo(() => {
    if (!sortConfig) return documentGroups;

    const sorted = [...documentGroups].sort((a, b) => {
      const invoiceA = a.original;
      const invoiceB = b.original;
      let aValue: any, bValue: any;

      switch (sortConfig.field) {
        case 'folio':
          aValue = invoiceA.folio || '';
          bValue = invoiceB.folio || '';
          break;
        case 'fecha':
          aValue = new Date(invoiceA.fecha_docto || '').getTime();
          bValue = new Date(invoiceB.fecha_docto || '').getTime();
          break;
        case 'cliente':
          aValue = invoiceA.razon_social?.toLowerCase() || '';
          bValue = invoiceB.razon_social?.toLowerCase() || '';
          break;
        case 'tipo':
          aValue = invoiceA.tipo_doc || '';
          bValue = invoiceB.tipo_doc || '';
          break;
        case 'montoNeto':
          aValue = Math.abs(invoiceA.monto_neto || 0);
          bValue = Math.abs(invoiceB.monto_neto || 0);
          break;
        case 'iva':
          aValue = Math.abs(invoiceA.monto_iva || 0);
          bValue = Math.abs(invoiceB.monto_iva || 0);
          break;
        case 'montoTotal':
          aValue = Math.abs(invoiceA.monto_total || 0);
          bValue = Math.abs(invoiceB.monto_total || 0);
          break;
        case 'estado':
          aValue = invoiceA.fecha_recepcion ? 'Recibida' : 'Pendiente';
          bValue = invoiceB.fecha_recepcion ? 'Recibida' : 'Pendiente';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [documentGroups, sortConfig]);

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
        selectedClient={selectedRutCliente}
        onClientChange={setSelectedRutCliente}
        clients={clientes}
        placeholder="Producto, folio, cliente..."
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
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Documentos</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">{ventas.length}</p>
              <p className="text-blue-200 text-xs mt-1 truncate">
                {ventasStats.regularDocs} docs + {ventasStats.creditNotes} NC
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-emerald-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Ventas Brutas</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${ventasStats.positive.toLocaleString()}</p>
              <p className="text-emerald-200 text-xs mt-1 truncate">Sin notas de crédito</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <Plus className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 via-red-600 to-rose-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-red-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Notas de Crédito</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${ventasStats.negative.toLocaleString()}</p>
              <p className="text-red-200 text-xs mt-1 truncate">{ventasStats.creditNotes} documentos</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <Minus className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-violet-100 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2 truncate">Total Neto</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-all">${totalVentas.toLocaleString()}</p>
              <p className="text-violet-200 text-xs mt-1 truncate">Ventas - Créditos</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm ml-3 flex-shrink-0">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedInvoices.size} factura(s) seleccionada(s)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkFactoring(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Marcar como Factorizadas
              </button>
              <button
                onClick={() => handleBulkFactoring(false)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Quitar Factoring
              </button>
              <button
                onClick={() => setSelectedInvoices(new Set())}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Limpiar Selección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.size === ventas.length && ventas.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <SortableHeader
                  field="folio"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-24 sm:w-28 lg:w-32"
                >
                  Folio
                </SortableHeader>
                <SortableHeader
                  field="fecha"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Fecha Documento
                </SortableHeader>
                <SortableHeader
                  field="cliente"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-40 sm:w-48 lg:w-56"
                >
                  Cliente
                </SortableHeader>
                <SortableHeader
                  field="tipo"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-24 sm:w-28"
                >
                  Tipo Doc
                </SortableHeader>
                <SortableHeader
                  field="montoNeto"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-24 sm:w-28 text-right"
                >
                  Monto Neto
                </SortableHeader>
                <SortableHeader
                  field="iva"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-20 sm:w-24 text-right"
                >
                  IVA
                </SortableHeader>
                <SortableHeader
                  field="montoTotal"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-28 sm:w-32 text-right"
                >
                  Monto Total
                </SortableHeader>
                <SortableHeader
                  field="estado"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-24 sm:w-28"
                >
                  Estado
                </SortableHeader>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Factoring
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">Cargando ventas...</p>
                    </div>
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedDocumentGroups.map((group) => {
                  const originalInvoice = group.original;
                  const isCredit = getDocumentMultiplier(originalInvoice.tipo_doc || '') === -1;

                  return (
                    <React.Fragment key={originalInvoice.id}>
                      {/* Original Invoice Row */}
                      <tr
                        className={`hover:bg-blue-50/30 transition-all duration-200 cursor-pointer ${group.isFullyCancelled ? 'bg-green-50/30' : ''}`}
                        onClick={() => handleShowDetalle(originalInvoice)}
                        title="Click para ver detalle"
                      >
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-center">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.has(originalInvoice.id)}
                            onChange={(e) => handleSelectInvoice(originalInvoice.id, e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 font-medium text-slate-900 w-24 sm:w-28 lg:w-32">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <span className="truncate" title={originalInvoice.folio || '-'}>{originalInvoice.folio || '-'}</span>
                            {group.creditNotes.length > 0 && (
                              <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 whitespace-nowrap">
                                {group.creditNotes.length} NC
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                          {originalInvoice.fecha_docto ?
                            format(new Date(originalInvoice.fecha_docto), 'dd/MM/yyyy', { locale: es }) :
                            '-'
                          }
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm text-slate-900">
                          <div className="font-medium truncate max-w-32 sm:max-w-40 lg:max-w-full" title={originalInvoice.razon_social || '-'}>
                            {originalInvoice.razon_social || '-'}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-32 sm:max-w-40 lg:max-w-full">{originalInvoice.rut_cliente}</div>
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm text-slate-600">
                          <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(originalInvoice.tipo_doc || '')}`}>
                            {getDocumentTypeName(originalInvoice.tipo_doc || '')}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                          ${Math.abs(originalInvoice.monto_neto || 0).toLocaleString()}
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                          ${Math.abs(originalInvoice.monto_iva || 0).toLocaleString()}
                        </td>
                        <td className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-xs sm:text-sm font-semibold ${group.isFullyCancelled ? 'text-green-600' : 'text-slate-900'}`}>
                          <div className="flex flex-col">
                            <span>${Math.abs(originalInvoice.monto_total || 0).toLocaleString()}</span>
                            {group.creditNotes.length > 0 && !group.isFullyCancelled && (
                              <span className="text-xs text-orange-600">
                                Neto: ${group.netAmount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm">
                          <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {originalInvoice.fecha_recepcion ? 'Recibida' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-center">
                          <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                            {originalInvoice.is_factored && (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                <CreditCard className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                                <span className="hidden sm:inline">Factorizada</span>
                                <span className="sm:hidden">Fact</span>
                              </span>
                            )}
                            <button
                              onClick={() => handleMarkAsFactored(originalInvoice)}
                              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                originalInvoice.is_factored
                                  ? 'text-red-600 hover:bg-red-100'
                                  : 'text-blue-600 hover:bg-blue-100'
                              }`}
                              title={originalInvoice.is_factored ? 'Quitar factoring' : 'Marcar como factorizada'}
                            >
                              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Credit Notes Rows */}
                      {group.creditNotes.map((creditNote: RegVenta, index: number) => (
                        <tr key={creditNote.id} className="bg-red-50/20 hover:bg-red-50/40 transition-all duration-200">
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-center">
                            <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center">
                              <span className="text-red-600 text-xs font-bold">{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 font-medium text-red-800 pl-8 sm:pl-10 lg:pl-12 w-24 sm:w-28 lg:w-32">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <span className="truncate" title={creditNote.folio || '-'}>{creditNote.folio || '-'}</span>
                              <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 whitespace-nowrap">
                                NC
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-xs sm:text-sm text-red-600 whitespace-nowrap">
                            {creditNote.fecha_docto ?
                              format(new Date(creditNote.fecha_docto), 'dd/MM/yyyy', { locale: es }) :
                              '-'
                            }
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-xs sm:text-sm text-red-800">
                            <div className="font-medium truncate max-w-32 sm:max-w-40 lg:max-w-full" title={creditNote.razon_social || '-'}>{creditNote.razon_social || '-'}</div>
                            <div className="text-red-400 text-xs truncate max-w-32 sm:max-w-40 lg:max-w-full">Nota de Crédito</div>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-xs sm:text-sm text-red-600">
                            <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(creditNote.tipo_doc || '')}`}>
                              {getDocumentTypeName(creditNote.tipo_doc || '')}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 whitespace-nowrap text-xs sm:text-sm text-red-600">
                            -${Math.abs(creditNote.monto_neto || 0).toLocaleString()}
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 whitespace-nowrap text-xs sm:text-sm text-red-600">
                            -${Math.abs(creditNote.monto_iva || 0).toLocaleString()}
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 whitespace-nowrap text-xs sm:text-sm font-semibold text-red-600">
                            -${Math.abs(creditNote.monto_total || 0).toLocaleString()}
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-xs sm:text-sm">
                            <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Nota de Crédito
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-center">
                            {/* No factoring for credit notes */}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factoring Modal */}
      {showFactoringModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedInvoice.is_factored ? 'Modificar Factoring' : 'Marcar como Factorizada'}
                  </h3>
                  <p className="text-sm text-slate-600">Factura {selectedInvoice.folio || selectedInvoice.nro}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cliente:</span>
                  <span className="font-medium text-slate-900">{selectedInvoice.razon_social}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monto:</span>
                  <span className="font-medium text-slate-900">${selectedInvoice.monto_total?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Fecha original:</span>
                  <span className="font-medium text-slate-900">
                    {selectedInvoice.fecha_recepcion ? format(new Date(selectedInvoice.fecha_recepcion), 'dd/MM/yyyy', { locale: es }) : 'Pendiente'}
                  </span>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Fecha de factoring: {format(new Date(), 'dd/MM/yyyy', { locale: es })}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Se usará la fecha actual para el flujo de caja
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <button
                onClick={closeFactoringModal}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleFactoringSubmit}
                className={`flex-1 px-4 py-3 font-medium rounded-xl transition-all duration-200 ${
                  selectedInvoice.is_factored
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {selectedInvoice.is_factored ? 'Quitar Factoring' : 'Marcar como Factorizada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ventas Detalle Modal */}
      {showDetalleModal && selectedDetalleFactura && (
        <VentasDetalleModal
          isOpen={showDetalleModal}
          onClose={closeDetalleModal}
          facturaId={selectedDetalleFactura.id}
          facturaFolio={selectedDetalleFactura.folio}
          cliente={selectedDetalleFactura.cliente}
          fecha={selectedDetalleFactura.fecha}
          total={selectedDetalleFactura.total}
        />
      )}
    </div>
  );
};