/**
 * Dashboard — Screen 01 (Locked Manager Dashboard UI Restored)
 *
 * Role-aware Dashboard:
 *   - Manager Dashboard:
 *       1. CA Total / Clients / Cash / MTN MoMo / Orange Money metric cards
 *       2. Employee Client Acquisition & Referral Summary
 *       3. Today's Appointments
 *       4. Top Referrer
 *       5. Attention
 *   - Reception Dashboard: Operational front-desk view
 *   - Technician Dashboard: Own performance & client acquisition
 *   - Cleaner Dashboard: Access Denied (403)
 */

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Banknote,
  Smartphone,
  CalendarDays,
  Award,
  UserPlus,
  Plus,
  CheckCircle,
  UserCheck,
  Sparkles,
  Clock,
  TrendingUp,
  AlertCircle,
  Activity,
  CreditCard,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import Button from '../components/Button';
import AppointmentPreviewItem from '../components/AppointmentPreviewItem';
import AttentionItem from '../components/AttentionItem';
import ClientAcquisitionModal from '../components/ClientAcquisitionModal';
import { useOperations } from '../context/OperationsContext';
import { useClients } from '../context/ClientsContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useAuth } from '../context/AuthContext';
import { useCommission } from '../context/CommissionContext';
import { useReports } from '../context/ReportsContext';
import { getDoualaTodayStr } from '../utils/timezone';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, allUsers } = useAuth();
  const { dailyTotals, serviceStock, getProductMetrics, lowStockThresholdDays } = useOperations();
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const { commissionRate, getEmployeeCommissionSummary } = useCommission();

  const {
    period,
    setPeriod,
    customDateRange,
    setCustomDateRange,
    dashboardSummary,
    revenueReport,
    appointmentAnalytics,
    techniciansPerformance,
    myPerformance,
    refreshReports,
  } = useReports();

  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [acquisitionSuccess, setAcquisitionSuccess] = useState(null);
  const [managerShowAllIntroduced, setManagerShowAllIntroduced] = useState(false);

  const role = (user?.role || 'manager').toLowerCase();
  const isTechnician = role === 'technician';
  const isReception = role === 'reception';
  const isManager = role === 'manager';
  const isCleaner = role === 'cleaner';

  // =========================================================================
  // RECEPTIONIST ACCESS BLOCKED (REDIRECT TO /appointments)
  // =========================================================================
  if (isReception) {
    return <Navigate to="/appointments" replace />;
  }

  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Africa/Douala',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const todayStr = getDoualaTodayStr();

  // =========================================================================
  // CLEANER ACCESS DENIED VIEW (RBAC: CLEANER BLOCKED FROM REPORTS)
  // =========================================================================
  if (isCleaner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[16px] border border-border shadow-card my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied (403)</h2>
        <p className="text-sm text-muted-gray max-w-md mb-6">
          Analytics and business reports are restricted to management, reception, and staff roles. Cleaners have access only to cleaning records.
        </p>
        <button
          onClick={() => navigate('/cleaning')}
          className="px-5 py-2.5 rounded-[12px] bg-sage hover:bg-sage-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          Go to Cleaning Records
        </button>
      </div>
    );
  }

  // Today's appointments
  const todaysAppointments = appointments
    .filter((a) => a.date === todayStr && a.status !== 'cancelled')
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .slice(0, 6);

  // Today's appointments for current technician
  const myTodayAppointments = appointments
    .filter(
      (a) =>
        a.date === todayStr &&
        a.status !== 'cancelled' &&
        (a.technicianName?.toLowerCase() === user?.name?.toLowerCase() ||
          String(a.technicianId) === String(user?.id))
    )
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Map service name to category for color
  const getCategoryFromService = (serviceName) => {
    const s = (serviceName || '').toLowerCase();
    if (s.includes('nail') || s.includes('gel') || s.includes('manicure') || s.includes('pedicure')) return 'nails';
    if (s.includes('facial') || s.includes('face') || s.includes('skin')) return 'facial';
    if (s.includes('massage') || s.includes('spa') || s.includes('tissue')) return 'massage';
    return 'nails';
  };

  // Current user's introduced clients
  const myIntroducedClients = clients.filter(
    (c) =>
      c.introducedBy?.toLowerCase() === user?.name?.toLowerCase() ||
      String(c.introducedById) === String(user?.id)
  );

  // Current user's created/introduced appointments
  const myIntroducedAppointments = appointments.filter(
    (a) =>
      a.introducedBy?.toLowerCase() === user?.name?.toLowerCase() ||
      String(a.introducedById) === String(user?.id)
  );

  // Active technicians for manager summary
  const activeTechnicians = allUsers.filter(
    (u) => u.role === 'technician' && u.active !== false
  );

  // Current user's referral commission summary fallback
  const myCommissionSummary = getEmployeeCommissionSummary(user?.name || user?.id);

  // Manager summary breakdown per technician fallback
  const technicianAcquisitionSummary = activeTechnicians.map((tech) => {
    const introducedClients = clients.filter(
      (c) =>
        c.introducedBy?.toLowerCase() === tech.name.toLowerCase() ||
        String(c.introducedById) === String(tech.id)
    );
    const createdAppts = appointments.filter(
      (a) =>
        a.introducedBy?.toLowerCase() === tech.name.toLowerCase() ||
        String(a.introducedById) === String(tech.id)
    );
    const commSummary = getEmployeeCommissionSummary(tech.name);
    return {
      id: tech.id,
      name: tech.name,
      role: (tech.specialties || []).join(', ') || tech.role || 'Technician',
      clientsIntroduced: Math.max(introducedClients.length, commSummary.clientsReferred),
      appointmentsCreated: createdAppts.length,
      commissionEarned: commSummary.commissionEarned,
      completedServices: commSummary.completedServices,
    };
  });

  const allIntroducedClients = clients.filter((c) => Boolean(c.introducedBy));

  // Top Staff Referrer computation (Employee Referral)
  const referrerCounts = {};
  clients.forEach((c) => {
    if (c.introducedBy) {
      const name = c.introducedBy.trim();
      if (name) {
        referrerCounts[name] = (referrerCounts[name] || 0) + 1;
      }
    }
  });

  let topReferrer = null;
  let maxCount = 0;
  Object.entries(referrerCounts).forEach(([name, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topReferrer = { name, count };
    }
  });

  // Attention items
  const depositRequiredCount = clients.filter((c) => (c.noShows || 0) >= 2).length;
  const lowStockCount = serviceStock.filter((p) => {
    if (!p.active) return false;
    const metrics = getProductMetrics(p.name);
    return metrics.daysLeft !== null && metrics.daysLeft <= lowStockThresholdDays;
  }).length;
  const clientsToRebookCount = clients.filter((c) => {
    if (!c.lastVisit || c.lastVisit === '—') return false;
    const visitDate = new Date(c.lastVisit);
    if (isNaN(visitDate.getTime())) return false;
    const daysSince = (Date.now() - visitDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14;
  }).length;

  const attentionItems = [
    { id: 1, label: 'Clients to Rebook', count: clientsToRebookCount, type: 'warning' },
    { id: 2, label: 'Deposit Required Clients', count: depositRequiredCount, type: 'error' },
    { id: 3, label: 'Stock Alerts', count: lowStockCount, type: 'warning' },
  ].filter((item) => item.count > 0);

  const handleAcquisitionSuccess = (data) => {
    setAcquisitionSuccess(
      `Client "${data.clientName}" introduced successfully! Appointment booked for ${data.service} with ${data.technician}.`
    );
    refreshReports();
    setTimeout(() => setAcquisitionSuccess(null), 5000);
  };

  // Values from backend reportsApi — live data with fallback to 0
  const cards = dashboardSummary?.cards;
  const totalRevenueVal = cards?.totalRevenue ?? 0;
  const activeClientsVal = cards?.activeClients ?? clients.length;

  // Breakdown methods from live revenue report
  const methods = revenueReport?.paymentMethodBreakdown || [];
  const cashAmount = methods.find((m) => m.method === 'CASH')?.amount ?? 0;
  const mtnAmount = methods.find((m) => m.method === 'MTN_MOMO')?.amount ?? 0;
  const orangeAmount = methods.find((m) => m.method === 'ORANGE_MONEY')?.amount ?? 0;

  // Reception filter bar (used only for reception & technician views)
  const renderFilterBar = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
      <div className="flex items-center gap-1.5 p-1 bg-soft-cream/80 border border-border rounded-[12px] max-w-fit shadow-2xs">
        {[
          { id: 'today', label: 'Today' },
          { id: 'weekly', label: 'Weekly' },
          { id: 'monthly', label: 'Monthly' },
          { id: 'custom', label: 'Custom Range' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id)}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all duration-150 cursor-pointer ${
              period === tab.id
                ? 'bg-white text-charcoal shadow-xs border border-border/60'
                : 'text-muted-gray hover:text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-[10px] px-2.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-gray uppercase">From:</span>
            <input
              type="date"
              value={customDateRange.startDate}
              onChange={(e) =>
                setCustomDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="text-xs text-charcoal outline-none bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-[10px] px-2.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-gray uppercase">To:</span>
            <input
              type="date"
              value={customDateRange.endDate}
              onChange={(e) =>
                setCustomDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="text-xs text-charcoal outline-none bg-transparent cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );

  // =========================================================================
  // =========================================================================
  // TECHNICIAN / EMPLOYEE DASHBOARD VIEW
  // =========================================================================
  if (isTechnician) {
    const clientsReferredCount = myPerformance?.clientsReferred ?? myCommissionSummary?.clientsReferred ?? myIntroducedClients.length ?? 0;
    const completedServicesCount = myPerformance?.servicesCompleted ?? myCommissionSummary?.completedServices ?? 0;
    const commissionEarnedAmount = myPerformance?.commissionEarned ?? myCommissionSummary?.commissionEarned ?? 0;

    return (
      <div className="space-y-4 sm:space-y-5 pb-8">
        <PageHeader
          title="Employee Dashboard"
          subtitle={`Welcome, ${user?.name} · Today is ${today}`}
        />

        {acquisitionSuccess && (
          <div className="bg-success-soft border border-success/30 rounded-[12px] p-3.5 flex items-center gap-2.5 text-xs font-semibold text-[#4F6748] shadow-xs">
            <CheckCircle size={16} className="text-success shrink-0" />
            <span>{acquisitionSuccess}</span>
          </div>
        )}

        {/* ── Section 1: Client Acquisition ── */}
        <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
                <UserPlus size={18} className="text-sage" />
                Client Acquisition
              </h2>
              <p className="text-xs text-muted-gray mt-0.5">
                Introduce new clients to OMEGA SPA, recommend services, and book appointments.
              </p>
            </div>
            <button
              onClick={() => setShowAcquisitionModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-sage hover:bg-sage-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto active:scale-[0.98]"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add New Client
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="bg-warm-ivory rounded-[12px] border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
                  CLIENTS INTRODUCED
                </span>
                <span className="text-2xl font-extrabold text-charcoal mt-1 block">
                  {myIntroducedClients.length}
                </span>
              </div>
              <Users size={22} className="text-sage opacity-80" />
            </div>

            <div className="bg-warm-ivory rounded-[12px] border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
                  APPOINTMENTS CREATED
                </span>
                <span className="text-2xl font-extrabold text-charcoal mt-1 block">
                  {myIntroducedAppointments.length}
                </span>
              </div>
              <CalendarDays size={22} className="text-sage opacity-80" />
            </div>
          </div>
        </section>

        {/* ── Section 2: My Referral Commission ── */}
        <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/70">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
                  <DollarSign size={18} className="text-sage" />
                  My Referral Commission
                </h2>
              </div>
              <p className="text-xs text-muted-gray mt-0.5">
                Referral commission earned when clients you introduced complete paid services
              </p>
            </div>
            <span className="text-[11px] font-semibold text-charcoal border border-border/80 rounded-[8px] px-2.5 py-0.5 bg-warm-ivory/60 self-start sm:self-auto">
              Rule: {commissionRate}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-warm-ivory rounded-[12px] border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
                  CLIENTS REFERRED
                </span>
                <span className="text-2xl font-extrabold text-charcoal mt-1 block">
                  {clientsReferredCount}
                </span>
              </div>
              <Users size={22} className="text-sage opacity-80" />
            </div>

            <div className="bg-warm-ivory rounded-[12px] border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
                  COMPLETED SERVICES
                </span>
                <span className="text-2xl font-extrabold text-charcoal mt-1 block">
                  {completedServicesCount}
                </span>
              </div>
              <Sparkles size={22} className="text-sage opacity-80" />
            </div>

            <div className="bg-warm-ivory rounded-[12px] border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
                  COMMISSION EARNED
                </span>
                <span className="text-2xl font-extrabold text-charcoal mt-1 block truncate">
                  {commissionEarnedAmount.toLocaleString('en-US')}
                  <span className="text-xs font-normal text-muted-gray ml-1">FCFA</span>
                </span>
              </div>
              <Award size={22} className="text-sage opacity-80" />
            </div>
          </div>
        </section>

        {/* ── Section 3: My Introduced Clients ── */}
        <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
                <UserCheck size={18} className="text-sage" />
                My Introduced Clients
              </h2>
              <p className="text-xs text-muted-gray mt-0.5">Clients you have personally introduced to the spa</p>
            </div>
            <span className="text-xs text-muted-gray font-medium">
              {myIntroducedClients.length} client{myIntroducedClients.length !== 1 ? 's' : ''}
            </span>
          </div>

          {myIntroducedClients.length === 0 ? (
            <div className="text-center py-8 bg-soft-cream/40 rounded-[12px] border border-dashed border-border">
              <UserPlus size={28} className="text-border mx-auto mb-2" />
              <p className="text-xs text-muted-gray font-medium">
                You haven't introduced any clients yet.
              </p>
              <button
                onClick={() => setShowAcquisitionModal(true)}
                className="mt-2 text-xs text-sage-hover hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <Plus size={13} />
                Introduce your first client
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-soft-cream border-b border-border">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Client</th>
                    <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Service</th>
                    <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Date & Time</th>
                    <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Assigned Tech</th>
                    <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-white">
                  {myIntroducedClients.map((client) => {
                    const clientAppts = appointments.filter(
                      (a) =>
                        a.clientId === client.id ||
                        a.clientName?.toLowerCase() === client.name?.toLowerCase()
                    );
                    const latestApt = clientAppts[0];
                    const serviceName =
                      latestApt?.service ||
                      client.firstAppointmentService ||
                      (client.lastService && client.lastService !== 'Spa Service' ? client.lastService : null) ||
                      '—';
                    const isCompleted = latestApt?.status === 'completed';

                    return (
                      <tr key={client.id} className="hover:bg-warm-ivory/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span
                            onClick={() => navigate(`/clients/${client.id}`)}
                            className="font-bold text-charcoal hover:underline hover:text-sage cursor-pointer"
                          >
                            {client.name}
                          </span>
                          <span className="block text-[10px] text-muted-gray font-normal font-mono">
                            {client.phone}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-charcoal">{serviceName}</td>
                        <td className="py-2.5 px-3 text-muted-gray font-mono">
                          {latestApt ? `${latestApt.date} · ${latestApt.time}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-charcoal font-medium">
                          {latestApt?.technicianName || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-bold ${
                              isCompleted
                                ? 'bg-[#DCE7D7] text-[#4F6748] border border-[#4F6748]/20'
                                : 'bg-sage-soft text-sage-hover border border-sage/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCompleted ? 'bg-[#4F6748]' : 'bg-sage'
                              }`}
                            />
                            {isCompleted ? 'Completed' : 'Booked'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section 4: My Appointments Today ── */}
        <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
              <Clock size={18} className="text-sage" />
              My Appointments Today
            </h2>
            <Button
              variant="secondary"
              onClick={() => navigate('/appointments')}
              className="h-8 text-xs font-semibold"
            >
              View Calendar
            </Button>
          </div>

          <div className="space-y-2">
            {myTodayAppointments.length > 0 ? (
              myTodayAppointments.map((apt) => (
                <AppointmentPreviewItem
                  key={apt.id}
                  time={apt.time}
                  client={apt.clientName || 'Client'}
                  service={apt.service || (apt.services?.length ? apt.services.map((s) => s.name).join(', ') : 'Service')}
                  technician={apt.technicianName || user?.name || 'Staff'}
                  category={getCategoryFromService(apt.service)}
                />
              ))
            ) : (
              <p className="text-xs text-muted-gray text-center py-6 bg-soft-cream/30 rounded-[10px]">
                No appointments scheduled for today.
              </p>
            )}
          </div>
        </section>

        <ClientAcquisitionModal
          isOpen={showAcquisitionModal}
          onClose={() => setShowAcquisitionModal(false)}
          onSuccess={handleAcquisitionSuccess}
        />
      </div>
    );
  }

  // =========================================================================
  // RECEPTION DASHBOARD VIEW (RBAC: OPERATIONAL ONLY — COMMISSIONS HIDDEN)
  // =========================================================================
  if (isReception) {
    const totalAppointmentsVal = cards?.totalAppointments ?? todaysAppointments.length;
    const completedServicesVal = cards?.completedServices ?? 0;
    const pendingCountVal = cards?.pendingPayments?.count ?? 0;
    const totalRevenueValReception = cards?.totalRevenue ?? 0;

    return (
      <div className="space-y-4 sm:space-y-5 pb-8">
        <PageHeader
          title="Reception Operations Dashboard"
          subtitle={`Daily Front Desk Overview · ${today}`}
        />

        {/* Date Filter Bar */}
        {renderFilterBar()}

        {acquisitionSuccess && (
          <div className="bg-success-soft border border-success/30 rounded-[12px] p-3.5 flex items-center gap-2.5 text-xs font-semibold text-[#4F6748] shadow-xs">
            <CheckCircle size={16} className="text-success shrink-0" />
            <span>{acquisitionSuccess}</span>
          </div>
        )}

        {/* Operational Overview Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Appointments"
            value={String(totalAppointmentsVal)}
            icon={CalendarDays}
          />
          <MetricCard
            label="Completed Services"
            value={String(completedServicesVal)}
            icon={Sparkles}
          />
          <MetricCard
            label="Active Clients"
            value={String(activeClientsVal)}
            icon={Users}
          />
          <MetricCard
            label="Pending Invoices"
            value={String(pendingCountVal)}
            icon={AlertCircle}
          />
        </section>

        {/* Revenue Operational View (RBAC: Collections only, commissions hidden) */}
        <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/70">
            <div>
              <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                <Banknote size={18} className="text-sage" />
                Revenue Collections (Operational View)
              </h2>
              <p className="text-xs text-muted-gray">Daily collections breakdown by payment method</p>
            </div>
            <div className="px-3 py-1 bg-soft-cream rounded-[8px] border border-border text-xs font-semibold text-charcoal">
              Total Collected: <span className="text-[#4F6748] font-bold">{totalRevenueValReception.toLocaleString('en-US')} FCFA</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-warm-ivory/60 rounded-[12px] border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">Cash</span>
              <span className="text-lg font-bold text-charcoal mt-1 block">
                {cashAmount.toLocaleString('en-US')} <span className="text-xs font-normal text-muted-gray">FCFA</span>
              </span>
            </div>
            <div className="p-3 bg-warm-ivory/60 rounded-[12px] border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">MTN MoMo</span>
              <span className="text-lg font-bold text-charcoal mt-1 block">
                {mtnAmount.toLocaleString('en-US')} <span className="text-xs font-normal text-muted-gray">FCFA</span>
              </span>
            </div>
            <div className="p-3 bg-warm-ivory/60 rounded-[12px] border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">Orange Money</span>
              <span className="text-lg font-bold text-charcoal mt-1 block">
                {orangeAmount.toLocaleString('en-US')} <span className="text-xs font-normal text-muted-gray">FCFA</span>
              </span>
            </div>
          </div>
        </section>

        {/* Appointment Analytics (Operational Breakdown) */}
        {appointmentAnalytics && (
          <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/70">
              <div>
                <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                  <Activity size={18} className="text-sage" />
                  Appointment & Schedule Analytics
                </h2>
                <p className="text-xs text-muted-gray">Booking completion, attendance, and no-show rates</p>
              </div>
              <span className="text-xs font-semibold text-charcoal bg-soft-cream px-2.5 py-1 rounded-[8px] border border-border">
                {appointmentAnalytics.totalBookings} Total Bookings
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-soft-cream/60 rounded-[12px] border border-border/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">Completion Rate</span>
                <span className="text-xl font-extrabold text-[#4F6748] mt-1 block">
                  {appointmentAnalytics.completionRate}%
                </span>
              </div>
              <div className="p-3 bg-soft-cream/60 rounded-[12px] border border-border/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">No-Show Rate</span>
                <span className="text-xl font-extrabold text-rose-600 mt-1 block">
                  {appointmentAnalytics.noShowRate}%
                </span>
              </div>
              <div className="p-3 bg-soft-cream/60 rounded-[12px] border border-border/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">Late Rate</span>
                <span className="text-xl font-extrabold text-amber-600 mt-1 block">
                  {appointmentAnalytics.lateRate}%
                </span>
              </div>
              <div className="p-3 bg-soft-cream/60 rounded-[12px] border border-border/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">Bookings Window</span>
                <span className="text-sm font-semibold text-charcoal mt-1 block capitalize">
                  {period}
                </span>
              </div>
            </div>

            {appointmentAnalytics.statusBreakdown?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                {appointmentAnalytics.statusBreakdown.map((sb) => (
                  <div
                    key={sb.status}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-warm-ivory/60 border border-border text-xs text-charcoal"
                  >
                    <span className="font-bold">{sb.status}:</span>
                    <span>{sb.count}</span>
                    <span className="text-[10px] text-muted-gray">({sb.percentage}%)</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Technician Operational Activity (Commissions Hidden) */}
        {techniciansPerformance.length > 0 && (
          <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/70">
              <div>
                <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                  <Users size={18} className="text-sage" />
                  Technician Staff Activity
                </h2>
                <p className="text-xs text-muted-gray">Operational productivity and completed client sessions</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[10px] border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-soft-cream border-b border-border">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Technician</th>
                    <th className="text-center py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Services Completed</th>
                    <th className="text-right py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Revenue Generated</th>
                    <th className="text-right py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Avg Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-white">
                  {techniciansPerformance.map((tech) => (
                    <tr key={tech.technicianId} className="hover:bg-warm-ivory/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{tech.technicianName}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-charcoal">{tech.servicesCompleted}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-charcoal">
                        {tech.revenueGenerated.toLocaleString('en-US')} FCFA
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-gray font-mono">
                        {tech.averageTicket.toLocaleString('en-US')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Today's Appointments Schedule & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                <Clock size={18} className="text-sage" />
                Today's Bookings
              </h2>
              <Button
                variant="secondary"
                onClick={() => navigate('/appointments')}
                className="h-8 text-xs font-semibold"
              >
                Calendar
              </Button>
            </div>

            <div className="space-y-2">
              {todaysAppointments.length > 0 ? (
                todaysAppointments.map((apt) => (
                  <AppointmentPreviewItem
                    key={apt.id}
                    time={apt.time}
                    client={apt.clientName || 'Client'}
                    service={apt.service}
                    technician={apt.technicianName || 'Staff'}
                    category={getCategoryFromService(apt.service)}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-gray text-center py-6">
                  No appointments scheduled for today.
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions & Attention */}
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-[16px] p-4 shadow-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-gray mb-3">
                Front Desk Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/clients/new')}
                  className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-soft-cream hover:bg-warm-ivory text-xs font-semibold text-charcoal transition-colors border border-border/70 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <UserPlus size={15} className="text-sage" />
                    Register New Client
                  </span>
                  <ChevronRight size={14} className="text-muted-gray" />
                </button>
                <button
                  onClick={() => navigate('/appointments/new')}
                  className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-soft-cream hover:bg-warm-ivory text-xs font-semibold text-charcoal transition-colors border border-border/70 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-sage" />
                    New Booking
                  </span>
                  <ChevronRight size={14} className="text-muted-gray" />
                </button>
                <button
                  onClick={() => navigate('/invoices')}
                  className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-soft-cream hover:bg-warm-ivory text-xs font-semibold text-charcoal transition-colors border border-border/70 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard size={15} className="text-sage" />
                    Pending Invoices ({pendingCountVal})
                  </span>
                  <ChevronRight size={14} className="text-muted-gray" />
                </button>
              </div>
            </div>

            {attentionItems.length > 0 && (
              <div className="bg-white border border-border rounded-[16px] p-4 shadow-card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-gray mb-2.5">
                  Action Required
                </h3>
                <div className="space-y-2">
                  {attentionItems.map((item) => (
                    <AttentionItem key={item.id} label={item.label} count={item.count} type={item.type} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <ClientAcquisitionModal
          isOpen={showAcquisitionModal}
          onClose={() => setShowAcquisitionModal(false)}
          onSuccess={handleAcquisitionSuccess}
        />
      </div>
    );
  }

  // =========================================================================
  // MANAGER DASHBOARD VIEW (LOCKED DESIGN — 5 SECTIONS ONLY)
  // =========================================================================
  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* ── Header ── */}
      <PageHeader
        title="Manager Dashboard"
        subtitle={`Live Business & Operational Analytics · ${today}`}
      />

      {acquisitionSuccess && (
        <div className="bg-success-soft border border-success/30 rounded-[12px] p-3.5 flex items-center gap-2.5 text-xs font-semibold text-[#4F6748] shadow-xs">
          <CheckCircle size={16} className="text-success shrink-0" />
          <span>{acquisitionSuccess}</span>
        </div>
      )}

      {/* ── Section 1: CA Total / Clients / Cash / MTN MoMo / Orange Money ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <MetricCard
          label="CA Total"
          value={totalRevenueVal.toLocaleString('en-US')}
          icon={DollarSign}
        />
        <MetricCard
          label="Clients"
          value={String(activeClientsVal)}
          icon={Users}
        />
        <MetricCard
          label="Cash"
          value={cashAmount.toLocaleString('en-US')}
          icon={Banknote}
        />
        <MetricCard
          label="MTN MoMo"
          value={mtnAmount.toLocaleString('en-US')}
          icon={Smartphone}
        />
        <MetricCard
          label="Orange Money"
          value={orangeAmount.toLocaleString('en-US')}
          icon={Smartphone}
        />
      </section>

      {/* ── Section 2: Employee Client Acquisition & Referral Summary ── */}
      <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
                <UserPlus size={18} className="text-sage" />
                Employee Client Acquisition & Referrals
              </h2>
              <span className="text-[11px] font-bold text-[#4F6748] bg-sage-soft border border-sage/30 px-2 py-0.5 rounded-[6px]">
                {commissionRate}% Commission Active
              </span>
            </div>
            <p className="text-xs text-muted-gray mt-0.5">
              Staff referral performance and introduced clients overview
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setManagerShowAllIntroduced((prev) => !prev)}
              className="px-3 py-1.5 rounded-[10px] bg-soft-cream hover:bg-warm-ivory text-xs font-semibold text-charcoal transition-colors border border-border cursor-pointer"
            >
              {managerShowAllIntroduced ? 'Hide Clients' : 'View Introduced Clients'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {technicianAcquisitionSummary.map((item) => (
            <div
              key={item.id}
              className="bg-warm-ivory/60 rounded-[12px] border border-border/70 p-3.5 flex flex-col justify-between shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-charcoal text-sm">{item.name}</span>
                <span className="text-[10px] font-semibold text-muted-gray bg-white px-2 py-0.5 rounded-[6px] border border-border">
                  {item.role}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-border/40">
                <div>
                  <span className="text-[9px] text-muted-gray uppercase font-bold block">Clients</span>
                  <span className="text-base font-extrabold text-charcoal">
                    {item.clientsIntroduced}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-gray uppercase font-bold block">Appts</span>
                  <span className="text-base font-extrabold text-charcoal">
                    {item.appointmentsCreated}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-gray uppercase font-bold block">Commission</span>
                  <span
                    className="text-xs font-extrabold text-[#4F6748] mt-0.5 block truncate"
                    title={`${item.commissionEarned} FCFA`}
                  >
                    {item.commissionEarned.toLocaleString('en-US')} F
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {managerShowAllIntroduced && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <h3 className="text-xs font-bold text-charcoal mb-2">
              All Introduced Clients ({allIntroducedClients.length})
            </h3>
            <div className="overflow-x-auto rounded-[10px] border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-soft-cream border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Client</th>
                    <th className="text-left py-2 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Introduced By</th>
                    <th className="text-left py-2 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">First Service</th>
                    <th className="text-left py-2 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Phone</th>
                    <th className="text-right py-2 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-white">
                  {allIntroducedClients.map((c) => (
                    <tr key={c.id} className="hover:bg-warm-ivory/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-charcoal">{c.name}</td>
                      <td className="py-2 px-3 font-semibold text-sage-hover">
                        <span className="bg-sage-soft px-1.5 py-0.5 rounded-[4px]">
                          {c.introducedBy}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-gray">{c.firstAppointmentService || c.lastService || '—'}</td>
                      <td className="py-2 px-3 text-muted-gray font-mono">{c.phone}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => navigate(`/clients/${c.id}`)}
                          className="text-[10px] font-semibold text-sage-hover hover:underline cursor-pointer"
                        >
                          View File →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3: Today's Appointments ── */}
      <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-charcoal">
            Today's Appointments
          </h2>
          <Button
            variant="secondary"
            onClick={() => navigate('/appointments')}
            className="w-full sm:w-auto h-10 sm:h-11 text-xs sm:text-sm"
          >
            <CalendarDays size={16} strokeWidth={1.8} />
            View Calendar
          </Button>
        </div>

        <div className="space-y-2">
          {todaysAppointments.length > 0 ? (
            todaysAppointments.map((apt) => (
              <AppointmentPreviewItem
                key={apt.id}
                time={apt.time}
                client={apt.clientName || 'Client'}
                service={apt.service}
                technician={apt.technicianName || 'Staff'}
                category={getCategoryFromService(apt.service)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-gray text-center py-4">
              No appointments scheduled for today.
            </p>
          )}
        </div>
      </section>

      {/* ── Section 4 & 5: Top Referrer & Attention ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Referrer This Month */}
        <section className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-charcoal">
                Top Referrer
              </h2>
              <Button
                variant="secondary"
                onClick={() => navigate('/referrals')}
                className="w-full sm:w-auto h-10 sm:h-11 text-xs sm:text-sm"
              >
                View Referrals
              </Button>
            </div>

            <div className="bg-soft-cream/60 border border-border/70 rounded-[14px] p-4 flex items-center gap-3.5 mt-1">
              <div className="w-12 h-12 rounded-[12px] bg-sage-soft border border-sage/30 flex items-center justify-center text-charcoal shrink-0">
                <Award size={24} className="text-sage" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-gray uppercase tracking-wider">
                  Top Staff Referrer
                </p>
                <h3 className="text-lg font-bold text-charcoal mt-0.5">
                  {topReferrer ? topReferrer.name : '-'}
                </h3>
                {topReferrer ? (
                  <p className="text-xs text-sage font-semibold mt-0.5">
                    {topReferrer.count} {topReferrer.count === 1 ? 'client referred' : 'clients referred'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-gray font-medium mt-0.5">-</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3.5 mt-3.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-gray">
            <span>Referral Program Reward:</span>
            <span className="font-semibold text-charcoal">{commissionRate}% Staff Commission</span>
          </div>
        </section>

        {/* Attention Items */}
        <section className="bg-white border border-border rounded-[16px] p-5 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-charcoal mb-4">Attention</h2>

            <div className="space-y-2">
              {attentionItems.length > 0 ? (
                attentionItems.map((item) => (
                  <AttentionItem
                    key={item.id}
                    label={item.label}
                    count={item.count}
                    type={item.type}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-gray text-center py-4">
                  No attention items today. All clear! ✨
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <ClientAcquisitionModal
        isOpen={showAcquisitionModal}
        onClose={() => setShowAcquisitionModal(false)}
        onSuccess={handleAcquisitionSuccess}
      />
    </div>
  );
}
