import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Wrench, Shield, UserCircle2, Bell } from 'lucide-react';

interface HeaderProps {
  currentModule: string;
}

export const Header: React.FC<HeaderProps> = ({ currentModule }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (rol?: string) => {
    switch (rol) {
      case 'admin':
        return 'Administrador General';
      case 'tecnico':
        return 'Técnico Mecánico';
      case 'recepcionista':
        return 'Recepción / Caja';
      default:
        return 'Usuario';
    }
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200 z-10 shrink-0">
      {/* Zone 1: Contextual Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-800 tracking-tight">AutoGestión Pro</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 font-medium capitalize">{currentModule}</span>
      </div>

      {/* Zone 2: Workshop Status Notice */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-medium text-slate-700">Taller Operativo</span>
        <span>·</span>
        <span className="font-mono tabular-nums">Versión 2.4-Production</span>
      </div>

      {/* Zone 3: Active User & Actions */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[180px]">
                {user.nombre}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">{getRoleBadge(user.rol)}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold font-mono">
              {user.nombre.substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};
