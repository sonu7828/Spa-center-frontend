/**
 * ClientAcquisitionModal — Employee Client Acquisition & Appointment Form
 *
 * Allows an employee/technician to:
 *   1. Add a new client (Name, Phone/WhatsApp)
 *   2. Recommend an interested spa service
 *   3. Book an appointment with preferred date & time
 *   4. Assign a performing technician
 *   5. Auto-fill and track "Introduced By" as current employee
 *
 * Connects directly to ClientsContext and AppointmentsContext.
 * Frontend only — no backend/commission logic.
 *
 * Source: Employee Client Acquisition UI spec §2, §3
 */

import { useState } from 'react';
import {
  UserPlus,
  X,
  Sparkles,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../context/ClientsContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useServices } from '../context/ServicesContext';

export default function ClientAcquisitionModal({ isOpen, onClose, onSuccess }) {
  const { user, allUsers } = useAuth();
  const { addClient } = useClients();
  const { addAppointment } = useAppointments();
  const { getActiveServices } = useServices();

  const activeServices = getActiveServices();
  const allTechnicians = allUsers.filter(
    (u) => u.role === 'technician' && u.active !== false
  );

  // Default date: today in YYYY-MM-DD
  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+237 ');
  const [interestedService, setInterestedService] = useState(
    activeServices[0]?.name || 'Classic Facial'
  );
  const [preferredDate, setPreferredDate] = useState(todayStr);
  const [preferredTime, setPreferredTime] = useState('14:00');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(
    // Default to current employee if technician, else first technician
    user?.role === 'technician'
      ? String(user.id)
      : String(allTechnicians[0]?.id || '')
  );
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTimeFormat = (timeVal) => {
    if (!timeVal) return '14:00';
    const [h, m] = timeVal.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const handleSubmit = (e) => {
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
    if (!interestedService) {
      setError('Please select an interested service.');
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

    const assignedTech = allTechnicians.find(
      (t) => String(t.id) === String(assignedTechnicianId)
    );
    if (!assignedTech) {
      setError('Please select an assigned technician.');
      return;
    }

    const selectedServiceObj = activeServices.find(
      (s) => s.name === interestedService
    );

    // 1. Add client to ClientsContext with acquisition tracking
    const newClientId = addClient({
      name: trimmedName,
      phone: trimmedPhone,
      introducedBy: user?.name || 'Staff',
      introducedById: user?.id || null,
      firstAppointmentService: interestedService,
      clientSource: 'Staff Referral',
    });

    // 2. Create appointment in AppointmentsContext with acquisition tracking
    const priceNum = selectedServiceObj?.price
      ? parseInt(String(selectedServiceObj.price).replace(/[^0-9]/g, ''), 10) || 15000
      : 15000;

    addAppointment({
      clientId: newClientId,
      clientName: trimmedName,
      service: interestedService,
      services: [
        {
          appointmentServiceId: `asvc-acq-${Date.now()}`,
          serviceId: selectedServiceObj?.id || null,
          name: interestedService,
          price: priceNum,
          category: selectedServiceObj?.category || 'facial',
        },
      ],
      category: selectedServiceObj?.category || 'facial',
      date: preferredDate,
      time: handleTimeFormat(preferredTime),
      technicianId: Number(assignedTech.id),
      technicianName: assignedTech.name,
      status: 'scheduled',
      introducedBy: user?.name || 'Staff',
      introducedById: user?.id || null,
    });

    onSuccess?.({
      clientName: trimmedName,
      service: interestedService,
      technician: assignedTech.name,
      date: preferredDate,
      time: handleTimeFormat(preferredTime),
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-soft-cream rounded-[16px] border border-border shadow-card max-w-md w-full overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-warm-ivory">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-sage-soft flex items-center justify-center text-sage-hover">
              <UserPlus size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal">Add New Client & Book</h3>
              <p className="text-[10px] text-muted-gray">Client Acquisition & Appointment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-soft-cream hover:bg-border flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={14} className="text-muted-gray" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-[9px] bg-error-soft text-error border border-error/20 flex items-center gap-2 text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Auto-filled Introduced By Employee Banner */}
          <div className="bg-sage-soft/70 rounded-[10px] border border-sage/25 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck size={14} className="text-sage-hover shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-gray block">
                  Introduced By
                </span>
                <span className="text-xs font-bold text-charcoal">
                  {user?.name || 'Staff'} <span className="text-muted-gray font-normal">({user?.role})</span>
                </span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-sage-hover bg-white px-2 py-0.5 rounded-[5px] border border-sage/20">
              ✓ Auto-filled
            </span>
          </div>

          {/* Client Name */}
          <div>
            <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 block">
              Client Name *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Marie Claire"
              className="w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-sage transition-colors placeholder:text-muted-gray/50 font-medium"
              required
            />
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 block">
              Phone / WhatsApp *
            </label>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+237 6XX XX XX XX"
              className="w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-sage transition-colors placeholder:text-muted-gray/50 font-medium font-mono"
              required
            />
          </div>

          {/* Interested Service */}
          <div>
            <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles size={11} className="text-sage" />
              Interested Service *
            </label>
            <select
              value={interestedService}
              onChange={(e) => setInterestedService(e.target.value)}
              className="w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-sage transition-colors cursor-pointer font-medium"
            >
              {activeServices.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.category}) {s.price ? `— ${s.price} FCFA` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Date & Time Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={11} className="text-sage" />
                Preferred Date *
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-sage transition-colors font-medium"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={11} className="text-sage" />
                Preferred Time *
              </label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-sage transition-colors font-medium"
                required
              />
            </div>
          </div>

          {/* Assigned Technician */}
          <div>
            <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-1 block">
              Assigned Technician *
            </label>
            <select
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              className="w-full px-3 py-2 rounded-[9px] border border-border bg-white text-xs text-charcoal focus:outline-none focus:border-sage transition-colors cursor-pointer font-medium"
            >
              {allTechnicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} — {(tech.specialties || []).join(', ') || 'Technician'}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-[9px] border border-border bg-white text-xs font-semibold text-muted-gray hover:text-charcoal hover:bg-warm-ivory transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] bg-sage hover:bg-sage-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <CheckCircle size={14} />
              Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
