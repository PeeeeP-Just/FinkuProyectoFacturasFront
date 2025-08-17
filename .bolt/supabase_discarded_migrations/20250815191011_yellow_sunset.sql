/*
  # Datos de muestra para pruebas

  1. Datos de muestra
    - Clientes, proveedores, productos
    - Ventas y compras con sus detalles
    - Diferentes tipos de pago y fechas
*/

-- Insertar clientes
INSERT INTO clientes (codigo, nombre, email, telefono, direccion) VALUES
('CLI001', 'Empresa ABC S.A.', 'contacto@abc.com', '+57 300 1234567', 'Carrera 10 #20-30, Bogotá'),
('CLI002', 'Comercial XYZ Ltda.', 'ventas@xyz.com', '+57 301 7654321', 'Calle 50 #15-25, Medellín'),
('CLI003', 'Distribuidora 123', 'info@dist123.com', '+57 302 9876543', 'Avenida 6 #12-45, Cali');

-- Insertar proveedores
INSERT INTO proveedores (codigo, nombre, email, telefono, direccion) VALUES
('PROV001', 'Proveedor Global S.A.S.', 'compras@provglobal.com', '+57 310 1111111', 'Zona Industrial, Bogotá'),
('PROV002', 'Suministros Andinos', 'pedidos@andinos.com', '+57 311 2222222', 'Km 5 Vía Medellín'),
('PROV003', 'Importadora del Sur', 'ventas@impsur.com', '+57 312 3333333', 'Puerto de Buenaventura');

-- Insertar productos
INSERT INTO productos (codigo, nombre, descripcion, precio_venta, precio_compra) VALUES
('PROD001', 'Laptop Dell Inspiron 15', 'Laptop para oficina 8GB RAM 256GB SSD', 2500000, 2000000),
('PROD002', 'Mouse Inalámbrico', 'Mouse óptico inalámbrico USB', 45000, 30000),
('PROD003', 'Teclado Mecánico', 'Teclado mecánico retroiluminado', 180000, 120000),
('PROD004', 'Monitor 24 pulgadas', 'Monitor LED Full HD 24 pulgadas', 650000, 450000),
('PROD005', 'Cable HDMI 2m', 'Cable HDMI 4K ultra HD 2 metros', 25000, 15000);

-- Insertar ventas
INSERT INTO reg_ventas (numero_factura, cliente_id, fecha_factura, fecha_vencimiento, tipo_pago, subtotal, iva, total, estado) VALUES
('VT-2024-001', (SELECT id FROM clientes WHERE codigo = 'CLI001'), '2024-01-15', '2024-02-15', 'CREDITO', 2500000, 475000, 2975000, 'PAGADO'),
('VT-2024-002', (SELECT id FROM clientes WHERE codigo = 'CLI002'), '2024-01-20', '2024-01-20', 'DEBITO', 225000, 42750, 267750, 'PAGADO'),
('VT-2024-003', (SELECT id FROM clientes WHERE codigo = 'CLI003'), '2024-02-01', '2024-03-01', 'CREDITO', 650000, 123500, 773500, 'PENDIENTE'),
('VT-2024-004', (SELECT id FROM clientes WHERE codigo = 'CLI001'), '2024-02-10', '2024-02-10', 'DEBITO', 70000, 13300, 83300, 'PAGADO'),
('VT-2024-005', (SELECT id FROM clientes WHERE codigo = 'CLI002'), '2024-02-15', '2024-03-15', 'CREDITO', 180000, 34200, 214200, 'PENDIENTE');

-- Insertar compras
INSERT INTO reg_compras (numero_factura, proveedor_id, fecha_factura, fecha_vencimiento, tipo_pago, subtotal, iva, total, estado) VALUES
('CP-2024-001', (SELECT id FROM proveedores WHERE codigo = 'PROV001'), '2024-01-10', '2024-02-10', 'CREDITO', 4000000, 760000, 4760000, 'PAGADO'),
('CP-2024-002', (SELECT id FROM proveedores WHERE codigo = 'PROV002'), '2024-01-18', '2024-01-18', 'DEBITO', 150000, 28500, 178500, 'PAGADO'),
('CP-2024-003', (SELECT id FROM proveedores WHERE codigo = 'PROV003'), '2024-02-05', '2024-03-05', 'CREDITO', 450000, 85500, 535500, 'PENDIENTE');

-- Insertar detalles de ventas
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, descuento, subtotal) VALUES
((SELECT id FROM reg_ventas WHERE numero_factura = 'VT-2024-001'), (SELECT id FROM productos WHERE codigo = 'PROD001'), 1, 2500000, 0, 2500000),
((SELECT id FROM reg_ventas WHERE numero_factura = 'VT-2024-002'), (SELECT id FROM productos WHERE codigo = 'PROD002'), 3, 45000, 0, 135000),
((SELECT id FROM reg_ventas WHERE numero_factura = 'VT-2024-002'), (SELECT id FROM productos WHERE codigo = 'PROD003'), 0.5, 180000, 0, 90000),
((SELECT id FROM reg_ventas WHERE numero_factura = 'VT-2024-003'), (SELECT id FROM productos WHERE codigo = 'PROD004'), 1, 650000, 0, 650000),
((SELECT id FROM reg_ventas WHERE numero_factura = 'VT-2024-004'), (SELECT id FROM productos WHERE codigo = 'PROD002'), 1, 45000, 0, 45000),
((SELECT id FROM reg_ventas WHERE numero_factura = 'VT-2024-004'), (SELECT id FROM productos WHERE codigo = 'PROD005'), 1, 25000, 0, 25000),
((SELECT id FROM reg_ventas WHERE numero_factura = 'VT-2024-005'), (SELECT id FROM productos WHERE codigo = 'PROD003'), 1, 180000, 0, 180000);

-- Insertar detalles de compras
INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario, descuento, subtotal) VALUES
((SELECT id FROM reg_compras WHERE numero_factura = 'CP-2024-001'), (SELECT id FROM productos WHERE codigo = 'PROD001'), 2, 2000000, 0, 4000000),
((SELECT id FROM reg_compras WHERE numero_factura = 'CP-2024-002'), (SELECT id FROM productos WHERE codigo = 'PROD002'), 5, 30000, 0, 150000),
((SELECT id FROM reg_compras WHERE numero_factura = 'CP-2024-003'), (SELECT id FROM productos WHERE codigo = 'PROD004'), 1, 450000, 0, 450000);