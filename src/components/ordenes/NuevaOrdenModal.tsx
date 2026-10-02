import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { Cliente, Vehiculo, Repuesto, Usuario } from '../../types';
import { Plus, Trash2, AlertCircle, Wrench, Package, Car, User } from 'lucide-react';

interface NuevaOrdenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NuevaOrdenModal: React.FC<NuevaOrdenModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [repuestosCatalogo, setRepuestosCatalogo] = useState<Repuesto[]>([]);

  // Form State
  const [clienteId, setClienteId] = useState<string>('');
  const [vehiculoId, setVehiculoId] = useState<string>('');
  const [tecnicoId, setTecnicoId] = useState<string>('');
  const [kilometrajeIngreso, setKilometrajeIngreso] = useState<string>('');
  const [nivelCombustible, setNivelCombustible] = useState<string>('1/2');
  const [motivoIngreso, setMotivoIngreso] = useState<string>('');
  const [diagnostico, setDiagnostico] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [fechaEstimada, setFechaEstimada] = useState<string>('');

  // Items State
  const [partesSeleccionadas, setPartesSeleccionadas] = useState<
    Array<{ repuesto_id: number; cantidad: number; precio_unitario: number }>
  >([]);
  const [serviciosManoObra, setServiciosManoObra] = useState<
    Array<{ descripcion: string; horas: number; costo_hora: number }>
  >([{ descripcion: 'Servicio general de diagnóstico y revisión', horas: 1, costo_hora: 300 }]);

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar catálogos al abrir modal
  useEffect(() => {
    if (!isOpen) return;

    async function loadInitialData() {
      try {
        setLoadingData(true);
        setErrorMsg(null);
        const [cliRes, tecRes, repRes] = await Promise.all([
          api.getClientes({ limit: 100 }),
          api.getUsuarios(),
          api.getRepuestos({ limit: 100 }),
        ]);
        setClientes(cliRes.datos);
        setTecnicos(tecRes.filter((u) => u.rol === 'tecnico'));
        setRepuestosCatalogo(repRes.datos);
      } catch (err: any) {
        setErrorMsg('Error al cargar catálogos: ' + err.message);
      } finally {
        setLoadingData(false);
      }
    }
    loadInitialData();
  }, [isOpen]);

  // Filtrar vehículos cuando cambia el cliente seleccionado
  useEffect(() => {
    if (!clienteId) {
      setVehiculos([]);
      setVehiculoId('');
      setKilometrajeIngreso('');
      return;
    }

    async function loadClientVehicles() {
      try {
        const res = await api.getVehiculos({ cliente_id: Number(clienteId), limit: 50 });
        setVehiculos(res.datos);
        if (res.datos.length > 0) {
          setVehiculoId(String(res.datos[0].id));
          setKilometrajeIngreso(String(res.datos[0].kilometraje));
        } else {
          setVehiculoId('');
          setKilometrajeIngreso('');
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadClientVehicles();
  }, [clienteId]);

  // Actualizar kilometraje mínimo sugerido cuando cambia el vehículo
  const vehiculoSeleccionado = vehiculos.find((v) => String(v.id) === vehiculoId);
  useEffect(() => {
    if (vehiculoSeleccionado) {
      setKilometrajeIngreso(String(vehiculoSeleccionado.kilometraje));
    }
  }, [vehiculoId]);

  // Handlers para repuestos
  const handleAddPart = () => {
    if (repuestosCatalogo.length === 0) return;
    const firstAvailable = repuestosCatalogo.find((r) => r.stock > 0) || repuestosCatalogo[0];
    setPartesSeleccionadas([
      ...partesSeleccionadas,
      {
        repuesto_id: firstAvailable.id,
        cantidad: 1,
        precio_unitario: firstAvailable.precio_venta,
      },
    ]);
  };

  const handleUpdatePart = (index: number, field: string, value: any) => {
    const updated = [...partesSeleccionadas];
    if (field === 'repuesto_id') {
      const repId = Number(value);
      const rep = repuestosCatalogo.find((r) => r.id === repId);
      updated[index].repuesto_id = repId;
      if (rep) updated[index].precio_unitario = rep.precio_venta;
    } else if (field === 'cantidad') {
      updated[index].cantidad = Math.max(1, Number(value));
    }
    setPartesSeleccionadas(updated);
  };

  const handleRemovePart = (index: number) => {
    setPartesSeleccionadas(partesSeleccionadas.filter((_, i) => i !== index));
  };

  // Handlers para mano de obra
  const handleAddLabor = () => {
    setServiciosManoObra([
      ...serviciosManoObra,
      { descripcion: 'Mano de obra especializada', horas: 1, costo_hora: 350 },
    ]);
  };

  const handleUpdateLabor = (index: number, field: string, value: any) => {
    const updated = [...serviciosManoObra];
    if (field === 'descripcion') updated[index].descripcion = value;
    if (field === 'horas') updated[index].horas = Math.max(0.5, Number(value));
    if (field === 'costo_hora') updated[index].costo_hora = Math.max(0, Number(value));
    setServiciosManoObra(updated);
  };

  const handleRemoveLabor = (index: number) => {
    setServiciosManoObra(serviciosManoObra.filter((_, i) => i !== index));
  };

  // Totales Reactivos
  const repuestosCosto = partesSeleccionadas.reduce((acc, p) => acc + p.cantidad * p.precio_unitario, 0);
  const manoObraCosto = serviciosManoObra.reduce((acc, s) => acc + s.horas * s.costo_hora, 0);
  const subtotal = repuestosCosto + manoObraCosto;
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clienteId || !vehiculoId || !motivoIngreso) {
      setErrorMsg('Debe seleccionar cliente, vehículo y especificar el motivo de ingreso');
      return;
    }

    const km = Number(kilometrajeIngreso);
    if (vehiculoSeleccionado && km < vehiculoSeleccionado.kilometraje) {
      setErrorMsg(
        `Regla de Negocio: El kilometraje ingresado (${km} km) no puede ser menor al kilometraje registrado anteriormente (${vehiculoSeleccionado.kilometraje} km).`
      );
      return;
    }

    // Validar existencias
    for (const item of partesSeleccionadas) {
      const rep = repuestosCatalogo.find((r) => r.id === item.repuesto_id);
      if (rep && rep.stock < item.cantidad) {
        setErrorMsg(
          `Stock insuficiente para "${rep.nombre}". Existencias actuales: ${rep.stock}, solicitado: ${item.cantidad}`
        );
        return;
      }
    }

    try {
      setSaving(true);
      await api.createOrden({
        cliente_id: Number(clienteId),
        vehiculo_id: Number(vehiculoId),
        tecnico_id: tecnicoId ? Number(tecnicoId) : null,
        kilometraje_ingreso: km,
        nivel_combustible: nivelCombustible,
        motivo_ingreso: motivoIngreso,
        diagnostico: diagnostico,
        observaciones: observaciones,
        fecha_estimada_entrega: fechaEstimada || null,
        repuestos: partesSeleccionadas,
        mano_obra: serviciosManoObra,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la orden de servicio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Orden de Servicio Automotriz (POS)"
      subtitle="Recepción técnica de vehículo, cotización y apertura de folio"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-700">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sección 1: Cliente y Vehículo */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900 pb-2 border-b border-slate-200">
            <Car className="w-4 h-4 text-amber-600" />
            <span>1. Datos de Identificación y Vehículo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Cliente Solicitante *</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Seleccionar Cliente --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.documento_identidad})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Vehículo a Reparar *</label>
              <select
                value={vehiculoId}
                onChange={(e) => setVehiculoId(e.target.value)}
                required
                disabled={!clienteId || vehiculos.length === 0}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {vehiculos.length === 0 ? 'Sin vehículos para este cliente' : '-- Seleccionar Vehículo --'}
                </option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} ({v.anio}) · Placa: {v.placa} ({v.kilometraje} km)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Kilometraje de Ingreso *</label>
              <input
                type="number"
                value={kilometrajeIngreso}
                onChange={(e) => setKilometrajeIngreso(e.target.value)}
                required
                min={vehiculoSeleccionado?.kilometraje || 0}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
                placeholder="Ej. 86500"
              />
              {vehiculoSeleccionado && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Último odómetro registrado: {vehiculoSeleccionado.kilometraje.toLocaleString()} km
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-1">Nivel de Combustible</label>
              <select
                value={nivelCombustible}
                onChange={(e) => setNivelCombustible(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="Reserva">Reserva</option>
                <option value="1/4">1/4 Tanque</option>
                <option value="1/2">1/2 Tanque</option>
                <option value="3/4">3/4 Tanque</option>
                <option value="Lleno">Tanque Lleno</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Técnico Mecánico Asignado</label>
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Asignar más adelante --</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sección 2: Diagnóstico y Motivo */}
        <div className="space-y-3">
          <div>
            <label className="block font-semibold mb-1">Motivo de Ingreso / Fallas Reportadas *</label>
            <textarea
              value={motivoIngreso}
              onChange={(e) => setMotivoIngreso(e.target.value)}
              required
              rows={2}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              placeholder="Descripción del cliente (ruidos, pérdida de potencia, servicio de afinación programado...)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Diagnóstico Técnico Inicial</label>
              <textarea
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                placeholder="Hallazgos preliminares o códigos OBD2..."
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Fecha Estimada de Entrega</label>
              <input
                type="datetime-local"
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Refacciones / Insumos */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Package className="w-4 h-4 text-amber-600" />
              <span>2. Refacciones e Insumos de Inventario</span>
            </div>
            <button
              type="button"
              onClick={handleAddPart}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-md text-[11px] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Refacción
            </button>
          </div>

          {partesSeleccionadas.length === 0 ? (
            <p className="text-slate-400 italic text-[11px] py-1 text-center">
              No se han agregado refacciones a la cotización aún.
            </p>
          ) : (
            <div className="space-y-2">
              {partesSeleccionadas.map((item, idx) => {
                const rep = repuestosCatalogo.find((r) => r.id === item.repuesto_id);
                return (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <select
                        value={item.repuesto_id}
                        onChange={(e) => handleUpdatePart(idx, 'repuesto_id', e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-none"
                      >
                        {repuestosCatalogo.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.codigo} - {r.nombre} ({r.marca}) · Stock: {r.stock} · ${r.precio_venta}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        max={rep?.stock || 99}
                        value={item.cantidad}
                        onChange={(e) => handleUpdatePart(idx, 'cantidad', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-mono text-xs"
                        title="Cantidad"
                      />
                    </div>

                    <div className="w-24 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(item.cantidad * item.precio_unitario)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePart(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sección 4: Mano de Obra */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>3. Operaciones de Mano de Obra</span>
            </div>
            <button
              type="button"
              onClick={handleAddLabor}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-md text-[11px] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Operación
            </button>
          </div>

          <div className="space-y-2">
            {serviciosManoObra.map((serv, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="text"
                  value={serv.descripcion}
                  onChange={(e) => handleUpdateLabor(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción del servicio"
                  className="flex-1 bg-transparent border-none text-xs text-slate-800 focus:outline-none"
                />

                <div className="w-16">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={serv.horas}
                    onChange={(e) => handleUpdateLabor(idx, 'horas', e.target.value)}
                    placeholder="Hrs"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-mono text-xs"
                    title="Horas de trabajo"
                  />
                </div>

                <div className="w-20">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={serv.costo_hora}
                    onChange={(e) => handleUpdateLabor(idx, 'costo_hora', e.target.value)}
                    placeholder="$/Hr"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-right font-mono text-xs"
                    title="Tarifa por hora"
                  />
                </div>

                <div className="w-24 text-right font-mono font-medium text-slate-900 tabular-nums">
                  {formatCurrency(serv.horas * serv.costo_hora)}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveLabor(idx)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen Financiero Reactive Box */}
        <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Refacciones:</span>
              <span className="font-mono font-semibold">{formatCurrency(repuestosCosto)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Mano de Obra:</span>
              <span className="font-mono font-semibold">{formatCurrency(manoObraCosto)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">I.V.A. (16%):</span>
              <span className="font-mono font-semibold">{formatCurrency(iva)}</span>
            </div>
          </div>

          <div className="text-right flex items-baseline gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total a Facturar:</span>
            <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm transition-colors"
          >
            {saving ? 'Registrando Orden...' : 'Crear Orden de Servicio'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
