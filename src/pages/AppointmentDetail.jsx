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

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, UserX, CheckCircle, Plus, X, XCircle, FileText, Star, Copy, ExternalLink, MessageCircle, Check, Sparkles } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAppointments, formatAppointmentId } from '../context/AppointmentsContext';
import { useOperations } from '../context/OperationsContext';
import { useServices } from '../context/ServicesContext';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { whatsappApi } from '../services/api';
import { getDoualaTodayStr, getDoualaCurrentTimeStr } from '../utils/timezone';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAppointment, addServiceToAppointment, removeServiceFromAppointment, cancelAppointment } = useAppointments();
  const { isAppointmentClosed } = useOperations();
  const { getActiveServices } = useServices();
  const { user } = useAuth();
  const activeServices = getActiveServices ? getActiveServices() : [];

  const apt = getAppointment(id);
  const isClosed = isAppointmentClosed(id) || apt?.status === 'completed';

  const todayDateStr = getDoualaTodayStr();
  const currentDoualaTime = getDoualaCurrentTimeStr();
  const aptDate = apt?.date ? apt.date.slice(0, 10) : '';
  const isPastDate = aptDate && todayDateStr && aptDate < todayDateStr;
  const isToday = aptDate && todayDateStr && aptDate === todayDateStr;

  function timeToMins(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  const aptMins = timeToMins(apt?.time);
  const nowMins = timeToMins(currentDoualaTime);

  const isAutoLate = isToday && aptMins > 0 && nowMins > (aptMins + 15);
  const isAutoNoShow = isPastDate || (isToday && nowMins >= 21 * 60 + 30);

  const isNoShow = !isClosed && (apt?.status === 'no-show' || apt?.rawStatus === 'NO_SHOW' || isAutoNoShow);
  const isLate = !isClosed && !isNoShow && (apt?.status === 'late' || apt?.rawStatus === 'LATE' || isAutoLate);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState(activeServices[0]?.name || '');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const { getFeedbackByAppointment, createFeedbackRequest } = useFeedback();
  const existingFeedback = getFeedbackByAppointment(id);
  const [feedbackUrlState, setFeedbackUrlState] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppNotice, setWhatsAppNotice] = useState('');

  // Auto-generate feedback request & URL when appointment is closed
  useEffect(() => {
    if (feedbackUrlState) return;
    if (isClosed && apt) {
      createFeedbackRequest({
        appointmentId: id,
        clientId: apt.clientId,
        clientName: apt.clientName,
        service: apt.service,
        technician: apt.technicianName,
        date: apt.date,
      }).then((res) => {
        if (res?.url) setFeedbackUrlState(res.url);
      });
    }
  }, [isClosed, id, apt?.clientName, createFeedbackRequest, feedbackUrlState]);

  const handleCopyFeedbackLink = () => {
    if (!feedbackUrlState) return;
    navigator.clipboard.writeText(feedbackUrlState);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendFeedbackWhatsApp = async () => {
    if (!apt) return;
    const phone = apt.clientPhone;
    setSendingWhatsApp(true);
    setWhatsAppNotice('');
    try {
      await whatsappApi.triggerAfterService(id);
      setWhatsAppNotice('✓ Thank You message with Feedback link sent via WhatsApp!');
    } catch (err) {
      const text = encodeURIComponent(
        `Bonjour ${apt.clientName || ''} ! Merci d'avoir visité OMEGA SPA 🌿\n\nNous espérons que vous avez apprécié votre prestation (${apt.service || 'soin'}).\n\n⭐ Votre avis compte énormément pour nous ! Donnez votre avis en quelques secondes ici :\n${feedbackUrlState}\n\n— OMEGA SPA Douala`
      );
      const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '') : '';
      const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
      window.open(waUrl, '_blank');
      setWhatsAppNotice('✓ WhatsApp opened with feedback message!');
    } finally {
      setSendingWhatsApp(false);
      setTimeout(() => setWhatsAppNotice(''), 6000);
    }
  };

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
  const canCancel = role === 'manager' || role === 'reception';

  const handleCancelAppointment = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      await cancelAppointment(apt.id);
      setShowCancelModal(false);
      navigate('/appointments');
    } catch (err) {
      setCancelError(err?.message || 'Failed to cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[6px] border ${
                isClosed
                  ? 'bg-[#DCE7D7] border-[#B7CEB1] text-[#2F4E29]'
                  : isNoShow
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  : isLate
                  ? 'bg-[#FFFDF5] border-[#FDE68A] text-[#92400E]'
                  : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
              }`}
            >
              {isClosed ? '✓ Completed' : isNoShow ? '✕ No-Show' : isLate ? '⚠ Late' : '🕒 Scheduled'}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-soft-cream border border-border text-muted-gray">
              Appt #{formatAppointmentId(apt.id)}
            </span>
          </div>
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

        {/* Service Notes & Observations */}
        {apt.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-sage" />
              Service Notes & Observations
            </h3>
            <div className="p-3 bg-warm-ivory/60 border border-border/80 rounded-[10px] text-xs text-charcoal leading-relaxed whitespace-pre-wrap">
              {apt.notes}
            </div>
          </div>
        )}

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
      {!isClosed && apt.status !== 'cancelled' && (
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

          {canCancel && (
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(true)}
              className="h-11 sm:h-12 w-full justify-center gap-2 text-xs sm:text-sm text-error border-error/30 hover:border-error"
            >
              <XCircle size={16} strokeWidth={1.8} />
              <span>Cancel Appointment</span>
            </Button>
          )}
        </div>
      )}

      {apt.status === 'cancelled' && (
        <div className="bg-white border border-error/30 rounded-[16px] p-4 shadow-card">
          <p className="text-sm font-semibold text-error">✕ This appointment has been cancelled</p>
        </div>
      )}

      {/* Client Feedback Card (When Completed / Closed) */}
      {isClosed && (
        <div className="bg-white border border-[#E4E4E7] rounded-[16px] p-5 shadow-card space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-[#F59E0B] fill-[#F59E0B]" />
              <h3 className="text-sm font-bold text-charcoal">Client Feedback & Review</h3>
            </div>
            {existingFeedback ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF3EC] text-[#4F6748] border border-[#7FA285]/30">
                ✓ Received
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                Pending Response
              </span>
            )}
          </div>

          {existingFeedback ? (
            <div className="bg-[#FBF9F5] border border-[#E4E4E7] rounded-[12px] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= existingFeedback.rating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#E4E4E7]'}
                    />
                  ))}
                  <span className="text-xs font-bold text-charcoal ml-1.5">
                    {existingFeedback.rating} / 5 Stars
                  </span>
                </div>
                <span className="text-[11px] text-muted-gray">{existingFeedback.date}</span>
              </div>
              {existingFeedback.comment && (
                <p className="text-xs text-charcoal/80 italic mt-1 bg-white p-2.5 rounded-[8px] border border-[#E4E4E7]/60">
                  "{existingFeedback.comment}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-gray leading-relaxed">
                Send the Thank You message with the feedback form link directly to the client's WhatsApp, or open and fill it now:
              </p>

              {/* Feedback Link Box */}
              {feedbackUrlState && (
                <div className="flex items-center gap-2 bg-[#FBF9F5] border border-[#E4E4E7] rounded-[10px] p-2 text-xs">
                  <span className="truncate text-muted-gray flex-1 font-mono text-[11px]">
                    {feedbackUrlState}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyFeedbackLink}
                    className="px-2.5 py-1 rounded-[6px] bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-charcoal font-medium text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={feedbackUrlState}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-[6px] bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-charcoal font-medium text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ExternalLink size={12} />
                    Open Form
                  </a>
                </div>
              )}

              {/* Action Button: Send on WhatsApp */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  onClick={handleSendFeedbackWhatsApp}
                  disabled={sendingWhatsApp}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white border-transparent text-xs h-9 font-semibold flex items-center gap-1.5"
                >
                  <MessageCircle size={15} />
                  {sendingWhatsApp ? 'Sending...' : 'Send Feedback Form on WhatsApp'}
                </Button>
              </div>

              {whatsAppNotice && (
                <div className="text-xs font-medium text-[#4F6748] bg-[#EBF3EC] border border-[#7FA285]/40 rounded-[8px] p-2.5 flex items-center gap-2 animate-fade-in">
                  <Check size={14} />
                  {whatsAppNotice}
                </div>
              )}
            </div>
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

      {/* Cancel Appointment Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[16px] max-w-sm w-full p-5 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-charcoal">Cancel Appointment</h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-gray mb-1">
              Are you sure you want to cancel this appointment?
            </p>
            <p className="text-xs text-muted-gray mb-4">
              <strong>{apt.clientName}</strong> — {apt.service} at {apt.time}
            </p>

            {cancelError && (
              <div className="text-xs text-error bg-error/10 border border-error/20 rounded-[8px] p-2 mb-3">
                {cancelError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowCancelModal(false)}
                className="text-xs h-9"
                disabled={cancelLoading}
              >
                Keep Appointment
              </Button>
              <Button
                onClick={handleCancelAppointment}
                className="text-xs h-9 font-semibold bg-error hover:bg-error/90 text-white border-error"
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Appointment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
