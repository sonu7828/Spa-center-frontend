/**
 * App — Root application component with routing & role-based access
 *
 * Routes:
 *   /login                     → Login Page
 *   /                          → Dashboard (Manager only)
 *   /clients                   → Clients List
 *   /clients/new               → Add Client
 *   /clients/:id               → Client File
 *   /appointments              → Appointment Calendar
 *   /appointments/new          → Create Appointment
 *   /appointments/:id          → Appointment Detail
 *   /appointments/:id/late     → Late Client / Reschedule
 *   /appointments/:id/no-show  → No-Show Flow
 *   /appointments/:id/close    → Close Service
 *   /stock                     → Stock Module (Manager only)
 *   /technicians/daily         → Technician Daily Summary
 *   /referrals                 → Referrals Module
 *   /rebooking                 → Rebooking Module
 *   /daily-close               → Daily Close (Manager only)
 *   /staff                     → Staff Management (Manager only)
 *   /cleaning                  → Cleaning Upload (Cleaner only)
 *   /cleaning-records          → Cleaning Records (Manager only)
 *
 * Source: UI-IMPLEMENTATION-RULES.md §Navigation, FLOW.md §51
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, isRouteAllowed, ROLE_HOME } from './context/AuthContext';
import { ClientsProvider } from './context/ClientsContext';
import { AppointmentsProvider } from './context/AppointmentsContext';
import { OperationsProvider } from './context/OperationsContext';
import { CleaningProvider } from './context/CleaningContext';
import { LoyaltyProvider } from './context/LoyaltyContext';
import { ServicesProvider } from './context/ServicesContext';
import { SocialProvider } from './context/SocialContext';
import { WhatsAppProvider } from './context/WhatsAppContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { InvoiceProvider } from './context/InvoiceContext';
import { RetailProvider } from './context/RetailContext';
import { ExpensesProvider } from './context/ExpensesContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { CommissionProvider } from './context/CommissionContext';
import { ReportsProvider } from './context/ReportsContext';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import AddClient from './pages/AddClient';
import ClientFile from './pages/ClientFile';
import AppointmentCalendar from './pages/AppointmentCalendar';
import CreateAppointment from './pages/CreateAppointment';
import AppointmentDetail from './pages/AppointmentDetail';
import LateClient from './pages/LateClient';
import NoShowFlow from './pages/NoShowFlow';
import CloseService from './pages/CloseService';
import Stock from './pages/Stock';
import TechnicianDailySummary from './pages/TechnicianDailySummary';
import Referrals from './pages/Referrals';
import Rebooking from './pages/Rebooking';
import DailyClose from './pages/DailyClose';
import Staff from './pages/Staff';
import Services from './pages/Services';
import CleaningUpload from './pages/CleaningUpload';
import CleaningRecords from './pages/CleaningRecords';
import LoyaltySettings from './pages/LoyaltySettings';
import SocialMedia from './pages/SocialMedia';
import WhatsAppAutomations from './pages/WhatsAppAutomations';
import FeedbackPage from './pages/FeedbackPage';
import ClientFeedback from './pages/ClientFeedback';
import PendingInvoices from './pages/PendingInvoices';
import RetailProducts from './pages/RetailProducts';
import SharedWork from './pages/SharedWork';
import Expenses from './pages/Expenses';
import Attendance from './pages/Attendance';
import AttendanceManager from './pages/AttendanceManager';

/**
 * ProtectedRoute — Redirects to /login if not authenticated,
 * or to role home if the current route is not allowed for the user's role.
 */
function ProtectedRoute({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isRouteAllowed(user.role, location.pathname)) {
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }

  return children;
}

/**
 * LoginGuard — Redirects authenticated users away from /login
 */
function LoginGuard({ children }) {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ClientsProvider>
        <AppointmentsProvider>
          <OperationsProvider>
            <CleaningProvider>
              <ServicesProvider>
                <LoyaltyProvider>
                  <SocialProvider>
                    <WhatsAppProvider>
                    <FeedbackProvider>
                    <InvoiceProvider>
                    <RetailProvider>
                    <ExpensesProvider>
                    <AttendanceProvider>
                    <CommissionProvider>
                    <ReportsProvider>
                    <BrowserRouter>
                      <ErrorBoundary>
                        <Routes>
                          {/* Public: Login */}
                          <Route
                            path="/login"
                            element={
                              <LoginGuard>
                                <Login />
                              </LoginGuard>
                            }
                          />

                          {/* Public: Feedback page (no login required) */}
                          <Route path="/feedback" element={<FeedbackPage />} />

                          {/* Protected: App Shell + all routes */}
                          <Route
                            element={
                              <ProtectedRoute>
                                <AppShell />
                              </ProtectedRoute>
                            }
                          >
                            <Route index element={<Dashboard />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="clients" element={<ClientsList />} />
                            <Route path="clients/new" element={<AddClient />} />
                            <Route path="clients/:id" element={<ClientFile />} />
                            <Route path="appointments" element={<AppointmentCalendar />} />
                            <Route path="appointments/new" element={<CreateAppointment />} />
                            <Route path="appointments/:id" element={<AppointmentDetail />} />
                            <Route path="appointments/:id/late" element={<LateClient />} />
                            <Route path="appointments/:id/no-show" element={<NoShowFlow />} />
                            <Route path="appointments/:id/close" element={<CloseService />} />
                            <Route path="stock" element={<Stock />} />
                            <Route path="technicians/daily" element={<TechnicianDailySummary />} />
                            <Route path="referrals" element={<Referrals />} />
                            <Route path="rebooking" element={<Rebooking />} />
                            <Route path="daily-close" element={<DailyClose />} />
                            <Route path="staff" element={<Staff />} />
                            <Route path="services" element={<Services />} />
                            <Route path="social-media" element={<SocialMedia />} />
                            <Route path="cleaning" element={<CleaningUpload />} />
                            <Route path="cleaning-records" element={<CleaningRecords />} />
                            <Route path="loyalty-settings" element={<LoyaltySettings />} />
                            <Route path="whatsapp-automations" element={<WhatsAppAutomations />} />
                            <Route path="client-feedback" element={<ClientFeedback />} />
                            <Route path="invoices" element={<PendingInvoices />} />
                            <Route path="shared-work" element={<SharedWork />} />
                            <Route path="products" element={<RetailProducts />} />
                            <Route path="retail" element={<RetailProducts />} />
                            <Route path="expenses" element={<Expenses />} />
                            <Route path="expenses/new" element={<Expenses />} />
                            <Route path="attendance" element={<Attendance />} />
                            <Route path="attendance/manager" element={<AttendanceManager />} />
                          </Route>

                          {/* Catch-all: redirect to login */}
                          <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                      </ErrorBoundary>
                    </BrowserRouter>
                    </ReportsProvider>
                    </CommissionProvider>
                    </AttendanceProvider>
                    </ExpensesProvider>
                    </RetailProvider>
                    </InvoiceProvider>
                    </FeedbackProvider>
                    </WhatsAppProvider>
                  </SocialProvider>
                </LoyaltyProvider>
              </ServicesProvider>
            </CleaningProvider>
          </OperationsProvider>
        </AppointmentsProvider>
      </ClientsProvider>
    </AuthProvider>
  );
}
