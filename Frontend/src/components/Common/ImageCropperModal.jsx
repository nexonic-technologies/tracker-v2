import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move, Crop, RefreshCw } from "lucide-react";

/**
 * 1:1 Interactive Image Cropper & Position Matcher Modal
 * Enables user to pan, zoom, rotate, and crop an exact 1:1 circular/square profile picture.
 */
const ImageCropperModal = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  title = "Crop & Match 1:1 Profile Picture"
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Reset transform when image changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
  }, [imageSrc]);

  // Handle Drag / Pan
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom(prev => Math.min(Math.max(1, prev + delta), 3));
  };

  // Generate real-time live 1:1 thumbnail preview
  useEffect(() => {
    if (!imageLoaded || !imageRef.current) return;

    const timer = setTimeout(() => {
      try {
        const previewCanvas = document.createElement("canvas");
        const size = 120;
        previewCanvas.width = size;
        previewCanvas.height = size;
        const ctx = previewCanvas.getContext("2d");

        const img = imageRef.current;
        const naturalWidth = img.naturalWidth || 500;
        const naturalHeight = img.naturalHeight || 500;

        // Container display dimensions
        const cropBoxSize = 260; // Size of the crop frame in pixels
        const scale = (Math.max(naturalWidth, naturalHeight) / cropBoxSize) / zoom;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        const drawWidth = (naturalWidth / scale) * (size / cropBoxSize) * zoom;
        const drawHeight = (naturalHeight / scale) * (size / cropBoxSize) * zoom;
        const drawX = (position.x / cropBoxSize) * size - drawWidth / 2;
        const drawY = (position.y / cropBoxSize) * size - drawHeight / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        setPreviewUrl(previewCanvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        console.warn("Live preview generation failed:", err);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [imageLoaded, zoom, rotation, position]);

  // Perform Final High-Resolution 1:1 Crop
  const handleApplyCrop = () => {
    if (!imageRef.current) return;

    try {
      const exportCanvas = document.createElement("canvas");
      const targetSize = 512; // Standard 1:1 high-resolution avatar dimension
      exportCanvas.width = targetSize;
      exportCanvas.height = targetSize;
      const ctx = exportCanvas.getContext("2d");

      const img = imageRef.current;
      const naturalWidth = img.naturalWidth || 500;
      const naturalHeight = img.naturalHeight || 500;

      // Fill background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetSize, targetSize);

      ctx.save();
      ctx.translate(targetSize / 2, targetSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const cropBoxSize = 260; // Matches visual box in UI
      const scaleFactor = targetSize / cropBoxSize;

      // Base scaling to fit image inside box
      const baseRatio = Math.max(cropBoxSize / naturalWidth, cropBoxSize / naturalHeight);
      const renderWidth = naturalWidth * baseRatio * zoom * scaleFactor;
      const renderHeight = naturalHeight * baseRatio * zoom * scaleFactor;
      const renderX = (position.x * scaleFactor) - (renderWidth / 2);
      const renderY = (position.y * scaleFactor) - (renderHeight / 2);

      ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight);
      ctx.restore();

      exportCanvas.toBlob((blob) => {
        if (!blob) {
          onCancel();
          return;
        }
        const croppedFile = new File([blob], "profile-1x1.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCropComplete(blob, croppedFile);
      }, "image/jpeg", 0.92);
    } catch (err) {
      console.error("Failed to crop image:", err);
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-surface border border-hairline rounded-tracker-xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="p-3 px-4 border-b border-hairline flex items-center justify-between bg-surface-1/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Workspace Canvas & Overlay */}
        <div className="p-4 flex flex-col items-center bg-canvas">
          <p className="text-[10px] text-ink-subtle mb-2.5 flex items-center gap-1">
            <Move size={11} className="text-indigo-500" /> Drag to reposition · Scroll or slide to zoom
          </p>

          {/* 1:1 Crop Viewport Box */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            className="relative w-[260px] h-[260px] rounded-tracker-lg bg-black/90 overflow-hidden cursor-grab active:cursor-grabbing border-2 border-indigo-500/80 shadow-inner select-none flex items-center justify-center"
          >
            {/* Hidden / Rendered Source Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Source"
              onLoad={() => setImageLoaded(true)}
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                maxWidth: "none",
                maxHeight: "none",
                transition: isDragging ? "none" : "transform 0.1s ease-out"
              }}
              className="pointer-events-none object-contain select-none"
            />

            {/* Circular Avatar Guide Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Circular guide cutout */}
              <div className="w-full h-full rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              {/* Rule of thirds grid lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 border border-white/20 pointer-events-none">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
            </div>
          </div>

          {/* Controls Bar (Zoom, Rotate, Reset) */}
          <div className="w-full mt-4 space-y-3 px-1">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(1, prev - 0.1))}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-2 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-600 h-1.5 bg-surface-2 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-2 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <span className="text-[10px] font-mono text-ink-subtle w-8 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Action buttons & Live Preview */}
            <div className="flex items-center justify-between pt-1 border-t border-hairline">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="py-1 px-2 text-[10px] font-medium bg-surface border border-hairline rounded-md text-ink hover:bg-surface-1 flex items-center gap-1 cursor-pointer transition"
                >
                  <RotateCw size={11} /> Rotate 90°
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className="py-1 px-2 text-[10px] font-medium bg-surface border border-hairline rounded-md text-ink-muted hover:text-ink hover:bg-surface-1 flex items-center gap-1 cursor-pointer transition"
                >
                  <RefreshCw size={11} /> Reset
                </button>
              </div>

              {/* Live 1:1 Circular Badge Preview */}
              {previewUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-ink-subtle">Avatar Preview:</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-indigo-500 shadow-2xs">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 px-4 bg-surface border-t border-hairline flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="py-1.5 px-3 text-[11px] font-medium rounded-tracker-md border border-hairline text-ink hover:bg-surface-1 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="py-1.5 px-3.5 text-[11px] font-bold rounded-tracker-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
          >
            <Check size={12} className="stroke-[3]" />
            Apply 1:1 Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
