import { RegFacturaDetalle } from '../types/database';

/**
 * Clasifica una transacción como venta o compra basándose en varios criterios
 */
export const classifyTransaction = (record: RegFacturaDetalle): 'VENTA' | 'COMPRA' | 'UNKNOWN' => {
  // Criterio 1: Basado en el tipo de DTE
  if (record.tipo_dte) {
    const tipoDte = record.tipo_dte.toString();
    
    // DTEs típicos de ventas (documentos que emitimos)
    const ventaDtes = ['33', '34', '39', '41', '46', '56', '61'];
    // DTEs típicos de compras (documentos que recibimos)
    const compraDtes = ['30', '32', '35', '38', '45', '48', '53'];
    
    if (ventaDtes.includes(tipoDte)) return 'VENTA';
    if (compraDtes.includes(tipoDte)) return 'COMPRA';
  }

  // Criterio 2: Basado en campos específicos de la tabla RegFacturaXml
  // Si tiene reg_ventas_id, es una venta
  // Si tiene reg_compras_id, es una compra
  // (Estos campos están en RegFacturaXml, necesitaríamos hacer un JOIN)

  // Criterio 3: Análisis del RUT emisor vs receptor
  // Si somos el emisor, es una venta
  // Si somos el receptor, es una compra
  // Necesitaríamos conocer nuestro RUT para esto

  // Por ahora, retornamos UNKNOWN si no podemos clasificar
  return 'UNKNOWN';
};

/**
 * Determina si un registro debe mostrarse en el módulo de ventas
 */
export const isVenta = (record: RegFacturaDetalle): boolean => {
  const classification = classifyTransaction(record);
  return classification === 'VENTA';
};

/**
 * Determina si un registro debe mostrarse en el módulo de compras
 */
export const isCompra = (record: RegFacturaDetalle): boolean => {
  const classification = classifyTransaction(record);
  return classification === 'COMPRA';
};

/**
 * Obtiene información sobre las tablas disponibles y su propósito
 */
export const getTableInfo = () => {
  return {
    reg_facturas_detalle: {
      description: 'Detalle de líneas de facturas (tanto ventas como compras)',
      usage: 'Contiene el detalle de productos/servicios de cada factura',
      fields: {
        rut_emisor: 'RUT de quien emite la factura',
        razon_social_emisor: 'Nombre de quien emite la factura',
        rut_receptor: 'RUT de quien recibe la factura',
        razon_social_receptor: 'Nombre de quien recibe la factura',
        tipo_dte: 'Tipo de documento tributario electrónico'
      }
    },
    reg_facturas_xml: {
      description: 'Información general de facturas con referencias a reg_compras y reg_ventas',
      usage: 'Tabla principal que vincula con las tablas específicas de compras y ventas',
      fields: {
        reg_compras_id: 'ID en la tabla reg_compras (si es una compra)',
        reg_ventas_id: 'ID en la tabla reg_ventas (si es una venta)',
        tpo_tran_compra: 'Tipo de transacción de compra',
        tpo_tran_venta: 'Tipo de transacción de venta'
      }
    },
    reg_compras: {
      description: 'Registro específico de compras (libro de compras)',
      usage: 'Datos específicos para el libro de compras del SII',
      fields: {
        rut_proveedor: 'RUT del proveedor',
        razon_social: 'Razón social del proveedor'
      }
    },
    reg_ventas: {
      description: 'Registro específico de ventas (libro de ventas)',
      usage: 'Datos específicos para el libro de ventas del SII',
      fields: {
        rut_cliente: 'RUT del cliente',
        razon_social: 'Razón social del cliente'
      }
    }
  };
};