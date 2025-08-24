import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FlujoCajaItem, RegVenta, RegCompra, ManualEntry, RegPago } from '../types/database';
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
  ArrowDown,
  Check
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
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // Current month by default, -1 for "all months"
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [soloMes, setSoloMes] = useState<boolean>(true); // Default to month-only mode
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  } | null>(null);


  // Función auxiliar para obtener la fecha correcta de pago para una factura
  const getPaymentDate = (invoiceId: number, invoiceType: 'venta' | 'compra', facturasXml: any[], pagos: any[]): string => {
    console.log(`🔍 Buscando pago para ${invoiceType} ID ${invoiceId}`);
    console.log(`🔍 Total facturas XML disponibles:`, facturasXml.length);
    console.log(`🔍 Total pagos disponibles:`, pagos.length);

    // Paso 1: Encontrar la factura XML relacionada
    const facturaXml = facturasXml.find(xml => {
      if (invoiceType === 'venta') {
        return xml.reg_ventas_id === invoiceId;
      } else if (invoiceType === 'compra') {
        return xml.reg_compras_id === invoiceId;
      }
      return false;
    });

    if (!facturaXml) {
      console.log(`🔍 No se encontró factura XML para ${invoiceType} ID ${invoiceId}`);
      return '';
    }

    console.log(`🔍 Factura XML encontrada:`, facturaXml);

    // Paso 2: Encontrar el pago relacionado con la factura XML
    const pago = pagos.find(p => {
      const match = p.factura_id === facturaXml.id;
      if (match) {
        console.log(`🔍 Pago encontrado:`, p);
        console.log(`🔍 Campos del pago:`, Object.keys(p));
      }
      return match;
    });

    // Posibles nombres de campos para fecha_pago
    const result = pago?.fecha_pago || pago?.fecha || '';
    console.log(`🔍 Resultado getPaymentDate para ${invoiceType} ID ${invoiceId}:`, result);
    return result;
  };

  // Función auxiliar para verificar si una factura está completamente pagada
  const isInvoiceFullyPaid = (invoiceId: number, invoiceType: 'venta' | 'compra', montoTotal: number, facturasXml: any[], pagos: any[]): boolean => {
    console.log(`🔍 Verificando pagos completos para ${invoiceType} ID ${invoiceId}, monto total: ${montoTotal}`);

    // Paso 1: Encontrar la factura XML relacionada
    const facturaXml = facturasXml.find(xml => {
      if (invoiceType === 'venta') {
        return xml.reg_ventas_id === invoiceId;
      } else if (invoiceType === 'compra') {
        return xml.reg_compras_id === invoiceId;
      }
      return false;
    });

    if (!facturaXml) {
      console.log(`🔍 No se encontró factura XML para ${invoiceType} ID ${invoiceId}`);
      return false;
    }

    console.log(`🔍 Factura XML encontrada:`, facturaXml);

    // Paso 2: Encontrar los pagos relacionados con la factura XML
    const pagosFactura = pagos.filter(p => p.factura_id === facturaXml.id);

    console.log(`🔍 Pagos encontrados para ${invoiceType} ID ${invoiceId}:`, pagosFactura.length);

    const totalPagado = pagosFactura.reduce((sum, pago) => {
      const monto = pago.monto_pago || pago.monto || 0;
      console.log(`🔍 Pago monto:`, monto);
      return sum + monto;
    }, 0);

    const isFullyPaid = totalPagado >= montoTotal;
    console.log(`🔍 Total pagado: ${totalPagado}, Total factura: ${montoTotal}, ¿Completamente pagada?: ${isFullyPaid}`);

    return isFullyPaid;
  };

  // Función auxiliar para obtener la fecha de emisión de reg_facturas_xml para facturas con nota de crédito
  const getEmissionDateForInvoiceWithCreditNote = (invoiceId: number, facturasXml: any[]): string => {
    console.log(`🔍 Buscando fecha de emisión para factura con nota de crédito ID ${invoiceId}`);

    // Paso 1: Encontrar la factura XML relacionada con la venta
    const facturaXml = facturasXml.find(xml => xml.reg_ventas_id === invoiceId);

    if (!facturaXml) {
      console.log(`🔍 No se encontró factura XML para venta ID ${invoiceId}`);
      return '';
    }

    console.log(`🔍 Factura XML encontrada:`, facturaXml);

    // Paso 2: Obtener la fecha de emisión (puede estar en diferentes campos)
    const fechaEmision = facturaXml.fecha_emision || facturaXml.created_at || '';

    console.log(`🔍 Fecha de emisión encontrada:`, fechaEmision);
    return fechaEmision;
  };

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

      // NOTA: No filtramos ventas por fecha_docto cuando soloMes=true
      // porque queremos mostrar todas las ventas que tienen pagos en el período seleccionado
      // El filtrado por fecha_pago se hará después en el procesamiento

      // Obtener compras
      console.log('📉 Consultando compras...');
      let comprasQuery = supabase
        .from('reg_compras')
        .select('*')
        .order('fecha_docto', { ascending: true });

      // NOTA: No filtramos compras por fecha_docto cuando soloMes=true
      // porque queremos mostrar todas las compras que tienen pagos en el período seleccionado
      // El filtrado por fecha_pago se hará después en el procesamiento

      // Obtener detalles de facturas XML
      console.log('📄 Consultando detalles de facturas XML...');
      let facturasXmlQuery = supabase
        .from('reg_facturas_xml')
        .select('*')
        .order('created_at', { ascending: true });

      // Obtener pagos
      console.log('💳 Consultando pagos...');
      let pagosQuery = supabase
        .from('reg_facturas_pagos')
        .select('*')
        .order('fecha_pago', { ascending: true });

      if (soloMes && dateFrom) {
        console.log('Filtro pagos fecha desde:', dateFrom);
        pagosQuery = pagosQuery.gte('fecha_pago', dateFrom);
      }
      if (soloMes && dateTo) {
        console.log('Filtro pagos fecha hasta:', dateTo);
        pagosQuery = pagosQuery.lte('fecha_pago', dateTo);
      }

      // Obtener entradas manuales
      console.log('📝 Consultando entradas manuales...');
      const manualEntries = await getManualEntries({
        dateFrom: soloMes ? (dateFrom || undefined) : undefined,
        dateTo: soloMes ? (dateTo || undefined) : undefined
      });

      const [ventasResult, comprasResult, facturasXmlResult, pagosResult] = await Promise.all([
        ventasQuery,
        comprasQuery,
        facturasXmlQuery,
        pagosQuery
      ]);

      console.log('📋 Resultados:');
      console.log('Ventas - Error:', ventasResult.error, 'Datos:', ventasResult.data?.length || 0);
      console.log('Compras - Error:', comprasResult.error, 'Datos:', comprasResult.data?.length || 0);
      console.log('Facturas XML - Error:', facturasXmlResult.error, 'Datos:', facturasXmlResult.data?.length || 0);
      console.log('Pagos - Error:', pagosResult.error, 'Datos:', pagosResult.data?.length || 0);
      console.log('Manual Entries:', manualEntries.length);

      if (ventasResult.error) throw ventasResult.error;
      if (comprasResult.error) throw comprasResult.error;
      if (facturasXmlResult.error) throw facturasXmlResult.error;
      if (pagosResult.error) throw pagosResult.error;

      const ventas = ventasResult.data || [];
      const compras = comprasResult.data || [];
      const facturasXml = facturasXmlResult.data || [];
      const pagos = pagosResult.data || [];

      console.log('💰 Procesando flujo de caja...');
      console.log('Ventas a procesar:', ventas.length);
      console.log('Compras a procesar:', compras.length);
      console.log('Facturas XML a procesar:', facturasXml.length);
      console.log('Pagos a procesar:', pagos.length);
      console.log('Entradas manuales a procesar:', manualEntries.length);

      // Debug: mostrar estructura de pagos
      if (pagos.length > 0) {
        console.log('🔍 Estructura de pagos (primer registro):', pagos[0]);
        console.log('🔍 Campos disponibles en pagos:', Object.keys(pagos[0]));
      }

      // Convertir a items de flujo de caja
      const flujoItems: FlujoCajaItem[] = [];

      // Group related documents and process them
      const documentGroups = groupRelatedDocuments(ventas);

      // Process each group (original invoice + its credit notes) with real payment dates
      for (const group of documentGroups) {
        const originalInvoice = group.original;

        // CORRECCIÓN: Lógica de prioridad de fechas según especificaciones
        // 1. Si tiene nota de crédito → prevalece la fecha de emisión de la nota de crédito
        // 2. Si está factorizada → usar fecha de factorización
        // 3. Si no, usar fecha de pago o fecha de documento

        let fechaPago = '';
        let fechaRazon = '';

        if (group.creditNotes.length > 0) {
          // PRIORIDAD 1: Nota de crédito prevalece
          const emissionDate = getEmissionDateForInvoiceWithCreditNote(originalInvoice.id, facturasXml);
          if (emissionDate) {
            fechaPago = emissionDate;
            fechaRazon = 'Nota de Crédito';
            console.log(`🔍 Venta ID ${originalInvoice.id} - Tiene nota de crédito, usando fecha de emisión:`, fechaPago);
          }
        }

        if (!fechaPago) {
          // PRIORIDAD 2: Si está factorizada, usar fecha de factorización
          if (originalInvoice.is_factored && originalInvoice.factoring_date) {
            fechaPago = originalInvoice.factoring_date;
            fechaRazon = 'Factorizada';
            console.log(`🔍 Venta ID ${originalInvoice.id} - Está factorizada, usando fecha de factorización:`, fechaPago);
          } else {
            // PRIORIDAD 3: Usar fecha de pago o fecha de documento
            const paymentDate = getPaymentDate(originalInvoice.id, 'venta', facturasXml, pagos);
            fechaPago = paymentDate || originalInvoice.fecha_docto || '';
            fechaRazon = paymentDate ? 'Pago' : 'Documento';
            console.log(`🔍 Venta ID ${originalInvoice.id} - Fecha ${fechaRazon}:`, fechaPago);
          }
        }

        console.log(`🔍 Venta ID ${originalInvoice.id} - Fecha final seleccionada (${fechaRazon}):`, fechaPago);

        // Check if invoice is fully paid
        const isFullyPaid = isInvoiceFullyPaid(originalInvoice.id, 'venta', originalInvoice.monto_total || 0, facturasXml, pagos);

        if (fechaPago) {
          flujoItems.push({
            fecha: fechaPago,
            tipo: 'INGRESO',
            descripcion: group.isFullyCancelled
              ? `Venta ${originalInvoice.folio || originalInvoice.nro} - ${originalInvoice.razon_social || 'Cliente'} (ANULADA)${originalInvoice.is_factored ? ' (Factorizada)' : ''}`
              : `Venta ${originalInvoice.folio || originalInvoice.nro} - ${originalInvoice.razon_social || 'Cliente'}${originalInvoice.is_factored ? ' (Factorizada)' : ''}`,
            monto: originalInvoice.monto_total || 0,
            acumulado: 0,
            documento: originalInvoice.folio || originalInvoice.nro?.toString() || '',
            isFullyPaid: isFullyPaid && !group.isFullyCancelled,
            invoiceId: originalInvoice.id,
            invoiceType: 'venta'
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
        // Get the payment date: first check if there's a payment record, then use document date
        const paymentDate = getPaymentDate(compra.id, 'compra', facturasXml, pagos);
        const fechaPago = paymentDate || compra.fecha_docto || '';

        // Check if purchase is fully paid
        const isFullyPaid = isInvoiceFullyPaid(compra.id, 'compra', compra.monto_total || 0, facturasXml, pagos);

        if (fechaPago) {
          flujoItems.push({
            fecha: fechaPago,
            tipo: 'EGRESO',
            descripcion: `Compra ${compra.folio || compra.nro} - ${compra.razon_social || 'Proveedor'}`,
            monto: compra.monto_total || 0,
            acumulado: 0,
            documento: compra.folio || compra.nro?.toString() || '',
            isFullyPaid: isFullyPaid,
            invoiceId: compra.id,
            invoiceType: 'compra'
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

        const [ventasAnterioresResult, comprasAnterioresResult, facturasXmlAnterioresResult, pagosAnterioresResult] = await Promise.all([
          supabase
            .from('reg_ventas')
            .select('*')
            .lt('fecha_docto', firstDate)
            .order('fecha_docto', { ascending: true }),
          supabase
            .from('reg_compras')
            .select('*')
            .lt('fecha_docto', firstDate)
            .order('fecha_docto', { ascending: true }),
          supabase
            .from('reg_facturas_xml')
            .select('*')
            .order('created_at', { ascending: true }),
          supabase
            .from('reg_facturas_pagos')
            .select('*')
            .lt('fecha_pago', firstDate)
            .order('fecha_pago', { ascending: true })
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

        // Apply same logic for historical data: if invoice has credit notes, use emission date from reg_facturas_xml
        // Note: This would require additional logic to get emission dates for historical data,
        // but since this is for historical calculations, we keep the existing logic for now

        if (comprasAnterioresResult.data) {
          comprasAnterioresResult.data.forEach(compra => {
            const multiplier = getDocumentMultiplier(compra.tipo_doc || '');
            acumuladoHistorico -= (compra.monto_total || 0) * multiplier;
          });
        }

        // Restar pagos anteriores (egresos)
        if (facturasXmlAnterioresResult.data && pagosAnterioresResult.data) {
          pagosAnterioresResult.data.forEach(pago => {
            // Encontrar la factura XML relacionada con el pago
            const facturaXml = facturasXmlAnterioresResult.data.find((xml: any) => xml.id === pago.factura_id);

            if (facturaXml) {
              // Si la factura XML está relacionada con una compra (es un egreso)
              if (facturaXml.reg_compras_id) {
                const monto = pago.monto_pago || pago.monto || 0;
                acumuladoHistorico -= monto;
              }
            }
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
          // Si selectedMonth es -1 (caso "Todos los meses"), mostrar todos los del año
          if (selectedMonth === -1) {
            return itemDate.getFullYear() === selectedYear;
          }
          // Si no, filtrar por mes específico
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
          // Si selectedMonth es -1 (caso "Todos los meses"), mostrar todos los del año
          if (selectedMonth === -1) {
            return itemDate.getFullYear() === selectedYear;
          }
          // Si no, filtrar por mes específico
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

      console.log('💰 Flujo de caja procesado correctamente');
      console.log('Items totales procesados:', flujoItems.length);
      console.log('Items del mes para tabla:', flujo.length);

      setFlujoCompleto(flujoItems); // Guardar todos los datos para cálculos de acumulado
      // setFlujo ya está configurado correctamente en los bloques anteriores con los items filtrados por fecha de pago
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
                <th className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-xs sm:text-sm font-semibold text-slate-900 tracking-tight">
                  Estado
                </th>
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
                   <td colSpan={7} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                     <div className="flex flex-col items-center space-y-4">
                       <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                       <p className="text-slate-500 font-medium text-sm sm:text-base">Cargando flujo de caja...</p>
                     </div>
                   </td>
                 </tr>
               ) : flujo.length === 0 ? (
                 <tr>
                   <td colSpan={7} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
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
                     <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 whitespace-nowrap text-center">
                       {item.isFullyPaid ? (
                         <Check className="h-5 w-5 text-green-600 mx-auto" />
                       ) : (
                         <span className="text-slate-300">-</span>
                       )}
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