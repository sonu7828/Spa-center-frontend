/**
 * ClientsContext — Client state with Real Backend REST Integration (Phase 13 & 22)
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/clients)
 * Provides:
 *   clients                 — Array of all clients (live from backend with local fallback)
 *   loading                 — Loading indicator for async fetch
 *   refreshClients          — Re-fetches client list from backend
 *   addClient               — Asynchronously creates client on backend and updates state
 *   getClient               — Gets client by id (supports UUID string or numeric ID)
 *   fetchClientFull         — Loads full client details with audit history and media
 *   updateClient            — Asynchronously updates client profile
 *   addClientMedia          — Asynchronously attaches before/after photo to backend
 *   addClientServiceHistory — Updates client service history locally
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clientsApi } from '../services/api';
import { useAuth } from './AuthContext';

const ClientsContext = createContext();

export function formatBackendClient(c) {
  if (!c) return null;
  const formattedDate = c.lastVisitAt
    ? new Date(c.lastVisitAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : (c.lastVisit || '—');

  // Map backend history to UI rows
  const rawHistory = c.history || [];
  const mappedHistory = rawHistory
    .filter((h) => ['SERVICE_COMPLETED', 'PAYMENT_RECEIVED', 'APPOINTMENT_CREATED', 'STATUS_CHANGED'].includes(h.action))
    .map((h, idx) => {
      const dateStr = h.createdAt
        ? new Date(h.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      return {
        id: h.id || `hist-${idx}`,
        date: dateStr,
        service: h.details || h.action.replace(/_/g, ' '),
        technician: h.action === 'SERVICE_COMPLETED' ? 'Technician' : 'Front Desk',
        product: 'Spa Service',
        price: '—',
        rawAction: h.action,
        rawDetails: h.details,
      };
    });

  // Group backend media into cohesive Before / After session cards
  const rawMedia = c.media || [];
  const sessionMap = new Map();

  for (const m of rawMedia) {
    const serviceName = (m.note || 'Service Session').trim();
    const dateStr = m.createdAt
      ? new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Today';
    const key = `${serviceName}___${dateStr}`;

    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        id: m.id,
        sessionKey: key,
        service: serviceName,
        date: dateStr,
        before: null,
        after: null,
        beforeId: null,
        afterId: null,
      });
    }

    const session = sessionMap.get(key);
    if (m.mediaType === 'BEFORE') {
      session.before = m.fileUrl;
      session.beforeId = m.id;
    } else if (m.mediaType === 'AFTER') {
      session.after = m.fileUrl;
      session.afterId = m.id;
    }
  }

  const mappedPhotos = Array.from(sessionMap.values());

  return {
    id: c.id,
    name: c.name || '',
    phone: c.phone || '',
    whatsapp: c.whatsapp || c.phone || '',
    quartier: c.quartier || '',
    birthday: c.birthday ? c.birthday.split('T')[0] : '',
    anniversary: c.anniversary ? c.anniversary.split('T')[0] : '',
    source: c.source || 'DIRECT',
    clientSource: c.source === 'STAFF_REFERRAL' || c.introducedByEmployee ? 'Staff Referral' : 'Direct',
    introducedBy: c.introducedByEmployee?.name || c.introducedBy || null,
    introducedById: c.introducedByEmployeeId || c.introducedById || null,
    recommendedBy: c.recommendedByName
      ? {
          name: c.recommendedByName,
          phone: c.recommendedByPhone || '',
          date: c.recommendedByDate || '',
        }
      : (c.recommendedBy || null),
    firstAppointmentService: c.firstAppointmentService || null,
    lastService:
      (c.lastService && c.lastService !== 'Spa Service' ? c.lastService : null) ||
      c.firstAppointmentService ||
      (mappedHistory.length > 0 && mappedHistory[0]?.service && mappedHistory[0].service !== 'Spa Service'
        ? mappedHistory[0].service
        : null) ||
      '—',
    lastVisit: formattedDate,
    status: c.status ? c.status.toUpperCase() : (c.isActive === false ? 'INACTIVE' : 'ACTIVE'),
    isActive: c.isActive !== false && (c.status ? c.status.toUpperCase() === 'ACTIVE' : true),
    lastServiceDate: c.lastServiceDate || null,
    serviceHistory: mappedHistory.length > 0 ? mappedHistory : (c.serviceHistory || []),
    photos: mappedPhotos.length > 0 ? mappedPhotos : (c.photos || []),
  };
}

export function ClientsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real clients from backend on mount
  const refreshClients = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await clientsApi.getAll({ limit: 500, status: 'ALL' });
      const apiList = res?.data || [];
      if (Array.isArray(apiList)) {
        const formattedApiList = apiList.map(formatBackendClient).filter(Boolean);
        setClients(formattedApiList);
      }
    } catch (err) {
      console.warn('Backend clients fetch error:', err.message);
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshClients();
    } else {
      setClients([]);
      setLoading(false);
    }
  }, [isAuthenticated, refreshClients]);

  const getClient = useCallback(
    (id) => {
      if (!id) return null;
      return clients.find(
        (c) =>
          c.id === id ||
          String(c.id) === String(id) ||
          (typeof c.id === 'number' && Number(c.id) === Number(id))
      );
    },
    [clients]
  );

  const fetchClientFull = useCallback(async (id) => {
    try {
      const res = await clientsApi.getById(id);
      const data = res?.data;
      if (data) {
        const formatted = formatBackendClient(data);
        setClients((prev) =>
          prev.map((c) => (String(c.id) === String(id) ? { ...c, ...formatted } : c))
        );
        return formatted;
      }
    } catch (err) {
      console.warn('Failed to fetch full client details:', err.message);
    }
    return null;
  }, []);

  const addClient = useCallback(
    async (clientData) => {
      const today = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // Try backend creation first
      try {
        const payload = {
          name: (clientData.name || '').trim(),
          phone: (clientData.phone || '').trim(),
          whatsapp: (clientData.whatsapp || clientData.phone || '').trim(),
          quartier: (clientData.quartier || '').trim() || null,
          birthday: clientData.birthday || null,
          anniversary: clientData.anniversary || null,
          source: clientData.source || (clientData.introducedBy ? 'STAFF_REFERRAL' : 'DIRECT'),
          introducedByEmployeeId: clientData.introducedById && typeof clientData.introducedById === 'string' && clientData.introducedById.includes('-')
            ? clientData.introducedById
            : null,
          recommendedByName: clientData.recommendedBy?.name || null,
          recommendedByPhone: clientData.recommendedBy?.phone || null,
        };

        const res = await clientsApi.create(payload);
        const created = res?.data;
        if (created && created.id) {
          const formatted = formatBackendClient(created);
          // Retain client-provided extra properties
          if (clientData.introducedBy) formatted.introducedBy = clientData.introducedBy;
          if (clientData.firstAppointmentService) formatted.firstAppointmentService = clientData.firstAppointmentService;
          setClients((prev) => [formatted, ...prev]);
          return formatted.id;
        }
      } catch (err) {
        console.warn('Backend client creation error, saving in local state:', err.message);
      }

      // Local fallback
      const numericIds = clients.map((c) => Number(c.id)).filter((n) => !isNaN(n));
      const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : Date.now();

      const newClient = {
        id: newId,
        name: clientData.name || '',
        phone: clientData.phone || '',
        whatsapp: clientData.whatsapp || clientData.phone || '',
        quartier: clientData.quartier || '',
        birthday: clientData.birthday || '',
        anniversary: clientData.anniversary || '',
        recommendedBy: clientData.recommendedBy
          ? {
              name: clientData.recommendedBy.name || '',
              phone: clientData.recommendedBy.phone || '',
              date: clientData.recommendedBy.date || today,
            }
          : null,
        introducedBy: clientData.introducedBy || null,
        introducedById: clientData.introducedById || null,
        firstAppointmentService: clientData.firstAppointmentService || null,
        clientSource: clientData.clientSource || (clientData.introducedBy ? 'Staff Referral' : 'Direct'),
        lastService: clientData.firstAppointmentService || '—',
        lastVisit: '—',
        status: 'ACTIVE',
        isActive: true,
        noShows: 0,
        serviceHistory: [],
        photos: [],
      };

      setClients((prev) => [newClient, ...prev]);
      return newId;
    },
    [clients]
  );

  const updateClient = useCallback(async (id, updates) => {
    // Optimistic local update
    setClients((prev) =>
      prev.map((c) =>
        String(c.id) === String(id) || c.id === id ? { ...c, ...updates } : c
      )
    );

    // Backend update if id is valid UUID or backend string
    try {
      if (typeof id === 'string' && id.includes('-')) {
        await clientsApi.update(id, {
          name: updates.name,
          phone: updates.phone,
          whatsapp: updates.whatsapp,
          quartier: updates.quartier,
          birthday: updates.birthday || null,
          anniversary: updates.anniversary || null,
        });
      }
    } catch (err) {
      console.warn('Backend client update error:', err.message);
    }
  }, []);

  const setClientStatus = useCallback(
    async (id, newStatus) => {
      const normalized = (newStatus || 'ACTIVE').toUpperCase();
      const isActive = normalized === 'ACTIVE';

      // Optimistic local update
      setClients((prev) =>
        prev.map((c) =>
          String(c.id) === String(id) || c.id === id
            ? { ...c, status: normalized, isActive }
            : c
        )
      );

      // Backend update if id is valid UUID
      try {
        if (typeof id === 'string' && id.includes('-')) {
          await clientsApi.setStatus(id, normalized);
        }
      } catch (err) {
        console.warn('Backend client status update error:', err.message);
        await refreshClients();
      }
    },
    [refreshClients]
  );

  const addClientMedia = useCallback(
    async (clientId, mediaData) => {
      // Backend persistence if valid UUID
      try {
        if (typeof clientId === 'string' && clientId.includes('-')) {
          await clientsApi.addMedia(clientId, {
            mediaType: mediaData.mediaType === 'AFTER' ? 'AFTER' : 'BEFORE',
            fileUrl: mediaData.fileUrl || mediaData.url,
            note: mediaData.note || null,
          });
          await fetchClientFull(clientId);
          return true;
        }
      } catch (err) {
        console.warn('Backend client media add error:', err.message);
      }
      return false;
    },
    [fetchClientFull]
  );

  const addClientServiceHistory = useCallback((clientId, serviceRecord) => {
    setClients((prev) =>
      prev.map((c) => {
        if (String(c.id) !== String(clientId) && c.id !== clientId) return c;
        const newHistoryId = (c.serviceHistory?.length || 0) + 1;
        const formattedDate = serviceRecord.date || '31 Aug 2026';
        const newEntry = {
          id: newHistoryId,
          date: formattedDate,
          service: serviceRecord.service || '',
          technician: serviceRecord.technician || '',
          product: serviceRecord.product || '',
          price:
            typeof serviceRecord.price === 'number'
              ? serviceRecord.price.toLocaleString('en-US')
              : serviceRecord.price || '0',
        };
        return {
          ...c,
          lastService: serviceRecord.service || c.lastService,
          lastVisit: formattedDate,
          serviceHistory: [newEntry, ...(c.serviceHistory || [])],
        };
      })
    );
  }, []);

  return (
    <ClientsContext.Provider
      value={{
        clients,
        loading,
        error,
        refreshClients,
        addClient,
        getClient,
        fetchClientFull,
        updateClient,
        setClientStatus,
        addClientMedia,
        addClientServiceHistory,
      }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
}
