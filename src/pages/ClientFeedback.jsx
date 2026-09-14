/**
 * ClientFeedback — Manager-only feedback list page
 *
 * Shows all submitted client feedback:
 *   - Client name
 *   - Service
 *   - Rating (stars)
 *   - Comment
 *   - Date
 *
 * View-only for Manager.
 */

import { Star } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useFeedback } from '../context/FeedbackContext';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          strokeWidth={1.5}
          className={s <= rating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-border'}
        />
      ))}
    </div>
  );
}

export default function ClientFeedback() {
  const { feedback } = useFeedback();

  const submittedFeedback = feedback.filter((f) => f.submitted);

  return (
    <div>
      <PageHeader
        title="Client Feedback"
        subtitle={`${submittedFeedback.length} feedback response${submittedFeedback.length !== 1 ? 's' : ''} received.`}
      />

      {submittedFeedback.length === 0 ? (
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <p className="text-sm text-muted-gray">No feedback received yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submittedFeedback.map((fb) => (
            <div
              key={fb.id}
              className="bg-white border border-border rounded-[16px] shadow-card p-5 hover:shadow-md transition-shadow duration-150"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Client, Service, Rating, Comment */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-charcoal">{fb.clientName}</h3>
                    <span className="px-2.5 py-0.5 rounded-[8px] text-[11px] font-medium bg-sage-soft text-[#4F6748] border border-sage/20">
                      {fb.service}
                    </span>
                    {fb.technician && (
                      <span className="text-[11px] text-muted-gray">
                        by {fb.technician}
                      </span>
                    )}
                  </div>

                  <StarRating rating={fb.rating} />

                  {fb.comment && (
                    <div className="bg-soft-cream/40 border border-border/50 rounded-[10px] p-2.5">
                      <p className="text-xs text-charcoal/80 leading-relaxed italic">
                        "{fb.comment}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Date */}
                <div className="shrink-0 text-right">
                  <span className="text-[11px] text-muted-gray font-medium">{fb.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
