import React, { useState, useMemo } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Filter,
  Search,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import Button from '../components/Button';
import RecordStockPhotoModal from '../components/RecordStockPhotoModal';
import StockPhotoDetailModal from '../components/StockPhotoDetailModal';
import { useOperations } from '../context/OperationsContext';
import { useAuth } from '../context/AuthContext';
import { getDoualaTodayStr } from '../utils/timezone';

export default function StockPhotos() {
  const { user, allUsers } = useAuth();
  const { dailyStockAudits = [], isLoadingAudits, refreshDailyAudits } = useOperations();

  const userRole = (user?.role || '').toLowerCase();
  const isTechnician = userRole === 'technician';
  const isManager = userRole === 'manager';
  const isReception = userRole === 'reception';

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'REVIEWED' | 'FLAGGED'
  const [dateFilter, setDateFilter] = useState('all'); // 'today' | 'all'
  const [selectedTechFilter, setSelectedTechFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const todayStr = getDoualaTodayStr();

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Base list depending on role:
  // Technicians by default see their own photos (or can toggle); Managers/Reception see all
  const baseAudits = useMemo(() => {
    if (isTechnician) {
      return dailyStockAudits.filter(
        (a) =>
          String(a.technicianId) === String(user?.id) ||
          a.technicianName?.toLowerCase() === user?.name?.toLowerCase()
      );
    }
    return dailyStockAudits;
  }, [dailyStockAudits, isTechnician, user?.id, user?.name]);

  // Filtered List
  const filteredAudits = useMemo(() => {
    return baseAudits.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Date filter
      if (dateFilter === 'today') {
        const itemDateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
        if (itemDateStr !== todayStr) return false;
      }

      // Tech filter (for manager/reception)
      if (!isTechnician && selectedTechFilter !== 'ALL') {
        if (item.technicianId !== selectedTechFilter && item.technicianName !== selectedTechFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRemarks = item.remarks?.toLowerCase().includes(q);
        const matchTech = item.technicianName?.toLowerCase().includes(q);
        const matchProd = item.productName?.toLowerCase().includes(q);
        if (!matchRemarks && !matchTech && !matchProd) return false;
      }

      return true;
    });
  }, [baseAudits, statusFilter, dateFilter, selectedTechFilter, searchQuery, isTechnician, todayStr]);

  // Counts for metric cards
  const totalCount = baseAudits.length;
  const pendingCount = baseAudits.filter((a) => a.status === 'PENDING').length;
  const reviewedCount = baseAudits.filter((a) => a.status === 'REVIEWED').length;
  const flaggedCount = baseAudits.filter((a) => a.status === 'FLAGGED').length;

  // Technicians list for filter dropdown
  const techniciansList = useMemo(() => {
    return allUsers.filter((u) => u.role === 'technician' && u.active !== false);
  }, [allUsers]);

  return (
    <div className="w-full min-w-0 space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sage/15 text-sage flex items-center justify-center font-bold shrink-0">
              <Camera size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-[26px] font-bold text-charcoal">
                {isTechnician ? 'My Daily Stock Photos' : 'Daily Stock Photo Audits'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-gray mt-0.5">
                {isTechnician
                  ? 'Take live photos of remaining products and write your remarks at the end of every day.'
                  : 'Follow up on live stock photos and written remarks submitted by technicians.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => {
              refreshDailyAudits();
              showToast('Refreshed stock photos');
            }}
            disabled={isLoadingAudits}
            className="h-11 px-3.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw size={15} className={isLoadingAudits ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>

          {isTechnician && (
            <Button
              variant="primary"
              onClick={() => setIsRecordModalOpen(true)}
              className="h-11 px-4 text-xs font-bold flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white shadow-sm cursor-pointer"
            >
              <Camera size={16} />
              <span>+ Take Live Stock Photo</span>
            </Button>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3.5 rounded-[12px] bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-border rounded-[16px] p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
            {isTechnician ? 'Total Photos' : 'Total Audits'}
          </span>
          <span className="text-2xl font-extrabold text-charcoal mt-1 block">
            {totalCount}
          </span>
        </div>

        <div className="bg-white border border-border rounded-[16px] p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Pending Follow-up
          </span>
          <span className="text-2xl font-extrabold text-blue-700 mt-1 block">
            {pendingCount}
          </span>
        </div>

        <div className="bg-white border border-border rounded-[16px] p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Reviewed & Verified
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {reviewedCount}
          </span>
        </div>

        <div className="bg-white border border-border rounded-[16px] p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Flagged Restock
          </span>
          <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
            {flaggedCount}
          </span>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white border border-border rounded-[16px] p-3.5 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center bg-soft-cream/60 p-0.5 rounded-[10px] border border-border">
            {['ALL', 'PENDING', 'REVIEWED', 'FLAGGED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-charcoal text-white shadow-2xs'
                    : 'text-muted-gray hover:text-charcoal'
                }`}
              >
                {st === 'ALL'
                  ? 'All'
                  : st === 'PENDING'
                  ? 'Pending'
                  : st === 'REVIEWED'
                  ? 'Reviewed'
                  : 'Flagged'}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center bg-soft-cream/60 p-0.5 rounded-[10px] border border-border">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-sage text-white shadow-2xs'
                  : 'text-muted-gray hover:text-charcoal'
              }`}
            >
              All Dates
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-sage text-white shadow-2xs'
                  : 'text-muted-gray hover:text-charcoal'
              }`}
            >
              Today Only
            </button>
          </div>

          {/* Technician Filter for Manager/Reception */}
          {!isTechnician && techniciansList.length > 0 && (
            <select
              value={selectedTechFilter}
              onChange={(e) => setSelectedTechFilter(e.target.value)}
              className="h-8 px-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs font-semibold text-charcoal outline-none focus:border-sage"
            >
              <option value="ALL">All Staff Members</option>
              {techniciansList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialties?.join(', ') || 'Technician'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        <div className="w-full lg:w-72">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray" />
            <input
              type="text"
              placeholder="Search remarks, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 bg-soft-cream/40 border border-border rounded-[10px] text-xs text-charcoal focus:border-sage outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Photo Audits Grid / Empty State ── */}
      {filteredAudits.length === 0 ? (
        <div className="bg-white border border-border rounded-[18px] p-12 text-center space-y-3 shadow-card">
          <div className="w-14 h-14 rounded-full bg-soft-cream flex items-center justify-center mx-auto text-sage">
            <Camera size={26} />
          </div>
          <h3 className="font-bold text-sm text-charcoal">
            {baseAudits.length === 0 ? 'No Stock Photos Recorded Yet' : 'No Photos Match Current Filters'}
          </h3>
          <p className="text-xs text-muted-gray max-w-md mx-auto leading-relaxed">
            {baseAudits.length === 0
              ? isTechnician
                ? 'Before leaving at the end of the day, take a live picture of remaining stock with your written remarks.'
                : 'Technicians will submit end-of-day live photos of remaining products and written remarks here.'
              : 'Try selecting a different status, date, or clear your search query.'}
          </p>

          {isTechnician && (
            <Button
              variant="primary"
              onClick={() => setIsRecordModalOpen(true)}
              className="h-11 px-5 text-xs font-bold inline-flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white mt-2 cursor-pointer shadow-sm"
            >
              <Camera size={16} />
              <span>Take Live Stock Photo Now</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAudits.map((item) => {
            const itemDate = item.date
              ? new Date(item.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Today';

            const itemTime = item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedAudit(item)}
                className="bg-white border border-border rounded-[18px] overflow-hidden shadow-card hover:shadow-md transition-all cursor-pointer flex flex-col group"
              >
                {/* Photo Preview Container */}
                <div className="relative w-full aspect-16/10 bg-charcoal overflow-hidden flex items-center justify-center">
                  <img
                    src={item.photoUrl}
                    alt={item.productName || 'Stock Proof'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white font-medium flex items-center gap-1">
                    <Clock size={11} />
                    <span>{itemDate} • {itemTime}</span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    {item.status === 'REVIEWED' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Reviewed
                      </span>
                    )}
                    {item.status === 'FLAGGED' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-sm flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Flagged
                      </span>
                    )}
                    {item.status === 'PENDING' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white shadow-sm">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User size={13} className="text-sage shrink-0" />
                        <span className="font-bold text-xs text-charcoal truncate">
                          {item.technicianName || 'Technician'}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-gray shrink-0">
                        {itemDate}
                      </span>
                    </div>

                    {/* Remarks Text */}
                    {item.remarks ? (
                      <div className="mt-2.5 p-3 bg-soft-cream/60 rounded-xl border border-border/60 text-xs text-charcoal/90 font-medium italic line-clamp-3 leading-relaxed">
                        "{item.remarks}"
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-muted-gray italic">
                        No written remarks provided.
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-sage font-bold group-hover:underline flex items-center gap-1">
                      <span>{isTechnician ? 'View Photo & Follow-up' : 'Inspect Photo & Review'}</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Live Stock Photo Modal */}
      <RecordStockPhotoModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => {
          refreshDailyAudits();
          showToast('Live stock photo and remarks recorded!');
        }}
      />

      {/* Stock Photo Detail Modal */}
      <StockPhotoDetailModal
        isOpen={!!selectedAudit}
        audit={selectedAudit}
        onClose={() => setSelectedAudit(null)}
        onReviewed={() => {
          refreshDailyAudits();
          showToast('Stock audit review status updated!');
        }}
      />
    </div>
  );
}
