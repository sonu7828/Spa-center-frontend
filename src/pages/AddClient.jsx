/**
 * AddClient — Screen 03
 *
 * Fields (per WIREFRAME.md):
 *   Name, Phone/WhatsApp, Quartier, Birthday, Recommended By (Name + Phone)
 *
 * Referral detection: if referrer found → show -15% panel with name + phone
 * Save → creates new client in-memory → navigates to THAT client's file
 *
 * Source: WIREFRAME.md Screen 03, FLOW.md §5-6
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import PhoneInputField from '../components/PhoneInputField';
import { useClients } from '../context/ClientsContext';
import { useAuth } from '../context/AuthContext';
import { validatePhoneNumber } from '../utils/phone';

export default function AddClient() {
  const navigate = useNavigate();
  const { clients, addClient } = useClients();
  const { user, allUsers } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'MANAGER';

  // Eligible active staff for manager referral selection
  const eligibleStaff = (allUsers || []).filter(
    (u) => (u.role === 'technician' || u.role === 'reception') && u.active !== false
  );

  const [form, setForm] = useState({
    name: '',
    phone: '+237 ',
    quartier: '',
    birthday: '',
    anniversary: '',
  });

  const [referredByStaffId, setReferredByStaffId] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [serverError, setServerError] = useState('');

  const update = (field) => (e) => {
    setServerError('');
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    setServerError('');
    setPhoneError('');

    const validation = validatePhoneNumber(form.phone);
    if (!validation.isValid) {
      setPhoneError(validation.message);
      return;
    }

    // Check if client with this phone number already exists
    const cleanInputPhone = form.phone.replace(/[\s\-\+\(\)]/g, '');
    const existing = clients.find((c) => {
      const cleanExisting = (c.phone || '').replace(/[\s\-\+\(\)]/g, '');
      return cleanExisting && cleanExisting === cleanInputPhone;
    });

    if (existing) {
      const msg = `Client with phone number ${form.phone} already exists (${existing.name}).`;
      setServerError(msg);
      setPhoneError('Client with this phone number already exists.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedStaffObj = isManager
        ? eligibleStaff.find((s) => String(s.id) === String(referredByStaffId))
        : null;

      const newId = await addClient({
        name: form.name,
        phone: form.phone,
        quartier: form.quartier,
        birthday: form.birthday,
        anniversary: form.anniversary,
        introducedById: isManager ? (referredByStaffId || null) : user?.id,
        introducedBy: isManager
          ? (selectedStaffObj?.name || null)
          : (user?.name || null),
        source: isManager ? (referredByStaffId ? 'STAFF_REFERRAL' : 'DIRECT') : 'STAFF_REFERRAL',
      });

      navigate(`/clients/${newId}`);
    } catch (err) {
      console.error('Failed to add client:', err);
      const msg = err.message || 'Failed to create client. Client with this phone number already exists.';
      setServerError(msg);
      if (msg.toLowerCase().includes('phone') || msg.toLowerCase().includes('already exists')) {
        setPhoneError('Client with this phone number already exists.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Client"
        action={
          <Button variant="secondary" onClick={() => navigate('/clients')}>
            <ArrowLeft size={16} strokeWidth={1.8} />
            Back
          </Button>
        }
      />

      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        {/* Error / Warning Alert Banner */}
        {serverError && (
          <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-[12px] text-xs sm:text-sm font-semibold text-rose-700 animate-fade-in">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: Name + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <Input
            label="Name"
            value={form.name}
            onChange={update('name')}
            placeholder="Client name"
          />
          <PhoneInputField
            value={form.phone}
            onChange={(val) => {
              setForm((prev) => ({ ...prev, phone: val }));
              setServerError('');
              setPhoneError('');
            }}
            error={phoneError}
          />
        </div>

        {/* Row 2: Quartier + Birthday */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <Input
            label="Quartier"
            value={form.quartier}
            onChange={update('quartier')}
            placeholder="Neighborhood"
          />
          <Input
            label="Birthday Date"
            type="date"
            value={form.birthday}
            onChange={update('birthday')}
          />
        </div>

        {/* Row 2b: Anniversary Date (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <Input
            label="Anniversary Date (Optional)"
            type="date"
            value={form.anniversary}
            onChange={update('anniversary')}
          />
        </div>

        {/* Row 3: Referral Attribution */}
        {isManager ? (
          <div className="mb-5 p-4 bg-soft-cream/40 border border-border/80 rounded-[12px]">
            <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wide">
              Referred By Staff (Optional)
            </label>
            <select
              value={referredByStaffId}
              onChange={(e) => setReferredByStaffId(e.target.value)}
              className="w-full h-11 px-3.5 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
            >
              <option value="">Direct / Walk-In (No Staff Referral)</option>
              {eligibleStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} — {(staff.specialties || []).join(', ') || (staff.role === 'reception' ? 'Receptionist' : 'Technician')}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-gray mt-1.5">
              Select the active staff member who introduced this client, or leave as Direct Walk-In.
            </p>
          </div>
        ) : (
          <div className="mb-5 p-3.5 bg-sage-soft/50 border border-sage/20 rounded-[12px] flex items-center gap-2.5 text-xs text-charcoal">
            <UserPlus size={16} className="text-sage shrink-0" />
            <span>
              This client will automatically be attributed to your account (<strong>{user?.name || 'You'}</strong>) as an introduced client.
            </span>
          </div>
        )}



        {/* Save & Cancel */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3 pt-3 border-t border-border/50">
          <Button
            variant="secondary"
            onClick={() => navigate('/clients')}
            className="w-full sm:w-auto h-11 text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !form.name.trim() || !form.phone.trim()}
            className="w-full sm:w-auto h-11 text-xs sm:text-sm"
          >
            {isSaving ? 'Saving Client...' : 'Save Client'}
          </Button>
        </div>
      </div>
    </div>
  );
}
