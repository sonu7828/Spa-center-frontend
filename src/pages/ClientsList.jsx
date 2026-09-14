/**
 * ClientsList — Screen 02
 *
 * Content (per WIREFRAME.md):
 *   - Page header with "+ New Client" action
 *   - Search by Name / Phone
 *   - Client cards
 *
 * Source: WIREFRAME.md Screen 02, DESIGN-SYSTEM.md §17
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Eye, RotateCcw, UserX, TriangleAlert, X } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useClients } from '../context/ClientsContext';

export default function ClientsList() {
  const navigate = useNavigate();
  const { clients, setClientStatus } = useClients();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientToDeactivate, setClientToDeactivate] = useState(null);
  const [clientToActivate, setClientToActivate] = useState(null);

  const totalCount = clients.length;
  const activeCount = useMemo(
    () => clients.filter((c) => c.status !== 'INACTIVE' && c.isActive !== false).length,
    [clients]
  );
  const inactiveCount = useMemo(
    () => clients.filter((c) => c.status === 'INACTIVE' || c.isActive === false).length,
    [clients]
  );

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const isClientInactive = c.status === 'INACTIVE' || c.isActive === false;
      if (statusFilter === 'active' && isClientInactive) return false;
      if (statusFilter === 'inactive' && !isClientInactive) return false;

      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    });
  }, [clients, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Manage client profiles and service history."
        action={
          <Button onClick={() => navigate('/clients/new')}>
            <UserPlus size={16} strokeWidth={1.8} />
            New Client
          </Button>
        }
      />

      {/* Search & Status Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-gray"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name / Phone"
            className="w-full h-[46px] pl-11 pr-4 bg-white border border-border rounded-[11px] text-sm text-charcoal placeholder:text-muted-gray/50 outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150"
          />
        </div>

        {/* Status Filter Tabs (Desktop: right side; Mobile: horizontal wrap/scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 shrink-0">
          {[
            { id: 'all', label: 'All Clients', count: totalCount },
            { id: 'active', label: 'Active Clients', count: activeCount },
            { id: 'inactive', label: 'Inactive Clients', count: inactiveCount },
          ].map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-charcoal text-white shadow-xs'
                    : 'bg-warm-ivory text-muted-gray hover:text-charcoal hover:bg-white border border-border/70'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-soft-cream text-charcoal'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-soft-cream/40">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Client Name
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Quarter
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Last Service
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const isInactive = client.status === 'INACTIVE' || client.isActive === false;
                return (
                  <tr
                    key={client.id}
                    className="border-b border-border/40 last:border-b-0 hover:bg-soft-cream/20 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold text-charcoal">
                      {client.name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-gray">
                      {client.phone}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-gray">
                      {client.quartier || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-charcoal">
                      {client.lastService || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {isInactive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F0EC] text-muted-gray border border-border/70">
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sage-soft text-sage border border-sage/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="h-[30px] px-2.5 rounded-[7px] text-xs font-semibold text-charcoal bg-soft-cream border border-border hover:bg-white transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye size={13} />
                          View Client
                        </button>
                        {isInactive ? (
                          <button
                            onClick={() => setClientToActivate(client)}
                            className="h-[30px] px-2.5 rounded-[7px] text-xs font-semibold text-sage bg-sage-soft border border-sage/30 hover:bg-sage-soft/80 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <RotateCcw size={12} />
                            Restore Active
                          </button>
                        ) : (
                          <button
                            onClick={() => setClientToDeactivate(client)}
                            className="h-[30px] px-2.5 rounded-[7px] text-xs font-semibold text-muted-gray bg-warm-ivory border border-border/80 hover:text-[#B34040] hover:bg-[#FAECEC] hover:border-[#ECCACA] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <UserX size={12} />
                            Mark Inactive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tablet & Mobile Stacked Cards View (No horizontal scroll) */}
        <div className="block md:hidden divide-y divide-border/60">
          {filtered.map((client) => {
            const isInactive = client.status === 'INACTIVE' || client.isActive === false;
            return (
              <div
                key={client.id}
                className="p-4 space-y-2.5 hover:bg-soft-cream/20 transition-colors"
              >
                {/* Header: Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-charcoal leading-tight truncate">
                      {client.name}
                    </h4>
                    <p className="text-xs text-muted-gray mt-0.5 truncate">
                      {client.phone}
                    </p>
                  </div>
                  {isInactive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F0EC] text-muted-gray border border-border/70 shrink-0">
                      Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-soft text-sage border border-sage/30 shrink-0">
                      Active
                    </span>
                  )}
                </div>

                {/* Details: Quarter + Last Service */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-soft-cream/30 rounded-[8px] p-2 border border-border/40">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-gray block">
                      Quarter
                    </span>
                    <span className="font-medium text-charcoal truncate block">
                      {client.quartier || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-gray block">
                      Last Service
                    </span>
                    <span className="font-semibold text-charcoal truncate block">
                      {client.lastService || '—'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="h-[36px] px-2 rounded-[8px] text-xs font-semibold text-charcoal bg-soft-cream border border-border hover:bg-white transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Eye size={13} />
                    View Client
                  </button>
                  {isInactive ? (
                    <button
                      onClick={() => setClientToActivate(client)}
                      className="h-[36px] px-2 rounded-[8px] text-xs font-semibold text-sage bg-sage-soft border border-sage/30 hover:bg-sage-soft/80 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcw size={12} />
                      Restore Active
                    </button>
                  ) : (
                    <button
                      onClick={() => setClientToDeactivate(client)}
                      className="h-[36px] px-2 rounded-[8px] text-xs font-semibold text-muted-gray bg-warm-ivory border border-border/80 hover:text-[#B34040] hover:bg-[#FAECEC] hover:border-[#ECCACA] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <UserX size={12} />
                      Mark Inactive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-gray">No clients found.</p>
          </div>
        )}
      </div>

      {/* ── Confirm Mark Inactive Warning Modal ── */}
      {clientToDeactivate && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-[420px] bg-white border border-border rounded-[20px] p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Icon */}
            <button
              onClick={() => setClientToDeactivate(null)}
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
                <strong className="text-charcoal font-semibold">{clientToDeactivate.name}</strong> as inactive?
              </p>
              <p className="text-[11px] text-muted-gray/90 mt-2.5 bg-soft-cream/60 rounded-[9px] p-2.5 border border-border/50 text-left">
                ℹ️ All appointments, invoices, payments, loyalty points, and photos will remain permanently preserved. You can restore this client to active at any time.
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setClientToDeactivate(null)}
                className="h-10 text-xs font-semibold justify-center"
              >
                Cancel
              </Button>
              <button
                onClick={async () => {
                  await setClientStatus(clientToDeactivate.id, 'INACTIVE');
                  setClientToDeactivate(null);
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
      {clientToActivate && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-[420px] bg-white border border-border rounded-[20px] p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Icon */}
            <button
              onClick={() => setClientToActivate(null)}
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
                <strong className="text-charcoal font-semibold">{clientToActivate.name}</strong> to active status?
              </p>
              <p className="text-[11px] text-muted-gray/90 mt-2.5 bg-soft-cream/60 rounded-[9px] p-2.5 border border-border/50 text-left">
                ✅ This client will be immediately restored to active and will appear across all active client lists and appointment booking dropdowns.
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setClientToActivate(null)}
                className="h-10 text-xs font-semibold justify-center"
              >
                Cancel
              </Button>
              <button
                onClick={async () => {
                  await setClientStatus(clientToActivate.id, 'ACTIVE');
                  setClientToActivate(null);
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
