/**
 * AppointmentDetail — Screen 08
 *
 * Locked content:
 *   - Client
 *   - Service
 *   - Technician
 *   - Time
 *
 * Actions (role-aware):
 *   Manager:    Mark Late, Mark No-Show, Close Service
 *   Reception:  Mark Late, Mark No-Show (no Close Service)
 *   Technician: Close Service only (own appointments)
 *
 * Source: WIREFRAME.md Screen 08, FLOW.md §15
 */

import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, UserX, CheckCircle, Plus, X } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAppointments } from '../context/AppointmentsContext';
import { useOperations } from '../context/OperationsContext';
import { useServices } from '../context/ServicesContext';
import { useAuth, ROLE_HOME } from '../context/AuthContext';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAppointment, addServiceToAppointment, removeServiceFromAppointment } = useAppointments();
  const { isAppointmentClosed } = useOperations();
  const { getActiveServices } = useServices();
  const { user } = useAuth();
  const activeServices = getActiveServices ? getActiveServices() : [];

  const apt = getAppointment(id);
  const isClosed = isAppointmentClosed(id) || apt?.status === 'completed';

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState(activeServices[0]?.name || '');

  // Technician: block if not own appointment
  if (apt && user?.role === 'technician' && apt.technicianName !== user?.name) {
    return <Navigate to={ROLE_HOME[user.role] || '/appointments'} replace />;
  }

  const role = user?.role || 'manager';
  const handleStartService = async () => {
    await updateAppointment(apt.id, { status: 'in-progress' });
  };
  const canMarkLate = role === 'manager' || role === 'reception';
  const canMarkNoShow = role === 'manager' || role === 'reception';
  const canCloseService = role === 'manager' || role === 'technician';

  if (!apt) {
    return (
      <div>
        <PageHeader title="Appointment" />
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <p className="text-sm text-muted-gray">Appointment not found.</p>
        </div>
      </div>
    );
  }

  const servicesList = apt.services?.length
    ? apt.services
    : [{ appointmentServiceId: `asvc-${apt.id}-1`, name: apt.service, price: 15000 }];

  const handleConfirmAddService = () => {
    const s = activeServices.find((item) => item.name === selectedServiceToAdd);
    if (!s) return;
    addServiceToAppointment(apt.id, {
      serviceId: s.id,
      name: s.name,
      price: typeof s.price === 'number' ? s.price : parseInt(String(s.price || '0').replace(/[^0-9]/g, ''), 10) || 15000,
      category: s.category || '',
    });
    setShowAddModal(false);
  };

  return (
    <div>
      <PageHeader
        title="Appointment"
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/appointments')}
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            Back
          </Button>
        }
      />

      {/* Appointment Info — Locked minimal card */}
      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-charcoal">
            {apt.clientName}
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-soft-cream border border-border text-muted-gray">
            Appt #{apt.id}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-xs sm:text-sm text-muted-gray pt-2.5 border-t border-border/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-gray block">Service</span>
            <span className="text-charcoal font-semibold">{apt.service || servicesList.map((s) => s.name).join(', ') || 'Spa Service'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-gray block">Performing Technician</span>
            <span className="text-charcoal font-semibold">{apt.technicianName}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-gray block">Date & Time</span>
            <span className="text-charcoal font-semibold font-mono">{apt.date} · {apt.time}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-gray block">Introduced By Employee</span>
            <span className="text-charcoal font-semibold">
              {apt.introducedBy ? (
                <span className="bg-sage-soft text-sage-hover px-2 py-0.5 rounded-[4px] font-bold text-xs inline-block">
                  {apt.introducedBy}
                </span>
              ) : (
                'Direct Booking'
              )}
            </span>
          </div>
        </div>

        {/* Booked Services for this Visit */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
              Services Included in this Visit ({servicesList.length})
            </h3>
            {!isClosed && (
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(true)}
                className="text-xs h-8 px-2.5 gap-1 cursor-pointer"
              >
                <Plus size={13} strokeWidth={2} />
                <span>Add Service</span>
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {servicesList.map((s, idx) => (
              <div
                key={s.appointmentServiceId || idx}
                className="flex items-center justify-between p-3 bg-soft-cream/50 border border-border/70 rounded-[10px] text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-charcoal truncate">{s.name}</span>
                  <span className="text-xs text-muted-gray shrink-0 font-mono">
                    ({(s.price || 15000).toLocaleString('en-US')} FCFA)
                  </span>
                </div>
                {!isClosed && servicesList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeServiceFromAppointment(apt.id, s.appointmentServiceId)}
                    className="text-muted-gray hover:text-error transition-colors p-1 cursor-pointer"
                    title="Remove service from visit"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isClosed && (
          <p className="text-xs font-semibold text-success mt-3 pt-2 border-t border-border/50">
            ✓ Service Closed
          </p>
        )}
      </div>

      {/* Modal: Add Extra Service During Visit */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[16px] max-w-sm w-full p-5 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-charcoal">Add Extra Service to Visit</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-gray mb-3">
              Add another service to {apt.clientName}&apos;s visit without creating a separate appointment.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Select Service
              </label>
              <select
                value={selectedServiceToAdd}
                onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
              >
                {activeServices.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({(typeof s.price === 'number' ? s.price : parseInt(s.price, 10) || 15000).toLocaleString('en-US')} FCFA)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAddService}
                className="text-xs h-9 font-semibold"
              >
                Add to Visit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions — role-aware */}
      {!isClosed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {canMarkLate && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/appointments/${id}/late`)}
              className="h-11 sm:h-12 w-full justify-center gap-2 text-xs sm:text-sm"
            >
              <Clock size={16} strokeWidth={1.8} />
              <span>Mark Late</span>
            </Button>
          )}

          {canMarkNoShow && (
            <Button
              variant="warning"
              onClick={() => navigate(`/appointments/${id}/no-show`)}
              className="h-11 sm:h-12 w-full justify-center gap-2 text-xs sm:text-sm"
            >
              <UserX size={16} strokeWidth={1.8} />
              <span>Mark No-Show</span>
            </Button>
          )}

          {canCloseService && (
            <Button
              variant="primary"
              onClick={() => navigate(`/appointments/${id}/close`)}
              className="h-11 sm:h-12 w-full justify-center gap-2 text-xs sm:text-sm"
            >
              <CheckCircle size={16} strokeWidth={1.8} />
              <span>Close Service</span>
            </Button>
          )}
        </div>
      )}

      {isClosed && canCloseService && (
        <div>
          <Button
            variant="secondary"
            onClick={() => navigate(`/appointments/${id}/close`)}
            className="h-11 w-full sm:w-auto justify-center text-xs sm:text-sm"
          >
            View Closed Service Summary
          </Button>
        </div>
      )}
    </div>
  );
}
