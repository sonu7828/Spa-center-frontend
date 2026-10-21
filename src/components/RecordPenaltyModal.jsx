import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert, Calendar, DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { penaltiesApi } from '../services/api';

const DEFAULT_STANDARD_RULES = [
  { id: 'late_coming', name: 'Late coming', defaultAmount: 2000 },
  { id: 'no_show', name: 'No show / Missed work', defaultAmount: 5000 },
  { id: 'not_dressed_properly', name: 'Not dressed properly', defaultAmount: 2000 },
  { id: 'rude_to_clients', name: 'Rude / Disrespectful to clients', defaultAmount: 5000 },
  { id: 'sitting_in_rooms', name: 'Sitting / Hiding in rooms', defaultAmount: 2500 },
];

export default function RecordPenaltyModal({
  isOpen,
  onClose,
  onSuccess,
  defaultStaffId = '',
  staffList = [],
}) {
  const [rules, setRules] = useState(DEFAULT_STANDARD_RULES);
  const [staffId, setStaffId] = useState(defaultStaffId || '');
  const [selectedRuleId, setSelectedRuleId] = useState('late_coming');
  const [customRuleName, setCustomRuleName] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState(2000);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  // Fetch live standard rules on open
  useEffect(() => {
    if (!isOpen) return;
    setStaffId(defaultStaffId || (staffList[0]?.id ? String(staffList[0].id) : ''));
    setSelectedRuleId('late_coming');
    setCustomRuleName('');
    setPenaltyAmount(2000);
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setError('');
    setSuccessMsg('');

    let isMounted = true;
    penaltiesApi
      .getRules()
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setRules(res.data);
          const first = res.data[0];
          setSelectedRuleId(first.id || first.name);
          setPenaltyAmount(first.defaultAmount || 2000);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch rules catalog from API, using defaults:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, defaultStaffId, staffList]);

  if (!isOpen) return null;

  // Handle rule selector change
  const handleRuleChange = (e) => {
    const val = e.target.value;
    setSelectedRuleId(val);
    setError('');

    if (val === 'CUSTOM') {
      setPenaltyAmount(2000);
      return;
    }

    const matched = rules.find((r) => r.id === val || r.name === val);
    if (matched) {
      setPenaltyAmount(matched.defaultAmount);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!staffId) {
      setError('Please select a staff member.');
      return;
    }

    let effectiveRuleName = '';
    if (selectedRuleId === 'CUSTOM') {
      if (!customRuleName.trim()) {
        setError('Please enter a name for the custom rule.');
        return;
      }
      effectiveRuleName = customRuleName.trim();
    } else {
      const matched = rules.find((r) => r.id === selectedRuleId || r.name === selectedRuleId);
      effectiveRuleName = matched?.name || selectedRuleId;
    }

    const parsedAmount = Number(penaltyAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Penalty amount must be a positive number in FCFA.');
      return;
    }

    if (!date) {
      setError('Please select an infraction date.');
      return;
    }

    setLoading(true);
    try {
      await penaltiesApi.createPenalty({
        staffId: String(staffId),
        ruleName: effectiveRuleName,
        penaltyAmount: parsedAmount,
        date,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg('Disciplinary penalty recorded successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      setError(err?.message || 'Failed to record penalty. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-border rounded-[20px] w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-soft-cream/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">Record Disciplinary Penalty</h3>
              <p className="text-xs text-muted-gray">Log employee infraction per salon conduct rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-gray hover:text-charcoal hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
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

          {/* 1. Staff Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Staff Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
              required
            >
              <option value="" disabled>Select Staff Member</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name || st.email} ({st.role ? st.role.toUpperCase() : 'STAFF'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Conduct Rule Selector */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Conduct Rule Violation <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRuleId}
              onChange={handleRuleChange}
              className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
            >
              {rules.map((rule) => (
                <option key={rule.id || rule.name} value={rule.id || rule.name}>
                  {rule.name} — ({Number(rule.defaultAmount).toLocaleString()} FCFA)
                </option>
              ))}
              <option value="CUSTOM">+ Custom Rule Option</option>
            </select>
          </div>

          {/* Custom Rule Input (if selected) */}
          {selectedRuleId === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Custom Rule Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customRuleName}
                onChange={(e) => setCustomRuleName(e.target.value)}
                placeholder="e.g. Phone use during client treatment"
                className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                required
              />
            </div>
          )}

          {/* 3. Penalty Amount (FCFA) */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Penalty Amount (FCFA) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-gray">
                FCFA
              </span>
              <input
                type="number"
                min="100"
                step="100"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
                className="w-full pl-16 pr-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm font-semibold text-charcoal focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-muted-gray mt-1">
              Standard default auto-applied; Manager can edit if needed.
            </p>
          </div>

          {/* 4. Infraction Date */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Infraction Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-gray" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                required
              />
            </div>
          </div>

          {/* 5. Notes / Context */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Notes & Context <span className="text-muted-gray font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Arrived 45 minutes late without notifying front desk supervisor."
              className="w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-xs sm:text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-[12px] text-[11px] text-amber-900 leading-relaxed">
            <strong>Operational Record Notice:</strong> Penalties are recorded transparently in the staff summary for management review and manual payroll reference. No automated invoice deductions are made.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold border-rose-600 shadow-sm"
            >
              {loading ? 'Recording...' : 'Record Penalty'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
