/**
 * FeedbackContext — Client Feedback State & Real-time Cross-Tab Engine
 *
 * Provides:
 *   feedback            — Array of all submitted feedback entries
 *   pendingRequests     — Array of pending feedback requests (tokens generated)
 *   createFeedbackRequest — Generate new feedback token & link
 *   addFeedback         — Submit rating & review (from public page or tablet)
 *   getFeedbackByToken  — Retrieve request info for public feedback page
 *   getFeedbackByClient — Filter feedback by client ID
 *   getFeedbackByAppointment — Filter feedback by appointment ID
 *   getFeedbackUrl      — Build absolute public feedback URL
 *   refreshFeedback     — Re-sync feedback from backend API
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { feedbackApi } from '../services/api';
import { useAuth } from './AuthContext';

const FeedbackContext = createContext();

const STORAGE_KEY_FEEDBACK = 'omega_client_feedback';
const STORAGE_KEY_PENDING = 'omega_pending_feedback_requests';

function getLocalData(key, fallback = []) {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      // Purge any unauthenticated dummy guest submissions (e.g. fb-guest-*)
      const cleaned = parsed.filter(
        (item) => item && !String(item.token || item.id || '').startsWith('fb-guest-')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(key, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return parsed;
  } catch (err) {
    return fallback;
  }
}

function setLocalData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[FeedbackContext] Failed to save ${key} to localStorage:`, err);
  }
}

export function FeedbackProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [feedback, setFeedback] = useState(() => getLocalData(STORAGE_KEY_FEEDBACK, []));
  const [pendingRequests, setPendingRequests] = useState(() => getLocalData(STORAGE_KEY_PENDING, []));
  const [isLoading, setIsLoading] = useState(false);

  const broadcastChannelRef = useRef(null);

  // Setup cross-tab synchronization channel
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('omega_feedback_channel');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'FEEDBACK_SUBMITTED') {
          const freshFeedback = getLocalData(STORAGE_KEY_FEEDBACK, []);
          const freshPending = getLocalData(STORAGE_KEY_PENDING, []);
          setFeedback(freshFeedback);
          setPendingRequests(freshPending);
        }
      };
    } catch (e) {
      // BroadcastChannel not supported in older browsers, fallback to storage event
    }

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_FEEDBACK) {
        setFeedback(getLocalData(STORAGE_KEY_FEEDBACK, []));
      }
      if (e.key === STORAGE_KEY_PENDING) {
        setPendingRequests(getLocalData(STORAGE_KEY_PENDING, []));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
    };
  }, []);

  // Fetch feedback from backend API when authenticated
  const refreshFeedback = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const res = await feedbackApi.getAll({ limit: 100 });
      if (res?.success && Array.isArray(res.data)) {
        // Merge with local storage
        setFeedback((prev) => {
          const apiMap = new Map(res.data.map((fb) => [fb.id || fb.token, fb]));
          // Keep only legitimate local feedback entries that aren't dummy guests
          prev.forEach((localFb) => {
            const idKey = localFb.id || localFb.token;
            if (idKey && !idKey.startsWith('fb-guest-') && !apiMap.has(idKey)) {
              apiMap.set(idKey, localFb);
            }
          });
          const merged = Array.from(apiMap.values());
          setLocalData(STORAGE_KEY_FEEDBACK, merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('[FeedbackContext] Backend feedback fetch note:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshFeedback();
    }
  }, [isAuthenticated, refreshFeedback]);

  const pendingRequestsRef = useRef(pendingRequests);
  useEffect(() => {
    pendingRequestsRef.current = pendingRequests;
  }, [pendingRequests]);

  // Build absolute public feedback URL
  const getFeedbackUrl = useCallback((token) => {
    if (!token) return '';
    const base = window.location.origin;
    return `${base}/feedback?token=${encodeURIComponent(token)}`;
  }, []);

  // Generate / register a feedback request (called when service closes or payment is collected)
  const createFeedbackRequest = useCallback(async (data = {}) => {
    const currentList = pendingRequestsRef.current || [];
    const existingReq = currentList.find(
      (r) =>
        (data.token && r.token === data.token) ||
        (data.appointmentId && r.appointmentId === data.appointmentId) ||
        (data.clientId && r.clientId === data.clientId && !r.submitted)
    );

    // If already exists, return existing URL immediately without spamming API or re-rendering
    if (existingReq) {
      return { token: existingReq.token, url: getFeedbackUrl(existingReq.token), request: existingReq };
    }

    const token =
      data.token ||
      `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    const newRequest = {
      id: token,
      token,
      clientId: data.clientId || null,
      clientName: data.clientName || 'Valued Guest',
      appointmentId: data.appointmentId || null,
      service: data.service || 'Spa Treatment',
      technician: data.technician || 'Specialist',
      date:
        data.date ||
        new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      createdAt: new Date().toISOString(),
      submitted: false,
    };

    setPendingRequests((prev) => {
      const filtered = prev.filter((r) => r.token !== token && (data.appointmentId ? r.appointmentId !== data.appointmentId : true));
      const updated = [newRequest, ...filtered];
      setLocalData(STORAGE_KEY_PENDING, updated);
      return updated;
    });

    // Notify backend non-blocking
    try {
      feedbackApi.generateToken({
        token,
        clientId: data.clientId ? String(data.clientId) : undefined,
        appointmentId: data.appointmentId ? String(data.appointmentId) : undefined,
        clientName: data.clientName,
        service: data.service,
        technician: data.technician,
      }).catch(() => {});
    } catch (e) {}

    const url = getFeedbackUrl(token);
    return { token, url, request: newRequest };
  }, [getFeedbackUrl]);

  // Retrieve feedback info by token
  const getFeedbackByToken = useCallback(
    (token) => {
      if (!token) return null;
      // 1. Check in pending requests
      const pending = pendingRequests.find((r) => r.token === token);
      if (pending) return pending;

      // 2. Check in submitted feedback
      const submitted = feedback.find((f) => f.token === token);
      if (submitted) return submitted;

      return null;
    },
    [pendingRequests, feedback]
  );

  // Submit feedback (from public page or tablet)
  const addFeedback = useCallback(
    async (token, { rating, comment, fallbackClient }) => {
      if (!token || token.startsWith('fb-guest-')) {
        throw new Error('A valid appointment feedback token is required to submit feedback.');
      }
      const existingReq = pendingRequests.find((r) => r.token === token);
      const req = existingReq || fallbackClient || {
        token,
        clientName: 'Valued Guest',
        service: 'Spa Treatment',
        technician: 'Specialist',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      };

      const now = new Date();
      const entry = {
        id: `fb-${Date.now()}`,
        token,
        clientId: req.clientId || null,
        clientName: req.clientName,
        appointmentId: req.appointmentId || null,
        service: req.service,
        technician: req.technician,
        rating: Number(rating) || 5,
        comment: comment ? String(comment).trim() : '',
        date: req.date || now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        submitted: true,
        submittedAt: now.toISOString(),
      };

      // Update state & localStorage immediately for instant responsiveness
      setFeedback((prev) => {
        const filtered = prev.filter((f) => f.token !== token);
        const updated = [entry, ...filtered];
        setLocalData(STORAGE_KEY_FEEDBACK, updated);
        return updated;
      });

      setPendingRequests((prev) => {
        const updated = prev.filter((r) => r.token !== token);
        setLocalData(STORAGE_KEY_PENDING, updated);
        return updated;
      });

      // Broadcast to other open tabs / windows
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'FEEDBACK_SUBMITTED',
            feedback: entry,
          });
        }
      } catch (err) {}

      // Asynchronously submit to backend API
      try {
        await feedbackApi.submit(token, {
          rating: Number(rating) || 5,
          comment: comment ? String(comment).trim() : undefined,
        });
      } catch (err) {
        console.warn('[FeedbackContext] Backend feedback submit fallback note:', err.message);
      }

      return entry;
    },
    [pendingRequests]
  );

  // Filter feedback by client ID
  const getFeedbackByClient = useCallback(
    (clientId) => {
      if (!clientId) return [];
      return feedback.filter(
        (f) => String(f.clientId) === String(clientId) && f.submitted
      );
    },
    [feedback]
  );

  // Filter feedback by appointment ID
  const getFeedbackByAppointment = useCallback(
    (appointmentId) => {
      if (!appointmentId) return null;
      return feedback.find(
        (f) => String(f.appointmentId) === String(appointmentId) && f.submitted
      ) || null;
    },
    [feedback]
  );

  return (
    <FeedbackContext.Provider
      value={{
        feedback,
        pendingRequests,
        isLoading,
        refreshFeedback,
        createFeedbackRequest,
        getFeedbackByToken,
        getFeedbackByClient,
        getFeedbackByAppointment,
        getFeedbackUrl,
        addFeedback,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return ctx;
}
