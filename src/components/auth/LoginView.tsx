import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wrench, Shield, Key, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor ingrese su correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    try {
      setLoading(true);
      setErrorMsg(null);
      await login(userEmail, userPass);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión rápida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-white">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="bg-slate-900 p-8 text-center text-white relative">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Wrench className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AutoGestión Pro</h1>
          <p className="text-xs text-amber-400 font-medium tracking-wide uppercase mt-1">
            Sistema Integral de Gestión Automotriz
          </p>
          <div className="text-[11px] text-slate-400 mt-2">
            Punto de Venta · Taller Mecánico · Inventario · 3FN ACID
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
            <div>
              <label className="block font-semibold mb-1 text-slate-800">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ejemplo@autogestion.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-800">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Validando Credenciales...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access / Demo Accounts */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider text-center">
              Acceso Rápido / Cuentas de Evaluación (RBAC)
            </span>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@autogestion.com', 'admin123')}
                disabled={loading}
                className="w-full p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-amber-600">
                    Ing. Roberto Mendoza (Admin)
                  </div>
                  <div className="text-[10px] text-slate-500">Acceso total, auditoría, reportes y usuarios</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                  admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('carlos.mecanico@autogestion.com', 'mecanico123')}
                disabled={loading}
                className="w-full p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-amber-600">
                    Carlos Hernández (Técnico Master)
                  </div>
                  <div className="text-[10px] text-slate-500">Diagnóstico, mano de obra e insumos</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                  tecnico
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ana.recepcion@autogestion.com', 'recep123')}
                disabled={loading}
                className="w-full p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-amber-600">
                    Ana Sofía Morales (Recepción y Caja)
                  </div>
                  <div className="text-[10px] text-slate-500">Ingreso de autos, clientes y cobro</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  recepción
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="mt-6 text-center text-[11px] text-slate-500 space-y-1">
        <p>Base de Datos SQLite Relacional (3FN) · Transacciones Atómicas ACID · REST API Express</p>
        <p className="text-slate-400">Contraseñas encriptadas mediante Hash Bcrypt · Tokens JWT</p>
      </div>
    </div>
  );
};
