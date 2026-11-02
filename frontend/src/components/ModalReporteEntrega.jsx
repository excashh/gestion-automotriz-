import React from 'react';
import { Printer, Wrench, Camera, CheckCircle } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { AuthImage, EtapaBadge } from './AuthImage';

export function ModalReporteEntrega({ open, detalleOrden, onClose }) {
  if (!open || !detalleOrden?.orden) return null;

  const { orden, servicios = [], refacciones = [], evidencias = [] } = detalleOrden;

  const subtotalMo = servicios.reduce((acc, s) => acc + parseFloat(s.importe || 0), 0);
  const subtotalRef = refacciones.reduce((acc, r) => acc + parseFloat(r.importe || 0), 0);
  const ivaPct = parseFloat(orden.iva_porcentaje || 16);
  const ivaMonto =
    orden.estado === 'completada' || orden.estado === 'entregada'
      ? parseFloat(orden.iva_monto || 0)
      : (subtotalMo + subtotalRef) * (ivaPct / 100);
  const total =
    orden.estado === 'completada' || orden.estado === 'entregada'
      ? parseFloat(orden.total || 0)
      : subtotalMo + subtotalRef + ivaMonto;
  const pagado = parseFloat(orden.pagado || 0);
  const saldo = Math.max(0, total - pagado);

  const fotosAntes = evidencias.filter((e) => e.etapa === 'antes_diagnostico');
  const fotosDespuesYEntrega = evidencias.filter((e) =>
    ['despues_instalacion', 'entrega', 'pieza_retirada', 'durante_trabajo'].includes(e.etapa)
  );

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={`Reporte de Servicio y Entrega • ${orden.folio}`}
      subtitle="Vista lista para imprimir o guardar en PDF con resumen de trabajos y evidencia fotográfica."
      icon={Printer}
      maxWidth="54rem"
      allowBackdropClose
      headerActions={
        <button
          type="button"
          onClick={() => window.print()}
          className="pro-btn-crimson px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir / Guardar PDF
        </button>
      }
    >
      <div className="autopro-printable bg-white text-slate-900 space-y-5 p-2 sm:p-4">
        {/* Encabezado de documento */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">AutoPro Taller Automotriz</h1>
              <p className="text-xs text-slate-500">
                Reporte de Orden de Reparación, Evidencia Técnica y Entrega
              </p>
            </div>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <p className="text-base font-mono font-black text-rose-600">{orden.folio}</p>
            <p className="text-slate-600">
              Estado: <strong className="uppercase">{orden.estado}</strong>
            </p>
            <p className="text-slate-500">
              Ingreso: {new Date(orden.fecha_ingreso).toLocaleString()}
            </p>
            {orden.fecha_cierre && (
              <p className="text-slate-500">
                Cierre: {new Date(orden.fecha_cierre).toLocaleString()}
              </p>
            )}
          </div>
        </header>

        {/* Cliente y Vehículo */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-200 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Datos del Cliente
            </span>
            <p className="text-sm font-black text-slate-900">{orden.cliente_nombre}</p>
            <p>Teléfono: {orden.cliente_telefono}</p>
            {orden.cliente_email && <p>Correo: {orden.cliente_email}</p>}
            {orden.cliente_rfc && <p>RFC: {orden.cliente_rfc}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Datos del Vehículo
            </span>
            <p className="text-sm font-black text-slate-900">
              {orden.marca} {orden.modelo} ({orden.anio})
            </p>
            <p>
              Placas: <strong className="font-mono">{orden.placas}</strong> • Km ingreso:{' '}
              {Number(orden.km_entrada || 0).toLocaleString()} km
            </p>
            {orden.vin && <p className="font-mono">VIN: {orden.vin}</p>}
            <p>Técnico asignado: {orden.mecanico_nombre || 'Taller general'}</p>
          </div>
        </section>

        {/* Motivo y Diagnóstico */}
        <section className="rounded-xl border border-slate-200 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Motivo de Ingreso
            </span>
            <p className="text-slate-800">{orden.motivo}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Diagnóstico y Trabajo Realizado
            </span>
            <p className="text-slate-800">
              {orden.diagnostico || 'Revisión y mantenimiento conforme a orden de trabajo.'}
            </p>
          </div>
        </section>

        {/* Desglose de Servicios y Refacciones */}
        <section className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Conceptos de Mano de Obra y Refacciones
          </h3>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Código / SKU</th>
                  <th className="px-3 py-2">Concepto</th>
                  <th className="px-3 py-2 text-center">Cant.</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {servicios.map((s) => (
                  <tr key={`srv-${s.id}`}>
                    <td className="px-3 py-2 font-semibold text-rose-700">Servicio</td>
                    <td className="px-3 py-2 font-mono">{s.codigo}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{s.nombre}</td>
                    <td className="px-3 py-2 text-center">{s.cantidad}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      ${parseFloat(s.importe).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {refacciones.map((r) => (
                  <tr key={`ref-${r.id}`}>
                    <td className="px-3 py-2 font-semibold text-slate-600">Refacción</td>
                    <td className="px-3 py-2 font-mono">{r.sku}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.nombre}</td>
                    <td className="px-3 py-2 text-center">{r.cantidad}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      ${parseFloat(r.importe).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {servicios.length === 0 && refacciones.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400 italic">
                      Sin conceptos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal Mano de Obra:</span>
                <strong>${subtotalMo.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal Refacciones:</span>
                <strong>${subtotalRef.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">IVA ({ivaPct}%):</span>
                <strong>${ivaMonto.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-black text-slate-900">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Pagado:</span>
                <span>${pagado.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Saldo pendiente:</span>
                <span className={saldo <= 0.01 ? 'text-emerald-700' : 'text-rose-600'}>
                  ${saldo.toFixed(2)} {saldo <= 0.01 && '(Liquidado)'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* EVIDENCIA FOTOGRÁFICA EN EL REPORTE DE ENTREGA */}
        {evidencias.length > 0 && (
          <section className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-rose-600" />
              Evidencia Fotográfica Documentada ({evidencias.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fotosAntes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-amber-900 uppercase">
                    Estado Inicial / Diagnóstico
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {fotosAntes.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-slate-200 overflow-hidden bg-white text-[11px]"
                      >
                        <div className="h-28 bg-slate-100">
                          <AuthImage
                            ordenId={orden.id}
                            evidenciaId={ev.id}
                            alt={ev.descripcion || ev.etapa_label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2 space-y-0.5">
                          <EtapaBadge etapa={ev.etapa} />
                          {ev.servicio_nombre && (
                            <p className="font-bold text-slate-900">{ev.servicio_nombre}</p>
                          )}
                          {ev.descripcion && <p className="text-slate-600">{ev.descripcion}</p>}
                          <p className="text-[10px] text-slate-400">
                            {new Date(ev.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fotosDespuesYEntrega.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-emerald-900 uppercase">
                    Proceso, Instalación y Entrega
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {fotosDespuesYEntrega.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-slate-200 overflow-hidden bg-white text-[11px]"
                      >
                        <div className="h-28 bg-slate-100">
                          <AuthImage
                            ordenId={orden.id}
                            evidenciaId={ev.id}
                            alt={ev.descripcion || ev.etapa_label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2 space-y-0.5">
                          <EtapaBadge etapa={ev.etapa} />
                          {ev.servicio_nombre && (
                            <p className="font-bold text-slate-900">{ev.servicio_nombre}</p>
                          )}
                          {ev.descripcion && <p className="text-slate-600">{ev.descripcion}</p>}
                          <p className="text-[10px] text-slate-400">
                            {new Date(ev.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Firmas de conformidad */}
        <footer className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
          <div className="border-t border-slate-300 pt-2">
            <p className="font-bold text-slate-800">Entrega Taller AutoPro</p>
            <p className="text-[11px]">{orden.creador_nombre}</p>
          </div>
          <div className="border-t border-slate-300 pt-2">
            <p className="font-bold text-slate-800 flex items-center justify-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Conformidad del Cliente
            </p>
            <p className="text-[11px]">{orden.cliente_nombre}</p>
          </div>
        </footer>
      </div>
    </ModalDialog>
  );
}
