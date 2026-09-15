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
import { ArrowLeft, Check } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import { useClients } from '../context/ClientsContext';
import { useAuth } from '../context/AuthContext';

export default function AddClient() {
  const navigate = useNavigate();
  const { clients, addClient } = useClients();
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'MANAGER';

  const [form, setForm] = useState({
    name: '',
    phone: '',
    quartier: '',
    birthday: '',
    anniversary: '',
    recommendedByName: '',
    recommendedByPhone: '',
  });

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Simple referral detection for UI demonstration (only active when not manager)
  const referralFound =
    !isManager &&
    form.recommendedByName.trim().length > 0 &&
    clients.some((c) =>
      c.name.toLowerCase().includes(form.recommendedByName.toLowerCase())
    );

  const matchedReferrer = referralFound
    ? clients.find((c) =>
        c.name.toLowerCase().includes(form.recommendedByName.toLowerCase())
      )
    : null;

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build recommendedBy as { name, phone } if provided by non-manager
      let recommendedBy = null;
      if (!isManager) {
        if (matchedReferrer) {
          recommendedBy = {
            name: matchedReferrer.name,
            phone: matchedReferrer.phone,
          };
        } else if (form.recommendedByName.trim()) {
          recommendedBy = {
            name: form.recommendedByName.trim(),
            phone: form.recommendedByPhone.trim() || '',
          };
        }
      }

      const newId = await addClient({
        name: form.name,
        phone: form.phone,
        quartier: form.quartier,
        birthday: form.birthday,
        anniversary: form.anniversary,
        recommendedBy,
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
          <Input
            label="Phone / WhatsApp"
            value={form.phone}
            onChange={update('phone')}
            placeholder="+237"
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

        {/* Row 3: Recommended By — Name + Phone (Hidden for Manager) */}
        {!isManager && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <Input
              label="Recommended By — Name"
              value={form.recommendedByName}
              onChange={update('recommendedByName')}
              placeholder="Referrer name"
            />
            <Input
              label="Recommended By — Phone"
              value={form.recommendedByPhone}
              onChange={update('recommendedByPhone')}
              placeholder="Referrer phone"
            />
          </div>
        )}

        {/* Referral detection panel (Hidden for Manager) */}
        {!isManager && referralFound && matchedReferrer && (
          <div className="bg-success-soft border border-success/20 rounded-[12px] p-3.5 sm:p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Check size={16} className="text-success" />
              <span className="text-sm font-semibold text-charcoal">
                Referral Found
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-gray">
              Recommended By: {matchedReferrer.name} — {matchedReferrer.phone}
            </p>
            <p className="text-xs sm:text-sm font-medium text-charcoal mt-1">
              New Client Discount: -15%
            </p>
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
