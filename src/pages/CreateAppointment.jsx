/**
 * CreateAppointment — Screen 07
 *
 * Fields: Client, Service, Technician, Date, Time
 * Client selection from ClientsContext (includes newly created clients)
 * Technician list is filtered by service specialty (from AuthContext allUsers)
 * Shows deposit warning if client no-shows >= 2
 *
 * Source: WIREFRAME.md Screen 07, FLOW.md §11-12
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TriangleAlert, Check, Plus, X, ChevronDown, Search, User, Sparkles } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useClients } from '../context/ClientsContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useServices } from '../context/ServicesContext';
import { useAuth } from '../context/AuthContext';
import { getDoualaTodayStr, BOOKING_TIME_SLOTS } from '../utils/timezone';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function CreateAppointment() {
  const navigate = useNavigate();
  const { clients, getActiveClients } = useClients();
  const { appointments, addAppointment } = useAppointments();
  const { getActiveServices } = useServices();
  const { allUsers, user } = useAuth();
  const isTechnician = user?.role === 'technician';
  const activeServices = getActiveServices();
  const allActiveClients = getActiveClients ? getActiveClients() : clients.filter((c) => c.status !== 'INACTIVE' && c.isActive !== false);

  // If technician, filter to ONLY clients belonging to this technician:
  // - Introduced by this technician (c.introducedById === user.id or c.introducedBy === user.name)
  // - OR Client already has an appointment assigned to this technician
  const activeClients = isTechnician
    ? allActiveClients.filter((c) => {
        const isIntroduced =
          String(c.introducedById) === String(user?.id) ||
          (c.introducedBy && c.introducedBy.toLowerCase() === (user?.name || '').toLowerCase());
        const hasApptWithTech =
          c.appointments?.some(
            (a) =>
              String(a.mainTechnicianId || a.technicianId) === String(user?.id)
          ) ||
          appointments?.some(
            (a) =>
              String(a.clientId) === String(c.id) &&
              String(a.technicianId || a.mainTechnicianId) === String(user?.id)
          );
        return isIntroduced || hasApptWithTech;
      })
    : allActiveClients;

  // All active technicians
  const allTechnicians = allUsers.filter((u) => u.role === 'technician' && u.active !== false);

  const [form, setForm] = useState({
    clientId: '',
    technicianId: isTechnician ? String(user?.id || '') : '',
    date: getDoualaTodayStr(),
    time: '',
  });

  // Mobile Bottom Sheet Picker state
  const [mobilePicker, setMobilePicker] = useState(null); // 'client' | 'service' | 'technician' | null
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Desktop & Universal Searchable Client Dropdown state
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const clientDropdownRef = useRef(null);
  const clientSearchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setIsClientOpen(false);
      }
    }
    if (isClientOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClientOpen]);

  const searchedClients = useMemo(() => {
    if (!clientSearch.trim()) return activeClients;
    const q = clientSearch.toLowerCase().trim();
    const cleanQ = q.replace(/[\s\-\+]/g, '');
    return activeClients.filter((c) => {
      const nameMatch = c.name && c.name.toLowerCase().includes(q);
      const cleanPhone = (c.phone || '').replace(/[\s\-\+]/g, '');
      const phoneMatch = cleanQ.length > 0 && cleanPhone.includes(cleanQ);
      const emailMatch = c.email && c.email.toLowerCase().includes(q);
      return nameMatch || phoneMatch || emailMatch;
    });
  }, [activeClients, clientSearch]);

  useEffect(() => {
    if (isTechnician && user?.id && form.technicianId !== String(user.id)) {
      setForm((prev) => ({ ...prev, technicianId: String(user.id) }));
    }
  }, [isTechnician, user?.id, form.technicianId]);

  // Multi-service selection: source of truth (starts empty, no pre-selected service)
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceToAdd, setServiceToAdd] = useState('');
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState('');

  const update = (field) => (e) => {
    setServerError('');
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const serviceCategories = ['ALL', ...Array.from(new Set(activeServices.map((s) => s.category).filter(Boolean)))];

  const filteredClients = activeClients.filter((c) => {
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase().trim();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const filteredServices = activeServices.filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase().trim();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  });

  const filteredTechnicians = allTechnicians.filter((t) => {
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase().trim();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.specialties && t.specialties.some((spec) => spec.toLowerCase().includes(q)))
    );
  });

  const selectedClient = clients.find((c) => String(c.id) === String(form.clientId));
  const selectedTech = allTechnicians.find((t) => String(t.id) === String(form.technicianId));

  const totalDurationMinutes = selectedServices.reduce((sum, s) => {
    const d = s.numericDuration || parseInt(s.duration, 10) || 30;
    return sum + (Number(d) || 30);
  }, 0);

  const newStartMins = form.time ? timeToMinutes(form.time) : 0;
  const newEndMins = form.time ? newStartMins + (totalDurationMinutes || 30) : 0;
  const newEndTime = form.time ? minutesToTime(newEndMins) : '';
  const isTimeOutOfRange = form.time ? newStartMins < 10 * 60 || newStartMins > 21 * 60 : false;

  // Check if currently selected technician has a conflict
  const conflictingAppointment =
    form.date && form.time && form.technicianId && totalDurationMinutes > 0
      ? appointments.find((apt) => {
          if (apt.date !== form.date) return false;
          if (String(apt.technicianId) !== String(form.technicianId)) return false;
          if (apt.status === 'no-show' || apt.status === 'cancelled') return false;

          const aptStartMins = timeToMinutes(apt.time);
          const aptDur =
            apt.totalDuration ||
            apt.duration ||
            apt.services?.reduce((acc, s) => acc + (Number(s.duration) || 30), 0) ||
            30;
          const aptEndMins = aptStartMins + aptDur;

          return newStartMins < aptEndMins && newEndMins > aptStartMins;
        })
      : null;

  const conflictStart = conflictingAppointment?.time;
  const conflictDur =
    conflictingAppointment?.totalDuration ||
    conflictingAppointment?.duration ||
    30;
  const conflictEnd = conflictStart ? minutesToTime(timeToMinutes(conflictStart) + conflictDur) : '';

  // Get conflict info for any technician in the dropdown
  const getTechConflictInfo = (techId) => {
    if (!form.date || !form.time || totalDurationMinutes <= 0) return null;
    const conflict = appointments.find((apt) => {
      if (apt.date !== form.date) return false;
      if (String(apt.technicianId) !== String(techId)) return false;
      if (apt.status === 'no-show' || apt.status === 'cancelled') return false;

      const aStart = timeToMinutes(apt.time);
      const aDur =
        apt.totalDuration ||
        apt.duration ||
        apt.services?.reduce((acc, s) => acc + (Number(s.duration) || 30), 0) ||
        30;
      const aEnd = aStart + aDur;

      return newStartMins < aEnd && newEndMins > aStart;
    });

    if (!conflict) return null;
    const cStart = conflict.time;
    const cDur = conflict.totalDuration || conflict.duration || 30;
    const cEnd = minutesToTime(timeToMinutes(cStart) + cDur);
    return { conflict, cStart, cEnd };
  };

  const handleAddService = (serviceName) => {
    if (!serviceName) return;
    const found = activeServices.find((s) => s.name === serviceName);
    if (found) {
      setServerError('');
      setSelectedServices((prev) => [...prev, found]);
      setServiceToAdd('');
    }
  };

  const handleRemoveService = (indexToRemove) => {
    setServerError('');
    setSelectedServices((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    setServerError('');
    if (!form.clientId || selectedServices.length === 0 || !form.technicianId || !form.date || !form.time) return;

    if (selectedClient && (selectedClient.status === 'INACTIVE' || selectedClient.isActive === false)) {
      setServerError('This client profile is inactive. Please restore the client in Clients List before creating an appointment.');
      return;
    }

    if (newStartMins < 10 * 60 || newStartMins > 21 * 60) {
      setServerError('Appointments can only be booked between 10:00 AM and 9:00 PM (10:00 – 21:00).');
      return;
    }

    if (conflictingAppointment) {
      setServerError(
        `Technician ${selectedTech?.name || ''} is busy during this time (${conflictStart} – ${conflictEnd}). Please select another time or technician.`
      );
      return;
    }

    setIsSaving(true);
    const servicesData = selectedServices.map((s, idx) => ({
      appointmentServiceId: `asvc-new-${Date.now()}-${idx}`,
      serviceId: s.id || null,
      name: s.name,
      price: typeof s.price === 'number' ? s.price : parseInt(String(s.price || '0').replace(/[^0-9]/g, ''), 10) || 15000,
      category: s.category || '',
      duration: s.numericDuration || parseInt(s.duration, 10) || 30,
    }));

    try {
      await addAppointment({
        clientId: form.clientId,
        clientName: selectedClient?.name || '',
        services: servicesData,
        service: servicesData.map((s) => s.name).join(', '),
        category: selectedServices[0]?.category || '',
        technicianId: form.technicianId,
        technicianName: selectedTech?.name || '',
        date: form.date,
        time: form.time,
        totalDuration: totalDurationMinutes,
        duration: totalDurationMinutes,
      });

      setSaved(true);
      setTimeout(() => navigate('/appointments'), 1200);
    } catch (err) {
      console.error('Failed to create appointment:', err);
      setServerError(err.message || 'Failed to create appointment. Please check technician availability.');
      setIsSaving(false);
    }
  };

  if (saved) {
    return (
      <div>
        <PageHeader title="Appointment Created" />
        <div className="bg-success-soft border border-success/20 rounded-[16px] p-6 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Check size={18} className="text-success" />
            <span className="text-sm font-semibold text-charcoal">
              Appointment created successfully
            </span>
          </div>
          <p className="text-sm text-muted-gray">Reminder:</p>
          <p className="text-sm text-muted-gray">✓ 24 hours before</p>
          <p className="text-sm text-muted-gray">✓ 2 hours before</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New Appointment"
        action={
          <Button variant="secondary" onClick={() => navigate('/appointments')}>
            <ArrowLeft size={16} strokeWidth={1.8} />
            Back
          </Button>
        }
      />

      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        {/* Client */}
        {/* Client Selection (Searchable) */}
        <div className="mb-4" ref={clientDropdownRef}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-semibold text-charcoal">
              Client <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {isTechnician && (
                <span className="text-[11px] font-semibold text-sage">
                  Your Clients ({activeClients.length})
                </span>
              )}
              <button
                type="button"
                onClick={() => navigate('/clients/new')}
                className="text-[11px] font-semibold text-sage hover:text-sage-hover flex items-center gap-1 cursor-pointer transition-colors"
                title="Create a new client"
              >
                <Plus size={12} />
                + New Client
              </button>
            </div>
          </div>

          {/* When a client is chosen and dropdown is closed, show selected client card */}
          {selectedClient && !isClientOpen ? (
            <div className="w-full min-h-[52px] p-2.5 sm:p-3 bg-soft-cream/40 border border-sage/40 rounded-[12px] flex items-center justify-between gap-3 shadow-2xs transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-sage-soft text-sage border border-sage/30 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {(selectedClient.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-charcoal truncate">
                      {selectedClient.name}
                    </span>
                    {selectedClient.phone && (
                      <span className="text-xs font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded-[6px] border border-border">
                        {selectedClient.phone}
                      </span>
                    )}
                  </div>
                  {selectedClient.notes && (
                    <p className="text-[11px] text-muted-gray truncate mt-0.5">
                      {selectedClient.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsClientOpen(true);
                    setClientSearch('');
                    setTimeout(() => clientSearchInputRef.current?.focus(), 60);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-soft-cream border border-border rounded-[8px] text-xs font-semibold text-charcoal transition-colors cursor-pointer shadow-2xs"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, clientId: '' }));
                    setClientSearch('');
                  }}
                  className="w-7 h-7 rounded-[8px] bg-white hover:bg-rose-50 hover:text-rose-600 text-muted-gray border border-border flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove selected client"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Search Input Trigger & Dropdown Menu */
            <div className="relative">
              <div
                className={`w-full min-h-[48px] bg-white border rounded-[12px] flex items-center px-3.5 gap-2.5 transition-all shadow-2xs ${
                  isClientOpen ? 'border-sage ring-2 ring-sage/20' : 'border-border hover:border-sage/50'
                }`}
              >
                <Search size={16} className={isClientOpen ? 'text-sage' : 'text-muted-gray'} />
                <input
                  ref={clientSearchInputRef}
                  type="text"
                  value={clientSearch}
                  onFocus={() => setIsClientOpen(true)}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    if (!isClientOpen) setIsClientOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsClientOpen(false);
                    if (e.key === 'Enter' && searchedClients.length > 0) {
                      e.preventDefault();
                      setForm((prev) => ({ ...prev, clientId: searchedClients[0].id }));
                      setIsClientOpen(false);
                      setClientSearch('');
                    }
                  }}
                  placeholder={
                    activeClients.length > 0
                      ? `Type client name or phone (+237)...`
                      : 'No clients registered yet'
                  }
                  className="w-full h-full py-2.5 text-sm text-charcoal placeholder:text-muted-gray outline-none bg-transparent"
                />
                {clientSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setClientSearch('');
                      clientSearchInputRef.current?.focus();
                    }}
                    className="p-1 text-muted-gray hover:text-charcoal cursor-pointer"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsClientOpen(!isClientOpen);
                      if (!isClientOpen) setTimeout(() => clientSearchInputRef.current?.focus(), 60);
                    }}
                    className="p-1 text-muted-gray hover:text-charcoal cursor-pointer"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${isClientOpen ? 'rotate-180 text-sage' : ''}`}
                    />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {isClientOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-border rounded-[14px] shadow-2xl overflow-hidden animate-scale-up">
                  <div className="px-3.5 py-2 border-b border-border/70 bg-soft-cream/40 flex items-center justify-between text-[11px] text-muted-gray font-medium">
                    <span>
                      {searchedClients.length} of {activeClients.length} client{searchedClients.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-[10px] hidden sm:inline">Press Enter or click to select</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-border/20 scrollbar-thin">
                    {searchedClients.length === 0 ? (
                      <div className="p-5 text-center space-y-2.5">
                        <p className="text-xs text-muted-gray">
                          No clients found matching <strong>"{clientSearch}"</strong>
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/clients/new')}
                          className="px-3.5 py-1.5 bg-sage hover:bg-sage-hover text-white text-xs font-semibold rounded-[8px] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Plus size={13} />
                          + Register New Client "{clientSearch}"
                        </button>
                      </div>
                    ) : (
                      searchedClients.map((c) => {
                        const isSelected = String(form.clientId) === String(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, clientId: c.id }));
                              setIsClientOpen(false);
                              setClientSearch('');
                            }}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-soft-cream/70 transition-colors cursor-pointer ${
                              isSelected ? 'bg-sage-soft/60 font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-sage text-white'
                                    : 'bg-soft-cream text-sage border border-border'
                                }`}
                              >
                                {(c.name || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="block text-sm font-semibold text-charcoal truncate">
                                  {c.name}
                                </span>
                                <span className="block text-xs font-mono text-muted-gray truncate">
                                  {c.phone || 'No phone number'}
                                </span>
                              </div>
                            </div>

                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-sage text-white flex items-center justify-center shrink-0">
                                <Check size={12} />
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-sage opacity-60 hover:opacity-100 shrink-0">
                                Select
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isTechnician && activeClients.length === 0 && (
            <p className="text-xs text-muted-gray mt-1.5 leading-relaxed">
              You haven't introduced any clients yet. You can register a new client using the <strong>Add New Client</strong> button first.
            </p>
          )}
        </div>

        {/* Deposit Warning */}
        {selectedClient && selectedClient.noShows >= 2 && (
          <div className="bg-warning-soft border border-warning/20 rounded-[12px] p-3.5 sm:p-4 mb-4 flex items-start gap-3">
            <TriangleAlert size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal">
                Client No-Shows: {selectedClient.noShows}
              </p>
              <p className="text-xs sm:text-sm text-muted-gray mt-0.5 leading-relaxed">
                Deposit required for next appointment
              </p>
            </div>
          </div>
        )}

        {/* Out of Operating Hours Alert */}
        {isTimeOutOfRange && (
          <div className="bg-error-soft border border-error/20 rounded-[12px] p-3.5 sm:p-4 mb-4 flex items-start gap-3">
            <TriangleAlert size={18} className="text-error shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-charcoal">
                Outside Operating Hours
              </p>
              <p className="text-xs sm:text-sm text-error mt-0.5 leading-relaxed">
                Appointments can only be booked between <strong>10:00 AM and 9:00 PM (10:00 – 21:00)</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Technician Schedule Conflict / Server Error Alert */}
        {(conflictingAppointment || serverError) && (
          <div className="bg-error-soft border border-error/20 rounded-[12px] p-3.5 sm:p-4 mb-4 flex items-start gap-3">
            <TriangleAlert size={18} className="text-error shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-charcoal">
                Technician Schedule Conflict
              </p>
              <p className="text-xs sm:text-sm text-error mt-0.5 leading-relaxed">
                {serverError || (
                  <>
                    <strong>{selectedTech?.name}</strong> is already booked from{' '}
                    <strong>{conflictStart}</strong> to <strong>{conflictEnd}</strong> ({conflictingAppointment?.service || 'Appointment'}).
                    Please select another time or technician.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Services (Multiple allowed) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-muted-gray">
              Booked Services ({selectedServices.length})
            </label>
            <span className="text-[11px] text-muted-gray">1 Visit · Multi-Service allowed</span>
          </div>

          {/* Selected Services Chips (only rendered when services are selected) */}
          {selectedServices.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5 p-2.5 bg-soft-cream/40 border border-border/80 rounded-[12px]">
              {selectedServices.map((s, idx) => (
                <span
                  key={s.id ? `${s.id}-${idx}` : idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-white border border-border text-xs font-semibold text-charcoal shadow-2xs"
                >
                  <span>{s.name}</span>
                  <span className="text-[11px] font-normal text-muted-gray">({s.price} FCFA)</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveService(idx)}
                    className="text-muted-gray hover:text-error transition-colors p-0.5 cursor-pointer ml-0.5"
                    title="Remove service"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add Service Selector — Desktop Native Select (Unchanged) */}
          <div className="hidden md:flex items-center gap-2">
            <select
              value={serviceToAdd}
              onChange={(e) => handleAddService(e.target.value)}
              className="w-full h-[42px] px-3.5 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer appearance-none"
            >
              <option value="">
                {selectedServices.length === 0 ? '+ Select Service for this Visit...' : '+ Add Another Service to Visit...'}
              </option>
              {activeServices.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.price} FCFA) — {s.category}
                </option>
              ))}
            </select>
          </div>

          {/* Add Service Selector — Mobile / Tablet Luxury Trigger */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => {
                setPickerSearch('');
                setSelectedCategory('ALL');
                setMobilePicker('service');
              }}
              className="w-full h-[46px] px-3.5 bg-[#FAF8F5] border border-dashed border-sage/50 hover:border-sage rounded-[11px] text-xs sm:text-sm text-left flex items-center justify-between outline-none focus:border-sage active:bg-[#F3EFEA] transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0 font-bold text-xs">
                  +
                </div>
                <span className="text-sage font-semibold truncate">
                  {selectedServices.length === 0 ? 'Select Service for this Visit...' : 'Add Another Service to Visit...'}
                </span>
              </div>
              <ChevronDown size={15} className="text-sage shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* Main Technician */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
            Main Technician
            <span className="text-[11px] font-normal text-sage ml-1.5">
              {isTechnician ? '— Assigned to you' : '— Primary assigned technician for visit'}
            </span>
          </label>
          {/* Desktop Native Select (Unchanged) */}
          <select
            value={form.technicianId}
            onChange={update('technicianId')}
            disabled={isTechnician}
            className={`hidden md:block w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150 ${
              isTechnician ? 'bg-soft-cream/60 cursor-not-allowed text-charcoal/80' : 'cursor-pointer'
            } appearance-none`}
          >
            {isTechnician ? (
              <option value={user?.id}>
                {user?.name || 'You'} (Your Profile)
              </option>
            ) : (
              <>
                <option value="">Select Main Technician</option>
                {allTechnicians.map((t) => {
                  const conflictInfo = getTechConflictInfo(t.id);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} — {(t.specialties || []).join(', ') || 'Technician'}
                      {conflictInfo ? ` ⚠️ (Busy ${conflictInfo.cStart}–${conflictInfo.cEnd})` : ''}
                    </option>
                  );
                })}
              </>
            )}
          </select>

          {/* Mobile / Tablet Luxury Trigger */}
          <button
            type="button"
            disabled={isTechnician}
            onClick={() => {
              if (isTechnician) return;
              setPickerSearch('');
              setMobilePicker('technician');
            }}
            className={`md:hidden w-full h-[48px] px-3.5 bg-white border border-border rounded-[11px] text-sm text-left flex items-center justify-between outline-none focus:border-sage shadow-2xs ${
              isTechnician ? 'bg-soft-cream/60 cursor-not-allowed text-charcoal/80' : 'active:bg-soft-cream/30'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-sage/10 text-sage flex items-center justify-center shrink-0">
                <Sparkles size={13} />
              </div>
              <span className={selectedTech ? 'text-charcoal font-medium truncate' : 'text-muted-gray truncate'}>
                {isTechnician
                  ? `${user?.name || 'You'} (Your Profile)`
                  : selectedTech
                  ? `${selectedTech.name} — ${(selectedTech.specialties || []).join(', ') || 'Technician'}`
                  : 'Select Main Technician...'}
              </span>
            </div>
            {!isTechnician && <ChevronDown size={16} className="text-muted-gray shrink-0 ml-2" />}
          </button>
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div>
            <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={update('date')}
              className="w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
              Time
              <span className="text-[11px] font-normal text-muted-gray ml-1.5">
                (10:00 AM – 09:00 PM)
              </span>
              {form.time && totalDurationMinutes > 0 && (
                <span className="text-[11px] font-normal text-sage ml-1.5">
                  · {totalDurationMinutes} min (until {newEndTime})
                </span>
              )}
            </label>
            <select
              value={form.time}
              onChange={update('time')}
              className="w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150 cursor-pointer appearance-none"
            >
              <option value="">Select Time (10:00 AM – 09:00 PM)</option>
              {BOOKING_TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Save */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={
              !form.clientId ||
              selectedServices.length === 0 ||
              !form.technicianId ||
              !form.date ||
              !form.time ||
              isTimeOutOfRange ||
              Boolean(conflictingAppointment) ||
              isSaving
            }
            className="w-full sm:w-auto h-11 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Appointment'}
          </Button>
        </div>
      </div>

      {/* Mobile / Tablet Bottom Sheet Drawer (Only visible on mobile/tablet) */}
      {mobilePicker && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-fade-in"
          onClick={() => setMobilePicker(null)}
        >
          <div
            className="bg-white rounded-t-[22px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Pill */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <div className="w-12 h-1 bg-[#E4E4E7] rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/70">
              <div>
                <h3 className="text-base font-bold text-charcoal">
                  {mobilePicker === 'client' && 'Select Client'}
                  {mobilePicker === 'service' && 'Add Service to Visit'}
                  {mobilePicker === 'technician' && 'Select Main Technician'}
                </h3>
                <p className="text-xs text-muted-gray">
                  {mobilePicker === 'client' && `${filteredClients.length} clients available`}
                  {mobilePicker === 'service' && `${filteredServices.length} treatments available`}
                  {mobilePicker === 'technician' && `${filteredTechnicians.length} specialists available`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePicker(null)}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] hover:bg-[#E4E4E7] flex items-center justify-center text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-border/50 bg-[#FBF9F5]">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={
                    mobilePicker === 'client'
                      ? 'Search client by name or phone...'
                      : mobilePicker === 'service'
                      ? 'Search service or category...'
                      : 'Search technician name or specialty...'
                  }
                  autoFocus
                  className="w-full h-10 pl-9 pr-8 bg-white border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
                />
                {pickerSearch && (
                  <button
                    type="button"
                    onClick={() => setPickerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-gray p-1"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Service Categories horizontal scroller */}
              {mobilePicker === 'service' && serviceCategories.length > 2 && (
                <div className="flex gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
                  {serviceCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-[#14532D] text-white'
                          : 'bg-white border border-border text-muted-gray'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <div className="p-3 overflow-y-auto space-y-2 flex-1 overscroll-contain">
              {/* CLIENT LIST */}
              {mobilePicker === 'client' && (
                <>
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-gray">
                      No clients found matching "{pickerSearch}".
                    </div>
                  ) : (
                    filteredClients.map((c) => {
                      const isSelected = String(form.clientId) === String(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setServerError('');
                            setForm((prev) => ({ ...prev, clientId: c.id }));
                            setMobilePicker(null);
                          }}
                          className={`p-3 rounded-[12px] border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#F0FDF4] border-[#86EFAC] shadow-2xs'
                              : 'bg-white border-border/80 hover:border-sage/40 active:bg-soft-cream/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected ? 'bg-[#16A34A] text-white' : 'bg-soft-cream text-sage border border-border'
                              }`}
                            >
                              {(c.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-charcoal truncate">{c.name}</p>
                              <p className="text-xs text-muted-gray truncate mt-0.5">
                                {c.phone || 'No phone number'}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* SERVICE LIST */}
              {mobilePicker === 'service' && (
                <>
                  {filteredServices.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-gray">
                      No services found matching "{pickerSearch}".
                    </div>
                  ) : (
                    filteredServices.map((s) => {
                      const isAlreadyAdded = selectedServices.some((sel) => sel.id === s.id || sel.name === s.name);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            handleAddService(s.name);
                            setMobilePicker(null);
                          }}
                          className="p-3 rounded-[12px] bg-white border border-border/80 hover:border-sage/50 active:bg-soft-cream/40 transition-all flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-semibold text-charcoal leading-snug">
                                {s.name}
                              </span>
                              {s.category && (
                                <span className="text-[10px] font-medium text-sage bg-[#EBF3EC] px-2 py-0.5 rounded-full border border-[#7FA285]/20">
                                  {s.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-[#14532D]">
                                {(typeof s.price === 'number' ? s.price : parseInt(s.price, 10) || 15000).toLocaleString('en-US')} FCFA
                              </span>
                              <span className="text-muted-gray text-[11px]">
                                · {s.duration || s.numericDuration || 30} min
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-[8px] bg-[#14532D] hover:bg-[#0D381E] text-white font-semibold text-xs shrink-0 flex items-center gap-1 shadow-2xs"
                          >
                            <Plus size={13} />
                            <span>Add</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* TECHNICIAN LIST */}
              {mobilePicker === 'technician' && (
                <>
                  {filteredTechnicians.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-gray">
                      No technicians found matching "{pickerSearch}".
                    </div>
                  ) : (
                    filteredTechnicians.map((t) => {
                      const conflictInfo = getTechConflictInfo(t.id);
                      const isSelected = String(form.technicianId) === String(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setServerError('');
                            setForm((prev) => ({ ...prev, technicianId: t.id }));
                            setMobilePicker(null);
                          }}
                          className={`p-3 rounded-[12px] border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#F0FDF4] border-[#86EFAC] shadow-2xs'
                              : 'bg-white border-border/80 hover:border-sage/40 active:bg-soft-cream/30'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-charcoal truncate">{t.name}</p>
                              {conflictInfo && (
                                <span className="text-[10px] font-semibold text-error bg-error/10 px-2 py-0.5 rounded-full">
                                  Busy {conflictInfo.cStart}–{conflictInfo.cEnd}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-gray truncate mt-0.5">
                              {(t.specialties || []).join(', ') || 'Specialist'}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
