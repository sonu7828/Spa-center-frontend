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

import { useState } from 'react';
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
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useCommission } from '../context/CommissionContext';

export default function Referrals() {
  const { user } = useAuth();
  const {
    commissionRate,
    setCommissionRate,
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
  const filteredCommissionHistory = isTechnician
    ? allCommissionHistory
    : selectedStaffFilter === 'all'
    ? allCommissionHistory
    : allCommissionHistory.filter(
        (c) =>
          c.referralEmployee?.toLowerCase() === selectedStaffFilter.toLowerCase()
      );

  const totalCommissionPaid = summary?.totalEarned || allCommissionHistory.reduce(
    (sum, c) => sum + (c.commissionAmount || 0),
    0
  );

  // Manager Rule Update
  const handleUpdatePercentage = async (newPercentage) => {
    if (!isManager) return;
    await setCommissionRate(newPercentage);
    showToast(`Referral Commission Rule updated to ${newPercentage}%.`);
  };

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
                      Commission rate percentage awarded from paid invoices.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-warm-ivory px-3.5 py-1.5 rounded-[10px] border border-border/80 self-start sm:self-auto">
                  <span className="text-xs text-muted-gray">Default Rule:</span>
                  <span className="text-base font-extrabold text-[#4F6748]">
                    {commissionRate}%
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-1">
                <label className="text-xs font-semibold text-charcoal block mb-2">
                  Quick Commission Percentage
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {[5, 10, 15].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleUpdatePercentage(rate)}
                      className={`px-4 py-2.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        commissionRate === rate
                          ? 'bg-sage text-white border-sage shadow-xs'
                          : 'bg-soft-cream hover:bg-white text-charcoal border-border'
                      }`}
                    >
                      {commissionRate === rate && <Check size={14} strokeWidth={2.5} />}
                      <span>{rate}%</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-gray mt-2.5">
                  Calculated automatically on invoice payment. Performing technician productivity remains 100% untouched.
                </p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-charcoal">
                  Commission History
                </h3>
                <p className="text-xs text-muted-gray">
                  Ledger of paid services, commission amounts, bonuses, and approval status.
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Filter size={14} className="text-muted-gray" />
                <select
                  value={selectedStaffFilter}
                  onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-[8px] text-xs font-medium bg-soft-cream border border-border text-charcoal cursor-pointer outline-none"
                >
                  <option value="all">All Employees</option>
                  {employeeSummaries.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredCommissionHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-gray bg-warm-ivory/50 rounded-[12px] border border-border/50">
                {isLoading ? 'Loading commission records...' : 'No commission history recorded for the selected filter.'}
              </div>
            ) : (
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
                    {filteredCommissionHistory.map((item) => (
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
