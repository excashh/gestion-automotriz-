import React, { useEffect, useState } from 'react';
import {
  History,
  Car,
  Users,
  Calendar,
  Wrench,
  Package,
  Camera,
  Loader2,
  ZoomIn,
  ExternalLink,
} from 'lucide-react';
import { clientesService } from '../services/api';
import { ModalDialog, ModalBanner } from './ModalDialog';
import { AuthImage, EtapaBadge, EvidenciaLightboxModal } from './AuthImage';

export function ModalHistorialVehiculo({
  open,
  vehiculoId,
  getEstadoBadge,
  onClose,
  onAbrirOrden,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lightboxItem, setLightboxItem] = useState(null);

  useEffect(() => {
    if (!open || !vehiculoId) return;
    let activo = true;
    setLoading(true);
    setError('');

    clientesService
      .getHistorialVehiculo(vehiculoId)
      .then((res) => {
        if (activo) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (activo) {
          setError(err.message || 'No fue posible consultar el historial del vehículo.');
          setLoading(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [open, vehiculoId]);

  const veh = data?.vehiculo;
  const ordenes = data?.ordenes || [];

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={
        veh
          ? `Historial del Vehículo • ${veh.marca} ${veh.modelo} ${veh.anio}`
          : 'Historial del Vehículo'
      }
      subtitle={
        veh
          ? `Placas ${veh.placas} • ID #${veh.id} • Propietario: ${veh.cliente_nombre}`
          : 'Expediente histórico de visitas, reparaciones y evidencia fotográfica'
      }
      icon={History}
      maxWidth="54rem"
      allowBackdropClose
    >
      <div className="space-y-5">
        {error && <ModalBanner type="error" title="Error de consulta" message={error} />}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
            <span>Cargando expediente del vehículo...</span>
          </div>
        ) : veh ? (
          <>
            {/* Ficha técnica resumida */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-rose-600" /> Unidad
                </span>
                <p className="font-black text-sm text-slate-900">
                  {veh.marca} {veh.modelo} ({veh.anio})
                </p>
                <p className="text-slate-600">
                  <span className="license-plate text-[11px] mr-1.5">{veh.placas}</span>
                  {veh.color ? `${veh.color} • ` : ''}
                  {Number(veh.kilometraje || 0).toLocaleString()} km
                </p>
                {veh.vin && <p className="font-mono text-[11px] text-slate-500">VIN: {veh.vin}</p>}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-rose-600" /> Propietario
                </span>
                <p className="font-bold text-sm text-slate-900">{veh.cliente_nombre}</p>
                <p className="text-slate-600">Tel: {veh.cliente_telefono}</p>
                {veh.cliente_email && <p className="text-slate-500 truncate">{veh.cliente_email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl border border-slate-200 p-2.5 text-center">
                  <span className="text-xl font-black text-slate-900 block">
                    {data.resumen?.totalVisitas || 0}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Órdenes</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-2.5 text-center">
                  <span className="text-xl font-black text-rose-600 block">
                    {data.resumen?.totalEvidencias || 0}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Fotos</span>
                </div>
              </div>
            </div>

            {/* Línea de tiempo de visitas / órdenes */}
            {ordenes.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-1">
                <p className="text-sm font-bold text-slate-700">
                  Este vehículo aún no registra órdenes de reparación.
                </p>
                <p className="text-xs text-slate-500">
                  Cuando ingrese a taller, aquí aparecerán sus servicios, piezas y fotografías de antes y después.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {ordenes.map((ord) => {
                  const evAntes = (ord.evidencias || []).filter(
                    (e) => e.etapa === 'antes_diagnostico'
                  );
                  const evDespuesYProceso = (ord.evidencias || []).filter(
                    (e) => e.etapa !== 'antes_diagnostico'
                  );

                  return (
                    <article
                      key={ord.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono font-black text-sm text-rose-600">
                            {ord.folio}
                          </span>
                          {getEstadoBadge && getEstadoBadge(ord.estado)}
                          <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(ord.fecha_ingreso).toLocaleDateString()} •{' '}
                            {Number(ord.km_entrada || 0).toLocaleString()} km
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            Total: ${parseFloat(ord.total || 0).toFixed(2)}
                          </span>
                          {onAbrirOrden && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onAbrirOrden(ord.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                            >
                              Abrir orden <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Motivo reportado
                          </span>
                          <p className="text-slate-800 font-medium">{ord.motivo}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Diagnóstico / Cierre
                          </span>
                          <p className="text-slate-700">
                            {ord.diagnostico || <span className="italic text-slate-400">Pendiente</span>}
                          </p>
                        </div>
                      </div>

                      {/* Servicios y piezas */}
                      {(ord.servicios?.length > 0 || ord.refacciones?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {ord.servicios?.map((s) => (
                            <span
                              key={`s-${s.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-semibold"
                            >
                              <Wrench className="w-3 h-3" /> {s.nombre}
                            </span>
                          ))}
                          {ord.refacciones?.map((r) => (
                            <span
                              key={`r-${r.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium"
                            >
                              <Package className="w-3 h-3" /> {r.nombre} (×{r.cantidad})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Evidencias fotográficas de la visita */}
                      {ord.evidencias?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-rose-600" />
                            Evidencia fotográfica ({ord.evidencias.length}) — Antes ({evAntes.length}) / Proceso y Después ({evDespuesYProceso.length})
                          </span>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {ord.evidencias.map((ev) => (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => setLightboxItem(ev)}
                                className="group text-left rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-rose-400 transition cursor-pointer"
                              >
                                <div className="h-24 relative bg-slate-200 overflow-hidden">
                                  <AuthImage
                                    ordenId={ord.id}
                                    evidenciaId={ev.id}
                                    alt={ev.descripcion || ev.etapa}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <span className="absolute bottom-1 right-1 p-1 rounded bg-zinc-950/70 text-white">
                                    <ZoomIn className="w-3 h-3" />
                                  </span>
                                </div>
                                <div className="p-2 space-y-1">
                                  <EtapaBadge etapa={ev.etapa} />
                                  {ev.servicio_nombre && (
                                    <p className="text-[10px] font-bold text-slate-800 truncate">
                                      {ev.servicio_nombre}
                                    </p>
                                  )}
                                  {ev.descripcion && (
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {ev.descripcion}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}

        <EvidenciaLightboxModal item={lightboxItem} onClose={() => setLightboxItem(null)} />
      </div>
    </ModalDialog>
  );
}
