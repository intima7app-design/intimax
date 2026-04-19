import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";

export type AspectKey = "1:1" | "4:5" | "16:9";

export const ASPECT_VALUES: Record<AspectKey, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
};

export const ASPECT_LABELS: Record<AspectKey, string> = {
  "1:1": "Square",
  "4:5": "Portrait",
  "16:9": "Landscape",
};

interface ImageCropperProps {
  src: string;
  aspect: AspectKey;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
}

/** Crop an image to the chosen aspect and return the cropped Blob. */
export function ImageCropper({ src, aspect, onCancel, onComplete }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    areaRef.current = areaPixels;
  }, []);

  const handleSave = async () => {
    if (!areaRef.current) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, areaRef.current);
      onComplete(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative h-80 w-full overflow-hidden rounded-xl bg-onyx">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={ASPECT_VALUES[aspect]}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid
          objectFit="contain"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Zoom</span>
        <input type="range" min={1} max={3} step={0.05} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-gold" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm">Cancel</button>
        <button type="button" disabled={busy} onClick={handleSave}
          className="flex-1 rounded-full bg-gradient-gold py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Apply crop"}
        </button>
      </div>
    </div>
  );
}

async function getCroppedBlob(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed"))), "image/jpeg", 0.92),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface VideoFramerProps {
  src: string;
  aspect: AspectKey;
  position: { x: number; y: number };
  onPositionChange: (p: { x: number; y: number }) => void;
}

/**
 * Videos can't be re-encoded in the browser cheaply, so instead we let the
 * creator preview the chosen aspect and reposition the video within the frame.
 * The position is stored on the post and applied with object-position on read.
 */
export function VideoFramer({ src, aspect, position, onPositionChange }: VideoFramerProps) {
  return (
    <div className="space-y-3">
      <div
        className="relative w-full overflow-hidden rounded-xl bg-onyx"
        style={{ aspectRatio: ASPECT_VALUES[aspect] }}
      >
        <video
          src={src}
          muted
          loop
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${position.x}% ${position.y}%` }}
        />
      </div>
      <div className="space-y-2">
        <RangeRow label="Horizontal" value={position.x}
          onChange={(v) => onPositionChange({ ...position, x: v })} />
        <RangeRow label="Vertical" value={position.y}
          onChange={(v) => onPositionChange({ ...position, y: v })} />
      </div>
    </div>
  );
}

function RangeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="range" min={0} max={100} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-gold" />
    </div>
  );
}
