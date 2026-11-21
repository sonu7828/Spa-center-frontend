/**
 * CommissionContext — Real Backend Integrated Employee Commission & Bonus State
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/commissions):
 *   - GET    /api/v1/commissions (Manager/Reception full, Technician own only)
 *   - GET    /api/v1/commissions/:technicianId (Technician-specific breakdown)
 *   - GET    /api/v1/commissions/rules (Commission rates per category)
 *   - POST   /api/v1/commissions/rules (Manager updates rules)
 *   - POST   /api/v1/commissions/:id/bonus (Manager awards performance bonus)
 *   - PATCH  /api/v1/commissions/:id/adjust (Manager adjusts commission rate or amount)
 *   - POST   /api/v1/commissions/:id/approve (Manager approves commission payout)
 *
 * Core Rules:
 *   - Commission comes only from PAID invoices.
 *   - Real backend data is the source of truth.
 *   - RBAC: Manager full control, Reception view only, Technician own only, Cleaner blocked.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { commissionsApi } from '../services/api';
import { useClients } from './ClientsContext';
import { useAuth } from './AuthContext';

const CommissionContext = createContext();

function formatCommission(c) {
  const techName =
    c.technician?.staffProfile?.name ||
    (c.technician?.email ? c.technician.email.split('@')[0] : 'Staff');

  const d = new Date(c.createdAt || Date.now());
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;

  const baseCommission = Number(c.baseCommission) || 0;
  const bonusAmount = Number(c.bonusAmount) || 0;
  const totalCommission = Number(c.totalCommission) || baseCommission + bonusAmount;

  return {
    id: c.id,
    date: formattedDate,
    client: c.invoice?.clientName || 'Client',
    clientId: null,
    service: c.serviceName || 'Service',
    serviceCategory: c.serviceCategory || 'General',
    serviceAmount: Number(c.servicePrice) || 0,
    referralEmployee: techName,
    referralEmployeeId: c.technicianId,
    performingTechnician: techName,
    performingTechnicianId: c.technicianId,
    commissionPercentage: Number(c.commissionRate) || 10,
    baseCommission,
    bonusAmount,
    commissionAmount: totalCommission,
    totalCommission,
    status: c.status === 'APPROVED' ? 'Approved' : c.status === 'PAID' ? 'Paid' : 'Pending',
    rawStatus: c.status,
    invoiceId: c.invoiceId,
    invoiceNumber: c.invoice?.invoiceNumber,
    notes: c.notes,
    activities: c.activities || [],
    createdAt: c.createdAt,
  };
}

export function CommissionProvider({ children }) {
  const { clients } = useClients();
  const { user, allUsers } = useAuth();

  const [commissions, setCommissions] = useState([]);
  const [commissionRules, setCommissionRules] = useState([]);
  const [commissionRate, setCommissionRateState] = useState(10);
  const [commissionFixedAmount, setCommissionFixedAmountState] = useState(null);
  const [commissionRuleMode, setCommissionRuleModeState] = useState('percentage'); // 'percentage' | 'fixed'
  const [summary, setSummary] = useState({
    totalBaseCommission: 0,
    totalBonusAmount: 0,
    totalEarned: 0,
    totalApproved: 0,
    totalPending: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch commissions and rules from real backend APIs
  const refreshCommissions = useCallback(async () => {
    if (!user || user.role === 'cleaner') {
      setCommissions([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch commissions
      const commRes = await commissionsApi.getAll({ limit: 100 });
      const rawCommissions = commRes?.data?.commissions || [];
      const mapped = rawCommissions.map(formatCommission);
      setCommissions(mapped);

      if (commRes?.data?.summary) {
        setSummary(commRes.data.summary);
      }

      // 2. If Manager or Reception, also fetch commission rules
      if (user.role === 'manager' || user.role === 'reception') {
        const rulesRes = await commissionsApi.getRules();
        const rules = rulesRes?.data || [];
        setCommissionRules(rules);
        const generalRule = rules.find(
          (r) =>
            r.serviceCategory?.toLowerCase() === 'general' ||
            r.serviceCategory?.toLowerCase() === 'referral' ||
            r.type === 'REFERRAL'
        );
        const targetRule = generalRule || (rules.length > 0 ? rules[0] : null);
        if (targetRule) {
          const fixed = targetRule.fixedAmount != null ? Number(targetRule.fixedAmount) : null;
          const pct = targetRule.percentage != null ? Number(targetRule.percentage) : 10;
          if (fixed != null && fixed > 0 && (pct === 0 || targetRule.type === 'REFERRAL')) {
            setCommissionFixedAmountState(fixed);
            setCommissionRateState(pct);
            setCommissionRuleModeState('fixed');
          } else {
            setCommissionRateState(pct > 0 ? pct : 10);
            setCommissionFixedAmountState(fixed);
            setCommissionRuleModeState(fixed != null && fixed > 0 && pct === 0 ? 'fixed' : 'percentage');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load commissions from backend:', err);
      setError(err?.message || 'Failed to load commissions');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCommissions();
  }, [refreshCommissions]);

  // Set Referral Commission Rule (Manager can set percentage or fixed amount)
  const setCommissionRule = useCallback(
    async ({ mode = 'percentage', percentage = 10, fixedAmount = null }) => {
      const isFixed = mode === 'fixed';
      const pct = !isFixed ? Math.max(0.1, Math.min(100, Number(percentage) || 10)) : 0;
      const fixed = isFixed ? Math.max(1, Math.round(Number(fixedAmount) || 1000)) : null;

      setCommissionRuleModeState(isFixed ? 'fixed' : 'percentage');
      if (isFixed) {
        setCommissionFixedAmountState(fixed);
        setCommissionRateState(0);
      } else {
        setCommissionRateState(pct);
        setCommissionFixedAmountState(null);
      }

      if (user?.role === 'manager') {
        try {
          await commissionsApi.saveRule({
            serviceCategory: 'General',
            percentage: pct,
            fixedAmount: fixed,
            type: 'REFERRAL',
          });
          await refreshCommissions();
          return { success: true, mode: isFixed ? 'fixed' : 'percentage', percentage: pct, fixedAmount: fixed };
        } catch (err) {
          console.error('Failed to save referral commission rule:', err);
          return { success: false, error: err?.message || 'Failed to save rule' };
        }
      }
      return { success: true };
    },
    [user, refreshCommissions]
  );

  // Backward compatible helper for setCommissionRate(percentage)
  const setCommissionRate = useCallback(
    async (newRate) => {
      return setCommissionRule({ mode: 'percentage', percentage: newRate });
    },
    [setCommissionRule]
  );

  // Save specific category commission rule (Manager)
  const saveCommissionRule = useCallback(
    async (ruleData) => {
      if (user?.role !== 'manager') return false;
      try {
        await commissionsApi.saveRule({
          serviceCategory: ruleData.serviceCategory,
          percentage: Number(ruleData.percentage),
          fixedAmount: ruleData.fixedAmount ? Number(ruleData.fixedAmount) : undefined,
        });
        await refreshCommissions();
        return true;
      } catch (err) {
        console.error('Failed to save rule on backend:', err);
        return false;
      }
    },
    [user, refreshCommissions]
  );

  // Add Bonus (Manager only)
  const addBonus = useCallback(
    async (commissionId, bonusAmount, reason = '') => {
      if (user?.role !== 'manager') return { success: false, error: 'Unauthorized' };
      try {
        const res = await commissionsApi.addBonus(commissionId, {
          bonusAmount: Number(bonusAmount),
          reason: (reason || '').trim() || 'Performance bonus awarded by Manager',
        });
        await refreshCommissions();
        return { success: true, data: res?.data };
      } catch (err) {
        console.error('Failed to add bonus on backend:', err);
        return { success: false, error: err?.message || 'Failed to add bonus' };
      }
    },
    [user, refreshCommissions]
  );

  // Adjust Commission (Manager only)
  const adjustCommission = useCallback(
    async (commissionId, data) => {
      if (user?.role !== 'manager') return { success: false, error: 'Unauthorized' };
      try {
        const payload = {
          reason: (data.reason || '').trim() || 'Manager commission adjustment',
        };
        if (data.adjustedRate !== undefined) payload.adjustedRate = Number(data.adjustedRate);
        if (data.adjustedAmount !== undefined) payload.adjustedAmount = Number(data.adjustedAmount);

        const res = await commissionsApi.adjust(commissionId, payload);
        await refreshCommissions();
        return { success: true, data: res?.data };
      } catch (err) {
        console.error('Failed to adjust commission on backend:', err);
        return { success: false, error: err?.message || 'Failed to adjust commission' };
      }
    },
    [user, refreshCommissions]
  );

  // Approve Commission (Manager only)
  const approveCommission = useCallback(
    async (commissionId) => {
      if (user?.role !== 'manager') return { success: false, error: 'Unauthorized' };
      try {
        const res = await commissionsApi.approve(commissionId);
        await refreshCommissions();
        return { success: true, data: res?.data };
      } catch (err) {
        console.error('Failed to approve commission on backend:', err);
        return { success: false, error: err?.message || 'Failed to approve commission' };
      }
    },
    [user, refreshCommissions]
  );

  // Payment completed hook: Re-fetches commissions from backend where real records are generated
  const calculateAndAddCommission = useCallback(
    async (paymentData) => {
      // Refresh to pull real database commissions generated during payment
      await refreshCommissions();
      return null;
    },
    [refreshCommissions]
  );

  // Summary for a single employee (from real backend commissions)
  const getEmployeeCommissionSummary = useCallback(
    (employeeNameOrId) => {
      if (!employeeNameOrId) {
        return { clientsReferred: 0, completedServices: 0, commissionEarned: 0 };
      }

      const matchStr = String(employeeNameOrId).toLowerCase().trim();

      // Count clients referred
      const myClients = clients.filter(
        (c) =>
          (c.introducedBy && c.introducedBy.toLowerCase().trim() === matchStr) ||
          (c.introducedById && String(c.introducedById) === matchStr)
      );

      // Count completed commission records & total earned from real backend items
      const myCommissions = commissions.filter(
        (comm) =>
          (comm.referralEmployee && comm.referralEmployee.toLowerCase().trim() === matchStr) ||
          (comm.referralEmployeeId && String(comm.referralEmployeeId) === matchStr)
      );

      const totalEarned = myCommissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

      return {
        clientsReferred: myClients.length,
        completedServices: myCommissions.length,
        commissionEarned: totalEarned,
      };
    },
    [clients, commissions]
  );

  // Performance breakdown for all technicians (Manager Report)
  const getAllEmployeeSummaries = useCallback(() => {
    const technicians = allUsers.filter(
      (u) => u.role === 'technician' && u.active !== false
    );

    return technicians.map((tech) => {
      const summary = getEmployeeCommissionSummary(tech.name);
      return {
        id: tech.id,
        name: tech.name,
        role: (tech.specialties || []).join(', ') || 'Technician',
        ...summary,
      };
    });
  }, [allUsers, getEmployeeCommissionSummary]);

  // History list sorted newest first, optionally filtered
  const getCommissionHistory = useCallback(
    (filter = {}) => {
      let list = [...commissions];

      if (filter.employeeName) {
        const empName = filter.employeeName.toLowerCase().trim();
        list = list.filter(
          (c) => c.referralEmployee && c.referralEmployee.toLowerCase().trim() === empName
        );
      }

      if (filter.clientName) {
        const cName = filter.clientName.toLowerCase().trim();
        list = list.filter(
          (c) => c.client && c.client.toLowerCase().trim().includes(cName)
        );
      }

      return list;
    },
    [commissions]
  );

  // Authoritative Salary Contract & Target Performance Summary (Phase 4)
  const getStaffSalarySummary = useCallback(async (techId, period) => {
    try {
      const res = await commissionsApi.getSalarySummary({
        technicianId: techId,
        ...(period ? { period } : {}),
      });
      return res?.data || null;
    } catch (err) {
      console.warn('Failed to fetch staff salary summary:', err);
      return null;
    }
  }, []);

  // Finalize and lock monthly payroll record (Manager only)
  const finalizeStaffPayroll = useCallback(async (employeeId, period) => {
    const res = await commissionsApi.finalizePayroll({ employeeId, period });
    return res?.data || null;
  }, []);

  return (
    <CommissionContext.Provider
      value={{
        commissionRate,
        commissionFixedAmount,
        commissionRuleMode,
        setCommissionRate,
        setCommissionRule,
        commissionRules,
        saveCommissionRule,
        commissions,
        summary,
        isLoading,
        error,
        refreshCommissions,
        addBonus,
        adjustCommission,
        approveCommission,
        calculateAndAddCommission,
        getEmployeeCommissionSummary,
        getAllEmployeeSummaries,
        getCommissionHistory,
        getStaffSalarySummary,
        finalizeStaffPayroll,
      }}
    >
      {children}
    </CommissionContext.Provider>
  );
}

export function useCommission() {
  const context = useContext(CommissionContext);
  if (!context) {
    throw new Error('useCommission must be used within a CommissionProvider');
  }
  return context;
}
