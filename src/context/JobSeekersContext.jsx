/**
 * JobSeekersContext — Candidate Walk-in & Recruitment Management State
 *
 * Connected to OMEGA SPA POS Backend (/api/v1/job-seekers):
 *   - Accessible strictly to MANAGER and RECEPTION
 *   - Fast logging of walk-in applicants (under 30s)
 *   - Real-time status pipeline: NEW, INTERVIEW_SCHEDULED, SHORTLISTED, HIRED, REJECTED
 *   - Resilient offline/cache fallback support for continuous testing
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { jobSeekersApi } from '../services/api';
import { useAuth } from './AuthContext';

const JobSeekersContext = createContext(null);

export const JOB_SEEKER_POSITIONS = [
  'Massage Therapist',
  'Esthetician (Facials & Skin)',
  'Nail Technician',
  'Hair Stylist & Braider',
  'Spa Receptionist',
  'Spa Cleaner',
  'Sales & Marketing Representative',
  'Spa Operations Assistant',
  'Other Position',
];

export const JOB_SEEKER_STATUSES = [
  { value: 'ALL', label: 'All Candidates' },
  { value: 'NEW', label: 'New Walk-In', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'SHORTLISTED', label: 'Shortlisted', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'HIRED', label: 'Hired', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'REJECTED', label: 'Archived / Rejected', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const INITIAL_DEMO_CANDIDATES = [
  {
    id: 'demo-cand-1',
    fullName: 'Clarisse Mballa',
    phone: '+237677890123',
    whatsapp: '+237677890123',
    email: 'clarisse.m@gmail.com',
    positionApplied: 'Massage Therapist',
    experienceYears: 4,
    specialties: 'Deep Tissue, Swedish Massage, Hot Stone, Body Scrub',
    expectedSalary: 120000,
    notes: 'Certified by Douala Spa Academy. Excellent presentation and communication. Available immediately.',
    status: 'INTERVIEW_SCHEDULED',
    appliedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    interviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdByName: 'Reception',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-cand-2',
    fullName: 'Nathalie Ngo',
    phone: '+237699456789',
    whatsapp: '+237699456789',
    email: '',
    positionApplied: 'Nail Technician',
    experienceYears: 2,
    specialties: 'Gel Polish, Acrylic Extensions, Nail Art, Pedicure',
    expectedSalary: 90000,
    notes: 'Brought physical portfolio of nail art designs. Very fast and clean work shown.',
    status: 'NEW',
    appliedDate: new Date().toISOString().split('T')[0],
    interviewDate: null,
    createdByName: 'Manager',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-cand-3',
    fullName: 'Jeanne Eyenga',
    phone: '+237655112233',
    whatsapp: '+237655112233',
    email: 'j.eyenga@yahoo.fr',
    positionApplied: 'Spa Receptionist',
    experienceYears: 3,
    specialties: 'Bilingual English/French, Customer Service, Cash Handling',
    expectedSalary: 100000,
    notes: 'Worked 2 years in hotel front desk in Akwa. Strong computer skills.',
    status: 'SHORTLISTED',
    appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    interviewDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdByName: 'Manager',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function JobSeekersProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const hasAccess = role === 'manager' || role === 'reception';

  const [candidates, setCandidates] = useState(() => {
    try {
      const cached = localStorage.getItem('omega_job_seekers_cache');
      return cached ? JSON.parse(cached) : INITIAL_DEMO_CANDIDATES;
    } catch (e) {
      return INITIAL_DEMO_CANDIDATES;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('omega_job_seekers_cache', JSON.stringify(candidates));
    } catch (e) {}
  }, [candidates]);

  // Fetch candidates from API
  const refreshJobSeekers = useCallback(
    async (params = {}) => {
      if (!isAuthenticated || !hasAccess) return;
      try {
        setLoading(true);
        setError(null);
        const res = await jobSeekersApi.getAll(params);
        if (res?.data?.candidates && Array.isArray(res.data.candidates)) {
          setCandidates(res.data.candidates);
        }
      } catch (err) {
        console.warn('[JobSeekers] Backend fetch notice (using cache):', err.message);
        // Do not overwrite local cache if offline
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, hasAccess]
  );

  useEffect(() => {
    if (isAuthenticated && hasAccess) {
      refreshJobSeekers();
    }
  }, [isAuthenticated, hasAccess, refreshJobSeekers]);

  // Add Candidate
  const addJobSeeker = async (data) => {
    const tempId = `cand-local-${Date.now()}`;
    const newRecord = {
      id: tempId,
      fullName: data.fullName,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      email: data.email || null,
      positionApplied: data.positionApplied,
      experienceYears: Number(data.experienceYears) || 0,
      specialties: data.specialties || null,
      expectedSalary: data.expectedSalary ? Number(data.expectedSalary) : null,
      notes: data.notes || null,
      status: data.status || 'NEW',
      appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
      interviewDate: data.interviewDate || null,
      createdByName: user?.name || user?.email || 'Reception',
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setCandidates((prev) => [newRecord, ...prev]);

    try {
      const res = await jobSeekersApi.create(data);
      if (res?.data) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === tempId ? { ...res.data, createdByName: res.data.createdByName || newRecord.createdByName } : c))
        );
        return res.data;
      }
    } catch (err) {
      console.warn('[JobSeekers] Candidate saved locally (API notice):', err.message);
    }
    return newRecord;
  };

  // Update Candidate
  const updateJobSeeker = async (id, patchData) => {
    // Optimistic UI update
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patchData, updatedAt: new Date().toISOString() } : c))
    );

    try {
      const res = await jobSeekersApi.update(id, patchData);
      if (res?.data) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...res.data } : c))
        );
        return res.data;
      }
    } catch (err) {
      console.warn('[JobSeekers] Update saved locally (API notice):', err.message);
    }
    return patchData;
  };

  // Quick Status update helper
  const updateCandidateStatus = async (id, status, interviewDate = null) => {
    const patch = { status };
    if (interviewDate !== null) {
      patch.interviewDate = interviewDate;
    }
    return updateJobSeeker(id, patch);
  };

  // Delete Candidate
  const deleteJobSeeker = async (id) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    try {
      await jobSeekersApi.delete(id);
    } catch (err) {
      console.warn('[JobSeekers] Delete processed locally:', err.message);
    }
    return true;
  };

  // Summary Metrics calculation
  const summary = useMemo(() => {
    const total = candidates.length;
    const newCount = candidates.filter((c) => c.status === 'NEW').length;
    const interviewCount = candidates.filter((c) => c.status === 'INTERVIEW_SCHEDULED').length;
    const shortlistedCount = candidates.filter((c) => c.status === 'SHORTLISTED').length;
    const hiredCount = candidates.filter((c) => c.status === 'HIRED').length;
    const rejectedCount = candidates.filter((c) => c.status === 'REJECTED').length;

    return {
      total,
      new: newCount,
      interviewScheduled: interviewCount,
      shortlisted: shortlistedCount,
      hired: hiredCount,
      rejected: rejectedCount,
    };
  }, [candidates]);

  return (
    <JobSeekersContext.Provider
      value={{
        candidates,
        summary,
        loading,
        error,
        refreshJobSeekers,
        addJobSeeker,
        updateJobSeeker,
        updateCandidateStatus,
        deleteJobSeeker,
        hasAccess,
      }}
    >
      {children}
    </JobSeekersContext.Provider>
  );
}

export function useJobSeekers() {
  const context = useContext(JobSeekersContext);
  if (!context) {
    throw new Error('useJobSeekers must be used within a JobSeekersProvider');
  }
  return context;
}
