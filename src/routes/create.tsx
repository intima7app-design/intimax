import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Video, X, Loader2, Crop } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  ImageCropper, VideoFramer, ASPECT_VALUES, ASPECT_LABELS, type AspectKey,
} from "@/components/media-cropper";

export const Route = createFileRoute("/create")({
  component: () => (<RequireAuth><AppShell><CreatePage /></AppShell></RequireAuth>),
});

function CreatePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  // For images: object URL of the original source while cropping.
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  // After crop, this is the publicly hosted, cropped image URL.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // For videos: object URL for in-browser preview while framing.
  const [videoLocalSrc, setVideoLocalSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [aspect, setAspect] = useState<AspectKey>("1:1");
  const [videoPosition, setVideoPosition] = useState({ x: 50, y: 50 });
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<"free" | "subscribers" | "ppv">("free");
  const [price, setPrice] = useState(10);
  const [busy, setBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const handlePhotoFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) return toast.error("Photo too large (max 15MB)");
    setMediaType("image");
    setRawImageSrc(URL.createObjectURL(file));
    setPreviewUrl(null);
    setMediaUrl("");
  };

  const handleVideoFile = (file: File) => {
    if (file.size > 100 * 1024 * 1024) return toast.error("Video too large (max 100MB)");
    setMediaType("video");
    setVideoFile(file);
    setVideoLocalSrc(URL.createObjectURL(file));
    setMediaUrl("");
    setPreviewUrl(null);
  };

  const uploadBlob = async (blob: Blob, ext: string): Promise<string> => {
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, blob, {
      cacheControl: "3600",
      contentType: blob.type || (ext === "mp4" ? "video/mp4" : "image/jpeg"),
    });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

  const handleCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const url = await uploadBlob(blob, "jpg");
      setMediaUrl(url);
      setPreviewUrl(url);
      if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
      toast.success("Image ready");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearMedia = () => {
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    if (videoLocalSrc) URL.revokeObjectURL(videoLocalSrc);
    setRawImageSrc(null);
    setVideoLocalSrc(null);
    setVideoFile(null);
    setMediaUrl("");
    setPreviewUrl(null);
    setVideoPosition({ x: 50, y: 50 });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (mediaType === "image" && rawImageSrc && !mediaUrl) {
      return toast.error("Apply the crop before publishing");
    }
    setBusy(true);
    try {
      let finalUrl = mediaUrl;
      // Upload the video on submit (after the user has picked aspect + position).
      if (mediaType === "video" && videoFile && !finalUrl) {
        setUploading(true);
        const ext = videoFile.name.split(".").pop() || "mp4";
        finalUrl = await uploadBlob(videoFile, ext);
        setMediaUrl(finalUrl);
        setUploading(false);
      }
      if (!finalUrl && !caption.trim()) {
        setBusy(false);
        return toast.error("Add a photo, video or caption");
      }
      const { error } = await supabase.from("posts").insert({
        creator_id: user.id,
        caption: caption || null,
        media_url: finalUrl || null,
        media_type: mediaType,
        visibility,
        price: visibility === "ppv" ? price : 0,
        aspect_ratio: aspect,
        media_position: mediaType === "video" ? `${videoPosition.x}% ${videoPosition.y}%` : null,
      });
      if (error) throw error;
      toast.success("Posted");
      qc.invalidateQueries({ queryKey: ["feed"] });
      navigate({ to: "/feed" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not publish");
    } finally {
      setBusy(false);
    }
  };

  const hasMedia = !!(rawImageSrc || videoLocalSrc || previewUrl);

  return (
    <div className="p-5 pb-24">
      <h1 className="font-serif text-2xl text-gradient-gold">New post</h1>
      <p className="mt-1 text-sm text-muted-foreground">Share an artifact with your audience.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {/* Aspect picker */}
        <Field label="Format">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ASPECT_VALUES) as AspectKey[]).map((k) => (
              <button type="button" key={k} onClick={() => setAspect(k)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs transition ${
                  aspect === k ? "border-gold bg-gold/10 text-gold" : "border-border bg-card text-muted-foreground"
                }`}>
                <span className="block bg-current"
                  style={{ width: 22, height: 22 / ASPECT_VALUES[k] }} />
                <span className="font-medium">{ASPECT_LABELS[k]}</span>
                <span className="opacity-60">{k}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Media area */}
        <Field label="Media">
          {!hasMedia && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => photoInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-6 text-sm text-muted-foreground transition hover:border-gold hover:text-gold">
                <ImagePlus className="h-5 w-5" />
                Upload photo
              </button>
              <button type="button" onClick={() => videoInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-6 text-sm text-muted-foreground transition hover:border-gold hover:text-gold">
                <Video className="h-5 w-5" />
                Upload video
              </button>
            </div>
          )}

          {/* Image cropping flow */}
          {rawImageSrc && !previewUrl && (
            <ImageCropper src={rawImageSrc} aspect={aspect}
              onCancel={clearMedia} onComplete={handleCropComplete} />
          )}

          {/* Video framing flow */}
          {videoLocalSrc && (
            <div className="space-y-2">
              <VideoFramer src={videoLocalSrc} aspect={aspect}
                position={videoPosition} onPositionChange={setVideoPosition} />
              <div className="flex gap-2">
                <button type="button" onClick={clearMedia}
                  className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm">Replace</button>
              </div>
            </div>
          )}

          {/* Final image preview */}
          {previewUrl && mediaType === "image" && (
            <div className="space-y-2">
              <div className="relative w-full overflow-hidden rounded-xl bg-onyx"
                style={{ aspectRatio: ASPECT_VALUES[aspect] }}>
                <img src={previewUrl} alt="preview" className="absolute inset-0 h-full w-full object-cover" />
                <button type="button" onClick={clearMedia}
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={() => {
                // Re-open cropper with the same uploaded image
                setRawImageSrc(previewUrl);
                setPreviewUrl(null);
                setMediaUrl("");
              }}
                className="inline-flex items-center gap-1.5 text-xs text-gold">
                <Crop className="h-3.5 w-3.5" /> Re-crop
              </button>
            </div>
          )}

          <input ref={photoInput} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
          <input ref={videoInput} type="file" accept="video/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])} />
        </Field>

        <Field label="Caption">
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-gold" />
        </Field>
        <Field label="Visibility">
          <div className="grid grid-cols-3 gap-2">
            {(["free", "subscribers", "ppv"] as const).map((v) => (
              <button type="button" key={v} onClick={() => setVisibility(v)}
                className={`rounded-xl border px-3 py-2.5 text-sm capitalize transition ${
                  visibility === v ? "border-gold bg-gold/10 text-gold" : "border-border bg-card text-muted-foreground"
                }`}>{v}</button>
            ))}
          </div>
        </Field>
        {visibility === "ppv" && (
          <Field label="PPV price (TKN)">
            <input type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-gold" />
          </Field>
        )}
        <button disabled={busy || uploading} className="w-full rounded-full bg-gradient-gold py-3 font-medium text-primary-foreground shadow-gold disabled:opacity-50">
          {busy || uploading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Publish"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
