/**
 * AppShell — Main application layout
 *
 * Left sidebar (230px) + main content area.
 * Sidebar bg: Soft Cream (#F6F1EB)
 * Main bg: Warm Ivory (#FBF7F2) — set on body
 * Responsive: sidebar collapses on tablet portrait
 *
 * Source: DESIGN-SYSTEM.md §9, §30
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {/* Mobile/tablet portrait header with menu toggle — Fixed at top */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 border-b border-border bg-soft-cream">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-[10px] text-charcoal hover:bg-sage-soft transition-colors duration-150 cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
          <span className="ml-3 text-sm font-semibold text-charcoal">
            OMEGA SPA
          </span>
        </div>

        {/* Page content */}
        <div className="p-3.5 sm:p-6 w-full">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
