/**
 * Attendance — Employee self-service attendance page
 *
 * Features:
 *   - Today's attendance card (status, clock in/out times, working hours)
 *   - MANDATORY live camera photo before Clock In
 *   - Clock In disabled until photo is confirmed
 *   - Clock Out flow
 *   - Verification photo display after clock in
 *   - Attendance history table
 *
 * Access: technician, reception, cleaner (own records only)
 *
 * Source: Employee Attendance UI spec
 */

import { useState, useRef, useCallback, useEffect, Fragment } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Camera,
  CheckCircle,
  AlertCircle,
  Timer,
  Calendar,
  History,
  Video,
  RotateCcw,
  X,
  Eye,
  Image,
  Coffee,
  Play,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { getDoualaTodayStr, formatDoualaDateDisplay } from '../utils/timezone';

export default function Attendance() {
  const { user } = useAuth();
  const { clockIn, clockOut, getTodayRecord, getEmployeeRecords, startBreak, endBreak } = useAttendance();
  const [activeTab, setActiveTab] = useState('today');
  const [feedback, setFeedback] = useState(null);
  const [selectedManualDetails, setSelectedManualDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [breakTick, setBreakTick] = useState(0);

  // Break Camera Modal state: null | 'start' | 'end'
  const [breakCameraAction, setBreakCameraAction] = useState(null);
  const [breakCapturedPhoto, setBreakCapturedPhoto] = useState(null);
  const [breakCameraError, setBreakCameraError] = useState(null);
  const [breakIsSubmitting, setBreakIsSubmitting] = useState(false);
  const breakVideoRef = useRef(null);
  const breakCanvasRef = useRef(null);
  const breakStreamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Open camera
  const handleOpenCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    setPhotoConfirmed(false);
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      }, 100);
    } catch (err) {
      setCameraError('Camera access denied or not available.');
      setCameraOpen(false);
      setFeedback({ type: 'error', message: 'Could not access camera. Please allow camera permission.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Capture photo from video
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    setPhotoConfirmed(false);
    handleOpenCamera();
  };

  // Confirm photo
  const handleConfirmPhoto = () => {
    setPhotoConfirmed(true);
    setCameraOpen(false);
    const actionLabel = status === 'working' ? 'Clock Out' : 'Clock In';
    setFeedback({ type: 'success', message: `✓ Photo confirmed — you can now ${actionLabel}.` });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Close camera without capturing
  const handleCloseCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCapturedPhoto(null);
  };

  const todayRecord = getTodayRecord(user?.id);
  const history = getEmployeeRecords(user?.id);

  const todayFormatted = formatDoualaDateDisplay(getDoualaTodayStr(), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const status = todayRecord?.status || 'not_started';

  const statusConfig = {
    not_started: {
      label: 'Not Started',
      color: 'text-muted-gray',
      bg: 'bg-[#F3F0EC]',
      border: 'border-border',
      icon: Clock,
      dot: 'bg-muted-gray',
    },
    working: {
      label: 'Working',
      color: 'text-[#4F6748]',
      bg: 'bg-success-soft',
      border: 'border-success/30',
      icon: Timer,
      dot: 'bg-success',
    },
    completed: {
      label: 'Completed',
      color: 'text-[#4F6748]',
      bg: 'bg-[#DCE7D7]',
      border: 'border-[#4F6748]/20',
      icon: CheckCircle,
      dot: 'bg-[#4F6748]',
    },
  };

  const sc = statusConfig[status];

  // Clock In — passes the confirmed photo
  const handleClockIn = async () => {
    if (isSubmitting) return;
    if (!photoConfirmed || !capturedPhoto) {
      setFeedback({ type: 'error', message: 'Please take and confirm your verification photo first.' });
      handleOpenCamera();
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await clockIn(user, capturedPhoto);
      if (result.success) {
        setFeedback({ type: 'success', message: 'Clocked in successfully!' });
        setPhotoConfirmed(false);
        setCapturedPhoto(null);
      } else {
        setFeedback({ type: 'error', message: result.error || 'Clock in failed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Clock in failed' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Ticking interval for active break timer
  useEffect(() => {
    if (!todayRecord?.isOnBreak) return;
    const timer = setInterval(() => {
      setBreakTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [todayRecord?.isOnBreak]);

  const getLiveBreakElapsed = (startIso) => {
    if (!startIso) return '0m 00s';
    const diffMs = Math.max(0, Date.now() - new Date(startIso).getTime());
    const totalSec = Math.floor(diffMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  // Stop break camera stream helper
  const stopBreakCamera = useCallback(() => {
    if (breakStreamRef.current) {
      breakStreamRef.current.getTracks().forEach((track) => track.stop());
      breakStreamRef.current = null;
    }
  }, []);

  // Cleanup break camera on unmount
  useEffect(() => {
    return () => stopBreakCamera();
  }, [stopBreakCamera]);

  // Open break camera modal for live photo verification
  const handleOpenBreakCamera = async (action) => {
    setBreakCameraError(null);
    setBreakCapturedPhoto(null);
    setBreakCameraAction(action);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      breakStreamRef.current = stream;
      setTimeout(() => {
        if (breakVideoRef.current) {
          breakVideoRef.current.srcObject = stream;
          breakVideoRef.current.play().catch(() => { });
        }
      }, 100);
    } catch (err) {
      setBreakCameraError('Camera access denied or not available.');
      setBreakCameraAction(null);
      setFeedback({ type: 'error', message: 'Could not access camera for break verification.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleCaptureBreakPhoto = () => {
    if (!breakVideoRef.current || !breakCanvasRef.current) return;
    const video = breakVideoRef.current;
    const canvas = breakCanvasRef.current;
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 480, 360);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setBreakCapturedPhoto(dataUrl);
    stopBreakCamera();
  };

  const handleRetakeBreakPhoto = () => {
    setBreakCapturedPhoto(null);
    handleOpenBreakCamera(breakCameraAction);
  };

  const handleCloseBreakCamera = () => {
    stopBreakCamera();
    setBreakCameraAction(null);
    setBreakCapturedPhoto(null);
    setBreakCameraError(null);
  };

  const handleConfirmBreakAction = async () => {
    if (!user?.id || !breakCapturedPhoto || breakIsSubmitting) return;
    setBreakIsSubmitting(true);

    try {
      if (breakCameraAction === 'start') {
        const res = startBreak(user.id, breakCapturedPhoto);
        if (res.success) {
          setFeedback({ type: 'success', message: '✓ Going on break photo verified. Enjoy your break!' });
          handleCloseBreakCamera();
        } else {
          setFeedback({ type: 'error', message: res.error || 'Failed to start break' });
        }
      } else if (breakCameraAction === 'end') {
        const res = endBreak(user.id, breakCapturedPhoto);
        if (res.success) {
          const dur = res.breakItem?.durationMinutes || 0;
          setFeedback({
            type: 'success',
            message: `✓ Return photo verified — Break ended (${dur} min recorded). Welcome back!`,
          });
          handleCloseBreakCamera();
        } else {
          setFeedback({ type: 'error', message: res.error || 'Failed to end break' });
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Break action failed' });
    } finally {
      setBreakIsSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Clock Out — requires departure verification photo (and automatically closes any active break)
  const handleClockOut = async () => {
    if (isSubmitting) return;

    // Requirement: Automatically close an active break when the employee clocks out
    if (todayRecord?.isOnBreak) {
      endBreak(user?.id);
      setFeedback({
        type: 'info',
        message: 'Active break was automatically closed for Clock Out.',
      });
    }

    if (!photoConfirmed || !capturedPhoto) {
      setFeedback({ type: 'error', message: 'Departure photo required. Opening camera...' });
      handleOpenCamera();
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await clockOut(user, capturedPhoto);
      if (result.success) {
        setFeedback({ type: 'success', message: 'Clocked out successfully!' });
        setPhotoConfirmed(false);
        setCapturedPhoto(null);
      } else {
        setFeedback({ type: 'error', message: result.error || 'Clock out failed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Clock out failed' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const formatDateDisplay = (dateStr) => {
    return formatDoualaDateDisplay(dateStr);
  };

  const tabs = [
    { id: 'today', label: "Today's Attendance", icon: Clock },
    { id: 'history', label: 'Attendance History', icon: History },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 space-y-3">
      {/* Top Header with Embedded Tabs on Desktop for Max Vertical Efficiency */}
      <PageHeader
        title="My Attendance"
        action={
          <div className="flex gap-1 bg-soft-cream rounded-[12px] p-1 border border-border shrink-0 w-full sm:w-auto shadow-sm">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${activeTab === tab.id
                      ? 'bg-white text-charcoal shadow-sm border border-border/60'
                      : 'text-muted-gray hover:text-charcoal hover:bg-white/40'
                    }`}
                >
                  <TabIcon size={14} strokeWidth={activeTab === tab.id ? 2.2 : 1.6} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        }
      />

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-xs sm:text-sm font-medium border transition-all duration-300 ${feedback.type === 'success'
              ? 'bg-success-soft text-[#4F6748] border-success/30'
              : 'bg-error-soft text-error border-error/30'
            }`}
        >
          {feedback.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {feedback.message}
        </div>
      )}

      {/* ===================== TODAY TAB ===================== */}
      {activeTab === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* LEFT COLUMN: Shift Info, Employee Details & History Photos (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-soft-cream rounded-[16px] border border-border p-4 sm:p-5 shadow-card space-y-3.5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-charcoal">Today's Shift</h3>
                    <p className="text-[11px] text-muted-gray mt-0.5 flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{todayFormatted}</span>
                      <span className="text-[9px] font-semibold text-[#4F6748] bg-success-soft px-1.5 py-0.2 rounded border border-success/20">
                        Cameroon (UTC+1)
                      </span>
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] ${sc.bg} ${sc.border} border`}>
                    <span className={`w-2 h-2 rounded-full ${sc.dot} ${status === 'working' ? 'animate-pulse' : ''}`} />
                    <span className={`text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="flex items-center gap-3 bg-warm-ivory rounded-[12px] p-3 border border-border/60">
                  <div className="w-10 h-10 rounded-full bg-sage-soft flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-sage-hover">
                      {(user?.name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-charcoal truncate">{user?.name}</p>
                    <p className="text-xs text-muted-gray capitalize">{user?.role}</p>
                  </div>
                </div>

                {/* Clock In / Out, Breaks & Net Working Hours Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-warm-ivory rounded-[10px] p-2.5 border border-border/60 text-center">
                    <p className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider mb-0.5">Clock In</p>
                    <p className="text-xs font-bold text-charcoal flex items-center justify-center gap-1">
                      <LogIn size={12} className="text-success" />
                      {todayRecord?.clockIn || '—'}
                    </p>
                  </div>
                  <div className="bg-warm-ivory rounded-[10px] p-2.5 border border-border/60 text-center">
                    <p className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider mb-0.5">Clock Out</p>
                    <p className="text-xs font-bold text-charcoal flex items-center justify-center gap-1">
                      <LogOut size={12} className="text-error" />
                      {todayRecord?.clockOut || '—'}
                    </p>
                  </div>
                  <div className="bg-warm-ivory rounded-[10px] p-2.5 border border-border/60 text-center">
                    <p className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider mb-0.5">Breaks</p>
                    <p className="text-xs font-bold text-amber-700 flex items-center justify-center gap-1">
                      <Coffee size={12} className="text-amber-600" />
                      {todayRecord ? `${todayRecord.breakCount || 0} (${todayRecord.totalBreakMinutes || 0}m)` : '—'}
                    </p>
                  </div>
                  <div className="bg-warm-ivory rounded-[10px] p-2.5 border border-border/60 text-center" title={todayRecord?.workingHours ? `Gross Shift: ${todayRecord.workingHours}` : undefined}>
                    <p className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider mb-0.5">Net Hours</p>
                    <p className="text-xs font-bold text-[#4F6748] flex items-center justify-center gap-1">
                      <Timer size={12} />
                      {todayRecord?.netWorkingHours || (status === 'working' ? 'In Progress' : '—')}
                    </p>
                  </div>
                </div>

                {/* Break Tracking with Mandatory Live Photo Verification */}
                {status === 'working' && (
                  <div className={`rounded-[12px] p-3 border transition-all ${
                    todayRecord?.isOnBreak
                      ? 'bg-amber-50/95 border-amber-300 shadow-xs'
                      : 'bg-warm-ivory border-border/60'
                  }`}>
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                          todayRecord?.isOnBreak
                            ? 'bg-amber-100 text-amber-700 border border-amber-300/80 animate-pulse'
                            : 'bg-amber-100/60 text-amber-700 border border-amber-200/50'
                        }`}>
                          <Coffee size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                            <span>{todayRecord?.isOnBreak ? 'Currently On Break' : 'Attendance Break'}</span>
                            {todayRecord?.isOnBreak && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                            )}
                          </p>
                          <p className="text-[11px] text-muted-gray truncate mt-0.5">
                            {todayRecord?.isOnBreak ? (
                              <span className="font-semibold text-amber-800">
                                Active break: {getLiveBreakElapsed(todayRecord.currentBreakStart)}
                              </span>
                            ) : (
                              'Live photo required to go out & return'
                            )}
                          </p>
                        </div>
                      </div>

                      {todayRecord?.isOnBreak ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBreakCamera('end')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] shrink-0"
                        >
                          <Camera size={14} strokeWidth={2.2} />
                          <span>End Break (Take Photo)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenBreakCamera('start')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] shrink-0"
                        >
                          <Camera size={14} strokeWidth={2.2} />
                          <span>Start Break (Take Photo)</span>
                        </button>
                      )}
                    </div>

                    {/* Active Break: Preview of Departure photo */}
                    {todayRecord?.isOnBreak && todayRecord.currentBreakStartPhoto && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2 bg-amber-100/40 rounded-[8px] p-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-10 h-10 rounded-[8px] overflow-hidden border border-amber-400 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setViewingPhoto({
                              photo: todayRecord.currentBreakStartPhoto,
                              name: user?.name,
                              date: todayFormatted,
                              timeLabel: 'Break Departure Photo',
                              typeLabel: 'Active Break — Going Out Photo',
                            })}
                            title="Click to view departure photo"
                          >
                            <img src={todayRecord.currentBreakStartPhoto} alt="Departure" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                              <Camera size={11} /> Going Out Photo
                            </p>
                            <p className="text-[9px] text-amber-700">Verified before break</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewingPhoto({
                            photo: todayRecord.currentBreakStartPhoto,
                            name: user?.name,
                            date: todayFormatted,
                            timeLabel: 'Break Departure Photo',
                            typeLabel: 'Active Break — Going Out Photo',
                          })}
                          className="text-[10px] font-semibold text-amber-800 hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    )}

                    {/* Today's break chips breakdown with photo indicators */}
                    {todayRecord?.breaks && todayRecord.breaks.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-gray">Breaks today:</span>
                        {todayRecord.breaks.map((b, idx) => (
                          <span
                            key={b.id || idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-white border border-border/70 text-[10px] font-medium text-charcoal shadow-2xs"
                          >
                            <span className="text-muted-gray">#{idx + 1}</span>
                            <span className="font-bold text-amber-800">{b.durationMinutes}m</span>
                            {(b.startPhoto || b.endPhoto) && (
                              <button
                                type="button"
                                onClick={() => setViewingPhoto({
                                  photo: b.endPhoto || b.startPhoto,
                                  name: user?.name,
                                  date: todayFormatted,
                                  timeLabel: `Break #${idx + 1} (${b.durationMinutes}m)`,
                                  typeLabel: b.endPhoto ? `Break #${idx + 1} Return Photo` : `Break #${idx + 1} Departure Photo`,
                                })}
                                className="text-amber-700 hover:text-amber-900 ml-0.5 cursor-pointer"
                                title="Click to view verified break photo"
                              >
                                <Camera size={10} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Attendance Entry Banner by Manager */}
                {todayRecord?.isManualEntry && (
                  <div className="bg-warning-soft/60 rounded-[12px] border border-warning/25 p-3 flex items-start gap-2.5">
                    <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-charcoal">Manager Manual Entry</span>
                        <button
                          type="button"
                          onClick={() => setSelectedManualDetails(todayRecord)}
                          className="text-[10px] text-warning hover:underline font-semibold cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                      <p className="text-[11px] text-charcoal mt-0.5 font-medium">
                        Added by: <span className="font-bold">{todayRecord.addedByManager}</span>
                      </p>
                      {todayRecord.reason && (
                        <p className="text-[10px] text-muted-gray mt-0.5 italic line-clamp-2">
                          "{todayRecord.reason}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Attendance Photos (when photos exist) */}
              {(todayRecord?.photo || todayRecord?.clockInPhoto || todayRecord?.clockOutPhoto || todayRecord?.currentBreakStartPhoto || (todayRecord?.breaks && todayRecord.breaks.some((b) => b.startPhoto || b.endPhoto))) && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <p className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider">
                    Verified Attendance Photos
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Clock In Photo */}
                    {(todayRecord.clockInPhoto || todayRecord.photo) && (
                      <div className="bg-warm-ivory rounded-[10px] border border-border/60 p-2 flex items-center gap-2">
                        <div
                          className="w-12 h-12 rounded-[8px] overflow-hidden border border-success/30 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setViewingPhoto({
                            photo: todayRecord.clockInPhoto || todayRecord.photo,
                            name: user?.name,
                            date: todayFormatted,
                            timeLabel: `Clock In: ${todayRecord.clockIn || '—'}`,
                            typeLabel: 'Clock In Verification Photo',
                          })}
                        >
                          <img src={todayRecord.clockInPhoto || todayRecord.photo} alt="Clock In" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#4F6748] flex items-center gap-1">
                            <CheckCircle size={11} /> In Photo
                          </p>
                          <p className="text-[9px] text-muted-gray truncate mt-0.5">{todayRecord.clockIn || 'Verified'}</p>
                        </div>
                      </div>
                    )}

                    {/* Active Break Departure Photo */}
                    {todayRecord?.isOnBreak && todayRecord.currentBreakStartPhoto && (
                      <div className="bg-amber-50 rounded-[10px] border border-amber-300/80 p-2 flex items-center gap-2">
                        <div
                          className="w-12 h-12 rounded-[8px] overflow-hidden border border-amber-400 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setViewingPhoto({
                            photo: todayRecord.currentBreakStartPhoto,
                            name: user?.name,
                            date: todayFormatted,
                            timeLabel: 'Break Departure Photo',
                            typeLabel: 'Active Break — Going Out Photo',
                          })}
                        >
                          <img src={todayRecord.currentBreakStartPhoto} alt="Break Out" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                            <Coffee size={11} /> Break Out
                          </p>
                          <p className="text-[9px] text-amber-700 truncate mt-0.5">Active</p>
                        </div>
                      </div>
                    )}

                    {/* Completed Break Departure & Return Photos */}
                    {todayRecord?.breaks?.map((b, idx) => (
                      <Fragment key={b.id || idx}>
                        {b.startPhoto && (
                          <div className="bg-warm-ivory rounded-[10px] border border-border/60 p-2 flex items-center gap-2">
                            <div
                              className="w-12 h-12 rounded-[8px] overflow-hidden border border-amber-300 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setViewingPhoto({
                                photo: b.startPhoto,
                                name: user?.name,
                                date: todayFormatted,
                                timeLabel: `Break #${idx + 1} Out`,
                                typeLabel: `Break #${idx + 1} Departure Photo (Going Out)`,
                              })}
                            >
                              <img src={b.startPhoto} alt={`Break ${idx + 1} Out`} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                                <Coffee size={11} /> Brk #{idx + 1} Out
                              </p>
                              <p className="text-[9px] text-muted-gray truncate mt-0.5">{b.durationMinutes}m total</p>
                            </div>
                          </div>
                        )}
                        {b.endPhoto && (
                          <div className="bg-warm-ivory rounded-[10px] border border-border/60 p-2 flex items-center gap-2">
                            <div
                              className="w-12 h-12 rounded-[8px] overflow-hidden border border-emerald-300 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setViewingPhoto({
                                photo: b.endPhoto,
                                name: user?.name,
                                date: todayFormatted,
                                timeLabel: `Break #${idx + 1} In`,
                                typeLabel: `Break #${idx + 1} Return Photo (Coming Back)`,
                              })}
                            >
                              <img src={b.endPhoto} alt={`Break ${idx + 1} In`} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                                <CheckCircle size={11} /> Brk #{idx + 1} In
                              </p>
                              <p className="text-[9px] text-muted-gray truncate mt-0.5">Returned</p>
                            </div>
                          </div>
                        )}
                      </Fragment>
                    ))}

                    {/* Clock Out Photo */}
                    {todayRecord.clockOutPhoto && (
                      <div className="bg-warm-ivory rounded-[10px] border border-border/60 p-2 flex items-center gap-2">
                        <div
                          className="w-12 h-12 rounded-[8px] overflow-hidden border border-success/30 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setViewingPhoto({
                            photo: todayRecord.clockOutPhoto,
                            name: user?.name,
                            date: todayFormatted,
                            timeLabel: `Clock Out: ${todayRecord.clockOut || '—'}`,
                            typeLabel: 'Clock Out Verification Photo',
                          })}
                        >
                          <img src={todayRecord.clockOutPhoto} alt="Clock Out" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#4F6748] flex items-center gap-1">
                            <CheckCircle size={11} /> Out Photo
                          </p>
                          <p className="text-[9px] text-muted-gray truncate mt-0.5">{todayRecord.clockOut || 'Verified'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Camera & Action Station (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-soft-cream rounded-[16px] border border-border p-4 sm:p-5 shadow-card flex flex-col justify-between space-y-3.5 flex-1">
              {/* Header Title for Current Step */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center ${status === 'working' ? 'bg-dusty-rose/20 text-dusty-rose' : 'bg-sage-soft text-sage-hover'
                    }`}>
                    {status === 'completed' ? <CheckCircle size={16} /> : <Camera size={16} />}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-charcoal">
                      {status === 'not_started' && 'Clock In Verification'}
                      {status === 'working' && 'Clock Out Verification'}
                      {status === 'completed' && 'Shift Completed'}
                    </h4>
                    <p className="text-[11px] text-muted-gray">
                      {status === 'not_started' && (photoConfirmed ? 'Photo confirmed — Ready to Clock In' : 'Live photo required before Clock In')}
                      {status === 'working' && (photoConfirmed ? 'Departure photo confirmed — Ready to Clock Out' : 'Live photo required before Clock Out')}
                      {status === 'completed' && 'Today\'s attendance is completed and saved.'}
                    </p>
                  </div>
                </div>
                {photoConfirmed && status !== 'completed' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-success-soft text-success text-[10px] font-semibold border border-success/20 shrink-0">
                    <CheckCircle size={11} /> Photo Ready
                  </span>
                )}
              </div>

              {/* CAMERA / CAPTURE / PREVIEW AREA */}
              {status !== 'completed' && (
                <div className="space-y-3">
                  {/* Mode 1: Initial Prompt (Camera not open & no photo taken) */}
                  {!cameraOpen && !capturedPhoto && (
                    <div className="border border-dashed border-border rounded-[12px] p-5 sm:p-6 bg-warm-ivory text-center space-y-3 flex flex-col items-center justify-center min-h-[190px]">
                      <div className="w-12 h-12 rounded-full bg-sage-soft flex items-center justify-center text-sage-hover">
                        <Camera size={22} />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-charcoal">
                          {status === 'not_started' ? 'Take Verification Photo to Clock In' : 'Take Departure Photo to Clock Out'}
                        </p>
                        <p className="text-[11px] text-muted-gray mt-0.5">
                          Camera will take a live photo for attendance verification
                        </p>
                      </div>
                      <button
                        onClick={handleOpenCamera}
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-white text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98] ${status === 'working' ? 'bg-[#4F6748] hover:bg-[#3E5339]' : 'bg-[#4F6748] hover:bg-[#3E5339]'
                          }`}
                      >
                        <Video size={15} strokeWidth={2.2} />
                        {status === 'not_started' ? 'Open Camera & Take Photo' : 'Open Camera for Departure Photo'}
                      </button>
                    </div>
                  )}

                  {/* Camera Error Message */}
                  {cameraError && (
                    <p className="text-xs text-error font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> {cameraError}
                    </p>
                  )}

                  {/* Mode 2: Live Video Stream Active */}
                  {cameraOpen && !capturedPhoto && (
                    <div className="space-y-2.5">
                      <div className="relative rounded-[12px] overflow-hidden border border-border bg-charcoal aspect-video max-h-[240px] sm:max-h-[270px] w-full flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          style={{ transform: 'scaleX(-1)' }}
                        />
                        <button
                          onClick={handleCloseCamera}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-charcoal/70 hover:bg-charcoal flex items-center justify-center transition-all cursor-pointer"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                      <button
                        onClick={handleCapturePhoto}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-sage hover:bg-sage-hover text-white text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98]"
                      >
                        <Camera size={15} strokeWidth={2.2} />
                        Capture Live Photo
                      </button>
                    </div>
                  )}

                  {/* Mode 3: Photo Captured Preview with Retake / Confirm */}
                  {capturedPhoto && !photoConfirmed && (
                    <div className="space-y-2.5">
                      <div className="relative rounded-[12px] overflow-hidden border border-border bg-charcoal aspect-video max-h-[240px] sm:max-h-[270px] w-full flex items-center justify-center">
                        <img src={capturedPhoto} alt="Captured preview" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRetake}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] border border-border bg-white text-xs sm:text-sm font-medium text-muted-gray hover:text-charcoal hover:border-sage transition-all duration-150 cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          Retake
                        </button>
                        <button
                          onClick={handleConfirmPhoto}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] bg-sage hover:bg-sage-hover text-white text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98]"
                        >
                          <CheckCircle size={14} strokeWidth={2.2} />
                          Confirm Photo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 4: Confirmed Photo Thumbnail Card */}
                  {photoConfirmed && capturedPhoto && (
                    <div className="border border-success/30 rounded-[12px] p-3 bg-warm-ivory flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-[10px] overflow-hidden border border-success/40 shrink-0">
                          <img src={capturedPhoto} alt="Verified" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#4F6748] flex items-center gap-1">
                            <CheckCircle size={13} /> Photo Verified
                          </p>
                          <p className="text-[10px] text-muted-gray mt-0.5">
                            {status === 'not_started' ? 'Ready to Clock In' : 'Ready to Clock Out'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRetake}
                        className="text-[11px] text-muted-gray hover:text-charcoal underline cursor-pointer font-medium"
                      >
                        Retake Photo
                      </button>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              {/* Completed State Card */}
              {status === 'completed' && (
                <div className="border border-[#4F6748]/20 rounded-[14px] p-6 bg-[#DCE7D7]/40 text-center space-y-3 flex flex-col items-center justify-center min-h-[190px]">
                  <div className="w-12 h-12 rounded-full bg-[#DCE7D7] flex items-center justify-center text-[#4F6748]">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-charcoal">Shift Finished for Today</h5>
                    <p className="text-[11px] text-muted-gray mt-0.5">
                      Both Clock In & Departure photos verified and stored in database
                    </p>
                  </div>
                </div>
              )}

              {/* PRIMARY ACTION BUTTON (Always Visible, Zero Scroll) */}
              <div>
                {status === 'not_started' && (
                  <button
                    onClick={handleClockIn}
                    disabled={!photoConfirmed || isSubmitting}
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[11px] text-sm font-semibold transition-all duration-150 shadow-sm ${photoConfirmed && !isSubmitting
                        ? 'bg-sage hover:bg-sage-hover text-white cursor-pointer active:scale-[0.98]'
                        : 'bg-border text-muted-gray cursor-not-allowed opacity-60'
                      }`}
                  >
                    <LogIn size={16} strokeWidth={2.2} />
                    {isSubmitting ? 'Clocking In...' : photoConfirmed ? 'Clock In' : 'Take Photo to Clock In'}
                  </button>
                )}

                {status === 'working' && (
                  <button
                    onClick={handleClockOut}
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[11px] text-sm font-semibold transition-all duration-150 shadow-sm active:scale-[0.98] ${photoConfirmed
                        ? 'bg-dusty-rose hover:bg-[#D4A399] text-white cursor-pointer'
                        : 'bg-dusty-rose/85 hover:bg-dusty-rose text-white cursor-pointer'
                      } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <LogOut size={16} strokeWidth={2.2} />
                    {isSubmitting ? 'Clocking Out...' : photoConfirmed ? 'Clock Out' : 'Take Photo to Clock Out'}
                  </button>
                )}

                {status === 'completed' && (
                  <div className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] bg-[#DCE7D7] text-[#4F6748] text-sm font-semibold border border-[#4F6748]/20">
                    <CheckCircle size={16} strokeWidth={2.2} />
                    Day Complete
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== HISTORY TAB ===================== */}
      {activeTab === 'history' && (
        <div className="bg-soft-cream rounded-[16px] border border-border p-4 sm:p-5 shadow-card">
          <h3 className="text-sm sm:text-base font-bold text-charcoal mb-4 flex items-center gap-2">
            <History size={16} />
            Attendance History
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-10">
              <Clock size={36} className="text-border mx-auto mb-3" />
              <p className="text-sm text-muted-gray">No attendance records yet.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Date</th>
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Clock In</th>
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Clock Out</th>
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Breaks</th>
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Gross Hours</th>
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Net Hours</th>
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Status</th>
                      <th className="text-left text-[10px] font-semibold text-muted-gray uppercase tracking-wider py-2.5 px-3">Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((rec) => {
                      const rsc = statusConfig[rec.status] || statusConfig.not_started;
                      return (
                        <tr key={rec.id} className="border-b border-border/50 hover:bg-warm-ivory/50 transition-colors">
                          <td className="py-3 px-3 text-xs font-medium text-charcoal">
                            {formatDateDisplay(rec.date)}
                            {rec.isManualEntry && (
                              <button
                                type="button"
                                onClick={() => setSelectedManualDetails(rec)}
                                title={`Added by ${rec.addedByManager || 'Manager'}: ${rec.reason} (Click for details)`}
                                className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] bg-warning-soft hover:bg-warning/25 text-warning text-[8px] font-bold border border-warning/20 cursor-pointer transition-colors"
                              >
                                ⚠ MANUAL
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3 text-xs text-charcoal">{rec.clockIn || '—'}</td>
                          <td className="py-3 px-3 text-xs text-charcoal">{rec.clockOut || '—'}</td>
                          <td className="py-3 px-3 text-xs text-amber-800 font-semibold">
                            {rec.breakCount ? `${rec.breakCount} (${rec.totalBreakMinutes}m)` : '0 (0m)'}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-gray">{rec.workingHours || '—'}</td>
                          <td className="py-3 px-3 text-xs font-bold text-[#4F6748]">{rec.netWorkingHours || '—'}</td>
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
                                    name: user?.name,
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
                                    name: user?.name,
                                    date: formatDateDisplay(rec.date),
                                    timeLabel: `Clock Out: ${rec.clockOut || '—'}`,
                                    typeLabel: 'Clock Out Photo',
                                  })}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-dusty-rose hover:text-[#D4A399] cursor-pointer transition-colors"
                                >
                                  <LogOut size={11} className="text-error" /> Out
                                </button>
                              )}
                              {rec.breaks?.map((b, bIdx) => (
                                (b.startPhoto || b.endPhoto) ? (
                                  <button
                                    key={b.id || bIdx}
                                    onClick={() => setViewingPhoto({
                                      photo: b.endPhoto || b.startPhoto,
                                      name: user?.name,
                                      date: formatDateDisplay(rec.date),
                                      timeLabel: `Break #${bIdx + 1} (${b.durationMinutes}m)`,
                                      typeLabel: b.endPhoto && b.startPhoto ? `Break #${bIdx + 1} Return & Out Photos Available` : `Break #${bIdx + 1} Photo`,
                                    })}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 cursor-pointer transition-colors"
                                    title="View verified break photo"
                                  >
                                    <Coffee size={11} className="text-amber-600" /> Brk#{bIdx + 1}
                                  </button>
                                ) : null
                              ))}
                              {!rec.clockInPhoto && !rec.photo && !rec.clockOutPhoto && (!rec.breaks || !rec.breaks.some(b => b.startPhoto || b.endPhoto)) && (
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
                {history.map((rec) => {
                  const rsc = statusConfig[rec.status] || statusConfig.not_started;
                  return (
                    <div key={rec.id} className="bg-warm-ivory rounded-[12px] border border-border/60 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-charcoal">{formatDateDisplay(rec.date)}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${rsc.bg} ${rsc.color} border ${rsc.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rsc.dot}`} />
                          {rsc.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                        <div>
                          <p className="text-muted-gray font-medium">In</p>
                          <p className="font-semibold text-charcoal">{rec.clockIn || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-gray font-medium">Out</p>
                          <p className="font-semibold text-charcoal">{rec.clockOut || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-gray font-medium">Breaks</p>
                          <p className="font-semibold text-amber-700">{rec.totalBreakMinutes || 0}m</p>
                        </div>
                        <div>
                          <p className="text-muted-gray font-medium">Net Hours</p>
                          <p className="font-bold text-[#4F6748]">{rec.netWorkingHours || '—'}</p>
                        </div>
                      </div>
                      {rec.isManualEntry && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedManualDetails(rec)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-warning-soft hover:bg-warning/20 text-warning text-[8px] font-bold border border-warning/20 cursor-pointer"
                          >
                            <span>⚠ Manual — {rec.addedByManager}</span>
                            <span className="opacity-75">· Details</span>
                          </button>
                          {rec.reason && (
                            <p className="text-[8px] text-muted-gray mt-0.5 italic">Reason: {rec.reason}</p>
                          )}
                        </div>
                      )}
                      {((rec.clockInPhoto || rec.photo) || rec.clockOutPhoto) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                          {(rec.clockInPhoto || rec.photo) && (
                            <button
                              onClick={() => setViewingPhoto({
                                photo: rec.clockInPhoto || rec.photo,
                                name: user?.name,
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
                                name: user?.name,
                                date: formatDateDisplay(rec.date),
                                timeLabel: `Clock Out: ${rec.clockOut || '—'}`,
                                typeLabel: 'Clock Out Photo',
                              })}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-dusty-rose hover:text-[#D4A399] cursor-pointer"
                            >
                              <LogOut size={11} className="text-error" /> Out Photo
                            </button>
                          )}
                          {rec.breaks?.some(b => b.startPhoto || b.endPhoto) && (
                            <button
                              onClick={() => {
                                const firstWithPhoto = rec.breaks.find(b => b.endPhoto || b.startPhoto);
                                setViewingPhoto({
                                  photo: firstWithPhoto.endPhoto || firstWithPhoto.startPhoto,
                                  name: user?.name,
                                  date: formatDateDisplay(rec.date),
                                  timeLabel: `Breaks: ${rec.breakCount} total`,
                                  typeLabel: 'Verified Break Photo',
                                });
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 cursor-pointer"
                            >
                              <Coffee size={11} /> Break Photo
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

      {/* ===================== MANUAL DETAILS MODAL ===================== */}
      {selectedManualDetails && (
        <div
          className="fixed inset-0 bg-charcoal/40 z-[65] flex items-center justify-center p-4"
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
                  <p className="text-[10px] text-muted-gray">Added by Manager</p>
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
              <div className="bg-white rounded-[12px] p-3.5 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal">
                    {selectedManualDetails.employeeName || user?.name}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${selectedManualDetails.status === 'completed'
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

              {/* Photo preview if available */}
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
                  No verification photo attached (Manager manual entry)
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
        <div className="fixed inset-0 bg-charcoal/40 z-[60] flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <div
            className="bg-soft-cream rounded-[16px] border border-border shadow-card max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h4 className="text-sm font-bold text-charcoal">{viewingPhoto.name}</h4>
                <p className="text-[10px] text-muted-gray">
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
                style={{ transform: 'scaleX(-1)' }}
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

      {/* ===================== BREAK LIVE CAMERA MODAL ===================== */}
      {breakCameraAction && (
        <div className="fixed inset-0 bg-charcoal/50 z-[70] flex items-center justify-center p-4">
          <div
            className="bg-soft-cream rounded-[16px] border border-border shadow-card max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-warm-ivory">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center ${
                  breakCameraAction === 'start' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Camera size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-charcoal">
                    {breakCameraAction === 'start' ? 'Going on Break — Departure Photo' : 'Returning from Break — Return Photo'}
                  </h4>
                  <p className="text-[10px] text-muted-gray">
                    {breakCameraAction === 'start'
                      ? 'Take a live photo before leaving for your break'
                      : 'Take a live photo as you resume your shift'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseBreakCamera}
                className="w-8 h-8 rounded-full bg-soft-cream hover:bg-border flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} className="text-muted-gray" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3">
              {/* Error message */}
              {breakCameraError && (
                <p className="text-xs text-error font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> {breakCameraError}
                </p>
              )}

              {/* Live Stream View */}
              {!breakCapturedPhoto && (
                <div className="space-y-3">
                  <div className="relative rounded-[12px] overflow-hidden border border-border bg-charcoal aspect-video max-h-[260px] w-full flex items-center justify-center shadow-inner">
                    <video
                      ref={breakVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    <div className="absolute bottom-2 left-2 bg-charcoal/70 px-2 py-0.5 rounded-[6px] text-[10px] text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Live Camera
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureBreakPhoto}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-white text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98] ${
                      breakCameraAction === 'start' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <Camera size={15} strokeWidth={2.2} />
                    <span>Capture Photo</span>
                  </button>
                </div>
              )}

              {/* Captured Photo Preview */}
              {breakCapturedPhoto && (
                <div className="space-y-3">
                  <div className="relative rounded-[12px] overflow-hidden border border-border aspect-video max-h-[260px] w-full flex items-center justify-center bg-black">
                    <img
                      src={breakCapturedPhoto}
                      alt="Break Preview"
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                      <CheckCircle size={11} /> Photo Captured
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRetakeBreakPhoto}
                      disabled={breakIsSubmitting}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[10px] bg-white border border-border text-charcoal text-xs font-semibold hover:bg-warm-ivory transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmBreakAction}
                      disabled={breakIsSubmitting}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[10px] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] ${
                        breakCameraAction === 'start'
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      } ${breakIsSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <CheckCircle size={14} strokeWidth={2.2} />
                      <span>{breakIsSubmitting ? 'Saving...' : breakCameraAction === 'start' ? 'Confirm & Start Break' : 'Confirm & End Break'}</span>
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={breakCanvasRef} className="hidden" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
