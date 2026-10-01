/**
 * WhatsAppAutomations — Screen 18 (Phase 21 & Phase 22 Module 11)
 *
 * WhatsApp Automation Engine & Live Audit Logs.
 *
 * All 8 Backend Automations:
 *   1. Birthday Greeting (BIRTHDAY)
 *   2. Anniversary Greeting (ANNIVERSARY)
 *   3. Appointment 24 Hours Reminder (APPOINTMENT_24H)
 *   4. Appointment 2 Hours Reminder (APPOINTMENT_2H)
 *   5. After Service Thank You (AFTER_SERVICE)
 *   6. Payment Confirmation (PAYMENT_CONFIRMATION)
 *   7. Rebooking Reminder (REBOOKING)
 *   8. Daily Close Boss Summary (DAILY_CLOSE_BOSS)
 *
 * Features:
 *   - Real backend API integration (GET /automations, PATCH /automations/:type)
 *   - Live Audit Logs (GET /logs, POST /logs/:id/retry)
 *   - Status Badges: QUEUED, PENDING, SENT, DELIVERED, FAILED
 *   - Database-driven Reminders Trigger (POST /triggers/process-reminders)
 *   - Daily Close Boss Trigger (POST /triggers/daily-close)
 *   - RBAC:
 *       MANAGER: Full access (edit templates, toggle, trigger daily close & reminders, retry logs)
 *       RECEPTION: Operational access (view automations, view logs, send messages, retry logs; cannot edit templates or trigger daily close)
 *       TECHNICIAN / CLEANER: Blocked with luxury 403 Access Denied screen
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cake,
  Heart,
  Bell,
  Clock,
  RefreshCw,
  FileText,
  TrendingUp,
  X,
  Check,
  MessageCircle,
  Search,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  RotateCw,
  ArrowUpDown,
  Filter,
  CreditCard,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useWhatsApp } from '../context/WhatsAppContext';
import { useAuth } from '../context/AuthContext';

const AUTOMATION_ICONS = {
  BIRTHDAY: Cake,
  ANNIVERSARY: Heart,
  APPOINTMENT_24H: Bell,
  APPOINTMENT_2H: Clock,
  AFTER_SERVICE: FileText,
  PAYMENT_CONFIRMATION: CreditCard,
  REBOOKING: RefreshCw,
  DAILY_CLOSE_BOSS: TrendingUp,
};

const AUTOMATION_COLORS = {
  BIRTHDAY: { bg: 'bg-[#FFF5E6]', border: 'border-[#F0C060]/30', text: 'text-[#C08020]', dot: 'bg-[#F0C060]' },
  ANNIVERSARY: { bg: 'bg-[#FCE4EC]', border: 'border-[#E57373]/30', text: 'text-[#C62828]', dot: 'bg-[#E57373]' },
  APPOINTMENT_24H: { bg: 'bg-[#E8F5E9]', border: 'border-[#66BB6A]/30', text: 'text-[#2E7D32]', dot: 'bg-[#66BB6A]' },
  APPOINTMENT_2H: { bg: 'bg-[#E3F2FD]', border: 'border-[#42A5F5]/30', text: 'text-[#1565C0]', dot: 'bg-[#42A5F5]' },
  AFTER_SERVICE: { bg: 'bg-[#E0F2F1]', border: 'border-[#26A69A]/30', text: 'text-[#00695C]', dot: 'bg-[#26A69A]' },
  PAYMENT_CONFIRMATION: { bg: 'bg-[#F3E5F5]', border: 'border-[#AB47BC]/30', text: 'text-[#6A1B9A]', dot: 'bg-[#AB47BC]' },
  REBOOKING: { bg: 'bg-[#EFEBE9]', border: 'border-[#8D6E63]/30', text: 'text-[#4E342E]', dot: 'bg-[#8D6E63]' },
  DAILY_CLOSE_BOSS: { bg: 'bg-sage-soft', border: 'border-sage/30', text: 'text-[#4F6748]', dot: 'bg-sage' },
};

export default function WhatsAppAutomations() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    automations = [],
    logs = [],
    pagination,
    automationsLoading,
    logsLoading,
    fetchAutomations,
    updateAutomation,
    toggleAutomation,
    fetchLogs,
    retryMessage,
    processReminders,
    triggerDailyClose,
  } = useWhatsApp();

  const role = (user?.role || '').toLowerCase();
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const isBlocked = !isManager && !isReception;

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState('automations'); // 'automations' | 'logs'

  // Status message alerts
  const [alertNotice, setAlertNotice] = useState(null);

  // Log filter state
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Process triggers state
  const [processingReminders, setProcessingReminders] = useState(false);
  const [triggeringDailyClose, setTriggeringDailyClose] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState(null);

  // =========================================================================
  // RBAC GUARD: TECHNICIAN & CLEANER ACCESS DENIED
  // =========================================================================
  if (isBlocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[16px] border border-border shadow-card my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied (403)</h2>
        <p className="text-sm text-muted-gray max-w-md mb-6">
          WhatsApp automations, reminders triggers, and message audit logs are restricted to Manager and Reception roles.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  const activeAutomationsCount = automations.filter((a) => a.isActive).length;

  const showNotification = (msg, isError = false) => {
    setAlertNotice({ message: msg, isError });
    setTimeout(() => setAlertNotice(null), 5000);
  };

  // Toggle automation active/inactive (Works dynamically in DB and dispatch engine)
  const handleToggle = async (auto) => {
    if (!isManager) {
      showNotification('Receptionists can only view automation status. Manager permission required to toggle.', true);
      return;
    }
    try {
      await toggleAutomation(auto.type);
      showNotification(`${auto.title} ${!auto.isActive ? 'enabled (will auto-send)' : 'disabled (skipped from sending)'}.`);
    } catch (err) {
      showNotification(err.message || 'Error toggling automation', true);
    }
  };

  // Process reminders button handler
  const handleProcessReminders = async () => {
    setProcessingReminders(true);
    try {
      const res = await processReminders();
      const count = res?.data?.processedCount ?? 0;
      const s24 = res?.data?.reminders24hSent ?? 0;
      const s2 = res?.data?.reminders2hSent ?? 0;
      showNotification(`Reminders processed! Evaluated ${count} bookings (${s24} sent for 24h, ${s2} sent for 2h).`);
    } catch (err) {
      showNotification(err.message || 'Failed to process reminders', true);
    } finally {
      setProcessingReminders(false);
    }
  };

  // Trigger Daily Close handler (Manager only)
  const handleTriggerDailyClose = async () => {
    if (!isManager) return;
    setTriggeringDailyClose(true);
    try {
      const savedBossPhone = localStorage.getItem('omega_boss_phone');
      await triggerDailyClose(savedBossPhone ? { recipientPhone: savedBossPhone } : {});
      showNotification('Daily close summary successfully queued and dispatched to Boss WhatsApp.');
    } catch (err) {
      showNotification(err.message || 'Failed to trigger daily close', true);
    } finally {
      setTriggeringDailyClose(false);
    }
  };

  // Retry log handler
  const handleRetryLog = async (logId) => {
    setRetryingLogId(logId);
    try {
      await retryMessage(logId);
      showNotification('Message retry triggered successfully.');
    } catch (err) {
      showNotification(err.message || 'Failed to retry message', true);
    } finally {
      setRetryingLogId(null);
    }
  };



  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logStatusFilter !== 'ALL' && log.status !== logStatusFilter) return false;
      if (logTypeFilter !== 'ALL' && log.automationType !== logTypeFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const clientName = (log.client?.name || '').toLowerCase();
        const phone = (log.recipientPhone || '').toLowerCase();
        const msg = (log.message || '').toLowerCase();
        return clientName.includes(q) || phone.includes(q) || msg.includes(q);
      }
      return true;
    });
  }, [logs, logStatusFilter, logTypeFilter, logSearch]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="WhatsApp Automation & Logs"
        subtitle="Automated client engagement engine, transactional receipts, and real-time delivery audit logs."
      />

      {/* ── Top Notification Banner ── */}
      {alertNotice && (
        <div
          className={`p-3.5 rounded-[12px] text-xs font-semibold flex items-center gap-2.5 shadow-xs transition-all ${
            alertNotice.isError
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-success-soft border border-success/30 text-[#4F6748]'
          }`}
        >
          {alertNotice.isError ? (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          ) : (
            <CheckCircle size={16} className="text-success shrink-0" />
          )}
          <span>{alertNotice.message}</span>
        </div>
      )}

      {/* ── KPI Summary & Operational Actions ── */}
      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="px-3.5 py-2.5 bg-soft-cream/60 rounded-[12px] border border-border/70 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
              Automations
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-charcoal block mt-0.5">
              {automations.length} Engine
            </span>
          </div>

          <div className="px-3.5 py-2.5 bg-sage-soft rounded-[12px] border border-sage/30 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6748] block">
              Active Status
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-[#4F6748] block mt-0.5">
              {activeAutomationsCount} / {automations.length} ON
            </span>
          </div>

          <div className="px-3.5 py-2.5 bg-warm-ivory rounded-[12px] border border-border/70 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
              Total Logged
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-charcoal block mt-0.5">
              {pagination.total} Msgs
            </span>
          </div>
        </div>

        {/* Global Trigger Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
          <Button
            variant="secondary"
            onClick={handleProcessReminders}
            disabled={processingReminders}
            className="h-10 text-xs px-3.5 font-semibold cursor-pointer shrink-0"
          >
            <RotateCw size={14} className={processingReminders ? 'animate-spin' : ''} />
            {processingReminders ? 'Processing...' : 'Run Reminders (24h/2h)'}
          </Button>

          {isManager && (
            <Button
              variant="secondary"
              onClick={handleTriggerDailyClose}
              disabled={triggeringDailyClose}
              className="h-10 text-xs px-3.5 font-semibold cursor-pointer shrink-0"
            >
              <TrendingUp size={14} />
              {triggeringDailyClose ? 'Sending...' : 'Trigger Daily Close'}
            </Button>
          )}

        </div>
      </div>

      {/* ── Top Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 p-1 bg-soft-cream/80 border border-border rounded-[12px] max-w-fit shadow-2xs">
        <button
          onClick={() => setActiveTab('automations')}
          className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
            activeTab === 'automations'
              ? 'bg-white text-charcoal shadow-xs border border-border/60 font-bold'
              : 'text-muted-gray hover:text-charcoal'
          }`}
        >
          <Sparkles size={14} className="text-sage" />
          Automations Engine ({automations.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-white text-charcoal shadow-xs border border-border/60 font-bold'
              : 'text-muted-gray hover:text-charcoal'
          }`}
        >
          <FileText size={14} className="text-sage" />
          Message Audit Logs ({pagination.total})
        </button>
      </div>

      {/* =====================================================================
          TAB 1: AUTOMATIONS ENGINE (ALL 8 LIVE AUTOMATIONS)
         ===================================================================== */}
      {activeTab === 'automations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-charcoal">
              Standard Automation Rules
            </h2>
            <span className="text-xs text-muted-gray">
              {isManager ? 'Manager: Toggle ON/OFF to activate or deactivate automations.' : 'Reception: Operational view only.'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((auto) => {
              const IconComponent = AUTOMATION_ICONS[auto.type] || MessageCircle;
              const color = AUTOMATION_COLORS[auto.type] || AUTOMATION_COLORS.BIRTHDAY;

              return (
                <div
                  key={auto.type}
                  className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div>
                    <div className="px-5 py-4 border-b border-border/60 flex items-start justify-between gap-3 bg-warm-ivory/30">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-[12px] ${color.bg} border ${color.border} flex items-center justify-center ${color.text} shrink-0 shadow-2xs`}
                        >
                          <IconComponent size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-charcoal">{auto.title}</h3>
                            <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-soft-cream border border-border text-muted-gray">
                              {auto.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-gray mt-0.5">{auto.description}</p>
                        </div>
                      </div>

                      {/* Active Toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(auto)}
                          disabled={!isManager}
                          title={isManager ? (auto.isActive ? 'Click to turn OFF' : 'Click to turn ON') : 'Manager permission required'}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            auto.isActive ? 'bg-[#4F6748]' : 'bg-border'
                          } ${!isManager ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              auto.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Sub-bar */}
                    <div className="px-5 py-2.5 bg-soft-cream/40 border-b border-border/40 flex items-center justify-between text-xs text-muted-gray flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock size={13} className="text-sage" />
                        <span>Timing: <strong className="text-charcoal">{auto.timing || 'Immediate'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-bold ${
                            auto.isActive
                              ? 'bg-[#DCE7D7] text-[#4F6748] border border-[#4F6748]/20'
                              : 'bg-soft-cream text-muted-gray border border-border'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${auto.isActive ? 'bg-[#4F6748]' : 'bg-muted-gray'}`} />
                          {auto.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>

                    {/* Template Content (Read-Only Meta Verified Preview) */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-gray uppercase tracking-wider block">
                          Verified Meta Template Preview
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={11} className="text-emerald-600" />
                          Meta Cloud Verified
                        </span>
                      </div>
                      <div className="bg-soft-cream/50 border border-border/60 rounded-[10px] p-3 max-h-[140px] overflow-y-auto">
                        <p className="text-xs text-charcoal font-mono whitespace-pre-wrap leading-relaxed">
                          {auto.template || 'No template configured.'}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-gray mt-2.5 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-sage shrink-0" />
                        <span>Auto-sends directly without requiring client to reply "Hi". Toggle switch above to turn ON or OFF.</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-2.5 bg-warm-ivory/30 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-gray">
                    <span>Engine: {auto.isActive ? 'Active & Running' : 'Paused'}</span>
                    <span className="font-semibold text-charcoal font-mono">Meta Cloud API Managed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: MESSAGE AUDIT LOGS
         ===================================================================== */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
                <FileText size={18} className="text-sage" />
                Message Audit Logs & Delivery Status
              </h2>
              <p className="text-xs text-muted-gray">Real-time log of dispatched messages, client recipients, and delivery states</p>
            </div>

            <Button
              variant="secondary"
              onClick={() => fetchLogs()}
              disabled={logsLoading}
              className="h-8 text-xs px-3 font-semibold cursor-pointer shrink-0"
            >
              <RotateCw size={13} className={logsLoading ? 'animate-spin' : ''} />
              Refresh Logs
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider block mb-1">
                Filter by Status
              </label>
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-soft-cream/50 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
              >
                <option value="ALL">All Statuses ({logs.length})</option>
                <option value="QUEUED">QUEUED</option>
                <option value="PENDING">PENDING</option>
                <option value="SENT">SENT</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
                <option value="SKIPPED">SKIPPED</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider block mb-1">
                Filter by Automation
              </label>
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-soft-cream/50 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
              >
                <option value="ALL">All Automation Types</option>
                <option value="BIRTHDAY">Birthday Greeting</option>
                <option value="ANNIVERSARY">Anniversary Greeting</option>
                <option value="APPOINTMENT_24H">Appointment 24h</option>
                <option value="APPOINTMENT_2H">Appointment 2h</option>
                <option value="AFTER_SERVICE">After Service</option>
                <option value="PAYMENT_CONFIRMATION">Payment Confirmation</option>
                <option value="REBOOKING">Rebooking</option>
                <option value="DAILY_CLOSE_BOSS">Daily Close Boss</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-gray uppercase tracking-wider block mb-1">
                Search Client or Phone
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-gray" />
                <input
                  type="text"
                  placeholder="Search recipient..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-soft-cream/50 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
                />
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-[12px] border border-border/70">
            <table className="w-full text-xs">
              <thead className="bg-soft-cream border-b border-border">
                <tr>
                  <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Recipient</th>
                  <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Type</th>
                  <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Message Preview</th>
                  <th className="text-center py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-left py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Created Date</th>
                  <th className="text-right py-2.5 px-3 font-bold text-muted-gray uppercase tracking-wider text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-white">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-gray">
                      {logsLoading ? 'Loading audit logs...' : 'No message logs found for this filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const clientName = log.client?.name || 'Client';
                    const phone = log.recipientPhone || log.client?.phone || '—';
                    const isFailed = log.status === 'FAILED';
                    const isQueued = log.status === 'QUEUED';

                    const statusBadgeClass =
                      log.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : log.status === 'SENT'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : log.status === 'PENDING'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : log.status === 'QUEUED'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : log.status === 'FAILED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200';

                    return (
                      <tr key={log.id} className="hover:bg-warm-ivory/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-charcoal block">{clientName}</span>
                          <span className="text-[10px] text-muted-gray font-mono">{phone}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-soft-cream border border-border text-charcoal">
                            {log.automationType || 'GENERAL'}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[280px]">
                          <p className="text-xs text-charcoal truncate font-mono" title={log.message}>
                            {log.message}
                          </p>
                          {log.failureReason && (
                            <span className="text-[10px] text-muted-gray block truncate mt-0.5" title={log.failureReason}>
                              {log.failureReason}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-bold border ${statusBadgeClass}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-gray font-mono text-[11px]">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {(isFailed || isQueued) && (
                            <button
                              onClick={() => handleRetryLog(log.id)}
                              disabled={retryingLogId === log.id}
                              className="px-2.5 py-1 rounded-[6px] bg-sage-soft hover:bg-sage/20 border border-sage/30 text-[11px] font-bold text-[#4F6748] cursor-pointer transition-colors"
                            >
                              {retryingLogId === log.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
