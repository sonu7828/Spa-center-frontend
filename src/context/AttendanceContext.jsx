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
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all attendance records from backend
  const refreshAttendance = useCallback(async () => {
    if (!isAuthenticated) {
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
  }, [isAuthenticated]);

  // Load records on authentication change
  useEffect(() => {
    refreshAttendance();
  }, [refreshAttendance]);

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
    [refreshAttendance]
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

  // Get today's record for a specific employee
  const getTodayRecord = useCallback(
    (employeeId) => {
      if (!employeeId) return null;
      const today = getDoualaTodayStr();
      return records.find((r) => r.employeeId === employeeId && r.date === today) || null;
    },
    [records]
  );

  // Get all records for a specific employee
  const getEmployeeRecords = useCallback(
    (employeeId) => {
      if (!employeeId) return [];
      return records
        .filter((r) => r.employeeId === employeeId)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    [records]
  );

  // Get today's attendance for all employees (Manager view)
  const todayAllRecords = useMemo(() => {
    const today = getDoualaTodayStr();
    return records.filter((r) => r.date === today);
  }, [records]);

  // Get all records sorted by date (Manager history)
  const allRecordsSorted = useMemo(() => {
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  return (
    <AttendanceContext.Provider
      value={{
        records,
        loading,
        error,
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
