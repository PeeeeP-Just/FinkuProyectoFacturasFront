import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RegFacturaDetalle } from '../types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search,
  Filter,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';

export const VentasModule: React.FC = () => {
  const [ventas, setVentas] = useState<RegFacturaDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRutReceptor, setSelectedRutReceptor] = useState('');
  const [receptores, setReceptores] = useState<Array<{rut: string, razon_social: string}>>([]);

  const fetchVentas = async () => {
    console.log('🔍 Iniciando fetchVentas...');
    console.log('Supabase disponible:', !!supabase);
    
    if (!supabase) {
      console.error('❌ Supabase no está configurado. Necesitas conectar a Supabase primero.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('📊 Consultando reg_facturas_detalle...');
    
    let query = supabase
      .from('reg_facturas_detalle')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🔧 Aplicando filtros...');
    if (dateFrom) {
      console.log('Filtro fecha desde:', dateFrom);
      query = query.gte('fecha_emision', dateFrom);
    }
    if (dateTo) {
      console.log('Filtro fecha hasta:', dateTo);
      query = query.lte('fecha_emision', dateTo);
    }
    if (selectedRutReceptor) {
      console.log('Filtro RUT receptor:', selectedRutReceptor);
      query = query.eq('rut_receptor', selectedRutReceptor);
    }

    const { data, error } = await query;
    
    console.log('📋 Resultado de la consulta:');
    console.log('Error:', error);
    console.log('Datos recibidos:', data?.length || 0, 'registros');
    
    if (error) {
      console.error('❌ Error al obtener ventas:', error);
      console.error('Detalles del error:', error.message);
    } else {
      let filteredData = data || [];
      console.log('📊 Datos antes del filtro de búsqueda:', filteredData.length);
      
      if (searchTerm) {
        console.log('🔍 Aplicando filtro de búsqueda:', searchTerm);
        filteredData = filteredData.filter(item => 
          item.descripcion_item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.razon_social_receptor?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      console.log('📊 Datos después del filtro:', filteredData.length);
      setVentas(filteredData);
    }
    setLoading(false);
  };

  const fetchReceptores = async () => {
    console.log('👥 Obteniendo lista de receptores...');
    if (!supabase) return;
    
    const { data } = await supabase
      .from('reg_facturas_detalle')
      .select('rut_receptor, razon_social_receptor')
      .not('rut_receptor', 'is', null)
      .not('razon_social_receptor', 'is', null);
    
    console.log('👥 Receptores encontrados:', data?.length || 0);
    
    if (data) {
      const uniqueReceptores = data.reduce((acc: Array<{rut: string, razon_social: string}>, curr) => {
        if (curr.rut_receptor && curr.razon_social_receptor && 
            !acc.find(r => r.rut === curr.rut_receptor)) {
          acc.push({
            rut: curr.rut_receptor,
            razon_social: curr.razon_social_receptor
          });
        }
        return acc;
      }, []);
      console.log('👥 Receptores únicos:', uniqueReceptores.length);
      setReceptores(uniqueReceptores.sort((a, b) => a.razon_social.localeCompare(b.razon_social)));
    }
  };

  useEffect(() => {
    fetchReceptores();
    fetchVentas();
  }, []);

  useEffect(() => {
    fetchVentas();
  }, [searchTerm, dateFrom, dateTo, selectedRutReceptor]);

  const totalVentas = ventas.reduce((sum, venta) => sum + (venta.monto_item || 0), 0);

  // Agrupar ventas por folio
  const ventasAgrupadas = ventas.reduce((grupos: { [key: string]: RegFacturaDetalle[] }, venta) => {
    const folio = venta.folio || 'Sin folio';
    if (!grupos[folio]) {
      grupos[folio] = [];
    }
    grupos[folio].push(venta);
    return grupos;
  }, {});

  const foliosOrdenados = Object.keys(ventasAgrupadas).sort((a, b) => {
    const fechaA = ventasAgrupadas[a][0]?.fecha_emision || '';
    const fechaB = ventasAgrupadas[b][0]?.fecha_emision || '';
    return new Date(fechaB).getTime() - new Date(fechaA).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            <Filter className="h-4 w-4 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 tracking-tight">
              Buscar
            </label>
            <div className="relative">
              <Search className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Producto, folio, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 tracking-tight">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900"
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
              className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 tracking-tight">
              Cliente
            </label>
            <select
              value={selectedRutReceptor}
              onChange={(e) => setSelectedRutReceptor(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900"
            >
              <option value="">Todos los clientes</option>
              {receptores.map(receptor => (
                <option key={receptor.rut} value={receptor.rut}>
                  {receptor.razon_social}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium tracking-wide uppercase mb-2">Total Registros</p>
              <p className="text-4xl font-bold tracking-tight">{ventas.length}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium tracking-wide uppercase mb-2">Total Ventas</p>
              <p className="text-4xl font-bold tracking-tight">${totalVentas.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm font-medium tracking-wide uppercase mb-2">Promedio por Línea</p>
              <p className="text-4xl font-bold tracking-tight">
                ${ventas.length > 0 ? Math.round(totalVentas / ventas.length).toLocaleString() : '0'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="h-8 w-8 text-white" />
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
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Folio
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Fecha Emisión
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Precio Unit.
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monto Item
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Tipo DTE
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Cargando ventas...</p>
                    </div>
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                foliosOrdenados.map((folio, folioIndex) => {
                  const lineasFactura = ventasAgrupadas[folio];
                  const totalFactura = lineasFactura.reduce((sum, linea) => sum + (linea.monto_item || 0), 0);
                  
                  return (
                    <React.Fragment key={folio}>
                      {/* Separador visual entre facturas */}
                      {folioIndex > 0 && (
                        <tr>
                          <td colSpan={8} className="px-8 py-2">
                            <div className="border-t border-slate-300"></div>
                          </td>
                        </tr>
                      )}
                      
                      {/* Header de la factura */}
                      <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-blue-400">
                        <td className="px-8 py-4 font-bold text-blue-900 text-base">
                          📄 {folio}
                        </td>
                        <td className="px-8 py-4 font-semibold text-blue-800">
                          {lineasFactura[0]?.fecha_emision ? 
                            format(new Date(lineasFactura[0].fecha_emision), 'dd/MM/yyyy', { locale: es }) : 
                            '-'
                          }
                        </td>
                        <td className="px-8 py-4 font-semibold text-blue-800">
                          {lineasFactura[0]?.razon_social_receptor}
                        </td>
                        <td className="px-8 py-4 font-semibold text-blue-700">
                          {lineasFactura.length} línea{lineasFactura.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-8 py-4"></td>
                        <td className="px-8 py-4"></td>
                        <td className="px-8 py-4 font-bold text-blue-900 text-base">
                          ${totalFactura.toLocaleString()}
                        </td>
                        <td className="px-8 py-4">
                          <span className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {lineasFactura[0]?.tipo_dte}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Líneas de detalle */}
                      {lineasFactura.map((venta, lineaIndex) => (
                        <tr key={venta.id} className="hover:bg-blue-50/30 transition-all duration-200 border-l-4 border-transparent hover:border-blue-200">
                          <td className="px-8 py-4 pl-12 text-sm text-slate-500">
                            ↳ Línea {venta.numero_linea}
                          </td>
                          <td className="px-8 py-4 text-sm text-slate-600">
                            {venta.fecha_recepcion ? 
                              format(new Date(venta.fecha_recepcion), 'dd/MM/yyyy HH:mm', { locale: es }) : 
                              '-'
                            }
                          </td>
                          <td className="px-8 py-4 text-sm text-slate-600">
                            <div className="text-slate-400 text-xs">{venta.rut_receptor}</div>
                          </td>
                          <td className="px-8 py-4 text-sm text-slate-900">
                            <div className="font-medium">{venta.descripcion_item}</div>
                          </td>
                          <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-600">
                            {venta.cantidad} {venta.unidad_medida}
                          </td>
                          <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-600">
                            ${(venta.precio_unitario || 0).toLocaleString()}
                          </td>
                          <td className="px-8 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                            ${(venta.monto_item || 0).toLocaleString()}
                          </td>
                          <td className="px-8 py-4"></td>
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
    </div>
  );
};