# Manual Entries Feature - Implementation Plan

## 🎯 **Objective**
Create a new section for manual expenses and income entries that integrate with the cash flow system.

## 📊 **Database Schema Design**

### New Table: `manual_entries`
```sql
CREATE TABLE manual_entries (
  id SERIAL PRIMARY KEY,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('expense', 'income')),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### TypeScript Interface
```typescript
export interface ManualEntry {
  id: number;
  entry_type: 'expense' | 'income';
  description: string;
  amount: number;
  entry_date: string;
  created_at?: string;
  updated_at?: string;
}
```

## 🏗️ **Architecture Components**

### 1. Database Functions (`src/lib/database.ts`)
- `getManualEntries(filters)` - Get manual entries with filtering
- `createManualEntry(entry)` - Create new manual entry
- `updateManualEntry(id, entry)` - Update existing entry
- `deleteManualEntry(id)` - Delete entry

### 2. New Component: `ManualEntriesModule` (`src/components/ManualEntriesModule.tsx`)
- Form for adding new entries (expense/income, description, amount, date)
- Table to display existing entries
- Edit and delete functionality
- Integration with MonthSelector for filtering

### 3. Updated `FlujoCajaModule`
- Include manual entries in cash flow calculation
- Expenses as EGRESO (negative)
- Income as INGRESO (positive)
- Proper chronological ordering

## 🔄 **Integration Points**

### Cash Flow Integration
1. Fetch manual entries alongside sales/purchases
2. Convert to FlujoCajaItem format:
   - Expenses: `tipo: 'EGRESO'`, `monto: -amount`
   - Income: `tipo: 'INGRESO'`, `monto: amount`
3. Merge with existing sales/purchases data
4. Sort by date and calculate accumulated balance

### MonthSelector Integration
- Apply same month filtering to manual entries
- Use existing `getMonthDateRange` helper function

## 🎨 **UI Design**

### ManualEntriesModule Layout
```
┌─────────────────────────────────────────────────┐
│ 🔧 Entradas Manuales                          │
├─────────────────────────────────────────────────┤
│ [MonthSelector Component]                      │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ ➕ Nueva Entrada                            │ │
│ │ ┌─────────┬─────────┬─────────┬─────────┐ │ │
│ │ │ Tipo    │ Descripción │ Monto │ Fecha │ │ │
│ │ └─────────┴─────────┴─────────┴─────────┘ │ │
│ │ [Guardar] [Cancelar]                        │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ 📊 Resumen                                      │
│ ┌─────────────┬─────────────┐                  │
│ │ Gastos: $X  │ Ingresos: $Y │                  │
│ └─────────────┴─────────────┘                  │
├─────────────────────────────────────────────────┤
│ 📋 Lista de Entradas                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Table with edit/delete actions]             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 🧪 **Testing Strategy**

1. **Unit Tests**
   - Database functions work correctly
   - Component renders without errors
   - Form validation works

2. **Integration Tests**
   - Manual entries appear in cash flow
   - Month filtering works correctly
   - CRUD operations function properly

3. **User Acceptance**
   - Add expense entry (e.g., "Pago de crédito", $50,000)
   - Add income entry (e.g., "Venta producto sin factura", $25,000)
   - Verify entries appear in cash flow with correct signs

## 📋 **Implementation Steps**

1. ✅ Analyze current database structure
2. ⏳ Design database schema (create this plan)
3. ⏳ Add TypeScript interface to database.ts
4. ⏳ Create database functions in database.ts
5. ⏳ Create ManualEntriesModule component
6. ⏳ Update FlujoCajaModule integration
7. ⏳ Add MonthSelector integration
8. ⏳ Test complete functionality

## 🔧 **Technical Considerations**

- **Data Validation**: Ensure amounts are positive, dates are valid
- **Error Handling**: Proper error messages for failed operations
- **Loading States**: Show loading indicators during operations
- **Real-time Updates**: Refresh data after CRUD operations
- **Date Formatting**: Use consistent date format (YYYY-MM-DD)
- **Amount Formatting**: Display with proper currency formatting