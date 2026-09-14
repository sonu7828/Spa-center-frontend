/**
 * ServicesContext — Shared state for spa services + dynamic specialties
 *
 * Database source of truth shared between:
 *   - Manage Specialties (Specialty table)
 *   - Staff Specialties (StaffProfile.specialties referencing Specialty)
 *   - Services (Service table with category referencing Specialty)
 *
 * Full Backend REST Integration with zero mock/hardcoded data.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { specialtiesApi, servicesApi, getToken } from '../services/api';

const ServicesContext = createContext();

function formatBackendService(s) {
  if (!s) return null;
  const numPrice = Number(s.price) || 0;
  const dur = s.duration ? `${s.duration} min` : '45 min';
  return {
    id: s.id,
    name: s.name || '',
    category: s.category || 'Other',
    price: numPrice.toLocaleString('en-US'),
    numericPrice: numPrice,
    duration: dur,
    numericDuration: Number(s.duration) || 45,
    description: s.description || '',
    active: s.status === 'ACTIVE' || s.active === true,
    status: s.status || (s.active ? 'ACTIVE' : 'INACTIVE'),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function ServicesProvider({ children }) {
  const [specialties, setSpecialties] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch specialties from backend database (single source of truth) ──
  const refreshSpecialties = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return [];
    }
    try {
      setError(null);
      const res = await specialtiesApi.getAll();
      const list = res?.data || res;
      if (Array.isArray(list)) {
        const normalized = list.map((s) => ({
          id: s.id,
          name: s.name,
          active: s.isActive !== undefined ? Boolean(s.isActive) : s.active !== false,
          isActive: s.isActive !== undefined ? Boolean(s.isActive) : s.active !== false,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
        setSpecialties(normalized);
        return normalized;
      }
    } catch (err) {
      console.error('Failed to fetch specialties from backend:', err.message);
      setError(err.message || 'Failed to fetch specialties');
    }
    return [];
  }, []);

  // ── Fetch services from backend database (single source of truth) ──
  const refreshServices = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return [];
    }
    try {
      setError(null);
      const res = await servicesApi.getAll();
      const list = res?.data || res;
      if (Array.isArray(list)) {
        const normalized = list.map(formatBackendService);
        setServices(normalized);
        return normalized;
      }
    } catch (err) {
      console.error('Failed to fetch services from backend:', err.message);
      setError(err.message || 'Failed to fetch services');
    }
    return [];
  }, []);

  const refreshAll = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    await Promise.all([refreshSpecialties(), refreshServices()]);
    setLoading(false);
  }, [refreshSpecialties, refreshServices]);

  useEffect(() => {
    if (getToken()) {
      refreshAll();
    } else {
      setLoading(false);
    }
  }, [refreshAll]);

  // ── Specialties CRUD (connected to Backend API) ──

  const getActiveSpecialties = useCallback(() => {
    return specialties.filter((s) => s.active !== false);
  }, [specialties]);

  const addSpecialty = useCallback(async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Specialty name is required.');
    }
    const exists = specialties.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      throw new Error('A specialty with this name already exists.');
    }

    const res = await specialtiesApi.create({ name: trimmed });
    await refreshSpecialties();
    return res?.data || res;
  }, [specialties, refreshSpecialties]);

  const editSpecialty = useCallback(async (id, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      throw new Error('Specialty name cannot be empty.');
    }
    const exists = specialties.some(
      (s) => String(s.id) !== String(id) && s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      throw new Error('A specialty with this name already exists.');
    }

    const res = await specialtiesApi.update(id, { name: trimmed });
    await refreshSpecialties();
    return res?.data || res;
  }, [specialties, refreshSpecialties]);

  const toggleSpecialtyActive = useCallback(async (id) => {
    const target = specialties.find((s) => String(s.id) === String(id));
    if (!target) return;
    const newActive = !target.active;
    await specialtiesApi.update(id, { isActive: newActive });
    await refreshSpecialties();
  }, [specialties, refreshSpecialties]);

  const deleteSpecialty = useCallback(async (id) => {
    await specialtiesApi.delete(id);
    await refreshSpecialties();
  }, [refreshSpecialties]);

  // ── Services CRUD (connected to Backend API) ──

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

    const res = await servicesApi.create(payload);
    await refreshServices();
    return res?.data || res;
  }, [refreshServices]);

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

    const res = await servicesApi.update(id, payload);
    await refreshServices();
    return res?.data || res;
  }, [refreshServices]);

  const toggleServiceActive = useCallback(async (id) => {
    const target = services.find((s) => String(s.id) === String(id));
    if (!target) return;
    const nextStatus = target.active ? 'INACTIVE' : 'ACTIVE';
    await servicesApi.update(id, { status: nextStatus });
    await refreshServices();
  }, [services, refreshServices]);

  const deleteService = useCallback(async (id) => {
    await servicesApi.delete(id);
    await refreshServices();
  }, [refreshServices]);

  const getActiveServices = useCallback(() => {
    return services.filter((s) => s.active !== false);
  }, [services]);

  const getServiceByName = useCallback(
    (name) => {
      if (!name) return null;
      const lower = name.trim().toLowerCase();
      return services.find((s) => s.name.toLowerCase() === lower);
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
