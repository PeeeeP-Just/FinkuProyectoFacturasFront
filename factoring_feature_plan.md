# Factoring Feature - Implementation Plan

## 🎯 **Objective**
Add the ability to mark sales invoices as "factored" with a specific factoring date that overrides the original payment date for cash flow calculations.

## 📊 **Database Schema Changes**

### Updated `reg_ventas` table
Add two new columns:
```sql
ALTER TABLE reg_ventas
ADD COLUMN is_factored BOOLEAN DEFAULT FALSE,
ADD COLUMN factoring_date DATE;
```

### TypeScript Interface Updates
```typescript
export interface RegVenta {
  // ... existing fields
  is_factored?: boolean;
  factoring_date?: string;
}
```

## 🏗️ **Architecture Components**

### 1. Database Functions (`src/lib/database.ts`)
- `markInvoiceAsFactored(id, factoringDate)` - Mark invoice as factored
- `unmarkInvoiceAsFactored(id)` - Remove factoring status
- Existing `getVentas()` will return the new fields

### 2. Updated `VentasModule` (`src/components/VentasModule.tsx`)
- Add "Marcar como Factorizada" button to each row
- Modal/popup for entering factoring date
- Visual indicator for factored invoices
- Option to remove factoring status

### 3. Updated `FlujoCajaModule`
- Use `factoring_date` instead of `fecha_recepcion` when `is_factored = true`
- Maintain original payment date for non-factored invoices
- Update cash flow calculations accordingly

## 🔄 **Integration Points**

### Cash Flow Logic Updates
1. When processing sales for cash flow:
   ```typescript
   const cashFlowDate = venta.is_factored && venta.factoring_date
     ? venta.factoring_date
     : venta.fecha_recepcion || venta.fecha_docto;
   ```

2. Use this date for chronological ordering and accumulation calculations

### UI/UX Considerations
- **Visual Indicators**: Different styling for factored invoices
- **Date Display**: Show both original and factoring dates
- **Confirmation**: Ask for confirmation when marking as factored
- **Easy Access**: Quick button access to factoring functionality

## 🎨 **UI Design**

### Factoring Button and Modal
```
Table Row:
┌─────────────────────────────────────────────────────────┐
│ [Folio] [Fecha] [Cliente] [Monto] [Estado] [FACTORING] │
└─────────────────────────────────────────────────────────┘
                    ▲
                    │
            ┌─────────────┐
            │ 📅 Marcar   │
            │ como        │
            │ Factorizada │
            └─────────────┘
```

### Modal Interface
```
┌─────────────────────────────────────┐
│ 📅 Marcar Factura como Factorizada  │
├─────────────────────────────────────┤
│ Factura: FV-001                     │
│ Cliente: Empresa XYZ                │
│ Monto: $1,000,000                   │
├─────────────────────────────────────┤
│ 📅 Fecha de Factoring:              │
│ [date picker]                       │
├─────────────────────────────────────┤
│ [Cancelar] [Confirmar]              │
└─────────────────────────────────────┘
```

## 🧪 **Testing Strategy**

1. **Unit Tests**
   - Database functions work correctly
   - UI components render properly
   - Factoring status updates work

2. **Integration Tests**
   - Factored invoices appear in cash flow with correct dates
   - Original payment dates are preserved
   - Multiple factoring statuses work correctly

3. **User Acceptance**
   - Mark invoice FV-001 as factored for 15/01/2024
   - Verify cash flow shows income on 15/01/2024 instead of original date
   - Remove factoring and verify original date is restored

## 📋 **Implementation Steps**

1. ✅ Create this plan
2. ⏳ Add factoring fields to RegVenta interface
3. ⏳ Create database functions for factoring
4. ⏳ Add factoring UI to VentasModule
5. ⏳ Update cash flow logic
6. ⏳ Test complete functionality

## 🔧 **Technical Considerations**

- **Data Migration**: Existing invoices should have `is_factored = false`
- **Date Validation**: Factoring date should be reasonable (not in future unless expected)
- **Performance**: Add index on `is_factored` if many invoices exist
- **Audit Trail**: Consider logging factoring changes for compliance
- **Error Handling**: Proper error messages for failed operations

## 💡 **Business Logic**

**When to use factoring:**
- When you sell the invoice to a factoring company
- When payment timing changes due to business agreements
- When you need immediate cash flow despite original payment terms

**Cash flow impact:**
- **Before**: Money enters on `fecha_recepcion`
- **After**: Money enters on `factoring_date`
- **Result**: More accurate cash flow forecasting