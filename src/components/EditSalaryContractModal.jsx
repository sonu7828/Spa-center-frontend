import React, { useState, useEffect } from 'react';
import { X, Award, DollarSign, Calculator, AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import Button from './Button';
import { usersApi } from '../services/api';

const CONTRACT_PRESETS = [
  {
    id: 'barber',
    label: 'Barber Preset (300k Target · 20% Comm)',
    monthlyTarget: 300000,
    basePay: 50000,
    commissionRate: 20,
    fixedSalary: 80000,
    targetScope: 'INDIVIDUAL',
  },
  {
    id: 'nail_tech',
    label: 'Nail Technician Preset (500k Target · 15% Comm)',
    monthlyTarget: 500000,
    basePay: 50000,
    commissionRate: 15,
    fixedSalary: 80000,
    targetScope: 'INDIVIDUAL',
  },
  {
    id: 'esthetician',
    label: 'Esthetician Preset (642k Target · 15% Comm)',
    monthlyTarget: 642000,
    basePay: 50000,
    commissionRate: 15,
    fixedSalary: 80000,
    targetScope: 'INDIVIDUAL',
  },
  {
    id: 'receptionist',
    label: 'Receptionist Preset (3.5M Spa Target · 150k Base)',
    monthlyTarget: 3500000,
    basePay: 150000,
    commissionRate: 0,
    fixedSalary: 100000,
    targetScope: 'SPA_TOTAL',
  },
  {
    id: 'custom',
    label: 'Custom Staff Configuration...',
    monthlyTarget: 500000,
    basePay: 50000,
    commissionRate: 15,
    fixedSalary: 80000,
    targetScope: 'INDIVIDUAL',
  },
];

export default function EditSalaryContractModal({
  isOpen,
  onClose,
  onSuccess,
  staff,
}) {
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [monthlyTarget, setMonthlyTarget] = useState(500000);
  const [basePay, setBasePay] = useState(50000);
  const [commissionRate, setCommissionRate] = useState(15);
  const [fixedSalary, setFixedSalary] = useState(80000);
  const [targetScope, setTargetScope] = useState('INDIVIDUAL');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advisoryMsg, setAdvisoryMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !staff) return;

    setError('');
    setAdvisoryMsg('');
    setSuccessMsg('');

    // Pre-populate from existing staff contract or role defaults
    const contract = staff.salaryContract || {};
    const existingTarget = Number(contract.monthlyTarget || 0);
    const existingBase = Number(contract.basePay || 0);
    const existingRate = Number(contract.commissionRate || 0);
    const existingFixed = Number(contract.fixedSalary || 0);
    const existingScope = contract.targetScope || (staff.role === 'reception' ? 'SPA_TOTAL' : 'INDIVIDUAL');

    if (existingTarget > 0 || existingFixed > 0) {
      setMonthlyTarget(existingTarget || 500000);
      setBasePay(existingBase || 50000);
      setCommissionRate(existingRate || 15);
      setFixedSalary(existingFixed || 80000);
      setTargetScope(existingScope);
      setSelectedPreset('custom');
    } else {
      // Auto-detect preset based on role or specialties
      const spec = ((staff.specialties || []).join(' ') || '').toLowerCase();
      if (staff.role === 'reception') {
        applyPresetValues(CONTRACT_PRESETS[3]);
      } else if (spec.includes('barber')) {
        applyPresetValues(CONTRACT_PRESETS[0]);
      } else if (spec.includes('nail')) {
        applyPresetValues(CONTRACT_PRESETS[1]);
      } else if (spec.includes('facial') || spec.includes('esthetic')) {
        applyPresetValues(CONTRACT_PRESETS[2]);
      } else {
        applyPresetValues(CONTRACT_PRESETS[1]);
      }
    }
  }, [isOpen, staff]);

  const applyPresetValues = (preset) => {
    setSelectedPreset(preset.id);
    setMonthlyTarget(preset.monthlyTarget);
    setBasePay(preset.basePay);
    setCommissionRate(preset.commissionRate);
    setFixedSalary(preset.fixedSalary);
    setTargetScope(preset.targetScope);
  };

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setSelectedPreset(val);
    const found = CONTRACT_PRESETS.find((p) => p.id === val);
    if (found) {
      applyPresetValues(found);
    }
  };

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

  // Advisory warning check
  const isAdvisoryTriggered = (baseNum + simulatedCommAtTarget) < fixedNum && targetScope === 'INDIVIDUAL';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAdvisoryMsg('');
    setSuccessMsg('');

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
            <div className="w-10 h-10 rounded-full bg-sage-soft text-sage flex items-center justify-center border border-sage/20">
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">Salary & Commission Contract</h3>
              <p className="text-xs text-muted-gray">
                Configure Mode A (Fixed Baseline) vs Mode B (Commission Tier) for <strong>{staff.name || staff.email}</strong>
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

          {/* Quick Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-sage" />
              Standard Role Preset
            </label>
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm text-charcoal font-medium focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
            >
              {CONTRACT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Target Quota (T) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Monthly Target Quota (FCFA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={monthlyTarget}
                onChange={(e) => {
                  setMonthlyTarget(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                required
              />
              <span className="text-[10px] text-muted-gray">Sales quota required to unlock commission tier</span>
            </div>

            {/* Below Target Fixed Salary (S_fixed) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Below Target Flat Salary (FCFA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={fixedSalary}
                onChange={(e) => {
                  setFixedSalary(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                required
              />
              <span className="text-[10px] text-muted-gray">Guaranteed floor payout if revenue &lt; target</span>
            </div>

            {/* Target Met Base Pay (B) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Target Met Base Pay (FCFA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={basePay}
                onChange={(e) => {
                  setBasePay(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                required
              />
              <span className="text-[10px] text-muted-gray">Base salary unlocked once quota reached</span>
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
                step="1"
                value={commissionRate}
                onChange={(e) => {
                  setCommissionRate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                required
              />
              <span className="text-[10px] text-muted-gray">% on eligible sales once quota reached</span>
            </div>
          </div>

          {/* Target Scope */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Quota Qualifying Basis (Scope)
            </label>
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
                  onChange={() => {
                    setTargetScope('INDIVIDUAL');
                    setSelectedPreset('custom');
                  }}
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
                  onChange={() => {
                    setTargetScope('SPA_TOTAL');
                    setSelectedPreset('custom');
                  }}
                  className="sr-only"
                />
                <span className="font-bold">Spa Total Sales</span>
                <span className="text-[10px] opacity-80">Overall salon revenue (Front Desk Receptionist)</span>
              </label>
            </div>
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
                <span className="text-[10px] text-muted-gray block mt-0.5">Guaranteed safety net baseline</span>
              </div>

              <div className="bg-white p-3 rounded-[10px] border border-sage/40">
                <span className="text-[11px] font-semibold text-sage block">Mode B (At Target Quota)</span>
                <span className="text-sm font-bold text-sage font-mono">
                  {simulatedPayoutAtTarget.toLocaleString()} FCFA
                </span>
                <span className="text-[10px] text-sage font-medium block mt-0.5">
                  +{simulatedGain.toLocaleString()} FCFA gain over fixed baseline!
                </span>
              </div>
            </div>

            {isAdvisoryTriggered && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-[8px] flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Advisory Warning:</strong> Base pay ({baseNum.toLocaleString()}) + target commission ({simulatedCommAtTarget.toLocaleString()}) = {(baseNum + simulatedCommAtTarget).toLocaleString()} FCFA, which is lower than the fixed salary ({fixedNum.toLocaleString()} FCFA). The employee will receive the guaranteed floor of {fixedNum.toLocaleString()} FCFA.
                </span>
              </div>
            )}
          </div>

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
