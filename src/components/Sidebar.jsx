/**
 * Sidebar — Role-aware, logically grouped navigation sidebar
 *
 * Categorized Structure:
 *   - MAIN: Dashboard, Appointments, Clients
 *   - RETENTION: Loyalty, Referrals, Rebooking
 *   - MANAGEMENT: Stock, Tech Summary, Cleaning, Staff, Daily Close
 *
 * Includes role-based filtering and fixed bottom logout action.
 *
 * Source: DESIGN-SYSTEM.md §10, §28
 */

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  UserRoundPlus,
  RefreshCw,
  FileCheck,
  ClipboardList,
  LogOut,
  UserCog,
  Camera,
  ClipboardCheck,
  Award,
  Sparkles,
  Share2,
  MessageCircle,
  Star,
  FileText,
  ShoppingBag,
  Receipt,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navSections = [
  {
    title: 'MAIN',
    items: [
      { to: '/',             label: 'Dashboard',    icon: LayoutDashboard, roles: ['manager', 'technician'] },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays,    roles: ['manager', 'reception', 'technician'] },
      { to: '/clients',      label: 'Clients',      icon: Users,           roles: ['manager', 'reception'] },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/invoices',         label: 'Invoices',        icon: FileText,       roles: ['manager', 'reception'] },
      { to: '/expenses',         label: 'Expenses',        icon: Receipt,        roles: ['manager', 'reception'] },
      { to: '/shared-work',      label: 'Shared Work',     icon: Users,          roles: ['manager', 'technician'] },
      { to: '/services',         label: 'Services',        icon: Sparkles,       roles: ['manager'] },
      { to: '/stock',            label: 'Service Stock',   icon: Package,        roles: ['manager'] },
      { to: '/products',         label: 'Retail Products', icon: ShoppingBag,    roles: ['manager'] },
      { to: '/technicians/daily', label: 'Tech Summary',    icon: ClipboardList,  roles: ['manager', 'technician'] },
      { to: '/cleaning-records', label: 'Cleaning',        icon: ClipboardCheck, roles: ['manager'] },
      { to: '/cleaning',         label: 'Cleaning',        icon: Camera,         roles: ['cleaner'] },
      { to: '/staff',            label: 'Staff',           icon: UserCog,        roles: ['manager'] },
      { to: '/daily-close',      label: 'Daily Close',     icon: FileCheck,      roles: ['manager'] },
      { to: '/attendance/manager', label: 'Attendance',    icon: Clock,          roles: ['manager'] },
      { to: '/attendance',       label: 'My Attendance',   icon: Clock,          roles: ['technician', 'reception'] },
    ],
  },
  {
    title: 'CLIENT GROWTH',
    items: [
      { to: '/social-media',          label: 'Social Media', icon: Share2,        roles: ['manager'] },
      { to: '/loyalty-settings',      label: 'Loyalty',      icon: Award,         roles: ['manager'] },
      { to: '/referrals',             label: 'Referrals',    icon: UserRoundPlus, roles: ['manager', 'reception'] },
      { to: '/rebooking',             label: 'Rebooking',    icon: RefreshCw,     roles: ['manager', 'reception'] },
      { to: '/whatsapp-automations',  label: 'WhatsApp',     icon: MessageCircle, roles: ['manager', 'reception'] },
      { to: '/client-feedback',        label: 'Feedback',     icon: Star,          roles: ['manager'] },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'manager';

  // Filter sections and their items based on user role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = () => {
    onClose?.();
    logout();
    navigate('/login', { replace: true });
  };

  const showSectionTitles = role === 'manager';

  return (
    <>
      {/* Mobile/tablet portrait overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-charcoal/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-[100dvh] max-h-[100dvh] w-[230px]
          bg-soft-cream border-r border-border
          flex flex-col justify-between
          transition-transform duration-200
          lg:translate-x-0 lg:sticky lg:top-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Compact Brand & User Profile Header */}
          <div className="px-4 pt-3.5 pb-2.5 shrink-0 border-b border-border/60">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-bold text-charcoal tracking-tight leading-none">
                  OMEGA SPA
                </h2>
                <p className="text-[9px] font-medium text-muted-gray tracking-wider uppercase mt-0.5">
                  Douala
                </p>
              </div>
              {user && (
                <div className="shrink-0 text-right">
                  <span className="inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-[#DCE7D7] text-[#4F6748] border border-[#4F6748]/20 capitalize leading-tight">
                    {user.name}
                    {user.specialties?.length > 0 ? ` · ${user.specialties.join(', ')}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation with Categories */}
          <nav className="flex-1 px-2.5 mt-1 overflow-y-auto overscroll-contain pb-2">
            <div className="space-y-3">
              {visibleSections.map((section, idx) => (
                <div key={section.title || idx}>
                  {showSectionTitles && (
                    <p className="text-[10px] font-bold text-muted-gray/70 tracking-wider uppercase px-2.5 pb-1">
                      {section.title}
                    </p>
                  )}
                  <ul className="space-y-0.5 sm:space-y-1">
                    {section.items.map(({ to, label, icon: Icon }) => (
                      <li key={to}>
                        <NavLink
                          to={to}
                          end={to === '/'}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-2.5 h-[38px] sm:h-[40px] rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-[#DCE7D7] text-[#4F6748] font-semibold border-l-[3px] border-[#4F6748] pl-2'
                                : 'text-muted-gray hover:bg-sage-soft/40 hover:text-charcoal'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                size={17}
                                strokeWidth={isActive ? 2.2 : 1.8}
                                className={isActive ? 'text-[#4F6748]' : ''}
                              />
                              <span>{label}</span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* Footer with Logout — STRICTLY PINNED at screen bottom */}
        <div className="px-3 pb-3 sm:pb-4 pt-2 border-t border-border mt-auto shrink-0 bg-soft-cream z-10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 h-[40px] w-full rounded-[10px] text-xs sm:text-sm font-semibold text-[#B34040] bg-[#FAECEC]/80 hover:bg-[#F7DADA] border border-[#ECCACA] hover:border-[#DFABAB] transition-all duration-150 cursor-pointer shadow-2xs"
          >
            <LogOut size={16} strokeWidth={2} className="text-[#B34040]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
