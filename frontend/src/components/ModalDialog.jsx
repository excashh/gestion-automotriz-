import React, { useEffect, useId, useRef } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';

/**
 * Componente de ventana modal basado en <dialog> nativo (Top Layer del navegador),
 * garantizando que ningún fondo oscuro oculte alertas ni controles superpuestos.
 */
export function ModalDialog({
  open,
  onClose,
  title,
  subtitle,
  icon: IconComponent,
  maxWidth = '36rem',
  busy = false,
  allowBackdropClose = false,
  headerActions = null,
  containerClassName = '',
  children,
}) {
  const dialogRef = useRef(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = '';
    }
  }, [open]);

  if (!open) return null;

  const isOutsideCard = (e) => {
    const card = dialogRef.current?.firstElementChild;
    if (!card) return false;
    const rect = card.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      style={{ '--dialog-max-w': maxWidth }}
      className="autopro-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy && onClose) {
          onClose();
        }
      }}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = '';
        }
      }}
      onPointerDown={(e) => {
        if (!allowBackdropClose) return;
        pressedOutsideRef.current = isOutsideCard(e);
      }}
      onPointerUp={(e) => {
        if (!allowBackdropClose || busy) return;
        if (pressedOutsideRef.current && isOutsideCard(e) && onClose) {
          onClose();
        }
        pressedOutsideRef.current = false;
      }}
    >
      <div
        className={`bg-white rounded-2xl w-full max-h-[calc(100dvh-1.5rem)] flex flex-col shadow-2xl border border-slate-200 text-slate-800 overflow-hidden ${containerClassName}`}
      >
        {/* Cabecera fija del modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white flex-shrink-0 no-print">
          <div className="flex items-start gap-3 min-w-0">
            {IconComponent && (
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <IconComponent className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-lg font-black text-slate-900 tracking-tight leading-snug"
              >
                {title}
              </h2>
              {subtitle && (
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
            <button
              type="button"
              disabled={busy}
              onClick={() => !busy && onClose && onClose()}
              aria-label="Cerrar ventana"
              title="Cerrar (Esc)"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo desplazable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">{children}</div>
      </div>
    </dialog>
  );
}

/**
 * Alerta contextual accesible dentro del modal (alto contraste WCAG AA).
 */
export function ModalBanner({
  type = 'error',
  title,
  message,
  details = [],
  onDismiss,
  bannerRef,
}) {
  if (!message && (!details || details.length === 0)) return null;

  const variants = {
    error: {
      box: 'bg-rose-50 border-rose-300 text-rose-900',
      iconColor: 'text-rose-600',
      Icon: AlertTriangle,
      role: 'alert',
    },
    warning: {
      box: 'bg-amber-50 border-amber-300 text-amber-950',
      iconColor: 'text-amber-600',
      Icon: AlertTriangle,
      role: 'alert',
    },
    success: {
      box: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      iconColor: 'text-emerald-600',
      Icon: CheckCircle,
      role: 'status',
    },
    info: {
      box: 'bg-slate-50 border-slate-300 text-slate-800',
      iconColor: 'text-slate-600',
      Icon: Info,
      role: 'status',
    },
  };

  const cfg = variants[type] || variants.error;
  const IconComp = cfg.Icon;

  return (
    <div
      ref={bannerRef}
      tabIndex={-1}
      role={cfg.role}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      className={`p-3.5 rounded-xl border ${cfg.box} text-xs sm:text-sm flex items-start gap-3 focus:outline-none`}
    >
      <IconComp className={`w-4 h-4 sm:w-5 sm:h-5 ${cfg.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0 space-y-1">
        {title && <p className="font-bold leading-snug">{title}</p>}
        {message && <p className="leading-relaxed font-medium">{message}</p>}
        {Array.isArray(details) && details.length > 0 && (
          <ul className="list-disc pl-4 space-y-0.5 pt-1 text-xs">
            {details.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Ocultar aviso"
          className="p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Mensaje de error puntual debajo de un control de formulario.
 */
export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="mt-1.5 text-xs font-semibold text-rose-700 flex items-start gap-1.5"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </p>
  );
}
