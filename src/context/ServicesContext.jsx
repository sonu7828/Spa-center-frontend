/**
 * ServicesContext — Shared state for spa services + dynamic specialties
 *
 * Database source of truth shared between:
 *   - Manage Specialties (Specialty table)
 *   - Staff Specialties (StaffProfile.specialties referencing Specialty)
 *   - Services (Service table with category referencing Specialty)
 *
 * Architecture:
 *   1. Initial state loads INSTANTLY from localStorage or preloaded master catalog (DEFAULT_SERVICES / DEFAULT_SPECIALTIES).
 *   2. Services are NEVER empty (`[]`) — client will never see "No options found".
 *   3. Background refresh pulls live data from backend REST API when available.
 *   4. Zero wipe-out guarantee: Network timeouts, Railway cold-starts, or temporary offline states
 *      retain the cached catalog rather than clearing to empty.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { specialtiesApi, servicesApi, getToken } from '../services/api';
import { DEFAULT_SPECIALTIES, DEFAULT_SERVICES } from '../data/defaultCatalog';

const ServicesContext = createContext();

const SERVICES_CACHE_KEY = 'omega_services_catalog_cache';
const SPECIALTIES_CACHE_KEY = 'omega_specialties_catalog_cache';

export function formatBackendService(s) {
  if (!s) return null;
  const numPrice = Number(s.price) || 0;
  const numDur = Number(s.duration) || 45;
  const durStr = numDur > 1 ? `${numDur} min` : (numDur === 1 ? '60 min' : '45 min');
  return {
    id: s.id,
    name: s.name || '',
    category: s.category || 'Other',
    price: numPrice.toLocaleString('en-US'),
    numericPrice: numPrice,
    duration: durStr,
    numericDuration: numDur === 1 ? 60 : numDur,
    description: s.description || '',
    active: s.status === 'ACTIVE' || s.active === true,
    status: s.status || (s.active ? 'ACTIVE' : 'INACTIVE'),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function loadCachedServices() {
  try {
    const raw = localStorage.getItem(SERVICES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[ServicesContext] Error reading services cache:', e);
  }
  return DEFAULT_SERVICES;
}

function loadCachedSpecialties() {
  try {
    const raw = localStorage.getItem(SPECIALTIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[ServicesContext] Error reading specialties cache:', e);
  }
  return DEFAULT_SPECIALTIES;
}

function persistServices(servicesList) {
  try {
    if (Array.isArray(servicesList) && servicesList.length > 0) {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(servicesList));
    }
  } catch (e) {
    console.warn('[ServicesContext] Error saving services cache:', e);
  }
}

function persistSpecialties(specialtiesList) {
  try {
    if (Array.isArray(specialtiesList) && specialtiesList.length > 0) {
      localStorage.setItem(SPECIALTIES_CACHE_KEY, JSON.stringify(specialtiesList));
    }
  } catch (e) {
    console.warn('[ServicesContext] Error saving specialties cache:', e);
  }
}

export function ServicesProvider({ children }) {
  // Pre-populate immediately so dropdowns & catalogs are never empty
  const [specialties, setSpecialties] = useState(loadCachedSpecialties);
  const [services, setServices] = useState(loadCachedServices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch specialties from backend database with fail-safe fallback ──
  const refreshSpecialties = useCallback(async () => {
    try {
      setError(null);
      const res = await specialtiesApi.getAll();
      const list = res?.data || res;
      if (Array.isArray(list) && list.length > 0) {
        const normalized = list.map((s) => ({
          id: s.id,
          name: s.name,
          active: s.isActive !== undefined ? Boolean(s.isActive) : s.active !== false,
          isActive: s.isActive !== undefined ? Boolean(s.isActive) : s.active !== false,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
        setSpecialties(normalized);
        persistSpecialties(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('[ServicesContext] Specialties sync note:', err.message);
    }
    // Retain current or fallback - NEVER wipe out or clear to empty!
    setSpecialties((prev) => (prev && prev.length > 0 ? prev : DEFAULT_SPECIALTIES));
    return [];
  }, []);

  // ── Fetch services from backend database with fail-safe fallback ──
  const refreshServices = useCallback(async () => {
    try {
      setError(null);
      const res = await servicesApi.getAll();
      const list = res?.data || res;
      if (Array.isArray(list) && list.length > 0) {
        const normalized = list.map(formatBackendService);
        setServices(normalized);
        persistServices(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('[ServicesContext] Services sync note:', err.message);
    }
    // Retain current or fallback - NEVER wipe out or clear to empty!
    setServices((prev) => (prev && prev.length > 0 ? prev : DEFAULT_SERVICES));
    return [];
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([refreshSpecialties(), refreshServices()]);
    } finally {
      setLoading(false);
    }
  }, [refreshSpecialties, refreshServices]);

  useEffect(() => {
    // Attempt backend sync in background; state is already fully pre-populated
    refreshAll();
  }, [refreshAll]);

  // ── Specialties CRUD ──

  const getActiveSpecialties = useCallback(() => {
    const list = (specialties && specialties.length > 0 ? specialties : DEFAULT_SPECIALTIES);
    const active = list.filter((s) => s.active !== false && s.isActive !== false);
    return active.length > 0 ? active : DEFAULT_SPECIALTIES;
  }, [specialties]);

  const addSpecialty = useCallback(async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Specialty name is required.');
    }
    const exists = (specialties || []).some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      throw new Error('A specialty with this name already exists.');
    }

    let createdSpecialty = null;
    try {
      const res = await specialtiesApi.create({ name: trimmed });
      createdSpecialty = res?.data || res;
    } catch (err) {
      console.warn('[ServicesContext] Backend specialty create offline, adding locally:', err.message);
    }

    const newSpecialty = {
      id: createdSpecialty?.id || (crypto.randomUUID ? crypto.randomUUID() : `spec-${Date.now()}`),
      name: trimmed,
      active: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSpecialties((prev) => {
      const updated = [...(prev || []), newSpecialty];
      persistSpecialties(updated);
      return updated;
    });

    return newSpecialty;
  }, [specialties]);

  const editSpecialty = useCallback(async (id, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      throw new Error('Specialty name cannot be empty.');
    }
    const exists = (specialties || []).some(
      (s) => String(s.id) !== String(id) && s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      throw new Error('A specialty with this name already exists.');
    }

    try {
      await specialtiesApi.update(id, { name: trimmed });
    } catch (err) {
      console.warn('[ServicesContext] Backend specialty update offline, updating locally:', err.message);
    }

    setSpecialties((prev) => {
      const updated = (prev || []).map((s) =>
        String(s.id) === String(id) ? { ...s, name: trimmed, updatedAt: new Date().toISOString() } : s
      );
      persistSpecialties(updated);
      return updated;
    });
  }, [specialties]);

  const toggleSpecialtyActive = useCallback(async (id) => {
    let nextActive = true;
    setSpecialties((prev) => {
      const target = (prev || []).find((s) => String(s.id) === String(id));
      if (!target) return prev;
      nextActive = !target.active;
      const updated = prev.map((s) =>
        String(s.id) === String(id)
          ? { ...s, active: nextActive, isActive: nextActive, updatedAt: new Date().toISOString() }
          : s
      );
      persistSpecialties(updated);
      return updated;
    });

    try {
      await specialtiesApi.update(id, { isActive: nextActive });
    } catch (err) {
      console.warn('[ServicesContext] Backend specialty toggle note:', err.message);
    }
  }, []);

  const deleteSpecialty = useCallback(async (id) => {
    setSpecialties((prev) => {
      const updated = (prev || []).filter((s) => String(s.id) !== String(id));
      persistSpecialties(updated);
      return updated;
    });

    try {
      await specialtiesApi.delete(id);
    } catch (err) {
      console.warn('[ServicesContext] Backend specialty delete note:', err.message);
    }
  }, []);

  // ── Services CRUD ──

  const addService = useCallback(async (serviceData) => {
    const name = (serviceData.name || '').trim();
    if (!name) throw new Error('Service name is required.');

    const cleanPrice = parseInt(String(serviceData.price || '0').replace(/[^0-9]/g, ''), 10) || 0;
    const cleanDuration = parseInt(String(serviceData.duration || '45').replace(/[^0-9]/g, ''), 10) || 45;

    const payload = {
      name,
      category: serviceData.category || 'Other',
      description: serviceData.description || null,
      price: cleanPrice,
      duration: cleanDuration,
      status: serviceData.active !== false ? 'ACTIVE' : 'INACTIVE',
    };

    let backendService = null;
    try {
      const res = await servicesApi.create(payload);
      backendService = res?.data || res;
    } catch (err) {
      console.warn('[ServicesContext] Backend create offline, saving locally:', err.message);
    }

    const newService = formatBackendService(backendService || {
      ...payload,
      id: crypto.randomUUID ? crypto.randomUUID() : `srv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setServices((prev) => {
      const updated = [newService, ...(prev || [])];
      persistServices(updated);
      return updated;
    });

    return newService;
  }, []);

  const editService = useCallback(async (id, updates) => {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.category !== undefined) payload.category = updates.category.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.price !== undefined) {
      payload.price = parseInt(String(updates.price).replace(/[^0-9]/g, ''), 10) || 0;
    }
    if (updates.duration !== undefined) {
      payload.duration = parseInt(String(updates.duration).replace(/[^0-9]/g, ''), 10) || 45;
    }
    if (updates.active !== undefined) {
      payload.status = updates.active ? 'ACTIVE' : 'INACTIVE';
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }

    try {
      await servicesApi.update(id, payload);
    } catch (err) {
      console.warn('[ServicesContext] Backend update offline, updating locally:', err.message);
    }

    setServices((prev) => {
      const updated = (prev || []).map((s) => {
        if (String(s.id) !== String(id)) return s;
        const numPrice = payload.price !== undefined ? payload.price : s.numericPrice;
        const numDur = payload.duration !== undefined ? payload.duration : s.numericDuration;
        const durStr = numDur > 1 ? `${numDur} min` : (numDur === 1 ? '60 min' : '45 min');
        return {
          ...s,
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.category ? { category: payload.category } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          numericPrice: numPrice,
          price: numPrice.toLocaleString('en-US'),
          numericDuration: numDur === 1 ? 60 : numDur,
          duration: durStr,
          ...(payload.status ? {
            status: payload.status,
            active: payload.status === 'ACTIVE',
          } : {}),
          updatedAt: new Date().toISOString(),
        };
      });
      persistServices(updated);
      return updated;
    });
  }, []);

  const toggleServiceActive = useCallback(async (id) => {
    let nextStatus = 'INACTIVE';
    setServices((prev) => {
      const target = (prev || []).find((s) => String(s.id) === String(id));
      if (!target) return prev;
      nextStatus = target.active ? 'INACTIVE' : 'ACTIVE';
      const updated = prev.map((s) => {
        if (String(s.id) !== String(id)) return s;
        return {
          ...s,
          active: !s.active,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      });
      persistServices(updated);
      return updated;
    });

    try {
      await servicesApi.update(id, { status: nextStatus });
    } catch (err) {
      console.warn('[ServicesContext] Backend toggle offline, updated locally:', err.message);
    }
  }, []);

  const deleteService = useCallback(async (id) => {
    setServices((prev) => {
      const updated = (prev || []).filter((s) => String(s.id) !== String(id));
      persistServices(updated);
      return updated;
    });

    try {
      await servicesApi.delete(id);
    } catch (err) {
      console.warn('[ServicesContext] Backend delete offline, deleted locally:', err.message);
    }
  }, []);

  const getActiveServices = useCallback(() => {
    const list = (services && services.length > 0 ? services : DEFAULT_SERVICES);
    const active = list.filter((s) => s.active !== false && s.status !== 'INACTIVE');
    return active.length > 0 ? active : DEFAULT_SERVICES;
  }, [services]);

  const getServiceByName = useCallback(
    (name) => {
      if (!name) return null;
      const lower = name.trim().toLowerCase();
      const list = (services && services.length > 0 ? services : DEFAULT_SERVICES);
      return list.find((s) => s.name.toLowerCase() === lower) || null;
    },
    [services]
  );

  return (
    <ServicesContext.Provider
      value={{
        specialties,
        refreshSpecialties,
        getActiveSpecialties,
        addSpecialty,
        editSpecialty,
        toggleSpecialtyActive,
        deleteSpecialty,
        services,
        refreshServices,
        addService,
        editService,
        toggleServiceActive,
        deleteService,
        getActiveServices,
        getServiceByName,
        loading,
        error,
        refreshAll,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  return useContext(ServicesContext);
}
