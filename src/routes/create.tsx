import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Video, X, Loader2 } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<"free" | "subscribers" | "ppv">("free");
  const [price, setPrice] = useState(10);
  const [busy, setBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, kind: "image" | "video") => {
    if (!user) return;
    const maxMB = kind === "video" ? 100 : 15;
    if (file.size > maxMB * 1024 * 1024) {
      return toast.error(`File too large (max ${maxMB}MB)`);
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
    });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setMediaUrl(data.publicUrl);
    setMediaType(kind);
    setPreviewUrl(data.publicUrl);
    setUploading(false);
    toast.success("Uploaded");
  };

  const clearMedia = () => {
    setMediaUrl("");
    setPreviewUrl(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaUrl && !caption.trim()) return toast.error("Add a photo, video or caption");
    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      creator_id: user!.id,
      caption: caption || null,
      media_url: mediaUrl || null,
      media_type: mediaType,
      visibility,
      price: visibility === "ppv" ? price : 0,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Posted");
    qc.invalidateQueries({ queryKey: ["feed"] });
    navigate({ to: "/feed" });
  };

  return (
    <div className="p-5">
      <h1 className="font-serif text-2xl text-gradient-gold">New post</h1>
      <p className="mt-1 text-sm text-muted-foreground">Share an artifact with your audience.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Media">
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-border bg-card">
              {mediaType === "video" ? (
                <video src={previewUrl} controls className="h-64 w-full object-cover" />
              ) : (
                <img src={previewUrl} alt="preview" className="h-64 w-full object-cover" />
              )}
              <button type="button" onClick={clearMedia}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={uploading} onClick={() => photoInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-6 text-sm text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-50">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                Upload photo
              </button>
              <button type="button" disabled={uploading} onClick={() => videoInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-6 text-sm text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-50">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
                Upload video
              </button>
            </div>
          )}
          <input ref={photoInput} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "image")} />
          <input ref={videoInput} type="file" accept="video/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "video")} />
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
          {busy ? "Posting..." : "Publish"}
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
