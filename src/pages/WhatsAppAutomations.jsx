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
  Pencil,
  X,
  Check,
  Send,
  MessageCircle,
  Users,
  UserCheck,
  Megaphone,
  Calendar,
  Plus,
  Trash2,
  Search,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  RotateCw,
  ArrowUpDown,
  Filter,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import { useWhatsApp } from '../context/WhatsAppContext';
import { useClients } from '../context/ClientsContext';
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

function formatSpecialDate(dateStr, repeatYearly) {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = months[monthIdx] || parts[1];
      const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
      return repeatYearly ? `${dayStr} ${monthStr}` : `${dayStr} ${monthStr} ${year}`;
    }
  }
  return dateStr;
}

export default function WhatsAppAutomations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients } = useClients();

  const {
    automations = [],
    logs = [],
    pagination,
    automationsLoading,
    logsLoading,
    fetchAutomations,
    updateAutomation,
    toggleAutomation,
    updateTemplate,
    fetchLogs,
    retryMessage,
    sendMessage,
    processReminders,
    triggerDailyClose,
    specialDays = [],
    addSpecialDay,
    updateSpecialDay,
    deleteSpecialDay,
    toggleSpecialDayAutoSend,
  } = useWhatsApp();

  const role = (user?.role || '').toLowerCase();
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const isBlocked = !isManager && !isReception;

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState('automations'); // 'automations' | 'logs' | 'special-days'

  // Inline Template Edit State
  const [editingType, setEditingType] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

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

  // Custom Send Message Modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [customRecipientPhone, setCustomRecipientPhone] = useState('');
  const [customMessageText, setCustomMessageText] = useState('');
  const [sendingCustom, setSendingCustom] = useState(false);

  // Special Public Days State
  const [showDayModal, setShowDayModal] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [dayForm, setDayForm] = useState({
    name: '',
    date: '',
    repeatYearly: true,
    message: '',
    audience: 'all',
    selectedClients: [],
    autoSend: true,
  });

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

  // Start editing template
  const handleStartEdit = (auto) => {
    if (!isManager) return;
    setEditingType(auto.type);
    setEditDraft(auto.template || '');
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setEditDraft('');
  };

  const handleSaveEdit = async (type) => {
    if (!editDraft.trim()) return;
    setSavingTemplate(true);
    try {
      await updateTemplate(type, editDraft.trim());
      setEditingType(null);
      setEditDraft('');
      showNotification(`Template for ${type} updated successfully.`);
    } catch (err) {
      showNotification(err.message || 'Failed to update template', true);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Toggle automation active/inactive
  const handleToggle = async (auto) => {
    if (!isManager) {
      showNotification('Receptionists can only view automation status. Manager permission required to toggle.', true);
      return;
    }
    try {
      await toggleAutomation(auto.type);
      showNotification(`${auto.title} ${!auto.isActive ? 'enabled' : 'disabled'}.`);
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
      const res = await triggerDailyClose();
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

  // Send custom message handler
  const handleSendCustomMessage = async (e) => {
    e.preventDefault();
    if (!customRecipientPhone.trim() || !customMessageText.trim()) return;
    setSendingCustom(true);
    try {
      await sendMessage({
        recipientPhone: customRecipientPhone.trim(),
        message: customMessageText.trim(),
      });
      setShowSendModal(false);
      setCustomRecipientPhone('');
      setCustomMessageText('');
      showNotification('Custom message sent and logged.');
      setActiveTab('logs');
    } catch (err) {
      showNotification(err.message || 'Failed to send custom message', true);
    } finally {
      setSendingCustom(false);
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

  // Special Days helpers
  const openAddDay = () => {
    setEditingDay(null);
    setDayForm({
      name: '',
      date: new Date().toISOString().split('T')[0],
      repeatYearly: true,
      message: '',
      audience: 'all',
      selectedClients: [],
      autoSend: true,
    });
    setClientSearch('');
    setShowDayModal(true);
  };

  const openEditDay = (day) => {
    setEditingDay(day);
    setDayForm({
      name: day.name,
      date: day.date,
      repeatYearly: day.repeatYearly !== undefined ? day.repeatYearly : true,
      message: day.message,
      audience: day.audience || 'all',
      selectedClients: day.selectedClients ? [...day.selectedClients] : [],
      autoSend: day.autoSend !== undefined ? day.autoSend : true,
    });
    setClientSearch('');
    setShowDayModal(true);
  };

  const handleSaveDay = () => {
    if (!dayForm.name.trim() || !dayForm.date.trim() || !dayForm.message.trim()) return;
    if (editingDay) {
      updateSpecialDay(editingDay.id, dayForm);
    } else {
      addSpecialDay(dayForm);
    }
    setShowDayModal(false);
    setEditingDay(null);
  };

  const toggleModalClient = (clientId) => {
    setDayForm((prev) => ({
      ...prev,
      selectedClients: prev.selectedClients.includes(clientId)
        ? prev.selectedClients.filter((id) => id !== clientId)
        : [...prev.selectedClients, clientId],
    }));
  };

  const filteredClientsForModal = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(clientSearch))
    );
  }, [clients, clientSearch]);

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

          <Button
            onClick={() => setShowSendModal(true)}
            className="h-10 text-xs px-4 font-bold cursor-pointer shrink-0"
          >
            <Send size={14} />
            Send Custom Message
          </Button>
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

        <button
          onClick={() => setActiveTab('special-days')}
          className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
            activeTab === 'special-days'
              ? 'bg-white text-charcoal shadow-xs border border-border/60 font-bold'
              : 'text-muted-gray hover:text-charcoal'
          }`}
        >
          <Calendar size={14} className="text-sage" />
          Special Days & Broadcast ({specialDays.length})
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
              {isManager ? 'Manager: Click toggle or Edit Message to update.' : 'Reception: Operational view only.'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((auto) => {
              const IconComponent = AUTOMATION_ICONS[auto.type] || MessageCircle;
              const color = AUTOMATION_COLORS[auto.type] || AUTOMATION_COLORS.BIRTHDAY;
              const isEditing = editingType === auto.type;

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
                          title={isManager ? 'Toggle ON/OFF' : 'Manager permission required'}
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

                    {/* Template Content */}
                    <div className="p-5">
                      {isEditing ? (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-bold text-muted-gray uppercase tracking-wider">
                            Edit Message Template ({auto.type})
                          </label>
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={6}
                            className="w-full px-3.5 py-2.5 bg-white border border-sage rounded-[10px] text-xs text-charcoal outline-none focus:ring-1 focus:ring-sage/30 font-mono leading-relaxed resize-y"
                          />

                          {/* Variable Tag Helper Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-muted-gray font-semibold">Available tags:</span>
                            {['{clientName}', '{service}', '{technician}', '{amount}', '{paymentMethod}', '{loyaltyPoints}', '{rewardPoints}', '{feedbackLink}'].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setEditDraft((prev) => prev + (prev.endsWith(' ') ? '' : ' ') + tag)}
                                className="px-2 py-0.5 rounded-[6px] text-[10px] font-mono bg-sage-soft border border-sage/30 text-[#4F6748] hover:bg-sage/20 transition-colors cursor-pointer"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="secondary"
                              onClick={handleCancelEdit}
                              className="h-8 text-xs px-3"
                              disabled={savingTemplate}
                            >
                              <X size={13} />
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleSaveEdit(auto.type)}
                              className="h-8 text-xs px-4"
                              disabled={savingTemplate}
                            >
                              <Check size={13} />
                              {savingTemplate ? 'Saving...' : 'Save Template'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] font-bold text-muted-gray uppercase tracking-wider block mb-1.5">
                            Current Template Preview
                          </span>
                          <div className="bg-soft-cream/50 border border-border/60 rounded-[10px] p-3 max-h-[140px] overflow-y-auto mb-3">
                            <p className="text-xs text-charcoal font-mono whitespace-pre-wrap leading-relaxed">
                              {auto.template || 'No template configured.'}
                            </p>
                          </div>

                          {isManager && (
                            <button
                              onClick={() => handleStartEdit(auto)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-sage hover:text-[#4F6748] transition-colors cursor-pointer"
                            >
                              <Pencil size={13} />
                              Edit Template
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-2.5 bg-warm-ivory/30 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-gray">
                    <span>Last updated: {auto.lastExecution ? new Date(auto.lastExecution).toLocaleDateString() : 'Active'}</span>
                    <span className="font-semibold text-charcoal font-mono">Backend Auto-Managed</span>
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

      {/* =====================================================================
          TAB 3: SPECIAL DAYS & BROADCAST (PRESERVED WORKFLOW)
         ===================================================================== */}
      {activeTab === 'special-days' && (
        <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
          <div className="px-5 py-4 bg-[#F8F3FA] border-b border-[#E1BEE7]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-white border border-[#E1BEE7]/60 flex items-center justify-center text-[#8E24AA] shadow-2xs shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-charcoal">Special Public Days</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E1BEE7]/40 text-[#6A1B9A]">
                    {specialDays.length} Saved
                  </span>
                </div>
                <p className="text-[11px] text-muted-gray mt-0.5">
                  Automated holiday & special public day greetings for clients
                </p>
              </div>
            </div>

            {isManager && (
              <Button
                onClick={openAddDay}
                className="h-[38px] text-xs px-3.5 shrink-0 self-start sm:self-auto"
              >
                <Plus size={14} />
                Add Special Day
              </Button>
            )}
          </div>

          <div className="p-5">
            {specialDays.length === 0 ? (
              <div className="py-8 text-center bg-soft-cream/30 border border-dashed border-border rounded-[12px]">
                <Calendar size={28} className="mx-auto text-muted-gray/50 mb-2" />
                <p className="text-sm font-medium text-charcoal">No special days configured yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {specialDays.map((day) => (
                  <div
                    key={day.id}
                    className="bg-white border border-border rounded-[14px] p-4 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-charcoal">{day.name}</h4>
                        <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#E1BEE7]/30 text-[#6A1B9A]">
                          {formatSpecialDate(day.date, day.repeatYearly)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-gray font-mono bg-soft-cream/40 p-2.5 rounded-[8px] border border-border/50 mb-3 whitespace-pre-wrap">
                        {day.message}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                      <span className="text-[11px] text-muted-gray">
                        Audience: {day.audience === 'all' ? 'All Clients' : `${day.selectedClients?.length || 0} Selected`}
                      </span>
                      {isManager && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditDay(day)}
                            className="text-sage font-bold hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSpecialDay(day.id)}
                            className="text-rose-500 font-bold hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Custom Message Modal ── */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-[20px] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-sage" />
                <h3 className="font-bold text-charcoal text-base">Send Custom WhatsApp</h3>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendCustomMessage} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-muted-gray uppercase tracking-wider block mb-1">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="+2376XXXXXXXX"
                  value={customRecipientPhone}
                  onChange={(e) => setCustomRecipientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-gray uppercase tracking-wider block mb-1">
                  Message Text
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter message to client..."
                  value={customMessageText}
                  onChange={(e) => setCustomMessageText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage leading-relaxed resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowSendModal(false)}
                  className="h-10 text-xs px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sendingCustom}
                  className="h-10 text-xs px-5 font-bold"
                >
                  {sendingCustom ? 'Dispatching...' : 'Dispatch Message'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Special Day Modal ── */}
      {showDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-[20px] max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-charcoal text-base">
                {editingDay ? 'Edit Special Day' : 'Add Special Day Greeting'}
              </h3>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-gray uppercase tracking-wider block mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day"
                  value={dayForm.name}
                  onChange={(e) => setDayForm({ ...dayForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-gray uppercase tracking-wider block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={dayForm.date}
                  onChange={(e) => setDayForm({ ...dayForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-gray uppercase tracking-wider block mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={dayForm.message}
                  onChange={(e) => setDayForm({ ...dayForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDayModal(false)}
                  className="h-10 text-xs px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDay}
                  className="h-10 text-xs px-5 font-bold"
                >
                  Save Special Day
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
