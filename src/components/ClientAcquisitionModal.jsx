/**
 * ClientAcquisitionModal — Employee Client Acquisition & Appointment Form
 *
 * Allows an employee/technician/marketer to:
 *   1. Add a new client (Name, Phone/WhatsApp)
 *   2. Select one or MORE interested spa services with category filtering & search
 *   3. Book an appointment with preferred date & time
 *   4. Assign a performing technician
 *   5. Auto-fill and track "Introduced By" as current employee
 *
 * Connects directly to ClientsContext and AppointmentsContext.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  X,
  Sparkles,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Search,
  Check,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../context/ClientsContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useServices } from '../context/ServicesContext';
import { getDoualaTodayStr, BOOKING_TIME_SLOTS } from '../utils/timezone';
import PhoneInputField from './PhoneInputField';

function getNumericPrice(service) {
  if (typeof service?.numericPrice === 'number' && !isNaN(service.numericPrice)) {
    return service.numericPrice;
  }
  if (typeof service?.price === 'number' && !isNaN(service.price)) {
    return service.price;
  }
  const parsed = parseInt(String(service?.price || '0').replace(/[^0-9]/g, ''), 10);
  return isNaN(parsed) ? 15000 : parsed;
}

export default function ClientAcquisitionModal({ isOpen, onClose, onSuccess }) {
  const { user, allUsers } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'MANAGER';
  const { clients, addClient } = useClients();
  const { addAppointment } = useAppointments();
  const { getActiveServices } = useServices();

  const activeServices = getActiveServices();
  const allTechnicians = allUsers.filter(
    (u) => u.role === 'technician' && u.active !== false
  );

  // Default date: today in Africa/Douala timezone
  const todayStr = getDoualaTodayStr();

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+237 ');
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [preferredDate, setPreferredDate] = useState(todayStr);
  const [preferredTime, setPreferredTime] = useState('14:00');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(
    user?.role === 'technician'
      ? String(user.id)
      : String(allTechnicians[0]?.id || '')
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if client was already created (for retry-safe flow)
  const [savedClientId, setSavedClientId] = useState(null);

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsSubmitting(false);
      setServiceSearch('');
      setSelectedCategory('ALL');
      if (!savedClientId) {
        setClientName('');
        setClientPhone('+237 ');
        setSelectedServices([]);
        setPreferredDate(getDoualaTodayStr());
        setPreferredTime('14:00');
        setAssignedTechnicianId(
          user?.role === 'technician'
            ? String(user.id)
            : String(allTechnicians[0]?.id || '')
        );
      }
    }
  }, [isOpen]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    activeServices.forEach((s) => {
      if (s.category && typeof s.category === 'string') {
        set.add(s.category.trim());
      }
    });
    return ['ALL', ...Array.from(set)];
  }, [activeServices]);

  // Filtered services based on search query and selected category
  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return activeServices.filter((s) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (s.category && s.category.trim().toLowerCase() === selectedCategory.toLowerCase());
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeServices, selectedCategory, serviceSearch]);

  // Total price and duration calculation
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + getNumericPrice(s), 0);
  }, [selectedServices]);

  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
      const d = Number(s.numericDuration || parseInt(String(s.duration || '30'), 10)) || 30;
      return sum + d;
    }, 0);
  }, [selectedServices]);

  if (!isOpen) return null;

  const clientAlreadySaved = Boolean(savedClientId);

  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => (s.id && s.id === service.id) || s.name === service.name);
      if (exists) {
        return prev.filter((s) => !((s.id && s.id === service.id) || s.name === service.name));
      } else {
        return [...prev, service];
      }
    });
    setError('');
  };

  const removeService = (serviceToRemove) => {
    setSelectedServices((prev) =>
      prev.filter((s) => !((s.id && s.id === serviceToRemove.id) || s.name === serviceToRemove.name))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = clientName.trim();
    const trimmedPhone = clientPhone.trim();

    if (!trimmedName) {
      setError('Please enter the client name.');
      return;
    }
    if (!trimmedPhone || trimmedPhone === '+237') {
      setError('Please enter the client phone or WhatsApp number.');
      return;
    }
    if (selectedServices.length === 0) {
      setError('Please select at least one interested service.');
      return;
    }
    if (!preferredDate) {
      setError('Please select a preferred date.');
      return;
    }
    if (!preferredTime) {
      setError('Please select a preferred time.');
      return;
    }
    if (preferredTime < '10:00' || preferredTime > '21:00') {
      setError('Preferred time must be between 10:00 AM and 9:00 PM (10:00 – 21:00).');
      return;
    }

    const assignedTech = allTechnicians.find(
      (t) => String(t.id) === String(assignedTechnicianId)
    );
    if (!assignedTech) {
      setError('Please select an assigned technician.');
      return;
    }

    const serviceSummary = selectedServices.map((s) => s.name).join(', ');

    setIsSubmitting(true);

    // ── Step 1: Create Client (only if not already saved) ──
    let clientId = savedClientId;

    if (!clientId) {
      // Check if client with this phone number already exists
      const cleanInputPhone = trimmedPhone.replace(/[\s\-\+\(\)]/g, '');
      const existing = clients?.find((c) => {
        const cleanExisting = (c.phone || '').replace(/[\s\-\+\(\)]/g, '');
        return cleanExisting && cleanExisting === cleanInputPhone;
      });
      if (existing) {
        setIsSubmitting(false);
        setError(`Client with phone number ${trimmedPhone} already exists (${existing.name}). Please select them from existing clients.`);
        return;
      }

      try {
        clientId = await addClient({
          name: trimmedName,
          phone: trimmedPhone,
          introducedBy: isManager ? null : (user?.name || 'Staff'),
          introducedById: isManager ? null : (user?.id || null),
          firstAppointmentService: serviceSummary,
          clientSource: isManager ? 'Direct' : 'Staff Referral',
          source: isManager ? 'DIRECT' : undefined,
        });
        // Save client ID so retry skips this step
        setSavedClientId(clientId);
      } catch (err) {
        setIsSubmitting(false);
        setError(err.message || 'Failed to add client. Phone number already exists.');
        return;
      }
    }

    // ── Step 2: Create Appointment with Multi-Services ──
    const servicesPayload = selectedServices.map((s, idx) => ({
      appointmentServiceId: `asvc-acq-${Date.now()}-${idx}`,
      serviceId: s.id || null,
      name: s.name,
      price: getNumericPrice(s),
      category: s.category || 'facial',
      duration: Number(s.numericDuration || parseInt(String(s.duration || '30'), 10)) || 30,
    }));

    try {
      await addAppointment({
        clientId,
        clientName: trimmedName,
        service: serviceSummary,
        services: servicesPayload,
        category: selectedServices[0]?.category || 'facial',
        date: preferredDate,
        time: preferredTime,
        technicianId: assignedTech.id,
        technicianName: assignedTech.name,
        status: 'scheduled',
        introducedBy: isManager ? null : (user?.name || 'Staff'),
        introducedById: isManager ? null : (user?.id || null),
      });

      onSuccess?.({
        clientName: trimmedName,
        service: serviceSummary,
        services: selectedServices,
        totalPrice,
        technician: assignedTech.name,
        date: preferredDate,
        time: preferredTime,
      });

      setSavedClientId(null);
      setClientName('');
      setClientPhone('+237 ');
      setSelectedServices([]);
      onClose();
    } catch (err) {
      console.error('Failed to create appointment in acquisition modal:', err);
      const apiMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Appointment booking failed. Please change the time or technician and try again.';
      setError(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-soft-cream rounded-[18px] border border-border shadow-card max-w-xl sm:max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-warm-ivory shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center">
              <UserPlus size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-charcoal">Add New Client & Book</h3>
              <p className="text-[11px] text-muted-gray">
                {isManager ? 'Client & Appointment Booking' : 'Client Acquisition & Referral Booking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-soft-cream hover:bg-border flex items-center justify-center transition-colors cursor-pointer text-muted-gray hover:text-charcoal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-[10px] bg-error-soft text-error border border-error/20 flex items-center gap-2.5 text-xs">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Client Already Saved Banner */}
          {clientAlreadySaved && (
            <div className="p-3 rounded-[10px] bg-success-soft text-[#4F6748] border border-success/25 flex items-center gap-2.5 text-xs">
              <CheckCircle size={15} className="shrink-0 text-success" />
              <span>
                Client <strong>{clientName.trim()}</strong> saved ✓ — Please select a different time or technician and try again.
              </span>
            </div>
          )}

          {/* Auto-filled Introduced By Employee Banner */}
          {!isManager && (
            <div className="bg-[#FAF5FF] rounded-[11px] border border-[#DDD6FE] p-2.5 sm:p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px] bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center">
                  <UserCheck size={14} />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-gray block">
                    Introduced By
                  </span>
                  <span className="text-xs font-bold text-charcoal">
                    {user?.name || 'Staff'}{' '}
                    <span className="text-muted-gray font-normal">({user?.role || 'Marketer'})</span>
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-[#6D28D9] bg-white px-2.5 py-1 rounded-[6px] border border-[#DDD6FE] shadow-2xs">
                ✓ Auto-filled
              </span>
            </div>
          )}

          {/* Client Name & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 block">
                Client Name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Marie Claire"
                disabled={clientAlreadySaved}
                className={`w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-[#6D28D9] transition-colors placeholder:text-muted-gray/50 font-medium ${
                  clientAlreadySaved ? 'bg-soft-cream/60 opacity-70 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>

            <PhoneInputField
              value={clientPhone}
              onChange={(val) => setClientPhone(val)}
              label="Phone / WhatsApp"
              required
              disabled={clientAlreadySaved}
            />
          </div>

          {/* ── Multi-Service Selection Section ── */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#6D28D9]" />
                Interested Services (Multi-Select) *
              </label>
              {selectedServices.length > 0 && (
                <span className="text-[10px] sm:text-[11px] font-bold text-[#6D28D9] bg-[#EDE9FE] px-2.5 py-0.5 rounded-full">
                  {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'} ·{' '}
                  {totalPrice.toLocaleString('en-US')} FCFA
                  {totalDurationMinutes > 0 && ` (${totalDurationMinutes} min)`}
                </span>
              )}
            </div>

            {/* Selected Service Badges */}
            {selectedServices.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gradient-to-r from-[#FAF8F5] to-[#F5F3FF] border border-[#DDD6FE] rounded-[11px]">
                {selectedServices.map((svc) => (
                  <span
                    key={svc.id || svc.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white border border-[#DDD6FE] text-[11px] font-semibold text-charcoal shadow-2xs"
                  >
                    <span>{svc.name}</span>
                    <span className="text-[10px] font-bold text-[#6D28D9]">
                      {getNumericPrice(svc).toLocaleString('en-US')} FCFA
                    </span>
                    <button
                      type="button"
                      onClick={() => removeService(svc)}
                      className="text-muted-gray hover:text-error transition-colors p-0.5 cursor-pointer ml-0.5 rounded hover:bg-error-soft/60"
                      title={`Remove ${svc.name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {selectedServices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedServices([])}
                    className="text-[10px] text-muted-gray hover:text-error underline px-1.5 py-1 cursor-pointer self-center ml-auto font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-gray italic">
                No service selected yet. Choose one or more services from the catalog below:
              </p>
            )}

            {/* Search Input & Category Pills */}
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Search spa treatments by name or category..."
                  className="w-full pl-9 pr-8 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-[#6D28D9] transition-all placeholder:text-muted-gray/50"
                />
                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal p-0.5 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => {
                  const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#6D28D9] text-white shadow-2xs'
                          : 'bg-white border border-border/80 text-muted-gray hover:text-charcoal hover:border-border'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Cards Catalog */}
            <div className="border border-border rounded-[11px] bg-white divide-y divide-border/60 max-h-52 overflow-y-auto shadow-2xs">
              {filteredServices.length === 0 ? (
                <div className="p-5 text-center text-xs text-muted-gray">
                  No treatments found matching "{serviceSearch}".
                </div>
              ) : (
                filteredServices.map((svc) => {
                  const isSelected = selectedServices.some(
                    (s) => (s.id && s.id === svc.id) || s.name === svc.name
                  );
                  const priceNum = getNumericPrice(svc);
                  return (
                    <div
                      key={svc.id || svc.name}
                      onClick={() => toggleService(svc)}
                      className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#F5F3FF] hover:bg-[#EDE9FE]/70'
                          : 'hover:bg-warm-ivory/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox indicator */}
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#6D28D9] text-white shadow-2xs'
                              : 'border border-border bg-white'
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>

                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[#5B21B6]' : 'text-charcoal'}`}>
                            {svc.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {svc.category && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#6D28D9] bg-[#EDE9FE] px-1.5 py-0.5 rounded">
                                {svc.category}
                              </span>
                            )}
                            {(svc.duration || svc.numericDuration) && (
                              <span className="text-[10px] text-muted-gray">
                                · {svc.duration || `${svc.numericDuration} min`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-xs font-bold text-charcoal block">
                          {priceNum.toLocaleString('en-US')} FCFA
                        </span>
                        <span className={`text-[10px] font-semibold ${isSelected ? 'text-[#6D28D9]' : 'text-muted-gray'}`}>
                          {isSelected ? 'Selected ✓' : '+ Add'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Preferred Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/60">
            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={11} className="text-[#6D28D9]" />
                Preferred Date *
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-[#6D28D9] transition-colors font-medium"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={11} className="text-[#6D28D9]" />
                Preferred Time (10:00 AM – 09:00 PM) *
              </label>
              <select
                value={preferredTime}
                onChange={(e) => {
                  setPreferredTime(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-[#6D28D9] transition-colors font-medium cursor-pointer"
                required
              >
                {BOOKING_TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Technician */}
          <div>
            <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 block">
              Assigned Technician *
            </label>
            <select
              value={assignedTechnicianId}
              onChange={(e) => {
                setAssignedTechnicianId(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-[#6D28D9] transition-colors cursor-pointer font-medium"
            >
              {allTechnicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} — {(tech.specialties || []).join(', ') || 'Technician'}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-[10px] border border-border bg-white text-xs font-semibold text-muted-gray hover:text-charcoal hover:bg-warm-ivory transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={15} />
              {isSubmitting
                ? 'Booking Appointment...'
                : clientAlreadySaved
                ? 'Retry Book Appointment'
                : selectedServices.length > 0
                ? `Book (${selectedServices.length} Svc · ${totalPrice.toLocaleString('en-US')} FCFA)`
                : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

