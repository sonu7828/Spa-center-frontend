/**
 * Rebooking — Screen 15: Retention & Rebooking Dashboard
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/loyalty/rebooking):
 *   - DUE clients (21–44 days since last visit)
 *   - OVERDUE clients (45–89 days since last visit)
 *   - LAPSED clients (90+ days since last visit)
 *   - Last visit date, last service, contact details, and direct WhatsApp follow-up action.
 *
 * Source: WIREFRAME.md Screen 15, FLOW.md §36-39
 */

import { useState } from 'react';
import { MessageCircle, Clock, Check, Users, AlertTriangle, AlertCircle, RefreshCw, Send } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useClients } from '../context/ClientsContext';
import { useLoyalty } from '../context/LoyaltyContext';
import { whatsappApi } from '../services/api';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All Actionable' },
  { key: 'DUE', label: 'Due (21–44 Days)' },
  { key: 'OVERDUE', label: 'Overdue (45–89 Days)' },
  { key: 'LAPSED', label: 'Lapsed (90+ Days)' },
];

function getServiceCategory(serviceName = '') {
  const s = (serviceName || '').toLowerCase();
  if (s.includes('nail') || s.includes('gel')) return 'Nails';
  if (s.includes('facial') || s.includes('cleanse')) return 'Facial';
  if (s.includes('massage')) return 'Massage';
  return 'General';
}

function getElapsedDays(lastVisitStr) {
  if (!lastVisitStr || lastVisitStr === '—') return 999;
  const visitDate = new Date(lastVisitStr);
  const now = new Date();
  if (isNaN(visitDate.getTime())) return 999;
  const diffMs = now.getTime() - visitDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default function Rebooking() {
  const { clients } = useClients();
  const { rebookingClients, rebookingSummary, refreshLoyalty, isLoading } = useLoyalty();

  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeWhatsAppModal, setActiveWhatsAppModal] = useState(null);
  const [sendingClientId, setSendingClientId] = useState(null);
  const [batchSending, setBatchSending] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  const handleSendWhatsAppRebooking = async (client) => {
    if (!client) return;
    const phone = client.whatsapp || client.phone;
    if (!phone) {
      setFeedbackNotice({ type: 'error', message: `No phone number on file for ${client.name}.` });
      return;
    }

    const clientId = client.id || client.clientId;
    setSendingClientId(clientId);
    setFeedbackNotice(null);

    try {
      if (clientId) {
        await whatsappApi.triggerRebooking({ clientId });
      }
      setFeedbackNotice({
        type: 'success',
        message: `Rebooking reminder dispatched to ${client.name} (${phone})!`,
      });
    } catch (err) {
      try {
        const msg = `Hello ${client.name}! It has been ${client.elapsedDays || 30} days since your last visit to OMEGA SPA. Book your next ${client.lastService || 'spa service'} today and enjoy 10% off!`;
        await whatsappApi.sendMessage({
          recipientPhone: phone,
          message: msg,
          automationType: 'REBOOKING',
          clientId,
        });
        setFeedbackNotice({
          type: 'success',
          message: `Rebooking reminder dispatched to ${client.name} (${phone})!`,
        });
      } catch (fallbackErr) {
        setFeedbackNotice({
          type: 'error',
          message: `Failed to send rebooking reminder: ${fallbackErr?.message || err?.message || 'Network error'}`,
        });
      }
    } finally {
      setSendingClientId(null);
    }
  };

  const handleBatchRebooking = async () => {
    setBatchSending(true);
    setFeedbackNotice(null);
    try {
      const res = await whatsappApi.triggerRebooking({});
      setFeedbackNotice({
        type: 'success',
        message: `Batch rebooking completed! Sent: ${res?.data?.sentCount ?? 0}, Skipped: ${res?.data?.skippedCount ?? 0}`,
      });
      setTimeout(() => setFeedbackNotice(null), 6000);
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        message: `Failed to run batch rebooking: ${err.message || 'Error'}`,
      });
      setTimeout(() => setFeedbackNotice(null), 6000);
    } finally {
      setBatchSending(false);
    }
  };

  // Compute fallback eligible clients from clients context if backend list is empty
  const fallbackClients = clients
    .map((client) => {
      const category = getServiceCategory(client.lastService);
      const elapsedDays = getElapsedDays(client.lastVisit);
      let status = null;
      if (elapsedDays >= 90) status = 'LAPSED';
      else if (elapsedDays >= 45) status = 'OVERDUE';
      else if (elapsedDays >= 21) status = 'DUE';

      return {
        id: client.id,
        clientId: client.id,
        name: client.name,
        phone: client.phone,
        whatsapp: client.whatsapp || client.phone,
        lastService: client.lastService || 'Spa Service',
        lastVisit: client.lastVisit || '—',
        elapsedDays,
        status: status || 'DUE',
        category,
      };
    })
    .filter((c) => c.elapsedDays >= 21 && c.lastVisit !== '—');

  // Real backend rebooking list prioritized
  const liveClients = (rebookingClients || []).map((c) => {
    const d = c.lastVisitDate ? new Date(c.lastVisitDate) : null;
    const dateFormatted = d && !isNaN(d.getTime())
      ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    return {
      id: c.clientId,
      clientId: c.clientId,
      name: c.name,
      phone: c.phone,
      whatsapp: c.whatsapp || c.phone,
      lastService: c.lastService || 'Spa Service',
      lastVisit: dateFormatted,
      elapsedDays: c.daysSinceLastVisit ?? 21,
      status: c.status || 'DUE',
      category: getServiceCategory(c.lastService),
    };
  });

  const displayList = liveClients.length > 0 ? liveClients : fallbackClients;

  const filteredClients = displayList.filter((c) => {
    if (selectedStatus === 'ALL') return true;
    return c.status === selectedStatus;
  });

  const dueCount = displayList.filter((c) => c.status === 'DUE').length;
  const overdueCount = displayList.filter((c) => c.status === 'OVERDUE').length;
  const lapsedCount = displayList.filter((c) => c.status === 'LAPSED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Rebooking & Retention"
          subtitle="Follow up with clients due for their next appointment based on visit history."
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={handleBatchRebooking}
            disabled={batchSending}
            className="text-xs flex items-center gap-1.5"
          >
            <Send size={13} className={batchSending ? 'animate-pulse' : ''} />
            <span>{batchSending ? 'Dispatching...' : 'Auto-Send Due'}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => refreshLoyalty()}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-[14px] p-3.5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-muted-gray block">Actionable</span>
          <span className="text-xl font-black text-charcoal block mt-0.5">{displayList.length}</span>
        </div>
        <div className="bg-white border border-border rounded-[14px] p-3.5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-[#4F6748] block">Due (21-44d)</span>
          <span className="text-xl font-black text-[#4F6748] block mt-0.5">{dueCount}</span>
        </div>
        <div className="bg-white border border-border rounded-[14px] p-3.5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-warning block">Overdue (45-89d)</span>
          <span className="text-xl font-black text-warning block mt-0.5">{overdueCount}</span>
        </div>
        <div className="bg-white border border-border rounded-[14px] p-3.5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-rose-600 block">Lapsed (90d+)</span>
          <span className="text-xl font-black text-rose-600 block mt-0.5">{lapsedCount}</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`px-3.5 sm:px-4 py-2 rounded-[12px] text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 border whitespace-nowrap shrink-0 ${
              selectedStatus === tab.key
                ? 'bg-sage text-white font-bold border-sage shadow-xs'
                : 'bg-white text-muted-gray border-border hover:bg-soft-cream hover:text-charcoal'
            }`}
          >
            <Clock size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Rebooking List Card */}
      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-gray mb-4">
          Clients Due for Follow-up ({filteredClients.length})
        </h3>

        {filteredClients.length === 0 ? (
          <p className="text-sm text-muted-gray py-6 text-center">
            {isLoading ? 'Loading retention clients...' : 'No clients currently match this retention filter.'}
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredClients.map((client) => {
              const badgeClass =
                client.status === 'OVERDUE'
                  ? 'bg-warning-soft text-warning border-warning/30'
                  : client.status === 'LAPSED'
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-sage-soft text-[#4F6748] border-sage/30';

              return (
                <div
                  key={client.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Client Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-semibold text-charcoal">
                        {client.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold border ${badgeClass}`}>
                        {client.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-muted-gray">
                      <span>Last Service: <strong className="text-charcoal font-medium">{client.lastService}</strong></span>
                      <span>·</span>
                      <span>Last Visit: <strong className="text-charcoal font-medium">{client.lastVisit}</strong> ({client.elapsedDays} days ago)</span>
                      <span>·</span>
                      <span>Phone: {client.phone}</span>
                    </div>
                  </div>

                  {/* WhatsApp Action */}
                  <div className="shrink-0 w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => setActiveWhatsAppModal(client)}
                    >
                      <MessageCircle size={15} className="text-success" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp Modal */}
      {activeWhatsAppModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 max-w-[calc(100vw-24px)] sm:max-w-[460px] w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E7F5E9] flex items-center justify-center text-[#25D366]">
                  <MessageCircle size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-charcoal">
                    Send Rebooking Reminder
                  </h3>
                  <span className="text-xs text-muted-gray">WhatsApp Automation</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveWhatsAppModal(null);
                  setFeedbackNotice(null);
                }}
                className="text-muted-gray hover:text-charcoal p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-soft-cream/60 rounded-[12px] border border-border/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-gray">Client:</span>
                <span className="font-semibold text-charcoal">{activeWhatsAppModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-gray">WhatsApp / Phone:</span>
                <span className="font-medium text-charcoal">{activeWhatsAppModal.whatsapp || activeWhatsAppModal.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-gray">Last Service:</span>
                <span className="font-medium text-charcoal">{activeWhatsAppModal.lastService} ({activeWhatsAppModal.elapsedDays}d ago)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-gray">Suggested Offer:</span>
                <span className="font-bold text-[#4F6748]">10% Rebooking Discount</span>
              </div>
            </div>

            {feedbackNotice && (
              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-xs ${
                  feedbackNotice.type === 'success'
                    ? 'bg-[#E7F5E9] border border-[#25D366]/30 text-[#2E7D32]'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                {feedbackNotice.type === 'success' ? (
                  <Check size={14} className="text-[#25D366] shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                )}
                <span>{feedbackNotice.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  setActiveWhatsAppModal(null);
                  setFeedbackNotice(null);
                }}
              >
                {feedbackNotice?.type === 'success' ? 'Close' : 'Cancel'}
              </Button>
              {feedbackNotice?.type !== 'success' && (
                <Button
                  className="w-full sm:w-auto"
                  disabled={sendingClientId === (activeWhatsAppModal.id || activeWhatsAppModal.clientId)}
                  onClick={() => handleSendWhatsAppRebooking(activeWhatsAppModal)}
                >
                  <MessageCircle size={15} className="text-white" />
                  {sendingClientId === (activeWhatsAppModal.id || activeWhatsAppModal.clientId)
                    ? 'Sending...'
                    : 'Send WhatsApp'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
