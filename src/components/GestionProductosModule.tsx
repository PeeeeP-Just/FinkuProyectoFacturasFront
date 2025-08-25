import React, { useState, useEffect } from 'react';
import {
  getProductos,
  getProductosConEstadisticas,
  createProducto,
  updateProducto,
  deleteProducto,
  getDescripcionesPropuestas,
  createProductosFromDescripciones,
  getDataIntegrityDiagnostic,
  ProductoConEstadisticas
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
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  DollarSign,
  BarChart3,
  ShoppingBag,
  TrendingUp
} from 'lucide-react';
import { NoConnection } from './NoConnection';
import { SetupGuide } from './SetupGuide';
import { CompactFilterBar } from './CompactFilterBar';

export const GestionProductosModule: React.FC = () => {
  const [productos, setProductos] = useState<ProductoConEstadisticas[]>([]);
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
  const [propuestasFilter, setPropuestasFilter] = useState<'ventas' | 'compras' | 'todos'>('todos');
  const [editablePropuestas, setEditablePropuestas] = useState<Map<string, string>>(new Map());
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [expandedVariations, setExpandedVariations] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<any>(null);

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
      // Get all products (including inactive) for management
      const data = await getProductosConEstadisticas();
      setProductos(data);

      // Calculate statistics only for active products
      const activeProducts = data.filter(producto => producto.activo);
      const stats = {
        totalProductos: activeProducts.length,
        totalUnidades: activeProducts.reduce((sum, p) => sum + (p.total_unidades || 0), 0),
        totalIngresos: activeProducts.reduce((sum, p) => sum + (p.total_ingresos || 0), 0),
        totalVentas: activeProducts.reduce((sum, p) => sum + (p.numero_facturas || 0), 0)
      };
      setStats(stats);

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

  const handleToggleProducto = async (producto: ProductoConEstadisticas) => {
    const newActivo = !producto.activo;
    const action = newActivo ? 'activar' : 'desactivar';

    if (!confirm(`¿Estás seguro de que deseas ${action} este producto?`)) return;

    try {
      await updateProducto(producto.id, { activo: newActivo });
      await fetchProductos();
    } catch (error) {
      console.error(`Error al ${action} producto:`, error);
      alert(`Error al ${action} producto`);
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

 const fetchDescripcionesPropuestas = async (resetEdits: boolean = true) => {
   setLoadingPropuestas(true);
   try {
     const propuestas = await getDescripcionesPropuestas(2, propuestasFilter); // Usar el filtro actual
     setDescripcionesPropuestas(propuestas);
     // Only reset editable names if explicitly requested (not when changing filters)
     if (resetEdits) {
       setEditablePropuestas(new Map());
     }
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
      // Use edited names if available, otherwise use original names
      const nombresFinales = Array.from(selectedPropuestas).map(originalName => {
        return editablePropuestas.get(originalName) || originalName;
      });

      await createProductosFromDescripciones(nombresFinales, 'General', true);
      setShowPropuestasModal(false);
      setSelectedPropuestas(new Set());
      setDescripcionesPropuestas([]);
      setEditablePropuestas(new Map());
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
              if (descripcionesPropuestas.length === 0) {
                fetchDescripcionesPropuestas(true);
              }
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
                  N° Facturas
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Unidades
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Ingresos
                </th>
                <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Variaciones
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
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          producto.activo ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <Package className={`h-4 w-4 ${
                            producto.activo ? 'text-purple-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className={`font-medium truncate max-w-xs ${
                              producto.activo ? 'text-slate-900' : 'text-slate-500'
                            }`} title={producto.nombre_producto}>
                              {producto.nombre_producto}
                            </p>
                            {!producto.activo && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Inactivo
                              </span>
                            )}
                          </div>
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
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm font-semibold text-blue-600">
                      {producto.numero_facturas || 0}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm font-semibold text-green-600">
                      {producto.total_unidades?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm font-semibold text-emerald-600">
                      ${producto.total_ingresos?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-sm text-slate-600">
                      <div className="flex flex-col space-y-1">
                        {producto.variaciones.length > 0 ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                              {producto.variaciones.length} variaciones
                            </span>
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedVariations);
                                if (newExpanded.has(producto.id)) {
                                  newExpanded.delete(producto.id);
                                } else {
                                  newExpanded.add(producto.id);
                                }
                                setExpandedVariations(newExpanded);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                            >
                              <span>{expandedVariations.has(producto.id) ? 'Ocultar' : 'Ver'}</span>
                              {expandedVariations.has(producto.id) ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin variaciones</span>
                        )}
                        {expandedVariations.has(producto.id) && producto.variaciones.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {producto.variaciones.slice(0, 5).map((variacion, idx) => (
                              <div key={idx} className="text-xs bg-slate-50 p-1 rounded border">
                                {variacion}
                              </div>
                            ))}
                            {producto.variaciones.length > 5 && (
                              <div className="text-xs text-slate-500">
                                ... y {producto.variaciones.length - 5} más
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleToggleProducto(producto)}
                          className={`p-2 rounded-lg transition-colors ${
                            producto.activo
                              ? 'text-green-600 hover:bg-green-100'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={producto.activo ? 'Desactivar producto' : 'Activar producto'}
                        >
                          {producto.activo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Propuestas de Productos</h3>
                    <p className="text-sm text-slate-600">Descripciones que se repiten y pueden convertirse en productos</p>
                  </div>
                </div>
                <select
                  value={propuestasFilter}
                  onChange={(e) => {
                    const newFilter = e.target.value as 'ventas' | 'compras' | 'todos';
                    setPropuestasFilter(newFilter);
                    setSelectedPropuestas(new Set());
                    // Auto-refresh proposals when filter changes (don't reset edits)
                    fetchDescripcionesPropuestas(false);
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="ventas">Solo Ventas</option>
                  <option value="compras">Solo Compras</option>
                </select>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto max-h-96">
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
                      {descripcionesPropuestas.map((propuesta, index) => {
                        const isEditing = editablePropuestas.has(propuesta.descripcion);
                        const editedName = editablePropuestas.get(propuesta.descripcion) || propuesta.descripcion;

                        return (
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
                                  <div className="flex-1">
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <input
                                          type="text"
                                          value={editedName}
                                          onChange={(e) => {
                                            const newEditable = new Map(editablePropuestas);
                                            newEditable.set(propuesta.descripcion, e.target.value);
                                            setEditablePropuestas(newEditable);
                                          }}
                                          className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                          placeholder="Nombre del producto..."
                                        />
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => {
                                              const newEditable = new Map(editablePropuestas);
                                              newEditable.delete(propuesta.descripcion);
                                              setEditablePropuestas(newEditable);
                                            }}
                                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded text-xs transition-colors"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="font-medium text-slate-900">{propuesta.descripcion}</p>
                                        <div className="flex items-center space-x-4 mt-1">
                                          <span className="text-sm text-blue-600">Frecuencia: {propuesta.frecuencia}</span>
                                          <span className="text-sm text-green-600">Unidades: {propuesta.total_unidades.toLocaleString()}</span>
                                          <span className="text-sm text-purple-600">Ingresos: ${propuesta.total_ingresos.toLocaleString()}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!isEditing && (
                                <button
                                  onClick={() => {
                                    const newEditable = new Map(editablePropuestas);
                                    newEditable.set(propuesta.descripcion, propuesta.descripcion);
                                    setEditablePropuestas(newEditable);
                                  }}
                                  className="ml-3 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium rounded-lg text-sm transition-colors"
                                >
                                  Editar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowPropuestasModal(false);
                  setSelectedPropuestas(new Set());
                  setDescripcionesPropuestas([]);
                  setEditablePropuestas(new Map());
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
                {editablePropuestas.size > 0 && ` (con nombres editados)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};