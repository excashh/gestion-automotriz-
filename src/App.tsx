/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Sidebar, ModuleKey } from './components/common/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdenesView } from './components/ordenes/OrdenesView';
import { VehiculosView } from './components/vehiculos/VehiculosView';
import { ClientesView } from './components/clientes/ClientesView';
import { InventarioView } from './components/inventario/InventarioView';
import { ReportesView } from './components/reportes/ReportesView';
import { AuditoriaView } from './components/auditoria/AuditoriaView';
import { DetalleOrdenModal } from './components/ordenes/DetalleOrdenModal';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentModule, setCurrentModule] = useState<ModuleKey>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono tracking-wider">Cargando AutoGestión Pro...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentModule={currentModule} onSelectModule={setCurrentModule} />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar Contract */}
        <Header currentModule={currentModule} />

        {/* Dynamic Module Content Viewport */}
        <main className="flex-1 overflow-y-auto">
          {currentModule === 'dashboard' && (
            <DashboardView
              onNavigateToModule={setCurrentModule}
              onSelectOrder={(id) => setSelectedOrderId(id)}
            />
          )}
          {currentModule === 'ordenes' && <OrdenesView />}
          {currentModule === 'vehiculos' && <VehiculosView />}
          {currentModule === 'clientes' && <ClientesView />}
          {currentModule === 'inventario' && <InventarioView />}
          {currentModule === 'reportes' && <ReportesView />}
          {currentModule === 'auditoria' && <AuditoriaView />}
        </main>
      </div>

      {/* Detalle modal triggered from dashboard */}
      <DetalleOrdenModal
        ordenId={selectedOrderId}
        isOpen={selectedOrderId !== null}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={() => {
          // stats will update on next refresh
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
