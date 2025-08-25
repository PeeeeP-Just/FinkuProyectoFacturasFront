import React, { useState } from 'react';
import {
  BarChart3,
  ShoppingBag,
  Truck,
  TrendingUp,
  Menu,
  X,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Package,
  Settings,
  Database
} from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<string>('ventas');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const modules = [
    { id: 'ventas', name: 'Detalle Ventas', icon: ShoppingBag },
    { id: 'compras', name: 'Detalle Compras', icon: Truck },
    { id: 'productos', name: 'Análisis Productos', icon: Package },
    { id: 'gestion-productos', name: 'Gestión Productos', icon: Settings },
    { id: 'flujo-caja', name: 'Flujo de Caja', icon: TrendingUp },
    { id: 'manual-entries', name: 'Entradas Manuales', icon: DollarSign },
    { id: 'data-status', name: 'Estado de Datos', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
             onClick={() => setSidebarOpen(false)} />
        
        <div className={`fixed inset-y-0 left-0 flex w-72 transform transition-all duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex min-h-0 flex-1 flex-col bg-white/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/50">
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-xl font-semibold text-slate-900 tracking-tight">FinanceApp</h1>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <nav className="mt-12 space-y-3">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.id}
                      onClick={() => {
                        setActiveModule(module.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-4 px-4 py-3.5 text-left rounded-xl transition-all duration-200 group ${
                        activeModule === module.id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-100'
                          : 'text-slate-700 hover:bg-slate-50 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-200 ${
                        activeModule === module.id
                          ? 'bg-blue-100'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          activeModule === module.id ? 'text-blue-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <span className="font-medium tracking-tight">{module.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
      }`}>
        <div className="flex-1 flex flex-col min-h-0 bg-white/95 backdrop-blur-xl shadow-xl border-r border-slate-200/50">
          <div className="flex-1 flex flex-col pt-8 pb-6 overflow-y-auto">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-4' : 'space-x-4 px-8'} mb-12`}>
              <div className={`bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                sidebarCollapsed ? 'w-12 h-12' : 'w-12 h-12'
              }`}>
                <BarChart3 className={`${sidebarCollapsed ? 'h-6 w-6' : 'h-6 w-6'} text-white`} />
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">FinanceApp</h1>
              )}
            </div>
            <nav className={`${sidebarCollapsed ? 'px-3' : 'px-6'} space-y-3`}>
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-4'} px-4 py-4 text-left rounded-xl transition-all duration-200 group ${
                      activeModule === module.id
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-md border border-blue-100 scale-[1.02]'
                        : 'text-slate-700 hover:bg-slate-50 hover:shadow-sm hover:scale-[1.01]'
                    }`}
                    title={sidebarCollapsed ? module.name : undefined}
                  >
                    <div className={`flex items-center justify-center rounded-xl transition-all duration-200 ${
                      sidebarCollapsed ? 'w-12 h-12' : 'w-10 h-10'
                    } ${
                      activeModule === module.id
                        ? 'bg-gradient-to-br from-blue-100 to-indigo-100 shadow-sm'
                        : 'bg-slate-100 group-hover:bg-slate-200'
                    }`}>
                      <Icon className={`${
                        sidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5'
                      } ${
                        activeModule === module.id ? 'text-blue-600' : 'text-slate-600'
                      }`} />
                    </div>
                    {!sidebarCollapsed && (
                      <span className="font-medium tracking-tight text-base">{module.name}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50">
          <div className="flex items-center justify-between px-8 py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-200"
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-200"
                title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                ) : (
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between flex-1">
              <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
                {modules.find(m => m.id === activeModule)?.name}
              </h2>
              <ConnectionStatus />
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-auto p-8">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, { activeModule });
            }
            return child;
          })}
        </main>
      </div>
    </div>
  );
};