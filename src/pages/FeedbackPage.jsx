/**
 * FeedbackPage — Public feedback submission page (no login required)
 *
 * Shows:
 *   - OMEGA SPA branding
 *   - Client Name + Service (from token/demo)
 *   - 1–5 Star Rating
 *   - Comment (Optional)
 *   - Submit Feedback button
 *
 * After submit: shows Thank You message.
 *
 * In demo mode: uses a demo token to pre-fill client/service info.
 * Backend will generate real secure tokens later.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';

export default function FeedbackPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || 'demo';
  const { getFeedbackByToken, addFeedback, createFeedbackRequest } = useFeedback();

  // Look up request by token from context, or fallback if token opened directly
  const existingRequest = getFeedbackByToken(token);
  const request = existingRequest || {
    id: token,
    clientId: 1,
    clientName: 'Sophie',
    service: 'Massage',
    technician: 'Grace',
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    token,
  };

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating < 1) return;
    addFeedback(token, { rating, comment, fallbackClient: request });
    setSubmitted(true);
  };

  // Public page — no AppShell, standalone layout
  return (
    <div className="min-h-screen bg-warm-ivory flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-[calc(100vw-24px)] sm:max-w-[440px]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-sage" />
            <h1 className="text-xl font-bold text-charcoal tracking-tight">
              OMEGA SPA
            </h1>
          </div>
          <p className="text-sm text-muted-gray">Douala</p>
        </div>

        <div className="bg-white border border-border rounded-[20px] shadow-card overflow-hidden">
          {submitted ? (
            /* ── Thank You Screen ── */
            <div className="p-6 sm:p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-success-soft border border-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-success" />
              </div>
              <h2 className="text-lg font-bold text-charcoal mb-1">
                Thank You!
              </h2>
              <p className="text-sm text-muted-gray leading-relaxed">
                Your feedback has been received. We appreciate you taking the time to share your experience with us.
              </p>
              <div className="mt-5 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={22}
                    className={s <= rating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-border'}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-gray mt-3 italic">
                — OMEGA SPA, Douala
              </p>
            </div>
          ) : (
            /* ── Feedback Form ── */
            <div>
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-sage-soft/20">
                <h2 className="text-base font-semibold text-charcoal mb-1">
                  How was your experience?
                </h2>
                <p className="text-xs text-muted-gray">
                  We value your honest feedback.
                </p>
              </div>

              <div className="p-6">
                {/* Client & Service Info */}
                {request && (
                  <div className="bg-soft-cream/50 border border-border/60 rounded-[12px] p-3.5 mb-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-gray">Client</span>
                      <span className="text-sm font-semibold text-charcoal">{request.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-gray">Service</span>
                      <span className="text-sm font-medium text-charcoal">{request.service}</span>
                    </div>
                    {request.technician && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-gray">Technician</span>
                        <span className="text-sm font-medium text-charcoal">{request.technician}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Star Rating */}
                <div className="mb-5">
                  <label className="block text-[13px] font-medium text-muted-gray mb-3">
                    Rating *
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoveredStar(s)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-1 cursor-pointer transition-transform duration-100 hover:scale-110 active:scale-95"
                      >
                        <Star
                          size={32}
                          strokeWidth={1.5}
                          className={`transition-colors duration-150 ${
                            s <= (hoveredStar || rating)
                              ? 'text-[#F59E0B] fill-[#F59E0B]'
                              : 'text-border'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-center text-xs font-medium text-muted-gray mt-2">
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div className="mb-5">
                  <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
                    Comment <span className="text-muted-gray/60">(Optional)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Tell us about your experience..."
                    className="w-full px-3.5 py-3 bg-white border border-border rounded-[12px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/20 transition-colors resize-y placeholder:text-muted-gray/50"
                  />
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating < 1}
                  className="w-full h-[48px] rounded-[12px] bg-sage text-charcoal font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-sage-hover active:bg-sage-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-gray/60 mt-4">
          OMEGA SPA · Douala, Cameroon
        </p>
      </div>
    </div>
  );
}
