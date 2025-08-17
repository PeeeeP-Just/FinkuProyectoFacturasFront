import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FlujoCajaItem, RegVenta, RegCompra } from '../types/database';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export const FlujoCajaModule: React.FC = () => {
  const [flujo, setFlujo] = useState<FlujoCajaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchFlujoCaja = async () => {
    console.log('💰 Iniciando fetchFlujoCaja...');
    console.log('Supabase disponible:', !!supabase);
    
    if (!supabase) {
      console.error('❌ Supabase no está configurado. Necesitas conectar a Supabase primero.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('📊 Consultando reg_ventas y reg_compras...');
    
    try {
      // Obtener ventas
      console.log('📈 Consultando ventas...');
      let ventasQuery = supabase
        .from('reg_ventas')
        .select('*')
        .order('fecha_docto', { ascending: true });

      if (dateFrom) {
        console.log('Filtro ventas fecha desde:', dateFrom);
        ventasQuery = ventasQuery.gte('fecha_docto', dateFrom);
      }
      if (dateTo) {
        console.log('Filtro ventas fecha hasta:', dateTo);
        ventasQuery = ventasQuery.lte('fecha_docto', dateTo);
      }

      // Obtener compras
      console.log('📉 Consultando compras...');
      let comprasQuery = supabase
        .from('reg_compras')
        .select('*')
        .order('fecha_docto', { ascending: true });

      if (dateFrom) {
        console.log('Filtro compras fecha desde:', dateFrom);
        comprasQuery = comprasQuery.gte('fecha_docto', dateFrom);
      }
      if (dateTo) {
        console.log('Filtro compras fecha hasta:', dateTo);
        comprasQuery = comprasQuery.lte('fecha_docto', dateTo);
      }

      const [ventasResult, comprasResult] = await Promise.all([
        ventasQuery,
        comprasQuery
      ]);

      console.log('📋 Resultados:');
      console.log('Ventas - Error:', ventasResult.error, 'Datos:', ventasResult.data?.length || 0);
      console.log('Compras - Error:', comprasResult.error, 'Datos:', comprasResult.data?.length || 0);

      if (ventasResult.error) throw ventasResult.error;
      if (comprasResult.error) throw comprasResult.error;

      const ventas = ventasResult.data || [];
      const compras = comprasResult.data || [];

      console.log('💰 Procesando flujo de caja...');
      console.log('Ventas a procesar:', ventas.length);
      console.log('Compras a procesar:', compras.length);

      // Convertir a items de flujo de caja
      const flujoItems: FlujoCajaItem[] = [];

      // Agregar ingresos (ventas)
      ventas.forEach(venta => {
        const fechaPago = venta.fecha_docto || '';
        
        if (fechaPago) {
          flujoItems.push({
            fecha: fechaPago,
            tipo: 'INGRESO',
            descripcion: `Venta ${venta.folio || venta.nro} - ${venta.razon_social || 'Cliente'}`,
            monto: venta.monto_total || 0,
            acumulado: 0,
            documento: venta.folio || venta.nro?.toString() || ''
          });
        }
      });

      // Agregar egresos (compras)
      compras.forEach(compra => {
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
      });

      console.log('💰 Items de flujo generados:', flujoItems.length);

      // Ordenar por fecha y calcular acumulado
      flujoItems.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      
      let acumulado = 0;
      flujoItems.forEach(item => {
        if (item.tipo === 'INGRESO') {
          acumulado += item.monto;
        } else {
          acumulado -= item.monto;
        }
        item.acumulado = acumulado;
      });

      console.log('💰 Flujo de caja procesado correctamente');
      setFlujo(flujoItems);
    } catch (error) {
      console.error('❌ Error al obtener flujo de caja:', error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchFlujoCaja();
  }, []);

  useEffect(() => {
    fetchFlujoCaja();
  }, [dateFrom, dateTo]);

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
      {/* Filtros */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            <Calendar className="h-4 w-4 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Período</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 tracking-tight">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 text-slate-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 tracking-tight">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium tracking-wide uppercase mb-2">Total Ingresos</p>
              <p className="text-4xl font-bold tracking-tight">${totalIngresos.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium tracking-wide uppercase mb-2">Total Egresos</p>
              <p className="text-4xl font-bold tracking-tight">${totalEgresos.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <TrendingDown className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className={`bg-gradient-to-br rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
          flujoNeto >= 0 ? 'from-blue-500 via-indigo-600 to-purple-600' : 'from-orange-500 via-amber-600 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium tracking-wide uppercase mb-2 ${flujoNeto >= 0 ? 'text-blue-100' : 'text-orange-100'}`}>
                Flujo Neto
              </p>
              <p className="text-4xl font-bold tracking-tight">${flujoNeto.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className={`h-8 w-8 text-white`} />
            </div>
          </div>
        </div>
        
        <div className={`bg-gradient-to-br rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
          saldoFinal >= 0 ? 'from-violet-500 via-purple-600 to-indigo-600' : 'from-slate-500 via-gray-600 to-zinc-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium tracking-wide uppercase mb-2 ${saldoFinal >= 0 ? 'text-violet-100' : 'text-slate-100'}`}>
                Saldo Acumulado
              </p>
              <p className="text-4xl font-bold tracking-tight">${saldoFinal.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <DollarSign className={`h-8 w-8 text-white`} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de flujo */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200/50">
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Flujo de Caja Detallado</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-8 py-5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-8 py-5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acumulado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Cargando flujo de caja...</p>
                    </div>
                  </td>
                </tr>
              ) : flujo.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No se encontraron movimientos en el período seleccionado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                flujo.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-all duration-200">
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-600">
                      {format(parseISO(item.fecha), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                        item.tipo === 'INGRESO' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.tipo === 'INGRESO' ? (
                          <ArrowUp className="w-3 h-3 mr-1.5" />
                        ) : (
                          <ArrowDown className="w-3 h-3 mr-1.5" />
                        )}
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-900 font-medium">
                      {item.descripcion}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {item.documento}
                    </td>
                    <td className={`px-8 py-6 whitespace-nowrap text-sm text-right font-bold ${
                      item.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {item.tipo === 'INGRESO' ? '+' : '-'}${item.monto.toLocaleString()}
                    </td>
                    <td className={`px-8 py-6 whitespace-nowrap text-sm text-right font-bold ${
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