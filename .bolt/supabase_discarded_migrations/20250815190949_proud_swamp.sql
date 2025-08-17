/*
  # Esquema de gestión financiera

  1. Nuevas Tablas
    - `reg_ventas` - Registro principal de facturas de venta
    - `reg_compras` - Registro principal de facturas de compra  
    - `detalle_ventas` - Líneas de detalle de cada venta
    - `detalle_compras` - Líneas de detalle de cada compra
    - `productos` - Catálogo de productos/servicios
    - `clientes` - Registro de clientes
    - `proveedores` - Registro de proveedores

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para usuarios autenticados
*/

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(20) UNIQUE NOT NULL,
  nombre varchar(200) NOT NULL,
  email varchar(100),
  telefono varchar(20),
  direccion text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de proveedores  
CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(20) UNIQUE NOT NULL,
  nombre varchar(200) NOT NULL,
  email varchar(100),
  telefono varchar(20),
  direccion text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(50) UNIQUE NOT NULL,
  nombre varchar(200) NOT NULL,
  descripcion text,
  precio_venta decimal(10,2) DEFAULT 0,
  precio_compra decimal(10,2) DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Registro de ventas (facturas principales)
CREATE TABLE IF NOT EXISTS reg_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_factura varchar(50) UNIQUE NOT NULL,
  cliente_id uuid REFERENCES clientes(id),
  fecha_factura date NOT NULL,
  fecha_vencimiento date,
  tipo_pago varchar(20) NOT NULL CHECK (tipo_pago IN ('CREDITO', 'DEBITO')),
  subtotal decimal(12,2) NOT NULL DEFAULT 0,
  iva decimal(12,2) NOT NULL DEFAULT 0,
  total decimal(12,2) NOT NULL DEFAULT 0,
  estado varchar(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO', 'VENCIDO')),
  observaciones text,
  created_at timestamptz DEFAULT now()
);

-- Registro de compras (facturas principales)
CREATE TABLE IF NOT EXISTS reg_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_factura varchar(50) UNIQUE NOT NULL,
  proveedor_id uuid REFERENCES proveedores(id),
  fecha_factura date NOT NULL,
  fecha_vencimiento date,
  tipo_pago varchar(20) NOT NULL CHECK (tipo_pago IN ('CREDITO', 'DEBITO')),
  subtotal decimal(12,2) NOT NULL DEFAULT 0,
  iva decimal(12,2) NOT NULL DEFAULT 0,
  total decimal(12,2) NOT NULL DEFAULT 0,
  estado varchar(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO', 'VENCIDO')),
  observaciones text,
  created_at timestamptz DEFAULT now()
);

-- Detalle de ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid REFERENCES reg_ventas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  cantidad decimal(10,3) NOT NULL,
  precio_unitario decimal(10,2) NOT NULL,
  descuento decimal(5,2) DEFAULT 0,
  subtotal decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Detalle de compras
CREATE TABLE IF NOT EXISTS detalle_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid REFERENCES reg_compras(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  cantidad decimal(10,3) NOT NULL,
  precio_unitario decimal(10,2) NOT NULL,
  descuento decimal(5,2) DEFAULT 0,
  subtotal decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reg_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reg_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_compras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuarios autenticados
CREATE POLICY "Usuarios pueden ver clientes" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden insertar clientes" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar clientes" ON clientes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios pueden ver proveedores" ON proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden insertar proveedores" ON proveedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar proveedores" ON proveedores FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios pueden ver productos" ON productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden insertar productos" ON productos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar productos" ON productos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios pueden ver ventas" ON reg_ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden insertar ventas" ON reg_ventas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar ventas" ON reg_ventas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios pueden ver compras" ON reg_compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden insertar compras" ON reg_compras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar compras" ON reg_compras FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios pueden ver detalle ventas" ON detalle_ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden insertar detalle ventas" ON detalle_ventas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar detalle ventas" ON detalle_ventas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios pueden ver detalle compras" ON detalle_compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden insertar detalle compras" ON detalle_compras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar detalle compras" ON detalle_compras FOR UPDATE TO authenticated USING (true);

-- Índices para rendimiento
CREATE INDEX idx_reg_ventas_fecha ON reg_ventas(fecha_factura);
CREATE INDEX idx_reg_ventas_cliente ON reg_ventas(cliente_id);
CREATE INDEX idx_reg_compras_fecha ON reg_compras(fecha_factura);
CREATE INDEX idx_reg_compras_proveedor ON reg_compras(proveedor_id);
CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_compras_compra ON detalle_compras(compra_id);