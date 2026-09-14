/**
 * CleaningUpload — Cleaner-only page
 * Phase 23: Cleaning Multiple Camera Photos Enhancement
 *
 * Flow:
 *   - Real-time device camera capture ONLY (no old file/gallery upload)
 *   - Cleaners point camera and snap live proof photos (1 to 10 photos)
 *   - Snap photos of Toilet, Chairs, Sink, Floor, Mirror, etc.
 *   - Preview captured photos with individual remove [X]
 *   - Full-width balanced single-screen layout (Camera & Photos on left, Form & History on right)
 *   - Uploads directly to Cloudinary and saves in MySQL
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Check,
  Trash2,
  MessageSquare,
  X,
  Layers,
  MapPin,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Video,
  VideoOff,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useCleaning } from '../context/CleaningContext';

export default function CleaningUpload() {
  const { user } = useAuth();
  const { records, addRecord } = useCleaning();

  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Camera stream state - DO NOT auto-open; user clicks Open Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // Default back camera for proof
  const [snapEffect, setSnapEffect] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Gallery Modal state
  const [galleryModal, setGalleryModal] = useState({
    open: false,
    entry: null,
    activeIdx: 0,
  });

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start live camera stream
  const startCamera = useCallback(
    async (targetFacing = facingMode) => {
      setCameraError(null);
      stopCamera();

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API not supported on this browser or device.');
        }

        const constraints = {
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setCameraActive(true);
      } catch (err) {
        console.warn('Camera start error:', err);
        // Fallback to any available camera if environment fails
        if (targetFacing === 'environment') {
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play().catch(() => {});
            }
            setCameraActive(true);
            return;
          } catch (fallbackErr) {
            setCameraError(
              fallbackErr?.message || 'Could not access camera. Please allow camera permissions.'
            );
          }
        } else {
          setCameraError(err?.message || 'Could not access camera. Please allow camera permissions.');
        }
        setCameraActive(false);
      }
    },
    [facingMode, stopCamera]
  );

  // Cleanup camera stream on unmount only (DO NOT auto-start on load)
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Switch between front and rear cameras
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Convert canvas frame to standard File object
  const canvasToFile = (canvas, filename) => {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const file = new File([blob], filename, { type: 'image/jpeg' });
          resolve(file);
        },
        'image/jpeg',
        0.88
      );
    });
  };

  // Snap photo from live video feed
  const handleSnapPhoto = async () => {
    setError(null);
    if (!videoRef.current || !canvasRef.current) return;

    if (capturedPhotos.length >= 10) {
      setError('Maximum 10 photos allowed per cleaning entry');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const preview = canvas.toDataURL('image/jpeg', 0.88);
    const filename = `cleaning-proof-${Date.now()}-${capturedPhotos.length + 1}.jpg`;
    const file = await canvasToFile(canvas, filename);

    if (!file) {
      setError('Failed to capture photo frame. Please try again.');
      return;
    }

    // Shutter flash effect
    setSnapEffect(true);
    setTimeout(() => setSnapEffect(false), 200);

    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      preview,
    };

    setCapturedPhotos((prev) => [...prev, newItem]);
  };

  // Remove photo from captured list
  const handleRemovePhoto = (indexToRemove) => {
    setError(null);
    setCapturedPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Clear all captured photos
  const clearAllPhotos = () => {
    setCapturedPhotos([]);
    setError(null);
  };

  // Submit all captured photos to Cloudinary & MySQL
  const handleSubmit = async () => {
    if (capturedPhotos.length === 0) {
      setError('Take at least 1 camera photo before submitting');
      return;
    }

    if (capturedPhotos.length > 10) {
      setError('Maximum 10 photos allowed per cleaning entry');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const noteText = note.trim();

      await addRecord({
        cleanerName: user?.name || user?.email || 'Cleaner',
        area: 'General Cleaning',
        files: capturedPhotos.map((p) => p.file),
        photos: capturedPhotos.map((p) => p.preview),
        note: noteText,
      });


      // Stop camera after successful submission
      stopCamera();
      setCapturedPhotos([]);
      setNote('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    } catch (err) {
      setError(err?.message || 'Failed to submit cleaning entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show only cleaner's own records
  const ownRecords = records.filter(
    (r) => r.cleanerName === user?.name || r.cleanerId === user?.id
  );

  // Helper to get array of photos for an entry
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

  return (
    <div className="w-full">
      {/* Hidden canvas for video frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      <PageHeader
        title="Cleaning Upload"
        subtitle="Take live camera photos of cleaned areas as proof."
      />

      {/* Main Single-Screen Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT COLUMN: LIVE CAMERA & PHOTO STRIP ================= */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
            {/* Viewfinder Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={15} className="text-sage" />
                  Live Camera
                </h3>
                {cameraActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-soft text-success border border-success/20 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soft-cream text-muted-gray border border-border text-[10px] font-medium">
                    OFF
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {cameraActive ? (
                  <>
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="px-2 py-1 rounded-[7px] bg-soft-cream hover:bg-border/60 text-charcoal text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Flip camera"
                    >
                      <RefreshCw size={11} />
                      Flip
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-2 py-1 rounded-[7px] text-danger hover:bg-danger-soft/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Close Camera"
                    >
                      <VideoOff size={13} />
                      Close Camera
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3 py-1.5 rounded-[8px] bg-sage text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs hover:bg-sage/90"
                  >
                    <Camera size={13} />
                    Open Camera
                  </button>
                )}
              </div>
            </div>

            {/* Live Camera Viewfinder */}
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-[12px] overflow-hidden bg-black flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Shutter flash effect */}
              {snapEffect && (
                <div className="absolute inset-0 bg-white opacity-80 z-20 transition-opacity" />
              )}

              {/* Camera Off Placeholder with Open Camera Button */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-soft-cream/80 text-charcoal z-10 border-2 border-dashed border-border rounded-[12px]">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-2.5 shadow-sm border border-border">
                    <Camera size={24} className="text-sage" />
                  </div>
                  <p className="text-sm font-semibold mb-0.5">Camera is Closed</p>
                  <p className="text-[11px] text-muted-gray max-w-[280px] mb-3">
                    {cameraError || 'Click below to open device camera and take proof photos.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-4 py-2 rounded-full bg-sage text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-sage/90 cursor-pointer shadow-md active:scale-95 transition-transform"
                  >
                    <Camera size={14} />
                    Open Camera
                  </button>
                </div>
              )}

              {/* Viewfinder Overlay Controls */}
              {cameraActive && (
                <div className="absolute inset-x-0 bottom-3 flex items-center justify-center z-10 px-4">
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    disabled={capturedPhotos.length >= 10}
                    className={`px-5 py-2.5 rounded-full bg-sage hover:bg-sage/90 text-white font-bold text-xs flex items-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer border border-white/20 ${
                      capturedPhotos.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                    <span>Snap Photo ({capturedPhotos.length}/10)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Captured Photos Strip */}
            <div className="mt-3.5 pt-3.5 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <Layers size={13} className="text-sage" />
                  Captured Photos ({capturedPhotos.length}/10)
                </span>
                {capturedPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllPhotos}
                    className="text-[11px] text-muted-gray hover:text-danger flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={12} />
                    Clear all
                  </button>
                )}
              </div>

              {capturedPhotos.length === 0 ? (
                <p className="text-[11px] text-muted-gray py-2 text-center bg-soft-cream/60 rounded-[8px] border border-border/50">
                  Open camera and click "Snap Photo" to take cleaning proof photos.
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {capturedPhotos.map((item, idx) => (
                    <div
                      key={item.id}
                      className="relative aspect-video rounded-[8px] overflow-hidden border border-border bg-soft-cream group shadow-xs"
                    >
                      <img
                        src={item.preview}
                        alt={`Capture ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-charcoal/80 text-[8px] text-white font-bold">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-charcoal/85 hover:bg-danger text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                        title="Remove photo"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ENTRY FORM & RECENT ENTRIES ================= */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* New Cleaning Entry Form */}
          <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
            <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider mb-3">
              Cleaning Details
            </h3>

            <div className="space-y-3">
              {/* Validation / Error Message */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-warning-soft text-warning border border-warning/30 text-xs font-semibold">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Single Combined Note Field */}
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-muted-gray mb-1">
                  <MessageSquare size={12} />
                  Note / Cleaning Details
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter cleaning details / notes here..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors resize-none"
                />
                <p className="text-[10px] text-muted-gray mt-1">
                  Add any notes or details about the cleaning.
                </p>
              </div>

              {/* Submit Action */}
              {submitted ? (
                <div className="flex items-center justify-center gap-2 h-[42px] rounded-[12px] bg-success-soft border border-success/20 text-success text-sm font-semibold">
                  <Check size={16} strokeWidth={2.5} />
                  Submitted Successfully!
                </div>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={capturedPhotos.length === 0 || isSubmitting}
                  className={`w-full h-[42px] ${
                    capturedPhotos.length === 0 || isSubmitting
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <Upload size={15} strokeWidth={2} />
                  {isSubmitting
                    ? 'Uploading to Cloudinary...'
                    : `Submit Cleaning Entry (${capturedPhotos.length} Photo${
                        capturedPhotos.length === 1 ? '' : 's'
                      })`}
                </Button>
              )}
            </div>
          </div>

          {/* Own Previous Entries Card */}
          {ownRecords.length > 0 && (
            <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
                  Your Recent Entries ({ownRecords.length})
                </h3>
                <span className="text-[11px] text-muted-gray">Click to view</span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                {ownRecords.map((entry) => {
                  const entryPhotos = getEntryPhotos(entry);
                  const count = entry.photoCount || entryPhotos.length || 1;
                  const thumb = entryPhotos[0] || entry.photo;
                  const displayLabel = entry.note || entry.area || 'Cleaning Proof';

                  return (
                    <div
                      key={entry.id}
                      onClick={() => openGallery(entry)}
                      className="flex gap-2.5 items-center p-2.5 bg-soft-cream/50 border border-border/60 hover:border-sage/60 rounded-[10px] cursor-pointer transition-all hover:bg-soft-cream/80 group"
                    >
                      <div className="relative w-14 h-10 rounded-[6px] overflow-hidden border border-border shrink-0 bg-white">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt="Cleaning proof"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-soft-cream text-muted-gray">
                            <Camera size={14} />
                          </div>
                        )}
                        {count > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 px-0.5 py-0.1 rounded bg-charcoal/80 text-[8px] font-bold text-white leading-none">
                            +{count - 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-charcoal truncate">
                            {displayLabel}
                          </p>
                          <span className="px-1.5 py-0.2 rounded-[4px] bg-sage-soft text-sage border border-sage/20 text-[9px] font-bold shrink-0">
                            {count}P
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-gray">
                          {entry.time} — {entry.date}
                        </p>
                      </div>

                      <Eye size={13} className="text-muted-gray group-hover:text-sage transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Gallery Modal */}
      {galleryModal.open && galleryModal.entry && (
        <div
          className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4"
          onClick={closeGallery}
        >
          <div
            className="relative w-full max-w-[calc(100vw-24px)] sm:max-w-[620px] bg-white border border-border rounded-[20px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-soft-cream/40">
              <div>
                <h4 className="text-sm font-bold text-charcoal flex items-center gap-2">
                  <span>{galleryModal.entry.area || 'Cleaning Proof'}</span>
                  <span className="text-[11px] font-semibold text-sage px-2 py-0.5 rounded-[5px] bg-sage-soft border border-sage/20">
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
                        alt={`Photo ${galleryModal.activeIdx + 1}`}
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
                          className={`w-14 h-11 rounded-[6px] overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
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

                  {/* Notes Footer */}
                  {galleryModal.entry.note && (
                    <div className="p-3.5 border-t border-border/60 bg-white">
                      <p className="text-xs font-semibold text-charcoal mb-0.5">Cleaner Note:</p>
                      <p className="text-xs text-muted-gray">{galleryModal.entry.note}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}


