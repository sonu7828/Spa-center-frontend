/**
 * Referrals — Screen 14 + Employee Referral Commission Management
 *
 * Role-Based Access:
 *   - MANAGER:
 *       1. Referral Commission Rule (Settings: 5%, 10%, 15% quick selection)
 *       2. Employee Referral Performance (Report per staff: Clients Referred, Completed Services, Commission Earned)
 *       3. Commission History with Management Actions (Approve, Add Bonus, Adjust)
 *       4. Customer Referral tracking (Top Referrer This Month, Recent Referrals, -15% benefit)
 *   - RECEPTION:
 *       - View-only access to Employee Referral Performance and Commission History
 *       - Customer Referral tracking
 *       - Strictly no bonus, adjust, approve, or rule changes
 *   - TECHNICIAN:
 *       - View-only access to own performance and own commission ledger
 *       - Strictly prohibited from viewing other technicians' earnings
 *   - CLEANER:
 *       - No commission access
 *
 * Source: WIREFRAME.md Screen 14 + Referral Commission Spec §1, §6, §7, §9
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  DollarSign,
  Settings,
  Sparkles,
  UserCheck,
  Check,
  Filter,
  X,
  Sliders,
  ShieldAlert,
  Percent,
  Coins,
  Save,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useCommission } from '../context/CommissionContext';

export default function Referrals() {
  const { user } = useAuth();
  const {
    commissionRate,
    commissionFixedAmount,
    commissionRuleMode,
    setCommissionRate,
    setCommissionRule,
    commissions,
    summary,
    isLoading,
    addBonus,
    adjustCommission,
    approveCommission,
    getAllEmployeeSummaries,
    getCommissionHistory,
  } = useCommission();

  const role = user?.role?.toLowerCase() || '';
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const isTechnician = role === 'technician';
  const isCleaner = role === 'cleaner';

  // Tabs

  // Manager feedback toast
  const [notice, setNotice] = useState('');

  // History filter by employee (for Manager & Reception)
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all');

  // Modals for Manager Actions
  const [modalType, setModalType] = useState(null); // 'bonus' | 'adjust' | null
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [adjustRate, setAdjustRate] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [modalError, setModalError] = useState('');

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  // Manager Referral Rule state (Percentage or Fixed Amount)
  const [ruleMode, setRuleMode] = useState(
    commissionRuleMode || (commissionFixedAmount ? 'fixed' : 'percentage')
  );
  const [customPercentInput, setCustomPercentInput] = useState(
    commissionRate ? String(commissionRate) : '10'
  );
  const [customAmountInput, setCustomAmountInput] = useState(
    commissionFixedAmount ? String(commissionFixedAmount) : '2000'
  );
  const [isSavingRule, setIsSavingRule] = useState(false);

  useEffect(() => {
    if (commissionRuleMode) setRuleMode(commissionRuleMode);
    if (commissionRate) setCustomPercentInput(String(commissionRate));
    if (commissionFixedAmount) setCustomAmountInput(String(commissionFixedAmount));
  }, [commissionRuleMode, commissionRate, commissionFixedAmount]);

  // Cleaner access blocked
  if (isCleaner) {
    return (
      <div className="p-8 text-center bg-white border border-border rounded-[16px] shadow-card space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-charcoal">Access Restricted</h2>
        <p className="text-xs text-muted-gray">
          Cleaning staff do not have access to financial referral and commission records.
        </p>
      </div>
    );
  }

  // Commission data
  const employeeSummaries = isTechnician
    ? []
    : getAllEmployeeSummaries();

  const allCommissionHistory = getCommissionHistory();

  // Search, Status Filter & Pagination state for Commission History
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'APPROVED' | 'PENDING'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to first page whenever search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStaffFilter, statusFilter, pageSize]);

  // Filtered list with staff, status, and full text search
  const filteredCommissionHistory = useMemo(() => {
    let list = allCommissionHistory;

    // Staff filter (for manager / reception)
    if (!isTechnician && selectedStaffFilter !== 'all') {
      const staffLow = selectedStaffFilter.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.referralEmployee?.toLowerCase().trim() === staffLow ||
          c.performingTechnician?.toLowerCase().trim() === staffLow
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(
        (c) =>
          c.rawStatus === statusFilter ||
          c.status?.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.performingTechnician && c.performingTechnician.toLowerCase().includes(q)) ||
          (c.referralEmployee && c.referralEmployee.toLowerCase().includes(q)) ||
          (c.service && c.service.toLowerCase().includes(q)) ||
          (c.serviceCategory && c.serviceCategory.toLowerCase().includes(q)) ||
          (c.client && c.client.toLowerCase().includes(q)) ||
          (c.date && c.date.toLowerCase().includes(q)) ||
          (c.status && c.status.toLowerCase().includes(q)) ||
          (c.invoiceNumber && c.invoiceNumber.toLowerCase().includes(q)) ||
          String(c.serviceAmount || '').includes(q) ||
          String(c.commissionAmount || '').includes(q)
      );
    }

    return list;
  }, [allCommissionHistory, isTechnician, selectedStaffFilter, statusFilter, searchQuery]);

  // Pagination metrics
  const totalRecords = filteredCommissionHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCommissionHistory = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredCommissionHistory.slice(startIdx, startIdx + pageSize);
  }, [filteredCommissionHistory, safeCurrentPage, pageSize]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const totalCommissionPaid = summary?.totalEarned || allCommissionHistory.reduce(
    (sum, c) => sum + (c.commissionAmount || 0),
    0
  );

  // Manager Rule Updates (Percentage or Fixed Amount)
  const handleApplyPercentage = async (rateVal) => {
    if (!isManager) return;
    setIsSavingRule(true);
    try {
      const num = Number(rateVal);
      if (isNaN(num) || num < 0) {
        throw new Error('Please enter a valid percentage between 0 and 100');
      }
      const parsed = Math.min(100, Math.max(0, num));
      setCustomPercentInput(String(parsed));
      setRuleMode('percentage');
      await setCommissionRule({
        mode: 'percentage',
        percentage: parsed,
      });
      showToast(`Referral Commission Rule updated to ${parsed}%.`);
    } catch (err) {
      showToast(err?.message || 'Failed to update commission percentage');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleApplyFixedAmount = async (amountVal) => {
    if (!isManager) return;
    setIsSavingRule(true);
    try {
      const num = Number(amountVal);
      if (isNaN(num) || num < 0) {
        throw new Error('Please enter a valid fixed amount');
      }
      const parsed = Math.max(0, Math.round(num));
      setCustomAmountInput(String(parsed));
      setRuleMode('fixed');
      await setCommissionRule({
        mode: 'fixed',
        fixedAmount: parsed,
      });
      showToast(`Referral Commission Rule updated to ${parsed.toLocaleString()} FCFA (Fixed).`);
    } catch (err) {
      showToast(err?.message || 'Failed to update fixed commission');
    } finally {
      setIsSavingRule(false);
    }
  };

  // Backward compatibility alias
  const handleUpdatePercentage = handleApplyPercentage;

  // Manager Approve Action
  const handleApprove = async (commId) => {
    if (!isManager) return;
    const res = await approveCommission(commId);
    if (res.success) {
      showToast('Commission approved successfully.');
    } else {
      showToast(res.error || 'Failed to approve commission');
    }
  };

  // Manager Add Bonus Submit
  const handleBonusSubmit = async (e) => {
    e?.preventDefault();
    setModalError('');
    const amt = Number(bonusAmount);
    if (isNaN(amt) || amt <= 0) {
      setModalError('Please enter a valid bonus amount greater than 0.');
      return;
    }
    const res = await addBonus(selectedCommission.id, amt, bonusReason);
    if (res.success) {
      setModalType(null);
      setBonusAmount('');
      setBonusReason('');
      showToast(`+${amt.toLocaleString('en-US')} FCFA bonus awarded!`);
    } else {
      setModalError(res.error || 'Failed to award bonus');
    }
  };

  // Manager Adjust Submit
  const handleAdjustSubmit = async (e) => {
    e?.preventDefault();
    setModalError('');
    if (!adjustReason || adjustReason.trim().length < 3) {
      setModalError('A reason with at least 3 characters is required.');
      return;
    }

    const payload = { reason: adjustReason };
    if (adjustRate) {
      const r = Number(adjustRate);
      if (isNaN(r) || r <= 0) {
        setModalError('Please enter a valid commission rate.');
        return;
      }
      payload.adjustedRate = r;
    } else if (adjustAmount) {
      const a = Number(adjustAmount);
      if (isNaN(a) || a < 0) {
        setModalError('Please enter a valid commission amount.');
        return;
      }
      payload.adjustedAmount = a;
    } else {
      setModalError('Please enter an adjusted rate or adjusted amount.');
      return;
    }

    const res = await adjustCommission(selectedCommission.id, payload);
    if (res.success) {
      setModalType(null);
      setAdjustRate('');
      setAdjustAmount('');
      setAdjustReason('');
      showToast('Commission adjusted successfully.');
    } else {
      setModalError(res.error || 'Failed to adjust commission');
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={
          isManager
            ? 'Employee Referrals & Commissions'
            : isTechnician
            ? 'My Commissions'
            : 'Employee Commissions'
        }
        subtitle={
          isManager
            ? 'Employee referral commission rules, staff performance reports, and payout ledger.'
            : isTechnician
            ? 'Your personal referral and service commission history.'
            : 'Employee referral performance and commission visibility.'
        }
      />

      {/* Notice Toast */}
      {notice && (
        <div className="p-3 bg-success-soft border border-success/30 text-[#4F6748] rounded-[12px] text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 size={16} className="text-success shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1A: TECHNICIAN PERSONAL COMMISSION VIEW
         ========================================================================= */}
      {isTechnician && (
        <div className="space-y-6 animate-fade-in">
          {/* Technician Personal Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white border border-border rounded-[14px] p-4 shadow-card">
              <span className="text-[10px] uppercase font-bold text-muted-gray block">
                Total Commission Earned
              </span>
              <span className="text-xl font-black text-[#4F6748] block mt-1">
                {(summary?.totalEarned || totalCommissionPaid).toLocaleString('en-US')} FCFA
              </span>
            </div>
            <div className="bg-white border border-border rounded-[14px] p-4 shadow-card">
              <span className="text-[10px] uppercase font-bold text-muted-gray block">
                Approved / Paid
              </span>
              <span className="text-xl font-black text-charcoal block mt-1">
                {(summary?.totalApproved || 0).toLocaleString('en-US')} FCFA
              </span>
            </div>
            <div className="bg-white border border-border rounded-[14px] p-4 shadow-card">
              <span className="text-[10px] uppercase font-bold text-muted-gray block">
                Pending Approval
              </span>
              <span className="text-xl font-black text-warning block mt-1">
                {(summary?.totalPending || 0).toLocaleString('en-US')} FCFA
              </span>
            </div>
          </div>

          {/* Own Commission History Ledger */}
          <section className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card">
            <h3 className="text-sm sm:text-base font-bold text-charcoal mb-4">
              My Commission History
            </h3>

            {filteredCommissionHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-gray bg-warm-ivory/50 rounded-[12px] border border-border/50">
                {isLoading ? 'Loading commissions...' : 'No commissions recorded yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-soft-cream/60 text-muted-gray uppercase font-semibold text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Service</th>
                      <th className="py-2.5 px-3 text-right">Service Price</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Commission</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredCommissionHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-warm-ivory/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-muted-gray whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-3 px-3 font-bold text-charcoal whitespace-nowrap">
                          {item.service}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-charcoal whitespace-nowrap">
                          {item.serviceAmount.toLocaleString('en-US')} FCFA
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-muted-gray whitespace-nowrap">
                          {item.commissionPercentage}%
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#4F6748] whitespace-nowrap">
                          {item.commissionAmount.toLocaleString('en-US')} FCFA
                          {item.bonusAmount > 0 && (
                            <span className="block text-[10px] text-emerald-600 font-normal">
                              +{item.bonusAmount.toLocaleString('en-US')} bonus
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] font-bold text-[10px] border ${
                              item.rawStatus === 'APPROVED' || item.rawStatus === 'PAID'
                                ? 'bg-success-soft text-success border-success/20'
                                : 'bg-warning-soft text-warning border-warning/20'
                            }`}
                          >
                            <Check size={10} strokeWidth={2.5} />
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* =========================================================================
          TAB 1B: EMPLOYEE REFERRAL COMMISSION (MANAGER & RECEPTION)
         ========================================================================= */}
      {!isTechnician && (
        <div className="space-y-6 animate-fade-in">
          {/* ── Section 1: Referral Commission Rule (Manager Settings) ── */}
          {isManager && (
            <section className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-sage-soft border border-sage/30 flex items-center justify-center text-sage shrink-0">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-charcoal">
                      Referral Commission Rule
                    </h2>
                    <p className="text-xs text-muted-gray">
                      Configure how employees are rewarded when referred clients pay for services.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-warm-ivory px-3.5 py-2 rounded-[12px] border border-border/80 self-start sm:self-auto shadow-2xs">
                  <span className="text-xs text-muted-gray font-medium">Default Rule:</span>
                  <span className="text-sm sm:text-base font-extrabold text-[#4F6748] font-mono flex items-center gap-1">
                    {ruleMode === 'fixed' && commissionFixedAmount
                      ? `${Number(commissionFixedAmount).toLocaleString()} FCFA (Fixed)`
                      : `${commissionRate || 10}%`}
                  </span>
                </div>
              </div>

              {/* Mode Toggle & Custom Setup */}
              <div className="mt-5 space-y-4">
                {/* 1. Choose Calculation Type */}
                <div>
                  <span className="text-xs font-semibold text-charcoal block mb-2">
                    Commission Reward Mode
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <button
                      type="button"
                      onClick={() => setRuleMode('percentage')}
                      className={`p-3 rounded-[12px] border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        ruleMode === 'percentage'
                          ? 'bg-sage-soft/70 border-sage text-charcoal shadow-xs'
                          : 'bg-white hover:bg-soft-cream/50 border-border text-muted-gray'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-[8px] shrink-0 ${
                          ruleMode === 'percentage'
                            ? 'bg-sage text-white'
                            : 'bg-soft-cream text-charcoal'
                        }`}
                      >
                        <Percent size={18} />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-charcoal flex items-center gap-1.5">
                          Percentage Commission (%)
                          {ruleMode === 'percentage' && (
                            <CheckCircle2 size={14} className="text-sage" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-gray mt-0.5">
                          Calculated as a % share of the client's paid invoice total.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRuleMode('fixed')}
                      className={`p-3 rounded-[12px] border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        ruleMode === 'fixed'
                          ? 'bg-sage-soft/70 border-sage text-charcoal shadow-xs'
                          : 'bg-white hover:bg-soft-cream/50 border-border text-muted-gray'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-[8px] shrink-0 ${
                          ruleMode === 'fixed'
                            ? 'bg-sage text-white'
                            : 'bg-soft-cream text-charcoal'
                        }`}
                      >
                        <Coins size={18} />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-charcoal flex items-center gap-1.5">
                          Fixed Amount (FCFA)
                          {ruleMode === 'fixed' && (
                            <CheckCircle2 size={14} className="text-sage" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-gray mt-0.5">
                          A guaranteed flat cash reward per referred client invoice.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Parameters for Percentage Mode */}
                {ruleMode === 'percentage' ? (
                  <div className="pt-3 border-t border-border/60">
                    <label className="text-xs font-semibold text-charcoal block mb-2">
                      Commission Percentage (%)
                    </label>

                    {/* Custom input box */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleApplyPercentage(customPercentInput);
                      }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md"
                    >
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={customPercentInput}
                          onChange={(e) => setCustomPercentInput(e.target.value)}
                          placeholder="e.g. 3, 7.5, 10"
                          className="w-full px-3.5 py-2.5 pr-8 rounded-[10px] border border-border text-sm font-semibold text-charcoal focus:outline-none focus:border-sage bg-warm-ivory/30"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-gray">
                          %
                        </span>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSavingRule || customPercentInput === ''}
                        className="flex items-center justify-center gap-1.5 whitespace-nowrap py-2.5 px-4 rounded-[10px] text-xs font-bold cursor-pointer"
                      >
                        {isSavingRule ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>Save Percentage</span>
                      </Button>
                    </form>

                    <p className="text-[11px] text-muted-gray mt-2">
                      Calculated automatically on invoice payment. Performing technician productivity remains 100% untouched.
                    </p>
                  </div>
                ) : (
                  /* 3. Parameters for Fixed Amount Mode */
                  <div className="pt-3 border-t border-border/60">
                    <label className="text-xs font-semibold text-charcoal block mb-2">
                      Fixed Commission Reward Amount (FCFA)
                    </label>

                    {/* Custom input box */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleApplyFixedAmount(customAmountInput);
                      }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md"
                    >
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={customAmountInput}
                          onChange={(e) => setCustomAmountInput(e.target.value)}
                          placeholder="e.g. 1500, 2000, 3000"
                          className="w-full px-3.5 py-2.5 pr-14 rounded-[10px] border border-border text-sm font-semibold text-charcoal focus:outline-none focus:border-sage bg-warm-ivory/30"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-gray">
                          FCFA
                        </span>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSavingRule || customAmountInput === ''}
                        className="flex items-center justify-center gap-1.5 whitespace-nowrap py-2.5 px-4 rounded-[10px] text-xs font-bold cursor-pointer"
                      >
                        {isSavingRule ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>Save Fixed Amount</span>
                      </Button>
                    </form>

                    <p className="text-[11px] text-muted-gray mt-2">
                      Awarded as a flat cash commission per paid invoice of clients introduced by this employee, regardless of invoice total.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Section 2: Employee Referral Performance Report ── */}
          <section className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-charcoal flex items-center gap-2">
                  <TrendingUp size={18} className="text-sage" />
                  Employee Commission Performance
                </h3>
                <p className="text-xs text-muted-gray">
                  Overview of services completed and total commission earned per staff member.
                </p>
              </div>

              <div className="text-xs text-muted-gray bg-soft-cream px-3 py-1 rounded-[8px] border border-border self-start sm:self-auto">
                Total Commission:{' '}
                <strong className="text-charcoal font-bold">
                  {totalCommissionPaid.toLocaleString('en-US')} FCFA
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {employeeSummaries.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-warm-ivory border border-border/80 rounded-[14px] p-4 shadow-2xs hover:border-sage/40 transition-colors"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div>
                      <h4 className="text-sm font-bold text-charcoal">{emp.name}</h4>
                      <p className="text-[11px] text-muted-gray">{emp.role}</p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-sage-soft border border-sage/20 flex items-center justify-center text-[#4F6748] font-bold text-xs">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-[10px] border border-border/50">
                      <span className="text-[10px] uppercase font-bold text-muted-gray block">
                        Clients Referred
                      </span>
                      <span className="text-lg font-extrabold text-charcoal block mt-0.5">
                        {emp.clientsReferred}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-[10px] border border-border/50">
                      <span className="text-[10px] uppercase font-bold text-muted-gray block">
                        Services Paid
                      </span>
                      <span className="text-lg font-extrabold text-charcoal block mt-0.5">
                        {emp.completedServices}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-gray">Commission Earned:</span>
                    <span className="text-sm font-black text-[#4F6748]">
                      {emp.commissionEarned.toLocaleString('en-US')} FCFA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 3: Commission History & Audit Ledger ── */}
          <section className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-charcoal">
                    Commission History
                  </h3>
                  <span className="text-[11px] font-bold text-[#4F6748] bg-sage-soft px-2.5 py-0.5 rounded-full">
                    {totalRecords} {totalRecords === 1 ? 'record' : 'records'}
                  </span>
                </div>
                <p className="text-xs text-muted-gray mt-0.5">
                  Ledger of paid services, commission amounts, bonuses, and approval status.
                </p>
              </div>

              {/* Search Bar + Filters Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative min-w-[200px] sm:min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search technician, service, date..."
                    className="w-full pl-9 pr-7 py-1.5 text-xs rounded-[8px] bg-soft-cream border border-border text-charcoal placeholder-muted-gray focus:outline-none focus:border-sage transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal cursor-pointer p-0.5"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Staff Filter (if manager/reception) */}
                {!isTechnician && (
                  <div className="flex items-center gap-1.5 bg-soft-cream border border-border rounded-[8px] px-2.5 py-1.5">
                    <Filter size={13} className="text-muted-gray shrink-0" />
                    <select
                      value={selectedStaffFilter}
                      onChange={(e) => setSelectedStaffFilter(e.target.value)}
                      className="text-xs font-medium bg-transparent text-charcoal cursor-pointer outline-none"
                    >
                      <option value="all">All Employees</option>
                      {employeeSummaries.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-soft-cream border border-border text-charcoal cursor-pointer outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                </select>

                {/* Page Size Selector */}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-soft-cream border border-border text-charcoal cursor-pointer outline-none"
                  title="Records per page"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>

            {filteredCommissionHistory.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-gray bg-warm-ivory/50 rounded-[12px] border border-border/50 flex flex-col items-center justify-center gap-2">
                <p>
                  {isLoading
                    ? 'Loading commission records...'
                    : searchQuery || statusFilter !== 'all' || selectedStaffFilter !== 'all'
                    ? 'No commission history matches your current search or filter.'
                    : 'No commission history recorded yet.'}
                </p>
                {(searchQuery || statusFilter !== 'all' || selectedStaffFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setSelectedStaffFilter('all');
                    }}
                    className="text-xs font-bold text-sage hover:underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-soft-cream/60 text-muted-gray uppercase font-semibold text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Technician</th>
                        <th className="py-2.5 px-3">Service</th>
                        <th className="py-2.5 px-3 text-right">Service Amount</th>
                        <th className="py-2.5 px-3 text-center">Rate</th>
                        <th className="py-2.5 px-3 text-right">Total Comm.</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        {isManager && <th className="py-2.5 px-3 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paginatedCommissionHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-warm-ivory/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-muted-gray whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold text-[#4F6748] bg-sage-soft px-2 py-0.5 rounded-[4px]">
                              {item.performingTechnician}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-charcoal whitespace-nowrap">
                            {item.service}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-charcoal whitespace-nowrap">
                            {item.serviceAmount.toLocaleString('en-US')} FCFA
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-muted-gray whitespace-nowrap">
                            {item.commissionPercentage}%
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#4F6748] whitespace-nowrap">
                            {item.commissionAmount.toLocaleString('en-US')} FCFA
                            {item.bonusAmount > 0 && (
                              <span className="block text-[10px] text-emerald-600 font-normal">
                                +{item.bonusAmount.toLocaleString('en-US')} bonus
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] font-bold text-[10px] border ${
                                item.rawStatus === 'APPROVED' || item.rawStatus === 'PAID'
                                  ? 'bg-success-soft text-success border-success/20'
                                  : 'bg-warning-soft text-warning border-warning/20'
                              }`}
                            >
                              <Check size={10} strokeWidth={2.5} />
                              {item.status}
                            </span>
                          </td>
                          {isManager && (
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {item.rawStatus === 'PENDING' && (
                                  <button
                                    onClick={() => handleApprove(item.id)}
                                    className="px-2 py-1 rounded-[6px] text-[10px] font-bold bg-success-soft text-success hover:bg-success hover:text-white border border-success/30 transition-all cursor-pointer"
                                    title="Approve Commission"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedCommission(item);
                                    setBonusAmount('');
                                    setBonusReason('');
                                    setModalError('');
                                    setModalType('bonus');
                                  }}
                                  className="px-2 py-1 rounded-[6px] text-[10px] font-bold bg-sage-soft text-[#4F6748] hover:bg-sage hover:text-white border border-sage/30 transition-all cursor-pointer"
                                  title="Add Bonus"
                                >
                                  + Bonus
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCommission(item);
                                    setAdjustRate(String(item.commissionPercentage));
                                    setAdjustAmount('');
                                    setAdjustReason('');
                                    setModalError('');
                                    setModalType('adjust');
                                  }}
                                  className="px-2 py-1 rounded-[6px] text-[10px] font-bold bg-soft-cream text-charcoal hover:bg-white border border-border transition-all cursor-pointer"
                                  title="Adjust Rate or Amount"
                                >
                                  Adjust
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls Footer */}
                <div className="mt-4 pt-3.5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  {/* Record range indicator */}
                  <span className="text-muted-gray">
                    Showing{' '}
                    <strong className="text-charcoal font-semibold">
                      {(safeCurrentPage - 1) * pageSize + 1}
                    </strong>{' '}
                    to{' '}
                    <strong className="text-charcoal font-semibold">
                      {Math.min(safeCurrentPage * pageSize, totalRecords)}
                    </strong>{' '}
                    of{' '}
                    <strong className="text-charcoal font-semibold">{totalRecords}</strong> records
                  </span>

                  {/* Page Navigation */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="px-2.5 py-1.5 rounded-[8px] border border-border text-xs font-semibold text-charcoal bg-soft-cream hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft size={14} />
                      <span>Prev</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((num, idx) =>
                        num === '...' ? (
                          <span key={`dots-${idx}`} className="px-2 text-muted-gray font-bold">
                            ...
                          </span>
                        ) : (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setCurrentPage(num)}
                            className={`w-7 h-7 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                              safeCurrentPage === num
                                ? 'bg-sage text-white shadow-xs'
                                : 'bg-soft-cream hover:bg-white text-charcoal border border-border'
                            }`}
                          >
                            {num}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="px-2.5 py-1.5 rounded-[8px] border border-border text-xs font-semibold text-charcoal bg-soft-cream hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}



      {/* =========================================================================
          MODAL 1: ADD BONUS (MANAGER ONLY)
         ========================================================================= */}
      {modalType === 'bonus' && selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white border border-border rounded-[16px] shadow-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                <Sparkles size={18} className="text-sage" />
                Award Performance Bonus
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-muted-gray hover:text-charcoal p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs bg-soft-cream/60 p-3 rounded-[10px] space-y-1">
              <div>
                <span className="text-muted-gray">Technician: </span>
                <strong className="text-charcoal">{selectedCommission.performingTechnician}</strong>
              </div>
              <div>
                <span className="text-muted-gray">Service: </span>
                <span className="text-charcoal">{selectedCommission.service}</span>
              </div>
              <div>
                <span className="text-muted-gray">Current Commission: </span>
                <strong className="text-[#4F6748]">
                  {selectedCommission.commissionAmount.toLocaleString('en-US')} FCFA
                </strong>
              </div>
            </div>

            {modalError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-[8px] border border-rose-200">
                {modalError}
              </p>
            )}

            <form onSubmit={handleBonusSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Bonus Amount (FCFA) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full h-10 px-3 rounded-[8px] bg-soft-cream border border-border text-charcoal outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Reason for Bonus (Optional)
                </label>
                <input
                  type="text"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder="e.g. Excellent client review"
                  className="w-full h-10 px-3 rounded-[8px] bg-soft-cream border border-border text-charcoal outline-none focus:border-sage"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalType(null)}>
                  Cancel
                </Button>
                <Button type="submit">Award Bonus</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADJUST COMMISSION (MANAGER ONLY)
         ========================================================================= */}
      {modalType === 'adjust' && selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white border border-border rounded-[16px] shadow-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                <Sliders size={18} className="text-sage" />
                Adjust Commission
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-muted-gray hover:text-charcoal p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs bg-soft-cream/60 p-3 rounded-[10px] space-y-1">
              <div>
                <span className="text-muted-gray">Technician: </span>
                <strong className="text-charcoal">{selectedCommission.performingTechnician}</strong>
              </div>
              <div>
                <span className="text-muted-gray">Service Price: </span>
                <span className="text-charcoal">
                  {selectedCommission.serviceAmount.toLocaleString('en-US')} FCFA
                </span>
              </div>
              <div>
                <span className="text-muted-gray">Current Base Commission: </span>
                <strong className="text-[#4F6748]">
                  {selectedCommission.baseCommission.toLocaleString('en-US')} FCFA (
                  {selectedCommission.commissionPercentage}%)
                </strong>
              </div>
            </div>

            {modalError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-[8px] border border-rose-200">
                {modalError}
              </p>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Adjusted Rate (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={adjustRate}
                  onChange={(e) => {
                    setAdjustRate(e.target.value);
                    setAdjustAmount('');
                  }}
                  placeholder="e.g. 15"
                  className="w-full h-10 px-3 rounded-[8px] bg-soft-cream border border-border text-charcoal outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Or Adjusted Fixed Amount (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => {
                    setAdjustAmount(e.target.value);
                    setAdjustRate('');
                  }}
                  placeholder="e.g. 3500"
                  className="w-full h-10 px-3 rounded-[8px] bg-soft-cream border border-border text-charcoal outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Reason for Adjustment * (min 3 chars)
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Senior technician rate override"
                  className="w-full h-10 px-3 rounded-[8px] bg-soft-cream border border-border text-charcoal outline-none focus:border-sage"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalType(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Adjustment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
