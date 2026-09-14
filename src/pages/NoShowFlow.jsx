/**
 * NoShowFlow — Screen 10
 *
 * Marks appointment as no-show, increments client no-show counter.
 * If client reaches 2 no-shows → show deposit required.
 *
 * Idempotent: Same appointment cannot increment client no-show count more than once.
 *
 * Source: WIREFRAME.md Screen 10, FLOW.md §19
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserX, TriangleAlert } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAppointments } from '../context/AppointmentsContext';
import { useClients } from '../context/ClientsContext';

export default function NoShowFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAppointment, updateAppointment } = useAppointments();
  const { clients, updateClient } = useClients();

  const apt = getAppointment(id);
  const [confirmed, setConfirmed] = useState(false);

  if (!apt) {
    return (
      <div>
        <PageHeader title="No-Show" />
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <p className="text-sm text-muted-gray">Appointment not found.</p>
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === apt.clientId);
  const isAlreadyNoShow = apt.status === 'no-show';
  const previousNoShows = isAlreadyNoShow
    ? Math.max(0, (client?.noShows || 1) - 1)
    : (client?.noShows || 0);
  const currentNoShows = isAlreadyNoShow
    ? (client?.noShows || 0)
    : previousNoShows + 1;

  const handleConfirm = async () => {
    // Only increment client count if this specific appointment hasn't been counted as no-show yet
    if (!isAlreadyNoShow) {
      updateAppointment(id, { status: 'no-show' });
      if (client && updateClient) {
        updateClient(client.id, { noShows: currentNoShows });
      }
    }

    setConfirmed(true);
  };

  if (confirmed || isAlreadyNoShow) {
    return (
      <div>
        <PageHeader
          title="No-Show"
          action={
            <Button
              variant="secondary"
              onClick={() => navigate('/appointments')}
            >
              <ArrowLeft size={16} strokeWidth={1.8} />
              Calendar
            </Button>
          }
        />

        <div className="bg-white border border-border rounded-[16px] p-6 shadow-card">
          <h2 className="text-lg font-semibold text-charcoal mb-1">
            {apt.clientName}
          </h2>
          <p className="text-sm text-muted-gray mb-4">
            No-Show recorded.
          </p>

          <p className="text-sm text-charcoal mb-1">
            Current No-Shows: {client ? client.noShows : currentNoShows}
          </p>

          {(client?.noShows || currentNoShows) >= 2 && (
            <div className="bg-error-soft border border-error/20 rounded-[12px] p-4 mt-4 flex items-start gap-3">
              <TriangleAlert size={18} className="text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-charcoal">
                  Client reached {client?.noShows || currentNoShows} No-Shows
                </p>
                <p className="text-sm text-muted-gray mt-0.5">
                  Next Appointment: Deposit Required
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="No-Show"
        action={
          <Button
            variant="secondary"
            onClick={() => navigate(`/appointments/${id}`)}
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            Back
          </Button>
        }
      />

      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        <h2 className="text-lg font-semibold text-charcoal mb-1">
          {apt.clientName}
        </h2>

        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-gray">
            Previous No-Shows: {previousNoShows}
          </p>
          <p className="text-sm font-medium text-charcoal">
            Current No-Shows: {currentNoShows}
          </p>
        </div>

        {currentNoShows >= 2 && (
          <div className="bg-warning-soft border border-warning/20 rounded-[12px] p-3.5 sm:p-4 mt-4 flex items-start gap-3">
            <TriangleAlert size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal">
                Client reached {currentNoShows} No-Shows
              </p>
              <p className="text-xs sm:text-sm text-muted-gray mt-0.5 leading-relaxed">
                Next Appointment: Deposit Required
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3 mt-6 pt-3 border-t border-border/50">
          <Button variant="secondary" onClick={() => navigate(`/appointments/${id}`)} className="w-full sm:w-auto h-11">
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirm} className="w-full sm:w-auto h-11 text-xs sm:text-sm">
            <UserX size={16} strokeWidth={1.8} />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
