import React, { useState, useEffect } from 'react';
import { ManualEntry } from '../types/database';
import { getManualEntries, createManualEntry, updateManualEntry, deleteManualEntry, testConnection } from '../lib/database';
import { MonthSelector, getMonthDateRange } from './MonthSelector';
import { NoConnection } from './NoConnection';
import { SetupGuide } from './SetupGuide';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Save,
  X,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ManualEntryForm {
  entry_type: 'expense' | 'income';
  description: string;
  amount: string;
  entry_date: string;
}

export const ManualEntriesModule: React.FC = () => {
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEntryType, setSelectedEntryType] = useState<'expense' | 'income' | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);
  const [formData, setFormData] = useState<ManualEntryForm>({
    entry_type: 'expense',
    description: '',
    amount: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const dateRange = getMonthDateRange(selectedMonth, selectedYear);
      const data = await getManualEntries({
        searchTerm: searchTerm || undefined,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
        entryType: selectedEntryType || undefined
      });
      setEntries(data);
    } catch (error) {
      console.error('❌ Error al obtener entradas manuales:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      const isConnected = await testConnection();
      setConnected(isConnected);

      if (isConnected) {
        await fetchEntries();
      } else {
        setLoading(false);
      }
    };

    initializeData();
  }, [searchTerm, selectedMonth, selectedYear, selectedEntryType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim() || !formData.amount || !formData.entry_date) {
      alert('Por favor complete todos los campos');
      return;
    }

    const amount = parseFloat(formData.amount.replace(/[,$]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    try {
      if (editingEntry) {
        await updateManualEntry(editingEntry.id, {
          entry_type: formData.entry_type,
          description: formData.description.trim(),
          amount,
          entry_date: formData.entry_date
        });
      } else {
        await createManualEntry({
          entry_type: formData.entry_type,
          description: formData.description.trim(),
          amount,
          entry_date: formData.entry_date
        });
      }

      // Reset form and refresh data
      setFormData({
        entry_type: 'expense',
        description: '',
        amount: '',
        entry_date: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      setEditingEntry(null);
      await fetchEntries();
    } catch (error) {
      console.error('❌ Error al guardar entrada:', error);
      alert('Error al guardar la entrada. Por favor intente nuevamente.');
    }
  };

  const handleEdit = (entry: ManualEntry) => {
    setEditingEntry(entry);
    setFormData({
      entry_type: entry.entry_type,
      description: entry.description,
      amount: entry.amount.toString(),
      entry_date: entry.entry_date
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta entrada?')) {
      return;
    }

    try {
      await deleteManualEntry(id);
      await fetchEntries();
    } catch (error) {
      console.error('❌ Error al eliminar entrada:', error);
      alert('Error al eliminar la entrada. Por favor intente nuevamente.');
    }
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingEntry(null);
    setFormData({
      entry_type: 'expense',
      description: '',
      amount: '',
      entry_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const totalExpenses = entries
    .filter(entry => entry.entry_type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalIncome = entries
    .filter(entry => entry.entry_type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const netAmount = totalIncome - totalExpenses;

  // If no connection, show setup component
  if (connected === false) {
    return (
      <>
        <NoConnection onShowSetup={() => setShowSetup(true)} />
        {showSetup && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Configuración de Supabase</h2>
                <button
                  onClick={() => setShowSetup(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <SetupGuide />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-slate-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Entradas Manuales</h2>
        </div>

        <p className="text-slate-600 mb-6">
          Gestiona gastos e ingresos que no provienen de facturas electrónicas
        </p>
      </div>

      {/* Compact Filters */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 p-6">
        {!showForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 tracking-tight">
                Buscar Descripción
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 placeholder-slate-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 tracking-tight">
                Tipo
              </label>
              <select
                value={selectedEntryType}
                onChange={(e) => setSelectedEntryType(e.target.value as 'expense' | 'income' | '')}
                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 text-sm"
              >
                <option value="">Todos los tipos</option>
                <option value="expense">Gastos</option>
                <option value="income">Ingresos</option>
              </select>
            </div>

            {/* Add New Entry Button */}
            <div className="flex items-end">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Entrada
              </button>
            </div>
          </div>
        ) : (
          /* New/Edit Entry Form */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                  {editingEntry ? <Edit className="h-4 w-4 text-slate-600" /> : <Plus className="h-4 w-4 text-slate-600" />}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                  {editingEntry ? 'Editar Entrada' : 'Nueva Entrada'}
                </h3>
              </div>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 tracking-tight">
                    Tipo *
                  </label>
                  <select
                    value={formData.entry_type}
                    onChange={(e) => setFormData({...formData, entry_type: e.target.value as 'expense' | 'income'})}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 text-sm"
                    required
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 tracking-tight">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 tracking-tight">
                    Monto *
                  </label>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 placeholder-slate-400 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 tracking-tight">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Ej: Pago de crédito, Sueldo empleado, Venta producto sin factura..."
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 text-slate-900 placeholder-slate-400 text-sm"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingEntry ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Month Selector */}
      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium tracking-wide uppercase mb-2">Total Gastos</p>
              <p className="text-3xl font-bold tracking-tight">${totalExpenses.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium tracking-wide uppercase mb-2">Total Ingresos</p>
              <p className="text-3xl font-bold tracking-tight">${totalIncome.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
          netAmount >= 0 ? 'from-blue-500 via-indigo-600 to-purple-600' : 'from-orange-500 via-amber-600 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium tracking-wide uppercase mb-2 ${netAmount >= 0 ? 'text-blue-100' : 'text-orange-100'}`}>
                Balance Neto
              </p>
              <p className="text-3xl font-bold tracking-tight">${netAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <DollarSign className={`h-6 w-6 text-white`} />
            </div>
          </div>
        </div>
      </div>


      {/* Entries Table */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-8 py-5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-8 py-5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Cargando entradas...</p>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <DollarSign className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No se encontraron entradas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-blue-50/30 transition-all duration-200">
                    <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-600">
                      {format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-8 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                        entry.entry_type === 'income'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.entry_type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-900 font-medium">
                      {entry.description}
                    </td>
                    <td className={`px-8 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                      entry.entry_type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {entry.entry_type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
                    </td>
                    <td className="px-8 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};