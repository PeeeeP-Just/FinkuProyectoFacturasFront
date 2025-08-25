import React, { useState, useEffect } from 'react';
import { getCombinedDataStatus, DataStatusResult } from '../lib/database';
import {
  Database,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  PieChart,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { NoConnection } from './NoConnection';
import { SetupGuide } from './SetupGuide';

interface CombinedDataStatus {
  sales: DataStatusResult[];
  purchases: DataStatusResult[];
  summary: {
    sales: {
      totalDocuments: number;
      totalWithDetail: number;
      totalWithoutDetail: number;
      overallPercentage: number;
    };
    purchases: {
      totalDocuments: number;
      totalWithDetail: number;
      totalWithoutDetail: number;
      overallPercentage: number;
    };
  };
}

export const DataStatusModule: React.FC = () => {
  const [data, setData] = useState<CombinedDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setLoading(true);

    try {
      console.log('📊 Obteniendo estado de datos...');
      const result = await getCombinedDataStatus();
      console.log('✅ Estado de datos obtenido:', result);
      setData(result);
      setConnected(true);
    } catch (error) {
      console.error('❌ Error al obtener estado de datos:', error);
      setConnected(false);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle className="h-4 w-4" />;
    if (percentage >= 70) return <AlertCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const formatPercentage = (value: number) => {
    return value.toFixed(1) + '%';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Estado de Datos</h2>
            <p className="text-slate-600">Análisis de completitud de información entre tablas</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Sales Summary */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-medium">Ventas</p>
                  <p className="text-lg font-bold">Estado General</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Total Documentos</span>
                <span className="font-bold text-lg">{data.summary.sales.totalDocuments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Con Detalle XML</span>
                <span className="font-bold text-lg">{data.summary.sales.totalWithDetail.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Sin Detalle XML</span>
                <span className="font-bold text-lg">{data.summary.sales.totalWithoutDetail.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/20">
                <span className="text-blue-100 text-sm">Completitud</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(data.summary.sales.overallPercentage)}
                  <span className="font-bold text-lg">{formatPercentage(data.summary.sales.overallPercentage)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Purchases Summary */}
          <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Compras</p>
                  <p className="text-lg font-bold">Estado General</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-emerald-200 text-sm">Total Documentos</span>
                <span className="font-bold text-lg">{data.summary.purchases.totalDocuments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-200 text-sm">Con Detalle XML</span>
                <span className="font-bold text-lg">{data.summary.purchases.totalWithDetail.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-200 text-sm">Sin Detalle XML</span>
                <span className="font-bold text-lg">{data.summary.purchases.totalWithoutDetail.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/20">
                <span className="text-emerald-100 text-sm">Completitud</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(data.summary.purchases.overallPercentage)}
                  <span className="font-bold text-lg">{formatPercentage(data.summary.purchases.overallPercentage)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Tables */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Data Status */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Estado de Ventas por Tipo</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Tipo Documento
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Con Detalle
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Sin Detalle
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Completitud
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          <p className="text-slate-500 font-medium text-sm">Cargando datos...</p>
                        </div>
                      </td>
                    </tr>
                  ) : data.sales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <p className="text-slate-500 font-medium text-sm">No se encontraron datos de ventas</p>
                      </td>
                    </tr>
                  ) : (
                    data.sales.map((item) => (
                      <tr key={item.documentType} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.documentType}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {item.totalInSource.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          {item.withXmlDetail.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                          {item.withoutXmlDetail.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.percentageWithDetail)}`}>
                            {getStatusIcon(item.percentageWithDetail)}
                            <span>{formatPercentage(item.percentageWithDetail)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Purchases Data Status */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Estado de Compras por Tipo</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Tipo Documento
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Con Detalle
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Sin Detalle
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Completitud
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-6 h-6 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                          <p className="text-slate-500 font-medium text-sm">Cargando datos...</p>
                        </div>
                      </td>
                    </tr>
                  ) : data.purchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <p className="text-slate-500 font-medium text-sm">No se encontraron datos de compras</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.purchases.map((item) => (
                      <tr key={item.documentType} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.documentType}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {item.totalInSource.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          {item.withXmlDetail.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                          {item.withoutXmlDetail.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.percentageWithDetail)}`}>
                            {getStatusIcon(item.percentageWithDetail)}
                            <span>{formatPercentage(item.percentageWithDetail)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};