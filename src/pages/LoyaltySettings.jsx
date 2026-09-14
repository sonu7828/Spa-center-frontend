/**
 * LoyaltySettings — Manager-only Loyalty Settings page (100% Full Width & Fully Responsive)
 *
 * Configurable rules:
 *   - Row 1: Default Spending Rule (Left) & Redeem Rule (Right)
 *   - Row 2: Service-Specific Earning Rules (Full Width)
 *   - Row 3: Points Expiry (Full Width)
 */

import { useState, useEffect } from 'react';
import { Award, Check, Save, Sparkles, AlertCircle, Trash2, Layers } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useLoyalty } from '../context/LoyaltyContext';
import { useServices } from '../context/ServicesContext';

export default function LoyaltySettings() {
  const { settings, updateSettings } = useLoyalty();
  const { services: existingServices } = useServices();

  const [form, setForm] = useState({
    spendAmountForPoint: settings.spendAmountForPoint || 1000,
    pointsPerSpend: settings.pointsPerSpend || 1,
    pointsForDiscount: settings.pointsForDiscount || 100,
    discountAmount: settings.discountAmount || 1000,
    minPointsToRedeem: settings.minPointsToRedeem || 100,
    pointsExpiryEnabled: settings.pointsExpiryEnabled || false,
    expiryMonths: settings.expiryMonths || 12,
    servicePoints: { ...(settings.servicePoints || {}) },
  });

  const [saved, setSaved] = useState(false);

  // Sync with live backend settings on load
  useEffect(() => {
    if (settings) {
      setForm((prev) => ({
        ...prev,
        spendAmountForPoint: settings.spendAmountForPoint || 1000,
        pointsPerSpend: settings.pointsPerSpend || 1,
        pointsForDiscount: settings.pointsForDiscount || 100,
        discountAmount: settings.discountAmount || 2500,
        minPointsToRedeem: settings.minPointsToRedeem || 100,
        pointsExpiryEnabled: Boolean(settings.pointsExpiryEnabled),
        expiryMonths: settings.expiryDays ? Math.round(settings.expiryDays / 30) : 12,
        servicePoints: { ...(settings.servicePoints || {}) },
      }));
    }
  }, [settings]);

  const handleChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setSaved(false);
  };

  const handleServicePointsChange = (serviceName, pts) => {
    setForm((prev) => {
      const updated = { ...prev.servicePoints };
      if (pts === '' || pts === undefined || pts === null) {
        delete updated[serviceName];
      } else {
        updated[serviceName] = Number(pts);
      }
      return { ...prev, servicePoints: updated };
    });
    setSaved(false);
  };

  const handleRemoveServiceRule = (serviceName) => {
    setForm((prev) => {
      const updated = { ...prev.servicePoints };
      delete updated[serviceName];
      return { ...prev, servicePoints: updated };
    });
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateSettings({
      spendAmountForPoint: Math.max(1, Number(form.spendAmountForPoint) || 1000),
      pointsPerSpend: Math.max(1, Number(form.pointsPerSpend) || 1),
      pointsForDiscount: Math.max(1, Number(form.pointsForDiscount) || 100),
      discountAmount: Math.max(1, Number(form.discountAmount) || 2500),
      minPointsToRedeem: Math.max(0, Number(form.minPointsToRedeem) || 100),
      pointsExpiryEnabled: Boolean(form.pointsExpiryEnabled),
      expiryDays: Math.max(1, Number(form.expiryMonths) || 12) * 30,
      servicePoints: { ...form.servicePoints },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Loyalty Settings"
        subtitle="Configure rules for earning and redeeming loyalty points."
      />

      <form onSubmit={handleSave} className="space-y-6 w-full">
        {/* ROW 1: Default Spending Rule (Left) & Redeem Rule (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {/* 1. Default Spending Rule */}
          <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card flex flex-col justify-between w-full">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-sage-soft border border-sage/20 flex items-center justify-center text-sage shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">Default Spending Rule</h3>
                  <p className="text-xs text-muted-gray">Applied when a service does not have a custom rule</p>
                </div>
              </div>

              <div className="bg-soft-cream/50 border border-border/70 rounded-[12px] p-4 mt-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-charcoal">
                  <span>Earn</span>
                  <input
                    type="number"
                    min="1"
                    value={form.pointsPerSpend}
                    onChange={(e) => handleChange('pointsPerSpend', e.target.value)}
                    className="w-16 h-[38px] px-2.5 bg-white border border-border rounded-[8px] text-sm text-charcoal font-semibold text-center outline-none focus:border-sage"
                  />
                  <span className="font-medium">pt(s) for every</span>
                  <div className="relative inline-block">
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={form.spendAmountForPoint}
                      onChange={(e) => handleChange('spendAmountForPoint', e.target.value)}
                      className="w-28 h-[38px] px-2.5 pr-11 bg-white border border-border rounded-[8px] text-sm text-charcoal font-semibold text-center outline-none focus:border-sage"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-gray pointer-events-none">
                      FCFA
                    </span>
                  </div>
                  <span>spent</span>
                </div>

                <p className="text-xs text-muted-gray mt-3 flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-sage shrink-0" />
                  Example: 15,000 FCFA = {Math.floor(15000 / (Number(form.spendAmountForPoint) || 1000)) * (Number(form.pointsPerSpend) || 1)} points
                </p>
              </div>
            </div>
          </div>

          {/* 2. Redeem Rule */}
          <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card flex flex-col justify-between w-full">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-sage-soft border border-sage/20 flex items-center justify-center text-sage shrink-0">
                  <Award size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">Redeem Rule</h3>
                  <p className="text-xs text-muted-gray">Discount value when redeeming loyalty points</p>
                </div>
              </div>

              <div className="bg-soft-cream/50 border border-border/70 rounded-[12px] p-4 space-y-3 mt-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-charcoal">
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={form.pointsForDiscount}
                    onChange={(e) => handleChange('pointsForDiscount', e.target.value)}
                    className="w-20 h-[38px] px-2.5 bg-white border border-border rounded-[8px] text-sm text-charcoal font-semibold text-center outline-none focus:border-sage"
                  />
                  <span className="font-medium">Points =</span>
                  <div className="relative inline-block">
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={form.discountAmount}
                      onChange={(e) => handleChange('discountAmount', e.target.value)}
                      className="w-28 h-[38px] px-2.5 pr-11 bg-white border border-border rounded-[8px] text-sm text-charcoal font-semibold text-center outline-none focus:border-sage"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-gray pointer-events-none">
                      FCFA
                    </span>
                  </div>
                  <span>discount</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-medium text-muted-gray">
                    Min to Redeem:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={form.minPointsToRedeem}
                      onChange={(e) => handleChange('minPointsToRedeem', e.target.value)}
                      className="w-20 h-[34px] px-2 bg-white border border-border rounded-[8px] text-xs text-charcoal font-semibold text-center outline-none focus:border-sage"
                    />
                    <span className="text-xs text-muted-gray">points</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Service-Specific Earning Rules (Full Width) */}
        <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card w-full">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-sage-soft border border-sage/20 flex items-center justify-center text-sage shrink-0">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-charcoal">Service-Specific Earning Rules</h3>
              <p className="text-xs text-muted-gray">Fixed points awarded for each spa service (overrides default spending rule)</p>
            </div>
          </div>

          {/* Services List Table */}
          <div className="bg-soft-cream/40 border border-border/70 rounded-[12px] overflow-hidden w-full">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="border-b border-border bg-soft-cream/60">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                      Service
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                      Rule Type
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                      Points Earned
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {existingServices.map((svc) => {
                    const svcName = svc.name;
                    const hasCustom =
                      form.servicePoints[svcName] !== undefined &&
                      form.servicePoints[svcName] !== null &&
                      form.servicePoints[svcName] !== '';
                    const customPts = hasCustom ? form.servicePoints[svcName] : '';

                    return (
                      <tr
                        key={svc.id || svcName}
                        className="border-b border-border/40 last:border-b-0 hover:bg-white/60 transition-colors"
                      >
                        <td className="px-4 py-3.5 text-sm font-semibold text-charcoal">
                          {svcName}
                        </td>
                        <td className="px-4 py-3.5">
                          {hasCustom ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold bg-sage-soft text-sage border border-sage/20">
                              Custom Rule
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-medium bg-soft-cream text-muted-gray border border-border">
                              Default Spending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              placeholder="Default"
                              value={customPts}
                              onChange={(e) => handleServicePointsChange(svcName, e.target.value)}
                              className={`w-24 h-[36px] px-2.5 bg-white border rounded-[8px] text-xs font-semibold outline-none transition-colors ${
                                hasCustom
                                  ? 'border-sage text-charcoal focus:ring-1 focus:ring-sage/30'
                                  : 'border-border text-muted-gray focus:border-sage'
                              }`}
                            />
                            <span className="text-xs text-muted-gray font-medium">pts</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {hasCustom ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceRule(svcName)}
                              className="h-[32px] px-3 rounded-[6px] text-[11px] font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Reset to default spending rule"
                            >
                              <Trash2 size={12} />
                              Reset
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleServicePointsChange(svcName, 20)}
                              className="h-[32px] px-3 rounded-[6px] text-[11px] font-medium text-sage bg-white border border-sage/30 hover:bg-sage-soft transition-all cursor-pointer"
                            >
                              + Set Fixed
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-border/60">
              {existingServices.map((svc) => {
                const svcName = svc.name;
                const hasCustom =
                  form.servicePoints[svcName] !== undefined &&
                  form.servicePoints[svcName] !== null &&
                  form.servicePoints[svcName] !== '';
                const customPts = hasCustom ? form.servicePoints[svcName] : '';

                return (
                  <div key={svc.id || svcName} className="p-3.5 space-y-2.5 hover:bg-white/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-charcoal">{svcName}</p>
                      {hasCustom ? (
                        <span className="inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-semibold bg-sage-soft text-sage border border-sage/20 shrink-0">
                          Custom
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-medium bg-soft-cream text-muted-gray border border-border shrink-0">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          placeholder="Default"
                          value={customPts}
                          onChange={(e) => handleServicePointsChange(svcName, e.target.value)}
                          className={`w-20 h-[36px] px-2 bg-white border rounded-[8px] text-xs font-semibold outline-none ${
                            hasCustom
                              ? 'border-sage text-charcoal'
                              : 'border-border text-muted-gray'
                          }`}
                        />
                        <span className="text-xs text-muted-gray font-medium">pts</span>
                      </div>

                      {hasCustom ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceRule(svcName)}
                          className="h-[36px] px-3 rounded-[8px] text-xs font-medium text-[#B34040] bg-[#FAECEC] border border-[#ECCACA] hover:bg-[#F7DADA] transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Reset
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleServicePointsChange(svcName, 20)}
                          className="h-[36px] px-3 rounded-[8px] text-xs font-medium text-sage bg-white border border-sage/30 hover:bg-sage-soft transition-all cursor-pointer"
                        >
                          + Set Fixed
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-muted-gray mt-3">
            If a custom point value is set for a service, that exact point amount will be awarded upon closing the service. Otherwise, the default spending rule applies.
          </p>
        </div>

        {/* ROW 3: Points Expiry */}
        <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card w-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-charcoal">Points Expiry</h3>
              <p className="text-xs text-muted-gray">Automatically expire unused points after a period</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.pointsExpiryEnabled}
                onChange={(e) => handleChange('pointsExpiryEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sage"></div>
            </label>
          </div>

          {form.pointsExpiryEnabled && (
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 text-sm text-charcoal">
              <span>Points expire after</span>
              <input
                type="number"
                min="1"
                max="60"
                value={form.expiryMonths}
                onChange={(e) => handleChange('expiryMonths', e.target.value)}
                className="w-20 h-[38px] px-3 bg-white border border-border rounded-[8px] text-sm text-charcoal font-semibold text-center outline-none focus:border-sage"
              />
              <span>months</span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs font-semibold text-success flex items-center justify-center gap-1.5 animate-fadeIn">
              <Check size={14} /> Settings Saved Successfully!
            </span>
          )}
          <Button type="submit" className="w-full sm:w-auto h-[44px] px-6">
            <Save size={16} strokeWidth={2} />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
