-- Script para crear tabla de productos
-- Ejecutar en Supabase SQL Editor

-- Crear tabla de productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    codigo_interno VARCHAR(100),
    categoria VARCHAR(100),
    precio_sugerido DECIMAL(10,2),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor performance
CREATE INDEX idx_productos_nombre ON productos USING gin(to_tsvector('spanish', nombre_producto));
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_categoria ON productos(categoria);

-- Crear tabla de mapeo entre productos y descripciones de facturas
CREATE TABLE producto_descripcion_map (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    descripcion_original TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(producto_id, descripcion_original)
);

-- Crear índice para búsquedas de descripciones
CREATE INDEX idx_producto_descripcion_map_descripcion ON producto_descripcion_map
USING gin(to_tsvector('spanish', descripcion_original));

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos productos de ejemplo (opcional)
INSERT INTO productos (nombre_producto, descripcion, categoria, precio_sugerido) VALUES
('Producto Genérico', 'Producto sin categorización específica', 'General', 0.00);

-- Comentarios de la tabla
COMMENT ON TABLE productos IS 'Catálogo de productos de la empresa';
COMMENT ON TABLE producto_descripcion_map IS 'Mapeo entre productos y descripciones originales de facturas';
COMMENT ON COLUMN productos.nombre_producto IS 'Nombre principal del producto (único)';
COMMENT ON COLUMN productos.codigo_interno IS 'Código interno para identificación';
COMMENT ON COLUMN productos.categoria IS 'Categoría del producto';
COMMENT ON COLUMN productos.precio_sugerido IS 'Precio sugerido de venta';
COMMENT ON COLUMN productos.activo IS 'Indica si el producto está activo para ventas';
COMMENT ON COLUMN producto_descripcion_map.descripcion_original IS 'Descripción original de la línea de factura';
