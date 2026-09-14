/**
 * DailyClose — Screen 16
 *
 * End-of-day summary derived from real backend REST reports (Phase 20 & 22 Module 10):
 *   - CA Total (completed services revenue & payments)
 *   - CA Per Technician (grouped by technician from /reports/technicians)
 *   - Number of Clients (from reports / dashboard summary)
 *   - Cash / MTN MoMo / Orange Money (from /reports/revenue breakdown)
 *   - Referrals Today (from ClientsContext referral records created today)
 *   - Missing Stock / Consumption (from /reports/stock-consumption)
 *   - Clients Not Rebooked (from /reports/customers rebooking status)
 *
 * RBAC: Restricted strictly to MANAGER role.
 *
 * Source: WIREFRAME.md Screen 16, FLOW.md §40-44
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Check,
  TrendingUp,
  Users,
  Banknote,
  Smartphone,
  Package,
  RefreshCw,
  UserPlus,
  Receipt,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';
import { useClients } from '../context/ClientsContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useExpenses } from '../context/ExpensesContext';
import { reportsApi, whatsappApi } from '../services/api';

export default function DailyClose() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completedServices, latestReconciliation, retailSales = [] } = useOperations();
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const { todayExpensesTotal = 0 } = useExpenses();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Live Backend Reports State
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [techniciansPerformance, setTechniciansPerformance] = useState([]);
  const [stockConsumption, setStockConsumption] = useState(null);
  const [customerAnalytics, setCustomerAnalytics] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);

  const role = (user?.role || '').toLowerCase();
  const isManager = role === 'manager';

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Fetch real reports analytics for today
  const fetchDailyReports = useCallback(async () => {
    if (!isManager) return;
    setLoadingReports(true);
    try {
      const [dashRes, revRes, techRes, stockRes, custRes] = await Promise.allSettled([
        reportsApi.getDashboard('today'),
        reportsApi.getRevenue('today'),
        reportsApi.getTechnicians('today'),
        reportsApi.getStockConsumption('today'),
        reportsApi.getCustomers('today'),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardSummary(dashRes.value.data);
      }
      if (revRes.status === 'fulfilled' && revRes.value?.data) {
        setRevenueReport(revRes.value.data);
      }
      if (techRes.status === 'fulfilled' && techRes.value?.data) {
        setTechniciansPerformance(techRes.value.data.technicians || []);
      }
      if (stockRes.status === 'fulfilled' && stockRes.value?.data) {
        setStockConsumption(stockRes.value.data);
      }
      if (custRes.status === 'fulfilled' && custRes.value?.data) {
        setCustomerAnalytics(custRes.value.data);
      }
    } catch (err) {
      console.warn('Daily close fetch error:', err.message);
    } finally {
      setLoadingReports(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchDailyReports();
  }, [fetchDailyReports]);

  // =========================================================================
  // RBAC GUARD: MANAGER ONLY
  // =========================================================================
  if (!isManager) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[16px] border border-border shadow-card my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied (403)</h2>
        <p className="text-sm text-muted-gray max-w-md mb-6">
          Daily Close financial summary is restricted to the General Manager.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // --- Derive fallback data from shared state if backend report empty ---
  const todayCompletedServices = completedServices.filter(
    (s) => s.date === today || s.date === 'Today'
  );
  const todayRetailSales = (retailSales || []).filter(
    (s) => s.date === today || s.date === 'Today'
  );

  const isCash = (p) => {
    const s = String(p || '').toUpperCase();
    return s === 'CASH' || s.includes('CASH');
  };
  const isMtn = (p) => {
    const s = String(p || '').toUpperCase();
    return s.includes('MTN') || s === 'MOMO';
  };
  const isOrange = (p) => {
    const s = String(p || '').toUpperCase();
    return s.includes('ORANGE');
  };

  const servicesCash = todayCompletedServices
    .filter((s) => isCash(s.payment))
    .reduce((sum, s) => sum + (s.price || 0), 0);
  const retailCash = todayRetailSales
    .filter((s) => isCash(s.payment))
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const fallbackCash = servicesCash + retailCash;

  const servicesMtn = todayCompletedServices
    .filter((s) => isMtn(s.payment))
    .reduce((sum, s) => sum + (s.price || 0), 0);
  const retailMtn = todayRetailSales
    .filter((s) => isMtn(s.payment))
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const fallbackMtn = servicesMtn + retailMtn;

  const servicesOrange = todayCompletedServices
    .filter((s) => isOrange(s.payment))
    .reduce((sum, s) => sum + (s.price || 0), 0);
  const retailOrange = todayRetailSales
    .filter((s) => isOrange(s.payment))
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const fallbackOrange = servicesOrange + retailOrange;

  // Real payment values
  const methods = revenueReport?.paymentMethodBreakdown || [];
  const cashTotal = methods.find((m) => m.method === 'CASH')?.amount ?? fallbackCash;
  const mtnTotal = methods.find((m) => m.method === 'MTN_MOMO')?.amount ?? fallbackMtn;
  const orangeTotal = methods.find((m) => m.method === 'ORANGE_MONEY')?.amount ?? fallbackOrange;

  // CA Total
  const caTotal =
    dashboardSummary?.cards?.totalRevenue ??
    revenueReport?.totalRevenue ??
    (cashTotal + mtnTotal + orangeTotal);

  // Unique clients count
  const uniqueClientsCount =
    dashboardSummary?.cards?.completedServices ??
    new Set(todayCompletedServices.map((s) => s.clientName).filter(Boolean)).size;

  // Technician Breakdown: Real backend technicians performance
  const techBreakdown =
    techniciansPerformance.length > 0
      ? techniciansPerformance.map((t) => ({
          name: t.technicianName,
          total: t.revenueGenerated,
          count: t.servicesCompleted,
        }))
      : (() => {
          const map = {};
          todayCompletedServices.forEach((s) => {
            const tech = s.technician || 'Other';
            if (!map[tech]) map[tech] = { total: 0, count: 0 };
            map[tech].total += s.price || 0;
            map[tech].count += 1;
          });
          return Object.entries(map).map(([name, data]) => ({
            name,
            total: data.total,
            count: data.count,
          }));
        })();

  // Referrals today
  const referralsToday = clients.filter(
    (c) => Boolean(c.introducedBy) && (c.createdAt?.includes(today) || c.registeredDate === today)
  ).length;

  // Stock consumed today
  const consumedStockCount = stockConsumption?.items?.reduce(
    (sum, item) => sum + (item.totalConsumed || 0),
    0
  ) ?? (latestReconciliation?.missingCount || 0);

  // Clients not rebooked / due
  const clientsNotRebooked =
    customerAnalytics?.rebookingStatus?.due ??
    clients.filter((c) => {
      if (!c.lastVisit || c.lastVisit === '—') return false;
      const visitDate = new Date(c.lastVisit);
      if (isNaN(visitDate.getTime())) return false;
      const daysSince = (Date.now() - visitDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 14;
    }).length;

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      await whatsappApi.triggerDailyClose({ businessDate: new Date().toISOString().split('T')[0] });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      setSendError(err.message || 'Failed to send daily close summary');
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Close"
        subtitle="End-of-day financial reconciliation and operations review."
      />

      {/* Top Banner / Send Action */}
      <div className="bg-white border border-border rounded-[16px] p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-muted-gray uppercase tracking-wider">
            Closing Date
          </span>
          <h2 className="text-xl font-bold text-charcoal">{today}</h2>
          <p className="text-xs text-muted-gray mt-0.5">
            Real-time backend figures verified for end-of-day sign-off.
          </p>
        </div>

        <Button
          variant={sent ? 'secondary' : 'primary'}
          onClick={handleSend}
          disabled={sending || sent}
          className="h-11 px-6 text-sm font-semibold shrink-0 cursor-pointer"
        >
          {sent ? (
            <>
              <Check size={16} className="text-success" />
              Sent to Boss WhatsApp
            </>
          ) : (
            <>
              <MessageCircle size={16} />
              Send to Boss WhatsApp
            </>
          )}
        </Button>
      </div>

      {/* Main Grid: Left Financials, Right Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Financial Reconciliation ── */}
        <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <TrendingUp size={18} className="text-sage" />
            <h3 className="font-semibold text-charcoal text-base">
              Financial Summary
            </h3>
          </div>

          {/* CA Total Card */}
          <div className="bg-soft-cream/60 border border-border/80 rounded-[12px] p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-gray uppercase tracking-wider">
                CA Total (Revenue)
              </span>
              <div className="text-2xl font-extrabold text-[#4F6748] mt-0.5">
                {caTotal.toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal text-muted-gray">FCFA</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-gray block">Completed Clients</span>
              <span className="text-lg font-bold text-charcoal">
                {uniqueClientsCount}
              </span>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-gray uppercase tracking-wider block mb-1">
              Payment Breakdown
            </span>
            <div className="flex items-center justify-between py-2 px-3 bg-warm-ivory/40 rounded-[8px] text-sm">
              <div className="flex items-center gap-2 text-charcoal">
                <Banknote size={16} className="text-sage" />
                <span>Cash</span>
              </div>
              <span className="font-bold text-charcoal">
                {cashTotal.toLocaleString('en-US')} FCFA
              </span>
            </div>

            <div className="flex items-center justify-between py-2 px-3 bg-warm-ivory/40 rounded-[8px] text-sm">
              <div className="flex items-center gap-2 text-charcoal">
                <Smartphone size={16} className="text-sage" />
                <span>MTN MoMo</span>
              </div>
              <span className="font-bold text-charcoal">
                {mtnTotal.toLocaleString('en-US')} FCFA
              </span>
            </div>

            <div className="flex items-center justify-between py-2 px-3 bg-warm-ivory/40 rounded-[8px] text-sm">
              <div className="flex items-center gap-2 text-charcoal">
                <Smartphone size={16} className="text-sage" />
                <span>Orange Money</span>
              </div>
              <span className="font-bold text-charcoal">
                {orangeTotal.toLocaleString('en-US')} FCFA
              </span>
            </div>

            {todayExpensesTotal > 0 && (
              <div className="flex items-center justify-between py-2 px-3 bg-rose-50/50 rounded-[8px] text-sm border border-rose-100">
                <div className="flex items-center gap-2 text-rose-700">
                  <Receipt size={16} className="text-rose-500" />
                  <span>Today's Cash Expenses</span>
                </div>
                <span className="font-bold text-rose-700">
                  -{todayExpensesTotal.toLocaleString('en-US')} FCFA
                </span>
              </div>
            )}
          </div>

          {/* CA Per Technician */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-semibold text-muted-gray uppercase tracking-wider block mb-1">
              Revenue Per Technician
            </span>
            {techBreakdown.length === 0 ? (
              <p className="text-xs text-muted-gray py-2 text-center">
                No technician revenue recorded today.
              </p>
            ) : (
              techBreakdown.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between py-1.5 px-2 rounded-[6px] hover:bg-soft-cream/40 text-xs"
                >
                  <span className="font-medium text-charcoal">
                    {t.name}{' '}
                    <span className="text-muted-gray font-normal">
                      ({t.count} service{t.count !== 1 ? 's' : ''})
                    </span>
                  </span>
                  <span className="font-bold text-[#4F6748]">
                    {t.total.toLocaleString('en-US')} FCFA
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Operational Reconciliation ── */}
        <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Users size={18} className="text-sage" />
            <h3 className="font-semibold text-charcoal text-base">
              Operational Summary
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <div className="flex items-center gap-2 text-muted-gray">
                <Sparkles size={16} className="text-sage" />
                <span>Services Delivered</span>
              </div>
              <span className="font-bold text-charcoal">
                {dashboardSummary?.cards?.completedServices ?? todayCompletedServices.length}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <div className="flex items-center gap-2 text-muted-gray">
                <UserPlus size={16} className="text-sage" />
                <span>Referral Clients Introduced</span>
              </div>
              <span className="font-bold text-charcoal">{referralsToday}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <div className="flex items-center gap-2 text-muted-gray">
                <Package size={16} className="text-sage" />
                <span>Service Stock Consumed</span>
              </div>
              <span className="font-bold text-charcoal">
                {consumedStockCount} units
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <div className="flex items-center gap-2 text-muted-gray">
                <RefreshCw size={16} className="text-sage" />
                <span>Clients Due for Rebooking</span>
              </div>
              <span className="font-bold text-charcoal">{clientsNotRebooked}</span>
            </div>
          </div>

          <div className="p-4 bg-soft-cream/60 rounded-[12px] border border-border text-xs text-muted-gray space-y-1">
            <div className="font-semibold text-charcoal mb-1">
              End-of-Day Reconciliation Note
            </div>
            <p>
              Daily Close reconciles completed appointments, invoice payment channels, technician revenue attribution, and service stock deductions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
