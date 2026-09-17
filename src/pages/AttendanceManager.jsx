/**
 * AttendanceManager — Manager attendance overview page
 *
 * Features:
 *   - Two tabs: Today's Attendance + Attendance History
 *   - Today tab: all employee status cards with photo, clock times
 *   - History tab: filterable by date, employee, status
 *   - Quick stats
 *   - Manual Attendance Entry for exceptional cases:
 *       - Select employee, date, clock in/out times
 *       - Status: Completed or Working
 *       - Reason required with quick-pick suggestions
 *       - Optional verification photo upload
 *       - Override support for existing records
 *   - Clear [ ⚠ Manual Entry ] / [ Added by Manager ] badges
 *   - Interactive details modal / hover tooltips on manual records
 *   - Photo preview modal
 *
 * Access: manager only
 *
 * Source: Employee Attendance UI spec — Section 4, 5 + Manual Entry & Override
 */

import { useState, useMemo, useRef } from 'react';
import {
  Clock,
  Users,
  CheckCircle,
  Timer,
  AlertCircle,
  LogIn,
  LogOut,
  Calendar,
  History,
  Eye,
  X,
  Plus,
  UserPlus,
  Upload,
  Camera,
  Info,
  RotateCcw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import {
  COMPANY_TIMEZONE,
  getCompanyTodayDateStr,
  getCompanyCurrentTimeStr,
  parseToCompany24Hour,
  formatCompanyDateDisplay,
} from '../utils/timezone';

const QUICK_REASONS = [
  'Employee device issue',
  'Camera not working',
  'Forgot to clock in',
  'Emergency situation',
];

const parseTo24Hour = parseToCompany24Hour;
const getCurrentTimeStr = getCompanyCurrentTimeStr;

export default function AttendanceManager() {
  const { user, allUsers } = useAuth();
  const { todayAllRecords, allRecordsSorted, addManualAttendance } = useAttendance();

  const [activeTab, setActiveTab] = useState('today');
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedManualDetails, setSelectedManualDetails] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Manual form state
  const [manualEmployee, setManualEmployee] = useState('');
  const [manualDate, setManualDate] = useState(getCompanyTodayDateStr());
  const [manualClockIn, setManualClockIn] = useState(getCompanyCurrentTimeStr());
  const [manualClockOut, setManualClockOut] = useState(getCompanyCurrentTimeStr());
  const [manualStatus, setManualStatus] = useState('completed');
  const [manualReason, setManualReason] = useState('');
  const [manualPhoto, setManualPhoto] = useState(null);
  const [canOverrideRecord, setCanOverrideRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Today attendance filter: 'all' | 'present' | 'working' | 'completed' | 'absent'
  const [todayFilter, setTodayFilter] = useState('all');

  // History filters
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: COMPANY_TIMEZONE,
  });

  // Get all active employees who track attendance (excluding manager and cleaner)
  const employees = allUsers.filter(
    (u) => u.active !== false && u.role !== 'manager' && u.role !== 'cleaner'
  );

  // Build employee attendance map for today
  const attendanceMap = {};
  todayAllRecords.forEach((rec) => {
    attendanceMap[rec.employeeId] = rec;
  });

  // Stats
  const totalEmployees = employees.length;
  const workingCount = employees.filter((e) => attendanceMap[e.id]?.status === 'working').length;
  const completedCount = employees.filter((e) => attendanceMap[e.id]?.status === 'completed').length;
  const notStartedCount = totalEmployees - workingCount - completedCount;

  // Filtered employees for today's roster: All, Present, Absent, Completed
  const filteredTodayEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const rec = attendanceMap[emp.id];
      const status = rec?.status || 'not_started';
      if (todayFilter === 'all') return true;
      if (todayFilter === 'present') return status === 'working';
      if (todayFilter === 'absent') return status === 'not_started';
      if (todayFilter === 'completed') return status === 'completed';
      return true;
    });
  }, [employees, attendanceMap, todayFilter]);

  const openManualForEmployee = (empId, targetStatus = 'completed') => {
    resetManualForm();
    const idStr = String(empId);
    setManualEmployee(idStr);
    setManualStatus(targetStatus);

    const empRec = attendanceMap[empId] || attendanceMap[idStr];
    if (empRec) {
      if (empRec.date) {
        setManualDate(empRec.date);
      }
      // Pre-load the exact time when employee clocked in
      const preloadedIn = parseTo24Hour(empRec.clockIn, empRec.clockInRaw);
      if (preloadedIn) {
        setManualClockIn(preloadedIn);
      }
      setCanOverrideRecord(true);

      if (targetStatus === 'completed') {
        setManualClockOut(getCurrentTimeStr());
        setManualReason('Manager recorded employee clock out');
      }
    } else {
      setManualClockIn(getCurrentTimeStr());
      setCanOverrideRecord(false);
      if (targetStatus === 'working') {
        setManualReason('Manual clock-in recorded by manager');
      }
    }

    setShowManualForm(true);
  };

  const statusConfig = {
    not_started: {
      label: 'Absent',
      color: 'text-muted-gray',
      bg: 'bg-[#F3F0EC]',
      border: 'border-border/80',
      dot: 'bg-muted-gray',
    },
    working: {
      label: 'Working',
      color: 'text-[#4F6748]',
      bg: 'bg-success-soft',
      border: 'border-success/30',
      dot: 'bg-success',
    },
    completed: {
      label: 'Completed',
      color: 'text-[#4F6748]',
      bg: 'bg-[#DCE7D7]',
      border: 'border-[#4F6748]/20',
      dot: 'bg-[#4F6748]',
    },
  };

  const stats = [
    { label: 'Total Staff', value: totalEmployees, icon: Users, color: 'text-charcoal', bg: 'bg-warm-ivory' },
    { label: 'Working', value: workingCount, icon: Timer, color: 'text-success', bg: 'bg-success-soft' },
    { label: 'Completed', value: completedCount, icon: CheckCircle, color: 'text-[#4F6748]', bg: 'bg-[#DCE7D7]' },
    { label: 'Not Started', value: notStartedCount, icon: AlertCircle, color: 'text-muted-gray', bg: 'bg-[#F3F0EC]' },
  ];

  // Unique employee names for filter dropdown
  const uniqueEmployees = useMemo(() => {
    const names = new Set();
    allRecordsSorted.forEach((r) => names.add(r.employeeName));
    return [...names].sort();
  }, [allRecordsSorted]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    return allRecordsSorted.filter((rec) => {
      if (filterDate && rec.date !== filterDate) return false;
      if (filterEmployee && rec.employeeName !== filterEmployee) return false;
      if (filterStatus && rec.status !== filterStatus) return false;
      return true;
    });
  }, [allRecordsSorted, filterDate, filterEmployee, filterStatus]);

  const formatDateDisplay = (dateStr) => {
    return formatCompanyDateDisplay(dateStr);
  };

  const tabs = [
    { id: 'today', label: "Today's Attendance", icon: Clock },
    { id: 'history', label: 'Attendance History', icon: History },
  ];

  const hasActiveFilters = filterDate || filterEmployee || filterStatus;

  // Manual entry handlers
  const resetManualForm = () => {
    setManualEmployee('');
    setManualDate(getCompanyTodayDateStr());
    const currentCameroonTime = getCompanyCurrentTimeStr();
    setManualClockIn(currentCameroonTime);
    setManualClockOut(currentCameroonTime);
    setManualStatus('completed');
    setManualReason('');
    setManualPhoto(null);
    setCanOverrideRecord(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setManualPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Derived states for currently selected employee in manual modal
  const selectedEmployeeObj = useMemo(() => {
    return employees.find((e) => String(e.id) === String(manualEmployee)) || null;
  }, [employees, manualEmployee]);

  const existingEmpRec = useMemo(() => {
    if (!manualEmployee) return null;
    return attendanceMap[manualEmployee] || null;
  }, [attendanceMap, manualEmployee]);

  const isClockOutAction = Boolean(
    existingEmpRec && existingEmpRec.status === 'working' && manualStatus === 'completed'
  );

  const handleManualSubmit = async (forceOverride = false) => {
    if (isSubmitting) return;
    const emp = employees.find((e) => String(e.id) === manualEmployee);
    if (!emp) {
      setFeedback({ type: 'error', message: 'Please select an employee.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const shouldOverride = forceOverride || canOverrideRecord || isClockOutAction;
      const result = await addManualAttendance({
        employee: emp,
        date: manualDate,
        clockInTime: manualClockIn,
        clockOutTime: manualStatus === 'completed' ? manualClockOut : null,
        status: manualStatus,
        reason: manualReason,
        photo: manualPhoto,
        manager: user,
        allowOverride: shouldOverride,
      });

      if (result.success) {
        const wasClockOut = isClockOutAction || (existingEmpRec?.status === 'working' && manualStatus === 'completed');
        setFeedback({
          type: 'success',
          message: wasClockOut
            ? `Clock out recorded successfully for ${emp.name}.`
            : shouldOverride
            ? `Attendance updated successfully for ${emp.name}.`
            : `Manual attendance added for ${emp.name}.`,
        });
        setShowManualForm(false);
        resetManualForm();
      } else if (result.canOverride) {
        setCanOverrideRecord(true);
        setFeedback({ type: 'error', message: result.error });
      } else {
        setFeedback({ type: 'error', message: result.error });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to submit attendance' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 4500);
    }
  };

  // Manual badge component
  const ManualBadge = ({ rec }) => {
    if (!rec.isManualEntry) return null;
    return (
      <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedManualDetails(rec);
          }}
          title={`Added by ${rec.addedByManager || 'Manager'}: ${rec.reason} (Click for details)`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-warning-soft hover:bg-warning/20 text-warning text-[9px] font-semibold border border-warning/25 transition-colors cursor-pointer"
        >
          <span>⚠ Manual Entry</span>
          <span className="text-[8px] opacity-75">· Details</span>
        </button>
        {rec.reason && (
          <span className="text-[9px] text-muted-gray truncate max-w-[200px] italic">
            "{rec.reason}"
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-3 sm:py-5 space-y-3.5 sm:space-y-4">
      {/* Top Section: Employee Attendance Left, Date + Add Manual Attendance Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-[26px] font-semibold text-charcoal">
            Employee Attendance
          </h1>
          <p className="text-xs sm:text-sm text-muted-gray mt-0.5">
            Daily staff presence and verification records
          </p>
        </div>

        {/* Right side: Date + Add Manual Attendance Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-auto">
          {/* Date */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white border border-border text-xs font-semibold text-charcoal shadow-xs">
            <Calendar size={14} className="text-sage" />
            <span>{todayFormatted}</span>
            <span className="text-[10px] text-sage font-medium bg-sage-soft px-1.5 py-0.5 rounded-[5px] border border-sage/20">
              Cameroon (WAT)
            </span>
          </div>

          {/* Add Manual Attendance Button */}
          <button
            onClick={() => {
              resetManualForm();
              setShowManualForm(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[11px] bg-[#4F6748] hover:bg-[#3E5238] text-white text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Manual Attendance</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs sm:text-sm font-medium border transition-all duration-300 ${
            feedback.type === 'success'
              ? 'bg-success-soft text-[#4F6748] border-success/30'
              : 'bg-error-soft text-error border-error/30'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {feedback.message}
        </div>
      )}

      {/* Main Attendance Container */}
      <div className="bg-soft-cream rounded-[16px] border border-border shadow-card overflow-hidden">
        {/* Section Header Toolbar: Left has Title + Filters, Right has Tabs */}
        <div className="p-3.5 sm:p-4 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-warm-ivory/30">
          {/* Left: Today's Roster + Filter Pills OR History Title */}
          {activeTab === 'today' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-sage" />
                <h3 className="text-sm sm:text-base font-bold text-charcoal whitespace-nowrap">
                  Today's Attendance Roster
                </h3>
                <span className="text-xs text-muted-gray font-normal whitespace-nowrap">
                  ({filteredTodayEmployees.length} of {totalEmployees})
                </span>
              </div>

              {/* Filters: All 3 | Present 0 | Absent 1 | Completed 2 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All', count: totalEmployees },
                  { id: 'present', label: 'Present', count: workingCount },
                  { id: 'absent', label: 'Absent', count: notStartedCount },
                  { id: 'completed', label: 'Completed', count: completedCount },
                ].map((f) => {
                  const isActive = todayFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setTodayFilter(f.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-charcoal text-white shadow-xs'
                          : 'bg-white text-muted-gray hover:text-charcoal hover:bg-warm-ivory border border-border/70'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#F3F0EC] text-charcoal'
                        }`}
                      >
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <History size={16} className="text-sage" />
              <h3 className="text-sm sm:text-base font-bold text-charcoal">
                Attendance History
              </h3>
              <span className="text-xs text-muted-gray font-normal">
                ({filteredHistory.length} records)
              </span>
            </div>
          )}

          {/* Right: Tabs: Today's Attendance | Attendance History */}
          <div className="inline-flex bg-warm-ivory rounded-[10px] p-1 border border-border shadow-xs shrink-0 self-start lg:self-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-charcoal shadow-xs border border-border/50'
                      : 'text-muted-gray hover:text-charcoal hover:bg-white/50'
                  }`}
                >
                  <TabIcon
                    size={13}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className={isActive ? 'text-sage' : 'text-muted-gray'}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body: Today Table */}
        {activeTab === 'today' && (
          <div>
            {filteredTodayEmployees.length === 0 ? (
              <div className="text-center py-10 px-4 bg-warm-ivory/20">
                <Users size={32} className="text-border mx-auto mb-2" />
                <p className="text-xs font-medium text-charcoal">
                  No staff found in "{todayFilter === 'absent' ? 'Absent' : todayFilter.charAt(0).toUpperCase() + todayFilter.slice(1)}"
                </p>
                <button
                  onClick={() => setTodayFilter('all')}
                  className="mt-2 text-xs text-sage font-semibold hover:underline cursor-pointer"
                >
                  View all staff
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-warm-ivory/60">
                      <th className="text-left text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Employee
                      </th>
                      <th className="text-left text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Clock In
                      </th>
                      <th className="text-left text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Clock Out
                      </th>
                      <th className="text-left text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Working Hours
                      </th>
                      <th className="text-left text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Photos
                      </th>
                      <th className="text-left text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Status
                      </th>
                      <th className="text-left text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Type / Notes
                      </th>
                      <th className="text-right text-[10px] font-bold text-muted-gray uppercase tracking-wider py-3 px-4">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredTodayEmployees.map((emp) => {
                      const rec = attendanceMap[emp.id];
                      const status = rec?.status || 'not_started';
                      const sc = statusConfig[status];

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-warm-ivory/50 transition-colors duration-100"
                        >
                          {/* Employee */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {rec?.photo ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingPhoto({
                                      photo: rec.photo,
                                      name: rec.employeeName || emp.name,
                                      role: rec.employeeRole || emp.role,
                                      date: todayFormatted,
                                      clockIn: rec.clockIn,
                                      isManual: rec.isManualEntry,
                                      addedBy: rec.addedByManager,
                                      reason: rec.reason,
                                    })
                                  }
                                  className="relative group cursor-pointer shrink-0"
                                  title="Click to view photo"
                                >
                                  <img
                                    src={rec.photo}
                                    alt={emp.name}
                                    className="w-8 h-8 rounded-full object-cover border border-success/40 group-hover:border-success transition-all shadow-xs"
                                  />
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success text-white flex items-center justify-center text-[7px]">
                                    <Camera size={8} />
                                  </span>
                                </button>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-sage-soft border border-sage/20 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-sage-hover">
                                    {(emp.name || '?')[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-charcoal truncate">
                                  {emp.name}
                                </p>
                                <p className="text-[10px] text-muted-gray capitalize">
                                  {emp.role}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Clock In */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {rec?.clockIn ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                                <LogIn size={13} className="text-success shrink-0" />
                                <span>{rec.clockIn}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-gray/60">—</span>
                            )}
                          </td>

                          {/* Clock Out */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {rec?.clockOut ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                                <LogOut size={13} className="text-error shrink-0" />
                                <span>{rec.clockOut}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-gray/60">—</span>
                            )}
                          </td>

                          {/* Working Hours */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {rec?.workingHours ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-bold text-[#4F6748] bg-[#DCE7D7]">
                                {rec.workingHours}
                              </span>
                            ) : status === 'working' ? (
                              <span className="text-[11px] text-[#4F6748] font-semibold animate-pulse">
                                In Progress
                              </span>
                            ) : (
                              <span className="text-xs text-muted-gray/60">—</span>
                            )}
                          </td>

                          {/* Photos */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {rec ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(rec.clockInPhoto || rec.photo) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingPhoto({
                                        photo: rec.clockInPhoto || rec.photo,
                                        name: rec.employeeName || emp.name,
                                        role: rec.employeeRole || emp.role,
                                        date: todayFormatted,
                                        timeLabel: `Clock In: ${rec.clockIn || '—'}`,
                                        typeLabel: 'Clock In Photo',
                                        isManual: rec.isManualEntry,
                                        addedBy: rec.addedByManager,
                                        reason: rec.reason,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-white hover:bg-warm-ivory text-[10px] font-semibold text-[#4F6748] border border-border/80 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <LogIn size={10} className="text-success" />
                                    <span>In Photo</span>
                                  </button>
                                )}
                                {rec.clockOutPhoto && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingPhoto({
                                        photo: rec.clockOutPhoto,
                                        name: rec.employeeName || emp.name,
                                        role: rec.employeeRole || emp.role,
                                        date: todayFormatted,
                                        timeLabel: `Clock Out: ${rec.clockOut || '—'}`,
                                        typeLabel: 'Clock Out Photo',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-white hover:bg-warm-ivory text-[10px] font-semibold text-[#8C4A50] border border-border/80 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <LogOut size={10} className="text-error" />
                                    <span>Out Photo</span>
                                  </button>
                                )}
                                {!rec.clockInPhoto && !rec.photo && !rec.clockOutPhoto && (
                                  <span className="text-xs text-muted-gray/60">—</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-gray/60">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${sc.bg} ${sc.color} border ${sc.border}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${
                                  status === 'working' ? 'animate-pulse' : ''
                                }`}
                              />
                              {status === 'not_started' ? 'Absent' : sc.label}
                            </span>
                          </td>

                          {/* Type / Notes */}
                          <td className="py-3 px-4">
                            {rec?.isManualEntry ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedManualDetails(rec)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-warning-soft hover:bg-warning/20 text-warning text-[9px] font-bold border border-warning/25 transition-colors cursor-pointer"
                                  title="Click for manual entry details"
                                >
                                  <span>⚠ Manual</span>
                                </button>
                                {rec.reason && (
                                  <span
                                    className="text-[10px] text-muted-gray truncate max-w-[140px] italic"
                                    title={rec.reason}
                                  >
                                    "{rec.reason}"
                                  </span>
                                )}
                              </div>
                            ) : rec ? (
                              <span className="text-[10px] font-medium text-muted-gray">
                                Standard
                              </span>
                            ) : (
                              <span className="text-xs text-muted-gray/60">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {status === 'not_started' ? (
                              <button
                                type="button"
                                onClick={() => openManualForEmployee(emp.id, 'working')}
                                title="Add manual attendance for this employee"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-warm-ivory hover:bg-white text-charcoal text-[11px] font-semibold border border-border hover:border-sage/60 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                              >
                                <Plus size={12} strokeWidth={2.5} />
                                <span>Manual In</span>
                              </button>
                            ) : status === 'working' ? (
                              <button
                                type="button"
                                onClick={() => openManualForEmployee(emp.id, 'completed')}
                                title="Record clock out for this employee"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-warm-ivory hover:bg-white text-charcoal text-[11px] font-semibold border border-border hover:border-sage/60 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                              >
                                <LogOut size={12} />
                                <span>Clock Out</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4F6748]">
                                <CheckCircle size={12} />
                                <span>Done</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Body: History */}
        {activeTab === 'history' && (
          <div className="p-3.5 sm:p-5 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2.5">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1 block">Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] border border-border bg-warm-ivory text-xs text-charcoal focus:outline-none focus:border-sage transition-colors"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1 block">Employee</label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] border border-border bg-warm-ivory text-xs text-charcoal focus:outline-none focus:border-sage transition-colors cursor-pointer"
                >
                  <option value="">All Employees</option>
                  {uniqueEmployees.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] border border-border bg-warm-ivory text-xs text-charcoal focus:outline-none focus:border-sage transition-colors cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="working">Working</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setFilterDate(''); setFilterEmployee(''); setFilterStatus(''); }}
                    className="px-3 py-2 rounded-[10px] border border-border bg-white text-xs font-medium text-muted-gray hover:text-charcoal hover:border-sage transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-gray font-medium">
              {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''} found
              {hasActiveFilters && ' (filtered)'}
            </p>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={36} className="text-border mx-auto mb-3" />
                <p className="text-sm text-muted-gray">No attendance records found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-warm-ivory/60">
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Date</th>
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Employee</th>
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Role</th>
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Clock In</th>
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Clock Out</th>
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Hours</th>
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Status</th>
                        <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Photo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((rec) => {
                        const rsc = statusConfig[rec.status] || statusConfig.not_started;
                        return (
                          <tr key={rec.id} className="border-b border-border/50 hover:bg-warm-ivory/50 transition-colors">
                            <td className="py-3 px-3 text-xs font-medium text-charcoal">{formatDateDisplay(rec.date)}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-sage-soft flex items-center justify-center shrink-0">
                                  <span className="text-[9px] font-bold text-sage-hover">{(rec.employeeName || '?')[0]}</span>
                                </div>
                                <div className="flex items-center flex-wrap gap-1">
                                  <span className="text-xs font-medium text-charcoal">{rec.employeeName}</span>
                                  {rec.isManualEntry && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedManualDetails(rec)}
                                      title={`Added by ${rec.addedByManager || 'Manager'}: ${rec.reason} (Click for details)`}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] bg-warning-soft hover:bg-warning/25 text-warning text-[8px] font-bold border border-warning/20 cursor-pointer transition-colors"
                                    >
                                      ⚠ MANUAL
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-xs text-muted-gray capitalize">{rec.employeeRole || '—'}</td>
                            <td className="py-3 px-3 text-xs text-charcoal">{rec.clockIn || '—'}</td>
                            <td className="py-3 px-3 text-xs text-charcoal">{rec.clockOut || '—'}</td>
                            <td className="py-3 px-3 text-xs font-semibold text-charcoal">{rec.workingHours || '—'}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[10px] font-semibold ${rsc.bg} ${rsc.color} border ${rsc.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rsc.dot}`} />
                                {rsc.label}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(rec.clockInPhoto || rec.photo) && (
                                  <button
                                    onClick={() => setViewingPhoto({
                                      photo: rec.clockInPhoto || rec.photo,
                                      name: rec.employeeName,
                                      role: rec.employeeRole,
                                      date: formatDateDisplay(rec.date),
                                      timeLabel: `Clock In: ${rec.clockIn || '—'}`,
                                      typeLabel: 'Clock In Photo',
                                      isManual: rec.isManualEntry,
                                      addedBy: rec.addedByManager,
                                      reason: rec.reason,
                                    })}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-sage-hover hover:text-[#4F6748] cursor-pointer transition-colors"
                                  >
                                    <LogIn size={11} className="text-success" /> In
                                  </button>
                                )}
                                {rec.clockOutPhoto && (
                                  <button
                                    onClick={() => setViewingPhoto({
                                      photo: rec.clockOutPhoto,
                                      name: rec.employeeName,
                                      role: rec.employeeRole,
                                      date: formatDateDisplay(rec.date),
                                      timeLabel: `Clock Out: ${rec.clockOut || '—'}`,
                                      typeLabel: 'Clock Out Photo',
                                    })}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-dusty-rose hover:text-[#D4A399] cursor-pointer transition-colors"
                                  >
                                    <LogOut size={11} className="text-error" /> Out
                                  </button>
                                )}
                                {!rec.clockInPhoto && !rec.photo && !rec.clockOutPhoto && (
                                  rec.isManualEntry ? (
                                    <button
                                      onClick={() => setSelectedManualDetails(rec)}
                                      className="text-[9px] text-muted-gray hover:text-warning italic underline cursor-pointer"
                                    >
                                      Manual
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-muted-gray">—</span>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-2.5">
                  {filteredHistory.map((rec) => {
                    const rsc = statusConfig[rec.status] || statusConfig.not_started;
                    return (
                      <div key={rec.id} className="bg-warm-ivory rounded-[12px] border border-border/60 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-sage-soft flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-sage-hover">{(rec.employeeName || '?')[0]}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-charcoal">{rec.employeeName}</p>
                              <p className="text-[9px] text-muted-gray capitalize">{rec.employeeRole}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${rsc.bg} ${rsc.color} border ${rsc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rsc.dot}`} />
                            {rsc.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-gray font-medium">{formatDateDisplay(rec.date)}</p>
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <p className="text-muted-gray font-medium">In</p>
                            <p className="font-semibold text-charcoal">{rec.clockIn || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-gray font-medium">Out</p>
                            <p className="font-semibold text-charcoal">{rec.clockOut || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-gray font-medium">Hours</p>
                            <p className="font-bold text-[#4F6748]">{rec.workingHours || '—'}</p>
                          </div>
                        </div>
                        <ManualBadge rec={rec} />
                        {((rec.clockInPhoto || rec.photo) || rec.clockOutPhoto) && (
                          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                            {(rec.clockInPhoto || rec.photo) && (
                              <button
                                onClick={() => setViewingPhoto({
                                  photo: rec.clockInPhoto || rec.photo,
                                  name: rec.employeeName,
                                  role: rec.employeeRole,
                                  date: formatDateDisplay(rec.date),
                                  timeLabel: `Clock In: ${rec.clockIn || '—'}`,
                                  typeLabel: 'Clock In Photo',
                                  isManual: rec.isManualEntry,
                                  addedBy: rec.addedByManager,
                                  reason: rec.reason,
                                })}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-sage-hover hover:text-[#4F6748] cursor-pointer"
                              >
                                <LogIn size={11} className="text-success" /> In Photo
                              </button>
                            )}
                            {rec.clockOutPhoto && (
                              <button
                                onClick={() => setViewingPhoto({
                                  photo: rec.clockOutPhoto,
                                  name: rec.employeeName,
                                  role: rec.employeeRole,
                                  date: formatDateDisplay(rec.date),
                                  timeLabel: `Clock Out: ${rec.clockOut || '—'}`,
                                  typeLabel: 'Clock Out Photo',
                                })}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-dusty-rose hover:text-[#D4A399] cursor-pointer"
                              >
                                <LogOut size={11} className="text-error" /> Out Photo
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===================== MANUAL ATTENDANCE MODAL ===================== */}
      {showManualForm && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowManualForm(false)}>
          <div
            className="bg-soft-cream rounded-[16px] border border-border shadow-card max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${
                  isClockOutAction ? 'bg-[#DCE7D7]' : 'bg-warning-soft'
                }`}>
                  {isClockOutAction ? (
                    <LogOut size={16} className="text-[#4F6748]" />
                  ) : (
                    <UserPlus size={16} className="text-warning" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-charcoal">
                    {isClockOutAction
                      ? `Record Clock Out — ${selectedEmployeeObj?.name || 'Employee'}`
                      : 'Add Manual Attendance'}
                  </h4>
                  <p className="text-[10px] text-muted-gray">
                    {isClockOutAction
                      ? `Clock In time preserved (${existingEmpRec?.clockIn || manualClockIn})`
                      : 'For exceptional employee clock-in cases'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualForm(false)}
                className="w-8 h-8 rounded-full bg-warm-ivory hover:bg-border flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} className="text-muted-gray" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Employee Select */}
              <div>
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1.5 block">Employee *</label>
                <select
                  value={manualEmployee}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setManualEmployee(selectedId);
                    const empRec = attendanceMap[selectedId];
                    if (empRec) {
                      const preloadedIn = parseTo24Hour(empRec.clockIn, empRec.clockInRaw);
                      if (preloadedIn) setManualClockIn(preloadedIn);
                      setCanOverrideRecord(true);
                      if (empRec.status === 'working') {
                        setManualStatus('completed');
                        setManualClockOut(getCurrentTimeStr());
                        if (!manualReason) setManualReason('Manager recorded employee clock out');
                      }
                    } else {
                      setCanOverrideRecord(false);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-warm-ivory text-sm text-charcoal focus:outline-none focus:border-sage transition-colors cursor-pointer"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => {
                    setManualDate(e.target.value);
                    setCanOverrideRecord(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-warm-ivory text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1.5 block">
                  Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualStatus('completed')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${manualStatus === 'completed'
                        ? 'bg-[#DCE7D7] text-[#4F6748] border-[#4F6748]/30 shadow-xs'
                        : 'bg-warm-ivory text-muted-gray border-border hover:border-sage/40'
                      }`}
                  >
                    <CheckCircle size={14} />
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatus('working')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${manualStatus === 'working'
                        ? 'bg-success-soft text-[#4F6748] border-success/30 shadow-xs'
                        : 'bg-warm-ivory text-muted-gray border-border hover:border-sage/40'
                      }`}
                  >
                    <Timer size={14} />
                    Working
                  </button>
                </div>
              </div>

              {/* Clock In / Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider block">
                      Clock In Time (Cameroon) *
                    </label>
                    {existingEmpRec?.clockIn && (
                      <span className="text-[10px] font-semibold text-[#4F6748] flex items-center gap-1 bg-success-soft px-1.5 py-0.5 rounded-[5px] border border-success/20" title={`Clocked in at ${existingEmpRec.clockIn}`}>
                        ✓ Pre-loaded: {existingEmpRec.clockIn}
                      </span>
                    )}
                  </div>
                  <input
                    type="time"
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-warm-ivory text-sm text-charcoal focus:outline-none focus:border-sage transition-colors font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider block">
                      Clock Out Time (Cameroon) {manualStatus === 'working' && <span className="text-muted-gray normal-case font-normal">(optional)</span>}
                    </label>
                    {isClockOutAction && (
                      <span className="text-[10px] font-medium text-muted-gray bg-warm-ivory px-1.5 py-0.5 rounded-[4px] border border-border/60">
                        Current Cameroon Time
                      </span>
                    )}
                  </div>
                  <input
                    type="time"
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    disabled={manualStatus === 'working'}
                    placeholder={manualStatus === 'working' ? 'Not required while working' : ''}
                    className={`w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-warm-ivory text-sm text-charcoal focus:outline-none focus:border-sage transition-colors font-mono ${manualStatus === 'working' ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                  />
                </div>
              </div>

              {/* Reason (Required) */}
              <div>
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1.5 block">
                  Reason for Manual Entry *
                </label>
                <textarea
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Explain why manual attendance was added..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-[11px] border border-border bg-warm-ivory text-sm text-charcoal placeholder:text-muted-gray/50 focus:outline-none focus:border-sage transition-colors resize-none"
                />

                {/* Quick chip examples */}
                <div className="mt-1.5 space-y-1">
                  <p className="text-[9px] text-muted-gray">Click to auto-fill common reasons:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setManualReason(r)}
                        className="px-2 py-0.5 rounded-[6px] bg-warm-ivory hover:bg-border text-[10px] text-charcoal border border-border transition-colors cursor-pointer"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Verification Photo */}
              <div>
                <label className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1.5 block">
                  Verification Photo (Optional)
                </label>
                {manualPhoto ? (
                  <div className="rounded-[12px] border border-border p-3 bg-warm-ivory flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={manualPhoto}
                        alt="Preview"
                        className="w-14 h-14 rounded-[8px] object-cover border border-border"
                      />
                      <div>
                        <p className="text-xs font-semibold text-charcoal">Photo Attached</p>
                        <p className="text-[10px] text-success flex items-center gap-1 mt-0.5">
                          <CheckCircle size={11} /> Photo ready to save
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setManualPhoto(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-2.5 py-1.5 rounded-[8px] border border-error/30 text-error hover:bg-error-soft text-xs font-medium transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-border hover:border-sage rounded-[12px] bg-warm-ivory cursor-pointer transition-colors group">
                      <Upload size={16} className="text-muted-gray group-hover:text-sage mb-1 transition-colors" />
                      <span className="text-xs font-medium text-charcoal group-hover:text-sage transition-colors">
                        Upload / Add Verification Photo
                      </span>
                      <span className="text-[9px] text-muted-gray mt-0.5">Optional for manager manual entry</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Override Warning or Clock Out Status */}
              {isClockOutAction ? (
                <div className="bg-success-soft rounded-[10px] border border-success/30 p-3 flex items-start gap-2.5">
                  <CheckCircle size={15} className="text-[#4F6748] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-charcoal">Active Clock In Found ({existingEmpRec?.clockIn})</p>
                    <p className="text-[#4F6748] text-[11px] mt-0.5">
                      Clock In time is pre-loaded from when {selectedEmployeeObj?.name || 'the employee'} clocked in. Confirming will record Clock Out and complete today's attendance.
                    </p>
                  </div>
                </div>
              ) : canOverrideRecord ? (
                <div className="bg-warning-soft rounded-[10px] border border-warning/30 p-3 flex items-start gap-2">
                  <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-charcoal">Record already exists for this date</p>
                    <p className="text-muted-gray text-[11px] mt-0.5">
                      Clicking "Override Record" will replace the previous attendance record with these manual details.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Info Note */}
              <div className="bg-warm-ivory rounded-[10px] border border-border/80 p-3 flex gap-2">
                <Info size={14} className="text-muted-gray shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-charcoal">Manager Manual Attendance</p>
                  <p className="text-[9px] text-muted-gray mt-0.5">
                    This entry will be marked with a [ ⚠ Manual Entry ] badge in attendance views and history.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-2.5 p-5 pt-0">
              <button
                onClick={() => { setShowManualForm(false); resetManualForm(); }}
                className="flex-1 px-4 py-2.5 rounded-[11px] border border-border bg-white text-sm font-medium text-muted-gray hover:text-charcoal hover:border-sage transition-all cursor-pointer"
              >
                Cancel
              </button>
              {isClockOutAction ? (
                <button
                  onClick={() => handleManualSubmit(true)}
                  disabled={!manualEmployee || !manualClockIn || !manualClockOut || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] text-sm font-semibold bg-[#4F6748] hover:bg-[#43573d] text-white cursor-pointer active:scale-[0.98] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <LogOut size={15} />
                  {isSubmitting ? 'Saving Clock Out...' : 'Confirm Clock Out'}
                </button>
              ) : canOverrideRecord ? (
                <button
                  onClick={() => handleManualSubmit(true)}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] text-sm font-semibold bg-warning hover:bg-warning/90 text-white cursor-pointer active:scale-[0.98] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={15} />
                  {isSubmitting ? 'Updating...' : 'Override Record'}
                </button>
              ) : (
                <button
                  onClick={() => handleManualSubmit(false)}
                  disabled={!manualEmployee || !manualClockIn || !manualReason.trim() || isSubmitting}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] text-sm font-semibold transition-all ${manualEmployee && manualClockIn && manualReason.trim() && !isSubmitting
                      ? 'bg-sage hover:bg-sage-hover text-white cursor-pointer active:scale-[0.98]'
                      : 'bg-border text-muted-gray cursor-not-allowed opacity-60'
                    }`}
                >
                  <Plus size={15} />
                  {isSubmitting ? 'Saving...' : 'Add Attendance'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MANUAL DETAILS MODAL (Hover/Click) ===================== */}
      {selectedManualDetails && (
        <div
          className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[65] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedManualDetails(null)}
        >
          <div
            className="bg-soft-cream rounded-[16px] border border-border shadow-card max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-warm-ivory">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-[9px] bg-warning-soft flex items-center justify-center text-warning font-bold text-sm">
                  ⚠
                </span>
                <div>
                  <h4 className="text-sm font-bold text-charcoal">Manual Attendance Details</h4>
                  <p className="text-[10px] text-muted-gray">Added by Manager override</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedManualDetails(null)}
                className="w-8 h-8 rounded-full bg-soft-cream hover:bg-border flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} className="text-muted-gray" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5">
              {/* Employee & Date Card */}
              <div className="bg-white rounded-[12px] p-3.5 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-charcoal">{selectedManualDetails.employeeName}</p>
                    <p className="text-[10px] text-muted-gray capitalize">{selectedManualDetails.employeeRole}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[10px] font-semibold ${selectedManualDetails.status === 'completed'
                      ? 'bg-[#DCE7D7] text-[#4F6748] border border-[#4F6748]/20'
                      : 'bg-success-soft text-[#4F6748] border border-success/30'
                    }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {selectedManualDetails.status === 'completed' ? 'Completed' : 'Working'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-gray">Date</p>
                    <p className="font-semibold text-charcoal">{formatDateDisplay(selectedManualDetails.date)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-gray">Clock In</p>
                    <p className="font-semibold text-charcoal">{selectedManualDetails.clockIn || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-gray">Clock Out</p>
                    <p className="font-semibold text-charcoal">{selectedManualDetails.clockOut || '—'}</p>
                  </div>
                </div>
                {selectedManualDetails.workingHours && (
                  <div className="pt-1.5 text-xs flex items-center justify-between">
                    <span className="text-[10px] text-muted-gray">Total Hours:</span>
                    <span className="font-bold text-[#4F6748] bg-[#DCE7D7] px-2 py-0.5 rounded-[6px] text-[11px]">
                      {selectedManualDetails.workingHours}
                    </span>
                  </div>
                )}
              </div>

              {/* Manager & Reason Details */}
              <div className="bg-warning-soft/40 rounded-[12px] p-3.5 border border-warning/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-charcoal">Added by:</span>
                  <span className="font-bold text-warning">{selectedManualDetails.addedByManager || 'Manager'}</span>
                </div>
                {selectedManualDetails.timeAdded && (
                  <div className="flex items-center justify-between text-[11px] text-muted-gray">
                    <span>Time added:</span>
                    <span className="font-medium text-charcoal">{selectedManualDetails.timeAdded}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-warning/15">
                  <p className="text-[10px] font-semibold text-charcoal uppercase tracking-wider mb-1">Reason for Manual Entry:</p>
                  <div className="bg-white/80 rounded-[8px] p-2.5 border border-warning/20">
                    <p className="text-xs text-charcoal font-medium italic">
                      "{selectedManualDetails.reason}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Photo display */}
              {selectedManualDetails.photo ? (
                <div>
                  <p className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider mb-1.5">Verification Photo</p>
                  <div className="rounded-[10px] overflow-hidden border border-border bg-charcoal">
                    <img
                      src={selectedManualDetails.photo}
                      alt="Verification preview"
                      className="w-full h-auto max-h-48 object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-[10px] bg-warm-ivory text-center text-xs text-muted-gray border border-border/60">
                  No verification photo attached (Manager manual override)
                </div>
              )}
            </div>

            <div className="p-4 pt-0">
              <button
                onClick={() => setSelectedManualDetails(null)}
                className="w-full py-2.5 rounded-[10px] bg-white border border-border text-xs font-semibold text-charcoal hover:bg-warm-ivory transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== PHOTO PREVIEW MODAL ===================== */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingPhoto(null)}>
          <div
            className="bg-soft-cream rounded-[16px] border border-border shadow-card max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h4 className="text-sm font-bold text-charcoal">{viewingPhoto.name}</h4>
                <p className="text-[10px] text-muted-gray">
                  {viewingPhoto.role && <span className="capitalize">{viewingPhoto.role} · </span>}
                  {viewingPhoto.date} · {viewingPhoto.timeLabel || (viewingPhoto.clockIn ? `Clock In: ${viewingPhoto.clockIn}` : 'Photo Verified')}
                </p>
              </div>
              <button
                onClick={() => setViewingPhoto(null)}
                className="w-8 h-8 rounded-full bg-warm-ivory hover:bg-border flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} className="text-muted-gray" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={viewingPhoto.photo}
                alt="Attendance verification"
                className="w-full h-auto rounded-[12px] border border-border"
              />
            </div>
            <div className="px-4 pb-4">
              {viewingPhoto.isManual ? (
                <div className="flex items-center gap-2 text-xs text-warning font-medium">
                  <AlertCircle size={14} />
                  Manual Attendance — Added by {viewingPhoto.addedBy}
                  {viewingPhoto.reason && (
                    <span className="text-muted-gray italic ml-1">({viewingPhoto.reason})</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-success font-medium">
                  <CheckCircle size={14} />
                  {viewingPhoto.typeLabel || 'Attendance Verification Photo'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
