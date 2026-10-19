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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import RecordPenaltyModal from '../components/RecordPenaltyModal';
import EditSalaryContractModal from '../components/EditSalaryContractModal';
import { useOperations } from '../context/OperationsContext';
import { useAuth, isMarketerUser } from '../context/AuthContext';
import { useClients } from '../context/ClientsContext';
import { useCommission } from '../context/CommissionContext';
import { reportsApi, penaltiesApi, commissionsApi } from '../services/api';

export default function TechnicianDailySummary() {
  const navigate = useNavigate();
  const { user, allUsers } = useAuth();
  const { completedServices, techRevenue } = useOperations();
  const { clients } = useClients();
  const { getEmployeeCommissionSummary } = useCommission();

  const role = (user?.role || '').toLowerCase();
  const isTechnicianRole = role === 'technician';
  const isReception = role === 'reception';
  const isCleaner = role === 'cleaner';
  const isMarketer = isMarketerUser(user);

  const dynamicTechnicians = allUsers.filter(
    (u) => u.role === 'technician' && u.active !== false
  );

  const initialName = (isTechnicianRole || isMarketer)
    ? user?.name || 'Staff'
    : dynamicTechnicians[0]?.name || 'Amina';
  const [selectedTechName, setSelectedTechName] = useState(initialName);

  // If technician or marketer, lock to their own name
  const effectiveName = (isTechnicianRole || isMarketer)
    ? user?.name || 'Staff'
    : selectedTechName;

  const currentTech = (isTechnicianRole || isMarketer)
    ? (user || { id: user?.id || 1, name: user?.name || 'Staff', specialties: [] })
    : (dynamicTechnicians.find((t) => t.name === effectiveName) ||
       dynamicTechnicians[0] || { id: 1, name: 'Technician', specialties: [] });

  const isManager = role === 'manager';

  // Live Backend Performance State
  const [techReport, setTechReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Target-Based Salary & Commission State (Phase 4)
  const [salarySummary, setSalarySummary] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

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
      const targetId = (isTechnicianRole || isMarketer) ? user?.id : currentTech?.id;
      if (!targetId) return;
      const res = await penaltiesApi.getPenalties({ staffId: String(targetId) });
      if (res?.data) {
        setPenalties(res.data.penalties || []);
        setTotalPenalties(res.data.totalPenalties || 0);
      }
    } catch (err) {
      console.warn('Could not fetch staff penalties:', err.message);
    } finally {
      setPenaltiesLoading(false);
    }
  }, [isCleaner, isTechnicianRole, isMarketer, user?.id, currentTech?.id]);

  const fetchSalarySummary = useCallback(async () => {
    if (isCleaner) return;
    const targetId = (isTechnicianRole || isMarketer) ? user?.id : currentTech?.id;
    if (!targetId) return;
    setSalaryLoading(true);
    try {
      const res = await commissionsApi.getSalarySummary({ technicianId: String(targetId) });
      if (res?.data) {
        setSalarySummary(res.data);
      }
    } catch (err) {
      console.warn('Salary summary fetch error:', err.message);
    } finally {
      setSalaryLoading(false);
    }
  }, [isCleaner, isTechnicianRole, isMarketer, user?.id, currentTech?.id]);

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
  const commissionEarned = techReport?.commissionEarned ?? commSummary.commissionEarned;
  const averageTicket = techReport?.averageTicket ?? (servicesToday > 0 ? Math.round(serviceProductivity / servicesToday) : 0);

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Derive referred clients list for this technician or marketer
  const myReferredClients = clients.filter(
    (c) =>
      (c.introducedById && (String(c.introducedById) === String(currentTech?.id) || ((isTechnicianRole || isMarketer) && String(c.introducedById) === String(user?.id)))) ||
      (c.introducedBy && (c.introducedBy.toLowerCase().trim() === effectiveName.toLowerCase().trim() || ((isTechnicianRole || isMarketer) && c.introducedBy.toLowerCase().trim() === (user?.name || '').toLowerCase().trim())))
  );

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

  // Active Mode: Mode B (Target Met) vs Mode A (Below Target)
  const sIsModeB =
    sIsTargetMet ||
    sCalc.activeMode === 'BASE_PLUS_COMMISSION' ||
    sCalc.mode === 'MODE_B_TARGET_MET';

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

  const sUnearnedLocked = Number(
    sCalc.unearnedCommissionLocked ?? (!sIsModeB ? sNetCommission : 0)
  ) || 0;

  const sTotalPenalties = Number(
    sCalc.totalPenalties ?? totalPenalties ?? sReferralDeductions ?? 0
  ) || 0;

  const sEffectivePayout = Number(
    sCalc.currentProjectedPayout ??
    sCalc.effectivePayout ??
    sCalc.calculatedPayout ??
    (sIsModeB ? Math.max(sFixedSalary, sBasePay + sNetCommission) : sFixedSalary)
  ) || 0;

  const sFloorProtectionApplied = Boolean(
    sCalc.floorProtectionApplied ||
    (sIsModeB && sEffectivePayout === sFixedSalary && (sBasePay + sNetCommission) < sFixedSalary)
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
      />

      {/* Technician Selector Tabs — only visible to Manager */}
      {!isTechnicianRole && !isMarketer && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1.5 scrollbar-none">
          {dynamicTechnicians.map((tech) => (
            <button
              key={tech.id}
              onClick={() => setSelectedTechName(tech.name)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-[12px] text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer flex items-center gap-2 border whitespace-nowrap shrink-0 ${
                selectedTechName === tech.name
                  ? 'bg-sage text-charcoal font-semibold border-sage shadow-sm'
                  : 'bg-white text-muted-gray border-border hover:bg-soft-cream hover:text-charcoal'
              }`}
            >
              <User size={15} />
              {tech.name} — {(tech.specialties || []).join(', ') || 'Technician'}
            </button>
          ))}
        </div>
      )}

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
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {salarySummary.period || 'Current Month'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
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
                    <span>Mode A · Guaranteed Fixed Salary</span>
                  </div>
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
                    {sMtdSales.toLocaleString()}
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
                    {sProgressPercent}%
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
                    width: `${Math.min(100, Math.max(3, sProgressPercent))}%`,
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
                      : `${sRemainingToTarget.toLocaleString()} FCFA remaining`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
                <DollarSign size={16} className="text-slate-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Contract Terms</div>
                  <div className="text-slate-200 font-bold">
                    {sCommissionRate}% comm · {sFixedSalary.toLocaleString()} floor
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40">
                <Award size={16} className="text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Projected Payout</div>
                  <div className="text-emerald-300 font-bold text-sm">
                    {sEffectivePayout.toLocaleString()} FCFA
                  </div>
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
              {isMarketer ? user?.name || currentTech.name : currentTech.name}
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
                {commSummary.completedServices}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-gray flex items-center gap-2">
                <Award size={16} className="text-[#6D28D9]" />
                Referral Commission Rate
              </span>
              <span className="text-sm font-semibold text-charcoal font-mono">
                10% per completed service
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
          {salarySummary ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-gray">
                {!sIsModeB ? 'Guaranteed Fixed Salary' : 'Base Salary'}
              </span>
              <span className="font-semibold text-charcoal">
                {!sIsModeB
                  ? `${sFixedSalary.toLocaleString()} FCFA`
                  : `${sBasePay.toLocaleString()} FCFA`}
              </span>
            </div>
          ) : !isMarketer ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-gray">Base Salary</span>
              <span className="text-muted-gray font-mono text-xs bg-soft-cream px-2 py-1 rounded-[6px] border border-border">
                [Calculated]
              </span>
            </div>
          ) : null}

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
                  Locked until monthly target ({sMonthlyTarget.toLocaleString()} FCFA) is achieved. Guaranteed flat salary of {sFixedSalary.toLocaleString()} FCFA applies.
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
                <span
                  className={`font-extrabold px-2.5 py-1 rounded-[6px] text-xs ${
                    isMarketer
                      ? 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]'
                      : 'bg-sage-soft text-[#4F6748] border border-sage/20'
                  }`}
                >
                  {(commissionEarned || 0).toLocaleString('en-US')} FCFA
                </span>
              )}
            </div>
          )}

          {/* Penalties Deduction Row if any */}
          {salarySummary && sTotalPenalties > 0 && (
            <div className="flex items-center justify-between text-sm text-rose-700">
              <span className="font-medium flex items-center gap-1.5">
                <ShieldAlert size={14} /> Disciplinary Deductions
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
              {salarySummary && (
                <span className="text-[11px] text-muted-gray">
                  {sFloorProtectionApplied
                    ? `Protected by guaranteed minimum floor (${sFixedSalary.toLocaleString()} FCFA)`
                    : !sIsModeB
                    ? `Guaranteed Flat Baseline (Target not yet met)`
                    : `Base + Unlocked Net Commission`}
                </span>
              )}
            </div>
          </div>
          <div className="text-left sm:text-right">
            {salarySummary ? (
              <span className="text-lg font-black text-charcoal">
                {sEffectivePayout.toLocaleString()} FCFA
              </span>
            ) : (
              <span className="font-mono text-xs text-charcoal bg-white/80 px-2.5 py-1 rounded-[6px] border border-sage/30">
                [Calculated]
              </span>
            )}
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
              <strong>Policy Notice:</strong> Recorded penalties provide an audit trail for management review during manual payroll settlement. Raw service commissions are calculated independently.
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
    </div>
  );
}
