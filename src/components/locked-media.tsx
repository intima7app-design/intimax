import { Lock, Crown, Sparkles } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { unlockContent, subscribeToCreator } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface Props {
  contentType: "post" | "reel" | "message";
  contentId: string;
  visibility: "free" | "subscribers" | "ppv";
  price: number;
  creatorId: string;
  creatorPrice?: number;
  isUnlocked: boolean;
  isSubscribed: boolean;
  isOwner: boolean;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  /** CSS aspect-ratio value, e.g. "1 / 1", "4 / 5", "16 / 9". */
  aspectRatio?: string;
  /** CSS object-position value, e.g. "50% 50%". Used for videos. */
  mediaPosition?: string | null;
  className?: string;
  children?: React.ReactNode;
}

export function LockedMedia({
  contentType, contentId, visibility, price, creatorId, creatorPrice = 9.99,
  isUnlocked, isSubscribed, isOwner, mediaUrl, mediaType = "image",
  aspectRatio = "4 / 5", mediaPosition, className, children,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const accessible =
    isOwner ||
    visibility === "free" ||
    (visibility === "subscribers" && isSubscribed) ||
    (visibility === "ppv" && isUnlocked);

  const handleUnlock = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await unlockContent(contentType, contentId, price, user.id);
      toast.success(`Unlocked for ${price} tokens`);
      qc.invalidateQueries({ queryKey: ["tokens"] });
      qc.invalidateQueries({ queryKey: ["unlocks"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not unlock");
    } finally {
      setBusy(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await subscribeToCreator(user.id, creatorId, creatorPrice);
      toast.success("Subscribed");
      qc.invalidateQueries({ queryKey: ["tokens"] });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not subscribe");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-2xl bg-onyx", className)}
      style={{ aspectRatio }}
    >
      {mediaUrl ? (
        mediaType === "video" ? (
          <video
            src={mediaUrl}
            controls={accessible}
            playsInline
            preload="metadata"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition",
              !accessible && "scale-110 blur-2xl opacity-50",
            )}
            style={{ objectPosition: mediaPosition ?? "50% 50%" }}
          />
        ) : (
          <img
            src={mediaUrl}
            alt=""
            loading="lazy"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition",
              !accessible && "scale-110 blur-2xl opacity-50",
            )}
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-onyx to-background" />
      )}

      {children}

      {!accessible && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-gold/20 bg-background/85 p-6 text-center backdrop-blur-xl shadow-elegant">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground">
              {visibility === "ppv" ? <Lock className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
            </div>
            <p className="font-serif text-lg text-foreground">
              {visibility === "ppv" ? "Private Artifact" : "Members Only"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              {visibility === "ppv" ? "Pay to unveil" : "Subscribe to access"}
            </p>
            <button
              onClick={visibility === "ppv" ? handleUnlock : handleSubscribe}
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 font-medium text-primary-foreground shadow-gold transition hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {visibility === "ppv"
                ? `Unlock for ${price} TKN`
                : `Subscribe · ${creatorPrice} TKN/mo`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
