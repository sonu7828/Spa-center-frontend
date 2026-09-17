/**
 * ClientFile — Screen 04
 *
 * The MOST IMPORTANT client screen. Highest visual polish.
 *
 * Contains:
 *   - Client identity header (name, phone, quartier, birthday, recommended by)
 *   - Tabs: Service History | Before / After
 *   - Service History: up to 10 rows (date, service, tech, product, price)
 *   - No-Show count + deposit warning
 *
 * Source: WIREFRAME.md Screen 04, FLOW.md §8, DESIGN-SYSTEM.md §18
 */

import { useState, useEffect, useCallback } from 'react';
import { loyaltyApi, uploadsApi, mediaApi } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Cake,
  Heart,
  UserPlus,
  TriangleAlert,
  ImageIcon,
  ImagePlus,
  Plus,
  X,
  Upload,
  Award,
  Sparkles,
  SlidersHorizontal,
  Check,
  Share2,
  Pencil,
  Star,
  UserX,
  RotateCcw,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import Tabs from '../components/Tabs';
import { useClients } from '../context/ClientsContext';
import { useAppointments } from '../context/AppointmentsContext';
import { useLoyalty } from '../context/LoyaltyContext';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';

const tabs = [
  { key: 'history', label: 'Service History' },
  { key: 'photos', label: 'Before / After' },
  { key: 'loyalty', label: 'Loyalty Points' },
  { key: 'feedback', label: 'Feedback' },
];

export default function ClientFile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClient, updateClient, fetchClientFull, addClientMedia, setClientStatus } = useClients();

  useEffect(() => {
    if (id && fetchClientFull) {
      fetchClientFull(id);
    }
  }, [id, fetchClientFull]);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history');

  // Edit Details state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaved, setEditSaved] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);

  const canEdit = user?.role === 'manager' || user?.role === 'reception';

  const client = getClient(id);

  if (!client) {
    return (
      <div>
        <PageHeader title="Client File" />
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <p className="text-sm text-muted-gray">Client not found.</p>
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditForm({
      name: client.name || '',
      phone: client.phone || '',
      quartier: client.quartier || '',
      birthday: client.birthday || '',
      anniversary: client.anniversary || '',
    });
    setIsEditing(true);
    setEditSaved(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;

    updateClient(client.id, {
      name: editForm.name.trim() || client.name,
      phone: editForm.phone.trim() || client.phone,
      quartier: editForm.quartier.trim(),
      birthday: editForm.birthday,
      anniversary: editForm.anniversary,
    });

    setIsEditing(false);
    setEditForm(null);
    setEditSaved(true);
    setTimeout(() => setEditSaved(false), 2000);
  };

  const updateField = (field) => (e) =>
    setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

  const { appointments: allAppointments } = useAppointments();

  // Prepare merged service & appointment history for this client
  const liveClientAppointments = (allAppointments || []).filter(
    (a) =>
      (a.clientId && String(a.clientId) === String(client.id)) ||
      (client.phone && String(a.clientPhone || a.phone) === String(client.phone))
  );

  const liveRows = liveClientAppointments.map((a) => {
    const totalPrice = a.services?.reduce((sum, s) => sum + (Number(s.price) || 0), 0) || 0;
    const statusLower = String(a.status || 'scheduled').toLowerCase().replace(/_/g, '-');
    return {
      id: `appt-${a.id}`,
      appointmentId: a.id,
      date: a.date,
      time: a.time,
      service: a.service || 'Spa Service',
      technician: a.technicianName || 'Technician',
      product: statusLower === 'cancelled' ? 'Cancelled' : 'Spa Service',
      price: totalPrice > 0 ? totalPrice.toLocaleString('en-US') : '—',
      status: statusLower,
      rawStatus: a.rawStatus || 'SCHEDULED',
    };
  });

  const seenKeys = new Set();
  const mergedHistory = [];

  for (const row of liveRows) {
    seenKeys.add(String(row.appointmentId));
    seenKeys.add(String(row.id));
    mergedHistory.push(row);
  }

  for (const row of (client.serviceHistory || [])) {
    const key = String(row.appointmentId || row.id);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      mergedHistory.push(row);
    }
  }

  return (
    <div>
      <PageHeader
        title="Client File"
        action={
          <Button variant="secondary" onClick={() => navigate('/clients')}>
            <ArrowLeft size={16} strokeWidth={1.8} />
            Back
          </Button>
        }
      />

      {/* ── Client Identity Header ── */}
      <div className="bg-white border border-border rounded-[16px] p-6 shadow-card mb-6">
        {isEditing && editForm ? (
          /* ── EDIT MODE ── */
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-charcoal">Edit Client Details</h2>
              <button
                onClick={handleCancelEdit}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Input
                label="Name"
                value={editForm.name}
                onChange={updateField('name')}
                placeholder="Client name"
              />
              <Input
                label="Phone / WhatsApp"
                value={editForm.phone}
                onChange={updateField('phone')}
                placeholder="+237"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Input
                label="Quartier"
                value={editForm.quartier}
                onChange={updateField('quartier')}
                placeholder="Neighborhood"
              />
              <Input
                label="Birthday Date"
                type="date"
                value={editForm.birthday}
                onChange={updateField('birthday')}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Input
                label="Anniversary Date (Optional)"
                type="date"
                value={editForm.anniversary}
                onChange={updateField('anniversary')}
              />
            </div>



            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                <Check size={15} />
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          /* ── DISPLAY MODE ── */
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-semibold text-charcoal">
                  {client.name}
                </h2>
                {client.status === 'INACTIVE' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3F0EC] text-muted-gray border border-border/70">
                    Inactive
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sage-soft text-sage border border-sage/30">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  client.status === 'INACTIVE' ? (
                    <button
                      onClick={() => setShowActivateModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-charcoal bg-warm-ivory border border-border hover:bg-white transition-all cursor-pointer shadow-2xs"
                    >
                      <RotateCcw size={13} />
                      Restore Active
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-muted-gray bg-warm-ivory border border-border hover:text-charcoal hover:bg-white transition-all cursor-pointer shadow-2xs"
                    >
                      <UserX size={13} />
                      Mark as Inactive
                    </button>
                  )
                )}
                {canEdit && (
                  <button
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-sage bg-sage-soft border border-sage/30 hover:bg-sage-soft/80 transition-all cursor-pointer shadow-2xs"
                  >
                    <Pencil size={13} />
                    Edit Details
                  </button>
                )}
              </div>
            </div>

            {editSaved && (
              <div className="bg-success-soft border border-success/20 rounded-[10px] px-3 py-2 mb-4 flex items-center gap-2">
                <Check size={14} className="text-success" />
                <span className="text-xs font-semibold text-success">Client details updated successfully.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5">
                <Phone size={16} className="text-sage shrink-0" />
                <span className="text-sm text-muted-gray">{client.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="text-sage shrink-0" />
                <span className="text-sm text-muted-gray">{client.quartier}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Cake size={16} className="text-sage shrink-0" />
                <span className="text-sm text-muted-gray">
                  Birthday: {client.birthday || '—'}
                </span>
              </div>
              {client.anniversary && (
                <div className="flex items-center gap-2.5">
                  <Heart size={16} className="text-sage shrink-0" />
                  <span className="text-sm text-muted-gray">
                    Anniversary: {client.anniversary}
                  </span>
                </div>
              )}

              {client.introducedBy && (
                <div className="col-span-1 sm:col-span-2 bg-sage-soft/60 rounded-[12px] p-3.5 border border-sage/30">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-sage/20">
                    <UserPlus size={16} className="text-sage-hover shrink-0" />
                    <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                      Referral Information
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-gray block">Client</span>
                      <span className="text-charcoal font-semibold">{client.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-gray block">Introduced By</span>
                      <span className="text-charcoal font-bold text-sage-hover">{client.introducedBy}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-gray block">Source</span>
                      <span className="inline-block px-2 py-0.5 rounded-[5px] bg-white font-semibold text-charcoal border border-sage/20 text-[11px]">
                        Staff Referral
                      </span>
                    </div>
                  </div>
                  {client.firstAppointmentService && (
                    <p className="text-[11px] text-muted-gray mt-2 pt-1.5 border-t border-sage/20">
                      First Appointment Recommended: <strong className="text-charcoal font-semibold">{client.firstAppointmentService}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── No-Show / Deposit Warning ── */}
      {client.noShows >= 2 && (
        <div className="bg-warning-soft border border-warning/20 rounded-[12px] p-4 mb-6 flex items-start gap-3">
          <TriangleAlert size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-charcoal">
              No-Shows: {client.noShows}
            </p>
            <p className="text-sm text-muted-gray mt-0.5">
              Deposit required for next appointment
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ── Tab Content ── */}
      <div className="mt-4">
        {activeTab === 'history' && (
          <ServiceHistoryTab history={mergedHistory} client={client} />
        )}
        {activeTab === 'photos' && (
          <BeforeAfterTab client={client} onUpdateClient={updateClient} onAddMedia={addClientMedia} />
        )}
        {activeTab === 'loyalty' && (
          <LoyaltyPointsTab clientId={client.id} user={user} />
        )}
        {activeTab === 'feedback' && (
          <FeedbackHistoryTab clientId={client.id} />
        )}
      </div>

      {/* ── Confirm Mark Inactive Warning Modal ── */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-[420px] bg-white border border-border rounded-[20px] p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Icon */}
            <button
              onClick={() => setShowDeactivateModal(false)}
              className="absolute right-4 top-4 text-muted-gray hover:text-charcoal cursor-pointer p-1"
            >
              <X size={18} />
            </button>

            {/* Warning Icon Badge */}
            <div className="w-12 h-12 rounded-full bg-[#FAECEC] border border-[#ECCACA] flex items-center justify-center mx-auto mb-4 text-[#B34040]">
              <TriangleAlert size={24} />
            </div>

            {/* Title & Description */}
            <div className="text-center mb-6">
              <h3 className="text-base font-bold text-charcoal mb-2">
                Mark Client as Inactive?
              </h3>
              <p className="text-xs text-muted-gray leading-relaxed">
                Are you sure you want to mark{' '}
                <strong className="text-charcoal font-semibold">{client.name}</strong> as inactive?
              </p>
              <p className="text-[11px] text-muted-gray/90 mt-2.5 bg-soft-cream/60 rounded-[9px] p-2.5 border border-border/50 text-left">
                ℹ️ All appointments, invoices, payments, loyalty points, and photos will remain permanently preserved. You can restore this client to active at any time.
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setShowDeactivateModal(false)}
                className="h-10 text-xs font-semibold justify-center"
              >
                Cancel
              </Button>
              <button
                onClick={async () => {
                  await setClientStatus(client.id, 'INACTIVE');
                  setShowDeactivateModal(false);
                }}
                className="h-10 px-4 rounded-[11px] text-xs font-semibold text-white bg-[#B34040] hover:bg-[#963030] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserX size={14} />
                Yes, Mark Inactive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Restore Active Modal ── */}
      {showActivateModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-[420px] bg-white border border-border rounded-[20px] p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Icon */}
            <button
              onClick={() => setShowActivateModal(false)}
              className="absolute right-4 top-4 text-muted-gray hover:text-charcoal cursor-pointer p-1"
            >
              <X size={18} />
            </button>

            {/* Success/Restore Icon Badge */}
            <div className="w-12 h-12 rounded-full bg-sage-soft border border-sage/30 flex items-center justify-center mx-auto mb-4 text-sage">
              <RotateCcw size={22} />
            </div>

            {/* Title & Description */}
            <div className="text-center mb-6">
              <h3 className="text-base font-bold text-charcoal mb-2">
                Restore Client to Active?
              </h3>
              <p className="text-xs text-muted-gray leading-relaxed">
                Are you sure you want to restore{' '}
                <strong className="text-charcoal font-semibold">{client.name}</strong> to active status?
              </p>
              <p className="text-[11px] text-muted-gray/90 mt-2.5 bg-soft-cream/60 rounded-[9px] p-2.5 border border-border/50 text-left">
                ✅ This client will be immediately restored to active and will appear across all active client lists and appointment booking dropdowns.
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setShowActivateModal(false)}
                className="h-10 text-xs font-semibold justify-center"
              >
                Cancel
              </Button>
              <button
                onClick={async () => {
                  await setClientStatus(client.id, 'ACTIVE');
                  setShowActivateModal(false);
                }}
                className="h-10 px-4 rounded-[11px] text-xs font-semibold text-white bg-sage hover:bg-sage-hover shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} />
                Yes, Restore Active
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Service History Tab ── */
function ServiceHistoryTab({ history, client }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
        {client?.introducedBy && (
          <div className="bg-sage-soft/40 border border-sage/20 rounded-[10px] p-3 mb-4 text-xs inline-block text-left max-w-sm">
            <span className="text-[9px] uppercase font-bold text-muted-gray block">Client Source</span>
            <span className="font-bold text-charcoal">Created By: {client.introducedBy}</span>
            {client.firstAppointmentService && (
              <span className="block text-muted-gray mt-0.5">First Appointment: <strong className="text-charcoal">{client.firstAppointmentService}</strong></span>
            )}
          </div>
        )}
        <p className="text-sm text-muted-gray">No service history yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
      {client?.introducedBy && (
        <div className="bg-sage-soft/40 border-b border-border/50 px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-muted-gray block">Created By</span>
            <span className="font-bold text-charcoal">{client.introducedBy}</span>
          </div>
          {client.firstAppointmentService && (
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-muted-gray block">First Appointment</span>
              <span className="font-bold text-charcoal">{client.firstAppointmentService}</span>
            </div>
          )}
        </div>
      )}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-charcoal">
          Services & Appointments
        </h3>
        <span className="text-xs text-muted-gray">({history.length} records)</span>
      </div>

      {/* Desktop / Tablet Landscape Table View */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-soft-cream/30">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-gray uppercase tracking-wide">
                Date
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-gray uppercase tracking-wide">
                Service
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-gray uppercase tracking-wide">
                Technician
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-gray uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-gray uppercase tracking-wide">
                Product
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-gray uppercase tracking-wide">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-b-0 hover:bg-soft-cream/20 transition-colors">
                <td className="px-5 py-3.5 text-sm text-charcoal whitespace-nowrap">
                  {row.date} {row.time ? <span className="text-xs text-muted-gray font-mono">({row.time})</span> : ''}
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-charcoal whitespace-nowrap">
                  {row.service}
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-gray whitespace-nowrap">
                  {row.technician}
                </td>
                <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                  {row.status === 'cancelled' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAECEC] text-[#B34040] border border-[#ECCACA]">
                      Cancelled
                    </span>
                  ) : row.status === 'completed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF5EE] text-[#2D7A4D] border border-[#C3E6D0]">
                      Completed
                    </span>
                  ) : row.status === 'late' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF4E5] text-[#B76E00] border border-[#FFE2B8]">
                      Late
                    </span>
                  ) : row.status === 'no-show' || row.status === 'no_show' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAECEC] text-[#B34040] border border-[#ECCACA]">
                      No Show
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sage-soft text-sage border border-sage/30">
                      {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Scheduled'}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-gray whitespace-nowrap">
                  {row.product}
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold text-charcoal text-right whitespace-nowrap font-mono">
                  {row.status === 'cancelled' ? (
                    <span className="line-through text-muted-gray">{row.price} FCFA</span>
                  ) : (
                    <span>{row.price} FCFA</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (md:hidden) */}
      <div className="block md:hidden divide-y divide-border/60">
        {history.map((row) => (
          <div key={row.id} className="p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-charcoal">{row.service}</span>
                {row.status === 'cancelled' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAECEC] text-[#B34040] border border-[#ECCACA]">
                    Cancelled
                  </span>
                ) : row.status === 'completed' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF5EE] text-[#2D7A4D] border border-[#C3E6D0]">
                    Completed
                  </span>
                ) : row.status ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sage-soft text-sage border border-sage/30">
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </span>
                ) : null}
              </div>
              <span className={`font-bold text-sm font-mono ${row.status === 'cancelled' ? 'line-through text-muted-gray' : 'text-charcoal'}`}>
                {row.price} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-gray pt-0.5">
              <span>Date: {row.date} {row.time ? `(${row.time})` : ''}</span>
              <span>Tech: <strong className="text-charcoal font-medium">{row.technician}</strong></span>
            </div>
            {row.product && (
              <p className="text-[11px] text-muted-gray">
                Product: <span className="text-charcoal font-medium">{row.product}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Before / After Tab ── */
function BeforeAfterTab({ client, onUpdateClient, onAddMedia }) {
  const navigate = useNavigate();
  const { prepareSocialDraft } = useSocial();
  const [showAddForm, setShowAddForm] = useState(false);
  const [serviceName, setServiceName] = useState('Gel Nails');

  const photos = client.photos || [];

  const handleAttachImage = async (photoId, slot, file) => {
    if (!file) return;

    const targetPhoto = photos.find((p) => p.id === photoId);
    const sessionServiceName = targetPhoto?.service || serviceName || 'Service Session';

    // Optimistic preview with object URL
    const previewUrl = URL.createObjectURL(file);
    const updated = photos.map((p) => {
      if (p.id === photoId) {
        return {
          ...p,
          [slot]: previewUrl,
        };
      }
      return p;
    });
    onUpdateClient?.(client.id, { photos: updated });

    try {
      // 1. Upload via multipart FormData directly to Cloudinary media API
      const formData = new FormData();
      formData.append('image', file);
      formData.append('clientId', String(client.id));
      formData.append('mediaType', slot === 'before' ? 'BEFORE' : 'AFTER');
      formData.append('note', sessionServiceName);

      const res = await mediaApi.uploadClientMedia(formData);
      const cloudinaryUrl = res?.data?.fileUrl || res?.data?.url;

      if (cloudinaryUrl) {
        const finalized = photos.map((p) => {
          if (p.id === photoId) {
            return {
              ...p,
              [slot]: cloudinaryUrl,
            };
          }
          return p;
        });
        onUpdateClient?.(client.id, { photos: finalized });
      }
    } catch (err) {
      console.warn('Direct mediaApi upload failed, trying fallback:', err);
      // Fallback
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        let finalUrl = base64;
        try {
          const uploadRes = await uploadsApi.uploadImage(base64, file.name);
          if (uploadRes?.data?.url) {
            finalUrl = uploadRes.data.url;
          }
        } catch (uploadErr) {
          console.warn('Upload fallback warning:', uploadErr);
        }

        if (onAddMedia) {
          await onAddMedia(client.id, {
            mediaType: slot === 'before' ? 'BEFORE' : 'AFTER',
            fileUrl: finalUrl,
            note: sessionServiceName,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewSession = () => {
    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const newEntry = {
      id: 'session-' + Date.now(),
      service: (serviceName || 'Gel Nails').trim(),
      date: today,
      before: null,
      after: null,
    };
    onUpdateClient?.(client.id, { photos: [newEntry, ...photos] });
    setShowAddForm(false);
  };

  const handleShareToSocial = (photo) => {
    prepareSocialDraft({
      media: photo.after || photo.before,
      serviceName: photo.service,
      clientName: client.name,
      caption: `✨ Beautiful ${photo.service} transformation for our client at Omega Spa Douala! 💖 Book your next session now. #OmegaSpa #Douala #Transformation`,
    });
    navigate('/social-media');
  };

  return (
    <div className="space-y-4">
      {/* Action to create new photo card */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => setShowAddForm(true)}
          className="text-xs h-[38px]"
        >
          <Plus size={15} strokeWidth={2} />
          Add Photo Session
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-charcoal">
              New Photo Session
            </h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-muted-gray hover:text-charcoal cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Service Name (e.g. Gel Nails)"
              className="h-[40px] px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage flex-1 min-w-[200px]"
            />
            <Button onClick={handleAddNewSession} className="h-[40px]">
              Create Session
            </Button>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <p className="text-sm text-muted-gray mb-3">No before / after photos attached yet.</p>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            Attach First Photo
          </Button>
        </div>
      ) : (
        photos.map((photo) => (
          <div
            key={photo.id}
            className="bg-white border border-border rounded-[16px] p-5 shadow-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-charcoal">{photo.service}</p>
                <p className="text-xs text-muted-gray mt-0.5">{photo.date}</p>
              </div>
              {(photo.before || photo.after) && (
                <button
                  onClick={() => handleShareToSocial(photo)}
                  className="h-[32px] px-3 rounded-[8px] text-[11px] font-semibold text-sage bg-sage-soft border border-sage/30 hover:bg-sage-soft/80 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Share2 size={13} />
                  Share to Social Media
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Slot */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-gray uppercase tracking-wider block">
                  Before Photo
                </span>
                {photo.before ? (
                  <div className="relative aspect-[4/3] rounded-[12px] overflow-hidden border border-border group bg-soft-cream">
                    <img
                      src={photo.before?.startsWith('/uploads/') ? photo.before : photo.before}
                      alt="Before Service"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (!e.target.dataset.fallback && photo.before?.startsWith('/uploads/')) {
                          e.target.dataset.fallback = 'true';
                          e.target.src = `http://localhost:5000${photo.before}`;
                        }
                      }}
                    />
                    <label className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleAttachImage(photo.id, 'before', e.target.files[0])
                        }
                      />
                      <span className="text-xs font-semibold text-white bg-charcoal/80 px-3 py-1.5 rounded-[8px] flex items-center gap-1.5 shadow-sm">
                        <Upload size={13} />
                        Change Photo
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="aspect-[4/3] bg-soft-cream border border-dashed border-border hover:border-sage hover:bg-sage-soft/30 rounded-[12px] flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleAttachImage(photo.id, 'before', e.target.files[0])
                      }
                    />
                    <ImagePlus
                      size={24}
                      className="text-muted-gray group-hover:text-sage mb-2 transition-colors"
                    />
                    <span className="text-xs font-semibold text-charcoal mb-1">
                      Before Photo
                    </span>
                    <span className="text-[11px] font-medium text-charcoal bg-white border border-border group-hover:border-sage/40 px-3 py-1 rounded-[6px] shadow-xs">
                      Attach Photo
                    </span>
                  </label>
                )}
              </div>

              {/* After Slot */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-gray uppercase tracking-wider block">
                  After Photo
                </span>
                {photo.after ? (
                  <div className="relative aspect-[4/3] rounded-[12px] overflow-hidden border border-border group bg-soft-cream">
                    <img
                      src={photo.after?.startsWith('/uploads/') ? photo.after : photo.after}
                      alt="After Service"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (!e.target.dataset.fallback && photo.after?.startsWith('/uploads/')) {
                          e.target.dataset.fallback = 'true';
                          e.target.src = `http://localhost:5000${photo.after}`;
                        }
                      }}
                    />
                    <label className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleAttachImage(photo.id, 'after', e.target.files[0])
                        }
                      />
                      <span className="text-xs font-semibold text-white bg-charcoal/80 px-3 py-1.5 rounded-[8px] flex items-center gap-1.5 shadow-sm">
                        <Upload size={13} />
                        Change Photo
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="aspect-[4/3] bg-soft-cream border border-dashed border-border hover:border-sage hover:bg-sage-soft/30 rounded-[12px] flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleAttachImage(photo.id, 'after', e.target.files[0])
                      }
                    />
                    <ImagePlus
                      size={24}
                      className="text-muted-gray group-hover:text-sage mb-2 transition-colors"
                    />
                    <span className="text-xs font-semibold text-charcoal mb-1">
                      After Photo
                    </span>
                    <span className="text-[11px] font-medium text-charcoal bg-white border border-border group-hover:border-sage/40 px-3 py-1 rounded-[6px] shadow-xs">
                      Attach Photo
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Loyalty Points Tab ── */
function LoyaltyPointsTab({ clientId, user }) {
  const { getClientLoyalty, adjustPoints, calculateDiscount } = useLoyalty();
  const contextLoyalty = getClientLoyalty(clientId);
  const [liveLoyalty, setLiveLoyalty] = useState(null);

  const fetchBackendLoyalty = useCallback(async () => {
    if (!clientId || typeof clientId !== 'string' || !clientId.includes('-')) return;
    try {
      const res = await loyaltyApi.getClientPoints(clientId);
      if (res?.data) setLiveLoyalty(res.data);
    } catch (err) {
      console.warn('Backend loyalty fetch error:', err.message);
    }
  }, [clientId]);

  useEffect(() => {
    fetchBackendLoyalty();
  }, [fetchBackendLoyalty]);

  const loyalty = liveLoyalty
    ? {
        balance: liveLoyalty.balance ?? 0,
        totalEarned: liveLoyalty.totalEarned ?? 0,
        totalRedeemed: liveLoyalty.totalRedeemed ?? 0,
        history: (liveLoyalty.history || []).map((h) => ({
          id: h.id,
          date: new Date(h.createdAt || h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          source: h.source || h.type,
          points: h.type === 'REDEEM' ? -Math.abs(h.points) : h.points,
          balance: h.balanceAfter ?? h.points,
        })),
      }
    : contextLoyalty;
  const isManager = user?.role === 'manager';

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ points: '', type: 'add', reason: '' });
  const [adjustSuccess, setAdjustSuccess] = useState(false);

  const discountValue = calculateDiscount(loyalty.balance);

  const handleApplyAdjustment = async (e) => {
    e.preventDefault();
    const pts = parseInt(adjustForm.points, 10);
    if (!pts || pts <= 0) return;

    const delta = adjustForm.type === 'deduct' ? -pts : pts;
    adjustPoints(clientId, {
      pointsDelta: delta,
      reason: adjustForm.reason,
    });
    if (typeof clientId === 'string' && clientId.includes('-')) {
      try {
        await loyaltyApi.adjustPoints(clientId, { pointsDelta: delta, reason: adjustForm.reason });
        fetchBackendLoyalty();
      } catch (err) {
        console.warn('Backend loyalty adjust error:', err.message);
      }
    }

    setAdjustSuccess(true);
    setTimeout(() => {
      setAdjustSuccess(false);
      setShowAdjustModal(false);
      setAdjustForm({ points: '', type: 'add', reason: '' });
    }, 1000);
  };

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Balance Card */}
        <div className="bg-white border border-sage/30 bg-gradient-to-br from-white to-sage-soft/30 rounded-[16px] p-5 shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider">
              Points Balance
            </p>
            <div className="w-8 h-8 rounded-full bg-sage-soft border border-sage/30 flex items-center justify-center text-sage">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
              {loyalty.balance}
            </span>
            <span className="text-xs font-medium text-sage">pts available</span>
          </div>
          {discountValue > 0 && (
            <p className="text-[11px] font-medium text-sage mt-1">
              ≈ {discountValue.toLocaleString()} FCFA discount value
            </p>
          )}
        </div>

        {/* Total Earned */}
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider">
              Total Earned
            </p>
            <div className="w-8 h-8 rounded-full bg-soft-cream border border-border flex items-center justify-center text-charcoal">
              <Sparkles size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-charcoal">
              {loyalty.totalEarned}
            </span>
            <span className="text-xs text-muted-gray">pts lifetime</span>
          </div>
        </div>

        {/* Total Redeemed */}
        <div className="bg-white border border-border rounded-[16px] p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider">
              Total Redeemed
            </p>
            <div className="w-8 h-8 rounded-full bg-soft-cream border border-border flex items-center justify-center text-charcoal">
              <SlidersHorizontal size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-charcoal">
              {loyalty.totalRedeemed}
            </span>
            <span className="text-xs text-muted-gray">pts used</span>
          </div>
        </div>
      </div>

      {/* History & Manual Adjust Action */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold text-charcoal">Points History</h3>
            <p className="text-xs text-muted-gray">Record of earned, redeemed, and adjusted points</p>
          </div>
          {isManager && (
            <Button
              variant="secondary"
              onClick={() => setShowAdjustModal(true)}
              className="text-xs h-[36px] px-3"
            >
              <Plus size={14} />
              Adjust Points
            </Button>
          )}
        </div>

        {loyalty.history.length === 0 ? (
          <div className="p-8 text-center border-t border-border/60">
            <p className="text-sm text-muted-gray">No loyalty points history yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-soft-cream/40">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                    Source / Reason
                  </th>
                  <th className="text-center px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                    Points (+/-)
                  </th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {loyalty.history.map((row) => {
                  const isPositive = row.points > 0;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/40 last:border-b-0 hover:bg-soft-cream/30 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs text-charcoal font-medium whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-gray">
                        {row.source}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[6px] text-[11px] ${
                            isPositive
                              ? 'bg-success-soft text-success border border-success/20'
                              : 'bg-[#FAECEC] text-[#B34040] border border-[#ECCACA]'
                          }`}
                        >
                          {isPositive ? `+${row.points}` : row.points}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-charcoal text-right whitespace-nowrap">
                        {row.balance} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Adjust Modal for Manager */}
      {showAdjustModal && (
        <div
          className="fixed inset-0 bg-charcoal/40 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAdjustModal(false)}
        >
          <div
            className="w-full max-w-[420px] bg-white border border-border rounded-[20px] p-5 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-charcoal">
                Adjust Loyalty Points
              </h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {adjustSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-success-soft border border-success/20 flex items-center justify-center mx-auto mb-2 text-success">
                  <Check size={22} />
                </div>
                <p className="text-sm font-semibold text-charcoal">Points Adjusted!</p>
              </div>
            ) : (
              <form onSubmit={handleApplyAdjustment} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-gray mb-1">
                    Adjustment Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustForm((prev) => ({ ...prev, type: 'add' }))}
                      className={`h-[38px] rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                        adjustForm.type === 'add'
                          ? 'bg-sage-soft text-sage border-sage/40'
                          : 'bg-white text-muted-gray border-border'
                      }`}
                    >
                      + Add Points
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustForm((prev) => ({ ...prev, type: 'deduct' }))}
                      className={`h-[38px] rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                        adjustForm.type === 'deduct'
                          ? 'bg-[#FAECEC] text-[#B34040] border-[#ECCACA]'
                          : 'bg-white text-muted-gray border-border'
                      }`}
                    >
                      - Deduct Points
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-gray mb-1">
                    Number of Points *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustForm.points}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, points: e.target.value }))}
                    placeholder="e.g. 50"
                    className="w-full h-[42px] px-3.5 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-gray mb-1">
                    Reason / Note (optional)
                  </label>
                  <input
                    type="text"
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Birthday reward, promotion bonus"
                    className="w-full h-[42px] px-3.5 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAdjustModal(false)}
                    className="h-[40px] text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="h-[40px] text-xs px-5">
                    Apply Adjustment
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Feedback History Tab ── */
function FeedbackHistoryTab({ clientId }) {
  const { getFeedbackByClient } = useFeedback();
  const clientFeedback = getFeedbackByClient(clientId);

  if (clientFeedback.length === 0) {
    return (
      <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
        <Star size={24} className="text-border mx-auto mb-2" />
        <p className="text-sm text-muted-gray">No feedback received yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clientFeedback.map((fb) => (
        <div
          key={fb.id}
          className="bg-white border border-border rounded-[16px] p-4 shadow-card"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-sm font-semibold text-charcoal">{fb.service}</p>
              {fb.technician && (
                <p className="text-xs text-muted-gray mt-0.5">by {fb.technician}</p>
              )}
            </div>
            <span className="text-[11px] text-muted-gray shrink-0">{fb.date}</span>
          </div>
          <div className="flex items-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                strokeWidth={1.5}
                className={s <= fb.rating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-border'}
              />
            ))}
            <span className="text-xs text-muted-gray ml-1.5">
              {fb.rating}/5
            </span>
          </div>
          {fb.comment && (
            <div className="bg-soft-cream/40 border border-border/50 rounded-[10px] p-2.5">
              <p className="text-xs text-charcoal/80 leading-relaxed italic">
                "{fb.comment}"
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
