export interface RegFacturaXml {
  id: number;
  folio?: string;
  rut_emisor?: string;
  razon_social_emisor?: string;
  giro_emisor?: string;
  correo_emisor?: string;
  acteco?: string;
  cdg_sii_sucursal?: string;
  dir_origen?: string;
  comuna_origen?: string;
  ciudad_origen?: string;
  rut_receptor?: string;
  razon_social_receptor?: string;
  giro_receptor?: string;
  dir_receptor?: string;
  comuna_receptor?: string;
  ciudad_receptor?: string;
  fecha_emision?: string;
  fecha_recepcion?: string;
  tpo_tran_compra?: string;
  tpo_tran_venta?: string;
  forma_pago?: string;
  monto_neto?: number;
  monto_iva?: number;
  monto_total?: number;
  tipo_dte?: string;
  xml_content?: string;
  xml_file_id?: string;
  reg_compras_id?: number;
  reg_ventas_id?: number;
  created_at?: string;
}

export interface RegFacturaDetalle {
  id: number;
  factura_id?: number;
  folio?: string;
  rut_emisor?: string;
  razon_social_emisor?: string;
  rut_receptor?: string;
  razon_social_receptor?: string;
  fecha_emision?: string;
  fecha_recepcion?: string;
  tipo_dte?: string;
  xml_file_id?: string;
  numero_linea?: number;
  descripcion_item?: string;
  cantidad?: number;
  precio_unitario?: number;
  monto_item?: number;
  unidad_medida?: string;
  created_at?: string;
}

export interface RegCompra {
  id: number;
  nro?: number;
  tipo_doc?: number;
  tipo_compra?: string;
  rut_proveedor?: string;
  razon_social?: string;
  folio?: string;
  fecha_docto?: string;
  fecha_recepcion?: string;
  fecha_acuse?: string;
  monto_exento?: number;
  monto_neto?: number;
  monto_iva_recuperable?: number;
  monto_iva_no_recuperable?: number;
  codigo_iva_no_rec?: string;
  monto_total?: number;
  monto_neto_activo_fijo?: number;
  iva_activo_fijo?: number;
  iva_uso_comun?: number;
  impto_sin_derecho_credito?: number;
  iva_no_retenido?: number;
  tabacos_puros?: number;
  tabacos_cigarrillos?: number;
  tabacos_elaborados?: number;
  nce_nde_sobre_fact_compra?: number;
  codigo_otro_impuesto?: string;
  valor_otro_impuesto?: number;
  tasa_otro_impuesto?: number;
  created_at?: string;
}

export interface RegVenta {
  id: number;
  nro?: number;
  tipo_doc?: string;
  tipo_venta?: string;
  rut_cliente?: string;
  razon_social?: string;
  folio?: string;
  fecha_docto?: string;
  fecha_recepcion?: string;
  fecha_acuse_recibo?: string;
  fecha_reclamo?: string;
  monto_exento?: number;
  monto_neto?: number;
  monto_iva?: number;
  monto_total?: number;
  iva_retenido_total?: number;
  iva_retenido_parcial?: number;
  iva_no_retenido?: number;
  iva_propio?: number;
  iva_terceros?: number;
  rut_emisor_liquid_factura?: string;
  neto_comision_liquid_factura?: number;
  exento_comision_liquid_factura?: number;
  iva_comision_liquid_factura?: number;
  iva_fuera_plazo?: number;
  tipo_docto_referencia?: string;
  folio_docto_referencia?: number;
  num_ident_receptor_extranjero?: string;
  nacionalidad_receptor_extranjero?: string;
  credito_empresa_constructora?: number;
  impto_zona_franca?: number;
  garantia_dep_envases?: number;
  indicador_venta_sin_costo?: number;
  indicador_servicio_periodico?: number;
  monto_no_facturable?: number;
  total_monto_periodo?: number;
  venta_pasajes_transporte_nacional?: number;
  venta_pasajes_transporte_internacional?: number;
  numero_interno?: string;
  codigo_sucursal?: string;
  nce_nde_sobre_fact_compra?: string;
  codigo_otro_imp?: string;
  valor_otro_imp?: number;
  tasa_otro_imp?: number;
  is_factored?: boolean;
  factoring_date?: string;
  created_at?: string;
}

export interface FlujoCajaItem {
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  descripcion: string;
  monto: number;
  acumulado: number;
  documento: string;
  isFullyPaid?: boolean; // Indica si esta línea representa el pago completo de una factura
  invoiceId?: number; // ID de la factura relacionada
  invoiceType?: 'venta' | 'compra'; // Tipo de factura
}

export interface RegPago {
  id: number;
  reg_ventas_id?: number; // ID de la factura de venta
  reg_compras_id?: number; // ID de la factura de compra (para pagos a proveedores)
  fecha_pago: string; // Fecha real del pago
  monto_pago: number; // Monto pagado en este pago específico
  forma_pago?: string; // Forma de pago (efectivo, transferencia, cheque, etc.)
  numero_comprobante?: string; // Número de comprobante/referencia del pago
  banco?: string; // Banco si aplica
  created_at?: string;
  updated_at?: string;
}

export interface ManualEntry {
   id: number;
   entry_type: 'expense' | 'income';
   description: string;
   amount: number;
   entry_date: string;
   created_at?: string;
   updated_at?: string;
}

export interface Producto {
   id: number;
   nombre_producto: string;
   descripcion?: string;
   codigo_interno?: string;
   categoria?: string;
   precio_sugerido?: number;
   activo: boolean;
   created_at?: string;
   updated_at?: string;
}

export interface ProductoDescripcionMap {
   id: number;
   producto_id: number;
   descripcion_original: string;
   created_at?: string;
}

export interface DescripcionPropuesta {
    descripcion: string;
    frecuencia: number;
    total_unidades: number;
    total_ingresos: number;
}

export interface RegFacturaPago {
    id: number;
    factura_id?: number;
    fecha_pago: string;
    monto_pago: number;
    forma_pago?: string;
    numero_comprobante?: string;
    banco?: string;
    created_at?: string;
    updated_at?: string;
}

export interface RegFacturaReferencia {
    id: number;
    factura_id?: number;
    tipo_referencia?: string;
    folio_referencia?: string;
    fecha_referencia?: string;
    descripcion_referencia?: string;
    created_at?: string;
    updated_at?: string;
}