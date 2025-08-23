import React, { useState, useEffect } from 'react';
import { getVentasDetalle } from '../lib/database';
import { RegFacturaDetalle } from '../types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  X,
  FileText,
  Package,
  DollarSign,
  Hash
} from 'lucide-react';

interface VentasDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  facturaId: number | null;
  facturaFolio: string;
  cliente: string;
  fecha: string;
  total: number;
}

export const VentasDetalleModal: React.FC<VentasDetalleModalProps> = ({
  isOpen,
  onClose,
  facturaId,
  facturaFolio,
  cliente,
  fecha,
  total
}) => {
  const [detalle, setDetalle] = useState<RegFacturaDetalle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && facturaId) {
      fetchDetalle();
    }
  }, [isOpen, facturaId]);

  const fetchDetalle = async () => {
    if (!facturaId) return;

    setLoading(true);
    try {
      const data = await getVentasDetalle(facturaId);
      setDetalle(data);
    } catch (error) {
      console.error('Error al obtener detalle:', error);
      setDetalle([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotales = () => {
    const totalNeto = detalle.reduce((sum, item) => sum + (item.monto_item || 0), 0);
    const totalCantidad = detalle.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    return { totalNeto, totalCantidad };
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Cliente</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-1">{cliente}</p>
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
            <div className="p-6">
              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
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
                            <div className="max-w-xs truncate" title={linea.descripcion_item || '-'}>
                              {linea.descripcion_item || '-'}
                            </div>
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
    </div>
  );
};