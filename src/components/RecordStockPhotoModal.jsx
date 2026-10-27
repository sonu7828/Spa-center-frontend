import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package,
  FileText,
  Upload,
  Sparkles,
  Check,
  SwitchCamera,
  Layers,
} from 'lucide-react';
import Button from './Button';
import { useOperations } from '../context/OperationsContext';
import { uploadsApi } from '../services/api';

export default function RecordStockPhotoModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProductName = '',
}) {
  const { serviceStock, submitDailyStockAudit } = useOperations();

  const [selectedStockId, setSelectedStockId] = useState('');
  const [productName, setProductName] = useState(defaultProductName || '');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [estimatedRemaining, setEstimatedRemaining] = useState('');
  
  // Camera & Image state
  const [cameraMode, setCameraMode] = useState('camera'); // 'camera' | 'upload'
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
  const fileInputRef = useRef(null);

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
      setCameraError('Camera access not granted or not available on this device.');
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

    // Set initial product
    if (defaultProductName) {
      const match = serviceStock.find(
        (p) => p.name.toLowerCase() === defaultProductName.toLowerCase()
      );
      if (match) {
        setSelectedStockId(match.id);
        setProductName(match.name);
        setIsCustomProduct(false);
      } else {
        setSelectedStockId('custom');
        setProductName(defaultProductName);
        setIsCustomProduct(true);
      }
    } else if (serviceStock.length > 0) {
      setSelectedStockId(serviceStock[0].id);
      setProductName(serviceStock[0].name);
      setIsCustomProduct(false);
    } else {
      setSelectedStockId('custom');
      setProductName('');
      setIsCustomProduct(true);
    }

    setRemarks('');
    setEstimatedRemaining('');
    setCapturedPhoto(null);
    setCameraError('');
    setErrorMsg('');
    setSuccessMsg('');
    setCameraMode('camera');

    // Auto-start camera
    startCamera('environment');

    return () => {
      document.body.style.overflow = originalOverflow;
      stopCamera();
    };
  }, [isOpen, defaultProductName, serviceStock]);

  // Handle Product Selection Change
  const handleProductSelect = (e) => {
    const val = e.target.value;
    setSelectedStockId(val);
    if (val === 'custom') {
      setIsCustomProduct(true);
      setProductName('');
    } else {
      setIsCustomProduct(false);
      const match = serviceStock.find((p) => p.id === val);
      if (match) {
        setProductName(match.name);
      }
    }
  };

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

  // File upload fallback handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedPhoto(event.target.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Submit audit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!productName.trim()) {
      setErrorMsg('Please select or enter the product name');
      return;
    }

    if (!capturedPhoto) {
      setErrorMsg('Please take or upload a live photo of the stock');
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
      const payload = {
        serviceStockId: selectedStockId === 'custom' ? null : selectedStockId || null,
        productName: productName.trim(),
        photoUrl: uploadedUrl,
        publicId,
        remarks: remarks.trim() || null,
        estimatedRemaining: estimatedRemaining.trim() || null,
      };

      const result = await submitDailyStockAudit(payload);

      setSuccessMsg('Stock photo and remarks successfully recorded!');
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
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-border flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage/15 text-sage flex items-center justify-center font-bold">
              <Camera size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">
                End-of-Day Live Stock Photo
              </h3>
              <p className="text-xs text-muted-gray">
                Take live photo of remaining stock with technician remarks
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

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5 flex items-center gap-1.5">
              <Package size={14} className="text-sage" />
              Service Stock Product <span className="text-error">*</span>
            </label>
            <select
              value={selectedStockId}
              onChange={handleProductSelect}
              className="w-full h-10 px-3.5 bg-soft-cream/40 border border-border rounded-xl text-xs sm:text-sm text-charcoal font-medium focus:border-sage focus:ring-1 focus:ring-sage outline-none"
            >
              {serviceStock.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.quantity} {p.unit} remaining)
                </option>
              ))}
              <option value="custom">✏️ Other / Unlisted Product...</option>
            </select>
          </div>

          {/* Custom Product Name Input if selected */}
          {isCustomProduct && (
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Custom Product Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Lavender Aromatherapy Oil, Towel Pack..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-border rounded-xl text-xs sm:text-sm text-charcoal focus:border-sage outline-none"
              />
            </div>
          )}

          {/* Live Camera / Capture Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                <Camera size={14} className="text-sage" />
                Live Stock Picture <span className="text-error">*</span>
              </label>

              {/* Mode switch (Camera vs File) */}
              <div className="flex items-center gap-2">
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="flex items-center gap-1 text-[11px] text-sage hover:text-charcoal font-medium px-2 py-0.5 rounded-lg hover:bg-soft-cream/60 transition-colors cursor-pointer"
                  >
                    <SwitchCamera size={13} />
                    <span>Flip</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (cameraMode === 'camera') {
                      stopCamera();
                      setCameraMode('upload');
                    } else {
                      setCameraMode('camera');
                      startCamera(facingMode);
                    }
                  }}
                  className="text-[11px] text-muted-gray hover:text-charcoal underline"
                >
                  {cameraMode === 'camera' ? 'Choose File instead' : 'Use Live Camera'}
                </button>
              </div>
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
                    <span>Photo Ready</span>
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
              ) : cameraMode === 'camera' ? (
                /* Live Camera Stream */
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  {cameraError ? (
                    <div className="p-4 text-center space-y-2">
                      <AlertCircle size={28} className="mx-auto text-amber-400" />
                      <p className="text-xs text-amber-200">{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-3.5 py-1.5 bg-sage hover:bg-sage/90 text-white rounded-xl text-xs font-bold"
                      >
                        Upload Photo from Device
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
                        <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
                          Frame product & liquid level
                        </span>
                      </div>
                      {/* Snap trigger button */}
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="absolute bottom-4 w-14 h-14 rounded-full border-4 border-white bg-sage/90 hover:bg-sage text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                        title="Take Photo"
                      >
                        <Camera size={24} />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* File Upload Area */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <Upload size={32} className="text-sage mb-2" />
                  <p className="text-xs font-semibold text-white">
                    Click to browse or take photo
                  </p>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    Supports JPG, PNG, WEBP (Camera capture supported)
                  </p>
                </div>
              )}
            </div>

            {/* Hidden file input & canvas */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Estimated Quantity Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1 flex items-center gap-1.5">
              <Layers size={14} className="text-sage" />
              Estimated Stock Left (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. ~150 ml, 2.5 bottles, half tub..."
              value={estimatedRemaining}
              onChange={(e) => setEstimatedRemaining(e.target.value)}
              className="w-full h-10 px-3.5 bg-soft-cream/40 border border-border rounded-xl text-xs sm:text-sm text-charcoal focus:border-sage outline-none"
            />
          </div>

          {/* Written Remarks Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-sage" />
              Technician Remarks / Observations
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Used for 3 massages today. Bottle #1 is almost empty, please prepare refill for tomorrow. No spills."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-3 bg-soft-cream/40 border border-border rounded-xl text-xs sm:text-sm text-charcoal focus:border-sage outline-none resize-none"
            />
            <p className="text-[11px] text-muted-gray mt-1">
              Managers and receptionists will see this remark to follow up on replenishment.
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
            disabled={isSubmitting || !capturedPhoto || !productName.trim()}
            className="text-xs font-bold px-5 h-10 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving Stock Audit...</span>
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
