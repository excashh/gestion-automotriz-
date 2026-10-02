import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Repuesto, CategoriaRepuesto, MovimientoInventario } from '../../types';
import { Pagination } from '../common/Pagination';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Sliders,
  History,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export const InventarioView: React.FC = () => {
  const { isAdmin, isRecepcionista } = useAuth();
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRepuesto[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [sortCol, setSortCol] = useState('nombre');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRepuesto, setEditingRepuesto] = useState<Repuesto | null>(null);
  const [formData, setFormData] = useState({
    categoria_id: '',
    codigo: '',
    nombre: '',
    marca: '',
    descripcion: '',
    precio_compra: 0,
    precio_venta: 0,
    stock: 0,
    stock_minimo: 5,
    ubicacion: 'Almacén Central',
  });

  // Modal Stock Adjustment (Kárdex transaction)
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [repuestoToAdjust, setRepuestoToAdjust] = useState<Repuesto | null>(null);
  const [adjustData, setAdjustData] = useState({
    tipo: 'entrada' as 'entrada' | 'ajuste' | 'salida',
    cantidad: 1,
    motivo: '',
  });
  const [adjusting, setAdjusting] = useState(false);

  // Modal Kardex History
  const [kardexModalOpen, setKardexModalOpen] = useState(false);
  const [selectedRepuestoKardex, setSelectedRepuestoKardex] = useState<{
    repuesto: Repuesto;
    movimientos: MovimientoInventario[];
  } | null>(null);
  const [loadingKardex, setLoadingKardex] = useState(false);

  // Modal Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [repuestoToDelete, setRepuestoToDelete] = useState<Repuesto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRepuestos = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getRepuestos({
        search: search.trim(),
        categoria_id: categoriaFilter ? Number(categoriaFilter) : undefined,
        stock_bajo: soloBajoStock,
        page: pagina,
        limit: limite,
        sort: sortCol,
        order: sortOrder,
      });
      setRepuestos(res.datos);
      setTotal(res.total);
      setTotalPaginas(res.totalPaginas);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepuestos();
  }, [pagina, limite, categoriaFilter, soloBajoStock, sortCol, sortOrder]);

  useEffect(() => {
    async function loadCategorias() {
      try {
        const cats = await api.getCategorias();
        setCategorias(cats);
      } catch (e) {
        console.error(e);
      }
    }
    loadCategorias();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    fetchRepuestos();
  };

  const handleOpenCreate = () => {
    setEditingRepuesto(null);
    setFormData({
      categoria_id: categorias.length > 0 ? String(categorias[0].id) : '',
      codigo: '',
      nombre: '',
      marca: '',
      descripcion: '',
      precio_compra: 0,
      precio_venta: 0,
      stock: 0,
      stock_minimo: 5,
      ubicacion: 'Almacén Central',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (r: Repuesto) => {
    setEditingRepuesto(r);
    setFormData({
      categoria_id: String(r.categoria_id),
      codigo: r.codigo,
      nombre: r.nombre,
      marca: r.marca,
      descripcion: r.descripcion || '',
      precio_compra: r.precio_compra,
      precio_venta: r.precio_venta,
      stock: r.stock,
      stock_minimo: r.stock_minimo,
      ubicacion: r.ubicacion || 'Almacén Central',
    });
    setModalOpen(true);
  };

  const handleSaveRepuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (formData.precio_venta < formData.precio_compra) {
      setErrorMsg('El precio de venta no puede ser inferior al precio de compra (costo).');
      return;
    }

    try {
      const payload = {
        ...formData,
        categoria_id: Number(formData.categoria_id),
      };
      if (editingRepuesto) {
        await api.updateRepuesto(editingRepuesto.id, payload);
      } else {
        await api.createRepuesto(payload);
      }
      setModalOpen(false);
      fetchRepuestos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando repuesto');
    }
  };

  const handleOpenAdjust = (r: Repuesto) => {
    setRepuestoToAdjust(r);
    setAdjustData({
      tipo: 'entrada',
      cantidad: 5,
      motivo: 'Reabastecimiento con factura de proveedor',
    });
    setStockModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repuestoToAdjust) return;

    try {
      setAdjusting(true);
      await api.ajustarStock(repuestoToAdjust.id, adjustData);
      setStockModalOpen(false);
      setRepuestoToAdjust(null);
      fetchRepuestos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al ajustar existencias');
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenKardex = async (id: number) => {
    try {
      setLoadingKardex(true);
      setKardexModalOpen(true);
      const res = await api.getRepuesto(id);
      setSelectedRepuestoKardex(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando movimientos de kárdex');
    } finally {
      setLoadingKardex(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!repuestoToDelete) return;
    try {
      setDeleting(true);
      await api.deleteRepuesto(repuestoToDelete.id);
      setDeleteModalOpen(false);
      setRepuestoToDelete(null);
      fetchRepuestos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error desactivando repuesto');
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortCol === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortCol(column);
      setSortOrder('ASC');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Catálogo de Repuestos & Inventario</h2>
          <p className="text-xs text-slate-500 mt-1">
            Control de refacciones, alertas de stock mínimo, kárdex de almacén y precios de venta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRepuestos}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {(isAdmin || isRecepcionista) && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-xs text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Repuesto</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código de parte, nombre, marca o descripción..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Categoría:</span>
            <select
              value={categoriaFilter}
              onChange={(e) => {
                setCategoriaFilter(e.target.value);
                setPagina(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">Todas las Categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={soloBajoStock}
              onChange={(e) => {
                setSoloBajoStock(e.target.checked);
                setPagina(1);
              }}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" /> Mostrar solo repuestos con Stock Crítico
            </span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 text-xs border-b border-red-200">{errorMsg}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th
                  onClick={() => handleSort('codigo')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Código</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombre')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Descripción de la Parte</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Costo Compra</th>
                <th
                  onClick={() => handleSort('precio_venta')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Precio Venta</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('stock')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Existencia / Mínimo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Ubicación</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    Consultando inventario de partes y refacciones...
                  </td>
                </tr>
              ) : repuestos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No se encontraron repuestos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                repuestos.map((r) => {
                  const isLow = r.stock <= r.stock_minimo;
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLow ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.codigo}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{r.nombre}</div>
                        <div className="text-[11px] text-slate-400">Marca: {r.marca}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{r.categoria_nombre}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 tabular-nums">
                        {formatCurrency(r.precio_compra)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(r.precio_venta)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 font-mono text-[11px] font-bold rounded ${
                            isLow
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {r.stock} / {r.stock_minimo} mín
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{r.ubicacion}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenKardex(r.id)}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                            title="Ver Kárdex de Movimientos"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {(isAdmin || isRecepcionista) && (
                            <>
                              <button
                                onClick={() => handleOpenAdjust(r)}
                                className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                                title="Ajustar Stock / Reabastecer"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(r)}
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                title="Editar Repuesto"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setRepuestoToDelete(r);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagina}
          totalPages={totalPaginas}
          totalItems={total}
          pageSize={limite}
          onPageChange={setPagina}
          onPageSizeChange={(newLimit) => {
            setLimite(newLimit);
            setPagina(1);
          }}
        />
      </div>

      {/* Modal Crear / Editar Repuesto */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRepuesto ? 'Editar Repuesto' : 'Registrar Nuevo Repuesto'}
        subtitle="Control de costos, precios sugeridos y umbrales de reabastecimiento"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRepuesto} className="space-y-4 text-xs text-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Código de Parte / SKU *</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                required
                placeholder="Ej. REP-FR-004"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Categoría *</label>
              <select
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Seleccionar --</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nombre / Descripción Corta *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej. Balatas de Freno Delanteras"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Marca / Fabricante *</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                required
                placeholder="Ej. Brembo / Wagner / Mann"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Precio Compra (Costo) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.precio_compra}
                onChange={(e) => setFormData({ ...formData, precio_compra: Number(e.target.value) })}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Precio Venta (Público) *</label>
              <input
                type="number"
                step="0.01"
                min={formData.precio_compra}
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: Number(e.target.value) })}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Debe ser mayor o igual al costo</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {!editingRepuesto && (
              <div>
                <label className="block font-semibold mb-1">Stock Inicial *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
            <div>
              <label className="block font-semibold mb-1">Stock Mínimo (Alerta) *</label>
              <input
                type="number"
                min="1"
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className={editingRepuesto ? 'col-span-2' : ''}>
              <label className="block font-semibold mb-1">Ubicación Física</label>
              <input
                type="text"
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                placeholder="Ej. Pasillo B - Estante 3"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors"
            >
              {editingRepuesto ? 'Guardar Cambios' : 'Registrar Repuesto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste de Stock / Reabastecimiento */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title="Ajuste de Existencias / Kárdex"
        subtitle={repuestoToAdjust ? `${repuestoToAdjust.nombre} (${repuestoToAdjust.codigo})` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
            <span>Existencia Actual en Almacén:</span>
            <strong className="font-mono text-sm text-slate-900">{repuestoToAdjust?.stock} uds.</strong>
          </div>

          <div>
            <label className="block font-semibold mb-1">Tipo de Movimiento *</label>
            <select
              value={adjustData.tipo}
              onChange={(e) =>
                setAdjustData({ ...adjustData, tipo: e.target.value as 'entrada' | 'ajuste' | 'salida' })
              }
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="entrada">Entrada (Compra / Reabastecimiento de Proveedor)</option>
              <option value="ajuste">Salida / Ajuste de Merma o Daño</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Cantidad a Modificar *</label>
            <input
              type="number"
              min="1"
              max={adjustData.tipo === 'ajuste' ? repuestoToAdjust?.stock : 999}
              value={adjustData.cantidad}
              onChange={(e) => setAdjustData({ ...adjustData, cantidad: Number(e.target.value) })}
              required
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Motivo / Justificación *</label>
            <textarea
              value={adjustData.motivo}
              onChange={(e) => setAdjustData({ ...adjustData, motivo: e.target.value })}
              required
              rows={2}
              placeholder="Ej. Factura F-9902 de Brembo México"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStockModalOpen(false)}
              disabled={adjusting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adjusting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
            >
              {adjusting ? 'Aplicando Kárdex...' : 'Registrar en Kárdex'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial de Kárdex */}
      <Modal
        isOpen={kardexModalOpen}
        onClose={() => setKardexModalOpen(false)}
        title="Kárdex de Movimientos de Inventario"
        subtitle={selectedRepuestoKardex ? `${selectedRepuestoKardex.repuesto.nombre} (${selectedRepuestoKardex.repuesto.codigo})` : ''}
        maxWidth="2xl"
      >
        {loadingKardex ? (
          <div className="py-8 text-center text-slate-400 italic text-xs animate-pulse">
            Consultando registros en la base de datos...
          </div>
        ) : selectedRepuestoKardex ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900">{selectedRepuestoKardex.repuesto.nombre}</span>
                <span className="text-slate-500 ml-2 font-mono">{selectedRepuestoKardex.repuesto.codigo}</span>
              </div>
              <div className="font-mono font-bold text-slate-800">
                Stock actual: {selectedRepuestoKardex.repuesto.stock} uds.
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Historial de Transacciones ({selectedRepuestoKardex.movimientos.length})
              </h4>
              {selectedRepuestoKardex.movimientos.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center">
                  Sin movimientos de inventario registrados para este artículo.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedRepuestoKardex.movimientos.map((m) => {
                    const isEntry = m.tipo === 'entrada';
                    return (
                      <div
                        key={m.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              isEntry ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {isEntry ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{m.motivo}</div>
                            <div className="text-[11px] text-slate-400">
                              {m.created_at} · Operador: {m.usuario_nombre}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className={`font-bold ${isEntry ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {isEntry ? `+${m.cantidad}` : `-${m.cantidad}`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m.stock_anterior} → {m.stock_nuevo} uds
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Desactivar Repuesto"
        message={`¿Está seguro de que desea desactivar el repuesto "${repuestoToDelete?.nombre}" (${repuestoToDelete?.codigo})?`}
        confirmText="Confirmar Baja"
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
};
