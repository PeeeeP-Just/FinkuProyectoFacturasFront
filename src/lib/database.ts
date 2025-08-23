import { createClient } from '@supabase/supabase-js';
import { getDocumentMultiplier } from './documentTypes';
import { ManualEntry, RegVenta, RegPago, RegFacturaDetalle } from '../types/database';

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
  return ventas.reduce((total, venta) => {
    const multiplier = getDocumentMultiplier(venta.tipo_doc || '');
    const monto = venta.monto_total || 0;
    return total + (monto * multiplier);
  }, 0);
};

// Función para calcular totales de compras considerando notas de crédito
export const calculateComprasTotal = (compras: any[]): number => {
  return compras.reduce((total, compra) => {
    const multiplier = getDocumentMultiplier(compra.tipo_doc || '');
    const monto = compra.monto_total || 0;
    return total + (monto * multiplier);
  }, 0);
};

// Función para obtener estadísticas de documentos
export const getDocumentStats = (documents: any[], tipoDocField: string = 'tipo_doc') => {
  const stats = {
    total: 0,
    positive: 0,
    negative: 0,
    count: documents.length,
    creditNotes: 0,
    regularDocs: 0
  };

  documents.forEach(doc => {
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
export const getVentasDetalle = async (facturaId: number): Promise<RegFacturaDetalle[]> => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  console.log('📊 Obteniendo detalle de venta para factura ID:', facturaId);

  const { data, error } = await supabase
    .from('reg_facturas_detalle')
    .select('*')
    .eq('factura_id', facturaId)
    .order('numero_linea', { ascending: true });

  if (error) {
    console.error('❌ Error al obtener detalle de venta:', error);
    throw error;
  }

  console.log('✅ Detalle de venta obtenido:', data?.length || 0, 'líneas');
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
 const documentGroups: { [key: string]: { original: RegVenta; creditNotes: RegVenta[] } } = {};
 const processedDocuments = new Set<number>();

 // First pass: identify original invoices and their credit notes
 documents.forEach(doc => {
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

