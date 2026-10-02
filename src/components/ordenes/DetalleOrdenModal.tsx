import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { TicketImprimible } from './TicketImprimible';
import { api } from '../../services/api';
import { OrdenServicio, OrdenDetalleRepuesto, OrdenServicioManoObra, EstadoOrden } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Wrench,
  Car,
  DollarSign,
  Package,
  ShieldAlert,
} from 'lucide-react';

interface DetalleOrdenModalProps {
  ordenId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const DetalleOrdenModal: React.FC<DetalleOrdenModalProps> = ({
  ordenId,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<{
    orden: OrdenServicio;
    repuestos: OrdenDetalleRepuesto[];
    manoObra: OrdenServicioManoObra[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Print state
  const [showPrint, setShowPrint] = useState(false);

  // Finalize / Pay state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  const [finalizing, setFinalizing] = useState(false);

  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [canceling, setCanceling] = useState(false);

  const loadOrderDetail = async () => {
    if (!ordenId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getOrden(ordenId);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando orden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ordenId) {
      loadOrderDetail();
    } else {
      setData(null);
    }
  }, [isOpen, ordenId]);

  const handleStateChange = async (nuevoEstado: EstadoOrden) => {
    if (!ordenId) return;
    try {
      setErrorMsg(null);
      await api.cambiarEstadoOrden(ordenId, nuevoEstado);
      await loadOrderDetail();
      onOrderUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error actualizando estado');
    }
  };

  const handleFinalizeConfirm = async () => {
    if (!ordenId) return;
    try {
      setFinalizing(true);
      setErrorMsg(null);
      await api.cambiarEstadoOrden(ordenId, 'finalizado', metodoPago);
      setShowFinalizeModal(false);
      await loadOrderDetail();
      onOrderUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al finalizar la orden');
      setShowFinalizeModal(false);
    } finally {
      setFinalizing(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!ordenId) return;
    if (!justificacion.trim()) {
      setErrorMsg('Debe escribir el motivo de la cancelación');
      return;
    }
    try {
      setCanceling(true);
      setErrorMsg(null);
      await api.cancelarOrden(ordenId, justificacion);
      setShowCancelModal(false);
      await loadOrderDetail();
      onOrderUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cancelar la orden');
    } finally {
      setCanceling(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val);
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={data ? `Orden de Servicio ${data.orden.folio}` : 'Detalle de Orden'}
        subtitle={
          data
            ? `${data.orden.marca} ${data.orden.modelo} · Placa ${data.orden.placa} · Cliente: ${data.orden.cliente_nombre}`
            : 'Cargando información...'
        }
        maxWidth="3xl"
      >
        {loading ? (
          <div className="py-12 text-center text-slate-400 animate-pulse text-xs">
            Cargando desglose de la orden...
          </div>
        ) : errorMsg && !data ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
            {errorMsg}
          </div>
        ) : data ? (
          <div className="space-y-6 text-xs text-slate-700">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Status Flow Stepper */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Flujo de Trabajo del Taller
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${
                    data.orden.estado === 'finalizado'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : data.orden.estado === 'cancelado'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  Estado: {data.orden.estado.replace('_', ' ')}
                </span>
              </div>

              {/* Action Buttons for State Transition */}
              {data.orden.estado !== 'finalizado' && data.orden.estado !== 'cancelado' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500 font-medium">Cambiar etapa a:</span>
                  <button
                    onClick={() => handleStateChange('en_diagnostico')}
                    disabled={data.orden.estado === 'en_diagnostico'}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition-colors disabled:opacity-40"
                  >
                    En Diagnóstico
                  </button>
                  <button
                    onClick={() => handleStateChange('en_reparacion')}
                    disabled={data.orden.estado === 'en_reparacion'}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition-colors disabled:opacity-40"
                  >
                    En Reparación
                  </button>
                  <button
                    onClick={() => handleStateChange('espera_repuestos')}
                    disabled={data.orden.estado === 'espera_repuestos'}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition-colors disabled:opacity-40"
                  >
                    En Espera de Repuestos
                  </button>
                </div>
              )}

              {data.orden.estado === 'cancelado' && data.orden.justificacion_cancelacion && (
                <div className="mt-2 text-rose-600 bg-rose-50 p-2 rounded text-[11px] border border-rose-100">
                  <strong>Justificación de Cancelación:</strong> {data.orden.justificacion_cancelacion}
                </div>
              )}
            </div>

            {/* Vehicle & Customer Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Información del Vehículo
                </span>
                <div className="font-semibold text-slate-900 text-sm">
                  {data.orden.marca} {data.orden.modelo} ({data.orden.anio})
                </div>
                <div className="text-slate-600 flex items-center gap-3">
                  <span>
                    Placas: <strong className="font-mono text-slate-800">{data.orden.placa}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Odómetro:{' '}
                    <strong className="font-mono text-slate-800">
                      {data.orden.kilometraje_ingreso.toLocaleString()} km
                    </strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  VIN: {data.orden.vin} · Combustible: {data.orden.nivel_combustible}
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Cliente & Recepción
                </span>
                <div className="font-semibold text-slate-900 text-sm">{data.orden.cliente_nombre}</div>
                <div className="text-slate-600">
                  {data.orden.cliente_telefono} · {data.orden.cliente_email}
                </div>
                <div className="text-[11px] text-slate-500">
                  Mecánico: <strong className="text-slate-700">{data.orden.tecnico_nombre || 'Sin Asignar'}</strong> ·
                  Recepción: {data.orden.recepcionista_nombre}
                </div>
              </div>
            </div>

            {/* Problem & Diagnosis */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div>
                <strong className="text-slate-900 text-[11px]">Motivo de Ingreso:</strong>
                <p className="text-slate-700 mt-0.5">{data.orden.motivo_ingreso}</p>
              </div>
              {data.orden.diagnostico && (
                <div className="pt-2 border-t border-slate-200">
                  <strong className="text-slate-900 text-[11px]">Diagnóstico Mecánico:</strong>
                  <p className="text-slate-700 mt-0.5">{data.orden.diagnostico}</p>
                </div>
              )}
            </div>

            {/* Repuestos Usados */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" /> Refacciones Aplicadas
              </h4>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left">Código / Nombre</th>
                    <th className="py-2 px-3 text-center">Cant.</th>
                    <th className="py-2 px-3 text-right">Precio Unit.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.repuestos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate-400 italic">
                        No se han cargado refacciones en esta orden.
                      </td>
                    </tr>
                  ) : (
                    data.repuestos.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-900">{item.nombre}</span>{' '}
                          <span className="text-slate-400 text-[11px]">({item.marca})</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{item.cantidad}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(item.precio_unitario)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mano de Obra */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Mano de Obra
              </h4>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left">Operación Mecánica</th>
                    <th className="py-2 px-3 text-center">Horas</th>
                    <th className="py-2 px-3 text-right">Tarifa/Hr</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.manoObra.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate-400 italic">
                        Sin mano de obra registrada.
                      </td>
                    </tr>
                  ) : (
                    data.manoObra.map((serv, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-slate-800">{serv.descripcion}</td>
                        <td className="py-2 px-3 text-center font-mono">{serv.horas}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(serv.costo_hora)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                          {formatCurrency(serv.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div className="text-xs space-y-0.5">
                <div>
                  Mano de obra: <strong className="font-mono">{formatCurrency(data.orden.mano_obra_costo)}</strong> ·
                  Refacciones: <strong className="font-mono">{formatCurrency(data.orden.repuestos_costo)}</strong>
                </div>
                <div className="text-slate-400">
                  Subtotal: {formatCurrency(data.orden.subtotal)} + IVA (16%): {formatCurrency(data.orden.iva)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Monto Total
                </span>
                <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                  {formatCurrency(data.orden.total)}
                </span>
              </div>
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrint(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Imprimir Comprobante</span>
                </button>

                {isAdmin && data.orden.estado !== 'cancelado' && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 font-semibold rounded-lg transition-colors border border-rose-200"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancelar Orden</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cerrar
                </button>

                {data.orden.estado !== 'finalizado' && data.orden.estado !== 'cancelado' && (
                  <button
                    type="button"
                    onClick={() => setShowFinalizeModal(true)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalizar y Cobrar Orden</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal de Finalización y Cobro Transaccional */}
      <Modal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        title="Finalizar y Liquidar Orden de Servicio"
        subtitle="Operación transaccional: Actualiza existencias en inventario y sella odómetro"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 leading-relaxed">
            <strong>Regla de Negocio 2 & 20:</strong> Al confirmar, el sistema ejecutará una transacción en base de datos
            que descontará las refacciones del inventario, creará los movimientos en el kárdex y marcará la orden como
            pagada.
          </div>

          <div>
            <label className="block font-semibold mb-1">Seleccionar Método de Pago *</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta_debito">Tarjeta de Débito</option>
              <option value="tarjeta_credito">Tarjeta de Crédito</option>
              <option value="transferencia">Transferencia Bancaria (SPEI)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-900 text-white rounded-lg flex justify-between items-center font-mono">
            <span>Total a Cobrar:</span>
            <span className="text-base font-bold text-amber-400">
              {data ? formatCurrency(data.orden.total) : ''}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowFinalizeModal(false)}
              disabled={finalizing}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Volver
            </button>
            <button
              onClick={handleFinalizeConfirm}
              disabled={finalizing}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              {finalizing ? 'Procesando Transacción...' : 'Confirmar Cobro y Cierre'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Cancelación con Justificación */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Orden de Servicio"
        subtitle="Requiere permisos de Administrador y justificación obligatoria"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="text-slate-600">
            Esta acción registrará un evento en el log de auditoría. Si la orden ya estaba cerrada, se restituirá el
            stock de refacciones automáticamente.
          </p>

          <div>
            <label className="block font-semibold mb-1 text-slate-900">Motivo / Justificación *</label>
            <textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              required
              rows={3}
              placeholder="Explique detalladamente la razón de la cancelación..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={canceling}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Regresar
            </button>
            <button
              onClick={handleCancelConfirm}
              disabled={canceling || !justificacion.trim()}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              {canceling ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Printable Receipt Preview */}
      {showPrint && data && (
        <TicketImprimible
          orden={data.orden}
          repuestos={data.repuestos}
          manoObra={data.manoObra}
          onClose={() => setShowPrint(false)}
        />
      )}
    </>
  );
};
