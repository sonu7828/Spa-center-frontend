/**
 * LoyaltyContext — Real Backend Integrated Loyalty & Customer Retention State
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/loyalty):
 *   - GET    /api/v1/loyalty/settings (Manager, Reception)
 *   - PATCH  /api/v1/loyalty/settings (Manager only)
 *   - GET    /api/v1/loyalty/clients/:clientId (Manager, Reception, Technician)
 *   - POST   /api/v1/loyalty/clients/:clientId/adjust (Manager only)
 *   - POST   /api/v1/loyalty/clients/:clientId/reward (Manager, Reception)
 *   - GET    /api/v1/loyalty/rewards/upcoming (Manager, Reception)
 *   - POST   /api/v1/loyalty/invoices/:id/redeem (Manager, Reception)
 *   - GET    /api/v1/loyalty/rebooking (Manager, Reception)
 *
 * Core Rules:
 *   - Real backend data is the source of truth.
 *   - No fake points calculation in frontend.
 *   - Points earned automatically upon invoice payment.
 *   - RBAC: Manager full control, Reception operational view & redeem, Technician view only, Cleaner blocked.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { loyaltyApi } from '../services/api';
import { useAuth } from './AuthContext';

const LoyaltyContext = createContext();

const DEFAULT_SETTINGS = {
  spendAmountForPoint: 1000,
  pointsPerSpend: 1,
  pointsForDiscount: 100,
  discountAmount: 2500,
  minPointsToRedeem: 100,
  birthdayRewardPoints: 50,
  anniversaryRewardPoints: 75,
  pointsExpiryEnabled: false,
  expiryDays: 365,
};

export function LoyaltyProvider({ children }) {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || '';
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const isTechnician = role === 'technician';
  const isCleaner = role === 'cleaner';

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [clientLoyaltyCache, setClientLoyaltyCache] = useState({});
  const [upcomingCelebrations, setUpcomingCelebrations] = useState([]);
  const [rebookingClients, setRebookingClients] = useState([]);
  const [rebookingSummary, setRebookingSummary] = useState({
    totalDue: 0,
    totalOverdue: 0,
    totalLapsed: 0,
    totalActionable: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refresh general loyalty data (settings, celebrations, rebooking)
  const refreshLoyalty = useCallback(async () => {
    if (!user || isCleaner) {
      setUpcomingCelebrations([]);
      setRebookingClients([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch settings if Manager or Reception
      if (isManager || isReception) {
        const [settingsRes, upcomingRes, rebookingRes] = await Promise.allSettled([
          loyaltyApi.getSettings(),
          loyaltyApi.getUpcomingRewards(30),
          loyaltyApi.getRebooking(),
        ]);

        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
          setSettings((prev) => ({ ...prev, ...settingsRes.value.data }));
        }

        if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.data?.celebrations) {
          setUpcomingCelebrations(upcomingRes.value.data.celebrations);
        }

        if (rebookingRes.status === 'fulfilled' && rebookingRes.value?.data) {
          setRebookingClients(rebookingRes.value.data.clients || []);
          if (rebookingRes.value.data.summary) {
            setRebookingSummary(rebookingRes.value.data.summary);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load loyalty data from backend:', err);
      setError(err?.message || 'Failed to load loyalty data');
    } finally {
      setIsLoading(false);
    }
  }, [user, isManager, isReception, isCleaner]);

  useEffect(() => {
    refreshLoyalty();
  }, [refreshLoyalty]);

  // Fetch client loyalty profile from backend
  const fetchClientLoyalty = useCallback(async (clientId) => {
    if (!clientId) return null;
    try {
      const res = await loyaltyApi.getClientLoyalty(clientId);
      if (res?.data) {
        const data = res.data;
        const formatted = {
          client: data.client || null,
          balance: data.balance ?? 0,
          totalEarned: data.totalEarned ?? 0,
          totalRedeemed: data.totalRedeemed ?? 0,
          history: (data.history || []).map((h) => ({
            id: h.id,
            date: new Date(h.createdAt || h.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            source: h.source || h.type,
            points: h.type === 'REDEEM' ? -Math.abs(h.points) : h.points,
            balance: h.balanceAfter ?? h.points,
            type: h.type?.toLowerCase() || 'earn',
            invoice: h.invoice,
          })),
        };
        setClientLoyaltyCache((prev) => ({ ...prev, [clientId]: formatted }));
        return formatted;
      }
    } catch (err) {
      console.warn('Failed to fetch client loyalty:', err);
    }
    return null;
  }, []);

  // Synchronous client loyalty getter (from cache or default)
  const getClientLoyalty = useCallback(
    (clientId) => {
      if (!clientId) {
        return { balance: 0, totalEarned: 0, totalRedeemed: 0, history: [] };
      }
      return (
        clientLoyaltyCache[clientId] || {
          balance: 0,
          totalEarned: 0,
          totalRedeemed: 0,
          history: [],
        }
      );
    },
    [clientLoyaltyCache]
  );

  // Update Settings (Manager only)
  const updateSettings = useCallback(
    async (newSettings) => {
      if (!isManager) {
        console.warn('Unauthorized: Only Manager can update loyalty settings');
        return false;
      }
      try {
        const res = await loyaltyApi.updateSettings(newSettings);
        if (res?.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
        await refreshLoyalty();
        return true;
      } catch (err) {
        console.error('Failed to update loyalty settings on backend:', err);
        return false;
      }
    },
    [isManager, refreshLoyalty]
  );

  // Adjust Points (Manager only)
  const adjustPoints = useCallback(
    async (clientId, { pointsDelta, reason }) => {
      if (!isManager) {
        return { success: false, error: 'Unauthorized: Only Manager can adjust points' };
      }
      try {
        const res = await loyaltyApi.adjustPoints(clientId, {
          pointsDelta: Number(pointsDelta),
          reason: (reason || '').trim() || 'Manual adjustment by Manager',
        });
        await fetchClientLoyalty(clientId);
        await refreshLoyalty();
        return { success: true, data: res?.data };
      } catch (err) {
        console.error('Failed to adjust points on backend:', err);
        return { success: false, error: err?.message || 'Failed to adjust points' };
      }
    },
    [isManager, fetchClientLoyalty, refreshLoyalty]
  );

  // Award Celebration Reward (Manager & Reception)
  const awardReward = useCallback(
    async (clientId, { rewardType, points, note }) => {
      if (!isManager && !isReception) {
        return { success: false, error: 'Unauthorized' };
      }
      try {
        const payload = {
          rewardType: rewardType.toUpperCase(),
          note: note || `${rewardType} celebration reward`,
        };
        if (points) payload.points = Number(points);

        const res = await loyaltyApi.awardReward(clientId, payload);
        await fetchClientLoyalty(clientId);
        await refreshLoyalty();
        return { success: true, data: res?.data };
      } catch (err) {
        console.error('Failed to award celebration reward:', err);
        return { success: false, error: err?.message || 'Failed to award reward' };
      }
    },
    [isManager, isReception, fetchClientLoyalty, refreshLoyalty]
  );

  // Redeem points for invoice during checkout (Manager & Reception)
  const redeemPoints = useCallback(
    async (invoiceId, pointsToRedeem) => {
      if (!isManager && !isReception) {
        return { success: false, error: 'Unauthorized' };
      }
      try {
        const res = await loyaltyApi.redeem(invoiceId, {
          pointsToRedeem: Number(pointsToRedeem),
        });
        await refreshLoyalty();
        return { success: true, data: res?.data };
      } catch (err) {
        console.error('Failed to redeem points on backend:', err);
        return { success: false, error: err?.message || 'Failed to redeem points' };
      }
    },
    [isManager, isReception, refreshLoyalty]
  );

  // Legacy calculateEarnedPoints helper based on live backend settings
  const calculateEarnedPoints = useCallback(
    (spendingAmount, serviceName) => {
      const cleanAmount =
        typeof spendingAmount === 'number'
          ? spendingAmount
          : parseInt(String(spendingAmount || '0').replace(/[^0-9]/g, ''), 10) || 0;

      if (!settings.spendAmountForPoint || settings.spendAmountForPoint <= 0) return 0;
      return Math.floor(cleanAmount / settings.spendAmountForPoint) * (settings.pointsPerSpend || 1);
    },
    [settings]
  );

  // Calculate discount amount from points based on live backend settings
  const calculateDiscount = useCallback(
    (pointsToRedeem) => {
      const pts = Number(pointsToRedeem) || 0;
      if (pts < (settings.minPointsToRedeem || 100) || !settings.pointsForDiscount || settings.pointsForDiscount <= 0) {
        return 0;
      }
      return Math.floor(pts / settings.pointsForDiscount) * (settings.discountAmount || 2500);
    },
    [settings]
  );

  // Earn points fallback trigger for local consistency
  const earnPoints = useCallback(
    async (clientId) => {
      await fetchClientLoyalty(clientId);
    },
    [fetchClientLoyalty]
  );

  return (
    <LoyaltyContext.Provider
      value={{
        settings,
        updateSettings,
        calculateEarnedPoints,
        calculateDiscount,
        getClientLoyalty,
        fetchClientLoyalty,
        adjustPoints,
        awardReward,
        redeemPoints,
        earnPoints,
        upcomingCelebrations,
        rebookingClients,
        rebookingSummary,
        isLoading,
        error,
        refreshLoyalty,
      }}
    >
      {children}
    </LoyaltyContext.Provider>
  );
}

export function useLoyalty() {
  const context = useContext(LoyaltyContext);
  if (!context) {
    throw new Error('useLoyalty must be used within a LoyaltyProvider');
  }
  return context;
}
