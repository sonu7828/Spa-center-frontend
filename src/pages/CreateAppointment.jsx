/**
 * CreateAppointment — Screen 07
 *
 * Fields: Client, Service, Technician, Date, Time
 * Client selection from ClientsContext (includes newly created clients)
 * Technician list is filtered by service specialty (from AuthContext allUsers)
 * Shows deposit warning if client no-shows >= 2
 *
 * Redesigned with Mobile-First Luxury Bottom Sheet Pickers:
 * - No native OS clunky select dialogs
 * - Searchable Client Picker
 * - Categorized & Searchable Multi-Service Picker
 * - Technician Picker with live availability indicators
 * - Visual Time Slot Picker
 *
 * Source: WIREFRAME.md Screen 07, FLOW.md §11-12
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TriangleAlert,
  Check,
  Plus,
  X,
  Search,
  User,
  Scissors,
  Clock,
  ChevronDown,
  Sparkles,
  Phone,
  Award,
} from 'lucide-react';

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
  const allActiveClients = getActiveClients
    ? getActiveClients()
    : clients.filter((c) => c.status !== 'INACTIVE' && c.isActive !== false);

  // If technician, filter to ONLY clients belonging to this technician
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
    time: '10:00',
  });

  useEffect(() => {
    if (isTechnician && user?.id && form.technicianId !== String(user.id)) {
      setForm((prev) => ({ ...prev, technicianId: String(user.id) }));
    }
  }, [isTechnician, user?.id, form.technicianId]);

  // Modals / Bottom Sheets state
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [showTechModal, setShowTechModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Multi-service selection: source of truth
  const [selectedServices, setSelectedServices] = useState([]);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState('');

  const update = (field) => (e) => {
    setServerError('');
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

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

  // Get conflict info for any technician
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

  const handleAddService = (service) => {
    if (!service) return;
    setServerError('');
    setSelectedServices((prev) => [...prev, service]);
  };

  const handleRemoveService = (indexToRemove) => {
    setServerError('');
    setSelectedServices((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Filtered clients list for Client Picker
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return activeClients;
    const q = clientSearch.toLowerCase().trim();
    return activeClients.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsapp && c.whatsapp.includes(q))
    );
  }, [activeClients, clientSearch]);

  // Filtered services for Service Picker
  const serviceCategories = useMemo(() => {
    const cats = new Set();
    activeServices.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return ['All', ...Array.from(cats)];
  }, [activeServices]);

  const filteredServices = useMemo(() => {
    return activeServices.filter((s) => {
      const matchesCategory =
        activeCategory === 'All' || (s.category && s.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesSearch =
        !serviceSearch.trim() ||
        s.name.toLowerCase().includes(serviceSearch.toLowerCase().trim()) ||
        (s.category && s.category.toLowerCase().includes(serviceSearch.toLowerCase().trim()));
      return matchesCategory && matchesSearch;
    });
  }, [activeServices, activeCategory, serviceSearch]);

  // Grouped time slots for Time Picker
  const timeSlotGroups = useMemo(() => {
    const morning = [];
    const afternoon = [];
    const evening = [];

    BOOKING_TIME_SLOTS.forEach((slot) => {
      const h = parseInt(slot.value.split(':')[0], 10);
      if (h < 13) morning.push(slot);
      else if (h < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return [
      { title: 'Morning (10:00 AM – 12:45 PM)', slots: morning },
      { title: 'Afternoon (01:00 PM – 04:45 PM)', slots: afternoon },
      { title: 'Evening (05:00 PM – 09:00 PM)', slots: evening },
    ];
  }, []);

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
          <p className="text-sm text-muted-gray">Confirmation message has been dispatched to client via WhatsApp.</p>
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
        {/* 1. Client Picker Trigger */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-muted-gray">
              Client <span className="text-error">*</span>
            </label>
            {isTechnician && (
              <span className="text-[11px] font-semibold text-sage">
                Your Clients ({activeClients.length})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setClientSearch('');
              setShowClientModal(true);
            }}
            className="w-full min-h-[50px] px-3.5 sm:px-4 py-2 bg-white hover:bg-soft-cream/30 border border-border hover:border-sage rounded-[12px] text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group shadow-2xs"
          >
            {selectedClient ? (
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-soft-cream flex items-center justify-center font-bold text-sage text-sm shrink-0 border border-sage/20">
                  {(selectedClient.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-charcoal truncate">
                    {selectedClient.name}
                  </div>
                  <div className="text-xs text-muted-gray flex items-center gap-2">
                    <span>{selectedClient.phone || 'No phone'}</span>
                    {selectedClient.loyalty?.balance !== undefined && (
                      <span className="text-[11px] text-sage font-medium bg-[#EBF3EC] px-1.5 py-0.2 rounded">
                        ★ {selectedClient.loyalty.balance} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-muted-gray">
                <div className="w-8 h-8 rounded-full bg-soft-cream/60 flex items-center justify-center text-muted-gray">
                  <User size={16} />
                </div>
                <span className="text-sm font-normal text-muted-gray">
                  {isTechnician ? 'Select One of Your Clients...' : 'Select Client...'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 shrink-0 text-muted-gray group-hover:text-sage transition-colors">
              <span className="text-xs font-medium hidden sm:inline">
                {selectedClient ? 'Change' : 'Select'}
              </span>
              <ChevronDown size={16} />
            </div>
          </button>
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

        {/* 2. Booked Services */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-muted-gray">
              Booked Services ({selectedServices.length}) <span className="text-error">*</span>
            </label>
            <span className="text-[11px] text-muted-gray">Multi-Service allowed</span>
          </div>

          {/* Selected Services Chips */}
          {selectedServices.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5 p-2.5 bg-soft-cream/40 border border-border/80 rounded-[12px]">
              {selectedServices.map((s, idx) => (
                <span
                  key={s.id ? `${s.id}-${idx}` : idx}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[9px] bg-white border border-border text-xs font-semibold text-charcoal shadow-2xs"
                >
                  <span>{s.name}</span>
                  <span className="text-[11px] font-normal text-sage font-mono">
                    ({(typeof s.price === 'number' ? s.price : parseInt(s.price, 10) || 15000).toLocaleString('en-US')} FCFA)
                  </span>
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

          {/* Add Service Trigger Button */}
          <button
            type="button"
            onClick={() => {
              setServiceSearch('');
              setActiveCategory('All');
              setShowServiceModal(true);
            }}
            className="w-full py-3 px-4 bg-[#FBF9F5] hover:bg-[#F4F1EA] border border-dashed border-[#CBD5E1] hover:border-sage rounded-[12px] text-charcoal font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-2xs text-sage group-hover:scale-110 transition-transform">
              <Plus size={14} />
            </div>
            <span>{selectedServices.length === 0 ? '+ Select Services for this Visit...' : '+ Add Another Service to Visit...'}</span>
          </button>
        </div>

        {/* 3. Main Technician */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
            Main Technician <span className="text-error">*</span>
            <span className="text-[11px] font-normal text-sage ml-1.5">
              {isTechnician ? '— Assigned to you' : '— Primary technician'}
            </span>
          </label>

          {isTechnician ? (
            <div className="w-full h-[50px] px-3.5 sm:px-4 bg-soft-cream/60 border border-border rounded-[12px] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center font-bold text-xs">
                  {(user?.name || 'T').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-charcoal">{user?.name || 'You'}</div>
                  <div className="text-[11px] text-sage font-medium">Your Profile</div>
                </div>
              </div>
              <span className="text-xs text-muted-gray bg-white px-2 py-0.5 rounded border border-border">Locked</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTechModal(true)}
              className="w-full min-h-[50px] px-3.5 sm:px-4 py-2 bg-white hover:bg-soft-cream/30 border border-border hover:border-sage rounded-[12px] text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group shadow-2xs"
            >
              {selectedTech ? (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-soft-cream flex items-center justify-center font-bold text-sage text-sm shrink-0 border border-sage/20">
                    {(selectedTech.name || 'T').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-charcoal truncate">
                      {selectedTech.name}
                    </div>
                    <div className="text-xs text-muted-gray truncate">
                      {(selectedTech.specialties || []).join(', ') || 'Spa Specialist'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-muted-gray">
                  <div className="w-8 h-8 rounded-full bg-soft-cream/60 flex items-center justify-center text-muted-gray">
                    <User size={16} />
                  </div>
                  <span className="text-sm font-normal text-muted-gray">
                    Select Main Technician...
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 shrink-0 text-muted-gray group-hover:text-sage transition-colors">
                <span className="text-xs font-medium hidden sm:inline">
                  {selectedTech ? 'Change' : 'Select'}
                </span>
                <ChevronDown size={16} />
              </div>
            </button>
          )}
        </div>

        {/* 4. Date + Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div>
            <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
              Date <span className="text-error">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={update('date')}
              className="w-full h-[50px] px-3.5 sm:px-4 bg-white border border-border rounded-[12px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150 cursor-pointer shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
              Time <span className="text-error">*</span>
              <span className="text-[11px] font-normal text-muted-gray ml-1.5">
                (10:00 AM – 09:00 PM)
              </span>
              {form.time && totalDurationMinutes > 0 && (
                <span className="text-[11px] font-normal text-sage ml-1.5">
                  · {totalDurationMinutes} min (until {newEndTime})
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={() => setShowTimeModal(true)}
              className="w-full h-[50px] px-3.5 sm:px-4 bg-white hover:bg-soft-cream/30 border border-border hover:border-sage rounded-[12px] text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-muted-gray group-hover:text-sage" />
                <span className="text-sm font-semibold text-charcoal">
                  {form.time ? `${form.time} (${minutesToTime(timeToMinutes(form.time))})` : 'Select Booking Time...'}
                </span>
              </div>
              <ChevronDown size={16} className="text-muted-gray" />
            </button>
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

      {/* ========================================================================= */}
      {/* LUXURY MOBILE BOTTOM SHEET 1: CLIENT PICKER                                */}
      {/* ========================================================================= */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="fixed inset-0" onClick={() => setShowClientModal(false)} />

          <div className="relative w-full sm:max-w-lg bg-white rounded-t-[24px] sm:rounded-[20px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Mobile handle indicator */}
            <div className="w-10 h-1 bg-border/80 rounded-full mx-auto mt-2.5 sm:hidden" />

            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-charcoal">Select Client</h3>
                <p className="text-xs text-muted-gray mt-0.5">
                  {filteredClients.length} clients available
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="w-8 h-8 rounded-full bg-soft-cream/80 hover:bg-border/60 flex items-center justify-center text-charcoal transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-border bg-[#FBF9F5] shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-gray" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  autoFocus
                  className="w-full h-10 pl-9 pr-8 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30"
                />
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => setClientSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 divide-y divide-border/40 space-y-1">
              {filteredClients.length === 0 ? (
                <div className="p-8 text-center">
                  <User size={32} className="mx-auto text-muted-gray/40 mb-2" />
                  <p className="text-sm font-medium text-charcoal">No clients found</p>
                  <p className="text-xs text-muted-gray mt-1">Try another search keyword</p>
                </div>
              ) : (
                filteredClients.map((c) => {
                  const isSelected = form.clientId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, clientId: c.id }));
                        setShowClientModal(false);
                      }}
                      className={`p-3 rounded-[12px] flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#EBF3EC] border border-[#7FA285]/40 text-charcoal'
                          : 'hover:bg-soft-cream/60 text-charcoal'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-sage text-white' : 'bg-soft-cream text-sage border border-sage/20'
                        }`}>
                          {(c.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{c.name}</div>
                          <div className="text-xs text-muted-gray flex items-center gap-2 mt-0.5">
                            <span>{c.phone || 'No phone'}</span>
                            {c.loyalty?.balance !== undefined && (
                              <span className="text-[10px] text-sage font-medium bg-white px-1.5 py-0.2 rounded border border-border/60">
                                ★ {c.loyalty.balance} pts
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-sage text-white flex items-center justify-center shrink-0">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-[#FBF9F5] flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-gray hidden sm:inline">New guest?</span>
              <button
                type="button"
                onClick={() => {
                  setShowClientModal(false);
                  navigate('/clients/new');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-border/30 border border-border rounded-[10px] text-xs font-semibold text-charcoal flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="text-sage" />
                <span>Add New Client</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LUXURY MOBILE BOTTOM SHEET 2: SERVICES PICKER                              */}
      {/* ========================================================================= */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="fixed inset-0" onClick={() => setShowServiceModal(false)} />

          <div className="relative w-full sm:max-w-xl bg-white rounded-t-[24px] sm:rounded-[20px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Mobile handle indicator */}
            <div className="w-10 h-1 bg-border/80 rounded-full mx-auto mt-2.5 sm:hidden" />

            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-charcoal">Select Services</h3>
                <p className="text-xs text-muted-gray mt-0.5">
                  {selectedServices.length} service(s) currently selected for this visit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="w-8 h-8 rounded-full bg-soft-cream/80 hover:bg-border/60 flex items-center justify-center text-charcoal transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-border bg-[#FBF9F5] shrink-0 space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-gray" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Search service by name or category..."
                  autoFocus
                  className="w-full h-10 pl-9 pr-8 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30"
                />
                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Horizontal Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full shrink-0 font-medium transition-colors cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-sage text-white shadow-2xs'
                        : 'bg-white text-muted-gray border border-border hover:bg-soft-cream/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Services List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredServices.length === 0 ? (
                <div className="p-8 text-center">
                  <Scissors size={32} className="mx-auto text-muted-gray/40 mb-2" />
                  <p className="text-sm font-medium text-charcoal">No services match your search</p>
                  <p className="text-xs text-muted-gray mt-1">Try another category or term</p>
                </div>
              ) : (
                filteredServices.map((s) => {
                  const countInVisit = selectedServices.filter((sel) => sel.id === s.id).length;
                  const priceFormatted = (typeof s.price === 'number' ? s.price : parseInt(s.price, 10) || 15000).toLocaleString('en-US');
                  const duration = s.numericDuration || parseInt(s.duration, 10) || 30;

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleAddService(s)}
                      className="p-3 bg-white hover:bg-soft-cream/40 border border-border hover:border-sage/60 rounded-[12px] flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-charcoal group-hover:text-sage transition-colors leading-snug">
                          {s.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-gray">
                          {s.category && (
                            <span className="bg-soft-cream px-2 py-0.5 rounded text-[10px] font-medium text-charcoal/80">
                              {s.category}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-gray flex items-center gap-1">
                            <Clock size={11} />
                            {duration} min
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-sm font-bold text-sage font-mono">
                          {priceFormatted} FCFA
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddService(s);
                          }}
                          className={`h-8 px-2.5 rounded-[8px] text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            countInVisit > 0
                              ? 'bg-sage text-white'
                              : 'bg-soft-cream text-sage hover:bg-sage hover:text-white border border-sage/20'
                          }`}
                        >
                          {countInVisit > 0 ? (
                            <>
                              <Check size={12} />
                              <span>Added ({countInVisit})</span>
                            </>
                          ) : (
                            <>
                              <Plus size={12} />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-[#FBF9F5] flex items-center justify-between shrink-0">
              <div className="text-xs text-muted-gray">
                Total Visit Duration: <strong className="text-charcoal">{totalDurationMinutes} min</strong>
              </div>
              <Button
                onClick={() => setShowServiceModal(false)}
                className="h-9 px-5 text-xs font-semibold"
              >
                Done ({selectedServices.length} Selected)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LUXURY MOBILE BOTTOM SHEET 3: TECHNICIAN PICKER                            */}
      {/* ========================================================================= */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="fixed inset-0" onClick={() => setShowTechModal(false)} />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[20px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Mobile handle indicator */}
            <div className="w-10 h-1 bg-border/80 rounded-full mx-auto mt-2.5 sm:hidden" />

            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-charcoal">Select Main Technician</h3>
                <p className="text-xs text-muted-gray mt-0.5">
                  Assign primary specialist for this appointment
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTechModal(false)}
                className="w-8 h-8 rounded-full bg-soft-cream/80 hover:bg-border/60 flex items-center justify-center text-charcoal transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {allTechnicians.map((t) => {
                const isSelected = form.technicianId === String(t.id);
                const conflictInfo = getTechConflictInfo(t.id);

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, technicianId: String(t.id) }));
                      setShowTechModal(false);
                    }}
                    className={`p-3 rounded-[12px] border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#EBF3EC] border-[#7FA285] text-charcoal'
                        : 'bg-white hover:bg-soft-cream/50 border-border text-charcoal'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-sage text-white' : 'bg-soft-cream text-sage border border-sage/20'
                      }`}>
                        {(t.name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{t.name}</div>
                        <div className="text-xs text-muted-gray truncate mt-0.5">
                          {(t.specialties || []).join(', ') || 'Specialist'}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {conflictInfo ? (
                        <span className="text-[10px] font-semibold text-error bg-error-soft px-2 py-0.5 rounded border border-error/20">
                          Busy ({conflictInfo.cStart}–{conflictInfo.cEnd})
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#BBF7D0]">
                          Available
                        </span>
                      )}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-sage text-white flex items-center justify-center shrink-0">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LUXURY MOBILE BOTTOM SHEET 4: TIME SLOT PICKER                             */}
      {/* ========================================================================= */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="fixed inset-0" onClick={() => setShowTimeModal(false)} />

          <div className="relative w-full sm:max-w-lg bg-white rounded-t-[24px] sm:rounded-[20px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Mobile handle indicator */}
            <div className="w-10 h-1 bg-border/80 rounded-full mx-auto mt-2.5 sm:hidden" />

            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-charcoal">Select Booking Time</h3>
                <p className="text-xs text-muted-gray mt-0.5">
                  Operating Hours: 10:00 AM – 09:00 PM
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTimeModal(false)}
                className="w-8 h-8 rounded-full bg-soft-cream/80 hover:bg-border/60 flex items-center justify-center text-charcoal transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {timeSlotGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-gray uppercase tracking-wider">
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {group.slots.map((slot) => {
                      const isSelected = form.time === slot.value;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, time: slot.value }));
                            setShowTimeModal(false);
                          }}
                          className={`py-2 px-2.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-sage text-white shadow-2xs'
                              : 'bg-white hover:bg-soft-cream/80 text-charcoal border border-border'
                          }`}
                        >
                          {slot.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
