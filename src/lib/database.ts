import { createClient } from '@supabase/supabase-js';
import { getDocumentMultiplier } from './documentTypes';
import { ManualEntry, RegVenta, RegPago, RegFacturaDetalle, Producto, ProductoDescripcionMap, DescripcionPropuesta, RegFacturaPago, RegFacturaReferencia } from '../types/database';

// Cache connection status to avoid multiple tests
let connectionStatus: boolean | null = null;
let connectionPromise: Promise<boolean> | null = null;
let tablesTested: { [key: string]: boolean } = {};

// Cache for data to avoid duplicate calls
const dataCache = {
  ventas: new Map<string, { data: any[], timestamp: number }>(),
  compras: new Map<string, { data: any[], timestamp: number }>(),
  clientes: new Map<string, { data: any[], timestamp: number }>(),
  proveedores: new Map<string, { data: any[], timestamp: number }>()
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Configuración usando las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuración Supabase:');
console.log('URL:', supabaseUrl ? '✅ Configurado' : '❌ NO CONFIGURADO');
console.log('Key:', supabaseAnonKey ? '✅ Configurado' : '❌ NO CONFIGURADO');

// Crear cliente de Supabase
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Función optimizada para probar la conexión con cache
export const testConnection = async (tableName?: string): Promise<boolean> => {
  // Return cached result if available
  if (connectionStatus !== null && !tableName) {
    return connectionStatus;
  }

  // Return cached promise if already testing
  if (connectionPromise && !tableName) {
    return connectionPromise;
  }

  const testPromise = performConnectionTest(tableName);

  if (!tableName) {
    connectionPromise = testPromise;
  }

  const result = await testPromise;

  if (!tableName) {
    connectionStatus = result;
    connectionPromise = null;
  }

  return result;
};

// Internal function to perform the actual connection test
const performConnectionTest = async (tableName?: string): Promise<boolean> => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabase) {
    console.error('❌ Cliente Supabase no disponible');
    return false;
  }

  try {
    // Test specific table or both tables
    if (tableName === 'reg_ventas') {
      if (tablesTested['reg_ventas']) return true;

      const { error } = await supabase
        .from('reg_ventas')
        .select('id')
        .limit(1);

      tablesTested['reg_ventas'] = !error;
      return !error;
    }

    if (tableName === 'reg_compras') {
      if (tablesTested['reg_compras']) return true;

      const { error } = await supabase
        .from('reg_compras')
        .select('id')
        .limit(1);

      tablesTested['reg_compras'] = !error;
      return !error;
    }

    // Full connection test (only once)
    if (connectionStatus !== null) return connectionStatus;

    const { error: ventasError } = await supabase
      .from('reg_ventas')
      .select('id')
      .limit(1);

    const { error: comprasError } = await supabase
      .from('reg_compras')
      .select('id')
      .limit(1);

    tablesTested['reg_ventas'] = !ventasError;
    tablesTested['reg_compras'] = !comprasError;

    const isConnected = !ventasError || !comprasError;

    if (isConnected) {
      console.log('✅ Conexión exitosa a Supabase');
      console.log('📊 Tablas accesibles:');
      console.log('  - reg_ventas:', ventasError ? '❌' : '✅');
      console.log('  - reg_compras:', comprasError ? '❌' : '✅');
    }

    return isConnected;
  } catch (err) {
    console.error('❌ Error en la conexión:', err);
    return false;
  }
};

// Specialized test functions for each module
export const testVentasConnection = () => testConnection('reg_ventas');
export const testComprasConnection = () => testConnection('reg_compras');
export const testPagosConnection = () => testConnection('reg_pagos');

// Function to clear connection cache (useful for debugging)
export const clearConnectionCache = () => {
  connectionStatus = null;
  connectionPromise = null;
  tablesTested = {};
};

// Function to clear data cache
export const clearDataCache = (type?: 'ventas' | 'compras' | 'clientes' | 'proveedores') => {
  if (type) {
    dataCache[type].clear();
  } else {
    // Clear all caches
    Object.keys(dataCache).forEach(key => {
      dataCache[key as keyof typeof dataCache].clear();
    });
  }
};

// Function to clear cache for specific filters
export const clearCacheForFilter = (type: 'ventas' | 'compras', filters: any) => {
  const cacheKey = JSON.stringify(filters);
  dataCache[type].delete(cacheKey);
};

// Function to get cached connection status without testing
export const getConnectionStatus = () => connectionStatus;

// Funciones específicas para obtener datos
export const getVentas = async (filters: {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  rutCliente?: string;
} = {}) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  // Create cache key based on filters
  const cacheKey = JSON.stringify(filters);

  // Check cache first
  const cached = dataCache.ventas.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📊 Ventas obtenidas desde caché:', cached.data.length, 'registros');
    return cached.data;
  }

  console.log('📊 [DB] Obteniendo ventas desde tabla reg_ventas con filtros:', filters);

  let query = supabase
    .from('reg_ventas')
    .select('*')
    .neq('nro', 0) // Exclude documents with nro = 0 (VAT repetitions)
    .order('fecha_docto', { ascending: false });

  // Aplicar filtros (solo si tienen valores reales)
  if (filters.dateFrom && filters.dateFrom.trim() !== '') {
    query = query.gte('fecha_docto', filters.dateFrom);
  }
  if (filters.dateTo && filters.dateTo.trim() !== '') {
    query = query.lte('fecha_docto', filters.dateTo);
  }
  if (filters.rutCliente && filters.rutCliente.trim() !== '') {
    query = query.eq('rut_cliente', filters.rutCliente);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error al obtener ventas:', error);
    throw error;
  }

  // Filtrar por término de búsqueda si existe
  let filteredData = data || [];
  if (filters.searchTerm && filters.searchTerm.trim() !== '') {
    const searchLower = filters.searchTerm.toLowerCase().trim();
    filteredData = filteredData.filter(item =>
      item.folio?.toLowerCase().includes(searchLower) ||
      item.razon_social?.toLowerCase().includes(searchLower) ||
      item.tipo_doc?.toLowerCase().includes(searchLower)
    );
  }

  // Cache the result
  dataCache.ventas.set(cacheKey, {
    data: filteredData,
    timestamp: Date.now()
  });

  console.log('✅ [DB] Ventas obtenidas desde reg_ventas:', filteredData.length, 'registros');
  return filteredData;
};

export const getCompras = async (filters: {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  rutProveedor?: string;
} = {}) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  // Create cache key based on filters
  const cacheKey = JSON.stringify(filters);

  // Check cache first
  const cached = dataCache.compras.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📊 Compras obtenidas desde caché:', cached.data.length, 'registros');
    return cached.data;
  }

  console.log('📊 [DB] Obteniendo compras desde tabla reg_compras con filtros:', filters);

  let query = supabase
    .from('reg_compras')
    .select('*')
    .neq('nro', 0) // Exclude documents with nro = 0 (VAT repetitions)
    .order('fecha_docto', { ascending: false });

  // Aplicar filtros (solo si tienen valores reales)
  if (filters.dateFrom && filters.dateFrom.trim() !== '') {
    query = query.gte('fecha_docto', filters.dateFrom);
  }
  if (filters.dateTo && filters.dateTo.trim() !== '') {
    query = query.lte('fecha_docto', filters.dateTo);
  }
  if (filters.rutProveedor && filters.rutProveedor.trim() !== '') {
    query = query.eq('rut_proveedor', filters.rutProveedor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error al obtener compras:', error);
    throw error;
  }

  // Filtrar por término de búsqueda si existe
  let filteredData = data || [];
  if (filters.searchTerm && filters.searchTerm.trim() !== '') {
    const searchLower = filters.searchTerm.toLowerCase().trim();
    filteredData = filteredData.filter(item =>
      item.folio?.toLowerCase().includes(searchLower) ||
      item.razon_social?.toLowerCase().includes(searchLower) ||
      item.tipo_doc?.toString().toLowerCase().includes(searchLower)
    );
  }

  // Cache the result
  dataCache.compras.set(cacheKey, {
    data: filteredData,
    timestamp: Date.now()
  });

  console.log('✅ [DB] Compras obtenidas desde reg_compras:', filteredData.length, 'registros');
  return filteredData;
};

export const getClientes = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  // Create cache key for clientes (no filters needed)
  const cacheKey = 'all_clientes';

  // Check cache first
  const cached = dataCache.clientes.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('👥 Clientes obtenidos desde caché:', cached.data.length);
    return cached.data;
  }

  console.log('👥 Obteniendo clientes desde tabla reg_ventas...');

  const { data, error } = await supabase
    .from('reg_ventas')
    .select('rut_cliente, razon_social')
    .not('rut_cliente', 'is', null)
    .not('razon_social', 'is', null);

  if (error) {
    console.error('❌ Error al obtener clientes:', error);
    throw error;
  }

  // Obtener clientes únicos
  const uniqueClientes = data?.reduce((acc: Array<{rut: string, razon_social: string}>, curr) => {
    if (curr.rut_cliente && curr.razon_social &&
        !acc.find(r => r.rut === curr.rut_cliente)) {
      acc.push({
        rut: curr.rut_cliente,
        razon_social: curr.razon_social
      });
    }
    return acc;
  }, []) || [];

  // Cache the result
  dataCache.clientes.set(cacheKey, {
    data: uniqueClientes.sort((a, b) => a.razon_social.localeCompare(b.razon_social)),
    timestamp: Date.now()
  });

  console.log('✅ Clientes únicos encontrados:', uniqueClientes.length);
  return uniqueClientes.sort((a, b) => a.razon_social.localeCompare(b.razon_social));
};

export const getProveedores = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  // Create cache key for proveedores (no filters needed)
  const cacheKey = 'all_proveedores';

  // Check cache first
  const cached = dataCache.proveedores.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('🏢 Proveedores obtenidos desde caché:', cached.data.length);
    return cached.data;
  }

  console.log('🏢 Obteniendo proveedores desde tabla reg_compras...');

  const { data, error } = await supabase
    .from('reg_compras')
    .select('rut_proveedor, razon_social')
    .not('rut_proveedor', 'is', null)
    .not('razon_social', 'is', null);

  if (error) {
    console.error('❌ Error al obtener proveedores:', error);
    throw error;
  }

  // Obtener proveedores únicos
  const uniqueProveedores = data?.reduce((acc: Array<{rut: string, razon_social: string}>, curr) => {
    if (curr.rut_proveedor && curr.razon_social &&
        !acc.find(e => e.rut === curr.rut_proveedor)) {
      acc.push({
        rut: curr.rut_proveedor,
        razon_social: curr.razon_social
      });
    }
    return acc;
  }, []) || [];

  // Cache the result
  dataCache.proveedores.set(cacheKey, {
    data: uniqueProveedores.sort((a, b) => a.razon_social.localeCompare(b.razon_social)),
    timestamp: Date.now()
  });

  console.log('✅ Proveedores únicos encontrados:', uniqueProveedores.length);
  return uniqueProveedores.sort((a, b) => a.razon_social.localeCompare(b.razon_social));
};

// Función para calcular totales de ventas considerando notas de crédito
export const calculateVentasTotal = (ventas: any[]): number => {
  // Filter out documents with nro = 0 (VAT repetitions)
  const filteredVentas = ventas.filter(venta => venta.nro !== 0);

  return filteredVentas.reduce((total, venta) => {
    const multiplier = getDocumentMultiplier(venta.tipo_doc || '');
    const monto = venta.monto_total || 0;
    return total + (monto * multiplier);
  }, 0);
};

// Función para calcular totales de compras considerando notas de crédito
export const calculateComprasTotal = (compras: any[]): number => {
  // Filter out documents with nro = 0 (VAT repetitions)
  const filteredCompras = compras.filter(compra => compra.nro !== 0);

  return filteredCompras.reduce((total, compra) => {
    const multiplier = getDocumentMultiplier(compra.tipo_doc || '');
    const monto = compra.monto_total || 0;
    return total + (monto * multiplier);
  }, 0);
};

// Función para obtener estadísticas de documentos
export const getDocumentStats = (documents: any[], tipoDocField: string = 'tipo_doc') => {
  // Filter out documents with nro = 0 (VAT repetitions)
  const filteredDocuments = documents.filter(doc => doc.nro !== 0);

  const stats = {
    total: 0,
    positive: 0,
    negative: 0,
    count: filteredDocuments.length,
    creditNotes: 0,
    regularDocs: 0
  };

  filteredDocuments.forEach(doc => {
    const multiplier = getDocumentMultiplier(doc[tipoDocField] || '');
    const monto = doc.monto_total || 0;
    const amount = monto * multiplier;

    stats.total += amount;

    if (multiplier === -1) {
      stats.negative += Math.abs(amount);
      stats.creditNotes++;
    } else {
      stats.positive += amount;
      stats.regularDocs++;
    }
  });

  return stats;
};

// Manual Entries Functions
export const getManualEntries = async (filters: {
 searchTerm?: string;
 dateFrom?: string;
 dateTo?: string;
 entryType?: 'expense' | 'income';
} = {}): Promise<ManualEntry[]> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('📊 Obteniendo entradas manuales con filtros:', filters);

 let query = supabase
   .from('manual_entries')
   .select('*')
   .order('entry_date', { ascending: false });

 // Apply filters
 if (filters.dateFrom) {
   query = query.gte('entry_date', filters.dateFrom);
 }
 if (filters.dateTo) {
   query = query.lte('entry_date', filters.dateTo);
 }
 if (filters.entryType) {
   query = query.eq('entry_type', filters.entryType);
 }

 const { data, error } = await query;

 if (error) {
   console.error('❌ Error al obtener entradas manuales:', error);
   throw error;
 }

 // Filter by search term if exists
 let filteredData = data || [];
 if (filters.searchTerm) {
   const searchLower = filters.searchTerm.toLowerCase();
   filteredData = filteredData.filter((item: ManualEntry) =>
     item.description.toLowerCase().includes(searchLower)
   );
 }

 console.log('✅ Entradas manuales obtenidas:', filteredData.length, 'registros');
 return filteredData;
};

export const createManualEntry = async (entry: Omit<ManualEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ManualEntry> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('➕ Creando entrada manual:', entry);

 const { data, error } = await supabase
   .from('manual_entries')
   .insert(entry)
   .select()
   .single();

 if (error) {
   console.error('❌ Error al crear entrada manual:', error);
   throw error;
 }

 console.log('✅ Entrada manual creada:', data);
 return data;
};

export const updateManualEntry = async (id: number, entry: Partial<Omit<ManualEntry, 'id' | 'created_at'>>): Promise<ManualEntry> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('✏️ Actualizando entrada manual ID:', id, entry);

 const { data, error } = await supabase
   .from('manual_entries')
   .update({
     ...entry,
     updated_at: new Date().toISOString()
   })
   .eq('id', id)
   .select()
   .single();

 if (error) {
   console.error('❌ Error al actualizar entrada manual:', error);
   throw error;
 }

 console.log('✅ Entrada manual actualizada:', data);
 return data;
};

export const deleteManualEntry = async (id: number): Promise<void> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('🗑️ Eliminando entrada manual ID:', id);

 const { error } = await supabase
   .from('manual_entries')
   .delete()
   .eq('id', id);

 if (error) {
   console.error('❌ Error al eliminar entrada manual:', error);
   throw error;
 }

 console.log('✅ Entrada manual eliminada');
};

// Factoring Functions
export const markInvoiceAsFactored = async (id: number, factoringDate: string): Promise<RegVenta> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('🏦 Marcando factura como factorizada:', id, factoringDate);

 const { data, error } = await supabase
   .from('reg_ventas')
   .update({
     is_factored: true,
     factoring_date: factoringDate
   })
   .eq('id', id)
   .select()
   .single();

 if (error) {
   console.error('❌ Error al marcar factura como factorizada:', error);
   throw error;
 }

 console.log('✅ Factura marcada como factorizada:', data);
 return data;
};

export const unmarkInvoiceAsFactored = async (id: number): Promise<RegVenta> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('🏦 Desmarcando factura como factorizada:', id);

  const { data, error } = await supabase
    .from('reg_ventas')
    .update({
      is_factored: false,
      factoring_date: null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error al desmarcar factura como factorizada:', error);
    throw error;
  }

  console.log('✅ Factura desmarcada como factorizada:', data);
  return data;
};

// Función para obtener el detalle de una factura de venta específica
export const getVentasDetalle = async (regVentasId: number): Promise<RegFacturaDetalle[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📊 Obteniendo detalle de venta para reg_ventas ID:', regVentasId);

  // Primero buscar el registro correspondiente en reg_facturas_xml
  const { data: xmlData, error: xmlError } = await supabase
    .from('reg_facturas_xml')
    .select('id')
    .eq('reg_ventas_id', regVentasId)
    .limit(1);

  if (xmlError) {
    console.error('❌ Error al buscar registro XML para la venta:', xmlError);
    // Si no encuentra el registro XML, devolver array vacío en lugar de error
    console.log('⚠️ Error en consulta XML, devolviendo array vacío');
    return [];
  }

  if (!xmlData || xmlData.length === 0 || !xmlData[0].id) {
    console.log('⚠️ No se encontró registro XML para la venta ID:', regVentasId, ', devolviendo array vacío');
    return [];
  }

  console.log('🔗 Encontrado reg_facturas_xml ID:', xmlData[0].id, 'para reg_ventas ID:', regVentasId);

  // Ahora buscar los detalles usando el ID correcto
  const { data, error } = await supabase
    .from('reg_facturas_detalle')
    .select('*')
    .eq('factura_id', xmlData[0].id)
    .order('numero_linea', { ascending: true });

  if (error) {
    console.error('❌ Error al obtener detalle de venta:', error);
    throw error;
  }

  console.log('✅ Detalle de venta obtenido:', data?.length || 0, 'líneas');
  return data || [];
};

// Función para obtener el detalle de una factura de compra específica
export const getComprasDetalle = async (regComprasId: number): Promise<RegFacturaDetalle[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📊 Obteniendo detalle de compra para reg_compras ID:', regComprasId);

  // Primero buscar el registro correspondiente en reg_facturas_xml
  const { data: xmlData, error: xmlError } = await supabase
    .from('reg_facturas_xml')
    .select('id')
    .eq('reg_compras_id', regComprasId)
    .limit(1);

  if (xmlError) {
    console.error('❌ Error al buscar registro XML para la compra:', xmlError);
    // Si no encuentra el registro XML, devolver array vacío en lugar de error
    console.log('⚠️ Error en consulta XML, devolviendo array vacío');
    return [];
  }

  if (!xmlData || xmlData.length === 0 || !xmlData[0].id) {
    console.log('⚠️ No se encontró registro XML para la compra ID:', regComprasId, ', devolviendo array vacío');
    return [];
  }

  console.log('🔗 Encontrado reg_facturas_xml ID:', xmlData[0].id, 'para reg_compras ID:', regComprasId);

  // Ahora buscar los detalles usando el ID correcto
  const { data, error } = await supabase
    .from('reg_facturas_detalle')
    .select('*')
    .eq('factura_id', xmlData[0].id)
    .order('numero_linea', { ascending: true });

  if (error) {
    console.error('❌ Error al obtener detalle de compra:', error);
    throw error;
  }

  console.log('✅ Detalle de compra obtenido:', data?.length || 0, 'líneas');
  return data || [];
};

// Interface para análisis de productos
export interface ProductoAnalytics {
  descripcion_item: string;
  total_unidades: number;
  total_ingresos: number;
  precio_promedio: number;
  precio_maximo: number;
  precio_minimo: number;
  numero_ventas: number;
  clientes_unicos: number;
}

// Función para obtener análisis de productos vendidos
export const getProductosAnalytics = async (filters: {
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
} = {}): Promise<ProductoAnalytics[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📊 [DB] Obteniendo análisis de productos con filtros:', filters);

  // Construir query base
  let query = supabase
    .from('reg_facturas_detalle')
    .select(`
      descripcion_item,
      cantidad,
      precio_unitario,
      monto_item,
      factura_id,
      reg_facturas_xml!inner(
        fecha_emision
      )
    `)
    .not('descripcion_item', 'is', null)
    .not('cantidad', 'is', null)
    .not('precio_unitario', 'is', null);

  // Aplicar filtros de fecha
  if (filters.dateFrom && filters.dateFrom.trim() !== '') {
    query = query.gte('reg_facturas_xml.fecha_emision', filters.dateFrom);
  }
  if (filters.dateTo && filters.dateTo.trim() !== '') {
    query = query.lte('reg_facturas_xml.fecha_emision', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error al obtener análisis de productos:', error);
    throw error;
  }

  // Filtrar por término de búsqueda si existe
  let filteredData = data || [];
  if (filters.searchTerm && filters.searchTerm.trim() !== '') {
    const searchLower = filters.searchTerm.toLowerCase().trim();
    filteredData = filteredData.filter(item =>
      item.descripcion_item?.toLowerCase().includes(searchLower)
    );
  }

  // Obtener información adicional de las facturas (fechas y clientes)
  // Nota: Para simplificar, por ahora trabajaremos solo con los datos disponibles
  // Si necesitas filtros por fecha, necesitarías hacer joins más complejos

  // Agrupar por descripción del producto
  const productosMap = new Map<string, {
    descripcion_item: string;
    unidades: number[];
    precios: number[];
    ingresos: number[];
    numero_ventas: number;
  }>();

  filteredData.forEach(item => {
    const descripcion = item.descripcion_item || 'Sin descripción';
    const cantidad = item.cantidad || 0;
    const precio = item.precio_unitario || 0;
    const ingreso = item.monto_item || 0;

    if (!productosMap.has(descripcion)) {
      productosMap.set(descripcion, {
        descripcion_item: descripcion,
        unidades: [],
        precios: [],
        ingresos: [],
        numero_ventas: 0
      });
    }

    const producto = productosMap.get(descripcion)!;
    producto.unidades.push(cantidad);
    producto.precios.push(precio);
    producto.ingresos.push(ingreso);
    producto.numero_ventas += 1;
  });

  // Calcular estadísticas para cada producto
  const productosAnalytics: ProductoAnalytics[] = Array.from(productosMap.values()).map(producto => {
    const totalUnidades = producto.unidades.reduce((sum, u) => sum + u, 0);
    const totalIngresos = producto.ingresos.reduce((sum, i) => sum + i, 0);
    const precios = producto.precios.filter(p => p > 0);

    return {
      descripcion_item: producto.descripcion_item,
      total_unidades: totalUnidades,
      total_ingresos: totalIngresos,
      precio_promedio: precios.length > 0 ? precios.reduce((sum, p) => sum + p, 0) / precios.length : 0,
      precio_maximo: precios.length > 0 ? Math.max(...precios) : 0,
      precio_minimo: precios.length > 0 ? Math.min(...precios) : 0,
      numero_ventas: producto.numero_ventas,
      clientes_unicos: 0 // Por ahora no calculamos clientes únicos, se puede implementar más tarde
    };
  });

  // Ordenar por total de ingresos (descendente)
  productosAnalytics.sort((a, b) => b.total_ingresos - a.total_ingresos);

  console.log('✅ [DB] Análisis de productos obtenido:', productosAnalytics.length, 'productos');
  return productosAnalytics;
};

// Group related documents (invoices with their credit notes)
export const groupRelatedDocuments = (documents: RegVenta[]): Array<{
  original: RegVenta;
  creditNotes: RegVenta[];
  netAmount: number;
  isFullyCancelled: boolean;
}> => {
  // Filter out documents with nro = 0 (VAT repetitions) before grouping
  const filteredDocuments = documents.filter(doc => doc.nro !== 0);

  const documentGroups: { [key: string]: { original: RegVenta; creditNotes: RegVenta[] } } = {};
  const processedDocuments = new Set<number>();

  // First pass: identify original invoices and their credit notes
  filteredDocuments.forEach(doc => {
    if (doc.tipo_doc === '61' && doc.folio_docto_referencia) {
      // This is a credit note, find its original invoice
      const referenceFolio = doc.folio_docto_referencia.toString();
      if (!documentGroups[referenceFolio]) {
        documentGroups[referenceFolio] = { original: null as any, creditNotes: [] };
      }
      documentGroups[referenceFolio].creditNotes.push(doc);
      processedDocuments.add(doc.id);
    } else if (doc.tipo_doc !== '61') {
      // This is potentially an original invoice
      const folio = doc.folio || doc.nro?.toString() || '';
      if (!documentGroups[folio]) {
        documentGroups[folio] = { original: doc, creditNotes: [] };
      } else {
        documentGroups[folio].original = doc;
      }
      processedDocuments.add(doc.id);
    }
  });

 // Second pass: handle documents that weren't matched
 documents.forEach(doc => {
   if (!processedDocuments.has(doc.id)) {
     const folio = doc.folio || doc.nro?.toString() || `doc-${doc.id}`;
     if (!documentGroups[folio]) {
       documentGroups[folio] = { original: doc, creditNotes: [] };
     }
   }
 });

 // Calculate net amounts and return grouped data
 return Object.values(documentGroups)
   .filter(group => group.original !== null)
   .map(group => {
     const totalCreditNoteAmount = group.creditNotes.reduce((sum, cn) => {
       return sum + Math.abs(cn.monto_total || 0);
     }, 0);

     const originalAmount = group.original.monto_total || 0;
     const netAmount = originalAmount - totalCreditNoteAmount;
     const isFullyCancelled = netAmount <= 0;

     return {
       original: group.original,
       creditNotes: group.creditNotes,
       netAmount: Math.abs(netAmount),
       isFullyCancelled
     };
   })
   .sort((a, b) => new Date(a.original.fecha_docto || '').getTime() - new Date(b.original.fecha_docto || '').getTime());
};

// === PRODUCTOS FUNCTIONS ===

// Interface for enhanced product data
export interface ProductoConEstadisticas extends Producto {
  numero_facturas: number;
  variaciones: string[];
  total_unidades: number;
  total_ingresos: number;
}

// Función para obtener todos los productos
export const getProductos = async (activo?: boolean): Promise<Producto[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📦 Obteniendo productos...', activo !== undefined ? `activo: ${activo}` : 'todos');

  let query = supabase
    .from('productos')
    .select('*')
    .order('nombre_producto');

  if (activo !== undefined) {
    query = query.eq('activo', activo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error al obtener productos:', error);
    throw error;
  }

  console.log('✅ Productos obtenidos:', data?.length || 0);
  return data || [];
};

// Función para obtener productos con estadísticas de facturas
export const getProductosConEstadisticas = async (activo?: boolean): Promise<ProductoConEstadisticas[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📊 Obteniendo productos con estadísticas...', activo !== undefined ? `activo: ${activo}` : 'todos');

  // Obtener productos base
  const productos = await getProductos(activo);

  if (productos.length === 0) {
    return [];
  }

  // Obtener mapeos de productos para encontrar variaciones
  const { data: mapeos, error: mapeosError } = await supabase
    .from('producto_descripcion_map')
    .select('producto_id, descripcion_original');

  if (mapeosError) {
    console.error('❌ Error al obtener mapeos:', mapeosError);
    throw mapeosError;
  }

  // Crear mapa de producto_id -> descripciones
  const productoMapeos = new Map<number, string[]>();
  mapeos?.forEach(mapeo => {
    const existing = productoMapeos.get(mapeo.producto_id) || [];
    existing.push(mapeo.descripcion_original);
    productoMapeos.set(mapeo.producto_id, existing);
  });

  // Cada producto solo busca sus propias variaciones exactas
  // No hay lógica jerárquica - cada producto es independiente

  // Obtener estadísticas de facturas para cada producto
  const productosConEstadisticas: ProductoConEstadisticas[] = [];

  console.log(`⏱️ [PERF] Iniciando procesamiento de ${productos.length} productos...`);
  const startTime = performance.now();

  // Obtener TODOS los detalles de facturas de una sola vez (optimización principal)
  console.log(`⏱️ [PERF] Consultando todos los detalles de facturas...`);
  const facturasStartTime = performance.now();

  const { data: allFacturasDetalle, error: allFacturasError } = await supabase
    .from('reg_facturas_detalle')
    .select(`
      descripcion_item,
      cantidad,
      precio_unitario,
      monto_item,
      reg_facturas_xml!inner(
        tipo_dte,
        reg_ventas_id,
        reg_compras_id
      )
    `)
    .not('descripcion_item', 'is', null);

  const facturasEndTime = performance.now();
  console.log(`⏱️ [PERF] Consulta de facturas completada en ${(facturasEndTime - facturasStartTime).toFixed(2)}ms. Registros obtenidos: ${allFacturasDetalle?.length || 0}`);

  if (allFacturasError) {
    console.error('❌ Error al obtener todas las facturas:', allFacturasError);
    // Retornar productos sin estadísticas
    return productos.map(producto => ({
      ...producto,
      numero_facturas: 0,
      variaciones: [],
      total_unidades: 0,
      total_ingresos: 0
    }));
  }

  // Crear mapa de descripciones -> facturas para búsqueda rápida
  console.log(`⏱️ [PERF] Creando mapa de búsqueda rápida...`);
  const mapStartTime = performance.now();

  const facturasPorDescripcion = new Map<string, any[]>();
  allFacturasDetalle?.forEach(factura => {
    const descripcion = factura.descripcion_item!;
    if (!facturasPorDescripcion.has(descripcion)) {
      facturasPorDescripcion.set(descripcion, []);
    }
    facturasPorDescripcion.get(descripcion)!.push(factura);
  });

  const mapEndTime = performance.now();
  console.log(`⏱️ [PERF] Mapa creado en ${(mapEndTime - mapStartTime).toFixed(2)}ms. Descripciones únicas: ${facturasPorDescripcion.size}`);

  // Procesar todos los productos (cada uno busca solo sus propias variaciones exactas)
  for (let i = 0; i < productos.length; i++) {
    const producto = productos[i];
    const productStartTime = performance.now();

    console.log(`⏱️ [PERF] Procesando producto ${i + 1}/${productos.length}: "${producto.nombre_producto}"`);

    // Obtener variaciones mapeadas del producto actual
    const variaciones = productoMapeos.get(producto.id) || [];

    // Usar algoritmo inteligente para encontrar solo variaciones EXACTAS del producto actual
    const todasLasDescripciones = Array.from(facturasPorDescripcion.keys());
    const coincidencias = encontrarMejorCoincidencia(producto.nombre_producto, todasLasDescripciones);

    console.log(`⏱️ [PERF] Coincidencias encontradas para "${producto.nombre_producto}": ${coincidencias.length}`);

    // Filtrar las facturas que coinciden EXACTAMENTE con las variaciones del producto
    const facturasData: any[] = [];
    coincidencias.forEach(coincidencia => {
      const facturasCoincidencia = facturasPorDescripcion.get(coincidencia) || [];
      facturasData.push(...facturasCoincidencia);
    });

    // Calcular estadísticas
    const numero_facturas = facturasData.length;
    const total_unidades = facturasData.reduce((sum, f) => sum + (f.cantidad || 0), 0);
    const total_ingresos = facturasData.reduce((sum, f) => sum + (f.monto_item || 0), 0);

    // Obtener todas las variaciones únicas
    const todasLasVariaciones = new Set<string>();
    facturasData.forEach(f => {
      if (f.descripcion_item && f.descripcion_item !== producto.nombre_producto) {
        todasLasVariaciones.add(f.descripcion_item);
      }
    });

    // Agregar variaciones mapeadas
    variaciones.forEach(v => todasLasVariaciones.add(v));

    productosConEstadisticas.push({
      ...producto,
      numero_facturas: numero_facturas,
      variaciones: Array.from(todasLasVariaciones),
      total_unidades: total_unidades,
      total_ingresos: total_ingresos
    });

    const productEndTime = performance.now();
    console.log(`⏱️ [PERF] Producto "${producto.nombre_producto}" procesado en ${(productEndTime - productStartTime).toFixed(2)}ms. Facturas: ${numero_facturas}, Variaciones: ${todasLasVariaciones.size}`);
  }

  const endTime = performance.now();
  console.log(`⏱️ [PERF] Procesamiento completo de ${productos.length} productos en ${(endTime - startTime).toFixed(2)}ms`);

  console.log('✅ Productos con estadísticas obtenidos:', productosConEstadisticas.length);
  return productosConEstadisticas;
};

// Función para crear un producto
export const createProducto = async (producto: Omit<Producto, 'id' | 'created_at' | 'updated_at'>): Promise<Producto> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('➕ Creando producto:', producto);

 const { data, error } = await supabase
   .from('productos')
   .insert(producto)
   .select()
   .single();

 if (error) {
   console.error('❌ Error al crear producto:', error);
   throw error;
 }

 console.log('✅ Producto creado:', data);
 return data;
};

// Función para actualizar un producto
export const updateProducto = async (id: number, producto: Partial<Omit<Producto, 'id' | 'created_at'>>): Promise<Producto> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('✏️ Actualizando producto ID:', id, producto);

 const { data, error } = await supabase
   .from('productos')
   .update({
     ...producto,
     updated_at: new Date().toISOString()
   })
   .eq('id', id)
   .select()
   .single();

 if (error) {
   console.error('❌ Error al actualizar producto:', error);
   throw error;
 }

 console.log('✅ Producto actualizado:', data);
 return data;
};

// Función para eliminar un producto
export const deleteProducto = async (id: number): Promise<void> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('🗑️ Eliminando producto ID:', id);

 const { error } = await supabase
   .from('productos')
   .delete()
   .eq('id', id);

 if (error) {
   console.error('❌ Error al eliminar producto:', error);
   throw error;
 }

 console.log('✅ Producto eliminado');
};

// Función para normalizar nombres de productos eliminando información entre paréntesis
function normalizarNombreProducto(descripcion: string): string {
  // Eliminar información entre paréntesis, corchetes y llaves
  let nombreBase = descripcion
    .replace(/\([^)]*\)/g, '') // Elimina (cualquier cosa)
    .replace(/\{[^}]*\}/g, '') // Elimina {cualquier cosa}
    .replace(/\[[^\]]*\]/g, '') // Elimina [cualquier cosa]
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .trim();

  // Si después de la normalización queda vacío, usar la descripción original
  return nombreBase || descripcion.trim();
}

// Función para encontrar la mejor coincidencia entre un producto y descripciones de facturas
function encontrarMejorCoincidencia(productoNombre: string, descripcionesFacturas: string[]): string[] {
  const productoNormalizado = normalizarNombreProducto(productoNombre).toLowerCase();

  // Buscar coincidencias que contengan el NOMBRE COMPLETO del producto
  const coincidencias = descripcionesFacturas.filter(desc => {
    const descNormalizada = normalizarNombreProducto(desc).toLowerCase();
    // El nombre del producto debe estar contenido COMPLETAMENTE en la descripción
    // No solo palabras individuales, sino el nombre completo como una unidad
    return descNormalizada.includes(productoNormalizado);
  });

  return coincidencias;
}

// Función de diagnóstico para verificar la integridad de datos
export const getDataIntegrityDiagnostic = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('🔍 Ejecutando diagnóstico de integridad de datos...');

  // Verificar reg_facturas_xml
  const { data: xmlData, error: xmlError } = await supabase
    .from('reg_facturas_xml')
    .select('id, reg_ventas_id, reg_compras_id, tipo_dte');

  if (xmlError) {
    console.error('❌ Error al obtener datos XML:', xmlError);
    throw xmlError;
  }

  const xmlStats = {
    total: xmlData?.length || 0,
    withVentasId: xmlData?.filter(x => x.reg_ventas_id !== null).length || 0,
    withComprasId: xmlData?.filter(x => x.reg_compras_id !== null).length || 0,
    withBothIds: xmlData?.filter(x => x.reg_ventas_id !== null && x.reg_compras_id !== null).length || 0,
    withNeitherId: xmlData?.filter(x => x.reg_ventas_id === null && x.reg_compras_id === null).length || 0,
    documentosPorTipo: {} as Record<string, number>
  };

  // Contar por tipo de documento
  xmlData?.forEach(item => {
    const tipo = item.tipo_dte || 'Sin tipo';
    xmlStats.documentosPorTipo[tipo] = (xmlStats.documentosPorTipo[tipo] || 0) + 1;
  });

  console.log('📊 Estadísticas XML:', xmlStats);

  return xmlStats;
};

// Función para obtener descripciones propuestas (repetidas en facturas pero no mapeadas a productos)
export const getDescripcionesPropuestas = async (
  minFrecuencia: number = 3,
  tipo: 'ventas' | 'compras' | 'todos' = 'todos'
): Promise<DescripcionPropuesta[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('🔍 Obteniendo descripciones propuestas con frecuencia mínima:', minFrecuencia, 'tipo:', tipo);

  // Obtener productos existentes para excluirlos
  const { data: productos, error: productosError } = await supabase
    .from('productos')
    .select('nombre_producto')
    .eq('activo', true);

  if (productosError) {
    console.error('❌ Error al obtener productos existentes:', productosError);
    throw productosError;
  }

  const nombresProductosExistentes = new Set(
    productos?.map(p => normalizarNombreProducto(p.nombre_producto).toLowerCase()) || []
  );

  // Obtener todas las descripciones de facturas que no están mapeadas a productos
  let query = supabase
    .from('reg_facturas_detalle')
    .select(`
      descripcion_item,
      cantidad,
      monto_item,
      reg_facturas_xml!inner(
        tipo_dte,
        reg_ventas_id,
        reg_compras_id
      )
    `)
    .not('descripcion_item', 'is', null);

  // Filtrar por tipo de documento con lógica corregida
  if (tipo === 'ventas') {
    // Solo facturas de venta (tienen reg_ventas_id y NO tienen reg_compras_id)
    query = query
      .not('reg_facturas_xml.reg_ventas_id', 'is', null)
      .is('reg_facturas_xml.reg_compras_id', null);
  } else if (tipo === 'compras') {
    // Solo facturas de compra (tienen reg_compras_id y NO tienen reg_ventas_id)
    query = query
      .not('reg_facturas_xml.reg_compras_id', 'is', null)
      .is('reg_facturas_xml.reg_ventas_id', null);
  }
  // Para 'todos', no aplicamos filtro adicional - incluimos todas las facturas que tengan
  // ya sea reg_ventas_id o reg_compras_id (o ambos)

  const { data: facturasDetalle, error: facturasError } = await query;

  if (facturasError) {
    console.error('❌ Error al obtener detalles de facturas:', facturasError);
    throw facturasError;
  }

  console.log(`📊 Detalles de facturas obtenidos para tipo '${tipo}':`, facturasDetalle?.length || 0);

  // Obtener todas las descripciones ya mapeadas
  const { data: mapeos, error: mapeosError } = await supabase
    .from('producto_descripcion_map')
    .select('descripcion_original');

  if (mapeosError) {
    console.error('❌ Error al obtener mapeos:', mapeosError);
    throw mapeosError;
  }

  const descripcionesMapeadas = new Set(mapeos?.map(m => m.descripcion_original.toLowerCase()) || []);

  // Agrupar por nombre base normalizado
  const productosAgrupados = new Map<string, {
    nombreBase: string;
    descripcionesOriginales: Set<string>;
    frecuencia: number;
    totalUnidades: number;
    totalIngresos: number;
  }>();

  facturasDetalle?.forEach(item => {
    const descripcionOriginal = item.descripcion_item?.trim();
    if (!descripcionOriginal || descripcionesMapeadas.has(descripcionOriginal.toLowerCase())) return;

    // Excluir si coincide con productos existentes (comparación más robusta)
    const nombreBase = normalizarNombreProducto(descripcionOriginal);
    const nombreBaseKey = nombreBase.toLowerCase();

    // Check if any existing product name contains this base name or vice versa
    const shouldExclude = Array.from(nombresProductosExistentes).some(existingProduct => {
      const existingNormalized = normalizarNombreProducto(existingProduct).toLowerCase();
      return existingNormalized.includes(nombreBaseKey) || nombreBaseKey.includes(existingNormalized);
    });

    if (shouldExclude) {
      console.log(`⚠️ Excluyendo "${descripcionOriginal}" porque coincide con producto existente`);
      return;
    }

    const existing = productosAgrupados.get(nombreBaseKey) || {
      nombreBase: nombreBase,
      descripcionesOriginales: new Set(),
      frecuencia: 0,
      totalUnidades: 0,
      totalIngresos: 0
    };

    existing.descripcionesOriginales.add(descripcionOriginal);
    existing.frecuencia += 1;
    existing.totalUnidades += item.cantidad || 0;
    existing.totalIngresos += item.monto_item || 0;

    productosAgrupados.set(nombreBaseKey, existing);
  });

  // Filtrar por frecuencia mínima y convertir a array
  const propuestas: DescripcionPropuesta[] = Array.from(productosAgrupados.values())
    .filter(producto => producto.frecuencia >= minFrecuencia)
    .map(producto => ({
      descripcion: producto.nombreBase,
      frecuencia: producto.frecuencia,
      total_unidades: producto.totalUnidades,
      total_ingresos: producto.totalIngresos
    }))
    .sort((a, b) => {
      // Primero ordenar por ingresos más altos
      if (b.total_ingresos !== a.total_ingresos) {
        return b.total_ingresos - a.total_ingresos;
      }
      // Luego por frecuencia descendente
      return b.frecuencia - a.frecuencia;
    });

  console.log('✅ Descripciones propuestas encontradas (agrupadas):', propuestas.length);
  console.log('📊 Ejemplos de agrupación:');
  propuestas.slice(0, 3).forEach(p => {
    console.log(`  - "${p.descripcion}": ${p.frecuencia} veces, ${p.total_unidades} unidades`);
  });

  return propuestas;
};

// Función para crear productos desde descripciones propuestas
export const createProductosFromDescripciones = async (
  descripciones: string[],
  categoria?: string,
  mapearOriginales?: boolean
): Promise<Producto[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('🚀 Creando productos desde descripciones:', descripciones.length);

  const productosCreados: Producto[] = [];

  for (const descripcion of descripciones) {
    try {
      // Crear el producto
      const producto = await createProducto({
        nombre_producto: descripcion,
        descripcion: `Producto creado desde descripción de factura: ${descripcion}`,
        categoria: categoria || 'General',
        activo: true
      });

      // Solo crear el mapeo si se especifica y la descripción no coincide exactamente con el nombre del producto
      if (mapearOriginales && descripcion !== producto.nombre_producto) {
        await supabase
          .from('producto_descripcion_map')
          .insert({
            producto_id: producto.id,
            descripcion_original: descripcion
          });
      }

      productosCreados.push(producto);
    } catch (error) {
      console.error(`❌ Error al crear producto para descripción "${descripcion}":`, error);
    }
  }

  console.log('✅ Productos creados desde descripciones:', productosCreados.length);
  return productosCreados;
};

// Función para mapear una descripción existente a un producto
export const mapDescripcionToProducto = async (
  descripcion: string,
  productoId: number
): Promise<ProductoDescripcionMap> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('🔗 Mapeando descripción a producto:', descripcion, '->', productoId);

  const { data, error } = await supabase
    .from('producto_descripcion_map')
    .insert({
      producto_id: productoId,
      descripcion_original: descripcion
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error al crear mapeo:', error);
    throw error;
  }

  console.log('✅ Mapeo creado:', data);
  return data;
};

// Función para obtener análisis simple de productos con algoritmo inteligente
export const getProductosAnalyticsSimple = async (filters: {
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
} = {}): Promise<ProductoAnalytics[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('🧠 [DB] Obteniendo análisis simple de productos con algoritmo inteligente');

  // Obtener productos activos
  const productos = await getProductos(true);

  if (productos.length === 0) {
    console.log('ℹ️ No hay productos activos para analizar');
    return [];
  }

  // Obtener todas las descripciones de facturas para matching inteligente
  let query = supabase
    .from('reg_facturas_detalle')
    .select(`
      descripcion_item,
      cantidad,
      precio_unitario,
      monto_item,
      factura_id,
      reg_facturas_xml!inner(
        fecha_emision
      )
    `)
    .not('descripcion_item', 'is', null)
    .not('cantidad', 'is', null)
    .not('precio_unitario', 'is', null);

  // Aplicar filtros de fecha
  if (filters.dateFrom && filters.dateFrom.trim() !== '') {
    query = query.gte('reg_facturas_xml.fecha_emision', filters.dateFrom);
  }
  if (filters.dateTo && filters.dateTo.trim() !== '') {
    query = query.lte('reg_facturas_xml.fecha_emision', filters.dateTo);
  }

  const { data: facturasDetalle, error: facturasError } = await query;

  if (facturasError) {
    console.error('❌ Error al obtener detalles de facturas:', facturasError);
    throw facturasError;
  }

  console.log('📊 Detalles de facturas obtenidos:', facturasDetalle?.length || 0);

  // Crear lista de descripciones únicas para matching
  const descripcionesFacturas = [...new Set(facturasDetalle?.map(item => item.descripcion_item) || [])];
  console.log('📋 Descripciones únicas encontradas:', descripcionesFacturas.length);

  const productosAnalytics: ProductoAnalytics[] = [];

  for (const producto of productos) {
    console.log(`🔍 Procesando producto: "${producto.nombre_producto}"`);

    // Usar algoritmo inteligente para encontrar coincidencias
    const coincidencias = encontrarMejorCoincidencia(producto.nombre_producto, descripcionesFacturas);

    console.log(`  📊 Coincidencias encontradas: ${coincidencias.length}`);
    coincidencias.slice(0, 3).forEach(coinc => console.log(`    - "${coinc}"`));

    if (coincidencias.length === 0) {
      console.log(`  ⚠️ No se encontraron coincidencias para ${producto.nombre_producto}`);
      productosAnalytics.push({
        descripcion_item: producto.nombre_producto,
        total_unidades: 0,
        total_ingresos: 0,
        precio_promedio: 0,
        precio_maximo: 0,
        precio_minimo: 0,
        numero_ventas: 0,
        clientes_unicos: 0
      });
      continue;
    }

    // Filtrar las ventas que coinciden con las descripciones encontradas
    const ventasRelacionadas = facturasDetalle?.filter(item =>
      coincidencias.includes(item.descripcion_item)
    ) || [];

    console.log(`  📊 Ventas relacionadas encontradas: ${ventasRelacionadas.length}`);

    if (ventasRelacionadas.length === 0) {
      productosAnalytics.push({
        descripcion_item: producto.nombre_producto,
        total_unidades: 0,
        total_ingresos: 0,
        precio_promedio: 0,
        precio_maximo: 0,
        precio_minimo: 0,
        numero_ventas: 0,
        clientes_unicos: 0
      });
      continue;
    }

    // Calcular estadísticas combinadas
    const totalUnidades = ventasRelacionadas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
    const totalIngresos = ventasRelacionadas.reduce((sum, v) => sum + (v.monto_item || 0), 0);
    const precios = ventasRelacionadas.map(v => v.precio_unitario || 0).filter(p => p > 0);

    console.log(`  ✅ ${producto.nombre_producto} - Unidades: ${totalUnidades}, Ingresos: ${totalIngresos}, Ventas: ${ventasRelacionadas.length}`);

    // Mostrar ejemplos de agrupación si hay múltiples coincidencias
    if (coincidencias.length > 1) {
      console.log(`  🧠 Agrupación inteligente aplicada:`);
      console.log(`    - Base: "${normalizarNombreProducto(producto.nombre_producto)}"`);
      console.log(`    - Variaciones encontradas: ${coincidencias.join(', ')}`);
    }

    productosAnalytics.push({
      descripcion_item: producto.nombre_producto,
      total_unidades: totalUnidades,
      total_ingresos: totalIngresos,
      precio_promedio: precios.length > 0 ? precios.reduce((sum, p) => sum + p, 0) / precios.length : 0,
      precio_maximo: precios.length > 0 ? Math.max(...precios) : 0,
      precio_minimo: precios.length > 0 ? Math.min(...precios) : 0,
      numero_ventas: ventasRelacionadas.length,
      clientes_unicos: 0
    });
  }

  // Filtrar por término de búsqueda si existe
  let filteredData = productosAnalytics;
  if (filters.searchTerm && filters.searchTerm.trim() !== '') {
    const searchLower = filters.searchTerm.toLowerCase().trim();
    filteredData = filteredData.filter(item =>
      item.descripcion_item?.toLowerCase().includes(searchLower)
    );
  }

  // Ordenar por ingresos totales
  filteredData.sort((a, b) => b.total_ingresos - a.total_ingresos);

  console.log('✅ [DB] Análisis simple de productos con algoritmo inteligente completado:', filteredData.length, 'productos');

  // Mostrar resumen de agrupaciones realizadas
  const productosConVentas = filteredData.filter(p => p.numero_ventas > 0);
  console.log('📈 Resumen de productos con ventas:', productosConVentas.length);
  console.log('💰 Total ingresos combinados:', productosConVentas.reduce((sum, p) => sum + p.total_ingresos, 0).toLocaleString());

  return filteredData;
};

// Función mejorada para análisis de productos usando la tabla de productos
export const getProductosAnalyticsMejorado = async (filters: {
 dateFrom?: string;
 dateTo?: string;
 searchTerm?: string;
 productoId?: number;
} = {}): Promise<ProductoAnalytics[]> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('📊 [DB] Obteniendo análisis mejorado de productos con filtros:', filters);

 // Obtener productos activos
 const productos = await getProductos(true);
 console.log('📦 Productos encontrados:', productos.length);
 productos.forEach(p => console.log(`  - ${p.nombre_producto} (ID: ${p.id})`));

 if (productos.length === 0) {
   console.log('ℹ️ No hay productos activos para analizar');
   return [];
 }

 // Obtener mapeos de productos
 const { data: mapeos, error: mapeosError } = await supabase
   .from('producto_descripcion_map')
   .select('producto_id, descripcion_original');

 if (mapeosError) {
   console.error('❌ Error al obtener mapeos:', mapeosError);
   throw mapeosError;
 }

 console.log('🔗 Mapeos encontrados:', mapeos?.length || 0);
 mapeos?.forEach(m => console.log(`  - Producto ${m.producto_id} → "${m.descripcion_original}"`));

 // Crear mapa de producto -> descripciones
 const productoMapeos = new Map<number, string[]>();
 mapeos?.forEach(mapeo => {
   const existing = productoMapeos.get(mapeo.producto_id) || [];
   existing.push(mapeo.descripcion_original);
   productoMapeos.set(mapeo.producto_id, existing);
 });

 console.log('📋 Mapeos procesados:');
 productoMapeos.forEach((descripciones, productoId) => {
   console.log(`  - Producto ${productoId}: ${descripciones.length} descripciones`);
 });

 // Para cada producto, obtener sus estadísticas de ventas
 const productosAnalytics: ProductoAnalytics[] = [];

 for (const producto of productos) {
   console.log(`🔍 Procesando producto: ${producto.nombre_producto} (ID: ${producto.id})`);

   const descripciones = productoMapeos.get(producto.id) || [];
   console.log(`  📋 Descripciones mapeadas: ${descripciones.length} - ${descripciones.join(', ')}`);

   let ventas = null;
   let ventasError = null;

   if (descripciones.length === 0) {
     // Si no hay mapeos, buscar por nombre exacto del producto
     console.log(`  ⚠️ No hay mapeos, buscando por nombre exacto: "${producto.nombre_producto}"`);

     const { data, error } = await supabase
       .from('reg_facturas_detalle')
       .select(`
         descripcion_item,
         cantidad,
         precio_unitario,
         monto_item,
         factura_id
       `)
       .eq('descripcion_item', producto.nombre_producto);

     ventas = data;
     ventasError = error;
   } else {
     // Buscar ventas para las descripciones mapeadas
     console.log(`  🔍 Buscando ventas para descripciones mapeadas`);

     const { data, error } = await supabase
       .from('reg_facturas_detalle')
       .select(`
         descripcion_item,
         cantidad,
         precio_unitario,
         monto_item,
         factura_id
       `)
       .in('descripcion_item', descripciones);

     ventas = data;
     ventasError = error;
   }

   if (ventasError) {
     console.error(`❌ Error al obtener ventas para producto ${producto.nombre_producto}:`, ventasError);
     productosAnalytics.push({
       descripcion_item: producto.nombre_producto,
       total_unidades: 0,
       total_ingresos: 0,
       precio_promedio: 0,
       precio_maximo: 0,
       precio_minimo: 0,
       numero_ventas: 0,
       clientes_unicos: 0
     });
     continue;
   }

   console.log(`  📊 Ventas encontradas: ${ventas?.length || 0}`);

   if (!ventas || ventas.length === 0) {
     console.log(`  ⚠️ No se encontraron ventas para ${producto.nombre_producto}`);
     productosAnalytics.push({
       descripcion_item: producto.nombre_producto,
       total_unidades: 0,
       total_ingresos: 0,
       precio_promedio: 0,
       precio_maximo: 0,
       precio_minimo: 0,
       numero_ventas: 0,
       clientes_unicos: 0
     });
     continue;
   }

   // Calcular estadísticas
   const totalUnidades = ventas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
   const totalIngresos = ventas.reduce((sum, v) => sum + (v.monto_item || 0), 0);
   const precios = ventas.map(v => v.precio_unitario || 0).filter(p => p > 0);

   console.log(`  ✅ Estadísticas calculadas:`);
   console.log(`    - Unidades: ${totalUnidades}`);
   console.log(`    - Ingresos: ${totalIngresos}`);
   console.log(`    - Precios: ${precios.length} valores`);
   console.log(`    - Ventas: ${ventas.length}`);

   productosAnalytics.push({
     descripcion_item: producto.nombre_producto,
     total_unidades: totalUnidades,
     total_ingresos: totalIngresos,
     precio_promedio: precios.length > 0 ? precios.reduce((sum, p) => sum + p, 0) / precios.length : 0,
     precio_maximo: precios.length > 0 ? Math.max(...precios) : 0,
     precio_minimo: precios.length > 0 ? Math.min(...precios) : 0,
     numero_ventas: ventas.length,
     clientes_unicos: 0 // Por ahora no calculamos clientes únicos, se puede implementar más tarde
   });
 }

 // Filtrar por término de búsqueda si existe
 let filteredData = productosAnalytics;
 if (filters.searchTerm && filters.searchTerm.trim() !== '') {
   const searchLower = filters.searchTerm.toLowerCase().trim();
   filteredData = filteredData.filter(item =>
     item.descripcion_item?.toLowerCase().includes(searchLower)
   );
 }

 // Filtrar por producto específico si existe
 if (filters.productoId) {
   const producto = productos.find(p => p.id === filters.productoId);
   if (producto) {
     filteredData = filteredData.filter(item =>
       item.descripcion_item === producto.nombre_producto
     );
   }
 }

 // Ordenar por ingresos totales
 filteredData.sort((a, b) => b.total_ingresos - a.total_ingresos);

 console.log('✅ [DB] Análisis mejorado de productos obtenido:', filteredData.length, 'productos');
 return filteredData;
};

// === PAGOS Y REFERENCIAS FUNCTIONS ===

// Función para obtener pagos de una factura específica
export const getFacturaPagos = async (regVentasId: number): Promise<RegFacturaPago[]> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('💰 Obteniendo pagos para reg_ventas ID:', regVentasId);

 // Primero buscar el registro correspondiente en reg_facturas_xml
 const { data: xmlData, error: xmlError } = await supabase
   .from('reg_facturas_xml')
   .select('id')
   .eq('reg_ventas_id', regVentasId)
   .limit(1);

 if (xmlError) {
   console.error('❌ Error al buscar registro XML para pagos:', xmlError);
   return [];
 }

 if (!xmlData || xmlData.length === 0 || !xmlData[0].id) {
   console.log('⚠️ No se encontró registro XML para pagos, devolviendo array vacío');
   return [];
 }

 // Ahora buscar los pagos usando el ID de reg_facturas_xml
 const { data, error } = await supabase
   .from('reg_facturas_pagos')
   .select('*')
   .eq('factura_id', xmlData[0].id)
   .order('fecha_pago', { ascending: true });

 if (error) {
   console.error('❌ Error al obtener pagos:', error);
   return [];
 }

 console.log('✅ Pagos obtenidos:', data?.length || 0, 'registros');
 return data || [];
};

// Función para obtener referencias de una factura específica
export const getFacturaReferencias = async (regVentasId: number): Promise<RegFacturaReferencia[]> => {
 if (!supabase) {
   throw new Error('Supabase no está configurado');
 }

 console.log('📋 Obteniendo referencias para reg_ventas ID:', regVentasId);

 // Primero buscar el registro correspondiente en reg_facturas_xml
 const { data: xmlData, error: xmlError } = await supabase
   .from('reg_facturas_xml')
   .select('id')
   .eq('reg_ventas_id', regVentasId)
   .limit(1);

 if (xmlError) {
   console.error('❌ Error al buscar registro XML para referencias:', xmlError);
   return [];
 }

 if (!xmlData || xmlData.length === 0 || !xmlData[0].id) {
   console.log('⚠️ No se encontró registro XML para referencias, devolviendo array vacío');
   return [];
 }

 // Ahora buscar las referencias usando el ID de reg_facturas_xml
 const { data, error } = await supabase
   .from('reg_facturas_referencias')
   .select('*')
   .eq('factura_id', xmlData[0].id)
   .order('fecha_referencia', { ascending: true });

 if (error) {
   console.error('❌ Error al obtener referencias:', error);
   return [];
 }

 console.log('✅ Referencias obtenidas:', data?.length || 0, 'registros');
 return data || [];
};
// === DATA STATUS FUNCTIONS ===

// Interface for data status results
export interface DataStatusResult {
  documentType: string;
  totalInSource: number;
  withXmlDetail: number;
  withoutXmlDetail: number;
  percentageWithDetail: number;
}

// Function to get sales data status by document type
export const getSalesDataStatus = async (): Promise<DataStatusResult[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📊 Obteniendo estado de datos de ventas...');

  // Get all sales documents grouped by type, excluding nro = 0 (VAT repetitions)
  const { data: salesData, error: salesError } = await supabase
    .from('reg_ventas')
    .select('id, tipo_doc, nro')
    .not('tipo_doc', 'is', null)
    .neq('nro', 0);

  if (salesError) {
    console.error('❌ Error al obtener datos de ventas:', salesError);
    throw salesError;
  }

  console.log('📊 Total de registros en reg_ventas:', salesData?.length || 0);

  // Group sales by document type
  const salesByType = new Map<string, number>();
  const salesIdsByType = new Map<string, number[]>();

  salesData?.forEach(sale => {
    const type = sale.tipo_doc || 'Sin tipo';
    salesByType.set(type, (salesByType.get(type) || 0) + 1);
    if (!salesIdsByType.has(type)) {
      salesIdsByType.set(type, []);
    }
    salesIdsByType.get(type)!.push(sale.id);
  });

  console.log('📊 Tipos de documentos de venta encontrados:', Array.from(salesByType.keys()));

  // Get XML data for sales
  const { data: xmlData, error: xmlError } = await supabase
    .from('reg_facturas_xml')
    .select('reg_ventas_id, tipo_dte')
    .not('reg_ventas_id', 'is', null);

  if (xmlError) {
    console.error('❌ Error al obtener datos XML de ventas:', xmlError);
    throw xmlError;
  }

  console.log('📊 Total de registros XML con reg_ventas_id:', xmlData?.length || 0);

  // Group XML data by document type and count
  const xmlByType = new Map<string, Set<number>>();
  xmlData?.forEach(xml => {
    const type = xml.tipo_dte || 'Sin tipo';
    if (!xmlByType.has(type)) {
      xmlByType.set(type, new Set());
    }
    xmlByType.get(type)!.add(xml.reg_ventas_id!);
  });

  // Calculate results
  const results: DataStatusResult[] = [];

  for (const [documentType, totalInSource] of salesByType.entries()) {
    const xmlIds = xmlByType.get(documentType) || new Set();
    const withXmlDetail = xmlIds.size;
    const withoutXmlDetail = totalInSource - withXmlDetail;
    const percentageWithDetail = totalInSource > 0 ? (withXmlDetail / totalInSource) * 100 : 0;

    results.push({
      documentType,
      totalInSource,
      withXmlDetail,
      withoutXmlDetail,
      percentageWithDetail
    });
  }

  // Sort by total documents descending
  results.sort((a, b) => b.totalInSource - a.totalInSource);

  console.log('✅ Estado de datos de ventas obtenido:', results.length, 'tipos de documento');
  return results;
};

// Function to get purchases data status by document type
export const getPurchasesDataStatus = async (): Promise<DataStatusResult[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📊 Obteniendo estado de datos de compras...');

  // Get all purchase documents grouped by type, excluding nro = 0 (VAT repetitions)
  const { data: purchasesData, error: purchasesError } = await supabase
    .from('reg_compras')
    .select('id, tipo_doc, nro')
    .not('tipo_doc', 'is', null)
    .neq('nro', 0);

  if (purchasesError) {
    console.error('❌ Error al obtener datos de compras:', purchasesError);
    throw purchasesError;
  }

  console.log('📊 Total de registros en reg_compras:', purchasesData?.length || 0);

  // Group purchases by document type (note: tipo_doc is number in reg_compras)
  const purchasesByType = new Map<string, number>();
  const purchasesIdsByType = new Map<string, number[]>();

  purchasesData?.forEach(purchase => {
    const type = purchase.tipo_doc?.toString() || 'Sin tipo';
    purchasesByType.set(type, (purchasesByType.get(type) || 0) + 1);
    if (!purchasesIdsByType.has(type)) {
      purchasesIdsByType.set(type, []);
    }
    purchasesIdsByType.get(type)!.push(purchase.id);
  });

  console.log('📊 Tipos de documentos de compra encontrados:', Array.from(purchasesByType.keys()));

  // Get XML data for purchases
  const { data: xmlData, error: xmlError } = await supabase
    .from('reg_facturas_xml')
    .select('reg_compras_id, tipo_dte')
    .not('reg_compras_id', 'is', null);

  if (xmlError) {
    console.error('❌ Error al obtener datos XML de compras:', xmlError);
    throw xmlError;
  }

  console.log('📊 Total de registros XML con reg_compras_id:', xmlData?.length || 0);

  // Group XML data by document type and count
  const xmlByType = new Map<string, Set<number>>();
  xmlData?.forEach(xml => {
    const type = xml.tipo_dte || 'Sin tipo';
    if (!xmlByType.has(type)) {
      xmlByType.set(type, new Set());
    }
    xmlByType.get(type)!.add(xml.reg_compras_id!);
  });

  // Calculate results
  const results: DataStatusResult[] = [];

  for (const [documentType, totalInSource] of purchasesByType.entries()) {
    const xmlIds = xmlByType.get(documentType) || new Set();
    const withXmlDetail = xmlIds.size;
    const withoutXmlDetail = totalInSource - withXmlDetail;
    const percentageWithDetail = totalInSource > 0 ? (withXmlDetail / totalInSource) * 100 : 0;

    results.push({
      documentType,
      totalInSource,
      withXmlDetail,
      withoutXmlDetail,
      percentageWithDetail
    });
  }

  // Sort by total documents descending
  results.sort((a, b) => b.totalInSource - a.totalInSource);

  console.log('✅ Estado de datos de compras obtenido:', results.length, 'tipos de documento');
  return results;
};

// Function to get combined data status for both sales and purchases
export const getCombinedDataStatus = async () => {
  const [salesStatus, purchasesStatus] = await Promise.all([
    getSalesDataStatus(),
    getPurchasesDataStatus()
  ]);

  return {
    sales: salesStatus,
    purchases: purchasesStatus,
    summary: {
      sales: {
        totalDocuments: salesStatus.reduce((sum, item) => sum + item.totalInSource, 0),
        totalWithDetail: salesStatus.reduce((sum, item) => sum + item.withXmlDetail, 0),
        totalWithoutDetail: salesStatus.reduce((sum, item) => sum + item.withoutXmlDetail, 0),
        overallPercentage: salesStatus.length > 0 ?
          (salesStatus.reduce((sum, item) => sum + item.withXmlDetail, 0) /
           salesStatus.reduce((sum, item) => sum + item.totalInSource, 0)) * 100 : 0
      },
      purchases: {
        totalDocuments: purchasesStatus.reduce((sum, item) => sum + item.totalInSource, 0),
        totalWithDetail: purchasesStatus.reduce((sum, item) => sum + item.withXmlDetail, 0),
        totalWithoutDetail: purchasesStatus.reduce((sum, item) => sum + item.withoutXmlDetail, 0),
        overallPercentage: purchasesStatus.length > 0 ?
          (purchasesStatus.reduce((sum, item) => sum + item.withXmlDetail, 0) /
           purchasesStatus.reduce((sum, item) => sum + item.totalInSource, 0)) * 100 : 0
      }
    }
  };
};

