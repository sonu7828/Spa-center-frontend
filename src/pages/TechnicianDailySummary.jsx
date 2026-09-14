/**
 * TechnicianDailySummary — Screen 13
 *
 * Displays the daily activity and commission calculation for a technician.
 * Connected to backend Reports & Commissions APIs (Phase 20 & 22 Module 10).
 *
 * Content (per WIREFRAME.md Screen 13, FLOW.md §27-30):
 *   - Technician selector (Manager can switch tabs, Technician locked to own view)
 *   - Date: Today
 *   - Services Today (real backend servicesCompleted)
 *   - Service Productivity (real backend revenueGenerated)
 *   - Clients Introduced
 *   - Completed Referral Services
 *   - Base Salary: [Calculated]
 *   - Commission: (real backend commissionEarned)
 *   - Bonus: [Calculated]
 *   - Daily Total
 *
 * RBAC: Cleaner blocked (403). Technician locked to own name. Manager has full access.
 *
 * Source: WIREFRAME.md Screen 13, FLOW.md §28-29
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Award, ShieldAlert, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useOperations } from '../context/OperationsContext';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../context/ClientsContext';
import { useCommission } from '../context/CommissionContext';
import { reportsApi } from '../services/api';

export default function TechnicianDailySummary() {
  const navigate = useNavigate();
  const { user, allUsers } = useAuth();
  const { completedServices, techRevenue } = useOperations();
  const { clients } = useClients();
  const { getEmployeeCommissionSummary } = useCommission();

  const role = (user?.role || '').toLowerCase();
  const isTechnicianRole = role === 'technician';
  const isCleaner = role === 'cleaner';

  const dynamicTechnicians = allUsers.filter(
    (u) => u.role === 'technician' && u.active !== false
  );

  const initialName = isTechnicianRole
    ? user?.name || dynamicTechnicians[0]?.name || 'Amina'
    : dynamicTechnicians[0]?.name || 'Amina';
  const [selectedTechName, setSelectedTechName] = useState(initialName);

  // If technician, force their own name
  const effectiveName = isTechnicianRole
    ? user?.name || dynamicTechnicians[0]?.name || 'Amina'
    : selectedTechName;

  const currentTech =
    dynamicTechnicians.find((t) => t.name === effectiveName) ||
    dynamicTechnicians[0] || { id: 1, name: 'Technician', specialties: [] };

  // Live Backend Performance State
  const [techReport, setTechReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTechReport = useCallback(async () => {
    if (isCleaner) return;
    setLoading(true);
    try {
      if (isTechnicianRole) {
        const res = await reportsApi.getMyPerformance('today');
        setTechReport(res?.data || null);
      } else {
        // Manager can view all or specific technician
        const res = await reportsApi.getTechnicians('today');
        const list = res?.data?.technicians || [];
        const matched = list.find(
          (t) =>
            t.technicianName?.toLowerCase() === effectiveName?.toLowerCase() ||
            t.technicianId === currentTech.id
        );
        setTechReport(matched || null);
      }
    } catch (err) {
      console.warn('Technician summary report fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isCleaner, isTechnicianRole, effectiveName, currentTech.id]);

  useEffect(() => {
    fetchTechReport();
  }, [fetchTechReport]);

  // =========================================================================
  // RBAC GUARD: CLEANER BLOCKED
  // =========================================================================
  if (isCleaner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[16px] border border-border shadow-card my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied (403)</h2>
        <p className="text-sm text-muted-gray max-w-md mb-6">
          Technician daily summaries and commission reports are restricted to service staff and management.
        </p>
        <Button variant="primary" onClick={() => navigate('/cleaning')}>
          Go to Cleaning Records
        </Button>
      </div>
    );
  }

  // Fallback calculations from shared state
  const fallbackServicesToday = completedServices.filter(
    (s) => s.technician === currentTech.name
  ).length;
  const fallbackProductivity = techRevenue?.[currentTech.name] || 0;
  const commSummary = getEmployeeCommissionSummary(currentTech.name);

  // Real backend metrics prioritized
  const servicesToday = techReport?.servicesCompleted ?? fallbackServicesToday;
  const serviceProductivity = techReport?.revenueGenerated ?? fallbackProductivity;
  const commissionEarned = techReport?.commissionEarned ?? commSummary.commissionEarned;
  const averageTicket = techReport?.averageTicket ?? (servicesToday > 0 ? Math.round(serviceProductivity / servicesToday) : 0);

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div>
      <PageHeader
        title={isTechnicianRole ? 'My Daily Summary' : 'Technician Daily Summary'}
        subtitle="Individual daily performance and auto-calculation summary."
      />

      {/* Technician Selector Tabs — only visible to Manager */}
      {!isTechnicianRole && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1.5 scrollbar-none">
          {dynamicTechnicians.map((tech) => (
            <button
              key={tech.id}
              onClick={() => setSelectedTechName(tech.name)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-[12px] text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer flex items-center gap-2 border whitespace-nowrap shrink-0 ${
                selectedTechName === tech.name
                  ? 'bg-sage text-charcoal font-semibold border-sage shadow-sm'
                  : 'bg-white text-muted-gray border-border hover:bg-soft-cream hover:text-charcoal'
              }`}
            >
              <User size={15} />
              {tech.name} — {(tech.specialties || []).join(', ') || 'Technician'}
            </button>
          ))}
        </div>
      )}

      {/* Main Summary Card — Locked minimal structure */}
      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-6 shadow-card">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-5 border-b border-border mb-5 gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-charcoal">
              {currentTech.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-gray">
              {(currentTech.specialties || []).join(', ') || 'Technician'}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] sm:text-xs font-medium text-muted-gray uppercase tracking-wide">
              Date
            </span>
            <p className="text-xs sm:text-sm font-semibold text-charcoal">{today}</p>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Sparkles size={16} className="text-sage" />
              Services Performed Today
            </span>
            <span className="text-base font-bold text-charcoal">
              {servicesToday}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-charcoal font-medium flex items-center gap-2">
              <DollarSign size={16} className="text-sage" />
              Service Productivity (Performed)
            </span>
            <span className="text-sm font-bold text-charcoal">
              {serviceProductivity.toLocaleString('en-US')} FCFA
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-gray flex items-center gap-2">
              <TrendingUp size={16} className="text-sage" />
              Average Ticket per Service
            </span>
            <span className="text-sm font-semibold text-charcoal font-mono">
              {averageTicket.toLocaleString('en-US')} FCFA
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-gray">Clients Introduced</span>
            <span className="text-sm font-bold text-charcoal">
              {commSummary.clientsReferred}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-gray">Completed Referral Services</span>
            <span className="text-sm font-bold text-charcoal">
              {commSummary.completedServices}
            </span>
          </div>
        </div>

        {/* Divider & Calculations */}
        <div className="border-t border-border pt-5 mb-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-gray">Base Salary</span>
            <span className="text-muted-gray font-mono text-xs bg-soft-cream px-2 py-1 rounded-[6px] border border-border">
              [Calculated]
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-charcoal font-medium">Referral Commission</span>
            <span className="font-extrabold text-[#4F6748] bg-sage-soft border border-sage/20 px-2.5 py-1 rounded-[6px] text-xs">
              {commissionEarned.toLocaleString('en-US')} FCFA
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-gray">Bonus</span>
            <span className="text-muted-gray font-mono text-xs bg-soft-cream px-2 py-1 rounded-[6px] border border-border">
              [Calculated]
            </span>
          </div>
        </div>

        {/* Total Row */}
        <div className="bg-sage-soft border border-sage/20 rounded-[12px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-sage" />
            <span className="text-sm font-semibold text-charcoal">
              Daily Total
            </span>
          </div>
          <span className="font-mono text-xs text-charcoal bg-white/80 px-2.5 py-1 rounded-[6px] border border-sage/30">
            [Calculated]
          </span>
        </div>
      </div>
    </div>
  );
}
