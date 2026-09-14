/**
 * WhatsAppContext — Real-time WhatsApp Automation & Audit Logs Engine (Phase 21 & Phase 22 Module 11)
 *
 * Connects frontend to backend REST APIs:
 *   - GET /api/v1/whatsapp/automations
 *   - GET /api/v1/whatsapp/automations/:type
 *   - PATCH /api/v1/whatsapp/automations/:type
 *   - GET /api/v1/whatsapp/logs
 *   - POST /api/v1/whatsapp/triggers/process-reminders
 *   - POST /api/v1/whatsapp/triggers/daily-close
 *   - POST /api/v1/whatsapp/triggers/send
 *   - POST /api/v1/whatsapp/logs/:id/retry
 *
 * RBAC:
 *   - MANAGER: Full control (edit templates, toggle status, trigger reminders, trigger daily close, retry logs)
 *   - RECEPTION: Operational access (view automations, view logs, send custom messages, retry logs)
 *   - TECHNICIAN / CLEANER: Blocked from WhatsApp management
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { whatsappApi } from '../services/api';

const WhatsAppContext = createContext(null);

export const AUTOMATION_METADATA = {
  BIRTHDAY: {
    title: 'Birthday Greeting',
    description: 'Automated greeting message with bonus loyalty points on client birthday',
    category: 'Celebration',
    defaultTiming: '09:00',
  },
  ANNIVERSARY: {
    title: 'Anniversary Greeting',
    description: 'Celebrate client spa anniversary with warm greetings and treatment invitation',
    category: 'Celebration',
    defaultTiming: '09:00',
  },
  APPOINTMENT_24H: {
    title: 'Appointment 24 Hours Reminder',
    description: 'Reminder sent 24 hours prior to scheduled appointment',
    category: 'Appointment',
    defaultTiming: '24h before',
  },
  APPOINTMENT_2H: {
    title: 'Appointment 2 Hours Reminder',
    description: 'Urgent reminder sent 2 hours before scheduled booking',
    category: 'Appointment',
    defaultTiming: '2h before',
  },
  AFTER_SERVICE: {
    title: 'After Service Thank You',
    description: 'Post-service appreciation note with loyalty points balance and feedback link',
    category: 'Service',
    defaultTiming: 'Immediate upon checkout',
  },
  PAYMENT_CONFIRMATION: {
    title: 'Payment Confirmation',
    description: 'Instant receipt confirmation with payment method and amount',
    category: 'Finance',
    defaultTiming: 'Immediate upon payment',
  },
  REBOOKING: {
    title: 'Rebooking Reminder',
    description: 'Smart retention reminder for clients due or overdue for repeat wellness visits',
    category: 'Retention',
    defaultTiming: '14-30 days post-visit',
  },
  DAILY_CLOSE_BOSS: {
    title: 'Daily Close Boss Summary',
    description: 'End-of-day financial reconciliation and revenue breakdown sent to Boss',
    category: 'Executive',
    defaultTiming: 'Daily close sign-off',
  },
};

const DEFAULT_SPECIAL_DAYS = [
  {
    id: 'spd-christmas',
    name: 'Christmas',
    date: '2026-12-25',
    repeatYearly: true,
    message: 'Merry Christmas from OMEGA SPA 🎄\nWishing you and your loved ones peace, joy, and glowing beauty this festive season.',
    audience: 'all',
    selectedClients: [],
    autoSend: true,
  },
  {
    id: 'spd-womens-day',
    name: "Women's Day",
    date: '2026-03-08',
    repeatYearly: true,
    message: "Happy International Women's Day from OMEGA SPA! 🌸 Celebrate your beauty, strength, and grace with us. Enjoy a complimentary relaxing tea with your session today.",
    audience: 'all',
    selectedClients: [],
    autoSend: true,
  },
];

export function WhatsAppProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [automations, setAutomations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Special events & broadcast state
  const [specialUpdates, setSpecialUpdates] = useState([]);
  const [specialDays, setSpecialDays] = useState(DEFAULT_SPECIAL_DAYS);

  const role = (user?.role || '').toLowerCase();
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const hasAccess = isManager || isReception;

  // 1. Fetch live automations from backend
  const fetchAutomations = useCallback(async () => {
    if (!isAuthenticated || !hasAccess) return;
    setAutomationsLoading(true);
    setError(null);
    try {
      const res = await whatsappApi.getAutomations();
      const list = Array.isArray(res?.data) ? res.data : [];

      // Ensure all 8 canonical types are represented
      const canonicalTypes = [
        'BIRTHDAY',
        'ANNIVERSARY',
        'APPOINTMENT_24H',
        'APPOINTMENT_2H',
        'AFTER_SERVICE',
        'PAYMENT_CONFIRMATION',
        'REBOOKING',
        'DAILY_CLOSE_BOSS',
      ];

      // Normalize and enrich items with metadata
      const enriched = canonicalTypes.map((type) => {
        const found = list.find((item) => item.type === type);
        const meta = AUTOMATION_METADATA[type] || {};
        return {
          id: found?.id || type.toLowerCase(),
          type,
          title: meta.title || type,
          description: meta.description || '',
          category: meta.category || 'General',
          timing: found?.timing || meta.defaultTiming || '',
          template: found?.template || '',
          isActive: found ? Boolean(found.isActive) : true,
          enabled: found ? Boolean(found.isActive) : true,
          lastExecution: found?.updatedAt || found?.createdAt || null,
          messageCount: found?.messageCount ?? 0,
        };
      });

      setAutomations(enriched);
    } catch (err) {
      console.warn('Failed to fetch WhatsApp automations:', err.message);
      setError(err.message || 'Failed to load automations');
    } finally {
      setAutomationsLoading(false);
    }
  }, [isAuthenticated, hasAccess]);

  // 2. Fetch live logs from backend
  const fetchLogs = useCallback(
    async (params = {}) => {
      if (!isAuthenticated || !hasAccess) return;
      setLogsLoading(true);
      try {
        const res = await whatsappApi.getLogs({
          page: pagination.page,
          limit: pagination.limit,
          ...params,
        });
        if (res?.data) {
          setLogs(res.data.logs || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch WhatsApp logs:', err.message);
      } finally {
        setLogsLoading(false);
      }
    },
    [isAuthenticated, hasAccess, pagination.page, pagination.limit]
  );

  // Initial load
  useEffect(() => {
    if (hasAccess) {
      fetchAutomations();
      fetchLogs();
    }
  }, [hasAccess, fetchAutomations, fetchLogs]);

  // 3. Update automation configuration (Manager only)
  const updateAutomation = useCallback(
    async (type, data) => {
      try {
        const res = await whatsappApi.updateAutomation(type, data);
        if (res?.success) {
          setAutomations((prev) =>
            prev.map((a) =>
              a.type === type
                ? {
                    ...a,
                    ...data,
                    isActive: data.isActive !== undefined ? data.isActive : a.isActive,
                    enabled: data.isActive !== undefined ? data.isActive : a.enabled,
                    template: data.template !== undefined ? data.template : a.template,
                    timing: data.timing !== undefined ? data.timing : a.timing,
                    lastExecution: new Date().toISOString(),
                  }
                : a
            )
          );
        }
        return res;
      } catch (err) {
        console.warn('Failed to update automation:', err.message);
        throw err;
      }
    },
    []
  );

  // Toggle automation ON/OFF
  const toggleAutomation = useCallback(
    async (type) => {
      const current = automations.find((a) => a.type === type || a.id === type);
      if (!current) return;
      const nextActive = !current.isActive;
      try {
        await updateAutomation(current.type, { isActive: nextActive });
      } catch (err) {
        console.warn('Error toggling automation:', err.message);
      }
    },
    [automations, updateAutomation]
  );

  // Update template
  const updateTemplate = useCallback(
    async (type, template) => {
      const current = automations.find((a) => a.type === type || a.id === type);
      const targetType = current?.type || type;
      return updateAutomation(targetType, { template });
    },
    [automations, updateAutomation]
  );

  // 4. Retry failed message
  const retryMessage = useCallback(
    async (logId) => {
      try {
        const res = await whatsappApi.retryMessage(logId);
        await fetchLogs();
        return res;
      } catch (err) {
        console.warn('Error retrying message:', err.message);
        throw err;
      }
    },
    [fetchLogs]
  );

  // 5. Send custom message
  const sendMessage = useCallback(
    async (data) => {
      try {
        const res = await whatsappApi.sendMessage(data);
        await fetchLogs();
        return res;
      } catch (err) {
        console.warn('Error sending custom message:', err.message);
        throw err;
      }
    },
    [fetchLogs]
  );

  // 6. Process scheduled reminders (Appointment 24h and 2h)
  const processReminders = useCallback(async () => {
    try {
      const res = await whatsappApi.processReminders();
      await fetchLogs();
      return res;
    } catch (err) {
      console.warn('Error processing reminders:', err.message);
      throw err;
    }
  }, [fetchLogs]);

  // 7. Trigger Daily Close summary to Boss
  const triggerDailyClose = useCallback(async (data = {}) => {
    try {
      const res = await whatsappApi.triggerDailyClose(data);
      await fetchLogs();
      return res;
    } catch (err) {
      console.warn('Error triggering daily close:', err.message);
      throw err;
    }
  }, [fetchLogs]);

  // Helper for after-service invoice template generation
  const generateInvoiceMessage = useCallback(
    ({ clientName, service, technician, amount, paymentMethod, loyaltyPoints, loyaltyRule, feedbackLink }) => {
      const automation =
        automations.find((a) => a.type === 'AFTER_SERVICE' || a.id === 'after-service-invoice') ||
        automations[0];
      if (!automation?.template) return '';

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const resolvedLink = feedbackLink || `${origin}/feedback?token=demo`;
      return automation.template
        .replace(/{clientName}/g, clientName || '')
        .replace(/{service}/g, service || '')
        .replace(/{technician}/g, technician || '')
        .replace(/{amount}/g, amount || '0')
        .replace(/{paymentMethod}/g, paymentMethod || '')
        .replace(/{loyaltyPoints}/g, loyaltyPoints ?? '0')
        .replace(/{loyaltyRule}/g, loyaltyRule || '')
        .replace(/{feedbackLink}/g, resolvedLink);
    },
    [automations]
  );

  // Special Public Update broadcast
  const sendSpecialUpdate = useCallback(
    async (data) => {
      const entry = {
        id: Date.now(),
        message: data.message || '',
        audience: data.audience || 'all',
        selectedClients: data.selectedClients || [],
        sentAt: new Date().toLocaleString(),
      };
      setSpecialUpdates((prev) => [entry, ...prev]);

      // If phone provided, send real WhatsApp message
      if (data.recipientPhone && data.message) {
        try {
          await whatsappApi.sendMessage({
            recipientPhone: data.recipientPhone,
            message: data.message,
            clientId: data.clientId,
          });
          await fetchLogs();
        } catch (e) {
          console.warn('Direct WhatsApp broadcast dispatch note:', e.message);
        }
      }

      return entry;
    },
    [fetchLogs]
  );

  // Special Public Days CRUD
  const addSpecialDay = useCallback((data) => {
    const newDay = {
      id: `spd-${Date.now()}`,
      name: data.name?.trim() || 'Special Event',
      date: data.date?.trim() || '',
      repeatYearly: data.repeatYearly !== undefined ? Boolean(data.repeatYearly) : true,
      message: data.message?.trim() || '',
      audience: data.audience || 'all',
      selectedClients: data.audience === 'selected' ? (data.selectedClients || []) : [],
      autoSend: data.autoSend !== undefined ? Boolean(data.autoSend) : true,
      createdAt: new Date().toISOString(),
    };
    setSpecialDays((prev) => [newDay, ...prev]);
    return newDay;
  }, []);

  const updateSpecialDay = useCallback((id, data) => {
    setSpecialDays((prev) =>
      prev.map((day) =>
        day.id === id
          ? {
              ...day,
              name: data.name !== undefined ? data.name.trim() : day.name,
              date: data.date !== undefined ? data.date.trim() : day.date,
              repeatYearly: data.repeatYearly !== undefined ? Boolean(data.repeatYearly) : day.repeatYearly,
              message: data.message !== undefined ? data.message.trim() : day.message,
              audience: data.audience || day.audience,
              selectedClients:
                data.audience === 'selected'
                  ? (data.selectedClients || [])
                  : data.audience === 'all'
                  ? []
                  : day.selectedClients,
              autoSend: data.autoSend !== undefined ? Boolean(data.autoSend) : day.autoSend,
              updatedAt: new Date().toISOString(),
            }
          : day
      )
    );
  }, []);

  const deleteSpecialDay = useCallback((id) => {
    setSpecialDays((prev) => prev.filter((day) => day.id !== id));
  }, []);

  const toggleSpecialDayAutoSend = useCallback((id) => {
    setSpecialDays((prev) =>
      prev.map((day) => (day.id === id ? { ...day, autoSend: !day.autoSend } : day))
    );
  }, []);

  const value = {
    automations,
    logs,
    pagination,
    automationsLoading,
    logsLoading,
    error,
    fetchAutomations,
    updateAutomation,
    toggleAutomation,
    updateTemplate,
    fetchLogs,
    retryMessage,
    sendMessage,
    processReminders,
    triggerDailyClose,
    generateInvoiceMessage,
    sendSpecialUpdate,
    specialUpdates,
    specialDays,
    addSpecialDay,
    updateSpecialDay,
    deleteSpecialDay,
    toggleSpecialDayAutoSend,
  };

  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (!context) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
}
