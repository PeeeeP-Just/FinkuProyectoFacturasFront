import React, { useState, useEffect } from 'react';
import { getVentasDetalle, getFacturaPagos, getFacturaReferencias, markInvoiceAsFactored, unmarkInvoiceAsFactored } from '../lib/database';
import { RegFacturaDetalle, RegFacturaPago, RegFacturaReferencia } from '../types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  X,
  FileText,
  Package,
  DollarSign,
  Hash,
  CreditCard,
  FileCheck,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface VentasDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  facturaId: number | null;
  facturaFolio: string;
  cliente: string;
  fecha: string;
  total: number;
  isFactored?: boolean;
  rutCliente?: string;
  onFactoringUpdate?: (forceRefresh?: boolean) => void;
}

export const VentasDetalleModal: React.FC<VentasDetalleModalProps> = ({
  isOpen,
  onClose,
  facturaId,
  facturaFolio,
  cliente,
  fecha,
  total,
  isFactored = false,
  rutCliente = '',
  onFactoringUpdate
}) => {
  const [detalle, setDetalle] = useState<RegFacturaDetalle[]>([]);
  const [pagos, setPagos] = useState<RegFacturaPago[]>([]);
  const [referencias, setReferencias] = useState<RegFacturaReferencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFactoringModal, setShowFactoringModal] = useState(false);
  const [factoringDate, setFactoringDate] = useState('');

  useEffect(() => {
    if (isOpen && facturaId) {
      fetchDetalle();
    }
  }, [isOpen, facturaId]);

  const fetchDetalle = async () => {
    if (!facturaId) return;

    setLoading(true);
    try {
      // Obtener detalle de la factura
      const detalleData = await getVentasDetalle(facturaId);
      setDetalle(detalleData);

      // Obtener pagos de la factura
      const pagosData = await getFacturaPagos(facturaId);
      setPagos(pagosData);

      // Obtener referencias de la factura
      const referenciasData = await getFacturaReferencias(facturaId);
      setReferencias(referenciasData);

    } catch (error) {
      console.error('Error al obtener detalle:', error);
      setDetalle([]);
      setPagos([]);
      setReferencias([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotales = () => {
    const totalNeto = detalle.reduce((sum, item) => sum + (item.monto_item || 0), 0);
    const totalCantidad = detalle.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    return { totalNeto, totalCantidad };
  };

  const handleToggleFactoring = () => {
    if (!facturaId) return;

    // Show modal for date selection
    setFactoringDate(new Date().toISOString().split('T')[0]);
    setShowFactoringModal(true);
  };

  const handleFactoringSubmit = async () => {
    if (!facturaId) return;

    try {
      if (isFactored) {
        await unmarkInvoiceAsFactored(facturaId);
      } else {
        await markInvoiceAsFactored(facturaId, factoringDate);
      }

      setShowFactoringModal(false);
      setFactoringDate('');

      // Actualizar el estado local
      // Nota: En una implementación real, esto debería actualizar el estado en el componente padre
      // Por ahora, solo llamamos al callback si existe con force refresh para actualizar el grid
      if (onFactoringUpdate) {
        onFactoringUpdate(true); // Force refresh to update the grid immediately
      }

    } catch (error) {
      console.error('Error al actualizar factoring:', error);
      alert('Error al actualizar el estado de factoring');
    }
  };

  if (!isOpen) return null;

  const { totalNeto, totalCantidad } = calculateTotales();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Detalle de Factura
              </h2>
              <p className="text-sm text-slate-600">Folio: {facturaFolio}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Cliente</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-1">{cliente}</p>
              {rutCliente && (
                <p className="text-xs text-slate-500 mt-1">{rutCliente}</p>
              )}
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Fecha</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-1">
                {fecha ? format(new Date(fecha), 'dd/MM/yyyy', { locale: es }) : 'No especificada'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Total Items</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-1">{totalCantidad.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Total</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-1">${total.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Factoring</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-2">
                  {isFactored ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${isFactored ? 'text-green-600' : 'text-red-600'}`}>
                    {isFactored ? 'Factorizada' : 'No Factorizada'}
                  </span>
                </div>
                <button
                  onClick={handleToggleFactoring}
                  className={`p-2 rounded-lg transition-colors ${
                    isFactored
                      ? 'text-red-600 hover:bg-red-100'
                      : 'text-blue-600 hover:bg-blue-100'
                  }`}
                  title={isFactored ? 'Quitar factoring' : 'Marcar como factorizada'}
                >
                  <CreditCard className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Cargando detalle...</p>
            </div>
          ) : detalle.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium text-lg mb-2">No hay detalle disponible</p>
              <p className="text-slate-400 text-sm">No se encontraron líneas de detalle para esta factura</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Línea
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Unidad
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {detalle.map((linea, index) => (
                        <tr key={linea.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {linea.numero_linea || index + 1}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-900">
                            <div className="max-w-xs truncate" title={linea.descripcion_item || '-'}>{linea.descripcion_item || '-'}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                            {linea.cantidad?.toLocaleString() || '0'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                            ${linea.precio_unitario?.toLocaleString() || '0'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                            ${linea.monto_item?.toLocaleString() || '0'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                            {linea.unidad_medida || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals Row */}
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-sm font-semibold text-slate-900 text-right">
                          Totales:
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {totalCantidad.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                          -
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                          ${totalNeto.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Pagos Section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-900">Pagos Realizados</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {pagos.length}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {pagos.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No hay pagos registrados</p>
                      <p className="text-slate-400 text-sm mt-1">No se encontraron registros de pagos para esta factura</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pagos.map((pago, index) => (
                        <div key={pago.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {pago.fecha_pago ? format(new Date(pago.fecha_pago), 'dd/MM/yyyy', { locale: es }) : 'Fecha no especificada'}
                                </p>
                                <p className="text-xs text-slate-500">Fecha de pago</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-green-600">
                                  ${pago.monto_pago?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-slate-500">Monto pagado</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {pago.forma_pago || 'No especificada'}
                                </p>
                                <p className="text-xs text-slate-500">Forma de pago</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Hash className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {pago.numero_comprobante || 'No especificado'}
                                </p>
                                <p className="text-xs text-slate-500">Comprobante</p>
                              </div>
                            </div>
                          </div>
                          {pago.banco && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs text-slate-600">
                                <span className="font-medium">Banco:</span> {pago.banco}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Referencias Section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-slate-900">Referencias</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {referencias.length}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {referencias.length === 0 ? (
                    <div className="text-center py-8">
                      <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No hay referencias</p>
                      <p className="text-slate-400 text-sm mt-1">No se encontraron referencias para esta factura</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {referencias.map((referencia, index) => (
                        <div key={referencia.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {referencia.tipo_referencia || 'Tipo no especificado'}
                                </p>
                                <p className="text-xs text-slate-500">Tipo de referencia</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Hash className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {referencia.folio_referencia || 'Folio no especificado'}
                                </p>
                                <p className="text-xs text-slate-500">Folio referencia</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {referencia.fecha_referencia ? format(new Date(referencia.fecha_referencia), 'dd/MM/yyyy', { locale: es }) : 'Fecha no especificada'}
                                </p>
                                <p className="text-xs text-slate-500">Fecha referencia</p>
                              </div>
                            </div>
                          </div>
                          {referencia.descripcion_referencia && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs text-slate-600">
                                <span className="font-medium">Descripción:</span> {referencia.descripcion_referencia}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Factoring Modal */}
      {showFactoringModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {isFactored ? 'Modificar Factoring' : 'Marcar como Factorizada'}
                  </h3>
                  <p className="text-sm text-slate-600">Factura {facturaFolio}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cliente:</span>
                  <span className="font-medium text-slate-900">{cliente}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monto:</span>
                  <span className="font-medium text-slate-900">${total.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Fecha de Factoring
                </label>
                <input
                  type="date"
                  value={factoringDate}
                  onChange={(e) => setFactoringDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500">
                  Esta fecha se utilizará para el cálculo del flujo de caja
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Fecha seleccionada: {factoringDate ? format(new Date(factoringDate), 'dd/MM/yyyy', { locale: es }) : 'No seleccionada'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {isFactored
                        ? 'Se quitará el estado de factoring de esta factura'
                        : 'La factura se marcará como factorizada con esta fecha'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowFactoringModal(false);
                  setFactoringDate('');
                }}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleFactoringSubmit}
                className={`flex-1 px-4 py-3 font-medium rounded-xl transition-all duration-200 ${
                  isFactored
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={!factoringDate}
              >
                {isFactored ? 'Quitar Factoring' : 'Confirmar Factoring'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
