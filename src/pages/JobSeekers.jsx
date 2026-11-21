/**
 * JobSeekers — Simple, Fast & Clean Candidate Intake Module
 *
 * Designed for Receptionist & Manager to:
 *   - Quickly record people who come to apply for jobs
 *   - Search and view applicants in a clean, simple table
 *   - Update candidate status (Applied, Interview, Hired, Rejected)
 *   - Delete or remove records
 */

import { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import {
  useJobSeekers,
  JOB_SEEKER_POSITIONS,
  JOB_SEEKER_STATUSES,
} from '../context/JobSeekersContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  UserPlus,
  Trash2,
  X,
  Users,
  ShieldAlert,
} from 'lucide-react';

function formatDisplayDate(raw) {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw).slice(0, 10);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(raw).slice(0, 10) || '—';
  }
}

export default function JobSeekers() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const hasAccess = isManager || isReception;

  const {
    candidates,
    addJobSeeker,
    updateCandidateStatus,
    deleteJobSeeker,
  } = useJobSeekers();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState('ALL');

  // Add Candidate Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    positionApplied: 'Massage Therapist',
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RBAC Access Guard
  if (!hasAccess) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[16px] border border-border shadow-card my-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-charcoal mb-1">Access Restricted</h2>
        <p className="text-xs text-muted-gray max-w-sm">
          Job seekers recruitment data is accessible only to Manager and Reception staff.
        </p>
      </div>
    );
  }

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
        return false;
      }
      if (selectedPosition !== 'ALL' && c.positionApplied !== selectedPosition) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.fullName || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchPos = (c.positionApplied || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchPos) {
          return false;
        }
      }
      return true;
    });
  }, [candidates, selectedStatus, selectedPosition, searchQuery]);

  // Submit new candidate
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim()) {
      setFormError('Candidate name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addJobSeeker({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        positionApplied: formData.positionApplied,
        notes: formData.notes.trim() || undefined,
        status: 'NEW',
      });

      setFormData({
        fullName: '',
        phone: '',
        positionApplied: 'Massage Therapist',
        notes: '',
      });
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save candidate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'INTERVIEW_SCHEDULED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HIRED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <PageHeader
        title="Job Seekers"
        subtitle={`Record of people applying for jobs at Omega Spa (${candidates.length} total)`}
        action={
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 h-10 px-4 text-xs sm:text-sm font-semibold shadow-xs"
          >
            <UserPlus size={15} />
            <span>+ Add Job Seeker</span>
          </Button>
        }
      />

      {/* Simple Search & Filters Bar */}
      <div className="bg-white border border-border rounded-[14px] p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone or role..."
            className="w-full pl-9 pr-3 h-[38px] bg-soft-cream/40 border border-border rounded-[9px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-[38px] px-3 bg-white border border-border rounded-[9px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage cursor-pointer"
          >
            {JOB_SEEKER_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Position Filter Dropdown */}
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="h-[38px] px-3 bg-white border border-border rounded-[9px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            {JOB_SEEKER_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clean Table View */}
      <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-2xs">
        {filteredCandidates.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-soft-cream border border-border text-sage flex items-center justify-center mx-auto">
              <Users size={18} />
            </div>
            <p className="text-sm font-semibold text-charcoal">No candidates found</p>
            <p className="text-xs text-muted-gray">
              {searchQuery || selectedStatus !== 'ALL' || selectedPosition !== 'ALL'
                ? 'Try clearing your search or status filter.'
                : 'Click "+ Add Job Seeker" to record a new applicant.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-soft-cream/40 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-soft-cream/30 transition-colors">
                    {/* Candidate Name */}
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-sage-soft text-[#4F6748] flex items-center justify-center font-bold text-xs shrink-0 border border-sage/20">
                          {(candidate.fullName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[180px]">{candidate.fullName}</span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-charcoal font-mono whitespace-nowrap">
                      {candidate.phone}
                    </td>

                    {/* Position */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-[7px] bg-sage-soft text-[#4F6748] border border-sage/20 text-xs font-medium">
                        {candidate.positionApplied}
                      </span>
                    </td>

                    {/* Date Applied */}
                    <td className="py-3 px-4 text-muted-gray whitespace-nowrap">
                      {formatDisplayDate(candidate.appliedDate || candidate.createdAt)}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-muted-gray max-w-[240px] truncate" title={candidate.notes}>
                      {candidate.notes || '—'}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        value={candidate.status}
                        onChange={(e) => updateCandidateStatus(candidate.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-[8px] border outline-none cursor-pointer transition-all ${getStatusBadgeClass(
                          candidate.status
                        )}`}
                      >
                        <option value="NEW">Applied</option>
                        <option value="INTERVIEW_SCHEDULED">Interview</option>
                        <option value="HIRED">Hired</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </td>

                    {/* Action (Delete) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setCandidateToDelete(candidate)}
                        className="p-1 text-muted-gray hover:text-rose-600 transition cursor-pointer"
                        title="Delete candidate"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SIMPLE 4-FIELD ADD MODAL                                              */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-[16px] max-w-md w-full shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-soft-cream/30">
              <h3 className="text-sm font-bold text-charcoal">Add Job Seeker</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Simple Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-[8px] bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marie Claire"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-border rounded-[9px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 677 12 34 56"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-border rounded-[9px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage font-mono"
                />
              </div>

              {/* Position Applied For */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Position Applied For
                </label>
                <select
                  value={formData.positionApplied}
                  onChange={(e) => setFormData({ ...formData, positionApplied: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-border rounded-[9px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage cursor-pointer"
                >
                  {JOB_SEEKER_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Notes <span className="text-muted-gray font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 2 years experience in nails, available next week..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-white border border-border rounded-[9px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="px-4 font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Candidate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION POPUP MODAL                                       */}
      {/* ===================================================================== */}
      {candidateToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCandidateToDelete(null)}
        >
          <div
            className="bg-white rounded-[18px] max-w-sm w-full p-5 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Trash icon */}
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-charcoal">Delete Candidate?</h3>
              <p className="text-xs text-muted-gray leading-relaxed">
                Are you sure you want to remove <strong className="text-charcoal font-semibold">{candidateToDelete.fullName}</strong> from job seekers? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCandidateToDelete(null)}
                className="flex-1 h-9.5 text-xs font-semibold"
              >
                Cancel
              </Button>
              <button
                onClick={() => {
                  deleteJobSeeker(candidateToDelete.id);
                  setCandidateToDelete(null);
                }}
                className="flex-1 h-9.5 px-3 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
