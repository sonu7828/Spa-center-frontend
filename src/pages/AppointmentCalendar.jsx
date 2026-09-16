/**
 * AppointmentCalendar — Screen 06
 *
 * Technician-based SPA calendar.
 * Manager/Reception: All columns (Amina, Bella, Grace) + responsive technician filter
 * Technician: Own column only
 *
 * Source: WIREFRAME.md Screen 06, FLOW.md §10-13
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Calendar as CalendarIcon,
  RotateCcw,
  User,
  Users,
  UserPlus,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ClientAcquisitionModal from '../components/ClientAcquisitionModal';
import { useAppointments } from '../context/AppointmentsContext';
import { useAuth } from '../context/AuthContext';

const categoryStyles = {
  nails: 'bg-dusty-rose-soft border-dusty-rose/30 hover:border-dusty-rose',
  facial: 'bg-sage-soft border-sage/30 hover:border-sage',
  massage: 'bg-warning-soft border-warning/30 hover:border-warning',
};

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr, days) {
  const current = dateStr || todayStr();
  const [y, m, d] = current.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

export default function AppointmentCalendar() {
  const navigate = useNavigate();
  const { getAppointmentsForDate } = useAppointments();
  const { user, allUsers } = useAuth();
  const [currentDate, setCurrentDate] = useState(todayStr());
  const [selectedTechFilter, setSelectedTechFilter] = useState('all'); // 'all' | tech.id
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);

  // Derive technicians dynamically from allUsers
  const technicians = allUsers.filter((u) => u.role === 'technician' && u.active !== false);

  const dayAppointments = getAppointmentsForDate(currentDate);
  const isToday = currentDate === todayStr();

  // Technician role: show only own column
  const isTechnician = user?.role === 'technician';
  const availableTechnicians = isTechnician
    ? technicians.filter((t) => t.name === user?.name)
    : technicians;

  // Filter columns based on technician filter
  const visibleTechnicians =
    selectedTechFilter === 'all' || isTechnician
      ? availableTechnicians
      : availableTechnicians.filter((t) => String(t.id) === String(selectedTechFilter));

  // Reception/Manager can create appointments; technician cannot
  const canCreateAppointment = user?.role === 'manager' || user?.role === 'reception';

  // Helpers for time/minutes conversion
  function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Snap a time string (HH:MM) to the nearest floor 30-min slot
  function snapToSlot(timeStr) {
    if (!timeStr) return '08:00';
    const [h, m] = timeStr.split(':').map(Number);
    const slotMin = m < 30 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${slotMin}`;
  }

  // Build a lookup: technicianId → { slotTime → [items] }
  // Handles multi-slot duration: an appointment occupies its start slot + all continuation 30-min slots
  const grid = {};
  availableTechnicians.forEach((t) => {
    grid[t.id] = {};
  });

  dayAppointments.forEach((apt) => {
    if (!grid[apt.technicianId]) return;
    if (apt.status === 'no-show' || apt.status === 'cancelled') return; // No-show/cancelled appointments do not block slots

    const startSlot = snapToSlot(apt.time);
    const startMins = timeToMinutes(apt.time);
    const totalDuration =
      apt.totalDuration ||
      apt.duration ||
      apt.services?.reduce((acc, s) => acc + (Number(s.duration) || 30), 0) ||
      30;
    const endMins = startMins + totalDuration;
    const endTimeStr = minutesToTime(endMins);

    // Primary slot (appointment starts here)
    if (!grid[apt.technicianId][startSlot]) {
      grid[apt.technicianId][startSlot] = [];
    }
    grid[apt.technicianId][startSlot].push({
      isStart: true,
      appointment: apt,
      endTime: endTimeStr,
      duration: totalDuration,
    });

    // Continuation slots: any subsequent 30-min slot up to endMins
    const startSlotMins = timeToMinutes(startSlot);
    timeSlots.forEach((slot) => {
      const slotMins = timeToMinutes(slot);
      if (slotMins > startSlotMins && slotMins < endMins) {
        if (!grid[apt.technicianId][slot]) {
          grid[apt.technicianId][slot] = [];
        }
        grid[apt.technicianId][slot].push({
          isStart: false,
          appointment: apt,
          endTime: endTimeStr,
          duration: totalDuration,
        });
      }
    });
  });

  return (
    <div className="w-full">
      <PageHeader
        title={isTechnician ? 'My Appointments' : 'Appointments'}
        action={
          <div className="flex items-center gap-2">
            {isTechnician && (
              <button
                onClick={() => setShowAcquisitionModal(true)}
                className="h-[38px] sm:h-[44px] px-3.5 sm:px-4 rounded-[11px] bg-sage hover:bg-sage-hover text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-[0.98]"
              >
                <UserPlus size={15} strokeWidth={2.2} />
                <span>Add New Client</span>
              </button>
            )}
            {canCreateAppointment && !isTechnician && (
              <Button
                onClick={() => navigate('/appointments/new')}
                className="h-[38px] sm:h-[44px] px-3.5 sm:px-5 text-xs sm:text-sm whitespace-nowrap font-bold"
              >
                <CalendarPlus size={16} strokeWidth={2} />
                <span>Appointment</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Date Navigation Toolbar */}
      <div className="bg-white border border-border rounded-[16px] p-3 sm:p-4 shadow-card mb-4 sm:mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Previous / Direct Date Picker / Next */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCurrentDate((d) => shiftDate(d, -1))}
              className="h-[38px] px-2.5 sm:px-3.5 flex items-center gap-1 rounded-[10px] border border-border bg-white text-charcoal hover:bg-soft-cream hover:border-sage/30 transition-all duration-150 cursor-pointer text-xs font-semibold shadow-xs shrink-0"
              title="Previous Day"
            >
              <ChevronLeft size={16} strokeWidth={2.2} />
              <span className="hidden md:inline">Prev</span>
            </button>

            {/* Interactive Date Picker Input */}
            <div className="relative flex items-center flex-1 sm:flex-initial">
              <input
                type="date"
                value={currentDate}
                onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
                className="w-full sm:w-auto h-[38px] px-3 pl-8 sm:pl-9 rounded-[10px] border border-border bg-soft-cream/60 text-charcoal text-xs sm:text-sm font-semibold outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer text-center sm:text-left"
                title="Click to choose date directly"
              />
              <CalendarIcon size={14} className="absolute left-2.5 sm:left-3 text-[#4F6748] pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setCurrentDate((d) => shiftDate(d, 1))}
              className="h-[38px] px-2.5 sm:px-3.5 flex items-center gap-1 rounded-[10px] border border-border bg-white text-charcoal hover:bg-soft-cream hover:border-sage/30 transition-all duration-150 cursor-pointer text-xs font-semibold shadow-xs shrink-0"
              title="Next Day"
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </div>

          {/* Date Display + Back to Today Action Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
            <p className="text-xs sm:text-sm font-semibold text-charcoal truncate flex items-center gap-1.5">
              <span>{formatDateDisplay(currentDate)}</span>
              {dayAppointments.length === 0 && (
                <span className="text-[11px] font-normal text-muted-gray">
                  — No appointments scheduled
                </span>
              )}
            </p>

            {!isToday && (
              <button
                type="button"
                onClick={() => setCurrentDate(todayStr())}
                className="h-[32px] sm:h-[34px] px-2.5 sm:px-3 rounded-[9px] bg-[#DCE7D7] border border-[#A7B89A]/50 text-[#4F6748] hover:bg-[#cde0c7] active:scale-[0.98] transition-all duration-150 cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                title="Return to Today"
              >
                <RotateCcw size={12} strokeWidth={2.5} />
                <span>Today</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Technician Selector Tabs — Mobile & Tablet view booster */}
      {!isTechnician && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedTechFilter('all')}
            className={`px-3 py-1.5 rounded-[9px] text-xs font-medium border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              selectedTechFilter === 'all'
                ? 'bg-sage text-charcoal font-semibold border-sage shadow-xs'
                : 'bg-white text-muted-gray border-border hover:bg-soft-cream hover:text-charcoal'
            }`}
          >
            <Users size={13} />
            All Staff ({technicians.length})
          </button>
          {technicians.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTechFilter(String(t.id))}
              className={`px-3 py-1.5 rounded-[9px] text-xs font-medium border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                selectedTechFilter === String(t.id)
                  ? 'bg-sage text-charcoal font-semibold border-sage shadow-xs'
                  : 'bg-white text-muted-gray border-border hover:bg-soft-cream hover:text-charcoal'
              }`}
            >
              <User size={13} />
              {t.name} · {(t.specialties || []).join(', ') || t.role}
            </button>
          ))}
        </div>
      )}

      {/* Calendar Grid Card */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: visibleTechnicians.length === 1 ? '100%' : '520px' }}>
            {/* Technician Headers */}
            <thead>
              <tr className="border-b border-border bg-soft-cream/40">
                <th className="sticky left-0 z-20 bg-soft-cream border-r border-border/80 text-left px-3 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider w-[64px] sm:w-[72px] shrink-0">
                  Time
                </th>
                {visibleTechnicians.map((tech) => (
                  <th
                    key={tech.id}
                    className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-gray uppercase tracking-wide border-r border-border/40 last:border-r-0 min-w-[140px]"
                  >
                    <span className="text-charcoal font-semibold text-sm normal-case">
                      {tech.name}
                    </span>
                    <span className="text-[11px] text-muted-gray ml-1.5 font-normal">
                      ({tech.role})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {timeSlots.map((slot) => {
                const hasAny = visibleTechnicians.some((t) => grid[t.id][slot]?.length > 0);

                return (
                  <tr
                    key={slot}
                    className={`border-b border-border/40 hover:bg-soft-cream/20 transition-colors ${
                      hasAny ? '' : 'h-[38px] sm:h-[42px]'
                    }`}
                  >
                    {/* Pinned Sticky Time Column */}
                    <td className="sticky left-0 z-10 bg-white border-r border-border/80 px-2.5 sm:px-3 py-1.5 text-xs text-muted-gray font-semibold whitespace-nowrap align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {slot}
                    </td>

                    {/* Technician Appointment Slots */}
                    {visibleTechnicians.map((tech) => {
                      const items = grid[tech.id][slot];
                      if (!items || items.length === 0) {
                        return (
                          <td
                            key={tech.id}
                            className="px-1.5 sm:px-2 py-1 border-r border-border/30 last:border-r-0"
                          />
                        );
                      }
                      return (
                        <td
                          key={tech.id}
                          className="px-1.5 sm:px-2 py-1 border-r border-border/30 last:border-r-0 align-top"
                        >
                          <div className="flex flex-col gap-1">
                            {items.map((item, idx) => {
                              const apt = item.appointment;
                              if (item.isStart) {
                                return (
                                  <button
                                    key={`${apt.id}-${slot}-${idx}`}
                                    onClick={() => navigate(`/appointments/${apt.id}`)}
                                    className={`w-full text-left px-2.5 sm:px-3 py-2 rounded-[10px] border cursor-pointer transition-all hover:scale-[1.01] shadow-2xs ${
                                      categoryStyles[apt.category] || 'bg-soft-cream border-border'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <p className="text-xs sm:text-sm font-semibold text-charcoal leading-snug truncate">
                                        {apt.time !== slot && (
                                          <span className="text-[10px] font-bold text-muted-gray mr-1">{apt.time}</span>
                                        )}
                                        {apt.clientName}
                                      </p>
                                      <span className="text-[10px] font-semibold text-muted-gray shrink-0 bg-white/70 px-1.5 py-0.5 rounded border border-border/40">
                                        {item.duration}m
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-muted-gray mt-0.5 truncate">
                                      {apt.service}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                      <span className="text-[10px] text-muted-gray font-medium">
                                        {apt.time}–{item.endTime}
                                      </span>
                                      {apt.introducedBy && (
                                        <p className="text-[9px] font-bold text-[#4F6748] bg-sage-soft/90 px-1.5 py-0.5 rounded-[4px] inline-block">
                                          By {apt.introducedBy}
                                        </p>
                                      )}
                                      {apt.status === 'late' && (
                                        <span className="inline-block px-1.5 py-0.5 rounded-[4px] bg-warning-soft border border-warning/20 text-[9px] font-bold text-warning uppercase tracking-wide">
                                          Late
                                        </span>
                                      )}
                                      {apt.status === 'no-show' && (
                                        <span className="inline-block px-1.5 py-0.5 rounded-[4px] bg-error-soft border border-error/20 text-[9px] font-bold text-error uppercase tracking-wide">
                                          No-Show
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              }

                              // Continuation slot
                              return (
                                <button
                                  key={`${apt.id}-cont-${slot}-${idx}`}
                                  onClick={() => navigate(`/appointments/${apt.id}`)}
                                  className={`w-full text-left px-2.5 sm:px-3 py-1.5 rounded-[10px] border border-dashed cursor-pointer transition-all hover:scale-[1.01] shadow-2xs opacity-90 ${
                                    categoryStyles[apt.category] || 'bg-soft-cream border-border'
                                  }`}
                                  title={`${tech.name} occupied with ${apt.clientName} until ${item.endTime}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F6748] shrink-0" />
                                      <p className="text-[11px] sm:text-xs font-semibold text-charcoal leading-tight truncate">
                                        ↳ {apt.clientName}
                                      </p>
                                    </div>
                                    <span className="text-[9px] font-medium text-muted-gray shrink-0 bg-white/70 px-1 py-0.5 rounded border border-border/40">
                                      Until {item.endTime}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-gray mt-0.5 truncate pl-3">
                                    {apt.service}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ClientAcquisitionModal
        isOpen={showAcquisitionModal}
        onClose={() => setShowAcquisitionModal(false)}
      />
    </div>
  );
}
