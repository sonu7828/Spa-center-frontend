/**
 * CloseService — Screen 11 (Updated for Invoice Workflow)
 *
 * TECHNICIAN FLOW:
 *   - Auto-fills Client, Service, Technician
 *   - Selects Product Used, confirms Price
 *   - Submits invoice line item → Invoice status: PENDING_PAYMENT
 *   - Does NOT collect payment, select Cash/MoMo, or mark Paid
 *
 * MANAGER FLOW:
 *   - Same as technician (can also submit invoices)
 *
 * RECEPTION:
 *   - No access to CloseService (redirected)
 *
 * Multiple technician services for the same client merge into one invoice.
 *
 * Source: WIREFRAME.md Screen 11, FLOW.md §20-24
 */

import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Award, Sparkles, Send, FileText, Users, Plus, X } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAppointments } from '../context/AppointmentsContext';
import { useClients } from '../context/ClientsContext';
import { useOperations } from '../context/OperationsContext';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import { useLoyalty } from '../context/LoyaltyContext';
import { useServices } from '../context/ServicesContext';
import { useInvoices } from '../context/InvoiceContext';
import { appointmentsApi } from '../services/api';
import { Camera, FileEdit } from 'lucide-react';

export default function CloseService() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAppointment, updateAppointment, addServiceToAppointment, removeServiceFromAppointment } = useAppointments();
  const { clients } = useClients();
  const { isAppointmentClosed, deductServiceStock } = useOperations();
  const { getClientLoyalty, calculateEarnedPoints } = useLoyalty();
  const { getActiveServices } = useServices();
  const {
    createOrAddToInvoice,
    submitInvoiceByClient,
    submitAppointmentInvoice,
    isAppointmentInvoiced,
    getInvoiceByAppointment,
  } = useInvoices();

  const activeServices = getActiveServices ? getActiveServices() : [];
  const apt = getAppointment(id);
  const { user } = useAuth();
  const alreadyClosed = isAppointmentClosed(id) || apt?.status === 'completed';
  const alreadyInvoiced = isAppointmentInvoiced(id);

  // Technician: block if not own appointment. Reception: no close service access.
  if (apt && user?.role === 'technician' && apt.technicianName !== user?.name) {
    return <Navigate to={ROLE_HOME[user.role] || '/appointments'} replace />;
  }
  if (user?.role === 'reception') {
    return <Navigate to={ROLE_HOME[user.role] || '/clients'} replace />;
  }

  // Find linked client ID
  const linkedClient = clients.find(
    (c) => c.id === apt?.clientId || c.name.toLowerCase() === apt?.clientName?.toLowerCase()
  );
  const targetClientId = linkedClient ? linkedClient.id : apt?.clientId || 1;
  const clientLoyalty = getClientLoyalty(targetClientId);

  // Read booked services array from appointment (source of truth)
  const servicesList = apt?.services?.length
    ? apt.services
    : apt
    ? [{ appointmentServiceId: `asvc-${apt.id}-1`, name: apt.service || 'Service', price: 15000, category: apt.category || '' }]
    : [];

  // Editable prices per service line
  const [pricesByServiceId, setPricesByServiceId] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState(activeServices[0]?.name || '');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [serviceNotes, setServiceNotes] = useState('');
  const [attachedPhotoUrl, setAttachedPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Total amount for this visit
  const totalVisitPrice = servicesList.reduce((sum, s) => {
    const p = pricesByServiceId[s.appointmentServiceId] !== undefined
      ? pricesByServiceId[s.appointmentServiceId]
      : (typeof s.price === 'number' ? s.price : parseInt(String(s.price || '0').replace(/[^0-9]/g, ''), 10) || 15000);
    return sum + p;
  }, 0);

  const estEarnedPts = calculateEarnedPoints(totalVisitPrice, servicesList[0]?.name);

  if (!apt) {
    return (
      <div className="w-full">
        <PageHeader title="Close Service" />
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <p className="text-sm text-muted-gray">Appointment not found.</p>
        </div>
      </div>
    );
  }

  const handlePriceChange = (appointmentServiceId, val) => {
    const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0;
    setPricesByServiceId((prev) => ({
      ...prev,
      [appointmentServiceId]: num,
    }));
  };

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

  // Handle single-technician invoice submission (Main Technician completed all services)
  const handleSubmitInvoice = async () => {
    if (alreadyClosed || alreadyInvoiced || submittedSuccess || servicesList.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isBackendApt = typeof id === 'string' && id.includes('-');

      // 1. If appointment is SCHEDULED or LATE on backend, transition to IN_PROGRESS
      // so backend completeService and invoice creation accept the appointment
      if (isBackendApt && apt.status !== 'in-progress' && apt.status !== 'in_progress') {
        try {
          await appointmentsApi.updateStatus(id, { status: 'IN_PROGRESS' });
        } catch (statusErr) {
          console.warn('Could not pre-transition appointment to IN_PROGRESS:', statusErr.message);
        }
      }

      // 2. Call backend service completion for any UUID service lines
      for (const svc of servicesList) {
        if (svc.appointmentServiceId && typeof svc.appointmentServiceId === 'string' && svc.appointmentServiceId.includes('-') && !svc.appointmentServiceId.startsWith('asvc-')) {
          try {
            const mediaPayload = attachedPhotoUrl ? [{ mediaType: 'AFTER', fileUrl: attachedPhotoUrl, note: svc.name }] : [];
            await appointmentsApi.completeService(svc.appointmentServiceId, {
              notes: serviceNotes.trim() || `Completed ${svc.name}`,
              media: mediaPayload,
            });
          } catch (err) {
            console.warn('Backend completeService call error:', err.message);
          }
        }
      }

      // 3. Automatically trigger service stock deduction per service via consumption rules
      if (deductServiceStock) {
        servicesList.forEach((svc) => {
          deductServiceStock({
            appointmentId: id,
            appointmentServiceId: svc.appointmentServiceId,
            service: svc.name,
            date: 'Today',
          });
        });
      }

      // 4. Submit the combined invoice (status: PENDING_PAYMENT)
      const invoiceItems = servicesList.map((svc) => {
        const svcPrice = pricesByServiceId[svc.appointmentServiceId] !== undefined
          ? pricesByServiceId[svc.appointmentServiceId]
          : (typeof svc.price === 'number' ? svc.price : parseInt(String(svc.price || '0').replace(/[^0-9]/g, ''), 10) || 15000);
        return {
          appointmentId: id,
          appointmentServiceId: svc.appointmentServiceId,
          service: svc.name,
          serviceId: svc.serviceId || null,
          technician: apt.technicianName,
          technicianId: apt.technicianId,
          price: svcPrice,
        };
      });

      await submitAppointmentInvoice({
        appointmentId: id,
        clientId: targetClientId,
        clientName: apt.clientName,
        items: invoiceItems,
        total: totalVisitPrice,
        introducedBy: apt.introducedBy || linkedClient?.introducedBy || null,
        introducedById: apt.introducedById || linkedClient?.introducedById || null,
      });

      // 5. Mark appointment as service-completed (not payment-completed)
      await updateAppointment(id, {
        status: 'completed',
        services: servicesList.map((svc) => ({
          ...svc,
          price:
            pricesByServiceId[svc.appointmentServiceId] !== undefined
              ? pricesByServiceId[svc.appointmentServiceId]
              : (typeof svc.price === 'number'
                  ? svc.price
                  : parseInt(String(svc.price || '0').replace(/[^0-9]/g, ''), 10) || 15000),
        })),
        service: servicesList.map((s) => s.name).join(', '),
      });

      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Failed to submit invoice to reception:', err);
      setSubmitError(err.message || 'Failed to submit invoice to Reception. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Already invoiced or closed — show confirmation
  if (alreadyClosed || alreadyInvoiced || submittedSuccess) {
    const existingInvoice = getInvoiceByAppointment(id);

    return (
      <div className="w-full">
        <PageHeader
          title="Close Service"
          action={
            <Button
              variant="secondary"
              onClick={() => navigate(`/appointments/${id}`)}
            >
              <ArrowLeft size={16} strokeWidth={1.8} />
              Back
            </Button>
          }
        />

        <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 size={24} className="text-success shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-charcoal">
                Invoice Submitted to Reception
              </h2>
              <p className="text-xs text-muted-gray">
                Services recorded. Reception will collect payment.
              </p>
            </div>
          </div>

          <div className="bg-sage-soft border border-sage/20 rounded-[12px] p-3.5 sm:p-4 mb-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-sage/20 pb-2">
              <span className="text-muted-gray">Client:</span>
              <strong className="text-charcoal">{apt.clientName}</strong>
            </div>
            <div className="flex justify-between border-b border-sage/20 pb-2">
              <span className="text-muted-gray">Main Technician:</span>
              <strong className="text-charcoal">{apt.technicianName}</strong>
            </div>
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-gray">
                Completed Services ({servicesList.length})
              </p>
              {servicesList.map((s, idx) => (
                <div key={s.appointmentServiceId || idx} className="flex justify-between text-xs py-0.5">
                  <span className="text-charcoal">{s.name}</span>
                  <span className="font-semibold text-charcoal font-mono">
                    {(pricesByServiceId[s.appointmentServiceId] ?? s.price ?? 15000).toLocaleString('en-US')} FCFA
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2 border-t border-sage/30 text-sm font-bold text-charcoal">
              <span>Total Invoice Amount:</span>
              <span>{totalVisitPrice.toLocaleString('en-US')} FCFA</span>
            </div>
          </div>

          {existingInvoice && existingInvoice.items.length > 1 && (
            <div className="bg-soft-cream/60 border border-border rounded-[12px] p-3.5 sm:p-4 mb-4">
              <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider mb-2">
                Combined Invoice ({existingInvoice.items.length} services)
              </p>
              {existingInvoice.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs text-charcoal py-1 border-b border-border/40 last:border-0">
                  <span>{it.service} — {it.technician}</span>
                  <span className="font-semibold font-mono">{it.price.toLocaleString('en-US')} FCFA</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-charcoal mt-2 pt-2 border-t border-border">
                <span>Total</span>
                <span>{existingInvoice.total.toLocaleString('en-US')} FCFA</span>
              </div>
            </div>
          )}

          {/* Invoice status badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-warning-soft border border-warning/30 mb-4 text-xs text-warning">
            <FileText size={16} className="shrink-0" />
            <span className="font-medium leading-relaxed">
              Status: Pending Payment — Reception will complete this invoice.
            </span>
          </div>

          {/* Loyalty preview */}
          <div className="flex items-center gap-2 text-xs text-muted-gray mb-4">
            <Award size={14} className="text-sage shrink-0" />
            <span className="truncate">
              {clientLoyalty.balance} pts available · Est. +{estEarnedPts} pts after payment
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3 pt-2 border-t border-border/50">
            <Button
              variant="secondary"
              onClick={() => navigate('/appointments')}
              className="w-full sm:w-auto h-10 text-xs sm:text-sm"
            >
              Calendar
            </Button>
            {user?.role === 'technician' && (
              <Button
                variant="secondary"
                onClick={() => navigate('/technicians/daily')}
                className="w-full sm:w-auto h-10 text-xs sm:text-sm"
              >
                My Daily Summary
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => navigate(`/clients/${targetClientId}`)}
              className="w-full sm:w-auto h-10 text-xs sm:text-sm"
            >
              View Client File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main form — Technician prepares invoice
  return (
    <div className="w-full">
      <PageHeader
        title="Close Service"
        action={
          <Button
            variant="secondary"
            onClick={() => navigate(`/appointments/${id}`)}
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            Back
          </Button>
        }
      />

      <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card">
        {/* Read-only Appointment Info — Compact 3-Column Header */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3.5 bg-soft-cream/50 border border-border/70 rounded-[12px] mb-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-gray uppercase tracking-wider">
              Client
            </p>
            <p className="text-xs sm:text-sm font-bold text-charcoal mt-0.5 truncate">
              {apt.clientName}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-gray uppercase tracking-wider">
              Main Technician
            </p>
            <p className="text-xs sm:text-sm font-medium text-charcoal mt-0.5 truncate">
              {apt.technicianName}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-gray uppercase tracking-wider">
              Services in Visit
            </p>
            <p className="text-xs sm:text-sm font-medium text-charcoal mt-0.5 truncate">
              {servicesList.length} service{servicesList.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Performed Services List (No manual stock selection — consumption rules auto-run) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-xs font-bold text-charcoal uppercase tracking-wider">
                Services Performed During This Visit ({servicesList.length})
              </label>
              <p className="text-[11px] text-muted-gray">
                Service stock is deducted automatically via established Consumption Rules upon completion.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(true)}
              className="text-xs h-8 px-2.5 gap-1 cursor-pointer"
            >
              <Plus size={13} strokeWidth={2} />
              <span>Add Service</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {servicesList.map((svc, idx) => {
              const currentPrice = pricesByServiceId[svc.appointmentServiceId] !== undefined
                ? pricesByServiceId[svc.appointmentServiceId]
                : (typeof svc.price === 'number' ? svc.price : parseInt(String(svc.price || '0').replace(/[^0-9]/g, ''), 10) || 15000);

              return (
                <div
                  key={svc.appointmentServiceId || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-soft-cream/40 border border-border/80 rounded-[12px] gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-charcoal truncate">
                        {svc.name}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sage-soft text-sage border border-sage/20">
                        {svc.category || 'Service'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-gray mt-0.5">
                      Performed by Main Tech: <strong className="text-charcoal">{apt.technicianName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-gray">Price:</span>
                      <input
                        type="text"
                        value={currentPrice.toLocaleString('en-US')}
                        onChange={(e) => handlePriceChange(svc.appointmentServiceId, e.target.value)}
                        className="w-28 h-9 px-2.5 bg-white border border-border rounded-[8px] text-xs font-mono font-semibold text-charcoal text-right outline-none focus:border-sage"
                      />
                      <span className="text-xs text-muted-gray font-semibold">FCFA</span>
                    </div>

                    {servicesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeServiceFromAppointment(apt.id, svc.appointmentServiceId)}
                        className="text-muted-gray hover:text-error transition-colors p-1 cursor-pointer"
                        title="Remove unperformed service"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visit Combined Total Preview */}
        <div className="mb-4 p-3.5 bg-sage-soft/30 border border-sage/20 rounded-[12px] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-gray block">
              Combined Invoice Total
            </span>
            <span className="text-lg font-bold text-charcoal font-mono">
              {totalVisitPrice.toLocaleString('en-US')} FCFA
            </span>
          </div>
          <span className="text-xs text-muted-gray font-medium">
            {servicesList.length} service line{servicesList.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Loyalty Points Preview (read-only for technician) */}
        <div className="mb-4 bg-soft-cream/40 border border-border/80 rounded-[12px] p-3.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Award size={15} className="text-sage" />
              <span className="text-[11px] font-bold text-charcoal uppercase tracking-wider">
                Loyalty Points
              </span>
            </div>
            <span className="text-[11px] font-semibold text-sage bg-sage-soft px-2.5 py-0.5 rounded-[6px] border border-sage/20">
              {clientLoyalty.balance} pts available
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-gray">Points client will earn:</span>
            <span className="font-semibold text-success flex items-center gap-1">
              <Sparkles size={12} /> +{estEarnedPts} pts
            </span>
          </div>

          <p className="text-[11px] text-muted-gray mt-1.5">
            Loyalty redemption & discount will be handled by Reception at payment.
          </p>
        </div>

        {/* Service Notes & Optional Completion Photo */}
        <div className="mb-5 space-y-3 bg-warm-ivory/40 p-4 rounded-[12px] border border-border/80">
          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileEdit size={14} className="text-sage" />
              Service Notes & Observations
            </label>
            <textarea
              value={serviceNotes}
              onChange={(e) => setServiceNotes(e.target.value)}
              placeholder="e.g. Skin reaction, polish color code, products applied, technician remarks..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Camera size={14} className="text-sage" />
              Completion Photo Attachment (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={attachedPhotoUrl}
                onChange={(e) => setAttachedPhotoUrl(e.target.value)}
                placeholder="Paste after-service photo URL or attachment link"
                className="flex-1 h-9 px-3 bg-white border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
              />
              <label className="h-9 px-3 bg-soft-cream hover:bg-warm-ivory border border-border rounded-[10px] text-xs font-semibold text-charcoal flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setAttachedPhotoUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
                <span>Browse File</span>
              </label>
            </div>
            {attachedPhotoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={attachedPhotoUrl} alt="Preview" className="w-12 h-12 object-cover rounded-[8px] border border-border" />
                <span className="text-[11px] text-success font-medium">Photo attached for service record</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice note */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-sage-soft/60 border border-sage/20 mb-5 text-xs text-charcoal">
          <FileText size={15} className="text-sage shrink-0" />
          <span>
            This will create ONE <strong>Pending Invoice</strong> for Reception to collect payment.
            {user?.role === 'technician' && ' You will not handle payment.'}
          </span>
        </div>

        {/* Error message banner */}
        {submitError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-[12px] text-xs text-rose-700 font-medium">
            {submitError}
          </div>
        )}

        {/* Action Buttons — Single-Tech Submit OR Switch to Shared Work */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/50">
          <button
            type="button"
            onClick={() => navigate(`/shared-work?appointmentId=${id}`)}
            className="group relative inline-flex items-center justify-center gap-2.5 px-4 h-11 rounded-[12px] bg-gradient-to-r from-[#F2F7F0] via-[#E8F2E6] to-[#F2F7F0] hover:from-[#E8F2E6] hover:to-[#DEECEB] border border-[#B7CEB3] hover:border-[#3D5A40] text-[#2C422E] font-medium text-xs sm:text-[13px] shadow-[0_2px_8px_rgba(61,90,64,0.08)] hover:shadow-[0_4px_14px_rgba(61,90,64,0.16)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.98] w-full sm:w-auto"
          >
            <div className="w-6 h-6 rounded-full bg-[#3D5A40]/10 group-hover:bg-[#3D5A40] text-[#3D5A40] group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-200 shadow-xs">
              <Users size={13} strokeWidth={2.2} />
            </div>
            <span className="flex items-center gap-1.5">
              <span className="text-[#5A6E5C] group-hover:text-charcoal transition-colors">Multiple Technicians?</span>
              <span className="text-[#253927] font-bold underline decoration-[#3D5A40]/40 group-hover:decoration-[#3D5A40] group-hover:text-[#19291B]">
                Use Shared Work
              </span>
            </span>
            <ArrowRight size={14} className="text-[#3D5A40] transition-transform duration-200 group-hover:translate-x-1 shrink-0" />
          </button>
          <Button
            type="button"
            onClick={handleSubmitInvoice}
            className="w-full sm:w-auto h-11 text-xs sm:text-sm font-semibold gap-1.5 shadow-sm"
          >
            <Send size={14} strokeWidth={1.8} />
            <span>{isSubmitting ? 'Submitting Invoice...' : 'Submit Invoice to Reception'}</span>
          </Button>
        </div>
      </div>

      {/* Modal: Add Service to Visit */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[16px] max-w-sm w-full p-5 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-charcoal">Add Service to Visit</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-gray mb-3">
              Add another service performed during this visit.
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
    </div>
  );
}
