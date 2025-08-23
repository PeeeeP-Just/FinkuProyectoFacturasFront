import React, { useState, useEffect } from 'react';
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  getDescripcionesPropuestas,
  createProductosFromDescripciones
} from '../lib/database';
import { Producto, DescripcionPropuesta } from '../types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  Save,
  X,
  Lightbulb,
  ShoppingCart,
  Download
} from 'lucide-react';
import { NoConnection } from './NoConnection';
import { SetupGuide } from './SetupGuide';
import { CompactFilterBar } from './CompactFilterBar';

export const GestionProductosModule: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [showPropuestasModal, setShowPropuestasModal] = useState(false);
  const [descripcionesPropuestas, setDescripcionesPropuestas] = useState<DescripcionPropuesta[]>([]);
  const [selectedPropuestas, setSelectedPropuestas] = useState<Set<string>>(new Set());
  const [loadingPropuestas, setLoadingPropuestas] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nombre_producto: '',
    descripcion: '',
    codigo_interno: '',
    categoria: '',
    precio_sugerido: 0,
    activo: true
  });

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const data = await getProductos();
      setProductos(data);
      setConnected(true);
    } catch (error) {
      console.error('Error al obtener productos:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleCreateProducto = async () => {
    try {
      await createProducto(formData);
      setShowCreateModal(false);
      setFormData({
        nombre_producto: '',
        descripcion: '',
        codigo_interno: '',
        categoria: '',
        precio_sugerido: 0,
        activo: true
      });
      await fetchProductos();
    } catch (error) {
      console.error('Error al crear producto:', error);
      alert('Error al crear producto');
    }
  };

  const handleEditProducto = async () => {
    if (!editingProducto) return;

    try {
      await updateProducto(editingProducto.id, formData);
      setShowEditModal(false);
      setEditingProducto(null);
      setFormData({
        nombre_producto: '',
        descripcion: '',
        codigo_interno: '',
        categoria: '',
        precio_sugerido: 0,
        activo: true
      });
      await fetchProductos();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      alert('Error al actualizar producto');
    }
  };

  const handleDeleteProducto = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    try {
      await deleteProducto(id);
      await fetchProductos();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar producto');
    }
  };

  const openEditModal = (producto: Producto) => {
    setEditingProducto(producto);
    setFormData({
      nombre_producto: producto.nombre_producto,
      descripcion: producto.descripcion || '',
      codigo_interno: producto.codigo_interno || '',
      categoria: producto.categoria || '',
      precio_sugerido: producto.precio_sugerido || 0,
      activo: producto.activo
    });
    setShowEditModal(true);
  };

  const fetchDescripcionesPropuestas = async () => {
    setLoadingPropuestas(true);
    try {
      const propuestas = await getDescripcionesPropuestas(2); // Mínimo 2 repeticiones
      setDescripcionesPropuestas(propuestas);
    } catch (error) {
      console.error('Error al obtener descripciones propuestas:', error);
      alert('Error al obtener descripciones propuestas');
    } finally {
      setLoadingPropuestas(false);
    }
  };

  const handleCreateProductosFromPropuestas = async () => {
    if (selectedPropuestas.size === 0) return;

    try {
      await createProductosFromDescripciones(Array.from(selectedPropuestas));
      setShowPropuestasModal(false);
      setSelectedPropuestas(new Set());
      setDescripcionesPropuestas([]);
      await fetchProductos();
    } catch (error) {
      console.error('Error al crear productos desde propuestas:', error);
      alert('Error al crear productos desde propuestas');
    }
  };

  const filteredProductos = productos.filter(producto =>
    producto.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (producto.categoria && producto.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (producto.codigo_interno && producto.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Package className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Gestión de Productos</h1>
            <p className="text-slate-600">Administra el catálogo de productos de tu empresa</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              fetchDescripcionesPropuestas();
              setShowPropuestasModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
          >
            <Lightbulb className="h-4 w-4" />
            <span>Propuestas</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <CompactFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateFrom=""
        onDateFromChange={() => {}}
        dateTo=""
        onDateToChange={() => {}}
        placeholder="Buscar productos por nombre, categoría o código..."
        showClientFilter={false}
      />

      {/* Products Table */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Precio Sugerido
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">Cargando productos...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Package className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-sm sm:text-base">
                        {productos.length === 0 ? 'No hay productos registrados' : 'No se encontraron productos'}
                      </p>
                      {productos.length === 0 && (
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                          Crear primer producto
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProductos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-purple-50/30 transition-all duration-200">
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-xs" title={producto.nombre_producto}>
                            {producto.nombre_producto}
                          </p>
                          {producto.descripcion && (
                            <p className="text-slate-500 text-sm truncate max-w-xs" title={producto.descripcion}>
                              {producto.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm text-slate-600">
                      {producto.categoria || '-'}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm text-slate-600">
                      {producto.codigo_interno || '-'}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm font-semibold text-slate-900">
                      ${producto.precio_sugerido?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${
                        producto.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {producto.activo ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>{producto.activo ? 'Activo' : 'Inactivo'}</span>
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(producto)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Editar producto"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProducto(producto.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Nuevo Producto</h3>
                  <p className="text-sm text-slate-600">Crear un nuevo producto manualmente</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={formData.nombre_producto}
                  onChange={(e) => setFormData({...formData, nombre_producto: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Producto XYZ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descripción del producto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_interno}
                    onChange={(e) => setFormData({...formData, codigo_interno: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ABC123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Electrónica"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Precio Sugerido
                </label>
                <input
                  type="number"
                  value={formData.precio_sugerido}
                  onChange={(e) => setFormData({...formData, precio_sugerido: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-slate-700">
                  Producto activo
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProducto}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200"
              >
                Crear Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Edit className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Editar Producto</h3>
                  <p className="text-sm text-slate-600">Modificar información del producto</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={formData.nombre_producto}
                  onChange={(e) => setFormData({...formData, nombre_producto: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_interno}
                    onChange={(e) => setFormData({...formData, codigo_interno: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Precio Sugerido
                </label>
                <input
                  type="number"
                  value={formData.precio_sugerido}
                  onChange={(e) => setFormData({...formData, precio_sugerido: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo-edit"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="activo-edit" className="text-sm font-medium text-slate-700">
                  Producto activo
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditProducto}
                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-all duration-200"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propuestas Modal */}
      {showPropuestasModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Propuestas de Productos</h3>
                  <p className="text-sm text-slate-600">Descripciones que se repiten y pueden convertirse en productos</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loadingPropuestas ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 font-medium">Buscando propuestas...</p>
                </div>
              ) : descripcionesPropuestas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <Lightbulb className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium text-lg mb-2">No hay propuestas disponibles</p>
                  <p className="text-slate-400 text-sm">No se encontraron descripciones que se repitan más de 2 veces</p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4">
                    {descripcionesPropuestas.map((propuesta, index) => (
                      <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedPropuestas.has(propuesta.descripcion)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedPropuestas);
                                  if (e.target.checked) {
                                    newSelected.add(propuesta.descripcion);
                                  } else {
                                    newSelected.delete(propuesta.descripcion);
                                  }
                                  setSelectedPropuestas(newSelected);
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                              <div>
                                <p className="font-medium text-slate-900">{propuesta.descripcion}</p>
                                <div className="flex items-center space-x-4 mt-1">
                                  <span className="text-sm text-blue-600">Frecuencia: {propuesta.frecuencia}</span>
                                  <span className="text-sm text-green-600">Unidades: {propuesta.total_unidades.toLocaleString()}</span>
                                  <span className="text-sm text-purple-600">Ingresos: ${propuesta.total_ingresos.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowPropuestasModal(false);
                  setSelectedPropuestas(new Set());
                  setDescripcionesPropuestas([]);
                }}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProductosFromPropuestas}
                disabled={selectedPropuestas.size === 0}
                className={`flex-1 px-4 py-3 font-medium rounded-xl transition-all duration-200 ${
                  selectedPropuestas.size === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                Crear {selectedPropuestas.size} Producto(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};