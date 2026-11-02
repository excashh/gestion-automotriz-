import React, { useEffect, useId, useRef, useState } from 'react';
import { Users, Loader2, Check } from 'lucide-react';
import { clientesService } from '../services/api';
import { ModalDialog, ModalBanner, FieldError } from './ModalDialog';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ESTADO_INICIAL = {
  nombre: '',
  telefono: '',
  email: '',
  rfc: '',
  direccion: '',
};

export function ModalClienteForm({ open, onClose, onSaved }) {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerError, setBannerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bannerRef = useRef(null);
  const baseId = useId();

  useEffect(() => {
    if (open) {
      setFieldErrors({});
      setBannerError('');
      setSubmitting(false);
    }
  }, [open]);

  const validarCampo = (campo, valorActual) => {
    const val = typeof valorActual === 'string' ? valorActual.trim() : '';

    if (campo === 'nombre') {
      if (!val) return 'Ingresa el nombre completo o razón social del cliente.';
      if (val.length < 3) return 'El nombre debe contener al menos 3 caracteres.';
    }

    if (campo === 'telefono') {
      if (!val) return 'Ingresa un número de teléfono de contacto.';
      const digitos = val.replace(/\D/g, '');
      if (!/^[0-9+\-() ]+$/.test(val) || digitos.length < 7 || val.length > 20) {
        return 'Ingresa un teléfono válido de al menos 7 dígitos (solo números, espacios o guiones).';
      }
    }

    if (campo === 'email' && val) {
      if (!EMAIL_REGEX.test(val)) {
        return 'Formato de correo inválido. Ejemplo: cliente@dominio.com.';
      }
    }

    if (campo === 'rfc' && val) {
      const rfcUp = val.toUpperCase();
      if (rfcUp.length < 12 || rfcUp.length > 13 || !/^[A-ZÑ&0-9]{12,13}$/.test(rfcUp)) {
        return 'El RFC debe tener 12 caracteres (persona moral) o 13 caracteres (persona física), sin espacios ni guiones.';
      }
    }

    return '';
  };

  const handleBlur = (campo) => {
    const msg = validarCampo(campo, form[campo]);
    if (msg) {
      setFieldErrors((prev) => ({ ...prev, [campo]: msg }));
    }
  };

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (fieldErrors[campo]) {
      setFieldErrors((prev) => {
        const copia = { ...prev };
        delete copia[campo];
        return copia;
      });
    }
    if (bannerError) setBannerError('');
  };

  const validarTodo = () => {
    const nuevosErrores = {};
    for (const campo of ['nombre', 'telefono', 'email', 'rfc']) {
      const err = validarCampo(campo, form[campo]);
      if (err) nuevosErrores[campo] = err;
    }
    return nuevosErrores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const errores = validarTodo();
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      setBannerError('Revisa los campos marcados en rojo para poder registrar al cliente.');
      setTimeout(() => bannerRef.current?.focus(), 20);
      return;
    }

    setSubmitting(true);
    setBannerError('');
    try {
      const res = await clientesService.crearCliente({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim() || null,
        rfc: form.rfc.trim().toUpperCase() || null,
        direccion: form.direccion.trim() || null,
      });

      setForm(ESTADO_INICIAL);
      setFieldErrors({});
      if (onSaved) onSaved(res.cliente, res.mensaje);
      if (onClose) onClose();
    } catch (err) {
      if (err.errores && typeof err.errores === 'object') {
        setFieldErrors((prev) => ({ ...prev, ...err.errores }));
      } else if (err.campo) {
        setFieldErrors((prev) => ({ ...prev, [err.campo]: err.mensaje }));
      }
      setBannerError(
        err.mensaje || err.message || 'No fue posible registrar el cliente. Verifica los datos e intenta nuevamente.'
      );
      setTimeout(() => bannerRef.current?.focus(), 20);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelar = () => {
    if (submitting) return;
    setFieldErrors({});
    setBannerError('');
    if (onClose) onClose();
  };

  return (
    <ModalDialog
      open={open}
      onClose={handleCancelar}
      title="Registrar Nuevo Cliente"
      subtitle="Captura los datos de contacto. Si ocurre un error, tus datos se conservarán aquí."
      icon={Users}
      maxWidth="32rem"
      busy={submitting}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ModalBanner
          type="error"
          title="No se pudo guardar el cliente"
          message={bannerError}
          bannerRef={bannerRef}
          onDismiss={() => setBannerError('')}
        />

        <div>
          <label
            htmlFor={`${baseId}-nombre`}
            className="text-xs font-bold text-slate-700 block mb-1"
          >
            Nombre completo o razón social <span className="text-rose-600">*</span>
          </label>
          <input
            id={`${baseId}-nombre`}
            name="nombre"
            type="text"
            autoComplete="name"
            required
            placeholder="Ej. Roberto Gómez Pérez o Transportes del Norte S.A."
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            onBlur={() => handleBlur('nombre')}
            aria-invalid={fieldErrors.nombre ? 'true' : undefined}
            aria-describedby={fieldErrors.nombre ? `${baseId}-err-nombre` : undefined}
            className={`pro-input w-full text-sm p-2.5 ${fieldErrors.nombre ? 'pro-input-error' : ''}`}
          />
          <FieldError id={`${baseId}-err-nombre`} message={fieldErrors.nombre} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor={`${baseId}-telefono`}
              className="text-xs font-bold text-slate-700 block mb-1"
            >
              Teléfono <span className="text-rose-600">*</span>
            </label>
            <input
              id={`${baseId}-telefono`}
              name="telefono"
              type="tel"
              autoComplete="tel"
              required
              placeholder="Ej. 555-123-4567"
              value={form.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              onBlur={() => handleBlur('telefono')}
              aria-invalid={fieldErrors.telefono ? 'true' : undefined}
              aria-describedby={fieldErrors.telefono ? `${baseId}-err-tel` : undefined}
              className={`pro-input w-full text-sm p-2.5 ${fieldErrors.telefono ? 'pro-input-error' : ''}`}
            />
            <FieldError id={`${baseId}-err-tel`} message={fieldErrors.telefono} />
          </div>

          <div>
            <label
              htmlFor={`${baseId}-rfc`}
              className="text-xs font-bold text-slate-700 block mb-1"
            >
              RFC <span className="text-slate-400 font-normal">(Opcional, 12–13 car.)</span>
            </label>
            <input
              id={`${baseId}-rfc`}
              name="rfc"
              type="text"
              maxLength={13}
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XAXX010101000"
              value={form.rfc}
              onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('rfc')}
              aria-invalid={fieldErrors.rfc ? 'true' : undefined}
              aria-describedby={fieldErrors.rfc ? `${baseId}-err-rfc` : undefined}
              className={`pro-input w-full text-sm p-2.5 font-mono uppercase ${
                fieldErrors.rfc ? 'pro-input-error' : ''
              }`}
            />
            <FieldError id={`${baseId}-err-rfc`} message={fieldErrors.rfc} />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${baseId}-email`}
            className="text-xs font-bold text-slate-700 block mb-1"
          >
            Correo electrónico <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <input
            id={`${baseId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="cliente@correo.com"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            aria-invalid={fieldErrors.email ? 'true' : undefined}
            aria-describedby={fieldErrors.email ? `${baseId}-err-email` : undefined}
            className={`pro-input w-full text-sm p-2.5 ${fieldErrors.email ? 'pro-input-error' : ''}`}
          />
          <FieldError id={`${baseId}-err-email`} message={fieldErrors.email} />
        </div>

        <div>
          <label
            htmlFor={`${baseId}-direccion`}
            className="text-xs font-bold text-slate-700 block mb-1"
          >
            Dirección <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <textarea
            id={`${baseId}-direccion`}
            name="direccion"
            rows={2}
            autoComplete="street-address"
            placeholder="Calle, número, colonia y ciudad..."
            value={form.direccion}
            onChange={(e) => handleChange('direccion', e.target.value)}
            className="pro-input w-full text-sm p-2.5"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={submitting}
            onClick={handleCancelar}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="pro-btn-crimson px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando cliente...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Guardar Cliente
              </>
            )}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
