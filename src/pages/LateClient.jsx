/**
 * LateClient — Screen 09
 *
 * Shows late client info and reschedule suggestion.
 * Rule: 20+ minutes late → suggest reschedule
 * Allows selecting new date & new time, and updating the SAME appointment in-memory.
 *
 * Source: WIREFRAME.md Screen 09, FLOW.md §17-18
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAppointments } from '../context/AppointmentsContext';
import { BOOKING_TIME_SLOTS } from '../utils/timezone';

export default function LateClient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAppointment, updateAppointment } = useAppointments();

  const apt = getAppointment(id);

  const [newDate, setNewDate] = useState(apt ? apt.date : '');
  const [newTime, setNewTime] = useState(apt ? apt.time : '');

  if (!apt) {
    return (
      <div>
        <PageHeader title="Client Late" />
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <p className="text-sm text-muted-gray">Appointment not found.</p>
        </div>
      </div>
    );
  }

  const [rescheduleError, setRescheduleError] = useState('');
  const isTimeOutOfRange = newTime ? newTime < '10:00' || newTime > '21:00' : false;

  const handleReschedule = async () => {
    setRescheduleError('');
    if (!newDate || !newTime) return;

    if (newTime < '10:00' || newTime > '21:00') {
      setRescheduleError('Appointments can only be rescheduled between 10:00 AM and 9:00 PM (10:00 – 21:00).');
      return;
    }

    try {
      await updateAppointment(apt.id, { date: newDate, time: newTime, lateMinutes: 20, status: "late" });
      // Update the EXACT same appointment record (same ID, no duplicate)
      await updateAppointment(id, {
        date: newDate,
        time: newTime,
        status: 'scheduled',
      });
      navigate('/appointments');
    } catch (err) {
      setRescheduleError(err?.message || 'Failed to reschedule appointment');
    }
  };

  return (
    <div>
      <PageHeader
        title="Client Late"
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

      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card mb-6">
        <h2 className="text-lg font-semibold text-charcoal mb-1">
          {apt.clientName}
        </h2>
        <p className="text-sm text-muted-gray mb-4">
          Appointment: {apt.time}
        </p>

        <div className="bg-warning-soft border border-warning/20 rounded-[12px] p-3.5 sm:p-4 mb-5 flex items-start gap-3">
          <Clock size={18} className="text-warning shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-charcoal">
              Client is 20+ minutes late.
            </p>
            <p className="text-xs sm:text-sm text-muted-gray mt-1 leading-relaxed">
              Suggested Action: Reschedule Appointment
            </p>
          </div>
        </div>

        {/* Error / Out of Hours Alert */}
        {(rescheduleError || isTimeOutOfRange) && (
          <div className="bg-error-soft border border-error/20 rounded-[12px] p-3.5 sm:p-4 mb-4">
            <p className="text-xs sm:text-sm text-error leading-relaxed">
              {rescheduleError || 'Appointments can only be rescheduled between 10:00 AM and 9:00 PM (10:00 – 21:00).'}
            </p>
          </div>
        )}

        {/* Reschedule Date & Time Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
          <div>
            <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
              New Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
              New Time
              <span className="text-[11px] font-normal text-muted-gray ml-1.5">
                (10:00 AM – 09:00 PM)
              </span>
            </label>
            <select
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full h-[46px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150 cursor-pointer appearance-none"
            >
              <option value="">Select Time (10:00 AM – 09:00 PM)</option>
              {BOOKING_TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3 pt-2 border-t border-border/50">
          <Button variant="secondary" onClick={() => navigate(`/appointments/${id}`)} className="w-full sm:w-auto h-11">
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!newDate || !newTime || isTimeOutOfRange}
            className="w-full sm:w-auto h-11 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reschedule
          </Button>
        </div>
      </div>
    </div>
  );
}
