/**
 * FeedbackPage — Public client feedback submission page (English & Token-Guarded)
 *
 * Rules:
 *   1. Access is strictly guarded: requires a verified ?token=fb-... from WhatsApp/SMS.
 *   2. Direct access without token is blocked with a clear English luxury explanation.
 *   3. Invalid/expired tokens show a graceful reception-contact notice.
 *   4. Verified tokens display the actual client's name, treatment, and specialist.
 *   5. Already submitted tokens display the recorded feedback and prevent re-submission.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, Send, CheckCircle2, Sparkles, User, Calendar, Award, ShieldCheck, AlertCircle, MessageCircle } from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';
import { feedbackApi } from '../services/api';

export default function FeedbackPage() {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || '';
  const token = rawToken.trim();

  const { getFeedbackByToken, addFeedback } = useFeedback();

  // Status: 'CHECKING' | 'NO_TOKEN' | 'INVALID_TOKEN' | 'READY'
  const [status, setStatus] = useState(!token ? 'NO_TOKEN' : 'CHECKING');
  const [request, setRequest] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Guard & Token Verification
  useEffect(() => {
    if (!token) {
      setStatus('NO_TOKEN');
      return;
    }

    let isMounted = true;
    setStatus('CHECKING');

    // 1. First check local memory / context
    const local = getFeedbackByToken(token);
    if (local) {
      setRequest(local);
      if (local.submitted || local.isSubmitted) {
        setSubmitted(true);
        setRating(Number(local.rating) || 5);
        setComment(local.comment || '');
      }
      setStatus('READY');
      return;
    }

    // 2. Fetch from backend API
    feedbackApi
      .getByToken(token)
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res.data) {
          setRequest(res.data);
          if (res.data.isSubmitted) {
            setSubmitted(true);
            setRating(Number(res.data.rating) || 5);
            setComment(res.data.comment || '');
          }
          setStatus('READY');
        } else {
          setStatus('INVALID_TOKEN');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[FeedbackPage] Token verification failed:', err.message);
        setStatus('INVALID_TOKEN');
      });

    return () => {
      isMounted = false;
    };
  }, [token, getFeedbackByToken]);

  const handleSubmit = async () => {
    if (rating < 1 || isSubmitting || !token) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // 1. Submit to backend API
      await feedbackApi.submit(token, {
        rating,
        comment: comment.trim(),
      });

      // 2. Sync to local state & broadcast to Manager dashboard
      try {
        await addFeedback(token, {
          rating,
          comment: comment.trim(),
          fallbackClient: request,
        });
      } catch (ctxErr) {
        console.warn('[FeedbackPage] Local context sync note:', ctxErr.message);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      // Fallback: record locally if network issue
      try {
        await addFeedback(token, {
          rating,
          comment: comment.trim(),
          fallbackClient: request,
        });
        setSubmitted(true);
      } catch (fallbackErr) {
        setSubmitError(err.message || 'Unable to submit feedback. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientName = request?.clientName || 'Valued Guest';
  const serviceName = request?.service || 'Luxury Spa Treatment';
  const techName = request?.technician || 'OMEGA Specialist';
  const visitDate = request?.date || 'Recent Visit';

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-3 sm:p-4 text-[#2E2F31]">
      <div className="w-full max-w-[calc(100vw-24px)] sm:max-w-[480px]">
        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 mb-1.5">
            <Sparkles size={20} className="text-[#4F6748]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2E2F31] font-serif">
              OMEGA SPA
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#71717A] tracking-wider uppercase">
            Douala · Wellness & Aesthetics
          </p>
        </div>

        <div className="bg-white border border-[#E4E4E7] rounded-[22px] shadow-sm overflow-hidden">
          {/* 1. Loading State */}
          {status === 'CHECKING' && (
            <div className="p-8 sm:p-10 text-center space-y-3">
              <div className="w-9 h-9 border-2 border-[#4F6748] border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-sm font-semibold text-[#2E2F31]">Verifying your appointment...</h3>
              <p className="text-xs text-[#71717A]">Connecting securely to OMEGA SPA</p>
            </div>
          )}

          {/* 2. Direct Access Blocked: No Token */}
          {status === 'NO_TOKEN' && (
            <div className="p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#EBF3EC] border border-[#7FA285]/40 flex items-center justify-center mx-auto text-[#4F6748]">
                <ShieldCheck size={32} />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF3EC] text-[#4F6748] mb-2 uppercase tracking-wide">
                  Verified Client Access Only
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#2E2F31] font-serif">
                  Personalized Link Required
                </h2>
                <p className="text-xs text-[#71717A] mt-1">
                  Direct submissions without an appointment link are not permitted
                </p>
              </div>

              <div className="bg-[#FBF9F5] border border-[#E4E4E7] rounded-[14px] p-4 text-left space-y-2">
                <p className="text-xs text-[#3F3F46] leading-relaxed">
                  To ensure authentic feedback and protect client confidentiality, reviews can only be submitted using the <strong>unique, verified link sent to your WhatsApp</strong> after your treatment at OMEGA SPA.
                </p>
                <p className="text-[11px] text-[#71717A] leading-relaxed">
                  Please check the WhatsApp message you received following your visit to open your personalized feedback form.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="https://wa.me/237687673262?text=Hello%20OMEGA%20SPA%2C%20I%20would%20like%20to%20provide%20feedback%20on%20my%20recent%20visit."
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-[46px] rounded-[12px] bg-[#4F6748] hover:bg-[#3D5237] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <MessageCircle size={16} />
                  Contact Reception on WhatsApp (+237 6 87 67 32 62)
                </a>
              </div>
            </div>
          )}

          {/* 3. Invalid or Expired Token */}
          {status === 'INVALID_TOKEN' && (
            <div className="p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FEF2F2] border border-[#FCA5A5]/50 flex items-center justify-center mx-auto text-[#DC2626]">
                <AlertCircle size={32} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#2E2F31] font-serif">
                  Link Expired or Not Found
                </h2>
                <p className="text-xs text-[#71717A] mt-1">
                  This feedback link is invalid or no longer active
                </p>
              </div>

              <p className="text-xs text-[#52525B] leading-relaxed max-w-[340px] mx-auto">
                We could not find an active appointment matching this link. If you recently visited OMEGA SPA, please reach out to our reception team.
              </p>

              <div className="pt-2">
                <a
                  href="https://wa.me/237687673262?text=Hello%20OMEGA%20SPA%2C%20my%20feedback%20link%20appears%20invalid."
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-[44px] rounded-[12px] bg-[#4F6748] hover:bg-[#3D5237] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle size={15} />
                  Contact OMEGA SPA (+237 6 87 67 32 62)
                </a>
              </div>
            </div>
          )}

          {/* 4. Ready State: Feedback Form OR Thank You */}
          {status === 'READY' && (
            submitted ? (
              /* ── Thank You Screen ── */
              <div className="p-6 sm:p-8 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-[#EBF3EC] border border-[#7FA285]/40 flex items-center justify-center mx-auto mb-4 text-[#4F6748]">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-xl font-bold text-[#2E2F31] mb-1 font-serif">
                  Thank You, {clientName}!
                </h2>
                <p className="text-xs text-[#4F6748] font-medium mb-3">
                  ✓ Your feedback has been recorded successfully
                </p>
                <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed max-w-[340px] mx-auto">
                  Your feedback helps us continuously elevate the luxury spa standards and personal care at OMEGA SPA.
                </p>

                <div className="mt-5 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#FBF9F5] border border-[#E4E4E7]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={20}
                      className={s <= rating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#E4E4E7]'}
                    />
                  ))}
                </div>

                {comment && (
                  <div className="mt-4 p-3 bg-[#FBF9F5] border border-[#E4E4E7]/70 rounded-[12px] text-xs text-[#52525B] italic max-w-[340px] mx-auto">
                    "{comment}"
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-[#E4E4E7]/60">
                  <p className="text-xs font-medium text-[#4F6748]">
                    🌿 We look forward to welcoming you back soon!
                  </p>
                  <p className="text-[11px] text-[#A1A1AA] mt-1">
                    OMEGA SPA · Bonapriso / Akwa, Douala
                  </p>
                </div>
              </div>
            ) : (
              /* ── Verified Feedback Form ── */
              <div>
                {/* Header Banner */}
                <div className="px-6 py-4 border-b border-[#E4E4E7] bg-[#EBF3EC]/50 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#2E2F31]">
                      How was your experience today?
                    </h2>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Share your thoughts on your visit at OMEGA SPA
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#4F6748] text-white shrink-0">
                    <ShieldCheck size={12} />
                    Verified Client
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Verified Client & Service Details */}
                  <div className="bg-[#FBF9F5] border border-[#E4E4E7] rounded-[14px] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#71717A] flex items-center gap-1.5">
                        <User size={13} className="text-[#4F6748]" /> Client
                      </span>
                      <span className="font-bold text-[#2E2F31]">
                        {clientName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#71717A] flex items-center gap-1.5">
                        <Award size={13} className="text-[#4F6748]" /> Treatment
                      </span>
                      <span className="font-medium text-[#2E2F31] text-right max-w-[220px] truncate">
                        {serviceName}
                      </span>
                    </div>

                    {techName && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#71717A] flex items-center gap-1.5">
                          <Sparkles size={13} className="text-[#4F6748]" /> Specialist
                        </span>
                        <span className="font-medium text-[#2E2F31]">
                          {techName}
                        </span>
                      </div>
                    )}

                    {visitDate && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E4E4E7]/60">
                        <span className="text-[#A1A1AA] flex items-center gap-1.5">
                          <Calendar size={12} /> Date
                        </span>
                        <span className="text-[#71717A] font-medium">
                          {visitDate}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Star Rating */}
                  <div className="text-center pt-1 pb-2">
                    <label className="block text-xs font-semibold text-[#71717A] uppercase tracking-wider mb-3">
                      Overall Satisfaction *
                    </label>
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          onMouseEnter={() => setHoveredStar(s)}
                          onMouseLeave={() => setHoveredStar(0)}
                          className="p-1 cursor-pointer transition-transform duration-150 hover:scale-125 active:scale-95 focus:outline-none"
                          aria-label={`${s} Star${s > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={36}
                            strokeWidth={1.5}
                            className={`transition-colors duration-150 ${
                              s <= (hoveredStar || rating)
                                ? 'text-[#F59E0B] fill-[#F59E0B] drop-shadow-sm'
                                : 'text-[#D4D4D8]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <p className="text-xs font-medium text-[#4F6748] mt-2.5 min-h-[18px]">
                      {rating > 0
                        ? [
                            '',
                            'Poor Experience 😞',
                            'Fair 😐',
                            'Good Visit 🙂',
                            'Very Good Experience 😊',
                            'Exceptional Luxury Experience! 🌟',
                          ][rating]
                        : 'Tap a star to rate'}
                    </p>
                  </div>

                  {/* Written Comment Textarea */}
                  <div>
                    <label className="block text-xs font-medium text-[#71717A] mb-1.5">
                      Comments & Suggestions <span className="text-[#A1A1AA]">(Optional)</span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="Tell us what you liked about your treatment or how we can improve..."
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E4E4E7] rounded-[12px] text-sm text-[#2E2F31] placeholder:text-[#A1A1AA] outline-none focus:border-[#4F6748] focus:ring-1 focus:ring-[#4F6748]/30 transition-all resize-y"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5]/60 rounded-[10px] text-xs text-[#DC2626]">
                      {submitError}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={rating < 1 || isSubmitting}
                    className="w-full h-[48px] rounded-[12px] bg-[#4F6748] hover:bg-[#3D5237] active:bg-[#3D5237] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <p className="text-center text-[11px] text-[#A1A1AA] mt-4">
          OMEGA SPA · Douala, Cameroon · Phone: +237 6 87 67 32 62
        </p>
      </div>
    </div>
  );
}
