/**
 * Staff — Manager-only staff/user management page
 *
 * Features:
 *   - View all staff members
 *   - Add new staff (Name, Username/Phone, Role, Password, Specialties for Technicians)
 *   - Edit staff
 *   - Deactivate / Reactivate staff
 *   - Reset password
 *   - Manage Specialties (Add, Edit, Activate/Deactivate)
 *
 * Roles: Manager, Reception, Technician, Cleaner
 * Technician specialties: Dynamic multi-select from ServicesContext
 */

import { useState, useEffect } from 'react';
import {
  UserPlus,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Paintbrush,
  Eye,
  EyeOff,
  RotateCcw,
  Pencil,
  UserX,
  UserCheck,
  Check,
  Plus,
  Tags,
  Trash2,
  Key,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useServices } from '../context/ServicesContext';

const ROLES = [
  { value: 'manager', label: 'Manager', icon: ShieldCheck },
  { value: 'reception', label: 'Reception', icon: Shield },
  { value: 'technician', label: 'Technician', icon: ShieldAlert },
  { value: 'cleaner', label: 'Cleaner', icon: Paintbrush },
];

const roleBadgeStyles = {
  manager: 'bg-sage-soft text-sage border-sage/20',
  reception: 'bg-[#E8EFF8] text-[#4A6B8A] border-[#4A6B8A]/20',
  technician: 'bg-dusty-rose-soft text-dusty-rose border-dusty-rose/20',
  cleaner: 'bg-warning-soft text-warning border-warning/20',
};

export default function Staff() {
  const { allUsers, addUser, editUser, deactivateUser, activateUser, resetUserPassword, refreshUsers } = useAuth();
  const { specialties, getActiveSpecialties, addSpecialty, editSpecialty, toggleSpecialtyActive, deleteSpecialty } = useServices();

  useEffect(() => {
    if (refreshUsers) {
      refreshUsers();
    }
  }, [refreshUsers]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Reset Password Modal state
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'technician', password: '123456', specialties: [] });
  const [formError, setFormError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saved, setSaved] = useState(false);

  // Specialty management state
  const [showSpecialtyPanel, setShowSpecialtyPanel] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [specialtyError, setSpecialtyError] = useState('');
  const [editingSpecId, setEditingSpecId] = useState(null);
  const [editingSpecName, setEditingSpecName] = useState('');
  const [confirmDeleteSpecId, setConfirmDeleteSpecId] = useState(null);

  const activeSpecialties = getActiveSpecialties();

  const handleDeleteSpecialty = async (id) => {
    try {
      setSpecialtyError('');
      await deleteSpecialty(id);
      setConfirmDeleteSpecId(null);
      if (refreshUsers) await refreshUsers();
    } catch (err) {
      setSpecialtyError(err.message || 'Failed to delete specialty.');
    }
  };

  const handleToggleSpecialtyActive = async (id) => {
    try {
      setSpecialtyError('');
      await toggleSpecialtyActive(id);
    } catch (err) {
      setSpecialtyError(err.message || 'Failed to toggle specialty status.');
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', role: 'technician', password: '123456', specialties: [] });
    setFormError('');
    setShowPw(false);
    setSaved(false);
    setEditingUser(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);

    // Normalize specialties:
    // If active specialties has 'Body Massage' and user has 'Massage', map to 'Body Massage'
    // Filter against active specialties to prevent orphaned/ghost selections
    const activeNames = activeSpecialties.map((s) => s.name);
    const rawSpecs = Array.isArray(u.specialties) ? u.specialties : [];
    const mappedSpecs = rawSpecs.map((s) => {
      if (s === 'Massage' && activeNames.some((n) => n.toLowerCase() === 'body massage')) {
        return activeNames.find((n) => n.toLowerCase() === 'body massage');
      }
      return s;
    });

    const validSpecs = mappedSpecs
      .map((s) => activeNames.find((n) => n.toLowerCase() === s.toLowerCase()))
      .filter(Boolean);

    setForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      password: '',
      specialties: Array.from(new Set(validSpecs)),
    });
    setFormError('');
    setShowPw(false);
    setSaved(false);
    setShowModal(true);
  };

  const toggleFormSpecialty = (specName) => {
    setForm((prev) => {
      const has = prev.specialties.includes(specName);
      return {
        ...prev,
        specialties: has
          ? prev.specialties.filter((s) => s !== specName)
          : [...prev.specialties, specName],
      };
    });
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return;

    if (form.role === 'technician' && (!form.specialties || form.specialties.length === 0)) {
      setFormError('Please select at least one specialty.');
      return;
    }
    setFormError('');

    try {
      const emailVal = form.email.trim().toLowerCase();
      const phoneVal = form.phone.trim();
      if (editingUser) {
        const updates = {
          name: form.name.trim(),
          email: emailVal,
          phone: phoneVal || null,
          role: form.role,
          specialties: form.role === 'technician' ? form.specialties : [],
        };
        if (form.password && form.password.trim()) {
          updates.password = form.password.trim();
        }
        await editUser(editingUser.id, updates);
      } else {
        await addUser({
          name: form.name.trim(),
          email: emailVal,
          phone: phoneVal || null,
          role: form.role,
          password: form.password || '123456',
          specialties: form.role === 'technician' ? form.specialties : [],
        });
      }

      if (refreshUsers) {
        await refreshUsers();
      }

      setSaved(true);
      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 700);
    } catch (err) {
      setFormError(err.message || 'Failed to save staff');
    }
  };

  const openResetModal = (u) => {
    setResetModalUser(u);
    setNewPasswordInput('');
    setShowNewPw(false);
    setResetSuccess(false);
  };

  const handleConfirmResetPassword = () => {
    if (!resetModalUser || !newPasswordInput.trim()) return;
    resetUserPassword(resetModalUser.id, newPasswordInput.trim());
    setResetSuccess(true);
    setTimeout(() => {
      setResetModalUser(null);
      setResetSuccess(false);
      setNewPasswordInput('');
    }, 900);
  };

  const handleAddSpecialty = async () => {
    const trimmed = newSpecialtyName.trim();
    if (!trimmed) {
      setSpecialtyError('Specialty name is required.');
      return;
    }
    const duplicate = specialties.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setSpecialtyError('A specialty with this name already exists.');
      return;
    }
    setSpecialtyError('');
    try {
      await addSpecialty(trimmed);
      setNewSpecialtyName('');
    } catch (err) {
      setSpecialtyError(err.message || 'Failed to add specialty.');
    }
  };

  const handleSaveSpecEdit = async (id) => {
    const trimmed = editingSpecName.trim();
    if (!trimmed) {
      setSpecialtyError('Specialty name cannot be empty.');
      return;
    }
    const duplicate = specialties.some(
      (s) => String(s.id) !== String(id) && s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setSpecialtyError('A specialty with this name already exists.');
      return;
    }
    setSpecialtyError('');
    try {
      await editSpecialty(id, trimmed);
      setEditingSpecId(null);
      setEditingSpecName('');
      if (refreshUsers) await refreshUsers();
    } catch (err) {
      setSpecialtyError(err.message || 'Failed to update specialty.');
    }
  };

  const activeUsers = allUsers.filter((u) => u.active !== false);
  const deactivatedUsers = allUsers.filter((u) => u.active === false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Staff / Users"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowSpecialtyPanel(!showSpecialtyPanel)}>
              <Tags size={15} />
              Specialties
            </Button>
            <Button onClick={openAddModal}>
              <UserPlus size={16} strokeWidth={2} />
              Add Staff
            </Button>
          </div>
        }
      />

      {/* ── Specialty Management Panel ── */}
      {showSpecialtyPanel && (
        <div className="bg-white border border-border rounded-[16px] shadow-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
              Manage Specialties
            </h3>
            <button
              onClick={() => setShowSpecialtyPanel(false)}
              className="text-muted-gray hover:text-charcoal cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Add New Specialty */}
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newSpecialtyName}
              onChange={(e) => {
                setNewSpecialtyName(e.target.value);
                setSpecialtyError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSpecialty()}
              placeholder="New specialty name..."
              className="flex-1 h-[38px] px-3.5 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
            />
            <Button onClick={handleAddSpecialty} className="h-[38px] text-xs px-3">
              <Plus size={14} />
              Add
            </Button>
          </div>

          {specialtyError && (
            <p className="text-xs text-[#B34040] font-semibold mb-3">
              {specialtyError}
            </p>
          )}

          {/* Specialty List */}
          <div className="space-y-1.5">
            {specialties.map((spec) => (
              <div
                key={spec.id}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border transition-all ${spec.active
                    ? 'bg-white border-border'
                    : 'bg-soft-cream/40 border-border/50 opacity-60'
                  }`}
              >
                {editingSpecId === spec.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingSpecName}
                      onChange={(e) => {
                        setEditingSpecName(e.target.value);
                        setSpecialtyError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveSpecEdit(spec.id)}
                      className="flex-1 h-[30px] px-2.5 bg-white border border-sage/40 rounded-[7px] text-xs text-charcoal outline-none focus:border-sage"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveSpecEdit(spec.id)}
                      className="h-[28px] px-2 rounded-[6px] text-[10px] font-semibold text-success bg-success-soft border border-success/20 cursor-pointer flex items-center gap-1"
                    >
                      <Check size={11} /> Save
                    </button>
                    <button
                      onClick={() => { setEditingSpecId(null); setEditingSpecName(''); setSpecialtyError(''); }}
                      className="h-[28px] px-2 rounded-[6px] text-[10px] font-medium text-muted-gray bg-white border border-border cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`text-sm font-medium ${spec.active ? 'text-charcoal' : 'text-muted-gray line-through'}`}>
                      {spec.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setEditingSpecId(spec.id); setEditingSpecName(spec.name); setSpecialtyError(''); }}
                        className="h-[26px] px-2 rounded-[6px] text-[10px] font-medium text-charcoal bg-soft-cream border border-border hover:bg-sage-soft transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Pencil size={10} /> Edit
                      </button>
                      <button
                        onClick={() => handleToggleSpecialtyActive(spec.id)}
                        className={`h-[26px] px-2 rounded-[6px] text-[10px] font-medium border transition-all cursor-pointer ${spec.active
                            ? 'text-muted-gray bg-white border-border hover:bg-soft-cream'
                            : 'text-success bg-success-soft border-success/20 hover:bg-success/15'
                          }`}
                      >
                        {spec.active ? 'Deactivate' : 'Activate'}
                      </button>
                      {confirmDeleteSpecId === spec.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteSpecialty(spec.id)}
                            className="h-[26px] px-2 rounded-[6px] text-[10px] font-semibold text-white bg-[#B34040] hover:bg-[#962d2d] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Trash2 size={10} /> Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSpecId(null)}
                            className="h-[26px] px-1.5 rounded-[6px] text-[10px] font-medium text-muted-gray bg-white border border-border hover:bg-soft-cream transition-all cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteSpecId(spec.id)}
                          className="h-[26px] px-2 rounded-[6px] text-[10px] font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Delete Specialty"
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Staff Table */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden mb-6">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
            Active Staff ({activeUsers.length})
          </h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-soft-cream/40">
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Specialties</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id} className="border-b border-border/40 last:border-b-0 hover:bg-soft-cream/30 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-charcoal">{u.name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-gray">{u.email}</td>
                  <td className="px-5 py-3.5 text-sm text-charcoal font-medium">{u.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border capitalize ${roleBadgeStyles[u.role] || 'bg-soft-cream text-charcoal border-border'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.specialties?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.specialties.map((s) => {
                          const displayName = s === 'Massage' ? 'Body Massage' : s;
                          return (
                            <span
                              key={displayName}
                              className="inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-medium bg-soft-cream text-charcoal border border-border"
                            >
                              {displayName}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-gray">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="h-[30px] px-2.5 rounded-[7px] text-[11px] font-medium text-charcoal bg-soft-cream border border-border hover:bg-sage-soft hover:border-sage/30 transition-all cursor-pointer flex items-center gap-1"
                        title="Edit"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => openResetModal(u)}
                        className="h-[30px] px-2.5 rounded-[7px] text-[11px] font-medium text-muted-gray bg-white border border-border hover:bg-soft-cream transition-all cursor-pointer flex items-center gap-1"
                        title="Reset Password"
                      >
                        <RotateCcw size={11} /> Reset PW
                      </button>
                      <button
                        onClick={() => deactivateUser(u.id)}
                        className="h-[30px] px-2.5 rounded-[7px] text-[11px] font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer flex items-center gap-1"
                        title="Deactivate"
                      >
                        <UserX size={12} /> Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Portrait Cards View */}
        <div className="block md:hidden divide-y divide-border/60">
          {activeUsers.map((u) => (
            <div key={u.id} className="p-4 space-y-3 hover:bg-soft-cream/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-charcoal">{u.name}</h4>
                  <p className="text-xs text-muted-gray mt-0.5">{u.email} {u.phone ? `· ${u.phone}` : ''}</p>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border capitalize shrink-0 ${roleBadgeStyles[u.role] || 'bg-soft-cream text-charcoal border-border'}`}>
                  {u.role}
                </span>
              </div>

              {u.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {u.specialties.map((s) => {
                    const displayName = s === 'Massage' ? 'Body Massage' : s;
                    return (
                      <span
                        key={displayName}
                        className="inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-medium bg-soft-cream text-charcoal border border-border"
                      >
                        {displayName}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/40">
                <button
                  onClick={() => openEditModal(u)}
                  className="h-[38px] px-2 rounded-[9px] text-xs font-semibold text-charcoal bg-soft-cream border border-border hover:bg-sage-soft transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => openResetModal(u)}
                  className="h-[38px] px-2 rounded-[9px] text-xs font-medium text-muted-gray bg-white border border-border hover:bg-soft-cream transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <RotateCcw size={11} /> Reset PW
                </button>
                <button
                  onClick={() => deactivateUser(u.id)}
                  className="h-[38px] px-2 rounded-[9px] text-xs font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <UserX size={12} /> Deact
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deactivated Staff */}
      {deactivatedUsers.length > 0 && (
        <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden mb-6">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-muted-gray uppercase tracking-wider">
              Deactivated ({deactivatedUsers.length})
            </h3>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <tbody>
                {deactivatedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 last:border-b-0 opacity-60">
                    <td className="px-5 py-3 text-sm text-muted-gray line-through">{u.name}</td>
                    <td className="px-5 py-3 text-sm text-muted-gray">{u.email}</td>
                    <td className="px-5 py-3 text-sm text-muted-gray">{u.phone || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border capitalize bg-soft-cream text-muted-gray border-border">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => activateUser(u.id)}
                        className="h-[30px] px-2.5 rounded-[7px] text-[11px] font-medium text-success bg-success-soft border border-success/20 hover:bg-success/15 transition-all cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <UserCheck size={12} /> Reactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden divide-y divide-border/60">
            {deactivatedUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-2.5 opacity-70">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-gray line-through">{u.name}</h4>
                    <p className="text-xs text-muted-gray">{u.email} {u.phone ? `· ${u.phone}` : ''} · {u.role}</p>
                  </div>
                  <button
                    onClick={() => activateUser(u.id)}
                    className="h-[36px] px-3 rounded-[9px] text-xs font-semibold text-success bg-success-soft border border-success/20 hover:bg-success/20 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <UserCheck size={13} /> Reactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-charcoal/30 z-[60] flex items-center justify-center p-3 sm:p-4">
          <div
            className="w-full max-w-[calc(100vw-24px)] sm:max-w-[440px] bg-white border border-border rounded-[20px] p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-charcoal">
                {editingUser ? 'Edit Staff' : 'Add New Staff'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {saved ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-success-soft border border-success/20 flex items-center justify-center mx-auto mb-3">
                  <Check size={22} className="text-success" />
                </div>
                <p className="text-sm font-semibold text-charcoal">
                  {editingUser ? 'Staff Updated!' : 'Staff Created!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Name */}
                <div>
                  <label className="block text-[12px] font-medium text-muted-gray mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Enter name"
                    className="w-full h-[42px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[12px] font-medium text-muted-gray mb-1">Email Address (Login) *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="e.g. staff@gmail.com"
                    className="w-full h-[42px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[12px] font-medium text-muted-gray mb-1">Phone Number (WhatsApp / SMS)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="e.g. +237 670 000 000"
                    className="w-full h-[42px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[12px] font-medium text-muted-gray mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={update('role')}
                    className="w-full h-[42px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Specialties — Only for Technician (multi-select checkboxes) */}
                {form.role === 'technician' && (
                  <div>
                    <label className="block text-[12px] font-medium text-muted-gray mb-2">Specialties *</label>
                    <div className="bg-soft-cream/30 border border-border/60 rounded-[12px] p-3 space-y-1.5 max-h-[160px] overflow-y-auto">
                      {activeSpecialties.length === 0 ? (
                        <p className="text-xs text-muted-gray text-center py-2">No specialties defined. Add via Specialties button.</p>
                      ) : (
                        activeSpecialties.map((spec) => (
                          <label
                            key={spec.id}
                            className="flex items-center gap-2.5 py-1.5 px-2 rounded-[8px] hover:bg-white cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={form.specialties.includes(spec.name)}
                              onChange={() => toggleFormSpecialty(spec.name)}
                              className="w-3.5 h-3.5 accent-sage cursor-pointer rounded"
                            />
                            <span className="text-xs font-medium text-charcoal">{spec.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {form.specialties.length > 0 && (
                      <p className="text-[11px] text-sage font-medium mt-1.5">
                        Selected: {form.specialties.join(', ')}
                      </p>
                    )}
                    {formError && (
                      <p className="text-xs text-[#B34040] font-semibold mt-1.5">
                        {formError}
                      </p>
                    )}
                  </div>
                )}

                {/* Password field */}
                <div>
                  <label className="block text-[12px] font-medium text-muted-gray mb-1">
                    {editingUser ? 'New Password (optional)' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={update('password')}
                      placeholder={editingUser ? 'Leave blank to keep current' : '123456'}
                      className="w-full h-[42px] px-4 pr-11 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal transition-colors cursor-pointer"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {formError && form.role !== 'technician' && (
                  <p className="text-xs text-[#B34040] font-semibold text-center mt-1">
                    {formError}
                  </p>
                )}

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={!form.name.trim() || !form.email.trim()}
                  className="w-full h-[44px] mt-2"
                >
                  {editingUser ? 'Save Changes' : 'Create Staff Account'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetModalUser && (
        <div
          className="fixed inset-0 bg-charcoal/30 z-[60] flex items-center justify-center p-3 sm:p-4 backdrop-blur-2xs"
          onClick={() => setResetModalUser(null)}
        >
          <div
            className="w-full max-w-[calc(100vw-24px)] sm:max-w-[390px] bg-white border border-border rounded-[20px] p-4 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] bg-warning-soft border border-warning/30 flex items-center justify-center text-warning">
                  <Key size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-charcoal">Reset Password</h3>
                  <p className="text-xs text-muted-gray">
                    for <strong className="text-charcoal">{resetModalUser.name}</strong> ({resetModalUser.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-muted-gray hover:text-charcoal cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center py-5">
                <div className="w-11 h-11 rounded-full bg-success-soft border border-success/20 flex items-center justify-center mx-auto mb-2 text-success">
                  <Check size={20} />
                </div>
                <p className="text-sm font-semibold text-charcoal">Password Updated!</p>
                <p className="text-xs text-muted-gray mt-1">
                  New password set successfully for {resetModalUser.name}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-gray mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-[44px] pl-3.5 pr-10 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal cursor-pointer"
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    variant="secondary"
                    onClick={() => setResetModalUser(null)}
                    className="h-[38px] text-xs px-3.5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmResetPassword}
                    disabled={!newPasswordInput.trim()}
                    className="h-[38px] text-xs px-4"
                  >
                    <Check size={14} />
                    Save Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
