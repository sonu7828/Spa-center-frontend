import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Package,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import Button from './Button';
import { useOperations } from '../context/OperationsContext';
import { useAuth } from '../context/AuthContext';

export default function StockPhotoDetailModal({
  isOpen,
  onClose,
  audit,
  onReviewed,
}) {
  const { reviewDailyStockAudit, deleteDailyStockAudit } = useOperations();
  const { user } = useAuth();

  const userRole = (user?.role || '').toLowerCase();
  const canReview = userRole === 'manager' || userRole === 'reception';
  const canDelete = userRole === 'manager' || userRole === 'admin';

  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !audit) return null;

  const formattedDate = audit.date
    ? new Date(audit.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Today';

  const formattedTime = audit.createdAt
    ? new Date(audit.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleReview = async (newStatus) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const updated = await reviewDailyStockAudit(audit.id, {
        status: newStatus,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      if (onReviewed) onReviewed(updated);
      onClose();
    } catch (err) {
      console.error('Failed to review audit:', err);
      setErrorMsg(err.message || 'Failed to update review status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this stock audit photo?')) return;
    setIsDeleting(true);
    try {
      await deleteDailyStockAudit(audit.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete audit:', err);
      setErrorMsg(err.message || 'Failed to delete audit');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-charcoal/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-border flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage/15 text-sage flex items-center justify-center font-bold">
              <Package size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                <span>{audit.productName}</span>
                {audit.status === 'REVIEWED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Reviewed ✓
                  </span>
                )}
                {audit.status === 'FLAGGED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Flagged ⚠️
                  </span>
                )}
                {audit.status === 'PENDING' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Pending Follow-up
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-gray">
                Logged on {formattedDate} at {formattedTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-gray hover:text-charcoal hover:bg-soft-cream/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-error/10 border border-error/30 text-error rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Photo Display */}
          <div className="relative w-full aspect-16/10 bg-charcoal rounded-2xl overflow-hidden border border-border shadow-inner flex items-center justify-center">
            <img
              src={audit.photoUrl}
              alt={audit.productName}
              className="w-full h-full object-contain"
            />
            <a
              href={audit.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={12} />
              <span>Full Photo</span>
            </a>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-soft-cream/40 rounded-xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray flex items-center gap-1">
                <User size={12} className="text-sage" />
                Submitted By
              </span>
              <p className="text-xs sm:text-sm font-semibold text-charcoal mt-0.5">
                {audit.technicianName || 'Technician'}
              </p>
            </div>

            <div className="p-3 bg-soft-cream/40 rounded-xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray flex items-center gap-1">
                <Clock size={12} className="text-sage" />
                Submitted At
              </span>
              <p className="text-xs sm:text-sm font-semibold text-charcoal mt-0.5">
                {formattedDate} {formattedTime ? `• ${formattedTime}` : ''}
              </p>
            </div>
          </div>

          {/* Written Remarks */}
          <div className="p-4 bg-soft-cream/60 rounded-2xl border border-border space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal">
              <FileText size={14} className="text-sage" />
              <span>Technician Remarks & Observations</span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal leading-relaxed whitespace-pre-wrap font-medium">
              {audit.remarks || 'No written remarks provided.'}
            </p>
          </div>

          {/* Review status / Manager notes */}
          {audit.reviewedByName && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>
                  Followed up by {audit.reviewedByName}{' '}
                  {audit.reviewedAt &&
                    `on ${new Date(audit.reviewedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}`}
                </span>
              </div>
              {audit.reviewNotes && (
                <p className="text-emerald-800 pl-5 italic">
                  "{audit.reviewNotes}"
                </p>
              )}
            </div>
          )}

          {/* Manager / Reception Review Box */}
          {canReview && audit.status === 'PENDING' && (
            <div className="p-4 bg-white rounded-2xl border-2 border-sage/30 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal">
                <CheckCircle2 size={14} className="text-sage" />
                <span>Manager / Reception Follow-up</span>
              </div>
              <input
                type="text"
                placeholder="Optional follow-up notes (e.g. Refill dispatched, acknowledged...)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full h-10 px-3.5 bg-soft-cream/40 border border-border rounded-xl text-xs sm:text-sm text-charcoal focus:border-sage outline-none"
              />
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleReview('REVIEWED')}
                  disabled={isSubmitting}
                  className="text-xs font-bold h-9 px-4 flex items-center gap-1"
                >
                  <CheckCircle2 size={13} />
                  <span>Mark as Reviewed</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleReview('FLAGGED')}
                  disabled={isSubmitting}
                  className="text-xs font-semibold h-9 px-3 text-amber-700 hover:bg-amber-50"
                >
                  <AlertTriangle size={13} />
                  <span>Flag for Restock</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 px-5 py-4 bg-white/95 backdrop-blur border-t border-border flex items-center justify-between">
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs text-error hover:text-error/80 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-error/10 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{isDeleting ? 'Deleting...' : 'Delete Audit'}</span>
            </button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
