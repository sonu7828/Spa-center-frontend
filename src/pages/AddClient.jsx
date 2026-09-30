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
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import { useClients } from '../context/ClientsContext';
import { useAuth } from '../context/AuthContext';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phone';

export default function AddClient() {
  const navigate = useNavigate();
  const { clients, addClient } = useClients();
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'MANAGER';

  const [form, setForm] = useState({
    name: '',
    phone: '+237 ',
    quartier: '',
    birthday: '',
    anniversary: '',
  });

  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setForm((prev) => ({ ...prev, phone: formatted }));
    const validation = validatePhoneNumber(formatted);
    if (!validation.isValid && formatted.trim() !== '+237') {
      setPhoneError(validation.message);
    } else {
      setPhoneError('');
    }
  };

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const phoneStatus = validatePhoneNumber(form.phone);

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    const validation = validatePhoneNumber(form.phone);
    if (!validation.isValid) {
      setPhoneError(validation.message);
      return;
    }

    setIsSaving(true);
    try {
      const newId = await addClient({
        name: form.name,
        phone: form.phone,
        quartier: form.quartier,
        birthday: form.birthday,
        anniversary: form.anniversary,
        source: isManager ? 'DIRECT' : undefined,
      });

      navigate(`/clients/${newId}`);
    } catch (err) {
      console.error(err);
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
        {/* Row 1: Name + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <Input
            label="Name"
            value={form.name}
            onChange={update('name')}
            placeholder="Client name"
          />
          <div>
            <Input
              label="Phone / WhatsApp"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="+237 6XX XX XX XX"
            />
            {form.phone.trim() !== '+237' && form.phone.trim() !== '' && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {phoneStatus.isValid ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle size={13} /> {phoneStatus.message}
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle size={13} /> {phoneError || phoneStatus.message}
                  </span>
                )}
              </div>
            )}
          </div>
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
