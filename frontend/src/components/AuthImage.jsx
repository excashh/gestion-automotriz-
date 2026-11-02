import React, { useEffect, useState } from 'react';
import {
  Camera,
  Loader2,
  ImageOff,
  Clock,
  User,
  Wrench,
} from 'lucide-react';
import { obtenerUrlEvidencia } from '../services/api';
import { ModalDialog } from './ModalDialog';

export const ETAPAS_CATALOGO = [
  {
    codigo: 'antes_diagnostico',
    nombre: 'Antes / diagnóstico',
    corto: 'Antes',
    grupo: 'antes',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  {
    codigo: 'durante_trabajo',
    nombre: 'Durante el trabajo',
    corto: 'Durante',
    grupo: 'proceso',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
  },
  {
    codigo: 'pieza_retirada',
    nombre: 'Pieza retirada',
    corto: 'Pieza retirada',
    grupo: 'proceso',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
  },
  {
    codigo: 'despues_instalacion',
    nombre: 'Después / instalación',
    corto: 'Después',
    grupo: 'despues',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  {
    codigo: 'entrega',
    nombre: 'Entrega',
    corto: 'Entrega',
    grupo: 'despues',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
  },
];

export const ETAPAS_POR_CODIGO = Object.fromEntries(
  ETAPAS_CATALOGO.map((e) => [e.codigo, e])
);

export function EtapaBadge({ etapa, size = 'xs' }) {
  const info = ETAPAS_POR_CODIGO[etapa] || {
    nombre: etapa,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold border ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      } ${info.badgeClass}`}
    >
      {info.nombre}
    </span>
  );
}

/**
 * Carga y renderiza una imagen de evidencia protegida con JWT sin exponer la URL públicamente.
 */
export function AuthImage({
  ordenId,
  evidenciaId,
  previewUrl,
  alt = 'Evidencia fotográfica',
  className = 'w-full h-full object-cover',
}) {
  const [src, setSrc] = useState(previewUrl || null);
  const [loading, setLoading] = useState(!previewUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (previewUrl) {
      setSrc(previewUrl);
      setLoading(false);
      setError(false);
      return;
    }

    let activo = true;
    setLoading(true);
    setError(false);

    obtenerUrlEvidencia(ordenId, evidenciaId)
      .then((url) => {
        if (activo) {
          setSrc(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (activo) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [ordenId, evidenciaId, previewUrl]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-24 bg-slate-100 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="w-full h-full min-h-24 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center gap-1">
        <ImageOff className="w-5 h-5" />
        <span className="text-[11px]">No disponible</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
}

/**
 * Visor ampliado (Lightbox en Top Layer) tanto para fotos en previsualización como ya guardadas.
 */
export function EvidenciaLightboxModal({ item, onClose }) {
  if (!item) return null;

  const titulo = item.esBorrador
    ? 'Vista previa antes de guardar'
    : `Evidencia fotográfica • ${ETAPAS_POR_CODIGO[item.etapa]?.nombre || item.etapa}`;

  return (
    <ModalDialog
      open={Boolean(item)}
      onClose={onClose}
      title={titulo}
      subtitle={item.nombre_original || item.nombreArchivo || 'Fotografía de orden'}
      icon={Camera}
      maxWidth="54rem"
      allowBackdropClose
    >
      <div className="space-y-4">
        <div className="bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center max-h-[62vh] min-h-56 border border-slate-200">
          <AuthImage
            ordenId={item.orden_id}
            evidenciaId={item.id}
            previewUrl={item.previewUrl}
            alt={item.descripcion || item.nombre_original || 'Vista ampliada de evidencia'}
            className="max-h-[62vh] w-auto max-w-full object-contain"
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <EtapaBadge etapa={item.etapa} size="sm" />
              {item.servicio_nombre && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 font-semibold text-slate-800">
                  <Wrench className="w-3.5 h-3.5 text-rose-600" />
                  {item.servicio_nombre}
                </span>
              )}
              {item.esBorrador && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                  Pendiente de confirmar
                </span>
              )}
            </div>

            {item.created_at && (
              <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {new Date(item.created_at).toLocaleString()}
              </span>
            )}
          </div>

          {item.autor_nombre && (
            <p className="inline-flex items-center gap-1.5 text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Registrada por: <strong className="text-slate-900">{item.autor_nombre}</strong>
              {item.autor_rol && (
                <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                  {item.autor_rol}
                </span>
              )}
            </p>
          )}

          {item.descripcion ? (
            <p className="text-sm text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
              {item.descripcion}
            </p>
          ) : (
            <p className="italic text-slate-400">Sin nota o descripción adicional.</p>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
