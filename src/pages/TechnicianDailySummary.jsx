/**
 * TechnicianDailySummary — Screen 13
 *
 * Displays the daily activity and commission calculation for a technician.
 * Connected to backend Reports & Commissions APIs (Phase 20 & 22 Module 10).
 *
 * Content (per WIREFRAME.md Screen 13, FLOW.md §27-30):
 *   - Technician selector (Manager can switch tabs, Technician locked to own view)
 *   - Date: Today
 *   - Services Today (real backend servicesCompleted)
 *   - Service Productivity (real backend revenueGenerated)
 *   - Clients Introduced
 *   - Completed Referral Services
 *   - Base Salary: [Calculated]
 *   - Commission: (real backend commissionEarned)
 *   - Bonus: [Calculated]
 *   - Daily Total
 *
 * RBAC: Cleaner blocked (403). Technician locked to own name. Manager has full access.
 *
 * Source: WIREFRAME.md Screen 13, FLOW.md §28-29
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Award,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Trash2,
  Target,
  Lock,
  Unlock,
  Zap,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Check,
  Loader2,
  Scissors,
  Megaphone,
  Users,
  Search,
  X,
  Camera,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import RecordPenaltyModal from '../components/RecordPenaltyModal';
import EditSalaryContractModal from '../components/EditSalaryContractModal';
import RecordStockPhotoModal from '../components/RecordStockPhotoModal';
import StockPhotoDetailModal from '../components/StockPhotoDetailModal';
import { useOperations } from '../context/OperationsContext';
import { useAuth, isMarketerUser } from '../context/AuthContext';
import { useClients } from '../context/ClientsContext';
import { useCommission } from '../context/CommissionContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useInvoices } from '../context/InvoiceContext';
import { reportsApi, penaltiesApi, commissionsApi } from '../services/api';
import { getDoualaTodayStr } from '../utils/timezone';

export default function TechnicianDailySummary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, allUsers } = useAuth();
  const { completedServices, techRevenue, dailyStockAudits = [], refreshDailyAudits } = useOperations();
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const { invoices } = useInvoices();
  const { getEmployeeCommissionSummary, finalizeStaffPayroll, commissionFixedAmount } = useCommission();

  const role = (user?.role || '').toLowerCase();
  const isTechnicianRole = role === 'technician';
  const isReception = role === 'reception';
  const isCleaner = role === 'cleaner';
  const isUserMarketer = isMarketerUser(user);

  const dynamicTechnicians = allUsers.filter(
    (u) => (u.role === 'technician' || u.role === 'marketer' || isMarketerUser(u)) && u.active !== false
  );

  const isUserAMarketer = useCallback((u) => {
    if (!u) return false;
    const r = String(u.role?.name || u.role || '').toLowerCase();
    return r === 'marketer' || isMarketerUser(u);
  }, []);

  const techniciansList = useMemo(
    () => dynamicTechnicians.filter((u) => !isUserAMarketer(u)),
    [dynamicTechnicians, isUserAMarketer]
  );

  const marketersList = useMemo(
    () => dynamicTechnicians.filter((u) => isUserAMarketer(u)),
    [dynamicTechnicians, isUserAMarketer]
  );

  const [staffCategoryTab, setStaffCategoryTab] = useState('all'); // 'all' | 'technician' | 'marketer'
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  const filteredTechnicians = useMemo(() => {
    if (!staffSearchQuery.trim()) return techniciansList;
    const q = staffSearchQuery.toLowerCase().trim();
    return techniciansList.filter((u) => u.name?.toLowerCase().includes(q));
  }, [techniciansList, staffSearchQuery]);

  const filteredMarketers = useMemo(() => {
    if (!staffSearchQuery.trim()) return marketersList;
    const q = staffSearchQuery.toLowerCase().trim();
    return marketersList.filter((u) => u.name?.toLowerCase().includes(q));
  }, [marketersList, staffSearchQuery]);

  const queryTechId = searchParams.get('technicianId') || searchParams.get('id');
  const queryTechName = searchParams.get('name') || searchParams.get('technician');

  // Match technician requested via URL query params
  const matchedQueryTech = !isTechnicianRole && !isUserMarketer
    ? dynamicTechnicians.find(
        (t) =>
          (queryTechId && String(t.id) === String(queryTechId)) ||
          (queryTechName && t.name?.toLowerCase().trim() === queryTechName.toLowerCase().trim())
      )
    : null;

  const initialName = (isTechnicianRole || isUserMarketer)
    ? user?.name || 'Staff'
    : matchedQueryTech?.name || dynamicTechnicians[0]?.name || 'Amina';
  const [selectedTechName, setSelectedTechName] = useState(initialName);

  // Stock Photo Audit State
  const [showStockPhotoModal, setShowStockPhotoModal] = useState(false);
  const [selectedStockAudit, setSelectedStockAudit] = useState(null);

  // Sync selectedTechName whenever dynamicTechnicians or query parameters change
  useEffect(() => {
    if (isTechnicianRole || isUserMarketer) return;
    if (matchedQueryTech && matchedQueryTech.name !== selectedTechName) {
      setSelectedTechName(matchedQueryTech.name);
    } else if (!selectedTechName && dynamicTechnicians.length > 0) {
      setSelectedTechName(dynamicTechnicians[0].name);
    }
  }, [matchedQueryTech, dynamicTechnicians, isTechnicianRole, isUserMarketer, selectedTechName]);

  // If technician or marketer, lock to their own name
  const effectiveName = (isTechnicianRole || isUserMarketer)
    ? user?.name || 'Staff'
    : selectedTechName;

  const currentTech = (isTechnicianRole || isUserMarketer)
    ? (user || { id: user?.id || 1, name: user?.name || 'Staff', specialties: [] })
    : (dynamicTechnicians.find((t) => t.name === effectiveName) ||
       dynamicTechnicians[0] || { id: 1, name: 'Technician', specialties: [] });

  const isMarketer = isUserMarketer || isMarketerUser(currentTech) || currentTech?.role === 'marketer';

  const isManager = role === 'manager';

  // Live Backend Performance State
  const [techReport, setTechReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Target-Based Salary & Commission State (Phase 4)
  const [salarySummary, setSalarySummary] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  // Monthly Period State for Historical Review
  const currentMonthStr = useMemo(() => getDoualaTodayStr().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const isCurrentMonth = selectedMonth === currentMonthStr;

  const goToPrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    setSelectedMonth(
      `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`
    );
  };

  const goToNextMonth = () => {
    if (selectedMonth >= currentMonthStr) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    setSelectedMonth(
      `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`
    );
  };

  const resetToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
  };

  const handleFinalizeMonth = async () => {
    if (
      !window.confirm(
        `Finalize and freeze the payroll record for ${effectiveName} for ${
          salarySummary?.period || selectedMonth
        }? This locks the record against future modifications.`
      )
    )
      return;
    try {
      await finalizeStaffPayroll(currentTech?.id, selectedMonth);
      fetchSalarySummary();
      alert(`Payroll record for ${salarySummary?.period || selectedMonth} finalized and frozen successfully!`);
    } catch (err) {
      alert(err?.message || 'Failed to finalize payroll');
    }
  };

  // Disciplinary Infractions & Penalties State (Feature 4)
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penalties, setPenalties] = useState([]);
  const [totalPenalties, setTotalPenalties] = useState(0);
  const [penaltiesLoading, setPenaltiesLoading] = useState(false);

  const fetchTechReport = useCallback(async () => {
    if (isCleaner) return;
    setLoading(true);
    try {
      if (isTechnicianRole || isMarketer) {
        const res = await reportsApi.getMyPerformance('today');
        setTechReport(res?.data || null);
      } else {
        // Manager can view all or specific technician
        const res = await reportsApi.getTechnicians('today');
        const list = res?.data?.technicians || [];
        const matched = list.find(
          (t) =>
            t.technicianName?.toLowerCase() === effectiveName?.toLowerCase() ||
            t.technicianId === currentTech?.id
        );
        setTechReport(matched || null);
      }
    } catch (err) {
      console.warn('Technician summary report fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isCleaner, isTechnicianRole, isMarketer, effectiveName, currentTech?.id]);

  const fetchPenalties = useCallback(async () => {
    if (isCleaner) return;
    setPenaltiesLoading(true);
    try {
      const targetId = (isTechnicianRole || isUserMarketer) ? user?.id : currentTech?.id;
      if (!targetId) return;
      const res = await penaltiesApi.getPenalties({
        staffId: String(targetId),
        month: selectedMonth,
      });
      if (res?.data) {
        setPenalties(res.data.penalties || []);
        setTotalPenalties(res.data.totalPenalties || 0);
      }
    } catch (err) {
      console.warn('Could not fetch staff penalties:', err.message);
    } finally {
      setPenaltiesLoading(false);
    }
  }, [isCleaner, isTechnicianRole, isUserMarketer, user?.id, currentTech?.id, selectedMonth]);

  const fetchSalarySummary = useCallback(async () => {
    if (isCleaner) return;
    const targetId = (isTechnicianRole || isUserMarketer) ? user?.id : currentTech?.id;
    if (!targetId) return;
    setSalaryLoading(true);
    setSalarySummary(null);
    try {
      const res = await commissionsApi.getSalarySummary({
        technicianId: String(targetId),
        period: selectedMonth,
      });
      if (res?.data) {
        setSalarySummary(res.data);
      }
    } catch (err) {
      console.warn('Salary summary fetch error:', err.message);
    } finally {
      setSalaryLoading(false);
    }
  }, [isCleaner, isTechnicianRole, isUserMarketer, user?.id, currentTech?.id, selectedMonth]);

  useEffect(() => {
    fetchTechReport();
  }, [fetchTechReport]);

  useEffect(() => {
    fetchPenalties();
  }, [fetchPenalties]);

  useEffect(() => {
    fetchSalarySummary();
  }, [fetchSalarySummary]);

  const handleDeletePenalty = async (penaltyId) => {
    if (!window.confirm('Are you sure you want to void / delete this penalty record?')) return;
    try {
      await penaltiesApi.deletePenalty(penaltyId);
      fetchPenalties();
    } catch (err) {
      alert(err?.message || 'Failed to delete penalty');
    }
  };

  // =========================================================================
  // RBAC GUARD: CLEANER BLOCKED
  // =========================================================================
  if (isCleaner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[16px] border border-border shadow-card my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied (403)</h2>
        <p className="text-sm text-muted-gray max-w-md mb-6">
          Technician daily summaries and commission reports are restricted to service staff and management.
        </p>
        <Button variant="primary" onClick={() => navigate('/cleaning')}>
          Go to Cleaning Records
        </Button>
      </div>
    );
  }

  // Fallback calculations from shared state
  const fallbackServicesToday = completedServices.filter(
    (s) => s.technician === currentTech.name
  ).length;
  const fallbackProductivity = techRevenue?.[currentTech.name] || 0;
  const commSummary = getEmployeeCommissionSummary(currentTech.name);

  // Real backend metrics prioritized
  const servicesToday = techReport?.servicesCompleted ?? fallbackServicesToday;
  const serviceProductivity = techReport?.revenueGenerated ?? fallbackProductivity;
  const averageTicket = techReport?.averageTicket ?? (servicesToday > 0 ? Math.round(serviceProductivity / servicesToday) : 0);

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Filter stock photo audits logged today for the active technician
  const todayTechAudits = useMemo(() => {
    const targetId = (isTechnicianRole || isUserMarketer) ? user?.id : currentTech?.id;
    const todayStr = new Date().toISOString().split('T')[0];
    return dailyStockAudits.filter((a) => {
      if (targetId && a.technicianId !== targetId) return false;
      const aDate = a.date ? new Date(a.date).toISOString().split('T')[0] : '';
      return aDate === todayStr || !a.date;
    });
  }, [dailyStockAudits, isTechnicianRole, isUserMarketer, user?.id, currentTech?.id]);

  // -------------------------------------------------------------------------
  // Resilient Normalization for Target Salary Performance (Zero-NaN Guarantee)
  // Handles both legacy Railway backend payloads and enhanced alias properties
  // -------------------------------------------------------------------------
  const sContract = salarySummary?.contract || {};
  const sPerf = salarySummary?.performance || {};
  const sCalc = salarySummary?.calculation || {};

  const sMonthlyTarget = Number(sContract.monthlyTarget ?? 0) || 0;
  const sFixedSalary = Number(sContract.fixedSalary ?? 0) || 0;
  const sBasePay = Number(sContract.basePay ?? 0) || 0;
  const sCommissionRate = Number(sContract.commissionRate ?? 0) || 0;
  const sTargetScope = sContract.targetScope || 'INDIVIDUAL';

  const sMtdSales = Number(sPerf.mtdSales ?? sPerf.salesTotal ?? 0) || 0;
  const sIsTargetMet = Boolean(
    sPerf.isTargetMet ?? (sMonthlyTarget > 0 && sMtdSales >= sMonthlyTarget)
  );

  const rawProgressPercent = sPerf.targetProgressPercent ?? sPerf.percentageAchieved;
  const sProgressPercent = Number(
    rawProgressPercent != null
      ? rawProgressPercent
      : sMonthlyTarget > 0
      ? Math.min(100, Math.round((sMtdSales / sMonthlyTarget) * 1000) / 10)
      : 0
  ) || 0;

  const rawRemaining = sPerf.salesRemainingToTarget ?? sPerf.remainingToTarget;
  const sRemainingToTarget = Number(
    rawRemaining != null ? rawRemaining : Math.max(0, sMonthlyTarget - sMtdSales)
  ) || 0;

  // Derive referred clients list for this technician or marketer
  const myReferredClients = clients.filter(
    (c) =>
      (c.introducedById && String(c.introducedById) === String(currentTech?.id)) ||
      (c.introducedBy && c.introducedBy.toLowerCase().trim() === effectiveName.toLowerCase().trim())
  );

  // Helper: Get actual cash collected after discount
  const getInvoiceNetPaid = (inv) => {
    if (inv.paidAmount != null && Number(inv.paidAmount) > 0) return Number(inv.paidAmount);
    if (inv.finalTotal != null && Number(inv.finalTotal) > 0) return Number(inv.finalTotal);
    const total = Number(inv.total || 0);
    const discount = Number(inv.discount || 0);
    return Math.max(0, total - discount);
  };

  // Invoices belonging to clients prospected by this marketer
  const myProspectedInvoices = useMemo(() => {
    const referredIds = new Set(myReferredClients.map((c) => String(c.id)));
    const targetUserId = String(currentTech?.id);
    return (invoices || []).filter(
      (inv) =>
        (referredIds.has(String(inv.clientId)) ||
        (inv.introducedById && String(inv.introducedById) === targetUserId)) &&
        (inv.status === 'PAID' || inv.status === 'COMPLETED')
    );
  }, [invoices, myReferredClients, currentTech?.id]);

  // Aggregate actual net sales, commissions, and services from prospected paid invoices
  const { prospectedNetSales, prospectedTotalCommission, prospectedCompletedServices } = useMemo(() => {
    let sales = 0;
    let comm = 0;
    let svcCount = 0;
    (myProspectedInvoices || []).forEach((inv) => {
      const net = getInvoiceNetPaid(inv);
      sales += net;
      if (sCommissionRate > 0) {
        comm += Math.round(net * (sCommissionRate / 100));
      } else if (commissionFixedAmount != null && Number(commissionFixedAmount) > 0) {
        comm += Number(commissionFixedAmount);
      } else {
        comm += Math.round(net * 0.1);
      }
      svcCount += inv.items?.length || 1;
    });
    return {
      prospectedNetSales: sales,
      prospectedTotalCommission: comm,
      prospectedCompletedServices: svcCount,
    };
  }, [myProspectedInvoices, sCommissionRate, commissionFixedAmount]);

  // Marketer target evaluation:
  // If targetAppointments is explicitly set (e.g. 10 or 20 bookings), track by bookings count.
  // Otherwise, track by monthly sales target in FCFA (sIsTargetMet).
  const hasSpecificBookingTarget = Boolean(
    sContract.targetAppointments &&
    Number(sContract.targetAppointments) > 0 &&
    Number(sContract.targetAppointments) < 1000
  );
  const marketerTargetCount = hasSpecificBookingTarget ? Number(sContract.targetAppointments) : 0;
  const marketerClosedAppointments = useMemo(() => {
    const referredIds = new Set(myReferredClients.map((c) => String(c.id)));
    return (appointments || []).filter(
      (a) =>
        referredIds.has(String(a.clientId)) &&
        (a.status === 'COMPLETED' || a.status === 'PAID')
    );
  }, [myReferredClients, appointments]);

  const closedAppointmentsCount = marketerClosedAppointments.length;

  const effectiveMtdSales = isMarketer
    ? Math.max(sMtdSales, prospectedNetSales)
    : sMtdSales;

  const effectiveProgressPercent = sMonthlyTarget > 0
    ? Math.min(100, Math.round((effectiveMtdSales / sMonthlyTarget) * 1000) / 10)
    : 0;

  const effectiveRemainingToTarget = Math.max(0, sMonthlyTarget - effectiveMtdSales);

  const isMarketerTargetMet = hasSpecificBookingTarget
    ? closedAppointmentsCount >= marketerTargetCount
    : Boolean(sIsTargetMet || (sMonthlyTarget > 0 && effectiveMtdSales >= sMonthlyTarget));

  // Active Mode: Mode B (Target Met) vs Mode A (Below Target)
  const sIsModeB = isMarketer
    ? isMarketerTargetMet
    : (sIsTargetMet ||
      sCalc.activeMode === 'BASE_PLUS_COMMISSION' ||
      sCalc.mode === 'MODE_B_TARGET_MET');

  const sGrossCommission = Number(
    sCalc.grossCommissionAccumulated ?? sCalc.grossCommission ?? 0
  ) || 0;
  const sReferralDeductions = Number(
    sCalc.referralDeductionsTotal ?? sCalc.referralDeductions ?? 0
  ) || 0;
  const sNetCommission = Number(
    sCalc.netCommissionAccumulated ??
    sCalc.netCommission ??
    Math.max(0, sGrossCommission - sReferralDeductions)
  ) || 0;

  const commissionEarned = isMarketer
    ? Math.max(sNetCommission, prospectedTotalCommission, commSummary.commissionEarned || 0)
    : (techReport?.commissionEarned ?? commSummary.commissionEarned);

  const sUnearnedLocked = Number(
    sCalc.unearnedCommissionLocked ?? (!sIsModeB ? sNetCommission : 0)
  ) || 0;

  const sTotalPenalties = Number(
    totalPenalties || sCalc.totalPenalties || sReferralDeductions || 0
  ) || 0;

  const rawTechPayout = Number(
    sCalc.currentProjectedPayout ??
    sCalc.effectivePayout ??
    sCalc.calculatedPayout ??
    (sIsModeB ? Math.max(sFixedSalary, sBasePay + sNetCommission) : sFixedSalary)
  ) || 0;
  const sEffectivePayout = Math.max(0, rawTechPayout - sTotalPenalties);

  const marketerBaseOrFixed = isMarketerTargetMet ? (sBasePay || 2500) : (sFixedSalary || 2000);
  const marketerGrossPayout = marketerBaseOrFixed + (commissionEarned || 0);
  const marketerTotalPayout = Math.max(0, marketerGrossPayout - sTotalPenalties);

  const sFloorProtectionApplied = Boolean(
    sCalc.floorProtectionApplied ||
    (sIsModeB && rawTechPayout === sFixedSalary && (sBasePay + sNetCommission) < sFixedSalary)
  );

  return (
    <div>
      <PageHeader
        title={
          isMarketer
            ? 'Marketer Daily Summary'
            : isTechnicianRole
            ? 'My Daily Summary'
            : 'Technician Daily Summary'
        }
        subtitle={
          isMarketer
            ? 'Client referral tracking and acquisition performance summary.'
            : 'Individual daily performance and auto-calculation summary.'
        }
        action={
          <div className="flex items-center gap-2">
            {/* Prominent Month Navigator in Top-Right Corner */}
            <div className="flex items-center bg-white border border-border rounded-[12px] p-1 shadow-2xs hover:border-sage/50 transition-all">
              <button
                onClick={goToPrevMonth}
                title="Previous Month"
                className="p-1.5 rounded-[8px] hover:bg-soft-cream text-charcoal transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 text-xs sm:text-sm font-bold text-charcoal select-none whitespace-nowrap">
                <Calendar size={15} className="text-sage shrink-0" />
                <span>{salarySummary?.period || selectedMonth}</span>
              </div>

              <button
                onClick={goToNextMonth}
                disabled={selectedMonth >= currentMonthStr}
                title="Next Month"
                className={`p-1.5 rounded-[8px] transition cursor-pointer ${
                  selectedMonth >= currentMonthStr
                    ? 'opacity-30 cursor-not-allowed text-muted-gray'
                    : 'hover:bg-soft-cream text-charcoal'
                }`}
              >
                <ChevronRight size={16} />
              </button>

              {!isCurrentMonth && (
                <button
                  onClick={resetToCurrentMonth}
                  className="ml-1 px-2.5 py-1 rounded-[8px] bg-sage text-white text-[11px] font-bold hover:bg-sage-hover transition cursor-pointer shadow-2xs"
                >
                  Current
                </button>
              )}
            </div>

            {!isCurrentMonth && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-[8px] bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                Historical Month
              </span>
            )}

            {salarySummary?.isFinalized && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-[8px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" /> Finalized
              </span>
            )}
          </div>
        }
      />

      {/* ── Role-Separated Staff Selector (Manager & Reception) ── */}
      {!isTechnicianRole && !isUserMarketer && (
        <div className="bg-white border border-border rounded-[18px] p-4 sm:p-5 mb-6 shadow-card transition-all">
          {/* Top Bar: Tabs + Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-soft-cream/80 border border-border/80 rounded-[12px] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStaffCategoryTab('all')}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  staffCategoryTab === 'all'
                    ? 'bg-white text-charcoal shadow-xs border border-border/60'
                    : 'text-muted-gray hover:text-charcoal'
                }`}
              >
                <Users size={13} />
                <span>All</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    staffCategoryTab === 'all'
                      ? 'bg-sage-soft text-[#4F6748]'
                      : 'bg-warm-ivory text-muted-gray'
                  }`}
                >
                  {dynamicTechnicians.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStaffCategoryTab('technician');
                  if (isMarketer && techniciansList.length > 0) {
                    const first = techniciansList[0];
                    if (selectedTechName !== first.name) {
                      setSalarySummary(null);
                      setSalaryLoading(true);
                      setSelectedTechName(first.name);
                      setSearchParams({ technicianId: first.id });
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  staffCategoryTab === 'technician'
                    ? 'bg-sage text-white shadow-xs'
                    : 'text-muted-gray hover:text-charcoal'
                }`}
              >
                <Scissors size={13} />
                <span>Technicians</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    staffCategoryTab === 'technician'
                      ? 'bg-white/20 text-white'
                      : 'bg-warm-ivory text-muted-gray'
                  }`}
                >
                  {techniciansList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStaffCategoryTab('marketer');
                  if (!isMarketer && marketersList.length > 0) {
                    const first = marketersList[0];
                    if (selectedTechName !== first.name) {
                      setSalarySummary(null);
                      setSalaryLoading(true);
                      setSelectedTechName(first.name);
                      setSearchParams({ technicianId: first.id });
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  staffCategoryTab === 'marketer'
                    ? 'bg-[#6D28D9] text-white shadow-xs'
                    : 'text-muted-gray hover:text-charcoal'
                }`}
              >
                <Megaphone size={13} />
                <span>Marketers</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    staffCategoryTab === 'marketer'
                      ? 'bg-white/20 text-white'
                      : 'bg-warm-ivory text-muted-gray'
                  }`}
                >
                  {marketersList.length}
                </span>
              </button>
            </div>

            {/* Quick Search Input */}
            <div className="relative min-w-[190px] sm:min-w-[220px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Search staff name..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-[10px] bg-soft-cream/60 border border-border text-charcoal placeholder-muted-gray focus:outline-none focus:border-sage transition-colors"
              />
              {staffSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStaffSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal cursor-pointer p-0.5"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Body: Groups with simple names */}
          <div className="pt-3.5 space-y-4">
            {/* 1. Technicians Section (shown if 'all' or 'technician') */}
            {(staffCategoryTab === 'all' || staffCategoryTab === 'technician') && (
              <div>
                {staffCategoryTab === 'all' && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                      <Scissors size={12} className="text-sage" />
                      Technicians ({filteredTechnicians.length})
                    </span>
                    <span className="text-[10px] text-muted-gray">Spa, Salon & Massage Specialists</span>
                  </div>
                )}
                {filteredTechnicians.length === 0 ? (
                  <p className="text-xs text-muted-gray italic py-1">No technicians found matching filter.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredTechnicians.map((tech) => {
                      const isSelected = selectedTechName === tech.name;
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => {
                            if (selectedTechName !== tech.name) {
                              setSalarySummary(null);
                              setSalaryLoading(true);
                              setSelectedTechName(tech.name);
                              setSearchParams({ technicianId: tech.id });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sage text-white border-sage shadow-xs ring-2 ring-sage/30'
                              : 'bg-soft-cream/70 hover:bg-white text-charcoal border-border'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-[#4F6748] border border-border/60'
                            }`}
                          >
                            {tech.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate">{tech.name}</span>
                          {isSelected && <Check size={12} strokeWidth={2.5} className="ml-0.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Divider if showing both in 'all' view */}
            {staffCategoryTab === 'all' && marketersList.length > 0 && (
              <div className="border-t border-border/50" />
            )}

            {/* 2. Marketers Section (shown if 'all' or 'marketer') */}
            {(staffCategoryTab === 'all' || staffCategoryTab === 'marketer') && (
              <div>
                {staffCategoryTab === 'all' && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                      <Megaphone size={12} className="text-[#6D28D9]" />
                      Marketers ({filteredMarketers.length})
                    </span>
                    <span className="text-[10px] text-muted-gray">Client Introduction & Referral Commission</span>
                  </div>
                )}
                {filteredMarketers.length === 0 ? (
                  <p className="text-xs text-muted-gray italic py-1">No marketers found matching filter.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredMarketers.map((mkt) => {
                      const isSelected = selectedTechName === mkt.name;
                      return (
                        <button
                          key={mkt.id}
                          type="button"
                          onClick={() => {
                            if (selectedTechName !== mkt.name) {
                              setSalarySummary(null);
                              setSalaryLoading(true);
                              setSelectedTechName(mkt.name);
                              setSearchParams({ technicianId: mkt.id });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs ring-2 ring-[#6D28D9]/30'
                              : 'bg-[#F5F3FF]/70 hover:bg-white text-charcoal border-[#DDD6FE]'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-[#6D28D9] border border-[#DDD6FE]'
                            }`}
                          >
                            {mkt.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate">{mkt.name}</span>
                          {isSelected && <Check size={12} strokeWidth={2.5} className="ml-0.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State Spinner while switching technician/marketer */}
      {salaryLoading ? (
        <div className="bg-white border border-border rounded-[20px] p-12 text-center shadow-card flex flex-col items-center justify-center my-6 space-y-3 min-h-[340px]">
          <div className="w-12 h-12 rounded-full bg-sage-soft border border-sage/30 flex items-center justify-center text-sage">
            <Loader2 size={26} className="animate-spin text-sage" />
          </div>
          <div>
            <h3 className="text-base font-bold text-charcoal">
              Loading Performance Summary for {effectiveName}...
            </h3>
            <p className="text-xs text-muted-gray mt-1 max-w-sm mx-auto">
              Fetching monthly sales quota, commission calculation, and contract mode.
            </p>
          </div>
        </div>
      ) : (
        <>

      {/* Target Progress Hero Gauge */}
      {salarySummary && (
        <div className="mb-6 bg-gradient-to-br from-[#111827] via-[#1E293B] to-[#0F172A] rounded-[20px] p-5 sm:p-6 text-white shadow-card border border-slate-700/60 relative overflow-hidden">
          {/* Subtle background glow */}
          <div
            className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 transition-all ${
              sIsModeB ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />

          <div className="relative z-10">
            {/* Top row: Target & Mode Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-bold shadow-md ${
                    sIsModeB
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <Target size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                      Monthly Target Performance
                    </h3>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {salarySummary?.period || selectedMonth}
                    </span>
                    {!isCurrentMonth && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-200 border border-indigo-700 font-medium">
                        Archive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Target Quota:{' '}
                    <span className="text-slate-200 font-semibold">
                      {sMonthlyTarget.toLocaleString()} FCFA
                    </span>{' '}
                    ({sTargetScope === 'SPA_TOTAL' ? 'Spa Total Scope' : 'Individual Sales'})
                  </p>
                </div>
              </div>

              {/* Mode Badge & Contract settings button */}
              <div className="flex items-center gap-2">
                {sIsModeB ? (
                  <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <Unlock size={14} className="text-emerald-400" />
                    <span>Mode B · Commission Tier Unlocked</span>
                  </div>
                ) : (
                  <div className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <Lock size={14} className="text-amber-400" />
                    <span>Mode A · Fixed Salary</span>
                  </div>
                )}

                {isManager && !isCurrentMonth && !salarySummary?.isFinalized && (
                  <button
                    onClick={handleFinalizeMonth}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-[10px] bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                    title="Freeze and lock this month's payroll record"
                  >
                    <CheckCircle2 size={14} />
                    <span className="hidden sm:inline">Finalize Month</span>
                  </button>
                )}

                {isManager && (
                  <button
                    onClick={() => setShowContractModal(true)}
                    className="p-2 rounded-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-medium"
                    title="Edit Salary Contract"
                  >
                    <Calculator size={15} />
                    <span className="hidden sm:inline">Contract</span>
                  </button>
                )}
              </div>
            </div>

            {/* Hero Progress Bar */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {(isMarketer ? effectiveMtdSales : sMtdSales).toLocaleString()}
                  </span>
                  <span className="text-slate-400 font-medium text-xs sm:text-sm">
                    / {sMonthlyTarget.toLocaleString()} FCFA MTD
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base sm:text-lg font-black ${
                      sIsModeB ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {(isMarketer ? effectiveProgressPercent : sProgressPercent)}%
                  </span>
                </div>
              </div>

              <div className="w-full h-3.5 sm:h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/80">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    sIsModeB
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(3, (isMarketer ? effectiveProgressPercent : sProgressPercent)))}%`,
                  }}
                />
              </div>
            </div>

            {/* Target Status Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
                <Zap
                  size={16}
                  className={sIsModeB ? 'text-emerald-400' : 'text-amber-400'}
                />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Distance to Goal</div>
                  <div className="text-slate-200 font-bold">
                    {sIsModeB
                      ? 'Target Achieved 🎉'
                      : `${(isMarketer ? effectiveRemainingToTarget : sRemainingToTarget).toLocaleString()} FCFA remaining`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
                <DollarSign size={16} className="text-slate-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Contract Terms</div>
                  <div className="text-slate-200 font-bold">
                    {isMarketer
                      ? `${sCommissionRate}% comm · ${sFixedSalary.toLocaleString()} flat / ${(sBasePay || 2500).toLocaleString()} base`
                      : `${sCommissionRate}% comm · ${sFixedSalary.toLocaleString()} fixed`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
                <Award size={16} className="text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Projected Payout</div>
                  <div className="text-emerald-300 font-bold text-sm">
                    {(isMarketer ? marketerTotalPayout : sEffectivePayout).toLocaleString()} FCFA
                  </div>
                  {sTotalPenalties > 0 && (
                    <div className="text-[10px] text-rose-300 font-medium">
                      (-{sTotalPenalties.toLocaleString()} FCFA penalty deducted)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Summary Card — Locked minimal structure */}
      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-5 border-b border-border mb-5 gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-charcoal">
              {currentTech.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-gray">
              {isMarketer
                ? 'Marketing Specialist · Client Acquisition'
                : (currentTech.specialties || []).join(', ') || 'Technician'}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {isManager && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowPenaltyModal(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 shadow-none font-semibold text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-[10px]"
              >
                <AlertTriangle size={14} className="text-rose-600" />
                Record Penalty
              </Button>
            )}
            <div className="text-left sm:text-right">
              <span className="text-[10px] sm:text-xs font-medium text-muted-gray uppercase tracking-wide">
                Date
              </span>
              <p className="text-xs sm:text-sm font-semibold text-charcoal">{today}</p>
            </div>
          </div>
        </div>

        {/* Operational Metrics */}
        {isMarketer ? (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-charcoal flex items-center gap-2">
                <UserPlus size={16} className="text-[#6D28D9]" />
                Clients Introduced
              </span>
              <span className="text-base font-bold text-charcoal">
                {myReferredClients.length || commSummary.clientsReferred}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-charcoal font-medium flex items-center gap-2">
                <Sparkles size={16} className="text-[#6D28D9]" />
                Completed Referral Services
              </span>
              <span className="text-sm font-bold text-charcoal">
                {prospectedCompletedServices || commSummary.completedServices || 0}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-gray flex items-center gap-2">
                <Award size={16} className="text-[#6D28D9]" />
                Referral Commission Rate
              </span>
              <span className="text-sm font-semibold text-charcoal font-mono">
                {sCommissionRate > 0 ? `${sCommissionRate}% per completed service` : '10% per completed service'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-charcoal flex items-center gap-2">
                <Sparkles size={16} className="text-sage" />
                Services Performed Today
              </span>
              <span className="text-base font-bold text-charcoal">
                {servicesToday}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-charcoal font-medium flex items-center gap-2">
                <DollarSign size={16} className="text-sage" />
                Service Productivity (Performed)
              </span>
              <span className="text-sm font-bold text-charcoal">
                {serviceProductivity.toLocaleString('en-US')} FCFA
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-gray flex items-center gap-2">
                <TrendingUp size={16} className="text-sage" />
                Average Ticket per Service
              </span>
              <span className="text-sm font-semibold text-charcoal font-mono">
                {averageTicket.toLocaleString('en-US')} FCFA
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-gray">Clients Introduced</span>
              <span className="text-sm font-bold text-charcoal">
                {myReferredClients.length || commSummary.clientsReferred}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-gray">Completed Referral Services</span>
              <span className="text-sm font-bold text-charcoal">
                {commSummary.completedServices}
              </span>
            </div>
          </div>
        )}

        {/* Divider & Calculations */}
        <div className="border-t border-border pt-5 mb-6 space-y-3">
          {isMarketer ? (
            <div className="space-y-3">
              {/* Target Progress Card */}
              <div className={`p-4 rounded-[14px] border ${
                isMarketerTargetMet
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-warm-ivory/60 border-border'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target size={16} className={isMarketerTargetMet ? 'text-emerald-700' : 'text-[#6D28D9]'} />
                    <span className="text-xs sm:text-sm font-bold text-charcoal">
                      {hasSpecificBookingTarget
                        ? `Monthly Closed Bookings Target: ${marketerTargetCount}`
                        : `Monthly Sales Target: ${sMonthlyTarget.toLocaleString()} FCFA`}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold ${
                    isMarketerTargetMet
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isMarketerTargetMet
                      ? 'Target Achieved 🎉'
                      : (hasSpecificBookingTarget
                        ? `${Math.max(0, marketerTargetCount - closedAppointmentsCount)} More Needed`
                        : `${sRemainingToTarget.toLocaleString()} FCFA More Needed`)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-soft-cream/80 rounded-full h-2.5 overflow-hidden mb-2 border border-border/50">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isMarketerTargetMet ? 'bg-emerald-600' : 'bg-[#6D28D9]'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        hasSpecificBookingTarget
                          ? Math.round((closedAppointmentsCount / Math.max(1, marketerTargetCount)) * 100)
                          : sProgressPercent
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-gray">
                  {hasSpecificBookingTarget ? (
                    <>
                      <span>Closed this month: <strong>{closedAppointmentsCount}</strong> bookings</span>
                      <span>{Math.min(100, Math.round((closedAppointmentsCount / Math.max(1, marketerTargetCount)) * 100))}% complete</span>
                    </>
                  ) : (
                    <>
                      <span>Achieved this month: <strong>{(isMarketer ? effectiveMtdSales : sMtdSales).toLocaleString()} FCFA</strong></span>
                      <span>{(isMarketer ? effectiveProgressPercent : sProgressPercent)}% complete</span>
                    </>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-gray">Target Met Base Pay (Mode B):</span>
                    <span className={`font-bold ${isMarketerTargetMet ? 'text-emerald-700' : 'text-muted-gray'}`}>
                      {(sBasePay || 2500).toLocaleString()} FCFA
                      {isMarketerTargetMet ? (
                        <span className="ml-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300">
                          (Active Unlocked ✓)
                        </span>
                      ) : (
                        <span className="ml-1.5 text-[10px] font-normal text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          (Unlocks at target)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-gray">
                    <span>Below Target Flat Salary (Mode A):</span>
                    <span className="font-semibold text-charcoal/80">
                      {sFixedSalary > 0 ? `${sFixedSalary.toLocaleString()} FCFA` : '0 FCFA'}
                      {isMarketerTargetMet && (
                        <span className="ml-1 text-[10px] text-muted-gray font-normal">(Base retainer if sales &lt; target)</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compulsory Guaranteed Commission Row */}
              <div className="p-3.5 rounded-[12px] bg-[#EDE9FE]/50 border border-[#DDD6FE] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#6D28D9] flex items-center gap-1.5">
                    <Sparkles size={14} /> Guaranteed % Commission (Always Paid)
                  </span>
                  <p className="text-[11px] text-muted-gray mt-0.5">
                    Compulsory on all completed services brought by you, regardless of target.
                  </p>
                </div>
                <span className="text-sm font-extrabold text-[#6D28D9] font-mono">
                  {(commissionEarned || sNetCommission || 0).toLocaleString('en-US')} FCFA
                </span>
              </div>
            </div>
          ) : (
            <>
              {salarySummary ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-gray">
                    {!sIsModeB ? 'Fixed Salary' : 'Base Salary'}
                  </span>
                  <span className="font-semibold text-charcoal">
                    {!sIsModeB
                      ? `${sFixedSalary.toLocaleString()} FCFA`
                      : `${sBasePay.toLocaleString()} FCFA`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-gray">Base Salary</span>
                  <span className="text-muted-gray font-mono text-xs bg-soft-cream px-2 py-1 rounded-[6px] border border-border">
                    [Calculated]
                  </span>
                </div>
              )}

              {/* Commission Calculation with Target Engine Integration */}
              {salarySummary ? (
                !sIsModeB ? (
                  <div className="p-3 rounded-[12px] bg-amber-50/70 border border-amber-200/70 space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                        <Lock size={14} className="text-amber-600" />
                        Conditional Unearned Commission (Locked)
                      </span>
                      <span className="font-bold text-amber-900">
                        {sUnearnedLocked.toLocaleString()} FCFA
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Locked until monthly target ({sMonthlyTarget.toLocaleString()} FCFA) is achieved. Fixed salary of {sFixedSalary.toLocaleString()} FCFA applies.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-[12px] bg-emerald-50/70 border border-emerald-200/70 space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                        <Unlock size={14} className="text-emerald-600" />
                        Net Earned Commission (Unlocked)
                      </span>
                      <span className="font-bold text-emerald-800">
                        {sNetCommission.toLocaleString()} FCFA
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Target reached! Paid as Base ({sBasePay.toLocaleString()}) + Net Commission ({sNetCommission.toLocaleString()}).
                    </p>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-charcoal font-medium">Referral Commission</span>
                  {isReception ? (
                    <span className="font-mono text-xs text-muted-gray bg-soft-cream px-2 py-1 rounded-[6px] border border-border">
                      [Confidential - Manager Only]
                    </span>
                  ) : (
                    <span className="font-extrabold px-2.5 py-1 rounded-[6px] text-xs bg-sage-soft text-[#4F6748] border border-sage/20">
                      {(commissionEarned || 0).toLocaleString('en-US')} FCFA
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Penalties Deduction Row if any */}
          {sTotalPenalties > 0 && (
            <div className="flex items-center justify-between text-sm text-rose-700 bg-rose-50/70 p-2.5 rounded-[10px] border border-rose-200">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-rose-600" /> Disciplinary Infractions & Penalties Deducted
              </span>
              <span className="font-bold font-mono">
                -{sTotalPenalties.toLocaleString()} FCFA
              </span>
            </div>
          )}
        </div>

        {/* Total Projected Payout Row */}
        <div className="bg-sage-soft border border-sage/20 rounded-[14px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award size={20} className="text-sage" />
            <div>
              <span className="text-sm font-bold text-charcoal block">
                Projected Monthly Payout
              </span>
              <span className="text-[11px] text-muted-gray">
                {isMarketer
                  ? (isMarketerTargetMet
                    ? `Target Met Base Pay (${(sBasePay || 2500).toLocaleString()} FCFA) + Guaranteed Commission (${(commissionEarned || 0).toLocaleString()} FCFA)${sTotalPenalties > 0 ? ` - Penalties (${sTotalPenalties.toLocaleString()} FCFA)` : ''}`
                    : `Below Target Flat Salary (${(sFixedSalary || 2000).toLocaleString()} FCFA) + Guaranteed Commission (${(commissionEarned || 0).toLocaleString()} FCFA)${sTotalPenalties > 0 ? ` - Penalties (${sTotalPenalties.toLocaleString()} FCFA)` : ''}`)
                  : (sTotalPenalties > 0
                    ? `Gross Payout (${rawTechPayout.toLocaleString()} FCFA) - Penalties (${sTotalPenalties.toLocaleString()} FCFA)`
                    : sFloorProtectionApplied
                    ? `Minimum fixed salary (${sFixedSalary.toLocaleString()} FCFA)`
                    : !sIsModeB
                    ? `Fixed Salary (Target not yet met)`
                    : `Base + Unlocked Net Commission`)}
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-lg font-black text-charcoal">
              {isMarketer
                ? marketerTotalPayout.toLocaleString()
                : (salarySummary ? sEffectivePayout.toLocaleString() : '0')} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Referred Clients List */}
      <div className="mt-6 bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-sage" />
            <h3 className="text-base font-bold text-charcoal">
              Referred Clients ({myReferredClients.length})
            </h3>
          </div>
          <span className="text-xs text-muted-gray">
            Attributed to {effectiveName}
          </span>
        </div>

        {myReferredClients.length === 0 ? (
          <div className="text-center py-6 text-muted-gray text-xs sm:text-sm bg-soft-cream/30 rounded-[10px] border border-border/50">
            No clients introduced by this staff member yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Quartier</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {myReferredClients.map((c) => (
                  <tr key={c.id} className="border-b border-border/30 last:border-b-0 hover:bg-soft-cream/20">
                    <td className="py-2.5 px-3 font-semibold text-charcoal">{c.name}</td>
                    <td className="py-2.5 px-3 text-muted-gray">{c.phone}</td>
                    <td className="py-2.5 px-3 text-muted-gray">{c.quartier || '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => navigate(`/clients/${c.id}`)}
                        className="text-xs font-semibold text-sage hover:underline cursor-pointer"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prospected Clients Invoices & Receipts for Marketer */}
      {isMarketer && (
        <div className="mt-6 bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#6D28D9]" />
              <h3 className="text-base font-bold text-charcoal">
                Prospected Clients Invoices ({myProspectedInvoices.length})
              </h3>
            </div>
            <span className="text-xs text-muted-gray">
              Invoices & payments collected from your referrals
            </span>
          </div>

          {myProspectedInvoices.length === 0 ? (
            <div className="text-center py-6 text-muted-gray text-xs sm:text-sm bg-soft-cream/30 rounded-[10px] border border-border/50">
              No paid invoices for your prospected clients yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Total Paid</th>
                    <th className="py-2.5 px-3">Your Commission</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myProspectedInvoices.map((inv) => {
                    const grossTotal = Number(inv.total || 0);
                    const netPaid = getInvoiceNetPaid(inv);
                    const discountAmt = Number(inv.discount || 0) || Math.max(0, grossTotal - netPaid);
                    const isFixedRule = sCommissionRate <= 0 && commissionFixedAmount != null && Number(commissionFixedAmount) > 0;
                    const commRate = sCommissionRate > 0 ? sCommissionRate : 10;
                    const commAmt = isFixedRule
                      ? Number(commissionFixedAmount)
                      : Math.round(netPaid * (commRate / 100));
                    const hasDiscount = discountAmt > 0 && grossTotal > netPaid;

                    return (
                      <tr key={inv.id} className="border-b border-border/30 last:border-b-0 hover:bg-soft-cream/20">
                        <td className="py-2.5 px-3 font-mono font-bold text-charcoal">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 font-semibold text-charcoal">{inv.clientName}</td>
                        <td className="py-2.5 px-3 text-muted-gray">{inv.date}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-charcoal">
                            {netPaid.toLocaleString()} FCFA
                          </div>
                          {hasDiscount && (
                            <div className="text-[10px] text-muted-gray flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="line-through text-slate-400">{grossTotal.toLocaleString()} FCFA</span>
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                -{discountAmt.toLocaleString()} FCFA (10% discount)
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#6D28D9]">
                          +{commAmt.toLocaleString()} FCFA
                          <div className="text-[10px] text-muted-gray font-normal">
                            {isFixedRule ? '(Fixed amount rule)' : `(${commRate}% on ${netPaid.toLocaleString()} FCFA)`}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check size={10} /> Paid
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Disciplinary Infractions & Penalties Section (Feature 4) */}
      <div className="mt-6 bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border mb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">
                Disciplinary Infractions & Penalties
              </h3>
              <p className="text-xs text-muted-gray">
                Transparent conduct record for {effectiveName}
              </p>
            </div>
          </div>

          {isManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPenaltyModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <AlertTriangle size={14} />
              Record Infraction
            </Button>
          )}
        </div>

        {/* Summary KPI Badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="bg-rose-50/50 border border-rose-100 rounded-[12px] p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-rose-600" />
              <div>
                <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                  Total Recorded Penalties
                </span>
                <span className="text-xs text-rose-600 font-medium">
                  {penalties.length} infraction{penalties.length === 1 ? '' : 's'} logged
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-bold text-rose-700 font-mono">
                {totalPenalties.toLocaleString('en-US')} FCFA
              </span>
            </div>
          </div>

          <div className="bg-soft-cream/40 border border-border rounded-[12px] p-3.5 flex items-center text-xs text-muted-gray leading-relaxed">
            <span>
              <strong>Policy Notice:</strong> Recorded penalties are automatically deducted from the Projected Monthly Payout to maintain real-time net payroll accuracy.
            </span>
          </div>
        </div>

        {/* History Table */}
        {penaltiesLoading ? (
          <div className="text-center py-6 text-muted-gray text-xs sm:text-sm">
            Loading disciplinary records...
          </div>
        ) : penalties.length === 0 ? (
          <div className="text-center py-6 text-muted-gray text-xs sm:text-sm bg-soft-cream/30 rounded-[10px] border border-border/50">
            Zero disciplinary infractions recorded for this staff member. Excellent conduct record!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Conduct Rule</th>
                  <th className="py-2.5 px-3">Notes / Context</th>
                  <th className="py-2.5 px-3 text-right">Penalty Amount</th>
                  {isManager && <th className="py-2.5 px-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {penalties.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 last:border-b-0 hover:bg-rose-50/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-charcoal font-medium">{p.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-charcoal flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                      {p.ruleName}
                    </td>
                    <td className="py-2.5 px-3 text-muted-gray max-w-xs truncate" title={p.notes || ''}>
                      {p.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700 font-mono">
                      {Number(p.penaltyAmount).toLocaleString('en-US')} FCFA
                    </td>
                    {isManager && (
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeletePenalty(p.id)}
                          title="Void / Delete Penalty Record"
                          className="p-1.5 rounded-[8px] text-muted-gray hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}

      {/* Record Penalty Modal */}
      {showPenaltyModal && (
        <RecordPenaltyModal
          isOpen={showPenaltyModal}
          onClose={() => setShowPenaltyModal(false)}
          onSuccess={() => {
            fetchPenalties();
            fetchSalarySummary();
          }}
          defaultStaffId={currentTech?.id}
          staffList={allUsers.filter((u) => u.active !== false)}
        />
      )}

      {/* Edit Salary Contract Modal */}
      {showContractModal && (
        <EditSalaryContractModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          onSuccess={() => {
            setShowContractModal(false);
            fetchSalarySummary();
          }}
          staff={currentTech}
        />
      )}

      {/* ── End-of-Day Service Stock Live Photo Audit Card ── */}
      <div className="bg-white border border-border rounded-[18px] p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage/15 text-sage flex items-center justify-center font-bold">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                <span>End-of-Day Service Stock Live Photo Audits</span>
                {todayTechAudits.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {todayTechAudits.length} photo{todayTechAudits.length !== 1 ? 's' : ''} logged today
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-gray">
                Take live photos of remaining products with remarks so Manager & Reception can verify stock levels.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => setShowStockPhotoModal(true)}
            className="h-10 px-4 text-xs font-bold flex items-center justify-center gap-1.5 bg-sage hover:bg-sage/90 text-white cursor-pointer shrink-0"
          >
            <Camera size={14} />
            <span>+ Take Live Stock Photo</span>
          </Button>
        </div>

        {/* Gallery / List of photos submitted today for this technician */}
        {todayTechAudits.length === 0 ? (
          <div className="p-6 bg-soft-cream/40 rounded-2xl border border-dashed border-border text-center space-y-2">
            <p className="text-xs font-semibold text-charcoal">
              No stock photo audits logged yet for {isTechnicianRole ? 'you' : currentTech?.name || 'this technician'} today.
            </p>
            <p className="text-[11px] text-muted-gray max-w-md mx-auto">
              Before leaving at the end of the day, please take a live picture of any opened massage oils, lotions, polishes, or supplies with written remarks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {todayTechAudits.map((audit) => (
              <div
                key={audit.id}
                onClick={() => setSelectedStockAudit(audit)}
                className="p-3 bg-soft-cream/30 hover:bg-soft-cream/60 rounded-xl border border-border flex items-center gap-3 cursor-pointer transition-colors group"
              >
                <div className="w-16 h-16 rounded-lg bg-charcoal overflow-hidden shrink-0 border border-border">
                  <img
                    src={audit.photoUrl}
                    alt={audit.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="font-bold text-xs text-charcoal truncate">
                      {audit.productName}
                    </h5>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        audit.status === 'REVIEWED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : audit.status === 'FLAGGED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {audit.status}
                    </span>
                  </div>
                  {audit.remarks && (
                    <p className="text-[11px] text-muted-gray truncate italic">
                      "{audit.remarks}"
                    </p>
                  )}
                  <p className="text-[10px] text-sage font-semibold">
                    {audit.estimatedRemaining ? `~${audit.estimatedRemaining} left` : 'Tap to view proof'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Stock Photo Modal */}
      {showStockPhotoModal && (
        <RecordStockPhotoModal
          isOpen={showStockPhotoModal}
          onClose={() => setShowStockPhotoModal(false)}
          onSuccess={() => {
            refreshDailyAudits();
          }}
        />
      )}

      {/* Stock Photo Detail Modal */}
      {selectedStockAudit && (
        <StockPhotoDetailModal
          isOpen={!!selectedStockAudit}
          audit={selectedStockAudit}
          onClose={() => setSelectedStockAudit(null)}
          onReviewed={() => {
            refreshDailyAudits();
          }}
        />
      )}
    </div>
  );
}
