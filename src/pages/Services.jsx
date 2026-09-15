/**
 * Services — Manager-only Service Management page (100% Full Width & Responsive)
 *
 * Features:
 *   - View all services
 *   - + Add Service (Name, Category: Nails/Facial/Massage, Price, Duration, Status)
 *   - Edit Service
 *   - Toggle Active / Inactive
 *   - Delete Service (with confirmation)
 */

import { useState } from 'react';
import { Plus, Pencil, Check, X, Sparkles, Clock, DollarSign, ToggleLeft, ToggleRight, Layers, Trash2 } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useServices } from '../context/ServicesContext';

// Categories are now dynamic from specialties

const categoryBadgeStyles = {
  Nails: 'bg-dusty-rose-soft text-dusty-rose border-dusty-rose/20',
  Facial: 'bg-[#E8EFF8] text-[#4A6B8A] border-[#4A6B8A]/20',
  Massage: 'bg-sage-soft text-sage border-sage/20',
  'Body Massage': 'bg-sage-soft text-sage border-sage/20',
};

export default function Services() {
  const { services, addService, editService, toggleServiceActive, deleteService, getActiveSpecialties } = useServices();
  const activeCategories = getActiveSpecialties().map((s) => s.name);

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saved, setSaved] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Nails',
    price: '15,000',
    duration: '45 min',
    active: true,
  });

  const resetForm = () => {
    setForm({
      name: '',
      category: 'Nails',
      price: '15,000',
      duration: '45 min',
      active: true,
    });
    setEditingService(null);
    setSaved(false);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (svc) => {
    setEditingService(svc);
    setForm({
      name: svc.name,
      category: svc.category,
      price: svc.price,
      duration: svc.duration,
      active: svc.active !== false,
    });
    setSaved(false);
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingService) {
      editService(editingService.id, {
        name: form.name.trim(),
        category: form.category,
        price: form.price,
        duration: form.duration,
        active: form.active,
      });
    } else {
      addService({
        name: form.name.trim(),
        category: form.category,
        price: form.price,
        duration: form.duration,
        active: form.active,
      });
    }

    setSaved(true);
    setTimeout(() => {
      setShowModal(false);
      resetForm();
    }, 700);
  };

  const handleDelete = (id) => {
    deleteService(id);
    setConfirmDeleteId(null);
    if (editingService && editingService.id === id) {
      setShowModal(false);
      resetForm();
    }
  };

  const activeServices = services.filter((s) => s.active !== false);
  const inactiveServices = services.filter((s) => s.active === false);

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Services"
        subtitle="Manage spa services, pricing, duration, and categories."
        action={
          <Button onClick={openAddModal}>
            <Plus size={16} strokeWidth={2} />
            Add Service
          </Button>
        }
      />

      {/* Active Services Table */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden w-full">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
            Active Services ({activeServices.length})
          </h3>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b border-border bg-soft-cream/40">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Service Name
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Price (FCFA)
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Duration
                </th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {activeServices.map((svc) => (
                <tr
                  key={svc.id}
                  className="border-b border-border/40 last:border-b-0 hover:bg-soft-cream/30 transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-semibold text-charcoal">
                    {svc.name}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-[7px] text-[11px] font-semibold border ${
                        categoryBadgeStyles[svc.category] || 'bg-soft-cream text-charcoal border-border'
                      }`}
                    >
                      {svc.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-charcoal whitespace-nowrap">
                    {svc.price} FCFA
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-gray whitespace-nowrap">
                    {svc.duration}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[10px] font-semibold bg-success-soft text-success border border-success/20">
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(svc)}
                        className="h-[32px] px-2.5 rounded-[7px] text-[11px] font-medium text-charcoal bg-soft-cream border border-border hover:bg-sage-soft hover:border-sage/30 transition-all cursor-pointer inline-flex items-center gap-1"
                        title="Edit Service"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => toggleServiceActive(svc.id)}
                        className="h-[32px] px-2.5 rounded-[7px] text-[11px] font-medium text-muted-gray bg-white border border-border hover:bg-soft-cream transition-all cursor-pointer inline-flex items-center gap-1"
                        title="Deactivate Service"
                      >
                        Deactivate
                      </button>
                      {confirmDeleteId === svc.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(svc.id)}
                            className="h-[32px] px-2.5 rounded-[7px] text-[11px] font-semibold text-white bg-[#B34040] hover:bg-[#962d2d] transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                          >
                            <Trash2 size={11} /> Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-[32px] px-2 rounded-[7px] text-[11px] font-medium text-muted-gray bg-white border border-border hover:bg-soft-cream transition-all cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(svc.id)}
                          className="h-[32px] px-2.5 rounded-[7px] text-[11px] font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Delete Service"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Portrait Cards View */}
        <div className="block md:hidden divide-y divide-border/60">
          {activeServices.map((svc) => (
            <div key={svc.id} className="p-4 space-y-3 hover:bg-soft-cream/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-charcoal">{svc.name}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border ${
                        categoryBadgeStyles[svc.category] || 'bg-soft-cream text-charcoal border-border'
                      }`}
                    >
                      {svc.category}
                    </span>
                    <span className="text-xs text-muted-gray font-medium flex items-center gap-1">
                      <Clock size={11} /> {svc.duration}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-charcoal">{svc.price} FCFA</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-[5px] text-[10px] font-semibold bg-success-soft text-success border border-success/20">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <button
                  onClick={() => openEditModal(svc)}
                  className="flex-1 h-[40px] px-3 rounded-[10px] text-xs font-semibold text-charcoal bg-soft-cream border border-border hover:bg-sage-soft hover:border-sage/30 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => toggleServiceActive(svc.id)}
                  className="flex-1 h-[40px] px-3 rounded-[10px] text-xs font-medium text-muted-gray bg-white border border-border hover:bg-soft-cream transition-all cursor-pointer inline-flex items-center justify-center"
                >
                  Deactivate
                </button>
                {confirmDeleteId === svc.id ? (
                  <div className="inline-flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(svc.id)}
                      className="h-[40px] px-3 rounded-[10px] text-xs font-semibold text-white bg-[#B34040] hover:bg-[#962d2d] transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="h-[40px] px-2.5 rounded-[10px] text-xs font-medium text-muted-gray bg-white border border-border cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(svc.id)}
                    className="h-[40px] px-3 rounded-[10px] text-xs font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                    title="Delete Service"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inactive Services Table */}
      {inactiveServices.length > 0 && (
        <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden w-full opacity-75">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-muted-gray uppercase tracking-wider">
              Inactive Services ({inactiveServices.length})
            </h3>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full min-w-[620px]">
              <tbody>
                {inactiveServices.map((svc) => (
                  <tr
                    key={svc.id}
                    className="border-b border-border/40 last:border-b-0 hover:bg-soft-cream/30 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-muted-gray line-through">
                      {svc.name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-[7px] text-[11px] font-medium bg-soft-cream text-muted-gray border border-border">
                        {svc.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-gray">
                      {svc.price} FCFA
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-gray">
                      {svc.duration}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-medium bg-soft-cream text-muted-gray border border-border">
                        Inactive
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleServiceActive(svc.id)}
                          className="h-[30px] px-2.5 rounded-[7px] text-[11px] font-medium text-success bg-success-soft border border-success/20 hover:bg-success/20 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          Reactivate
                        </button>
                        {confirmDeleteId === svc.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(svc.id)}
                              className="h-[30px] px-2.5 rounded-[7px] text-[11px] font-semibold text-white bg-[#B34040] hover:bg-[#962d2d] transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                            >
                              <Trash2 size={11} /> Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="h-[30px] px-2 rounded-[7px] text-[11px] font-medium text-muted-gray bg-white border border-border hover:bg-soft-cream transition-all cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(svc.id)}
                            className="h-[30px] px-2.5 rounded-[7px] text-[11px] font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Delete Service"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Portrait Inactive Cards */}
          <div className="block md:hidden divide-y divide-border/60">
            {inactiveServices.map((svc) => (
              <div key={svc.id} className="p-4 space-y-2.5 hover:bg-soft-cream/20 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-muted-gray line-through">{svc.name}</h4>
                    <p className="text-xs text-muted-gray mt-0.5">{svc.category} · {svc.duration}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-muted-gray">{svc.price} FCFA</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-[5px] text-[9px] font-medium bg-soft-cream text-muted-gray border border-border">
                      Inactive
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <button
                    onClick={() => toggleServiceActive(svc.id)}
                    className="flex-1 h-[38px] px-3 rounded-[9px] text-xs font-semibold text-success bg-success-soft border border-success/20 hover:bg-success/20 transition-all cursor-pointer inline-flex items-center justify-center"
                  >
                    Reactivate
                  </button>
                  {confirmDeleteId === svc.id ? (
                    <div className="inline-flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDelete(svc.id)}
                        className="h-[38px] px-3 rounded-[9px] text-xs font-semibold text-white bg-[#B34040] hover:bg-[#962d2d] transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-[38px] px-2 rounded-[9px] text-xs font-medium text-muted-gray bg-white border border-border cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(svc.id)}
                      className="h-[38px] px-3 rounded-[9px] text-xs font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                      title="Delete Service"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-charcoal/40 z-[60] flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-[calc(100vw-24px)] sm:max-w-[440px] bg-white border border-border rounded-[20px] p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-charcoal">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-soft-cream"
              >
                <X size={18} />
              </button>
            </div>

            {saved ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-success-soft border border-success/20 flex items-center justify-center mx-auto mb-2 text-success">
                  <Check size={22} />
                </div>
                <p className="text-sm font-semibold text-charcoal">
                  {editingService ? 'Service Updated!' : 'Service Created!'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3.5">
                {/* Service Name */}
                <div>
                  <label className="block text-[12px] font-medium text-muted-gray mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Deluxe Pedicure"
                    className="w-full h-[44px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[12px] font-medium text-muted-gray mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-[44px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer"
                  >
                    {activeCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-muted-gray mb-1">
                      Price (FCFA) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="15,000"
                      className="w-full h-[44px] px-3.5 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-muted-gray mb-1">
                      Duration *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="45 min"
                      className="w-full h-[44px] px-3.5 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-muted-gray">Service Status:</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      form.active
                        ? 'bg-success-soft text-success border-success/30'
                        : 'bg-soft-cream text-muted-gray border-border'
                    }`}
                  >
                    {form.active ? <Check size={13} /> : null}
                    {form.active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Save & Delete Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {editingService && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingService.id)}
                      className="h-[44px] px-3.5 rounded-[12px] text-xs font-semibold text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                  <Button
                    type="submit"
                    disabled={!form.name.trim()}
                    className="flex-1 h-[44px]"
                  >
                    {editingService ? 'Save Changes' : 'Create Service'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
