// src/components/DocumentEditorModal.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Crop,
  Pencil,
  Circle,
  Minus,
  RotateCw,
  Undo2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";

type ToolMode = "crop" | "pen" | "circle" | "line";
type DragHandle = "move" | "nw" | "ne" | "sw" | "se" | null;

interface Point {
  x: number; // Normalized 0..1
  y: number; // Normalized 0..1
}

interface Stroke {
  type: "pen" | "circle" | "line";
  color: string;
  sizeRatio: number;
  points: Point[];
}

interface CropRect {
  x: number; // Normalized 0..1
  y: number;
  w: number;
  h: number;
}

interface DocumentEditorModalProps {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  onClose: () => void;
  onSave: (file: File, previewUrl: string) => void;
}

const COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#facc15" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#0f172a" },
];

const BRUSH_SIZES = [
  { label: "S", ratio: 0.006, dot: "w-2 h-2" },
  { label: "M", ratio: 0.012, dot: "w-3 h-3" },
  { label: "L", ratio: 0.022, dot: "w-4 h-4" },
];

const DEFAULT_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };
const MIN_CROP = 0.12;

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

const drawStrokeOnCtx = (
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number
) => {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(2, stroke.sizeRatio * Math.min(width, height));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.type === "pen") {
    ctx.beginPath();
    const first = stroke.points[0];
    ctx.moveTo(first.x * width, first.y * height);
    if (stroke.points.length === 1) {
      ctx.lineTo(first.x * width + 0.1, first.y * height + 0.1);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
      }
    }
    ctx.stroke();
  } else if (stroke.type === "line" && stroke.points.length >= 2) {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  } else if (stroke.type === "circle" && stroke.points.length >= 2) {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    const cx = ((start.x + end.x) / 2) * width;
    const cy = ((start.y + end.y) / 2) * height;
    const rx = (Math.abs(end.x - start.x) / 2) * width;
    const ry = (Math.abs(end.y - start.y) / 2) * height;

    if (rx > 1 && ry > 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
};

export default function DocumentEditorModal({
  isOpen,
  imageSrc,
  title = "Edit Document",
  onClose,
  onSave,
}: DocumentEditorModalProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workingImgRef = useRef<HTMLImageElement | null>(null);
  const internalBlobUrlsRef = useRef<string[]>([]);

  // Image & Stage State
  const [originalSafeSrc, setOriginalSafeSrc] = useState<string>("");
  const [workingSrc, setWorkingSrc] = useState<string>("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [stageBox, setStageBox] = useState({ w: 320, h: 420 });
  const [displaySize, setDisplaySize] = useState({ w: 300, h: 300 });

  // Editor Tool State
  const [mode, setMode] = useState<ToolMode>("crop");
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [sizeRatio, setSizeRatio] = useState<number>(BRUSH_SIZES[1].ratio);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);

  // Crop State
  const [crop, setCrop] = useState<CropRect>(DEFAULT_CROP);
  const cropDragRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  const registerInternalUrl = (url: string) => {
    internalBlobUrlsRef.current.push(url);
    return url;
  };

  // Cleanup internal blob URLs on close/unmount
  useEffect(() => {
    if (!isOpen) {
      internalBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      internalBlobUrlsRef.current = [];
      return;
    }

    let cancelled = false;
    setIsPreparing(true);
    setImgLoaded(false);
    setStrokes([]);
    setActiveStroke(null);
    setCrop(DEFAULT_CROP);
    setMode("crop");

    const loadSafeImage = async () => {
      try {
        // Fetch remote HTTPS URLs into a local Blob URL to avoid iOS Safari CORS canvas taint
        if (imageSrc.startsWith("http")) {
          const res = await fetch(imageSrc, { mode: "cors", cache: "no-cache" });
          const blob = await res.blob();
          if (cancelled) return;
          const localUrl = registerInternalUrl(URL.createObjectURL(blob));
          setOriginalSafeSrc(localUrl);
          setWorkingSrc(localUrl);
        } else {
          setOriginalSafeSrc(imageSrc);
          setWorkingSrc(imageSrc);
        }
      } catch {
        if (!cancelled) {
          setOriginalSafeSrc(imageSrc);
          setWorkingSrc(imageSrc);
        }
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    };

    loadSafeImage();
    return () => {
      cancelled = true;
    };
  }, [isOpen, imageSrc]);

  // Measure available stage container
  useEffect(() => {
    if (!isOpen || !stageRef.current) return;
    const el = stageRef.current;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageBox({
          w: Math.max(120, rect.width - 24),
          h: Math.max(120, rect.height - 24),
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  // Load workingSrc into HTMLImageElement
  useEffect(() => {
    if (!isOpen || !workingSrc) return;
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      workingImgRef.current = img;
      setImgLoaded(true);
    };
    img.src = workingSrc;
  }, [isOpen, workingSrc]);

  // Compute exact display dimensions preserving aspect ratio
  useEffect(() => {
    const img = workingImgRef.current;
    if (!imgLoaded || !img || !img.naturalWidth || !img.naturalHeight) return;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = stageBox.w / stageBox.h;

    let w = stageBox.w;
    let h = stageBox.h;
    if (imgRatio > boxRatio) {
      h = w / imgRatio;
    } else {
      w = h * imgRatio;
    }
    setDisplaySize({ w: Math.round(w), h: Math.round(h) });
  }, [imgLoaded, stageBox]);

  // Render image + all strokes onto display canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = workingImgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(displaySize.w * dpr);
    canvas.height = Math.round(displaySize.h * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displaySize.w, displaySize.h);
    ctx.drawImage(img, 0, 0, displaySize.w, displaySize.h);

    strokes.forEach((s) => drawStrokeOnCtx(ctx, s, displaySize.w, displaySize.h));
    if (activeStroke) {
      drawStrokeOnCtx(ctx, activeStroke, displaySize.w, displaySize.h);
    }
  }, [imgLoaded, displaySize, strokes, activeStroke]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // --- CROP & ROTATE OPERATIONS ---
  const isCropModified =
    crop.x > 0.005 ||
    crop.y > 0.005 ||
    crop.w < 0.995 ||
    crop.h < 0.995;

  const bakeCurrentCrop = async (): Promise<string | null> => {
    const img = workingImgRef.current;
    if (!img || !isCropModified) return workingSrc;

    const sx = Math.round(crop.x * img.naturalWidth);
    const sy = Math.round(crop.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(crop.w * img.naturalWidth));
    const sh = Math.max(1, Math.round(crop.h * img.naturalHeight));

    const offscreen = document.createElement("canvas");
    offscreen.width = sw;
    offscreen.height = sh;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // Remap existing strokes into cropped coordinate space
    const remappedStrokes: Stroke[] = strokes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({
        x: (p.x - crop.x) / crop.w,
        y: (p.y - crop.y) / crop.h,
      })),
    }));

    return new Promise((resolve) => {
      offscreen.toBlob(
        (blob) => {
          if (!blob) return resolve(null);
          const nextUrl = registerInternalUrl(URL.createObjectURL(blob));
          setWorkingSrc(nextUrl);
          setStrokes(remappedStrokes);
          setCrop(DEFAULT_CROP);
          resolve(nextUrl);
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleRotate90 = async () => {
    const img = workingImgRef.current;
    if (!img) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = img.naturalHeight;
    offscreen.height = img.naturalWidth;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.translate(offscreen.width / 2, offscreen.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    // Rotate existing strokes 90 deg clockwise: (x, y) -> (1 - y, x)
    const rotatedStrokes: Stroke[] = strokes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ x: 1 - p.y, y: p.x })),
    }));

    offscreen.toBlob(
      (blob) => {
        if (!blob) return;
        const nextUrl = registerInternalUrl(URL.createObjectURL(blob));
        setWorkingSrc(nextUrl);
        setStrokes(rotatedStrokes);
        setCrop(DEFAULT_CROP);
      },
      "image/jpeg",
      0.95
    );
  };

  const handleSwitchMode = async (nextMode: ToolMode) => {
    // If leaving crop mode with an adjusted box, apply crop automatically so drawing aligns
    if (mode === "crop" && nextMode !== "crop" && isCropModified) {
      await bakeCurrentCrop();
    }
    setMode(nextMode);
  };

  const handleResetAll = () => {
    if (!originalSafeSrc) return;
    setWorkingSrc(originalSafeSrc);
    setStrokes([]);
    setActiveStroke(null);
    setCrop(DEFAULT_CROP);
    setMode("crop");
  };

  // --- CROP POINTER HANDLERS ---
  const startCropDrag = (handle: DragHandle, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    cropDragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const moveCropDrag = (e: React.PointerEvent) => {
    const drag = cropDragRef.current;
    if (!drag || displaySize.w === 0 || displaySize.h === 0) return;
    e.stopPropagation();

    const dx = (e.clientX - drag.startX) / displaySize.w;
    const dy = (e.clientY - drag.startY) / displaySize.h;
    const s = drag.startCrop;
    let next = { ...s };

    if (drag.handle === "move") {
      next.x = clamp(s.x + dx, 0, 1 - s.w);
      next.y = clamp(s.y + dy, 0, 1 - s.h);
    } else if (drag.handle === "nw") {
      const nx = clamp(s.x + dx, 0, s.x + s.w - MIN_CROP);
      const ny = clamp(s.y + dy, 0, s.y + s.h - MIN_CROP);
      next = { x: nx, y: ny, w: s.x + s.w - nx, h: s.y + s.h - ny };
    } else if (drag.handle === "ne") {
      const nw = clamp(s.w + dx, MIN_CROP, 1 - s.x);
      const ny = clamp(s.y + dy, 0, s.y + s.h - MIN_CROP);
      next = { x: s.x, y: ny, w: nw, h: s.y + s.h - ny };
    } else if (drag.handle === "sw") {
      const nx = clamp(s.x + dx, 0, s.x + s.w - MIN_CROP);
      const nh = clamp(s.h + dy, MIN_CROP, 1 - s.y);
      next = { x: nx, y: s.y, w: s.x + s.w - nx, h: nh };
    } else if (drag.handle === "se") {
      const nw = clamp(s.w + dx, MIN_CROP, 1 - s.x);
      const nh = clamp(s.h + dy, MIN_CROP, 1 - s.y);
      next = { x: s.x, y: s.y, w: nw, h: nh };
    }

    setCrop(next);
  };

  const endCropDrag = () => {
    cropDragRef.current = null;
  };

  // --- DRAWING POINTER HANDLERS ---
  const getNormalizedPoint = (e: React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const handleDrawDown = (e: React.PointerEvent) => {
    if (mode === "crop") return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveStroke({
      type: mode,
      color,
      sizeRatio,
      points: [pt],
    });
  };

  const handleDrawMove = (e: React.PointerEvent) => {
    if (!activeStroke || mode === "crop") return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    setActiveStroke((prev) => {
      if (!prev) return null;
      if (prev.type === "pen") {
        return { ...prev, points: [...prev.points, pt] };
      }
      // For circle & straight line, keep start point + current end point
      return { ...prev, points: [prev.points[0], pt] };
    });
  };

  const handleDrawUp = () => {
    if (!activeStroke) return;
    setStrokes((prev) => [...prev, activeStroke]);
    setActiveStroke(null);
  };

  // --- FINAL HIGH-RES EXPORT ---
  const handleFinalSave = async () => {
    const img = workingImgRef.current;
    if (!img || isExporting) return;
    setIsExporting(true);

    try {
      const useCrop = mode === "crop" && isCropModified ? crop : DEFAULT_CROP;
      const sx = Math.round(useCrop.x * img.naturalWidth);
      const sy = Math.round(useCrop.y * img.naturalHeight);
      const sw = Math.max(1, Math.round(useCrop.w * img.naturalWidth));
      const sh = Math.max(1, Math.round(useCrop.h * img.naturalHeight));

      // Cap max dimension at 1600px for crisp docs & fast mobile upload
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const outW = Math.max(1, Math.round(sw * scale));
      const outH = Math.max(1, Math.round(sh * scale));

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW;
      outCanvas.height = outH;
      const ctx = outCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      // Draw cropped image
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      // Replay all strokes mapped to exported crop region
      strokes.forEach((s) => {
        const mapped: Stroke = {
          ...s,
          points: s.points.map((p) => ({
            x: (p.x - useCrop.x) / useCrop.w,
            y: (p.y - useCrop.y) / useCrop.h,
          })),
        };
        drawStrokeOnCtx(ctx, mapped, outW, outH);
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        outCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Export failed");

      const file = new File([blob], `doc_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(blob);
      onSave(file, previewUrl);
    } catch (error) {
      console.error("Document export error:", error);
      alert("Could not save edited image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-slate-950 text-white flex flex-col select-none animate-in fade-in duration-150">
      {/* Top Bar */}
      <div className="px-4 py-3.5 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border-none cursor-pointer"
          title="Cancel"
        >
          <X size={18} />
        </button>

        <div className="text-center min-w-0 px-2">
          <h3 className="text-sm font-black tracking-wide truncate">{title}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {mode === "crop"
              ? "Drag Corners to Crop"
              : mode === "pen"
              ? "Freehand Draw"
              : mode === "circle"
              ? "Drag to Circle"
              : "Drag to Draw Line"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleFinalSave}
          disabled={isExporting || !imgLoaded}
          className="px-3.5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 border-none cursor-pointer shadow-lg shadow-blue-600/30"
        >
          {isExporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          Done
        </button>
      </div>

      {/* Main Canvas Stage */}
      <div
        ref={stageRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center p-3 overflow-hidden relative"
      >
        {isPreparing || !imgLoaded ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <span className="text-xs font-bold">Loading document...</span>
          </div>
        ) : (
          <div
            style={{ width: displaySize.w, height: displaySize.h }}
            className="relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/15 bg-black"
          >
            {/* Drawing + Image Canvas */}
            <canvas
              ref={canvasRef}
              onPointerDown={handleDrawDown}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawUp}
              onPointerCancel={handleDrawUp}
              style={{ width: displaySize.w, height: displaySize.h }}
              className={cn(
                "block touch-none",
                mode !== "crop" && "cursor-crosshair"
              )}
            />

            {/* Interactive Crop Overlay */}
            {mode === "crop" && (
              <div className="absolute inset-0 pointer-events-none">
                {/* 4 Dimmed Outer Regions */}
                <div
                  className="absolute top-0 left-0 right-0 bg-black/60"
                  style={{ height: `${crop.y * 100}%` }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/60"
                  style={{ height: `${(1 - crop.y - crop.h) * 100}%` }}
                />
                <div
                  className="absolute bg-black/60"
                  style={{
                    top: `${crop.y * 100}%`,
                    height: `${crop.h * 100}%`,
                    left: 0,
                    width: `${crop.x * 100}%`,
                  }}
                />
                <div
                  className="absolute bg-black/60"
                  style={{
                    top: `${crop.y * 100}%`,
                    height: `${crop.h * 100}%`,
                    right: 0,
                    width: `${(1 - crop.x - crop.w) * 100}%`,
                  }}
                />

                {/* Active Crop Frame */}
                <div
                  onPointerDown={(e) => startCropDrag("move", e)}
                  onPointerMove={moveCropDrag}
                  onPointerUp={endCropDrag}
                  onPointerCancel={endCropDrag}
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                  }}
                  className="absolute border-2 border-white pointer-events-auto touch-none cursor-move"
                >
                  {/* Rule-of-Thirds Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/20" />
                    ))}
                  </div>

                  {/* Corner Handles (Large touch target) */}
                  <div
                    onPointerDown={(e) => startCropDrag("nw", e)}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center touch-none cursor-nwse-resize"
                  >
                    <div className="w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-sm" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag("ne", e)}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center touch-none cursor-nesw-resize"
                  >
                    <div className="w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-sm" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag("sw", e)}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -bottom-3 -left-3 w-8 h-8 flex items-center justify-center touch-none cursor-nesw-resize"
                  >
                    <div className="w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-sm" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag("se", e)}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -bottom-3 -right-3 w-8 h-8 flex items-center justify-center touch-none cursor-nwse-resize"
                  >
                    <div className="w-4 h-4 border-b-4 border-r-4 border-white rounded-br-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Dock */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-5 space-y-3 shrink-0">
        {/* Contextual Sub-Bar: Crop Actions OR Color/Brush Picker */}
        {mode === "crop" ? (
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleRotate90}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5 border-none cursor-pointer"
            >
              <RotateCw size={14} /> Rotate 90°
            </button>
            {isCropModified && (
              <button
                type="button"
                onClick={bakeCurrentCrop}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white flex items-center gap-1.5 border-none cursor-pointer"
              >
                <Check size={14} /> Apply Crop
              </button>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-300 flex items-center gap-1.5 border-none cursor-pointer"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
            {/* Colors */}
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 cursor-pointer transition-transform",
                    color === c.value
                      ? "border-white scale-125 ring-2 ring-blue-500"
                      : "border-white/30"
                  )}
                />
              ))}
            </div>

            {/* Brush Thickness */}
            <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-full">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setSizeRatio(b.ratio)}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors",
                    sizeRatio === b.ratio ? "bg-white text-slate-950" : "bg-transparent text-white/70"
                  )}
                >
                  <span
                    className={cn(
                      "rounded-full block",
                      b.dot,
                      sizeRatio === b.ratio ? "bg-slate-950" : "bg-white"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Primary Tool Switcher + Undo */}
        <div className="flex items-center justify-between gap-1.5 max-w-md mx-auto pt-1">
          {[
            { id: "crop", label: "Crop", icon: Crop },
            { id: "pen", label: "Pencil", icon: Pencil },
            { id: "circle", label: "Circle", icon: Circle },
            { id: "line", label: "Line", icon: Minus },
          ].map((tool) => {
            const IconComp = tool.icon;
            const active = mode === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleSwitchMode(tool.id as ToolMode)}
                className={cn(
                  "flex-1 py-2.5 rounded-2xl flex flex-col items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider border-none cursor-pointer transition-all",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <IconComp size={18} />
                <span>{tool.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setStrokes((prev) => prev.slice(0, -1))}
            disabled={strokes.length === 0}
            className="px-3.5 py-2.5 rounded-2xl flex flex-col items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 border-none cursor-pointer"
            title="Undo Last Stroke"
          >
            <Undo2 size={18} />
            <span>Undo</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}