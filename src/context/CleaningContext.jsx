/**
 * CleaningContext — Persistent Cleaning Records State Management
 * Phase 23: Cloudinary Media Storage Integration
 *
 * Records are stored permanently in MySQL via /api/v1/media/upload/cleaning
 * and /api/v1/media/cleaning. Survives page refreshes, backend restarts, and logins.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mediaApi } from '../services/api';
import { useAuth } from './AuthContext';

const CleaningContext = createContext();

export function CleaningProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshRecords = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await mediaApi.getCleaningRecords();
      if (res?.data && Array.isArray(res.data)) {
        setRecords(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch persistent cleaning records:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshRecords();
  }, [refreshRecords]);

  const addRecord = useCallback(async ({ cleanerName, photos, photo, files, file, note, area }) => {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const time = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const uploadFiles = Array.isArray(files) && files.length > 0
      ? files
      : file ? [file] : [];

    // If files are provided, persist directly to backend & Cloudinary
    if (uploadFiles.length > 0) {
      try {
        const formData = new FormData();
        uploadFiles.forEach((f) => {
          formData.append('images', f);
        });
        formData.append('area', area || 'General Cleaning');
        if (note) formData.append('note', note.trim());

        const res = await mediaApi.uploadCleaningPhoto(formData);
        if (res?.data) {
          const persisted = res.data;
          setRecords((prev) => [persisted, ...prev]);
          return persisted;
        }
      } catch (err) {
        console.error('Backend cleaning photos upload failed:', err);
        throw err;
      }
    }

    // Local fallback record
    const fallbackPhotos = Array.isArray(photos) && photos.length > 0
      ? photos.map((p, idx) => ({ id: `local-${Date.now()}-${idx}`, url: p }))
      : photo ? [{ id: `local-${Date.now()}`, url: photo }] : [];

    const fallbackRecord = {
      id: Date.now().toString(),
      cleanerName: cleanerName || 'Unknown',
      date,
      time,
      area: area || 'General Cleaning',
      photo: fallbackPhotos[0]?.url || photo || null,
      photos: fallbackPhotos,
      photoCount: fallbackPhotos.length,
      note: (note || '').trim(),
    };
    setRecords((prev) => [fallbackRecord, ...prev]);
    return fallbackRecord;
  }, []);

  const deleteRecord = useCallback(async (recordId) => {
    try {
      await mediaApi.deleteCleaningRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      return true;
    } catch (err) {
      console.warn('Could not delete cleaning record:', err.message);
      throw err;
    }
  }, []);

  return (
    <CleaningContext.Provider value={{ records, loading, addRecord, deleteRecord, refreshRecords }}>
      {children}
    </CleaningContext.Provider>
  );
}

export function useCleaning() {
  return useContext(CleaningContext);
}

