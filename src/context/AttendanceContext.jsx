/**
 * AttendanceContext — Employee Attendance State Management
 * Fully integrated with OMEGA SPA POS Backend (/api/v1/attendance)
 * MySQL Database + Cloudinary Photo Verification.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { attendanceApi } from '../services/api';
import { useAuth } from './AuthContext';
import { getDoualaTodayStr } from '../utils/timezone';

const AttendanceContext = createContext(null);

const BREAKS_STORAGE_KEY = 'omega_spa_attendance_breaks';

function loadStoredBreaks() {
  try {
    const raw = localStorage.getItem(BREAKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('[AttendanceContext] Failed to load breaks from localStorage:', err);
    return {};
  }
}

function persistStoredBreaks(data) {
  try {
    localStorage.setItem(BREAKS_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[AttendanceContext] LocalStorage write failed, pruning older records...', err);
    try {
      // Keep only recent 25 keys
      const entries = Object.entries(data);
      if (entries.length > 25) {
        const pruned = Object.fromEntries(entries.slice(-25));
        localStorage.setItem(BREAKS_STORAGE_KEY, JSON.stringify(pruned));
      }
    } catch (e) {
      console.error('[AttendanceContext] Failed to persist breaks to localStorage:', e);
    }
  }
}

/**
 * Calculates Net Work Hours: Gross Shift Duration - Accumulated Break Minutes
 */
function calculateNetHours(record, totalBreakMinutes = 0) {
  if (!record) return null;

  let grossMinutes = null;

  if (record.clockInRaw && record.clockOutRaw) {
    const inMs = new Date(record.clockInRaw).getTime();
    const outMs = new Date(record.clockOutRaw).getTime();
    if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
      grossMinutes = Math.round((outMs - inMs) / 60000);
    }
  } else if (record.clockInRaw && record.status === 'working') {
    const inMs = new Date(record.clockInRaw).getTime();
    const nowMs = Date.now();
    if (!isNaN(inMs) && nowMs >= inMs) {
      grossMinutes = Math.round((nowMs - inMs) / 60000);
    }
  } else if (record.workingHours) {
    const str = String(record.workingHours);
    const hMatch = str.match(/(\d+)\s*h/);
    const mMatch = str.match(/(\d+)\s*m/);
    if (hMatch || mMatch) {
      const h = parseInt(hMatch ? hMatch[1] : '0', 10);
      const m = parseInt(mMatch ? mMatch[1] : '0', 10);
      grossMinutes = h * 60 + m;
    } else {
      const num = Number(str);
      if (!isNaN(num)) {
        grossMinutes = Math.round(num * 60);
      }
    }
  }

  if (grossMinutes === null) return null;

  const netMinutes = Math.max(0, grossMinutes - (totalBreakMinutes || 0));
  const h = Math.floor(netMinutes / 60);
  const m = netMinutes % 60;
  return `${h}h ${m}m`;
}

function dataUrlToFile(dataUrl, filename = 'attendance.jpg') {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

export function AttendanceProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const isCleaner = (user?.role || '').toLowerCase() === 'cleaner';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [breakStore, setBreakStore] = useState(() => loadStoredBreaks());

  // Listen for storage changes across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === BREAKS_STORAGE_KEY && e.newValue) {
        try {
          setBreakStore(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Start break with photo verification (Going out on break)
  const startBreak = useCallback((employeeId, photoOrDate, targetDate) => {
    if (!employeeId) return { success: false, error: 'Employee ID required' };
    const photo = typeof photoOrDate === 'string' && (photoOrDate.startsWith('data:') || photoOrDate.startsWith('http') || photoOrDate.length > 50) ? photoOrDate : null;
    const dateStr = (!photo && typeof photoOrDate === 'string') ? photoOrDate : (targetDate || getDoualaTodayStr());
    const key = `${employeeId}_${dateStr}`;

    let result = { success: true };

    setBreakStore((prev) => {
      const existing = prev[key] || {
        breaks: [],
        totalBreakMinutes: 0,
        isOnBreak: false,
        currentBreakStart: null,
        currentBreakStartPhoto: null,
      };

      if (existing.isOnBreak) {
        result = { success: false, error: 'Employee is already on break' };
        return prev;
      }

      const nowIso = new Date().toISOString();
      const updated = {
        ...prev,
        [key]: {
          ...existing,
          isOnBreak: true,
          currentBreakStart: nowIso,
          currentBreakStartPhoto: photo || null,
        },
      };
      persistStoredBreaks(updated);
      return updated;
    });

    return result;
  }, []);

  // End break with photo verification (Coming back from break)
  const endBreak = useCallback((employeeId, photoOrDate, targetDate) => {
    if (!employeeId) return { success: false, error: 'Employee ID required' };
    const photo = typeof photoOrDate === 'string' && (photoOrDate.startsWith('data:') || photoOrDate.startsWith('http') || photoOrDate.length > 50) ? photoOrDate : null;
    const dateStr = (!photo && typeof photoOrDate === 'string') ? photoOrDate : (targetDate || getDoualaTodayStr());
    const key = `${employeeId}_${dateStr}`;

    let result = { success: false, error: 'Employee is not on break' };

    setBreakStore((prev) => {
      const existing = prev[key];
      if (!existing || !existing.isOnBreak || !existing.currentBreakStart) {
        return prev;
      }

      const endIso = new Date().toISOString();
      const startIso = existing.currentBreakStart;
      const elapsedMs = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
      const durationMinutes = Math.round(elapsedMs / (1000 * 60));

      const newBreak = {
        id: `brk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        startTime: startIso,
        endTime: endIso,
        durationMinutes,
        startPhoto: existing.currentBreakStartPhoto || null, // Going out photo
        endPhoto: photo || null,                             // Coming back photo
      };

      const newBreaks = [...(existing.breaks || []), newBreak];
      const totalBreakMinutes = newBreaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);

      const updated = {
        ...prev,
        [key]: {
          breaks: newBreaks,
          totalBreakMinutes,
          isOnBreak: false,
          currentBreakStart: null,
          currentBreakStartPhoto: null,
        },
      };
      persistStoredBreaks(updated);
      result = { success: true, breakItem: newBreak, totalBreakMinutes };
      return updated;
    });

    return result;
  }, []);

  // Get break state helper
  const getBreakState = useCallback(
    (employeeId, targetDate) => {
      if (!employeeId) {
        return { breaks: [], breakCount: 0, totalBreakMinutes: 0, isOnBreak: false, currentBreakStart: null, currentBreakStartPhoto: null };
      }
      const dateStr = targetDate || getDoualaTodayStr();
      const key = `${employeeId}_${dateStr}`;
      const info = breakStore[key] || {};
      const breaks = info.breaks || [];
      return {
        breaks,
        breakCount: breaks.length,
        totalBreakMinutes: info.totalBreakMinutes || 0,
        isOnBreak: Boolean(info.isOnBreak),
        currentBreakStart: info.currentBreakStart || null,
        currentBreakStartPhoto: info.currentBreakStartPhoto || null,
      };
    },
    [breakStore]
  );

  // Fetch all attendance records from backend
  const refreshAttendance = useCallback(async () => {
    if (!isAuthenticated || isCleaner) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await attendanceApi.getAll();
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        setRecords(list);
      }
      setError(null);
    } catch (err) {
      console.error('[AttendanceContext] Failed to fetch records:', err);
      setError(err?.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isCleaner]);

  // Load records on authentication change
  useEffect(() => {
    if (isAuthenticated && !isCleaner) {
      refreshAttendance();
    } else {
      setRecords([]);
      setLoading(false);
    }
  }, [isAuthenticated, isCleaner, refreshAttendance]);

  // Clock In — uploads verification photo to Cloudinary & persists to MySQL
  const clockIn = useCallback(
    async (currentUser, photo) => {
      if (!currentUser) return { success: false, error: 'No user provided.' };
      if (!photo) return { success: false, error: 'Verification photo is required.' };

      const today = getDoualaTodayStr();
      const browserIso = new Date().toISOString();
      console.log('[Attendance Clock In] Browser current ISO time:', browserIso);
      console.log('[Attendance Clock In] UTC timestamp / date sent to API:', today);

      try {
        const file = typeof photo === 'string' && photo.startsWith('data:')
          ? dataUrlToFile(photo, `attendance-${currentUser.id}-${today}.jpg`)
          : null;

        let res;
        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('employeeId', currentUser.id);
          formData.append('date', today);
          res = await attendanceApi.clockIn(formData);
        } else {
          res = await attendanceApi.clockIn({
            employeeId: currentUser.id,
            date: today,
            photo,
          });
        }

        const savedRecord = res?.data || res;
        if (savedRecord) {
          console.log('[Attendance Clock In] Formatted Africa/Douala time received:', {
            clockIn: savedRecord.clockIn,
            clockInRaw: savedRecord.clockInRaw,
            workingHours: savedRecord.workingHours,
            date: savedRecord.date,
          });
          await refreshAttendance();
          return { success: true, record: savedRecord };
        }
        return { success: false, error: 'Failed to save clock-in.' };
      } catch (err) {
        const errMsg = err?.response?.data?.message || err?.message || 'Clock in failed';
        return { success: false, error: errMsg };
      }
    },
    [refreshAttendance]
  );

  // Clock Out — updates today's record in MySQL (requires departure photo)
  const clockOut = useCallback(
    async (currentUser, photo) => {
      if (!currentUser) return { success: false, error: 'No user provided.' };
      if (!photo) return { success: false, error: 'Verification photo is required for Clock Out.' };

      const today = getDoualaTodayStr();

      // Requirement: Automatically close an active break when the employee clocks out
      const breakKey = `${currentUser.id}_${today}`;
      if (breakStore[breakKey]?.isOnBreak) {
        endBreak(currentUser.id, today);
      }

      const browserIso = new Date().toISOString();
      console.log('[Attendance Clock Out] Browser current ISO time:', browserIso);
      console.log('[Attendance Clock Out] UTC timestamp / date sent to API:', today);

      try {
        const file = typeof photo === 'string' && photo.startsWith('data:')
          ? dataUrlToFile(photo, `attendance-out-${currentUser.id}-${today}.jpg`)
          : null;

        let res;
        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('employeeId', currentUser.id);
          formData.append('date', today);
          res = await attendanceApi.clockOut(formData);
        } else {
          res = await attendanceApi.clockOut({
            employeeId: currentUser.id,
            date: today,
            photo: photo || undefined,
          });
        }

        const updatedRecord = res?.data || res;
        if (updatedRecord) {
          console.log('[Attendance Clock Out] Formatted Africa/Douala time received:', {
            clockOut: updatedRecord.clockOut,
            clockOutRaw: updatedRecord.clockOutRaw,
            workingHours: updatedRecord.workingHours,
            date: updatedRecord.date,
          });
          await refreshAttendance();
          return { success: true, record: updatedRecord };
        }
        return { success: false, error: 'Failed to record clock-out.' };
      } catch (err) {
        const errMsg = err?.response?.data?.message || err?.message || 'Clock out failed';
        return { success: false, error: errMsg };
      }
    },
    [refreshAttendance, breakStore, endBreak]
  );

  // Manager Manual Attendance Entry or Override
  const addManualAttendance = useCallback(
    async ({
      employee,
      date,
      clockInTime,
      clockOutTime,
      status,
      reason,
      photo,
      manager,
      allowOverride = false,
    }) => {
      if (!employee) return { success: false, error: 'Please select an employee.' };
      if (!reason?.trim()) return { success: false, error: 'Reason for manual entry is required.' };
      if (!clockInTime) return { success: false, error: 'Clock In time is required.' };

      const dateVal = date || getDoualaTodayStr();
      const browserIso = new Date().toISOString();
      console.log('[Attendance Manual Entry] Browser current ISO time:', browserIso);
      console.log('[Attendance Manual Entry] UTC timestamp / payload sent to API:', {
        employeeId: employee.id,
        date: dateVal,
        clockInTime,
        clockOutTime,
      });

      try {
        const file = typeof photo === 'string' && photo.startsWith('data:')
          ? dataUrlToFile(photo, `attendance-manual-${employee.id}-${dateVal}.jpg`)
          : null;

        let res;
        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('employeeId', employee.id);
          formData.append('date', dateVal);
          formData.append('clockInTime', clockInTime);
          if (clockOutTime) formData.append('clockOutTime', clockOutTime);
          formData.append('status', status || 'completed');
          formData.append('reason', reason.trim());
          formData.append('allowOverride', String(allowOverride));
          res = await attendanceApi.manualEntry(formData);
        } else {
          res = await attendanceApi.manualEntry({
            employeeId: employee.id,
            date: dateVal,
            clockInTime,
            clockOutTime,
            status: status || 'completed',
            reason: reason.trim(),
            photo: photo || undefined,
            allowOverride,
          });
        }

        const savedRecord = res?.data || res;
        if (savedRecord) {
          console.log('[Attendance Manual Entry] Formatted Africa/Douala time received:', {
            clockIn: savedRecord.clockIn,
            clockInRaw: savedRecord.clockInRaw,
            clockOut: savedRecord.clockOut,
            clockOutRaw: savedRecord.clockOutRaw,
            workingHours: savedRecord.workingHours,
            date: savedRecord.date,
          });
          await refreshAttendance();
          return { success: true, record: savedRecord };
        }
        return { success: false, error: 'Failed to save manual attendance.' };
      } catch (err) {
        const errMsg = err?.response?.data?.message || err?.message || 'Manual entry failed';
        const isConflict = err?.status === 409 || errMsg.toLowerCase().includes('already exists');
        return {
          success: false,
          error: errMsg,
          canOverride: isConflict,
        };
      }
    },
    [refreshAttendance]
  );

  // Enriched records with break data and net working hours
  const enrichedRecords = useMemo(() => {
    return records.map((r) => {
      const key = `${r.employeeId}_${r.date}`;
      const bInfo = breakStore[key] || {};
      const breaks = bInfo.breaks || [];
      const totalBreakMinutes = bInfo.totalBreakMinutes || 0;
      const isOnBreak = Boolean(bInfo.isOnBreak);
      const currentBreakStart = bInfo.currentBreakStart || null;
      const currentBreakStartPhoto = bInfo.currentBreakStartPhoto || null;

      return {
        ...r,
        breaks,
        breakCount: breaks.length,
        totalBreakMinutes,
        isOnBreak,
        currentBreakStart,
        currentBreakStartPhoto,
        grossWorkingHours: r.workingHours,
        netWorkingHours: calculateNetHours(r, totalBreakMinutes),
      };
    });
  }, [records, breakStore]);

  // Get today's record for a specific employee
  const getTodayRecord = useCallback(
    (employeeId) => {
      if (!employeeId) return null;
      const today = getDoualaTodayStr();
      return enrichedRecords.find((r) => r.employeeId === employeeId && r.date === today) || null;
    },
    [enrichedRecords]
  );

  // Get all records for a specific employee
  const getEmployeeRecords = useCallback(
    (employeeId) => {
      if (!employeeId) return [];
      return enrichedRecords
        .filter((r) => r.employeeId === employeeId)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    [enrichedRecords]
  );

  // Get today's attendance for all employees (Manager view)
  const todayAllRecords = useMemo(() => {
    const today = getDoualaTodayStr();
    return enrichedRecords.filter((r) => r.date === today);
  }, [enrichedRecords]);

  // Get all records sorted by date (Manager history)
  const allRecordsSorted = useMemo(() => {
    return [...enrichedRecords].sort((a, b) => b.date.localeCompare(a.date));
  }, [enrichedRecords]);

  return (
    <AttendanceContext.Provider
      value={{
        records: enrichedRecords,
        rawRecords: records,
        loading,
        error,
        breakStore,
        startBreak,
        endBreak,
        getBreakState,
        refreshAttendance,
        clockIn,
        clockOut,
        addManualAttendance,
        getTodayRecord,
        getEmployeeRecords,
        todayAllRecords,
        allRecordsSorted,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
