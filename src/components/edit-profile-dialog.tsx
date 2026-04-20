import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { BannerPositioner } from "@/components/banner-positioner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  isCreator: boolean;
  initial: {
    username: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    banner_position: string;
    subscription_price: number;
  };
}

export function EditProfileDialog({ open, onOpenChange, userId, isCreator, initial }: Props) {
  const qc = useQueryClient();
  const [username, setUsername] = useState(initial.username);
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(initial.banner_url);
  const [bannerPos, setBannerPos] = useState(() => parsePos(initial.banner_position));
  const [price, setPrice] = useState(initial.subscription_price);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File, kind: "avatar" | "banner") => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Image too large (max 10MB)");
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600", contentType: file.type,
      });
      if (error) throw error;
      const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      if (kind === "avatar") setAvatarUrl(url); else setBannerUrl(url);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[a-z0-9_]{3,30}$/i.test(username)) {
      return toast.error("Username: 3–30 chars, letters/numbers/underscore");
    }
    setBusy(true);
    try {
      const { error: pErr } = await supabase.from("profiles")
        .update({ username, display_name: displayName, bio: bio || null, avatar_url: avatarUrl })
        .eq("id", userId);
      if (pErr) throw pErr;

      if (isCreator) {
        const { error: cErr } = await supabase.from("creator_profiles")
          .update({
            banner_url: bannerUrl,
            banner_position: `${bannerPos.x}% ${bannerPos.y}%`,
            subscription_price: price,
          })
          .eq("user_id", userId);
        if (cErr) throw cErr;
      }

      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile-by-username"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gradient-gold">Edit profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-4">
          {/* Banner */}
          {isCreator && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-widest text-muted-foreground">Banner</p>
              {bannerUrl ? (
                <div className="space-y-2">
                  <BannerPositioner src={bannerUrl} position={bannerPos} onChange={setBannerPos} />
                  <button type="button" onClick={() => bannerInput.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs text-gold">
                    <ImagePlus className="h-3.5 w-3.5" /> Replace banner
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => bannerInput.current?.click()}
                  className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-onyx text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
              {uploading === "banner" && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-gold" /> Uploading…
                </p>
              )}
              <input ref={bannerInput} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "banner")} />
            </div>
          )}

          {/* Avatar */}
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-widest text-muted-foreground">Profile photo</p>
            <button type="button" onClick={() => avatarInput.current?.click()}
              className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-onyx">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              {uploading === "avatar" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-5 w-5 animate-spin text-gold" />
                </div>
              )}
            </button>
            <input ref={avatarInput} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "avatar")} />
          </div>

          <Field label="Display name">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 outline-none focus:border-gold" required />
          </Field>
          <Field label="Username">
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 outline-none focus:border-gold" required />
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 outline-none focus:border-gold" />
          </Field>
          {isCreator && (
            <Field label="Subscription price (TKN / month)">
              <input type="number" min={1} step="0.01" value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 outline-none focus:border-gold" />
            </Field>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm">Cancel</button>
            <button disabled={busy || !!uploading}
              className="flex-1 rounded-full bg-gradient-gold py-2.5 text-sm font-medium text-primary-foreground shadow-gold disabled:opacity-50">
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
