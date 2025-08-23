// Tipos de documentos tributarios y su tratamiento
export const DOCUMENT_TYPES = {
  // Documentos que suman (ingresos/gastos normales)
  POSITIVE: [
    '33', // Factura electrónica
    '34', // Factura no afecta o exenta electrónica
    '39', // Boleta electrónica
    '41', // Boleta no afecta o exenta electrónica
    '46', // Factura de compra electrónica
    '52', // Guía de despacho electrónica
    '56', // Nota de débito electrónica
    '110', // Factura de exportación electrónica
    '111', // Nota de débito de exportación electrónica
    '112', // Nota de crédito de exportación electrónica
  ],
  
  // Documentos que restan (notas de crédito, devoluciones)
  NEGATIVE: [
    '61', // Nota de crédito electrónica
  ],
  
  // Documentos informativos (no afectan totales)
  INFORMATIVE: [
    '43', // Liquidación factura electrónica
    '50', // Guía de despacho electrónica
    '55', // Factura de compra electrónica
  ]
};

// Función para determinar si un documento suma o resta
export const getDocumentMultiplier = (tipoDoc: string | number): number => {
  const tipoStr = String(tipoDoc);
  
  if (DOCUMENT_TYPES.NEGATIVE.includes(tipoStr)) {
    return -1; // Resta (nota de crédito)
  }
  
  if (DOCUMENT_TYPES.POSITIVE.includes(tipoStr)) {
    return 1; // Suma (documento normal)
  }
  
  // Por defecto, documentos desconocidos suman
  return 1;
};

// Función para obtener el nombre del tipo de documento
export const getDocumentTypeName = (tipoDoc: string | number): string => {
  const tipoStr = String(tipoDoc);
  
  const documentNames: { [key: string]: string } = {
    '33': 'Factura Electrónica',
    '34': 'Factura Exenta Electrónica',
    '39': 'Boleta Electrónica',
    '41': 'Boleta Exenta Electrónica',
    '43': 'Liquidación Factura',
    '46': 'Factura Compra Electrónica',
    '50': 'Guía de Despacho',
    '52': 'Guía de Despacho Electrónica',
    '55': 'Factura Compra Electrónica',
    '56': 'Nota de Débito Electrónica',
    '61': 'Nota de Crédito Electrónica',
    '110': 'Factura Exportación',
    '111': 'Nota Débito Exportación',
    '112': 'Nota Crédito Exportación',
  };
  
  return documentNames[tipoStr] || `Tipo ${tipoStr}`;
};

// Función para obtener el color del badge según el tipo de documento
export const getDocumentTypeColor = (tipoDoc: string | number): string => {
  const tipoStr = String(tipoDoc);
  
  if (DOCUMENT_TYPES.NEGATIVE.includes(tipoStr)) {
    return 'bg-red-100 text-red-800'; // Rojo para notas de crédito
  }
  
  if (tipoStr === '56') {
    return 'bg-orange-100 text-orange-800'; // Naranja para notas de débito
  }
  
  if (['33', '34'].includes(tipoStr)) {
    return 'bg-blue-100 text-blue-800'; // Azul para facturas
  }
  
  if (['39', '41'].includes(tipoStr)) {
    return 'bg-green-100 text-green-800'; // Verde para boletas
  }
  
  return 'bg-gray-100 text-gray-800'; // Gris por defecto
};