import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  SwitchCamera,
} from 'lucide-react';
import Button from './Button';
import { useOperations } from '../context/OperationsContext';
import { uploadsApi } from '../services/api';

export default function RecordStockPhotoModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const { submitDailyStockAudit } = useOperations();

  const [remarks, setRemarks] = useState('');
  
  // Camera state (strictly live camera, no file upload)
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState('');
  
  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start camera helper
  const startCamera = async (face = facingMode) => {
    stopCamera();
    setCameraError('');
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err1) {
        // Fallback to any available video device
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.warn('Camera access failed:', err);
      setCameraError('Camera access not granted or not available. Please allow camera permissions.');
      setIsCameraActive(false);
    }
  };

  // Toggle between front and back camera
  const toggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // Reset modal state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setRemarks('');
    setCapturedPhoto(null);
    setCameraError('');
    setErrorMsg('');
    setSuccessMsg('');

    // Auto-start live camera
    startCamera('environment');

    return () => {
      document.body.style.overflow = originalOverflow;
      stopCamera();
    };
  }, [isOpen]);

  // Snap photo from video element
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  // Retake photo
  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  // Submit audit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!capturedPhoto) {
      setErrorMsg('Please take a live photo of the remaining stock');
      return;
    }

    if (!remarks.trim()) {
      setErrorMsg('Please write your remarks/details about the remaining stock');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload photo to Cloudinary
      let uploadedUrl = capturedPhoto;
      let publicId = null;

      try {
        const uploadRes = await uploadsApi.uploadImage(capturedPhoto, `stock_${Date.now()}`);
        if (uploadRes?.data?.url) {
          uploadedUrl = uploadRes.data.url;
          publicId = uploadRes.data.publicId || null;
        }
      } catch (uploadErr) {
        console.warn('Cloudinary upload warning (using base64/fallback):', uploadErr);
      }

      // 2. Submit Daily Audit record
      // Extract first few words of remarks for productName to satisfy backend requirement cleanly
      const firstLine = remarks.trim().split('\n')[0].trim();
      const productTitle = firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;

      const payload = {
        serviceStockId: null,
        productName: productTitle || 'End-of-Day Stock Proof',
        photoUrl: uploadedUrl,
        publicId,
        remarks: remarks.trim(),
        estimatedRemaining: null,
      };

      const result = await submitDailyStockAudit(payload);

      setSuccessMsg('Live stock photo and remarks successfully submitted!');
      setTimeout(() => {
        if (onSuccess) onSuccess(result);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to submit stock audit:', err);
      setErrorMsg(err.message || 'Failed to submit stock audit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-charcoal/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-border flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage/15 text-sage flex items-center justify-center font-bold">
              <Camera size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">
                End-of-Day Stock Photo
              </h3>
              <p className="text-xs text-muted-gray">
                Take live picture of remaining products with remarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-gray hover:text-charcoal hover:bg-soft-cream/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/30 text-error rounded-xl text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-medium">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Live Camera Viewfinder (Strictly Live Photo Only) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                <Camera size={14} className="text-sage" />
                Live Camera Proof <span className="text-error">*</span>
              </label>

              {isCameraActive && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="flex items-center gap-1 text-[11px] text-sage hover:text-charcoal font-semibold px-2 py-0.5 rounded-lg hover:bg-soft-cream/60 transition-colors cursor-pointer"
                >
                  <SwitchCamera size={13} />
                  <span>Flip Camera</span>
                </button>
              )}
            </div>

            {/* Viewfinder or Captured Image */}
            <div className="relative w-full aspect-4/3 bg-charcoal/90 rounded-2xl overflow-hidden border-2 border-border shadow-inner flex flex-col items-center justify-center text-white">
              {capturedPhoto ? (
                /* Captured Image View */
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <img
                    src={capturedPhoto}
                    alt="Captured Stock"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check size={13} />
                    <span>Live Photo Captured</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 hover:bg-white text-charcoal rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Retake</span>
                  </button>
                </div>
              ) : (
                /* Live Camera Stream */
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  {cameraError ? (
                    <div className="p-4 text-center space-y-2">
                      <AlertCircle size={28} className="mx-auto text-amber-400" />
                      <p className="text-xs text-amber-200">{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => startCamera(facingMode)}
                        className="mt-2 px-3.5 py-1.5 bg-sage hover:bg-sage/90 text-white rounded-xl text-xs font-bold"
                      >
                        Try Camera Again
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Aim overlay guideline */}
                      <div className="absolute inset-8 border border-white/40 border-dashed rounded-xl pointer-events-none flex items-end justify-center pb-2">
                        <span className="text-[10px] text-white/80 bg-black/40 px-2.5 py-0.5 rounded-full">
                          Frame remaining stock & bottles
                        </span>
                      </div>
                      {/* Snap trigger button */}
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="absolute bottom-4 w-14 h-14 rounded-full border-4 border-white bg-sage/90 hover:bg-sage text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                        title="Take Live Photo"
                      >
                        <Camera size={24} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Written Remarks Input (Where technician writes all details) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-sage" />
              Remarks & Details of Remaining Stock <span className="text-error">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Essential oil 1 bottle left (~200ml), massage cream low, towels stocked. Prepared for tomorrow."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-3.5 bg-soft-cream/40 border border-border rounded-xl text-xs sm:text-sm text-charcoal focus:border-sage outline-none resize-none font-medium leading-relaxed"
            />
            <p className="text-[11px] text-muted-gray mt-1">
              The manager and receptionist will read these remarks to follow up on what stock is left.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 z-10 px-5 py-4 bg-white/95 backdrop-blur border-t border-border flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !capturedPhoto || !remarks.trim()}
            className="text-xs font-bold px-5 h-10 flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Submitting Proof...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Submit End-of-Day Audit</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
