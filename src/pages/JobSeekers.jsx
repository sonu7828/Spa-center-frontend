/**
 * JobSeekers — Front-desk Candidate Walk-in & Recruitment Management Page
 *
 * Dedicated tab for Receptionist & Manager to:
 *   - Quickly log walk-in job seekers in under 30 seconds
 *   - Filter candidates by status (NEW, INTERVIEW_SCHEDULED, SHORTLISTED, HIRED, REJECTED)
 *   - Direct 1-click WhatsApp message & phone call triggers
 *   - Schedule interviews and record interview impressions
 *   - 100% role-protected (Manager & Reception only)
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
  Briefcase,
  UserPlus,
  Phone,
  MessageCircle,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  DollarSign,
  AlertCircle,
  Award,
  Users,
  ShieldAlert,
} from 'lucide-react';

export default function JobSeekers() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isManager = role === 'manager';
  const isReception = role === 'reception';
  const hasAccess = isManager || isReception;

  const {
    candidates,
    summary,
    loading,
    addJobSeeker,
    updateJobSeeker,
    updateCandidateStatus,
    deleteJobSeeker,
  } = useJobSeekers();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [schedulingCandidate, setSchedulingCandidate] = useState(null);
  const [interviewDateInput, setInterviewDateInput] = useState('');

  // Form state for new candidate
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    whatsapp: '',
    email: '',
    positionApplied: 'Massage Therapist',
    customPosition: '',
    experienceYears: 1,
    specialties: '',
    expectedSalary: '',
    notes: '',
    status: 'NEW',
    interviewDate: '',
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RBAC Access Guard
  if (!hasAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[16px] border border-border shadow-card my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-charcoal mb-2">Access Restricted (403)</h2>
        <p className="text-sm text-muted-gray max-w-md">
          Job seeker recruitment intake and applicant records are strictly confidential and accessible only to Manager and Reception staff.
        </p>
      </div>
    );
  }

  // Filter candidates list
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Status filter
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
        return false;
      }

      // Position filter
      if (selectedPosition !== 'ALL' && !c.positionApplied.toLowerCase().includes(selectedPosition.toLowerCase())) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.fullName || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchPos = (c.positionApplied || '').toLowerCase().includes(q);
        const matchSkills = (c.specialties || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchPos && !matchSkills) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, selectedStatus, selectedPosition, searchQuery]);

  // Clean phone number for WhatsApp link
  const getCleanPhone = (phoneStr) => {
    return String(phoneStr || '').replace(/\D/g, '');
  };

  const handleOpenWhatsApp = (candidate) => {
    const raw = candidate.whatsapp || candidate.phone;
    let clean = getCleanPhone(raw);
    if (!clean.startsWith('237') && clean.length === 9) {
      clean = '237' + clean;
    }
    const message = encodeURIComponent(
      `Hello ${candidate.fullName}, thank you for applying at OMEGA SPA Douala for the ${candidate.positionApplied} position. We would like to schedule an interview with you.`
    );
    window.open(`https://wa.me/${clean}?text=${message}`, '_blank');
  };

  // Submit new candidate
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim()) {
      setFormError('Please enter candidate full name.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Please enter a valid phone number.');
      return;
    }

    const effectivePosition =
      formData.positionApplied === 'Other Position' && formData.customPosition.trim()
        ? formData.customPosition.trim()
        : formData.positionApplied;

    try {
      setIsSubmitting(true);
      await addJobSeeker({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
        email: formData.email.trim() || undefined,
        positionApplied: effectivePosition,
        experienceYears: Number(formData.experienceYears) || 0,
        specialties: formData.specialties.trim() || undefined,
        expectedSalary: formData.expectedSalary ? Number(formData.expectedSalary) : undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status || 'NEW',
        interviewDate: formData.interviewDate || undefined,
      });

      // Reset form & close
      setFormData({
        fullName: '',
        phone: '',
        whatsapp: '',
        email: '',
        positionApplied: 'Massage Therapist',
        customPosition: '',
        experienceYears: 1,
        specialties: '',
        expectedSalary: '',
        notes: '',
        status: 'NEW',
        interviewDate: '',
      });
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule Interview confirmation
  const handleScheduleInterviewSubmit = async () => {
    if (!schedulingCandidate || !interviewDateInput) return;
    await updateCandidateStatus(schedulingCandidate.id, 'INTERVIEW_SCHEDULED', interviewDateInput);
    setSchedulingCandidate(null);
    setInterviewDateInput('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Job Seekers"
        subtitle="Walk-in applicants, candidate intake pipeline, and interview management"
        action={
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 h-10 px-4 text-xs sm:text-sm font-semibold shadow-sm"
          >
            <UserPlus size={16} />
            <span>+ Add Job Seeker</span>
          </Button>
        }
      />

      {/* Top Pipeline Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setSelectedStatus('ALL')}
          className={`p-3.5 rounded-[14px] border cursor-pointer transition-all ${
            selectedStatus === 'ALL'
              ? 'bg-charcoal text-white border-charcoal shadow-sm'
              : 'bg-white border-border text-charcoal hover:border-charcoal/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
              Total Pool
            </span>
            <Users size={15} />
          </div>
          <span className="text-2xl font-black">{summary.total}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('NEW')}
          className={`p-3.5 rounded-[14px] border cursor-pointer transition-all ${
            selectedStatus === 'NEW'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white border-border text-blue-900 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              New Walk-In
            </span>
            <Sparkles size={15} className="text-blue-500" />
          </div>
          <span className="text-2xl font-black text-blue-900">{summary.new}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('INTERVIEW_SCHEDULED')}
          className={`p-3.5 rounded-[14px] border cursor-pointer transition-all ${
            selectedStatus === 'INTERVIEW_SCHEDULED'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white border-border text-amber-900 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Interview Set
            </span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-900">{summary.interviewScheduled}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('SHORTLISTED')}
          className={`p-3.5 rounded-[14px] border cursor-pointer transition-all ${
            selectedStatus === 'SHORTLISTED'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white border-border text-purple-900 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">
              Shortlisted
            </span>
            <Award size={15} className="text-purple-500" />
          </div>
          <span className="text-2xl font-black text-purple-900">{summary.shortlisted}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('HIRED')}
          className={`p-3.5 rounded-[14px] border cursor-pointer transition-all ${
            selectedStatus === 'HIRED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white border-border text-emerald-900 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Hired
            </span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-900">{summary.hired}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('REJECTED')}
          className={`p-3.5 rounded-[14px] border cursor-pointer transition-all ${
            selectedStatus === 'REJECTED'
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
              : 'bg-white border-border text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Archived
            </span>
            <AlertCircle size={15} className="text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-800">{summary.rejected}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-border rounded-[16px] p-3.5 sm:p-4 shadow-card space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name, phone number, or specialties..."
              className="w-full pl-9 pr-3 h-[42px] bg-soft-cream/40 border border-border rounded-[10px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Position Selector */}
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-muted-gray shrink-0 hidden sm:block" />
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="h-[42px] px-3 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage cursor-pointer"
            >
              <option value="ALL">All Positions</option>
              {JOB_SEEKER_POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {JOB_SEEKER_STATUSES.map((st) => {
            const isActive = selectedStatus === st.value;
            return (
              <button
                key={st.value}
                onClick={() => setSelectedStatus(st.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-charcoal text-white shadow-2xs'
                    : 'bg-soft-cream/60 hover:bg-soft-cream text-charcoal border border-border/80'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Candidates List View */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-white border border-border rounded-[16px] p-8 sm:p-12 text-center shadow-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-soft-cream border border-border text-sage flex items-center justify-center mx-auto">
            <Briefcase size={22} />
          </div>
          <h3 className="text-base font-bold text-charcoal">No Job Seekers Found</h3>
          <p className="text-xs sm:text-sm text-muted-gray max-w-md mx-auto">
            {searchQuery || selectedStatus !== 'ALL' || selectedPosition !== 'ALL'
              ? 'No applicants match your current search or filter criteria. Try resetting filters.'
              : 'No walk-in job seekers have been recorded yet. Click below to add the first applicant.'}
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setSelectedPosition('ALL');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              <span>+ Log Walk-In Candidate</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((candidate) => {
            const statusConfig =
              JOB_SEEKER_STATUSES.find((s) => s.value === candidate.status) || JOB_SEEKER_STATUSES[1];

            return (
              <div
                key={candidate.id}
                className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-charcoal truncate">
                        {candidate.fullName}
                      </h4>
                      <p className="text-[11px] text-muted-gray flex items-center gap-1.5 mt-0.5">
                        <Calendar size={12} className="text-muted-gray" />
                        <span>Applied on {candidate.appliedDate || candidate.createdAt?.split('T')[0]}</span>
                        <span className="opacity-50">•</span>
                        <span>Logged by {candidate.createdByName || 'Staff'}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Position Applied Badge */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-[8px] bg-sage-soft text-[#4F6748] border border-sage/20 text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles size={12} />
                      {candidate.positionApplied}
                    </span>
                    {candidate.experienceYears > 0 && (
                      <span className="text-[11px] text-muted-gray font-medium">
                        {candidate.experienceYears} yr{candidate.experienceYears > 1 ? 's' : ''} exp
                      </span>
                    )}
                  </div>

                  {/* Specialties / Skills */}
                  {candidate.specialties && (
                    <div className="text-xs text-charcoal/90 bg-soft-cream/50 p-2 rounded-[8px] border border-border/50">
                      <span className="font-semibold text-muted-gray block text-[10px] uppercase tracking-wider mb-0.5">
                        Skills & Specialties:
                      </span>
                      <p className="line-clamp-2 leading-relaxed">{candidate.specialties}</p>
                    </div>
                  )}

                  {/* Expected Salary if provided */}
                  {candidate.expectedSalary > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-gray font-mono">
                      <DollarSign size={13} className="text-sage" />
                      <span>Expected: </span>
                      <strong className="text-charcoal font-semibold">
                        {Number(candidate.expectedSalary).toLocaleString()} FCFA
                      </strong>
                    </div>
                  )}

                  {/* Interview Date alert if scheduled */}
                  {candidate.interviewDate && candidate.status === 'INTERVIEW_SCHEDULED' && (
                    <div className="p-2.5 rounded-[10px] bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-600 shrink-0" />
                        <span>
                          Interview: <strong>{candidate.interviewDate}</strong>
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSchedulingCandidate(candidate);
                          setInterviewDateInput(candidate.interviewDate);
                        }}
                        className="text-[11px] text-amber-700 underline font-semibold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Notes Preview */}
                  {candidate.notes && (
                    <p className="text-xs text-muted-gray italic line-clamp-2 pt-1 border-t border-border/40">
                      "{candidate.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 mt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  {/* Direct Contact Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* WhatsApp */}
                    <button
                      onClick={() => handleOpenWhatsApp(candidate)}
                      className="h-8 px-2.5 rounded-[8px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open WhatsApp chat with candidate"
                    >
                      <MessageCircle size={14} className="text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Phone Call */}
                    <a
                      href={`tel:${candidate.phone}`}
                      className="h-8 px-2 rounded-[8px] bg-soft-cream hover:bg-border text-charcoal border border-border text-xs flex items-center justify-center transition-colors"
                      title={`Call ${candidate.phone}`}
                    >
                      <Phone size={13} />
                    </a>
                  </div>

                  {/* Status Quick Changer Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={candidate.status}
                      onChange={(e) => {
                        const newSt = e.target.value;
                        if (newSt === 'INTERVIEW_SCHEDULED') {
                          setSchedulingCandidate(candidate);
                          setInterviewDateInput(
                            candidate.interviewDate || new Date().toISOString().split('T')[0]
                          );
                        } else {
                          updateCandidateStatus(candidate.id, newSt);
                        }
                      }}
                      className="h-8 px-2 bg-soft-cream/40 border border-border rounded-[8px] text-xs font-semibold text-charcoal outline-none cursor-pointer hover:border-sage transition-colors"
                    >
                      <option value="NEW">New</option>
                      <option value="INTERVIEW_SCHEDULED">Interview</option>
                      <option value="SHORTLISTED">Shortlist</option>
                      <option value="HIRED">Hired</option>
                      <option value="REJECTED">Archived</option>
                    </select>

                    {/* Edit Notes Modal Button */}
                    <button
                      onClick={() => setEditingCandidate(candidate)}
                      className="p-1.5 rounded-[8px] text-muted-gray hover:text-charcoal hover:bg-soft-cream transition cursor-pointer"
                      title="Edit candidate notes"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Delete (Manager Only) */}
                    {isManager && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete candidate profile for ${candidate.fullName}?`)) {
                            deleteJobSeeker(candidate.id);
                          }
                        }}
                        className="p-1.5 rounded-[8px] text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete candidate"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADD JOB SEEKER MODAL (Fast 30-Second Walk-in Form)                   */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-[20px] max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-soft-cream/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sage-soft text-[#4F6748] flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-charcoal">Log Walk-In Job Seeker</h3>
                  <p className="text-xs text-muted-gray">Fast intake for front-desk applicants</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-border/60 text-muted-gray hover:text-charcoal transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
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
                  placeholder="e.g. Marie Claire Ambassa"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
                />
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +237 677..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    WhatsApp Number <span className="text-muted-gray font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Same as phone or WhatsApp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                  />
                </div>
              </div>

              {/* Position Applied For */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Position Applied For <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.positionApplied}
                  onChange={(e) => setFormData({ ...formData, positionApplied: e.target.value })}
                  className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage cursor-pointer"
                >
                  {JOB_SEEKER_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                {formData.positionApplied === 'Other Position' && (
                  <input
                    type="text"
                    placeholder="Specify role title..."
                    value={formData.customPosition}
                    onChange={(e) => setFormData({ ...formData, customPosition: e.target.value })}
                    className="w-full h-10 px-3 mt-2 bg-soft-cream/40 border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                  />
                )}
              </div>

              {/* Experience & Expected Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    placeholder="e.g. 2"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Expected Monthly Pay <span className="text-muted-gray font-normal">(FCFA)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    placeholder="e.g. 90000"
                    value={formData.expectedSalary}
                    onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                    className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage font-mono"
                  />
                </div>
              </div>

              {/* Specialties / Skills */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Specialties & Key Skills
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deep Tissue, Swedish, Gel Polish, Facial Cleansing"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                />
              </div>

              {/* Initial Impressions / Notes */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Reception / Manager Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="First impressions, availability, previous salon experience, demeanor..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage"
                />
              </div>

              {/* Initial Status & Optional Interview Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage cursor-pointer"
                  >
                    <option value="NEW">New Walk-In</option>
                    <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                  </select>
                </div>

                {formData.status === 'INTERVIEW_SCHEDULED' && (
                  <div>
                    <label className="block text-xs font-semibold text-charcoal mb-1">
                      Interview Date
                    </label>
                    <input
                      type="date"
                      value={formData.interviewDate}
                      onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
                      className="w-full h-11 px-3 bg-white border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
                    />
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
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
                  className="h-10 px-5 font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Job Seeker'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SCHEDULE INTERVIEW MODAL                                              */}
      {/* ===================================================================== */}
      {schedulingCandidate && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSchedulingCandidate(null)}
        >
          <div
            className="bg-white rounded-[18px] max-w-sm w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <h3 className="text-sm font-bold text-charcoal">Schedule Interview</h3>
              </div>
              <button
                onClick={() => setSchedulingCandidate(null)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-gray">
              Set interview date for{' '}
              <strong className="text-charcoal">{schedulingCandidate.fullName}</strong> (
              {schedulingCandidate.positionApplied}):
            </p>

            <input
              type="date"
              value={interviewDateInput}
              onChange={(e) => setInterviewDateInput(e.target.value)}
              className="w-full h-11 px-3 bg-soft-cream/40 border border-border rounded-[10px] text-sm text-charcoal outline-none focus:border-sage"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSchedulingCandidate(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!interviewDateInput}
                onClick={handleScheduleInterviewSubmit}
              >
                Save Interview Date
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* EDIT NOTES MODAL                                                      */}
      {/* ===================================================================== */}
      {editingCandidate && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingCandidate(null)}
        >
          <div
            className="bg-white rounded-[18px] max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-sage" />
                <h3 className="text-sm font-bold text-charcoal">
                  Notes: {editingCandidate.fullName}
                </h3>
              </div>
              <button
                onClick={() => setEditingCandidate(null)}
                className="text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Interview / Reception Notes
              </label>
              <textarea
                rows={4}
                value={editingCandidate.notes || ''}
                onChange={(e) =>
                  setEditingCandidate({ ...editingCandidate, notes: e.target.value })
                }
                placeholder="Enter evaluation, test results, or candidate details..."
                className="w-full p-3 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal outline-none focus:border-sage"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingCandidate(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  await updateJobSeeker(editingCandidate.id, { notes: editingCandidate.notes });
                  setEditingCandidate(null);
                }}
              >
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
