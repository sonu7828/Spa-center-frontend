/**
 * AppointmentsContext — Appointments state with Real Backend REST Integration (Phase 14 & 22)
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/appointments)
 * Provides:
 *   appointments                — Array of all appointments (live from backend with local fallback)
 *   loading                     — Async fetch loading indicator
 *   refreshAppointments         — Re-fetches appointment list from backend
 *   addAppointment              — Asynchronously creates appointment on backend and updates state
 *   getAppointment              — Gets appointment by ID (supports UUID string or numeric ID)
 *   updateAppointment           — Updates appointment fields (reschedule or status change)
 *   addServiceToAppointment     — Adds extra service line to active appointment
 *   removeServiceFromAppointment— Removes service line before close
 *   getAppointmentsForDate      — Filters appointments by date string (YYYY-MM-DD)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { appointmentsApi } from '../services/api';
import { useAuth } from './AuthContext';

const AppointmentsContext = createContext();

export function formatBackendAppointment(apt) {
  if (!apt) return null;
  const dateStr = apt.appointmentDate ? apt.appointmentDate.split('T')[0] : '';
  const techName =
    apt.mainTechnician?.staffProfile?.name ||
    apt.mainTechnician?.email?.split('@')[0] ||
    'Staff';

  const rawStatus = String(apt.status || 'SCHEDULED');
  const lowerStatus = rawStatus.toLowerCase().replace(/_/g, '-'); // 'in-progress', 'no-show', etc.

  const mappedServices = (apt.appointmentServices || []).map((s, idx) => ({
    appointmentServiceId: s.id || `asvc-${apt.id}-${idx}`,
    serviceId: s.serviceId || s.service?.id || null,
    name: s.service?.name || s.name || 'Service',
    price: Number(s.price || s.service?.price || 15000),
    category: s.service?.category || '',
    duration: Number(s.service?.duration || s.duration || 30),
    status: s.status,
  }));

  const totalDuration =
    mappedServices.reduce((sum, s) => sum + (Number(s.duration) || 30), 0) || 30;

  const serviceSummary =
    apt.serviceSummary ||
    mappedServices.map((s) => s.name).join(', ') ||
    'Spa Service';

  return {
    id: apt.id,
    clientId: apt.clientId || apt.client?.id || null,
    clientName: apt.client?.name || 'Client',
    clientPhone: apt.client?.phone || '',
    date: dateStr,
    time: apt.appointmentTime || '',
    status: lowerStatus,
    rawStatus: rawStatus,
    service: serviceSummary,
    category: mappedServices[0]?.category || '',
    technicianId: apt.mainTechnicianId || null,
    technicianName: techName,
    notes: apt.notes || '',
    lateMinutes: apt.lateMinutes || null,
    noShowReason: apt.noShowReason || null,
    totalDuration,
    duration: totalDuration,
    services:
      mappedServices.length > 0
        ? mappedServices
        : [
            {
              appointmentServiceId: `asvc-${apt.id}-1`,
              serviceId: null,
              name: serviceSummary,
              price: 15000,
              category: '',
              duration: 30,
            },
          ],
    introducedBy: apt.client?.introducedByEmployee?.name || '',
    introducedById: apt.client?.introducedByEmployeeId || null,
  };
}

export function AppointmentsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real appointments from backend on mount
  const refreshAppointments = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentsApi.getAll({ limit: 500 });
      const apiList = res?.data || [];
      if (Array.isArray(apiList)) {
        const formattedApiList = apiList.map(formatBackendAppointment).filter(Boolean);
        setAppointments(formattedApiList);
      }
    } catch (err) {
      console.warn('Backend appointments fetch error:', err.message);
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAppointments();
    } else {
      setAppointments([]);
      setLoading(false);
    }
  }, [isAuthenticated, refreshAppointments]);

  const addAppointment = useCallback(
    async (data) => {
      // Normalize services array
      const rawServices = data.services?.length
        ? data.services
        : data.service
        ? [{ name: data.service, category: data.category || '', price: data.price || 15000 }]
        : [];

      const normalizedServices = rawServices.map((s, idx) => ({
        appointmentServiceId: s.appointmentServiceId || `asvc-${Date.now()}-${idx}`,
        serviceId: s.serviceId || s.id || null,
        name: s.name || s.service || 'Service',
        price:
          typeof s.price === 'number'
            ? s.price
            : parseInt(String(s.price || '0').replace(/[^0-9]/g, ''), 10) || 15000,
        category: s.category || data.category || '',
        duration: Number(s.numericDuration || s.duration || 30),
      }));

      const totalDuration =
        normalizedServices.reduce((sum, s) => sum + (Number(s.duration) || 30), 0) || 30;

      const derivedServiceSummary =
        normalizedServices.map((s) => s.name).join(', ') || data.service || '';

      // Try backend creation if clientId and technicianId are UUIDs
      try {
        const isClientUuid = typeof data.clientId === 'string' && data.clientId.includes('-');
        const isTechUuid = typeof data.technicianId === 'string' && data.technicianId.includes('-');
        const firstServiceUuid = normalizedServices[0]?.serviceId;
        const isServiceUuid = typeof firstServiceUuid === 'string' && firstServiceUuid.includes('-');

        if (isClientUuid && isTechUuid && isServiceUuid) {
          const payload = {
            clientId: data.clientId,
            appointmentDate: data.date,
            appointmentTime: data.time,
            mainTechnicianId: data.technicianId,
            notes: data.notes || null,
            services: normalizedServices.map((s) => ({
              serviceId: s.serviceId,
              technicianId: data.technicianId,
              price: s.price,
            })),
          };

          const res = await appointmentsApi.create(payload);
          const created = res?.data;
          if (created && created.id) {
            // Full refresh from backend to ensure calendar sync
            await refreshAppointments();
            return created.id;
          }
        }
      } catch (err) {
        console.warn('Backend appointment create error:', err.message);
        throw err;
      }

      // Local fallback
      const numericIds = appointments.map((a) => Number(a.id)).filter((n) => !isNaN(n));
      const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : Date.now();

      const apt = {
        id: newId,
        clientId: data.clientId || null,
        clientName: data.clientName || '',
        services: normalizedServices,
        service: derivedServiceSummary,
        category: data.category || normalizedServices[0]?.category || '',
        technicianId: data.technicianId || null,
        technicianName: data.technicianName || '',
        date: data.date || '',
        time: data.time || '',
        totalDuration,
        duration: totalDuration,
        status: data.status || 'scheduled',
        rawStatus: (data.status || 'scheduled').toUpperCase().replace(/-/g, '_'),
        introducedBy: data.introducedBy || '',
        introducedById: data.introducedById || null,
      };

      setAppointments((prev) => [apt, ...prev]);
      return newId;
    },
    [appointments, refreshAppointments]
  );

  const getAppointment = useCallback(
    (id) => {
      if (!id) return null;
      return appointments.find(
        (a) =>
          a.id === id ||
          String(a.id) === String(id) ||
          (typeof a.id === 'number' && Number(a.id) === Number(id))
      );
    },
    [appointments]
  );

  const updateAppointment = useCallback(async (id, updates) => {
    // Optimistic local state update
    setAppointments((prev) =>
      prev.map((a) => {
        if (String(a.id) !== String(id) && a.id !== id) return a;
        const merged = { ...a, ...updates };
        if (updates.services) {
          merged.service = updates.services.map((s) => s.name).join(', ');
        }
        if (updates.status) {
          merged.rawStatus = String(updates.status).toUpperCase().replace(/-/g, '_');
        }
        return merged;
      })
    );

    // Backend call if id is a backend UUID
    if (typeof id === 'string' && id.includes('-')) {
      try {
        // Status change
        if (updates.status) {
          let backendStatus = 'SCHEDULED';
          const s = String(updates.status).toLowerCase();
          if (s === 'in-progress' || s === 'in_progress') backendStatus = 'IN_PROGRESS';
          else if (s === 'completed') backendStatus = 'COMPLETED';
          else if (s === 'late') backendStatus = 'LATE';
          else if (s === 'no-show' || s === 'no_show') backendStatus = 'NO_SHOW';

          await appointmentsApi.changeStatus(id, {
            status: backendStatus,
            notes: updates.notes || null,
            lateMinutes: updates.lateMinutes ? Number(updates.lateMinutes) : null,
            noShowReason: updates.noShowReason || null,
          });
        }

        // Reschedule / details update
        if (updates.date || updates.time || updates.technicianId) {
          await appointmentsApi.update(id, {
            ...(updates.date && { appointmentDate: updates.date }),
            ...(updates.time && { appointmentTime: updates.time }),
            ...(updates.technicianId && { mainTechnicianId: updates.technicianId }),
            ...(updates.notes && { notes: updates.notes }),
            ...(updates.lateMinutes && { lateMinutes: Number(updates.lateMinutes) }),
            ...(updates.noShowReason && { noShowReason: updates.noShowReason }),
          });
        }
      } catch (err) {
        console.warn('Backend appointment update error:', err.message);
        throw err;
      }
    }
  }, []);

  const addServiceToAppointment = useCallback((appointmentId, serviceData) => {
    setAppointments((prev) =>
      prev.map((a) => {
        if (String(a.id) !== String(appointmentId) && a.id !== appointmentId) return a;
        const currentServices = a.services?.length
          ? [...a.services]
          : a.service
          ? [{ appointmentServiceId: `asvc-${a.id}-init`, name: a.service, price: 15000 }]
          : [];

        const newServiceItem = {
          appointmentServiceId: `asvc-${a.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          serviceId: serviceData.serviceId || serviceData.id || null,
          name: serviceData.name || serviceData.service || 'Service',
          price:
            typeof serviceData.price === 'number'
              ? serviceData.price
              : parseInt(String(serviceData.price || '0').replace(/[^0-9]/g, ''), 10) || 15000,
          category: serviceData.category || '',
        };

        const updatedServices = [...currentServices, newServiceItem];
        return {
          ...a,
          services: updatedServices,
          service: updatedServices.map((s) => s.name).join(', '),
        };
      })
    );
  }, []);

  const removeServiceFromAppointment = useCallback((appointmentId, appointmentServiceId) => {
    setAppointments((prev) =>
      prev.map((a) => {
        if (String(a.id) !== String(appointmentId) && a.id !== appointmentId) return a;
        if (!a.services || a.services.length <= 1) return a;
        const updatedServices = a.services.filter(
          (s) => s.appointmentServiceId !== appointmentServiceId
        );
        return {
          ...a,
          services: updatedServices,
          service: updatedServices.map((s) => s.name).join(', '),
        };
      })
    );
  }, []);

  const getAppointmentsForDate = useCallback(
    (date) => appointments.filter((a) => a.date === date),
    [appointments]
  );

  const cancelAppointment = useCallback(
    async (id) => {
      if (typeof id === 'string' && id.includes('-')) {
        try {
          await appointmentsApi.cancel(id);
          await refreshAppointments();
          return true;
        } catch (err) {
          console.warn('Backend appointment cancel error:', err.message);
          throw err;
        }
      }
      // Local fallback — mark as cancelled
      setAppointments((prev) =>
        prev.map((a) =>
          String(a.id) === String(id) || a.id === id
            ? { ...a, status: 'cancelled', rawStatus: 'CANCELLED' }
            : a
        )
      );
      return true;
    },
    [refreshAppointments]
  );

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        loading,
        error,
        refreshAppointments,
        addAppointment,
        getAppointment,
        updateAppointment,
        cancelAppointment,
        addServiceToAppointment,
        removeServiceFromAppointment,
        getAppointmentsForDate,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) {
    throw new Error('useAppointments must be used within an AppointmentsProvider');
  }
  return context;
}
