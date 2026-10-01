/**
 * ClientFeedback — Manager Client Feedback & Quality Analytics Dashboard
 *
 * Shows:
 *   - Overall Average Rating & Total Reviews
 *   - 5-Star Rating Distribution & Satisfaction Rate
 *   - Rating Filter (All, 5★, 4★, 3★, ≤2★) & Search
 *   - Submitted Client Feedback Cards with Client, Service, Technician, Stars, Comments, and Date
 *   - Instant Real-time Live Updates via FeedbackContext
 */

import { useState, useMemo } from 'react';
import { Star, MessageSquare, RefreshCw, Sparkles, Filter, Search, ExternalLink, ThumbsUp, Award } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useFeedback } from '../context/FeedbackContext';

function StarRating({ rating, size = 15 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          strokeWidth={1.5}
          className={s <= rating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#E4E4E7]'}
        />
      ))}
    </div>
  );
}

export default function ClientFeedback() {
  const { feedback, refreshFeedback, isLoading, getFeedbackUrl } = useFeedback();
  const [selectedRating, setSelectedRating] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const submittedList = useMemo(() => {
    return (feedback || []).filter((f) => f.submitted || f.isSubmitted);
  }, [feedback]);

  // Key KPI metrics
  const stats = useMemo(() => {
    if (submittedList.length === 0) {
      return { avgRating: 0, total: 0, fiveStarCount: 0, positiveRate: 0 };
    }
    const sum = submittedList.reduce((acc, f) => acc + (Number(f.rating) || 0), 0);
    const avg = (sum / submittedList.length).toFixed(1);
    const fiveStar = submittedList.filter((f) => Number(f.rating) === 5).length;
    const positive = submittedList.filter((f) => Number(f.rating) >= 4).length;
    const positiveRate = Math.round((positive / submittedList.length) * 100);

    return {
      avgRating: avg,
      total: submittedList.length,
      fiveStarCount: fiveStar,
      positiveRate,
    };
  }, [submittedList]);

  // Filtered list
  const filteredList = useMemo(() => {
    return submittedList.filter((f) => {
      const matchRating =
        selectedRating === 'ALL'
          ? true
          : selectedRating === '5'
          ? Number(f.rating) === 5
          : selectedRating === '4'
          ? Number(f.rating) === 4
          : selectedRating === '3'
          ? Number(f.rating) === 3
          : Number(f.rating) <= 2;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.clientName?.toLowerCase().includes(q) ||
        f.service?.toLowerCase().includes(q) ||
        f.technician?.toLowerCase().includes(q) ||
        f.comment?.toLowerCase().includes(q);

      return matchRating && matchSearch;
    });
  }, [submittedList, selectedRating, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Client Feedback & Quality Monitoring"
        subtitle="Live client ratings, post-service satisfaction reviews, and treatment quality tracking"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={refreshFeedback}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Average Rating */}
        <div className="bg-white border border-[#E4E4E7] rounded-[16px] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#71717A] mb-1">
            <span>Average Rating</span>
            <Star size={16} className="text-[#F59E0B] fill-[#F59E0B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#2E2F31]">
              {stats.avgRating > 0 ? stats.avgRating : '—'}
            </span>
            <span className="text-xs text-[#A1A1AA]">/ 5.0</span>
          </div>
          <p className="text-[11px] text-[#71717A] mt-1.5">
            Based on {stats.total} review{stats.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total Reviews */}
        <div className="bg-white border border-[#E4E4E7] rounded-[16px] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#71717A] mb-1">
            <span>Total Reviews</span>
            <MessageSquare size={16} className="text-[#4F6748]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#2E2F31]">
            {stats.total}
          </div>
          <p className="text-[11px] text-[#71717A] mt-1.5">
            Submitted by clients
          </p>
        </div>

        {/* 5-Star Count */}
        <div className="bg-white border border-[#E4E4E7] rounded-[16px] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#71717A] mb-1">
            <span>5-Star Excellence</span>
            <Award size={16} className="text-[#4F6748]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#4F6748]">
            {stats.fiveStarCount}
          </div>
          <p className="text-[11px] text-[#71717A] mt-1.5">
            Perfect luxury ratings
          </p>
        </div>

        {/* Satisfaction Rate */}
        <div className="bg-white border border-[#E4E4E7] rounded-[16px] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#71717A] mb-1">
            <span>Satisfaction Rate</span>
            <ThumbsUp size={16} className="text-[#4F6748]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#2E2F31]">
            {stats.total > 0 ? `${stats.positiveRate}%` : '—'}
          </div>
          <p className="text-[11px] text-[#71717A] mt-1.5">
            Rated 4 or 5 stars
          </p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-[#E4E4E7] rounded-[16px] p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Rating Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Reviews' },
            { id: '5', label: '5 Stars ★' },
            { id: '4', label: '4 Stars ★' },
            { id: '3', label: '3 Stars ★' },
            { id: 'LOW', label: '≤ 2 Stars' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedRating(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedRating === pill.id
                  ? 'bg-[#4F6748] text-white shadow-xs'
                  : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, service, tech..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#FBF9F5] border border-[#E4E4E7] rounded-[10px] text-xs text-[#2E2F31] placeholder:text-[#A1A1AA] outline-none focus:border-[#4F6748]"
          />
        </div>
      </div>

      {/* Feedback List */}
      {filteredList.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-[16px] p-8 sm:p-12 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#EBF3EC] text-[#4F6748] flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={22} />
          </div>
          <h3 className="text-base font-semibold text-[#2E2F31] mb-1">
            No Feedback Found
          </h3>
          <p className="text-xs sm:text-sm text-[#71717A] max-w-[420px] mx-auto leading-relaxed">
            {submittedList.length === 0
              ? 'When an appointment is closed or invoice is paid, clients receive a Thank You message on WhatsApp with their feedback link. Once submitted, it appears here instantly!'
              : 'No reviews match your selected filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredList.map((fb) => (
            <div
              key={fb.id || fb.token}
              className="bg-white border border-[#E4E4E7] rounded-[16px] shadow-sm p-4 sm:p-5 hover:border-[#7FA285]/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Client & Stars */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-[#2E2F31]">
                      {fb.clientName || 'Valued Guest'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium bg-[#EBF3EC] text-[#4F6748] border border-[#7FA285]/30">
                        {fb.service || 'Spa Treatment'}
                      </span>
                      {fb.technician && (
                        <span className="text-[11px] text-[#71717A]">
                          by <strong className="font-medium text-[#2E2F31]">{fb.technician}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <StarRating rating={fb.rating} size={15} />
                    <span className="text-[10px] text-[#A1A1AA] block mt-1">
                      {fb.date || 'Recent'}
                    </span>
                  </div>
                </div>

                {/* Comment Text */}
                {fb.comment ? (
                  <div className="mt-3 p-3 bg-[#FBF9F5] border border-[#E4E4E7]/70 rounded-[12px] text-xs text-[#3F3F46] leading-relaxed italic">
                    "{fb.comment}"
                  </div>
                ) : (
                  <p className="text-[11px] text-[#A1A1AA] italic mt-2">
                    (No written comment provided — {fb.rating} star rating only)
                  </p>
                )}
              </div>

              {/* Footer info */}
              <div className="mt-4 pt-3 border-t border-[#E4E4E7]/50 flex items-center justify-between text-[11px] text-[#A1A1AA]">
                <span>Status: <strong className="text-[#4F6748] font-medium">✓ Submitted</strong></span>
                {fb.token && (
                  <span className="font-mono text-[10px] text-[#A1A1AA]/80">
                    Ref: {fb.token.slice(0, 10)}...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
