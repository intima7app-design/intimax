import { useRef, useState, type PointerEvent as RPointerEvent } from "react";

interface Props {
  src: string;
  position: { x: number; y: number };
  onChange: (p: { x: number; y: number }) => void;
}

/** Drag-to-reposition tool for banner photos. Stores 0-100% object-position. */
export function BannerPositioner({ src, position, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDown = (e: RPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: RPointerEvent) => {
    if (!dragging || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.movementX / r.width) * 100;
    const dy = (e.movementY / r.height) * 100;
    // Drag intuitively: pulling the image right shows the left side.
    onChange({
      x: clamp(position.x - dx),
      y: clamp(position.y - dy),
    });
  };
  const onUp = () => setDragging(false);

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative h-32 w-full cursor-grab touch-none overflow-hidden rounded-xl border border-border bg-onyx active:cursor-grabbing"
      >
        <img
          src={src}
          alt="banner"
          draggable={false}
          className="h-full w-full select-none object-cover"
          style={{ objectPosition: `${position.x}% ${position.y}%` }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-[10px] uppercase tracking-widest text-white/80">
          Drag to reposition
        </div>
      </div>
      <div className="space-y-1.5">
        <Range label="Horizontal" value={position.x} onChange={(v) => onChange({ ...position, x: v })} />
        <Range label="Vertical" value={position.y} onChange={(v) => onChange({ ...position, y: v })} />
      </div>
    </div>
  );
}

function Range({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="range" min={0} max={100} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-gold" />
    </div>
  );
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
