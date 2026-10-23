import Swal from 'sweetalert2';

// Configuración base con paleta Crimson Sport y estilo SaaS Clean Pro
const customClass = {
  popup: 'rounded-2xl border border-slate-200 shadow-2xl p-6 font-sans',
  title: 'text-xl font-bold text-slate-800',
  htmlContainer: 'text-sm text-slate-600',
  confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all duration-150 mx-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2',
  cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 mx-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
};

// Toast discreto estilo notificación flotante
export const toast = (title, icon = 'success') => {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    didOpen: (toastEl) => {
      toastEl.onmouseenter = Swal.stopTimer;
      toastEl.onmouseleave = Swal.resumeTimer;
    },
    customClass: {
      popup: 'rounded-xl shadow-lg border border-slate-100 text-sm font-medium',
    },
  });
};

// Modal de éxito
export const alertaExito = (title, text = '') => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Aceptar',
    buttonsStyling: false,
    customClass,
  });
};

// Modal de error
export const alertaError = (title, text = '') => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
    buttonsStyling: false,
    customClass,
  });
};

// Modal de advertencia
export const alertaAdvertencia = (title, text = '') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Entendido',
    buttonsStyling: false,
    customClass,
  });
};

// Diálogo de confirmación (ej. para cerrar sesión o eliminar)
export const confirmarAccion = async ({
  title = '¿Estás seguro?',
  text = 'Esta acción no se puede deshacer',
  confirmButtonText = 'Sí, continuar',
  cancelButtonText = 'Cancelar',
  icon = 'question',
}) => {
  const result = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    buttonsStyling: false,
    customClass,
  });
  return result.isConfirmed;
};

export const pedirMotivoCancelacion = async () => {
  const result = await Swal.fire({
    icon: 'warning',
    title: '¿Cancelar esta orden?',
    text: 'La orden permanecerá en el historial.',
    input: 'textarea',
    inputLabel: 'Motivo de cancelación',
    inputPlaceholder: 'Escribe el motivo...',
    inputValidator: (value) => (!value?.trim() ? 'Indica el motivo para continuar.' : undefined),
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar orden',
    cancelButtonText: 'Volver',
    reverseButtons: true,
    buttonsStyling: false,
    customClass: { ...customClass, input: 'pro-input w-full p-3 text-sm' },
  });
  return result.isConfirmed ? result.value.trim() : null;
};

export default {
  toast,
  alertaExito,
  alertaError,
  alertaAdvertencia,
  confirmarAccion,
};
