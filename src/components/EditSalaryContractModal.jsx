import React, { useState, useEffect } from 'react';
import { X, Award, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { usersApi } from '../services/api';

export default function EditSalaryContractModal({
  isOpen,
  onClose,
  onSuccess,
  staff,
}) {
  const [monthlyTarget, setMonthlyTarget] = useState(500000);
  const [basePay, setBasePay] = useState(50000);
  const [commissionRate, setCommissionRate] = useState(15);
  const [fixedSalary, setFixedSalary] = useState(80000);
  const [targetScope, setTargetScope] = useState('INDIVIDUAL');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advisoryMsg, setAdvisoryMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !staff) return;

    setError('');
    setAdvisoryMsg('');
    setSuccessMsg('');

    // Pre-populate from existing staff contract or sensible role starting values
    const contract = staff.salaryContract || {};
    const existingTarget = contract.monthlyTarget !== undefined ? Number(contract.monthlyTarget) : null;
    const existingBase = contract.basePay !== undefined ? Number(contract.basePay) : null;
    const existingRate = contract.commissionRate !== undefined ? Number(contract.commissionRate) : null;
    const existingFixed = contract.fixedSalary !== undefined ? Number(contract.fixedSalary) : null;
    const existingScope = contract.targetScope || (staff.role === 'reception' ? 'SPA_TOTAL' : 'INDIVIDUAL');

    if (staff.role === 'manager') {
      setMonthlyTarget(0);
      setFixedSalary(existingFixed !== null ? existingFixed : 150000);
      setBasePay(existingFixed !== null ? existingFixed : 150000);
      setCommissionRate(0);
      setTargetScope('SPA_TOTAL');
    } else if (staff.role === 'reception') {
      setMonthlyTarget(existingTarget !== null ? existingTarget : 3500000);
      setFixedSalary(existingFixed !== null ? existingFixed : 100000);
      setBasePay(existingBase !== null ? existingBase : 150000);
      setCommissionRate(existingRate !== null ? existingRate : 0);
      setTargetScope(existingScope);
    } else {
      setMonthlyTarget(existingTarget !== null ? existingTarget : 500000);
      setFixedSalary(existingFixed !== null ? existingFixed : 80000);
      setBasePay(existingBase !== null ? existingBase : 50000);
      setCommissionRate(existingRate !== null ? existingRate : 15);
      setTargetScope(existingScope);
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  const isManager = staff.role === 'manager';
  const isMarketer = staff.role === 'marketer' || (staff.specialties || []).some((s) => String(s).toLowerCase() === 'marketer');

  // Live simulation math
  const targetNum = Number(monthlyTarget) || 0;
  const baseNum = Number(basePay) || 0;
  const commNum = Number(commissionRate) || 0;
  const fixedNum = Number(fixedSalary) || 0;

  const simulatedCommAtTarget = Math.round((targetNum * commNum) / 100);
  const simulatedPayoutAtTarget = targetScope === 'SPA_TOTAL'
    ? Math.max(fixedNum, baseNum)
    : Math.max(fixedNum, baseNum + simulatedCommAtTarget);
  const simulatedGain = Math.max(0, simulatedPayoutAtTarget - fixedNum);

  // Advisory warning check
  const isAdvisoryTriggered = (baseNum + simulatedCommAtTarget) < fixedNum && targetScope === 'INDIVIDUAL';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAdvisoryMsg('');
    setSuccessMsg('');

    if (isManager) {
      if (fixedNum < 0) {
        setError('Monthly fixed salary cannot be negative.');
        return;
      }
      setLoading(true);
      try {
        await usersApi.updateSalaryContract(staff.id, {
          monthlyTarget: 0,
          basePay: fixedNum,
          commissionRate: 0,
          fixedSalary: fixedNum,
          targetScope: 'SPA_TOTAL',
        });

        setSuccessMsg('Manager fixed monthly salary saved successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 700);
      } catch (err) {
        setError(err?.message || 'Failed to save manager salary.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (targetNum < 0 || baseNum < 0 || fixedNum < 0) {
      setError('Monetary amounts cannot be negative.');
      return;
    }

    if (commNum < 0 || commNum > 100) {
      setError('Commission rate must be between 0% and 100%.');
      return;
    }

    setLoading(true);
    try {
      const res = await usersApi.updateSalaryContract(staff.id, {
        monthlyTarget: targetNum,
        basePay: baseNum,
        commissionRate: commNum,
        fixedSalary: fixedNum,
        targetScope,
      });

      if (res?.data?.advisoryWarning) {
        setAdvisoryMsg(res.data.advisoryWarning);
      }

      setSuccessMsg('Salary & commission contract saved successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      setError(err?.message || 'Failed to save salary contract.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-border rounded-[20px] w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-soft-cream/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              isMarketer
                ? 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]'
                : isManager
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-sage-soft text-sage border-sage/20'
            }`}>
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">
                {isManager ? 'Manager Salary Configuration' : 'Salary & Commission Contract'}
              </h3>
              <p className="text-xs text-muted-gray">
                {isManager
                  ? `Set monthly fixed salary for ${staff.name || staff.email}`
                  : `Configure Mode A (Fixed Baseline) vs Mode B (Commission Tier) for ${staff.name || staff.email}`}
                {isMarketer && <span className="ml-1 text-[11px] font-semibold text-[#6D28D9] bg-[#EDE9FE] px-2 py-0.5 rounded-full">Marketer</span>}
                {isManager && <span className="ml-1 text-[11px] font-semibold text-slate-800 bg-slate-200 px-2 py-0.5 rounded-full">Salaried Manager</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-gray hover:text-charcoal hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[10px] flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-[10px] flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isManager ? (
            <div className="space-y-4">
              <div className="p-4 rounded-[14px] bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-charcoal">
                    Manager Remuneration Model
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                    Salaried Leadership
                  </span>
                </div>
                <p className="text-xs text-muted-gray leading-relaxed">
                  Managers do not perform salon services. They receive a <strong>fixed monthly salary</strong> with <strong>0% service commission</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5">
                  Monthly Fixed Salary (FCFA) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fixedSalary}
                    onChange={(e) => setFixedSalary(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-base font-bold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-gray">
                    FCFA / Month
                  </span>
                </div>
                <span className="text-[11px] text-muted-gray mt-1 block">
                  Monthly fixed salary for {staff.name || staff.email}.
                </span>
              </div>

              {/* Summary Payout Preview */}
              <div className="p-4 rounded-[14px] bg-sage-soft border border-sage/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-muted-gray block">
                    Monthly Fixed Salary
                  </span>
                  <span className="text-lg font-black text-charcoal font-mono">
                    {fixedNum.toLocaleString()} FCFA
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-sage/30 text-sage-hover">
                  Fixed Monthly Salary
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Monthly Target Quota (T) */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Monthly Target Quota (FCFA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                    required
                  />
                  <span className="text-[10px] text-muted-gray">
                    {isMarketer
                      ? 'Target revenue from clients acquired by this marketer'
                      : 'Sales quota required to unlock commission tier'}
                  </span>
                </div>

                {/* Below Target Fixed Salary (S_fixed) */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Below Target Flat Salary (FCFA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fixedSalary}
                    onChange={(e) => setFixedSalary(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                    required
                  />
                  <span className="text-[10px] text-muted-gray">
                    {isMarketer
                      ? 'Base retainer if referred sales < target (0 for pure commission)'
                      : 'Fixed salary if sales are below target'}
                  </span>
                </div>

                {/* Target Met Base Pay (B) */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Target Met Base Pay (FCFA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={basePay}
                    onChange={(e) => setBasePay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                    required
                  />
                  <span className="text-[10px] text-muted-gray">
                    {isMarketer
                      ? 'Base retainer unlocked once sales quota reached'
                      : 'Base salary unlocked once quota reached'}
                  </span>
                </div>

                {/* Target Met Commission Rate (C%) */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Commission Rate (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                    required
                  />
                  <span className="text-[10px] text-muted-gray">
                    {isMarketer
                      ? '% referral commission on completed services by their clients'
                      : '% on eligible sales once quota reached'}
                  </span>
                </div>
              </div>

              {/* Target Scope */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5">
                  Quota Qualifying Basis (Scope)
                </label>
                {isMarketer ? (
                  <div className="p-3 rounded-[12px] bg-[#FAF5FF] border border-[#DDD6FE] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[8px] bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-sm">
                        🎯
                      </div>
                      <div>
                        <span className="font-bold text-[#6D28D9] block">
                          Referred Clients Sales (Only Their Clients)
                        </span>
                        <span className="text-[10px] text-muted-gray">
                          Quota tracks revenue generated only by clients acquired by this marketer
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#6D28D9] bg-white px-2.5 py-1 rounded-[6px] border border-[#DDD6FE] shadow-2xs">
                      ✓ Auto-locked
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-[12px] border cursor-pointer flex flex-col gap-0.5 text-xs transition-all ${
                        targetScope === 'INDIVIDUAL'
                          ? 'bg-sage-soft border-sage text-charcoal font-semibold'
                          : 'bg-white border-border text-muted-gray hover:bg-soft-cream'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetScope"
                        value="INDIVIDUAL"
                        checked={targetScope === 'INDIVIDUAL'}
                        onChange={() => setTargetScope('INDIVIDUAL')}
                        className="sr-only"
                      />
                      <span className="font-bold">Individual Services</span>
                      <span className="text-[10px] opacity-80">Technician personal sales (Barber, Nail, Esthetician)</span>
                    </label>

                    <label
                      className={`p-3 rounded-[12px] border cursor-pointer flex flex-col gap-0.5 text-xs transition-all ${
                        targetScope === 'SPA_TOTAL'
                          ? 'bg-sage-soft border-sage text-charcoal font-semibold'
                          : 'bg-white border-border text-muted-gray hover:bg-soft-cream'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetScope"
                        value="SPA_TOTAL"
                        checked={targetScope === 'SPA_TOTAL'}
                        onChange={() => setTargetScope('SPA_TOTAL')}
                        className="sr-only"
                      />
                      <span className="font-bold">Spa Total Sales</span>
                      <span className="text-[10px] opacity-80">Overall salon revenue (Front Desk Receptionist)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Interactive Live Simulation Card */}
              <div className="bg-soft-cream/60 border border-border rounded-[14px] p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal uppercase tracking-wider">
                  <Calculator size={14} className="text-sage" />
                  Live Contract Simulation & Payout Preview
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="bg-white p-3 rounded-[10px] border border-border">
                    <span className="text-[11px] font-medium text-muted-gray block">Mode A (Below Target)</span>
                    <span className="text-sm font-bold text-charcoal font-mono">
                      {fixedNum.toLocaleString()} FCFA
                    </span>
                    <span className="text-[10px] text-muted-gray block mt-0.5">Fixed salary if target not reached</span>
                  </div>

                  <div className="bg-white p-3 rounded-[10px] border border-sage/40">
                    <span className="text-[11px] font-semibold text-sage block">Mode B (At Target Quota)</span>
                    <span className="text-sm font-bold text-sage font-mono">
                      {simulatedPayoutAtTarget.toLocaleString()} FCFA
                    </span>
                    <span className="text-[10px] text-sage font-medium block mt-0.5">
                      +{simulatedGain.toLocaleString()} FCFA gain over fixed salary!
                    </span>
                  </div>
                </div>

                {isAdvisoryTriggered && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-[8px] flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Advisory Warning:</strong> Base pay ({baseNum.toLocaleString()}) + target commission ({simulatedCommAtTarget.toLocaleString()}) = {(baseNum + simulatedCommAtTarget).toLocaleString()} FCFA, which is lower than the fixed salary ({fixedNum.toLocaleString()} FCFA). The employee will receive the fixed salary of {fixedNum.toLocaleString()} FCFA.
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="bg-sage hover:bg-sage-dark text-charcoal font-semibold shadow-sm"
            >
              {loading ? 'Saving Contract...' : 'Save Contract'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
