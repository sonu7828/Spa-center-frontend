/**
 * SharedWork — Final Approved Multi-Technician Workflow
 *
 * Final Business Rules:
 *   - The technician assigned to the appointment is automatically the MAIN TECHNICIAN.
 *   - Only the Main Technician (or Manager) can manage Shared Work for their assigned client.
 *   - Other technicians (e.g. Bella, Grace) do NOT need to login and add themselves; they are contributors recorded by the Main Tech.
 *   - Other technicians cannot independently view or modify another technician's client visit.
 *   - Draft until final submission: Reception does NOT see a half-completed invoice.
 *   - When Main Technician clicks [ Complete Shared Work & Submit ]:
 *       1. Combined invoice moves to PENDING_PAYMENT for Reception.
 *       2. Existing service-completion & stock-deduction logic runs exactly ONCE per service.
 *       3. Single payment & single receipt at Reception.
 *       4. Productivity credited separately to each technician.
 *       5. Paid invoices are locked and immutable.
 */

import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  UserCheck,
  CalendarDays,
  X,
  FileCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  Search,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAppointments, formatAppointmentId } from '../context/AppointmentsContext';
import { useAuth } from '../context/AuthContext';
import { useServices } from '../context/ServicesContext';
import { useInvoices } from '../context/InvoiceContext';
import { useOperations } from '../context/OperationsContext';

export default function SharedWork() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { user, allUsers } = useAuth();
  const { appointments, updateAppointment } = useAppointments();
  const { services: catalogServices, getActiveServices } = useServices();
  const { invoices, submitSharedWorkInvoice } = useInvoices();
  const { deductServiceStock, isAppointmentClosed } = useOperations();

  const isManager = user?.role === 'manager';
  const activeCatalogServices = getActiveServices ? getActiveServices() : catalogServices.filter((s) => s.active !== false);
  const activeTechnicians = allUsers.filter((u) => u.role === 'technician' && u.active !== false);

  // 1. FILTER VISITS: Only show appointments where logged-in user is MAIN TECHNICIAN (or Manager sees all)
  const eligibleAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Must not be no-show or cancelled
      if (apt.status === 'no-show' || apt.status === 'cancelled') return false;
      // Main Technician check: technician can only access their own assigned appointments
      if (!isManager && apt.technicianName !== user?.name && apt.technicianId !== user?.id) {
        return false;
      }
      return true;
    });
  }, [appointments, isManager, user]);

  // Selected appointment currently being edited in Shared Work
  const initialAptId = searchParams.get('appointmentId');
  const [activeAptId, setActiveAptId] = useState(
    initialAptId ? Number(initialAptId) : (eligibleAppointments[0]?.id || null)
  );

  // Search filter for assigned client visits
  const [searchQuery, setSearchQuery] = useState('');
  const filteredVisits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eligibleAppointments;
    return eligibleAppointments.filter((apt) =>
      apt.clientName?.toLowerCase().includes(q) ||
      apt.service?.toLowerCase().includes(q) ||
      apt.time?.toLowerCase().includes(q)
    );
  }, [eligibleAppointments, searchQuery]);

  // Draft work lines state per appointment: { [aptId]: [ { id, technician, technicianId, service, price } ] }
  const [draftLinesByApt, setDraftLinesByApt] = useState({});

  // Add work modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTechName, setModalTechName] = useState(activeTechnicians[0]?.name || 'Amina');
  const [modalServiceName, setModalServiceName] = useState(activeCatalogServices[0]?.name || 'Gel Nails');
  const [modalPrice, setModalPrice] = useState('');

  // Feedback notifications
  const [feedbackNotice, setFeedbackNotice] = useState('');

  // Currently active appointment object
  const activeApt = eligibleAppointments.find((a) => a.id === activeAptId) || eligibleAppointments[0] || null;

  // Existing invoice for active appointment if already submitted or paid
  const existingInvoice = useMemo(() => {
    if (!activeApt) return null;
    return invoices.find(
      (inv) =>
        inv.items?.some((it) => it.appointmentId === activeApt.id) ||
        inv.id === activeApt.id
    );
  }, [invoices, activeApt]);

  const isPaid = existingInvoice?.status === 'PAID';
  const isPending = existingInvoice?.status === 'PENDING_PAYMENT';
  const isCompleted = activeApt?.status === 'completed' || isAppointmentClosed(activeApt?.id);

  // Initialize or get draft lines for active appointment (preloads booked services)
  const currentDraftLines = useMemo(() => {
    if (!activeApt) return [];

    // If draft lines exist in state, return them
    if (draftLinesByApt[activeApt.id]) {
      return draftLinesByApt[activeApt.id];
    }

    // If invoice was already submitted, display submitted lines
    if (existingInvoice?.items?.length) {
      return existingInvoice.items.filter((it) => it.type !== 'drink' && it.type !== 'cosmetic');
    }

    // Preload ALL booked services from appointment (source of truth)
    if (activeApt.services && activeApt.services.length > 0) {
      return activeApt.services.map((s, idx) => ({
        id: s.appointmentServiceId || `asvc-${activeApt.id}-${idx}`,
        appointmentServiceId: s.appointmentServiceId || `asvc-${activeApt.id}-${idx}`,
        serviceId: s.serviceId || null,
        technician: activeApt.technicianName || user?.name || 'Staff',
        technicianId: activeApt.technicianId || user?.id || null,
        service: s.name,
        price:
          typeof s.price === 'number'
            ? s.price
            : parseInt(String(s.price || '0').replace(/[^0-9]/g, ''), 10) || 15000,
        appointmentId: activeApt.id,
        isMainTech: true,
      }));
    }

    // Fallback: Pre-populate with single service string
    const matchedSvc = activeCatalogServices.find((s) => s.name === activeApt.service);
    const initialPrice = matchedSvc?.price || 15000;
    const fallbackId = `asvc-${activeApt.id}-0`;

    return [
      {
        id: fallbackId,
        appointmentServiceId: fallbackId,
        serviceId: matchedSvc?.id || null,
        technician: activeApt.technicianName || user?.name || 'Staff',
        technicianId: activeApt.technicianId || user?.id || null,
        service: activeApt.service || 'Service',
        price: initialPrice,
        appointmentId: activeApt.id,
        isMainTech: true,
      },
    ];
  }, [activeApt, draftLinesByApt, existingInvoice, activeCatalogServices, user]);

  // Combined subtotal of current work lines
  const combinedSubtotal = currentDraftLines.reduce(
    (sum, it) =>
      sum +
      (typeof it.price === 'number'
        ? it.price
        : parseInt(String(it.price).replace(/[^0-9]/g, ''), 10) || 0),
    0
  );

  // Open modal to add a contributing technician's work
  const handleOpenAddModal = () => {
    const firstTech = activeTechnicians[0]?.name || user?.name || 'Amina';
    const firstSvc = activeCatalogServices[0];
    setModalTechName(firstTech);
    setModalServiceName(firstSvc?.name || '');
    setModalPrice(String(firstSvc?.price || ''));
    setShowAddModal(true);
  };

  // Change selected service in modal -> auto-update price
  const handleServiceChangeInModal = (svcName) => {
    setModalServiceName(svcName);
    const matched = activeCatalogServices.find((s) => s.name === svcName);
    if (matched) {
      setModalPrice(String(matched.price || ''));
    }
  };

  // Save new technician work line into draft (extra performed service)
  const handleSaveTechnicianWork = (e) => {
    e?.preventDefault();
    if (!activeApt || !modalServiceName || !modalTechName) return;

    const matchedSvc = activeCatalogServices.find((s) => s.name === modalServiceName);
    const matchedTech = activeTechnicians.find((t) => t.name === modalTechName);
    const priceNum = parseInt(String(modalPrice).replace(/[^0-9]/g, ''), 10) || matchedSvc?.price || 0;
    const newServiceId = `asvc-${activeApt.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newLine = {
      id: newServiceId,
      appointmentServiceId: newServiceId,
      serviceId: matchedSvc?.id || null,
      technician: modalTechName,
      technicianId: matchedTech?.id || null,
      service: modalServiceName,
      price: priceNum,
      appointmentId: activeApt.id,
      isMainTech: modalTechName === activeApt.technicianName,
    };

    const updated = [...currentDraftLines, newLine];
    setDraftLinesByApt((prev) => ({
      ...prev,
      [activeApt.id]: updated,
    }));

    setShowAddModal(false);
    setFeedbackNotice(`Added ${modalTechName}'s work (${modalServiceName} — ${priceNum.toLocaleString('en-US')} FCFA) to draft.`);
    setTimeout(() => setFeedbackNotice(''), 3500);
  };

  // Reassign contributing technician on a draft service line
  const handleUpdateLineTechnician = (lineId, techName) => {
    if (isPaid || isPending) return;
    const matchedTech = activeTechnicians.find((t) => t.name === techName);
    const updated = currentDraftLines.map((line) => {
      if (line.id !== lineId) return line;
      return {
        ...line,
        technician: techName,
        technicianId: matchedTech?.id || null,
        isMainTech: techName === activeApt?.technicianName,
      };
    });
    setDraftLinesByApt((prev) => ({
      ...prev,
      [activeApt.id]: updated,
    }));
  };

  // Delete a work line from the draft (allows removing unperformed services)
  const handleRemoveDraftLine = (lineId) => {
    if (isPaid) return;
    const updated = currentDraftLines.filter((line) => line.id !== lineId);
    setDraftLinesByApt((prev) => ({
      ...prev,
      [activeApt.id]: updated,
    }));
  };

  // Complete Shared Work & Submit to Reception (only actually performed lines)
  const handleCompleteAndSubmit = () => {
    if (!activeApt || currentDraftLines.length === 0) return;
    if (isPaid) return;

    // 1. Submit single combined invoice to Reception (moves status to PENDING_PAYMENT)
    submitSharedWorkInvoice({
      appointmentId: activeApt.id,
      clientId: activeApt.clientId,
      clientName: activeApt.clientName,
      items: currentDraftLines.map((item) => ({
        ...item,
        appointmentServiceId: item.appointmentServiceId || item.id,
      })),
    });

    // 2. Mark appointment completed with only the actually performed services
    updateAppointment(activeApt.id, {
      status: 'completed',
      services: currentDraftLines.map((item) => ({
        appointmentServiceId: item.appointmentServiceId || item.id,
        serviceId: item.serviceId || null,
        name: item.service,
        price: item.price,
        technicianName: item.technician,
        technicianId: item.technicianId || null,
      })),
      service: currentDraftLines.map((item) => item.service).join(', '),
    });

    // 3. Deduct Service Stock ONCE for every completed service line using appointmentServiceId
    currentDraftLines.forEach((item) => {
      deductServiceStock({
        appointmentId: activeApt.id,
        appointmentServiceId: item.appointmentServiceId || item.id,
        service: item.service,
        serviceId: item.serviceId || null,
        product: null,
        date: 'Today',
      });
    });

    setFeedbackNotice(`Shared Work completed for ${activeApt.clientName}! Combined invoice (${combinedSubtotal.toLocaleString('en-US')} FCFA) submitted to Reception.`);
  };

  return (
    <div>
      <PageHeader
        title="Shared Work"
        subtitle="Multi-technician collaborative visits managed by the assigned Main Technician."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              if (initialAptId) {
                navigate(`/appointments/${initialAptId}/close`);
              } else {
                navigate('/appointments');
              }
            }}
            className="gap-1.5"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>Back</span>
          </Button>
        }
      />

      {/* Success Notification */}
      {feedbackNotice && (
        <div className="mb-5 flex items-center justify-between px-4 py-3 bg-success-soft border border-success/30 rounded-[12px] text-xs sm:text-sm text-success font-medium animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="shrink-0 text-success" />
            <span className="truncate">{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice('')}
            className="text-success hover:text-charcoal cursor-pointer ml-2 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner: Left = Assigned Client Visits Title, Right = Main Tech Info */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between bg-soft-cream/60 border border-border rounded-[14px] p-3 sm:px-4 sm:py-3 gap-3">
        {/* Left Side: Your Assigned Client Visits */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-charcoal">
              Your Assigned Client Visits
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sage-soft text-sage border border-sage/30">
              {eligibleAppointments.length}
            </span>
          </div>
          <p className="text-[11px] text-muted-gray mt-0.5">
            Select an active visit below to manage collaborative technician services.
          </p>
        </div>

        {/* Right Side: Main Technician info & Assigned visits count */}
        <div className="flex items-center gap-2.5 bg-white/90 border border-border/80 rounded-[12px] px-3.5 py-2 shrink-0 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-sage-soft flex items-center justify-center shrink-0">
            <UserCheck size={16} className="text-sage" />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-xs sm:text-sm text-charcoal truncate">
                {isManager ? (
                  <>Manager View: <span className="text-sage font-bold">All Client Visits</span></>
                ) : (
                  <>Main Technician: <span className="text-sage font-bold">{user?.name}</span></>
                )}
              </p>
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-soft-cream border border-border text-charcoal shrink-0">
                {eligibleAppointments.length} Assigned Visit{eligibleAppointments.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-muted-gray truncate">
              {isManager
                ? 'Review and manage shared technician visits across all staff.'
                : 'You are viewing only appointments assigned to you as Main Technician.'}
            </p>
          </div>
        </div>
      </div>

      {eligibleAppointments.length === 0 ? (
        <div className="bg-white border border-border rounded-[16px] p-8 sm:p-12 shadow-card text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-soft-cream flex items-center justify-center mx-auto mb-4 text-muted-gray">
            <Users size={26} strokeWidth={1.8} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-charcoal mb-2">
            No Assigned Visits Found
          </h3>
          <p className="text-xs sm:text-sm text-muted-gray leading-relaxed mb-4">
            {isManager
              ? 'No active client visits or scheduled appointments for today.'
              : `You have no appointments assigned to you as Main Technician today. Other technicians' visits cannot be accessed.`}
          </p>
          <Button
            variant="secondary"
            onClick={() => navigate('/appointments')}
            className="text-xs h-10 px-4 mx-auto"
          >
            <CalendarDays size={14} />
            <span>Go to Calendar</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Eligible Visits List (for Main Tech) */}
          <div className="lg:col-span-4 space-y-2.5">

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client or service..."
                className="w-full h-9 pl-8 pr-7 bg-white border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors placeholder:text-muted-gray/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal p-0.5 text-xs cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Scrollable Visits List showing ~4-5 cards */}
            <div className="max-h-[460px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
              {filteredVisits.length === 0 ? (
                <div className="p-6 text-center bg-white/80 border border-dashed border-border rounded-[14px]">
                  <p className="text-xs text-muted-gray">No visits found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredVisits.map((apt) => {
                  const isSelected = apt.id === activeAptId;
                  const aptInvoice = invoices.find((inv) => inv.items?.some((it) => it.appointmentId === apt.id));
                  const aptPaid = aptInvoice?.status === 'PAID';
                  const aptPending = aptInvoice?.status === 'PENDING_PAYMENT';

                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => setActiveAptId(apt.id)}
                      className={`w-full text-left p-3.5 rounded-[12px] border transition-all duration-150 cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-white border-sage ring-2 ring-sage/20 shadow-card'
                          : 'bg-white/80 hover:bg-white border-border/80 text-muted-gray'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-sm text-charcoal truncate">
                          {apt.clientName}
                        </h4>
                        {aptPaid ? (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-success-soft text-success border border-success/30 shrink-0">
                            Paid
                          </span>
                        ) : aptPending ? (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-warning-soft text-warning border border-warning/30 shrink-0">
                            Pending
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-soft-cream text-muted-gray border border-border shrink-0">
                            Draft
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-charcoal font-medium">
                        {apt.service}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-muted-gray mt-2 pt-2 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {apt.time || 'Today'}
                        </span>
                        <span className="font-semibold text-charcoal">
                          Main Tech: {apt.technicianName}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Shared Work Workspace */}
          {activeApt && (
            <div className="lg:col-span-8 bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card">
              <div>
                {/* Visit Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-charcoal">
                        {activeApt.clientName}
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-soft-cream text-muted-gray border border-border">
                        Appt #{formatAppointmentId(activeApt.id)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-gray mt-1 flex items-center gap-2">
                      <span>Scheduled Service: <strong className="text-charcoal font-semibold">{activeApt.service}</strong></span>
                      <span>·</span>
                      <span>Time: <strong className="text-charcoal font-semibold font-mono">{activeApt.time}</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-[8px] bg-sage-soft text-charcoal border border-sage/30">
                      Main Tech: <strong>{activeApt.technicianName}</strong>
                    </span>
                  </div>
                </div>

                {/* Status Notice if Paid / Submitted */}
                {isPaid ? (
                  <div className="mb-5 p-3.5 rounded-[12px] bg-success-soft border border-success/30 flex items-center gap-2.5 text-xs text-success font-medium">
                    <FileCheck size={18} className="shrink-0" />
                    <span>This visit invoice is <strong>PAID</strong> and sealed. No further services can be added or edited.</span>
                  </div>
                ) : isPending ? (
                  <div className="mb-5 p-3.5 rounded-[12px] bg-warning-soft border border-warning/30 flex items-center gap-2.5 text-xs text-warning font-medium">
                    <Clock size={18} className="shrink-0" />
                    <span>Combined invoice is already submitted to Reception and awaiting payment collection.</span>
                  </div>
                ) : null}

                {/* Work Performed Table / List */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-charcoal">
                      Work Performed During This Visit ({currentDraftLines.length})
                    </p>

                    {!isPaid && !isPending && (
                      <Button
                        variant="secondary"
                        onClick={handleOpenAddModal}
                        className="text-xs h-9 px-3 gap-1.5"
                      >
                        <Plus size={14} strokeWidth={2.2} />
                        <span>Add Technician Work</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {currentDraftLines.length === 0 ? (
                      <div className="p-6 text-center bg-soft-cream/40 border border-dashed border-border rounded-[12px]">
                        <p className="text-xs text-muted-gray mb-2">No services recorded in this draft visit.</p>
                        <Button
                          variant="secondary"
                          onClick={handleOpenAddModal}
                          className="text-xs h-8 px-3 gap-1 mx-auto"
                        >
                          <Plus size={13} />
                          <span>Add Performed Service</span>
                        </Button>
                      </div>
                    ) : (
                      currentDraftLines.map((line, idx) => {
                        const isMain = line.technician === activeApt.technicianName;
                        const canDelete = !isPaid && !isPending;

                        return (
                          <div
                            key={line.id || idx}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[12px] border transition-all gap-2.5 ${
                              isMain
                                ? 'bg-sage-soft/30 border-sage/40'
                                : 'bg-soft-cream/40 border-border/80'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-xs sm:text-sm text-charcoal truncate">
                                  {line.service}
                                </p>
                                {isMain && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sage text-charcoal font-mono uppercase shrink-0">
                                    Main Tech
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-muted-gray">Performed by:</span>
                                {!isPaid && !isPending ? (
                                  <select
                                    value={line.technician}
                                    onChange={(e) => handleUpdateLineTechnician(line.id, e.target.value)}
                                    className="text-xs font-semibold text-charcoal bg-white border border-border rounded-[6px] px-2 py-0.5 outline-none focus:border-sage cursor-pointer"
                                  >
                                    {activeTechnicians.map((tech) => (
                                      <option key={tech.id} value={tech.name}>
                                        {tech.name} {tech.name === activeApt.technicianName ? '(Main Tech)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <strong className="text-charcoal font-semibold text-xs">{line.technician}</strong>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                              <span className="font-bold text-sm text-charcoal font-mono">
                                {(line.price || 0).toLocaleString('en-US')} FCFA
                              </span>

                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftLine(line.id)}
                                  className="w-7 h-7 rounded-full hover:bg-error-soft text-muted-gray hover:text-error flex items-center justify-center transition-colors cursor-pointer"
                                  title="Remove unperformed service"
                                >
                                  <Trash2 size={14} />
                                </button>
                              ) : isPaid ? (
                                <div className="w-7 h-7 flex items-center justify-center text-muted-gray/40">
                                  <Lock size={13} />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Summary & Final Submission Footer */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-gray block">
                    Combined Invoice Total
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-charcoal">
                    {combinedSubtotal.toLocaleString('en-US')} FCFA
                  </span>
                  <span className="text-[11px] text-muted-gray block">
                    {currentDraftLines.length} technician service{currentDraftLines.length === 1 ? '' : 's'} recorded
                  </span>
                </div>

                {!isPaid && !isPending && (
                  <Button
                    variant="primary"
                    onClick={handleCompleteAndSubmit}
                    className="w-full sm:w-auto text-xs sm:text-sm h-11 px-5 justify-center gap-2 font-bold shadow-sm"
                  >
                    <CheckCircle2 size={16} strokeWidth={2.2} />
                    <span>Complete Shared Work & Submit</span>
                  </Button>
                )}

                {isPending && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-warning bg-warning-soft px-3 py-2 rounded-[10px] border border-warning/30">
                    <Clock size={14} />
                    <span>Awaiting Reception Collection ({combinedSubtotal.toLocaleString('en-US')} FCFA)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Technician Work (Main Tech adds contributing technicians) */}
      {showAddModal && activeApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-[460px] w-full shadow-2xl overflow-hidden flex flex-col my-auto border border-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-soft-cream/60">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-charcoal truncate">
                  Add Technician Work
                </h3>
                <p className="text-[11px] text-muted-gray">
                  Client: {activeApt.clientName} (Main Tech: {activeApt.technicianName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTechnicianWork} className="p-5 space-y-4">
              {/* Technician Dropdown */}
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">
                  Contributing Technician
                </label>
                <select
                  value={modalTechName}
                  onChange={(e) => setModalTechName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-white text-charcoal text-xs sm:text-sm font-semibold outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer"
                  required
                >
                  {activeTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.name}>
                      {tech.name} {tech.name === activeApt.technicianName ? '(Main Tech)' : '· Technician'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Dropdown */}
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">
                  Performed Service
                </label>
                <select
                  value={modalServiceName}
                  onChange={(e) => handleServiceChangeInModal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-white text-charcoal text-xs sm:text-sm font-medium outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer"
                  required
                >
                  {activeCatalogServices.map((svc) => (
                    <option key={svc.id} value={svc.name}>
                      {svc.name} — {(svc.price || 0).toLocaleString('en-US')} FCFA
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Field */}
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">
                  Price (FCFA)
                </label>
                <input
                  type="text"
                  value={modalPrice}
                  onChange={(e) => setModalPrice(e.target.value)}
                  placeholder="e.g. 20000"
                  className="w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-white text-charcoal text-xs sm:text-sm font-mono font-semibold outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
                  required
                />
              </div>

              <div className="p-3 rounded-[10px] bg-soft-cream/60 border border-border/70 text-[11px] text-muted-gray leading-relaxed">
                💡 Each service line preserves its contributing technician. In Daily Close and Tech Summary, revenue will be credited directly to the recorded technician.
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs h-[40px] px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs h-[40px] px-5 font-bold"
                >
                  Add to Work List
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
