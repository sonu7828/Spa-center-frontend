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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TriangleAlert, Check, Plus, X } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useClients } from '../context/ClientsContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useServices } from '../context/ServicesContext';
import { useAuth } from '../context/AuthContext';

export default function CreateAppointment() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { addAppointment } = useAppointments();
  const { getActiveServices } = useServices();
  const { allUsers } = useAuth();
  const activeServices = getActiveServices();

  // All active technicians
  const allTechnicians = allUsers.filter((u) => u.role === 'technician' && u.active !== false);

  const [form, setForm] = useState({
    clientId: '',
    technicianId: '',
    date: '',
    time: '',
  });

  // Multi-service selection: source of truth (starts empty, no pre-selected service)
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceToAdd, setServiceToAdd] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const selectedClient = clients.find((c) => String(c.id) === String(form.clientId));
  const selectedTech = allTechnicians.find((t) => String(t.id) === String(form.technicianId));

  const handleAddService = (serviceName) => {
    if (!serviceName) return;
    const found = activeServices.find((s) => s.name === serviceName);
    if (found) {
      setSelectedServices((prev) => [...prev, found]);
      setServiceToAdd('');
    }
  };

  const handleRemoveService = (indexToRemove) => {
    setSelectedServices((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    setIsSaving(true);
    if (!form.clientId || selectedServices.length === 0 || !form.technicianId || !form.date || !form.time) return;

    const servicesData = selectedServices.map((s, idx) => ({
      appointmentServiceId: `asvc-new-${Date.now()}-${idx}`,
      serviceId: s.id || null,
      name: s.name,
      price: typeof s.price === 'number' ? s.price : parseInt(String(s.price || '0').replace(/[^0-9]/g, ''), 10) || 15000,
      category: s.category || '',
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
      });

      setSaved(true);
      setTimeout(() => navigate('/appointments'), 1200);
    } catch (err) {
      console.error('Failed to create appointment:', err);
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
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
            Client
          </label>
          <select
            value={form.clientId}
            onChange={update('clientId')}
            className="w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150 cursor-pointer appearance-none"
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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

          {/* Add Service Selector */}
          <div className="flex items-center gap-2">
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
        </div>

        {/* Main Technician */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
            Main Technician
            <span className="text-[11px] font-normal text-sage ml-1.5">
              — Primary assigned technician for visit
            </span>
          </label>
          <select
            value={form.technicianId}
            onChange={update('technicianId')}
            className="w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150 cursor-pointer appearance-none"
          >
            <option value="">Select Main Technician</option>
            {allTechnicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {(t.specialties || []).join(', ') || 'Technician'}
              </option>
            ))}
          </select>
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
            </label>
            <input
              type="time"
              value={form.time}
              onChange={update('time')}
              className="w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150"
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!form.clientId || selectedServices.length === 0 || !form.technicianId || !form.date || !form.time}
            className="w-full sm:w-auto h-11 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Appointment
          </Button>
        </div>
      </div>
    </div>
  );
}
