import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Share2,
  Info,
} from 'lucide-react';
import Button from './Button';
import { usersApi } from '../services/api';

export default function EditSalaryContractModal({
  isOpen,
  onClose,
  onSuccess,
  staff,
}) {
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [basePay, setBasePay] = useState(0);
  const [commissionRate, setCommissionRate] = useState(15);
  const [fixedSalary, setFixedSalary] = useState(0);
  const [targetScope, setTargetScope] = useState('INDIVIDUAL');
  const [showAdvancedQuota, setShowAdvancedQuota] = useState(false);

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

  const rawRole = String(staff?.role || '').toLowerCase();
  const isManager = rawRole === 'manager';
  const isMarketer =
    rawRole === 'marketer' ||
    (staff?.specialties || []).some((s) => String(s).toLowerCase() === 'marketer');
  const isReception = rawRole === 'reception';
  const isTechnician = !isManager && !isMarketer && !isReception;

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
    const existingScope = contract.targetScope || (isReception ? 'SPA_TOTAL' : 'INDIVIDUAL');

    if (isManager) {
      setMonthlyTarget(0);
      setFixedSalary(existingFixed !== null ? existingFixed : 150000);
      setBasePay(existingFixed !== null ? existingFixed : 150000);
      setCommissionRate(0);
      setTargetScope('SPA_TOTAL');
      setShowAdvancedQuota(false);
    } else if (isMarketer) {
      setMonthlyTarget(0);
      const bounty = existingFixed !== null && existingFixed > 0
        ? existingFixed
        : existingBase !== null && existingBase > 0
        ? existingBase
        : 1000;
      setFixedSalary(bounty);
      setBasePay(bounty);
      setCommissionRate(existingRate !== null && existingRate > 0 ? existingRate : 2);
      setTargetScope('INDIVIDUAL');
      setShowAdvancedQuota(false);
    } else if (isReception) {
      setMonthlyTarget(existingTarget !== null ? existingTarget : 3500000);
      setFixedSalary(existingFixed !== null ? existingFixed : 100000);
      setBasePay(existingBase !== null ? existingBase : 150000);
      setCommissionRate(existingRate !== null ? existingRate : 0);
      setTargetScope(existingScope);
      setShowAdvancedQuota(existingTarget !== null && existingTarget > 0);
    } else {
      // Technician
      const hasQuota = existingTarget !== null && existingTarget > 0;
      setMonthlyTarget(hasQuota ? existingTarget : 0);
      setFixedSalary(existingFixed !== null ? existingFixed : 0);
      setBasePay(existingBase !== null ? existingBase : 0);
      setCommissionRate(existingRate !== null ? existingRate : 15);
      setTargetScope(existingScope);
      setShowAdvancedQuota(hasQuota);
    }
  }, [isOpen, staff, isManager, isMarketer, isReception]);

  if (!isOpen || !staff) return null;

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

  // Advisory warning check for target quota mode
  const isAdvisoryTriggered =
    showAdvancedQuota &&
    targetNum > 0 &&
    (baseNum + simulatedCommAtTarget) < fixedNum &&
    targetScope === 'INDIVIDUAL';

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

    if (isMarketer) {
      if (commNum < 0 || commNum > 100) {
        setError('Lifetime commission rate must be between 0% and 100%.');
        return;
      }
      if (fixedNum < 0) {
        setError('New client acquisition bounty cannot be negative.');
        return;
      }

      setLoading(true);
      try {
        await usersApi.updateSalaryContract(staff.id, {
          monthlyTarget: 0,
          basePay: fixedNum,
          commissionRate: commNum,
          fixedSalary: fixedNum,
          targetScope: 'INDIVIDUAL',
        });

        setSuccessMsg('Marketer contract terms saved successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 700);
      } catch (err) {
        setError(err?.message || 'Failed to save marketer contract.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Technician / Receptionist validation
    if (commNum < 0 || commNum > 100) {
      setError('Commission rate must be between 0% and 100%.');
      return;
    }

    if (targetNum < 0 || baseNum < 0 || fixedNum < 0) {
      setError('Monetary amounts cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      // If advanced quota is hidden, save as pure commission
      const payloadTarget = showAdvancedQuota ? targetNum : 0;
      const payloadBase = showAdvancedQuota ? baseNum : 0;
      const payloadFixed = showAdvancedQuota ? fixedNum : 0;

      const res = await usersApi.updateSalaryContract(staff.id, {
        monthlyTarget: payloadTarget,
        basePay: payloadBase,
        commissionRate: commNum,
        fixedSalary: payloadFixed,
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
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                isMarketer
                  ? 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]'
                  : isManager
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-sage-soft text-sage border-sage/20'
              }`}
            >
              {isMarketer ? <Share2 size={20} /> : <Award size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">
                {isMarketer
                  ? 'Marketer Compensation Agreement'
                  : isManager
                  ? 'Manager Salary Configuration'
                  : 'Technician Commission & Salary Contract'}
              </h3>
              <p className="text-xs text-muted-gray">
                {isMarketer
                  ? `Configure flat bounty & lifetime % for ${staff.name || staff.email}`
                  : isManager
                  ? `Set monthly fixed salary for ${staff.name || staff.email}`
                  : `Set service commission rate for ${staff.name || staff.email}`}
                {isMarketer && (
                  <span className="ml-1.5 text-[11px] font-semibold text-[#6D28D9] bg-[#EDE9FE] px-2 py-0.5 rounded-full">
                    Marketer Role
                  </span>
                )}
                {isTechnician && (
                  <span className="ml-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Technician
                  </span>
                )}
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

          {/* =================================================================
              VIEW 1: MANAGER (SALARIED FIXED PAY)
             ================================================================= */}
          {isManager && (
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
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 2: MARKETER (BOUNTY + LIFETIME % SPLIT DEDUCTION)
             ================================================================= */}
          {isMarketer && (
            <div className="space-y-4">
              <div className="p-4 rounded-[14px] bg-[#FAF5FF] border border-[#DDD6FE] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#6D28D9] flex items-center gap-1.5">
                    <Sparkles size={16} /> Marketer Compensation Model
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE9FE] text-[#6D28D9]">
                    Lifetime Recurring
                  </span>
                </div>
                <p className="text-xs text-[#5B21B6] leading-relaxed">
                  Marketers receive a <strong>Flat Acquisition Bounty</strong> on the client's first paid checkout, plus a <strong>Negotiated Lifetime Percentage</strong> on every service completed by their clients (deducted automatically from performing technicians).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Lifetime Commission Rate */}
                <div className="p-4 rounded-[14px] bg-white border border-border space-y-2">
                  <label className="block text-xs font-bold text-charcoal">
                    Lifetime Commission Rate (%) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-4 py-2.5 rounded-[10px] border border-border bg-white text-base font-bold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-gray">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-gray leading-normal">
                    Deducted from the technician who performs the service for this marketer's clients.
                  </p>
                </div>

                {/* 2. Flat Client Acquisition Bounty */}
                <div className="p-4 rounded-[14px] bg-white border border-border space-y-2">
                  <label className="block text-xs font-bold text-charcoal">
                    New Client Flat Bounty (FCFA) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={fixedSalary}
                      onChange={(e) => {
                        setFixedSalary(e.target.value);
                        setBasePay(e.target.value);
                      }}
                      placeholder="e.g. 1000"
                      className="w-full px-4 py-2.5 rounded-[10px] border border-border bg-white text-base font-bold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-gray">
                      FCFA
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-gray leading-normal">
                    Flat one-time fee paid on the new client's first paid invoice.
                  </p>
                </div>
              </div>

              {/* Marketer Payout Structure Card */}
              <div className="p-4 rounded-[14px] bg-[#FAF5FF] border border-[#DDD6FE] space-y-2.5">
                <div className="text-xs font-bold text-[#6D28D9] flex items-center gap-1.5">
                  <Sparkles size={15} /> Payout Structure For This Marketer:
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-white rounded-[10px] border border-[#DDD6FE] flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-charcoal block">
                        Pehli Visit Par (New Client 1st Visit):
                      </span>
                      <span className="text-[11px] text-muted-gray block mt-0.5">
                        Marketer ko <strong className="text-[#6D28D9]">{fixedNum.toLocaleString()} FCFA</strong> Flat Bounty milega + us invoice ki total service amount par <strong className="text-[#6D28D9]">{commNum}%</strong> commission milega.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-[10px] border border-[#DDD6FE] flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ∞
                    </div>
                    <div>
                      <span className="font-bold text-charcoal block">
                        Aane Wali Har Visit Par (Lifetime for all repeat visits):
                      </span>
                      <span className="text-[11px] text-muted-gray block mt-0.5">
                        Jab bhi yeh client spa aayega, Marketer ko service amount ka <strong className="text-[#6D28D9]">{commNum}%</strong> automatically milega (yeh {commNum}% technician ke commission se deduct hoga).
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-gray italic pt-1">
                  💡 Note: Actual commission har invoice ki service price par depend karega (e.g. 4,000 FCFA service par {commNum}% = {(4000 * commNum) / 100} FCFA, 10,000 FCFA par = {(10000 * commNum) / 100} FCFA).
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 3: TECHNICIAN / RECEPTION (COMMISSION + OPTIONAL QUOTA)
             ================================================================= */}
          {!isManager && !isMarketer && (
            <div className="space-y-4">
              {/* Hero Input: Technician Commission Rate */}
              <div className="p-4 rounded-[16px] bg-white border-2 border-sage/40 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                    <Award size={16} className="text-sage" />
                    Technician Service Commission Rate (%) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Direct Service Earning
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-4 py-3 rounded-[12px] border border-border bg-white text-2xl font-black text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-gray">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-muted-gray">
                  This technician receives <strong>{commNum}%</strong> commission on each completed service they perform.
                </p>
              </div>

              {/* Short & Clean Marketer Split Notice */}
              <div className="p-3.5 rounded-[12px] bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-emerald-900 block">
                    Marketer Split Deduction Active
                  </span>
                  <span className="text-[11px] text-emerald-800 leading-relaxed block">
                    Agar is technician ke paas kisi Marketer ka laya hua client aayega, toh us Marketer ka negotiated percentage (e.g. 2%, 3%, 4%) is commission me se automatically deduct ho jayega:
                    <br />
                    <span className="font-mono font-bold text-emerald-950">
                      Technician Net = {commNum}% - Marketer%
                    </span>
                  </span>
                </div>
              </div>

              {/* Optional Advanced Sales Quota Accordion */}
              <div className="border border-border rounded-[14px] overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setShowAdvancedQuota(!showAdvancedQuota)}
                  className="w-full px-4 py-3 bg-soft-cream/40 flex items-center justify-between text-xs font-bold text-charcoal hover:bg-soft-cream/70 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Calculator size={14} className="text-muted-gray" />
                    Advanced Monthly Target Quota & Baseline Salary (Optional)
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-gray font-normal text-[11px]">
                    {showAdvancedQuota ? 'Hide' : 'Configure Quota'}
                    {showAdvancedQuota ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {showAdvancedQuota && (
                  <div className="p-4 space-y-4 border-t border-border bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal mb-1">
                          Monthly Target Quota (FCFA)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={monthlyTarget}
                          onChange={(e) => setMonthlyTarget(e.target.value)}
                          className="w-full px-3 py-2 rounded-[10px] border border-border text-xs font-semibold font-mono"
                        />
                        <span className="text-[10px] text-muted-gray">Sales quota required</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal mb-1">
                          Below Target Flat Salary (FCFA)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={fixedSalary}
                          onChange={(e) => setFixedSalary(e.target.value)}
                          className="w-full px-3 py-2 rounded-[10px] border border-border text-xs font-semibold font-mono"
                        />
                        <span className="text-[10px] text-muted-gray">If sales &lt; target</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal mb-1">
                          Target Met Base Pay (FCFA)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={basePay}
                          onChange={(e) => setBasePay(e.target.value)}
                          className="w-full px-3 py-2 rounded-[10px] border border-border text-xs font-semibold font-mono"
                        />
                        <span className="text-[10px] text-muted-gray">Base salary when quota met</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal mb-1.5">
                        Quota Qualifying Basis (Scope)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`p-2.5 rounded-[10px] border cursor-pointer flex flex-col gap-0.5 text-xs transition-all ${
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
                          <span className="text-[10px] opacity-80">Personal technician sales</span>
                        </label>

                        <label
                          className={`p-2.5 rounded-[10px] border cursor-pointer flex flex-col gap-0.5 text-xs transition-all ${
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
                          <span className="text-[10px] opacity-80">Overall salon revenue</span>
                        </label>
                      </div>
                    </div>

                    {isAdvisoryTriggered && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-[8px] flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Base pay ({baseNum.toLocaleString()}) + commission ({simulatedCommAtTarget.toLocaleString()}) = {(baseNum + simulatedCommAtTarget).toLocaleString()} FCFA, lower than fixed salary ({fixedNum.toLocaleString()} FCFA).
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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
