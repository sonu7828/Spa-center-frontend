/**
 * FeedbackContext — In-memory client feedback state
 *
 * Provides:
 *   feedback         — Array of all feedback entries
 *   addFeedback      — Submit new feedback (from public page)
 *   getFeedbackByClient — Get feedback for a specific client
 *   getFeedbackByToken  — Get feedback request by token (demo)
 *
 * API-ready structure:
 *   Service Complete → backend generates secure token/link
 *   → client opens link → submits rating + comment
 *   → saved in database
 *
 * Frontend/in-memory only. No backend, no real tokens.
 */

import { createContext, useContext, useState, useCallback } from 'react';

const FeedbackContext = createContext();

// Clean initial state for real backend integration
const SEED_FEEDBACK = [];

// Pending feedback requests (simulates tokens generated after service close)
const SEED_PENDING = [];

export function FeedbackProvider({ children }) {
  const [feedback, setFeedback] = useState(SEED_FEEDBACK);
  const [pendingRequests, setPendingRequests] = useState(SEED_PENDING);

  // Create a pending feedback request (called after service close)
  const createFeedbackRequest = useCallback((data) => {
    const token = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request = {
      id: token,
      clientId: data.clientId,
      clientName: data.clientName || '',
      service: data.service || '',
      technician: data.technician || '',
      date: data.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      token,
      submitted: false,
    };
    setPendingRequests((prev) => [request, ...prev]);
    return token;
  }, []);

  // Submit feedback (from public feedback page)
  const addFeedback = useCallback((token, { rating, comment, fallbackClient }) => {
    // Find pending request or use fallback
    const request = pendingRequests.find((r) => r.token === token) || fallbackClient || {
      clientId: 1,
      clientName: 'Sophie',
      service: 'Massage',
      technician: 'Grace',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      token,
    };

    const entry = {
      ...request,
      id: `fb-${Date.now()}`,
      rating: Number(rating) || 0,
      comment: comment?.trim() || '',
      submitted: true,
      submittedAt: new Date().toISOString(),
    };

    setFeedback((prev) => [entry, ...prev]);
    setPendingRequests((prev) => prev.filter((r) => r.token !== token));
    return entry;
  }, [pendingRequests]);

  // Get all feedback for a specific client
  const getFeedbackByClient = useCallback(
    (clientId) => feedback.filter((f) => f.clientId === Number(clientId) && f.submitted),
    [feedback]
  );

  // Get pending request by token (for public feedback page)
  const getFeedbackByToken = useCallback(
    (token) => pendingRequests.find((r) => r.token === token) || null,
    [pendingRequests]
  );

  return (
    <FeedbackContext.Provider
      value={{
        feedback,
        pendingRequests,
        createFeedbackRequest,
        addFeedback,
        getFeedbackByClient,
        getFeedbackByToken,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
