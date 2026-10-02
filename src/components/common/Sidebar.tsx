import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Car,
  Users,
  Package,
  BarChart3,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ModuleKey =
  | 'dashboard'
  | 'ordenes'
  | 'vehiculos'
  | 'clientes'
  | 'inventario'
  | 'reportes'
  | 'auditoria';

interface SidebarProps {
  currentModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentModule, onSelectModule }) => {
  const { user, isAdmin } = useAuth();

  const navigation = [
    { key: 'dashboard' as ModuleKey, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'ordenes' as ModuleKey, label: 'Órdenes de Servicio', icon: ClipboardList, badge: 'POS' },
    { key: 'vehiculos' as ModuleKey, label: 'Vehículos', icon: Car },
    { key: 'clientes' as ModuleKey, label: 'Clientes', icon: Users },
    { key: 'inventario' as ModuleKey, label: 'Inventario / Repuestos', icon: Package },
    { key: 'reportes' as ModuleKey, label: 'Reportes & Métricas', icon: BarChart3 },
    ...(isAdmin
      ? [{ key: 'auditoria' as ModuleKey, label: 'Auditoría & Personal', icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand Zone */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shadow-md">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none">AutoGestión</h1>
          <p className="text-[10px] text-amber-400 font-medium tracking-wider uppercase mt-1">
            Sistema Automotriz
          </p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Módulos Principales
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectModule(item.key)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Mini Profile Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Servidor Local</span>
          <span className="inline-flex items-center gap-1 font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Conectado
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1">SQLite 3NF · ACID Active</div>
      </div>
    </aside>
  );
};
