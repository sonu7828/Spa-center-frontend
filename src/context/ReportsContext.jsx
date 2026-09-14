/**
 * ReportsContext — Centralized Analytics & Reports State Management (Phase 20 & Phase 22 Module 10)
 *
 * Provides real-time reports data from backend REST APIs:
 *   - GET /api/v1/reports/dashboard
 *   - GET /api/v1/reports/revenue
 *   - GET /api/v1/reports/appointments
 *   - GET /api/v1/reports/top-services
 *   - GET /api/v1/reports/technicians
 *   - GET /api/v1/reports/technicians/me
 *   - GET /api/v1/reports/technicians/:id
 *   - GET /api/v1/reports/stock-consumption
 *   - GET /api/v1/reports/customers
 *
 * Features:
 *   - Supports filter periods: 'today', 'weekly', 'monthly', 'custom'
 *   - Custom date range selection (startDate, endDate)
 *   - Role-Aware Data Isolation (Manager, Reception, Technician, Cleaner)
 *   - Zero mock data; backend database is single source of truth
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { reportsApi } from '../services/api';

const ReportsContext = createContext(null);

export function ReportsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [period, setPeriod] = useState('today'); // 'today' | 'weekly' | 'monthly' | 'custom'
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [appointmentAnalytics, setAppointmentAnalytics] = useState(null);
  const [topServices, setTopServices] = useState(null);
  const [techniciansPerformance, setTechniciansPerformance] = useState([]);
  const [myPerformance, setMyPerformance] = useState(null);
  const [stockConsumption, setStockConsumption] = useState(null);
  const [customerAnalytics, setCustomerAnalytics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const role = (user?.role || '').toLowerCase();
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const isTechnician = role === 'technician';
  const isCleaner = role === 'cleaner';

  // Build query parameter object based on period and custom dates
  const queryParams = useMemo(() => {
    if (period === 'custom' && customDateRange.startDate && customDateRange.endDate) {
      return {
        period: 'custom',
        startDate: customDateRange.startDate,
        endDate: customDateRange.endDate,
      };
    }
    return period;
  }, [period, customDateRange]);

  const refreshReports = useCallback(async () => {
    if (!isAuthenticated || !user || isCleaner) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isTechnician) {
        // Technician role: strictly own performance
        const res = await reportsApi.getMyPerformance(queryParams);
        setMyPerformance(res?.data || null);
      } else if (isManager || isReception) {
        // Fetch common operational analytics
        const promises = [
          reportsApi.getDashboard(queryParams),
          reportsApi.getRevenue(queryParams),
          reportsApi.getAppointments(queryParams),
          reportsApi.getTopServices(queryParams),
          reportsApi.getTechnicians(queryParams),
          reportsApi.getCustomers(queryParams),
        ];

        // Manager additionally gets stock consumption analytics
        if (isManager) {
          promises.push(reportsApi.getStockConsumption(queryParams));
        }

        const results = await Promise.allSettled(promises);

        const [dashRes, revRes, apptRes, topRes, techRes, custRes, stockRes] = results;

        if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
          setDashboardSummary(dashRes.value.data);
        }
        if (revRes.status === 'fulfilled' && revRes.value?.data) {
          setRevenueReport(revRes.value.data);
        }
        if (apptRes.status === 'fulfilled' && apptRes.value?.data) {
          setAppointmentAnalytics(apptRes.value.data);
        }
        if (topRes.status === 'fulfilled' && topRes.value?.data) {
          setTopServices(topRes.value.data);
        }
        if (techRes.status === 'fulfilled' && techRes.value?.data) {
          setTechniciansPerformance(techRes.value.data.technicians || []);
        }
        if (custRes.status === 'fulfilled' && custRes.value?.data) {
          setCustomerAnalytics(custRes.value.data);
        }
        if (stockRes && stockRes.status === 'fulfilled' && stockRes.value?.data) {
          setStockConsumption(stockRes.value.data);
        }
      }
    } catch (err) {
      console.warn('Reports fetch error:', err.message);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, isCleaner, isTechnician, isManager, isReception, queryParams]);

  // Initial and reactive load whenever queryParams or user changes
  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  // Specific technician report by ID (for manager drilldown)
  const getTechnicianPerformanceById = useCallback(
    async (id, overridePeriod) => {
      try {
        const p = overridePeriod || queryParams;
        const res = await reportsApi.getTechnician(id, p);
        return res?.data || null;
      } catch (err) {
        console.warn('Error fetching technician report by ID:', err.message);
        return null;
      }
    },
    [queryParams]
  );

  const value = {
    period,
    setPeriod,
    customDateRange,
    setCustomDateRange,
    dashboardSummary,
    revenueReport,
    appointmentAnalytics,
    topServices,
    techniciansPerformance,
    myPerformance,
    stockConsumption,
    customerAnalytics,
    loading,
    error,
    refreshReports,
    getTechnicianPerformanceById,
  };

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}
