/**
 * CleaningRecords — Manager-only page
 * Phase 23: Cleaning Multiple Camera Photos Enhancement
 *
 * View all cleaning records submitted by cleaners.
 * Displays: Cleaning Area, Cleaner Name, Date & Time, Photo Count, and Gallery View.
 * Clicking a photo thumbnail opens a full photo gallery modal with navigation.
 * Managers can also delete records and Cloudinary photos.
 */

import { useState } from 'react';
import {
  X,
  Camera,
  Layers,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';


import PageHeader from '../components/PageHeader';
import { useCleaning } from '../context/CleaningContext';
import { useAuth } from '../context/AuthContext';

export default function CleaningRecords() {
  const { records, deleteRecord } = useCleaning();
  const { user } = useAuth();

  const [galleryModal, setGalleryModal] = useState({
    open: false,
    entry: null,
    activeIdx: 0,
  });

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Helper to extract list of photo URLs from a record
  const getEntryPhotos = (entry) => {
    if (!entry) return [];
    if (Array.isArray(entry.photos) && entry.photos.length > 0) {
      return entry.photos.map((p) => (typeof p === 'string' ? p : p.url));
    }
    const legacy = [entry.photo, entry.afterPhoto, entry.beforePhoto].filter(Boolean);
    return Array.from(new Set(legacy));
  };

  const openGallery = (entry, initialIdx = 0) => {
    setGalleryModal({
      open: true,
      entry,
      activeIdx: initialIdx,
    });
  };

  const closeGallery = () => {
    setGalleryModal({ open: false, entry: null, activeIdx: 0 });
  };

  const nextGalleryPhoto = () => {
    const photos = getEntryPhotos(galleryModal.entry);
    if (!photos.length) return;
    setGalleryModal((prev) => ({
      ...prev,
      activeIdx: (prev.activeIdx + 1) % photos.length,
    }));
  };

  const prevGalleryPhoto = () => {
    const photos = getEntryPhotos(galleryModal.entry);
    if (!photos.length) return;
    setGalleryModal((prev) => ({
      ...prev,
      activeIdx: (prev.activeIdx - 1 + photos.length) % photos.length,
    }));
  };

  const handleDelete = async (recordId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this cleaning record and its photos?')) {
      return;
    }

    try {
      setDeletingId(recordId);
      setDeleteError(null);
      await deleteRecord(recordId);
      if (galleryModal.entry?.id === recordId) {
        closeGallery();
      }
    } catch (err) {
      setDeleteError(err?.message || 'Failed to delete record');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Cleaning Records"
        subtitle="Review cleaning submissions, photo counts, and camera gallery proofs from staff."
      />

      {deleteError && (
        <div className="mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] bg-warning-soft text-warning border border-warning/30 text-xs font-semibold">
          <AlertCircle size={15} className="shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      {records.length === 0 ? (
        <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
          <Camera size={36} className="text-muted-gray/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-charcoal mb-1">No cleaning records yet</p>
          <p className="text-xs text-muted-gray">Records will appear here once cleaners submit proof photos.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border/40">
            <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
              All Records ({records.length})
            </h3>
            <span className="text-xs text-muted-gray">Click photo to view gallery</span>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-soft-cream/40">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Cleaner</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Photos</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Note</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-muted-gray uppercase tracking-wider">Actions</th>
                </tr>

              </thead>
              <tbody>
                {records.map((r) => {
                  const photos = getEntryPhotos(r);
                  const count = r.photoCount || photos.length || (r.photo ? 1 : 0);
                  const thumb = photos[0] || r.photo;

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/40 last:border-b-0 hover:bg-soft-cream/30 transition-colors"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-sm text-charcoal font-medium">{r.date}</p>
                        <p className="text-xs text-muted-gray">{r.time}</p>
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-[7px] text-[11px] font-semibold bg-warning-soft text-warning border border-warning/20 capitalize">
                          {r.cleanerName}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openGallery(r)}
                            className="relative w-16 h-11 rounded-[8px] overflow-hidden border border-border bg-white hover:border-sage hover:shadow-md transition-all cursor-pointer group shrink-0"
                            title="Open photo gallery"
                          >
                            {thumb ? (
                              <img src={thumb} alt="Cleaning" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-soft-cream text-muted-gray">
                                <Camera size={16} />
                              </div>
                            )}
                            {count > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-charcoal/80 text-[9px] font-bold text-white leading-tight">
                                +{count - 1}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openGallery(r)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-sage-soft text-sage border border-sage/20 text-[11px] font-bold hover:bg-sage hover:text-white cursor-pointer transition-colors"
                          >
                            <Layers size={11} />
                            {count} {count === 1 ? 'Photo' : 'Photos'}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-xs text-charcoal max-w-[280px]">
                        {r.note ? (
                          <span className="font-medium text-charcoal">{r.note}</span>
                        ) : (
                          <span className="text-muted-gray italic">—</span>
                        )}
                      </td>


                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openGallery(r)}
                            className="p-1.5 rounded-[6px] text-muted-gray hover:text-sage hover:bg-sage-soft/30 transition-colors cursor-pointer"
                            title="View Gallery"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === r.id}
                            onClick={(e) => handleDelete(r.id, e)}
                            className="p-1.5 rounded-[6px] text-muted-gray hover:text-danger hover:bg-danger-soft/30 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden px-4 py-4 space-y-3">
            {records.map((r) => {
              const photos = getEntryPhotos(r);
              const count = r.photoCount || photos.length || (r.photo ? 1 : 0);
              const thumb = photos[0] || r.photo;

              return (
                <div
                  key={r.id}
                  onClick={() => openGallery(r)}
                  className="flex gap-3 items-start p-3 bg-soft-cream/50 border border-border/60 hover:border-sage/50 rounded-[12px] cursor-pointer transition-all"
                >
                  <div className="relative w-20 h-16 rounded-[8px] overflow-hidden border border-border shrink-0 bg-white shadow-xs">
                    {thumb ? (
                      <img src={thumb} alt="Cleaning" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-soft-cream text-muted-gray">
                        <Camera size={18} />
                      </div>
                    )}
                    {count > 1 && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-charcoal/80 text-[9px] font-bold text-white">
                        +{count - 1}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-charcoal truncate">
                        {r.note || 'Cleaning Proof'}
                      </p>
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={(e) => handleDelete(r.id, e)}
                        className="p-1 text-muted-gray hover:text-danger cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-block px-1.5 py-0.2 rounded-[4px] text-[10px] font-semibold bg-warning-soft text-warning border border-warning/20">
                        {r.cleanerName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-[4px] text-[10px] font-bold bg-sage-soft text-sage border border-sage/20">
                        <Layers size={9} />
                        {count} {count === 1 ? 'Photo' : 'Photos'}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-gray mt-1">
                      {r.time} — {r.date}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {galleryModal.open && galleryModal.entry && (
        <div
          className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4"
          onClick={closeGallery}
        >
          <div
            className="relative w-full max-w-[calc(100vw-24px)] sm:max-w-[650px] bg-white border border-border rounded-[20px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between bg-soft-cream/40">
              <div>
                <h4 className="text-sm font-bold text-charcoal flex items-center gap-2">
                  <span className="truncate max-w-[280px]">{galleryModal.entry.note || 'Cleaning Proof'}</span>
                  <span className="text-[11px] font-semibold text-sage px-2 py-0.5 rounded-[5px] bg-sage-soft border border-sage/20 shrink-0">
                    {getEntryPhotos(galleryModal.entry).length} Photos
                  </span>
                </h4>
                <p className="text-[11px] text-muted-gray mt-0.5">
                  {galleryModal.entry.cleanerName} • {galleryModal.entry.time} — {galleryModal.entry.date}
                </p>
              </div>


              <button
                onClick={closeGallery}
                className="w-8 h-8 rounded-full bg-charcoal/10 hover:bg-charcoal/20 text-charcoal flex items-center justify-center cursor-pointer transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Main Photo View */}
            {(() => {
              const photos = getEntryPhotos(galleryModal.entry);
              const currentPhoto = photos[galleryModal.activeIdx] || photos[0];

              return (
                <div className="flex-1 flex flex-col overflow-y-auto">
                  <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-charcoal/5 flex items-center justify-center overflow-hidden">
                    {currentPhoto ? (
                      <img
                        src={currentPhoto}
                        alt={`Cleaning photo ${galleryModal.activeIdx + 1}`}
                        className="w-full h-full object-contain bg-black/5"
                      />
                    ) : (
                      <div className="text-center text-muted-gray">
                        <Camera size={32} className="mx-auto mb-1 opacity-40" />
                        <p className="text-xs">No image preview available</p>
                      </div>
                    )}

                    {/* Prev/Next arrows if multiple photos */}
                    {photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={prevGalleryPhoto}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-charcoal/70 text-white hover:bg-charcoal flex items-center justify-center transition-colors cursor-pointer shadow-md"
                          title="Previous photo"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={nextGalleryPhoto}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-charcoal/70 text-white hover:bg-charcoal flex items-center justify-center transition-colors cursor-pointer shadow-md"
                          title="Next photo"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-charcoal/70 text-white text-[11px] font-medium">
                          {galleryModal.activeIdx + 1} / {photos.length}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Navigator Strip */}
                  {photos.length > 1 && (
                    <div className="p-3 border-t border-border/60 bg-soft-cream/30 flex gap-2 overflow-x-auto">
                      {photos.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setGalleryModal((prev) => ({ ...prev, activeIdx: i }))}
                          className={`w-16 h-12 rounded-[8px] overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            galleryModal.activeIdx === i
                              ? 'border-sage ring-2 ring-sage/30'
                              : 'border-border/80 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Notes & Actions Footer */}
                  <div className="p-4 border-t border-border/60 bg-white flex items-center justify-between">
                    <div>
                      {galleryModal.entry.note ? (
                        <>
                          <p className="text-xs font-semibold text-charcoal mb-0.5">Cleaner Note:</p>
                          <p className="text-xs text-muted-gray">{galleryModal.entry.note}</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-gray italic">No notes provided</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(galleryModal.entry.id, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-danger bg-danger-soft/20 hover:bg-danger-soft/40 border border-danger/20 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      Delete Entry
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

