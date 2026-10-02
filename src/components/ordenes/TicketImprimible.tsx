import React from 'react';
import { OrdenServicio, OrdenDetalleRepuesto, OrdenServicioManoObra } from '../../types';
import { Printer, X } from 'lucide-react';

interface TicketImprimibleProps {
  orden: OrdenServicio;
  repuestos: OrdenDetalleRepuesto[];
  manoObra: OrdenServicioManoObra[];
  onClose: () => void;
}

export const TicketImprimible: React.FC<TicketImprimibleProps> = ({
  orden,
  repuestos,
  manoObra,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-8 shadow-2xl my-8 text-slate-900 font-sans print:shadow-none print:m-0 print:p-4">
        {/* Screen Controls */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Vista Previa de Comprobante / Factura
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Header */}
        <div className="text-center pb-6 border-b border-slate-300">
          <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase">AutoGestión Pro</h1>
          <p className="text-xs text-slate-600 font-medium">Centro de Diagnóstico & Servicio Mecánico Automotriz</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Av. Insurgentes Sur 1450 · Tel: (55) 1234-5678 · RFC: AGP230101-XYZ
          </p>
        </div>

        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
          <div>
            <p className="text-slate-400 font-semibold text-[10px] uppercase">Folio de Servicio</p>
            <p className="font-mono font-bold text-slate-900 text-sm">{orden.folio}</p>
            <p className="mt-2 text-slate-400 font-semibold text-[10px] uppercase">Fecha de Ingreso</p>
            <p className="font-medium text-slate-800">{orden.fecha_ingreso}</p>
            {orden.fecha_completada && (
              <>
                <p className="mt-2 text-slate-400 font-semibold text-[10px] uppercase">Fecha de Entrega</p>
                <p className="font-medium text-slate-800">{orden.fecha_completada}</p>
              </>
            )}
          </div>

          <div>
            <p className="text-slate-400 font-semibold text-[10px] uppercase">Cliente</p>
            <p className="font-bold text-slate-900">{orden.cliente_nombre}</p>
            <p className="text-slate-600 font-mono text-[11px]">{orden.cliente_documento}</p>
            <p className="text-slate-600">{orden.cliente_telefono}</p>
            <p className="text-slate-500 text-[11px]">{orden.cliente_direccion}</p>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="py-3 bg-slate-50 rounded-lg px-4 my-4 border border-slate-200 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Vehículo</span>
              <strong className="text-slate-900">
                {orden.marca} {orden.modelo} ({orden.anio})
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Placas / Odómetro</span>
              <span className="font-mono font-bold text-slate-900">
                {orden.placa} · {orden.kilometraje_ingreso.toLocaleString()} km
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">VIN</span>
              <span className="font-mono text-slate-700 text-[11px]">{orden.vin}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
            <strong>Motivo:</strong> {orden.motivo_ingreso}
          </div>
        </div>

        {/* Breakdown: Spare Parts */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Refacciones e Insumos
          </h4>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="py-1 font-semibold">Cant.</th>
                <th className="py-1 font-semibold">Descripción</th>
                <th className="py-1 font-semibold text-right">P. Unit.</th>
                <th className="py-1 font-semibold text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {repuestos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-slate-400 italic">
                    Sin refacciones en esta orden
                  </td>
                </tr>
              ) : (
                repuestos.map((item, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-mono text-slate-800">{item.cantidad}</td>
                    <td className="py-1.5 text-slate-800">
                      {item.nombre} <span className="text-slate-400 text-[10px]">({item.marca})</span>
                    </td>
                    <td className="py-1.5 text-right font-mono text-slate-600">
                      {formatCurrency(item.precio_unitario)}
                    </td>
                    <td className="py-1.5 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Breakdown: Labor Services */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Servicios y Mano de Obra
          </h4>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="py-1 font-semibold">Hrs.</th>
                <th className="py-1 font-semibold">Descripción de Operación</th>
                <th className="py-1 font-semibold text-right">Tarifa/Hr</th>
                <th className="py-1 font-semibold text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {manoObra.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-slate-400 italic">
                    Sin mano de obra registrada
                  </td>
                </tr>
              ) : (
                manoObra.map((serv, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-mono text-slate-800">{serv.horas}</td>
                    <td className="py-1.5 text-slate-800">{serv.descripcion}</td>
                    <td className="py-1.5 text-right font-mono text-slate-600">
                      {formatCurrency(serv.costo_hora)}
                    </td>
                    <td className="py-1.5 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(serv.subtotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="border-t border-slate-300 pt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Mano de Obra:</span>
              <span className="font-mono">{formatCurrency(orden.mano_obra_costo)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Refacciones:</span>
              <span className="font-mono">{formatCurrency(orden.repuestos_costo)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(orden.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>I.V.A. (16%):</span>
              <span className="font-mono">{formatCurrency(orden.iva)}</span>
            </div>
            <div className="flex justify-between text-slate-950 font-bold text-sm pt-1.5 border-t-2 border-slate-900">
              <span>TOTAL:</span>
              <span className="font-mono">{formatCurrency(orden.total)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>Forma de Pago:</span>
              <span className="capitalize font-medium text-slate-700">{orden.metodo_pago || 'Pendiente'}</span>
            </div>
          </div>
        </div>

        {/* Warranty and Signatures Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-[10px] text-slate-500 space-y-6">
          <p className="text-center leading-relaxed">
            Garantía de 90 días o 3,000 kilómetros en mano de obra y refacciones aplicadas. Este comprobante
            ampara la conformidad del servicio realizado bajo las especificaciones técnicas del fabricante.
          </p>
          <div className="grid grid-cols-2 gap-12 pt-8 text-center text-slate-700">
            <div className="border-t border-slate-400 pt-2">
              <span className="font-semibold block">{orden.tecnico_nombre || 'Mecánico Responsable'}</span>
              <span className="text-[10px] text-slate-400">Técnico Automotriz</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="font-semibold block">{orden.cliente_nombre}</span>
              <span className="text-[10px] text-slate-400">Firma de Conformidad del Cliente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
